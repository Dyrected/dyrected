/**
 * Formats a value for serializable JEXL expressions.
 * Handles paths, expressions, identifiers, strings, and primitives.
 */
export function formatJexlValue(v: string | number | boolean | null | undefined): string {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (typeof v === "string") {
    // If it's explicitly quoted, has operators, or is an expression with spaces/parens
    if (
      (v.startsWith("'") && v.endsWith("'")) ||
      (v.startsWith('"') && v.endsWith('"')) ||
      v.includes("+") ||
      v.includes("?") ||
      v.includes("(") ||
      v.includes(" ")
    ) {
      return v;
    }
    // Path literals like "/" or "/news"
    if (v.startsWith("/")) {
      return `'${v}'`;
    }
    // Reserved literals
    if (v === "null" || v === "true" || v === "false") {
      return v;
    }
    // Field identifier or dot path like "slug", "path", "author.id", "user.role"
    if (/^[a-zA-Z_$][a-zA-Z0-9_$.]*$/.test(v)) {
      return v;
    }
    return `'${v}'`;
  }
  return String(v);
}

/**
 * Multi-branch conditional builder for chaining if-else / switch-case expressions in JEXL.
 *
 * @example
 *   when.match()
 *     .case(when('slug').equals('home'), '/')
 *     .case(when.fieldNotEmpty('path'), 'path')
 *     .case(when('category').equals('news'), "'/news/' + slug")
 *     .otherwise("'/' + slug")
 */
export class MatchBuilder {
  private branches: Array<{ condition: string; value: string | number | boolean | null }> = [];

  /**
   * Adds a conditional branch (`condition ? value : ...`).
   */
  case(condition: string, value: string | number | boolean | null): this {
    this.branches.push({ condition, value });
    return this;
  }

  /**
   * Final fallback value when no cases match.
   */
  otherwise(fallback: string | number | boolean | null = "null"): string {
    if (this.branches.length === 0) return formatJexlValue(fallback);

    let expr = formatJexlValue(fallback);
    for (let i = this.branches.length - 1; i >= 0; i--) {
      const b = this.branches[i];
      expr = `${b.condition} ? ${formatJexlValue(b.value)} : ${expr}`;
    }
    return expr;
  }
}

/**
 * Fluent builder for creating single-field conditions.
 */
export class FieldConditionBuilder {
  constructor(private field: string) {}

  /**
   * Generates equality condition (`field == value`).
   */
  equals(value: string | number | boolean | null): string {
    return `${this.field} == ${JSON.stringify(value)}`;
  }

  /**
   * Generates inequality condition (`field != value`).
   */
  notEquals(value: string | number | boolean | null): string {
    return `${this.field} != ${JSON.stringify(value)}`;
  }

  /**
   * Generates set membership condition (`field in [val1, val2]`).
   */
  in(...values: (string | number | boolean | (string | number | boolean)[])[]): string {
    const flat = values.flat();
    return `${this.field} in [${flat.map((v) => JSON.stringify(v)).join(", ")}]`;
  }

  /**
   * Generates inverted set membership condition (`!(field in [val1, val2])`).
   */
  notIn(...values: (string | number | boolean | (string | number | boolean)[])[]): string {
    const flat = values.flat();
    return `!(${this.field} in [${flat.map((v) => JSON.stringify(v)).join(", ")}])`;
  }

  /**
   * Generates boolean true check (`field == true`).
   */
  isTrue(): string {
    return `${this.field} == true`;
  }

  /**
   * Generates boolean false check (`field != true`).
   */
  isFalse(): string {
    return `${this.field} != true`;
  }

  /**
   * Checks that the field is neither null/undefined nor an empty string.
   */
  notEmpty(): string {
    return `${this.field} != null && ${this.field} != ''`;
  }

  /**
   * Checks that the field is null, undefined, or an empty string.
   */
  isEmpty(): string {
    return `${this.field} == null || ${this.field} == ''`;
  }

  /**
   * Alias for `isEmpty()`.
   */
  empty(): string {
    return this.isEmpty();
  }

