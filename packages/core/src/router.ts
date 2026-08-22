import { Hono } from "hono";
import type { DyrectedContext } from "./app.js";
import type { DyrectedConfig } from "./types/index.js";
import { CollectionController } from "./controllers/collection.controller.js";
import { GlobalController } from "./controllers/global.controller.js";
import { MediaController } from "./controllers/media.controller.js";
import { AuthController } from "./controllers/auth.controller.js";
import { AdminAuthController } from "./controllers/admin-auth.controller.js";
import { PreviewController } from "./controllers/preview.controller.js";
import { AuditController } from "./controllers/audit.controller.js";
import { requireAuth, optionalAuth } from "./middleware/auth.js";
import { generateOpenApi } from "./utils/openapi.js";
import { getSwaggerHtml } from "./utils/swagger.js";
import { getPublicAdminAuthConfig } from "./utils/admin-auth.js";
import { mergeDynamicConfig } from "./utils/block-references.js";
import { resolveBooleanAccess, toHookRequestContext } from "./utils/access-control.js";
import {
  assertValidAdminConditionsInConfig,
  assertValidDeclarativeAccessInConfig,
  assertValidDeclarativeHooksInConfig,
  assertValidPreviewUrlsInConfig,
  collectConfigDiagnostics,
} from "./utils/declarative-hooks.js";
import { getConfigLogger, getRequestLogger } from "./observability.js";

const SERIALIZED_ADMIN_HOOK_PREFIX = "__dyrected_fn__:";

/**
 * Access gate middleware for granular permissions using Jexl.
 */
function accessGate(
  config: DyrectedConfig,
  target: { slug: string; access?: any },
  action: "read" | "create" | "update" | "delete",
) {
  return async (c: any, next: any) => {
    const user = c.get("user");
    const accessExpr = target.access?.[action];

    // If no access expression, default to public (true) for now to maintain parity with old behavior.
    // However, if we want to be secure by default, we could change this to false.
    if (accessExpr === undefined || accessExpr === null) {
      return await next();
    }

    const allowed = await resolveBooleanAccess(config, accessExpr, {
      user,
      req: toHookRequestContext(c.req),
    });

    if (!allowed) {
      return c.json({ error: true, message: `Access denied: ${action} on ${target.slug}` }, 403);
    }

    await next();
  };
}

function serializeFieldForApi(f: any): any {
  if (!f) return f;
  const serialized = { ...f };
  if (serialized.admin?.hooks) {
    const hooks: Record<string, unknown> = { ...serialized.admin.hooks };
    if (typeof hooks.onChange === "function") {
      hooks.onChange = `${SERIALIZED_ADMIN_HOOK_PREFIX}${hooks.onChange.toString()}`;
    }
    if (typeof hooks.options === "function") {
      hooks.options = hooks.options.toString();
    }
    serialized.admin = { ...serialized.admin, hooks };
  }
  if (
    typeof serialized.options === "function" ||
    (serialized.options && typeof serialized.options === "object" && "resolve" in serialized.options)
  ) {
    serialized.options = { _dynamic: true };
  }
  if (serialized.fields) {
    serialized.fields = serialized.fields.map(serializeFieldForApi);
  }
  if (serialized.blocks && !serialized.blockReferences?.length) {
    serialized.blocks = serialized.blocks.map((b: any) => ({
      ...b,
      fields: b.fields?.map(serializeFieldForApi),
    }));
  } else if (serialized.blockReferences?.length) {
    delete serialized.blocks;
  }
  return serialized;
}

function serializeBlockForApi(block: any): any {
  return {
    ...block,
    fields: block.fields?.map(serializeFieldForApi),
  };
}

