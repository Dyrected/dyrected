import type {
  DefineWorkspaceOptions,
  NavGroup,
  CompiledNavItem,
  ReconciledNavTree,
  UserNavigationPreferences,
  DyrectedConfig,
} from "@dyrected/core";
import { compileNavigation, reconcileNavigation } from "@dyrected/core";
import prettier from "prettier";

/**
 * Converts a reconciled navigation tree into an array of clean `DefineWorkspaceOptions`
 * ready to be serialized into TypeScript code.
 */
export function convertReconciledTreeToWorkspaceOptions(
  tree: ReconciledNavTree
): DefineWorkspaceOptions[] {
  const result: DefineWorkspaceOptions[] = [];

  for (const group of tree.groups) {
    const isStandardGroup =
      (!group.icon || group.icon === "Folder") &&
      group.defaultExpanded !== false &&
      (group.order === undefined || group.order === 100);

    const groupMeta: NavGroup = {
      name: group.name,
      ...(group.icon && group.icon !== "Folder" ? { icon: group.icon } : {}),
      ...(group.defaultExpanded !== undefined && group.defaultExpanded !== true
        ? { defaultExpanded: group.defaultExpanded }
        : {}),
      ...(group.order !== undefined && group.order !== 100 ? { order: group.order } : {}),
    };

    group.items.forEach((item: CompiledNavItem, itemIndex: number) => {
      // First item in the group gets full group definition if it has custom metadata
      const groupConfig = itemIndex === 0
        ? (isStandardGroup ? group.name : groupMeta)
        : group.name;

      const baseOption: DefineWorkspaceOptions = {
        group: groupConfig,
        order: itemIndex + 1,
      };

      if (item.type === "workspace" || (item.slug && item.slug !== item.collection && item.slug !== item.global)) {
        // Operational Workspace
        result.push({
          ...baseOption,
          slug: item.slug,
          label: item.label,
          ...(item.icon ? { icon: item.icon } : {}),
          ...(item.collection ? { collection: item.collection } : {}),
          ...(item.badge ? { badge: item.badge } : {}),
          ...(item.views && item.views.length > 0 ? { views: item.views } : {}),
        });
      } else if (item.collection) {
        // Collection Item
        result.push({
          ...baseOption,
          collection: item.collection,
          ...(item.label ? { label: item.label } : {}),
          ...(item.icon ? { icon: item.icon } : {}),
          ...(item.badge ? { badge: item.badge } : {}),
          ...(item.views && item.views.length > 0 ? { views: item.views } : {}),
        });
      } else if (item.global) {
        // Global Item
        result.push({
          ...baseOption,
          global: item.global,
          ...(item.label ? { label: item.label } : {}),
          ...(item.icon ? { icon: item.icon } : {}),
        });
      } else if (item.href) {
        // Link Item
        result.push({
          ...baseOption,
          label: item.label,
          href: item.href,
          ...(item.icon ? { icon: item.icon } : {}),
        });
      } else if (item.type === "dashboard") {
        // Dashboard Link
        result.push({
          dashboard: true,
          ...(item.label ? { label: item.label } : {}),
          ...(item.icon ? { icon: item.icon } : {}),
          order: item.order,
        });
      }
    });
  }

  // Handle any ungrouped items
  for (const item of tree.ungrouped || []) {
    if (item.type === "workspace" || (item.slug && item.slug !== item.collection && item.slug !== item.global)) {
      result.push({
        slug: item.slug,
        label: item.label,
        ...(item.icon ? { icon: item.icon } : {}),
        ...(item.collection ? { collection: item.collection } : {}),
        ...(item.badge ? { badge: item.badge } : {}),
        ...(item.views && item.views.length > 0 ? { views: item.views } : {}),
        order: item.order,
      });
    } else if (item.collection) {
      result.push({
        collection: item.collection,
        ...(item.label ? { label: item.label } : {}),
        ...(item.icon ? { icon: item.icon } : {}),
        ...(item.badge ? { badge: item.badge } : {}),
        order: item.order,
      });
    } else if (item.global) {
      result.push({
        global: item.global,
        ...(item.label ? { label: item.label } : {}),
        ...(item.icon ? { icon: item.icon } : {}),
        order: item.order,
      });
    }
  }

  return result;
}

/**
 * Reconciles user navigation preferences with a project's DyrectedConfig
 * and returns the sorted DefineWorkspaceOptions.
 */
export function reconcilePreferencesToWorkspaceOptions(
  prefs: UserNavigationPreferences,
  config?: DyrectedConfig
): DefineWorkspaceOptions[] {
  const baseTree = config
    ? compileNavigation(config)
    : { groups: [], ungrouped: [] };

  const schemas = config
    ? {
        collections: config.collections,
        globals: config.globals,
      }
    : undefined;

  const reconciledTree = reconcileNavigation(baseTree, prefs, schemas as any, {
    includeHidden: false,
  });

  return convertReconciledTreeToWorkspaceOptions(reconciledTree);
}

/**
 * Recursive TypeScript object serializer.
 */
function formatTsValue(value: unknown, indent = 0): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const spaces = " ".repeat(indent + 2);
    const endSpaces = " ".repeat(indent);
    const elements = value
      .map((v) => `${spaces}${formatTsValue(v, indent + 2)}`)
      .join(",\n");
    return `[\n${elements}\n${endSpaces}]`;
  }

  if (typeof value === "object") {
    const entries = Object.entries(value).filter(([_, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    const spaces = " ".repeat(indent + 2);
    const endSpaces = " ".repeat(indent);
    const lines = entries
      .map(([k, v]) => {
        const validIdentifier = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k);
        const keyStr = validIdentifier ? k : JSON.stringify(k);
        return `${spaces}${keyStr}: ${formatTsValue(v, indent + 2)}`;
      })
      .join(",\n");
    return `{\n${lines}\n${endSpaces}}`;
  }

  return String(value);
}

/**
 * Serializes an array of `DefineWorkspaceOptions` into formatted TypeScript code.
 */
export async function serializeWorkspacesToTypeScript(
  items: DefineWorkspaceOptions[]
): Promise<string> {
  const itemStatements = items.map(
    (item) => `defineWorkspace(${formatTsValue(item, 2)})`
  );

  const rawArray = `[\n  ${itemStatements.join(",\n  ")}\n]`;
  const wrappedCode = `const navigation = ${rawArray};`;

  try {
    const formatted = await prettier.format(wrappedCode, {
      parser: "typescript",
      singleQuote: false,
      semi: true,
    });

    // Strip "const navigation = " prefix and trailing semicolon
    return formatted
      .replace(/^const\s+navigation\s*=\s*/, "")
      .replace(/;\s*$/, "")
      .trim();
  } catch {
    return rawArray;
  }
}
