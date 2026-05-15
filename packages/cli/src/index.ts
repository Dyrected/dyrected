#!/usr/bin/env node
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerGenerateTypes } from "./commands/generate-types.js";
import { registerSyncSchema } from "./commands/sync-schema.js";

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
  generate:types    Generate TypeScript types from your schema
  sync:schema       Push your local schema to Dyrected Cloud

Run \`npx @dyrected/cli <command> --help\` for detailed usage and examples.
`,
  );

registerInit(program);
registerGenerateTypes(program);
registerSyncSchema(program);

program.parse();
