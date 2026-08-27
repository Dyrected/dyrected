/**
 * The set of type-cast operations supported during aggregation.
 *
 * Each adapter maps these to its own native conversion primitive
 * (e.g. `$toDouble` in MongoDB, `CAST(x AS REAL)` in SQLite).
 * The public API is always database-independent.
 */
export type AggregateCastType =
  | "number"
  | "integer"
  | "float"
  | "string"
  | "boolean"
  | "date";

/**
 * A `count` aggregate operation.
 *
 * - `count: "*"` — count every document matched by `where`.
 * - `cast` is intentionally absent: counting is document-level,
 *   not field-value-level, so type conversion has no meaning here.
 */
export interface CountOperation {
  count: "*";
  where?: Record<string, unknown>;
}

/**
 * A `countDistinct` aggregate operation that counts the number of unique
 * non-null values for a specific field.
 */
export interface DistinctCountOperation {
  countDistinct: string;
  where?: Record<string, unknown>;
}

/**
 * A `distinct` aggregate operation that retrieves the unique values
 * (or unique values with item counts) for a specific field.
 */
export interface DistinctValuesOperation {
  distinct: string;
  where?: Record<string, unknown>;
}

/**
 * A `sum`, `avg`, `min`, or `max` aggregate operation on a named field.
 *
 * - `cast` converts stored values before the aggregation runs.
 *   Invalid values (e.g. `"unknown"` cast to `number`) become `null`
 *   and are ignored by `sum`, `avg`, `min`, and `max`.
 */
export interface NumericOperation {
  sum?: string;
  avg?: string;
  min?: string;
  max?: string;
  cast?: AggregateCastType;
  where?: Record<string, unknown>;
}

/**
 * A single named aggregate request — either a count, distinct count, distinct values, or numeric operation.
 */
export type AggregateOperation =
  | CountOperation
  | DistinctCountOperation
  | DistinctValuesOperation
  | NumericOperation;

/**
 * The map of named aggregate operations sent in a single aggregate request.
 *
 * @example
 * ```ts
 * {
 *   totalSubmitted: { count: "*" },
 *   uniqueGuests: { countDistinct: "email" },
 *   availableSizes: { distinct: "asoebiSize" },
 *   totalAsoebiYards: { sum: "asoebiYards", cast: "number", where: { wantsAsoebi: { equals: true } } },
 * }
 * ```
 */
export type AggregateInput = Record<string, AggregateOperation>;

/**
 * The arguments passed to `DatabaseAdapter.aggregate`.
 */
export interface AggregateArgs {
  /** Collection slug. */
  collection: string;
  /** Named aggregate operations to compute. */
  aggregates: AggregateInput;
  /** Optional field to group the aggregates by. */
  groupBy?: string;
}

/**
 * The result returned by `DatabaseAdapter.aggregate`.
 *
 * For scalar aggregates, every named key maps to a `number | null` or `any[]` (for distinct).
 * When `groupBy` is used, returns a breakdown per group.
 */
export type AggregateResult = Record<string, any>;

/**
 * Derives the typed result shape from an `AggregateInput`.
 */
export type InferAggregateResult<T extends AggregateInput> = {
  [K in keyof T]: any;
};
