import fs from "node:fs";
import path from "node:path";

export const DOCS_RUNTIMES = [
  "shared",
  "cloud",
  "self-hosted",
  "variant",
];

export const DOCS_RUNTIME_POLICIES = ["inherit", "explicit-per-page"];

const RUNTIME_SET = new Set(DOCS_RUNTIMES);
const RUNTIME_POLICY_SET = new Set(DOCS_RUNTIME_POLICIES);
const RUNTIME_GROUP_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function readJson(target) {
  return JSON.parse(fs.readFileSync(target, "utf8"));
}

function normalizeRelative(target, root) {
  return path.relative(root, target).replace(/\\/g, "/");
}

function getFrontmatterBlock(source) {
  const match = source.match(/^---\n([\s\S]*?)\n---\s*/);
  return match?.[1] ?? "";
}

function getFrontmatterValue(source, key) {
  const frontmatter = getFrontmatterBlock(source);
  if (!frontmatter) return "";
  return (
    frontmatter.match(new RegExp(`^${key}:\\s*["']?(.+?)["']?$`, "m"))?.[1] ?? ""
  );
}

function sectionRuntimeContext(sections, sectionPath) {
  const inherited = {
    runtimeDefault: "",
    runtimePolicy: "",
  };

  const parts = sectionPath ? sectionPath.split("/") : [];
  const ancestors = [""];
  for (let i = 0; i < parts.length; i++) {
    ancestors.push(parts.slice(0, i + 1).join("/"));
  }

  for (const ancestor of ancestors) {
    const section = sections.get(ancestor);
    if (!section) continue;
    if (section.runtimeDefault) inherited.runtimeDefault = section.runtimeDefault;
    if (section.runtimePolicy) inherited.runtimePolicy = section.runtimePolicy;
  }

  return inherited;
}

export function readDocsRuntimeSections(allDocsRoot) {
  const sections = new Map();
  const failures = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(target);
        continue;
      }

      if (entry.name !== "meta.json") continue;

      const relativeDir = normalizeRelative(path.dirname(target), allDocsRoot);
      const sectionPath = relativeDir === "." ? "" : relativeDir;
      const parsed = readJson(target);
      const runtimeDefault = parsed.runtimeDefault ?? "";
      const runtimePolicy = parsed.runtimePolicy ?? "";

      if (runtimeDefault && !RUNTIME_SET.has(runtimeDefault)) {
        failures.push(
          `${normalizeRelative(target, allDocsRoot)} has invalid runtimeDefault: ${runtimeDefault}`,
        );
      }

      if (runtimePolicy && !RUNTIME_POLICY_SET.has(runtimePolicy)) {
        failures.push(
          `${normalizeRelative(target, allDocsRoot)} has invalid runtimePolicy: ${runtimePolicy}`,
        );
      }

      sections.set(sectionPath, {
        runtimeDefault,
        runtimePolicy,
      });
    }
  }

  walk(allDocsRoot);
  return { sections, failures };
}

export function buildDocsRuntimeManifest({
  allDocsRoot,
  repositoryRoot,
  docsBaseUrl = "https://docs.dyrected.com/docs",
  filenames,
}) {
  const { sections, failures } = readDocsRuntimeSections(allDocsRoot);
  const warnings = [];

  const manifest = [...filenames]
    .sort()
    .map((filename) => {
      const source = fs.readFileSync(filename, "utf8");
      const relativePath = normalizeRelative(filename, allDocsRoot)
        .replace(/\/index\.mdx$/, "")
        .replace(/\.mdx$/, "");
      const sectionPath = path.dirname(relativePath) === "." ? "" : path.dirname(relativePath);
      const sectionContext = sectionRuntimeContext(sections, sectionPath);
      const runtime = getFrontmatterValue(source, "runtime");
      const runtimeGroup = getFrontmatterValue(source, "runtimeGroup");
      const runtimeNotes = getFrontmatterValue(source, "runtimeNotes");
      const effectiveRuntime = runtime || sectionContext.runtimeDefault || "shared";
      const status = runtime || sectionContext.runtimeDefault
        ? "classified"
        : "legacy-unclassified";
      const relativeFilename = normalizeRelative(filename, repositoryRoot);

      if (runtime && !RUNTIME_SET.has(runtime)) {
        failures.push(`${relativeFilename} has invalid runtime: ${runtime}`);
      }

      if (
        sectionContext.runtimePolicy === "explicit-per-page" &&
        !runtime
      ) {
        failures.push(
          `${relativeFilename} must declare runtime because ${sectionPath || "."} is explicit-per-page`,
        );
      }

      if (runtime === "variant" && !runtimeGroup) {
        failures.push(`${relativeFilename} must declare runtimeGroup when runtime is variant`);
      }

      if (runtimeGroup && !RUNTIME_GROUP_PATTERN.test(runtimeGroup)) {
        failures.push(`${relativeFilename} has malformed runtimeGroup: ${runtimeGroup}`);
      }

      if (status === "legacy-unclassified") {
        warnings.push(
          `${relativeFilename} has no runtime metadata; defaulting to shared during migration`,
        );
      }

      return {
        id: relativePath.replace(/\//g, "--"),
        relativePath,
        title: getFrontmatterValue(source, "title") || relativePath,
        description: getFrontmatterValue(source, "description"),
        runtime: effectiveRuntime,
        runtimeGroup,
        runtimeNotes,
        sectionPath,
        sourceFile: relativeFilename,
        urlCurrent: `${docsBaseUrl}/${relativePath}`,
        urlCloud: `${docsBaseUrl}/cloud/${relativePath}`,
        urlSelfHosted: `${docsBaseUrl}/self-hosted/${relativePath}`,
        status,
      };
    });

  const grouped = new Map();
  for (const entry of manifest) {
    if (!entry.runtimeGroup) continue;
    const bucket = grouped.get(entry.runtimeGroup) ?? [];
    bucket.push(entry);
    grouped.set(entry.runtimeGroup, bucket);
  }

  for (const [runtimeGroup, entries] of grouped.entries()) {
    const runtimeCounts = new Map();
    for (const entry of entries) {
      runtimeCounts.set(entry.runtime, (runtimeCounts.get(entry.runtime) ?? 0) + 1);
    }

    for (const [runtime, count] of runtimeCounts.entries()) {
      if (count > 1 && runtime !== "variant") {
        failures.push(
          `runtimeGroup ${runtimeGroup} maps to multiple ${runtime} pages: ${entries
            .filter((entry) => entry.runtime === runtime)
            .map((entry) => entry.sourceFile)
            .join(", ")}`,
        );
      }
    }
  }

  return {
    manifest,
    warnings,
    failures,
  };
}
