# QA Report: Task 155 - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.8.qa-results-section-engine.yml](./task.155.gate.8.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

This cycle is a re-review of commit `a89f20fe`, the PR-review-3 fix. That commit carries `create-bug-report`'s `### Bug Reports` list through a replace, and makes the CR-6 and CR-7 cleanups. Following PR review 3's lesson, this cycle measured two things separately:

- **(a) Text outside the replaced span.** Nothing is lost there: the corpus runs, fault injection and a differential run against the gate-7 engine all show 0 lost lines.
- **(b) Text inside the old span that another writer owns.** All 11 tracked Bug Reports lists survive verbatim. The carry takes only the first `### Bug Reports` heading, though, so a second list is dropped silently (REL-020, medium). Three low findings follow from the same measurement.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix REL-020, or defer it explicitly as a known limit)

---

## Re-Review Context

| Previous item | Source | Status |
| --- | --- | --- |
| CR-1: the Bug Reports list was dropped by a whole-section replace | PR review 3 | **FIXED** for the single-list shape (11/11 tracked lists kept; L1–L4 mutation-proven). **PARTIAL** in general: see REL-020 |
| CR-6: a subsumed check in `normaliseSection` | gate 6 advisory | FIXED, behaviour-neutral (1,240/1,240 parity) |
| CR-7: hard-coded marker names | gate 6 advisory | FIXED, behaviour-neutral (27/27 marker probes) |
| REL-018, REL-019 | gate 7 (route 2b) | Deferred (unchanged by this commit) |

## New Findings This Cycle

- **[medium] REL-020** `shared/resources/qa-results.js:137`: only the first `### Bug Reports` block is carried. The block ends at the next H1–H3 heading, which is the second `### Bug Reports`, so the second list is deleted while the write reports `replaced`. → Carry every block, and add the tests.
- **[low] REL-021** `shared/resources/qa-results.js:144`: the carried block runs to the next heading or to the end of the span, so text that is not a heading rides along. A list sitting directly under the section heading keeps the previous cycle's `**QA Status**` and `**Quality Score**: 10/100` below the current score indefinitely. → End the block at the end of the list.
- **[low] REL-022** `shared/resources/qa-results.js:166` (`trimSeparator`): in a hand-placed legacy span, a replace deletes a create-task template comment and the `---` above it. The tracked instance is task.117. → Treat a trailing comment block as separator.
- **[low] REL-023** `shared/resources/qa-results.js:135`: the carry keys on one exact heading line. A near-miss heading (`### Bug Reports (1)`, `### Bug reports`, `#### Bug Reports`, `**Bug Reports**`) drops the list, and a render that includes its own `### Bug Reports` takes the old list over and drops earlier links. Neither case gives any signal. → Use a tolerant match and merge the lists, or document the takeover.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete; status `ready-for-review`
- [x] All implementation phases are completed
- [x] Tests pass (see Regression Testing)
- [x] Breaking changes documented: none
- [x] Code is on `feature/task.155.qa-results-section-engine` with PR #537 open

### Testing Approach

- [x] Automated testing: engine, wiring and corpus suites, plus `ci:fast`
- [x] Regression testing: a corpus run and a differential run against the gate-7 engine
- [x] Security review (reasoned)
- [x] Code review (Step 3b, independent Explore reviewer)

### Review Methodology

Direct tools, plus one read-only Explore reviewer for Step 3b (cycle 8, narrowed scope). `SAFETY_REPROBE=false`: gate 7's security axis was `PASS`/`reasoned`.

```
Re-review scope: files changed since gate 7 (head b810cb202194; 11 files) — default
```

This cycle added a measurement earlier cycles lacked. **Inside the span**, each of the 155 tracked sections was replaced, and every old line that did not survive was assigned to the subsection it came from. **Beyond the span**, every skill (`skills/*/SKILL.md`, `shared/resources/*.md`) was searched for anything else that writes into a work item's QA section. Only `qa-task`, `qa-story` and the develop QA-loop doc name the section. `create-bug-report` task-mode Step 5 writes the `### Bug Reports` list, and `qa-fix` Step 5 and `develop-bug` Part B only edit statuses inside it. Story-mode `create-bug-report` writes a separate `## Bug Reports` H2, which ends the span and is never inside it.

**Step 4b** applies, because both SKILL.md files changed. `qa-execute-snippets` ran under bash and zsh:

