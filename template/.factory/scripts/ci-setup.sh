#!/usr/bin/env bash
# Conservative dependency setup for the stock GitHub workflow. Replace or extend
# this script when the project has a custom toolchain; required gates fail closed.
set -euo pipefail

if [ -f package.json ]; then
  if [ -f pnpm-lock.yaml ]; then corepack enable && pnpm install --frozen-lockfile
  elif [ -f yarn.lock ]; then corepack enable && yarn install --frozen-lockfile
  elif [ -f bun.lockb ] || [ -f bun.lock ]; then command -v bun >/dev/null && bun install --frozen-lockfile
  elif [ -f package-lock.json ]; then npm ci
  else npm install --ignore-scripts; fi
elif [ -f requirements.txt ]; then
  python -m pip install -r requirements.txt
elif [ -f pyproject.toml ]; then
  python -m pip install -e .
elif [ -f Cargo.toml ]; then
  cargo fetch
elif [ -f go.mod ]; then
  go mod download
else
  echo "No supported dependency manifest found; continuing to fail-closed gates."
fi
