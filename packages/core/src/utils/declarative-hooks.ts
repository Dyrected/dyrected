import jexl from "jexl";
import type { Block, CollectionConfig, Field, GlobalConfig } from "../types/index.js";

export type DeclarativeHookSurface =
  | "collection.beforeRead"
  | "collection.afterRead"
  | "collection.beforeChange"
  | "global.beforeRead"
  | "global.afterRead"
  | "global.beforeChange"
  | "field.beforeChange"
  | "field.admin.onChange";

export interface DeclarativeHookValidationIssue {
  path: string;
  surface: DeclarativeHookSurface | "unsupported";
  expression: string;
  message: string;
}

export type DeclarativeAccessSurface =
  | "config.accessPolicy"
  | "collection.access"
  | "global.access"
  | "field.access";

export interface DeclarativeAccessValidationIssue {
  path: string;
  surface: DeclarativeAccessSurface;
  expression: string;
  message: string;
}

export type DeclarativeAdminSurface = "field.admin.condition";
export type DeclarativePreviewSurface = "collection.admin.previewUrl";

export interface DeclarativeAdminValidationIssue {
  path: string;
  surface: DeclarativeAdminSurface;
  expression: string;
  message: string;
}

export interface DeclarativePreviewValidationIssue {
  path: string;
  surface: DeclarativePreviewSurface;
  expression: string;
  message: string;
}

export interface ConfigDiagnostic {
  severity: "error" | "warning";
  source: "declarativeHook" | "declarativeAccess" | "adminCondition" | "previewUrl";
  path: string;
  surface: string;
  message: string;
  expression: string;
}

type DiagnosticFormatOptions = {
  color?: boolean;
};

type DeclarativeValidationConfig = {
  blocks?: Array<Pick<Block, "fields"> & Partial<Pick<Block, "slug">>>;
  collections: Array<
    Pick<CollectionConfig, "fields" | "hooks" | "access" | "admin"> & Partial<Pick<CollectionConfig, "slug">>
  >;
  globals?: Array<
    Pick<GlobalConfig, "fields" | "hooks" | "access"> & Partial<Pick<GlobalConfig, "slug">>
  >;
  accessPolicies?: Record<string, unknown>;
};

const SURFACE_ROOTS: Record<DeclarativeHookSurface, readonly string[]> = {
  "collection.beforeRead": ["req", "user", "query"],
  "collection.afterRead": ["req", "user", "doc"],
  "collection.beforeChange": ["req", "user", "data", "doc", "operation"],
  "global.beforeRead": ["req", "user", "query"],
  "global.afterRead": ["req", "user", "doc"],
  "global.beforeChange": ["req", "user", "data", "doc", "operation"],
  "field.beforeChange": ["value", "data", "originalDoc", "user"],
  "field.admin.onChange": ["value", "siblingData", "data"],
};

const ACCESS_ROOTS = ["user", "req", "doc", "data", "id", "config"] as const;
const ADMIN_CONDITION_RESERVED_ROOTS = ["data", "siblingData", "user", "id"] as const;
const PREVIEW_URL_RESERVED_ROOTS = ["siteUrl", "id"] as const;

const COMPILE_CACHE = new Map<string, { ast: unknown }>();

