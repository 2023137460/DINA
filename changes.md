# Proposed Updates to the DINA Brand Identity Skill

> **Objective:** Harmonize `dina-brand-identity` with the `design-taste-frontend` skill (the anti-slop frontend doctrine). Ensure DINA web and digital deliverables pass automated design audits (`inspect.mjs`, `lint.mjs`) with zero failures while strictly maintaining DINA's calm, warm domestic kitchen identity.

---

## Executive Summary: Where the Skills Collided

The original DINA brand identity was distilled directly from an editorial 16:9 presentation slide deck (Slidesgo *"Packaging & Case Designer Portfolio"*). While hairline grids, 11 pt uppercase captions, numbered circles, and 75/25 split columns work well on 16:9 presentation slides and printed brochures, directly translating those rules to the web caused **12 failures** on the `design-taste-frontend` audit:

1. **Hairlines & Outlined Boxes**: Banned as template scaffolding on the web.
2. **Tiny Uppercase Labels (11 px)**: Failed the accessibility floor (minimum 13 px, no unreadable micro-labels).
3. **Eyebrows / Kickers**: Banned as generic marketing filler.
4. **`01 / 02 / 03` Numbered Indexing**: Flagged as decorative assistant ornament.
5. **Icon-Topped Feature Cards**: Flagged as category template defaults.
6. **Clay Accent Contrast**: Clay (`#C0775B`) on Paper (`#F1EFE5`) or Sand (`#DAD8CB`) text has only a 2.4:1 contrast ratio, failing WCAG AA (4.5:1).
7. **Italic Word in Every Heading**: Triggered `[mixed-font-headline]` warnings across the FeatureManager/page tree.

Below are the exact changes to apply to `dina-brand-identity` to resolve these conflicts.

---

## 1. Core Principle Updates

### A. Separation of Mediums (Web vs. Presentation/Print)
- **Presentations & Documents (PowerPoint, PDF, Word)**: Keep the physical paper framing: 0.75 pt hairlines, table borders, and slide margins.
- **Web & Mobile Apps (HTML, CSS)**: Structure must come from **background tone steps** (Paper `#F1EFE5` vs Sand `#DAD8CB` vs Ink `#191919`) and **generous whitespace** (120–200 px desktop section gaps, 64–96 px on mobile), **never** from 1 px hairlines or outlined cards.

### B. Color Usage & Accessibility (Contrast Enforcement)
- **Clay (`#C0775B`) Rules**:
  - Clay is **strictly an accent background or detail color** (e.g. primary CTA button, handle LED halo ring, icon detail accents).
  - **Never use Clay for text on Paper or Sand.** (Fails WCAG AA with only a 2.4:1 contrast ratio).
  - On Clay buttons (`.btn-clay`), set text to Ink (`#191919`, font-weight 700), which yields **5.0:1 contrast**, exceeding the 4.5:1 WCAG AA threshold.
  - When running `inspect.mjs` on DINA projects, pass `--allow palette-claude` because DINA's Paper/Clay palette is an authentic domestic brand requirement, not an assistant default.

### C. Typography & Hierarchy
- **Strict 5-Step Scale**: Eliminate ambiguous font sizes. Use:
  1. `Display`: `clamp(38px, 5.5vw, 68px)`
  2. `Heading 2`: `clamp(26px, 3.4vw, 40px)`
  3. `Heading 3 / Subhead`: `clamp(19px, 2.2vw, 24px)`
  4. `Body`: `17px` on mobile, `18px` on desktop (`line-height: 1.55`)
  5. `Small`: `14px` (minimum floor; **nothing below 13 px anywhere**)
- **No Eyebrow Labels**: Do not place small kicker labels or category chips directly above headings. Fold the information into the headline or supporting lead sentence.
- **Headline Length**: Every headline must fit in **two lines or fewer at all viewport widths** (median 3–5 words, under 32 characters on phone width).
- **The "One Italic Word" Signature**:
  - Reserved **exclusively for the primary `<h1>` title** on the first screen (e.g. `DINNER, <em>SCHEDULED</em>.`).
  - All subsequent `<h2>` through `<h6>` headings must be set in a single uniform weight and style to prevent visual clutter and avoid `[mixed-font-headline]` warnings.

