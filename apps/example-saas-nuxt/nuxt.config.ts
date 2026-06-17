import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
  dyrected: {
    apiBase: "/dyrected",
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
