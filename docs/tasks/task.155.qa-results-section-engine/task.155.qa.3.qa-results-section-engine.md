# QA Report: Task 155 - QA Testing Results section engine (cycle 3)

**Task**: [task.155.qa-results-section-engine.md](./task.155.qa-results-section-engine.md)
**Gate File**: [task.155.gate.3.qa-results-section-engine.yml](./task.155.gate.3.qa-results-section-engine.yml)
**Previous Gate**: [task.155.gate.2.qa-results-section-engine.yml](./task.155.gate.2.qa-results-section-engine.yml) (CONCERNS 70)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: PASS

---

## Executive Summary

QA cycle 3 (develop-task Step 5a, `code_review_blocking=true`) over PR #537 at `65dcca83`. The
cycle-2 rule replaced the table-header heuristic. It counts a section as inside a log only in a
marker block, or directly under a marker-less log that has no Date table yet, and it cuts at the
last Date-headed table. All three gate-2 findings (REL-004, REL-005, REL-006) are fixed, and each
fix is mutation-proven by a committed G-test. A corpus dry run in a temp copy rewrote all 155
tracked sections as `replaced` and left markers and rows unchanged. A second write was
byte-stable.

The adversarial pass found two residual shapes in how the engine recognises the log's table:

- **REL-007 (code-review CR-1).** A quoted Date table in a misplaced section is left behind as a stale tail.
- **REL-008.** A log holding two Date tables loses the first. This is a regression from the REL-006 first→last change.

Both are rated **low**, because neither can plausibly occur in a document this repository's skills
write. The corpus holds 0 instances of either shape, and neither QA template renders a Date-headed
table.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED (REL-007/REL-008 routed to `recommendations.future`)

---

## Re-Review Context

| Previous issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| REL-004: a section after a finished log or closed block, quoting a Date table, is relocated with a stale tail | medium | FIXED | G1 (marker-less) and G2 (closed marker block) → `replaced`, tail gone, rows kept. Mutation M5 (tableless check removed) → G1 red; M1 (end-equality → `start <`) → G6 red |
| REL-005: a legacy `\| Date \| Change \|` header under a misplaced section loses every row | medium | FIXED | G3 → `relocated`, both rows kept, header directly under `## Change Log`. Mutation M2 (canonical-only header) → G3 red |
| REL-006: a table quoted inside a misplaced section is taken for the log's header | low | FIXED for the between-heading-and-table layout | G4 → `relocated`, nothing of the section left in the log. Mutation M3 (first, not last) → G4 red. The residual positions (after the log rows in a block, under a stub log) are REL-007 |
| CRLF seam preservation | future | DEFERRED | Re-reported by the reviewer as CR-2 (low/medium); stays in `recommendations.future` |

## New Findings This Cycle

