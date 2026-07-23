import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import pkg from "./package.json" with { type: "json" };

const bundledDependencies = new Set([
  "papaparse",
  "react-dropzone",
  "attr-accept",
  "file-selector",
  "prop-types",
  "jexl",
  "react-datasheet-grid",
]);

const externalPackages = [
  ...Object.keys(pkg.dependencies ?? {}).filter((dep) => !bundledDependencies.has(dep)),
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
      entry: {
        index: path.resolve(__dirname, "src/index.tsx"),
        public: path.resolve(__dirname, "src/public/index.ts"),
      },
      name: "DyrectedAdmin",
      fileName: (_format, entryName) => (entryName === "public" ? "public/index.js" : "index.mjs"),
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
