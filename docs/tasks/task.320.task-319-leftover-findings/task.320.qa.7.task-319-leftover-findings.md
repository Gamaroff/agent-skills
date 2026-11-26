# QA Report: Task 320 - Task 319's leftover findings are closed

**Task**: [Link to task document](./task.320.task-319-leftover-findings.md)
**Gate File**: [task.320.gate.7.task-319-leftover-findings.yml](./task.320.gate.7.task-319-leftover-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-26
**Testing Completed**: 2026-11-26
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 7 is a re-entry after DoD run 2. The owner accepted the cycle 6 residual and moved it to task 326. To do that, criterion 1 was amended (approved), a `deferrals.json` was written, and `finalise.deferralApprover` was set in `skills-config.yaml`. That key is the only change on a code path since gate 6.

The full suite is green. Every strict config reader accepts the new block. The DoD 2 probe plan reproduces only the deferred residual: nothing new, no escapes.

**Overall Assessment**: CONCERNS. Security stays CONCERNS because the residual is deferred, not fixed. Nothing is open in the queue.
**Deployment Recommendation**: CONDITIONAL. Task 326 closes the residual.

---

## Re-Review Context

| Previous finding (gate 6) | Status now |
| --- | --- |
| T320-CR-601 (medium) | ⏸ DEFERRED to task.326. It reproduces unchanged (plan entry 21, two cases). Criterion 1 is amended to match, approved by the owner. |
| T320-CR-602 (low) | ⏸ DEFERRED to task.326. It reproduces unchanged (plan entries 19 and 20, four cases). |
| T320-CR-603 (low) | ⏸ DEFERRED to task.326. It reproduces unchanged (plan entry 21, two cases). |
| DoD 2 gap: criterion 10 command not named | ✅ FIXED. QA report 6 now names the command (see CR-1 below for the form). |

## New Findings This Cycle

None in the gate. Five low advisory findings come from the diff review (see Code Review). None is high-confidence, and none was reproduced by execution.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases are completed
- [x] Tests pass
- [x] Breaking changes are documented
- [x] Code is on the feature branch with an open PR (#949)

### Review Methodology

Direct tools plus one read-only diff reviewer (re-review).

- Re-review scope: files changed since gate 6 (head `7cae65a149fb`; 14 files, after leaving out the DoD 2 probe records and cases).
- Diff review: code review. `skills-config.yaml` is in the change set, and it is not documentation under `ci.docsOnly`.
- Reviewer: dispatched 2026-11-26, duration 211855 ms (completion notice).
- `CI on 7f22f93d213e: head mismatch (PR head f1ad02845373)`. The cycle's commits are not pushed yet, so nothing was mapped.
- Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` is in the change set.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1–4 (task 320 phases) | PASS | Verified | No engine changed since gate 6 |
| Re-entry change: `finalise.deferralApprover` | PASS | Verified | `FINALISE_KEYS` holds it (`finalise-rerun-at-head.js:125`). `parseConfig`, `parsePipelineConfig` and `parseRerunList` accept the block. `read_nested_config_key` returns the owner. |

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Listed command past a fenced `## ` line refused (T319-CR-1201) | PASS (amended) | `finalise-rerun-at-head.test.mjs:1246`. The HTML-block case moved to task 326. The amendment reads `appended` and is approved (criteria-drift). |
| 2–9 | As at gate 6 | PASS | Unchanged code. Tests listed in the traceability matrix. |
| 10 | No new test over 30 s | PASS | Re-measured at `5c9044f38` (see "Five timed runs" below). The earlier PASS rested on QA report 6's runs at `7cae65a14`, which is not tree-equivalent to the head (`skills-config.yaml` changed in `7f22f93d2`), so it did not hold. DoD run 3 found this gap. |
| 11–12 | Red-first, mutation table | PASS | QA reports 1–6. No new test this cycle. |
| 13 | `npm test` under CI, bundle clean | PASS | `npm run test:remote`: 8898 tests, 8895 pass, 0 fail, 3 skipped. `bundle:check`: 129 skills, 0 problems. |
| 14 | `npm run validate -- skills/develop-next/` | PASS | `✓ develop-next` |
| 15 | CHANGELOG cites (task 320) | PASS | `changelog-cites.sh task.320`: cites (task 320) |
| 16–17 | Configuration reference, task 319 entries | PASS | Unchanged since gate 6 |

---

## Breaking Changes Validation

There is no new breaking change. The new `finalise:` block is a key that consumers do not have to set: when it is unset, nothing is deferred, which is the behaviour before.

---

## Issues Found

HIGH: 0. MEDIUM: 0. LOW: 0 in the gate. Five low advisory findings are listed under Code Review.

---

## NFR Assessment

### Performance — PASS

No engine changed. Criterion 10 was re-measured at the head (below).

### Five timed runs (criterion 10)

Added 2026-11-26 to close DoD run 3's gap. The four suites were run at `5c9044f38c15c82bd1e6bfe4c982c9575f54f727`, which is the head and is tree-equivalent to `dbdb8f139`. They ran five times in a row on the laptop (the host QA report 6 used), with nothing else running. Each run had 235 tests, 235 pass, 0 fail. Seconds, as the median of five, then the maximum:

| Test | Median | Max |
| --- | ---: | ---: |
| push-held says what is the remote's … (T319-CR-904, CR-905) | 25.5 | 26.0 |
| a HALT whose push … answers nothing still halts (T319-CR-505) | 21.7 | 22.2 |
| the entry to /finalise: nothing held leaves 5c's set staged … | 13.3 | 13.8 |
| push-held: a push the watcher killed while the script was stopped … (T319-CR-1303, new) | 13.5 | 13.6 |
| what push-held stops is the push and its hook … | 13.3 | 13.5 |
| bitbucket: red, pending or unread CI never merges | 10.8 | 11.7 |

No test reaches 30 s at the median, or at the maximum in any run.

| Run | Load before (1, 5, 15 min) | Load after |
| --- | --- | --- |
| 1 | 2.14, 2.40, 2.57 | 2.29, 2.63, 2.65 |
| 2 | 2.29, 2.63, 2.65 | 2.98, 2.92, 2.77 |
| 3 | 2.98, 2.92, 2.77 | 2.91, 3.27, 2.95 |
| 4 | 2.91, 3.27, 2.95 | 2.81, 3.33, 3.03 |
| 5 | 2.81, 3.33, 3.03 | 3.60, 3.62, 3.19 |

**Command**, complete as run (this also closes CR-1's point about the form):

```bash
out=<scratch directory>
for n in 1 2 3 4 5; do
  uptime > "$out/$n.before"
  CI=true command node --test --test-reporter=tap \
    shared/resources/tests/finalise-rerun-at-head.test.mjs shared/resources/tests/push-policy.test.mjs \
    shared/resources/tests/tick-pr.test.mjs shared/resources/tests/ci-tree-equivalence.test.mjs > "$out/$n.tap" 2>&1
  echo "$?" > "$out/$n.rc"
  uptime > "$out/$n.after"
done
```

The per-test seconds are each test's TAP `duration_ms` across the five `.tap` files, as a median and a maximum. All five exit codes were 0.

### Reliability — PASS

The strict readers accept the new key.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 194 (`totals.executed`), escaped 0
- `boundary: true`. The DoD run 2 plan (22 controls) was re-run at this head. Six case ids reproduce (8 probes), and all six are the residual. `finalise-deferral-match.js` answers `matched` for each against `deferrals.json` with the configured owner. Record: `task.320.qa.7.task-319-leftover-findings.security.run.json`.
- `boundary_signals: ["refused","refuses"]`

### Maintainability — PASS

---

## Code Review

**Correctness bugs (1):**

- [low/medium] `docs/tasks/task.320.task-319-leftover-findings/task.320.qa.6.task-319-leftover-findings.md:118`. The command block reads `$out` and `$n`, and nothing in it sets either one or loops five times. Fix: put the loop and the `out=` line in the block, or label it one run's body.

**Cleanups (4):**

- `docs/tasks/task.326.task-320-accepted-residual/task.326.task-320-accepted-residual.md:84`. `<pre>` is listed among the type 6/7 blocks, but it is type 1 and ends at `</pre>`. The plan already says so.
- `docs/tasks/task.326.task-320-accepted-residual/task.326.task-320-accepted-residual.md:39`. "cases 19, 20 and 21" should read "plan entries 19, 20 and 21 (case files 20, 21, 22)".
- `docs/tasks/task.326.task-320-accepted-residual/task.326.task-320-accepted-residual.md:62`. Criterion 8 has no exception. Only criterion 1 was amended.
- `docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md:427`. criteria-drift extracts the approver as `Lorien Gamaroff (2026-11-26)`. A comma before the date would give exactly the owner name.

None was promoted. None is a high-confidence bug, and none was reproduced by execution. Every anchor checks `ok` (`finding-anchors.js`).

---

## Regression Testing

The full suite on the LAN server (CI-parity container) passes: 8898 tests, 0 fail. `shellcheck` is clean.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run test:remote                       # 8898 tests, 8895 pass, 0 fail, 3 skipped
npm run -s validate -- skills/develop-next/   # ✓ develop-next
npm run -s bundle:check                   # 129 skill(s), 0 problems
npm run -s lint:shell                     # shellcheck: clean
command node .agents/skills/finalise/references/security-probe-plan.mjs --plan <dod.2 plan, cases inlined> \
  --record task.320.qa.7.task-319-leftover-findings.security.run.json \
  --cases-base task.320.qa.7.security.cases --repo-root . --json   # 194 executed, 6 reproduced, 0 escaped
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json   # #1 appended, approved
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Nothing is open. Security is CONCERNS on the deferred residual alone.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL. Task 326 closes the residual.

**Next Steps**: 5c PR review. The five advisory doc findings fit the 5c doc-only carry.
