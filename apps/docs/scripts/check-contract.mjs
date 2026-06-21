import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const docsRoot = path.join(root, "apps/docs/content/docs");
const manifest = JSON.parse(
  fs.readFileSync(path.join(root, "apps/docs/coverage-manifest.json"), "utf8"),
).coverage;
const generatedEndpoints = JSON.parse(
  fs.readFileSync(
    path.join(root, "packages/knowledge/generated/endpoints.json"),
    "utf8",
  ),
);
const workflowSource = fs.readFileSync(
  path.join(root, "packages/core/src/workflows.ts"),
  "utf8",
);
const sdkSource = fs.readFileSync(
  path.join(root, "packages/sdk/src/index.ts"),
  "utf8",
);
const routerSource = fs.readFileSync(
  path.join(root, "packages/core/src/router.ts"),
  "utf8",
);
const coreTypesSource = fs.readFileSync(
  path.join(root, "packages/core/src/types/index.ts"),
  "utf8",
);
const aiRulesSource = fs.readFileSync(
  path.join(root, "packages/knowledge/generated/ai-rules.md"),
  "utf8",
);
const skillSource = fs.readFileSync(
  path.join(root, "skills/dyrected/SKILL.md"),
  "utf8",
);
const configTemplateSource = fs.readFileSync(
  path.join(root, "packages/cli/src/utils/config-templates.ts"),
  "utf8",
);
const mdxFiles = [];
const hybridPages = {
  "reference/configuration.mdx": {
    marker: "REFERENCE-CONFIGURATION",
    headings: [
      "Core configuration (`DyrectedConfig`)",
      "Collection configuration (`CollectionConfig`)",
      "Global configuration (`GlobalConfig`)",
      "Content-contract practices",
      "Email configuration",
      "JSON response contract",
    ],
  },
  "reference/fields.mdx": {
    marker: "REFERENCE-FIELDS",
    headings: [
      "Base properties (all fields)",
      "Text fields",
      "Selection fields",
      "Relationship and media fields",
      "Structural fields",
      "Admin field options",
      "Field access",
      "Field hooks",
    ],
  },
  "reference/sdk.mdx": {
    marker: "REFERENCE-SDK",
    headings: [
      "Installation",
      "Creating a client",
      "Collection methods",
      "Authentication",
      "TypeScript schema inference",
      "Error handling",
    ],
  },
  "reference/generated-workflows.mdx": {
    marker: "REFERENCE-GENERATED-WORKFLOWS",
    headings: [
      "States, transitions, and capabilities",
      "Revisions and concurrency",
      "Draft visibility",
      "Transition hooks",
      "Lifecycle events",
    ],
  },
  "reference/rest-api.mdx": {
    marker: "REFERENCE-REST-API",
    headings: [
      "Base URL",
      "Authentication",
      "Listing and filtering",
      "Collections",
      "Uploads and media",
      "Error responses",
    ],
  },
  "reference/openapi.mdx": {
    marker: "REFERENCE-OPENAPI",
    headings: [
      "Accessing the specification",
      "Interactive documentation",
      "Workflows and generated schemas",
      "Why use OpenAPI?",
    ],
  },
  "adapters/databases.mdx": {
    marker: "ADAPTERS-DATABASES",
    headings: [
      "Supported adapters",
      "Schema synchronization",
      "Field renames and promotion",
      "Writing a custom adapter",
    ],
  },
  "adapters/storage.mdx": {
    marker: "ADAPTERS-STORAGE",
    headings: [
      "Local filesystem",
      "S3 and compatible providers",
      "URL resolution",
      "Upload collection configuration",
      "Writing a custom adapter",
    ],
  },
  "recipes/index.mdx": {
    marker: "RECIPE-INDEX",
    headings: ["Recipe index", "Choosing a pattern"],
  },
};

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

for (const [relative, requirements] of Object.entries(hybridPages)) {
  const filename = path.join(docsRoot, relative);
  const source = fs.readFileSync(filename, "utf8");
  const start = `{/* GENERATED:${requirements.marker}:START */}`;
  const end = `{/* GENERATED:${requirements.marker}:END */}`;
  if (source.split(start).length !== 2 || source.split(end).length !== 2) {
    failures.push(`${relative} must contain exactly one ${requirements.marker} marker pair`);
  } else if (source.indexOf(start) > source.indexOf(end)) {
    failures.push(`${relative} has reversed ${requirements.marker} markers`);
  }
  const startEscaped = start.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const endEscaped = end.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const authored = source.replace(
    new RegExp(`${startEscaped}[\\s\\S]*?${endEscaped}`),
    `${start}\n${end}`,
  );
  for (const heading of requirements.headings) {
    if (!authored.includes(`## ${heading}`)) {
      failures.push(`${relative} lost required authored heading: ${heading}`);
    }
  }
  if (authored.replace(/^---[\s\S]*?---/, "").trim().split(/\s+/).length < 80) {
    failures.push(`${relative} has lost substantial authored guidance`);
  }
}

for (const filename of mdxFiles.filter((file) => file.includes(`${path.sep}recipes${path.sep}`) && !file.endsWith(`${path.sep}index.mdx`))) {
  const source = fs.readFileSync(filename, "utf8");
  for (const marker of ["{/* GENERATED:RECIPE:START */}", "{/* GENERATED:RECIPE:END */}"]) {
    if (source.split(marker).length !== 2) {
      failures.push(`${path.relative(root, filename)} must contain exactly one ${marker}`);
    }
  }
  if (
    !source.includes("Decisions and cautions") &&
    !source.includes("Migration sequence")
  ) {
    failures.push(
      `${path.relative(root, filename)} lacks authored decisions, cautions, or migration guidance`,
    );
  }
}
const exportedFunctions = [
  ...workflowSource.matchAll(
    /^export async function (\w+)|^export function (\w+)/gm,
  ),
].map((match) => match[1] ?? match[2]);

