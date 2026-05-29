import type { DyrectedConfig, Field, CollectionConfig, GlobalConfig } from "../types/index.js";

/**
 * Generate an OpenAPI 3.0 specification based on the Dyrected configuration.
 */
export function generateOpenApi(config: DyrectedConfig) {
  const spec: any = {
    openapi: "3.0.0",
    info: {
      title: "Dyrected API",
      version: "1.0.0",
      description: "Automatically generated OpenAPI specification for the Dyrected project.",
    },
    components: {
      schemas: {},
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
          { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "where", in: "query", schema: { type: "string" }, description: "JSON filter" },
          { name: "sort", in: "query", schema: { type: "string" }, description: "Sort field (e.g. -createdAt)" },
        ],
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    docs: { type: "array", items: { $ref: `#/components/schemas/${slug}` } },
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
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
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
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: {
          204: { description: "Deleted" },
        },
      },
    };
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
  }

  // 5. Generate Paths for Media (if storage is configured)
  if (config.storage) {
    spec.paths["/api/media"] = {
      get: {
        tags: ["Media"],
        summary: "List Media",
        responses: {
          200: {
            description: "Success",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    docs: { type: "array", items: { type: "object", additionalProperties: true } },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ["Media"],
        summary: "Upload Media",
        requestBody: {
          content: {
            "multipart/form-data": {
              schema: {
                type: "object",
                properties: {
                  file: { type: "string", format: "binary" },
                },
              },
            },
          },
        },
        responses: {
          201: { description: "Uploaded" },
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
    if (!field.name || (field.type as string) === 'join' || (field.type as string) === 'row') continue;
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
    case "url":
      schema = { type: "string" };
      break;
    case "number":
      schema = { type: "number" };
      break;
    case "boolean":
      schema = { type: "boolean" };
      break;
    case "date":
      schema = { type: "string", format: "date-time" };
      break;
    case "select":
    case "radio":
      schema = { type: "string", enum: field.options?.map((o) => (typeof o === "string" ? o : o.value)) };
      break;
    case "multiSelect":
      schema = {
        type: "array",
        items: { type: "string", enum: field.options?.map((o) => (typeof o === "string" ? o : o.value)) },
      };
      break;
    case "relationship":
      schema = { type: 'string', description: `ID of a ${field.relationTo} record` };
      break;
    case "object": {
      const { properties, required } = fieldsToProperties(field.fields || []);
      schema = { type: "object", properties, required };
      break;
    }
    case "array": {
      const { properties, required } = fieldsToProperties(field.fields || []);
      schema = { type: "array", items: { type: "object", properties, required } };
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
