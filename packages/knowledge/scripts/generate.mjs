import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import jitiModule from "jiti";
import { replaceGeneratedRegion } from "./hybrid-regions.mjs";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const repositoryRoot = path.resolve(packageRoot, "../..");
const recipesRoot = path.join(packageRoot, "src/recipes");
const generatedRoot = path.join(packageRoot, "generated");
const generatedSource = path.join(packageRoot, "src/generated/recipes.ts");
const generatedReferencesSource = path.join(
  packageRoot,
  "src/generated/references.ts",
);
const generatedAiSource = path.join(packageRoot, "src/generated/ai.ts");
const generatedPromptsSource = path.join(
  packageRoot,
  "src/generated/prompts.ts",
);
const promptTemplatesRoot = path.join(packageRoot, "src/prompt-templates");
const sharedRulesRoot = path.join(packageRoot, "src/shared-rules");
const promptSnapshotsRoot = path.join(packageRoot, "src/prompt-snapshots");
const testFixturesRoot = path.join(packageRoot, "src/test-fixtures");
const docsRoot = path.join(repositoryRoot, "apps/docs/content/docs/recipes");
const allDocsRoot = path.join(repositoryRoot, "apps/docs/content/docs");
const newDocsRoot = path.join(repositoryRoot, "apps/docs/content/docs");
const docsPublicRoot = path.join(repositoryRoot, "apps/docs/public");
const checkOnly = process.argv.includes("--check");
const categories = new Set([
  "content-modeling",
  "data-lifecycle",
  "admin-experience",
  "custom-app-surfaces",
  "access-control",
  "workflows",
  "integrations",
]);
const recipeDocsPathMap = {
  "archive-instead-of-delete": "/docs/ecosystem/common-patterns/data-lifecycle",
  "auto-slug": "/docs/ecosystem/common-patterns/data-lifecycle",
  "category-taxonomy": "/docs/ecosystem/common-patterns/content-modeling",
  "conditional-admin-field": "/docs/ecosystem/common-patterns/admin-experience",
  "cross-field-validation": "/docs/ecosystem/common-patterns/data-lifecycle",
  "custom-page-field-editor":
    "/docs/ecosystem/common-patterns/custom-app-surfaces",
  "custom-page-media-picker":
    "/docs/ecosystem/common-patterns/custom-app-surfaces",
  "custom-theme-shell": "/docs/ecosystem/common-patterns/custom-app-surfaces",
  "dependent-dropdown": "/docs/ecosystem/common-patterns/admin-experience",
  "document-download-library": "/docs/ecosystem/common-patterns/integrations",
  "editorial-publishing-workflow": "/docs/ecosystem/common-patterns/workflows",
  "navigation-global-links": "/docs/ecosystem/common-patterns/content-modeling",
  "owner-or-admin-access": "/docs/ecosystem/common-patterns/access-control",
  "owner-scoped-access": "/docs/ecosystem/common-patterns/access-control",
  "page-builder-blocks": "/docs/ecosystem/common-patterns/content-modeling",
  "preview-url-token-mode": "/docs/ecosystem/common-patterns/workflows",
  "relationship-and-reverse-join":
    "/docs/ecosystem/common-patterns/content-modeling",
  "responsive-image-library": "/docs/ecosystem/common-patterns/integrations",
  "role-based-access": "/docs/ecosystem/common-patterns/access-control",
  "safe-field-rename": "/docs/ecosystem/common-patterns/data-lifecycle",
  "seo-tab-fields": "/docs/ecosystem/common-patterns/admin-experience",
  "site-settings-global": "/docs/ecosystem/common-patterns/content-modeling",
  "tenant-scoped-access": "/docs/ecosystem/common-patterns/access-control",
  "upload-collection": "/docs/ecosystem/common-patterns/integrations",
};

function fail(message) {
  console.error(`[knowledge] ${message}`);
  process.exitCode = 1;
}

function validateMetadata(directory, metadata) {
  const requiredStrings = [
    "id",
    "title",
    "description",
    "problem",
    "summary",
    "category",
  ];
  for (const key of requiredStrings) {
    if (typeof metadata[key] !== "string" || metadata[key].trim() === "") {
      throw new Error(`${directory}/metadata.json requires a non-empty ${key}`);
    }
  }
  if (metadata.id !== directory)
    throw new Error(`${directory}: metadata id must match its directory name`);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(metadata.id))
    throw new Error(`${directory}: recipe id must be stable kebab-case`);
  if (!categories.has(metadata.category))
    throw new Error(`${directory}: unsupported category ${metadata.category}`);
  for (const key of ["intents", "concepts", "requires"]) {
    if (
      !Array.isArray(metadata[key]) ||
      metadata[key].some((item) => typeof item !== "string")
    ) {
      throw new Error(
        `${directory}/metadata.json requires a string array for ${key}`,
      );
    }
  }
  if (
    !Array.isArray(metadata.canonicalDocs) ||
    metadata.canonicalDocs.length === 0 ||
    metadata.canonicalDocs.some(
      (item) => typeof item !== "string" || !item.startsWith("/docs/"),
    )
  ) {
    throw new Error(
      `${directory}/metadata.json requires a non-empty canonicalDocs array of /docs/ links`,
    );
  }
  if (metadata.intents.length === 0)
    throw new Error(
      `${directory}: at least one plain-language intent is required`,
    );
  if (metadata.concepts.length === 0)
    throw new Error(`${directory}: at least one Dyrected concept is required`);
  if (!fs.existsSync(path.join(recipesRoot, directory, "recipe.test.ts")))
    throw new Error(`${directory}: every recipe requires recipe.test.ts`);
}

