---
id: task.250
title: "Security-probe tests write no scratch files into the repository"
type: task
description: "Move every scratch directory security-probe.test.mjs creates inside the live repository into a disposable temp root passed to the engine as repoRoot, so no parallel suite that walks the tree can see a half-deleted file."
tags: [tests, security-probe, flake, parallel-tests]
category: testing
status: ready-for-review
priority: Low
created: 2026-11-02
updated: 2026-11-02
assignee:
estimated_effort_hours: 8
github_issue: 812
---

# Security-probe tests write no scratch files into the repository

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.250.review.1.security-probe-scratch-out-of-tree.md` implemented 2026-11-02

**GitHub Issue**: [#812](https://github.com/Gamaroff/agent-skills/issues/812)

---

## 1. Overview

`shared/resources/tests/security-probe.test.mjs` creates 12 scratch directories inside the live repository, at `shared/resources/tests/` and `tests/fixtures/shell-fn/`, and removes each one when its test ends. This task moves all of them into disposable temp roots under `os.tmpdir()`, passed to the probe engine as `repoRoot`, which is the pattern the task.158 and task.180 tests already use. After this, no security-probe test writes anything under the repository root.

**Scope**: The 12 in-tree `mkdtempSync` sites (one of them is the `t140Libs` helper, which 15 tests call), the fixtures those tests need copied into their temp roots, and a guard that keeps new in-tree writes out.

**Key deliverables**:

1. A shared temp-root helper, built on the existing `fenceRoot`, that can also copy in-tree fixtures (`FN_LIB`, `FAKE_GH`, named shared sources).
2. All 12 sites converted, with every existing assertion keeping its meaning, including the three containment tests.
3. A guard that fails when a security-probe test writes under `REPO_ROOT`.

---

## 2. Motivation

### Current Problems

1. **A parallel suite can read a half-deleted scratch file.** `node --test` runs files in parallel. Any suite that lists the tree and then reads each file can list a scratch file and find it gone. `tests/bundle-comment-origin.test.js` §2 did this three times between 2026-11-01 and 2026-11-02 (obs #145, Issue section). The third failure stopped the v0.63.0 `release.sh --tag`, although CI was green on the same commit.
2. **Only one reader is fixed.** PR #811 made that one scan read git-tracked files only. Other suites still walk these trees. The population is measured, not counted here (obs #117): `grep -rlnE "readdirSync\([^)]*(recursive|withFileTypes)|walk\(" tests shared/resources/tests evals/shared/tests skills/*/tests | xargs grep -lE "shared/resources|tests/fixtures"`. Each hit is a suite that could be next.
3. **The failure looks like a real defect.** The ENOENT names a file under `shared/resources/tests/`, the test carries no `LOAD-SENSITIVE` marker, and `release.sh` says to treat an unmarked failure as real. Each time it fires, someone loses time investigating.

### Benefits

1. **The race is gone at its source**, for every reader of the tree, present and future, rather than one reader at a time.
2. **The test suite stops writing to the checkout.** A parallel session's `git status`, `bundle --check`, or pre-commit hook can no longer see transient files.
3. **One helper, one pattern.** The task.158 and task.180 temp-root approach becomes the only way these tests build a root.
4. **A guard keeps it that way**, so a new test cannot quietly reintroduce an in-tree scratch directory.

---

## 3. Technical Background

### Current Architecture

The probe engine refuses an entry, a `--fake-gh` directory or a sourced library outside its containment root. That root is `repoRoot`, which defaults to the repository (`shared/resources/security-probe.mjs`, `resolveEntry(entry, repoRoot = defaultRepoRoot())` and `runProbeSpec`'s `repoRoot = defaultRepoRoot()`). The tests that needed a scratch target therefore put it inside the repository, so it was contained.

The 12 in-tree sites, found by `grep -nE "mkdtempSync\(\s*$|mkdtempSync\(join\(REPO_ROOT" shared/resources/tests/security-probe.test.mjs`, followed by the next line for each multi-line call:

| Line (2026-11-02) | Prefix | Test or helper |
|---|---|---|
| 737 | `shared/resources/tests/.t128-launch-` | shell entry: a TARGET's own 126/127 exit is compared (BUG-7) |
| 854 | `shared/resources/tests/.t128-errall-` | shell entry: escapes survive the all-errored decline (CR-3) |
| 884 | `shared/resources/tests/.obs73-` | record: `totals.escaped` sums every control's escapes (obs #73) |
| 1374 | `tests/fixtures/shell-fn/.t136-source-` | shell-fn: a library that fails to source is declined with 97 |
| 1582 | `tests/fixtures/shell-fn/.t136-collide-` | shell-fn: a function that itself exits 97 or 98 is scored (CR-2) |
| 1699 | `tests/fixtures/shell-fn/.t136-toplevel-exit-` | shell-fn: a top-level `exit` is a source failure |
| 1729 | `tests/fixtures/shell-fn/.t136-errexit-` | shell-fn: under `set -e` the function's own 97 is re-mapped (TASK-136-BUG-2) |
| 1809 | `tests/fixtures/shell-fn/.t140-${tag}-` | the `t140Libs(tag, libs)` helper, called by 15 tests (`grep -c "t140Libs(" …` = 16, including the definition) |
| 1951 | `tests/fixtures/shell-fn/.t140-symlink-` | resolveEntry: a symlink inside the root that points outside is refused |
| 2036 | `tests/fixtures/shell-fn/.t140-fakegh-` | `--fake-gh` containment is decided on real paths (TASK-140-BUG-2) |
| 2341 | `tests/fixtures/shell-fn/.t140-missing-` | resolveEntry: a missing path is contained by its deepest existing ancestor |
| 4348 | `shared/resources/tests/.t131-mutant-` | task.131: a `lintReport` mutant is caught by the isolated case |

The test file also writes under `REPO_ROOT` at lines 1972 and 2053 (`symlinkSync(…, join(dir, …))`, where `dir` is one of the scratch directories above). Lines 2041, 3957, 3958 and 4357 only read from `REPO_ROOT`; they copy fixtures out of it.

**The precedent already exists, in two forms:**

- `fenceRoot(files)` (`security-probe.test.mjs:4410`) builds `realpathSync(mkdtempSync(join(tmpdir(), "probe-fence-")))` and writes `files` into it. `saRoot` (line 5825) wraps it.
- The task.158 `..fake-gh` test (around line 3953, `probe-dotdot-gh-`) copies `FN_LIB` and `FAKE_GH` into a temp root and passes `repoRoot: root`. Its comment says this is so "nothing is ever written into the live repository (task.158 QA cycle 1, CR-4)".

Fixture constants (`security-probe.test.mjs:1242-1245`): `FN_LIB = "shared/resources/gh-labels.sh"`, `FN_ENTRY = "shell-fn:${FN_LIB}#gh_labels_filter"`, `FAKE_GH = "tests/fixtures/fake-gh"`, `FN_FIXTURES = "tests/fixtures/shell-fn"`.

### Target Architecture

- **One helper.** `fenceRoot` is generalised, or a sibling `probeRoot({ files, copy })` sits beside it and calls it, so a temp root can also take repository-relative fixtures copied from `REPO_ROOT` (`copy: [FN_LIB, FAKE_GH]`). Both return a realpathed root. **Do not add a third root builder**: `t140Libs` becomes a thin wrapper that returns `{ root, dir }` from the helper.
- **Every converted test passes `repoRoot: root`** (or the second argument to `resolveEntry` / `namesGh`), and builds entries and `fakeGh` relative to `root`, not `REPO_ROOT`.
- **Tests that source the library by path** (for example `if-source.sh` near line 2163, which embeds `join(REPO_ROOT, FN_LIB)`) point at the copy inside the temp root, so the sourced file is inside the root the engine checks.
- **A guard** fails when a security-probe test creates anything under `REPO_ROOT` (Phase 3).

### Important Clarifications

- **The three containment tests are about "the root", not about this repository.** Each asserts that something inside the containment root resolves and something outside it, reached by a symlink, does not. Against a temp root R and a separate temp directory O, the same assertions hold with R in place of `REPO_ROOT`. The premise checks become "O is outside R", and still apply because both sit under `tmpdir()`.
- **Parts that only read the repository stay as they are.** The "root reached through a symlink" rows (`symlinkSync(REPO_ROOT, viaLink)` with `viaLink` under `tmpdir()`) create nothing in the repository and can keep `REPO_ROOT`. Converting them is allowed but not required.
- **realpath matters.** `fenceRoot` realpaths its root because `tmpdir()` can itself be a symlink (on macOS `/var` → `/private/var`). Any assertion comparing `entryPath` to `join(root, …)` needs the realpathed root.

---

## 4. Scope

### In Scope

✅ **The 12 sites** in the table above, including the 15 tests reached through `t140Libs`.
✅ **The helper**: generalise `fenceRoot`, or add one sibling that copies fixtures.
✅ **The guard** that no security-probe test writes under `REPO_ROOT`.
✅ **The dead `.gitignore` rule.** `.gitignore` ignores `tests/fixtures/shell-fn/.t140-*/` (the block that starts `# Per-run library dirs from shared/resources/tests/security-probe.test.mjs`) so a run killed mid-test left no visible dirt. Once no test writes there, the rule only hides a regression: a reintroduced in-tree `.t140-*` directory would stay invisible to `git status`. Remove the rule and its comment.
✅ **A CHANGELOG `[Unreleased]` entry** citing task 250.

