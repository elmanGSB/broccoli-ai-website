---
status: pending
priority: p3
issue_id: "008"
tags: [security, code-review]
dependencies: []
---

# No Content Security Policy Header or Meta Tag

## Problem Statement

`Layout.astro` has no `Content-Security-Policy` header or meta tag. Without a CSP, any injected scripts (XSS, browser extensions, future third-party embeds) run without restriction, and the browser cannot enforce which origins the page may contact. The `demo.astro` page makes cross-origin requests to Formspree and the VM API — a CSP `connect-src` directive would explicitly enumerate those and block unexpected destinations.

Not a blocking concern for launch, but a hygiene baseline for a site collecting PII.

## Findings

- `src/layouts/Layout.astro` — `<head>` contains no CSP meta tag
- The `<script define:vars>` pattern Astro uses requires `unsafe-inline` for scripts (cannot use hash/nonce with `define:vars`)
- External resources used: Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- Outbound fetches: `formspree.io`, VM API domain (once #001 is fixed)

## Proposed Solutions

### Option 1: Add CSP meta tag to `Layout.astro`

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self';
  script-src 'self' 'unsafe-inline';
  style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
  font-src https://fonts.gstatic.com;
  connect-src 'self' https://formspree.io https://api.broccolli.ai;
  frame-src https://calendar.google.com https://calendly.com https://cal.com;
  img-src 'self' data:;
">
```

**Effort:** 30 minutes

**Risk:** Low (test all pages after adding to confirm no blocked resources)

---

### Option 2: Set CSP via HTTP response header (better than meta tag)

**Approach:** If hosted on Vercel/Netlify, set CSP in `vercel.json` or `netlify.toml` headers config.

**Pros:**
- HTTP header CSP is enforced before page parse (meta tag is not)
- Easier to update without redeployment of HTML

**Cons:**
- Requires knowledge of hosting platform config

**Effort:** 30 minutes

**Risk:** Low

## Recommended Action

_To be filled during triage._

## Acceptance Criteria

- [ ] CSP meta tag or HTTP header present on all pages
- [ ] `connect-src` includes `formspree.io` and the VM API domain
- [ ] No legitimate resources blocked (check browser console after adding)
- [ ] `frame-src` includes scheduling tool domain once calendar is wired (#003)

## Work Log

### 2026-04-16 — Identified during code review

**By:** Claude Code (security-sentinel agent)
