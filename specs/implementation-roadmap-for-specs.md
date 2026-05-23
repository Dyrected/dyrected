# Implementation Roadmap for All Spec Files

This document consolidates a high‑level implementation roadmap that aligns with every specification (`specs/*.md`) currently present in the Dyrected repository. It maps each spec to the corresponding development milestones, ordered by **priority for the MVP**.

---

## Spec Files Overview (Priority Order)
| Priority | Spec File | Primary Focus | Key Implementation Areas |
|----------|-----------|---------------|--------------------------|
| 1️⃣ | `plugin-form-builder-architecture.md` | Plugin system & visual form builder | Plugin registry, UI component registration, form schema extensions |
| 2️⃣ | `proposed-advanced-hooks-spec.md` | Advanced lifecycle hooks | Register custom hooks via plugin context |
| 3️⃣ | `client-side-reactivity-spec.md` | Sandbox & iframe communication | Ensure translation bundles load inside hidden‑iframe sandbox (already required) |
| 4️⃣ | `db-adapters-testing-plan.md` | Database adapter testing strategy | Extend test suite to cover i18n‑related DB interactions |
| 5️⃣ | `lifecycle-hooks-testing-spec.md` | Hook testing methodology | Add tests for new `onLocaleChange` hook and plugin‑provided hooks |
| 6️⃣ | `ai-first-architecture-spec.md` | AI‑agent discoverability via MCP | MCP `translations` resource, plugin manifest exposure |
| 7️⃣ | `plugin-registry` (implicit in `plugin-form-builder-architecture.md`) | Plugin loading & manifest | Implement `plugin-registry.ts`, manifest `locales` array, load plugins before routes |
| 8️⃣ | `language-translation-architecture.md` *(Future)* | Multilingual UI & content translation | I18n provider, locale bundles, translation hooks |
| 9️⃣ | `translation-migration-guide.md` *(Future)* | Migration from static strings to i18n | Extraction script, component refactor, plugin updates |
| 🔟 | `protected-translation-keys.md` *(Future)* | Security for core translation keys | Validation in plugin loader, MCP exposure |

---

## Prioritized Milestones
### 1. Core Plugin System & Advanced Hooks (Weeks 1‑2)
- Implement **plugin‑registry.ts** with `loadPlugins` and `PluginContext`.
- Add **advanced hook registration** (`onPluginInit`, custom hooks) as defined in `proposed-advanced-hooks-spec.md`.
- Extend `dyrected-plugin.json` schema to include optional `locales` array.
- Ensure plugins are loaded **before** route initialization in `app.ts`.

### 2. Sandbox Reinforcement (Week 3)
- Verify that all plugin UI components run inside the existing hidden‑iframe sandbox.
- Add tests ensuring sandbox communication does not break when plugins register UI.

### 3. Testing Foundations (Weeks 4‑5)
- **DB adapters**: Extend existing tests (`db-adapters-testing-plan.md`) to cover any i18n‑related DB interactions.
- **Lifecycle hooks**: Add test cases for `onLocaleChange` and plugin‑provided hooks (`lifecycle-hooks-testing-spec.md`).

### 4. AI‑First MCP Exposure (Week 6)
- Add MCP endpoints under `@dyrected/mcp/translations`:
  - `GET /locales`
  - `GET /bundles/:locale`
  - `GET /keys/:locale`
- Update `ai-first-architecture-spec.md` with the new resource description.

### 5. UI Integration (Weeks 7‑8)
- Refactor admin UI components to use `t('key')` via a new **i18n hook** (`useI18n`).
- Add a language selector that triggers the `onLocaleChange` hook.
- Ensure the selector works inside the sandboxed iframe.

### 6. Form Builder Enhancements (Week 9) – **MVP**
- Extend `FormField` to support `labelKey` (translation key).
- Update the form renderer to resolve keys with `useI18n`.
- Provide UI for selecting translation keys in the drag‑and‑drop form builder.

### 7. Future: Full Translation Stack (Weeks 10‑12) – **Future**
- **Foundations**: Build `I18nProvider` and default `en.json` (deferred until after MVP). 
- **Hook & Permissions**: Add `onLocaleChange` hook and protected‑key validation.
- **Documentation**: Complete `translation-migration-guide.md` and `protected-translation-keys.md`.
- **Testing**: Add unit/integration/E2E tests for language switching.

---

## Open Questions (for team review)
- **Bundle versioning** – Should translation bundles be versioned per release?
- **Protected keys** – Confirm the complete list of core keys that must remain immutable.
- **Locale fallback strategy** – Decide whether to fallback to `en` or the nearest parent locale (e.g., `en‑GB` → `en`).

---

## Verification Plan
- Run the full test suite after each milestone.
- Deploy a demo project, install a sample plugin, switch locales, and verify UI updates.
- Use the MCP `translations` endpoints to fetch bundles and confirm they contain both core and plugin keys.

---

*This roadmap lives in `specs/implementation-roadmap-for-specs.md` and is ordered by MVP priority.*
