#!/usr/bin/env node
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerGenerateTypes } from "./commands/generate-types.js";
import { registerGenerateAiRules } from "./commands/generate-ai-rules.js";
import { registerSyncSchema } from "./commands/sync-schema.js";
import { registerUpgrade } from "./commands/upgrade.js";

const program = new Command();
program
  .name("dyrected")
  .description("Dyrected CMS CLI tool")
  .version("0.0.1")
  .addHelpText(
    "after",
    `
Commands:
  init              Bootstrap Dyrected in your project (interactive)
  upgrade           Upgrade all Dyrected packages to the latest version
  generate:types    Generate TypeScript types from your schema
  generate:ai-rules Generate canonical instructions for AI coding tools
  sync:schema       Push your local schema to Dyrected Cloud

Run \`npx dyrected <command> --help\` for detailed usage and examples.
`,
  );

registerInit(program);
registerUpgrade(program);
registerGenerateTypes(program);
registerGenerateAiRules(program);
registerSyncSchema(program);

program.parse();
