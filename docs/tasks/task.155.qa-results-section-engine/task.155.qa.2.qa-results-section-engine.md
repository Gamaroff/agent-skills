# QA Report: Task 155 - QA Testing Results section engine (cycle 2)

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.2.qa-results-section-engine.yml](./task.155.gate.2.qa-results-section-engine.yml)
**Previous Gate**: [task.155.gate.1.qa-results-section-engine.yml](./task.155.gate.1.qa-results-section-engine.yml) (CONCERNS 70)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

QA cycle 2 (develop-task Step 5a, `code_review_blocking=true`) over PR #537 at `99838ae8`. All five
cycle-1 fixes hold, and each is mutation-proven by a committed test. The engine rewrote all 155
tracked corpus documents that carry the section (in a temp copy) with `replaced`, and changed no
markers and no dated rows. The refute pass found that the REL-002 fix over-reaches and is also
incomplete. It relocates a legitimate section that quotes a `| Date | Version |` table, leaving a
stale tail behind (a regression: the pre-fix engine handled this cleanly). And it still deletes
every row under a legacy `| Date | Change |` log header.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix REL-004 and REL-005 in `/qa-fix`)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| REL-001: a section carrying a second H1/H2 stacks | medium | FIXED | H2, H1 and a marker block inside the section → `bad-section`; fenced H2, H3 and setext text still accepted. Mutation N1 (check disabled) → F1 red |
| REL-002: section between a marker-less `## Change Log` and its table deletes the rows | medium | PARTIAL | Canonical header: `relocated`, rows kept, next write `replaced`. Mutations N2 and N4 → F2 red. Legacy header (`\| Date \| Change \|`) still deletes every row → REL-005. The rule also over-fires → REL-004 |
| REL-003: containment judged against the earliest marker block only | low | FIXED | Section inside a later current block after a jira legacy block → `relocated`, one start and one end marker each. Mutation N3 (earliest block only) → F3 red |
| CR-3: the corpus guard shares the engine's matcher | future | FIXED | The guard now cross-checks the engine against an independent line scan |
| CR-4: stale section file feeds the next cycle | future | FIXED | Both Step 12 blocks `unlinkSync` the section file after a successful write; a refused write keeps it |
| CRLF seam preservation | future | DEFERRED | Still mixed endings at the seam (reproduced); stays in `recommendations.future` |

## New Findings This Cycle

- **[medium]** `shared/resources/qa-results.js:173` — REL-004 (CR-1): `logFollows = block || (changeLog && changeLog.start < start)` fires for every section after the log, including after a finished marker-less table and after a closed marker block. A section there that quotes a `| Date | Version |` table is cut at it, reported `relocated`, and its stale tail stays behind. → Narrow the rule to a change-log heading with no table of its own before the section; never apply it to a marker document outside every block.
- **[medium]** `shared/resources/qa-results.js:64` — REL-005 (CR-2): `RE_LOG_HEADER` knows only the canonical header, so the REL-002 layout over `| Date | Change | Author |` is `replaced` and deletes every row (2 → 0 reproduced). → End the span at any change-log header or entry row, using change-log.js's vocabulary or `RE_ENTRY_ROW`.
- **[low]** `shared/resources/qa-results.js:175` — REL-006 (CR-3): in a genuine REL-002 layout, a table quoted inside the misplaced section is taken for the log's header, so part of the stale section stays inside the log. → Cut at the log's own header.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (status `ready-for-review`)
- [x] All implementation phases completed (4/4 checked)
- [x] Tests passing
- [x] Breaking changes documented (none to a public contract)
- [x] Code on `feature/task.155.qa-results-section-engine` with open PR #537

### Testing Approach

- [x] Automated Testing (unit, wiring, corpus; full `npm run ci:fast`)
- [x] Performance Testing (task test files timed)
- [x] Regression Testing (whole tracked corpus through the engine, in a temp copy)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b, cycle-2 refute pass)

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review. The cycle-2 rule
applied: the reviewer read the whole branch diff (1,758 lines, excluding the task directory) with
the REFUTE directive, aimed at the cycle-1 fixes. QA also executed its own probes against the fixed
engine and against the pre-fix engine (`git show 6d6c166d:shared/resources/qa-results.js`) to
establish where each defect came from.

```
Re-review scope: unscoped — cycle 2 refute pass over the whole origin/develop...HEAD diff (prior gate head 6d6c166dc6b7)
```

