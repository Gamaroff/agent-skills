# QA Report: Task 171 - Deferred Work placement and qa-results engine residuals

**Task**: [Link to task document](./task.171.deferred-work-placement-and-qa-results-residuals.md)
**Gate File**: [task.171.gate.1.deferred-work-placement-and-qa-results-residuals.yml](./task.171.gate.1.deferred-work-placement-and-qa-results-residuals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-05
**Testing Completed**: 2026-10-05
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered: the Deferred Work home is stated once and executed by a test, the
engine residuals are each covered by a unit test, both Step 12 halts print the refusal detail, and
create-bug-report checks the heading it writes. Every new assertion goes red under its mutation. The
independent diff review, however, reproduced five medium content-loss defects in the new rules
themselves (folded blocks lost on the second write, sub-labelled bold lists cut, non-ISO log rows
deleted on relocate, CRLF separators deleted) and showed the corpus write survey cannot see them.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-1..CR-5 first

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG names the new refusals)
- [x] Code on feature branch with open PR (#568, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, wiring, corpus)
- [x] Performance Testing (timed the suites against the 2s bound)
- [x] Regression Testing (`npm run ci:fast`)
- [x] Security Review (boundary rule applied — recorded `internal`)
- [x] Code Review (independent Explore reviewer)

### Review Methodology

Direct tools plus one independent reviewer subagent. First review (no prior gate): whole-branch diff,
bundled `skills/*/references/*` copies and the task's own directory excluded (the copies are
byte-identical generated output, checked by `bundle:check`). Reviewer dispatched 06:57:37 UTC, returned
after 353122 ms (completion notice `duration_ms`).

Step 4b: ran `qa-execute-snippets.mjs` over the four changed runnable-prose files — qa-task SKILL.md
(1 runnable / 3 placeholder / 16 mutating), qa-story SKILL.md (1 / 4 / 14), create-bug-report SKILL.md
(0 / 0 / 0), develop-pipeline-step-5-6-qa-loop.md (1 / 1 / 19); 0 findings. The changed Step 12 blocks
are refused as `mutating` (they write the document); they are instead executed by
`tests/qa-results-step12-wiring.test.js` from a consumer-shaped cwd (10/10 pass, including the new
detail-printing case).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Deferred Work has one home | PASS | Verified | `tests/deferred-work-placement.test.js` 4/4 — worked example extracted by heading, survives three writes |
| Phase 2: engine residuals | CONCERNS | Partial | Each residual has a unit test (O1–O14, N2), but CR-1..CR-4 reproduce new loss paths in the same rules |
| Phase 3: create-bug-report heading check | PASS | Verified | Heading test 2/2 |
| Phase 4: docs and validation | PASS | Verified | CHANGELOG entry; task.155 Deferred Work linked; validate ✓ ×5; bundle:check 0 problems |

**Overall Phase Completion**: 3/4 phases passed, 1 with concerns

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| One home for the loop-exit record, survives three QA writes | Yes | Yes | PASS | placement test 2 |
| Every residual writes correctly or refuses with a `detail` | All | Unit tests pass; CR-1..CR-4 reproduce losses | CONCERNS | Folded / sub-labelled / non-ISO / CRLF shapes |
| Both Step 12 halts print the detail | Yes | Yes | PASS | wiring test, both skills |
| create-bug-report task mode checks the heading it writes | Yes | Yes | PASS | heading test 1 |

**Performance**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Engine, wiring and corpus tests | < 2 s | 1.78 s combined | PASS | `time command node --test …` |
| No network access | N/A | Engine requires only `./change-log.js` | PASS | not-applicable line in the task |

**Code Quality**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Corpus 0 / 0 / 0 | 0 / 0 / 0 | 0 / 0 / 0 over 164 sections | CONCERNS | The survey measures with the engine under test and does not count comments, separators or carried lines (CR-5) |
| Every new assertion mutation-proved | Yes | 19/19 meaningful mutants red; S1–S3 red | PASS | QA re-ran the set independently |
| ci:fast, bundle:check, validate | Clean | 5287 pass / 0 fail; 0 problems; ✓ ×5 | PASS | |

