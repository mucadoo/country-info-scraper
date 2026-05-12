import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/sdk/index.ts', 'src/sdk/browser.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  platform: 'node',
});
