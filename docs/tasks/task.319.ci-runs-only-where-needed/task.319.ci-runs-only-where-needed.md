---
id: task.319
title: "Pipelines spend a CI run only where a run can answer something"
type: task
description: "The develop pipelines push after almost every step, so a consumer's CI reruns unchanged code for every gate, report, pause and DoD commit. Push record-only commits with the next push that needs CI, add an opt-in skip marker for record-only heads, stop two finalise halts that are not defects, and close two Bitbucket gaps in the finalise CI poll and the develop-next tick."
tags: [ci, push-policy, develop-pipeline, finalise, develop-next, bitbucket]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-11-24
updated: 2026-11-25
completed_date: 2026-11-25
estimated_effort_hours: 16
github_issue: 936
pr_number: 937
---

# Technical Task: Pipelines spend a CI run only where a run can answer something

**GitHub Issue**: [#936](https://github.com/Gamaroff/agent-skills/issues/936)

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.319.review.2.ci-runs-only-where-needed.md` implemented 2026-11-24

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

- `shared/resources/push-policy.sh`, called from every push site in § 3;
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

1. A record-only push that no step reads goes away: on the task above, the three pause pushes and any
   record-only cycle. The modelled sequence goes from 9 pushes to 6 (measured by the Performance
   criterion's test). The record-only pushes that stay each have a remote reader or end the run, and
   `ci.skipMarker` is what stops their CI runs where the platform allows it. (An earlier draft
   estimated 9 record-only pushes becoming about 1; the Phase 0 table does not support that.)
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
| develop-next tick | `skills/develop-next/SKILL.md:657`; resume and retry paths `:192`, `:705`, `:708`, `:719` | roadmap tick to the base branch |
| develop-batch tick | `skills/develop-batch/SKILL.md:656`, `:669` | the same roadmap tick |
| Finalise acceptance push | `skills/finalise/SKILL.md:2143` (`git push origin "$BRANCH"`, read by CI reading 2 as `CI_HEAD_2`) | the acceptance commit. A remote reader follows, so it always pushes |
| Finalise fix-and-recheck | `skills/finalise/SKILL.md:3489` (`git push origin HEAD`, licensed by `finalise-fix-and-recheck.mjs --git-base`) | a finalise fix commit |

**Search that defines a push site:** `git grep -n "git push" -- shared/resources skills ':!*/references/*' ':!*test*'`,
re-run in Phase 0 (the count decays; the scan test re-measures it). A hit is
either a site above or an allowlisted exemption, each by class and with a reason: branch creation and
PR creation push once by design (`skills/create-pr/SKILL.md:202`, `skills/create-branch/SKILL.md:235,393`,
`skills/create-parallel-stories/SKILL.md:320`, `skills/develop-bug/SKILL.md:226`,
`shared/resources/review-pipeline-step-0a-branch-setup.md:291`); remote-branch deletes
(`git push origin --delete`, `skills/develop-next/SKILL.md:540,571`, `skills/develop-batch/SKILL.md:606`);
instructions printed to a human (`skills/qa-fix/SKILL.md:248,269`, `skills/qa-story/SKILL.md:193`);
text that names `git push` without running it (the refusal lists in `skills/session-handoff/SKILL.md:141`
and `skills/loop-supervisor/assets/supervisor-settings.json`, the matchers in `qa-execute-snippets.mjs`,
`defer-mutation.js`, `handover-verify.js`, `tracker-access-record.md`, `tracker-issue-cli.md`,
`qa-runnable-prose-detection.md`). The scan test of criterion 1 covers the files of the site table, and
the allowlist above is its named exemption set.
The sequence diagrams in `skills/develop-task/README.md` (`:332,355,387`) and
`skills/develop-story/README.md` (`:347,370,402`) restate the pushes and are updated with the sites.

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
decides which pushes can wait: a reader that uses the remote head needs the push before it. Known
readers: 5c's `/review-pr` (reads the PR diff from the VCS), the merge gate (compares the PR head with
the local head), finalise's CI polls (read the head SHA's rollup), and `verify-push-state.sh`
(`develop-pipeline-step-8-commit.md:280,316`, `skills/finalise/SKILL.md:2232`), which fails the run when
reported work is not on the remote. The helper's end-of-run flush is ordered **before** that
assertion, and a test holds it (Phase 2).

### Target Architecture

- **The helper is a shell entry point over node.** `push-policy.sh` is what every site calls (the pause
  hook is shell). It shells out with `command node` to a new mode of `ci-tree-equivalence.js`, which
  reads `ci.docsOnly.patterns`, `ci.skipMarker` and `pipeline.pushRecordCommits` and answers
  docs-only for a list of paths using `isDocsPath` (`:153`, exported at `:1158`). The shell never
  parses YAML or globs itself. Phase 3 adds the mode, with a test that a code path answers not-docs-only.
- **One helper decides every push:** `push-policy` takes the site and the delta since the last pushed
  commit. It answers `push` when the delta has code, when a remote reader runs next (Phase 0's table),
  or at the end of the run (Step 8 and the HALT paths). Otherwise it answers `defer`, and the commit
  goes out with the next `push`. Every site in the table calls it. None decides on its own.
- `pipeline.pushRecordCommits: batched` (new default) or `eager` (today's behaviour).
- Under `batched` the pause hook commits and never pushes. A resume in the same checkout reads the local
  commit.
- `ci.skipMarker` (default empty, off). When set, a commit the helper would push with a delta that
  `ci-tree-equivalence.js` calls `tree-equivalent` carries the marker in its subject. As
  delivered it also needs `developNext.mergeStrategy: merge` written in the file (bug 2: otherwise the
  marker could reach the base branch's head) and no `ci.docsOnly.checkCommand` (proving the head would
  run it before every push), and a HALT's own push adds no marker. **Expected reach: rarely mid-run.** `tree-equivalent` needs a green first-parent ancestor, and the code commit
  before a record-only push is usually still in CI (a QA cycle and a CI lane each take about five
  minutes; measure with `gh run list --limit 8` and `git log --format='%ad %s'`). The marker mostly
  applies to the end-of-run push.
- `ci-tree-equivalence.js` today rejects any `ci` key but `docsOnly` (usage error, exit 2, at
  `:521-523`). Phase 3 widens its known `ci` keys to include `skipMarker`, with a test.
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
- **`ci-tree-equivalence.js`** is reused for the skip marker and for the poll, with its known `ci`
  keys widened by `skipMarker` (Phase 3). Nothing re-implements the docs-only test.
- **`finalise-delta.js`** stays the rule for wall-clock criteria; `rerunAtHead` is for commands.
- **`qa-execute-snippets.mjs`** already runs commands taken from documents behind an allow-list.
  `rerunAtHead` **sits beside** it: it runs only a command that exactly equals an entry of the
  configured list (never a substring of a criterion's text, since task-document text is untrusted input
  to a command runner), at the head, from the repository root; the snippet runner executes QA snippets.
  The three new blocks (`pipeline:`, `finalise:`, `developNext:`) have no reader today; their schema
  goes in `docs/reference/configuration.md` and their reader is the helper, finalise and develop-next
  respectively.

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

- [x] Re-run the search in § 3 and reconcile it with the site table
- [x] For each push site in § 3, record the next step that reads the remote head, with its `file:line`
  witness, or "none before the next push". The readers include finalise's CI polls and
  `verify-push-state.sh`. This table is the helper's input

### Phase 1: The push-policy helper (risk: medium)

- [x] `shared/resources/push-policy` with `push | defer`, a `--self-test`, and tests over a simulated
  run: a five-cycle QA loop with two code cycles pushes on the code cycles and once at the end
- [x] `pipeline.pushRecordCommits` (`batched` default, `eager`) in the schema and the reference

### Phase 2: Every push site calls it (risk: medium)

- [x] The sites in § 3 call the helper; the pause hook commits and does not push under `batched`
- [x] A test: a deferred record commit, then the helper's end-of-run flush, then `verify-push-state.sh`
  exits 0; without the flush it exits non-zero
- [x] The helper takes its input as a table (site name, delta since the last pushed commit, whether a
  remote reader runs next), so no site invents its own
- [x] The three skills' "Push after every commit" rule is restated once, as the helper's contract

### Phase 3: The skip marker (risk: low)

- [x] Widen the `ci` known keys in `ci-tree-equivalence.js` (`:521-523`) to include `skipMarker`; a
  test whose fixture sets `skipMarker` must not exit 2, and one that sets an unknown key still must
- [x] The node mode `push-policy.sh` calls (see § 3 Target Architecture): reads the three keys from
  `skills-config.yaml`, answers docs-only for a path list; the `pipeline` key block gets the same
  unknown-key handling as `ci`
- [x] `ci.skipMarker`, applied only when `ci-tree-equivalence.js` answers `tree-equivalent` for the
  pushed delta, and never on a commit with code

### Phase 4: Finalise halts (risk: medium)

- [x] `finalise.rerunAtHead`: a listed command named by a criterion is rerun at the head before the
  AC agent grades it; its output and exit code are recorded in the DoD
- [x] The probe's `eslint:` entry form, with fixtures that must reach `rejected` and `accepted`

### Phase 5: Bitbucket (risk: medium)

- [x] `finalise-ci-poll.sh` Bitbucket arm, by status key, same output line and tokens
- [x] `developNext.tickVia: pr` in develop-next Step 4, covering the resume and retry pushes
  (`:192`, `:705`, `:708`, `:719`) and develop-batch's tick (`:656`, `:669`)

### Phase 6: Ship (risk: low)

- [x] `npm run bundle`, CHANGELOG `[Unreleased]`, `docs/reference/configuration.md`

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
10. ✅ `skills/develop-next/SKILL.md` and `skills/develop-batch/SKILL.md` (`tickVia`)
11. ✅ `shared/resources/ci-tree-equivalence.js` (`skipMarker` in the known `ci` keys)
12. ✅ `skills/develop-task/README.md`, `skills/develop-story/README.md` (push sequence diagrams)
13. ✅ `shared/resources/push-held.sh` (new): the one push of a HALT, and of finalise's entry
14. ✅ `shared/resources/finalise-rerun-at-head.js` (new): runs a listed command at the head
15. ✅ `shared/resources/criteria-section.js`, `shared/resources/finalise-rerun-scope.js`: one reader of the criteria section
16. ✅ `shared/resources/tick-pr.sh` (new) and `shared/resources/pr-read.sh` (`tickVia: pr`)
17. ✅ `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/security-review-prompt.md`, `skills/review-security/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (`eslint:` entry)
18. ✅ `skills/review-task/SKILL.md` (check 4 names the re-run criterion kind)
19. ✅ `shared/resources/develop-pipeline-resume-contract.md`, and the hand-authored `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` and `develop-bug-step-7-close-bug.md`

**Tests:** one per helper or arm, under `shared/resources/tests/` beside the existing ones
(`security-probe.test.mjs`, the ci-poll and tree-equivalence tests). A shell test is listed by hand in
`package.json` `test:suite`; the runner edit is part of this task, and `tests/test-runner-reach.test.js`
is the backstop. Other tests that enumerate a new script or resource (the bundle closure check,
`tests/mutation-call-site-coverage.test.js` for a new CLI call) are run after Phase 1 and their
requirements of `push-policy.sh` met.

**Existing tests that pin the behaviour this task removes** (found by searching `git push`, `NOT pushed`
and `one push per cycle` in tests; update, do not delete):
`shared/resources/develop-pipeline-on-precompact.test.sh`, `evals/develop-next/protocol/skill-shape.test.mjs`,
`skills/develop-bug/tests/develop-bug.test.js`, `shared/resources/tests/finalise-6a-registry-staging.test.mjs`.
The removed sentences: "Push after every commit…" (develop-task, develop-story, develop-bug),
"exactly one `git push origin HEAD` per cycle" (`develop-pipeline-step-5-6-qa-loop.md:1176`), and the
hook's push (`:430`).

**Documentation:**

1. ✅ `docs/reference/configuration.md`: the four keys
2. ✅ `CHANGELOG.md`: `[Unreleased]`
3. ✅ `docs/reference/pipeline-artifacts.md`, `docs/runbooks/ci-docs-only-skip.md`

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

- [x] Every push site in § 3 calls `push-policy`. A scan test over the pipeline step docs and the
  develop-* skills (the search in § 3) fails on a push that is neither a site nor on its named
  allowlist, and has a non-vacuity case: a fixture with an unlisted push that it must flag
- [x] Under `batched`, the simulated five-cycle run with two code cycles pushes three times (the two
  code cycles and the end); under `eager`, after every commit
- [x] Under `batched`, the pause hook leaves the remote unmoved, and its report says it was not pushed
- [x] `ci.skipMarker` is never applied to a commit with code
- [x] A criterion naming a command in `finalise.rerunAtHead` is graded on a run at the head, recorded in the DoD
- [x] The security probe scores an `eslint:` entry instead of declining it
- [x] `finalise-ci-poll.sh` on Bitbucket writes the same result line as on GitHub, from the destination's status key
- [x] `developNext.tickVia: pr` ticks through a PR merged by the merge gate

### Performance

- [x] The simulated run's push count is in the QA report, before (today's sites) and after, with the command

