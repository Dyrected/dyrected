# Plugin and Form Builder Architecture for Dyrected

## Overview
This document outlines the architectural design required to add a **first‑class plugin system** and a **visual form builder** (similar to Payload CMS) to Dyrected. The goal is to enable developers – and AI agents – to extend Dyrected’s core functionality, add custom UI components, and declaratively create forms without modifying the core codebase.

---

## 1. Goals
- **Extensibility** – Developers can drop a plugin package into the project and have its routes, schemas, UI components, and server‑side logic automatically registered.
- **Isolation** – Plugins run in a sandboxed environment to prevent XSS/privilege‑escalation (mirroring the hidden‑iframe sandbox already used in `@dyrected/admin`).
- **Declarative Forms** – A visual form builder that stores form definitions as JSON/TS schemas, auto‑generates React components, and integrates with Dyrected’s validation, access‑control, and data‑binding layers.
- **AI‑first** – The architecture should be discoverable by AI agents through the MCP server and repository‑level rules (`.dyrected/ai-rules.md`).
- **Zero‑Config Development** – Plugins are discovered via a convention (`plugins/` directory) and automatically compiled with the monorepo’s build pipeline.

---

## 2. Core Plugin System
### 2.1 Directory Conventions
```
/plugins
  /my‑awesome‑plugin
    /src
      index.ts          # Exported plugin entry point
      schema.ts          # Optional collection schemas
      hooks.ts           # Lifecycle hooks (see §2.3)
      ui/
        FormBuilder.tsx # Optional React UI components
    package.json
    dyrected-plugin.json # Manifest (name, version, dependencies, permissions)
```
- The **monorepo root** will contain a `plugins/` folder. Each sub‑folder is a self‑contained npm package.
- A **manifest** (`dyrected-plugin.json`) describes the plugin’s capabilities and the permissions it requires (e.g., DB access, external API).

### 2.2 Registration API
Add a new file `packages/core/src/plugins/plugin-registry.ts` exposing:
```ts
export interface DyrectedPlugin {
  name: string;
  version: string;
  register(app: Hono, ctx: PluginContext): void;
}

export interface PluginContext {
  defineSchema(schema: CollectionSchema): void;
  addHook<T extends keyof LifecycleHooks>(name: T, fn: LifecycleHooks[T]): void;
  registerRoute(method: HttpMethod, path: string, handler: Handler): void;
  // UI registration – exposed to admin UI via MCP
  registerAdminComponent(component: ReactElement): void;
}

export function loadPlugins(app: Hono) {
  const pluginPaths = globSync('plugins/*/src/index.ts');
  for (const p of pluginPaths) {
    const plugin: DyrectedPlugin = require(p).default;
    plugin.register(app, createPluginContext());
  }
}
```
- `loadPlugins` will be invoked from `packages/core/src/app.ts` **before** the main router is built.
- The `PluginContext` abstracts internal services (schema manager, hook manager, route manager) so plugins remain decoupled from core internals.

### 2.3 Lifecycle Hooks Extension
Existing hooks (e.g., `onCreate`, `onUpdate`) are defined in `src/hooks/lifecycle.ts`. Extend the type definition to allow **plugin‑provided hooks** via a generic registration mechanism:
```ts
export type LifecycleHooks = {
  onCreate?: (payload: Record<string, any>) => Promise<void>;
  onUpdate?: (payload: Record<string, any>) => Promise<void>;
  // New hook namespace for plugins
  onPluginInit?: (ctx: PluginContext) => Promise<void>;
  // Plugins can also define custom hook names via a string‑key map
  [custom: string]: ((...args: any[]) => Promise<any>) | undefined;
};
```
- Plugins call `addHook('onCreate', fn)` or `addHook('myCustomHook', fn)`.
- The core hook dispatcher merges plugin hooks with native ones, preserving execution order (core → plugins).

---

## 3. Form Builder Subsystem
### 3.1 Declarative Form Schema
Create a new `FormDefinition` type under `packages/core/src/forms/types.ts`:
```ts
export interface FormField {
  name: string;
  label: string;
  component: 'input' | 'textarea' | 'select' | 'checkbox' | 'custom';
  type?: string; // HTML input type
  options?: Array<{ label: string; value: string }>;
  validation?: Record<string, any>;
  // Allow plugins to enrich the field definition
  meta?: Record<string, any>;
}

export interface FormDefinition {
  id: string;
  title: string;
  fields: FormField[];
  submitHandler?: string; // name of a plugin hook to invoke on submit
}
```
- Form definitions are stored in a **JSON collection** (`forms`) and can be edited via the admin UI.

### 3.2 Auto‑Generated React Components
Add a utility `generateFormComponent(def: FormDefinition): ReactElement` in `packages/admin/src/forms/renderer.tsx` that:
1. Maps each `FormField` to a pre‑built component from a component registry (core + plugin‑provided components).
2. Injects validation rules using `zod` (or `yup`).
3. Calls the optional `submitHandler` hook when the form is submitted.

