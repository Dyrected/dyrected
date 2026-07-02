import { createContext, useContext } from 'react';

/**
 * Ambient base path for the block/section currently being rendered, e.g.
 * "body.2". `<DyPathProvider>` sets it; `useDyPath` reads it. Empty at the
 * document root.
 */
export const DyPathContext = createContext<string>('');

/**
 * useDyPath — returns spreadable props that annotate an element with its
 * document value path, so the Dyrected live-preview editor can map a click in
 * the preview back to the exact field.
 *
 * Authors pass only the field name relative to the current block; the ancestor
 * `<Blocks>`/`<DyPathProvider>` supplies the base path, so no index or full
 * dotted path is ever hand-written.
 *
 * @example
 *   <h1 {...useDyPath('heading')}>{heading}</h1>
 *   <a {...useDyPath('cta.url')} href={cta.url}>{cta.label}</a>
 */
export function useDyPath(field?: string): { 'data-dy-path': string } {
  const basePath = useContext(DyPathContext);
  const path = field ? (basePath ? `${basePath}.${field}` : field) : basePath;
  return { 'data-dy-path': path };
}
