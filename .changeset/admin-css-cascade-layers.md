---
"@dyrected/admin": patch
---

Your own components inside the admin now keep their styles when your app uses Tailwind v4.

**For app developers**

- Before this fix, the admin's stylesheet beat Tailwind v4 utility classes on your own components rendered inside it, because Tailwind v4 puts utilities in a CSS layer and unlayered CSS always wins over layered CSS. A custom field, slot, page or view layout lost its `border`, `bg-*`, `font-bold`, `text-2xl`, `mb-4` and even `ring` or `shadow` classes. The admin now puts its element defaults in `@layer base`, so your classes apply as you wrote them.
- You no longer need `!important`, inline styles or box-shadow tricks to draw a border inside a custom component.
- The admin's own appearance is unchanged. Its `dy-*` classes are not layered and still take priority over those defaults.
- Apps on Tailwind v3 or plain CSS are unaffected, since unlayered host styles already beat layered ones.

**For integration authors**

- The scoped reset, the heading, button and field defaults, and the `--tw-*` variable initialisers in `admin.css` are now inside `@layer base`. Layers are supported by all current browsers.
- Rules that target admin classes, such as `.dy-admin-ui .dy-text-primary`, stay unlayered.
