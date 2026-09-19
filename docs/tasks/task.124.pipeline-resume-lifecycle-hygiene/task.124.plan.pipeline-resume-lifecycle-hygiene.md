---
id: task.124.plan
title: "Implementation Plan: pipeline resume lifecycle hygiene"
type: plan
task-ref: task.124.pipeline-resume-lifecycle-hygiene.md
---

# Implementation Plan: pipeline resume lifecycle hygiene

> Requirements and success criteria: [task.124.pipeline-resume-lifecycle-hygiene.md](task.124.pipeline-resume-lifecycle-hygiene.md)

## Overview

Seven small mechanisms, four phases, no shared state between them beyond the lock schema. Each
phase is independently shippable; they are one task because each is under a day and all touch the
same two contract files. Revised 2026-09-19 from review 1: the overlay discard is path-scoped, the
`waiting_on` writer is a sibling script, the report template is extracted to its own file, and
Phase 4 (`--restore`) absorbs the restore `grant-qa-cycles.sh` already carries.

## Phase-by-Phase Implementation Guide

### Phase 1

**Dirty-tree probe** — in `develop-pipeline-resume-contract.md` Phase 0b, before any artifact is trusted:

```bash
DIRTY=$(git status --porcelain)
if [ -n "$DIRTY" ]; then
  BASE_REF="origin/${BASE_BRANCH:-develop}"
  # Classify EVERY entry first; act only on the classified paths (never `checkout -- .`, never a
  # directory-wide `clean`). `git diff <commit> -- <path>` does not see an untracked path, so `??`
  # entries need their own test: base must HAVE the path and the bytes must match.
  TRACKED=(); UNTRACKED=(); OVERLAY=true
  while IFS= read -r line; do
    st=${line:0:2}; p=${line:3}
    if [ "$st" = "??" ]; then
      if git cat-file -e "$BASE_REF:$p" 2>/dev/null && git show "$BASE_REF:$p" | cmp -s - "$p"; then
        UNTRACKED+=("$p")
      else OVERLAY=false; break; fi
    else
      if git diff --quiet "$BASE_REF" -- "$p" 2>/dev/null; then TRACKED+=("$p"); else OVERLAY=false; break; fi
    fi
  done <<< "$DIRTY"
  if [ "$OVERLAY" = true ]; then
    [ ${#TRACKED[@]} -gt 0 ]   && git checkout -- "${TRACKED[@]}"
    [ ${#UNTRACKED[@]} -gt 0 ] && git clean -f -- "${UNTRACKED[@]}"
    echo "overlay discarded: ${#TRACKED[@]} tracked, ${#UNTRACKED[@]} untracked paths"   # list every path in the Decisions Log
  elif ! printf '%s\n' "$DIRTY" | grep -qv 'skills/[^/]*/references/'; then npm run bundle -- --check || npm run bundle
  else echo "HALT: dirty tree on resume — $(printf '%s\n' "$DIRTY" | head -20)"; exit 1; fi
fi
```

Replay fixture: an untracked file base does not have must reach (c) and HALT, not (a).

**Summary-gap rule** — in `pipeline-resume-detector-prompt.md`, replace the exemption list with: read the
implementation report's step table column `Subagent summary ref`; raise `Summary missing for step N`
only when that cell names a path and the path is absent. A `—` cell means the step ran inline.

**Snapshot cleanup** — `develop-pipeline-step-8-commit.md` success path: compare the snapshot's
`task_or_story_directory` (the lock's field — there is no `work_item`) with this run's, canonicalised
the way `grant-qa-cycles.sh:161` does, and `rm -f …last-halt.json` on a match.
Detector: when the snapshot's document has `status: accepted` or `gh pr view <pr> --json state` is
MERGED, report `stale-snapshot` and delete it instead of offering a resume.

### Phase 2

**`waiting_on`** — lock schema: `"waiting_on": {"kind": "agent|task", "label": "...", "since": "<iso>", "budget_minutes": N}` or absent.
**One writer**, `shared/resources/set-waiting-on.sh`, a sibling of `set-qa-phase.sh` (same shape:
script not function, atomic mktemp+mv, never touches `current_step`, exit 0 no-op without a lock):
`set-waiting-on.sh "<label>" [--kind agent|task]` at dispatch (reads `subagents.wallClockMinutes`
via `read-config.sh` once and stores it as `budget_minutes`), `set-waiting-on.sh --clear` when the
result is read. Dispatch sites are the grep result recorded in the task's Phase 2 (Step 3 ×3,
Step 5 ×2, 5c in `review-pr`, Step 7's four Explore agents and its CI poll as `kind: task`) — re-run
the grep, do not copy the list. In `develop-pipeline-on-stop.sh`: if set and `since + budget_minutes`
is in the future, print `waiting on <label> since <since>` and exit 0; otherwise re-prompt as today.
No config read in the hook. Add `waiting_on` to `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.

**HALT rm** — every occurrence of `rm -f .claude/state/develop-pipeline.lock .claude/state/test-output-*.log`
(grep for `test-output-\*`; as of 2026-09-19 the three sites are `skills/develop-task/SKILL.md:279`,
`skills/develop-story/SKILL.md:292`, `skills/develop-bug/SKILL.md:288` — none in `shared/resources/*.md`;
the glob-only `rm` at `develop-pipeline-step-8-commit.md:77` takes the same form) becomes two lines:

```bash
rm -f .claude/state/develop-pipeline.lock
find .claude/state -maxdepth 1 -name 'test-output-*.log' -delete 2>/dev/null || true
```

Add to `docs/reference/anti-patterns.md`: "Never put a must-succeed path and a glob in one `rm` argv".

### Phase 3

`shared/resources/report-lint.js`:

```js
const { fencedRanges } = require("./change-log.js");
function lintReport(text, { sections = TEMPLATE_SECTIONS } = {}) { /* returns { ok, problems: [{code, line, detail}] } */ }
// codes: multiple-h1, section-missing, section-duplicated, section-out-of-order, qa-cycle-duplicated, header-block-duplicated, trailing-duplicate-body
```

There is no standalone template today — both variants are fenced blocks in
`develop-pipeline-step-0-resolve-and-prepare.md` §0e (story ~line 652, task ~line 746), and that
template says `## Tracker Actions Required` is *omitted when the journal is empty*. **First extract**
them to `shared/resources/implementation-report-template.md` (two variants; mark the optional section,
e.g. an HTML comment `<!-- optional -->` on its heading line), make §0e reference the file, then have
`report-lint.js` read `TEMPLATE_SECTIONS` (with an `optional` flag) from it. Required sections
exactly once in order; optional at most once. Codes: `multiple-h1`, `section-missing`,
`section-duplicated`, `section-out-of-order`, `qa-cycle-duplicated`, `header-block-duplicated`
(a second `**Task**:`/`**Story**:` block), `trailing-duplicate-body`. `--json` carries
`reason: ok | problems | usage`.

