# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.10.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.10.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 is the fourth granted cycle (10 of 10). It re-reviews the cycle 9 fix (`0df2880e`) at head
`885debef`. The commits after it touch only this task's documents. The fix holds: bug.18 and bug.19
are closed, and each of the three new guards is mutation-proven against a committed fixture. No
top issue is open. One low gap remains in the same check and is reproduced (CR10-1). By the
owner's decision of 2026-10-28 it is deferred to task.240, which replaces the awk. Security reads
CONCERNS for it, so the gate is CONCERNS with an empty `top_issues[]`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous issue (gate 9) | Severity | Status | Evidence |
|---|---|---|---|
| TASK-238-CR9-1 (bug.18): a failing awk prints an empty `OPEN_COVERAGE` | medium | ✅ FIXED | Shell guard maps any non-count to `unreadable`. Committed test "an awk that fails → unreadable" goes red when the guard is removed |
| TASK-238-CR9-2 (bug.19): a key line after a flow entry is read as that entry's | medium | ✅ FIXED | `fl` refusal. Probe `oc9-flow-then-key-exempt` is now refused. Committed test "a key line after a one-line flow entry" goes red when the refusal is removed |
| CR9-3 (low): a findings list cut short reads its surviving entries | low | ✅ FIXED (one residual, CR10-1) | Terminator requirement. Probe `oc9-truncated-by-hash-heading` is refused, and two committed tests go red when it is removed |
| CR9-4, CR9-5, CR7-3, CR7-4, CR7-6, CR6-3, CR6-5, CR6-7 (advisory) | — | carried | Files unchanged; still in `recommendations.future` |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#770, OPEN, head `885debef`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (parity suite; hosted Test lane)
- [ ] Performance Testing
- [x] Regression Testing (gate 8 and 9 probe cases re-run)
- [x] Security Review (probe engine, fence form)
- [x] Code Review (Step 3b, one Explore subagent)

### Review Methodology

Direct tools, plus one diff-review subagent. This is a re-review of a single-block fix. The
traceability mapper was skipped: §9 Success Criteria is a checklist, not a table.

Re-review scope: files changed since gate 9 (head 51dc912e74a8; 19 files) — default

`SAFETY_REPROBE=false`. Clause 1 reads false from gate 9. Clauses 2–3 do not hold: gate 9 had no
HIGH and was not FAIL.

CI on 885debefe59a: pending

The hosted `Test` lane passed at `ded46852`. Its code is identical to this head: `git diff --name-only
0df2880e..HEAD` names only three files under this task's directory.

Diff reviewer: dispatched 08:44:49Z, returned with `duration_ms` 113403 (1.9 min). It was told to
write nothing. The scratch worktree QA mutated in was separate from the tree it read.

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
(`--diff-base` the merge base, `--copy-as skills:.agents/skills`). The changed blocks: 4 in total,
0 runnable, 4 refused as `mutating`, so `changed-blocks-not-executed`. That is the same as cycles 8
and 9. The open-coverage block is executed instead by `pr-review-loop-parity.test.mjs` (82 tests)
and by the probe engine's fence form (29 cases).

---

## New Findings This Cycle

- **[low]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1581`: `term` is set by the first
  findings list's terminator and never cleared. A block with `findings: []`, a top-level key, and
  then a second `findings:` list cut short with no fence prints `OPEN_COVERAGE=0` where `unreadable`
  is correct (CR10-1, reviewer CR-1, low/low; reproduced by `oc10-second-findings-cut-short`). →
  **Deferred to task.240** by owner decision. Its parser refuses a duplicate key (`duplicate-key`).
  Measured plausibility: 0 of 185 tracked PR review reports repeat the `findings:` key, and review-pr's
  template writes it once. Not in `top_issues[]`. Routed to the task's Deferred Work. No success
  criterion states the reader's fail-closed property, so none is amended.
- **[cleanup]** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1581`: the `inf &&` test in the
  column-0 rule is always true, because the rule before it skips every line read while `inf` is 0
  (CR10-2, reviewer CR-2). Advisory, and moot once task.240 lands.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gated log cleanup and fast-gate outcomes | PASS | Verified | Unchanged since gate 6. The Overview and checkbox wording was fixed in `885debef` |
| Phase 2: CI read at gate writing | PASS | Verified | `qa-ci-read.sh` unchanged; this cycle's read printed `CI_STATE=PENDING` and changed nothing |
| Phase 3: coverage findings back to 5b | CONCERNS | Verified | bug.18 and bug.19 are fixed. CR10-1 (low) is deferred to task.240 |
| Phase 4: guards and bundled copies | PASS | Verified | `bundle:check` clean: 128 skills, 0 problems |

**Overall Phase Completion**: 4/4 phases implemented; 1 with a deferred low.

---

## Success Criteria Verification

Only the criteria the cycle 9 fix touches were re-verified. Earlier gates hold the rest, and only
this task's documents changed after `0df2880e`.

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| SC-4: an unreadable review is never routed as clean | `unreadable` for any shape not read | bug.18 and bug.19 shapes refused; one contrived shape (CR10-1) reads 0 | CONCERNS | `pr-review-loop-parity.test.mjs` 82/82; probe record `task.238.qa.10.security.run.json` |
| SC-7: `npm run ci:fast` passes | exit 0 | exit 0 | PASS | 6535 tests at `0df2880e` (qa-fix cycle 9 run); hosted `Test` green at `ded46852`, same code. Not re-run locally this cycle |
| SC-8: bundle fresh | 0 problems | 0 | PASS | `npm run bundle:check` |
| SC-9: validate | exit 0 | exit 0 | PASS | `quick_validate.py` on `skills/develop-task`, `skills/develop-story`, `skills/qa-task` |
| SC-10: every new guard mutation-proven | 3 of 3 | 3 of 3 | PASS | Code Review section below |

