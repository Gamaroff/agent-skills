---
id: task.201
title: "Pipeline up-front answers and speed modes"
type: task
description: "Let a developer answer the develop pipelines' setup questions and choose a speed mode at invocation — resolved by flag, then consumer policy, then the derived recommendation, asking only on conflict — with every skip recorded as a WAIVED gate, and per-step timestamps so the effect can be measured."
tags: [develop-story, develop-task, develop-bug, develop-next, develop-batch, phase-0, lite-mode, qa-gate]
category: feature
status: draft
priority: Medium
created: 2026-10-09
updated: 2026-10-09
assignee:
estimated_effort_hours: 24
github_issue: 621
---

# Technical Task: Pipeline up-front answers and speed modes

**Status:** Draft
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
skills-config.yaml pipeline.* ─┼─► resolveAnswers() ──► validated answers + source
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
| Speed mode       | `--mode standard\|lite\|fast` | `pipeline.defaultMode`                    | lite detector    |
| Skips            | `--skip review,qa-depth,review-pr-depth` | `pipeline.skippable` (allow-list, default empty) | — |

**Validation, not obedience**: a `--base`/`--target` that contradicts the epic's `branch_model`, or
that breaks Q1/Q2 agreement, falls through to the question with the conflict stated. A `--skip`
outside `pipeline.skippable` is refused with the reason — the consumer owns the ceiling, the developer
chooses within it.

**`--mode fast`** = lite QA depth + 5c at `--effort low` + Step 2 run in `--validate` mode (no
questions), applied regardless of the lite detector. It does not cap QA cycles.

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
  document exists and the document's content has not changed since (compare against the artifact's
  recorded document `updated:` or blob hash), Step 2 is skipped and logged. This is the largest
  measured lever and needs no developer action.
- **Generic**: no consumer branch, board or status names; all limits come from `skills-config.yaml`.

---

## 4. Scope

### In Scope

- Per-step timestamps in the implementation report (template + each step doc's progress update).
- `resolveAnswers()` contract in Phase 0, flags parsed from the invocation arguments, validation,
  0f source column, persistence in the run state / pipeline lock and reuse on resume.
- `--defaults`; `develop-next` and `develop-batch` invoke with it instead of the prose directive.
- Step 2 reuse rule.
- `--mode` / `--skip`, `pipeline.defaultMode` / `pipeline.skippable`, WAIVED gate writing, DoD
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

None by default: with no flags and no `pipeline.*` keys, behaviour is today's — the questions are
asked, lite detection runs, nothing is skipped. `pipeline.skippable` defaults to empty, so `--skip`
is refused until a consumer opts in. The orchestrator directive change is internal.

---

## 6. Implementation Plan

Phases are ordered so each one is independently shippable. See the
[plan](task.201.plan.pipeline-upfront-answers-and-speed-modes.md).

### Phase 1: Step timestamps
Measure first, so later phases can show their effect.

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
- a guard that no orchestrator directive names a Q1/Q2 branch literal (shared with bug.18)
- a guard that a skipped step yields `WAIVED` with reason and approver, never `PASS`

### Documentation

- `docs/operations/workflows.md`, the `skills-config.yaml` reference, CHANGELOG `[Unreleased]`

---

## 8. Testing Strategy

### Unit Tests
Resolver precedence and validation as a table of cases, each mutation-proved (revert the rule, the
named case goes red).

### Integration Tests
A dry pipeline run with `--defaults` asks nothing and its 0f summary shows `recommended` as every
source; with a conflicting `--base` it asks exactly Q1 and states why.

### Consumer Tests
In the reporting consumer: re-run the step-timing measurement over the first ~15 items after Phases
1–3 ship, using the new timestamps, and compare the steps 0–2 median against ~31 min.

---

## 9. Success Criteria

### Functional

- [ ] With no flags and no policy, behaviour is unchanged (same questions, same artifacts).
- [ ] `--defaults` runs Phase 0 with zero questions; every answer's source is shown in 0f and logged.
- [ ] A flag contradicting `branch_model` or Q1/Q2 agreement is asked about, never applied.
- [ ] A `--skip` outside `pipeline.skippable` is refused with the reason, and the run continues unskipped.
- [ ] A skipped step produces `gate: WAIVED` with `waiver.reason` and `waiver.approved_by`; the DoD shows it.
- [ ] No floor step can be skipped by any flag or policy.
- [ ] Resume reuses the persisted answers and asks nothing already answered.
- [ ] Step 2 is skipped, and logged, when a current review artifact exists.

### Performance

- [ ] Implementation reports carry an ISO timestamp per step.
- [ ] In the consumer re-measurement, the steps 0–2 median falls measurably below ~31 min for items
      with a prior review.

### Code Quality

- [ ] No consumer-specific names; all limits from `skills-config.yaml`.
- [ ] `npm run bundle` clean; bundled copies regenerated.

### Migration

- [ ] `develop-next` and `develop-batch` no longer restate the question set in prose.

---

## 10. Risk Assessment

### High Risk Areas

- **Skips eroding evidence** — mitigated by the floor, the default-empty allow-list, and WAIVED never
  reading as PASS.
- **Self-approval** — `waiver.approved_by` set to the invoking developer lets one person skip and sign.
  Open question for the owner: is that acceptable, or must policy name an approver role?

### Medium Risk Areas

- **Stale review reuse** — a review of an older revision reused after edits. Mitigated by comparing
  content identity, not dates alone.
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
Disable a misbehaving piece by policy (`pipeline.skippable: []`) while fixing.

### Rollback Triggers
A floor step skipped; a skip recorded as PASS; a run asking a question it was given an answer to.

---

## Change Log

| Date       | Version | Description                                                                                   | Author |
| ---------- | ------- | --------------------------------------------------------------------------------------------- | ------ |
| 2026-10-09 | 1.0     | Initial draft — design from the rebirth-wallet consumer, with its step-timing measurement     | Claude |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Step timestamps
- [ ] Not started

### Phase 2: Answer resolution and `--defaults`
- [ ] Not started

### Phase 3: Step 2 reuse
- [ ] Not started

### Phase 4: Speed modes and waivers
- [ ] Not started

### Phase 5: `develop-bug` parity and close-out
- [ ] Not started

---

## References

- [bug.18](../../bugs/bug.18.autonomous-runs-hardcode-base-branch/bug.18.autonomous-runs-hardcode-base-branch.md) — the directive drift this contract retires
- `shared/resources/develop-pipeline-lite-mode.md`, `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
- `skills/qa-gate/SKILL.md` — WAIVED schema

## Notes

Open decisions for the owner before `planned`: the waiver approver (self or role); whether `fast`
should be offered to `develop-next`/`develop-batch` runs via policy only; the exact content-identity
check for Step 2 reuse.
