import type { ComponentType } from 'react';
import { DyPathProvider } from '../providers/DyPathProvider';

export interface BlocksItem {
  /** Discriminator selecting which component renders this item. */
  blockType: string;
  /**
   * Selected presentation variant, when the block defines `variants` in its
   * schema. Passed straight through to the component so it can switch layout.
   */
  variant?: string;
  /** Optional stable id; used as the React key when present. */
  id?: string;
  [key: string]: unknown;
}

export interface BlocksProps {
  /** The array of block items (e.g. a page's `body`). */
  items: BlocksItem[];
  /** Map of `blockType` → component. Unknown types are skipped. */
  components: Record<string, ComponentType<any>>;
  /** RHF-style base path of this array on the document. Defaults to "body". */
  path?: string;
}

/**
 * Blocks — renders an array of block items by `blockType`, wrapping each in a
 * `<DyPathProvider>` scoped to its `${path}.${index}` so child components can
 * call `useDyPath('field')` without ever writing an index or full path.
 *
 * @example
 *   <Blocks items={data.body} components={{ hero: HeroBlock, cta: CtaBlock }} />
 */
export function Blocks({ items, components, path = 'body' }: BlocksProps) {
  return (
    <>
      {items.map((item, i) => {
        const Comp = components[item.blockType];
        if (!Comp) return null;
        return (
          <DyPathProvider key={item.id ?? i} path={`${path}.${i}`}>
            <Comp {...item} />
          </DyPathProvider>
        );
      })}
    </>
  );
}
