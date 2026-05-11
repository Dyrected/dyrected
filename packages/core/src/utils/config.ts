import { CollectionConfig, DyrectedConfig, Field } from "../types/index.js";

const AUDIT_COLLECTION_SLUG = '__audit';

const SYSTEM_FIELDS: Field[] = [
  {
    name: "createdAt",
    type: "date",
    label: "Created At",
    admin: { readOnly: true, hidden: true },
  },
  {
    name: "updatedAt",
    type: "date",
    label: "Updated At",
    admin: { readOnly: true, hidden: true },
  },
  {
    name: "createdBy",
    type: "text",
    label: "Created By",
    admin: { readOnly: true, hidden: true },
  },
  {
    name: "updatedBy",
    type: "text",
    label: "Updated By",
    admin: { readOnly: true, hidden: true },
  },
];

const AUDIT_COLLECTION: CollectionConfig = {
  slug: AUDIT_COLLECTION_SLUG,
  labels: { singular: 'Audit Log', plural: 'Audit Logs' },
  fields: [
    { name: 'collection', type: 'text', label: 'Collection', required: true },
    { name: 'documentId', type: 'text', label: 'Document ID' },
    { name: 'operation', type: 'select', label: 'Operation', options: ['create', 'update', 'delete'], required: true },
    { name: 'user', type: 'text', label: 'User ID' },
    { name: 'timestamp', type: 'date', label: 'Timestamp', required: true },
    { name: 'changes', type: 'json', label: 'Changes' },
  ],
  admin: { hidden: true },
};

/**
 * Normalizes the Dyrected configuration by injecting system fields
 * (createdAt, updatedAt, createdBy, updatedBy) into every collection and
 * registering the __audit collection if any collection has audit: true.
 */
export function normalizeConfig(config: DyrectedConfig): DyrectedConfig {
  const needsAudit = config.collections.some((col) => col.audit);

  const normalizedCollections = config.collections.map((col) => {
    const existingFieldNames = new Set(col.fields.map((f) => f.name));
    const fieldsToInject = SYSTEM_FIELDS.filter((f) => !existingFieldNames.has(f.name));
    return {
      ...col,
      fields: [...col.fields, ...fieldsToInject],
    };
  });

  const hasAuditCollection = normalizedCollections.some(
    (col) => col.slug === AUDIT_COLLECTION_SLUG,
  );

  return {
    ...config,
    collections: [
      ...normalizedCollections,
      ...(needsAudit && !hasAuditCollection ? [AUDIT_COLLECTION] : []),
    ],
  };
}
