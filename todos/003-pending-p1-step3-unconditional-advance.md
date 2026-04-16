---
status: pending
priority: p1
issue_id: "003"
tags: [ux, data-quality, code-review]
dependencies: []
---

# Step 3→4 Advances Without Verifying a Booking Was Made

## Problem Statement

The "I've booked a time" button on step 3 calls `goToStep4()` directly with zero verification that a booking occurred. The calendar iframe is `src="about:blank"` — no user can book anything. Any lead who clicks the button reaches step 4 ("You're on the list") which displays copy promising a calendar invite that was never generated. This is both a UX trust problem and a lead data quality defect: booked and non-booked leads are indistinguishable.

When the real calendar URL is wired in, the problem persists unless booking confirmation is detected programmatically — most scheduling tools (Calendly, Cal.com, Google Calendar) emit a `postMessage` event on booking completion that can be used as a gate.

## Findings

- `demo.astro` line 236: `onclick="goToStep4()"` — direct advance, no booking check
- `demo.astro` line 316–319: Step 4 copy: "Calendar invite landed in your inbox" — factually false if no booking made
- `demo.astro` line 310–312: Calendar iframe `src="about:blank"` with TODO comment
- No `postMessage` listener exists anywhere in the script block for a booking confirmation event
- PR checklist item: "Add Google Calendar schedule URL to Step 3 iframe" — marked unchecked

## Proposed Solutions

### Option 1: Remove step 3 until calendar is wired (Recommended short-term)

**Approach:** Collapse the flow to 3 steps: form → pillar → confirmation. Remove step 3 (calendar) entirely from the DOM and the progress tracker. Add a follow-up email CTA on step 4 that links to the calendar URL directly (new tab, not iframe). This is simpler than an iframe and avoids the `postMessage` gate problem entirely.

**Pros:**
- Ships a clean, working flow now
- Eliminates the "You're on the list, your calendar invite is coming" false promise
- Follow-up email CTA is lower friction than an embedded scheduler

**Cons:**
- Loses the inline scheduling experience
- Two-touch process (book in email vs. book in page)

**Effort:** 30 minutes

**Risk:** Low

---

### Option 2: Gate step-3 button on a `postMessage` booking event

**Approach:** Keep the iframe. Add a `window.addEventListener('message', ...)` listener that watches for the scheduling tool's booking confirmation event. Disable the "I've booked a time" button until the event fires. Show an "I'll book later" secondary option that also advances but with a flag indicating unbooked.

**Pros:**
- Full inline booking experience
- Accurate booked vs. unbooked signal in lead data

**Cons:**
- Each scheduling tool has a different `postMessage` format (Calendly: `{ event: 'calendly.event_scheduled' }`, Cal.com: `{ type: 'CAL:booking_successful' }`, Google Calendar: no `postMessage` — would require Calendly or Cal.com instead)
- Requires choosing and committing to a specific scheduling tool

**Effort:** 2–3 hours (including tool selection and `postMessage` implementation)

**Risk:** Medium (scheduler-specific)

---

### Option 3: Add a checkbox "I have booked a time" that the user must check

**Approach:** Add a checkbox that must be checked before the continue button is enabled. This is a low-tech opt-in confirmation.

**Pros:**
- Requires no tool-specific `postMessage` integration
- Distinguishes intentional skip from genuine booking

**Cons:**
- Low signal quality — users can check without booking
- Poor UX (requires extra click for no clear reason)

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro:236` — inline `onclick` on step3-booked button
- `src/pages/demo.astro:310–328` — step 3 section (iframe + placeholder + button)
- `src/pages/demo.astro:316–319` — step 4 copy that promises a calendar invite

**No backend changes needed** — this is entirely a frontend flow change.

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1
- **Calendly postMessage docs:** `https://developer.calendly.com/api-docs/ZG9jOjI0MzU2MDI-widget-embed`
- **Cal.com embed events:** `https://cal.com/docs/developing/embedding/embed-events`

## Acceptance Criteria

- [ ] No user can reach step 4 without either (a) a verified booking signal or (b) an explicit "skip/book later" action
- [ ] Step 4 copy accurately reflects whether a booking was made
- [ ] If option 1 chosen: 3-step flow with direct calendar link on step 3 (now confirmation)
- [ ] If option 2 chosen: `postMessage` listener added; button disabled until event fires; "book later" option present

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (architecture-strategist agent)

**Actions:**
- Located unconditional `onclick="goToStep4()"` at line 236
- Confirmed iframe is `about:blank` with a TODO (calendar URL not yet configured)
- Identified that step 4 confirmation copy promises a calendar invite
- Recommended Option 1 (remove step 3 until calendar is wired) as the lowest-risk short-term path

**Learnings:**
- Google Calendar embeds do not emit `postMessage` events on booking — a dedicated scheduling tool (Calendly, Cal.com) is needed for Option 2
- The PR already lists "Add Google Calendar schedule URL" as an unchecked TODO — that work should be done alongside fixing this issue
