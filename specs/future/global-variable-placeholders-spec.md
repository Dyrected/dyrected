# Global Variable Placeholders & Dynamic Interpolation Spec

**Status:** Proposed / Future  
**Package:** `@dyrected/core`, `@dyrected/admin`, `@dyrected/sdk`  
**Inspiration:** Directus Dynamic Variables, Liquid/Mustache Templating, CMS Token Interpolation  

---

## 1. Overview & Problem Statement

In modern websites and content applications, dynamic business variables (e.g., pricing tiers, company phone numbers, support emails, office addresses, platform metrics, discount percentages) are frequently repeated across different content collections:

- **FAQ Entries:** *"How much does Dyrected cost?"* $\rightarrow$ *"Dyrected starts at **$29/mo** for the Starter plan and **$99/mo** for Pro."*
- **Terms & Legal Copy:** *"All notices must be sent to **legal@example.com** or delivered to our office at **123 Innovation Way**."*
- **Dynamic Feature Lists & Banners:** *"Join over **10,000+** developers building with Dyrected."*

### The Problem with Hardcoding
When content editors manually type prices and company details into text fields, rich text, or dynamic lists:
1. Pricing or policy changes require searching through dozens of documents to update strings.
2. Inconsistent and outdated values inevitably persist across forgotten FAQ answers or marketing blurbs.

### The Solution: Global Variable Placeholders
Content authors can insert dynamic variable tokens (e.g. `{{ globals.pricing.starter_price }}` or `{{ pricing.pro_price }}`) inside text inputs, markdown, rich-text, and dynamic lists. When globals update in the CMS, all content referencing those variables updates automatically across the entire site without editing individual documents.

---

## 2. Syntax & Template Expressions

Placeholders use double curly braces `{{ ... }}` and support dot-notation path traversal into configured Globals and context data.

```
{{ globals.<global_slug>.<field_name> }}
{{ <global_slug>.<field_name> }}
```

### 2.1 Basic Global Access
```markdown
# FAQ: What is the price of Dyrected Pro?
Dyrected Pro is available for only {{ globals.pricing.pro_monthly }}/month. 
For annual billing, it is {{ globals.pricing.pro_yearly }}/year (save 20%).
```

### 2.2 Optional Filters / Formatters
Variable expressions can include lightweight pipes for formatting:
```markdown
Our service starts at {{ pricing.base_price | currency('USD') }}.
Contact us at {{ site_settings.support_email | lowercase }}.
Established in {{ company_info.founded_year }}.
```

### 2.3 Fallback / Default Values
If a referenced global field is empty or undefined, a default fallback is rendered instead of a blank or error:
```markdown
Dyrected starts at {{ pricing.starter_price | default('$29') }} per month.
```

### 2.4 Literal Escaping
To output literal double curly braces without interpolation:
```markdown
In Vue or Handlebars, you write \{{ item.title }} to render a property.
```

---

## 3. Dynamic Lists & Structured Blocks

Global placeholders are equally supported within **Dynamic Lists**, **Repeater Fields**, and **Block Components**:

### Example: Dynamic FAQ Collection with Global Pricing
A collection `faqs` contains a repeater field `items` with `question` and `answer`:

```json
{
  "question": "How much does Dyrected cost?",
  "answer": "Our Starter plan is {{ globals.pricing.starter_price }} per month, and our Team plan is {{ globals.pricing.team_price }} per month."
}
```

### Example: Feature Comparison Matrix (Dynamic List)
```json
[
  { "feature": "Storage Limit", "limit": "{{ globals.limits.starter_storage_gb }} GB" },
  { "feature": "API Requests", "limit": "{{ globals.limits.starter_monthly_requests }} req/mo" }
]
```

---

## 4. Admin UI & Editor Experience

In the Dyrected Admin Dashboard (`@dyrected/admin`):

1. **Autocomplete & Variable Picker Popup:**
   - Typing `{{` or `@global` inside any text input, textarea, or markdown field opens an interactive popover list of available globals and their fields.
   - The dropdown displays the variable token, the field label, and a live preview of its current value (e.g. `pricing.pro_price` $\rightarrow$ `"$99"`).

2. **Visual Token Badges (Pills) in Rich Text:**
   - In WYSIWYG / Rich-Text editors (TipTap / ProseMirror), inserted variables are represented as inline visual pill components:  
     `Dyrected Pro is [⚡ pricing.pro_monthly ($99)] per month.`
   - Clicking the pill displays a popover showing the source global and direct link to edit the global settings.

3. **Validation & Warning Indicator:**
   - If an author writes a placeholder referencing a non-existent global or field (e.g. `{{ globals.pricing.invalid_field }}`), the admin editor shows a subtle warning badge without blocking document save.

---

## 5. Architecture & Resolution Engine

### 5.1 Storage (Raw by Default)
Documents are stored in the database with the raw placeholder syntax intact:
`"answer": "Dyrected Pro costs {{ globals.pricing.pro }}/mo."`

This ensures:
- Full editability in Admin UI.
- No stale values saved in individual records.
- Seamless updates whenever the singleton global changes.

### 5.2 Resolution Points

#### A. Read-time API Hydration (Server-side)
When fetching documents via REST (`/api/collections/:slug?interpolate=true`) or GraphQL / Server API:
- The `PopulationService` or dedicated `InterpolationService` resolves template tags before returning the payload.
- All needed globals for the requested dataset are fetched in a single batch query (O(1) database read).

#### B. Client-side SDK Helper (Frontend)
The `@dyrected/sdk` provides an interpolation helper for static sites (SSG) or client-side rendered SPAs:

```ts
import { interpolateTemplate } from '@dyrected/sdk'

// Fetch FAQ and Globals in parallel or cache globals once
const faq = await client.collection('faqs').get('how-much')
const globals = await client.globals.getAll()

const renderedAnswer = interpolateTemplate(faq.answer, { globals })
// Output: "Dyrected Pro costs $99/mo."
```

#### C. Optional Snapshotting (Publish-time Baking)
For high-compliance scenarios (e.g. invoices, legal receipts, finalized contracts) where the price or terms at time of publishing must be immutably locked:
- Field config option: `interpolateOn: 'publish' | 'read'` (default: `'read'`).
- In `'publish'` mode, the CMS evaluates and bakes the resolved string into the document at publish time.

---

## 6. Security & Guardrails

1. **Safe Variable Sandbox:**  
   The template evaluator is not an arbitrary `eval()` or JavaScript runtime. It only performs safe path lookup against the authorized `globals` dictionary.
2. **Access Control Check:**  
   If an unauthenticated or unauthorized user requests a document with a placeholder pointing to a private global field, the placeholder resolves to empty string or fallback rather than leaking restricted data.
3. **Circular Reference Protection:**  
   Depth limitation (max depth 3) to prevent nested placeholder recursion if a global value itself contains a placeholder.
