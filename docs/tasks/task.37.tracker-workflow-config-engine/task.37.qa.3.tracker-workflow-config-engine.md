---
id: task.37.qa.3
title: "QA Re-Review: Task 37 — tracker-workflow.yaml config engine (cycle 3)"
type: qa-report
description: "Re-review after qa-fix cycle 2: CR-5 verified fixed and the inherited abstraction judged correct, with two implementation defects found in the fix itself — both cases of one truth computed in two places."
tags: [qa, task, configuration, tracker, re-review]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# QA Re-Review: Task 37 — cycle 3

**Task**: [task.37.tracker-workflow-config-engine.md](./task.37.tracker-workflow-config-engine.md)
**Gate File**: [task.37.gate.3.tracker-workflow-config-engine.yml](./task.37.gate.3.tracker-workflow-config-engine.yml)
**Previous Gate**: [gate.2](./task.37.gate.2.tracker-workflow-config-engine.yml) (CONCERNS, 90/100)
**PR**: [#193](https://github.com/Gamaroff/agent-skills/pull/193)
**Review Date**: 2026-08-04
**Gate Status**: CONCERNS (90/100)

---

## Re-Review Context

Scoped to the cycle-2 fix commit (`28779bc`): `shared/resources/tracker-workflow.js` and its test suite.

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-5 — overlay type inherits base targets its ladder lacks | **FIXED** | `in-review` for `IT / DevOps Task` resolves to `In Review` at rank 2 instead of the base ladder's `Waiting for Review` off-ladder. The alias gap closed with it; the authored-target boundary is tested in both base and overlay forms. |

**The abstraction is right.** Naming *inherited* — a target chosen against a different ladder than the
one it is resolved against — is the correct generalisation, and it unified two findings (CR-5 and the
alias gap) that had looked separate. The remaining problems are in the implementation of that idea,
not the idea.

Both are the same mistake: **one truth computed in two places.**

---

## Issues Found

### MEDIUM Severity (2)

**CR-6 — `isInherited` and `ladderFor` disagree about when an overlay is in play**

`isInherited` tested `overlay.statuses.length`; `ladderFor` required at least one rung surviving
`normalizeRung`. An overlay whose `statuses:` is non-empty but wholly unusable therefore leaves the
**base** ladder in play while still counting as overlaid — so the alias fallback engages against a
ladder whose targets were authored deliberately. Verified:

```
base ladder [In Progress, Closed], authored `done: Ready for Showcase`
overlay "Ops Request": statuses: [ {foo: bar} ]     ← non-empty, no usable rung

resolveMoment("done", wf)                        -> Ready for Showcase, offLadder  ← correct
resolveMoment("done", wf, {issueType:"Ops Request"}) -> Closed, rank 1              ← rerouted
```

Same ladder, two answers. This is the *silent reroute of an explicit choice* that the cycle-2 fix's
own comment forbids, and it is the higher-stakes direction of the defect class: an authored target
being quietly redirected is worse than an inherited one being missed.

**Impact**: MEDIUM — requires a malformed overlay to trigger, but produces a confidently wrong
destination rather than a visible failure.

**CR-7 — the per-type warning fires for side-states that are off-ladder by design**

The `byIssueType` inherited-miss loop warned on every off-ladder inherited moment, including `blocked`
and `pr-merged` — which have no `DEFAULT_RUNG_FOR_MOMENT` entry *precisely because* they are
side-states. Verified: an authored `blocked: Blocked` plus one overlay type emits both

```
info: `pipeline.blocked` targets "Blocked" … treating it as an off-ladder side-state
warn: `blocked` for issue type "Ops Request" inherits the base target "Blocked" … declare it … or set it to `~`
```

Two messages about the same target, disagreeing, one of them instructing the author to fix something
already correct. N overlay types produce N such warnings.

**Impact**: MEDIUM — no wrong behaviour, but a validator that cries wolf is one people stop reading,
which costs the genuine CR-5 warning its value.

### Advisory

**Dead re-check in `validateWorkflow`** — the `rankOf(target, workflow) == null` guard is now
unreachable as `false`: the preceding `offLadder` check already implies it, so it re-runs a full ladder
scan to learn nothing.

**Alias fallback rebuilds the ladder per candidate** — up to seven rebuilds for one moment, multiplied
by moments × issue types during validation. The same cost this cycle removed from `planMove`.

---

## NFR Assessment

### Performance — PASS

`planMove`'s triple rebuild is fixed. The equivalent cost reappeared in `describeTarget`'s alias
fallback; advisory, and the CR-6 fix removes it as a side effect since both want the ladder resolved
once.

### Reliability — CONCERNS

CR-5's class is closed for well-formed configuration. CR-6 reopens a narrow instance for a malformed
overlay, in the more dangerous direction.

### Security — PASS

Unchanged; no new surface.

### Maintainability — PASS

The inherited concept is documented at both its definition and its use, and the tests added state what
they catch. CR-6 and CR-7 are both duplicated-truth bugs, and the fix for each is to compute the truth
once — which is a good sign about the shape of the code rather than a bad one.

---

## Code Review

**Correctness bugs (2)** — both promoted to the gate:

- [medium/high] `tracker-workflow.js:583` — `isInherited` and `ladderFor` disagree on overlay
  applicability → resolve the ladder once and report whether the overlay supplied it.
- [medium/high] `tracker-workflow.js:762` — per-type loop warns on by-design side-states → skip
  moments with no default rung.

**Cleanups (2):** the unreachable `rankOf` re-check; the per-candidate ladder rebuild.

---

## Regression Testing

| Area | Result | Notes |
| --- | --- | --- |
| Full repo suite | PASS | 832/832 at review time |
| Default-ladder compatibility | PASS | No-file resolution unchanged |
| `develop-batch` | PASS | 41/41 unchanged |
| Bundler | PASS | Clean, idempotent |

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100

The direction of travel is good: each cycle has found a narrower instance of one defect class, and
cycle 2 correctly generalised it rather than patching the symptom. What remains is that the
generalisation is computed twice and the two copies disagree. Fixing that collapses both findings and
the two cleanups into a single change.

**Deployment Recommendation**: CONDITIONAL — merge after CR-6 and CR-7.

---

**Next Steps**: `/qa-fix` against gate 3, then re-review.
