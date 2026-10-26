# QA Report: Task 232 - Probe expected.absent takes bare names; the rule doc says paths

**Task**: [Link to task document](./task.232.probe-expected-path-assertions.md)
**Gate File**: [task.232.gate.1.probe-expected-path-assertions.yml](./task.232.gate.1.probe-expected-path-assertions.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-25
**Testing Completed**: 2026-10-25
**Gate Status**: FAIL

---

## Executive Summary

The change delivers what it planned. Nested `absent` paths, `removed`, one collision helper, ancestor containment and the four docs are in place, and the committed tests are not vacuous (3 of 3 spot mutations go red). Two high findings block it. PR #748's shellcheck check is red on a new fixture. The path grammar accepts `./` and `a/../`, which reintroduce the BUG-13 shape the task set out to prevent. Three medium findings follow: two from the same trailing-separator root, plus an lstat crash and an unprobeable grammar.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (locally; see TASK-232-QA1-1 for CI)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#748, OPEN)

### Testing Approach

- [x] Automated Testing (`security-probe.test.mjs`, 260 tests, in a scratch worktree at the PR head)
- [x] Regression Testing (full `npm run ci` from Step 3; PR checks)
- [x] Security Review (boundary rule; a development-only probe in a scratch worktree)
- [x] Code Review (Step 3b diff review, one Explore subagent, full branch diff)

### Review Methodology

Direct tools plus one diff-review subagent (default strategy: 3 phases, one module, medium risk). The reviewer's duration was 104.9 s (`duration_ms` from its completion notice). First review, so the scope is the whole `origin/develop...HEAD` diff (35 files).

Step 4b: not applicable to the change. `qa-execute-snippets.mjs --diff-base` reports `changed.total: 0` for all four changed `shared/resources/*.md`, because no fenced bash block was touched. `probe-boundary-rule.md` and `security-review-prompt.md` note `no-executable-blocks` for their unchanged blocks.

Test runs and mutations ran in a scratch worktree (`git worktree add --detach` at `8ac12588`), never in the tree the reviewer was reading. The working tree is unchanged by this step except for the files this cycle writes.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first | PASS | Verified | 44 new tests; the red-first record is in the implementation report (37/45 failed on base). The grammar test omits `./` and `a/../` (QA1-2). |
| Phase 2: Engine | CONCERNS | Partial | Helper, containment and lstat are in place. The trailing separator survives `normalize` (QA1-2, QA1-3); lstat errors are rethrown (QA1-4); `isCasePath` is unexported (QA1-5). |
| Phase 3: Docs, bundle, changelog | CONCERNS | Verified | Docs, bundle and CHANGELOG are done. A new fixture fails CI shellcheck (QA1-1). |

**Overall Phase Completion**: 1/3 phases passed clean; 3/3 delivered.

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Grammar accepts nested relative paths and refuses `..`, absolute, `.`, empty, NUL | Refuses every spelling of `.` | `./` and `a/../` accepted | FAIL | QA1-2; held by the grammar test, which lacks these rows |
| A nested `absent` side effect is caught on all five forms | 5/5 | 5/5 | PASS | per-form "nested side effect" tests |
| An `absent` path the fixture creates, or an ancestor, is declined on all five forms | every spelling | `sub/` not declined | FAIL | QA1-3, reproduced end to end |
| `removed`: delete passes, left mismatches, not-created declined (case variant) | yes | yes | PASS | mutations Q1 (14 red) and Q3 (12 red) |
| An ancestor resolving outside is a mismatch, never read through | 5/5 | 5/5 | PASS | mutation Q2 (10 red) |
| task.227's two cleanup cases execute and are accepted under every shell | yes | yes | PASS | the task.227 regression test |

**Performance Criteria:** not applicable, per § 8.

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Every runner routes through `pathAssertionProblem` | mutation-proved | M1: 9 red across all five forms | PASS | dev record, implementation report |
| Each rule mutation-proved | yes | yes | PASS | dev M1–M6; QA re-proved Q1–Q3 |
| `npm run ci` passes with `.agents/skills` aside | exit 0 | exit 0 locally, but `lint:shell` could not see the untracked fixtures; PR shellcheck red | FAIL | QA1-1 |
| `bundle:check` clean, no `UNREACHED` | clean | clean (128 skills) | PASS | |

**Migration:** the four docs and CHANGELOG are present (PASS). `probe-boundary-rule.md` § 5 states the grammar. Once QA1-2 is fixed, the grammar sentence must name the trailing-separator rule.

---

## Breaking Changes Validation

### Breaking Change: `shell:` / `shell-fn:` compare `absent` case-folded
Documented: Yes (CHANGELOG, § 5)
Migration Path Provided: Yes — none needed for the committed corpus, which has no case-variant names
Migration Tested: Yes — the per-form created-path tests
Consumer Code Updated: N/A
Notes: The narrowing only declines more.

### Breaking Change: the fence decline text changes
Documented: Yes (CHANGELOG)
Migration Path Provided: Yes — TASK-180-004's regex updated
Migration Tested: Yes
Consumer Code Updated: Yes

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (2)

**Issue: New shell-fn fixture has no shell directive; PR shellcheck red (TASK-232-QA1-1)**
- **Severity**: HIGH
- **Category**: Quality
- **Bug Report**: [task.232.bug.1.path-actions-lib-no-shell-directive.md](./task.232.bug.1.path-actions-lib-no-shell-directive.md)
- **Observation**: SC2148 (error) at `path-actions-lib.sh:1`. `bash scripts/lint-shell.sh` exits 1. The Step 3 local `npm run ci` ran while the fixtures were untracked, and `lint-shell` reads `git ls-files`.
- **Impact**: A required check is red, so the PR cannot merge.
- **Recommendation**: Add `# shellcheck shell=bash` on line 1.
- **Priority**: P1

**Issue: `isCasePath` accepts `./` and `a/../` (TASK-232-QA1-2)**
- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.232.bug.2.case-path-trailing-dot-slash-accepted.md](./task.232.bug.2.case-path-trailing-dot-slash-accepted.md)
- **Observation**: `expectedProblem({stdout:"",absent:["./"]})` returns `null`, and so does `a/../`. Both resolve to the case directory, which always exists. Base refused both.
- **Impact**: Under such a path, every run scores as a side effect (the BUG-13 shape).
- **Recommendation**: Strip trailing separators before the `.` and `..` tests, and add the rows to the grammar test.
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: A trailing slash skips the collision decline (TASK-232-QA1-3)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.232.bug.3.trailing-slash-skips-collision-decline.md](./task.232.bug.3.trailing-slash-skips-collision-decline.md)
- **Observation**: Through `runProbeSpec` with `shell-argv:` and `non-remover.sh`, `absent: ["sub"]` is declined, but `absent: ["sub/"]` executes and scores `sub/ was created`.
- **Recommendation**: One shared normaliser that strips trailing separators, used by both the grammar and the helper.

