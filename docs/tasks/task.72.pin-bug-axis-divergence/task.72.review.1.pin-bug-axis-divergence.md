# Task Review Report: Task 72 — Pin the bug-axis divergence exactly instead of asserting it loosely

**Reviewed:** 2026-09-01
**Review Depth:** Standard
**Task Status:** Planned (at review start)
**Overall Assessment:** EXCELLENT

> **Implementation Status**: ✅ All 2 recommendations implemented — 2026-09-01

---

## Executive Summary

Task 72 is an unusually well-sourced document: every technical claim in §3 was checked against the live files and each one matched verbatim, including both dispatcher quotations and the measured status sets. The task's central argument — that `develop-bug`'s two extra statuses are *resume affordances* rather than claims that work is available, so the task-axis equality rule does not transfer — is correct and is the right conclusion.

One real defect was found, and it is in the verification plan rather than the design: **mutation 3 cannot prove the thing it says it proves.** One trivial line-reference drift was also noted.

**Critical Issues:** 0 🚨
**Important Issues:** 1 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked (autonomous pipeline run — no ambiguity required operator input)
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran inside the `/develop-task` pipeline (Step 2/8) as an autonomous run. No clarifying questions were raised: the document left no ambiguity that would have changed the implementation, and every technical claim was independently verifiable against the repository, so verification replaced interrogation.

Pipeline auto-answers recorded:
- Step 0 output format: **Comprehensive report**
- Step 8.5: **Yes, apply all critical + important fixes**
- Step 9: **Yes, fixes complete**

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes.

- **Filename**: `task.72.pin-bug-axis-divergence.md` — dots as structural separators, hyphens within the descriptive name. ✅
- **OKF frontmatter**: `type: task` present and non-empty ✅; `description` present ✅; `tags` is a YAML list ✅; `updated` present ✅.
- **Metadata**: status `planned`, priority `Medium`, `estimated_effort_hours: 4`, `depends_on: task.71`, `risk_level: low` — all populated.
- **Placeholders**: none. No `[TBD]`, `[TODO]`, `???` or unfilled stubs.
- **Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, per spec.
- **Change Log**: `change-log.enabled` defaults true. Section present with the four canonical columns and one row. Currency is **not** flagged: the rule fires only when `status` has advanced past `planned`, and it has not.
- **Tracker linkage**: `github_issue: 287` → verified OPEN via `gh issue view`. Body cross-reference `[#287](https://github.com/Gamaroff/agent-skills/issues/287)` matches frontmatter exactly. ✅
- **Tracker card preflight**: `sync-jira-task.js --check-card` exits 0; every card block resolves (`Summary` prose, `Success Criteria` list, `Breaking Changes` prose). No `missing`, `empty` or `no-body` findings. The `+N more` counts (4, 4, 3) are informational — the builder caps the card and announces each omission.

### Issues
None.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every technical claim was verified against the working tree. This is the strongest part of the document:

| Claim in task | Verified against | Result |
|---|---|---|
| `BUG_ELIGIBLE_STATUSES` is `{new, reopened}` | `skills/develop-next/scripts/select-next.mjs:114` | ✅ exact |
| `develop-bug` proceeds on `{new, reopened, in-progress, ready-for-qa}` | `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md` status-guard table | ✅ exact |
| `16/H1` bug half is a `⊆` loop over `BUG_ELIGIBLE_STATUSES` | `evals/develop-next/unit/select-next.test.mjs:1951-1963` | ✅ quoted verbatim |
| The anti-vacuity guard is `proceed.has("new") && proceed.has("reopened")` | same file, `:1953-1956` | ✅ exact |
| `in-progress` row reads *"Proceed — a prior run may have started; resume-aware."* | dispatcher table | ✅ exact |
| `ready-for-qa` row reads *"Proceed directly toward Steps 5–6 verification if a fix already exists; else re-verify the fix record."* | dispatcher table | ✅ exact |
| `develop-task` `Draft` row promises Step 2 will validate and promote | `develop-pipeline-step-0-resolve-and-prepare.md` Phase 0c | ✅ exact |
| `select-next.mjs` describes the bug axis as keeping "the weaker `⊆`" | `select-next.mjs:108` (and the related block at `:69`) | ✅ both blocks exist |
| `roadmap-selection.md` bug row says `⊆ — diverges by in-progress, ready-for-qa` | `roadmap-selection.md:78` | ✅ exact |
| Task 71 §4 deferred the bug axis | `task.71` document | ✅ present, and task.71 is `status: accepted` |

The `proceedStatuses()` reuse instruction is correct — the helper exists in the same test file and already carries its own `sawRow` guard.

### Issues
None.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Three phases, each with an explicit risk level, an explicit file list, concrete checkboxed changes, and stated dependencies (Phase 2 → Phase 1, Phase 3 → Phases 1–2). File changes are specific rather than vague — the target assertion is given as literal code in §3, so there is no guesswork about what "pin the gap" means.

`estimated_effort_hours: 4` is consistent with the rubric for 9 success criteria, 11 plan tasks and low risk. No divergence flag.

