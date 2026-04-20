# Domain Mapping for broccolli.ai

This guide walks through setting up the custom domain `broccolli.ai` for Cloud Run.

**Prerequisites:**
- ✅ Cloud Run service `broccolli-ai-web` deployed in GCP project `broccolli-ai-web`
- ✅ GitHub Actions CI/CD configured and tested (first deployment complete)

---

## Step 1: Verify Domain Ownership in Google Search Console

Google Search Console requires proof of domain ownership before issuing SSL certificates and mapping the domain.

**Instructions:**

1. Go to: https://search.google.com/search-console
2. Click **"Add property"**
3. Select **"Domain"** (not URL prefix)
4. Enter: `broccolli.ai`
5. Click **"Continue"**
6. Google will provide a **DNS TXT record** to add at your registrar (format: `google-site-verification=abc123...`)
7. Copy the TXT record value
8. Log into your domain registrar (GoDaddy, Namecheap, etc.)
9. Add a new DNS TXT record with:
   - **Name:** `broccolli.ai` (or `@` depending on registrar)
   - **Value:** `google-site-verification=abc123...` (the value from Search Console)
10. Wait 5-10 minutes for DNS propagation
11. Return to Search Console and click **"Verify"**

Once verified, you should see a green checkmark in Search Console.

---

## Step 2: Create Domain Mapping in Cloud Run

Once ownership is verified, use gcloud to create the domain mapping:

```bash
gcloud run domain-mappings create \
  --service=broccolli-ai-web \
  --domain=broccolli.ai \
  --region=us-central1 \
  --project=broccolli-ai-web
```

**Output example:**
```
Creating domain mapping...
Created domain mapping [broccolli.ai].

Add the following DNS records to your domain registrar:

NAME                  TYPE  DATA
broccolli.ai          A     216.239.32.21
broccolli.ai          A     216.239.34.21
broccolli.ai          A     216.239.36.21
broccolli.ai          A     216.239.38.21
broccolli.ai          AAAA  2001:4860:4802:32::15
```

**Save these DNS records** — you'll need them in Step 3.

---

## Step 3: Update DNS Records at Registrar

Google provides both **A records** (IPv4) and **AAAA records** (IPv6) for apex domain `broccolli.ai`.

**Do NOT use CNAME for apex domains** — only use A/AAAA records.

**Instructions:**

1. Log into your domain registrar
2. Navigate to DNS settings for `broccolli.ai`
3. **Remove any existing A or AAAA records** pointing to old servers
4. **Add all A records** from the gcloud output:
   ```
   broccolli.ai  A  216.239.32.21
   broccolli.ai  A  216.239.34.21
   broccolli.ai  A  216.239.36.21
   broccolli.ai  A  216.239.38.21
   ```
5. **Add the AAAA record**:
   ```
   broccolli.ai  AAAA  2001:4860:4802:32::15
   ```
6. **Wait 15-30 minutes** for DNS propagation (varies by registrar)

**Verification:** Use `nslookup` to check DNS is resolving:
```bash
nslookup broccolli.ai
# Should show: 216.239.32.21, 216.239.34.21, etc.
```

---

## Step 4: Verify Domain Mapping is Active

Check the status of your domain mapping:

```bash
gcloud run domain-mappings describe \
  --domain=broccolli.ai \
  --region=us-central1 \
  --project=broccolli-ai-web \
  --format='value(status.conditions[0].status,status.conditions[0].type)'
```

**Output:**
- `True CertificateProvisioned` — ✅ **Ready!** SSL cert issued, domain is live
- `False CertificateProvisioned` — ⏳ Still in progress (wait 15-30 min, then retry)
- Error — Check Step 3 (DNS records may not have propagated)

---

## Step 5: Test the Domain

Once the domain mapping is active:

```bash
curl -I https://broccolli.ai

# Expected output:
# HTTP/2 200
# cache-control: public, max-age=3600
# content-type: text/html; charset=utf-8
```

If you get `curl: (7) Failed to connect to broccolli.ai port 443: Connection refused`, DNS hasn't propagated yet — wait a bit longer.

---

## Troubleshooting

**Problem: Domain mapping stuck on "CertificateProvisioning"**
- DNS records may not have propagated
- Run `nslookup broccolli.ai` to verify A/AAAA records resolve
- Wait 30-60 minutes (Google's cert provisioning can be slow)

**Problem: curl gives "connection refused"**
- DNS may not have propagated globally
- Try: `curl -I https://broccolli.ai` with `-v` flag for verbose output
- Wait another 10-15 minutes

**Problem: SSL certificate error ("untrusted certificate")**
- The cert is still provisioning
- Check status with Step 4 command
- Wait 15-30 minutes and retry

**Problem: "Domain already exists" error on `domain-mappings create`**
- The mapping already exists
- Update it instead: `gcloud run domain-mappings update --service=...`
- Or delete and recreate: `gcloud run domain-mappings delete broccolli.ai`

---

## References

- [Cloud Run Custom Domains](https://cloud.google.com/run/docs/mapping-custom-domains)
- [DNS A and AAAA Records](https://cloud.google.com/dns/docs/records-naming-conventions)
- [Google Search Console](https://search.google.com/search-console)
