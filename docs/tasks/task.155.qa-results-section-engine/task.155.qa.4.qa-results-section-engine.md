# QA Report: Task 155 - QA Testing Results section engine (cycle 4)

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.4.qa-results-section-engine.yml](./task.155.gate.4.qa-results-section-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

This cycle re-reviews commit `182367ee`, which fixes the PR review 1 findings. The review concentrates on anything that can delete content from a real document. All three PR review items are fixed. CR-1 and CR-2 are each mutation-proven by a committed test, and `pr_number: 537` is in the frontmatter. A corpus dry run over 1,837 documents deleted nothing. That run covers 155 replaces and, new this cycle, 1,680 create-then-replace runs on work items that have no section yet. It found no lost change-log marker, dated row, H1/H2 heading or Change Log heading. The story-template shape with a marker-less `### Change Log`, run through five QA writes each followed by a Change Log write, kept every row.

The cycle found three new issues, all low severity and none of them deletions. First, the CR-2 fix leaves one blank line behind, which accumulates when no Change Log write follows. Second, the CR-1 fix introduced a regression: a section that carries its own `### Change Log` subheading stacks a stale tail. Third, a document with an unclosed fence stacks copies of the section, and this has been true since the first commit. None of these shapes occurs in any work item the templates produce, or in the 155 tracked sections.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous item | Source | Status | Evidence |
|---|---|---|---|
| CR-1: a section above a marker-less `### Change Log` swallowed the log on replace | PR review 1 | FIXED | H1 passes. Probes S1, S3, S4 and S6 pass: story `### Change Log` under Sign-off, the log at EOF, the epic log under `## Notes & Updates`, and an existing section above an H3 log. Each is created, then replaced twice, and ends with rows intact and one section. Mutation `if (false)` on the new bound turns H1 red. |
| CR-2: a trailing `---` stacked across replaces | PR review 1 | FIXED (for `---`), with residue REL-009 | H2 passes. Mutation back to `.replace(/\s+$/, "")` turns H2 red. The blank line before the break still accumulates (REL-009). |
| PC-2: `pr_number` missing | PR review 1 | FIXED | `pr_number: 537` is in the frontmatter. |
| PC-1: the Change Log write collapses the blank line before the start marker | PR review 1 | DEFERRED | Listed under `## Deferred Work`. It belongs to `change-log.js`. |
| REL-007 / REL-008 | gate 3 (route 2b) | DEFERRED, unchanged | The new commit does not touch the table-cut path (`lastTableStart`, `underTablelessLog`). |

---

## New Findings This Cycle

- **[low]** `shared/resources/qa-results.js:281` (REL-009; code review CR-1, which the reviewer rated medium with high confidence). The trailing-break strip removes `\n---` but not the blank line before it. A section that ends `\n\n---\n` therefore keeps a trailing `\n`, and each replace adds one blank line. Measured over 5 replaces, the count of `\n\n\n` runs went 1, 1, 1, 2, 2, both at EOF and before `## Progress Tracking`. A Change Log write absorbs it: the task marker shape, the story `## Change Log` shape and the story `### Change Log` shape each showed 0 growth over 5 cycles of a QA write followed by `upsertChangeLog`. H2 counts only `\n---\n`, so it cannot see this. Only whitespace changes; nothing is deleted. The suggested fix is to trim trailing whitespace again after removing the break, and to make H2 assert exact bytes.
- **[low]** `shared/resources/qa-results.js:196` (REL-010; code review CR-2, rated medium with high confidence). This is a regression from `182367ee`. `findChangeLog` returns the first Change Log heading. When a document has no marker block, and the section comes before the real log or the document has no log, a section that carries its own `### Change Log` subheading becomes "the log". Every replace then stops the span at that subheading and keeps the old tail. After three writes, HEAD kept 3 tails where `6bf14169` kept 1. With a marker block, or with a real log before the section, only 1 tail is kept (probe S7). Nothing is deleted; stale text is duplicated. None of the 155 tracked sections carries a Change Log subheading. Both Step 12 templates render only `### QA Report`, `### Test Coverage Summary` and `### Key Findings`. The suggested fix is to return `bad-section` when the section body contains an unprotected `RE_HEADING` match.
- **[low]** `shared/resources/qa-results.js:344` (REL-011; found by QA in the corpus run). When a document has an unclosed fence before its end, and neither a change log nor an anchor sits outside the fence, `created` appends the section inside the fence. `findQaResults` never sees that section, so each write creates another copy: 3 writes gave 3 copies, and `multiple` never fires. The same result appears at `6d6c166d`, so this has been in the engine since its first commit. The corpus has 2 such documents, a story plan and a task bug report. Neither is a Step 12 target, and 0 story, task or epic work items have this shape. The suggested fix is a write-then-verify step: after inserting, refuse when `findQaResults` does not find exactly one section.

Searched: the scoped diff since gate 3's head `65dcca836fb2` (8 files: the engine, its two generated copies, the tests and the task documents), plus the whole engine re-read for deletion paths. I also re-derived every write path against deletion inputs. Replace: a span bounded by the next H1/H2, a marker block, a marker-less log, the table cut, and a trailing separator. Relocate: the cut and the re-insert. Create: the canonical offset under markers, a marker-less H2 log, a marker-less H3 log, an anchor, EOF, and a legacy marker block combined with a later H3 log. The section itself: a trailing break in six forms, a final table, a fenced `---`, an unclosed fence, CRLF, and a `### Change Log` subheading.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete. Status `ready-for-review`.
- [x] All 4 implementation phases are ticked.
- [x] Tests pass (see below).
- [x] Breaking changes: none (additive engine; Step 12 wiring).
- [x] Code is on `feature/task.155.qa-results-section-engine` with PR #537 OPEN.

### Testing Approach

- [x] Automated Testing (unit, wiring, corpus guard, full `ci:fast`)
- [x] Regression Testing (corpus dry run in a temp copy)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b: an independent Explore subagent over the scoped diff)

