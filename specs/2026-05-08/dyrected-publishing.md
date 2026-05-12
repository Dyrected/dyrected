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

### Step 2.3: Automated Release Flow (GitHub Actions)
Dyrected uses a "Version PR" flow via GitHub Actions. You do NOT need to run the version or publish commands manually.

1.  **Commit and Push**: Push your code changes along with the new changeset file to the `main` branch.
2.  **Version PR**: The "Release" GitHub Action will detect the changeset and automatically open a Pull Request named **"Version Packages"**. This PR contains the version bumps and updated changelogs.
3.  **Merge**: Once you review and merge the "Version Packages" PR back into `main`, the Action will automatically:
    - Run the build pipeline (`pnpm build`).
    - Publish the new versions to the npm registry.
    - Create git tags for each package version.

---

## 3. Manual Release (Emergency/Local Only)

In rare cases where you need to release manually from your local machine:

### Step 3.1: Versioning
```bash
pnpm changeset version
```
*Review the updated `package.json` files and commit.*

### Step 3.2: Publishing
Ensure you have an `NPM_TOKEN` or are logged in via `npm login`.

```bash
pnpm build
pnpm changeset publish
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

Dyrected is configured with a GitHub Action (`.github/workflows/release.yml`) that automates the entire release process.

### Required Secrets
To enable the automated release flow, ensure the following secret is added to the GitHub repository (**Settings > Secrets and variables > Actions**):

- `NPM_TOKEN`: An npm automation token with publish permissions for the `@dyrected` scope.

The `GITHUB_TOKEN` is provided automatically by GitHub Actions and is used to create the Versioning PRs and Git tags.
