import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workspaceCliPath = path.resolve(__dirname, "../../../packages/cli/dist/index.js");
const installedCliPath = path.resolve(__dirname, "../node_modules/dyrected/dist/index.js");

const cliPath = [workspaceCliPath, installedCliPath].find((candidate) => existsSync(candidate));

if (!cliPath) {
  console.error("[dyrected sync] Could not find the Dyrected CLI build.");
  process.exit(1);
}

const result = spawnSync(process.execPath, [cliPath, "sync:schema", ...process.argv.slice(2)], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error);
  process.exit(1);
}

process.exit(result.status ?? 0);
