import type { Field as FieldSchema } from "@dyrected/sdk"

type Listener = () => void

export interface DyrectedFormValues {
  [key: string]: unknown
}

export interface DyrectedFormState {
  collection: string
  fields: FieldSchema[]
  values: DyrectedFormValues
  errors: Record<string, string>
  dirtyFields: Record<string, boolean>
  touchedFields: Record<string, boolean>
  isDirty: boolean
  isSubmitting: boolean
  isValid: boolean
  submitCount: number
  readOnly: boolean
  documentId?: string
}

export interface DyrectedSetValueOptions {
  shouldDirty?: boolean
  shouldTouch?: boolean
  shouldValidate?: boolean
}

export interface DyrectedFormControllerAdapters {
  setValue?: (path: string, value: unknown, options?: DyrectedSetValueOptions) => void
  reset?: (values?: DyrectedFormValues) => void
  validate?: (paths?: string | string[]) => Promise<boolean>
  submit?: () => Promise<unknown>
}

export interface DyrectedFormControllerOptions {
  collection: string
  fields: FieldSchema[]
  documentId?: string
  readOnly?: boolean
  initialValues?: DyrectedFormValues
  initialErrors?: Record<string, string>
  initialDirtyFields?: Record<string, boolean>
  initialTouchedFields?: Record<string, boolean>
  initialIsDirty?: boolean
  initialIsSubmitting?: boolean
  initialIsValid?: boolean
  initialSubmitCount?: number
  adapters?: DyrectedFormControllerAdapters
}

export interface DyrectedFieldState {
  path: string
  schema: FieldSchema | null
  value: unknown
  error?: string
  isDirty: boolean
  isTouched: boolean
  invalid: boolean
  setValue: (value: unknown, options?: DyrectedSetValueOptions) => void
  validate: () => Promise<boolean>
}

export interface DyrectedFormController {
  getState(): DyrectedFormState
  subscribe(listener: Listener): () => void
  setState(
    nextState:
      | Partial<DyrectedFormState>
      | ((currentState: DyrectedFormState) => DyrectedFormState)
  ): void
  getValue(path: string): unknown
  getValues(): DyrectedFormValues
  setValue(path: string, value: unknown, options?: DyrectedSetValueOptions): void
  getFieldSchema(path: string): FieldSchema | null
  getFieldState(path: string): DyrectedFieldState
  reset(values?: DyrectedFormValues): void
  validate(paths?: string | string[]): Promise<boolean>
  submit(): Promise<unknown>
}

function normalizePath(path: string): string[] {
  return path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean)
}

export function getValueAtPath(value: unknown, path: string): unknown {
  if (!path) return value
  return normalizePath(path).reduce<unknown>((currentValue, segment) => {
    if (currentValue == null) return undefined
    return (currentValue as Record<string, unknown>)[segment]
  }, value)
}

export function setValueAtPath<T>(value: T, path: string, nextValue: unknown): T {
  const segments = normalizePath(path)
  if (segments.length === 0) return nextValue as T

  const root = Array.isArray(value) ? [...value] : { ...(value as Record<string, unknown> ?? {}) }
  let cursor: Record<string, unknown> | unknown[] = root as Record<string, unknown> | unknown[]

  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1
    if (isLast) {
      ;(cursor as Record<string, unknown>)[segment] = nextValue
      return
    }

    const existing = (cursor as Record<string, unknown>)[segment]
    const nextSegment = segments[index + 1]
    const nextContainer =
      existing && typeof existing === "object"
        ? Array.isArray(existing)
          ? [...existing]
          : { ...(existing as Record<string, unknown>) }
        : /^\d+$/.test(nextSegment)
          ? []
          : {}

    ;(cursor as Record<string, unknown>)[segment] = nextContainer
    cursor = nextContainer
  })

  return root as T
}

function findFieldSchema(fields: FieldSchema[], path: string): FieldSchema | null {
  const segments = normalizePath(path).filter((segment) => !/^\d+$/.test(segment))
  if (segments.length === 0) return null

  let currentFields = fields
  let currentField: FieldSchema | null = null

  for (const segment of segments) {
    currentField = currentFields.find((field) => field.name === segment) ?? null
    if (!currentField) return null

    if (currentField.type === "blocks") {
      currentFields = currentField.blocks?.flatMap((block) => block.fields ?? []) ?? []
      continue
    }

    currentFields = currentField.fields ?? []
  }

  return currentField
}

export function createDyrectedFormController({
  collection,
  fields,
  documentId,
  readOnly = false,
  initialValues = {},
  initialErrors = {},
  initialDirtyFields = {},
  initialTouchedFields = {},
  initialIsDirty = false,
  initialIsSubmitting = false,
  initialIsValid = true,
  initialSubmitCount = 0,
  adapters,
}: DyrectedFormControllerOptions): DyrectedFormController {
  let state: DyrectedFormState = {
    collection,
    fields,
    values: initialValues,
    errors: initialErrors,
    dirtyFields: initialDirtyFields,
    touchedFields: initialTouchedFields,
    isDirty: initialIsDirty,
    isSubmitting: initialIsSubmitting,
    isValid: initialIsValid,
    submitCount: initialSubmitCount,
    readOnly,
    documentId,
  }

  const listeners = new Set<Listener>()

  const emit = () => {
    listeners.forEach((listener) => listener())
  }

  const setState: DyrectedFormController["setState"] = (nextState) => {
    state =
      typeof nextState === "function"
        ? nextState(state)
        : { ...state, ...nextState }
    emit()
  }

  const controller: DyrectedFormController = {
    getState: () => state,
    subscribe: (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    setState,
    getValue: (path) => getValueAtPath(state.values, path),
    getValues: () => state.values,
    setValue: (path, value, options) => {
      adapters?.setValue?.(path, value, options)
      state = {
        ...state,
        values: setValueAtPath(state.values, path, value),
        isDirty: options?.shouldDirty ? true : state.isDirty,
        dirtyFields: options?.shouldDirty
          ? { ...state.dirtyFields, [path]: true }
          : state.dirtyFields,
        touchedFields: options?.shouldTouch
          ? { ...state.touchedFields, [path]: true }
          : state.touchedFields,
      }
      emit()
    },
    getFieldSchema: (path) => findFieldSchema(state.fields, path),
    getFieldState: (path) => {
      const error = state.errors[path]
      return {
        path,
        schema: findFieldSchema(state.fields, path),
        value: getValueAtPath(state.values, path),
        error,
        isDirty: Boolean(state.dirtyFields[path]),
        isTouched: Boolean(state.touchedFields[path]),
        invalid: Boolean(error),
        setValue: (value, options) => {
          if (state.readOnly) return
          controller.setValue(path, value, {
            shouldDirty: true,
            shouldTouch: true,
            ...options,
          })
        },
        validate: async () => controller.validate(path),
      }
    },
    reset: (values) => {
      adapters?.reset?.(values)
      state = {
        ...state,
        values: values ?? {},
        errors: {},
        dirtyFields: {},
        touchedFields: {},
        isDirty: false,
      }
      emit()
    },
    validate: async (paths) => adapters?.validate?.(paths) ?? true,
    submit: async () => {
      if (!adapters?.submit) return state.values
      return adapters.submit()
    },
  }

  return controller
}
