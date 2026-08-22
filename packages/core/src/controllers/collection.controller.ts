import type { Context } from "hono";
import type { ActionConfig, CollectionConfig } from "../types/index.js";
import type { DyrectedContext } from "../app.js";
import type { HookRequestContext } from "../types/request.js";
import { PopulationService } from "../services/population.service.js";
import { DefaultsService } from "../services/defaults.service.js";
import { AuditService } from "../services/audit.service.js";
import { hashPassword, verifyPassword } from "../auth/password.js";
import { revokeAllAuthSessions } from "../auth/sessions.js";
import {
  runCollectionHooks,
  executeFieldBeforeChange,
  executeFieldAfterRead,
} from "../utils/hooks.js";
import { createReadonlyDb } from "../utils/readonly-db.js";
import { validateUpload } from "../utils/upload-validation.js";
import { resolveAccess } from "../auth/access.js";
import { getAdminAuthCollection } from "../utils/admin-auth.js";
import { buildCollectionSearchWhere } from "../utils/collection-search.js";
import {
  applyFieldReadAccess,
  applyFieldWriteAccess,
  mergeWhereConstraint,
  resolveBooleanAccess,
  resolveCollectionAccess,
  toHookRequestContext,
} from "../utils/access-control.js";
import { resolveActionMutation } from "../utils/action-mutation.js";
import {
  WORKFLOW_HISTORY_COLLECTION,
  createWorkflowDocument,
  canViewWorkflowDraft,
  initializeWorkflowDocument,
  materializeWorkflowDocument,
  publishedStateName,
  saveWorkflowDraft,
  transitionWorkflow,
} from "../workflows.js";
import { getRequestLogger } from "../observability.js";
import { evaluateDetailComputed } from "../detail.js";

export class CollectionController {
  private collection: CollectionConfig;

  constructor(collection: CollectionConfig) {
    this.collection = collection;
  }

  private getDelegatedProvider(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const authCollection = getAdminAuthCollection(config);
    if (!authCollection || this.collection.slug !== authCollection.slug) {
      return null;
    }
    return config.adminAuth?.providers?.find((p: any) => p.members) || null;
  }

  private toHookRequestContext(
    c: Context<DyrectedContext>,
  ): HookRequestContext {
    return toHookRequestContext(c.req);
  }

  private sanitizeDoc(doc: any): any {
    if (!doc || typeof doc !== "object") return doc;
    if (this.collection.auth) {
      const {
        password: _p,
        salt: _s,
        resetPasswordToken: _rpt,
        resetPasswordExpires: _rpe,
        loginAttempts: _la,
        lockUntil: _lu,
        ...safeDoc
      } = doc;
      return safeDoc;
    }
    return doc;
  }

  private async evaluateAccess(
    c: Context<DyrectedContext>,
    action: "read" | "create" | "update" | "delete",
    options: {
      id?: string;
      doc?: Record<string, unknown> | null;
      data?: Record<string, unknown>;
    } = {},
  ) {
    const config = c.get("config");
    return resolveCollectionAccess(
      config,
      this.collection.slug,
      action,
      this.collection.access?.[action],
      {
        id: options.id,
        user: c.get("user"),
        req: this.toHookRequestContext(c),
        doc: options.doc ?? undefined,
        data: options.data,
      },
    );
  }

