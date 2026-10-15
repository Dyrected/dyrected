# Unified Roles & Permissions Specification

**Document Version:** 0.2.0 (Draft)
**Status:** Decisions made. Ready for the §13 validation steps and Phase 0. Remaining open items are listed in §12.
**Supersedes:** 0.1.0 (role matrix only). This version unifies access rules, workflow capabilities and role assignment under one model, and makes backward compatibility a hard requirement.
**Scope:** `@dyrected/core` (permission catalog, resolution, compatibility layer, API), `@dyrected/admin` (role matrix, role assignment), `@dyrected/sdk`, `dyrected` CLI (analyze, migrate, explain)
**Related, not dependent:** [Component Registry & Bridge](./custom-components-registry-spec.md) §5 `useAccess` reads the same resolved result.

---

## 1. Context & Motivation

### One question, answered in four places

"Who is allowed to do this?" is answered independently in four places, in four vocabularies:

| Place | How it asks | Vocabulary | Source |
|---|---|---|---|
| Collection, global, field `access` | A rule per operation | Role **strings** inside Jexl, or functions, or named policies | `types/access.ts`, `schema-config.ts`, `schema-core.ts` |
| Publishing workflow | `roles: [{ role, capabilities }]` plus `requiredCapabilities` on each transition | **Capability** strings such as `entry.publish` | `workflows.ts`, `types/workflows.ts` |
| Navigation and operational views | Their own `access` (`string[]` or `AccessRule`) | Role strings | `types/navigation.ts`, `types/views.ts` |
| The roles themselves | A `roles` select field on the auth collection | An option list with no meaning attached | `defineRolesField` in `index.ts` |

The consequences are the ones developers actually hit:

1. **The same fact is written several times.** "Editors can publish posts" appears in the workflow, again in collection rules, and again for navigation visibility.
2. **There is no list of roles with meaning.** A role exists because some expression mentions its name, so a typo creates a role that nobody has.
3. **"What can role A do?" cannot be answered** without reading every rule and evaluating it by hand.
4. **Non-developers cannot change any of it.** All of it lives in code.
5. **Capabilities are global strings** (`entry.publish`), so they cannot say "publish *posts* but not *pages*".

### What this spec delivers

- **One vocabulary.** Every check becomes: *does this user have permission `X`?*
- **One place to define who can do what**, which is also the source for the admin's role matrix.
- **A derived permission catalog**, so developers never hand-write the list of permissions and tooling can autocomplete and validate them.
- **Runtime editing** by administrators, with config as the starting point.
- **Full backward compatibility.** Nothing that works today changes behavior. New and old coexist until a project chooses to migrate.

## 2. Goals & Non-Goals

**Goals**
1. A typical project is fully set up by one short roles definition, with no per-collection `access` rules.
2. Existing `access` rules, `accessPolicies`, workflow `roles`, `requiredCapabilities` and `user.capabilities` keep working with identical results.
3. A developer can always find out **why** a request was allowed or denied.
4. Administrators edit role permissions and assign roles to users in the admin UI.
5. Enforcement stays server-side, through one resolution function.
6. Behavior is identical in Dyrected Cloud and self-hosted. Cloud is expected to run function rules and function policies, so the role model has no Cloud-specific restrictions.

**Non-goals**
- Authentication (who a user is, sessions, SSO).
- Per-user permission grants (see Q8).
- Sandboxing function rules. They remain trusted developer code.
- Field-level permissions inside the role matrix in this version (§11).
- Replacing Jexl, functions or named policies. They remain the escape hatch, and all three are first-class. The spec does not favor Jexl.

## 3. Concepts

