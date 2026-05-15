import chalk from "chalk";
import fs from "fs-extra";
import path from "path";

export async function writeNextFiles(cwd: string, adminPath: string) {
  const hasSrc = await fs.pathExists(path.join(cwd, "src"));
  const appDir = hasSrc ? path.join(cwd, "src/app") : path.join(cwd, "app");
  const pagesDir = hasSrc ? path.join(cwd, "src/pages") : path.join(cwd, "pages");
  const hasAppRouter = await fs.pathExists(appDir);
  const hasPagesRouter = await fs.pathExists(pagesDir);

  if (hasPagesRouter && !hasAppRouter) {
    const rel = hasSrc ? "src/pages" : "pages";
    const apiRoutePath = path.join(pagesDir, "api/dyrected/[...route].ts");
    if (!(await fs.pathExists(apiRoutePath))) {
      await fs.outputFile(apiRoutePath, `export { default } from '@dyrected/next'\n`);
      console.log(chalk.green(`✔  ${rel}/api/dyrected/[...route].ts written`));
    }
    const adminPagePath = path.join(pagesDir, `${adminPath}.tsx`);
    if (!(await fs.pathExists(adminPagePath))) {
      await fs.outputFile(
        adminPagePath,
        `import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin apiPath="/api/dyrected" />
}
`,
      );
      console.log(chalk.green(`✔  ${rel}/${adminPath}.tsx written`));
    }
  } else {
    const rel = hasSrc ? "src/app" : "app";
    const apiRoutePath = path.join(appDir, "dyrected/[...route]/route.ts");
    if (!(await fs.pathExists(apiRoutePath))) {
      await fs.outputFile(apiRoutePath, `export { GET, POST, PUT, PATCH, DELETE } from '@dyrected/next'\n`);
      console.log(chalk.green(`✔  ${rel}/dyrected/[...route]/route.ts written`));
    }
    const adminPagePath = path.join(appDir, `${adminPath}/page.tsx`);
    if (!(await fs.pathExists(adminPagePath))) {
      await fs.outputFile(
        adminPagePath,
        `import { DyrectedAdmin } from '@dyrected/next/admin'

export default function AdminPage() {
  return <DyrectedAdmin apiPath="/dyrected" />
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
    const apiPath = hasPagesRouter && !hasAppRouter ? "/api/dyrected" : "/dyrected";
    await fs.outputFile(
      instrumentationPath,
      `export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const base = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\\/$/, '')
    console.log(\`\\n  ➜  Dyrected admin:  \${base}/${adminPath}\`)
    console.log(\`  ➜  Dyrected API:    \${base}${apiPath}\\n\`)
  }
}
`,
    );
    const relInstrumentation = hasSrc ? "src/instrumentation.ts" : "instrumentation.ts";
    console.log(chalk.green(`✔  ${relInstrumentation} written`));
  }
}

export async function writeNuxtFiles(cwd: string, adminPath: string) {
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

  await patchNuxtConfig(cwd, adminPath);
}

export async function patchNuxtConfig(cwd: string, adminPath?: string) {
  const tsConfig = path.join(cwd, "nuxt.config.ts");
  const jsConfig = path.join(cwd, "nuxt.config.js");
  const configPath = (await fs.pathExists(tsConfig)) ? tsConfig : (await fs.pathExists(jsConfig)) ? jsConfig : null;

  if (!configPath) {
    console.log(chalk.yellow("\n⚠  No nuxt.config.ts found. Add the module manually:"));
    console.log(chalk.dim(`  modules: [['@dyrected/nuxt', { adminPath: '${adminPath || "cms"}' }]]`));
    return;
  }

  let content = await fs.readFile(configPath, "utf-8");

  if (content.includes("@dyrected/nuxt")) {
    console.log(chalk.dim("ℹ  @dyrected/nuxt already in nuxt.config"));
    return;
  }

  const moduleEntry = adminPath
    ? `['@dyrected/nuxt', { adminPath: '${adminPath}' }]`
    : `'@dyrected/nuxt'`;

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
