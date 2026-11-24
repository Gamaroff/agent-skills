---
id: task.319
title: "Pipelines spend a CI run only where a run can answer something"
type: task
description: "The develop pipelines push after almost every step, so a consumer's CI reruns unchanged code for every gate, report, pause and DoD commit. Push record-only commits with the next push that needs CI, add an opt-in skip marker for record-only heads, stop two finalise halts that are not defects, and close two Bitbucket gaps in the finalise CI poll and the develop-next tick."
tags: [ci, push-policy, develop-pipeline, finalise, develop-next, bitbucket]
category: infrastructure
status: planned
priority: High
risk_level: medium
created: 2026-11-24
updated: 2026-11-24
estimated_effort_hours: 16
---

# Technical Task: Pipelines spend a CI run only where a run can answer something

**Status:** Planned

---

## 1. Overview

Every push to a branch with an open PR starts the consumer's CI, and on a self-hosted or metered
runner each run costs time, power or money. The develop pipelines push after almost every step,
including steps that commit only records: a QA gate, a QA report, a pause report, a DoD, an
implementation report. Each of those pushes reruns the build and tests on code that has not changed.

This task makes the pipelines spend a CI run only where a run can answer something. It has four
parts, one card by the owner's choice:

- **A. Push less.** A record-only commit goes out with the next push that needs CI, or once at the
  end, through one shared push-policy helper.
- **B. An opt-in skip marker.** Where the consumer's VCS honours it, a record-only head can carry a
  configured marker such as `[skip ci]`.
- **C. Two finalise halts that are not defects.** A criterion naming a local command is rerun at the
  head instead of failing on a stale run; the security probe gains an entry form for a lint rule.
- **D. Two Bitbucket gaps.** The finalise CI poll reads Bitbucket; the develop-next tick can go
  through a PR where the base branch refuses direct pushes.

**Key deliverables:**

- `shared/resources/push-policy.sh` (or `.js`), called from every push site in § 3;
- `ci.skipMarker` and `pipeline.pushRecordCommits` config keys, documented in `docs/reference/configuration.md`;
- the two finalise fixes, each with a test that was red first;
- a Bitbucket arm in `finalise-ci-poll.sh`, and `developNext.tickVia: push | pr`.

---

## 2. Motivation

### Current Problems

Measured on one consumer task, 2026-11-24, from the consumer's pipelines API (no consumer content
in this repository):

