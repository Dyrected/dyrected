/**
 * Server dependencies of the embedded React Admin that Nitro must bundle instead
 * of leaving external.
 *
 * `@dyrected/admin` lists `react-router-dom` only as a peer dependency, so which
 * copy a server install resolves (no lockfile, hoisted layout, a different
 * version) decides whether Nitro bundles it or keeps it as an external import.
 * When it stays external, its files are not always traced into
 * `.output/server/node_modules`, and every /admin request fails with
 * ERR_MODULE_NOT_FOUND for `react-router/dist/development/dom-export.mjs`.
 * Bundling it makes the production build independent of the install layout.
 */
export const NITRO_INLINE_ADMIN_DEPS: Array<string | RegExp> = [
  "@dyrected/nuxt",
  /^react-router(-dom)?($|\/)/,
];

type NitroExternalsOptions = { externals?: { inline?: Array<string | RegExp | ((id: string) => boolean)> } };

/**
 * Adds the Admin's server dependencies to `nitro.externals.inline`, keeping
 * anything the app already configured and never adding a rule twice.
 */
export function addNitroInlineExternals(nitro: NitroExternalsOptions): void {
  nitro.externals = nitro.externals || {};
  const inline = (nitro.externals.inline = nitro.externals.inline || []);
  for (const rule of NITRO_INLINE_ADMIN_DEPS) {
    const present = inline.some((existing) =>
      typeof rule === "string" ? existing === rule : existing instanceof RegExp && existing.source === rule.source,
    );
    if (!present) inline.push(rule);
  }
}
