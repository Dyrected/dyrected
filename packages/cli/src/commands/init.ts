import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { execSync } from "child_process";
import { generateAIPrompt } from "@dyrected/sdk";
import { detectFramework, detectPackageManager } from "../utils/detect.js";
import { buildDbConfig, buildStorageConfig, buildEnvTemplate } from "../utils/config-templates.js";
import { writeNextFiles, writeNuxtFiles } from "../utils/writers.js";

export function registerInit(program: Command) {
  program
    .command("init")
    .description("Bootstrap a new Dyrected CMS project")
    .addHelpText(
      "after",
      `
Examples:
  # Interactive setup (detects your framework automatically)
  $ npx @dyrected/cli init

After running init:
  1. Fill in the values in .env
  2. Start your dev server
  3. Open the admin path you chose (default: /cms)
`,
    )
    .action(async () => {
      console.log(chalk.bold("\n🚀 Welcome to Dyrected CMS\n"));

      const cwd = process.cwd();
      const detectedFramework = await detectFramework(cwd);
      if (detectedFramework) {
        console.log(chalk.dim(`  Detected framework: ${detectedFramework === "next" ? "Next.js" : "Nuxt 3"}\n`));
      }

      const { framework } = await prompts({
        type: "select",
        name: "framework",
        message: "Which framework are you using?",
        choices: [
          { title: "Next.js", value: "next" },
          { title: "Nuxt 3", value: "nuxt" },
        ],
        initial: detectedFramework === "nuxt" ? 1 : 0,
      });

      if (!framework) {
        console.log(chalk.yellow("\nAborted."));
        process.exit(0);
      }

      const { quickSetup } = await prompts({
        type: "confirm",
        name: "quickSetup",
        message: "Use Quick Setup (SQLite + Local Storage)?",
        initial: true,
      });

      const { adminPath } = await prompts({
        type: "text",
        name: "adminPath",
        message: "What path should the admin dashboard use?",
        initial: "cms",
        format: (val) => val.replace(/^\//, "").replace(/\/$/, ""),
      });

      let db = "sqlite";
      let storage = "local";

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

      const packageManager = detectPackageManager(cwd);

      // ── 1. Install dependencies ────────────────────────────────────────────
      const frameworkPkg = framework === "next" ? "@dyrected/next" : "@dyrected/nuxt";
      const dbPkg = `@dyrected/db-${db}`;
      const storagePkg = `@dyrected/storage-${storage}`;
      const deps = [frameworkPkg, dbPkg, storagePkg].join(" ");

      console.log(chalk.blue(`\nInstalling ${deps}...`));
      try {
        execSync(`${packageManager} add ${deps}`, { cwd, stdio: "inherit" });
      } catch {
        console.log(chalk.yellow("\nCould not auto-install. Run the following manually:"));
        console.log(chalk.cyan(`  ${packageManager} add ${deps}\n`));
      }

      // ── 2. Write dyrected.config.ts ────────────────────────────────────────
      const dbImport = `import { ${db}Adapter } from '${dbPkg}'`;
      const storageImport = `import { ${storage}Adapter } from '${storagePkg}'`;
      const configContent = buildDyrectedConfig(dbImport, storageImport, buildDbConfig(db), buildStorageConfig(storage));

      const configPath = path.join(cwd, "dyrected.config.ts");
      if (await fs.pathExists(configPath)) {
        const { overwrite } = await prompts({
          type: "confirm",
          name: "overwrite",
          message: "dyrected.config.ts already exists. Overwrite?",
          initial: false,
        });
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

      // ── 3. Framework-specific files ────────────────────────────────────────
      if (framework === "next") {
        await writeNextFiles(cwd, adminPath);
      } else {
        await writeNuxtFiles(cwd, adminPath);
      }

      // ── 4. .env setup ──────────────────────────────────────────────────────
      const envContent = buildEnvTemplate(db, storage, framework);
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
          const { appendEnv } = await prompts({
            type: "confirm",
            name: "appendEnv",
            message: ".env already exists. Append missing Dyrected variables?",
            initial: true,
          });
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
        const { createEnv } = await prompts({
          type: "confirm",
          name: "createEnv",
          message: ".env file is missing. Create it now?",
          initial: true,
        });
        if (createEnv) {
          await fs.outputFile(envPath, envContent);
          console.log(chalk.green("✔  .env file created"));
        }
      }

      // ── Done ───────────────────────────────────────────────────────────────
      console.log(chalk.bold.green("\n✅ Dyrected is ready!\n"));
      console.log(chalk.cyan(`  1. Configure your environment variables in .env`));
      console.log(chalk.cyan(`  2. Open http://localhost:3000/${adminPath} to start managing content.`));
      console.log(chalk.cyan("  3. Run: npx @dyrected/cli generate:types\n"));

      const promptText = generateAIPrompt(framework as any, {
        baseUrl: "http://localhost:3000",
        isSelfHosted: true,
      });
      const promptPath = path.join(cwd, "dyrected-ai-prompt.md");
      await fs.outputFile(promptPath, promptText);

      console.log(chalk.bold.magenta("🤖 AI INTEGRATION PROMPT"));
      console.log(chalk.cyan(`  Prompt saved to: ${chalk.bold("dyrected-ai-prompt.md")}`));
      console.log(
        chalk.dim("  Copy the contents of this file to your AI (Claude, GPT, etc.) to scaffold your CMS logic.\n"),
      );
    });
}

function buildDyrectedConfig(dbImport: string, storageImport: string, dbConfig: string, storageConfig: string): string {
  return `import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'
${dbImport}
${storageImport}

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
  collections: [media, pages, posts],
  globals: [navigation, settings],
  db: ${dbConfig},
  storage: ${storageConfig},
})
`;
}
