# /demo Flow — Design Spec

**Date:** 2026-04-15  
**Status:** Approved  
**Author:** Elman Amador

---

## Summary

A 4-step "Request a Demo / Get AI Consultation" flow for the Broccoli AI website. Replaces the current `#top` CTA link with a dedicated `/demo` page. Captures lead data and schedules a 45-minute consultation.

---

## User Flow

```
Step 1: Contact Info → Step 2: Pillar Selection → Step 3: Schedule → Step 4: Thank You
```

All steps live on a single `/demo` Astro page. No page reloads between steps — vanilla JS manages show/hide transitions. Form state lives in memory as a plain JS object.

---

## Step Details

### Step 1 — Contact Info
**Fields (all required):**
- Full name
- Company name
- Work email
- Phone
- Company size (select: solo / 2–10 / 11–50 / 50+ drivers)

**Behavior:**
- Client-side validation on blur + submit attempt
- On valid submit: POST to Formspree (email alert) AND POST to `https://jumpersapp.com/api/leads` (Postgres write via Caddy reverse proxy)
- API returns a lead `id` stored in JS state for the pillar PATCH in Step 2
- Advance to Step 2 on success (smooth scroll / transition)

### Step 2 — Pillar Selection
**Cards (2×2 grid):**
- 01 · Sales Empowerment — gradient terra SVG (nested rects on axis)
- 02 · Supplier Negotiations — gradient SVG (two overlapping color blocks)
- 03 · Knowledge Capture — gradient sage SVG (stacked diamond layers)
- 04 · Payments & Collections — gradient terra SVG (bell curve / distribution)
- Custom row (dark card) — "I want a custom-made AI"

**Behavior:**
- Single-select; selected card gets sage border + checkmark
- On Continue: PATCH `https://jumpersapp.com/api/leads/:id` with `{ pillar: selectedId }`
- Advance to Step 3

### Step 3 — Schedule
**Layout:**
- Google Calendar appointment embed (iframe)
- Manual "I've booked a time →" button below iframe (GCal has no return URL support)

**Behavior:**
- Button simply advances to Step 4 — no additional data write needed

### Step 4 — Thank You
**Content:**
- Animated SVG checkmark (draws on entry)
- "You're on the list." headline
- Pillar tag dynamically set from Step 2 selection
- "What happens next" card:
  1. Confirmation email — calendar invite in inbox
  2. Quick intake — we review routes/vendor relationships before call
  3. 45-minute consultation — live demo scoped to their operation
- "← Back to broccolli.ai" link

---

## Architecture — Option B (single page, JS-driven)

One `src/pages/demo.astro` file. All 4 step sections in the DOM, transitions handled by a lightweight JS step manager (~50 lines). No new dependencies.

**Why not Option A (separate pages):** Full-page reloads feel clunky; state management across navigations is fragile.  
**Why not Option C (React island):** Adds React dependency to a zero-JS static site; overkill for a 4-step form.

---

## Data Flow

| Event | Action |
|-------|--------|
| Step 1 submit (valid) | POST Formspree → email alert to Elman |
| Step 1 submit (valid) | POST `POST /api/leads` → writes to `discovery.leads` Postgres table |
| Step 2 Continue | PATCH `/api/leads/:id` with `{ pillar }` |
| Step 3 Continue | No write — just advance |
| Step 4 rendered | Lead capture complete |

### `discovery.leads` table schema
```sql
CREATE TABLE discovery.leads (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  phone       TEXT,
  company     TEXT,
  company_size TEXT,
  pillar      TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);
```

### API endpoint — `POST /api/leads`
Runs on Paperclip VM (FastAPI on port 3101), reverse-proxied via Caddy on jumpersapp.com:443. Returns `{ id }` used for the pillar PATCH.

```
POST https://jumpersapp.com/api/leads
Body: { name, email, phone, company, company_size }
→ 201 { id: 42 }

PATCH https://jumpersapp.com/api/leads/:id
Body: { pillar }
→ 200 { ok: true }
```

---

## Visual Design

**Palette:** Broccoli brand — sage (`#6b8f71`), sage-deep (`#4a6e50`), terra (`#c67a4b`), cream (`#f5f0e8`), white (`#faf8f4`)  
**Typography:** Playfair Display (headlines) + DM Sans (body)  
**Cards:** White background, sage border on selection, gradient inline SVG icons (no external CDN)  
**Progress:** 4-dot track with connectors; active dot has sage glow ring  
**Step 1:** Above-fold constraint — `min-height: calc(100vh - 62px)` keeps Step 2 hidden on load  

---

## Implementation Checklist

- [ ] Create `src/pages/demo.astro` (single-page, all 4 steps)
- [ ] Add JS step manager (show/hide + smooth scroll transitions)
- [ ] Wire Formspree endpoint (create form at formspree.io, add form ID)
- [ ] Create `POST /api/leads` + `PATCH /api/leads/:id` on Paperclip VM (`:3100`)
- [ ] Create `discovery.leads` table in Postgres
- [ ] Update CTA button: `href="#top"` → `href="/demo"` in homepage component
- [ ] Test full flow end-to-end (form validation → lead write → pillar patch → calendar → thank you)

---

## Out of Scope

- Email confirmation to the lead (future)
- CRM integration (future)
- Analytics / conversion tracking (future)
- Mobile-specific calendar embed handling (future)
