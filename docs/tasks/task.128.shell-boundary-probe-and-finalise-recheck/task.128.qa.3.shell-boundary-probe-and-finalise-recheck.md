# QA Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt (cycle 3)

**Task**: [Link to task document](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Gate File**: [task.128.gate.3.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.3.shell-boundary-probe-and-finalise-recheck.yml)
**QA Engineer**: QA Engineer · **Review Date**: 2026-09-20 · **Gate Status**: CONCERNS

---

## Executive Summary

Cycle 2's four fixes hold — each verified by execution on `7b36fcac`. No HIGH remains (2 → 1 → 0). The safety re-probe found four MEDIUMs in the same family: the launch-failure matcher also matches bash's runtime errors *inside* the target, so a script that runs a name is declined instead of compared (BUG-9 — the BUG-7 scenario itself, one regex short); three prose sites still tell a reader that non-JS is unverifiable (BUG-10); a malformed `expected` scores `absent` or throws (BUG-11); side effects outside the fixture directory are invisible (BUG-12). One medium-confidence design finding (CR-5) is routed to future.

**Overall Assessment**: CONCERNS · **Deployment Recommendation**: CONDITIONAL (BUG-9..12 fixed and re-reviewed)

---

## Re-Review Context

**Re-review scope: unscoped (SAFETY RE-PROBE — gate 2's HIGH was a blind spot of the security probe itself).** The scoped file set since gate 2 was also computed (22 files: the four modules, four suites, three fixtures, Step 8a prose, artifacts).

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-128-BUG-5 side effect in child cwd | **FIXED** | `eval-names-nocd.sh` via `shell:` → both substitution cases reproduced under both shells |
| TASK-128-BUG-6 licence on forecast | **FIXED** | `--git-base HEAD~1` on this branch refuses the record (`touched` disagrees with git) |
| TASK-128-BUG-7 target 126/127 declined | **FIXED (empty-stderr shape)** | an `exit 127` script is compared (`absent`, executed 28) — but see BUG-9 for the stderr shape |
| TASK-128-BUG-8 empty expected | **FIXED** | `expected: {}` → `entry-not-probeable`, executed 0 |

## New Findings This Cycle

- **[medium]** `security-probe.mjs` — **BUG-9**: `isLaunchFailure` matches stderr *containing* `entryPath`; bash prefixes runtime errors inside the script with that path (`<entryPath>: line 3: <fixture>/x: Permission denied`, exit 126). A `set -e; for f in "$1"/*; do "$f"; done` script → declined, executed 0. (CR-1)
- **[medium]** `security-review-prompt.md:97,235`, `skills/review-security/SKILL.md:155` — **BUG-10**: "Non-JS entry points are `unverifiable` in v1" survives at three sites the contract test cannot see. (CR-4)
- **[medium]** `security-probe.mjs` — **BUG-11**: `{stdout: 12}` / `{stdout: null}` → `absent`, executed 4; `{exit: 0, absent: 5}` → `TypeError` out of `runProbeSpec`. (CR-3, adopted after reproduction)
- **[medium]** `security-probe.mjs` — **BUG-12**: real `HOME`/`TMPDIR`, real script directory; a side effect written there is invisible to `absent` and the sentinel. Also `PWD=workDir` vs `cwd: fixtureDir` (CR-6). (CR-2, adopted)
- **Future** — CR-5: `severity` / `otherFindingsOpen` remain typed into the finding record with nothing the evaluator opens to contradict them; deriving them needs a defined on-disk artefact for the DoD agents' YAML — follow-up task.

---

## Review Methodology

Standard; cycle 3 with the SAFETY RE-PROBE directive over the full diff (4822 lines, bundled copies excluded); one read-only Explore reviewer (6m28s; 5 bugs + 1 cleanup). QA re-verified BUG-5..8 by execution, re-ran both recorded probes (`task.128.qa.3.security.run.json`, 39 executed, `shells` now in the record), reproduced CR-1 and CR-3, grepped CR-4. Step 4b on `skills/finalise/SKILL.md`: 2 runnable executed under bash + zsh, 0 findings, 28 mutating refused by design (incl. the new step-2b block), 1 template placeholder. `TMPDIR=/tmp`: 69/0.

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: filename sink + shell entry | CONCERNS | BUG-9, BUG-11, BUG-12 |
| Phase 2: boundary rule + signals | CONCERNS | BUG-10 (three stale sites) |
| Phase 3: finalise fix-and-recheck | PASS | BUG-6 fixed; CR-5 future |

## NFR Assessment

**Performance** — PASS. **Reliability** — CONCERNS (BUG-9 declines a reproduction; BUG-11 throws). **Security** — CONCERNS, measured, 39 probes (record qa.3); BUG-12 is a probe blind spot. **Maintainability** — PASS.

## Code Review

Reviewer findings CR-1 (medium/high) → BUG-9; CR-4 (medium/high) → BUG-10; CR-3 (medium/medium) → BUG-11 and CR-2 (medium/medium) → BUG-12, both adopted after reproduction; CR-5 (medium/medium) → future; CR-6 cleanup folded into BUG-12.

**Mutation proofs re-run at QA (cycle-2 fixes, on `7b36fcac`)**: cwd reverted → BUG-5 test red; git cross-check skipped → BUG-6 test red; matcher on exit code alone → BUG-7 tests red; comparable-keys guard removed → BUG-8 test red — all `covered`.

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 60/100 · HIGH sequence 2, 1, 0 — converging; MEDIUM 2, 3, 4 (the re-probe widens the surface each cycle by design).
**Next Steps**: `/qa-fix` on gate 3; cycle 4 review scoped to files changed since gate 3.
