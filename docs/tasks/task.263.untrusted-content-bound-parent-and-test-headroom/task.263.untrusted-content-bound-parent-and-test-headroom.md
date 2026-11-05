---
id: task.263
title: "Untrusted-content bound: unresolvable parent and lint test headroom"
type: task
description: "Close the two follow-ups left by task 262: make the path bound refuse a parent it cannot resolve instead of skipping the real-path check, and give the lint test real headroom under its 2 s bound."
tags: [guardrails, prompt-injection, lint, hardening]
category: other
status: planned
priority: Low
created: 2026-11-05
updated: 2026-11-05
estimated_effort_hours: 4
github_issue: 841
---

# Technical Task: Untrusted-content bound: unresolvable parent and lint test headroom

**Status:** Planned
**GitHub Issue**: [#841](https://github.com/Gamaroff/agent-skills/issues/841)

> Detailed implementation guide: [task.263.plan.untrusted-content-bound-parent-and-test-headroom.md](task.263.plan.untrusted-content-bound-parent-and-test-headroom.md)

---

## 1. Overview

Task 262 hardened the "Bound the derived path" block and its lint test. Its QA report and DoD left two things open, and this task closes both in one shippable unit because they touch the same three blocks and the same test file.

1. **An unresolvable parent skips the real-path check.** When the parent directory of the derived path cannot be resolved, the block sets `REAL_DIR` empty and skips the comparison. QA measured two such states, a dangling symlinked directory and a directory with mode 000. Both fail at the read itself, so nothing escapes today, but the guard then relies on the read failing.
2. **The lint test has about 2% headroom.** `tests/untrusted-content-rule.test.js` ran in 1951 to 1989 ms against a 2000 ms bound, so a loaded machine can fail it.

**Scope**: the "Bound the derived path" block at `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md` and `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (with the six bundled copies regenerated), and `tests/untrusted-content-rule.test.js`.

---

## 2. Motivation

### Current Problems

1. **The guard depends on the read failing.** In each of the three sources the line `REAL_DIR=$(cd "$(dirname "$LOCAL_PATH")" 2>/dev/null && pwd -P) || REAL_DIR=""` (`skills/review-task/SKILL.md:171`, `skills/review-story/SKILL.md:200`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:143`) turns every `cd` failure into an empty `REAL_DIR`, and the comparison that follows runs only `if [ -n "$REAL_DIR" ]`. A missing directory, a dangling link, an unenterable directory and a regular file used as a directory all give the same empty value, so the block cannot tell the harmless one from the others. Measured in a scratch tree (the output of the probe in § 3): `docs/dangling/x.md` (a link to a path that does not exist), `docs/locked/x.md` (mode 000) and `docs/missing/x.md` all gave `realdir=<empty>`.
2. **A missing parent under a symlink skips the check too.** `docs/link/new/x.md`, where `docs/link` is a valid symlink to a directory outside the tree and `new` does not exist, also gives an empty `REAL_DIR`, so the check that would catch the escape is skipped. The read cannot succeed (`outside/new/x.md` does not exist), but the block says "kept" for a path whose parent chain leaves the tree.
3. **The lint test is too close to its bound.** Task 262 recorded `duration_ms` 1981, 1989 and 1951 for 33 tests against a success criterion of under 2 seconds (`task.262.qa.1.untrusted-content-path-bound-hardening.md`, "Lint test runtime"). The brief for this task assumed the scratch-repo tests were the cost. They are not: per-test durations from `CI=true node --test --test-reporter=spec tests/untrusted-content-rule.test.js` put the three population tests at about 830 ms together and the scratch-repo tests at about 0.1 s together. The population tests are slow because `loadTree()` (`tests/untrusted-content-rule.test.js:141`) is called by three tests (lines 168, 180 and 196) and each call re-reads every `shared/resources/*.md` and every `skills/*/SKILL.md`.

### Benefits of This Task

- The guard no longer depends on a later failure: an unresolvable parent is refused, and a missing parent is judged by the nearest ancestor that exists.
- The one case the task 262 decision protected (a missing parent under `docs/` is kept) is held by an existing test and stays green.
- The lint test gets headroom without losing any test, so a loaded CI runner or laptop does not turn the bound into a flake.