function compileExpression(expression: string) {
  const cached = COMPILE_CACHE.get(expression);
  if (cached) return cached;

  const compiled = jexl.compile(expression) as { _ast?: unknown };
  const next = { ast: compiled._ast };
  COMPILE_CACHE.set(expression, next);
  return next;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function quoteSegment(value: string) {
  return `["${value.replace(/"/g, '\\"')}"]`;
}

function fieldSegment(field: Record<string, unknown>, index: number) {
  return typeof field.name === "string" && field.name.length > 0 ? `fields${quoteSegment(field.name)}` : `fields[${index}]`;
}

function blockSegment(block: Record<string, unknown>, index: number) {
  return typeof block.slug === "string" && block.slug.length > 0 ? `blocks${quoteSegment(block.slug)}` : `blocks[${index}]`;
}

function collectionSegment(
  collection: Partial<Pick<CollectionConfig, "slug">>,
  index: number,
) {
  return typeof collection.slug === "string" && collection.slug.length > 0
    ? `collections${quoteSegment(collection.slug)}`
    : `collections[${index}]`;
}

function globalSegment(global: Partial<Pick<GlobalConfig, "slug">>, index: number) {
  return typeof global.slug === "string" && global.slug.length > 0 ? `globals${quoteSegment(global.slug)}` : `globals[${index}]`;
}

function colorize(value: string, code: number, enabled: boolean) {
  return enabled ? `\u001B[${code}m${value}\u001B[0m` : value;
}

function collectRootIdentifiers(node: unknown, roots: Set<string>, seen: Set<unknown>) {
  if (!node || typeof node !== "object" || seen.has(node)) return;
  seen.add(node);

  const candidate = node as {
    type?: string;
    value?: unknown;
    from?: unknown;
  };

  if (candidate.type === "Identifier") {
    if (candidate.from) {
      collectRootIdentifiers(candidate.from, roots, seen);
      return;
    }

    if (typeof candidate.value === "string" && candidate.value !== "null") {
      roots.add(candidate.value);
    }
    return;
  }

  if (Array.isArray(node)) {
    for (const entry of node) collectRootIdentifiers(entry, roots, seen);
    return;
  }

  for (const value of Object.values(node as Record<string, unknown>)) {
    if (Array.isArray(value)) {
      for (const entry of value) collectRootIdentifiers(entry, roots, seen);
      continue;
    }

    if (value && typeof value === "object") {
      collectRootIdentifiers(value, roots, seen);
    }
  }
}

function getInvalidRoots(expression: string, allowedRoots: readonly string[]) {
  const { ast } = compileExpression(expression);
  const roots = new Set<string>();
  collectRootIdentifiers(ast, roots, new Set());
  const allowed = new Set(allowedRoots);
  return [...roots].filter((root) => !allowed.has(root));
}

export function validateDeclarativeHookExpression(
  expression: string,
  surface: DeclarativeHookSurface,
  path: string,
): DeclarativeHookValidationIssue[] {
  try {
    const invalidRoots = getInvalidRoots(expression, SURFACE_ROOTS[surface]);

    if (invalidRoots.length === 0) return [];

    return [
      {
        path,
        surface,
        expression,
        message: `uses unsupported context ${invalidRoots
          .map((root) => `"${root}"`)
          .join(", ")}. Allowed context: ${SURFACE_ROOTS[surface].map((root) => `"${root}"`).join(", ")}`,
      },
    ];
  } catch (error) {
    return [
      {
        path,
        surface,
        expression,
        message: `has invalid syntax: ${(error as Error).message}`,
      },
    ];
  }
}

export function validateDeclarativeAccessExpression(
  expression: string,
  surface: DeclarativeAccessSurface,
  path: string,
): DeclarativeAccessValidationIssue[] {
  try {
    const invalidRoots = getInvalidRoots(expression, ACCESS_ROOTS);

    if (invalidRoots.length === 0) return [];

    return [
      {
        path,
        surface,
        expression,
        message: `uses unsupported context ${invalidRoots
          .map((root) => `"${root}"`)
          .join(", ")}. Allowed context: ${ACCESS_ROOTS.map((root) => `"${root}"`).join(", ")}`,
      },
    ];
  } catch (error) {
    return [
      {
        path,
        surface,
        expression,
        message: `has invalid syntax: ${(error as Error).message}`,
      },
    ];
  }
}

export function validateAdminConditionExpression(
  expression: string,
  path: string,
  allowedRoots: readonly string[],
): DeclarativeAdminValidationIssue[] {
  try {
    const invalidRoots = getInvalidRoots(expression, allowedRoots);

    if (invalidRoots.length === 0) return [];

    return [
      {
        path,
        surface: "field.admin.condition",
        expression,
        message: `uses unsupported context ${invalidRoots
          .map((root) => `"${root}"`)
          .join(", ")}. Allowed context: ${allowedRoots.map((root) => `"${root}"`).join(", ")}`,
      },
    ];
  } catch (error) {
    return [
      {
        path,
        surface: "field.admin.condition",
        expression,
        message: `has invalid syntax: ${(error as Error).message}`,
      },
    ];
  }
}

export function validatePreviewUrlExpression(
  expression: string,
  path: string,
  allowedRoots: readonly string[],
): DeclarativePreviewValidationIssue[] {
  try {
    const invalidRoots = getInvalidRoots(expression, allowedRoots);

    if (invalidRoots.length === 0) return [];

    return [
      {
        path,
        surface: "collection.admin.previewUrl",
        expression,
        message: `uses unsupported context ${invalidRoots
          .map((root) => `"${root}"`)
          .join(", ")}. Allowed context: ${allowedRoots.map((root) => `"${root}"`).join(", ")}`,
      },
    ];
  } catch (error) {
    return [
      {
        path,
        surface: "collection.admin.previewUrl",
        expression,
        message: `has invalid syntax: ${(error as Error).message}`,
      },
    ];
  }
}

export function assertValidDeclarativeHookExpression(
  expression: string,
  surface: DeclarativeHookSurface,
  path: string,
) {
  const issues = validateDeclarativeHookExpression(expression, surface, path);
  if (issues.length === 0) return;

  throw new Error(`Invalid declarative hook at ${path}: ${issues[0].message}`);
}

export function assertValidDeclarativeHookResult(
  result: unknown,
  surface:
    | "collection.beforeRead"
    | "collection.afterRead"
    | "collection.beforeChange"
    | "global.beforeRead"
    | "global.afterRead"
    | "global.beforeChange",
  path: string,
) {
  if (isPlainObject(result)) return;

  throw new Error(`Invalid declarative hook result at ${path}: ${surface} expressions must return an object`);
}

function collectFieldIssues(fields: Record<string, any>[], path: string, issues: DeclarativeHookValidationIssue[]) {
  fields.forEach((field, index) => {
    const fieldPath = `${path}.${fieldSegment(field, index)}`;

    field.hooks?.beforeChange?.forEach((hook: unknown, hookIndex: number) => {
      if (typeof hook !== "string") return;
      issues.push(
        ...validateDeclarativeHookExpression(
          hook,
          "field.beforeChange",
          `${fieldPath}.hooks.beforeChange[${hookIndex}]`,
        ),
      );
    });

    field.hooks?.afterRead?.forEach((hook: unknown, hookIndex: number) => {
      if (typeof hook !== "string") return;
      issues.push({
        path: `${fieldPath}.hooks.afterRead[${hookIndex}]`,
        surface: "unsupported",
        expression: hook,
        message: "declarative strings are not supported on field hooks.afterRead",
      });
    });

    if (typeof field.admin?.hooks?.onChange === "string") {
      issues.push(
        ...validateDeclarativeHookExpression(
          field.admin.hooks.onChange,
          "field.admin.onChange",
          `${fieldPath}.admin.hooks.onChange`,
        ),
      );
    }

    if (typeof field.admin?.hooks?.options === "string") {
      issues.push({
        path: `${fieldPath}.admin.hooks.options`,
        surface: "unsupported",
        expression: field.admin.hooks.options,
        message: "declarative strings are not supported on field admin.hooks.options",
      });
    }

    if (Array.isArray(field.fields)) {
      collectFieldIssues(field.fields, fieldPath, issues);
    }

    if (Array.isArray(field.blocks)) {
      field.blocks.forEach((block: Record<string, any>, blockIndex: number) => {
        if (!Array.isArray(block.fields)) return;
        collectFieldIssues(block.fields, `${fieldPath}.${blockSegment(block, blockIndex)}`, issues);
      });
    }
  });
}

function collectFieldNames(fields: Array<Record<string, unknown> | Field>): string[] {
  return fields.flatMap((field) =>
    typeof field.name === "string" && field.name.length > 0 ? [field.name] : [],
  );
}

function collectAdminConditionIssues(
  fields: Field[],
  path: string,
  rootFieldNames: readonly string[],
  issues: DeclarativeAdminValidationIssue[],
) {
  const scopeFieldNames = collectFieldNames(fields);
  const allowedRoots = [...new Set([...ADMIN_CONDITION_RESERVED_ROOTS, ...rootFieldNames, ...scopeFieldNames])];

  fields.forEach((field, index) => {
    const fieldPath = `${path}.${fieldSegment(field as Record<string, unknown>, index)}`;

    if (typeof field.admin?.condition === "string") {
      issues.push(
        ...validateAdminConditionExpression(
          field.admin.condition,
          `${fieldPath}.admin.condition`,
          allowedRoots,
        ),
      );
    }

    if (Array.isArray(field.fields)) {
      collectAdminConditionIssues(field.fields, fieldPath, rootFieldNames, issues);
    }

    if (Array.isArray(field.blocks)) {
      field.blocks.forEach((block, blockIndex) => {
        if (!Array.isArray(block.fields)) return;
        collectAdminConditionIssues(
          block.fields,
          `${fieldPath}.${blockSegment(block as unknown as Record<string, unknown>, blockIndex)}`,
          rootFieldNames,
          issues,
        );
      });
    }
  });
}

function collectFieldAccessIssues(fields: Field[], path: string, issues: DeclarativeAccessValidationIssue[]) {
  fields.forEach((field, index) => {
    const fieldPath = `${path}.${fieldSegment(field as Record<string, unknown>, index)}`;

    if (typeof field.access?.read === "string") {
      issues.push(...validateDeclarativeAccessExpression(field.access.read, "field.access", `${fieldPath}.access.read`));
    }
    if (typeof field.access?.create === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(field.access.create, "field.access", `${fieldPath}.access.create`),
      );
    }
    if (typeof field.access?.update === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(field.access.update, "field.access", `${fieldPath}.access.update`),
      );
    }

    if (Array.isArray(field.fields)) {
      collectFieldAccessIssues(field.fields, fieldPath, issues);
    }

    if (Array.isArray(field.blocks)) {
      field.blocks.forEach((block, blockIndex) => {
        if (!Array.isArray(block.fields)) return;
        collectFieldAccessIssues(
          block.fields,
          `${fieldPath}.${blockSegment(block as unknown as Record<string, unknown>, blockIndex)}`,
          issues,
        );
      });
    }
  });
}