### Issues
None. (§7's listing of `select-next.mjs` under both "Files to Modify" and "Files NOT Modified" is not a contradiction — it deliberately separates the *comment* from the `BUG_ELIGIBLE_STATUSES` *constant*, and says so on both lines.)

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

- **Mutation 3 cannot prove what it claims to prove.** §8 "Mutation Proving" reads:

  > Delete `new` from `BUG_ELIGIBLE_STATUSES` → the anti-vacuity guard or the gap assertion → **red** (proves the guard survived Phase 1)

  The anti-vacuity guard is `assert.ok(proceed.has("new") && proceed.has("reopened"))`, and `proceed` is derived **solely** from parsing `STEP0_BUG` — the `develop-bug` step-0 document (`select-next.test.mjs:1952`). It never reads `BUG_ELIGIBLE_STATUSES`. So deleting `new` from that constant is structurally incapable of exercising the guard: it changes only the gap computation, making the gap `{in-progress, ready-for-qa, new}` and failing the `deepStrictEqual`.

  The mutation therefore goes red — but via the gap assertion, proving a *third direction of gap sensitivity*, not guard survival. To actually prove the guard survived Phase 1, the mutation must corrupt the **parse**: alter a row in the dispatcher's status table (e.g. rename the `new` row) so `proceedStatuses()` returns the wrong rows. That is precisely the case §3 says the guard exists for — *"the guard also catches a parse that returns the wrong rows, which an empty-check would not"* — and it is the case §8's own Unit Tests bullet already names (*"The anti-vacuity guard still fails on a parse that returns the wrong rows"*).

  **Why this matters here specifically**: this repository's recurring failure mode is a mutation proof that confirms an assertion other than the one it names, leaving the named assertion unheld. The task's own §10 Risk 2 calls vacuity "this repo's recurring failure mode" and nominates mutation 3 as its mitigation — so the mismapping disarms the document's stated defence against its own top risk.

  **Fix**: split into two mutations — keep the `BUG_ELIGIBLE_STATUSES` deletion (relabelled as gap sensitivity in the shrink direction) and add a dispatcher-table corruption that targets the guard.

#### Optional

- **Line reference drift.** §3 and §References cite `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md:58-64`; the status-guard table now sits at lines 57–63. The quoted rows are correct — only the numeric anchor is one off.

### Testing Completeness

Unit coverage is adequate and correctly scoped. §8's decision to write **no** integration test is itself a well-argued finding rather than a gap: the change is test-only, `select-next.mjs` behaviour is byte-identical, so an integration test would pass identically before and after — the vacuous shape task 71 already called out.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Three risks identified, each with probability, impact and mitigation. Risk 2 (the exact assertion is written but vacuous) correctly identifies the highest-impact failure mode and is honest that it is this repo's recurring one — the Important finding above is that its nominated mitigation does not fully land as written.

Rollback is realistic and proportionate: restore the subset loop, one test file, no source change; `BUG_ELIGIBLE_STATUSES` is never modified so there is nothing else to revert. The Forward Fix section correctly frames a legitimate gap change as the mechanism working rather than a rollback trigger.

### Issues
None beyond the mutation mapping already recorded in §4.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues
None.

### Should Fix (Important) — 1 issue

1. **Re-map mutation 3 in §8.** Keep the `BUG_ELIGIBLE_STATUSES` deletion as a gap-shrink proof, and add a separate mutation that corrupts the dispatcher's status table so `proceedStatuses()` returns wrong rows — that is the only mutation that can prove the anti-vacuity guard survived Phase 1.

### Consider (Optional) — 1 item

1. Correct the `develop-bug-step-0-resolve-bug.md` line anchor from `:58-64` to `:57-63`.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 10/10
- Implementation Clarity: 9/10
- Consistency: 8/10 — mutation 3 proves a different assertion than the one it names
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Zero critical issues, every technical claim independently verified against the live files, and a design conclusion (pin, do not widen) that is correct and well-argued. The single Important finding is a verification-plan correction applied during this review, not a blocker.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow the three phases in order — Phase 1 (pin), Phase 2 (rationale), Phase 3 (verify).
2. Treat the corrected §8 mutation list as the verification contract: **four** mutations now, and the guard mutation must corrupt the dispatcher table, not the constant.
3. Leave `BUG_ELIGIBLE_STATUSES` byte-identical — §9's first functional criterion is the check that this task did the right thing.
4. Refer to the Rollback Plan if the assertion proves brittle against a legitimate dispatcher change.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, `/develop-task` Step 2/8)
- **Review Date:** 2026-09-01
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.72.pin-bug-axis-divergence/task.72.pin-bug-axis-divergence.md`
- **Files Consulted:** `evals/develop-next/unit/select-next.test.mjs`, `skills/develop-next/scripts/select-next.mjs`, `skills/develop-next/references/roadmap-selection.md`, `skills/develop-bug/references/develop-bug-step-0-resolve-bug.md`, `.agents/skills/develop-task/references/develop-pipeline-step-0-resolve-and-prepare.md`, `skills-config.yaml`
- **Verification performed:** tracker card preflight (exit 0), GitHub issue existence (#287 OPEN), 10 technical claims checked verbatim against source
