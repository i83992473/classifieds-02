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

**Deliberately not using:** MUI, Amplify, Cognito, any server-side PDF library, any backend. The `ReferenceCode/` folder has MUI + Amplify — **do not lift wholesale**; it's included only for proven block-model and ruler patterns (see "Key Files" below).

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
Main app → window.open("editor.mirabeltech.com/?adId=…&token=…&callbackUrl=…")
  ↓
Editor mounts → parses querystring → fetches editor-assets.mirabeltech.com/public/ads/{adId}/ad.json
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
Proven from `ReferenceCode/src/App.tsx:2157-2276`. Pixel-accurate, no SVG, no canvas, trivially styled with Tailwind. Don't switch to CSS gradient (tick spacing drifts on non-integer DPI).

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

---

## Testing

No test framework in v1 — manual smoke-test before each deploy per PRD §12 Phase 4. Add Vitest only if test coverage becomes a concrete concern.

---

## Validation (pre-deploy)

```bash
npm run typecheck && npm run lint && npm run build
```

Then smoke-test the built bundle against the local dev environment before syncing to S3.

---

## Key Files

| File | Purpose |
|------|---------|
| `PRD.md` | Authoritative product spec. Lock before changing. |
| `CLAUDE.md` | This file. |
| `ReferenceCode/src/App.tsx:181-200` | **Block type definitions** — lift shape, adapt field names |
| `ReferenceCode/src/App.tsx:2157-2276` | **Ruler components** (Horizontal + Vertical) — lift verbatim, restyle with Tailwind |
| `ReferenceCode/src/App.tsx:1412-1452` | **Raster PDF flow** — reference pattern for `html2canvas` + `jsPDF` at scale:3 |
| `infra/setup.sh` | (planned) end-to-end AWS provisioning commands |

**Do not** lift from ReferenceCode wholesale — it's a 4000-line admin dashboard with Amplify/MUI. Only the patterns above are relevant.

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
   - Validates Bearer token + caller owns `adId`
   - Returns pre-signed PUT URLs scoped to `public/ads/{adId}/...` with 15-min expiry

2. **`POST {callbackUrl}`** (URL provided in querystring)
   - Final save notification with metadata + stats snapshot

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
