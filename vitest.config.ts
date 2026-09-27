import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
export default defineConfig({
  resolve: { alias: { '@orio/contracts': resolve(root, 'libs/contracts/src/index.ts'), '@orio/game-engine': resolve(root, 'libs/game-engine/src/index.ts'), '@orio/database': resolve(root, 'libs/database/src/index.ts'), '@orio/shared': resolve(root, 'libs/shared/src/index.ts') } },
  test: { include: ['libs/**/*.spec.ts', 'apps/**/*.spec.ts'], exclude: ['apps/web/e2e/**'], environment: 'node', coverage: { reporter: ['text', 'html'] } }
});
