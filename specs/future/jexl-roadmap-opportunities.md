# JEXL Declarative Expressions — Future Opportunities & Roadmap

## Overview

Dyrected leverages [JEXL (Javascript Expression Language)](https://github.com/TomFrost/Jexl) to deliver declarative, JSON-serializable logic across the CMS. Because JEXL expressions are pure strings, schemas remain fully compatible with **Dyrected Cloud sync**, API transmission, and multi-framework frontends (React, Next.js, Vue, Nuxt) without transmitting unsafe JavaScript functions.

This specification documents high-impact candidate features for extending Dyrected's JEXL evaluation engine across field validation, computed values, workflow automation, cascading filters, and dynamic Admin UI presentation.

---

## 1. Cross-Field Validation & Custom Constraints (`admin.validate` / `field.validate`)

### The Problem

Currently, basic field validation is limited to primitive schema constraints (`required`, `min`, `max`, `pattern`). When validation depends on another field (e.g., `salePrice < price`, `endDate >= startDate`, or `couponCode` required only if `discountType == 'code'`), developers have to write imperative server hooks.

Furthermore, a single field often needs **multiple validation rules** with distinct, targeted error messages rather than a generic failure alert.

### Proposed Specification

Support `validate` as either a **single rule** or an **array of distinct validation rules**, each pairing a JEXL condition with a specific error message:

```typescript
import { defineNumberField, defineDateField, defineTextField, when } from "@dyrected/core";

// 1. Array of granular validation rules with targeted messages
export const SalePriceField = defineNumberField({
  name: "salePrice",
  label: "Sale Price",
  admin: {
    validate: [
      {
        rule: when("salePrice").greaterThan(0),
        message: "Sale price must be a positive number.",
      },
      {
        rule: when("salePrice").lessThan("price"),
        message: "Sale price must be strictly less than the regular price ($price).",
      },
      {
        rule: when.then(
          when.fieldNotEmpty("saleEndDate"),
          when.fieldNotEmpty("salePrice"),
          true
        ),
        message: "Sale price cannot be empty when a sale end date is specified.",
      },
    ],
  },
});

// 2. Date range validation with helper syntax
export const EventDates = defineDateField({
  name: "endDate",
  label: "End Date",
  admin: {
    validate: [
      {
        rule: when("endDate").greaterThanOrEqual("startDate"),
        message: "Event end date cannot be earlier than the start date.",
      },
      {
        rule: when.then(
          when("isMultiDay").isTrue(),
          when("endDate").greaterThan("startDate"),
          true
        ),
        message: "Multi-day events must span across different calendar dates.",
      },
    ],
  },
});

// 3. Shorthand for single-rule validation
export const CouponCodeField = defineTextField({
  name: "couponCode",
  label: "Coupon Code",
  admin: {
    validate: {
      rule: when.then(
        when("requiresCoupon").isTrue(),
        when.fieldNotEmpty("couponCode"),
        true
      ),
      message: "Coupon code is required when coupon discount is enabled.",
    },
  },
});
```

### Key Features

1. **First-Failing Message**: Validation evaluates sequentially in the Admin form and API; the first unmet rule displays its exact, user-friendly message.
2. **Dynamic Error Message Templating**: Error messages can reference document field names (e.g. `"$price"` or `"${price}"`) to produce dynamic, contextual feedback like *"Sale price must be less than $100"*.
3. **Compound Rule Combinations**: Use `when.all(...)`, `when.any(...)`, and `when.then(...)` within individual rules for complex conditional validation without writing custom JavaScript validators.

### Execution Model

- **Client-side (Admin Form Engine)**: Evaluated during React Hook Form validation cycles against `{ value, siblingData, formValues, user }`. Attaches errors directly to the corresponding field input and the global validation error summary banner.
- **Server-side (API Mutations)**: The core mutation controller evaluates the identical rule set before persistence, returning structured 422 Unprocessable Entity error payloads with the field-specific error messages.

---

## 2. Computed & Derived Fields (`field.computed`)

### The Problem
Fields like URL slugs, display titles, full names, and order totals often derive directly from other fields. Today, users either manually copy values or write custom `beforeChange` hooks that do not update the Admin UI in real-time.

### Proposed Specification

Add a `computed` expression property to field definitions:

```typescript
import { defineTextField, defineNumberField, when } from "@dyrected/core";

// 1. Slug auto-generated from title
export const SlugField = defineTextField({
  name: "slug",
  label: "URL Slug",
  computed: when.slugify("title"),
  admin: {
    readOnly: true, // or editable until explicitly unlocked
  },
});

// 2. Full name derived from first + last name
export const FullNameField = defineTextField({
  name: "fullName",
  label: "Full Name",
  computed: "firstName + ' ' + lastName",
});

// 3. Computed line-item total
export const TotalField = defineNumberField({
  name: "total",
  label: "Line Total",
  computed: "price * quantity * (1 - (discount || 0) / 100)",
});
```

### Execution Model
- **Live Preview in Admin**: `FormEngine` watches referenced fields (via AST inspection of the JEXL expression) and updates the computed field in real time.
- **Server Re-computation**: The server re-evaluates `computed` on save to guarantee data integrity even when mutated via direct REST/GraphQL API.

---

## 3. Cascading & Dependent Field Filtering (`optionsFilter` / `admin.filter`)

### The Problem
When building relational forms (such as selecting a City based on a chosen Country, or selecting a Model based on a chosen Make), authors currently have to query all options and filter manually with complex custom components.

### Proposed Specification

Add JEXL filter expressions to `relationship` and `select` fields:

```typescript
import { defineRelationshipField, defineSelectField } from "@dyrected/core";

export const StateField = defineRelationshipField({
  name: "state",
  label: "State / Province",
  relationTo: "states",
  admin: {
    // Only load states where country matches the parent document's selected country
    optionsFilter: "country == siblingData.country",
  },
});

export const CityField = defineRelationshipField({
  name: "city",
  label: "City",
  relationTo: "cities",
  admin: {
    optionsFilter: "state == siblingData.state",
  },
});
```

### Execution Model
- When `siblingData.country` changes, the Admin select component re-queries `/api/states?where=...` with the evaluated JEXL condition serialized to a query parameter.

---

## 4. Workflow Transition Guards (`workflow.transitions[].when`)

### The Problem
Content workflows (e.g. moving a document from `draft` $\rightarrow$ `in_review` $\rightarrow$ `published`) frequently need gatekeeping rules: "Cannot publish unless SEO fields are filled, at least 3 blocks are created, and user has the Editor role."

### Proposed Specification

Attach declarative `when` guard conditions to workflow status transitions:

```typescript
import { defineCollection, when } from "@dyrected/core";

export const Articles = defineCollection({
  slug: "articles",
  workflow: {
    statuses: ["draft", "in_review", "published", "archived"],
    transitions: [
      {
        from: "draft",
        to: "in_review",
        // Guard: Title must be present and body/blocks must not be empty
        when: when.all(
          when.fieldNotEmpty("title"),
          when.arrayNotEmpty("blocks")
        ),
        message: "Article must have a title and at least one content block before review.",
      },
      {
        from: "in_review",
        to: "published",
        // Guard: Must have editor/admin role AND populated SEO metadata
        when: when.all(
          when.access.hasRole("admin", "editor"),
          when.fieldNotEmpty("seo.title"),
          when.fieldNotEmpty("seo.description")
        ),
        message: "Only editors and admins can publish articles with complete SEO metadata.",
      },
    ],
  },
  fields: [ ... ],
});
```

### Execution Model
- **Admin UI**: The "Publish" or "Submit for Review" button is automatically disabled (with a tooltip explaining the unmet rule) until all JEXL guard conditions evaluate to `true`.
- **API Guard**: The PATCH/PUT status endpoint verifies the transition guard before allowing status update.

---

## 5. Dynamic Badges, Colors & Table Row Highlighting in Admin Tables (`admin.badge` / `admin.rowClass`)

### The Problem
Admins reviewing table lists (e.g., Orders, Subscriptions, Issues) need visual cues for overdue dates, negative balances, high priority tickets, or inactive statuses without building custom React cell renderers for every column.

### Proposed Specification

Allow collections and fields to declare dynamic badge styles using `when.match()` / `when.cases()`:

```typescript
import { defineCollection, when } from "@dyrected/core";

export const Orders = defineCollection({
  slug: "orders",
  admin: {
    // Dynamic status badge color mapping
    badge: when.match()
      .case(when("status").equals("completed"), "'success'")
      .case(when("status").equals("processing"), "'primary'")
      .case(when("status").equals("failed"), "'destructive'")
      .case(when("status").equals("refunded"), "'warning'")
      .otherwise("'secondary'"),

    // Conditional row highlight class in data grid
    rowClass: when.then(when("total").greaterThan(10000), "'font-bold bg-primary/5'", "null"),
  },
  fields: [ ... ],
});
```

### Execution Model
- The spreadsheet and data table views (`packages/admin/src/pages/collections/views`) evaluate `admin.badge` per row item against `{ ...item, user }` to render color badges and styles instantly.

---

## 6. Webhook & Automation Dispatch Filters (`hooks.webhooks[].when`)

### The Problem
Setting up outgoing webhooks often triggers extraneous HTTP traffic on every minor draft update or autosave, forcing destination servers to filter noise.

### Proposed Specification

Add declarative `when` filters to webhook declarations:

```typescript
export const NewsArticles = defineCollection({
  slug: "newsArticles",
  hooks: {
    webhooks: [
      {
        url: "https://api.push-notifications.com/broadcast",
        method: "POST",
        // Only trigger webhook when status changes to 'published' AND is marked 'breakingNews'
        when: when.all(
          when("status").equals("published"),
          when.fieldIsTrue("breakingNews")
        ),
      },
    ],
  },
  fields: [ ... ],
});
```

---

## 7. Dynamic Default Value Expressions (`field.defaultExpr`)

### The Problem
Static `defaultValue` cannot populate dynamic runtime values like defaulting author to current user ID or timestamping a custom initial date.

### Proposed Specification

```typescript
defineRelationshipField({
  name: "author",
  label: "Author",
  relationTo: "users",
  defaultExpr: "user.id",
});

defineTextField({
  name: "organization",
  label: "Organization",
  defaultExpr: "user.organization || 'Individual'",
});
```

---

## Summary Matrix

| Feature | Primary Context | Value Provided |
| :--- | :--- | :--- |
| **`admin.validate`** | `{ value, siblingData, formValues, user }` | Eliminates custom backend validation hooks for cross-field business logic. |
| **`field.computed`** | `{ formValues, siblingData, user }` | Auto-calculates slugs, totals, and composite strings live in Admin & API. |
| **`optionsFilter`** | `{ siblingData, formValues, user }` | Declarative cascading dropdowns and relational filters. |
| **`workflow.guards`** | `{ doc, user }` | Prevents unauthorized or incomplete publishing workflows. |
| **`admin.badge`** | `{ doc, user }` | Status chips and row highlighting in Admin grids without custom React code. |
| **`webhooks.when`** | `{ doc, previousDoc, user }` | Precision webhook event filtering. |
| **`defaultExpr`** | `{ user, now }` | Dynamic runtime initialization of document fields. |
