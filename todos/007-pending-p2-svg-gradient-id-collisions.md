---
status: pending
priority: p2
issue_id: "007"
tags: [quality, svg, code-review]
dependencies: []
---

# SVG Gradient IDs Are Globally Scoped — Collision Risk

## Problem Statement

The four pillar card SVGs use short gradient IDs: `g1a`, `g1b`, `g1c`, `g2a`, `g2b`, `g3a`, `g3b`, `g3c`, `g4a`, `g4b`. SVG `<defs>` IDs are document-scoped, not SVG-scoped. If any other SVG on the same page (analytics, chat widget, a future component) uses any of these IDs, the gradients silently override each other and one or more pillar icons will render with the wrong colors or not render at all. The bug is invisible in isolation and very hard to debug.

## Findings

- `demo.astro` lines 101–176: 10 gradient IDs across 4 SVGs, all single-letter + digit names
- No namespace prefix on any ID
- Risk is currently zero in isolation (no other SVGs on the demo page)
- Risk materializes the moment: (a) any chat/support widget is added to the page (e.g., Intercom, Crisp — both inject SVGs), (b) a second component with SVG gradients is added to the same layout, (c) the page is iframed inside another document

## Proposed Solutions

### Option 1: Prefix IDs with card `data-id` (Recommended)

**Approach:** Replace generic IDs like `g1a` with `sales-ga`, `sales-gb`, `sales-gc`, `supplier-ga`, etc. This is a find-and-replace within each SVG block.

```html
<!-- Before -->
<linearGradient id="g1a" ...>
<rect ... fill="url(#g1a)" ...>

<!-- After -->
<linearGradient id="sales-ga" ...>
<rect ... fill="url(#sales-ga)" ...>
```

**Pros:**
- Zero collision risk with any external SVG
- Self-documenting (readable: `sales-ga` vs `g1a`)
- One-time, mechanical change

**Cons:**
- Purely cosmetic fix — no behavior change

**Effort:** 20 minutes

**Risk:** Low (find-and-replace, no logic change)

---

### Option 2: Use inline SVG `<style>` and CSS custom properties instead of `<defs>` gradients

**Approach:** Replace `<linearGradient>` with CSS `background: linear-gradient()` on the SVG rects. Eliminates IDs entirely.

**Pros:**
- No IDs, no collision surface
- More maintainable

**Cons:**
- More rewrite work; changes SVG structure
- CSS `linear-gradient` on SVG shapes has some cross-browser edge cases

**Effort:** 1–2 hours

**Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro` lines 101–176 (SVG defs blocks)
- 10 IDs to rename: `g1a`, `g1b`, `g1c`, `g2a`, `g2b`, `g3a`, `g3b`, `g3c`, `g4a`, `g4b`
- Each has exactly two occurrences per SVG: one in `<defs>` (definition) and one in `fill="url(#...)"` (usage)

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1

## Acceptance Criteria

- [ ] All 10 gradient IDs namespaced (e.g., `sales-ga` prefix pattern or similar)
- [ ] No ID shorter than 6 characters in any SVG `<defs>` block
- [ ] All `fill="url(#...)"` references updated to match renamed IDs
- [ ] Pillar cards visually unchanged after rename
- [ ] No new ID collisions with any existing SVGs in the Layout

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (performance-oracle agent)

**Actions:**
- Identified 10 short gradient IDs across 4 SVG blocks
- Confirmed no current collision (demo page has no other SVGs)
- Flagged as P2 because the collision will be invisible and hard to debug when it occurs (e.g., after adding a support chat widget)
