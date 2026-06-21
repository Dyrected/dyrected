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

  it("covers every public route family in the representative OpenAPI document", () => {
    const paths = endpoints.map((endpoint) => endpoint.path);
    for (const fragment of [
      "/api/openapi.json",
      "/api/globals/",
      "/login",
      "/media",
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
    expect(SKILL).toContain("npx @dyrected/cli init");
    expect(SKILL).toContain("Troubleshooting");
    expect(SKILL).toContain("Relationships and depth");
    expect(SKILL).toContain("Auth and access");
    expect(SKILL).toContain("allowedMimeTypes");
  });

  it("updates documentation through generated regions instead of replacing pages", () => {
    const generator = fs.readFileSync(
      path.join(packageRoot, "scripts/generate.mjs"),
      "utf8",
    );
    expect(generator).toContain("function outputGeneratedRegion");
    for (const target of [
      "reference/configuration.mdx",
      "reference/fields.mdx",
      "reference/sdk.mdx",
      "reference/generated-workflows.mdx",
      "adapters/databases.mdx",
      "adapters/storage.mdx",
    ]) {
      const source = fs.readFileSync(
        path.join(repositoryRoot, "apps/docs/content/docs", target),
        "utf8",
      );
      expect(source).toMatch(/\{\/\* GENERATED:[A-Z-]+:START \*\/\}/);
      expect(source).toMatch(/\{\/\* GENERATED:[A-Z-]+:END \*\/\}/);
      expect(source).toContain("## Generated");
    }
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