  /**
   * Numerical greater than (`field > num`).
   */
  greaterThan(num: number | string): string {
    return `${this.field} > ${typeof num === "number" ? num : num}`;
  }

  /**
   * Numerical greater than or equal (`field >= num`).
   */
  greaterThanOrEqual(num: number | string): string {
    return `${this.field} >= ${typeof num === "number" ? num : num}`;
  }

  /**
   * Numerical less than (`field < num`).
   */
  lessThan(num: number | string): string {
    return `${this.field} < ${typeof num === "number" ? num : num}`;
  }

  /**
   * Numerical less than or equal (`field <= num`).
   */
  lessThanOrEqual(num: number | string): string {
    return `${this.field} <= ${typeof num === "number" ? num : num}`;
  }

  /**
   * Numerical range check (`field >= min && field <= max`).
   */
  between(min: number, max: number): string {
    return `${this.field} >= ${min} && ${this.field} <= ${max}`;
  }

  /**
   * String prefix check using JEXL `startsWith(field, prefix)`.
   */
  startsWith(prefix: string): string {
    return `startsWith(${this.field}, ${JSON.stringify(prefix)})`;
  }

  /**
   * String suffix check using JEXL `endsWith(field, suffix)`.
   */
  endsWith(suffix: string): string {
    return `endsWith(${this.field}, ${JSON.stringify(suffix)})`;
  }

  /**
   * Substring or array item check using JEXL `includes(field, item)`.
   */
  contains(val: string | number): string {
    return `includes(${this.field}, ${JSON.stringify(val)})`;
  }

  /**
   * Checks if array/string length exceeds a threshold.
   */
  hasLengthGreaterThan(length: number): string {
    return `length(${this.field}) > ${length}`;
  }

  /**
   * Checks if array/string length is at least a threshold.
   */
  hasLengthAtLeast(length: number): string {
    return `length(${this.field}) >= ${length}`;
  }

  /**
   * Generates a JEXL `slugify(field)` transform expression.
   */
  slugify(): string {
    return `slugify(${this.field})`;
  }

  /**
   * Generates a JEXL `lower(field)` transform expression.
   */
  lower(): string {
    return `lower(${this.field})`;
  }

  /**
   * Generates a JEXL `upper(field)` transform expression.
   */
  upper(): string {
    return `upper(${this.field})`;
  }

  /**
   * Generates a JEXL `trim(field)` transform expression.
   */
  trim(): string {
    return `trim(${this.field})`;
  }
}

/**
 * Pre-built access control condition helpers.
 */
export interface AccessConditions {
  /**
   * Checks if current user is the document owner (matches `user.id`).
   * @default ownerField 'author'
   *
   * @example
   *   access: { update: when.access.isOwner('authorId') }
   */
  isOwner: (ownerField?: string) => string;

  /**
   * Checks if current user has the 'admin' role or 'admin' in `user.roles`.
   *
   * @example
   *   access: { delete: when.access.isAdmin() }
   */
  isAdmin: () => string;

  /**
   * Checks if current user has one of the specified roles.
   *
   * @example
   *   access: { update: when.access.hasRole('admin', 'editor') }
   */
  hasRole: (...roles: (string | string[])[]) => string;

  /**
   * Common read access policy: document is published OR user is an admin/editor.
   *
   * @example
   *   access: { read: when.access.isPublishedOrAdmin() }
   */
  isPublishedOrAdmin: (statusField?: string) => string;
}

/**
 * Condition builder utilities for serializable JEXL expressions in `admin.condition`,
 * access control rules, computed fields, and dynamic `admin.previewUrl`.
 */
/**
 * Expression builder utilities for serializable JEXL expressions in `admin.condition`,
 * access control rules, computed fields, transforms, and dynamic `admin.previewUrl`.
 */
