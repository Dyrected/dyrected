import type { Context } from "hono";
import type { DyrectedContext } from "../app.js";
import type { CollectionConfig, DatabaseAdapter, PaginatedResult } from "../types/index.js";
import {
  mergeWhereConstraint,
  resolveCollectionAccess,
  toHookRequestContext,
} from "../utils/access-control.js";

type AuditQuery = {
  limit: number;
  page: number;
  sort: string;
  where?: Record<string, unknown>;
};

export class AuditController {
  private parseQuery(c: Context<DyrectedContext>): AuditQuery {
    const limit = Math.min(Number(c.req.query("limit")) || 50, 100);
    const page = Math.max(Number(c.req.query("page")) || 1, 1);
    const sort = c.req.query("sort") || "-timestamp";
    const whereRaw = c.req.query("where");

    if (!whereRaw) {
      return { limit, page, sort };
    }

    try {
      return {
        limit,
        page,
        sort,
        where: JSON.parse(decodeURIComponent(whereRaw)) as Record<string, unknown>,
      };
    } catch {
      return { limit, page, sort };
    }
  }

  private emptyResult(limit: number, page: number): PaginatedResult {
    return {
      docs: [],
      total: 0,
      limit,
      page,
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: page > 1,
    };
  }

  private async collectAccessibleDocumentIds(
    db: DatabaseAdapter,
    collection: CollectionConfig,
    constraint: Record<string, unknown>,
  ): Promise<string[]> {
    const ids: string[] = [];
    const limit = 100;
    let page = 1;

    while (true) {
      const result = await db.find({
        collection: collection.slug,
        where: constraint,
        limit,
        page,
      });

      for (const doc of result.docs) {
        if (typeof doc?.id === "string" && doc.id.length > 0) {
          ids.push(doc.id);
        }
      }

      if (!result.hasNextPage || page >= result.totalPages) {
        break;
      }

      page += 1;
    }

    return ids;
  }

  private async buildCollectionAuditScope(
    c: Context<DyrectedContext>,
    collection: CollectionConfig,
  ): Promise<{ denied: boolean; where: Record<string, unknown> }> {
    const config = c.get("config");
    // The audit log is gated by `readAudit` when set, otherwise it inherits the
    // collection's `read` rule so the trail follows document visibility.
    const auditAccess = collection.access?.readAudit ?? collection.access?.read;
    const access = await resolveCollectionAccess(
      config,
      collection.slug,
      "read",
      auditAccess,
      {
        user: c.get("user"),
        req: toHookRequestContext(c.req),
      },
    );

    if (!access.allowed) {
      return { denied: true, where: {} };
    }

    let where: Record<string, unknown> = { collection: { equals: collection.slug } };

    if (access.constraint) {
      const ids = await this.collectAccessibleDocumentIds(config.db!, collection, access.constraint);
      where = mergeWhereConstraint(where, { documentId: { in: ids } });
    }

    return { denied: false, where };
  }

  private async getVisibleCollections(c: Context<DyrectedContext>): Promise<CollectionConfig[]> {
    const config = c.get("config");
    const collections = new Map<string, CollectionConfig>();

    for (const collection of config.collections) {
      collections.set(collection.slug, collection);
    }

    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    if (config.onSchemaFetch && siteId) {
      const dynamic = await config.onSchemaFetch(siteId);
      for (const collection of dynamic.collections || []) {
        if (!collections.has(collection.slug)) {
          collections.set(collection.slug, collection);
        }
      }
    }

    return Array.from(collections.values());
  }

  async findForCollection(c: Context<DyrectedContext>, collection: CollectionConfig) {
    const config = c.get("config");
    if (!config.db) return c.json({ message: "Database not configured" }, 500);
    if (!collection.audit) return c.json({ message: "Audit is not enabled for this collection" }, 404);

    const query = this.parseQuery(c);
    const scope = await this.buildCollectionAuditScope(c, collection);
    if (scope.denied) {
      return c.json({ error: true, message: `Access denied: read on ${collection.slug}` }, 403);
    }

    const where = query.where ? mergeWhereConstraint(scope.where, query.where) : scope.where;
    const result = await config.db.find({
      collection: "__audit",
      where,
      limit: query.limit,
      page: query.page,
      sort: query.sort,
    });

    return c.json(result);
  }

  async findAll(c: Context<DyrectedContext>) {
    const config = c.get("config");
    if (!config.db) return c.json({ message: "Database not configured" }, 500);

    const query = this.parseQuery(c);
    const collections = (await this.getVisibleCollections(c)).filter((collection) => collection.audit);
    const scopes: Record<string, unknown>[] = [];

    for (const collection of collections) {
      const scope = await this.buildCollectionAuditScope(c, collection);
      if (!scope.denied) {
        scopes.push(scope.where);
      }
    }

    if (scopes.length === 0) {
      return c.json(this.emptyResult(query.limit, query.page));
    }

    let where = scopes.length === 1 ? scopes[0] : { OR: scopes };
    if (query.where) {
      where = mergeWhereConstraint(where, query.where);
    }

    const result = await config.db.find({
      collection: "__audit",
      where,
      limit: query.limit,
      page: query.page,
      sort: query.sort,
    });

    return c.json(result);
  }
}
