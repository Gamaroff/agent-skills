---
id: task.174
title: "[Task 174] Publish the docs-only CI classifier as an optional consumer template"
type: task
description: "Lift tinker-city task.127's classify-changes.sh and its spec into agent-skills as an optional consumer template with a GitHub Actions changes-job snippet and a guide, so a consumer's CI skips its heavy jobs on a docs-only push over a green head. tinker-city task.127 has merged (PR #984) and skipped the heavy jobs on a real docs-only push (run 41445192250)."
tags: [ci, consumer-template, github-actions, bitbucket, performance, consumer-handoff]
category: infrastructure
status: ready-for-review
priority: Low
created: 2026-10-01
updated: 2026-11-02
assignee:
estimated_effort_hours: 8
github_issue: 541
---

# Technical Task: Publish the docs-only CI classifier as an optional consumer template

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.174.review.1.ci-docs-only-classifier-template.md` implemented 2026-11-02

**GitHub Issue**: [#541](https://github.com/Gamaroff/agent-skills/issues/541)

---

## 1. Overview

task.172 and task.173 stop the **pipeline** waiting on docs-only commits. A consumer's own CI still
runs its full suite on every docs-only push and occupies its runners. tinker-city task.127 (#982,
merged as PR #984) fixes that on the CI side: its `changes` job reports `code=false` when a PR
`synchronize` push adds only docs on top of a head that has a successful `pull_request` run of its
CI workflow, and the heavy jobs skip. That fix exists only in tinker-city.

This task lifts it into agent-skills as an **optional consumer template**: the classifier script,
its `node:test` spec, a GitHub Actions `changes`-job snippet and a short guide. It is a recommended
pattern, not a required install.

**Ordering is the point.** The template is lifted from code that has run on real CI. It is not
written fresh. Phase 0 refuses to start until tinker-city task.127 has merged and run on at least
one real docs-only push. Both held on 2026-11-02 (PR #984; run 41445192250); Phase 0 re-checks them.

**Key deliverables:**

1. `docs/examples/ci/github-actions/`: `classify-changes.sh`, `classify-changes.test.js` (the
   lifted spec, renamed to this repository's `*.test.js` convention) and `changes-job.yml` (snippet).
2. `docs/runbooks/ci-docs-only-skip.md`: when to adopt it, how to wire it, and its contract.
3. The configurable docs patterns and CI workflow path (see § 3 for where they live).
4. A Bitbucket Pipelines variant (Phase 3). It ships in this PR, because the success criteria
   cover both platforms; it stays separable for rollback.

**Expected outcome:** a consumer that adopts the template sees its required check go green in
minutes on a docs-only push over a green head, instead of after a full run.

---

## 2. Motivation

### Current Problems

1. **Runner time is still spent on every docs-only push.** tinker-city story 46.5 ran five
   34-minute CI runs; three followed markdown-only commits (hand-off, "The measurement").
   task.172 removes the wait, but not the runs.
2. **The only implementation lives in one consumer.** tinker-city task.127 merged as PR #984 on
   2026-10-02 and reads `accepted` (re-checked 2026-11-02). Every other consumer would have to
   rediscover the classifier and its traps: merge-result semantics, `cancel-in-progress`
   supersession, rename detection hiding a code deletion, and a token without `actions: read`.
3. **Bitbucket has a trap of its own.** A `403` from the pipelines API means the token lacks
   `read:pipeline`. It does not mean "no CI". `/finalise` already documents this trap for its own
   reads. A CI-side classifier that reads `403` as "no CI" would skip the suite on every push.

### Benefits of Solution

- Consumers can cut runner use on docs-only pushes without designing a classifier.
- The contract (fail-safe: anything uncertain runs the full suite) ships with the code.
- task.172's pipeline rule and the CI-side rule use the same definition of "docs".

---

## 3. Technical Background

### Current Architecture

- **agent-skills ships no CI templates today.** `docs/examples/` holds `architecture/` and
  `tracker-workflow.default.yaml` (`ls docs/examples`, 2026-10-01).
- **tinker-city task.127, as merged** (`scripts/ci/classify-changes.sh` and `.spec.js` on
  tinker-city `develop`, last changed `88f98a27`, 2026-10-02; read 2026-11-02):
  - `classify-changes.sh` writes `code=true|false` and a second output, `engine=true|false`
    (tinker-city task.128's per-lane gate), to `$GITHUB_OUTPUT`, or to stdout when it is unset.
  - Whole-PR classification runs first (three-dot diff against the fetched base; `before..after`
    on a `push`). Every diff passes `--no-renames` (task.127 BUG-1).
  - The increment rule fires only on a PR `synchronize` event whose `BEFORE..AFTER` diff is
    non-empty and all docs. It then reads
    `GET /repos/{repo}/actions/runs?head_sha={BEFORE}&event=pull_request&exclude_pull_requests=true&per_page=100`
    and skips when any run of the workflow at `CI_WORKFLOW_PATH` (`.github/workflows/ci.yml`)
    concluded `success`. **The evidence is a workflow run, not the `ci-ok` check run**: a check
    run belongs to a commit, not an event, and a `push` run's green `ci-ok` proves nothing
    (task.127 BUG-2).
  - Every lookup failure is `code=true`, with a `::warning::`. A test-only `CI_OK_LOOKUP_FILE`
    replaces the API call; the token goes in on stdin, never on argv (task.127 CR-4).
  - The docs set is a shell `case`: `*.md|docs/*|.agents/*|scripts/server-dashboard/*|scripts/server/*`.
    The last three are tinker-city's own.
  - The runner host has `git`, `jq` and `curl`, with no `gh` and no `node` on the default `PATH`.
  - The job declares `permissions: { contents: read, actions: read }` and `fetch-depth: 0`.
- **The docs set:** task.172's `ci.docsOnly.patterns` (default `["**/*.md", "docs/**"]`) is the one
  definition on the pipeline side. tinker-city's classifier uses shell `case` patterns
  (`*.md|docs/*|…`), which are a different syntax.

### Target Architecture

- `docs/examples/ci/github-actions/classify-changes.sh`: the task.127 script as merged, with three
  changes only:
  - `DOCS_PATTERNS` (env, space-separated shell `case` patterns; default `*.md docs/*`) replaces
    the hard-coded docs list, whose last three entries are tinker-city's.
  - `CI_WORKFLOW_PATH` (env; the workflow file whose `pull_request` runs are the evidence)
    replaces the hard-coded `.github/workflows/ci.yml`. **Unset or empty emits `code=true` with a
    `::warning::`**, through the script's own `emit`, never a `${VAR:?}` abort: an abort writes no
    output, and the snippet's gate would then read an empty `code`.
  - The `engine` output, `is_engine` and `any_engine` are removed. They are tinker-city task.128's
    per-lane gate, which § 4 puts out of scope.
- `classify-changes.test.js`: the task.127 spec, with its `engine` cases removed and the same
  temporary-git-repo fixtures and `CI_OK_LOOKUP_FILE` / fake-`curl` stubs. It runs in this
  repository's `npm test`, so the template cannot rot.
- `changes-job.yml`: a commented snippet showing the `changes` job, its `permissions`
  (`contents: read`, `actions: read`), `fetch-depth: 0`, its `code` output, and the
  `if: needs.changes.outputs.code == 'true'` gate on a heavy job. A snippet, not a workflow under
  this repository's `.github/`.
- `docs/runbooks/ci-docs-only-skip.md`: covers adoption, the fail-safe contract, the merge-result
  trade-off (see Risk 1), the `cancel-in-progress` case, host requirements (`bash`, `git`, `jq`,
  `curl`), and how this relates to task.172's pipeline rule.

**Config decision: option (a), resolved at review on 2026-11-02.** The hand-off asks for the
patterns in `skills-config.yaml`. A consumer's runner need not have `node` (tinker-city's has
none), so the script cannot use `yaml-subset.js`, and a `jq`/`awk` reader (option b) would be a
second YAML parser to keep honest. So the workflow snippet passes `DOCS_PATTERNS` and
`CI_WORKFLOW_PATH` as `env`, and the parity test (Phase 2) compares the template's default
`DOCS_PATTERNS` with task.172's `DEFAULT_PATTERNS`. Phase 0 re-confirms that tinker-city's runner
still has no `node`; the guide states the choice.

The patterns' meaning must match task.172's matcher. A `**/*.md` glob and a `*.md` shell `case`
are different syntaxes (in a `case`, `*` matches `/`), so the parity test checks behaviour on a
fixed path list, not string equality. Run at review on the § 8 list: both rules call
`skills/x/SKILL.md`, `docs/a/b.yml` and `README.md` docs, and `.github/workflows/ci.yml` and
`src/a.ts` code.

### Same-class mechanism inventory (obs #103)

| Existing mechanism | Relationship |
| --- | --- |
| task.172 `ci-tree-equivalence.js` | **Sits beside it.** That rule answers "may the pipeline stop waiting?". This one answers "may CI skip the work?". They share the docs definition. Neither requires the other. |
| `/finalise` Bitbucket `403` handling | **Same rule, CI side.** `403` means unknown, which means run the full suite. |
| tinker-city `merge-gate.mjs` | **Unrelated.** It is a local merge plan, not a CI classifier. |

---

## 4. Scope

### In Scope

- ✅ Phase 0 precondition check and measurement
- ✅ The GitHub Actions template, spec, snippet and guide
- ✅ The config decision (env + parity, or a reader) and its test
- ✅ `npm test` wiring for the spec (`package.json` lists test globs by hand; a new path runs nowhere until added)
- ✅ A Bitbucket Pipelines variant, as Phase 3, in this PR (separable for rollback)

### Out of Scope

- ❌ Installing the template into any consumer (`setup-consumer.sh` stays unchanged; adoption is the consumer's decision)
- ❌ Per-lane path filters (tinker-city task.128), including the classifier's `engine` output
- ❌ Changing task.172's engine

---

## 5. Breaking Changes

**None.** It is an optional template, and nothing installs it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.174.plan.ci-docs-only-classifier-template.md](task.174.plan.ci-docs-only-classifier-template.md)

### Phase 0: precondition (Risk: Low)

- [x] **HALT unless** tinker-city task.127 reads `accepted` and its PR is merged
- [x] Measure one real PR where a docs-only push over a green head skipped the heavy jobs (run
      41445192250: run URL, wall-clock minutes), and one full run of the same workflow for the
      "before" figure. Both go in the guide's "Measured" section (Phase 2)
- [x] Re-read the merged script and spec. This task lifts what merged, not what task.127's document planned
- [x] Re-confirm config option (a) (§ 3): tinker-city's `changes` host still lists only
      `git`/`jq`/`curl`, and the template assumes no `node` on any consumer runner

### Phase 1: GitHub Actions template (Risk: Low)

Depends on Phase 0.

- [x] Lift the script and spec (spec renamed `classify-changes.test.js`); parameterise
      `DOCS_PATTERNS` and `CI_WORKFLOW_PATH`, with an unset `CI_WORKFLOW_PATH` emitting `code=true`;
      remove the `engine` output and its cases
- [x] `changes-job.yml` snippet
- [x] Wire the spec into `npm test`: add `'docs/examples/ci/*/*.test.js'` to `package.json`
      `scripts["test:suite"]`, so `tests/test-runner-reach.test.js` sees it reached
- [x] `npm run lint:shell` clean: the shellcheck lane lints every tracked `*.sh` outside
      `skills/*/references/`, so the new scripts are in its file list

### Phase 2: guide and parity (Risk: Low)

- [x] `docs/runbooks/ci-docs-only-skip.md`, linked from `docs/runbooks/README.md`
- [x] Parity test: the template's docs set and task.172's default classify a fixed path list the same way
- [x] CHANGELOG `[Unreleased]`

### Phase 3: Bitbucket Pipelines variant (Risk: Medium)

Ships in this PR; separable for rollback.

- [x] `docs/examples/ci/bitbucket-pipelines/classify-changes.sh` plus its `*.test.js`, with the same
      contract. Bitbucket Pipelines has no push `before` SHA, so **`BEFORE` is the pushed commit's
      first parent** (`BITBUCKET_COMMIT^`, not `HEAD^`: in a pull-request pipeline `HEAD` may be
      Bitbucket's merge commit). Only pull-request pipelines classify; a branch pipeline runs in
      full. The rule fires when `BEFORE..BITBUCKET_COMMIT` is non-empty and all docs,
      and `GET /2.0/repositories/{ws}/{repo}/pipelines/?target.commit.hash={BEFORE}` lists a
      completed pull-request pipeline whose `state.result.name` is `SUCCESSFUL` **and whose own
      `target.commit.hash` equals `BEFORE`**. The second check is required: that the API honours the
      `target.commit.hash` filter is unverified, and a filter it ignored would return other
      commits' pipelines and grant a wrong skip. A test feeds such a list. A multi-commit docs push whose
      `HEAD^` never ran a pipeline finds no evidence and runs the full suite: the safe direction
- [x] Credentials in the order `bitbucket-auth.sh` defines. **Any status other than 200, a `403`
      in particular, means run the full suite**, and it has a test
- [x] Guide section for Bitbucket

---

## 7. Files Summary

### Files to Add

1. `docs/examples/ci/github-actions/classify-changes.sh`
2. `docs/examples/ci/github-actions/classify-changes.test.js`
3. `docs/examples/ci/github-actions/changes-job.yml`
4. `docs/runbooks/ci-docs-only-skip.md`
5. `docs/examples/ci/bitbucket-pipelines/classify-changes.sh`, `classify-changes.test.js` and a
   `bitbucket-pipelines.yml` snippet (Phase 3)
6. The parity test (Phase 2), beside the GitHub spec: `docs/examples/ci/github-actions/docs-set-parity.test.js`

### Files to Modify

7. `package.json`: `scripts["test:suite"]` gains `'docs/examples/ci/*/*.test.js'`
8. `docs/runbooks/README.md`: one row
9. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

