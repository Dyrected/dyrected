import { FormValidationError } from "../../../components/forms/form-validation-error";

/** Key used for server errors that do not name a field. */
export const FORM_LEVEL_ERROR_KEY = "_form";

/**
 * Turns whatever a failed save threw into one `field path -> message` map:
 * client validation failures, and the API's per-field errors.
 */
export function collectSubmitErrors(error: unknown): Record<string, string> {
  if (error instanceof FormValidationError) return { ...error.fieldErrors };

  const issues = (error as { errors?: unknown } | null)?.errors;
  const result: Record<string, string> = {};

  if (Array.isArray(issues)) {
    for (const issue of issues) {
      if (!issue || typeof issue.message !== "string") continue;
      const key = typeof issue.field === "string" && issue.field ? issue.field : FORM_LEVEL_ERROR_KEY;
      if (!(key in result)) result[key] = issue.message;
    }
  }

  if (Object.keys(result).length === 0 && error instanceof Error) {
    result[FORM_LEVEL_ERROR_KEY] = error.message;
  }

  return result;
}
