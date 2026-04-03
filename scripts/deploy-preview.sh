#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

cd "$ROOT_DIR"

mkdir -p public/uploads/homework

npm install
npm run db:generate
npm run db:migrate:deploy
npm run build
npm run prepare:standalone

pm2 startOrRestart ecosystem.config.cjs --update-env
pm2 save
