# QA Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Task**: [Link to task document](./task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md)
**Gate File**: [task.283.gate.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml](./task.283.gate.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-19
**Gate Status**: CONCERNS

---

## Executive Summary

The renderer and the Step 3 CHANGELOG block both work and are held by committed, mutation-proven tests. Five medium findings stand: no CHANGELOG entry citing task 283, `sync-github-task` calls the renderer against the Migration criterion, the wall-time criterion is unmeasured, the issue-body block leaves its inputs unbound, and the CHANGELOG block fails open on an unfetched base.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Review Methodology

Direct tools for the criteria and checks, plus one read-only Explore reviewer for the diff (generated bundled copies and the task's own documents excluded from the patch). Reviewer dispatched 22:36Z and returned at about 22:37Z (measured: `date -u` at dispatch; the completion notice gave `duration_ms` 39582). Diff review: code review. Step 4b: the change set touches runnable prose, but the two shell blocks are executed by the committed tests under bash and zsh; the engine was not re-run over each file.

CI on 3c4054aef154: pending

---

## Implementation Verification

| Phase | Status | Test result | Notes |
| --- | --- | --- | --- |
| 1: CHANGELOG placement | CONCERNS | 9 tests pass | Block works; fails open on an unfetched base (T283-QA-5); no CHANGELOG entry yet (T283-QA-1) |
| 2: Renderer and multi-task path | CONCERNS | 6 tests pass | Renderer correct; sync-github-task call site contradicts the Migration criterion (T283-QA-2); unbound inputs (T283-QA-4) |
| 3: Importer audit | PASS | grep | `develop-bug` reference item 4, `SKILL.md` pointer, `qa-fix` bullet |
| 4: Exec-wrapper trap | PASS | grep | `docs/contributing/traps.md` |
| 5: Bundle and gates | PASS | full run | `bundle --check` 0 problems; remote `ci:fast` 8629 tests, 0 fail (the third run; the second caught two real defects, fixed) |

**Overall Phase Completion**: 5/5 present; 2 with findings

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| Renderer keeps effort and absolute links (task.202 shape), named test | `render-task-issue-body.test.mjs`: `keeps effort and metadata when the description spans lines (task.202 shape)` and `relative links become absolute against the document URL; anchors are kept`, 6 pass, 0 fail | PASS |
| The four rules are present in their files | `traps.md` "Under an exec-wrapper, resolve the path once": 1; `develop-bug-step-3-investigate-fix.md` "importer": 1; `qa-fix/SKILL.md` "importer": 1; `create-task/SKILL.md` "Multi-task path": 1; Step 3 doc "CHANGELOG placement for NEW entries": 1; `review-task/SKILL.md` placement check at line 859 | PASS |
| Step 3 block fails the task.184 shape and passes its control; review-task flags the same shape in the fixture session | `develop-loop-changelog-placement.test.mjs`: `a new entry below the first release heading fails — the task.184 shape` and `a new entry under [Unreleased] passes (control)`, bash and zsh, 9 pass. Fixture session below | PASS |
| `CI=true npm test` wall time within 10% of `develop` (median of five alternating runs, LAN server) | Not measured: only branch-only runs exist | UNVERIFIED (T283-QA-3) |
| Renderer has a mutation proof | Mutations below | PASS |
| `bundle --check` 0 problems; `CI=true npm test` passes | `bundle freshness: 129 skill(s) checked, 0 problems`; remote run `# tests 8629 / pass 8626 / fail 0` | PASS |
| `shellcheck` clean if the renderer is shell | Renderer is Node; `npm run lint:shell`: clean | PASS |
| Renderer called only on `ensure-task-github-issue`'s create path | Call sites below show two skills | FAIL (T283-QA-2) |

**Fixture session for review-task's placement claim check.** A plan that says "edit the task 183 bullet in `[Unreleased]`", against this fixture:

```
$ grep -n "^## \[" CHANGELOG.md
3:## [Unreleased]
7:## [v0.53.0] - 2026-10-01
$ grep -n "Task 183 bullet" CHANGELOG.md
11:- **Task 183 bullet.**
```

Line 11 is below the line 7 release heading, so the "under `[Unreleased]`" claim is false and the check flags it as Important.

**Call sites (grep of `render-task-issue-body` in skill prose):**

```
skills/ensure-task-github-issue/SKILL.md:164 (explanation), :171 (call)
skills/sync-github-task/SKILL.md:128 (call)
```

**CHANGELOG citation:** `changelog-cites.sh task.283` answers `missing (task 283)` (T283-QA-1). `criteria-drift.js`: `clean`.

---

## Issues Found

### MEDIUM Severity Issues (5)

- **T283-QA-1**: no `[Unreleased]` entry citing task 283. Bug: [task.283.bug.1.no-changelog-entry.md](./task.283.bug.1.no-changelog-entry.md)
- **T283-QA-2**: `sync-github-task` calls the renderer against the Migration criterion. Bug: [task.283.bug.2.sync-github-task-calls-renderer.md](./task.283.bug.2.sync-github-task-calls-renderer.md)
- **T283-QA-3**: wall-time criterion unmeasured. Bug: [task.283.bug.3.wall-time-unmeasured.md](./task.283.bug.3.wall-time-unmeasured.md)
- **T283-QA-4**: render block leaves `TASK_RELATIVE_PATH` and `DOC_URL` unbound. Bug: [task.283.bug.4.render-block-unbound-inputs.md](./task.283.bug.4.render-block-unbound-inputs.md)
- **T283-QA-5**: CHANGELOG block fails open on an unfetched base. Bug: [task.283.bug.5.changelog-block-fails-open.md](./task.283.bug.5.changelog-block-fails-open.md)

### LOW Severity Issues (1)

- **T283-QA-6**: the "old `\s*` pattern" test never calls the renderer (cleanup CR-4).

**Total Issues**: HIGH: 0, MEDIUM: 5, LOW: 1

---

## NFR Assessment

### Performance — CONCERNS
Wall-time criterion unmeasured (T283-QA-3).

### Reliability — CONCERNS
The CHANGELOG block fails open on an unfetched base (T283-QA-5).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The renderer reads one local file and writes stdout. The CHANGELOG block is a boundary by the repository-state signal: committed tests drive it under bash and zsh, but it was not run through the probe engine (recorded in T283-QA-5).

### Maintainability — PASS
One card definition is reused; the heredoc allowlist floor moved from 32 to 31.

---

## Code Review

Advisory unless promoted; promoted here because the pipeline passes `code_review_blocking=true` (high confidence) or QA reproduced the finding (5d).

**Correctness bugs (3):**
- [medium/high] `skills/sync-github-task/SKILL.md:128` — render block reads `TASK_RELATIVE_PATH` and `DOC_URL` assigned in an earlier block (CR-1); resolved by removing the call (T283-QA-2)
- [medium/high] `skills/ensure-task-github-issue/SKILL.md:171` — same, exits 2 before creating an issue (CR-2) → T283-QA-4
- [medium/medium] `shared/resources/develop-pipeline-step-3-develop-loop.md:378` — `! git diff --quiet` reads exit 128 as "changed" (CR-3). Reproduced by QA (5d): base `nonexistent` gives `rc=0` with no output; control base `develop` gives `rc=1` and the HALT line on the same misplaced entry. New in this change, so not `pre-existing` (5b) → T283-QA-5

**Cleanups (1):**
- `shared/resources/tests/render-task-issue-body.test.mjs` — control test never calls the renderer (CR-4) → T283-QA-6

Mutation proofs, each from a `cp` snapshot, `cmp`-restored and `git status` clean afterwards:

mutation-proven: `render-task-issue-body.js` link resolution returns the match unchanged → `relative links become absolute against the document URL; anchors are kept` went red → covered

mutation-proven: `render-task-issue-body.js` reads `frontmatter.estimated_effort` instead of `estimated_effort_hours` → `keeps effort and metadata when the description spans lines (task.202 shape)` went red → covered

mutation-proven: Step 3 block drops the position test (`line >= 0`) → `a new entry under [Unreleased] passes (control)` went red under bash and zsh → covered

mutation-proven: Step 3 block drops the insertion-only test (`old == 0`) → `an edit to a shipped entry is not a new entry and passes` went red under bash and zsh → covered

The item cap (`maxItems: 99`) was proven earlier in the session by the "+N more" test; it was not re-run this cycle, so it is `dev-only`, not claimed here.

---

## Test Artifacts

### Test Commands Executed

```bash
CI=true node --test shared/resources/tests/render-task-issue-body.test.mjs shared/resources/tests/develop-loop-changelog-placement.test.mjs
CI=true npm run test:remote -- --timeout-min 75     # LAN server: # tests 8629, pass 8626, fail 0
npm run bundle -- --check                            # 0 problems
npm run lint:shell                                   # clean
```

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Five medium findings, none blocking a merge of correct behaviour, all fixable in one cycle; the wall-time measurement is the long one.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T283-QA-1 to T283-QA-5 resolved

---

**QA Report**: co-located at `task.283.qa.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.md`
**Gate File**: co-located at `task.283.gate.1.authoring-and-fix-steps-state-the-rules-they-keep-missing.yml`
**Next Steps**: qa-fix cycle for T283-QA-1 to T283-QA-6.
