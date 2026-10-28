# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.6.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.6.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: FAIL

---

## Executive Summary

Cycle 6 is the first of the two cycles granted after the loop-limit halt. It gates the cycle 5 fix
`8345b798`, at head `8c43db0c`. bug.10, bug.11 and bug.12 are fixed: each is held by a committed
test, and a mutation turned each of those tests red. The fast gate and PR CI are green.

The unscoped safety re-probe found two more HIGH ways `fast-gate-outcome.sh` classes a head-only red
as `pre-existing`:

- **PRB6-1 (bug.13):** tests generated at one position fold into one key under `sort -u`.
- **CR6-1 (bug.14):** a file load failure is compared without its cause.

Both reproduce on node 26.8.2.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous finding | Bug | Status | Evidence |
|---|---|---|---|
| TASK-238-CR5-1: a leaf name shared across describes reads pre-existing | bug.10 | ✅ FIXED | Failures are keyed on file + `line:column`. Probe `log-shared-leaf-other-line` holds. Mutation M1 (drop the position) turned the bug.10 test red. The same-position shape is new finding PRB6-1 |
| TASK-238-CR5-2: node diagnostic errors are never looked for | bug.11 | ✅ FIXED | `stray_diagnostic()`. Probes `log-spec-coverage-threshold` and `log-tap-coverage-threshold` hold. M2a (spec) and M2b (TAP) each turned the bug.11 test red |
| TASK-238-PRB5-1: a second node summary resets the trailer check | bug.12 | ✅ FIXED | `trailer()` no longer resets `bad`. Probe `log-trailer-between-two-runs` holds. M3 turned the bug.12 test red |

bug.10, bug.11 and bug.12 are closed (Step 9b).

---

## New Findings This Cycle

- **[high]** `shared/resources/fast-gate-outcome.sh:169` — PRB6-1: tests generated in a loop share a
  file, a line, a column and a leaf name. The spec summary omits the describe, and `sort -u` folds
  them into one key. One base failure there then matches any number of head failures. → Compare
  multiplicities, and treat a key that names more than one test as ambiguous. bug.13
- **[high]** `shared/resources/fast-gate-outcome.sh:246` — CR6-1: a file load failure (`1:1`, named
  by the path) is compared without its cause. A head `SyntaxError` matches a base `ENOENT`. → Never
  compare a file-level failure. bug.14
- **[low]** `shared/resources/fast-gate-outcome.sh:169` — CR6-6: platform-variance. The head prefix
  is the logical `$PWD`, while TAP locations resolve symlinks. → Strip `$(pwd -P)/` too.
- Advisory, medium confidence: CR6-2, CR6-3 (raised for the third time), CR6-4, CR6-5 and CR6-7.
  See Code Review.

Searched unscoped (prior gate: security FAIL). The reviewer read the whole `origin/develop...HEAD`
source diff: 26 files, 3,756 lines. It excluded the generated `skills/*/references/*` copies, which
`bundle:check` holds equal to their sources, plus the task's own artifacts and `CHANGELOG.md`.

For each comparison input, QA enumerated the key's identity rule again and tested it:

- **Must differ:** another line, another describe at one position, a load failure from another
  cause.
- **Must match:** the same nested test at the same place (the bug.10 control).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#770, OPEN)

### Testing Approach

- [x] Automated Testing (`npm run ci:fast`, targeted suites)
- [x] Regression Testing
- [x] Security Review (probe engine, 61 cases)
- [x] Code Review (Explore reviewer, unscoped, safety re-probe directive)
- [x] Mutation spot checks (scratch worktree)

### Review Methodology

Direct tools plus one read-only Explore reviewer (Step 3b). The reviewer was dispatched at 06:05:14Z
(`date -u`). It returned in 315 s, by `duration_ms`. Mutations ran in a scratch worktree, after the
reviewer had returned (`git worktree add --detach`, since removed).

Re-review scope: unscoped (prior gate failed on security). Clause 1 of `qa-safety-clause1.sh` read
`true` on gate 5.

CI on 8c43db0c261c: green

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
the only runnable-prose file changed since gate 5. The cycle 5 edits there are prose only.
- **Changed blocks:** 4 in total (`--diff-base` at the merge base), 0 executed. All 4 are
  `mutating` and were refused by design. The engine reported `changed-blocks-not-executed`.
