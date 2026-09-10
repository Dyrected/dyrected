# Dyrected AI — Day 4 Specification

This document details the complete Day 4 implementation specification for **Hybrid Intent Routing & Multi-Source Intelligence** (Structured Database Queries vs Unstructured Semantic Search, Multi-Tool Chaining, and Uncertainty Handling) in Dyrected AI.

---

## 1. Day 4 Goal & Core Architecture

The goal of Day 4 is to make the Dyrected AI Assistant an **intelligent router** that selects the optimal data source for any question — knowing precisely when to query exact structured database fields, when to perform semantic vector search over unstructured text, when to combine both, and how to clearly explain uncertainty when data is missing or ambiguous.

| Area | Day 4 Decision | Detail |
| :--- | :--- | :--- |
| **Routing Architecture** | **Autonomous Model Intent Routing (Few-Shot Prompt Calibrated)** | Leverages Gemini 2.5 Flash's native tool-calling capabilities guided by highly calibrated tool descriptions, Zod schemas, and system prompt routing heuristics. |
| **Structured Query Engine** | **`queryCollection` + `aggregateCollection` + `getDocument`** | Exact field filtering, numeric range comparisons (`>`, `<`, `=`), sorting, pagination, and mathematical aggregations (count, sum, avg, min, max, groupBy). |
| **Semantic Search Engine** | **`searchContent` (RAG)** | Vector similarity search over unstructured content (articles, documentation, FAQs, policies, material sheets) with similarity scores and deep-link citations. |
| **Multi-Tool Composition** | **Sequential Tool Chaining (`maxSteps: 5`)** | The agent can execute multi-step plans: e.g. Step 1: `queryCollection` to find enterprise tier IDs $\to$ Step 2: `searchContent` to retrieve enterprise SLA policies $\to$ Step 3: Synthesize a unified answer. |
| **Ambiguity & Disambiguation** | **Self-Directed Follow-ups & Dual Querying** | When user intent is ambiguous (e.g. *"Tell me about our pricing"*), the agent performs a hybrid query (structured rates + policy RAG) or asks a sharp clarifying question. |
| **Uncertainty Calibration** | **Confidence Thresholding & Anti-Hallucination** | When vector similarity scores fall below threshold (`< 0.50`) or structured filters return empty sets, the agent explicitly admits lack of data rather than guessing. |

---

## 2. Intent Routing & Decision Flow Architecture

```text
                                  User Prompt
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   Gemini 2.5 Flash Agent  │
                         │   (Intent Classification) │
                         └─────────────┬─────────────┘
                                       │
            ┌──────────────────────────┼──────────────────────────┐
            │                          │                          │
            ▼                          ▼                          ▼
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │   STRUCTURED QUERY   │   │   SEMANTIC SEARCH    │   │     HYBRID CHAIN     │
 │ (Exact facts, counts,│   │(Meaning, explanations│   │(Requires both exact  │
 │  filters, numbers)   │   │ concepts, policies)  │   │ data and qualitative)│
 └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
            │                          │                          │
            ▼                          ▼                          ▼
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │ Tools Called:        │   │ Tool Called:         │   │ Step 1: queryCollec..│
 │ • queryCollection    │   │ • searchContent      │   │ Step 2: searchContent│
 │ • aggregateCollection│   │                      │   │ Step 3: synthesize   │
 │ • getDocument        │   │                      │   │                      │
 └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
            │                          │                          │
            ▼                          ▼                          ▼
 ┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
 │ DatabaseAdapter      │   │ Vector Store         │   │ DB + Vector Store    │
 │ (Postgres/SQLite/etc)│   │ (_dyrected_ai_chunks)│   │ Combined Results     │
 └──────────┬───────────┘   └──────────┬───────────┘   └──────────┬───────────┘
            │                          │                          │
            └──────────────────────────┼──────────────────────────┘
                                       ▼
                         ┌───────────────────────────┐
                         │ Synthesized Grounded      │
                         │ Answer + Sources/Citations│
                         └───────────────────────────┘
```

---

