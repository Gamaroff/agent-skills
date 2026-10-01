---
id: task.174
title: "[Task 174] Publish the docs-only CI classifier as an optional consumer template"
type: task
description: "Lift tinker-city task.127's classify-changes.sh and its spec into agent-skills as an optional consumer template with a GitHub Actions changes-job snippet and a guide, so a consumer's CI skips its heavy jobs on a docs-only push over a green head. Blocked until tinker-city task.127 has merged and run on a real PR."
tags: [ci, consumer-template, github-actions, bitbucket, performance, consumer-handoff, blocked-external]
category: infrastructure
status: planned
priority: Low
created: 2026-10-01
updated: 2026-10-01
assignee:
estimated_effort_hours: 8
github_issue: 541
---

# Technical Task: Publish the docs-only CI classifier as an optional consumer template

**Status:** Planned (blocked on tinker-city task.127; see Phase 0)

**GitHub Issue**: [#541](https://github.com/Gamaroff/agent-skills/issues/541)

---

## 1. Overview

task.172 and task.173 stop the **pipeline** waiting on docs-only commits. A consumer's own CI still
runs its full suite on every docs-only push and occupies its runners. tinker-city task.127 (#982)
fixes that on the CI side: its `changes` job reports `code=false` when a PR push adds only docs on
top of a head whose aggregate check (`ci-ok`) succeeded, and the heavy jobs skip. That fix exists
only in tinker-city.

This task lifts it into agent-skills as an **optional consumer template**: the classifier script,
its `node:test` spec, a GitHub Actions `changes`-job snippet and a short guide. It is a recommended
pattern, not a required install.

**Ordering is the point.** The template is lifted from code that has run on real CI. It is not
written fresh. Phase 0 refuses to start until tinker-city task.127 has merged and run on at least
one real docs-only push.

**Key deliverables:**

1. `docs/examples/ci/github-actions/`: `classify-changes.sh`, `classify-changes.spec.js` and
   `changes-job.yml` (snippet).
2. `docs/runbooks/ci-docs-only-skip.md`: when to adopt it, how to wire it, and its contract.
3. The configurable docs patterns and aggregate check name (see § 3 for where they live).
4. A Bitbucket Pipelines variant, as a later phase that ships separately.

**Expected outcome:** a consumer that adopts the template sees its required check go green in
minutes on a docs-only push over a green head, instead of after a full run.

---

## 2. Motivation

### Current Problems

1. **Runner time is still spent on every docs-only push.** tinker-city story 46.5 ran five
   34-minute CI runs; three followed markdown-only commits (hand-off, "The measurement").
   task.172 removes the wait, but not the runs.
2. **The only implementation lives in one consumer.** tinker-city task.127 is `planned` (checked
   2026-10-01: `docs/tasks/task.127.ci-docs-only-increment-skip/…md` frontmatter, and issue #982
   `OPEN`). Every other consumer would have to rediscover the classifier and its traps: merge-result
   semantics, `cancel-in-progress` supersession, and a token without `checks: read`.
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
- **tinker-city task.127 (planned), as designed in its document:**
  - `scripts/ci/classify-changes.sh` writes `code=true|false`.
  - Whole-PR classification runs first. The increment rule fires only on a PR `synchronize` event
    whose `BEFORE..AFTER` diff is non-empty and all docs. It then reads
    `GET /repos/{repo}/commits/{BEFORE_SHA}/check-runs?check_name=ci-ok`, and any completed
    `success` means `code=false`.
  - Every lookup failure is `code=true`.
  - The runner host has `git`, `jq` and `curl`, with no `gh` and no `node` on the default `PATH`.
  - The job declares `permissions: { contents: read, checks: read }`.
- **The docs set:** task.172's `ci.docsOnly.patterns` (default `["**/*.md", "docs/**"]`) is the one
  definition on the pipeline side. tinker-city's classifier uses shell `case` patterns
  (`*.md|docs/*|…`), which are a different syntax.

### Target Architecture

- `docs/examples/ci/github-actions/classify-changes.sh`: the task.127 script as merged. The only
  change is that the tinker-city-specific values become inputs:
  - `DOCS_PATTERNS`: the docs set
  - `AGGREGATE_CHECK`: the required check's name (`ci-ok` in tinker-city)
- `classify-changes.spec.js`: the task.127 spec, run against temporary git repos and a stubbed
  check-runs lookup. It also runs in this repository's `npm test`, so the template cannot rot.
- `changes-job.yml`: a commented snippet showing the `changes` job, its `permissions`, its outputs,
  and the `if: needs.changes.outputs.code == 'true'` gate on a heavy job.
- `docs/runbooks/ci-docs-only-skip.md`: covers adoption, the fail-safe contract, the merge-result
  trade-off (see Risk 1), the `cancel-in-progress` case, and how this relates to task.172's
  pipeline rule.

**Open decision, resolved in Phase 0 with evidence, not guessed now.** The hand-off asks for the
patterns and the check name in `skills-config.yaml`. tinker-city's runner has no `node`, so the
script cannot use `yaml-subset.js`. Phase 0 picks one of these, and the guide states which:

- (a) The workflow snippet passes `DOCS_PATTERNS` and `AGGREGATE_CHECK` as `env`, and a parity
  test in the template compares them with `ci.docsOnly.patterns`.
- (b) A `jq`/`awk` reader for the two keys only.

Whichever is chosen, the patterns' meaning must match task.172's matcher. A `**/*.md` in config
and a `*.md` in a shell `case` match different sets, so the parity test checks behaviour on a fixed
path list, not string equality.

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
- ✅ A Bitbucket Pipelines variant, as Phase 3, shippable separately

### Out of Scope

- ❌ Installing the template into any consumer (`setup-consumer.sh` stays unchanged; adoption is the consumer's decision)
- ❌ Per-lane path filters (tinker-city task.128)
- ❌ Changing task.172's engine

---

## 5. Breaking Changes

**None.** It is an optional template, and nothing installs it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.174.plan.ci-docs-only-classifier-template.md](task.174.plan.ci-docs-only-classifier-template.md)

### Phase 0: precondition (Risk: Low)

- [ ] **HALT unless** tinker-city task.127 reads `accepted` and its PR is merged
- [ ] Record one real PR where a docs-only push over a green `ci-ok` skipped the heavy jobs (run URL, minutes)
- [ ] Re-read the merged script and spec. This task lifts what merged, not what task.127's document planned
- [ ] Decide config option (a) or (b), and record why in the implementation report

### Phase 1: GitHub Actions template (Risk: Low)

Depends on Phase 0.

- [ ] Lift the script and spec, and parameterise `DOCS_PATTERNS` and `AGGREGATE_CHECK`
- [ ] `changes-job.yml` snippet
- [ ] Wire the spec into `npm test`

### Phase 2: guide and parity (Risk: Low)

- [ ] `docs/runbooks/ci-docs-only-skip.md`, linked from `docs/runbooks/README.md`
- [ ] Parity test: the template's docs set and task.172's default classify a fixed path list the same way
- [ ] CHANGELOG `[Unreleased]`

### Phase 3: Bitbucket Pipelines variant (Risk: Medium)

Separately shippable.

- [ ] Same contract, with `curl` against the pipelines API. **A `403` means run the full suite**, and it has a test
- [ ] Guide section for Bitbucket

---

## 7. Files Summary

### Files to Add

1. `docs/examples/ci/github-actions/classify-changes.sh`
2. `docs/examples/ci/github-actions/classify-changes.spec.js`
3. `docs/examples/ci/github-actions/changes-job.yml`
4. `docs/runbooks/ci-docs-only-skip.md`
5. `docs/examples/ci/bitbucket-pipelines/…` (Phase 3)

### Files to Modify

6. `package.json`: the `test` script gains the spec path
7. `docs/runbooks/README.md`: one row
8. `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

- **The lifted spec**, unchanged in its cases. It covers every existing classification branch, the
  increment rule, and each lookup failure giving `code=true`.
- **Parameterisation:** a non-default `AGGREGATE_CHECK` name is the one queried. An unset
  `AGGREGATE_CHECK` gives `code=true`, never a skip.
- **Parity:** the fixed path list from task.172 § 8 (`skills/x/SKILL.md`, `docs/a/b.yml`,
  `README.md`, `.github/workflows/ci.yml`, `src/a.ts`) classifies identically under both rules.
- **Bitbucket (Phase 3):** `403`, `401`, a non-JSON body and an empty list each give
  `code=true`.
- **Mutation proofs:** make a lookup failure return `code=false`, and treat a Bitbucket `403` as
  green. Each must turn a test red.

---

## 9. Success Criteria

### Functional

- [ ] Phase 0 evidence recorded: tinker-city task.127 merged, plus one real skipped run
- [ ] A docs-only `synchronize` over a green aggregate check gives `code=false` (lifted spec)
- [ ] Every lookup failure gives `code=true`, on both platforms
- [ ] The parity test passes on the fixed path list

### Performance

- [ ] The guide quotes the measured before/after from Phase 0's real run, not an estimate

### Code Quality

- [ ] The spec runs in `npm test`, and the mutation proofs go red
- [ ] `npm run ci` green; `docs-link-check` clean on the new guide

### Migration

- [ ] The guide states that adoption is optional, and the fail-safe contract
- [ ] CHANGELOG entry

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

### Low Risk Areas

4. **Nobody adopts it.** That is acceptable for an optional template, and task.172 already removes
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

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-01 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 0: precondition
- [ ] Phase 1: GitHub Actions template
- [ ] Phase 2: guide and parity
- [ ] Phase 3: Bitbucket Pipelines variant

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
