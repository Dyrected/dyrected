import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { buildBundle } from "../utils/bundle/build-bundle.js";
import { hasBlockingFindings } from "../utils/bundle/compat-check.js";
import { cloudRequest, CloudRequestError, resolveCloudTarget, type CloudTarget } from "../utils/cloud-client.js";
import { resolveAppSrcDir } from "../utils/detect.js";

function resolveConfigPath(cwd: string, srcDir: string): string {
  const inSrc = path.join(srcDir, "dyrected.config.ts");
  return fs.existsSync(path.join(cwd, inSrc)) ? inSrc : "./dyrected.config.ts";
}

/** Uploads a built bundle directory (see `dyrected bundle`) to a project. */
export async function uploadBundle(target: CloudTarget, directory: string, fetchImpl: typeof fetch = fetch) {
  const [manifest, schema, serverJs, sourceMap] = await Promise.all([
    fs.readJson(path.join(directory, "manifest.json")),
    fs.readJson(path.join(directory, "schema.json")),
    fs.readFile(path.join(directory, "server.js"), "utf8"),
    fs.readFile(path.join(directory, "server.js.map"), "utf8").catch(() => undefined),
  ]);
  return cloudRequest<{ deployment: { id: string; version: string; functionCount: number } }>(
    target,
    "/deployments",
    { method: "POST", body: { manifest, schema, serverJs, sourceMap } },
    fetchImpl,
  );
}

export function registerDeploy(program: Command) {
  program
    .command("deploy")
    .description("Bundle your config and deploy it to your Dyrected Cloud project")
    .option("-k, --api-key <key>", "Your Dyrected API Key")
    .option("-s, --site-id <id>", "Your Dyrected Project ID")
    .option("-u, --url <url>", "Cloud API URL (defaults to $DYRECTED_URL, then Dyrected Cloud)")
    .option("-c, --config <path>", "Path to your dyrected.config.ts")
    .option("-o, --out <dir>", "Directory to build the bundle into", ".dyrected/bundles")
    .option("--env-path <path>", "Path to an env file to load before deploying")
    .addHelpText(
      "after",
      `
Builds a bundle, checks it will run in Cloud, uploads it, and makes it live. Cloud loads it in the sandbox
before activating, so a bundle that cannot start is rejected and your current code keeps running.
Uploading identical code again just makes it live again, which is how you roll back (or use the dashboard).

Examples:
  # Deploy using DYRECTED_API_KEY and DYRECTED_SITE_ID
  $ npx dyrected deploy

  # Deploy from CI
  $ DYRECTED_API_KEY=... DYRECTED_SITE_ID=... npx dyrected deploy
`,
    )
    .action(async (options) => {
      const cwd = process.cwd();
      try {
        const target = await resolveCloudTarget(options, cwd);
        const configRelative = options.config || resolveConfigPath(cwd, resolveAppSrcDir(cwd));
        const configPath = path.resolve(cwd, configRelative);
        if (!fs.existsSync(configPath)) throw new Error(`Could not find a config at "${configRelative}". Pass one with --config.`);

        console.log(chalk.blue(`Building ${configRelative}...`));
        const { manifest, directory } = await buildBundle({ configPath, outDir: path.resolve(cwd, options.out) });

        for (const finding of manifest.compatibility.findings) {
          const mark = finding.severity === "error" ? chalk.red("✖") : chalk.yellow("⚠");
          console.log(`${mark} [${finding.code}] ${finding.message}${finding.file ? chalk.gray(`  (${finding.file})`) : ""}`);
          console.log(chalk.gray(`   → ${finding.suggestion}`));
        }
        if (hasBlockingFindings(manifest.compatibility.findings)) {
          throw new Error("Fix the problems above before deploying. Nothing was uploaded.");
        }

        console.log(chalk.blue(`Deploying ${manifest.version} to ${target.apiUrl}...`));
        const { deployment } = await uploadBundle(target, directory!);
        console.log(chalk.green(`✔  Deployed ${deployment.version} (${deployment.functionCount} function(s)) to project ${target.siteId}`));
      } catch (error: any) {
        if (error instanceof CloudRequestError && error.body?.missing) {
          console.error(chalk.red(`\nCloud rejected the bundle: ${error.message}`));
          for (const id of error.body.missing) console.error(chalk.red(`   - missing ${id}`));
        } else {
          console.error(chalk.red(`\nError: ${error.message}`));
        }
        process.exit(1);
      }
    });
}
