# QA Report: Task 282 - review-task resolves the right task and reports every review

**Task**: [Link to task document](./task.282.review-task-resolves-the-right-task-and-reports-every-review.md)
**Gate File**: [task.282.gate.2.review-task-resolves-the-right-task-and-reports-every-review.yml](./task.282.gate.2.review-task-resolves-the-right-task-and-reports-every-review.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Testing Completed**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2 re-reviewed the whole branch diff to refute it, starting with cycle 1's fixes. All three cycle 1 findings are fixed. The full CI run is green. One new medium finding: the bare-number block this change adds names a script path that does not exist from the repository root in a consumer repository.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (T282-QA-4)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#921)

### Testing Approach

- [x] Automated Testing (full CI run on the LAN server)
- [x] Performance Testing (the five-pair wall-time comparison)
- [x] Regression Testing
- [x] Security Review (probe)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff review. Reviewer dispatched 23:30:25Z; it returned in 75 s (`duration_ms` 75181 from its completion notice). The review was not independent of the pipeline's own context beyond that one reviewer; no second reviewer ran.

CI on 3d57b20b1c07: green (`qa-ci-read.sh`: `CI_STATE=SUCCESS`).

Diff review: code review, refute pass. The diff was `origin/develop...HEAD` for the whole branch with two sets left out of the patch: the generated `skills/*/references/` copies (byte copies of the `shared/resources/` sources, held by `bundle:check`, 0 problems) and the task's own documents. 3172 lines, 11 files.

Re-review scope: whole branch diff (cycle 2 is a refute pass).

Step 4b: ran over `review-task`, `review-story`, `review-bug` SKILL.md and the step-0 and step-2 shared docs. No changed block executed: of the changed blocks, 4 were refused as `mutating` and 1 is a placeholder (the review-task resolution block, `<digits>`). Findings `zero-blocks-executed` and `changed-blocks-not-executed` are therefore reported. I ran the step-0 resolver block by hand in a consumer-shaped directory instead (see T282-QA-4); a by-hand run does not count toward the probe total.

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --- | --- | --- |
| T282-QA-1 resolver wraps an over-long digit string | FIXED | 18446744073709551617, 9223372036854775808 and 1000000000 all exit 2; 999999999 and 0000000000005 accepted; mutation proof below |
| T282-QA-2 wall-time criterion unmeasured | FIXED | median 730 s against 728 s, table below |
| T282-QA-3 task document describes the old marker design | FIXED | the Marker bullet, Breaking Changes line and Phase 1 checkbox read as the shipped design; no Success Criteria line edited (`criteria-drift.js`: clean) |

## New Findings This Cycle

- **[medium]** `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:117` — the bare-number block invokes the script by a path that does not resolve from the repository root in a consumer repository → T282-QA-4 (origin: code-review CR-1, reproduced by QA).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Numbered review stage | PASS | Verified | engine alias and call sites; `comment-slot-coverage` green |
| Phase 2: Skip rule and bare-number resolution | CONCERNS | Verified | resolver correct; block path T282-QA-4 |
| Phase 3: Tests, bundle and sweep | PASS | Verified | `bundle:check`: 129 skills, 0 problems |

**Overall Phase Completion**: 3/3 phases passed their tests; 1 carries a finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| A second review's verdict is posted, shown by a named test | `tracker-comment.test.mjs`: the keying test (two reviews, two comments; the first review's re-run reads `already`) | PASS |
| A bare task number resolves to the task, shown by the fixture session | `resolve-bare-task.test.mjs` (8 tests: this tree, worktree, branch, none, registry, usage, digit cap, duplicates), run in this cycle: pass 8, fail 0 | PASS |
| `CI=true npm test` wall time within 10% of `develop` (median of five alternating runs, uptime beside each) | table below | PASS |
| Each change has a mutation proof | cycle 1 recorded three; cycle 2 re-proves the digit cap | PASS |
| `bundle:check` 0 problems; `CI=true npm test` passes | `bundle:check` 0 problems; `# tests 8612 / pass 8609 / fail 0` (3 skipped) | PASS |
| `comment-slot-coverage.test.mjs` passes with the new stage form | passes inside the full run | PASS |
| An existing review marker on a live issue still reads `already` for review 1 | the `-1` and bare cases in the keying test | PASS |

### Wall time (T282-QA-2)

Five alternating pairs of `CI=true npm run test:remote -- --run test` on the LAN server, develop `e6636d97d` against branch head `ce96e4744`. Server load is the first figure of the one-minute `uptime` average, read over ssh before each run.

| Pair | develop wall (s) | branch wall (s) | load before develop / branch |
| --- | --- | --- | --- |
| 1 | 1312 | 728 | 17.23 / 0.29 |
| 2 | 727 | 726 | 0.47 / 0.17 |
| 3 | 726 | 727 | 0.95 / 0.74 |
| 4 | 730 | 770 | 0.21 / 5.79 |
| 5 | 999 | 1051 | 1.51 / 2.04 |

Median wall: develop 730 s, branch 728 s (-0.3%). Median test duration: 611.4 s against 609.2 s (-0.4%). All ten runs exited 0. The head the runs measured (`ce96e4744`) differs from this cycle's head (`3d57b20b1`) only by documents under `docs/tasks/task.282.*`; the full run below on `3d57b20b1` reports a test duration of 609.2 s, in line with the median.

---

## Breaking Changes Validation

None documented, none found: the engine reads `review-<kind>-1` as the bare marker, so a live bare marker still reads `already`. **PASS**

---

## Issues Found

### MEDIUM Severity Issues (1)

