# QA Report: Task 201 - Pipeline up-front answers and speed modes (cycle 5)

**Task**: [task.201.pipeline-upfront-answers-and-speed-modes.md](./task.201.pipeline-upfront-answers-and-speed-modes.md)
**Gate File**: [task.201.gate.5.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.5.pipeline-upfront-answers-and-speed-modes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-11
**Gate Status**: FAIL

---

## Executive Summary

Re-entry at 5a after `/finalise` found AC10 ("no consumer-specific names") held by no per-PR test.
The fix adds `pipeline-answers-generic.test.mjs`. Its scan has a hole: a fenced `# comment` ends a
section, so most of §0d — including the resolver block — is never scanned.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

## Review Methodology

Re-entry after a finalise DoD-gaps halt (`reenter-qa-after-finalise.sh`, base 4 cycles, budget 6).
Re-review scope: files changed since gate 4 (head 59261730058d; 10 files) — default. Clause 1 of
the safety re-probe: `false`. One Explore subagent, 46 s by its `duration_ms`. Direct tools
otherwise. Step 4b: not applicable — no runnable prose in the change set.

## Re-Review Context

| Finding | Status | Evidence |
| --- | --- | --- |
| DoD gap 1 — AC10 held by no per-PR test | PARTIAL | `pipeline-answers-generic.test.mjs` added; covers the engines and the section heads, not the fenced parts of §0d (CR-1) |

## New Findings This Cycle

- **[high]** `shared/resources/tests/pipeline-answers-generic.test.mjs:49` — `section()` reads a fenced `# comment` as a heading, so §0d ends at step-0 line 703 and lines 703–763 are not scanned → track fence state; add a non-vacuity case.
- **[medium/medium, advisory]** `shared/resources/tests/pipeline-answers-generic.test.mjs:63` — the scanned population is hand-picked; other task.201-modified files are neither scanned nor exempted → derive it or list exemptions.
- **cleanup** `shared/resources/tests/pipeline-answers-generic.test.mjs:32` — `/\bRAPP-\d+/` is redundant.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| No consumer-specific names; all limits from `skills-config.yaml` | FAIL (partial) | Limits: docs test 4a/4g. Names: the new test, which misses the fenced part of §0d (CR-1) |
| All other criteria | PASS | Unchanged since gate 4 (no file they cite changed); fast gate 5303/0 |

## Code Review

**Correctness bugs (2):**
- [high/high] `shared/resources/tests/pipeline-answers-generic.test.mjs:49` — fenced `# comment` ends the section → fence-aware `section()` — promoted to `top_issues` (CR-1, `code_review_blocking`).
- [medium/medium] `shared/resources/tests/pipeline-answers-generic.test.mjs:63` — hand-picked population → advisory.

**Cleanups (1):**
- `shared/resources/tests/pipeline-answers-generic.test.mjs:32` — redundant pattern.

Anchors: all three `ok`.

boundary: false — the change set adds test helpers (`consumerHits`, `section`), which ship nothing and gate no action at run time. probes_executed: 0.

mutation-proven: consumer name added on the §0d heading line → `pipeline-answers-generic` test 3 red → covered
mutation-proven: consumer name added inside the §0d fenced resolver block → nothing red → no-red-untested (this is CR-1)

## NFR Assessment

- **Security** — PASS. Evidence: reasoned. Probes executed: 0. No boundary in the change set.
- **Performance** — PASS.
- **Reliability** — PASS. Fast gate green.
- **Maintainability** — CONCERNS. The AC10 guard is partial.

## Test Artifacts

```bash
npm run ci:fast                                                        # 5303 tests, 0 failed
node --test shared/resources/tests/pipeline-answers-generic.test.mjs  # 3/3; mutation runs above
```

## Final Assessment

**Gate Status**: FAIL
**Quality Score**: 80/100
**Next Steps**: `/qa-fix` fixes CR-1, then re-review at 5a.
