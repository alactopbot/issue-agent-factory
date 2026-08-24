#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

while IFS= read -r script; do bash -n "$script"; done < <(find . -type f -name '*.sh' -not -path './.git/*' | sort)
while IFS= read -r json; do python3 -m json.tool "$json" >/dev/null; done < <(find template -type f -name '*.json' | sort)

for test_script in tests/test-*.sh; do
  printf '\n==> %s\n' "$test_script"
  bash "$test_script"
done

printf '\n==> node protocol tests\n'
node --test tests/*.test.mjs
printf '\nAll Issue Agent Factory tests passed.\n'
