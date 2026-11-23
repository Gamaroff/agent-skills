# QA Report: Task 305 - Jira sync maps the superseded status

**Task**: [Link to task document](./task.305.jira-sync-maps-superseded-status.md)
**Gate File**: [task.305.gate.1.jira-sync-maps-superseded-status.yml](./task.305.gate.1.jira-sync-maps-superseded-status.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-23
**Testing Completed**: 2026-11-23
**Gate Status**: PASS

---

## Executive Summary

The change adds `superseded` to the Jira status map and both terminal sets, a `superseded:` line to the generated GitHub ladder, and the matching doc rows. The diff is correct and each addition is held by a committed test that turns red when the addition is removed.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#930)

### Testing Approach

- [x] Automated Testing (new suite, neighbouring suites, fast gate on the LAN server)
- [x] Regression Testing
- [x] Code Review (inline, see below)
- [ ] Manual, performance and security testing: not applicable

### Review Methodology

Direct tools only (small task, 4 phases, Low risk). First review, cycle 1.

Diff review: code review. It ran **inline**, not in a dispatched subagent, so independent review did not run for this cycle. The source diff is three small hunks, all read in full.

Step 4b: not applicable — no runnable prose in the change set (the only Markdown edits are table rows and a sentence).

CI on d8f914c75b83: pending. CI is gated once, at `/finalise`.

---

## New Findings This Cycle

Not a re-review. The findings are listed under Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: The Jira map | PASS | Verified | `superseded` in `DEFAULT_STATUS_MAP`, `TERMINAL_LOCAL_STATUSES` and `NEGATIVE_LOCAL_STATUSES` (`jira-sync.js:3468`, `:3517`, `:3532`) |
| Phase 2: One definition, four scripts | PASS | Verified | A test loads each of the four sync scripts and deep-equals its `STATUS_MAP` to the shared map |
| Phase 3: The GitHub path | PASS | Verified | `gh-stage.js:1947` writes `superseded:` beside `cancelled:` |
| Phase 3b: The documented mapping | PASS | Verified | Lifecycle table row and `configuration.md` row and terminal-fallback sentence |
| Phase 4: Bundle and mutation | PASS | Verified | `bundle:check` clean, 129 skills |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `mapStatusCandidates("superseded")` returns the cancelled family | equal | equal | PASS | Held by test 1 |
| Negative resolution and terminal fallback | both true | both true | PASS | Held by tests 3 and 4 |
| GitHub scaffold carries `superseded` aimed where `cancelled` is | equal targets | equal | PASS | Held by test 8, which calls `renderWorkflowFile` |

**Performance Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| No extra transition lookups | 10 / 10 / 8 | 10 / 10 / 8 | PASS | Test 7 |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `bundle:check` clean | 0 problems | 0 problems | PASS | 129 skills |
| `CI=true npm run test:remote` green | green | 8725 tests, 0 failed | PASS | Run by the develop step on the same code at `d8f914c75` |
| Documentation | updated | updated | PASS | CHANGELOG entry cites `(task 305)`; criteria-drift is clean |

---

## Breaking Changes Validation

None. A consumer `jira.statusMap` entry for `superseded` still overrides the default.

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 2 (both recorded below under Code Review and in the gate's `recommendations.future`).

---

## NFR Assessment

### Performance — PASS
Lookup counts unchanged (test 7).

### Reliability — PASS
The override path is untouched. The terminal fallback fires only for exactly one done-category transition.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No input gate is added, and the task's criteria carry no boundary signal (`boundary: false`; classifier printed an empty list).

### Maintainability — PASS
One list shared by `cancelled` and `superseded`. No copy.

---

## Code Review

Advisory unless blocking resolved true; `code_review_blocking=true` was passed and no finding is a high-confidence bug.

**Correctness bugs (0):** none.

**Cleanups (2):**

- [low] `shared/resources/jira-sync.js:5221` — `CANONICAL_LOCAL_STATUSES` (what `--probe-workflow` reports on) lists `cancelled` and not `superseded`, so the probe never shows the transition chosen for it → add the key. Low value while it shares the cancelled list. Not provenance-checked against base as a bug: it is an omission, not a misbehaviour.
- [low] `shared/resources/document-status-lifecycle.md:201` — the `ALLOW=(...)` vocabulary snippet lacks `superseded`. Present on the base branch since PR #878, so `pre-existing`.

mutation-proven: dropped `superseded` from `DEFAULT_STATUS_MAP` → 4 of 8 new tests red (`mapStatusCandidates('superseded') is the cancelled family…`, `the lookup ignores case…`, `a board that offers Won't Do…`, `each of the four sync scripts…`) → covered
mutation-proven: dropped `superseded` from `TERMINAL_LOCAL_STATUSES` → `superseded is terminal and negative…` and `a board with only a done-category transition…` red → covered
mutation-proven: dropped `superseded` from `NEGATIVE_LOCAL_STATUSES` → `superseded is terminal and negative…` red → covered
mutation-proven: dropped the `superseded:` ladder line in `gh-stage.js` → `the generated GitHub ladder carries superseded…` red → covered

These four proofs were run by the develop step in this session against the committed test file, each reverted afterwards. QA did not repeat them this cycle; the tree is unchanged since (`HEAD` is `d8f914c75`, working tree clean outside the report).

---

## Regression Testing

`gh-stage.test.mjs` and `jira-ready-for-development-candidates.test.mjs` ran with the new suite: 95 tests, 0 failed. The fast gate on the LAN server ran 8725 tests, 0 failed.

---

## Test Artifacts

### Files Reviewed

`shared/resources/jira-sync.js`, `shared/resources/gh-stage.js`, `shared/resources/document-status-lifecycle.md`, `docs/reference/configuration.md`, `CHANGELOG.md`, `shared/resources/tests/jira-sync-superseded-status.test.mjs`.

### Test Commands Executed

```bash
command node --test shared/resources/tests/jira-sync-superseded-status.test.mjs shared/resources/tests/gh-stage.test.mjs shared/resources/tests/jira-ready-for-development-candidates.test.mjs
npm run bundle:check
CI=true npm run test:remote
```

Standards-named validation: `npm run validate -- skills/<changed-skill>/` not run, because no `SKILL.md` changed. ShellCheck not run, because no `.sh` changed. `npm run generate-catalog` not run, because no skill was added or edited.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Add `superseded` to `CANONICAL_LOCAL_STATUSES`.
2. Add `superseded` to the lifecycle `ALLOW` snippet.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by a committed test that fails when its line is removed, and the diff has no correctness bug.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.305.qa.1.jira-sync-maps-superseded-status.md`
**Gate File**: co-located at `task.305.gate.1.jira-sync-maps-superseded-status.yml`
**Next Steps**: review-pr (Step 5c), then finalise.
