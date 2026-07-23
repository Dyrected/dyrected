import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import dts from "vite-plugin-dts";
import pkg from "./package.json" with { type: "json" };

// Packaging policy for @dyrected/admin:
// - Peer/platform deps stay external so the host app owns singletons and routing/runtime integration.
// - Shared ecosystem deps with stable ESM surfaces can stay external to keep the library lean.
// - Consumer-fragile implementation deps are bundled when they are CJS-only or regularly need
//   Vite/Nuxt interop workarounds in consuming apps.
const bundledImplementationDependencies = new Set([
  "papaparse",
  "react-dropzone",
  "attr-accept",
  "file-selector",
  "prop-types",
  "jexl",
  "react-datasheet-grid",
]);

const peerAndPlatformDependencies = new Set([
  ...Object.keys(pkg.peerDependencies ?? {}),
  "react/jsx-runtime",
  "react/jsx-dev-runtime",
  "react-dom/client",
]);

const externalSharedDependencies = new Set(
  Object.keys(pkg.dependencies ?? {}).filter((dep) => !bundledImplementationDependencies.has(dep)),
);

const externalPackages = [
  ...externalSharedDependencies,
  ...peerAndPlatformDependencies,
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
