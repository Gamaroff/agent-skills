# QA Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt (cycle 4)

**Task**: [Link to task document](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Gate File**: [task.128.gate.4.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.4.shell-boundary-probe-and-finalise-recheck.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-09-20 · **Gate Status**: CONCERNS

## Executive Summary

Cycle 3's four fixes hold — each verified by execution on `6ae01f48`. The scoped review (files changed since gate 3) found one MEDIUM — an `absent` entry of `.`/`..` passes validation and always "exists", so the *fixed* script scores `absent` (the BUG-11 class, one entry short) — plus two LOWs adopted after verification (a case-sensitive launch-failure message that bash 3.2 prints in lower case; escapes dropped on the all-errored decline) and two cleanups. No HIGH for the third gate running; the loop is converging on cosmetics of one mechanism.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL (BUG-13, CR-2, CR-3 fixed and re-reviewed)

## Re-Review Context

**Re-review scope: since 2026-09-20T19:19Z — gate 3 (default; no safety-axis HIGH on gate 3).** 8 files, 1486 diff lines.

| Previous issue | Status | Evidence |
| --- | --- | --- |
| BUG-9 launch matcher catches inside-script errors | **FIXED** | `runs-names.sh` → compared: `exit 126 ≠ 0`, declined 0 |
| BUG-10 stale non-JS prose | **FIXED** | `grep "Non-JS entry points are"` → 0 sites; contract grep green |
| BUG-11 malformed expected | **FIXED** | `{stdout: 12}`, `{exit: 0, absent: 5}` → declined, executed 0, no throw |
| BUG-12 side effects outside the fixture dir | **FIXED** | `writes-home-tmp-self.sh` → PWNED-home/-tmp/-self all reported as escapes; real `$HOME` untouched |

## New Findings This Cycle

- **[medium]** `security-probe.mjs` — **BUG-13**: `expectedProblem({exit:0, absent:[".."]})` → `null`; against the fixed script → `absent`, executed 4, detail `.. was created`. (CR-1)
- **[low]** `security-probe.mjs` — CR-2: `isLaunchFailure`'s alternation is case-sensitive; `/bin/bash` 3.2.57 prints `is a directory` (verified). Adopted.
- **[low]** `security-probe.mjs` — CR-3: the all-errored collapse returns `...base`, dropping `escapes` and `shells`. Adopted.
- Cleanups (advisory): CR-4 BUG-12 test cleanup not in try/finally; CR-5 `@shell` id derivation repeated five times.

## Review Methodology

Standard; cycle 4 scoped to files changed since gate 3, one read-only Explore reviewer (6m22s; 3 bugs + 2 cleanups). QA re-verified BUG-9..12 by execution, re-ran both recorded probes (`task.128.qa.4.security.run.json`, 39 executed), reproduced CR-1 and CR-2. Step 4b: no bash fence added in the changed prose (`skills/review-security/SKILL.md`); finalise SKILL unchanged since its cycle-3 run. `TMPDIR=/tmp`: 107/0.

## NFR Assessment

**Performance** PASS · **Reliability** CONCERNS (CR-3) · **Security** CONCERNS, measured 39 (BUG-13) · **Maintainability** PASS.

## Code Review

CR-1 (medium/high) → BUG-13; CR-2, CR-3 (low/medium) adopted as LOW entries after reproduction; CR-4, CR-5 advisory.

**Mutation proofs re-run at QA (cycle-3 fixes)**: containment-only matcher → BUG-9 tests red; type checks skipped → BUG-11 test red; real HOME/TMPDIR + no snapshot → BUG-12 test red; old sentence restored → BUG-10 grep red — all `covered`.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · HIGH 2, 1, 0, 0; MEDIUM 2, 3, 4, 1.
**Next Steps**: `/qa-fix` on gate 4 (three small changes in one file); cycle 5 review scoped to files changed since gate 4.
