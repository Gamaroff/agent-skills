---
type: implementation-report
status: in-progress
bug: 'bug.6.snippet-classifier-ten-more-fail-open-routes'
mode: 'general'
started: '2026-09-05T19:26:24Z'
updated: '2026-09-05'
description: 'Develop-bug pipeline implementation report for bug.6 — ten fail-open routes and two over-refusals in the qa-execute-snippets classifier.'
---

# Implementation Report — bug.6.snippet-classifier-ten-more-fail-open-routes

**Started:** 2026-09-05T19:26:24Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.6.snippet-classifier-ten-more-fail-open-routes` created at `c9a6be3d`, pushed with upstream tracking | — |
| 2 | review-bug | ✅ Done | validate-and-apply. **10/10 READY TO FIX**; 4 Critical + 9 Important + 1 Optional all auto-applied to the bug report. duplicate=none, reproduces=confirmed-by-execution | 2 Explore pre-pass agents (duplicate, stale) — summarised in the review report |
| 3 | investigate-fix | ✅ Done | Reproduced all 13 by execution; fixed root causes A–D as 4 changes; 74 unit + 8 replay tests green (82 pass / 0 fail); every fix mutation-proven | Localisation reused from the Step 2 stale-scan pre-pass (exact deciding lines) — no redundant Explore dispatched |
| 4 | create-pr | 🔄 In progress | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

## Decisions Log

- 2026-09-05T19:26:24Z — Bug resolved: `docs/bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md` (mode=general, prefix=bug.6.snippet-classifier-ten-more-fail-open-routes)
- 2026-09-05T19:26:24Z — Lock state: no active pipeline lock. `last-halt.json` present but belongs to task.84 (different work item) — not a resume for this bug. Fresh run.
- 2026-09-05T19:26:24Z — Lite mode: **off** — severity=Major, priority=High. Major/Critical/Blocker bugs always run full QA in Steps 5–6.
- 2026-09-05T19:26:24Z — Platform: TRACKER=github, VCS=github (default resolver order; no `tracker:`/`vcs:` keys in skills-config.yaml). Bug has no `github_issue` — TRACKER_ISSUE empty, tracker signalling skipped.
- 2026-09-05T19:26:24Z — Q1 branch model: **bugfix** (user-selected, recommended default). Bug 6 is a defect in this repo's own snippet classifier, not a production regression.
- 2026-09-05T19:26:24Z — Q2/Q3 base branch and PR target: **develop → develop** (user-selected, recommended default).

- 2026-09-05 — review-bug invoked in validate-and-apply mode. Report: `docs/bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.review.1.snippet-classifier-ten-more-fail-open-routes.md`
- 2026-09-05 — Pre-pass duplicate scan: **none**. The predecessors bug.6 cites are `task.67.bug.1`/`task.67.bug.3` (both closed, disjoint input sets), NOT the general `docs/bugs/bug.1`/`bug.3`. Citation corrected in the bug report.
- 2026-09-05 — Pre-pass stale scan: **reproduces: likely**, upgraded to *confirmed* — all 13 claimed inputs were executed through `classifyBlock()` at HEAD `c9a6be3d` and all 13 misclassify. No route is closed by an existing test.
- 2026-09-05 — **Material correction found during review**: the bug report claimed `elif` is not vulnerable. It is. The true swallowing-keyword set is `if, elif, while, until, for, case, esac, done, fi, function` — 10 keywords, not 3. The fix must scan every command in a segment rather than extend the splitter's name list, or `elif`/`for`/`case` stay open.
- 2026-09-05 — Bug review passed — ready to fix. Proceeding to Step 3.
- 2026-09-05 — Step 3 fix summary (5 bullets):
  - **A** `commandWords()` scans every command in a segment instead of stopping at the first token; `COMMAND_INTRODUCING_KEYWORDS` makes the keyword classes explicit; keyword resolution hoisted above the command-name test so `[`/`[[`/`!` are not reported as unreadable; `gitSubcommand()` skips global flags and their operands.
  - **B** `WRITE_REDIRECT` pre-context narrowed to `[^<>&]` — the `\d`/`\w` exclusions were unnecessary because `(?!&\d)` already holds `2>&1`.
  - **C** single `blankQuotedSpans()` walker replaces two quote-blind passes; heredoc openers matched on the raw line then rejected if the `<<` sat inside a quoted span (so `<<'EOF'` keeps shielding its body).
  - **D** `-o` scoped by naming the non-writing commands (`grep`/`find`/…) so unknown commands still fail closed; new `sed w write` deny pattern.
  - Regression tests: `BUG6_FAIL_OPEN` (13) + `BUG6_OVER_REFUSED` (2) in the replay corpus with shrinkage guards and a discriminating pre-fix half at `0c4c05f`; 5 counterweight tests in the unit suite.
- 2026-09-05 — **Mutation proofs** against a baseline of 82 pass / 0 fail: reverting A → 2 failures, B → 1, C → 1, D → 3. Source verified byte-identical after each revert.
- 2026-09-05 — **Two self-inflicted regressions caught and fixed before commit**, both from the first cut of the fix: blanking `<<'EOF'`'s quotes erased the heredoc terminator (bodies stopped being shielded, 4 tests red), and hoisting nothing meant `[` reached the command-name test as unparseable once `if` no longer halted the scan (1 test red). Both are now pinned by counterweight tests.
- 2026-09-05 — **The bug report's own suggested fix would have been insufficient.** Its step 1 said to extend the splitter with `if`/`while`/`until`; that leaves `elif`, `for` and `case` open. The fix scans the segment instead.

## Issues Log

- 2026-09-05 — Signal Work Started skipped: bug.6 has no `github_issue`/`jira_key` in frontmatter (`TRACKER_ISSUE` empty). Expected for a general bug.

## Completion

**Branch:** `bugfix/bug.6.snippet-classifier-ten-more-fail-open-routes` (base: develop @ c9a6be3d)
**PR:** —
**DoD Summary:** —
