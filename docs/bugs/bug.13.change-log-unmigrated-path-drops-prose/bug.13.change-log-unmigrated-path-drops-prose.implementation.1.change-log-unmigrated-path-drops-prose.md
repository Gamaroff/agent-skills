---
type: implementation-report
status: completed
bug: 'bug.13.change-log-unmigrated-path-drops-prose'
mode: 'general'
started: '2026-09-12T06:31:03Z'
---

# Implementation Report — bug.13.change-log-unmigrated-path-drops-prose

**Started:** 2026-09-12T06:31:03Z
**Finished:** 2026-09-12T07:38:03Z
**Final Status:** Completed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 4

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch created at `f8e12200` from develop; issue #389 created, board Todo→In Progress | |
| 2 | review-bug | ✅ Done | READY TO FIX 10/10 (0/0/0); duplicate none; reproduces likely (executed) | pre-pass run in-line, no subagent |
| 3 | investigate-fix | ✅ Done | Fix in change-log.js + block I tests (7), mutation-proved; ci:fast 3162 pass / 0 fail; 25 bundled copies regenerated | |
| 4 | create-pr | ✅ Done | PR #390: https://github.com/Gamaroff/agent-skills/pull/390 (commits a5d18f67 fix, 7be49747 docs) | |
| 5–6 | verify-fix loop | ✅ Done | 4 cycles: FAIL (3 bugs) → FAIL (3 bugs, refute pass) → FAIL (2 bugs) → PASS; commits db3ec482, 9de8b6cd, a972f3d6, aed6306e | review-code Explore subagents ×4 |
| 7 | finalise-close | ✅ Done | DoD bug.13.dod.1 ACCEPTED (inline bug checklist; CI SUCCESS on aed6306e after a 45 s-interval poll); Resolution Summary written; status closed; registry row 13 → closed; #389 closed, board Done | |
| 8 | commit-changes | ✅ Done | Committed in `60ed15af`, pushed; PR #390 open for the develop-next merge gate | |

## Decisions Log

- 2026-09-12T06:31:03Z — Bug resolved: docs/bugs/bug.13.change-log-unmigrated-path-drops-prose/bug.13.change-log-unmigrated-path-drops-prose.md (mode=general, prefix=bug.13.change-log-unmigrated-path-drops-prose)
- 2026-09-12T06:31:03Z — Invoked by develop-next (AUTONOMOUS RUN, item B13 from bug-registry fallback)
- 2026-09-12T06:31:03Z — Q1 branch model: bugfix (auto-answered — not a production regression)
- 2026-09-12T06:31:03Z — Q2 base branch: develop (auto-answered, derived from Q1)
- 2026-09-12T06:31:03Z — Q3 PR target: develop (auto-answered, derived from Q1)
- 2026-09-12T06:31:03Z — Lite mode: off — severity=Major, priority=High (Major never runs lite)
- 2026-09-12T06:31:03Z — TRACKER=github, VCS=github, access full/full

