import config from "./dyrected.config";

console.log(`[nuxt.config] Imported dyrected config with ${config.collections?.length || 0} collections`);

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2026-05-08",
  devtools: { enabled: true },
  devServer: {
    port: 3008,
  },
  modules: ["@dyrected/nuxt"],
  dyrected: {
    ...config,
    apiBase: "/dyrected",
    apiKey: "sk_live_0d33f2478e1ebd46786aeb25beeccf8a6c1dd41847cce124",
    siteId: "a1q8bo",
  },
  build: {
    transpile: ["@dyrected/admin"],
  },
  vite: {
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "@tanstack/react-query", "lucide-react"],
    },
  },
});
