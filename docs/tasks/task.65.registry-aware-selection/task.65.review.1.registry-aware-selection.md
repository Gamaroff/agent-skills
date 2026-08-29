---
id: task.65.review.1
title: 'Task Review Report — Task 65: Derive the selection frontier from the registries'
type: review
description: 'Standard-depth interactive review of task.65. Nine issues found — two critical (an undecided opt-out whose stated mechanism does not exist in either lifecycle, and a success criterion that contradicts the implementation plan), five important, two optional. All resolved by user decision and applied to the task document.'
tags: [review, task.65, develop-next, selection]
status: complete
created: 2026-08-29
updated: 2026-08-29
---

# Task Review Report: Task 65 — Derive the selection frontier from the registries

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-08-29

**Reviewed:** 2026-08-29
**Review Depth:** Standard
**Task Status at review:** `draft` → promoted to `ready-for-development`
**Overall Assessment:** GOOD

---

## Executive Summary

Task 65 is a well-argued document with an unusually strong motivation section and a correct core
design instinct — roadmap precedence, frontmatter-over-registry, read-only fallback, batch exclusion.
Its defects are concentrated in the places where a decision was described rather than made: the opt-out
mechanism (the mitigation for its own only High/High risk) named a status value that exists in neither
lifecycle, and Success Criterion 1 asserted an outcome the implementation plan two sections earlier
makes impossible.

Both are the same failure in different clothes — **prose that reads as settled but does not constrain
the implementer** — and both would have surfaced first as a QA finding rather than a review one.

**Critical Issues:** 2 🚨
**Important Issues:** 5 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 7 questions asked and answered
**Implementation Readiness:** 9/10 (post-fix; 6/10 as submitted)
**Recommendation:** ✅ READY TO IMPLEMENT

---

## User Decisions & Clarifications

### Question Point 1: Structure & Design

**Q1: Output format**
- **User Decision**: Comprehensive report
- **Impact**: This file.

**Q2: How should the opt-out work?** The Decisions table said "a status value the registry already
supports, plus an explicit `deferred` marker". Neither lifecycle has `deferred`, so the row contradicted
its own rationale ("reuse the existing status column rather than inventing a parallel annotation"), and
Phase 3 deferred the choice to implementation time.
- **User Decision**: Gate on document status — tasks eligible at `ready-for-development` or later; bugs
  at `new` or `reopened`.
- **Impact**: Removes the invented vocabulary entirely. A `draft` task is opted out **by construction**
  rather than by someone remembering to mark it, which is strictly stronger than the original design:
  the original required an action to opt *out*, the chosen one requires an action to opt *in*, and
  promotion up the ladder is already that action. Also removes the risk that an `in-progress` bug with a
  live branch gets restarted by the loop. No standards document changes.

**Q3: SC1 "byte-identical" vs Phase 4 adding `item.source`**
- **User Decision**: Always emit `source`; reword SC1.
- **Impact**: SC1 becomes a *testable* claim (diff the two objects with `source` deleted) rather than a
  false one. Rejected the "source only on registry items" alternative because absence-means-roadmap is
  an implicit contract every consumer would have to know.

**Q4: Which stop reasons may the fallback pre-empt?**
- **User Decision**: `roadmap-complete` only.
- **Impact**: Promoted from an unstated assumption to an explicit out-of-scope line, a Decisions row,
  and SC9 (one test per remaining stop reason). This is the single most consequential clarification in
  the review — see Issue C2 below.

### Question Point 2: Reachability & Linkage

**Q5: Roadmap PHASE 4 disposition**
- **User Decision**: Retire it in this task.
- **Impact**: New Phase 6. Without it the feature merges and changes nothing observable in this repo.

**Q6: Live registry drift in rows 62–64**
- **User Decision**: Fix as part of this task.
- **Impact**: Folded into Phase 6, sequenced *after* the drift test so the test is written against real
  drift rather than around it.

