import type { CollectionConfig, DyrectedConfig, Field } from "../types/index.js";
import { AUTH_SESSIONS_COLLECTION } from "../auth/sessions.js";
import { LIFECYCLE_EVENTS_COLLECTION, WORKFLOW_HISTORY_COLLECTION, simplePublishingWorkflow } from "../workflows.js";
import { getAdminAuthCollection } from "./admin-auth.js";
import { normalizeSchemaFragment } from "./block-references.js";
import {
  assertValidAdminConditionsInConfig,
  assertValidDeclarativeAccessInConfig,
  assertValidDeclarativeHooksInConfig,
  assertValidPreviewUrlsInConfig,
} from "./declarative-hooks.js";

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

const MEDIA_SYSTEM_FIELDS: Field[] = [
  { name: "folderId", type: "text", label: "Folder", admin: { hidden: true } },
  { name: "filename", type: "text", label: "Filename", required: true },
  { name: "originalFilename", type: "text", label: "Original Filename", admin: { hidden: true } },
  { name: "mimeType", type: "text", label: "MIME Type", admin: { hidden: true } },
  { name: "filesize", type: "number", label: "File Size", admin: { hidden: true } },
  { name: "url", type: "text", label: "URL", admin: { hidden: true } },
  { name: "width", type: "number", label: "Width", admin: { hidden: true } },
  { name: "height", type: "number", label: "Height", admin: { hidden: true } },
  { name: "aspectRatio", type: "number", label: "Aspect Ratio", admin: { hidden: true } },
  { name: "blurhash", type: "text", label: "Blurhash", admin: { hidden: true } },
  { name: "focalPoint", type: "json", label: "Focal Point", admin: { hidden: true } },
  { name: "alt", type: "text", label: "Alt Text" },
  { name: "caption", type: "text", label: "Caption" },
];