function validateRecipeSource(directory, source) {
  const file = ts.createSourceFile(
    `${directory}/recipe.ts`,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const propertyName = (property) => {
    if (!property.name) return undefined;
    if (ts.isIdentifier(property.name) || ts.isStringLiteral(property.name)) {
      return property.name.text;
    }
    return undefined;
  };

  // Matches the field builder helpers: `defineField` and every `define<Type>Field`
  // (e.g. defineTextField, defineRichTextField). Excludes `defineBlock`, which
  // is keyed on `slug` rather than `name`/`label`.
  const isFieldDefinerName = (name) =>
    /^define(?:[A-Z][A-Za-z]*)?Field$/.test(name);

  const requireLabel = (node) => {
    const position = file.getLineAndCharacterOfPosition(node.getStart(file));
    throw new Error(
      `${directory}/recipe.ts:${position.line + 1} every named Dyrected field must define an explicit label`,
    );
  };

  const visit = (node) => {
    if (ts.isObjectLiteralExpression(node)) {
      const properties = new Map(
        node.properties.map((property) => [propertyName(property), property]),
      );
      if (
        properties.has("name") &&
        properties.has("type") &&
        !properties.has("label")
      ) {
        requireLabel(node);
      }
    }
    // Fields authored with a `define<Type>Field(...)` helper carry no `type`
    // property (the helper injects it), so inspect the helper's config object
    // directly to keep the explicit-label rule enforced.
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      isFieldDefinerName(node.expression.text)
    ) {
      const [config] = node.arguments;
      if (config && ts.isObjectLiteralExpression(config)) {
        const properties = new Map(
          config.properties.map((property) => [
            propertyName(property),
            property,
          ]),
        );
        if (properties.has("name") && !properties.has("label")) {
          requireLabel(node);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(file);
}

function formatSeeTag(tag, sourceFile) {
  const raw = tag.getText(sourceFile);
  const linkMatch = raw.match(/@see\s+\{\@link\s+(\S+)(?:\s+([^}]+))?\}/);
  if (linkMatch) {
    const [, href, label] = linkMatch;
    return `[${(label ?? href).trim()}](${href})`;
  }

  const plainMatch = raw.match(/@see\s+(.+)$/);
  if (plainMatch) return plainMatch[1].trim();
  return "";
}

function nodeDescription(node, sourceFile) {
  return (node.jsDoc ?? [])
    .flatMap((doc) => {
      const parts = [];
      if (typeof doc.comment === "string" && doc.comment.trim()) {
        parts.push(doc.comment.trim());
      }

      const seeLinks = (doc.tags ?? [])
        .filter((tag) => tag.tagName?.escapedText === "see")
        .map((tag) => formatSeeTag(tag, sourceFile))
        .filter(Boolean);

      if (seeLinks.length) {
        parts.push(`See: ${seeLinks.join(", ")}`);
      }

      return parts;
    })
    .join("\n\n");
}

function declarationName(node) {
  return node.name &&
    (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name))
    ? node.name.text
    : undefined;
}

function memberSignature(member, sourceFile) {
  const name = declarationName(member) ?? "member";
  if (ts.isMethodDeclaration(member) || ts.isMethodSignature(member)) {
    const typeParameters = member.typeParameters?.length
      ? `<${member.typeParameters.map((item) => item.getText(sourceFile)).join(", ")}>`
      : "";
    const parameters = member.parameters
      .map((item) => item.getText(sourceFile))
      .join(", ");
    const returnType = member.type
      ? `: ${member.type.getText(sourceFile)}`
      : "";
    return `${name}${typeParameters}(${parameters})${returnType}`;
  }
  return member.getText(sourceFile).replace(/;$/, "");
}

function isPublicMember(member) {
  const modifiers = ts.canHaveModifiers(member)
    ? ts.getModifiers(member)
    : undefined;
  return !modifiers?.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword,
  );
}

function extractReferences(sourcePath, options) {
  const source = fs.readFileSync(sourcePath, "utf8");
  const sourceFile = ts.createSourceFile(
    sourcePath,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const references = [];

  for (const node of sourceFile.statements) {
    const modifiers = ts.canHaveModifiers(node)
      ? ts.getModifiers(node)
      : undefined;
    if (
      !modifiers?.some(
        (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
      )
    )
      continue;
    const name = ts.isVariableStatement(node)
      ? declarationName(node.declarationList.declarations[0])
      : declarationName(node);
    if (
      !name ||
      (options.names && !options.names.has(name)) ||
      (options.matches && !options.matches(name))
    )
      continue;

    let kind;
    if (ts.isInterfaceDeclaration(node)) kind = "interface";
    else if (ts.isTypeAliasDeclaration(node)) kind = "type";
    else if (ts.isClassDeclaration(node)) kind = "class";
    else if (ts.isFunctionDeclaration(node)) kind = "function";
    else if (ts.isVariableStatement(node)) kind = "constant";
    else continue;

    const members =
      "members" in node && node.members
        ? [...node.members]
            .filter(isPublicMember)
            .map((member) => ({
              name: declarationName(member) ?? "member",
              signature: memberSignature(member, sourceFile),
              description: nodeDescription(member, sourceFile),
            }))
            .filter((member) => member.name !== "member")
        : [];
    const raw = node.getText(sourceFile);
    let signature = raw;
    if (ts.isFunctionDeclaration(node) && node.body) {
      signature = source
        .slice(node.getStart(sourceFile), node.body.getStart(sourceFile))
        .trim();
    } else if (ts.isClassDeclaration(node)) {
      const firstMember = node.members[0];
      const headerEnd = firstMember ? firstMember.getFullStart() : node.end - 1;
      signature = `${source
        .slice(node.getStart(sourceFile), headerEnd)
        .trim()}\n}`;
    }
    references.push({
      id: `${options.sourcePackage}:${name}`,
      name,
      kind,
      category: options.category,
      sourcePackage: options.sourcePackage,
      description: nodeDescription(node, sourceFile),
      signature,
      members,
    });
  }

  return references;
}

function walkFiles(directory, extension) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(target, extension));
    else if (target.endsWith(extension)) files.push(target);
  }
  return files.sort();
}

