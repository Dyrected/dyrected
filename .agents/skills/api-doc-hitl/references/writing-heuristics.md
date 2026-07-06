# Writing Heuristics

This file captures practical writing rules that improve draft quality without bloating the core skill.

## First sentences

Open documentation pages in one of two ways:

- a short feature-and-outcome introduction
- immediate task instruction when the title already states the action clearly

Examples:

- `Use the Events API to retrieve a paginated list of account events.`
- `To rotate an API key, open the Security settings page and select Create new key.`

Do not waste the first sentence on generic filler.

When useful, show the result early:

- name the outcome before diving into background
- show the "a-ha" moment before long setup if the page teaches a workflow
- include a concrete result, returned object, UI change, or visible artifact when that helps orient the reader

## Jargon

Define jargon on first use if a reasonable reader may not know it.

- expand abbreviations once, then use the short form
- define technical terms with a short concrete explanation
- avoid introducing adjacent specialist concepts unless they help complete the task

## Examples

Use one consistent example through a guide when possible.

- keep the scenario stable
- keep variable names and domain language stable
- if multiple use cases matter, separate them into their own section or page
- if a snippet needs substitution, say exactly what the reader should replace
- if a snippet depends on setup or libraries, name them before or next to the snippet

## Sentences

Prefer short, direct sentences.

- split long comma-heavy sentences
- avoid pronouns that create ambiguity
- prefer explicit nouns over `it`, `this`, or `that` when the referent may be unclear
- avoid minimizing phrases such as `just`, `simply`, `obviously`, or `easy` unless they are genuinely accurate for the target reader

## Lists

Use ordered lists for sequence and unordered lists for grouped points.

Use lists when they:

- improve skimmability
- separate distinct facts
- explain a code snippet or set of replacements

Do not turn the whole page into bullets.

## Callouts

Use callouts sparingly and deliberately:

- critical: severe breakage or safety risk
- warning: important caveat or instability
- note: supporting context
- tip: optional optimization or helpful shortcut

If a warning appears, say what the reader should do next.

## Placeholders

Use explicit placeholders during drafting:

- `NEEDS-HUMAN-VERIFY`
- `NEEDS-SCREENSHOT`
- `NEEDS-DIAGRAM`
- `NEEDS-CODE`

Never present a draft with placeholders as final without calling them out.

## Canonical reuse

When explanation already exists elsewhere, link to it instead of reproducing it unless the duplication is necessary for an end-to-end task.