### Out of Scope

❌ **Other test files that write into the tree.** If the guard's design suggests a repository-wide version, record it as a follow-up observation. Do not widen this task to cover it.
❌ **The engine's containment rules** (`security-probe.mjs`). They are correct; only the tests move.
❌ **The readers.** PR #811 already fixed `bundle-comment-origin`. Other walkers become safe once nothing writes into the tree, and this task does not touch them.

---

## 5. Breaking Changes

None. This changes only a test file. No shipped skill, engine, configuration key or document shape changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.250.plan.security-probe-scratch-out-of-tree.md](task.250.plan.security-probe-scratch-out-of-tree.md)

### Phase 1: Guard first, red

**Risk Level**: Low

**Files**: `shared/resources/tests/security-probe.test.mjs`

**Changes**:

- [x] Add the guard (plan § Phase 1). Run it against today's file and confirm it is red, naming all 12 sites. That run is the calibration: a guard that has never caught the defect proves nothing.

**Dependencies**: None.

### Phase 2: The helper and the simple sites

**Risk Level**: Low

**Files**: `shared/resources/tests/security-probe.test.mjs`

**Changes**:

- [x] Generalise `fenceRoot` (or add `probeRoot` beside it) to copy repository-relative fixtures into the temp root.
- [x] Convert the `shell:` sites at lines 737, 854 and 884 (`.t128-launch-`, `.t128-errall-`, `.obs73-`).
- [x] Convert the `.t131-mutant-` site at line 4348: copy the three shared sources into the temp root, and pass `repoRoot`.
- [x] Convert the four `.t136-*` sites at lines 1374, 1582, 1699 and 1729: copy `FAKE_GH` into the root, and pass `repoRoot` and `fakeGh` relative to it.

