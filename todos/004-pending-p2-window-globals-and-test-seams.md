---
status: pending
priority: p2
issue_id: "004"
tags: [quality, testing, code-review]
dependencies: []
---

# `window.showStep` / `window.goToStep4` Globals Pollute Namespace and Weaken Tests

## Problem Statement

Two functions are attached to `window` so an inline `onclick` attribute can reach them. This is the only reason they need to be global. As a side effect, E2E tests use them via `page.evaluate()` to teleport the wizard into arbitrary states, bypassing the real interaction flow. Two of the seven demo tests never exercise the actual form submit or pillar-select interactions — they test DOM structure after a state teleport. If the wizard transition logic broke, those tests would still pass.

## Findings

- `demo.astro:906`: `window.showStep = showStep` — only needed for `window.goToStep4`'s test usage
- `demo.astro:1057`: `window.goToStep4 = goToStep4` — only needed for `demo.spec.ts:45`
- `demo.astro:236`: `onclick="goToStep4()"` — the one real caller; could be an `addEventListener` inside the script block like every other button
- `demo.spec.ts:31`: `page.evaluate(() => (window as any).showStep(2))` — teleports to step 2 without going through form submit
- `demo.spec.ts:43-46`: `page.evaluate(() => { ...click(); goToStep4() })` — directly calls the internal function
- The two `window.*` assignments could be removed entirely once `onclick` is replaced

## Proposed Solutions

### Option 1: Replace `onclick` with `addEventListener`, fold `goToStep4` into `showStep` (Recommended)

**Approach:**
1. Remove `onclick="goToStep4()"` from the step3 button
2. Add `document.getElementById('step3-booked')?.addEventListener('click', () => showStep(4))` inside the script block (consistent with every other button)
3. Move the step-4 side effects (label text + checkmark animation) into `showStep` behind an `if (n === 4)` branch
4. Delete `goToStep4` entirely
5. Remove both `window.*` assignments

For E2E tests, replace `page.evaluate()` calls with real interactions:
- Step 2 test: fill the form and submit (mock the two API calls with `page.route()`)
- Step 4 test: complete steps 1–3 end-to-end with mocked network

**Pros:**
- Zero global namespace pollution
- Tests validate actual user flow
- Script block has no exported symbols

**Cons:**
- Requires adding `page.route()` mocks to E2E tests (small extra work)
- Tests become slower (real DOM interaction vs. JS eval) — still under 1s per test

**Effort:** 1–2 hours

**Risk:** Low

---

### Option 2: Keep globals, add data-testid attributes for test navigation

**Approach:** Keep `window.showStep` but add `data-testid` attributes to each step section. Tests use clicks on real elements instead of `page.evaluate`.

**Pros:**
- Minimal test rewrite
- Keeps the global as a documented escape hatch

**Cons:**
- `window.showStep` still pollutes namespace
- Tests still bypass actual transitions

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro:236,895-906,1043-1057` — remove `onclick`, fold `goToStep4`, remove `window.*`
- `e2e/demo.spec.ts:30-48` — replace `page.evaluate()` calls with real interactions + `page.route()` mocks

**Simplified `showStep` with step-4 side effects:**
```js
function showStep(n) {
  [1,2,3,4].forEach(i => {
    const el = document.getElementById('step' + i);
    if (!el) return;
    el.style.display = i === n ? 'flex' : 'none';
    if (i === n) { el.style.animation = 'none'; void el.offsetWidth; el.style.animation = ''; }
  });
  document.querySelectorAll('.progress-dot').forEach(dot =>
    dot.classList.toggle('active', parseInt(dot.dataset.step) === n)
  );
  if (n === 4) {
    const label = document.getElementById('selected-pillar-label');
    if (label) label.textContent = PILLAR_NAMES[selectedPillar] ?? '01 · Sales Empowerment';
    const mark = document.querySelector('.confirm-mark');
    if (mark) { mark.classList.remove('animate'); void mark.offsetWidth; mark.classList.add('animate'); }
  }
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
// No window.showStep = showStep
// No window.goToStep4 = goToStep4
```

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1
- **Playwright route mocking:** https://playwright.dev/docs/mock

## Acceptance Criteria

- [ ] No `window.showStep` or `window.goToStep4` assignments in `demo.astro`
- [ ] No `onclick` attributes on any button in `demo.astro` (consistent with existing pattern)
- [ ] `goToStep4` function deleted; its logic folded into `showStep`
- [ ] `demo.spec.ts` has no `page.evaluate()` calls that bypass form interactions
- [ ] All 17 Playwright tests still pass

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (security-sentinel + architecture-strategist + code-simplicity-reviewer agents)

**Actions:**
- Traced `window.showStep` and `window.goToStep4` to their single use case: `onclick` attribute on one button
- Confirmed every other button in the file uses `addEventListener` — the `onclick` is inconsistent
- Identified that E2E tests using `page.evaluate` bypass the actual interaction contract
