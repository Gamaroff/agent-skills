# Task Review Report: Task 100 - the false-RED mirror in mutation-proving

**Reviewed:** 2026-09-10
**Review Depth:** Standard
**Task Status:** Draft → Ready for Development (promoted by this review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-09-10

---

## Executive Summary

Task 100 is a well-evidenced documentation task: it names a real gap in `shared/resources/mutation-proving.md` (the file handles the false GREEN and says nothing about the false RED), backs it with five recorded probe readings from two independent runs, and identifies its own anti-vacuity test (row 5). Every technical claim it makes about the target file was verified against the file and holds. Two template-compliance gaps were found and fixed; no hallucinations, no scope or consistency problems.

**Critical Issues:** 0 🚨
**Important Issues:** 2 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`develop-next` → `develop-task` Step 2); all gates auto-answered per the pipeline's documented defaults
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively inside the `develop-task` pipeline. No `AskUserQuestion` calls were made; the following gates were auto-answered per `develop-pipeline-autonomous-defaults.md` and the `develop-next` autonomous directive:

| Gate | Auto-answer | Rationale |
|---|---|---|
| Step 0 — output format | Comprehensive report | Required for the pipeline audit trail |
| Step 2 check 5 — tracker sync | Sync to GitHub | Recommended option; dedup search returned zero matches for `[Task 100]` |
| Step 8.5 — apply fixes | Yes, apply all critical + important | Pipeline needs the task corrected before Step 3 `/develop` |
| Step 9 — update status | Yes, fixes complete | Outcome is READY TO IMPLEMENT; promote `draft → ready-for-development` |

No question was suppressed that would have changed the outcome: both findings had a single correct fix (add the missing section; create the missing issue), neither of which is a judgement call the author would decide differently.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (both fixed)

### Issues

#### Important

- **Missing mandatory section `## 3. Technical Background`.** The task ran `## 1. Overview`, `## 2. Motivation`, `## 3. Scope` … `## 10. Rollback Plan` — ten numbered sections where the template contract has eleven, with §3–§10 each carrying the number of the section below it.
  - **Location:** section headings throughout
  - **Impact:** Not CI-breaking — `countMandatorySections()` (`tests/skill-protocol.test.js`) asserts the count against the *template*, not against authored documents — but the section it omits is the one a reader needs most here. The task's whole argument is about the internal shape of an existing file, and that shape appeared only in scattered prose.
  - **Severity rationale:** Important rather than Critical. The Implementation Plan and Testing Strategy — the two sections Step 2 names as Critical when absent — are both present and specific.
- **No `github_issue:` in frontmatter.** Task was authored without tracker linkage.
  - **Impact:** the pipeline's Step 4/5/7 tracker comments would all silently no-op, and the board would never show the work.

#### Optional

- Implementation Plan uses a `Phase 2b` label rather than four sequential phases. Deliberate — 2b is the row-5 check and belongs beside 2 — and clearer than renumbering. No change recommended.

### Verified clean

- File naming: `task.100.mutation-proving-false-red.md` ✅ dots as structural separators, hyphens within the name.
- OKF frontmatter: `type: task` ✅ non-empty, `description` ✅ present, `tags` ✅ a YAML list, `updated` ✅ present.
- Metadata: `status`, `priority`, `risk_level`, `category`, `estimated_effort_hours: 2` all present.
- No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere in the document.
- **Change Log** present with the four canonical columns and two rows; currency check does not fire (status had not advanced past `planned`).
- **Stakeholder Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as specified.
- **Tracker card preflight** (`sync-jira-task.js --check-card`): exit 0, zero findings. All three card blocks resolve — Summary (prose, 318 chars, 1 paragraph omitted with a `+N more` link), Success Criteria (list, 683 chars, 0 omitted), Breaking Changes (prose, 22 chars, 0 omitted).

### Recommendations — applied

