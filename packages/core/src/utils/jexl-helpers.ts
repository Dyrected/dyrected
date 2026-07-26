import jexl from "jexl";

// ── String Utilities ────────────────────────────────────────────────────────
function slugify(val: unknown): string {
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

function lower(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).toLowerCase();
}

function upper(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).toUpperCase();
}

function trim(val: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).trim();
}

function capitalize(val: unknown): string {
  if (val === undefined || val === null) return "";
  const str = String(val).trim();
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

function truncate(val: unknown, length: unknown, ellipsis = "..."): string {
  if (val === undefined || val === null) return "";
  const str = String(val);
  const maxLen = typeof length === "number" && length > 0 ? length : 100;
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen).trim() + String(ellipsis ?? "...");
}

function readingTime(val: unknown, wpm = 200): number {
  if (val === undefined || val === null) return 1;
  const str = String(val).trim();
  if (!str) return 1;
  const words = str.split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / (typeof wpm === "number" && wpm > 0 ? wpm : 200)));
}

function wordCount(val: unknown): number {
  if (val === undefined || val === null) return 0;
  const str = String(val).trim();
  if (!str) return 0;
  return str.split(/\s+/).filter(Boolean).length;
}

function replace(val: unknown, search: unknown, replacement: unknown): string {
  if (val === undefined || val === null) return "";
  return String(val).replace(new RegExp(String(search || ""), "g"), String(replacement ?? ""));
}

function startsWith(str: unknown, prefix: unknown): boolean {
  if (str === undefined || str === null) return false;
  return String(str).startsWith(String(prefix ?? ""));
}

function endsWith(str: unknown, suffix: unknown): boolean {
  if (str === undefined || str === null) return false;
  return String(str).endsWith(String(suffix ?? ""));
}

// ── Date & Time Utilities ───────────────────────────────────────────────────
function now(): string {
  return new Date().toISOString();
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(val: unknown, style: unknown = "short"): string {
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

function addDays(val: unknown, days: unknown): string {
  const d = val ? new Date(val as string | number | Date) : new Date();
  if (Number.isNaN(d.getTime())) return "";
  const daysNum = typeof days === "number" ? days : Number(days) || 0;
  d.setDate(d.getDate() + daysNum);
  return d.toISOString();
}

function diffDays(dateA: unknown, dateB: unknown): number {
  const dA = dateA ? new Date(dateA as string | number | Date) : new Date();
  const dB = dateB ? new Date(dateB as string | number | Date) : new Date();
  if (Number.isNaN(dA.getTime()) || Number.isNaN(dB.getTime())) return 0;
  const diffMs = Math.abs(dA.getTime() - dB.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function isPast(val: unknown): boolean {
  if (!val) return false;
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}

function isFuture(val: unknown): boolean {
  if (!val) return false;
  const d = new Date(val as string | number | Date);
  if (Number.isNaN(d.getTime())) return false;
  return d.getTime() > Date.now();
}

// ── Array & List Utilities ─────────────────────────────────────────────────
function includes(arrOrStr: unknown, item: unknown): boolean {
  if (Array.isArray(arrOrStr)) {
    return arrOrStr.includes(item);
  }
  if (typeof arrOrStr === "string") {
    return arrOrStr.includes(String(item ?? ""));
  }
  return false;
}

function join(arr: unknown, separator = ", "): string {
  if (!Array.isArray(arr)) return "";
  return arr.filter((item) => item !== undefined && item !== null).join(String(separator));
}

function first(arr: unknown): unknown {
  if (Array.isArray(arr)) return arr[0] ?? null;
  return null;
}

function last(arr: unknown): unknown {
  if (Array.isArray(arr)) return arr[arr.length - 1] ?? null;
  return null;
}

function compact(arr: unknown): unknown[] {
  if (!Array.isArray(arr)) return [];
  return arr.filter((item) => item !== undefined && item !== null && item !== "");
}

function unique(arr: unknown): unknown[] {
  if (!Array.isArray(arr)) return [];
  return Array.from(new Set(arr));
}

function length(val: unknown): number {
  if (Array.isArray(val) || typeof val === "string") return val.length;
  if (val && typeof val === "object") return Object.keys(val).length;
  return 0;
}

// ── Math & Number Utilities ─────────────────────────────────────────────────
function round(val: unknown, decimals = 0): number {
  const num = Number(val);
  if (Number.isNaN(num)) return 0;
  const dec = typeof decimals === "number" ? decimals : Number(decimals) || 0;
  const factor = Math.pow(10, dec);
  return Math.round(num * factor) / factor;
}

function clamp(val: unknown, minVal: unknown, maxVal: unknown): number {
  const num = Number(val) || 0;
  const min = Number(minVal) || 0;
  const max = Number(maxVal) || 0;
  return Math.min(Math.max(num, min), max);
}

// ── Logical & Object Utilities ──────────────────────────────────────────────
function defaultValue(val: unknown, fallback: unknown): unknown {
  if (val === undefined || val === null || val === "") return fallback;
  return val;
}

function coalesce(...args: unknown[]): unknown {
  for (const arg of args) {
    if (arg !== undefined && arg !== null && arg !== "") return arg;
  }
  return null;
}

function isEmpty(val: unknown): boolean {
  if (val === undefined || val === null || val === "") return true;
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") return Object.keys(val).length === 0;
  return false;
}

function get(obj: unknown, path: unknown, fallback: unknown = null): unknown {
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
