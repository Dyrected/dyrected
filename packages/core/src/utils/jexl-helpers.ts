import jexl from "jexl";

// ── String Utilities ────────────────────────────────────────────────────────

/**
 * Transforms a string into a clean, URL-safe slug.
 * Strips accents, lowercases, removes non-alphanumeric characters, and hyphens whitespace.
 *
 * @example `slugify("Hello World!")` => `"hello-world"`
 */
export function slugify(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Converts a string value to lowercase.
 *
 * @example `lower("Dyrected")` => `"dyrected"`
 */
export function lower(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).toLowerCase();
}

/**
 * Converts a string value to uppercase.
 *
 * @example `upper("dyrected")` => `"DYRECTED"`
 */
export function upper(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).toUpperCase();
}

/**
 * Trims leading and trailing whitespace from a string.
 *
 * @example `trim("  hello  ")` => `"hello"`
 */
export function trim(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

/**
 * Capitalizes the first letter of a string and lowercases the rest.
 *
 * @example `capitalize("hELLO")` => `"Hello"`
 */
export function capitalize(val: unknown): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Truncates a string to a maximum length and appends an ellipsis.
 *
 * @example `truncate("Long article text...", 10)` => `"Long artic..."`
 */
export function truncate(val: unknown, length: unknown, ellipsis = "..."): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  const maxLen = typeof length === "number" && length > 0 ? length : 100;
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + String(ellipsis ?? "...");
}

/**
 * Calculates estimated reading time in minutes based on word count.
 *
 * @example `readingTime(articleText)` => `3`
 */
export function readingTime(val: unknown, wpm = 200): number {
  if (val === undefined || val === null) return 1;
  const str = String(val).trim();
  if (!str) return 1;
  const words = str.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / (typeof wpm === "number" && wpm > 0 ? wpm : 200)));
}

/**
 * Returns the word count of a text string.
 *
 * @example `wordCount("Quick brown fox")` => `3`
 */
export function wordCount(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  return str.split(/\s+/).filter(Boolean).length;
}

/**
 * Replaces occurrences of a substring or pattern with a replacement string.
 *
 * @example `replace("hello world", "world", "there")` => `"hello there"`
 */
export function replace(val: unknown, search: unknown, replacement: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(new RegExp(String(search || ""), "g"), String(replacement ?? ""));
}

/**
 * Checks if a string starts with a given prefix.
 *
 * @example `startsWith("dyrected.com", "dyrected")` => `true`
 */
export function startsWith(str: unknown, prefix: unknown): boolean {
  if (str === undefined || str === null) return false;
  return String(str).startsWith(String(prefix ?? ""));
}

/**
 * Checks if a string ends with a given suffix.
 *
 * @example `endsWith("image.png", ".png")` => `true`
 */
export function endsWith(str: unknown, suffix: unknown): boolean {
  if (str === undefined || str === null) return false;
  return String(str).endsWith(String(suffix ?? ""));
}

// ── Date & Time Utilities ───────────────────────────────────────────────────

/**
 * Returns the current date and time as an ISO 8601 string.
 *
 * @example `now()` => `"2026-07-27T00:00:00.000Z"`
 */
export function now(): string {
  return new Date().toISOString();
}

/**
 * Returns the current date as a YYYY-MM-DD string.
 *
 * @example `today()` => `"2026-07-27"`
 */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Formats a date string, number, or Date instance into a formatted string.
 *
 * @param style `'short'` (default), `'iso'`, `'date'`, `'datetime'`, or `'full'`
 * @example `formatDate("2026-07-27T12:00:00Z", "short")` => `"Jul 27, 2026"`
 */