export interface ExprFunction {
  /**
   * Starts a fluent condition/expression builder for a specific field name.
   *
   * @example
   *   admin: { condition: expr('price').greaterThan(100) }
   *   admin: { condition: expr('status').in('published', 'archived') }
   *   admin: { previewUrl: expr.ifElse(expr('slug').equals('home'), '/', expr.concat('/', 'slug')) }
   */
  (fieldName: string): FieldConditionBuilder;

  // ── Scoped Fluent Shortcuts ──
  /**
   * Starts a fluent condition builder on the `user` context (e.g. `expr.user('email').endsWith('@company.com')`).
   */
  user: (userProp: string) => FieldConditionBuilder;

  /**
   * Starts a fluent condition builder on `siblingData` (e.g. `expr.sibling('_variant').equals('split')`).
   */
  sibling: (siblingProp: string) => FieldConditionBuilder;

  // ── Access Policy Helpers ──
  /**
   * Pre-packaged role and ownership access condition builders.
   */
  access: AccessConditions;

  // ── String Concatenation & JEXL Helpers ──
  /**
   * Concatenates paths, literal strings, and field identifiers into a JEXL string concatenation expression.
   * Automatically quotes literal segments (like paths) and preserves field identifiers.
   *
   * @example
   *   expr.concat('/country-portals/', 'slug')
   *   // => "'/country-portals/' + slug"
   *
   *   expr.concat('/blog/', 'category', '/', 'slug')
   *   // => "'/blog/' + category + '/' + slug"
   */
  concat: (...parts: string[]) => string;

  /**
   * Generates a JEXL `slugify(field)` transform expression.
   */
  slugify: (field: string) => string;

  /**
   * Generates a JEXL `lower(field)` transform expression.
   */
  lower: (field: string) => string;

  /**
   * Generates a JEXL `upper(field)` transform expression.
   */
  upper: (field: string) => string;

  /**
   * Generates a JEXL `trim(field)` transform expression.
   */
  trim: (field: string) => string;

  // ── Ternary & Multi-Branch Chaining ──
  /**
   * Creates a ternary expression: `condition ? ifTrue : ifFalse`.
   * Can be nested to create ternary chains.
   *
   * @example
   *   admin: { previewUrl: expr.ifElse(expr.equals('slug', 'home'), '/', expr.concat('/', 'slug')) }
   */
  ifElse: (
    condition: string,
    ifTrue: string | number | boolean | null,
    ifFalse?: string | number | boolean | null,
  ) => string;

  /**
   * Alias for `ifElse`.
   */
  then: (
    condition: string,
    ifTrue: string | number | boolean | null,
    ifFalse?: string | number | boolean | null,
  ) => string;

  /**
   * Starts a multi-branch chained ternary builder (`case().case().otherwise()`).
   *
   * @example
   *   admin: {
   *     previewUrl: expr.match()
   *       .case(expr('slug').equals('home'), '/')
   *       .case(expr.notEmpty('path'), 'path')
   *       .case(expr('category').equals('news'), "'/news/' + slug")
   *       .otherwise("'/' + slug")
   *   }
   */
  match: () => MatchBuilder;

  /**
   * Declarative multi-case ternary builder.
   *
   * @example
   *   admin: {
   *     previewUrl: expr.cases(
   *       [expr.equals('slug', 'home'), '/'],
   *       [expr.notEmpty('path'), 'path'],
   *       "'/' + slug"
   *     )
   *   }
   */
  cases: (
    ...branches: (
      | [condition: string, value: string | number | boolean | null]
      | string
      | number
      | boolean
      | null
    )[]
  ) => string;

  // ── Logical Combinators ──
  /**
   * Combines multiple conditions with AND (`&&`).
   */
  all: (...conditions: (string | undefined | null | false)[]) => string;
  /**
   * Alias for `expr.all(...)`.
   */
  and: (...conditions: (string | undefined | null | false)[]) => string;
  /**
   * Combines multiple conditions with OR (`||`).
   */
  any: (...conditions: (string | undefined | null | false)[]) => string;
  /**
   * Alias for `expr.any(...)`.
   */
  or: (...conditions: (string | undefined | null | false)[]) => string;
  /**
   * Inverts a condition (`!(condition)`).
   */
  not: (condition: string) => string;

