#!/usr/bin/env bash
# PreToolUse hook (Edit|Write|MultiEdit): inject the AGENTS.md contracts that
# apply to the file being edited, walking repo-root -> file's directory.
# Emits the collected docs as additionalContext so local rules are read first.
# Injects each dir-set at most once per session to avoid context bloat.
set -euo pipefail

input=$(cat)
file=$(printf '%s' "$input" | jq -r '.tool_input.file_path // empty')
[ -n "$file" ] || exit 0

dir=$(dirname "$file")
root=$(git -C "$dir" rev-parse --show-toplevel 2>/dev/null || true)
[ -n "$root" ] || exit 0

# Ordered list of dirs from repo root down to the file's directory.
dirs=("$root")
rel=${dir#"$root"}; rel=${rel#/}
cur="$root"
if [ -n "$rel" ]; then
  IFS='/' read -ra parts <<< "$rel"
  for p in "${parts[@]}"; do
    [ -n "$p" ] || continue
    cur="$cur/$p"
    dirs+=("$cur")
  done
fi

# Collect AGENTS.md along the path.
collected=""
present=""
for d in "${dirs[@]}"; do
  f="$d/AGENTS.md"
  if [ -f "$f" ]; then
    present+="${f}\n"
    collected+=$'\n\n===== '"${f#"$root"/}"$' =====\n'
    collected+=$(cat "$f")
  fi
done
[ -n "$collected" ] || exit 0

# Once-per-session-per-dirset guard: skip if we've already injected this exact set.
session=$(printf '%s' "$input" | jq -r '.session_id // "nosession"')
key=$(printf '%s|%s' "$session" "$present" | cksum | cut -d' ' -f1)
marker="${TMPDIR:-/tmp}/claude-agentsmd-${session}-${key}"
[ -e "$marker" ] && exit 0
: > "$marker" 2>/dev/null || true

jq -n --arg ctx "Local AGENTS.md contracts for ${file} — read before editing:${collected}" \
  '{hookSpecificOutput: {hookEventName: "PreToolUse", additionalContext: $ctx}}'