function collectHookIssues(
  hooks: Record<string, unknown> | undefined,
  scope: "collection" | "global",
  path: string,
  issues: DeclarativeHookValidationIssue[],
) {
  if (!hooks) return;

  const supported: Partial<Record<string, DeclarativeHookSurface>> = {
    beforeRead: `${scope}.beforeRead` as DeclarativeHookSurface,
    afterRead: `${scope}.afterRead` as DeclarativeHookSurface,
    beforeChange: `${scope}.beforeChange` as DeclarativeHookSurface,
  };

  for (const [key, value] of Object.entries(hooks)) {
    if (!Array.isArray(value)) continue;

    value.forEach((hook, index) => {
      if (typeof hook !== "string") return;
      const surface = supported[key];

      if (!surface) {
        issues.push({
          path: `${path}.${key}[${index}]`,
          surface: "unsupported",
          expression: hook,
          message: `declarative strings are not supported on ${scope} hooks.${key}`,
        });
        return;
      }

      issues.push(...validateDeclarativeHookExpression(hook, surface, `${path}.${key}[${index}]`));
    });
  }
}

export function collectDeclarativeHookValidationIssues(config: DeclarativeValidationConfig) {
  const issues: DeclarativeHookValidationIssue[] = [];

  config.blocks?.forEach((block, blockIndex) => {
    if (!Array.isArray(block.fields)) return;
    collectFieldIssues(
      block.fields as Record<string, any>[],
      blockSegment(block as unknown as Record<string, unknown>, blockIndex),
      issues,
    );
  });

  config.collections.forEach((collection, collectionIndex) => {
    const collectionPath = collectionSegment(collection, collectionIndex);
    collectHookIssues(
      collection.hooks as Record<string, unknown> | undefined,
      "collection",
      `${collectionPath}.hooks`,
      issues,
    );
    collectFieldIssues(collection.fields as Record<string, any>[], collectionPath, issues);
  });

  config.globals?.forEach((global, globalIndex) => {
    const globalPath = globalSegment(global, globalIndex);
    collectHookIssues(
      global.hooks as Record<string, unknown> | undefined,
      "global",
      `${globalPath}.hooks`,
      issues,
    );
    collectFieldIssues(global.fields as Record<string, any>[], globalPath, issues);
  });

  return issues;
}

