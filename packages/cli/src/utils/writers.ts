import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import type { BackendMode } from "./config-templates.js";

export async function writeReactFiles(cwd: string, adminPath: string) {
  const hasSrc = await fs.pathExists(path.join(cwd, "src"));
  const base = hasSrc ? "src" : ".";
  const rel = hasSrc ? `src/${adminPath}` : adminPath;

  const adminPagePath = path.join(cwd, base, `${adminPath}.tsx`);
  if (!(await fs.pathExists(adminPagePath))) {
    await fs.outputFile(
      adminPagePath,
      `import { DyrectedAdmin } from '@dyrected/admin'

export default function AdminPage() {
  return (
    <DyrectedAdmin
      apiPath={import.meta.env.VITE_DYRECTED_URL}
      apiKey={import.meta.env.VITE_DYRECTED_API_KEY}
    />
  )
}
`,
    );
    console.log(chalk.green(`✔  ${rel}.tsx written`));
  }

  console.log(chalk.yellow(`\n  Add a route for /${adminPath} pointing to AdminPage in your router config.\n`));
}

export async function writeVueFiles(cwd: string, adminPath: string) {
  const hasSrc = await fs.pathExists(path.join(cwd, "src"));
  const viewsDir = hasSrc ? path.join(cwd, "src/views") : path.join(cwd, "views");
  const rel = hasSrc ? `src/views/AdminView.vue` : `views/AdminView.vue`;

  const adminPagePath = path.join(viewsDir, "AdminView.vue");
  if (!(await fs.pathExists(adminPagePath))) {
    await fs.outputFile(
      adminPagePath,
      `<template>
  <DyrectedAdmin
    :config="{
      baseUrl: dyrectedUrl,
      apiKey: dyrectedApiKey,
      siteId: dyrectedSiteId,
    }"
    basename="/${adminPath}"
  />
</template>

<script setup lang="ts">
import { DyrectedAdmin } from '@dyrected/vue'

const dyrectedUrl = import.meta.env.VITE_DYRECTED_URL
const dyrectedApiKey = import.meta.env.VITE_DYRECTED_API_KEY
const dyrectedSiteId = import.meta.env.VITE_DYRECTED_SITE_ID
</script>
`,
    );
    console.log(chalk.green(`✔  ${rel} written`));
  }

  console.log(chalk.yellow(`\n  Add a route for /${adminPath} pointing to AdminView in your router config.\n`));
}

export async function writeNextFiles(cwd: string, adminPath: string, backend: BackendMode) {
  const hasSrc = await fs.pathExists(path.join(cwd, "src"));
  const appDir = hasSrc ? path.join(cwd, "src/app") : path.join(cwd, "app");
  const pagesDir = hasSrc ? path.join(cwd, "src/pages") : path.join(cwd, "pages");
  const hasAppRouter = await fs.pathExists(appDir);
  const hasPagesRouter = await fs.pathExists(pagesDir);

  if (hasPagesRouter && !hasAppRouter) {
    throw new Error(
      "@dyrected/next requires the Next.js App Router. Add an app/ directory before running init.",
    );
  } else {
    const rel = hasSrc ? "src/app" : "app";
    if (backend === "self-hosted") {
      const apiRoutePath = path.join(appDir, "dyrected/[...route]/route.ts");
      if (!(await fs.pathExists(apiRoutePath))) {
        const configImport = hasSrc
          ? "../../../../dyrected.config"
          : "../../../dyrected.config";
        await fs.outputFile(
          apiRoutePath,
          `import { dyrectedNextHandler } from '@dyrected/next'
import config from '${configImport}'

export const { GET, POST, PUT, PATCH, DELETE, OPTIONS } = dyrectedNextHandler(config)
`,
        );
        console.log(chalk.green(`✔  ${rel}/dyrected/[...route]/route.ts written`));
      }
    }
    const adminPagePath = path.join(appDir, `${adminPath}/page.tsx`);
    if (!(await fs.pathExists(adminPagePath))) {
      await fs.outputFile(
        adminPagePath,
        `import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin />
}
`,
      );
      console.log(chalk.green(`✔  ${rel}/${adminPath}/page.tsx written`));
    }
  }

  // instrumentation.ts — logs Dyrected URLs to the console on server start
  const instrumentationDir = hasSrc ? path.join(cwd, "src") : cwd;
  const instrumentationPath = path.join(instrumentationDir, "instrumentation.ts");
  if (!(await fs.pathExists(instrumentationPath))) {
    const apiLogLine =
      backend === "cloud"
        ? "    const api = process.env.NEXT_PUBLIC_DYRECTED_URL || process.env.DYRECTED_URL || 'https://cloud.dyrected.com'\n    console.log(`  ➜  Dyrected API:    ${api}`)"
        : "    console.log(`  ➜  Dyrected API:    ${base}/dyrected`)";
    await fs.outputFile(
      instrumentationPath,
      `export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\\/$/, '')
    console.log(\`\\n  ➜  Dyrected admin:  \${base}/${adminPath}\`)
${apiLogLine}
    console.log('')
  }
}
`,
    );
    const relInstrumentation = hasSrc ? "src/instrumentation.ts" : "instrumentation.ts";
    console.log(chalk.green(`✔  ${relInstrumentation} written`));
  }
}

export async function writeNuxtFiles(cwd: string, adminPath: string, backend: BackendMode) {
  const hasAppDir = await fs.pathExists(path.join(cwd, "app"));
  const pagesBase = hasAppDir ? "app/pages" : "pages";

  const adminPagePath = path.join(cwd, pagesBase, adminPath, "index.vue");
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
    console.log(chalk.green(`✔  ${pagesBase}/${adminPath}/index.vue written`));
  }

  await patchNuxtConfig(cwd, adminPath, backend);
}

export async function patchNuxtConfig(cwd: string, adminPath?: string, backend: BackendMode = "self-hosted") {
  const tsConfig = path.join(cwd, "nuxt.config.ts");
  const jsConfig = path.join(cwd, "nuxt.config.js");
  const configPath = (await fs.pathExists(tsConfig)) ? tsConfig : (await fs.pathExists(jsConfig)) ? jsConfig : null;

  if (!configPath) {
    console.log(chalk.yellow("\n⚠  No nuxt.config.ts found. Add the module manually:"));
    console.log(chalk.dim(`  modules: [['@dyrected/nuxt', { adminPath: '${adminPath || "admin"}' }]]`));
    return;
  }

  let content = await fs.readFile(configPath, "utf-8");

  if (content.includes("@dyrected/nuxt")) {
    console.log(chalk.dim("ℹ  @dyrected/nuxt already in nuxt.config"));
    return;
  }

  const moduleOptions = [`adminPath: '${adminPath || "admin"}'`];
  if (backend === "cloud") {
    moduleOptions.push(
      "apiBase: process.env.NUXT_PUBLIC_DYRECTED_URL || process.env.DYRECTED_URL || 'https://cloud.dyrected.com'",
    );
  }
  const moduleEntry = `['@dyrected/nuxt', { ${moduleOptions.join(", ")} }]`;

  if (/modules\s*:\s*\[/.test(content)) {
    content = content.replace(/modules\s*:\s*\[/, `modules: [${moduleEntry}, `);
  } else {
    content = content.replace(
      /defineNuxtConfig\s*\(\s*\{/,
      `defineNuxtConfig({\n  modules: [${moduleEntry}],`,
    );
  }

  await fs.writeFile(configPath, content, "utf-8");
  console.log(chalk.green(`✔  @dyrected/nuxt added to ${path.relative(cwd, configPath)}`));
}
