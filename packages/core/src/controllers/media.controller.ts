import { Context } from 'hono';
import { DyrectedContext } from '../app.js';

export class MediaController {
  private collection: string;

  constructor(collection: string = 'media') {
    this.collection = collection;
  }

  async upload(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    const imageService = config.image;

    if (!storage) {
      return c.json({ message: 'Storage not configured' }, 500);
    }

    const body = await c.req.parseBody();
    const file = body['file'] as File;
    const focalPointStr = body['focalPoint'] as string;
    const focalPoint = focalPointStr ? JSON.parse(focalPointStr) : undefined;

    if (!file) {
      return c.json({ message: 'No file uploaded' }, 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    
    const siteId = c.get('siteId');
    const workspaceId = c.get('workspaceId');
    const prefix = workspaceId ? `${workspaceId}/${siteId}` : (siteId || 'default');

    // 1. Process Image if service exists
    let imageMetadata: any = {};
    let imageSizes: any = {};
    
    if (imageService && file.type.startsWith('image/')) {
        let colConfig = config.collections.find(col => col.slug === this.collection);
        if (!colConfig && config.onSchemaFetch && siteId) {
            const dynamic = await config.onSchemaFetch(siteId);
            colConfig = dynamic.collections?.find(col => col.slug === this.collection);
        }

        try {
          const processed = await imageService.process({
              buffer,
              mimeType: file.type,
              config: colConfig?.upload,
              focalPoint
          });
          imageMetadata = processed.metadata;
          imageSizes = processed.sizes;
        } catch (err) {
          console.error('[MediaController] Image processing failed:', err);
        }
    }

    // 2. Upload main file
    const fileData = await storage.upload({
      filename: file.name,
      buffer,
      mimeType: file.type,
      prefix,
    });

    const finalFileData = {
        ...fileData,
        ...imageMetadata,
        focalPoint,
        sizes: {} as any
    };

    // 3. Upload resized versions
    if (imageSizes) {
        for (const [sizeName, sizeData] of Object.entries(imageSizes) as [string, any][]) {
            const ext = file.name.split('.').pop();
            const baseName = file.name.substring(0, file.name.lastIndexOf('.'));
            const sizeFilename = `${baseName}-${sizeName}.${ext}`;

            try {
              const sizeFileData = await storage.upload({
                  filename: sizeFilename,
                  buffer: sizeData.buffer,
                  mimeType: file.type,
                  prefix,
              });

              finalFileData.sizes[sizeName] = {
                  ...sizeFileData,
                  width: sizeData.width,
                  height: sizeData.height
              };
            } catch (err) {
              console.error(`[MediaController] Failed to upload size ${sizeName}:`, err);
            }
        }
    }

    // 4. Save to database
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const doc = await db.create({
      collection: this.collection,
      data: finalFileData
    });

    return c.json(doc, 201);
  }

  async find(c: Context<DyrectedContext>) {
    const db = c.get('config').db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const limit = Number(c.req.query('limit')) || 10;
    const page = Number(c.req.query('page')) || 1;
    const result = await db.find({
      collection: this.collection,
      limit,
      page,
    });
    return c.json(result);
  }

  async delete(c: Context<DyrectedContext>) {
    const config = c.get('config');
    const storage = config.storage;
    const db = config.db;
    if (!db) return c.json({ message: 'Database not configured' }, 500);

    const id = c.req.param('id');

    if (!id) return c.json({ message: 'Missing ID' }, 400);

    const doc = await db.findOne({ collection: this.collection, id });
    if (!doc) return c.json({ message: 'Not Found' }, 404);

    if (storage) {
      // Delete main file
      await storage.delete({ filename: doc.filename });
      
      // Delete all sizes
      if (doc.sizes) {
        for (const size of Object.values(doc.sizes) as any[]) {
          if (size.filename) {
            await storage.delete({ filename: size.filename });
          }
        }
      }
    }

    await db.delete({ collection: this.collection, id });
    return c.json({ message: 'Deleted' });
  }
}