function serializeDetailItemForApi(item: any): any {
  if (!item) return item;
  if (typeof item === "string") {
    return { type: "field", field: item };
  }
  if (item.type === "section") {
    return {
      type: "section",
      title: item.title,
      items: (item.items || []).map(serializeDetailItemForApi),
      options: item.options,
    };
  }
  if (item.type === "tab") {
    return {
      type: "tab",
      label: item.label,
      items: (item.items || []).map(serializeDetailItemForApi),
      options: item.options,
    };
  }
  if (item.type === "tabs") {
    return {
      type: "tabs",
      tabs: (item.tabs || []).map(serializeDetailItemForApi),
      options: item.options,
    };
  }
  if (item.type === "grid") {
    return {
      type: "grid",
      columns: item.columns,
      items: (item.items || []).map(serializeDetailItemForApi),
      options: item.options,
    };
  }
  if (item.type === "repeat") {
    return {
      type: "repeat",
      field: item.field,
      items: (item.items || []).map(serializeDetailItemForApi),
      options: item.options,
    };
  }
  if (item.type === "computed") {
    return {
      type: "computed",
      id: item.id || item.label?.toLowerCase().replace(/[^a-z0-9]+/g, "_"),
      label: item.label,
      expression: item.expression,
      options: {
        id: item.id,
        span: item.options?.span,
        format: item.options?.format,
        currency: item.options?.currency,
        visible: item.options?.visible,
      },
    };
  }
  if (item.type === "field") {
    return {
      type: "field",
      field: item.field,
      options: item.options,
    };
  }
  return item;
}

export function serializeDetailForApi(detail?: any): any {
  if (detail === false) return false;
  if (detail === true) return true;
  if (!detail || !Array.isArray(detail)) return undefined;
  return detail.map(serializeDetailItemForApi);
}

/**
 * Serializes an operational view config for the Admin API.
 * Function properties (action handlers) are stripped so the payload stays
 * JSON-safe; access rules are resolved to static values the admin can evaluate.
 */
export async function serializeViewForApi(view: any, serializeAccess: (access: any) => Promise<any>): Promise<any> {
  if (!view) return view;
  const serializeAccessConfig = async (access: any): Promise<any> => {
    if (!access) return undefined;
    const serialized: Record<string, unknown> = {};
    for (const key of ["read", "create", "update", "delete"] as const) {
      if (access[key] !== undefined) serialized[key] = await serializeAccess(access[key]);
    }
    return serialized;
  };
  return {
    slug: view.slug,
    label: view.label,
    icon: view.icon,
    layout: view.layout ?? "table",
    filter: view.filter,
    groupBy: view.groupBy,
    dateField: view.dateField,
    startDateField: view.startDateField,
    endDateField: view.endDateField,
    columns: view.columns,
    sort: view.sort,
    metrics: view.metrics,
    actions: await Promise.all(
      (view.actions || []).map(async (action: any) => ({
        name: action.name,
        label: action.label,
        icon: action.icon,
        type: action.type ?? "row",
        confirm: action.confirm,
        fields: action.fields?.map(serializeFieldForApi),
        mutation: action.mutation,
        // Self-hosted handlers are intentionally omitted: they never leave the server.
        access: action.access ? await serializeAccessConfig(action.access) : undefined,
      })),
    ),
    access: view.access ? await serializeAccessConfig(view.access) : undefined,
  };
}

/**
 * Register dynamic routes based on the provided configuration.
 */
