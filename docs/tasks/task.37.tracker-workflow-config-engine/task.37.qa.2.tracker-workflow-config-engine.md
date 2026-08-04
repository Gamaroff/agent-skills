---
id: task.37.qa.2
title: "QA Re-Review: Task 37 — tracker-workflow.yaml config engine (cycle 2)"
type: qa-report
description: "Re-review after qa-fix cycle 1: all four prior findings verified fixed and correct; one new medium defect found in the same class, affecting byIssueType overlays."
tags: [qa, task, configuration, tracker, re-review]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# QA Re-Review: Task 37 — cycle 2

**Task**: [task.37.tracker-workflow-config-engine.md](./task.37.tracker-workflow-config-engine.md)
**Gate File**: [task.37.gate.2.tracker-workflow-config-engine.yml](./task.37.gate.2.tracker-workflow-config-engine.yml)
**Previous Gate**: [task.37.gate.1.tracker-workflow-config-engine.yml](./task.37.gate.1.tracker-workflow-config-engine.yml) (CONCERNS, 80/100)
**PR**: [#193](https://github.com/Gamaroff/agent-skills/pull/193)
**Review Date**: 2026-08-04
**Gate Status**: CONCERNS (90/100 — up from 80)

---

## Re-Review Context

Scoped to files changed since gate 1: `shared/resources/tracker-workflow.js`,
`shared/resources/tests/tracker-workflow.test.mjs`, `tests/bundle-mjs.test.js`.

| Prior finding                                        | Status    | Verification                                                                                                                                                                             |
| ---------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| CR-1 — default pipeline stored rung indices          | **FIXED** | `DEFAULT_PIPELINE` is name-based; no numeric branch survives in `resolveMoment` or `validateWorkflow`. For a no-file consumer the names resolve to rungs 1/2/5 and the returned candidate lists were **diffed against `jira-sync.js`'s constants** — byte-identical, in order. The original reproduction was re-run: `done` now resolves to rank 3 on the four-rung ladder. |
| CR-2 — `cloneWorkflow` shallow-copied `byIssueType`  | **FIXED** | Deep copy via JSON round-trip. `parseYamlSubset` emits only strings/arrays/objects/null — no cycles, no `undefined` — so the copy is lossless.                                            |
| CR-3 — `pipeline` reset before shape check           | **FIXED** | The reset now sits inside the shape-checked branch; a scalar falls through to the default. The empty-vs-malformed distinction is tested.                                                  |
| CR-4 — no bundled-vs-source drift guard              | **FIXED** | Files diffed directly with the single generated header line removed — identical.                                                                                                          |

The fixes are not merely present but **correct**, which is the distinction this table exists to make.
CR-1 in particular was fixed at the root — the numeric representation was deleted rather than
special-cased around, so there is no second code path left to diverge.

---

## Executive Summary

Cycle 1's fixes are good work and the quality score moves 80 → 90. Maintainability is upgraded to
PASS: the drift guard closed the gap that drove the deduction, and the nine regression tests added
are specific and explain what they catch.

The gate stays **CONCERNS** on one finding, and it is worth being clear about why: it is the *same
defect class* as CR-1, one level down. Cycle 1 established that "a target nobody chose for this
ladder must not silently become a side-state". CR-1 fixed that for the base ladder. A `byIssueType`
overlay replaces `statuses:` while inheriting the base `pipeline:` — so for that issue type, every
base target is exactly such a target, and the same silence returns.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix CR-5

---

## Issues Found

### MEDIUM Severity (1)

**CR-5 — An overlay type inherits base pipeline targets its own ladder does not contain**

- **Severity**: MEDIUM · **Category**: Functional · **Priority**: P1
- **Location**: `shared/resources/tracker-workflow.js` — `resolveMoment` / `describeTarget` /
  `validateWorkflow`'s `byIssueType` loop
- **Observation**: `byIssueType.<type>.statuses` **replaces** the ladder for that type (correct,
  and matching `resolveStage`), but `byIssueType.<type>.pipeline` only *overrides the moments it
  names*. Every other moment keeps the base target — which was chosen against the base ladder.
- **Reproduced live**, with the overlay from the reference doc:

  ```
  overlay ladder (IT / DevOps Task): [Selected for Development, In Progress, In Review, Done]
  resolveMoment("in-review", wf, {issueType:"IT / DevOps Task"})
    -> { targets: ["Waiting for Review"], rank: null, offLadder: true }
  validateWorkflow warns: []
  ```

  `Waiting for Review` is a base-ladder column. This issue type's board has `In Review`. The engine
  would hand a tracker executor a column that type does not have, and report nothing.

- **Impact**: Identical in shape to CR-1 — a plausible, well-formed config produces a silently wrong
  target. Narrower in blast radius (Jira-only, and only for types carrying a `statuses` overlay), which
  is why this is MEDIUM rather than HIGH.
- **Recommendation**: Treat a target as **inherited** when it comes from the built-in default *or*
  from the base pipeline applied to an overlay-replaced ladder. Resolve an inherited miss against the
  corresponding `DEFAULT_LADDER` rung's full alias list before falling back to off-ladder, and extend
  `validateWorkflow`'s `byIssueType` loop to check inherited moments against the per-type ladder.

  This also resolves the alias gap noted below, since `In Review` is an alias on the same default rung
  as `Waiting for Review`.

### Advisory (not gating)

**Alias matching lost for authored ladders** (medium confidence)

Collapsing the default pipeline to one name per moment means a board declaring a legitimate alias
column gets the single default name handed back off-ladder. Verified:

```
ladder: [Backlog, Doing, Review, Done]      ← "Doing" and "Review" are DEFAULT_LADDER aliases
resolveMoment("work-started") -> { targets: ["In Progress"], rank: null, offLadder: true }
```

Not a regression — the index-based version was wrong here too, differently — but the alias lists exist
precisely so that boards spelling a column differently still match. The CR-5 fix subsumes this.

**A copy failure would silently empty every overlay** (cleanup)

The `catch` around the `byIssueType` deep copy substitutes `{}` for the whole map, converting any
failure into total silent loss of every per-type overlay. The input cannot throw in practice, which
is the argument for removing the catch rather than for keeping it.

**`planMove` rebuilds the overlay ladder three times per call** (cleanup)

Twice via `rankOf`, once directly — each rebuild re-running `normalizeRung` over every authored rung.
Negligible at realistic ladder sizes, and the parse it depends on is cached, but trivially avoidable.

**Dead code in the cache test** (cleanup)

`readFileSync` is destructured, never used, and silenced with `void readFileSync;`. QA's own
oversight from cycle 1's test additions; worth removing rather than normalising.

**Total**: HIGH: 0, MEDIUM: 1, LOW: 0, Advisory: 4

---

## NFR Assessment

### Performance — PASS

Cache behaviour unchanged and still asserted. The `planMove` rebuild is the only new inefficiency and
is advisory: ladders are a handful of entries and the underlying parse is cached.

### Reliability — CONCERNS

Materially better than cycle 1 — three of the four failure modes are closed — but CR-5 reproduces the
signature that drove the original deduction: a plausible config yielding a move to a column the board
does not have, with nothing warning. The class is not closed until inherited targets are resolved
against the ladder actually in play.

### Security — PASS

Unchanged. No new surface introduced by the fixes.

### Maintainability — PASS *(upgraded from CONCERNS)*

The drift guard closed cycle 1's deduction directly, and it is a genuinely good test: it catches the
one failure the in-repo suites are structurally blind to. The regression tests added for each finding
state what they catch and why, in the house style. Two cleanups remain, neither behavioural.

---

## Code Review

Re-review scoped to the three changed files. All four prior fixes independently verified (see
Re-Review Context). New findings:

**Correctness bugs (2):**

- [medium/high] `shared/resources/tracker-workflow.js:541` — an overlay type inherits base pipeline
  targets absent from its own ladder; `validateWorkflow`'s `byIssueType` loop never checks them
  → resolve inherited targets against the ladder in play. **Promoted to gate as CR-5.**
- [low/medium] `shared/resources/tracker-workflow.js:129` — the one-name default drops alias matching
  for an authored ladder → try the default rung's alias list on an inherited miss. Advisory
  (confidence below the gating threshold); subsumed by the CR-5 fix.

**Cleanups (3):** the swallowing `catch` on the overlay deep copy; `planMove`'s triple ladder rebuild;
dead `void readFileSync` in the cache test.

---

## Regression Testing

| Area                          | Result | Notes                                                          |
| ----------------------------- | ------ | -------------------------------------------------------------- |
| Full repo suite               | PASS   | 825/825 (was 816) — 9 added, 0 pre-existing modified            |
| `develop-batch` scheduling    | PASS   | 41/41 unchanged                                                 |
| Bundler across all skills     | PASS   | `npm run bundle` clean and idempotent                           |
| Default-ladder compatibility  | PASS   | Candidate lists re-diffed against `jira-sync.js` constants      |

---

## Final Assessment

**Gate Status**: CONCERNS
**Quality Score**: 90/100 (was 80)
**Rationale**: Cycle 1's findings are fixed and verified correct, one of them at the root rather than
around. The remaining finding is the last member of the defect class this review has been tracking —
an inherited target resolved against a ladder it was not chosen for — and closing it also closes the
alias gap. Cheap, and still unreachable by any real board while the engine stays unwired.

**Deployment Recommendation**: CONDITIONAL — merge after CR-5.

---

**Next Steps**: `/qa-fix` against gate 2, then re-review.
