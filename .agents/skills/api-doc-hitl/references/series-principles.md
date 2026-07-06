# Series Principles

This reference distills the recurring operating ideas from Tom Johnson's "Prompt engineering for tech comm" series on I'd Rather Be Writing.

## Core principles

### 1. Prefer process over one-shot generation

Break documentation work into stages:

- collect source material
- normalize it
- choose a document structure
- draft in sections
- check for errors
- send to a human reviewer

Complex documentation gets better when decomposed into smaller tasks.

### 2. Source material quality determines output quality

Prefer:

- specs
- source code
- tests
- design docs
- changelists
- issue threads
- cleaned meeting notes

Be careful with source bias, stale material, and missing context. Large context windows help, but they do not fix bad inputs.

### 3. Templates and reverse engineering are leverage

If you have a strong example of the target document type, derive the shape from it. Ask the model to imitate structure, information types, and level of detail, then fill the structure from trusted source material.

### 4. Verification is a separate stage

The draft step and the verification step are different tasks. After drafting, run an explicit error-checking pass, compare claims against source material, and escalate unresolved items to a human reviewer.

### 5. Long-context quality checks are useful but not magic

Passing an entire doc set can help identify gaps, inconsistency, and weak information hierarchy. It does not eliminate the need for targeted review and human judgment.

### 6. Meeting transcripts are raw ore, not finished input

Clean transcripts into thematic notes before using them as source context for drafting. Pull out concepts, decisions, caveats, and terminology in a readable structure.

### 7. Diffs, logs, and issue trackers are documentation inputs

Release notes, missing docs, naming drift, broken links, and user pain points often show up in engineering artifacts before they show up in docs requests. Mine these sources deliberately.

### 8. Code samples need hybrid handling

Use AI to jump-start examples, but ground them in real code, tests, or sample apps. Treat generated samples as drafts until an engineer or execution path validates them.

### 9. Human-in-the-loop means targeted review

Do not ask for vague approval. Give the human verifier a small set of concrete questions and highlight the risky claims that need confirmation.

## Implications for this skill

- Always collect and rank sources before writing.
- Always keep an uncertainty register.
- Always prepare a human review packet.
- Default to "review-ready draft" instead of "final" when reviewer confirmation is missing.
