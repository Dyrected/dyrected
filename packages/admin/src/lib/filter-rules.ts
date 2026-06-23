import type { WhereClause, WhereOperatorName, WhereOperator } from '@dyrected/core';

/**
 * A single filter rule in the admin filter builder.
 * An array of rules is AND'd together and converted to a `WhereClause`
 * before being passed to `collection.find({ where })`.
 */
export interface FilterRule {
  /** Field name from the collection schema. */
  field: string;
  /** Comparison operator (e.g. `"equals"`, `"contains"`, `"gt"`). */
  operator: WhereOperatorName;
  /** Comparison value. `undefined` when the operator is `"exists"`. */
  value: unknown;
}

/**
 * Converts an array of `FilterRule`s into a flat `WhereClause`.
 * All rules are AND'd together. When the same field appears more than once
 * the extra conditions are moved into the top-level `AND` array.
 *
 * @param rules - Active filter rules from the filter builder UI.
 * @returns A `WhereClause` ready to pass to `collection.find({ where })`.
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
 * Converts a flat `WhereClause` back into an array of `FilterRule`s.
 * Best-effort: nested `AND` conditions are unpacked; `OR` clauses are ignored.
 * Used to restore filter builder state from the URL `?where=` param.
 *
 * @param where - A `WhereClause` object, typically parsed from the URL.
 * @returns An array of `FilterRule`s suitable for rendering in the filter builder.
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
