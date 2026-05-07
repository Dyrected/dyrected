import { StorageAdapter, FileData } from '@dyrected/core';
import fs from 'fs-extra';
import path from 'path';

export interface LocalStorageConfig {
  uploadDir: string;
  staticUrlPrefix: string;
}

export class LocalStorageAdapter implements StorageAdapter {
  constructor(private config: LocalStorageConfig) {
    fs.ensureDirSync(this.config.uploadDir);
  }

  async upload(args: { filename: string; buffer: Buffer; mimeType: string }): Promise<FileData> {
    const filePath = path.join(this.config.uploadDir, args.filename);
    await fs.writeFile(filePath, args.buffer);

    return {
      filename: args.filename,
      filesize: args.buffer.length,
      mimeType: args.mimeType,
      url: this.getURL({ filename: args.filename })
    };
  }

  async delete(args: { filename: string }): Promise<void> {
    const filePath = path.join(this.config.uploadDir, args.filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  getURL(args: { filename: string }): string {
    return `${this.config.staticUrlPrefix}/${args.filename}`;
  }
}
