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
