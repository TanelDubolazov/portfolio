#!/usr/bin/env bash
set -euo pipefail

# Deploy portfolio to S3 + invalidate CloudFront cache
# Usage: ./deploy.sh

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
INFRA_DIR="$SCRIPT_DIR"

# Read Terraform outputs
BUCKET=$(cd "$INFRA_DIR" && terraform output -raw s3_bucket_name)
DIST_ID=$(cd "$INFRA_DIR" && terraform output -raw cloudfront_distribution_id)

echo "==> Building site..."
cd "$PROJECT_ROOT"
npm run build

echo "==> Syncing dist/ to s3://$BUCKET ..."
aws s3 sync dist/ "s3://$BUCKET" --delete

echo "==> Invalidating CloudFront cache..."
aws cloudfront create-invalidation \
  --distribution-id "$DIST_ID" \
  --paths "/*" \
  --output text

echo "==> Done! Site deployed."