  async find(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const provider = this.getDelegatedProvider(c);
    if (provider && provider.members?.list) {
      const hookReq = this.toHookRequestContext(c);
      const limit = Number(c.req.query("limit")) || 10;
      const page = Number(c.req.query("page")) || 1;
      const sort = c.req.query("sort") || undefined;
      const search = c.req.query("search") || undefined;
      let where: any = undefined;
      const whereRaw = c.req.query("where");
      if (whereRaw) {
        try {
          where = JSON.parse(decodeURIComponent(whereRaw));
        } catch {}
      }

      const searchWhere = await buildCollectionSearchWhere({
        collection: this.collection,
        search,
        db: createReadonlyDb(db),
        collections: config.collections,
      });
      if (searchWhere) {
        where = mergeWhereConstraint(where, searchWhere);
      }

      const paginatedResult = await provider.members.list({
        limit,
        page,
        sort,
        where,
        req: hookReq,
      });
      const mappedDocs = [];
      for (const m of paginatedResult.docs) {
        let localId = m.id;
        const localDoc = await db.find({
          collection: this.collection.slug,
          where: m.id
            ? { externalSubject: { equals: m.id } }
            : { email: { equals: m.email } },
          limit: 1,
        });
        if (localDoc.docs[0]) {
          localId = localDoc.docs[0].id;
        }
        mappedDocs.push({
          ...m,
          id: localId,
          externalSubject: m.id,
        });
      }
      return c.json({
        ...paginatedResult,
        docs: mappedDocs,
      });
    }

    const readonlyDb = createReadonlyDb(db);
    // Cap the page size so a caller can't request an unbounded result set.
    const limit = Math.min(Number(c.req.query("limit")) || 10, 100);
    const page = Number(c.req.query("page")) || 1;
    // Default relationship depth is 1, matching the SDK default.
    const depth =
      c.req.query("depth") !== undefined ? Number(c.req.query("depth")) : 1;
    const sort = c.req.query("sort") || undefined;
    const search = c.req.query("search") || undefined;
    const user = c.get("user");

    let where: any = undefined;
    const whereRaw = c.req.query("where");
    if (whereRaw) {
      try {
        where = JSON.parse(decodeURIComponent(whereRaw));
      } catch {
        // Not valid JSON — fall through without a where clause
      }
    }

    if (where) {
      if (this.collection.admin?.filterable === false) {
        where = undefined;
      } else {
        const { sanitizeWhereClause } =
          await import("../utils/where-sanitizer.js");
        where = sanitizeWhereClause(where, this.collection.fields);
        // If where ends up being an empty object after sanitization, drop it
        if (Object.keys(where).length === 0) {
          where = undefined;
        }
      }
    }

    const searchWhere = await buildCollectionSearchWhere({
      collection: this.collection,
      search,
      db: readonlyDb,
      collections: config.collections,
    });
    if (searchWhere) {
      where = mergeWhereConstraint(where, searchWhere);
    }

    // Run beforeRead collection hook
    const beforeReadResult = await runCollectionHooks(
      this.collection.hooks?.beforeRead,
      {
        req: c.req,
        query: where,
        user,
        db: readonlyDb,
      },
      {
        surface: "collection.beforeRead",
        path: `collection:${this.collection.slug}.hooks.beforeRead`,
      },
    );
    if (beforeReadResult !== undefined) {
      where = beforeReadResult;
    }

    // Workflow drafts are never visible to unauthenticated readers. The public
    // response is materialized from the last promoted snapshot below.
    if (
      this.collection.workflow &&
      !canViewWorkflowDraft(this.collection.workflow, user)
    ) {
      const publicWorkflowState = publishedStateName(this.collection.workflow);
      where = where
        ? {
            AND: [
              where,
              {
                OR: [
                  { __published: { exists: true } },
                  { __workflow: { exists: false } },
                  { "__workflow.state": { equals: publicWorkflowState } },
                ],
              },
            ],
          }
        : {
            OR: [
              { __published: { exists: true } },
              { __workflow: { exists: false } },
              { "__workflow.state": { equals: publicWorkflowState } },
            ],
          };
    }

    const access = await this.evaluateAccess(c, "read");
    if (!access.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: read on ${this.collection.slug}`,
        },
        403,
      );
    }
    if (access.constraint) {
      where = mergeWhereConstraint(where, access.constraint);
    }

    let result = await db!.find({
      collection: this.collection.slug,
      limit,
      page,
      sort,
      where,
      fields: this.collection.fields,
    });

    // Auto-seeding if empty and initialData is provided
    if (
      result.total === 0 &&
      this.collection.initialData &&
      !where &&
      page === 1
    ) {
      getRequestLogger(c, "collection").info({
        msg: "Auto-seeding collection from config.initialData",
        collection: this.collection.slug,
      });
      for (const data of this.collection.initialData) {
        await db!.create({ collection: this.collection.slug, data });
      }
      // Re-fetch result after seeding
      result = await db!.find({
        collection: this.collection.slug,
        limit,
        page,
        sort,
        where,
        fields: this.collection.fields,
      });
    }

    result.docs = result.docs
      .map((doc) =>
        this.collection.workflow
          ? materializeWorkflowDocument(
              doc as any,
              this.collection.workflow,
              user,
            )
          : doc,
      )
      .filter((doc): doc is NonNullable<typeof doc> => doc !== null);

    // Run afterRead hooks (both collection and field levels)
    const processedDocs = [];
    for (const doc of result.docs) {
      const docWithDefaults = DefaultsService.apply(
        this.collection.fields,
        doc,
      );
      const docWithCollectionHooks = await runCollectionHooks(
        this.collection.hooks?.afterRead,
        {
          doc: docWithDefaults,
          req: c.req,
          user,
          db: readonlyDb,
        },
      );
      const docWithFieldHooks = await executeFieldAfterRead(
        this.collection.fields,
        docWithCollectionHooks,
        user,
        readonlyDb,
      );
      const docWithFieldAccess = await applyFieldReadAccess(
        {
          config,
          fields: this.collection.fields,
          user,
          req: this.toHookRequestContext(c),
          doc: docWithFieldHooks,
        },
        docWithFieldHooks,
      );
      processedDocs.push(docWithFieldAccess);
    }
    result.docs = processedDocs;

    if (depth > 0) {
      const populationService = new PopulationService(db!, config.collections);
      result = await populationService.populateResult(
        result,
        this.collection.fields,
        depth,
      );
    }

    if (this.collection.auth && result.docs && Array.isArray(result.docs)) {
      result.docs = result.docs.map((d: any) => this.sanitizeDoc(d));
    }

    return c.json(result);
  }

  async findOne(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const provider = this.getDelegatedProvider(c);
    if (provider && (provider.members?.get || provider.members?.list)) {
      const hookReq = this.toHookRequestContext(c);
      const id = c.req.param("id");
      if (!id) return c.json({ message: "Missing ID" }, 400);

      const localDoc = await db.findOne({
        collection: this.collection.slug,
        id,
      });
      const externalSubject = localDoc?.externalSubject || id;
      if (provider.members.get) {
        const member = await provider.members.get({
          externalSubject,
          req: hookReq,
        });
        if (member) {
          return c.json({
            ...member,
            id: localDoc ? localDoc.id : member.id,
            externalSubject: member.id,
          });
        }
      } else if (provider.members.list) {
        const listResult = await provider.members.list({ req: hookReq });
        const matched = listResult.docs.find((m: any) => m.id === externalSubject || m.id === id);
        if (matched) {
          return c.json({
            ...matched,
            id: localDoc ? localDoc.id : matched.id,
            externalSubject: matched.id,
          });
        }
      }
    }

    const id = c.req.param("id");
    if (!id) return c.json({ message: "Missing ID" }, 400);

    const depth = Number.parseInt(c.req.query("depth") || "0", 10);
    const user = c.get("user");

    const doc = await db.findOne({
      collection: this.collection.slug,
      id,
    });

    if (!doc) {
      return c.json({ message: "Document not found" }, 404);
    }

    let effectiveDoc: any = doc;
    if (this.collection.workflow) {
      effectiveDoc = materializeWorkflowDocument(
        doc as any,
        this.collection.workflow,
        user,
      );
      if (!effectiveDoc) return c.json({ message: "Document not found" }, 404);
    }

    const access = await this.evaluateAccess(c, "read", { id, doc: effectiveDoc });
    if (!access.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: read on ${this.collection.slug}`,
        },
        403,
      );
    }

    const docWithDefaults = DefaultsService.apply(
      this.collection.fields,
      effectiveDoc,
    );
    const readonlyDb = createReadonlyDb(db);
    const docWithCollectionHooks = await runCollectionHooks(
      this.collection.hooks?.afterRead,
      {
        doc: docWithDefaults,
        req: c.req,
        user,
        db: readonlyDb,
      },
    );
    const docWithFieldHooks = await executeFieldAfterRead(
      this.collection.fields,
      docWithCollectionHooks,
      user,
      readonlyDb,
    );
    const docWithFieldAccess = await applyFieldReadAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        doc: docWithFieldHooks,
      },
      docWithFieldHooks,
    );

    let finalDoc = docWithFieldAccess;

    if (depth > 0 && docWithFieldAccess) {
      const populationService = new PopulationService(db!, config.collections);
      finalDoc = await populationService.populate({
        data: docWithFieldAccess,
        fields: this.collection.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
    }

    if (finalDoc && this.collection.detail) {
      finalDoc = await evaluateDetailComputed(this.collection.detail, finalDoc, user, readonlyDb);
    }

    return c.json(this.sanitizeDoc(finalDoc));
  }

  async create(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const provider = this.getDelegatedProvider(c);
    if (provider && provider.members?.create) {
      const hookReq = this.toHookRequestContext(c);
      const contentType = c.req.header("Content-Type") || "";
      if (contentType.toLowerCase().includes("multipart/form-data")) {
        return this.upload(c);
      }
      const body = await c.req.json();
      const member = await provider.members.create({
        data: body,
        req: hookReq,
      });
      return c.json(
        {
          ...member,
          id: member.id,
          externalSubject: member.id,
        },
        201,
      );
    }

    const readonlyDb = createReadonlyDb(db);
    const contentType = c.req.header("Content-Type") || "";

    if (contentType.toLowerCase().includes("multipart/form-data")) {
      return this.upload(c);
    }

    const body = await c.req.json();
    const user = c.get("user");
    const now = new Date().toISOString();

    let data = {
      ...body,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.sub ?? null,
      updatedBy: user?.sub ?? null,
    };

    if (this.collection.workflow) {
      data = initializeWorkflowDocument(data, this.collection.workflow);
    }

    const createAccess = await this.evaluateAccess(c, "create", { data });
    if (!createAccess.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: create on ${this.collection.slug}`,
        },
        403,
      );
    }

    if (this.collection.auth && data.password) {
      data.password = await hashPassword(data.password);
    }

    data = await applyFieldWriteAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        data,
        operation: "create",
      },
      data,
    );

    // Run beforeChange hooks (field-level then collection-level)
    data = await executeFieldBeforeChange(
      this.collection.fields,
      data,
      null,
      user,
      readonlyDb,
    );
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      req: c.req,
      user,
      operation: "create",
      db: readonlyDb,
    }, {
      surface: "collection.beforeChange",
      path: `collection:${this.collection.slug}.hooks.beforeChange`,
    });

    const doc = this.collection.workflow
      ? (
          await createWorkflowDocument({
            config,
            collection: this.collection,
            data,
            user,
          })
        ).doc
      : await db!.create({ collection: this.collection.slug, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: "create",
        collection: this.collection.slug,
        documentId: doc.id,
        user: user
          ? { id: user.sub, collection: user.collection, email: user.email }
          : undefined,
        before: null,
        after: doc,
      }, config);
    }

    // Run afterChange collection hooks (full db access)
    await runCollectionHooks(
      this.collection.hooks?.afterChange,
      {
        doc,
        user,
        req: c.req,
        operation: "create",
        db,
      },
      { isolated: true },
    );

    // Run afterRead hooks on the returned doc
    const responseDoc = this.collection.workflow
      ? materializeWorkflowDocument(doc, this.collection.workflow, user)!
      : doc;
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc: responseDoc,
      req: c.req,
      user,
      db: readonlyDb,
    }, {
      surface: "collection.afterRead",
      path: `collection:${this.collection.slug}.hooks.afterRead`,
    });
    const finalDoc = await executeFieldAfterRead(
      this.collection.fields,
      readDoc,
      user,
      readonlyDb,
    );
    const accessibleDoc = await applyFieldReadAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        doc: finalDoc,
      },
      finalDoc,
    );

    return c.json(accessibleDoc, 201);
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const storage = config.storage;
    if (!storage) return c.json({ message: "Storage not configured" }, 500);

    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    const formData = await c.req.formData();
    const file = formData.get("file") as any;
    if (!file) return c.json({ message: "No file uploaded" }, 400);

    // Enforce the collection's upload restrictions (allowedMimeTypes / maxFileSize)
    // before buffering the file into memory.
    const uploadConfig =
      typeof this.collection.upload === "object"
        ? this.collection.upload
        : undefined;
    const validationError = validateUpload(file, uploadConfig);
    if (validationError) {
      return c.json(
        { message: validationError.message },
        validationError.status,
      );
    }

    const buffer = new Uint8Array(await file.arrayBuffer());
    const siteId = c.get("siteId");
    const workspaceId = c.get("workspaceId");
    const prefix = workspaceId ? `${workspaceId}/${siteId}` : siteId;

    const fileData = await storage.upload({
      filename: file.name,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const otherData: any = {};
    formData.forEach((value, key) => {
      if (key !== "file" && typeof value === "string") {
        otherData[key] = value;
      }
    });

    const user = c.get("user");
    const now = new Date().toISOString();

    let data = {
      ...otherData,
      ...fileData,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.sub ?? null,
      updatedBy: user?.sub ?? null,
    };

    const createAccess = await this.evaluateAccess(c, "create", { data });
    if (!createAccess.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: create on ${this.collection.slug}`,
        },
        403,
      );
    }

    data = await applyFieldWriteAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        data,
        operation: "create",
      },
      data,
    );

    // Run beforeChange hooks for upload too
    data = await executeFieldBeforeChange(
      this.collection.fields,
      data,
      null,
      user,
      readonlyDb,
    );
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      req: c.req,
      user,
      operation: "create",
      db: readonlyDb,
    }, {
      surface: "collection.beforeChange",
      path: `collection:${this.collection.slug}.hooks.beforeChange`,
    });

    const doc = await db.create({
      collection: this.collection.slug,
      data,
    });

    // Run afterChange hooks for uploads (full db access)
    await runCollectionHooks(
      this.collection.hooks?.afterChange,
      {
        doc,
        user,
        req: c.req,
        operation: "create",
        db,
      },
      { isolated: true },
    );

    // Run afterRead hooks
    const responseDoc = this.collection.workflow
      ? materializeWorkflowDocument(doc, this.collection.workflow, user)!
      : doc;
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc: responseDoc,
      req: c.req,
      user,
      db: readonlyDb,
    }, {
      surface: "collection.afterRead",
      path: `collection:${this.collection.slug}.hooks.afterRead`,
    });
    const finalDoc = await executeFieldAfterRead(
      this.collection.fields,
      readDoc,
      user,
      readonlyDb,
    );
    const accessibleDoc = await applyFieldReadAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        doc: finalDoc,
      },
      finalDoc,
    );

    return c.json(accessibleDoc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const provider = this.getDelegatedProvider(c);
    if (provider && provider.members?.update) {
      const hookReq = this.toHookRequestContext(c);
      const id = c.req.param("id");
      if (!id) return c.json({ message: "Missing ID" }, 400);
      const body = await c.req.json();

      const localDoc = await db.findOne({
        collection: this.collection.slug,
        id,
      });
      const externalSubject = localDoc?.externalSubject || id;

      const member = await provider.members.update({
        externalSubject,
        data: body,
        req: hookReq,
      });
      return c.json({
        ...member,
        id: localDoc ? localDoc.id : member.id,
        externalSubject: member.id,
      });
    }

    const id = c.req.param("id");
    if (!id) return c.json({ message: "Missing ID" }, 400);

    const body = await c.req.json();
    return this.performUpdate(c, id, body);
  }

  /**
   * Core update pipeline shared by PATCH requests and operational actions:
   * auth-field stripping, timestamps, access enforcement, field write access,
   * beforeChange hooks, persistence (or workflow draft), audit logging,
   * afterChange/afterRead hooks, and field read access on the response.
   */
  private async performUpdate(
    c: Context<DyrectedContext>,
    id: string,
    rawData: Record<string, unknown>,
  ): Promise<Response> {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    const user = c.get("user");

    // Strip auth-only fields from general updates — use /change-password for that
    let data = { ...rawData };
    if (this.collection.auth) {
      delete data.password;
      delete data.oldPassword;
      delete data.confirmPassword;
    }

    Object.assign(data, {
      updatedAt: new Date().toISOString(),
      updatedBy: user?.sub ?? null,
    });

    const originalDoc = await db!.findOne({
      collection: this.collection.slug,
      id,
    });
    if (!originalDoc) return c.json({ message: "Not Found" }, 404);

    const updateAccess = await this.evaluateAccess(c, "update", {
      id,
      doc: originalDoc,
      data,
    });
    if (!updateAccess.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: update on ${this.collection.slug}`,
        },
        403,
      );
    }

    let before: any = null;
    if (this.collection.audit) {
      before = originalDoc;
    }

    data = await applyFieldWriteAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        doc: originalDoc,
        data,
      },
      data,
    );

    // Run beforeChange hooks (field-level then collection-level)
    data = await executeFieldBeforeChange(
      this.collection.fields,
      data,
      originalDoc,
      user,
      readonlyDb,
    );
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      doc: originalDoc,
      req: c.req,
      user,
      operation: "update",
      db: readonlyDb,
    }, {
      surface: "collection.beforeChange",
      path: `collection:${this.collection.slug}.hooks.beforeChange`,
    });

    const doc = this.collection.workflow
      ? (
          await saveWorkflowDraft({
            config,
            collection: this.collection,
            id,
            originalDoc,
            data,
            user,
          })
        ).doc
      : await db!.update({ collection: this.collection.slug, id, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: "update",
        collection: this.collection.slug,
        documentId: id,
        user: user
          ? { id: user.sub, collection: user.collection, email: user.email }
          : undefined,
        before,
        after: doc,
      }, config);
    }

    // Run afterChange collection hooks (full db access)
    await runCollectionHooks(
      this.collection.hooks?.afterChange,
      {
        doc,
        previousDoc: originalDoc,
        user,
        req: c.req,
        operation: "update",
        db,
      },
      { isolated: true },
    );

    const responseDoc = this.collection.workflow
      ? materializeWorkflowDocument(doc, this.collection.workflow, user)!
      : doc;

    // Run afterRead hooks
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc: responseDoc,
      req: c.req,
      user,
      db: readonlyDb,
    }, {
      surface: "collection.afterRead",
      path: `collection:${this.collection.slug}.hooks.afterRead`,
    });
    const finalDoc = await executeFieldAfterRead(
      this.collection.fields,
      readDoc,
      user,
      readonlyDb,
    );
    const accessibleDoc = await applyFieldReadAccess(
      {
        config,
        fields: this.collection.fields,
        user,
        req: this.toHookRequestContext(c),
        doc: finalDoc,
      },
      finalDoc,
    );

    return c.json(accessibleDoc);
  }

  /**
   * Runs an operational view action (`defineAction`) against one or more documents.
   * Declarative mutations are resolved server-side (`now()`, `input.*`, `doc.*`)
   * and every write flows through the standard update pipeline so the
   * collection's lifecycle hooks and audit trail still apply.
   */
  async runViewAction(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);
    if (!this.collection.views?.length) {
      return c.json({ error: true, message: `Collection ${this.collection.slug} has no views` }, 404);
    }

    const actionName = c.req.param("action");
    const viewSlugParam = c.req.param("viewSlug");
    let action: ActionConfig | undefined;
    for (const view of this.collection.views) {
      if (viewSlugParam && view.slug !== viewSlugParam) continue;
      const match = view.actions?.find((candidate) => candidate.name === actionName);
      if (match) {
        action = match;
        break;
      }
    }
    if (!action) {
      return c.json(
        { error: true, message: `Action "${actionName}" was not found${viewSlugParam ? ` in view "${viewSlugParam}"` : ""}` },
        404,
      );
    }

    const body = await c.req.json().catch(() => ({}));
    const requestedIds: string[] = Array.isArray(body?.ids)
      ? body.ids.filter((value: unknown): value is string => typeof value === "string")
      : typeof body?.id === "string"
        ? [body.id]
        : [];
    if (!requestedIds.length) {
      return c.json(
        { error: true, message: "Provide an `id` or an `ids` array of documents to act on." },
        400,
      );
    }

    const input = (body?.input ?? {}) as Record<string, unknown>;
    const user = c.get("user");
    const accessArgs = { user, req: this.toHookRequestContext(c) };

    // View-level visibility gate.
    const view = viewSlugParam
      ? this.collection.views.find((candidate) => candidate.slug === viewSlugParam)
      : undefined;
    if (view?.access) {
      const allowed = await resolveBooleanAccess(config, view.access.update ?? view.access.read ?? true, {
        ...accessArgs,
        data: input,
      } as any);
      if (!allowed) {
        return c.json({ error: true, message: `Access denied: view "${view.slug}"` }, 403);
      }
    }

    // Action-level gate — actions mutate, so they default to update permission.
    if (action.access) {
      const actionAccess = await resolveBooleanAccess(config, action.access.update ?? true, {
        ...accessArgs,
        data: input,
      } as any);
      if (!actionAccess) {
        return c.json({ error: true, message: `Access denied: action "${action.name}"` }, 403);
      }
    }

    // Bulk runs sequentially so per-document hooks observe a consistent state.
    const results: Array<{ id: string; ok: boolean; status?: number; doc?: unknown; error?: unknown }> = [];
    for (const id of requestedIds) {
      const targetDoc = await db.findOne({ collection: this.collection.slug, id });
      if (!targetDoc) {
        results.push({ id, ok: false, status: 404, error: "Not Found" });
        continue;
      }

      let resolvedData: Record<string, unknown>;
      if (typeof action.handler === "function") {
        try {
          const handlerResult = await action.handler({
            doc: targetDoc as Record<string, unknown>,
            docs: [targetDoc as Record<string, unknown>],
            user: (user as unknown as Record<string, unknown>) ?? null,
            input,
            collection: { slug: this.collection.slug, label: this.collection.labels?.singular ?? this.collection.slug },
          });
          resolvedData = (handlerResult ?? {}) as Record<string, unknown>;
        } catch (error) {
          results.push({ id, ok: false, status: 500, error: error instanceof Error ? error.message : String(error) });
          continue;
        }
      } else {
        resolvedData = resolveActionMutation(action.mutation, {
          doc: targetDoc as Record<string, unknown>,
          input,
          user: (user as unknown as Record<string, unknown>) ?? null,
        });
      }

      const response = await this.performUpdate(c, id, resolvedData);
      const ok = response.ok;
      let payload: unknown;
      try {
        payload = await response.clone().json();
      } catch {
        payload = undefined;
      }
      results.push({ id, ok, status: response.status, ...(ok ? { doc: payload } : { error: payload }) });
    }

    if (requestedIds.length === 1) {
      const single = results[0];
      if (!single.ok) {
        return c.json(single.error ?? { error: true, message: "Action failed" }, (single.status ?? 500) as any);
      }
      return c.json(single.doc);
    }

    const failed = results.filter((result) => !result.ok).length;
    return c.json({
      updated: results.length - failed,
      failed,
      results,
    });
  }

  async transition(c: Context<DyrectedContext>) {
    const config = c.get("config");
    if (!config.db) return c.json({ message: "Database not configured" }, 500);
    if (!this.collection.workflow)
      return c.json(
        { message: "Workflows are not enabled for this collection" },
        404,
      );

    const id = c.req.param("id");
    const transitionName = c.req.param("transition");
    const body = (await c.req.json().catch(() => ({}))) as {
      expectedRevision?: number;
      comment?: string;
    };
    try {
      const doc = await transitionWorkflow({
        config,
        collection: this.collection,
        id: id as string,
        transitionName: transitionName as string,
        expectedRevision: body.expectedRevision,
        comment: body.comment,
        user: c.get("user"),
        req: { query: c.req.query(), headers: c.req.header(), raw: c.req.raw },
      });
      return c.json(
        materializeWorkflowDocument(
          doc as any,
          this.collection.workflow,
          c.get("user"),
        ),
      );
    } catch (error) {
      const status =
        typeof (error as { statusCode?: unknown }).statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;
      return c.json(
        {
          error: true,
          message: error instanceof Error ? error.message : String(error),
        },
        status as 400,
      );
    }
  }

  async workflowHistory(c: Context<DyrectedContext>) {
    const config = c.get("config");
    if (!config.db) return c.json({ message: "Database not configured" }, 500);
    if (!this.collection.workflow)
      return c.json(
        { message: "Workflows are not enabled for this collection" },
        404,
      );
    const documentId = c.req.param("id");
    if (!documentId) return c.json({ message: "Missing ID" }, 400);
    const document = await config.db.findOne({
      collection: this.collection.slug,
      id: documentId,
    });
    if (!document) return c.json({ message: "Not Found" }, 404);
    const readAccess = this.collection.access?.read;
    if (readAccess !== undefined && readAccess !== null) {
      const args = { user: c.get("user"), req: c.req as any, doc: document };
      const result = await resolveAccess(config, readAccess, args);
      let allowed = result === true;
      if (result && typeof result === "object") {
        const match = await config.db.find({
          collection: this.collection.slug,
          where: { AND: [{ id: { equals: documentId } }, result] },
          limit: 1,
        });
        allowed = match.total > 0;
      }
      if (!allowed)
        return c.json(
          {
            error: true,
            message: `Access denied: read on ${this.collection.slug}`,
          },
          403,
        );
    }
    const result = await config.db.find({
      collection: WORKFLOW_HISTORY_COLLECTION,
      where: {
        collection: { equals: this.collection.slug },
        documentId: { equals: documentId },
      },
      sort: "-createdAt",
      limit: Math.min(Number(c.req.query("limit")) || 50, 100),
    });
    return c.json(result);
  }

  /**
   * POST /api/collections/:slug/:id/change-password
   *
   * Dedicated endpoint for password changes. Requires the caller to supply:
   *   { oldPassword, newPassword, confirmPassword }
   *
   * Rules:
   *  - Only the account owner or an admin may change the password.
   *  - Non-admin callers MUST provide a valid oldPassword.
   *  - newPassword and confirmPassword must match.
   */
  async changePassword(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    if (!this.collection.auth) {
      return c.json(
        { message: "This collection does not support authentication" },
        400,
      );
    }

    const id = c.req.param("id");
    if (!id) return c.json({ message: "Missing ID" }, 400);

    const user = c.get("user");
    if (!user) return c.json({ message: "Authentication required" }, 401);

    const body = await c.req.json().catch(() => null);
    const { oldPassword, newPassword, confirmPassword } = body ?? {};

    if (!newPassword) {
      return c.json({ message: "newPassword is required" }, 400);
    }
    if (newPassword !== confirmPassword) {
      return c.json({ message: "Passwords do not match" }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ message: "Password must be at least 8 characters" }, 400);
    }

    const isAdmin = Array.isArray(user.roles) && user.roles.includes("admin");
    const isSelf = user.sub === id;

    if (!isAdmin && !isSelf) {
      return c.json(
        { message: "You are not authorised to change this password" },
        403,
      );
    }

    // Non-admins must verify their current password
    if (!isAdmin) {
      if (!oldPassword) {
        return c.json({ message: "Current password is required" }, 400);
      }
      const existing = await db!.findOne({
        collection: this.collection.slug,
        id,
      });
      if (!existing) return c.json({ message: "User not found" }, 404);

      const valid = await verifyPassword(
        oldPassword,
        existing.password as string,
      );
      if (!valid) {
        return c.json({ message: "Invalid current password" }, 400);
      }
    }

    const hashed = await hashPassword(newPassword);

    await db!.update({
      collection: this.collection.slug,
      id,
      data: {
        password: hashed,
        loginAttempts: 0,
        lockedUntil: null,
        updatedAt: new Date().toISOString(),
        updatedBy: user.sub,
      },
    });
    await revokeAllAuthSessions(config, {
      userId: id,
      collection: this.collection.slug,
    });

    if (this.collection.audit) {
      AuditService.log(db, {
        operation: "update",
        collection: this.collection.slug,
        documentId: id,
        user: { id: user.sub, collection: user.collection, email: user.email },
        before: null,
        after: { id },
      }, config);
    }

    return c.json({ success: true, message: "Password updated successfully" });
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const provider = this.getDelegatedProvider(c);
    if (provider && provider.members?.delete) {
      const hookReq = this.toHookRequestContext(c);
      const id = c.req.param("id");
      if (!id) return c.json({ message: "Missing ID" }, 400);

      const localDoc = await db.findOne({
        collection: this.collection.slug,
        id,
      });
      const externalSubject = localDoc?.externalSubject || id;

      await provider.members.delete({ externalSubject, req: hookReq });
      return c.json({ message: "Deleted" });
    }

    const readonlyDb = createReadonlyDb(db);
    const id = c.req.param("id");
    if (!id) return c.json({ message: "Missing ID" }, 400);

    const user = c.get("user");

    const doc = await db!.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: "Not Found" }, 404);

    const deleteAccess = await this.evaluateAccess(c, "delete", { id, doc });
    if (!deleteAccess.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: delete on ${this.collection.slug}`,
        },
        403,
      );
    }

    let before: any = null;
    if (this.collection.audit) {
      before = doc;
    }

    // Run beforeDelete collection hook
    await runCollectionHooks(this.collection.hooks?.beforeDelete, {
      id,
      doc,
      user,
      req: c.req,
      db: readonlyDb,
    });

    await db!.delete({ collection: this.collection.slug, id });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: "delete",
        collection: this.collection.slug,
        documentId: id,
        user: user
          ? { id: user.sub, collection: user.collection, email: user.email }
          : undefined,
        before,
        after: null,
      }, config);
    }

    // Run afterDelete collection hook (full db access)
    await runCollectionHooks(
      this.collection.hooks?.afterDelete,
      {
        id,
        doc,
        user,
        req: c.req,
        db,
      },
      { isolated: true },
    );

    return c.json({ message: "Deleted" });
  }

  async deleteMany(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const readonlyDb = createReadonlyDb(db);
    const user = c.get("user");

    // ids may arrive as a query-string array (?ids[]=a&ids[]=b) or JSON body
    let ids: string[] = [];
    try {
      const body = await c.req.json().catch(() => null);
      if (body?.ids && Array.isArray(body.ids)) {
        ids = body.ids;
      }
    } catch {
      // fall through to query-string
    }

    if (!ids.length) {
      const raw = c.req.queries("ids") ?? c.req.queries("ids[]") ?? [];
      ids = raw.filter(Boolean);
    }

    if (!ids.length) return c.json({ message: "No IDs provided" }, 400);

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const doc = await db.findOne({ collection: this.collection.slug, id });
        if (!doc) {
          failed.push({ id, error: "Not Found" });
          continue;
        }

        const deleteAccess = await this.evaluateAccess(c, "delete", {
          id,
          doc,
        });
        if (!deleteAccess.allowed) {
          failed.push({ id, error: "Access denied" });
          continue;
        }

        let before: any = null;
        if (this.collection.audit) {
          before = doc;
        }

        // Run beforeDelete hooks
        await runCollectionHooks(this.collection.hooks?.beforeDelete, {
          id,
          doc,
          user,
          req: c.req,
          db: readonlyDb,
        });

        await db.delete({ collection: this.collection.slug, id });
        deleted.push(id);

        if (this.collection.audit) {
          AuditService.log(db, {
            operation: "delete",
            collection: this.collection.slug,
            documentId: id,
            user: user
              ? { id: user.sub, collection: user.collection, email: user.email }
              : undefined,
            before,
            after: null,
          }, config);
        }

        // Run afterDelete hooks (full db access)
        await runCollectionHooks(
          this.collection.hooks?.afterDelete,
          {
            id,
            doc,
            user,
            req: c.req,
            db,
          },
          { isolated: true },
        );
      } catch (err: any) {
        failed.push({ id, error: err?.message ?? "Unknown error" });
      }
    }

    return c.json({
      message: `Deleted ${deleted.length} document(s)`,
      deleted,
      ...(failed.length ? { failed } : {}),
    });
  }

  async seed(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    const body = await c.req.json();
    const initialData = body.data;

    if (!initialData || !Array.isArray(initialData)) {
      return c.json({ message: "Invalid initial data" }, 400);
    }

    const result = await db.find({
      collection: this.collection.slug,
      limit: 1,
    });
    if (result.total > 0) {
      return c.json({ message: "Collection is not empty, skipping seed" });
    }

    getRequestLogger(c, "collection").info({
      msg: "Auto-seeding collection",
      collection: this.collection.slug,
    });
    const createdDocs = [];
    for (const data of initialData) {
      const doc = await db.create({ collection: this.collection.slug, data });
      createdDocs.push(doc);
    }

    return c.json(
      { message: "Seed successful", count: createdDocs.length },
      201,
    );
  }

  async aggregate(c: Context<DyrectedContext>) {
    const config = c.get("config");
    const db = config.db;
    if (!db) return c.json({ message: "Database not configured" }, 500);

    // Gate on read access and obtain any row-level constraint.
    const access = await this.evaluateAccess(c, "read");
    if (!access.allowed) {
      return c.json(
        {
          error: true,
          message: `Access denied: read on ${this.collection.slug}`,
        },
        403,
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await c.req.json();
    } catch {
      return c.json({ message: "Invalid JSON body" }, 400);
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return c.json(
        { message: "Aggregate request body must be a JSON object" },
        400,
      );
    }

    // Sanitize each per-aggregate where clause using the same sanitizer as find().
    const { sanitizeWhereClause } = await import(
      "../utils/where-sanitizer.js"
    );

    const sanitizedAggregates: Record<string, unknown> = {};
    for (const [key, op] of Object.entries(body)) {
      if (!op || typeof op !== "object" || Array.isArray(op)) {
        return c.json(
          {
            message: `Aggregate operation "${key}" must be an object`,
          },
          400,
        );
      }
      const operation = op as Record<string, unknown>;

      // Merge access constraint and sanitize the per-aggregate where.
      let opWhere: Record<string, unknown> | undefined =
        operation.where && typeof operation.where === "object"
          ? (operation.where as Record<string, unknown>)
          : undefined;

      if (opWhere) {
        opWhere = sanitizeWhereClause(opWhere, this.collection.fields);
        if (Object.keys(opWhere).length === 0) opWhere = undefined;
      }

      if (access.constraint) {
        opWhere = opWhere
          ? mergeWhereConstraint(opWhere, access.constraint)
          : (access.constraint as Record<string, unknown>);
      }

      sanitizedAggregates[key] = {
        ...operation,
        ...(opWhere !== undefined ? { where: opWhere } : { where: undefined }),
      };
    }

    const result = await db.aggregate({
      collection: this.collection.slug,
      aggregates: sanitizedAggregates as any,
    });

    return c.json(result);
  }
}
