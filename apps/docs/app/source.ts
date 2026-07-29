import type { Root, Node, Folder } from "fumadocs-core/page-tree";
import { loader } from "fumadocs-core/source";
import { docs } from "../.source/server";
import {
  getEquivalentRuntimeEntry,
  getEquivalentRuntimeUrl,
  getRuntimeCurrentUrls,
  getRuntimeEntryForSlug,
  getRuntimePageUrl,
  isRuntimeAvailable,
  type DocsSiteRuntime,
} from "@/lib/docs-runtime";
import { relativePathFromCurrentUrl } from "@/lib/docs-manifest";

const baseSource = loader({
  baseUrl: "/docs",
  source: docs.toFumadocsSource(),
});

function trimSeparators(nodes: Node[]): Node[] {
  const out: Node[] = [];

  for (const node of nodes) {
    if (node.type === "separator") {
      const last = out.at(-1);
      if (!last || last.type === "separator") continue;
    }

    out.push(node);
  }

  while (out.at(-1)?.type === "separator") out.pop();

  return out;
}

function rewriteRuntimeUrl(
  url: string,
  runtime: DocsSiteRuntime,
): string | undefined {
  const relativePath = relativePathFromCurrentUrl(url);
  if (!relativePath) return undefined;
  if (!isRuntimeAvailable(relativePath, runtime)) return undefined;

  return getRuntimePageUrl(relativePath, runtime);
}

function filterNode(
  node: Node,
  allowedUrls: Set<string>,
  runtime: DocsSiteRuntime,
): Node | undefined {
  if (node.type === "page") {
    if (!allowedUrls.has(node.url)) return undefined;

    const runtimeUrl = rewriteRuntimeUrl(node.url, runtime);
    if (!runtimeUrl) return undefined;

    return {
      ...node,
      url: runtimeUrl,
    };
  }

  if (node.type === "separator") {
    return node;
  }

  const children = trimSeparators(
    node.children
      .map((child) => filterNode(child, allowedUrls, runtime))
      .filter((child): child is Node => child !== undefined),
  );

  const index =
    node.index && allowedUrls.has(node.index.url)
      ? (() => {
          const runtimeUrl = rewriteRuntimeUrl(node.index.url, runtime);
          if (!runtimeUrl) return undefined;

          return {
            ...node.index,
            url: runtimeUrl,
          };
        })()
      : undefined;

  if (children.length === 0 && !index) return undefined;

  return {
    ...node,
    children,
    index,
  } satisfies Folder;
}

function buildRuntimePageTree(runtime: DocsSiteRuntime): Root {
  const allowedUrls = getRuntimeCurrentUrls(runtime);

  return {
    ...baseSource.pageTree,
    children: trimSeparators(
      baseSource.pageTree.children
        .map((node) => filterNode(node, allowedUrls, runtime))
        .filter((node): node is Node => node !== undefined),
    ),
  };
}

const runtimePageTrees = new Map<DocsSiteRuntime, Root>();

function getCachedRuntimePageTree(runtime: DocsSiteRuntime): Root {
  const cached = runtimePageTrees.get(runtime);
  if (cached) return cached;

  const tree = buildRuntimePageTree(runtime);
  runtimePageTrees.set(runtime, tree);
  return tree;
}

function getRuntimePage(runtime: DocsSiteRuntime, slug: string[] | undefined) {
  const page = baseSource.getPage(slug);
  if (!page) return undefined;

  const relativePath = relativePathFromCurrentUrl(page.url);
  if (!relativePath || !isRuntimeAvailable(relativePath, runtime)) {
    return undefined;
  }

  return page;
}

function getRuntimePages(runtime: DocsSiteRuntime) {
  return baseSource.getPages().filter((page) => {
    const relativePath = relativePathFromCurrentUrl(page.url);
    return relativePath ? isRuntimeAvailable(relativePath, runtime) : false;
  });
}

function getRuntimeParams(runtime: DocsSiteRuntime) {
  return baseSource
    .generateParams()
    .filter((param) => getRuntimeEntryForSlug(param.slug, runtime));
}

function getEquivalentPage(
  relativePath: string,
  runtime: DocsSiteRuntime,
) {
  const entry = getEquivalentRuntimeEntry(relativePath, runtime);
  if (!entry) return undefined;

  return {
    entry,
    page: baseSource.getPage(entry.relativePath.split("/")),
    url: getEquivalentRuntimeUrl(relativePath, runtime),
  };
}

export const source = baseSource;

export const runtimeSource = {
  getSource(runtime: DocsSiteRuntime) {
    return {
      pageTree: getCachedRuntimePageTree(runtime),
      getPage: (slug: string[] | undefined) => getRuntimePage(runtime, slug),
      getPages: () => getRuntimePages(runtime),
      generateParams: () => getRuntimeParams(runtime),
    };
  },
  getPageTree: getCachedRuntimePageTree,
  getPage: getRuntimePage,
  getPages: getRuntimePages,
  generateParams: getRuntimeParams,
  getEquivalentPage,
  getEquivalentUrl: getEquivalentRuntimeUrl,
};
