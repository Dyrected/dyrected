---
"@dyrected/admin": patch
---

Fix DatePicker click bug, revert react-day-picker to v8, and fix focus warnings.

- **Fixed DatePicker closing prematurely.** Intercept `pointerdown` events instead of `mousedown` on the wrapper, preventing the picker from instantly closing on click due to React event phase mismatches.
- **Downgraded `react-day-picker` to v8.** Version 9 introduced breaking DOM/CSS structure that conflicted with our existing styling. Downgrading to the highly stable v8 restores standard navigation button interactions and styling.
- **Fixed `aria-hidden` focus retention warning.** Replaced `aria-hidden` with the modern `inert` attribute on the closed calendar wrapper, forcing the browser to safely drop keyboard focus and satisfy screen reader constraints when the picker closes.
