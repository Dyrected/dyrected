---
"@dyrected/knowledge": patch
---

AI knowledge for generating new Dyrected sites, not only migrating existing ones.

- New content-modeling rules: greenfield site generation, content coherence, deterministic seed relationships, initial-data seeding mechanics (globals seed on any read; collections seed only on an unfiltered list read), the icon field, config authoring (keep block/field arrays inline to preserve literal types; module splitting), and adapter/deployment-target selection (file SQLite and local storage are not serverless-safe).
- New frontend-integration rules: link/URL field resolution, site chrome via globals with safe fallbacks, and live preview / click-to-edit.
- New `generate-site.md` template: a staged, plain-language, greenfield counterpart to `generate-cms.md`, wired through the generator and exported as `GENERATE_SITE_PROMPT`.
- Every new rule section links to the relevant docs page, and each rule instructs the assistant technically while forbidding technical language in replies to the user.
