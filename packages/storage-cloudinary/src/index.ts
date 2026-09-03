import { StorageAdapter, FileData } from '@dyrected/core';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

export interface CloudinaryStorageConfig {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
  folder?: string;
}

export class CloudinaryStorageAdapter implements StorageAdapter {
  constructor(private config: CloudinaryStorageConfig) {
    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });
  }

  async upload(args: { filename: string; buffer: Uint8Array; mimeType: string; prefix?: string }): Promise<FileData> {
    const folder = args.prefix 
      ? (this.config.folder ? `${this.config.folder}/${args.prefix}` : args.prefix)
      : this.config.folder;

    const lastDotIndex = args.filename.lastIndexOf('.');
    const baseName = lastDotIndex !== -1 ? args.filename.substring(0, lastDotIndex) : args.filename;
    const sanitizedBase = baseName
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') || 'file';

    // If the filename does not already have a timestamp/random unique suffix, append one
    // to guarantee no collision or overwrite in Cloudinary.
    const publicId = /-\d{10,13}-[a-z0-9]{4,10}$/.test(sanitizedBase)
      ? sanitizedBase
      : `${sanitizedBase}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder,
          overwrite: false,
          resource_type: 'auto',
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Upload failed'));

          resolve({
            filename: result.public_id,
            filesize: result.bytes,
            mimeType: args.mimeType,
            url: result.secure_url,
            width: result.width,
            height: result.height,
            provider_metadata: result,
          });
        }
      );

      uploadStream.end(Buffer.from(args.buffer));
    });
  }

  async delete(args: { filename: string }): Promise<void> {
    await cloudinary.uploader.destroy(args.filename);
  }

  getURL(args: { filename: string }): string {
    return cloudinary.url(args.filename, { secure: true });
  }
}

export const cloudinaryStorage = (config: CloudinaryStorageConfig) => new CloudinaryStorageAdapter(config);
