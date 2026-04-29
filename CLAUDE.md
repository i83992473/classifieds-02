# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Status: pre-scaffold.** The codebase has not been scaffolded yet — this file is generated from the locked decisions in `PRD.md`. Regenerate after Phase 1 (Vite scaffold) is merged so patterns can be read from actual code.

---

## Project Overview

**Classified-02 Ad Editor** — a standalone React web app for creating small print-style classified and business-directory advertisements. Opened as a popup from a parent "main app" with identifying parameters in the URL. On save, produces a raster PDF + thumbnail + `ad.json`, writes them to AWS S3 via pre-signed URLs, and POSTs metadata to a callback endpoint on the main app.

Single-developer, AI-assisted. No authentication in the editor itself — trust flows from a short-lived Bearer token in the querystring.

See `PRD.md` at the repo root for the full specification.

---

## Tech Stack

| Technology | Purpose |
|------------|---------|
| React 18 + TypeScript 5 | UI framework + type safety |
| Vite 5 | Build tool + dev server |
| Tailwind CSS 3 | Styling (also powers Clean-mode CSS-class toggle) |
| jsPDF + html2canvas | Client-side raster PDF at `scale: 3` |
| @dnd-kit/core + /sortable | Accessible drag-reorder for blocks |
| AWS S3 + CloudFront + Route 53 | Hosting + asset storage |
| ACM (us-east-1) | TLS wildcard cert `*.mirabeltech.com` |

**Deliberately not using:** MUI, Amplify, Cognito, any server-side PDF library, any backend.

---

## Commands

```bash
# Development
npm run dev              # Vite dev server on localhost:5173

# Build
npm run build            # vite build → dist/

# Type check
npm run typecheck        # tsc --noEmit

# Lint
npm run lint             # eslint src/

# Deploy (app bucket)
aws s3 sync ./dist s3://classifieds-ad-editor/ --delete \
  --cache-control "public,max-age=31536000,immutable" --exclude index.html --profile classifieds-admin
aws s3 cp ./dist/index.html s3://classifieds-ad-editor/index.html \
  --cache-control "no-cache,no-store,must-revalidate" --profile classifieds-admin
aws cloudfront create-invalidation --distribution-id $EDITOR_DIST_ID \
  --paths "/index.html" "/" --profile classifieds-admin
```

All AWS CLI calls **must** use `--profile classifieds-admin` (account 539247468693).

---

## Project Structure

Target layout (see PRD §6 for rationale):

```
classifieds-02/
├── infra/                          # AWS provisioning scripts + configs (CORS, policies, dist configs)
├── public/
├── src/
│   ├── main.tsx
│   ├── App.tsx                     # Top-level layout + shortcut handlers
│   ├── components/                 # AdCanvas, rulers, blocks, toolbar, rail, mode toggle
│   ├── editor/                     # Stateful hooks: useAdDoc, useUndoableState, useAdStats, useImageDrop, useShortcuts
│   ├── lib/                        # Pure helpers: pdf, thumbnail, s3, api, fonts, units, querystring
│   ├── types/                      # Block, AdDoc, AdStats, AdWarning, LaunchParams
│   └── styles/
├── PRD.md                          # Source of truth for product decisions
└── CLAUDE.md                       # this file
```

**Hooks vs lib:** `src/editor/` holds React hooks (stateful, depend on context). `src/lib/` holds pure functions (no React, no state). Don't mix them.

---

## Architecture

Single-page app. Popup window lifecycle:

```
Main app → window.open("editor.mirabeltech.com/?tenantId=…&adId=…&token=…&callbackUrl=…")
  ↓
Editor mounts → parses querystring → fetches editor-assets.mirabeltech.com/public/tenants/{tenantId}/ads/{adId}/ad.json
  ↓
User edits. On image drop: POST /sign-upload → receive pre-signed URL → PUT direct to S3.
  ↓
User saves (Ctrl+S). Compute stats → html2canvas(previewEl, { scale: 3 }) → jsPDF → blob.
  ↓
POST /sign-upload for [ad.json, pdf.pdf, thumbnail.jpg] → PUT each → POST callbackUrl with metadata+stats.
```

Two S3 buckets, two CloudFront distributions, one wildcard cert. Writes bypass CloudFront; reads go through it.

---

## Code Patterns

### Multi-tenancy: server-built S3 keys, JWT-claim authority
The editor is multi-tenant. Full spec: PRD §16. The rules that matter for code:

