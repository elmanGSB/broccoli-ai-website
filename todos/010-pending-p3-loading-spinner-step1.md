---
status: pending
priority: p3
issue_id: "010"
tags: [ux, code-review]
dependencies: ["006"]
---

# No Loading Spinner on Step 1→2 Async Transition

## Problem Statement

When the user submits the step 1 form, the button disables and its text changes to "Submitting…" — but there is no visual progress indicator. On a slow connection or cold VM start, users see a static disabled button for several seconds. The experience reads as broken, not loading. This is a polish-level issue that becomes a trust issue on a lead capture form where the first impression matters.

This should be addressed after issue #006 (decouple VM from UX) — once the VM call is fire-and-forget, the wait time drops to Formspree's response time only (~500ms), making the spinner less critical but still desirable.

## Findings

- `demo.astro:993-998`: button disables and text changes to "Submitting…" — only visual feedback
- No spinner CSS or animation exists in the current style block
- The submit handler awaits both API calls before calling `showStep(2)` (tracked in #006)
- The existing `.shake` animation infrastructure confirms CSS animations are fine to add

## Proposed Solutions

### Option 1: CSS border-radius spinner inside the button (Recommended)

**Approach:** Add a spinning indicator that replaces the arrow icon inside the button while in loading state. Pure CSS, no new dependencies.

```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
.demo-btn.loading span::after {
  content: '';
  display: inline-block;
  width: 14px;
  height: 14px;
  border: 2px solid rgba(255,255,255,0.4);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-left: 10px;
  vertical-align: middle;
}
```

In JS, add `.loading` class alongside disabling, remove it if showing step 2.

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro` — `<style>` block (add spinner keyframe + `.loading` variant)
- `src/pages/demo.astro:993-998` — submit handler (add/remove `.loading` class)

## Acceptance Criteria

- [ ] Spinning indicator visible inside the submit button while awaiting API responses
- [ ] Spinner removed when step 2 is shown (or if validation fails)
- [ ] No layout shift when spinner appears
- [ ] All 17 Playwright tests still pass

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (architecture-strategist agent)