- **Coverage of the changed blocks:** the one boundary among them, the §5c open-coverage fence, is
  executed by the probe engine's fence form (24/24).
- **Other files:** gate 5's per-file Step 4b results stand. No fenced block changed since
  `4ef29ed1` (`git diff 4ef29ed1..HEAD` touches prose only).

Standards-named validation: `npm run validate` was not run. No `SKILL.md` or frontmatter changed
since gate 5 (`git diff 4ef29ed1..HEAD --stat`).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1 | PASS | Verified | Unchanged since gate 3 |
| Phase 2: fast-gate outcome | FAIL | Partial | bug.13 and bug.14 |
| Phase 3 | PASS | Verified | Unchanged |
| Phase 4 | PASS | Verified | Unchanged |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

The criteria are as gate 5 assessed them, except the fast-gate criterion: `pre-existing` must only
fire when every head failure also fails at the base. That criterion is not met (bug.13, bug.14).
Every other criterion is held by the committed tests cited in gate 4 and gate 5. They pass at
`8c43db0c` (6,538 tests, 0 fail).

---

## Breaking Changes Validation

None declared. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: Tests generated at one position collapse to pre-existing**
- **Severity**: HIGH
- **Category**: Security (the classification widens what the gate lets through)
- **Bug Report**: [task.238.bug.13.tests-generated-at-one-position-collapse-to-pre-existing.md](./task.238.bug.13.tests-generated-at-one-position-collapse-to-pre-existing.md)
- **Observation**: `describe(m)` over GET and POST, with the head breaking POST, reads
  `GATE_OUTCOME=pre-existing (returns 200;)` in spec mode. The probe `log-same-key-twice` reproduces it.
- **Impact**: a head-only red is pushed with no triage.
- **Recommendation**: compare multiplicities, and refuse an ambiguous key.
- **Priority**: P1

**Issue: File load failures compare without their cause**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.238.bug.14.file-load-failures-compare-without-their-cause.md](./task.238.bug.14.file-load-failures-compare-without-their-cause.md)
- **Observation**: a head `SyntaxError` against a base `ENOENT` reads `pre-existing (x.test.mjs;)`.
  The reviewer found it, and QA reproduced it.
- **Impact**: a syntax error that breaks a whole file is pushed with no triage.
- **Recommendation**: never compare a file-level failure.
- **Priority**: P1

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

CR6-6: platform variance in the path prefix (in the gate, low).

**Total Issues**: HIGH: 2, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
The new diagnostic check is one awk pass over the log. The base run is unchanged.

### Reliability — CONCERNS
CR6-2: a non-node red printed before node's results is still never examined. This is gate 5's
future item. The reviewer reproduced it with prettier warnings before a base-red run.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 61 (`task.238.qa.6.security.run.json` `totals.executed`); escaped 0
- **Controls:** base-argument (8/8), pr-argument (8/8) and open-coverage-check (24/24) engage.
  log-test-paths is 20/21, with `log-same-key-twice` reproduced.
- **Cases** (`task.238.qa.6.security.cases.2.json`): gate 5's 17, plus four new:
  - `log-same-key-twice`
  - `log-shared-leaf-other-line`
  - `log-spec-coverage-threshold`
  - `log-tap-coverage-threshold`
- **Re-expected:** `log-shared-test-name`, for cycle 5's message format (it now names `3:1`). QA
  confirmed the run itself is still attributable by hand.
- **Verdict:** two HIGHs (PRB6-1, CR6-1) widen `pre-existing`.

### Maintainability — PASS
Each cycle 5 fix is held by a committed test. See the mutation lines below.

---

## Code Review

Every anchor checked `ok` (`finding-anchors.js`, `--rev HEAD`).

**Correctness bugs (7):**
- [high/high] `shared/resources/fast-gate-outcome.sh:246` — CR-1: a file load failure is compared
  without its cause, so a head-only load failure reads pre-existing. → Never compare a file-level
  failure. **Promoted: TASK-238-CR6-1.** QA reproduced it. The file is new on this branch, so the
  finding is attributable to it.
- [medium/medium] `shared/resources/fast-gate-outcome.sh:115` — CR-2: output before node's results
  is never examined. → Allow only node's own lines before the results too. Advisory, a future item.
