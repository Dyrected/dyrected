import { defineComponent } from 'vue';
import { provideDyPath } from '../composables/useDyPath';

/**
 * DyPathScope — a minimal wrapper component whose sole job is to own one
 * `provide()` scope for the ambient base path.
 *
 * In Vue, `provide()` is bound to the calling component *instance*, not to a
 * render position, so a single component cannot provide a distinct value per
 * item in a loop. `<Blocks>` renders one `DyPathScope` per item to give each
 * block its own scoped base path.
 *
 * Written as a render-function component (no template/JSX) so the package needs
 * no extra build tooling.
 */
export const DyPathScope = defineComponent({
  name: 'DyPathScope',
  props: {
    path: { type: String, required: true },
  },
  setup(props, { slots }) {
    provideDyPath(props.path);
    return () => slots.default?.();
  },
});
