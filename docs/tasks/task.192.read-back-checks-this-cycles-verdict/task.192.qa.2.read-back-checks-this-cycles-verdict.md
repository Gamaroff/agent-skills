# QA Report: Task 192 - Read-back checks this cycle's verdict (cycle 2, refute pass)

**Task**: [task.192](./task.192.read-back-checks-this-cycles-verdict.md)
**Gate File**: [task.192.gate.2.read-back-checks-this-cycles-verdict.yml](./task.192.gate.2.read-back-checks-this-cycles-verdict.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-19
**Testing Completed**: 2026-10-19
**Gate Status**: CONCERNS

---

## Re-Review Context

| Previous finding | Status | Evidence |
| --- | --- | --- |
| QA-1 (medium): SKILL.md read-back lists omit the verdict check and the lock retry | ✅ FIXED | Both lists say "checks five things"; item 2 states the retry and item 5 the verdict check. `tests/qa-read-back-block.test.js` passes. bug.1 is closed. |
| QA-2 (low): only the first `**Gate Decision**` line is read | ✅ FIXED | `matchAll` over the section's lines. The new VERDICT_HALTS case and probe case `stale-decision-after-current` are now refused. mutation-proven (below). |

## Executive Summary

Cycle 2 re-reviewed the whole branch diff to refute it. Cycle 1's fixes hold. The refute pass found
two medium defects in the verdict rule the task adds, both reproduced by running the CLI:

- it halts a correct FAIL document when a status row follows the verdict row;
- it reads clean when a cycle repeats the previous verdict without writing its own row.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Re-review scope: unscoped. Cycle 2 is the refute pass over the full `origin/develop...HEAD` diff
(19 files).

- Direct tools, plus one dispatched Explore reviewer with the refute directive. Dispatched
  07:34:00Z; it returned after 160 s (`duration_ms` 160399).
- The reviewer's line anchors were checked with `finding-anchors.js --rev HEAD`.
- Mutation proofs ran after the reviewer had returned.
- Step 4b ran the changed blocks of both SKILL.md files: 0 changed blocks, because both edits are
  list prose outside any fence.
- Platform variance: `TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs` passes,
  0 failures.

## New Findings This Cycle

- **[medium]** `shared/resources/qa-read-back.js:147` — the verdict row is the newest qa-* row, so
  a `Status → in-progress | qa-task` row after a FAIL verdict row halts a correct document (QA2-2,
  [bug.3](./task.192.bug.3.status-row-after-verdict-halts-a-correct-document.md)). Choose the newest
  `QA gate` row instead.
- **[medium]** `shared/resources/qa-read-back.js:155` — a same-token cycle with no row of its own
  reads clean (QA2-1, [bug.2](./task.192.bug.2.same-verdict-cycle-reads-clean-without-its-row.md)).
  Tie the row to the cycle.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: verdict checks | CONCERNS | Verified | QA2-1 and QA2-2 are in this phase's rule |
| Phase 2: lock retry | PASS | Verified | Unchanged since cycle 1 |
| Phase 3: bundle, docs, CHANGELOG | PASS | Verified | `bundle:check` reports 0 problems; copies match except the generated header |

**Overall Phase Completion**: 3/3 implemented; phase 1 has two open defects.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| Mismatched `**Gate Decision**` exits 1 | PASS | VERDICT_HALTS, `qa-read-back.test.mjs:533` |
| Newest QA row must name the token; a later `qa-fix` row does not trigger it | CONCERNS | Held by tests at `:533` and `:607`. The rule's row choice is wrong on a status row (QA2-2). |
| Missing decision line exits 1 | PASS | VERDICT_HALTS "a QA section with no **Gate Decision** line" |
| Lock released / persistent / non-lock | PASS | Tests at `:628`, `:651`, `:668` and `:686` |
| Performance (≤ 1.4 s, persistent lock only) | PASS | Sleeps asserted at `:651` |
| `npm test`, `bundle:check`, `prettier --check .` | PASS | Targeted suites 106/106; ci:fast in qa-fix cycle 1: 5894 tests, 0 failures; bundle:check 0 problems; prettier clean |
| CHANGELOG names both checks and the retry | PASS | `CHANGELOG.md:173` |

---

## Breaking Changes Validation

None. The change tightens a guard; QA2-2 is the case where it tightens too far.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: a status row after the verdict row halts a correct document (QA2-2)**
- **Category**: Functional
- **Bug Report**: [task.192.bug.3](./task.192.bug.3.status-row-after-verdict-halts-a-correct-document.md)
- **Observation**: the document exits 1 on this branch and 0 on `origin/develop`. 8 such rows
  exist in the corpus; the newest is task.160, 2026-09-27.
- **Impact**: the FAIL path of the QA loop halts on a correct document.
- **Priority**: P2

**Issue: a same-verdict cycle reads clean without its own row (QA2-1)**
- **Category**: Functional
- **Bug Report**: [task.192.bug.2](./task.192.bug.2.same-verdict-cycle-reads-clean-without-its-row.md)
- **Observation**: gate 2 CONCERNS, rows `QA gate CONCERNS … | qa-task`, then
  `… | qa-fix`, and no cycle-2 row: exit 0.
- **Impact**: the obs #205 case still passes whenever the verdict repeats.
- **Priority**: P2

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS
Unchanged since cycle 1.

### Reliability — CONCERNS
The new rule rejects a correct document on the FAIL path (QA2-2) and misses one stale case (QA2-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 17 (`totals.executed` in `task.192.qa.2.security.run.json`)
- The CLI form ran 5 legitimate cases (all accepted) and 12 hostile cases (all refused). The cycle-1
  reproduction `stale-decision-after-current` is now refused.

### Maintainability — PASS
Both SKILL.md lists match the engine.

---

## Code Review

Refute pass over the full branch diff. `code_review_blocking=true`.

**Correctness bugs (3):**
- [medium/high] `shared/resources/qa-read-back.js:155` — the verdict check compares only tokens, so
  a same-token cycle with no row of its own reads clean → tie the row to the cycle. **Promoted to
  QA2-1.**
- [medium/medium] `shared/resources/qa-read-back.js:148` ⚠️ unverified anchor (text-mismatch) —
  the newest qa-* row can be a status row, which halts a correct FAIL document → choose the newest
  `QA gate` row. Not promoted, because its confidence is medium. QA reproduced it independently and
  raised it as QA2-2. The code it names is at line 149.
- [low/medium] `shared/resources/tests/qa-read-back.test.mjs:696` — the real-time CLI lock test
  does not assert that a retry happened → assert `stageAttempts` > 1. This is the same point as
  cycle 1's CR-2, kept deliberately because of the child start-up race. Routed to future.

**Cleanups (2):**
- `shared/resources/qa-read-back.js:317` — any stderr that mentions `index.lock` counts as held, so
  a permission failure also waits → match `index.lock': File exists`. Routed to future.
- `shared/resources/qa-read-back.js:153` — a document with no Change Log gets two problems for one
  cause → skip the qa-row problem when there are no rows. Same as cycle 1's CR-3; routed to future.

mutation-proven: `for (const m of lines)` → `lines.slice(0, 1)` → "halts on a stale **Gate Decision** after a current one in the same section" → covered

Provenance (5b): QA2-2 exits 0 with `origin/develop`'s engine and 1 with this branch's, so the
change introduced it. QA2-1 is in the verdict rule this task adds, which is in scope.

Boundary: `boundary: true`. `qa-read-back.js` decides whether a QA cycle may post. It was probed
with the cli form, `probes_executed: 17`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| SKILL.md read-back blocks (`tests/qa-read-back-block.test.js`) | PASS |
| Bundled copies (`skills/qa-*/references/tests/qa-read-back.test.mjs`) | PASS |
| Correct FAIL documents carrying a status row | FAIL (QA2-2) |

---

## Test Artifacts

### Test Commands Executed

```bash
node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-read-back-block.test.js skills/qa-task/references/tests/qa-read-back.test.mjs   # 106/106
TMPDIR=/tmp node --test shared/resources/tests/qa-read-back.test.mjs                                                                          # 0 fail
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/                                                                  # both ok
npm run bundle:check                                                                                                                         # 0 problems
prettier --check .                                                                                                                           # clean
node shared/resources/security-probe.mjs --sink markdown-structure --entry 'cli:shared/resources/qa-read-back.js' --argv '["--doc","{input}"]' --cases-file <scratch>/cases.json --record docs/tasks/task.192.read-back-checks-this-cycles-verdict/task.192.qa.2.security.run.json --json
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium defects in the new verdict rule, both reproduced; no HIGH findings.
**Quality Score**: 80/100
**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA2-1 and QA2-2 fixed.

---

**Next Steps**: qa-fix cycle 2 (QA2-2 row selection, QA2-1 row tied to the cycle), then QA cycle 3.
