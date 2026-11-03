---
id: task.254
title: "security-probe: a cli: entry can run a fixture setup"
type: task
description: "Let the cli: entry form take --fixture-setup (today shell-argv: only) so a Node or Python CLI that needs a git repository is probed instead of declined, and make the path-input decline say why."
tags: [finalise, observation, security-probe]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-11-03
updated: 2026-11-03
estimated_effort_hours: 8
---

# Technical Task: security-probe: a cli: entry can run a fixture setup

**Status:** Ready for Review

> Cut from observation #152. **The observation's own remedy was wrong and is corrected here.** It asked for "a shell-argv entry form with a committed fixture-setup script". That form already exists (task.181) and takes a bash script. The gap is the Node and Python `cli:` form, which cannot take the setup. See Technical Background.

---

## 1. Overview

On task 252, `/finalise` could not probe `shared/resources/migrate-doc-numbering.mjs`. The engine ran zero probes, the zero-guard counted that as a security FAIL, and acceptance needed a recorded human override. Two separate causes sat behind it. This task removes the one that is a real engine gap (repository state is unreachable on `cli:`) and makes the other (a path-bearing input declined by a filename sink) explain itself and be avoidable.

**Scope**: `shared/resources/security-probe.mjs` (the `cli:` arm and its argument checks), its tests, the boundary-rule and security-prompt prose that states the limit, the bundled copies, and `CHANGELOG.md`.

---

## 2. Motivation

### Current Problems

1. **A Node or Python CLI that reads git state cannot be probed.** `--fixture-setup` is refused for every form but `shell-argv:` (`security-probe.mjs:1738`, `:4492`). Fixture files are text, so no commit or index can exist. The prompt says so and tells the reader to take an override (`shared/resources/finalise-dod-security-prompt.md:66`, "obs #221").
2. **Every override is unchecked security risk.** T252 went through on its own tests alone.
3. **The decline on a path-bearing input does not say why.** `fixture: cannot materialise "docs/prd": name carries a path separator or NUL` reads as an engine limit. The real cause is the `filename` sink, which writes the input as a file name (`security-probe.mjs:2893`, `writeInput: fixture !== null`). Whether a non-materialised sink avoids it on `cli:` is **(unverified)** until Phase 1 runs it.
4. **The wrong remedy was recorded.** Observation #152 named an entry form that already exists, which would have sent a developer to build a second one.

### Benefits

1. A `cli:` probe of a git-reading CLI executes, and the zero-guard stops needing an override for that class.
2. One setup mechanism serves both forms, so they cannot drift on what a setup may write.
3. The decline names the sink and the way out.
4. The documented limit is removed, not left stale.

---

## 3. Technical Background

### Current Architecture

Every line below was found with `grep -n` on `shared/resources/security-probe.mjs` unless stated.

