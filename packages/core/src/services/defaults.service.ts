import type { Field } from '../types/index.js';

export class DefaultsService {
  /**
   * Recursively apply default values to a data object based on field definitions.
   */
  static apply(fields: Field[], data: any = {}): any {
    const result = { ...(data || {}) };

    fields.forEach((field) => {
      if ((field.type as string) === 'join') return;
      if ((field.type as string) === 'row' && field.fields) {
        Object.assign(result, this.apply(field.fields, data));
        return;
      }
      if (!field.name) return;
      let value = result[field.name];
      
      // If value is missing, check if it was renamed (migration support)
      if ((value === undefined || value === null) && field.renameTo) {
        const legacyValue = result[field.renameTo];
        if (legacyValue !== undefined && legacyValue !== null) {
          value = legacyValue;
          result[field.name] = legacyValue;
        }
      }

      // If value is missing or null, apply defaultValue
      if (value === undefined || value === null) {
        if (field.defaultValue !== undefined) {
          result[field.name] = field.defaultValue;
        } else {
          // Fallback to type-specific defaults if no defaultValue is provided
          if (field.type === 'boolean') result[field.name] = false;
          else if (field.type === 'array') result[field.name] = [];
          else if (field.type === 'multiSelect') result[field.name] = [];
          else if (field.type === 'object') {
            result[field.name] = this.apply(field.fields || [], {});
          }
        }
      } else if (field.type === 'object' && field.fields) {
        // Recursively apply to existing object
        result[field.name] = this.apply(field.fields, value);
      } else if (field.type === 'array' && field.fields && Array.isArray(value)) {
        // Recursively apply to items in array
        result[field.name] = value.map((item) => this.apply(field.fields!, item));
      }
    });

    return result;
  }
}