### 3.3 UI Integration
- Extend the **admin UI** (`@dyrected/admin`) with a new route `#/forms/:id` that loads the renderer.
- Provide a **visual editor** (drag‑and‑drop) built with `react‑beautiful‑dnd` that manipulates the JSON schema and persists it to the `forms` collection.
- The editor UI should be a **plugin component** itself, allowing third‑party UI packs to replace the default builder.

---

## 4. Isolation & Security
- **Sandboxing**: All plugin UI runs inside the existing hidden‑iframe sandbox used for custom on‑change hooks. The iframe communicates with the host via `postMessage` and a strict whitelist of messages.
- **Permission Model**: The manifest declares required permissions (e.g., `db:read`, `external:fetch`). At runtime, the core validates the manifest against `.dyrected/ai-rules.md` before loading the plugin.
- **MCP Exposure**: Expose a new MCP resource `@dyrected/mcp/plugins` that lists installed plugins and their capabilities. AI agents can query this to discover available extensions.

---

## 5. Development Workflow
1. **Scaffold** – `npx -y create-dyrected-plugin my-plugin` (future CLI command). Generates the folder structure and a starter `dyrected-plugin.json`.
2. **Build** – Plugins are built with the monorepo’s Vite/TS configuration (`packages/plugins/*`). They output a **ESM bundle** that the core loads via dynamic `import()`.
3. **Testing** – Add unit tests in `plugins/my-plugin/__tests__` using Vitest. The core provides a `mockPluginContext()` helper for isolated testing.
4. **Publishing** – Plugins can be published to npm under the scope `@dyrected/plugin‑*`. The admin UI includes a marketplace view that pulls package metadata from the npm registry.

---

## 6. Example Plugin Skeleton
```ts
// plugins/example-plugin/src/index.ts
import type { DyrectedPlugin, PluginContext } from '@dyrected/core/plugins';

const plugin: DyrectedPlugin = {
  name: 'example-plugin',
  version: '0.1.0',
  register(app: Hono, ctx: PluginContext) {
    // 1️⃣ Register a new collection schema
    ctx.defineSchema({
      name: 'example',
      fields: [{ name: 'title', type: 'string' }],
    });

    // 2️⃣ Add a custom lifecycle hook
    ctx.addHook('onCreate', async (payload) => {
      console.log('Example plugin onCreate', payload);
    });

    // 3️⃣ Register an admin UI component (React)
    ctx.registerAdminComponent({
      path: '/example',
      component: () => import('./ui/ExamplePanel').then(m => m.default),
    });
  },
};

export default plugin;
```
- The admin UI component is lazy‑loaded inside the sandboxed iframe.

---

## 7. Testing Strategy
- **Unit Tests** – Validate that `register` correctly calls `defineSchema`, `addHook`, and `registerRoute`.
- **Integration Tests** – Spin up an in‑memory server, load the plugin via `loadPlugins`, and assert that routes and hooks are functional.
- **E2E UI Tests** – Use Playwright to interact with the form builder UI, create a form, submit it, and verify the `submitHandler` hook runs.
- **Security Tests** – Ensure that a plugin requesting a forbidden permission is rejected at load time.

---

## 8. Publishing & Distribution
- Publish plugins to the public npm registry with the prefix `@dyrected/plugin-`.
- Provide a **Dyrected Marketplace** UI that reads package metadata (`dyrected-plugin.json`) via the npm view API and allows one‑click installation (`npm i @dyrected/plugin‑foo`).
- Offer a **CLI helper** (`dyrected plugin add <package>`) that installs the package, adds it to `plugins/`, and runs `npm install`.

---

## 9. Migration Path for Existing Projects
1. **Identify custom logic** – Move any ad‑hoc hooks from the core repo into a new plugin.
2. **Export form definitions** – Convert existing hard‑coded forms to JSON stored in the `forms` collection.
3. **Enable sandbox** – Ensure the admin UI loads custom components through the iframe sandbox.
4. **Update docs** – Add the new plugin guide to `specs/plugin‑system‑overview.md` (future).

---

## 10. References & Related Specs
- `specs/ai-first-architecture-spec.md` – describes repository‑level rules and MCP exposure.
- `specs/client-side-reactivity-spec.md` – current sandbox implementation.
- `specs/lifecycle-hooks-testing-spec.md` – testing approach for newly added hooks.

---

**Next Steps**
- Review this architecture with the team.
- Decide on a versioning strategy for the plugin manifest.
- Prioritize implementation of the `PluginRegistry` and loading pipeline.
- Draft the CLI scaffolding command (`create-dyrected-plugin`).

---

*This document is stored in the repository under `specs/plugin-form-builder-architecture.md` for version control and future reference.*
