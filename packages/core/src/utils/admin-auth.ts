import type {
  AdminAuthConfig,
  CollectionConfig,
  DyrectedConfig,
  PublicAdminAuthConfig,
  PublicAdminAuthProvider,
} from "../types/index.js";

export function getAdminAuthCollection(
  config: Pick<DyrectedConfig, "collections" | "adminAuth">,
): CollectionConfig | null {
  const adminCollection = resolveAdminAuthCollection(config.collections, config.adminAuth?.collectionSlug);
  return adminCollection ?? null;
}

export function resolveAdminAuthCollection(
  collections: CollectionConfig[],
  collectionSlug?: string,
): CollectionConfig | undefined {
  const adminsCollection = collections.find((collection) => collection.slug === "__admins");
  if (adminsCollection) return adminsCollection;
  if (collectionSlug) {
    const requestedCollection = collections.find((collection) => collection.slug === collectionSlug);
    if (requestedCollection) return requestedCollection;
  }

  return collections.find((collection) => collection.auth);
}

export function getPublicAdminAuthConfig(
  adminAuth?: AdminAuthConfig,
  collections?: CollectionConfig[],
): PublicAdminAuthConfig {
  const providers: PublicAdminAuthProvider[] = (adminAuth?.providers ?? []).map((provider) => ({
    id: provider.id,
    type: provider.type,
    displayName: provider.displayName || humanizeProviderName(provider.id, provider.type),
    autoRedirect: provider.autoRedirect,
  }));
  const resolvedCollectionSlug = collections
    ? resolveAdminAuthCollection(collections, adminAuth?.collectionSlug)?.slug
    : adminAuth?.collectionSlug;

  return {
    mode: adminAuth?.mode ?? "local",
    collectionSlug: resolvedCollectionSlug,
    provisioningMode: adminAuth?.provisioningMode,
    providers,
  };
}

function humanizeProviderName(id: string, type: PublicAdminAuthProvider["type"]): string {
  const cleaned = id.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return type.toUpperCase();
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Resolves the configured admin role for a collection or returns "admin" as default.
 */
export function getAdminRoleForCollection(collection?: CollectionConfig | null): string {
  if (!collection?.auth) return "admin";
  if (typeof collection.auth === "object" && collection.auth.adminRole) {
    return collection.auth.adminRole;
  }
  return "admin";
}

const STANDARD_ADMIN_ROLES = new Set([
  "admin",
  "super_admin",
  "superadmin",
  "super admin",
  "super-admin",
  "owner",
]);

/**
 * Checks whether a user possesses an administrative role.
 * Considers:
 * 1. The collection's configured `adminRole` (e.g. 'super_admin' or 'super admin')
 * 2. Standard admin roles ('admin', 'super_admin', 'super admin', 'superadmin', 'owner')
 */
export function isUserAdmin(
  user: any,
  collection?: CollectionConfig | null,
): boolean {
  if (!user) return false;
  const rawRoles = Array.isArray(user.roles)
    ? user.roles
    : typeof user.roles === "string"
      ? [user.roles]
      : Array.isArray(user.role)
        ? user.role
        : typeof user.role === "string"
          ? [user.role]
          : [];
  if (rawRoles.length === 0) return false;

  const roles = rawRoles.filter((r: any): r is string => typeof r === "string");
  const configuredRole = getAdminRoleForCollection(collection);

  for (const r of roles) {
    if (r === configuredRole || r.toLowerCase() === configuredRole.toLowerCase()) {
      return true;
    }
    const normalized = r.trim().toLowerCase();
    if (STANDARD_ADMIN_ROLES.has(normalized)) {
      return true;
    }
    const stripped = normalized.replace(/[\s_-]+/g, "");
    if (stripped === "admin" || stripped === "superadmin" || stripped === "owner") {
      return true;
    }
  }

  return false;
}