Step 4b: `qa-execute-snippets.mjs` over `skills/qa-task/SKILL.md` (1 runnable, 3 placeholder, 16
mutating) and `skills/qa-story/SKILL.md` (1 runnable, 4 placeholder, 14 mutating). 0 findings, 0
notes. The Step 12 blocks themselves are executed by `tests/qa-results-step12-wiring.test.js`, and
this cycle's own Step 12 write ran through them.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the engine | CONCERNS | 26/26 unit | REL-004, REL-005, REL-006 |
| Phase 2: wire the QA skills | PASS | wiring 6/6 | CR-4 unlink verified; the block ran for this cycle's own write |
| Phase 3: corpus guard and repair | PASS | corpus green | Independent line scan in place; task.65 holds one section |
| Phase 4: docs and validation | PASS | ci:fast exit 0 | bundle:check 0 problems; validate ✓ for both skills |

**Overall Phase Completion**: 4/4 delivered, 1 with concerns

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Each of the five reasons in the named case, nothing written on the refusals | Yes | Yes | PASS |
| Fenced / inline-code heading never found or replaced | Yes | Yes | PASS |
| Step 12 writes through the engine, one section | Yes | Yes (and this cycle's write) | PASS |
| Corpus guard green, red on a re-stacked copy | Yes | Yes | PASS |
| Engine + corpus tests < 2 s | < 2 s | ~1.2 s (33 tests) | PASS |
| No network | none | none | PASS |
| No second fence scanner | Yes | Yes | PASS |
| ci:fast, bundle:check, validate clean | clean | clean | PASS |
| Observation #178 actioned on merge | on merge | not yet merged | N/A |

---

## Breaking Changes Validation

None to a public contract. The `multiple` refusal is documented in the task's § 5. **PASS**.

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue: REL-004 — the misplaced-section rule fires after a finished change log**
- **Severity**: MEDIUM · **Category**: Functional (regression from the cycle-1 fix)
- **Observation**: after a finished marker-less log, or after a closed `<!-- change-log-end -->`,
  a section containing a `| Date | Version | … |` table is cut at that table and marked
  `insideChangeLog`. The write returns `relocated`, puts the new section before the log, and leaves
  the old tail (its table and the text after it) behind the log. In the marker-less shape, a later
  `extractEntries` reads a quoted dated row there as a Change Log entry. The engine at `6d6c166d`
  returned `replaced` cleanly on both shapes.
- **Impact**: silent corruption reported as a success reason. Latent: none of the 155 corpus
  documents trigger it today, but the reviewer counted 38 whose section sits after the log. In this
  repository a QA section that quotes a Change Log table is a realistic thing to write.
- **Recommendation**: apply the marker-less rule only when the change-log heading's body up to the
  section is blank. Never apply it to a marker document where the section is outside every block.
  Checked in a scratch copy: `changeLog.end === start` alone is **not** enough, because a marker-less
  heading's span always ends at the next H2 (the section itself), so the marker-less case still left
  its remnant. Add F4 variants.
- **Bug report**: none. The gate entry and this report carry it into `/qa-fix`, as cycle 1 did.

**Issue: REL-005 — legacy log headers still lose their rows**
- **Severity**: MEDIUM · **Category**: Functional (REL-002 fix incomplete)
- **Observation**: `RE_LOG_HEADER` is `^\|\s*Date\s*\|\s*Version\s*\|`. With
  `## Change Log` → section → `| Date | Change | Author |` table, the section span runs to the next
  H2, the write returns `replaced`, and both dated rows are deleted (reproduced; the same on the
  pre-fix engine).
- **Impact**: the data-loss shape REL-002 named survives for any header the canonical regex does not
  match. change-log.js already accepts `Date|Version|Description|Author|Change` headers
  (`isUnparsedRow`) and exports `RE_ENTRY_ROW`.
- **Recommendation**: cut at the first unprotected change-log header or dated entry row.

### LOW Severity Issues (1)

- **REL-006**: in a genuine REL-002 layout, a table quoted inside the misplaced section is taken as
  the log's header. Relocation moves only the section's head, and the rest stays inside the log.
  This is better than before the fix (then the rows were deleted), but it is not correct.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
33 task tests in ~1.2 s. The corpus run over 155 documents completed in well under a second.

### Reliability — CONCERNS
Refusals still write nothing. REL-004 leaves stale content while reporting `relocated`, and REL-005
deletes rows while reporting `replaced`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Pure string transform with no I/O. The Step 12 block passes paths as argv, never into script
  text. `boundary: internal`: the engine's inputs are a work-item document and a section this
  pipeline renders. No corpus sink models either, and neither predicate added here (`normaliseSection`
  returning null, `logFollows`) gates an action on external input.

### Maintainability — PASS
The engine reuses change-log.js primitives. The bundles are fresh. Every cycle-1 fix has a committed
test that goes red when the fix is reverted.

---

## Code Review

Cycle-2 refute pass, whole-branch diff, one Explore subagent (returned; about 3.5 minutes).
`code_review_blocking` resolved **true** (run-level arg), so bug + high-confidence findings are
promoted to the gate.

**Correctness bugs (4):**
- [medium/high] `shared/resources/qa-results.js:173` — CR-1: marker-less misplacement rule fires after a finished log or closed marker block → narrow it. **Promoted: REL-004**
- [medium/high] `shared/resources/qa-results.js:64` — CR-2: only the canonical log header ends a misplaced span; a legacy header loses every row → use the change-log header vocabulary or `RE_ENTRY_ROW`. **Promoted: REL-005**
- [low/high] `shared/resources/qa-results.js:175` — CR-3: a table quoted inside a misplaced section is taken for the log's header → cut at the log's own header. **Promoted: REL-006**
- [low/low] `skills/qa-task/SKILL.md:1343` — CR-4: the Step 12 block reads `$TASK_FILE` (qa-story: `$STORY_FILE`) without binding it. Advisory. `TASK_FILE` is this skill's documented input, and the block guards it with a HALT exactly as the other Step blocks do. Not adopted.

**Cleanups (0).**

**Boundary rule**: `boundary: internal`, as recorded above. Candidates considered: `normaliseSection`
(it validates a section this pipeline renders) and `findQaResults`' `logFollows` (a placement
predicate over the work item's own document). No corpus sink fits.

**Provenance (5b)**: REL-004 was run on the base engine (`6d6c166d`) and the result was clean
`replaced`, so it is new in `99838ae8`. REL-005 gives identical output on both engines, but the
engine does not exist on `develop`, so it is attributable to this branch and stays in `top_issues`.

**Mutation proofs** (scratch copy of `qa-results.js` + `change-log.js` + unit tests; the tree was
never edited):

```
mutation-proven: REL-001 sibling-H1/H2 refusal disabled → F1 → covered
mutation-proven: REL-002 logFollows reduced to marker blocks only → F2 → covered
mutation-proven: REL-003 containment against the earliest block only → F3 → covered
mutation-proven: REL-002 misplaced flag not set → F2 → covered
```

4 of 4 cycle-1 engine fixes proven. CR-3's corpus cross-check and CR-4's unlink were proven by the
developer (implementation report). QA re-ran both test files green but did not re-mutate them.

**Platform variance**: no environment-derived value reaches a validating consumer in this diff. Not
applicable.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Whole corpus through the engine (temp copy of 155 tracked `docs/**/*.md` carrying the section) | PASS: 155 `replaced`, 0 other reasons; `<!-- change-log-start/end -->` counts and dated rows unchanged in every file; a second write with a new token replaced only the section. One scanner disagreement (task.42) was checked by hand: the diff touches only the section's own lines |
| Legitimate shapes the REL-002 rule might mis-fire on | Section after a finished marker-less log (no quoted table): `replaced` ✓. Section with no log, quoting a table: `replaced` ✓. Fenced quoted table: `replaced` ✓. Quoted table after a finished log or closed block: ✗ REL-004. Two hand-written change-log headings with a stray header line: ✗ (same class as REL-004) |
| change-log.js suite | Green in ci:fast |
| Full suite | `npm run ci:fast` exit 0 — 4748 tests, 4747 pass, 0 fail, 1 skipped |

---

## Test Artifacts

### Files Reviewed
`shared/resources/qa-results.js` (and both bundled copies), `shared/resources/tests/qa-results.test.mjs`,
`tests/qa-results-corpus.test.js`, `tests/qa-results-step12-wiring.test.js`, the Step 12 blocks in
`skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`, and `git show 99838ae8`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js   # 33 pass, ~1.2 s
npm run ci:fast                                   # exit 0; 4748 tests, 4747 pass, 0 fail, 1 skipped
npm run bundle:check                              # 129 skills, 0 problems
python3 skills/create-skill/scripts/quick_validate.py skills/qa-task    # ✓
python3 skills/create-skill/scripts/quick_validate.py skills/qa-story   # ✓
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/{qa-task,qa-story}/SKILL.md --json   # 0 findings
# corpus run + edge probes: scratch scripts over a temp copy (never the tracked tree)
```

### Coverage Report
Not instrumented (node --test without coverage). Every engine reason and every cycle-1 fix has a
dedicated test.

---

## Recommendations

### Immediate Actions (Blocking)
1. REL-004: narrow the marker-less misplacement rule, and add tests for a quoted table after a
   finished log and after a closed block.
2. REL-005: end a misplaced span at any change-log header or entry row, and add a legacy-header twin
   of F2.

### Short-term Actions (Non-Blocking)
1. REL-006: cut at the log's own header.
2. CRLF seam preservation (carried from gate 1).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the cycle-1 fixes hold and the corpus is safe today. The REL-002 fix both over-fires
(REL-004, a regression) and under-covers (REL-005, row loss). Both are medium correctness defects,
and `code_review_blocking` makes them gate.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: REL-004 and REL-005 fixed and re-reviewed.

---

**QA Report**: co-located at `task.155.qa.2.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.2.qa-results-section-engine.yml`
**Next Steps**: `/qa-fix` cycle 2 → QA cycle 3
