# Classified-02 Ad Editor — Product Requirements Document

**Status:** Draft · **Version:** 1.0 · **Date:** 2026-04-21
**Owner:** iriley@magazinemanager.com
**Repository:** https://github.com/i83992473/classifieds-02.git

---

## 1. Executive Summary

The **Classified-02 Ad Editor** is a standalone, single-purpose web application that enables users to compose small print-style classified and business-directory advertisements in a browser. It is opened as a popup from a parent "main app" with identifying parameters in the URL, presents a fixed-width-in-inches, variable-height canvas with a block-based content model (text blocks and image blocks), and on save produces a raster PDF + thumbnail image which are written to AWS S3. It then POSTs the resulting metadata — including live-computed content statistics — back to the main app via a callback URL for attachment to the ad record as a production note.

The product deliberately trades vector-PDF fidelity for operational simplicity: in v1 the PDF is generated client-side via `html2canvas` + `jsPDF`, eliminating the need for any backend infrastructure beyond two S3 buckets and two CloudFront distributions. At `scale: 3` the raster output clears the 200 DPI newspaper print specification comfortably, and the entire architecture can be built, deployed, and operated by a single developer at under $5/month of AWS spend.

**MVP goal:** Enable a user opened into `editor.mirabeltech.com?adId=…&token=…&callbackUrl=…` to produce, save, and round-trip a print-quality classified ad with text, formatting, and images — all without authentication beyond the short-lived Bearer token issued by the main app.

---

## 2. Mission

Give publishers and ad-placement staff a dedicated, distraction-free surface to compose a print ad, see it live, understand its content profile (word count, column-inches, image quality), and hand a print-ready PDF back to the parent system.

### Core Principles

1. **The editor IS the preview.** No separate preview route. What the user sees is what will print.
2. **Block-JSON is the single source of truth.** Preview and PDF both render from the same block array. There is no second canonical representation.
3. **Ship the simplest thing that works.** Raster client-side PDF clears the print spec; do not build backend PDF infra until a concrete requirement (searchable text, server re-render) forces the upgrade.
4. **Live feedback over dialogs.** Content statistics and warnings update continuously in a rail; they never block save.
5. **The parent app owns the domain model.** This editor renders ads and reports metadata. It does not know about pricing, users, sections, ordering rules, or approval state — those are the parent's concerns.

---

## 3. Target Users

### Primary: Advertising Production Staff
Publishing-industry users (newspaper, magazine, directory) who place and produce ads as part of a larger workflow tool. They open this editor from the parent app, complete a single ad, and close. They are **not** casual users — they understand newspaper typography, column-inches, and print-quality concerns.

- **Technical comfort:** Moderate. Familiar with word processors, layout tools, browser popups, and drag-and-drop. Not developers.
- **Platform:** Desktop only. Chromium-family browsers. Popup window typical size 1000–1400 × 700–900.
- **Frequency:** Multiple sessions per day during production cycles.

### Key needs
- See the ad exactly as it will print — width in inches with rulers.
- Drop images in fast; have them auto-stretch to ad width while keeping aspect ratio.
- Know the word count and column-inches at a glance (these drive billing).
- Get flagged when an image will print at unusably low DPI.
- Save and hand the output back to the parent app without thinking about storage.

### Key pain points addressed
- No longer building ads in Word/Canva/Publisher and re-entering metadata in the parent app.
- No longer eyeballing whether an image is "big enough" for print — DPI warning is live.
- No more separate tools for preview and edit — one surface.

---

## 4. MVP Scope

### ✅ In Scope (v1)

