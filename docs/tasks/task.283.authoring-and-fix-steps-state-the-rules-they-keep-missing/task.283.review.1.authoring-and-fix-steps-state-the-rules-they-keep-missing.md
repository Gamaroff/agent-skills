# Task Review Report: Task 283 - Authoring and fix steps state the rules they keep missing

**Reviewed:** 2026-11-19
**reviewed_blob:** 6de2f843ae1da0a8df1fe1a8fcff5b8609be413f
**Review Depth:** Standard
**Task Status:** Planned (before review), Ready for Development (after fixes)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 10 recommendations implemented — 2026-11-19

---

## Executive Summary

The four rules are real and each is traced to a recorded observation. The document was thin on four points: the Phase 2 renderer would have duplicated the card-summary definition that already exists in `jira-sync.js`, Phase 1's fix point sat in a document the Files list did not name, Phase 1's criterion was held by no test, and the new script's neighbours (the second task-body writer, the heredoc ratchet, the shared-resource scans) were unnamed. All were fixed in the task and plan during this review.

**Critical Issues:** 0
**Important Issues:** 9
**Optional Improvements:** 2

**User Clarifications:** 0 questions (pipeline run, autonomous; every finding had one obvious resolution)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the applied fixes)

**Review method note:** the two pre-pass Explore agents were not dispatched; the architecture and codebase checks ran inline, so there was no independent second reader. Pre-pass axes were not computed (`prepass-axes.js` not run), so no `aligned` claim is made.

---

## User Decisions & Clarifications

None asked. `develop-next` ran this with `--defaults`. Phase 1's fix point was already decided by the owner on 2026-11-06 (recorded in the task).

---

## 1. Template Structure Compliance

**Status:** PASS with notes

- All 11 numbered sections present; `type: task`, `description`, `tags` present; Change Log present and current after this review's rows.
- Naming follows `task.{id}.{name}.md`.
- No `github_issue` on the task; tracker sync not offered in pipeline mode (no remote changes made).
- Card preflight: not run (no tracker link, no sync planned from this review).

---

## 2. Technical Accuracy

**Status:** ACCURATE after fixes

Verified against the tree at `develop` `96a59c58c`:

- `skills/create-task/SKILL.md:268` is `### 1.2 One Task or Several?` (still correct).
- `docs/contributing/traps.md:25` holds the `command node` rule; no wrapper case exists yet.
- Obs #146 claim, **run** (check 11/31, scratch-safe): `timeout 5 command node -e 1` exits 127 with `timeout: failed to run command 'command'`; `N=$(command -v node); timeout 5 "$N" -e 1` exits 0. The claim holds.
- Tasks 265, 266, 267 are `accepted` (registry), so the "land after them" clarification is resolved.
- Obs #30, #34, #36, #146 are all `parked` with the unblock condition "task.283 merged to develop".

### Important

- **I-1 (check 6, one definition).** Phase 2 planned "a script that parses frontmatter with the repository's parser" and re-states the card caps. `shared/resources/jira-sync.js` already exports `parseFrontmatter`, `extractBodySections` and `buildCardSections`, and CLAUDE.md names it the single definition of the card contract. A second cap list would drift. Fixed: the renderer imports them; a test asserts it holds no cap constant.
- **I-2 (check 20, site list).** Nine skills write `.claude/state/issue-body.md` (`git grep -ln "issue-body.md" -- 'skills/*/SKILL.md'`); two build a **task** body: `ensure-task-github-issue` and `sync-github-task`. The plan named one. Fixed: `sync-github-task` is in Files and must be carried or declared out of scope.
- **I-3 (check 15, removed literal).** `shared/resources/tests/payload-heredoc-ratchet.test.mjs:61` pins `cat > .claude/state/issue-body.md <<EOF`. Replacing the heredoc changes its count. Fixed: the test is in Files and Phase 2.
- **I-4 (check 25, enumerated class).** A new `shared/resources/*.js` is read by `shared/resources/tests/pipeline-answers-generic.test.mjs` (every shared `.js` and `.md`) and by the bundler's `--check`. Fixed: both named in Phase 2.
- **I-5 (Files vs fix point).** Phase 1 Files named "the QA-loop step doc" while the decided fix point is a Step 3 check, and the plan still said "ask the owner". Fixed: the file is `shared/resources/develop-pipeline-step-3-develop-loop.md`, the plan states the decision.
- **I-6 (project memory).** Phase 4 told the developer to update "the project memory note", a user's private memory outside the repository. Fixed: removed from the plan and the target architecture; stated as not a deliverable.

### Optional

- **O-1.** The task's line-55 `(unverified: ...)` marker is resolved: check 2 is Step 3's "File Path Accuracy", the bullet is "Line anchors resolve, not only paths", docs-only is at `develop-pipeline-step-5-6-qa-loop.md:1667`.
- **O-2.** Check 14 (call-site collector) is not applicable: the document lists no engine call sites. Check 18: the new test lives under `shared/resources/tests/`, which the `package.json` test script globs, so the runner reaches it.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE after fixes

- **I-7 (check 3/4 of Step 4, plan names its location).** Phase 3 said "develop-bug's fix step". Named: `skills/develop-bug/SKILL.md` Step 3 (Investigate & Fix, line 248) and `skills/qa-fix/SKILL.md` Step 3 (Apply Changes, line 680).
- Phases 1 to 4 are independent; Phase 5 depends on all four. No ordering gap.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT after fixes

- **I-8 (Step 6 check 4, criterion held by a test).** Success criterion 3 ("the placement check flags the task.184 shape, shown by the fixture session") is a behaviour criterion and `/finalise` fails one with no per-PR test. The Step 3 CHANGELOG check is now a fenced shell block held by an extracting test with a control; the review-task prose claim stays behavioural evidence with its own control. Testing Strategy's third unit bullet, which implied an engine for a prose rule, was replaced.
- **I-9.** The Migration criterion ("renderer applies to issues created after the change") had no check. Reworded to a grep of the renderer's call sites in the QA report.
- Performance criterion: a measured bound with its command and `uptime`. It now says to run on one host, the LAN server, so five alternating runs do not heat the laptop.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

- The Step 3 check false-positive risk is real; mitigation (applies to new entries only) is now enforced by the block's control case.
- Rollback is per phase and tested by `bundle --check`.

---

## Summary of Recommendations

### Must Fix (Critical) - 0

None.

### Should Fix (Important) - 9, all applied

I-1 to I-9 above.

### Consider (Optional) - 2

O-1, O-2 above (recorded, nothing to change).

---

## Implementation Readiness Assessment

**Score:** 8/10

- Template Compliance: 9/10
- Technical Accuracy: 8/10
- Implementation Clarity: 8/10
- Consistency: 8/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** no Critical finding; every Important finding was a plan gap with one clear fix, and the fixes are in the document.

---

## Review Metadata

- **Reviewer:** Claude (review-task, run inline by develop-task Step 2)
- **Review Date:** 2026-11-19
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing/task.283.authoring-and-fix-steps-state-the-rules-they-keep-missing.md
- **Architecture Docs Consulted:** none read in full (pre-pass not dispatched); checked `shared/resources/jira-sync.js`, `docs/contributing/traps.md`, the QA-loop and develop-loop step docs, `package.json` test script