| File | Runnable | Placeholder | Mutating | Findings |
| --- | --- | --- | --- | --- |
| `skills/qa-task/SKILL.md` | 1 | 3 | 16 | 0 |
| `skills/qa-story/SKILL.md` | 1 | 4 | 14 | 0 |

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | CONCERNS | Verified | REL-020..023 are all in the carry added this cycle |
| Phase 2: qa-task / qa-story wiring | PASS | Verified | Step 12 notes name the carry; wiring tests 8/8 |
| Phase 3: task.65 repair | PASS | Verified | Unchanged |
| Phase 4: corpus guard | PASS | Verified | `tests/qa-results-corpus.test.js` green |

**Overall Phase Completion**: 4/4 (1 with issues)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| One section, never inside the log | Always | 0 multiple, 0 inside a log over 1,989 docs × 4 writes | PASS |
| A replace loses nothing outside the section | 0 lines | 0 lines (QA engine alone); fault injection 0 | PASS |
| A replace loses nothing another skill owns | 0 lines | Tracked corpus: 0 bug-list lines; task.117 template comment lost (REL-022); a second list is lost (REL-020, repro) | CONCERNS |
| Refuses on stacked sections | `multiple` | Unchanged; tests green | PASS |
| Tests and CI | Green | 4,774/4,776 (1 load-timing flake passes alone, 1 skipped) | PASS |

---

## Breaking Changes Validation

None. The carry is additive, and CR-6/CR-7 are behaviour-neutral: the differential run gave identical output on every document without a Bug Reports list.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: REL-020, a second `### Bug Reports` list is silently deleted**

- **Severity**: MEDIUM
- **Category**: Functional (content loss)
- **Bug Report**: not filed. This pipeline cycle's write scope is the QA report, the gate and the task's QA section; the gate entry carries the repro.
- **Observation**: A section with two `### Bug Reports` lists, replaced through cycles 2 and 3, keeps `bug.1` and loses `bug.2`. Every write reports `replaced`. The code reviewer reproduced this independently (CR-1, high confidence).
- **Impact**: Bug links are deleted, which is the failure PR review 3 CR-1 raised, in a narrower shape. `create-bug-report` Step 5 checks for `## Bug Reports` (H2) and then writes `### Bug Reports` (H3), so a literal reading adds a new heading on every call. The tracked corpus has 0 instances: all 11 lists have one heading.
- **Recommendation**: Carry every unprotected `### Bug Reports` block, or merge them. Add a two-heading test, and a list-then-`### Key Findings` test (see mutation M4 below).
- **Priority**: P2

### LOW Severity Issues (3)

- **REL-021**: stale non-list text is carried after the list. See New Findings; nothing is deleted.
- **REL-022**: task.117's `---` and 6-line change-log lead-in comment are deleted by a replace. The comment does not render, the document is accepted, and engine-created sections cannot form this shape.
- **REL-023**: a near-miss heading, or a rendered takeover, drops the list with no signal. All 11 tracked lists use the exact heading.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS

51 engine tests run in about 0.2 s; the corpus run takes seconds.

### Reliability — CONCERNS

Nothing outside the span is lost. Inside the span, the carry handles the tracked shape but silently drops a second list (REL-020). Near-miss headings (REL-023) and a legacy template comment (REL-022) are also lost.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` (unchanged). This is a pure string transform: its inputs are a pipeline-written work item and a pipeline-rendered section, and no corpus sink models this section. There is no shell, network or eval.

### Maintainability — PASS

`CARRIED_SUBSECTIONS` is a closed, commented list. CR-7 derives the marker pattern from `change-log.js`. The one test gap is that no test has a heading after the carried list.

---

## Code Review

Advisory findings from the Step 3b reviewer. The task runs with `code_review_blocking=true`, so CR-1 (bug, high confidence) is promoted to **REL-020**.

**Correctness bugs (4):**
- [medium/high] `shared/resources/qa-results.js:137`: only the first `### Bug Reports` is carried; a second list is dropped → carry every block (**REL-020**)
- [medium/medium] `shared/resources/qa-results.js:144`: the carried block runs to the next heading, so stale non-list text is carried forever → end it at the end of the list (recorded as **REL-021**, rated low: nothing is deleted and there are 0 corpus instances)
- [low/medium] `shared/resources/qa-results.js:136`: a render with its own `### Bug Reports` suppresses the carry, and L2 locks in dropping earlier links → merge by link target, or document it (**REL-023**)
- [low/medium] `shared/resources/qa-results.js:135`: the exact heading match drops near-miss headings → tolerant match (**REL-023**)

