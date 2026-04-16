---
status: pending
priority: p2
issue_id: "006"
tags: [ux, reliability, code-review]
dependencies: []
---

# Form Submit Blocks UX on Both Fetches; Formspree Failure Silently Discarded

## Problem Statement

Three related issues in `submitStep1`:

1. **UX blocking**: `Promise.allSettled([formspree, vmApi])` is awaited before calling `showStep(2)`. Both network calls must complete before the user advances. On slow connections or a cold VM start, this can be 3–5 seconds of staring at a disabled button. The VM write is described as fire-and-forget in comments but is not — it blocks the UI.

2. **Silent Formspree failure**: The Formspree result is destructured and immediately discarded (`const [, vmRes]`). If Formspree fails (quota exceeded, network error), the user still advances to step 2 with no indication that the email notification was lost.

3. **`leadId`-null PATCH silently no-ops**: When the VM API fails on step 1, `leadId` stays `null`. The step-2 pillar PATCH is gated on `if (leadId)` — so leads who hit a VM error on step 1 have no pillar recorded. This is an invisible data quality gap with no logging.

## Findings

- `demo.astro:960-977`: `Promise.allSettled` awaits both calls; Formspree result discarded
- `demo.astro:974-978`: `leadId` set only on VM success — null on any VM error
- `demo.astro:1029-1034`: PATCH gated on `if (leadId)` — silently skipped when null
- The step advances regardless of both outcomes — this product decision is correct
- Neither failure path logs to console

## Proposed Solutions

### Option 1: Decouple VM from UX, add error logging (Recommended)

**Approach:**
- Fire the VM write as a genuine fire-and-forget (`.then().catch()` without `await`)
- Await only Formspree (or advance immediately after validation, before any network call)
- Add `console.error` on both failure paths for observability

```js
async function submitStep1() {
  const payload = { name, email, phone, company, company_size, website };

  // True fire-and-forget — never blocks step advance
  fetch(BROCCOLI_API + '/api/leads', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
    .then(async r => {
      if (r.ok) {
        try { leadId = (await r.json()).id; } catch {}
      } else {
        console.error('[leads] VM API error:', r.status);
      }
    })
    .catch(err => console.error('[leads] VM API fetch failed:', err));

  // Await Formspree — it's the notification of record
  try {
    const res = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) console.error('[leads] Formspree error:', res.status);
  } catch (err) {
    console.error('[leads] Formspree fetch failed:', err);
  }

  showStep(2);
}
```

**Note:** `leadId` will be a race when this pattern is used — the user may reach step 3 before the VM responds and the PATCH fires without a `leadId`. Mitigate by also queuing the pillar in the step-2 continue handler: if `leadId` is null at step-3, retry the full payload as a single POST that includes the pillar.

**Pros:**
- Step advance is instant after Formspree (or even before)
- VM failures visible in console / Sentry
- User experience: button responds immediately

**Cons:**
- `leadId` race — PATCH may fire before VM responds
- Adds retry complexity if `leadId` race is a problem

**Effort:** 1 hour

**Risk:** Low

---

### Option 2: Show a non-blocking toast on error

**Approach:** Keep `Promise.allSettled` but show a small error indicator if either call fails, while still advancing to step 2.

**Pros:**
- User knows something went wrong
- No UX blocking

**Cons:**
- More UI state to manage
- Confusing to show an error while advancing forward

**Effort:** 1–2 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro:960-977` — `submitStep1` function

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1

## Acceptance Criteria

- [ ] VM API call does not block step 1→2 transition
- [ ] Formspree failure is logged (`console.error`) and does not silently disappear
- [ ] VM API failure is logged (`console.error`)
- [ ] Step 1→2 transition feels immediate on slow connections (< 500ms UX response after valid form submit)
- [ ] Existing 17 Playwright tests still pass

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (performance-oracle + architecture-strategist agents)

**Actions:**
- Traced `Promise.allSettled` pattern — confirmed both calls awaited before `showStep(2)`
- Confirmed Formspree result is destructured and discarded
- Identified `if (leadId)` guard at line 1029 as silent failure path
