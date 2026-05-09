import jexl from 'jexl';

/**
 * Jexl evaluator for Dyrected access control.
 * Allows for serializable, dynamic permissions based on user state, request, and document.
 */
export async function evaluateAccess(
  expression: string | boolean | undefined | null,
  context: { user?: any; req?: any; doc?: any }
): Promise<boolean> {
  // If no expression is provided, default to closed (false) for security
  // unless explicitly specified otherwise in the core router logic.
  if (expression === undefined || expression === null) return false;
  if (typeof expression === 'boolean') return expression;

  try {
    const result = await jexl.eval(expression, context);
    return !!result;
  } catch (err) {
    console.error('[dyrected/core] Jexl evaluation failed:', err);
    return false;
  }
}