- The `cli:` arm is `runCliCase` (`:2825`). It writes the case's `fixture.files` (`:2900`, `writeFixtureFiles` `:3009`), then spawns the CLI with `cwd: fixtureDir` (`:2918`). It runs no setup.
- The `shell-argv:` arm is `runShellArgvCase` (`:3158`). Its setup block (`:3255-3290`) runs `bash <setup> <case-dir>` through `caseWatchedSpawn`, watches the setup's writes in their own list, and marks the run `errored` if the setup fails, times out or writes outside the case directory.
- Validation: `--fixture-setup` is accepted only when `isShellArgvForm` (`:1736`) and, on the command line, only when `isShellArgvEntry` (`:4492`).
- The existing test `"--fixture-setup on a cli: entry"` (`shared/resources/tests/security-probe.test.mjs:6034`) asserts the refusal. It must change with the behaviour.
- The limit is stated in more places than the engine header (`security-probe.mjs:207-209`) and `probe-boundary-rule.md:166`. The defining search is `grep -rn "fixture-setup\|fixture_setup" shared/resources/*.md shared/resources/security-probe.mjs`. Sites that say `--fixture-setup` is `shell-argv:`'s or unreachable on `cli:`: `finalise-dod-security-prompt.md` lines 61-65 and 257-258 (the example comment "there is no --fixture-setup here"), `probe-boundary-rule.md` lines 166, 552, 572-587 and 683, `security-review-prompt.md` lines 105 and 176. Lines 266-275 of the prompt are the `shell-argv:` example and stay.
- **The `cli:` arm cannot call the shell-argv setup spawn as it stands.** `runShellArgvCase` runs its setup through `caseWatchedSpawn` (`:3076`), which needs `harnessDir` (it reads `${basename(harnessDir)}/${GH_TRIPPED}` at `:3092`) and a `shell`. `runCliCase` is called without `harnessDir` (`:2029-2042`) and spawns through `watchedSpawn` directly. The shared helper therefore has to make those two inputs optional or supply them to the `cli:` arm; copying the spawn into `runCliCase` is the second mechanism this task forbids.
- Prior art for cause A: the prompt already says `--sink filename` declines input `.` and tells the reader to use a sink that is not materialised (`finalise-dod-security-prompt.md:253-256`). Phase 1 confirms that for a path such as `docs/prd`; Phase 3 makes the engine say it, so the reader does not have to find the prompt.
- The plan engine passes entry arguments through as raw argv, so `security-probe-plan.mjs` carries no `fixtureSetup` handling and needs none **(verified: no `fixtureSetup` hit in that file)**.
- Bundled copies of the engine live in `skills/finalise`, `skills/review-security`, `skills/qa-story` and `skills/qa-task` (`find skills -name security-probe.mjs`).

**A second mechanism for a job the file already does.** The setup block at `:3255-3290` is the job. The new `cli:` path must not copy it. The plan extracts it into one helper that both arms call. The extraction is a refactor of working, tested code, so Phase 2 holds the existing shell-argv setup tests green before and after.

### Target Architecture

- `--fixture-setup <path>` is valid with `cli:` and `shell-argv:`, validated and contained the same way (still refused with `shell:`, `shell-fn:` and `fence:`).
- `runCliCase` runs the shared setup helper after writing the fixture files and before the spawn, in each case directory, for Node and Python alike.
- The record carries `fixture_setup` for a `cli:` control as it does for `shell-argv:`.
- The `cannot materialise` decline names the sink and the way out.
- The prompt and the boundary rule drop "not reachable on `cli:` yet" and say how to probe repository state on `cli:`.

### Important Clarifications

- **Not claimed, to be run in Phase 1:** that a clean control for `migrate-doc-numbering.mjs` is accepted inside a scratch repository. The by-hand attempt on T252 failed its clean control (`post-check-failed`) and was discarded. Phase 1 finds out why before anything is promised.
- A setup that needs git identity must set it itself. The sandbox sets HOME inside the sandbox, so there is no global git config.

---

## 4. Scope

### In Scope

✅ **Engine**: `--fixture-setup` on `cli:` (Node and Python), one shared setup helper, record field, argument and library validation.
✅ **Decline wording**: the `cannot materialise` message, on both arms that raise it (`:2583`, `:2897`).
✅ **Docs**: the engine header, `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md` and `CHANGELOG.md` — every site the § 3 search lists.
✅ **Proof**: the T252 probe plan re-run on `cli:` with a setup, recorded in the QA report.

### Out of Scope

❌ A new entry form. `shell-argv:` already exists and stays as is.
❌ `fence:`, `shell:` and `shell-fn:` setups. None has the need.
❌ Changing the zero-guard. It stays a FAIL; this task makes it satisfiable for one more class.
❌ Re-deciding T252's override. It stands.

---

## 5. Breaking Changes

### Breaking Change 1: `--fixture-setup` with `cli:` is accepted

**What Changed**: a combination the engine refused (`bad-fixture-setup`) is now valid.

**Before**: `--entry cli:x.mjs --argv '["{input}"]' --fixture-setup setup.sh` exits 2.

**After**: the same call runs the setup in each case directory, then the CLI.

**Impact**: only a caller that relied on the refusal. The one known reliance is the test at `security-probe.test.mjs:6034`. Plans in `docs/` that pass the flag with `cli:` would have exited 2 and so cannot exist in a working state.