### D. Layout Structure (Mobile-First Split Stage)
- Replace the rigid 75/25 column desktop split with the **`split-stage`** direction:
  - **Desktop**: 50/50 split with a sticky `100svh` visual stage on one side that dynamically transitions as the reader scrolls the reading column, with periodic full-width breakouts (e.g. dual-zone cabinet cutaway and footer).
  - **Mobile**: A top `55–60svh` visual stage band that displays the product immediately on screen 1, followed by single-column vertical flow with minimum 48 px tap targets.

### E. Eliminating Cosmetic Numbers & Icon Grids
- **No Decorative Numbering**: Replace arbitrary `01`, `02`, `03` numbers with meaningful time and sequence semantics ("Sunday Load", "15:00 Check-In", "17:30 Drop", "19:00 Dinnertime").
- **No Icon Cards**: Do not arrange icons at the top of 3 or 4 identical boxes. Use animated DINA SVG icons inline with text, as large standalone figures, or inside interactive widgets (such as the "When's dinner?" calculator).

---

## 2. Exact Changes per File in the DINA Skill

### File 1: `C:\Users\anton\.gemini\config\skills\dina-brand-identity\SKILL.md`

#### Section: "Shape and structure" (Lines 40–45)
**Current:**
```markdown
- Square corners everywhere. Circles only for numbers (`01`, `02`) and avatars, drawn as thin outlines.
- Structure comes from hairlines (0.75 pt / 1 px, Stone), not boxes, shadows or fills. Content sits in rows separated by full-width hairlines.
- Slide frame: sand navigation strip along the top starting at 25% of the width, a 75% / 25% split with a full-height photo column on the right, left margin 7.8%.
- Flat only: no gradients, no shadows, no glows, no rounded cards, no 3D, no stock-icon packs.
```

**Replace with:**
```markdown
- Square corners everywhere.
- Structure comes from:
  - **In Slides and Print**: Hairlines (0.75 pt, Stone) and margin alignments.
  - **On the Web**: Tone steps (Paper `#F1EFE5` vs Sand `#DAD8CB` vs Ink `#191919`) and generous whitespace (120–200 px desktop section gaps, 64–96 px on mobile). **Zero thin hairlines or 1 px outlined boxes on web pages.**
- **Web Layout**: Split-stage composition (50% sticky imagery stage on desktop, 55–60svh visual banner on mobile). Avoid narrow 25% side photo strips that hide products below the fold on phones.
- Flat only: no gradients, no shadows on resting elements, no glows, no rounded cards, no 3D, no stock-icon packs.
- **Zero Decorative Index Numbering**: No `01 / 02 / 03` circles on the web. Order is conveyed through natural chronological markers ("Sunday", "15:00", "19:00") or standard document structure.
```

#### Section: "Type" (Lines 34–39)
**Current:**
```markdown
- Headings: Playfair Display, UPPERCASE, regular weight, tight leading. One italic word per heading is the signature (see the deck cover: "PORTFOLIO" in italics).
- Body: Archivo, 12 pt on slides, 16 px on the web. Bold only for names and dates.
- Captions and navigation: Playfair Display 11 pt/px, uppercase, wide tracking.
- Fallbacks: Georgia, Arial. Both fonts are free on Google Fonts.
```

**Replace with:**
```markdown
- Headings: Playfair Display, UPPERCASE, regular weight, tight leading.
  - **One italic word is reserved exclusively for the main `<h1>` on the first screen** (e.g. "DINNER, <em>SCHEDULED</em>.").
  - All other headings (`<h2>`–`<h6>`) are set in a single clean font style without mid-line italics.
  - Every heading must fit in **two lines or fewer at all viewport widths**.