**Q7: Tracker linkage**
- **User Decision**: Sync to GitHub.
- **Impact**: Issue [#280](https://github.com/Gamaroff/agent-skills/issues/280) created, added to the
  "Agent Skills" board, Priority set to P1, milestone `Technical Tasks (standalone)`. Frontmatter and
  body cross-reference written; task-registry Issue column updated.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory sections present, plus a `## Decisions` table (a good addition — it is the section
that made the two critical findings visible at all). No placeholders, no TBD markers. Filename follows
`task.{n}.{descriptive-name}.md`. OKF frontmatter conformant: `type: task` present, `description`
present, `tags` a YAML list, `updated` present.

`sign-off` is not configured in `skills-config.yaml`, so that check was skipped. `change-log` defaults
to enabled: the `## Change Log` section is present with the four canonical columns and was current at
review time (`status: draft`, log at `1.0 Initial draft`).

### Issues

#### Important
- **[I5] No tracker linkage.** `github_issue` absent from frontmatter, no body cross-reference.
  *Resolved* — see Q7.

#### Optional
- **[O1] `estimated_effort_hours: 8` diverges from the rubric.** With 12 success criteria, 7 plan
  phases and `risk_level: medium`, the rubric lands nearer 10h — and that was *before* Phase 6 was
  added. Raised to 10.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1

Every file path in the document resolves. `select-next.mjs`, `roadmap-selection.md`,
`bug-registry.md`, `task-registry.md`, `evals/develop-next/unit/` all exist as described. The claims
about existing selector behaviour (phase boundaries, marker vocabulary, `B`/`T` id forms, path
resolution for general bugs) were checked against the source and are accurate — notably the claim that
general bugs already resolve, which is correct and correctly load-bearing.

### Issues

#### Critical (Hallucination)

- **[C1] `deferred` is not a value in either status lifecycle.**
  - **Location:** Decisions table, "Opt-out mechanism" row; Implementation Plan Phase 3.
  - **Issue:** The row reads "a status value the registry already supports, plus an explicit `deferred`
    marker". `document-status-lifecycle.md` defines `draft → planned → ready-for-development →
    in-progress → ready-for-review → accepted`, plus `cancelled`. `bug-documents.md` defines
    `new → in-progress → ready-for-qa → closed | reopened`, and states explicitly that the two ladders
    are deliberately distinct. Neither contains `deferred`, `parked`, or `wont-fix`.
  - **Why it matters beyond the word:** the row's own rationale is "reuse the existing status column
    rather than inventing a parallel annotation" — and the mechanism it names *is* the invention. So the
    Decisions table recorded a decision that had not been made, in the one row that mitigates the
    document's only High-likelihood / High-impact risk, and Phase 3 then handed the choice to the
    implementer ("decide and implement the marker"). A Decisions table exists precisely so that the
    implementer does not have to.
  - **Resolution:** eligibility floor on document status (Q2). Decisions row rewritten with the real
    rationale; Phase 3 rewritten from "decide the marker" to "there is no marker — make the floor
    impossible to fail silently" (the `registryFrontier` lint section).

#### Important

- **[I1] The two status vocabularies were collapsed into one rule.** Scope said "bug rows whose status
  is not `closed`" and "task rows whose document status is not `accepted`/`cancelled`" — but the bug
  ladder has no `cancelled`, and "not closed" admits `in-progress` and `ready-for-qa`. An `in-progress`
  bug typically has a live branch and possibly an open PR; auto-selecting it would restart work already
  underway. *Resolved* — a new Technical Background subsection tabulates both ladders and their eligible
  sets, and Scope now states them separately.

- **[I2] `--dry-run` is a `develop-next` skill flag, not a `select-next.mjs` flag.** Scope said
  "`--dry-run` / `--lint` reporting that says which source an item came from", implying script work on
  both. The script accepts `--roadmap`, `--batch`, `--require-touches` and `--lint` only; `--dry-run` is
  handled in `SKILL.md` (Steps 1/3) and simply prints the selection. *Resolved* — Scope and Phase 4 now
  say `--dry-run` inherits `source` for free because it prints the item, and `--lint` is the only flag
  gaining new output.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

Phases 1, 4 and 5 were specific and actionable as written. Phases 2 and 3 were not.

### Issues

#### Critical

- **[C2] Phase 2's insertion point was ambiguous, and the ambiguity had a dangerous reading.**
  - **Location:** Phase 2 — "Slot it after phase exhaustion and before the `roadmap-complete` stop."
  - **Issue:** `selectNext` returns five distinct stops, and four of them return *before*
    `roadmap-complete`: `human-gated` (a `manual`/`🚧` frontier), `planning-gap` (`/create-*`),
    `manual-checkpoint` (no runnable command or path), and `phase-blocked` (same-phase deadlock).
    "After phase exhaustion" is a fair description of the `phase-blocked` return too — under
    `phase-blocked`, no phase holds an actionable row either, which is the exact wording the Overview
    and the frontmatter `description` both use for when the fallback fires. An implementer reading only
    the Overview would place it there.
  - **Failure scenario:** with the fallback above `human-gated`, a roadmap whose frontier is a `manual`
    row — the operator's explicit "stop and ask me" — would fall through to the registries and dispatch
    an unattended pipeline. The loop would look healthy while doing precisely the thing the marker
    exists to forbid. This is the worst available failure mode for this feature and it was one
    reasonable reading away.
  - **Resolution:** Q4. Phase 2 now names the single insertion point and enumerates the four returns
    left untouched; a Decisions row records why; an out-of-scope bullet forbids widening it; and SC9
    requires one test per remaining stop reason.

- **[C3] SC1 contradicted Phase 4.** SC1 required selection to be "byte-identical to today's" when a
  roadmap row is actionable. Phase 4 adds `item.source` to the JSON. Both cannot hold, and the document
  gave no signal which was authoritative — so the implementer would resolve it by writing whichever test
  was easier to pass. *Resolved* — Q3; SC1 now names the fields that must match and requires the diff to
  be asserted with `source` deleted.

#### Important

- **[I3] Phase 3 delegated a decision rather than describing work.** "Decide and implement the marker"
  is not a phase; it is the absence of one. *Resolved* — see C1.

- **[I4] The feature was unreachable in this repo on merge.** The roadmap's `PHASE 4 — maintenance
  backlog` currently holds an actionable `T65` row, and its preamble reads "T65 exists to remove the
  need for this phase to be hand-maintained at all." Under roadmap precedence — which this task
  correctly insists on — the fallback cannot fire while any Phase 4 row is actionable. The task never
  mentioned Phase 4. As written, T65 would merge, pass every one of its own success criteria, and change
  nothing observable until someone independently remembered to archive the phase. *Resolved* — Q5; new
  Phase 6, and SC11 requires a live `--dry-run` in this repo to select from a registry.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **[I1/I4 above also count here]** — the Overview/description wording ("no phase holds an actionable
  row") is what made C2 ambiguous, and both were corrected together.

#### Optional

- **[O2] Files Summary was incomplete.** Missing the roadmap, `roadmap-history.md`, `task-registry.md`,
  the unit fixtures directory, and a note that
  `evals/develop-next/protocol/skill-shape.test.mjs:165` asserts the closed set of stop reasons handled
  in `SKILL.md`. The last one matters: it constrains the implementation to add **no new stop reason**,
  which is consistent with the chosen design but was nowhere stated. *Resolved* — all five added, the
  protocol-test constraint noted inline in Phase 4.

### Verified-correct, worth recording

The motivation's factual claims were checked against git history and hold, with one temporal
correction. `bug.2` was filed 2026-08-29 with `status: new` and *was* invisible to the selector that
day. It has since been fixed and closed (PR #279, `6bfc65a`), and the `B2` roadmap row is now `[x]`.
The document stated this in the present tense, which had gone stale within hours of being written.

The correction strengthens the argument rather than weakening it, and the document now says so: the bug
became visible only because a human hand-added Phase 4 and hand-wrote a `B2` row into it. The gap did
not close — someone performed the transcription step this task removes, once, manually. That is better
evidence than the original framing.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND

The original Risk Assessment was better than most: it named the speculative-task risk as High/High and
put the mitigation in scope rather than deferring it. Three gaps.

### Issues

#### Important

- **[I6] The highest-impact risk was absent.** "The fallback becomes a way to scan past a human gate"
  (C2) was not in the table. *Resolved* — added at Low/**High**, with the note that it would be hardest
  to detect in production because the loop would look like it was working.

- **[I7] Registry drift was rated Medium likelihood; it is present.** Rows 62–64 of
  `task-registry.md` read `draft` while all three documents read `accepted`. Without Phase 2's
  frontmatter check, those three shipped tasks would be the fallback's first three candidates on merge.
  *Resolved* — raised to High, and the live drift documented in Technical Background as evidence rather
  than hypothesis.

- **[I8] The Rollback Plan was incomplete after Phase 6.** "No roadmap edits to undo" stopped being
  true once Phase 6 was added: reverting `select-next.mjs` alone leaves the roadmap with no Phase 4
  *and* no fallback, so an empty frontier silently reverts to `roadmap-complete` — the original bug,
  reintroduced by the rollback. *Resolved* — the revert now names the roadmap restore from
  `roadmap-history.md`, and explicitly says rows 62–64 must **not** be reverted (they are correct
  independently of this task).

---

## 6. Mermaid Diagrams

No diagrams present. Not flagged: the branching logic is a single insertion point in a linear return
sequence, and the new Technical Background tables carry the data shape (two lifecycles, two registries)
more precisely than an ER or flowchart would. A diagram here would restate the Implementation Plan.

---

## Summary of Recommendations

### Must Fix (Critical) — 3 issues

1. **[C1]** Replace the non-existent `deferred` opt-out with the document-status eligibility floor. ✅
2. **[C2]** Pin the fallback to the `roadmap-complete` return only; enumerate the four stops it must not
   pre-empt; assert with one test each. ✅
3. **[C3]** Resolve SC1 vs `item.source`. ✅

### Should Fix (Important) — 5 issues

4. **[I1]** Split the bug and task status vocabularies. ✅
5. **[I2]** Correct the `--dry-run` / `--lint` split. ✅
6. **[I4]** Add Phase 6 — archive roadmap `PHASE 4`, correct registry rows 62–64. ✅
7. **[I5]** Create and link the tracker issue. ✅ (#280)
8. **[I6–I8]** Risk table: add the human-gate risk, raise drift to High, complete the rollback. ✅

### Consider (Optional) — 2 items

9. **[O1]** Effort 8h → 10h. ✅
10. **[O2]** Complete the Files Summary; note the protocol-test stop-reason constraint. ✅

---

## Implementation Readiness Assessment

**Score:** 9/10 (as submitted: 6/10)

| Dimension | As submitted | Post-fix |
| --- | --- | --- |
| Template Compliance | 9/10 | 10/10 |
| Technical Accuracy | 6/10 | 9/10 |
| Implementation Clarity | 5/10 | 9/10 |
| Consistency | 5/10 | 9/10 |
| Risk Management | 7/10 | 9/10 |

**Confidence Level for Successful Implementation:** High

**Justification:** The design was sound throughout — every critical finding was a description defect,
not a design defect, and each was resolved by writing down the decision the document had already
implied. The one point withheld is for Phase 6's coupling: the task now edits the roadmap it also reads,
which is correct but means the merge order matters (archive after the drift test is green).

---

## Next Steps

Task is ready for implementation. In order:

1. Phase 1–2 first, and write the SC9 stop-precedence tests **before** the fallback code — they are the
   guard against C2, and they are cheap to write against the existing fixtures.
2. Phase 6 last, after the drift test is green, so the test is written against real drift.
3. Run `npm run bundle` before commit — `select-next.mjs` and `roadmap-selection.md` both ship into
   `.agents/skills/`.
4. Expect `evals/develop-next/protocol/skill-shape.test.mjs` to stay green unchanged; if it goes red, a
   new stop reason was added and the design was widened without a decision.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-08-29
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md`
- **Sources consulted:** `skills/develop-next/scripts/select-next.mjs`,
  `skills/develop-next/references/roadmap-selection.md`, `skills/develop-next/SKILL.md`,
  `docs/development/project-completion-roadmap.md`, `docs/bugs/bug-registry.md`,
  `docs/tasks/task-registry.md`, `docs/standards/bug-documents.md`,
  `shared/resources/document-status-lifecycle.md`,
  `evals/develop-next/protocol/skill-shape.test.mjs`, git history (`65d635c`, `6bfc65a`, `c5d4573`)
- **Branch:** `feature/task.65.registry-aware-selection` (base `develop`)
