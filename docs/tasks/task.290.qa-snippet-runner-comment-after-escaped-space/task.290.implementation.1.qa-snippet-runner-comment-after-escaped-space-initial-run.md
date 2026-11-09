# Implementation Report: QA snippet runner reads a # after an escaped space as a comment

**Task**: `task.290.qa-snippet-runner-comment-after-escaped-space.md`
**Run Number**: 1
**Started**: 2026-11-09 22:05
**Status**: Escalated

---

## Summary

Make every comment scan in the snippet classifier agree with bash on where a comment starts, make `closingParen` fail closed on deep nesting, and add a differential test that runs what the classifier calls runnable under real bash.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no devLoadAlwaysFiles in skills-config.yaml)                     |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.290.*` exists in git                              | Branch created at `fbdbd872` | —                    | 2026-11-09T20:10Z |
| 2. review-task             | ✅ Done | `task.290.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; 1 Important fixed; status → ready-for-development | —                    | 2026-11-09T20:30Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline; ci:fast green (8279 tests, 0 fail); docs scan 0/0 | —                    | 2026-11-09T20:45Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #867; no issue linked | —                    | 2026-11-09T20:55Z |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.290.qa.{N}.*.md`; `task.290.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.290.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

---

## Decisions Log

### Pipeline Startup — 2026-11-09

- Feature branch base: develop — source: recommended (--defaults, develop-next)
- PR target branch: develop — source: recommended (--defaults, develop-next)
- Pipeline mode: standard — source: detector (risk_level absent, 1 phase, but the task is tagged security and the module boundary is arguable; standard is the safe default)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0 ran inline (no Explore subagents): the document path was known and the detector inputs were read directly.
- Stale lock for task.289 (already accepted, PR #864 merged) moved aside before selection.
- No tracker issue linked (no github_issue) — tracker signals skipped.
- review-task Step 8.5/9 auto-answered: apply fixes, promote to ready-for-development (READY TO IMPLEMENT 8/10).
- Step 3 inline — /develop not invoked: plan file `task.290.plan.*` and a surface map (engine, tests, doc) were both in hand, and the plan names every hunk.
- Step 3 decision: the plan's "skip the character after a backslash outside quotes in `stripNonCode`" was implemented, then reverted. The docs scan against develop's engine showed 1 block newly runnable (`task.83.bug.1…md:102`, a `[\"\']` pattern in two parameter expansions), which breaks the task's "0 newly runnable" criterion and its out-of-scope line "Widening what is runnable". `startsComment` reads the escaped space itself, so the two defects are fixed without it. Final scan: 3441 blocks, 0 newly runnable, 0 newly refused.
- Step 3 decision: success criterion "no extra pass" was reworded as a documentation criterion; a call counter would have meant new production surface only for a test.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

### QA Loop Not Converging — 2026-11-09

The pipeline stopped after 3 qa-task/qa-fix cycles: the HIGH finding count failed to strictly decrease across two consecutive cycles, so the loop was no longer converging. The remaining findings are NOT accepted — they are handed over below.

**Final gate status**: FAIL
**HIGH findings per cycle**: 1, 1, 1 — flat from cycle 1 onward
**Flat-count reading**: discovery — `shared/resources/qa-execute-snippets.mjs`: each cycle's HIGH is a different mechanism (cycle 1 the comment stripper's quotes, cycle 2 the continuation join, cycle 3 the blank class in `startsComment`); the earlier fixes held and each re-probe found new ground in the same family.
**Remaining issues** (from final gate file):
- T290-QA-3 (high, `shared/resources/qa-execute-snippets.mjs`): `startsComment` tests the previous character with `\s`, which includes CR, FF, VT, NBSP and U+2028; bash does not treat those as blanks, so `echo a<CR># ; touch out` classifies runnable and writes. Identical on develop.

