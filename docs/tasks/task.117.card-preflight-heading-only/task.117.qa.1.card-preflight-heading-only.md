# QA Report: Task 117 - The card preflight passes a Success Criteria block that renders as a bold label with nothing under it

**Task**: [Link to task document](./task.117.card-preflight-heading-only.md)
**Gate File**: [task.117.gate.1.card-preflight-heading-only.yml](./task.117.gate.1.card-preflight-heading-only.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

The task delivered what it set out to: bold-label lines are dropped the way `###` lines are, the
corpus test walks 120 task documents with a floor of 100 and goes 29 → 0, and reverting the
summariser turns it red at 28. The `heading-only` finding kind exists and fires by construction on a
section that is nothing but labels. What it also introduced is a **second, property-based** detector
(`isLabelOnly`) whose two halves both misfire — the list-item half can never match because it reads
post-collapse text, and the terminator half takes any unpunctuated prose for a label — and an
ordering defect that leaves the fix inert for epics. All three reproduce, all three are medium, and
the gate is CONCERNS with three open entries for `qa-fix`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`, 5/5 phases `[x]`)
- [x] All implementation phases completed
- [x] Tests passing (`npm run ci:fast` green at Step 3; 515/515 across the affected suites here)
- [x] Breaking changes documented (§5 "None" + the body-diff-on-next-sync note in §10 and the CHANGELOG)
- [x] Code on feature branch with open PR (#416, head `76ac85df`)

### Testing Approach

- [x] Automated Testing (unit, corpus, mutation)
- [x] Regression Testing (four `sync-jira-*` suites, create-task suite)
- [x] Security Review (executed boundary probe — 161 inputs)
- [x] Code Review (independent Explore reviewer + QA reproduction)
- [ ] Manual Testing — CLI exercised by hand on a clean and a label-only document
- [ ] Performance Testing — pathological-input timing only

### Review Methodology

Direct tools plus one independent Explore diff reviewer (Step 3b) — standard mode, 3 phases, low
risk. Reviewer dispatched 07:02 → returned 07:06 (budget 10 min); its five findings were each
reproduced in-line before entering the gate. Step 4b ran (runnable prose in the change set).
Boundary rule fired: `isLabelOnly` / `RE_BOLD_LABEL` are classifiers, so they were executed against
the hostile corpus, not read. First review — no re-review context.

---

## Implementation Verification

| Phase                                     | Status   | Test Result | Notes                                                                                                                              |
| ----------------------------------------- | -------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Phase 1: corpus test                      | PASS     | Verified    | `card-preflight-corpus.test.mjs`: 120 visited, floor 100, count 0; header records 29 before the fix                               |
| Phase 2a: summariser drops bold labels    | PASS     | Verified    | `RE_BOLD_LABEL` in `dropHeadingLines`; every label, not only the first; `**None.**` survives (C2 fixtures)                        |
| Phase 2b: `heading-only` finding kind     | CONCERNS | Partial     | By-construction case correct; the property-based case misfires on three legitimate shapes (CR-1, CR-3) and the epic path (CR-2)  |
| Phase 2c: scope statement                 | PASS     | Verified    | `describeCardScope` in display and `--json`; counts resolved blocks; singular/plural                                                |
| Phase 3: mutation proofs                  | PASS     | Verified    | Re-run by QA below                                                                                                                 |

**Overall Phase Completion**: 5/5 delivered; 1 with open defects.

---

## Success Criteria Verification

| Criterion                                                                  | Target                    | Actual                                                                 | Status   |
| -------------------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------- | -------- |
| 1. `heading-only` is a finding kind; corpus 0 after the fix, count before recorded | kind exists; 0; recorded | kind exists; 0 of 120; 29 recorded in the test header and task doc    | PASS     |
| 2. `summariseSection` renders the list under a bold label                  | list, not label           | `kind: list`, label absent, for task/story/bug specs; **not for epic** (CR-2) | CONCERNS |
| 3. Clean output names its scope                                            | scope line                | `N card blocks resolve — this checks the card sections only, not template completeness.` + `scope` in JSON | PASS |
| 4. One-definition property test passes; bundled copies match               | green                     | `card-preflight.test.mjs` B green; `bundle:check` OK                   | PASS     |
| 5. Observations #43, #49 close naming this PR                              | closed                    | Not yet — PR number exists as of Step 4; to be done at finalise         | PENDING  |

---

## Breaking Changes Validation

### Breaking Change: card body diff on next sync
Documented: Yes (§10, CHANGELOG `### Fixed`)
Migration Path Provided: N/A — the diff is the fix
Migration Tested: N/A
Consumer Code Updated: N/A
Notes: The affected cards gain their criteria list on next sync. Correctly described as a body diff, not a contract change.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (3)

**Issue: `isLabelOnly`'s list-item half is inert (CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.117.bug.1.label-property-overbroad.md](./task.117.bug.1.label-property-overbroad.md)
- **Observation**: `checkCardSections` on `The task is done when all of:\n- a\n- b` → `heading-only` (critical). The text handed to `isLabelOnly` has already had its newlines collapsed to spaces, so no line can start with a bullet.
- **Impact**: A lead-in colon with bullets directly beneath — the shape `isListSection`'s own comment calls legitimate — is NO-GO at review.
- **Recommendation**: Read the pre-collapse section lines.
- **Priority**: P1

**Issue: epic `transform` runs before the bold-label drop (CR-2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.117.bug.2.epic-transform-precedes-label-drop.md](./task.117.bug.2.epic-transform-precedes-label-drop.md)
- **Observation**: `checkCardSections("## Epic Goal\n\n**Existing System Context:**\n\n- a\n- b\n", epic)` → `heading-only` + `no-body`; the epic card still publishes the label and stops.
- **Impact**: The task's fix does not reach epic cards; the new finding blames the author for content that exists.
- **Recommendation**: Drop label lines before the transform.
- **Priority**: P1

**Issue: terminator-less prose is taken for a label (CR-3, QA-promoted)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.117.bug.1.label-property-overbroad.md](./task.117.bug.1.label-property-overbroad.md)
- **Observation**: `Add a dark-mode toggle to settings` (Summary), `None` (Breaking Changes), a story statement without a trailing period, a >600-char paragraph truncated to `…` — all four reproduced as `heading-only`. Reviewer confidence was medium; QA reproduced every shape, which is why it enters the gate.
- **Impact**: False Critical on terse, legitimate card leads; the corpus is clean only because every real document ends its lead with a period.
- **Recommendation**: The property must describe a label, not unpunctuated prose.
- **Priority**: P1

