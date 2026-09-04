# Task Review Report: Task 89 — Lint for prose-matching assertions that claim a relationship but test only co-occurrence

**Reviewed:** 2026-09-04
**Review Depth:** Standard
**Task Status (at review):** Draft
**Overall Assessment:** NEEDS IMPROVEMENT → GOOD (after fixes applied in Step 8.5)

---

## Executive Summary

The task's *analysis* is excellent and every technical claim in it checks out against the repository —
all five referenced files exist, the six instances are real and individually traceable to named gate
findings, and the guard family's git history is intact so the fixtures are genuinely reconstructible.
What the document lacks is the half a developer implements from: it carries 2 of the 11 mandatory
template sections, names no file paths, no phases, no test plan and no risk posture, and one of its
five success criteria points at content that does not exist in the document.

**Critical Issues:** 2 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 4 questions — auto-answered from repository evidence (autonomous pipeline run)
**Implementation Readiness:** 5/10 before fixes → 9/10 after
**Recommendation:** READY TO IMPLEMENT (post-fix)

---

## User Decisions & Clarifications

This review ran inside the `develop-task` pipeline under an AUTONOMOUS directive: no user was present,
so every clarifying question was answered from repository evidence and the basis is recorded here.

**Q1 (Structure): Where should the lint live, and how does it get into `npm run ci`?**
- **Auto-answer**: `tests/relationship-assertion-lint.test.js`, run by the existing `node --test … 'tests/*.test.js'`
  glob — **no `package.json` change**.
- **Basis**: `package.json` `test` already globs `'tests/*.test.js'`; `ci` = `ci:fast && eval:all`,
  `ci:fast` = `format:check && test`. The repo's two comparable repo-wide lints
  (`tests/mutation-call-site-coverage.test.js`, `tests/executable-instructions.test.js`) both live there.
  Choosing any other location would require a new hand-maintained glob — the exact failure mode that
  once left 232 skill tests unrun.
- **Impact**: closes success criterion 4 mechanically; removes the need for a package.json edit.

**Q2 (Technical): Which commits reconstruct the six fixtures?**
- **Auto-answer**: the twelve commits on `evals/shared/tests/pr-review-loop-parity.test.mjs`; each
  instance is pinned by its **gate finding id** plus the commit that closed it —
  1 → CY8-5 / `87e5bf9`, 2 → CY9-3 / `8293765`, 3 → CY10-1 / `ef3a0c1`,
  4 → CY11-1 / `18dd5b5`, 5 → CY11-2 / `18dd5b5`, 6 → found inside #5's fix / `18dd5b5`.
- **Basis**: `git log -- evals/shared/tests/pr-review-loop-parity.test.mjs` (12 commits, verified);
  finding text read directly from `task.77.gate.10.*.yml` and `task.77.gate.11.*.yml`.
- **Impact**: resolves Critical C2 — the criterion becomes verifiable.

**Q3 (Completeness): What is the false-positive denominator, and what threshold is acceptable?**
- **Auto-answer**: the denominator is the current suite — **1742 candidate assertions across 81 files**
  (`assert.match` / `assert.doesNotMatch` / `.includes(` under `evals/`, `tests/`,
  `shared/resources/tests/`, `skills/*/tests/`). Threshold: **every** flag on the current suite must be
  triaged and recorded — either a true positive (fixed or filed) or an explicit, commented suppression.
  A lint that ships with untriaged noise is a lint that gets disabled.
- **Basis**: measured with `grep -rEc` over the four roots; the "a guard that cries wolf gets disabled"
  rule is stated verbatim in `tests/mutation-call-site-coverage.test.js`'s own header.
- **Impact**: makes success criterion 3 measurable.

**Q4 (Structure): Create a tracker issue for this task?**
- **Auto-answer**: **Skip — leave unlinked.** No remote issue created.
- **Basis**: the skill's own rule — tracker sync is opt-in and a remote issue is *never* created
  unprompted; no user is present to consent. Sibling tasks T77 and T90 are likewise unlinked, so this
  is consistent with repository practice, not a deviation.
- **Impact**: the Important gap stands in this report; run `/sync-github-task` later if wanted.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

The document carried **2 of 11** mandatory numbered sections (Overview, Scope) plus Success Criteria,
References and Change Log. Missing: Motivation, Technical Background, Breaking Changes, Implementation
Plan, Files Summary, Testing Strategy, Risk Assessment, Rollback Plan, Progress Tracking.

