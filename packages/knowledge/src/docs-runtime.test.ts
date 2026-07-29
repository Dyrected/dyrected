import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildDocsRuntimeManifest,
  readDocsRuntimeSections,
} from "../scripts/docs-runtime.mjs";

const tempDirs: string[] = [];

function makeDocsRoot() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "dyrected-docs-runtime-"));
  tempDirs.push(root);
  return root;
}

function write(target: string, content: string) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

afterEach(() => {
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe("docs runtime metadata", () => {
  it("builds a classified manifest entry for a page with runtime metadata", () => {
    const docsRoot = makeDocsRoot();
    const page = path.join(docsRoot, "features/authentication/overview.mdx");
    write(
      page,
      [
        "---",
        "title: Overview",
        "description: Auth overview",
        "runtime: variant",
        "runtimeGroup: authentication-overview",
        "---",
        "",
        "Auth docs",
      ].join("\n"),
    );

    const { manifest, failures, warnings } = buildDocsRuntimeManifest({
      allDocsRoot: docsRoot,
      repositoryRoot: docsRoot,
      filenames: [page],
    });

    expect(failures).toEqual([]);
    expect(warnings).toEqual([]);
    expect(manifest[0]).toMatchObject({
      relativePath: "features/authentication/overview",
      runtime: "variant",
      runtimeGroup: "authentication-overview",
      status: "classified",
      urlCloud: "https://docs.dyrected.com/docs/cloud/features/authentication/overview",
      urlSelfHosted:
        "https://docs.dyrected.com/docs/self-hosted/features/authentication/overview",
    });
  });

  it("fails variant pages that omit runtimeGroup", () => {
    const docsRoot = makeDocsRoot();
    const page = path.join(docsRoot, "guide.mdx");
    write(
      page,
      ["---", "title: Guide", "runtime: variant", "---", "", "Guide"].join("\n"),
    );

    const { failures } = buildDocsRuntimeManifest({
      allDocsRoot: docsRoot,
      repositoryRoot: docsRoot,
      filenames: [page],
    });

    expect(failures[0]).toContain("must declare runtimeGroup");
  });

  it("fails invalid runtimePolicy values in meta.json", () => {
    const docsRoot = makeDocsRoot();
    write(
      path.join(docsRoot, "features/authentication/meta.json"),
      JSON.stringify(
        {
          title: "Authentication",
          runtimePolicy: "bad-policy",
        },
        null,
        2,
      ),
    );

    const { failures } = readDocsRuntimeSections(docsRoot);
    expect(failures[0]).toContain("invalid runtimePolicy");
  });

  it("requires explicit page runtime inside explicit-per-page sections", () => {
    const docsRoot = makeDocsRoot();
    write(
      path.join(docsRoot, "features/authentication/meta.json"),
      JSON.stringify(
        {
          title: "Authentication",
          runtimePolicy: "explicit-per-page",
        },
        null,
        2,
      ),
    );
    const page = path.join(docsRoot, "features/authentication/overview.mdx");
    write(page, ["---", "title: Overview", "---", "", "Auth docs"].join("\n"));

    const { failures } = buildDocsRuntimeManifest({
      allDocsRoot: docsRoot,
      repositoryRoot: docsRoot,
      filenames: [page],
    });

    expect(failures[0]).toContain("explicit-per-page");
  });

  it("warns and marks legacy-unclassified pages when runtime metadata is absent outside migrated sections", () => {
    const docsRoot = makeDocsRoot();
    const page = path.join(docsRoot, "basics/getting-started/what-is-dyrected.mdx");
    write(
      page,
      ["---", "title: What is Dyrected?", "---", "", "Intro"].join("\n"),
    );

    const { manifest, failures, warnings } = buildDocsRuntimeManifest({
      allDocsRoot: docsRoot,
      repositoryRoot: docsRoot,
      filenames: [page],
    });

    expect(failures).toEqual([]);
    expect(warnings[0]).toContain("defaulting to shared during migration");
    expect(manifest[0]).toMatchObject({
      runtime: "shared",
      status: "legacy-unclassified",
    });
  });
});
