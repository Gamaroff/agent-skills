# QA Report: Task 330 - isDocsPath refuses the NTFS .git stream and C1 controls

**Task**: [Link to task document](./task.330.docs-path-stream-and-c1-refusals.md)
**Gate File**: [task.330.gate.1.docs-path-stream-and-c1-refusals.yml](./task.330.gate.1.docs-path-stream-and-c1-refusals.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-27
**Testing Completed**: 2026-11-27
**Gate Status**: PASS

---

## Executive Summary

QA covered the full branch diff of PR #961 against `develop` at head `1de74ff6c8d7`. `isDocsPath` now reads a `.git:` alternate-stream segment and a C1 control as code, and `docs/a:b.md` stays documentation. All three mutations in § 8 turn a committed test red. The probe engine engages on all 26 `git-name` cases, and the diff review returned no findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (8 of 8 boxes)
- [x] Tests passing
- [x] Breaking changes documented (CHANGELOG `[Unreleased]`)
- [x] Code on the feature branch with an open PR (#961)

### Testing Approach

- [x] Automated Testing (unit and suite)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review

### Review Methodology

- **Approach**: direct tools; small task (3 phases, low risk, first review).
- **Diff review**: code review route, one read-only Explore subagent. Dispatched 11:58:09Z. Completion notice `duration_ms` 129973.
- **Reviewer scope**: the reviewer read the source diff without the 16 bundled `skills/*/references/` copies, because `npm run bundle:check` (0 problems) proves those equal their sources.
- **Step 4b**: not applicable. The one changed in-scope shared `.md` (`security-input-corpus.md`) has no bash fences.
- **CI**: `CI_SUMMARY=CI on 1de74ff6c8d7: green`

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :-- | :-- | :-- | :-- |
| Phase 1: refusals (fold, `\p{Cc}`, anchors, mutation rows) | PASS | Verified | `ci-tree-equivalence.js:141` `:` fold; `:187` `\p{Cc}`; `IS_DOCS_LINES` plus the `dotGitStream` row |
| Phase 2: corpus wording (`plus-signs`, `control-char`) | PASS | Verified | `c++` literal case pinned in `ci-tree-equivalence.test.mjs` |
| Phase 3: deferred wording, CHANGELOG, bundle | PASS | Verified | bracket message, runbook, CHANGELOG; `bundle:check` clean |

**Overall Phase Completion**: 3 of 3 phases passed.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| :-- | :-- | :-- |
| Every row of the § 8 table holds in a test | PASS | The four `task.330:` tests in `ci-tree-equivalence.test.mjs`, plus the corpus cases `dot-git-stream`, `dot-git-stream-name`, `c1-control` and `colon-name` probed by `security-probe.test.mjs` "isDocsPath through the git-name sink engages" |
| `isDotGitSegment` has no new caller | PASS | `git grep -n isDotGitSegment -- shared/resources ':!shared/resources/tests'` prints the definition (`:138`), a comment (`:167`) and its one call in `isDocsPath` (`:197`) |
| Performance: not applicable | PASS | No bound is claimed |
| Every mutation in § 8 is recorded in the QA report with the test it turned red | PASS | § Code Review below: three `mutation-proven` lines, each naming its red tests |
| `npm run test:remote` and `npm run bundle:check` pass | PASS | `ci:fast` on the LAN server: 8955 tests, 0 fail (Step 3, run 2). `bundle:check`: 129 skills, 0 problems. CI is green on the head |
| CHANGELOG names both § 5 changes and the openers `@(`, `!(`, `+(` | PASS | `CHANGELOG.md` `[Unreleased]`: the task 330 entry and the task 325 exclusion bullet |
| The bracket message and the runbook say to write `[`/`]` as `?` | PASS | `ci-tree-equivalence.js` UsageError, held by the `task.330:` bracket-message test; `docs/runbooks/ci-docs-only-skip.md` |

- Criteria drift: `clean` against the review commit.
- CHANGELOG citation: `cites (task 330)`.
- Probe-boundary signals: none.

---

## Breaking Changes Validation

### Breaking Change: `.git:` stream segment and C1 control are code

- Documented: Yes (CHANGELOG `[Unreleased]`)
- Migration path provided: Yes. Nothing is needed; the pipelines wait for CI more, never less.
- Consumer code updated: N/A

### Breaking Change: a C1 exclusion in `ci.docsOnly.patterns` is a usage error

- Documented: Yes ("remove the character")
- Migration path provided: Yes
- Migration tested: Yes. The `task.330:` readConfig test asserts the exit-2 error names `ci.docsOnly.patterns`.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS

There is one more regex replace per path segment, and no bound is claimed.

### Reliability — PASS

The change is fail-safe only. A refused spelling is code, so the pipeline waits for CI.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 26 (`totals.executed` in `task.330.qa.1.security.run.json`)
- **Escaped**: 0
- `boundary: true`. The run below returned verdict `engages`, with 0 reproduced, 0 overblocked and 0 declined:

  ```
  security-probe.mjs --sink git-name --entry 'shared/resources/ci-tree-equivalence.js#isDocsPath' --args-json '[["**"]]'
  ```

- `boundary_signals: []`

### Maintainability — PASS

`IS_DOCS_LINES` holds one spelling per refusal, and its comment is corrected (T329-QA-10). The corpus tables are generated and asserted verbatim.

---

## Code Review

**Correctness bugs (0):** none.

**Cleanups (0):** none.

The reviewer read every code hunk against the working tree and ran the three suites in a `mktemp` directory. It confirmed that a C0-only scratch mutant fails the C1 readConfig test, that the `:` fold anchor occurs exactly once, and that the fold order matches git's NTFS check. It also checked the C0-only regexes in `select-next.mjs` and `clean-checkout-base.mjs`: they are not docs-path classifiers, so they are out of scope.

`boundary: true` (`isDocsPath`); `probes_executed: 26`; `escaped: 0`.

Mutation proofs were run one at a time on `shared/resources/ci-tree-equivalence.js`:

- The file was snapshotted with `cp` before each.
- Each edit was confirmed applied with `cmp` against the snapshot.
- Each restore was confirmed with an empty `cmp`. `git status --porcelain` was unchanged, and the file equals `HEAD`.
- The baseline re-run between mutations was green: 452 of 452.

```
mutation-proven: control class narrowed to C0+DEL ([\u0000-\u001f\u007f]) → "task.330: a `.git:` stream segment and a C1 control are code; a colon elsewhere is not", "task.330: readConfig refuses an exclusion holding a C1 control, naming the key", plus task.329 "isDocsPath through the git-name sink engages at HEAD" and "each isDocsPath refusal removed reproduces exactly its git-name cases" → covered
mutation-proven: fold applied to every segment (segment.includes(":") refused) → "task.330: a `.git:` stream segment and a C1 control are code; a colon elsewhere is not", plus task.329 "engages at HEAD" (colon-name overblocked) and "each isDocsPath refusal removed reproduces exactly its git-name cases" → covered
mutation-proven: `:` fold removed (replace made a no-op) → "task.330: a `.git:` stream segment and a C1 control are code; a colon elsewhere is not", plus task.329 "engages at HEAD" and "each isDocsPath refusal removed reproduces exactly its git-name cases" → covered
```

The `:`-fold removal is also the committed `dotGitStream` row of `GIT_NAME_MUTATIONS`. That row reproduces exactly `dot-git-stream` and `dot-git-stream-name`.

---

## Regression Testing

| Area | Result |
| :-- | :-- |
| `ci-tree-equivalence.test.mjs`, `security-probe.test.mjs`, `security-input-corpus.test.mjs`, `push-policy.test.mjs` | PASS: 521 of 521 |
| Full `ci:fast` (LAN server) | PASS: 8955 tests, 0 fail |
| `npm run validate -- skills/<s>/` for the 9 skills whose `references/` changed | PASS: all exit 0 |

---

## Test Artifacts

### Test Commands Executed

```bash
command node --test shared/resources/tests/ci-tree-equivalence.test.mjs shared/resources/tests/security-probe.test.mjs shared/resources/tests/security-input-corpus.test.mjs shared/resources/tests/push-policy.test.mjs
npm run test:remote
npm run bundle:check
npm run validate -- skills/<skill>/   # develop-batch develop-bug develop-next develop-story develop-task finalise qa-story qa-task review-security
command node .agents/skills/qa-task/references/security-probe.mjs --sink git-name --entry 'shared/resources/ci-tree-equivalence.js#isDocsPath' --args-json '[["**"]]' --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.330.docs-path-stream-and-c1-refusals/task.330.qa.1.security.run.json --json
```

### Coverage Report

No coverage tool is configured for `shared/resources/`, so mutation proofs stand in for coverage.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is verified from evidence. All three mutations are covered, the probe is measured and engages, and the review returned no findings.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c PR conformance review (`/review-pr`), then `/finalise`.
