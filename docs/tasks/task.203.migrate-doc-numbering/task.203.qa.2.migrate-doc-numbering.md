# QA Report: Task 203 - Migrate documents to hierarchical numbering (cycle 2)

**Task**: [Link to task document](./task.203.migrate-doc-numbering.md)
**Gate File**: [task.203.gate.2.migrate-doc-numbering.yml](./task.203.gate.2.migrate-doc-numbering.yml)
**QA Engineer**: QA Engineer (qa-task, develop-task pipeline, cycle 2 refute pass)
**Review Date**: 2026-10-15
**Testing Completed**: 2026-10-15
**Gate Status**: FAIL

---

## Re-Review Context

| Previous finding | Bug | Status this cycle | Evidence |
| --- | --- | --- | --- |
| CR-1: named L3 monolith never moved | [bug 1](./task.203.bug.1.named-l3-monolith-never-moves.md) | ✅ FIXED (closed) | Test `CR-1: a named L3 monolith …` is green; mutation of either half → red |
| CR-2: revert hint does not revert | [bug 2](./task.203.bug.2.revert-hint-does-not-revert.md) | ⚠️ PARTIAL (reopened) | The round-trip test is green, but the hint now restores the whole root and can erase uncommitted work (cycle 2 CR-1) |
| CR-3: registry refusal only at `--apply` | [bug 3](./task.203.bug.3.registry-write-throws-only-on-apply.md) | ✅ FIXED (closed) | Test `CR-3: …` is green; mutation → red |
| QA-1: boundary unprobed, empty `--root` accepted | [bug 4](./task.203.bug.4.boundary-not-probed.md) | ✅ FIXED (closed) | Probe `engages`, 11 executed (`task.203.qa.2.security.run.json`); empty `--root` is `usage`; both mutations → red |

---

## Executive Summary

Cycle 1's fixes hold for bugs 1, 3 and 4. The full-diff refute pass found that bug 2's fix overreaches. The revert hint restores the entire PRD root, while `verify()` refuses only dirty files that are about to move, so following the hint can erase uncommitted edits the run never touched (HIGH).

It also found two MEDIUM failure-path gaps:
- A story-number collision passes the dry run.
- A failure inside `apply()` throws with no payload, leaving a split tree.

The repository migration is still clean (`--check` → `already`, corpus ok on 22 documents).

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (95/95 across the engine and doc-id suites; `ci:fast` green at `b210c0bb`)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#671)

### Testing Approach

- [x] Automated Testing
- [x] Performance Testing
- [x] Regression Testing
- [x] Security Review (executed probe)
- [x] Code Review (refute pass + safety re-probe)

### Review Methodology

Direct tools plus one dispatched refute reviewer. The reviewer was dispatched at 08:06Z and returned in 230 s (`duration_ms` 229672).

- **Cycle 2**: one prior gate, so this is a full-diff refute pass (`REFUTE_PASS=true`).
- **Safety re-probe directive** added by judgement. Clause 1 computed `false`, since the prior security status was CONCERNS, not FAIL, but QA-1 was a security-axis finding.
- **Re-review scope**: unscoped, the full `origin/develop...HEAD` diff, excluding the engine's mechanical output under `docs/prd/**` and `docs/tasks/**` (23 files, 3252 lines).
- **Step 4b** is not applicable: no runnable prose in the change set.
- **Gate head**: `b210c0bb58190bfea298b1cac004fee9cd5dd86a`.

---

## New Findings This Cycle