## 3. Data Source Classification Matrix

The assistant is trained via system prompt directives and tool signatures on this deterministic classification matrix:

| User Question Type | Primary Tool | Data Source | Example Prompts |
| :--- | :--- | :--- | :--- |
| **Exact Counts & Totals** | `aggregateCollection` | Structured DB | • *"How many published articles do we have?"*<br>• *"Count all guest responses received this week."* |
| **Numeric & Date Filtering** | `queryCollection` | Structured DB | • *"Which products cost more than ₦50,000?"*<br>• *"Show active coaching services created after June 2026."* |
| **Status & Relational Lookups** | `queryCollection` / `getDocument` | Structured DB | • *"Find drafts authored by Jane Doe."*<br>• *"Get the site title from SiteSettings global."* |
| **Conceptual & Policy Inquiries** | `searchContent` (RAG) | Vector DB | • *"What does our documentation say about refunds?"*<br>• *"Explain our enterprise onboarding SLA."* |
| **Thematic & Fuzzy Discovery** | `searchContent` (RAG) | Vector DB | • *"Find articles explaining sustainable packaging."*<br>• *"Do we have any guides on executive burnout?"* |
| **Hybrid Intent (Facts + Context)** | `queryCollection` $\to$ `searchContent` | DB + Vector DB | • *"What is our premium plan price and what features are included in its curriculum?"* |

---

## 4. Enhanced Tool Descriptions & Zod Contracts

Tool descriptions are the primary driver of Gemini's routing decisions. Descriptions must provide distinct operational boundaries.

### 4.1 `queryCollection` (Structured Filtering & Sorting)

```ts
queryCollection: tool({
  description:
    'Query structured records from a collection using exact field filters, boolean logic, sorting, and pagination. Use this tool for finding documents with specific statuses, categories, date ranges, or numeric thresholds (e.g. price > 50000, status == "published"). Do NOT use this tool for open-ended conceptual or semantic questions.',
  parameters: z.object({
    collection: z.string().describe('Slug of the collection to query (e.g. "articles", "products", "services")'),
    where: z
      .record(z.any())
      .optional()
      .describe('Field filter criteria object (e.g. { "status": "published", "price": { "greater_than": 50000 } })'),
    sort: z.string().optional().describe('Field to sort by (e.g. "-createdAt", "price", "title")'),
    limit: z.number().min(1).max(50).optional().default(10).describe('Maximum documents to return (1-50)'),
    page: z.number().min(1).optional().default(1).describe('Page number for pagination'),
  }),
  execute: async ({ collection, where, sort, limit, page }) => { ... },
})
```

### 4.2 `aggregateCollection` (Statistical & Math Queries)

```ts
aggregateCollection: tool({
  description:
    'Compute mathematical aggregates and summary statistics over a collection (e.g. count, sum, average, min, max, groupBy). Use this tool whenever the user asks "how many...", "what is the total...", "average price of...", or asks for counts grouped by status/category. Do NOT use semantic search for counting.',
  parameters: z.object({
    collection: z.string().describe('Slug of the collection to aggregate'),
    operation: z.enum(['count', 'sum', 'avg', 'min', 'max', 'distinct']).describe('Aggregation operation to perform'),
    field: z.string().optional().describe('Field name for mathematical operations (e.g. "price", "rating")'),
    groupBy: z.string().optional().describe('Optional field to group aggregates by (e.g. "status", "category")'),
    where: z.record(z.any()).optional().describe('Filter criteria to restrict aggregation scope'),
  }),
  execute: async ({ collection, operation, field, groupBy, where }) => { ... },
})
```

### 4.3 `searchContent` (Unstructured Semantic Search / RAG)