- **The lifted spec**, unchanged in its cases except that the `engine` cases go. It covers every
  existing classification branch, the increment rule, and each lookup failure giving `code=true`.
- **Parameterisation:** a run of a non-default `CI_WORKFLOW_PATH` is the evidence that counts, and
  a success of another workflow does not. An unset or empty `CI_WORKFLOW_PATH` gives `code=true`,
  never a skip. A non-default `DOCS_PATTERNS` changes what counts as docs.
- **Parity:** the fixed path list from task.172 § 8 (`skills/x/SKILL.md`, `docs/a/b.yml`,
  `README.md`, `.github/workflows/ci.yml`, `src/a.ts`) classifies identically under task.172's
  `DEFAULT_PATTERNS` (through `glob-match.js` `matchesAnyGlob`) and the template's default
  `DOCS_PATTERNS` (through the sourced script's `is_docs`).
- **Bitbucket (Phase 3):** `403`, `401`, a non-JSON body, an empty list, and a non-`SUCCESSFUL`
  result each give `code=true`; a docs-only `HEAD^..HEAD` over a `SUCCESSFUL` pipeline gives
  `code=false`.
- **Mutation proofs:** make a lookup failure return `code=false`, make an unset `CI_WORKFLOW_PATH`
  skip, and treat a Bitbucket `403` as green. Each must turn a test red.

---

## 9. Success Criteria

### Functional

- [x] Phase 0 evidence is recorded in the guide's "Measured" section
      (`docs/runbooks/ci-docs-only-skip.md`): tinker-city task.127's PR, plus one real skipped run
- [x] A docs-only `synchronize` over a head with a successful `pull_request` run of
      `CI_WORKFLOW_PATH` gives `code=false` (lifted spec)
- [x] Every lookup failure, and an unset `CI_WORKFLOW_PATH`, gives `code=true`, on both platforms
      (the two platforms' `classify-changes.test.js`)
- [x] The parity test passes on the fixed path list (`docs-set-parity.test.js`)

### Performance

- [x] The guide quotes the measured before/after from Phase 0's real run, not an estimate

### Code Quality

- [x] The specs run in `npm test` (reached per `tests/test-runner-reach.test.js`)
- [ ] Each mutation proof in § 8 turns a test red, recorded in the QA report
- [ ] `npm run ci` green (it includes `lint:shell`); `docs-link-check` clean on the new guide

### Migration

- [x] The guide states that adoption is optional, and the fail-safe contract
- [x] CHANGELOG entry

---

## 10. Risk Assessment

### High Risk Areas

1. **Merge-result drift.** CI on a PR tests the head merged into the base. A docs-only push after
   the base moved skips a merge result that was never run. tinker-city task.127 accepts this, and so
   does `merge-gate.mjs`.
   - Mitigation: the guide states the trade-off. The push to the base after merge still runs in full.

### Medium Risk Areas

2. **The template drifts from tinker-city after the lift.** Mitigation: the spec runs here, so drift
   in this copy is caught. Drift in tinker-city is the consumer's business.
3. **Bitbucket `403` read as no CI.** Mitigation: an explicit test (Phase 3).
4. **The lift drops a guard the source had.** Removing `engine` and parameterising two values
   touch every `emit` call. Mitigation: the lifted spec's cases stay, minus the `engine` ones only,
   so a dropped fail-safe exit turns an existing case red.

### Low Risk Areas

5. **Nobody adopts it.** That is acceptable for an optional template, and task.172 already removes
   the pipeline wait.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** an adopting consumer reports a skipped run on a code change.
- **Steps:** the consumer removes the `if:` gates, which restores the full suite. Here, revert the
  template and mark the guide withdrawn.
- **Validation:** the consumer's next push runs every job.

### Partial Rollback (1–2 hours)

- Withdraw only the Bitbucket variant (Phase 3) and keep the GitHub one.

### Forward Fix

- A classifier defect is fixed in the template and its spec. Notify adopters through the CHANGELOG.

### Rollback Triggers

- **Critical:** any `code=false` on a non-docs change.
- **Non-critical:** a docs-only push that still runs the full suite.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-02
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.174.qa.2.ci-docs-only-classifier-template.md](./task.174.qa.2.ci-docs-only-classifier-template.md)
- **Gate File**: [task.174.gate.2.ci-docs-only-classifier-template.yml](./task.174.gate.2.ci-docs-only-classifier-template.yml)

### Test Coverage Summary
- **Tests Executed**: 71 in the template suites; `ci:fast` 7116, 0 failures
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: CONCERNS

### Key Findings
- TASK-174-QA-3 (medium): the concurrency guard passes on a broken group. Bug: [task.174.bug.2.concurrency-guard-passes-on-broken-group.md](./task.174.bug.2.concurrency-guard-passes-on-broken-group.md)
- TASK-174-QA-4 (medium): the guide overstates what the concurrency fix guarantees. Bug: [task.174.bug.3.guide-overstates-base-run-guarantee.md](./task.174.bug.3.guide-overstates-base-run-guarantee.md)
- TASK-174-QA-5 (low): the group is not scoped to the workflow.
- TASK-174-QA-2 fixed; QA-1 partly (bug 1 reopened). Boundary probes: 28 executed, 0 escaped.

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-01 | 1.0     | Initial draft | create-task |
| 2026-10-27 |  | Frontmatter: `blocked_on_external:` set, so the develop-next registry fallback passes this task over until tinker-city task.127 lands (task.235). Phase 0 HALT unchanged. | develop |
| 2026-11-02 |  | Frontmatter: `blocked_on_external:` cleared. Its condition holds: tinker-city task.127 merged as PR #984 (2026-10-02), and CI run 41445192250 (head `d88b1f96`, a 3-file `.md` push) skipped all 5 heavy jobs. Phase 0 HALT unchanged. | develop |
| 2026-11-02 | 1.1     | Review 7/10 → 9/10 after fixes (1 critical, 8 important applied): evidence lookup re-described from the merged code (workflow runs keyed by `CI_WORKFLOW_PATH`, not `ci-ok` check runs); `engine` output dropped; spec renamed `*.test.js` and its glob made reachable; Bitbucket `BEFORE` = `HEAD^`; Phase 3 ships in this PR; criteria name their record locations | review-task |
| 2026-11-02 |         | Status → ready-for-development | review-task |
| 2026-11-02 |  | Implemented — 11 files, 69 tests | develop |
| 2026-11-02 |  | QA gate CONCERNS (90/100) — 1 medium, 1 low | qa-task |
| 2026-11-02 |  | QA findings fixed — TASK-174-QA-1, QA-2; 1 iteration | qa-fix |
| 2026-11-02 |  | QA gate CONCERNS (80/100) — 2 medium, 1 low | qa-task |
| 2026-11-02 |  | QA findings fixed — TASK-174-QA-3, QA-4, QA-5; 2 iterations | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 0: precondition
- [x] Phase 1: GitHub Actions template
- [x] Phase 2: guide and parity
- [x] Phase 3: Bitbucket Pipelines variant

---

## References

- Hand-off: `~/.claude/projects/-Users-gamaroff-Development-Projects-tinker-city/skill-observations/handoff-2026-09-30-ci-time-develop-pipelines.md` (change 4)
- tinker-city task.127 (#982): `docs/tasks/task.127.ci-docs-only-increment-skip/` in that repository
- task.172: the pipeline-side rule and the docs-set definition

---

## Notes

### Important Reminders

- **The blocker is in another repository.** The registry's `Depends on` cell parses `task.N` as a
  task in *this* registry, and agent-skills has its own task.127. The blocker is therefore written
  as free text after ` — `, never as a dependency token. `/develop-next` may still select this row.
  Phase 0 is what halts it, at the cost of one visible cycle, which the selector's design accepts
  (`skills/develop-next/scripts/select-next.mjs` comment above `TASK_ELIGIBLE_STATUSES`).
- QA artifacts land in this directory: `task.174.qa.{N}.ci-docs-only-classifier-template.md`,
  `task.174.gate.{N}.ci-docs-only-classifier-template.yml`, bug reports `task.174.bug.{N}.{name}.md`.