- [medium/medium] `shared/resources/qa-ci-read.sh:104` — CR-3: `gh run list --branch` can return a
  `pull_request` run from a branch named like the base. → Add `--event push`. Advisory. This is the
  third cycle to raise it.
- [medium/medium] `shared/resources/qa-ci-read.sh:110` — CR-4: `pre-existing` is decided per lane,
  not per failing test. → Compare failing steps or tests. Advisory.
- [medium/medium] `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1570` — CR-5: the awk
  prints 0 for a truncated or bare `findings:` block. → Print `unreadable`. Advisory.
- [low/high] `shared/resources/fast-gate-outcome.sh:169` — CR-6: platform-variance. `$PWD` against
  symlink-resolved TAP paths. → Strip `$(pwd -P)/` too. **Promoted: TASK-238-CR6-6 (low).**
- [low/medium] `skills/qa-task/SKILL.md:137` — CR-7: the Bitbucket PR lookup reads no HTTP status.
  → Use `-w '%{http_code}'`. Advisory.

**Cleanups (0).**

QA's own probe finding: PRB6-1 at `shared/resources/fast-gate-outcome.sh:169`. **Promoted:
TASK-238-PRB6-1.**

The mutations ran in a scratch worktree. Each was applied by a split that had to match exactly once,
and the baseline was green before and after (47/47):

mutation-proven: spec key without line:column → "attributable: a head-only failure that shares its leaf name with a base failure in another describe (bug.10)" → covered
mutation-proven: spec `ℹ` diagnostics ignored → "attributable: node's own coverage-threshold error, which the base run never reproduces (bug.11)" → covered
mutation-proven: TAP `#` diagnostics after the plan ignored → "attributable: node's own coverage-threshold error, which the base run never reproduces (bug.11)" → covered
mutation-proven: trailer resets `bad` at a later spec summary → "attributable: another step's red between two node runs (bug.12)" → covered

Four of four mutations were proven.

---

## Regression Testing

| Area | Result |
|---|---|
| `npm run ci:fast` (format check + full suite) | PASS: 6,538 tests, 6,524 pass, 0 fail, 14 skipped; tmp-leak ratchet ok |
| Targeted suites (fast-gate, qa-ci-read, pr-review parity, qa-task, qa-story) | PASS: 163/163 |
| `develop-pipeline-on-stop.test.sh` | PASS: 52/52 |
| PR CI on `8c43db0c` | green |

---

## Test Artifacts

### Files Reviewed
`shared/resources/fast-gate-outcome.sh`, `shared/resources/qa-ci-read.sh`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-on-stop.sh`,
`evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs`, and the full source diff (via the reviewer).

### Test Commands Executed
```bash
npm run ci:fast
command node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs shared/resources/tests/qa-ci-read.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs skills/qa-task/tests/qa-task.test.js skills/qa-story/tests/qa-story.test.js
bash shared/resources/develop-pipeline-on-stop.test.sh
command node .agents/skills/qa-task/references/security-probe.mjs … (4 controls, record task.238.qa.6.security.run.json)
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-5-6-qa-loop.md --diff-base {merge base} --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
node --test [--test-reporter=tap] api.test.mjs   # PRB6-1 reproduction, scratch repository
node --test x.test.mjs                            # CR6-1 reproduction, scratch repository
```

### Coverage Report
Not measured. The repository records no coverage target for shell scripts. The coverage evidence is
the probe record and the mutation lines above.

---

## Recommendations

### Immediate Actions (Blocking)
1. bug.13 and bug.14 (HIGH). `fast-gate-outcome.sh` now has HIGH findings in gates 4, 5 and 6, so
   the third-strike rule applies. Gate 5's option 2 is the structural move: accept only the log
   shapes the comparison can read unambiguously. That means one failing test per key, never a
   file-level failure, and node's lines only. Everything else reads attributable. This is an
   allow-list, not another deny rule.
2. CR6-6 (low): strip the physical cwd.

### Short-term Actions (Non-Blocking)
1. CR6-3: `--event push` for the GitHub base reading (raised for the third time).
2. CR6-2, CR6-4, CR6-5, CR6-7 (see Code Review).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two HIGH findings, each reproduced, still let a head-only red be classed
`pre-existing`, which is the outcome the task requires to stay narrow.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.238.qa.6.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.6.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` cycle 6, under the third-strike rule. Cycle 7 is the last granted cycle.