- **[low]** `shared/resources/qa-results.js:208` — **REL-007** (code-review CR-1). The reviewer rated
  it medium with high confidence, and QA downgraded it on plausibility. A misplaced section that
  quotes a Date-headed table is cut at its own table when there is no log table below it. That
  happens in two positions: inside a marker block **after** the log rows (the obs #178 position),
  and directly under a marker-less log with no table (the H3 bullet-log shape that task.19 and
  task.22 carry). The write reports `relocated` and leaves the quoted rows and tail inside the log,
  where `change-log.js` would read them as entries. Probes P1 and P6 reproduce it. Provenance: P1
  already occurs at `6d6c166d`, and P6 first appears at `99838ae8`. **Plausible in corpus: no.**
  None of the 155 tracked QA sections quotes a Date-headed table, and neither Step 12 template renders one (the
  only `| Date |` table in `qa-story/SKILL.md` is the bug-report Status History). → Apply the cut
  only when no log table lies between the log start and the section, and add tests for both positions.
- **[low]** `shared/resources/qa-results.js:130` — **REL-008**. This is a regression from the
  REL-006 fix. `lastTableStart` picks the **last** Date table. So when a misplaced section precedes
  a log holding two Date-headed tables, the first table and its rows go with the section and are
  deleted. Probe P2 dropped 2 rows to 1, where `99838ae8` kept both. In the same class, and present
  since `6d6c166d`: a log header that is not Date-first (`| Date (UTC) |`, `| Change | Date |`), or
  no header at all, still loses its rows under a misplaced section (P4, P5). **Plausible in corpus:
  no.** There are 0 logs with two Date tables and 0 misplaced sections, and the non-Date-first
  headers appear only in `prd.onboarding.md` (a PRD, which QA never writes to) and in task.42's
  quoted prose. → Cut at the first log table after the section's own content, or at the first
  `RE_ENTRY_ROW` line, and add a two-table fixture.

Searched (scoped, since gate 2's head): 7 files, and the engine was read in full. The probe set
covered the containment matrix and the table-recognition matrix:

- containment: marker block / marker-less / H3 log / markers wrapping only the table
- table recognition: section before or after the rows, quoted table / none, one or two tables, Date-first / non-Date-first / headerless header, CRLF

Plausibility was checked against a survey of all 1,981 tracked `docs/**/*.md`: the change-log header shapes present, logs with two or more Date tables, table-less logs, QA sections that quote a Date table, and sections inside a log.

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
- [x] Regression Testing (corpus dry run, provenance probes on three engine versions)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b, one Explore subagent, scoped)

### Review Methodology

Direct tools for the re-review (the Adaptive Review Strategy's re-review row), plus one read-only
Explore subagent for the Step 3b diff review. It returned in about 100 s, and its `code_review:`
block was in hand before this gate was written. Adversarial probes were run with a scratch script
against `shared/resources/qa-results.js` (P1–P9). Each residual was then re-run against the engine
at `6d6c166d`, `99838ae8` and `65dcca83` for provenance.

Re-review scope: files changed since gate 2 (head 99838ae868c4; 7 files) — default

`SAFETY_REPROBE=false`: gate 2's security axis is `PASS` / `reasoned`, and clauses 2–3 do not
hold, because no safety-class finding was open and no security success criterion exists.

Step 4b: not applicable — no runnable prose in the change set. This cycle's scoped diff touches no
`SKILL.md` or `shared/resources/*.md`; the Step 12 wiring was executed by
`tests/qa-results-step12-wiring.test.js`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the engine | PASS | Verified | Cycle-2 rule (`underTablelessLog`, `lastTableStart`, Date-first `RE_LOG_HEADER`); REL-007/008 residuals low |
| Phase 2: wire the QA skills | PASS | Verified | Wiring tests green; bundled copies identical to source bar the AUTO-GENERATED header |
| Phase 3: corpus guard and repair | PASS | Verified | Corpus guard green; dry run 155/155 `replaced` |
| Phase 4: docs and validation | PASS | Verified | `bundle:check` 0 problems; `validate` ✓ qa-task, ✓ qa-story |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

**Functional**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Each of the five reasons in its § 3 case; nothing written on `multiple`/`bad-section` | yes | yes (unit tests) | PASS |
| Fenced / inline-code heading never found or replaced | yes | yes | PASS |
| Step 12 of both skills writes through the engine; extracted call leaves one section | yes | yes (wiring tests) | PASS |
| Corpus guard passes after the task.65 repair and fails, naming the file, on a re-added copy | yes | yes (cycle 1 proof; guard green now) | PASS |

**Performance**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Engine + corpus tests | < 2 s | ~0.8 s (39 tests) | PASS |
| No network | none | none | PASS |

**Code Quality**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| No second fence scanner | imports from change-log.js | yes | PASS |
| New assertions mutation-proved | every one | G1, G3, G4, G6 proven this cycle; `!hasMarkers` clause absorbed (see Code Review) | PASS |
| `ci:fast`, `bundle:check`, `validate` clean | clean | 1 load-sensitive timing failure under concurrency, green alone; others clean | PASS |

**Migration**: CHANGELOG cites `(task 155)` — PASS. Observation #178 → `actioned` on merge — pending, as designed.

---

## Breaking Changes Validation

None. The engine is a new module. Step 12 changes how the section is written, not what it
contains; a document the engine refuses halts the step with nothing written. **Overall**: PASS
(N/A).

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **REL-007**: a quoted Date table in a misplaced section is cut and left as a stale tail (block after rows, or under a table-less log). Not plausible in the corpus. See New Findings.
- **REL-008**: a log with two Date tables loses the first under a misplaced section. A non-Date-first or headerless log table loses its rows. Not plausible in the corpus. See New Findings.

No bug files were created, because both issues are LOW.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

The 39 task tests run in about 0.8 s, and the 155-document corpus dry run is sub-second.

### Reliability — PASS

Refusals still write nothing. REL-004/005/006 are fixed and proven. The residuals need two
conditions that the engine itself no longer produces: a section already sitting inside a log, and
an unusual table shape. There are 0 corpus instances.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. The inputs are a pipeline-written work-item document and a pipeline-rendered
  section. The one plausible sink, `markdown-structure`, models implementation reports and their
  problem codes, not this section's placement. The engine has no network access and no eval, and
  Step 12 passes paths as `node -e` argv, never into the script text.

### Maintainability — PASS

The engine reuses `change-log.js` primitives and the bundle is fresh. Two advisory cleanups remain (CR-3, CR-4).

---

## Code Review

Step 3b, cycle 3, scoped to the 7 files changed since gate 2's head. The reviewer read
`qa-results.js` in full and probed it with node. `code_review_blocking=true`, so CR-1 (bug, high
confidence) is promoted to the gate as **REL-007**. Its severity went from **medium to low** on
plausibility, and the reasoning is recorded in New Findings.

**Correctness bugs (2):**

- [medium→low (QA) / high] `shared/resources/qa-results.js:208` — CR-1: a misplaced section after the log table inside a block, or under a table-less marker-less log, that quotes a Date table is cut at its own table, and relocation leaves the quoted rows and tail in the log. **Promoted as REL-007.** This QA run reproduced it independently (P1, P6).
- [low/medium] `shared/resources/qa-results.js:307` — CR-2: on a CRLF document the replace seam mixes LF and CRLF and adds a blank line. Advisory, the carried CRLF item.

**Cleanups (2):**

- `shared/resources/qa-results.js:323` — CR-3: `before.endsWith("\n\n")` can never be true after the preceding `replace(/\n+$/, "\n")`. Drop it.
- `shared/resources/qa-results.js:270` — CR-4: the `findQaResults(body)` count in `normaliseSection` is redundant with the `startsWith` check plus the sibling-H1/H2 refusal. It adds a full scan to every write.

**Mutation proofs** (snapshot with `cp`, restore from the snapshot, file byte-identical afterwards, then baseline 32/32 green):

```
mutation-proven: underTablelessLog `changeLog.end === start` → `changeLog.start < start` → G6 red → covered
mutation-proven: RE_LOG_HEADER back to canonical `Date | Version` only → G3 red → covered
mutation-proven: lastTableStart returns the FIRST header, not the last → G4 red → covered
mutation-proven: underTablelessLog tableless check replaced by `true` → G1 red → covered
mutation-proven: `!changeLog.hasMarkers &&` removed → no test red → absorbed (a marker block's end is past `-->`, so it never equals a line-start heading offset; the clause is belt-and-braces)
```

G2 and G5 were not mutated separately. G2 holds through the `!block` / `changeLog.end === start`
pair, and G5 through the tableless check (M5).

**Platform variance:** `TMPDIR=/tmp command node --test tests/qa-results-step12-wiring.test.js tests/qa-results-corpus.test.js shared/resources/tests/qa-results.test.mjs` → 39/39 pass, exit 0.

**Probe matrix** (current engine; rows = dated rows before→after, `stale` = quoted/old text survived):

| Probe | Shape | Reason | Rows | Stale | Verdict |
| --- | --- | --- | --- | --- | --- |
| P1 | in block, after rows, section quotes Date table | relocated | 2→2 | yes | REL-007 |
| P2 | in block, before two Date tables | relocated | 2→1 | no | REL-008 (regression from REL-006 fix) |
| P3 | H3 marker-less log, section directly under | relocated | 1→1 | no | correct |
| P4 | under log, `\| Date (UTC) \|` header | replaced | 1→0 | no | REL-008 class (pre-existing) |
| P5 | under log, headerless rows | replaced | 1→0 | no | REL-008 class (pre-existing) |
| P6 | table-less stub log, section quotes Date table | relocated | 1→1 | yes | REL-007 |
| P7 | CRLF variant of the misplaced layout | relocated | 1→1 | no | correct |
| P8 | markers wrap only the table, section above them | replaced | 1→1 | no | correct (bounded by the block) |
| P9 | in block, section quoting before the log rows | relocated | 2→1 | no | correct (the quoted row went with the section) |

Every probe's second write returned `replaced` with exactly one section.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Corpus dry run (temp copy, 155 docs) | PASS: 155 `replaced`; dated rows outside the old section, change-log markers and log span unchanged; second write byte-stable; live tree untouched |
| Full `npm run ci:fast` | 4755 tests: 4753 pass, 1 fail, 1 skipped. The fail was `tests/test-clean-checkout.test.js` at 10168 ms against a 10000 ms budget (LOAD-SENSITIVE, run concurrently with other suites); alone it passed 13/13 in 7.7 s |
| Bundled copies | `bundle:check` 0 problems across 129 skills; both copies equal the source bar the header |
| Skill validation | `validate` ✓ qa-task, ✓ qa-story |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/qa-results.js` (full), `shared/resources/tests/qa-results.test.mjs` (G1–G6)
- `skills/qa-task/references/qa-results.js`, `skills/qa-story/references/qa-results.js` (bundled)
- `shared/resources/change-log.js` (`findChangeLog`, `findMarkerBlock`, `RE_HEADING`)
- `skills/qa-story/SKILL.md`, `skills/qa-task/SKILL.md` (Step 12 templates: any Date-headed table)

### Test Commands Executed

```bash
command node --test shared/resources/tests/qa-results.test.mjs tests/qa-results-corpus.test.js tests/qa-results-step12-wiring.test.js
TMPDIR=/tmp command node --test tests/qa-results-step12-wiring.test.js tests/qa-results-corpus.test.js shared/resources/tests/qa-results.test.mjs
command npm run ci:fast
command node --test tests/test-clean-checkout.test.js
command npm run bundle:check
command npm run -s validate -- skills/qa-task/ && command npm run -s validate -- skills/qa-story/
```

The following scratch scripts are not committed:

- the probe matrix, and the same matrix at `6d6c166d`/`99838ae8`/`65dcca83` for provenance
- the corpus shape survey
- the corpus dry run
- the mutation loop

### Coverage Report

No coverage tool is configured for `shared/resources/*.js`. Coverage is argued per branch through
the mutation proofs above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. REL-007 / REL-008: bound the misplaced-span cut by the log's own table position, and add fixtures for the quoted-table-in-block, stub-log and two-table shapes.
2. Preserve CRLF at the write seams (CR-2; carried).
3. Cleanups CR-3 and CR-4.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every gate-2 finding is fixed and mutation-proven, and the corpus rewrite is clean
and stable. The only open items are two low residuals with zero corpus instances, in shapes the
engine itself cannot create.
**Quality Score**: 100/100. The formula deducts only for FAIL/CONCERNS statuses, and none is open.

**Deployment Recommendation**: APPROVED
**Conditions**: none

---

**QA Report**: co-located at `task.155.qa.3.qa-results-section-engine.md`
**Gate File**: co-located at `task.155.gate.3.qa-results-section-engine.yml`
**Next Steps**: Step 5c review-pr, then `/finalise`. REL-007/REL-008 go to a follow-up, or to a
`/qa-fix` pass if the pipeline chooses to spend one.
