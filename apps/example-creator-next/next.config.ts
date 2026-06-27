import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@dyrected/admin", "@dyrected/react", "@dyrected/sdk"],
  turbopack: {
    resolveAlias: {
      react: "./node_modules/react",
      "react-dom": "./node_modules/react-dom",
    },
  },
};

export default nextConfig;
