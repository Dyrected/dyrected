/** Key used for the group whose value is null or missing. */
export const UNASSIGNED_GROUP_KEY = "__unassigned__";

const MYSQL_DATETIME = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}(\.\d+)?$/;

/**
 * Turns the raw value of a `groupBy` column into the string key used in aggregate results.
 *
 * Databases hand the same logical value back in different shapes: a boolean is `true`, `1` or
 * `'1'`; a decimal column returns `'1.0000'`; a timestamp is a `Date` or a space-separated string.
 * Normalizing by the field's declared type keeps the keys identical on every adapter, so callers
 * can look up `groups["true"]`, `groups["1"]` or an ISO date whichever database they run on.
 */
export function normalizeGroupKey(raw: unknown, fieldType?: string): string {
  if (raw === null || raw === undefined) return UNASSIGNED_GROUP_KEY;

  if (fieldType === "boolean") {
    if (raw === true || raw === 1 || raw === "1" || raw === "true" || raw === "t") return "true";
    if (raw === false || raw === 0 || raw === "0" || raw === "false" || raw === "f") return "false";
  }
  if ((fieldType === "number" || fieldType === "money") && raw !== "" && !Number.isNaN(Number(raw))) {
    return String(Number(raw));
  }
  if (fieldType === "date" || fieldType === "datetime") {
    if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? String(raw) : raw.toISOString();
    if (typeof raw === "string" && MYSQL_DATETIME.test(raw)) return `${raw.replace(" ", "T")}Z`;
  }
  return String(raw);
}
