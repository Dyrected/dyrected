# Dyrected: AI-First CMS Architecture

Dyrected is designed to be the "CMS for the AI era." By utilizing a **code-first schema** and **strongly-typed contracts**, it is uniquely positioned to work with AI coding tools like Lovable, v0, Bolt, and Antigravity.

---

## The AI-First Workflow

In a traditional CMS, you spend hours clicking buttons in a UI to create fields. In Dyrected, you describe your content model to an AI, and it generates the **Content Contract**.

### 1. The Prompt
Feed your AI assistant a natural language description of your needs:
> "Create a Dyrected content contract for a real estate site. I need a 'Properties' collection with title, price, images, a relationship to an 'Agents' collection, and a 'Features' array. Also, a 'Homepage' global for the hero content."

### 2. The Contract Generation
The AI generates your `dyrected.config.ts`. Because Dyrected uses standard TypeScript, LLMs are exceptionally good at writing these schemas accurately.

### 3. Immediate Implementation
Paste the code into your project. Run `pnpm dyrected generate:types`. Your entire frontend is now type-safe and ready to fetch data.

---

## Architecture Selection by AI Tool

Different AI tools favor different deployment strategies. Dyrected supports them all.

### A. SPA Tools (Lovable, React, Vue, Vite)
Tools that generate pure client-side code (SPAs) cannot "embed" the Dyrected backend because they lack a persistent server runtime.
- **Recommended Mode**: **Cloud Connected**.
- **Setup**: Point the `@dyrected/sdk` at a managed Dyrected Cloud instance or a standalone server.
- **Auth**: Use your `apiKey` in the SDK initialization.

### B. Meta-Framework Tools (v0, Next.js, Nuxt)
Tools that generate full-stack applications can choose how to integrate Dyrected.
- **Option 1: Embedded (Default)**: Mount the Dyrected API directly in your Next/Nuxt routes. Everything stays in one codebase—perfect for "v0" type workflows.
- **Option 2: Cloud Connected**: Keep the backend managed to offload infrastructure while the AI focuses on the frontend.

---

## Why AI Models Love Dyrected

1.  **Predictable Config**: No opaque database tables. The schema is a plain TypeScript object that LLMs can read, modify, and reason about.
2.  **Type Safety**: When an AI generates code using the `@dyrected/sdk`, the generated types ensure it never hallucinates field names.
3.  **No Click-Ops**: AI can't easily navigate a complex CMS web UI, but it can perfectly navigate a code file.

---

## Rules for AI Generators

When generating `dyrected.config.ts`, AI models MUST follow these rules to ensure security and cloud-compatibility:

1.  **Use Jexl Strings for Conditions**: Do NOT use JavaScript functions for `admin.condition`. Use Jexl string expressions instead.
    - ✅ `admin: { condition: 'status == "published"' }`
    - ❌ `admin: { condition: (data) => data.status === 'published' }`

2.  **Prefer Radio Layouts**: For fields with a small number of options (2-4), use the premium radio layout.
    - ✅ `admin: { layout: 'radio', direction: 'horizontal' }`

3.  **Path Resolution**: Jexl expressions have access to both global and sibling data. Use simple field names (e.g., `navType`) even inside array items.

---

## Example AI-Ready Prompt Template

Copy and paste this into your AI tool to get started:

```text
I am using Dyrected CMS. Please generate a 'dyrected.config.ts' file for a [PROJECT TYPE].

Important Rules:
- Use Jexl strings for all 'admin.condition' properties (e.g. 'navType == "internal"').
- Use layout: 'radio' for simple selection fields to ensure a premium UI.

Include:
1. Collections for [ENTITY A] and [ENTITY B].
2. A relationship between them.
3. A global for the [SITE SECTION].
```
