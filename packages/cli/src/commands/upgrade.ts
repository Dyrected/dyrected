import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { execFileSync } from "child_process";
import { detectPackageManager } from "../utils/detect.js";

type PackageManager = "npm" | "pnpm" | "yarn" | "bun";
type DependencyBucket = "dependencies" | "devDependencies";
type PackageVersionMap = Record<string, string>;

function getDyrectedDeps(pkg: Record<string, any>) {
  const dependencies = Object.keys(pkg.dependencies || {}).filter((dep) => dep.startsWith("@dyrected/") || dep === "dyrected");
  const devDependencies = Object.keys(pkg.devDependencies || {}).filter((dep) => dep.startsWith("@dyrected/") || dep === "dyrected");
  return { dependencies, devDependencies };
}

function getLatestVersion(pkgName: string): string {
  const version = execFileSync("npm", ["view", pkgName, "version"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();

  if (!version) {
    throw new Error(`No published version found for ${pkgName}.`);
  }

  return version;
}

function resolveLatestVersions(packageNames: string[]): PackageVersionMap {
  const versions: PackageVersionMap = {};

  for (const pkgName of packageNames) {
    versions[pkgName] = getLatestVersion(pkgName);
  }

  return versions;
}

function runInstall(
  cwd: string,
  packageManager: PackageManager,
  deps: string[],
  versions: PackageVersionMap,
  bucket: DependencyBucket,
) {
  if (deps.length === 0) return;

  const specs = deps.map((dep) => `${dep}@${versions[dep]}`);
  let command = "";
  let args: string[] = [];

  if (packageManager === "pnpm") {
    args = ["add", "--save-exact", ...specs];
    if (bucket === "devDependencies") args.splice(1, 0, "-D");
    command = `pnpm ${args.join(" ")}`;
    console.log(chalk.blue(`Running: ${command}`));
    execFileSync("pnpm", args, { cwd, stdio: "inherit" });
    return;
  }

  if (packageManager === "yarn") {
    args = ["add", "--exact", ...specs];
    if (bucket === "devDependencies") args.splice(1, 0, "-D");
    command = `yarn ${args.join(" ")}`;
    console.log(chalk.blue(`Running: ${command}`));
    execFileSync("yarn", args, { cwd, stdio: "inherit" });
    return;
  }

  if (packageManager === "bun") {
    args = ["add", "--exact", ...specs];
    if (bucket === "devDependencies") args.splice(1, 0, "-d");
    command = `bun ${args.join(" ")}`;
    console.log(chalk.blue(`Running: ${command}`));
    execFileSync("bun", args, { cwd, stdio: "inherit" });
    return;
  }

  args = ["install", "--save-exact", ...specs];
  if (bucket === "devDependencies") args.splice(1, 0, "--save-dev");
  command = `npm ${args.join(" ")}`;
  console.log(chalk.blue(`Running: ${command}`));
  execFileSync("npm", args, { cwd, stdio: "inherit" });
}

function readInstalledVersion(cwd: string, pkgName: string): string | null {
  const pkgPath = path.join(cwd, "node_modules", ...pkgName.split("/"), "package.json");
  if (!fs.existsSync(pkgPath)) return null;

  try {
    const installed = fs.readJsonSync(pkgPath) as { version?: string };
    return installed.version ?? null;
  } catch {
    return null;
  }
}

async function verifyUpgrade(
  cwd: string,
  pkgPath: string,
  expectedVersions: PackageVersionMap,
  buckets: Record<DependencyBucket, string[]>,
) {
  const pkg = await fs.readJson(pkgPath);
  const problems: string[] = [];

  for (const bucket of ["dependencies", "devDependencies"] as const) {
    for (const dep of buckets[bucket]) {
      const expected = expectedVersions[dep];
      const declared = pkg[bucket]?.[dep];
      const installed = readInstalledVersion(cwd, dep);

      if (declared !== expected) {
        problems.push(`${dep}: package.json has ${declared ?? "missing"}, expected ${expected}`);
      }

      if (installed && installed !== expected) {
        problems.push(`${dep}: node_modules has ${installed}, expected ${expected}`);
      }
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `Upgrade verification failed:\n${problems.map((problem) => `  - ${problem}`).join("\n")}\n` +
        "The app is still not aligned with the requested published versions.",
    );
  }
}

export function registerUpgrade(program: Command) {
  program
    .command("upgrade")
    .description("Upgrade all Dyrected packages to the latest published version")
    .action(async () => {
      const cwd = process.cwd();
      const pkgPath = path.join(cwd, "package.json");

      if (!(await fs.pathExists(pkgPath))) {
        console.error(chalk.red("Error: No package.json found in the current directory."));
        process.exit(1);
      }

      let pkg: any;
      try {
        pkg = await fs.readJson(pkgPath);
      } catch {
        console.error(chalk.red("Error: Failed to read package.json."));
        process.exit(1);
      }

      const buckets = getDyrectedDeps(pkg);
      const dyrectedDeps = [...buckets.dependencies, ...buckets.devDependencies];

      if (dyrectedDeps.length === 0) {
        console.log(chalk.yellow("No Dyrected dependencies found in package.json."));
        return;
      }

      console.log(chalk.blue(`Found Dyrected packages to upgrade: ${dyrectedDeps.join(", ")}`));

      let latestVersions: PackageVersionMap;
      try {
        latestVersions = resolveLatestVersions(dyrectedDeps);
      } catch (error: any) {
        console.error(chalk.red(`\nFailed to resolve latest published Dyrected versions: ${error.message}`));
        process.exit(1);
      }

      console.log(
        chalk.blue(
          `Target versions: ${dyrectedDeps.map((dep) => `${dep}@${latestVersions[dep]}`).join(", ")}`,
        ),
      );

      const packageManager = detectPackageManager(cwd) as PackageManager;

      try {
        runInstall(cwd, packageManager, buckets.dependencies, latestVersions, "dependencies");
        runInstall(cwd, packageManager, buckets.devDependencies, latestVersions, "devDependencies");
        await verifyUpgrade(cwd, pkgPath, latestVersions, buckets);
        console.log(chalk.green("\n✔  All Dyrected packages successfully upgraded to the latest published version!"));
      } catch (error: any) {
        console.error(chalk.red(`\nFailed to upgrade packages: ${error.message}`));
        process.exit(1);
      }
    });
}
