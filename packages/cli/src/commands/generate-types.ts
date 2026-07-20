import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { runGenerateTypes } from "../utils/type-generator.js";
import { resolveAppSrcDir } from "../utils/detect.js";
import { loadCommandEnv } from "../utils/env.js";

/**
 * Resolve where `dyrected.config.ts` lives. Prefer the framework source dir
 * (where new projects scaffold it), then fall back to the project root so
 * existing setups keep working.
 */
function resolveConfigPath(cwd: string, srcDir: string): string {
  const inSrc = path.join(srcDir, "dyrected.config.ts");
  if (fs.existsSync(path.join(cwd, inSrc))) return inSrc;
  return "./dyrected.config.ts";
}

export function registerGenerateTypes(program: Command) {
  program
    .command("generate:types")
    .description("Generate TypeScript interfaces from your Dyrected schema")
    .option(
      "-u, --url <url>",
      "Base URL of your Dyrected API (Cloud or self-hosted)",
    )
    .option(
      "-c, --config <path>",
      "Path to your dyrected.config.ts (defaults to your app source dir, then the project root)",
    )
    .option(
      "--env-path <path>",
      "Path to an env file to load before importing dyrected.config.ts",
    )
    .option(
      "-o, --output <path>",
      "Output file path (defaults to <srcDir>/dyrected-types.ts so your framework's TypeScript program picks up the generated types)",
    )
    .addHelpText(
      "after",
      `
Examples:
  # Generate from local config (writes into your app source dir)
  $ npx dyrected generate:types

  # Generate from a running self-hosted instance
  $ npx dyrected generate:types --url http://localhost:3000

  # Generate after loading a specific env file
  $ npx dyrected generate:types --env-path ./.env.local

  # Custom config and output paths
  $ npx dyrected generate:types --config ./cms/dyrected.config.ts --output ./types/cms.ts
`,
    )
    .action(async (options) => {
      try {
        const cwd = process.cwd();
        await loadCommandEnv({ cwd, envPath: options.envPath });
        const srcDir = resolveAppSrcDir(cwd);
        const config = options.config ?? resolveConfigPath(cwd, srcDir);
        const output = options.output ?? path.join(srcDir, "dyrected-types.ts");
        await runGenerateTypes({
          url: options.url,
          config,
          output,
        });
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });
}
