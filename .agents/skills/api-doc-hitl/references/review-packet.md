# Review Packet Template

Use this template when handing a draft to a human reviewer.

## Review summary

- Document:
- Goal:
- Audience:
- Scope:

## Source inventory

| Source | Type | Trust | Notes |
| --- | --- | --- | --- |
|  |  |  |  |

## Uncertainty register

| Section | Claim or gap | Why uncertain | Reviewer needed |
| --- | --- | --- | --- |
|  |  |  |  |

## Placeholder sweep

List any unresolved drafting placeholders:

- `NEEDS-HUMAN-VERIFY`
- `NEEDS-SCREENSHOT`
- `NEEDS-DIAGRAM`
- `NEEDS-CODE`

If none remain, say so explicitly.

## Reviewer questions

Ask short, answerable questions such as:

1. Is the authentication flow described correctly?
2. Are the object names and field names current?
3. Which constraints or caveats are still missing?
4. Does the example reflect supported usage?
5. Did any behavior change require migration guidance?

## Example consistency

- What example or scenario does the draft use?
- Is that example consistent throughout the document?
- If the example changes, is the reason intentional and clear?
- If the code includes placeholders or substitutions, are they explained clearly?

## High-risk areas

- breaking changes
- auth or permissions
- quotas, limits, or pagination
- field semantics
- SDK or language-specific examples
- deprecations and migrations
- version-specific behavior or availability
- outdated screenshots or UI references

## Dry-run check

For onboarding, how-to, migration, or other critical workflow docs, ask whether someone should try the draft from scratch before publication.

Record:

- who ran the dry run
- what task they attempted
- where they got stuck
- what changed in the doc afterward

## Canonical links

- Which sections should link to canonical docs instead of repeating explanation?
- Are any duplicated explanations still necessary?

## Holistic review

When reviewing more than one page or a major section rewrite, also check:

- whether the result or value is visible early
- whether prerequisites appear before dependent steps
- whether navigation labels and headings match reader intent
- whether the documentation builds confidence for a new reader

## Suggested status labels

- `draft-internal`
- `ready-for-sme-review`
- `reviewed-needs-revision`
- `verified-final`