function frontmatterValue(source, key) {
  return (
    source.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, "m"))?.[1] ?? ""
  );
}

function outputFile(target, content) {
  if (checkOnly) {
    const current = fs.existsSync(target)
      ? fs.readFileSync(target, "utf8")
      : "";
    if (current !== content)
      fail(`Generated file is stale: ${path.relative(repositoryRoot, target)}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function outputGeneratedRegion(target, name, content) {
  if (!fs.existsSync(target)) {
    throw new Error(
      `${path.relative(repositoryRoot, target)} must be created with authored content and ${name} markers before generation`,
    );
  }

  const current = fs.readFileSync(target, "utf8");
  let next;
  try {
    next = replaceGeneratedRegion(current, name, content);
  } catch (error) {
    throw new Error(
      `${path.relative(repositoryRoot, target)}: ${error.message}`,
    );
  }
  outputFile(target, next);
}

const directories = fs
  .readdirSync(recipesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

const recipes = directories.map((directory) => {
  const directoryPath = path.join(recipesRoot, directory);
  const metadata = JSON.parse(
    fs.readFileSync(path.join(directoryPath, "metadata.json"), "utf8"),
  );
  validateMetadata(directory, metadata);
  const source = fs
    .readFileSync(path.join(directoryPath, "recipe.ts"), "utf8")
    .trimEnd();
  validateRecipeSource(directory, source);
  const docsPath = recipeDocsPathMap[metadata.id];
  if (!docsPath) {
    throw new Error(`${directory}: missing docsPath mapping`);
  }
  return {
    ...metadata,
    source,
    docsPath,
    snippetStatus: "validated",
  };
});

const ids = new Set();
for (const recipe of recipes) {
  if (ids.has(recipe.id)) throw new Error(`Duplicate recipe id: ${recipe.id}`);
  ids.add(recipe.id);
}

const recipesJson = `${JSON.stringify(recipes, null, 2)}\n`;
const intentIndex = Object.fromEntries(
  recipes
    .flatMap((recipe) =>
      recipe.intents.map((intent) => [intent.toLowerCase(), recipe.id]),
    )
    .sort(([left], [right]) => left.localeCompare(right)),
);

outputFile(path.join(generatedRoot, "recipes.json"), recipesJson);
outputFile(
  path.join(generatedRoot, "intent-index.json"),
  `${JSON.stringify(intentIndex, null, 2)}\n`,
);
outputFile(
  generatedSource,
  `/* Generated by scripts/generate.mjs. Do not edit manually. */\nimport type { Recipe } from "../types.js";\n\nexport const recipes: readonly Recipe[] = ${recipesJson.trim()};\n`,
);

const categoryLabels = {
  "content-modeling": "Content modeling",
  "data-lifecycle": "Data lifecycle",
  "admin-experience": "Admin experience",
  "custom-app-surfaces": "Custom app surfaces",
  "access-control": "Access control",
  workflows: "Workflows",
  integrations: "Integrations",
};

if (fs.existsSync(docsRoot)) {
  for (const recipe of recipes) {
    const intentList = recipe.intents.map((intent) => `- ${intent}`).join("\n");
    const conceptList = recipe.concepts
      .map((concept) => `\`${concept}\``)
      .join(", ");
    const requires =
      recipe.requires.length > 0
        ? recipe.requires.map((item) => `\`${item}\``).join(", ")
        : "No additional packages.";
    const generatedRecipe = `${recipe.description}

## Use this when

${intentList}

## Dyrected concepts

${conceptList}

**Additional packages:** ${requires}

## Complete recipe

This is the canonical source compiled and behavior-tested by \`@dyrected/knowledge\`.

\`\`\`ts
${recipe.source}
\`\`\``;
    outputGeneratedRegion(
      path.join(docsRoot, `${recipe.id}.mdx`),
      "RECIPE",
      generatedRecipe,
    );
  }
}

function outputRecipeFenceRegion(target, region, recipeId) {
  const recipe = recipes.find((entry) => entry.id === recipeId);
  if (!recipe) {
    throw new Error(`Missing recipe for generated region: ${recipeId}`);
  }

  outputGeneratedRegion(target, region, `\`\`\`tsx\n${recipe.source}\n\`\`\``);
}

const customAppSurfacesPage = path.join(
  newDocsRoot,
  "ecosystem/common-patterns/custom-app-surfaces.mdx",
);

if (fs.existsSync(customAppSurfacesPage)) {
  outputRecipeFenceRegion(
    customAppSurfacesPage,
    "CUSTOM-APP-SURFACES-MEDIA",
    "custom-page-media-picker",
  );
  outputRecipeFenceRegion(
    customAppSurfacesPage,
    "CUSTOM-APP-SURFACES-FIELD",
    "custom-page-field-editor",
  );
  outputRecipeFenceRegion(
    customAppSurfacesPage,
    "CUSTOM-APP-SURFACES-THEME",
    "custom-theme-shell",
  );
}

