import { describe, expect, it } from "vitest";
import type { StorageAdapter } from "@dyrected/core";

export function runStorageAdapterContract(
  name: string,
  createAdapter: () => StorageAdapter | Promise<StorageAdapter>,
  options: { skip?: boolean } = {},
) {
  const suite = options.skip ? describe.skip : describe;
  suite(`${name} StorageAdapter contract`, () => {
    it("returns canonical file metadata and accepts the stored filename for deletion", async () => {
      const storage = await createAdapter();
      const buffer = new TextEncoder().encode("dyrected adapter contract");
      const uploaded = await storage.upload({
        filename: "contract.txt",
        buffer,
        mimeType: "text/plain",
        prefix: "tests",
      });

      expect(uploaded).toMatchObject({
        filename: expect.any(String),
        mimeType: "text/plain",
        url: expect.any(String),
      });
      expect(storage.getURL({ filename: uploaded.filename })).toBe(
        uploaded.url,
      );

      await storage.delete({ filename: uploaded.filename });
      if (storage.resolve) {
        await expect(
          storage.resolve({ filename: uploaded.filename }),
        ).resolves.toBeNull();
      }
    });
  });
}