export function registerRoutes(app: Hono<DyrectedContext>, config: DyrectedConfig) {
  // Per-app cache for dynamic option resolvers that opt in via `cacheTTL`.
  // Scoped to this config so tests and multi-tenant setups stay isolated.
  const optionsCache = new Map<string, { expires: number; value: unknown }>();

  // 1. Schema Endpoints
  // Used by the SDK and Admin to understand the content structure
  app.get("/api/schemas", optionalAuth(config), async (c) => {
    const siteId = c.req.header("X-Site-Id");
    const requestConfig =
      siteId && config.onSchemaFetch ? mergeDynamicConfig(config, await config.onSchemaFetch(siteId)) : config;
    assertValidDeclarativeHooksInConfig(requestConfig, "/api/schemas");
    assertValidDeclarativeAccessInConfig(requestConfig, "/api/schemas");
    assertValidAdminConditionsInConfig(requestConfig, "/api/schemas");
    assertValidPreviewUrlsInConfig(requestConfig, "/api/schemas");
    const collections = [...requestConfig.collections];
    const globals = [...requestConfig.globals];

    const user = c.get("user");
    const accessArgs = { user, req: toHookRequestContext(c.req) };

    const serializeAccess = async (access: any): Promise<any> => {
      if (typeof access === "string") return access;
      if (typeof access === "boolean") return access;
      // Named policies: inline a string/boolean policy so the admin evaluates it
      // live against the form; resolve function policies to a static boolean.
      if (access && typeof access === "object" && typeof access.policy === "string") {
        const policy = requestConfig.accessPolicies?.[access.policy];
        if (typeof policy === "string" || typeof policy === "boolean") return policy;
      }
      return resolveBooleanAccess(requestConfig, access, accessArgs);
    };

    const filteredCollections = await Promise.all(
      collections
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
          fields: await Promise.all(
            col.fields.map(serializeFieldForApi).map(async (f: any) => ({
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
              blockReferences: f.blockReferences,
              collection: f.collection,
              on: f.on,
              limit: f.limit,
              admin: f.admin,
              access: {
                read: await serializeAccess(f.access?.read),
                create: await serializeAccess(f.access?.create),
                update: await serializeAccess(f.access?.update),
              },
            })),
          ),
          upload: !!col.upload,
          auth: !!col.auth,
          audit: !!col.audit,
          drafts: !!col.drafts,
          views: await Promise.all((col.views || []).map((view: any) => serializeViewForApi(view, serializeAccess))),
          admin: col.admin,
          detail: serializeDetailForApi(col.detail),
          workflow: col.workflow
            ? {
                initialState: col.workflow.initialState,
                draftState: col.workflow.draftState,
                states: col.workflow.states,
                transitions: col.workflow.transitions.map((t) => ({
                  name: t.name,
                  label: t.label,
                  from: t.from,
                  to: t.to,
                  requiredCapabilities: t.requiredCapabilities,
                  requireComment: t.requireComment,
                  unpublish: t.unpublish,
                })),
                roles: col.workflow.roles,
              }
            : undefined,
        })),
    );

    const filteredGlobals = await Promise.all(
      globals
        .filter((glb) => !siteId || glb.shared || !glb.siteId || glb.siteId === siteId)
        .map(async (glb) => ({
          slug: glb.slug,
          label: glb.label,
          access: {
            read: await serializeAccess(glb.access?.read),
            update: await serializeAccess(glb.access?.update),
          },
          fields: await Promise.all(
            glb.fields.map(serializeFieldForApi).map(async (f: any) => ({
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
              blockReferences: f.blockReferences,
              collection: f.collection,
              on: f.on,
              limit: f.limit,
              admin: f.admin,
              access: {
                read: await serializeAccess(f.access?.read),
                update: await serializeAccess(f.access?.update),
              },
            })),
          ),
          admin: glb.admin,
          detail: serializeDetailForApi(glb.detail),
        })),
    );

    return c.json({
      blocks: requestConfig.blocks?.map(serializeBlockForApi),
      collections: filteredCollections,
      globals: filteredGlobals,
      admin: requestConfig.admin || {},
      adminAuth: getPublicAdminAuthConfig(requestConfig.adminAuth, collections),
      hasStorage: !!requestConfig.storage,
      configDiagnostics: collectConfigDiagnostics(requestConfig),
      adminHealth: {
        emailConfigured: !!requestConfig.email,
        secureAuthSecretConfigured: !!process.env.DYRECTED_JWT_SECRET,
        authCollectionConfigured: requestConfig.collections.some((collection) => !!collection.auth),
        uploadCollectionConfigured: requestConfig.collections.some((collection) => !!collection.upload),
      },
    });
  });

  app.get("/api/dyrected/options/:collection/:field", optionalAuth(config), async (c) => {
    const { collection: colSlug, field: fieldName } = c.req.param();
    const siteId = c.req.header("X-Site-Id");

    // Resolve collections
    const requestConfig =
      siteId && config.onSchemaFetch ? mergeDynamicConfig(config, await config.onSchemaFetch(siteId)) : config;
    const collections = [...requestConfig.collections];

    const user = c.get("user");
    const collection = collections.find((col) => col.slug === colSlug);
    let field: any;

    if (collection) {
      // Check read access on collection
      const accessExpr = collection.access?.read;
      if (accessExpr !== undefined && accessExpr !== null) {
        const allowed = await resolveBooleanAccess(config, accessExpr, {
          user,
          req: toHookRequestContext(c.req),
        });
        if (!allowed) {
          return c.json({ error: true, message: `Access denied: read on ${colSlug}` }, 403);
        }
      }
      field = collection.fields.find((f) => f.name === fieldName);
    } else {
      const globals = [...requestConfig.globals];
      const glb = globals.find((g) => g.slug === colSlug);
      if (!glb) {
        return c.json(
          {
            error: true,
            message: `${colSlug} not found as collection or global`,
          },
          404,
        );
      }
      // Check read access on global
      const accessExpr = glb.access?.read;
      if (accessExpr !== undefined && accessExpr !== null) {
        const allowed = await resolveBooleanAccess(config, accessExpr, {
          user,
          req: toHookRequestContext(c.req),
        });
        if (!allowed) {
          return c.json(
            {
              error: true,
              message: `Access denied: read on global ${colSlug}`,
            },
            403,
          );
        }
      }
      field = glb.fields.find((f) => f.name === fieldName);
    }

    if (!field) {
      return c.json(
        {
          error: true,
          message: `Field ${fieldName} not found in ${colSlug}`,
        },
        404,
      );
    }

    // Get the resolver
    let resolver: any;
    let cacheTTL: number | undefined;
    if (typeof field.options === "function") {
      resolver = field.options;
    } else if (field.options && typeof field.options === "object" && "resolve" in field.options) {
      resolver = field.options.resolve;
      cacheTTL = (field.options as { cacheTTL?: number }).cacheTTL;
    }

    if (!resolver) {
      return c.json(
        {
          error: true,
          message: `Field ${fieldName} in ${colSlug} is not dynamic`,
        },
        400,
      );
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

      // When the resolver opts into caching, key the result by the inputs that
      // change it: the field, the query params, and the requesting user (so a
      // user-scoped resolver never serves another user's options).
      const shouldCache = typeof cacheTTL === "number" && cacheTTL > 0;
      let cacheKey = "";
      if (shouldCache) {
        cacheKey = JSON.stringify([
          siteId ?? "",
          colSlug,
          fieldName,
          (user as { id?: unknown } | undefined)?.id ?? null,
          queryParams,
        ]);
        const hit = optionsCache.get(cacheKey);
        if (hit && hit.expires > Date.now()) {
          return c.json(hit.value);
        }
      }

      const result = await resolver({
        db,
        user,
        req: reqContext,
      });

      if (shouldCache) {
        optionsCache.set(cacheKey, {
          expires: Date.now() + (cacheTTL as number) * 1000,
          value: result,
        });
      }

      return c.json(result);
    } catch (err: any) {
      getRequestLogger(c, "router").error({
        err,
        msg: "Failed to resolve dynamic field options",
        fieldName,
      });
      return c.json(
        {
          error: true,
          message: err.message || "Failed to resolve dynamic options",
        },
        500,
      );
    }
  });

  app.get("/api/openapi.json", (c) => {
    return c.json(generateOpenApi(config));
  });

  app.get("/api/docs", (c) => {
    return c.html(getSwaggerHtml());
  });

  app.get("/api/preferences/:key", optionalAuth(config), async (c) => {
    const db = config.db;
    const user = c.get("user");
    const key = c.req.param("key");
    const scope = c.req.query("scope");

    if (!db) return c.json({ message: "Database not configured" }, 500);
    if (!key) return c.json({ error: true, message: "Preference key is required." }, 400);

    const getGlobalPreference = async () => {
      const globalDoc = await db.findOne({
        collection: "__global_preferences",
        id: key,
      });
      return globalDoc ? globalDoc.value : null;
    };

    if (scope === "global" || !user?.collection || !user.sub) {
      const globalValue = await getGlobalPreference();
      return c.json({ key, value: globalValue });
    }

    const doc = await db.findOne({ collection: user.collection, id: user.sub });
    if (!doc) {
      const globalValue = await getGlobalPreference();
      return c.json({ key, value: globalValue });
    }

    const preferences =
      typeof doc.__preferences === "object" && doc.__preferences !== null
        ? (doc.__preferences as Record<string, unknown>)
        : {};

    if (key in preferences) {
      return c.json({ key, value: preferences[key] ?? null });
    }

    const globalValue = await getGlobalPreference();
    return c.json({ key, value: globalValue });
  });

  app.put("/api/preferences/:key", requireAuth(config), async (c) => {
    const db = config.db;
    const user = c.get("user");
    const key = c.req.param("key");
    const scope = c.req.query("scope");

    if (!db) return c.json({ message: "Database not configured" }, 500);
    if (!user?.collection || !user.sub) return c.json({ error: true, message: "Authentication required." }, 401);
    if (!key) return c.json({ error: true, message: "Preference key is required." }, 400);

    const body = await c.req.json().catch(() => ({}));

    if (scope === "global") {
      const isAdminUser = Array.isArray(user?.roles) && user.roles.includes("admin");
      if (!isAdminUser) {
        return c.json(
          {
            error: true,
            message: "Only administrators can save global preferences.",
          },
          403,
        );
      }

      const existing = await db.findOne({
        collection: "__global_preferences",
        id: key,
      });
      if (existing) {
        await db.update({
          collection: "__global_preferences",
          id: key,
          data: { value: body.value },
        });
      } else {
        await db.create({
          collection: "__global_preferences",
          data: { id: key, value: body.value },
        });
      }

      return c.json({ key, value: body.value });
    }

    const doc = await db.findOne({ collection: user.collection, id: user.sub });
    if (!doc) return c.json({ error: true, message: "User not found." }, 404);

    const preferences =
      typeof doc.__preferences === "object" && doc.__preferences !== null
        ? (doc.__preferences as Record<string, unknown>)
        : {};
    const nextPreferences = { ...preferences, [key]: body.value };

    await db.update({
      collection: user.collection,
      id: user.sub,
      data: { __preferences: nextPreferences },
    });

    return c.json({ key, value: body.value });
  });

  app.delete("/api/preferences/:key", requireAuth(config), async (c) => {
    const db = config.db;
    const user = c.get("user");
    const key = c.req.param("key");
    const scope = c.req.query("scope");

    if (!db) return c.json({ message: "Database not configured" }, 500);
    if (!user?.collection || !user.sub) return c.json({ error: true, message: "Authentication required." }, 401);
    if (!key) return c.json({ error: true, message: "Preference key is required." }, 400);

    if (scope === "global") {
      const isAdminUser = Array.isArray(user?.roles) && user.roles.includes("admin");
      if (!isAdminUser) {
        return c.json(
          {
            error: true,
            message: "Only administrators can delete global preferences.",
          },
          403,
        );
      }
      await db.delete({ collection: "__global_preferences", id: key });
      return c.json({ success: true });
    }

    const doc = await db.findOne({ collection: user.collection, id: user.sub });
    if (!doc) return c.json({ error: true, message: "User not found." }, 404);

    const preferences =
      typeof doc.__preferences === "object" && doc.__preferences !== null
        ? { ...(doc.__preferences as Record<string, unknown>) }
        : {};

    delete preferences[key];

    await db.update({
      collection: user.collection,
      id: user.sub,
      data: { __preferences: preferences },
    });

    return c.json({ success: true });
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

      app.get(`${prefix}/media`, accessGate(config, col, "read"), (c) => mediaController.find(c));
      app.get(`${prefix}/media/:filename{.+$}`, (c) => mediaController.serve(c));
      app.post(`${prefix}/media`, accessGate(config, col, "create"), (c) => mediaController.upload(c));
      app.delete(`${prefix}/media/:id`, accessGate(config, col, "delete"), (c) => mediaController.delete(c));
    }
  }

  // 2b. Admin Auth Routes
  const adminAuthController = new AdminAuthController(config);
  app.get("/api/admin/auth/providers", (c) => adminAuthController.providers(c));
  app.get("/api/admin/auth/:provider/start", (c) => adminAuthController.start(c));
  app.get("/api/admin/auth/:provider/callback", (c) => adminAuthController.callback(c));
  app.post("/api/admin/auth/:provider/exchange", (c) => adminAuthController.exchange(c));
  app.post("/api/admin/logout", (c) => adminAuthController.logout(c));

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
    app.get(`${path}/me`, requireAuth(config), (c) => authController.me(c));
    app.post(`${path}/refresh-token`, requireAuth(config), (c) => authController.refreshToken(c));
    app.post(`${path}/forgot-password`, (c) => authController.forgotPassword(c));
    app.post(`${path}/reset-password`, (c) => authController.resetPassword(c));
    app.post(`${path}/invite`, requireAuth(config), (c) => authController.invite(c));
    app.post(`${path}/accept-invite`, (c) => authController.acceptInvite(c));
  }

  // 4. Collection Routes (Static)
  const auditController = new AuditController();
  for (const collection of config.collections) {
    const path = `/api/collections/${collection.slug}`;
    const controller = new CollectionController(collection);

    app.get(path, (c) => controller.find(c));
    app.post(path, (c) => controller.create(c));
    app.post(`${path}/media`, (c) => controller.create(c));
    // delete-many and aggregate must be registered before /:id to avoid the wildcard swallowing them
    app.delete(`${path}/delete-many`, (c) => controller.deleteMany(c));
    app.post(`${path}/aggregate`, (c) => controller.aggregate(c));
    // Operational view actions — only registered when the collection defines views
    if (collection.views?.length) {
      app.post(`${path}/views/:viewSlug/actions/:action`, optionalAuth(config), (c) => controller.runViewAction(c));
      app.post(`${path}/actions/:action`, optionalAuth(config), (c) => controller.runViewAction(c));
    }
    if (collection.audit) {
      app.get(`${path}/__audit`, (c) => auditController.findForCollection(c, collection));
    }
    app.get(`${path}/:id`, (c) => controller.findOne(c));
    app.patch(`${path}/:id`, (c) => controller.update(c));
    app.delete(`${path}/:id`, (c) => controller.delete(c));
    // Dedicated password-change endpoint (auth collections only)
    if (collection.auth) {
      app.post(`${path}/:id/change-password`, requireAuth(config), (c) => controller.changePassword(c));
    }
    // Workflow routes — only registered when the collection has a workflow configured
    if (collection.workflow) {
      app.post(`${path}/:id/transitions/:transition`, requireAuth(config), (c) => controller.transition(c));
      app.get(`${path}/:id/workflow-history`, requireAuth(config), (c) => controller.workflowHistory(c));
    }
  }

  // 5. Global Routes (Static)
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    const controller = new GlobalController(global);

    app.get(path, (c) => controller.get(c));
    app.patch(path, (c) => controller.update(c));
  }

  // 6. Preview Routes
  if (!process.env.DYRECTED_JWT_SECRET) {
    getConfigLogger(config, "router").warn({
      msg: "DYRECTED_JWT_SECRET is not set; token-mode live preview is signing with an insecure default",
    });
  }
  const previewController = new PreviewController();
  app.post("/api/preview-token", requireAuth(config), (c) => previewController.createToken(c));
  app.get("/api/preview-data", (c) => previewController.getData(c));
  app.get("/api/audit", (c) => auditController.findAll(c));

  // 7. Dynamic Routes (Tenant-specific)
  // This handles collections/globals defined via sync:schema and fetched via onSchemaFetch

  // 7a. Audit and workflow sub-routes for dynamic tenant collections.
  // Must be registered BEFORE the /:id? catch-all so Hono doesn't swallow deeper paths.
  // Pattern: GET  /api/collections/:slug/__audit
  //          POST /api/collections/:slug/:id/transitions/:transition
  //          GET  /api/collections/:slug/:id/workflow-history
  app.get("/api/collections/:slug/__audit", async (c) => {
    const slug = c.req.param("slug");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    if (config.collections.some((col) => col.slug === slug)) {
      return c.json({ message: "Not Found" }, 404);
    }

    if (!config.onSchemaFetch || !siteId) {
      return c.json({ message: `Collection "${slug}" not found` }, 404);
    }

    const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
    const collection = requestConfig.collections.find((col) => col.slug === slug);
    if (!collection?.audit) {
      return c.json({ message: `Collection "${slug}" not found or has no audit log` }, 404);
    }

    return auditController.findForCollection(c, collection);
  });

  app.post("/api/collections/:slug/:id/transitions/:transition", requireAuth(config), async (c) => {
    const slug = c.req.param("slug");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    // Skip if static — static workflow routes are registered directly above;
    // if this wildcard fires for a static slug it means the sub-path is unknown.
    if (config.collections.some((col) => col.slug === slug)) {
      return c.json({ message: "Not Found" }, 404);
    }

    if (!config.onSchemaFetch || !siteId) {
      return c.json({ message: `Collection "${slug}" not found` }, 404);
    }

    const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
    const collection = requestConfig.collections.find((col) => col.slug === slug);
    if (!collection?.workflow) {
      return c.json({ message: `Collection "${slug}" not found or has no workflow` }, 404);
    }

    const controller = new CollectionController(collection);
    return controller.transition(c);
  });

  app.get("/api/collections/:slug/:id/workflow-history", requireAuth(config), async (c) => {
    const slug = c.req.param("slug");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    if (config.collections.some((col) => col.slug === slug)) {
      return c.json({ message: "Not Found" }, 404);
    }

    if (!config.onSchemaFetch || !siteId) {
      return c.json({ message: `Collection "${slug}" not found` }, 404);
    }

    const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
    const collection = requestConfig.collections.find((col) => col.slug === slug);
    if (!collection?.workflow) {
      return c.json({ message: `Collection "${slug}" not found or has no workflow` }, 404);
    }

    const controller = new CollectionController(collection);
    return controller.workflowHistory(c);
  });

  // 7b. Core dynamic catch-all for tenant collections (list, create, findOne, update, delete).
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
      const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
      let collection = requestConfig.collections.find((col) => col.slug === slug);

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
        } else {
          if (method === "GET") return controller.find(c);
          if (method === "POST") return controller.create(c);
        }
      }
    }

    return c.json({ message: `Collection "${slug}" not found` }, 404);
  });

  app.all("/api/globals/:slug/:id?", async (c) => {
    const slug = c.req.param("slug");
    const id = c.req.param("id");
    const siteId = c.req.header("X-Site-Id") || c.get("siteId");
    const config = c.get("config");

    // Skip if static
    if (config.globals.some((glb) => glb.slug === slug)) {
      return c.json({ message: "Method Not Allowed" }, 405);
    }

    if (config.onSchemaFetch && siteId) {
      const requestConfig = mergeDynamicConfig(config, await config.onSchemaFetch(siteId));
      const global = requestConfig.globals.find((glb) => glb.slug === slug);

      if (global) {
        const controller = new GlobalController(global);
        const method = c.req.method;
        if (!id) {
          if (method === "GET") return controller.get(c);
          if (method === "PATCH") return controller.update(c);
        }
      }
    }

    return c.json({ message: `Global "${slug}" not found` }, 404);
  });
}
