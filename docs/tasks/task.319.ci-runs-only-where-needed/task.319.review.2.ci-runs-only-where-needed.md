# Task Review Report: Task 319 - Pipelines spend a CI run only where a run can answer something

**Reviewed:** 2026-11-24
**reviewed_blob:** 4913190e4ee7a8ac79d1bd30b00501c78dde01e4
**Review Depth:** Standard (focused re-review: verify review 1's fixes, then check the new text)
**Task Status:** planned → ready-for-development
**Overall Assessment:** GOOD
**Pre-pass:** the two Explore agents did not run; checks were done in-line (grep, `sed -n`, the doc-links and card-preflight engines). Independent review did not run.

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-11-24

---

## Executive Summary

Review 1's seven fixes (I-1 to I-7) all landed as written. The document was byte-identical to review 1's stamped revision (`8b2334d73`) when this review began. Re-verification found three Important gaps in the new text, all fixed in this pass. None changes the design.

**Critical Issues:** 0
**Important Issues:** 3 (fixed)
**Optional Improvements:** 0

**User Clarifications:** 3 questions asked and answered
**Implementation Readiness:** 9/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

| # | Question | Decision | Impact |
| --- | --- | --- | --- |
| Q1 | Re-review a document unchanged since review 1? | Verify fixes, then promote | This focused report |
| Q2 | Branch for review artifacts? | Stay on `docs/task-319-ci-runs-only-where-needed` | Step 0a not run: no stash, no feature branch |
| Q3 | Form of `push-policy.sh`, which needs a JS function and the JS config reader | Shell wrapper over node | N-3 fix: a new node mode, built in Phase 3 |

---

## Review 1 fixes: verified

| Finding | Landed | Evidence |
| --- | --- | --- |
| I-1 `ci` parser widened | yes | Phase 3 checkbox; § 3 names `:521-523`. Read the code: `ci-tree-equivalence.js:517-523` still throws on any key but `docsOnly` |
| I-2 push-site population, scan test | yes | Table and search recorded; criterion 1 is a scan test with a non-vacuity case. See N-1 and N-2 below for what was still missing |
| I-3 `verify-push-state.sh` a reader | yes | In § 3 and Phase 2. `shared/resources/verify-push-state.test.sh` already exists and is in `test:suite`, so the Phase 2 test extends it |
| I-4 skip marker rarely fires mid-run | yes | Stated in § 3 with the latency commands |
| I-5 pinning tests listed | yes | § 7 |
| I-6 runner edit and enumerating tests | yes | § 7; `push-policy.test.sh` goes in `test:suite` by hand |
| I-7 `rerunAtHead` contract | yes | § 3, exact match, beside `qa-execute-snippets.mjs` |

Other checks: doc-links 5 of 5 resolve; card preflight 3 blocks resolve (scope: card sections only); the cited anchors `:430`, `:418`, `:1176`, `:657`, `:2232`, `:173` and `finalise-ci-poll.sh:13` each name what the document says.

---

## Findings (all fixed)

#### Important

- **N-1 Two finalise push sites were missing from § 3.** `git grep -n "git push" -- shared/resources skills ':!*/references/*' ':!*test*'` finds `skills/finalise/SKILL.md:2143` (`git push origin "$BRANCH"`, the acceptance push; `CI_HEAD_2` is read right after it) and `:3489` (`git push origin HEAD` after `finalise-fix-and-recheck.mjs --git-base`). The table cited `:113`, which is a mode-table row, not a push. Fixed: both added with their remote reader.
- **N-2 The allowlist named four exemption classes; the grep has more.** The search returns 53 hits (2026-11-24). Unnamed: `create-parallel-stories:320`, remote-branch deletes (`develop-next:540,571`, `develop-batch:606`), instructions printed to a human (`qa-fix:248,269`, `qa-story:193`), and text that names `git push` without running it (refusal lists, matchers, tracker docs). The scan test would have been red on its first run. Fixed: the exemptions are listed by class with a reason, and the scan's scope is the files of the site table. The hit count is no longer a figure in the text; the test re-measures it.
- **N-3 `push-policy.sh` had no way to call `isDocsPath` or read the config.** `isDocsPath` is a JS export (`ci-tree-equivalence.js:153,1158`) and the config reader is JS. A shell helper cannot call either. Fixed (Q3): § 3 states the helper as a shell entry that shells out with `command node` to a new mode of `ci-tree-equivalence.js`; Phase 3 builds it with a test.

---

## Implementation Readiness Assessment

**Score:** 9/10

- Template Compliance: 9/10
- Technical Accuracy: 9/10
- Implementation Clarity: 9/10
- Consistency: 9/10
- Risk Management: 8/10

**Recommendation:** READY TO IMPLEMENT.

**Justification:** every finding from both reviews is fixed in the document, and the remaining risk is the one the document already names (a deferred push hiding a commit a reader needed), with a per-part rollback key.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-11-24
- **Task File:** docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md
- **Architecture docs consulted:** `shared/resources/ci-tree-equivalence.js`, `skills/finalise/SKILL.md`, `package.json` (`test:suite`)