### Review Methodology

The review used direct tools, as a focused re-review. The Step 3b code review ran as one independent read-only Explore subagent over the scoped patch.

`Re-review scope: files changed since gate 3 (head 65dcca836fb2; 8 files) — default`

`SAFETY_REPROBE=false`: gate 3's security axis reads `PASS reasoned`, and neither judgement clause applies. `REFUTE_PASS=false` because this is cycle 4.

Step 4b does not apply, because the scoped change set has no runnable prose: no `SKILL.md` or `shared/resources/*.md` changed since gate 3.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: the engine | PASS | Verified | CR-1 bound and CR-2 strip in place. The generated copies are byte-identical to the source apart from their header. |
| Phase 2: wire the QA skills | PASS | Verified | Unchanged this cycle. The wiring tests pass. |
| Phase 3: corpus guard and repair | PASS | Verified | Unchanged. The corpus guard passes. |
| Phase 4: docs and validation | PASS | Verified | `pr_number` added. PC-1 is listed under Deferred Work. |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Five named reasons; refusals write nothing | yes | 41/41 engine, wiring and corpus tests pass | PASS |
| Fenced or inline headings are never touched | yes | C-block tests pass. Probe T5 (fenced `---` at the end) is stable. | PASS |
| One section after repeated writes | yes | Corpus: 1,835 of 1,837 end with exactly one section. The 2 exceptions are non-target documents with an unclosed fence (REL-011). | PASS (low residue) |
| Nothing outside the section is deleted | yes | Corpus: 0 lost markers, dated rows, H1/H2 headings or Change Log headings across 1,837 documents | PASS |
| Performance: under 2 s, no network | yes | The engine, wiring and corpus tests take about 0.8 s. The 1,983-file dry run takes a few seconds. | PASS |
| `ci:fast`, `bundle:check`, validate | clean | See Test Artifacts | PASS |

---

## Breaking Changes Validation

None. The engine is additive, and the Step 12 wiring was verified in earlier cycles and is unchanged.

**Overall Breaking Changes Assessment:** PASS (N/A)

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

The detail for REL-009, REL-010 and REL-011 is under New Findings This Cycle. Why they are low:

- **REL-009:** only whitespace changes, and nothing is deleted. The Change Log write that Step 12 always makes next absorbs the growth in all three template shapes. Neither Step 12 template renders a trailing `---`.
- **REL-010:** this is duplication, not deletion. It needs a section that carries a Change Log subheading, which the corpus (0 of 155) and the templates do not contain. The reviewer rated it medium. QA downgraded it on the same corpus-plausibility grounds gate 3 used for REL-007.
- **REL-011:** this needs an unclosed fence in the work item, and 0 target documents have one. It has been present since the first commit.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
The engine is a pure string transform. The tests run in about 0.8 s, and the 1,983-document dry run completes in seconds.

### Reliability — PASS
Refusals write nothing. The CR-1 bound closes the only content-deleting path PR review 1 found, and five new deletion probes (S1–S9) do not reopen it. The three low residues duplicate content or add whitespace; none deletes anything.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, unchanged from gate 3. The inputs are a work-item document the pipeline wrote and a section the pipeline rendered, and no corpus sink models this section. Step 12 passes paths as argv to `node -e`, never as script text. There is no network access and no shell.

