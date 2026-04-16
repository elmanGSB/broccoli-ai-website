---
status: pending
priority: p2
issue_id: "005"
tags: [security, backend, code-review]
dependencies: ["001"]
---

# FastAPI `/api/leads` Endpoint Has No Origin Restriction or CSRF Protection

## Problem Statement

The `POST /api/leads` and `PATCH /api/leads/{id}` endpoints on the VM accept requests from any origin with no authentication or CORS restriction. Any page on any domain can POST to the endpoint and create or modify lead records. Since the API accepts JSON (`Content-Type: application/json`), browser CORS preflight is triggered — but only if the server's `Access-Control-Allow-Origin` is properly configured. If it is currently set to `*` (the FastAPI default for `CORSMiddleware`), cross-origin writes are allowed from any site.

## Findings

- `demo.astro` lines 961–970: both calls carry no auth token or CSRF header
- FastAPI CORS config not visible in this PR (backend not in this repo)
- Default `CORSMiddleware(app, allow_origins=["*"])` permits any origin
- Formspree has its own anti-spam protections; the VM endpoint has none visible
- Rate limiting on the endpoint is unknown

## Proposed Solutions

### Option 1: Restrict `Allow-Origin` to `https://broccolli.ai` on the FastAPI side (Recommended immediate)

**Approach:** In the FastAPI app, change `CORSMiddleware` to:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://broccolli.ai"],
    allow_methods=["POST", "PATCH"],
    allow_headers=["Content-Type"],
)
```

**Pros:**
- Browser CORS preflight will reject any call not from `https://broccolli.ai`
- Zero client-side changes needed
- Covers both POST and PATCH

**Cons:**
- Does not protect against server-to-server calls (curl, scripts) — no auth token
- Still requires the HTTP→HTTPS fix (issue #001) to be effective from the live site

**Effort:** 15 minutes on the VM

**Risk:** Low

---

### Option 2: Add a shared-secret header

**Approach:** Inject a build-time secret into the client bundle (e.g., `X-Demo-Token: <HMAC>`) and validate it in FastAPI. Any request without the token is rejected with 401.

**Pros:**
- Protects against server-to-server abuse (curl, scrapers)
- Simple to implement

**Cons:**
- The secret is visible in the compiled JS bundle (same issue as the API URL being public)
- Security through obscurity — raises the bar but doesn't eliminate abuse
- Needs key rotation plan

**Effort:** 1–2 hours

**Risk:** Low

---

### Option 3: Rate limiting on the FastAPI endpoint

**Approach:** Add `slowapi` or a similar rate limiter to `/api/leads` — e.g., 5 requests per IP per hour.

**Pros:**
- Mitigates spam regardless of CORS config
- Complementary to Option 1

**Cons:**
- Does not prevent distributed abuse
- Adds a dependency

**Effort:** 1 hour

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- VM FastAPI app — `CORSMiddleware` config (not in this repo; lives on `34.61.120.233`)
- SSH: `gcloud compute ssh paperclip-vm --zone=us-central1-f`

**No client-side changes needed for Option 1.**

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1
- **Blocked by:** Issue #001 (CORS restriction only matters once HTTP→HTTPS is fixed)
- **FastAPI CORS docs:** https://fastapi.tiangolo.com/tutorial/cors/

## Acceptance Criteria

- [ ] `Access-Control-Allow-Origin` on `/api/leads` restricted to `https://broccolli.ai`
- [ ] `curl -X POST http://34.61.120.233:3101/api/leads -H "Origin: https://evil.com"` returns 403 or CORS error
- [ ] The live demo form still submits successfully from `https://broccolli.ai`

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (security-sentinel agent)

**Actions:**
- Noted no auth header in any client-side fetch call
- CORS config on the VM FastAPI app is unknown — needs inspection
- Option 1 (CORS restriction) is the minimum required fix; Option 3 (rate limiting) is a good complement