**T282-QA-4: the bare-number block's script path does not resolve in a consumer repository**
- **Severity**: MEDIUM (reviewer rated it high; re-rated with a measurement, see Code Review)
- **Category**: Reliability
- **Observation**: `develop-pipeline-step-0-resolve-and-prepare.md:117` says to run the block "from the repository root" and calls `bash shared/resources/resolve-bare-task.sh`, which the bundle rewrites to `bash references/resolve-bare-task.sh`. In a checkout shaped like a consumer's (skill copied to `.agents/skills/develop-task`, cwd the repository root) it exits 127 (`No such file or directory`) and the `||` branch HALTs a plain bare number. `bash .agents/skills/develop-task/references/resolve-bare-task.sh 5` answers `found docs/tasks/task.5.x/task.5.x.md` for the same input.
- **Impact**: `/review-task 243` and `/develop-task 243` HALT instead of resolving, if the block is run as written from the repository root.
- **Recommendation**: use the `.agents/skills/{skill}/references/` path the neighbouring blocks use, keep the bundle dependency, and add a test that runs the delivered block from a consumer-shaped directory.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS
Median wall time -0.3% against develop; see the table above.

### Reliability — CONCERNS
T282-QA-4.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 32 (run record `task.282.qa.2.security.run.json`: executed 32, reproduced 0, escaped 0)
- `boundary: true`; `boundary_signals: []` (`probe-boundary-signals.mjs` found no phrase in the criteria). The probe ran the resolver through the `shell-argv` form under bash and zsh with 15 hostile and 4 legitimate inputs, including three over-long digit strings that wrapped to task 1 before the fix. A calibration case (`5`, legitimate) was accepted first.

### Maintainability — PASS
One definition of the stage lists, held equal by a test.

---

## Code Review

Route: code review, refute pass over the whole branch diff. Anchors checked with `finding-anchors.js`: all three `ok`.

**Correctness bugs (3):**
- [high/high → re-rated medium] `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:117` — CR-1, the script path above → promoted to T282-QA-4. **Reproduced by QA** (consumer-shaped directory, exit 127), with the control that the `.agents/skills/` path answers `found`; provenance 5b: the block is new in this diff, so it is not pre-existing. **Re-rating measurement**: `git grep` over canonical sources finds 158 sites that invoke a bare `references/X` and 430 that use the `.agents/skills/` path, so the bare form is a repository convention that an agent resolves against the skill directory, and the failure here is a HALT rather than a wrong action. Whether this block is read that way is unverified. Reviewer severity: high. Confidence unchanged: high.
- [medium/medium] `skills/review-story/SKILL.md:2627` — CR-2, report-less reviews pass the next unused N, so a second one reads `already`. Not reproduced as a defect: it is the design the task document states ("a second one reuses that N and dedupes"). Advisory; `recommendations.future`.
- [low/low] `shared/resources/develop-pipeline-step-2-review.md:475` — CR-3, `--json` reports the canonical stage (`review-task-1` prints `review-task`, reproduced with `--dry-run`). The same paragraph says review 1 is the bare marker. Advisory; `recommendations.future`.

**Cleanups (0).**

mutation-proven: `n=${n#…}` cap block replaced by `n=$((10#$n))` → `a digit string too long to be a task id is refused, never wrapped to another task (T282-QA-1)` went red (7 pass, 1 fail) → covered

The mutation was taken from a `cp` snapshot; after the restore `cmp` printed nothing, `git diff` on the file was empty, and the file's 8 tests pass again. Cycle 1's three proofs (alias call removed, stage list reverted, the dot after the task number dropped) are not repeated: none of those files changed since. Not run this cycle: proofs of the document edits (no test holds prose).

---

## Regression Testing

Full `CI=true npm run test:remote -- --run format:check --run test --run eval:all --run validate:all --run check:generated --run bundle:check --run lint:shell --run lint:secrets` on `3d57b20b1`: every phase ran and the command exited 0. `# tests 8612`, `# pass 8609`, `# fail 0`, `# duration_ms 609150`. The `lint:secrets` phase printed `gitleaks not installed — lane skipped (CI runs the pinned binary)`, so that lane did not run here; the hosted CI check for the head reads green.

---

## Test Artifacts

### Files Reviewed
`shared/resources/resolve-bare-task.sh`, its test, `tracker-comment.js`, `stakeholder-summary.js`, `develop-pipeline-step-0-resolve-and-prepare.md`, `develop-pipeline-step-2-review.md`, the three review SKILL.md call sites, the task document and implementation report.

### Test Commands Executed
```bash
CI=true npm run test:remote -- --run format:check --run test --run eval:all --run validate:all --run check:generated --run bundle:check --run lint:shell --run lint:secrets
CI=true command node --test shared/resources/tests/resolve-bare-task.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'shell-argv:shared/resources/resolve-bare-task.sh' --argv '["{input}"]' --cases-file <cases> --fixture-setup <setup.sh> --record task.282.qa.2.security.run.json --json   # 32 executed, 0 escaped
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # clean
bash .agents/skills/qa-task/references/changelog-cites.sh task.282   # (task 282)
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 921   # CI on 3d57b20b1c07: green
```

### Coverage Report
Not collected: the repository's test runner reports no coverage figure.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T282-QA-4.

### Short-term Actions (Non-Blocking)
1. The four `recommendations.future` items in the gate (CR-2, CR-3 of this cycle; the leading-zero stage suffix and the `git log --all` residuals from cycle 1).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the cycle 1 findings are closed and verified; one new medium finding in the delivered prose.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T282-QA-4

---

**QA Report**: co-located at `task.282.qa.2.review-task-resolves-the-right-task-and-reports-every-review.md`
**Gate File**: co-located at `task.282.gate.2.review-task-resolves-the-right-task-and-reports-every-review.yml`
**Next Steps**: qa-fix cycle 2 for T282-QA-4, then a cycle 3 re-review.
