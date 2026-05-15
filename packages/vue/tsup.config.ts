import { defineConfig } from 'tsup';
import vue from 'unplugin-vue/esbuild';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
  external: ['vue', 'react', 'react-dom'],
  esbuildPlugins: [
    vue() as any
  ],
});
