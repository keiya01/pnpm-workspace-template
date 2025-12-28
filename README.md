# pnpm + TypeScript + Vite Monorepo (alias-first dev, bundled builds)

This repo experiments with a minimal monorepo using pnpm workspaces, TypeScript project references, and Vite. The goals are:

- Fast development by aliasing packages’ `src` across the workspace
- Deterministic builds: JS bundles in `dist/` and rolled-up types in `dist/index.d.ts`
- Simple rules to switch between bundling dependencies vs externalizing them

## Overview

- Workspace layout: `packages/*` for libraries, `apps/*` for runnable apps.
- Dev uses Vite aliases to point bare imports (e.g., `ui`, `core`, `shared`) to source files so HMR works across packages.
- Each project opts into TypeScript project references as needed to ensure correct build order and type safety.
- Builds produce:
  - `dist/` — Vite library-mode output
  - `dist-types/` — `.d.ts` emitted by `tsc`
  - `dist/index.d.ts` — single rolled-up `.d.ts` via `api-extractor`

## Layout

- `pnpm-workspace.yaml`: includes `packages/*` and `apps/*`.
- `packages/{core,shared,ui}`: libraries built in Vite library mode.
- `apps/{app1,app2}`: Vite apps that import libraries via bare specifiers (`ui`, etc.).

## Development (alias-first)

- Root `vite.config.dev.ts` declares aliases for all workspace libraries:

  ```ts
  // vite.config.dev.ts (root)
  export default defineConfig({
    resolve: {
      alias: {
        core:   `${__dirname}/packages/core/src`,
        shared: `${__dirname}/packages/shared/src`,
        ui:     `${__dirname}/packages/ui/src`,
      },
    },
  });
  ```

- Each app reuses this config:

  ```ts
  // apps/*/vite.config.dev.ts
  import { defineConfig } from 'vite';
  import common from '../../vite.config.dev';
  export default defineConfig(common);
  ```

- Run all dev servers: `pnpm dev` (runs `pnpm -r run dev`; only apps define `dev`).

This means during development, `import { ... } from 'ui'` resolves to `packages/ui/src`, not to built output.

## TypeScript Project References

- Root `tsconfig.json` enables composite builds and defines workspace `paths` to match the dev aliases:

  ```json
  {
    "compilerOptions": {
      "composite": true,
      "paths": {
        "core": ["./packages/core/src"],
        "shared": ["./packages/shared/src"],
        "ui": ["./packages/ui/src"]
      }
    }
  }
  ```

- Each library `tsconfig.json` extends the root and emits types to `dist-types/`:

  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": { "declarationDir": "dist-types" },
    "include": ["src"],
    "references": [
      { "path": "../shared" },
      { "path": "../core" }
    ]
  }
  ```

- Apps extend the root config, do not emit, and reference the libraries they consume:

  ```json
  {
    "extends": "../../tsconfig.json",
    "compilerOptions": {
      "noEmit": true,
      "composite": false
    },
    "references": [{ "path": "../../packages/ui" }]
  }
  ```

- For `api-extractor`, we intentionally clear `paths` via `tsconfig.api-extractor.json` so it resolves referenced packages as real dependencies rather than via TS path aliases:

  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": { "paths": {} }
  }
  ```

## Building

- Build everything in topological order: `pnpm build` (root runs `pnpm -r run build`).
- Each library’s `package.json` uses three steps:
  - `tsc` to emit declarations only to `dist-types/` (controlled by root `tsconfig.json`).
  - `vite build` in library mode to produce JS bundles in `dist/`.
  - `api-extractor run --local` to roll up `dist-types/src/**/*.d.ts` into `dist/index.d.ts`.

Key configs:

- Library-mode Vite config (per package):

  ```ts
  // packages/*/vite.config.ts
  export default defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'Lib',
        fileName: 'index'
      },
    },
  });
  ```

- API Extractor (root, extended by packages):

  ```json
  {
    "mainEntryPointFilePath": "<projectFolder>/dist-types/src/index.d.ts",
    "dtsRollup": {
      "enabled": true,
      "publicTrimmedFilePath": "<projectFolder>/dist/index.d.ts"
    }
  }
  ```

## Externalizing Dependencies (optional)

By default, Vite bundles dependencies into each library’s `dist/`, and `api-extractor` rolls types into a single `dist/index.d.ts`.

If you want a dependency to be external (not bundled):

- Mark it external in the package’s Vite config:

  ```ts
  export default defineConfig({
    build: {
      lib: {
        entry: 'src/index.ts',
        name: 'Lib',
        fileName: 'index'
      },
      rollupOptions: {
        external: ['react', 'core', 'shared']
      }
    }
  });
  ```

- For types, you can skip `api-extractor` and point the package’s `types` to the emitted entry from `tsc`:
  - Remove the `bundle:types` step from `build` (or don’t run it).
  - Set `"types": "dist-types/src/index.d.ts"` in `package.json`.

This way the library does not inline the external dependency’s code or types; consumers must provide it.

## Adding a New Package

- Create `packages/<name>` with:
  - `src/index.ts`
  - `package.json` with `build` and optional `bundle:types` like existing packages
  - `tsconfig.json` extending the root (set `declarationDir: "dist-types"` and any `references`)
  - `vite.config.ts` in library mode
- Update root `vite.config.dev.ts` aliases and root `tsconfig.json` `paths` with the new package name → `packages/<name>/src`.
- If other packages depend on it, add a workspace dependency (`"<name>": "workspace:*"`) and a TS `reference`.

## Commands

- Install: `pnpm install`
- Dev (apps): `pnpm dev`
- Build all: `pnpm build`
- Preview an app: `pnpm --filter ./apps/app1 preview`

## Notes & Gotchas

- Keep root `tsconfig.json` `paths` and root `vite.config.dev.ts` aliases in sync.
- `api-extractor` assumes `tsc` wrote declarations to `dist-types/` with the same folder structure as `src/`.
- `pnpm -r` runs in workspace topological order, so library builds complete before app builds.
- If you externalize a dependency, make sure the consumer environment provides it (e.g., mark it as a dependency/peerDependency in `package.json`).
