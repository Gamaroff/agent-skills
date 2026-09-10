# Task Review Report: Task 98 — A per-file bundle-freshness assertion the regenerate-and-diff check cannot provide

**Reviewed:** 2026-09-09
**Review Depth:** Standard
**Task Status:** Draft (at review start) → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 recommendations implemented — 2026-09-09

---

## Executive Summary

Task 98 is an unusually well-sourced task: it inherits a real, recorded failure (task 86's `--check`
mode, five QA cycles, ~45 findings) and writes the residuals down rather than leaving them to be
re-discovered. Every technical claim in it was verified against the tree during this review and every
one held. The two substantive problems were both about *decidability*, not accuracy: Phase 1 offered
the implementer a scope fork that §4 and §9 had already closed, and one success criterion was pinned
to a file count that this task's own work can change.

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 1 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` → `/develop-task`
Step 2); all decisions taken per the documented auto-answer defaults and recorded below.
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

This review ran non-interactively inside the `develop-task` pipeline. The three questions this skill
would otherwise have asked were auto-answered from `develop-pipeline-autonomous-defaults.md` and the
`develop-next` autonomous directive:

| # | Question | Auto-answer | Basis |
|---|---|---|---|
| Q0 | Output format | Comprehensive report | Pipeline audit trail requires a file |
| Q1 | Tracker sync — no `github_issue` linked; create one? | Sync to GitHub | Pipeline default; dedup search returned zero matches first |
| Q2 | Apply fixes now? (Step 8.5) | Yes, apply all critical + important | Pipeline needs the task corrected before Step 3 |
| Q3 | Fixes complete — promote status? (Step 9) | Yes, fixes complete | Outcome is READY TO IMPLEMENT and no critical issues remain |

One decision was **made** rather than deferred, and is recorded here because it changes what gets
built — see Important #2.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND (resolved)

All 11 mandatory numbered sections are present (Overview, Motivation, Technical Background, Scope,
Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Success Criteria, Risk
Assessment, Rollback Plan), plus Change Log, Progress Tracking, References and Notes. No placeholders
(`[TBD]`, `[TODO]`, `???`) anywhere in the document.

Filename `task.98.bundle-freshness-check-mode.md` — dots as structural separators, hyphens within the
descriptive name. ✅

**OKF frontmatter conformance:** `type: task` present and non-empty ✅; `description` present ✅;
`tags` a YAML list ✅; `updated` present (≡ OKF `timestamp`) ✅.

**Sign-off:** `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, per
spec. Not a finding.

**Change Log (check 4b):** section present with the four canonical columns and one row. Status was
`draft` — not advanced past `planned` — so the currency heuristic does not fire. ✅

**Tracker card preflight (check 5a):** run against the live document —

```
node skills/sync-jira-task/scripts/sync-jira-task.js --file … --check-card --json
→ ok: true, findings: []
   Summary (prose, 410 chars, +4 omitted) · Success Criteria (list, 364 chars, +2 omitted)
   · Breaking Changes (prose, 132 chars, +1 omitted)
```

All three card blocks resolve. The `+N more` counts are reported here as information: a board reader
sees roughly the first four sentences of the Overview and five of the seven success criteria.

### Issues

#### Important
- **[Important]** No `github_issue:` in frontmatter — the task was authored by the task-86 split and
  never synced to a tracker. **Fixed** (see Recommendation 1).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every technical claim was verified against the working tree rather than accepted:

| Claim in the task | Verification | Result |
|---|---|---|
| `expected_bytes(src, name)` exists | `bundle_skill.py:156` | ✅ |
| `_within` exists | `bundle_skill.py:171` | ✅ |
| `source_backed_on_disk` exists | `bundle_skill.py:264` | ✅ |
| `declared_source` exists | `bundle_skill.py:324` | ✅ |
| `_looks_bundled` exists | `bundle_skill.py:343` | ✅ |
| `writable_copy` exists | `bundle_skill.py:395` | ✅ |
| `--check` mode is **not** in the merged bundler | grep for `--check` / class names → zero hits | ✅ (confirms the split) |
| `validate.yml` uses regenerate-and-diff | `.github/workflows/validate.yml` "Bundle freshness check" — `bundle_skill.py --all` then `git diff --quiet -- 'skills/*/references/*'` | ✅ |
| `evals/shared/tests/ci-gate-parity.test.mjs` exists | file present | ✅ |
| Task 86's five gates + three QA reports exist | `docs/tasks/task.86.bundle-transitive-refresh/` — gates 1–5, qa 1–3 | ✅ |

