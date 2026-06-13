# Claude Code Tooling — Reference

Detailed reference for the AI-assisted development setup in this repo: the behavior rules, the per-folder context tree, the skills, and the hook that ties them together. Brief version lives in [`README.md`](../README.md#ai-assisted-development-setup).

Sources this is built on:
- [multica-ai/andrej-karpathy-skills](https://github.com/multica-ai/andrej-karpathy-skills) — coding behavior guidelines
- [agent0ai/dox](https://github.com/agent0ai/dox) — self-documenting `AGENTS.md` convention
- [mattpocock/skills](https://github.com/mattpocock/skills) — the `grill-me` skill

---

## The layers

| Layer | File(s) | Loaded | Purpose |
|---|---|---|---|
| Behavior rules | `CLAUDE.md` (root) | Always, every session | The 4 Karpathy principles + pointer to the AGENTS.md tree |
| Per-folder context | `AGENTS.md` (root + `app/`, `app/api/`, `lib/`, `components/`) | On-demand via the hook | Local "contracts" for each durable boundary |
| Skills | `.claude/skills/{karpathy-guidelines,grill-me}/SKILL.md` | Invoked on match / `/name` | Reusable behaviors |
| Enforcement | `.claude/hooks/inject-agents-md.sh` + `.claude/settings.json` | `PreToolUse` on every edit | Injects the relevant AGENTS.md before an edit |

### CLAUDE.md
Always-on memory. Carries the four principles (Think Before Coding · Simplicity First · Surgical Changes · Goal-Driven Execution) plus a pointer telling the agent to walk the AGENTS.md tree.

### AGENTS.md tree (DOX)
A hierarchy of "contracts." The root holds project-wide rules + a child index; child docs cover **durable boundaries** only (a folder with its own purpose/rules). Rule of thumb: **never copy the same content into every folder** — child docs add *local* signal. Standard sections: Purpose, Local Contracts, Work Guidance, Verification, Child Index.

Walk/update protocol:
1. Before editing, read root `AGENTS.md`, then walk down to the file's folder — nearest doc wins.
2. After a meaningful change, update the affected `AGENTS.md`.
3. New durable boundary (e.g. `app/t/[slug]/`, `api/v1/`) → add a child doc + register it in the parent index.

### Skills
- `karpathy-guidelines` — surfaced when writing/reviewing/refactoring code.
- `grill-me` — hard, grounded design-review interrogation. Invoke with `/grill-me [target]`.

---

## The hook

`.claude/settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write|MultiEdit",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$CLAUDE_PROJECT_DIR/.claude/hooks/inject-agents-md.sh\" 2>/dev/null || true",
            "statusMessage": "Loading AGENTS.md contracts..."
          }
        ]
      }
    ]
  }
}
```

What the script does (`.claude/hooks/inject-agents-md.sh`):
1. Reads the `PreToolUse` JSON on stdin, extracts `.tool_input.file_path`.
2. Finds the git root for that file (`git rev-parse --show-toplevel`).
3. Walks root → the file's directory, collecting every `AGENTS.md` on the path.
4. Emits them as `hookSpecificOutput.additionalContext` so they enter the agent's context before the edit.
5. Writes a `/tmp` marker keyed on `session_id` + dir-set to skip re-injecting the same set within a session.

Safe no-op if the file isn't in a git repo or no `AGENTS.md` exists on the path.

---

## Global vs repo-local

The same setup is installed **globally** in `~/.claude/` so it applies to *all* projects:

| Global path | Notes |
|---|---|
| `~/.claude/CLAUDE.md` | Karpathy principles + **generic** DOX convention (no project specifics) |
| `~/.claude/skills/{karpathy-guidelines,grill-me}/` | Available in every project |
| `~/.claude/hooks/inject-agents-md.sh` | Generic (derives git root) |
| `~/.claude/settings.json` | `PreToolUse` hook merged in; points at `$HOME/.claude/hooks/...` |

Repo-local copies under `first_app/.claude` and `first_app/AGENTS.md` are kept intentionally so the convention ships to anyone who clones the repo. Claude Code **merges** hooks across settings sources (project + user), so in this repo both the global and repo hook fire — see Known Limitations.

### Reproduce the global install

```bash
mkdir -p ~/.claude/skills/karpathy-guidelines ~/.claude/skills/grill-me ~/.claude/hooks
cp .claude/skills/karpathy-guidelines/SKILL.md ~/.claude/skills/karpathy-guidelines/
cp .claude/skills/grill-me/SKILL.md          ~/.claude/skills/grill-me/
cp .claude/hooks/inject-agents-md.sh         ~/.claude/hooks/
chmod +x ~/.claude/hooks/inject-agents-md.sh
# Then add the PreToolUse hook to ~/.claude/settings.json with the command:
#   bash "$HOME/.claude/hooks/inject-agents-md.sh" 2>/dev/null || true
# (merge into the existing JSON — do not overwrite theme/model/etc.)
```
Write a global `~/.claude/CLAUDE.md` with the four principles + a *generic* AGENTS.md section (strip project specifics).

---

## Verify it works

The hook loads at **session start**, so it is not active in the session that creates it. Test from a fresh session.

```bash
# 1. Run the wired command exactly as Claude Code does, on a real payload:
echo '{"session_id":"t","tool_name":"Edit","tool_input":{"file_path":"'"$PWD"'/lib/db.ts"}}' \
  | bash "$HOME/.claude/hooks/inject-agents-md.sh" \
  | jq -r '.hookSpecificOutput.additionalContext' | grep '====='
# expect: ===== AGENTS.md =====  and  ===== lib/AGENTS.md =====

# 2. Validate the settings JSON + hook schema:
jq -e '.hooks.PreToolUse[]|select(.matcher=="Edit|Write|MultiEdit")|.hooks[].command' .claude/settings.json

# 3. End-to-end in a real new session (detects the /tmp marker the hook writes):
ls /tmp/claude-agentsmd-* 2>/dev/null            # baseline
claude -p "Create a file _probe.txt with the line: probe. Then stop." --permission-mode acceptEdits
find /tmp -maxdepth 1 -name 'claude-agentsmd-*' -mmin -2   # a marker with a session-UUID == hook fired
rm -f _probe.txt /tmp/claude-agentsmd-*          # cleanup
```

---

## Known limitations

Honest list — these are real and were surfaced in review. Do not assume the setup is bulletproof.

1. **Session dedup vs. context eviction.** The hook injects each dir-set once per session. Long sessions get compacted, dropping the AGENTS.md from context — and the marker prevents re-injection. So in long sessions the contract can silently leave context. Fix options: drop the dedup (re-inject; it's cheap text) or reset the marker on compaction.
2. **Silent failure.** The command ends in `2>/dev/null || true`. If the script breaks (e.g. `jq` missing), it injects nothing with no signal — false confidence that the tree is enforced.
3. **Double-fire in this repo.** Global + repo hooks both fire here (Claude Code merges hook sources). The shared marker prevents double-injection only while both script copies are identical; they can drift.
4. **Proves firing, not compliance.** The marker proves the AGENTS.md was *injected*, not that the agent *read or followed* it. Enforcement guarantees visibility, not obedience.
5. **Committed hook = execution surface.** A `PreToolUse` hook in a committed `.claude/settings.json` runs a repo script on a contributor's machine when they edit during review. Weigh this for public repos / untrusted PRs.
6. **Global opinion everywhere.** `~/.claude/CLAUDE.md` loads in every project, including ones where "caution over speed" or the DOX section don't apply.
7. **Marker litter.** `/tmp/claude-agentsmd-*` accumulates and is never auto-cleaned.
