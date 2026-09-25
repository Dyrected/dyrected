# Plugin Contract Specification

**Document Version:** 0.1.0 (Draft)
**Status:** Proposed
**Scope:** `@dyrected/core` (`definePlugin`, config pipeline), `@dyrected/admin` (registry merge), `@dyrected/cli` (typegen, doctor), `@dyrected/react`, `@dyrected/vue`
**Depends on:** [Component Registry & Bridge](./custom-components-registry-spec.md) (required), [Custom Forms](./custom-document-forms-spec.md), [Custom Pages](./custom-admin-pages-spec.md), [Custom View Layouts](./custom-view-layouts-spec.md) (plugins contribute to all of them)
**Extends:** [plugin-ecosystem-and-payment-gateways-spec.md](./plugin-ecosystem-and-payment-gateways-spec.md), which defines *which* plugins exist (payments, forms, notifications, SEO). This spec defines *what a plugin is*.
**Cloud installation:** covered separately in the `dyrected-pro` repo (`specs/cloud-plugin-installation-spec.md`).

> Not to be confused with `plugin-form-builder-architecture.md`, an earlier speculative draft (`plugins/` glob, iframe-sandboxed UI, npm marketplace). This spec replaces its plugin-system section.

---

## 1. What Exists Today

Nothing. There is no `definePlugin` and no `plugins` key in `DyrectedConfig`. The ecosystem spec describes the intended shape (`plugins: [paystackPlugin({...})]`) but no contract behind it. Everything a plugin would need already exists as separate pieces: `defineCollection`, hooks, `defineAction`, `defineTask`, `defineView`, `defineWorkspace`, and (with the custom-surfaces specs) form, view-layout and page registries.

A plugin is the unit that packages those pieces so an app adopts a capability in one line.

## 2. Goals & Non-Goals

**Goals**
1. A plugin is one npm package with a small, typed contract: a **config transform** plus optional **admin components**.
2. Installing one is `npm i` plus one line in config. No manual `components={…}` wiring.
3. Plugin behavior is **the same in self-hosted and Cloud**. The contract is designed around what the Cloud bundler and isolate runtime can run.
4. Plugins compose: no collisions by construction, and a predictable way for the app to override.
5. The same plugin works in React and Vue apps.

**Non-goals**
- Sandboxing plugins in self-hosted (trusted, like any dependency). Cloud has its own model (see the Cloud spec).
- A marketplace or discovery UI.
- Replacing the app's own config. A plugin *adds to* it.

## 3. The Contract

```ts
import { definePlugin } from "@dyrected/core";

export const paystackPlugin = definePlugin<PaystackOptions>((options) => ({
  name: "paystack",                       // namespace. kebab-case, unique
  pluginApi: 1,                           // contract version
  requires: { core: "^2.19.0" },          // semver range
  dependsOn: [],                          // other plugin names that must precede

  optionsSchema: paystackOptionsFields,   // Field[]: declarative, used for validation and Cloud forms

  config(cfg, ctx) {                      // pure config transform
    return ctx.compose(cfg,
      ctx.addCollection(payments),
      ctx.addTask(reconcilePayments),
      ctx.addPage(paymentsPage),
    );
  },

  admin: () => import("./admin"),         // optional: default export is AdminComponents (namespaced keys)

  permissions: {                          // declarative. Informational self-hosted, enforced in Cloud
    egress: ["api.paystack.co"],
    collections: { write: ["paystack_payments"] },
    secrets: ["PAYSTACK_SECRET_KEY"],
  },
}));
```

Usage:

```ts
export default defineConfig({
  collections: [orders],
  plugins: [
    paystackPlugin({
      secretKey: process.env.PAYSTACK_SECRET_KEY!,
      overrides: { payments: (collection) => ({ ...collection, labels: { singular: "Payment", plural: "Payments" } }) },
    }),
  ],
});
```