Fixture: `git show 329b4a65:docs/tasks/task.117.card-preflight-heading-only/task.117.implementation.1.card-preflight-heading-only-initial-run.md`
(366 lines) saved under `shared/resources/tests/fixtures/report-lint/corrupt-task117.md`. It has
**one** H1; the duplicate starts at the `**Task**:` block on line 218 and repeats seven `## `
sections — assert `section-duplicated` ×7, `section-out-of-order`, `header-block-duplicated`, and
that `multiple-h1` and `section-missing` do **not** fire. Green fixtures: the five most recent
accepted reports.

Call sites (four): **(1)** Step Transition Protocol action 2 in the three orchestrator `SKILL.md` —
right after the report Edit, before action 3; a failure HALTs with nothing committed (the protocol
edits, it does not commit). **(2)** The HALT rule "Commit the report before any halt" — lint first.
**(3)** `develop-pipeline-on-precompact.sh` between the append (`:189`) and `git add` (`:192`).
**(4)** Step 8 before the terminal commit. Each:
`command node …/report-lint.js --file "$REPORT" --json || { echo "HALT: report failed lint"; exit 1; }`.

### Phase 4

**`--restore`** on `advance-pipeline-lock.sh`. Same-class inventory first: `grant-qa-cycles.sh:142-175`
(task.123) already restores the lock from `last-halt.json` — refusing another document's snapshot by
canonicalised `task_or_story_directory` (`:161`), stripping
`halted_at/halt_reason/halt_step/paused_at/pause_reason`, **not** consuming the snapshot, and logging
`lock restored from <snapshot>`. `--restore` **replaces** it; grant keeps only its budget logic and
calls `--restore` after the budget check passes (so its refusal-writes-nothing rule, CR-1, still holds).

`--restore` semantics: no lock → source = `last-halt.json`, else the newest `.pausing.*` claim, chosen
by document then age (the detector's rule); refuse a source for another document (exit 1, nothing
written); rebuild the lock at `halt_step` (fallback `current_step`), strip the five pause/halt fields,
write atomically, **delete the source**. Lock present → exit 0 no-op. Neither → exit 1 naming both
paths. `<n>` with no lock → exit 1 pointing at `--restore`. **`--skill` and `--complete` with no lock
stay exit 0** — `--skill` is issued by nine sub-skills that run standalone; `--complete` must clear
a corrupt lock. Rewrite the header's Behaviour block, which currently documents the silent exit 0
as the contract.

Tests: move grant's restore cases to `advance-pipeline-lock.test.sh`; keep grant's budget cases; add
`--skill`/`--complete` no-lock → 0, `<n>` no-lock → 1, other-document snapshot → 1 with nothing
written, grant-after-HALT still restores and records.

Docs: `develop-pipeline-pause.md`, the resume contract, the three orchestrators' Phase 0
("continuing in the same session after a pause → `--restore` first"), and the PreCompact hook's
compaction-summary instruction.

## Key Patterns and References

- Pure engine + thin CLI + `--json reason`: `change-log.js`, `registry-tick.js`.
- One lock field, one writer script: `set-qa-phase.sh` (task.123) is the model for `set-waiting-on.sh`.
- One restore: `advance-pipeline-lock.sh --restore`; `grant-qa-cycles.sh` calls it.
- One template definition: `implementation-report-template.md`, read by step-0 §0e and `report-lint.js`.
- Fence-awareness: reuse `change-log.js` `fencedRanges`; do not write a second fence parser.
- Replay fixtures: `evals/develop-task/step-isolation/`.

## Testing Approach

`npm test` (unit + hooks — add `set-waiting-on.test.sh` to the `test` script by hand; shell tests
are listed individually), `npm run eval:all` (replay), and the three HALT snippets through
`qa-execute-snippets.mjs` in bash **and** zsh with an empty glob (`lint:shell` lints `.sh` sources
only and never sees a fence).
