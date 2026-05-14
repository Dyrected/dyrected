import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  dyrected: {
    apiBase: "/dyrected",
  },
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
  },
  devServer: {
    port: 3009,
  },
  css: ["~/assets/css/main.css"],
});
