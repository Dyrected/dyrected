import jexl from 'jexl';
import type { AccessResult } from '../types/access.js';
import { getConfigLogger } from '../observability.js';

/**
 * Jexl evaluator for Dyrected access control.
 * Allows for serializable, dynamic permissions based on user state, request, and document.
 */
export async function evaluateAccess(
  expression: string | boolean | undefined | null,
  context: { user?: any; req?: any; doc?: any; data?: any; config?: any }
): Promise<AccessResult> {
  // If no expression is provided, default to closed (false) for security
  // unless explicitly specified otherwise in the core router logic.
  if (expression === undefined || expression === null) return false;
  if (typeof expression === 'boolean') return expression;

  try {
    const result = await jexl.eval(expression, context);
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      return result as Record<string, unknown>;
    }
    return !!result;
  } catch (err) {
    getConfigLogger(context.config, 'access').error({
      err,
      msg: 'Jexl evaluation failed',
      expression,
    });
    return false;
  }
}
