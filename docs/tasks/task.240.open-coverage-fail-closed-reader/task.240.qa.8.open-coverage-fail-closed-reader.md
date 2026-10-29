# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.8.open-coverage-fail-closed-reader.yml](./task.240.gate.8.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 8 is the first gate on the allow-list reader (`149f9235`), which reads one line per key over
an allowed character set, and on cycle 7's fix (`443e4f6d`). BUG-9 and BUG-10 are verified fixed.
The parser held under every probe: 54 hand shapes and 5 new differential seeds found 0 wrong
counts. One medium remains, and it is in the CLI, not the parser: an invalid UTF-8 byte is decoded
to U+FFFD, and the block still counts where PyYAML refuses to read it (BUG-11).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Previous finding | Gate | Status | Evidence |
| --- | --- | --- | --- |
| TASK-240-QA-11 (BUG-9): a whitespace-only line holding a tab is skipped as blank | 7 | ✅ FIXED | Both bug.9 shapes read `unreadable` (`bad-line`, U+0009). `BLOCK_CHARS` refuses a tab anywhere |
| TASK-240-QA-12 (BUG-10): a plain flow value holding a bracket is accepted | 7 | ✅ FIXED | Flow entries are refused outright (`bad-line`, "a flow entry"). A quoted bracket in a block value still counts 1 |
| TASK-240-QA-13 (low): the flow generator emits no bracket | 7 | ✅ FIXED | Moot: the generator was re-aimed at characters and one-line value forms, and the reader refuses flow entries |

BUG-9 and BUG-10 are closed (Status History rows added by `status-history.js`).

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:310`: the CLI decodes the report leniently.
  An invalid byte becomes U+FFFD, which passes `BLOCK_CHARS`, so a block PyYAML rejects
  (`ReaderError`) prints a count. Fix: decode with `TextDecoder("utf-8", { fatal: true })` and
  read a failure as `unreadable` (BUG-11, TASK-240-QA-14).
- **[low, cleanup]** `shared/resources/tests/open-coverage-differential.test.mjs:18`: the header
  still describes the `lenientFreeText` reference, which no longer exists. Routed to `future`.
- **[low, cleanup]** `shared/resources/open-coverage.js:313`: an unreadable file reports
  `no-section`, and an internal error reports `bad-line`. Carried from gate 7. Routed to `future`.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4)
- [x] Tests passing
- [x] Breaking changes documented (none to consumers; parity amendments are author-approved)
- [x] Code on the feature branch with open PR #776

### Testing Approach

- [x] Automated Testing (unit, parity, differential, full fast gate)
- [x] Regression Testing (tracked corpus)
- [x] Security Review (boundary classification)
- [x] Code Review (Step 3b, one Explore reviewer)
- [x] Manual probing (54-shape hand probe against PyYAML)

### Review Methodology

Direct tools plus one read-only Explore reviewer for Step 3b (a re-review, so no parallel agents).
The reviewer was dispatched at 17:41:46Z and returned at 17:48:31Z (`duration_ms` 376,663).
Mutation proofs ran in a scratch worktree, never in the tree the reviewer was reading.

`CI on afccc7883d3e: green`

Re-review scope: files changed since gate 7 (head 5f69c201f78f; 16 files) — default

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` file is in this cycle's change
set.

Traceability mapper: skipped. The Success Criteria are a checkbox list, not a table.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Precondition | PASS | Verified | task.238 merged; the §5c `OPEN_COVERAGE=$(` site is on `origin/develop` at `:1556` |
| Phase 1: The reader | CONCERNS | Partial | The parser holds. The CLI's decode is lenient (BUG-11) |
| Phase 2: The call site | PASS | Verified | Parity suite green, one `command node` call, no `awk` |
| Phase 3: Corpus, probe and docs | PASS | Verified | Corpus re-measured; bundle fresh; CHANGELOG cites task.240 |

