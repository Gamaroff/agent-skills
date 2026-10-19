# QA Report: Task 212 - qa-next: a note finding can be resolved, with evidence

**Task**: [Link to task document](./task.212.qa-next-resolvable-note-findings.md)
**Gate File**: [task.212.gate.2.qa-next-resolvable-note-findings.yml](./task.212.gate.2.qa-next-resolvable-note-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T212-QA1-CR1 — an invalid marker cannot be repaired | ✅ FIXED | `--resolve-finding replaces a marker that no longer holds…` test; mutation `stale never computed` → red; mutation `padding regression` → red |
| T212-QA1-CR2 — "later" was index order | ✅ FIXED | `isLaterRun`; mutation `reverted to index order` → `verifyResolution names every reason` red. Probe cases `undated-run` and `same-day-other-function` were refused |
| T212-QA1-CR3 — duplicate finding numbers | ✅ FIXED | `refuses a finding number two rows share` test; mutation `duplicate allowed` → red |
| CR-4 (low) — README said reachability | ✅ FIXED | The README now states existence, not reachability |
| CR-5 (low) — no-repo test depended on `os.tmpdir()` | ✅ FIXED | The test sets `GIT_CEILING_DIRECTORIES` |

## Executive Summary

All of cycle 1's findings are fixed, and each fix is held by a test that goes red when the fix is reverted. The `--by` boundary engages on 14 probes. The refute pass found one new MEDIUM: a resumed qa-next run has no record of which earlier run files Step 4.3 edited, so Step 5 can leave their markers uncommitted. It also found two LOW gaps in the writer and the run-name parser.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix T212-QA2-CR1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (79 qa-next unit; full `ci:fast` 5768/0 at the cycle-1 fix)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#680, OPEN, head `8fe3c3c3`)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing
- [x] Security Review (executed boundary probe)
- [x] Code Review (Step 3b refute pass, independent subagent)

### Review Methodology

Cycle 2 ran as a refute pass over the whole branch diff, `origin/develop...HEAD` minus `docs/tasks/` (1051 lines, head `8fe3c3c3`). `SAFETY_REPROBE=false`: clause 1 is false (gate 1 security PASS), and no judgement clause applies. The reviewer subagent was dispatched at 15:08Z with `duration_ms` 350345 (≈5.8 min). It ran node probes on `isLaterRun`, on regex timing, and on a parse round-trip of the writer's output.

Re-review scope: unscoped — cycle 2 always runs as a refute pass over the whole branch.

Step 4b: the SKILL.md change touches prose only. The prior run's result stands: 9 blocks, all refused as mutating, so `no-executable-blocks` (information).

---

## New Findings This Cycle

- **[medium]** `skills/qa-next/SKILL.md:205` — resumed Step 5 cannot know which earlier run files were edited (T212-QA2-CR1, QA-promoted from medium-confidence after reading `STATE_FIELDS`)
- **[low]** `skills/qa-next/scripts/uat-status.mjs:1019` — writer does not read its row back; `|`/backtick evidence can write an unparseable marker (T212-QA2-CR2)
- **[low]** `skills/qa-next/scripts/uat-status.mjs:722` — `RUN_NAME` accepts unreal dates; `2026-13-45` counts as later (T212-QA2-CR7, reproduced)
- **[low]** `skills/qa-next/scripts/uat-status.mjs:788` — commit evidence is local-object-store only; no timeout on git (advisory)
- **[low]** `skills/qa-next/SKILL.md:183` — Step 4.3 gives no handling for `run-not-later` (advisory)
- **[cleanup]** `skills/qa-next/scripts/uat-status.mjs:684` — `OLD_MARK` super-linear on whitespace (measured 1 ms → 113 ms at 1k → 10k)
- **[cleanup]** `skills/qa-next/scripts/uat-status.mjs:1009` — other dash separators and stacked markers are not stripped

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Parse, verify, count | CONCERNS | Verified | CR7: unreal-date run names |
| Phase 2: The writer | CONCERNS | Verified | CR2: no read-back |
| Phase 3: Docs | CONCERNS | Verified | CR1: Step 5 staging relies on memory across a resume |

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1–SC2 sha resolution, commit-not-found | CLI test | PASS |
| SC3 later run / self / earlier / missing / bad-evidence | `verifyResolution names every reason` (now including cross-function, environment and undated cases) | PASS (CR7 open: unreal dates) |
| SC4 bug-link marker | pure + CLI tests | PASS |
| SC5 writer single cell, idempotent, refusals byte-identical | writer, CR-1 and CR-3 tests | PASS (CR2 open) |
| SC6 no-marker output identical | dedicated test | PASS |
| SC7 `isOpenFinding` pure | plain-object test | PASS |
| SC8 `ci:fast` with `.agents/skills` aside | 5768/0 at `8fe3c3c3` (cycle-1 fix gate, attempt 2) | PASS |
| SC9 per-PR tests | `evals/qa-next/unit/*.test.mjs` in `npm test` | PASS |
| SC10–12 docs | doc-agreement test; Step 5 text | CONCERNS — CR1 |

---

## Breaking Changes Validation

None declared. Unmarked run files read as before.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: A resumed run cannot know which earlier run files it edited (T212-QA2-CR1)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Observation**: Step 5 stages "any earlier run file this run resolved a finding in". `STATE_FIELDS` records `filedBug` so that a resume can stage the bug, but it records nothing for resolved run files. A run that crashes after `phase recorded` therefore resumes at Step 5 with no record of the set.
- **Impact**: The resolution markers stay uncommitted, and the next run's clean-tree preflight stops on them.
- **Recommendation**: Derive the set at Step 5 from git (modified tracked files under `runs/`), or record it in the state file.

### LOW Severity Issues (2 in the gate, 2 advisory)

- **T212-QA2-CR2**: the writer does not read its row back, so evidence containing `|` or a backtick can write an unparseable marker.
- **T212-QA2-CR7**: an unreal date in a run file name counts as later.
- Advisory: CR-3 (local-only commit verification, no git timeout) and CR-4 (Step 4.3 `run-not-later` handling).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 4 (2 in gate)

---

## NFR Assessment

### Performance — PASS
The stale-marker strip is super-linear on long whitespace (CR-5, cleanup), but only on the replacement path.

### Reliability — CONCERNS
T212-QA2-CR1.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 14 (from `task.212.qa.2.security.run.json` `totals.executed`)
- **Probe**: `cli:` against a real fixture root, `--by {input}`. The verdict is `engages`, with 0 escapes. 13 hostile inputs were refused: the 11 from cycle 1, plus `runs/zz.md` (undated) and `runs/A.2/2026-10-15-lan-02.md` (a same-day run of another function). The one legitimate later run was accepted.

### Maintainability — PASS
Each of the 4 mutations of a cycle-1 fix turns its test red.

---

## Code Review

Advisory, except the promoted entries. Anchors: CR-2 `ok`; the rest `unchecked-text`.

**Correctness bugs (4):**
- [medium/medium] `skills/qa-next/SKILL.md:205` — resume loses which earlier run files were edited. **Promoted by QA after verification: T212-QA2-CR1.**
- [low/high] `skills/qa-next/scripts/uat-status.mjs:1019` — no read-back of the written row. **Promoted: T212-QA2-CR2.**
- [low/medium] `skills/qa-next/scripts/uat-status.mjs:788` — local-only commit verification; no git timeout or lazy-fetch guard.
- [low/medium] `skills/qa-next/SKILL.md:183` — Step 4.3 has no `run-not-later` handling.

**Cleanups (3):**
- `skills/qa-next/scripts/uat-status.mjs:684` — `OLD_MARK` is super-linear → slice at the `RESOLUTION_MARK` match.
- `skills/qa-next/scripts/uat-status.mjs:1009` — strip other dash separators and stacked markers.
- `skills/qa-next/scripts/uat-status.mjs:722` — `RUN_NAME` accepts unreal dates (QA reproduced it → **promoted: T212-QA2-CR7**) and duplicates `seqKey`.

**Boundary**: `boundary: true` (`--resolve-finding --by`), `probes_executed: 14`.

**Provenance**: every finding is in code this branch adds.

**Mutation spot-check** (every test guarding a cycle-1 fix):
- mutation-proven: `isLaterRun` reverted to index order → `verifyResolution names every reason` → covered
- mutation-proven: `stale` never computed → `--resolve-finding replaces a marker that no longer holds…` → covered
- mutation-proven: duplicate-number refusal removed → `--resolve-finding refuses a finding number two rows share…` → covered
- mutation-proven: trailing padding taken from `content` (the pre-fix bug) → `--resolve-finding replaces a marker…` → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| qa-next unit suite (79) | PASS |
| `npm run ci:fast` at `8fe3c3c3` | PASS (5768/0) |

---

## Test Artifacts

### Files Reviewed
`skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`, `skills/qa-next/{SKILL.md,README.md,assets/run.template.md}`

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:skills/qa-next/scripts/uat-status.mjs' --argv '[...,"--by","{input}",...]' --cases-file task.212.qa.2.security.cases.json --record task.212.qa.2.security.run.json --json
node --test --test-name-pattern='<test>' evals/qa-next/unit/uat-status.test.mjs   # 4 mutation proofs
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T212-QA2-CR1, plus the LOW entries CR2 and CR7.

### Short-term Actions (Non-Blocking)
1. CR-3, CR-4, CR-5, CR-6 (cheap; worth folding into the same fix cycle).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings. One reproduced MEDIUM reliability gap is open in the queue.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix T212-QA2-CR1

---

**QA Report**: co-located at `task.212.qa.2.qa-next-resolvable-note-findings.md`
**Gate File**: co-located at `task.212.gate.2.qa-next-resolvable-note-findings.yml`
**Next Steps**: `/qa-fix` cycle 2
