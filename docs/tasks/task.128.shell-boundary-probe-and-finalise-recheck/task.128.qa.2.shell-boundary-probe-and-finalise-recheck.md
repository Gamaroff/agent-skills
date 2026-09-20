# QA Report: Task 128 - A refusing shell script is a boundary the probe engine cannot reach, and finalise can only accept or halt (cycle 2)

**Task**: [Link to task document](./task.128.shell-boundary-probe-and-finalise-recheck.md)
**Gate File**: [task.128.gate.2.shell-boundary-probe-and-finalise-recheck.yml](./task.128.gate.2.shell-boundary-probe-and-finalise-recheck.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-20
**Testing Completed**: 2026-09-20
**Gate Status**: FAIL

---

## Executive Summary

Cycle 1's four fixes hold — each verified by execution on the committed tree (`d7f0e9bf`). The cycle-2 **refute pass** over the whole branch diff and the **safety re-probe** found the next layer of the same defect class: a side effect a script writes to its cwd is invisible to both `absent` and the escape sentinel (HIGH, reproduced with a no-`cd` fixture); Step 8a's licence is issued on forecast inputs never checked against git; a target-produced 126/127 exit is declined instead of compared (cycle-1 fix 2 turned a reproduction into a decline); and a `--cases-file` case whose `expected` compares nothing scores the pre-fix script `engages`. Two LOW bugs and three cleanups complete the list.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

**Re-review scope: unscoped (prior gate: security CONCERNS on a fail-open finding; cycle 2 is a full-diff refute pass; SAFETY RE-PROBE directive appended by clause 2 — BUG-1 was a safety-path HIGH).**

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-128-BUG-1 evaluator no-ops via symlinked path | **FIXED** | `node .agents/skills/finalise/references/finalise-fix-and-recheck.mjs --finding …` prints the verdict and exits 1; symlinked-invocation test green |
| TASK-128-BUG-2 missing `shell:` script scored `absent` | **FIXED** | `--entry shell:shared/resources/does-not-exist.sh` → `unverifiable / entry-not-probeable / executed 0`; directory path same |
| TASK-128-BUG-3 NUL entry throws | **FIXED** | `runProbeSpec({entry:"shell:…\0.sh"})` → `unverifiable / bad-entry`, no throw |
| TASK-128-BUG-4 `mutation-proved` boolean | **FIXED** | a red run file → proceed; the same file edited green → `shows no failing test` |

## New Findings This Cycle

- **[high]** `shared/resources/security-probe.mjs` — **BUG-5**: the child runs with `cwd: workDir`; `absent` looks in `fixtureDir`; the sentinel skips `workDir`. A no-`cd` eval script (`for f in "$1"/*; do eval ": $(basename "$f")"; done`) created `PWNED` in `workDir`: `command-substitution` → `rejected`, `escapes: 0`. → spawn with `cwd: fixtureDir`; add the no-`cd` fixture. (refute CR-1)
- **[medium]** `shared/resources/finalise-fix-and-recheck.mjs` / Step 8a — **BUG-6**: `"commits": 1` and `touched` are forecasts; the licensing run precedes the commit; nothing compares them with git. → `--git-base` derivation + post-commit licence. (refute CR-2)
- **[medium]** `shared/resources/security-probe.mjs` — **BUG-7**: the 126/127 branch conflates bash's launch failure with the target's own exit; `bash "$1"` never consults the shebang (verified: a `#!/nonexistent` script prints `ran`, rc 0), so after the stat check the branch fires on the target's code and declines what may be a reproduction. → key on launch-failure stderr. (refute CR-3, adopted after verification)
- **[medium]** `shared/resources/security-probe.mjs` — **BUG-8**: `expected: {}` / absent-only → pre-fix script `engages`, `executed 4`. → decline an `expected` with none of stdout/exit/stderr. (safety re-probe)
- **[low]** `finalise-fix-and-recheck.mjs:107` — CR-4: red marker and test name are checked independently over the whole log.
- **[low]** `security-probe.mjs` `toRecordEntry` — CR-5: `shells` never reaches the record or the emitted block.
- Cleanups (advisory): CR-6 declined/escape ids lack `@shell`; CR-7 stat check runs per case, hoist to `runProbeSpec`; CR-8 duplicate `refuses` match.

---

## Testing Scope

### Review Methodology

Standard mode; cycle 2 = full branch diff (34 files, 3862 lines, bundled copies excluded), one read-only Explore reviewer with the REFUTE PASS and SAFETY RE-PROBE directives (returned in 5m26s: 5 bugs + 3 cleanups). QA re-verified BUG-1..4 by execution, re-ran both recorded security probes on the fixed tree (`task.128.qa.2.security.run.json`, 39 executed), enumerated `compareExpected` / `runShellCase` / `resolveEntry` inputs afresh (empty `expected`, absent-only, `SHELL:` case, `shell:` with `#`, `..` as a name, `LC_ALL`), and re-ran Step 4b on `skills/finalise/SKILL.md` with binds (2 runnable executed under bash + zsh, 0 findings, 27 mutating refused by design, 1 template placeholder). Platform variance: `TMPDIR=/tmp` → 54/0.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: filename sink + shell entry | CONCERNS | 34 probe tests green | BUG-5 (HIGH), BUG-7, BUG-8; CR-5..7 |
| Phase 2: boundary rule + signals | PASS | 9 signal tests green | CR-8 cosmetic |
| Phase 3: finalise fix-and-recheck | CONCERNS | 20 tests green | BUG-6, CR-4 |

---

## NFR Assessment

### Performance — PASS
Unchanged.

### Reliability — CONCERNS
BUG-6 (licence on forecasts), BUG-7 (decline instead of compare).

### Security — CONCERNS

- **Status**: CONCERNS · **Evidence**: measured · **Probes executed**: 39 (record `task.128.qa.2.security.run.json`, `totals.executed`)
- `path` corpus via `shell:` against `resolveEntry`: 11 executed; `null-byte` now rejected (BUG-3); `symlink-escape` still accepted — pre-existing documented limit, future. `filename` corpus against `qa-cycle.sh`: engages 28/28.
- BUG-5 and BUG-8 are both routes by which a probe that saw nothing reports a control that holds.

### Maintainability — PASS

---

## Code Review

Refute pass, full diff; `code_review_blocking=true` → bug + high-confidence promoted: CR-1 → BUG-5 (high), CR-2 → BUG-6 (medium), CR-4 and CR-5 (low) entered as themselves; CR-3 (medium confidence) adopted by QA as BUG-7 after verification; BUG-8 is QA's own execution finding.

**Correctness bugs (5):** CR-1 [high/high], CR-2 [medium/high], CR-3 [medium/medium], CR-4 [low/high], CR-5 [low/high] — as listed under New Findings.
**Cleanups (3):** CR-6, CR-7, CR-8.

**Mutation proofs (cycle-1 fixes, re-run at QA against `d7f0e9bf`, cp-snapshot/restore):** raw CLI compare → BUG-1 test red → covered; stat check removed → BUG-2 test red → covered; NUL check disabled → BUG-3 test red → covered; run check skipped → BUG-4 test red → covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe` + `finalise-fix-and-recheck` suites | 54/0 (also under `TMPDIR=/tmp`) |
| Fast gate at cycle-1 commit | 3618/0 |

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 50/100
**Rationale**: one HIGH in new code (a side effect the probe cannot see), three MEDIUMs of the same self-report / ambiguous-signal class, all reproduced. HIGH count 2 → 1 across cycles; the loop is converging.
**Deployment Recommendation**: BLOCKED — BUG-5..8, CR-4, CR-5 fixed and re-reviewed.

**QA Report**: `task.128.qa.2.shell-boundary-probe-and-finalise-recheck.md` · **Gate File**: `task.128.gate.2.shell-boundary-probe-and-finalise-recheck.yml`
**Next Steps**: `/qa-fix` on gate 2; cycle 3 (scoped to files changed since gate 2).