const groupedPages = [];
for (const category of categories) {
  const categoryRecipes = recipes.filter(
    (recipe) => recipe.category === category,
  );
  if (categoryRecipes.length === 0) continue;
  groupedPages.push(
    `---${categoryLabels[category]}---`,
    ...categoryRecipes.map((recipe) => recipe.id),
  );
}
const coreTypesRoot = path.join(repositoryRoot, "packages/core/src/types");
const coreTypePaths = {
  adapters: path.join(coreTypesRoot, "adapters.ts"),
  admin: path.join(coreTypesRoot, "admin.ts"),
  appConfig: path.join(coreTypesRoot, "app-config.ts"),
  documents: path.join(coreTypesRoot, "documents.ts"),
  hooks: path.join(coreTypesRoot, "hooks.ts"),
  request: path.join(coreTypesRoot, "request.ts"),
  schemaConfig: path.join(coreTypesRoot, "schema-config.ts"),
  schemaCore: path.join(coreTypesRoot, "schema-core.ts"),
  schemaInference: path.join(coreTypesRoot, "schema-inference.ts"),
  workflows: path.join(coreTypesRoot, "workflows.ts"),
};
const workflowPath = path.join(
  repositoryRoot,
  "packages/core/src/workflows.ts",
);
const sdkPath = path.join(repositoryRoot, "packages/sdk/src/index.ts");
const configNames = new Set([
  "DyrectedConfig",
  "CollectionConfig",
  "GlobalConfig",
  "AdminConfig",
  "UploadConfig",
]);
const fieldNames = new Set([
  "Field",
  "FieldType",
  "FieldBase",
  "TypedField",
  "TextField",
  "TextareaField",
  "EmailField",
  "UrlField",
  "IconField",
  "DateField",
  "DateTimeField",
  "TimeField",
  "SelectField",
  "RadioField",
  "NumberField",
  "BooleanField",
  "MultiSelectField",
  "RelationshipField",
  "ImageField",
  "RichTextField",
  "JsonField",
  "ObjectField",
  "ArrayField",
  "BlocksField",
  "JoinField",
  "RowField",
  "Block",
  "BlockVariant",
  "BaseFieldAdmin",
  "TextFieldAdmin",
  "TextareaFieldAdmin",
  "EmailFieldAdmin",
  "UrlFieldAdmin",
  "UrlLinkValue",
  "IconFieldAdmin",
  "SelectFieldAdmin",
  "RadioFieldAdmin",
  "BooleanFieldAdmin",
  "MultiSelectFieldAdmin",
  "CharacterLimitFieldAdmin",
  "WordLimitFieldAdmin",
  "NumberLimitFieldAdmin",
  "NumberFieldAdmin",
  "NumberFormat",
  "DateFieldAdmin",
  "DateFormat",
  "JsonFieldAdmin",
  "DisplayTone",
  "OptionFormat",
  "BooleanFormat",
  "TextFormat",
  "LinkFormat",
  "JsonFormat",
  "DynamicOptionsResolverArgs",
  "DynamicOptionsResolver",
  "DynamicOptionsConfig",
  "DynamicOptionItem",
  "CharacterLimitFieldConfig",
  "WordLimitFieldConfig",
  "NumberLimitFieldConfig",
  "InferDocShape",
  "SystemDocFields",
  "AuthDocFields",
  "UploadDocFields",
]);
const adapterNames = new Set([
  "DatabaseAdapter",
  "ReadonlyDatabaseAdapter",
  "PaginatedResult",
  "StorageAdapter",
  "FileData",
  "ImageService",
]);

const references = [
  ...extractReferences(coreTypePaths.appConfig, {
    category: "configuration",
    sourcePackage: "@dyrected/core",
    names: configNames,
  }),
  ...extractReferences(coreTypePaths.schemaConfig, {
    category: "configuration",
    sourcePackage: "@dyrected/core",
    names: configNames,
  }),
  ...extractReferences(coreTypePaths.admin, {
    category: "configuration",
    sourcePackage: "@dyrected/core",
    names: configNames,
  }),
  ...extractReferences(coreTypePaths.schemaCore, {
    category: "fields",
    sourcePackage: "@dyrected/core",
    names: fieldNames,
  }),
  ...extractReferences(coreTypePaths.schemaInference, {
    category: "fields",
    sourcePackage: "@dyrected/core",
    names: fieldNames,
  }),
  ...extractReferences(coreTypePaths.hooks, {
    category: "hooks",
    sourcePackage: "@dyrected/core",
    matches: (name) => name.includes("Hook") || name === "AuthenticatedUser",
  }),
  ...extractReferences(coreTypePaths.request, {
    category: "hooks",
    sourcePackage: "@dyrected/core",
    matches: (name) => name.includes("Hook") || name === "AuthenticatedUser",
  }),
  ...extractReferences(coreTypePaths.schemaCore, {
    category: "hooks",
    sourcePackage: "@dyrected/core",
    matches: (name) => name.includes("Hook") || name === "AuthenticatedUser",
  }),
  ...extractReferences(coreTypePaths.adapters, {
    category: "adapters",
    sourcePackage: "@dyrected/core",
    names: adapterNames,
  }),
  ...extractReferences(coreTypePaths.documents, {
    category: "adapters",
    sourcePackage: "@dyrected/core",
    names: adapterNames,
  }),
  ...extractReferences(coreTypePaths.workflows, {
    category: "workflows",
    sourcePackage: "@dyrected/core",
    matches: (name) =>
      name.startsWith("Workflow") || name.startsWith("Lifecycle"),
  }),
  ...extractReferences(workflowPath, {
    category: "workflows",
    sourcePackage: "@dyrected/core",
  }),
  ...extractReferences(sdkPath, {
    category: "sdk",
    sourcePackage: "@dyrected/sdk",
  }),
].sort((left, right) => left.id.localeCompare(right.id));

const jiti =
  typeof jitiModule.createJiti === "function"
    ? jitiModule.createJiti(import.meta.url, { interopDefault: true })
    : jitiModule(import.meta.url, { interopDefault: true });