- 2026-09-12T06:34:01Z — Branch created: bugfix/bug.13.change-log-unmigrated-path-drops-prose (base develop @ f8e12200), pushed with tracking
- 2026-09-12T06:34:01Z — GitHub issue #389 created (dedup: 0 matches); board item added, Priority P1; work-started comment posted; card Todo → In Progress
- 2026-09-12T06:35:13Z — review-bug invoked in validate-and-apply mode; pre-pass (duplicate + stale) run in-line by executing the repro rather than via Explore subagents
- 2026-09-12T06:35:13Z — Review report: docs/bugs/bug.13.change-log-unmigrated-path-drops-prose/bug.13.change-log-unmigrated-path-drops-prose.review.1.change-log-unmigrated-path-drops-prose.md — READY TO FIX, no fixes applied; review-bug comment posted on #389
- 2026-09-12T06:42:03Z — Step 3: bug status new → in-progress; reproduction reused from Step 2 (executed recipe); root cause localised in-line at change-log.js `upsertChangeLog` (block regenerated from pipe-lines only) — no Explore subagent, the report's Related Files named the two functions and the reproduction was already executable
- 2026-09-12T06:42:03Z — Step 3 fix: `splitCarriedLines` + `before`/`after` on `buildChangeLogBlock`; carried lines keep their side of the table, inside the markers; between-fragment lines emitted after the table
- 2026-09-12T06:42:03Z — Step 3 tests: block I (7 tests) written first — 7 red / 53 green pre-fix; 60 / 60 post-fix; mutation-proved by stashing the engine alone (7 red, same set). `F: TASK-42-BUG-1` assertion re-stated (fenced heading preserved inside its fence — a deliberate reversal of the "residual, and correct" note)
- 2026-09-12T06:42:03Z — Step 3: `npm run bundle` regenerated 25 `references/change-log.js` copies; prettier applied to both edited source files
- 2026-09-12T06:44:15Z — Step 4: SCOPE_PATHS = [docs/bugs/bug.13.change-log-unmigrated-path-drops-prose, shared/resources, skills]; no out-of-scope untracked files to hold
- 2026-09-12T06:44:15Z — Step 4: /create-pr --base develop --issue 389; /commit-changes split into fix (a5d18f67) + docs (7be49747); leak check OK; PR #390 opened; in-review comment posted on #389
- 2026-09-12T06:44:15Z — Post-PR state check: PR #390 state = OPEN, head 7be49747 = local HEAD. errors = 0
- 2026-09-12T06:44:15Z — GitHub board: in-review → stage-disabled (no `in-review` moment configured for this board; card stays In Progress)
- 2026-09-12T06:45:49Z — Step 5: github 389 — in-qa: stage-disabled

## QA Iteration History

### Verify Cycle 1 — 2026-09-12
**Regression test**: pass (block I, 7/7)
**Suite + lint**: pass (shared/resources + sync-jira-* + tests/: 2087 pass / 0 fail; prettier clean)
**Code review**: 3 blocking findings (CR-1 bug/medium/high, CR-2 bug/medium/medium, CR-3 bug/low/high) + CR-4 cleanup — all three bugs confirmed by probe:
  - CR-1 `splitCarriedLines` strips marker text from every carried line by substring with no fence/inline-code guard — a prose mention in backticks becomes `` `` `` and a fenced marker line is deleted.
  - CR-2 table membership is every `|`-leading line regardless of `protectedRanges` or nesting — a fenced example's entry row is promoted into real history and its fence hollowed out; a nested `###` subsection's own table is torn out and merged into the log as unparsed rows.
  - CR-3 the `between` filter drops blank lines, collapsing a multi-paragraph note moved below the table.
  - CR-4 the pipe-line predicate is defined twice (`splitCarriedLines` and the `unparsed` filter).
**Fast gate**: pass (ci:fast — prettier clean, 3169 / 0; log removed on success)
**Verdict**: FAIL
**Action**: Ran qa-fix (cycle 1 of 5) → commit `db3ec482` pushed; PR + issue fix-summary comments posted
- 2026-09-12T06:59:37Z — Verify Cycle 1 — changes-requested: stage-disabled
- 2026-09-12T06:59:37Z — Cycle 1 qa-fix: no gate/QA artifacts (general bug) — fix list = the four review-code findings, all unambiguous; codebase-mapping subagent skipped (same file as Step 3, patterns known); fix rewritten as one classifier over protected ranges; adversarial pass (3.5) closed 3 residual edges; 67/67; mutation-proved vs a5d18f67 (4 red); ci:fast 3169/0; commit db3ec482

