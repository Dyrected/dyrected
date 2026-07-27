import path from 'path';
import type { NextConfig } from 'next';

/**
 * withDyrected — Wraps your Next.js config to ensure a single React instance
 * is used across the app and @dyrected/admin's pre-built bundle.
 *
 * Usage in next.config.ts:
 *   import { withDyrected } from '@dyrected/next/config'
 *   export default withDyrected({ ... })
 */
export function withDyrected(nextConfig: NextConfig = {}): NextConfig {
  // Webpack uses absolute paths; Turbopack requires paths relative to the project root.
  const appRoot = process.cwd();
  const reactAbsolute = path.resolve(appRoot, 'node_modules/react');
  const reactDomAbsolute = path.resolve(appRoot, 'node_modules/react-dom');
  const dyrectedPackages = ['@dyrected/admin', '@dyrected/react', '@dyrected/sdk'];

  return {
    ...nextConfig,
    transpilePackages: Array.from(
      new Set([...(nextConfig.transpilePackages ?? []), ...dyrectedPackages])
    ),
    webpack(config, options) {
      config.resolve.alias = {
        ...config.resolve.alias,
        react: reactAbsolute,
        'react-dom': reactDomAbsolute,
      };
      if (!options.isServer) {
        config.resolve.fallback = {
          ...config.resolve.fallback,
          fs: false,
          worker_threads: false,
          pino: false,
          'pino-pretty': false,
        };
      }
      if (typeof nextConfig.webpack === 'function') {
        return nextConfig.webpack(config, options);
      }
      return config;
    },
    turbopack: {
      ...nextConfig.turbopack,
      resolveAlias: {
        ...nextConfig.turbopack?.resolveAlias,
        react: './node_modules/react',
        'react-dom': './node_modules/react-dom',
        fs: { browser: './node_modules/@dyrected/next/dist/empty.js' },
        worker_threads: { browser: './node_modules/@dyrected/next/dist/empty.js' },
      },
    },
  };
}
