import type { Field } from "@dyrected/core";

type SchemaCollection = {
  slug: string;
  admin?: { useAsTitle?: string };
  fields?: Field[];
};

const FALLBACK_FIELD_NAMES = ["title", "name", "label", "heading", "email", "subject"] as const;
const MAX_TITLE_DEPTH = 8;

function findField(collection: SchemaCollection | undefined, fieldName?: string) {
  if (!collection?.fields || !fieldName) return undefined;
  return collection.fields.find((field) => field.name === fieldName);
}

function findNestedField(fields: Field[] | undefined, fieldName?: string) {
  if (!fields || !fieldName) return undefined;
  return fields.find((field) => field.name === fieldName);
}

export function resolveCollectionTitleFieldName(collection: SchemaCollection | undefined): string | undefined {
  const configured = findField(collection, collection?.admin?.useAsTitle);
  if (configured?.name) return configured.name;

  for (const fieldName of FALLBACK_FIELD_NAMES) {
    const field = findField(collection, fieldName);
    if (field?.name) return field.name;
  }

  return collection?.fields?.find((field) => !!field.name && field.type !== "join" && field.type !== "row")?.name;
}

function getObjectFallbackTitle(value: Record<string, unknown>) {
  for (const key of FALLBACK_FIELD_NAMES) {
    const candidate = value[key];
    if (typeof candidate === "string" && candidate.trim()) return candidate;
  }

  const idValue = value.id;
  if (typeof idValue === "string" && idValue.trim()) return idValue;
  if (typeof idValue === "number") return String(idValue);

  return null;
}

function resolveStructuredTitleFieldName(field: Field | undefined) {
  if (!field?.fields?.length) return undefined;

  const configured = findNestedField(field.fields, field.admin?.useAsTitle);
  if (configured?.name) return configured.name;

  for (const fieldName of FALLBACK_FIELD_NAMES) {
    const candidate = findNestedField(field.fields, fieldName);
    if (candidate?.name) return candidate.name;
  }

  return field.fields.find((childField) => !!childField.name && childField.type !== "join" && childField.type !== "row")?.name;
}

function summarizeTitles(values: string[], limit = 3) {
  const unique = values.filter(Boolean);
  if (unique.length === 0) return null;
  if (unique.length <= limit) return unique.join(", ");
  return `${unique.slice(0, limit).join(", ")} +${unique.length - limit} more`;
}

function resolveRelationshipValueTitle(
  value: unknown,
  field: Field | undefined,
  collections: SchemaCollection[] | undefined,
  depth: number,
): string | null {
  if (!field || field.type !== "relationship" || depth >= MAX_TITLE_DEPTH) {
    return null;
  }

  const relatedCollection = collections?.find((collection) => collection.slug === field.relationTo || collection.slug === field.collection);
  const relatedTitleFieldName = resolveCollectionTitleFieldName(relatedCollection);
  const relatedTitleField = findField(relatedCollection, relatedTitleFieldName);

  const resolveOne = (item: unknown): string | null => {
    if (item == null) return null;
    if (typeof item === "string" || typeof item === "number") return String(item);
    if (typeof item !== "object" || Array.isArray(item)) return null;

    const record = item as Record<string, unknown>;
    if (relatedTitleFieldName && relatedTitleField) {
      const relatedValue = record[relatedTitleFieldName];
      const resolved = resolveValueTitleInternal(
        relatedValue,
        relatedTitleField,
        collections,
        depth + 1,
      );
      if (resolved) return resolved;
    }

    return getObjectFallbackTitle(record);
  };

  if (Array.isArray(value)) {
    return summarizeTitles(value.map((item) => resolveOne(item)).filter((item): item is string => !!item));
  }

  return resolveOne(value);
}

function resolveStructuredObjectTitle(
  value: Record<string, unknown>,
  field: Field | undefined,
  collections: SchemaCollection[] | undefined,
  depth: number,
): string | null {
  if (!field?.fields?.length || depth >= MAX_TITLE_DEPTH) {
    return getObjectFallbackTitle(value);
  }

  const titleFieldName = resolveStructuredTitleFieldName(field);
  const titleField = findNestedField(field.fields, titleFieldName);
  if (titleFieldName && titleField) {
    const resolved = resolveValueTitleInternal(
      value[titleFieldName],
      titleField,
      collections,
      depth + 1,
    );
    if (resolved) return resolved;
  }

  return getObjectFallbackTitle(value);
}

function resolveStructuredArrayTitle(
  value: unknown[],
  field: Field | undefined,
  collections: SchemaCollection[] | undefined,
  depth: number,
): string | null {
  if (depth >= MAX_TITLE_DEPTH) return null;

  return summarizeTitles(
    value
      .map((item) => {
        if (item == null) return null;
        if (typeof item !== "object" || Array.isArray(item)) {
          return resolveValueTitleInternal(item, undefined, collections, depth + 1);
        }

        return resolveStructuredObjectTitle(
          item as Record<string, unknown>,
          field,
          collections,
          depth + 1,
        );
      })
      .filter((item): item is string => !!item),
  );
}

export function resolveValueTitle(
  value: unknown,
  field: Field | undefined,
  collections?: SchemaCollection[],
): string | null {
  return resolveValueTitleInternal(value, field, collections, 0);
}

function resolveValueTitleInternal(
  value: unknown,
  field: Field | undefined,
  collections: SchemaCollection[] | undefined,
  depth: number,
): string | null {
  if (value == null) return null;

  if (field?.type === "relationship") {
    const relationTitle = resolveRelationshipValueTitle(
      value,
      field,
      collections,
      depth,
    );
    if (relationTitle) return relationTitle;
  }

  if (field?.type === "array" && Array.isArray(value)) {
    const arrayTitle = resolveStructuredArrayTitle(value, field, collections, depth);
    if (arrayTitle) return arrayTitle;
  }

  if (field?.type === "object" && typeof value === "object" && !Array.isArray(value)) {
    const objectTitle = resolveStructuredObjectTitle(
      value as Record<string, unknown>,
      field,
      collections,
      depth,
    );
    if (objectTitle) return objectTitle;
  }

  if (Array.isArray(value)) {
    return summarizeTitles(
      value
        .map((item) =>
          resolveValueTitleInternal(item, undefined, collections, depth + 1),
        )
        .filter((item): item is string => !!item),
    );
  }

  if (typeof value === "string") return value;
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";

  if (typeof value === "object") {
    return getObjectFallbackTitle(value as Record<string, unknown>);
  }

  return null;
}

export function resolveDocumentTitle(args: {
  entry: Record<string, unknown> | null | undefined;
  collection: SchemaCollection | undefined;
  collections?: SchemaCollection[];
}): string {
  const { entry, collection, collections } = args;
  if (!entry) return "";

  const titleFieldName = resolveCollectionTitleFieldName(collection);
  const titleField = findField(collection, titleFieldName);
  if (titleFieldName && titleField) {
    const title = resolveValueTitle(entry[titleFieldName], titleField, collections);
    if (title) return title;
  }

  const fallback = getObjectFallbackTitle(entry);
  if (fallback) return fallback;

  return String(entry.id ?? "");
}
