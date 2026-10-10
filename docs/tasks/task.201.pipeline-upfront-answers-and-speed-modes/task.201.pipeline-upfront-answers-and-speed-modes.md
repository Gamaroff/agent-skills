---
id: task.201
title: "Pipeline up-front answers and speed modes"
type: task
description: "Let a developer answer the develop pipelines' setup questions and choose a speed mode at invocation — resolved by flag, then consumer policy, then the derived recommendation, asking only on conflict — with every skip recorded as a WAIVED gate, and per-step timestamps so the effect can be measured."
tags: [develop-story, develop-task, develop-bug, develop-next, develop-batch, phase-0, lite-mode, qa-gate]
category: feature
status: ready-for-review
priority: Medium
created: 2026-10-09
updated: 2026-10-10
assignee:
estimated_effort_hours: 24
github_issue: 621
---

# Technical Task: Pipeline up-front answers and speed modes

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.201.review.1.pipeline-upfront-answers-and-speed-modes.md` implemented 2026-10-10
**GitHub Issue**: [#621](https://github.com/Gamaroff/agent-skills/issues/621)

---

## 1. Overview

Developers have no way to speed a pipeline run up or to answer its questions in advance. The only
speed control is **lite mode**, which the orchestrator switches on by itself, shortens QA only, and in
a consumer sample fired on 6 of 67 runs. The Phase 0d questions (Q1 base, Q2 PR target) are asked every
time, and autonomous orchestrators answer them by injecting prose — which is how bug.18 happened.

This task makes both explicit: a developer can pass answers and a speed mode on the command line,
the consumer can set limits in `skills-config.yaml`, and anything skipped is recorded where a
reviewer will see it. It also adds per-step timestamps, because the evidence below had to be
reconstructed from commit times.

**Scope**: Phase 0 (`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`), the lite-mode
contract, the Step 2 review, the run state / pipeline lock, the implementation-report template, and the
directives in `develop-next` and `develop-batch`. `develop-bug` gets the same answer contract over its
own question set.

**Key deliverables**:

1. Per-step ISO timestamps in the implementation report's Pipeline Progress table.
2. One answer-resolution contract: **flag → consumer policy → derived recommendation → ask**, asking
   only when sources conflict or nothing resolves. Validated, never blindly obeyed.
3. `--defaults`: accept every recommendation without asking; replaces the orchestrators' injected
   directive.
4. Step 2 review reuse: skip the in-run review automatically when a current review artifact exists.
5. `--mode fast` and `--skip <step>` within a consumer allow-list; every skip writes the QA gate as
   `WAIVED` with a reason and approver, never `PASS`.

---

## 2. Motivation

### Current Problems

**Measured in the `rebirth-wallet` consumer, 2026-08-09 → 2026-10-09** (67 items with an implementation
report; 36 timeable without a gap over 3 h; times reconstructed from the commit that first added each
step's artifact — implementation reports carry no per-step timestamps):

| Segment (steps)                              | Median   | Share |
| -------------------------------------------- | -------- | ----- |
| Started → last develop commit (0–3)          | 39 min   | 46%   |
| ↳ Started → review commit (0–2), n=9         | ~31 min  |       |
| PR + QA review/fix 1 (4–5)                   | 15 min   | 17%   |
| Each further QA cycle                        | 12 min   | 9%    |
| 5c + finalise                                | 10 min   | 10%   |
| Commit, sign-off, CI tail                    | 8 min    | 17%   |
| **Whole run**                                | **103 min** (IQR 65–151) |  |

- **QA cycles earn their cost.** Cycle 2 raised new issue ids in 30% of cases, cycle 3+ in 41% (mostly
  medium or worse); three re-entries were real defects found by `/finalise`. Capping cycles saves ~12
  min each and loses findings — this task does **not** cap them.
- **Step 2 is the largest skippable segment**, and ~31 of 67 items had already been reviewed in an
  earlier session before the pipeline ran its own review.
- **Lite mode rarely fires** (9%), so the automatic trigger alone buys little.
- **Phase 0d always asks**, though both questions carry a derived recommendation that most runs accept.
- **Autonomous orchestrators restate the answers in prose**, and the restatement drifted from Phase 0d
  (bug.18).

Caveats: wall clock includes human and CI waits; `Started` values are agent-written and rounded
(±15 min); the gate and its fix are usually one commit, so QA review and fix cannot be separated;
`develop-bug` has no implementation reports in the sample.

### Benefits

- A developer who already knows the answers runs unattended from the first prompt.
- Speed is chosen where it costs least (re-review), not where it loses findings (QA cycles).
- A skip is visible in the gate and DoD instead of reading as a pass.
- Autonomous and interactive runs share one answer path, closing the bug.18 class.

---

## 3. Technical Background

### Current Architecture

- **Phase 0d** asks Q1 (feature-branch base) and Q2 (PR target) via AskUserQuestion, each with a
  derived Recommended option; `EPIC_BRANCH` leads when the epic declares `branch_model:
  epic-integration`, and Q1/Q2 must agree. Phase 0 forbids adding undocumented questions.
- **Lite mode** (`shared/resources/develop-pipeline-lite-mode.md`): on when risk is low/absent,
  < 3 tasks/phases and a single module. QA uses direct tools only; 5c runs at `--effort low`. Steps 4,
  7 and 8 are never skipped; Step 7's side effects run in full in every mode.
- **qa-gate** already supports `gate: WAIVED` with `waiver: { active, reason, approved_by }`
  (`skills/qa-gate/SKILL.md:87, 124-146, 269, 299-304`); `develop-next`'s merge gate accepts
  `accepted` + `WAIVED` with no open findings.
- **0f Pre-flight Summary** prints the resolved branch, target and report before any irreversible
  action.

### Target Architecture

```
invocation flags ─┐
skills-config.yaml develop.* ──┼─► resolveAnswers() ──► validated answers + source
Phase 0d derived recommendation ┘        │                    │
                                         │ conflict/unresolved└─► 0f shows answer + source
                                         ▼                         persisted in run state
                                   AskUserQuestion (existing questions only)