**Migration Path**: update the test; no consumer change.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.254.plan.probe-engine-cli-fixture-setup.md](task.254.plan.probe-engine-cli-fixture-setup.md)

### Phase 1: Reproduce both causes

**Risk Level**: Low

**Files**:
- `shared/resources/tests/security-probe.test.mjs`

**Changes**:
- [x] Reproduce cause B: a `cli:` entry that runs `git rev-parse --is-inside-work-tree` in its cwd, with a case that needs a repository. Show it cannot get one today (zero executed probes).
- [x] Reproduce cause A: a `cli:` case with `--sink filename` and input `docs/prd`, and the same case with a non-materialised sink. Record which declines and which runs.
- [x] Find why the by-hand clean control for `migrate-doc-numbering.mjs --check --root docs/prd` failed `post-check-failed`, using the committed cases file `task.252.dod.1.security.cases.json`.

**Dependencies**: none.

---

### Phase 2: One setup helper, used by both arms

**Risk Level**: Medium

**Files**:
- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`

**Changes**:
- [x] Extract the setup block from `runShellArgvCase` into a helper. Run the existing shell-argv setup tests first and after; they must stay green.
- [x] Make the helper's spawn work without `harnessDir` and `shell` (see § 3): parameterise `caseWatchedSpawn` rather than copy it. The `cli:` setup keeps shell-argv's containment: a write to the sandbox HOME or TMPDIR, or to a sibling case directory, errors the run.
- [x] Call the helper from `runCliCase` between `writeFixtureFiles` and the spawn, passing `setupPath` through the `runCliCase(c, {...})` call at `:2029`.
- [x] Accept `--fixture-setup` for `cli:` in the library check (`:1736`) and the command-line check (`:4492`); keep refusing it for the other forms.
- [x] Carry `fixtureSetup` into the `cli:` record.
- [x] Replace the `"--fixture-setup on a cli: entry"` test with its inverse and add refusals for `shell:`, `shell-fn:` and `fence:`.

**Dependencies**: Phase 1.

---

### Phase 3: Say why a path-bearing input is declined

**Risk Level**: Low

**Files**:
- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`

**Changes**:
- [x] Reword the two `cannot materialise` declines to name the sink and say that a sink listed in `MATERIALISED_SINKS` writes the input as a file name, and that a path-bearing input needs a sink that does not.
- [x] Test the wording and that a non-materialised sink with a path input runs (if Phase 1 shows it does).

**Dependencies**: Phase 1.

---

### Phase 4: Documentation, bundles and proof

**Risk Level**: Low

**Files**:
- `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`
- generated copies under `skills/*/references/`

**Changes**:
- [x] Update every doc site the § 3 search lists (four files, not three); remove "not reachable on `cli:` yet" and the obs #221 pointer's premise. Re-run the search afterwards: no remaining hit may say `--fixture-setup` is `shell-argv:`'s only.
- [x] `npm run bundle`, then `npm run bundle:check`.
- [x] Re-run the T252 probe plan on `cli:` with a committed setup script; record the command and result in the QA report.

**Dependencies**: Phases 2 and 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` - shared setup helper, `cli:` accepts `--fixture-setup`, decline wording

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/security-probe.test.mjs` - replace the `cli:` refusal test, add setup and wording tests

### Files to Modify (Documentation)

3. ✅ `shared/resources/finalise-dod-security-prompt.md` - drop the "not reachable on `cli:`" limit and the "no --fixture-setup here" example comment
4. ✅ `shared/resources/probe-boundary-rule.md` - `bad-fixture-setup` row, the `--fixture-setup` bullet (lines 572-587) and the form guidance (552, 683)
5. ✅ `shared/resources/security-review-prompt.md` - lines 105 and 176 say `--fixture-setup` belongs to `shell-argv:`
6. ✅ `CHANGELOG.md` - the new capability and the changed refusal

### Generated (by `npm run bundle`)

7. ✅ `security-probe.mjs` in `skills/{finalise,review-security,qa-story,qa-task}/references/`, `finalise-dod-security-prompt.md` in `skills/{finalise,qa-story,qa-task}/references/` (three copies, not four), `probe-boundary-rule.md` in `skills/{qa-story,qa-task}/references/`, `security-review-prompt.md` in `skills/review-security/references/`