export function collectDeclarativeAccessValidationIssues(config: DeclarativeValidationConfig) {
  const issues: DeclarativeAccessValidationIssue[] = [];

  Object.entries(config.accessPolicies ?? {}).forEach(([name, value]) => {
    if (typeof value !== "string") return;
    issues.push(
      ...validateDeclarativeAccessExpression(value, "config.accessPolicy", `accessPolicies.${name}`),
    );
  });

  config.blocks?.forEach((block, blockIndex) => {
    if (!Array.isArray(block.fields)) return;
    collectFieldAccessIssues(
      block.fields,
      blockSegment(block as unknown as Record<string, unknown>, blockIndex),
      issues,
    );
  });

  config.collections.forEach((collection, collectionIndex) => {
    const collectionPath = collectionSegment(collection, collectionIndex);
    if (typeof collection.access?.read === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          collection.access.read,
          "collection.access",
          `${collectionPath}.access.read`,
        ),
      );
    }
    if (typeof collection.access?.create === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          collection.access.create,
          "collection.access",
          `${collectionPath}.access.create`,
        ),
      );
    }
    if (typeof collection.access?.update === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          collection.access.update,
          "collection.access",
          `${collectionPath}.access.update`,
        ),
      );
    }
    if (typeof collection.access?.delete === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          collection.access.delete,
          "collection.access",
          `${collectionPath}.access.delete`,
        ),
      );
    }
    if (typeof collection.access?.readAudit === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          collection.access.readAudit,
          "collection.access",
          `${collectionPath}.access.readAudit`,
        ),
      );
    }

    collectFieldAccessIssues(collection.fields as Field[], collectionPath, issues);
  });

  config.globals?.forEach((global, globalIndex) => {
    const globalPath = globalSegment(global, globalIndex);
    if (typeof global.access?.read === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(global.access.read, "global.access", `${globalPath}.access.read`),
      );
    }
    if (typeof global.access?.update === "string") {
      issues.push(
        ...validateDeclarativeAccessExpression(
          global.access.update,
          "global.access",
          `${globalPath}.access.update`,
        ),
      );
    }

    collectFieldAccessIssues(global.fields as Field[], globalPath, issues);
  });

  return issues;
}