```ts
searchContent: tool({
  description:
    'Perform semantic vector search across unstructured text, articles, documentation, FAQs, guides, policies, and rich-text fields. Use this tool for open-ended questions, concepts, thematic topics, explanations, and qualitative inquiries (e.g. "what is our policy on refunds?", "how do we handle chargebacks?"). Do NOT use this tool for exact counts or strict numeric filtering.',
  parameters: z.object({
    query: z.string().describe('The natural language semantic search query or topic to look up'),
    collections: z
      .array(z.string())
      .optional()
      .describe('Optional collection slugs to restrict search scope to (e.g. ["articles", "faqs"])'),
    limit: z.number().min(1).max(10).optional().default(4).describe('Maximum relevant snippets to return'),
    minScore: z.number().min(0).max(1).optional().default(0.5).describe('Minimum cosine similarity cutoff (0.0 to 1.0)'),
  }),
  execute: async ({ query, collections, limit, minScore }) => { ... },
})
```

---

## 5. Multi-Step Execution & Hybrid Intent Scenarios

When a question requires both quantitative facts and qualitative explanation, Gemini executes sequential tool calls before streaming the final answer.

### 5.1 Scenario Walkthrough: Hybrid Pricing & Curriculum

**User Query:** *"Which coaching service is the most expensive, and what does its curriculum cover?"*

```text
Step 1: Agent calls `queryCollection({ collection: "services", sort: "-price", limit: 1 })`
        ➔ Returns: { id: "srv_vip", title: "Executive Mastery 1-on-1", price: 1500000 }

Step 2: Agent calls `searchContent({ query: "Executive Mastery 1-on-1 curriculum syllabus topics", collections: ["services", "articles"] })`
        ➔ Returns: Chunks describing the 12-week leadership modules and 360-degree assessment.

Step 3: Agent synthesizes complete answer:
        "The most expensive offering is **Executive Mastery 1-on-1** at ₦1,500,000.
         
         ### Curriculum Overview:
         - **Weeks 1–4:** Strategic Alignment & 360-Degree Feedback
         - **Weeks 5–8:** High-Stakes Negotiation & Executive Presence
         - **Weeks 9–12:** Organizational Scaling & Succession Planning

         ### Sources:
         - **Executive Mastery Service** (/admin/collections/services/srv_vip)"
```

---

## 6. Uncertainty Handling & Confidence Calibration

To eliminate hallucinations, Day 4 establishes strict confidence and ambiguity rules in the prompt and tool layer:

### 6.1 Low Similarity Cutoff
* If `searchContent` returns results where the highest similarity score is `< 0.50`, the tool flags `lowConfidence: true`.
* The assistant is instructed to state:
  > *"I searched our project documentation for '{query}', but could not find verified content addressing this topic. Would you like me to help draft a new article or check another collection?"*

### 6.2 Zero-Match Filter Fallback
* If `queryCollection` returns `totalDocs: 0` for a specific filter (e.g. `price > 1000000`), the assistant explicitly clarifies:
  > *"There are currently no products matching that criteria (price > ₦1,000,000). The highest-priced item in the catalog is {Product} at {Price}."*

### 6.3 Ambiguous Intent Disambiguation
* When a question has multiple interpretations (e.g. *"Show me everything about Jane"*):
  1. The agent checks if "Jane" is an Author, User, or Customer.
  2. If ambiguous, it queries both and summarizes: *"Found 1 author profile and 3 published articles authored by Jane Doe."*

---

## 7. System Prompt Calibration (Routing Directive)

The system prompt is upgraded on Day 4 with explicit routing heuristics and few-shot decision exemplars:

```markdown
### 9. ROUTING INTELLIGENCE: STRUCTURED VS UNSTRUCTURED DATA
Choose the right tool based on the nature of the inquiry:

1. **USE STRUCTURED TOOLS (`queryCollection`, `aggregateCollection`, `getDocument`):**
   - When the user asks for exact counts (*"How many..."*, *"Total active..."*).
   - When filtering by status, category, date, or numeric ranges (*"Price > 50000"*, *"Status == draft"*).
   - When retrieving specific fields from a known document ID or Global.

2. **USE SEMANTIC SEARCH (`searchContent`):**
   - When the user asks conceptual, open-ended, or policy questions (*"What do we say about refunds?"*).
   - When searching for themes, ideas, or topics across body copy and rich text.

3. **USE MULTI-TOOL SEQUENCING:**
   - If a question asks for a specific record AND its detailed narrative background, query the structured record first, then search semantic content for supporting details.

4. **HONEST UNCERTAINTY:**
   - Never invent numbers, dates, or policies.
   - If search scores are low or filters return empty results, clearly explain the lack of data to the user.
```

