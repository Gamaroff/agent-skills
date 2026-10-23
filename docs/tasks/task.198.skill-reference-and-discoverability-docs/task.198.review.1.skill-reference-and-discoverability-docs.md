# Task Review Report: Task 198 - Skill reference and discoverability docs

**Reviewed:** 2026-10-20
**reviewed_blob:** 2b0572b3daf1fefa8125fdca72e26bc2dc60a407
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 4 critical + important recommendations implemented — 2026-10-20

---

## Executive Summary

A documentation-only task with a precise plan: each of the 27 findings carries what the doc says, the source, the evidence and the fix. The review found no critical issues. It found four important ones, all about how the success criteria are checked rather than what gets edited: the CI link checker does not reach `skills/**` and does not check cross-file anchors; one finding's fix reaches a 16th doc the scope list leaves out; "every command is run once" does not fit slash-command forms; and an edited Mermaid map has no render check.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 3 💡

**User Clarifications:** 0 questions asked (develop-task pipeline, autonomous; decisions recorded below)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Run inside the `develop-task` pipeline (Step 2), so the question points were answered by the pipeline's autonomous defaults rather than asked. Each decision is recorded here so a reader can check it.

### Question Point 1: Structure & Scope

**Q1: RUNBOOKS-9's fix also names `docs/runbooks/jira-publish.md:124`, which is not in the 15-doc scope. In or out?**

- **Decision**: In scope. It is the same false claim ("`ensure-epic-jira-issue` — called by `finalise`"), and the plan's own fix asks for it. task.199 also edits `jira-publish.md`, but at line ~105 (RUNBOOKS-23, the sync-skills sentence), a different section. The task's Clarifications already allow this kind of overlap.
- **Impact**: The scope list and Files Summary gain `docs/runbooks/jira-publish.md` (16 docs; the finding count stays 27).

### Question Point 2: Technical & Implementation

**Q2: How is SC-6 ("CI link checker passes … including anchors") checked, given the CI workflow does not cover `skills/**/*.md` and `markdown-link-check` does not validate cross-file anchors?**

- **Decision**: Follow task.197's precedent. Run `markdown-link-check@3` locally with the CI config on every changed doc. Check each new or changed cross-file `#anchor` against its target heading with a GitHub-slug script, plus a control anchor that must miss.
- **Impact**: SC-6 and the Testing Strategy are rewritten to say this.

### Question Point 3: Completeness & Safety

**Q3: SC-3 says every command a changed doc shows "is run once". Most forms in scope are slash commands (`/review-pr …`), which cannot be run as shell commands. How is SC-3 met?**

- **Decision**: Run each shell command once. Check each slash-command form against the invocation line or arguments table of its `SKILL.md`, and cite that line.
- **Impact**: SC-3 is rewritten as a documentation criterion that finalise can pass on a cited line.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections are present, plus Change Log, Progress Tracking, References and Notes. No placeholders.
- Frontmatter: `type: task`, `description` and `tags` are present (OKF conformant).
- Filename follows `task.{N}.{name}.md`.
- Tracker: `github_issue: 601` resolves (OPEN), and the body link `[#601](…/issues/601)` matches.
- Card preflight: 3 blocks resolve (`sync-jira-task.js --check-card`, rc 0).
- Change Log: present, and current for `planned`.
- Sign-off: not enabled in `skills-config.yaml`, so not checked.

## 2. Technical Accuracy

**Status:** ISSUES FOUND (no hallucinations)
**Hallucinations Detected:** 0

The plan's evidence was spot-checked against the tree at `bc7cbd8b`. All 27 findings still read as open. Grepping each finding's old wording in its doc found it present in every case: for example `sourced by 8` in overview.md:114, `/qa-technical-task` in review-task README:231 and :272, `deprecation stub` in document-existing-project.md, and `Update docs/reference/skill-catalog.md` in README.md:148. The pre-passes ran inline, not as subagents, so they were not independent of this reviewer. Architecture alignment: not applicable (docs only; no code axes). Codebase scan: `not-implemented`.

`doc-links.js` passes on the task and plan documents (3 and 1 relative links).

