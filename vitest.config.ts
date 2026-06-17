import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Workspace packages export raw TS via their package.json "main", which
// vitest resolves through pnpm's node_modules symlinks. No path aliases
// needed for @luxematch/* — they resolve to packages/*/src/index.ts.
// The "@/" alias mirrors apps/web's tsconfig path so frontend units (e.g. the
// catalog adapter) are testable.
export default defineConfig({
  resolve: {
    alias: {
      '@/': fileURLToPath(new URL('./apps/web/', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // Populate placeholder env before any module imports, so @luxematch/config's
    // import-time server-env validation passes in tests that import workspace
    // packages (e.g. @luxematch/qdrant).
    setupFiles: ['tests/setup-env.ts'],
  },
});
