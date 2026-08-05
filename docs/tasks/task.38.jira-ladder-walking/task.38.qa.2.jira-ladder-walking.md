---
id: task.38.qa.2
title: "QA Report: Task 38 — Jira ladder walking (final)"
type: qa-report
description: "Final QA report after five review/fix cycles. All 23 findings fixed and verified by execution. Gate PASS, 90/100."
tags: [qa, task.38, jira, tracker-workflow]
task-ref: task.38.jira-ladder-walking.md
created: 2026-08-05
updated: 2026-08-05
---

# QA Report: Task 38 — Jira: walk the status ladder (final)

**Task**: [task.38.jira-ladder-walking.md](./task.38.jira-ladder-walking.md)
**Gate File**: [task.38.gate.2.jira-ladder-walking.yml](./task.38.gate.2.jira-ladder-walking.yml)
**Supersedes**: [task.38.gate.1](./task.38.gate.1.jira-ladder-walking.yml) / [task.38.qa.1](./task.38.qa.1.jira-ladder-walking.md) (FAIL, 20/100)
**QA Cycles**: 5
**PR**: [#194](https://github.com/Gamaroff/agent-skills/pull/194)
**Gate Status**: **PASS** — 90/100

---

## Executive Summary

Five review/fix cycles found and closed **23 issues**, seven of them high-severity. The feature now
does what the task specifies, and — more to the point — the failure mode the task exists to prevent
has been closed on **five distinct routes**, four of which were not visible until the first was fixed.

The headline finding is not any single bug but the shape of the sequence. Cycles 2, 3 and 4 each found
that the *previous cycle's fix* was wrong, always in the same area: whether the consumer's file
outranks their older JSON config, and for which moments. Each fix was correct about the case in front
of it and wrong about a neighbouring one, because the authorship gate and the resolution it guarded
sat at different granularities. They agree only at per-moment-per-issue-type, which is where the code
now resolves it. Cycle 5 verified that by executing all 105 configuration combinations.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## The five routes to a wrong Done

Worth stating plainly, because it is the substance of this review. Each of these would have fired the
board's real Done transition on a card whose author had routed it elsewhere — the one outcome the task
calls unrecoverable.

| # | Route | Found | Closed by |
| --- | --- | --- | --- |
| 1 | `done` retargeted at a gate column still took the done-category fallback | the task itself | last-rung conjunction (`isTerminalMoment && isLastRung`) |
| 2 | An unauthored file's built-in defaults outranked the record's `enabled: false` | cycle 2 (CR-6) | authorship gate on the pipeline, not the file's existence |
| 3 | A `byIssueType` overlay's authored target was ignored entirely | cycle 3 (CR-11) | `pipelineAuthoredFor`, per issue type |
| 4 | A one-key overlay (`in-qa: ~`) claimed authorship of all eight moments | cycle 4 (CR-17) | authorship answered per moment |
| 5 | The MCP fallback ran `--print-plan` without `--issue-type`, so no overlay applied | cycle 5 (CR-20) | `--issue-type` required, pinned by the parity test |

Routes 2–5 were each *created or exposed* by the fix for the one before it. Every one now has a test.

---

## Cycle-by-cycle

**Cycle 1 — FAIL (20/100).** CR-1 the cycle guard turned the most common outcome (`already`) into
`walk-incomplete`; CR-2 a partial walk was emitted as a clean success with no warning; CR-3 an authored
omission still fired the built-in default; CR-4 the built-in ladder outranked the JSON record —
an undisclosed breaking change against the task's own compatibility claim; CR-5 a hop's HTTP failure
was flattened, losing the only diagnostics a workflow validator has. Plus two cleanups and the
coverage gap that let all five through.

**Cycle 2.** CR-6: the CR-4 fix keyed on `source === "file"`, which is true for empty, malformed and
`statuses:`-only files whose pipeline is the built-in default — half-fixing the original and newly
disabling stages the record had opted into. CR-7: the test named "a partial walk is reported as
walk-incomplete" asserted `no-transition` on a single-rung plan, so CR-2 had zero coverage at the very
layer cycle 1 claimed to be closing.

**Cycle 3.** CR-11: `pipelineAuthored` is file-level, so an overlay-authored pipeline with no top-level
block read as unauthored — route 3 above. CR-12: the test whose comment announced it "pins the branch
ordering" did not (both orders emit the same object; the `--strict` sibling is what discriminates).
CR-14: three claims in the reference doc now contradicted the code, one of them a paragraph added
earlier in this same task.

**Cycle 4.** CR-17: `pipelineAuthoredFor` was per issue type while `resolveMoment` resolves per key, so
the documented per-type disable claimed authorship of the seven moments it says nothing about — route 4.

**Cycle 5.** The JavaScript cleared across 105 executed combinations. The remaining blocking issue was
in prose: CR-20/CR-21 above.

---

## Success Criteria Verification

All functional, performance, code-quality and migration criteria are met **except** the fixture
capture, which is externally blocked and disclosed:

| Criterion | Status |
| --- | --- |
| Intermediate rung walked through; blocked hop reports `walk-incomplete` + `landed`/`remaining` | ✅ |
| Cycle-aborted walk reports the same shape, never `walked` | ✅ |
| Retargeted `done` skips instead of firing the done-category transition | ✅ |
| `isLastRung` measured against the issue type's ladder | ✅ (overlays both longer and shorter) |
| A ladder-only rung is ranked and guards a regress | ✅ |
| Every rung resolves via any of its names | ✅ |
| `--print-plan` credential-free, network-free, honours `--from` | ✅ |
| Default one-rung path makes the same API calls as before | ✅ (moving case; `already` costs one GET more — measured and documented) |
| All existing fixture assertions pass unchanged | ✅ |
| `CHANGELOG.md`, protocol one-hop limit, reference doc, `npm run bundle` | ✅ |
| **`rapp-story-ready-for-showcase.json` captured** | ⛔ **blocked — no board credentials** |

---

## NFR Assessment

**Reliability — PASS.** Five routes to the unrecoverable outcome closed, each with a test.
**Performance — PASS.** `1+2n` asserted; the `transitions` parameter genuinely suppresses the second GET.
**Security — PASS.** No new credential handling; `--print-plan` proven offline by a throwing `fetchImpl`.
**Maintainability — PASS.** Hop construction and authorship each resolved in exactly one place.

---

## Regression Testing

- **888/888** passing, exit 0 — including the document/epic/story/task sync guard tests that are the
  regression signal for the ladder-aware rank change.
- All 8 pre-existing `rapp-*` fixture assertions pass **unchanged**.
- `npm run bundle` idempotent; the `tracker-workflow` purity test still passes, so the new
  `jira-sync → tracker-workflow` require did not pull the Jira client into the pure module.

---

## Deferred (not blocking)

1. **`rapp-story-ready-for-showcase.json`** — needs a live authenticated capture with an issue parked in
   `READY FOR SHOWCASE`. Substituted with a two-hop walk on a fully-captured path
   (`Waiting for Review → In Review → Ready for Testing`) which proves the same position-dependence
   property, plus the UPPERCASE assertion against the real `id=21`.
2. **Two consumer tests** needing live board credentials (`--dry-run` per real column).
3. **Advisory**: `validateWorkflow` could warn when a `source: "file"` workflow authors no pipeline —
   the behaviour is correct and documented, but silent.

---

## Final Assessment

**Gate Status**: **PASS**
**Quality Score**: 90/100 — 10 withheld for the uncaptured fixture and the two unrun consumer tests.
**Deployment Recommendation**: **APPROVED**

The code is in better shape than a one-cycle PASS would have left it: the precedence semantics are now
explicit, documented, and pinned by tests at the granularity they actually resolve at, and the several
ways a wrong terminal transition could be reached are each closed and covered. The review process
earned its cost here — three of the seven high-severity findings were introduced by fixes for earlier
findings, and none was visible to the test suite as it stood.
