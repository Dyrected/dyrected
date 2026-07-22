import type {
  DyrectedFieldState,
  DyrectedFormController,
  DyrectedSetValueOptions,
} from "./form"

type Listener = () => void

export interface DyrectedFieldController {
  getState(): DyrectedFieldState
  subscribe(listener: Listener): () => void
  setValue(value: unknown, options?: DyrectedSetValueOptions): void
  validate(): Promise<boolean>
}

/**
 * Creates a field-scoped controller from a Dyrected form controller and a path.
 */
export function createDyrectedFieldController(
  formController: DyrectedFormController,
  path: string
): DyrectedFieldController {
  let lastFormState = formController.getState()
  let lastFieldState = formController.getFieldState(path)

  return {
    getState: () => {
      const nextFormState = formController.getState()
      if (nextFormState === lastFormState) {
        return lastFieldState
      }

      lastFormState = nextFormState
      lastFieldState = formController.getFieldState(path)
      return lastFieldState
    },
    subscribe: (listener) => formController.subscribe(listener),
    setValue: (value, options) => formController.setValue(path, value, options),
    validate: () => formController.validate(path),
  }
}