### 3.1 `config(cfg, ctx)`: the transform

- **Pure and deterministic.** Same input config and options give the same output, with no I/O, network, clock or randomness. It runs at config load (self-hosted) and at deploy or install time (Cloud, where the result is cached). Purity is what makes it cacheable and safe to run in an isolate.
- Receives the config as built so far (earlier plugins already applied) and returns a new config. Do not mutate the input.
- **Use the `ctx` helpers, not raw spreads.** They enforce the rules in §4:

| Helper | Effect |
|---|---|
| `addCollection`, `addGlobal`, `addBlock` | Adds. Errors if the slug already exists. |
| `extendCollection(slug, patch)` | Deep-merges fields/hooks/access into an existing collection (for example add a field to `orders`). Marks provenance. |
| `addTask`, `addAction`, `addView`, `addPage`, `addNavigation` | Adds with namespace checks. |
| `addHook(collection, name, fn)` | Appends after existing hooks, order documented (§5). |
| `compose(cfg, ...ops)` | Applies ops in order and returns the final config. |
| `resolveSecret(value)` | See §6. |

### 3.2 `admin`: components

`admin` is a lazy loader returning an `AdminComponents` object, the same shape as in the registry spec:

```ts
// admin.ts (React)
export default {
  fields:  { "paystack.amountField": AmountField },
  pages:   { "paystack.payments": PaymentsPage },
  forms:   { "paystack.refundForm": RefundForm },
} satisfies AdminComponents;
```

The plugin's `config` references those keys (for example `admin.component: "paystack.amountField"`, `addPage({ component: "paystack.payments" })`).

- **React only.** The Admin is React. A Vue app that installs the plugin gets the plugin's UI with no bridge work, because only *the app's own* Vue components go through the Vue-in-React bridge. Plugin authors write React once.
- **Lazy.** The loader is dynamic-imported, so plugin UI code is not in the initial admin bundle.
- **Typed keys.** The CLI's type generation runs on the *transformed* config, so plugin keys appear in the generated key union automatically.

### 3.3 Package layout

```jsonc
// package.json
{
  "name": "@dyrected/plugin-paystack",
  "exports": {
    ".":       "./dist/index.js",    // definePlugin(...): server-safe, no React/DOM imports
    "./admin": "./dist/admin.js"     // AdminComponents: no Node built-ins
  },
  "keywords": ["dyrected-plugin"],
  "dyrected": { "plugin": true, "pluginApi": 1, "core": "^2.19.0", "cloud": "compatible" }
}
```

Two entry points, and the split is a hard rule: the config entry must not import React or DOM APIs, and the admin entry must not import Node built-ins. The bundler and the Cloud compatibility check both rely on it. No separate `./server` entry is needed. Functions inside the transformed config (hooks, actions, tasks, endpoints) are extracted by the same deploy bundler that extracts the app's own functions (Cloud parity spec §3.1).

## 4. Composition Rules

### 4.1 Namespacing (enforced, not conventional)

| Thing | Rule | Example |
|---|---|---|
| Component keys | must start `<plugin>.` | `paystack.payments` |
| Task names | must start `<plugin>:` | `paystack:reconcile` |
| Plugin-owned collection slugs | must start `<plugin>_` (unless the app overrides via options) | `paystack_payments` |
| Page slugs, action names | must start `<plugin>-` / `<plugin>.` | `paystack-payments` |

Violations are config diagnostics at load. This makes plugin-vs-plugin collisions impossible, and plugin-vs-app collisions detectable.

### 4.2 Precedence for admin components

Registry merge order, later wins: **plugins (in `plugins` array order) → the app's own `components`**. A plugin cannot override another plugin's keys (namespaces). The app can override any plugin key by registering the same string. The app wins, with a dev-time notice ("`paystack.payments` overridden by app").

### 4.3 App overrides of plugin config

