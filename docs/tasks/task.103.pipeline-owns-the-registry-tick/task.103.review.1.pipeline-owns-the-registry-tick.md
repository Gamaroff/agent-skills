# Task Review Report: Task 103 - Nothing updates the task-registry row after a task is accepted

**Reviewed:** 2026-09-10
**Review Depth:** Standard
**Task Status:** Draft (at review start) → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-09-10

---

## Executive Summary

The task is unusually well-argued for a draft: its factual claims about the repository all verify, it
names its own decision explicitly rather than pre-empting it, and it is careful to state what the
defect is *not* (a loop-stalling bug). The defects were structural rather than substantive — two
mandatory template sections were absent, and the Implementation Plan named no file paths, which in
this repository is load-bearing because `npm test` enumerates per-directory globs by hand.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — pipeline run (`/develop-next` → `/develop-task`), all
review-task prompts auto-answered per the develop-pipeline autonomous defaults.
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `develop-task` pipeline under the `/develop-next` AUTONOMOUS RUN
directive. No `AskUserQuestion` calls were made. The decisions taken on the user's behalf:

| Gate | Auto-answer | Source |
| :--- | :--- | :--- |
| Step 0 output format | Comprehensive report | `develop-pipeline-autonomous-defaults.md` — pipeline requires a co-located report |
| Step 0a branch setup | Auto-skipped — already on `feature/task.103.*` | review-task Step 0a.3 |
| Step 2 check 5 tracker sync | **Sync to GitHub** | Not in the defaults table. Decided from the corpus: 5 of the last 6 tasks (97, 98, 100, 101, 102) carry `github_issue`, and the develop pipeline's own tracker signalling is inert without one. Recorded here because it created a remote object. |
| Step 8.5 apply fixes | Yes, apply all critical + important | review-task Step 8.5 pipeline note |
| Step 9 status update | Yes, fixes complete | review-task Step 9 pipeline note |

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND → fixed

The task carried 10 numbered sections against the template's 11-section mandatory contract, with one
section (`## 4. The decision this task must make`) that is not in the template at all. Two mandatory
sections were missing outright.

### Issues

#### Important

- **[Important]** `## 3. Technical Background` absent. The current-vs-target picture — who writes the
  registry today, and what each candidate owner would change — was real but scattered across § 1 and
  the ad-hoc § 4. **Fixed**: added § 3 with a `### Current` ownership table (now carrying the verified
  line count and reference count) and a `### Target` subsection that absorbs the former § 4 decision
  table verbatim. Nothing was deleted; the numbered-section count went from 10 to 11 and now matches
  the contract without an extra unnumbered section.
- **[Important]** `## 7. Files Summary` absent. No file was named anywhere in the document, so the
  rubric's `files_touched` signal read zero and a developer could not tell where Phase 1 lands.
  **Fixed**: added § 7 with Add / Modify / Modify-only-if-a-write / Delete subsections, plus the
  `shared/resources/` vs generated `references/` warning.

Renumbering § 3–§ 10 required repairing 12 `§ N` cross-references; all were updated in the same edit
and re-verified by grep.

#### Optional

- **[Optional]** § 5 Breaking Changes ended `— see § 8`, which pointed at Success Criteria while the
  sentence describes a risk. Genuinely ambiguous between § 8 and § 9 in the old numbering.
  **Fixed**: rewritten to name both targets explicitly — `§ 9 criterion 6` and `§ 10`.

### Checks that passed

| Check | Result |
| :--- | :--- |
| File naming (`task.{n}.{name}.md`, dots structural) | PASS |
| OKF frontmatter (`type`, `description`, `tags` list, `updated`) | PASS — `type: task` present |
| Placeholder scan (`[TBD]`, `[TODO]`, `???`) | PASS — none |
| Stakeholder Sign-off | Not checked — `sign-off` absent from `skills-config.yaml` (defaults to disabled) |
| Change Log (check 4b) | PASS — section present, four canonical columns, one row; enforcement `advisory` |
| Tracker card preflight (`--check-card`) | PASS before and after the edits — `ok: true`, 0 findings, 3 blocks resolved |

