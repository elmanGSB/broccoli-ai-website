# Broccoli AI Website — Deployment Documentation

**Deployed:** April 21, 2026  
**Status:** ✅ Live at https://broccolliai.com  
**GCP Project:** `broccolli-ai-web` (us-central1)  
**Cloud Run Service:** `broccolli-ai-web`

---

## Overview

This document describes the deployment infrastructure, setup process, and how to maintain the live site.

The site is deployed to Google Cloud Run using a multi-stage Docker build (Bun for static site generation → nginx:alpine for serving). GitHub Actions CI/CD automatically builds and deploys on every push to `main` using Workload Identity Federation (WIF) for keyless authentication.

---

## Architecture

### Docker Multi-Stage Build

**Stage 1: Build** (oven/bun:1-alpine)
- Installs dependencies from `package.json` and `bun.lock`
- Runs `bun run build` to generate static Astro site in `dist/`
- Build-time environment variables (`PUBLIC_*`) are baked into HTML

**Stage 2: Serve** (nginx:alpine)
- Copies `dist/` to `/usr/share/nginx/html`
- Copies `nginx.conf.template` → `/etc/nginx/templates/default.conf.template`
- nginx:alpine entrypoint automatically runs `envsubst` on template files
- Cloud Run injects `$PORT` environment variable at runtime

### Files

| File | Purpose |
|------|---------|
| `Dockerfile` | Multi-stage build definition |
| `nginx.conf.template` | nginx configuration with security headers and static routing |
| `.dockerignore` | Excludes unnecessary files from Docker context |
| `.github/workflows/deploy.yml` | GitHub Actions CI/CD workflow |
| `infra/gcp-bootstrap.sh` | One-time GCP project and WIF setup (already run) |

---

## GitHub Actions CI/CD

### Workflow: `deploy.yml`

Triggered on every push to `main` branch. Two jobs:

**Job 1: Build & Push**
- Authenticates to GCP via Workload Identity Federation
- Builds Docker image with docker/buildx-action@v6
- Pushes to GCP Artifact Registry: `us-central1-docker.pkg.dev/broccolli-ai-web/broccolli-ai/broccolli-ai-web`
- Uses GitHub Actions cache backend (`type=gha,mode=max`) for Docker layers
- Tags: `{IMAGE}:{github.sha}` and `{IMAGE}:latest`

**Job 2: Deploy**
- Deploys image to Cloud Run service `broccolli-ai-web`
- Configuration:
  - Region: us-central1
  - Allow unauthenticated access: ✓
  - Concurrency: 1000 (nginx optimized for static serving)
  - Memory: 256Mi
  - CPU: 1
  - Min instances: 0 (scale down to zero when idle)
  - Max instances: 10 (scale up on demand)
  - Service account: `cloudrun-runtime@broccolli-ai-web.iam.gserviceaccount.com` (no special permissions)

### Environment Variables (Build-Time)

These are baked into the static HTML at build time. To change them, push a new commit (redeploy).

```
PUBLIC_BROCCOLI_API=https://jumpersapp.com
PUBLIC_FORMSPREE_URL=https://formspree.io/f/mdayavqr
PUBLIC_CAL_URL=https://cal.com/elman/free-ai-consultation
```

Set via GitHub Secrets (optional):
- `PUBLIC_BROCCOLI_API` (defaults to jumpersapp.com)
- `PUBLIC_FORMSPREE_URL` (defaults to formspree.io)
- `PUBLIC_CAL_URL` (defaults to cal.com)

### GitHub Secrets Required

These secrets are already configured in https://github.com/elmanGSB/broccoli-ai-website/settings/secrets/actions

- `WIF_PROVIDER`: Workload Identity Federation pool provider resource name
- `WIF_SERVICE_ACCOUNT`: Service account email for GitHub Actions
- `GCP_PROJECT_ID`: `broccolli-ai-web`

---

## nginx Configuration

### Security Headers

All responses include:
- `X-Frame-Options: DENY` — Prevent clickjacking
- `X-Content-Type-Options: nosniff` — Disable MIME sniffing
- `Strict-Transport-Security: max-age=31536000; includeSubDomains` — Force HTTPS for 1 year
- `Content-Security-Policy` — Restrict script/style/font/frame sources
- `Permissions-Policy` — Disable camera, microphone, geolocation
- `Referrer-Policy: strict-origin-when-cross-origin` — Control referrer info

