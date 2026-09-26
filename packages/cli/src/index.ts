#!/usr/bin/env node
import { Command } from "commander";
import { registerInit } from "./commands/init.js";
import { registerGenerateTypes } from "./commands/generate-types.js";
import { registerGenerateAiRules } from "./commands/generate-ai-rules.js";
import { registerSyncSchema } from "./commands/sync-schema.js";
import { registerUpgrade } from "./commands/upgrade.js";
import { registerNav } from "./commands/nav.js";
import { registerDoctor } from "./commands/doctor.js";

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
  upgrade           Upgrade Dyrected packages in the current package or the whole workspace
  generate:types    Generate TypeScript interfaces from your schema
  generate:ai-rules Generate canonical instructions for AI coding tools
  sync:schema       Push your local schema to Dyrected Cloud
  nav pull          Pull UI navigation preferences into dyrected.config.ts
  nav push          Push code navigation to remote/server preferences
  doctor            Check health and diagnostics of your Dyrected configuration

Run \`npx dyrected <command> --help\` for detailed usage and examples.
`,
  );

registerInit(program);
registerUpgrade(program);
registerGenerateTypes(program);
registerGenerateAiRules(program);
registerSyncSchema(program);
registerNav(program);
registerDoctor(program);

program.parse();
