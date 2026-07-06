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

1. The simplest working example — enough to get going
2. Common options and variations
3. Advanced configuration and edge cases

Put complexity below the fold. A reader should be able to stop as soon as their need is met without wading through options they don't need yet.

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

### Writing rules for getting-started pages

- Open with a short outcome-first sentence or two. The reader should know why this page exists immediately.
- Surface the recommended path early.
- If the page contains multiple paths, explain the difference in plain language before the branching sections.
- Keep branch labels concrete: what the reader is choosing, what they will get, and who the path is for.
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

## Checklist for new doc pages

- [ ] Page title matches the task, not the class/module name
- [ ] Simplest example appears within the first screen of content
- [ ] No code example has `...` gaps or unexplained placeholders
- [ ] Advanced options are below the fold, not in the introduction
- [ ] Every code block is preceded by a prose explanation
- [ ] The page can be understood by someone who has never read any other Dyrected doc
- [ ] The voice feels like a calm, practical guide rather than product copy or raw reference text
