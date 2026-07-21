import * as React from "react"
import { createDyrectedFieldController } from "../controllers/field"
import {
  useDyrectedFieldPathContext,
  useDyrectedFormControllerContext,
} from "../providers/dyrected-form-context"

export function useField(path?: string) {
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

  return {
    ...state,
    setValue: controller.setValue,
    validate: controller.validate,
    controller,
  }
}