---

## Breaking Changes Validation

### Breaking Change: New refusals (`detail` field added)

Documented: Yes (task § 5, CHANGELOG)
Migration Path Provided: Yes — a refusal names its rule; the halt prints it with a repair hint
Migration Tested: Yes — the corpus survey writes every tracked section with 0 refusals
Consumer Code Updated: Yes — both Step 12 halts; callers reading only `reason` are unaffected

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (5)

All five are reproduced by the reviewer with `command node` against the branch engine, and are new
to this change (CR-3 was compared against the `origin/develop` engine, which kept the rows). They are
code-review findings (`bug` / `high` confidence) promoted under `code_review_blocking`; their detail
lives in the gate and below, so no separate bug files were opened.

- **CR-1** `shared/resources/qa-results.js:179` — a folded carried block survives one write only; the
  second write stops the first block at a `####` heading or bold label inside the fold and deletes the
  folded links.
- **CR-2** `shared/resources/qa-results.js:180` — a bold-label block ends at the next standalone bold
  label, so a list grouped under sub-labels (`**From cycle 2:**`) loses its items.
- **CR-3** `shared/resources/qa-results.js:466` — with `logAbove` the table cut is gone, and the
  `isEntryRow` guard sees only ISO dates, so non-ISO rows of a Date-headed table below the section are
  deleted on relocate.
- **CR-4** `shared/resources/qa-results.js:324` — `RE_BREAK` is tested on a line still carrying `\r`,
  so a CRLF `---` plus lead-in comment before the log is deleted on replace.
- **CR-5** `tests/qa-results-corpus.test.js:137` — the write survey measures deletions with
  `findQaResults` spans and never counts comments, separators or carried-block lines.

### LOW Severity Issues (2)

- **CR-6** `shared/resources/qa-results.js:304` (low / medium confidence) — a standalone comment before
  a non-log heading is now inside the span and deleted on replace in legacy documents.
- **CR-7** `shared/resources/qa-results.js:255` (low / medium confidence) — setext detection
  false-refuses a `---` after a list continuation line, a multi-line comment closer, or fenced YAML.

**Total Issues**: HIGH: 0, MEDIUM: 5, LOW: 2

---

## NFR Assessment

### Performance — PASS

Engine, corpus and wiring tests 1.78 s combined (< 2 s). Corpus file alone 1.77 s.

### Reliability — CONCERNS

