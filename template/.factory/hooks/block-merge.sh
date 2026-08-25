#!/usr/bin/env bash
# block-merge.sh - defense-in-depth checks for factory shell commands.
#
# This catches common shell routes to merging or bypassing factory policy. It is
# not the enforcement boundary: tool hooks cannot cover every hosted/API path.
# Protect the default branch with a GitHub ruleset and do not grant agents bypass.
#
# Wired through the optional runtime adapter in .codex/hooks.json.
# Reads the tool call as JSON on stdin. Exit 2 blocks the call and returns
# stderr to the agent as feedback.

set -uo pipefail

INPUT="$(cat)"

# Extract the command without requiring jq (cloud sessions have jq, but a
# local machine might not, and this hook must never be the thing that breaks).
if command -v jq >/dev/null 2>&1; then
  CMD="$(printf '%s' "$INPUT" | jq -r '.tool_input.command // empty')"
else
  CMD="$(printf '%s' "$INPUT" | sed -n 's/.*"command"[[:space:]]*:[[:space:]]*"\(.*\)".*/\1/p')"
fi

[ -z "$CMD" ] && exit 0

block() {
  echo "BLOCKED by factory hook: $1" >&2
  echo "" >&2
  echo "The merge decision belongs to a human. See docs/factory/CHARTER.md." >&2
  echo "Open a PR and stop; do not attempt an alternative route to merging." >&2
  exit 2
}

# Inspect shell words rather than matching arbitrary text in the complete tool
# input. This keeps commands named in an Issue, PR, or comment body from being
# mistaken for commands that the shell will execute.
PROTECTED_BRANCH='^(main|master|develop|production)$'
PROTECTED_DEST='push([^;&|]*[[:space:]])\+?([^;&|[:space:]]*:)?(refs/heads/)?(main|master|develop|production)([[:space:]]|$)'