**Cleanups (0).**

The reviewer also confirmed that CRLF documents carry correctly, that repeated writes are idempotent on the 11 tracked documents, and that CR-6 and CR-7 are behaviour-neutral.

**Provenance:** `qa-results.js` does not exist on `develop`, so every finding is new to this branch. REL-020, REL-021 and REL-023 were introduced by `a89f20fe`. REL-022 has been in the span rule since the engine's first version, and this cycle's inside-the-span measurement is the first to surface it.

**Mutation proofs** (isolated copies; baseline 51/51 before and after; live engine byte-identical; `git status` unchanged):

```
mutation-proven: replace-path carry removed → L1 → covered
mutation-proven: relocate-path carry removed → L4 → covered
mutation-proven: takeover check removed → L2 → covered
mutation-proven: end-at-next-heading stop removed → (none) → no-red-untested
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci:fast` @ `a89f20feb089` | 4,776 tests: 4,774 pass, 1 skipped, 1 fail (`test-clean-checkout` load-timing, 10.2 s over its 10 s budget; 13/13 alone) |
| qa-results engine, wiring and corpus suites | 60/60 |
| `bundle:check` | 129 skills, 0 problems |
| `validate` qa-task, qa-story | pass |
| Corpus: 1,989 docs × 4 writes, each with an `upsertChangeLog` row | 1,832 created then replaced ×3, 155 replaced ×4, 2 unplaceable (known). 0 multiple, 0 inside a log, 0 probe rows dropped, 0 Bug Reports lines lost. QA engine alone: 0 lines lost outside the section |
| Fault injection: stray fence variants after each of the 155 headings | fence, `~~~`, 4-backtick and indented ```` ```js ```` each gave 155 unbounded; comment and tick each gave 155 replaced; 0 lost after the span |
| Fault injection: stray fence plus a closing block at 12,001 later positions | 331 replaced, 11,670 unbounded, 0 original lines lost |
| Differential against the gate-7 engine (`b810cb20`) | 1,978/1,989 docs identical; the 11 that differ are exactly the Bug Reports docs. Render parity 1,240/1,240 |
| CR-7 marker pattern against the old literal | 27/27 probes agree |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (Step 12 notes), and both bundled `references/qa-results.js` copies
- `skills/create-bug-report/SKILL.md` (Step 5, both modes), `skills/qa-fix/SKILL.md` (Step 5), `skills/develop-bug/SKILL.md` (Part B)
- `CHANGELOG.md`, and the task's Deferred Work

### Test Commands Executed

```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-step12-wiring.test.js tests/qa-results-corpus.test.js
npm run ci:fast
command node --test tests/test-clean-checkout.test.js
npm run bundle:check
npm run validate -- skills/qa-task/ ; npm run validate -- skills/qa-story/
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json   # and qa-story
# scratchpad probes (not committed): inside-span subsection audit, 4-write corpus run, fault injection,
# gate-7 differential, carry edge cases, isolated-copy mutations
```

### Coverage Report

No coverage instrument is configured for `shared/resources`. Coverage evidence is the mutation table above.

---

## Recommendations

### Immediate Actions (Blocking)

1. REL-020: carry every `### Bug Reports` block, with two-heading and list-then-heading tests. Alternatively, record it as a known limit in Deferred Work if the budget is spent.

### Short-term Actions (Non-Blocking)

1. REL-021: end the carried block at the end of the list.
2. REL-022: keep a trailing template comment and break out of the span.
3. REL-023: use a tolerant heading match, and merge rather than take over.
4. `create-bug-report` task-mode Step 5: the H2 check does not match the H3 heading it writes, and the "QA & Quality Assurance section" it names does not exist in the task template. This is outside this task's change set.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Measured outside the span, the engine is clean, and CR-6/CR-7 changed nothing. Measured inside the span, the new carry protects every tracked Bug Reports list, but it silently deletes a second list (REL-020, medium). Reliability is therefore CONCERNS.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: REL-020 fixed, or deferred explicitly as a known limit.

---

**QA Report**: co-located at `task.155.qa.8.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.8.qa-results-section-engine.yml`
**Next Steps**: This was the last budgeted cycle, so the orchestrator decides between one more fix cycle for REL-020 and a documented deferral.