The claim that a checker built on `expected_bytes` "cannot drift from the bundler" is sound: it is the
single definition of the expected content, so a comparison against it is definitionally the same
transform the writer applies.

### Issues

None.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (resolved)

Four phases, each with a risk level and concrete checkboxes. Phases 2–4 are specific enough to execute
directly. Phase 1 was not.

### Issues

#### Important
- **[Important] Phase 1 was a decision, not a task, and the decision was already made elsewhere in the
  document.** It read: *"Decide deliberately whether to recover the prior implementation or write a
  smaller one… a narrower check covering ORPHANED and SYMLINK only may be worth more than a complete
  one."* But §4 In Scope names all seven classes as ones the check **must** distinguish, and §9 makes
  five of them success criteria. The narrow option therefore is not available without amending both —
  and the recover option is precisely what §2 Motivation argues against, since that implementation is
  the one that failed to converge. An unresolved fork at the head of the plan is worse in an
  autonomous run than in an attended one: there is no operator to settle it, so it gets settled
  implicitly by whoever writes the first line of code. **Fixed** (see Recommendation 2).

- **[Important] Success criterion 6 was pinned to a point-in-time file count** — *"858 bundled files,
  0 added, 0 removed"*. This task adds at least one test file and modifies the bundler; if the count
  moves, the criterion fails for a reason unrelated to what it is trying to assert (idempotence).
  A criterion that can fail while the property it names holds is worse than no criterion. **Fixed**
  (see Recommendation 3).

