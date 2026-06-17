import type { WhereClause, WhereOperatorName, WhereOperator } from '@dyrected/core';

export interface FilterRule {
  field: string;
  operator: WhereOperatorName;
  value: unknown;
}

/**
 * Converts an array of FilterRules into a WhereClause.
 * All rules are ANDed together.
 */
export function rulesToWhere(rules: FilterRule[]): WhereClause {
  if (!rules || rules.length === 0) {
    return {};
  }

  const clause: WhereClause = {};

  for (const rule of rules) {
    const { field, operator, value } = rule;

    // Handle operator format matching the WhereOperator DSL
    const operatorObj = { [operator]: value } as WhereOperator;

    if (clause[field]) {
      // If there are multiple rules for the same field, AND them together
      if (!clause.AND) {
        clause.AND = [];
      }
      clause.AND.push({ [field]: operatorObj });
    } else {
      clause[field] = operatorObj;
    }
  }

  // Optimize AND array if needed, but the current DB adapters can handle field ANDs properly
  return clause;
}

/**
 * Converts a flat WhereClause back into an array of FilterRules.
 * Best effort extraction for UI state.
 */
export function whereToRules(where: WhereClause | undefined): FilterRule[] {
  if (!where || Object.keys(where).length === 0) return [];
  
  const rules: FilterRule[] = [];
  
  for (const [key, val] of Object.entries(where)) {
    if (key === 'AND' && Array.isArray(val)) {
      for (const andItem of val) {
        for (const [andField, andOpObj] of Object.entries(andItem)) {
          if (andOpObj && typeof andOpObj === 'object' && !Array.isArray(andOpObj)) {
            const operator = Object.keys(andOpObj)[0] as WhereOperatorName;
            const value = (andOpObj as Record<string, unknown>)[operator];
            rules.push({ field: andField, operator, value });
          }
        }
      }
    } else if (key !== 'OR' && val && typeof val === 'object' && !Array.isArray(val)) {
      const operator = Object.keys(val)[0] as WhereOperatorName;
      const value = (val as Record<string, unknown>)[operator];
      rules.push({ field: key, operator, value });
    }
  }
  
  return rules;
}
