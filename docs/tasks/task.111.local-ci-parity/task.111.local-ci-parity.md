---
id: task.111
title: "[Task 111] One local command that runs every CI lane, and two coverage gaps the sweep found"
type: task
description: "npm run ci runs format:check + npm test + eval:all — three of the five CI lanes. validate:all, bundle:check and the ShellCheck lane have no local aggregate, so a contributor can be fully green locally and red in CI on a lane they never ran. Two coverage gaps ride along: develop-task's hook wrappers are untested while develop-story's identical wrappers are, and quick_validate.py does not enforce the 1,024-char description cap (develop-story's is 1,027)."
tags: [ci, testing, tooling, create-skill]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-16
assignee:
estimated_effort_hours: 4
github_issue: 411
---

# Technical Task: One local command that runs every CI lane, and two coverage gaps the sweep found

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.111.review.1.local-ci-parity.md` implemented 2026-09-16
**GitHub Issue**: [#411](https://github.com/Gamaroff/agent-skills/issues/411)

---

## 1. Overview

Make `npm run ci` mean what its name says: every lane CI runs, in one local command. Then close two
small coverage gaps the 2026-09-12 sweep found while measuring parity.

**Scope**: `package.json` scripts; a test for `skills/develop-task/scripts/*.sh`; a description-length
check in `quick_validate.py`; docs that name the aggregate.

## 2. Motivation

### Current Problems

1. **`npm run ci` is three of five lanes.** `ci` = `ci:fast` (`format:check && npm test`) + `eval:all`.
   CI also runs `validate.yml` (per-skill `quick_validate.py`, catalog diff, skill-deps diff,
   `bundle_skill.py --check`, `bundle --all` no-diff) and `shellcheck.yml`. A contributor who runs
   `npm run ci` and pushes can fail on two lanes they had no local command for. The release
   checklist (`docs/contributing/releases.md`) lists all five workflows; nothing local composes them.
2. **No pipeline's hook wrappers are tested — not one of the three.** `skills/develop-{story,task,bug}/scripts/{install-hooks,on-precompact,on-stop}.sh`
   are byte-identical one-line wrappers (`exec "$(dirname "$0")/../references/develop-pipeline-<name>.sh" "$@"`)
   over the shared scripts, which are tested. The sweep read
   `evals/develop-story/protocol/install-hooks-behavior.test.mjs` as covering develop-story's set; it
   does not — that test runs the **shared installer** against a sandbox and replaces the hook scripts
   with stubs, so no wrapper is ever executed by any test. A wrapper whose `exec` target moved, or
   that dropped `"$@"`, would break every hook fire and stay green. (Verified during review,
   2026-09-16: `diff -q` across the three sets is empty; the test file never references
   `scripts/on-stop.sh` outside its stub sandbox.)
3. **`quick_validate.py` does not enforce the description cap.** The Agent Skills spec caps a
   SKILL.md `description` at **1,024 characters**; nothing in this repository states or checks it.
   Measured on the whitespace-normalised string `quick_validate.py` already builds
   (`' '.join(description.split())`), `skills/develop-story/SKILL.md` is **1,025** (1,029 raw) and
   `skills/sync-jira-bug/SKILL.md` is 1,023 — one character under; 128/128 skills "pass". A cap
   nothing enforces is a number in a spec nobody reads at commit time.

### Benefits

1. Local/CI parity — the thing the release checklist assumes.
2. Three pipelines' wrappers held to one standard, not one of three.
3. The description cap becomes a check, so the next skill that drifts over it is caught at
   `validate` rather than by a consumer's loader.

## 3. Technical Background

### Current Architecture

- `package.json`: `ci`, `ci:fast`, `validate:all` (a shell loop over `skills/*/`), `bundle:check`,
  `eval:all`. No shellcheck script.
- `.github/workflows/shellcheck.yml`: `git ls-files '*.sh' | grep -v '^skills/[^/]*/references/'`
  at `--severity=warning`, pinned v0.11.0, hard-fails if the list is ≥ 200 or empty (58 files as of
  2026-09-12). `shellcheck` v0.11.0 is installed locally on the maintainer's machine; treat absence
  as a **skip with a message**, never a silent pass.
- `evals/develop-story/protocol/install-hooks-behavior.test.mjs` — tests the shared installer with
  stubbed hooks; its sandbox/assertion style is the pattern to borrow, but it is **not** a wrapper test.
- `skills/create-skill/scripts/quick_validate.py` — frontmatter checks; a word-count *warning*
  (>150 words) but no character cap.
- **`evals/shared/tests/ci-gate-parity.test.mjs` asserts set equality, in both directions, between
  the npm scripts `test.yml`'s `test` job runs and `expand(ci)`.** It reads that one job and no
  other (by design — see its `jobBlock` comment). Recomposing `ci` as this task intends therefore
  turns that test red on the first run: `validate:all`, `bundle:check` and `lint:shell` would be in
  the composite and absent from the only job it reads. `shellcheck.yml`'s header comment records
  exactly this constraint as the reason the lane got its own workflow. The test is right to exist and
  wrong in scope; this task widens it (see Target Architecture and §6 step 2).
- `validate.yml` has five gate steps, not two: `Validate all skills`, `Catalog up-to-date check`,
  `Skill dependency graph up-to-date check`, `Bundle freshness — per-file check` and
  `Bundle freshness check` (regenerate-and-diff). The catalog and skill-deps diffs have **no local
  counterpart at all** — the pre-commit hook only re-bundles.

### Target Architecture

- `npm run ci` → `ci:fast` + `eval:all` + `validate:all` + `check:generated` + `bundle:check` +
  `lint:shell`, every term an `npm run` of a named script so the composite stays a composite.
  - `lint:shell` = `bash scripts/lint-shell.sh` — a script, not a package.json one-liner, so it is
    itself a linted source and can carry the workflow's two guards (≥200 files ⇒ bundled copies leaked
    in; 0 files ⇒ the lane checked nothing) and the same file-list expression and
    `--severity=warning`. Binary absent ⇒ print `shellcheck not installed — lane skipped (CI runs it;
    container form in CONTRIBUTING.md)` and exit 0 — loud, never silent. `shellcheck.yml` gains a
    one-line comment naming the script as its twin (comment only; CI's behaviour is unchanged).
  - `check:generated` = run `generate-catalog` and `generate-skill-deps`, then
    `git diff --exit-code -- docs/reference/skill-catalog.md README.md shared/resources/skill-dependencies.json`
    — the exact shape of `validate.yml`'s two drift steps. It rewrites the tree when stale, as CI does;
    the diff that fails the gate is the diff to commit.
  - `bundle:check` is the read-only per-file check. `validate.yml`'s regenerate-and-diff
    (`Bundle freshness check`) is a **declared exclusion**: the pre-commit hook re-bundles on every
    commit that touches `shared/resources/` or a `SKILL.md`, which is the only way the copies go stale.
- `ci-gate-parity.test.mjs` widened from one job to **every green-defining job**:
  `test.yml:test`, `validate.yml:validate`, `shellcheck.yml:shellcheck`. Each `run:` step in those
  jobs must be one of: an `npm run` of a script (as today); a step whose `name:` appears in a
  `LANE_TWINS` map naming the local script that reproduces it (`Validate all skills` → `validate:all`,
  `Catalog up-to-date check` and `Skill dependency graph up-to-date check` → `check:generated`,
  `Bundle freshness — per-file check` → `bundle:check`, `Lint source shell scripts` → `lint:shell`);
  an environment-setup step (`npm ci`, `pip install`, `apt-get`, the pinned shellcheck install) in a
  declared `SETUP_STEPS` list; or a declared exclusion with a written reason (`Bundle freshness
  check`). **A step that is none of the four fails the test** — that is the lane-added-to-CI-but-not-
  the-composite drift the test exists to catch, now on all three workflows. Set equality in both
  directions is kept: `sorted(mapped scripts) deepEqual sorted(expand(ci))`. A twin keyed on a step
  name also means renaming the step breaks the test loudly rather than silently dropping the lane.
- One new wrapper test, `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` (the glob is
  already in `npm test`, so no suite-list edit — see traps). Population enumerated from
  `skills/develop-*/scripts/{install-hooks,on-precompact,on-stop}.sh` with a floor of three
  pipelines × three wrappers. Per wrapper, behaviourally: copy it into a sandbox at the same relative
  depth, plant a stub at `../references/develop-pipeline-<name>.sh` that echoes its argv and stdin and
  exits 7, run the wrapper with arguments and a JSON event on stdin, assert argv and stdin arrive
  intact and exit 7 propagates; and assert the real `exec` target exists in the tree. Never executes
  a real hook.
- `quick_validate.py`: after normalisation, `len(description) > 1024` → fail with
  `description is {n} chars (max 1024 — Agent Skills spec)`.

### Important Clarifications

- The four `evals/*/smoke/*` scenarios are **live-driver** (need `ANTHROPIC_API_KEY`) and opt-in by
  design; they are *not* a parity gap and this task does not add them to any aggregate.
- `bundle --all` no-diff is already exercised by the pre-commit hook; `bundle:check` is the cheap
  form and is what the aggregate should call. The parity test records this as a declared exclusion
  with that reason, so the omission is a decision on file rather than a gap.
- "Five lanes" means the five workflows the release checklist lists: `test.yml`, `validate.yml`,
  `shellcheck.yml`, `docs-link-check.yml` and `branch-policy.yml`. The aggregate mirrors the first
  three. `docs-link-check` is task.108's checker and path-filtered (out of scope, §4);
  `branch-policy` gates PRs into `main` only and has no local meaning.
- Changing `shellcheck.yml` to call `npm run lint:shell` would make the parity trivially true and is
  **deliberately not done** — §4 rules out changing what CI runs, and the twin map is what keeps the
  invariant honest without it.

## 4. Scope

### In Scope

✅ `package.json`: `lint:shell`, `check:generated`, `ci` composition; keep `ci:fast` as the quick form
✅ `scripts/lint-shell.sh` (the `lint:shell` body) and a twin comment in `shellcheck.yml`
✅ `ci-gate-parity.test.mjs` widened to all three green-defining jobs with the twin/setup/exclusion map
✅ Wrapper test covering all three `develop-*` hook wrapper sets (new shared test file)
✅ `quick_validate.py` description cap + trim `develop-story`'s description under 1,024 with margin
✅ Docs: releases checklist and evals README name `npm run ci` as the full local equivalent

### Out of Scope

❌ Widening `docs-link-check.yml` (that is task.108's checker)
❌ Any change to what CI runs — this makes local match CI, not the reverse

## 5. Breaking Changes

None. `npm run ci` gets slower (adds four lanes); `ci:fast` is unchanged for the quick loop.
`check:generated` may rewrite `docs/reference/skill-catalog.md`, `README.md` (badge) and
`shared/resources/skill-dependencies.json` when they are stale — the same files CI regenerates.

## 6. Implementation Plan

1. `scripts/lint-shell.sh` mirroring `shellcheck.yml`'s list, guards and severity; absent-binary
   message; `lint:shell` and `check:generated` scripts in `package.json`; twin comment in the workflow.
2. Widen `ci-gate-parity.test.mjs` **before** recomposing `ci` (red → green in one commit is fine,
   but the test must be the thing that proves the composition, not the thing the composition breaks):
   green-defining jobs table, `LANE_TWINS`, `SETUP_STEPS`, declared exclusions, the "unclassified
   step fails" rule. Then recompose `ci`; run it end-to-end once and record the wall time.
3. Wrapper test: `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` as specified in
   Target Architecture — tree-enumerated population, floor of 3 × 3, stub-target sandbox per wrapper.
4. `quick_validate.py` cap; run `validate:all` → one failure (develop-story); trim the description
   to land with margin (≤ ~1,000 normalised) without losing a trigger phrase; re-run → clean.
   Leave `sync-jira-bug` (1,023) alone — note it as the next one to drift.
5. Docs + CHANGELOG.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `package.json` | `lint:shell`, `check:generated`, `ci` |
| `scripts/lint-shell.sh` | new — the `lint:shell` body |
| `.github/workflows/shellcheck.yml` | one-line twin comment only (no behaviour change) |
| `evals/shared/tests/ci-gate-parity.test.mjs` | widened to all green-defining jobs; twin / setup / exclusion map |
| `evals/shared/tests/develop-pipeline-hook-wrappers.test.mjs` | new — parametrised over the three pipelines' wrappers |
| `skills/create-skill/scripts/quick_validate.py` | description cap (`DESCRIPTION_MAX_CHARS = 1024`) |
| `tests/skill-frontmatter.test.js` | three cap tests: 1,025 rejected, 1,024 accepted, corpus within cap |
| `skills/develop-story/SKILL.md` | description ≤ 1,024 |
| `docs/contributing/releases.md`, `docs/contributing/evals/README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` | name the aggregate and the fast tier |

## 8. Testing Strategy

- `npm run ci` locally: exit 0, all lanes visibly run.
- Parity: mutation — add a `run: echo hi` step under a new name to `validate.yml`'s job (uncommitted)
  → the test fails naming the unclassified step; drop `lint:shell` from `ci` → the test fails on the
  set diff. Both reverted before commit.
- Wrapper test: mutation — break `develop-task/scripts/on-stop.sh`'s delegation → the test fails
  naming develop-task.
- Cap: mutation — set a fixture description to 1,025 chars → `quick_validate.py` exits non-zero.
- `shellcheck` absent: `PATH=/usr/bin:/bin bash scripts/lint-shell.sh` (not via `npm`, which is not
  on that PATH) → the skip message, exit 0.

## 9. Success Criteria

1. `npm run ci` runs format, test, eval:all, validate:all, check:generated, bundle:check and the shell lint, and exits 0 on `develop`
2. A wrapper test covers `develop-story`, `develop-task` and `develop-bug` wrappers, with the population derived from the tree
3. `quick_validate.py` fails on a description > 1,024 chars; every skill passes after the trim
4. Missing `shellcheck` is reported, not silently passed
5. Releases checklist names `npm run ci` as the local equivalent of the lanes it mirrors, and names the ones it does not
6. `ci-gate-parity.test.mjs` reads all three green-defining jobs and fails on an unclassified step in any of them

## 10. Risk Assessment

**Low.** Script composition and additive tests. Two judgement calls: whether `ci` should fail when
`shellcheck` is absent — loud-skip, since a contributor without the binary still gets every other
lane and CI holds the line; and whether the parity test's twin map is itself a second enumeration of
"what CI runs" — it is, but it is keyed on step names the test asserts exist, so a rename or a new
step fails loudly, which is the opposite of silent drift.

## 11. Rollback Plan

Revert `package.json`; the tests and the cap are additive and can stay.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |
| 2026-09-16 | 1.1     | Review (8/10): ci-gate-parity conflict surfaced and resolved by widening the test; wrapper-test claim corrected (no pipeline's wrappers were tested); cap provenance pinned to the Agent Skills spec; lint:shell moved to a script with the workflow's guards; check:generated added | review-task |
| 2026-09-16 |         | Status → ready-for-development | review-task |
| 2026-09-16 |         | Implemented — 12 files, 25 tests | develop |
| 2026-09-16 |         | QA gate CONCERNS (90/100) — 3 LOW findings (skip fall-through, corpus over-count on block scalars, missing-script guard reads one job); 2 advisories | qa-task |
| 2026-09-16 |         | QA gate CONCERNS (90/100), cycle 2 refute pass — cycle-1 findings verified fixed; 1 MEDIUM (cap measured on a normalised string, not the parsed value) + 2 LOW (uses: gate step unclassified; exec untested) + 2 cleanups | qa-task |
| 2026-09-16 |         | QA gate CONCERNS (100/100), cycle 3 scoped — gate-2 fixes verified; 1 LOW (parity step parser ignores key order) + 3 comment cleanups | qa-task |
| 2026-09-16 |         | QA gate CONCERNS (90/100), cycle 4 scoped — gate-3 fix verified; 1 MEDIUM (parser reads keys at any indentation: with: name: and list-shaped run bodies misparse) + 2 cleanups | qa-task |
| 2026-09-16 |         | QA findings fixed — cycle 1: return after skip, corpus strips block-scalar indicator, missing-script guard over every green job, jobSteps tidy; cycle 2: cap measured on the parsed value, uses: steps classified, exec asserted via pid, twins expanded; cycle 3: step keys parsed order-independently; cycle 4: keys read only at the step's own column (with: inputs and block bodies no longer misparse), every block-scalar indicator normalised, redundant filter dropped; 4 iterations | qa-fix |

---

## Progress Tracking

### Phase 1: one local aggregate
- [x] `npm run ci` = format:check + test + eval:all + validate:all + check:generated + bundle:check + shellcheck lane
- [x] `ci-gate-parity.test.mjs` widened to every green-defining job (twin / setup / exclusion map)
### Phase 2: the two coverage gaps
- [x] all three pipelines' hook wrappers covered by one tree-enumerated test
- [x] `quick_validate.py` enforces the 1,024-char description cap; develop-story's trimmed
### Phase 3: docs
- [x] `docs/contributing/releases.md` checklist and `docs/contributing/evals/README.md` name the aggregate

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-16 (cycle 4)
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.111.qa.4.local-ci-parity.md](./task.111.qa.4.local-ci-parity.md) (earlier: [qa.1](./task.111.qa.1.local-ci-parity.md), [qa.2](./task.111.qa.2.local-ci-parity.md), [qa.3](./task.111.qa.3.local-ci-parity.md))
- **Gate File**: [task.111.gate.4.local-ci-parity.yml](./task.111.gate.4.local-ci-parity.yml) (earlier: [gate.1](./task.111.gate.1.local-ci-parity.yml), [gate.2](./task.111.gate.2.local-ci-parity.yml), [gate.3](./task.111.gate.3.local-ci-parity.yml))

### Test Coverage Summary
- **Tests Executed**: 25 new (parity 12 incl. 3 new, wrappers 19, frontmatter cap 3) + targeted lanes; 7 boundary probes
- **Phases Verified**: 3/3
- **Critical Issues**: 0 (cycle 4: 1 MEDIUM)
- **NFR Status**: Security: PASS (cycle 2 measured, 9 probes; cycle 3 reasoned), Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings
Cycle 4 (scoped): gate-3 fix verified; the cycle-3 relaxation reads keys at any indentation — `with: name:` overwrites a step name and a list-shaped `run: |` body spawns a phantom step (CR-1, MEDIUM). Cycle 3 (scoped): gate-2 fixes verified on the head; one LOW — the parity step parser records a step unnamed when `name:` follows `uses:`/`run:` (CR-1). Cycle 2 (refute pass): cycle-1 findings verified fixed; the cap was measured on a normalised string a loader never sees (CR-1, MEDIUM — now the parsed value), `uses:` gate steps slipped the parity classifier (CR-2), and the wrapper test could not detect a dropped `exec` (CR-3). Cycle 1: three LOW defects in the new tests, each verified by execution: `t.skip` fall-through in the wrapper pass-through test (CR-1); the corpus cap test over-counts block-scalar descriptions by 2 (CR-2); the parity test's missing-script guard still reads test.yml only — a typo'd `npm run` step in validate.yml stays green (CR-3). Advisory: `check:generated` false-positives on an unrelated dirty README (CR-4); `jobSteps()` tidy-up (CR-5).

---

## References

- **Plan**: [`task.111.plan.local-ci-parity.md`](task.111.plan.local-ci-parity.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **CI**: `.github/workflows/{test,validate,shellcheck,docs-link-check}.yml`
- **Traps**: `docs/contributing/traps.md` — "CI check counts differ per PR", "npm test's suite list is hand-maintained"
- **Related Skill**: `.agents/skills/create-skill/` (`quick_validate.py`)

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.111.local-ci-parity/task.111.local-ci-parity.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
