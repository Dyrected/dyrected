import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AI_RULES, SKILL, endpoints, recipes, references } from "./index.js";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");

describe("generated knowledge contracts", () => {
  it("keeps runtime manifests identical to committed JSON", () => {
    const read = (name: string) =>
      JSON.parse(
        fs.readFileSync(path.join(packageRoot, "generated", name), "utf8"),
      );

    expect(read("recipes.json")).toEqual(recipes);
    expect(read("references.json")).toEqual(references);
    expect(read("endpoints.json")).toEqual(endpoints);
  });

  it("documents the key public contracts", () => {
    const names = new Set(references.map((reference) => reference.name));
    for (const name of [
      "DyrectedConfig",
      "CollectionConfig",
      "GlobalConfig",
      "Field",
      "FieldType",
      "DatabaseAdapter",
      "StorageAdapter",
      "DyrectedClient",
    ]) {
      expect(names.has(name), `${name} is missing`).toBe(true);
    }
  });

  it("keeps key configuration member descriptions populated", () => {
    for (const contractName of ["DyrectedConfig", "CollectionConfig", "GlobalConfig"]) {
      const contract = references.find((reference) => reference.name === contractName);
      expect(contract, `${contractName} is missing`).toBeDefined();
      const blankMembers = contract?.members.filter(
        (member) => member.description.trim() === "",
      ) ?? [];
      expect(blankMembers, `${contractName} members need JSDoc`).toEqual([]);
    }
  });

  it("covers every public route family in the representative OpenAPI document", () => {
    const paths = endpoints.map((endpoint) => endpoint.path);
    for (const fragment of [
      "/api/openapi.json",
      "/api/audit",
      "/api/globals/",
      "/login",
      "/media",
      "/__audit",
      "/transitions/",
      "/api/preferences/",
      "/api/preview-token",
    ]) {
      expect(
        paths.some((endpointPath) => endpointPath.includes(fragment)),
        fragment,
      ).toBe(true);
    }
  });

  it("puts every recipe and supported field type into AI rules", () => {
    for (const recipe of recipes) expect(AI_RULES).toContain(recipe.title);
    for (const fieldType of ["text", "relationship", "blocks", "join"])
      expect(AI_RULES).toContain(`\`${fieldType}\``);
  });

  it("preserves authored operational guidance in hybrid AI surfaces", () => {
    for (const content of [AI_RULES, SKILL]) {
      expect(content).toContain("@dyrected/core");
      expect(content).toContain("dyrected.config.ts");
      expect(content).toContain("installed");
      expect(content).toContain("GENERATED:FIELD_TYPES:START");
      expect(content).toContain("GENERATED:RECIPES:START");
      expect(content).toContain("Rename a field safely");
      expect(content).toContain("label: \"Full name\"");
      expect(content).toContain("server");
    }
    expect(SKILL).toContain("npx dyrected init");
    expect(SKILL).toContain("Troubleshooting");
    expect(SKILL).toContain("Relationships and depth");
    expect(SKILL).toContain("Auth and access");
    expect(SKILL).toContain("allowedMimeTypes");
  });

  const newDocsRoot = path.join(
    repositoryRoot,
    "apps/docs/content/new-docs",
  );
  const fieldPageSlugs = [
    "text",
    "textarea",
    "email",
    "number",
    "date",
    "select",
    "radio-group",
    "checkbox",
    "relationship",
    "upload",
    "rich-text",
    "json",
    "group",
    "array",
    "blocks",
    "join",
    "row",
  ];
  const referenceTargets = [
    { file: "basics/configuration/overview.mdx", region: "REFERENCE-CONFIGURATION" },
    {
      file: "basics/configuration/collections.mdx",
      region: "REFERENCE-CONFIGURATION-COLLECTIONS",
    },
    {
      file: "basics/configuration/globals.mdx",
      region: "REFERENCE-CONFIGURATION-GLOBALS",
    },
    { file: "basics/fields/overview.mdx", region: "REFERENCE-FIELDS" },
    ...fieldPageSlugs.map((slug) => ({
      file: `basics/fields/${slug}.mdx`,
      region: `REFERENCE-FIELD-${slug.toUpperCase()}`,
    })),
    { file: "basics/hooks/overview.mdx", region: "REFERENCE-HOOKS" },
    { file: "managing-data/sdk-api/overview.mdx", region: "REFERENCE-SDK" },
    {
      file: "basics/database/overview.mdx",
      region: "REFERENCE-DATABASE-ADAPTERS",
    },
    {
      file: "features/upload/storage-adapters.mdx",
      region: "REFERENCE-STORAGE-ADAPTERS",
    },
    { file: "features/workflows/overview.mdx", region: "REFERENCE-WORKFLOWS" },
    { file: "managing-data/rest-api/overview.mdx", region: "REFERENCE-REST-API" },
    { file: "managing-data/rest-api/overview.mdx", region: "REFERENCE-OPENAPI" },
  ];

  const stripGeneratedRegions = (source: string) =>
    source
      .replace(/^---[\s\S]*?---/, "")
      .replace(
        /\{\/\* GENERATED:[A-Z-]+:START \*\/\}[\s\S]*?\{\/\* GENERATED:[A-Z-]+:END \*\/\}/g,
        "",
      )
      .trim();

  it("routes generated reference material into authored new-docs pages", () => {
    const generator = fs.readFileSync(
      path.join(packageRoot, "scripts/generate.mjs"),
      "utf8",
    );
    expect(generator).toContain("function outputGeneratedRegion");
    // Generation targets the new-docs tree through region replacement, not
    // full-page overwrites, and no longer targets the old reference tree.
    expect(generator).toContain("newDocsRoot");
    expect(generator).toContain("apps/docs/content/new-docs");
    expect(generator).toContain("referenceTargets");
    expect(generator).not.toContain('"reference/configuration.mdx"');
    expect(generator).not.toContain('"adapters/databases.mdx"');

    for (const { file, region } of referenceTargets) {
      const source = fs.readFileSync(path.join(newDocsRoot, file), "utf8");
      // Exactly one generated region pair for this content.
      expect(
        source.split(`{/* GENERATED:${region}:START */}`).length - 1,
        `${file} is missing the ${region} start marker`,
      ).toBe(1);
      expect(
        source.split(`{/* GENERATED:${region}:END */}`).length - 1,
        `${file} is missing the ${region} end marker`,
      ).toBe(1);
      // Authored prose survives outside every generated region.
      expect(
        stripGeneratedRegions(source).length,
        `${file} must keep authored content outside its generated region`,
      ).toBeGreaterThan(40);
    }
  });

  it("renders generated member docs as option descriptions without a signature column", () => {
    const collectionsPage = fs.readFileSync(
      path.join(newDocsRoot, "basics/configuration/collections.mdx"),
      "utf8",
    );

    expect(collectionsPage).toContain("| Option | Description |");
    expect(collectionsPage).not.toContain("| Member | Signature | Description |");
    expect(collectionsPage).toContain("<code>slug</code> (required)");
    expect(collectionsPage).toContain("<code>siteId</code> (optional)");
  });

  it("gives the workflow reference one canonical home in new-docs", () => {
    const page = path.join(newDocsRoot, "features/workflows/overview.mdx");
    expect(fs.existsSync(page), "workflow page is missing").toBe(true);
    const source = fs.readFileSync(page, "utf8");
    expect(source).toContain("{/* GENERATED:REFERENCE-WORKFLOWS:START */}");
    expect(source).toContain("{/* GENERATED:REFERENCE-WORKFLOWS:END */}");
    // The workflow page is registered in the Features navigation.
    const featuresMeta = JSON.parse(
      fs.readFileSync(path.join(newDocsRoot, "features/meta.json"), "utf8"),
    );
    expect(featuresMeta.pages).toContain("workflows");
    // Workflow contracts are actually generated.
    const workflowRefs = references.filter(
      (reference) => reference.category === "workflows",
    );
    expect(workflowRefs.length).toBeGreaterThan(0);
  });

  it("makes the REST API overview the canonical home for OpenAPI guidance", () => {
    const restApi = fs.readFileSync(
      path.join(newDocsRoot, "managing-data/rest-api/overview.mdx"),
      "utf8",
    );
    // Endpoint inventory and OpenAPI facts both live on the one REST page.
    expect(restApi).toContain("{/* GENERATED:REFERENCE-REST-API:START */}");
    expect(restApi).toContain("{/* GENERATED:REFERENCE-OPENAPI:START */}");
    // OpenAPI is documented here rather than on a separate reference page.
    expect(fs.existsSync(path.join(newDocsRoot, "managing-data/rest-api/openapi.mdx"))).toBe(false);
  });

  it("publishes the raw OpenAPI artifact from the knowledge output", () => {
    const generated = JSON.parse(
      fs.readFileSync(
        path.join(packageRoot, "generated", "openapi.json"),
        "utf8",
      ),
    );
    const published = JSON.parse(
      fs.readFileSync(
        path.join(repositoryRoot, "apps/docs/public/openapi.json"),
        "utf8",
      ),
    );
    expect(generated.openapi).toBeTruthy();
    expect(published).toEqual(generated);
  });

  it("does not expose private SDK implementation members", () => {
    const sdkReferences = references.filter(
      (reference) => reference.sourcePackage === "@dyrected/sdk",
    );
    const client = sdkReferences.find(
      (reference) => reference.name === "DyrectedClient",
    );
    const members = client?.members.map((member) => member.name) ?? [];
    for (const privateName of ["baseUrl", "headers", "fetch", "defaultDepth", "_upload", "request"]) {
      expect(members).not.toContain(privateName);
    }
    const createClient = sdkReferences.find(
      (reference) => reference.name === "createClient",
    );
    expect(createClient?.signature).toContain("DyrectedClient<TSchema>");
    expect(createClient?.signature).not.toContain("{\n");
  });

  it("documents every exported SDK and workflow declaration", () => {
    const documented = new Set(references.map((reference) => reference.name));
    for (const relative of [
      "packages/sdk/src/index.ts",
      "packages/core/src/workflows.ts",
    ]) {
      const source = fs.readFileSync(path.join(repositoryRoot, relative), "utf8");
      const names = [
        ...source.matchAll(
          /^export\s+(?:async\s+)?(?:interface|type|class|function|const)\s+(\w+)/gm,
        ),
      ].map((match) => match[1]);
      for (const name of names) {
        expect(documented.has(name), `${relative} export ${name}`).toBe(true);
      }
    }
  });
});
