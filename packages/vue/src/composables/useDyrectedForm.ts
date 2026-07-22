import { computed, inject, onScopeDispose, provide, shallowRef, type InjectionKey } from "vue";
import type { DyrectedFormController, DyrectedFormHookResult } from "@dyrected/admin/public";
import type { VueStateify } from "./useAdminSchemas";

export const DYRECTED_FORM_CONTROLLER_KEY: InjectionKey<DyrectedFormController> = Symbol("dyrected-form-controller");
export const DYRECTED_FIELD_PATH_KEY: InjectionKey<string | null> = Symbol("dyrected-field-path");

/**
 * Provides a Dyrected form controller to the current Vue component subtree.
 *
 * Call this once near the root of a custom form implementation, then use
 * `useDyrectedForm()` and `useField()` lower in the tree.
 */
export function provideDyrectedForm(controller: DyrectedFormController) {
  provide(DYRECTED_FORM_CONTROLLER_KEY, controller);
  return controller;
}

/**
 * Provides the ambient field path for descendant `useField()` calls.
 *
 * This is useful when building nested field components that should resolve
 * child paths relative to a parent object, array item, or block.
 */
export function provideDyrectedFieldPath(path: string) {
  provide(DYRECTED_FIELD_PATH_KEY, path);
}

/**
 * Returns the current Dyrected form controller from Vue injection context.
 */
export function useDyrectedFormController() {
  const controller = inject(DYRECTED_FORM_CONTROLLER_KEY);
  if (!controller) {
    throw new Error("useDyrectedForm must be used within provideDyrectedForm()");
  }
  return controller;
}

/**
 * Returns the current ambient field path from Vue injection context.
 */
export function useDyrectedFieldPath() {
  return inject(DYRECTED_FIELD_PATH_KEY, null);
}

/**
 * Vue composable for reading and mutating Dyrected form state.
 *
 * Use this inside custom form shells, field containers, or document editors
 * that are backed by a provided `DyrectedFormController`.
 */
export function useDyrectedForm(): VueStateify<DyrectedFormHookResult> {
  const controller = useDyrectedFormController();
  const state = shallowRef(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    state.value = controller.getState();
  });

  onScopeDispose(() => {
    unsubscribe();
  });

  return {
    collection: computed(() => state.value.collection),
    fields: computed(() => state.value.fields),
    values: computed(() => state.value.values),
    errors: computed(() => state.value.errors),
    dirtyFields: computed(() => state.value.dirtyFields),
    touchedFields: computed(() => state.value.touchedFields),
    isDirty: computed(() => state.value.isDirty),
    isSubmitting: computed(() => state.value.isSubmitting),
    isValid: computed(() => state.value.isValid),
    submitCount: computed(() => state.value.submitCount),
    readOnly: computed(() => state.value.readOnly),
    documentId: computed(() => state.value.documentId),
    getValue: controller.getValue,
    getValues: controller.getValues,
    setValue: controller.setValue,
    getFieldSchema: controller.getFieldSchema,
    getFieldState: controller.getFieldState,
    reset: controller.reset,
    validate: controller.validate,
    submit: controller.submit,
    controller: shallowRef(controller),
  };
}
