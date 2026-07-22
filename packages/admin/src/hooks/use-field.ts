import * as React from "react"
import type { DyrectedFieldHookResult } from "../public/contracts"
import { createDyrectedFieldController } from "../controllers/field"
import {
  getFieldPathSegments,
  getParentFieldPath,
  joinFieldPath,
  type DyrectedFieldPathPart,
  type DyrectedSetValueOptions,
} from "../controllers/form"
import {
  useDyrectedFieldPathContext,
  useDyrectedFormControllerContext,
} from "../providers/dyrected-form-context"

export function useField(path?: string): DyrectedFieldHookResult {
  const formController = useDyrectedFormControllerContext()
  const contextPath = useDyrectedFieldPathContext()
  const resolvedPath = path ?? contextPath

  if (!resolvedPath) {
    throw new Error("useField requires a field path or a DyrectedFieldPathProvider ancestor")
  }

  const controller = React.useMemo(
    () => createDyrectedFieldController(formController, resolvedPath),
    [formController, resolvedPath]
  )

  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  )

  const pathSegments = React.useMemo(
    () => getFieldPathSegments(resolvedPath),
    [resolvedPath]
  )
  const parentPath = React.useMemo(
    () => getParentFieldPath(resolvedPath),
    [resolvedPath]
  )

  const getChildPath = React.useCallback(
    (...parts: DyrectedFieldPathPart[]) => joinFieldPath(resolvedPath, ...parts),
    [resolvedPath]
  )

  const getItemPath = React.useCallback(
    (index: number, ...parts: DyrectedFieldPathPart[]) =>
      joinFieldPath(resolvedPath, index, ...parts),
    [resolvedPath]
  )

  const getChildValue = React.useCallback(
    (...parts: DyrectedFieldPathPart[]) => formController.getValue(getChildPath(...parts)),
    [formController, getChildPath]
  )

  const getChildSchema = React.useCallback(
    (...parts: DyrectedFieldPathPart[]) => formController.getFieldSchema(getChildPath(...parts)),
    [formController, getChildPath]
  )

  const getChildState = React.useCallback(
    (...parts: DyrectedFieldPathPart[]) => formController.getFieldState(getChildPath(...parts)),
    [formController, getChildPath]
  )

  const setChildValue = React.useCallback(
    (
      parts: DyrectedFieldPathPart | DyrectedFieldPathPart[],
      value: unknown,
      options?: DyrectedSetValueOptions
    ) => {
      const normalizedParts = Array.isArray(parts) ? parts : [parts]
      formController.setValue(getChildPath(...normalizedParts), value, options)
    },
    [formController, getChildPath]
  )

  return {
    ...state,
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
    controller,
  }
}
