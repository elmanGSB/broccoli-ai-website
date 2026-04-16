---
status: pending
priority: p1
issue_id: "002"
tags: [security, code-review]
dependencies: ["001"]
---

# Unvalidated `leadId` from API Response Interpolated into URL Path

## Problem Statement

`leadId` is set directly from the raw JSON response of the VM API (`leadId = (await vmRes.value.json()).id`) and then interpolated verbatim into a PATCH URL:

```js
fetch(BROCCOLI_API + '/api/leads/' + leadId, ...)
```

No validation is performed on `leadId` before use. If the API returns a crafted value such as `../admin/endpoint` or `1%2F..%2Fadmin`, the constructed URL becomes `BROCCOLI_API/api/leads/../admin/endpoint`. The threat model: a MITM on the HTTP connection (enabled by issue #001) or a compromised API response can inject arbitrary path segments. The VM hosts multiple services (Paperclip :3100, Hindsight :8888/:9999, LiteLLM, PostgreSQL) — path traversal on the API host could reach unintended endpoints.

Severity is P1 because issue #001 (HTTP cleartext) directly enables MITM that could poison the `id` field.

## Findings

- `demo.astro` line 974: `leadId = (await vmRes.value.json()).id` — no type or format check
- `demo.astro` line 1030: `BROCCOLI_API + '/api/leads/' + leadId` — direct string concatenation into URL path
- The PATCH call is guarded by `if (leadId)` but a non-null malicious string passes that check
- VM hosts multiple sensitive services on adjacent ports — path traversal is non-trivial risk

## Proposed Solutions

### Option 1: Validate `leadId` before use (Recommended)

**Approach:** Check that `leadId` matches an expected format (integer or UUID) before using it in a URL. One line of validation.

```js
if (vmRes.status === 'fulfilled' && vmRes.value.ok) {
  try {
    const data = await vmRes.value.json();
    const id = data.id;
    // Accept only integers or UUIDs
    if (id && /^[0-9a-f-]{1,36}$/i.test(String(id))) {
      leadId = id;
    }
  } catch {}
}
```

And when constructing the PATCH URL:
```js
fetch(BROCCOLI_API + '/api/leads/' + encodeURIComponent(leadId), ...)
```

**Pros:**
- Minimal change
- Correct defense in depth
- `encodeURIComponent` as secondary layer

**Cons:**
- Requires knowing the API's ID format (integer vs UUID)

**Effort:** 15 minutes

**Risk:** Low

---

### Option 2: Proxy PATCH through a server-side endpoint

**Approach:** Never expose `leadId` to the client. Instead, store a session token client-side and let a server-side function resolve the real ID.

**Pros:**
- `leadId` never in client JS
- Eliminates the attack surface entirely

**Cons:**
- Requires Astro hybrid output or separate serverless function
- More complex; overengineered for current scale

**Effort:** 3–4 hours

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Technical Details

**Affected files:**
- `src/pages/demo.astro:974` — where `leadId` is set
- `src/pages/demo.astro:1030` — where `leadId` is used in URL

**Database:** FastAPI `discovery.leads` table — `id` column is likely an integer or UUID; confirm format before writing the regex.

## Resources

- **PR:** elmanGSB/broccoli-ai-website#1
- **Blocked by:** Issue #001 (fix HTTP first — MITM is the primary threat vector that makes this exploitable)

## Acceptance Criteria

- [ ] `leadId` validated against expected format (integer or UUID regex) before use
- [ ] `encodeURIComponent(leadId)` applied in URL construction
- [ ] Malformed or unexpected `id` values in API response cause `leadId` to remain `null` (PATCH silently skipped, acceptable)
- [ ] Unit-testable: mock API response with `{ id: '../admin' }` → PATCH not fired

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (security-sentinel agent)

**Actions:**
- Located the raw JSON parse at line 974 and URL concatenation at line 1030
- Confirmed VM hosts multiple services on adjacent ports (from CLAUDE.md)
- Noted dependency on #001 — MITM is what makes this exploitable in practice

**Learnings:**
- The fix is a one-liner validation regex
- Need to confirm FastAPI ID format (integer serial vs UUID) to write the correct regex
