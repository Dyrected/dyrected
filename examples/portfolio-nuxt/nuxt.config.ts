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
    apiBase: "/api/dyrected",
    apiKey: "sk_live_0d33f2478e1ebd46786aeb25beeccf8a6c1dd41847cce124",
    siteId: "a1q8bo",
  },
  build: {
    transpile: ["@dyrected/admin"],
  },
  vite: {
    esbuild: {
      loader: "tsx",
      include: /packages\/admin\/src\/.*\.tsx?$/,
      jsxFactory: "React.createElement",
      jsxFragment: "React.Fragment",
      jsxImportSource: "react",
    },
    // @ts-ignore
    async plugins() {
      const react = (await import("@vitejs/plugin-react")).default;
      return [
        {
          name: "force-react-jsx",
          enforce: "pre",
          transform(code: string, id: string) {
            if (id.includes("packages/admin") && id.endsWith(".tsx")) {
              return {
                code: `/** @jsxImportSource react */\n${code}`,
                map: null,
              };
            }
          },
        },
        react(),
      ];
    },
    optimizeDeps: {
      include: ["@dyrected/admin", "react", "react-dom", "react-router-dom", "@tanstack/react-query"],
    },
    build: {
      commonjsOptions: {
        include: [/packages\/admin/, /node_modules/],
      },
    },
  },
});
