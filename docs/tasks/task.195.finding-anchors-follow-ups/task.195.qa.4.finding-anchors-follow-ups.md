# QA Report: Task 195 - finding-anchors follow-ups

**Task**: [task.195.finding-anchors-follow-ups.md](./task.195.finding-anchors-follow-ups.md)
**Gate File**: [task.195.gate.4.finding-anchors-follow-ups.yml](./task.195.gate.4.finding-anchors-follow-ups.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Re-Review Context

Previous gate: [gate 3](./task.195.gate.3.finding-anchors-follow-ups.yml), CONCERNS 90, head `4d6f7f25`. The fix commit is `882b2643`.

| Finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-195-QA3-1 | medium | ✅ FIXED | `anchorOf` matches only a string. An array, object, number or boolean `file_line` reads `unparseable`, and the same values as a conformance `ref` read `no-line`. A unit test and a CLI test are committed. A partial revert that lets arrays through turns both red. |

No co-located bug reports exist, so Step 9b has nothing to close.

---

## Executive Summary

QA3-1 is fixed. The same fix also changed how a non-string `line_text` is read: it now counts as absent and gets the clean `unchecked-text` verdict, where it used to be compared and read `text-mismatch`. That change came from gate 3's own suggested action, and it is the one new finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#695)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for Step 3b. It was dispatched at 17:07:52 UTC, and its completion notice gives `duration_ms` 66464.

Re-review scope: files changed since gate 3 (head 4d6f7f251f00; 14 files) — default. Clause 1 on gate 3 is false (security PASS, measured), and clauses 2–3 do not hold (no HIGH, no FAIL).

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` changed since gate 3.

---

## New Findings This Cycle

- **[medium]** `shared/resources/finding-anchors.js:147`: a non-string `line_text` is treated as absent. At `4d6f7f25`, the finding `{file_line: "f.js:2", line_text: ["return y;"]}` read `text-mismatch`. At HEAD it reads `unchecked-text`, and so does `line_text: 7`. **Provenance:** introduced by `882b2643`, so it is new to this branch. → TASK-195-QA4-1.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | CONCERNS | Verified | 34 engine tests; TASK-195-QA4-1 |
| Phase 2: dispatchers | PASS | Verified | Unchanged |
| Phase 3: consumer sweep | PASS | Verified | Unchanged |

**Overall Phase Completion**: 3/3 (1 with a finding)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| All tests passing | 0 fail | fast gate 5965 tests, 0 failed @ `882b2643` | PASS |
| SC-1 unparseable code anchor | non-`path:line` → `unparseable` | Non-string anchors are now covered (unit + CLI) | PASS |
| A wrong `line_text` is never clean | `text-mismatch` | A non-string `line_text` reads `unchecked-text` (QA4-1) | CONCERNS |
| SC-10 mutation proofs | covered | 1 of 1 this cycle | PASS |

---

## Breaking Changes Validation

None. **Overall:** PASS.

---

## Issues Found

**Total Issues**: HIGH 0, MEDIUM 1 (TASK-195-QA4-1), LOW 0.

---

## NFR Assessment

### Performance — PASS

Two `typeof` checks.

### Reliability — CONCERNS

TASK-195-QA4-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 43, copied from `task.195.qa.4.security.run.json` `totals.executed`
- `boundary: true`. The review-pr `--inline` guard ran 20 cases and the review-code Step 2b checker ran 23 (`task.195.qa.3.step2b-checker-cases.json`). Both engage, with 0 reproduced and 0 escapes.

### Maintainability — PASS

The string rule lives at the one parse site.

---

## Code Review

**Correctness bugs (1):**

- [medium/high] `shared/resources/finding-anchors.js:147`: a non-string `line_text` gets the clean `unchecked-text` verdict, so a wrong quote no longer reads `text-mismatch`. Fix: only a null, absent or empty `line_text` is unchecked, and any other non-string is a mismatch. **Promoted: TASK-195-QA4-1.**

**Cleanups (0).**

The reviewer also checked identity pairs. A padded `"  f.js:2  "` still parses, `""` and `null` still read `unparseable`, and a String object reads `unparseable` (JSON cannot produce one). The non-string `fileLine` appears only in `--json`, which callers read for `.reason`. The selectors never reach an `unparseable` finding. One pre-existing issue is routed to future: a `file_line` with leading whitespace reaches the selector untrimmed.

mutation-proven: `anchorOf` admits an array again (`typeof raw === "string" || Array.isArray(raw)`, stringified) → `a non-string anchor is never matched: …` and `CLI: an array file_line exits 1 …` → covered

This proof ran in a detached scratch worktree at `882b2643`, after which the worktree was removed.

Platform variance: `TMPDIR=<scratch>/tmpalt command node --test` over the engine, blocks, review-code and review-pr suites gave 211 pass, 0 fail.

---

## Regression Testing

`npm run ci:fast` on `882b2643` ran 5965 tests with 0 failures.

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                                    # 5965 tests, 0 fail
node .agents/skills/qa-task/references/security-probe.mjs … --record task.195.qa.4.security.run.json   # 2 controls, 43/0
TMPDIR=<scratch>/tmpalt node --test <4 affected suites>            # 211/0
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: QA3-1 is closed. The fix weakened `line_text` handling, and that must be undone before acceptance.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-195-QA4-1 fixed.
**Next Steps**: 5b `/qa-fix` (cycle 4 of 5), then cycle 5.
