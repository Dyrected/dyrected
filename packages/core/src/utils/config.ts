import { DyrectedConfig, Field } from "../types/index.js";

/**
 * Normalizes the Dyrected configuration by injecting default fields
 * (like createdAt and updatedAt) into collection schemas if enabled.
 */
export function normalizeConfig(config: DyrectedConfig): DyrectedConfig {
  const normalizedCollections = config.collections.map((col) => {
    // Timestamps are enabled by default
    const useTimestamps = col.timestamps !== false;

    if (!useTimestamps) return col;

    const timestampFields: Field[] = [
      {
        name: "createdAt",
        type: "date",
        label: "Created At",
        admin: {
          readOnly: true,
          hidden: false,
          description: "The date this record was created.",
        },
      },
      {
        name: "updatedAt",
        type: "date",
        label: "Updated At",
        admin: {
          readOnly: true,
          hidden: false,
          description: "The date this record was last updated.",
        },
      },
    ];

    // Filter out fields that might already exist with these names to avoid duplicates
    const existingFieldNames = col.fields.map((f) => f.name);
    const fieldsToInject = timestampFields.filter((f) => !existingFieldNames.includes(f.name));

    return {
      ...col,
      fields: [...col.fields, ...fieldsToInject],
    };
  });

  return {
    ...config,
    collections: normalizedCollections,
  };
}
