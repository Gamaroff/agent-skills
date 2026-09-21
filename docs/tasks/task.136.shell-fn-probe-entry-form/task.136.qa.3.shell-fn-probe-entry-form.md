# QA Report: Task 136 - A `shell-fn:` entry form for the security probe, and a fake-`gh` affordance

**Task**: [Link to task document](./task.136.shell-fn-probe-entry-form.md)
**Gate File**: [task.136.gate.3.shell-fn-probe-entry-form.yml](./task.136.gate.3.shell-fn-probe-entry-form.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-21
**Testing Completed**: 2026-09-21
**Gate Status**: CONCERNS (no open finding)

---

## Executive Summary

Re-review of PR #462 at `a99f881f`, scoped to the files changed since gate 2 (cycle 2's fixes). TASK-136-BUG-2 is verified FIXED by execution and closed; the cycle-2 advisories are verified closed; the fast gate is green (3887/3888) and the security axis re-measured (41 probes, `engages` on the live boundary, no escape). The reviewer returned three findings, each verified true by QA but rated **medium confidence** by the reviewer, so none enters the queue by the mapping rule: all three are *limits* of the new mechanism (a library that installs its own EXIT trap; the `needs-fake-gh` decline covering `shell-fn:` only; the `gh` detector's terminator/transitivity). Reliability CONCERNS records them; the queue is empty, so this gate reaches the PR conformance review.

**Overall Assessment**: CONCERNS — no open finding
**Deployment Recommendation**: staging APPROVED; production CONDITIONAL on a follow-up task for the three limits

---

## Re-Review Context

Re-review scope: since 2026-09-21T20:32:49Z (default) — 13 files (engine, tests, rule, finalise prompt, fixture header, cycle-2 artefacts); `SAFETY_REPROBE=false` (`OK measured`).

| Previous issue | Status | Verification |
| --- | --- | --- |
| TASK-136-BUG-2 (c2 CR-1 + CR-3) — top-level `exit` escapes the sentinel; `set -e` skips the remap | **FIXED** | Library ending `exit 1` → `entry-not-probeable`, executed 0, `source … failed (exit 97)`; `set -e` + `return 97` → `exit 99 ≠ 0`, declined 0, executed 20. Mutants: trap removed → row red; disarm removed → green row red. → Closed. |
| c2 CR-2 (advisory) — bare run scored through the passthrough | **FIXED** | `runProbeSpec` without `fakeGh` on `gh-labels.sh` → `unverifiable`/`needs-fake-gh`, executed 0; mutant (detector never matches) → row red. See c3-CR-2/CR-3 for what it does not yet cover. |
| c2 CR-4 (advisory) — `collides` half for shell-fn | **FIXED** | `absent: [<input>]` case → `engages`; `shell:` still refuses. |
| c2 CR-5 (advisory) — `FAKE_GH_LOG` reachability | **FIXED** | Fixture header states it. |
| shellfn.symlink-escape (pre-existing) | unchanged | carried. |

---

## New Findings This Cycle

- **[medium/medium]** `security-probe.mjs:413` — **c3-CR-1**: a library that installs its own top-level `trap … EXIT` before a `|| exit 1` guard displaces the source guard; verified bash+zsh → rc 1, scored `absent` with a full count. → shadow `exit` during the source (`exit() { builtin exit 97; }`, `unset -f exit` after) + a row. *Advisory (confidence medium as returned).*
- **[medium/medium]** `security-probe.mjs:699` — **c3-CR-2**: the `needs-fake-gh` decline is gated on `kind === "shell-fn"` only, so a `shell:` script naming `gh` without `--fake-gh` still runs the host `gh` and is scored (pre-existing for the `shell:` form since task.128; the flag's header says it covers both shell forms). → `isShellForm && fakeGhDir === null` + the `shell:` row. *Advisory.*
- **[medium/medium]** `security-probe.mjs:377` — **c3-CR-3**: `GH_COMMAND_WORD` reads only the entry file and needs trailing whitespace — verified: `gh>/dev/null`, `gh;`, `(gh)`, `"$GH" api` do not match, and a library that `source`s `gh-labels.sh` is run bare. → widen the terminator class to `[\s;|&)>]|$` and follow one level of top-level `source`/`.`. *Advisory.*

All three are recorded as `recommendations.future` with concrete fixes; none is a regression — each is a shape the cycle-2 fix does not yet reach.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1 | PASS | Verified | unchanged |
| Phase 2 | PASS | Verified | cycle-2 fixes in; three documented limits (advisory) |
| Phase 3 | PASS | Verified | §5 + finalise prompt updated; pin 10/10 |
| Phase 4 | PASS | Verified | bundle:check 0; evidence re-run on `a99f881f` |

**Overall Phase Completion**: 4/4.

---

## Success Criteria Verification

All criteria re-run and PASS. The "without `--fake-gh` … names the mismatch rather than hanging" criterion is satisfied by the `needs-fake-gh` decline: no hang (immediate), the declined detail names the library and the flag — the cause of the would-be mismatch — rather than scoring the passthrough.

---

## Breaking Changes Validation

None. **Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0) · ### MEDIUM Severity Issues (0 in the queue)

### LOW / advisory (3)
c3-CR-1, c3-CR-2, c3-CR-3 — above.

**Total Issues**: HIGH: 0, MEDIUM: 0 (queue), advisory: 3

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
The three verified limits above; none reproduces a wrong verdict on the boundary this task was built for (`gh-labels.sh`, which sets no trap, uses no `set -e`, and names `gh` directly with whitespace).
### Security — PASS
- **Status**: PASS · **Evidence**: measured · **Probes executed**: 41 (`task.136.qa.3.security.run.json`)
- `mutation-proven: trap disarm removed → "gh_labels_filter engages" row → covered`; `mutation-proven: EXIT trap removed → "exits at top level" row → covered`; `mutation-proven: GH_COMMAND_WORD never matches → "needs-fake-gh" row → covered`.
### Maintainability — PASS

---

## Code Review

Scoped pass (read-only Explore reviewer, 13 files / 2036 diff lines; body executed by the reviewer under bash 5.3, bash 3.2 and zsh 5.9; each finding re-verified by QA). `code_review_blocking=true` → `CR_BLOCKING=true`; **no finding is `confidence: high`, so none is promoted** — the mapping keeps the reviewer's confidence exactly as returned.

**Correctness bugs (3, all medium/medium):** c3-CR-1, c3-CR-2, c3-CR-3 (above). **Cleanups (0).**

**Boundary rule**: fired — executed, `probes_executed: 41`. **Step 4b**: rule §5 and the finalise prompt changed (prose, not fenced blocks) → information. **Platform variance**: n/a.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shell:` arm rows; JS arm rows; key-set row | PASS |
| `probe-boundary-signals.test.mjs` | PASS 10/10 |
| `evals/shared/tests`, `tests/*.test.js` | PASS |
| ShellCheck lane | clean |

---

## Test Artifacts

Commands: `npm run ci:fast` (log `.claude/state/t136-qa3-testlog.txt`: 3887/3888, 0 fail); the two probe commands with `--record …qa.3.security.run.json`; the BODY reproduction for c3-CR-1. Coverage: not instrumented.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Follow-up task: c3-CR-1 (shadow `exit` during the source), c3-CR-2 (`needs-fake-gh` for every shell form), c3-CR-3 (detector terminators + one-level `source`).

---

## Final Assessment

**Gate Status**: CONCERNS (no open finding) · **Quality Score**: 90/100
**Rationale**: no HIGH, no promoted MEDIUM; reliability CONCERNS on three verified, documented limits with concrete fixes recorded.
**Deployment Recommendation**: staging APPROVED; production CONDITIONAL — follow-up task.

**QA Report**: `task.136.qa.3.shell-fn-probe-entry-form.md` · **Gate File**: `task.136.gate.3.shell-fn-probe-entry-form.yml` · **Next Steps**: 5c `/review-pr`; `/finalise`.
