# QA Report: Task 238 - QA loop acts on the signals it already has

**Task**: [Link to task document](./task.238.qa-loop-acts-on-signals-it-has.md)
**Gate File**: [task.238.gate.5.qa-loop-acts-on-signals-it-has.yml](./task.238.gate.5.qa-loop-acts-on-signals-it-has.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: FAIL

---

## Executive Summary

QA cycle 5 of 5 re-reviewed the branch at `4ef29ed1`, the cycle 4 fix. All eight cycle 4 items are
verified fixed: bug.5 to bug.9, CR4-8, CR4-9 and advisory CR-6.

Gate 4 failed on security, so this cycle ran as an unscoped safety re-probe. It found two more HIGH
ways that `fast-gate-outcome.sh` classes a head-only red as `pre-existing`:

- **CR5-1:** a test is keyed by its leaf name, and node's spec summary shares a leaf name across
  describes in one file.
- **CR5-2:** node's own non-test errors, such as a coverage threshold, are never looked for.

The probe engine found a MEDIUM (PRB5-1): a second node summary resets the trailer check. All three
reproduce. They are bug.10 to bug.12.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Bug | Status | Evidence |
| --- | --- | --- | --- |
| CR4-1: bare-name base comparison | bug.5 | ✅ FIXED | shared-name and new-file tests green; QA mutation (compare names only) turned the shared-name test red; probe `log-shared-test-name` and `log-new-head-file` held |
| CR4-2: pre-existing ignores non-node red | bug.6 | ✅ FIXED | trailer tests green; probes `log-trailer-other-step` and `log-trailer-tripped-ratchet` held. The reported shape is fixed; CR5-2 and PRB5-1 are new shapes of the same class |
| CR4-3: Bitbucket base reading uses any pipeline | bug.7 | ✅ FIXED | selector tests green; QA mutation (drop the key match) turned both red |
| CR4-4: open-coverage awk shapes | bug.8 | ✅ FIXED | 26/26 open-coverage tests; QA mutation (drop `tolower`) turned the capitalised case red; fence probe 24/24 including 12 new shapes |
| PRB4-1: option-shaped path reaches node | bug.9 | ✅ FIXED | paired option-shaped probe and test refuse before any git call |
| CR4-8: superseded Bitbucket pipeline (low) | — | ✅ FIXED | rerun-supersedes test green |
| CR4-9: interrupted run reads attributable (low) | — | ✅ FIXED | wrapper signal lines read not-measured; probe `log-wrapper-signal` held |
| CR-6 advisory: base contains HEAD | — | ✅ FIXED | CR4-6 test green |
| CR-5 advisory: `--event push` | — | ❌ NOT FIXED | reported again as CR-3 (medium confidence, advisory) |

## New Findings This Cycle

- **[high]** `shared/resources/fast-gate-outcome.sh:89`: in spec mode a failure is keyed by file
  and leaf name, and node's summary omits the parent describe, so `POST > returns 200` (head-only)
  merges with `GET > returns 200` (base) and reads pre-existing → key on file plus `line:column`
  (bug.10)
- **[high]** `shared/resources/fast-gate-outcome.sh:111`: a node diagnostic red (`ℹ Error:` before
  the spec summary, `# Error:` after TAP results) is never looked for, so a head-only coverage
  threshold failure reads pre-existing → refuse any `ℹ Error:` / `# Error:` line and accept only
  node's own `#` summary keys (bug.11)
- **[medium]** `shared/resources/fast-gate-outcome.sh:111`: a second `✖ failing tests:` summary
  resets the trailer's first non-node line, so node → lint red → node reads pre-existing → never
  reset it (bug.12)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (the three changed test files 127/127 at `4ef29ed1`; ci:fast at `4ef29ed1` 6519/0)
- [x] No breaking changes (consumers see new behaviour in shared step docs only)
- [x] Code on `feature/task.238.qa-loop-acts-on-signals-it-has` with PR #770 open

### Testing Approach

- [x] Automated Testing (unit and fixture suites)
- [x] Regression Testing
- [x] Security Review (probe engine, 57 cases)
- [x] Code Review (Step 3b, unscoped safety re-probe)

### Review Methodology

Direct tools plus one read-only Explore reviewer (Step 3b). The reviewer was dispatched at 05:35:46Z
and returned at 05:41:22Z (`date -u`); its duration was 299 s by `duration_ms`.

Re-review scope: unscoped (prior gate failed on security). Clause 1 of `qa-safety-clause1.sh` read
`true` on gate 4.

CI on 4ef29ed18b11: pending

Step 4b: run over the 15 changed runnable-prose files with `--diff-base` at the merge base.
- **Changed blocks:** 23 in total, 2 executed, 2 runnable, 4 placeholder, 17 mutating. Every
  mutating block was refused by design (`rm -rf`, write redirections, `gh`).
- **Execution failure:** `develop-pipeline-resume-contract.md:492` exits 2 because the temp copy has
  no `.claude/state/develop-pipeline.lock`. That block came from `8c80232b` (#616); this branch's
  hunks in the file are at 461, 471 and 551. So it is pre-existing and fixture-bound, recorded as a
  future item rather than a finding.
- **Other files:** `zero-blocks-executed` on `develop-pipeline-step-3-develop-loop.md`,
  `qa-fix/SKILL.md` and `review-pr/SKILL.md`. Each comes from placeholders in unchanged blocks.

Standards-named validation: `npm run validate` is not run this cycle, because no SKILL.md or
frontmatter changed since gate 4 (`git diff adff39e2..4ef29ed1 --stat` touches no SKILL.md).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: gated log cleanup | PASS | Verified | unchanged since gate 3 |
| Phase 2: three fast-gate outcomes | FAIL | Partial | CR5-1, CR5-2, PRB5-1 in `fast-gate-outcome.sh` |
| Phase 3: PR existence and CI read | PASS | Verified | bug.7 / CR4-8 fixed; CR-3 advisory |
| Phase 4: coverage findings route | PASS | Verified | bug.8 fixed, 24/24 fence probes |

**Overall Phase Completion**: 3/4 phases passed

---

## Success Criteria Verification

The criteria verdicts from gate 3 stand for phases 1, 3 and 4. They are re-verified here only where
cycle 4 touched them.

| Criterion | Status | Evidence |
| --- | --- | --- |
| A pre-existing red needs the same tests to fail at the base | FAIL | CR5-1: "same test" is decided by leaf name inside a file; reproduced with `node --test` on node 26.8.2 |
| A red not explained by node tests is attributable | FAIL | CR5-2: a coverage-threshold red is not looked for; PRB5-1: a second summary resets the check |
| The Bitbucket base reading is the same check | PASS | `qa-ci-read.test.mjs` selector cases (`qa-ci-read.sh` `key()`) |
| An open coverage finding in any YAML shape routes to 5b | PASS | `pr-review-loop-parity.test.mjs` RAW_CASES; fence probe 24/24 |
| All tests passing | PASS | ci:fast 6519/0 at `4ef29ed1` |

---

## Breaking Changes Validation

Not applicable: the behaviour change is confined to the QA loop's own classifier and readers.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: A test that shares its leaf name across describes reads pre-existing**
- **Severity**: HIGH
- **Category**: Security / Functional
- **Bug Report**: [task.238.bug.10.same-leaf-name-across-describes-reads-pre-existing.md](./task.238.bug.10.same-leaf-name-across-describes-reads-pre-existing.md)
- **Observation**: `pre-existing (returns 200;)` for a head-only POST failure, measured on node 26.8.2
- **Impact**: a head-only red is pushed and never fixed
- **Recommendation**: key on file plus `line:column`
- **Priority**: P1

**Issue: Node's own non-test errors are never looked for**
- **Severity**: HIGH
- **Category**: Security / Functional
- **Bug Report**: [task.238.bug.11.node-diagnostic-errors-are-not-looked-for.md](./task.238.bug.11.node-diagnostic-errors-are-not-looked-for.md)
- **Observation**: a head-only coverage-threshold failure reads `pre-existing` in both reporters
- **Impact**: a coverage regression is pushed as pre-existing
- **Recommendation**: refuse any `ℹ Error:` / `# Error:` line; allow-list node's `#` summary keys
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: A second node summary resets the trailer check**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.238.bug.12.second-node-summary-resets-the-trailer-check.md](./task.238.bug.12.second-node-summary-resets-the-trailer-check.md)
- **Observation**: probe `log-trailer-between-two-runs` reproduced
- **Impact**: only a gate that continues past a failing step; this repository's `&&` chain cannot produce it
- **Recommendation**: never reset the first non-node line
- **Priority**: P2

### LOW Severity Issues (1)

- A spec `test at` line with no `✖` line after it is dropped silently rather than refused. Found
  while re-expecting cycle 4's `log-path-option-shaped` probe. Future item.

**Total Issues**: HIGH: 2, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

There is no change to the bounded base run. The new checks are single awk passes over the log.

### Reliability — CONCERNS

- PRB5-1 (bug.12).
- A non-node red printed *before* node's results is not examined at all. The classifier relies on
  the gate stopping at its first failing step. Recorded as a future item.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 57 (`task.238.qa.5.security.run.json` `totals.executed`); escaped 0
- base-argument 8/8 and pr-argument 8/8 engage (`task.238.dod.1.security.cases.3.json`).
  open-coverage-check engages 24/24. log-test-paths is 16/17, with `log-trailer-between-two-runs`
  reproduced.
- Two cycle 4 cases were re-expected for the pair parser (`task.238.qa.5.security.cases.2.json`):
  - `log-path-dot-dotdot`: refused earlier, as "names no file".
  - `log-path-option-shaped`: its log had a dangling `test at` line, so it is rewritten as a paired
    path.
- The fixture is `task.238.qa.5.security.setup.sh`. It now gives the head a commit of its own,
  because a base that contains HEAD is refused.
- Two reviewer HIGHs (CR5-1, CR5-2) still widen `pre-existing`, which is the outcome the task
  requires to stay narrow.

### Maintainability — PASS

Each cycle 4 fix is held by a committed test. QA's spot mutations are listed under Code Review.

---

## Code Review

Advisory. `code_review_blocking=true` was passed by the pipeline, so `category: bug` with
`confidence: high` findings were promoted.

**Correctness bugs (3):**
- [high/high] `shared/resources/fast-gate-outcome.sh:89`: spec failures are keyed by leaf name, and
  the summary omits the describe → key on file plus `line:column`. Promoted as TASK-238-CR5-1
  (bug.10); reproduced by QA.
- [high/high] `shared/resources/fast-gate-outcome.sh:111`: `trailer()` ignores node's own
  diagnostic errors and accepts any `#` TAP line → refuse `ℹ Error:` / `# Error:` and allow-list
  the summary keys. Promoted as TASK-238-CR5-2 (bug.11); reproduced by QA in both reporters.
- [medium/medium] `shared/resources/qa-ci-read.sh:104`: `gh run list --branch` also returns
  pull_request runs from a branch named like the base → add `--event push`. Advisory; this is
  cycle 4's CR-5 again.

**Cleanups (0)**

Anchors: `finding-anchors.js` returned `ok` for all 3 findings.

Provenance: `fast-gate-outcome.sh` and `qa-ci-read.sh` are new on this branch, so no finding is
pre-existing at the base.

Boundary: `true`. The probes executed are listed under Security.

Platform variance: not applicable. No environment-derived value reaches a validating consumer in
the cycle 4 diff.

Mutation spot check (snapshot, mutate with Edit, restore from the snapshot; `git status` clean
after):

- mutation-proven: `fast-gate-outcome.sh` compares leaf names only (`cut -f2`) → "a head-only
  failure that shares its name with a base failure in another file (bug.5)" → covered
- mutation-proven: `qa-ci-read.sh` drops the selector key match → both "another selector" / "same
  selector" Bitbucket cases → covered
- mutation-proven: the §5c awk drops `tolower` → "open-coverage check: a capitalised value → 1" →
  covered

That is 3 of the 13 mutations qa-fix recorded in `4ef29ed1`, re-run by QA.

---

## Regression Testing

| Area | Status | Evidence |
| --- | --- | --- |
| Fast-gate classifier suite | PASS | 42/42 |
| qa-ci-read suite | PASS | 25/25 |
| PR-review loop parity suite | PASS | 60/60 |
| Full fast gate | PASS | ci:fast 6519/0 at `4ef29ed1` (qa-fix cycle 4) |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/fast-gate-outcome.sh`
- `shared/resources/qa-ci-read.sh`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5c and the three-outcome table
- The three changed test files

### Test Commands Executed

```bash
command node --test evals/shared/tests/qa-loop-fast-gate-outcomes.test.mjs shared/resources/tests/qa-ci-read.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs … (4 controls, record task.238.qa.5.security.run.json)
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file {each changed prose file} --diff-base {merge base} --copy-as skills:.agents/skills --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 770
node --test [--test-reporter=tap] [--experimental-test-coverage --test-coverage-lines=100] api.test.mjs   # CR5-1 / CR5-2 reproductions, scratch repository
```

### Coverage Report

Not measured: the suite has no coverage tooling, and its tests are fixture and behaviour tests.

---

## Recommendations

### Immediate Actions (Blocking)

1. bug.10 (CR5-1): key spec and TAP failures on file plus `line:column`.
2. bug.11 (CR5-2): refuse node diagnostic error lines; allow-list node's `#` summary keys.
3. bug.12 (PRB5-1): never reset the trailer's first non-node line.

### Short-term Actions (Non-Blocking)

1. CR-3: `--event push` for the GitHub base reading.
2. State in the step doc that the classifier relies on the gate stopping at its first failing step,
   or refuse known non-node error shapes printed before node's results.
3. Refuse a dangling spec `test at` line.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two HIGH correctness defects in the `pre-existing` boundary, both reproduced, and
one MEDIUM measured by the probe engine.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: None

---

**QA Report**: co-located at `task.238.qa.5.qa-loop-acts-on-signals-it-has.md`
**Gate File**: co-located at `task.238.gate.5.qa-loop-acts-on-signals-it-has.yml`
**Next Steps**: `/qa-fix` cycle 5 on bug.10 to bug.12. Cycle 5 is the last budgeted cycle, so the
loop-limit escalation follows the fix.
