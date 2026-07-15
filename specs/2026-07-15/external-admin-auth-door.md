# External Admin Auth Door v1

## Summary

Add a generic external admin auth framework to `core` and `admin` that allows Dyrected to trust external identity providers without changing existing local auth defaults. Use the same shared pipeline for:

- **Dyrected Cloud hosted tenants** via a Cloud adapter
- **self-hosted enterprise platforms** via OIDC first, with SAML and custom handoff as later adapters

Keep self-hosted local auth unchanged. External auth is opt-in and deployment-specific.

## Key Changes

### 1. Core: generic external auth framework

Add a new deployment-level config surface:

- `adminAuth.mode: "local" | "external"`
- `adminAuth.providers: ExternalAdminAuthProvider[]`
- `adminAuth.provisioningMode: "jit_only" | "jit_plus_membership_management" | "preprovisioned_only"`

Provider contract for v1:

- shared fields:
  - `id`
  - `type: "cloud" | "oidc" | "custom"`  
  - `displayName`
  - `allowJitProvisioning`
  - `claimMapping`
- optional hooks:
  - `resolveIdentity`
  - `resolveMembership`
  - `mapRoles`

Add generic backend routes and pipeline:

- `GET /api/admin/auth/providers`
- `GET /api/admin/auth/:provider/start`
- `GET /api/admin/auth/:provider/callback`
- `POST /api/admin/auth/:provider/exchange` for token-based/custom handoff
- `POST /api/admin/logout`

Common auth pipeline:

1. validate provider response/assertion
2. normalize identity into:
   - `providerId`
   - `externalSubject`
   - `email`
   - `name`
   - optional groups/claims
3. resolve current site
4. resolve or create local admin identity
5. resolve site membership and role
6. issue Dyrected admin token/session
7. return normalized admin user payload

Local identity model additions:

- external identity fields on the admin identity record:
  - `providerId`
  - `externalSubject`
  - `email`
  - `displayName`
  - `authSource`
  - `status`
  - `lastLoginAt`

Authorization rules:

- authentication success must not imply admin access
- site membership is always checked separately
- a valid external identity without site membership gets an explicit unauthorized result

### 2. Admin: generic auth strategy support

Update admin boot/login flow to support two strategies:

- `local`: current collection-based login remains unchanged
- `external`: provider-driven redirect or token bootstrap

Admin behavior changes:

- fetch auth config/providers before rendering login choice
- support:
  - direct redirect for single-provider deployments
  - provider picker when multiple external providers exist
- add callback/exchange handling page/state
- support hosted bootstrap from trusted token via existing `initialToken` path
- add explicit unauthorized-for-site screen
- preserve current local `__admins` login behavior when `mode = local`

UI states:

- `loading-config`
- `local-login`
- `external-login`
- `redirecting`
- `exchanging`
- `authenticated`
- `unauthorized`
- `error`

### 3. Cloud-only features

Build a Cloud adapter on top of the generic framework.

Cloud responsibilities:

- Cloud is the identity owner for hosted tenants
- support:
  - Dyrected account login
  - enterprise SSO inside Cloud
- own membership data:
  - `accounts`
  - `workspaceMembers`
  - `siteMembers`

Hosted tenant flow:

1. user opens `theirsite.com/admin`
2. admin sees `mode = external`, provider = `cloud`
3. redirect to Dyrected Cloud login/start
4. Cloud authenticates user
5. Cloud resolves workspace/site membership
6. Cloud returns signed auth result
7. hosted admin exchanges it for Dyrected admin session
8. admin loads with site-scoped access

Cloud-specific requirements:

- site resolution from hostname/site id
- hosted admin callback/exchange contract
- Cloud-issued signed payload with:
  - `providerId`
  - `accountId`
  - `workspaceId`
  - `siteId`
  - `roles`
  - `email`
  - `name`
  - `exp`
  - nonce/state fields

Provisioning default for Cloud:

- `jit_plus_membership_management`

Cloud still needs a virtual member-management surface because JIT only creates identities; it does not replace:

- listing site admins
- revoking site access
- changing site roles
- inviting members
- viewing who currently has access

### 4. Self-hosted enterprise adapter features

Build OIDC first as the generic enterprise self-hosted adapter.

OIDC config fields:

- `issuer`
- `clientId`
- `clientSecret`
- `redirectUri`
- `scopes`
- `claimMapping.sub`
- `claimMapping.email`
- `claimMapping.name`
- optional `claimMapping.groups`
- optional `claimMapping.siteIds`

Self-hosted enterprise flow:

1. user opens self-hosted `/admin`
2. admin redirects to enterprise IdP
3. IdP authenticates user
4. callback returns identity claims
5. Dyrected resolves/creates local admin identity
6. Dyrected resolves local site membership
7. admin session is issued

Provisioning modes:

- `jit_only`
  - identity created on first login
  - membership must come from claims or external resolver
  - no writable member-management UI required
- `jit_plus_membership_management`
  - identity created on first login
  - Dyrected can still manage site membership/roles locally
- `preprovisioned_only`
  - no user auto-create
  - unknown external user is rejected

Custom adapter support in v1:

- custom signed token handoff can use the same `exchange` route and normalized identity pipeline
- required config:
  - issuer
  - audience
  - signing secret or JWKS
  - token TTL
  - claim mapping

SAML is deferred from implementation but the provider abstraction must not block it.

## Public Interfaces

### Config

Add a new config area roughly shaped like:

- `adminAuth.mode`
- `adminAuth.provisioningMode`
- `adminAuth.providers[]`

Do not change current collection auth config semantics.

### API

New admin auth endpoints:

- `GET /api/admin/auth/providers`
- `GET /api/admin/auth/:provider/start`
- `GET /api/admin/auth/:provider/callback`
- `POST /api/admin/auth/:provider/exchange`
- `POST /api/admin/logout`

### Identity payload

Normalize all external providers into one internal shape:

- `providerId`
- `externalSubject`
- `email`
- `displayName`
- `groups`
- `siteIds`
- `workspaceIds`
- `rawClaims` optional internal-only

## Test Plan

- local auth continues to work unchanged when `mode = local`
- single external provider redirects automatically
- multiple providers render correct provider selection UI
- valid OIDC callback creates session
- valid Cloud callback/exchange creates hosted admin session
- JIT creates local identity when enabled
- unknown user is rejected in `preprovisioned_only`
- valid identity without site membership is denied
- valid identity with site membership gets correct scoped access
- role mapping applies correctly
- logout clears session for both local and external flows
- invalid state/nonce/signature is rejected
- duplicate external login does not create duplicate local identities
- Cloud member-management surface only exposes site-scoped members

## Assumptions and Defaults

- Existing self-hosted local auth remains default and unchanged
- OIDC is the only enterprise standards-based adapter implemented in v1
- SAML is planned but not implemented in v1
- Cloud adapter and OIDC adapter share the same internal resolution pipeline
- Cloud defaults to `jit_plus_membership_management`
- self-hosted enterprise deployments may choose any provisioning mode
- local authorization records remain necessary even when authentication is external
