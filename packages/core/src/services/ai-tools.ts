import { tool } from 'ai';
import { z } from 'zod';
import type { DatabaseAdapter, DyrectedConfig, AuthenticatedUser } from '../types/index.js';
import type {
  AIToolContext,
  CollectionSummaryResult,
  GlobalSummaryResult,
  AIAction,
} from '../types/ai.js';
import { isAICollection, AI_ACTIONS_COLLECTION } from '../types/ai.js';
import { isAccessAllowed } from '../auth/access.js';
import { RAGService } from './rag/rag.service.js';

function generateActionId(): string {
  return `act_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 9)}`;
}

function validatePayloadAgainstFields(
  fields: Array<{ name: string; type: string; required?: boolean }>,
  data: Record<string, unknown>,
  isPartial = false
): { valid: boolean; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Payload must be a non-null object.' };
  }

  for (const field of fields) {
    const val = data[field.name];

    // Check required
    if (!isPartial && field.required && (val === undefined || val === null || val === '')) {
      return { valid: false, error: `Required field "${field.name}" is missing or empty.` };
    }

    // Type sanity check if present
    if (val !== undefined && val !== null) {
      if (field.type === 'number' && typeof val !== 'number') {
        const num = Number(val);
        if (isNaN(num)) {
          return { valid: false, error: `Field "${field.name}" expects a numeric value, received "${val}".` };
        }
      } else if (field.type === 'checkbox' && typeof val !== 'boolean') {
        if (val !== 'true' && val !== 'false') {
          return { valid: false, error: `Field "${field.name}" expects a boolean value.` };
        }
      }
    }
  }

  return { valid: true };
}

function withTimeout<T>(promise: Promise<T>, timeoutMs = 10000, toolName = 'tool'): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Tool "${toolName}" timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

function getAvailableCollectionSlugs(config: DyrectedConfig): string {
  return (config.collections || [])
    .filter((c) => !isAICollection(c.slug) && !c.slug.startsWith('_'))
    .map((c) => c.slug)
    .join(', ');
}

function getAvailableGlobalSlugs(config: DyrectedConfig): string {
  return (config.globals || []).map((g) => g.slug).join(', ');
}

