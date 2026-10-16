import { defineComponent, h, inject, onBeforeUnmount, onMounted, ref, watch, type PropType } from 'vue';
import { DYRECTED_REACT_SLOTS_KEY, type ReactSlotHandle, type ReactSlotKind } from '../bridge/react-slots';

/**
 * Builds a Vue component that renders one of Dyrected's built-in form pieces.
 * The piece is a React component portaled into a placeholder, so it keeps the
 * form's validation, conditions, widths and field overrides.
 */
function createFormPiece(name: string, kind: ReactSlotKind, props: Record<string, any>) {
  return defineComponent({
    name,
    props,
    setup(componentProps) {
      const registry = inject(DYRECTED_REACT_SLOTS_KEY, null);
      if (!registry) {
        throw new Error(
          `<${name}> can only be used inside a custom create or edit form registered under \`components.forms\`.`,
        );
      }
      const el = ref<HTMLElement | null>(null);
      let handle: ReactSlotHandle | null = null;

      onMounted(() => {
        if (el.value) handle = registry.mount(el.value, kind, { ...componentProps });
      });
      watch(
        () => ({ ...componentProps }),
        (next) => handle?.update(next),
        { deep: true },
      );
      onBeforeUnmount(() => {
        handle?.unmount();
        handle = null;
      });

      return () => h('div', { ref: el, style: { display: 'contents' } });
    },
  });
}

/**
 * Renders one built-in input, wired to the form. Keeps the field's label,
 * validation message, conditions, read-only state and `admin.component` override.
 */
export const DyrectedField = createFormPiece('DyrectedField', 'field', {
  path: { type: String, required: true },
});

/** Renders several built-in inputs with the schema's layout rules. Pass `names`, or `exclude` to render the rest. */
export const DyrectedFields = createFormPiece('DyrectedFields', 'fields', {
  names: { type: Array as PropType<string[]>, default: undefined },
  exclude: { type: Array as PropType<string[]>, default: undefined },
});

/** Renders the whole built-in form body. Pass `exclude` to leave some fields to your own markup. */
export const DyrectedDefaultForm = createFormPiece('DyrectedDefaultForm', 'defaultForm', {
  exclude: { type: Array as PropType<string[]>, default: undefined },
});
