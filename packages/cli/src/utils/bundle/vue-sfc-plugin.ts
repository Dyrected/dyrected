import { createHash } from "node:crypto";
import path from "node:path";
import { createRequire } from "node:module";
import fs from "fs-extra";
import type { Plugin } from "esbuild";

const require = createRequire(import.meta.url);

/**
 * Compiles Vue single-file components (`.vue`) for the components bundle.
 *
 * The browser bundle ships Vue's runtime-only build, so templates must be compiled here, at build time. Nothing in
 * the output evaluates code at run time, which keeps the admin page's content security policy strict.
 *
 * Supported: `<script setup>` and plain `<script>` (JavaScript or TypeScript), `<template>`, scoped and global CSS.
 * Not supported: template preprocessors (Pug), style preprocessors (Sass, Less), custom blocks.
 */

/** Vue's core APIs that Nuxt makes available without an import. The bundle gets the same convenience. */
export const VUE_AUTO_IMPORTS = [
  "ref", "computed", "reactive", "readonly", "shallowRef", "shallowReactive", "toRef", "toRefs", "unref", "isRef",
  "watch", "watchEffect", "watchPostEffect", "nextTick", "defineComponent", "h", "provide", "inject",
  "onBeforeMount", "onMounted", "onBeforeUpdate", "onUpdated", "onBeforeUnmount", "onUnmounted", "onErrorCaptured",
  "useSlots", "useAttrs", "useId", "useTemplateRef", "toValue", "markRaw", "effectScope", "getCurrentInstance",
] as const;

export class VueSfcError extends Error {
  constructor(message: string, readonly file: string) {
    super(message);
    this.name = "VueSfcError";
  }
}

const shortId = (file: string) => createHash("sha256").update(file).digest("hex").slice(0, 8);

const STYLE_INJECTOR = (css: string) =>
  `(function(){if(typeof document==="undefined")return;var s=document.createElement("style");s.setAttribute("data-dyrected-component","");s.textContent=${JSON.stringify(css)};document.head.appendChild(s);})();`;

export interface CompiledSfc {
  code: string;
  loader: "js" | "ts";
}

export async function compileVueSfc(source: string, file: string): Promise<CompiledSfc> {
  const sfc = require("@vue/compiler-sfc") as typeof import("@vue/compiler-sfc");
  const { descriptor, errors } = sfc.parse(source, { filename: file });
  if (errors.length > 0) throw new VueSfcError(errors[0].message, file);

  const id = shortId(file);
  const scopeId = `data-v-${id}`;
  const hasScoped = descriptor.styles.some((style) => style.scoped);

  for (const block of [descriptor.template, ...descriptor.styles]) {
    const lang = (block as { lang?: string } | null)?.lang;
    if (lang && !["css", "html"].includes(lang)) {
      throw new VueSfcError(`${path.basename(file)} uses "${lang}", which the components build cannot compile. Use plain CSS and HTML templates.`, file);
    }
  }
  if (descriptor.customBlocks.length > 0) {
    throw new VueSfcError(`${path.basename(file)} has custom blocks (<${descriptor.customBlocks[0].type}>), which are not supported.`, file);
  }

  const scriptLang = descriptor.scriptSetup?.lang ?? descriptor.script?.lang ?? "js";
  const loader: "js" | "ts" = scriptLang === "ts" || scriptLang === "tsx" ? "ts" : "js";
  const parts: string[] = [];

  if (descriptor.scriptSetup || descriptor.script) {
    const compiled = sfc.compileScript(descriptor, {
      id: scopeId,
      inlineTemplate: Boolean(descriptor.scriptSetup && descriptor.template),
      templateOptions: { scoped: hasScoped, id, compilerOptions: { scopeId: hasScoped ? scopeId : undefined } },
    });
    parts.push(sfc.rewriteDefault(compiled.content, "_sfc_main", loader === "ts" ? ["typescript"] : []));

    // A plain <script> keeps its template separate; <script setup> was compiled with it inline above.
    if (!descriptor.scriptSetup && descriptor.template) {
      const template = sfc.compileTemplate({
        source: descriptor.template.content,
        filename: file,
        id,
        scoped: hasScoped,
        compilerOptions: { scopeId: hasScoped ? scopeId : undefined, bindingMetadata: compiled.bindings },
      });
      if (template.errors.length > 0) throw new VueSfcError(String((template.errors[0] as Error).message ?? template.errors[0]), file);
      parts.push(template.code.replace("export function render", "function render"), "_sfc_main.render = render;");
    }
  } else {
    parts.push("const _sfc_main = {};");
    if (descriptor.template) {
      const template = sfc.compileTemplate({
        source: descriptor.template.content,
        filename: file,
        id,
        scoped: hasScoped,
        compilerOptions: { scopeId: hasScoped ? scopeId : undefined },
      });
      if (template.errors.length > 0) throw new VueSfcError(String((template.errors[0] as Error).message ?? template.errors[0]), file);
      parts.push(template.code.replace("export function render", "function render"), "_sfc_main.render = render;");
    }
  }

  if (hasScoped) parts.push(`_sfc_main.__scopeId = ${JSON.stringify(scopeId)};`);

  for (const style of descriptor.styles) {
    const result = await sfc.compileStyleAsync({ source: style.content, filename: file, id: scopeId, scoped: style.scoped });
    if (result.errors.length > 0) throw new VueSfcError(result.errors[0].message, file);
    parts.push(STYLE_INJECTOR(result.code));
  }

  parts.push("export default _sfc_main;");
  return { code: parts.join("\n"), loader };
}

export const vueSfcPlugin: Plugin = {
  name: "dyrected-vue-sfc",
  setup(build) {
    build.onLoad({ filter: /\.vue$/ }, async (args) => {
      const source = await fs.readFile(args.path, "utf8");
      try {
        const { code, loader } = await compileVueSfc(source, args.path);
        return { contents: code, loader, resolveDir: path.dirname(args.path) };
      } catch (error: any) {
        return { errors: [{ text: error?.message ?? String(error), location: { file: args.path, line: 1, column: 0 } }] };
      }
    });
  },
};
