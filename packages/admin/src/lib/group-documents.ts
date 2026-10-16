import type { ViewDocument } from "../providers/view-controller";

export interface DocumentGroup {
  /** Raw value the group represents (stringified). */
  key: string;
  label: string;
  docs: ViewDocument[];
}

export interface GroupedDocuments {
  groups: DocumentGroup[];
  /** Documents whose value is empty. */
  ungrouped: ViewDocument[];
}

function isEmpty(value: unknown): boolean {
  return value === undefined || value === null || value === "";
}

/** Resolves a display label for a stored value, including populated relationships. */
function labelFor(value: unknown): { key: string; label: string } {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const key = String(record.id ?? record._id ?? JSON.stringify(record));
    const label = record.title ?? record.name ?? record.label ?? record.slug ?? key;
    return { key, label: String(label) };
  }
  return { key: String(value), label: String(value) };
}

/** Declared options of a select/radio/boolean field, in authored order. */
function declaredGroups(field: any): Array<{ key: string; label: string }> {
  if (field?.type === "boolean") {
    return [
      { key: "true", label: field.label || "Yes" },
      { key: "false", label: "No" },
    ];
  }
  if (!Array.isArray(field?.options)) return [];
  return field.options.map((option: any) =>
    typeof option === "string"
      ? { key: option, label: option }
      : { key: String(option.value), label: String(option.label ?? option.value) },
  );
}

/**
 * Groups documents by a field. Declared select options come first (so empty
 * columns still exist), then any other value found in the data. Array values
 * place a document in every group it names.
 */
export function groupDocuments(
  documents: ViewDocument[],
  groupBy: string,
  collection?: { fields?: any[] },
): GroupedDocuments {
  const field = (collection?.fields ?? []).find((candidate: any) => candidate.name === groupBy);
  const groups = new Map<string, DocumentGroup>();
  for (const declared of declaredGroups(field)) {
    groups.set(declared.key, { ...declared, docs: [] });
  }

  const ungrouped: ViewDocument[] = [];
  for (const doc of documents) {
    const raw = doc?.[groupBy];
    const values = Array.isArray(raw) ? raw.filter((v) => !isEmpty(v)) : isEmpty(raw) ? [] : [raw];
    if (values.length === 0) {
      ungrouped.push(doc);
      continue;
    }
    for (const value of values) {
      const { key, label } = labelFor(value);
      const group = groups.get(key) ?? { key, label, docs: [] };
      group.docs.push(doc);
      groups.set(key, group);
    }
  }

  return { groups: [...groups.values()], ungrouped };
}
