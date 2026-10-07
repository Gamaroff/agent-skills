# QA Report: Task 194 - Code-review findings anchor to source lines (cycle 3)

**Task**: [task.194.code-review-anchors-name-source-lines.md](./task.194.code-review-anchors-name-source-lines.md)
**Gate File**: [task.194.gate.3.code-review-anchors-name-source-lines.yml](./task.194.gate.3.code-review-anchors-name-source-lines.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-07
**Testing Completed**: 2026-10-07
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| CR2-1 — `--rev` route ignored `--root` | FIXED | test `both routes resolve an anchor against --root…`; mutation (`./` dropped) red |
| CR2-2 — unresolvable `--root` blamed every finding | FIXED | test `a --root that is not a directory exits 2 bad-root…`; mutation red |
| CR2-3 — stale bad-rev prose in review-pr Step 6 | FIXED | paragraph rewritten; documentation probe on four behaviour phrases |
| CR2-4 — directory anchor read as text on `--rev` | FIXED | test `a directory anchor is no-such-file on both routes…`; mutation red |

Bugs 3, 4 and 5 closed.

---

## New Findings This Cycle

- **[medium, confidence medium — advisory]** `skills/qa-task/SKILL.md:637` (same comment at the three
  other dispatchers) — exit 1 is read as malformed anchors, but `node` also exits 1 when the script
  cannot load; reproduced from a non-root cwd (`rc=1`). → read `reason`, not the exit code.
- **[low, confidence medium — advisory]** `shared/resources/finding-anchors.js:176` — a `--root` on
  disk but absent from the `--rev` tree passes `checkTree` and reads `no-such-file`; reproduced in a
  scratch repository. → `git cat-file -e <sha>:./` in `checkTree`.

Neither is gated: QA does not change a reviewer's confidence, and only `bug` + `high` confidence
enters `top_issues[]`. Both are in the gate's `recommendations.future` and hold reliability at
CONCERNS.

---

## Executive Summary

Every cycle 2 fix holds under its own mutation, the broader suites are green (3238/3238), and the
security probe engages. No gated finding remains; two reproduced advisory items keep the reliability
NFR at CONCERNS and are recorded as follow-ups.

**Overall Assessment**: CONCERNS (NFR-level; empty fix queue)
**Deployment Recommendation**: APPROVED for staging; production CONDITIONAL on the follow-ups being tracked

---

## Testing Scope

### Review Methodology

Re-review scope: files changed since gate 2 (head e9b8535fe778; 7 files) — default. One read-only
Explore reviewer, dispatched 10:35:02 UTC, returned after 89 s (`duration_ms` 88832). `SAFETY_REPROBE`
false: clause 1 false (gate 2 security PASS); clauses 2–3 do not hold (no open security finding).
Every reviewer anchor checked `ok`.

---

## Implementation Verification

| Phase | Status |
| --- | --- |
| Phase 1: Prompt contract | PASS |
| Phase 2: Checker engine | PASS (advisory CR-2) |
| Phase 3: Wire the four dispatchers | PASS (advisory CR-1) |
| Phase 4: Population guard and release notes | PASS |

---

## Success Criteria Verification

All twelve criteria hold on the evidence recorded in cycles 1–2; SC-4 now holds for both `bad-rev`
and `bad-root` (exit 2, tests).

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0 (gated), LOW: 0 (gated); 2 advisory.

---

## NFR Assessment

### Performance — PASS

### Reliability — CONCERNS
The two advisory findings above.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11
- Run record `task.194.qa.3.security.run.json`: `engages`, 0 reproduced.

### Maintainability — PASS

---

## Code Review

**Correctness bugs (2, advisory):**
- [medium/medium] `skills/qa-task/SKILL.md:637` — exit 1 conflates malformed anchors and an unloadable script → read `reason`.
- [low/medium] `shared/resources/finding-anchors.js:176` — root absent from the rev tree passes the preflight → `cat-file -e <sha>:./`.

**Cleanups (0).**

**Boundary rule:** `boundary: true` — `probes_executed: 11` (run record `totals.executed`).

mutation-proven: `./` dropped from the `--rev` read → `both routes resolve an anchor against --root…` → covered
mutation-proven: `cat-file blob` → `show` → `a directory anchor is no-such-file on both routes…` → covered
mutation-proven: root check skipped → `a --root that is not a directory exits 2 bad-root…` → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| Shared, eval, qa-task, qa-story, review-code suites | PASS — 3238/3238 at `a73d84e0` |
| PR #594 replay | unchanged (6 × `out-of-range`, control `unchecked-text`, 2 × `no-line`) |
| Focused suites (engine, callers, parity, jq-run) | PASS — 63/63 + 2/2, also under `TMPDIR=/tmp` |

---

## Final Assessment

**Gate Status**: CONCERNS (NFR reliability; no open `top_issues`)
**Quality Score**: 90/100
**Next Steps**: Step 5c — `/review-pr` over PR #596.