### LOW Severity Issues (4)

- **CR-4** (cleanup): the `heading-only` message says "nothing under it" even when `omitted > 0` — the summariser stopped in front of content. Branch the message on `omitted`.
- **CR-5** (cleanup): the affected-document count is stated four ways (26 / 15 / 29 of 120 / 28 of 120). State it once with its definition, or cite the corpus test.
- **Probe**: CRLF lists are never detected as lists (`RE_BULLET`'s `(.*)$` cannot cross `\r`). Pre-existing, untouched by this diff; the summariser fix works on CRLF labels but the list beneath still renders as prose.
- **Step 4b**: `skills/review-story/SKILL.md:2321` exits 1 in both shells — its last statement is a false `[ … ] &&` guard. Pre-existing block, outside this diff's hunks; not a portability defect. `skills/create-story/SKILL.md` reports `zero-blocks-executed`: its two placeholder blocks carry literal `{…}` template slots that `--bind` cannot fill; the diff touched no bash block in that file.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 4

---

## NFR Assessment

### Performance — PASS
One extra regex test per non-fence line. Probed with a 200,000-character bold line, 100,000 asterisks and 20,000 alternating bold runs: every call under 50 ms. `RE_BOLD_LABEL`'s character class excludes `*`, so it cannot backtrack across the closing marker.

### Reliability — PASS
The corpus test has a non-vacuity floor and the 29 → 0 → 28 sequence was measured. Rollback is one revert plus bundle; the test names the state it would leave.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 161
- 73 corpus cases from all five sinks (`url-authority`, `sql-orm`, `shell-exec`, `path`, `template-render`) were fed raw and wrapped as `**label**` + list through `summariseSection` and `checkCardSections`; 15 classifier-specific shapes added (ReDoS-length inputs, `****`, `**:**`, CRLF, unicode, indented, bold-inside-list, `null`, `**Ready?**`). No throw, no slow call. Three deviations, none introduced by this diff (see LOW). No untrusted input reaches a shell from this code; the classifier decides only what text reaches an ADF/markdown body.

### Maintainability — CONCERNS
CR-4 and CR-5: a message that misdescribes the situation it reports, and a figure stated four ways. Cheap, but the second is exactly the enumeration drift the repository's anti-patterns document names; recorded so `qa-fix` takes both with the property rewrite.

---

## Code Review

Independent Explore reviewer over the full branch diff (18 files; `references/` copies excluded). `code_review_blocking=true` (pipeline). Bugs with `confidence: high` entered `top_issues[]`; CR-3 was promoted after QA reproduced all four of its shapes.

**Correctness bugs (3):**
- [medium/high] `shared/resources/jira-sync.js:1672` — the list-item half of `isLabelOnly` reads post-collapse text, so it can never match → read the pre-collapse lines. **Gate: CR-1**
- [medium/high] `shared/resources/jira-sync.js:1721` — epic `transform` rewrites `**Label:**` before `summariseSection`, so the label drop never fires for epics → drop labels before the transform. **Gate: CR-2**
- [medium/medium→high after reproduction] `shared/resources/jira-sync.js:1671` — no-terminator alone is taken as a label → describe a label. **Gate: CR-3**

**Cleanups (2):**
- `shared/resources/jira-sync.js:1765` — `heading-only` message wrong when `omitted > 0` → branch on `omitted` (CR-4).
- `shared/resources/jira-sync.js:1278` — corpus figure stated four ways → one figure, one definition (CR-5).

**Boundary rule**: `boundary: true` — `isLabelOnly` and `RE_BOLD_LABEL` accept/reject text. `probes_executed: 161` (script in the QA scratchpad; inputs from `references/security-input-corpus.mjs` `corpusFor(<sink>)` for all five sinks, plus 15 hand-written shapes).

**Mutation proofs** (re-run by QA, source snapshotted with `cp`, restored byte-identical):
- mutation-proven: bold-label drop reverted in `dropHeadingLines` → `corpus: no task document publishes a label-only card block` (red at 28 of 120) and `corpus: the finding fires on a bold label alone…` → **covered**
- mutation-proven: `isLabelOnly` branch made inert → `H: a label with nothing but a fence under it is heading-only on an optional block, Important` → **covered**
- not-run: CR-1/CR-2/CR-3 have no committed test that would go red — that absence is the finding.

**Platform variance**: no environment-derived value (`os.tmpdir()`, `$HOME`, `$TMPDIR`) reaches a validating consumer in this diff — the corpus test resolves the repo root from `import.meta.url`. Not applicable.

**Step 4b (documented commands)**: 8 changed prose files with bash fences. `review-task/SKILL.md`: 1 block executed after `--bind INPUT=<task file>`, bash = zsh, clean. `review-story/SKILL.md`: 2 executed after binding `INPUT`, `TRACKER`, `STORY_FILE`, `GITHUB_ISSUE`; line 2321 exits 1 in both shells (pre-existing false-guard exit status, see LOW). The other six files: every block correctly refused as `mutating` (`no-executable-blocks`, exit 0) — `node`, `source`, `gh`, `curl`, write redirections — or, for `create-story`, two literal `{…}` template slots (`zero-blocks-executed`, unbindable). zsh available and run. No shell disagreement anywhere.

---

## Regression Testing

| Area                                            | Result | Notes                                                          |
| ----------------------------------------------- | ------ | -------------------------------------------------------------- |
| `sync-jira-{task,story,epic,bug}` suites        | PASS   | 515/515 across the eight suites run together                   |
| `jira-sync-card-summary.test.mjs` A–H           | PASS   | incl. the per-kind corpus tests for task/story/epic/bug cards  |
| `card-preflight.test.mjs` (one-definition, bundle parity, --json) | PASS | after `npm run bundle`                            |
| `create-task` suite (`countMandatorySections` untouched) | PASS | —                                                          |
| `npm run ci:fast` (Step 3)                       | PASS   | green after prettier on two new test files                     |

---

## Test Artifacts

### Files Reviewed
`shared/resources/jira-sync.js` (§summariser, §card preflight, exports), `shared/resources/card-preflight.js`, the three test files, `shared/resources/authoring-card-preflight.md`, `shared/resources/tracker-card-summary.md`, `skills/{create-task,create-story,create-epic,review-task,review-story,review-epic}/SKILL.md`, `CHANGELOG.md`, `docs/tasks/task.104/…`.

### Test Commands Executed
```bash
node --test --test-concurrency=4 shared/resources/tests/card-preflight-corpus.test.mjs \
  shared/resources/tests/jira-sync-card-summary.test.mjs shared/resources/tests/card-preflight.test.mjs \
  'skills/sync-jira-{task,story,epic,bug}/tests/*.test.js' 'skills/create-task/tests/*.test.js'   # 515/515
node skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-task/SKILL.md --bind INPUT=<task> --copy docs --json
node <probe.mjs>   # 161 boundary probes
```

### Coverage Report
Not instrumented in this repository (`node --test` without coverage). Mutation proofs stand in for the two invariants the task named.

---

## Recommendations

### Immediate Actions (Blocking)
1. Rewrite the `heading-only` property to read pre-collapse section lines and to describe a **label** (trailing colon, or short with omitted content beneath), not any terminator-less prose; fixtures for the four reproduced shapes (CR-1, CR-3).
2. Run `dropHeadingLines` before `spec.transform` so epic standalone labels are dropped; epic fixture beside C2 (CR-2).

### Short-term Actions (Non-Blocking)
1. Branch the `heading-only` message on `omitted` (CR-4); state the corpus figure once with its definition (CR-5).
2. CRLF line handling in `RE_BULLET` / `RE_ORDERED` — pre-existing, out of scope; file separately.
3. `skills/review-story/SKILL.md:2321` — append `|| true` to the trailing guard; pre-existing.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The delivered fix is correct and proven for the shape the task named; the new property-based detector misfires on three legitimate shapes and the epic ordering leaves one document kind unfixed. Medium, reproduced, fixable in one cycle.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1, CR-2, CR-3 fixed and mutation-proven; corpus test and the four `sync-jira-*` suites green.

---

**QA Report**: co-located at `task.117.qa.1.card-preflight-heading-only.md`
**Gate File**: co-located at `task.117.gate.1.card-preflight-heading-only.yml`
**Next Steps**: `/qa-fix` on the three open entries, then re-review (cycle 2 is a full-diff refute pass).
