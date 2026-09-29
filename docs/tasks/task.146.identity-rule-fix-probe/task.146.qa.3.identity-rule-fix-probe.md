# QA Report: Task 146 - qa-fix: a fix to an identity rule must prove both directions (cycle 3)

**Task**: [task.146.identity-rule-fix-probe.md](./task.146.identity-rule-fix-probe.md)
**Gate File**: [task.146.gate.3.identity-rule-fix-probe.yml](./task.146.gate.3.identity-rule-fix-probe.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-25
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-4: QA Testing Results inside the change-log marker block | medium | FIXED | The marker block holds 1 `## ` heading and there is 1 `## QA Testing Results`. Bug 3 is Ready for QA |
| QA-5: count keys on the `•` glyph only | low | FIXED | QA mutations: a fifth item written `+` and one written `2)` after the paragraph each turned both "sits outside" tests red |

## New Findings This Cycle

- **[medium]** `docs/tasks/task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md` — the single qa-fix Change Log row sits above the gate row it answers → move it to the end on each update (**QA-6**, [bug 4](./task.146.bug.4.qa-fix-row-out-of-order.md))
- **[low]** `tests/identity-rule-probe.test.js` — the `"\nCycles 3+"` end anchor has no floor (**QA-7**)

Resolved by QA this cycle, not entered in `top_issues`:
- CR-2: gate 2 `bug_resolution.bugs_remaining` read 0 while bug 3 was open. Corrected in place to 1, with a note.
- CR-3: the QA Testing Results Key Findings described the section as still inside the markers. Restated by this cycle's Step 12 rewrite.

---

## Testing Scope

### Review Methodology

Direct tools, with one Explore subagent for the scoped diff review.
Re-review scope: since 2026-09-25T07:35:00Z (default). That covers 5 files and 739 diff lines, the
contents of `9c378f3c`.

**Scope correction (obs #182).** Gates 1 and 2 had `updated:` written as local SAST time labelled
`Z` (09:20Z and 09:35Z against a real 07:20Z and 07:35Z). `git log --since="2026-09-25T09:35:00Z"`
returned **0 files**. The Step 3b non-vacuity guard only fires when files were found, so the
reviewer would have been dispatched on an empty diff. Both timestamps were corrected to the real
UTC, which was bracketed by each gate's commit time (`b6bf41d5` 07:27:48Z, `9c378f3c` 07:39:39Z),
before the scope was computed. Gate 3 is stamped from `date -u`.
Step 4b: no fenced-bash file changed this cycle (the scoped diff is the test file and docs).

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1–2 | PASS | Unchanged this cycle |
| Phase 3: test | CONCERNS | QA-7 (end-anchor floor) |
| Phase 4: docs and validation | CONCERNS | QA-6 (Change Log ordering) |

## Success Criteria Verification

All criteria hold. ci:fast on `9c378f3c` gave 4011/0.

## Breaking Changes Validation

None.

---

## Issues Found

### MEDIUM Severity Issues (1)

**QA-6: the qa-fix Change Log row is out of order.** Bug report:
[task.146.bug.4.qa-fix-row-out-of-order.md](./task.146.bug.4.qa-fix-row-out-of-order.md). This is a
code-review `bug` with high confidence, so under `code_review_blocking=true` it gates.

### LOW Severity Issues (1)

**QA-7**: the end anchor has no floor.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

- **Performance**: PASS
- **Reliability**: PASS
- **Security**: PASS. Evidence: reasoned; probes executed: 0. No boundary.
- **Maintainability**: PASS (QA-6 and QA-7 tracked)

---

## Code Review

Scoped reviewer: Explore subagent, dispatched 09:40 local and returned in about 77s. It reviewed 5
files and 739 lines and ran the test (7/7).

**Correctness bugs (2):**
- [medium/high] `…/task.146.identity-rule-fix-probe.md:409` — CR-1 → **QA-6** (promoted: bug + high). Verified by reading the table.
- [low/medium] `…/task.146.gate.2…yml:134` — CR-2 → corrected by QA in gate 2

**Cleanups (2):**
- `…/task.146.identity-rule-fix-probe.md:393` — CR-3 → restated by Step 12
- `tests/identity-rule-probe.test.js:713` — CR-4 → **QA-7**

**Boundary rule**: `boundary: false`. **Provenance**: all attributable to this branch.

**Mutation spot check (3c):**
- mutation-proven: a fifth item written `+` after the paragraph, both blocks → "sits outside the four-transition list" ×2 → covered
- mutation-proven: a fifth item written `2)` after the paragraph, both blocks → "sits outside the four-transition list" ×2 → covered

---

## Regression Testing

`command node --test tests/identity-rule-probe.test.js 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js' shared/resources/tests/doc-links.test.mjs shared/resources/tests/change-log.test.mjs`
gave 127/127.

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100 · **Deployment**: CONDITIONAL (QA-6)

**Next Steps**: `/qa-fix` cycle 3 (QA-6, QA-7), then QA cycle 4.
