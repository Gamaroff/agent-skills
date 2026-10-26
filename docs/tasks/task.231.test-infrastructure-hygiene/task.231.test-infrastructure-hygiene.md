---
id: task.231
title: "Test infrastructure hygiene"
type: task
description: "Tests stop leaking temp dirs into /tmp, the observation-log resolver tests pass inside a linked worktree, doc-links.js checks #anchors, and the dispatch-wait parity test accepts a block that marks its own wait."
tags: [observe-work, create-skill, finalise, qa-task, develop-task, observation, tests]
category: testing
status: accepted
priority: Medium
created: 2026-10-23
updated: 2026-10-26
assignee:
estimated_effort_hours: 16
github_issue: 741
completed_date: 2026-10-26
pr_number: 752
---

# Technical Task: Test infrastructure hygiene

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.231.review.1.test-infrastructure-hygiene.md` implemented 2026-10-26
**GitHub Issue**: [#741](https://github.com/Gamaroff/agent-skills/issues/741)

---

## 1. Overview

Four defects in this repository's test and link-check infrastructure, each logged as an observation:

- **Temp-dir leaks (obs #83).** Tests leave their temp directories behind, and `/tmp` runs out of inodes. One full `npm test` run on 2026-10-23 left 607 entries holding 10,188 inodes.
- **Worktree scratch anchor (obs #39).** The observation-log resolver tests fail in a linked worktree, which is where this repository now develops.
- **No anchor check (obs #80).** No checker in CI or the pipeline verifies a `file.md#heading` link.
- **Proximity-only parity test (obs #62).** The dispatch-wait parity test cannot see a fenced block that marks its own wait.

**Scope**: a per-run `TMPDIR` for `npm test` that is always removed, plus a leak ratchet that fails on new leaks. The worst leaking helpers get fixed. The resolver-test scratch root moves out of linked worktrees. `doc-links.js` gets fragment resolution, with a ratchet and a CI step. The parity test gets a rule for block-owned waits. Each part ships behind its own phase, and each can be reverted alone.

---

## 2. Motivation

### Current Problems

1. **`/tmp` exhaustion looks like a mass regression.** On 2026-10-21, `ci:fast` reported 1,576 of 6,129 tests failing on T213, all unrelated to the change. The cause was `df -i /tmp` at 1,048,575 of 1,048,576 (obs #83). On 2026-10-23, `df -i /tmp` read 752,808 of 1,048,576 (72%), and `ls /tmp | wc -l` read 36,877. A measured run adds about 10,188 inodes, so roughly 29 more full runs reach exhaustion again.
2. **`npm test` is red in the default development location.** `shared/resources/tests/observation-log.test.mjs:66` roots its scratch at `<repo>/.observation-log-test-tmp`. Inside `.worktrees/<branch>/` that root is in a linked worktree, which the resolver correctly refuses (`resolve-observation-workspace.sh:131`, "path is inside a linked git worktree"). The result was 4 failures in each of two worktree runs on 2026-10-14 (obs #39).
3. **A renamed heading breaks inbound links silently.** `shared/resources/doc-links.js:352` drops the fragment (`target.split("#")[0]`). Its header (`:66`) says `#anchor` targets are not checked. task.199's SC-6 claimed the CI link check "checks anchors", and QA passed it (obs #80).
4. **The parity guard pushes authors back to the restated form.** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` accepts a dispatch only when `set-waiting-on.sh "<label>"` appears within 12 lines (`lines.slice(Math.max(0, i - 12), i + 12)`). task.189 moved the mark inside the fenced block it backgrounds, which is the better design. The test then failed until the marker was named again in prose (`skills/finalise/SKILL.md:526`, "The block marks and clears its own wait") (obs #62).

### Benefits

1. **`/tmp` cannot fill from this suite again.** The per-run directory is removed after every run, pass or fail. The protection does not depend on any one helper being fixed.
2. **New leaks are named when they are introduced.** The ratchet fails on a new prefix or a higher count and prints the prefix to grep for.
3. **A worktree run is green**, so worktree development needs no special case.
4. **Dead anchors are caught where links already are**, through the same engine, corpus tests and CI job, and not through a second checker.
5. **The parity test accepts the consolidated design** while still failing on a dispatch that nothing marks.

---

## 3. Technical Background

### Current Architecture

**Temp directories.** 160 JS/MJS files call `mkdtemp`/`mkdtempSync` 475 times. The command was `git grep -cE 'mkdtempSync|mkdtemp\(' -- '*.js' '*.mjs'`, summed. 30 of those files contain no `rmSync`/`rm(` at all, for example `evals/shared/tests/runner-setup.test.mjs`, `skills/wireframe/tests/wireframe.test.js` and `tests/bundle-mjs.test.js`. The command was a loop over the `git grep -l` result with `grep -qE 'rmSync|rm\(|rimraf'`. Shell suites call `mktemp` 19 times (`git grep -nE 'mktemp' -- '*.test.sh' 'tests/*.sh'`). `package.json` `test` is one `&&` chain of `bash … .test.sh` suites and `node --test` globs. Nothing sets `TMPDIR`, so every helper writes to the system `/tmp`.

**Measured leak (2026-10-23, `develop` @ `473f98f9`).** The command was `TMPDIR=<fresh dir> npm test`. The result was 6,254 tests, 0 fail, exit 0, 365 s. Afterwards the directory held **607 top-level entries** (`ls -A | wc -l`) and **10,188 paths** (`find | wc -l`), under **104 distinct prefixes**. A prefix is the name with its random suffix stripped: `sed -E 's/[-_.][A-Za-z0-9]{6,}$//'`. The largest are `qa-next` 60, `review-pr-repo` 40, `wireloom-test` 37, `fake-gh` 31, `t118-record` 26, `ls-probe` 26, `executed-prose` 23 and `repeat` 22. **3 entries escaped the override into `/tmp` during that run**: two `pipeline-hold*` and one `review-pr-comment.*.md`. They came either from tests that bypass `TMPDIR` or from another process (unverified). `skills/review-pr/SKILL.md:867` creates `review-pr-comment.XXXXXX.md` with `mktemp -t`.

**Resolver-test scratch.** `observation-log.test.mjs:66` sets `const SCRATCH_ROOT = join(SHARED, "..", "..", ".observation-log-test-tmp")`. It is gitignored (`.gitignore:71`). It is not under `os.tmpdir()` on purpose: the resolver refuses ephemeral bases (`:69-72`). The test already has one deliberate exception that is not under `SCRATCH_ROOT` (`:1785`).

**Links.** `doc-links.js` `checkFile` resolves each relative link's path against the tracked tree and skips the fragment (`:352`). Two corpus tests in `shared/resources/tests/doc-links.test.mjs` run it over work-item documents (`:359`) and co-located artifacts (`:442`). Each has a `KNOWN` ratchet that only tightens (`:327`). CI's `.github/workflows/docs-link-check.yml` runs `markdown-link-check@3` over changed Markdown and never calls `doc-links.js`. Whether `markdown-link-check@3` verifies a cross-file `#fragment` is **unverified**. Phase 0 measures it. No GitHub-style heading slugger exists in the repository: `git grep -nE 'function (slug|githubSlug|headingSlug|anchorFor)|github-slugger|slugify'` finds only `observation-log.js:129 slugify(title)`, which builds filenames under different rules.

**Dispatch-wait parity.** `qa-loop-lock-fields-parity.test.mjs:326` defines `DISPATCH` and `EXEMPT`. The population is directory-derived (`:330-355`). Each matching line needs `/set-waiting-on\.sh "[^"]+"/` in its ±12-line window. Real block-owned waits today are `skills/finalise/SKILL.md:558`, the probe plan, and `:1636`, CI poll reading 2.

### Target Architecture

- **`scripts/test-tmpdir.mjs`** wraps the suite. It creates one per-run directory under the system tmpdir, runs the command with `TMPDIR` set to it, and reads the leftovers, grouped by prefix. It compares them with `tests/tmp-leak-ratchet.json` (`{ prefix: maxCount }`), **always removes the directory**, and exits non-zero when the suite failed or the ratchet tripped. `package.json` `test` becomes `node scripts/test-tmpdir.mjs -- npm run test:suite`, and the old chain moves to `test:suite`.
- **The worst leakers are fixed**, and each fix deletes its ratchet entry. The minimum set is `qa-next`, `review-pr-repo`, `wireloom-test` and the shared `executed-prose` helper (`shared/resources/tests/lib/executed-prose.mjs`). It goes further when the fix is the same `t.after(() => rmSync(…))` shape.
- **`SCRATCH_ROOT`** resolves to the **main checkout** when the cwd is a linked worktree: the parent of `git rev-parse --path-format=absolute --git-common-dir`. Otherwise it resolves as today. The resolver's refusal is untouched.
- **`doc-links.js`** resolves a fragment on a `.md` target, and on a same-file `#x`, against that file's anchors. The anchors are GitHub heading slugs plus explicit `<a id=…>`/`<a name=…>`. An unmatched fragment is reported with the new state `[no-anchor]`. The corpus tests gain `KNOWN_ANCHORS` ratchets seeded from the measured population. CI's link-check job also runs `doc-links.js` over the changed files.
- **The parity test** counts a dispatch as marked when the **first fenced block that opens within 12 lines after it** contains `set-waiting-on.sh "<label>"`. The proximity window still counts too. The rule is a named function with its own unit cases.

### Important Clarifications

- The per-run directory is **containment, not a fix**. It bounds the damage of every leak at once. The ratchet and the helper fixes are what reduce the leaks. Both are needed: containment alone hides leaks forever, and helper fixes alone leave `/tmp` exposed to the next leak.
- Tests that set their own `env` for a child process may drop `TMPDIR` and write to `/tmp` anyway. The ratchet cannot see those writes, which is why Phase 1 names the 3 escaped entries and traces them.

---

## 4. Scope

### In Scope

✅ **Leak containment and ratchet** (obs #83): `scripts/test-tmpdir.mjs`, its test, `tests/tmp-leak-ratchet.json` and the `package.json` rewiring.
✅ **Helper fixes**: at least the four prefixes named under Target Architecture, plus a `df -i` triage line in `docs/contributing/traps.md`.
✅ **Worktree-safe scratch root** (obs #39): `observation-log.test.mjs` only.
✅ **Anchor checking** (obs #80): `doc-links.js` fragment resolution, `[no-anchor]` state, corpus ratchets and a CI step.
✅ **Block-owned wait rule** (obs #62): the parity test only.

### Out of Scope

❌ **Fixing all 104 leaking prefixes.** The ratchet holds the rest, and each later fix tightens it.
❌ **Removing `markdown-link-check`** from CI. Phase 0's measurement decides whether it is redundant. Removing it is a separate decision.
❌ **Cleaning the existing `/tmp` backlog.** That is an operator step (Section 11), not repository code.
❌ **Changing the observation resolver's refusal rules.**

---

## 5. Breaking Changes

**`npm test` becomes a wrapper.** The suite itself moves to `npm run test:suite`.

**Before**: `"test": "bash shared/resources/resolve-platform.test.sh && … node --test …"`
**After**: `"test": "node scripts/test-tmpdir.mjs -- npm run test:suite"`, `"test:suite": "<the old chain>"`

**Impact**: anything that calls `npm test` still works and still gets the suite's exit code. It now also fails on a ratchet trip. CI (`ci:fast`), `scripts/test-clean-checkout.sh` (`CLEAN_CHECKOUT_CMD` defaults to `npm test`) and the pipeline's fast gates all call `npm test` and inherit both effects.

**Migration Path**: none needed for callers. A contributor whose change trips the ratchet either fixes the leak (preferred) or, for a pre-existing prefix that only moved, updates its count in the same commit with a reason in the commit message.

**`doc-links.js` reports a new state.** `[no-anchor]` adds to `broken[]`. Exit codes are unchanged (1 = findings). Callers that treat any finding as red, which is every caller, start failing on dead anchors. The `KNOWN_ANCHORS` ratchets absorb the existing ones.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.231.plan.test-infrastructure-hygiene.md](task.231.plan.test-infrastructure-hygiene.md)

### Phase 0: Measure

**Risk Level**: Low

**Changes**:
- [x] Run `TMPDIR=<fresh> npm test` **twice** on the branch base and diff the per-prefix counts. Identical counts mean the ratchet keys on `{prefix: count}`. Unequal counts mean it keys on the prefix set, with the variance recorded. Record both runs in the implementation report.
- [x] Trace the 3 escaped entries (`pipeline-hold*`, `review-pr-comment.*.md`) to a test or rule them out: snapshot `/tmp` around a run and grep the prefixes. Record the result.
- [x] Measure the dead-anchor population. With fragment resolution applied in a scratch copy, count `[no-anchor]` findings over each corpus test's population. Record the command and the count.
- [x] Measure whether `markdown-link-check@3` reports a dead cross-file fragment: a two-file fixture, one dead `other.md#nope`. Record the result.

**Dependencies**: none.

### Phase 1: Contain and ratchet temp dirs (obs #83)

**Risk Level**: Medium. It rewires `npm test`.

**Changes**:
- [x] `scripts/test-tmpdir.mjs` (see the plan). The finally-removal runs on suite failure and on a signal too.
- [x] `tests/tmp-leak-ratchet.json`, seeded from Phase 0's measurement.
- [x] `package.json`: `test` → wrapper, chain → `test:suite`.
- [x] Point the two tests that read the suite list at `test:suite`. `tests/shell-suite-guard.test.js:37` and `tests/test-runner-reach.test.js:23` both bind `package.json` `scripts.test` and assert that suites appear in it. After the rewiring that string is the wrapper line, so both read `scripts["test:suite"]` instead. Search: `git grep -nE 'scripts\.test\b' -- '*.js' '*.mjs'`.
- [x] Fix the leaking helpers for `qa-next`, `review-pr-repo`, `wireloom-test` and `executed-prose`. Delete each one's ratchet entry.
- [x] `docs/contributing/traps.md`: when `ci:fast` fails en masse with ENOSPC/EMFILE shapes, run `df -i /tmp` before reading the failures. Also update the "`npm test`'s suite list is hand-maintained" trap (`:86`): the hand-maintained list is now `test:suite`, and `test` is the wrapper.

**Dependencies**: Phase 0.

### Phase 2: Worktree-safe scratch root (obs #39)

**Risk Level**: Low

**Changes**:
- [x] `observation-log.test.mjs`: derive `SCRATCH_ROOT` from the main checkout when the cwd is a linked worktree. Keep the `:69-72` ephemeral pre-check.
- [x] A test that creates a linked worktree in a scratch repo and asserts the derived root is outside it.

**Dependencies**: none.

### Phase 3: Anchor checking (obs #80)

**Risk Level**: Medium. It adds new findings across the corpus.

**Changes**:
- [x] `doc-links.js`: `anchorsOf(text)` (GitHub slug rules plus explicit anchors) and fragment resolution for `.md` targets and same-file `#x`. Add the `[no-anchor]` state and update the header contract (`:66`).
- [x] Extract same-file `#x` targets separately. `NOT_RELATIVE_RE` (`doc-links.js:84`) drops every `#`-prefixed target inside `extractRelativeLinks`, so a same-file fragment never reaches `checkFile` and the `noFragment === ""` branch (`:353`) never sees one. Leave `NOT_RELATIVE_RE` and `extractRelativeLinks` as they are, because other callers (`resolvedAll`, used by `qa-read-back`) rely on "not a relative link". Add a second pass for same-file fragments, using the same fence and code-span blanking.
- [x] `docs/architecture/concepts/tech-stack.md:56`: `docs-link-check.yml` now also checks anchors through `doc-links.js`.
- [x] `doc-links.test.mjs`: unit cases (below), plus `KNOWN_ANCHORS` / `KNOWN_ARTIFACT_ANCHORS` ratchets seeded from Phase 0.
- [x] `.github/workflows/docs-link-check.yml`: run `command node shared/resources/doc-links.js --file "$f"` per changed file beside `markdown-link-check`.
- [x] `npm run bundle`, because `doc-links.js` is bundled into skills.

**Dependencies**: Phase 0.

### Phase 4: Block-owned wait rule (obs #62)

**Risk Level**: Low

**Changes**:
- [x] Extract `isWaitMarked(lines, i)` in the parity test: the ±12 window **or** the first fence opening within 12 lines after `i` contains the set form.
- [x] Unit cases: a block-owned mark beyond the window passes, a following fence without a mark fails, and a mark in a fence *before* the dispatch does not count.

**Dependencies**: none.

### Phase 5: Close-out

**Risk Level**: Low

**Changes**:
- [x] CHANGELOG `[Unreleased]` entry citing `(task 231)`.
- [x] Full `npm test` (now the wrapper) green, with the ratchet output recorded in the implementation report.

**Dependencies**: Phases 1-4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `package.json` - `test` → wrapper; old chain → `test:suite`
2. ✅ `shared/resources/doc-links.js` - fragment resolution, `[no-anchor]`
3. ✅ `shared/resources/tests/lib/executed-prose.mjs` - remove the fixture dirs it creates
4. ✅ the helpers that create the `qa-next`, `review-pr-repo` and `wireloom-test` dirs. Find them with `git grep -nE '"(qa-next|review-pr-repo|wireloom-test)-'` at Phase 1. Each is cited by `path:line` in the implementation report.
5. ✅ `.github/workflows/docs-link-check.yml` - add the `doc-links.js` step
6. ✅ `skills/*/references/doc-links.js` - regenerated by `npm run bundle`, never hand-edited

### New Files

7. ✅ `scripts/test-tmpdir.mjs` - per-run `TMPDIR`, leak report, ratchet and removal
8. ✅ `tests/tmp-leak-ratchet.json` - `{ prefix: maxCount }`; only tightens
9. ✅ `tests/test-tmpdir.test.js` - wrapper behaviour (see Testing Strategy)

### Files to Modify (Tests)

10. ✅ `shared/resources/tests/observation-log.test.mjs` - `SCRATCH_ROOT` derivation and the worktree case
11. ✅ `shared/resources/tests/doc-links.test.mjs` - anchor unit cases and anchor ratchets
12. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` - `isWaitMarked` and its cases

### Files to Modify (Documentation)

13. ✅ `docs/contributing/traps.md` - `df -i` triage line; the suite-list trap (`:86`) names `test:suite`
14. ✅ `CHANGELOG.md` - `[Unreleased]` entry
15. ✅ `docs/architecture/concepts/tech-stack.md` - the docs link-check workflow checks anchors

### Files to Modify (Tests that read the suite list)

16. ✅ `tests/shell-suite-guard.test.js` - read `scripts["test:suite"]`
17. ✅ `tests/test-runner-reach.test.js` - read `scripts["test:suite"]`

---

## 8. Testing Strategy

### Unit Tests

**`tests/test-tmpdir.test.js`**. Each case drives the wrapper with a tiny fake suite command:
- [x] A suite that leaks nothing exits 0, and the per-run directory is gone afterwards.
- [x] A suite that leaks a **new** prefix exits non-zero, names the prefix, and the directory is still gone.
- [x] A suite that leaks a ratcheted prefix **within** its count exits 0. Above its count, it exits non-zero.
- [x] A ratchet entry whose prefix leaked nothing is reported as healed, as a notice that names the entry to delete. It does not fail the run. *Changed in develop (2026-10-26)*: leaks depend on the environment. CI installs zsh, so every shell-matrix suite runs a zsh variant that a machine without zsh skips. A prefix absent from one run therefore does not prove the leak is fixed, and failing on it would make every machine without CI's toolset red. SC-2 (new prefix or over count fails) is unchanged.
- [x] A failing suite with no leaks keeps the suite's non-zero exit, and the directory is still gone.
- [x] The child sees `TMPDIR` set to the per-run directory, asserted from inside the fake suite.

**`doc-links.test.mjs` anchor cases**: `other.md#real-heading` passes; `other.md#nope` fails with `[no-anchor]`; a heading with an em dash (`## A — B`) resolves as `a--b`; duplicate headings resolve `-1`; an explicit `<a id="x">` resolves; a fragment on a non-`.md` target is not checked; a heading inside a fenced block is **not** an anchor; same-file `#x` is checked.

**Parity cases**: covered under Phase 4.

### Mutation Proofs

Each one is recorded in the implementation report with its red run:
- [x] Remove the wrapper's finally-removal → the "directory is gone" cases go red.
- [x] Make the ratchet compare prefix presence only → the over-count case goes red.
- [x] Revert the fragment branch in `doc-links.js` → the `#nope` case goes red.
- [x] Revert `isWaitMarked` to window-only → the block-owned case goes red.
- [x] Revert `SCRATCH_ROOT` derivation → the worktree case goes red.

### Integration

- [x] Full `npm test` through the wrapper on the branch. Record the ratchet report and the leftover count, which must not exceed Phase 0's minus the fixed prefixes.
- [x] `node --test shared/resources/tests/observation-log.test.mjs` run **from inside a linked worktree**: 0 failures.

---

## 9. Success Criteria

### Functional

- [x] SC-1: After `npm test` exits, pass or fail, no per-run directory it created remains. Held by `tests/test-tmpdir.test.js` and by its mutation proof.
- [x] SC-2: A new leaking prefix, or a ratcheted prefix over its count, makes `npm test` exit non-zero and names the prefix. Held by `tests/test-tmpdir.test.js`.
- [x] SC-3: `tests/tmp-leak-ratchet.json` has no entry for `qa-next`, `review-pr-repo`, `wireloom-test` or `executed-prose`. The full run's leftover count is recorded in the implementation report § Phase 5 and is lower than Phase 0's by at least those prefixes' counts.
- [x] SC-4: `observation-log.test.mjs` passes when run from a linked worktree. The run is recorded in the implementation report, and the new worktree case in the file holds it.
- [x] SC-5: `doc-links.js` reports `other.md#nope` as `[no-anchor]` and accepts each anchor shape listed in Section 8. Held by `doc-links.test.mjs`.
- [x] SC-6: The docs link-check workflow runs `doc-links.js` on each changed Markdown file. Shown by the workflow diff and by one CI run on the PR whose log contains the `doc-links` step. Evidence: "Docs link check" run 40291489233 on PR #752 @ `d423566f`, whose step "Check anchors and tracked-tree links in changed files" logs `ok doc-links: …` lines.
- [x] SC-7: The parity test accepts a dispatch whose following fence marks its own wait, and still fails a dispatch with no mark. Held by the Phase 4 unit cases.

### Code Quality

- [x] All five mutation proofs in Section 8 are recorded red-then-green in the implementation report.
- [x] `npm run bundle:check` is clean after the `doc-links.js` change.
- [x] `npm run format:check` and `npm run lint:shell` pass.

### Migration

- [x] `CHANGELOG.md` `[Unreleased]` has an entry citing `(task 231)`.
- [x] `docs/contributing/traps.md` carries the `df -i` triage line.

---

## 10. Risk Assessment

### High Risk Areas

**1. The wrapper changes the exit code CI relies on**
- **Risk**: The wrapper swallows the suite's failure, or reports success on a signal.
- **Probability**: Low
- **Impact**: Critical, because a red suite would merge.
- **Mitigation**: The failing-suite unit case, plus a mutation proof that hard-codes exit 0 and turns that case red.
- **Rollback**: Restore `"test"` to the old chain. It is one line.

### Medium Risk Areas

**1. Leak counts are not deterministic**
- **Risk**: Parallel `node --test` timing changes counts, and the ratchet flaps.
- **Mitigation**: Phase 0 runs twice before choosing count- or set-keying.

**2. The anchor ratchet is large**
- **Risk**: Many existing dead anchors make the seed list long and tempt a blanket skip.
- **Mitigation**: Seed from the measured population, pinned by file and fragment like the existing `KNOWN`, and never as a wildcard.

**3. A child process drops `TMPDIR`**
- **Risk**: Some leaks bypass containment and keep filling `/tmp`.
- **Mitigation**: Phase 0 traces the 3 known escapes. Any found in a test is fixed to pass `TMPDIR` through.

### Low Risk Areas

**1. Slug rule mismatch with GitHub**
- **Risk**: An edge case like emoji or HTML in a heading slugs differently from GitHub's.
- **Mitigation**: The unit cases cover the shapes in this corpus, and an unknown shape fails loudly.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- CI is green on a run with failing tests.
- `npm test` fails on every branch from a ratchet false positive.

**Steps**:
1. Revert the `package.json` change, which restores the direct chain.
2. Push. The ratchet and wrapper files are inert without the script entry.

**Verification**: `npm test` exit code equals `npm run test:suite`'s, checked with one failing test.

### Partial Rollback (1-2 hours)

**When to Use**: A single phase misbehaves. The anchor check flaps or the parity rule misfires.

**Steps**:
1. Revert that phase's commit. Phases 1-4 touch disjoint files.
2. Re-run `npm test`.

### Forward Fix (< 4 hours)

**When to Use**: A ratchet count is off by a measured variance, or a slug edge case appears.

**Approach**: Adjust the ratchet entry or the slugger and add the case, in one commit.

### Operator Step (not repository code)

Clearing today's backlog is a manual step. Remove the entries whose prefixes appear in Phase 0's report from `/tmp`, after checking that no test run is in progress.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-26
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.231.qa.5.test-infrastructure-hygiene.md](./task.231.qa.5.test-infrastructure-hygiene.md)
- **Gate File**: [task.231.gate.5.test-infrastructure-hygiene.yml](./task.231.gate.5.test-infrastructure-hygiene.yml)

### Test Coverage Summary
- **Tests Executed**: 6373 (local `npm run ci:fast` @ `190375ff`)
- **Phases Verified**: 6/6
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Every gated finding from QA cycles 1–4 is fixed and mutation-proven: symlinked anchors, prototype-key prefixes, process-group signalling, terminal signals and job control, producer-keyed prefixes, and the test safety net.
- Two low advisory test-robustness points (CR5-1, CR5-2) and the earlier advisory items are carried in the gate's `recommendations.future`.
## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.231.qa.5.test-infrastructure-hygiene.md`
**Gate File**: `task.231.gate.5.test-infrastructure-hygiene.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 95/100
**PR Review (Step 5c)**: ✅ APPROVE — `task.231.pr-review.1.test-infrastructure-hygiene.md`

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 7/7 (SC-1 to SC-7), plus 5/5 code-quality and migration criteria
✅ **Tests & PR:** PR #752; five mutation proofs recorded red-then-green; CI green on `d423566f` (test, link-check, validate, shellcheck, secret-scan)
✅ **Documentation:** CHANGELOG (task 231), `traps.md` `df -i` triage, `tech-stack.md` anchor check
✅ **Security Review:** PASS — `compareRatchet` boundary probed (8 executed, 0 reproduced, 0 escaped; `task.231.dod.1.security.run.json`)
⚠️ **Compliance Review:** NOT_APPLICABLE — test and link-check infrastructure only

**Task marked as ACCEPTED on:** 2026-10-26

**Detailed Verification Log:** See `task.231.dod.1.test-infrastructure-hygiene.md` for complete verification evidence.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-23 | 1.0     | Initial draft — cut from observations #39, #62, #80, #83 | create-task |
| 2026-10-26 | 1.1     | Review passed (8/10). Added the two tests that read `scripts.test`, the same-file `#x` extraction gap, and the traps/tech-stack doc sweep | review-task |
| 2026-10-26 |         | Status → ready-for-development | review-task |
| 2026-10-26 |         | Implemented — 36 files (12 bundled copies), 22 new tests (wrapper 13, anchors 6, parity 1, worktree 1, qa-read-back 1); healed made a notice (environment-dependent leaks) | develop |
| 2026-10-26 |         | Status → ready-for-review | develop |
| 2026-10-26 |  | QA gate CONCERNS (80/100) — 2 findings (CR-1 medium, QA-1 low) | qa-task |
| 2026-10-26 |  | QA findings fixed — cycle 1: CR-1 (symlinked anchor targets), QA-1 (prototype-key prefixes), CR-3 cleanup; 1 iteration | qa-fix |
| 2026-10-26 |  | QA gate CONCERNS (80/100) — 2 findings (CR2-1 medium, CR2-2 low); cycle-1 fixes verified | qa-task |
| 2026-10-26 |  | QA findings fixed — cycle 2: CR2-1 (signal the suite process group, reap leftovers), CR2-2 (eval- inner suffix by producer), CR2-3 (guarded retry rmSync); 1 iteration | qa-fix |
| 2026-10-26 |  | QA gate CONCERNS (90/100) — 1 finding (CR3-1 medium: SIGHUP/SIGQUIT orphan the suite); cycle-2 fixes verified | qa-task |
| 2026-10-26 |  | QA findings fixed — cycle 3: CR3-1 (forward SIGHUP/SIGQUIT, group job control), CR3-2 to CR3-4 folded in; 1 iteration | qa-fix |
| 2026-10-26 |  | QA gate CONCERNS (90/100) — 1 finding (CR4-1 medium, test-only: inert safety net); cycle-3 fixes verified | qa-task |
| 2026-10-26 |  | QA findings fixed — cycle 4: CR4-1 (test safety net holds the suite pid in memory), CR4-2 (reap report wording); 1 iteration | qa-fix |
| 2026-10-26 |  | QA gate PASS (95/100) — cycle-4 fix verified; 2 low advisory findings carried | qa-task |
| 2026-10-26 | 1.2 | DoD passed — accepted (PR #752) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 0: Measure
- [x] Phase 1: Contain and ratchet temp dirs
- [x] Phase 2: Worktree-safe scratch root
- [x] Phase 3: Anchor checking
- [x] Phase 4: Block-owned wait rule
- [x] Phase 5: Close-out

---

## References

- Observation #39 — observation-log resolver tests fail inside a linked worktree
- Observation #62 — Dispatch-wait parity test misses a block that marks its own wait
- Observation #80 — No check in CI or the pipeline verifies cross-file heading anchors
- Observation #83 — Repo tests leak temp dirs until /tmp runs out of inodes and ci:fast fails en masse
- Review plan: `.agents/plans/2026-10-23-observation-review.md` (cluster 1)

## Notes

- QA report: `task.231.qa.{N}.test-infrastructure-hygiene.md`
- Bug reports: `task.231.bug.{N}.{name}.md`
- Quality gate: `task.231.gate.{N}.test-infrastructure-hygiene.yml` (co-located)
