#!/bin/bash
# One-time GCP setup for broccolli.ai Cloud Run deployment
# Prerequisites: gcloud auth login, gcloud auth application-default login
# Usage: BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX GITHUB_REPO=elmanGSB/broccoli-ai-website bash infra/gcp-bootstrap.sh
set -euo pipefail

PROJECT_ID="broccolli-ai-web"
REGION="us-central1"
REPO_NAME="broccolli-ai"
SA_NAME="github-actions-deploy"
SA_RUNTIME_NAME="cloudrun-runtime"
GITHUB_REPO="${GITHUB_REPO:?Set GITHUB_REPO=owner/repo}"

echo "==> Creating project $PROJECT_ID"
gcloud projects create "$PROJECT_ID" --name="Broccolli AI Website" 2>/dev/null || echo "Project already exists"
gcloud config set project "$PROJECT_ID"

echo "==> Linking billing"
gcloud billing projects link "$PROJECT_ID" --billing-account="${BILLING_ACCOUNT:?Set BILLING_ACCOUNT}"

echo "==> Enabling APIs"
gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sts.googleapis.com

echo "==> Creating Artifact Registry"
gcloud artifacts repositories create "$REPO_NAME" \
  --repository-format=docker \
  --location="$REGION" \
  --description="Docker images for broccolli.ai" 2>/dev/null || echo "Repository already exists"

# Image retention: auto-delete images older than 30 days
gcloud artifacts repositories set-cleanup-policies "$REPO_NAME" \
  --project="$PROJECT_ID" \
  --location="$REGION" \
  --policy='[{"name":"delete-old","action":{"type":"Delete"},"condition":{"olderThan":"30d"}}]'

echo "==> Creating service accounts"
gcloud iam service-accounts create "$SA_NAME" \
  --display-name="GitHub Actions Deploy" \
  --project="$PROJECT_ID" 2>/dev/null || echo "SA already exists"

gcloud iam service-accounts create "$SA_RUNTIME_NAME" \
  --display-name="Cloud Run Runtime (no permissions)" \
  --project="$PROJECT_ID" 2>/dev/null || echo "Runtime SA already exists"

SA_EMAIL="${SA_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"
SA_RUNTIME_EMAIL="${SA_RUNTIME_NAME}@${PROJECT_ID}.iam.gserviceaccount.com"

echo "==> Granting IAM roles to deploy SA"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.writer"

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/run.developer"

# Scope iam.serviceAccountUser to runtime SA only (prevents privilege escalation)
gcloud iam service-accounts add-iam-policy-binding \
  "$SA_RUNTIME_EMAIL" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/iam.serviceAccountUser"

echo "==> Setting up Workload Identity Federation"
gcloud iam workload-identity-pools create "github-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="GitHub Actions Pool" 2>/dev/null || echo "WIF pool already exists"

POOL_ID=$(gcloud iam workload-identity-pools describe "github-pool" \
  --project="$PROJECT_ID" \
  --location="global" \
  --format="value(name)")

gcloud iam workload-identity-pools providers create-oidc "github-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --display-name="GitHub OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.actor=assertion.actor" \
  --attribute-condition="assertion.repository == '${GITHUB_REPO}'" \
  --issuer-uri="https://token.actions.githubusercontent.com" 2>/dev/null || echo "WIF provider already exists"

# Allow WIF pool to impersonate deploy SA (scoped to this repo only)
gcloud iam service-accounts add-iam-policy-binding \
  "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/${POOL_ID}/attribute.repository/${GITHUB_REPO}"

WIF_PROVIDER=$(gcloud iam workload-identity-pools providers describe "github-provider" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="github-pool" \
  --format="value(name)")

echo ""
echo "✅ Setup complete! Add these GitHub repository secrets:"
echo ""
echo "  WIF_PROVIDER         → ${WIF_PROVIDER}"
echo "  WIF_SERVICE_ACCOUNT  → ${SA_EMAIL}"
echo "  GCP_PROJECT_ID       → ${PROJECT_ID}"
echo ""
echo "  Image registry: ${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPO_NAME}"
echo ""
echo "  (Optional — only if different from Dockerfile defaults:)"
echo "  PUBLIC_BROCCOLI_API, PUBLIC_FORMSPREE_URL, PUBLIC_CAL_URL"