**Overall Phase Completion**: 4/4 phases complete, 1 with an open finding

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| SC-1: refusals read `unreadable`, counts read their count; no skip branch | all rows | all rows | PASS | `open-coverage.test.mjs` plus parity, 215 pass. Mutation M-B (keyIndent check dropped) reds 6 |
| SC-2: parity under bash and zsh, no count-to-count change | pass | pass | PASS | Parity suite green in `ci:fast`. zsh is not installed on this host; CI's zsh lane is green on `afccc788` |
| SC-3: a failing reader reads `unreadable` | unreadable | unreadable | PASS | The parity suite's `node`-stub case, green |
| SC-4: the tracked corpus reads the same | 0 changes | distribution identical | PASS | 187 reports: 0×128, 1×35, 2×5, unreadable×19, the same distribution the implementation report records |
| SC-5: one `node` call at 5c, no new CI wait | 1 call | 1 call | PASS | The parity assertion, green |
| SC-6: `npm run ci:fast` | pass | 6,705 pass, 0 fail | PASS | `.claude/state/t240-qa8-cifast.log` |
| SC-7: `npm run bundle:check` | 0 problems | 0 problems | PASS | 128 skills checked. The bundled copies differ from the source only by the generated header |
| SC-8: `validate` for develop-task and develop-story | pass | pass | PASS | Both exit 0 |
| SC-9: every new guard mutation-proven | all | 4 of 4 spot-checked | PASS | See Code Review |
| SC-10: CHANGELOG cites task.240 | yes | yes | PASS | `[Unreleased]` entry |
| SC-11: the phrase probe lists every site | yes | yes | PASS | No file in this cycle's scope describes the awk |