inspect_tokens() {
  local words=("$@") index=0 executable subcommand subcommand_index segment current_branch argument
  local git_options=()
  [ "${#words[@]}" -gt 0 ] || return

  # Skip simple environment assignments and common execution prefixes.
  while [ "$index" -lt "${#words[@]}" ] && [[ "${words[$index]}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; do
    index=$((index + 1))
  done
  [ "$index" -lt "${#words[@]}" ] || return
  executable="${words[$index]##*/}"
  while true; do
    case "$executable" in
      command|builtin|exec)
        index=$((index + 1))
        ;;
      env)
        index=$((index + 1))
        while [ "$index" -lt "${#words[@]}" ] && \
          { [[ "${words[$index]}" = -* ]] || [[ "${words[$index]}" =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; }; do
          index=$((index + 1))
        done
        ;;
      sudo)
        index=$((index + 1))
        while [ "$index" -lt "${#words[@]}" ] && [[ "${words[$index]}" = -* ]]; do
          index=$((index + 1))
        done
        ;;
      *) break ;;
    esac
    [ "$index" -lt "${#words[@]}" ] || return
    executable="${words[$index]##*/}"
  done

  # Preserve detection through the common `bash -lc '<command>'` wrapper while
  # still treating its quoted payload as shell code rather than ordinary text.
  if [ "$executable" = "bash" ] || [ "$executable" = "sh" ] || [ "$executable" = "zsh" ]; then
    local shell_index
    for ((shell_index = index + 1; shell_index < ${#words[@]}; shell_index++)); do
      case "${words[$shell_index]}" in
        -c|-lc|-cl)
          [ $((shell_index + 1)) -lt "${#words[@]}" ] && scan_command "${words[$((shell_index + 1))]}"
          return
          ;;
      esac
    done
  fi

  if [ "$executable" = "gh" ]; then
    if [ "${words[$((index + 1))]:-}" = "pr" ] && [ "${words[$((index + 2))]:-}" = "merge" ]; then
      block "gh pr merge"
    fi
    if [ "${words[$((index + 1))]:-}" = "api" ]; then
      segment="${words[*]:$((index + 2))}"
      if printf '%s' "$segment" | grep -qE 'mergePullRequest|/pulls/[^[:space:]]+/merge([?[:space:]]|$)'; then
        block "GitHub merge API"
      fi
    fi
    return
  fi

  if [ "$executable" = "curl" ]; then
    segment="${words[*]:$((index + 1))}"
    if printf '%s' "$segment" | grep -qE '/pulls/[^[:space:]]+/merge([?[:space:]]|$)'; then
      block "GitHub merge API"
    fi
    return
  fi

  [ "$executable" = "git" ] || return
  subcommand_index=$((index + 1))
  while [ "$subcommand_index" -lt "${#words[@]}" ]; do
    argument="${words[$subcommand_index]}"
    case "$argument" in
      -C|-c|--git-dir|--work-tree)
        git_options+=("$argument")
        subcommand_index=$((subcommand_index + 1))
        [ "$subcommand_index" -lt "${#words[@]}" ] || return
        git_options+=("${words[$subcommand_index]}")
        ;;
      --git-dir=*|--work-tree=*|-*) git_options+=("$argument") ;;
      *) break ;;
    esac
    subcommand_index=$((subcommand_index + 1))
  done
  [ "$subcommand_index" -lt "${#words[@]}" ] || return
  subcommand="${words[$subcommand_index]}"

  if [ "$subcommand" = "merge" ]; then
    local merge_index
    for ((merge_index = subcommand_index + 1; merge_index < ${#words[@]}; merge_index++)); do
      case "${words[$merge_index]}" in --abort|--quit) return ;; esac
    done
    current_branch="$(git "${git_options[@]}" branch --show-current 2>/dev/null || true)"
    if printf '%s' "$current_branch" | grep -qE "$PROTECTED_BRANCH"; then
      block "git merge on protected branch $current_branch"
    fi
    return
  fi

  [ "$subcommand" = "push" ] || return
  local push_index
  for ((push_index = subcommand_index + 1; push_index < ${#words[@]}; push_index++)); do
    case "${words[$push_index]}" in
      --force|--force=*|--force-with-lease|--force-with-lease=*|--force-if-includes|-f)
        block "force push"
        ;;
      +?*) block "force push (+refspec)" ;;
    esac
  done

  # The destination of a refspec matters. This covers optional source halves
  # and refs/heads prefixes, including deletion pushes to protected branches.
  segment="${words[*]:$subcommand_index}"
  if printf '%s' "$segment" | grep -qE "$PROTECTED_DEST"; then
    block "push to a protected branch"
  fi
  current_branch="$(git "${git_options[@]}" branch --show-current 2>/dev/null || true)"
  if printf '%s' "$segment" | grep -qE '^push([[:space:]]+[^[:space:]]+)?[[:space:]]*$' && \
     printf '%s' "$current_branch" | grep -qE "$PROTECTED_BRANCH"; then
    block "push from a protected branch"
  fi
}

scan_command() {
  local source="$1" quote="" word="" char escaped=0 in_word=0 index
  local words=()

  for ((index = 0; index < ${#source}; index++)); do
    char="${source:index:1}"
    if [ "$escaped" -eq 1 ]; then
      word="${word}${char}"; in_word=1; escaped=0; continue
    fi
    if [ "$quote" = "single" ]; then
      if [ "$char" = "'" ]; then quote=""; else word="${word}${char}"; fi
      in_word=1; continue
    fi
    if [ "$quote" = "double" ]; then
      if [ "$char" = '"' ]; then quote=""
      elif [ "$char" = "\\" ]; then escaped=1
      else word="${word}${char}"; fi
      in_word=1; continue
    fi
    case "$char" in
      "\\") escaped=1; in_word=1 ;;
      "'") quote="single"; in_word=1 ;;
      '"') quote="double"; in_word=1 ;;
      ' '|$'\t')
        if [ "$in_word" -eq 1 ]; then words+=("$word"); word=""; in_word=0; fi
        ;;
      ';'|'|'|'&'|'('|')'|$'\n')
        if [ "$in_word" -eq 1 ]; then words+=("$word"); word=""; in_word=0; fi
        inspect_tokens "${words[@]}"
        words=()
        ;;
      *) word="${word}${char}"; in_word=1 ;;
    esac
  done
  [ "$in_word" -eq 1 ] && words+=("$word")
  inspect_tokens "${words[@]}"
}

scan_command "$CMD"

exit 0
