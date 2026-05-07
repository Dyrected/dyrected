import { Hono } from 'hono';
import { DyrectedContext } from './app';
import { DyrectedConfig } from './types';

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
    
    app.get(path, (c) => c.json({ message: `List ${collection.slug}` }));
    app.post(path, (c) => c.json({ message: `Create ${collection.slug}` }));
    app.get(`${path}/:id`, (c) => c.json({ message: `Get ${collection.slug} ${c.req.param('id')}` }));
    app.patch(`${path}/:id`, (c) => c.json({ message: `Update ${collection.slug} ${c.req.param('id')}` }));
    app.delete(`${path}/:id`, (c) => c.json({ message: `Delete ${collection.slug} ${c.req.param('id')}` }));
  }

  // 3. Global Routes
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    
    app.get(path, (c) => c.json({ message: `Get global ${global.slug}` }));
    app.patch(path, (c) => c.json({ message: `Update global ${global.slug}` }));
  }
}
