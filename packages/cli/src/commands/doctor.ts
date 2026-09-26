import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { createJiti } from "jiti";
import { resolveAppSrcDir } from "../utils/detect.js";
import { loadCommandEnv } from "../utils/env.js";

function resolveConfigPath(cwd: string, srcDir: string): string {
  const inSrc = path.join(srcDir, "dyrected.config.ts");
  if (fs.existsSync(path.join(cwd, inSrc))) return inSrc;
  return "./dyrected.config.ts";
}

export function registerDoctor(program: Command) {
  program
    .command("doctor")
    .description("Check health and diagnostics of your Dyrected configuration and environment")
    .option(
      "-c, --config <path>",
      "Path to your dyrected.config.ts",
    )
    .option(
      "--env-path <path>",
      "Path to an env file to load before inspecting",
    )
    .option(
      "--ci",
      "Exit with a non-zero code if any warnings or errors are found",
    )
    .addHelpText(
      "after",
      `
Examples:
  # Run health and configuration checks
  $ npx dyrected doctor

  # Run in CI mode (fails on warnings/errors)
  $ npx dyrected doctor --ci

  # Check with a specific env file
  $ npx dyrected doctor --env-path .env.production
`,
    )
    .action(async (options) => {
      const cwd = process.cwd();
      await loadCommandEnv({ cwd, envPath: options.envPath });

      console.log(chalk.bold("\n🩺 Dyrected Doctor Diagnostics\n"));

      let hasWarnings = false;
      let hasErrors = false;

      const srcDir = resolveAppSrcDir(cwd);
      const configRelative = options.config || resolveConfigPath(cwd, srcDir);
      const configPath = path.resolve(cwd, configRelative);

      if (!fs.existsSync(configPath)) {
        console.log(chalk.red(`✖ [config] Could not find configuration file at "${configRelative}".`));
        hasErrors = true;
        if (options.ci) process.exit(1);
        return;
      }

      console.log(chalk.green(`✓ [config] Found config at ${configRelative}`));

      let config: any = null;
      try {
        const jiti = createJiti(configPath);
        const mod = (await jiti.import(configPath)) as any;
        config = mod.default || mod;
      } catch (err: any) {
        console.log(chalk.red(`✖ [config] Failed to load configuration: ${err.message}`));
        hasErrors = true;
        if (options.ci) process.exit(1);
        return;
      }

      // Check 1: Trash & Retention
      const trashConfig = config.trash;
      const isTrashEnabled = trashConfig?.enabled !== false;
      if (isTrashEnabled) {
        const retentionDays = trashConfig?.retentionDays !== undefined ? trashConfig.retentionDays : 30;
        const purgeCron = trashConfig?.purge?.cron ?? "0 3 * * *";

        if (retentionDays === null) {
          console.log(chalk.blue(`ℹ [trash] Trash is enabled with indefinite retention (items will not be auto-purged).`));
        } else {
          console.log(chalk.green(`✓ [trash] Trash & retention active (${retentionDays} days default retention, purge cron: "${purgeCron}").`));

          // Check if DB is available to inspect purge task execution
          if (config.db) {
            try {
              const lockRecord = await config.db.findOne({
                collection: "__task_locks",
                id: "dyrected:trash-purge",
              });

              if (lockRecord && lockRecord.lastFinishedAt) {
                const lastFinished = new Date(lockRecord.lastFinishedAt).getTime();
                const now = Date.now();
                // If more than 48 hours have passed without a run, warn
                if (now - lastFinished > 48 * 60 * 60 * 1000) {
                  console.log(
                    chalk.yellow(
                      `⚠️  [trash] 'dyrected:trash-purge' task has not run in over 48 hours (last finished: ${new Date(lastFinished).toLocaleString()}).\n` +
                      `   → Verify that your cron runner (e.g. createTaskRunner(config).runDue()) is active.`
                    )
                  );
                  hasWarnings = true;
                } else {
                  console.log(chalk.green(`✓ [trash] Purge runner is active (last completed: ${new Date(lastFinished).toLocaleString()}).`));
                }
              } else {
                console.log(
                  chalk.yellow(
                    `⚠️  [trash] No recorded runs found for 'dyrected:trash-purge' in __task_locks.\n` +
                    `   → If this is a new setup, run the task runner or invoke createTaskRunner(config).runDue() periodically.`
                  )
                );
                hasWarnings = true;
              }
            } catch {
              // Non-blocking if table not yet created
            }
          }
        }
      } else {
        console.log(chalk.blue(`ℹ [trash] Trash is disabled. Deletions are permanent immediately.`));
      }

      // Check 2: Auth Secret
      const jwtSecret = process.env.DYRECTED_JWT_SECRET;
      if (!jwtSecret || jwtSecret === "dyrected-default-secret-change-me" || jwtSecret.length < 16) {
        console.log(
          chalk.yellow(
            `⚠️  [auth] DYRECTED_JWT_SECRET is unset or using a default short value.\n` +
            `   → Set a strong, random 32+ character string in your environment variables for production security.`
          )
        );
        hasWarnings = true;
      } else {
        console.log(chalk.green(`✓ [auth] DYRECTED_JWT_SECRET configured securely.`));
      }

      // Check 3: Upload collections & Storage
      const collections = config.collections || [];
      const hasUploadCollections = collections.some((c: any) => c.upload === true);
      if (hasUploadCollections && !config.storage) {
        console.log(
          chalk.yellow(
            `⚠️  [storage] Collections with upload: true are configured, but no storage adapter (e.g. S3, Cloudinary) was found in config.storage.\n` +
            `   → In-memory/local storage will be used, which is ephemeral on serverless environments.`
          )
        );
        hasWarnings = true;
      } else if (hasUploadCollections) {
        console.log(chalk.green(`✓ [storage] Storage adapter configured for upload-enabled collections.`));
      }

      // Summary
      console.log("");
      if (!hasErrors && !hasWarnings) {
        console.log(chalk.green.bold("✨ All doctor diagnostics passed! System is healthy.\n"));
      } else if (hasErrors) {
        console.log(chalk.red.bold("✖ Diagnostics found errors that require attention.\n"));
        if (options.ci) process.exit(1);
      } else {
        console.log(chalk.yellow.bold("⚠️  Diagnostics found warnings to review.\n"));
        if (options.ci) process.exit(1);
      }
    });
}
