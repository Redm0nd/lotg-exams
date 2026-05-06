import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./src/test-setup.ts'],
  },
  // The TypeScript source uses NodeNext-style `.js` import suffixes
  // (e.g. `from '../lib/dynamodb.js'`) so the compiled output is valid
  // ESM. Map those back to `.ts` files for vitest's resolver.
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1.ts' }],
  },
});