### Static Content Routing

| Location | Behavior |
|----------|----------|
| `/` | Try file → directory → `*.html` extension → 404 |
| `/_astro/` | Cache forever (1 year, immutable content hash) |
| `/images/` | Cache 30 days |
| `/health` | nginx 404 (file not found) |
| `/healthz` | Cloud Run intercepts (reserved endpoint) |

### gzip Compression

Enabled for: text/plain, text/css, application/javascript, application/json, image/svg+xml (min 1KB)

---

## Domain Configuration

### Domain: broccolliai.com

**Status:** Active with SSL certificate  
**Verified:** April 21, 2026 via Google Search Console  
**Mapping:** Cloud Run domain mapping created April 21, 2026

### DNS Records (GoDaddy)

**A Records (4 total):**
```
@ → 216.239.32.21
@ → 216.239.34.21
@ → 216.239.36.21
@ → 216.239.38.21
```

**AAAA Records (4 total):**
```
@ → 2001:4860:4802:32::15
@ → 2001:4860:4802:34::15
@ → 2001:4860:4802:36::15
@ → 2001:4860:4802:38::15
```

---

## Maintenance

### Deploying Changes

1. **Code changes:** Push to `main` branch
   ```bash
   git add .
   git commit -m "message"
   git push origin main
   ```
   GitHub Actions automatically builds and deploys (watch at https://github.com/elmanGSB/broccoli-ai-website/actions)

2. **Environment variable changes:** Edit GitHub Secrets, then push any commit to trigger redeploy

3. **nginx config changes:** Edit `nginx.conf.template`, push to `main` for rebuild

### Rollback

To revert to a previous deployment:

```bash
# List recent revisions
gcloud run revisions list \
  --service=broccolli-ai-web \
  --region=us-central1 \
  --project=broccolli-ai-web

# Route all traffic to previous revision
gcloud run services update-traffic broccolli-ai-web \
  --to-revisions=REVISION_NAME=100 \
  --region=us-central1 \
  --project=broccolli-ai-web
```

### Monitoring

**Logs:**
```bash
gcloud logging read \
  --project=broccolli-ai-web \
  "resource.type=cloud_run_revision AND resource.labels.service_name=broccolli-ai-web" \
  --limit=50 \
  --format=json
```

**Service Status:**
```bash
gcloud run services describe broccolli-ai-web \
  --region=us-central1 \
  --project=broccolli-ai-web
```

---

## Troubleshooting

### Service returns 403 Forbidden

Check IAM bindings:
```bash
gcloud run services get-iam-policy broccolli-ai-web \
  --region=us-central1 \
  --project=broccolli-ai-web
```

Should have: `allUsers` with `roles/run.invoker`

Fix:
```bash
gcloud run services add-iam-policy-binding broccolli-ai-web \
  --region=us-central1 \
  --project=broccolli-ai-web \
  --member=allUsers \
  --role=roles/run.invoker
```

### Static files not serving (404)

Check nginx file permissions in Dockerfile:
```dockerfile
RUN chmod -R 755 /usr/share/nginx/html
```

### Build fails: bun.lock not found

Ensure `bun.lock` is NOT in `.dockerignore`. It's required for `--frozen-lockfile` install.

### Domain mapping failing

Domain must be verified in GCP first:
```bash
# Verify at: https://console.cloud.google.com/run/domains?project=broccolli-ai-web
# Then create mapping:
gcloud beta run domain-mappings create \
  --service=broccolli-ai-web \
  --domain=broccolliai.com \
  --region=us-central1 \
  --project=broccolli-ai-web
```

---

## Cost Optimization

- **Auto-scaling:** Min instances = 0 (costs $0 when idle)
- **Image retention:** 30 days (auto-delete old images in Artifact Registry)
- **Concurrency:** Set to 1000 for static content (requests don't need dedicated CPU)

---

## Related Documentation

- [Domain Mapping Guide](docs/domain-mapping.md)
- [GCP Bootstrap Script](infra/gcp-bootstrap.sh)
- [nginx Configuration](nginx.conf.template)
- [GitHub Actions Workflow](.github/workflows/deploy.yml)