#### Optional
- **[Optional] The Add entry read "Tests under `tests/`"** without naming a file. Verified during
  review that `package.json`'s `test` script globs `'tests/*.test.js'`, so a file added there is
  collected automatically — but a file added under a **new** `skills/*/tests/` directory would not be,
  because those globs are enumerated by hand. Worth stating, since the trap is invisible and silent.
  **Fixed** (see Recommendation 4).

**Effort estimate:** `estimated_effort_hours: 8`. Rubric recompute — 7 success criteria, 4 plan phases,
medium risk, an inherited findings backlog of ~45 items — lands in the same band. No divergence
finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (after Recommendation 2)

- Overview ↔ Implementation Plan: aligned once the Phase 1 fork is closed. That fork *was* the one
  internal contradiction in the document (Phase 1 vs §4/§9), and it is now resolved in favour of
  §4/§9.
- Files Summary ↔ phases: `bundle_skill.py` (Phase 2–3), `validate.yml` (Phase 4), tests (Phase 2–3). ✅
- Testing Strategy is the strongest section in the document. It does not merely require tests — it
  names four specific ways a test in *this* area passes for the wrong reason (a fixture producing a
  second problem class; asserting on whole stdout when the summary lists class names; testing only the
  reconciliation path when the gate has three inbound paths; a byte-bounded banner search when the
  banner sits after frontmatter at ~char 499). Each is a recorded finding, not a hypothetical.
- Success Criteria ↔ Scope: all seven §4 classes are represented, either directly or through the
  read-only and remedy-correctness criteria. ✅
- Rollback plan covers all four phases with one revert and states honestly what rollback loses
  (the four extra classes, nothing else). ✅

**Scope and complexity:** 4 phases, single module (`bundle_skill.py` + one CI file + tests). Well under
the >8-phase split threshold. No recommendation to split.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risk table names the right top risk — *"repeats task 86's non-convergence"*, rated High — and its
mitigation ("start from the recorded findings; keep the class taxonomy as small as the criteria
require") is actionable rather than aspirational. Recommendation 2 strengthens it: the taxonomy is now
fixed at the seven §4 classes rather than left open, which removes one axis along which the previous
attempt expanded.

The three remaining risks each have a concrete mitigation, and the "a test passes for the wrong reason"
row is backed by the four named traps in §8.

Rollback is a single `git revert` of the `validate.yml` step to regenerate-and-diff, with a stated
verification (`npm run bundle` twice → clean second run; `git status` clean). Feasible and testable. ✅

**Residuals section (Notes):** six inherited residuals, each with its live-instance status recorded
("none has a live instance in the tree"). This is exactly the right disposition — they are known
limits, not open defects, and #1 (pass 3's blind regex) is explicitly held out of scope with the
reason a fence exemption was tried and reverted.

---

## Summary of Recommendations

### Must Fix (Critical) — 0 issues

None.

### Should Fix (Important) — 3 issues

1. **Create and link a GitHub issue.** ✅ Applied — dedup search (`in:title "[Task 98]"`, `--state all`)
   returned zero matches; issue **#366** created with the `task` and `priority:medium` labels under the
   `Technical Tasks (standalone)` milestone, added to board `Agent Skills` with Priority P2.
   `github_issue: 366` written to frontmatter and a body cross-reference link added.
   *(The board's Estimate field does not exist on this project — logged, non-blocking.)*
2. **Resolve the Phase 1 fork in favour of §4/§9.** ✅ Applied — Phase 1 is now *"Read the inherited
   findings, then write fresh"*, with an inline note recording that the decision was taken at review
   and why the two alternatives are unavailable. The task-86 gates become a pre-written defect list to
   test the new implementation against, not source to port.
3. **Rephrase success criterion 6 off the file count.** ✅ Applied — now asserts that a second
   consecutive `npm run bundle` writes nothing, with 858 retained as illustrative and explicitly *not*
   the assertion.

### Consider (Optional) — 1 item

4. **Name the test file.** ✅ Applied — `tests/bundle-check-mode.test.js`, with the verified note that
   `'tests/*.test.js'` is already in `package.json`'s test glob while a new `skills/*/tests/` directory
   would not be.

---

## Implementation Readiness Assessment

**Score:** 9/10

**Scoring Breakdown:**

- Template Compliance: 9/10 — complete structure, card preflight clean; one missing tracker link
- Technical Accuracy: 10/10 — every claim verified against the tree, zero hallucinations
- Implementation Clarity: 8/10 — phases 2–4 directly executable; phase 1 needed the fork closed
- Consistency: 9/10 — one internal contradiction (phase 1 vs §4/§9), now resolved
- Risk Management: 10/10 — inherits and records real findings rather than re-deriving them

**Confidence Level for Successful Implementation:** High — with the caveat that this task's own history
is the argument for caution. The predecessor did not converge; what makes this attempt different is a
fixed taxonomy, a pre-written defect list, and success criteria that are now all falsifiable.

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** Score ≥ 8 with zero critical issues, and all three Important findings were fixed
during this review rather than deferred. The document's technical claims are verified rather than
asserted.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Read the five task-86 gate files as a findings backlog (Phase 1) — as test cases, not as code.
2. Build the check on `expected_bytes` (Phase 2); assert read-only.
3. Branch the remedy line on problem class and verify by measurement — check → bundle → check (Phase 3).
4. Wire into `validate.yml` only; if any `npm run …` term is added to `test.yml`, add it to the `ci`
   composite in the same edit — `ci-gate-parity.test.mjs` asserts set equality both ways (Phase 4).
5. Mutation-prove each behaviour: revert it, confirm a test goes red. Treat a mutation that reds nothing
   as a statement about the mutation.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous — `develop-next` → `develop-task` Step 2)
- **Review Date:** 2026-09-09
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.98.bundle-freshness-check-mode/task.98.bundle-freshness-check-mode.md`
- **Sources consulted:** `skills/create-skill/scripts/bundle_skill.py`, `.github/workflows/validate.yml`,
  `package.json`, `docs/tasks/task.86.bundle-transitive-refresh/` (gates 1–5, qa 1–3),
  `evals/shared/tests/ci-gate-parity.test.mjs`, `skills-config.yaml`,
  `docs/architecture/concepts/source-tree.md`
- **Card preflight:** `sync-jira-task.js --check-card` → `ok: true`, 0 findings