---

## 3. Technical Background

### Current Architecture

The block runs, in order: an empty-path pass-through, an outside-root string guard (`skills/review-task/SKILL.md:168`), a `..` climb guard (line 169), a symlinked-file guard (line 170), then the real-path comparison (lines 171 to 179) that this task changes. The tests run the block through `runBound` (`tests/untrusted-content-rule.test.js:346`) against `BOUND_SITES` (line 320), one shell per case. The scratch-repo cases run at the first site only (the comment at line 414 says why: the "same block at every site" test holds the three blocks equal).

Probe for the claim in § 2 problem 1, run in a scratch tree as an ordinary user (uid 1000). The `walk` function is the algorithm in the target architecture below:

| Path | `REAL_DIR` today | Nearest existing ancestor |
| --- | --- | --- |
| `docs/dangling/x.md` (`docs/dangling` is a link to `/nonexistent`) | empty | `docs/dangling`, a link that does not resolve |
| `docs/dangling/sub/x.md` | empty | `docs/dangling` (the walk reaches it, because nothing below it can be looked up) |
| `docs/locked/x.md` (mode 000) | empty | `docs/locked`, exists, cannot be entered |
| `docs/ok/x.md` | `…/docs/ok` | n/a |
| `docs/missing/x.md` | empty | `docs`, enterable |
| `docs/missing/deep/x.md` | empty | `docs`, enterable |

This is the behaviour the target architecture is built on: a dangling link and a missing directory differ at `[ -L "$d" ] && [ ! -e "$d" ]` (a link exists as a name even when its target does not), and an unenterable directory differs at `[ -e "$d" ]` with a failing `cd`.

Existing mechanisms for the same job (obs #103): the block already has the symlinked-file guard and the real-path comparison. The new check extends the comparison to the nearest existing ancestor, so it replaces the `if [ -n "$REAL_DIR" ]` skip and sits beside nothing else.

### Target Architecture

When `REAL_DIR` is empty, find the nearest ancestor of `dirname "$LOCAL_PATH"` that exists as a name (`[ -e ]` or `[ -L ]`) and decide on it:

- It is a link that does not resolve, or exists and cannot be entered: HALT with `derived path $LOCAL_PATH has a parent that cannot be resolved`.
- It resolves: apply the same in-root comparison the block already makes, to that ancestor's real path. An ancestor inside `docs/` or the PRD root keeps the path (a missing parent under `docs/` stays kept). An ancestor that resolves outside HALTs with the existing `resolves outside docs/ and the PRD root` message.
- Nothing on the chain exists: keep the path, as today, because the block's later read fails with its own error.

Consequences stated openly: a regular file used as a directory (`docs/a.md/x.md`) now HALTs with the new message where it was kept before; the read would have failed either way. Running as root, a mode 000 directory is enterable, so the unenterable case cannot be reproduced and its test is skipped for uid 0 (precedent: `tests/test-clean-checkout.test.js:437` and `tests/test-tmpdir.test.js:360` both branch on `process.getuid`).

---

## 4. Scope

### In Scope

✅ The real-path check in the three block sources, and the six bundled copies by `npm run bundle`.
✅ New named-guard test cases in `tests/untrusted-content-rule.test.js` (first site only, as for task 262).
✅ Reducing the lint test's runtime by measuring, then removing the repeated tree load first.
✅ A `CHANGELOG.md` entry.

### Out of Scope

❌ `tests/bundle-missing-source.test.js`, which exceeds its 20 s budget inside a full `ci:fast` run under load and passes alone. A separate, pre-existing problem recorded in the task 262 Issues Log.
❌ Changing what the other guards do (outside-root, `..` climb, symlinked file).
❌ Resolving symlinks in the issue-body-derived path beyond the parent chain.

---

## 5. Breaking Changes

None. The default `docs/tasks/...` path and a path under a configured `PRD_ROOT` are kept before and after. The only path that changes verdict is one whose parent chain is a dangling link, an unenterable directory, a regular file used as a directory, or a symlink that leaves the tree; each of those was either already failing at the read or is the escape the check exists to stop.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.263.plan.untrusted-content-bound-parent-and-test-headroom.md](task.263.plan.untrusted-content-bound-parent-and-test-headroom.md)

