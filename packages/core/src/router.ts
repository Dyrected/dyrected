import { Hono } from "hono";
import type { DyrectedContext } from "./app.js";
import type { DyrectedConfig } from "./types/index.js";
import { CollectionController } from "./controllers/collection.controller.js";
import { GlobalController } from "./controllers/global.controller.js";
import { MediaController } from "./controllers/media.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { PreviewController } from "./controllers/preview.controller.js";
import { requireAuth, optionalAuth } from "./middleware/auth.js";
import { generateOpenApi } from "./utils/openapi.js";
import { getSwaggerHtml } from "./utils/swagger.js";
import { evaluateAccess } from "./auth/jexl.js";

/**
 * Access gate middleware for granular permissions using Jexl.
 */
function accessGate(target: { slug: string; access?: any }, action: 'read' | 'create' | 'update' | 'delete') {
  return async (c: any, next: any) => {
    const user = c.get('user');
    const accessExpr = target.access?.[action];

    // If no access expression, default to public (true) for now to maintain parity with old behavior.
    // However, if we want to be secure by default, we could change this to false.
    if (accessExpr === undefined || accessExpr === null) {
      return await next();
    }

    const accessArgs = { user, req: c.req, doc: null };
    const allowed = await evaluateAccess(accessExpr, accessArgs);

    if (!allowed) {
      return c.json({ error: true, message: `Access denied: ${action} on ${target.slug}` }, 403);
    }

    await next();
  };
}

async function checkAccess(access: any, accessArgs: { user: any; req: any; doc: any }): Promise<boolean> {
  if (access === undefined || access === null) return true;
  if (typeof access === 'function') {
    try {
      const result = await access(accessArgs);
      return typeof result === 'boolean' ? result : !!result;
    } catch (err) {
      console.error('[dyrected/core] Functional access check failed:', err);
      return false;
    }
  }
  if (typeof access === 'string' || typeof access === 'boolean') {
    return evaluateAccess(access, accessArgs);
  }
  return true;
}

function serializeFieldForApi(f: any): any {
  if (!f) return f;
  const serialized = { ...f };
  if (serialized.admin?.hooks) {
    const hooks: Record<string, unknown> = { ...serialized.admin.hooks };
    if (typeof hooks.onChange === "function") {
      hooks.onChange = hooks.onChange.toString();
    }
    if (typeof hooks.options === "function") {
      hooks.options = hooks.options.toString();
    }
    serialized.admin = { ...serialized.admin, hooks };
  }
  if (typeof serialized.options === "function" || (serialized.options && typeof serialized.options === "object" && "resolve" in serialized.options)) {
    serialized.options = { _dynamic: true };
  }
  if (serialized.fields) {
    serialized.fields = serialized.fields.map(serializeFieldForApi);
  }
  if (serialized.blocks) {
    serialized.blocks = serialized.blocks.map((b: any) => ({
      ...b,
      fields: b.fields?.map(serializeFieldForApi),
    }));
  }
  return serialized;
}

/**
 * Register dynamic routes based on the provided configuration.
 */
