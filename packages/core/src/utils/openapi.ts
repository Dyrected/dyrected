import type {
  DyrectedConfig,
  Field,
  CollectionConfig,
  GlobalConfig,
} from "../types/index.js";

/**
 * Generate an OpenAPI 3.0 specification based on the Dyrected configuration.
 */
export function generateOpenApi(config: DyrectedConfig) {
  const spec: any = {
    openapi: "3.0.0",
    info: {
      title: "Dyrected API",
      version: "1.0.0",
      description:
        "Automatically generated OpenAPI specification for the Dyrected project.",
    },
    components: {
      schemas: {
        WorkflowMetadata: {
          type: "object",
          required: ["state", "revision"],
          properties: {
            state: { type: "string" },
            revision: { type: "integer", minimum: 1 },
            publishedRevision: { type: "integer", minimum: 1 },
            publishedAt: { type: "string", format: "date-time" },
            publishedBy: { type: "string" },
            availableTransitions: { type: "array", items: { type: "string" } },
          },
        },
        WorkflowTransitionRequest: {
          type: "object",
          properties: {
            expectedRevision: { type: "integer", minimum: 1 },
            comment: { type: "string" },
          },
        },
        WorkflowHistoryEntry: {
          type: "object",
          required: [
            "collection",
            "documentId",
            "transition",
            "from",
            "to",
            "revision",
            "createdAt",
          ],
          properties: {
            id: { type: "string" },
            collection: { type: "string" },
            documentId: { type: "string" },
            transition: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            revision: { type: "integer" },
            comment: { type: "string", nullable: true },
            actorId: { type: "string", nullable: true },
            createdAt: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            message: { type: "string" },
            errors: {
              type: "array",
              items: { type: "object", additionalProperties: true },
            },
          },
        },
        AuthCredentials: {
          type: "object",
          required: ["email", "password"],
          properties: {
            email: { type: "string", format: "email" },
            password: { type: "string" },
          },
        },
        TokenResponse: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { type: "object", additionalProperties: true },
          },
        },
      },
      securitySchemes: {
        ApiKeyAuth: {
          type: "apiKey",
          in: "header",
          name: "x-api-key",
        },
      },
    },
    paths: {},
    security: [{ ApiKeyAuth: [] }],
  };

  spec.paths["/api/schemas"] = {
    get: {
      tags: ["System"],
      summary: "Get the serialized Dyrected schema",
      security: [],
      responses: {
        200: { description: "Collection and global schema definitions" },
      },
    },
  };
  spec.paths["/api/openapi.json"] = {
    get: {
      tags: ["System"],
      summary: "Get the OpenAPI specification",
      security: [],
      responses: { 200: { description: "OpenAPI 3.0 document" } },
    },
  };
  spec.paths["/api/docs"] = {
    get: {
      tags: ["System"],
      summary: "Open interactive API documentation",
      security: [],
      responses: { 200: { description: "Swagger UI HTML" } },
    },
  };
  spec.paths["/api/dyrected/options/{collection}/{field}"] = {
    get: {
      tags: ["System"],
      summary: "Resolve dynamic field options",
      parameters: [
        {
          name: "collection",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
        {
          name: "field",
          in: "path",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { 200: { description: "Resolved option items" } },
    },
  };
  spec.paths["/api/preferences/{key}"] = {
    get: {
      tags: ["Preferences"],
      summary: "Get an authenticated user preference",
      parameters: [
        { name: "key", in: "path", required: true, schema: { type: "string" } },
      ],
      responses: { 200: { description: "Preference value" } },
    },
    put: {
      tags: ["Preferences"],
      summary: "Set an authenticated user preference",
      parameters: [
        { name: "key", in: "path", required: true, schema: { type: "string" } },
      ],
      requestBody: {
        required: true,
        content: { "application/json": { schema: { type: "object" } } },
      },
      responses: { 200: { description: "Updated preference" } },
    },
  };
  spec.paths["/api/preview-token"] = {
    post: {
      tags: ["Preview"],
      summary: "Create a preview token",
      responses: { 200: { description: "Short-lived preview token" } },
    },
  };
  spec.paths["/api/preview-data"] = {
    get: {
      tags: ["Preview"],
      summary: "Resolve preview data from a token",
      security: [],
      parameters: [
        {
          name: "token",
          in: "query",
          required: true,
          schema: { type: "string" },
        },
      ],
      responses: { 200: { description: "Preview document data" } },
    },
  };

  // 1. Generate Schemas for Collections
  for (const collection of config.collections) {
    spec.components.schemas[collection.slug] = collectionToSchema(collection);
  }

  // 2. Generate Schemas for Globals
  for (const global of config.globals) {
    spec.components.schemas[global.slug] = globalToSchema(global);
  }

  // 3. Generate Paths for Collections
  for (const collection of config.collections) {
    const slug = collection.slug;
    const path = `/api/collections/${slug}`;
    const labels = collection.labels || { singular: slug, plural: `${slug}s` };

    spec.paths[path] = {
      get: {
        tags: ["Collections"],
        summary: `Find ${labels.plural}`,
        parameters: [
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10 },
          },
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "where",
            in: "query",
            schema: { type: "string" },
            description: "JSON filter",
          },
          {
            name: "sort",
            in: "query",
            schema: { type: "string" },
            description: "Sort field (e.g. -createdAt)",
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    docs: {
                      type: "array",
                      items: { $ref: `#/components/schemas/${slug}` },
                    },
                    total: { type: "integer" },
                    limit: { type: "integer" },
                    page: { type: "integer" },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Collections"],
        summary: `Create ${labels.singular}`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${slug}` },
            },
          },
        },
        responses: {
          201: {
            description: "Created",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${slug}` },
              },
            },
          },
        },
      },
    };

    spec.paths[`${path}/{id}`] = {
      get: {
        tags: ["Collections"],
        summary: `Get a single ${labels.singular}`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${slug}` },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Collections"],
        summary: `Update ${labels.singular}`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${slug}` },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${slug}` },
              },
            },
          },
        },
      },
      delete: {
        tags: ["Collections"],
        summary: `Delete ${labels.singular}`,
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          204: { description: "Deleted" },
        },
      },
    };

    spec.paths[`${path}/delete-many`] = {
      delete: {
        tags: ["Collections"],
        summary: `Delete multiple ${labels.plural}`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["ids"],
                properties: {
                  ids: { type: "array", items: { type: "string" } },
                },
              },
            },
          },
        },
        responses: { 200: { description: "Deleted and failed document IDs" } },
      },
    };
    spec.paths[`${path}/seed`] = {
      post: {
        tags: ["Collections"],
        summary: `Seed initial ${labels.plural}`,
        responses: { 200: { description: "Seeded documents" } },
      },
    };

    if (collection.upload) {
      spec.paths[`${path}/media`] = {
        get: {
          tags: ["Media"],
          summary: `List ${labels.plural}`,
          responses: { 200: { description: "Paginated media documents" } },
        },
        post: {
          tags: ["Media"],
          summary: `Upload ${labels.singular}`,
          requestBody: {
            required: true,
            content: {
              "multipart/form-data": {
                schema: {
                  type: "object",
                  required: ["file"],
                  properties: { file: { type: "string", format: "binary" } },
                },
              },
            },
          },
          responses: { 201: { description: "Uploaded media document" } },
        },
      };
      spec.paths[`${path}/media/{filename}`] = {
        get: {
          tags: ["Media"],
          summary: `Serve ${labels.singular} bytes`,
          parameters: [
            {
              name: "filename",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          security: [],
          responses: {
            200: { description: "Stored file" },
            404: { description: "File not found" },
          },
        },
      };
    }

    if (collection.auth) {
      const publicAuthPost = (summary: string) => ({
        tags: ["Authentication"],
        summary,
        security: [],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
            },
          },
        },
        responses: {
          200: { description: "Success" },
          400: { description: "Invalid request" },
        },
      });
      spec.paths[`${path}/login`] = {
        post: {
          ...publicAuthPost(`Log in to ${labels.plural}`),
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/AuthCredentials" },
              },
            },
          },
          responses: {
            200: {
              description: "Authenticated",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TokenResponse" },
                },
              },
            },
            401: { description: "Invalid credentials" },
          },
        },
      };
      spec.paths[`${path}/logout`] = {
        post: {
          tags: ["Authentication"],
          summary: `Log out of ${labels.plural}`,
          responses: { 200: { description: "Logged out" } },
        },
      };
      spec.paths[`${path}/init`] = {
        get: {
          tags: ["Authentication"],
          summary: `Get ${labels.plural} initialization state`,
          security: [],
          responses: { 200: { description: "Initialization state" } },
        },
      };
      spec.paths[`${path}/first-user`] = {
        post: publicAuthPost(`Register the first ${labels.singular}`),
      };
      spec.paths[`${path}/me`] = {
        get: {
          tags: ["Authentication"],
          summary: `Get the current ${labels.singular}`,
          responses: { 200: { description: "Authenticated user" } },
        },
      };
      spec.paths[`${path}/refresh-token`] = {
        post: {
          tags: ["Authentication"],
          summary: "Refresh an authentication token",
          responses: { 200: { description: "Refreshed token" } },
        },
      };
      spec.paths[`${path}/forgot-password`] = {
        post: publicAuthPost("Request a password reset"),
      };
      spec.paths[`${path}/reset-password`] = {
        post: publicAuthPost("Reset a password"),
      };
      spec.paths[`${path}/invite`] = {
        post: {
          tags: ["Authentication"],
          summary: `Invite a ${labels.singular}`,
          responses: { 200: { description: "Invitation sent" } },
        },
      };
      spec.paths[`${path}/accept-invite`] = {
        post: publicAuthPost("Accept an invitation"),
      };
      spec.paths[`${path}/{id}/change-password`] = {
        post: {
          tags: ["Authentication"],
          summary: `Change a ${labels.singular} password`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: { 200: { description: "Password changed" } },
        },
      };
    }

    if (collection.workflow) {
      spec.paths[`${path}/{id}/transitions/{transition}`] = {
        post: {
          tags: ["Workflows"],
          summary: `Transition ${labels.singular} workflow`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "transition",
              in: "path",
              required: true,
              schema: {
                type: "string",
                enum: collection.workflow.transitions.map((item) => item.name),
              },
            },
          ],
          requestBody: {
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/WorkflowTransitionRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "Transition applied",
              content: {
                "application/json": {
                  schema: { $ref: `#/components/schemas/${slug}` },
                },
              },
            },
            400: { description: "Required transition input is missing" },
            403: { description: "Transition capability denied" },
            409: { description: "Invalid state or stale revision" },
          },
        },
      };
      spec.paths[`${path}/{id}/workflow-history`] = {
        get: {
          tags: ["Workflows"],
          summary: `Get ${labels.singular} workflow history`,
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 50, maximum: 100 },
            },
          ],
          responses: {
            200: {
              description: "Workflow transition history",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      docs: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/WorkflowHistoryEntry",
                        },
                      },
                      total: { type: "integer" },
                      limit: { type: "integer" },
                      page: { type: "integer" },
                    },
                  },
                },
              },
            },
            403: { description: "Collection read access denied" },
          },
        },
      };
    }
  }

  // 4. Generate Paths for Globals
  for (const global of config.globals) {
    const slug = global.slug;
    const path = `/api/globals/${slug}`;

    spec.paths[path] = {
      get: {
        tags: ["Globals"],
        summary: `Get ${global.label || slug}`,
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${slug}` },
              },
            },
          },
        },
      },
      patch: {
        tags: ["Globals"],
        summary: `Update ${global.label || slug}`,
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${slug}` },
            },
          },
        },
        responses: {
          200: {
            description: "Updated",
            content: {
              "application/json": {
                schema: { $ref: `#/components/schemas/${slug}` },
              },
            },
          },
        },
      },
    };
    spec.paths[`${path}/seed`] = {
      post: {
        tags: ["Globals"],
        summary: `Seed ${global.label || slug}`,
        responses: { 200: { description: "Seeded global" } },
      },
    };
  }

  // 5. Generate the storage-backed file serving path.
  if (config.storage) {
    spec.paths["/api/media/{filename}"] = {
      get: {
        tags: ["Media"],
        summary: "Serve a stored file",
        security: [],
        parameters: [
          {
            name: "filename",
            in: "path",
            required: true,
            schema: { type: "string" },
          },
        ],
        responses: {
          200: { description: "Stored file bytes" },
          404: { description: "File not found" },
        },
      },
    };
  }

  return spec;
}

