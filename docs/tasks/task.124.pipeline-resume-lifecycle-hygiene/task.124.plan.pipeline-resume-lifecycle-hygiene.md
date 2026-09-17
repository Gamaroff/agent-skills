---
id: task.124.plan
title: "Implementation Plan: pipeline resume lifecycle hygiene"
type: plan
task-ref: task.124.pipeline-resume-lifecycle-hygiene.md
---

# Implementation Plan: pipeline resume lifecycle hygiene

> Requirements and success criteria: [task.124.pipeline-resume-lifecycle-hygiene.md](task.124.pipeline-resume-lifecycle-hygiene.md)

## Overview

Six small mechanisms, three phases, no shared state between them beyond the lock schema. Each
phase is independently shippable; they are one task because each is under a day and all touch the
same two contract files.

## Phase-by-Phase Implementation Guide

### Phase 1

**Dirty-tree probe** — in `develop-pipeline-resume-contract.md` Phase 0b, before any artifact is trusted:

```bash
DIRTY=$(git status --porcelain)
if [ -n "$DIRTY" ]; then
  BASE_REF="origin/${BASE_BRANCH:-develop}"
  # (a) overlay: every modified/deleted path is byte-identical to the base branch
  OVERLAY=true
  while IFS= read -r line; do
    p=${line:3}
    git diff --quiet "$BASE_REF" -- "$p" 2>/dev/null || { OVERLAY=false; break; }
  done <<< "$DIRTY"
  if [ "$OVERLAY" = true ]; then git checkout -- . && git clean -fd -- skills scripts; echo "overlay discarded: $(printf '%s\n' "$DIRTY" | wc -l) paths" # record in Decisions Log
  elif ! printf '%s\n' "$DIRTY" | grep -qv 'skills/[^/]*/references/'; then npm run bundle -- --check || npm run bundle
  else echo "HALT: dirty tree on resume — $(printf '%s\n' "$DIRTY" | head -20)"; exit 1; fi
fi
```

Untracked files (`??`) count as dirty; an untracked path is "identical to base" only if base has it.

**Summary-gap rule** — in `pipeline-resume-detector-prompt.md`, replace the exemption list with: read the
implementation report's step table column `Subagent summary ref`; raise `Summary missing for step N`
only when that cell names a path and the path is absent. A `—` cell means the step ran inline.

**Snapshot cleanup** — `develop-pipeline-step-8-commit.md` success path: `[ "$(jq -r .work_item
.claude/state/develop-pipeline.last-halt.json 2>/dev/null)" = "$WORK_ITEM" ] && rm -f …last-halt.json`.
Detector: when the snapshot's document has `status: accepted` or `gh pr view <pr> --json state` is
MERGED, report `stale-snapshot` and delete it instead of offering a resume.

### Phase 2

**`waiting_on`** — lock schema: `"waiting_on": {"kind": "agent|task", "label": "...", "since": "<iso>"}` or absent.
Dispatch sites (qa-task 3b reviewer, 5c conformance lens, finalise CI poll, step-3 triage) write it
via `advance-pipeline-lock.sh --waiting-on "<label>"` and clear with `--clear-waiting`. In
`develop-pipeline-on-stop.sh`: if set and `since` is younger than `subagents.wallClockMinutes`,
print `waiting on <label> since <since>` and exit 0; otherwise re-prompt as today.

**HALT rm** — every occurrence of `rm -f .claude/state/develop-pipeline.lock .claude/state/test-output-*.log`
(grep for `test-output-\*` across `shared/resources/*.md`) becomes two lines:

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
// codes: multiple-h1, section-missing, section-duplicated, section-out-of-order, qa-cycle-duplicated, trailing-duplicate-body
```

`TEMPLATE_SECTIONS` is read from the implementation-report template file the pipelines already
use (find it via `grep -rl "Implementation Report" shared/resources/*.md`), not restated. Fixture:
`git show 329b4a65:docs/tasks/task.117.*/task.117.implementation.1.*.md` saved under
`shared/resources/tests/fixtures/report-lint/corrupt-task117.md`.

Call sites: Step Transition Protocol's "commit the report" line, the HALT path's commit, and the
PreCompact hook after its append — each `command node …/report-lint.js --file "$REPORT" --json || { echo "HALT: report failed lint"; exit 1; }`.

## Key Patterns and References

- Pure engine + thin CLI + `--json reason`: `change-log.js`, `registry-tick.js`.
- Fence-awareness: reuse `change-log.js` `fencedRanges`; do not write a second fence parser.
- Replay fixtures: `evals/develop-task/step-isolation/`.

## Testing Approach

`npm test` (unit + hooks), `npm run eval:all` (replay), and the HALT snippet through
`qa-execute-snippets` in both shells with an empty glob.
