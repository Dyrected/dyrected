import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const docsRoot = path.join(root, "apps/docs/content/docs");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "apps/docs/coverage-manifest.json"), "utf8")).coverage;
const workflowSource = fs.readFileSync(path.join(root, "packages/core/src/workflows.ts"), "utf8");
const sdkSource = fs.readFileSync(path.join(root, "packages/sdk/src/index.ts"), "utf8");
const routerSource = fs.readFileSync(path.join(root, "packages/core/src/router.ts"), "utf8");
const mdxFiles = [];

function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith(".mdx")) mdxFiles.push(target);
  }
}
walk(docsRoot);
const corpus = mdxFiles.map((file) => fs.readFileSync(file, "utf8")).join("\n");
const failures = [];
const exportedFunctions = [...workflowSource.matchAll(/^export async function (\w+)|^export function (\w+)/gm)]
  .map((match) => match[1] ?? match[2]);

for (const name of exportedFunctions) {
  if (![...manifest.workflows, ...manifest.lifecycleEvents].includes(name)) {
    failures.push(`Exported workflow function missing from coverage manifest: ${name}`);
  }
}
for (const [category, items] of Object.entries(manifest)) {
  for (const item of items) {
    if (!corpus.includes(item)) failures.push(`${category} contract is not documented: ${item}`);
  }
}
for (const method of manifest.sdkMethods) {
  if (!sdkSource.includes(`${method}:`) && !sdkSource.includes(`async ${method}(`)) {
    failures.push(`SDK manifest entry does not exist in source: ${method}`);
  }
}
if (!routerSource.includes("/:id/transitions/:transition")) failures.push("Transition route is missing from router source");
if (!routerSource.includes("/:id/workflow-history")) failures.push("Workflow history route is missing from router source");

for (const file of mdxFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/\]\((\/docs\/[^)]+)\)/g)) {
    const raw = match[1];
    const [pathname] = raw.split("#");
    const relative = decodeURIComponent(pathname.replace(/^\/docs\/?/, ""));
    const page = relative || "getting-started/introduction";
    const candidates = [path.join(docsRoot, `${page}.mdx`), path.join(docsRoot, page, "index.mdx")];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(`Broken internal docs link in ${path.relative(root, file)}: ${raw}`);
    }
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Documentation contract verified across ${mdxFiles.length} pages.`);
