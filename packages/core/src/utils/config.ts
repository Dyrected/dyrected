import type { CollectionConfig, DyrectedConfig, Field } from "../types/index.js";

const AUDIT_COLLECTION_SLUG = "__audit";

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
  labels: { singular: "Audit Log", plural: "Audit Logs" },
  fields: [
    { name: "collection", type: "text", label: "Collection", required: true },
    { name: "documentId", type: "text", label: "Document ID" },
    { name: "operation", type: "select", label: "Operation", options: ["create", "update", "delete"], required: true },
    { name: "user", type: "text", label: "User ID" },
    { name: "timestamp", type: "date", label: "Timestamp", required: true },
    { name: "changes", type: "json", label: "Changes" },
  ],
  admin: { hidden: true },
};

/**
 * Normalizes the Dyrected configuration by injecting system fields
 * (createdAt, updatedAt, createdBy, updatedBy) into every collection and
 * registering the __audit collection if any collection has audit: true.
 */
export function normalizeConfig(config: DyrectedConfig): DyrectedConfig {
  const collections = config?.collections || [];
  const globals = config?.globals || [];
  const needsAudit = collections.some((col) => col.audit);

  const normalizedCollections = collections.map((col) => {
    let fields = col.fields || [];
    const existingFieldNames = new Set(fields.map((f) => f.name));

    // Inject email and password if auth is enabled
    if (col.auth) {
      if (!existingFieldNames.has("email")) {
        fields = [
          ...fields,
          {
            name: "email",
            type: "email",
            label: "Email",
            required: true,
            unique: true,
            promoted: true,
            access: {
              update: "!id",
            },
          },
        ];
      }
      if (!existingFieldNames.has("password")) {
        fields = [
          ...fields,
          {
            name: "password",
            type: "text",
            label: "Password",
            required: true,
            access: {
              update: "!id || user.id == id",
            },
          },
        ];
      }
      if (!existingFieldNames.has("roles")) {
        fields = [
          ...fields,
          {
            name: "roles",
            type: "select",
            label: "Roles",
            defaultValue: [],
            options: [
              { value: "admin", label: "Admin" },
              { value: "editor", label: "Editor" },
              { value: "viewer", label: "Viewer" },
            ],
            access: {
              update: "user.roles && 'admin' in user.roles",
            },
          },
        ];
      }

      // Enforce access control rules for email, password, and roles fields even if explicitly defined
      fields = fields.map((field) => {
        if (field.name === "email") {
          return {
            ...field,
            access: {
              ...(field.access || {}),
              update: "!id",
            },
          };
        }
        if (field.name === "password") {
          return {
            ...field,
            admin: { ...(field.admin || {}) },
            access: {
              ...(field.access || {}),
              update: "!id || user.id == id",
            },
          };
        }
        if (field.name === "roles") {
          return {
            ...field,
            access: {
              ...(field.access || {}),
              // Must be an admin; cannot edit own roles (no self-elevation).
              update: "user.roles && 'admin' in user.roles && user.id != id",
            },
          };
        }
        return field;
      });
    }

    const updatedFieldNames = new Set(fields.map((f) => f.name));
    const fieldsToInject = SYSTEM_FIELDS.filter((f) => !updatedFieldNames.has(f.name));
    return {
      ...col,
      fields: [...fields, ...fieldsToInject],
    };
  });

  const hasAuditCollection = normalizedCollections.some((col) => col.slug === AUDIT_COLLECTION_SLUG);

  return {
    ...config,
    collections: [...normalizedCollections, ...(needsAudit && !hasAuditCollection ? [AUDIT_COLLECTION] : [])],
    globals,
  };
}