**Issue: `casePathState` throws on ELOOP / EACCES (TASK-232-QA1-4)**
- **Severity**: MEDIUM
- **Category**: Reliability
- **Bug Report**: [task.232.bug.4.case-path-state-throws-on-eloop-eacces.md](./task.232.bug.4.case-path-state-throws-on-eloop-eacces.md)
- **Observation**: `compareExpected` throws `ELOOP` (`loop -> loop`) and `EACCES` (a mode-000 ancestor). Base returned a result for both.
- **Recommendation**: Report the path as an unreadable mismatch instead of throwing.

**Issue: The path grammar is unreachable by the probe (TASK-232-QA1-5)**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.232.bug.5.case-path-grammar-not-probeable.md](./task.232.bug.5.case-path-grammar-not-probeable.md)
- **Observation**: `isCasePath` is module-private, so `probes_executed` is 0. A development-only probe (export added in a scratch worktree, `--sink path`) executed 11 cases: 6 hostiles rejected, and `encoded-traversal` and `symlink-escape` accepted, both handled downstream.
- **Recommendation**: Export it, and probe it in cycle 2 with a cases file that records the two downstream-handled hostiles.

### LOW Severity Issues (0)

**Total Issues**: HIGH: 2, MEDIUM: 3, LOW: 0

---

## NFR Assessment

### Performance — PASS
One `lstat` and one `realpath` per asserted path. No change to the spawn budget.