export function registerRoutes(app: Hono<DyrectedContext>, config: DyrectedConfig) {
  // 1. Schema Endpoints
  // Used by the SDK and Admin to understand the content structure
  app.get("/api/schemas", optionalAuth(), async (c) => {
    const siteId = c.req.header("X-Site-Id");

    let collections = [...config.collections];
    let globals = [...config.globals];

    if (siteId && config.onSchemaFetch) {
      const dynamic = await config.onSchemaFetch(siteId);
      if (dynamic.collections) collections = [...collections, ...dynamic.collections];
      if (dynamic.globals) globals = [...globals, ...dynamic.globals];
      // Merge dynamic admin config if provided
      if ((dynamic as any).admin) {
        config.admin = { ...config.admin, ...(dynamic as any).admin };
      }
    }

    const user = c.get('user');
    const accessArgs = { user, req: c.req, doc: null };

    const serializeAccess = async (access: any): Promise<any> => {
      if (typeof access === 'string') return access;
      if (typeof access === 'boolean') return access;
      return checkAccess(access, accessArgs);
    };

    const filteredCollections = await Promise.all(collections
      .filter((col) => !siteId || col.shared || !col.siteId || col.siteId === siteId)
      .map(async (col) => ({
        slug: col.slug,
        labels: col.labels,
        access: {
          read: await serializeAccess(col.access?.read),
          create: await serializeAccess(col.access?.create),
          update: await serializeAccess(col.access?.update),
          delete: await serializeAccess(col.access?.delete),
        },
        fields: await Promise.all(col.fields.map(serializeFieldForApi).map(async (f: any) => ({
          name: f.name,
          type: f.type,
          label: f.label,
          required: f.required,
          defaultValue: f.defaultValue,
          options: f.options,
          relationTo: f.relationTo,
          hasMany: f.hasMany,
          fields: f.fields,
          blocks: f.blocks,
          admin: f.admin,
          access: {
            read: await serializeAccess(f.access?.read),
            update: await serializeAccess(f.access?.update),
          },
        }))),
        upload: !!col.upload,
        auth: !!col.auth,
        admin: col.admin,
      })));

    const filteredGlobals = await Promise.all(globals
      .filter((glb) => !siteId || glb.shared || !glb.siteId || glb.siteId === siteId)
      .map(async (glb) => ({
        slug: glb.slug,
        label: glb.label,
        access: {
          read: await serializeAccess(glb.access?.read),
          update: await serializeAccess(glb.access?.update),
        },
        fields: await Promise.all(glb.fields.map(serializeFieldForApi).map(async (f: any) => ({
          name: f.name,
          type: f.type,
          label: f.label,
          required: f.required,
          defaultValue: f.defaultValue,
          options: f.options,
          relationTo: f.relationTo,
          hasMany: f.hasMany,
          fields: f.fields,
          blocks: f.blocks,
          admin: f.admin,
          access: {
            read: await serializeAccess(f.access?.read),
            update: await serializeAccess(f.access?.update),
          },
        }))),
        admin: glb.admin,
      })));

    return c.json({
      collections: filteredCollections,
      globals: filteredGlobals,
      admin: config.admin || {},
    });
  });

  app.get("/api/dyrected/options/:collection/:field", optionalAuth(), async (c) => {
    const { collection: colSlug, field: fieldName } = c.req.param();
    const siteId = c.req.header("X-Site-Id");

    // Resolve collections
    let collections = [...config.collections];
    if (siteId && config.onSchemaFetch) {
      const dynamic = await config.onSchemaFetch(siteId);
      if (dynamic.collections) collections = [...collections, ...dynamic.collections];
    }

    const user = c.get('user');
    let collection = collections.find((col) => col.slug === colSlug);
    let field: any;

    if (collection) {
      // Check read access on collection
      const accessExpr = collection.access?.read;
      if (accessExpr !== undefined && accessExpr !== null) {
        const accessArgs = { user, req: c.req, doc: null };
        const allowed = await checkAccess(accessExpr, accessArgs);
        if (!allowed) {
          return c.json({ error: true, message: `Access denied: read on ${colSlug}` }, 403);
        }
      }
      field = collection.fields.find((f) => f.name === fieldName);
    } else {
      let globals = [...config.globals];
      if (siteId && config.onSchemaFetch) {
        const dynamic = await config.onSchemaFetch(siteId);
        if (dynamic.globals) globals = [...globals, ...dynamic.globals];
      }
      const glb = globals.find((g) => g.slug === colSlug);
      if (!glb) {
        return c.json({ error: true, message: `${colSlug} not found as collection or global` }, 404);
      }
      // Check read access on global
      const accessExpr = glb.access?.read;
      if (accessExpr !== undefined && accessExpr !== null) {
        const accessArgs = { user, req: c.req, doc: null };
        const allowed = await checkAccess(accessExpr, accessArgs);
        if (!allowed) {
          return c.json({ error: true, message: `Access denied: read on global ${colSlug}` }, 403);
        }
      }
      field = glb.fields.find((f) => f.name === fieldName);
    }

    if (!field) {
      return c.json({ error: true, message: `Field ${fieldName} not found in ${colSlug}` }, 404);
    }

    // Get the resolver
    let resolver: any;
    if (typeof field.options === "function") {
      resolver = field.options;
    } else if (field.options && typeof field.options === "object" && "resolve" in field.options) {
      resolver = field.options.resolve;
    }

    if (!resolver) {
      return c.json({ error: true, message: `Field ${fieldName} in ${colSlug} is not dynamic` }, 400);
    }

    try {
      const db = (c as any).get("db") || (config.db as any);
      // Construct a request query helper
      const queryParams = c.req.query();
      const reqContext = {
        query: queryParams,
        headers: c.req.header(),
        raw: c.req.raw,
      };

      const result = await resolver({
        db,
        user,
        req: reqContext,
      });

      return c.json(result);
    } catch (err: any) {
      console.error(`[dyrected/core] Failed to resolve dynamic options for field ${fieldName}:`, err);
      return c.json({ error: true, message: err.message || "Failed to resolve dynamic options" }, 500);
    }
  });

  app.get("/api/openapi.json", (c) => {
    return c.json(generateOpenApi(config));
  });

  app.get("/api/docs", (c) => {
    return c.html(getSwaggerHtml());
  });

  // Global Media Fallback (Proxies to the 'media' collection)
  app.get("/api/media/:filename{.+$}", async (c) => {
    const mediaController = new MediaController("media");
    return mediaController.serve(c);
  });

  app.get("/media/:filename{.+$}", async (c) => {
    const mediaController = new MediaController("media");
    return mediaController.serve(c);
  });

  // 2. Media Routes (Conditional & Dynamic)
  if (config.storage) {
    const uploadCollections = config.collections.filter((c) => c.upload);

    // Register routes for each upload-enabled collection
    for (const col of uploadCollections) {
      const mediaController = new MediaController(col.slug);
      const prefix = `/api/collections/${col.slug}`;

      app.get(`${prefix}/media`, accessGate(col, 'read'), (c) => mediaController.find(c));
      app.get(`${prefix}/media/:filename{.+$}`, (c) => mediaController.serve(c));
      app.post(`${prefix}/media`, accessGate(col, 'create'), (c) => mediaController.upload(c));
      app.delete(`${prefix}/media/:id`, accessGate(col, 'delete'), (c) => mediaController.delete(c));
    }
  }

  // 3. Auth Routes — for collections with auth: true
  for (const collection of config.collections) {
    if (!collection.auth) continue;

    const path = `/api/collections/${collection.slug}`;
    const authController = new AuthController(collection);

    app.post(`${path}/login`, (c) => authController.login(c));
    app.post(`${path}/logout`, (c) => authController.logout(c));
    app.get(`${path}/init`, (c) => authController.init(c));
    app.post(`${path}/first-user`, (c) => authController.registerFirstUser(c));
    // /me and /refresh-token require a valid token
    app.get(`${path}/me`, requireAuth(), (c) => authController.me(c));
    app.post(`${path}/refresh-token`, requireAuth(), (c) => authController.refreshToken(c));
    app.post(`${path}/forgot-password`, (c) => authController.forgotPassword(c));
    app.post(`${path}/reset-password`, (c) => authController.resetPassword(c));
    app.post(`${path}/invite`, requireAuth(), (c) => authController.invite(c));
    app.post(`${path}/accept-invite`, (c) => authController.acceptInvite(c));
  }

  // 4. Collection Routes (Static)
  for (const collection of config.collections) {
    const path = `/api/collections/${collection.slug}`;
    const controller = new CollectionController(collection);

    app.get(path, accessGate(collection, 'read'), (c) => controller.find(c));
    app.post(path, accessGate(collection, 'create'), (c) => controller.create(c));
    app.post(`${path}/media`, accessGate(collection, 'create'), (c) => controller.create(c));
    // delete-many must be registered before /:id to avoid the wildcard swallowing it
    app.delete(`${path}/delete-many`, accessGate(collection, 'delete'), (c) => controller.deleteMany(c));
    app.get(`${path}/:id`, accessGate(collection, 'read'), (c) => controller.findOne(c));
    app.patch(`${path}/:id`, accessGate(collection, 'update'), (c) => controller.update(c));
    app.delete(`${path}/:id`, accessGate(collection, 'delete'), (c) => controller.delete(c));
    app.post(`${path}/seed`, (c) => controller.seed(c));
    // Dedicated password-change endpoint (auth collections only)
    if (collection.auth) {
      app.post(`${path}/:id/change-password`, requireAuth(), (c) => controller.changePassword(c));
    }
  }

  // 5. Global Routes (Static)
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    const controller = new GlobalController(global);

    app.get(path, accessGate(global, 'read'), (c) => controller.get(c));
    app.patch(path, accessGate(global, 'update'), (c) => controller.update(c));
    app.post(`${path}/seed`, (c) => controller.seed(c));
  }

  // 6. Preview Routes
  const previewController = new PreviewController();
  app.post("/api/preview-token", requireAuth(), (c) => previewController.createToken(c));
  app.get("/api/preview-data", (c) => previewController.getData(c));

  // 7. Dynamic Routes (Tenant-specific)
  // This handles collections/globals defined via sync:schema and fetched via onSchemaFetch
  app.all("/api/collections/:slug/:id?", async (c) => {
    const slug = c.req.param("slug");
    const id = c.req.param("id");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    // Skip if static (already handled by routes above)
    if (config.collections.some((col) => col.slug === slug)) {
      return c.json({ message: "Method Not Allowed" }, 405);
    }

    if (config.onSchemaFetch && siteId) {
      const dynamic = await config.onSchemaFetch(siteId);
      let collection = dynamic.collections?.find((col) => col.slug === slug);

      if (!collection && slug === "media") {
        collection = {
          slug: "media",
          labels: { singular: "Media", plural: "Media" },
          upload: true,
          fields: [],
        };
      }

      if (collection) {
        // Handle auth sub-routes for dynamic auth collections
        if (collection.auth && id) {
          const authController = new AuthController(collection);
          const method = c.req.method;
          if (method === "POST" && id === "login") return authController.login(c);
          if (method === "POST" && id === "logout") return authController.logout(c);
          if (method === "GET" && id === "me") return authController.me(c);
          if (method === "POST" && id === "refresh-token") return authController.refreshToken(c);
          if (method === "POST" && id === "forgot-password") return authController.forgotPassword(c);
          if (method === "POST" && id === "reset-password") return authController.resetPassword(c);
        }

        const controller = new CollectionController(collection);
        const method = c.req.method;

        if (id) {
          if (method === "GET") return controller.findOne(c);
          if (method === "PATCH") return controller.update(c);
          if (method === "DELETE" && id === "delete-many") return controller.deleteMany(c);
          if (method === "DELETE") return controller.delete(c);
          if (method === "POST" && id === "media") return controller.create(c);
          if (method === "POST" && id === "seed") return controller.seed(c);
        } else {
          if (method === "GET") return controller.find(c);
          if (method === "POST") return controller.create(c);
        }
      }
    }

    return c.json({ message: `Collection "${slug}" not found` }, 404);
  });

  app.all("/api/globals/:slug", async (c) => {
    const slug = c.req.param("slug");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    // Skip if static
    if (config.globals.some((glb) => glb.slug === slug)) {
      return c.json({ message: "Method Not Allowed" }, 405);
    }

    if (config.onSchemaFetch && siteId) {
      const dynamic = await config.onSchemaFetch(siteId);
      const global = dynamic.globals?.find((glb) => glb.slug === slug);

      if (global) {
        const controller = new GlobalController(global);
        if (c.req.method === "GET") return controller.get(c);
        if (c.req.method === "PATCH") return controller.update(c);
      }
    }

    return c.json({ message: `Global "${slug}" not found` }, 404);
  });
}
