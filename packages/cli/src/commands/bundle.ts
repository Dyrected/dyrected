import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { buildBundle } from "../utils/bundle/build-bundle.js";
import { hasBlockingFindings } from "../utils/bundle/compat-check.js";
import { resolveAppSrcDir } from "../utils/detect.js";
import { loadCommandEnv } from "../utils/env.js";

function resolveConfigPath(cwd: string, srcDir: string): string {
  const inSrc = path.join(srcDir, "dyrected.config.ts");
  if (fs.existsSync(path.join(cwd, inSrc))) return inSrc;
  return "./dyrected.config.ts";
}

export function registerBundle(program: Command) {
  program
    .command("bundle")
    .description("Build the deployable bundle for your config and check it runs in Dyrected Cloud")
    .option("-c, --config <path>", "Path to your dyrected.config.ts")
    .option("-o, --out <dir>", "Directory to write the versioned bundle into", ".dyrected/bundles")
    .option("--check", "Only run the Cloud compatibility check; write nothing")
    .option("--env-path <path>", "Path to an env file to load before inspecting")
    .addHelpText(
      "after",
      `
The bundle is a folder named after a content hash, containing:
  schema.json     your config with every function replaced by a reference
  server.js       one self-contained module exporting those functions (+ server.js.map)
  manifest.json   the version, the function ids and the compatibility report

Examples:
  # Build a bundle
  $ npx dyrected bundle

  # Just check that your config is Cloud-compatible (good for CI)
  $ npx dyrected bundle --check
`,
    )
    .action(async (options) => {
      const cwd = process.cwd();
      await loadCommandEnv({ cwd, envPath: options.envPath });

      const configRelative = options.config || resolveConfigPath(cwd, resolveAppSrcDir(cwd));
      const configPath = path.resolve(cwd, configRelative);
      if (!fs.existsSync(configPath)) {
        console.error(chalk.red(`✖ Could not find a config at "${configRelative}". Pass one with --config.`));
        process.exit(1);
      }

      let result;
      try {
        result = await buildBundle({
          configPath,
          outDir: path.resolve(cwd, options.out),
          checkOnly: Boolean(options.check),
        });
      } catch (error: any) {
        console.error(chalk.red(`✖ ${error.message}`));
        process.exit(1);
      }

      const { manifest, directory } = result;
      const findings = manifest.compatibility.findings;

      for (const finding of findings) {
        const mark = finding.severity === "error" ? chalk.red("✖") : chalk.yellow("⚠");
        console.log(`${mark} [${finding.code}] ${finding.message}${finding.file ? chalk.gray(`  (${finding.file})`) : ""}`);
        console.log(chalk.gray(`   → ${finding.suggestion}`));
      }

      if (hasBlockingFindings(findings)) {
        console.error(chalk.red(`\n✖ ${findings.filter((f) => f.severity === "error").length} problem(s) would stop this config running in Cloud.`));
        process.exit(1);
      }

      console.log(chalk.green(`\n✓ ${manifest.functions.length} function(s) compatible with Dyrected Cloud.`));
      if (directory) {
        console.log(`  Bundle ${chalk.bold(manifest.version)} written to ${path.relative(cwd, directory)}`);
      }
    });
}
