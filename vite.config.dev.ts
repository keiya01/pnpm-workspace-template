import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      core: `${__dirname}/packages/core/src`,
      shared: `${__dirname}/packages/shared/src`,
      ui: `${__dirname}/packages/ui/src`,
    },
  },
});
