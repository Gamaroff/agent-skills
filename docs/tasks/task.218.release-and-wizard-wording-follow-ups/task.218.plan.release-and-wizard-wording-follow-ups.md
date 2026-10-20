---
id: task.218.plan
title: "Implementation Plan: Release runbook and setup wizard wording follow-ups"
type: plan
task-ref: task.218.release-and-wizard-wording-follow-ups.md
---

# Implementation Plan: Release runbook and setup wizard wording follow-ups

> Requirements and success criteria: [task.218.release-and-wizard-wording-follow-ups.md](task.218.release-and-wizard-wording-follow-ups.md)

## Overview

Five text edits in three files, plus a changelog entry. Find each site by the quoted text, because line numbers drift.

## Phase-by-Phase Implementation Guide

### Phase 1: Release runbook §4

**File**: `docs/runbooks/release-and-install.md`, section `### 4. Sync \`develop\` forward`.

**QA-9.** Replace the opening sentence:

```markdown
Otherwise `--tag` has already merged `main` into `develop` and pushed it. Run this step only if you passed `--no-sync-develop`:
```

with:

```markdown
Run this step only if you passed `--no-sync-develop`; otherwise `--tag` has already merged `main` into `develop` and pushed it:
```

**QA-8.** End both recovery bullets on `main`, as `release.sh` does (`git checkout main` closes its `# ── 5. sync develop` block):

```markdown
- **Merge conflict** (the merge is half done): resolve the conflicts, `git commit`, `git push origin develop`, then `git checkout main`.
- **Push rejected** (someone pushed to `develop` meanwhile): `git pull --no-rebase`, `git push origin develop`, then `git checkout main`. A rebasing pull would drop the merge commit.
```

Leave the third bullet (`git pull --rebase` failed) alone. It sends the reader back to the manual block, and that block runs before any checkout back.

**Optional, same section:** the manual block (`git checkout develop && git pull --rebase` / `git merge main && git push`) also leaves the reader on `develop`. Add `git checkout main` as its last line only if the reviewer agrees. It is the same defect, but gate 4 did not name it.

### Phase 2: Setup wizard text

**File**: `scripts/setup-consumer.sh`.

**QA-10.** In `print_summary`, the shared line after the `approve`/`else` branch:

```bash
echo "  Later, /tracker-reconcile re-reads the board and ticks that checklist."
```

becomes:

```bash
echo "  Later, /tracker-reconcile re-reads the board and ticks the committed *.handover.*.md checklist."
```

If that line is over 100 columns in the rendered output, split it across two `echo` lines in the same style as the `approve` branch above it.

**Banners.** Change the comment lines only, and keep each banner's `─` padding to the same total width as its neighbours:

| From | To |
| --- | --- |
| `# ── 2a. skill install profile ──…` | `# ── 2b. skill install profile ──…` |
| `# ── 2b. tracker access level ──…` | `# ── 2. tracker access level ──…` |
| `# ── 5b. tracker-workflow.yaml ──…` | `# ── 8a. tracker-workflow.yaml ──…` |
| `# ── 8b. install profiles (task 84) ──…` | `# ── install profile helpers (task 84) ──…` |
| `# ── agent links ──…` | `# ── 8b. agent links ──…` |

**Header.** In the `# Covers (numbering matches …)` list, insert after step 2:

```bash
#   2b. Skill install profile     (full / pipeline / minimal, plus add-ons)
```

Before editing, re-run `git grep -n "ticks that checklist\|2a. skill install\|5b. tracker-workflow\|8b. install profiles"`. At `9067ba92` it hits only `scripts/setup-consumer.sh`. Update any new hit in the same commit.

### Phase 3: restricted-access.md and the changelog

**File**: `docs/concepts/restricted-access.md`.

- Limits item 2: `**Without a tty it degrades to \`command\`**` becomes `**Without a tty, or in an autonomous run, it degrades to \`command\`**`.
- Mode table, `approve` row, last cell: `md + sh + summary on a tty; degrades to \`command\` (sh only) without one` becomes `md + sh + summary on a tty; degrades to \`command\` (sh only) without one or in an autonomous run`.

**File**: `CHANGELOG.md`, under `## [Unreleased]` › `### Fixed`. Use the same short form as the task 196–199 entries:

```markdown
- **Release runbook and setup wizard wording (task 218).** The release runbook's develop-sync
  section opens with its condition, and its recoveries end on `main` as `release.sh` does. The
  setup wizard's summary names the `*.handover.*.md` checklist `/tracker-reconcile` ticks, and its
  section banners use the step numbers in getting-started. restricted-access.md names the
  autonomous-run fallback for `approve`.
```

## Key Patterns and References

- Gate 4's suggested wording for QA-9 and QA-10 is in its `top_issues[].suggested_action`. This plan follows it.
- `which-access.md:51` already has the autonomous-run wording. Match its sense, not its exact words: restricted-access.md's sentence shape is different.

## Testing Approach

1. `bash -n scripts/setup-consumer.sh && shellcheck scripts/setup-consumer.sh`
2. The rendered summary for `approve` and `command` (task §8 command), run from the scratchpad, not from the repository root
3. `command node shared/resources/doc-links.js --file docs/runbooks/release-and-install.md` and the same for `docs/concepts/restricted-access.md`
4. `npm run ci:fast`, then `npm run ci` before the PR
