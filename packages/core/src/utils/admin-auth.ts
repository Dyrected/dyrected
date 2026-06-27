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
  const requestedSlug = config.adminAuth?.collectionSlug;
  if (requestedSlug) {
    return config.collections.find((collection) => collection.slug === requestedSlug) ?? null;
  }

  return (
    config.collections.find((collection) => collection.slug === "__admins") ??
    config.collections.find((collection) => collection.auth) ??
    null
  );
}

export function getPublicAdminAuthConfig(adminAuth?: AdminAuthConfig): PublicAdminAuthConfig {
  const providers: PublicAdminAuthProvider[] = (adminAuth?.providers ?? []).map((provider) => ({
    id: provider.id,
    type: provider.type,
    displayName: provider.displayName || humanizeProviderName(provider.id, provider.type),
    autoRedirect: provider.autoRedirect,
  }));

  return {
    mode: adminAuth?.mode ?? "local",
    collectionSlug: adminAuth?.collectionSlug,
    provisioningMode: adminAuth?.provisioningMode,
    providers,
  };
}

function humanizeProviderName(id: string, type: PublicAdminAuthProvider["type"]): string {
  const cleaned = id.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return type.toUpperCase();
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}
