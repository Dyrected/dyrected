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

  async upload(args: { filename: string; buffer: Buffer; mimeType: string }): Promise<FileData> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: args.filename.split('.')[0], // Remove extension
          folder: this.config.folder,
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

      uploadStream.end(args.buffer);
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
