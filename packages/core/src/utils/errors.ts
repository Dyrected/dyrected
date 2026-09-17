/**
 * User-facing errors for self-hosted server code (action handlers, hooks).
 *
 * Throw these instead of hand-rolling `{ statusCode }` onto a plain `Error`.
 * The action pipeline reads `statusCode` for the HTTP status (defaulting to
 * `500` when absent) and `message` for the response body — which is what the
 * SDK surfaces and the admin shows in its failure toast. Write the message
 * for the editor who will read it.
 *
 * @example
 * ```ts
 * import { ValidationError } from "@dyrected/core";
 *
 * handler: async ({ input }) => {
 *   if (!input.refundReason) {
 *     throw new ValidationError("Enter a refund reason so support can follow up.");
 *   }
 *   return { status: "refunded" };
 * }
 * ```
 */
export class DyrectedError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = "DyrectedError";
    this.statusCode = statusCode;
    Object.setPrototypeOf(this, DyrectedError.prototype);
  }
}

/** Bad input the editor can fix and retry. Answered with `400`. */
export class ValidationError extends DyrectedError {
  constructor(message: string) {
    super(message, 400);
    this.name = "ValidationError";
    Object.setPrototypeOf(this, ValidationError.prototype);
  }
}

/** The editor is not allowed to do this. Answered with `403`. */
export class ForbiddenError extends DyrectedError {
  constructor(message: string) {
    super(message, 403);
    this.name = "ForbiddenError";
    Object.setPrototypeOf(this, ForbiddenError.prototype);
  }
}

/** A referenced record does not exist. Answered with `404`. */
export class NotFoundError extends DyrectedError {
  constructor(message: string) {
    super(message, 404);
    this.name = "NotFoundError";
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

/** The current state conflicts with the requested change. Answered with `409`. */
export class ConflictError extends DyrectedError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ConflictError";
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

/** A unique constraint or unique index was violated on insert/update. Answered with `409`. */
export class DuplicateKeyError extends ConflictError {
  readonly field?: string;
  readonly value?: any;

  constructor(message: string, options?: { field?: string; value?: any }) {
    super(message);
    this.name = "DuplicateKeyError";
    this.field = options?.field;
    this.value = options?.value;
    Object.setPrototypeOf(this, DuplicateKeyError.prototype);
  }
}

