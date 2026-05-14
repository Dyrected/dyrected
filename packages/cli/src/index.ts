#!/usr/bin/env node
import { Command } from "commander";
import prettier from "prettier";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import prompts from "prompts";
import { execSync } from "child_process";
import { createJiti } from "jiti";
import { generateAIPrompt } from "@dyrected/core";

const program = new Command();

program.name("dyrected").description("Dyrected CMS CLI tool").version("0.0.1");

// ─── init ──────────────────────────────────────────────────────────────────

program
  .command("init")
  .description("Bootstrap a new Dyrected CMS project")
  .action(async () => {
    console.log(chalk.bold("\n🚀 Welcome to Dyrected CMS\n"));

    const { framework } = await prompts({
      type: "select",
      name: "framework",
      message: "Which framework are you using?",
      choices: [
        { title: "Next.js (App Router)", value: "next" },
        { title: "Nuxt 3", value: "nuxt" },
      ],
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

    const cwd = process.cwd();
    const packageManager = detectPackageManager(cwd);

    // ── 1. Install dependencies ──────────────────────────────────────────
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

    // ── 2. Write dyrected.config.ts ──────────────────────────────────────
    const dbImport = `import { ${db}Adapter } from '${dbPkg}'`;
    const storageImport = `import { ${storage}Adapter } from '${storagePkg}'`;
    const dbConfig = buildDbConfig(db);
    const storageConfig = buildStorageConfig(storage);

    const configContent = `import { defineCollection, defineGlobal, defineConfig } from '@dyrected/core'
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

    // ── 3. Framework-specific files ──────────────────────────────────────
    if (framework === "next") {
      await writeNextFiles(cwd, adminPath);
    } else {
      await writeNuxtFiles(cwd, adminPath);
    }

    // ── 4. .env setup ───────────────────────────────────────────────────
    const envContent = buildEnvTemplate(db, storage, framework);
    const envExamplePath = path.join(cwd, ".env.example");
    await fs.outputFile(envExamplePath, envContent);
    console.log(chalk.green("✔  .env.example written"));

    const envPath = path.join(cwd, ".env");
    if (await fs.pathExists(envPath)) {
      const existingEnv = await fs.readFile(envPath, "utf-8");
      const missingVars = envContent
        .split("\n")
        .filter((line) => {
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

    // ── Done ─────────────────────────────────────────────────────────────
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

// ── Helpers ────────────────────────────────────────────────────────────────

function detectPackageManager(cwd: string): string {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  return "npm";
}

function buildDbConfig(db: string): string {
  switch (db) {
    case "postgres":
      return `postgresAdapter({ url: process.env.DATABASE_URL! })`;
    case "sqlite":
      return `sqliteAdapter({ filename: './data.db' })`;
    case "mongodb":
      return `mongodbAdapter({ url: process.env.DATABASE_URL! })`;
    default:
      return `postgresAdapter({ url: process.env.DATABASE_URL! })`;
  }
}

function buildStorageConfig(storage: string): string {
  switch (storage) {
    case "local":
      return `localAdapter({ directory: './public/uploads', serveFrom: '/uploads' })`;
    case "s3":
      return `s3Adapter({ bucket: process.env.S3_BUCKET!, region: process.env.S3_REGION!, accessKeyId: process.env.S3_ACCESS_KEY_ID!, secretAccessKey: process.env.S3_SECRET_ACCESS_KEY! })`;
    case "b2":
      return `b2Adapter({ bucketId: process.env.B2_BUCKET_ID!, keyId: process.env.B2_KEY_ID!, applicationKey: process.env.B2_APPLICATION_KEY! })`;
    case "cloudinary":
      return `cloudinaryAdapter({ cloudName: process.env.CLOUDINARY_CLOUD_NAME!, apiKey: process.env.CLOUDINARY_API_KEY!, apiSecret: process.env.CLOUDINARY_API_SECRET! })`;
    default:
      return `localAdapter({ directory: './public/uploads', serveFrom: '/uploads' })`;
  }
}

async function writeNextFiles(cwd: string, adminPath: string) {
  const apiRoutePath = path.join(cwd, "app/dyrected/[...route]/route.ts");
  if (!(await fs.pathExists(apiRoutePath))) {
    await fs.outputFile(apiRoutePath, `export { GET, POST, PUT, PATCH, DELETE } from '@dyrected/next'\n`);
    console.log(chalk.green("✔  app/dyrected/[...route]/route.ts written"));
  }

  const adminPagePath = path.join(cwd, `app/${adminPath}/page.tsx`);
  if (!(await fs.pathExists(adminPagePath))) {
    await fs.outputFile(
      adminPagePath,
      `import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin apiPath="/dyrected" />
}
`,
    );
    console.log(chalk.green(`✔  app/${adminPath}/page.tsx written`));
  }
}

async function writeNuxtFiles(cwd: string, adminPath: string) {
  console.log(chalk.yellow("\n⚠  Add the module to your nuxt.config.ts:"));
  console.log(
    chalk.dim(`
  modules: ['@dyrected/nuxt'],
`),
  );

  const adminPagePath = path.join(cwd, `pages/${adminPath}/index.vue`);
  if (!(await fs.pathExists(adminPagePath))) {
    await fs.outputFile(
      adminPagePath,
      `<template>
  <ClientOnly>
    <DyrectedAdmin basename="/${adminPath}" />
  </ClientOnly>
</template>

<script setup lang="ts">
definePageMeta({
  layout: false,
});
</script>
`,
    );
    console.log(chalk.green(`✔  pages/${adminPath}/index.vue written`));
  }
}

function buildEnvTemplate(db: string, storage: string, framework: string): string {
  const lines = [
    `# Dyrected CMS — Environment Variables`,
    `DATABASE_URL=${db === "mongodb" ? "mongodb://localhost:27017/dyrected" : "postgres://user:pass@localhost:5432/dyrected"}`,
    `JWT_SECRET=change-me-32-characters-minimum`,
    `ENCRYPTION_KEY=change-me-aes-256-key`,
    ``,
  ];

  if (storage === "s3") {
    lines.push(`S3_BUCKET=my-bucket`, `S3_REGION=us-east-1`, `S3_ACCESS_KEY_ID=`, `S3_SECRET_ACCESS_KEY=`);
  } else if (storage === "b2") {
    lines.push(`B2_BUCKET_ID=`, `B2_KEY_ID=`, `B2_APPLICATION_KEY=`);
  } else if (storage === "cloudinary") {
    lines.push(`CLOUDINARY_CLOUD_NAME=`, `CLOUDINARY_API_KEY=`, `CLOUDINARY_API_SECRET=`);
  }

  const prefix = framework === "next" ? "NEXT_PUBLIC_" : "NUXT_PUBLIC_";

  lines.push(``, `${prefix}DYRECTED_URL=http://localhost:3000`, `${prefix}DYRECTED_API_KEY=local-dev`);
  return lines.join("\n") + "\n";
}

// ─── generate:types ─────────────────────────────────────────────────────────

program
  .command("generate:types")
  .description("Generate TypeScript interfaces from your Dyrected schema")
  .option("-u, --url <url>", "Base URL of your Dyrected API (Cloud or self-hosted)")
  .option("-c, --config <path>", "Path to your dyrected.config.ts (Self-hosted)", "./dyrected.config.ts")
  .option("-o, --output <path>", "Output file path", "./dyrected-types.ts")
  .action(async (options) => {
    try {
      let schema: any;
      if (options.url) {
        console.log(chalk.blue(`Fetching schemas from ${options.url}/api/schemas...`));
        const response = await fetch(`${options.url}/api/schemas`);
        if (!response.ok) {
          throw new Error(`Failed to fetch schemas: ${response.statusText}`);
        }
        schema = await response.json();
      } else {
        const configPath = path.resolve(process.cwd(), options.config);
        if (await fs.pathExists(configPath)) {
          console.log(chalk.blue(`Generating types from local config: ${configPath}...`));
          const jiti = createJiti(configPath);
          const configModule = (await jiti.import(configPath)) as any;
          schema = configModule.default || configModule;
        } else {
          // Fallback to default localhost if no config found
          const url = "http://localhost:3000";
          console.log(chalk.blue(`No local config found. Fetching schemas from ${url}/api/schemas...`));
          const response = await fetch(`${url}/api/schemas`);
          if (!response.ok) {
            throw new Error(`Failed to fetch schemas: ${response.statusText}`);
          }
          schema = await response.json();
        }
      }

      if (!schema || !schema.collections) {
        throw new Error("Invalid schema: collections missing.");
      }
      const code = generateTypes(schema);
      const formattedCode = await prettier.format(code, { parser: "typescript" });
      await fs.outputFile(path.resolve(process.cwd(), options.output), formattedCode);

      console.log(chalk.green(`\nSuccess! Types generated at ${options.output}`));
    } catch (error: any) {
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

function generateTypes(schema: any) {
  let code = `/**
 * This file was automatically generated by Dyrected CLI.
 * DO NOT MODIFY IT BY HAND.
 */

export interface Media {
  id: string;
  filename: string;
  filesize: number;
  mimeType: string;
  url: string;
  width?: number;
  height?: number;
  createdAt: string;
  updatedAt: string;
}
\n`;

  for (const col of schema.collections) {
    if (!col || !col.slug) continue;
    const interfaceName = toPascalCase(col.slug);

    // Skip if it's the base Media interface and we already have it
    if (interfaceName === "Media") {
      // We could merge fields here if we want, but usually base Media is enough
      // For now, let's just add the custom fields to a separate interface or merge
      code = code.replace("export interface Media {", `export interface MediaBase {`);
      code = code.replace("export interface MediaBase {", `export interface Media {`);
    }

    const existingInterface = code.includes(`export interface ${interfaceName} {`);
    if (existingInterface && interfaceName !== "Media") continue;

    if (interfaceName === "Media") {
      // If it's Media, we just want to add the extra fields to the existing interface
      const extraFields = col.fields.filter(
        (f: any) =>
          !["filename", "filesize", "mimeType", "url", "width", "height", "createdAt", "updatedAt"].includes(f.name),
      );
      if (extraFields.length > 0) {
        const insertionPoint = code.indexOf("}", code.indexOf("export interface Media {"));
        const fieldsCode = extraFields
          .map((f: any) => `  ${f.name}${f.required ? "" : "?"}: ${mapFieldType(f)};`)
          .join("\n");
        code = code.slice(0, insertionPoint) + fieldsCode + "\n" + code.slice(insertionPoint);
      }
      continue;
    }

    code += `export interface ${interfaceName} {\n`;
    code += `  id: string;\n`;
    for (const field of col.fields) {
      if (field.name === "createdAt" || field.name === "updatedAt" || field.name === "id") continue;
      code += `  ${field.name}${field.required ? "" : "?"}: ${mapFieldType(field)};\n`;
    }
    code += `  createdAt: string;\n`;
    code += `  updatedAt: string;\n`;
    code += `}\n\n`;
  }

  for (const glb of schema.globals) {
    if (!glb || !glb.slug) continue;
    const interfaceName = `${toPascalCase(glb.slug)}Global`;
    code += `export interface ${interfaceName} {\n`;
    for (const field of glb.fields) {
      code += `  ${field.name}${field.required ? "" : "?"}: ${mapFieldType(field)};\n`;
    }
    code += `}\n\n`;
  }

  code += `export interface DyrectedSchema {\n`;
  code += `  collections: {\n`;
  for (const col of schema.collections) {
    code += `    ${col.slug}: ${toPascalCase(col.slug)};\n`;
  }
  code += `  };\n`;
  code += `  globals: {\n`;
  for (const glb of schema.globals) {
    code += `    ${glb.slug}: ${toPascalCase(glb.slug)}Global;\n`;
  }
  code += `  };\n`;
  code += `}\n`;

  return code;
}

function mapFieldType(field: any): string {
  switch (field.type) {
    case "text":
    case "textarea":
    case "richText":
    case "date":
    case "email":
    case "url":
      return "string";
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "select":
      return field.options
        ? field.options.map((o: any) => `'${typeof o === "string" ? o : o.value}'`).join(" | ")
        : "string";
    case "relationship": {
      const relationTo = field.relationTo || field.collection;
      return relationTo === "media" ? "Media | string" : `${toPascalCase(relationTo)} | string`;
    }
    case "array":
      if (field.fields) {
        return `Array<{\n${field.fields.map((f: any) => `      ${f.name}${f.required ? "" : "?"}: ${mapFieldType(f)};`).join("\n")}\n    }>`;
      }
      return "any[]";
    case "blocks":
      if (field.blocks) {
        return `Array<${field.blocks.map((b: any) => `{\n      blockType: '${b.slug}';\n${b.fields.map((f: any) => `      ${f.name}${f.required ? "" : "?"}: ${mapFieldType(f)};`).join("\n")}\n    }`).join(" | ")}>`;
      }
      return "any[]";
    case "object":
      if (field.fields) {
        return `{\n${field.fields.map((f: any) => `    ${f.name}${f.required ? "" : "?"}: ${mapFieldType(f)};`).join("\n")}\n  }`;
      }
      return "any";
    default:
      return "any";
  }
}

function toPascalCase(str: string) {
  if (!str) return "Unknown";
  return str.replace(/(^\w|-\w)/g, (m) => m.replace(/-/, "").toUpperCase());
}

// ─── sync:schema ─────────────────────────────────────────────────────────────

program
  .command("sync:schema")
  .description("Sync your local Dyrected schema with the Cloud dashboard")
  .option("-k, --api-key <key>", "Your Dyrected API Key")
  .option("-s, --site-id <id>", "Your Dyrected Site ID")
  .option("-u, --url <url>", "Cloud API URL", "https://prodeegi-vault.onrender.com")
  .option("-c, --config <path>", "Path to your dyrected.config.ts", "./dyrected.config.ts")
  .option("--skip-on-error", "Do not exit with error if sync fails (useful for local builds)")
  .action(async (options) => {
    try {
      const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
      const siteId = options.siteId || process.env.DYRECTED_SITE_ID;
      const apiUrl = options.url || process.env.DYRECTED_URL || "https://prodeegi-vault.onrender.com";
      const configPath = path.resolve(process.cwd(), options.config);

      const jiti = createJiti(configPath);

      if (!apiKey || !siteId) {
        console.warn(
          chalk.yellow(
            "\n⚠  Skipping schema sync: API Key or Site ID missing. (Required for Cloud sync, but optional for self-hosted builds)\n",
          ),
        );
        return;
      }

      if (!(await fs.pathExists(configPath))) {
        throw new Error(`Config file not found at ${configPath}`);
      }

      console.log(chalk.blue(`Loading config from ${configPath}...`));
      const configModule = (await jiti.import(configPath)) as any;
      const config = configModule.default || configModule;

      if (!config.collections) {
        throw new Error("Invalid config: No collections found.");
      }

      console.log(chalk.blue(`Syncing schema to ${apiUrl}...`));

      const response = await fetch(`${apiUrl}/cloud/workspaces/sites/${siteId}/schema/sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          collections: config.collections,
          globals: config.globals || [],
          admin: config.admin || {},
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Sync failed: ${error.message || response.statusText}`);
      }

      console.log(chalk.green(`\nSuccess! Schema synced successfully for site ${siteId}`));
    } catch (error: any) {
      if (options.skipOnError) {
        console.warn(chalk.yellow(`\n⚠  Sync failed, but skipping error as requested: ${error.message}`));
        return;
      }
      console.error(chalk.red(`\nError: ${error.message}`));
      process.exit(1);
    }
  });

program.parse();
