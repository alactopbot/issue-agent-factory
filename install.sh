#!/usr/bin/env bash
# 将 Issue Agent Factory 模板安装到目标 Git 仓库。
# 不覆盖已有文件；重复运行安全。

set -euo pipefail

SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/template" && pwd)"
DRY=0
TARGET=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY=1 ;;
    -h|--help)
      echo "用法: ./install.sh [--dry-run] [目标仓库]"
      exit 0
      ;;
    -*) echo "error: unknown option: $arg" >&2; exit 2 ;;
    *)
      [ -z "$TARGET" ] || { echo "error: specify one target directory" >&2; exit 2; }
      TARGET="$arg"
      ;;
  esac
done

TARGET="${TARGET:-$PWD}"
[ -d "$TARGET" ] || { echo "error: no such directory: $TARGET" >&2; exit 1; }
TARGET="$(cd "$TARGET" && pwd)"

git -C "$TARGET" rev-parse --git-dir >/dev/null 2>&1 || {
  echo "warning: $TARGET is not a git repository; GitHub-driven recovery requires one." >&2
}

echo "Issue Agent Factory -> $TARGET"
[ "$DRY" -eq 1 ] && echo "(dry run)"
echo

COPIED=0
SKIPPED=0
copy_file() {
  local rel="$1" src="$SRC/$1" dst="$TARGET/$1"
  if [ -e "$dst" ]; then
    printf '  skip    %s (exists)\n' "$rel"
    SKIPPED=$((SKIPPED + 1))
    return
  fi
  printf '  create  %s\n' "$rel"
  COPIED=$((COPIED + 1))
  [ "$DRY" -eq 1 ] && return
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
}

while IFS= read -r rel; do
  copy_file "$rel"
done < <(cd "$SRC" && find . -type f | sed 's|^\./||' | sort)

if [ "$DRY" -eq 0 ]; then
  for path in \
    .factory/hooks/block-merge.sh \
    .factory/scripts/bootstrap-github.sh \
    .factory/scripts/claim.sh \
    .factory/scripts/ci-setup.sh \
    .factory/scripts/doctor.sh \
    .factory/scripts/gates.sh \
    .factory/scripts/prove-test.sh \
    .factory/scripts/validate-pr-gates.mjs; do
    chmod +x "$TARGET/$path" 2>/dev/null || true
  done
fi

cat <<'EOF'

下一步：

  1. 填写 .factory/project.json、docs/factory/CHARTER.md 和 AGENTS.md。
  2. 按项目调整 .factory/gates.conf 与 .factory/scripts/ci-setup.sh。
  3. 运行 ./.factory/scripts/doctor.sh 和 ./.factory/scripts/gates.sh full。
  4. 运行 ./.factory/scripts/bootstrap-github.sh --apply。
  5. 提交并推送，在 GitHub 保护默认分支并要求 Factory Gates 检查。
  6. 用一个真实普通 Issue 完成首次 Draft/Ready 校准。

详细说明见 GETTING_STARTED.md（框架仓库）和 docs/factory/README.md（目标项目）。
EOF

echo
echo "created: $COPIED   skipped: $SKIPPED"

if ! grep -q 'docs/factory/CONTRACT.md' "$TARGET/AGENTS.md" 2>/dev/null; then
  echo "warning: existing AGENTS.md was preserved but lacks the Factory entrypoint; merge template/AGENTS.md manually." >&2
fi