### Code Quality

- [x] `npm test` passes under `CI=true`, and every new test was red before its change (QA report)
- [x] `npm run bundle` leaves no diff after commit (the QA report records the `git status` after it)

### Migration

- [x] The four keys are in `docs/reference/configuration.md` with defaults, and `eager` documented as the old behaviour
- [x] CHANGELOG `[Unreleased]` names each part

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-25
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.319.qa.9.ci-runs-only-where-needed.md](./task.319.qa.9.ci-runs-only-where-needed.md)
- **Gate File**: [task.319.gate.9.ci-runs-only-where-needed.yml](./task.319.gate.9.ci-runs-only-where-needed.yml)

### Test Coverage Summary
- **Tests Executed**: 8890 (ci:fast)
- **Phases Verified**: 7/7
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
The three gaps of Definition of Done run 1 are closed. No finding is open. The seven low findings gate 7 carried stand, in the re-run engine, the tick PR and the held-commit push; see the gate.

## Deferred Work

- **T319-CR-1201** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): with no criterion read, a fenced `## ` line or another heading that contains "criteri" narrows the search for a listed command
- **T319-CR-1202** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): a stray backtick and an unindented line in one criterion together hide a listed command
- **T319-CR-1203** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): an untracked `SUB/x.js` beside a submodule `sub` under `core.ignorecase=true` on a case-sensitive disk
- **T319-CR-1301** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): a tick resolved on the forge, squashed and its remote branch deleted reads `resume`
- **T319-CR-1302** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): a fetch that brought the commit and failed at something else reads as not fetched
- **T319-CR-1303** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): a script stopped past its bound answers that a push failed which reached the server
- **T319-CR-1304** (LOW) — carried to gate 7 `recommendations.future` (route 2b, cycle 7): a tick started in a subdirectory reads `resume`

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA gate:** PASS (100), `task.319.gate.9.ci-runs-only-where-needed.yml`, QA report `task.319.qa.9.ci-runs-only-where-needed.md`. **PR review 3:** APPROVE.