- Body: Archivo, 12 pt on slides, 17–18 px on the web (`line-height: 1.55`). Bold only for names and dates.
- Captions and auxiliary notes: 14 px minimum on the web (never under 13 px). Sentence case at readable size; eliminate 11 px uppercase tracked labels on digital products.
- **No Eyebrow Labels**: Do not place small kicker labels or pill chips above headings.
```

#### Section: "Checklist before delivering" (Lines 59–66)
**Add the following checks:**
```markdown
- Web outputs pass `design-taste-frontend` audits with 0 FAIL (using `--allow palette-claude`).
- All text meets WCAG AA contrast (Clay is never used for small text on Paper or Sand).
- All web form inputs are at least 16 px to prevent iOS Safari auto-zoom.
- Mobile tap targets are at least 48 px.
```

---

### File 2: `C:\Users\anton\.gemini\config\skills\dina-brand-identity\references\layout-system.md`

#### Section: "Web page" (Lines 21–27)
**Current:**
```markdown
## Web page
- Same frame: sand nav strip offset 25% from the left (full width on mobile), hero on a 3fr / 1fr split with the photo column, sections as hairline rows, `max-width` of content columns around 62 characters for paragraphs.
- Spacing scale 4 / 8 / 16 / 24 / 40 / 64 / 96 px. Generous vertical space between rows; tight inside them.
- Components already styled in `assets/tokens.css`: `.nav`, `.split`, `.row`, `.cols`, `.circle`, `.btn`, `ul.o`, `table`, `.reveal`.
- Buttons are outlined and square; hover fills with Ink.
- Mobile: stack the split, photo column goes under the hero with a top hairline.
```

**Replace with:**
```markdown
## Web page (Anti-Slop / `design-taste-frontend` Aligned)
- **Split-Stage Architecture**:
  - **Desktop (>= 900 px)**: Two-column grid (50/50). Left column is a sticky `100svh` visual stage that dynamically crossfades through product imagery as the reader scrolls the right column. Right column holds a comfortable 48ch reading measure.
  - **Mobile (< 900 px)**: Top `55–60svh` visual stage band that displays authentic product photography immediately on the first screen. Single-column reading flow with equal 20 px margins on both sides.
- **No Hairlines or Outlined Boxes**: Surfaces are defined strictly by flat background tone steps (Paper `#F1EFE5`, Sand `#DAD8CB`, Ink `#191919`).
- **No Icon Cards**: Never build rows of 3 or 4 identical boxes topped with small icons. Present features as narrative slips (itinerary receipts), data lists, or live interactive widgets.
- **Mobile Ergonomics**:
  - `overflow-x: clip` on `body` (prevents iOS sticky positioning bugs).
  - Form inputs set to `16px` font size (prevents automatic iOS Safari zoom).
  - Tap targets at least 48 px.
  - Navigation header pinned at 56 px with `env(safe-area-inset-top)` support.
```

---

### File 3: `C:\Users\anton\.gemini\config\skills\dina-brand-identity\references\format-recipes.md`

#### Section: "Website or landing page (HTML)" (Lines 5–11)
**Update steps 3–5 to:**
```markdown
3. Structure sections using the split-stage layout (`.split-stage-wrap`) with alternating tone panels (`.sand-bg`, `.breakout-dual-zones`). Avoid dividing sections with hairline borders.
4. Integrate authentic product photography at large scale (>= 45% hero coverage) and use animated line SVG icons inline with text or inside interactive controls.
5. Verify with `design-taste-frontend` scripts:
   ```bash
   node <skill>/scripts/lint.mjs index.html css/site.css js/
   node <skill>/scripts/inspect.mjs index.html --allow palette-claude
   ```
   Ensure 0 FAIL across 1440 px, 768 px, and 390 px viewports.
```

---

## 3. Summary Matrix

| Element | Old DINA Deck Rule | Updated DINA Web Rule | Reason |
|---|---|---|---|
| **Section Dividers** | 1 px Stone hairlines | Space (120–200 px) & Tone steps | Hairlines fail `[hairline]` rule on web |
| **Feature Cards** | 1 px outlined boxes with top icons | Asymmetric narrative lists & interactive widgets | Banned as `[icon-cards]` template slop |
| **Labels & Captions** | 11 px uppercase tracked | 14–15 px sentence case (>= 13 px) | 11 px fails accessibility `[small-text]` |
| **Eyebrows** | Pill chips above headings | Removed (fold into headline/lead) | Banned as `[eyebrow]` ornament |
| **Numbered Steps** | `01`, `02`, `03` in outlined circles | Natural times ("Sunday", "15:00", "19:00") | Banned as decorative `[numbering]` |
| **Headings** | One italic word in every heading | One italic word in `<h1>` only; all `<h2>` uniform | Prevents `[mixed-font-headline]` warnings |
| **Clay Text** | Clay text on Sand/Paper | Dark Ink text on Sand/Paper; Clay for accents | Solves 2.4:1 contrast failure (now 5.0:1) |
| **Mobile Hero** | Photo column pushed under text | Top 56svh image banner | Prevents 0% hero photo on phones |
| **Form Inputs** | 14 px | 16 px | Prevents iOS Safari input focus zoom |