**What was attempted per cycle**:
- Cycle 1: gate FAIL (escaped quote and backslash-newline hide code from the comment scan). Fixed by failing closed on both shapes; mutation-proven.
- Cycle 2: gate FAIL (even run of backslashes joined as a continuation). Fixed by joining only an odd run; mutation-proven; 40000-block probe 165 writes to 0.
- Cycle 3: gate FAIL (CR/FF/VT/Unicode spaces accepted as blanks). Not fixed: the convergence check tripped before 5b.

**Likely root cause**: the classifier decides what to run by re-implementing bash's word and comment rules with several regex scanners (the comment stripper, the continuation join, `startsComment`, `blankQuotedSpans`). Each is correct for the shapes tried and wrong for a neighbouring one, and a random differential against real bash keeps finding the next neighbour. Patching the scanners one at a time is the pattern the third-strike rule names. Every finding is identical on `develop`, so none is a regression; the task's own two defects are fixed.

**Third-strike files**: `shared/resources/qa-execute-snippets.mjs` — struck. Mechanism: the per-scanner re-implementation of bash's blank, quote and line-join rules for deciding where a comment starts.

**Recommended next steps**:
1. Replace the struck mechanism rather than patch it: one tokenizer that reads a block the way bash does (blanks are space, tab and newline; quotes; backslash escapes; line joins) and that every scan consumes, refusing anything it cannot read. Or waive T290-QA-3 as a pre-existing residual with a stated reason (the CR/FF/VT forms do not occur in the tracked docs: the docs scan shows 0 changes) and take the replacement as its own task.
2. If a further small patch is wanted instead, the resumed 5b will refuse it; the permitted moves are delete, replace or waive.
3. Decide whether to merge task 290 as it stands: both defects it names are fixed, the three extra HIGH findings are pre-existing and are fixed too except T290-QA-3, and the differential test now holds the class it found.

- Mutation proof (each change reverted, suite run): `startsComment` escape count → 5 gap rows and the differential test red. Fail-closed catch → "never throws" and "deep nesting" tests red. Backslash-outside-quotes skip: reverted by decision (see Decisions Log), so nothing to prove.
- **Not mutation-held:** the iterative `closingParen`. With the catch in place a recursive version still returns `mutating` at depth 20000, and a well-formed nest deep enough to overflow the stack costs seconds (the scan re-masks every level, so cost is quadratic: depth 1000 about 0.1s, 3000 about 0.7s, 20000 about 2.3s). The iterative scan is correct and removes the exception path, but no test fails if it is reverted.
- The sed `#` case (`sedScan`) reads sed's own grammar, not bash's, and was left unchanged; the call-site test lists it as a known non-shell site.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-09
**Gate Result**: FAIL
**Issues Found**: 1 HIGH: a backslash outside quotes (escaped quote, backslash-newline) still hides code from the comment scan; two blocks classify runnable and write under bash (T290-QA-1, bug 1)
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

Fix (cycle 1): T290-QA-1 closed by failing closed on a backslash before a quote outside quotes and on a backslash-newline before a `#` line (no skip of the escaped character: it made a doc block newly runnable). Mutation-proven both throws; docs scan 3442 blocks, 0/0; ci:fast green. Probe: phrase "starts a comment|word start", population 1 (`qa-runnable-prose-detection.md`, updated) plus `CHANGELOG.md` (updated).

---

### QA Cycle 2 — 2026-11-09
**Gate Result**: FAIL
**Issues Found**: 1 HIGH: an even run of backslashes before a newline is joined as a continuation, so a write on the next line classifies runnable (T290-QA-2, bug 2). Cycle 1's finding verified fixed.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

### QA Cycle 3 — 2026-11-09
**Gate Result**: FAIL
**Issues Found**: 1 HIGH: `startsComment` accepts CR, FF, VT and Unicode spaces before a `#`; bash does not (T290-QA-3, bug 3). Cycle 2's finding verified fixed.
**HIGH findings**: 1
**MEDIUM findings**: 0
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Escalating — loop not converging

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: {populated after Step 1}
**PR**: https://github.com/Gamaroff/agent-skills/pull/867
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
