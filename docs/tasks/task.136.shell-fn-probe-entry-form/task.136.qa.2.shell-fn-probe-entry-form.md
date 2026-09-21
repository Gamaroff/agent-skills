# QA Report: Task 136 - A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Task**: [Link to task document](./task.136.shell-fn-probe-entry-form.md)
**Gate File**: [task.136.gate.2.shell-fn-probe-entry-form.yml](./task.136.gate.2.shell-fn-probe-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS

---

## Executive Summary

Re-review of PR #462 at `f2561282` (cycle 2 — a full refute pass over the whole branch diff, not a narrowed read of the fixes). TASK-136-BUG-1 and the three cycle-1 advisories are verified FIXED by execution and closed; the fast gate is green (3883/3884, 0 fail) and the security axis re-measured (41 probes, the form still `engages` on the live boundary). The refute pass found what the cycle-1 fix made visible: the source sentinel does not survive a **top-level `exit`** inside the library (the harness shell ends with the library's code before `|| exit 97` runs — a scored `absent` with a full count, the task.125 shape), and the cycle-1 remap is inert under **`set -e`**. Both reproduced under bash and zsh, one MEDIUM (TASK-136-BUG-2) → **CONCERNS**. The corrected body was prototyped and verified by QA and is in the bug report.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-136-BUG-2 and re-review

---

## Re-Review Context

Re-review scope: unscoped — cycle 2 is always a full refute pass (`PRIOR_GATES=1`, `REFUTE_PASS=true`); `SAFETY_REPROBE=false` (prior security axis `OK measured`; no safety-axis entry in `top_issues`; no safety criterion touched beyond record truthfulness).

| Previous issue | Status | Verification |
| --- | --- | --- |
| TASK-136-BUG-1 (CR-1 c1) — `--fake-gh` recorded on a JS-form entry | **FIXED** | Execution on `f2561282`: `runProbeSpec({ …js entry…, fakeGh })` → `unverifiable`/`bad-fake-gh`, executed 0, `fakeGh: null`, record `fake_gh: null`; `shell:` with the same dir still `engages`. Mutant (decline removed) → row red. Bug 1 → Closed. |
| CR-2 c1 (advisory) — function's own 97/98 collides with sentinels | **FIXED** (but see BUG-2) | Subshell + 97/98→99 remap; row `CR-2` green, mutant (remap dropped) → red. Inert under `set -e` — new CR-3, folded into BUG-2. |
| CR-3 c1 (advisory) — slash-bearing input declined | **FIXED** | `area/backend` case → `engages`; record `fixture` lists controls only; `shell:` still refuses; NUL still declined. Mutant (fixture claim) → row red. |
| CR-4 c1 (advisory) — `FAKE_GH_LOG` unbound | **FIXED** (row) | Row spawns the fake with `FAKE_GH_LOG` and asserts argv + URL. See CR-5 (c2) on reachability through the engine. |
| future c1 — pre-spawn decline for a missing library unpinned | **FIXED** | Row asserts `cases.length === 0`, `shells: null`. |
| future c1 — `shellfn.symlink-escape` (pre-existing) | unchanged | Reproduced identically on base; carried. |

---

## New Findings This Cycle

- **[medium/high]** `shared/resources/security-probe.mjs:399` — **CR-1 → TASK-136-BUG-2**: a top-level `exit N` in a sourced library terminates the harness shell before `|| exit 97` runs; every case mismatches (`exit N ≠ 0`, empty stdout) and the verdict is a **scored** `absent` with a full count, while the engine's comment (`:1153`) claims "an `exit` in the library" is caught by the sentinel. Reproduced: `printf 'f(){ echo hi; }\nexit 1\n'` → rc 1 under bash and zsh. → EXIT trap around the source.
- **[medium/medium]** `shared/resources/probe-boundary-rule.md:209` — **CR-2** (advisory, not gated): without `--fake-gh`, `gh_labels_filter`'s read-failed passthrough prints every candidate (verified: unarmed `priority:urgent` printed, exit 0), so the run lands on `absent`/`present-but-inert` — the verdicts a missing control produces — with only `fake_gh: null` deep in the record to tell "could not look" from "nothing filters". → decline `needs-fake-gh` when the library body names `gh` and no fake was supplied.
- **[low/high]** `shared/resources/security-probe.mjs:399` — **CR-3** (folded into BUG-2): under `set -e` errexit fires on the non-zero `( "$fn" "$@" )` before `rc=$?` and the remap run; `set -e` + `return 97` → rc 97, read as source-failed. → snapshot errexit from `$-`, off in the harness, on inside the subshell.
- **[cleanup]** `shared/resources/security-probe.mjs:1032` — **CR-4**: `collides` still refuses `expected.absent` equal to the input for the shell-fn form (verified: `unverifiable no-hostile-evidence`, "which the fixture itself creates") though no per-case file is written. → apply that half only when `fnName === null`.
- **[cleanup]** `tests/fixtures/fake-gh/gh:39` — **CR-5**: `FAKE_GH_LOG` cannot be bound through the engine (`sandboxEnv` is an allow-list); the log is observable only by spawning the fixture directly, as the row does. → say so in the fixture header.

Combination review: fixes (1)–(5) of cycle 1 are each correct alone; BUG-2 is the interaction of fix (2) (subshell + remap) with two library shapes the fix's own row did not exercise — a top-level `exit` and `set -e` — which is the refute pass doing its job.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: fixtures and red rows | PASS | Verified | unchanged since cycle 1; fake `gh` `issue create` now exercised |
| Phase 2: entry resolution and runner | CONCERNS | Verified | cycle-1 fixes in; **BUG-2** on the sentinel/errexit shapes |
| Phase 3: rule and prompts | PASS | Verified | §5 updated for subshell/99, slash inputs, JS decline; pin 10/10 |
| Phase 4: bundle, evidence, CHANGELOG | PASS | Verified | bundle:check 0; evidence re-run on `f2561282` |

**Overall Phase Completion**: 4/4; 1 with a finding.

---

## Success Criteria Verification

All rows as in cycle 1 (unchanged and re-run): Functional PASS (engages 20/20; echo library `absent`; syntax-error library `unverifiable`/97 every case; 50 pre-existing rows green), Performance PASS (~1 s), Code Quality PASS (62/62 rows; ci:fast 0 fail; shellcheck clean; bundle:check 0; prettier clean), Migration PASS. The "without `--fake-gh` … names the mismatch rather than hanging" criterion holds (exit 1 in ~1.6 s, mismatch named) — CR-2 is about *which verdict* that path lands on, not about hanging.

---

## Breaking Changes Validation

None. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: top-level `exit` in a sourced library escapes the exit-97 sentinel (+ errexit makes the remap inert)**
- **Severity**: MEDIUM · **Category**: Reliability (verdict truthfulness)
- **Bug Report**: [task.136.bug.2.top-level-exit-in-library-escapes-sentinel.md](./task.136.bug.2.top-level-exit-in-library-escapes-sentinel.md)
- **Observation / Impact / Recommendation**: see New Findings CR-1 and CR-3; the verified body is in the bug report.
- **Priority**: P2

### LOW Severity Issues (3, advisory)

CR-2 (`needs-fake-gh` decline), CR-4 (`collides` half for shell-fn), CR-5 (fixture header) — above.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
BUG-2 (two library shapes defeat the sentinel/remap); CR-2 advisory. Rollback unchanged.
### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 41 (`task.136.qa.2.security.run.json`)
- `gh-labels-shell-fn` → engages (bash+zsh, 20/20, 0 escapes); `containsShellFnEntry` → present-but-inert only on the pre-existing symlink limit.
- `mutation-proven: JS decline removed → "TASK-136-BUG-1" row → covered`; `mutation-proven: 97/98→99 remap dropped → "CR-2" row → covered`; `mutation-proven: record fixture claims the per-case file for shell-fn → "CR-3" row → covered`.
### Maintainability — PASS
CR-4, CR-5 advisory.

---

## Code Review

Refute pass (read-only Explore reviewer, whole branch diff at `f2561282`, 2388 lines, bundled copies excluded; every finding re-verified by QA by execution). `code_review_blocking=true` → `CR_BLOCKING=true`.

**Correctness bugs (3):** CR-1 [medium/high] → **promoted, TASK-136-BUG-2**; CR-2 [medium/medium] advisory; CR-3 [low/high] folded into BUG-2 (same fix, one row each).
**Cleanups (2):** CR-4, CR-5.

**Boundary rule**: fired — executed, `probes_executed: 41`. **Step 4b**: same five prose files; this cycle's diff touched no fenced block (`probe-boundary-rule.md` §5 prose only) → information, as cycle 1. **Platform variance**: n/a.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shell:` arm rows; JS arm rows; key-set row | PASS |
| `probe-boundary-signals.test.mjs` | PASS 10/10 |
| `evals/shared/tests`, `tests/*.test.js` (incl. bundled-links) | PASS |
| ShellCheck lane | clean |

---

## Test Artifacts

Files reviewed: as cycle 1 plus `task.136.bug.1.*.md`. Commands: `npm run ci:fast` (log `.claude/state/t136-qa2-testlog.txt`: 3883/3884, 0 fail); the two probe commands with `--record …qa.2.security.run.json`; the BODY reproductions in the bug report. Coverage: not instrumented.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-136-BUG-2 — EXIT trap + errexit snapshot around the subshell, two rows (verified body in the bug report).

### Short-term Actions (Non-Blocking)
1. CR-2 `needs-fake-gh` decline. 2. CR-4 `collides` half. 3. CR-5 fixture header.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100
**Rationale**: one MEDIUM (high confidence, reproduced under both shells) promoted under `code_review_blocking`; no HIGH.
**Deployment Recommendation**: CONDITIONAL — TASK-136-BUG-2 fixed and re-reviewed.

**QA Report**: `task.136.qa.2.shell-fn-probe-entry-form.md` · **Gate File**: `task.136.gate.2.shell-fn-probe-entry-form.yml` · **Next Steps**: `/qa-fix`; re-review cycle 3.
