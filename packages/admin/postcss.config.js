import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

/**
 * Scope Tailwind's global base-layer variable declarations under .dy-admin-ui
 * and rename unprefixed keyframes emitted by tailwindcss-animate.
 *
 * Why: Tailwind v3 emits `*, ::before, ::after { --tw-* }` and `::backdrop { --tw-* }`
 * regardless of `preflight: false`. These reset CSS variables on every element in the
 * host application. tailwindcss-animate also emits `@keyframes enter/exit` without
 * honouring the `prefix` option.
 */
const dyScope = () => ({
  postcssPlugin: 'postcss-dy-scope',

  Rule(rule, { AtRule }) {
    // Rules already inside a native layer are final.
    if (rule.parent && rule.parent.type === 'atrule' && rule.parent.name === 'layer') return;

    const WILDCARD = new Set(['*', '::before', '::after', '*::before', '*::after']);

    // `*, ::before, ::after { --tw-* }` → scope under .dy-admin-ui
    const isGlobalWildcard = rule.selectors.every((s) => WILDCARD.has(s.trim()));
    if (isGlobalWildcard) {
      rule.selectors = rule.selectors.map((s) => {
        const t = s.trim();
        if (t === '*') return '.dy-admin-ui *';
        if (t === '::before' || t === '*::before') return '.dy-admin-ui *::before';
        if (t === '::after' || t === '*::after') return '.dy-admin-ui *::after';
        return s;
      });

      // These initialise Tailwind v3's `--tw-*` variables. They must sit in the
      // base layer: unlayered, `--tw-ring-shadow: 0 0 #0000` and friends would
      // override the same-named variables a Tailwind v4 host's `ring`/`shadow`
      // utilities set on its own components inside the admin.
      const layer = new AtRule({ name: 'layer', params: 'base' });
      rule.replaceWith(layer);
      layer.append(rule);
      return;
    }

    // `::backdrop { --tw-* }` — cannot be meaningfully scoped; remove it.
    // The admin package does not rely on ::backdrop for any visual feature.
    if (rule.selectors.every((s) => s.trim() === '::backdrop')) {
      rule.remove();
    }
  },

  AtRule(atRule) {
    // `@media dy-native-layer-base { … }` in index.css marks element defaults that
    // belong in a native `@layer base`. Tailwind v3 would swallow a literal
    // `@layer base`, so the marker is rewritten after Tailwind has run.
    if (atRule.name === 'media' && atRule.params === 'dy-native-layer-base') {
      atRule.name = 'layer';
      atRule.params = 'base';
      return;
    }

    // tailwindcss-animate emits `@keyframes enter` / `@keyframes exit` without
    // respecting the `prefix` option. Rename them so they don't collide with
    // any host-application animations.
    if (atRule.name === 'keyframes') {
      if (atRule.params === 'enter') atRule.params = 'dy-enter';
      if (atRule.params === 'exit') atRule.params = 'dy-exit';
    }
  },

  Declaration(decl) {
    // Update `animation-name` references to match the renamed keyframes.
    if (decl.prop === 'animation-name') {
      decl.value = decl.value
        .split(',')
        .map((v) => {
          const t = v.trim();
          if (t === 'enter') return 'dy-enter';
          if (t === 'exit') return 'dy-exit';
          return t;
        })
        .join(', ');
    }
  },
});
dyScope.postcss = true;

export default {
  plugins: [tailwindcss, autoprefixer, dyScope],
};