const [{ generateOpenApi }, maximalConfigModule] = await Promise.all([
  jiti.import(path.join(repositoryRoot, "packages/core/src/index.ts")),
  jiti.import(path.join(testFixturesRoot, "maximal-config.ts")),
]);
const openapi = generateOpenApi(maximalConfigModule.default);
const httpMethods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
]);
const endpoints = Object.entries(openapi.paths ?? {})
  .flatMap(([endpointPath, pathItem]) =>
    Object.entries(pathItem)
      .filter(([method]) => httpMethods.has(method))
      .map(([method, operation]) => ({
        id: `${method.toUpperCase()} ${endpointPath}`,
        method: method.toUpperCase(),
        path: endpointPath,
        summary: operation.summary ?? "",
        tags: operation.tags ?? [],
        authenticated:
          operation.security === undefined
            ? Array.isArray(openapi.security) && openapi.security.length > 0
            : Array.isArray(operation.security) &&
              operation.security.length > 0,
        parameters: (operation.parameters ?? []).map((parameter) => ({
          name: parameter.name,
          in: parameter.in,
          required: parameter.required === true,
          ...(parameter.description
            ? { description: parameter.description }
            : {}),
        })),
        responses: Object.keys(operation.responses ?? {}).sort(),
      })),
  )
  .sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.method.localeCompare(right.method),
  );

outputFile(
  path.join(generatedRoot, "references.json"),
  `${JSON.stringify(references, null, 2)}\n`,
);
outputFile(
  path.join(generatedRoot, "endpoints.json"),
  `${JSON.stringify(endpoints, null, 2)}\n`,
);
outputFile(
  path.join(generatedRoot, "openapi.json"),
  `${JSON.stringify(openapi, null, 2)}\n`,
);
outputFile(
  generatedReferencesSource,
  `/* Generated by scripts/generate.mjs. Do not edit manually. */\nimport type { EndpointReference, ReferenceEntry } from "../types.js";\n\nexport const references: readonly ReferenceEntry[] = ${JSON.stringify(references, null, 2)};\n\nexport const endpoints: readonly EndpointReference[] = ${JSON.stringify(endpoints, null, 2)};\n`,
);

function escapeTable(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("{", "&#123;")
    .replaceAll("}", "&#125;")
    .replaceAll("`", "&#96;")
    .replaceAll("|", "&#124;")
    .replaceAll("\n", " ");
}

function isOptionalMember(signature) {
  return typeof signature === "string" && signature.includes("?:");
}

function renderMemberLabel(member) {
  const optionality = isOptionalMember(member.signature)
    ? "optional"
    : "required";
  return `<code>${escapeTable(member.name)}</code> (${optionality})`;
}

function docsUrlForTargetFile(targetFile) {
  return `https://dyrected.com/docs/${targetFile.replace(/\.mdx$/, "")}`;
}

function stripSelfSeeReference(description, pageUrl) {
  if (!description || !pageUrl) return description;

  const paragraphs = description.split(/\n\n+/);
  const last = paragraphs.at(-1);
  if (!last?.startsWith("See: ")) return description;

  const links = [...last.matchAll(/\[([^\]]+)\]\(([^)]+)\)/g)];
  if (links.length === 0) return description;

  const kept = links.filter(([, , href]) => href !== pageUrl);
  if (kept.length === links.length) return description;

  if (kept.length === 0) {
    return paragraphs.slice(0, -1).join("\n\n").trim();
  }

  const nextLast = `See: ${kept
    .map(([, label, href]) => `[${label}](${href})`)
    .join(", ")}`;
  return [...paragraphs.slice(0, -1), nextLast].join("\n\n").trim();
}

function renderReferenceSections(entries, targetFile) {
  const pageUrl = docsUrlForTargetFile(targetFile);
  return entries
    .map((entry) => {
      const members = entry.members.length
        ? `\n| Option | Description |\n| --- | --- |\n${entry.members
            .map(
              (member) =>
                `| ${renderMemberLabel(member)} | ${escapeTable(stripSelfSeeReference(member.description, pageUrl))} |`,
            )
            .join("\n")}\n`
        : "";
      const entryDescription = stripSelfSeeReference(
        entry.description ||
          `Exported ${entry.kind} from ${entry.sourcePackage}.`,
        pageUrl,
      );
      return `## ${entry.name}\n\n${entryDescription}\n\n\`\`\`ts\n${entry.signature}\n\`\`\`\n${members}`;
    })
    .join("\n\n")
    .trimEnd();
}

// Concrete field-type contracts are embedded in their own field pages. Every
// name listed here is routed to that page; field-category entries not listed
// here fall back to the fields overview page.
const fieldPageContracts = {
  "text.mdx": ["TextField", "TextFieldAdmin", "TextFormat"],
  "textarea.mdx": ["TextareaField", "TextareaFieldAdmin", "TextFormat"],
  "email.mdx": ["EmailField", "EmailFieldAdmin", "LinkFormat"],
  "number.mdx": ["NumberField", "NumberFieldAdmin", "NumberFormat"],
  "date.mdx": ["DateField", "DateFieldAdmin", "DateFormat"],
  "datetime.mdx": ["DateTimeField", "DateFieldAdmin", "DateFormat"],
  "time.mdx": ["TimeField", "DateFieldAdmin", "DateFormat"],
  "select.mdx": [
    "SelectField",
    "SelectFieldAdmin",
    "OptionFormat",
    "DisplayTone",
  ],
  "multi-select.mdx": [
    "MultiSelectField",
    "MultiSelectFieldAdmin",
    "OptionFormat",
    "DisplayTone",
  ],
  "url.mdx": ["UrlField", "UrlFieldAdmin", "UrlLinkValue", "LinkFormat"],
  "icon.mdx": ["IconField", "IconFieldAdmin"],
  "radio.mdx": ["RadioField", "RadioFieldAdmin", "OptionFormat", "DisplayTone"],
  "boolean.mdx": [
    "BooleanField",
    "BooleanFieldAdmin",
    "BooleanFormat",
    "DisplayTone",
  ],
  "json.mdx": ["JsonField", "JsonFieldAdmin", "JsonFormat"],
  "relationship.mdx": ["RelationshipField"],
  "image.mdx": ["ImageField"],
  "rich-text.mdx": ["RichTextField"],
  "object.mdx": ["ObjectField"],
  "array.mdx": ["ArrayField"],
  "blocks.mdx": ["BlocksField", "Block", "BlockVariant"],
  "join.mdx": ["JoinField"],
  "row.mdx": ["RowField"],
};
const fieldPageByName = new Map();
for (const [file, names] of Object.entries(fieldPageContracts)) {
  for (const name of names) fieldPageByName.set(name, file);
}
const isDatabaseAdapter = (entry) =>
  entry.name.includes("Database") || entry.name === "PaginatedResult";

