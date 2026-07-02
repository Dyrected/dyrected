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
 * useDyPath — returns an attribute object annotating an element with its
 * document value path, so the Dyrected live-preview editor can map a click in
 * the preview back to the exact field. Spread it onto the element (render
 * functions) or bind with `v-bind` in templates.
 *
 * Must be called in `setup()`. Authors pass only the field name relative to the
 * current block; the ancestor `<Blocks>`/`provideDyPath` supplies the base path.
 *
 * @example (render function)
 *   h('h1', useDyPath('heading'), props.heading)
 * @example (template)
 *   <h1 v-bind="useDyPath('heading')">{{ heading }}</h1>
 */
export function useDyPath(field?: string): { 'data-dy-path': string } {
  const basePath = inject(DY_PATH_KEY, '');
  const path = field ? (basePath ? `${basePath}.${field}` : field) : basePath;
  return { 'data-dy-path': path };
}
