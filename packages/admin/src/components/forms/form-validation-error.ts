/**
 * Thrown when a submit is stopped by client-side validation. `fieldErrors` maps
 * each invalid field path to its message, for callers that report errors outside
 * the form.
 */
export class FormValidationError extends Error {
  fieldErrors: Record<string, string>

  constructor(fieldErrors: Record<string, string>) {
    super("Please resolve validation errors before continuing.")
    this.name = "FormValidationError"
    this.fieldErrors = fieldErrors
  }
}
