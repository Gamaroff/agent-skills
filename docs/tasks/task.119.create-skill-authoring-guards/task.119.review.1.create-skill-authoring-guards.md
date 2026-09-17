---
id: task.119.review.1
title: "Review 1: task.119 — create-skill authoring guards"
type: review
task-ref: task.119.create-skill-authoring-guards.md
reviewed: 2026-09-17
review_depth: standard
overall_assessment: GOOD
readiness_score: 7
recommendation: NEEDS REVISION
---

# Task Review Report: Task 119 - Four authoring rules the corpus already obeys by accident

**Reviewed:** 2026-09-17
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

---

## Executive Summary

> **Implementation Status**: ✅ All 5 Important and 8 Optional recommendations implemented — 2026-09-17

The task is well-sourced — every anchor it cites exists (the `sections-guide.md` pitfall at L~1023, create-task §1/§1.5, coding-standards §Cross-skill resources, qa-task Step 4b, the three registry dependency notes at lines 177/181/183, and observations #23/#24/#36/#39, all `parked` on this task). Nothing is invented and nothing is already implemented. What is missing is precision at the two places where the guard's *definition* decides whether it is a guard or an allowlist: the scan scope rests on an unverified premise about what the harness renders, and the escape exemption rests on an unverified premise about what the harness honours. The bundler "warning" also has no reader. All three are resolved by user decision below and are cheap to fold into the document.

**Critical Issues:** 0 🚨
**Important Issues:** 6 ⚠️ (1 fixed during review)
**Optional Improvements:** 8 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 7/10
**Recommendation:** NEEDS REVISION (minor — all fixes are document edits)

---

## Decisions Log

Branch setup:
  - Started on: develop
  - Now on:     feature/task.119.create-skill-authoring-guards
  - Base:       develop
  - Epic branch: N/A
  - Auto-skip:  false

Output format: Comprehensive report.
Tracker: `TRACKER=github`, `ACCESS_TRACKER=full`. No `github_issue` in frontmatter; dedup search for `[Task 119]` returned nothing; user chose **Sync to GitHub** → issue **#419** created (`task`, `priority:medium`, milestone *Technical Tasks (standalone)*), added to board *Agent Skills* (P2; the board has no Estimate field), `github_issue: 419` written to frontmatter and body link inserted.

Pre-pass: Agent B `alignment: aligned` (2 low). Agent C `implementation_status: not-implemented` (5 findings). Both completed; no inline fallback needed.

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

**Q1: Create and link a GitHub issue?**
- **User Decision**: Sync to GitHub
- **Impact**: Important gap closed in-review (#419). No further action.

**Q2: Guard scope — SKILL.md only, SKILL.md + shared/resources, or verify first?**
- **User Decision**: Not sure — verify first
- **Impact**: Add a Phase 0 to the Implementation Plan: empirically confirm whether a Read-loaded reference (bundled `references/*.md`) is ever substituted by the harness, then fix the scope from the result. In Scope and Progress Tracking are reworded to state the scope is *decided by Phase 0*, and the two candidate outcomes are named so the developer does not re-derive them.

### Question Point 2: Technical & Implementation

**Q3: The regex `(?<!\\)\$[0-9]` exempts `\$0` — verify, drop, or keep?**
- **User Decision**: Verify in-task first
- **Impact**: Same Phase 0 step tests `\$0` in a scratch skill invocation. The lookbehind stays only if the escape survives rendering; the result is recorded in the test file's header comment so the next reader does not have to trust it.

**Q4: Bundler comment-origin — warn only, warn + guard test, or refuse?**
- **User Decision**: Warn + guard test
- **Impact**: `bundle_skill.py` prints the warning *and* a new `tests/bundle-comment-origin.test.js` asserts the live tree has zero comment-only origins (allowlist with reason, same shape as `mutation-call-site-coverage.test.js`). Success Criterion 3 and Files Summary updated accordingly.

### Question Point 3: Completeness & Safety

Not asked — the remaining findings (testing-strategy fold-in, stale baseline, path precision) have one obvious fix each and did not need a decision.

---

## 1. Template Structure Compliance

**Status:** PASS (after in-review fix)

All 11 numbered sections present; Change Log present and current for `planned`; Progress Tracking and References present; no placeholders. OKF: `type: task`, `description`, `tags` list — all valid. Card preflight: 3 blocks resolve, 0 omitted. Sign-off: not configured (skipped). Effort: `estimated_effort_hours: 5` present.

### Issues

#### Important
- **No tracker linkage** — frontmatter had no `github_issue`. **Fixed during review** (#419).

#### Optional
- Files Summary lists `CHANGELOG.md` and `docs/architecture/concepts/coding-standards.md`, but Progress Tracking has no checkbox for either — a developer working the checkboxes will miss them.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 (two unverified premises)

### Issues

#### Important
- **Unverified premise — what the harness renders.** The task's In Scope says "shipped `.md`" and Progress Tracking says `skills/*/SKILL.md` + `shared/resources/*.md`. Observation #23 describes substitution "in the loaded file" — the invoked SKILL.md. Whether a bundled reference loaded via Read is ever substituted is asserted nowhere. If it is not, the 8 `shared/resources` hits are false positives and the guard opens with an allowlist that trains readers to ignore it. — _Per user decision on Q2: verify in Phase 0._
- **Unverified premise — backslash escape.** The plan's regex exempts `\$0`. Nothing in #23 or the repo shows the harness honours the escape. — _Per user decision on Q3: verify in Phase 0; keep the lookbehind only on evidence._
- **`cut -f2` is not a drop-in for `awk '{print $2}'`.** `cut` defaults to tab delimiters; the awk idiom splits on whitespace runs. Listing `cut -f2` unqualified in the create-skill rule will produce a "fix" that silently changes behaviour. Name the delimiter (`cut -d' ' -f2` still differs on repeated spaces) or give the awk-native form `$(2)` — `$(` is not `$[0-9]` — as the candidate and verify it in Phase 2 alongside the escape test.

#### Optional
- `scripts/bundle_skill.py` (Technical Background, Files Summary) is an abbreviation; the canonical path is `skills/create-skill/scripts/bundle_skill.py`. Agent B flagged the same.
- #36's hardcoded `SHELLS` matrix has **already been replaced** — the fast-gate test now derives it from `zshAvailable()` (Agent C). The Motivation reads as if it is still live. One sentence in Technical Background ("the matrix was fixed in the test; this task adds the rule") saves the developer a hunt.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important
- **Bundler test location and shape unspecified.** Files Summary says `bundle_skill.py (+ test)`; the plan says "test with a fixture". The repo's pattern is a JavaScript test under `tests/bundle-*.test.js` driving the Python script via `child_process` (`bundle-check-mode`, `bundle-mjs`, `bundle-transitive`, `bundle-link-rewrite`). Name `tests/bundle-comment-origin.test.js` and the fixture directory. — _Per user decision on Q4, this test also asserts the live tree is clean._
- **Baseline is stale and its definition is missing.** "12 files on 2026-09-09" is already 13 by one count and 20 by another (`bash|sh|shell` info strings, escape-exempt); the number depends on the info-string set and the regex, neither of which the document states. Record the definition in the document and let the test record the count at authoring time.

#### Optional
- The plan's heading "§1.25" sits between create-task's §1 and §1.5 — it reads out of order. Use §1.2 (or renumber §1.5 → §1.6) so the sequence reads 1 → 1.2 → 1.5.
- `package.json` in Files Summary: `tests/*.test.js` is already in the `npm test` glob, so no edit is needed. Keep the row as a *verify* rather than a *change*, or drop it. (Agent B.)
- SC5 "Observations … close naming this PR" — the four are `parked` with `parked_until: task.119 merged to develop`, and parked entries never archive. State the mechanism: `observation-log.js set-status --id N --status actioned --resolution "task.119 (PR #N)"`, once per observation, at finalise.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important
- **Testing Strategy is thinner than the Risk Assessment demands.** Risk says "verify each block by running it (Step 4b-style) before and after"; the plan's Testing Approach says "run every edited bash block with `qa-execute-snippets` before/after" and "mutation per rule"; Testing Strategy says none of that. Fold both in, so the QA gate reads the obligation from the section it grades.
- **In Scope vs Progress Tracking disagree on scan scope** ("shipped `.md`" vs `SKILL.md` + `shared/resources/*.md`). — _Resolved by the Phase 0 decision (Q2); both sections reworded to defer to it._
- **SC3 vs Q4.** "warns on a comment-only origin, tested" no longer matches the chosen design — update to "warns, and a guard test asserts the tree has no comment-only origins".

#### Optional
- Scope and size: 4 phases, ~15 file touches, one PR — appropriate for one task. The per-rule seams (guard / create-skill rules / bundler / create-task) are exactly the "substantive → cleanup" pattern the task itself documents; no split recommended.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Low risk is right: documentation plus a guard test plus a warning. The one behaviour-changing edit class (rewriting shipped awk/shell to drop tokens) is named and has a mitigation. Rollback (`git revert`, keep the guard with a wider allowlist) is realistic.

#### Optional
- Add the Phase 0 outcome as a rollback trigger: if Phase 0 shows references *are* substituted, the 8 `shared/resources` sites are real hazards and the allowlist-and-note path is the wrong fix for them — they need rewriting, which raises the effort.

---

## 6. Mermaid Diagrams

None present; none recommended — no data shape, no branching beyond a three-way test the prose already states.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 5 open issues

1. **Add Phase 0 — verify the two harness premises** (does a Read-loaded reference get substituted? does `\$0` survive?), record both results in the test header, and derive the scan scope and the regex from them. — _Q2, Q3_
2. **Rewrite In Scope / Progress Tracking Phase 1** to state the scope is fixed by Phase 0, naming both candidate outcomes and the info-string set (`bash`, `sh`, `shell`). Drop the hardcoded "12 files" baseline; state the definition, let the test record the number.
3. **Bundler: warn + guard test.** Name `tests/bundle-comment-origin.test.js` (JS driving the Python script, fixture under `tests/fixtures/`), allowlist-with-reason shape, live-tree assertion. Update SC3 and Files Summary. — _Q4_
4. **Fold the verification obligations into Testing Strategy**: before/after execution of every edited bash block via `qa-execute-snippets.mjs`, mutation per rule (reintroduce one `$0` → test names the file; reintroduce one comment-path → bundler test names the line).
5. **Qualify the `cut -f2` alternative** in the create-skill rule (delimiter differs); offer `$(2)` as the awk-native candidate, verified in Phase 2.

### Consider (Optional) - 8 items

1. Canonical path `skills/create-skill/scripts/bundle_skill.py`.
2. Note in Technical Background that #36's matrix is already fixed; only the rule remains.
3. §1.25 → §1.2 in the plan.
4. `package.json` row → verify, not change.
5. SC5: name the `set-status --status actioned` mechanism.
6. Progress Tracking checkboxes for `coding-standards.md` and `CHANGELOG.md`.
7. Phase 0 outcome as a rollback trigger.
8. Effort: rubric gives 4–8h (5 ACs, 5 plan items, >5 files, documentation); 5h is within range, but Phase 0 plus 12+ file edits makes 8h the likelier number. Non-blocking.

---

## Implementation Readiness Assessment

**Score:** 7/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (tracker gap, fixed)
- Technical Accuracy: 7/10 (two unverified premises, one wrong alternative)
- Implementation Clarity: 7/10 (test location, baseline definition)
- Consistency: 6/10 (scope stated two ways, Testing Strategy vs Risk, SC3 vs design)
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High (after the document edits above)

**Recommendation:** ⚠️ **NEEDS REVISION** — no critical issues; five Important fixes, all document-level and all decided.

**Justification:** The task is accurate and grounded; the gaps are in the definition of the guard, and the user has decided each of them. Once Phase 0 and the scope/regex wording land, the developer has no judgement calls left.

---

## Next Steps

1. Apply the five Important fixes and the Optional ones that are one-line edits (Step 8.5).
2. Promote to `ready-for-development` (Step 9).
3. `/develop-task docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md`

---

## Review Metadata

- **Reviewer:** Claude (review-task, interactive)
- **Review Date:** 2026-09-17
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md` (via pre-pass B)
- **Corpus checks run:** card preflight (`--check-card`), fenced-bash `$0`–`$9` scan (20 files under `bash|sh|shell`, escape-exempt), registry notes 51–58 / 62–64 / 93–95, observation frontmatter #23/#24/#36/#39
- **Pre-pass:** Agent B aligned (21s), Agent C not-implemented (34s)
