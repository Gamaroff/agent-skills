---
id: task.291
title: "The context-pressure statusline test leaks a ctx-wrap- temp directory"
type: task
description: "Stop shared/resources/tests/context-pressure-statusline.test.mjs leaving a ctx-wrap- directory behind, which trips the post-suite tmp-leak ratchet intermittently and costs a CI re-run."
tags: [testing, flaky-test, tmp-leak, follow-up-289]
category: testing
status: ready-for-review
priority: Low
created: 2026-11-09
updated: 2026-11-11
estimated_effort_hours: 2
github_issue: 882
---

# Task 291: The context-pressure statusline test leaks a ctx-wrap- temp directory

**GitHub Issue**: [#882](https://github.com/Gamaroff/agent-skills/issues/882)

**Status:** Ready for Development

---

## 1. Overview

`shared/resources/tests/context-pressure-statusline.test.mjs` creates `ctx-wrap-*` directories under the OS temp directory and removes them in an `after` hook, yet a `ctx-wrap-` directory sometimes survives the run. The post-suite check in `scripts/test-tmpdir.mjs` then fails on a prefix its ratchet does not list. It failed CI once on task 274's PR and once locally on task 289.

**Scope**: the test file, and only if the cause turns out to be there, the wrapper it exercises.

**Key deliverables**: a reproduction that counts the leaked directories, the fix, and a regression test that holds the fix.

---

## 2. Motivation

### Current Problems

1. **An intermittent red CI job**: the task 274 PR's `test` job passed all 8,135 tests and then failed the leak check on a new prefix, `ctx-wrap-`, in a test that PR did not touch. One recorded re-run was green. The task 289 `ci:fast` run failed the same way once and did not recur.
2. **The cost is a re-run, and a wrong conclusion**: a reader sees a red job on a docs-only head and must work out that the leak is not theirs. Two DoD files carry that explanation by hand.
3. **The ratchet cannot see the cause**: it reports the prefix and a count, not which test or why.

### Benefits of the Fix

1. **No flaky leak check**: a green suite stays green on a re-run.
2. **The ratchet stays strict**: the fix removes the leak rather than listing `ctx-wrap-` in `tests/tmp-leak-ratchet.json`.

---

## 3. Technical Background

### Current Architecture

- The test's `tmpdir()` helper makes the directory and records it for removal (`shared/resources/tests/context-pressure-statusline.test.mjs:19`, `fs.mkdtempSync(path.join(os.tmpdir(), "ctx-wrap-"))`), and an `after` hook removes every recorded directory (`:17`, `after(() => TMP.forEach(... fs.rmSync(d, { recursive: true, force: true })))`).
- The wrapper starts its recorder in the **background** and does not wait for it (`shared/resources/context-pressure-statusline.sh:30`, `{ printf '%s' "$input" | command node "$engine" record; } </dev/null >/dev/null 2>&1 &`).
- The recorder creates its state directory, and any missing parent, on demand (`shared/resources/context-pressure.mjs:229`, `fs.mkdirSync(dir, { recursive: true, mode: 0o700 })`), where the directory is whatever `CONTEXT_PRESSURE_STATE_DIR` names (`:91`).
- Two tests wait for the recorder's file before they finish (`:55` and `:104`, `waitFor(...)`). The test "an original holding shell metacharacters runs as one command" (`:85`) passes `CONTEXT_PRESSURE_STATE_DIR: path.join(tmpdir(), "s")` (`:93`) and does **not** wait.
- The ratchet does not list the prefix (`git grep -n "ctx-wrap" -- tests` has no hit), so any leak of it fails as a new prefix. `scripts/test-tmpdir.mjs` says a prefix absent from one run is not proof of a fix (the header comment near `:25`).

### Hypothesis (unverified until Phase 1)

The `:85` test finishes while its background recorder is still running. The `after` hook removes `ctx-wrap-X`. The recorder then runs `mkdirSync(".../ctx-wrap-X/s", { recursive: true })`, which recreates `ctx-wrap-X`, and nothing removes it again. That fits an intermittent leak that depends on timing, and on only some runs.

### Target Architecture

No test finishes, and no `after` hook runs, while a recorder it started is still alive. Either each such test waits for the recorder's file, or the hook waits for every state directory it created before it removes anything.

---

## 4. Scope

**In scope**
- ✅ Reproduce the leak and prove the cause.
- ✅ Fix it in the test file, or in the wrapper if the cause is there.
- ✅ A regression test that fails if the leak returns.

**Out of scope**
- ❌ Adding `ctx-wrap-` to `tests/tmp-leak-ratchet.json`.
- ❌ Changing what the recorder records.
- ❌ Other leaking prefixes in the ratchet.

---

## 5. Breaking Changes

None - API stable. The change is confined to a test, or to a background process's start-up order.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.291.plan.context-pressure-statusline-test-leaks-ctx-wrap-directory.md](task.291.plan.context-pressure-statusline-test-leaks-ctx-wrap-directory.md)

### Phase 1: Reproduce, prove the cause, fix it

**Risk**: Low

**Files**: `shared/resources/tests/context-pressure-statusline.test.mjs` (and `shared/resources/context-pressure-statusline.sh` only if the cause is there)

- [x] Reproduce: run the file repeatedly under load and count the `ctx-wrap-*` directories left in a private `TMPDIR`. (Before: 1 in 100 unloaded, 3 in 100 loaded.)
- [x] Prove the cause: make the `:85` test's recorder slow (an engine that sleeps before it writes) and show the directory survives. (A 500 ms stand-in left `ctx-wrap-X/s/wrap-1.json` behind.)
- [x] Fix it so no recorder outlives its directory.
- [x] Add the regression test (the slow-recorder case) and mutation-prove it.

**Dependencies**: none.

---

## 7. Files Summary

Core implementation:
1. ✅ `shared/resources/tests/context-pressure-statusline.test.mjs` - the leaking test, and the regression test
2. ✅ `shared/resources/tests/lib/tmp-state-cleanup.mjs` - new helper: the cleanup the `after` hook calls (wait for every recorded state directory's file, bounded, then remove). It lives in `tests/lib/` (beside `executed-prose.mjs` and `rm-invocation.mjs`), not in the test file, because a `*.test.mjs` file cannot be imported without registering its tests; the runner's glob `shared/resources/tests/*.test.mjs` does not match `lib/`, so the helper is never run as a test, and the regression test imports it. Its temp directory is removed by the helper's own `finally`.

Possibly:
2. ✅ `shared/resources/context-pressure-statusline.sh` - only if the fix belongs in the wrapper

Documentation:
3. ✅ `CHANGELOG.md` - a line citing task 291

---

## 8. Testing Strategy

**Reproduction command** (from the repository root, with a private `TMPDIR`, so the count is this run's alone):

```bash
T=$(mktemp -d); for i in $(seq 1 100); do TMPDIR=$T command node --test shared/resources/tests/context-pressure-statusline.test.mjs >/dev/null 2>&1; done; ls "$T" | grep -c '^ctx-wrap-'; rm -rf "$T"
```

**Regression test**: a recorder made slow on purpose (`CONTEXT_PRESSURE_ENGINE` pointing at a stub that sleeps, then writes) must leave no `ctx-wrap-*` entry after the file's `after` hook has run and a grace period has passed. It must be red with the fix reverted.

**Mutation proof**: revert the fix, run the regression test, name the test that goes red, restore.

**Full suite**: `CI=true npm test` (the ratchet runs inside it); the file alone does not exercise the ratchet.

---

## 9. Success Criteria

### Functional
- [ ] The reproduction command prints 0 after the fix (recorded in the QA report). The "before" figure is the count the same command gives with the slow-recorder stub from Phase 1 step 2 applied to the unfixed test: the leak is intermittent, so an unloaded 100-run count of 0 does not falsify the cause, and the stub makes the "before" deterministic. Record both the unloaded count and the stubbed count.
- [ ] The regression test (`shared/resources/tests/context-pressure-statusline.test.mjs`, case "no ctx-wrap- directory survives a slow recorder") fails with the fix reverted: the QA report names the red test and the revert.
- [ ] `CI=true npm test` passes with `ctx-wrap` absent from `tests/tmp-leak-ratchet.json`.

### Performance
- [ ] The five existing tests' run time is no more than 10% above `develop`'s, and the regression test's deliberate cost (its 150 ms stand-in recorder, about 280 ms for the test) is recorded as its own line, not counted against that bound. The QA report records the median of five alternating runs of `time command node --test shared/resources/tests/context-pressure-statusline.test.mjs` on `develop` and on the branch, with `uptime` beside each figure and the head commit named, and the per-test durations from the same run. (Amended after QA cycle 1, approved by Lorien Gamaroff on 2026-11-11: a 10% bound on the whole file cannot hold while the regression test sleeps long enough to be red on revert.)
- [ ] No test in the file waits longer than its existing `waitFor` bound (3000 ms, `waitFor`'s default).

### Code Quality
- [ ] Every test in the file that passes `CONTEXT_PRESSURE_STATE_DIR` to the wrapper either waits for the recorder's file with `waitFor` or has its state directory settled by the cleanup helper; the QA report lists each such test with the line of its wait or its settle call (a documentation criterion: held by that list, not by a scan).
- [ ] Lint and prettier pass on the changed files.

### Migration
- [ ] `CHANGELOG.md` cites this task.
- [ ] `npm run bundle:check` reports 0 problems.

---

## 10. Risk Assessment

**HIGH**: none.

**MEDIUM**
1. The leak has a second cause the first fix does not touch.
   - Probability: Low. Impact: the flake continues.
   - Mitigation: the reproduction count after the fix must be 0 over 100 runs, not 1.
   - Rollback: revert the commit.

**LOW**
1. Waiting for the recorder slows the file. Mitigation: the existing `waitFor` polls every 50 ms, so the wait ends when the file appears.

---

## 11. Rollback Plan

**Immediate (under 1 hour)**: revert the commit; no consumer state changes.
- Triggers: the suite goes red on `develop`, or the file becomes flaky in a new way.
- Validation: `CI=true npm run ci:fast` exits 0.

**Partial**: revert the wrapper change and keep the test change, if both were made.

**Forward fix**: if the cause is not the recorder, record what the reproduction showed and fix that instead.

**Triggers**: Critical, a new leaking prefix appears. Non-critical, a slower run.

---

## Stakeholder Sign-off

Sign-off is disabled for this repository (`sign-off.enabled` is not set), so no rows are scaffolded.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-11
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.291.qa.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.md](./task.291.qa.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.md)
- **Gate File**: [task.291.gate.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml](./task.291.gate.1.context-pressure-statusline-test-leaks-ctx-wrap-directory.yml)

### Test Coverage Summary
- **Tests Executed**: 6 in the file; 8392 in the full suite
- **Phases Verified**: 1/1
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: CONCERNS, Reliability: PASS, Maintainability: PASS

### Key Findings
The fix holds: 0 leaks in 100 runs, and the new test is red with the wait removed. One medium finding: the file runs 22% slower than develop against a 10% criterion, because the regression test sleeps on purpose.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                 | Author      |
| ---------- | ------- | --------------------------------------------------------------------------- | ----------- |
| 2026-11-09 | 1.0     | Initial draft, from task.289 Phase 5 (the optional leak fix, split out)    | create-task |
| 2026-11-11 | 1.1     | Review passed (8/10): 4 Important fixes applied (helper module location, deterministic "before" evidence, negative-content criterion rescoped, performance bound given its command); GitHub issue #882 linked | review-task |
| 2026-11-11 |         | Status → ready-for-development                                              | review-task |
| 2026-11-11 |         | Status → ready-for-review: leak reproduced and cause proven, fixed in the test's cleanup, regression test mutation-proven | develop-task |
| 2026-11-11 |  | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-11 | 1.2     | Performance criterion 1 amended (existing tests bounded at 10%; the regression test's deliberate cost recorded separately), approved by Lorien Gamaroff after QA cycle 1 finding T291-QA-1 | develop-next |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1
- [x] Reproduce and count
- [x] Prove the cause
- [x] Fix and add the regression test
- [x] Mutation proof, CHANGELOG
- [x] Fast gate (`CI=true npm run test:remote` → `ci:fast` on the LAN server): 8389 pass, 0 fail, tmp-leak ratchet ok; the QA step records the full suite

---

## References

- **Parent**: task.289 plan, Phase 5 (`task.289.plan.qa-snippet-runner-flag-level-allow-list.md`)
- **First sighting**: task.274 DoD, "CI re-run" (`task.274.dod.1.qa-engines-stop-passing-what-they-cannot-see.md`)
- **Ratchet**: `scripts/test-tmpdir.mjs`, `tests/tmp-leak-ratchet.json`

---

## Notes

### Important Reminders

The cause above is a hypothesis read from the code, not a measurement. Phase 1 starts by reproducing the leak, and the fix follows what that shows.

---

**Status:** Ready for Review

**Next Steps**: run `/develop-task` on this task.