Two supported ways, in order of preference:
1. **`overrides` option per collection** (the convention in the example above). Plugins SHOULD accept `overrides: { [collectionSlug]: (c) => c }` for every collection they add.
2. Patch after the fact with a small post-transform in the app config. Because `plugins` run first, later app-level changes are applied on top.

`extendCollection` provenance is recorded, so diagnostics can say "field `taxId` on `orders` was added by plugin `paystack`".

### 4.4 Ordering and dependencies

- Plugins apply in array order. `dependsOn` is validated: if `A` depends on `B`, `B` must appear earlier or config load fails with a clear message.
- `requires.core` and `pluginApi` are checked at load. Mismatch is an error, not a warning.

## 5. Hooks Contributed by Plugins

`addHook` appends: **app-defined hooks run first, then plugin hooks in plugin order** for `before*` (so the app can veto or normalize before plugins see data), and the reverse for `after*`. This is documented and covered by the conformance suite. Plugins must not rely on running before an app hook.

Hook functions may only use the standard hook context (`data`, `doc`, `user`, `db`, `req`, `context`) plus the plugin-scoped `ctx.resolveSecret` and platform services. Anything else breaks Cloud parity.

## 6. Options and Secrets

- `optionsSchema` is a `Field[]` (existing field types) describing the options. Uses: validating options at load, powering the schema-driven install form in Cloud, generating docs.
- **Secrets are read at invocation time, never at config time.** In self-hosted, `options.secretKey` is a plain string from `process.env`. In Cloud's managed install, the option value is a `SecretRef` (a name, not a value). Plugin code therefore never touches the raw option directly:

  ```ts
  handler: async ({ input }) => {
    const key = await ctx.resolveSecret(options.secretKey);   // string in self-hosted, looked up in Cloud
    …
  }
  ```

  `resolveSecret` returns a string unchanged. It is what lets the same plugin run in both places without the secret being baked into the transformed config or the bundle.
- A field in `optionsSchema` can be marked `secret: true` so UIs mask it and Cloud routes it to the secrets store.

## 7. Permissions Manifest

Declared per plugin:

```ts
permissions: {
  egress?: string[];                                        // hosts the plugin's functions may fetch
  collections?: { read?: string[]; write?: string[] };     // collections its functions touch
  secrets?: string[];                                       // secret names it reads
  endpoints?: string[];                                     // public routes it exposes (requires server API)
  adminNetwork?: string[];                                  // hosts its UI may connect to (CSP)
}
```

- **Self-hosted:** informational, plus lint warnings when the plugin's code appears to exceed it (for example a `fetch` to an undeclared host found statically). Not enforced. A self-hosted plugin is trusted like any npm dependency.
- **Cloud:** enforced by the runtime bridge. The deploy bundler tags every extracted function with its **origin** (`app` or a plugin name), and the isolate bridge applies that origin's permissions to `fetch`, `db` and secrets. See the Cloud spec.
- The manifest is shown to whoever enables the plugin. A permission *increase* between versions is surfaced as a diff.

## 8. Lifecycle

| Event | Behavior |
|---|---|
| **Enable** (add to `plugins`) | Config transform runs. New collections sync on next start/deploy. |
| **Disable / remove** | Transform stops applying. The plugin's collections vanish from config, but **adapter sync does not drop tables**, so data is **retained but orphaned**. `dyrected doctor` reports "orphaned plugin data: `paystack_payments` (1,204 rows)". Re-adding restores access. Deleting the data is an explicit, confirmed action, never a side effect. |
| **Upgrade** | Semver. `pluginApi` bump or `requires.core` mismatch fails loudly. Plugin authors document schema changes. Field additions are non-breaking, removals are major. |
| **Options change** | Re-run the transform (cached by input hash in Cloud). |

Schema migrations for plugin collections follow the framework's existing schema-evolution rules (`database-migrations-and-schema-evolution-spec.md`). A plugin does not ship its own migration engine in v1.

