---
status: pending
priority: p3
issue_id: "009"
tags: [quality, code-review]
dependencies: ["004"]
---

# Code Simplification — Three Minor Cleanups in `demo.astro`

## Problem Statement

Three small patterns in `demo.astro` can be simplified without behavior change. All are low-urgency and blocked by issue #004 (window globals cleanup) for the first item.

## Findings

### 1. Dead `<iframe src="about:blank">` (lines 224–226)

The calendar iframe serves no purpose — it loads `about:blank` and is fully covered by the `.calendar-placeholder` overlay. A live DOM node with no content. Should be removed until the real calendar URL exists.

### 2. `validateAll` explicit field list duplicates `tests` object keys (line 931–938)

```js
// Current — two places to update when adding a field
const tests = { name: ..., company: ..., email: ..., phone: ..., company_size: ..., website: ... };
function validateAll() {
  return [
    validateField('name', tests.name),
    validateField('company', tests.company),
    // ...6 items...
  ].every(Boolean);
}
```

The `tests` object already defines the canonical field list. `validateAll` can be derived:

```js
function validateAll() {
  return Object.keys(tests).map(id => validateField(id, tests[id])).every(Boolean);
}
```

Adding a field now requires updating only `tests` (one place instead of three).

### 3. `submitStep1` reads each field individually (lines 952–957)

Six separate `getElementById` calls for fields that are already enumerated in `tests`:

```js
// Simpler
const payload = Object.fromEntries(
  Object.keys(tests).map(id => [id, (document.getElementById(id)?.value ?? '').trim()])
);
```

## Proposed Solutions

### Option 1: Apply all three cleanups

**Effort:** 30 minutes total

**Risk:** Low — all are mechanical substitutions with no logic change

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro:224-226` — remove dead iframe (keep placeholder div)
- `src/pages/demo.astro:931-938` — simplify `validateAll`
- `src/pages/demo.astro:952-957` — simplify field reads in `submitStep1`

## Acceptance Criteria

- [ ] `<iframe src="about:blank">` removed from step 3 section
- [ ] `validateAll` uses `Object.keys(tests)` derivation
- [ ] `submitStep1` builds payload from `Object.keys(tests)` loop
- [ ] All 17 Playwright tests still pass
- [ ] Adding a new form field requires changing only the `tests` object

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (code-simplicity-reviewer agent)
