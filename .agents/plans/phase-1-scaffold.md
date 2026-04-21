# Feature: Phase 1 Scaffold (Vite + React + TS + Tailwind + Vitest)

The following plan should be complete, but it's important that you validate documentation and codebase patterns and task sanity before you start implementing. Pay special attention to naming of existing utils, types, and models. Import from the right files etc.

## Feature Description

Stand up the empty Classified-02 Ad Editor project as a working Vite + React 18 + TypeScript 5 + Tailwind 3 application with Vitest + React Testing Library wired in and ESLint + Prettier configured. No domain logic (no blocks, canvas, rulers, stats, PDF, S3 — those land in later plans). The deliverable is a repository where `npm run dev`, `npm run typecheck`, `npm run lint`, `npm test`, and `npm run build` all succeed, and the `.env.local` / `.env.example` contract from PRD §9.5 is honored via a typed `src/lib/env.ts` accessor.

This is the foundation every subsequent plan (block model, canvas + rulers, stats rail, PDF pipeline, S3 wiring) depends on.

## User Story

As a solo developer building the Classified-02 editor,
I want a working, conventionally-configured React + Vite + Tailwind project with tests and linting in place,
So that every subsequent feature plan can assume a stable local dev loop, consistent conventions, and a passing baseline test run.

## Problem Statement

The repo currently contains only `PRD.md`, `CLAUDE.md`, `.env.example`, `.gitignore`, and shared `.claude/` commands. There is no `src/`, no `package.json`, no build tooling. Without a scaffold, no other feature work can proceed: there's nowhere to add a component, nothing to test, nothing to run.

## Solution Statement

Hand-write the scaffold file-by-file (rather than using `npm create vite@latest`, which refuses to run in a non-empty directory and would risk touching `PRD.md` / `CLAUDE.md`). Pin to the versions called out in PRD §8, use ESLint 9 flat config (modern default), integrate Vitest into `vite.config.ts` via the triple-slash types reference, set up Tailwind 3 with a custom `clean` variant (`.clean &`) per the Clean-mode CSS-class pattern in PRD §6, and expose a single typed env reader at `src/lib/env.ts` per PRD §9.5.

## Feature Metadata

**Feature Type**: New Capability (greenfield scaffold)
**Estimated Complexity**: Low
**Primary Systems Affected**: none yet — this creates the initial system
**Dependencies**: Node 20+, npm, internet access for `npm install`

---

## CONTEXT REFERENCES

### Relevant Codebase Files — IMPORTANT: YOU MUST READ THESE BEFORE IMPLEMENTING

There is no existing code to read; patterns come from the PRD. Read these in full before starting:

- `PRD.md` §6 (lines ~231–303) — "Directory structure (target)" and "Key design patterns". Defines the canonical directory layout (`src/{components,editor,lib,types,styles}`, `infra/`, `public/`). **Create only the directories this plan explicitly names** — do not pre-create empty component files.
- `PRD.md` §7 Feature: AdCanvas + Rulers (lines ~308–352) — for context only, not implemented in this plan. Inform `App.tsx` placeholder: leave a commented hook-point where the canvas will mount.
- `PRD.md` §8 Technology Stack (lines ~397–469) — authoritative version list. React ^18.3, TypeScript ^5.4, Vite ^5.2, Tailwind ^3.4, plus Vitest + @testing-library/react + jsdom.
- `PRD.md` §9 Configuration table + §9.5 Environment variables & secrets — defines `/public/config.json` runtime config (NOT env) and the env-var contract (`VITE_*` = public, secrets never in VITE_*).
- `PRD.md` §11.5 Testing strategy — Layer 1 (Vitest) and Layer 2 (RTL + jsdom) must be wired in this plan so Phase 1 can write its first tests without additional setup.
- `CLAUDE.md` "Code Patterns" section — naming conventions (PascalCase `.tsx`, camelCase `.ts`), error handling (never throw from a hook), Tailwind `clean:` variant pattern, unit canonicalization (inches).
- `CLAUDE.md` "Environment variables" section — hard rule that env reads go through `src/lib/env.ts`.
- `.env.example` — baseline variables to reference from `src/lib/env.ts`: `VITE_ASSETS_ORIGIN`, `VITE_DEV_MAIN_APP_ORIGIN`.

### New Files to Create

