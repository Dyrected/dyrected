import { Hono } from 'hono';
import { DyrectedContext } from './app.js';
import { DyrectedConfig } from './types/index.js';
import { CollectionController } from './controllers/collection.controller.js';
import { GlobalController } from './controllers/global.controller.js';

/**
 * Register dynamic routes based on the provided configuration.
 */
export function registerRoutes(app: Hono<DyrectedContext>, config: DyrectedConfig) {
  // 1. Schema Endpoints
  // Used by the SDK and Admin to understand the content structure
  app.get('/api/schemas', (c) => {
    return c.json({
      collections: config.collections.map((col) => ({
        slug: col.slug,
        labels: col.labels,
        fields: col.fields,
        auth: col.auth,
        upload: col.upload,
      })),
      globals: config.globals.map((glb) => ({
        slug: glb.slug,
        label: glb.label,
        fields: glb.fields,
      })),
    });
  });

  // 2. Collection Routes
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