### Phase 1: Refuse an unresolvable parent (named-guard tests first)

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`.

- [ ] Add scratch-repo cases at the first site, each asserting its own message: a dangling directory link (HALT, `has a parent that cannot be resolved`), a deeper path under it (same), a mode 000 directory (same; skipped when `process.getuid() === 0`), and `docs/link/new/x.md` where `docs/link` leaves the tree (HALT, `resolves outside docs/ and the PRD root`).
- [ ] Confirm the new cases are red against the current block, and that the existing "parent directory does not exist is kept" case stays green.

### Phase 2: The block

**Risk**: Medium (a shell change in three sources that must stay identical). **Files**: `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`. **Depends on**: Phase 1.

- [ ] Replace the `if [ -n "$REAL_DIR" ]` skip with the nearest-existing-ancestor walk and the decision in § 3, in `bash` and `zsh`-safe form (the tests run `bash`; the skills run under the user's shell).
- [ ] Update the prose above the block so it states the dangling-link versus missing-directory distinction in one sentence.
- [ ] Run `npm run bundle` and confirm `npm run bundle:check` is clean.

### Phase 3: Lint test headroom

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Independent of** Phases 1 and 2, but measure after them so the figure includes the new cases.

- [ ] Measure first: record the per-test durations with the command in § 8.
- [ ] Load the tree once (memoise `loadTree()`), and re-measure.
- [ ] If the target in § 9 is not met, run the hostile-path cases for a site in one shell instead of one shell per case, and re-measure. Stop when the target is met.
- [ ] Keep every existing test, including "the path bound is the same block at every site".

### Phase 4: Record

**Risk**: Low. **Files**: `CHANGELOG.md`.

- [ ] Add an entry under `[Unreleased]` citing `(task 263)`.

---

## 7. Files Summary

Count of files carrying the block: `grep -rl "Bound the derived path" skills shared` from the repository root (9 at the time of writing: 3 sources and 6 bundled copies; the test reads the sources).

**Core implementation (3 sources)**

1. ✅ `skills/review-task/SKILL.md` - the real-path check
2. ✅ `skills/review-story/SKILL.md` - the same block
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` - the same block

**Generated (6, by `npm run bundle`, never edited by hand)**

4. ✅ `skills/{develop-bug,develop-story,develop-task,review-pr,review-story,review-task}/references/develop-pipeline-step-0-resolve-and-prepare.md`

**Tests**

5. ✅ `tests/untrusted-content-rule.test.js` - new cases, memoised tree load

**Documentation**

6. ✅ `CHANGELOG.md`

No new test file is planned. If one is added under `tests/`, the `tests/*.test.js` glob in `package.json` (`test:suite`) already picks it up.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the real-path check and the lint test's own cost.
- **Actions**: the Phase 1 cases, run against the old block (red) and the new block (green); the existing 33 tests unchanged.
- **Command**: `CI=true node --test tests/untrusted-content-rule.test.js`
- **Timing**: `CI=true node --test --test-reporter=spec tests/untrusted-content-rule.test.js` for per-test durations; `duration_ms` from the plain run for the total.

### Integration Tests

- `npm run bundle:check` and `npm run check:generated` for the six copies.
- `python skills/create-skill/scripts/quick_validate.py skills/review-task` and `skills/review-story`.

### Mutation proof

Revert each guard and name the test that goes red: drop the dangling/unenterable HALT, and drop the in-root comparison on the ancestor. Record the result in the QA report.

### Control case

The new cases quote the incident (a dangling link and a mode 000 directory). Add one case the change's text never mentions: a missing parent under a real subdirectory of `docs/` (kept), and one under `docs/link` (HALT), so a pass cannot mean the check only recognises the example.

---

