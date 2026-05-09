#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

echo "==> Pulling latest code..."
git pull origin main

echo "==> Building and starting containers..."
docker compose build
docker compose up -d

echo "==> Running migrations..."
docker compose exec web node scripts/run-migrations.mjs || true

echo "==> Checking health..."
sleep 5
curl -sf https://bezpitcha.ru/api/health || echo "⚠️  Health check failed — check logs"

echo "==> Done!"