export function formatDate(val: unknown, style: unknown = "short"): string {
  if (!val) return "";
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return "";

  const styleStr = String(style).toLowerCase();
  if (styleStr === "iso" || styleStr === "date") return d.toISOString().slice(0, 10);
  if (styleStr === "datetime" || styleStr === "full") return d.toISOString();

  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Adds or subtracts a specified number of days to a date.
 *
 * @example `addDays(now(), 7)` => `"2026-08-03T00:00:00.000Z"`
 */
export function addDays(val: unknown, days: unknown): string {
  const d = val ? new Date(val as string | number | Date) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const daysNum = typeof days === "number" ? days : Number(days) || 0;
  d.setDate(d.getDate() + daysNum);
  return d.toISOString();
}

/**
 * Calculates the integer difference in days between two dates.
 *
 * @example `diffDays("2026-07-27", "2026-07-20")` => `7`
 */
export function diffDays(dateA: unknown, dateB: unknown): number {
  const dA = dateA ? new Date(dateA as string | number | Date) : new Date();
  const dB = dateB ? new Date(dateB as string | number | Date) : new Date();
  if (Number.isNaN(dA.getTime()) || Number.isNaN(dB.getTime())) return 0;
  const diffMs = Math.abs(dA.getTime() - dB.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Checks if a date is in the past relative to the current timestamp.
 *
 * @example `isPast("2020-01-01")` => `true`
 */
export function isPast(val: unknown): boolean {
  if (!val) return false;
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

/**
 * Checks if a date is in the future relative to the current timestamp.
 *
 * @example `isFuture("2030-01-01")` => `true`
 */
export function isFuture(val: unknown): boolean {
  if (!val) return false;
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

// ── Array & List Utilities ─────────────────────────────────────────────────

/**
 * Checks if an item exists within an array or if a substring exists within a string.
 *
 * @example `includes(["admin", "editor"], "admin")` => `true`
 */
export function includes(arrOrStr: unknown, item: unknown): boolean {
  if (Array.isArray(arrOrStr)) {
    return arrOrStr.includes(item);
  }
  if (typeof arrOrStr === "string") {
    return arrOrStr.includes(String(item ?? ""));
  }
  return false;
}

/**
 * Joins array elements into a string separated by a delimiter.
 *
 * @example `join(["Apple", "Banana"], ", ")` => `"Apple, Banana"`
 */
export function join(arr: unknown, separator = ", "): string {
  if (!Array.isArray(arr)) return "";
  return arr.filter((item) => item !== undefined && item !== null).join(String(separator));
}

/**
 * Returns the first item in an array.
 *
 * @example `first(["a", "b", "c"])` => `"a"`
 */
export function first(arr: unknown): unknown {
  if (Array.isArray(arr)) return arr[0] ?? null;
  return null;
}

/**
 * Returns the last item in an array.
 *
 * @example `last(["a", "b", "c"])` => `"c"`
 */
export function last(arr: unknown): unknown {
  if (Array.isArray(arr)) return arr[arr.length - 1] ?? null;
  return null;
}

/**
 * Removes null, undefined, and empty string elements from an array.
 *
 * @example `compact(["a", null, "b", ""])` => `["a", "b"]`
 */
export function compact(arr: unknown): unknown[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => item !== undefined && item !== null && item !== "");
}

/**
 * Removes duplicate items from an array.
 *
 * @example `unique(["a", "b", "a"])` => `["a", "b"]`
 */
export function unique(arr: unknown): unknown[] {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr));
}

/**
 * Returns the length of an array, string, or object.
 *
 * @example `length("hello")` => `5`
 */
export function length(val: unknown): number {
  if (Array.isArray(val) || typeof val === "string") return val.length;
  if (val && typeof val === "object") return Object.keys(val).length;
  return 0;
}

// ── Math & Number Utilities ─────────────────────────────────────────────────

/**
 * Rounds a number to a specified number of decimal places.
 *
 * @example `round(3.14159, 2)` => `3.14`
 */
export function round(val: unknown, decimals = 0): number {
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  const dec = typeof decimals === "number" ? decimals : Number(decimals) || 0;
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}

/**
 * Clamps a number between a minimum and maximum threshold.
 *
 * @example `clamp(150, 0, 100)` => `100`
 */
export function clamp(val: unknown, minVal: unknown, maxVal: unknown): number {
  const num = Number(val) || 0;
  const min = Number(minVal) || 0;
  const max = Number(maxVal) || 0;
  return Math.min(Math.max(num, min), max);
}

// ── Logical & Object Utilities ──────────────────────────────────────────────

/**
 * Returns a fallback value if the target value is undefined, null, or an empty string.
 *
 * @example `default(siblingData.title, "Untitled")` => `"Untitled"`
 */
export function defaultValue(val: unknown, fallback: unknown): unknown {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

/**
 * Returns the first non-empty value among the arguments provided.
 *
 * @example `coalesce(null, "", "Fallback")` => `"Fallback"`
 */
export function coalesce(...args: unknown[]): unknown {
  for (const arg of args) {
    if (arg !== undefined && arg !== null && arg !== "") return arg;
  }
  return null;
}

/**
 * Checks if a value is empty (undefined, null, empty string, empty array, or empty object).
 *
 * @example `isEmpty([])` => `true`
 */
export function isEmpty(val: unknown): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

/**
 * Safely accesses a nested object property by a dot-separated key path.
 *
 * @example `get(siblingData, "author.name", "Guest")` => `"John"`
 */
export function get(obj: unknown, path: unknown, fallback: unknown = null): unknown {
  if (!obj || typeof obj !== "object") return fallback;
  const pathStr = String(path || "").trim();
  if (!pathStr) return fallback;

  const parts = pathStr.split(".");
  let curr: any = obj;
  for (const part of parts) {
    if (curr === undefined || curr === null) return fallback;
    curr = curr[part];
  }
  return curr === undefined || curr === null ? fallback : curr;
}

// ── Helper Registry ──────────────────────────────────────────────────────────

/**
 * Registers all Dyrected built-in helper functions onto a Jexl evaluation instance.
 */
export function registerJexlHelpers(jexlInstance: typeof jexl = jexl) {
  const helpers: Record<string, (...args: any[]) => any> = {
    // Strings
    slugify,
    lower,
    upper,
    trim,
    capitalize,
    truncate,
    readingTime,
    wordCount,
    replace,
    startsWith,
    endsWith,
    // Dates
    now,
    today,
    formatDate,
    addDays,
    diffDays,
    isPast,
    isFuture,
    // Arrays
    includes,
    join,
    first,
    last,
    compact,
    unique,
    length,
    // Math
    round,
    clamp,
    // Objects & Logical
    default: defaultValue,
    coalesce,
    isEmpty,
    get,
  };

  for (const [name, fn] of Object.entries(helpers)) {
    try {
      jexlInstance.addFunction(name, fn);
    } catch {
      // Ignore if already registered
    }
  }
}

// Register automatically on core import
registerJexlHelpers(jexl);

/** List of all built-in Jexl helper function names for AST validation. */
export const BUILTIN_JEXL_HELPERS = [
  // Strings
  "slugify",
  "lower",
  "upper",
  "trim",
  "capitalize",
  "truncate",
  "readingTime",
  "wordCount",
  "replace",
  "startsWith",
  "endsWith",
  // Dates
  "now",
  "today",
  "formatDate",
  "addDays",
  "diffDays",
  "isPast",
  "isFuture",
  // Arrays
  "includes",
  "join",
  "first",
  "last",
  "compact",
  "unique",
  "length",
  // Math
  "round",
  "clamp",
  // Objects & Logical
  "default",
  "coalesce",
  "isEmpty",
  "get",
] as const;
