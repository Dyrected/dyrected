# Admin Component Registry: Decision Guide

Companion to [custom-components-registry-spec.md](./custom-components-registry-spec.md).
Plain-language walkthrough of the open questions, with a recommendation for each.
All recommendations were accepted on 2026-10-15. Checked boxes record the decision.

---

## Part 1: The terms, in plain English

| Term | What it means here |
|---|---|
| **Registry** | A lookup table of custom components. Your config says `component: "scanForm"`; the registry says which real component that name points to. |
| **Key** | The string name used in that lookup (`"check_ins.scanForm"`). |
| **Slot** | A place in the built-in admin where a custom component can be injected (before the list, after the dashboard). Slots add to the page; they don't replace it. |
| **Bridge** | The glue that lets a Vue component render inside the React admin (and the reverse). The admin is React; Nuxt apps write Vue. |
| **Island** | One Vue component mounted inside a React page by the bridge. It lives in its own little Vue world. |
| **Context / ambient context** | Information a component can read without being handed it as a prop: the current form, the logged-in user, the current page. React calls this "context"; Vue calls it `provide`/`inject`. |
| **Controller** | An object that owns some state (for example the form's values) and lets components read it and subscribe to changes. |
| **Composable / hook** | A reusable function a component calls to get something (`useDyrectedForm()`). Vue says "composable", React says "hook". Same idea. |
| **Root** | A separate React mount point. Context does not cross from one root to another. |
| **Error boundary** | A wrapper that catches a crash inside one component so the rest of the admin keeps working. |
| **Diagnostic** | A structured warning the admin records ("component X is not registered") instead of only logging to the console. |
| **Typed keys** | The CLI generating a list of valid key names so a typo is a compile error, not a silent failure. |

### The problem in one paragraph

Today, custom UI works but every host app hand-builds a map of ~30 keys (a typo fails silently), Vue components can't reach the form state without extra manual wiring, and a crash in a custom component can leave a blank spot with no explanation. The spec fixes that with one shared registry shape, automatic context for Vue components, typed keys, and visible failures.

### What is already built

Roughly a third. See §12 of the spec for the full table. Short version: the four existing registries, the Vue-in-React bridge, form hooks, and theme hooks exist. Missing: the context wrapper, the navigation/notify/access hooks, typed keys, error cards, and the new registries (`forms`, `viewLayouts`, `pages`).

---

## Part 2: Decisions, in the order I'd make them

### D1. How long does a controller live, and what happens when it changes?

**What it means.** A Vue island gets its context once, when it mounts. If the admin navigates from document A to document B and hands the island a *new* form controller, the island still holds the old one and shows stale data.

**Options**
1. **Controllers are created once per screen and never swapped.** Navigating to another document remounts the island.
2. **Controllers can change, and the bridge re-provides them.** More flexible, more complicated, easy to get subtly wrong.

**Recommendation: option 1.** Remount on navigation. It is simple, it is correct by construction, and the cost (a remount) is invisible to users. Enforce it with a test: "same controller identity for the lifetime of a mounted surface".

- [x] accepted (2026-10-15)

---

### D2. How do slots get their own context? (spec Q3)

**What it means.** A slot inside an operational view should know which view it is in. A slot on the dashboard should not pretend to. Where does that information come from?

**Options**
1. **One global context for everything.** Simple, but a dashboard slot sees view-shaped keys it can't use.
2. **Per-mount `contexts`.** Each place that mounts a custom component passes exactly the contexts that apply there.

**Recommendation: option 2.** The mount site already knows what it has. It is a small argument to the bridge, and a missing context becomes a clear error ("`useCollectionView` needs a view") instead of silent `undefined`.

- [x] accepted (2026-10-15)

---

### D3. Do we keep passing big prop bags to existing slots?

**What it means.** Existing slot components receive a lot of props (`client`, `user`, `documents`, `permissions`, `urls`…). The spec says *new* registries pass only identity (which collection, which page) and expose everything else through hooks. What about the old ones?

**Options**
1. **Leave existing registries exactly as they are.** No breakage.
2. **Also expose the old props through hooks and deprecate the bags later.**

**Recommendation: option 1 now, option 2 as a later, separate piece of work.** Changing existing slots breaks real apps (thesweetunion has ~30 keys). The new rule applies to new registries only, as the spec already says.

- [x] accepted (2026-10-15)

---

### D4. Nested roots: React → Vue → React

**What it means.** A custom Vue form needs to show a built-in React input. That is a React root inside a Vue island inside a React root. Context does not cross roots, so the inner React piece can't see the form unless it is handed it.

**Options**
1. **Pass controllers explicitly to the inner component** (the reverse bridge takes a `controllers` argument).
2. **Avoid it by exposing Vue-native versions of the inputs.** Much more work and permanent duplication.

**Recommendation: option 1.** It is what the spec proposes and what the existing `DyrectedRichText` bridge half-does already. Document that inner components must get controllers from props, not from context.

- [x] accepted (2026-10-15)

---

### D5. The bridge re-renders on every React render

**What it means.** The bridge re-renders the Vue island whenever its props object changes, and React creates a new props object on every render. That works today, but once we add a wrapper that provides context, doing it too often could reset state or cost performance.

**Options**
1. **Do nothing.** Vue's `render()` patches in place, so state is kept.
2. **Compare props shallowly and skip identical updates.**

**Recommendation: option 2, small and targeted.** Add the comparison when we add the provider wrapper. Cheap insurance, and it avoids a class of "why did my component flicker" bugs.

- [x] accepted (2026-10-15)

---

### D6. Should the new hooks ship before anything uses them?

**What it means.** `useAdminNavigate`, `useAdminNotify`, `useAccess` are Phase 1. The things that need them (custom forms, layouts, pages) are specs 2–4. Shipping early means a public API with no real consumer to validate it.

**Options**
1. **Ship Phase 1 hooks now.**
2. **Hold them until the first of specs 2–4 is built, then ship with a real use.**
3. **Ship them but mark them experimental.**

**Recommendation: option 3.** `useAdminNotify` and `useAdminNavigate` are low-risk and useful today to existing custom components. Mark all three experimental in docs so we can change them once pages and forms exist.

- [x] accepted (2026-10-15)

---

### D7. How does `useAccess` know what the server would allow?

**What it means.** The hook answers "can this user edit this record?" in the browser. But access rules on the server are arbitrary JavaScript functions. The browser can't run them.

**Options**
1. **Best effort:** the server sends a precomputed yes/no map for the current user.
2. **Ask the server per check.** Always right, slow and chatty.
3. **Only support simple, declarative rules on the client.**

**Recommendation: option 1, clearly labelled "UI hint only".** This matches the spec's own rule that the server is always the real gate. Do not promise client evaluation of custom access functions.

- [x] accepted (2026-10-15)

---

### D8. Where do typed keys come from?

**What it means.** The CLI generates the list of valid keys by reading your config. If config is built dynamically (plugins, loops), the CLI may not see every key.

**Options**
1. **Generate from config, and fall back to plain `string` for anything it can't see.**
2. **Require static config only.** Stricter, breaks dynamic setups.

**Recommendation: option 1.** The spec already says typing must be opt-in and never break untyped usage. Generated keys narrow the type; unknown keys stay allowed.

- [x] accepted (2026-10-15)

---

### D9. When is a mismatch an error?

**What it means.** A key is registered but never used (`noUnusedKeys`), or used but not registered. Should that fail the build, warn in the console, or just be reported?

**Options**
1. **Compile error for used-but-missing; dev-only console warning for registered-but-unused.**
2. **Everything is a compile error.**
3. **Everything is a warning.**

**Recommendation: option 1.** Missing keys are bugs. Unused keys are often just work in progress. Make unused-key checking configurable, as the spec says.

- [x] accepted (2026-10-15)

---

### D10. Does `Register` carry both schema and component keys?

**What it means.** The SDK has one generated interface, `Register`, that today holds the schema. Adding `componentKeys` puts two jobs on one interface.

**Options**
1. **Add `componentKeys` to the same interface.**
2. **Use a second interface for components.**

**Recommendation: option 1.** One generated file and one augmentation is simpler for users. The SDK's `Register` is already designed to be extended this way.

- [x] accepted (2026-10-15)

---

### D11. What does production show when a component is missing?

**What it means.** In development the placeholder names the missing key. In production the spec says to show something generic, so key names and stack traces don't leak.

**Options**
1. **Generic message in production, full detail in dev and in logs/diagnostics.**
2. **Same detail in both.**

**Recommendation: option 1.** But make sure the diagnostic is still recorded with the key, so you can find it without a debugger. "Generic on screen, specific in logs" is the usual compromise.

- [x] accepted (2026-10-15)

---

### D12. What does "retry" do on the error card?

**What it means.** After a crash, the card offers a retry button. Retry could remount only that component, or reload the whole page.

**Options**
1. **Remount just that component.**
2. **Reload the page.**

**Recommendation: option 1.** It keeps the surrounding admin state. If the same error recurs, the card stays visible instead of looping.

- [x] accepted (2026-10-15)

---

### D13. Which loading skeleton do async components use?

**What it means.** The spec says async components get "the admin's skeleton fallback", but I did not find one shared component by that name.

**Recommendation.** Pick or create one small skeleton component and use it everywhere. Check what the admin already uses for loading states (`admin-loading.tsx` exists) and reuse it. Low risk, small decision.

- [x] accepted (2026-10-15)

---

### D14. Should `displayCustomComponent` join the registry? (spec Q1)

**What it means.** `displayCustomComponent` lives in core's `detail.ts`. It looks up components by name, but it is not clear whether it reads the same registry the admin uses.

**Recommendation: investigate before deciding.** Trace where the admin resolves that name. If it already reads one of the four registries, document it and stop. If it has its own lookup, fold it in. Do not guess.

- [x] accepted (2026-10-15)

---

### D15. Do `fields` keep `collection.field` keys? (spec Q2)

**Recommendation: keep as-is.** Changing it would break existing configs for no immediate benefit. Revisit only if generated typed keys make the current scheme awkward.

- [x] accepted (2026-10-15)

---

### D16. Nuxt auto-registration (Phase 3)

**What it means.** A convention where dropping a file into `components/dyrected/forms/` registers it automatically, so you don't hand-edit the map.

**Recommendation: do it last, and keep it optional.** It is a convenience on top of the explicit `components` prop. Ship it only after the registry and typed keys have settled.

- [x] accepted (2026-10-15)

---

### D17. How do developers register components? (decided)

**What it means.** The way a developer connects a component they wrote to a key in the config. This is the biggest day-to-day developer-experience choice in the whole spec.

**Options considered**
- **A. One typed map in one file** (`defineAdminComponents({ forms: { "check_ins.scanForm": ScanForm } })`), with keys generated from config so typos fail to compile.
- **B. Filename is the key** (Nuxt auto-registration).
- **C. Metadata inside the component file**, read by a build-time scan.
- **D. Path strings in config, resolved at build time** (the Payload CMS approach).
- A wrapper file per component (`defineAdminComponent` per file) was rejected as ceremony.

**Decision: ship A now.** It needs no new files and no build tooling, works the same in Vue and React, and fixes the real problem (hand-typed keys that fail silently). B stays the optional Phase 3 sugar from D16.

**Planned later, not now:** D (path-based references, Payload style) is the preferred long-term direction, with C as a possible alternative. Both need build tooling that turns a reference into an import, so they are deferred until A has settled. Design A so it can be replaced or extended without changing the component code itself: components stay plain components, and only the registration line would change.

- [x] accept (A now; D later, C possible)

---

## Part 3: Suggested order of work once decisions are made

1. D1, D2, D5: the provider wrapper (the foundation everything else needs).
2. D6, D7: the three hooks, marked experimental.
3. D11, D12, D13: error card, placeholder, skeleton.
4. D8, D9, D10: typed keys and diagnostics.
5. D14, D15, D16: the clean-up and optional items.
6. D17 is decided: ship the typed map (A). Revisit path-based references (D) afterwards.

## What I'd want answered by a human, not by me

- **D7** (`useAccess`): it is the only item that can silently show the wrong thing to a user. Worth your direct decision.
- **D6** (ship now or wait): depends on how soon specs 2–4 are planned, which I can't see from the code.
- **D3** (existing prop bags): depends on how many real apps depend on them, which only you know.
