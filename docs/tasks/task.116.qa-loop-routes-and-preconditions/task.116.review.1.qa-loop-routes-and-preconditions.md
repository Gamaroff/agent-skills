# Task Review Report: Task 116 - The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Reviewed:** 2026-09-13
**Review Depth:** Standard
**Task Status:** Planned (pre-review)
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 3 recommendations implemented — 2026-09-13

---

## Executive Summary

A tight, well-sourced task: every step anchor, file path and precedent it names resolves in the tree (§5b entry at `develop-pipeline-step-5-6-qa-loop.md:252-256`, §5c routes at `:850-858`, qa-task Steps 3b/3c/4b/10/13 at `:366/:470/:535/:709/:1070`, `probe-boundary-rule.md`, `zshAvailable()` at `qa-execute-snippets.mjs:1328`). The one real defect is the pointer to the test that must be extended: the plan says *"find it with `grep -rn "diminishing" evals/`"* and the Files Summary lists `evals/develop-task/protocol/*` — but no eval mentions `diminishing`, `evals/develop-task/protocol/` holds only `pipeline-shape` / `step-contract` tests (no route assertion), and the test that actually pins the accepting-route set is `evals/shared/tests/pr-review-loop-parity.test.mjs:116-133`. A developer following the plan as written would grep, find nothing, and either skip the assertion or write a second test beside the first. The task had no tracker issue; one was created (#403).

**Critical Issues:** 0 🚨
**Important Issues:** 3 ⚠️
**Optional Improvements:** 2 💡

**User Clarifications:** 0 questions asked (pipeline run — `develop-task` autonomous mode; pre-pass findings resolved by direct verification)
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT

---

## User Decisions & Clarifications

Pipeline run — no interactive question points. Decisions taken autonomously per `develop-pipeline-autonomous-defaults.md`:

- **Output format**: Comprehensive report (pipeline default).
- **Tracker sync**: Sync to GitHub (Recommended option) — issue **#403** created, added to the "Agent Skills" board, Priority P1 set; estimate field not present on the board (non-blocking).
- **Pre-pass**: Agent B returned `alignment: drift` (two low findings); Agent C returned `implementation_status: not-implemented` (eight findings, all "absent" — nothing pre-implemented). Both low-severity drift findings were verified by hand and are recorded below as Important #1 and #3.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 numbered sections present; unnumbered Change Log (1 row, current for `planned`), Progress Tracking (4 phases), References. No placeholders. Filename `task.116.qa-loop-routes-and-preconditions.md` conforms. OKF: `type: task`, `description`, `tags` list all present. Card preflight (`sync-jira-task.js --check-card`): `ok: true` — Summary 227 chars, Success Criteria 5 shown +1 omitted, Breaking Changes 84 chars. Sign-off: not configured — skipped. Change Log: `advisory` (default) — present and current.

### Issues

#### Important
- **No tracker issue linked** — `github_issue:` absent from frontmatter. → Fixed: #403 created and written back, body link added.

---

## 2. Technical Accuracy

**Status:** ACCURATE
**Hallucinations Detected:** 0

Verified against the tree:

| Claim | Evidence |
| :--- | :--- |
| §5b entry keys on the verdict token | `shared/resources/develop-pipeline-step-5-6-qa-loop.md:254` — "`CONCERNS`, `FAIL`, or has `top_issues` → …" |
| §5c admits two routes; "condition 2 requires a non-empty `top_issues[]`" | `:853-858` |
| qa-task Steps 3b / 3c / 4b / 10 / 13 | `skills/qa-task/SKILL.md:366 / :470 / :535 / :709 / :1070`; qa-story mirrors (`:871` for 3b end) |
| `probe-boundary-rule.md`, `finalise-dod-security-prompt.md`, `code-review-prompt.md`, `autonomous-defaults.md`, `qa-execute-snippets.mjs` | all present under `shared/resources/` |
| `zshAvailable()` precedent | `shared/resources/qa-execute-snippets.mjs:1328` |
| `code-review-prompt.md` has only `bug` / `cleanup` categories | lines 36, 43 |
| Four dispatch sites (qa-task 3b, review-task 1.5, develop Step 3, qa-fix 1a) | qa-fix `SKILL.md:328,545`; step-3 doc `:16`; review-task Phase 1.5 |

### Issues

#### Important
- **Wrong pointer to the route-pinning eval.** Implementation Plan item 1 says *"there is one — find it with `grep -rn "diminishing" evals/`"*. `grep -rln diminishing evals/ tests/ skills/*/tests/` returns nothing. The test that pins the accepting-route set is **`evals/shared/tests/pr-review-loop-parity.test.mjs:116-133`** ("a clean QA gate routes to 5c, not straight to Step 7"), which currently asserts only the `PASS`/`WAIVED` arms and must gain the CONCERNS-with-empty-`top_issues[]` arm. → Fixed in the plan and Files Summary.
- **Install-path references.** References section cites `.agents/skills/qa-task/` and `.agents/skills/qa-story/`; the sources are `skills/qa-task/` and `skills/qa-story/` (`.agents/skills/` is the consumer install path; in this repo it is a symlink to `skills/`). Editing through the install path works here but is the wrong habit for a task whose whole point is editing canonical sources. → Fixed.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE (after fix)

Six plan items map cleanly onto four Progress Tracking phases and six success criteria; each phase names its files and the co-located plan names the exact sentences to write. Effort `6h` is within the rubric band (6 criteria, 6 plan items, medium risk) — no finding.

### Issues

#### Important
- **Files Summary row `evals/develop-task/protocol/*`, `evals/develop-story/protocol/*` → route assertions.** both `evals/develop-task/protocol/` and `evals/develop-story/protocol/` hold pipeline-shape / step-contract tests, not route tests. The route assertion lives in `evals/shared/tests/pr-review-loop-parity.test.mjs`, and the parity family the new qa-task/qa-story test belongs to is `evals/shared/tests/*-parity.test.mjs` (`qa-execution-step-parity.test.mjs` is the closest sibling). → Fixed: row rewritten.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Overview ↔ Motivation ↔ Scope ↔ Plan ↔ Success Criteria are mutually consistent; Breaking Changes correctly names the one behaviour change (CONCERNS/empty now reaches 5c) and routes it to CHANGELOG. Testing Strategy covers the router (replay fixture), the preconditions (parity test) and the mutation proof.

### Issues

#### Optional
- **Success Criterion 6** ("Observations #17, #20, #44, #51, #56, #62 close naming this PR") is not verifiable from the repository — the observation log lives in the operator's workspace, outside the tree. QA should treat it as a **post-merge operator action** (`observation-log.js set-status`), not a gate condition. Left as written; noted for QA.
- **Replay fixture placement.** The blanket `.gitignore` rules drop `evals/**/replay/` fixtures unless the negation block at the end of `.gitignore` covers the new path — a fixture that passes locally and is absent in CI is a known trap here. Verify `git status` shows the fixture as tracked before pushing.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Medium risk correctly identified (longer QA cycles from waiting on the background reviewer) with a concrete mitigation (wall-clock budget, `killed at N minutes` never `stalled`). Rollback (`git revert` + bundle) is proportionate for a prose + test change with no data or API surface.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

### Should Fix (Important) - 3 issues

1. Replace the `grep -rn "diminishing" evals/` hint with the real path `evals/shared/tests/pr-review-loop-parity.test.mjs` (Implementation Plan item 1). ✅ Applied
2. Rewrite the Files Summary eval row to `evals/shared/tests/pr-review-loop-parity.test.mjs` (extend) + a new `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` (or similar) for the 3b/10/13 sentences. ✅ Applied
3. Link a tracker issue. ✅ #403 created and linked.

(The `.agents/skills/` → `skills/` path correction in References was applied alongside #1.)

### Consider (Optional) - 2 items

1. Treat SC6 as a post-merge operator action, not a QA gate.
2. Confirm the replay fixture is git-tracked before pushing.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 9/10 (tracker linkage was missing)
- Technical Accuracy: 8/10 (eval pointer wrong; install-path refs)
- Implementation Clarity: 8/10 (Files Summary pointed at the wrong test directory)
- Consistency: 9/10
- Risk Management: 8/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** No critical issues; the three Important findings were all pointer/linkage corrections and are applied. The task is precise about which sentences change in which files, and the machinery it leans on (`probe-boundary-rule.md`, the parity-test family, `qa-diminishing-returns.js`) exists.

---

## Next Steps

Task is ready for implementation. Developer should:

1. Do Phase 1 (router) first and extend `pr-review-loop-parity.test.mjs` before touching prose — the test is the mutation proof.
2. Edit `shared/resources/` sources only; run `npm run bundle` before committing.
3. Keep qa-task and qa-story sentences byte-identical so the parity test holds.
4. Run `npm run ci` before the PR.

---

## Review Metadata

- **Reviewer:** Claude (develop-task pipeline, Step 2)
- **Review Date:** 2026-09-13
- **Review Depth:** Standard
- **Task File:** docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.qa-loop-routes-and-preconditions.md
- **Architecture Docs Consulted:** docs/architecture/concepts/source-tree.md, docs/architecture/concepts/coding-standards.md (via pre-pass Agent B)
- **Pre-pass:** Agent B `alignment: drift` (2 low); Agent C `implementation_status: not-implemented` (8 findings)
