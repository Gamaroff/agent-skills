---
id: task.37.qa.5
title: "QA Re-Review: Task 37 — tracker-workflow.yaml config engine (cycle 5, final)"
type: qa-report
description: "Final re-review: zero correctness defects, all nine prior findings closed and re-verified against their original reproductions, three advisory cleanups applied in-cycle. Gate PASS."
tags: [qa, task, configuration, tracker, re-review]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# QA Re-Review: Task 37 — cycle 5 (final)

**Gate File**: [gate.5](./task.37.gate.5.tracker-workflow-config-engine.yml) · **Previous**: [gate.4](./task.37.gate.4.tracker-workflow-config-engine.yml) (FAIL, 80/100)
**PR**: [#193](https://github.com/Gamaroff/agent-skills/pull/193) · **Review Date**: 2026-08-04
**Gate Status**: **PASS** (100/100)

---

## Executive Summary

The final review found **no correctness defects**. Both cycle-4 findings are fixed, the structural
change that accompanied them holds, and — the check that matters most after five cycles of churn —
the built-in default still resolves to candidate lists **byte-identical to `jira-sync.js`'s
constants**, in order. That is the compatibility contract for every consumer with no file, and it has
survived every fix.

The three cleanups this review did raise were applied within the cycle rather than deferred, because
one of them was the same duplication shape that produced a finding in each of cycles 2, 3 and 4, and
leaving it would have left the next change one careless edit away from cycle 6.

**Overall Assessment**: PASS · **Deployment**: APPROVED

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-8 — guard silenced genuine per-type misses | **FIXED** | The exact cycle-4 reproduction re-run: `changes-requested` for `Ops Request` now emits the warn naming both remedies. |
| CR-9 — `fromOverlay` answered the wrong question | **FIXED** | An overlay restating the base ladder now resolves the authored target identically to the base. |

All nine findings across five gates are closed. Each was re-verified by **re-executing its original
reproduction against the final code**, not by re-running the test that was written for it — the tests
and the fixes were authored together, so they are not independent evidence.

---

## Issues Found

### Correctness defects: none

### Cleanups raised — all applied in-cycle

**Base resolution computed twice with inverted polarity.** `validateWorkflow`'s base loop asked "is
this off-ladder?" and the per-type loop asked the inverse, each calling `resolveMoment` independently
— for every (issue type × moment) pair. Memoised into one lookup shared by both loops. This is the
finding worth naming: it is the identical shape to CR-6, CR-7 and CR-9, and catching it here rather
than in a sixth cycle is the review's main contribution.

**Ladder resolved eagerly on a path that usually returns null.** Five of the eight moments are
disabled under the built-in default, and each was paying an overlay lookup, a `normalizeRung` pass
and a `sameLadder` comparison to answer a question never asked. Now lazy; `overlayFor` stays eager
because it is a single key lookup and only the ladder build is worth deferring.

**An overstated comment.** "Resolved ONCE and threaded down" was not literally true while
`overlayFor` was still called twice. Comment and code reconciled — in the direction of the code.

---

## NFR Assessment

**Security — PASS.** No HTTP, no `gh`, no credential handling, no user input reaching a shell. The
one `execSync` is a fixed `git rev-parse --show-toplevel` with no interpolation, and a test asserts it
is the only one. Independence from `jira-sync.js` is asserted behaviourally through a clean child
process's require cache, so a GitHub-only consumer cannot acquire the Jira client transitively.

**Performance — PASS.** Parse cached per resolved path and asserted by intercepting
`fs.readFileSync`. After this cycle the ladder resolves once per `resolveMoment` and lazily, and
`validateWorkflow` memoises base resolutions across both loops. `develop-batch`'s 41 unit tests are
unchanged, which is the meaningful regression signal for the parser promotion.

**Reliability — PASS.** The defect class is closed at the root, and both boundaries are pinned: an
*inherited* miss alias-resolves and, failing that, warns; an *authored* miss stays a side-state and is
never rerouted. The swallow-everything contract holds — missing, unreadable, malformed and
wrong-shaped inputs all yield defaults, and nothing throws.

**Maintainability — PASS** *(upgraded from CONCERNS).* The meta-cause of cycles 2–4 was one truth
computed in several places. The final structure has **one** ladder scan (`rankIn`), **one** overlay
decision (`resolveLadder`), **one** base resolution per moment, and **one** representation for
pipeline targets — each with the failure it prevents written down beside it.

---

## Regression Testing

| Area | Result | Notes |
| --- | --- | --- |
| Full repo suite | PASS | 840/840; started at 760, no pre-existing test modified across five cycles |
| Default-ladder compatibility | PASS | Candidate lists re-diffed against `jira-sync.js` constants — byte-identical, in order |
| All nine reproductions | PASS | Each re-executed against the final code |
| `develop-batch` | PASS | 41/41 unchanged |
| Bundler | PASS | Clean, idempotent; bundled parser asserted equal to source |

---

## Final Assessment

**Gate**: PASS · **Quality Score**: 100/100

Five cycles is more than this task should have needed, and the reason is worth recording for the next
one: the first defect was fixed correctly each time, and each fix introduced its successor because the
concept it depended on was evaluated in more than one place. The score reflects the final state, not
the path — but the path is why the final structure is worth keeping.

**Deployment Recommendation**: APPROVED.

---

**Next Steps**: `/finalise` — verify Definition of Done and accept.