---

## Breaking Changes Validation

None in this cycle's change set. A block with no terminator now prints `unreadable` where it printed
a count. This is deliberate, documented in the block comment and the CHANGELOG, and held by a fixture.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (1)

- CR10-1: a repeated `findings:` key with a cut-short second list reads 0. Deferred to task.240 (see
  New Findings).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (plus 1 cleanup)

---

## NFR Assessment

### Performance — PASS

Unchanged in kind. The fix adds one flag and one terminator test per line.

### Reliability — PASS

CR9-1 is fixed: a failed awk prints `unreadable`. CR7-4 is still carried (advisory).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 29 (escaped 0), record `task.238.qa.10.security.run.json`
- Gate 9 cases (12) and gate 8 cases (8) re-run: every bug.18 and bug.19 shape is refused, and all
  legitimate controls pass. `oc8-provenance-continued` prints `unreadable`, which its `correct` field
  accepts.
- New cycle 10 cases (8, `task.238.qa.10.security.cases.1.json`): multi-line flow entry, CRLF,
  alias, tab indent, repeated `findings:` key, and three controls. Six match their `expected`.
  `oc10-crlf-category` and `oc10-two-findings-blocks` print `1`, which their `correct` fields
  accept: QA set `expected` too narrowly.
- One reproduction (`task.238.qa.10.security.cases.2.json`): `oc10-second-findings-cut-short` prints
  `0` where `unreadable` is correct (CR10-1). The engine's `reproduced: 4` counts it plus the three
  acceptable mismatches above.

### Maintainability — PASS

Each cycle 9 guard is mutation-proven (below). CR10-2 is an advisory cleanup.

---

## Code Review

Advisory, with blocking on (`code_review_blocking=true`). Neither finding is `bug` + `high`
confidence, so neither was promoted to `top_issues[]`.

**Correctness bugs (1):**

- [low/low] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1581`: `term` is never cleared, so a
  second `findings:` list cut short prints a count (CR10-1). → Deferred to task.240.

**Cleanups (1):**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1581`: the `inf &&` test is always true (CR10-2).

Both anchors read `ok` from `finding-anchors.js` at `--rev HEAD`.

Mutation proofs, in a scratch worktree at `885debef`, with a `cp` snapshot restored after each (`cmp`
clean, baseline 82/82 between):

mutation-proven: removed the `case "$OPEN_COVERAGE" in ''|*[!0-9]*)` shell guard → "open-coverage check: an awk that fails → unreadable, never an empty value" → covered
mutation-proven: removed `fl { bad = 1; next }` → "open-coverage check: a key line after a one-line flow entry → unreadable" → covered
mutation-proven: removed `|| !term` from the END test → "a findings list cut short by a column-0 heading line → unreadable" and "a findings list with no terminator after it … → unreadable, never 0" → covered

With the `fl` refusal removed, the "deeper text line after a flow entry" case stayed green: another
rule holds it, so it is not the refusal's guard. The key-line case is.

---

## Regression Testing

| Area | Result |
| --- | --- |
| §5c open-coverage block, gate 8 and 9 shapes | PASS (20 cases re-run) |
| Parity suite | PASS (82/82) |
| Hosted Test lane on identical code (`ded46852`) | PASS |
| Bundled copies | PASS (`bundle:check`) |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (§5c open-coverage block)
- `evals/shared/tests/pr-review-loop-parity.test.mjs`
- `skills/develop-task/references/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md`
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test evals/shared/tests/pr-review-loop-parity.test.mjs
npm run -s bundle:check
python3 skills/create-skill/scripts/quick_validate.py skills/develop-task   # and develop-story, qa-task
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
command node .agents/skills/qa-task/references/security-probe.mjs --sink filename \
  --entry 'fence:shared/resources/develop-pipeline-step-5-6-qa-loop.md#Verdict branching' \
  --slot "{the PR review report this cycle's 5c wrote}" \
  --cases-file task.238.qa.{9,9,10,10}.security.cases.{1,2,1,2}.json \
  --record task.238.qa.10.security.run.json --name open-coverage-shapes-{9,8,10},open-coverage-cr10-1 --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --diff-base "$(git merge-base origin/develop HEAD)" \
  --copy-as skills:.agents/skills --json
```

### Coverage Report

Not measured: the repository has no coverage tooling for Markdown-embedded shell. The block is
covered by fixtures that execute it.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. task.240 (issue #771): replace the awk with a fail-closed parser. It closes CR10-1 and CR10-2.
2. Carried advisory items: CR9-4, CR9-5, CR7-3, CR7-4, CR7-6, CR6-3, CR6-5, CR6-7.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The cycle 9 fix is verified and no top issue is open. Security is CONCERNS for one
reproduced low gap, deferred to task.240 by the owner.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: task.240 replaces the open-coverage awk.

---

**QA Report**: co-located at `task.238.qa.10.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.10.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: 5c `/review-pr --no-code` (a CONCERNS gate with no open entry), then `/finalise`.
