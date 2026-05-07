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

  async upload(args: { filename: string; buffer: Buffer; mimeType: string; prefix?: string }): Promise<FileData> {
    const relativeFolder = args.prefix || '';
    const absoluteFolder = path.join(this.config.uploadDir, relativeFolder);
    await fs.ensureDir(absoluteFolder);

    const filePath = path.join(absoluteFolder, args.filename);
    await fs.writeFile(filePath, args.buffer);

    const relativePath = path.join(relativeFolder, args.filename);

    return {
      filename: args.filename,
      filesize: args.buffer.length,
      mimeType: args.mimeType,
      url: this.getURL({ filename: relativePath })
    };
  }

  async delete(args: { filename: string }): Promise<void> {
    const filePath = path.join(this.config.uploadDir, args.filename);
    if (await fs.pathExists(filePath)) {
      await fs.remove(filePath);
    }
  }

  getURL(args: { filename: string }): string {
    // Normalize path for URL (replace backslashes if on Windows)
    const urlPath = args.filename.replace(/\\/g, '/');
    return `${this.config.staticUrlPrefix}/${urlPath}`;
  }
}
