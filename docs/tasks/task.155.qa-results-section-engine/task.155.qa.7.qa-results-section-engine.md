# QA Report: Task 155 - QA Testing Results section: one write engine, one placement, refused when duplicated

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.7.qa-results-section-engine.yml](./task.155.gate.7.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

Cycle 7 re-reviews commit `b810cb20`. It adds `change-log.js`'s own `RE_HEADING` to the structural guard and to the heading-above-marker placement. It also documents the fenced `# comment` trade and makes the `unbounded` and `unplaceable` halts name their repair.

REL-015 is closed. The gate-6 deletion shape (`### 1.5 Change Log`, stray fence, later block) is now refused and nothing is lost. Numbered headings above the markers are placed above the heading.

The gate-6 experiments were all re-run against the current engine and deleted nothing:
- fault injection into all 155 tracked sections;
- a closing block at 16,807 later positions;
- a 4-write corpus run over 1,987 documents.

Two low findings remain. Both refuse and never delete, and neither has an instance in the corpus.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Source | Status | Evidence |
|---|---|---|---|
| REL-015 (medium): the log-heading pattern is narrower than `change-log.js` `RE_HEADING`, so `### 1.5 Change Log` can be deleted or stranded | gate 6 | **FIXED** | **Deletion repro:** `### 1.5 Change Log` and `## 12) Change Log` with a stray fence and a later `` ```bash `` block are now `unbounded`, with the row and heading kept (gate 6: `replaced`, log deleted). **Placement:** `### 1.5 Change Log` above the markers now lands above the heading. **Tests:** K1 and K2 are mutation-proven. |
| REL-016 (low): a fenced `# comment` in a section is a false refusal | gate 6 | **CLOSED (documented trade)** | The task's Deferred Work now names fenced `# comment` lines, and the `unbounded` halt text says "a fenced `# comment` counts". Behaviour is unchanged: it refuses and never deletes. |
| REL-017 (low): the Step 12 prose says `unbounded` means only an unclosed fence | gate 6 | **FIXED** for `unbounded` / `unplaceable`, **PARTIAL** for `bad-section` | Both SKILL.md files are updated, and both halts name the repair. The wiring assertion is mutation-proven. `bad-section` still has no hint: see REL-019. |
| REL-007…REL-010, PC-1, CRLF seams, setext | gates 3–5, PR review 1 | DEFERRED (unchanged) | This commit did not change their behaviour. |

## New Findings This Cycle

- **[low] REL-018** `shared/resources/qa-results.js:285` (the span end), with the placement at `:322`. **False refusal.** The code reviewer found this independently as CR-1 (medium/medium).
  - **The shape.** An H3 log heading sits directly above the marker block: `### Change Log` since cycle 5, and `### 1.5 Change Log` or `### 2) Change Log` since this commit.
  - **Why it refuses.** `canonicalOffset` places a new section above that heading. `findQaResults` then ends the section at the marker, not at the heading. The heading is therefore inside the span, and the next write is `unbounded`.
  - **When it halts.** Only when the Change Log row between the two writes did not go through `upsertChangeLog`, which absorbs the heading into the block. Measured on 3 cycles:
    - a hand-appended row gives `created,unbounded`;
    - an engine-written row gives `created,replaced,replaced`.
  - **How plausible.** Nothing is deleted. 0 tracked documents have an H3 or numbered log heading above a marker block. All 6 with a heading there use `## Change Log`, which bounds the span and works either way. `upsertChangeLog` writes new logs with the heading inside the markers. Step 12 does not, however, require the row to go through the engine.
  - **Fix.** Add the log-heading line directly above a marker block as a span-end candidate. Add a `###` heading-above-marker round-trip test that uses a hand-appended row.
- **[low] REL-019** `skills/qa-task/SKILL.md:1351` (and `skills/qa-story/SKILL.md:1873`). **REL-017 residue.** The `bad-section` halt prints only `HALT qa-results: bad-section — <file> not written.` Neither SKILL.md defines `bad-section`. It is the reason the REL-016 trade produces: a rendered section with a fenced `# run the suite` is `bad-section` (reproduced). The operator therefore gets no hint. **Fix:** add a hint to both halts and name `bad-section` in the Step 12 prose.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing (ci:fast; 1 load-timing failure passes alone)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR #537

### Testing Approach

- [x] Automated Testing (unit, wiring, full `ci:fast`)
- [x] Regression Testing (full-corpus 4-write run, section re-render)
- [x] Fault injection (7 stray-fence variants, plus a closing block at 16,807 positions)
- [x] Code Review (Explore subagent, scoped)
- [x] Mutation proofs (3)
- [x] Step 4b (runnable prose)
- [ ] Performance Testing (not required; pure string transform)

### Review Methodology

Direct tools plus one read-only Explore code-review subagent. This is re-review cycle 7, the last in the budget.

```
Re-review scope: files changed since gate 6 (head 3056978c7cf7; 10 files) — default
```

`SAFETY_REPROBE=false`: gate 6's security axis reads `PASS` / `reasoned`, and clauses 2–3 do not apply (a pure string transform with no network access and no shell).

**Step 4b** applies, because both SKILL.md files changed. `qa-execute-snippets` ran under bash and zsh:

| Skill | Runnable | Placeholder | Mutating | Findings |
|---|---|---|---|---|
| qa-task | 1 | 3 | 16 | 0 |
| qa-story | 1 | 4 | 14 | 0 |

The Step 12 `node -e` block is refused as mutating (node, fail-closed). It is covered by `tests/qa-results-step12-wiring.test.js`, which runs it with bash (8/8). This cycle also ran it for real under zsh to write the task's QA section.

All experiments ran on copies in a scratch directory. The mutation proofs ran on isolated copies of the engine, the tests and both SKILL.md files. `git status --porcelain` was the same before and after the review; the pre-existing change to the implementation report is not QA's.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: the engine | PASS | Verified | REL-015 closed. The low false refusal is REL-018 |
| Phase 2: wire the QA skills | PASS | Verified | Halt hints for `unbounded` / `unplaceable`. `bad-section` has no hint (REL-019, low) |
| Phase 3: corpus guard and repair | PASS | Verified | Corpus test green. 0 losses in the 4-write run |
| Phase 4: docs and validation | PASS | Verified | bundle:check 0 problems; validate qa-task and qa-story pass |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| At most one section per document after any write | 1 | 1 in all 1,985 written documents × 4 writes | PASS |
| Never inside the change-log block | 0 inside | 0 after each Change Log write | PASS |
| `multiple` refuses, never guesses | refuse | A4/A5 green | PASS |
| No content lost outside the section | 0 | 0 in the corpus, fault injection and every repro | PASS |
| Every section the engine writes can be replaced next cycle | yes | 155/155 re-rendered; J5 green. REL-018 is a synthetic exception with a hand-written row | PASS |
| Tests pass | 100% | 4,770 / 4,772, 1 skipped, 1 load-timing failure that passes alone | PASS |

---

## Breaking Changes Validation

None documented. The REL-016 trade is now stated in full in the Deferred Work. **Overall:** PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- REL-018: an H3 log heading above the marker block makes the second write `unbounded` when the Change Log row was hand-appended. The write refuses and never deletes.
- REL-019: the `bad-section` halt names no repair, and the prose does not define it.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
47 engine tests run in about 0.2 s. The 1,987-document, 4-write corpus run completes in seconds.

### Reliability — PASS
No deletion path was found. Every heading that `change-log.js` recognises as a log is now structure, and fault injection, the corpus run and every earlier repro lose nothing. The two remaining findings refuse safely. The `checked()` read-back still counts only sections (carried).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- A pure string transform with no network access and no shell. `boundary: internal` (unchanged): the inputs are a pipeline-written work item and a pipeline-rendered section, and no corpus sink models this section.

### Maintainability — PASS
`RE_HEADING` is imported, not restated. `RE_LOG_HEADING` stays beside it as a broader net (any level, case-insensitive). Gate 6's advisory cleanups CR-6 and CR-7 are unchanged.

---

## Code Review

Scoped: `origin/develop...HEAD`, limited to the 10 files changed since gate 6 (2,783 diff lines). One Explore subagent returned in about 1.5 minutes.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/qa-results.js:285` — CR-1: with an H3 log heading directly above the markers, the engine refuses its own next write as `unbounded` unless `upsertChangeLog` ran in between. **Merged into REL-018.** QA reproduced it independently and rated it low: it refuses and never deletes, and 0 corpus documents have the shape. The confidence is medium, so it would not gate even under `code_review_blocking`. (The reviewer's `file_line` pointed at `:950`, a diff offset; the code is at `:285` and `:322`.)

**Cleanups (0).**

No finding was promoted to the gate by `code_review_blocking` (no bug at high confidence).

**Provenance:** `qa-results.js` does not exist on `develop`, so both findings are new to this branch.

**Mutation proofs** (isolated copies; baseline 47/47 and 8/8 before and after; live files confirmed byte-identical):
- mutation-proven: `RE_HEADING` removed from `RE_STRUCTURAL` → K1 red → covered
- mutation-proven: `RE_HEADING` removed from `canonicalOffset` → K2 red → covered
- mutation-proven: `unbounded` halt hint removed from both SKILL.md copies → wiring tests 3 (qa-task) and 7 (qa-story) red → covered

---

## Regression Testing

| Area | Result |
|---|---|
| Full corpus: 1,987 tracked `docs/**/*.md`, 4 writes each, with an `upsertChangeLog` row after every write | 1,830 created→replaced×3; 155 replaced×4; 2 `unplaceable` (the former REL-011 plan and bug documents). 0 lines lost outside the section, 0 rows dropped, always 1 section, never inside the log. PASS |
| Re-render each of the 155 existing sections as the new section | 155 replaced, 0 `bad-section`, so adding `RE_HEADING` refuses no real section. PASS |
| Stray-fence fault injection (7 variants × 155 sections) | 5 variants all `unbounded`, 2 all `replaced`, 0 deletions. PASS |
| Stray fence plus a closing block at 16,807 later positions | 4,988 replaced, 11,819 unbounded, 0 deletions. PASS |
| Log headings above a marker block, across `docs/`, `skills/` and `shared/` | 6 documents, all `## Change Log`. PASS |
| `ci:fast` | 4,772 tests: 4,770 pass, 1 skipped, 1 load-timing failure (`test-clean-checkout`, 10.6 s over a 10 s budget) that passes alone (13/13). PASS |
| bundle:check / validate | 129 skills, 0 problems; qa-task and qa-story pass. PASS |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`
- `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js` (generated; they differ from the source only by the header)
- `shared/resources/change-log.js` (`RE_HEADING`, `upsertChangeLog`)
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` Step 12; `tests/qa-results-step12-wiring.test.js`; the task's Deferred Work

### Test Commands Executed
```bash
npm run ci:fast
command node --test tests/test-clean-checkout.test.js
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-step12-wiring.test.js
npm run bundle:check
npm run validate -- skills/qa-task/
npm run validate -- skills/qa-story/
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json
command node <scratch>/repro.cjs; command node <scratch>/repro2.cjs     # gate 5/6 repros
command node <scratch>/rel13.cjs; command node <scratch>/rel13b.cjs    # placement
command node <scratch>/rel18.cjs     # heading above markers: engine row vs hand row
command node <scratch>/inject.cjs    # 7 stray-fence variants x 155 sections
command node <scratch>/inject2.cjs   # stray fence + closing block at 16,807 positions
command node <scratch>/corpus3.cjs   # 1,987 docs x 4 writes + Change Log row each
command node <scratch>/rerender7.cjs # 155 sections re-rendered
```

### Coverage Report
This repository has no coverage instrumentation. Mutation proofs: 3 of 3 guards added this cycle are covered.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. REL-018: end the span at a log heading directly above the marker block, and add a round-trip test for `###` with a hand-appended row.
2. REL-019: add a `bad-section` hint to both halts and name it in the Step 12 prose.
3. Carried: REL-007…010, PC-1, CRLF seams, setext, and CR-5/6/7.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The one medium from gate 6 (REL-015) is closed, and its K1/K2 tests are mutation-proven. Every deletion experiment from gates 5 and 6 was re-run against the current engine and lost nothing. The two remaining findings are low: each refuses a write and deletes nothing, and neither has an instance in the corpus.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.155.qa.7.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.7.qa-results-section-engine.yml`
**Next Steps**: Proceed to review-pr (Step 5c) and `/finalise`. REL-018 and REL-019 can be fixed as a small follow-up, or recorded in Deferred Work.