| Pushes | What they carried | Pipelines | Runner-minutes |
| --- | --- | --- | --- |
| 3 | code (develop, QA fix cycles 1 and 2) | 3 PR runs | ~50 |
| 9 | records only (gates, reports, three pause commits, DoD, finalise run 1 gaps) | 9 PR runs | ~140 |
| 13 | every push (the consumer's own duplicate branch trigger) | 13 branch runs | ~94 |

The third row is the consumer's to fix, in its own CI configuration. The second is this repository's.

1. **The pause hook pushes before step 7.** `develop-pipeline-on-precompact.sh:430` runs
   `git push origin HEAD` on a context compaction. Tasks 303 and 308 hold that push at steps 8 and 7
   (`:418-428`, _`PUSH_HOLD_REASON`_), and a dangling-link check holds it elsewhere, but a pause at
   steps 1–6 still pushes. The measured task paused three times at step 5: three full CI runs for
   three pause reports.
2. **Record-only steps push alone.** A QA cycle whose gate reaches 5c pushes the gate and report
   before 5c (`develop-pipeline-step-5-6-qa-loop.md:1176`); finalise's gaps path pushes the report
   (`develop-pipeline-step-7-finalise.md:75`); Step 8 pushes the implementation report
   (`develop-pipeline-step-8-commit.md:111`). The skills restate _"Push after every commit during the
   QA loop"_ (`skills/develop-task/SKILL.md:319`, `skills/develop-story/SKILL.md:331`), and
   develop-bug the same for its fix loop (`skills/develop-bug/SKILL.md:348`).
3. **A finalise criterion fails on a stale run.** A task criterion "`<docs command>` passes" was graded
   FAIL because two docs commits followed the recorded run. The fix was to rerun the command by hand
   and re-dispatch the AC agent: one more finalise run, three more pushes.
4. **The security probe cannot reach a lint rule.** A task whose control is an ESLint rule declined
   `entry-not-probeable` (`shared/resources/probe-boundary-rule.md:173`), and needed an owner override.
5. **The CI reading 2 poll is GitHub-only.** `finalise-ci-poll.sh:13`: _"GitHub only: every read
   below is `gh`"_. A Bitbucket run hand-writes its own poll.
6. **The develop-next tick pushes to the base branch.** `skills/develop-next/SKILL.md:657`,
   `git push origin <baseBranch>`. A consumer whose base branch refuses direct pushes ticks through
   a hand-made PR.

### Benefits

1. On the task above, about 9 record-only pushes become about 1, and about 140 runner-minutes become
   about 16.
2. A consumer on a metered runner pays only for runs that can find a defect.
3. Fewer pushes cancel fewer in-flight runs, so each code commit keeps its own completed CI reading.
4. Finalise halts only on a defect, not on its own bookkeeping.
5. Bitbucket consumers stop hand-writing the poll and the tick PR.

---

## 3. Technical Background

### Current Architecture

**Push sites** (`git grep -n "git push" -- shared/resources skills/develop-*/SKILL.md skills/finalise skills/develop-next`):

| Site | Witness | What it pushes |
| --- | --- | --- |
| PreCompact pause hook | `shared/resources/develop-pipeline-on-precompact.sh:430`; held at steps 7–8 and on dangling links (`:418-433`) | pause report |
| Pause procedure (prose) | `shared/resources/develop-pipeline-pause.md:148`, `develop-pipeline-hooks.md:56` | pause report |
| QA loop, once per cycle | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1176`, `:1443` | fix + gate + report, or gate + report alone before 5c |
| QA loop escalation | `develop-pipeline-step-5-6-qa-loop.md:2195` | implementation report |
| Finalise gaps | `shared/resources/develop-pipeline-step-7-finalise.md:75` | implementation report |
| Finalise 6a acceptance | `skills/finalise/SKILL.md` Step 7.6a (`acceptance-commit`, `:113`) | DoD, sprint review, status |
| Step 8 report | `shared/resources/develop-pipeline-step-8-commit.md:111` | implementation report |
| develop-next tick | `skills/develop-next/SKILL.md:657` | roadmap tick to the base branch |

The QA loop's one-push-per-cycle rule (`:1176`) exists so a cycle's second push does not cancel its
own in-flight run. This task keeps that property and goes further.

**What already handles record-only heads:**

- `ci.docsOnly.patterns` (`skills-config.yaml:51`, schema in `docs/reference/configuration.md`)
  names the record paths.
- `shared/resources/ci-tree-equivalence.js` answers `tree-equivalent` when a head's delta from a
  green ancestor matches those patterns. `finalise-ci-poll.sh` takes it as its `ENGINE` argument.
- `finalise-delta.js docs-only` grades a wall-clock criterion measured on an earlier, tree-equivalent
  commit (`shared/resources/finalise-dod-ac-prompt.md:72`). No such rule covers a criterion that
  names a command, and none should: a docs-only delta can break a docs command.

**Who reads the remote after a push** is not recorded at any site. Phase 0 records it, because it
decides which pushes can wait: a reader that uses the remote head (5c's `/review-pr` reads the PR
diff from the VCS; the merge gate compares the PR head with the local head) needs the push before it.

### Target Architecture

- **One helper decides every push:** `push-policy` takes the site and the delta since the last pushed
  commit. It answers `push` when the delta has code, when a remote reader runs next (Phase 0's table),
  or at the end of the run (Step 8 and the HALT paths). Otherwise it answers `defer`, and the commit
  goes out with the next `push`. Every site in the table calls it. None decides on its own.
- `pipeline.pushRecordCommits: batched` (new default) or `eager` (today's behaviour).
- The pause hook commits and never pushes. A resume in the same checkout reads the local commit.
- `ci.skipMarker` (default empty, off). When set, a commit the helper would push with a delta that
  `ci-tree-equivalence.js` calls `tree-equivalent` carries the marker in its subject.
- Finalise reruns a criterion's named command at the head when the command is listed in
  `finalise.rerunAtHead`, and hands the fresh output to the AC agent.
- The security probe accepts an `eslint:` entry: it runs the repository's own ESLint with its own
  config on each fixture and reads the reported rule ids.
- `finalise-ci-poll.sh` reads Bitbucket commit statuses by key (`prs:**:<destination>`), the same
  verdict tokens as the GitHub arm.
- `developNext.tickVia: pr` opens a docs PR for the tick and merges it when green through Step 3's
  merge gate.

### Existing mechanisms this sits beside

- **The QA loop's one-push rule** (`:1176`) is replaced by the helper, not kept beside it: the rule's
  table becomes the helper's input for that site.
- **The pause hook's hold** (`PUSH_HOLD_REASON`, tasks 303 and 308) is extended, not duplicated:
  under `batched` it holds at every step, and the existing `step7` / `step8` / dangling-link reasons
  stay as they are under `eager`.
- **Bitbucket status reading** already exists in `ci-tree-equivalence.js`
  (`reduceBitbucketStatuses`, `:365`; `bitbucketRollup`, `:774`). The poll's Bitbucket arm calls
  them; it does not parse statuses itself.
- **The docs-only matcher** is `isDocsPath` (`ci-tree-equivalence.js:153`). The helper calls it.
- **`ci-tree-equivalence.js`** is reused as is, for the skip marker and for the poll. Nothing
  re-implements the docs-only test.
- **`finalise-delta.js`** stays the rule for wall-clock criteria; `rerunAtHead` is for commands.

---

## 4. Scope

### In Scope

- ✅ `push-policy` and its tests; every push site in § 3 calling it.
- ✅ The pause hook stops pushing.
- ✅ `ci.skipMarker`, `pipeline.pushRecordCommits`, `finalise.rerunAtHead`, `developNext.tickVia`: config,
  schema and docs.
- ✅ The finalise rerun and the probe's `eslint:` entry.
- ✅ The Bitbucket arm of `finalise-ci-poll.sh`.
- ✅ `npm run bundle`, CHANGELOG, configuration reference.

### Out of Scope

- ❌ Any consumer's CI configuration (duplicate triggers, path conditions). Each consumer owns it.
- ❌ Changing what a QA cycle or finalise checks. Only when results are pushed changes.
- ❌ GitLab or other VCS arms for the poll.

---

## 5. Breaking Changes

**1. Record-only commits reach the remote later.**

- Before: each step's commit was pushed at once.
- After (`batched`): a record-only commit waits for the next push that needs CI, or the end of the run.
- Affected: anyone watching the PR mid-run sees gates and reports later; a session that resumes on a
  **different** machine does not see unpushed pause commits.
- Migration: `pipeline.pushRecordCommits: eager` restores today's behaviour. The pause report says
  "not pushed" in its header, so a resume elsewhere knows to push first.

**2. The pause hook no longer pushes.** Covered by the same key: `eager` keeps the push.

**3. `developNext.tickVia` defaults to `push`.** No change unless a consumer sets `pr`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.319.plan.ci-runs-only-where-needed.md](task.319.plan.ci-runs-only-where-needed.md)

### Phase 0: Who reads the remote (risk: low)

- [ ] For each push site in § 3, record the next step that reads the remote head, with its `file:line`
  witness, or "none before the next push". This table is the helper's input

### Phase 1: The push-policy helper (risk: medium)

- [ ] `shared/resources/push-policy` with `push | defer`, a `--self-test`, and tests over a simulated
  run: a five-cycle QA loop with two code cycles pushes on the code cycles and once at the end
- [ ] `pipeline.pushRecordCommits` (`batched` default, `eager`) in the schema and the reference

### Phase 2: Every push site calls it (risk: medium)

- [ ] The sites in § 3 call the helper; the pause hook commits and does not push under `batched`
- [ ] The three skills' "Push after every commit" rule is restated once, as the helper's contract

### Phase 3: The skip marker (risk: low)

- [ ] `ci.skipMarker`, applied only when `ci-tree-equivalence.js` answers `tree-equivalent` for the
  pushed delta, and never on a commit with code

### Phase 4: Finalise halts (risk: medium)

- [ ] `finalise.rerunAtHead`: a listed command named by a criterion is rerun at the head before the
  AC agent grades it; its output and exit code are recorded in the DoD
- [ ] The probe's `eslint:` entry form, with fixtures that must reach `rejected` and `accepted`

### Phase 5: Bitbucket (risk: medium)

- [ ] `finalise-ci-poll.sh` Bitbucket arm, by status key, same output line and tokens
- [ ] `developNext.tickVia: pr` in develop-next Step 4

### Phase 6: Ship (risk: low)

- [ ] `npm run bundle`, CHANGELOG `[Unreleased]`, `docs/reference/configuration.md`

---

## 7. Files Summary

**Core implementation:**

1. ✅ `shared/resources/push-policy.sh` (new) and its test
2. ✅ `shared/resources/develop-pipeline-on-precompact.sh`
3. ✅ `shared/resources/develop-pipeline-pause.md`, `develop-pipeline-hooks.md`
4. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`
5. ✅ `shared/resources/develop-pipeline-step-7-finalise.md`, `develop-pipeline-step-8-commit.md`
6. ✅ `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, `skills/develop-bug/SKILL.md`
7. ✅ `skills/finalise/SKILL.md` and `shared/resources/finalise-dod-ac-prompt.md` (`rerunAtHead`)
8. ✅ `shared/resources/security-probe.mjs`, `shared/resources/probe-boundary-rule.md` (`eslint:`)
9. ✅ `shared/resources/finalise-ci-poll.sh` (Bitbucket arm)
10. ✅ `skills/develop-next/SKILL.md` (`tickVia`)

**Tests:** one per helper or arm, under `shared/resources/tests/` beside the existing ones
(`security-probe.test.mjs`, the ci-poll and tree-equivalence tests).

**Documentation:**

11. ✅ `docs/reference/configuration.md`: the four keys
12. ✅ `CHANGELOG.md`: `[Unreleased]`

The bundled copies under `skills/*/references/` are regenerated by `npm run bundle`, never edited.

---

## 8. Testing Strategy

- **The helper:** a table-driven test over simulated runs: code cycles push, record-only cycles defer,
  the end of the run pushes, `eager` pushes every time, and a remote reader from Phase 0 forces a push.
  Red first: with the helper answering `push` always, the five-cycle case pushes five times and fails.
- **The pause hook:** a test in a temp repository with a bare remote: under `batched` the hook commits
  and the remote does not move; under `eager` it does. Temp directories removed in `t.after`.
- **The skip marker:** a code delta never gets the marker; a docs-only delta gets it only when the key
  is set. Mutation: drop the tree-equivalence check, and the code-delta case goes red.
- **`rerunAtHead`:** a fixture where the recorded run predates a later commit: the command is rerun
  and its fresh result graded. Mutation: skip the rerun, and the fixture grades FAIL.
- **`eslint:` entry:** a fixture rule with hostile and legitimate cases reaches `rejected` and
  `accepted`, not `entry-not-probeable`. Control: a rule the fixtures never mention, so a pass is not
  the reviewer recognising the motivating case.
- **Bitbucket poll:** a fake `curl` answering per-destination statuses: the poll picks the
  `prs:**:<destination>` key, never the first status, and writes the same line format as the GitHub arm.
- **`tickVia: pr`:** a fake VCS: the tick opens a PR and merges only on the merge gate's green.
- Full suite: `npm test`, under `CI=true`.

---

## 9. Success Criteria

### Functional

- [ ] Every push site in § 3 calls `push-policy`; `git grep -n "git push" -- shared/resources skills`
  finds no other push outside the helper and the tests
- [ ] Under `batched`, the simulated five-cycle run with two code cycles pushes three times (the two
  code cycles and the end); under `eager`, after every commit
- [ ] Under `batched`, the pause hook leaves the remote unmoved, and its report says it was not pushed
- [ ] `ci.skipMarker` is never applied to a commit with code
- [ ] A criterion naming a command in `finalise.rerunAtHead` is graded on a run at the head, recorded in the DoD
- [ ] The security probe scores an `eslint:` entry instead of declining it
- [ ] `finalise-ci-poll.sh` on Bitbucket writes the same result line as on GitHub, from the destination's status key
- [ ] `developNext.tickVia: pr` ticks through a PR merged by the merge gate

### Performance

- [ ] The simulated run's push count is in the QA report, before (today's sites) and after, with the command

### Code Quality

- [ ] `npm test` passes under `CI=true`, and every new test was red before its change (QA report)
- [ ] `npm run bundle` leaves no diff after commit

### Migration

- [ ] The four keys are in `docs/reference/configuration.md` with defaults, and `eager` documented as the old behaviour
- [ ] CHANGELOG `[Unreleased]` names each part

---

## 10. Risk Assessment

### HIGH

1. **A deferred push hides a commit a reader needed.**
   - Risk: a step reads the remote head (5c's PR review, the merge gate) before the deferred commit is pushed.
   - Probability: Medium without Phase 0; low with it.
   - Impact: High: a review of a stale head, or a merge refused for a head mismatch.
   - Mitigation: Phase 0's reader table is the helper's input; the merge gate already compares heads and refuses.
   - Rollback: `pipeline.pushRecordCommits: eager`.

### MEDIUM

1. **A skip-marked head leaves a merge check with no status.** A consumer whose merge check refuses a
   head without CI must leave `ci.skipMarker` empty. The configuration reference says so.
2. **A lost machine loses unpushed pause commits.** Documented in § 5; `eager` for consumers who
   resume elsewhere.
3. **The Bitbucket poll reads the wrong status.** Keyed by destination, tested against a two-destination commit.

### LOW

1. **Bundled copies drift.** `npm run bundle` and its no-diff check.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a pipeline reviews or merges a stale head; a code commit carries the skip marker.
- **Steps:** a consumer sets `pipeline.pushRecordCommits: eager` and empties `ci.skipMarker`; this
  repository reverts the release PR.
- **Validation:** every commit is pushed at once again.

### Partial Rollback

- Each part has its own key (`pushRecordCommits`, `skipMarker`, `rerunAtHead`, `tickVia`) and can be
  set back alone.

### Forward Fix

- A push site Phase 0 misread gets its reader added to the table.

---

## Change Log

<!-- change-log-start -->
| Date       | Version | Description   | Author          |
| ---------- | ------- | ------------- | --------------- |
| 2026-11-24 | 1.0     | Initial draft | Lorien Gamaroff |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 0: Who reads the remote
- [ ] Phase 1: The push-policy helper
- [ ] Phase 2: Every push site calls it
- [ ] Phase 3: The skip marker
- [ ] Phase 4: Finalise halts
- [ ] Phase 5: Bitbucket
- [ ] Phase 6: Ship

When implementation is done, QA writes `task.319.qa.{N}.ci-runs-only-where-needed.md` and
`task.319.gate.{N}.ci-runs-only-where-needed.yml` here, and any bugs as `task.319.bug.{N}.{name}.md`.

## References

- [`ci-tree-equivalence.js`](../../../shared/resources/ci-tree-equivalence.js): the docs-only test this task reuses
- [`finalise-ci-poll.sh`](../../../shared/resources/finalise-ci-poll.sh): the GitHub-only poll
- [`develop-pipeline-step-5-6-qa-loop.md`](../../../shared/resources/develop-pipeline-step-5-6-qa-loop.md): the one-push-per-cycle rule
- [Configuration reference](../../reference/configuration.md): `ci.docsOnly`, where the new keys go

## Notes

- One card by the owner's choice (2026-11-24). Parts A to D could each ship alone; if review prefers,
  split along them in that order.
- Part B's value depends on whether a consumer's VCS honours the marker on PR pipelines. One
  consumer is testing that; the key ships off by default either way.
