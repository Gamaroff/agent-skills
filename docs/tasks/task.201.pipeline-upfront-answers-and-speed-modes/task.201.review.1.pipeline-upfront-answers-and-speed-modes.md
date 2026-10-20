# Task Review Report: Task 201 - Pipeline up-front answers and speed modes

**Reviewed:** 2026-10-10
**Review Depth:** Standard
**Task Status:** Planned → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 8 critical + important recommendations implemented — 2026-10-10

---

## Executive Summary

The design is sound and the owner decisions are recorded, but eight Important issues would have
surfaced during development: an invented `/review-task --validate` mode, a config namespace that
collides with `tracker-workflow.yaml`'s `pipeline:`, a second freshness mechanism beside the existing
one, unlisted tests pinned on the directive literal, unlisted resume states, unlisted readers of the
Pipeline Progress table, a waiver rule that did not say it never masks `FAIL`, and criteria with no
named test (one only meetable after merge). All eight were fixed in the document.

**Critical Issues:** 0 🚨
**Important Issues:** 8 ⚠️
**Optional Improvements:** 4 💡

**User Clarifications:** 0 questions asked — autonomous run (dispatched by `/develop-next` → `/develop-task` Step 2); every decision below was taken by the reviewer and is logged
**Implementation Readiness:** 7/10 before fixes → 8/10 after
**Recommendation:** READY TO IMPLEMENT (after fixes)

---

## User Decisions & Clarifications

No operator was present. The question points were resolved autonomously, each toward the option that
changes least and keeps today's behaviour reachable:

- **QP1 (scope):** keep as one task — the five phases are ordered and individually shippable, and the
  roadmap has one row for it. No split.
- **QP2 (config namespace):** move `pipeline.defaultMode` / `pipeline.skippable` under the existing
  `develop:` block. The key name was not one of the three owner decisions; "policy only" was, and it
  is unchanged.
- **QP2 (`fast` and Step 2):** drop the `--validate` element rather than add a validate mode to
  `review-task` — adding a mode is new scope; Step 2's levers are reuse and `--skip review`.
- **QP3 (legacy review reports):** keep today's date verdict for reports without `reviewed_blob:`
  rather than "never reuse" — otherwise the Breaking Changes "None" claim is false for the `Planned` +
  current-report row added 2026-09-07.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking, References and Notes present. OKF `type` and
`description` present. `github_issue: 621` exists (OPEN) and the body link matches. Card preflight:
3 blocks resolve (`+N more` on Summary 4, Success Criteria 8, Breaking Changes 2). `doc-links.js`: 2
relative links resolve. Sign-off not enabled; Change Log current.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND (fixed)
**Hallucinations Detected:** 1 (Important, check 10)

Pre-pass B: `aligned`, axes checked: What this repo produces, SKILL.md authoring, File naming, Status
lifecycle, Cross-skill resources, Plan files, Registries, Validation before commit, Do not
(`prepass-axes.js` source: `architecture`). Pre-pass C: `not-implemented`.

#### Important

- **I1 — `pipeline.*` policy keys.** `skills-config.yaml` already has a `develop:` block for the
  develop pipelines (`develop.fastGateCommand`, configuration.md:100), and `pipeline:` is the name of
  `tracker-workflow.yaml`'s moment map. → keys renamed `develop.defaultMode` / `develop.skippable`.
- **I2 — `--mode fast` runs "Step 2 in `--validate` mode".** `/review-task` has no validate mode
  (`grep -n validate skills/review-task/SKILL.md` finds only the shared 0a.0 short-circuit);
  `develop-story` already runs `/review-story` validate-and-apply. The outcome is unreachable for
  `develop-task`. → `fast` no longer changes Step 2.
- **I3 — same-class mechanism (check 6).** Phase 3's blob rule would sit beside
  `review-report-freshness.js` (`classifyReviewReport`), which already decides the `Planned` skip by
  date. → Phase 3 extends that function; legacy reports keep the date verdict.
- **I4 — removed-literal sweep (check 15).** Replacing the directive breaks
  `evals/develop-next/protocol/skill-shape.test.mjs:162`, `evals/develop-batch/protocol/skill-shape.test.mjs:109`
  and `orchestrator-directive-branch-literal.test.mjs` (locates the directive by its opener). The
  branch-literal guard already exists (bug.18). `develop-batch`'s directive carries worktree,
  execution-resource and no-merge instructions that `--defaults` cannot replace. → tests listed; the
  directive stays, only its answer sentences go.

#### Optional

- **O1** — plan anchor `develop-batch:287-289` drifted to `296-310` after bug.18. Fixed.
- **O2** — Pre-pass B: ShellCheck, `validate:all`, `check:generated` not in criteria. → Code Quality now
  requires `npm run ci` green.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important

- **I5 — resume states (check 19).** "Persist answers; resume reads them back" listed no states. →
  five states listed (live lock; `--restore` from snapshot/claim keeps `answers`; legacy lock without
  the field; no lock; re-invocation flags disagreeing with persisted answers). Answers live in the
  pipeline lock, not `develop-next`'s run state.
- **I6 — Pipeline Progress readers (checks 16, 20).** "Each step doc that ticks its row" had no search,
  and `step-8-completion-checklist.test.mjs` reads `cells[4]`. → column appended last; readers listed
  with the grep that defines them; bug variant included.

#### Optional

- **O3** — `estimated_effort_hours: 24` is plausible for five phases; no change.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important

- **I7 — criteria classification (Step 6 check 4).** The consumer re-measurement can only be met after
  merge; most functional criteria named no test; the "dry pipeline run" integration test has no
  harness. → re-measurement moved to Notes, Deferred Work; a criterion → test table added; Phase 0
  behaviour held at the resolver, called from a fenced block.
- **I8 — waiver vs failure.** "Every skip writes WAIVED" did not say a `FAIL` stays `FAIL`, nor how the
  skip reaches `qa-gate`. → stated; carried by a directive like lite mode; verdict decided by a tested
  `gateFor`.

#### Optional

- **O4** — task is large (5 phases); kept as one task (QP1).

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Floor list, default-empty allow-list and WAIVED visibility cover the high risks; the owner accepted
self-approval. Rollback by policy (`develop.skippable: []`) is valid with the renamed key.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 8 issues — all applied

I1–I8 above.

### Consider (Optional) - 4 items

O1, O2 applied; O3, O4 no change.

---

## Implementation Readiness Assessment

**Score:** 8/10 (after fixes; 7/10 before)

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** Medium — broad surface (shared resources, five
skills, three tests to update), but every phase now names its tests.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; every Important finding was fixed in the document with the
least behaviour change.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous pipeline run)
- **Review Date:** 2026-10-10
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.201.pipeline-upfront-answers-and-speed-modes/task.201.pipeline-upfront-answers-and-speed-modes.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B), docs/reference/configuration.md
