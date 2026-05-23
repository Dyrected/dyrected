# Language & Translation Architecture for Dyrected

## Overview
Dyrected will support **multilingual UI** and **content translation** out‑of‑the‑box. The goal is to let developers, content editors, and AI agents create, store, and serve translations for both core UI strings and user‑generated content (e.g., form labels, collection fields) without touching the core code.

---

## 1. Core Concepts
| Concept | Description |
|---------|-------------|
| **Locale** | A BCP47 language tag (e.g., `en`, `en‑GB`, `fr`, `es‑MX`). The system loads the most specific match available. |
| **Translation Bundle** | JSON object mapping *message keys* to localized strings. Bundles are stored in `src/locales/<locale>.json` for core strings and in `plugins/**/locales/<locale>.json` for plugin‑provided strings. |
| **i18n Provider** | Runtime service that merges core + plugin bundles, caches the result, and exposes a `t(key, params?)` function to the UI and server side. |
| **Dynamic Content Translation** | Form definitions, collection field `label`s, and UI component props can reference a translation key (e.g., `t('form.title')`). The admin UI will display the translated string based on the current UI locale. |
| **AI‑First Discovery** | The MCP server will expose a new resource `@dyrected/mcp/translations` that lists installed locales, available keys, and a **download** endpoint for each bundle. AI agents can query this to discover which languages are supported and fetch translation data. |

---

## 2. File Layout & Naming
```
/src
  /locales
    en.json          # Core English strings (default)
    fr.json          # French translations
    es.json          # Spanish translations
plugins/
  my‑awesome‑plugin/
    /locales
      en.json
      de.json
    dyrected-plugin.json
    src/index.ts
```
- **Message Keys** follow a dot‑notation hierarchy (e.g., `admin.menu.dashboard`, `forms.contact.title`).
- Plugins may **extend** existing keys or add new ones; duplicate keys are overridden by the plugin’s bundle (allowing custom UI strings). 

---

## 3. Runtime Integration
### 3.1 Server Side
Add a new module `packages/core/src/i18n/i18n.ts`:
```ts
export interface TranslationBundle { [key: string]: string | TranslationBundle; }

export class I18nProvider {
  private bundles: Map<string, TranslationBundle> = new Map();
  constructor(private localesRoot: string) {}
  async loadLocale(locale: string) {
    const core = await import(`${this.localesRoot}/${locale}.json`);
    const plugins = await this.loadPluginBundles(locale);
    this.bundles.set(locale, { ...core.default, ...plugins });
  }
  private async loadPluginBundles(locale: string) {
    const ctx = require.context('../../plugins', true, /locales\/[^/]+\.json$/);
    const result: any = {};
    ctx.keys().forEach((path: string) => {
      if (path.endsWith(`/${locale}.json`)) {
        const bundle = ctx(path).default;
        Object.assign(result, bundle);
      }
    });
    return result;
  }
  t(locale: string, key: string, params?: Record<string, any>) {
    const bundle = this.bundles.get(locale) ?? {};
    const tmpl = key.split('.').reduce((obj, seg) => obj?.[seg], bundle) as string | undefined;
    if (!tmpl) return key; // fallback to key if missing
    return params ? tmpl.replace(/\{(\w+)\}/g, (_, p) => params[p] ?? '') : tmpl;
  }
}
```
- The provider is instantiated in `app.ts` and made available via the request context (`c.get('i18n')`).
- Server‑side code (e.g., email templates, validation messages) can call `i18n.t(locale, key, params)`.

### 3.2 Client Side
Create a tiny hook `useI18n()` in `packages/admin/src/hooks/useI18n.ts` that pulls the provider from a React context:
```tsx
export const I18nContext = React.createContext<I18nProvider>(new I18nProvider('/locales'));
export const useI18n = () => {
  const provider = React.useContext(I18nContext);
  const locale = React.useState(() => navigator.language.split('-')[0])[0];
  return (key: string, params?: Record<string, any>) => provider.t(locale, key, params);
};
```
- UI components replace static strings with `t('admin.menu.settings')`.
- The **form builder** will store field `labelKey` instead of raw text; the renderer resolves it via `useI18n()`.

