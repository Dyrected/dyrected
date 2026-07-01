import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import pkg from "./package.json" with { type: "json" };

const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
];

const external = (id: string) => {
  return externalPackages.some((dep) => id === dep || id.startsWith(`${dep}/`));
};

// https://vite.dev/config/
export default defineConfig({
  define: {
    "import.meta.env.DYRECTED_VERSION": JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    dts({
      tsconfigPath: "./tsconfig.app.json",
      insertTypesEntry: true,
    }),
  ],
  build: {
    minify: false,
    lib: {
      entry: path.resolve(__dirname, "src/index.tsx"),
      name: "DyrectedAdmin",
      fileName: () => "index.mjs",
      formats: ["es"],
    },
    rollupOptions: {
      external,
      output: {
        format: "es",
        manualChunks: undefined,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