export function collectAdminConditionValidationIssues(config: DeclarativeValidationConfig) {
  const issues: DeclarativeAdminValidationIssue[] = [];

  config.blocks?.forEach((block, blockIndex) => {
    if (!Array.isArray(block.fields)) return;
    collectAdminConditionIssues(
      block.fields,
      blockSegment(block as unknown as Record<string, unknown>, blockIndex),
      collectFieldNames(block.fields),
      issues,
    );
  });

  config.collections.forEach((collection, collectionIndex) => {
    const collectionPath = collectionSegment(collection, collectionIndex);
    const rootFieldNames = collectFieldNames(collection.fields);
    collectAdminConditionIssues(collection.fields as Field[], collectionPath, rootFieldNames, issues);
  });

  config.globals?.forEach((global, globalIndex) => {
    const globalPath = globalSegment(global, globalIndex);
    const rootFieldNames = collectFieldNames(global.fields);
    collectAdminConditionIssues(global.fields as Field[], globalPath, rootFieldNames, issues);
  });

  return issues;
}

export function collectPreviewUrlValidationIssues(config: DeclarativeValidationConfig) {
  const issues: DeclarativePreviewValidationIssue[] = [];

  config.collections.forEach((collection, collectionIndex) => {
    if (typeof collection.admin?.previewUrl !== "string") return;

    const collectionPath = collectionSegment(collection, collectionIndex);
    const allowedRoots = [
      ...new Set([...PREVIEW_URL_RESERVED_ROOTS, ...collectFieldNames(collection.fields)]),
    ];

    issues.push(
      ...validatePreviewUrlExpression(
        collection.admin.previewUrl,
        `${collectionPath}.admin.previewUrl`,
        allowedRoots,
      ),
    );
  });

  return issues;
}

