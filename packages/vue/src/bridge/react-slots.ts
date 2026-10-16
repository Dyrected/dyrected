import type { InjectionKey } from 'vue';

/** Which React component a Vue placeholder asks the bridge to render. */
export type ReactSlotKind = 'field' | 'fields' | 'defaultForm';

export interface ReactSlotHandle {
  update(props: Record<string, unknown>): void;
  unmount(): void;
}

/**
 * Lets a Vue component render a React component *inside the React tree* that
 * hosts the Vue island, through a portal into `el`.
 *
 * Built-in inputs need React contexts (the form engine, react-hook-form, the
 * nested editor). A separate React root would lose them; a portal keeps them.
 */
export interface ReactSlotRegistry {
  mount(el: HTMLElement, kind: ReactSlotKind, props: Record<string, unknown>): ReactSlotHandle;
}

export const DYRECTED_REACT_SLOTS_KEY: InjectionKey<ReactSlotRegistry> = Symbol.for('dyrected.react-slots');
