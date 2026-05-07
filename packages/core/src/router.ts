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
  app.get('/api/schemas', async (c) => {
    const siteId = c.req.header('X-Site-Id');

    let collections = [...config.collections];
    let globals = [...config.globals];

    if (siteId && config.onSchemaFetch) {
      const dynamic = await config.onSchemaFetch(siteId);
      if (dynamic.collections) collections = [...collections, ...dynamic.collections];
      if (dynamic.globals) globals = [...globals, ...dynamic.globals];
    }

    const filteredCollections = collections
      .filter((col) => !siteId || col.shared || col.siteId === siteId)
      .map((col) => ({
        slug: col.slug,
        labels: col.labels,
        fields: col.fields.map((f) => ({
          name: f.name,
          type: f.type,
          label: f.label,
          required: f.required,
          defaultValue: f.defaultValue,
          options: f.options,
          relationTo: f.collection,
          fields: f.fields,
          blocks: f.blocks,
          admin: f.admin,
        })),
        upload: !!col.upload,
        auth: !!col.auth,
      }));

    const filteredGlobals = globals
      .filter((glb) => !siteId || glb.shared || glb.siteId === siteId)
      .map((glb) => ({
        slug: glb.slug,
        label: glb.label,
        fields: glb.fields.map((f) => ({
          name: f.name,
          type: f.type,
          label: f.label,
          required: f.required,
          defaultValue: f.defaultValue,
          options: f.options,
          relationTo: f.collection,
          fields: f.fields,
          blocks: f.blocks,
          admin: f.admin,
        })),
      }));

    return c.json({
      collections: filteredCollections,
      globals: filteredGlobals,
    });
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

  // 3. Collection Routes (Static)
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

  // 4. Global Routes (Static)
  for (const global of config.globals) {
    const path = `/api/globals/${global.slug}`;
    const controller = new GlobalController(global);
    
    app.get(path, (c) => controller.get(c));
    app.patch(path, (c) => controller.update(c));
  }

  // 5. Dynamic Routes (Tenant-specific)
  // This handles collections/globals defined via sync:schema and fetched via onSchemaFetch
  app.all('/api/collections/:slug/:id?', async (c) => {
    const slug = c.req.param('slug');
    const id = c.req.param('id');
    const siteId = c.req.header('X-Site-Id') || c.get('siteId');
    const config = c.get('config');

    // Skip if static (already handled by routes above)
    if (config.collections.some(col => col.slug === slug)) {
      return c.json({ message: 'Method Not Allowed' }, 405);
    }

    if (config.onSchemaFetch && siteId) {
      const dynamic = await config.onSchemaFetch(siteId);
      let collection = dynamic.collections?.find(col => col.slug === slug);
      
      if (!collection && slug === 'media') {
        collection = {
          slug: 'media',
          labels: { singular: 'Media', plural: 'Media' },
          upload: true,
          fields: []
        };
      }

      if (collection) {
        const controller = new CollectionController(collection);
        const method = c.req.method;

        if (id) {
          if (method === 'GET') return controller.findOne(c);
          if (method === 'PATCH') return controller.update(c);
          if (method === 'DELETE') return controller.delete(c);
          if (method === 'POST' && id === 'media') return controller.create(c);
        } else {
          if (method === 'GET') return controller.find(c);
          if (method === 'POST') return controller.create(c);
        }
      }
    }
    
    return c.json({ message: `Collection "${slug}" not found` }, 404);
  });

  app.all('/api/globals/:slug', async (c) => {
    const slug = c.req.param('slug');
    const siteId = c.req.header('X-Site-Id') || c.get('siteId');
    const config = c.get('config');

    // Skip if static
    if (config.globals.some(glb => glb.slug === slug)) {
      return c.json({ message: 'Method Not Allowed' }, 405);
    }

    if (config.onSchemaFetch && siteId) {
      const dynamic = await config.onSchemaFetch(siteId);
      const global = dynamic.globals?.find(glb => glb.slug === slug);
      
      if (global) {
        const controller = new GlobalController(global);
        if (c.req.method === 'GET') return controller.get(c);
        if (c.req.method === 'PATCH') return controller.update(c);
      }
    }
    
    return c.json({ message: `Global "${slug}" not found` }, 404);
  });
}
