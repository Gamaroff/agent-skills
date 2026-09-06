---
type: implementation-report
status: complete
bug: 'bug.11.finalise-relink-regresses-terminal-status'
mode: 'general'
started: '2026-09-06T15:34:47Z'
---

# Implementation Report — bug.11.finalise-relink-regresses-terminal-status

**Started:** 2026-09-06T15:34:47Z
**Finished:** 2026-09-06T16:59:28Z
**Final Status:** ✅ Complete — bug closed, PR #329 open and green, awaiting merge
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 4

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | `bugfix/bug.11.finalise-relink-regresses-terminal-status` from `develop` at `39b8e871`; no tracker issue → Signal Work Started skipped | — |
| 2 | review-bug | ✅ Done | validate-and-apply: **READY TO FIX 9/10**; 3 Critical + 5 Important auto-applied to the bug report; duplicate=none, reproduces=likely | `bug.11.review.1.finalise-relink-regresses-terminal-status.md` |
| 3 | investigate-fix | ✅ Done | `--no-transition` on all 3 syncs, gated inside `syncDocumentStatus`; finalise Step 7 passes it. 16 regression tests, 5 mutation proofs. `ci:fast` 2498 pass / 0 fail | — |
| 4 | create-pr | ✅ Done | [PR #329](https://github.com/Gamaroff/agent-skills/pull/329) → `develop`; commit `9ff3cf6e`, 39 files, no out-of-scope leak | — |
| 5–6 | verify-fix loop | ✅ Done | 4 cycles: 1 FAIL (`21c78537`), 2 FAIL (`6f0263e0`), 3 FAIL (`c8bde1bd`), 4 **PASS** | 3 × `/review-code` rounds |
| 7 | finalise-close | ✅ Done | Bug-shaped DoD **satisfied**; CI waited for (PENDING → SUCCESS) and green on the final commit; bug `closed`; registry row flipped | `bug.11.dod.1.*.md` |
| 8 | commit-changes | ✅ Done | Final report + DoD + closed bug + registry committed and pushed | — |

## Decisions Log

- 2026-09-06T15:34:47Z — Invoked by `/develop-next` (roadmap orchestrator). Selection source: `bug-registry` (B11); no authored phase held an actionable row.
- 2026-09-06T15:34:47Z — Bug resolved: docs/bugs/bug.11.finalise-relink-regresses-terminal-status/bug.11.finalise-relink-regresses-terminal-status.md (mode=general, prefix=bug.11.finalise-relink-regresses-terminal-status)
- 2026-09-06T15:34:47Z — Phase 0b: no active pipeline lock. `last-halt.json` present but belongs to task.84 (merged 2026-09-05) — stale, not a resume for this bug. Fresh run.
- 2026-09-06T15:34:47Z — Phase 0c: status=new, severity=Major, priority=High. Lite mode **off** (Major severity is excluded from lite mode by the develop-bug rule). No `github_issue`/`jira_key` in frontmatter → TRACKER_ISSUE empty; tracker signalling skipped throughout.
- 2026-09-06T15:34:47Z — Phase 0d Q1 branch model: **bugfix** — auto-answered (recommended default). This is a skill-library defect in `sync-jira-*`/`finalise`, not a production regression; no "production"/"hotfix" marker in the report.
- 2026-09-06T15:34:47Z — Phase 0d Q2 base branch: **develop** — auto-answered, derived from Q1.
- 2026-09-06T15:34:47Z — Phase 0d Q3 PR target: **develop** — auto-answered, derived from Q1.
- 2026-09-06T15:34:47Z — Platform: VCS=github, TRACKER=github, ACCESS_TRACKER=full, ACCESS_VCS=full.
- 2026-09-06T15:34:47Z — Scope note carried into Step 3: PR #326 shipped Recommendation item 1 (the Step 7 documentation fix). Item 2 — a `--no-transition` flag on `sync-jira-{story,task,epic}` passed by finalise's re-link — is the outstanding durable fix and is what this run must deliver.
- 2026-09-06T15:35:49Z — Step 1: branch name is the canonical `bugfix/{bug-prefix}`. PR #326 used the same name and was merged+deleted, so there is no collision; the name is kept because `review-pr` resolves a PR back to its work item by stripping `bugfix/` and looking for `*/${STEM}/${STEM}.md` — a decorated name would break that resolution.
- 2026-09-06T15:37:50Z — Step 2 pre-pass run **inline rather than via Explore subagents**. Both checks reduce to exact greps (`--no-transition` across `skills/`+`shared/`; sibling bugs + registry rows), so an inline run is faster and leaves reproducible evidence in the review report. Recorded so the substitution is visible.
- 2026-09-06T15:37:50Z — Step 2 confirmed **not STALE** despite PR #326 having merged: #326 shipped Recommendation item 1 (the finalise Step 7 doc fix) only. `grep -rn -- '--no-transition'` returns one hit — `skills/finalise/SKILL.md:1129`, prose describing the fix — and `syncDocumentStatus` is still unconditional at four call sites.
- 2026-09-06T15:37:50Z — Step 2 auto-applied 8 bug-report fixes (3 Critical: Developer Fix Cycle / Status History / Resolution Summary sections; 5 Important: Evidence section, Environment, Frequency+Reproducible, and two canonical heading renames). Severity/priority **unchanged** — Major/High confirmed correct.
- 2026-09-06T15:53:39Z — Step 3 fix summary:
  - Gate placed **inside** `syncDocumentStatus` (before any HTTP), not at the four call sites — a per-caller check is only as strong as the least-updated caller.
  - `--no-transition` added to `sync-jira-{task,story,epic}` and forwarded at all four call sites.
  - Outcome reason is `transition-suppressed`; `summariseStatusOutcome` exits 0 for it so the flag composes with `--fail-on-status-skip`.
  - `finalise` Step 7 block 3 passes the flag; the falsified "the sync no-ops" prose corrected and block 4 reframed as confirmation.
  - Regression suite `shared/resources/tests/jira-sync-no-transition.test.mjs` (16 tests), confirmed matched by the existing `npm test` glob.
- 2026-09-06T15:53:39Z — **Two defects found and fixed during the fix, both worth recording.** (1) `sync-jira-epic` has TWO `syncDocumentStatus` call sites; the first patch wired only one, and every behavioural test still passed — test E now pins every call site, and E2 pins the count. (2) The first version reused the reason name `no-transition`, which already means the OPPOSITE in this module (the board offers no matching transition — a real skip). Adding it to `summariseStatusOutcome`'s zero-exit list would have silently stopped every genuine skip from failing under `--fail-on-status-skip`. Renamed to `transition-suppressed`; test B2 pins the two apart.
- 2026-09-06T15:53:39Z — Out of scope, deliberately: `review-story`'s `--doc-branch` sync still drives status. There the transition is the point, and the bug names only finalise's re-link. Also out of scope per the bug's own text: reversing the Step 7 block order back to sync-first.
- 2026-09-06T15:53:39Z — `npm run bundle` re-bundled `jira-sync.js` and `develop-pipeline-step-7-finalise.md` into consumer skills' `references/`. It also emitted a previously-missing `skills/develop-next/references/document-status-lifecycle.md` — pre-existing bundle drift, unrelated to this fix, included because leaving the tree unbundled is what makes the next run silently revert a fix.
- 2026-09-06T15:55:33Z — Step 4 staged with `--scope docs/bugs/bug.11.… --scope shared --scope skills --scope CHANGELOG.md`. All 39 changed paths fell inside scope; leak check and secret scan both clean. The implementation report was included in this first commit deliberately — Step 4 is where its first commit belongs, and withholding a file that tracked documents link to produces a CI-only dangling link.
- 2026-09-06T15:55:33Z — A pre-commit hook re-ran `npm run bundle` and reported every skill in sync, independently confirming the bundled `references/` copies match `shared/resources/`.
- 2026-09-06T16:59:09Z — Step 7 Part A ran the **bug-shaped DoD inline** rather than through the four story/task DoD subagents. A general bug has no acceptance criteria and no parent story, so the AC-traceability and compliance agents have no input; `/finalise` sanctions this fallback for a document type it cannot process and requires it to be recorded, which the DoD file's method note does.
- 2026-09-06T16:59:09Z — **CI was waited for, not assumed.** The first rollup read of PR #329 was `PENDING` (`test` IN_PROGRESS, four other jobs green). Acceptance was held and the rollup polled in the background until `SUCCESS`. PR head `c8bde1bd` matches local HEAD, so the green is on the final commit, not an ancestor.
- 2026-09-06T16:59:09Z — Step 7 Part B: Resolution Summary written (4 iterations, 6 lessons), bug `ready-for-qa → closed`, `docs/bugs/bug-registry.md` row 11 flipped to `closed`. **Next Available Bug Number left at 13** — numbers are never reused. Tracker close N/A (no linked issue).

## QA Iteration History

### Verify Cycle 1 — 2026-09-06
**Regression test**: pass (16/16)
**Suite + lint**: pass — `npm run ci:fast` exit 0, 2499 tests, format clean
**Code review**: 6 findings — 1 bug (CR-1, medium confidence, other call sites) + 5 cleanups, 4 of them fix-introduced
**Fast gate**: pass — `npm run ci:fast` exit 0, 2500 tests (log removed on green)
**Verdict**: FAIL
**Action**: Running fix cycle 1

> **Why FAIL when the only `bug`-typed finding was medium-confidence and about other files.**
> The letter of the rule blocks on high-confidence *correctness* findings only, and by that letter
> this cycle passed. It is recorded as FAIL because four of the cleanups were defects this fix had
> just introduced — including CR-5, a **tautological test that the Iteration 1 record had cited as
> evidence**. Shipping on the letter would have left the bug's own fix record overstating what its
> tests proved, which is the failure mode the record exists to prevent.

**Commit**: `21c78537`

### Verify Cycles 2–4 — 2026-09-06
**Regression test**: pass (17/17)
**Suite + lint**: pass — `npm run ci:fast` exit 0, 2500 tests, format clean
**Code review**: rounds 2 and 3 re-reviewed the deltas and drove cycles 2 and 3; cycle 4's check was a direct line-by-line read of the two prose blocks cycle 3 rewrote — `finalise` Step 7 blocks 3 and 4 now name the same reachable causes and agree
**Fast gate**: n/a — cycle passed at 5a, so 5b never ran
**Verdict**: PASS
**Action**: Proceeding to Step 7 (finalise + close)

## Issues Log

## Completion Summary

The durable half of bug.11's recommendation shipped: `sync-jira-{story,task,epic}` can now be asked
not to touch status, and finalise's Document-link re-point asks. The gate lives inside
`syncDocumentStatus`, so it holds for every caller and can be asserted as "no HTTP request was
issued" rather than inferred from a return value.

**What it cost, honestly.** Four fix iterations, three of them spent on defects the *fix* introduced
rather than on the bug itself:

- a **tautological test** cited as evidence in the iteration-1 record (`buildChangeLogEntries` never
  reads `reason`, so the assertion held for any input);
- a **fixture** that kept that test blind to gate deletion even after it was rewritten to run
  end-to-end — caught only because a reviewer ran the deletion instead of trusting the mutation
  chosen for it;
- a **replacement rationale that was backwards**, asserting ladder-first protects a case where the
  sync demonstrably writes last;
- a **docs-only sweep** that missed the one occurrence of an absolute that prints to a user.

Two of those (the tautology and the backwards rationale) had already been written into the bug's own
fix record as evidence before being caught. That is the specific failure this pipeline's verify loop
exists to prevent, and it took three review rounds to exhaust — worth recording plainly rather than
smoothing over, because the tests and prose that now ship are the ones that survived it.

**Carried, not dropped:** review finding CR-1 became `bug.12` — three other body/link-only syncs
still re-resolve status. Out of bug.11's stated scope; filed with a registry row so the loop will
pick it up.

**Left for the operator:** PR #329 is open and green; `/develop-next` Step 3 merges it.

## Completion

**Branch:** `bugfix/bug.11.finalise-relink-regresses-terminal-status`
**PR:** [#329](https://github.com/Gamaroff/agent-skills/pull/329)
**DoD Summary:** [`bug.11.dod.1.finalise-relink-regresses-terminal-status.md`](./bug.11.dod.1.finalise-relink-regresses-terminal-status.md) — ✅ satisfied
