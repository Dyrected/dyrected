import type { CollectionConfig, Field, ReadonlyDatabaseAdapter } from "../types/index.js";
import type { WhereClause } from "./parse-where.js";

const DEFAULT_SEARCHABLE_NAMES = new Set([
  "title",
  "name",
  "label",
  "slug",
  "email",
  "caption",
  "description",
]);

const MAX_RELATION_MATCHES = 50;
const MAX_RELATION_TITLE_DEPTH = 8;
const TITLE_FALLBACK_NAMES = ["title", "name", "label", "heading", "email", "subject"] as const;

function isScalarSearchField(field: Field) {
  return (
    field.type === "text" ||
    field.type === "textarea" ||
    field.type === "richText" ||
    field.type === "email"
  );
}

function findFieldByName(collection: CollectionConfig, fieldName?: string) {
  if (!fieldName) return undefined;
  return collection.fields.find((field) => field.name === fieldName);
}

export function resolveCollectionTitleField(collection: CollectionConfig): Field | undefined {
  const configured = findFieldByName(collection, collection.admin?.useAsTitle);
  if (configured) return configured;

  for (const name of TITLE_FALLBACK_NAMES) {
    const field = findFieldByName(collection, name);
    if (field) return field;
  }

  return collection.fields.find((field) => !!field.name && field.type !== "join" && field.type !== "row");
}

export function getCollectionSearchableFields(collection: CollectionConfig): Field[] {
  const fieldByName = new Map(
    collection.fields
      .filter((field) => !!field.name)
      .map((field) => [field.name as string, field]),
  );

  const configured = collection.admin?.searchableFields
    ?.map((fieldName) => fieldByName.get(fieldName))
    .filter((field): field is Field => !!field);

  if (configured && configured.length > 0) {
    return configured;
  }

  const results: Field[] = [];
  const pushUnique = (field: Field | undefined) => {
    if (!field?.name) return;
    if (results.some((item) => item.name === field.name)) return;
    results.push(field);
  };

  pushUnique(findFieldByName(collection, collection.admin?.useAsTitle));

  for (const field of collection.fields) {
    if (!field.name) continue;
    if (isScalarSearchField(field) && DEFAULT_SEARCHABLE_NAMES.has(field.name)) {
      pushUnique(field);
    }
  }

  return results;
}

function buildScalarSearchClause(fieldName: string, search: string): WhereClause {
  return { [fieldName]: { contains: search } };
}

function getFallbackTitleFields(collection: CollectionConfig): Field[] {
  const fields: Field[] = [];

  for (const name of TITLE_FALLBACK_NAMES) {
    const field = findFieldByName(collection, name);
    if (!field?.name || !isScalarSearchField(field)) continue;
    if (fields.some((item) => item.name === field.name)) continue;
    fields.push(field);
  }

  return fields;
}

async function findMatchingDocumentIdsByWhere(args: {
  collection: CollectionConfig;
  where: WhereClause | undefined;
  db: ReadonlyDatabaseAdapter;
}): Promise<string[]> {
  const { collection, where, db } = args;
  if (!where) return [];

  const matches = await db.find({
    collection: collection.slug,
    where,
    limit: MAX_RELATION_MATCHES,
  });

  return matches.docs
    .map((doc) => doc?.id)
    .filter((id): id is string => typeof id === "string");
}

function buildMultiRelationshipClause(fieldName: string, ids: string[]): WhereClause | undefined {
  const matches = ids.map((id) => ({
    OR: [
      { [fieldName]: { contains: `"${id}"` } },
      { [fieldName]: { contains: id } },
    ],
  }));

  if (matches.length === 0) return undefined;
  return matches.length === 1 ? matches[0] : { OR: matches };
}

function buildRelationshipMatchClause(field: Field, ids: string[]): WhereClause | undefined {
  if (!field.name || ids.length === 0) return undefined;
  if (field.hasMany) {
    return buildMultiRelationshipClause(field.name, ids);
  }

  return { [field.name]: { in: ids } };
}

async function findMatchingDocumentIdsByTitle(args: {
  collection: CollectionConfig;
  search: string;
  db: ReadonlyDatabaseAdapter;
  collections: CollectionConfig[];
  depth?: number;
}): Promise<string[]> {
  const { collection, search, db, collections, depth = 0 } = args;
  if (depth >= MAX_RELATION_TITLE_DEPTH) {
    return [];
  }

  const ids = new Set<string>();
  const titleField = resolveCollectionTitleField(collection);

  if (titleField?.name && isScalarSearchField(titleField)) {
    for (const id of await findMatchingDocumentIdsByWhere({
      collection,
      where: buildScalarSearchClause(titleField.name, search),
      db,
    })) {
      ids.add(id);
    }
  }

  if (titleField?.type === "relationship" && titleField.relationTo) {
    for (const field of getFallbackTitleFields(collection)) {
      for (const id of await findMatchingDocumentIdsByWhere({
        collection,
        where: buildScalarSearchClause(field.name!, search),
        db,
      })) {
        ids.add(id);
      }
    }

    const relatedCollection = collections.find(
      (item) => item.slug === titleField.relationTo,
    );

    if (relatedCollection) {
      const relatedIds = await findMatchingDocumentIdsByTitle({
        collection: relatedCollection,
        search,
        db,
        collections,
        depth: depth + 1,
      });

      const relationClause = buildRelationshipMatchClause(titleField, relatedIds);
      for (const id of await findMatchingDocumentIdsByWhere({
        collection,
        where: relationClause,
        db,
      })) {
        ids.add(id);
      }
    }
  }

  return Array.from(ids).slice(0, MAX_RELATION_MATCHES);
}

async function buildRelationshipSearchClause(args: {
  field: Field;
  search: string;
  db: ReadonlyDatabaseAdapter;
  collections: CollectionConfig[];
}): Promise<WhereClause | undefined> {
  const { field, search, db, collections } = args;
  if (!field.name || field.type !== "relationship" || !field.relationTo) {
    return undefined;
  }

  const relatedCollection = collections.find(
    (collection) => collection.slug === field.relationTo,
  );
  if (!relatedCollection) return undefined;

  const ids = await findMatchingDocumentIdsByTitle({
    collection: relatedCollection,
    search,
    db,
    collections,
  });

  return buildRelationshipMatchClause(field, ids);
}

export async function buildCollectionSearchWhere(args: {
  collection: CollectionConfig;
  search: string | undefined;
  db: ReadonlyDatabaseAdapter;
  collections: CollectionConfig[];
}): Promise<WhereClause | undefined> {
  const { collection, search, db, collections } = args;
  const trimmedSearch = search?.trim();
  if (!trimmedSearch) return undefined;

  const searchableFields = getCollectionSearchableFields(collection);
  if (searchableFields.length === 0) return undefined;

  const clauses: WhereClause[] = [];

  for (const field of searchableFields) {
    if (!field.name) continue;

    if (isScalarSearchField(field)) {
      clauses.push(buildScalarSearchClause(field.name, trimmedSearch));
      continue;
    }

    if (field.type === "relationship") {
      const clause = await buildRelationshipSearchClause({
        field,
        search: trimmedSearch,
        db,
        collections,
      });
      if (clause) clauses.push(clause);
    }
  }

  if (clauses.length === 0) return undefined;
  return clauses.length === 1 ? clauses[0] : { OR: clauses };
}
