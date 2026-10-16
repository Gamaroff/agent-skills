# QA Report: Task 212 - qa-next: a note finding can be resolved, with evidence

**Task**: [Link to task document](./task.212.qa-next-resolvable-note-findings.md)
**Gate File**: [task.212.gate.3.qa-next-resolvable-note-findings.yml](./task.212.gate.3.qa-next-resolvable-note-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: FAIL

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| T212-QA2-CR1 — resumed Step 5 cannot know the edited run files | ⚠️ PARTIAL | Step 5 now derives the set from the tree, but only for the default registry directory (see T212-QA3-CR1) |
| T212-QA2-CR2 — writer does not read its row back | ✅ FIXED | The read-back via `rowFinding`. The mutation that skips it turns the test red. The probe refuses pipe and backtick run names |
| T212-QA2-CR7 — unreal dates count as later | ✅ FIXED | `isRealDate` in `runName`. The mutation that reverts it turns the test red. The probe refuses `2026-13-45-lan.md` |
| Advisory CR-3/4/5/6 | ✅ DONE | git timeout + `GIT_NO_LAZY_FETCH`; Step 4.3 sentence; linear multi-marker strip |

## Executive Summary

Two of cycle 2's three gated findings are fixed. The third fix (CR1) introduced a HIGH defect. The Step 5 staging block hardcodes the default `docs/qa` registry directory. Any consumer with a non-default `qaNext.registryPath` therefore never stages the run files `--resolve-finding` edited. The `--by` boundary engages on 17 probes.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED — fix T212-QA3-CR1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (82 qa-next unit; `ci:fast` 5771/0 at `428fcbcf`)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#680, head `428fcbcf`)

### Review Methodology

Direct tools plus the Step 3b reviewer subagent, dispatched at 15:24Z, with `duration_ms` 130103 (≈2.2 min). The reviewer read the cycle-2 delta first, then the full branch diff of the scoped files.

Re-review scope: files changed since gate 2 (head `8fe3c3c30ceb`; 3 code files plus task artifacts) — the default. `SAFETY_REPROBE=false`: clause 1 is false, and neither judgement clause applies.

Step 4b: `SKILL.md` changed and now carries a new bash block, the Step 5 listing. That block is executed by `SKILL.md Step 5's staging block … executed` in the unit suite. The snippet engine still classifies the file's blocks as mutating or unparseable (`no-executable-blocks`, information).

---

## New Findings This Cycle

- **[high]** `skills/qa-next/SKILL.md:216` — the Step 5 block hardcodes `REGISTRY_DIR` to `docs/qa`. Nothing binds it from `qaNext.registryPath`, so a non-default registry yields an empty list and the edited run files stay unstaged (T212-QA3-CR1). This was verified by reading `SKILL.md:52`, where `qaNext.registryPath` is a documented key, and no step binds `REGISTRY_DIR`.
- **[medium/low confidence]** `skills/qa-next/scripts/uat-status.mjs:778` — a git timeout or spawn error is cached as `no-repo`/`absent`, so a slow repo reports `not-a-git-repo` or `commit-not-found`. The writer could then replace a marker that still holds. Advisory: the confidence is low and timeouts are rare.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: Parse, verify, count | PASS | CR7 fixed |
| Phase 2: The writer | PASS | CR2 fixed (read-back) |
| Phase 3: Docs | FAIL | CR1: the Step 5 block holds only for the default registry |

---

## Success Criteria Verification

| Criterion | Status |
| --------- | ------ |
| SC1–SC7 | PASS (tests as in QA report 2, plus read-back and real-date cases) |
| SC8–SC9 | PASS (`ci:fast` 5771/0) |
| SC10–SC12 docs, incl. "Step 5 stages the earlier run files" | FAIL — only on the default registry path |

---

## Breaking Changes Validation

None declared. **Overall:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: Step 5 staging ignores `qaNext.registryPath` (T212-QA3-CR1)**
- **Severity**: HIGH
- **Category**: Reliability
- **Observation**: `REGISTRY_DIR="${REGISTRY_DIR:-docs/qa}"`, and no step sets it. `git diff --name-only HEAD -- "<wrong dir>/runs"` exits 0 with no output.
- **Impact**: For any consumer whose registry is not under `docs/qa`, every resolution marker is left uncommitted, and the next run halts on a dirty tree.
- **Recommendation**: Let `uat-status.mjs`, which already resolves `registryDir`, print the changed tracked run files, and have Step 5 call it. Test it with a non-default `--registry`.
- **Priority**: P1

### MEDIUM Severity Issues (0 in gate; 1 advisory)

The timeout is conflated with refusal (low confidence; routed to `recommendations.future`).

**Total Issues**: HIGH: 1, MEDIUM: 1 (advisory), LOW: 0

---

## NFR Assessment

### Performance — PASS
The strip is linear, and the git calls are bounded.

### Reliability — FAIL
T212-QA3-CR1.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (from `task.212.qa.3.security.run.json` `totals.executed`)
- **Probe**: the `cli:` form, run as `--resolve-finding … --by {input}` against a real fixture root.
- **Result**: verdict `engages`.
  - 16 hostile inputs were refused: the 13 earlier ones, plus a pipe run name and a backtick run name (both caught by the read-back) and an impossible date (`run-not-later`).
  - 1 legitimate input was accepted.

### Maintainability — PASS

---

## Code Review

Anchors: CR-1 and CR-2 were reported against lines in `SKILL.md` and `uat-status.mjs` and confirmed by reading.

**Correctness bugs (2):**
- [high/high] `skills/qa-next/SKILL.md:216` — the Step 5 block's registry directory is hardcoded. **Promoted: T212-QA3-CR1.**
- [medium/low] `skills/qa-next/scripts/uat-status.mjs:778` — a timeout reads as a refusal (advisory).

**Cleanups (0).**

**Boundary**: `boundary: true` for `--resolve-finding --by` (`probes_executed: 17`). The Step 5 block lists files and refuses nothing, so it is not a boundary.

**Provenance**: new in this branch, and introduced by the cycle-2 fix.

**Mutation spot-check** (cycle-2 fixes):
- mutation-proven: `isRealDate` dropped from `runName` → `verifyResolution names every reason` → covered
- mutation-proven: read-back replaced by a constant → `--resolve-finding reads its row back…` → covered
- The Step 5 block test is covered for the default path only. The fixture never sets a registry other than `docs/qa`, which is what T212-QA3-CR1 names.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| qa-next unit suite (82) | PASS |
| `npm run ci:fast` at `428fcbcf` | PASS (5771/0) |

---

## Test Artifacts

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:skills/qa-next/scripts/uat-status.mjs' --argv '[...,"--by","{input}",...]' --cases-file task.212.qa.3.security.cases.json --record task.212.qa.3.security.run.json --json
node --test --test-name-pattern='<test>' evals/qa-next/unit/uat-status.test.mjs   # 2 mutation proofs
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH reliability defect, introduced by the cycle-2 fix.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: fix T212-QA3-CR1

---

**QA Report**: co-located at `task.212.qa.3.qa-next-resolvable-note-findings.md`
**Gate File**: co-located at `task.212.gate.3.qa-next-resolvable-note-findings.yml`
**Next Steps**: `/qa-fix` cycle 3