const AUDIT_COLLECTION: CollectionConfig = {
  slug: AUDIT_COLLECTION_SLUG,
  labels: { singular: "Audit Log", plural: "Audit Logs" },
  fields: [
    { name: "collection", type: "text", label: "Collection", required: true },
    { name: "documentId", type: "text", label: "Document ID" },
    {
      name: "operation",
      type: "select",
      label: "Operation",
      options: ["create", "update", "delete"],
      required: true,
    },
    { name: "user", type: "text", label: "User ID" },
    { name: "timestamp", type: "date", label: "Timestamp", required: true },
    { name: "changes", type: "json", label: "Changes" },
  ],
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

const WORKFLOW_HISTORY_COLLECTION_CONFIG: CollectionConfig = {
  slug: WORKFLOW_HISTORY_COLLECTION,
  labels: { singular: "Workflow transition", plural: "Workflow transitions" },
  fields: [
    { name: "collection", type: "text", required: true },
    { name: "documentId", type: "text", required: true },
    { name: "transition", type: "text", required: true },
    { name: "from", type: "text", required: true },
    { name: "to", type: "text", required: true },
    { name: "revision", type: "number", required: true },
    { name: "comment", type: "textarea" },
    { name: "actorId", type: "text" },
    { name: "createdAt", type: "date", required: true },
  ],
  access: {
    read: ({ user }) => !!user,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

const LIFECYCLE_EVENTS_COLLECTION_CONFIG: CollectionConfig = {
  slug: LIFECYCLE_EVENTS_COLLECTION,
  labels: { singular: "Lifecycle event", plural: "Lifecycle events" },
  fields: [
    { name: "name", type: "text", required: true },
    { name: "collection", type: "text", required: true },
    { name: "documentId", type: "text", required: true },
    { name: "occurredAt", type: "date", required: true },
    { name: "actorId", type: "text" },
    { name: "payload", type: "json", required: true },
    { name: "attempts", type: "number", required: true },
    {
      name: "status",
      type: "select",
      options: ["pending", "processing", "delivered", "failed"],
      required: true,
    },
    { name: "nextAttemptAt", type: "date" },
    { name: "deliveredAt", type: "date" },
    { name: "lastError", type: "textarea" },
  ],
  access: {
    read: ({ user }) => !!user?.roles?.includes("admin"),
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

const AUTH_SESSIONS_COLLECTION_CONFIG: CollectionConfig = {
  slug: AUTH_SESSIONS_COLLECTION,
  labels: { singular: "Auth session", plural: "Auth sessions" },
  fields: [
    { name: "userId", type: "text", required: true },
    { name: "email", type: "email", required: true },
    { name: "collection", type: "text", required: true },
    { name: "authSource", type: "text" },
    { name: "providerId", type: "text" },
    { name: "lastIp", type: "text" },
    { name: "lastSeenAt", type: "date" },
    { name: "expiresAt", type: "date" },
    { name: "revokedAt", type: "date" },
  ],
  access: {
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  admin: { hidden: true },
};

/**
 * Normalizes the Dyrected configuration by injecting system fields
 * (createdAt, updatedAt, createdBy, updatedBy) into every collection and
 * registering the __audit collection if any collection has audit: true.
 */
export function normalizeConfig(config: DyrectedConfig): DyrectedConfig {
  const schemaAwareConfig = normalizeSchemaFragment(config);
  assertValidDeclarativeHooksInConfig(schemaAwareConfig, "config");
  assertValidDeclarativeAccessInConfig(schemaAwareConfig, "config");
  assertValidAdminConditionsInConfig(schemaAwareConfig, "config");
  assertValidPreviewUrlsInConfig(schemaAwareConfig, "config");
  const collections = schemaAwareConfig?.collections || [];
  const globals = schemaAwareConfig?.globals || [];
  const needsAudit = collections.some((col) => col.audit);
  const needsWorkflow = collections.some((col) => col.workflow || col.drafts);
  const needsAuthSessions = collections.some((col) => !!col.auth);
  const adminAuthCollectionSlug = getAdminAuthCollection({
    collections,
    adminAuth: schemaAwareConfig.adminAuth,
  })?.slug;

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
      if (!existingFieldNames.has("status")) {
        fields = [
          ...fields,
          {
            name: "status",
            type: "select",
            label: "Status",
            defaultValue: "active",
            options: [
              { value: "active", label: "Active" },
              { value: "pending", label: "Pending" },
            ],
            access: {
              update: "user.roles && 'admin' in user.roles && user.id != id",
            },
            admin: {
              condition: `!(data.roles && "admin" in data.roles)`,
            },
          },
        ];
      }

      // Enforce access control rules for email, password, and roles fields even if explicitly defined
      fields = fields.map((field) => {
        if (field.name === "email") {
          return {
            ...field,
            // Email is the login identifier. Keep the integrity constraints
            // auth relies on even when the field is explicitly redefined, so a
            // custom `email` field can never silently drop uniqueness.
            required: true,
            unique: true,
            promoted: true,
            access: {
              ...(field.access || {}),
              update: "!id",
            },
          };
        }
        if (field.name === "password") {
          return {
            ...field,
            // Password is required to authenticate; enforce it regardless of
            // how the field was declared.
            required: true,
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
        if (field.name === "status") {
          return {
            ...field,
            access: {
              ...(field.access || {}),
              update: "user.roles && 'admin' in user.roles && user.id != id",
            },
          };
        }
        return field;
      }) as any as Field[];
    }

    if (
      adminAuthCollectionSlug &&
      col.slug === adminAuthCollectionSlug &&
      schemaAwareConfig.adminAuth?.mode === "external"
    ) {
      const externalAdminFields: Field[] = [
        {
          name: "authProvider",
          type: "text",
          label: "Auth Provider",
          admin: { readOnly: true, hidden: true },
        },
        {
          name: "externalSubject",
          type: "text",
          label: "External Subject",
          admin: { readOnly: true, hidden: true },
        },
        {
          name: "authSource",
          type: "text",
          label: "Auth Source",
          admin: { readOnly: true, hidden: true },
        },
        {
          name: "lastLoginAt",
          type: "date",
          label: "Last Login At",
          admin: { readOnly: true, hidden: true },
        },
      ];

      for (const field of externalAdminFields) {
        if (!existingFieldNames.has(field.name)) {
          fields = [...fields, field];
        }
      }
    }

    if (col.upload || col.slug === "media") {
      const currentNames = new Set(fields.map((f) => f.name));
      const mediaFieldsToInject = MEDIA_SYSTEM_FIELDS.filter((f) => !currentNames.has(f.name));
      fields = [...fields, ...mediaFieldsToInject];
    }

    const updatedFieldNames = new Set(fields.map((f) => f.name));
    const fieldsToInject = SYSTEM_FIELDS.filter((f) => !updatedFieldNames.has(f.name));
    const workflow = col.workflow || (col.drafts ? simplePublishingWorkflow() : undefined);
    return {
      ...col,
      workflow,
      fields: [...fields, ...fieldsToInject],
    };
  });

  const hasAuditCollection = normalizedCollections.some((col) => col.slug === AUDIT_COLLECTION_SLUG);
  const systemCollections: CollectionConfig[] = [];
  if (needsAudit && !hasAuditCollection) systemCollections.push(AUDIT_COLLECTION);
  if (needsWorkflow && !normalizedCollections.some((col) => col.slug === WORKFLOW_HISTORY_COLLECTION)) {
    systemCollections.push(WORKFLOW_HISTORY_COLLECTION_CONFIG);
  }
  if (needsWorkflow && !normalizedCollections.some((col) => col.slug === LIFECYCLE_EVENTS_COLLECTION)) {
    systemCollections.push(LIFECYCLE_EVENTS_COLLECTION_CONFIG);
  }
  if (needsAuthSessions && !normalizedCollections.some((col) => col.slug === AUTH_SESSIONS_COLLECTION)) {
    systemCollections.push(AUTH_SESSIONS_COLLECTION_CONFIG);
  }

  return {
    ...schemaAwareConfig,
    collections: [...normalizedCollections, ...systemCollections],
    globals,
  };
}
