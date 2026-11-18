---
id: task.280
title: "Skill and test tooling see what ships"
type: task
description: "Make three checks look at what actually ships: flag a quote inside a ${NAME:?message} guard, require executed-block tests to use the one fence reader (with a fence-balance check), and have bundle:check scan skill-owned reference docs for unvendored scripts."
tags: [create-skill, observation]
category: refactoring
status: ready-for-review
pr_number: 919
priority: Medium
created: 2026-11-06
updated: 2026-11-18
estimated_effort_hours: 12
---

# Task 280: Skill and test tooling see what ships

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.280.review.1.skill-and-test-tooling-see-what-ships.md` implemented 2026-11-18

---

## 1. Overview

Three checks pass while looking at the wrong thing: a block whose `${NAME:?message}` guard holds an apostrophe parses only when a test runs it; tests that run skill blocks find them with a hand-written regex; and `bundle:check` skips skill-owned reference docs (obs #47, #48, #112). A fourth, probe scratch directories in a walked tree (obs #102), was fixed on `develop` before this task started; see §2.

**Scope**: one lint, one test-helper rule with a repository-wide fence-balance check and a ratchet over the hand-written fence readers in `tests/`, and one discovery change in `bundle_skill.py`.

---

## 2. Motivation

### Current Problems

1. **An apostrophe inside a `:?` word breaks the block** (obs #47). On task.205 `skills/create-epic/SKILL.md` failed `bash -n` (`unexpected EOF while looking for matching '"'`) because of `: "${DOMAIN:?bind DOMAIN to the epic's domain directory}"`; it was caught only because a test ran the block. **Status at `develop` `ce2fed589` (2026-11-18): the instance is fixed** (`skills/create-epic/SKILL.md:109` now reads `${DOMAIN:?bind DOMAIN to the domain directory of the epic}`), and a search for a `'` inside a `${NAME:?…}` word over `skills/**/*.md` and `shared/resources/*.md` finds none. The lint therefore starts with no offenders and needs a fixture to show it is not vacuous.
2. **A hand-written fence regex passes on blocks no engine sees** (obs #48). `tests/epic-numbering-retirement.test.js` used `/^([ \t]*)```bash\n([\s\S]*?)^\1```/gm`, which ignores fence nesting. A stray four-backtick fence in `skills/create-epics-from-shards/SKILL.md` put Steps 6–7 inside a code block; the test still passed for five QA cycles. **Status: both instances are fixed** by `6b33e2985` (task.205 qa-fix cycle 6, 2026-10-15): the stray fence is gone (the file's remaining fences at `:302`/`:348` and `:442`/`:470` pair up) and `tests/epic-numbering-retirement.test.js` imports `extractBlocks`. **The class is not fixed**: 43 lines in 20 tracked files under `tests/` (excluding `tests/fixtures`) still mention a ` ```bash ` / ` ```sh ` fence, and about a dozen of them hold a hand-written block extractor (listed in Phase 2).
3. **`bundle:check` misses an invocation in a skill-owned reference** (obs #112). On task.238 `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` gained `bash .agents/skills/develop-bug/references/fast-gate-outcome.sh`; `npm run bundle` did not vendor the script and `bundle:check` returned rc 0. **Status: open** — `bundle_skill.py:622` still skips every file under `references/`.
4. **Probe mutants race the live-tree scan** (obs #102). `npm run ci` on task.233 failed 1 of 6,340 tests: `tests/bundle-comment-origin.test.js` §2 threw ENOENT on `shared/resources/tests/.t131-mutant-vv92na/change-log.js` while the probe test deleted it. **Status: fixed, out of scope.** Both halves landed before this task: `bundle-comment-origin` §2 lists git-tracked files only (`tests/bundle-comment-origin.test.js:126`, `git ls-files`; CHANGELOG, obs #145), and `security-probe.test.mjs` builds every scratch root with `fenceRoot()` under `tmpdir()`, refusing a root inside the repository (`:4729` for the `t131-mutant-` case; static guard at `:8555`). The race can still show as a flake only if that guard is bypassed, which its own test covers.

### Benefits

1. The failure appears where the defect is authored, not in a later run.
2. A test that executes skill blocks executes the same blocks the engines do.
3. `bundle:check` means every shipped invocation resolves.

---

## 3. Technical Background

### Current Architecture

Re-verified by `grep` on 2026-11-18 at `develop` `ce2fed589` (the first measurement was 2026-11-06 at `bdd755c7`).

- `skills/create-skill/scripts/bundle_skill.py:585` `def discover_needed(skill_path, shared_dir, refs_dir)`; `:622` filters scanned files with `'references' not in f.relative_to(skill_path).parts`, so a skill-owned reference doc is never scanned.
- `tests/unbound-default-reads.test.js` scans every `${NAME:-…}` / `${NAME:?…}` read inside a ` ```bash ` / ` ```sh ` fence (obs #47); it finds the fences with its own regex (`:192`). `tests/bundle-comment-origin.test.js` exists.
- `shared/resources/qa-execute-snippets.mjs:70` `export function extractBlocks(markdown)` is the one fence reader; its header states it reads only the `bash` info string. Today only `tests/epic-numbering-retirement.test.js` and the executed-prose helper (`shared/resources/tests/lib/executed-prose.mjs`) call it from `tests/` and the shared helper tests.
- The bundle script's tests are `tests/bundle-*.test.js` (`bundle-check-mode`, `bundle-citation`, `bundle-transitive`, `bundle-missing-source`, …). There is no `skills/create-skill/tests/` directory.
- `shared/resources/tests/security-probe.test.mjs` is already isolated: `fenceRoot()` (under `tmpdir()`) builds every scratch root, and `tests/bundle-comment-origin.test.js:126` lists tracked files only. Scratch location is not part of this task.

### Target Architecture

- **Lint** (obs #47): flag a `'` (or any unescaped quote) inside the word of a `"${NAME:?word}"`, in `unbound-default-reads.test.js`; the convention is stated beside the loud-failure-guard rule in `create-skill`. The lint has no current offender, so its test is a fixture pair (flagged, and the control that is not).
- **Fence reader** (obs #48): a test that executes or lints a ` ```bash ` / ` ```sh ` block from a `SKILL.md` or shared resource gets its blocks from `extractBlocks`. A repository-wide **fence-balance** check fails a file that ends with a fence still open, or that closes a fence that was never opened, so an unbalanced fence fails when it is authored. **The check is a balance check, not a count equality** (review finding, measured 2026-11-18): comparing `extractBlocks`' bash-block count with the raw ` ^\s*```bash ` line count fails five balanced files, because an example ` ```bash ` fence nested inside a ` ````markdown ` wrapper is a raw line but correctly not a block (`shared/resources/security-review-prompt.md` 1 vs 2, `skills/create-parallel-stories/SKILL.md` 10 vs 14, `skills/mermaid-architect/SKILL.md` 0 vs 1, `skills/qa-story/SKILL.md` 24 vs 25, `skills/qa-task/SKILL.md` 26 vs 27). The balance walk lives beside `extractBlocks` in `qa-execute-snippets.mjs` as one new export that shares its line walk, so there is one fence definition; `extractBlocks`' output does not change.
- **Hand-written fence readers in `tests/`** are held by a ratchet: a guard test fails on a regex literal or `matchAll`/`match` over a triple backtick fence in `tests/` that is not in an allowlist. Each allowlist entry carries a reason (a non-bash language such as `yaml`/`mermaid`/`markdown`, which `extractBlocks` does not read; a scanner that tracks fence state line by line and extracts no body; a fixture string). Extractors of ` ```bash ` bodies are migrated to `extractBlocks`, not allowlisted; a reader of ` ```sh ` fences stays allowlisted with the reason that `extractBlocks` returns `bash` only.
- **Discovery** (obs #112): `discover_needed` (or `bundle:check`) scans skill-owned `references/*.md` for the invocation form and fails when the named script is neither present nor vendorable.

### Important Clarifications

- **No known fence defect remains in `skills/create-epics-from-shards/SKILL.md`** (fixed by `6b33e2985`); the balance check is expected to find none today. If it finds one, it is fixed here and named in the QA report.
- Scanning skill-owned reference docs must not pick up examples in prose; the plan uses the same invocation-form rule discovery already uses for `SKILL.md`. A skill-owned reference doc is one without the `AUTO-GENERATED — DO NOT EDIT` marker line the bundler writes into generated copies. An invocation in a skill-owned doc becomes a **dependency** (it bundles the script); a fragment citation (`X.md#section`) and a bare mention inside `<!-- cite: … -->` stay citations, per the cite-or-depend rule in `create-skill`.

---

## 4. Scope

### In Scope

✅ **The three checks** (quote lint, fence balance plus the `tests/` ratchet, skill-owned reference discovery) and their tests.
✅ **Any fence defect the balance check finds** (none is known).
✅ **Migrating the ` ```bash ` / ` ```sh ` extractors in `tests/`** the Phase 2 grep lists to `extractBlocks`.
✅ **A convention sentence** in `create-skill` for each of the quote rule and the fence reader.

### Out of Scope

❌ **Rewriting tests that read non-bash fences** (`yaml`, `mermaid`, `markdown`) or scan fence state without extracting a body; they go in the ratchet allowlist with a reason.
❌ **Changing what `extractBlocks` returns.** The balance export shares its walk; `extractBlocks`' existing tests pin its output.
❌ **The probe scratch location** (obs #102): fixed before this task, see §2 problem 4.

---

## 5. Breaking Changes

None - the checks start failing on defects already present; Phase 1 to 3 fix those that exist.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.280.plan.skill-and-test-tooling-see-what-ships.md](task.280.plan.skill-and-test-tooling-see-what-ships.md)

### Phase 1: The quote lint and the fence-balance check

**Risk Level**: Medium

**Files**:
- `tests/unbound-default-reads.test.js`
- `shared/resources/qa-execute-snippets.mjs` (one new export beside `extractBlocks`; no change to its output)
- a new `tests/fence-balance.test.js`
- `skills/create-skill/SKILL.md`

**Changes**:
- [x] `:?` word lint with its flagged fixture and control fixture; fence-balance export and check over every tracked `skills/*/SKILL.md` and `shared/resources/*.md`, with a control: the five balanced files with a nested example fence (named in §3) pass, an unclosed fence and a stray closer fail. Fix each defect they find (none is known).

**Dependencies**: none.

---

### Phase 2: Executed-block tests use the one reader

**Risk Level**: Medium

**Files**:
- the ` ```bash ` / ` ```sh ` body extractors in `tests/` found by the plan's grep: at least `tests/unbound-default-reads.test.js` (`:192`), `tests/key-lookup-single-statement.test.js` (`:311`), `tests/qa-fix-structural-move.test.js` (`:78`), `tests/worktree-root-coverage.test.js` (`:154`), `tests/fenced-bash-optional-file-globs.test.js` (`:58`), `tests/ensure-bug-label-tolerance.test.js`, `tests/gh-labels.test.js` and `tests/qa-cycle.test.js` (each a line-state scanner at `:49`/`:188`/`:242`), `tests/doc-link-branch-sites-execute.test.js`, `tests/identity-rule-probe.test.js`
- a new ratchet test beside `tests/fence-balance.test.js`

**Changes**:
- [x] Switch each bash/sh extractor to `extractBlocks` (a scanner that must keep a line number may keep its walk and say why in the allowlist); a rule in `create-skill`; **delivered as 2 migrated (`halt-fence`, `worktree-root-coverage`) and 17 allowlisted with a stated reason, of which two (`tests/unbound-default-reads.test.js` and `tests/fenced-bash-optional-file-globs.test.js`) stay on their own reader because they read `sh` fences too and `extractBlocks` returns `bash` only (the `SH_TOO` reason); the rest are line-state scanners or section slices, or read a non-bash language**; a ratchet test that fails on a hand-written fence reader in `tests/` that is not allowlisted, with a non-vacuity fixture (a regex literal the ratchet must flag) and the allowlist's count recorded.

**Dependencies**: Phase 1.

---

### Phase 3: bundle discovery

**Risk Level**: Medium

**Files**:
- `skills/create-skill/scripts/bundle_skill.py`
- `tests/bundle-check-mode.test.js` and/or `tests/bundle-transitive.test.js` (where the existing discovery cases live), plus a fixture skill

**Changes**:
- [x] Scan skill-owned `references/*.md`; fail on an unresolved invocation; vendor what is vendorable. Before the change, `git grep -n "'references' not in"` and read every test that pins the old filter (removed-literal sweep).

**Dependencies**: none.

---

### Phase 4: (dropped)

The probe-scratch change is already on `develop` (§2 problem 4). No edit. The two racing files are still run ten times in parallel in Phase 5 as regression evidence.

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [x] `command npm run bundle`, `command npm run bundle -- --check`; mutation proofs.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/bundle_skill.py` - discovery
2. ✅ `skills/create-skill/SKILL.md` - two convention sentences
3. ✅ `shared/resources/qa-execute-snippets.mjs` - one new fence-balance export beside `extractBlocks`
4. ✅ any file the fence-balance check finds unbalanced (none known)

### Files to Modify (Tests)

5. ✅ `tests/unbound-default-reads.test.js` (the `:?` lint; its own reader stays, allowlisted as `SH_TOO` because it reads `sh` fences and `extractBlocks` returns `bash` only), a new `tests/fence-balance.test.js`, the new ratchet test, and the extractor tests Phase 2 lists
6. ✅ `tests/bundle-check-mode.test.js` and/or `tests/bundle-transitive.test.js`, plus a fixture skill (the bundle script has no `skills/create-skill/tests/`)
7. ✅ `package.json` only if `test-runner-reach.test.js` shows a new test file is not reached by `test:suite` (the `tests/*.test.js` glob already reaches `tests/`)

### Files to Modify (Generated)

8. ✅ bundled copies under `skills/*/references/` (`npm run bundle`; edit sources only)

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each check and its control.

**Actions**:
- [ ] A block with an apostrophe in a `:?` word is flagged; **control**: the same message without it, and an apostrophe in a `:-` default of a single-quoted context that parses, are not.
- [ ] A file with an unclosed fence, and one with a stray closer, fail the fence-balance check; a balanced file passes, including each of the five files with a nested example fence named in §3 (the control).
- [ ] The `:?` lint flags `"${X:?bind X to the epic's directory}"` and passes `"${X:?bind X to the epic directory}"`.
- [ ] The ratchet flags a hand-written ` ```bash ` body regex in a fixture file and passes an allowlisted entry; removing a reason from an allowlist entry fails it.
- [ ] A skill-owned reference doc invoking an unvendored script fails `bundle:check`; one naming a vendored script passes; an example in prose, a fragment citation and a generated (`AUTO-GENERATED`) copy do not trip it.
- [ ] The probe suite and `bundle-comment-origin.test.js` run in parallel 10 times without the ENOENT (regression evidence for the already-landed fix).
- [ ] Mutation proofs for each.

**Command**: `CI=true command node --test` on the named files; the Python tests via the repository's runner.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] Each check fails on its defect and passes its control, shown by named tests recorded in the QA report.
- [ ] The repository has no unbalanced fence (`tests/fence-balance.test.js` passes on every tracked `skills/*/SKILL.md` and `shared/resources/*.md`).
- [ ] `bundle:check` fails on the task.238 shape, shown by a test that recreates it.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each check has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] Ten parallel runs of the two racing test files pass (regression evidence for the already-landed isolation), command and exit codes in the QA report.

### Migration

- [ ] No un-allowlisted hand-written fence reader remains in `tests/`: the ratchet test passes, and the QA report's migration table lists, per file the Phase 2 grep (`git grep -nE '```(bash|sh)' -- tests ':!tests/fixtures'`, 43 lines in 20 files at `ce2fed589`) returned, its disposition (migrated to `extractBlocks`, or allowlisted with the reason) and the final allowlist size.

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The new checks find more than the known defects**
- **Risk**: several existing files fail. Measured 2026-11-18: the fence-balance check finds no defect today, and about a dozen `tests/` files hold a hand-written bash/sh extractor.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: Phase 1 measures first; each is fixed here, or a stated exception is added with a reason. The ratchet allowlist is the exception list, and every entry has a reason.
- **Rollback**: revert the check.

**2. Discovery vendors the wrong script**
- **Risk**: a reference-doc example becomes a dependency.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: same invocation-form rule as `SKILL.md`; the "cite or depend" rule keeps fragment citations out.
- **Rollback**: revert Phase 3 and re-bundle.

### Low Risk Areas

None identified. (The scratch-location risk went with Phase 4.)

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `bundle:check` or the new tests are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one check misfires.

**Steps**:
1. Revert that phase and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: an exception or wording.

**Approach**: edit and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- `develop` CI red from the new checks

**Non-Critical (Forward Fix)**:
- a wording or exception

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-18
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.280.qa.4.skill-and-test-tooling-see-what-ships.md](./task.280.qa.4.skill-and-test-tooling-see-what-ships.md)
- **Gate File**: [task.280.gate.4.skill-and-test-tooling-see-what-ships.yml](./task.280.gate.4.skill-and-test-tooling-see-what-ships.yml)

### Test Coverage Summary
- **Tests Executed**: 8591 on the server (0 failed)
- **Phases Verified**: 4/4 live phases
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No open finding. The PR review's three findings (Phase 2 wording, `pr_number`, report Summary) are fixed and each claim was checked against the code. Five low or cleanup follow-ups are recorded in the gate.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                 | Author      |
| ---------- | ------- | ----------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #47, #48, #102, #112  | create-task |
| 2026-11-18 | 1.1     | Review fixes: fence check is a balance check (count equality falsely failed 5 files); obs #47 and #48 instances and obs #102 already fixed on develop, Phase 4 dropped; Phase 2 population measured (43 lines, 20 files) and ratcheted; Phase 3 test path corrected; effort 8h → 12h | review-task |
| 2026-11-18 |         | Status → ready-for-development                              | review-task |
| 2026-11-18 |         | Implemented — 24 files (7 regenerated copies), 3 new test files, 9 new tests; phases 1–3 and 5 | develop |
| 2026-11-18 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-18 |         | QA findings fixed — T280-CR-1 (trailing dot in invocation name), 1 iteration | qa-fix |
| 2026-11-18 |         | QA gate CONCERNS (92/100) — 1 finding | qa-task |
| 2026-11-18 |         | QA findings fixed — T280-CR-2 (all-dots capture reported UNVENDORED), 2 iterations | qa-fix |
| 2026-11-18 |         | QA gate PASS (95/100) — 0 findings | qa-task |
| 2026-11-18 |         | QA findings fixed — PR review PC-1..PC-3 (Phase 2 / §7 wording, pr_number, report Summary), 3 iterations | qa-fix |
| 2026-11-18 |         | QA gate PASS (95/100) — 0 findings | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The quote lint and the fence-balance check
- [x] Lint, balance check, defects fixed (none known; none found)

### Phase 2: Executed-block tests use the one reader
- [x] Switched (2 migrated; 17 allowlisted with reasons), ratcheted

### Phase 3: bundle discovery
- [x] Reference docs scanned

### Phase 4: (dropped)
- [x] Already on `develop` (§2 problem 4)

### Phase 5: Bundle and sweep
- [x] Mutation proofs, bundle clean; ten parallel runs of the two racing files: 20 runs, all exit 0, no ENOENT

---

## References

- Observation #47 — Apostrophe inside a ${NAME:?message} guard breaks the skill block's bash parse
- Observation #48 — Executed-block tests parse fences with their own regex and pass on blocks no engine can see
- Observation #102 — security-probe mutant dirs inside shared/resources/tests race the live-tree scan in bundle-comment-origin
- Observation #112 — bundle:check passes when a skill-owned reference doc invokes a shared script that was never vendored

---

## Notes

### Important Reminders

`create-skill` is the home of the cite-or-depend rule; Phase 3 must not turn a citation into a dependency.

### Implementation Summary

Phases 1–3 and 5 are done (2026-11-18). One fence walk now serves `extractBlocks` and the new `fenceProblems`; `tests/fence-balance.test.js` checks every tracked `SKILL.md` and shared resource (193 files, none unbalanced). The `:?` quote lint is in `tests/unbound-default-reads.test.js`. The ratchet `tests/fence-reader-ratchet.test.js` pins 17 hand-written readers with reasons; `halt-fence` and `worktree-root-coverage` migrated. `bundle_skill.py` vendors scripts that skill-owned reference docs invoke and reports an unresolvable one as `UNVENDORED`. Server gate: 8587 tests, 0 failed.

Deferred to QA: the wall-time criterion (within 10% of `develop`, five alternating runs) and the migration table.

### Future Improvements

None.

---

**Status:** Ready for Review