#### Important

- **I-1: SC-6 cannot be met by the instrument it names.** `.github/workflows/docs-link-check.yml` filters on `docs/**/*.md`, `README.md`, `AGENTS.md`, `CONTRIBUTING.md` and `examples/**`. Four in-scope files (`skills/{develop-next,qa-next,review-story,review-task}/README.md`) are never checked by CI. `markdown-link-check@3` also does not validate cross-file `#anchors` (task.197 probed a bogus anchor and got rc 0). **Fix applied**: SC-6 and the Testing Strategy now name a local `markdown-link-check@3` run with the CI config, plus a GitHub-slug anchor check with a control.

#### Optional

- **O-1: Line anchors in the plan have drifted.** Examples: `workflows.md:72` is now :85; review-task README `L229/L270` is now :231/:272. Phase 0's re-verify step already finds passages by quoted text, so this needs no edit.
- **O-2: A decayed figure.** The plan says "129 skills"; `ls skills | wc -l` now gives 128. `grep -rl resolve-platform.sh skills/*/SKILL.md | wc -l` still gives 28. OVERVIEW-20's fix drops hard-coded counts, so nothing depends on these numbers.

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Each phase names its files. Each finding names the edit, the evidence and the line, so a developer can follow the plan without guesswork. `estimated_effort_hours: 8` is plausible for 27 small doc edits plus verification.

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

#### Important

- **I-2: Scope list and plan disagree.** RUNBOOKS-9's fix edits `docs/runbooks/jira-publish.md:124`, but that file is absent from § 3's docs list, § 7 Files Summary and the phase file lists. **Fix applied**: added as a 16th doc in Phase 3 (Q1).
- **I-3: SC-3 is not classifiable.** Finalise sorts each criterion as behaviour, documentation or measured. "Every command … is run once" is none of these for slash-command forms. **Fix applied**: SC-3 now reads "shell commands run once; slash-command forms cited against their `SKILL.md` invocation line" (Q3).
- **I-4: An edited Mermaid map has no render check.** OVERVIEW-13 and OVERVIEW-22 edit the dependency-map `mermaid` block in `docs/concepts/architecture.md` (the block containing `CS --> MA[mermaid-architect]`). A syntax slip renders as an error box on GitHub, and nothing in the Testing Strategy would catch it. **Fix applied**: added SC-9 and a Testing Strategy line: every edited Mermaid block is validated (renders without error).

#### Not applicable

- Control-case rule (behavioural evidence): no new check or rule, so not applicable.
- Test runner reach: no test files added.
- Every SC can be met before merge. SC-8 marks the in-repo audit report, which is on the branch.

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

The risks match a docs-only change: the main risk is a fix that restates its source wrongly. The mitigation is right: QA re-reads the source, not the plan. Rollback by revert is enough.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 4 issues (all applied)

1. SC-6 / Testing: local `markdown-link-check@3` with the CI config plus a slug anchor check (I-1).
2. Add `docs/runbooks/jira-publish.md` to the scope (I-2).
3. Reword SC-3 so each command form has a checkable evidence type (I-3).
4. Add SC-9: every edited Mermaid block validated (I-4).

### Consider (Optional) - 3 items

1. Plan line anchors have drifted (O-1); Phase 0 handles it.
2. The "129 skills" figure has decayed to 128 (O-2).
3. Record each finding's Phase 0 verdict (open / closed / moved) as a table in the implementation report, so QA can diff it against the plan.

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 10/10
- Technical Accuracy: 8/10
- Implementation Clarity: 9/10
- Consistency: 7/10
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues. The four important findings were about how the criteria are verified, and all four are now fixed in the task document.

---

## Review Metadata

- **Reviewer:** review-task (develop-task pipeline Step 2)
- **Review Date:** 2026-10-20
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.198.skill-reference-and-discoverability-docs/task.198.skill-reference-and-discoverability-docs.md
- **Architecture Docs Consulted:** docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (always-load); .github/workflows/docs-link-check.yml
- **Pre-pass:** inline (not dispatched), so not independent of the reviewer