| Term | Meaning |
|---|---|
| **Permission** | A string `<resource>.<action>`, for example `posts.update`, `posts.publish`, `media.create`. The unit of every check. |
| **Permission catalog** | The full set of permissions Dyrected derives from your config (§4). Never hand-written. |
| **Auth collection** | A collection with `auth` enabled (admins, customers, staff). Every user belongs to exactly one, recorded as `user.collection`. |
| **Role** | A named list of grants, **defined per auth collection**. Assigned to users of that collection. |
| **Grant** | One entry in a role: a permission, optionally scoped. |
| **Scope** | A narrowing of a grant: `own` (the user's own documents) or a `where` filter. |
| **Public role** | The role applied to unauthenticated requests. |
| **Source** | Where a decision came from: a role grant, a legacy rule, a legacy workflow mapping, or the project default. Shown in the matrix and by `explain`. |
| **Policy** | Unchanged. A named, reusable **rule** in `accessPolicies`. A grant may reference one. A policy is *not* a bundle of permissions. |
| **Seed / override** | The role definition in config / a change made in the admin. |

### Old and new vocabulary

The same words meant different things before this spec. Read this table first.

| Word | Today (before this spec) | After this spec |
|---|---|---|
| **Role** | A plain string on the user (`user.roles`, `user.role`). A label only. It means something because some rule mentions it. | A named bundle of permissions. Still assigned to users the same way. |
| **Access** | The `access: { read, create, update, delete }` key on a collection, global, field or nav item. Each entry is a rule. | The general idea "may this user do this?". The `access` key remains as an optional override rule. |
| **Rule** | One entry under `access`: a boolean, a Jexl string, a function, or a policy reference. | Unchanged. Now the escape hatch and the source consulted first (§6). |
| **Policy** | A named, reusable rule in `accessPolicies`. | Unchanged. Not a bundle of permissions. |
| **Capability** | A global string (`entry.publish`) used only by the publishing workflow. Stored in `user.capabilities` or granted by `workflow.roles`. | Legacy name for a global permission. Still works (§7). New docs say "permission". |
| **Permission** | Not a defined term in code. | One action on one resource: `posts.update`, `posts.publish`. The unit of every check. |
| **Grant** | Does not exist. | One line inside a role. |

**How a check flows**

```
Today:  collection rules → user → role string → inside a rule expression → allow/deny
        workflow         → user → role string → workflow.roles → capability → transition allowed

After:  user → role → permissions (grants) → "has posts.publish?" → allow/deny
        (a collection rule, when present, is consulted first and decides)
```

**Use one word.** New documentation and code say **permission**. "Capability" is accepted for existing configs and is never taught. The vocabulary to learn is four words: role, permission, rule, policy.

## 4. The Permission Catalog

Dyrected builds the catalog from config at startup. Every item below contributes permissions:

| Source | Permissions produced |
|---|---|
| Each collection | `<slug>.read`, `.create`, `.update`, `.delete` |
| Each global | `<slug>.read`, `.update` |
| Each workflow transition | `<slug>.<transition>`, e.g. `posts.submit`, `posts.publish`, `posts.reject`, `posts.unpublish` |
| Each custom or view action | `<slug>.<action>` |
| Each custom page | `pages.<slug>` |
| The admin itself | `admin.access` |
| Role management | `roles.manage` |

The catalog is also what generates the **typed list** (`dyrected-types.ts`), so `"posts.publsh"` is a compile error, and it is the column set of the matrix UI.

> **Scope of the catalog.** Navigation items are *not* separate permissions: a nav item pointing at a collection shows when the user holds `<slug>.read`. Custom pages are permissions (`pages.<slug>`), declared by the developer. See Q6.

## 5. Defining Roles

```ts
export default defineConfig({
  roles: defineRoles({
    admin:     "*",
    editor:    { posts: ["read", "create", "update:own", "submit"], media: ["read", "create"] },
    publisher: { posts: ["read", "update", "publish", "unpublish"] },
    public:    { posts: ["read:published"] },
  }),
})
```

### Roles belong to an auth collection

Roles are defined in one place, the project config, and stored as flat rows (§8). Which users a role applies to depends on the auth collection.

A project can have several auth collections, for example `users` (the people who run the admin) and `customers` (application users who sign in to your site). They are different populations, so `editor` in `users` has nothing to do with `member` in `customers`.

**One auth collection (the common case).** Write roles directly, as above. They apply to that collection's users.

**Several auth collections.** Group roles under `collections`, keyed by auth collection slug. `public` stays at the top level, because unauthenticated requests do not belong to any collection.

```ts
export default defineConfig({
  roles: defineRoles({
    collections: {
      users: {                                   // the admin team
        admin:  "*",
        editor: { posts: ["read", "create", "update:own", "submit"] },
      },
      customers: {                               // application users
        member: { orders: ["read:own", "create"], posts: ["read:published"] },
      },
    },
    public: { posts: ["read:published"] },       // unauthenticated, project-wide
  }),
})
```

Rules:

- **`public` is always top level.** It is the principal for requests with no signed-in user (the same idea as Directus's null role). It is never inside a collection.
- **The grouped form uses an explicit `collections` key**, so a role that happens to share a collection's slug is never ambiguous.
- **Flat form requires exactly one auth collection.** With two or more, the flat form is a config error that tells you to use `collections`.
- **Keys under `collections` are validated** against collections that have `auth` enabled.
- **Role names are unique within a collection only.** `users:admin` and `customers:admin` are different roles. Internally the id is `<collection>:<role>`, and `public` is stored as `public`.
- **A user's permissions come only from roles defined for their own collection**, found through `user.collection` (already in the JWT). A `customers` user can never inherit a `users` role.
- **The `roles` field** (via `defineRolesField` or a plain select) lives on each auth collection, and its options are generated from that collection's roles.
- **Config mirrors storage.** Each entry here becomes one row in `__roles`. What you write, what is stored and what the matrix shows are the same list.

### Grant syntax

| Written as | Means |
|---|---|
| `"*"` (whole role) | Every permission in the catalog |
| `posts: "*"` | Every action on `posts` |
| `"read"` | `posts.read`, unrestricted |
| `"update:own"` | `posts.update` on documents the user owns |
| `"read:published"` | `posts.read` on documents in a published state |
| `{ policy: "sameTenant" }` | Delegate this action to a named policy |
| `{ where: { status: { equals: "open" } } }` | Explicit row filter |

Rules of the syntax:

- **Additive only.** A role can only add permissions. There is no `deny`. A user's permissions are the union over all their roles. (Directus makes the same choice. It is the easiest model to reason about, and it removes the "which one wins" class of bugs.)
- **Names are validated** against the catalog at config load. An unknown permission or an unknown collection is an error with the config path.
- **Wildcards:** `"*"` is supported for a whole role and per resource (`posts: "*"`). Named resource groups are deferred (Q5).

### Defaults apply only to the admin auth collection

Default roles and default grants exist to give a new project a working admin. They are applied **only to the auth collection that signs in to the admin (`adminAuth`)**.

| Role | Grants (admin auth collection only) |
|---|---|
| `admin` | everything, including `roles.manage` |
| `editor` | read, create, update on all collections |
| `viewer` | read on all collections |

This matches the options `defineRolesField` already ships (`admin`, `editor`, `viewer`).

**Every other auth collection (for example `customers`) gets no defaults.**

- No default roles are created, and no default grants are applied.
- The developer defines which roles exist and what each can do. Nothing is assumed about application users.
- A collection with no roles defined behaves exactly as it does today (legacy rules, then the project default in Q4).
- The matrix still shows these collections, and admins can edit their roles (Q1), but there is nothing pre-filled to edit.
- The `roles` field on such a collection has no generated default options. Its options come only from the roles the developer defined.

The reason is that application users are the developer's product, not the admin team. Role names like `editor` or `viewer` mean something specific in an admin and would be a wrong guess for a customer base.

### Role assignment

Users are assigned roles through the existing `roles` field on **their own** auth collection. That field's option list is **generated from the role definitions**, so the two cannot drift. The self-elevation protection that `defineRolesField` has today (only `adminRole` may change the field) carries over to the admin UI and API unchanged.

## 6. Resolution

One function answers every check: `can(user, permission, context)`. Internally it returns `{ allowed, constraint?, source }`.

### Source order

For a request, Dyrected first picks the **role namespace** from `user.collection` (or `public` when unauthenticated). Then sources are consulted in this order, and the **first source that has an opinion decides**:

1. **Explicit resource rule.** A legacy `access.<operation>` on the collection, global, or field (§7). If present, it decides. This keeps every existing project exactly as it is.
2. **Role grants.** The union of grants across the user's roles **in their auth collection**, plus `public`.
3. **Legacy workflow mapping.** `workflow.roles` and `user.capabilities` (§7).
4. **Project default.** Allow or deny when nothing matched (Q4).

Result shape is unchanged: `{ allowed: boolean, constraint?: where }`. Row-level scopes become the `constraint`, exactly as function rules return a `where` object today.

### Why "explicit rule wins"

It is the only order that guarantees **zero behavior change** for existing projects: a project with no `roles` has no step 2, so steps 1, 3 and 4 behave as they do now. It also gives developers a documented escape hatch.

### The trap, and how it is closed

If a collection still has a legacy rule and the developer also adds role grants, the rule silently wins and the grant looks broken. This is the single biggest usability risk in this design. It is mitigated three ways, all required (not optional):

1. **Matrix shows the source.** Each cell is labelled `role grant`, `collection rule`, `workflow mapping`, or `default`. A cell overridden by a legacy rule shows both.
2. **`dyrected access explain`** (§9) prints the decision path for any user and permission.
3. **Dev-time warning.** At startup, if a permission is granted by a role but overridden by a rule, warn once with the config path.

## 7. Backward Compatibility

### Guarantees

1. **Additive.** `roles` is optional. A project that never adds it behaves exactly as today.
2. **No removed or renamed public config keys** in a minor release. Everything in the table below stays valid.
3. **Identical results.** For any project with no `roles`, every access decision is bit-for-bit what it is today. This is verified by a parity test suite (§13).
4. **Deprecation is opt-in and never an error.** A new lint (`dyrected access analyze`) reports legacy constructs. Nothing warns by default at runtime.
5. **Support window:** legacy constructs remain supported for at least the next major version.

### What maps to what

| Today | Behavior under this spec |
|---|---|
| `access: { read: true }` on a collection | Unchanged. Source 1. |
| `access: { update: "'editor' in user.roles" }` | Unchanged. Source 1. Reported by `analyze` as convertible to a role grant. |
| `access: { update: ({ user }) => … }` | Unchanged. Source 1. Reported as `custom`. |
| `access: { read: { policy: "isAdmin" } }` | Unchanged. A grant can also reference the same policy. |
| `accessPolicies` | Unchanged. Still the registry of named rules. |
| Field-level `access` | Unchanged. Out of scope for the matrix in v1. |
| Navigation and view `access` | Unchanged. If absent, visibility derives from the permission it points at. |
| `workflow.roles: [{ role, capabilities }]` | Unchanged. Source 3. |
| `transition.requiredCapabilities: ["entry.publish"]` | Unchanged. See alias rule below. |
| `user.capabilities` (stored on the user) | Unchanged. Recognized as direct permission grants. |
| `defineRolesField({ roles: [...] })` | Unchanged. If `roles` is also defined, the two lists are reconciled (see below). |
| `user.roles` / `user.role` | Unchanged. Roles resolve by string, as today. With `roles` defined, the string is looked up in the namespace of `user.collection`. |
| Multiple auth collections | Unchanged. A collection with no entry under `roles` behaves exactly as today. Adding roles for one collection never changes another. |

### Alias rule for legacy capabilities

Legacy capabilities are global (`entry.publish`). New permissions are per resource (`posts.publish`). A transition is allowed if the user holds **either**:

- the new permission `<slug>.<transition>`, or
- every legacy capability in its `requiredCapabilities`.

This lets a workflow keep working untouched while its roles are migrated one at a time.

### Reconciling `defineRolesField` and `roles`

- If only `defineRolesField` options exist: unchanged.
- If only `roles` exists: the field's options are generated from role names.
- If both exist and differ: `roles` wins for options, and a warning lists the names that appear in only one place.

### The migration path for one project

1. Upgrade. Nothing changes.
2. Run `dyrected access analyze`. Read-only report (§9).
3. Add `roles` for what the analysis flagged as convertible. Behavior is unchanged because legacy rules still win.
4. Remove the now-redundant legacy rules, one collection at a time. `explain` and the matrix show each step.
5. Optional: remove workflow `roles`/capabilities when all transitions are covered by grants.

## 8. Storage, Editing and Drift

### Model

```
config (roles) ──seed──►  stored roles (database)  ──edit in admin──►  stored roles (database)
                                      │
                                      ▼
                       resolved permissions (used by enforcement)
```

- Config provides the initial roles, versioned with the code.
- The database holds the live roles. Enforcement reads stored roles, never config directly.
- An internal system collection `__roles` (added to `INTERNAL_SYSTEM_COLLECTIONS`) holds one document per role: `{ id: "<authCollection>:<role>" | "public", authCollection: string | null, name, label, description, grants, source, seedHash, updatedAt, updatedBy }`. The `public` row has `authCollection: null`, mirroring how Directus represents public access as the absence of a role.

### Drift behavior

| Situation | Behavior |
|---|---|
| Role not in storage | Create from config. |
| In storage, never edited in admin | Update from config when `seedHash` changes. |
| In storage, edited in admin | Keep the stored value. The admin shows "config differs", with a diff and a "reset to config" action. |
| In storage, removed from config | Keep it. Never delete automatically. |

### What administrators can edit

| Editable in the admin | Not editable in the admin |
|---|---|
| Role label and description | The catalog itself (derived from config) |
| Which catalog permissions a role grants | A `custom` policy body (code) |
| Scope on a grant (`own`, preset filters) | Collection-level legacy rules |
| Which users hold which role | |

A cell that is decided by a legacy rule or custom policy is shown read-only with its source.

## 9. Tooling

Tooling is part of the feature, not an addition. The model is only "easy" if mistakes are visible.

| Command | Purpose |
|---|---|
| `dyrected access analyze` | Read-only. For every permission, shows who can do it today and why, and classifies each legacy rule as `declarative` (convertible), `custom` (function or complex policy), or `redundant`. |
| `dyrected access migrate` | Generates a `roles` definition from the declarative rules the analysis found. Dry-run by default. With `--write`, it also removes the redundant legacy rules it converted. It never touches `custom` rules. |
| `dyrected access explain --user <id> --permission posts.update [--doc <id>]` | Prints the full decision path: each source consulted, whether it had an opinion, and the result. |
| `dyrected access matrix` | Prints the role-by-permission matrix to the terminal, with sources. |

`explain` output (illustrative):

```
posts.update  user: maria (roles: editor)  doc: 42
  1. collection rule   → none
  2. role grants       → editor: update:own  → allowed, constraint { authorId == maria }
  3. workflow mapping  → not consulted
  Decision: ALLOWED for documents where authorId == maria   [source: role grant "editor"]
```

## 10. Enforcement and API

### Enforcement

- One resolution path, extending `resolveCollectionAccess` / `isAccessAllowed`.
- Applies uniformly to REST, hooks, relationship expansion, join fields, search, workflow transitions and AI tools. Any path that bypasses it today is a bug to fix here.
- **Fail closed.** An unknown role, unreadable stored role or failing policy denies, as `evaluateAccess` does now.
- **Cached.** Roles are small and read on every request, so they are cached in memory with a version counter in the database for invalidation across instances (Q9).
- **Lockout guard.** The last holder of `roles.manage` cannot lose it, and a project must always have at least one administrator. This applies to the auth collection that signs in to the admin (`adminAuth`), not to application-user collections.

### API (internal namespace, requires `roles.manage`)

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/__roles?authCollection=users` | List roles for one auth collection, with grants and member counts |
| `POST` | `/api/__roles` | Create a role |
| `PATCH` | `/api/__roles/:id` | Edit label, description, grants |
| `DELETE` | `/api/__roles/:id` | Delete (blocked while users hold it) |
| `POST` | `/api/__roles/:id/reset` | Reset to config seed |
| `GET` | `/api/__access/matrix?authCollection=users` | Resolved matrix by role or by resource, with sources |
| `POST` | `/api/__access/check` | Batched server-evaluated checks for `useAccess` |
| `GET` | `/api/__access/explain` | Same as the CLI `explain` |

Role assignment uses the existing user collection API, protected by the same self-elevation rule.

## 11. Admin UI

### Choosing the auth collection

The Roles screen starts with a selector for the auth collection (`Users`, `Customers`). Each collection has its own role list, matrix and members. A project with one auth collection does not show the selector.

### By role

```
Roles · Users ▾        Editor     Writes and publishes content            [Reset to config]
─────
Administrator  (1)     Resource   Read   Create  Update   Delete   Submit   Publish
Editor         (6) ◄   posts       ✓      ✓      Own      –        ✓        –
Publisher      (2)     media       ✓      ✓      –        –
Viewer         (14)    guests      ✓      –      –        –
                       exports     Custom: canExport

                       Members   maria · tunde · +4        [Add member]
```

### By resource

```
posts       Role          Read   Create  Update   Delete   Submit   Publish
            Administrator  ✓      ✓      ✓        ✓        ✓        ✓
            Editor         ✓      ✓      Own      –        ✓        –
            Publisher      ✓      –      ✓        –        –        ✓
```

### Behavior

- Cells are `granted`, `scoped`, `custom` (read-only) or empty. There is no deny state.
- Hovering a cell shows its **source**. A cell overridden by a legacy rule shows the rule and the path to it.
- Changes are collected as a pending diff and applied together. Every change writes an audit entry.
- The **role page doubles as the user assignment screen**, so "who has this role" and "what can it do" are one screen.

## 12. Open Questions

Every question below is decided. Items marked *accepted* adopt the recommendation shown.

### Product

**Q1. Who may edit roles?** *Decided.*
Role editing is governed by the permission system itself, through a regular permission, `roles.manage`.

- **Default:** the `admin` role holds `"*"`, which includes `roles.manage`, so by default whoever is an admin can edit roles.
- **Project-wide:** `roles.manage` is not tied to one collection. A holder can edit the roles of **every** auth collection, including application-user collections such as `customers`.
- **Configurable:** because it is a normal permission, a project can grant it to another role (`moderator: { roles: ["manage"] }`) or take it away from one, like any other permission. Nothing is inferred from a role being named `admin`.
- **Visible:** the matrix shows `roles.manage` as a column like any other, so "who can change permissions?" is answerable in the same screen.

**Q2. When config and stored roles disagree, who wins?** *Decided (recommendation accepted).*
*Recommendation:* stored wins, with a visible diff and a reset action (§8). Config-always-wins destroys administrators' work; stored-always-wins makes config feel broken.

**Q3. Permission syntax: nested object or dotted strings?** *Decided: nested.*
Config uses the nested form: `posts: ["read", "publish"]`. It reads like a table. Internally, logs and APIs use the dotted form (`posts.publish`), which is unambiguous. Both forms are accepted as input.

**Q4. Default when nothing matches?** *Decided: deny by default.*
When the role system is in use and no source grants a permission, the request is denied. This is the default for the new model and for new projects.

*Compatibility (confirmed):* a project that has **not** adopted `roles` keeps today's behavior, where an unset rule is open, because §7 guarantees identical results for existing projects. The deny default begins once a project defines `roles` (per auth collection). Without that carve-out, upgrading would silently lock existing projects out.

**Q5. Wildcards and resource groups?** *Decided: `"*"` is in.*
The `"*"` wildcard is supported at both levels: `"*"` for a whole role, and `posts: "*"` for every action on one resource. Named resource groups (`content.*`, a set of collections under one name) are **not** part of the first release and will be added when a real project shows the repetition.
*Confirmed:* the wildcard is what ships. Resource groups stay deferred.

**Q6. Are navigation items and custom pages permissions?** *Decided.*
- **Navigation items that point at a collection** follow that collection's permission (`<slug>.read`). If the user can read it, the item shows. There is no separate nav permission to maintain.
- **Custom pages** declare their own permission, so a developer decides who can see each page. It appears in the catalog and the matrix like any other permission, for example `pages.door-checkin`.
- **Navigation groups** show when at least one item inside them is visible.

**Q7. How is `own` resolved?** *Decided (recommendation accepted).*
*Recommendation:* a per-collection owner field declaration, defaulting to `createdBy`, with explicit `where` for anything else.

**Q7a. Which collection may manage roles?** *Decided: any, through `roles.manage`.*
There is no per-collection restriction. Admins edit roles for all auth collections. In practice the editors of roles are users of the collection that signs in to the admin (`adminAuth`), because that is who can reach the admin UI.
*Deferred refinement:* scoping the permission (for example `roles.manage` only for `customers`) if a real need appears.

**Q7b. Can a role span collections?** *Resolved: no.*
A role belongs to exactly one auth collection. If two collections need the same grants, define the role in each, or reuse a plain object in config. This keeps ownership and assignment unambiguous.

**Q7c. Should application-user collections have roles editable by admins?** *Decided: yes.*
Admins can edit roles for all auth collections, shown with the collection selector in the Roles screen.

**Q1a. Can a role editor grant permissions they don't hold?** *Decided: no (recommendation accepted).*
For example, a moderator with `roles.manage` adding `posts.delete` to their own role.
*Recommendation:* no. A user may only grant permissions they hold themselves, and may not edit a role they hold to widen it. Holders of `"*"` (admins) are unrestricted. This stops `roles.manage` from becoming a quiet way to escalate, and it costs nothing for the default admin case. Needs your decision.

### Technical

**Q8. Per-user grants?** *Decided: out of scope (recommendation accepted).*
*Recommendation:* out of scope. Model it as a role with one member.

**Q9. Cross-instance cache invalidation?** *Decided (recommendation accepted).*
*Recommendation:* a version counter in the database, checked on a short interval, plus in-memory cache. No new infrastructure.

**Q10. Where do stored roles live in Dyrected Cloud?** *Resolved: in the database.*
Roles are rows in the project's database, in Cloud exactly as in self-hosted. Enforcement reads the same `__roles` collection through the same resolution path, so there is no Cloud-specific storage design. Function rules and function policies are expected to run in Cloud as well, so nothing in this model is restricted to self-hosted.

**Q11. Capability rename.** *Decided (recommendation accepted).*
Legacy `entry.*` stays working through the alias rule (§7). Do we document a deprecation timeline?
*Recommendation:* document `entry.*` as legacy, warn only in `analyze`, and decide removal at the next major.

### Deferred (explicitly)

- **Field-level permissions** in the matrix. Field `access` keeps working as today.
- **Time-bound or conditional roles.**
- **Importing and exporting roles** between environments.
- **How config itself is stored and loaded.** This spec assumes config remains code.
- **Preview as role** in the admin. Valuable, and built on `explain`, but not in the first release.

## 13. Is This Clean and Easy? An Honest Assessment

The design is not yet proven. These are the risks, in order of severity, and how each is handled.

| Risk | Why it matters | Mitigation |
|---|---|---|
| **Precedence confusion.** A leftover collection rule silently beats a role grant. | The most likely "why doesn't this work?" moment. | Source labels in the matrix, `explain`, startup warning (§6). **All three are release blockers.** |
| **Two ways to do everything** for as long as legacy exists. | Docs and examples can contradict. | Docs lead with roles only. Legacy lives on a "Migrating" page and in `analyze`. |
| **Catalog depends on config**, so typed permission names need a generation step. | Autocomplete is stale until codegen runs. | Reuse the existing `dyrected-types.ts` generation. Names are also validated at load, so correctness does not depend on types. |
| **Syntax invention** (`update:own`, `read:published`). | A mini-language to learn. | Keep it to exactly two suffixes. Everything else is an object. Provide autocomplete. |
| **Verbosity in large projects.** | 30 collections × 4 roles is a long table. | `"*"`, per-resource `"*"`, and defaults. Resource groups if needed (Q5). |

### Validate before building

1. **Paper prototype.** Rewrite the access setup of two real apps (including `thesweetunion`) in this syntax. Count lines. If a typical blog with editor and publisher is not ten lines or fewer with no collection `access`, the model needs revisiting.
2. **Parity suite.** Snapshot every access decision for those apps under the current engine, then assert identical results with the new engine and no `roles`.
3. **Three developers, one task.** Give three developers who have not seen this spec the docs and ask each to add a "moderator" role. Record where they get stuck.

### Success criteria

- A new project reaches a working three-role setup by writing one `roles` block.
- `explain` can answer any "why was this denied?" in one command.
- Zero parity failures on existing apps with no `roles`.
- No example in the docs mixes both models without saying so.

## 14. Implementation Plan

**Phase 0: visibility (no behavior change).** `dyrected access analyze` and `matrix`, plus the paper prototype and parity suite. Ships first and informs everything else.

**Phase 1: model.** Permission catalog, `defineRoles`, validation, resolution with the §6 source order, compatibility layer, `explain`.

**Phase 2: runtime editing.** `__roles`, seeding and drift, API, matrix and role-assignment UI, `useAccess` check endpoint, lockout guard, audit entries.

**Phase 3: migration.** `dyrected access migrate`, docs rewrite (including the "no global role registry" statement in the access-control overview), `new project` template with deny-by-default.

**Phase 4: Cloud verification.** Run the parity and enforcement suites against a Cloud-hosted project.

## 15. Testing

- **Defaults scope:** with no `roles` defined, the admin auth collection gets the default roles and grants, and other auth collections get none and behave as legacy.
- **Namespaces:** same role name in two auth collections resolves independently, a user never receives another collection's role, `public` applies to unauthenticated requests only, a collection with no entry behaves as legacy.
- **Parity:** no `roles` defined, every decision identical to the current engine across the sample apps.
- **Resolution:** each source order case, additive union across roles, scoped grants, public role, fall-through, default.
- **Compatibility:** each row of the §7 table, plus the alias rule and `defineRolesField` reconciliation.
- **Catalog:** every collection, global, transition and action produces the expected permission names. Invalid names fail at load with the config path.
- **Seeding and drift:** first run, unchanged config, changed config without override, changed config with override, role removed from config.
- **Enforcement parity** across REST, hooks, relationship expansion, join, search, workflow transitions and AI tools.
- **Fail closed:** unknown role, corrupt stored role, throwing policy.
- **Lockout:** the last `roles.manage` holder cannot be demoted.
- **Security:** a user without `roles.manage` cannot read or write roles through any path, including the generic collection API.
- **Role editing scope:** a holder of `roles.manage` can edit roles of every auth collection. A user cannot grant a permission they do not hold (Q1a).
- **Configurable manager:** granting `roles.manage` to a non-admin role works, and removing it from `admin` is blocked when it would leave no holder.
- **Tooling:** `analyze` classification, `migrate` dry-run output and `--write` idempotence, `explain` for each source.