## 9. DX

- `npx dyrected plugin add @dyrected/plugin-paystack`: installs the package, inserts the plugin call into `dyrected.config.ts` with a typed options stub, and re-runs type generation.
- **Typegen** covers plugin-contributed collections and component keys. `defineAdminComponents` from the registry spec type-checks the app's own overrides against the merged key union.
- **`testPlugin(plugin, options)`** test helper returns the transformed config and runs the contract diagnostics (namespaces, purity check by running twice and comparing, entry-point import rules). Plugin authors use it in their unit tests.
- **`create-dyrected-plugin`** scaffold (later). Generates the two-entry package, a `testPlugin` test and a `cloud: compatible` CI check.
- **Docs:** each plugin page lists its collections, component keys, hooks, permissions and a "Works in Cloud" badge produced by the compat check.

## 10. Cloud Compatibility (design constraint, detailed elsewhere)

To keep "works in Cloud" true for plugins, the contract already requires: a pure `config` transform, two entry points with no Node/DOM crossover, secrets resolved at invocation time, and a declared permission manifest. A plugin that meets the contract and passes the deploy-time compatibility check works on Cloud with no extra work, whether the app installed it through its repo or through the dashboard.

## 11. Implementation Plan

**Phase 1: contract**
- `definePlugin`, `plugins` on `DyrectedConfig`, the transform pipeline and `ctx` helpers, namespace and dependency diagnostics, `optionsSchema` validation, `resolveSecret`.
- Provenance recording. `testPlugin`.

**Phase 2: admin integration**
- `admin` loader and registry merge with precedence. Typegen over the transformed config. `dyrected plugin add`.
- Permissions manifest types and static lint.

**Phase 3: proof**
- Build one real plugin end to end on the contract. Recommended: **`@dyrected/plugin-notifications`**, because it needs collections, a task, a custom form, a page and outbound HTTP, and no payment-provider dependency. Then Paystack/Stripe.
- Dogfood: port two of the `thesweetunion` admin components (`CheckInScanner`, `SendWhatsAppButton`) into a plugin to verify the registry merge, in the same way they were the canary for the custom-surfaces specs.

**Phase 4**
- `create-dyrected-plugin`, docs generation, orphaned-data doctor check.

## 12. Testing

- Pure transform: run twice, identical output. Input config not mutated.
- Namespace violations, duplicate slugs, missing `dependsOn`, `core` range mismatch all produce named diagnostics.
- Registry merge precedence: plugin keys present, app override wins, notice emitted.
- Typegen includes plugin keys. `defineAdminComponents` rejects a wrong key.
- `resolveSecret` returns strings unchanged. A `SecretRef` resolves through a fake secrets provider.
- Entry-point rule: config entry importing React fails the check. Admin entry importing `node:fs` fails.
- Removal leaves data in place. Doctor reports it. Re-adding restores.
- Conformance suite (Cloud parity spec §6.2): each first-party plugin has cases proving identical behavior in-process and in the isolate runtime.

## 13. Open Questions

1. **Config order vs app overrides.** Plugins run before the app's own post-processing (proposed) versus Payload's "plugins receive the final config and win". Proposed is friendlier to app overrides. Confirm.
2. **Should plugins be able to register server endpoints in v1?** Webhooks (Paystack) need them, and they depend on `server-api-architecture.md`. Options: land the plugin contract first and gate `endpoints` behind that spec, or ship first-party webhook routing in core.
3. **Plugin-owned admin theming.** Do plugins get to add CSS or tokens? Proposed: no, only components. Styling goes through the Admin's tokens.
4. **Pure `config` vs. needing I/O at install** (for example a plugin that must call a provider once to create a resource). Proposed: install-time setup is an explicit `setup` action (a normal `defineAction`), not part of `config`.
5. **Vue-authored plugin UI.** Out of scope now. Revisit if a large share of plugin authors are Vue developers.