### Verify Cycle 2 — 2026-09-12
**Regression test**: pass (block I, 14/14)
**Suite + lint**: pass (2094 pass / 0 fail; prettier clean)
**Code review**: refute pass — 3 bugs (CR-1 high/high, CR-2 low/high, CR-3 low/medium) + 2 cleanups (CR-4, CR-5), CR-1/2/3 confirmed by probe:
  - CR-1 a carried fenced `<!-- change-log-end -->` is matched by the next write's `findMarkerBlock`, whose lazy regex guards only the START index — the block ends inside the fence, the real table is stranded outside it (`extractEntries` → 0), and an end marker accumulates per write. Reachable only now that fenced content survives write 1.
  - CR-2 line protection is tested at line start, so a boundary line beginning with an inline-code span keeps its end marker un-stripped (ends=2).
  - CR-3 a nested heading *before* the table closes classification before any row is seen, demoting existing rows from history to carried prose (`extractEntries` N → 0).
  - CR-4 `collapseOtherLegacyBlocks` still harvests other blocks' rows with a bare `isEntryRow` filter, bypassing the classifier.
  - CR-5 `protectedRanges` recomputed per call (declined — see Decisions Log).
**Fast gate**: pass (ci:fast — prettier clean, 3174 / 0; log removed on success)
**Verdict**: FAIL
**Action**: Ran qa-fix (cycle 2 of 5) → commit `9de8b6cd` pushed; PR fix-summary comment posted; issue comment returned `already` (see Issues Log)
- 2026-09-12T07:14:21Z — Verify Cycle 2 — changes-requested: stage-disabled
- 2026-09-12T07:14:21Z — Cycle 2 qa-fix: CR-1 both ends of the marker scan guarded (indexOf; blockRe/escapeRe removed); CR-2 two-grain protection (fences whole-line; markers/heading at their own offsets); CR-3 nested heading closes the table only after a table line; CR-4 collapseOtherLegacyBlocks through the classifier; CR-5 declined (negligible cost, public-shape widening). 72/72; mutation-proved vs db3ec482 (5 red); adversarial probes CRLF / no-trailing-NL / legacy H3 migration hold; ci:fast 3174/0; commit 9de8b6cd

### Verify Cycle 3 — 2026-09-12
**Regression test**: pass (block I, 19/19)
**Suite + lint**: pass (2099 pass / 0 fail; prettier clean)
**Code review**: narrowed pass — 2 bugs (CR-1 medium/high, CR-2 low/high) + 1 cleanup (CR-3), both bugs confirmed by probe:
  - CR-1 the cycle-2 sweep change reads only `tableLines` from a *stray* block, so an entry row after a nested heading inside that block is classified as prose — and the sweep then deletes the whole block, erasing the row (`Row B` gone; 3 entries where cycle 1 gave 4). History loss on the sweep path.
  - CR-2 a block whose start and end markers share one line: `idx` is computed on the line *after* the start marker was sliced off, so the end-marker protection check is short by `start.length` and can land inside an inline span (2 end markers after one write).
  - CR-3 the `insideProtected` guards on the exact-marker line, the heading line and the start-marker strip are unreachable (a line whose first non-blank character is a backtick can match none of them; `found.start` is already known unprotected).
