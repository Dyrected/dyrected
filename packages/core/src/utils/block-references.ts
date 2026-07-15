import type {
  Block,
  CollectionConfig,
  DyrectedConfig,
  Field,
  GlobalConfig,
} from "../types/index.js";

type SchemaFragment = {
  blocks?: Block[];
  collections?: CollectionConfig[];
  globals?: GlobalConfig[];
};

function mergeUniqueBlocks(blocks: Block[]): Block[] {
  const seen = new Map<string, Block>();

  for (const block of blocks) {
    const existing = seen.get(block.slug);
    if (existing && existing !== block) {
      throw new Error(
        `Duplicate block slug "${block.slug}" found in the reusable block registry. Block slugs must be unique.`,
      );
    }
    if (!existing) seen.set(block.slug, block);
  }

  return Array.from(seen.values());
}

function buildRegistry(blocks: Block[]): Map<string, Block> {
  return new Map(blocks.map((block) => [block.slug, block]));
}

function resolveField(
  field: Field,
  registry: Map<string, Block>,
  blockCache: WeakMap<Block, Block>,
): Field {
  const next = { ...field } as Field;

  if (next.fields) {
    next.fields = next.fields.map((child) =>
      resolveField(child, registry, blockCache),
    );
  }

  if (next.type !== "blocks") return next;

  const hasInlineBlocks = Array.isArray(next.blocks) && next.blocks.length > 0;
  const hasReferences =
    Array.isArray(next.blockReferences) && next.blockReferences.length > 0;

  if (hasInlineBlocks && hasReferences) {
    throw new Error(
      `Blocks field "${next.name ?? "(unnamed)"}" cannot define both "blocks" and "blockReferences". Use one or the other.`,
    );
  }

  if (hasReferences) {
    next.blocks = next.blockReferences!.map((slug) => {
      const block = registry.get(slug);
      if (!block) {
        throw new Error(
          `Unknown block reference "${slug}" on blocks field "${next.name ?? "(unnamed)"}". Add it to defineConfig({ blocks: [...] }).`,
        );
      }
      return resolveBlock(block, registry, blockCache);
    });
    return next;
  }

  if (hasInlineBlocks) {
    next.blocks = next.blocks!.map((block) =>
      resolveBlock(block, registry, blockCache),
    );
  }

  return next;
}

function resolveBlock(
  block: Block,
  registry: Map<string, Block>,
  blockCache: WeakMap<Block, Block>,
): Block {
  const cached = blockCache.get(block);
  if (cached) return cached;

  const resolved: Block = {
    ...block,
    fields: [],
  };
  blockCache.set(block, resolved);
  resolved.fields = block.fields.map((field) =>
    resolveField(field, registry, blockCache),
  );
  return resolved;
}

function resolveFields(
  fields: Field[],
  registry: Map<string, Block>,
  blockCache: WeakMap<Block, Block>,
): Field[] {
  return fields.map((field) => resolveField(field, registry, blockCache));
}

export function normalizeSchemaFragment<T extends SchemaFragment>(
  fragment: T,
): T {
  const reusableBlocks = mergeUniqueBlocks(fragment.blocks ?? []);
  const registry = buildRegistry(reusableBlocks);
  const blockCache = new WeakMap<Block, Block>();

  const resolvedBlocks = reusableBlocks.map((block) =>
    resolveBlock(block, registry, blockCache),
  );
  const resolvedCollections = (fragment.collections ?? []).map(
    (collection) => ({
      ...collection,
      fields: resolveFields(collection.fields ?? [], registry, blockCache),
    }),
  );
  const resolvedGlobals = (fragment.globals ?? []).map((global) => ({
    ...global,
    fields: resolveFields(global.fields ?? [], registry, blockCache),
  }));

  return {
    ...fragment,
    ...(fragment.blocks ? { blocks: resolvedBlocks } : {}),
    ...(fragment.collections ? { collections: resolvedCollections } : {}),
    ...(fragment.globals ? { globals: resolvedGlobals } : {}),
  };
}

export function mergeDynamicConfig(
  baseConfig: DyrectedConfig,
  dynamic: Awaited<ReturnType<NonNullable<DyrectedConfig["onSchemaFetch"]>>>,
): DyrectedConfig {
  const normalizedDynamic = normalizeSchemaFragment({
    ...dynamic,
    blocks: [...(baseConfig.blocks ?? []), ...(dynamic.blocks ?? [])],
  });

  return {
    ...baseConfig,
    ...(normalizedDynamic.blocks ? { blocks: normalizedDynamic.blocks } : {}),
    ...(dynamic.admin
      ? { admin: { ...baseConfig.admin, ...dynamic.admin } }
      : {}),
    ...(dynamic.adminAuth
      ? { adminAuth: { ...baseConfig.adminAuth, ...dynamic.adminAuth } }
      : {}),
    collections: normalizedDynamic.collections
      ? [...baseConfig.collections, ...normalizedDynamic.collections]
      : baseConfig.collections,
    globals: normalizedDynamic.globals
      ? [...baseConfig.globals, ...normalizedDynamic.globals]
      : baseConfig.globals,
  };
}
