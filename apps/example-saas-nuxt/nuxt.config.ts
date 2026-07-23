import tailwindcss from "@tailwindcss/vite";
import { exampleSaasTheme, exampleSaasThemeCss } from "./theme/site-theme";

const stripUseClientDirectives = {
  name: "strip-use-client-directives",
  enforce: "pre" as const,
  transform(code: string, id: string, options?: { ssr?: boolean }) {
    if (!options?.ssr || !id.includes("node_modules")) return;
    if (!code.includes('"use client"') && !code.includes("'use client'")) return;

    const nextCode = code
      .replace(/^\s*"use client";?\s*/gm, "")
      .replace(/^\s*'use client';?\s*/gm, "");

    if (nextCode === code) return;
    return {
      code: nextCode,
      map: null,
    };
  },
};

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  image: {
    provider: "none",
  },
  app: {
    head: {
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        { rel: "preconnect", href: "https://fonts.gstatic.com", crossorigin: "" },
        { rel: "stylesheet", href: exampleSaasTheme.fonts.googleFontsHref },
        { rel: "icon", href: "/favicon.ico", sizes: "any" },
        { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
        { rel: "shortcut icon", href: "/favicon.ico" },
      ],
      style: [
        {
          key: "example-saas-theme",
          children: exampleSaasThemeCss,
        },
      ],
    },
  },
  dyrected: {
    apiBase: process.env.NUXT_PUBLIC_DYRECTED_URL || "",
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  sourcemap: false,
  vite: {
    plugins: [stripUseClientDirectives, tailwindcss()],
    build: {
      chunkSizeWarningLimit: 1200,
      rollupOptions: {
        onwarn(warning, warn) {
          if (warning.code === "MODULE_LEVEL_DIRECTIVE" && /use client/i.test(warning.message)) {
            return;
          }
          warn(warning);
        },
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) return;
            if (id.includes("/packages/admin/") || id.includes("@dyrected/admin")) {
              return "dyrected-admin";
            }
            if (id.includes("react-datasheet-grid") || id.includes("@tiptap/")) {
              return "dyrected-admin-editors";
            }
            if (id.includes("@tanstack/react-query")) {
              return "dyrected-admin-query";
            }
            if (id.includes("@radix-ui/")) {
              return "dyrected-admin-radix";
            }
            if (id.includes("lucide-react") || id.includes("sonner") || id.includes("cmdk")) {
              return "dyrected-admin-ui";
            }
            if (
              id.includes("react-dom") ||
              id.includes("/react/")
            ) {
              return "dyrected-admin-react";
            }
          },
        },
      },
    },
  },
  imports: {
    transform: {
      exclude: [/[\\/]packages[\\/](admin|core|react)[\\/]/],
    },
  },
  devServer: {
    port: 3009,
  },
  css: ["~/assets/css/main.css"],
});
