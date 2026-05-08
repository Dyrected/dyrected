import config from "./dyrected.config";

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