Four reproduced content-loss paths in the new rules (CR-1..CR-4) and a survey that cannot detect that
class (CR-5). Refusal paths themselves behave as documented.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal` — `upsertQaResults` decides whether a write to a work-item document is safe;
  its inputs are task/story documents and a render this pipeline writes. No corpus sink models a
  work-item section writer: `markdown-structure` is scoped to implementation reports and, by its own
  header, would score legitimate work items overblocked. Candidates considered: `upsertQaResults`,
  `normaliseSection`, `removesStructure`, `collectBlocks`. No network, exec or path input.

### Maintainability — PASS

One statement for the Deferred Work home; refusal details documented in the engine header; dead
`linksIn` / `end` removed.

---

## Code Review

Independent reviewer, whole-branch diff (1259 lines, 13 files).

**Correctness bugs (7):**

- [medium/high] `shared/resources/qa-results.js:179` — CR-1, folded block lost on write 2 → write the fold so it reads back inside the first block; three-write test
- [medium/high] `shared/resources/qa-results.js:180` — CR-2, sub-labelled bold list cut → end a bold-label block only at a heading, QA field or QA-template label
- [medium/high] `shared/resources/qa-results.js:466` — CR-3, non-ISO log rows deleted on relocate → refuse any Date-table data row under `underLog`
- [medium/high] `shared/resources/qa-results.js:324` — CR-4, CRLF separator not peeled → strip `\r` per line; CRLF output must equal LF output converted
- [medium/high] `tests/qa-results-corpus.test.js:137` — CR-5, survey measures with the engine → count non-section lines independently
- [low/medium] `shared/resources/qa-results.js:304` — CR-6, legacy comment before a non-log heading deleted → peel before any heading, or refuse
- [low/medium] `shared/resources/qa-results.js:255` — CR-7, setext false refusals → exclude continuation lines, comment closers, fences

**Cleanups (0)**

Promoted to gate `top_issues[]` (`code_review_blocking=true`): CR-1, CR-2, CR-3, CR-4, CR-5.

mutation-proven: dated-row guard off → O1, O2, O3, G4 → covered
mutation-proven: setext off → O5 → covered
mutation-proven: nesting dedupe off → O10 → covered
mutation-proven: level bound back to `#{1,3}` → O7 → covered
mutation-proven: bold label off → O8, O9, placement 3 → covered
mutation-proven: fold label dropped → O11 → covered
mutation-proven: comment always peeled → O6 → covered
mutation-proven: EOL forced LF → O12 → covered
mutation-proven: CR-5 detection off → O13 → covered
mutation-proven: bad-section detail dropped → O5, O6, O14 → covered
mutation-proven: `logAbove` off → O3 → covered
mutation-proven: trailing-comment refusal off → O6 → covered
mutation-proven: carried order reversed → N2 → covered
mutation-proven: `underLog` default/forced true → O4 (+ G1, G2, G6) → covered
mutation-proven: create-bug-report check to H2 → heading test 1 → covered
mutation-proven: route 2b restates → placement 4 → covered
mutation-proven: worked example as `###` → placement 1, 2 → covered
mutation-proven: survey structure counted over the whole text → none → mutation-void (the mutant changed the instrument, not the engine; S1–S3 replace it and are covered)

Platform variance: `TMPDIR=/tmp command node --test shared/resources/tests/qa-results.test.mjs tests/deferred-work-placement.test.js tests/qa-results-step12-wiring.test.js` → exit 0, 87/87.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) | PASS — 5288 tests, 5287 pass, 0 fail, 1 skipped |
| Existing engine cases A–N (one changed: G4 now refuses) | PASS — G4's change is the stated direction |
| Corpus write survey | PASS 0 / 0 / 0, with the CR-5 caveat |

---

## Test Artifacts

### Files Reviewed

`shared/resources/qa-results.js`, `shared/resources/tests/qa-results.test.mjs`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `skills/qa-task/SKILL.md`,
`skills/qa-story/SKILL.md`, `skills/create-bug-report/SKILL.md`, `tests/deferred-work-placement.test.js`,
`tests/create-bug-report-bug-reports-heading.test.js`, `tests/qa-results-corpus.test.js`,
`tests/qa-results-step12-wiring.test.js`

### Test Commands Executed

```bash
npm run ci:fast
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js tests/deferred-work-placement.test.js tests/create-bug-report-bug-reports-heading.test.js
npm run -s validate -- skills/qa-task/   # and qa-story, create-bug-report, develop-task, develop-story
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed runnable-prose file> --json
TMPDIR=/tmp command node --test shared/resources/tests/qa-results.test.mjs tests/deferred-work-placement.test.js tests/qa-results-step12-wiring.test.js
```

### Coverage Report

Not measured (the repository's node:test suites carry no coverage instrument).

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1..CR-5 — fix each with its own regression test (qa-fix cycle 1).

### Short-term Actions (Non-Blocking)

1. CR-6 — peel a standalone comment before any heading again, or refuse; it shares `trimSeparator` with CR-4.
2. CR-7 — narrow the setext paragraph test.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Delivery is complete and well tested, but five reproduced medium defects can delete
content through the new rules, which is the class this task exists to remove.
**Quality Score**: 50/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1..CR-5 fixed and re-reviewed

---

**QA Report**: co-located at `task.171.qa.1.deferred-work-placement-and-qa-results-residuals.md`
**Gate File**: co-located at `task.171.gate.1.deferred-work-placement-and-qa-results-residuals.yml`
**Next Steps**: qa-fix cycle 1
