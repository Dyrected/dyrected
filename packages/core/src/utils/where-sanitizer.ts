import { WhereClause } from './parse-where.js';
import type { Field } from '../types/index.js';

const NEVER_FILTERABLE_TYPES = [
  'password',
  'richText',
  'json',
  'file',
  'image',
  'join',
  'collapsible'
];

/**
 * Sanitizes a WhereClause by stripping out any fields that:
 * 1. Do not exist in the schema.
 * 2. Have admin.filterable === false.
 * 3. Are of a type that is never filterable (e.g. password, richText).
 */
export function sanitizeWhereClause(where: WhereClause, fields: Field[]): WhereClause {
  // Build a fast lookup map for fields, including nested fields if needed.
  // For simplicity, we just look at top-level fields for now, as the DSL is flat.
  // If the DSL supports nested properties (e.g., block fields), we'd need a deep lookup.
  const fieldMap = new Map<string, Field>();
  
  function addFieldsToMap(fList: Field[], prefix = '') {
    for (const f of fList) {
      if ('name' in f && f.name) {
        fieldMap.set(prefix + f.name, f as Field);
      }
      // If we support filtering inside groups/rows, we would recurse here.
      // But for now, let's just do top-level.
      if (f.type === 'object' || f.type === 'row' || f.type === 'array') {
        if ('fields' in f && Array.isArray(f.fields)) {
          addFieldsToMap(f.fields as Field[], f.type === 'object' || f.type === 'array' ? `${prefix}${(f as any).name}.` : prefix);
        }
      }
    }
  }
  
  addFieldsToMap(fields);

  function walk(node: WhereClause): WhereClause {
    const result: WhereClause = {};

    for (const [key, value] of Object.entries(node)) {
      const upperKey = key.toUpperCase();
      if (upperKey === 'AND' || upperKey === 'OR') {
        if (Array.isArray(value)) {
          const processed = value.map(v => walk(v)).filter(v => Object.keys(v).length > 0);
          if (processed.length > 0) {
            result[upperKey as 'AND' | 'OR'] = processed;
          }
        }
        continue;
      }

      // It's a field condition
      if (key === 'id') {
        result[key] = value;
        continue;
      }
      const fieldDef = fieldMap.get(key);

      if (!fieldDef) continue; // Field doesn't exist
      if (fieldDef.admin?.filterable === false) continue; // Explicitly opted out
      if (NEVER_FILTERABLE_TYPES.includes(fieldDef.type)) continue; // Never filterable type

      // Keep the field
      result[key] = value;
    }

    return result;
  }

  return walk(where);
}