### Reliability — CONCERNS
A probed run can crash the probe through `ELOOP` or `EACCES` (QA1-4).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: reasoned
- **Probes executed**: 0 (the scratch probe's 11 are development-only and not counted)
- Ancestor containment holds on all five forms (mutation Q2). The grammar admits two spellings of the case directory (QA1-2). The boundary is unreachable by the engine (QA1-5).

### Maintainability — CONCERNS
The PR shellcheck check is red (QA1-1). Otherwise four inline collision copies became one helper, as the task intended.

---

## Code Review

Step 3b ran with `code_review_blocking=true` from the pipeline, and the task's frontmatter does not opt out.

`boundary: true` — `isCasePath` (`shared/resources/security-probe.mjs:2114`) is a path-containment predicate. `probes_executed: 0`, `escaped: 0` (no committed entry reaches it; see QA1-5). `casePathState` and `pathAssertionProblem` are the boundary's second layer and its collision rule. Neither fits a corpus sink as a single-argument call, and both are covered by the per-form tests and mutations Q1–Q2.

**Correctness bugs (3):**
- [high/high] `shared/resources/security-probe.mjs:2119` — `path.normalize` keeps a trailing separator, so `./` and `a/../` pass the `.` check and resolve to the case directory → strip trailing separators first. **Promoted: TASK-232-QA1-2.**
- [medium/high] `shared/resources/security-probe.mjs:2140` — a trailing slash survives, so `absent: ["dir/"]` skips the fixture-collision decline → normalise both sides the way the scorer resolves them. **Promoted: TASK-232-QA1-3.**
- [medium/medium] `shared/resources/security-probe.mjs:1222` — lstat errors other than ENOENT/ENOTDIR are rethrown and crash the probe → map them to a reported state. Not promoted by the blocking rule (medium confidence). **Entered by QA as TASK-232-QA1-4 after reproducing it.**

**Cleanups (0).**

Provenance (5b): all three reproduce on head and not on base (`git show origin/develop:shared/resources/security-probe.mjs`). On base, `./` and `a/../` are refused by the separator-free rule, and `existsSync` never throws. None is pre-existing.

Platform variance: no environment-derived value reaches a validating consumer in the diff. The containment tests build their outside target from the case directory's own symlink, so they do not depend on `os.tmpdir()`.

Mutation proofs (scratch worktree, snapshot and restore, restored byte-identical):

```
mutation-proven: removed-not-created rule disabled → 14 tests red, incl. "pathAssertionProblem: removed must name a path the fixture creates, matched exactly" and all five forms' "removed path the fixture does not create is declined" → covered
mutation-proven: ancestor-outside check disabled → the containment test on all five forms red (10 incl. subtests) → covered
mutation-proven: removed comparison key renamed (removed never read) → 12 red, incl. all five forms' "removed path the run leaves is a mismatch" and the obs #176 control → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (all forms) | PASS — 260/260 in the scratch worktree at `8ac12588` |
| Full `npm run ci` (Step 3, symlink aside) | PASS, but `lint:shell` read a tree without the new fixtures |
| PR #748 checks | shellcheck FAIL; link-check, secret-scan, test, validate PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, the seven new fixtures, the four changed docs and their bundled copies, and `CHANGELOG.md`.

### Test Commands Executed
```bash
git worktree add --detach <scratch>/t232-probe-wt HEAD
node --test --test-reporter=spec shared/resources/tests/security-probe.test.mjs   # baseline, exit 0
node <scratch>/t232-qa-mutate.mjs <worktree>                                      # Q1–Q3
node <scratch>/t232-trailing-e2e.mjs shared/resources/security-probe.mjs "$PWD"   # QA1-3
node <scratch>/t232-eloop.mjs shared/resources/security-probe.mjs                 # QA1-4, head and base
node shared/resources/security-probe.mjs --sink path --entry 'shared/resources/security-probe.mjs#isCasePath' --json   # scratch export, dev-only
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <doc> --diff-base <merge-base> --copy-as skills:.agents/skills --json
bash scripts/lint-shell.sh                                                        # exit 1, SC2148
```

Standards-named validation: `npm run validate:all` ran inside Step 3's `npm run ci` (128 skills, 0 failed). The PR's `validate` check passes.

### Coverage Report
Not measured. The repository's node test runner has no coverage lane for `shared/resources`.

---

## Recommendations

### Immediate Actions (Blocking)
1. QA1-1: add a shell directive to `path-actions-lib.sh` (P1).
2. QA1-2 and QA1-3: one normaliser that strips trailing separators, used by `isCasePath` and `pathAssertionProblem`, with grammar and per-form rows (P1).
3. QA1-4: report unreadable paths instead of throwing (P2).
4. QA1-5: export the grammar predicate so cycle 2 can probe it (P2).

### Short-term Actions (Non-Blocking)
1. Run `scripts/lint-shell.sh` after `git add`, not before. The Step 3 green came from a tree in which the gate could not see the new files.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Two high findings (a red required check; a grammar hole that reintroduces BUG-13) and three medium findings, all reproduced.
**Quality Score**: 30/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.232.qa.1.probe-expected-path-assertions.md`
**Gate File**: co-located at `task.232.gate.1.probe-expected-path-assertions.yml`
**Next Steps**: `/qa-fix` for QA1-1 to QA1-5, then QA cycle 2 (a refute pass over the whole diff).
