# External Admin Auth Door

## Summary

Build a generic external admin auth layer in `core` and `admin` so Dyrected can accept trusted identities from either:

- Dyrected Cloud for cloud-hosted tenants
- an enterprise IdP or platform like Teylod for self-hosted deployments

Keep existing local auth unchanged as the default path. External auth is an opt-in deployment mode, not a replacement for current self-hosted behavior.

## Key Changes

### 1. Generic features in Core

Add a deployment-level external auth contract to `@dyrected/core`:

- Introduce an `adminAuth` config with modes like:
  - `local`
  - `external`
- In `external`, accept one or more providers:
  - `oidc`
  - `saml` later
  - `custom` trusted handoff
  - cloud adapter built on the same contract

Add generic backend capabilities:

- External login start endpoint:
  - starts redirect flow to the configured provider
- External callback/exchange endpoint:
  - validates assertion/token from provider
  - resolves or creates a local admin identity
  - establishes Dyrected admin session/token
- Identity linking model:
  - local admin/member records store `provider`, `externalSubject`, `email`, `displayName`, and status fields
- JIT provisioning policy:
  - optional first-login auto-create of admin/member record
- Site membership authorization:
  - successful authentication is not enough
  - user must also have membership for the resolved site/workspace
- Normalized current-user shape:
  - admin UI receives the same “me” payload whether auth is local or external

Important interface additions:

- `adminAuth.mode`
- `adminAuth.providers[]`
- provider settings object with shared fields:
  - `type`
  - `id`
  - `allowJitProvisioning`
  - `mapClaims`
- optional membership resolver hook for enterprise/self-hosted adapters

### 2. Generic features in Admin

Add auth-strategy support to `@dyrected/admin`:

- Login gate chooses between:
  - existing local collection login
  - external login redirect/button flow
- Support hosted bootstrap token / external session bootstrap
- Keep `initialToken` flow as a first-class supported path
- Add a stable auth state model:
  - unauthenticated
  - redirecting-to-provider
  - exchanging-callback
  - authenticated
  - unauthorized-for-site
- Provide provider-aware login UI:
  - local form for `local`
  - “Continue with <provider>” for external
  - silent redirect when configured
- Keep current collection-based admin behavior intact for local mode

Important interface additions:

- admin config returned to UI includes auth mode and available providers
- callback handling route in admin shell
- unauthorized screen for “valid identity, no site membership”

### 3. Cloud-only features

Build a Dyrected Cloud adapter on top of the generic external auth framework:

- Cloud remains the canonical identity/control plane for cloud-hosted tenants
- Cloud login can be:
  - Dyrected account login
  - enterprise SSO configured inside Dyrected Cloud
- Add hosted admin launch flow:
  - `theirsite.com/admin` redirects to Cloud login when no session exists
  - Cloud resolves account, tenant, site membership, and role
  - Cloud returns a Dyrected admin token/session for the hosted tenant
- Add Cloud-owned membership model:
  - `accounts`
  - `workspaceMembers`
  - `siteMembers`
- Add virtual admin/member management surface:
  - list/invite/remove site admins without exposing raw `accounts` as a tenant collection
- Add token claims for hosted admin:
  - account id
  - site id
  - workspace id
  - role(s)
  - provider id
  - session expiry

This adapter is deployment-specific and must not be required by self-hosted installs.

### 4. Self-hosted enterprise adapter features

Build enterprise self-hosted support as another external provider path:

- OIDC provider support first
- SAML provider support later
- Custom signed handoff optional for platform partners

Required behavior:

- self-hosted Dyrected trusts enterprise identity provider
- no Dyrected-local password required for those users
- local admin/member record still exists for authorization and audit
- membership can be provisioned:
  - via JIT on first login
  - or via API/pre-provisioned sync
- role mapping from claims/groups into Dyrected roles
- site scoping enforced after authentication

Recommended OIDC-specific interface:

- issuer URL
- client id
- client secret
- redirect URI
- scopes
- claim mapping:
  - `sub`
  - `email`
  - `name`
  - optional `groups`
  - optional external site/workspace identifiers

Recommended custom-adapter interface:

- provider id
- signing key or JWKS
- expected issuer/audience
- handoff TTL
- claim mapping and membership resolver

## Test Plan

- Local auth remains unchanged when `adminAuth.mode = local`
- External login start redirects correctly for configured provider
- External callback creates session for valid identity
- Existing linked admin identity logs in without duplication
- JIT provisioning creates user only when enabled
- Valid identity without site membership is denied
- Valid identity with site membership receives correct scoped access
- Hosted Cloud adapter boots admin with Cloud-issued token
- Enterprise OIDC adapter maps claims and roles correctly
- Logout clears local admin session and forces re-auth
- Misconfigured provider fails safely with clear admin-visible error
- Multiple providers choose the correct configured login path

## Assumptions and Defaults

- Existing self-hosted local auth remains the default and is not changed
- OIDC is the first enterprise adapter shipped
- SAML is deferred but the provider contract must allow it without redesign
- Custom handoff is optional and should reuse the same normalized identity resolution pipeline
- Authorization is always local to the Dyrected deployment or hosted tenant, even when authentication is external
- Cloud and self-hosted enterprise adapters share the same core/admin “door” but have different identity owners
