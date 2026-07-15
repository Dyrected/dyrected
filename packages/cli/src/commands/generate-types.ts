import type { Command } from "commander";
import chalk from "chalk";
import { runGenerateTypes } from "../utils/type-generator.js";

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
      "Path to your dyrected.config.ts (Self-hosted)",
      "./dyrected.config.ts",
    )
    .option("-o, --output <path>", "Output file path", "./dyrected-types.ts")
    .addHelpText(
      "after",
      `
Examples:
  # Generate from local config (default)
  $ npx dyrected generate:types

  # Generate from a running self-hosted instance
  $ npx dyrected generate:types --url http://localhost:3000

  # Custom config and output paths
  $ npx dyrected generate:types --config ./cms/dyrected.config.ts --output ./types/cms.ts
`,
    )
    .action(async (options) => {
      try {
        await runGenerateTypes({
          url: options.url,
          config: options.config,
          output: options.output,
        });
      } catch (error: any) {
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });
}
