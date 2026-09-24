---
id: task.154
title: "[Task 154] Bundler and snippet-test hygiene: attributed warning, symlink-free test run"
type: task
description: "Two local-only blind spots in the repository's own tooling. (1) bundle_skill.py prints an unattributed `shared/resources/<name> not found` warning on every bundle and every pre-commit run, caused by a placeholder literal in observation-log-contract.md; remove the literal, make the warning name the citing file and line, and give it a CI reader. (2) Snippet tests that reach `.agents/skills/…` pass locally only through the developer's gitignored symlink; the two known instances are fixed, but nothing stops the next one — add a shared consumer-root helper, a clean-checkout test runner for the local release gate, and the create-skill rule."
tags: [create-skill, bundle, testing, ci, observe-work, observation]
category: testing
status: planned
priority: Medium
created: 2026-09-24
updated: 2026-09-24
assignee:
estimated_effort_hours: 16
github_issue: 484
---

# Technical Task: Bundler and snippet-test hygiene — an attributed warning and a symlink-free test run

**Status:** Planned

**GitHub Issue**: [#484](https://github.com/Gamaroff/agent-skills/issues/484)

---

## 1. Overview

This task fixes two blind spots in the repository's own tooling. In both, a check runs, reports
green, and hides a defect that only a different environment exposes.

- **Bundler (obs #151).** `bundle_skill.py` prints `⚠️  shared/resources/<name> not found` on every
  `npm run bundle`, so it also prints on every pre-commit run. The warning does not say which file
  produced it. The cause is a placeholder literal in `shared/resources/observation-log-contract.md`.
  Because `--check` passes anyway, the line has become background noise, and eleven task reports
  have recorded it as "pre-existing".
- **Snippet tests (obs #149).** A test that runs a `SKILL.md` snippet that reaches
  `.agents/skills/<name>/…`, and runs it from the repository root, passes only on a machine that has
  the gitignored `.agents/skills -> ../skills` symlink. CI has no such symlink. PR #460 fixed the two
  instances the observation found. Nothing stops the next one: there is no shared way to build a
  consumer root, no written rule, and no local gate that runs without the symlink.

**Scope**: one prose fix in a shared contract, an attribution change in the bundler, and a live-tree
test that reads the warning in CI (obs #151). For obs #149: a shared consumer-root test helper that
replaces two hand-rolled copies, a clean-checkout test runner wired into `scripts/release.sh`, the
create-skill rule and a traps entry. Also a CHANGELOG entry.

**Key deliverables**:

1. `npm run bundle` and `bundle:check` print no `not found` warning on the live tree. When one does
   fire, it names the citing `file:line`, and a test in `npm test` fails on it.
2. `evals/shared/lib/consumer-root.mjs` exports the one way to build a consumer-shaped root. Both
   tests that build one today import it, and a premise test shows that the symlink-free root fails.
3. `npm run test:clean-checkout` runs `npm test` in a fresh local clone, which has no gitignored
   symlink. `scripts/release.sh` runs it in place of the in-place `npm test`.

**Expected outcome**: a green local release gate means the same thing as a green CI run, at least
for anything that depends on ignored files. The bundler's warning lines are either absent or name a
file.

---

## 2. Motivation

### Current Problems

1. **A warning that fires on every run and names nothing.** On 2026-09-24 at `e04de749`,
   `npm run -s bundle` produced 131 lines of output (`npm run -s bundle > out; wc -l out`). Line 81
   is `⚠️  shared/resources/<name> not found`, which sits between `✓ new-product-prd` and
   `✅ observe-work: in sync`. `python3 skills/create-skill/scripts/bundle_skill.py --check` prints
   the same line and then `✅ bundle freshness: 129 skill(s) checked, 0 problems`, exiting 0. The
   line does not say which file cited the name.
2. **Reports record the warning instead of fixing it.** Eleven task documents mention it
   (`grep -rln '<name> not found' docs/tasks | wc -l` → 11). They include the implementation or QA
   reports of tasks 82, 85, 95, 98, 100, 103, 104 and 136. Task 95 spent a detached-worktree
   bisection proving the warning was not its own. Task 98 traced it to the contract and left it,
   judging that "fixing it would mean teaching discovery about placeholders". That judgement was
   wrong: the placeholder only needs to be removed from the prose.
3. **The two fixed snippet-test instances were found by CI, not locally.**
   `evals/shared/tests/finalise-bug-mode.test.mjs` passed 71/71 locally and failed 19 assertions on
   every CI push. `optional-file-lookups.test.mjs` had two more rows failing, and its file-absent
   rows passed vacuously (obs #149). PR #460 (commits `aac49485` and `c45cabc6`) fixed both.
4. **Nothing prevents a third instance.** Both fixes build the consumer root with the same eight
   lines, copied by hand (`finalise-bug-mode.test.mjs:54`, `optional-file-lookups.test.mjs:42`).
   create-skill has no rule on it (`grep -rn -i 'consumer-shaped' skills/create-skill` finds
   nothing). `scripts/release.sh:185–190` runs `npm test` in place, where `.gitignore:22`
   (`.agents/skills`) keeps the symlink present, so the local gate cannot see this class of failure.

### Benefits of Solution

- The bundler's output goes back to being a signal. A warning names its origin, and a test in
  `npm test` turns an unresolved citation red in CI, following the precedent that
  `tests/bundle-comment-origin.test.js` set for comment-only references.
- The consumer-root builder is defined once, so the next snippet test that needs one imports it
  instead of rediscovering the problem in CI.
- The release gate runs the suite on the same tree CI does: committed files only, full history,
  no gitignored symlinks.

---

## 3. Technical Background

### Current Architecture — the bundler warning (obs #151)

- **The literal.** `shared/resources/observation-log-contract.md:290` *(`` `shared/resources/<name>` form and never sees a `./`-prefixed link``)*
  is in § *A note on the sibling references*. That section explains why the contract names its
  siblings instead of linking them, and it does so by writing out the very literal the bundler
  treats as an instruction. AGENTS.md § Shared Resources and create-skill § *Inside
  `shared/resources/`, a `shared/resources/` literal is a bundling instruction*
  (`skills/create-skill/SKILL.md:263`) both state the rule.
- **Who bundles the file.** Only `observe-work` bundles it (`skills/observe-work/SKILL.md:345`;
  `ls skills/*/references/observation-log-contract.md` returns one copy). That explains why the
  warning appears once, just before the `observe-work` status line. In the bundled copy
  (`skills/observe-work/references/observation-log-contract.md:290`), pass 3 has already rewritten
  the literal to `references/<name>`, so that copy's prose no longer says what it meant.
- **Discovery drops the origin.** `discover_needed` (`skills/create-skill/scripts/bundle_skill.py:468`)
  extends `pending` (`:509`) with bare names from `collect_shared_refs(text)`, both for skill files
  (`:520`) and for each shared source it follows (`:559`). `collect_shared_refs` is imported from
  `quick_validate.py:42` at `bundle_skill.py:27` and returns names only, with no line numbers.
  When a name does not resolve, `:552` prints `⚠️  shared/resources/{name} not found`. At that
  point the file that cited the name is no longer known.
- **Both entry points print it.** `bundle_skill` calls `discover_needed` at `:1255` and `check_skill`
  calls it at `:998`. As a result, `--check` prints the warning and still exits 0, because a
  missing source is not one of its problem classes.
- **The `{placeholder}` spelling does not help.** Observation #151 suggested respelling the
  placeholder in the `{placeholder}` form. That form only matters to `INVOKE_REF_RE`
  (`bundle_skill.py:71`, for `.agents/skills/{skill}/references/X`). `SHARED_REF_RE`'s name class
  `[^\s`'")\]*]+` (`:35`, and the same class in `quick_validate.py:55`) accepts `{` and `}`. Tested
  directly: `collect_shared_refs('`shared/resources/{name}`')` → `['{name}']`, and
  `collect_shared_refs('keys on the literal shared-resources path form')` → `[]`. So the literal has
  to go. Respelling it is not enough.

### Same-class mechanism inventory (obs #103)

`bundle_skill.py` already has one attributed, deduplicated warning: `warn_comment_only_refs`
(`:156`). It prints `⚠️  comment-only reference: <file>:<line> → shared/resources/<target>` once
per run, and `_WARNED_COMMENT_ORIGINS` (`:153`) keeps it from repeating. The `not found` warning is
the other warning on the same path. This task **extends** the existing pattern to that warning:
same message shape, same once-per-run dedupe, and the same pure-function-plus-printer split
(`comment_only_refs` at `:134`). It does not add a second reporting mechanism. The CI reader follows
`tests/bundle-comment-origin.test.js`: §1 uses a fixture to prove the warning fires, and §2 asserts
that the live tree is clean.

### Current Architecture — snippet tests and the symlink (obs #149)

- `.gitignore:22` ignores `.agents/skills`. The developer's checkout has
  `.agents/skills -> ../skills` (`ls -la .agents`). CI's checkout has no `.agents/skills`.
- **The two instances are fixed.** On 2026-09-24 I exported the tracked tree at `e04de749`
  (`git archive e04de749 | tar -x`, so no `.agents/skills`) and ran each file in the class below
  with `node --test`. All 13 passed with 0 failures, including `finalise-bug-mode.test.mjs` at
  71/0 and `optional-file-lookups.test.mjs` at 84/0. I then made that tree a git repo with
  `git init`, `git add -A` and one commit, and ran the full `npm test` there: 3940 tests, 3933
  pass, 3 fail, 4 skipped (`ℹ` summary lines). None of the 3 failures involves `.agents/skills`.
  Each comes from how I built that tree, and each one constrains how the runner has to be built:
  - `changelog-entry-drift.test.mjs:237`: "no tag reachable from HEAD". An archive has no
    history, so the runner has to clone, which keeps tags and history like CI's
    `fetch-depth: 0` checkout.
  - `bundled-links.test.js:196`: `skills/pm-coordinator/SKILL.md:152` links to `CLAUDE.md`.
    That file is tracked (`git ls-files CLAUDE.md`) but matched by `.gitignore`, so `git add -A`
    in a fresh repo dropped it. A clone keeps it.
  - `observation-log.test.mjs`: "scratch base … is classified ephemeral (inside a temporary
    directory)". The test's scratch base is repo-relative (`observation-log.test.mjs:66`), and
    `EPHEMERAL_PATTERNS` (`shared/resources/observation-log.js:576–578`) refuse `/tmp`,
    `/private/tmp` and `/var/tmp`. My tree was under `/private/tmp`, so the runner's clone must not
    be under a temporary directory. Note that `mktemp -d` gives `/tmp/…` on Linux.

  So on current `develop` the known snippet tests do not depend on the symlink. The observation's
  *Improvement* still applies: there is no shared builder, no rule, and no local gate that would
  catch a new instance.
- **The class, enumerated.** These are tracked test files that spawn a process and mention
  `.agents/skills`:
  `git ls-files 'tests/*.test.js' 'shared/resources/tests/*.test.mjs' 'evals/**/*.test.mjs' 'skills/*/tests/*.test.js' | xargs grep -l -E 'execFileSync|spawnSync|execSync|spawn\(|execFile\(' | xargs grep -l '\.agents/skills'`
  → 13 files. Only the two fixed files run a snippet that reaches `.agents/skills` through the
  root they pass as `cwd`. The others mention the path in comments, in fixture strings, or in a
  consumer directory they build themselves (the `setup-consumer-*` tests). A text-matching guard
  over this class would therefore start with an allowlist of about 11 false positives, which is the
  obs #117 failure: an allowlist nobody believes. That is why the guard in this task is
  behavioural. It runs the suite where the symlink does not exist and does not try to recognise the
  pattern from source text.
- **Two copies of the builder.** `finalise-bug-mode.test.mjs:54` and
  `optional-file-lookups.test.mjs:42` each call `mkdtempSync`, `mkdirSync(.agents)`, then
  `symlinkSync(<repo>/skills, .agents/skills)` and register a `process.on("exit")` cleanup.
  `evals/shared/lib/` holds the shared fixture builders (`git-sandbox.mjs`, `gh-sandbox.mjs`) and has
  no consumer-root builder.
- **The local gate runs in place.** `scripts/release.sh:185–190` runs `npm test` in the working
  tree. CI's `test.yml` runs `npm ci`, `npm test` and `npm run eval:all` on a fresh
  `actions/checkout` with `fetch-depth: 0` (`.github/workflows/test.yml`).
- **Existing guidance.** create-skill § *A helper a fenced block executes is addressed from the
  repository root* (`skills/create-skill/SKILL.md:206`) says a sourced helper is addressed as
  `.agents/skills/{skill}/references/<file>` from the repository root. It does not say what a test
  of such a block must give it. `docs/contributing/traps.md:30` (*`.agents/skills` is a symlink to
  `../skills`*) says the path is a symlink but does not mention tests.

### Target Architecture

- **Contract prose.** `observation-log-contract.md` § *A note on the sibling references* describes
  the form in words ("the literal shared-resources path form") and contains no
  `shared/resources/<…>` literal. The bundled copy is regenerated.
- **Attributed warning.** Discovery keeps each candidate's origin, `(file, line)`, beside its name.
  The warning becomes `⚠️  shared/resources/<name> not found — cited at <rel-file>:<line>` and prints
  once per `(origin, name)` per run. Line-aware collection is a new pure helper next to
  `comment_only_refs`. `collect_shared_refs` in `quick_validate.py` keeps its signature, because
  `package_skill.py` and `quick_validate.py` still call it.
- **CI reader.** `tests/bundle-missing-source.test.js` §1 builds a fixture repo whose shared source
  cites a missing file and checks that the bundler names that file and line. §2 runs
  `bundle_skill.py --check` on the live tree and requires zero `not found` lines.
- **Consumer root.** `evals/shared/lib/consumer-root.mjs` exports `makeConsumerRoot(repoRoot, prefix)`,
  which returns the root path and registers its own cleanup. The two tests import it.
  `evals/shared/tests/consumer-root.test.mjs` proves two things with one snippet that sources
  `.agents/skills/finalise/references/newest-numbered.sh`: it succeeds from the helper's root, and it
  fails from a bare temporary directory.
- **Clean-checkout runner.** `scripts/test-clean-checkout.sh` makes a `git clone --local --shared`
  of `HEAD`. That clone has full history and tags, keeps tracked files even when they match
  `.gitignore`, and has no ignored files, like CI's `fetch-depth: 0` checkout. It goes into
  `${CLEAN_CHECKOUT_DIR:-<repo>/.clean-checkout}`. That location is repo-local and gitignored, and
  it is never a temporary directory, for the `EPHEMERAL_PATTERNS` reason above. The script links
  `node_modules`, runs `npm test` there, and removes the clone at start and on exit. It warns when
  the working tree has uncommitted changes, because those are not what it tests.
  `npm run test:clean-checkout` calls it, and `scripts/release.sh` runs it in place of the
  in-place `npm test`.

---

## 4. Scope

### In Scope

- ✅ `shared/resources/observation-log-contract.md` prose fix, plus regenerating the one bundled
  copy
- ✅ `bundle_skill.py`: origin-carrying discovery and an attributed, deduplicated `not found` warning
- ✅ `tests/bundle-missing-source.test.js`: fixture half and live-tree half
- ✅ `evals/shared/lib/consumer-root.mjs`, and the two tests migrated to it
- ✅ `evals/shared/tests/consumer-root.test.mjs`: the helper test and the premise test
- ✅ `scripts/test-clean-checkout.sh`, the `test:clean-checkout` npm script, and the
  `scripts/release.sh` gate change
- ✅ `tests/test-clean-checkout.test.js`: a fixture proving the runner excludes gitignored paths
- ✅ create-skill § *A helper a fenced block executes…*: a paragraph on testing such a block
- ✅ `docs/contributing/traps.md` § *`.agents/skills` is a symlink*: one paragraph on tests
- ✅ CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ A new `bundle:check` problem class for an unresolvable citation. The `npm test` reader is the CI
  gate, following the task.119 precedent (see Open Questions).
- ❌ A text-matching guard over tests that mention `.agents/skills`. It was rejected in § 3 because
  the enumerated class is mostly false positives.
- ❌ Running `eval:all` in the clean-checkout runner. It is live-mode-heavy, and the class this task
  targets lives in `npm test`. Revisit if an eval-layer instance appears.
- ❌ Adding the runner to CI. CI already runs on a clean checkout, so doing so would repeat work.
- ❌ Repairing pass-3 rewrites elsewhere in skill prose (see Notes → *Found while authoring*).

---

## 5. Breaking Changes

None to any shipped skill or consumer.

- **Bundler output text.** The `not found` line gains a `— cited at <file>:<line>` suffix. No test
  parses the current text. `grep -rn 'resources/.*not found\|} not found' tests shared/resources/tests evals`
  matches only an unrelated section-lookup message in `select-next.test.mjs`, so the new test is
  the first to read this output.
- **Release gate.** `scripts/release.sh` runs the suite in a clone of `HEAD` instead of in place.
  Uncommitted changes are no longer tested by the release gate. That is intended, because release
  cuts from committed state. The runner prints a warning when the tree is dirty so the difference
  is visible.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.154.plan.bundler-and-snippet-test-hygiene.md](task.154.plan.bundler-and-snippet-test-hygiene.md)

The two halves are independent. Phases 1–3 (obs #151) and Phases 4–6 (obs #149) share no files and
can land in either order, or as two PRs.

### Phase 1: Remove the placeholder literal (Risk: Low)

**Files**: `shared/resources/observation-log-contract.md`,
`skills/observe-work/references/observation-log-contract.md` (generated)

- [ ] Rephrase line 290 so it names the form in words, with no `shared/resources/` followed by a
      name, placeholder or brace
- [ ] `npm run bundle`. The warning line disappears, and the bundled copy's line 290 reads
      correctly
- [ ] `bundle:check` still reports 0 problems

### Phase 2: Attribute the warning (Risk: Low)

**Files**: `skills/create-skill/scripts/bundle_skill.py`

- [ ] Add `shared_refs_with_lines(text)`, a pure function returning `[(line_no, name)]` next to
      `comment_only_refs`, using the same regex and punctuation strip as `collect_shared_refs`
- [ ] `pending` carries `(name, origin)` entries, with origin = `(rel_path, line_no)` for
      `shared/resources/` citations and JS/shell sibling edges
- [ ] The not-found branch prints `⚠️  shared/resources/<name> not found — cited at <rel>:<line>`,
      deduplicated per run through a `_WARNED_MISSING` set that mirrors `_WARNED_COMMENT_ORIGINS`
- [ ] `seen`-set semantics stay the same: a name is still resolved once per skill

### Phase 3: CI reader for the warning (Risk: Low)

**Files**: `tests/bundle-missing-source.test.js`

- [ ] §1 fixture: a temporary repo with `shared/resources/a.md` citing
      `shared/resources/missing.md` on line 3, and a skill citing `a.md`. The bundler's stdout
      contains `missing.md not found — cited at shared/resources/a.md:3`, exactly once
- [ ] §1 negative: the same fixture with the citation rephrased in words produces no `not found`
      line
- [ ] §2 live tree: `bundle_skill.py --check` stdout has zero `not found` lines, and its summary line
      reports at least 100 skills checked, which is the non-vacuity floor
- [ ] Mutation-prove both halves (see § 8)

### Phase 4: Shared consumer-root helper (Risk: Low)

**Files**: `evals/shared/lib/consumer-root.mjs`,
`evals/shared/tests/finalise-bug-mode.test.mjs`,
`evals/shared/tests/optional-file-lookups.test.mjs`,
`evals/shared/tests/consumer-root.test.mjs`

- [ ] `makeConsumerRoot(repoRoot, prefix)`: a temporary directory with
      `.agents/skills -> <repoRoot>/skills`, cleaned up on process exit
- [ ] Replace the two hand-rolled blocks with the import, keeping each file's explanatory comment
      at the call site
- [ ] The helper test: sourcing `newest-numbered.sh` through `.agents/skills/finalise/references/`
      succeeds from the helper root and fails from a bare `mkdtemp` directory (the premise)
- [ ] Both migrated files keep their pass counts (71 and 84) in the clean-checkout run

### Phase 5: Clean-checkout runner and release gate (Risk: Medium)

**Files**: `scripts/test-clean-checkout.sh`, `package.json`, `scripts/release.sh`,
`tests/test-clean-checkout.test.js`

- [ ] The runner clones `HEAD` with `git clone --local --shared --quiet` into
      `${CLEAN_CHECKOUT_DIR:-<repo>/.clean-checkout}`, links `node_modules`, runs `npm test` (or the
      command in `$CLEAN_CHECKOUT_CMD`) in the clone, propagates the exit code, and removes the
      clone at start and on exit
- [ ] It refuses a clone location that matches a temporary-directory pattern (`/tmp`,
      `/private/tmp`, `/var/tmp`), naming the reason
- [ ] It prints a warning when `git status --porcelain` is non-empty
- [ ] Add `.clean-checkout/` and `.clean-checkout-test-tmp/` to `.gitignore`
- [ ] Add `"test:clean-checkout": "bash scripts/test-clean-checkout.sh"` to `package.json`
- [ ] `scripts/release.sh` pre-release step runs `npm run test:clean-checkout` in place of
      `npm test`, and the dry-run message is updated to match
- [ ] Fixture test: a temporary git repo whose committed test passes only through a gitignored
      symlink. It passes when run in place and fails under the runner (with `CLEAN_CHECKOUT_CMD`
      pointed at the fixture's test), which proves the runner excludes ignored paths
- [ ] `bash -n` and `npm run lint:shell` pass on the new script

### Phase 6: Rule, trap, docs (Risk: Low)

**Files**: `skills/create-skill/SKILL.md`, `docs/contributing/traps.md`, `CHANGELOG.md`

- [ ] create-skill § *A helper a fenced block executes is addressed from the repository root*:
      add a paragraph saying that a test executing such a block must run it from
      `makeConsumerRoot()`, never from the repository root or the inherited cwd, and that
      `npm run test:clean-checkout` is how to confirm a local green (obs #149)
- [ ] traps.md § *`.agents/skills` is a symlink*: one paragraph with the failure and the runner
- [ ] CHANGELOG `[Unreleased]` › Changed / Fixed, citing `(task 154)`
- [ ] `npm run ci:fast`, `npm run bundle:check`, `npm run lint:shell`, and
      `npm run validate:all` for create-skill and observe-work

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/observation-log-contract.md`: line 290 prose
2. ✅ `skills/create-skill/scripts/bundle_skill.py`: origin-carrying discovery and attributed warning
3. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs`: import the helper
4. ✅ `evals/shared/tests/optional-file-lookups.test.mjs`: import the helper
5. ✅ `scripts/release.sh`: gate runs `test:clean-checkout`
6. ✅ `package.json`: `test:clean-checkout` script
7. ✅ `.gitignore`: `.clean-checkout/`, `.clean-checkout-test-tmp/`

### Files to Add (Core Implementation)

8. ✅ `evals/shared/lib/consumer-root.mjs`: the one consumer-root builder
9. ✅ `scripts/test-clean-checkout.sh`: the clean-checkout runner

### Files to Add (Tests)

10. ✅ `tests/bundle-missing-source.test.js`: inside the `tests/*.test.js` glob in `package.json`
11. ✅ `evals/shared/tests/consumer-root.test.mjs`: inside the `evals/shared/tests/*.test.mjs` glob
12. ✅ `tests/test-clean-checkout.test.js`: inside the `tests/*.test.js` glob

### Files Regenerated

13. ✅ `skills/observe-work/references/observation-log-contract.md`: by `npm run bundle`, never
    hand-edited

### Files to Modify (Documentation)

14. ✅ `skills/create-skill/SKILL.md`: the testing paragraph
15. ✅ `docs/contributing/traps.md`: the symlink trap paragraph
16. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **`tests/bundle-missing-source.test.js`.** §1 runs the bundler on a temporary fixture repo, the
  same shape as `tests/bundle-comment-origin.test.js` §1, and asserts the attributed line and its
  once-only dedupe. §2 runs `--check` on the live tree.
  Command: `command node --test tests/bundle-missing-source.test.js`
- **`evals/shared/tests/consumer-root.test.mjs`.** This is a behaviour test, not a text match. It
  spawns `bash` with a `source .agents/skills/finalise/references/newest-numbered.sh` snippet from
  both roots.
  Command: `command node --test evals/shared/tests/consumer-root.test.mjs`
- **`tests/test-clean-checkout.test.js`.** A fixture git repo with a gitignored symlink, run both in
  place and through the runner.
  Command: `command node --test tests/test-clean-checkout.test.js`

### Mutation proofs (each recorded in the implementation report)

| Revert | Test that must go red |
| --- | --- |
| Restore the `shared/resources/<name>` literal at contract line 290 | `bundle-missing-source.test.js` §2 |
| Restore the unattributed `print` at `bundle_skill.py` not-found branch | `bundle-missing-source.test.js` §1 |
| Drop the dedupe set | `bundle-missing-source.test.js` §1 (the exactly-once assertion) |
| Remove the `symlinkSync` from `makeConsumerRoot` | `consumer-root.test.mjs` (the helper-root case) |
| Point `finalise-bug-mode.test.mjs` back at `REPO_ROOT` as `cwd` | `npm run test:clean-checkout` (the file's 19 rows); in-place `npm test` stays green, which is the point |
| Make the runner copy the working tree including ignored files (`cp -R`) instead of cloning | `test-clean-checkout.test.js` |

### Integration Tests

- `npm run test:clean-checkout` on a committed `develop` passes with the same pass count as
  in-place `npm test`.
- `scripts/release.sh --dry-run` prints the new gate command.

### Performance Tests

- The runner adds one `git clone --local --shared` (objects are shared, not copied) to the suite's
  own run time. The implementation report records wall time for in-place and clean-checkout runs
  (`time npm test`, `time npm run test:clean-checkout`).

### Regression

- `npm test` as a whole: `tests/bundle-*.test.js` cover the bundler paths this task touches.
  `bundle:check` must stay at 0 problems.

---

## 9. Success Criteria

### Functional

- [ ] `npm run -s bundle 2>&1 | grep -c 'not found'` prints `0` on the task branch
      (test: `tests/bundle-missing-source.test.js` §2)
- [ ] An unresolvable `shared/resources/` citation in a shared source produces exactly one line
      naming the citing file and line (test: `tests/bundle-missing-source.test.js` §1)
- [ ] `evals/shared/lib/consumer-root.mjs` is the only consumer-root builder: neither migrated file
      calls `symlinkSync` for `.agents/skills` itself (test:
      `evals/shared/tests/consumer-root.test.mjs` asserts the helper root succeeds and a bare root
      fails)
- [ ] `npm run test:clean-checkout` fails on a fixture whose test passes only through a gitignored
      symlink (test: `tests/test-clean-checkout.test.js`)
- [ ] `scripts/release.sh` runs `npm run test:clean-checkout` as its test gate

### Performance

- [ ] Each new test file runs in under 10 seconds on the dev Mac (`command node --test <file>`
      wall time, recorded)
- [ ] The clean-checkout run's wall time is recorded next to the in-place run's in the implementation
      report

### Code Quality

- [ ] Every row of § 8's mutation table was reverted, observed red, and restored, with the red
      output quoted in the implementation report
- [ ] `npm run ci:fast`, `npm run bundle:check` (0 problems), `npm run lint:shell` and
      `npm run validate:all` are clean
- [ ] `npm run test:clean-checkout` is green on the committed task branch

### Migration

- [ ] create-skill carries the testing paragraph citing obs #149, and traps.md carries the trap
- [ ] CHANGELOG `[Unreleased]` cites `(task 154)`
- [ ] Observations #149 and #151 are set to `actioned` when this task's PR merges

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The clean-checkout run fails for reasons unrelated to the symlink**
   - Risk: a test depends on another ignored artefact (`.agents/state/`, `.claude/`, a local
     `skills-config.yaml`) or on the checkout path, so the clone goes red where CI is green.
   - Probability: Medium · Impact: Medium (it blocks a release cut)
   - Mitigation: that failure is itself information, because CI lacks those artefacts too. Before
     changing `release.sh`, run the runner on `develop`, and record and fix any divergence first.
     The baseline is the 2026-09-24 symlink-free run of the full suite in § 3: 3 failures, each
     traced to how that tree was built (no tags, an ignore-matched tracked file, a `/tmp`
     location). The clone design in § 3 Target Architecture removes all three causes.
   - Rollback: revert the `release.sh` hunk only, keeping the npm script available.
2. **Origin plumbing changes discovery**
   - Risk: carrying `(name, origin)` through `pending` changes the `seen` or dedupe behaviour, so a
     skill gains or loses a bundled copy.
   - Probability: Low · Impact: Medium
   - Mitigation: `seen` stays keyed on the name alone. `npm run bundle` must leave the tree
     unchanged apart from Phase 1's regenerated copy, and `bundle:check` must stay at 0 problems.

### Low Risk Areas

1. **A future placeholder reintroduced in a skill file.** Pass 3 rewrites a skill file's
   `shared/resources/<x>` to `references/<x>` without a warning, so the §2 live scan cannot see it.
   See Notes, and the out-of-scope item on pass-3 rewrites.
2. **A clone nested in the repository.** An interrupted run can leave `.clean-checkout/` behind.
   It is gitignored, so anything that scans through `git ls-files` never sees it, and the runner
   deletes it at start. An in-place test that walks the filesystem from the repository root would
   see a second `skills/` tree. Check the walkers (`bundled-links.test.js`,
   `bundle-comment-origin.test.js`) with a leftover clone present, or set `CLEAN_CHECKOUT_DIR`
   outside the repository and outside every temporary directory.
3. **Helper cleanup ordering.** `process.on("exit")` registered inside the helper runs in the same
   place the hand-rolled copies ran it. There is no behaviour change.

### Open Questions (recorded instead of asked, non-interactive authoring)

1. **Should an unresolvable citation become a `bundle:check` failure?** Observation #151 suggests
   it. The default taken here is no: the `npm test` reader (§2) turns it red in CI, as task.119 did
   for comment-only references, and adding a class to `--check` widens a contract that
   `tests/bundle-check-mode.test.js` pins. Revisit if an unresolved citation ever reaches `develop`
   past §2.
2. **Should obs #149 and obs #151 be two tasks?** By create-task § 1.2 they are independently
   shippable, revertible and valuable. They are one document because they were cut together from
   the 2026-09-24 observation review. The phases are marked independent so they can ship as two
   PRs.
3. **Should the release gate also run in place?** The default is no, because the clone is strictly
   closer to CI. If uncommitted-state testing turns out to matter at release, run both.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `npm run bundle` changes a skill's bundled set; `release.sh` cannot complete its gate
  on a green `develop`.
- **Steps**: revert the PR. The changes are tooling, tests and prose, and no consumer install
  changes.
- **Validation**: `npm test` and `bundle:check` are green on the reverted tree, and the
  `not found` line is back (expected).

### Partial Rollback (1–2 hours)

- Revert the `release.sh` hunk alone if the clean-checkout gate misfires. Keep the runner, the
  helper and the bundler fix.
- Revert the bundler change alone (Phase 2) if origin plumbing alters discovery. Phase 1's prose
  fix removes the warning on its own.

### Forward Fix

- A divergence the clean-checkout run exposes is a real CI-vs-local difference. Fix the test (give
  it a fixture) instead of weakening the runner.

### Rollback Triggers

- **Critical**: a bundled copy is added or removed by the bundler change.
- **Non-critical**: runner wall time, or wording of the warning. Fix these forward.

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                                                                   | Author      |
| ---------- | ------- | ----------------------------------------------------------------------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft — cut from observations #149, #151 (2026-09-24 observation review) | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Remove the placeholder literal
- [ ] Phase 2: Attribute the warning
- [ ] Phase 3: CI reader for the warning
- [ ] Phase 4: Shared consumer-root helper
- [ ] Phase 5: Clean-checkout runner and release gate
- [ ] Phase 6: Rule, trap, docs

---

## References

- Observation #149: snippet tests must run from a consumer-shaped root, not the repo root
- Observation #151: `bundle_skill.py` prints an unattributed `shared/resources/<name>` warning on
  every commit
- PR #460 (`aac49485`, `c45cabc6`): the two instances of #149, fixed
- task.119: `warn_comment_only_refs` and `tests/bundle-comment-origin.test.js`, the precedent this
  task extends
- task.98: [`task.98.bundle-freshness-check-mode.md`](../task.98.bundle-freshness-check-mode/task.98.bundle-freshness-check-mode.md),
  which traced the warning to the contract and left it
- `skills/create-skill/SKILL.md` § *Inside `shared/resources/`, a `shared/resources/` literal is a
  bundling instruction* and § *A helper a fenced block executes is addressed from the repository
  root*

---

## Notes

### Important Reminders

- QA artifacts go in this directory: `task.154.qa.{N}.bundler-and-snippet-test-hygiene.md`,
  `task.154.gate.{N}.bundler-and-snippet-test-hygiene.yml`, and bug reports
  `task.154.bug.{N}.{name}.md`.
- Edit `shared/resources/observation-log-contract.md`, never the bundled copy, because
  `npm run bundle` reverts edits made only to `references/`.
- Observations #149 and #151 are resolved (`set-status --status actioned`) when this task's PR
  merges.

### Found while authoring (not in scope, candidate observation)

- `skills/create-skill/SKILL.md:267` states the bundling-instruction rule as *"A literal
  `references/<file>` is not a reference"*. The source meant the shared-resources spelling. The
  sentence was already in that form in the commit that introduced it (`b595b63b`,
  `git log -S 'is not a reference; it is an instruction' -- skills/create-skill/SKILL.md`), which
  is consistent with the pre-commit bundle's pass 3 rewriting the literal in a skill file. Because
  the rewrite is silent, the rule's own sentence was changed by the mechanism it describes. The fix
  is a prose rewrite that does not use the literal. It is left to a follow-up so this task does not
  have to decide how the bundler should treat placeholders in skill files.
