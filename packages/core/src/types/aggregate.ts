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
 * A single named aggregate request — either a count or a numeric operation.
 */
export type AggregateOperation = CountOperation | NumericOperation;

/**
 * The map of named aggregate operations sent in a single aggregate request.
 *
 * @example
 * ```ts
 * {
 *   totalSubmitted: { count: "*" },
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
}

/**
 * The result returned by `DatabaseAdapter.aggregate`.
 *
 * Every named key maps to a `number | null`.
 * `null` is returned when no documents matched the aggregate's `where`
 * (applicable to `sum`, `avg`, `min`, `max`).
 * `count` also returns `null` only if the database errors — it normally
 * returns `0` for an empty match set.
 */
export type AggregateResult = Record<string, number | null>;

/**
 * Derives the typed result shape from an `AggregateInput`.
 * Every named key maps to `number | null`.
 *
 * @example
 * ```ts
 * type Input = { totalSubmitted: CountOperation; totalYards: NumericOperation };
 * type Result = InferAggregateResult<Input>;
 * // => { totalSubmitted: number | null; totalYards: number | null }
 * ```
 */
export type InferAggregateResult<T extends AggregateInput> = {
  [K in keyof T]: number | null;
};