Root:
- `.gitattributes` — normalize line endings (LF) to stop Windows CRLF warnings on every commit.
- `.prettierrc.json` — Prettier config (defaults + semi: false? keep default: semi: true).
- `eslint.config.js` — ESLint 9 flat config.
- `index.html` — Vite entry; title "Ad Editor"; `#root` div; `/src/main.tsx` module script.
- `package.json` — dependencies, devDependencies, scripts.
- `postcss.config.js` — Tailwind + Autoprefixer pipeline.
- `tailwind.config.js` — content globs, custom `clean` variant, minimal theme extensions.
- `tsconfig.json` — app config (references `tsconfig.node.json`).
- `tsconfig.node.json` — Vite/tool config (for `vite.config.ts`).
- `vite.config.ts` — Vite + Vitest combined config (triple-slash reference for vitest types).

Public:
- `public/config.json` — `{ "assetsOrigin": "https://editor-assets.mirabeltech.com", "defaultWidthInches": 3.25 }`.
- `public/favicon.svg` — simple inline SVG placeholder (or omit and let the browser 404 silently; include to avoid the noisy console 404).

Source:
- `src/main.tsx` — React 18 root render.
- `src/App.tsx` — minimal placeholder shell with a `.clean`-capable root wrapper.
- `src/vite-env.d.ts` — Vite client types + augmented `ImportMetaEnv`.
- `src/styles/index.css` — Tailwind `@tailwind base/components/utilities` directives.
- `src/lib/env.ts` — typed env accessor for `VITE_*` vars; single audit point for browser env reads.
- `src/lib/env.test.ts` — smoke test confirming `env.ts` returns defaults when vars are absent and overrides when set.
- `src/test/setup.ts` — `@testing-library/jest-dom` import so `toBeInTheDocument()` etc. work in every test.

`.gitkeep` placeholders so empty directories commit:
- `src/components/.gitkeep`
- `src/editor/.gitkeep`
- `src/types/.gitkeep`
- `infra/.gitkeep`

### Relevant Documentation — YOU SHOULD READ THESE BEFORE IMPLEMENTING

