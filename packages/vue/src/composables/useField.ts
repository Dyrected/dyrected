import { computed, onScopeDispose, shallowRef } from "vue";
import {
  createDyrectedFieldController,
  type DyrectedFieldHookResult,
  getFieldPathSegments,
  getParentFieldPath,
  joinFieldPath,
  type DyrectedFieldPathPart,
  type DyrectedSetValueOptions,
} from "@dyrected/admin/public";
import { useDyrectedFieldPath, useDyrectedFormController } from "./useDyrectedForm";
import type { VueStateify } from "./useAdminSchemas";

/**
 * Vue composable for interacting with a single Dyrected field.
 *
 * Pass a full field path directly, or rely on `provideDyrectedFieldPath()` to
 * resolve paths relative to the current nested field scope.
 */
export function useField(path?: string): VueStateify<DyrectedFieldHookResult> {
  const formController = useDyrectedFormController();
  const contextPath = useDyrectedFieldPath();
  const resolvedPath = path ?? contextPath;

  if (!resolvedPath) {
    throw new Error("useField requires a field path or provideDyrectedFieldPath() scope");
  }

  const controller = createDyrectedFieldController(formController, resolvedPath);
  const state = shallowRef(controller.getState());
  const unsubscribe = controller.subscribe(() => {
    state.value = controller.getState();
  });

  onScopeDispose(() => {
    unsubscribe();
  });

  const pathSegments = computed(() => getFieldPathSegments(resolvedPath));
  const parentPath = computed(() => getParentFieldPath(resolvedPath));

  const getChildPath = (...parts: DyrectedFieldPathPart[]) => joinFieldPath(resolvedPath, ...parts);

  const getItemPath = (index: number, ...parts: DyrectedFieldPathPart[]) =>
    joinFieldPath(resolvedPath, index, ...parts);

  const getChildValue = (...parts: DyrectedFieldPathPart[]) => formController.getValue(getChildPath(...parts));

  const getChildSchema = (...parts: DyrectedFieldPathPart[]) => formController.getFieldSchema(getChildPath(...parts));

  const getChildState = (...parts: DyrectedFieldPathPart[]) => formController.getFieldState(getChildPath(...parts));

  const setChildValue = (
    parts: DyrectedFieldPathPart | DyrectedFieldPathPart[],
    value: unknown,
    options?: DyrectedSetValueOptions,
  ) => {
    const normalizedParts = Array.isArray(parts) ? parts : [parts];
    formController.setValue(getChildPath(...normalizedParts), value, options);
  };

  return {
    path: computed(() => state.value.path),
    schema: computed(() => state.value.schema),
    value: computed(() => state.value.value),
    error: computed(() => state.value.error),
    isDirty: computed(() => state.value.isDirty),
    isTouched: computed(() => state.value.isTouched),
    invalid: computed(() => state.value.invalid),
    pathSegments,
    parentPath,
    getChildPath,
    getItemPath,
    getChildValue,
    getChildSchema,
    getChildState,
    setChildValue,
    setValue: controller.setValue,
    validate: controller.validate,
    controller: shallowRef(controller),
  };
}
