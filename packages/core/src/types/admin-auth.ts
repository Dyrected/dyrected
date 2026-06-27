import type { HookRequestContext } from "./request.js";

export interface AdminAuthMember {
  id: string;
  email: string;
  name?: string;
  roles: string[];
  siteAccess?: string[];
  status?: "active" | "pending";
  [key: string]: any;
}

export type AdminAuthProvisioningMode =
  | "jit_only"
  | "jit_plus_membership_management"
  | "preprovisioned_only";

export interface AdminAuthClaimMapping {
  sub?: string;
  email?: string;
  name?: string;
  roles?: string;
  groups?: string;
  siteIds?: string;
  workspaceIds?: string;
}

export interface AdminAuthResolvedIdentity {
  sub: string;
  email?: string;
  name?: string;
  roles?: string[];
  groups?: string[];
  siteIds?: string[];
  workspaceIds?: string[];
  rawClaims?: Record<string, unknown>;
}

export interface AdminAuthAccessResolution {
  allowed: boolean;
  roles?: string[];
  data?: Record<string, unknown>;
}

export interface AdminAuthResolveAccessArgs {
  identity: AdminAuthResolvedIdentity;
  providerId: string;
  siteId?: string;
  workspaceId?: string;
  req: {
    method: string;
    path: string;
    url: string;
    headers: Record<string, string | undefined>;
  };
  user: Record<string, unknown> | null;
}

export interface AdminAuthProviderMembersConfig {
  list?: (args: {
    limit?: number;
    page?: number;
    sort?: string;
    where?: Record<string, any>;
    req: HookRequestContext;
  }) => Promise<{
    docs: AdminAuthMember[];
    totalDocs: number;
    limit: number;
    page: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  }>;
  get?: (args: { externalSubject: string; req: HookRequestContext }) => Promise<AdminAuthMember | null>;
  create?: (args: { data: Record<string, any>; req: HookRequestContext }) => Promise<AdminAuthMember>;
  update?: (args: { externalSubject: string; data: Record<string, any>; req: HookRequestContext }) => Promise<AdminAuthMember>;
  delete?: (args: { externalSubject: string; req: HookRequestContext }) => Promise<void>;
}

export interface BaseAdminAuthProvider {
  id: string;
  type: "oidc" | "custom" | "cloud";
  displayName?: string;
  autoRedirect?: boolean;
  allowJitProvisioning?: boolean;
  claimMapping?: AdminAuthClaimMapping;
  members?: AdminAuthProviderMembersConfig;
}

export interface OIDCAdminAuthProvider extends BaseAdminAuthProvider {
  type: "oidc";
  issuer: string;
  clientId: string;
  clientSecret: string;
  redirectUri?: string;
  scopes?: string[];
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  userInfoEndpoint?: string;
}

export interface CustomAdminAuthProvider extends BaseAdminAuthProvider {
  type: "custom" | "cloud";
  startUrl?: string;
  issuer?: string;
  audience?: string;
  secret?: string;
  jwksUri?: string;
  tokenParam?: string;
}

export type AdminAuthProvider =
  | OIDCAdminAuthProvider
  | CustomAdminAuthProvider;

export interface PublicAdminAuthProvider {
  id: string;
  type: AdminAuthProvider["type"];
  displayName: string;
  autoRedirect?: boolean;
}

export interface PublicAdminAuthConfig {
  mode: "local" | "external";
  collectionSlug?: string;
  provisioningMode?: AdminAuthProvisioningMode;
  providers: PublicAdminAuthProvider[];
}

export interface AdminAuthConfig {
  mode: "local" | "external";
  collectionSlug?: string;
  provisioningMode?: AdminAuthProvisioningMode;
  providers: AdminAuthProvider[];
  resolveAccess?: (
    args: AdminAuthResolveAccessArgs,
  ) => Promise<AdminAuthAccessResolution> | AdminAuthAccessResolution;
}