for (const name of exportedFunctions) {
  if (![...manifest.workflows, ...manifest.lifecycleEvents].includes(name)) {
    failures.push(
      `Exported workflow function missing from coverage manifest: ${name}`,
    );
  }
}
for (const [category, items] of Object.entries(manifest)) {
  for (const item of items) {
    if (category === "restApiEndpoints") {
      const [method, rawPath] = item.split(" ");
      const representativePath = rawPath
        .replace(":slug", "posts")
        .replaceAll(":id", "{id}")
        .replaceAll(":transition", "{transition}");
      if (
        !generatedEndpoints.some(
          (endpoint) =>
            endpoint.method === method && endpoint.path === representativePath,
        )
      ) {
        failures.push(`REST endpoint is missing from generated OpenAPI: ${item}`);
      }
      continue;
    }
    if (!corpus.includes(item))
      failures.push(`${category} contract is not documented: ${item}`);
  }
}
for (const method of manifest.sdkMethods) {
  if (
    !sdkSource.includes(`${method}:`) &&
    !sdkSource.includes(`async ${method}(`)
  ) {
    failures.push(`SDK manifest entry does not exist in source: ${method}`);
  }
}
if (!routerSource.includes("/:id/transitions/:transition"))
  failures.push("Transition route is missing from router source");
if (!routerSource.includes("/:id/workflow-history"))
  failures.push("Workflow history route is missing from router source");

const fieldTypeBlock =
  coreTypesSource.match(/export type FieldType\s*=([\s\S]*?);/)?.[1] ?? "";
const fieldTypes = [...fieldTypeBlock.matchAll(/"([A-Za-z]+)"/g)].map(
  (match) => match[1],
);
for (const fieldType of fieldTypes) {
  if (!aiRulesSource.includes(`\`${fieldType}\``))
    failures.push(`AI rules omit FieldType: ${fieldType}`);
  if (!skillSource.includes(`\`${fieldType}\``))
    failures.push(`Dyrected skill omits FieldType: ${fieldType}`);
}

for (const expected of [
  "localStorage(",
  "s3Storage(",
  "b2Storage(",
  "cloudinaryStorage(",
]) {
  if (!configTemplateSource.includes(expected))
    failures.push(`CLI storage template omits factory: ${expected}`);
}
for (const stale of [
  "localAdapter(",
  "s3Adapter(",
  "b2Adapter(",
  "cloudinaryAdapter(",
]) {
  if (configTemplateSource.includes(stale))
    failures.push(`CLI storage template uses stale factory: ${stale}`);
}

if (!corpus.includes("relationTo"))
  failures.push("Relationship configuration docs must name relationTo");
if (!corpus.includes("getGlobal"))
  failures.push("Database adapter global return contract is not documented");

for (const file of mdxFiles) {
  const source = fs.readFileSync(file, "utf8");
  for (const match of source.matchAll(/```json\s*\n([\s\S]*?)```/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      failures.push(
        `Invalid JSON example in ${path.relative(root, file)}: ${error.message}. Use jsonc or text for illustrative snippets.`,
      );
    }
  }
  for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) {
    if (/^(?:\.\.\/)+\.\.\/packages\/|^packages\//.test(match[1])) {
      failures.push(
        `Public example imports workspace source path in ${path.relative(root, file)}: ${match[1]}`,
      );
    }
  }
  for (const fence of source.matchAll(/```(?:ts|tsx|typescript)[^\n]*\n([\s\S]*?)```/g)) {
    const example = ts.createSourceFile(
      path.basename(file),
      fence[1],
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const propertyName = (property) => {
      if (!property.name) return undefined;
      if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
        return property.name.text;
      }
      return undefined;
    };
    const visit = (node) => {
      if (ts.isObjectLiteralExpression(node)) {
        const properties = new Set(node.properties.map(propertyName));
        if (
          properties.has("name") &&
          properties.has("type") &&
          !properties.has("label")
        ) {
          const location = example.getLineAndCharacterOfPosition(node.getStart(example));
          failures.push(
            `${path.relative(root, file)} example field on code line ${location.line + 1} needs an explicit label`,
          );
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(example);
  }
  for (const match of source.matchAll(/\]\((\/docs\/[^)]+)\)/g)) {
    const raw = match[1];
    const [pathname] = raw.split("#");
    const relative = decodeURIComponent(pathname.replace(/^\/docs\/?/, ""));
    const page = relative || "getting-started/introduction";
    const candidates = [
      path.join(docsRoot, `${page}.mdx`),
      path.join(docsRoot, page, "index.mdx"),
    ];
    if (!candidates.some((candidate) => fs.existsSync(candidate))) {
      failures.push(
        `Broken internal docs link in ${path.relative(root, file)}: ${raw}`,
      );
      continue;
    }
    const [, fragment] = raw.split("#");
    if (fragment) {
      const target = candidates.find((candidate) => fs.existsSync(candidate));
      const targetSource = fs.readFileSync(target, "utf8");
      const slugs = [...targetSource.matchAll(/^#{2,6}\s+(.+)$/gm)].map((heading) =>
        heading[1]
          .replace(/[`*_]/g, "")
          .toLowerCase()
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s/g, "-"),
      );
      if (!slugs.includes(fragment.toLowerCase())) {
        failures.push(
          `Broken internal docs anchor in ${path.relative(root, file)}: ${raw}`,
        );
      }
    }
  }
}

if (failures.length) {
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log(`Documentation contract verified across ${mdxFiles.length} pages.`);
