---
"@dyrected/react": patch
"@dyrected/vue": patch
"@dyrected/nuxt": patch
---

feat: add `DyrectedIcon` component for rendering `icon` field values

The `icon` field type stores a Lucide icon *name* (e.g. `"ChartNoAxesCombined"`), not SVG markup. The new `DyrectedIcon` component resolves that name to the matching Lucide icon so `icon` field values can be rendered directly:

- `@dyrected/react` — `<DyrectedIcon name={feature.icon} className="w-6 h-6" />` (backed by `lucide-react`)
- `@dyrected/vue` — `<DyrectedIcon :name="feature.icon" class="w-6 h-6" />` (backed by `lucide-vue-next`)
- `@dyrected/nuxt` — auto-imported as `<DyrectedIcon>` (no import required)

All standard Lucide props (`size`, `color`, `strokeWidth`, `class`/`className`, …) are forwarded, plus an optional `fallback` icon name. Integration docs now document the component and include a full per-framework component reference.