The preflight's `+N more` counts are informational: a board reader sees 2 fewer Overview sentences
and (after criterion 9 was added) 4 of the 9 success criteria omitted behind a link.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every factual claim in the document was checked against the tree rather than accepted:

| Claim | Verification | Result |
| :--- | :--- | :--- |
| `finalise` is 1783 lines with zero registry references | `wc -l skills/finalise/SKILL.md` → 1783; `grep -c -i task-registry` → 0 | ✅ exact |
| `create-task` writes the row; `develop-next` reads it | `grep -rl task-registry skills/` → the only functional hits are `create-task/SKILL.md`, `develop-next/{SKILL.md,references/roadmap-selection.md,scripts/select-next.mjs}` (the remaining hits are `open-knowledge-format.md` copies and epic templates) | ✅ |
| No skill updates the row after creation | Same grep — no write site outside `create-task` | ✅ |
| The standard was corrected in the same change | `docs/standards/task-registry.md` now says "Tick the row by hand" and explicitly disclaims `finalise` | ✅ |
| Selector judges eligibility on document frontmatter, not the row | `select-next.mjs` emits `registryFrontier.passedOver[].documentStatus` as the rejection reason | ✅ — confirmed live in this run's own selection output |
| The drift is invisible to the machinery | Follows from the above | ✅ |

