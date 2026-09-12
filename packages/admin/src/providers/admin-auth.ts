import type { CollectionConfig } from "@dyrected/core";
import type { AdminSchemas } from "../types/admin-components";

export type AdminUser = Record<string, unknown>;

export function getAdminCollectionSlug(schemas: AdminSchemas | null): string | null {
  if (!schemas) return null;
  return (
    findCollection(schemas.collections, (collection) => collection.slug === "__admins")?.slug ??
    findCollection(schemas.collections, (collection) => collection.slug === schemas.adminAuth?.collectionSlug)?.slug ??
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

export function normalizeAdminUser(
  user: Record<string, unknown> | null | undefined,
  collectionSlug?: string | null,
): AdminUser | null {
  if (!user || typeof user !== "object") return null;

  const roles = Array.isArray(user.roles)
    ? user.roles
        .filter((role): role is string => typeof role === "string")
        .map(normalizeCloudRole)
    : typeof user.role === "string"
      ? [normalizeCloudRole(user.role)]
      : [];
  const role =
    typeof user.role === "string"
      ? normalizeCloudRole(user.role)
      : roles[0];

  const collection =
    typeof user.collection === "string" && user.collection
      ? user.collection
      : collectionSlug || undefined;

  return {
    ...user,
    ...(collection ? { collection } : {}),
    ...(role ? { role } : {}),
    roles,
  };
}

export function decodeTokenPayload(token: string): AdminUser | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = decodeURIComponent(
      atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );
    const parsed = JSON.parse(json);
    if (!parsed || typeof parsed !== "object") return null;

    const collectionSlug = typeof parsed.collection === "string" ? parsed.collection : null;
    return normalizeAdminUser(parsed as Record<string, unknown>, collectionSlug);
  } catch {
    return null;
  }
}

function normalizeCloudRole(role: string) {
  return role === "owner" ? "admin" : role;
}

