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

  Rule(rule) {
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
      return;
    }

    // `::backdrop { --tw-* }` — cannot be meaningfully scoped; remove it.
    // The admin package does not rely on ::backdrop for any visual feature.
    if (rule.selectors.every((s) => s.trim() === '::backdrop')) {
      rule.remove();
    }
  },

  AtRule(atRule) {
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