---

## 8. Day 4 Scope Boundaries

### ✅ What Day 4 INCLUDES

1. **Enhanced Tool Registry:** Refined operational descriptions and Zod schemas for `queryCollection`, `aggregateCollection`, `getDocument`, and `searchContent`.
2. **Deterministic Routing Logic:** Few-shot prompt calibrated intent classification ensuring Gemini picks the right data source.
3. **Sequential Multi-Tool Execution:** Seamless chaining of structured and semantic tools within `streamText()` up to `maxSteps` (default: 5).
4. **Uncertainty & Low-Confidence Handling:** Explicit fallback messaging when similarity is below threshold or zero records match.
5. **Dual-Query Hybrid Answers:** Single response combining exact structured numbers with qualitative RAG content.

### ❌ What Day 4 EXCLUDES (Deferred to Future Days)

* ❌ Autonomous document mutation / draft editing via chat (Day 5)
* ❌ Multi-agent coordinator subagents with specialized worker personas
* ❌ Automated SQL-to-Vector hybrid index re-ranking algorithms (BM25 + RRF)

---

## 9. Day 4 Implementation Checklist

* [ ] **Tool Signature & Description Refinements (`packages/core`):**
  * [ ] Update `queryCollection` description with strict structured-use directives.
  * [ ] Update `aggregateCollection` description for counting and mathematical metrics.
  * [ ] Update `searchContent` description with semantic/qualitative scope.
  * [ ] Ensure all tools validate arguments with comprehensive Zod schemas.
* [ ] **System Prompt Upgrades (`packages/core`):**
  * [ ] Add Section 9 (Routing Intelligence & Decision Rules) to `buildDyrectedSystemPrompt`.
  * [ ] Add few-shot decision exemplars into system prompt context.
* [ ] **Uncertainty & Error Handlers:**
  * [ ] Return `lowConfidence` flag in `searchContent` when top score is `< 0.50`.
  * [ ] Handle empty result sets gracefully in structured tools with actionable suggestions.
* [ ] **Frontend Tool Execution Badges (`packages/admin`):**
  * [ ] Render distinct icon badges for structured query (`Filter/Database`) vs semantic search (`Sparkles/Search`).
* [ ] **Verification & Test Suite:**
  * [ ] Test Example 1: *"How many published articles do we have?"* $\to$ Verify `aggregateCollection` / `queryCollection` triggers (NO semantic search).
  * [ ] Test Example 2: *"What does our content say about refunds?"* $\to$ Verify `searchContent` triggers (NO database scans).
  * [ ] Test Example 3: *"Which services cost more than ₦500,000?"* $\to$ Verify `queryCollection` with `where` filter triggers.
  * [ ] Test Example 4: *"Find articles explaining our enterprise offering."* $\to$ Verify `searchContent` triggers.
  * [ ] Test Example 5 (Hybrid): *"Which service is most expensive and what is in its syllabus?"* $\to$ Verify multi-tool sequence triggers.
  * [ ] Test Example 6 (Uncertainty): *"What is our policy on space travel?"* $\to$ Verify assistant explains lack of data without hallucinating.

---

## 10. Day 4 Acceptance Criteria

1. **Correct Data Source Routing:** 100% of structured count/filter questions route to database tools, and 100% of open-ended conceptual questions route to semantic search.
2. **Multi-Tool Execution:** Questions requiring both facts and context successfully execute a multi-step sequence (`maxSteps: 5`) and return a single unified answer.
3. **No Hallucination on Zero Results:** Asking about non-existent data or unindexed policies produces an honest explanation of missing data rather than fabricated claims.
4. **Clean Citation Attribution:** Every answer citing retrieved semantic content includes formatted sources and admin links.