1. **Added `## 3. Technical Background`** and renumbered §4–§11. The new section states the target file's current shape (220 lines, seven H2 sections; the two that carry the verdict apparatus), the target shape (one added H2 mirroring *"When the proof does not go red"*), and the distribution constraint (bundled into six skills; edit the source, never a `references/` copy).
2. **Created and linked GitHub issue [#368](https://github.com/Gamaroff/agent-skills/issues/368)** — dedup search first (zero matches), then create + board add + Priority P2 + `github_issue: 368` in frontmatter + body cross-reference link. The board's `Estimate` field does not exist, so the estimate was not applied (warned, non-blocking).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every claim the task makes about `shared/resources/mutation-proving.md` was checked against the file:

| Claim in task | Verified |
|---|---|
| "Step 2 requires diffing against a pre-mutation copy before believing a survival" | ✅ §The procedure step 2, with the `cp` / `diff` snippet |
| "with the observed case (a literal `…` where the source had `...`) recorded" | ✅ recorded verbatim in step 2's prose |
| "The *'When the proof does not go red'* table covers the three reasons a mutant survives" | ✅ three rows: vacuous test, redundant source, wrong premise |
| "the six shapes" section exists and is out of scope | ✅ `## The six shapes vacuity takes` |
| "`## Do not claim it unless you did it` — unchanged" | ✅ present as the file's last H2 |
| Files Summary: `skills/*/references/mutation-proving.md` — regenerated | ✅ six bundled copies: `develop`, `double-check`, `finalise`, `qa-story`, `qa-task`, `review-security` |
| References cite agent-skills `task.95.implementation.1.*` for row 5 | ✅ file exists at that path |

The tinker-city `task.103.qa.{3,4}` citations are in a different repository and cannot be verified from here. That is expected for an external evidence citation and is not a finding — the task presents them as the provenance of rows 1–4, not as claims about this repo.

**Self-check on the added section.** The prose written in Step 8.5 was itself verified before being left in place: an initial draft said "eight H2 sections" (`grep -c '^## '` returns **7**) and named the three-row table's rows as "vacuous test, wrong invariant broken, mutation never applied" (the actual rows are *vacuous test*, *redundant source*, *wrong premise*). Both were corrected. Noted here because writing an unverified claim into a task about unverified claims is the exact failure the task documents.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

- Four phases, each with a concrete deliverable: the section + table (1), the three mechanical checks (2), the row-5 judgement check (2b), `npm run bundle` + commit the regenerated `references/` (3).
- Files Summary names the source file and the regenerated copies. Both verified to exist.
- Dependencies are implicit but unambiguous — 1 → 2 → 2b → 3 is the only possible order, and Phase 3 (bundle) must be last by construction.
- **Effort estimate:** `estimated_effort_hours: 2` present. Rubric recompute (5 success criteria, 4 plan tasks, low risk, prose-only change) lands at ~2h — no divergence, no finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

- Overview → Scope → Implementation Plan → Success Criteria all describe the same deliverable: one section, four table rows, three mechanical checks plus one judgement.
- Success Criteria are measurable and each maps to a plan phase. Criterion 4 (row 5 covered explicitly *and* stated to pass the applied-check) is the discriminating one and is stated as such in §8 Testing Strategy.
- **Testing Strategy is appropriate for prose**: a review against the five recorded readings, with a stated anti-vacuity test (a draft that catches rows 1–2 but not row 5 is not done). This is the right shape for a document change — there is no code to test, and the task correctly does not invent one.
- **Rollback plan** covers the change completely (delete the section, re-bundle) because the change is purely additive.
- Scope is one file plus its generated copies — well under any splitting threshold.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- Risk is correctly assessed as **Low**: additive prose, no behaviour, no breaking changes.
- The stated failure mode — "the section is ignored" — is the honest one for a documentation change, and the mitigation (placement directly beside the mirror question) is the right lever.
- One risk the document does not name, and does not need to as a blocker: **Phase 3 is the load-bearing step**. An edit to `shared/resources/mutation-proving.md` that is not followed by `npm run bundle` leaves six skills shipping the old text, and the next bundle run silently reverts any edit made to a `references/` copy instead. Phase 3 already says to run it; the added §3 Technical Background now states the constraint explicitly so a developer meets it before Phase 1 rather than at the end.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 2 issues

1. ✅ **Applied** — Add `## 3. Technical Background`; renumber §4–§11 to restore the 11-section contract.
2. ✅ **Applied** — Create and link the GitHub issue (#368); write `github_issue` to frontmatter and a body cross-reference link.

### Consider (Optional) - 1 item

1. `Phase 2b` labelling — reviewed and deliberately kept. No action.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 8/10 (two gaps, both fixed; card preflight clean)
- Technical Accuracy: 10/10 (every verifiable claim checked and held; zero hallucinations)
- Implementation Clarity: 9/10 (four phases, concrete files, unambiguous order)
- Consistency: 10/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; both Important findings were structural and are fixed. The task's evidence base — five readings across two independent runs — is unusually strong for a documentation change, and it supplies its own falsification test (row 5), which is what makes the deliverable checkable rather than merely plausible.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the plan phase by phase: section + table → three mechanical checks → row-5 judgement check → bundle.
2. Write the section in `shared/resources/mutation-proving.md` **only** — never in a `skills/*/references/` copy.
3. Verify against §9 criterion 4 before finishing: a draft that catches rows 1–2 but lets row 5 through is not done.
4. Run `npm run bundle` and commit the regenerated `references/` copies (Phase 3).

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, autonomous — `develop-next` → `develop-task` Step 2)
- **Review Date:** 2026-09-10
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.100.mutation-proving-false-red/task.100.mutation-proving-false-red.md`
- **Sources Consulted:** `shared/resources/mutation-proving.md`; `.claude/skills/review-task/resources/task-template.md`; `skills-config.yaml`; `tests/skill-protocol.test.js`; `docs/tasks/task.98.*` (template-conformance comparison); `docs/tasks/task.95.*` (cited evidence)
- **Pre-pass subagents:** not dispatched — session policy bars agent dispatch; both axes (architecture alignment, already-implemented scan) were covered inline by direct reads of the target file and its six bundled copies
