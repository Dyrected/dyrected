import { StorageAdapter, FileData } from '@dyrected/core';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';

export interface S3StorageConfig {
  bucket: string;
  region: string;
  credentials: {
    accessKeyId: string;
    secretAccessKey: string;
  };
  endpoint?: string;
  forcePathStyle?: boolean;
  baseUrl?: string; // For custom domains/CDNs
}

export class S3StorageAdapter implements StorageAdapter {
  private client: S3Client;

  constructor(private config: S3StorageConfig) {
    this.client = new S3Client({
      region: config.region,
      credentials: config.credentials,
      endpoint: config.endpoint,
      forcePathStyle: config.forcePathStyle,
    });
  }

  async upload(args: { filename: string; buffer: Buffer; mimeType: string }): Promise<FileData> {
    const upload = new Upload({
      client: this.client,
      params: {
        Bucket: this.config.bucket,
        Key: args.filename,
        Body: args.buffer,
        ContentType: args.mimeType,
      },
    });

    await upload.done();

    return {
      filename: args.filename,
      filesize: args.buffer.length,
      mimeType: args.mimeType,
      url: this.getURL({ filename: args.filename }),
    };
  }

  async delete(args: { filename: string }): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.config.bucket,
      Key: args.filename,
    });
    await this.client.send(command);
  }

  getURL(args: { filename: string }): string {
    if (this.config.baseUrl) {
      return `${this.config.baseUrl}/${args.filename}`;
    }
    return `https://${this.config.bucket}.s3.${this.config.region}.amazonaws.com/${args.filename}`;
  }
}
