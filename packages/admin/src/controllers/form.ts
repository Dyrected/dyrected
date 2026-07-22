import type { Field as FieldSchema } from "@dyrected/sdk"

type Listener = () => void
export type DyrectedFieldPathPart = string | number | null | undefined | false

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
  setAdapters(adapters?: DyrectedFormControllerAdapters): void
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

/**
 * Normalizes a dotted field path into path segments.
 */
export function normalizeFieldPath(path: string): string[] {
  return path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean)
}

/**
 * Alias for `normalizeFieldPath` used in public field/path helpers.
 */
export function getFieldPathSegments(path: string): string[] {
  return normalizeFieldPath(path)
}

/**
 * Joins path parts into one dotted Dyrected field path.
 */
export function joinFieldPath(...parts: DyrectedFieldPathPart[]): string {
  return parts
    .flatMap((part) => {
      if (part === null || part === undefined || part === false) return []
      return String(part)
        .split(".")
        .map((segment) => segment.trim())
        .filter(Boolean)
    })
    .join(".")
}

/**
 * Returns the parent path for a given dotted field path.
 */
export function getParentFieldPath(path: string): string {
  const segments = normalizeFieldPath(path)
  return segments.slice(0, -1).join(".")
}

/**
 * Reads a nested value using a dotted Dyrected field path.
 */
export function getValueAtPath(value: unknown, path: string): unknown {
  if (!path) return value
  return normalizeFieldPath(path).reduce<unknown>((currentValue, segment) => {
    if (currentValue == null) return undefined
    return (currentValue as Record<string, unknown>)[segment]
  }, value)
}

/**
 * Writes a nested value immutably using a dotted Dyrected field path.
 */
export function setValueAtPath<T>(value: T, path: string, nextValue: unknown): T {
  const segments = normalizeFieldPath(path)
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
  const segments = normalizeFieldPath(path).filter((segment) => !/^\d+$/.test(segment))
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

/**
 * Creates a framework-agnostic Dyrected form controller.
 *
 * This is the low-level state contract behind the React and Vue form APIs.
 */
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
  let controllerAdapters = adapters

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
    setAdapters: (nextAdapters) => {
      controllerAdapters = nextAdapters
    },
    setState,
    getValue: (path) => getValueAtPath(state.values, path),
    getValues: () => state.values,
    setValue: (path, value, options) => {
      controllerAdapters?.setValue?.(path, value, options)
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
      controllerAdapters?.reset?.(values)
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
    validate: async (paths) => controllerAdapters?.validate?.(paths) ?? true,
    submit: async () => {
      if (!controllerAdapters?.submit) return state.values
      return controllerAdapters.submit()
    },
  }

  return controller
}
