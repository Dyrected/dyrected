import { Hono } from "hono";
import { DyrectedContext } from "./app.js";
import { DyrectedConfig } from "./types/index.js";
import { CollectionController } from "./controllers/collection.controller.js";
import { GlobalController } from "./controllers/global.controller.js";
import { MediaController } from "./controllers/media.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { PreviewController } from "./controllers/preview.controller.js";
import { requireAuth, optionalAuth } from "./middleware/auth.js";
import { generateOpenApi } from "./utils/openapi.js";
import { getSwaggerHtml } from "./utils/swagger.js";

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

    const resolveAccess = async (fn: any): Promise<boolean> => {
      if (!fn) return true;
      try {
        const result = await fn(accessArgs);
        return typeof result === 'boolean' ? result : !!result;
      } catch (err) {
        console.error('[dyrected/core] Access check failed:', err);
        return false;
      }
    };

    const filteredCollections = await Promise.all(collections
      .filter((col) => !siteId || col.shared || !col.siteId || col.siteId === siteId)
      .map(async (col) => ({
        slug: col.slug,
        labels: col.labels,
        access: {
          read: await resolveAccess(col.access?.read),
          create: await resolveAccess(col.access?.create),
          update: await resolveAccess(col.access?.update),
          delete: await resolveAccess(col.access?.delete),
        },
        fields: await Promise.all(col.fields.map(async (f) => ({
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
            read: await resolveAccess(f.access?.read),
            update: await resolveAccess(f.access?.update),
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
          read: await resolveAccess(glb.access?.read),
          update: await resolveAccess(glb.access?.update),
        },
        fields: await Promise.all(glb.fields.map(async (f) => ({
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
            read: await resolveAccess(f.access?.read),
            update: await resolveAccess(f.access?.update),
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

  app.get("/api/openapi.json", (c) => {
    return c.json(generateOpenApi(config));
  });

  app.get("/api/docs", (c) => {
    return c.html(getSwaggerHtml());
  });

  // 2. Media Routes (Conditional & Dynamic)
  if (config.storage) {
    const uploadCollections = config.collections.filter((c) => c.upload);

    // Register routes for each upload-enabled collection
    for (const col of uploadCollections) {
      const mediaController = new MediaController(col.slug);
      const prefix = `/api/collections/${col.slug}`;

      app.get(`${prefix}/media`, (c) => mediaController.find(c));
      app.post(`${prefix}/media`, (c) => mediaController.upload(c));
      app.delete(`${prefix}/media/:id`, (c) => mediaController.delete(c));
    }
  }

  // 3. Auth Routes — for collections with auth: true
  for (const collection of config.collections) {
    if (!collection.auth) continue;

    const path = `/api/collections/${collection.slug}`;
    const authController = new AuthController(collection);

    app.post(`${path}/login`, (c) => authController.login(c));
    app.post(`${path}/logout`, (c) => authController.logout(c));
    // /me and /refresh-token require a valid token
    app.get(`${path}/me`, requireAuth(), (c) => authController.me(c));
    app.post(`${path}/refresh-token`, requireAuth(), (c) => authController.refreshToken(c));
    app.post(`${path}/forgot-password`, (c) => authController.forgotPassword(c));
    app.post(`${path}/reset-password`, (c) => authController.resetPassword(c));
  }

  // 4. Collection Routes (Static)
  for (const collection of config.collections) {
    const path = `/api/collections/${collection.slug}`;
    const controller = new CollectionController(collection);

    app.get(path, (c) => controller.find(c));
    app.post(path, (c) => controller.create(c));
    app.post(`${path}/media`, (c) => controller.create(c));
    app.get(`${path}/:id`, (c) => controller.findOne(c));
    app.patch(`${path}/:id`, (c) => controller.update(c));
    app.delete(`${path}/:id`, (c) => controller.delete(c));
  }

  // 5. Global Routes (Static)
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    const controller = new GlobalController(global);

    app.get(path, (c) => controller.get(c));
    app.patch(path, (c) => controller.update(c));
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
          if (method === "DELETE") return controller.delete(c);
          if (method === "POST" && id === "media") return controller.create(c);
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
