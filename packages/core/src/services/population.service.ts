import type { CollectionConfig, DatabaseAdapter, Field, PaginatedResult } from '../types/index.js';

export class PopulationService {
  private db: DatabaseAdapter;
  private collections: CollectionConfig[];

  constructor(db: DatabaseAdapter, collections: CollectionConfig[]) {
    this.db = db;
    this.collections = collections;
  }

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
      if ((field.type as string) === 'join') continue;
      if ((field.type as string) === 'row' && field.fields) {
        const rowPopulated = await this.populate({ data, fields: field.fields, currentDepth, maxDepth });
        Object.assign(populatedDoc, rowPopulated);
        continue;
      }
      if (!field.name) continue;
      const value = populatedDoc[field.name];

      // Handle Relationship Fields
      if (field.type === 'relationship' && field.relationTo && value) {
        const relatedCollection = this.collections.find(c => c.slug === field.relationTo);
        if (!relatedCollection) continue;

        if (Array.isArray(value)) {
          // Multi-relationship
          populatedDoc[field.name] = await Promise.all(
            value.map(async (id: any) => {
              if (!id) return id;
              
              let doc = id;
              if (typeof id === 'string') {
                doc = await this.db.findOne({ collection: field.relationTo!, id });
              }
              
              if (!doc || typeof doc !== 'object') return id;

              return this.populate({
                data: doc,
                fields: relatedCollection.fields,
                currentDepth: currentDepth + 1,
                maxDepth,
              });
            })
          );
        } else if (value) {
          // Single relationship
          let doc = value;
          if (typeof value === 'string') {
            doc = await this.db.findOne({ collection: field.relationTo, id: value });
          }

          if (doc && typeof doc === 'object') {
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

      // Handle Blocks
      if (field.type === 'blocks' && field.blocks && Array.isArray(value)) {
        populatedDoc[field.name] = await Promise.all(
          value.map(async (blockData: any) => {
            const blockConfig = field.blocks!.find(b => b.slug === blockData.blockType);
            if (!blockConfig) return blockData;
            return this.populate({
              data: blockData,
              fields: blockConfig.fields,
              currentDepth,
              maxDepth,
            });
          })
        );
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
