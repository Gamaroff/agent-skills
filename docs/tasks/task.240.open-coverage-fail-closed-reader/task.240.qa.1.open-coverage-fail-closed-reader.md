# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.1.open-coverage-fail-closed-reader.yml](./task.240.gate.1.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

The reader, the §5c call site, the harness changes and the bundling all do what the task asked. Every
tracked review report reads the same as before. The new guards are mutation-proven by committed
tests. QA reproduced one regression the diff reviewer reported: two valid YAML shapes that the old
awk read correctly now read `unreadable`. In each, a value under `finding:` wraps onto a deeper line.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (15/15 boxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#776)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, parity, corpus)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore code reviewer (first review, standard mode). The reviewer
was given the branch diff against `origin/develop`, excluding the generated `skills/*/references/`
copies (which `bundle:check` holds equal to their sources) and the task's own documents. It was
dispatched at 14:36:32Z and returned in 106,989 ms (completion notice `duration_ms`).

CI on c054f8f4473e: pending

Step 4b ran `qa-execute-snippets.mjs` over `shared/resources/develop-pipeline-step-5-6-qa-loop.md`,
with `--diff-base` set to the merge base:

- **Changed blocks:** 1 total, 0 executed, 0 runnable, 0 placeholder, 1 mutating.
- **File totals:** 1 runnable, 1 placeholder, 27 mutating.

The one changed block (line 1528) was refused as `unrecognised-command: node, <unparseable>
(fail-closed)`. That is a `changed-blocks-not-executed` finding at medium confidence. It is recorded
under Code Review and does not gate. The same block is executed by the parity suite: 83 tests, which
run it under bash, and under zsh where zsh is installed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Precondition | PASS | Verified | task.238's block is on `origin/develop` |
| Phase 1: The reader | CONCERNS | Partial | Ten reasons, all reachable; BUG-1 refuses two valid wrapped shapes |
| Phase 2: The call site | PASS | Verified | One `command node` call; harness runs from a consumer-shaped cwd |
| Phase 3: Corpus, probe and docs | PASS | Verified | Corpus 0 changes (re-run by QA); CHANGELOG cites task.240 |

**Overall Phase Completion**: 3/4 phases passed outright, 1 with a concern.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 refusals read `unreadable`, counts read right, no skip branch | Every `COVERAGE_CASES`/`RAW_CASES`/`UNREADABLE_CASES` row also asserts `countOpenCoverage` (`pr-review-loop-parity.test.mjs`); QA's skip mutant turned `REFUSED[7]` red | PASS |
| SC-2 parity passes, bash and zsh | 83/83 locally (bash; zsh is not installed on this host). `test.yml:37` installs zsh for CI; this head's CI is still pending | PASS (zsh arm: CI) |
| SC-3 failing reader → `unreadable` | Parity test "a reader that fails → unreadable" (a `node` stub that exits 2 on `PATH`) | PASS |
| SC-4 corpus reads the same | QA re-run: old block (`.claude/state/t240-rv/old.sh`, from `83aacf7b`) vs the committed CLI over `git ls-files '*pr-review.*.md'`, 187 reports, 0 changes | PASS (measured) |
| SC-5 one `node` call, no awk | Parity test "the §5c block runs exactly one `command node` call and no awk" | PASS |
| SC-6 `ci:fast` | Green in Step 3, iteration 2 (6,605 pass) | PASS |
| SC-7 `bundle:check` | Re-run by QA: exit 0 | PASS |
| SC-8 `validate` | Re-run by QA: develop-task, develop-story and qa-fix all exit 0 | PASS |
| SC-9 guards mutation-proven | Recorded in the implementation report (M1–M4) and the commit message; one re-proven by QA (below) | PASS |
| SC-10 CHANGELOG | `CHANGELOG.md` `[Unreleased]` › Changed, first entry, names `open-coverage.js` and task 240 | PASS |
| SC-11 probe | 25 sites listed in the task's Implementation Notes; none describes the awk | PASS |

---

## Breaking Changes Validation

None declared. The printed contract `OPEN_COVERAGE=<n|unreadable>` is unchanged, and consumers
receive the reader through the bundle with no new dependency. BUG-1 is a behaviour change on two
input shapes, and it is tracked as an issue, not as an accepted break.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A wrapped value under a non-deciding key reads unreadable**

- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Bug Report**: [task.240.bug.1.wrapped-value-reads-unreadable.md](./task.240.bug.1.wrapped-value-reads-unreadable.md)
- **Observation**: A plain `finding:` value that wraps onto a deeper line now reads `unreadable` (the awk read `0`). A double-quoted one now reads `unreadable` (the awk read `1`).
- **Provenance**: new to this change. The base block reads both shapes correctly, and the shape is in scope: it is the task's risk #1.
- **Impact**: a false `unreadable` re-runs 5c and then halts a clean run.
- **Recommendation**: treat deeper lines as text under keys outside `category`/`provenance`. Add parity rows for both shapes and for the quoted-key trap.
- **Priority**: P1

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance — PASS

One `node` process at 5c, in place of `sed`, `grep` and `awk`. SC-5 holds it.

### Reliability — CONCERNS

BUG-1. The rest of the failure handling holds: a missing file, a missing heading, an unterminated
fence and a crashed reader all read `unreadable`, never `0`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: internal. The entry is `shared/resources/open-coverage.js#countOpenCoverage`. Its
  only input is the `/review-pr` report, which this pipeline writes. No corpus sink models that
  document: `markdown-structure` models the implementation report, and probing there would score
  every legitimate case as overblocked for being the wrong document.
- The reader only parses text. It has no `eval`, no shell and no file write. Values are compared,
  never executed. The CLI takes the path it reads from argv, never from the report.

### Maintainability — PASS

A documented parser with ten named reasons replaces a 35-line awk program. A test asserts that every
reason is reachable.

---

## Code Review

Advisory except where promoted. Reviewer: one Explore subagent over the branch diff.

**Correctness bugs (1):**

- [medium/medium] `shared/resources/open-coverage.js:153`: a wrapped value under a non-deciding key is refused, so a valid review reads `unreadable`. **Fix:** treat it as text outside `category`/`provenance`. QA reproduced it and promoted it to the gate as **TASK-240-QA-1**. The finding's confidence was not changed: it enters the gate as QA's own reproduced finding.

**Cleanups (2):**

- `shared/resources/tests/open-coverage.test.mjs:239`: the corpus test checks only that at least one `1` and one `unreadable` exist, so a regression on any single report passes. **Fix:** pin a per-file snapshot. Routed to `recommendations.future`.
- `shared/resources/open-coverage.js:338`: a non-Refusal exception reports `bad-line`, the same reason as malformed input. **Fix:** add an `internal-error` reason. Routed to `recommendations.future`.

**Step 4b:**

- `changed-blocks-not-executed` (medium confidence): the changed §5c block at line 1528 was refused, because `command node` is not on the snippet executor's allow-list. The parity suite executes it instead.

Anchors: `finding-anchors.js --rev HEAD` returned `ok` for all three findings.

**Boundary record:** `boundary: internal`, with the reason under Security above. `probes_executed: 0`.

**Mutation proofs (QA, in a scratch worktree of HEAD):**

- mutation-proven: the unplaceable-line refusal in `parseBlock` replaced with `continue` → `refuses (bad-line): REFUSED[7]` and the parity case "a flow sequence on the line after findings:" went red → covered
- A first attempt produced a syntax error, so both suites failed to load. That run counted for nothing (mutation-void) and was redone as above.

The implementation report records the developer's proofs M1–M4, each against committed tests.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `pr-review-current.js` (shared extractor) | 8 tests in `pr-review-current.test.mjs` pass; `qa-fix`'s bundled copy regenerated |
| §5c routing (parity suite) | 83/83 |
| Relationship-assertion lint over the new test file | pass |
| Tracked review corpus (187 reports) | 0 changes |

---

## Test Artifacts

### Files Reviewed

`shared/resources/open-coverage.js`, `shared/resources/pr-review-current.js`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5c,
`shared/resources/tests/open-coverage.test.mjs`, `evals/shared/tests/pr-review-loop-parity.test.mjs`,
`CHANGELOG.md`.

### Test Commands Executed

```bash
command node --test shared/resources/tests/open-coverage.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs shared/resources/tests/pr-review-current.test.mjs tests/relationship-assertion-lint.test.js   # 155/155
npm run validate -- skills/develop-task/    # 0
npm run validate -- skills/develop-story/   # 0
npm run validate -- skills/qa-fix/          # 0
npm run bundle:check                        # 0
git ls-files '*pr-review.*.md' | while read -r f; do bash old.sh "$f" | tail -1; done          # old block
git ls-files '*pr-review.*.md' | while read -r f; do command node shared/resources/open-coverage.js --file "$f"; done   # new
```

### Coverage Report

No coverage tool is configured for `shared/resources` Node modules. Coverage is by reason: all ten
refusal reasons are reached, a test asserts that, and every accepted shape has a case.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-240-QA-1 / BUG-1: accept wrapped values under non-deciding keys, and add parity rows.

### Short-term Actions (Non-Blocking)

1. CR-2: a per-file corpus snapshot.
2. CR-3: an `internal-error` reason.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one reproduced medium regression on valid input. Everything else the task promised holds.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-240-QA-1 fixed

---

**QA Report**: co-located at `task.240.qa.1.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.1.open-coverage-fail-closed-reader.yml`
**Next Steps**: `/qa-fix` cycle 1 for TASK-240-QA-1, then re-review.
