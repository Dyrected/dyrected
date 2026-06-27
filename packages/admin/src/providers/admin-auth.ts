import type { CollectionConfig } from "@dyrected/core";
import type { AdminSchemas } from "../types/admin-components";

export type AdminUser = Record<string, unknown>;

export function getAdminCollectionSlug(schemas: AdminSchemas | null): string | null {
  if (!schemas) return null;
  const requested = schemas.adminAuth?.collectionSlug;
  if (requested) return requested;
  return (
    findCollection(schemas.collections, (collection) => collection.slug === "__admins")?.slug ??
    findCollection(schemas.collections, (collection) => !!collection.auth)?.slug ??
    null
  );
}

function findCollection(
  collections: CollectionConfig[],
  predicate: (collection: CollectionConfig) => boolean,
) {
  return collections.find(predicate);
}