// Canonical routing of generated reference material into authored docs
// pages. Each target owns exactly one generated region; when a category cannot
// be classified onto a leaf page it falls back to the topic overview page.
const referenceTargets = [
  {
    file: "basics/configuration/overview.mdx",
    region: "REFERENCE-CONFIGURATION",
    select: (entry) =>
      entry.category === "configuration" &&
      entry.name !== "CollectionConfig" &&
      entry.name !== "GlobalConfig",
  },
  {
    file: "basics/configuration/collections.mdx",
    region: "REFERENCE-CONFIGURATION-COLLECTIONS",
    select: (entry) => entry.name === "CollectionConfig",
  },
  {
    file: "basics/configuration/globals.mdx",
    region: "REFERENCE-CONFIGURATION-GLOBALS",
    select: (entry) => entry.name === "GlobalConfig",
  },
  {
    file: "basics/fields/overview.mdx",
    region: "REFERENCE-FIELDS",
    select: (entry) =>
      entry.category === "fields" && !fieldPageByName.has(entry.name),
  },
  ...Object.entries(fieldPageContracts).map(([file, names]) => ({
    file: `basics/fields/${file}`,
    region: `REFERENCE-FIELD-${file.replace(/\.mdx$/, "").toUpperCase()}`,
    select: (entry) => names.includes(entry.name),
  })),
  {
    file: "basics/hooks/overview.mdx",
    region: "REFERENCE-HOOKS",
    select: (entry) => entry.category === "hooks",
  },
  {
    file: "managing-data/sdk-api/overview.mdx",
    region: "REFERENCE-SDK",
    select: (entry) => entry.category === "sdk",
  },
  {
    file: "basics/database/overview.mdx",
    region: "REFERENCE-DATABASE-ADAPTERS",
    select: (entry) =>
      entry.category === "adapters" && isDatabaseAdapter(entry),
  },
  {
    file: "features/upload/storage-adapters.mdx",
    region: "REFERENCE-STORAGE-ADAPTERS",
    select: (entry) =>
      entry.category === "adapters" && !isDatabaseAdapter(entry),
  },
  {
    file: "features/workflows/overview.mdx",
    region: "REFERENCE-WORKFLOWS",
    select: (entry) => entry.category === "workflows",
  },
];
for (const target of referenceTargets) {
  const pageEntries = references.filter(target.select);
  outputGeneratedRegion(
    path.join(newDocsRoot, target.file),
    target.region,
    renderReferenceSections(pageEntries, target.file),
  );
}

const endpointRows = endpoints
  .map(
    (endpoint) =>
      `| ${endpoint.method} | \`${endpoint.path}\` | ${escapeTable(endpoint.summary)} | ${endpoint.authenticated ? "Required" : "Public"} |`,
  )
  .join("\n");
const restInventory = `| Method | Path | Summary | Authentication |\n| --- | --- | --- | --- |\n${endpointRows}`;
// The REST inventory and OpenAPI/codegen guidance share the canonical REST API
// page, so both regions live in managing-data/rest-api/overview.mdx.
outputGeneratedRegion(
  path.join(newDocsRoot, "managing-data/rest-api/overview.mdx"),
  "REFERENCE-REST-API",
  restInventory,
);
outputGeneratedRegion(
  path.join(newDocsRoot, "managing-data/rest-api/overview.mdx"),
  "REFERENCE-OPENAPI",
  `The representative document currently contains **${endpoints.length} operations**. Use the runtime document for client generation because its schemas reflect your own collections and globals.`,
);
outputFile(
  path.join(docsPublicRoot, "openapi.json"),
  `${JSON.stringify(openapi, null, 2)}\n`,
);

if (fs.existsSync(docsRoot)) {
  const recipeCards = recipes
    .map(
      (recipe) =>
        `- [${recipe.title}](${recipe.docsPath}) — Problem: ${recipe.problem} Summary: ${recipe.summary}`,
    )
    .join("\n");
  outputGeneratedRegion(
    path.join(docsRoot, "index.mdx"),
    "RECIPE-INDEX",
    recipeCards,
  );
  outputFile(
    path.join(docsRoot, "meta.json"),
    `${JSON.stringify({ title: "Recipes", pages: ["index", ...groupedPages] }, null, 2)}\n`,
  );
}

function classifyFence(language, code, recipeSources) {
  if (recipeSources.has(code.trim()))
    return [
      "compiled-recipe",
      "Compiled and behavior-tested by @dyrected/knowledge",
    ];
  if (["json", "jsonc"].includes(language)) {
    if (language === "json") {
      try {
        JSON.parse(code);
        return ["parsed", "Parsed as JSON"];
      } catch {
        return [
          "illustrative",
          "Contains comments, placeholders, or partial JSON",
        ];
      }
    }
    return ["syntax-checked", "Classified as JSON with comments"];
  }
  if (
    ["ts", "tsx", "js", "jsx", "typescript", "javascript"].includes(language)
  ) {
    const kind = language.includes("x")
      ? ts.ScriptKind.TSX
      : language.startsWith("j")
        ? ts.ScriptKind.JS
        : ts.ScriptKind.TS;
    const parsed = ts.createSourceFile(
      "example.ts",
      code,
      ts.ScriptTarget.Latest,
      true,
      kind,
    );
    return parsed.parseDiagnostics.length === 0 && !code.includes("...")
      ? ["syntax-checked", "Parsed by the TypeScript compiler"]
      : [
          "illustrative",
          "Contains placeholders or intentionally partial source",
        ];
  }
  if (["bash", "sh", "shell", "dockerfile"].includes(language))
    return [
      "command",
      "Command example; package and CLI names are inventoried",
    ];
  if (
    ["vue", "svelte", "astro", "html", "css", "yaml", "yml", "sql"].includes(
      language,
    )
  )
    return ["syntax-checked", `Inventoried ${language || "text"} example`];
  return ["illustrative", "Output, prose, or non-executable illustration"];
}

