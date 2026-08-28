export type AIErrorCode =
  | 'AI_UNCONFIGURED'
  | 'AI_RATE_LIMITED'
  | 'AI_QUOTA_EXHAUSTED'
  | 'AI_TIMEOUT'
  | 'AI_TOOL_VALIDATION_ERROR'
  | 'AI_PERMISSION_DENIED'
  | 'AI_TENANT_VIOLATION'
  | 'AI_ACTION_EXPIRED'
  | 'AI_ACTION_ALREADY_EXECUTED'
  | 'AI_INTERNAL_ERROR';

export class DyrectedAIError extends Error {
  public readonly code: AIErrorCode;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    code: AIErrorCode,
    message: string,
    status = 500,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'DyrectedAIError';
    this.code = code;
    this.status = status;
    this.details = details;
    Object.setPrototypeOf(this, DyrectedAIError.prototype);
  }

  toJSON() {
    return {
      error: true,
      code: this.code,
      message: this.message,
      status: this.status,
      details: this.details,
    };
  }
}
