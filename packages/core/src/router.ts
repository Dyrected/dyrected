import { Hono } from 'hono';
import { DyrectedContext } from './app.js';
import { DyrectedConfig } from './types/index.js';
import { CollectionController } from './controllers/collection.controller.js';
import { GlobalController } from './controllers/global.controller.js';
import { MediaController } from './controllers/media.controller.js';
import { generateOpenApi } from './utils/openapi.js';
import { getSwaggerHtml } from './utils/swagger.js';

/**
 * Register dynamic routes based on the provided configuration.
 */
export function registerRoutes(app: Hono<DyrectedContext>, config: DyrectedConfig) {
  // 1. Schema Endpoints
  // Used by the SDK and Admin to understand the content structure
  app.get('/api/schemas', (c) => {
    const siteId = c.req.header('X-Site-Id');

    const collections = config.collections
      .filter((col) => !siteId || col.shared || col.siteId === siteId)
      .map((col) => ({
        slug: col.slug,
        siteId: col.siteId,
        shared: col.shared,
        labels: col.labels,
        fields: col.fields,
        auth: col.auth,
        upload: col.upload,
        admin: col.admin,
      }));

    const globals = config.globals
      .filter((glb) => !siteId || glb.shared || glb.siteId === siteId)
      .map((glb) => ({
        slug: glb.slug,
        siteId: glb.siteId,
        shared: glb.shared,
        label: glb.label,
        fields: glb.fields,
        admin: glb.admin,
      }));

    return c.json({ collections, globals });
  });

  app.get('/api/openapi.json', (c) => {
    return c.json(generateOpenApi(config));
  });

  app.get('/api/docs', (c) => {
    return c.html(getSwaggerHtml());
  });



  // 2. Media Routes (Conditional & Dynamic)
  if (config.storage) {
    const uploadCollections = config.collections.filter(c => c.upload);
    
    // Register routes for each upload-enabled collection
    for (const col of uploadCollections) {
      const mediaController = new MediaController(col.slug);
      const prefix = `/api/collections/${col.slug}`;
      
      app.get(`${prefix}/media`, (c) => mediaController.find(c));
      app.post(`${prefix}/media`, (c) => mediaController.upload(c));
      app.delete(`${prefix}/media/:id`, (c) => mediaController.delete(c));
    }

    // Legacy /api/media route for the first upload collection
    if (uploadCollections.length > 0) {
      const defaultMediaController = new MediaController(uploadCollections[0].slug);
      app.get('/api/media', (c) => defaultMediaController.find(c));
      app.post('/api/media', (c) => defaultMediaController.upload(c));
      app.delete('/api/media/:id', (c) => defaultMediaController.delete(c));
    }
  }

  // 3. Collection Routes
  for (const collection of config.collections) {
    const path = `/api/collections/${collection.slug}`;
    const controller = new CollectionController(collection);
    
    app.get(path, (c) => controller.find(c));
    app.post(path, (c) => controller.create(c));
    app.get(`${path}/:id`, (c) => controller.findOne(c));
    app.patch(`${path}/:id`, (c) => controller.update(c));
    app.delete(`${path}/:id`, (c) => controller.delete(c));
  }

  // 3. Global Routes
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    const controller = new GlobalController(global);
    
    app.get(path, (c) => controller.get(c));
    app.patch(path, (c) => controller.update(c));
  }
}