**Fast gate**: pass (ci:fast — prettier clean, 3176 / 0; log removed on success)
**Verdict**: FAIL
**Action**: Ran qa-fix (cycle 3 of 5) → commit `a972f3d6` pushed; PR fix-summary posted; issue comment `already` (obs #66)
- 2026-09-12T07:26:10Z — Verify Cycle 3 — changes-requested: stage-disabled
- 2026-09-12T07:26:10Z — Cycle 3 qa-fix: CR-1 `unfencedLines` returned by the classifier, sweep harvests entry rows from it; CR-2 `shift` accumulator on the boundary strip; CR-3 three unreachable guards removed with rationale. 74/74; mutation-proved vs 9de8b6cd (2 red); ci:fast 3176/0; commit a972f3d6
- 2026-09-12T07:26:10Z — Convergence: cycle findings 4 → 5 → 3, each cycle's findings confined to the previous cycle's diff; cycle 3's are two edge cases in the sweep and the single-line-block path. No HIGH finding in cycles 1 or 3 — no third strike.

### Verify Cycle 4 — 2026-09-12
**Regression test**: pass (block I, 21/21)
**Suite + lint**: pass (2101 pass / 0 fail; prettier clean)
**Code review**: clean — 0 bugs; 2 cleanups: CR-1 stale return-contract comment (applied, `aed6306e`, comment only); CR-2 drop the now-unreachable end-marker guard + `shift` (declined — no behaviour change; not worth a fifth cycle after PASS; the reviewer's 40k-document fuzz never saw it fire)
**Fast gate**: n/a
**Verdict**: PASS
**Action**: Proceeding to finalise
- 2026-09-12T07:33:49Z — Verify Cycle 4 PASS; QA Verification written into Iteration 4; github 389 — ready-for-merge: stage-disabled
- 2026-09-12T07:37:46Z — Step 7 Part A: /finalise invoked; for a bug document the DoD ran as the documented inline checklist (fix evidence, mutation proofs, bundled-copy parity, suite+lint, docs; security/compliance N/A for a pure string engine); CI rollup PENDING at start (test job in progress) → polled at 45 s → SUCCESS on the same head aed6306e; ACCEPTED. Canonical PR comment posted (marker). registry-tick → not-a-task. Iteration 1's QA Verification template stub filled with the real cycle-1 outcome. No Change Log row (bug exclusion), no `status: accepted` (bug lifecycle), no sprint-review artifact for a bug.
- 2026-09-12T07:37:46Z — Step 7 Part B: Resolution Summary written (4 iterations, same-day); frontmatter status closed + body ✅ Closed; final Status History row; bug-registry row 13 → closed; issue #389 Source Documents links re-pointed to develop; done comment posted; issue closed (state CLOSED verified); board done → already (Done)

## Issues Log

- 2026-09-12T06:34:01Z — Step 1: first `gh issue create` failed — labels `priority:High` / `severity:Major` do not exist in this repo (labels are lowercase `priority:*`, no `severity:*`). Retried with `priority:high` only. Logged as obs #65.

- 2026-09-12T07:14:21Z — Cycle 2 qa-fix issue comment: `tracker-comment.js --stage qa-fix` returned `already` — the stage is not cycle-indexed, so the second fix cycle's summary was deduped against the first and never posted to #389 (the PR comment landed). Non-blocking. Logged as obs #66.
- 2026-09-12T07:14:21Z — Noted, out of scope: `collapseOtherLegacyBlocks` removes a stray/legacy block *entirely* — its rows are merged but any prose inside it is dropped. Pre-existing collapse semantics for transitional duplicate blocks, not the authored primary section bug.13 covers; not changed.

## Completion

**Completion Summary:** Fixed `shared/resources/change-log.js` so a Change Log write carries prose and nested subsections through instead of regenerating the section from pipe-lines alone. One initial fix plus three verify-loop corrections: cycle 1 found the classifier ignored protected ranges and nesting; cycle 2 (full-diff refute pass) found the pre-existing marker locator guarded only one end — reachable only once fenced content survived a write; cycle 3 found the sweep dropped nested rows from a stray block; cycle 4 passed clean. 21 block-I tests, each sub-block mutation-proved against the engine it corrects; ci:fast green every cycle; CI rollup SUCCESS on the accepted head. Notable decisions: pre-pass and root-cause localisation run in-line (executable repro); the TASK-42-BUG-1 test's "residual, and correct" note deliberately reversed; cycle-4 cleanup CR-2 declined after PASS. Two observations logged (#65 label-case create failure; #66 qa-fix stage not cycle-indexed).


**Branch:** bugfix/bug.13.change-log-unmigrated-path-drops-prose
**PR:** https://github.com/Gamaroff/agent-skills/pull/390
**DoD Summary:** docs/bugs/bug.13.change-log-unmigrated-path-drops-prose/bug.13.dod.1.change-log-unmigrated-path-drops-prose.md
