import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { buildBundle } from "../../utils/bundle/build-bundle.js";
import { cloudRequest, CloudRequestError, resolveCloudTarget } from "../../utils/cloud-client.js";
import { uploadBundle } from "../deploy.js";

let dir: string;
beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "dyrected-deploy-"));
});
afterEach(async () => {
  await fs.remove(dir);
});

const target = { apiKey: "sk_live_abc", siteId: "site_1", apiUrl: "https://cloud.test" };

describe("resolveCloudTarget", () => {
  it("prefers flags over environment and trims a trailing slash", async () => {
    vi.stubEnv("DYRECTED_API_KEY", "from-env");
    vi.stubEnv("DYRECTED_SITE_ID", "env-site");
    const resolved = await resolveCloudTarget({ apiKey: "flag-key", url: "https://cloud.test/" }, dir);
    expect(resolved).toEqual({ apiKey: "flag-key", siteId: "env-site", apiUrl: "https://cloud.test" });
    vi.unstubAllEnvs();
  });

  it("explains what is missing", async () => {
    vi.stubEnv("DYRECTED_API_KEY", "");
    vi.stubEnv("DYRECTED_SITE_ID", "");
    await expect(resolveCloudTarget({}, dir)).rejects.toThrow(/DYRECTED_API_KEY and DYRECTED_SITE_ID/);
    vi.unstubAllEnvs();
  });
});

describe("cloudRequest", () => {
  it("authenticates with the API key against the project's URL", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: 1 }), { status: 200 }));
    await cloudRequest(target, "/secrets", {}, fetchImpl as any);
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://cloud.test/cloud/workspaces/sites/site_1/secrets",
      expect.objectContaining({ method: "GET", headers: expect.objectContaining({ "X-API-Key": "sk_live_abc" }) }),
    );
  });

  it("raises the server's message, status and body", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ message: "nope", missing: ["a"] }), { status: 422 }));
    const error: any = await cloudRequest(target, "/deployments", { method: "POST", body: {} }, fetchImpl as any).catch((e) => e);
    expect(error).toBeInstanceOf(CloudRequestError);
    expect(error).toMatchObject({ message: "nope", status: 422, body: { missing: ["a"] } });
  });
});

describe("uploadBundle", () => {
  it("sends exactly what `dyrected bundle` wrote, ready for the server's manifest check", async () => {
    await fs.outputFile(path.join(dir, "dyrected.config.ts"), `export default { collections: [{ slug: "a", fields: [], hooks: { beforeChange: [({ data }) => data] } }], globals: [] };`);
    const { directory, manifest } = await buildBundle({ configPath: path.join(dir, "dyrected.config.ts"), outDir: path.join(dir, "out") });

    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ deployment: { id: "d1", version: manifest.version, functionCount: 1 } }), { status: 201 }));
    const result = await uploadBundle(target, directory!, fetchImpl as any);

    expect(result.deployment.version).toBe(manifest.version);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://cloud.test/cloud/workspaces/sites/site_1/deployments");
    const body = JSON.parse(init.body as string);
    expect(Object.keys(body).sort()).toEqual(["manifest", "schema", "serverJs", "sourceMap"]);
    expect(body.manifest.version).toBe(manifest.version);
    expect(body.schema.collections[0].hooks.beforeChange[0]).toEqual({ $fn: "collections.0.hooks.beforeChange.0" });
  });
});
