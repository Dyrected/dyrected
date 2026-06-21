# Dyrected Agent Skills

AI coding agent skills for working with Dyrected CMS. Installable via the [skills.sh](https://skills.sh) ecosystem.

## Install a skill

```bash
npx skills add dyrected/agent-skills@<skill-name>
```

---

## Available skills

### `dyrected`

The main skill. Loads the complete Dyrected knowledge into any AI coding session — install detection, setup flow, intent-to-pattern mapping, schema rules, DO NOT list, hooks, relationships, auth, uploads, dynamic options, conditional fields, and custom components.

```bash
npx skills add dyrected/agent-skills@dyrected
```

Use `/dyrected` at the start of any Dyrected task in Claude Code.

---

## Vision

`dyrected/agent-skills` is a growing library of focused, composable skills covering the full Dyrected developer journey. The goal is that any AI coding agent — Claude, Cursor, Windsurf, Copilot — can handle any Dyrected task competently from a plain-language description.

### Planned skills

| Skill | What it does |
|-------|-------------|
| `dyrected` | ✅ Available — install, configure, model content, all core patterns |
| `add-blocks` | Set up a full blocks-based page builder with dynamic renderer |
| `multi-site` | Multi-tenant / agency setup with `siteId`, scoped queries, shared content |
| `editorial-workflow` | Configure draft/review/publish workflows, transition guards, notifications |
| `migrate` | Migrate content schema from WordPress, Contentful, or Sanity to Dyrected |
| `add-auth` | Set up role-based auth with invite flow, protected routes, and field-level access |
| `add-ecommerce` | Products, variants, orders, inventory — a Dyrected content model for e-commerce |

### Design principles

- **One skill per job.** Each skill does one thing well. Install only what you need.
- **Plain language in, correct code out.** Every skill maps user intent to Dyrected patterns without requiring the developer to know CMS terminology.
- **Stays in sync with the docs.** Skills reference `docs.dyrected.com` and are updated alongside the main Dyrected release.
- **Composable.** Skills can reference each other. `add-blocks` builds on `dyrected`.

### Contributing

Skills are Markdown files. If you have a pattern that works well and isn't covered, open a PR with a new `skills/<name>/SKILL.md`.
