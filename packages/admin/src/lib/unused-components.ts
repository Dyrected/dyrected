import { collectReferencedComponentKeys } from "@dyrected/core";
import type { AdminComponents, AdminSchemas } from "../types/admin-components";

/**
 * Returns `"registry:key"` for every component registered in `components`
 * that the schema never references.
 *
 * A key counts as used when any surface references it. Detail views resolve
 * `displayCustom(name)` against several registries, so matching by registry
 * would raise false positives.
 */
export function findUnusedComponentKeys(
  components: AdminComponents | undefined,
  schemas: AdminSchemas | null,
): string[] {
  if (!components || !schemas) return [];

  const referenced = collectReferencedComponentKeys(schemas);
  const used = new Set<string>();
  for (const keys of Object.values(referenced)) {
    for (const key of keys) used.add(key);
  }

  const unused: string[] = [];
  for (const [registry, entries] of Object.entries(components)) {
    if (!entries || typeof entries !== "object") continue;
    for (const key of Object.keys(entries)) {
      if (!used.has(key)) unused.push(`${registry}:${key}`);
    }
  }
  return unused;
}
