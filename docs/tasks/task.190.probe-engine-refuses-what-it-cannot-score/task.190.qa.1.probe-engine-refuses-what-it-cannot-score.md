# QA Report: Task 190 - Probe engine refuses what it cannot score

**Task**: [task.190.probe-engine-refuses-what-it-cannot-score.md](./task.190.probe-engine-refuses-what-it-cannot-score.md)
**Gate File**: [task.190.gate.1.probe-engine-refuses-what-it-cannot-score.yml](./task.190.gate.1.probe-engine-refuses-what-it-cannot-score.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-18
**Testing Completed**: 2026-10-18
**Gate Status**: PASS

---

## Executive Summary

QA cycle 1 for PR #685 (head `98b87d5b`). The three engine changes work as the task says. Each
success criterion is held by a committed test, and five QA mutations each turned one of those tests
red. The diff review found no high-confidence bug. Its four findings are advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked, status `ready-for-review`)
- [x] Tests passing
- [x] Breaking changes documented (2, each with a migration path)
- [x] Code on feature branch with open PR (#685, OPEN)

### Testing Approach

- [x] Automated Testing (unit, CLI)
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review. This is a first
review of a small task: 4 phases, one module, Medium risk. The reviewer was dispatched 20:20:14Z and
took 184 s (`duration_ms` 184466).

- Diff scope: `origin/develop...HEAD`, minus the 4 bundled `references/security-probe.mjs` copies
  (`bundle:check` proves they match the source) and `docs/`. That leaves 4 files and 14 hunks.
- Step 4b: not applicable. The change set holds no runnable prose: no `SKILL.md`, and no
  `shared/resources/*.md` with a bash fence.
- Mutations ran in a detached scratch worktree, not in the tree the reviewer was reading. The
  working tree is unchanged by this QA step.

---

## Implementation Verification

| Phase                                    | Status | Test Result | Notes                                                                 |
| ---------------------------------------- | ------ | ----------- | --------------------------------------------------------------------- |
| Phase 1: Validate supplied cases         | PASS   | Verified    | `validateCases` / `describeBadCase`; `main` and `runProbeSpec` call it |
| Phase 2: Default root and missing entry  | PASS   | Verified    | `defaultRepoRoot` git lookup; entry check before `preflightRecord`     |
| Phase 3: Declined reasons in the record  | PASS   | Verified    | `toRecordEntry` adds `declined_cases`                                 |
| Phase 4: Bundle and changelog            | PASS   | Verified    | 4 copies regenerated; CHANGELOG `[Unreleased]` › Fixed                 |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

Each criterion is checked against a committed test or a measured command, not against its
checkbox.

| Criterion                                                        | Evidence                                                                           | Status |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------ |
| Unknown `direction` → exit 2 `bad-cases`, no record              | `security-probe.test.mjs` § task.190 CLI benign-direction test; QM1 red            | PASS   |
| Unknown `sink` refused the same way                              | same suite, CLI sink `"nope"` test; QM1 red                                        | PASS   |
| Bundled copy defaults to the git top level                       | same suite, defaultRepoRoot bundled-copy test; QM2 red                             | PASS   |
| Missing entry with `--record` → exit 2 `entry-not-found`, no record | same suite, six-form entry-not-found test; QM3 red                              | PASS   |
| `--json` prints `{reason, …}` for both refusals                  | same suite, sink `--json` and entry-not-found tests; QM5 red (fail 2)              | PASS   |
| Record carries `declined_cases` `{id, reason, detail}`           | same suite, recordRun/readRecord round-trip test; QM4 red                          | PASS   |
| Performance: not applicable                                      | case count unchanged; one `git rev-parse` per bundled CLI run                      | PASS   |
| `npm test`, `bundle:check`, `prettier --check .`                 | `ci:fast` 5837 tests, 0 fail (Step 3); PR CI `test` pass                           | PASS   |
| CHANGELOG states the refusals and `declined_cases`               | `CHANGELOG.md` `[Unreleased]` › Fixed, task 190 entry                              | PASS   |

---

## Breaking Changes Validation

### Breaking Change 1: unknown direction or sink now exits 2

Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes · Consumer Code Updated: N/A

All 47 committed cases files pass `validateCases` (measured at review). `security-probe-plan.mjs:296`
already records an exit 2 as a refusal.

### Breaking Change 2: the CLI refuses a missing entry with exit 2

Documented: Yes · Migration Path Provided: Yes · Migration Tested: Yes · Consumer Code Updated: Yes

`review-security.test.js:711` was updated to match. The plan runner treats the new exit 2 as a
refusal and does not count it.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (0)

All four code-review findings are advisory. None is `category: bug` + `confidence: high`, so none
enters `top_issues[]`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS

The engine runs the same cases. A bundled copy now makes one `git rev-parse` call per CLI run.

### Reliability — PASS

Both refusals return before `preflightRecord`, so a run the engine cannot set up writes no record.
CR-2 (below) is a throw on input a JSON cases file cannot hold.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary decisions**:
  - `security-probe.mjs#validateCases`: **`boundary: internal`**. `internal_reason`:
    `shared/resources/security-probe.mjs#validateCases` validates a probe cases file. That file is
    written by this pipeline (QA and finalise plans, committed fixtures). No corpus sink models a
    case array, so no sink's legitimate cases are documents it accepts. Its behaviour is held by
    the committed validator tests and by QM1.
  - The `main` entry-exists check: **`boundary: false`**. It tests whether a file exists after
    `resolveEntry` has decided containment. `resolveEntry` is unchanged and already tested
    (the outside-repo-root control still exits 1).
  - `defaultRepoRoot` is not a predicate.
- CR-1 (below): with no `--repo-root`, the containment root now follows the caller's cwd and the
  inherited `GIT_DIR`. The caller can already set any root with `--repo-root`, so this grants
  nothing new. Advisory.

### Maintainability — PASS

The code is commented and the tests sit in one named section. CR-4 is a duplicated test helper.

---

## Code Review

Advisory. `code_review_blocking=true` was passed, but no finding is `category: bug` +
`confidence: high`. Every anchor checked `ok` (`finding-anchors.js --rev HEAD`).

**Correctness bugs (3):**

- [medium/medium] `shared/resources/security-probe.mjs:449` — platform-variance: a bundled copy
  takes its containment root from `git rev-parse` in the caller's cwd, which also obeys inherited
  `GIT_DIR`/`GIT_WORK_TREE`. → Pin the lookup or strip those variables. QA: the task specifies the
  caller's tree on purpose, and `--repo-root /` already allows the same widening. Routed to
  `recommendations.future`. The symlinked-TMPDIR re-run below passes.
- [low/medium] `shared/resources/security-probe.mjs:508` — `describeBadCase` throws on a BigInt or
  circular value, so `runProbeSpec` throws instead of declining. → Use a non-throwing formatter. QA
  reproduced it: both shapes throw. `JSON.parse` cannot produce either, so no CLI or plan-runner
  input reaches it. New to this change (base has no `describeBadCase`). Future.
- [low/low] `shared/resources/security-probe.mjs:498` — `validateCases` refuses `"sink": null`,
  while consumers read `c.sink ?? sink`. → Treat null as absent. QA reproduced the refusal. It is
  loud (exit 2 names `null`), and no committed cases file carries `"sink": null`; the 3 hits are
  run records. Future.

**Cleanups (1):**

- `shared/resources/tests/security-probe.test.mjs:5931` — `copyEngine` duplicates the transitive
  import walk at `review-security.test.js:728`. → Share one helper.

**Mutation proofs** (detached scratch worktree, `security-probe.test.mjs`, baseline 0 fail before,
between and after):

- mutation-proven: drop `main`'s `validateCases` refusal → task.190 CLI bad-cases tests (fail 2) → covered
- mutation-proven: `defaultRepoRoot` always two up → defaultRepoRoot bundled-copy test (fail 1) → covered
- mutation-proven: entry-exists check disabled → entry-not-found six-form test (fail 1) → covered
- mutation-proven: `declined_cases.reason` forced null → declined_cases round-trip test (fail 1) → covered
- mutation-proven: refusal `--json` output dropped → sink `--json` and entry-not-found tests (fail 2) → covered

Five of five reverted. Not proven here: `runProbeSpec`'s own validation (Step 3's M5 is dev-only).

