import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { createJiti } from "jiti";
import { runGenerateTypes } from "../utils/type-generator.js";

export function registerSyncSchema(program: Command) {
  program
    .command("sync:schema")
    .description("Sync your local Dyrected schema with the Cloud dashboard")
    .option("-k, --api-key <key>", "Your Dyrected API Key")
    .option("-s, --site-id <id>", "Your Dyrected Site ID")
    .option("-u, --url <url>", "Cloud API URL", "https://prodeegi-vault.onrender.com")
    .option("-c, --config <path>", "Path to your dyrected.config.ts", "./dyrected.config.ts")
    .option("--skip-on-error", "Do not exit with error if sync fails (useful for CI builds)")
    .option("--skip-types", "Skip automatic type generation after a successful sync")
    .addHelpText(
      "after",
      `
Examples:
  # Sync using env vars (DYRECTED_API_KEY, DYRECTED_SITE_ID)
  $ npx @dyrected/cli sync:schema

  # Sync with explicit credentials
  $ npx @dyrected/cli sync:schema --api-key <key> --site-id <id>

  # Sync in CI without failing the build on error
  $ npx @dyrected/cli sync:schema --skip-on-error

  # Sync without regenerating types
  $ npx @dyrected/cli sync:schema --skip-types
`,
    )
    .action(async (options) => {
      try {
        const apiKey = options.apiKey || process.env.DYRECTED_API_KEY;
        const siteId = options.siteId || process.env.DYRECTED_SITE_ID;
        const apiUrl = options.url || process.env.DYRECTED_URL || "https://prodeegi-vault.onrender.com";
        const configPath = path.resolve(process.cwd(), options.config);

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
        const jiti = createJiti(configPath);
        const configModule = (await jiti.import(configPath)) as any;
        const config = configModule.default || configModule;

        if (!config.collections) throw new Error("Invalid config: No collections found.");

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

        console.log(chalk.green(`✔  Schema synced successfully for site ${siteId}`));

        if (!options.skipTypes) {
          console.log(chalk.blue("\nGenerating types from synced schema..."));
          await runGenerateTypes({ config: options.config, output: "./dyrected-types.ts" });
        }
      } catch (error: any) {
        if (options.skipOnError) {
          console.warn(chalk.yellow(`\n⚠  Sync failed, but skipping error as requested: ${error.message}`));
          return;
        }
        console.error(chalk.red(`\nError: ${error.message}`));
        process.exit(1);
      }
    });
}
