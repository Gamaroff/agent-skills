# QA Report: Task 219 - General-bug registry status: one writer at every transition

**Task**: [Link to task document](./task.219.bug-registry-status-mirror.md)
**Gate File**: [task.219.gate.2.bug-registry-status-mirror.yml](./task.219.gate.2.bug-registry-status-mirror.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: PASS

---

## Executive Summary

QA cycle 2 ran after `/finalise` halted on one Definition of Done gap, PERF1, which had no test pinning "one registry read and at most one write per call". Commit `3f98c7b7` adds that test, and two mutations each turn it red. The whole-branch refute review found one low/low-confidence bug and one cleanup, neither promoted. The classifier probe re-ran with 19 cases and held.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

Gate 1 (`head: 7980a252`) was PASS with no `top_issues`. This cycle closes a finalise DoD gap, not a QA finding.

| Source | Item | Status |
| --- | --- | --- |
| DoD 1 gap | PERF1: no test pins one registry read and at most one write per `--bug-status` call | ✅ FIXED (`3f98c7b7`) |
| Gate 1 future | CR-1, CR-2, CR-3 (low, advisory) | Not addressed. Still advisory, carried forward in gate 2 |

---

## New Findings This Cycle

- **[low/low]** `shared/resources/registry-tick.js:602`: a `select-next.mjs` older than the `BUG_LIFECYCLE_STATUSES` export throws a TypeError here (exit 2, stack trace) instead of answering `engine-unavailable`. The fix is to check both imported names and answer `engine-unavailable` when either is missing.
- **[cleanup]** `shared/resources/tests/registry-tick.test.mjs:1585`: the I/O-count preload counts only the `readFile` family and string paths. A second read through `openSync`, `createReadStream` or a URL/Buffer path would pass. The fix is to widen the wrapped set.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#708)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b refute pass. This is a re-review whose only code change is one test. The reviewer was dispatched at 14:16Z and returned 210515 ms later (`duration_ms`). No mutation ran while it was reading. The two proofs below ran before dispatch, during the gap fix, and were restored from a `cp` snapshot.

Re-review scope: unscoped whole-branch diff `origin/develop...HEAD` (cycle 2, refute pass), 10 files. It excludes the 5 bundled `references/registry-tick.js` copies, which differ from the source only by the AUTO-GENERATED banner (`bundle:check` 0 problems).

Step 4b: no in-scope runnable prose changed since gate 1. `skills/qa-fix/SKILL.md` and `skills/develop-bug/SKILL.md` are unchanged since `7980a252`, so gate 1's Step 4b record stands.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine `--bug-status` mode | PASS | Verified | registry-tick.test.mjs 69/69 |
| Phase 2: develop-bug + qa-fix call sites | PASS | Verified | develop-bug.test.js 24/24 |
| Phase 3: drift test + CHANGELOG | PASS | Verified | bug-registry-drift.test.mjs 4/4 |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

Unchanged from gate 1 except PERF1, which now cites a committed per-PR test.

| Criterion | Evidence | Status |
| --- | --- | --- |
| PERF1: one registry read, at most one write per call | `registry-tick.test.mjs` "--bug-status reads the registry once and writes it at most once per call": mirrored 1/1, already 1/0, dry-run 1/0 | PASS |
| PERF2: no change to the task tick's output | the existing task-tick cases pass unchanged (69/69) | PASS |
| CQ1: `npm run ci` passes | local `ci:fast` exit 0, 5,991 pass / 0 fail, with the `.agents/skills` symlink aside | PASS |
| CQ2: `quick_validate.py` for qa-fix, develop-bug, finalise | all three ✓ | PASS |
| CQ3: every change mutation-proven | 2 of 2 for this cycle's change (below) | PASS |

---

## Breaking Changes Validation

None. The change is a test only.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

CR-1 and CR-2 above. Both are in the gate's `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

PERF1 is now held by a committed test that counts registry fs calls inside the CLI process.

### Reliability — PASS

Unchanged since gate 1. CR-1 is a narrow version-skew case, low/low.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 19 (from `task.219.qa.2.security.run.json` `totals.executed`). Escaped: 0
- Boundary: the general-bug classifier in `bugStatus`. Cases came from the finalise DoD plan: 15 hostile rejected, 4 legitimate accepted.

### Maintainability — PASS

CR-2 is an advisory widening of the test preload.

---

## Code Review

The findings below are advisory. None is `bug` + `confidence: high`, so `code_review_blocking=true` promotes nothing.

**Correctness bugs (1):**

- [low/low] `shared/resources/registry-tick.js:602`: a stale `select-next.mjs` without the `BUG_LIFECYCLE_STATUSES` export throws instead of answering `engine-unavailable`. The fix is to guard both imported names.

**Cleanups (1):**

- `shared/resources/tests/registry-tick.test.mjs:1585`: the preload wraps only the `readFile` family and string paths. The fix is to wrap `openSync`/`createReadStream` and normalise URL/Buffer paths.

Anchors: 2 checked against `HEAD`, both `ok`.

boundary: true (classifier unchanged since gate 1). probes_executed: 19, escaped: 0.

mutation-proven: a second `fs.readFileSync(registryRel)` in `bugStatus` → "--bug-status reads the registry once…" red (`mirrored: registry reads`) → covered
mutation-proven: dropped the `!opts.dryRun` guard on the write → "--bug-status reads the registry once…" red (`registry writes`) → covered

Two of two proofs reverted; `git diff` clean after each restore.

**Platform variance**: there is no environment-derived value passed to a validating consumer. The test also passes with `TMPDIR=/tmp node --test --test-name-pattern="reads the registry once" shared/resources/tests/registry-tick.test.mjs` (exit 0).

---

## Regression Testing

| Area | Result |
| --- | --- |
| registry-tick task tick and `--bug-status` | PASS (69/69) |
| develop-bug skill structure | PASS (24/24) |
| bug-registry drift | PASS (4/4) |
| Full fast gate | PASS (5,991 / 0) |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/tests/registry-tick.test.mjs` (the new test)
- The whole branch diff (10 files), through the refute reviewer

### Test Commands Executed

```bash
command node --test shared/resources/tests/registry-tick.test.mjs
command node --test skills/develop-bug/tests/develop-bug.test.js
command node --test evals/shared/tests/bug-registry-drift.test.mjs
python3 skills/create-skill/scripts/quick_validate.py skills/{qa-fix,develop-bug,finalise}
npm run ci:fast   # with .agents/skills moved aside
node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'cli:shared/resources/registry-tick.js' --argv '["--bug-status","--file","{input}"]' --cases-file task.219.dod.1.security.cases.json --name bug-status-classifier --record task.219.qa.2.security.run.json --json
```

### Coverage Report

Not measured (the repository has no coverage tooling for `node --test`).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: guard the dynamic import's exported names.
2. CR-2: widen the I/O-count preload.
3. Gate 1's CR-1 to CR-3 remain open as advisory.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The DoD gap is closed by a mutation-proven test, and the refute review found nothing that gates.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.219.qa.2.bug-registry-status-mirror.md`
**Gate File**: co-located at `task.219.gate.2.bug-registry-status-mirror.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise`
