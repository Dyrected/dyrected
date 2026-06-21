import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { buildAiRules } from "@dyrected/knowledge";

export function registerGenerateAiRules(program: Command) {
  program
    .command("generate:ai-rules")
    .description(
      "Generate the canonical Dyrected instructions for AI coding tools",
    )
    .option("-o, --output <path>", "Output file path", ".dyrected/ai-rules.md")
    .action(async ({ output }: { output: string }) => {
      const target = path.resolve(process.cwd(), output);
      await fs.outputFile(target, buildAiRules());
      console.log(
        chalk.green(
          `✔  Dyrected AI rules written to ${path.relative(process.cwd(), target)}`,
        ),
      );
    });
}
