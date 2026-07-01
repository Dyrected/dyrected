import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { execSync } from "child_process";
import { detectFramework, detectPackageManager, type SupportedFramework } from "../utils/detect.js";
import { buildAiRules } from "@dyrected/knowledge";
import {
  buildDbConfig,
  buildStorageConfig,
  buildEnvTemplate,
  buildViteEnvTemplate,
} from "../utils/config-templates.js";
import { writeNextFiles, writeNuxtFiles, writeReactFiles, writeVueFiles } from "../utils/writers.js";

export function registerInit(program: Command) {
  program
    .command("init")
    .description("Bootstrap a new Dyrected CMS project")
    .option("-y, --yes", "Skip prompts and use default settings (SQLite + Local Storage)")
    .option("-f, --framework <framework>", "Target framework (next, nuxt, react, vue)")
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

  # Non-interactive automated setup (Next.js, Postgres, S3, custom path)
  $ npx dyrected init -y -f next -d postgres -s s3 -p custom-admin

After running init:
  1. Fill in the values in .env
  2. Start your dev server
  3. Open the admin path you chose (default: /cms)
`,
    )
    .action(
      async (options: {
        yes?: boolean;
        framework?: string;
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

        if (!isSpa && !options.db && !options.storage && !autoAccept) {
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
        if (isSpa) {
          const frameworkPkg = framework === "react" ? "@dyrected/react" : "@dyrected/vue";
          deps = frameworkPkg;
        } else {
          const frameworkPkg = framework === "next" ? "@dyrected/next" : "@dyrected/nuxt";
          const dbPkg = `@dyrected/db-${db}`;
          const storagePkg = `@dyrected/storage-${storage}`;
          deps = ["@dyrected/core", frameworkPkg, dbPkg, storagePkg].join(" ");
        }

        console.log(chalk.blue(`\nInstalling ${deps}...`));
        try {
          execSync(`${packageManager} add ${deps}`, { cwd, stdio: "inherit" });
        } catch {
          console.log(chalk.yellow("\nCould not auto-install. Run the following manually:"));
          console.log(chalk.cyan(`  ${packageManager} add ${deps}\n`));
        }

        // ── 2. Write dyrected.config.ts (full-stack only) ─────────────────────
        if (!isSpa) {
          const dbPkg = `@dyrected/db-${db}`;
          const storagePkg = `@dyrected/storage-${storage}`;
          const dbImport = `import { ${db}Adapter } from '${dbPkg}'`;
          const storageFactory = {
            local: "localStorage",
            s3: "s3Storage",
            b2: "b2Storage",
            cloudinary: "cloudinaryStorage",
          }[storage];
          const storageImport = `import { ${storageFactory} } from '${storagePkg}'`;
          const configContent = buildDyrectedConfig(
            dbImport,
            storageImport,
            buildDbConfig(db),
            buildStorageConfig(storage),
          );

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
          await writeNextFiles(cwd, adminPath);
        } else if (framework === "nuxt") {
          await writeNuxtFiles(cwd, adminPath);
        } else if (framework === "react") {
          await writeReactFiles(cwd, adminPath);
        } else if (framework === "vue") {
          await writeVueFiles(cwd, adminPath);
        }

        // ── 4. .env setup ──────────────────────────────────────────────────────
        const envContent = isSpa ? buildViteEnvTemplate() : buildEnvTemplate(db, storage, framework);
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
          console.log(chalk.cyan(`  1. Set VITE_DYRECTED_URL and VITE_DYRECTED_API_KEY in .env`));
          console.log(chalk.cyan(`  2. Add a route for /${adminPath} in your router config`));
          console.log(chalk.cyan("  3. Start your dev server and open the admin route\n"));
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

function buildDyrectedConfig(dbImport: string, storageImport: string, dbConfig: string, storageConfig: string): string {
  return `import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'
${dbImport}
${storageImport}

// ── Admin Auth ────────────────────────────────────────────────────────────
// Reserved collection — sole login gateway for the Dyrected dashboard.
// Email + password are auto-managed; declare only extra fields here.

const admins = defineCollection({
  slug: '__admins',
  labels: { singular: 'Admin', plural: 'Admins' },
  auth: true,
  fields: [
    { name: 'name', type: 'text', required: true },
    { name: 'role', type: 'select', options: ['admin', 'editor'], defaultValue: 'admin' },
  ],
})

// ── Collections ──────────────────────────────────────────────────────────

const media = defineCollection({
  slug: 'media',
  labels: { singular: 'Media', plural: 'Media' },
  upload: true,
  fields: [
    { name: 'alt', type: 'text' },
  ],
})

const pages = defineCollection({
  slug: 'pages',
  labels: { singular: 'Page', plural: 'Pages' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
  ],
})

const posts = defineCollection({
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  fields: [
    { name: 'title', type: 'text', required: true },
    { name: 'content', type: 'richText' },
    { name: 'featuredImage', type: 'relationship', relationTo: 'media' },
  ],
})

// ── Globals ───────────────────────────────────────────────────────────────

const navigation = defineGlobal({
  slug: 'navigation',
  label: 'Navigation',
  fields: [
    {
      name: 'menuItems',
      type: 'array',
      fields: [
        { name: 'label', type: 'text' },
        { name: 'link', type: 'relationship', relationTo: 'pages' },
      ],
    },
  ],
})

const settings = defineGlobal({
  slug: 'settings',
  label: 'Site Settings',
  fields: [
    { name: 'siteName', type: 'text' },
    { name: 'logo', type: 'relationship', relationTo: 'media' },
    { name: 'footerText', type: 'textarea' },
  ],
})

// ── Config ────────────────────────────────────────────────────────────────

export default defineConfig({
  collections: [admins, media, pages, posts],
  globals: [navigation, settings],
  db: ${dbConfig},
  storage: ${storageConfig},
})
`;
}