### Maintainability — PASS
The new break regex duplicates `RE_BREAK` without the blank-line-before rule (cleanup CR-3). The bundle is fresh.

---

## Code Review

The review is advisory, and the pipeline passed `code_review_blocking=true`. The subagent returned three findings:

**Correctness bugs (2):**
- [medium/high] `shared/resources/qa-results.js:281` (CR-1). The trailing-break strip leaves the preceding blank line, so the blank run grows by one per replace. Suggested fix: trim again after the strip and make H2 assert exact bytes. Promoted to `top_issues[]` as **REL-009**, low.
- [medium/high] `shared/resources/qa-results.js:196` (CR-2). A section that carries its own `### Change Log` subheading becomes the log `findChangeLog` returns, and the tail stacks. Suggested fix: refuse such a section as `bad-section`. Promoted as **REL-010**, low.

**Cleanups (1):**
- `shared/resources/qa-results.js:281` (CR-3). `normaliseSection` hand-writes a break regex instead of reusing `RE_BREAK` with its blank-line-before rule, so a closing setext underline (`Text\n---`) is stripped too. Suggested fix: apply the same line-based rule `trimSeparator` uses.

Both bug findings were reproduced by QA before promotion (scratch probes `growth.js` and `cr2.js`). Both were then downgraded from medium to low on plausibility; the reasons are under Issues Found. REL-011 came from the QA corpus run, not from the reviewer.

`boundary: internal` (see Security). `probes_executed: 0`.

Mutation proofs:

- `mutation-proven: new marker-less bound disabled (if (false)) → H1 → covered`
- `mutation-proven: trailing-break strip reverted to .replace(/\s+$/, "") → H2 → covered`

The engine file was snapshotted with `cp` and restored from the snapshot. The baseline was green again after each restore, and `git status --porcelain` for `shared/` and `skills/` was empty.

Platform variance: not applicable. The engine reads no value from the environment.

---

## Regression Testing

| Area | Result |
|---|---|
| Corpus dry run: 1,983 tracked `docs/**/*.md` copied to a temp directory. 155 carry a section; 1,682 are story, task or epic documents without one. Each got 3 sequential writes. | 1,680 `created,replaced,replaced`; 155 `replaced` ×3; 2 `created` ×3 (REL-011, non-target documents). Markers, dated rows outside fences, H1/H2 headings and Change Log headings were identical before and after in every document. The third write matched the second byte for byte, sentinel apart, in all but the 2 REL-011 documents. |
| Story-template shape with a marker-less `### Change Log`: 5 cycles of a QA write followed by `upsertChangeLog` | 1 section; rows went 2→6 with none lost; 0 blank-line growth. The `## Change Log` variant gave the same result. |
| Full `ci:fast` | 4757 tests: 4755 pass, 1 fail, 1 skipped. The failure is `tests/test-clean-checkout.test.js`, which is known to be load-flaky; run alone it passed 13/13 in 8.0 s. |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/qa-results.js` (whole file, again)
- `shared/resources/tests/qa-results.test.mjs` (H1, H2)
- `shared/resources/change-log.js` (`findChangeLog`, `RE_HEADING`, `ANCHORS`)
- `skills/create-story/resources/story-template.yaml`, `skills/create-task/resources/task-template.md`
- `task.155.pr-review.1.qa-results-section-engine.md`

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js   # 41/41
npm run ci:fast                                   # 4757: 4755 pass, 1 load-flaky, 1 skipped
command node --test tests/test-clean-checkout.test.js   # 13/13 alone
npm run bundle:check                              # 129 skills, 0 problems
python3 skills/create-skill/scripts/quick_validate.py skills/qa-task    # ✓
python3 skills/create-skill/scripts/quick_validate.py skills/qa-story   # ✓
```

### Coverage Report
Not instrumented. Every behaviour the new commit adds is mutation-proven (see Code Review).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. REL-009: trim trailing whitespace after the break strip, and make H2 assert the exact bytes between the section and the next heading.
2. REL-010: return `bad-section` for a section body that contains an unprotected `RE_HEADING`.
3. REL-011: verify after inserting, and refuse (for example as `unplaceable`) when the written section cannot be found again.
4. CR-3: reuse `RE_BREAK` and the blank-line-before rule in `normaliseSection`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: The PR review fixes hold and are mutation-proven. The corpus and the story-template probes found no deletion path. The three new findings are low: each duplicates content or adds whitespace, and none occurs in any document these skills write.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None

---

**QA Report**: co-located at `task.155.qa.4.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.4.qa-results-section-engine.yml`
**Next Steps**: The pipeline decides between the route-2b exit and one more small fix cycle for REL-009, REL-010 and REL-011. All three fixes are one-liners, each with a test.