The fail-closed property that SC-1 and the Target Architecture state ("anything the parser cannot
place is a refusal") does not hold at the CLI boundary: see BUG-11.

---

## Breaking Changes Validation

### Breaking Change: the one-line grammar now refuses flow, nested, block-scalar and wrapped shapes

Documented: Yes (Target Architecture amendment and SC-2, author-approved 2026-10-28)
Migration Path Provided: Yes. A writer quotes the free text. No tracked report uses those shapes
Migration Tested: Yes. Corpus distribution unchanged
Consumer Code Updated: N/A. The printed contract `OPEN_COVERAGE=<n|unreadable>` is unchanged
Notes: Known follow-up, out of scope: review-pr's template writes `finding:` unquoted.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: an invalid UTF-8 byte is decoded leniently and still counts**
- **Severity**: MEDIUM (as the reviewer returned it, kept)
- **Category**: Functional (fail-closed contract)
- **Bug Report**: [task.240.bug.11.invalid-utf8-decoded-leniently.md](./task.240.bug.11.invalid-utf8-decoded-leniently.md)
- **Observation**: `note: a\xffb` inside an entry prints `OPEN_COVERAGE=1`. PyYAML 6.0.3 raises `ReaderError: unacceptable character #x00ff`.
- **Impact**: the count matches what the writer meant, but a printed count is no longer always one YAML would read. Corpus: 0 of 187 reports hold invalid UTF-8.
- **Provenance**: the task scopes this class in ("prints `unreadable` for any shape it cannot read"), so the finding stays in `top_issues[]` and is not routed as pre-existing.
- **Recommendation**: a fatal `TextDecoder`, a CLI test, and a mutation proof.
- **Priority**: P2

### LOW Severity Issues (2)

- CR-2: the differential test header describes the removed `lenientFreeText` reference.
- CR-3: an unreadable file and an internal error share reasons with malformed input.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

One linear pass and one `node` call at 5c. A differential run at N=25,000 takes about 15 s.

### Reliability — CONCERNS

BUG-9 and BUG-10 are fixed. BUG-11 leaves one input class that prints a count YAML would not
read.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: internal`. `internal_reason`: `shared/resources/open-coverage.js#countOpenCoverage`
  reads a `/review-pr` report, an artefact this pipeline writes, and no corpus sink models that
  document. `markdown-structure` models the implementation report. A `filename`-sink run against
  the CLI (14 executed) scored that sink's own contract, cycle-number parsing, which says nothing
  about this reader, so its record was discarded. Text parsing only: no eval, no shell, no write.

### Maintainability — PASS

The header, the CHANGELOG and the task's Target Architecture describe the one-line grammar the
code implements. CR-2 is a stale test comment.

---

## Code Review

Reviewer: one Explore subagent over the scoped patch (16 files). It also ran its own
350,000-block check against PyYAML: 14,306 blocks got a count, and 0 disagreed.

**Correctness bugs (1):**
- [medium/high] `shared/resources/open-coverage.js:310`: lenient UTF-8 decode; U+FFFD passes `BLOCK_CHARS`, so a block PyYAML rejects gets a count. Use a fatal `TextDecoder` → promoted to `top_issues[]` as TASK-240-QA-14 (`code_review_blocking`).

**Cleanups (2):**
- `shared/resources/tests/open-coverage-differential.test.mjs:18`: the header still describes `lenientFreeText`, which no longer exists. Reword it.
- `shared/resources/open-coverage.js:313`: an unreadable file reads `no-section`, and an internal error (line 295) reads `bad-line`. Give each its own reason.

All three anchors verified (`finding-anchors.js`, `reason: ok`).

`boundary: internal`, with the reason recorded under Security. Predicate-shaped functions in the
diff: `value`, `quoted`, `parseBlock`, `checkChars` and `countOpenCoverage`. All of them are
internal to the one entry, and all take the same review-report input.

Hand probe (54 shapes, the reader and PyYAML side by side): 0 wrong counts, 8 over-refusals
(`~`, a `...` document end, a deeper continuation, a multi-line quoted value, a zero-width space,
a no-break space, a private-use character, a `%YAML` directive). All are fail-closed and allowed.

Differential suite at new seeds, N=25,000 each: 3, 17, 777, 8080 and 31337, all green.

mutation-proven: `BLOCK_CHARS` widened to admit tab and U+00A0 → `open-coverage.test.mjs` (3 red) → covered
mutation-proven: keyIndent placement check dropped → unit and parity (6 red) plus differential (1 red) → covered
mutation-proven: plain-value `: ` refusal dropped → unit and parity (6 red) plus differential (1 red) → covered
mutation-proven: plain-value first-character check dropped → unit and parity (16 red) plus differential (1 red) → covered

All four ran in a detached scratch worktree, restored with `cp`, and the baseline was 215/0
before and after.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Tracked corpus (187 `*.pr-review.*.md`) | PASS: distribution identical |
| `pr-review-current.js` extractor | PASS: its suite is green in `ci:fast` |
| Full fast gate | PASS: 6,705 pass, 0 fail |
| PR CI on `afccc788` | PASS: green |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/open-coverage.js` (all 332 lines)
- `shared/resources/tests/open-coverage.test.mjs`, `shared/resources/tests/open-coverage-differential.test.mjs`
- `evals/shared/tests/pr-review-loop-parity.test.mjs` (the changed hunks)
- `skills/develop-task/references/open-coverage.js`, `skills/develop-story/references/open-coverage.js` (bundled copies)

### Test Commands Executed

```bash
npm run ci:fast                                    # 6705 pass, 0 fail
npm run bundle:check                               # 0 problems
npm run validate -- skills/develop-task/           # pass
npm run validate -- skills/develop-story/          # pass
OPEN_COVERAGE_DIFF_SEED={3,17,777,8080,31337} OPEN_COVERAGE_DIFF_N=25000 \
  command node --test shared/resources/tests/open-coverage-differential.test.mjs   # 5 x pass
git ls-files '*pr-review.*.md' | while read f; do command node shared/resources/open-coverage.js --file "$f"; done | sort | uniq -c
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 776   # green
```

### Coverage Report

No line-coverage tooling for this module. The differential suite and the mutation proofs stand in
for it.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-240-QA-14 (BUG-11): a fatal UTF-8 decode in the CLI, with a CLI test and a mutation proof.

### Short-term Actions (Non-Blocking)

1. CR-2: reword the differential test header.
2. CR-3: separate reasons for an unreadable file and an internal error.
3. Quote `finding:` and `suggested_action:` in the review-pr template (carried follow-up).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium (TASK-240-QA-14), and no HIGH. The allow-list parser found no wrong
count under any probe this cycle. The remaining defect is in the decode at the CLI boundary.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-240-QA-14 fixed

---

**QA Report**: co-located at `task.240.qa.8.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.8.open-coverage-fail-closed-reader.yml`
**Next Steps**: qa-fix cycle 8 for BUG-11. A ninth gate then reads the fix.