const inventory = [];
const recipeSources = new Set(recipes.map((recipe) => recipe.source.trim()));
for (const filename of walkFiles(allDocsRoot, ".mdx")) {
  const source = fs.readFileSync(filename, "utf8");
  const page = `/${path
    .relative(allDocsRoot, filename)
    .replace(/\\/g, "/")
    .replace(/\.mdx$/, "")}`;
  const fencePattern = /```([\w+-]*)[^\n]*\n([\s\S]*?)```/g;
  let match;
  let index = 0;
  while ((match = fencePattern.exec(source))) {
    const language = match[1].toLowerCase();
    const [classification, validation] = classifyFence(
      language,
      match[2],
      recipeSources,
    );
    inventory.push({
      id: `${page}#example-${++index}`,
      page,
      language,
      classification,
      validation,
    });
  }
}
outputFile(
  path.join(generatedRoot, "examples-inventory.json"),
  `${JSON.stringify(inventory, null, 2)}\n`,
);

const fieldTypeSource =
  references.find((entry) => entry.name === "FieldType")?.signature ?? "";
const fieldTypes = [...fieldTypeSource.matchAll(/["']([^"']+)["']/g)].map(
  (match) => match[1],
);
const intentLines = recipes.flatMap((recipe) =>
  recipe.intents.map(
    (intent) =>
      `- “${intent}” → [${recipe.title}](https://docs.dyrected.com${recipe.docsPath})`,
  ),
);
const integrationContract = fs
  .readFileSync(path.join(sharedRulesRoot, "integration-contract.md"), "utf8")
  .trim();

const modelingRules = fs
  .readFileSync(path.join(sharedRulesRoot, "content-modeling.md"), "utf8")
  .trim();

const cmsGenerationRules = fs
  .readFileSync(path.join(sharedRulesRoot, "cms-generation.md"), "utf8")
  .trim();

const frontendRules = fs
  .readFileSync(path.join(sharedRulesRoot, "frontend-integration.md"), "utf8")
  .trim();

const generatedSections = {
  INTEGRATION_CONTRACT: integrationContract,
  MODELING_RULES: modelingRules,
  CMS_GENERATION_RULES: cmsGenerationRules,
  FRONTEND_RULES: frontendRules,
  FIELD_TYPES: fieldTypes.map((type) => `\`${type}\``).join(", "),
  RECIPES: recipes
    .map(
      (recipe) =>
        `- [${recipe.title}](https://docs.dyrected.com${recipe.docsPath}) — Problem: ${recipe.problem} Summary: ${recipe.summary}`,
    )
    .join("\n"),
  INTENTS: intentLines.join("\n"),
  REFERENCES: [
    "- [Installation](https://docs.dyrected.com/docs/basics/getting-started/installation)",
    "- [CLI and schema synchronization](https://docs.dyrected.com/docs/basics/cli/overview)",
    "- [Configuration](https://docs.dyrected.com/docs/basics/configuration/overview)",
    "- [Collections](https://docs.dyrected.com/docs/basics/configuration/collections)",
    "- [Globals](https://docs.dyrected.com/docs/basics/configuration/globals)",
    "- [Fields](https://docs.dyrected.com/docs/basics/fields/overview)",
    "- [Rich text](https://docs.dyrected.com/docs/basics/fields/rich-text)",
    "- [Blocks](https://docs.dyrected.com/docs/basics/fields/blocks)",
    "- [Admin](https://docs.dyrected.com/docs/features/admin/overview)",
    "- [Preview](https://docs.dyrected.com/docs/features/admin/preview)",
    "- [Hooks](https://docs.dyrected.com/docs/basics/hooks/overview)",
    "- [Database adapters](https://docs.dyrected.com/docs/basics/database/overview)",
    "- [Storage adapters](https://docs.dyrected.com/docs/features/upload/storage-adapters)",
    "- [SDK](https://docs.dyrected.com/docs/managing-data/sdk-api/overview)",
    "- [Workflows](https://docs.dyrected.com/docs/features/workflows/overview)",
    "- [REST and OpenAPI](https://docs.dyrected.com/docs/managing-data/rest-api/overview)",
    "- [Documentation index for agents](https://docs.dyrected.com/llms.txt)",
    "- [Existing-site agent workflow](https://docs.dyrected.com/docs/quick-start-guides/coding-agents-and-ai-app-builders/using-the-dyrected-prompt)",
  ].join("\n"),
};
function renderHybridTemplate(templatePath) {
  let rendered = fs.readFileSync(templatePath, "utf8").trimEnd();
  for (const [name, content] of Object.entries(generatedSections)) {
    if (rendered.includes(`<!-- GENERATED:${name}:START -->`)) {
      try {
        rendered = replaceGeneratedRegion(rendered, name, content);
      } catch (error) {
        throw new Error(
          `${path.relative(repositoryRoot, templatePath)}: ${error.message}`,
        );
      }
    }
  }
  return `${rendered}\n`;
}