  // ── Blocks & Variants ──
  /**
   * Generates a condition matching one or multiple variant names.
   *
   * @example
   *   admin: { condition: expr.variant('split') }
   *   admin: { condition: expr.variant('imageLeft', 'imageRight') }
   */
  variant: (...variants: (string | string[])[]) => string;
  /**
   * Generates a condition matching everything EXCEPT the given variant names.
   */
  notVariant: (...variants: (string | string[])[]) => string;
  /**
   * Generates a condition matching one or multiple block slugs.
   *
   * @example
   *   admin: { condition: expr.block('hero', 'cta') }
   */
  block: (...blocks: (string | string[])[]) => string;
  /**
   * Generates a condition matching everything EXCEPT the given block slugs.
   */
  notBlock: (...blocks: (string | string[])[]) => string;

  // ── Field Value Matchers (Clean & Concise) ──
  /**
   * Generates a condition checking equality against a field value.
   *
   * @example
   *   admin: { condition: expr.equals('status', 'published') }
   */
  equals: (field: string, value: string | number | boolean | null) => string;
  /**
   * Generates a condition checking inequality against a field value.
   */
  notEquals: (field: string, value: string | number | boolean | null) => string;
  /**
   * Generates a condition checking if a field is in a list of allowed values.
   */
  in: (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]) => string;
  /**
   * Generates a condition checking if a field is NOT in a list of values.
   */
  notIn: (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]) => string;
  /**
   * Generates a condition checking that a field is not null and not empty.
   *
   * @example
   *   admin: { condition: expr.notEmpty('couponCode') }
   */
  notEmpty: (field: string) => string;
  /**
   * Generates a condition checking that a field is null, undefined, or empty.
   *
   * @example
   *   admin: { condition: expr.empty('couponCode') }
   */
  empty: (field: string) => string;
  /**
   * Generates a condition checking that a boolean field is true.
   */
  isTrue: (field: string) => string;
  /**
   * Generates a condition checking that a boolean field is false / falsy.
   */
  isFalse: (field: string) => string;
  /**
   * Generates a numerical greater-than condition (`field > value`).
   */
  greaterThan: (field: string, value: number | string) => string;
  /**
   * Generates a numerical greater-than-or-equal condition (`field >= value`).
   */
  greaterThanOrEqual: (field: string, value: number | string) => string;
  /**
   * Generates a numerical less-than condition (`field < value`).
   */
  lessThan: (field: string, value: number | string) => string;
  /**
   * Generates a numerical less-than-or-equal condition (`field <= value`).
   */
  lessThanOrEqual: (field: string, value: number | string) => string;
  /**
   * Generates a range condition (`field >= min && field <= max`).
   */
  between: (field: string, min: number, max: number) => string;
  /**
   * Generates a string prefix condition using JEXL `startsWith(...)`.
   */
  startsWith: (field: string, prefix: string) => string;
  /**
   * Generates a string suffix condition using JEXL `endsWith(...)`.
   */
  endsWith: (field: string, suffix: string) => string;
  /**
   * Generates a string/array inclusion condition using JEXL `includes(...)`.
   */
  contains: (field: string, item: string | number) => string;

  // ── Legacy Field Value Matchers (with "field" prefix) ──
  fieldEquals: (field: string, value: string | number | boolean | null) => string;
  fieldNotEquals: (field: string, value: string | number | boolean | null) => string;
  fieldIn: (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]) => string;
  fieldNotIn: (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]) => string;
  fieldNotEmpty: (field: string) => string;
  fieldEmpty: (field: string) => string;
  fieldIsTrue: (field: string) => string;
  fieldIsFalse: (field: string) => string;
  fieldGreaterThan: (field: string, value: number | string) => string;
  fieldGreaterThanOrEqual: (field: string, value: number | string) => string;
  fieldLessThan: (field: string, value: number | string) => string;
  fieldLessThanOrEqual: (field: string, value: number | string) => string;
  fieldBetween: (field: string, min: number, max: number) => string;
  fieldStartsWith: (field: string, prefix: string) => string;
  fieldEndsWith: (field: string, suffix: string) => string;
  fieldContains: (field: string, item: string | number) => string;

  // ── Arrays & Lists ──
  /**
   * Generates a condition checking that an array is non-empty (`length(field) > 0`).
   */
  arrayNotEmpty: (field: string) => string;
  /**
   * Generates a condition checking that an array is empty (`length(field) == 0`).
   */
  arrayEmpty: (field: string) => string;
  /**
   * Generates a condition checking that an array has more than N items.
   */
  arrayCountGreaterThan: (field: string, count: number) => string;
  /**
   * Generates a condition checking that an array has at least N items.
   */
  arrayCountAtLeast: (field: string, count: number) => string;
  /**
   * Generates a condition checking that an array has less than N items.
   */
  arrayCountLessThan: (field: string, count: number) => string;

  // ── User, Roles & Permissions ──
  /**
   * Generates a condition checking the authenticated editor's role.
   * Checks both `user.role` (string) and `user.roles` (array).
   *
   * @example
   *   admin: { condition: expr.userRole('admin', 'developer') }
   */
  userRole: (...roles: (string | string[])[]) => string;
  /**
   * Generates a condition checking the editor's email domain.
   *
   * @example
   *   admin: { condition: expr.userEmailDomain('agrictrail.com') }
   */
  userEmailDomain: (domain: string) => string;
  /**
   * Generates a condition checking a custom attribute on the user object.
   */
  userAttributeEquals: (attr: string, value: string | number | boolean | null) => string;

  // ── Document Lifecycle & Workflow ──
  /**
   * Condition that evaluates to true only for unsaved, newly-created documents.
   */
  isNewDocument: () => string;
  /**
   * Condition that evaluates to true only for persisted, existing documents.
   */
  isExistingDocument: () => string;
  /**
   * Generates a condition checking the document's workflow status.
   */
  statusEquals: (status: string) => string;
  /**
   * Generates a condition checking if status is within a set of statuses.
   */
  statusIn: (...statuses: (string | string[])[]) => string;
}

