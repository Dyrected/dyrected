import type { ReactNode } from 'react';
import { DyPathContext } from '../hooks/useDyPath';

/**
 * DyPathProvider — scopes the ambient base path for a block/section subtree so
 * `useDyPath(field)` inside it resolves to `${path}.${field}`.
 *
 * `<Blocks>` wraps each item in one of these automatically; use it directly
 * only for a standalone section that isn't rendered through `<Blocks>` (e.g. a
 * singleton object field: `<DyPathProvider path="hero">…</DyPathProvider>`).
 */
export function DyPathProvider({ path, children }: { path: string; children: ReactNode }) {
  return <DyPathContext.Provider value={path}>{children}</DyPathContext.Provider>;
}
