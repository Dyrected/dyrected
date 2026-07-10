import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { execSync } from "child_process";
import { detectFramework, detectPackageManager, type SupportedFramework } from "../utils/detect.js";
import { buildAiRules } from "@dyrected/knowledge";
import {
  type BackendMode,
  buildDbConfig,
  buildStorageConfig,
  buildEnvTemplate,
  buildViteEnvTemplate,
} from "../utils/config-templates.js";
import { writeNextFiles, writeNuxtFiles, writeReactFiles, writeVueFiles } from "../utils/writers.js";

function buildAddCommand(packageManager: string, deps: string[], dev = false): string {
  if (deps.length === 0) return "";

  const joined = deps.join(" ");
  if (packageManager === "npm") return `npm install ${dev ? "--save-dev " : ""}${joined}`.trim();
  if (packageManager === "yarn") return `yarn add ${dev ? "--dev " : ""}${joined}`.trim();
  if (packageManager === "bun") return `bun add ${dev ? "--dev " : ""}${joined}`.trim();
  return `pnpm add ${dev ? "-D " : ""}${joined}`.trim();
}

function buildSyncRunnerScript(): string {
  return `import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const installedCliPath = path.resolve(__dirname, "../node_modules/dyrected/dist/index.js");
const workspaceCliPath = path.resolve(__dirname, "../../../packages/cli/dist/index.js");

const cliPath = [installedCliPath, workspaceCliPath].find((candidate) => existsSync(candidate));

if (!cliPath) {
  console.error("[dyrected sync] Could not find the Dyrected CLI build.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, "sync:schema", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
`;
}

function isBackendMode(value: string | undefined): value is BackendMode {
  return value === "cloud" || value === "self-hosted";
}

async function ensureCloudSyncScripts(cwd: string) {
  const packageJsonPath = path.join(cwd, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) return;

  const pkg = await fs.readJson(packageJsonPath);
  const scripts = { ...(pkg.scripts || {}) } as Record<string, string>;
  const syncScriptName = "dyrected:sync-schema";
  const syncRunnerPath = path.join(cwd, "scripts", "run-dyrected-sync.mjs");
  const syncScriptCommand = "node ./scripts/run-dyrected-sync.mjs";
  const buildSyncCommand = "node ./scripts/run-dyrected-sync.mjs --skip-on-error --skip-types";

  scripts[syncScriptName] = syncScriptCommand;
  if (scripts.postbuild !== buildSyncCommand && !scripts.postbuild?.includes(buildSyncCommand)) {
    scripts.postbuild = scripts.postbuild
      ? `${scripts.postbuild} && ${buildSyncCommand}`
      : buildSyncCommand;
  }

  pkg.scripts = scripts;
  await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
  await fs.outputFile(syncRunnerPath, buildSyncRunnerScript());
  console.log(chalk.green("✔  package.json updated with Dyrected Cloud sync scripts"));
}