#### Critical
- **[C1] Implementation Plan (§6) and Testing Strategy (§8) absent.** Both are Critical by the skill's
  own severity table. There were no phases, no per-phase risk levels, no dependencies and no test plan —
  `/develop` would have had to invent all of it.

#### Important
- **[I1] No file paths anywhere.** The lint's module name, its fixture location and its CI wiring were
  unspecified. Resolved by Q1.
- **[I5] No tracker linkage.** `github_issue` absent from frontmatter. Left unlinked by design (Q4).

#### Optional
- **[O1] `assignee: TBD`** — placeholder unfilled.

**OKF conformance:** `type: task` present ✅, `description` present ✅, `tags` a well-formed list ✅.
No findings.

**Change Log (check 4b):** present, one row, consistent with `status: draft`. ✅ No finding.

**Stakeholder Sign-off (check 4a):** `sign-off.enabled` absent from `skills-config.yaml` → check skipped
entirely, as specified.

**Tracker card preflight (check 5a):** not run — `sync-jira-task` is the Jira path and `TRACKER=github`
here, with no linked issue. Not applicable.

### Recommendations
1. Add the nine missing sections, with real content rather than headings — _per Q1, Q3_. **Applied.**
2. Fill `assignee`. **Applied** (`Claude`).

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Every claim was verified against the tree, and every one held:

| Claim in task | Verification | Result |
|---|---|---|
| `evals/shared/tests/pr-review-loop-parity.test.mjs` | on disk, 845 lines | ✅ |
| `task.77.gate.{10,11}.*.yml` | both on disk; CY10-1 and CY11-1 read directly | ✅ |
| `task.77.qa.11.*.md` | on disk | ✅ |
| `shared/resources/mutation-proving.md` | on disk | ✅ |
| `advance-pipeline-lock.test.sh` "runs the script and asserts the resulting step" | on disk; invoked by `npm test` | ✅ |
| "the parsed-row keying survived attack" | `pr-review-loop-parity.test.mjs:159-171, 715-731` parse rows and key on the first cell, with an explicit non-vacuity guard | ✅ |
| Instance 3's regex, quoted verbatim | matches CY10-1's finding text exactly | ✅ |
| Instance 5 "ordering, not containment" | matches CY11-2's finding text exactly | ✅ |
| "Runs in `npm run ci`" is achievable | `ci` → `ci:fast` → `test` → globs `tests/*.test.js` | ✅ |

This is an unusually clean anti-hallucination result — the task was written from the gate files rather
than from memory of them.

#### Important
- **[I2]** The three lint target globs in §3 (`evals/**/*.test.mjs`, `tests/**/*.test.js`,
  `skills/*/tests/*.test.js`) omit `shared/resources/tests/*.test.mjs`, which holds 26 test files and is
  in `npm test`. Either it is deliberately out of scope or it is an oversight; unstated. **Applied** —
  added to scope, since instance-class assertions there are no less able to go vacuous.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (pre-fix) → COMPLETE (post-fix)

#### Critical
- **[C1, as above]** No phases existed at all.

#### Important
- **[I3]** No `estimated_effort_hours` divergence: frontmatter says 6h; the rubric over 5 success
  criteria / low risk / single new module lands at ~6–8h. Within tolerance — no finding.

### Recommendation
Add a 4-phase plan with explicit files, changes and dependencies. **Applied** — Phase 1 detector,
Phase 2 fixture corpus, Phase 3 false-positive triage, Phase 4 CI + docs.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Critical
- **[C2] §4 success criterion 1 references content §2 does not contain.** It reads "reconstructed as
  fixtures from **the commits named in §2**" — §2's table has columns for *surface*, *assertion* and
  *why it passed*, and names **no commits at all**. As written, the criterion cannot be checked: there
  is nothing to reconstruct *from*. Resolved by Q2; a `Gate finding` + `Closed by` column pair added
  to the §2 table and the criterion re-pointed at it. **Applied.**

#### Important
- **[I4] Success criterion 3 is unmeasurable.** "False-positive rate measured against the current suite
  and reported, not assumed" names no denominator, no threshold and no place to report. Resolved by Q3.
  **Applied.**

