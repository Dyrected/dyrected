import { StorageAdapter, FileData } from '@dyrected/core';
import B2 from 'backblaze-b2';

export interface B2StorageConfig {
  applicationKeyId: string;
  applicationKey: string;
  bucketId: string;
  bucketName: string;
  baseUrl?: string;
}

export class B2StorageAdapter implements StorageAdapter {
  private b2: B2;

  constructor(private config: B2StorageConfig) {
    this.b2 = new B2({
      applicationKeyId: config.applicationKeyId,
      applicationKey: config.applicationKey,
    });
  }

  async upload(args: { filename: string; buffer: Buffer; mimeType: string }): Promise<FileData> {
    await this.b2.authorize();
    
    const uploadUrlResponse = await this.b2.getUploadUrl({
      bucketId: this.config.bucketId,
    });

    const uploadResponse = await (this.b2 as any).uploadFile({
      uploadUrl: uploadUrlResponse.data.uploadUrl,
      uploadAuthToken: uploadUrlResponse.data.authorizationToken,
      fileName: args.filename,
      data: args.buffer,
      contentType: args.mimeType,
    });

    return {
      filename: args.filename,
      filesize: args.buffer.length,
      mimeType: args.mimeType,
      url: this.getURL({ filename: args.filename }),
      provider_metadata: uploadResponse.data,
    };
  }

  async delete(args: { filename: string }): Promise<void> {
    await this.b2.authorize();
    
    const fileList = await (this.b2 as any).listFileNames({
      bucketId: this.config.bucketId,
      startFileName: args.filename,
      maxFileCount: 1,
      delimiter: '',
      prefix: '',
    });

    const file = fileList.data.files[0];
    if (file && file.fileName === args.filename) {
      await this.b2.deleteFileVersion({
        fileId: file.fileId,
        fileName: file.fileName,
      });
    }
  }

  getURL(args: { filename: string }): string {
    if (this.config.baseUrl) {
      return `${this.config.baseUrl}/${args.filename}`;
    }
    return `https://f000.backblazeb2.com/file/${this.config.bucketName}/${args.filename}`;
  }
}

export const b2Storage = (config: B2StorageConfig) => new B2StorageAdapter(config);
