import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/sdk/index.ts', 'src/sdk/browser.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  // Ensure the bundler treats JSON as code to be bundled.
  // By default tsup/esbuild handles JSON imports, but we ensure it's minified.
  noExternal: ['../data/sovereign-states.json'],
  // Set platform to 'node' or 'neutral' depending on usage. 
  // 'neutral' works best for isomorphic JS.
  platform: 'node',
});