The set of bundled copies is defined as: files named `security-probe.mjs`, `finalise-dod-security-prompt.md`, `probe-boundary-rule.md` or `security-review-prompt.md` under `skills/`. Command: `find skills \( -name security-probe.mjs -o -name finalise-dod-security-prompt.md -o -name probe-boundary-rule.md -o -name security-review-prompt.md \)`. Measured 10 on 2026-11-03. `npm run bundle:check` is what holds the copies, not this count.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the `cli:` arm with a setup; argument validation; the decline wording.

**Actions**:
- [ ] A `cli:` Node entry that exits 0 only inside a git work tree is `accepted` with a setup that runs `git init`, and `errored` (not `rejected`) when the setup exits non-zero.
- [ ] The same for a Python entry.
- [ ] A setup that writes outside the case directory (the sandbox HOME, and a sibling case directory) makes the run `errored`, named.
- [ ] `--fixture-setup` is refused (exit 2, `bad-fixture-setup`) with `shell:`, `shell-fn:` and `fence:`.
- [ ] The existing shell-argv setup tests pass unchanged.
- [ ] **Control case**: a hostile case the setup never mentions, and a legitimate case the guard must accept, so a pass does not mean the example was recognised.

**Command**: `command node --test shared/resources/tests/security-probe.test.mjs`

**Target**: all existing tests plus the new ones pass.

### Mutation

- [ ] Remove the `cli:` call to the helper: the new setup test goes red. Restore.
- [ ] Re-add the `cli:` refusal: the new acceptance test goes red. Restore.
- [ ] Inline a private setup spawn in the `cli:` arm in place of the helper call: the escape test (a `cli:` setup writing to a sibling case directory is `errored`) goes red. This is what holds "one helper", with the structural assertion in § 9 as a second line.

### Consumer Tests

**Scope**: the four bundled copies behave as the source does.

**Command**: `npm run bundle:check` and `npm test`.

---

## 9. Success Criteria

### Functional

- [ ] `--entry cli:<node or python script> --fixture-setup <script>` runs the setup in each case directory before the CLI.
- [ ] A setup that fails, times out, or writes outside the case directory makes the run `errored`, never `rejected` (Phase 2 states the branch).
- [ ] `--fixture-setup` is still refused with `shell:`, `shell-fn:` and `fence:`.
- [ ] The T252 probe plan, re-run on `cli:` with a committed setup that runs `git init`, executes at least one probe and is no longer declined `entry-not-probeable`. Command and result are recorded in the QA report. (Whether its clean control is accepted is decided in Phase 1, not promised here.)
- [ ] The `cannot materialise` decline names the sink.

### Performance

- [ ] A `cli:` run without `--fixture-setup` spawns no extra process (asserted by a test).

### Code Quality

- [ ] One setup helper, called by both arms (asserted by a test that fails if either arm inlines its own).
- [ ] `command node --test shared/resources/tests/security-probe.test.mjs` passes.
- [ ] `npm test` and `npm run bundle:check` pass.
- [ ] Every mutation in § 8 turns a test red.

### Migration

- [ ] `CHANGELOG.md` records the capability and the changed refusal, citing task 254.
- [ ] The prompt and the boundary rule no longer say repository state is unreachable on `cli:`.

---

## 10. Risk Assessment

### High Risk Areas

**1. A weakened sandbox.** The setup is code the engine runs.
- **Risk**: the `cli:` setup path escapes the case directory or skips the write watch.
- **Probability**: Low
- **Impact**: Critical
- **Mitigation**: reuse the one helper, so the containment and write-watch rules are the shell-argv ones, and test the escape case.
- **Rollback**: revert the `cli:` call site; the helper stays for `shell-argv:`.

### Medium Risk Areas

**1. The refactor changes shell-argv behaviour.**
- **Risk**: extracting the setup block alters an existing form.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the existing shell-argv setup tests run before and after; Phase 2 does not proceed on a red.
- **Rollback**: restore the inline block.

