---
id: task.125.plan
title: "Implementation Plan: finalise --bug and a tolerant bug issue create"
type: plan
task-ref: task.125.develop-bug-finalise-mode-and-issue-create.md
---

# Implementation Plan: `finalise --bug` and a tolerant bug issue create

> Requirements and success criteria: [task.125.develop-bug-finalise-mode-and-issue-create.md](task.125.develop-bug-finalise-mode-and-issue-create.md)

## Overview

Phase 1 is a mode over an existing skill: read `skills/finalise/SKILL.md` end to end once, tag each
step story/task/bug, and write the skip list from the tags. Phase 2 is two small edits with a fake-`gh` test.

## Phase-by-Phase Implementation Guide

### Phase 1

1. `diff docs/bugs/bug.13*/bug.13.dod.1.*.md docs/bugs/bug.14*/bug.14.dod.1.*.md` — the common
   sections are the template. Save as `skills/finalise/assets/bug-dod-template.md` with the same
   `**Final Status:**`-once rule finalise already enforces (SKILL.md line ~108).
2. In SKILL.md, add a **Document kind** resolution at Step 0: `--bug` flag, else path matches
   `bug\.\d+\.` → print `hint: this is a bug report; run /finalise --bug`, continue as today.
3. Add a table **What bug mode runs and skips** (one place):

   | Step | story/task | bug |
   |---|---|---|
   | AC agent (`finalise-dod-ac-prompt.md`) | run | skip — no ACs; fix-evidence checks instead |
   | Change Log acceptance row | run | **skip — forbidden** (`document-change-log.md` §Exclusions) |
   | `status: accepted` | run | skip — bug-close routine writes `closed` |
   | Sprint review summary | run | skip |
   | `registry-tick.js` | run | skip (returns `not-a-task`) |
   | CI readings 1 + 2, PR canonical comment, tracker `done` comment | run | run |
   | Status History row | — | run via `status-history.js` |

4. Each skipped step's prose gains `**Bug mode:** skipped — see the table`. The test
   (`evals/shared/tests/finalise-bug-mode.test.mjs`) parses the table and asserts every `skip` row's
   step heading carries the marker, and that no `change-log.js`/`upsertChangeLog` call sits in a bug-mode
   path without a skip guard.
5. `develop-bug-step-7-close-bug.md` Part A: invoke `/finalise --bug`; delete the fallback paragraph
   (line ~28) and the checklist line "(or documented inline DoD fallback)".

### Phase 2

`ensure-bug-github-issue` Step B5, before the create:

```bash
# Labels are the repo's convention, not the frontmatter's case; a label the repo lacks is dropped
# with a warning — never allowed to fail the create (obs #65).
REPO_LABELS=$(gh label list --json name -q '.[].name' 2>/dev/null)
LABEL_ARGS=()
for l in "bug" "priority:$(printf '%s' "$PRIORITY" | tr '[:upper:]' '[:lower:]')" \
         "severity:$(printf '%s' "$SEVERITY" | tr '[:upper:]' '[:lower:]')"; do
  if printf '%s\n' "$REPO_LABELS" | grep -qx "$l"; then LABEL_ARGS+=(--label "$l")
  else echo "⚠️  label '$l' not in repo — skipped"; fi
done
```

Severity goes into the body's Metadata table regardless. Check `ensure-task-github-issue` for an
existing lowercase mapping and reuse it if present.

`tracker-issue.js`: in the create/edit failure path, capture `stderr` from the `gh` spawn and put
its first non-empty line into the warning: `create a GitHub issue failed — gh: could not add label:
'severity:Major' not found (argv: …)`. Test with a `gh` shim on `PATH` that exits 1 with that line.

## Key Patterns and References

- Skip-list-as-table with a test that reads the table: the enumeration rule in `docs/reference/anti-patterns.md`.
- `status-history.js` is the bug counterpart of `change-log.js`; bug reports never carry a Change Log.
- Fake-`gh` tests: `shared/resources/tests/gh-stage.test.mjs` has the shim pattern.

## Testing Approach

`npm test`; a scratch-clone run of `/finalise --bug` on bug.14; a fake-`gh` create with lowercase-only labels.
