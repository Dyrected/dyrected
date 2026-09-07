import { createContext, useContext, useCallback } from 'react';

/**
 * Ambient base path for the block/section currently being rendered, e.g.
 * "body.2". `<DyPathProvider>` sets it; `useDyPath` reads it. Empty at the
 * document root.
 */
export const DyPathContext = createContext<string>('');

export type DyPathFn = (field?: string) => { 'data-dy-path': string };

/**
 * useDyPath — returns spreadable props that annotate an element with its
 * document value path, so the Dyrected live-preview editor can map a click in
 * the preview back to the exact field.
 *
 * When called with no arguments at the component top-level, it returns a pure
 * annotator function `(field?: string) => { 'data-dy-path': string }` that can
 * safely be called anywhere in JSX, conditional branches, or loops without
 * violating React's Rules of Hooks.
 *
 * When called with a `field` name directly, it returns the annotated prop object.
 *
 * @example Top-level hook helper (Recommended for loops & conditionals)
 *   const dy = useDyPath();
 *   return (
 *     <div>
 *       <h1 {...dy('heading')}>{heading}</h1>
 *       {cta && <a {...dy('cta.url')} href={cta.url}>{cta.label}</a>}
 *       {items.map((item, idx) => (
 *         <span key={idx} {...dy(`items.${idx}.name`)}>{item.name}</span>
 *       ))}
 *     </div>
 *   );
 *
 * @example Direct call for simple unconditional elements
 *   <h1 {...useDyPath('heading')}>{heading}</h1>
 */
export function useDyPath(): DyPathFn;
export function useDyPath(field: string): { 'data-dy-path': string };
export function useDyPath(field?: string): DyPathFn | { 'data-dy-path': string } {
  const basePath = useContext(DyPathContext);

  const helper: DyPathFn = useCallback(
    (targetField?: string) => {
      const path = targetField ? (basePath ? `${basePath}.${targetField}` : targetField) : basePath;
      return { 'data-dy-path': path };
    },
    [basePath]
  );

  if (typeof field === 'string') {
    return helper(field);
  }

  return helper;
}

/**
 * useDyPathHelper — safely reads DyPathContext ONCE at component top-level
 * and returns a pure function `(field?: string) => { 'data-dy-path': string }`
 * that can be called anywhere in JSX, loops, or conditionals without violating
 * React's Rules of Hooks.
 */
export function useDyPathHelper(): DyPathFn {
  return useDyPath();
}