✅ **Success criteria:** 13 of 13
✅ **Tests:** `ci:fast` 8890 run, 8887 pass, 0 fail, 3 skipped; hosted CI green on 6 checks
✅ **Security review:** 201 probes over 10 controls, none reproduced
✅ **Documentation:** four keys in the configuration reference, CHANGELOG `[Unreleased]` names each part
⚠️ **Compliance:** not applicable

Run 1 found three gaps: criterion 10's red runs were not in a QA report, `ci.skipMarker` accepted C1 control characters, and one sentence on a HALT's push was wrong. QA cycle 9 closed all three (`task.319.dod.1.ci-runs-only-where-needed.md`).

**Task marked as ACCEPTED on:** 2026-11-25

**Detailed Verification Log:** `task.319.dod.2.ci-runs-only-where-needed.md`
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-24 | 1.0     | Initial draft | Lorien Gamaroff |
| 2026-11-24 |         | GitHub issue created (#936) | Lorien Gamaroff |
| 2026-11-24 | 1.1     | Review 1 (7/10): widened the `ci` parser for `skipMarker`, completed the push-site list and its search, named `verify-push-state.sh` and finalise's polls as remote readers, scan test for criterion 1, tests to update, `rerunAtHead` contract | review-task |
| 2026-11-24 | 1.2     | Review 2 (9/10): added the two finalise push sites and the exemption classes to § 3, made the helper a shell entry over a node mode, Phase 3 builds that mode | review-task |
| 2026-11-24 |         | Status → ready-for-development | review-task |
| 2026-11-24 |         | Implementation complete, 7 of 7 phases; the Benefit's push estimate corrected to the measured 9 → 6; status → ready-for-review | develop |
| 2026-11-24 |         | QA gate FAIL (60/100) — 17 findings (2 high, 11 medium, 4 low); status → in-progress | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 1) — all 17 gate findings and the 11 advisory ones addressed; status → ready-for-review | qa-fix |
| 2026-11-24 |         | QA gate CONCERNS (80/100) — 19 findings (12 medium, 7 low); bugs 1 and 2 closed | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 2) — all 19 gate findings and the 3 advisory ones; each with a test that is red without its fix, except that three agent-instruction rules (CR-202, CR-209's grading, CR-310) are held by assertions on their wording | qa-fix |
| 2026-11-24 |         | QA gate FAIL (70/100) — 19 findings (3 high, 9 medium, 7 low); bug 3 filed; status → in-progress | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 3) — all 19 gate findings, the 2 advisory ones and the 3 cleanups; the re-run engine's working-tree check is replaced, and the held-commit flush is one script; status → ready-for-review | qa-fix |
| 2026-11-24 |         | QA gate CONCERNS (80/100) — 12 findings (7 medium, 5 low); bug 3 closed | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 4) — all 12 gate findings, and what a review of the fixes themselves reproduced, three low remainders left as stated limits; status → ready-for-review | qa-fix |
| 2026-11-24 |         | QA gate CONCERNS (80/100) — 10 findings (4 medium, 6 low); all 12 of cycle 4 fixed | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 5, the first of 2 granted) — all 10 gate findings, the advisory one and the 5 cleanups, and 7 of the 8 points a review of the fixes reproduced; status → ready-for-review | qa-fix |
| 2026-11-24 |         | QA gate CONCERNS (80/100) — 8 findings (4 medium, 4 low); all 10 of cycle 5 fixed for the reported case | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 6, the second of 2 granted) — all 8 gate findings, and the 6 points a review of the fixes reproduced; the tick's row comparison and the ignored-path filter are replaced; status → ready-for-review | qa-fix |
| 2026-11-24 |         | QA gate PASS (100/100) — 7 findings (7 low); all 8 of cycle 6 fixed for the reported case | qa-task |
| 2026-11-24 |         | QA fixes applied (cycle 7, 1 more granted) — all 10 findings of PR review 1, documents only; a wider search found 7 more statements of the removed push rule and two reviews of the fixes 12 points, also corrected; status → ready-for-review | qa-fix |
| 2026-11-25 |         | QA gate PASS (100/100) — no open finding; the 10 findings of PR review 1 are fixed | qa-task |
| 2026-11-25 |  | DoD incomplete — 3 gaps identified | finalise |
| 2026-11-25 |  | QA gate PASS (100/100) — no open finding; the three gaps of DoD run 1 are closed | qa-task |
| 2026-11-25 | 1.3 | DoD passed — accepted (PR #937) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 0: Who reads the remote
- [x] Phase 1: The push-policy helper
- [x] Phase 2: Every push site calls it
- [x] Phase 3: The skip marker
- [x] Phase 4: Finalise halts
- [x] Phase 5: Bitbucket
- [x] Phase 6: Ship

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
