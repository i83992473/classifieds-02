# Classified-02 Ad Editor — Product Requirements Document

**Status:** Draft · **Version:** 1.0 · **Date:** 2026-04-21
**Owner:** iriley@magazinemanager.com
**Repository:** https://github.com/i83992473/classifieds-02.git

---

## 1. Executive Summary

The **Classified-02 Ad Editor** is a standalone, single-purpose web application that enables users to compose small print-style classified and business-directory advertisements in a browser. It is opened as a popup from a parent "main app" with identifying parameters in the URL, presents a fixed-width-in-inches, variable-height canvas with a block-based content model (text blocks and image blocks), and on save produces a raster PDF + thumbnail image which are written to AWS S3. It then POSTs the resulting metadata — including live-computed content statistics — back to the main app via a callback URL for attachment to the ad record as a production note.

The product deliberately trades vector-PDF fidelity for operational simplicity: in v1 the PDF is generated client-side via `html2canvas` + `jsPDF`, eliminating the need for any backend infrastructure beyond two S3 buckets and two CloudFront distributions. At `scale: 3` the raster output clears the 200 DPI newspaper print specification comfortably, and the entire architecture can be built, deployed, and operated by a single developer at under $5/month of AWS spend.

**MVP goal:** Enable a user opened into `editor.mirabeltech.com?tenantId=…&adId=…&token=…&callbackUrl=…` to produce, save, and round-trip a print-quality classified ad with text, formatting, and images — all without authentication beyond the short-lived Bearer token issued by the main app. The editor is **multi-tenant**: the same bundle serves all tenants, and isolation is enforced at the `/sign-upload` API on the main app (see §16).

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
│     /public/tenants/{tenantId}/ads/{adId}/ad.json                       │
│                                       (CloudFront → S3 READ)            │
│                                                                         │
│  3. On drop/save:                                                       │
│     POST /sign-upload ──► main app ──► [{ key, uploadUrl }]             │
│     PUT direct to S3  ──────────────────►  s3://classifieds-ad-assets/  │
│                                                                         │
│  4. POST callbackUrl ──► main app  { metadata + stats }                 │
└─────────────────────────────────────────────────────────────────────────┘

            S3 us-east-1                                  CloudFront + OAC
            ┌─────────────────────────────────────┐       ┌──────────────────┐
            │ classifieds-ad-editor               │  OAC ─│ editor.*         │
            └─────────────────────────────────────┘       └──────────────────┘
            ┌─────────────────────────────────────┐       ┌──────────────────┐
            │ classifieds-ad-assets               │  OAC ─│ editor-assets.*  │ (reads)
            │  public/tenants/{tenantId}/         │       └──────────────────┘
            │    ads/{adId}/                      │
            │      ad.json                        │
            │      pdf.pdf                        │  ◄── direct PUT (pre-signed URLs) ──
            │      thumbnail.jpg                  │
            │      images/*.jpg                   │
            └─────────────────────────────────────┘
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

**Per-tick div rulers.** Each tick is a single absolutely-positioned `<div>`. Pixel-accurate at any zoom, no SVG/canvas required, trivially stylable. (Deliberately chosen over CSS-gradient approaches, which drift on non-integer DPI.)

**Writes bypass CloudFront.** CloudFront fronts reads only. S3 PUTs are direct via pre-signed URLs — avoids CF origin-request policy fiddling for SigV4 headers, standard AWS pattern.

**OAC, not OAI.** Origin Access Control (modern, SigV4-based) is used for both distributions. OAI is deprecated.

---

## 7. Tools/Features

### Feature: AdCanvas + Rulers
**Purpose:** Render the ad's content area at fixed inch width with live ruler feedback.

- Width driven by `widthInches` prop (from querystring, 96 px/in canonical).
- Canvas itself is a `<div style={{ width: widthPx }}>` containing the `BlockList`.
- Horizontal ruler along the top; vertical ruler along the left; small neutral square in the top-left corner where the two rulers meet.
- Rulers and corner are hidden in Clean mode via the `.clean` root-class toggle.

**Ruler implementation requirements**

The rulers are built from individual absolutely-positioned `<div>` tick elements — one element per tick. Do **not** use SVG, `<canvas>`, CSS repeating-gradients, or CSS-background-image approaches (tick spacing drifts on fractional devicePixelRatio and breaks on zoom).

*Geometry (canonical — 96 px/in)*
- Ruler track thickness: **20 px** on both rulers.
- Horizontal ruler width: `widthPx = widthInches × 96`, starting flush with the left edge of the canvas content (i.e., positioned `left: 20px` so tick `0"` aligns with the canvas origin, accounting for the vertical ruler's thickness).
- Vertical ruler height: matches the current canvas content height dynamically (grows as blocks are added; uses `ResizeObserver` on the canvas element, not a fixed value).
- Tick `0` on each ruler aligns exactly with the content-area origin (top-left corner of the first block's bounding box).

*Tick cadence and sizes*
- **Major tick** — every `1.0"`; length `12 px` perpendicular to the ruler; stroke `1 px`; color `#334155` (slate-700).
- **Half tick** — every `0.5"` (skipping positions already occupied by a major tick); length `8 px`; stroke `1 px`; color `#64748b` (slate-500).
- **Quarter tick** — every `0.25"` (skipping half/major positions); length `5 px`; stroke `1 px`; color `#94a3b8` (slate-400).
- **Eighth tick** — every `0.125"` (skipping all above); length `3 px`; stroke `1 px`; color `#cbd5e1` (slate-300).

*Labels*
- Numeric label on every major tick, showing the inch number as an integer (`0`, `1`, `2`, …). No units suffix — the ruler context makes it clear.
- Font: `10px`, system-ui or the editor's sans default; color `#334155`; weight 500.
- Horizontal ruler: label sits **above** the tick, horizontally centered on the tick (or left-edge-aligned for the `0` label so it doesn't overhang negatively).
- Vertical ruler: label is rotated `-90deg` and sits to the **left** of the tick, vertically centered.
- The `0` label is always rendered; at very narrow widths (<1") it may be the only label.

*Backgrounds and borders*
- Ruler track background: `#f8fafc` (slate-50).
- Inner edge (the side touching the canvas) has a `1px solid #e2e8f0` (slate-200) separator.
- Top-left corner square (`20 × 20 px`): same background as the tracks, same inner border.

*Precision & sub-pixel handling*
- Tick positions computed as `Math.round(inchOffset × 96)` in JS before applying to `style.left` / `style.top` — never relying on fractional CSS calc to produce pixel-accurate ticks.
- Every tick is a real DOM element; the tick list is memoized on `widthInches` (horizontal) and `heightPx` (vertical) so React doesn't re-render ticks unnecessarily.
- The canvas content must **never** shift by a fractional pixel as height changes (the integer-rounding above prevents the common "rulers shimmer as the canvas grows" bug).

*Behavior*
- When a block is added, removed, resized (textarea auto-grow, image swap), or reordered, the vertical ruler extends/contracts to match the canvas's new `offsetHeight` on the next animation frame.
- Rulers are purely visual — they are not interactive in v1 (no click-to-add-guide, no drag, no zoom). Ignore pointer events.
- Rulers are **excluded from the raster capture** — `html2canvas` targets the content `<div>`, not the wrapper that contains the rulers. Confirm this by inspecting any generated PDF: no tick marks should ever appear in the saved output.

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
| Framework | React | ^18.3 | Industry standard, maximum AI-assistance coverage |
| Language | TypeScript | ^5.4 | Type safety for Block union types and launch params |
| Build tool | Vite | ^5.2 | Fast dev loop, simple static bundle for S3 |
| Styling | Tailwind CSS | ^3.4 | User preference; fits Clean-mode CSS-class toggle |
| PDF (raster) | jsPDF | ^2.5 | Industry-standard client-side PDF |
| DOM → canvas | html2canvas | ^1.4 | Pairs with jsPDF; renders the live DOM at `scale: 3` |
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
- **Vitest** + **@testing-library/react** + **@testing-library/jest-dom** + **jsdom** — unit/component tests for pure functions and hooks (see §11.5)
- **Firecrawl** (https://www.firecrawl.dev/app) — agent-driven browser automation for end-to-end smoke tests against localhost and the deployed URL (see §11.5). Configured via the `firecrawl-interact` / `agent-browser` skills; API key lives in `.env.local` (never committed).

### Optional (punt unless needed)
- **Playwright** — only if Firecrawl-driven E2E becomes insufficient (e.g., we need deterministic CI replay of the same flow)
- **Sentry** — if production error visibility becomes a concern

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
| Querystring (per session) | `tenantId`, `tenantName`, `width`, `adId`, `adName`, `sectionId`, `sectionName`, `positionId`, `positionName`, `sortOrder`, `token`, `callbackUrl` |
| `localStorage` (per browser) | `statsRailOpen: boolean` |
| Env vars (build/test/deploy-time) | See §9.5 |

### 9.5 Environment variables & secrets

Env vars are **not a runtime configuration channel for the deployed client** (the browser bundle reads from `/public/config.json` at load — see Configuration table above). They are used only by: the dev server, the test runner, the Firecrawl agent, and the deploy scripts. This section exists so coding agents and new contributors don't get tripped up on missing values during implementation or testing.

**Three tiers**

| Tier | File / location | Committed? | Consumed by |
|---|---|---|---|
| Contract / example | `.env.example` (repo root) | ✅ yes | humans and agents discovering what vars exist |
| Developer local | `.env.local` (repo root) | ❌ gitignored | `vite`, `vitest`, deploy scripts, Firecrawl agent |
| Production | AWS Parameter Store / CloudFront Functions env / AWS console | ❌ never in git | deployed stack (post-Phase-4 infra) |

**`.env.example` is the contract.** Every env var that any code path reads must be listed in `.env.example`, with:
- A block comment describing what it is and which tier consumes it (build, dev, test, deploy).
- A placeholder value — the real value if it's non-secret (e.g., `AWS_PROFILE=classifieds-admin`), empty string if it's a secret.
- A link to where a real value can be obtained (e.g., Firecrawl dashboard, AWS console path).

**Rule (hard requirement for coding agents):** adding a `process.env.X` or `import.meta.env.VITE_X` read anywhere in the codebase **requires** adding the same key to `.env.example` in the same commit. Missing entries cause silent `undefined` failures during setup and waste hours of debugging time.

**Naming convention**
- `VITE_*` prefix — any variable that must be readable from the browser bundle. Vite inlines these at build time, so treat them as **public** — never put a secret behind a `VITE_` name.
- **No prefix** — Node-only / shell / test-runner / deploy-script vars. These never reach the browser bundle.

**Secrets policy**
- Secrets live **only** in `.env.local` (developer machines) or in AWS (production). Never committed, never baked into the client bundle, never logged.
- Current secret inventory: `FIRECRAWL_API_KEY`. The editor itself carries no AWS credentials (see §9 Authentication).
- AWS credentials are read from the CLI profile `classifieds-admin` in `~/.aws/credentials` — never from env vars in this project.

**Typed access (implementation guidance)**
- Add a thin `src/lib/env.ts` module that wraps `import.meta.env.VITE_*` reads, provides a typed accessor per var, and returns a sensible default. Component / hook code imports from `src/lib/env.ts`, not from `import.meta.env` directly. This keeps the set of env-var reads auditable from one file.
- For Node-side reads (deploy scripts, test helpers), do the same in `infra/lib/env.ts` or similar. Single read site per process boundary.

**Workflow — adding a new env var**
1. Add the key, comment, and placeholder to `.env.example`.
2. Add a typed accessor in `src/lib/env.ts` (or the Node equivalent).
3. Reference the accessor from the code that needs the value.
4. Commit `.env.example`, the accessor, and the consuming code together.
5. Update your own `.env.local` with a real value locally.
6. If the var is needed in production (post-Phase-4), document where it lives in AWS (Parameter Store path, CloudFront env, etc.) in `infra/setup.sh` as a comment.

**Initial inventory (baseline `.env.example`, expected at project root from Phase 1)**

| Variable | Tier | Secret? | Purpose |
|---|---|---|---|
| `FIRECRAWL_API_KEY` | test | ✅ yes | Firecrawl agent auth for E2E flows (§11.5). Obtain at https://www.firecrawl.dev/app |
| `VITE_ASSETS_ORIGIN` | build (dev override) | no | Optional override for the assets CDN origin during dev; production reads this from `/public/config.json` instead |
| `VITE_DEV_MAIN_APP_ORIGIN` | dev/test | no | URL of the local stub serving `/sign-upload` and acting as `callbackUrl` target during Phase 3 |
| `EDITOR_DIST_ID` | deploy | no (but sensitive) | CloudFront distribution ID for the editor app; used by the invalidation step in Phase 4 |
| `ASSETS_DIST_ID` | deploy | no (but sensitive) | CloudFront distribution ID for the assets bucket |
| `AWS_PROFILE` | deploy | no | Fixed value `classifieds-admin`; exported for convenience so deploy scripts don't need `--profile` on every line |

Agents scaffolding or modifying the project must treat this table and `.env.example` as the source of truth. If a required var is missing locally, fail fast with a clear error that names the key and points at `.env.example` — do not silently fall back to a stub value that can leak into a deployed build.

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
| `tenantId` | string (slug) | Yes | Tenant identifier — human-readable slug (`acme`, `bigpub`). Used to build the S3 key prefix and as a fallback header label. **Never trusted for authorization** — main app validates it against the JWT claim. Missing/unknown → editor renders a hard error page (no edit surface). See §16. |
| `tenantName` | string | Yes | Tenant's display name shown in the editor header (e.g., "Acme Publishing"). Display-only; never used for routing or storage. |
| `width` | number (in) | No | Default 3.25 if missing/invalid |
| `adId` | string | Yes | Stable ID, used for S3 path and signed-upload scope. Unique **within a tenant**, not globally — `(tenantId, adId)` is the composite key. Treated as unguessable. |
| `adName` | string | No | Displayed in header |
| `sectionId` | string | No | Echoed back in save payload |
| `sectionName` | string | No | Displayed in header subtitle |
| `positionId` | string | No | Echoed back |
| `positionName` | string | No | Displayed in header subtitle |
| `sortOrder` | number | No | Echoed back |
| `token` | string | Yes | Short-lived Bearer, ≤30min expiry. **Must carry a verified `tenantId` claim** in v1 multi-tenant build (see §16). |
| `callbackUrl` | string (URL) | Yes | HTTPS endpoint on main app for final metadata POST. Host **must** appear on the tenant's registered allowlist; main app rejects mismatches at `/sign-upload` time (see §16). |

### 10.2 Editor → Main App: `/sign-upload` (NEW — to be built on main app)

**Purpose:** Validate caller's Bearer token + `adId` ownership; return pre-signed S3 PUT URLs.

**Request**

Note: in the multi-tenant model (see §16), the **client never specifies the S3 key prefix**. The editor sends only logical `files[]` descriptors (filename + content-type + length); the main app constructs each full key server-side from the verified `tenantId` claim in the Bearer token. This is the load-bearing rule that prevents cross-tenant write leaks.

```http
POST <main app>/api/classifieds/sign-upload
Authorization: Bearer <token>     ← carries verified tenantId claim
Content-Type: application/json

{
  "adId": "42",
  "callbackUrl": "https://main.acmeclassifieds.com/api/ads/42/callback",
  "files": [
    { "name": "pdf.pdf",                   "contentType": "application/pdf",  "contentLength": 1258004 },
    { "name": "thumbnail.jpg",             "contentType": "image/jpeg",       "contentLength": 28119 },
    { "name": "ad.json",                   "contentType": "application/json", "contentLength": 4812 },
    { "name": "images/img-abc123.jpg",     "contentType": "image/jpeg",       "contentLength": 485112 }
  ]
}
```

**Response (200 OK)**
```json
{
  "expiresInSeconds": 900,
  "urls": [
    { "key": "public/tenants/acme/ads/42/pdf.pdf",                   "uploadUrl": "https://classifieds-ad-assets.s3.amazonaws.com/public/tenants/acme/ads/42/pdf.pdf?X-Amz-Algorithm=AWS4-HMAC-SHA256&…" },
    { "key": "public/tenants/acme/ads/42/thumbnail.jpg",             "uploadUrl": "…" },
    { "key": "public/tenants/acme/ads/42/ad.json",                   "uploadUrl": "…" },
    { "key": "public/tenants/acme/ads/42/images/img-abc123.jpg",     "uploadUrl": "…" }
  ]
}
```

**Main app responsibilities**
- Validate Bearer token signature and expiry.
- Extract `tenantId` from the verified token claim (do NOT trust any client-supplied tenantId).
- Validate caller owns `(tenantId, adId)` via main app's own authorization rules.
- Construct each full S3 key as `public/tenants/{tenantId}/ads/{adId}/{file.name}` from the verified claim — the client supplies `name` only.
- Reject any `file.name` containing `..`, leading `/`, or path-traversal segments.
- Validate `callbackUrl.host` is on the tenant's registered callback-host allowlist; reject otherwise (prevents tenant A from launching the editor with tenant B's exfil endpoint).
- Validate `contentType` matches expected set (`application/pdf`, `image/jpeg`, `image/png`, `application/json`).
- Optionally clamp `contentLength` to a reasonable max (e.g., 25 MB per file).
- Use AWS SDK `getSignedUrl(PutObjectCommand, { expiresIn: 900 })` against the `classifieds-ad-assets` bucket.
- Return the signed URLs (each paired with the server-built `key` so the client can verify).

**Errors**
- `401 Unauthorized` — token invalid or expired
- `403 Forbidden` — caller does not own this `(tenantId, adId)`, OR `callbackUrl` host not on tenant's allowlist, OR `file.name` rejected for path-traversal
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
  "tenantId": "acme",
  "adId": "42",
  "adName": "ESTATE SALE - 123 Oak St.",
  "widthInches": 3.25,
  "sectionId": "s-classified",
  "sectionName": "Classifieds",
  "positionId": "p-frontpage",
  "positionName": "Front Page",
  "sortOrder": 5,
  "pdfKey": "public/tenants/acme/ads/42/pdf.pdf",
  "thumbnailKey": "public/tenants/acme/ads/42/thumbnail.jpg",
  "blocks": [
    { "id": "b1", "type": "text", "text": "ESTATE SALE", "font": "Oswald", "sizePt": 18, "bold": true, "italic": false, "underline": false, "align": "center", "highlight": null },
    { "id": "b2", "type": "text", "text": "Sat 9-3, 123 Oak St.\nTools, furniture, art.", "font": "Merriweather", "sizePt": 11, "bold": false, "italic": false, "underline": false, "align": "left", "highlight": null },
    { "id": "b3", "type": "image", "src": "https://editor-assets.mirabeltech.com/public/tenants/acme/ads/42/images/img-abc123.jpg", "s3Key": "public/tenants/acme/ads/42/images/img-abc123.jpg", "naturalWidth": 1200, "naturalHeight": 800 }
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
GET https://editor-assets.mirabeltech.com/public/tenants/acme/ads/42/ad.json
```

- Served via CloudFront with OAC → S3.
- Public (no auth). Security model: the **composite path** `tenants/{tenantId}/ads/{adId}/...` is treated as unguessable. `tenantId` itself is a human-readable slug (guessable); the unguessable `adId` carries the path-secrecy. Anyone in possession of the full URL can read the object — same trust model as v1 single-tenant, just extended to include the tenant segment.
- `404` response → editor renders blank canvas.
- An `adId` that exists for tenant A returns **404 for tenant B** because the path differs; this is the read-side tenant boundary.

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

### 11.5 Testing strategy

Three complementary layers. Each layer is expected to run green before the corresponding phase is marked done in §12.

**Layer 1 — Unit tests (Vitest)**

Targets pure, deterministic code — no DOM, no network. Fast (<1 s whole suite in v1). Run with `npm test`.

- `src/lib/units.ts` — inches ↔ px ↔ pt conversions. Boundary cases: 0, fractional (0.125"), negative, very large.
- `src/lib/querystring.ts` — param parsing, type coercion, default-width fallback, malformed inputs (non-numeric `width`, missing `adId`, invalid `callbackUrl` URL).
- `src/lib/fonts.ts` — curated-list lookup, fallback when a block's `font` isn't in the list.
- `src/lib/pdf.ts` — page-size math (`[widthInches, heightInches]`), JPEG-vs-PNG branching based on presence of `ImageBlock`.
- `src/editor/useAdStats.ts` — called as a pure function with fixture `Block[]` arrays; asserts all 7 stats and both warning types (low-DPI image, empty text block).
- `src/editor/useUndoableState.ts` — snapshot triggers fire on add/delete/reorder/image-swap/format-change only; history capped at 50; redo cleared on new snapshot after undo.
- Block-model factories (`blocks.ts`) — new block defaults, id uniqueness.

**Layer 2 — Component tests (React Testing Library + jsdom)**

Targets stateful components where rendered output matters. Not a substitute for a real browser — `html2canvas` and image decoding are stubbed.

- `AdCanvas` — renders correct tick count at several widths (3.25", 5", 10"); rulers hidden when `.clean` class applied at root.
- `TextBlockView` — typing updates state; formatting toolbar appears on focus; toolbar actions toggle the right `{bold, italic, …}` fields.
- `StatsRail` — collapses below 1100px, chips render with correct values; warnings badge appears when a warning exists.
- `BlockList` — up/down buttons disabled at list ends; drag-reorder callback fires with correct indices.
- `useShortcuts` — Ctrl+1/2/./S dispatch the right actions; doesn't fire when focused in a textarea (Ctrl+S is the one exception).

**Layer 3 — End-to-end smoke tests (Firecrawl + manual)**

Two modes:

1. **Agent-driven (Firecrawl `/interact`)** — a Claude subagent using the `firecrawl-interact` / `agent-browser` skill navigates a running instance, performs the flows below, and asserts outcomes (DOM state, S3 object existence, callback POST receipt). Runs against `localhost:5173` during development and against `https://editor.mirabeltech.com` after deploy. This replaces what would otherwise be Playwright in v1.

2. **Manual checklist** — the same flows, run by hand before any deploy, to catch anything the agent misses (visual regressions, font rendering, popup sizing on a real monitor).

**E2E flows (both modes cover these):**

- **F-1 Cold open, blank ad** — launch with fresh `adId`; blank canvas renders; rulers + stats rail present; title bar shows `adName`.
- **F-2 Cold open, restore from ad.json** — launch with an `adId` that has an existing `ad.json` in S3; all blocks, widths, and formatting restore.
- **F-3 Text-only ad round-trip** — add 2 text blocks, format one bold + 14 pt, save; verify `ad.json`, `pdf.pdf`, `thumbnail.jpg` land in S3; verify callback POST received with matching stats.
- **F-4 Ad with image** — drop a real JPEG into the canvas; wait for upload; save; verify PDF contains the image and thumbnail is non-empty.
- **F-5 Low-DPI warning** — drop a 200 px image into a 3.25" ad; red dot appears on the block; warning appears in rail; save still succeeds (warnings are advisory).
- **F-6 Clean-mode toggle** — Ctrl+2; rulers, toolbars, drag handles, warning dots all disappear; content remains pixel-identical. Ctrl+1 restores.
- **F-7 Undo/redo** — add, format, reorder, delete blocks; Ctrl+Z reverses structural ops; Ctrl+Shift+Z redoes; textarea keystrokes use native textarea undo (not the structural history).
- **F-8 Responsive rail** — resize popup across 1100 px; rail collapses to chips + warnings badge and re-expands correctly.
- **F-9 Reload restores** — complete F-3, close popup, reopen at same URL; ad restores exactly.

**Conventions**
- Test files co-located as `*.test.ts` / `*.test.tsx` next to the source.
- Fixtures for `Block[]` arrays in `src/test/fixtures.ts`.
- Network calls stubbed via `vi.fn()` at the `fetch` boundary; no MSW unless Layer-2 tests start to need it.
- Agent-driven E2E expected to be written *after* each phase's features land, then re-run on every subsequent phase to catch regressions. Store the prompts used as `docs/e2e-prompts/F-*.md` so the same flow can be re-run identically.
- Coverage is not enforced in v1, but Vitest's `--coverage` flag should produce >70% line coverage for `src/lib/` and `src/editor/` at the end of Phase 2.

---

## 12. Implementation Phases

**Estimated total:** 2–3 weeks of focused, AI-assisted development by a single engineer.

### Phase 1: Editor Core (~4–5 days)

**Goal:** Locally-running editor that can build an ad end-to-end, minus cloud.

**Deliverables**
- ✅ Vite + React + TS + Tailwind scaffold, git initialized, pushed to `i83992473/classifieds-02`
- ✅ Block data model (`Block`, `AdDoc`, `AdStats`, `AdWarning` types)
- ✅ Querystring parser with default-width fallback. Required-param validation: missing `tenantId` / `adId` / `token` / `callbackUrl` → render a hard error page rather than mounting the edit surface (see §16)
- ✅ `AdCanvas` with horizontal + vertical inch rulers
- ✅ `TextBlockView` with autoresizing textarea
- ✅ `ImageBlockView` (100% width, aspect-ratio)
- ✅ `FloatingToolbar` (B/I/U, font, size, alignment, highlight)
- ✅ Drop/paste/picker with local `URL.createObjectURL` (no S3 yet)
- ✅ Reorder: drag handle (`@dnd-kit`) + up/down buttons
- ✅ Structural undo/redo (`useUndoableState`)
- ✅ Vitest + RTL configured; Layer-1 tests written for `units`, `querystring`, `blocks`, `useUndoableState`; Layer-2 tests for `AdCanvas` tick counts and `TextBlockView` formatting toggles

**Validation**
- Manual: open `localhost:5173?width=3.25&adId=test`, build a three-block ad, undo, redo, reorder, format-change. All works. No cloud dependency.
- Automated: `npm test` passes; Firecrawl-agent runs flows F-1 and F-7 against `localhost:5173`.

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
- ✅ Layer-1 tests for `useAdStats` covering all 7 stats and both warning types; Layer-2 tests for `StatsRail` responsive collapse and warning badge

**Validation**
- Manual: resize window across 1100 px breakpoint; rail collapses and re-expands correctly. Drop a low-res image; red dot + rail warning appear. Press `Ctrl+2`; chrome vanishes. Stats update while typing without lag.
- Automated: `npm test` ≥70% line coverage on `src/lib/` and `src/editor/`; Firecrawl-agent runs flows F-5, F-6, F-8 against `localhost:5173`.

### Phase 3: PDF + Cloud Wiring (~3–4 days)

**Goal:** Save flow works end-to-end against real (or stubbed) S3 + main-app endpoints.

**Deliverables**
- ✅ `lib/pdf.ts` — html2canvas + jsPDF pipeline with fonts.ready await
- ✅ `lib/thumbnail.ts` — 300px JPEG from same canvas
- ✅ `lib/s3.ts` — signed-URL PUT helper
- ✅ `lib/api.ts` — `/sign-upload` + `callbackUrl` POSTs with Bearer token. Request body sends `files[].name` (server builds full key from JWT-claim `tenantId` — client never specifies prefix; see §16)
- ✅ Save orchestration in `App.tsx` (Ctrl+S → compute → request URLs → PUT → POST). Callback payload includes `tenantId` echo
- ✅ Load-from-S3 on mount: `GET https://editor-assets.mirabeltech.com/public/tenants/{tenantId}/ads/{adId}/ad.json`, restore state
- ✅ Image drop now uploads to S3 via signed URL (replacing local blob URL); persisted block `src` URLs include the tenant segment
- ✅ Stub main-app endpoints (local mock) so end-to-end works against a fake
- ✅ Layer-1 tests for `lib/pdf.ts` page-size math and `lib/s3.ts` URL-signing request shape; fetch stubbed for `lib/api.ts` happy-path + error cases

**Validation**
- Manual: stub main app responds to `/sign-upload` with valid URLs pointing at a dev S3 bucket; save produces a PDF, thumbnail, and ad.json in the bucket; callbackUrl POST returns 200; browser shows "Saved." Reload the page with same adId → state restores from ad.json.
- Automated: Firecrawl-agent runs flows F-2, F-3, F-4, F-9 against `localhost:5173` pointed at the dev bucket; agent verifies S3 object existence and callback receipt via the stub's inspection endpoint.

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
- ✅ Full F-1 through F-9 E2E checklist run by the Firecrawl agent against `https://editor.mirabeltech.com` and by hand as a final manual sign-off

**Validation**
- Manual: navigate `https://editor.mirabeltech.com/?width=3.25&adId=smoketest-1&token=<real>&callbackUrl=<real>`; full save flow produces files in S3 and a successful callback POST; reloading the URL restores the ad.
- Automated: Firecrawl-agent completes all nine F-* flows green against the deployed URL.

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
- Firecrawl — https://www.firecrawl.dev/app (agent-driven browser automation used for E2E smoke tests; see §11.5)
- Vitest — https://vitest.dev
- React Testing Library — https://testing-library.com/docs/react-testing-library/intro/

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

## 16. Multi-tenancy

The editor is multi-tenant from v1. Multiple distinct client organizations (publishers, magazines, directories — collectively "tenants") use the same deployed bundle, but their ads, images, users, and configuration are completely isolated from each other. This section is the source of truth for how that isolation is achieved; every other section that references tenants links back here.

### 16.1 Model summary

| Concern | Decision |
|---|---|
| Domain model | **Shared origin** — all tenants use `editor.mirabeltech.com`. No per-tenant subdomains in v1 (would require new SAN per tenant; wildcard cert is single-level only). |
| Storage isolation | **Single bucket, prefix-per-tenant**. All keys live under `public/tenants/{tenantId}/ads/{adId}/...` in `classifieds-ad-assets`. |
| Identity authority | **JWT claim** — the Bearer token issued by the main app carries a verified `tenantId` claim. The main app trusts only the claim; querystring `tenantId` is for display/path-building only. |
| Editor's view of identity | The editor treats the token as **opaque** (does not parse the JWT). It echoes `tenantId` from the querystring into log/header UI; the main app re-validates against the claim on every API call. |
| Branding / whitelabel | **Out of scope for v1.** Neutral chrome for all tenants; only `tenantName` is shown in the header. v2 introduces per-tenant branding alongside a tenant-config delivery channel. |
| Per-tenant runtime config | **None in v1** beyond what's already in the launch URL. `/public/config.json` stays global. |
| `adId` namespace | **Per-tenant unique** — `(tenantId, adId)` is the composite key. Tenant A's ad #42 and tenant B's ad #42 are distinct objects at distinct paths. |
| Read access control | **CloudFront public reads**, same as single-tenant v1 — extended to include the tenant segment in the path. The unguessable `adId` carries the path-secrecy; `tenantId` is a guessable slug. |

### 16.2 `tenantId` format and constraints

- **Format:** human-readable slug, lowercase alphanumeric + hyphens, e.g., `acme`, `bigpub`, `north-shore-news`. Regex: `^[a-z0-9](?:[a-z0-9-]{0,30}[a-z0-9])?$` (1–32 chars).
- **Uniqueness:** enforced by the main app (its tenant table is the source of truth). The editor and S3 take this for granted.
- **Stability:** tenants do not rename in v1. If a tenant ever renames, the migration is `aws s3 cp --recursive` from old prefix to new and a parallel main-app DB update — out of scope here.
- **Guessability:** **guessable by design.** The slug is treated as public information (similar to a customer subdomain in any SaaS). The cryptographic boundary is the JWT claim, not the slug.

### 16.3 S3 key shape (canonical)

```
public/tenants/{tenantId}/ads/{adId}/ad.json
public/tenants/{tenantId}/ads/{adId}/pdf.pdf
public/tenants/{tenantId}/ads/{adId}/thumbnail.jpg
public/tenants/{tenantId}/ads/{adId}/images/{imageId}.jpg
```

- The `public/` prefix is preserved from v1 single-tenant so that future `private/` siblings remain a clean option.
- The tenant segment immediately follows `public/` so prefix-listing for `aws s3 rm --recursive s3://classifieds-ad-assets/public/tenants/{tenantId}/` is the full GDPR / "delete tenant X" answer.
- No code in the editor or main app should hard-code an example `tenantId` outside of test fixtures and docs.

### 16.4 The load-bearing rule: server-built keys

> **The client never specifies an S3 key prefix. The main app builds every full key server-side from the verified `tenantId` claim in the Bearer token.**

Every cross-tenant data leak in real-world multi-tenant SaaS systems traces back to violating this rule. Concretely, in the `/sign-upload` request (§10.2):
- Editor sends only `{ name, contentType, contentLength }` per file. `name` is a logical filename like `pdf.pdf` or `images/img-abc123.jpg` — **never a full key, never including a tenant segment**.
- Main app extracts `tenantId` from the verified JWT claim, validates `(tenantId, adId)` ownership, then constructs `public/tenants/{tenantId}/ads/{adId}/{name}` and signs that.
- Main app rejects any `name` containing `..`, leading `/`, or path-traversal segments (defense in depth).

Buggy "validate the prefix the client sent" logic is the canonical failure mode and must not exist in v1.

### 16.5 `callbackUrl` host validation

The launch querystring carries `callbackUrl`, which the editor POSTs to on save (§10.4). Without validation, a tenant-A token combined with a tenant-B `callbackUrl` would let an attacker exfiltrate ad metadata + stats to a tenant they don't own.

- Each tenant maintains a registered set of allowed callback hosts in the main app (e.g., `main.acmeclassifieds.com`, `staging.acmeclassifieds.com`).
- At `/sign-upload` time, the main app validates `URL(callbackUrl).host` is on the allowlist for the JWT-claim `tenantId`. If not, return `403`.
- The editor itself does not need to validate `callbackUrl` — main app rejection at `/sign-upload` is the chokepoint.

### 16.6 Editor responsibilities (multi-tenant)

The editor's contribution to tenant isolation is small and clearly bounded — the main app does the security-critical work.

1. **Validate the launch URL on mount.** Missing `tenantId`, `tenantName`, `adId`, `token`, or `callbackUrl` → render a hard error page; do not mount the edit surface. Display: "This editor was opened with missing or invalid launch parameters. Please return to the main app and try again."
2. **Build read URLs with the tenant segment.** `GET .../public/tenants/{tenantId}/ads/{adId}/ad.json` on load. The querystring `tenantId` is used here; it's safe because the URL is read-only and a wrong slug just yields 404.
3. **Send only `name` (not `key`) to `/sign-upload`.** Never construct full S3 keys client-side — that's the main app's job.
4. **Display `tenantName` in the header.** Display-only; never used for routing or storage.
5. **Forward the Bearer token unchanged on every API call.** The editor does not parse the JWT.

### 16.7 Main-app team contract additions

Items the main-app team must build/change on top of the §10.2 spec to make multi-tenancy work. Surface this list in the kickoff for that work stream:

- **JWT must carry verified `tenantId` claim.** Claim name: `tenantId` (camelCase, matching the querystring param). Issued during the main app's own auth flow; cannot be supplied by the client.
- **`/sign-upload` reads `tenantId` from the claim, never from the request.** Implementation pattern: `tenantId = jwt.verify(token).tenantId`. Any client-supplied tenant value is ignored.
- **`/sign-upload` constructs full keys server-side** (§16.4).
- **`/sign-upload` rejects path-traversal in `file.name`** (`..`, leading `/`, etc.).
- **`/sign-upload` validates `callbackUrl.host` against per-tenant allowlist** (§16.5).
- **Echo `tenantId` in the callback payload** (§10.4) for routing and debug.
- **Per-tenant callback-host registry** in the main app's data model — the source of truth for §16.5.
- **(Recommended, not strictly required)** IAM permission boundary on the signing role scoped to the tenant prefix at request time, so a bug in the prefix builder cannot sign URLs into another tenant's prefix. ABAC with session tags from JWT claims is the AWS-native pattern; v1 may ship without it if `/sign-upload` is well-tested.

### 16.8 Operational notes

- **Tenant onboarding** (single-bucket prefix model): zero infra work. A new tenant is "onboarded" the moment the main app starts issuing tokens with a new `tenantId` claim. No bucket, CloudFront, DNS, or cert changes are needed.
- **Tenant offboarding / GDPR delete:** `aws s3 rm --recursive s3://classifieds-ad-assets/public/tenants/{tenantId}/ --profile classifieds-admin`, plus the corresponding rows in the main-app DB (out of scope for the editor).
- **Per-tenant cost attribution:** not natively available in this model (S3 bills by bucket, not prefix). Use S3 Storage Lens with prefix grouping, or S3 Inventory + Athena on the standard log bucket. Defer until tenants ask for chargeback. Tag all AWS resources `app=classifieds-02` from day one so a future re-architecture has a clear scope.
- **CloudWatch / observability:** any future log lines, metrics, or traces that include a key path will naturally include `tenantId` because it's in the path. No additional dimensioning needed.

### 16.9 Out of scope for v1 (revisit in v2)

- Per-tenant branding (logo, primary color, custom font set, tenant CSS).
- Per-tenant subdomain (`acme.editor.mirabeltech.com`) — would require SAN per tenant or a non-wildcard cert.
- Per-tenant config endpoint (the channel that delivers branding when v2 lands).
- Bucket-per-tenant or account-per-tenant isolation. Migration path from prefix-per-tenant is `aws s3 cp --recursive` per tenant + a config flip; cheap if needed but not pre-built.
- Cryptographic per-tenant read access (signed CloudFront cookies or `/sign-download` endpoint). The path-secrecy model is sufficient for v1.
- Per-tenant cost-attribution tags. Single bucket = single line item; revisit when tenants ask.

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