---

## 4. Plugin API Extensions
### 4.1 Manifest Permissions
Add a new optional field `locales?: string[]` to `dyrected-plugin.json`:
```json
{
  "name": "example-plugin",
  "version": "0.1.0",
  "locales": ["en", "de"]
}
```
- At load time the core validates that the declared locales exist under `plugins/**/locales/`.
- The MCP `@dyrected/mcp/plugins` endpoint will now include `supportedLocales` for each plugin.

### 4.2 Translation Hook
Plugins may register a hook `onLocaleChange` to react when the UI locale changes (e.g., to recompute cached data). Example registration:
```ts
ctx.addHook('onLocaleChange', async (newLocale: string) => {
  await myService.reloadResources(newLocale);
});
```
The core triggers this hook whenever the user switches languages in the admin UI.

---

## 5. MCP Exposure
Add a new MCP resource `@dyrected/mcp/translations` with the following endpoints:
- `GET /locales` → `[{ locale: string, name: string }]`
- `GET /bundles/:locale` → JSON bundle (merged core + plugins)
- `GET /keys/:locale` → List of all translation keys for that locale (useful for AI agents to discover available strings).

---

## 6. Development Workflow
1. **Add a locale file** – Create `src/locales/<locale>.json` (or plugin level). Use the same key structure across languages.
2. **Run the linter** – A new lint rule (`i18n-key-order`) will ensure keys are alphabetically sorted for readability.
3. **Update tests** – Extend the existing `specs/lifecycle-hooks-testing-spec.md` to verify that `t()` falls back to the key when a translation is missing.
4. **CI check** – The CI pipeline will compare the set of keys between the default (`en.json`) and each locale; missing keys will cause a warning.

---

## 7. Example Locale File (en.json)
```json
{
  "admin": {
    "menu": {
      "dashboard": "Dashboard",
      "settings": "Settings"
    }
  },
  "forms": {
    "contact": {
      "title": "Contact Us",
      "submit": "Send Message"
    }
  }
}
```
Corresponding `fr.json` would replace the strings with French translations while keeping the same key hierarchy.

---

## 8. Testing Strategy
- **Unit** – Verify `I18nProvider.t()` returns the correct string and performs placeholder substitution.
- **Integration** – Load a plugin that provides a `de.json` bundle and ensure the merged bundle contains both core and plugin keys.
- **E2E** – In the admin UI, switch the language selector and assert that UI text updates instantly (Playwright can capture the DOM after locale change).
- **Security** – Ensure that plugin bundles cannot overwrite core keys marked as **protected** (e.g., `admin.menu.logout`). Protected keys are declared in `specs/protected-translation-keys.md` and the loader will reject any attempts to replace them.

---

## 9. Migration Path for Existing Projects
1. **Extract static UI strings** – Run the provided `scripts/extract-strings.ts` to generate an initial `en.json` from the codebase.
2. **Replace literals** – Refactor components to use `t('key')` via the `useI18n` hook.
3. **Add locale files** – Start with the default `en.json`, then add additional locales as needed.
4. **Update plugins** – If a plugin currently embeds hard‑coded UI strings, move them into a `locales/` directory and reference via `t()`.

---

## 10. References & Related Specs
- `specs/plugin-form-builder-architecture.md` – the plugin system that will also host locale bundles.
- `specs/ai-first-architecture-spec.md` – how MCP resources expose translation data to AI agents.
- `specs/client-side-reactivity-spec.md` – sandbox considerations for UI components that now load locale bundles inside the iframe.

---

**Next Steps**
- Review this translation architecture with the team.
- Decide on the default locale strategy (fallback to `en`).
- Add the `I18nProvider` implementation to `packages/core/src/i18n/`.
- Extend the MCP server with the translation endpoints.
- Draft guidelines for plugin authors on providing locale bundles.

---

*Document stored at `specs/language-translation-architecture.md` for version control.*
