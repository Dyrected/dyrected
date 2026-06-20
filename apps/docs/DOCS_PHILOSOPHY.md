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

## Checklist for new doc pages

- [ ] Page title matches the task, not the class/module name
- [ ] Simplest example appears within the first screen of content
- [ ] No code example has `...` gaps or unexplained placeholders
- [ ] Advanced options are below the fold, not in the introduction
- [ ] Every code block is preceded by a prose explanation
- [ ] The page can be understood by someone who has never read any other Dyrected doc
