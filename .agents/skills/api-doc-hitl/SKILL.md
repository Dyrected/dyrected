---
name: api-doc-hitl
description: Draft or revise API documentation from source material with explicit human verification gates. Use when an AI agent needs to write API overviews, endpoint docs, quick reference guides, release-note summaries, migration notes, or related API documentation from specs, code, issue threads, meeting notes, changelists, or existing docs, and the user wants a human in the loop to verify accuracy before finalizing.
---

# API Doc HITL

## Overview

Write API documentation as a staged workflow, not a one-shot prompt. Ground every draft in source material, keep an uncertainty register, and force a human review pass before claiming the documentation is final.

## Workflow

### 1. Classify the deliverable

Identify the document type before drafting:

- API overview
- Endpoint or resource reference
- Quick reference guide
- Release notes or changelog summary
- Tutorial or workflow guide
- Migration or upgrade note
- Feature release or announcement draft

State the target audience, likely source inputs, and what "done" means for this document.

Use the routing guidance in [references/doc-types.md](references/doc-types.md) when the requested output could fit multiple doc types.

### 2. Gather and rank source material

Prefer high-signal sources over large undifferentiated dumps:

- OpenAPI specs, protobufs, schema files, code comments, and test fixtures
- Existing reference docs and rendered site output
- Design docs, one-pagers, proposals, requirements, and changelists
- Meeting transcripts and cleaned notes
- Issue threads, bugs, support cases, and release artifacts

Reject weak inputs early. If the available material is thin, outdated, or contradictory, say so and switch from drafting mode into intake mode. Ask for missing artifacts or produce a question list for an SME instead of guessing.

For detailed guidance, read [references/series-principles.md](references/series-principles.md).

### 3. Build a source inventory before writing

Create a compact inventory with:

- source name
- why it matters
- trust level: high, medium, or low
- known gaps or bias

If the document depends on information that has no reliable source, add it to an uncertainty register immediately. Do not hide uncertainty in polished prose.

### 4. Extract structure first

Before drafting prose, create the information structure:

- For overviews: problem, audience, core objects, workflows, limitations
- For endpoint docs: purpose, auth, inputs, outputs, errors, examples
- For quick references: object hierarchy, fields, relationships, links to canonical reference pages
- For release notes: user-visible change, affected objects, behavior change, migration risk
- For feature releases: what shipped, who it helps, what changed, where to learn more

If a strong document already exists, reverse engineer its shape and reuse that structure instead of inventing a new pattern. Prefer templates and proven patterns over blank-page generation.

If canonical content already explains a concept, prefer linking to it over rewriting the same explanation. Document once, reference anywhere.

### 5. Draft in bounded passes

Draft section by section. For each section:

1. cite the supporting sources in working notes
2. draft only what the sources support
3. mark unsupported claims with `NEEDS-HUMAN-VERIFY`
4. mark missing assets with `NEEDS-SCREENSHOT`, `NEEDS-DIAGRAM`, or `NEEDS-CODE`

Do not try to produce the whole document in one pass when the material is complex. Decompose the task, then compose the final document from smaller verified sections.

Use the writing rules in [references/writing-heuristics.md](references/writing-heuristics.md) while drafting. In particular:

- open with a direct first sentence
- show the outcome, result, or "a-ha" moment early when possible
- define jargon on first use
- use one consistent example per guide unless there is a clear reason not to
- prefer short, concrete sentences over dense explanatory chains
- use lists when they improve skimmability, not by default
- avoid minimizing words such as `just`, `simply`, or `easy` unless they are clearly warranted

### 6. Produce a human review packet

Every substantial draft must be accompanied by a review packet for the human verifier. Include:

- document purpose
- source inventory
- uncertainty register
- specific review questions
- high-risk claims that need SME confirmation

Use the packet template in [references/review-packet.md](references/review-packet.md).

For larger edits, whole sections, or doc-set changes, also use [references/doc-review-heuristics.md](references/doc-review-heuristics.md) to review ordering, discoverability, version awareness, screenshot freshness, duplication, and overall reader confidence.

### 7. Run the human verification gate

Require a human pass before calling the document final. The goal is not generic "thoughts?" feedback. Ask the reviewer to verify:

- factual accuracy
- missing caveats or edge cases
- naming correctness
- behavior changes and compatibility notes
- whether examples reflect real usage

If no human is available, stop at "draft ready for review" and state the remaining validation gap explicitly.

If the document is important enough to affect onboarding, migrations, or critical workflows, recommend an internal dry run: have a teammate try to use the draft to complete the task from scratch and record friction.

### 8. Incorporate feedback without losing provenance

When feedback arrives:

- resolve each open uncertainty
- update the document
- preserve a brief changelog of what changed and why
- rerun any targeted checks that depend on the edits

If feedback conflicts with earlier source material, prefer the newest authoritative source and note the conflict in working notes.

If the draft concerns a deprecation or migration, confirm that the old and new content do not contradict each other and that timelines, redirects, and replacement guidance are visible.

### 9. Final validation

Before completion:

- verify each major section traces back to source material or reviewer confirmation
- confirm `NEEDS-HUMAN-VERIFY` markers are resolved or intentionally left open
- confirm placeholder markers such as `NEEDS-SCREENSHOT` and `NEEDS-CODE` are resolved or intentionally left open
- ensure links, code elements, and names are internally consistent
- ensure the first sentence, headings, and navigation labels are direct and action-oriented
- ensure introductions surface the result, outcome, or concrete value early when appropriate
- ensure repeated explanations are replaced by links to canonical pages where appropriate
- ensure code snippets are minimal, runnable in context, and explicit about required substitutions or dependencies
- state what was verified by source evidence versus human review

## Output Contract

Unless the user asks for a different shape, produce these artifacts during the workflow:

1. Source inventory
2. Draft outline
3. Draft document
4. Human review packet
5. Final or review-ready status note

If the request is small, collapse these into one response with clear headings. If the request is large, keep the artifacts separate.

## Failure Modes To Avoid

- Do not fabricate undocumented behavior.
- Do not treat meeting notes as equal to specs or code when they conflict.
- Do not bury uncertainty in confident prose.
- Do not skip the review packet on the assumption that the human will "just read the draft."
- Do not call the result final if human verification has not happened.
- Do not switch examples mid-guide unless the document explicitly compares scenarios.
- Do not duplicate canonical explanations across multiple pages unless there is a strong end-to-end reason.
- Do not leave unresolved placeholders in a document presented as final.

## Example Requests

- `Use $api-doc-hitl to draft an API overview from this OpenAPI spec, changelist, and meeting transcript.`
- `Use $api-doc-hitl to update these endpoint docs and prepare an SME review packet.`
- `Use $api-doc-hitl to turn these release diffs into customer-facing API release notes with verification questions.`
- `Use $api-doc-hitl to write a migration note for this deprecated endpoint and prepare a dry-run checklist.`