export function registerInit(program: Command) {
  program
    .command("init")
    .description("Bootstrap a new Dyrected CMS project")
    .option("-y, --yes", "Skip prompts and use default settings (SQLite + Local Storage)")
    .option("-f, --framework <framework>", "Target framework (next, nuxt, react, vue)")
    .option("-b, --backend <backend>", "Backend mode (cloud, self-hosted)")
    .option("-d, --db <adapter>", "Database adapter (sqlite, postgres, mysql, mongodb)")
    .option("-s, --storage <adapter>", "Storage adapter (local, s3, b2, cloudinary)")
    .option("-p, --path <path>", "Admin dashboard route path", "admin")
    .option("-o, --overwrite", "Overwrite existing config/env files without confirmation")
    .addHelpText(
      "after",
      `
Examples:
  # Interactive setup (detects your framework automatically)
  $ npx dyrected init

  # Non-interactive Dyrected Cloud setup
  $ npx dyrected init -y -f next -b cloud -p admin

  # Non-interactive self-hosted setup (Next.js, Postgres, S3, custom path)
  $ npx dyrected init -y -f next -b self-hosted -d postgres -s s3 -p custom-admin

After running init:
  1. Fill in the values in .env
  2. Start your dev server
  3. Open the admin path you chose (default: /admin)
`,
    )
    .action(
      async (options: {
        yes?: boolean;
        framework?: string;
        backend?: string;
        db?: string;
        storage?: string;
        path?: string;
        overwrite?: boolean;
      }) => {
        console.log(chalk.bold("\n🚀 Welcome to Dyrected CMS\n"));

        const cwd = process.cwd();
        const detection = await detectFramework(cwd);
        const autoAccept = !!options.yes;
        const forceOverwrite = !!options.overwrite || autoAccept;

        if (detection && !detection.supported) {
          console.log(chalk.yellow(`  Detected framework: ${detection.name}`));
          console.log(chalk.red(`\n  Dyrected doesn't have a native ${detection.name} integration yet.`));
          console.log(chalk.dim(`  Supported frameworks: Next.js, Nuxt 3, React, Vue`));
          console.log(
            chalk.dim(`  You can still use the SDK directly: https://docs.dyrected.com/docs/integrations/sdk\n`),
          );
          process.exit(0);
        }

        let framework: SupportedFramework;
        const validFrameworks: SupportedFramework[] = ["next", "nuxt", "react", "vue"];
        if (options.framework && validFrameworks.includes(options.framework as SupportedFramework)) {
          framework = options.framework as SupportedFramework;
        } else if (detection?.supported) {
          const labels: Record<SupportedFramework, string> = {
            next: "Next.js",
            nuxt: "Nuxt 3",
            react: "React",
            vue: "Vue",
          };
          console.log(chalk.dim(`  Detected framework: ${labels[detection.framework]} — skipping prompt\n`));
          framework = detection.framework;
        } else if (autoAccept) {
          console.log(chalk.dim("  No framework detected. Defaulting to Next.js\n"));
          framework = "next";
        } else {
          const answer = await prompts({
            type: "select",
            name: "framework",
            message: "Which framework are you using?",
            choices: [
              { title: "Next.js", value: "next" },
              { title: "Nuxt 3", value: "nuxt" },
              { title: "React", value: "react" },
              { title: "Vue", value: "vue" },
            ],
          });
          if (!answer.framework) {
            console.log(chalk.yellow("\nAborted."));
            process.exit(0);
          }
          framework = answer.framework;
        }

        const isSpa = framework === "react" || framework === "vue";
        let backend: BackendMode = "cloud";

        if (options.backend && !isBackendMode(options.backend)) {
          console.log(chalk.red(`\nInvalid backend "${options.backend}". Use "cloud" or "self-hosted".\n`));
          process.exit(1);
        }

        if (isSpa) {
          if (options.backend === "self-hosted") {
            console.log(
              chalk.red("\nReact and Vue currently connect to Dyrected Cloud only. Use --backend cloud.\n"),
            );
            process.exit(1);
          }
          backend = "cloud";
        } else if (options.backend) {
          backend = options.backend as BackendMode;
        } else if (!autoAccept) {
          const answer = await prompts({
            type: "select",
            name: "backend",
            message: "Where should the Dyrected backend run?",
            choices: [
              {
                title: "Dyrected Cloud (recommended)",
                value: "cloud",
                description: "Use Dyrected-hosted API, database, storage, and auth.",
              },
              {
                title: "Self-hosted in this app",
                value: "self-hosted",
                description: "Run the full backend inside your Next.js or Nuxt app.",
              },
            ],
            initial: 0,
          });
          if (!answer.backend) {
            console.log(chalk.yellow("\nAborted."));
            process.exit(0);
          }
          backend = answer.backend as BackendMode;
        }

        let adminPath = options.path || "admin";
        if (!options.path && !autoAccept) {
          const answer = await prompts({
            type: "text",
            name: "adminPath",
            message: "What path should the admin dashboard use?",
            initial: "admin",
            format: (val: string) => val.replace(/^\//, "").replace(/\/$/, ""),
          });
          adminPath = answer.adminPath || "admin";
        }

        let db = "sqlite";
        let storage = "local";

        const validDbs = ["sqlite", "postgres", "mysql", "mongodb"];
        const validStorages = ["local", "s3", "b2", "cloudinary"];

        if (options.db && validDbs.includes(options.db)) {
          db = options.db;
        }
        if (options.storage && validStorages.includes(options.storage)) {
          storage = options.storage;
        }

        if (!isSpa && backend === "self-hosted" && !options.db && !options.storage && !autoAccept) {
          const { quickSetup } = await prompts({
            type: "confirm",
            name: "quickSetup",
            message: "Use Quick Setup (SQLite + Local Storage)?",
            initial: true,
          });

          if (!quickSetup) {
            const dbResponse = await prompts({
              type: "select",
              name: "value",
              message: "Which database adapter?",
              choices: [
                { title: "PostgreSQL (recommended)", value: "postgres" },
                { title: "MySQL", value: "mysql" },
                { title: "SQLite (local dev)", value: "sqlite" },
                { title: "MongoDB", value: "mongodb" },
              ],
            });
            db = dbResponse.value;

            const storageResponse = await prompts({
              type: "select",
              name: "value",
              message: "Which storage adapter?",
              choices: [
                { title: "Local filesystem", value: "local" },
                { title: "AWS S3", value: "s3" },
                { title: "Backblaze B2", value: "b2" },
                { title: "Cloudinary", value: "cloudinary" },
              ],
            });
            storage = storageResponse.value;
          }
        }

        const packageManager = detectPackageManager(cwd);

        // ── 1. Install dependencies ────────────────────────────────────────────
        let deps: string;
        const devDeps: string[] = [];
        if (isSpa) {
          const frameworkPkg = framework === "react" ? "@dyrected/react" : "@dyrected/vue";
          deps = ["@dyrected/core", frameworkPkg].join(" ");
          devDeps.push("dyrected");
        } else {
          const frameworkPkg = framework === "next" ? "@dyrected/next" : "@dyrected/nuxt";
          const fullStackDeps = ["@dyrected/core", frameworkPkg];
          if (backend === "self-hosted") {
            fullStackDeps.push(`@dyrected/db-${db}`, `@dyrected/storage-${storage}`);
          }
          deps = fullStackDeps.join(" ");
          devDeps.push("dyrected");
        }

        console.log(chalk.blue(`\nInstalling ${deps}...`));
        try {
          execSync(buildAddCommand(packageManager, deps.split(" ")), { cwd, stdio: "inherit" });
          if (devDeps.length > 0) {
            console.log(chalk.blue(`Installing ${devDeps.join(" ")} as a dev dependency...`));
            execSync(buildAddCommand(packageManager, devDeps, true), { cwd, stdio: "inherit" });
          }
        } catch {
          console.log(chalk.yellow("\nCould not auto-install. Run the following manually:"));
          console.log(chalk.cyan(`  ${buildAddCommand(packageManager, deps.split(" "))}`));
          if (devDeps.length > 0) {
            console.log(chalk.cyan(`  ${buildAddCommand(packageManager, devDeps, true)}`));
          }
          console.log("");
        }

        // ── 2. Write dyrected.config.ts ───────────────────────────────────────
        if (!isSpa || backend === "cloud") {
          const configContent =
            backend === "self-hosted"
              ? buildDyrectedConfig({
                  backend,
                  dbImport: `import { ${db}Adapter } from '@dyrected/db-${db}'`,
                  storageImport: `import { ${
                    {
                      local: "localStorage",
                      s3: "s3Storage",
                      b2: "b2Storage",
                      cloudinary: "cloudinaryStorage",
                    }[storage]
                  } } from '@dyrected/storage-${storage}'`,
                  dbConfig: buildDbConfig(db),
                  storageConfig: buildStorageConfig(storage),
                })
              : buildDyrectedConfig({ backend });

          const configPath = path.join(cwd, "dyrected.config.ts");
          if (await fs.pathExists(configPath)) {
            let overwrite = forceOverwrite;
            if (!forceOverwrite) {
              const answer = await prompts({
                type: "confirm",
                name: "overwrite",
                message: "dyrected.config.ts already exists. Overwrite?",
                initial: false,
              });
              overwrite = answer.overwrite;
            }
            if (!overwrite) {
              console.log(chalk.yellow("Skipping config file."));
            } else {
              await fs.outputFile(configPath, configContent);
              console.log(chalk.green("✔  dyrected.config.ts written"));
            }
          } else {
            await fs.outputFile(configPath, configContent);
            console.log(chalk.green("✔  dyrected.config.ts written"));
          }
        }

        // ── 3. Framework-specific files ────────────────────────────────────────
        if (framework === "next") {
          await writeNextFiles(cwd, adminPath, backend);
        } else if (framework === "nuxt") {
          await writeNuxtFiles(cwd, adminPath, backend);
        } else if (framework === "react") {
          await writeReactFiles(cwd, adminPath);
        } else if (framework === "vue") {
          await writeVueFiles(cwd, adminPath);
        }

        if (backend === "cloud") {
          await ensureCloudSyncScripts(cwd);
        }

        // ── 4. .env setup ──────────────────────────────────────────────────────
        const envContent = isSpa
          ? buildViteEnvTemplate()
          : buildEnvTemplate(framework as "next" | "nuxt", backend, db, storage);
        const envExamplePath = path.join(cwd, ".env.example");
        await fs.outputFile(envExamplePath, envContent);
        console.log(chalk.green("✔  .env.example written"));

        const envPath = path.join(cwd, ".env");
        if (await fs.pathExists(envPath)) {
          const existingEnv = await fs.readFile(envPath, "utf-8");
          const missingVars = envContent
            .split("\n")
            .filter((line: string) => {
              if (!line || line.startsWith("#")) return false;
              const key = line.split("=")[0];
              return !existingEnv.includes(`${key}=`);
            })
            .join("\n");

          if (missingVars) {
            let appendEnv = forceOverwrite;
            if (!forceOverwrite) {
              const answer = await prompts({
                type: "confirm",
                name: "appendEnv",
                message: ".env already exists. Append missing Dyrected variables?",
                initial: true,
              });
              appendEnv = answer.appendEnv;
            }
            if (appendEnv) {
              await fs.appendFile(
                envPath,
                `\n# ── Dyrected CMS ──────────────────────────────────────────────────\n${missingVars}`,
              );
              console.log(chalk.green("✔  .env file updated with missing variables"));
            }
          } else {
            console.log(chalk.dim("ℹ  .env already contains all required variables."));
          }
        } else {
          let createEnv = forceOverwrite;
          if (!forceOverwrite) {
            const answer = await prompts({
              type: "confirm",
              name: "createEnv",
              message: ".env file is missing. Create it now?",
              initial: true,
            });
            createEnv = answer.createEnv;
          }
          if (createEnv) {
            await fs.outputFile(envPath, envContent);
            console.log(chalk.green("✔  .env file created"));
          }
        }

        // ── AI rules ──────────────────────────────────────────────────────────
        const aiRulesPath = path.join(cwd, ".dyrected", "ai-rules.md");
        if (!(await fs.pathExists(aiRulesPath))) {
          await fs.outputFile(aiRulesPath, buildAiRules());
          console.log(chalk.green("✔  .dyrected/ai-rules.md created"));
        }

        const agentRulePointers = [
          {
            path: path.join(cwd, "AGENTS.md"),
            content:
              "# Project agent instructions\n\nRead and follow `.dyrected/ai-rules.md` for every Dyrected CMS task.\n",
          },
          {
            path: path.join(cwd, "CLAUDE.md"),
            content: "# Project instructions\n\n@.dyrected/ai-rules.md\n",
          },
          {
            path: path.join(cwd, ".github", "copilot-instructions.md"),
            content: "# Copilot instructions\n\nRead and follow `.dyrected/ai-rules.md` for every Dyrected CMS task.\n",
          },
          {
            path: path.join(cwd, ".cursor", "rules", "dyrected.mdc"),
            content:
              "---\ndescription: Dyrected CMS project rules\nalwaysApply: true\n---\n\nRead and follow `.dyrected/ai-rules.md` before changing Dyrected configuration or integration code.\n",
          },
        ];
        for (const pointer of agentRulePointers) {
          if (!(await fs.pathExists(pointer.path))) await fs.outputFile(pointer.path, pointer.content);
        }

        // ── Done ───────────────────────────────────────────────────────────────
        console.log(chalk.bold.green("\n✅ Dyrected is ready!\n"));
        if (isSpa) {
          console.log(chalk.cyan(`  1. Set DYRECTED_URL, DYRECTED_API_KEY, and DYRECTED_SITE_ID in .env`));
          console.log(
            chalk.cyan(`  2. Set VITE_DYRECTED_URL, VITE_DYRECTED_API_KEY, and VITE_DYRECTED_SITE_ID in .env`),
          );
          console.log(chalk.cyan("  3. Run npm run dyrected:sync-schema after editing dyrected.config.ts"));
          console.log(chalk.cyan(`  4. Add a route for /${adminPath} in your router config`));
          console.log(chalk.cyan("  5. Start your dev server and open the admin route\n"));
        } else if (backend === "cloud") {
          console.log(chalk.cyan(`  1. Set DYRECTED_URL, DYRECTED_API_KEY, and DYRECTED_SITE_ID in .env`));
          console.log(
            chalk.cyan(
              `  2. Set ${framework === "next" ? "NEXT_PUBLIC" : "NUXT_PUBLIC"}_DYRECTED_URL, ${framework === "next" ? "NEXT_PUBLIC" : "NUXT_PUBLIC"}_DYRECTED_API_KEY, and ${framework === "next" ? "NEXT_PUBLIC" : "NUXT_PUBLIC"}_DYRECTED_SITE_ID in .env`,
            ),
          );
          console.log(chalk.cyan(`  3. Open http://localhost:3000/${adminPath} and run npm run dyrected:sync-schema\n`));
        } else {
          console.log(chalk.cyan(`  1. Configure your environment variables in .env`));
          console.log(chalk.cyan(`  2. Open http://localhost:3000/${adminPath} to start managing content.`));
          console.log(chalk.cyan("  3. Run: npx dyrected generate:types\n"));
        }

        console.log(chalk.bold.magenta("🤖 Using Claude Code or Cursor?"));
        console.log(chalk.dim("  Install the Dyrected skill to give your AI agent full context:"));
        console.log(chalk.cyan("  npx skills add dyrected/agent-skills@dyrected\n"));
      },
    );
}

function buildDyrectedConfig(options: {
  backend: BackendMode;
  dbImport?: string;
  storageImport?: string;
  dbConfig?: string;
  storageConfig?: string;
}): string {
  const configLines = [`  collections: [Admins, Media, Pages, Posts],`, `  globals: [Navigation, Settings],`];
  if (options.backend === "self-hosted") {
    configLines.push(`  db: ${options.dbConfig},`, `  storage: ${options.storageConfig},`);
  }

  return `import {
  defineCollection,
  defineGlobal,
  defineConfig,
  defineTextField,
  defineTextareaField,
  defineSelectField,
  defineRichTextField,
  defineRelationshipField,
  defineArrayField,
} from '@dyrected/core'
${options.dbImport ? `${options.dbImport}\n` : ""}${options.storageImport ? options.storageImport : ""}

// ── Admin Auth ────────────────────────────────────────────────────────────
// Reserved collection — sole login gateway for the Dyrected dashboard.
// Email + password are auto-managed; declare only extra fields here.

const Admins = defineCollection({
  slug: '__admins',
  labels: { singular: 'Admin', plural: 'Admins' },
  auth: true,
  admin: { icon: 'Users', useAsTitle: 'name' },
  fields: [
    defineTextField({ name: 'name', required: true }),
    defineSelectField({ name: 'roles', options: ['admin', 'editor'], defaultValue: 'admin' }),
  ],
})

// ── Collections ──────────────────────────────────────────────────────────

const Media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: true,
  admin: { icon: 'Image', useAsTitle: 'alt' },
  fields: [
    defineTextField({ name: 'alt' }),
  ],
})

const Pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  admin: {
    icon: 'FileText',
    useAsTitle: 'title',
    // Jexl expression evaluated against the document (+ siteUrl). Relative
    // results are prefixed with your site URL automatically.
    previewUrl: "slug == 'home' ? '/' : '/' + slug",
  },
  fields: [
    defineTextField({ name: 'title', required: true }),
    defineTextField({ name: 'slug', required: true }),
    defineRichTextField({ name: 'content' }),
    defineRelationshipField({ name: 'featuredImage', relationTo: 'media' }),
  ],
})

const Posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  admin: { icon: 'Newspaper', useAsTitle: 'title' },
  fields: [
    defineTextField({ name: 'title', required: true }),
    defineRichTextField({ name: 'content' }),
    defineRelationshipField({ name: 'featuredImage', relationTo: 'media' }),
  ],
})

// ── Globals ───────────────────────────────────────────────────────────────

const Navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  admin: { icon: 'Menu' },
  fields: [
    defineArrayField({
      name: 'menuItems',
      fields: [
        defineTextField({ name: 'label' }),
        defineRelationshipField({ name: 'link', relationTo: 'pages' }),
      ],
    }),
  ],
})

const Settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  admin: { icon: 'Settings' },
  fields: [
    defineTextField({ name: 'siteName' }),
    defineRelationshipField({ name: 'logo', relationTo: 'media' }),
    defineTextareaField({ name: 'footerText' }),
  ],
})

// ── Config ────────────────────────────────────────────────────────────────

export default defineConfig({
${configLines.join("\n")}
})
`;
}
