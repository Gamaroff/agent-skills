# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check (cycle 6)

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.6.open-coverage-fail-closed-reader.yml](./task.240.gate.6.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

This is the first cycle of the two granted after the loop-limit escalation. It reads cycle 5's fix
(`195ea1d9`) and the operator's differential-test commit (`22bdc3e9`). BUG-5 is fixed and the header
drift (QA-7) is gone. CI is green on the head.

The scoped review found two more classes of shape that YAML rejects and the reader still counts:

- a comment inside a wrapped plain value (BUG-6);
- a value that starts with a YAML indicator (BUG-7).

The new PyYAML differential suite cannot generate either class (BUG-8). In each case the count is
the one the writer meant, so no routing decision changes. What breaks is the reader's own
contract: print `unreadable` or YAML's count.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-8, QA-9, QA-10)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-240-QA-6 / BUG-5 | ✅ FIXED | Both wide-dash blocks read `unreadable`; the aligned block reads 0. Mutation `keyIndent` → `dash + 2` turned 5 tests red. bug.5 closed |
| TASK-240-QA-7 | ✅ FIXED | The header's accepted-values lines now match the escape rule |
| CR-6 (carried, gate 5) | ✅ DONE | `open-coverage-differential.test.mjs` landed in `22bdc3e9`; CI installs PyYAML, and it ran green on the head |
| Pre-existing CR-2 / CR-3 (gates 2–5) | ✅ FIXED | `22bdc3e9` makes keys case-sensitive and requires whitespace after a flow key's colon |

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:351`: a comment cuts a wrapped plain value, but the
  reader keeps reading. The block prints 1; PyYAML raises ParserError (TASK-240-QA-8,
  [bug.6](./task.240.bug.6.comment-inside-wrapped-value-accepted.md)).
- **[medium]** `shared/resources/open-coverage.js:103`: a value starting with a backtick, `@`, `%`,
  `, ` or `- ` is read as plain text and prints 1; PyYAML rejects each block (TASK-240-QA-9,
  [bug.7](./task.240.bug.7.indicator-leading-value-accepted.md)).
- **[medium]** `shared/resources/tests/open-coverage-differential.test.mjs:163`: the generator cannot
  produce QA-8 or QA-9, so the suite stays green over both (TASK-240-QA-10,
  [bug.8](./task.240.bug.8.differential-generator-misses-shapes.md)).
- **[low]** CR-4: a tab after a key's colon is accepted. CR-5: the floors scale with N, so N=0 passes.
  CR-6: `python3 -I` ignores user site-packages. All three are in `recommendations.future`.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed (4/4)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on the feature branch with open PR #776

### Testing Approach

- [x] Automated Testing (unit, parity, differential, full `ci:fast`)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (scoped diff review, Explore subagent)

### Review Methodology

Direct tools for the re-review, plus one read-only Explore code reviewer over the scoped patch.
The reviewer was dispatched at 16:21:56Z and the result was read at 16:26:36Z (`duration_ms`
236,744).

Re-review scope: files changed since gate 5 (head 0c11216fa157; 12 files) — default.

CI on 22bdc3e9d7f4: green.

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` changed since gate 5.

Traceability mapper: skipped. The Success Criteria are a checkbox list, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Precondition | PASS | Verified | Unchanged since gate 1 |
| Phase 1: The reader | CONCERNS | Partial | BUG-6 and BUG-7 |
| Phase 2: The call site | PASS | Verified | Unchanged since gate 5 |
| Phase 3: Corpus, probe and docs | PASS | Verified | Corpus 0 changes (per `22bdc3e9`); CHANGELOG lists the new refusals |

**Overall Phase Completion**: 4/4 phases complete, 1 with open findings

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 refusal shapes read `unreadable` | CONCERNS | Held for every pinned shape (`open-coverage.test.mjs`); QA-8 and QA-9 are unpinned shapes it misses |
| SC-2 parity suite passes | PASS | `pr-review-loop-parity.test.mjs` green in `ci:fast` |
| SC-3 failing reader reads `unreadable` | PASS | Parity suite stub case, green |
| SC-4 corpus unchanged | PASS | 187 tracked reports, unchanged per `22bdc3e9`'s recorded run. QA measured 168 readable blocks, with 0 hits for any of the cycle 6 shapes |
| SC-5 no new CI wait / process | PASS | One `command node` call at 5c; parity assertion |
| SC-6 `ci:fast` | PASS | 6,660 pass, 0 fail |
| SC-7 `bundle:check` | PASS | 128 skills, 0 problems |
| SC-8 `validate` develop-task, develop-story | PASS | Both ✓ |
| SC-9 guards mutation-proven | PASS | QA spot-checked 2 (below); `22bdc3e9` records all 10 |
| SC-10 CHANGELOG | PASS | `[Unreleased]` cites task 240 |
| SC-11 probe | PASS | Unchanged since gate 5 |

---

## Breaking Changes Validation

None. The 5c block's interface (`OPEN_COVERAGE=<n|unreadable>`) is unchanged.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (3)

**Issue: A comment inside a wrapped plain value is accepted (TASK-240-QA-8)**

- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.240.bug.6.comment-inside-wrapped-value-accepted.md](./task.240.bug.6.comment-inside-wrapped-value-accepted.md)
- **Observation**: `finding: a` / `# c` / `more` prints 1; PyYAML raises ParserError
- **Impact**: the fail-closed contract does not hold. The count is the one the writer meant
- **Recommendation**: refuse a deeper plain line after a comment
- **Priority**: P2

**Issue: A value starting with an indicator is read as plain (TASK-240-QA-9)**

- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.240.bug.7.indicator-leading-value-accepted.md](./task.240.bug.7.indicator-leading-value-accepted.md)
- **Observation**: a value starting with a backtick, `@`, `%`, `, ` or `- ` prints 1; PyYAML rejects each
- **Impact**: same contract breach. The fix must not halt a real review whose finding opens with a code span
- **Recommendation**: refuse under deciding keys; refuse or document a modelled leniency under free text
- **Priority**: P2

**Issue: The differential generator misses both shapes (TASK-240-QA-10)**

- **Severity**: MEDIUM
- **Category**: Quality
- **Bug Report**: [task.240.bug.8.differential-generator-misses-shapes.md](./task.240.bug.8.differential-generator-misses-shapes.md)
- **Observation**: the suite is green while QA-8 and QA-9 reproduce by hand
- **Recommendation**: widen the grammar, then mutation-prove it red on QA-8 and QA-9
- **Priority**: P2

### LOW Severity Issues (3)

CR-4 (tab separator), CR-5 (N=0 vacuity) and CR-6 (`python3 -I` and user site-packages). Each is a
gate `recommendations.future` item.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 3

### Severity basis

Corpus measurement (QA script over `git ls-files '*.pr-review.*.md'`): 187 tracked reports, 168
findings blocks readable by `extractFindingsBlock`. The hits were 0 for an indicator-leading value,
0 for a comment inside a wrapped value and 0 for a tab separator. The reviewer's severities are
kept. The shapes are plausible outputs of review-pr, which is a model writer, so the "no writer
emits it" half of a re-rating does not hold.

---

## NFR Assessment

### Performance — PASS

One linear pass. The differential suite spawns one `python3` per run. `ci:fast` took 132 s in total.

### Reliability — CONCERNS

BUG-6 and BUG-7 give a count to blocks YAML rejects. No misplaced deciding key was found.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`, as on gates 1–5. `countOpenCoverage` reads a pipeline-written review
  report, and no corpus sink models it (`internal_reason`). Its fail-closed property is exercised
  by the PyYAML differential suite. The reader parses text only: no eval, no shell, no write.

### Maintainability — PASS

The header matches the code. The generator gap is tracked as QA-10.

---

## Code Review

The reviewer's findings are blocking under `code_review_blocking=true` (pipeline override). Every
anchor was checked `ok` by `finding-anchors.js` at rev `22bdc3e9`.

**Correctness bugs (6):**

- [medium/high] `shared/resources/open-coverage.js:351`: a comment inside a wrapped plain value is accepted. Promoted as TASK-240-QA-8
- [medium/high] `shared/resources/open-coverage.js:103`: an indicator-leading value is read as plain. Promoted as TASK-240-QA-9
- [medium/high] `shared/resources/tests/open-coverage-differential.test.mjs:163`: the generator misses both shapes. Promoted as TASK-240-QA-10
- [low/medium] `shared/resources/open-coverage.js:75`: a tab after a key colon is accepted (CR-4). Advisory
- [low/medium] `shared/resources/tests/open-coverage-differential.test.mjs:351`: the floors scale with N, so N=0 is vacuous (CR-5). Advisory
- [low/low] `shared/resources/tests/open-coverage-differential.test.mjs:290`: platform variance; `-I` drops user site-packages (CR-6). Advisory

**Cleanups (0).**

All three promoted findings were reproduced by QA: the reader printed 1 on all eight blocks, and
PyYAML 6.0.3 rejected all eight.

**Provenance.** In scope, not pre-existing: the task's purpose is a reader that refuses what it
cannot place. A shape YAML rejects and the reader counts is that defect class.

**Boundary**: `internal`, as recorded above. `probes_executed: 0`, `escaped: 0`.

mutation-proven: `keyIndent` measured → `indent + 2` (bug.5 guard) → `open-coverage.test.mjs` wide-dash cases + parity rows (5 red) → covered
mutation-proven: comment-ends-scalar `cur.deeper = "refuse"` → `"text"` (`22bdc3e9` guard) → 1 test red in the targeted suites → covered

Both mutations were applied to a `cp` snapshot and restored from it. `git status` was unchanged
afterwards.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full `ci:fast` | PASS (6,660 / 0) |
| Bundled copies (develop-task, develop-story) | PASS (`bundle:check`) |
| Skill validation | PASS |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/open-coverage.js`
- `shared/resources/tests/open-coverage-differential.test.mjs`
- `shared/resources/tests/open-coverage.test.mjs`
- `evals/shared/tests/pr-review-loop-parity.test.mjs`

### Test Commands Executed

```bash
npm run ci:fast                       # 6660 pass, 0 fail
npm run bundle:check                  # 0 problems
npm run validate -- skills/develop-task/
npm run validate -- skills/develop-story/
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 776   # green
command node --test shared/resources/tests/open-coverage.test.mjs \
  evals/shared/tests/pr-review-loop-parity.test.mjs \
  shared/resources/tests/open-coverage-differential.test.mjs   # under each mutation
```

### Coverage Report

Not measured. The repository has no coverage tooling for these suites.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-240-QA-8, QA-9 and QA-10, fixed together, generator first, so that each reader fix is
   proven by the suite going red.

### Short-term Actions (Non-Blocking)

1. CR-4, CR-5, CR-6.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH findings. Three medium findings on the fail-closed contract, all reproduced,
none of which changes a routing decision on any tracked report.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-240-QA-8, QA-9 and QA-10 fixed

---

**QA Report**: co-located at `task.240.qa.6.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.6.open-coverage-fail-closed-reader.yml`
**Next Steps**: `/qa-fix` cycle 6, then gate 7, the last of the granted budget.
