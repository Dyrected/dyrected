# Public Controller Pattern

Dyrected's public admin APIs should follow one consistent structure:

1. A framework-agnostic controller owns state and mutations.
2. Framework adapters wrap that controller for React, Vue, or other hosts.
3. Built-in admin UI uses the same public controller layer instead of a separate internal implementation.

This keeps the product UI, embedded React usage, and future Vue/Nuxt usage on one source of truth.

## Why This Pattern Exists

We want host apps to build custom admin experiences without re-implementing Dyrected logic.

That means public APIs should not start from:

- a React hook
- a React context value shape
- a component with hidden internal state

Those are framework-specific surfaces.

The stable foundation should be a controller with:

- `getState()`
- `subscribe(listener)`
- explicit mutation methods
- pure helper functions where needed

Everything else is an adapter over that core.

## Standard Layering

### 1. Controller Layer

The controller layer is the cross-framework contract.

Requirements:

- No React imports
- No Vue imports
- No DOM-coupled rendering concerns
- State is readable via `getState()`
- State changes are observable via `subscribe()`
- Mutations are explicit methods, not implicit effects

Typical file location:

- `src/controllers/<domain>.ts`

Examples:

- `src/controllers/media.ts`
- `src/controllers/form.ts`
- `src/controllers/field.ts`
- `src/controllers/theme.ts`

### 2. Framework Adapter Layer

Adapters make the controller ergonomic in a framework.

For React, this usually means:

- a provider when shared context is needed
- a hook using `useSyncExternalStore`
- optional helper components

Typical file locations:

- `src/hooks/*`
- `src/providers/*`

Examples:

- `useMediaUpload`
- `useMediaLibrary`
- `useMediaURL`
- `DyrectedFormProvider`
- `useDyrectedForm`
- `useField`
- `AdminThemeProvider`
- `useAdminTheme`

For Vue, the future equivalent should be a small composable and `provide/inject` wrapper over the same controller, not a second implementation.

### 3. Built-in Admin UI

The admin package should dogfood the same public API.

That means built-in components should consume the public controller or the public framework adapter whenever practical.

Examples:

- media flows use the shared media controller-backed hooks
- `FormEngine` syncs `react-hook-form` state into the public form controller
- admin theming now routes through the public theme controller

## Design Rules

### Rule 1: Hooks Are Adapters, Not Foundations

Do not make the React hook the primary API if the feature should work outside React.

Bad:

- `useSomething()` is the only public entry point

Good:

- `createSomethingController()` is the foundation
- `useSomething()` is a React adapter over it

### Rule 2: Built-in UI Must Reuse the Public Path

If the admin UI uses a completely separate internal implementation, the public API will drift and break.

Public APIs should be proven by product usage.

### Rule 3: Export Pure Helpers Separately

If a feature has reusable derivation logic, export it independently from the controller and independently from the React adapter.

Examples:

- `resolveAdminTheme()`
- `adminThemeClassName()`
- `getSystemAdminTheme()`
- `buildDefaultValues()`
- `buildSchemaShape()`

### Rule 4: Prefer Explicit State Contracts

Controller state should be serializable and easy to inspect.

Good controller state:

- current values
- loading flags
- selection state
- derived status that consumers need

Avoid hiding important state behind component internals.

### Rule 5: Keep Side Effects at the Edge

Persistence, browser APIs, and framework integration should usually live in adapters or explicit controller options.

Examples:

- React preference persistence in `AdminThemeProvider`
- browser media query subscription in the theme adapter
- SDK upload callbacks passed into media controllers

This keeps the core easier to port across frameworks.

## Current Reference Implementations

### Media

Foundation:

- `createMediaUploadController`
- `createMediaLibraryController`
- `createMediaURLController`

React adapters:

- `useMediaUpload`
- `useMediaLibrary`
- `useMediaURL`

Built-in consumers:

- `MediaLibraryDialog`
- `MediaPicker`
- `MediaPage`

### Forms And Fields

Foundation:

- `createDyrectedFormController`
- `createDyrectedFieldController`

React adapters:

- `DyrectedFormProvider`
- `DyrectedFieldPathProvider`
- `useDyrectedForm`
- `useField`

Built-in consumers:

- `FormEngine`
- custom `admin.component` field rendering path

### Theme

Foundation:

- `createAdminThemeController`
- `resolveAdminTheme`
- `adminThemeClassName`
- `getSystemAdminTheme`

React adapters:

- `AdminThemeProvider`
- `useAdminTheme`
- `AdminThemedRoot`

Built-in consumers:

- admin shell
- themed portal components

## API Checklist For New Public Surfaces

Before exposing a new reusable admin API, check:

- Is there a pure controller?
- Can the controller work without React?
- Does the React hook only adapt the controller?
- Does built-in admin UI use the same controller path?
- Are reusable pure helpers exported separately?
- Is the controller state explicit and inspectable?
- Are tests present for controller behavior?
- Are adapter tests present for React integration?

If the answer to the first three questions is no, the API is probably not ready to be public.

## When Not To Use This Pattern

Not every utility needs a controller.

Use a simpler export when the feature is just:

- a pure function
- a stateless formatter
- a schema helper
- a presentational component with no reusable state model

Use the controller pattern when the feature owns state, subscriptions, selection, progress, persistence boundaries, or mutation workflows.

## Future Direction

This pattern is the default for cross-framework public admin APIs.

That means future reusable surfaces should generally follow:

1. controller
2. React adapter
3. Vue adapter if needed
4. built-in admin dogfooding

This avoids parallel implementations and keeps Dyrected Cloud, embedded React apps, and future Vue apps aligned.
