---
id: task.100
title: "[Task 100] mutation-proving covers the false GREEN but not the false RED"
type: task
description: "The mutation-proving reference tells you to confirm a mutation applied before believing a survival — and that check works. It says nothing about the mirror: a suite that goes red because the runner never executed it reads exactly like a dead mutant, and is more convincing because red was the prediction. Four invalid probe readings in one consumer run, two of them false REDs that would have certified coverage never exercised."
tags: [mutation-proving, testing, evidence, shared-resources]
category: documentation
status: draft
priority: Medium
risk_level: low
created: 2026-09-08
updated: 2026-09-08
assignee:
estimated_effort_hours: 2
---

# Technical Task: the false-RED mirror in mutation-proving

**Status:** Draft

---

## 1. Overview

`shared/resources/mutation-proving.md` handles the **false GREEN** well. Step 2 requires diffing
against a pre-mutation copy before believing a survival, with the observed case (a literal `…` where
the source had `...`) recorded. The *"When the proof does not go red"* table covers the three reasons
a mutant survives.

It says nothing about the **mirror**: a suite that goes red for an **environmental** reason reads
exactly like a dead mutant — and is *more* persuasive, because red was the prediction.

## 2. Motivation

Four invalid probe readings in a single consumer run (tinker-city task.103, 2026-09-08), in both
directions:

| # | Cause | Presented as |
| :-- | :--- | :--- |
| 1 | mutation harness driven from a `subprocess` inherited a different Node major; the repo's own node-major guard **refused the run** | 4 dead mutants — **false RED** |
| 2 | `--reporter=basic` does not exist in that Vitest; the runner threw while loading it | 4 dead mutants — **false RED** |
| 3 | a fixture whose decoy was a *comment*, which the comment-stripper already removes — it passed with its own fix reverted | a live mutant — **false GREEN** |
| 4 | a heredoc mangled the replacement, so the mutation never applied | 2 survivors — **false SURVIVAL** |

Rows 3 and 4 are already covered by this document (the six shapes; step 2). **Rows 1 and 2 are not.**

The detail worth keeping: **row 1 was the repository's own guard working exactly as designed.** A
correct refusal is what made the reading convincing. Nothing in the output said "this suite did not
run" in terms a reader scanning for red would notice.

Both false REDs would have recorded a mutation matrix as complete having executed **zero** tests —
certifying coverage that was never exercised, while looking like diligence.

## 3. Scope

**In scope**

- A new section, *"When the proof goes red for the WRONG reason"*, immediately after *"When the proof
  does not go red"*.
- A three-check probe-validation procedure.

**Out of scope**

- The existing step 1–5 procedure, the six shapes, and the `## Do not claim it unless you did it`
  section — all unchanged.
- Any tooling. This is a reference document; the fix is a rule, not a script.

## 4. Breaking Changes

None — additive prose.

## 5. Implementation Plan

- [ ] **Phase 1** — add the section and its table (mirror of the existing one).
- [ ] **Phase 2** — add the three-check probe validation: baseline GREEN with the *exact* command
      the matrix will use; one known-bad mutation RED **killed by its named case**; the mutation
      asserted applied.
- [ ] **Phase 3** — `npm run bundle`, commit the regenerated `references/`.

## 6. Files Summary

- `shared/resources/mutation-proving.md`
- `skills/*/references/mutation-proving.md` — regenerated

## 7. Testing Strategy

Prose, so the test is a **review against the four recorded readings**: each of the four must be
identifiable from the finished section — two as the new class, two as already-covered — and a reader
who follows the three checks must be unable to record any of them as evidence.

The section's own claim to check: that the three checks cost ~20 seconds. If they cost materially
more, the rule will be skipped and is worth restating cheaper.

## 8. Success Criteria

1. [ ] A reader can classify a red run as *a real kill* / *environmental refusal* / *invocation
       error* from the table alone.
2. [ ] The probe-validation procedure states all three checks, and states that a matrix collected
       before them proves nothing **in either direction**.
3. [ ] The document says plainly that a **false RED is worse than a false GREEN**, and why: it
       certifies coverage that was never exercised.
4. [ ] The existing false-GREEN material is unchanged.

## 9. Risk Assessment

**Low.** The failure mode of the change itself is that the section is ignored. The mitigation is
placement — directly beside the question it mirrors, so a reader asking "why did my mutant survive?"
meets "and why did it die?" in the same breath.

## 10. Rollback Plan

Delete the section; `npm run bundle`.

## Change Log

| Date | Version | Description | Author |
| :--- | :--- | :--- | :--- |
| 2026-09-08 | 0.1 | Filed from four invalid probe readings measured in one consumer run — two false REDs the reference does not cover, one of which was the repository's own guard correctly refusing to run. | Claude |

## Progress Tracking

Not started.

## References

- `shared/resources/mutation-proving.md` — the false-GREEN half this mirrors
- tinker-city `docs/tasks/task.103.dialog-migration-followups/task.103.qa.{3,4}.*.md` — the probe
  invalidity is recorded in both, with the commands that produced each reading

## Notes

Companion findings from the same run: **task.99** (QA loop has no diminishing-returns exit) and
**task.101** (`fastGateCommand` default).
