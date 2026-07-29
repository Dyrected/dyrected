# Dyrected Docs Philosophy

Inspired by Laravel's approach to documentation. Use this as the standard when writing or reviewing any Dyrected doc page.

---

## 1. Task-oriented, not API-oriented

Organize pages around what the developer is *trying to do*, not where something lives in the codebase.

- **Good:** "Sending Email", "Adding Authentication", "Uploading Files"
- **Avoid:** "EmailService API", "StorageAdapter Class Reference"

If someone can only remember one thing about their goal, they should be able to find the right page from it.

---

## 2. Progressive depth

Every page should be readable in layers:

1. Reader goal and mental model — what the reader is trying to decide or finish
2. Recommended path — the practical default and what “done” looks like
3. Exact setup or configuration — enough to copy, adapt, and verify
4. Common options and variations
5. Advanced configuration and edge cases

Put complexity below the fold. A reader should be able to stop as soon as their need is met without wading through options they don't need yet.

Tables are confirmation tools, not the opening move. Use tables after the reader has the mental model, especially on comparison pages.

---

## 3. Copy-paste confidence

Every code example must be complete and runnable in context. No placeholders, no gaps.

- **Good:** A full component or config block that works as-is
- **Avoid:** `// ... rest of your setup` or `// add your logic here`

If an example requires surrounding context, show that context too.

---

## 4. Opinionated defaults, visible escape hatches

Show the recommended path first. Then explicitly call out how to deviate if needed.

```
# Good structure
The recommended way is X. If you need more control, see [Advanced Configuration](#advanced).
```

This keeps beginners on the happy path while not hiding power from advanced users.

For decision pages, explain the choice in the way developers actually think about the work:

- who owns the backend boundary
- what infrastructure the team wants to operate
- where authentication and customer data already live
- whether the CMS is a managed content service or part of the app runtime
- what the visible success signal is after setup

Avoid leading with internal capability names such as hooks, adapters, dispatchers, or policies unless those are already the reader's stated goal.

---

## 5. Prose before code

Explain *why* before *how*. Every code block should be preceded by at least one sentence explaining what it does and why you'd reach for it. Never open a section with a code block.

- **Good:** "The `DyrectedProvider` makes a configured client available to every component in the tree. Wrap your app root with it once:"
- **Avoid:** Starting a section directly with a code fence

---

## 6. Plain English

Write for a developer who is competent but new to Dyrected. Avoid jargon that assumes familiarity with the internals. When a technical term is necessary, define it inline on first use.

---

## 7. Voice and tone

The default Dyrected docs voice should feel like a friendly practical instructor.

- Write like a helpful peer who has already worked through the problem and is now showing the reader the cleanest path through it.
- Keep the tone warm, direct, and calm. Aim for confidence-building, not hype.
- Assume the reader is technically capable but may be new to Dyrected, unsure about the setup, or worried they missed a step.
- Prefer short transitions that keep the reader oriented: what they are doing now, what changed, and what they should expect next.
- Reassure around predictable friction points, but do it lightly. Good docs reduce anxiety without sounding sentimental.
- Favor concrete working steps and visible results over abstract framing or deep theory in the opening sections.
- After code blocks, explain what just happened in plain language and why it matters.

Use this voice especially in onboarding, quickstarts, setup flows, and any page meant to help a reader reach a first success quickly.

Avoid:

- sounding like formal product marketing
- sounding like detached API reference prose on task-oriented pages
- long theory-first introductions
- large code jumps without orientation
- overusing jokes, slang, or filler

---

## 8. Getting-started rubric

Use this rubric for onboarding pages such as `Introduction`, `Quickstart`, and deployment-choice pages.

### What a getting-started page should do

- Tell the reader what they will understand or finish by the end of the page.
- Help the reader choose the right path quickly.
- Reduce setup anxiety by making each step feel bounded and visible.
- Introduce Dyrected terms only when they help the reader complete the next action.
- Link outward for deep reference instead of front-loading edge cases.
- Enter the reader's situation before describing the product boundary. A developer should recognize themselves in the first screen.

### Writing rules for getting-started pages

- Open with a short outcome-first sentence or two. The reader should know why this page exists immediately.
- Surface the recommended path early.
- If the page contains multiple paths, explain the difference in plain language before the branching sections.
- Keep branch labels concrete: what the reader is choosing, what they will get, and who the path is for.
- Put the mental model before the capability matrix. A table should sharpen a decision the prose already made understandable.
- Before any code or setup block, explain what it does and what the reader should expect to see afterward.
- After any important step, name the visible success signal: a route loads, a login works, an API responds, a page updates.
- Use short sections and short transitions so the reader never loses their place.
- Keep terminology stable across the whole page. Do not rename the same concept mid-guide.
- Put advanced caveats after the happy path unless the caveat changes the first setup decision.