- **[high]** `shared/resources/migrate-doc-numbering.mjs:1349` — the revert hint restores the whole PRD root and every touched outside file, but `verify()` refuses only dirty move sources. Running the hint erases uncommitted edits to unmoved tracked files under the root and to dirty outside files the literal pass rewrote. The fix: refuse dirty edit and write targets as well, and limit the hint to the exact paths the run touched.
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:532` — story numbers are not checked for collisions under the new parent (reproduced: dry run `dry-run`, then apply `post-check-failed [duplicate-id]`). The fix is a per-epic id collision blocker.
- **[medium]** `shared/resources/migrate-doc-numbering.mjs:1560` — `apply()` is unwrapped (reproduced: a `move()` that throws on its third call escapes `run()`). The fix: catch the error and return `post-check-failed` with a revert hint for what was done.
- Advisory, medium or low confidence:
  - CR-4: the repository root, `.git` and `node_modules` are accepted as a root, and `rmdirIfEmpty` then reaches every empty directory.
  - CR-5: an absolute `--root` through a symlinked repo path is refused.
  - CR-6: an untracked monolith's frontmatter edit is skipped.
  - CR-7: the revert pathspecs are not rooted.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Dependency gate | PASS | Verified | Unchanged |
| Phase 1: Discover and plan | CONCERNS | Partial | Story collision unchecked (CR-2) |
| Phase 2: Blockers and verification | PASS | Verified | 9 codes and the root predicate |
| Phase 3: Apply and the CLI | CONCERNS | Partial | Revert overreach (CR-1); unwrapped apply (CR-3) |
| Phase 4: Migrate this repository | PASS | Verified | `--check` answers `already`, corpus ok |

**Overall Phase Completion**: 3/5 clean.

---

## Success Criteria Verification

The cycle-1 table (`task.203.qa.1.migrate-doc-numbering.md`) still holds for every criterion. This cycle re-measured:

| Criterion | Evidence | Status |
| --- | --- | --- |
| Second `--apply` / `--check` answers `already` | `command node shared/resources/migrate-doc-numbering.mjs --check --json` → `already`, corpus ok (22 documents) | PASS |
| Dry run under 5 s | 0.328 s at load 6.11 on head `b210c0bb` (`already`); the migration-pending figure is 2.248 s (cycle 1) | PASS |
| L3 PRDs read and migrated | Test `CR-1: a named L3 monolith …` (tracked monolith); the untracked case is advisory (CR-6) | PASS |
| No partial apply ("none writes until all have passed") | Story collision (CR-2) and an apply failure (CR-3) both leave a half-applied tree | **FAIL** |

**Standards-named validation**: no skill changed this cycle (the engine is not yet cited by any skill), so it is not re-run; `finalise` passed at cycle 1.

---

## Breaking Changes Validation

These are unchanged from cycle 1. The Rollback Plan now cites the printed revert, which this cycle finds overreaching (CR-1). It is part of bug 2's reopened fix.

**Overall Breaking Changes Assessment**: CONCERNS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The revert hint can erase uncommitted work (CR-1)**
- **Bug Report**: [task.203.bug.2.revert-hint-does-not-revert.md](./task.203.bug.2.revert-hint-does-not-revert.md) (reopened)
- **Observation**: `git restore --source=HEAD --staged --worktree -- '<root>' …` covers files the run did not touch, and `verify()` does not refuse dirty edit or write targets.
- **Recommendation**: A dirty-path blocker for every path the run will edit, write or move, and a hint scoped to exactly those paths.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: A story-number collision passes the dry run (CR-2)**
- **Bug Report**: [task.203.bug.5.story-number-collision-unblocked.md](./task.203.bug.5.story-number-collision-unblocked.md)

**Issue: An apply failure strands the tree with no revert hint (CR-3)**
- **Bug Report**: [task.203.bug.6.apply-failure-strands-tree.md](./task.203.bug.6.apply-failure-strands-tree.md)

### LOW Severity Issues (0 gating)

CR-4 to CR-7 are advisory (see New Findings).

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
The dry run takes 0.328 s on head (`already`) and 2.248 s with the migration pending.

### Reliability — CONCERNS
Three failure-path gaps: CR-1, CR-2 and CR-3.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11 (copied from `task.203.qa.2.security.run.json` `totals.executed`)
- **Boundary**: `true`, probed through `shared/resources/migrate-doc-numbering.mjs#checkPrdRoot` with `--sink path` and `--args-json` naming a scratch base that holds `uploads/link-to-etc → /etc`. Verdict `engages`: 8/8 hostile rejected, 3/3 legitimate accepted, 0 escapes.
- **Advisory**: the repository root, `.git` and `node_modules` are accepted (CR-4); a symlinked repo path is refused (CR-5).

