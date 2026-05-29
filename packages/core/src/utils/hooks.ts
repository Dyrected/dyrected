import type { Field, HookFunction, FieldHook } from "../types/index.js";

/**
 * Run a list of hook functions sequentially.
 * Each hook function receives the output of the previous hook function (if any).
 */
export async function runCollectionHooks(
  hooks: HookFunction[] | undefined,
  args: {
    data?: any;
    doc?: any;
    user?: any;
    req?: any;
    operation?: "create" | "update" | "delete";
    [key: string]: any;
  }
): Promise<any> {
  if (!hooks || hooks.length === 0) {
    return args.data ?? args.doc ?? undefined;
  }

  let currentPayload = args.data ?? args.doc ?? undefined;

  for (const hook of hooks) {
    const result = await hook({
      ...args,
      data: args.data !== undefined ? currentPayload : undefined,
      doc: args.doc !== undefined ? currentPayload : undefined,
    });

    if (result !== undefined) {
      currentPayload = result;
    }
  }

  return currentPayload;
}

/**
 * Execute field-level beforeChange hooks recursively on the data payload.
 */
export async function executeFieldBeforeChange(
  fields: Field[],
  data: any,
  originalDoc: any,
  user: any
): Promise<any> {
  if (!data || typeof data !== "object") return data;

  const result = { ...data };

  for (const field of fields) {
    if (!field.name) continue;

    const value = result[field.name];
    const origValue = originalDoc?.[field.name];

    // Run beforeChange on the current field value
    let updatedValue = value;
    if (field.hooks?.beforeChange) {
      for (const hook of field.hooks.beforeChange) {
        updatedValue = await hook({
          value: updatedValue,
          originalDoc,
          data: result,
          user,
        });
      }
      result[field.name] = updatedValue;
    }

    // Recursively process nested structures
    if (updatedValue !== undefined && updatedValue !== null) {
      if (field.type === "object" && field.fields) {
        result[field.name] = await executeFieldBeforeChange(
          field.fields,
          updatedValue,
          origValue,
          user
        );
      } else if (field.type === "array" && field.fields && Array.isArray(updatedValue)) {
        const arrayResult = [];
        for (let i = 0; i < updatedValue.length; i++) {
          const item = updatedValue[i];
          const origItem = Array.isArray(origValue) ? origValue[i] : undefined;
          const processedItem = await executeFieldBeforeChange(
            field.fields,
            item,
            origItem,
            user
          );
          arrayResult.push(processedItem);
        }
        result[field.name] = arrayResult;
      } else if (field.type === "blocks" && field.blocks && Array.isArray(updatedValue)) {
        const blocksResult = [];
        for (let i = 0; i < updatedValue.length; i++) {
          const blockData = updatedValue[i];
          const origBlock = Array.isArray(origValue) ? origValue[i] : undefined;
          const blockConfig = field.blocks.find((b) => b.slug === blockData.blockType);

          if (blockConfig) {
            const processedBlock = await executeFieldBeforeChange(
              blockConfig.fields,
              blockData,
              origBlock,
              user
            );
            blocksResult.push(processedBlock);
          } else {
            blocksResult.push(blockData);
          }
        }
        result[field.name] = blocksResult;
      }
    }
  }

  return result;
}

/**
 * Execute field-level afterRead hooks recursively on the document.
 */
export async function executeFieldAfterRead(
  fields: Field[],
  doc: any,
  user: any
): Promise<any> {
  if (!doc || typeof doc !== "object") return doc;

  const result = { ...doc };

  for (const field of fields) {
    if (!field.name) continue;

    const value = result[field.name];

    // Run afterRead on the current field value
    let updatedValue = value;
    if (field.hooks?.afterRead) {
      for (const hook of field.hooks.afterRead) {
        updatedValue = await hook({
          value: updatedValue,
          doc: result,
          user,
        });
      }
      result[field.name] = updatedValue;
    }

    // Recursively process nested structures
    if (updatedValue !== undefined && updatedValue !== null) {
      if (field.type === "object" && field.fields) {
        result[field.name] = await executeFieldAfterRead(
          field.fields,
          updatedValue,
          user
        );
      } else if (field.type === "array" && field.fields && Array.isArray(updatedValue)) {
        const arrayResult = [];
        for (const item of updatedValue) {
          const processedItem = await executeFieldAfterRead(
            field.fields,
            item,
            user
          );
          arrayResult.push(processedItem);
        }
        result[field.name] = arrayResult;
      } else if (field.type === "blocks" && field.blocks && Array.isArray(updatedValue)) {
        const blocksResult = [];
        for (const blockData of updatedValue) {
          const blockConfig = field.blocks.find((b) => b.slug === blockData.blockType);
          if (blockConfig) {
            const processedBlock = await executeFieldAfterRead(
              blockConfig.fields,
              blockData,
              user
            );
            blocksResult.push(processedBlock);
          } else {
            blocksResult.push(blockData);
          }
        }
        result[field.name] = blocksResult;
      }
    }
  }

  return result;
}
