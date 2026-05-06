---
name: task.14 review report
description: Interactive review of task.14 (implementation-report stash hardening)
type: review
---

# Task Review Report: Task 14 — Harden implementation-report stash dance in develop pipeline

**Reviewed:** 2026-05-06
**Review Depth:** Standard
**Task Status:** 📋 Planned (frontmatter)
**Overall Assessment:** NEEDS REVISION

---

## Executive Summary

Task scope is sound and well-bounded — three phases over `commit-changes`, `create-pr`, and the step-4 pipeline reference. However, the Overview rests on a factual inaccuracy (`/commit-changes` does not run `git add -A`; it uses `git add -p` patch staging and already has an explicit unstaging rule for `*.implementation.*.md`). The pathspec syntax in Phase 1 (`git add -A -- ':!{exclude}'`) is also not quite right — bare `:!` excludes need an accompanying positive pathspec. Frontmatter status format and a missing GitHub issue body link are minor lifecycle compliance gaps.

**Critical Issues:** 2 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 4 questions asked and answered
**Implementation Readiness:** 6/10
**Recommendation:** NEEDS REVISION

---

## User Decisions & Clarifications

### Question Point 1: Structure & Scope

**Q1: Status format**
- **Decision:** Normalize to spec — frontmatter `status: planned`, add body `**Status:** Planned`.
- **Impact:** Apply lifecycle compliance fix.

**Q2: Issue body link**
- **Decision:** Add `**GitHub Issue**: [#21](https://github.com/Gamaroff/agent-skills/issues/21)` in Overview.
- **Impact:** Body cross-reference satisfies review-task URL consistency check.

### Question Point 2: Technical & Implementation

**Q3: Premise check (`git add -A` claim)**
- **Decision:** Keep `--exclude` flag scope. Update Overview to correct the `git add -A` claim and acknowledge existing protections (`commit-changes` line 43 unstaging rule + step-4 exclusion language).
- **Impact:** Motivation rewritten to be accurate; `--exclude` becomes belt-and-suspenders enforcement (programmatic, not advisory). Approach A retained.

**Q4: Pathspec syntax**
- **Decision:** Use `':(exclude)<path>'` magic — `git add -A -- '.' ':(exclude){path}'`.
- **Impact:** Phase 1 + Phase 3 change descriptions need the corrected command.

---

## 1. Template Structure Compliance

**Status:** ISSUES FOUND

### Issues

#### Critical
- None.

#### Important
- **Frontmatter `status: 📋 Planned`** — non-compliant with `shared/resources/document-status-lifecycle.md`. Frontmatter must be lowercase-kebab-case (`planned`); body must carry a separate `**Status:** Planned` field. _Per Q1._
- **No GitHub issue body cross-reference** — frontmatter `github_issue: 21` is set, but the body has no `[#21](url)` link. Review-task explicitly flags this. _Per Q2._

#### Optional
- No `## Progress Tracking` section. Most leaf tasks include a Progress Tracking checklist mirroring Phase checkboxes. Optional but useful for `/develop` consumption.

### Recommendations

1. Edit frontmatter `status:` → `planned`; insert `**Status:** Planned` line directly after H1. _Per Q1._
2. Insert `**GitHub Issue**: [#21](https://github.com/Gamaroff/agent-skills/issues/21)` in Overview, near the top of §1. _Per Q2._

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 1 (claim about `git add -A`)

### Issues

#### Critical (Hallucination)
- **`/commit-changes` runs `git add -A`** (§1 Overview, line 20).
  - **Verification:** `skills/commit-changes/SKILL.md:38` says "Prefer patch staging for mixed changes: `git add -p`". Line 43 already documents: "**Implementation reports** (`*.implementation.*.md`) — if the pipeline has not reached its final Step 8 commit, unstage these: `git restore --staged path/to/story.*.implementation.*.md`".
  - **Recommendation:** Rewrite §1 to state the real risk: the line-43 rule is _advisory documentation_, not _enforced behaviour_. A future `/commit-changes` edit (or a model that ignores the rule) could re-stage the report. The `--exclude` flag converts the advisory rule into an enforced flag-driven exclusion. _Per Q3._

#### Critical (Pathspec Syntax)
- **`git add -A -- ':!{exclude}'`** (§3 Approach A code block).
  - **Issue:** `:!` (short for `:(exclude)`) requires an accompanying positive pathspec. Used alone, git treats it as no positive selector and may stage nothing or behave inconsistently.
  - **Recommendation:** Use `git add -A -- '.' ':(exclude){path}'`. Also update §6 Phase 1 change description and §6 Phase 3 verification step. _Per Q4._

#### Important
- **§3 omits acknowledgment of existing protections.** Step-4 reference already has the `git restore --staged` line and a verification hint (`git log -1 --name-only`). Task should reference these as the current state being replaced/strengthened. _Per Q3._