#### Optional
- **[O2]** Success criterion 2 names two survivors that must not be flagged, which is the right shape
  for a negative control, but does not say where that control lives. **Applied** — folded into the
  Testing Strategy as an explicit non-flagging fixture set.

**Scope/complexity:** 4 phases, one new module, one fixture directory. Well inside single-task size —
no split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** GAPS FOUND (pre-fix) → ADEQUATE (post-fix)

#### Critical
- **[C1, as above]** No Risk Assessment and no Rollback Plan existed.

The dominant risk was unstated and is specific enough to be worth naming: this lint runs over **1742
assertions in 81 files** and gates CI. A heuristic tuned to catch instance 6 (a bare `includes` on a
token that prefixes another token) will fire on ordinary, correct assertions unless it is narrowed hard.
The repository has already written down what happens next — *"a guard that cries wolf gets disabled"* —
in the header of the closest comparable lint. Mitigation: ship narrow, measure the false-positive rate
before wiring into CI, and require every current-suite flag to be triaged. **Applied** as §10 with
per-risk mitigations, and §11 as a genuine rollback (the lint is one file in a glob; deleting it is the
rollback, and nothing else depends on it).

---

## Summary of Recommendations

### Must Fix (Critical) — 2
1. **C1** — add the nine missing mandatory sections, chiefly Implementation Plan, Testing Strategy,
   Risk Assessment and Rollback Plan. ✅ **Applied**
2. **C2** — §4's "commits named in §2" points at nothing; add the commits to §2. ✅ **Applied**

### Should Fix (Important) — 4
1. **I1** — name the lint's path and its CI wiring. ✅ **Applied**
2. **I2** — `shared/resources/tests/` missing from the target globs. ✅ **Applied**
3. **I4** — give the false-positive criterion a denominator and a threshold. ✅ **Applied**
4. **I5** — no tracker issue. ⏭ **Skipped** — opt-in, no user present (Q4).

### Consider (Optional) — 3
1. **O1** — `assignee: TBD`. ✅ **Applied**
2. **O2** — name where the negative controls live. ✅ **Applied**
3. **O3** — a decision flowchart for the detector's shape rules would help, but §6's phase table now
   carries the same information in prose form. ⏭ **Skipped** — prose is sufficient; a diagram restating
   the Implementation Plan is explicitly discouraged by Step 6.5.

---

## Implementation Readiness Assessment

**Score:** 5/10 before fixes → **9/10** after

| Axis | Before | After | Note |
|---|---|---|---|
| Template Compliance | 3/10 | 9/10 | 2 of 11 sections → all 11 |
| Technical Accuracy | 9/10 | 9/10 | 0 hallucinations either way |
| Implementation Clarity | 4/10 | 9/10 | no paths/phases → 4 phases with files |
| Consistency | 5/10 | 9/10 | C2 self-contradiction closed |
| Risk Management | 2/10 | 8/10 | none → named risks + real rollback |

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — score ≥ 8 and no critical issues outstanding.

**Justification:** every gap was an authoring gap in the document, not a defect in the idea; all of them
were closable from repository evidence without guessing, and the analysis the task is built on verified
clean against the tree.

---

## Next Steps

Task is ready for implementation. The developer should:

1. Follow §6 phase by phase; Phase 3 (false-positive triage) is the one that decides whether the
   detector's rules are right — do not wire into CI before it passes.
2. Mutation-prove the lint against all six fixtures **and** the two negative controls.
3. Tick §Progress Tracking as each phase lands.
4. `npm run ci` must exit 0 before the PR is raised.

---

## Review Metadata

- **Reviewer:** Claude (review-task, autonomous — `develop-task` Step 2/8)
- **Review Date:** 2026-09-04
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.89.relationship-assertion-lint/task.89.relationship-assertion-lint.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md`
- **Evidence Consulted:** `package.json`, `tests/mutation-call-site-coverage.test.js`,
  `evals/shared/tests/pr-review-loop-parity.test.mjs`, `task.77.gate.{10,11}.*.yml`,
  `git log -- evals/shared/tests/pr-review-loop-parity.test.mjs`
- **Pre-pass agents:** not dispatched — evidence gathered inline (autonomous run; both pre-pass axes
  covered directly: architecture alignment via the three always-load concept docs, codebase scan via a
  repo-wide search confirming no existing relationship-assertion lint)
