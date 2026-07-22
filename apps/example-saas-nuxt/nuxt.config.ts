import tailwindcss from "@tailwindcss/vite";
import { exampleSaasTheme, exampleSaasThemeCss } from "./theme/site-theme";

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
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
  devtools: { enabled: true },
  sourcemap: false,
  vite: {
    plugins: [tailwindcss()],
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