---

## Regression Testing

| Area                                         | Result                                                             |
| -------------------------------------------- | ------------------------------------------------------------------ |
| `security-probe.test.mjs` (182 tests)        | PASS                                                               |
| `review-security.test.js` (55 tests)         | PASS                                                               |
| Same suite under a symlinked `TMPDIR`        | PASS (182/182) — the platform-variance re-run for CR-1             |
| `npm run validate` for the 4 changed skills  | PASS (finalise, qa-story, qa-task, review-security)                |
| PR CI                                        | test, validate, shellcheck, link-check: pass                       |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`
- `skills/review-security/tests/review-security.test.js`
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test shared/resources/tests/security-probe.test.mjs
command node --test skills/review-security/tests/review-security.test.js
TMPDIR=<scratch>/linktmp command node --test shared/resources/tests/security-probe.test.mjs   # symlinked tmpdir
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/
command node .agents/skills/qa-task/references/finding-anchors.js --findings-file <findings.json> --root . --rev HEAD --json
gh pr checks 685
```

### Coverage Report

Not measured: the repository has no coverage tooling for `node --test` suites.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-2: give `describeBadCase` a non-throwing formatter.
2. CR-3: treat `"sink": null` as absent.
3. CR-1: consider stripping `GIT_DIR`/`GIT_WORK_TREE` from the root lookup.
4. CR-4: share the import-walk helper.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by a committed test that a QA mutation turned red. No
high-confidence bug was found, and no NFR is below PASS.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.190.qa.1.probe-engine-refuses-what-it-cannot-score.md`
**Gate File**: co-located at `task.190.gate.1.probe-engine-refuses-what-it-cannot-score.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`).
