# QA Report: Task 195 - finding-anchors follow-ups

**Task**: [task.195.finding-anchors-follow-ups.md](./task.195.finding-anchors-follow-ups.md)
**Gate File**: [task.195.gate.5.finding-anchors-follow-ups.yml](./task.195.gate.5.finding-anchors-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: PASS

---

## Re-Review Context

The previous gate is [gate 4](./task.195.gate.4.finding-anchors-follow-ups.yml): CONCERNS 90 at head `882b2643`. The fix commit is `f192e953`.

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-195-QA4-1 | medium | ✅ FIXED | `fieldOf` classifies every field. A non-string `line_text` (`[]`, `{}`, `0`, `false`, or an array holding the correct text) reads `text-mismatch` on both lenses. Absent, null and blank read `unchecked-text`. Unit, `fieldOf` and CLI tests are committed. Mutations M1, M2 and M3 each turn tests red. |

The qa-fix applied the Step 2.6 **consolidate** move: one allow-list reader replaces the per-field type checks that cycles 3 and 4 had patched one at a time.

No co-located bug reports exist, so Step 9b has nothing to close.

---

## Executive Summary

QA4-1 is closed. The cycle 5 review found nothing. It checked every code point for blank-string agreement and compared verdicts against `origin/develop` for string inputs. Only non-string inputs changed, and they changed as intended.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#695)

### Review Methodology

The review used direct tools plus one read-only Explore reviewer for Step 3b. The reviewer was dispatched after 17:13 UTC, and its completion notice gives `duration_ms` 63158.

Re-review scope: files changed since gate 4 (head 882b26431bed; 14 files), the default. Clause 1 on gate 4 is false (security PASS, measured), and clauses 2–3 do not hold (no HIGH, no FAIL).

Step 4b does not apply: no `SKILL.md` or `shared/resources/*.md` changed since gate 4.

---

## New Findings This Cycle

None.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | 37 engine tests |
| Phase 2: dispatchers | PASS | Verified | Unchanged |
| Phase 3: consumer sweep | PASS | Verified | Unchanged; `expected` reaches only `--json` |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| All tests passing | 0 fail | fast gate 5968 tests, 0 failed @ `f192e953` | PASS |
| SC-1 unparseable code anchor | non-`path:line` → `unparseable` | Unchanged; a blank `file_line` is read as absent, which is still `unparseable` | PASS |
| A wrong `line_text` is never clean | `text-mismatch` | Every non-string reads `text-mismatch`, on both lenses | PASS |
| SC-10 mutation proofs | covered | 3 of 3 this cycle | PASS |

---

## Breaking Changes Validation

None. Verdicts for string inputs match `origin/develop`. **Overall:** PASS.

---

## Issues Found

**Total Issues**: HIGH 0, MEDIUM 0, LOW 0.

---

## NFR Assessment

### Performance — PASS

One classification per field.

### Reliability — PASS

A non-string quote is no longer a silent clean verdict.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 43, copied from `task.195.qa.5.security.run.json` `totals.executed`
- `boundary: true`. The review-pr `--inline` guard ran 20 cases and the review-code Step 2b checker ran 23. Both engage, with 0 reproduced and 0 escapes.

### Maintainability — PASS

`fieldOf` is the single place that decides how a field is read.

---

## Code Review

**Correctness bugs (0). Cleanups (0).**

The reviewer checked four things:

- **Blank strings.** `trim() === ""` agrees with the old `norm() === ""` on every code point from U+0000 to U+10FFFF. U+00A0, U+FEFF, U+2028 and U+3000 are blank under both; U+180E is blank under neither.
- **String and null inputs.** Each gives the same verdict as on `origin/develop`.
- **Blank `file_line`.** It is now read as absent, which is still `unparseable`.
- **The non-string `expected`.** Only `--json` reads it.

mutation-proven: invalid `line_text` read as absent (the QA3 behaviour) → `line_text: only absent is unchecked; …` and `CLI: an array line_text exits 1 …` → covered
mutation-proven: invalid `line_text` stringified and compared → `line_text: only absent is unchecked; …` → covered
mutation-proven: `fieldOf` merges `[]` with absent → `line_text: only absent is unchecked; …` and `fieldOf: the one reader of every finding field` → covered

These ran in qa-fix cycle 4 from a `cp` snapshot, and the restore was verified with `cmp`.

Platform variance: `TMPDIR=<scratch>/tmpalt command node --test` over the engine, blocks, review-code and review-pr suites gave 214 pass, 0 fail.

---

## Regression Testing

`npm run ci:fast` on `f192e953` ran 5968 tests with 0 failures.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                                    # 5968 tests, 0 fail
node .agents/skills/qa-task/references/security-probe.mjs … --record task.195.qa.5.security.run.json   # 2 controls, 43/0
TMPDIR=<scratch>/tmpalt node --test <4 affected suites>            # 214/0
```

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every gate finding is closed and mutation-proven, the review is clean, and the probe measures 43/0.
**Quality Score**: 100/100

**Deployment Recommendation**: READY
**Next Steps**: 5c `/review-pr`, then `/finalise`.
