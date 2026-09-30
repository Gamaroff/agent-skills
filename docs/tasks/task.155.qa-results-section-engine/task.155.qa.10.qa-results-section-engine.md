# QA Report: Task 155 - QA Testing Results section engine (cycle 10)

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.10.qa-results-section-engine.yml](./task.155.gate.10.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-01
**Testing Completed**: 2026-10-01
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 re-reviews commit `5322ba05` (PR review 4). The commit adds `Deferred Work` as a carried subsection, and it refuses a render that brings its own carried block, which removes the REL-026 line merge. Both fixes hold. task.141's Deferred Work block survives 4 writes where the gate-9 engine lost 18 lines. All 11 Bug Reports lists are kept. Nothing outside the span is lost, and the outside-span and fault-injection figures match gate 9 exactly.

The new code brings four low findings, each with 0 tracked instances on its trigger path:

- REL-028: nested carried blocks double on every write.
- REL-029: the refusal also catches QA-owned headings, and the halt gives no hint.
- REL-030: a bold `**Deferred Work**` label is deleted.
- REL-031: stale and cosmetic prose.

**Overall Assessment**: CONCERNS (Reliability CONCERNS; 0 high, 0 medium, 4 low)
**Deployment Recommendation**: CONDITIONAL (the operator rule is applied by the orchestrator)

---

## Re-Review Context

| Previous issue | Gate 9 status | Cycle 10 status | Evidence |
|---|---|---|---|
| REL-024 (trailing comment peel duplicates) | waived | NOT FIXED (waived, deferred) | `trimSeparator` unchanged |
| REL-025 (`####` block carries later `####` text) | waived | NOT FIXED (waived, deferred) | `collectBlocks` unchanged; now also applies to `#### Deferred Work` |
| REL-026 (render list merge drops linkless lines) | closed | FIXED | A render with `### Bug Reports` or `### Deferred Work` is now `bad-section`, and the merge branch is deleted. Test L2 goes red when the refusal is removed |
| REL-027 (near-miss Bug Reports labels) | deferred by operator | NOT FIXED (deferred) | Unchanged |
| PC-1 (PR review 4: task.141 Deferred Work deleted) | n/a | FIXED | 18 of 18 non-blank lines are kept through 4 writes, with 1 heading. Tests N1 and N2 go red when the name is removed |

## New Findings This Cycle

- **[low] REL-028** `shared/resources/qa-results.js:181`: a `#### Deferred Work` inside a Bug Reports block is carried twice, and the copies double on every write (2, 4, 8, 16, 32 over 5 replaces). The reverse nesting adds one stable extra copy. **Effect: duplicates.** Corpus: 0 nested carried blocks among the 155 sections. Plausible: yes, because carried blocks are appended at the end of the section and the route-2/2b writer names no heading level. → Collect all carried blocks in one pass by offset, and skip nested ones.
- **[low] REL-029** `shared/resources/qa-results.js:465`: the refusal matches any carried-name heading with any suffix. So a QA-owned `### Bug Reports filed this cycle` or `#### Deferred Work (none this cycle)` is refused, and the Step 12 HALT names no cause (this widens REL-019). **Effect: refuses.** Corpus: 0 QA-owned instances. 12 of 155 sections are refused if re-rendered verbatim, which is the intended rule. → Match only the exact heading, and add a hint.
- **[low] REL-030** `shared/resources/qa-results.js`: a bold `**Deferred Work**:` label in the section is not carried, so a replace deletes the record while the write reports `replaced`. **Effect: deletes.** Corpus: 0 inside QA sections. Both halves of the trigger are observed separately: task.140 wrote a bold label (outside the section), and task.141 wrote its record inside the section. This is PC-1 residue, not a regression. → Give the route-2/2b writer a named heading and a position outside the section.
- **[low] REL-031** `docs/tasks/task.155.qa-results-section-engine/task.155.qa-results-section-engine.md:468`: lines 468 and 470 still say task.141's block is replaced whole. qa-story lines 1894–1895 lost their list indentation. Test N2 says "in document order", but the engine uses the fixed name order. **Effect: cosmetic.**

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (status `ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (1 known load-flaky timing failure, which passed when re-run alone)
- [x] Breaking changes documented (none)
- [x] Code on the feature branch with open PR #537

### Testing Approach

- [x] Automated Testing (unit, wiring, corpus, full `ci:fast`)
- [x] Regression Testing (multi-write corpus, fault injection, old-vs-new engine comparison)
- [x] Code Review (Step 3b, Explore subagent)
- [x] Mutation proofs

### Review Methodology

Direct tools plus one read-only Explore code-review subagent. The subagent returned in about 2 minutes. `code_review_blocking=true` came from the pipeline args. Scratch harnesses compared the gate-9 engine (`18a0ec99`) with the current engine over the same inputs.

Re-review scope: files changed since gate 9 (head 18a0ec990012; 11 files) — default.

Step 4b ran over both changed SKILL.md files: qa-task has 20 blocks (1 runnable, 3 placeholder, 16 mutating) and qa-story has 19 (1 runnable, 4 placeholder, 14 mutating). Both ran under bash and zsh with 0 findings.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: engine | CONCERNS | Verified | REL-028, REL-029, REL-030 |
| Phase 2: wire the QA skills | PASS | Verified | Step 12 prose updated in both skills; REL-031 indentation |
| Phase 3: corpus guard and repair | PASS | Verified | Corpus test green; it does not guard task.141 (unit N1 does) |
| Phase 4: docs and validation | CONCERNS | Verified | REL-031 stale task-doc sentences |

**Overall Phase Completion**: 4/4 verified

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| One writer, one section, no stacking | 0 multiple | 0 multiple over 1,992 docs × 4 writes; 5th write idempotent | PASS |
| Nothing outside the span lost | 0 | 0 lines (with and without Change Log rows between writes) | PASS |
| Other writers' blocks survive | all kept | 12 of 12 tracked carried blocks kept verbatim | PASS |
| Refuses rather than guesses | refusals on bad shapes | fence faults: 155 of 155 unbounded per shape | PASS |
| Real renders accepted | both templates | qa-task and qa-story templates: `replaced` | PASS |
| Tests | green | 68/68 engine suites; ci:fast 4,782 of 4,784 pass (1 load flake, 1 skipped) | PASS |

---

## Breaking Changes Validation

None. The only new refusal (`bad-section` for a render with a carried block) is documented in both Step 12 notes.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (4)

REL-028, REL-029, REL-030 and REL-031 are described above, and in full in the gate. No bug files, because all four are LOW.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS

Engine tests take about 0.2 s. The corpus runs over 1,992 documents take seconds.

### Reliability — CONCERNS

Nothing outside the span is lost. Inside the span there is one new silent deletion path (REL-030) and one new exponential stacking path (REL-028), both with 0 tracked instances. REL-027 remains deferred.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- A pure string transform. `boundary: internal` is unchanged from gates 6–9.

### Maintainability — PASS

Both new branches are mutation-proven. `linksIn` is dead code (CR-5). The prose drift is recorded as REL-031.

---

## Code Review

The review was advisory, with blocking on: `code_review_blocking=true`. CR-1 and CR-2 (bug/high) were promoted as REL-028 and REL-031. CR-3 (bug/medium) was measured and entered as REL-029 on QA's own evidence.

**Correctness bugs (3):**

- [medium/high] `shared/resources/qa-results.js:181`: nested carried blocks double on every write. Promoted as REL-028 and rated low on 0 instances, the same treatment REL-024 got.
- [low/high] `docs/tasks/task.155.qa-results-section-engine/task.155.qa-results-section-engine.md:468`: stale task.141 sentences (REL-031).
- [low/medium] `shared/resources/qa-results.js:465`: over-broad refusal (REL-029).

**Cleanups (2):**

- `shared/resources/tests/qa-results.test.mjs:700`: N2's name claims document order (folded into REL-031).
- `shared/resources/qa-results.js:171`: `linksIn` is unused after the merge removal.

**Boundary:** `internal`, unchanged. The inputs are a pipeline-written document and a pipeline-rendered section, and no corpus sink models them.

**Mutation proofs:**

```
mutation-proven: CARRIED_SUBSECTIONS without "Deferred Work" → L2, N1, N2 red → covered
mutation-proven: normaliseSection carried-block refusal removed → L2 red → covered
mutation-proven: CARRIED_SUBSECTIONS without "Deferred Work" → tests/qa-results-corpus.test.js stays green → no-red-untested (task.141 at corpus level; unit N1 covers the behaviour)
```

---

## Regression Testing

| Area | Result |
|---|---|
| Multi-write corpus (1,992 docs × 4) | PASS, identical to gate 9 apart from task.141 now kept |
| With Change Log rows interleaved | PASS: 0 rows lost, 0 sections inside a log |
| Single-fault injection (6 shapes × 155) | PASS, identical to gate 9 |
| Two-fault fence sweep (16,976 positions) | 35 lines lost (task.117/45 template comment), identical to the gate-9 engine |
| Re-render false positives | 12 of 155 refused, exactly the carried-block sections, as intended |

---

## Test Artifacts

### Files Reviewed

`shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, the bundled engine copies, the task document, `CHANGELOG.md`, `shared/resources/develop-pipeline-step-5-6-qa-loop.md` (route 2/2b writer), `skills/create-bug-report/SKILL.md`, `skills/qa-fix/SKILL.md`.

### Test Commands Executed

```bash
npm run ci:fast                                   # 4,784 tests: 4,782 pass, 1 fail (test-clean-checkout 10,271 ms > 10,000 ms budget), 1 skipped
command node --test tests/test-clean-checkout.test.js   # re-run alone: 13/13
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js   # 68/68
npm run bundle:check                              # 129 skills, 0 problems
npm run validate -- skills/qa-task/               # pass
npm run validate -- skills/qa-story/              # pass
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json    # 0 findings
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json   # 0 findings
# scratch harnesses (outside the repo), each run on the gate-9 engine and the current engine:
# corpus.js <engine> [withlog]   — 1,992 tracked docs x 4 writes; outside-span, carried-line, heading and idempotency checks
# refuse.js                      — 155 tracked sections re-rendered verbatim as renders
# fault.js <engine>              — 6 single-fault shapes x 155 sections + 16,976-position fence sweep
# probes.js                      — nesting, ordering, refusal and bold-label probes
# census.js                      — every "Deferred" heading or label, inside vs outside QA sections
```

Corpus-instance commands: `git ls-files 'docs/**/*.md'` is the population, and `QR.findQaResults` finds the sections. Nested carried blocks: 0. QA-owned carried-name headings: 0. Bold Deferred Work labels inside sections: 0 (from census.js).

### Coverage Report

Not instrumented (plain `node --test`). Both new branches are mutation-proven above.

---

## Recommendations

### Immediate Actions (Blocking)

None under the deterministic rules. The orchestrator applies the operator rule to REL-030 (deletes, 0 instances).

### Short-term Actions (Non-Blocking)

1. REL-028: take carried blocks in one pass by offset, and skip nested ones.
2. REL-029: refuse only the exact heading, and add a bad-section hint (with REL-019).
3. REL-030: give the route-2/2b Deferred Work record a heading and a position outside the section.
4. REL-031: fix the two task.141 sentences, the qa-story indentation and N2's name.
5. Delete `linksIn`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: PR review 4's fixes are verified and cause no regression outside the span. Reliability stays CONCERNS on four new low findings, one of which deletes (REL-030).
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: the operator acceptance rule, applied to REL-028..031.

---

**QA Report**: co-located at `task.155.qa.10.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.10.qa-results-section-engine.yml`
**Next Steps**: the orchestrator applies the operator rule. The findings route to Deferred Work or a final fix.
