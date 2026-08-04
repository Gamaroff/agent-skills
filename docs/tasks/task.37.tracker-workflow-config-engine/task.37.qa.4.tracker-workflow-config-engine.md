---
id: task.37.qa.4
title: "QA Re-Review: Task 37 — tracker-workflow.yaml config engine (cycle 4)"
type: qa-report
description: "Re-review after qa-fix cycle 3: both prior findings fixed, but the CR-7 guard was too broad and silenced genuine warnings — a high-severity regression in the fix itself. Gate FAIL."
tags: [qa, task, configuration, tracker, re-review]
status: accepted
created: 2026-08-04
updated: 2026-08-04
task-ref: task.37.tracker-workflow-config-engine.md
github_issue: 185
---

# QA Re-Review: Task 37 — cycle 4

**Gate File**: [gate.4](./task.37.gate.4.tracker-workflow-config-engine.yml) · **Previous**: [gate.3](./task.37.gate.3.tracker-workflow-config-engine.yml) (CONCERNS, 90/100)
**PR**: [#193](https://github.com/Gamaroff/agent-skills/pull/193) · **Review Date**: 2026-08-04
**Gate Status**: **FAIL** (80/100)

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-6 — `isInherited`/`ladderFor` disagreed on overlay applicability | **FIXED** | `resolveLadder` returns `{ladder, fromOverlay}` from one decision; an unusable overlay now inherits nothing. |
| CR-7 — per-type warning fired for by-design side-states | **FIXED**, but see CR-8 | The contradictory warn is gone; the guard chosen to remove it was too broad. |

---

## Executive Summary

The gate is **FAIL**, and it is worth being precise about why, because the raw finding count went
*down*.

CR-7's fix silenced the spurious warning by keying on "this moment has no `DEFAULT_RUNG_FOR_MOMENT`
entry". The intent was "this moment is a deliberate side-state". Those are not the same predicate,
and the gap between them is exactly `changes-requested`, `pr-merged` and `blocked` **when their base
target is genuinely on the base ladder**. In that case the miss is real, the warning existed and was
correct at the previous commit, and it now does not fire.

A false negative in the validator is the most serious failure mode this module has, because the
validator is the only thing standing between a misconfigured overlay and a silently wrong board move
— and silence is indistinguishable from correctness. That is why this rates HIGH where the original
CR-5 rated MEDIUM, and why the gate is FAIL rather than CONCERNS.

**Overall Assessment**: FAIL · **Deployment**: BLOCKED

---

## Issues Found

### HIGH Severity (1)

**CR-8 — the CR-7 guard silences genuine per-type inherited misses**

Verified:

```yaml
statuses: [Backlog, In Progress, In Review, Done]
pipeline:
  changes-requested: In Review # ← on the base ladder
byIssueType:
  "Ops Request":
    statuses: [Backlog, In Progress, Done] # ← no In Review
```

```
resolveMoment("changes-requested", wf, {issueType:"Ops Request"})
  -> { targets: ["In Review"], rank: null, offLadder: true }
validateWorkflow warns: []            ← warned correctly at 28779bc
```

The moment silently resolves to a column that type does not have, and nothing reports it. This is a
regression *introduced by the previous fix* — the precise case CR-5 added the warning for.

**Recommendation**: skip only when the **base** resolution is itself off-ladder. That is the actual
discriminator for a deliberate side-state, and it needs no per-moment table.

### MEDIUM Severity (1)

**CR-9 — `fromOverlay` answers the wrong question**

It means "did the overlay supply rungs?", not "is the ladder in play actually different?". An overlay
restating the base ladder verbatim therefore still marks base targets inherited:

```
base ladder [In Progress, Closed], authored  done: Ready for Showcase
overlay "Ops Request": statuses: [In Progress, Closed]     ← identical

resolveMoment("done")                     -> Ready for Showcase, offLadder  ✓
resolveMoment("done", {issueType:"Ops…"}) -> Closed, rank 1                 ✗
```

Same invariant as CR-6 — *an authored target must resolve identically wherever the ladder is
identical* — reached by a different route. The diff's own CR-6 test asserts it in the unusable-overlay
form and passes; a redundant overlay slips underneath it.

### Advisory

- **Three copies of the ladder scan** now exist (`rankOf`, `describeTarget`, `planMove`). They agree
  today, so this is duplication risk rather than live divergence — but every finding in cycles 2, 3
  and 4 has been one truth computed in two places, and this is that shape again.
- **"Resolve once" is not met on the main path** — `resolveMoment` → `overlayFor`, `isInherited` →
  `resolveLadder`, `describeTarget` → `ladderFor` → `resolveLadder`: three overlay lookups and two
  full rebuilds per moment, multiplied by moments × types during validation.

---

## NFR Assessment

**Security — PASS.** Unchanged.

**Performance — PASS.** `planMove` is fixed; the equivalent cost persists on the resolution path.
Advisory: ladders are small and the parse is cached.

**Reliability — FAIL.** CR-8 removes a correct warning. A validator that stays silent about a real
misconfiguration is worse than one that never existed, because its silence is read as approval.

**Maintainability — CONCERNS** *(down from PASS)*. Not because the code got worse to read — it did
not — but because the same defect shape has now produced findings in three consecutive cycles. The
fix for CR-8 and CR-9 individually is small; the fix that stops a cycle 5 is to collapse the
duplicated scan and thread the resolved ladder through one path.

---

## Final Assessment

**Gate**: FAIL · **Quality Score**: 80/100

Each cycle has narrowed the defect, and the abstraction is right. What keeps regenerating findings is
that the abstraction is *evaluated* in several places with predicates that are individually plausible
and mutually inconsistent. The recommendation is therefore not just the two fixes, but the two
advisory items — they are the structural change that removes the class.

**Deployment Recommendation**: BLOCKED until CR-8 and CR-9 are fixed.

---

**Next Steps**: `/qa-fix` against gate 4, then re-review.