### Maintainability — PASS
There are 38 tests, and the cycle-1 fixes are mutation-proven (7/7, re-run by QA this cycle).

---

## Code Review

Step 3b ran as a refute pass plus a safety re-probe, with `code_review_blocking=true`. Every anchor checked `ok`.

**Correctness bugs (7):**
- [high/high] `shared/resources/migrate-doc-numbering.mjs:1349` — the revert restores the whole root, which can erase uncommitted work → scope the hint and block dirty targets. **Promoted: CR-1** (reopens bug 2).
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:532` — story collision unchecked → per-epic collision blocker. **Promoted: CR-2** (bug 5).
- [medium/high] `shared/resources/migrate-doc-numbering.mjs:1560` — `apply()` unwrapped → catch it and return `post-check-failed` with a hint. **Promoted: CR-3** (bug 6).
- [medium/medium] `shared/resources/migrate-doc-numbering.mjs:1291` — the repository root, `.git` and `node_modules` are accepted as a root → refuse them, and remove only the directories the run emptied. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1266` — platform-variance: lexical containment before realpath refuses a symlinked repo path → compare realpaths. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:963` — an untracked monolith misses its frontmatter edit → add explicit move sources to the candidates. Advisory.
- [low/medium] `shared/resources/migrate-doc-numbering.mjs:1354` — the revert pathspecs are not rooted (they fail from a subdirectory) → `git -C <repoRoot>`. Advisory.

**Cleanups (0).**

**Provenance**: all three promoted findings are in code this branch adds.

**Boundary**: `true`, `probes_executed: 11`, verdict `engages`.

**Mutation proofs** (re-run by QA this cycle against the committed tests, with snapshot restore; the working tree held 10 entries before and after):

```
mutation-proven: fileMap built from disc.files only → CR-1: a named L3 monolith … → covered
mutation-proven: prefilter exemption removed → CR-1: a named L3 monolith … → covered
mutation-proven: created-file rm removed from the revert → CR-2: the printed revert undoes … → covered
mutation-proven: registry blockers dropped → CR-3: a registry appendPrdRow would refuse … → covered
mutation-proven: registry starts from the original text → CR-4: the registry row is layered … → covered
mutation-proven: empty-value guard removed → usage: … an empty --root → covered
mutation-proven: realpath containment removed → QA-1: checkPrdRoot refuses … → covered
```

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Engine and doc-id | `node --test` both suites | PASS (95/95) |
| Full hermetic suite | `ci:fast` at `b210c0bb` | PASS (5642 tests) |
| The migrated repository | `--check` | PASS (`already`) |

---

## Test Artifacts

### Test Commands Executed
```bash
command node --test shared/resources/tests/migrate-doc-numbering.test.mjs shared/resources/tests/doc-id.test.mjs   # 95/95
command node shared/resources/migrate-doc-numbering.mjs --check --json                                               # already
node .agents/skills/qa-task/references/security-probe.mjs --sink path \
  --entry 'shared/resources/migrate-doc-numbering.mjs#checkPrdRoot' --args-json '["<scratch base>"]' \
  --record docs/tasks/task.203.migrate-doc-numbering/task.203.qa.2.security.run.json --json                         # engages, 11
```

### Coverage Report
Not instrumented; mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)
1. Bug 2 (reopened, CR-1): scope the revert, and block dirty edit and write targets.
2. Bug 5 (CR-2): a story collision blocker.
3. Bug 6 (CR-3): wrap `apply()`.

### Short-term Actions (Non-Blocking)
1. CR-4 to CR-7. CR-4 (repository root as PRD root) is the most consequential and cheap to close in the same fix.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One high-confidence HIGH (the revert overreach), promoted under `code_review_blocking`.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.203.qa.2.migrate-doc-numbering.md`
**Gate File**: co-located at `task.203.gate.2.migrate-doc-numbering.yml`
**Next Steps**: `/qa-fix` for bugs 2, 5 and 6, then QA cycle 3.
