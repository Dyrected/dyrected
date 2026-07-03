import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  modules: ["@dyrected/nuxt"],
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
