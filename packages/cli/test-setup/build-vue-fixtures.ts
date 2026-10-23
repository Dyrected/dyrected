import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildComponents } from "../src/utils/bundle/build-components.js";

/**
 * Builds the Vue fixtures into a bundle once per test run, in plain Node. esbuild cannot start inside jsdom, so the
 * test that runs the bundle in a simulated browser reads this output instead of building it itself.
 */
export default async function setup() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const out = path.join(here, "..", "test-tmp", "vue-e2e");
  await fs.ensureDir(out);

  const built = await buildComponents(path.join(here, "fixtures", "dyrected.components.ts"));
  if (built.findings.length > 0) throw new Error(`Fixture bundle has findings: ${JSON.stringify(built.findings)}`);
  await fs.writeFile(path.join(out, "components.mjs"), built.js);
}
