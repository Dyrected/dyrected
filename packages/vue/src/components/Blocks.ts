import { defineComponent, h, type PropType, type Component } from 'vue';
import { DyPathScope } from './DyPathScope';

export interface BlocksItem {
  /** Discriminator selecting which component renders this item. */
  blockType: string;
  /** Optional stable id; used as the render key when present. */
  id?: string;
  [key: string]: unknown;
}

/**
 * Blocks — renders an array of block items by `blockType`, wrapping each in a
 * `DyPathScope` scoped to `${path}.${index}` so child components can call
 * `useDyPath('field')` without ever writing an index or full path.
 *
 * Render-function component (no template/JSX) so the package needs no extra
 * build tooling.
 *
 * @example (render function usage in a page)
 *   h(Blocks, { items: data.body, components: { hero: HeroBlock } })
 * @example (template usage)
 *   <Blocks :items="data.body" :components="{ hero: HeroBlock }" />
 */
export const Blocks = defineComponent({
  name: 'Blocks',
  props: {
    items: { type: Array as PropType<BlocksItem[]>, required: true },
    components: { type: Object as PropType<Record<string, Component>>, required: true },
    path: { type: String, default: 'body' },
  },
  setup(props) {
    return () =>
      props.items.map((item, i) => {
        const Comp = props.components[item.blockType];
        if (!Comp) return null;
        const basePath = `${props.path}.${i}`;
        // Pass a block-level data-dy-path. On a single-root block component it
        // falls through to the root element, making the whole block a
        // click-to-edit target; useDyPath('field') inside adds finer targets.
        return h(
          DyPathScope,
          { path: basePath, key: item.id ?? i },
          { default: () => h(Comp, { ...item, 'data-dy-path': basePath }) },
        );
      });
  },
});
