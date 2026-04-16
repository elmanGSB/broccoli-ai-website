---
status: pending
priority: p1
issue_id: "001"
tags: [security, networking, code-review]
dependencies: []
---

# VM API Uses HTTP — Blocked by Browser Mixed Content on HTTPS Page

## Problem Statement

`PUBLIC_BROCCOLI_API` resolves to `http://34.61.120.233:3101`. When the demo page is served over `https://broccolli.ai`, browsers block all `fetch()` calls to an HTTP origin under the Mixed Content policy. The VM write (`POST /api/leads`) and the pillar PATCH silently fail for 100% of HTTPS visitors. `leadId` stays `null`, so the pillar is never recorded. Formspree still fires (HTTPS) but the VM never receives a single lead.

Additionally, PII (name, email, phone, company) is transmitted in cleartext over HTTP — a GDPR/CCPA concern.

## Findings

- `.env` line 1: `PUBLIC_BROCCOLI_API=http://34.61.120.233:3101`
- `demo.astro` line 965: value baked into client JS bundle via `define:vars`
- `Promise.allSettled` hides the failure — the user advances to step 2 with no error indication
- `leadId` always `null` in production → pillar PATCH on step 3 always silently skipped
- VM has nginx already running (port 3100 for Paperclip API) — TLS termination is achievable

## Proposed Solutions

### Option 1: Nginx reverse proxy with Let's Encrypt on the VM (Recommended)

**Approach:** Add an nginx server block on `34.61.120.233` that terminates TLS at port 443 for `api.broccolli.ai` (or a subdomain), proxying to FastAPI on port 3101. Use `certbot` for the cert.

**Pros:**
- Fixes mixed content completely
- Hides raw IP behind a domain (IP rotation becomes possible)
- Standard production setup; Let's Encrypt is free

**Cons:**
- Requires DNS change (A record for `api.broccolli.ai` → `34.61.120.233`)
- ~30 min setup on the VM

**Effort:** 1–2 hours

**Risk:** Low

---

### Option 2: Proxy through Vercel/Netlify edge function

**Approach:** Add a `/api/leads` serverless function on the hosting platform that forwards to the VM. Client always calls the same origin (HTTPS by default).

**Pros:**
- No VM config needed
- Hides VM IP entirely
- Rate limiting and auth can be added at the edge

**Cons:**
- Adds latency hop
- Requires Astro hybrid/SSR output or a separate serverless config

**Effort:** 2–3 hours

**Risk:** Low–Medium

---

### Option 3: Change VM FastAPI to listen on HTTPS directly

**Approach:** Configure FastAPI with `ssl_keyfile`/`ssl_certfile` and expose 443 directly.

**Pros:** Simple, no extra hop

**Cons:** Certificate management on raw FastAPI is fragile; nginx is the right terminator

**Effort:** 1 hour

**Risk:** Medium

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `.env` — `PUBLIC_BROCCOLI_API` value
- `.env.example` — document HTTPS requirement
- `src/pages/demo.astro:965` — value injected here at build time
- VM nginx config — new server block needed

**Related components:**
- FastAPI service on VM port 3101 (`/api/leads` POST + PATCH)
- Paperclip API on port 3100 — shares the VM, same nginx instance can handle both

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1
- **VM:** `34.61.120.233` (Paperclip VM, `gcloud compute ssh paperclip-vm --zone=us-central1-f`)
- **Similar:** VM already has services at 3100; nginx pattern exists

## Acceptance Criteria

- [ ] `PUBLIC_BROCCOLI_API` starts with `https://` in all environments
- [ ] `fetch(BROCCOLI_API + '/api/leads', ...)` succeeds in browser DevTools Network tab on the live HTTPS site
- [ ] No Mixed Content errors in browser console
- [ ] `.env.example` documents that the value must be HTTPS
- [ ] PII no longer transmitted in cleartext

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (security-sentinel + performance-oracle agents)

**Actions:**
- Confirmed `dist/demo/index.html` contains `http://34.61.120.233:3101` in output bundle
- Verified `Promise.allSettled` silently swallows the mixed-content failure
- Confirmed VM already has nginx for other services — Option 1 is lowest friction

**Learnings:**
- `PUBLIC_` Astro env vars are intentionally client-visible; the raw IP will always be in the bundle unless proxied through a domain
- Option 1 (nginx + Let's Encrypt) is the minimal fix; Option 2 is the production-grade fix
