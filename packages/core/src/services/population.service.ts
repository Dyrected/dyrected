import { CollectionConfig, DatabaseAdapter, Field, PaginatedResult } from '../types/index.js';

export class PopulationService {
  constructor(private db: DatabaseAdapter, private collections: CollectionConfig[]) {}

  /**
   * Recursively populate relationship fields in a document or array of documents.
   */
  async populate(args: {
    data: any;
    fields: Field[];
    currentDepth: number;
    maxDepth: number;
  }): Promise<any> {
    const { data, fields, currentDepth, maxDepth } = args;

    if (currentDepth >= maxDepth || !data) {
      return data;
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.populate({ ...args, data: item })));
    }

    const populatedDoc = { ...data };

    for (const field of fields) {
      const value = populatedDoc[field.name];

      // Handle Relationship Fields
      if (field.type === 'relationship' && field.relationTo && value) {
        const relatedCollection = this.collections.find(c => c.slug === field.relationTo);
        if (!relatedCollection) continue;

        if (Array.isArray(value)) {
          // Multi-relationship
          populatedDoc[field.name] = await Promise.all(
            value.map(async (id: string) => {
              const doc = await this.db.findOne({ collection: field.relationTo!, id });
              if (!doc) return id;
              return this.populate({
                data: doc,
                fields: relatedCollection.fields,
                currentDepth: currentDepth + 1,
                maxDepth,
              });
            })
          );
        } else if (typeof value === 'string') {
          // Single relationship
          const doc = await this.db.findOne({ collection: field.relationTo, id: value });
          if (doc) {
            populatedDoc[field.name] = await this.populate({
              data: doc,
              fields: relatedCollection.fields,
              currentDepth: currentDepth + 1,
              maxDepth,
            });
          }
        }
      }

      // Handle Nested Fields (Arrays/Objects)
      if ((field.type === 'array' || field.type === 'object') && field.fields && value) {
        populatedDoc[field.name] = await this.populate({
          data: value,
          fields: field.fields,
          currentDepth, // Nested fields don't consume depth, only relationships do
          maxDepth,
        });
      }
    }

    return populatedDoc;
  }

  /**
   * Helper to populate a PaginatedResult
   */
  async populateResult(result: PaginatedResult, fields: Field[], maxDepth: number): Promise<PaginatedResult> {
    if (maxDepth <= 0) return result;
    
    const populatedDocs = await this.populate({
      data: result.docs,
      fields,
      currentDepth: 0,
      maxDepth
    });

    return {
      ...result,
      docs: populatedDocs
    };
  }
}
