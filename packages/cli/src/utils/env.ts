import fs from "fs-extra";
import path from "path";

type LoadEnvOptions = {
  cwd: string;
  envPath?: string;
};

type LoadEnvResult = {
  loadedFiles: string[];
};

function parseEnvLine(line: string): [string, string] | null {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) return null;

  const normalized = trimmed.startsWith("export ") ? trimmed.slice("export ".length).trim() : trimmed;
  const equalsIndex = normalized.indexOf("=");

  if (equalsIndex <= 0) return null;

  const key = normalized.slice(0, equalsIndex).trim();
  let value = normalized.slice(equalsIndex + 1).trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) return null;

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  } else {
    const commentIndex = value.indexOf(" #");
    if (commentIndex >= 0) value = value.slice(0, commentIndex).trim();
  }

  return [key, value];
}

async function loadEnvFile(filePath: string, originalKeys: Set<string>) {
  const contents = await fs.readFile(filePath, "utf8");

  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed) continue;

    const [key, value] = parsed;
    if (originalKeys.has(key)) continue;

    process.env[key] = value;
  }
}

export async function loadCommandEnv(options: LoadEnvOptions): Promise<LoadEnvResult> {
  const originalKeys = new Set(Object.keys(process.env));
  const loadedFiles: string[] = [];
  const candidates = options.envPath
    ? [path.resolve(options.cwd, options.envPath)]
    : [path.resolve(options.cwd, ".env"), path.resolve(options.cwd, ".env.local")];

  for (const candidate of candidates) {
    if (!(await fs.pathExists(candidate))) continue;
    await loadEnvFile(candidate, originalKeys);
    loadedFiles.push(candidate);
  }

  return { loadedFiles };
}
