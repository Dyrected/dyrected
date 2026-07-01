import type { Command } from "commander";
import chalk from "chalk";
import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { detectPackageManager } from "../utils/detect.js";

export function registerUpgrade(program: Command) {
  program
    .command("upgrade")
    .description("Upgrade all Dyrected packages to the latest version")
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
      } catch (err) {
        console.error(chalk.red("Error: Failed to read package.json."));
        process.exit(1);
      }

      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const dyrectedDeps = Object.keys(allDeps).filter(
        (dep) => dep.startsWith("@dyrected/") || dep === "dyrected"
      );

      if (dyrectedDeps.length === 0) {
        console.log(chalk.yellow("No Dyrected dependencies found in package.json."));
        return;
      }

      console.log(
        chalk.blue(`Found Dyrected packages to upgrade: ${dyrectedDeps.join(", ")}`)
      );

      const packageManager = detectPackageManager(cwd);
      const installArgs = dyrectedDeps.map((dep) => `${dep}@latest`).join(" ");

      let cmd = "";
      if (packageManager === "yarn") {
        cmd = `yarn add ${installArgs}`;
      } else if (packageManager === "pnpm") {
        cmd = `pnpm add ${installArgs}`;
      } else if (packageManager === "bun") {
        cmd = `bun add ${installArgs}`;
      } else {
        cmd = `npm install ${installArgs}`;
      }

      console.log(chalk.blue(`Running: ${cmd}`));
      try {
        execSync(cmd, { cwd, stdio: "inherit" });
        console.log(chalk.green("\n✔  All Dyrected packages successfully upgraded to the latest version!"));
      } catch (err) {
        console.error(chalk.red(`\nFailed to upgrade packages. Try running manually:\n  ${cmd}`));
        process.exit(1);
      }
    });
}
