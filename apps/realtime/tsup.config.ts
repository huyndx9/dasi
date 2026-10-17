import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node20',
  // Workspace packages ship TypeScript source, so bundle them into the output.
  noExternal: [/^@dasi\//],
  clean: true,
});
