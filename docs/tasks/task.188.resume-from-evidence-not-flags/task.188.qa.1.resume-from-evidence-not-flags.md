# QA Report: Task 188 - Resume from evidence, not flags

**Task**: [Link to task document](./task.188.resume-from-evidence-not-flags.md)
**Gate File**: [task.188.gate.1.resume-from-evidence-not-flags.yml](./task.188.gate.1.resume-from-evidence-not-flags.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Testing Completed**: 2026-10-11
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #634 (head `0465ae8e`). All four phases are implemented and every functional
criterion is held by a passing executed or shape test. The new Step 0.1 reconciliation has two
resume-reliability defects: it is silent on Bitbucket because it reads `VCS` before Step 0 resolves
it (CR-1), and its tick check reports a failed look as "not ticked", which routes to a duplicate
Step 4 tick (QA-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and QA-1 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing (one pre-existing load-sensitive timing failure, unrelated)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#634, OPEN)

### Testing Approach

- [x] Automated Testing (executed fixture harness, shape tests, full suite)
- [x] Regression Testing
- [x] Security Review (boundary rule)
- [x] Code Review (independent diff reviewer)

### Review Methodology

Direct tools, plus one read-only Explore diff reviewer (Step 3b), dispatched 13:57:32Z and returned
13:59:38Z (`duration_ms` 95378). First review, so the whole branch diff (`origin/develop...HEAD`, 7
files, 1320-line patch) was reviewed. Traceability mapper not run: the task's Success Criteria are a
checklist, not a table.

Step 4b: both changed `SKILL.md` files ran through `qa-execute-snippets.mjs`. develop-next: 16 bash
blocks, all refused as `mutating`; develop-batch: 12, all `mutating` — `no-executable-blocks`
(information). The blocks this task adds are instead executed by
`merge-delete-branch-guard.test.mjs`, which lifts each one and runs it in a fixture repository.

---

## New Findings This Cycle

First review — every finding below is new.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Merge verdict from the PR's state | PASS | Verified | Both GitHub merge blocks read `gh pr view --json state`; rule stated beside the Bitbucket note; develop-batch cites it |
| Phase 2: A recorded HALT | PASS | Verified | `prNumber`/`halted`/`haltKind` in the schema; Step 2 writes the halt; Step 0.1 halt branch first |
| Phase 3: Reconcile flags before routing | CONCERNS | Partial | CR-1 (Bitbucket), QA-1 (failed look reads as not-ticked) |
| Phase 4: Changelog | PASS | Verified | `[Unreleased]` › Fixed entry names the three changes |

**Overall Phase Completion**: 3/4 phases passed, 1 with concerns

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| Merge exits 1, PR `MERGED` → block exits 0, every site | bash + zsh | bash 2/2 sites × clean/dirty | PASS | `merge-delete-branch-guard.test.mjs`; zsh absent on this host, CI installs it |
| PR not `MERGED` → exit 1, no remote delete, incl. exit 0 | all sites | 2 sites × 4 cases | PASS | includes the exit-0 / `OPEN` control |
| Run state documents the fields; Step 2 writes `halted: true`; Step 0.1 checks it first | shape | held | PASS | `evals/develop-next/protocol/skill-shape.test.mjs` |
| Cleared run, not `accepted` → Step 2 `--defaults`, never Step 3 | shape | held | PASS | same file; old flag-only route asserted absent |
| Both skills reconcile `merged`; develop-next reconciles `ticked`, before routing | shape | held | CONCERNS | ordering held; CR-1 makes the develop-next merge reconciliation a no-op on Bitbucket |
| Roadmap-row check: `[x]` → ticked, `[ ]` → not-ticked | fixture | 5 cases | PASS | includes `T1`/`T10`/`T100` prefix traps and an archived row |

**Performance Criteria:** not applicable (one `gh pr view` per merge and resume; no criterion asserts timing).

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --------- | ------ | ------ | ------ | ----- |
| `npm test` | pass | 5325/5326 | PASS | the failure is `tests/bundle-missing-source.test.js`'s load-sensitive file budget (23.7 s > 20 s), identical with this change stashed; passes 7/7 with its budget knob |
| `npm run bundle:check` | clean | clean | PASS | 129 skills, 0 problems |
| `prettier --check .` | clean | clean | PASS | |
| `quick_validate.py` develop-next, develop-batch | pass | pass | PASS | `npm run validate:all` also clean |
| CHANGELOG entry; "resumes unchanged" sentence | present | present | PASS | shape test holds the sentence |

---

## Breaking Changes Validation

None declared, none found. New run-state fields default to `false`/`null`, and a file without them
resumes unchanged.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: Step 0.1 merge reconciliation is silent on Bitbucket (CR-1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: the block reads `VCS` and the `BB_*` credentials, which only Step 0 item 6 binds. Item 1 runs first, so on a Bitbucket repository `VCS` is empty, the `gh` arm runs and fails, `PR_STATE` is empty, and nothing is reconciled. The executed test prepends `VCS=github`, so it cannot see this.
- **Impact**: the obs #180 case (crash between merge and flag write) is still re-merged on Bitbucket.
- **Recommendation**: make the block resolve its own platform, or refuse loudly when `VCS` is unbound; add an executed case that runs it without injecting `VCS`.
- **Priority**: P1

**Issue: tick reconciliation cannot tell "not ticked" from "could not look" (QA-1, reviewer CR-2)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: `git fetch` is unchecked, `git show … || continue` swallows a failed read, and a node import or parse error exits 1 — each leaves `ROW_TICKED=not-ticked`.
- **Impact**: a failed look routes to Step 4, which re-ticks the row and adds a duplicate Change Log row — the non-idempotent step the task exists to protect.
- **Recommendation**: three answers (ticked / not-ticked / unknown) with distinct exits; check the fetch; on unknown leave the flags as recorded; executed cases for a failed fetch and a failed show.
- **Priority**: P1

### LOW Severity Issues (1)

**QA-2** — the new blocks are boundaries (they refuse on PR state and `git status`), and no
`security-probe.mjs` entry form reaches a fenced prose block, so `probes_executed` is 0. No code
change: finalise will need a recorded override citing the executed fixture harness, until task.181's
`shell-argv:` form exists.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
One extra `gh pr view` per merge and per resume.

### Reliability — CONCERNS
CR-1 and QA-1, both in the new reconciliation.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true` — the merge verdict and the reconciliation refuse on platform and repository
  state. No engine form reaches a prose block (`shell:`, `shell-fn:` and `cli:` all need a file); the
  executed fixture harness covers `OPEN`, `CLOSED` and the exit-0/`OPEN` control and asserts that an
  unmerged PR's branch survives. Recorded as QA-2.

### Maintainability — PASS
The verdict rule is stated once and cited; Step 1 and Step 0.1 share one merged-PR query; tests pin
the ordering.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/develop-next/SKILL.md:82` — reconciliation reads `VCS`/`BB_*` that only Step 0 item 6 binds; silent no-op on Bitbucket → re-bind or refuse in the block; test without injecting `VCS`. Promoted to gate as **CR-1** (`code_review_blocking`).
- [medium/medium] `skills/develop-next/SKILL.md:110` — "not ticked" and "could not look" both print `not-ticked` → distinguish and halt on unknown. Not promoted by confidence; raised by QA as **QA-1** after verifying it by reading the block.

**Cleanups (0).**

boundary: true — `probes_executed: 0` (see QA-2).

Provenance: both findings are in blocks this diff adds; neither exists on `origin/develop`.

Mutation proofs (committed tests, run at develop and recorded in the implementation report):
- mutation-proven: dirty merge arm back to `|| exit 1` → `[bash] skills/develop-next/SKILL.md — dirty tree, merge exits 1, PR MERGED` → covered
- mutation-proven: state check replaced by an exit-code check → the exit-0/`OPEN` control cases (and exit-1/`MERGED`) → covered
- mutation-proven: halt check moved after routing → `Step 0.1: halt check, then reconciliation, then routing` → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Existing merge-site cases (clean, dirty, refused, already-gone, unbindable head) | PASS — unchanged, stub defaults `MERGED` |
| Step 4 re-sync block | PASS |
| develop-next / develop-batch shape suites (pre-existing tests) | PASS |
| `npm run eval:all`, `check:generated`, `lint:shell` | PASS |

---

## Test Artifacts

### Files Reviewed
`skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`,
`shared/resources/tests/merge-delete-branch-guard.test.mjs`,
`evals/develop-next/protocol/skill-shape.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`,
`CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/merge-delete-branch-guard.test.mjs   # 39/39
command node --test evals/develop-next/protocol/skill-shape.test.mjs evals/develop-batch/protocol/skill-shape.test.mjs   # 67/67
npm run ci:fast        # format clean; 5325/5326 (pre-existing timing budget)
npm run eval:all && npm run validate:all && npm run check:generated && npm run lint:shell   # all exit 0
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/develop-next/SKILL.md --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/develop-batch/SKILL.md --json
```

### Coverage Report
Not applicable — the deliverable is runnable prose; coverage is the executed-block harness above.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — make the reconciliation block bind or refuse on an unbound `VCS`; executed case without `VCS`.
2. QA-1 — three-valued tick check; unknown leaves the flags as recorded; executed failure cases.

### Short-term Actions (Non-Blocking)
1. QA-2 — DoD override at finalise for the zero-probe boundary.
2. A Bitbucket stub for the guard test (already in the task's Future Improvements).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium reliability defects in the new reconciliation; everything else holds.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and QA-1 fixed.

---

**QA Report**: co-located at `task.188.qa.1.resume-from-evidence-not-flags.md`
**Gate File**: co-located at `task.188.gate.1.resume-from-evidence-not-flags.yml`
**Next Steps**: `/qa-fix` for CR-1 and QA-1, then QA cycle 2 (refute pass).