### Review checklist for getting-started pages

- [ ] The first paragraph says what the page helps the reader do
- [ ] The reader can choose a path without reading the whole page
- [ ] Each branch explains when to pick it and what “done” looks like
- [ ] Steps are sequential and no step hides a prerequisite from the previous one
- [ ] Important success checks are visible and concrete
- [ ] Jargon is defined only when needed and not before
- [ ] Reference material is linked instead of dumped into the introduction
- [ ] The page feels calm and guided, not dense or salesy

---

## 9. Runtime docs rubric

Use this rubric for Cloud, self-hosted, and runtime-choice pages.

### The core runtime framing

Dyrected Cloud is the managed content backend. It owns content storage, media, content APIs, editor access, publishing workflows, and Cloud-safe hooks defined as content rules.

Self-hosted Dyrected runs inside the developer's application backend. It is for projects where the CMS must share the app runtime, infrastructure boundary, database strategy, account model, custom endpoints, function hooks, plugins, or server-side integrations.

Do not frame the choice as “Cloud is simple, self-hosted is advanced.” Frame it as “managed content backend” versus “CMS inside your app backend.”

### Cloud docs should sound like managed content infrastructure

Cloud guidance should help developers who think:

- “I need editable content for a custom website.”
- “My React or Vue app needs a hosted content API.”
- “My app already owns customer auth, billing, checkout, and product workflows.”
- “I want clients or editors to manage content without operating a CMS server.”

Cloud docs should not imply that Dyrected Cloud hosts arbitrary application backend logic, customer accounts, checkout, payments, product-specific workflows, or unrestricted server code.

When Cloud events or webhooks are mentioned, mark them as coming soon until they are public.

Call Cloud-safe hooks “hooks,” but define them immediately as content rules: serializable behavior Dyrected can sync and run in the hosted content backend.

### Self-hosted docs should sound like runtime ownership

Self-hosted guidance should help developers who think:

- “The CMS must run in the same server as my app.”
- “The CMS must live behind my network, database, compliance, or deployment boundary.”
- “Dyrected should own application-user accounts.”
- “Content writes need to run code inside my backend.”
- “I need custom endpoints, local transactions, plugins, or direct infrastructure access.”

Self-hosted docs should keep the current full-control story, but avoid making the choice feel like a generic “advanced features” upsell.

### Auth boundary

Cloud auth is content-workspace access: owners, team members, clients, editors, administrators, invitations, and dashboard access.

Application-user auth stays in the application, a dedicated identity provider, or self-hosted Dyrected collection auth when Dyrected must own those accounts.

Do not let Cloud auth copy sound like Dyrected Cloud is a hosted replacement for a product's customer identity system.

---

## 10. Structure borrowing

It is acceptable to study strong documentation systems such as Laravel, Payload, or Sanity for structure.

Borrow:

- section order
- heading progression
- where the page teaches a mental model
- where it switches from guide to reference
- how it introduces recommended defaults and escape hatches

Do not borrow:

- wording
- product claims
- examples that Dyrected does not support
- routes, APIs, or guarantees that are not true for Dyrected

When rewriting an important page, identify the page type before editing:

- **Conceptual guide:** explain what the concept is, when to use it, and what to read next.
- **Configuration guide:** explain the mental model, show the recommended config, then document options.
- **Reference-led guide:** explain when the reader needs the reference, then make exact fields, endpoints, or types easy to scan.

If a page makes code-behavior claims, verify those claims against the relevant `@dyrected/*` package before presenting them as fact.

Keep substantial rewrites review-ready until product or engineering has verified open claims.

---

## Checklist for new doc pages

- [ ] Page title matches the task, not the class/module name
- [ ] The first screen states the reader goal or decision
- [ ] The mental model appears before tables, edge cases, or reference detail
- [ ] The recommended path appears before escape hatches
- [ ] Simplest example appears within the first screen of content when the page is a setup or configuration guide
- [ ] No code example has `...` gaps or unexplained placeholders
- [ ] Advanced options are below the fold, not in the introduction
- [ ] Every code block is preceded by a prose explanation
- [ ] The page can be understood by someone who has never read any other Dyrected doc
- [ ] The voice feels like a calm, practical guide rather than product copy or raw reference text
- [ ] Runtime pages frame Cloud as managed content infrastructure and self-hosted as runtime ownership
- [ ] Product claims with uncertain availability are marked as coming soon or left for review
