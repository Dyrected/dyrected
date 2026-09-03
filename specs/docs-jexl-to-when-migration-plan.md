# Dyrected Documentation & Knowledge Migration Directive: JEXL to `when` Builder

**Status:** Ready for Review (HITL Verification Gate)  
**Author:** Technical Documentation Team  
**Governing Standard:** [`apps/docs/DOCS_PHILOSOPHY.md`](file:///Users/busola/Work/dyrected/apps/docs/DOCS_PHILOSOPHY.md) & [`AGENTS.md`](file:///Users/busola/Work/dyrected/AGENTS.md)

---

## 1. Executive Summary & Intent

Dyrected provides the type-safe `when` builder (`@dyrected/core` / `@dyrected/sdk`) as the **recommended, first-class standard** for authoring conditional UI fields, block variants, live preview URLs, declarative access control policies, and reactive field hooks.

While Dyrected continues to support raw JEXL strings under the hood, raw strings are error-prone, lack autocomplete, and require manual quotation management.

Per our **Opinionated Defaults, Visible Escape Hatches** philosophy (Doc Philosophy Rule #4):

1. **Primary Standard**: All guide prose, quickstarts, tutorials, and `@dyrected/knowledge` recipes will feature the `when` builder as the default.
2. **Escape Hatch**: Retain exactly one canonical explanation of raw JEXL string expressions in [`declarative-expressions.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/content-rules/declarative-expressions.mdx) for advanced users who need direct string serialization or dynamic expression generation.

---

## 2. Source Inventory & Impacted Areas

| Category | File / Path | Current Pattern | Required Target Pattern |
| :--- | :--- | :--- | :--- |
| **Doc: Block Variants** | [`content/docs/model-content/fields/blocks.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/fields/blocks.mdx) | `condition: "variant == 'card'"` | `condition: when.variant('card')` |
| **Doc: Collections** | [`content/docs/model-content/configuration/collections.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/configuration/collections.mdx) | `previewUrl: "slug == 'home' ? '/' : '/' + slug"` | `previewUrl: when.then(when('slug').equals('home'), '/', "'/' + slug")` |
| **Doc: Field Conditions** | [`content/docs/examples-and-recipes/library/conditional-admin-field.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/examples-and-recipes/library/conditional-admin-field.mdx) | `condition: "couponCode != null && couponCode != ''"` | `condition: when.fieldNotEmpty('couponCode')` |
| **Doc: Access Control** | [`content/docs/model-content/content-rules/access-control/fields.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/content-rules/access-control/fields.mdx) | `read: "user.role == 'admin'"` | `read: when.access.isAdmin()` or `when.userRole('admin')` |
| **Doc: Declarative Expressions** | [`content/docs/model-content/content-rules/declarative-expressions.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/content-rules/declarative-expressions.mdx) | Only raw JEXL strings | Teach `when` builder and transform helpers first; show raw JEXL in "Under the hood" |
| **Doc: Form & Field Hooks** | [`content/docs/editor-experience/form-and-field-hooks.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/editor-experience/form-and-field-hooks.mdx) | `onChange: "slugify(siblingData.title)"` | `onChange: when.slugify('siblingData.title')` + built-in helper functions |
| **Doc: Live Preview & `useDyPath`** | [`content/docs/editor-experience/publishing/live-preview/client-side.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/editor-experience/publishing/live-preview/client-side.mdx) | `useDyPath('field')` called multiple times | `const dy = useDyPath()` called once; `{...dy('field')}` in JSX / `v-bind="dy('field')"` in Vue |
| **Doc: React Guide** | [`content/docs/guides/react/adding-a-visual-editor-in-reactjs.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/guides/react/adding-a-visual-editor-in-reactjs.mdx) | `useDyPath('heading')` | `const dy = useDyPath()` with `{...dy('heading')}` |
| **Doc: Nuxt Guide** | [`content/docs/guides/nuxt/adding-a-visual-editor-in-nuxtjs.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/guides/nuxt/adding-a-visual-editor-in-nuxtjs.mdx) | `useDyPath('heading')` | `const dy = useDyPath()` with `v-bind="dy('heading')"` |
| **Doc: Vue Guide** | [`content/docs/guides/vue/adding-a-visual-editor-in-vuejs.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/guides/vue/adding-a-visual-editor-in-vuejs.mdx) | `useDyPath('heading')` | `const dy = useDyPath()` with `v-bind="dy('heading')"` |
| **Doc: Detail Views** | [`content/docs/editor-experience/detail-view.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/editor-experience/detail-view.mdx) | `visible: "doc.status == 'published'"` | `visible: when('status').equals('published')` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/conditional-admin-field/recipe.ts` | `condition: "couponCode != null && couponCode != ''"` | `condition: when.fieldNotEmpty("couponCode")` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/auto-slug/recipe.ts` | Imperative / raw string hook | `onChange: when.slugify("siblingData.title")` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/owner-or-admin-access/recipe.ts` | Raw strings / functions | `when.any(when.access.isOwner('author'), when.access.isAdmin())` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/role-based-access/recipe.ts` | Raw strings / functions | `when.access.hasRole('admin', 'editor')` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/owner-scoped-access/recipe.ts` | Raw strings / functions | `when.access.isOwner('author')` |
| **Knowledge: Recipes** | `packages/knowledge/src/recipes/preview-url-token-mode/recipe.ts` | Raw string concatenation | `when.concat('/preview/', 'id', '?token=', 'previewToken')` |
| **Knowledge: Prompt Templates** | `packages/knowledge/src/prompt-templates/ai-rules.template.md` | "Use serializable Jexl conditions" | "Use type-safe `when` condition builders (or serializable Jexl strings)" |

---

## 3. Structural Transformation Directives

Following `DOCS_PHILOSOPHY.md`, every updated doc page must adhere to these 5 structural directives:

### Directive 1: Prose Before Code & Task Orientation

Never open with a raw code block or generic API reference. Frame the section around the developer's concrete goal:

````markdown
### Revealing fields conditionally

Some fields only make sense in specific contexts — for example, showing a discount percentage only when a coupon code is entered. Use the `when` builder to declare clean, reactive visibility conditions in your field's `admin` config:

```typescript
import { defineNumberField, defineTextField, when } from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  fields: [
    defineTextField({
      name: "couponCode",
      label: "Coupon code",
    }),
    defineNumberField({
      name: "discountPercent",
      label: "Discount percentage",
      // Reveals this field as soon as couponCode is entered
      admin: {
        condition: when.fieldNotEmpty("couponCode"),
      },
    }),
  ],
});
```
````

### Directive 2: Progressive Depth (Happy Path First, Escape Hatch Below)

Present the `when` builder as the standard, copy-pasteable choice. Place raw JEXL string explanation in an expandable or dedicated lower subsection:

````markdown
### How it works under the hood (JEXL)

The `when` helper produces serializable JEXL expression strings (e.g. `couponCode != null && couponCode != ''`). Because these conditions are pure strings, your schema remains 100% serializable for Dyrected Cloud synchronization and headless API delivery.

If you have advanced requirements that generate dynamic conditions at runtime, you can also pass raw JEXL strings directly:

```typescript
admin: {
  condition: "couponCode != null && couponCode != ''",
}
```
````

### Directive 3: Canonical Mapping Table for Authors

Include this reference table in [`declarative-expressions.mdx`](file:///Users/busola/Work/dyrected/apps/docs/content/docs/model-content/content-rules/declarative-expressions.mdx):

| Use Case | Recommended `when` Builder | Generated JEXL Equivalent |
| :--- | :--- | :--- |
| **Block variant match** | `when.variant('split')` | `variant == 'split'` |
| **Multiple variants** | `when.variant('imageLeft', 'imageRight')` | `variant in ['imageLeft', 'imageRight']` |
| **Field non-empty** | `when.fieldNotEmpty('couponCode')` | `couponCode != null && couponCode != ''` |
| **Field equals value** | `when('status').equals('published')` | `status == "published"` |
| **Set membership** | `when('role').in('admin', 'editor')` | `role in ["admin", "editor"]` |
| **Numerical comparison** | `when('price').greaterThan(100)` | `price > 100` |
| **String prefix/suffix** | `when.fieldStartsWith('slug', 'archived-')` | `startsWith(slug, "archived-")` |
| **Ternary routing** | `when.then(when('slug').equals('home'), '/', "'/' + slug")` | `slug == "home" ? '/' : '/' + slug` |
| **Multi-branch switch** | `when.match().case(c1, v1).case(c2, v2).otherwise(v3)` | `c1 ? v1 : c2 ? v2 : v3` |
| **Admin access check** | `when.access.isAdmin()` | `user.role == 'admin' \|\| ('admin' in user.roles)` |
| **Owner access check** | `when.access.isOwner('author')` | `author == user.id \|\| author.id == user.id` |
| **URL path join** | `when.concat('/news/', 'slug')` | `'/news/' + slug` |

---

## 4. Execution Plan & Sequential Steps

### Step 1: Update `@dyrected/knowledge` Recipes & Prompt Templates

1. Edit `packages/knowledge/src/recipes/conditional-admin-field/recipe.ts` to use `import { when } from "@dyrected/core"` and `when.fieldNotEmpty("couponCode")`.
2. Edit access control recipes (`owner-or-admin-access`, `role-based-access`, `owner-scoped-access`) to use `when.access` and `when.userRole`.
3. Update tests in `packages/knowledge/src/recipes/**/recipe.test.ts`.
4. Re-run `node packages/knowledge/scripts/generate.mjs` to regenerate compiled knowledge artifacts and example records.
5. Verify with `pnpm --filter @dyrected/knowledge test`.

### Step 2: Update Core Documentation Pages (`apps/docs/content/docs`)

1. **`model-content/fields/blocks.mdx`**: Replace raw `"variant == 'card'"` with `when.variant('card')`.
2. **`model-content/configuration/collections.mdx`**: Update preview URL routing examples to use `when.then(...)` and `when.match()`.
3. **`examples-and-recipes/library/conditional-admin-field.mdx`**: Update recipe page to show `when.fieldNotEmpty("couponCode")`.
4. **`model-content/content-rules/access-control/fields.mdx`**: Update field-level access control examples to use `when.access`.
5. **`model-content/content-rules/declarative-expressions.mdx`**: Restructure page with progressive depth:
   - Part 1: Quickstart with `when` builder.
   - Part 2: Common patterns (visibility, preview URLs, access control).
   - Part 3: Under the hood (JEXL specification and raw string escape hatch).
6. **`editor-experience/detail-view.mdx`**: Update operational view `visible` conditions to use `when`.

### Step 3: Verify & Build

1. Run `pnpm --filter docs build` to verify MDX parsing and link integrity.
2. Run `pnpm build:packages` to ensure all knowledge artifacts match runtime schemas.

---

## 5. Human Verification Gate (HITL Questions)

Before applying edits across all doc files, please review and confirm:

1. **`when` import source in documentation**:
   - Default recommendation: `import { when } from "@dyrected/core";` (or `from "@dyrected/sdk"` for standalone SDK consumers).
2. **Placement of raw JEXL escape hatch**:
   - Confirm that confining the raw JEXL string explanation to a single dedicated "Under the hood" section in `declarative-expressions.mdx` is approved.
3. **Recipe updates in `@dyrected/knowledge`**:
   - Confirm that all access control and conditional field recipes should be migrated to `when`.