- [Vite docs — Getting Started](https://vitejs.dev/guide/) — confirm `npm create vite@latest` scaffolding fields; we're manual but the template output is the reference shape.
- [Vite docs — Env Variables and Modes](https://vitejs.dev/guide/env-and-mode.html#env-files) — confirms `.env.local` load order and `VITE_*` exposure rules.
- [Tailwind CSS v3 — Installation (PostCSS)](https://tailwindcss.com/docs/installation/using-postcss) — v3 setup (NOT v4; v4 has different install). Confirms `postcss.config.js` + `tailwind.config.js` + `@tailwind` directives.
- [Tailwind CSS v3 — Adding Custom Variants (`addVariant`)](https://tailwindcss.com/docs/plugins#adding-variants) — for the `clean` variant plugin.
- [Vitest — Getting Started](https://vitest.dev/guide/) — confirms `test:` key inside `vite.config.ts` and triple-slash `/// <reference types="vitest" />`.
- [Vitest — Config (jsdom)](https://vitest.dev/config/#environment) — `environment: 'jsdom'` + `setupFiles`.
- [React Testing Library — Setup](https://testing-library.com/docs/react-testing-library/setup) — setup file pattern + jest-dom matchers.
- [typescript-eslint — Getting Started (flat config)](https://typescript-eslint.io/getting-started) — canonical ESLint 9 flat config for TS.

### Patterns to Follow

No pre-existing codebase patterns — this plan *establishes* them. New code should follow these conventions (from CLAUDE.md):

**Naming**
- Components: `PascalCase.tsx` (e.g., `App.tsx`)
- Hooks: `useXxx.ts`
- Libs: `camelCase.ts` (e.g., `env.ts`)
- Types: `PascalCase` for interfaces/types

**Env access**
```ts
// src/lib/env.ts
export const env = {
  assetsOrigin: import.meta.env.VITE_ASSETS_ORIGIN ?? '',
  devMainAppOrigin: import.meta.env.VITE_DEV_MAIN_APP_ORIGIN ?? 'http://localhost:8787',
} as const
```
**Everywhere else in the code imports `env` from `src/lib/env.ts`.** Never read `import.meta.env` directly from components or hooks — single audit point per the hard rule in CLAUDE.md + PRD §9.5.

**Clean-mode variant**
```js
// tailwind.config.js plugin
plugin(({ addVariant }) => {
  addVariant('clean', '.clean &')
})
```
Future chrome components use `className="clean:hidden"` to opt out in Clean mode.

**Error handling (for lib functions)**
- Pure libs return `{ ok: true, value } | { ok: false, error }` discriminated unions — do not throw.
- Components may throw (React error boundaries catch them).
- Hooks never throw.

---

## IMPLEMENTATION PLAN

### Phase 1: Root config files

Set up tool configuration before any source code, so type-checking and linting work the moment source files land.

**Tasks**
- Write `package.json` with pinned versions from PRD §8.
- Write `.gitattributes`, `.prettierrc.json`, `eslint.config.js`.
- Write `tsconfig.json` + `tsconfig.node.json`.
- Write `vite.config.ts` with integrated Vitest config.
- Write `tailwind.config.js` + `postcss.config.js`.
- Run `npm install` to produce `package-lock.json` + `node_modules/`.

### Phase 2: Entry points & styles

**Tasks**
- Write `index.html` (Vite root).
- Write `src/main.tsx` (React 18 createRoot).
- Write `src/App.tsx` (minimal placeholder shell).
- Write `src/styles/index.css` with Tailwind directives.
- Write `src/vite-env.d.ts` with the `ImportMetaEnv` augmentation.
- Write `public/config.json` and `public/favicon.svg`.

### Phase 3: Env accessor & test harness

**Tasks**
- Write `src/lib/env.ts` (typed accessor).
- Write `src/test/setup.ts` (imports jest-dom matchers).
- Write `src/lib/env.test.ts` (smoke test).

### Phase 4: Directory placeholders & validation

**Tasks**
- Add `.gitkeep` files to `src/components/`, `src/editor/`, `src/types/`, `infra/`.
- Run the full validation suite (typecheck, lint, test, build, dev).
- Verify `npm run dev` serves on `http://localhost:5173` and the placeholder App renders.

---

## STEP-BY-STEP TASKS

IMPORTANT: Execute every task in order, top to bottom. Each task is atomic and independently testable.

### 1. CREATE `package.json`

- **IMPLEMENT**: package manifest with scripts and pinned versions.
- **PATTERN**: follows the scripts section of `CLAUDE.md` ("Commands").
- **IMPORTS**: n/a (config file).
- **GOTCHA**:
  - `"type": "module"` — required so Vite 5 treats `.js` configs as ESM.
  - Pin versions exactly as PRD §8 specifies (use `^` within the major to allow patch updates).
  - Include `"engines": { "node": ">=20" }`.
- **CONTENT**:
  ```json
  {
    "name": "classifieds-02",
    "private": true,
    "version": "0.0.0",
    "type": "module",
    "engines": { "node": ">=20" },
    "scripts": {
      "dev": "vite",
      "build": "tsc -b && vite build",
      "preview": "vite preview",
      "typecheck": "tsc --noEmit",
      "lint": "eslint .",
      "format": "prettier --write .",
      "test": "vitest run",
      "test:watch": "vitest"
    },
    "dependencies": {
      "react": "^18.3.1",
      "react-dom": "^18.3.1"
    },
    "devDependencies": {
      "@testing-library/jest-dom": "^6.4.0",
      "@testing-library/react": "^16.0.0",
      "@testing-library/user-event": "^14.5.0",
      "@types/react": "^18.3.0",
      "@types/react-dom": "^18.3.0",
      "@vitejs/plugin-react": "^4.3.0",
      "autoprefixer": "^10.4.0",
      "eslint": "^9.10.0",
      "eslint-plugin-react": "^7.35.0",
      "eslint-plugin-react-hooks": "^5.0.0",
      "globals": "^15.0.0",
      "jsdom": "^25.0.0",
      "postcss": "^8.4.0",
      "prettier": "^3.3.0",
      "tailwindcss": "^3.4.0",
      "typescript": "^5.4.0",
      "typescript-eslint": "^8.0.0",
      "vite": "^5.2.0",
      "vitest": "^2.0.0"
    }
  }
  ```
- **VALIDATE**: `npm install` (in the next task); no `.` → yes, here we're just writing the file.

### 2. RUN `npm install`

- **IMPLEMENT**: install dependencies.
- **IMPORTS**: n/a.
- **GOTCHA**:
  - If this fails on a version resolution, relax to the next published patch of the affected package rather than downgrading wholesale.
  - First-run network fetch may take 1–3 min.
- **VALIDATE**: `npm install` completes with `0` high-severity audit warnings; `node_modules/` exists; `package-lock.json` is created.

### 3. CREATE `.gitattributes`

- **IMPLEMENT**: normalize line endings.
- **CONTENT**:
  ```
  * text=auto eol=lf
  *.png binary
  *.jpg binary
  *.jpeg binary
  *.pdf binary
  *.ico binary
  ```
- **GOTCHA**: eliminates the "LF will be replaced by CRLF" warnings we've been seeing on every commit on Windows.
- **VALIDATE**: `git check-attr --all -- src/App.tsx` returns `text: auto` and `eol: lf` after the file exists.

### 4. CREATE `.prettierrc.json`

- **CONTENT**:
  ```json
  {
    "semi": false,
    "singleQuote": true,
    "trailingComma": "all",
    "printWidth": 100,
    "tabWidth": 2
  }
  ```
- **VALIDATE**: `npx prettier --check .` exits 0 (may list unformatted files — they're formatted in task 25).

### 5. CREATE `tsconfig.json`

- **IMPLEMENT**: app TS config.
- **CONTENT**:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2022", "DOM", "DOM.Iterable"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "allowImportingTsExtensions": true,
      "resolveJsonModule": true,
      "isolatedModules": true,
      "noEmit": true,
      "jsx": "react-jsx",
      "strict": true,
      "noUnusedLocals": true,
      "noUnusedParameters": true,
      "noFallthroughCasesInSwitch": true,
      "skipLibCheck": true,
      "types": ["vitest/globals"]
    },
    "include": ["src"],
    "references": [{ "path": "./tsconfig.node.json" }]
  }
  ```
- **GOTCHA**: `types: ["vitest/globals"]` enables `describe`/`it`/`expect` without per-file imports if `globals: true` is set in vitest config. We set it.

### 6. CREATE `tsconfig.node.json`

- **CONTENT**:
  ```json
  {
    "compilerOptions": {
      "target": "ES2022",
      "lib": ["ES2023"],
      "module": "ESNext",
      "moduleResolution": "bundler",
      "allowSyntheticDefaultImports": true,
      "strict": true,
      "skipLibCheck": true
    },
    "include": ["vite.config.ts"]
  }
  ```

### 7. CREATE `vite.config.ts`

- **IMPLEMENT**: Vite config with integrated Vitest config.
- **IMPORTS**: `defineConfig` from `vite`, `react` from `@vitejs/plugin-react`.
- **CONTENT**:
  ```ts
  /// <reference types="vitest" />
  import { defineConfig } from 'vite'
  import react from '@vitejs/plugin-react'

  export default defineConfig({
    plugins: [react()],
    server: {
      port: 5173,
      strictPort: true,
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  })
  ```
- **GOTCHA**:
  - The triple-slash `/// <reference types="vitest" />` is **required** — without it TypeScript won't type-check the `test:` key.
  - `strictPort: true` so the dev server fails fast if 5173 is taken (prevents surprise ports in documented URLs).
  - `css: false` in vitest — skip CSS import processing in unit tests for speed.

### 8. CREATE `tailwind.config.js`

- **IMPLEMENT**: Tailwind 3 config with the custom `clean` variant.
- **CONTENT**:
  ```js
  /** @type {import('tailwindcss').Config} */
  import plugin from 'tailwindcss/plugin'

  export default {
    content: ['./index.html', './src/**/*.{ts,tsx}'],
    theme: {
      extend: {},
    },
    plugins: [
      plugin(({ addVariant }) => {
        addVariant('clean', '.clean &')
      }),
    ],
  }
  ```
- **GOTCHA**:
  - Must include `./index.html` in `content` or the body's base styles won't be generated.
  - `clean` variant: `className="clean:hidden"` on a descendant hides it when any ancestor has class `clean`. This is how Clean-mode will work (PRD §6).
  - File is `.js` (ESM — `"type": "module"` in package.json makes this work).

### 9. CREATE `postcss.config.js`

- **CONTENT**:
  ```js
  export default {
    plugins: {
      tailwindcss: {},
      autoprefixer: {},
    },
  }
  ```

### 10. CREATE `eslint.config.js`

- **IMPLEMENT**: ESLint 9 flat config.
- **CONTENT**:
  ```js
  import js from '@eslint/js'
  import globals from 'globals'
  import reactHooks from 'eslint-plugin-react-hooks'
  import tseslint from 'typescript-eslint'

  export default tseslint.config(
    { ignores: ['dist', 'node_modules'] },
    {
      extends: [js.configs.recommended, ...tseslint.configs.recommended],
      files: ['**/*.{ts,tsx}'],
      languageOptions: {
        ecmaVersion: 2022,
        globals: globals.browser,
      },
      plugins: {
        'react-hooks': reactHooks,
      },
      rules: {
        ...reactHooks.configs.recommended.rules,
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      },
    },
  )
  ```
- **GOTCHA**:
  - Flat config (ESLint 9 default). Do **not** create `.eslintrc.cjs` — that's legacy.
  - `@eslint/js` comes with eslint itself; no separate install needed.
  - Install `@eslint/js` if the import fails: `npm i -D @eslint/js`.

### 11. CREATE `index.html`

- **CONTENT**:
  ```html
  <!doctype html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>Ad Editor</title>
    </head>
    <body>
      <div id="root"></div>
      <script type="module" src="/src/main.tsx"></script>
    </body>
  </html>
  ```

### 12. CREATE `public/config.json`

- **CONTENT**:
  ```json
  {
    "assetsOrigin": "https://editor-assets.mirabeltech.com",
    "defaultWidthInches": 3.25
  }
  ```
- **GOTCHA**: this file is served at `/config.json` in both dev and prod; the running client will fetch it at mount to avoid baking the assets-origin into the bundle (PRD §9 Configuration table).

### 13. CREATE `public/favicon.svg`

- **CONTENT**:
  ```svg
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><rect width="24" height="24" rx="4" fill="#0f172a"/><text x="12" y="16" font-family="system-ui" font-size="10" fill="#f8fafc" text-anchor="middle" font-weight="600">Ad</text></svg>
  ```

### 14. CREATE `src/vite-env.d.ts`

- **IMPLEMENT**: Vite client types + typed `ImportMetaEnv`.
- **CONTENT**:
  ```ts
  /// <reference types="vite/client" />

  interface ImportMetaEnv {
    readonly VITE_ASSETS_ORIGIN?: string
    readonly VITE_DEV_MAIN_APP_ORIGIN?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
  ```
- **GOTCHA**: keep this file in sync with `.env.example`. Every `VITE_*` key in `.env.example` must have a matching optional field here.

### 15. CREATE `src/styles/index.css`

- **CONTENT**:
  ```css
  @tailwind base;
  @tailwind components;
  @tailwind utilities;

  html, body, #root {
    height: 100%;
  }

  body {
    margin: 0;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  }
  ```

### 16. CREATE `src/lib/env.ts`

- **IMPLEMENT**: typed, single-source accessor for `VITE_*` env vars.
- **IMPORTS**: none (uses `import.meta.env`).
- **CONTENT**:
  ```ts
  export const env = {
    assetsOrigin: import.meta.env.VITE_ASSETS_ORIGIN ?? '',
    devMainAppOrigin:
      import.meta.env.VITE_DEV_MAIN_APP_ORIGIN ?? 'http://localhost:8787',
  } as const

  export type Env = typeof env
  ```
- **GOTCHA**:
  - This is the **only** file in the browser codebase allowed to read `import.meta.env` directly (PRD §9.5, CLAUDE.md "Environment variables"). Every other file imports `env` from here.
  - Defaults must be safe for tests (jsdom) where env vars aren't set — hence the `??` fallbacks.

### 17. CREATE `src/lib/env.test.ts`

- **IMPLEMENT**: smoke test verifying the env reader returns defaults.
- **CONTENT**:
  ```ts
  import { describe, it, expect } from 'vitest'
  import { env } from './env'

  describe('env', () => {
    it('exposes an assetsOrigin string (default empty)', () => {
      expect(typeof env.assetsOrigin).toBe('string')
    })

    it('defaults devMainAppOrigin to the dev stub URL when unset', () => {
      // Vitest runs without a real .env.local, so the fallback should kick in.
      expect(env.devMainAppOrigin).toBe('http://localhost:8787')
    })
  })
  ```
- **GOTCHA**: if the developer has a `VITE_DEV_MAIN_APP_ORIGIN` in their shell when they run the test, the second assertion fails. That's acceptable — Vitest reads `.env.local` but not the shell by default. If it becomes flaky, unset explicitly in `vite.config.ts` under `test.env` for the test run.

### 18. CREATE `src/test/setup.ts`

- **CONTENT**:
  ```ts
  import '@testing-library/jest-dom/vitest'
  ```
- **GOTCHA**: the `/vitest` subpath import is required — the plain `@testing-library/jest-dom` path is jest-only. Wrong import → `toBeInTheDocument` fails with "is not a function".

### 19. CREATE `src/main.tsx`

- **CONTENT**:
  ```tsx
  import { StrictMode } from 'react'
  import { createRoot } from 'react-dom/client'
  import App from './App'
  import './styles/index.css'

  const rootEl = document.getElementById('root')
  if (!rootEl) throw new Error('Missing #root element in index.html')

  createRoot(rootEl).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
  ```
- **GOTCHA**: throwing from the entry point is fine (no error boundary above it). Do **not** silently no-op — a missing `#root` is an index.html bug we want to surface loudly.

### 20. CREATE `src/App.tsx`

- **IMPLEMENT**: minimal placeholder shell. No domain logic. Leaves a documented hook-point for the canvas that lands in the next plan.
- **CONTENT**:
  ```tsx
  export default function App() {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <header className="clean:hidden border-b border-slate-200 bg-white px-4 py-3">
          <h1 className="text-sm font-semibold">Ad Editor</h1>
        </header>
        <main className="p-4">
          {/* Canvas + rulers mount here in the next plan (PRD §7). */}
          <p className="text-sm text-slate-500">Scaffold ready. Canvas lands next.</p>
        </main>
      </div>
    )
  }
  ```
- **GOTCHA**:
  - `clean:hidden` on the header verifies the Tailwind custom variant compiles. Remove the comment and the `clean:` class in a later plan if the header stays visible in Clean mode.
  - Do **not** add router, context, hooks, or state — this is just enough to render something.

### 21. CREATE `.gitkeep` placeholders

- **FILES**: empty files at
  - `src/components/.gitkeep`
  - `src/editor/.gitkeep`
  - `src/types/.gitkeep`
  - `infra/.gitkeep`
- **GOTCHA**: git doesn't track empty directories; `.gitkeep` is the conventional way to commit an empty dir. Remove each `.gitkeep` in a later plan once the directory has real content.

### 22. VALIDATE `npm run typecheck`

- **VALIDATE**: `npm run typecheck` → exits 0.

### 23. VALIDATE `npm run lint`

- **VALIDATE**: `npm run lint` → exits 0.

### 24. VALIDATE `npm test`

- **VALIDATE**: `npm test` → `env.test.ts` passes, 2 tests green.

### 25. VALIDATE `npm run build`

- **VALIDATE**: `npm run build` → `dist/` created, no errors, bundle < 200 KB gzipped.

### 26. VALIDATE `npm run dev`

- **RUN**: `npm run dev` in a background task.
- **VALIDATE**:
  - Dev server listens on `http://localhost:5173`.
  - Fetching `/` returns the `Ad Editor` heading.
  - Fetching `/config.json` returns the JSON from `public/config.json`.
  - No console errors in the browser.
- **GOTCHA**: must stop the server after the check (it's launched in background). If running via an agent, use the background-task kill flow rather than leaving it running.

### 27. RUN `npx prettier --write .`

- **VALIDATE**: no staged diff afterwards except formatting normalizations on the files you just created.
- **GOTCHA**: don't run this before task 24 — the tests may flag a formatting bug that's easier to see unformatted.

---

## TESTING STRATEGY

### Unit Tests (Vitest)

- `src/lib/env.test.ts` (task 17) — verifies the env accessor returns string defaults and the expected fallback for `devMainAppOrigin`.

That is the **only** test added in this plan. Domain-level tests arrive with the features they test (block model, stats, querystring parser — each in its own plan).

### Integration Tests

None in this plan. Deferred to Phase 2+.

### Edge Cases

- `.env.local` missing → `env.ts` must return sensible defaults (covered by test).
- `#root` missing in `index.html` → `main.tsx` throws a clear error (verified by inspection, not automated test).
- Port 5173 taken → dev server fails fast due to `strictPort: true` (verified by inspection).

---

## VALIDATION COMMANDS

Execute every command. All must pass.

### Level 1: Syntax & Style

```bash
npm run typecheck
npm run lint
npx prettier --check .
```

### Level 2: Unit Tests

```bash
npm test
```

Expect: 2 passed, 0 failed.

### Level 3: Integration Tests

Skipped — no integration surface yet.

### Level 4: Manual Validation

1. `npm run dev`.
2. Open `http://localhost:5173`. Confirm the heading "Ad Editor" renders.
3. `curl http://localhost:5173/config.json` → JSON body matches `public/config.json`.
4. Stop the dev server.
5. `npm run build`. Confirm `dist/` contains `index.html`, `assets/*.js`, `assets/*.css`, `config.json`, `favicon.svg`.
6. `npm run preview`. Open the preview URL. Same heading renders.

### Level 5: Additional Validation

- Inspect `dist/index.html` — the `<script>` src should be hashed (e.g., `/assets/index-AbCd1234.js`).
- Inspect `dist/assets/*.css` — search for `clean\\:hidden` → should match (confirms the custom Tailwind variant compiled).

---

## ACCEPTANCE CRITERIA

- [ ] `package.json` exists with all deps/scripts from task 1.
- [ ] `npm install` completes cleanly; `package-lock.json` committed.
- [ ] `npm run typecheck` → 0 errors.
- [ ] `npm run lint` → 0 errors, 0 warnings.
- [ ] `npx prettier --check .` → 0 files need formatting.
- [ ] `npm test` → 2 tests pass, 0 fail.
- [ ] `npm run build` → succeeds; `dist/` populated.
- [ ] `npm run dev` → serves on `http://localhost:5173`; `/` returns the placeholder page; `/config.json` returns the runtime config.
- [ ] `.clean` Tailwind variant compiles — search `dist/assets/*.css` for `clean\\:hidden` and find a match.
- [ ] No direct `import.meta.env` read anywhere outside `src/lib/env.ts` and `src/vite-env.d.ts`.
- [ ] Every `VITE_*` key in `.env.example` has a matching field on `ImportMetaEnv` in `src/vite-env.d.ts`.
- [ ] `.gitattributes` exists; `git status` no longer warns about CRLF conversion on staged files.
- [ ] `.gitkeep` files exist in `src/components/`, `src/editor/`, `src/types/`, `infra/`.

---

## COMPLETION CHECKLIST

- [ ] All 27 tasks completed in order.
- [ ] Each validation command passed as-listed.
- [ ] `npm test` green.
- [ ] `npm run build` green; bundle inspected.
- [ ] `npm run dev` smoke-tested manually.
- [ ] No linting or type-checking errors.
- [ ] Acceptance criteria all met.
- [ ] Code reviewed for adherence to CLAUDE.md code patterns (naming, env-access rule, no-throw-from-hooks — last one is vacuous in this plan but the habit starts here).

---

## NOTES

**Design decisions**
- **Manual scaffold, not `npm create vite@latest`** — the tool refuses to run in a non-empty directory and there's real risk it would touch `PRD.md` / `CLAUDE.md` if forced. Writing files by hand is more deterministic and about the same effort.
- **ESLint 9 flat config** — the 2026 default. Legacy `.eslintrc.*` is deprecated. No reason to start on deprecated config.
- **Vitest embedded in `vite.config.ts`** — one config file instead of two. `/// <reference types="vitest" />` is the canonical way per Vitest docs.
- **Tailwind 3, not 4** — PRD §8 pinned 3.4. v4 has a materially different install (Oxide engine, no PostCSS required). When we eventually upgrade we'll do it as a dedicated plan.
- **`src/lib/env.ts` with `??` defaults** — keeps the rest of the code from having to handle undefineds. Defaults must be safe for tests (jsdom + no real `.env.local`).
- **`clean:hidden` on the placeholder header** — acts as a canary that the Tailwind custom variant actually compiled. If the acceptance criterion "grep for `clean\\:hidden` in built CSS" fails, the Tailwind plugin is mis-wired before anything depends on it.

**Trade-offs**
- No Husky / lint-staged. Skipping pre-commit hooks for v1 — the single-dev workflow doesn't need them, and they add dependency surface.
- No Storybook. If/when it becomes worth it, add in a later plan.
- No `.vscode/` config committed. Per-developer editor config shouldn't live in the repo.

**Confidence for one-pass execution: 9/10.** The only realistic failure mode is upstream version churn in one of the pinned minor versions between plan-write-time and execution-time — if `npm install` fails, relax the affected `^x.y.z` to the latest published patch.
