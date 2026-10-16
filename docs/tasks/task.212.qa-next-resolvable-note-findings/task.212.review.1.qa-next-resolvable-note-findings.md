# Task Review Report: Task 212 - qa-next: a note finding can be resolved, with evidence

**Reviewed:** 2026-10-16
**reviewed_blob:** 174c95ba7588f2991c1738e4e60c910da01d4edc
**Review Depth:** Standard
**Task Status:** Planned (at review start) → Ready for Development
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 6 important recommendations implemented — 2026-10-16

---

## Executive Summary

A tight, well-anchored task: every cited line in `uat-status.mjs` resolves, the motivating ordering claim
holds when run, and the plan already factors verification into one function both reader and writer call.
The review found no critical issues and six important ones — spec gaps between the task and its plan, one
backward-compatibility contradiction, and a missed commit-scope edit in `SKILL.md` Step 5. All six were
applied to the task and plan documents.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 0 asked — autonomous pipeline run (`/develop-next` → `/develop-task --defaults`); each decision below took the option that keeps the safe direction and is recorded as such
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

No human was present. Decisions the reviewer made in their place:

**D1: Tracker sync** — Recommended option "Sync to GitHub" taken. Dedup search for `[Task 212]` found
nothing; issue [#679](https://github.com/Gamaroff/agent-skills/issues/679) created on the board with
Priority P2 (no Estimate field on the board).

**D2: Idempotency under a defaulted date** — the same evidence is a no-op whatever `--date` says; the first
date stands. Rationale: `--date` defaults to today, so the plan's "same evidence and date" rule would refuse
an identical re-run on any later day.

**D3: JSON compatibility** — `resolution` is attached only to rows that carry a marker, so the task's own
"no markers → same output" criterion holds byte for byte.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections, Change Log, Progress Tracking and References present. OKF `type: task` and
`description` present. No placeholders. Card preflight: 3 card blocks resolve (Summary +5, Success
Criteria +6, Breaking Changes +2 omitted behind `+N more`). Sign-off not configured; Change Log present and
advisory.

#### Important
- **No tracker issue linked** (`github_issue` absent). Fixed: #679 created and written back (D1).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Line anchors checked against `skills/qa-next/scripts/uat-status.mjs` at `1a701aa0`: `FINDING_ROW :667`,
`parseFindings :670`, `loadFindings :723`, `isOpenFinding :743`, `checkFindings :749` all resolve. Exit
codes 2 (`die` default, usage/refusal) and 4 (no such row) match the file's conventions.

Pre-pass B (architecture, `prepass-axes.js` source `architecture`): `aligned`, axes checked: What this repo
produces, SKILL.md authoring, File naming, Validation before commit, Do not. Low notes only (see Optional).
Pre-pass C (codebase): `not-implemented`.

**Check 11 (invariant, run):** the task claims run `A.5/2026-10-16-lan-02.md` sorts after
`A.5/2026-10-16-lan.md` in `listRunFiles` order. Run over a fixture tree:

```
command node --input-type=module -e '…listRunFiles("r/runs")…'
→ [ 'runs/A.4/2026-10-15-lan.md', 'runs/A.4/2026-10-16-lan.md',
    'runs/A.5/2026-10-16-lan.md', 'runs/A.5/2026-10-16-lan-02.md' ]
```

Holds.

#### Important
- **`bad-evidence` missing from the task's reason list.** The plan returns `bad-evidence` for evidence that
  is neither hex nor `.md`; § 3 listed seven reasons without it. Fixed in § 3 Target and § 9.
- **Run evidence outside `runs/` was unconstrained.** "Must exist" would accept `../../README.md`. Fixed: the
  evidence must be a member of `listRunFiles`, else `run-not-found` (matches the plan).

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (fixed)

#### Important
- **`<run>` argument form unstated in the task.** Fixed: the registry-relative path exactly as `--findings`
  prints it; the three new flags join `OPTIONS` or `dispatch`'s unknown-option guard refuses them.
- **Idempotency contradiction** between task ("same resolution") and plan ("same evidence and date"). Fixed
  per D2 in both documents.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND (fixed)

#### Important
- **Backward-compat criterion contradicted the plan.** The plan set `resolution: null` on every row, which
  changes every `--findings --json` payload and breaks the criterion "a run file with no markers yields the
  same `--findings --json` output". Fixed per D3 in task § 3 and the plan.
- **`SKILL.md` Step 5 commit scope.** Step 5 stages **only** the run file, registry, checklist and bugs. A
  Step 4.3 `--resolve-finding` edits an *earlier* run file, which would be left uncommitted and trip the next
  run's dirty-tree preflight. Fixed: Step 5 added to scope, Files Summary and a Documentation criterion.

Success criteria classification (finalise's kinds): every Functional and Code Quality criterion names a
per-PR test in `evals/qa-next/unit/uat-status.test.mjs` (already reached by `npm test`'s
`evals/qa-next/unit/*.test.mjs` glob); the Documentation criteria are "file F says S".

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The writer's risk (editing a committed record) is mitigated by single-cell replacement and a byte-equality
test. Evidence is re-verified on every `--check`, so a rebased-away sha reopens the row loudly. Rollback is
safe: the old parser ignores markers.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 6 issues (all applied)

1. Link a GitHub issue (#679).
2. Add `bad-evidence` to the reason list and criteria.
3. Constrain run evidence to `listRunFiles` membership.
4. Attach `resolution` only to marked rows (JSON compatibility).
5. State `<run>`'s form and evidence-only idempotency; add the flags to `OPTIONS`.
6. Add `SKILL.md` Step 5 (commit scope) to the docs scope.

### Consider (Optional) - 5 items

1. Plan anchor drift: the `--findings` label is built in `cmdFindings` (~`:786`), not `:689` — corrected in the plan.
2. A malformed marker that does not match the grammar at all (e.g. no date) leaves the row open with no
   `--check` message. Safe direction; a warning would help the owner notice a typo.
3. Same-day runs in different function directories order by full-path tiebreak (`A.4` before `A.5`), so
   "later" across directories on one day is alphabetical. Deterministic; worth one sentence in the README.
4. Preserve a `\r` line ending on the rewritten row (noted in the plan).
5. Pre-pass B: run `npm run validate` after the `SKILL.md` edits; `npm run generate-catalog` only if the
   description changes.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 8/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the six important gaps were specification edits, all applied.

---

## Next Steps

Task is ready for implementation. Follow the plan phase by phase; mutation-prove each criterion's test.

---

## Review Metadata

- **Reviewer:** review-task (autonomous, develop-task Step 2)
- **Review Date:** 2026-10-16
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.212.qa-next-resolvable-note-findings/task.212.qa-next-resolvable-note-findings.md
- **Architecture Docs Consulted:** docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/coding-standards.md (via pre-pass B)
- **Pre-pass:** B and C dispatched 14:07Z, both returned within 25s