### Recommendations

1. Rewrite §1 Overview: drop `git add -A` claim; describe current state accurately (advisory rule + step-4 unstage + verification suggestion); position Approach A as "promote advisory to enforced via flag". _Per Q3._
2. Update §3 code block and §6 Phase 1/3 commands to use `':(exclude)<path>'` pathspec form. _Per Q4._

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND

### Issues

#### Important
- **Phase 1 multi-exclude support is implied but not specified.** §10 says "design `--exclude` to take repeated args", but Phase 1 change list does not enumerate this. Add a checkbox: `[ ] Support repeated --exclude flags (collect into array, expand to multiple ':(exclude)<p>' pathspecs)`.
- **Phase 2 forwarding semantics undefined.** What does `/create-pr --exclude path` do when there are no uncommitted changes (commit-changes is not invoked)? Should it warn, error, or silently no-op? Recommend silent no-op + log line.

#### Optional
- **Phase 3 verification command** uses `grep -q "$(basename {report-path})"` — this would false-positive if any other file shares the basename (e.g., a different `.implementation.*.md`). Recommend full-path match: `git log -1 --name-only HEAD | grep -Fxq "{report-path}"`.

### Recommendations

1. Add multi-exclude checkbox to Phase 1.
2. Specify Phase 2 no-op behaviour when no commit occurs.
3. Tighten Phase 3 verification grep to exact-match.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT (minor gaps)

### Issues

#### Important
- **§8 Testing Strategy** has manual + negative + static checks — adequate for a skill-doc change. No automated test gap is critical here, but consider documenting the smoke command in `commit-changes/SKILL.md` itself so future maintainers find it.

#### Optional
- **§9 Success Criteria** doesn't include a "Documentation updated in `commit-changes/SKILL.md` examples" criterion. Optional.

### Recommendations

1. Add "Smoke command documented in `commit-changes/SKILL.md`" to §8.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

### Issues

#### Optional
- §10 risk "pathspec edge cases" is real (see §2 above). Once pathspec form is corrected to `:(exclude)`, residual risk drops; consider downgrading to Low after Q4 fix lands.

### Recommendations

1. Update §10 to reflect chosen pathspec form and downgrade probability.

---

## Summary of Recommendations

### Must Fix (Critical) — 2 issues

1. Rewrite §1 Overview to remove `git add -A` hallucination; describe current state (advisory line-43 rule + step-4 unstage + verification hint) and position Approach A as promotion to enforced flag. _Per Q3._
2. Replace `git add -A -- ':!{exclude}'` with `git add -A -- '.' ':(exclude){path}'` everywhere (§3 Approach A block, §6 Phase 1, §6 Phase 3 verification). _Per Q4._

### Should Fix (Important) — 3 issues

1. Normalize status: frontmatter `status: planned`; add body `**Status:** Planned`. _Per Q1._
2. Insert `**GitHub Issue**: [#21](url)` in Overview. _Per Q2._
3. Add multi-exclude checkbox to Phase 1; define Phase 2 no-op semantics; tighten Phase 3 grep to exact-match.

### Consider (Optional) — 2 items

1. Add `## Progress Tracking` checklist section.
2. Add documentation criterion to §9 Success Criteria.

---

## Implementation Readiness Assessment

**Score:** 6/10

**Scoring Breakdown:**
- Template Compliance: 6/10 (status format, missing body link)
- Technical Accuracy: 4/10 (one hallucination, one syntax error)
- Implementation Clarity: 7/10 (phases clear, multi-exclude underspecified)
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level:** Medium

**Recommendation:** ⚠️ **NEEDS REVISION**

**Justification:** Scope and approach are correct; execution detail has two critical defects (false premise + wrong pathspec) that would mislead an implementer or produce a broken `--exclude`. Fix the two criticals + three importants and the task will be ready.

---

## Next Steps

1. Apply criticals (Q3 rewrite, Q4 pathspec).
2. Apply importants (status normalize, body link, Phase 1/2/3 detail).
3. Re-run `/review-task task.14` or proceed directly to `/develop` if confident.

---

## Review Metadata

- **Reviewer:** Claude Code (Opus 4.7)
- **Review Date:** 2026-05-06
- **Review Depth:** Standard
- **Task File:** docs/development/tasks/task.14.implementation-report-stash-hardening/task.14.implementation-report-stash-hardening.md
- **Sources Consulted:**
  - `skills/commit-changes/SKILL.md` (lines 38, 43)
  - `skills/create-pr/SKILL.md` (Step 0 Pre-Supplied Parameters)
  - `shared/resources/develop-pipeline-step-4-create-pr.md` (line 36)
  - `shared/resources/develop-pipeline-step-1-create-branch.md` (stash dance, lines 57-94)
  - `shared/resources/document-status-lifecycle.md`
  - GitHub issue #21 (verified OPEN)
