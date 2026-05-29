import type { Context } from 'hono';
import type { CollectionConfig } from '../types/index.js';
import type { DyrectedContext } from '../app.js';
import { PopulationService } from '../services/population.service.js';
import { DefaultsService } from '../services/defaults.service.js';
import { AuditService } from '../services/audit.service.js';
import { hashPassword, verifyPassword } from '../auth/password.js';
import { runCollectionHooks, executeFieldBeforeChange, executeFieldAfterRead } from '../utils/hooks.js';

export class CollectionController {
  private collection: CollectionConfig;

  constructor(collection: CollectionConfig) {
    this.collection = collection;
  }

  async find(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const depth = c.req.query('depth') !== undefined ? Number(c.req.query('depth')) : 2;
    const sort = c.req.query('sort') || undefined;
    const user = c.get('user');

    let where: any = undefined;
    const whereRaw = c.req.query('where');
    if (whereRaw) {
      try {
        where = JSON.parse(decodeURIComponent(whereRaw));
      } catch {
        // Not valid JSON — fall through without a where clause
      }
    }

    // Run beforeRead collection hook
    const beforeReadResult = await runCollectionHooks(this.collection.hooks?.beforeRead, {
      req: c.req,
      query: where,
      user,
    });
    if (beforeReadResult !== undefined) {
      where = beforeReadResult;
    }

    let result = await db!.find({
      collection: this.collection.slug,
      limit,
      page,
      sort,
      where,
    });

    // Auto-seeding if empty and initialData is provided
    if (result.total === 0 && this.collection.initialData && !where && page === 1) {
      console.log(`[dyrected/core] Auto-seeding collection "${this.collection.slug}" from config.initialData`);
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
      });
    }

    result.docs = result.docs.map(doc => DefaultsService.apply(this.collection.fields, doc));

    // Run afterRead hooks (both collection and field levels)
    const processedDocs = [];
    for (const doc of result.docs) {
      const docWithCollectionHooks = await runCollectionHooks(this.collection.hooks?.afterRead, {
        doc,
        req: c.req,
        user,
      });
      const docWithFieldHooks = await executeFieldAfterRead(this.collection.fields, docWithCollectionHooks, user);
      processedDocs.push(docWithFieldHooks);
    }
    result.docs = processedDocs;

    if (depth > 0) {
      const populationService = new PopulationService(db!, config.collections);
      result = await populationService.populateResult(result, this.collection.fields, depth);
    }

    return c.json(result);
  }

  async findOne(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    const depth = c.req.query('depth') !== undefined ? Number(c.req.query('depth')) : 10;
    const user = c.get('user');

    if (!id) return c.json({ message: 'Missing ID' }, 400);
    const doc = await db!.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

    const docWithDefaults = DefaultsService.apply(this.collection.fields, doc);

    // Run afterRead hooks
    const docWithCollectionHooks = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc: docWithDefaults,
      req: c.req,
      user,
    });
    const docWithFieldHooks = await executeFieldAfterRead(this.collection.fields, docWithCollectionHooks, user);

    if (depth > 0 && docWithFieldHooks) {
      const populationService = new PopulationService(db!, config.collections);
      const populatedDoc = await populationService.populate({
        data: docWithFieldHooks,
        fields: this.collection.fields,
        currentDepth: 0,
        maxDepth: depth,
      });
      return c.json(populatedDoc);
    }

    return c.json(docWithFieldHooks);
  }

  async create(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const contentType = c.req.header('Content-Type') || '';

    if (contentType.toLowerCase().includes('multipart/form-data')) {
      return this.upload(c);
    }

    const body = await c.req.json();
    const user = c.get('user');
    const now = new Date().toISOString();

    let data = {
      ...body,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.sub ?? null,
      updatedBy: user?.sub ?? null,
    };

    if (this.collection.auth && data.password) {
      data.password = await hashPassword(data.password);
    }

    // Run beforeChange hooks (field-level then collection-level)
    data = await executeFieldBeforeChange(this.collection.fields, data, null, user);
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      req: c.req,
      user,
      operation: 'create',
    });

    const doc = await db!.create({ collection: this.collection.slug, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'create',
        collection: this.collection.slug,
        documentId: doc.id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before: null,
        after: doc,
      });
    }

    // Run afterChange collection hooks
    await runCollectionHooks(this.collection.hooks?.afterChange, {
      doc,
      user,
      req: c.req,
      operation: 'create',
    });

    // Run afterRead hooks on the returned doc
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc,
      req: c.req,
      user,
    });
    const finalDoc = await executeFieldAfterRead(this.collection.fields, readDoc, user);

    return c.json(finalDoc, 201);
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    if (!storage) return c.json({ message: 'Storage not configured' }, 500);

    const formData = await c.req.formData();
    const file = formData.get('file') as any;
    if (!file) return c.json({ message: 'No file uploaded' }, 400);

    const buffer = new Uint8Array(await file.arrayBuffer());
    const siteId = c.get('siteId');
    const workspaceId = c.get('workspaceId');
    const prefix = workspaceId ? `${workspaceId}/${siteId}` : siteId;

    const fileData = await storage.upload({
      filename: file.name,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const otherData: any = {};
    formData.forEach((value, key) => {
      if (key !== 'file' && typeof value === 'string') {
        otherData[key] = value;
      }
    });

    const user = c.get('user');
    const now = new Date().toISOString();

    let data = {
      ...otherData,
      ...fileData,
      createdAt: now,
      updatedAt: now,
      createdBy: user?.sub ?? null,
      updatedBy: user?.sub ?? null,
    };

    // Run beforeChange hooks for upload too
    data = await executeFieldBeforeChange(this.collection.fields, data, null, user);
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      req: c.req,
      user,
      operation: 'create',
    });

    const doc = await config.db!.create({
      collection: this.collection.slug,
      data,
    });

    // Run afterChange hooks for uploads
    await runCollectionHooks(this.collection.hooks?.afterChange, {
      doc,
      user,
      req: c.req,
      operation: 'create',
    });

    // Run afterRead hooks
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc,
      req: c.req,
      user,
    });
    const finalDoc = await executeFieldAfterRead(this.collection.fields, readDoc, user);

    return c.json(finalDoc, 201);
  }

  async update(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const body = await c.req.json();
    const user = c.get('user');

    // Strip auth-only fields from general updates — use /change-password for that
    let data = { ...body };
    if (this.collection.auth) {
      delete data.password;
      delete data.oldPassword;
      delete data.confirmPassword;
    }

    Object.assign(data, {
      updatedAt: new Date().toISOString(),
      updatedBy: user?.sub ?? null,
    });

    const originalDoc = await db!.findOne({ collection: this.collection.slug, id });
    if (!originalDoc) return c.json({ message: 'Not Found' }, 404);

    let before: any = null;
    if (this.collection.audit) {
      before = originalDoc;
    }

    // Run beforeChange hooks (field-level then collection-level)
    data = await executeFieldBeforeChange(this.collection.fields, data, originalDoc, user);
    data = await runCollectionHooks(this.collection.hooks?.beforeChange, {
      data,
      doc: originalDoc,
      req: c.req,
      user,
      operation: 'update',
    });

    const doc = await db!.update({ collection: this.collection.slug, id, data });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'update',
        collection: this.collection.slug,
        documentId: id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before,
        after: doc,
      });
    }

    // Run afterChange collection hooks
    await runCollectionHooks(this.collection.hooks?.afterChange, {
      doc,
      previousDoc: originalDoc,
      user,
      req: c.req,
      operation: 'update',
    });

    // Run afterRead hooks
    const readDoc = await runCollectionHooks(this.collection.hooks?.afterRead, {
      doc,
      req: c.req,
      user,
    });
    const finalDoc = await executeFieldAfterRead(this.collection.fields, readDoc, user);

    return c.json(finalDoc);
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
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    if (!this.collection.auth) {
      return c.json({ message: 'This collection does not support authentication' }, 400);
    }

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const user = c.get('user');
    if (!user) return c.json({ message: 'Authentication required' }, 401);

    const body = await c.req.json().catch(() => null);
    const { oldPassword, newPassword, confirmPassword } = body ?? {};

    if (!newPassword) {
      return c.json({ message: 'newPassword is required' }, 400);
    }
    if (newPassword !== confirmPassword) {
      return c.json({ message: 'Passwords do not match' }, 400);
    }
    if (newPassword.length < 8) {
      return c.json({ message: 'Password must be at least 8 characters' }, 400);
    }

    const isAdmin = Array.isArray(user.roles) && user.roles.includes('admin');
    const isSelf = user.sub === id;

    if (!isAdmin && !isSelf) {
      return c.json({ message: 'You are not authorised to change this password' }, 403);
    }

    // Non-admins must verify their current password
    if (!isAdmin) {
      if (!oldPassword) {
        return c.json({ message: 'Current password is required' }, 400);
      }
      const existing = await db!.findOne({ collection: this.collection.slug, id });
      if (!existing) return c.json({ message: 'User not found' }, 404);

      const valid = await verifyPassword(oldPassword, existing.password);
      if (!valid) {
        return c.json({ message: 'Invalid current password' }, 400);
      }
    }

    const hashed = await hashPassword(newPassword);

    const doc = await db!.update({
      collection: this.collection.slug,
      id,
      data: {
        password: hashed,
        updatedAt: new Date().toISOString(),
        updatedBy: user.sub,
      },
    });

    if (this.collection.audit) {
      AuditService.log(db, {
        operation: 'update',
        collection: this.collection.slug,
        documentId: id,
        user: { id: user.sub, collection: user.collection, email: user.email },
        before: null,
        after: { id },
      });
    }

    return c.json({ success: true, message: 'Password updated successfully' });
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');
    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const user = c.get('user');

    const doc = await db!.findOne({ collection: this.collection.slug, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

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
    });

    await db!.delete({ collection: this.collection.slug, id });

    if (this.collection.audit && db) {
      AuditService.log(db, {
        operation: 'delete',
        collection: this.collection.slug,
        documentId: id,
        user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
        before,
        after: null,
      });
    }

    // Run afterDelete collection hook
    await runCollectionHooks(this.collection.hooks?.afterDelete, {
      id,
      doc,
      user,
      req: c.req,
    });

    return c.json({ message: 'Deleted' });
  }

  async deleteMany(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const user = c.get('user');

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
      const raw = c.req.queries('ids') ?? c.req.queries('ids[]') ?? [];
      ids = raw.filter(Boolean);
    }

    if (!ids.length) return c.json({ message: 'No IDs provided' }, 400);

    const deleted: string[] = [];
    const failed: { id: string; error: string }[] = [];

    for (const id of ids) {
      try {
        const doc = await db.findOne({ collection: this.collection.slug, id });
        if (!doc) {
          failed.push({ id, error: 'Not Found' });
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
        });

        await db.delete({ collection: this.collection.slug, id });
        deleted.push(id);

        if (this.collection.audit) {
          AuditService.log(db, {
            operation: 'delete',
            collection: this.collection.slug,
            documentId: id,
            user: user ? { id: user.sub, collection: user.collection, email: user.email } : undefined,
            before,
            after: null,
          });
        }

        // Run afterDelete hooks
        await runCollectionHooks(this.collection.hooks?.afterDelete, {
          id,
          doc,
          user,
          req: c.req,
        });
      } catch (err: any) {
        failed.push({ id, error: err?.message ?? 'Unknown error' });
      }
    }

    return c.json({
      message: `Deleted ${deleted.length} document(s)`,
      deleted,
      ...(failed.length ? { failed } : {}),
    });
  }

  async seed(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const body = await c.req.json();
    const initialData = body.data;

    if (!initialData || !Array.isArray(initialData)) {
      return c.json({ message: 'Invalid initial data' }, 400);
    }

    const result = await db.find({ collection: this.collection.slug, limit: 1 });
    if (result.total > 0) {
      return c.json({ message: 'Collection is not empty, skipping seed' });
    }

    console.log(`[dyrected/core] Auto-seeding collection: ${this.collection.slug}`);
    const createdDocs = [];
    for (const data of initialData) {
      const doc = await db.create({ collection: this.collection.slug, data });
      createdDocs.push(doc);
    }

    return c.json({ message: 'Seed successful', count: createdDocs.length }, 201);
  }
}