**Dependencies**: Phase 1.

### Phase 3: `t140Libs` and its 15 callers

**Risk Level**: Medium

**Files**: `shared/resources/tests/security-probe.test.mjs`

**Changes**:

- [x] Change `t140Libs` to build a temp root with `FN_LIB` and `FAKE_GH` copied in, returning `{ root, dir }`. Update every caller: entries relative to `root`, `repoRoot: root`, `namesGh(…, root)`.
- [x] Repoint the absolute `source` path in `if-source.sh` (near line 2163) at the copy in the root.
- [x] Each caller's `finally` removes the root, not just `dir`.

**Dependencies**: Phase 2 (the helper).

### Phase 4: The three containment tests

**Risk Level**: Medium

**Files**: `shared/resources/tests/security-probe.test.mjs`

**Changes**:

- [x] Lines 1951 (`.t140-symlink-`), 2036 (`.t140-fakegh-`) and 2341 (`.t140-missing-`): build the scratch directory inside a temp root R, keep `outside` as a separate temp directory, and assert against R. Rewrite the premise checks to "outside is outside R". Each in-tree symlink (lines 1972 and 2053) points at R's copy of the fixture.
- [x] Keep every assertion's meaning, row for row. The plan lists each one and what it becomes.

**Dependencies**: Phase 2.

