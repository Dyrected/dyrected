import * as React from "react"
import type { DyrectedFormHookResult } from "../public/contracts"
import { useDyrectedFormControllerContext } from "../providers/dyrected-form-context"

export function useDyrectedForm(): DyrectedFormHookResult {
  const controller = useDyrectedFormControllerContext()
  const state = React.useSyncExternalStore(
    controller.subscribe,
    controller.getState,
    controller.getState
  )

  return {
    ...state,
    getValue: controller.getValue,
    getValues: controller.getValues,
    setValue: controller.setValue,
    getFieldSchema: controller.getFieldSchema,
    getFieldState: controller.getFieldState,
    reset: controller.reset,
    validate: controller.validate,
    submit: controller.submit,
    controller,
  }
}
