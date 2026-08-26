#!/usr/bin/env bash
# Run the repository's one configured delivery verification command.

set -uo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT" || exit 2

CONFIG=".factory/gates.conf"
if [ ! -f "$CONFIG" ]; then
  echo "FACTORY_GATE: status=MISCONFIGURED reason=missing-config" >&2
  exit 2
fi

VERIFY_COMMAND=""
# The configuration is human-reviewed repository policy and contains assignments only.
# shellcheck disable=SC1090
source "$CONFIG"

if [ -z "$VERIFY_COMMAND" ] || [ "$VERIFY_COMMAND" = "<VERIFY_COMMAND>" ]; then
  echo "FACTORY_GATE: status=MISCONFIGURED reason=verify-command-not-configured" >&2
  exit 2
fi

echo "FACTORY_GATE: status=RUNNING command=$VERIFY_COMMAND"
set +e
bash -lc "$VERIFY_COMMAND"
status=$?
set -e
if [ "$status" -eq 0 ]; then
  echo "FACTORY_GATE: status=GREEN"
  exit 0
fi

echo "FACTORY_GATE: status=RED exit=$status" >&2
exit 1