**Core functionality**
- ✅ Fixed-width-in-inches canvas driven by querystring `width` parameter (default 3.25")
- ✅ Variable-height canvas that grows with content
- ✅ Horizontal + vertical inch rulers along the top and left of the canvas
- ✅ Block-based content: `TextBlock` and `ImageBlock`
- ✅ Whole-block text formatting: bold, italic, underline, font family, font size, alignment, highlight color
- ✅ Images auto-stretch to 100% ad width, aspect ratio preserved
- ✅ Image input via drop (from OS), paste (clipboard), and file picker
- ✅ Immediate image upload to S3 via pre-signed PUT URL on drop
- ✅ Block reorder via drag handle **and** up/down arrow buttons
- ✅ Structural undo/redo (add, delete, reorder, image swap, format changes — not per-keystroke text edits)
- ✅ Floating per-block formatting toolbar (Notion-style)
- ✅ Curated font dropdown (web-safe + Google Fonts, grouped)

**Content statistics & warnings**
- ✅ Live-computed stats: word count, character count, block count (total/text/image), ad height in inches, column-inches, low-DPI image count, empty-block count
- ✅ Advisory warnings: low-DPI image (<150 DPI at print size), empty text block
- ✅ Warnings visible in the stats rail **and** as a red dot/tooltip on the offending block
- ✅ Warnings are advisory only — save is never blocked

**UI layout**
- ✅ Single-canvas WYSIWYG (canvas left-of-center, stats rail right)
- ✅ Collapsible right stats rail — open ≥1100px, collapsed to header chips + warnings badge below
- ✅ Rail state persisted in `localStorage`
- ✅ Two view modes: **Edit** (full chrome) and **Clean** (CSS class hides rulers/toolbars/drag handles)
- ✅ Segmented control in header + keyboard shortcuts (`Ctrl+1` Edit, `Ctrl+2` Clean, `Ctrl+.` stats, `Ctrl+S` save)

**Integration**
- ✅ Opened as a popup (`window.open`) from the parent main app
- ✅ Launch parameters via querystring: `width`, `adId`, `adName`, `sectionId`, `sectionName`, `positionId`, `positionName`, `sortOrder`, `token`, `callbackUrl`
- ✅ Default width fallback (3.25") if `width` missing/invalid
- ✅ On load: fetch `public/ads/{adId}/ad.json` from `editor-assets.mirabeltech.com` — restore state if present; blank canvas otherwise
- ✅ On save: pre-signed PUT uploads of `ad.json`, `pdf.pdf`, `thumbnail.jpg`, and images; then POST to `callbackUrl` with full metadata + stats snapshot

**Technical**
- ✅ Client-side raster PDF via `html2canvas` (`scale: 3`, JPEG 0.92 for photo ads) + `jsPDF` (single-page sized `[widthInches × heightInches]`)
- ✅ 300px-wide JPEG thumbnail (quality 0.85) generated from the same canvas
- ✅ `document.fonts.ready` awaited before canvas capture

**Deployment**
- ✅ App hosted on `editor.mirabeltech.com` (S3 + CloudFront + OAC)
- ✅ Assets on `editor-assets.mirabeltech.com` (S3 + CloudFront + OAC for reads; direct PUT for writes)
- ✅ Single wildcard `*.mirabeltech.com` ACM certificate in us-east-1
- ✅ IPv6 AAAA alias records
- ✅ GitHub repository at `i83992473/classifieds-02`

---

### ❌ Out of Scope (deferred to future phases)

**PDF & rendering**
- ❌ Server-side PDF generation (pdfkit, Chromium/Lambda, Gotenberg) — v2 upgrade path
- ❌ Vector / selectable / searchable text in the PDF
- ❌ Font embedding (subsetted) in PDF
- ❌ Page bleed or safety-margin overlays
- ❌ Multi-page ads

**Editor**
- ❌ Inline per-character formatting inside a text block (whole-block only in v1)
- ❌ Per-keystroke undo history
- ❌ Ad-type branching (classified vs. directory) — width alone is sufficient
- ❌ Additional block types (shape, divider, table, QR code)
- ❌ Free-positioning images (all content is vertically stacked)
- ❌ Web-page drag-in of images (disk/paste/picker only; CORS-laden web-drag deferred)

**Preview & views**
- ❌ Dedicated Preview route (Clean mode covers the need)
- ❌ Proof mode (simulated newspaper-page background)
- ❌ Mobile-catalog preview

**Stats & pricing**
- ❌ Estimated price display
- ❌ Flesch-Kincaid readability
- ❌ Per-block stats (ad-total only)
- ❌ Separate stats export artifact

**Auth & security**
- ❌ User authentication (trust the short-lived Bearer token only)
- ❌ Cognito Identity Pools
- ❌ STS AssumeRoleWithWebIdentity
- ❌ Non-popup integration modes (iframe, full-page redirect)

**Infrastructure**
- ❌ CI/CD pipeline (manual deploy via `aws s3 sync` + invalidation in v1)
- ❌ Separate dev subdomain (`editor-dev.mirabeltech.com`) — localhost-only dev
- ❌ Observability / monitoring dashboards beyond CloudWatch defaults

---

## 5. User Stories

### Primary stories

**US-1** · As a production user, I want to open the editor from the main app with a known ad pre-loaded, so that I can continue editing an ad in progress without re-entering anything.
*Example:* Clicking "Edit" on ad #42 in the main app opens `https://editor.mirabeltech.com/?adId=42&…&token=xyz`; the editor fetches `ad.json` from S3 and restores blocks, width, and formatting.

**US-2** · As a production user, I want to type formatted headlines and body copy directly into the ad, so that I can see exactly what will print.
*Example:* I click "Add text block," type "ESTATE SALE," apply bold + size 18pt + center alignment; the canvas shows it immediately at final print dimensions.

**US-3** · As a production user, I want to drag an image from my desktop into the ad and have it auto-fit the ad width, so that I don't have to manually size images.
*Example:* I drag `sofa.jpg` (1200×800) into a 3.25" ad; it renders at 312px wide × 208px tall in the preview (3.25" × 2.17" in print).

**US-4** · As a production user, I want to see at a glance how many words and column-inches my ad is, so that I know what the parent app will bill for.
*Example:* Right-side stats rail shows "47 words / 3.25" × 4.00" / 13 col-in" updating as I type.

**US-5** · As a production user, I want to be warned when an image will print poorly, so that I don't submit a blurry ad.
*Example:* I drop a 200px-wide image into a 3.25" ad (61 DPI at print); a red dot appears on that block and the warnings panel says "Image 2: 61 DPI — low for print (min 150 DPI)."

**US-6** · As a production user, I want to reorder blocks quickly, so that I can rearrange the ad without deleting and re-adding content.
*Example:* I drag a block's handle upward; or I click the "↑" button on a block; both move it one position up.

**US-7** · As a production user, I want to see the ad without editor chrome before saving, so that I can proof-read it as it will appear in print.
*Example:* I press `Ctrl+2`; rulers, drag handles, and block toolbars disappear; only the ad content remains on the canvas.

**US-8** · As a production user, I want to save the ad and have the parent app immediately know about the new PDF, so that I don't have to manually attach it.
*Example:* I press `Ctrl+S`; editor uploads `pdf.pdf`, `thumbnail.jpg`, `ad.json` to S3; POSTs the metadata + stats to `callbackUrl`; shows "Saved"; main app receives the payload and attaches the PDF as a production note on ad #42.

### Technical stories

**TS-1** · As a developer, I want the ad's block JSON to be the single source of truth, so that the editor, the PDF output, and the stats all derive from one representation without drift.

**TS-2** · As a developer, I want the browser to write to S3 only via pre-signed URLs issued by the main app, so that I never embed IAM credentials or a Cognito pool in the frontend.

**TS-3** · As a developer, I want a `useAdStats(blocks, widthInches, previewRef)` pure hook, so that stats are always consistent with current state with no caching layer to invalidate.

**TS-4** · As a developer/operator, I want deploys to be two commands (`aws s3 sync` + `aws cloudfront create-invalidation`), so that I can ship a fix in under 5 minutes with no CI dependency.

---

## 6. Core Architecture & Patterns

### High-level architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              MAIN APP (parent)                          │
│                   xyz.mirabeltech.com  [subdomain TBD]                  │
│                                                                         │
│  1. Opens popup: window.open("https://editor.mirabeltech.com/?adId=…")  │
│  5. Receives POST at callbackUrl with { adId, pdfKey, thumbnailKey, … } │
│  *. Issues pre-signed S3 PUT URLs at /sign-upload endpoint              │
└──────────────────────────────┬──────────────────────────────────────────┘
                               │ window.open
                               ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                   editor.mirabeltech.com (popup)                        │
│                     React + Vite + Tailwind                             │
│                                                                         │
│  2. GET ad.json  ──────────────────►  editor-assets.mirabeltech.com     │
│                                       (CloudFront → S3 READ)            │
│                                                                         │
│  3. On drop/save:                                                       │
│     POST /sign-upload ──► main app ──► [{ key, uploadUrl }]             │
│     PUT direct to S3  ──────────────────►  s3://classifieds-ad-assets/  │
│                                                                         │
│  4. POST callbackUrl ──► main app  { metadata + stats }                 │
└─────────────────────────────────────────────────────────────────────────┘

            S3 us-east-1                         CloudFront + OAC
            ┌──────────────────────┐             ┌──────────────────┐
            │ classifieds-ad-editor│  ◄─── OAC ──│ editor.*         │
            └──────────────────────┘             └──────────────────┘
            ┌──────────────────────┐             ┌──────────────────┐
            │ classifieds-ad-assets│  ◄─── OAC ──│ editor-assets.*  │(reads)
            │  public/ads/{adId}/  │             └──────────────────┘
            │    ad.json           │
            │    pdf.pdf           │  ◄── direct PUT (pre-signed URLs) ──
            │    thumbnail.jpg     │
            │    images/*.jpg      │
            └──────────────────────┘
```

### Directory structure (target)

```
classifieds-02/
├── .github/                          # (optional) future CI workflows
├── infra/
│   ├── cors-assets.json              # bucket CORS config
│   ├── policy-editor.json            # OAC-scoped bucket policy (app)
│   ├── policy-assets.json            # OAC-scoped bucket policy (assets)
│   ├── dist-editor.json              # CloudFront distribution config
│   ├── dist-assets.json              # CloudFront distribution config
│   └── setup.sh                      # end-to-end provisioning script
├── public/
│   └── favicon.ico
├── src/
│   ├── main.tsx
│   ├── App.tsx                       # top-level layout, shortcut handlers
│   ├── components/
│   │   ├── AdCanvas.tsx              # fixed-width canvas with rulers
│   │   ├── HorizontalRuler.tsx       # per-tick <div> rulers (lifted from ref)
│   │   ├── VerticalRuler.tsx
│   │   ├── BlockList.tsx
│   │   ├── TextBlockView.tsx
│   │   ├── ImageBlockView.tsx
│   │   ├── FloatingToolbar.tsx       # Notion-style per-block formatting
│   │   ├── StatsRail.tsx             # right-side collapsible rail
│   │   ├── StatsChips.tsx            # collapsed header chips
│   │   ├── WarningsBadge.tsx         # floating badge when rail collapsed
│   │   ├── ViewModeToggle.tsx        # segmented Edit/Clean
│   │   └── DropZone.tsx              # drop/paste handler
│   ├── editor/
│   │   ├── blocks.ts                 # Block types + factory fns
│   │   ├── useAdDoc.ts               # top-level state hook
│   │   ├── useUndoableState.ts       # structural undo/redo
│   │   ├── useAdStats.ts             # pure stats hook
│   │   ├── useImageDrop.ts           # drop + paste + picker
│   │   └── useShortcuts.ts           # Ctrl+1/2/./S
│   ├── lib/
│   │   ├── querystring.ts            # parse + validate launch params
│   │   ├── fonts.ts                  # curated font list + @font-face loader
│   │   ├── pdf.ts                    # html2canvas + jsPDF pipeline
│   │   ├── thumbnail.ts              # 300px JPEG from same canvas
│   │   ├── s3.ts                     # pre-signed URL PUT helpers
│   │   ├── api.ts                    # sign-upload + callbackUrl POST
│   │   └── units.ts                  # inches/px conversion
│   ├── types/
│   │   ├── ad.ts                     # Block, AdDoc, AdStats, AdWarning
│   │   └── launch.ts                 # LaunchParams
│   └── styles/
│       └── index.css                 # Tailwind entry
├── tailwind.config.js
├── vite.config.ts
├── tsconfig.json
├── package.json
├── README.md
└── PRD.md                            # this document
```

### Key design patterns

**Block-JSON as contract.** Every surface (editor preview, raster capture, stats, persisted ad.json, callback payload) reads from the same `Block[]` array. No adapters, no secondary representations. Schema versioned (`{ version: 1, widthInches, blocks: [] }`) so future changes can be migrated safely.

**Pure hooks for derived state.** `useAdStats`, `useAdDoc`, and `useUndoableState` are pure functions of their inputs. Stats are never cached in state. No manual invalidation logic.

**Clean-mode is a CSS class, not a route.** Toggling adds `.clean` to the root element; Tailwind variants (`.clean ~ [data-chrome]`, etc.) hide chrome. Zero render duplication.

**Per-tick div rulers.** Proven pattern from the reference code. Pixel-accurate at any zoom, no SVG/canvas required, trivially stylable.

**Writes bypass CloudFront.** CloudFront fronts reads only. S3 PUTs are direct via pre-signed URLs — avoids CF origin-request policy fiddling for SigV4 headers, standard AWS pattern.

**OAC, not OAI.** Origin Access Control (modern, SigV4-based) is used for both distributions. OAI is deprecated.

---

## 7. Tools/Features

### Feature: AdCanvas + Rulers
**Purpose:** Render the ad's content area at fixed inch width with live ruler feedback.
- Width driven by `widthInches` prop (from querystring, 96 px/in).
- Horizontal ruler (top) shows ticks every 0.5" with full-inch labels.
- Vertical ruler (left) shows the same, growing with content.
- Canvas itself is just a `<div style={{ width: widthPx }}>` containing the `BlockList`.

### Feature: TextBlock
**Purpose:** Whole-block text content with typographic controls.
- Autoresizing `<textarea>` (plain text; no contenteditable in v1).
- Per-block formatting state: `{ font, sizePt, bold, italic, underline, align, highlight }`.
- Floating toolbar appears on focus/selection.
- Default new block: 11pt, left-aligned, default font.

### Feature: ImageBlock
**Purpose:** Raster images stretched to ad width.
- `<img style={{ width: '100%', height: 'auto' }}>` with cached `naturalWidth`/`naturalHeight` for DPI math.
- S3 key stored in block for persistence round-trip.
- Delete button + reorder handle on hover.

### Feature: Drop/Paste/Picker Image Input
**Purpose:** Fast, multi-modal image insertion.
- OS drag-and-drop anywhere on the canvas (DropZone component).
- `Ctrl+V` paste from clipboard.
- "Add image…" button → file picker.
- Each file → request pre-signed URL → PUT to S3 → append `ImageBlock` with final S3 URL.
- Upload progress indicator per image.

### Feature: Floating Formatting Toolbar
**Purpose:** Minimal-chrome formatting controls appearing next to the selected block.
- Appears on block focus; dismisses on blur.
- Controls: B / I / U toggles · font select · size select · alignment toggle · highlight color.
- Positioned adjacent (right side of block at ≥1200px, above at narrow widths).
- Hidden in Clean mode.

### Feature: Block Reorder (Drag + Buttons)
**Purpose:** Two redundant paths to reorder blocks.
- Drag: `dnd-kit` with a visible handle. Vertical-only, within the list.
- Buttons: `↑` / `↓` on each block; disabled at list ends.

### Feature: Structural Undo/Redo
**Purpose:** Coarse-grained history for reversible mistakes.
- Snapshot triggers: add/delete block, reorder, image swap, format change.
- **Does not** snapshot every keystroke inside a textarea (browser provides native textarea undo).
- `Ctrl+Z` / `Ctrl+Shift+Z`.
- History cap: 50 snapshots.

### Feature: Live Stats Rail
**Purpose:** Continuous content feedback.
- 7 stats displayed: `wordCount`, `characterCount`, `blockCount` (total/text/image), `heightInches`, `columnInches`.
- 2 warning types: `low-dpi-image` (<150 DPI), `empty-block`.
- Auto-open at ≥1100px, collapsed otherwise. `Ctrl+.` toggle. State persisted in localStorage.
- Warnings section below stats, each with a "Jump to block" link.

### Feature: Block Warning Badges
**Purpose:** Surface per-block issues at the block.
- Small red dot on the top-right corner of any block with an active warning.
- Hover/click → tooltip with the warning text.
- Disappears in Clean mode (the warning is still in the rail).

### Feature: Edit/Clean View Modes
**Purpose:** Toggle between editing chrome and clean preview on the same canvas.
- Segmented control in header: `Edit | Clean`.
- Keyboard: `Ctrl+1` / `Ctrl+2`.
- Clean mode adds `.clean` class to root; CSS hides rulers, toolbars, drag handles, warning dots, and the "Add block" affordance.
- View mode **not** persisted across reloads (defaults to Edit each time).

### Feature: Raster PDF + Thumbnail Generation
**Purpose:** Produce the print-ready output.
- On save: await `document.fonts.ready` → run `html2canvas(previewEl, { scale: 3, backgroundColor: '#fff', useCORS: true })` → dataURL.
- Encode as JPEG 0.92 if any `ImageBlock` is present, otherwise PNG.
- Wrap in `new jsPDF({ unit: 'in', format: [widthInches, heightInches] })` → `addImage(...)` → blob.
- Thumbnail: scale canvas down to 300px wide → JPEG 0.85.
- Both uploaded via pre-signed URLs.

### Feature: Save Flow Orchestration
**Purpose:** Coordinate the multi-step save.
1. Compute stats from current block state.
2. Generate PDF blob + thumbnail blob.
3. Serialize `ad.json` (block array + widthInches + metadata).
4. Request signed URLs for all three files from `/sign-upload`.
5. PUT each file in parallel.
6. POST metadata + stats snapshot to `callbackUrl`.
7. Show "Saved" toast; popup stays open (user may continue editing).

---

## 8. Technology Stack

### Frontend
| Component | Choice | Version | Justification |
|---|---|---|---|
| Framework | React | ^18.3 | Industry standard, reference code already React, maximum AI-assistance coverage |
| Language | TypeScript | ^5.4 | Type safety for Block union types and launch params |
| Build tool | Vite | ^5.2 | Fast dev loop, simple static bundle for S3 |
| Styling | Tailwind CSS | ^3.4 | User preference; fits Clean-mode CSS-class toggle |
| PDF (raster) | jsPDF | ^2.5 | Industry-standard, proven in reference code |
| DOM → canvas | html2canvas | ^1.4 | Pairs with jsPDF, reference-proven |
| Drag-drop | @dnd-kit/core + @dnd-kit/sortable | ^6.1 | Accessible, touch-safe, vertical list use case |
| S3 uploads | Native `fetch` PUT | n/a | Pre-signed URL is an HTTPS endpoint; no SDK needed |

### Infrastructure
| Resource | Choice | Notes |
|---|---|---|
| Static hosting | S3 + CloudFront + OAC | us-east-1; TLSv1.2_2021 minimum |
| Domain + DNS | Route 53 (mirabeltech.com HZ `Z057432312ZPK7D2Z0Z85`) | Existing zone; non-destructive UPSERTs only |
| TLS | ACM wildcard `*.mirabeltech.com` | Must be us-east-1 for CloudFront |
| Asset storage | S3 (`classifieds-ad-assets`) | Separate bucket from app |
| Asset CDN | CloudFront + OAC (reads only) | Writes bypass and go direct |

### Third-party
- **Google Fonts** (self-hosted preferred if time allows; CDN-loaded in v1 for speed): curated set TBD, suggested default: Inter, Merriweather, Playfair Display, Oswald, Roboto Slab, Lora.
- **Web-safe fonts** (no network): Arial, Helvetica, Georgia, Times New Roman, Courier New, Verdana.

### Dev dependencies
- ESLint + `@typescript-eslint/*` with a minimal rule set
- Prettier (defaults)
- No unit test framework in v1 — manual smoke test during deploy

### Optional (punt unless needed)
- Vitest (if test coverage becomes a concern)
- Sentry (if production error visibility becomes a concern)

---

## 9. Security & Configuration

### Authentication & authorization

The editor is **unauthenticated as a standalone app**. Trust flows entirely from the main app's short-lived Bearer **token** passed in the querystring. The token:
- Is signed by the main app (JWT or opaque).
- Is scoped to a specific `adId`.
- Expires in ≤30 minutes.
- Is sent as `Authorization: Bearer <token>` on all API calls back to the main app (`/sign-upload`, `callbackUrl`).

**The editor never has AWS credentials.** All S3 writes are performed via pre-signed PUT URLs issued by the main app after token validation. Pre-signed URLs expire in 15 minutes each.

### Configuration

| Location | Contents |
|---|---|
| `public/config.json` (fetched at load) | `{ assetsOrigin: "https://editor-assets.mirabeltech.com", defaultWidthInches: 3.25 }` — keeps build env-agnostic |
| Querystring (per session) | `width`, `adId`, `adName`, `sectionId`, `sectionName`, `positionId`, `positionName`, `sortOrder`, `token`, `callbackUrl` |
| `localStorage` (per browser) | `statsRailOpen: boolean` |

### Security in scope

- ✅ Short-lived Bearer token passing
- ✅ Pre-signed URL scoping (object key, content-type, content-length, 15-min expiry)
- ✅ CORS enumerated origins on assets bucket (no wildcards)
- ✅ HTTPS only on both CloudFront distributions (TLSv1.2_2021+)
- ✅ Block-Public-Access enforced on both S3 buckets; CloudFront-only read
- ✅ OAC with SigV4 (no deprecated OAI)
- ✅ SPA fallback rewrites 403 + 404 to `/index.html` (403 because OAC doesn't grant `ListBucket`)

### Security out of scope

- ❌ User authentication in the editor
- ❌ MFA
- ❌ Rate limiting (CloudFront default limits assumed sufficient)
- ❌ WAF rules
- ❌ Audit logging beyond CloudTrail defaults

### Deployment considerations

- **ACM region:** must be us-east-1 (CloudFront requirement).
- **CloudFront deploy time:** 5–20 minutes; allow buffer in release plans.
- **Invalidations:** only `/index.html` and `/` on each deploy (the first 1000/mo are free; `/*` is wasteful).
- **Cache headers:** hashed bundle assets `public,max-age=31536000,immutable`; `index.html` `no-cache,no-store,must-revalidate`.
- **Wildcard cert limits:** `*.mirabeltech.com` covers **single-level** subdomains only. Do not use `x.y.mirabeltech.com` pattern.

---

## 10. API Specification

### 10.1 Parent → Editor (launch)

**Mechanism:** `window.open("https://editor.mirabeltech.com/?" + querystring, "_blank", "popup,width=1200,height=850")`

**Querystring parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `width` | number (in) | No | Default 3.25 if missing/invalid |
| `adId` | string | Yes | Stable ID, used for S3 path and signed-upload scope |
| `adName` | string | No | Displayed in header |
| `sectionId` | string | No | Echoed back in save payload |
| `sectionName` | string | No | Displayed in header subtitle |
| `positionId` | string | No | Echoed back |
| `positionName` | string | No | Displayed in header subtitle |
| `sortOrder` | number | No | Echoed back |
| `token` | string | Yes | Short-lived Bearer, ≤30min expiry |
| `callbackUrl` | string (URL) | Yes | HTTPS endpoint on main app for final metadata POST |

### 10.2 Editor → Main App: `/sign-upload` (NEW — to be built on main app)

**Purpose:** Validate caller's Bearer token + `adId` ownership; return pre-signed S3 PUT URLs.

**Request**
```http
POST <main app>/api/classifieds/sign-upload
Authorization: Bearer <token>
Content-Type: application/json

{
  "adId": "42",
  "files": [
    { "key": "public/ads/42/pdf.pdf",      "contentType": "application/pdf", "contentLength": 1258004 },
    { "key": "public/ads/42/thumbnail.jpg","contentType": "image/jpeg",     "contentLength": 28119 },
    { "key": "public/ads/42/ad.json",     "contentType": "application/json","contentLength": 4812 },
    { "key": "public/ads/42/images/img-abc123.jpg", "contentType": "image/jpeg", "contentLength": 485112 }
  ]
}
```

**Response (200 OK)**
```json
{
  "expiresInSeconds": 900,
  "urls": [
    { "key": "public/ads/42/pdf.pdf",       "uploadUrl": "https://classifieds-ad-assets.s3.amazonaws.com/public/ads/42/pdf.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&…" },
    { "key": "public/ads/42/thumbnail.jpg", "uploadUrl": "…" },
    { "key": "public/ads/42/ad.json",      "uploadUrl": "…" },
    { "key": "public/ads/42/images/img-abc123.jpg", "uploadUrl": "…" }
  ]
}
```

**Main app responsibilities**
- Validate Bearer token signature and expiry.
- Validate caller owns `adId` (via main app's own authorization rules).
- Validate each `key` begins with `public/ads/{adId}/` (reject keys outside the ad's folder).
- Validate `contentType` matches expected set (`application/pdf`, `image/jpeg`, `image/png`, `application/json`).
- Optionally clamp `contentLength` to a reasonable max (e.g., 25 MB per file).
- Use AWS SDK `getSignedUrl(PutObjectCommand, { expiresIn: 900 })` against the `classifieds-ad-assets` bucket.
- Return the signed URLs.

**Errors**
- `401 Unauthorized` — token invalid or expired
- `403 Forbidden` — caller does not own this adId, OR key outside folder scope
- `413 Payload Too Large` — file exceeds max size
- `415 Unsupported Media Type` — contentType not in allowed list

**CORS on this endpoint**
- `Access-Control-Allow-Origin: https://editor.mirabeltech.com` (and `http://localhost:5173` for dev)
- `Access-Control-Allow-Methods: POST, OPTIONS`
- `Access-Control-Allow-Headers: Authorization, Content-Type`
- `Access-Control-Max-Age: 600`

### 10.3 Editor → S3: Direct PUT (via pre-signed URL)

```http
PUT <uploadUrl from /sign-upload>
Content-Type: <matches signature>
[Content-Length: <matches signature>]

<binary body>
```

Pre-signed URL carries SigV4 auth in query string. S3 returns `200 OK` with `ETag` header on success.

### 10.4 Editor → Main App: `callbackUrl` (existing-or-new endpoint)

**Purpose:** Notify main app that save is complete; hand over metadata and stats.

**Request**
```http
POST <callbackUrl from querystring>
Authorization: Bearer <token>
Content-Type: application/json

{
  "adId": "42",
  "adName": "ESTATE SALE - 123 Oak St.",
  "widthInches": 3.25,
  "sectionId": "s-classified",
  "sectionName": "Classifieds",
  "positionId": "p-frontpage",
  "positionName": "Front Page",
  "sortOrder": 5,
  "pdfKey": "public/ads/42/pdf.pdf",
  "thumbnailKey": "public/ads/42/thumbnail.jpg",
  "blocks": [
    { "id": "b1", "type": "text", "text": "ESTATE SALE", "font": "Oswald", "sizePt": 18, "bold": true, "italic": false, "underline": false, "align": "center", "highlight": null },
    { "id": "b2", "type": "text", "text": "Sat 9-3, 123 Oak St.\nTools, furniture, art.", "font": "Merriweather", "sizePt": 11, "bold": false, "italic": false, "underline": false, "align": "left", "highlight": null },
    { "id": "b3", "type": "image", "src": "https://editor-assets.mirabeltech.com/public/ads/42/images/img-abc123.jpg", "s3Key": "public/ads/42/images/img-abc123.jpg", "naturalWidth": 1200, "naturalHeight": 800 }
  ],
  "stats": {
    "wordCount": 12,
    "characterCount": 58,
    "blockCount": 3,
    "textBlockCount": 2,
    "imageBlockCount": 1,
    "heightInches": 4.0,
    "columnInches": 13.0
  }
}
```

**Response (any 2xx)** — editor treats as success. Body is ignored in v1.

**Errors** — editor shows a toast with the status code; does not retry automatically. User can retry save.

### 10.5 Editor → S3 (via CloudFront): Load existing ad

```http
GET https://editor-assets.mirabeltech.com/public/ads/42/ad.json
```

- Served via CloudFront with OAC → S3.
- Public (no auth). Security model: `adId` values are treated as unguessable.
- `404` response → editor renders blank canvas.

---

## 11. Success Criteria

### MVP success definition

The editor is "done" when a user can be opened into `editor.mirabeltech.com` with a valid token, create a 3.25"-wide ad with at least one text block and one image block, save it, and have the main app receive the callback POST with a valid PDF key pointing to a downloadable PDF — **all within 10 minutes of first use by someone who has never seen the tool before**.

### Functional requirements

- ✅ Opening with a valid querystring restores prior state from S3 (when present) or shows a blank canvas (when not)
- ✅ Typing in a text block updates the preview and stats in real time (<100 ms)
- ✅ Dropping an image uploads it and renders it at 100% width within 5 seconds on a 10 Mbps connection
- ✅ Stats rail reflects current state continuously and accurately
- ✅ Low-DPI image warning appears within 200 ms of the image loading
- ✅ `Ctrl+S` produces a PDF and thumbnail, uploads them, and POSTs to `callbackUrl` within 10 seconds on a typical ad
- ✅ PDF is a single page sized exactly to `[widthInches × heightInches]`
- ✅ PDF renders the ad at ≥200 DPI (scale:3 = 288 DPI)
- ✅ Editor is usable at 900×700 popup minimum
- ✅ Clean mode hides all chrome with a single keystroke

### Quality indicators

- PDF file size ≤500 KB for a typical 3-block ad with one photo (JPEG 0.92)
- Stats computation <1 ms at 20 blocks (pure-JS, no debounce needed)
- Deployed asset bundle ≤500 KB gzipped
- No unhandled promise rejections in the browser console on normal flows
- Zero CORS errors in the browser console in any supported flow

### User experience goals

- No spinner on keystroke or block reorder (updates feel instant)
- Save button always clickable (warnings never block it)
- View-switch keystroke (`Ctrl+2`) swaps in <50 ms (just a CSS class)
- Popup doesn't auto-close on save — user decides when to leave

---

## 12. Implementation Phases

**Estimated total:** 2–3 weeks of focused, AI-assisted development by a single engineer.

### Phase 1: Editor Core (~4–5 days)

**Goal:** Locally-running editor that can build an ad end-to-end, minus cloud.

**Deliverables**
- ✅ Vite + React + TS + Tailwind scaffold, git initialized, pushed to `i83992473/classifieds-02`
- ✅ Block data model (`Block`, `AdDoc`, `AdStats`, `AdWarning` types)
- ✅ Querystring parser with default-width fallback
- ✅ `AdCanvas` with horizontal + vertical inch rulers
- ✅ `TextBlockView` with autoresizing textarea
- ✅ `ImageBlockView` (100% width, aspect-ratio)
- ✅ `FloatingToolbar` (B/I/U, font, size, alignment, highlight)
- ✅ Drop/paste/picker with local `URL.createObjectURL` (no S3 yet)
- ✅ Reorder: drag handle (`@dnd-kit`) + up/down buttons
- ✅ Structural undo/redo (`useUndoableState`)

**Validation**
- Open `localhost:5173?width=3.25&adId=test`, build a three-block ad, undo, redo, reorder, format-change. All works. No cloud dependency.

### Phase 2: Stats + UI Polish (~2 days)

**Goal:** Feature-complete UI with live stats and Clean mode.

**Deliverables**
- ✅ `useAdStats` hook returning 7 stats + 2 warning types
- ✅ `StatsRail` with responsive collapse (→ chips + badge below 1100px)
- ✅ Block warning badges (red dot + tooltip)
- ✅ Edit/Clean toggle (segmented control + `Ctrl+1/2`)
- ✅ `Ctrl+.` stats toggle, `Ctrl+S` save stub
- ✅ localStorage persistence for rail state
- ✅ Header shows `adName` + `sectionName` · `positionName`

**Validation**
- Resize window across 1100px breakpoint; rail collapses and re-expands correctly. Drop a low-res image; red dot + rail warning appear. Press `Ctrl+2`; chrome vanishes. Stats update while typing without lag.

### Phase 3: PDF + Cloud Wiring (~3–4 days)

**Goal:** Save flow works end-to-end against real (or stubbed) S3 + main-app endpoints.

**Deliverables**
- ✅ `lib/pdf.ts` — html2canvas + jsPDF pipeline with fonts.ready await
- ✅ `lib/thumbnail.ts` — 300px JPEG from same canvas
- ✅ `lib/s3.ts` — signed-URL PUT helper
- ✅ `lib/api.ts` — `/sign-upload` + `callbackUrl` POSTs with Bearer token
- ✅ Save orchestration in `App.tsx` (Ctrl+S → compute → request URLs → PUT → POST)
- ✅ Load-from-S3 on mount: `GET ad.json`, restore state
- ✅ Image drop now uploads to S3 via signed URL (replacing local blob URL)
- ✅ Stub main-app endpoints (local mock) so end-to-end works against a fake

**Validation**
- Stub main app responds to `/sign-upload` with valid URLs pointing at a dev S3 bucket; save produces a PDF, thumbnail, and ad.json in the bucket; callbackUrl POST returns 200; browser shows "Saved." Reload the page with same adId → state restores from ad.json.

### Phase 4: AWS Infra + Deploy (~2 days)

**Goal:** Live at `editor.mirabeltech.com`.

**Deliverables**
- ✅ ACM wildcard cert for `*.mirabeltech.com` issued and validated
- ✅ Buckets `classifieds-ad-editor` and `classifieds-ad-assets` created, BPA-locked, bucket policies scoped to each OAC
- ✅ CloudFront distributions for both; editor has SPA fallback, assets has CORS-passthrough
- ✅ Route 53 A + AAAA alias records for both subdomains
- ✅ CORS config on assets bucket (editor origin + localhost:5173)
- ✅ Deploy script: `aws s3 sync dist/ s3://classifieds-ad-editor --delete --cache-control "public,max-age=31536000,immutable" --exclude index.html` + `aws s3 cp dist/index.html s3://classifieds-ad-editor/index.html --cache-control "no-cache,no-store,must-revalidate"` + `aws cloudfront create-invalidation --distribution-id <EDITOR_DIST> --paths /index.html /`
- ✅ First end-to-end smoke test against real main-app `/sign-upload` endpoint (once main-app team delivers it)

**Validation**
- Navigate `https://editor.mirabeltech.com/?width=3.25&adId=smoketest-1&token=<real>&callbackUrl=<real>`; full save flow produces files in S3 and a successful callback POST; reloading the URL restores the ad.

---

## 13. Future Considerations (v2+)

### Rendering upgrade: server-side PDF via `pdfkit`
When selectable/searchable text or server-side re-rendering is required, introduce a tiny `pdfkit`-based Node service (deployable as a 5 MB Lambda zip or a $5/mo Fargate task). The block-JSON contract is already the canonical input — no editor change needed. Vector text, subset-embedded fonts, images at native DPI, no Chromium.

### UX enhancements
- **Proof mode** — third view that wraps Clean canvas in a simulated newspaper-page background.
- **Mobile-catalog preview** — show the ad as it will appear in the main app's catalog layout.
- **Per-block stats** — click a block to see its word count, character count, estimated cost contribution.
- **Estimated price display** — if the main app shares per-word / per-col-inch rates via querystring.
- **Inline (per-character) text formatting** — switch text-block storage to ProseMirror-style runs; worth it only when users actually ask.

### Content & integration
- **Additional block types** — divider, shape, QR code, structured contact card.
- **Template library** — save/reuse ad layouts.
- **Version history** — view and restore prior saves (requires storing historical `ad.json` snapshots).
- **Multi-page ads** — for full-page display ads rather than classifieds.

### Operations
- **CI/CD pipeline** — GitHub Actions on push to main builds + deploys.
- **Sentry** for frontend error telemetry.
- **CloudWatch dashboards** for CloudFront + S3 usage.
- **Automated smoke tests** (Playwright) against the deployed URL.

---

## 14. Risks & Mitigations

**R-1: Main-app `/sign-upload` endpoint isn't ready by deploy time**
- *Impact:* Editor can't save. Entire save flow blocked.
- *Mitigation:* Build the editor against a local stub from day one. Ship the endpoint spec (§10.2) to the main-app team now, before Phase 3 starts. As a last-resort backup, stand up a tiny Lambda in the classifieds-admin account that validates the Bearer token by calling back to the main app and then issues signed URLs itself — same contract, different hoster.

**R-2: Raster PDF fidelity complaint from a user ("text is blurry / not selectable")**
- *Impact:* Feature request to upgrade renderer.
- *Mitigation:* Set expectations clearly: v1 is raster, text-is-image, sized for newspaper spec. Document the upgrade path to `pdfkit` (v2) so the response to the first complaint is "yes, here's when we'll address that." Scale:3 produces 288 DPI, above the 200 DPI newspaper floor — should not look "blurry" on newsprint.

**R-3: CORS misconfiguration blocks production uploads**
- *Impact:* Save fails with inscrutable browser errors.
- *Mitigation:* Enumerate every header in `AllowedHeaders` (no wildcards — they fail silently with SigV4). Test CORS with a local build pointed at the production assets bucket before cutting over the main deploy. Add `http://localhost:5173` to CORS so dev smoke-tests against prod assets are possible.

**R-4: Wildcard cert misunderstanding leads to broken subdomain**
- *Impact:* Can't deploy; cert attach fails.
- *Mitigation:* Document explicitly in infra/setup.sh that `*.mirabeltech.com` covers single-level subdomains only. If a future need arises for `x.y.mirabeltech.com`, add a SAN or separate cert — do **not** attempt to extend the wildcard.

**R-5: Google Fonts CDN hiccup causes raster PDF to use a fallback font**
- *Impact:* Saved PDF looks wrong but editor preview looked right.
- *Mitigation:* Self-host the curated Google Fonts set in the app bundle and reference via local `@font-face`. Always `await document.fonts.ready` before invoking `html2canvas`. Verify in a smoke test that the PDF's visible font matches the chosen font.

---

## 15. Appendix

### Related documents
- `ReferenceCode/src/App.tsx` — working prior implementation; lift patterns from lines 181–200 (block types), 2157–2276 (rulers), 1412–1452 (raster PDF flow). Do **not** lift wholesale — it includes a full admin dashboard we don't need.
- Memory: `C:\Users\Ian\.claude\projects\C--Projects-AICodeAssistants-Classified-02\memory\project_classified_editor_v1.md` — architecture decisions and rationale.

### Key external dependencies
- React — https://react.dev
- Vite — https://vitejs.dev
- Tailwind CSS — https://tailwindcss.com
- jsPDF — https://github.com/parallax/jsPDF
- html2canvas — https://html2canvas.hertzen.com
- dnd-kit — https://dndkit.com
- AWS CloudFront OAC — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html
- ACM region requirement — https://docs.aws.amazon.com/acm/latest/userguide/acm-regions.html

### AWS resources (planned)
| Resource | Name/ID |
|---|---|
| Account | 539247468693 |
| CLI profile | `classifieds-admin` |
| Region | us-east-1 |
| Route 53 HZ | `Z057432312ZPK7D2Z0Z85` (mirabeltech.com) |
| App bucket | `classifieds-ad-editor` |
| Assets bucket | `classifieds-ad-assets` |
| Editor domain | `editor.mirabeltech.com` |
| Assets CDN | `editor-assets.mirabeltech.com` |
| Cert | `*.mirabeltech.com` (us-east-1, to be created) |

### Repository
- GitHub: https://github.com/i83992473/classifieds-02.git
- Branch model: `main` (trunk-based, direct commits in v1)

---

## Assumptions made due to missing information

- **Main-app subdomain** (origin for CORS allowed-origins list) — not yet provided. CORS will be stubbed with `https://*.mirabeltech.com` pattern during dev and tightened to the exact origin before production deploy.
- **Exact curated font list** — proposed set: Inter, Merriweather, Playfair Display, Oswald, Roboto Slab, Lora (Google) + Arial, Helvetica, Georgia, Times New Roman, Courier New, Verdana (web-safe). Final set is configurable in `src/lib/fonts.ts` and can be revised at any time.
- **Font license & self-hosting** — assumed Google Fonts will be self-hosted in the app bundle (bundled TTFs, `@font-face` from `/fonts/*.ttf`) for reliability and offline work. Revisit if the bundle size concerns outweigh this.
- **Max image file size** — assumed 25 MB per image, enforced in `/sign-upload` contentLength clamp. Revisit if larger is required.
- **Token format** — assumed opaque or JWT; editor does not parse, only forwards as Bearer. Main-app team's choice.
- **Timeline** — 2–3 weeks assumes a single focused engineer with AI assistance, no UX design cycles required (Notion-idiomatic layout selected up front).
- **Error telemetry** — assumed none in v1 beyond browser console. Add Sentry in v2 if production debugging becomes a need.

---

## Next steps

1. **Review this PRD.** Flag any sections that don't match your intent before we commit to build.
2. **Deliver the API spec (§10.2) to the main-app team** so `/sign-upload` can be built in parallel with Phase 1–2 editor work.
3. **Confirm or override the curated font list** (see Assumptions). Fonts are baked into the bundle, so changes are cheap but a rebuild.
4. **Lock the main-app subdomain** (CORS allowed-origin) — needed before Phase 4 deploy, not before.
5. **Kick off Phase 1** — scaffold + block model + canvas. Estimated 4–5 days to a usable local editor.
