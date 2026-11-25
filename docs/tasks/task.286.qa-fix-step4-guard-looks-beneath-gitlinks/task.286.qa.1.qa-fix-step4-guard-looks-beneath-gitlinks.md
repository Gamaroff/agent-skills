# QA Report: Task 286 - qa-fix Step 4 guard looks beneath gitlinks

**Task**: [Link to task document](./task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md)
**Gate File**: [task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml](./task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-20
**Testing Completed**: 2026-11-20
**Gate Status**: PASS

---

## Executive Summary

The Step 4 guard in `skills/qa-fix/SKILL.md` now looks inside every gitlink at or beneath a changed directory, strips a trailing slash before the inside test, and documents the external-symlink route as refused. All four success criteria are held by committed tests. Two low findings reproduced and stay advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes: none
- [x] Code on feature branch with open PR (#927)

### Testing Approach

- [x] Automated Testing (47 tests, bash and zsh)
- [x] Security Review (probe engine, fence form)
- [x] Code Review (diff reviewer, one subagent)
- [x] Regression Testing

### Review Methodology

Direct tools plus one read-only diff reviewer (Step 3b). Diff review: code review. First review, so the whole branch diff. Step 4b: the one changed block was classified `mutating` and not executed (`changed-blocks-not-executed`); its behaviour is held by the committed scenarios and the probe run below.

CI on 66db2d02bb09: pending

Reviewer time: dispatched 2026-11-20, returned in 27.7 s (completion notice `duration_ms`).

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: reproduce and decide | PASS | Verified | CR-1 reproduced (four red scenarios); CR-3 did not reproduce and is documented |
| Phase 2: fix CR-1 and CR-2 | PASS | Verified | gitlink look, `TOPP` strip |
| Phase 3: tests and mutants | PASS | Verified | one admitted, four refused, four mutants, one `TOP=/` test |
| Phase 4: docs and changelog | PASS | Verified | prose paragraph, CHANGELOG `[Unreleased]` |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

**Functional Criteria:**

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Directory over a gitlink holding an untracked file is refused in bash and zsh | refused | refused | PASS | REFUSED scenarios `gitlink-under-dir`, `-trailing-slash`, `-from-subdirectory`, `-not-checked-out` in `tests/qa-fix-step4-guard.test.js` |
| Directory over a clean checked-out gitlink is admitted | admitted | admitted | PASS | ADMITTED `clean-gitlink-under-dir` |
| CR-3 route behaves as decided | refused, documented | refused, documented | PASS | existing CR-3 test; prose paragraph |
| Inside test works when `TOP` is `/` | works | works | PASS | standalone CR-2 test runs old and new line under both shells |

**Code Quality Criteria:**

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Each new clause has a mutant that reds a committed test | yes | yes (one fallback excepted) | PASS | see Code Review |
| `validate` and `ci:fast` pass | pass | pass | PASS | `npm run validate -- skills/qa-fix/` clean here; Prettier clean; `ci:fast` exit 0 on the LAN server per the implementation report |
| CHANGELOG entry citing (task 286) | present | present | PASS | `changelog-cites.sh`: `cites (task 286)` |

**Criteria drift:** `criteria-drift.js` reports `clean`.

**Record criteria:** `record-criteria.json` lists none.

---

## Breaking Changes Validation

None documented, none introduced. The guard is stricter only for an input it previously admitted wrongly.

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (2, advisory)

- Nested gitlink not looked into (below, CR-1).
- Non-ASCII gitlink path over-refused (below, CR-2).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
One `ls-files` per changed directory, once per fix cycle.

### Reliability — PASS
Fails closed on `ls-files` failure, a gitlink not checked out, and an unreadable listing.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 36
- `boundary: true`. `boundary_signals: ['fail-closed', 'is refused']`. Run record: `task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.security.run.json` (`executed 36, reproduced 0, escaped 0`; 36 passed under bash and zsh, 0 overblocked, 0 declined). Command: `command node .agents/skills/qa-task/references/security-probe.mjs --sink filename --entry 'fence:skills/qa-fix/SKILL.md#Step 4: Validate' --slot '{changed-paths}' --cases-file task.286.dod.1.security.cases.json --repo-root "$PWD" --record ... --json`.
- Limit: the cases fixture holds text files only, so it cannot hold an index gitlink. The true gitlink false clean is held by the Node scenarios.

### Maintainability — PASS
The prose and the test constants (`INSIDE_LINE`, `COMPARE_CLAUSE`, `NEST_CLAUSE`) name the same clauses.

---

## Code Review

Diff review: code review. Reviewer returned 2 findings, both `confidence: low`, so neither gates the build (`code_review_blocking=true` promotes only `bug` at `high`).

**Correctness bugs (1):**
- [low/low] `skills/qa-fix/SKILL.md:945` ⚠️ unverified anchor (text-mismatch; reviewer said 946, the line is 945) — the look inside a gitlink lists only that repository's own untracked files and does not descend into a gitlink nested inside it. **QA reproduced it**: with an outer repo, a submodule `pkg/sm` and a submodule `in` inside it holding `untracked.txt`, `git -C pkg/sm ls-files --others --exclude-standard` prints nothing, and `git -C pkg/sm/in ...` prints `untracked.txt`. Control: the one-level case is refused by the committed `gitlink-under-dir` scenario. **Provenance (5b): pre-existing.** On the base there was no gitlink look at all, so this input read clean there too, and a gitlink inside a gitlink is outside the task's named shape (a gitlink beneath a changed directory). Routed to `recommendations.future`, not `top_issues[]`.

**Cleanups (1):**
- `skills/qa-fix/SKILL.md:940` ⚠️ unverified anchor (text-mismatch; reviewer said 942) — `git ls-files -s` C-quotes non-ASCII paths, so `cd -P` fails and a clean checked-out gitlink is refused as "not checked out". **QA reproduced it** (`git ls-files -s -- pkg` prints `"pkg/s\303\251"`; `cd -P` on that text fails; with `-c core.quotePath=false` it prints `pkg/sé`). Control: an ASCII path is admitted (committed scenario `clean-gitlink-under-dir`). Safe side, wrong reason, and **new with this change**. The reviewer filed it as a cleanup, so it stays advisory; recorded in `recommendations.future` with the one-line remedy. Not run against a fix.

**Mutation proofs** (the committed `DIRECT_MUTANTS` tests apply each reversion themselves and assert a scenario goes red; they ran green in the 47-test suite, so the working tree was never mutated here):

```
mutation-proven: untracked-file look inside a gitlink (GU) reverted → committed test "caught when the clause is reverted — the untracked-file look inside a gitlink" → covered
mutation-proven: could-not-look test reverted → committed test "... the could-not-look test" → covered
mutation-proven: gitlink listing (grep -E '^160000 ') reverted → committed test "... the gitlink listing" → covered
mutation-proven: own-level gate ([ -d "$p" ] && [ "$NEST" = "$TOP" ]) reverted → committed test "... the strictly-the-repository's-own-level gate" → covered
mutation-proven: ls-files -s failure fallback reverted → no committed test → no-red-untested (the task records this one as a known gap)
```

Platform variance: nothing environment-derived reaches a validating consumer except temp repository paths. `TMPDIR=/tmp CI=true node --test tests/qa-fix-step4-guard.test.js` exit 0, 47 pass. zsh present and exercised.

---

## Regression Testing

The existing 285 scenarios (hostile paths, CR-1 to CR-3 of that task) are part of the same 47-test file and pass. `npm run validate -- skills/qa-fix/` and Prettier pass.

---

## Test Artifacts

### Files Reviewed
`skills/qa-fix/SKILL.md`, `tests/qa-fix-step4-guard.test.js`, `CHANGELOG.md`, the task cases file.

### Test Commands Executed
```bash
CI=true command node --test tests/qa-fix-step4-guard.test.js
TMPDIR=/tmp CI=true command node --test tests/qa-fix-step4-guard.test.js
npm run validate -- skills/qa-fix/
./node_modules/.bin/prettier --check tests/qa-fix-step4-guard.test.js CHANGELOG.md
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-fix/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Read gitlink paths with `-c core.quotePath=false` (or `-z`) and add a non-ASCII admitted scenario.
2. Decide whether a gitlink nested inside a gitlink is in scope, and either recurse or state the one-level limit in the prose.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: every success criterion is held by a committed test; the boundary probe is clean; the two reproduced findings are low, advisory by rule, and routed to future work.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md`
**Gate File**: co-located at `task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml`
**Next Steps**: Step 5c PR review, then finalise.