/**
 * Backwards compatibility type alias for `ExprFunction`.
 */
export type WhenFunction = ExprFunction;

function createExpr(): ExprFunction {
  const exprFn = ((fieldName: string) => new FieldConditionBuilder(fieldName)) as ExprFunction;

  exprFn.user = (userProp: string) => new FieldConditionBuilder(`user.${userProp}`);
  exprFn.sibling = (siblingProp: string) => new FieldConditionBuilder(`siblingData.${siblingProp}`);

  exprFn.concat = (...parts: string[]): string => {
    if (parts.length === 0) return "''";
    return parts.map((p) => formatJexlValue(p)).join(" + ");
  };

  exprFn.slugify = (field: string): string => `slugify(${field})`;
  exprFn.lower = (field: string): string => `lower(${field})`;
  exprFn.upper = (field: string): string => `upper(${field})`;
  exprFn.trim = (field: string): string => `trim(${field})`;

  exprFn.access = {
    isOwner: (ownerField = "author"): string => {
      return `${ownerField} == user.id || ${ownerField}.id == user.id`;
    },
    isAdmin: (): string => {
      return "user.role == 'admin' || (user.roles != null && 'admin' in user.roles)";
    },
    hasRole: (...roles: (string | string[])[]): string => {
      return exprFn.userRole(...roles);
    },
    isPublishedOrAdmin: (statusField = "status"): string => {
      return `${statusField} == 'published' || user.role == 'admin' || (user.roles != null && 'admin' in user.roles)`;
    },
  };

  exprFn.ifElse = (
    condition: string,
    ifTrue: string | number | boolean | null,
    ifFalse: string | number | boolean | null = "null",
  ): string => {
    return `${condition} ? ${formatJexlValue(ifTrue)} : ${formatJexlValue(ifFalse)}`;
  };

  exprFn.then = exprFn.ifElse;

  exprFn.match = () => new MatchBuilder();

  exprFn.cases = (
    ...branches: (
      | [condition: string, value: string | number | boolean | null]
      | string
      | number
      | boolean
      | null
    )[]
  ): string => {
    const builder = new MatchBuilder();
    let fallback: string | number | boolean | null = "null";

    for (const b of branches) {
      if (Array.isArray(b)) {
        builder.case(b[0], b[1]);
      } else {
        fallback = b;
      }
    }

    return builder.otherwise(fallback);
  };

  exprFn.all = (...conditions: (string | undefined | null | false)[]): string => {
    const valid = conditions.filter(Boolean) as string[];
    if (valid.length === 0) return "true";
    if (valid.length === 1) return valid[0];
    return valid.map((c) => (c.includes(" ") ? `(${c})` : c)).join(" && ");
  };

  exprFn.and = exprFn.all;

  exprFn.any = (...conditions: (string | undefined | null | false)[]): string => {
    const valid = conditions.filter(Boolean) as string[];
    if (valid.length === 0) return "true";
    if (valid.length === 1) return valid[0];
    return valid.map((c) => (c.includes(" ") ? `(${c})` : c)).join(" || ");
  };

  exprFn.or = exprFn.any;

  exprFn.not = (condition: string): string => {
    if (!condition) return "false";
    return `!(${condition})`;
  };

  exprFn.variant = (...variants: (string | string[])[]): string => {
    const flat = variants.flat();
    if (flat.length === 0) return "true";
    if (flat.length === 1) return `variant == '${flat[0]}'`;
    return `variant in [${flat.map((v) => `'${v}'`).join(", ")}]`;
  };

  exprFn.notVariant = (...variants: (string | string[])[]): string => {
    const flat = variants.flat();
    if (flat.length === 0) return "false";
    if (flat.length === 1) return `variant != '${flat[0]}'`;
    return `!(variant in [${flat.map((v) => `'${v}'`).join(", ")}])`;
  };

  exprFn.block = (...blocks: (string | string[])[]): string => {
    const flat = blocks.flat();
    if (flat.length === 0) return "true";
    if (flat.length === 1) return `block == '${flat[0]}'`;
    return `block in [${flat.map((b) => `'${b}'`).join(", ")}]`;
  };

  exprFn.notBlock = (...blocks: (string | string[])[]): string => {
    const flat = blocks.flat();
    if (flat.length === 0) return "false";
    if (flat.length === 1) return `block != '${flat[0]}'`;
    return `!(block in [${flat.map((b) => `'${b}'`).join(", ")}])`;
  };

  // ── Field Value Matchers ──
  exprFn.equals = (field: string, value: string | number | boolean | null): string => {
    return `${field} == ${JSON.stringify(value)}`;
  };
  exprFn.fieldEquals = exprFn.equals;

  exprFn.notEquals = (field: string, value: string | number | boolean | null): string => {
    return `${field} != ${JSON.stringify(value)}`;
  };
  exprFn.fieldNotEquals = exprFn.notEquals;

  exprFn.in = (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]): string => {
    const flat = values.flat();
    return `${field} in [${flat.map((v) => JSON.stringify(v)).join(", ")}]`;
  };
  exprFn.fieldIn = exprFn.in;

  exprFn.notIn = (field: string, ...values: (string | number | boolean | (string | number | boolean)[])[]): string => {
    const flat = values.flat();
    return `!(${field} in [${flat.map((v) => JSON.stringify(v)).join(", ")}])`;
  };
  exprFn.fieldNotIn = exprFn.notIn;

  exprFn.notEmpty = (field: string): string => {
    return `${field} != null && ${field} != ''`;
  };
  exprFn.fieldNotEmpty = exprFn.notEmpty;

  exprFn.empty = (field: string): string => {
    return `${field} == null || ${field} == ''`;
  };
  exprFn.fieldEmpty = exprFn.empty;

  exprFn.isTrue = (field: string): string => {
    return `${field} == true`;
  };
  exprFn.fieldIsTrue = exprFn.isTrue;

  exprFn.isFalse = (field: string): string => {
    return `${field} != true`;
  };
  exprFn.fieldIsFalse = exprFn.isFalse;

  exprFn.greaterThan = (field: string, value: number | string): string => {
    return `${field} > ${value}`;
  };
  exprFn.fieldGreaterThan = exprFn.greaterThan;

  exprFn.greaterThanOrEqual = (field: string, value: number | string): string => {
    return `${field} >= ${value}`;
  };
  exprFn.fieldGreaterThanOrEqual = exprFn.greaterThanOrEqual;

  exprFn.lessThan = (field: string, value: number | string): string => {
    return `${field} < ${value}`;
  };
  exprFn.fieldLessThan = exprFn.lessThan;

  exprFn.lessThanOrEqual = (field: string, value: number | string): string => {
    return `${field} <= ${value}`;
  };
  exprFn.fieldLessThanOrEqual = exprFn.lessThanOrEqual;

  exprFn.between = (field: string, min: number, max: number): string => {
    return `${field} >= ${min} && ${field} <= ${max}`;
  };
  exprFn.fieldBetween = exprFn.between;

  exprFn.startsWith = (field: string, prefix: string): string => {
    return `startsWith(${field}, ${JSON.stringify(prefix)})`;
  };
  exprFn.fieldStartsWith = exprFn.startsWith;

  exprFn.endsWith = (field: string, suffix: string): string => {
    return `endsWith(${field}, ${JSON.stringify(suffix)})`;
  };
  exprFn.fieldEndsWith = exprFn.endsWith;

  exprFn.contains = (field: string, item: string | number): string => {
    return `includes(${field}, ${JSON.stringify(item)})`;
  };
  exprFn.fieldContains = exprFn.contains;

  // ── Arrays & Lists ──
  exprFn.arrayNotEmpty = (field: string): string => {
    return `length(${field}) > 0`;
  };

  exprFn.arrayEmpty = (field: string): string => {
    return `length(${field}) == 0`;
  };

  exprFn.arrayCountGreaterThan = (field: string, count: number): string => {
    return `length(${field}) > ${count}`;
  };

  exprFn.arrayCountAtLeast = (field: string, count: number): string => {
    return `length(${field}) >= ${count}`;
  };

  exprFn.arrayCountLessThan = (field: string, count: number): string => {
    return `length(${field}) < ${count}`;
  };

  // ── User, Roles & Permissions ──
  exprFn.userRole = (...roles: (string | string[])[]): string => {
    const flat = roles.flat();
    if (flat.length === 1) {
      return `user.role == '${flat[0]}' || (user.roles != null && '${flat[0]}' in user.roles)`;
    }
    const roleArray = `[${flat.map((r) => `'${r}'`).join(", ")}]`;
    return `user.role in ${roleArray} || (user.roles != null && includes(${roleArray}, user.role))`;
  };

  exprFn.userEmailDomain = (domain: string): string => {
    const clean = domain.startsWith("@") ? domain : `@${domain}`;
    return `endsWith(user.email, '${clean}')`;
  };

  exprFn.userAttributeEquals = (attr: string, value: string | number | boolean | null): string => {
    return `user.${attr} == ${JSON.stringify(value)}`;
  };

  // ── Document Lifecycle & Workflow ──
  exprFn.isNewDocument = (): string => {
    return "id == null";
  };

  exprFn.isExistingDocument = (): string => {
    return "id != null";
  };

  exprFn.statusEquals = (status: string): string => {
    return `status == '${status}'`;
  };

  exprFn.statusIn = (...statuses: (string | string[])[]): string => {
    const flat = statuses.flat();
    return `status in [${flat.map((s) => `'${s}'`).join(", ")}]`;
  };

  return exprFn;
}

/**
 * Primary declarative expression builder for Dyrected schemas.
 */
export const expr: ExprFunction = createExpr();

/**
 * Backwards compatibility alias for `expr`.
 */
export const when: ExprFunction = expr;