export function assertValidAdminConditionsInConfig(config: DeclarativeValidationConfig, source = "config") {
  const diagnostics = collectAdminConditionValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "adminCondition" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));
  if (diagnostics.length === 0) return;

  throw new ConfigValidationError(source, diagnostics);
}

export function assertValidPreviewUrlsInConfig(config: DeclarativeValidationConfig, source = "config") {
  const diagnostics = collectPreviewUrlValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "previewUrl" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));
  if (diagnostics.length === 0) return;

  throw new ConfigValidationError(source, diagnostics);
}

export function collectConfigDiagnostics(config: DeclarativeValidationConfig): ConfigDiagnostic[] {
  const hookIssues = collectDeclarativeHookValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "declarativeHook" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));

  const accessIssues = collectDeclarativeAccessValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "declarativeAccess" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));

  const adminConditionIssues = collectAdminConditionValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "adminCondition" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));

  const previewUrlIssues = collectPreviewUrlValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "previewUrl" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));

  return [...hookIssues, ...accessIssues, ...adminConditionIssues, ...previewUrlIssues];
}

export function formatConfigDiagnostics(
  source: string,
  diagnostics: ConfigDiagnostic[],
  options: DiagnosticFormatOptions = {},
) {
  const color = options.color ?? false;
  const header = `${colorize("Config validation failed", 31, color)} in ${colorize(source, 36, color)}`;
  const lines = diagnostics.flatMap((issue, index) => [
    `${colorize(`${index + 1}.`, 31, color)} ${colorize(issue.path, 1, color)}`,
    `   ${issue.message}`,
    `   ${colorize("surface:", 90, color)} ${issue.surface}`,
  ]);

  return `${header}\n${lines.join("\n")}`;
}

export class ConfigValidationError extends Error {
  diagnostics: ConfigDiagnostic[];
  source: string;

  constructor(source: string, diagnostics: ConfigDiagnostic[]) {
    super(formatConfigDiagnostics(source, diagnostics));
    this.name = "ConfigValidationError";
    this.source = source;
    this.diagnostics = diagnostics;
  }
}

export function isConfigValidationError(error: unknown): error is ConfigValidationError {
  return error instanceof ConfigValidationError;
}

export function assertValidDeclarativeHooksInConfig(config: DeclarativeValidationConfig, source = "config") {
  const diagnostics = collectDeclarativeHookValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "declarativeHook" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));
  if (diagnostics.length === 0) return;

  throw new ConfigValidationError(source, diagnostics);
}

export function assertValidDeclarativeAccessInConfig(config: DeclarativeValidationConfig, source = "config") {
  const diagnostics = collectDeclarativeAccessValidationIssues(config).map((issue) => ({
    severity: "error" as const,
    source: "declarativeAccess" as const,
    path: issue.path,
    surface: issue.surface,
    message: issue.message,
    expression: issue.expression,
  }));
  if (diagnostics.length === 0) return;

  throw new ConfigValidationError(source, diagnostics);
}
