# Dyrected CLI Reference

The `@dyrected/cli` is your primary tool for managing the Dyrected lifecycle—from initial project setup to database migrations and TypeScript type generation.

---

## Installation

The CLI is typically installed as a development dependency in your project:

```bash
pnpm add -D @dyrected/cli
```

You can then run it via `npx` or `pnpm`:

```bash
pnpm dyrected <command>
```

---

## Commands

### `init`
Initializes a new Dyrected configuration in the current directory. It creates a `dyrected.config.ts` file and prompts for database and storage preferences.

```bash
pnpm dyrected init
```

### `generate:types`
Analyzes your `dyrected.config.ts` and generates a comprehensive TypeScript definition file. This is what provides end-to-end type safety when using the SDK.

```bash
pnpm dyrected generate:types
```
- **Options**:
    - `-o, --output <path>`: Specify the output file path (default: `dyrected-types.d.ts`).

### `db:migrate`
Runs pending database migrations. Dyrected handles schema synchronization automatically for most adapters, but production environments require explicit migration steps.

```bash
pnpm dyrected db:migrate
```

### `db:seed`
Seeds the database with initial data or creates the first admin user for a fresh installation.

```bash
pnpm dyrected db:seed --email admin@example.com --password secret
```

### `dev`
Starts a standalone instance of the Dyrected backend for development. This is useful if you are building an app that isn't Next.js or Nuxt and need a separate API process.

```bash
pnpm dyrected dev --port 3001
```

### `cloud:login`
Authenticates your local environment with Dyrected Cloud. This is required for syncing schemas or managing cloud-hosted sites.

```bash
pnpm dyrected cloud:login
```

### `cloud:sync`
Uploads your local `dyrected.config.ts` schema to Dyrected Cloud. This is used when you want to use the Cloud's management features but prefer defining your schema in code.

```bash
pnpm dyrected cloud:sync
```

---

## Integration with Scripts

We recommend adding these commands to your `package.json` for a better developer experience:

```json
{
  "scripts": {
    "cms:init": "dyrected init",
    "cms:types": "dyrected generate:types",
    "cms:migrate": "dyrected db:migrate",
    "postinstall": "dyrected generate:types"
  }
}
```

By adding `generate:types` to `postinstall`, your types will always stay in sync with your schema whenever dependencies are updated.