function collectionToSchema(collection: CollectionConfig) {
  const { properties, required } = fieldsToProperties(collection.fields);
  return {
    type: "object",
    properties: {
      id: { type: "string" },
      createdAt: { type: "string", format: "date-time" },
      updatedAt: { type: "string", format: "date-time" },
      ...(collection.workflow
        ? { _workflow: { $ref: "#/components/schemas/WorkflowMetadata" } }
        : {}),
      ...properties,
    },
    required: ["id", ...required],
  };
}

function globalToSchema(global: GlobalConfig) {
  const { properties, required } = fieldsToProperties(global.fields);
  return {
    type: "object",
    properties,
    required,
  };
}

function fieldsToProperties(fields: Field[]) {
  const props: any = {};
  const required: string[] = [];

  for (const field of fields) {
    if (field.type === "row") {
      const nested = fieldsToProperties(field.fields || []);
      Object.assign(props, nested.properties);
      required.push(...nested.required);
      continue;
    }
    if (!field.name) continue;
    props[field.name] = fieldToSchema(field);
    if (field.required) {
      required.push(field.name);
    }
  }

  return { properties: props, required };
}

function fieldToSchema(field: Field): any {
  let schema: any = {};

  switch (field.type) {
    case "text":
    case "textarea":
    case "email":
      schema = { type: "string" };
      break;
    case "url":
      schema = {
        oneOf: [
          { type: "string" },
          { type: "object", additionalProperties: true },
        ],
      };
      break;
    case "icon":
      schema = { type: "string" };
      break;
    case "number":
      schema = { type: "number" };
      break;
    case "boolean":
      schema = { type: "boolean" };
      break;
    case "date":
      schema = { type: "string", format: "date" };
      break;
    case "datetime":
      schema = { type: "string", format: "date-time" };
      break;
    case "time":
      schema = { type: "string", format: "time" };
      break;
    case "select":
    case "radio":
      schema = {
        type: "string",
        enum: Array.isArray(field.options)
          ? field.options.map((o) => (typeof o === "string" ? o : o.value))
          : undefined,
      };
      break;
    case "multiSelect":
      schema = {
        type: "array",
        items: {
          type: "string",
          enum: Array.isArray(field.options)
            ? field.options.map((o) => (typeof o === "string" ? o : o.value))
            : undefined,
        },
      };
      break;
    case "relationship":
    case "image": {
      const valueSchema = {
        type: "string",
        description: `ID of a ${field.relationTo} record`,
      };
      schema = field.hasMany
        ? { type: "array", items: valueSchema }
        : valueSchema;
      break;
    }
    case "join":
      schema = {
        type: "array",
        readOnly: true,
        items: { type: "object", additionalProperties: true },
      };
      break;
    case "object": {
      const { properties, required } = fieldsToProperties(field.fields || []);
      schema = { type: "object", properties, required };
      break;
    }
    case "array": {
      const { properties, required } = fieldsToProperties(field.fields || []);
      schema = {
        type: "array",
        items: { type: "object", properties, required },
      };
      break;
    }
    case "json":
    case "richText":
      schema = { type: "object", additionalProperties: true };
      break;
    case "blocks":
      schema = {
        type: "array",
        items: {
          oneOf: field.blocks?.map((block) => {
            const { properties, required } = fieldsToProperties(block.fields);
            return {
              type: "object",
              properties: {
                blockType: { type: "string", enum: [block.slug] },
                ...properties,
              },
              required: ["blockType", ...required],
            };
          }),
        },
      };
      break;
    default:
      schema = { type: "string" };
  }

  if (field.label) schema.description = field.label;
  return schema;
}