```

| Answer           | Flag                         | Policy key (`skills-config.yaml`)         | Derived          |
| ---------------- | ---------------------------- | ----------------------------------------- | ---------------- |
| Q1 base          | `--base <branch>`            | —                                         | Phase 0d         |
| Q2 PR target     | `--target <branch>`          | —                                         | Phase 0d         |
| All of the above | `--defaults`                 | —                                         | takes every one  |
| Speed mode       | `--mode standard\|lite\|fast` | `develop.defaultMode`                    | lite detector    |
| Skips            | `--skip review,qa-depth,review-pr-depth` | `develop.skippable` (allow-list, default empty) | — |

**Policy keys live under the existing `develop:` block of `skills-config.yaml`** (review 2026-10-10),
beside `develop.fastGateCommand` — the block `docs/reference/configuration.md` already documents as
"develop-story / develop-task / develop-bug pipelines". Not a new top-level `pipeline:` key: `pipeline:`
is the name of `tracker-workflow.yaml`'s moment map, and one word for two unrelated blocks in two files
is a misconfiguration waiting to happen. Read them with
`source references/read-config.sh && read_nested_config_key develop defaultMode` (and `skippable`).

**Validation, not obedience**: a `--base`/`--target` that contradicts the epic's `branch_model`, or
that breaks Q1/Q2 agreement, falls through to the question with the conflict stated. A `--skip`
outside `develop.skippable` is refused with the reason — the consumer owns the ceiling, the developer
chooses within it.

**`--mode fast`** = lite QA depth + 5c at `--effort low`, applied regardless of the lite detector. It
does not cap QA cycles, and it does **not** change Step 2: the pipeline already runs Step 2 without
questions (`develop-story` invokes `/review-story` in validate-and-apply mode; `develop-task`
auto-answers `/review-task`, which has no `--validate` mode — review 2026-10-10). Step 2's levers are the
automatic reuse below and an explicit `--skip review` within `develop.skippable`.

**Floor — never skippable in any mode**: branch creation, PR creation, Step 7 finalise and every
side effect it already guarantees (DoD file, status, PR comment, tracker comment, board stage),
Step 8 commit, tracker stage signals.

**Recorded, never hidden**: each skip appends a Decisions Log line and writes the QA gate as
`WAIVED` with `waiver.reason: "<step> skipped: <flag or policy>"` and `waiver.approved_by: <who>`.
A skip of depth only (`qa-depth`, `review-pr-depth`) that still yields a clean review keeps `PASS`;
the skip is logged but the verdict is earned.

### Important Clarifications

- **No new Phase 0 questions.** The mode is a flag or policy, never asked. The existing ban on
  undocumented questions stands.
- **Step 2 reuse is automatic, not a flag**: when a `review-*` or `--validate` artifact for the
  document exists and the document's content has not changed since, Step 2 is skipped and logged.
  "Not changed" is decided by **blob hash** (owner decision, 2026-10-09): the review artifact records
  `reviewed_blob:` — `git hash-object` of the document — taken **after** the review's own Step 8.5
  fixes and Step 9 status edit, and Step 2 reuses the review only when the current document's hash
  matches. A date comparison is not used: `updated:` is date-only, so a same-day edit after the
  review would slip through. This is the largest measured lever and needs no developer action.
  **It extends the existing freshness engine, it does not sit beside it** (review 2026-10-10):
  `shared/resources/review-report-freshness.js` (`classifyReviewReport`) already decides the
  `Planned` + current-report skip by comparing `**Reviewed:**` against `updated:`. Phase 3 adds the
  blob rule to that function: a report that carries `reviewed_blob:` is `fresh` exactly when the hash
  matches and `stale` otherwise, whatever the dates say; a report without the field keeps today's
  date verdict unchanged. That is what keeps Breaking Changes at "None" — a legacy report is judged
  exactly as it is today, and the blob tightens only reports written after this change.
- **A waiver never masks a failure** (review 2026-10-10). A skip turns a gate that would read `PASS`
  or `CONCERNS` into `WAIVED`; a gate that reads `FAIL` stays `FAIL`. The skip reaches the gate
  writer the way lite mode does — a directive prepended to the `/qa-task` / `/qa-story` invocation
  naming the skip, its source and the approver — and `qa-gate` writes `waiver.active: true`,
  `waiver.reason` and `waiver.approved_by` from it. The pure resolver decides the verdict
  (`gateFor({ earned, skips })`), so the rule is tested rather than restated.
- **Waiver approver is the invoking developer** (owner decision, 2026-10-09). `waiver.approved_by`
  is the invoker (`git config user.name`). The authorisation is the consumer's `develop.skippable`
  allow-list, which the repository owner sets; the waiver is visible in the gate, the DoD and the PR.
- **Autonomous runs are fast by policy only** (owner decision, 2026-10-09). `develop-next` and
  `develop-batch` take no `--mode` flag; they run `fast` only when `skills-config.yaml` sets
  `develop.defaultMode: fast`. Speed for unattended work is a standing decision by the repository
  owner, not a per-invocation one.
- **Persisted answers — the states resume must hold in** (review 2026-10-10). Resolved answers and
  their sources are written to the **pipeline lock** (`answers: { base, target, mode, skips }` and
  `answer_sources`), not to `develop-next`'s run state, which the pipeline never reads. Resume must
  hold in each of:
  1. live lock carrying `answers` → reuse, ask nothing already answered;
  2. lock rebuilt by `advance-pipeline-lock.sh --restore` from a halt snapshot or an orphaned
     `.lock.pausing.<pid>` claim → `--restore` strips only the halt/pause fields and `waiting_on`, so
     `answers` survives; a test pins that;
  3. legacy lock or snapshot with no `answers` field (written before this change) → today's rule:
     answers already in the Decisions Log are not re-asked;
  4. no lock and no snapshot (fresh re-invocation over an existing report) → today's rule, as 3;
  5. a re-invocation whose flags disagree with the persisted answers → a conflict: asked, with both
     values stated, never silently overwritten either way.
- **Generic**: no consumer branch, board or status names; all limits come from `skills-config.yaml`.

---

## 4. Scope

### In Scope

- Per-step timestamps in the implementation report (template + each step doc's progress update).
- `resolveAnswers()` contract in Phase 0, flags parsed from the invocation arguments, validation,
  0f source column, persistence in the run state / pipeline lock and reuse on resume.
- `--defaults`; `develop-next` and `develop-batch` invoke with it instead of the prose directive.
- Step 2 reuse rule.
- `--mode` / `--skip`, `develop.defaultMode` / `develop.skippable`, WAIVED gate writing, DoD
  showing the waiver.
- `develop-bug`: same resolution contract over its own Q1 (branch model) / Q2 / Q3.
- Docs: lite-mode contract, workflows, `skills-config.yaml` reference, CHANGELOG.

### Out of Scope

- Capping or shortening QA cycles (the data argues against it).
- bug.18's `develop-batch` epic-integration support — fixed there; this task only removes the prose
  directive both orchestrators share.
- CI-side speedups in consumers (path-conditioned steps) — consumer pipeline concern.

---

## 5. Breaking Changes

None by default: with no flags and no `develop.defaultMode` / `develop.skippable` keys, behaviour is today's — the questions are
asked, lite detection runs, nothing is skipped. `develop.skippable` defaults to empty, so `--skip`
is refused until a consumer opts in. The orchestrator directive change is internal.

---

## 6. Implementation Plan

Phases are ordered so each one is independently shippable. See the
[plan](task.201.plan.pipeline-upfront-answers-and-speed-modes.md).

### Phase 1: Step timestamps
Measure first, so later phases can show their effect. The new `Completed (UTC)` column is **appended
last**, after `Subagent summary ref`, so no existing reader's cell index moves. Readers and writers of
the table, from `git grep -n "Pipeline Progress" -- shared/resources skills/*/SKILL.md` (review
2026-10-10): the template's three variants (story, task, bug), every step doc that ticks a row,
`develop-pipeline-on-precompact.sh` (writes `⏸️ Paused`), Step 8 check 4 and its test
`step-8-completion-checklist.test.mjs` (reads `cells[4]`, the Notes cell), the resume detector prompt,
`loop-audit-prompt.md`, and the `report-lint` fixtures. Re-run the grep before editing; each hit is
either updated or stated as unaffected.

### Phase 2: Answer resolution and `--defaults`
The contract, flags, validation, 0f source column, persistence; orchestrators switch to `--defaults`
(depends on bug.18's directive fix landing first, or lands it).

### Phase 3: Step 2 reuse
Automatic skip on a current review artifact.

### Phase 4: Speed modes and waivers
`--mode`, `--skip`, policy keys, WAIVED gate, DoD rendering.

### Phase 5: `develop-bug` parity and close-out
Same contract over the bug question set; docs, CHANGELOG, consumer note.

---

## 7. Files Summary

### Core Implementation

- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — §0d resolution, §0f source column
- `shared/resources/develop-pipeline-lite-mode.md` — `fast` mode, skip contract, floor
- `shared/resources/develop-pipeline-step-2-review.md` — reuse rule
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `…-step-7-finalise.md` — WAIVED writing, DoD
- `shared/resources/develop-pipeline-resume-contract.md`, `advance-pipeline-lock.sh` — persisted answers
- `shared/resources/implementation-report-template.md` and each step doc — timestamps
- `skills/develop-{story,task,bug}/SKILL.md` — argument hint, flags
- `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md` — `--defaults` in place of the directive
- a small pure resolver (e.g. `shared/resources/pipeline-answers.js`) if prose alone cannot be tested

### Tests

- resolver unit tests: precedence, every conflict path, refused skip, empty policy
- **extend** the existing `evals/shared/tests/orchestrator-directive-branch-literal.test.mjs` (bug.18):
  the directive no longer states the Phase 0d/0b answer rules in prose and both orchestrators pass
  `--defaults`
- tests pinned on the literal being removed (`git grep -n "AUTONOMOUS RUN" -- '*.test.*'`, review
  2026-10-10): `evals/develop-next/protocol/skill-shape.test.mjs:162`,
  `evals/develop-batch/protocol/skill-shape.test.mjs:109` and the branch-literal guard above, which
  locates the directive by its `**AUTONOMOUS RUN (<skill>)` opener. The directive blockquote **stays**
  — `develop-batch`'s carries worktree, execution-resource and do-not-merge instructions that are not
  Phase 0d answers — only its Phase 0d/0b answer sentences are replaced by `--defaults`
- resolver tests at `shared/resources/tests/pipeline-answers.test.mjs`, reached by `npm test`'s
  `shared/resources/tests/*.test.mjs` glob
- `advance-pipeline-lock.test.sh`: `--restore` keeps `answers`
- a guard that a skipped step yields `WAIVED` with reason and approver, never `PASS`

### Documentation

- `docs/operations/workflows.md`, the `skills-config.yaml` reference, CHANGELOG `[Unreleased]`

---

## 8. Testing Strategy

### Unit Tests
Resolver precedence and validation as a table of cases, each mutation-proved (revert the rule, the
named case goes red).

### Integration Tests
There is no dry-run harness for a whole pipeline, so the Phase 0 behaviour is held at the resolver: a
fixture table in `pipeline-answers.test.mjs` asserts that `--defaults` yields zero questions and
`recommended` as every source (the values 0f prints), and that a conflicting `--base` yields exactly
one question, Q1, with the conflict stated. The prose in §0d/§0f calls the resolver from a fenced
block, so the tested path is the executed one.

### Consumer Tests
Post-merge only — recorded under Notes, Deferred Work.

---

## 9. Success Criteria

### Functional

- [x] With no flags and no policy, behaviour is unchanged (same questions, same artifacts).
- [x] `--defaults` runs Phase 0 with zero questions; every answer's source is shown in 0f and logged.
- [x] A flag contradicting `branch_model` or Q1/Q2 agreement is asked about, never applied.
- [x] A `--skip` outside `develop.skippable` is refused with the reason, and the run continues unskipped.
- [x] A skipped step produces `gate: WAIVED` with `waiver.reason` and `waiver.approved_by`; the DoD shows it.
- [x] No floor step can be skipped by any flag or policy.
- [x] Resume reuses the persisted answers and asks nothing already answered.
- [x] Step 2 is skipped, and logged, when a current review artifact exists.

### Performance

- [x] Implementation reports carry an ISO timestamp per step.
- The consumer re-measurement (steps 0–2 median against ~31 min) can only be taken after merge, so it
  is not a criterion of this PR — see Notes, Deferred Work.

### Code Quality

- [x] No consumer-specific names; all limits from `skills-config.yaml`.
- [ ] `npm run bundle` clean; bundled copies regenerated; `npm run ci` green (covers `lint:shell`,
      `validate:all` and `check:generated`).

### Criterion → test (review 2026-10-10)

| Criterion | Held by |
| --- | --- |
| No flags, no policy → unchanged | `pipeline-answers.test.mjs` empty-input case (every source `recommended`/`asked` exactly as today) |
| `--defaults` → zero questions, sources shown | `pipeline-answers.test.mjs` |
| Flag contradicting `branch_model` / Q1–Q2 agreement is asked | `pipeline-answers.test.mjs` conflict cases |
| `--skip` outside `develop.skippable` refused | `pipeline-answers.test.mjs` refused-skip and empty-policy cases |
| Skip → `WAIVED` with reason and approver; FAIL stays FAIL; DoD shows it | `pipeline-answers.test.mjs` `gateFor` cases + a guard over the QA-loop and finalise docs |
| No floor step skippable | `pipeline-answers.test.mjs` floor cases |
| Resume reuses persisted answers | `pipeline-answers.test.mjs` persisted-answer cases + `advance-pipeline-lock.test.sh` `--restore` case |
| Step 2 skipped on a current review | `review-report-freshness.test.mjs` blob cases (match, mismatch, legacy) |
| ISO timestamp per step | template test asserting the `Completed (UTC)` column in all three variants |
| Orchestrators no longer restate the questions | extended `orchestrator-directive-branch-literal.test.mjs` |

### Migration

- [x] `develop-next` and `develop-batch` no longer restate the question set in prose.

---

## 10. Risk Assessment

### High Risk Areas

- **Skips eroding evidence** — mitigated by the floor, the default-empty allow-list, and WAIVED never
  reading as PASS.
- **Self-approval** — `waiver.approved_by` set to the invoking developer lets one person skip and sign.
  Accepted by the owner (2026-10-09): the consumer's `develop.skippable` allow-list is the
  authorisation, it defaults to empty, and every waiver is visible in the gate, DoD and PR.

### Medium Risk Areas

- **Stale review reuse** — a review of an older revision reused after edits. Mitigated by the
  `reviewed_blob:` hash, taken after the review's own edits; any later change to the document forces
  a re-review.
- **Prompt growth in Phase 0** — this is a prompt edit governed by the Rule of Three; prefer a tested
  resolver to more prose.

### Low Risk Areas

- Timestamps — additive.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)
Revert the release; consumers re-run `setup-consumer.sh --update` at the previous tag. With no flags
or policy, consumers on the new version already see today's behaviour.

### Forward Fix
Disable a misbehaving piece by policy (`develop.skippable: []`) while fixing.

### Rollback Triggers
A floor step skipped; a skip recorded as PASS; a run asking a question it was given an answer to.

---

## Implementation Summary

**Completed**: 2026-10-10 (develop-task pipeline run 1, inline implementation)

**Approach.** Two pure engines carry the rules, and the prose calls them from fenced blocks:
`shared/resources/pipeline-answers.js` (`parseArgs`, `resolveAnswers`, `gateFor`, plus a `resolve` /
`gate` CLI) and `shared/resources/record-reviewed-blob.js` (the one writer of `**reviewed_blob:**`).
`review-report-freshness.js` gained the blob rule inside `classifyReviewReport` (property 5) — a report
with the field is judged on the hash alone, one without keeps the date rule.

| Phase | What landed |
| --- | --- |
| 1 | `Completed (UTC)` appended last to all three Pipeline Progress variants and develop-bug's §0e copy; the three orchestrators' Step Transition Protocol stamps it once; Step 8 stamps its own row |
| 2 | §0d "Answer resolution" (engine call, act-on-result rules, count check); §0f source column; Step 1 persists `answers` / `answer_sources` / `waiver` into the lock; §0b and the resume contract read them back; `develop-next` / `develop-batch` dispatch with `--defaults` |
| 3 | Step 2 freshness call passes `git hash-object`; `review-task` 9a, `review-story` 10a, `review-bug` 6.6 stamp the report |
| 4 | Lite-mode contract §"Speed Modes and Skips" (modes, skips, floor, waiver directive); QA loop passes the directives, sets 5c effort, and **checks** (never edits) a waived gate; `qa-task` / `qa-story` honour the waiver directive; `/finalise` shows the waiver line in the DoD |
| 5 | develop-bug §0d answer resolution over Q1 branch model / Q2 / Q3; `--mode` / `--skip` refused there; docs (configuration, workflows, autonomous defaults), CHANGELOG |

**Design decisions taken in the run** (Decisions Log of the implementation report): `--mode lite` is
honoured only when the lite detector agrees; `--mode fast` from a flag needs `qa-depth` and
`review-pr-depth` in `develop.skippable`, while `develop.defaultMode: fast` is itself the owner's
authorisation; `develop.skippable` is one comma-separated line (the config reader is scalar-only); a
`review` skip with no `git config user.name` is refused; the QA skill writes the waived gate and the
pipeline only checks it (dev-side steps never modify gate files).

**Files.** Added: `shared/resources/pipeline-answers.js` (incl. `isRefName`, QA cycle 1), `shared/resources/record-reviewed-blob.js`,
`shared/resources/tests/{pipeline-answers,pipeline-answers-docs,record-reviewed-blob}.test.mjs`.
Modified: `shared/resources/` step 0, 1, 2, 5–6, 8 docs, lite-mode contract, resume contract,
autonomous defaults, implementation-report template, `review-report-freshness.js` (+ its test),
`advance-pipeline-lock.test.sh`; `skills/develop-{story,task,bug,next,batch}/SKILL.md`,
`skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, `skills/review-{task,story,bug}/SKILL.md`,
`skills/qa-{task,story}/SKILL.md`, `skills/finalise/SKILL.md`;
`evals/shared/tests/orchestrator-directive-branch-literal.test.mjs`; `docs/reference/configuration.md`,
`docs/operations/workflows.md`, `CHANGELOG.md`; bundled `references/` copies regenerated by
`npm run bundle`.

**Testing results.** `pipeline-answers.test.mjs` 44/44 (incl. six mutation proofs);
`review-report-freshness.test.mjs` 76/76 (8 new blob cases); `record-reviewed-blob.test.mjs` 6/6;
`pipeline-answers-docs.test.mjs` 8/8; `advance-pipeline-lock.test.sh` 72/72 (new `--restore` keeps
`answers`); directive and skill-shape tests 70/70. Full fast gate: see the implementation report.

**Deferred work.** The consumer re-measurement (Notes, Deferred Work). No tests needed updating for the
`AUTONOMOUS RUN` literal: the directive blockquote and its opener stay, so the skill-shape tests still
hold as written.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-10
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.201.qa.3.pipeline-upfront-answers-and-speed-modes.md](./task.201.qa.3.pipeline-upfront-answers-and-speed-modes.md)
- **Gate File**: [task.201.gate.3.pipeline-upfront-answers-and-speed-modes.yml](./task.201.gate.3.pipeline-upfront-answers-and-speed-modes.yml)

### Test Coverage Summary
- **Tests Executed**: 5284
- **Phases Verified**: 5/5 (4 passed)
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
- Gate 2's nine findings fixed; two mutation-proven this cycle.
- CR-1 (medium): Step 1's merge keeps a waiver the resolver withdrew.
- CR-2 (low) and CR-3 (cleanup) in the stamp writer and the docs test.

## Change Log

| Date       | Version | Description                                                                                   | Author |
| ---------- | ------- | --------------------------------------------------------------------------------------------- | ------ |
| 2026-10-09 | 1.0     | Initial draft — design from the rebirth-wallet consumer, with its step-timing measurement     | Claude |
| 2026-10-09 | 1.1     | Owner decisions recorded: invoker approves waivers; autonomous fast mode by policy only; Step 2 reuse keyed on `reviewed_blob:` | Claude |
| 2026-10-09 |         | Status → planned | Claude |
| 2026-10-10 | 1.2     | Review 7/10 → 8/10 after fixes: policy keys moved under `develop:`; `fast` no longer claims a `/review-task --validate` mode; Step 2 reuse extends `review-report-freshness.js`; waiver never masks FAIL; resume states listed; progress-table readers and directive-pinning tests listed; criterion → test map; consumer re-measurement moved to Deferred Work | review-task |
| 2026-10-10 |         | Status → ready-for-development | review-task |
| 2026-10-10 |         | Implemented — 2 engines + 3 test files added, 30 files modified, 6 tests extended | develop |
| 2026-10-10 |         | QA gate FAIL (50/100) — 4 findings (1 high, 2 medium, 1 low) | qa-task |
| 2026-10-10 |         | QA findings fixed — cycle 1, 4 findings (QA-1 placeholders in §0d, QA-2 persisted mode/skips, QA-3 isRefName probed 35/35, CR-4/CR-5 one stamp matcher) | qa-fix |
| 2026-10-10 |         | QA gate CONCERNS (70/100) — 9 findings (2 medium, 3 low promoted; 4 advisory) | qa-task |
| 2026-10-10 |         | QA findings fixed — cycle 2, 9 findings (CR-1 resume keeps the lock's waiver; CR-2 arguments via quoted heredoc; CR-3 recommendation ref-checked; CR-4/CR-5 writer uses the reader's frontmatter, keeps comments; CR-6/CR-7 resume skip sets and allow-list; CR-8 strict --detector; CR-9 derived 2c population) | qa-fix |
| 2026-10-10 |         | QA gate CONCERNS (90/100) — 3 findings (1 medium, 1 low, 1 cleanup) | qa-task |
| 2026-10-10 |         | QA findings fixed — cycle 3, 3 findings (CR-1 merge writes the resolved waiver, tested against the doc's own jq; CR-2 column-0 key; CR-3 heredoc strip keeps continuation lines) | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Step timestamps
- [x] Complete (2026-10-10)

### Phase 2: Answer resolution and `--defaults`
- [x] Complete (2026-10-10)

### Phase 3: Step 2 reuse
- [x] Complete (2026-10-10)

### Phase 4: Speed modes and waivers
- [x] Complete (2026-10-10)

### Phase 5: `develop-bug` parity and close-out
- [x] Complete (2026-10-10)

---

## References

- [bug.18](../../bugs/bug.18.autonomous-runs-hardcode-base-branch/bug.18.autonomous-runs-hardcode-base-branch.md) — the directive drift this contract retires
- `shared/resources/develop-pipeline-lite-mode.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- `skills/qa-gate/SKILL.md` — WAIVED schema

## Notes

Owner decisions (2026-10-09), recorded in Important Clarifications and Risk Assessment:

| Decision | Answer |
| --- | --- |
| Waiver approver | The invoking developer; `develop.skippable` is the authorisation |
| `fast` for `develop-next` / `develop-batch` | Policy only (`develop.defaultMode: fast`); no orchestrator flag |
| Step 2 content identity | `reviewed_blob:` (`git hash-object`), recorded after the review's own edits |

Sequencing: roadmap Phase 9 runs bug.18 first; T201 depends on it.

**Deferred Work** (post-merge, not a criterion of this PR): in the reporting consumer, re-run the
step-timing measurement over the first ~15 items after Phases 1–3 ship, using the new timestamps, and
compare the steps 0–2 median against ~31 min for items with a prior review.