## 9. Success Criteria

### Functional

- [ ] A parent chain that ends at a dangling link is a HALT with its own message (`has a parent that cannot be resolved`)
- [ ] A parent that exists but cannot be entered is a HALT with the same message (skipped for uid 0, stated in the test)
- [ ] `docs/link/new/x.md`, where `docs/link` leaves the tree, is a HALT with `resolves outside docs/ and the PRD root`
- [ ] A path whose parent does not exist under `docs/` or the PRD root is still kept
- [ ] The three blocks stay identical (the existing equality test), and a named test goes red when either new guard is deleted (mutation proof in the QA report)

### Performance

- [ ] `CI=true node --test tests/untrusted-content-rule.test.js` reports `duration_ms` of at most 1500 on three consecutive runs; the three figures and the command are recorded in the QA report

### Code Quality

- [ ] `CI=true npm test` passes
- [ ] `npm run validate -- skills/review-task/ skills/review-story/` passes
- [ ] `npm run bundle:check` and `npm run check:generated` are clean

### Migration

- [ ] `CHANGELOG.md` has an entry citing task 263
- [ ] The probe plan is re-run with `probes_executed` above 0, recorded in the DoD

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **Three copies of one shell block drift**
   - Risk: an edit lands in one source only.
   - Probability: Low. Impact: Medium.
   - Mitigation: the "same block at every site" test fails on any difference; edit only `shared/resources` and the two SKILL.md sources and run `npm run bundle`, never the bundled copies.
   - Rollback: revert the commit.

2. **The 1500 ms target is not reachable by memoising alone**
   - Risk: the saving from one tree load is an estimate (about 550 ms of about 830 ms), so the total may land between 1.4 and 1.6 s.
   - Probability: Medium. Impact: Low.
   - Mitigation: Phase 3 names the next step (one shell per site for the hostile cases) and stops when the figure is met; the criterion is a measurement, not an estimate.

### LOW RISK

1. **A mode 000 test cannot run as root**: skipped for uid 0 with the reason in the test name. A hosted runner normally runs as an unprivileged user, so the case should run in CI; the DoD records whether it ran or was skipped.
2. **A regular file used as a directory now HALTs**: stated in § 3; the read failed in that case already.

---

## 11. Rollback Plan

### Immediate Rollback (under 1 hour)

- **Triggers**: a legitimate task or story path is refused by the new check in a real pipeline run; or the lint test fails in CI for a reason other than a real regression.
- **Steps**: revert the merge commit for this task; run `npm run bundle` if any generated copy was edited separately; run `CI=true node --test tests/untrusted-content-rule.test.js`.
- **Validation**: the 33 task 262 tests pass and `npm run bundle:check` is clean.

### Partial Rollback (1 to 2 hours)

- Revert Phase 2 (the block) and keep Phase 3 (the test speed-up); they are independent.

### Forward Fix

- A false HALT on an unusual but legitimate layout: add the layout as a named case and narrow the ancestor decision, instead of reverting.

### Rollback Triggers

- **Critical**: a false HALT that blocks `/develop-task` or `/review-story` on a real document.
- **Non-critical**: a timing miss on a loaded machine; fix forward.

---

## Progress Tracking

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] QA gate PASS

---

## References

- Origin: [task.262.untrusted-content-path-bound-hardening.md](../task.262.untrusted-content-path-bound-hardening/task.262.untrusted-content-path-bound-hardening.md); QA report: [task.262.qa.1.untrusted-content-path-bound-hardening.md](../task.262.untrusted-content-path-bound-hardening/task.262.qa.1.untrusted-content-path-bound-hardening.md) (code-review item CR-1, and the lint test runtime section); DoD advisories: [task.262.dod.1.untrusted-content-path-bound-hardening.md](../task.262.untrusted-content-path-bound-hardening/task.262.dod.1.untrusted-content-path-bound-hardening.md)
- Rule: `shared/resources/untrusted-content-rule.md`

## Notes

- Created from the task 262 follow-up list. `tests/bundle-missing-source.test.js` is deliberately not part of this task.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-05 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->
