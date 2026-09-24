---
id: task.153
title: "[Task 153] Release gate reads CI's verdict; load-sensitive tests name themselves"
type: task
description: "Make release.sh refuse to tag unless CI's own verdict for the commit is green (a local npm test is a claim about one machine), make every load-sensitive test assertion say so in its failure message and hold that list in one mechanically checked place, fix the session-handoff CR-6 process-group test so a leader killed before it forks is retried rather than reported as ENOENT, and name the re-run-alone class beside the release checklist."
tags: [release, ci, tests, flaky-tests, session-handoff, spawn-budget, observation]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-24
updated: 2026-09-24
assignee:
estimated_effort_hours: 16
github_issue: 483
---

# Technical Task: Release gate reads CI's verdict; load-sensitive tests name themselves

**Status:** Planned

**GitHub Issue**: [#483](https://github.com/Gamaroff/agent-skills/issues/483)

---

## 1. Overview

`scripts/release.sh` certifies a release on a **local** `npm test`, and a red in that run cannot tell
the maintainer whether it means "you broke something" or "the machine was busy — re-run me". This
task moves the release gate onto **CI's recorded verdict** for the commit being released, and gives
the load-sensitive class of test a **marker the reader of the failure sees**, backed by one list a
test holds in sync with the code. The one live instance that keeps tripping — session-handoff CR-6 —
is fixed so that it tolerates load instead of only naming it.

**Scope**: `scripts/release.sh` plus one new decision module; one new export in
`shared/resources/spawn-budget.mjs`; the CR-6 test; four wall-clock assertions; two contributing docs;
three new test files.

**Key deliverables**:

1. `release.sh` resolves the GitHub Actions verdict for `HEAD` **before** its local `npm test`, and
   refuses on anything but green — with `--skip-ci-check` as the named, loud escape hatch (obs #150).
2. `loadSensitive(detail)` in `spawn-budget.mjs`; every load-sensitive assertion's failure message is
   built with it; `docs/contributing/traps.md` carries the one list, and a guard test holds the list
   and the code equal (obs #157, #166).
3. The CR-6 test retries only on its **precondition miss** — the timeout fired before the grandchild
   existed — and fails with the load-sensitive marker when retries run out (obs #166).
4. `docs/contributing/releases.md` names the class beside the checklist, and `release.sh` prints the
   same instruction at the moment its `npm test` aborts (obs #157).

**Expected outcome**: a release cannot be tagged on a commit whose CI run is red, pending or unknown
without the maintainer typing a flag that names the risk; and a load-timing red identifies itself in
its own failure text, so it is re-run rather than re-diagnosed.

---

## 2. Motivation

### Current Problems

1. **The release gate reads the wrong verdict.** `release.sh` runs `npm test` on the maintainer's
   checkout (`scripts/release.sh:185-191`, *`info "Running npm test ..."`*) and never asks CI. On
   2026-09-21 that local run passed while the `Test` workflow on `develop` had been red for five
   consecutive pushes — an environment-only pass through the gitignored `.agents/skills` symlink
   (obs #150, citing obs #149). The checklist says "`test.yml` CI workflow is green on the release
   commit" (`docs/contributing/releases.md:27`), and nothing in the script checks it.
2. **A load-timing red aborts a five-minute run with no clue what kind of red it is.** On the
   v0.50.0 cut the pre-release `npm test` aborted on CR-6 in
   `skills/session-handoff/tests/handoff-verify.test.js`; the same test had passed minutes earlier and
   passed 33/33 alone (obs #157 — the five-minute and 33/33 figures are the observation's). On
   2026-09-23 the same test failed once in a `ci:fast` gate attempt inside task.141's QA cycle 8 and
   passed 3/3 alone, spending one of the develop pipeline's two fast-gate attempts (obs #166).
3. **The class has no name where a failure is read.** `docs/contributing/traps.md:109-114`
   (*"Two tests to distrust differently"*) names `qa-execute-snippets` as load-flaky. Nothing names
   CR-6, and no failure message says "timing-sensitive". Each trip is re-diagnosed from scratch.
4. **CR-6 cannot tell a precondition miss from a defect.** The test gives the verifier a 3 s timeout
   (`handoff-verify.test.js:1383-1385`, *`// 3 s, not 1: under load node can take longer…`*) and then
   reads the grandchild's pid file unconditionally (`:1389`,
   *`Number(fs.readFileSync(pidFile, "utf8"))`*). If the chain `verifier → npm → sh → node slow.js →
   grandchild` has not forked when the timer fires, the test dies with `ENOENT` — a result that proves
   nothing about the group kill it exists to test.

### Benefits of Solution

- A release is certified by the tree CI built, not by one developer's environment — the class
  obs #149 showed can diverge in silence.
- The CI check runs **before** the ~5-minute local `npm test`, so a red CI refuses in seconds.
- A load-sensitive red says so in its own message; the maintainer re-runs the file instead of
  investigating it, and a real failure is not re-run away because it lacks the marker.
- CR-6 stops spending retry budget that exists for real failures.

---

## 3. Technical Background

### Current Architecture

**Release gate.**

- `scripts/release.sh:115-153` — pre-flight: on `main`, clean tree, `HEAD` equal to `origin/main`
  (*`ok "Up to date with origin/main"`* at `:153`).
- `scripts/release.sh:185-191` — `npm test` under `set -euo pipefail` (`:34`): a red exits the script
  with no message of its own.
- `scripts/release.sh:201-229` — catalog and bundle regenerate and may **auto-commit**; `:357-365`
  commits `chore(release): vX.Y.Z` and tags. **The tagged commit is therefore never a commit CI has
  run** — it is `HEAD`-at-start plus generated files and a CHANGELOG move. The only commit that can
  carry a CI verdict is `HEAD` as it stands after the `:153` sync check.
- `scripts/release.sh:32` — *`# Requires: node >=22 …, git, curl, sed`*; `gh` is not a dependency
  today. The one GitHub call, the `--retry` guard at `:252-261`, uses unauthenticated `curl`.
- `.github/workflows/release.yml` (*`- name: Run tests`*) runs `npm test` **after** the tag is pushed;
  a red there leaves an orphan tag, which is what `release.sh --retry` recovers
  (`docs/contributing/releases.md:223-244`). That is a post-tag gate, not a pre-tag one.

**Which workflows run on a push to `main`** (read from each file's `on:` block):

| Workflow `name:` | File | Push to `main` |
| --- | --- | --- |
| `Test` | `test.yml:3-6` | always (no `paths:`) |
| `ShellCheck` | `shellcheck.yml:30-31` | always (no `paths:`) |
| `Validate Skills` | `validate.yml` `push.paths` | only when `skills/**`, `shared/resources/**` and five other paths change |
| `Docs link check` | `docs-link-check.yml` `push.paths` | only when Markdown docs change |
| `Branch Policy` | `branch-policy.yml` | `pull_request` only — never on a push |

`gh run list --commit 398107e6118ac20880885585463f82d71797b909 --json workflowName,conclusion,status,event,headSha`
(the current `origin/main`, `chore(release): v0.51.0`, 2026-09-22) returned **two** `Test` and **two**
`ShellCheck` runs, all `completed/success`, plus one `Release` — the same SHA is pushed to `main` and
then to `develop` by the sync step (`release.sh:369-386`). A verdict rule must therefore reduce
several runs per workflow, not read one.

**Load-sensitive tests.**

- `shared/resources/spawn-budget.mjs` — the repository's load helper (bug.2): `spawnBudget(prefix)`
  (`:86`) resolves `{PREFIX}_SPAWN_TIMEOUT_MS` / `_SPAWN_RETRIES` with defaults 60 000 ms and 2;
  `neverRan(result)` (`:116`) separates "the child never produced an answer" from "the child ran and
  failed" — the same distinction CR-6 is missing. It is bundled into four skills' `references/`
  (`git grep -ln spawn-budget -- 'skills/*/references/*'` → `finalise`, `qa-story`, `qa-task`,
  `review-security`).
- **Wall-clock threshold assertions**, enumerated by
  `git grep -nE "Date\.now\(\) - [A-Za-z0-9_]+ *<|elapsed *<" -- '*.test.js' '*.test.mjs' ':!skills/*/references/*'`
  — four on 2026-09-24:
  - `shared/resources/tests/access-config-parity.test.mjs:613` (*`Date.now() - t0 < 200`*)
  - `shared/resources/tests/qa-diminishing-returns.test.mjs:305` (*`elapsed < 2000`*)
  - `shared/resources/tests/qa-execute-snippets.test.mjs:795` (*`elapsed < 10_000`*) — the one
    `traps.md` already names
  - `skills/session-handoff/tests/handoff-verify.test.js:1429` (*`Date.now() - t0 < 40000`*, PRB-7,
    whose comment records a 10 s bound going red under the full suite)
- **Timeout-race assertions** — the pattern above cannot see them: CR-6
  (`handoff-verify.test.js:1363`). Its sibling CR-7 (`:1499`) already does the right thing: it polls
  for the pid file with a bounded deadline (`:1520-1524`) and asserts *"the grandchild never
  started"* before acting.
- `skills/session-handoff/scripts/handoff-verify.mjs:2009-2013` — `--timeout` accepts any positive
  finite number, fractional included, which is what makes a deterministic precondition-miss fixture
  possible.

### Target Architecture

**Release gate.**

- New `scripts/release-ci-verdict.mjs`: a pure `ciVerdict(runs, workflows)` plus a CLI
  `--sha <sha> [--json]` that fetches runs with
  `gh run list --commit <sha> --json workflowName,status,conclusion,event,databaseId --limit 50` and
  prints one JSON object with a `reason` of `green`, `red`, `pending` or `unverifiable`, following the
  repository's `--json reason` contract (exit 0 green, 1 anything else, 2 usage).
- The workflow table is **one constant** in that module: `required` = `Test`, `ShellCheck`;
  `whenPresent` = `Validate Skills`, `Docs link check`. A parity test reads the four `name:` fields and
  `on.push` blocks from `.github/workflows/` and fails if the constant and the files disagree.
- `release.sh` calls it right after `:153`, **before** the unmerged-branch warning and `npm test`,
  on the SHA it just verified equals `origin/main`. Anything but `green` exits 1 naming the workflow,
  the run URL and `--skip-ci-check`. `--skip-ci-check` proceeds with a warning that names the risk.
  `--dry-run` prints the verdict and, if it would refuse, ends its summary with *"Would have REFUSED"*.
- The `npm test` step is wrapped: on a red it prints the load-sensitive instruction (below) before
  exiting 1.

**Load-sensitive tests.**

- `spawn-budget.mjs` gains `LOAD_SENSITIVE` (the marker string) and `loadSensitive(detail)`, which
  returns `LOAD-SENSITIVE — timing depends on machine load; re-run this file alone before believing
  it: ${detail}`.
- Each of the four wall-clock assertions and CR-6's exhausted-retry failure build their message with
  `loadSensitive()`. **No threshold changes.**
- `docs/contributing/traps.md` § *Two tests to distrust differently* becomes § *Load-sensitive
  tests*: one line per file that carries the marker, plus the stdout-drain "not flaky — a failure is
  real" note it already holds.
- `tests/load-sensitive-marker.test.js` holds two directions: every wall-clock assertion the
  enumeration pattern finds is marked, and the set of files calling `loadSensitive(` equals the set
  `traps.md` lists.

**CR-6.** Each attempt runs in a fresh scratch dir. An attempt whose verdict is a timeout **and**
whose pid file is absent is a *precondition miss* and is retried with double the timeout
(3 s → 6 s → 12 s; the retry count comes from `spawnBudget("HANDOFF").retries`, default 2). Any other
outcome without a pid file is a real failure and is **not** retried. Retries exhausted → fail with
`loadSensitive(...)`. The group-kill assertion is unchanged.

### Same-class mechanism inventory (obs #103)

- **`--retry` GitHub check** (`release.sh:252-261`) asks "is a Release already published for this
  tag". The new check **sits beside** it: it asks "what did CI conclude for this SHA". Different
  question, different endpoint; neither replaces the other. The new check uses `gh` rather than the
  `curl` precedent because it has to be testable with a `PATH` stub, as
  `shared/resources/tests/gh-stage.test.mjs:1437` does, and because unauthenticated calls share a
  60-per-hour limit. `gh` becomes a declared dependency of a fresh release, not of `--retry`.
- **`release.yml`'s `npm test`** is CI gating the **tag**, after the push. The new check gates the
  **decision to tag**, before it. Both stay.
- **`spawnBudget()` retries and `neverRan()`** already answer "retry only a child that never
  answered". CR-6's precondition-miss rule **extends** that idea to a grandchild and reuses
  `spawnBudget("HANDOFF").retries` rather than adding a second retry knob.
- **`traps.md` § Two tests to distrust differently** is the existing list; it is **replaced** by the
  checked list, not duplicated. The `qa-execute-snippets` project-memory note is outside the
  repository and stays as it is.

No Mermaid diagram: the verdict rule is the four-row table in the plan file, and a flowchart would
restate it.

---

## 4. Scope

### In Scope

- ✅ `scripts/release-ci-verdict.mjs` (new) and its call in `scripts/release.sh`, including
  `--skip-ci-check`, `--dry-run` output and the `npm test` abort message
- ✅ `loadSensitive()` / `LOAD_SENSITIVE` in `shared/resources/spawn-budget.mjs`, and `npm run bundle`
  for its four bundled copies
- ✅ The CR-6 test restructure; the marker on the four enumerated wall-clock assertions
- ✅ `docs/contributing/traps.md` list; `docs/contributing/releases.md` class note and script steps
- ✅ Three new test files (see § 7) and a CHANGELOG `[Unreleased]` entry citing `(task 153)`

### Out of Scope

- ❌ **Obs #158 — dropped, already fixed.** The negative control in
  `evals/develop-story/protocol/install-hooks-behavior.test.mjs` was repaired by `62c9190e`
  (2026-09-22, *"the #2e negative control asserts that the legacy command fails, not how it phrases
  it"*): it now uses `spawnSync`, accepts `EPIPE` or a non-zero status, and matches the shell message
  only when `stderr` has one (`:218-248`). The observation's generalisation — *any
  `assert.throws(fn, /message/)` around a child whose stdin the parent writes* — has **no remaining
  instance**:
  `git grep -n -A8 -E 'assert\.(throws|rejects)\(' -- '*.test.js' '*.test.mjs' ':!skills/*/references/*' | grep -E 'input:'`
  printed nothing on 2026-09-24. A guard for a shape with zero instances would have nothing to catch.
- ❌ Raising any threshold or timeout. The marker names the class; it does not paper over it.
- ❌ Waiting or polling for a `pending` CI run inside `release.sh` (see Open Questions).
- ❌ Changing `release.yml`, the `--retry` path, or the develop pipeline's two-attempt fast-gate budget.
- ❌ Removing the local `npm test` from `release.sh` (see Open Questions).

---

## 5. Breaking Changes

**`release.sh` refuses where it used to proceed.**

- **Before**: `bash scripts/release.sh --minor` on a `main` whose `Test` run is red, pending, missing
  or unreadable proceeds to tag if the local `npm test` passes.
- **After**: it exits 1 before `npm test`, naming the workflow and run and the flag
  `--skip-ci-check`.
- **Affected**: the maintainer cutting a release; no consumer of the skills. The new `gh` dependency
  (authenticated) applies to fresh releases only.
- **Migration path**: wait for CI on the release-prep merge commit to finish green, then re-run. When
  GitHub is unreachable and the maintainer has confirmed CI by other means, pass `--skip-ci-check`; the
  script prints that the release is unverified against CI. `docs/contributing/releases.md` § Cutting a
  release documents both.

No API change to `spawn-budget.mjs`: the new export is additive and `spawnBudget` / `readInt` /
`neverRan` are untouched.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.153.plan.release-ci-gate-load-sensitive-tests.md](task.153.plan.release-ci-gate-load-sensitive-tests.md)

### Phase 1: CI verdict module (Risk: Low)

**Files**: `scripts/release-ci-verdict.mjs`, `tests/release-ci-verdict.test.js`

- [ ] `ciVerdict(runs, WORKFLOWS)` — pure; the reduction rule in the plan's verdict table
- [ ] CLI `--sha` / `--json`; `gh` absent, unauthenticated or failing → `unverifiable`, never `green`
- [ ] `WORKFLOWS` constant and the parity test against `.github/workflows/*.yml`

### Phase 2: wire it into `release.sh` (Risk: Medium)

**Files**: `scripts/release.sh`, `tests/release-ci-gate.test.js`

- [ ] Call the module after the `origin/main` sync check, before the unmerged-branch warning and `npm test`
- [ ] `--skip-ci-check` flag; header usage and `# Requires:` line name `gh`
- [ ] `--dry-run` prints the verdict and the *Would have REFUSED* summary line
- [ ] Wrap `npm test`: on failure print the load-sensitive instruction, then exit 1
- [ ] `npm run lint:shell` clean

### Phase 3: the load-sensitive marker and its list (Risk: Low)

**Files**: `shared/resources/spawn-budget.mjs`, the four wall-clock test files, `docs/contributing/traps.md`,
`tests/load-sensitive-marker.test.js`

- [ ] `LOAD_SENSITIVE` + `loadSensitive(detail)`; `npm run bundle` refreshes the four copies
- [ ] Build each enumerated assertion's message with `loadSensitive()`; thresholds unchanged
- [ ] `traps.md` § *Load-sensitive tests* lists each marked file
- [ ] Guard test, both directions, with non-vacuity floors

### Phase 4: CR-6 tolerates its precondition miss (Risk: Medium)

**Files**: `skills/session-handoff/tests/handoff-verify.test.js`

- [ ] Extract `retryUntilForked(schedule, attempt)` in the test file; unit-test it with a fake attempt
- [ ] CR-6 uses it: fresh dir per attempt, 3 s doubling, `spawnBudget("HANDOFF").retries` retries
- [ ] Retry only on *timeout and no pid file*; exhausted → `loadSensitive(...)`; group-kill assertion unchanged

### Phase 5: docs and validation (Risk: Low)

**Files**: `docs/contributing/releases.md`, `CHANGELOG.md`

- [ ] § Release checklist: a note naming the load-sensitive class and the re-run-alone rule, and
      saying the CI boxes are now enforced by `release.sh`
- [ ] § Cutting a release: the new step and `--skip-ci-check`; renumber the script steps
- [ ] CHANGELOG `[Unreleased]` cites `(task 153)`
- [ ] Mutation proofs recorded in the implementation report; `npm run ci` green

---

## 7. Files Summary

### Files to Add

1. ✅ `scripts/release-ci-verdict.mjs` — verdict reduction + `gh` fetch + CLI
2. ✅ `tests/release-ci-verdict.test.js` — reduction table, CLI with a stubbed `gh`, workflow parity
3. ✅ `tests/release-ci-gate.test.js` — `release.sh` in a sandbox repo with `gh` and `npm` stubbed on `PATH`
4. ✅ `tests/load-sensitive-marker.test.js` — the two-direction guard

All three test files are inside the existing `'tests/*.test.js'` glob in `package.json` `test`, which
`test.yml` runs on every push and PR with no `paths:` filter.

### Files to Modify

5. ✅ `scripts/release.sh` — CI check, `--skip-ci-check`, `npm test` wrapper, header
6. ✅ `shared/resources/spawn-budget.mjs` — `LOAD_SENSITIVE`, `loadSensitive()`
7. ✅ `skills/{finalise,qa-story,qa-task,review-security}/references/spawn-budget.mjs` — regenerated by
   `npm run bundle`, never hand-edited
8. ✅ `shared/resources/tests/access-config-parity.test.mjs` — marker at `:613`
9. ✅ `shared/resources/tests/qa-diminishing-returns.test.mjs` — marker at `:305`
10. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs` — marker at `:795`
11. ✅ `skills/{qa-story,qa-task}/references/tests/qa-execute-snippets.test.mjs` — regenerated by
    `npm run bundle`
12. ✅ `skills/session-handoff/tests/handoff-verify.test.js` — CR-6 restructure; marker on PRB-7 `:1429`
13. ✅ `docs/contributing/traps.md` — § Load-sensitive tests
14. ✅ `docs/contributing/releases.md` — class note, new script step, `--skip-ci-check`
15. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **`tests/release-ci-verdict.test.js`** — every row of the verdict table in the plan, including:
  two runs of one workflow with one `failure` → `red`; `in_progress` → `pending`; no runs for a
  `required` workflow → `unverifiable`; a `whenPresent` workflow absent → still `green`; `cancelled`
  alone → `unverifiable`. CLI: a `PATH`-stubbed `gh` that exits non-zero or prints non-JSON, and
  an injected spawn that fails with `ENOENT` (no `gh` installed) → `unverifiable` with exit 1. Parity: `WORKFLOWS` names match the `name:` fields, the two
  `required` workflows have no `push.paths`, the two `whenPresent` workflows do.
- **`tests/load-sensitive-marker.test.js`** — direction A: each hit of the enumeration pattern has
  `loadSensitive(` inside the same `assert` call; floor: the pattern finds at least 4 hits. Direction
  B: the files calling `loadSensitive(` equal the files `traps.md` § Load-sensitive tests names;
  floor: at least 4 files (the four wall-clock files; `handoff-verify.test.js` carries both PRB-7
  and CR-6). `spawn-budget.mjs`, which defines the marker, and the guard test itself are excluded. Bundled
  `references/` copies are excluded from both scans.
- **`handoff-verify.test.js`** — `retryUntilForked` against a fake attempt: hit first → one attempt;
  miss then hit → two attempts, returns the hit; non-timeout miss → no retry, real failure; all
  misses → throws with `LOAD_SENSITIVE` in the message.
- **Command**: `command node --test tests/release-ci-verdict.test.js tests/release-ci-gate.test.js tests/load-sensitive-marker.test.js skills/session-handoff/tests/handoff-verify.test.js`

### Integration Tests

- **`tests/release-ci-gate.test.js`** runs the real `scripts/release.sh` in a scratch clone of a
  scratch bare origin, on `main`, with `develop` present, stubs on `PATH` for `gh` (canned JSON) and
  `npm` (writes a marker file, exits with a chosen code):
  - `gh` red, non-dry-run → exit 1, output names `Test` and `--skip-ci-check`, **the `npm` marker file
    does not exist** (refused before the local test)
  - `gh` stub exits 1 with an authentication error → exit 1, `unverifiable`
  - `gh` green, `npm` exits 1 → exit 1, output carries the `LOAD-SENSITIVE` re-run instruction
  - `gh` red, `--dry-run` → output carries the verdict and *Would have REFUSED*
  - `gh` red, `--skip-ci-check --dry-run` → proceeds to *Next version* with the unverified warning
  - Every case exits before the CHANGELOG step, so nothing is committed, tagged or pushed.

### Performance Tests

- The CI check adds one `gh` call before a local run of roughly five minutes (obs #157's figure); no
  baseline measurement is needed.
- CR-6's idle-machine path is unchanged at one 3 s attempt; its worst case is bounded at 3 + 6 + 12 s
  with the default two retries.

### Consumer Tests

- None: `scripts/` is not shipped in any skill, and `loadSensitive` is additive in the bundled
  `spawn-budget.mjs` copies. `npm run bundle:check` confirms the copies match their source.

---

## 9. Success Criteria

### Functional

- [ ] `release.sh` exits 1 before `npm test` runs when CI for `HEAD` is red, pending or unverifiable
      — held by `tests/release-ci-gate.test.js` (the `npm` marker file is absent)
- [ ] `--skip-ci-check` proceeds and prints that the release is unverified against CI — held by
      `tests/release-ci-gate.test.js`
- [ ] `--dry-run` prints the verdict and *Would have REFUSED* when it would refuse — held by
      `tests/release-ci-gate.test.js`
- [ ] `ciVerdict` returns the verdict in every row of the plan's table; `gh` missing or failing is
      `unverifiable`, never `green` — held by `tests/release-ci-verdict.test.js`
- [ ] A failing local `npm test` in `release.sh` prints the load-sensitive re-run instruction — held
      by `tests/release-ci-gate.test.js`
- [ ] CR-6 retries a precondition miss and does not retry any other failure; exhausted retries fail
      with the `LOAD-SENSITIVE` marker — held by `handoff-verify.test.js`
- [ ] Every assertion the enumeration pattern finds, and CR-6, carry the marker, and `traps.md` lists
      exactly the files that do — held by `tests/load-sensitive-marker.test.js`

### Performance

- [ ] CR-6 still takes one 3 s attempt on an idle machine (no raised timeout)
- [ ] The three new test files make no network call (`gh` is always a stub)

### Code Quality

- [ ] Each mutation below turns its named test red, recorded in the implementation report:
      (M1) `ciVerdict` treats `failure` as green → `release-ci-verdict.test.js`;
      (M2) no runs counted as green → `release-ci-verdict.test.js`;
      (M3) the CI call moved after `npm test` → `release-ci-gate.test.js` (marker file present);
      (M4) the CI call deleted → `release-ci-gate.test.js`;
      (M5) a `WORKFLOWS` name changed → the parity case;
      (M6) `retryUntilForked` returns the first attempt → `handoff-verify.test.js`;
      (M7) it retries a non-timeout miss → `handoff-verify.test.js`;
      (M8) the marker removed from `qa-execute-snippets.test.mjs:795` → `load-sensitive-marker.test.js`
      direction A; (M9) a `traps.md` line deleted → direction B;
      (M10) `killGroup` in `handoff-verify.mjs` kills only the leader → CR-6 still red on
      *"the grandchild outlived the timeout"*
- [ ] `npm run ci` green, including `lint:shell` on `release.sh` and `bundle:check`

### Migration

- [ ] `docs/contributing/releases.md` documents the CI step, `--skip-ci-check` and the load-sensitive
      re-run rule beside the checklist
- [ ] CHANGELOG `[Unreleased]` cites `(task 153)`
- [ ] The implementation report records one `release.sh --dry-run --patch` against real `main`
      showing the verdict line (evidence the `gh` query shape works against the live API; not held
      by CI)

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The verdict rule blocks a legitimate release**
   - Risk: a superseded `cancelled` run, a workflow renamed without updating the constant, or a
     path-filtered workflow made unconditional leaves `release.sh` refusing a good commit.
   - Probability: Medium · Impact: Medium (a release delayed, never a bad one shipped)
   - Mitigation: the rule fails closed with a message naming the workflow and run; the parity test
     catches a rename at PR time; `--skip-ci-check` is the documented escape.
   - Rollback: revert Phase 2 alone; the module is inert without its call.
2. **`release-ci-gate.test.js` is itself spawn-heavy**
   - Risk: it runs `bash`, `git` and a bare-repo fetch per case, the load-sensitive shape this task
     names.
   - Probability: Medium · Impact: Low
   - Mitigation: spawn with `spawnBudget("RELEASE_GATE")`; assert on exit code and output, never on
     elapsed time.
3. **CR-6 retries hide a real regression**
   - Risk: a verifier that stopped starting the command at all looks like a precondition miss.
   - Probability: Low · Impact: Medium
   - Mitigation: retry only when the verdict is a **timeout** and the pid file is absent; a
     non-timeout verdict without a pid file fails at once (M7 proves it).

### Low Risk Areas

1. **`gh` becomes a release dependency** — the maintainer already uses `gh` for the release-prep PR
   (`releases.md:94`) and the recovery path (`:232`); a missing `gh` is `unverifiable`, not a crash.
2. **The enumeration pattern misses a new spelling** of a wall-clock assertion — direction B still
   holds every file that uses the marker; the pattern is stated in the test so it can be widened.
3. **Bundle churn** — four regenerated `spawn-budget.mjs` copies and two `qa-execute-snippets` copies
   in one commit; `bundle:check` enforces they match.

### Open Questions (recorded, defaults taken)

1. **One task or two?** By create-task § 1.2 the CI gate (obs #150) passes the splitting test alone —
   independently shippable, revertible and valuable. It is kept in this document because the caller
   assigned one task number for these observations; Phases 1–2 and 3–4 revert independently. If it is
   split, § 1.2's registry note is owed.
2. **Keep the local `npm test` once CI gates?** Default: keep it — it is the only check of the
   maintainer's tree before the auto-commits, and it now fails with the load-sensitive instruction
   instead of silently. Dropping it would save ~5 minutes per release.
3. **Wait for `pending`?** Default: refuse with *"CI is still running for `<sha>` — re-run when it
   finishes"*; no polling loop.
4. **`access-config-parity.test.mjs:613`** asserts an in-process call takes under 200 ms as a proxy for
   "no subprocess spawned". Default: mark it, do not change it. A spawn counter would be the stronger
   assertion and is left for a separate change.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: `release.sh` refuses a release whose CI is green on the GitHub UI; or the new tests
  are red on `develop` for reasons unrelated to a change.
- **Steps**: revert the PR. The script returns to its local-only gate; the tests and marker go with it.
- **Validation**: `bash scripts/release.sh --dry-run --patch` on `main` reaches *Next version*;
  `npm test` green.

### Partial Rollback (1–2 hours)

- Revert Phase 2 alone (the `release.sh` call) and keep the module, marker and CR-6 fix; or revert
  Phase 4 alone if the CR-6 retry misbehaves, restoring the single 3 s attempt.

### Forward Fix

- A verdict-rule misfire (for example a new conclusion value) is a row added to `ciVerdict` and its
  table test. A missed wall-clock spelling is a pattern widened in the guard.

### Rollback Triggers

- **Critical**: a release tagged over a red CI run (the gate failed open).
- **Non-critical**: a refusal over a good commit — use `--skip-ci-check` and fix forward.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                                                                     | Author      |
| ---------- | ------- | ----------------------------------------------------------------------------------------------- | ----------- |
| 2026-09-24 | 1.0     | Initial draft — cut from observations #150, #157, #158, #166 (2026-09-24 observation review) | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: CI verdict module
- [ ] Phase 2: wire it into `release.sh`
- [ ] Phase 3: the load-sensitive marker and its list
- [ ] Phase 4: CR-6 tolerates its precondition miss
- [ ] Phase 5: docs and validation

---

## References

- Observation #150 — release.sh gates on local npm test, not on CI's verdict for the commit it tags
- Observation #157 — a load-sensitive test red aborts release.sh five minutes in, and nothing marks it
- Observation #158 — a negative control pinned to one side of a stdin-write race (fixed by `62c9190e`; out of scope)
- Observation #166 — session-handoff CR-6 process-group timeout test is load-flaky
- [`scripts/release.sh`](../../../scripts/release.sh) · [`docs/contributing/releases.md`](../../contributing/releases.md) · [`docs/contributing/traps.md`](../../contributing/traps.md)
- [`shared/resources/spawn-budget.mjs`](../../../shared/resources/spawn-budget.mjs) — bug.2's load helper
- [`skills/session-handoff/tests/handoff-verify.test.js`](../../../skills/session-handoff/tests/handoff-verify.test.js) — CR-6 and its CR-7 sibling

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.153.qa.{N}.release-ci-gate-load-sensitive-tests.md`,
  `task.153.gate.{N}.release-ci-gate-load-sensitive-tests.yml`, bug reports `task.153.bug.{N}.{name}.md`.
- Observations #150, #157 and #166 are resolved (`set-status --status actioned`) when this task's PR
  merges. Observation #158 is already actioned by `62c9190e`; resolve it at the next observation review
  citing that commit, not this task.
- Edit `shared/resources/` sources and run `npm run bundle`; never edit `skills/*/references/` by hand.
