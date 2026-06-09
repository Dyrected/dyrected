import type { CollectionConfig, DatabaseAdapter, Field, PaginatedResult } from '../types/index.js';
import { DefaultsService } from './defaults.service.js';

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
    currentDepth?: number;
    maxDepth?: number;
  }): Promise<any> {
    const { data, fields, currentDepth = 0, maxDepth = 10 } = args;

    if (currentDepth >= maxDepth || !data) {
      return data;
    }

    if (Array.isArray(data)) {
      return Promise.all(data.map(item => this.populate({ ...args, data: item })));
    }

    const populatedDoc = { ...data };

    for (const field of fields) {
      // Handle Join Fields - only populate at top level (depth 0) to prevent infinite recursion
      if ((field.type as string) === 'join' && field.collection && field.on && currentDepth === 0) {
        const targetCollection = this.collections.find(c => c.slug === field.collection);
        if (targetCollection) {
          const docId = populatedDoc.id;
          if (docId) {
            const where = { [field.on]: { equals: docId } };
            const joinLimit = field.limit ?? 10;
            const result = await this.db.find({
              collection: field.collection,
              where,
              limit: joinLimit,
            });
            
            // Apply defaults and populate the joined documents (depth 1, so joins inside are skipped)
            const populatedDocs = await this.populate({
              data: result.docs.map(doc => DefaultsService.apply(targetCollection.fields, doc)),
              fields: targetCollection.fields,
              currentDepth: 1,
              maxDepth,
            });

            populatedDoc[field.name!] = {
              docs: populatedDocs,
              hasNextPage: result.page * result.limit < result.total,
              totalDocs: result.total,
            };
          }
        }
        continue;
      }

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

              const docWithDefaults = DefaultsService.apply(relatedCollection.fields, doc);
              return this.populate({
                data: docWithDefaults,
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
            const docWithDefaults = DefaultsService.apply(relatedCollection.fields, doc);
            populatedDoc[field.name] = await this.populate({
              data: docWithDefaults,
              fields: relatedCollection.fields,
              currentDepth: currentDepth + 1,
              maxDepth,
            });
          }
        }
      }

      // Handle URL Fields with internal relationships
      if (field.type === 'url' && value && typeof value === 'object' && value.type === 'internal' && value.relationTo && value.value) {
        const relatedCollection = this.collections.find(c => c.slug === value.relationTo);
        if (relatedCollection) {
          const doc = await this.db.findOne({ collection: value.relationTo, id: value.value });
          if (doc && typeof doc === 'object') {
            const docWithDefaults = DefaultsService.apply(relatedCollection.fields, doc);
            const populatedDocValue = await this.populate({
              data: docWithDefaults,
              fields: relatedCollection.fields,
              currentDepth: currentDepth + 1,
              maxDepth,
            });
            const identifier = docWithDefaults.slug || docWithDefaults.id;
            const resolvedUrl = `/collections/${value.relationTo}/${identifier}`;
            populatedDoc[field.name] = {
              ...value,
              url: resolvedUrl,
              doc: populatedDocValue,
            };
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