- **Every S3 key starts with `public/tenants/{tenantId}/ads/{adId}/...`** Hard-coded in tests as fixtures only; never as a literal in production code.
- **The editor never sends a full S3 key to `/sign-upload`.** It sends `{ name, contentType, contentLength }` per file (e.g., `name: "pdf.pdf"`, `name: "images/img-abc123.jpg"`). The main app builds the full key server-side from the verified JWT-claim `tenantId`. Client-side prefix construction is the canonical multi-tenant data-leak bug — do not reintroduce it.
- **The editor treats the Bearer token as opaque.** It never parses the JWT. Trust the main app to validate the claim on every API call.
- **`tenantId` is a guessable slug** (`acme`, `bigpub`); the unguessable `adId` carries path-secrecy on reads. The cryptographic boundary lives in the JWT claim, not the slug.
- **Required launch params:** `tenantId`, `tenantName`, `adId`, `token`, `callbackUrl`. Missing any of these → render a hard error page; do **not** mount the edit surface. (`width` remains optional with a 3.25" default — unlike the other params, a missing width is recoverable.)
- **Branding/whitelabel is v2.** Don't add per-tenant config endpoints or theming hooks until that lands. `tenantName` in the header is the only tenant-visible surface in v1.
- **`callbackUrl` validation lives on the main app**, not the editor (PRD §16.5). The editor forwards the URL it was launched with.

### Block-JSON is the single source of truth
Every surface — editor preview, raster capture, stats, persisted ad.json, callback payload — reads from the same `Block[]` array. No adapters. No secondary representations. The JSON is versioned (`{ version: 1, widthInches, blocks: [] }`).

### Pure hooks for derived state
`useAdStats(blocks, widthInches, previewRef)` is a pure function of its inputs, memoized with `useMemo`. **Do not cache stats in state.** Same for `useUndoableState`: snapshots are a pure function of state transitions, not a side effect.

### Clean mode is a CSS class, not a route
`Ctrl+2` adds `.clean` to the root element. Tailwind variants (`clean:hidden`, etc. via a plugin or a wrapper) hide chrome. **Do not build a separate Preview route.** Zero render duplication.

### Writes bypass CloudFront
Pre-signed PUT URLs go direct to S3. CloudFront fronts reads only. Do not try to proxy writes through CF — SigV4 header-forwarding is fragile.

### OAC, not OAI
Origin Access Control with SigV4. OAI is deprecated; never create new OAI resources.

### Per-tick `<div>` rulers
Each tick is a single absolutely-positioned `<div>`. Pixel-accurate, no SVG, no canvas, trivially styled with Tailwind. Don't switch to CSS gradient, repeating-background, or SVG (tick spacing drifts on non-integer devicePixelRatio and on zoom). See PRD §7 *AdCanvas + Rulers → Ruler implementation requirements* for the full spec: 20 px track, 4-level tick cadence (1" / 0.5" / 0.25" / 0.125"), integer-inch labels at 10 px, `Math.round(inches × 96)` for positions, excluded from `html2canvas` capture.

### Whole-block text formatting
Each `TextBlock` has one `{ font, sizePt, bold, italic, underline, align, highlight }`. **No inline per-character formatting** in v1 — that would push us toward TipTap, which we've explicitly rejected for this use case.

### Naming
- Files: `PascalCase.tsx` for React components, `camelCase.ts` for hooks and libs.
- Hooks: `useXxx` always.
- Types: `PascalCase` for types/interfaces; union types for discriminated blocks (`type Block = TextBlock | ImageBlock`).
- Block IDs: short unguessable strings (`nanoid(8)` or similar).

### Units
**Canonical unit is inches.** Convert to px at the boundary (96 px/in) and to points at the PDF boundary (72 pt/in). Off-by-4/3 errors between 96 and 72 DPI are the most common print-layout bug.

### Error handling
- Validate querystring at mount; fall back to defaults (`width=3.25`) rather than error-page on missing optional params.
- Show a toast on save failure with status code; don't auto-retry.
- Never throw from a hook; return `{ ok: false, error }` instead so UI can surface it.

### Environment variables
`.env.example` at repo root is the committed contract; `.env.local` holds real values and is gitignored. Full spec: PRD §9.5. **Hard rule:** adding a `process.env.X` or `import.meta.env.VITE_X` read anywhere in the codebase requires adding the same key + comment + placeholder to `.env.example` in the same commit. `VITE_*` vars are inlined into the browser bundle (public — never put secrets there); unprefixed vars are Node/shell only. All browser-side env reads go through `src/lib/env.ts` (typed accessor, single audit point) — never read `import.meta.env` directly from component or hook code. Current secret inventory: `FIRECRAWL_API_KEY` only. AWS credentials live in the `classifieds-admin` CLI profile, not in env.

---

## Testing

Three layers (full spec: PRD §11.5).

1. **Unit (Vitest)** — pure functions in `src/lib/` and pure hooks in `src/editor/`. Run with `npm test`. Co-locate `*.test.ts` next to source. Fast (<1 s suite target). Network stubbed via `vi.fn()` at the `fetch` boundary.
2. **Component (RTL + jsdom)** — stateful components: `AdCanvas` ruler tick count, `TextBlockView` formatting, `StatsRail` responsive collapse, `BlockList` reorder, `useShortcuts` dispatch. `html2canvas` and image decoding stubbed.
3. **E2E (Firecrawl)** — agent-driven browser automation via the `firecrawl-interact` / `agent-browser` skills against `localhost:5173` and the deployed URL. Covers nine named flows (F-1 through F-9 in PRD §11.5). Manual sign-off on the same flows before any deploy. Prompts for each flow stored under `docs/e2e-prompts/F-*.md` so runs are reproducible. Firecrawl API key in `.env.local` (never committed).

Coverage is not enforced, but aim for >70% line coverage on `src/lib/` and `src/editor/` by end of Phase 2.

---

## Validation (pre-deploy)

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

Then run the Firecrawl agent over flows F-1 through F-9 against the built bundle (served locally) before syncing to S3, and do a manual pass of the same flows on the real deploy target after CloudFront settles.

---

## Key Files

| File | Purpose |
|------|---------|
| `PRD.md` | Authoritative product spec. Lock before changing. |
| `CLAUDE.md` | This file. |
| `infra/setup.sh` | (planned) end-to-end AWS provisioning commands |

---

## AWS context

| Resource | Value |
|---|---|
| Account | 539247468693 |
| CLI profile | `classifieds-admin` (mandatory on every `aws` call) |
| Region | us-east-1 (ACM for CloudFront mandatory here) |
| Route 53 HZ | `Z057432312ZPK7D2Z0Z85` (mirabeltech.com, 11 existing records — non-destructive UPSERTs only) |
| App bucket | `classifieds-ad-editor` |
| Assets bucket | `classifieds-ad-assets` |
| App domain | `editor.mirabeltech.com` |
| Assets CDN | `editor-assets.mirabeltech.com` |
| Cert | `*.mirabeltech.com` wildcard (to be created) |

---

## Integration contract

Two endpoints on the parent main app (see PRD §10):

1. **`POST /api/classifieds/sign-upload`** (new — main-app team to build)
   - Validates Bearer token, extracts verified `tenantId` claim, validates `(tenantId, adId)` ownership
   - **Constructs full S3 keys server-side** as `public/tenants/{tenantId}/ads/{adId}/{file.name}` — client sends only `name`, never a full key
   - Validates `callbackUrl.host` is on the tenant's registered allowlist (rejects cross-tenant exfil)
   - Returns pre-signed PUT URLs with 15-min expiry, paired with the server-built `key`

2. **`POST {callbackUrl}`** (URL provided in querystring)
   - Final save notification with metadata + stats snapshot; payload includes `tenantId` echo

Both require CORS allow-origin for `https://editor.mirabeltech.com` and `http://localhost:5173`.

---

## Notes & Gotchas

- **Wildcards in CORS `AllowedHeaders` break with SigV4-signed URLs.** Enumerate every header (`Content-Type`, `Content-MD5`, `x-amz-content-sha256`, `x-amz-date`, `x-amz-security-token`, `x-amz-user-agent`, `x-amz-acl`, `x-amz-server-side-encryption`).
- **ACM certs must be in us-east-1 for CloudFront** regardless of where buckets live. "Cert not found" when attaching is almost always wrong-region.
- **Wildcard `*.mirabeltech.com` covers single-level only.** It does NOT cover `x.y.mirabeltech.com`. No double-label subdomains.
- **Do not cache `index.html` on CloudFront.** Hashed JS/CSS assets get `max-age=31536000,immutable`; `index.html` gets `no-cache`. Stale `index.html` = stale JS = production outage after deploy.
- **SPA fallback must rewrite both 403 AND 404 to `/index.html`.** S3 returns 403 (not 404) for missing objects when OAC has no `ListBucket`.
- **Always `await document.fonts.ready`** before `html2canvas()`. Otherwise the raster captures a fallback font and the PDF won't match the preview.
- **Pre-signed URL expiry: 15 min.** Shorter fails slow uploads on bad connections; longer is a security risk.
- **CloudFront deploys take 5–20 min.** Budget for this; iteration on distribution config is slow.
- **Do not commit to `.env` values that hardcode the main-app origin.** Treat it as runtime config (launched via querystring) so the same bundle works for any main-app instance.
- **The user prefers `AskUserQuestion` (arrow-key multi-choice) for discovery Q&A** over letter-typed options.
