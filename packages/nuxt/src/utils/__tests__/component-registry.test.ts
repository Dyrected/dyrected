import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";
import { discoverComponents, renderComponentRegistry } from "../component-registry";

let dir: string;

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), "dyrected-registry-"));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

function touch(rel: string) {
  const full = join(dir, rel);
  mkdirSync(join(full, ".."), { recursive: true });
  writeFileSync(full, "<template><div /></template>");
}

describe("component auto-registration", () => {
  it("returns nothing when the directory does not exist", () => {
    expect(discoverComponents(join(dir, "missing"))).toEqual([]);
  });

  it("maps <registry>/<key>.vue to registry keys and ignores everything else", () => {
    touch("fields/check_ins.checkInScanner.vue");
    touch("forms/check_ins.scanForm.vue");
    touch("forms/readme.md");
    touch("unknown/thing.vue");

    const found = discoverComponents(dir);
    expect(found.map((c) => `${c.registry}:${c.key}`)).toEqual([
      "fields:check_ins.checkInScanner",
      "forms:check_ins.scanForm",
    ]);
  });

  it("renders a registry module grouped by registry", () => {
    touch("pages/door-checkin.vue");
    const source = renderComponentRegistry(discoverComponents(dir));
    expect(source).toContain('"pages": {');
    expect(source).toContain('"door-checkin": C0,');
    expect(source).toContain("export default");
  });
});