const aiRules = renderHybridTemplate(
  path.join(promptTemplatesRoot, "ai-rules.template.md"),
);
const skill = renderHybridTemplate(
  path.join(promptTemplatesRoot, "skill.template.md"),
);
const generateCmsPromptCompiled = renderHybridTemplate(
  path.join(promptTemplatesRoot, "generate-cms.template.md"),
);

const generateSitePromptCompiled = renderHybridTemplate(
  path.join(promptTemplatesRoot, "generate-site.template.md"),
);

outputFile(
  path.join(promptSnapshotsRoot, "generate-site.md"),
  generateSitePromptCompiled,
);

const llmsIndex = {
  generatedBy: "@dyrected/knowledge",
  recipes: recipes.map(
    ({
      id,
      title,
      description,
      problem,
      summary,
      docsPath,
      intents,
      canonicalDocs,
      snippetStatus,
    }) => ({
      id,
      title,
      description,
      problem,
      summary,
      docsPath,
      canonicalDocs,
      snippetStatus,
      intents,
    }),
  ),
  references: references.map(({ id, name, category, sourcePackage }) => ({
    id,
    name,
    category,
    sourcePackage,
  })),
  endpoints: endpoints.map(({ method, path, summary }) => ({
    method,
    path,
    summary,
  })),
  fieldTypes,
};
outputFile(path.join(generatedRoot, "ai-rules.md"), aiRules);
outputFile(path.join(generatedRoot, "SKILL.md"), skill);
outputFile(
  path.join(generatedRoot, "llms-index.json"),
  `${JSON.stringify(llmsIndex, null, 2)}\n`,
);
outputFile(path.join(repositoryRoot, "skills/dyrected/SKILL.md"), skill);
outputFile(
  generatedAiSource,
  `/* Generated by scripts/generate.mjs. Do not edit manually. */\nexport const AI_RULES = ${JSON.stringify(aiRules)};\nexport const SKILL = ${JSON.stringify(skill)};\nexport function buildAiRules(): string { return AI_RULES; }\n`,
);

const installRequirementsToken = "{{DYRECTED_INSTALL_REQUIREMENTS}}";
const cloudInstallRequirements = `If credentials are not already configured, ask me for the following in one
message:

- Site ID
- Site API key
- Base URL

Wait for my reply before using credentials.`;

const selfHostedInstallRequirements = `If the required connection details are
not already configured, ask me for the following in one message:

- Database adapter (e.g. SQLite, PostgreSQL) and database URL/credentials
- Authentication/Security keys (e.g. JWT_SECRET, ENCRYPTION_KEY)
- Base URL (or backend origin URL)

Wait for my reply before using credentials.`;

function compileCmsPrompt(installRequirements) {
  if (!generateCmsPromptCompiled.includes(installRequirementsToken)) {
    throw new Error(
      `generate-cms.template.md is missing ${installRequirementsToken}`,
    );
  }

  return generateCmsPromptCompiled
    .replace(installRequirementsToken, installRequirements)
    .replace(/\r\n/g, "\n");
}

const generateCmsPrompt = compileCmsPrompt(cloudInstallRequirements);
const generateCmsPromptSelfHosted = compileCmsPrompt(
  selfHostedInstallRequirements,
);
outputFile(
  path.join(promptSnapshotsRoot, "generate-cms.md"),
  generateCmsPrompt,
);

const generateSitePrompt = generateSitePromptCompiled.replace(/\r\n/g, "\n");

outputFile(
  generatedPromptsSource,
  `/* Generated by scripts/generate.mjs. Do not edit manually. */\nexport const CMS_PROMPT_CLOUD_CREDENTIAL_REQUEST = ${JSON.stringify(cloudInstallRequirements)};\nexport const GENERATE_CMS_PROMPT = ${JSON.stringify(generateCmsPrompt)};\nexport const GENERATE_CMS_PROMPT_CLOUD = GENERATE_CMS_PROMPT;\nexport const GENERATE_CMS_PROMPT_SELF_HOSTED = ${JSON.stringify(generateCmsPromptSelfHosted)};\nexport const GENERATE_SITE_PROMPT = ${JSON.stringify(generateSitePrompt)};\n`,
);

const docEntries = walkFiles(allDocsRoot, ".mdx").map((filename) => {
  const source = fs.readFileSync(filename, "utf8");
  const relative = path
    .relative(allDocsRoot, filename)
    .replace(/\\/g, "/")
    .replace(/\/index\.mdx$/, "")
    .replace(/\.mdx$/, "");
  return {
    title: frontmatterValue(source, "title") || relative,
    description: frontmatterValue(source, "description"),
    url: `https://docs.dyrected.com/docs/${relative}`,
    source,
  };
});
const conciseDocs = docEntries
  .map(
    (entry) =>
      `- [${entry.title}](${entry.url})${entry.description ? `: ${entry.description}` : ""}`,
  )
  .join("\n");
outputFile(
  docsPublicRoot + "/llms.txt",
  `# Dyrected\n\nCanonical documentation map generated by @dyrected/knowledge.\n\n## Documentation\n\n${conciseDocs}\n\n## Intent-to-pattern index\n\n${intentLines.join("\n")}\n`,
);
const normalizeMdx = (source) =>
  source
    .replace(/^---[\s\S]*?---\s*/, "")
    .replace(/^import .*$/gm, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .trim();
outputFile(
  docsPublicRoot + "/llms-full.txt",
  `# Dyrected complete documentation\n\n${docEntries.map((entry) => `## ${entry.title}\n\nCanonical URL: ${entry.url}\n\n${normalizeMdx(entry.source)}`).join("\n\n---\n\n")}\n`,
);

if (process.exitCode) process.exit(process.exitCode);
if (!checkOnly)
  console.log(
    `[knowledge] Generated ${recipes.length} recipes, ${references.length} references, ${endpoints.length} endpoints, and ${inventory.length} example records.`,
  );
