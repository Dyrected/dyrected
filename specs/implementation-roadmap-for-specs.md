# Implementation Roadmap for All Spec Files

This document consolidates a high‑level implementation roadmap that aligns with every specification (`specs/*.md`) currently present in the Dyrected repository. It maps each spec to the corresponding development milestones, ensuring all documentation stays synchronized with the codebase.

---

## Spec Files Overview
| Spec File | Primary Focus | Key Implementation Areas |
|-----------|---------------|--------------------------|
| `plugin-form-builder-architecture.md` | Plugin system & visual form builder | Plugin registry, UI component registration, form schema extensions |
| `language-translation-architecture.md` | Multilingual UI & content translation | I18n provider, locale bundles, translation hooks |
| `ai-first-architecture-spec.md` | AI‑agent discoverability via MCP | MCP `translations` resource, plugin manifest exposure |
| `client-side-reactivity-spec.md` | Sandbox & iframe communication | Ensure translation bundles load inside hidden‑iframe sandbox |
| `db-adapters-testing-plan.md` | Database adapter testing strategy | Extend test suite to cover i18n‑related DB interactions |
| `lifecycle-hooks-testing-spec.md` | Hook testing methodology | Add tests for new `onLocaleChange` hook and plugin‑provided hooks |
| `proposed-advanced-hooks-spec.md` | Advanced lifecycle hooks | Register custom hooks via plugin context |
| `translation-migration-guide.md` *(to be created)* | Migration from static strings to i18n | Extraction script, component refactor, plugin updates |
| `protected-translation-keys.md` *(to be created)* | Security for core translation keys | Validation in plugin loader, MCP exposure |

---

## Consolidated Milestones
### 1. Foundations (Weeks 1‑2)
- **I18nProvider** (`packages/core/src/i18n/`) and **client hook** `useI18n`.
- Add default `en.json` and scaffold other locale files.
- Update `tsconfig.json` to allow JSON imports.
- Create migration script `scripts/extract-strings.ts` referenced in the migration guide.

### 2. Plugin Registry & Manifest (Weeks 3‑4)
- Implement `plugin-registry.ts` (loadPlugins, PluginContext).
- Extend `dyrected-plugin.json` with optional `locales` array.
- Merge plugin locale bundles into the I18n provider.
- Call `loadPlugins` from `app.ts` before route initialization.

### 3. Translation Hook & Permissions (Week 5)
- Add `onLocaleChange` to `LifecycleHooks`.
- Enforce manifest locale validation.
- Define protected keys list (`protected-translation-keys.md`).

### 4. MCP Exposure (Week 6)
- Add `@dyrected/mcp/translations` endpoints (list locales, bundles, keys).
- Update `ai-first-architecture-spec.md` with new resource description.

### 5. UI Integration & Sandbox (Weeks 7‑8)
- Refactor admin UI components to use `t('key')` via `useI18n`.
- Add language selector component that triggers `onLocaleChange`.
- Ensure hidden‑iframe sandbox loads merged translation bundles.

### 6. Form Builder Enhancements (Week 9)
- Extend `FormField` to include `labelKey`.
- Update form renderer to resolve keys with `useI18n`.
- Provide UI for choosing translation keys in the drag‑and‑drop form builder.

### 7. Testing Expansion (Week 10)
- **Unit**: `I18nProvider.t()` placeholder substitution and fallback.
- **Integration**: Load a sample plugin with a `de.json` bundle and verify merged output.
- **E2E**: Playwright tests for language switching, UI updates, and sandbox isolation.
- **Security**: Tests that protected keys cannot be overridden by plugins.
- Extend existing testing specs (`db-adapters-testing-plan.md`, `lifecycle-hooks-testing-spec.md`) with i18n cases.

### 8. Documentation & Migration (Week 11)
- Finalize `translation-migration-guide.md` and link from other specs.
- Publish `language-translation-architecture.md` and `plugin-form-builder-architecture.md` updates.
- Add CI lint rule for translation key ordering and completeness.

---

## Open Questions (for team review)
- **Bundle versioning** – Should translation bundles be versioned per release?
- **Protected keys** – Confirm the complete list of core keys that must remain immutable.
- **Locale fallback strategy** – Decide whether to fallback to `en` or the nearest parent locale (e.g., `en‑GB` → `en`).

---

## Verification Plan
- Execute the full test suite after each milestone.
- Deploy a sample project, install a demo plugin, switch locales, and verify UI changes.
- Use the MCP `translations` endpoints to fetch bundles and confirm they contain both core and plugin keys.

---

*This roadmap lives in `specs/implementation-roadmap-for-specs.md` to keep all specification‑related planning in one place.*
