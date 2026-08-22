#!/usr/bin/env bash
set -e
npm ci
npm run check
npm run migrate
echo "Al-Shamil Vault checks passed."