**Codebase scan (already-implemented check):** no drift check exists. `grep -rl task-registry` over
`evals/`, `shared/resources/tests/` and `scripts/` returns `evals/develop-next/unit/select-next.test.mjs`
(tests the selector's registry *parsing*, not row/document agreement),
`evals/shared/tests/document-status-lifecycle-corpus.test.mjs` (validates the registry file's own status
vocabulary against the lifecycle, not against the documents) and `scripts/setup-consumer.sh` (copies the
file). **`implementation_status: not-implemented`** — the task is not redundant.

**Architecture alignment:** no drift. The proposed test destination sits inside an existing globbed
suite directory and the proposed writes target existing pipeline step files.

> Both pre-pass axes were established inline rather than by dispatching the two Explore subagents
> that Phase 1.5 specifies. Recorded as a deviation in the implementation report's Decisions Log,
> with the reason and the substitute evidence.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND → fixed

### Issues

#### Important

- **[Important]** No phase named a file. Phase 1 said only "a test asserting…". In this repository that
  is not a stylistic gap: `package.json`'s `test` script lists per-directory globs by hand, so a suite
  written into an unlisted directory runs nowhere and reports nothing — a failure the repository has
  already recorded. **Fixed**: Phase 1 now names
  `evals/shared/tests/task-registry-drift.test.mjs`, states both directions of the assertion, and
  carries an explicit instruction to *verify* the glob rather than assume it.
- **[Important]** Phase 2 said "measure … and report" with no destination, and success criterion 8
  requires the result to be reported. A criterion whose evidence has no named home is not verifiable.
  **Fixed**: Phase 2 now specifies a one-off script (not a committed test) and a named
  "Sibling registry measurement" heading in the implementation report. Phase 3 likewise gained a named
  "Registry-tick ownership decision" heading.

Phase 4 remains deliberately conditional ("if it is a write") — that is correct, not vague: the § 3
decision is the task's own deliverable and pre-specifying its outcome would defeat the point.

### Effort estimate

`estimated_effort_hours: 4`. Rubric recomputed against the current document: base 2 + 4 (8 success
criteria, capped) + 0.5 (5 plan phases) + 1 (medium risk) + 0 (files ≤ 5) + 0 (no integration) = 7.5 →
snaps to **8h**. Divergence is `|4−8| / 8 = 0.50`, which does **not** exceed the 0.5 threshold, so no
finding is raised. Recorded because the estimate sits exactly on the boundary and the true cost
depends on whether § 3 chooses a write.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview, Motivation and Implementation Plan agree. § 1's ownership table is the same claim § 3
  `### Current` now expands.
- § 3 Scope's exclusions (bug/epic registries, roadmap tick, re-ticking the 17 rows) are each
  discharged: the first by Phase 2, the second by an explicit disclaimer, the third by "Already done".
- Testing Strategy covers all four failure modes the plan can produce: mutation proof, non-vacuity
  floor, cancelled/in-flight exclusions, lite mode, and story runs. This is stronger than typical.
- Success criteria are measurable and map 1:1 onto § 8's tests, with the conditional criterion 6
  correctly gated on "if a write is implemented".
- **One gap, fixed**: nothing asserted that the check *executes*. Criteria 1–3 would all be satisfied
  by a correct test file that no runner ever invokes — precisely the silent-pass this repository has
  seen. **Added criterion 9**: the check must be evidenced by its assertion count appearing in the run
  output, not by its presence on disk.

**Scope and complexity**: 5 phases, one technical area, ~4–8h. Well inside the single-task envelope;
no split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk is correctly rated Medium and correctly *located* — "in the write, not the check". All five rows
of the risk table have concrete mitigations, and two of them (lite mode skipping the side effect;
the write landing on a story run) are backed by named tests rather than intent. The rollback plan is
the strongest part of the document: "remove the write; keep the check" leaves the repository strictly
better off than before the task, which is a genuine independent-value argument rather than a formality.

No unidentified risks found. One worth noting as already-handled: automation writing a *wrong* row is
called out and mitigated by landing the check before the write.

### Mermaid diagrams

None present. **Not recommended** — the ownership relation is a 4-row table and the decision is a
3-row table; both are clearer as tables than as a diagram, and a flowchart of five sequential phases
would restate § 6 verbatim (which § 6.5 explicitly says to avoid).

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 4 issues

1. ✅ **Fixed** — Add the missing `## 3. Technical Background` mandatory section.
2. ✅ **Fixed** — Add the missing `## 7. Files Summary` mandatory section.
3. ✅ **Fixed** — Name file paths in Phase 1 and a report destination in Phases 2–3.
4. ✅ **Fixed** — Link a tracker issue (`github_issue: 374`), matching recent corpus convention.

### Consider (Optional) — 1 item

1. ✅ **Fixed** — Disambiguate the `— see § 8` cross-reference in § 5 Breaking Changes.

**Fixes applied: 5 / Skipped (needs your input): 0**

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (two mandatory sections were absent; both added)
- Technical Accuracy: 10/10 (every claim verified against the tree; zero hallucinations)
- Implementation Clarity: 8/10 (Phase 4 is intentionally conditional on the § 3 decision)
- Consistency: 9/10 (one unasserted property — that the check runs — now criterion 9)
- Risk Management: 10/10 (risk correctly located, rollback independently valuable)

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; all four important issues were structural and have been fixed
in place. The task's central risk is that an implementer skips § 3 and jumps to automation — the
document guards against that explicitly, and Phase 1 is deliberately ordered to land value regardless
of which owner is chosen.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Land Phase 1 first and **prove it** — revert one swept registry row to `planned`, confirm the new
   test goes red, restore the row, confirm green. A check that cannot fail on its motivating defect
   is not a check.
2. Confirm the new suite actually executes (criterion 9) before treating Phase 1 as done.
3. Run Phase 2's measurement and report the counts before widening scope to the sibling registries.
4. Make the § 3 decision explicitly in the implementation report, with the rejected options and why,
   before writing any Phase 4 code.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, standard depth, non-interactive pipeline mode)
- **Review Date:** 2026-09-10
- **Task File:** `docs/tasks/task.103.pipeline-owns-the-registry-tick/task.103.pipeline-owns-the-registry-tick.md`
- **Invoked from:** `/develop-next` → `/develop-task` Step 2/8
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`; `docs/standards/task-registry.md`; `package.json` test globs
- **Tools run:** `sync-jira-task.js --check-card` (before and after), corpus greps over `skills/`, `evals/`, `shared/resources/tests/`, `scripts/`