### Phase 5: Green and recorded

**Risk Level**: Low

**Files**: `CHANGELOG.md`, `.gitignore`

**Changes**:

- [x] Remove the `tests/fixtures/shell-fn/.t140-*/` rule and its comment block from `.gitignore` (see Scope).
- [x] The guard is green and the suite passes alone and under `npm test`.
- [ ] Run the before/after untracked-file check (Testing Strategy) and record its output in the QA report.
- [x] Add a CHANGELOG `[Unreleased]` → Fixed entry citing task 250.

**Dependencies**: Phases 1-4.

---

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/tests/security-probe.test.mjs`: the helper, 12 sites, the guard.

**Documentation:**

2. ✅ `CHANGELOG.md`: `[Unreleased]` entry citing task 250.

**Configuration:**

3. ✅ `.gitignore`: remove the now-dead `tests/fixtures/shell-fn/.t140-*/` rule.

No other file changes. `shared/resources/security-probe.mjs` is read, not edited.

---

## 8. Testing Strategy

**Unit (the suite itself):**

- `command node --test shared/resources/tests/security-probe.test.mjs` passes alone. The test count is unchanged except for the guard tests this task adds.
- For each converted test, the assertion it makes is unchanged. Only the root it makes it against changes. The plan's per-site table is the checklist.

**The guard, calibrated (Phase 1):** red on today's file, naming all 12 sites; green after Phase 4. Then a mutation: put one `mkdtempSync(join(REPO_ROOT, …))` back, confirm the guard goes red, and revert.

**Behavioural check (no in-tree writes):** in a quiet checkout (no other suite running), take `git status --porcelain --untracked-files=all --ignored` before and after a run of `security-probe.test.mjs`, plus a filesystem watch during the run (`inotifywait -m -r -e create shared/resources/tests tests/fixtures`, or a polling snapshot loop at 50 ms). The after-snapshot alone proves nothing, because every site already cleans up in `finally`. The watch during the run is the evidence. Record the command and the empty result in the QA report.

**Containment premise control:** for each of the three containment tests, temporarily make the root wrong, for example pass `REPO_ROOT` while the scratch directory sits under R. Confirm the test fails, so it still exercises containment rather than passing trivially.

**Integration:** `npm test` green, and `npm run test:clean-checkout`.

---

## 9. Success Criteria

### Functional

- [ ] No test in `security-probe.test.mjs` creates a file, directory or symlink under `REPO_ROOT`. Checked by the guard (Phase 1) and by the watched run (Testing Strategy), whose output is recorded in the QA report.
- [ ] Every test that existed before still exists under the same name and makes the same assertions against its root. The QA report lists each converted test with "before → after" for its root and premise.
- [ ] The three containment tests still fail when their root is wrong (premise control, recorded in the QA report).

### Performance

- [ ] The suite's runtime alone does not grow by more than 10%: the median of 3 runs of `uptime; time command node --test shared/resources/tests/security-probe.test.mjs` on the base commit and on the PR's head commit, taken back to back on one machine with no other suite running, recorded with the `uptime` load line in the QA report. Copying two small fixtures per test should cost milliseconds.
- [ ] No temp roots are left behind after a run: `npm test`'s temp-directory ratchet (`scripts/test-tmpdir.mjs`) reports no new or over-count prefix for this suite. Every new temp root is removed in its test's `finally`, so no ratchet entry is added.

### Code Quality

- [ ] One root builder: `fenceRoot`, generalised or wrapped. No third independent builder.
- [ ] `npm run format:check` and `npm test` pass, as does `npm run lint:shell` if any `.sh` fixture is touched.
- [ ] The guard was red on the pre-change file and goes red on a one-site mutation (recorded in the QA report).

### Migration

- [ ] CHANGELOG `[Unreleased]` cites task 250.

---

## 10. Risk Assessment

### MEDIUM RISK

1. **A containment test passes for the wrong reason after the move.**
   - Risk: with R and O both under `tmpdir()`, a mistake in which root is passed could make the "outside" row pass trivially, or the "inside" row resolve for a reason that has nothing to do with containment.
   - Probability: Medium. Impact: High, because this is a security control's test.
   - Mitigation: the premise control in Testing Strategy. Each test must fail when its root is wrong.
2. **Hidden dependence on the real repository.** A `t140Libs` caller may rely on something present in the real tree but not in the temp root (a sourced sibling, a template, `LABEL_CASES` fixtures).
   - Probability: Medium. Impact: a test declines (`entry-not-probeable`) instead of scoring, and the assertion fails loudly.
   - Mitigation: copy what the failure names into the root. Never relax an assertion to make it pass.

### LOW RISK

3. **realpath mismatch** on a system whose `tmpdir()` is a symlink. Mitigation: the helper realpaths its root, as `fenceRoot` already does.
4. **Merge conflicts in a 7,904-line file** that recent tasks touched often (task.234's six commits are the latest, `git log --oneline -6 -- shared/resources/tests/security-probe.test.mjs`). Mitigation: land it in one PR, and rebase before QA.

---

## 11. Rollback Plan

**Immediate rollback (< 1 hour):**

- Triggers: a containment test is green for the wrong reason, or the suite is flaky after merge.
- Steps: `git revert` the merge commit. The change is confined to one test file and one CHANGELOG entry.
- Validation: `npm test` green. PR #811's fix keeps `bundle-comment-origin` safe in the meantime.

**Partial rollback:** revert only the Phase 4 containment edits, leaving the guard's allowlist with those three sites and their reason, and file a follow-up.

**Forward fix:** a single test that declines after the move gets its missing fixture copied in. Fix forward.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-02
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.250.qa.1.security-probe-scratch-out-of-tree.md](./task.250.qa.1.security-probe-scratch-out-of-tree.md)
- **Gate File**: [task.250.gate.1.security-probe-scratch-out-of-tree.yml](./task.250.gate.1.security-probe-scratch-out-of-tree.yml)

### Test Coverage Summary

- **Tests Executed**: 276
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings

The new guard's stale-allowlist check is vacuous: it matches its own string literal (TASK-250-CR-1, medium, reproduced). Temp roots can leak on a throw before `try` (TASK-250-CR-4, low). Every success criterion is met: 0 in-tree creates (61 before), the premise controls fail under the wrong root, and runtime is unchanged.

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
| ---- | ------- | ----------- | ------ |
| 2026-11-02 | 1.0 | Initial draft | create-task |
| 2026-11-02 | 1.1 | Review passed (9/10): added removal of the dead `.t140-*` `.gitignore` rule; Performance criteria now name the timing command and the `scripts/test-tmpdir.mjs` ratchet | review-task |
| 2026-11-02 |  | Status → ready-for-development | review-task |
| 2026-11-02 |  | Implemented — 3 files, 2 tests | develop |
| 2026-11-02 |  | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-11-02 |  | QA findings fixed — CR-1, CR-4 (plus advisory CR-2, CR-3), 1 iteration | qa-fix |

<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: Guard first, red
- [x] Phase 2: The helper and the simple sites
- [x] Phase 3: `t140Libs` and its 15 callers
- [x] Phase 4: The three containment tests
- [x] Phase 5: Green and recorded

## References

- Observation #145 (actioned by PR #811): the race between `bundle-comment-origin` §2 and the `.t131-mutant-*` scratch directory.
- PR #811: the narrow fix, which made `bundle-comment-origin` read git-tracked files only.
- task.158 QA cycle 1, CR-4: the `..fake-gh` temp-root precedent.
- task.180: `fenceRoot`.

## Notes

- QA report: `task.250.qa.{N}.security-probe-scratch-out-of-tree.md`
- Bug reports: `task.250.bug.{N}.{name}.md`
- Quality gate: `task.250.gate.{N}.security-probe-scratch-out-of-tree.yml`, in this directory.
