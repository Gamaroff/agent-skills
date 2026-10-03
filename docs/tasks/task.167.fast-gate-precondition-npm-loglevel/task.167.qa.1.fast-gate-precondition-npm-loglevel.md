# QA Report: Task 167 - Fast-gate precondition: no false HALT under npm loglevel=silent

**Task**: [Link to task document](./task.167.fast-gate-precondition-npm-loglevel.md)
**Gate File**: [task.167.gate.1.fast-gate-precondition-npm-loglevel.yml](./task.167.gate.1.fast-gate-precondition-npm-loglevel.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-03
**Testing Completed**: 2026-10-03
**Gate Status**: PASS

---

## Executive Summary

The three phases are delivered as planned. One planned flag fixes the false HALT, and the fast gate exposed one unplanned instrument change, in `tests/executable-instructions.test.js`. Both are mutation-proven against committed tests, and every success criterion is met. The diff review found two low-severity, non-blocking test-robustness points, recorded as future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (8/8 checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (None)
- [x] Code on feature branch with open PR (#559, OPEN)

### Testing Approach

- [x] Automated Testing (unit, fixture-level shell execution)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, because the task is small (3 phases, low risk, one module family). This is the first review, so no re-review scope applies. Step 3b dispatched one read-only Explore code reviewer over the whole `origin/develop...HEAD` diff (10 files, 729 lines). It was dispatched at 10:07 UTC; its completion notice reports `duration_ms` 165805.

Step 4b ran `qa-execute-snippets.mjs` on `shared/resources/develop-pipeline-step-3-develop-loop.md`. It found 6 blocks: 0 runnable, 2 placeholder (lines 60 and 68, the unchanged `{story-directory}` plan-file finds, which do not resolve through `--bind`), and 4 mutating. The **changed** block (line 197) is refused as `unrecognised-command: npm (fail-closed)`, by design. It is executed instead by the committed `evals/shared/tests/fast-gate-precondition.test.mjs`, which extracts that exact block and runs it under bash and zsh (18/18). The engine's `zero-blocks-executed` (medium) is recorded below as advisory: the two placeholder blocks are untouched by this change, and the changed block has execution coverage through the fixture suite.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Tests first (red) | PASS | Verified | `runCheck` env/npmrc options; 3 cases per shell. The implementation report records 4/18 red before the flag |
| Phase 2: The flag (green) | PASS | Verified | `--loglevel=notice` and one comment sentence in the shared source; 3 bundled copies regenerated; `bundle:check` 0 problems |
| Phase 3: Record | PASS | Verified | CHANGELOG `[Unreleased]` › Fixed entry (task 167, obs #213) |

**Overall Phase Completion**: 3/3 phases passed

Unplanned but in scope: `tests/executable-instructions.test.js` (`npmRunScript`). Without it the repository's own `npm run X` population check read the new `--loglevel` as a script name. The change is recorded in the task's Files Summary, Approach and CHANGELOG.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Silent env, script defined: not halted (bash; zsh where present) | exit 0 | exit 0, both shells | PASS |
| Silent env, script missing: halted, message names `develop.fastGateCommand` | exit 1 + key | exit 1 + key, both shells | PASS |
| Silent project `.npmrc`, script defined: not halted | exit 0 | exit 0, both shells | PASS |
| Existing cases still pass | 12/12 | 12/12 | PASS |
| Within `spawnBudget`, no new timeout literal | no literal | `test-harness-concurrency` 16/16 | PASS |
| Removed-flag mutation observed red, quoted | red | 4 named cases red (below) | PASS |
| `ci:fast`, `bundle:check`, `lint:shell`, `validate:all` clean | clean | 5201 pass / 0 fail; 0 problems; clean; 129 passed | PASS |
| CHANGELOG `[Unreleased]` cites (task 167) | present | present | PASS |

---

## Breaking Changes Validation

None declared, and none found. The verdict changes only where it was wrong.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2, advisory, from the code review)

- **CR-1** `evals/shared/tests/fast-gate-precondition.test.mjs:355`. The `.npmrc` case merges over the inherited env, and npm reads an inherited `npm_config_loglevel` ahead of a project `.npmrc`. Under a runner that sets the log level (`npm test --loglevel=warn`), the case passes even without the fix. Suggested: drop `npm_config_loglevel` and `npm_config_silent` from the child env when `npmrc` is supplied.
- **CR-2** `tests/executable-instructions.test.js:101`. `npmRunScript` does not skip the value of a space-separated value-taking flag (`npm run --workspace pkg test` reads `pkg`). Today this can only produce a false scanner failure, never a false pass. Suggested: state the limit, or skip the values of known value-taking flags.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
Adds 6 fixture spawns (3 per shell) under the shared `spawnBudget`. No timeout literal.

### Reliability — PASS
The precondition's verdict is now independent of npm's ambient log level. A missing script still HALTs.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true`. The precondition is a predicate whose `false` (HALT) prevents the develop loop from running. The probe engine reaches four entry forms (an export, `shell:`, `shell-fn:`, `cli:`), and a fenced Markdown block is none of them, so no engine probes ran. Its execution evidence is the committed fixture suite, which runs the exact extracted block under bash and zsh against the two hostile configurations the change targets. The input-classification half (the `sed` extraction and its character class, which excludes `.` and `/` so nothing reaching `grep -E` is a metacharacter) is not touched by this diff.

### Maintainability — PASS
The edit is in the shared source only, and the copies were regenerated. The new helper carries a docblock and a two-directional unit test.

---

## Code Review

Advisory: the run passed `code_review_blocking=true`, but no finding is `bug` + `high` confidence, so nothing was promoted to `top_issues[]`.

**Correctness bugs (2):**
- [low/medium] `evals/shared/tests/fast-gate-precondition.test.mjs:355`. The `.npmrc` case is vacuous under an inherited `npm_config_loglevel` → strip the inherited log-level vars when `npmrc` is supplied (CR-1).
- [low/low] `tests/executable-instructions.test.js:101`. A space-separated flag value is read as the script → document the limit, or skip known value-taking flags (CR-2).

**Cleanups (0)**

**Step 4b** (`qa-execute-snippets`): `zero-blocks-executed` [medium/medium]. 2 placeholder blocks (unchanged, slots do not bind) and 4 mutating (`npm` fail-closed; write redirections). Not promoted: the changed block is executed by the fixture suite.

**Boundary**: `boundary: true`, `probes_executed: 0`. Declined because no engine entry form reaches a fenced Markdown block. The candidate predicates in the diff were also checked: `npmRunScript` is a test-internal scanner helper, not shipped code, and its accept/reject directions are pinned by its own unit test.

mutation-proven: removed `--loglevel=notice` from the shared precondition block → `[bash]`/`[zsh] under npm_config_loglevel=silent a defined script does not HALT` and `[bash]`/`[zsh] a project .npmrc with loglevel=silent does not HALT a defined script` went red (4) → covered
mutation-proven: removed the leading-flag group from `npmRunScript`'s regex → `npm flags after \`npm run\` are skipped, not read as a script name` went red → covered

Platform variance: `TMPDIR=/tmp command node --test evals/shared/tests/fast-gate-precondition.test.mjs tests/executable-instructions.test.js` → 23/23, exit 0.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm run ci:fast`) | PASS (5201 pass, 0 fail) |
| Existing precondition cases (compound, unreadable shapes, non-vacuity) | PASS |
| `npm run` population check over all prose | PASS |
| Skill validation (`npm run validate -- skills/develop-{task,story,bug}/`) | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/develop-pipeline-step-3-develop-loop.md` and its 3 bundled copies, `evals/shared/tests/fast-gate-precondition.test.mjs`, `tests/executable-instructions.test.js`, `CHANGELOG.md`, the task docs.

### Test Commands Executed
```bash
command node --test evals/shared/tests/fast-gate-precondition.test.mjs
npm_config_loglevel=silent command node --test evals/shared/tests/fast-gate-precondition.test.mjs
TMPDIR=/tmp command node --test evals/shared/tests/fast-gate-precondition.test.mjs tests/executable-instructions.test.js
command node --test tests/executable-instructions.test.js tests/test-harness-concurrency.test.js
npm run validate -- skills/develop-task/   # and develop-story, develop-bug
npm run lint:shell; npm run validate:all; npm run bundle:check; npm run ci:fast
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/develop-pipeline-step-3-develop-loop.md --json
```

### Coverage Report
Not measured. The suites are node:test fixture and unit suites with no coverage instrumentation in this repository.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: isolate the `.npmrc` case from an inherited log level.
2. CR-2: document or handle space-separated flag values in `npmRunScript`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is met and mutation-proven, the full fast gate is green, and no finding meets the blocking bar.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.167.qa.1.fast-gate-precondition-npm-loglevel.md`
**Gate File**: co-located at `task.167.gate.1.fast-gate-precondition-npm-loglevel.yml`
**Next Steps**: Step 5c PR conformance review, then finalise.