**2. The T252 clean control still fails.**
- **Risk**: the probe executes but the legitimate case is `rejected`, so the verdict is `rejects-every-input`.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: Phase 1 finds the cause first; the criterion asks for an executed probe, not a verdict.
- **Rollback**: none needed.

### Low Risk Areas

**1. Bundle drift.** Mitigation: `npm run bundle` then `bundle:check` in Phase 4.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A shell-argv setup test goes red after Phase 2.
- A setup escapes the sandbox in a test.

**Steps**:
1. Revert the merge commit.
2. `npm run bundle` to restore the copies.
3. Re-run `npm test`.

**Verification**: `npm test` and `npm run bundle:check` pass.

---

### Partial Rollback (1-2 hours)

**When to Use**: Phase 3's wording is wrong but Phase 2 is sound.

**Steps**:
1. Revert the Phase 3 commit only.
2. Re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: a doc inaccuracy or a missing record field.

**Approach**: fix forward in a follow-up commit; no behaviour change is involved.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- Any existing probe test goes red on a form other than `cli:`.
- A `cli:` setup can write outside its case directory unnoticed.

**Non-Critical (Forward Fix)**:
- Decline wording or doc drift.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-03
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.254.qa.1.probe-engine-cli-fixture-setup.md](./task.254.qa.1.probe-engine-cli-fixture-setup.md)
- **Gate File**: [task.254.gate.1.probe-engine-cli-fixture-setup.yml](./task.254.gate.1.probe-engine-cli-fixture-setup.yml)

### Test Coverage Summary
- **Tests Executed**: 284
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
One MEDIUM finding: the "no extra process without a setup" criterion is held only by a record field, not a test that observes spawns (T254-QA-1). All three mutations turn a committed test red.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                | Author      |
| ---------- | ------- | ------------------------------------------ | ----------- |
| 2026-11-03 | 1.0     | Initial draft — cut from observation #152  | create-task |
| 2026-11-03 | 1.1     | Review passed (8/10) — added the `harnessDir` constraint on the shared helper, the full doc-site list (4 files, search recorded), corrected bundled-copy counts, and a sibling-case escape test and mutation | review-task |
| 2026-11-03 |         | Status → ready-for-development | review-task |
| 2026-11-03 |         | Implemented — 4 source files + 3 fixtures, 8 new tests (284 pass), 3 mutations red | develop |
| 2026-11-03 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 finding, 1 iteration | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Reproduce both causes
- [x] Cause B reproduced
- [x] Cause A reproduced, with and without the filename sink
- [x] Clean-control failure explained

### Phase 2: One setup helper, used by both arms
- [x] Helper extracted, shell-argv tests green
- [x] `cli:` runs the setup
- [x] Argument checks and record updated

### Phase 3: Say why a path-bearing input is declined
- [x] Wording changed on both arms
- [x] Tests

### Phase 4: Documentation, bundles and proof
- [x] Docs and CHANGELOG
- [x] Bundle and bundle:check
- [ ] T252 plan re-run recorded in the QA report (run done in Step 3; the QA report records it)

---

## References

- **Observation**: #152 — Probe engine cannot probe a CLI that needs a git repository (its remedy is corrected above)
- **Earlier engine tasks**: task.144 (the `cli:` form), task.181 (the `shell-argv:` form and `--fixture-setup`), task.216 (`cli:` fixture files), task.215 (Python `cli:`)
- **Where it bit**: task.252 — `task.252.dod.1.security.cases.json` is the reproduction input
- **Engine**: `shared/resources/security-probe.mjs`; rule: `shared/resources/probe-boundary-rule.md`

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only; `npm run bundle` regenerates the copies.
- Mutation-prove every fix.
- Use `command node` (nvm shell function).

### Future Improvements

- Have the security planning agent say, before it records `boundary: true`, which entry form can reach the guard.

---

**Status:** Ready for Review

**Next Steps**:
1. Implement according to the plan with `/develop-task`.
2. Mark checkboxes as completed.
3. QA will create the QA report, gate and any bug files in this directory.
