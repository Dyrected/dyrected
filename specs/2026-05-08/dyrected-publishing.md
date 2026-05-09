# Deploying and Publishing Dyrected Packages

This guide details the standard operating procedure for building, versioning, and publishing packages within the Dyrected monorepo. Because Dyrected uses a **pnpm workspace** orchestrated by **Turborepo**, releasing packages requires coordinating versions across multiple interdependent libraries.

---

## 1. Prerequisites

Ensure your working directory is clean, dependencies are up-to-date, and all packages build successfully.

```bash
# 1. Install all dependencies across the workspace
pnpm install

# 2. Run the build pipeline for all packages
pnpm build

# 3. Ensure tests and linting pass
pnpm test
pnpm lint
```

---

## 2. Managing Versions with Changesets

We recommend using [Changesets](https://github.com/changesets/changesets) for managing version bumps and generating changelogs in a monorepo. It automatically detects which packages need to be updated based on your changes and interdependent dependencies.

### Step 2.1: Initialize Changesets (One-time Setup)
If you haven't already initialized Changesets in the repository:
```bash
pnpm add -w -D @changesets/cli
pnpm changeset init
```

### Step 2.2: Create a Changeset
Whenever you make a change to one or more packages, generate a changeset. This will prompt you to select which packages changed and whether the bump is `major`, `minor`, or `patch`.

```bash
pnpm changeset
```
*Follow the interactive prompts to write a description of your changes.*

### Step 2.3: Version the Packages
When you are ready to release, run the version command. This consumes the changesets, updates the `package.json` versions (and dependent versions), and generates `CHANGELOG.md` files.

```bash
pnpm changeset version
```
*Review the updated `package.json` files and commit the changes.*

```bash
git add .
git commit -m "chore: version packages"
```

---

## 3. Publishing to npm

Once the packages are built and versioned, you are ready to publish.

### Step 3.1: Authenticate with npm
Ensure you are logged into your npm account and have write access to the `@dyrected` organization.

```bash
npm login
```

### Step 3.2: Publish the Workspace
You can publish all updated, non-private packages in the workspace simultaneously using pnpm's recursive publish command, or let changesets handle it:

```bash
# Using Changesets (Recommended):
pnpm changeset publish

# Alternatively, using native pnpm:
pnpm publish -r --access public
```

---

## 4. Local Testing Before Publishing

If you want to test the built packages locally in another project *without* publishing to the npm registry, use `pnpm link` or pack the tarballs.

### Method A: pnpm link
1. Navigate to the package you want to link (e.g., `@dyrected/core`).
2. Run `pnpm link --global`.
3. Navigate to your external consumer project.
4. Run `pnpm link --global @dyrected/core`.

### Method B: Pack Tarballs
If you want to test exactly what npm will receive:
```bash
cd packages/core
pnpm pack
```
This generates a `.tgz` file that you can install in your external project:
```bash
npm install /path/to/dyrected/packages/core/dyrected-core-1.0.0.tgz
```

---

## 5. Continuous Integration (CI)

For automated deployments, you can set up a GitHub Action to publish packages whenever code is merged into the `main` branch.

Use the official Changesets GitHub Action (`changesets/action`) to automatically open a "Version Packages" Pull Request. When you merge that PR, the action will automatically run `pnpm build` and `pnpm changeset publish`.