export function createDyrectedAITools({
  db,
  config,
  user,
  projectId,
}: {
  db: DatabaseAdapter;
  config: DyrectedConfig;
  user?: AuthenticatedUser;
  projectId: string;
}): Record<string, any> {
  const context: AIToolContext = { db, user, projectId, config };

  const builtInTools = {
    listCollections: tool({
      description: 'List all content collections available in this Dyrected CMS project',
      inputSchema: z.object({}),
      execute: async () => {
        return withTimeout(
          (async () => {
            const collections: CollectionSummaryResult[] = (config.collections || [])
              .filter((col) => !isAICollection(col.slug) && !col.slug.startsWith('_'))
              .map((col) => ({
                slug: col.slug,
                label: col.labels?.singular || col.labels?.plural || col.slug,
                auth: !!col.auth,
                timestamps: col.timestamps !== false,
              }));
            return { collections };
          })(),
          10000,
          'listCollections'
        );
      },
    }),

    getCollectionSchema: tool({
      description: 'Get detailed field definitions, relations, and validation rules for a specific collection',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection to inspect'),
      }),
      execute: async ({
        collection,
      }: {
        collection: string;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is private or internal.`,
                suggestion: `Choose from available public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found in project.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}]. Please re-try with a valid collection.`,
                recoverable: true,
              };
            }

            const fields =
              col.fields?.map((f: any) => ({
                name: f.name,
                type: f.type,
                label: f.label,
                required: !!f.required,
                unique: !!f.unique,
                relationTo: f.relationTo,
                options: f.options,
              })) || [];

            return {
              slug: col.slug,
              label: col.labels?.singular || col.labels?.plural || col.slug,
              auth: !!col.auth,
              fields,
            };
          })(),
          10000,
          'getCollectionSchema'
        );
      },
    }),

    listGlobals: tool({
      description: 'List all singleton global configurations (e.g. site-settings, navigation, homepage) in this project',
      inputSchema: z.object({}),
      execute: async () => {
        return withTimeout(
          (async () => {
            const globals: GlobalSummaryResult[] = (config.globals || []).map((g) => ({
              slug: g.slug,
              label: g.label || g.slug,
            }));
            return { globals };
          })(),
          10000,
          'listGlobals'
        );
      },
    }),

    getGlobalSchema: tool({
      description: 'Get schema and current saved values for a singleton global configuration',
      inputSchema: z.object({
        global: z.string().describe('Slug of the global configuration (e.g. "homepage", "site-settings")'),
      }),
      execute: async ({
        global: globalSlug,
      }: {
        global: string;
      }) => {
        return withTimeout(
          (async () => {
            const g = config.globals?.find((item) => item.slug === globalSlug);
            if (!g) {
              return {
                error: `Global "${globalSlug}" not found.`,
                suggestion: `Available globals in this project are: [${getAvailableGlobalSlugs(config)}].`,
                recoverable: true,
              };
            }

            let data: Record<string, unknown> | null = null;
            try {
              data = await db.getGlobal({ slug: globalSlug });
            } catch {
              // ignore if getGlobal returns null
            }

            const fields =
              g.fields?.map((f: any) => ({
                name: f.name,
                type: f.type,
                label: f.label,
                required: !!f.required,
              })) || [];

            return {
              slug: g.slug,
              label: g.label || g.slug,
              fields,
              data,
            };
          })(),
          10000,
          'getGlobalSchema'
        );
      },
    }),

    queryCollection: tool({
      description:
        'Query structured records from a collection using exact field filters, sorting, and pagination. Use this tool for finding documents with specific statuses, categories, date ranges, or numeric thresholds (e.g. price > 50000, status == "published"). Do NOT use this tool for open-ended conceptual or semantic questions.',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection to query (e.g. "articles", "products", "services")'),
        where: z
          .record(z.string(), z.any())
          .optional()
          .describe('Filter criteria object (e.g. { "status": "published", "price": { "greater_than": 50000 } })'),
        sort: z.string().optional().describe('Field to sort by (prefix with "-" for descending, e.g. "-createdAt")'),
        limit: z.number().min(1).max(50).optional().default(10).describe('Maximum documents to return (1-50)'),
        page: z.number().min(1).optional().default(1).describe('Page number for pagination'),
      }),
      execute: async ({
        collection,
        where,
        sort,
        limit = 10,
        page = 1,
      }: {
        collection: string;
        where?: Record<string, any>;
        sort?: string;
        limit?: number;
        page?: number;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is private or internal.`,
                suggestion: `Query public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" does not exist in this project.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}]. Use getCollectionSchema() to inspect valid fields.`,
                recoverable: true,
              };
            }

            // Access check
            const canRead = await isAccessAllowed(config, col.access?.read, {
              req: { user, siteId: projectId } as any,
              user,
            });
            if (!canRead) {
              return {
                error: `Access denied: user lacks read permission for collection "${collection}".`,
                recoverable: false,
              };
            }

            try {
              const result = await db.find({
                collection,
                where: where || {},
                sort,
                limit,
                page,
              });

              // Redact sensitive password/salt fields if auth collection
              const sanitizedDocs = (result.docs || []).map((doc: any) => {
                const copy = { ...doc };
                delete copy.password;
                delete copy.salt;
                delete copy.hash;
                delete copy.resetPasswordToken;
                return copy;
              });

              return {
                collection,
                docs: sanitizedDocs,
                total: result.total ?? sanitizedDocs.length,
                totalPages: result.totalPages ?? 1,
                page: result.page ?? page,
                limit: result.limit ?? limit,
              };
            } catch (err: any) {
              return {
                error: `Failed to query collection "${collection}": ${err.message}`,
                suggestion: 'Verify field names match the collection schema using getCollectionSchema().',
                recoverable: true,
              };
            }
          })(),
          10000,
          'queryCollection'
        );
      },
    }),

    getDocument: tool({
      description: 'Retrieve a single full document by its ID from a collection',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection'),
        id: z.string().describe('Primary key ID of the document'),
      }),
      execute: async ({
        collection,
        id,
      }: {
        collection: string;
        id: string;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is private or internal.`,
                suggestion: `Retrieve documents from public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}].`,
                recoverable: true,
              };
            }

            // Access check
            const canRead = await isAccessAllowed(config, col.access?.read, {
              req: { user, siteId: projectId } as any,
              user,
            });
            if (!canRead) {
              return {
                error: `Access denied: you do not have permission to read document "${id}" in "${collection}".`,
                recoverable: false,
              };
            }

            try {
              const doc = await db.findOne({
                collection,
                id,
              });

              if (!doc) {
                return {
                  error: `Document "${id}" not found in collection "${collection}".`,
                  suggestion: `Check available IDs using queryCollection("${collection}").`,
                  recoverable: true,
                };
              }

              const copy = { ...doc };
              delete copy.password;
              delete copy.salt;
              delete copy.hash;
              delete copy.resetPasswordToken;

              return { collection, doc: copy };
            } catch (err: any) {
              return {
                error: `Failed to fetch document "${id}": ${err.message}`,
                recoverable: true,
              };
            }
          })(),
          10000,
          'getDocument'
        );
      },
    }),

    aggregateCollection: tool({
      description:
        'Compute mathematical aggregates and summary statistics over a collection (e.g. count, sum, average, min, max, groupBy). Use this tool whenever the user asks "how many...", "what is the total...", "average price of...", or asks for counts grouped by status/category. Do NOT use semantic search for counting.',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection to aggregate'),
        aggregates: z
          .record(
            z.string(),
            z.object({
              count: z.literal('*').optional(),
              countDistinct: z.string().optional(),
              distinct: z.string().optional(),
              sum: z.string().optional(),
              avg: z.string().optional(),
              min: z.string().optional(),
              max: z.string().optional(),
              cast: z.enum(['number', 'integer', 'float', 'string', 'boolean', 'date']).optional(),
              where: z.record(z.string(), z.any()).optional(),
            })
          )
          .describe('Named aggregate operations to calculate (e.g. { "totalCount": { "count": "*" } })'),
        groupBy: z.string().optional().describe('Optional field name to group results by (e.g. "status", "category")'),
      }),
      execute: async ({
        collection,
        aggregates,
        groupBy,
      }: {
        collection: string;
        aggregates: Record<string, any>;
        groupBy?: string;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is private or internal.`,
                suggestion: `Aggregate public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}].`,
                recoverable: true,
              };
            }

            // Access check
            const canRead = await isAccessAllowed(config, col.access?.read, {
              req: { user, siteId: projectId } as any,
              user,
            });
            if (!canRead) {
              return {
                error: `Access denied: you do not have permission to aggregate collection "${collection}".`,
                recoverable: false,
              };
            }

            try {
              const result = await db.aggregate({
                collection,
                aggregates,
                groupBy,
              });

              return { collection, result };
            } catch (err: any) {
              return {
                error: `Failed to compute aggregates on "${collection}": ${err.message}`,
                suggestion: 'Verify field names match schema with getCollectionSchema().',
                recoverable: true,
              };
            }
          })(),
          10000,
          'aggregateCollection'
        );
      },
    }),

    searchContent: tool({
      description:
        'Perform semantic vector search across unstructured text, articles, documentation, FAQs, guides, policies, and rich-text fields. Use this tool for open-ended questions, concepts, thematic topics, explanations, and qualitative inquiries (e.g. "what is our policy on refunds?", "how do we handle chargebacks?"). Do NOT use this tool for exact counts or strict numeric filtering.',
      inputSchema: z.object({
        query: z.string().describe('The natural language semantic search query or topic to look up'),
        collections: z
          .array(z.string())
          .optional()
          .describe('Optional collection slugs to restrict search scope to (e.g. ["articles", "faqs"])'),
        limit: z
          .number()
          .min(1)
          .max(10)
          .optional()
          .default(4)
          .describe('Number of top relevant snippets to return (1-10)'),
        minScore: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .default(0.45)
          .describe('Minimum cosine similarity cutoff threshold (0.0 to 1.0)'),
      }),
      execute: async ({
        query,
        collections,
        limit = 4,
        minScore = 0.45,
      }: {
        query: string;
        collections?: string[];
        limit?: number;
        minScore?: number;
      }) => {
        return withTimeout(
          (async () => {
            try {
              const result = await RAGService.search({
                db,
                config,
                query,
                projectId,
                collections,
                limit,
                minScore,
                user,
              });

              return result;
            } catch (err: any) {
              return {
                query,
                resultsCount: 0,
                sources: [],
                error: `Semantic search failed: ${err.message}`,
                recoverable: true,
              };
            }
          })(),
          10000,
          'searchContent'
        );
      },
    }),

    // Day 5: Human-in-the-Loop Mutation Proposal Tools
    proposeCreateDocument: tool({
      description:
        'Propose creating a new document in a collection. Does NOT write to the database immediately; creates a proposal requiring human approval in the chat UI.',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the target collection'),
        data: z.record(z.string(), z.any()).describe('Key-value object containing the document fields to create'),
        summary: z.string().describe('Clear 1-sentence summary of the new document being created'),
      }),
      execute: async ({
        collection,
        data,
        summary,
      }: {
        collection: string;
        data: Record<string, any>;
        summary: string;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is internal and cannot be modified.`,
                suggestion: `Target public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found in project.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}].`,
                recoverable: true,
              };
            }

            // Access check: create permission
            const canCreate = await isAccessAllowed(config, col.access?.create, {
              req: { user, siteId: projectId } as any,
              user,
              data,
            });
            if (!canCreate) {
              return {
                error: `Access denied: you do not have permission to create records in "${collection}".`,
                recoverable: false,
              };
            }

            // Dry-run field schema validation
            const fields = col.fields?.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required })) || [];
            const validation = validatePayloadAgainstFields(fields, data, false);
            if (!validation.valid) {
              return {
                error: `Schema validation failed: ${validation.error}`,
                suggestion: `Check collection schema with getCollectionSchema("${collection}").`,
                recoverable: true,
              };
            }

            const actionId = generateActionId();
            const actionRecord: AIAction = {
              id: actionId,
              projectId,
              userId: user?.id ? String(user.id) : undefined,
              type: 'createDocument',
              targetCollection: collection,
              summary,
              beforeSnapshot: null,
              proposedData: data,
              status: 'pending',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000), // 30 mins
              createdAt: new Date(),
            };

            try {
              await db.create({
                collection: AI_ACTIONS_COLLECTION,
                data: actionRecord,
              });
            } catch (err: any) {
              return {
                error: `Failed to persist action proposal: ${err.message}`,
                recoverable: true,
              };
            }

            return {
              actionId,
              type: 'createDocument',
              collection,
              summary,
              proposedData: data,
              status: 'pending',
              requiresApproval: true,
            };
          })(),
          10000,
          'proposeCreateDocument'
        );
      },
    }),

    proposeUpdateDocument: tool({
      description:
        'Propose updating specific fields on an existing document in a collection. Does NOT modify the database immediately; creates a proposal requiring human approval in the chat UI.',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the target collection'),
        id: z.string().describe('Primary key ID of the document to update'),
        data: z.record(z.string(), z.any()).describe('Key-value object containing the fields to update'),
        summary: z.string().describe('Clear 1-sentence summary of the changes being proposed'),
      }),
      execute: async ({
        collection,
        id,
        data,
        summary,
      }: {
        collection: string;
        id: string;
        data: Record<string, any>;
        summary: string;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is internal and cannot be modified.`,
                suggestion: `Target public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found in project.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}].`,
                recoverable: true,
              };
            }

            // Fetch current document state for snapshot & access verification
            const existingDoc = await db.findOne({ collection, id });
            if (!existingDoc) {
              return {
                error: `Document "${id}" not found in collection "${collection}".`,
                suggestion: `Search existing records first with queryCollection("${collection}").`,
                recoverable: true,
              };
            }

            // Access check: update permission
            const canUpdate = await isAccessAllowed(config, col.access?.update, {
              req: { user, siteId: projectId } as any,
              user,
              data,
              doc: existingDoc,
            });
            if (!canUpdate) {
              return {
                error: `Access denied: you do not have permission to update document "${id}" in "${collection}".`,
                recoverable: false,
              };
            }

            // Dry-run field schema validation (partial)
            const fields = col.fields?.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required })) || [];
            const validation = validatePayloadAgainstFields(fields, data, true);
            if (!validation.valid) {
              return {
                error: `Schema validation failed: ${validation.error}`,
                suggestion: `Check collection schema with getCollectionSchema("${collection}").`,
                recoverable: true,
              };
            }

            const actionId = generateActionId();
            const actionRecord: AIAction = {
              id: actionId,
              projectId,
              userId: user?.id ? String(user.id) : undefined,
              type: 'updateDocument',
              targetCollection: collection,
              documentId: id,
              summary,
              beforeSnapshot: existingDoc,
              proposedData: data,
              status: 'pending',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              createdAt: new Date(),
            };

            try {
              await db.create({
                collection: AI_ACTIONS_COLLECTION,
                data: actionRecord,
              });
            } catch (err: any) {
              return {
                error: `Failed to persist action proposal: ${err.message}`,
                recoverable: true,
              };
            }

            return {
              actionId,
              type: 'updateDocument',
              collection,
              documentId: id,
              summary,
              beforeSnapshot: existingDoc,
              proposedData: data,
              status: 'pending',
              requiresApproval: true,
            };
          })(),
          10000,
          'proposeUpdateDocument'
        );
      },
    }),

    proposeDeleteDocument: tool({
      description:
        'Propose deleting an existing document from a collection. Does NOT delete from the database immediately; creates a proposal requiring human approval in the chat UI.',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the target collection'),
        id: z.string().describe('Primary key ID of the document to delete'),
        summary: z.string().describe('Clear explanation of why this document should be deleted'),
        permanent: z.boolean().optional().default(false).describe('Whether this is a permanent deletion'),
      }),
      execute: async ({
        collection,
        id,
        summary,
        permanent = false,
      }: {
        collection: string;
        id: string;
        summary: string;
        permanent?: boolean;
      }) => {
        return withTimeout(
          (async () => {
            if (isAICollection(collection) || collection.startsWith('_')) {
              return {
                error: `Collection "${collection}" is internal and cannot be deleted.`,
                suggestion: `Target public collections: [${getAvailableCollectionSlugs(config)}]`,
                recoverable: true,
              };
            }
            const col = config.collections?.find((c) => c.slug === collection);
            if (!col) {
              return {
                error: `Collection "${collection}" not found.`,
                suggestion: `Available collections are: [${getAvailableCollectionSlugs(config)}].`,
                recoverable: true,
              };
            }

            const existingDoc = await db.findOne({ collection, id });
            if (!existingDoc) {
              return {
                error: `Document "${id}" not found in collection "${collection}".`,
                suggestion: `Search existing records with queryCollection("${collection}").`,
                recoverable: true,
              };
            }

            // Access check: delete permission
            const canDelete = await isAccessAllowed(config, col.access?.delete, {
              req: { user, siteId: projectId } as any,
              user,
              doc: existingDoc,
            });
            if (!canDelete) {
              return {
                error: `Access denied: you do not have permission to delete document "${id}" in "${collection}".`,
                recoverable: false,
              };
            }

            const actionId = generateActionId();
            const actionRecord: AIAction = {
              id: actionId,
              projectId,
              userId: user?.id ? String(user.id) : undefined,
              type: 'deleteDocument',
              targetCollection: collection,
              documentId: id,
              summary,
              beforeSnapshot: existingDoc,
              proposedData: { permanent },
              status: 'pending',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              createdAt: new Date(),
            };

            try {
              await db.create({
                collection: AI_ACTIONS_COLLECTION,
                data: actionRecord,
              });
            } catch (err: any) {
              return {
                error: `Failed to persist action proposal: ${err.message}`,
                recoverable: true,
              };
            }

            return {
              actionId,
              type: 'deleteDocument',
              collection,
              documentId: id,
              summary,
              beforeSnapshot: existingDoc,
              proposedData: { permanent },
              status: 'pending',
              requiresApproval: true,
            };
          })(),
          10000,
          'proposeDeleteDocument'
        );
      },
    }),

    proposeUpdateGlobal: tool({
      description:
        'Propose modifying singleton global settings (e.g. site-settings, navigation, homepage). Does NOT modify the database immediately; creates a proposal requiring human approval in the chat UI.',
      inputSchema: z.object({
        global: z.string().describe('Slug of the global configuration (e.g. "homepage", "site-settings")'),
        data: z.record(z.string(), z.any()).describe('Key-value object containing the fields to update'),
        summary: z.string().describe('Clear 1-sentence summary of why these global settings are being updated'),
      }),
      execute: async ({
        global: globalSlug,
        data,
        summary,
      }: {
        global: string;
        data: Record<string, any>;
        summary: string;
      }) => {
        return withTimeout(
          (async () => {
            const g = config.globals?.find((item) => item.slug === globalSlug);
            if (!g) {
              return {
                error: `Global "${globalSlug}" not found.`,
                suggestion: `Available globals in this project are: [${getAvailableGlobalSlugs(config)}].`,
                recoverable: true,
              };
            }

            // Fetch current global snapshot
            let existingGlobal: Record<string, unknown> | null = null;
            try {
              existingGlobal = await db.getGlobal({ slug: globalSlug });
            } catch {
              // ignore
            }

            // Dry-run field validation
            const fields = g.fields?.map((f: any) => ({ name: f.name, type: f.type, required: !!f.required })) || [];
            const validation = validatePayloadAgainstFields(fields, data, true);
            if (!validation.valid) {
              return {
                error: `Schema validation failed: ${validation.error}`,
                suggestion: `Inspect global fields with getGlobalSchema("${globalSlug}").`,
                recoverable: true,
              };
            }

            const actionId = generateActionId();
            const actionRecord: AIAction = {
              id: actionId,
              projectId,
              userId: user?.id ? String(user.id) : undefined,
              type: 'updateGlobal',
              targetGlobal: globalSlug,
              summary,
              beforeSnapshot: existingGlobal,
              proposedData: data,
              status: 'pending',
              expiresAt: new Date(Date.now() + 30 * 60 * 1000),
              createdAt: new Date(),
            };

            try {
              await db.create({
                collection: AI_ACTIONS_COLLECTION,
                data: actionRecord,
              });
            } catch (err: any) {
              return {
                error: `Failed to persist action proposal: ${err.message}`,
                recoverable: true,
              };
            }

            return {
              actionId,
              type: 'updateGlobal',
              global: globalSlug,
              summary,
              beforeSnapshot: existingGlobal,
              proposedData: data,
              status: 'pending',
              requiresApproval: true,
            };
          })(),
          10000,
          'proposeUpdateGlobal'
        );
      },
    }),
  };

  // Convert custom developer tools if provided in config.ai.tools
  const customTools: Record<string, any> = {};
  if (config.ai?.tools) {
    for (const [toolName, toolDef] of Object.entries(config.ai.tools)) {
      const schema = toolDef.inputSchema || toolDef.parameters || z.object({});
      customTools[toolName] = tool({
        description: toolDef.description,
        inputSchema: schema,
        execute: async (args: any) => {
          return withTimeout(
            Promise.resolve(toolDef.execute(args, context)),
            10000,
            toolName
          );
        },
      });
    }
  }

  return {
    ...builtInTools,
    ...customTools,
  };
}
