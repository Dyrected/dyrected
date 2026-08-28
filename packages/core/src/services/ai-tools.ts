import { tool } from 'ai';
import { z } from 'zod';
import type { DatabaseAdapter, DyrectedConfig, AuthenticatedUser } from '../types/index.js';
import type {
  AIToolContext,
  CollectionSummaryResult,
  CollectionSchemaResult,
  GlobalSummaryResult,
  GlobalSchemaResult,
  QueryCollectionResult,
  GetDocumentResult,
  AggregateCollectionResult,
} from '../types/ai.js';
import { isAICollection } from '../types/ai.js';
import { isAccessAllowed } from '../auth/access.js';
import { RAGService } from './rag/rag.service.js';

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
      execute: async (): Promise<{ collections: CollectionSummaryResult[] }> => {
        const collections: CollectionSummaryResult[] = (config.collections || [])
          .filter((col) => !isAICollection(col.slug) && !col.slug.startsWith('_'))
          .map((col) => ({
            slug: col.slug,
            label: col.labels?.singular || col.labels?.plural || col.slug,
            auth: !!col.auth,
            timestamps: col.timestamps !== false,
          }));
        return { collections };
      },
    }),

    getCollectionSchema: tool({
      description: 'Get detailed field definitions and schema for a specific collection',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection to inspect'),
      }),
      execute: async ({
        collection,
      }: {
        collection: string;
      }): Promise<CollectionSchemaResult | { error: string }> => {
        if (isAICollection(collection) || collection.startsWith('_')) {
          return { error: `Collection "${collection}" is private or internal.` };
        }
        const col = config.collections?.find((c) => c.slug === collection);
        if (!col) {
          return { error: `Collection "${collection}" not found.` };
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
      },
    }),

    listGlobals: tool({
      description: 'List all singleton global configurations (e.g. site-settings, navigation) in this project',
      inputSchema: z.object({}),
      execute: async (): Promise<{ globals: GlobalSummaryResult[] }> => {
        const globals: GlobalSummaryResult[] = (config.globals || []).map((g) => ({
          slug: g.slug,
          label: g.label || g.slug,
        }));
        return { globals };
      },
    }),

    getGlobalSchema: tool({
      description: 'Get schema and saved values for a singleton global configuration',
      inputSchema: z.object({
        global: z.string().describe('Slug of the global configuration'),
      }),
      execute: async ({
        global: globalSlug,
      }: {
        global: string;
      }): Promise<GlobalSchemaResult | { error: string }> => {
        const g = config.globals?.find((item) => item.slug === globalSlug);
        if (!g) {
          return { error: `Global "${globalSlug}" not found.` };
        }

        let data: Record<string, unknown> | null = null;
        try {
          data = await db.getGlobal({ slug: globalSlug });
        } catch {
          // ignore if getGlobal is not supported or returns null
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
      },
    }),

    queryCollection: tool({
      description: 'Query and search documents from a content collection with filters, pagination, and sorting',
      inputSchema: z.object({
        collection: z.string().describe('Slug of the collection to query'),
        where: z.record(z.string(), z.any()).optional().describe('Filter criteria object'),
        sort: z.string().optional().describe('Sort field (prefix with "-" for descending)'),
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
      }): Promise<QueryCollectionResult | { error: string }> => {
        if (isAICollection(collection) || collection.startsWith('_')) {
          return { error: `Collection "${collection}" is private or internal.` };
        }
        const col = config.collections?.find((c) => c.slug === collection);
        if (!col) {
          return { error: `Collection "${collection}" not found.` };
        }

        // Access check
        const canRead = await isAccessAllowed(config, col.access?.read, {
          req: { user, siteId: projectId } as any,
          user,
        });
        if (!canRead) {
          return { error: `Access denied: you do not have permission to read collection "${collection}".` };
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
          return { error: `Failed to query collection "${collection}": ${err.message}` };
        }
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
      }): Promise<GetDocumentResult | { error: string }> => {
        if (isAICollection(collection) || collection.startsWith('_')) {
          return { error: `Collection "${collection}" is private or internal.` };
        }
        const col = config.collections?.find((c) => c.slug === collection);
        if (!col) {
          return { error: `Collection "${collection}" not found.` };
        }

        // Access check
        const canRead = await isAccessAllowed(config, col.access?.read, {
          req: { user, siteId: projectId } as any,
          user,
        });
        if (!canRead) {
          return { error: `Access denied: you do not have permission to read document "${id}" in "${collection}".` };
        }

        try {
          const doc = await db.findOne({
            collection,
            id,
          });

          if (!doc) {
            return { error: `Document "${id}" not found in collection "${collection}".` };
          }

          const copy = { ...doc };
          delete copy.password;
          delete copy.salt;
          delete copy.hash;
          delete copy.resetPasswordToken;

          return { collection, doc: copy };
        } catch (err: any) {
          return { error: `Failed to fetch document "${id}": ${err.message}` };
        }
      },
    }),

    aggregateCollection: tool({
      description: 'Compute statistical metrics (count, sum, average, min, max, distinct values, and groupBy) on collection fields',
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
          .describe('Named aggregate operations to calculate'),
        groupBy: z.string().optional().describe('Optional field name to group results by'),
      }),
      execute: async ({
        collection,
        aggregates,
        groupBy,
      }: {
        collection: string;
        aggregates: Record<string, any>;
        groupBy?: string;
      }): Promise<AggregateCollectionResult | { error: string }> => {
        if (isAICollection(collection) || collection.startsWith('_')) {
          return { error: `Collection "${collection}" is private or internal.` };
        }
        const col = config.collections?.find((c) => c.slug === collection);
        if (!col) {
          return { error: `Collection "${collection}" not found.` };
        }

        // Access check
        const canRead = await isAccessAllowed(config, col.access?.read, {
          req: { user, siteId: projectId } as any,
          user,
        });
        if (!canRead) {
          return { error: `Access denied: you do not have permission to aggregate collection "${collection}".` };
        }

        try {
          const result = await db.aggregate({
            collection,
            aggregates,
            groupBy,
          });

          return { collection, result };
        } catch (err: any) {
          return { error: `Failed to compute aggregates on "${collection}": ${err.message}` };
        }
      },
    }),

    searchContent: tool({
      description:
        'Semantically search unstructured Dyrected CMS content (articles, documentation, FAQs, guides, policies, materials, pages) for relevant context, facts, and answers.',
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
          };
        }
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
          return toolDef.execute(args, context);
        },
      });
    }
  }

  return {
    ...builtInTools,
    ...customTools,
  };
}
