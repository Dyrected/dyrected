import { inject, provide, type InjectionKey } from 'vue';

/**
 * Injection key carrying the ambient base path for the block/section currently
 * being rendered, e.g. "body.2". `provideDyPath` sets it; `useDyPath` reads it.
 * Defaults to '' (document root).
 */
export const DY_PATH_KEY: InjectionKey<string> = Symbol('dyPath');

/**
 * provideDyPath — set the ambient base path for the current component's
 * subtree. Must be called in `setup()`. `<Blocks>` calls this for you via
 * `DyPathScope`; use it directly only for a standalone section.
 */
export function provideDyPath(path: string): void {
  provide(DY_PATH_KEY, path);
}

/**
 * Function that creates `data-dy-path` props for any field relative to the current block.
 */
export type DyPathFn = (field?: string) => { 'data-dy-path': string };

/**
 * useDyPath — returns an annotation helper or attribute object annotating an element with its
 * document value path, so the Dyrected live-preview editor can map a click in
 * the preview back to the exact field.
 *
 * @overload When called with no arguments (recommended), returns a `dy` helper function:
 * ```vue
 * <script setup>
 * const dy = useDyPath();
 * </script>
 * <template>
 *   <h1 v-bind="dy('heading')">{{ heading }}</h1>
 *   <p v-if="subheading" v-bind="dy('subheading')">{{ subheading }}</p>
 *   <ul>
 *     <li v-for="(item, idx) in items" :key="idx" v-bind="dy(`items.${idx}.title`)">
 *       {{ item.title }}
 *     </li>
 *   </ul>
 * </template>
 * ```
 *
 * @overload When called with a field name, returns the attribute object directly:
 * ```vue
 * <template>
 *   <h1 v-bind="useDyPath('heading')">{{ heading }}</h1>
 * </template>
 * ```
 */
export function useDyPath(): DyPathFn;
export function useDyPath(field: string): { 'data-dy-path': string };
export function useDyPath(field?: string): DyPathFn | { 'data-dy-path': string } {
  const basePath = inject(DY_PATH_KEY, '');

  if (field === undefined) {
    return (subField?: string) => {
      const fullPath = subField
        ? (basePath ? `${basePath}.${subField}` : subField)
        : (basePath || '');
      return { 'data-dy-path': fullPath };
    };
  }

  const path = basePath ? `${basePath}.${field}` : field;
  return { 'data-dy-path': path };
}

/**
 * useDyPathHelper — explicit helper that reads context once in setup() and returns
 * a callable path generator function.
 */
export function useDyPathHelper(): DyPathFn {
  return useDyPath();
}
