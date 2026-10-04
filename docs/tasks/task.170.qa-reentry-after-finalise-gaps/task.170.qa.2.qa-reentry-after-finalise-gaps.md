# QA Report: Task 170 - QA re-entry after a finalise DoD-gaps halt fixed by a code change (cycle 2)

**Task**: [task.170.qa-reentry-after-finalise-gaps.md](./task.170.qa-reentry-after-finalise-gaps.md)
**Gate File**: [task.170.gate.2.qa-reentry-after-finalise-gaps.yml](./task.170.gate.2.qa-reentry-after-finalise-gaps.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 refute pass over the whole branch at `cad6845b`. Cycle 1's four fixes hold (38/38, each
mutation-covered). The refute pass found a gap the steady-state suite cannot see: after a re-entry the
implementation report still shows the original run's APPROVE, and the resume contract reads that row
as the truth — so a pause or HALT before cycle N+1 writes its entry resumes at Step 7, over the ungated
head this task exists to protect. It also found that cycle 1's stem regex misses parallel-story
directories.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR-1 (cycle 1) directory-wide DoD lookup | FIXED | stem-keyed lookup; 3 suite cases; directory-wide mutation → 3 red |
| QA-1 hostile gate heads unpinned | FIXED | 8 committed cases; validation mutation → 10 red |
| CR-3 `qa_phase` writers under-listed | FIXED | `set-qa-phase.sh` header, `pause.md` row |
| CR-2 (advisory) `.claude/state` counted as movement | FIXED | no-gitignore case; exclusion mutation → 1 red |

## New Findings This Cycle

- **[high]** `shared/resources/develop-pipeline-resume-contract.md` — a resume after the re-entry reads the stale APPROVE and goes to Step 7 → precedence rule keyed on `qa_reentry.gate_head` (CR-1, [bug.3](./task.170.bug.3.resume-after-reentry-reads-stale-approve.md)).
- **[medium]** `shared/resources/reenter-qa-after-finalise.sh:114` — stem regex misses `story.E.S-P` directories → accept the `-N` suffix (CR-2, [bug.4](./task.170.bug.4.parallel-story-stem-unmatched.md)).
- **[low]** `shared/resources/reenter-qa-after-finalise.sh:168` — absent `qa_max_cycles` read as 0, not the loop's 5 (CR-4).
- Advisory: CR-3 (agent judges movement before the script), CR-5 (lock appearing mid-run), CR-6 (gate key vs stem key), CR-7 (contract wording stale after cycle 1).

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer with the **refute directive** (cycle 2 = exactly one
prior gate → whole branch diff, `origin/develop...HEAD`, generated `skills/*/references/` copies
excluded). Reviewer: 366413 ms (`duration_ms` from its completion notice). `code_review_blocking=true`.

Re-review scope: unscoped — cycle 2 refute pass (whole branch diff, 22 files).

CR-1 was returned at medium confidence; QA verified it by reading the contract's 5c sub-state table
(`APPROVE or CONCERNS → 5c cleared — Step 5–6 is complete, go to Step 7`, with "the `**PR Review**`
row stays the source of truth") and the lock schema's "No reader branches on it", and promotes it at
high confidence. CR-2 verified with `sed` (empty stem for `story.305.1-1.example-feature`). CR-4
verified against the loop's `jq -r '.qa_max_cycles // 5'`.

Step 4b: no runnable-prose file changed since cycle 1 (only `pause.md` table text and a `.sh` header) — not re-run.

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: The re-entry writer | CONCERNS | CR-2, CR-4 |
| Phase 2: Contract and step docs | FAIL | CR-1 (resume precedence), CR-7 |
| Phase 3: Guards | PASS | parity, Stop-hook, suite 38/38 |

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: A resume after the re-entry reads the stale APPROVE (CR-1)**
- **Severity**: HIGH
- **Category**: Reliability
- **Bug Report**: [task.170.bug.3.resume-after-reentry-reads-stale-approve.md](./task.170.bug.3.resume-after-reentry-reads-stale-approve.md)
- **Observation**: the lock says step 5; the report's last entry says 5c cleared; the contract trusts the report.
- **Impact**: `/finalise` re-runs over the ungated head after any interruption in the re-entry's widest window.
- **Recommendation**: a `qa_reentry.gate_head` precedence rule, self-clearing at the next gate.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: Parallel-story directories have no stem (CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.170.bug.4.parallel-story-stem-unmatched.md](./task.170.bug.4.parallel-story-stem-unmatched.md)
- **Recommendation**: accept `-N`; add a case.
- **Priority**: P2

### LOW Severity Issues (1)

- CR-4 — absent budget read as 0 rather than 5.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — FAIL
CR-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The hostile-head cases are now committed (8/8). The probe engine's shell corpus still encodes another script's contract (QA report 1). CR-5 (a lock that appears between the refusal and the restore) is advisory.

### Maintainability — CONCERNS
CR-7: contract wording behind the cycle-1 fixes.

---

## Code Review

**Correctness bugs (6):**
- [high/medium→verified] `shared/resources/develop-pipeline-resume-contract.md:625` — resume reads the stale APPROVE. **Promoted (CR-1).**
- [medium/high] `shared/resources/reenter-qa-after-finalise.sh:114` — parallel-story stem. **Promoted (CR-2).**
- [medium/medium] `skills/develop-task/SKILL.md:318` — Phase 0b offers the re-entry only when the agent judges movement. Advisory (CR-3).
- [low/high] `shared/resources/reenter-qa-after-finalise.sh:168` — absent budget as 0. **Promoted (CR-4).**
- [low/medium] `shared/resources/reenter-qa-after-finalise.sh:154` — a lock appearing before `--restore` is rewritten. Advisory (CR-5).
- [low/low] `shared/resources/reenter-qa-after-finalise.sh:121` — gate key (qa-cycle.sh) vs DoD key (stem). Advisory (CR-6).

**Cleanups (1):**
- `shared/resources/develop-pipeline-resume-contract.md:608` — stale `no-dod` wording and "all of it" claim (CR-7).

Provenance: all findings are in lines this branch adds or (CR-2, CR-4) lines cycle 1 changed — new.

Mutation spot-check of cycle 1's fixes (recorded at qa-fix, re-run here green):

mutation-proven: DoD pattern → `*.dod.*.md` → 3 bug-DoD cases went red → covered
mutation-proven: drop `.claude/state` exclusion → no-gitignore case went red → covered
mutation-proven: drop head validation + `|| echo 1` → 10 head cases went red → covered

---

## Test Artifacts

### Test Commands Executed
```bash
bash shared/resources/reenter-qa-after-finalise.test.sh        # 38/38
echo story.305.1-1.example-feature | sed -nE 's/^(task\.[0-9]+|story\.[0-9]+\.[0-9]+[A-Za-z]?)(\..*)?$/\1/p'   # empty
grep -n 'qa_max_cycles // 5' shared/resources/develop-pipeline-step-5-6-qa-loop.md
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high (resume precedence), one medium, one low.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-1 fixed

---

**Next Steps**: `/qa-fix` cycle 2, then QA cycle 3.
