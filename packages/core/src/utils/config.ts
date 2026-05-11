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
    { name: 'entity', type: 'text', label: 'Entity', required: true },
    { name: 'entityId', type: 'text', label: 'Entity ID' },
    { name: 'action', type: 'select', label: 'Action', options: ['create', 'update', 'delete', 'publish'], required: true },
    { name: 'userCollection', type: 'text', label: 'User Collection' },
    { name: 'userId', type: 'text', label: 'User ID' },
    { name: 'userEmail', type: 'text', label: 'User Email' },
    { name: 'changes', type: 'json', label: 'Changes' },
    { name: 'snapshot', type: 'json', label: 'Snapshot' },
    { name: 'timestamp', type: 'date', label: 'Timestamp', required: true },
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
