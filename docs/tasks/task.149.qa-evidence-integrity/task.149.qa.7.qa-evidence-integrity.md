# QA Report: Task 149 - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Task**: [Link to task document](./task.149.qa-evidence-integrity.md)
**Gate File**: [task.149.gate.7.qa-evidence-integrity.yml](./task.149.gate.7.qa-evidence-integrity.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: CONCERNS

---

## Re-Review Context

Cycle 7 is the last granted cycle. It gates cycle 6's fix, `a72aa4ac`.

| Previous issue | Severity | Status | Evidence |
| -------------- | -------- | ------ | -------- |
| [TASK-149-BUG-10](./task.149.bug.10.read-back-unverifiable-link-exit-1.md): unverifiable link, wrong code and wrong remedy | MEDIUM | FIXED | The probe `unverifiable-link` halts with the new remedy. The reviewer confirmed that the header, Step 12b and item 3e now agree |
| CR6-2: gate grammar on a two-segment name | low | FIXED (dotfiles excepted, see BUG-11) | The probe `gate-twogates` is now read by its last segment (exit 0) |
| CR6-4: `isWithin` refuses `..name` | low | FIXED | The probe `copy-as.dotdot-name` is no longer overblocked, and `dotdot-inside` is staged |

---

## Executive Summary

Cycle 6's fixes hold. All three boundaries engage: 54 probes, 0 reproduced, 0 overblocked. One claim
was still false. The CR6-2 fix gave `artifact()` `qa-cycle.sh`'s grammar, but not the glob's dotfile
rule, so a same-cycle AppleDouble file is chosen and staged as the gate. That finding is MEDIUM and
was reproduced.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools, plus one read-only diff reviewer (Explore) that returned after 263 s. It started from
the isolated fix diff, then read the full diff of the four changed source files against
`origin/develop`. Every medium claim was reproduced before gating.

Re-review scope: since 2026-09-26T12:25:00Z (default)

Step 4b: not applicable. No runnable prose was changed in scope: `a72aa4ac` touches `.js`, `.mjs`,
tests and task docs only.

---

## New Findings This Cycle

- **[medium]** `shared/resources/qa-read-back.js:97`: `artifact()` considers dotfiles, and the
  `qa-cycle.sh` glob does not. Fix: use one definition of the cycle's file (TASK-149-BUG-11).
- **[low, pre-existing]** `shared/resources/security-probe.mjs:415, :868`: bare
  `startsWith("..")` containment. The same lines exist on `origin/develop` (400, 853), so this is
  routed to `recommendations.future`.
- **[low/medium confidence, advisory]** `qa-read-back.js:97`: when several same-cycle files match,
  one is chosen silently (CR-3).

---

## Implementation Verification

| Phase | Status | Notes |
| ----- | ------ | ----- |
| Phase 1: `--copy-as` seeding | PASS | 24/24 engage |
| Phase 2: export-and-probe decline | PASS | Unchanged |
| Phase 3: standards-named validation | PASS | Unchanged |
| Phase 4: post-edit read-back | CONCERNS | BUG-11 |
| Phase 5: tests + docs | PASS | 23 read-back cases, QA-18 to QA-28 |

---

## Success Criteria Verification

| Criterion | Actual | Status |
| --------- | ------ | ------ |
| Full suite | CI `test` SUCCESS at `a72aa4ac`. Local `ci:fast`: 4226 tests, 4225 pass, 0 fail | PASS |
| Could-not-look is never a pass | Holds under the scoped contract | PASS |
| The read-back reads the gate `qa-cycle.sh` counted | Not for a same-cycle dotfile | CONCERNS |

---

## Issues Found

### MEDIUM Severity Issues (1)

**Issue: a dotfile is chosen as the gate**
- **Bug Report**: [task.149.bug.11.read-back-picks-dotfile-gate.md](./task.149.bug.11.read-back-picks-dotfile-gate.md)
- **Observation**: `{"exitCode":0,"gate":"…/._task.9.gate.1.x.yml",…}`. `qa-cycle.sh` on the same directory prints `1`.
- **Impact**: A stray metadata file rides into the QA commit as the evidence.
- **Priority**: P2

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 in the gate (1 pre-existing LOW routed to future)

---

## NFR Assessment

### Security — PASS
- **Evidence**: measured
- **Probes executed**: 54. Run record: [task.149.qa.7.security.run.json](./task.149.qa.7.security.run.json)

### Reliability — CONCERNS
TASK-149-BUG-11.

### Performance — PASS · Maintainability — PASS (advisory CR-3, CR-4, CR-5)

---

## Code Review

Resolved blocking (`code_review_blocking=true`).

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-read-back.js:97`: dotfile chosen as the gate → **promoted: TASK-149-BUG-11**
- [low/high] `shared/resources/security-probe.mjs:415`: bare `startsWith("..")` → pre-existing (base 400, 853), future
- [low/medium] `shared/resources/qa-read-back.js:97`: ambiguous same-cycle matches are chosen silently → advisory

**Cleanups (2):**
- `qa-read-back.js:28`: the exit-2 cause list differs between the header and Step 12b / 3e (CR-4)
- `qa-read-back.js:114`: the containment predicate exists in three places (CR-5)

mutation-proven: remove the `unverifiable` remedy → "a link git cannot verify halts with its own remedy" → covered
mutation-proven: revert to the first-segment regex → "a gate name with two .gate.N. segments is read by its last one" → covered
mutation-proven: drop the `isFile()` filter → "a directory named like the cycle's gate halts as misnamed" → covered
mutation-proven: revert the read-back `inside` test to `startsWith("..")` → "an untracked link target whose name begins with two dots…" → covered
mutation-proven: revert `isWithin` in qa-execute-snippets → QA-27 + QA-28 → covered

These are 5 of 5 cycle-6 fixes. They were run against the committed tests during the qa-fix step of
this session, and the tests still pass at `a72aa4ac`.

---

## Test Artifacts

```bash
TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-read-back-block.test.js   # 37/37
TMPDIR=/tmp node --test --test-name-pattern='QA-(1[89]|2[0-9])' shared/resources/tests/qa-execute-snippets.test.mjs   # 11/11
node .agents/skills/qa-task/references/security-probe.mjs … --record task.149.qa.7.security.run.json   # ×3, 54 executed
gh pr view 493 --json statusCheckRollup   # test, validate, link-check, shellcheck: SUCCESS
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL, on TASK-149-BUG-11
