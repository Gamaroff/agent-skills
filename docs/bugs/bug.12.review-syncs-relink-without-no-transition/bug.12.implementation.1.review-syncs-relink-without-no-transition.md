---
type: implementation-report
status: complete
bug: 'bug.12.review-syncs-relink-without-no-transition'
mode: 'general'
started: '2026-09-06T19:20:00Z'
---

# Implementation Report — bug.12.review-syncs-relink-without-no-transition

**Started:** 2026-09-06T19:20:00Z
**Finished:** 2026-09-06T18:55:00Z
**Final Status:** ✅ Complete — bug closed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / Medium
**Lite mode:** off
**Fix Iterations:** 2

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.12.review-syncs-relink-without-no-transition` created at `3469b793`, pushed with upstream tracking | |
| 2 | review-bug | ✅ Done | READY TO FIX, 9/10. Critical 0 / Important 1 / Optional 2. Duplicate none, reproduces likely. 4 corrections applied to the bug report | `bug.12.review.1.review-syncs-relink-without-no-transition.md` |
| 3 | investigate-fix | ✅ Done | Fix at 3 sites + regression tests G/G2/G3; mutation-proved 5 ways; ci:fast 2504 pass | pre-pass B reused as localisation evidence |
| 4 | create-pr | ✅ Done | PR #330 → develop; commit `ba4b6c1b`. No tracker issue, so no issue comment | |
| 5–6 | verify-fix loop | ✅ Done | 2 cycles: C1 FAIL (fence defect in the guard) → fix `00030655` → C2 PASS | code review clean on cycle-1 diff; full-PR review incomplete |
| 7 | finalise-close | ✅ Done | DoD satisfied (6 met, 1 gap recorded non-blocking); bug closed; registry row → `closed` | inline bug-shaped DoD, method note recorded |
| 8 | commit-changes | ✅ Done | Final commit + push; lock removed | |

## Decisions Log

- 2026-09-06T19:20:00Z — Selected by `/develop-next` from the bug-registry fallback frontier (item B12); no roadmap phase held an actionable row.
- 2026-09-06T19:20:00Z — Bug resolved: `docs/bugs/bug.12.review-syncs-relink-without-no-transition/bug.12.review-syncs-relink-without-no-transition.md` (mode=general, prefix=bug.12.review-syncs-relink-without-no-transition)
- 2026-09-06T19:20:00Z — Lite mode: **off** — severity=Major (Major/Critical/Blocker always run full QA regardless of priority).
- 2026-09-06T19:20:00Z — Phase 0d Q1 branch model: **bugfix** (auto-answered, recommended default) — the bug is a pipeline-behaviour defect, not a production regression.
- 2026-09-06T19:20:00Z — Phase 0d Q2 base branch: **develop** (auto-answered, derived from Q1).
- 2026-09-06T19:20:00Z — Phase 0d Q3 PR target: **develop** (auto-answered, derived from Q1).
- 2026-09-06T19:20:00Z — TRACKER=github, VCS=github (git remote). Bug has no `github_issue`/`jira_key` — tracker stage signals skipped throughout.
- 2026-09-06T17:31:06Z — Step 1: branch `bugfix/bug.12.review-syncs-relink-without-no-transition` cut from `develop` at `3469b793`; pipeline lock written (`current_step: 2`). Signal Work Started skipped — bug has no tracker issue.
- 2026-09-06T17:35Z — Step 2 pre-pass A (duplicate): `none` — bug.11 explicitly deferred CR-1 to bug.12 to hold its PR scope; registry rows carry distinct areas.
- 2026-09-06T17:35Z — Step 2 pre-pass B (stale): `reproduces: likely` — all three sites confirmed flagless on current develop at `review-story:2060`, `review-task:1482`, `review-epic:767`.
- 2026-09-06T17:35Z — Scope confirmed **Jira-only**: `syncDocumentStatus` has no `sync-github-*` caller, so the three sites are the complete enumeration rather than a sample.
- 2026-09-06T17:35Z — Resolved the scope question raised by the corrected Recommendation: `review-task` Step 8.6 runs BEFORE Step 9's local promotion, so the status it pushes today is the pre-promotion (stale) value. Adding `--no-transition` removes a wrong write, not a needed one.
- 2026-09-06T17:35Z — Recommendation item 3 (parity guard over shipped prose) treated as **in scope** — it is what prevents the next silent addition, which is the failure mode that produced this bug.
- 2026-09-06 — Step 7: `/finalise` invoked; its **inline fallback** taken deliberately — the four DoD agents are story/task-shaped (AC traceability, compliance) and a general bug has neither acceptance criteria nor a parent story. Bug-shaped DoD run inline and recorded with a method note, per the fallback's own condition and the `bug.11` precedent.
- 2026-09-06 — Step 7: tracker close **N/A** — bug has no `github_issue`/`jira_key`. `done` stage signal skipped for the same reason.
- 2026-09-06 — Step 7: `docs/bugs/bug-registry.md` row 12 flipped `new` → `closed`; Next Available Bug Number untouched (numbers are never reused).
- 2026-09-06T17:50Z — Step 3 fix (5 bullets): (1) `--no-transition` added at review-story 9.6, review-task 8.6, review-epic 11.5; (2) each site documents why the flag is there; (3) review-story Step 10 documents why it deliberately omits it; (4) regression tests G/G2/G3 assert the population invariant; (5) no behaviour change to `jira-sync.js` — bug.11's engine was already correct.
- 2026-09-06T17:50Z — Regression test name: `G: every writing sync-jira-* invocation is flagged or allowlisted` (+ G2 stale-allowlist, G3 site-pinning) in `shared/resources/tests/jira-sync-no-transition.test.mjs` — an existing file already inside the `npm test` glob, so the suite cannot be orphaned.
- 2026-09-06T17:50Z — No fresh Explore dispatched for root-cause localisation: Step 2's pre-pass B already returned file:line for all three sites plus the engine gate at `jira-sync.js:4194`. Re-running it would have re-derived a settled answer.
- 2026-09-06T19:20:00Z — `last-halt.json` present but belongs to task.84 (different work item, no active lock) → fresh run, snapshot left untouched.

## QA Iteration History

### Verify Cycle 1 — 2026-09-06
**Regression test**: pass — G/G2/G3 green (22/22 in the guard file)
**Suite + lint**: pass — `npm run ci:fast` 2504 pass / 0 fail, Prettier clean (`.claude/state/bug12-verify-1.log`)
**CI on PR #330**: SUCCESS — all 5 checks (test, validate, link-check, shellcheck, branch-policy); PR head `ba4b6c1b` == local HEAD
**Behavioural check**: all three shipped command shapes parse `--no-transition` under bash, including review-story's conditional `${PIN_BRANCH:+--doc-branch ...}` form; a bogus-flag negative control confirms the parser does reject unknown options, so the pass is not vacuous
**Code review**: ⚠️ **INCOMPLETE — the subagent was stopped, not clean.** The adversarial reviewer ran ~17 min without returning findings and was killed per the repo's stale-subagent rule. It had produced one substantive diagnostic before being stopped (a repo-wide fence-desync detector reporting 3 files with odd fence counts), which was reproduced independently in-line. The four other risks it was asked about were then verified in-line: 0 invocations skipped by the `i = end` advance, no read-only/write command overlap, every allowlist prefix matches exactly one heading, 34 sites against a floor of 10. **No independent review of this diff completed** — treat that as a gap in the trail, not as a clean pass.
**Fast gate**: see Cycle 2
**Verdict**: **FAIL** — a real defect was found in the guard itself (naive fence toggle → latent false-pass path). Fix applied as Iteration 2.
**Action**: Running fix cycle 1 of 5

### Verify Cycle 2 — 2026-09-06
**Regression test**: pass — G/G2/G3/G4 green (23/23), each mutation-proved
**Suite + lint**: pass — `npm run ci:fast` 2505 pass / 0 fail, Prettier clean (`.claude/state/bug12-fixgate-1.log`)
**CI on PR #330**: SUCCESS — all 5 checks; PR head `00030655` == local HEAD
**Code review**: clean — no findings, but **scoped to the cycle-1 diff only**; the full-PR review from Cycle 1 never completed
**Fast gate**: pass (`.claude/state/bug12-fixgate-1.log`)
**Verdict**: **PASS**
**Action**: Proceeding to Step 7 (finalise + close)

## Issues Log

- 2026-09-06 — **The bundler rewrote a path inside my own explanatory sentence.** The Step 10 note said the bundler treats a `shared/resources/…` mention as a resource to copy; the bundler then rewrote that very token to `references/…`, leaving the sentence circular and wrong. Rephrased to name the file without a literal path. In this repo a path in shipped prose is an instruction, not inert text — including a path written *to warn about paths*.

- 2026-09-06 — **The adversarial code reviewer did not complete.** Dispatched at ~18:00, still running at ~18:17, stopped. Its partial output supplied the fence-desync lead; everything else in signal 3 was verified in-line by the orchestrator, which is not an independent review. Recorded here because a missing review that looks like a passing one is the failure this note exists to prevent.
- 2026-09-06 — **Two invalid mutation attempts were discarded before a valid one.** The first broke the test file's syntax (0 tests ran — proves nothing); the second injected a fence block with an *even* line count, which the naive toggle recovers from, so old and new logic agreed and the mutation demonstrated nothing. Only an odd-count nested fence reproduced the defect. A mutation that does not actually reproduce the defect is worse than none, because it is logged as proof.

- 2026-09-06 — **Prettier failed the first `ci:fast`** on the new test file. Caught by the fast gate before the PR, which is the reason `npm run ci` (not `npm test`) is the merge gate. Fixed with `prettier --write`.
- 2026-09-06 — **`npm run bundle` crashed on my first draft of the Step 10 note.** Writing the literal path `shared/resources/tests/…` in shipped SKILL.md prose makes the bundler try to copy that file into `skills/review-story/references/tests/`, and it does not create nested parent dirs. The convention is that *any* `shared/resources/…` mention in shipped prose means "bundle this" — so a test file must not be named by path there. Note rephrased; bundle now exits 0 with no drift. The bundler's inability to create nested reference dirs is pre-existing and left alone as out of scope.
- 2026-09-06 — **Bug report contained a factual error, corrected in Step 2.** Recommendation item 2 asked the fixer to protect `review-task` Step 9 as an "intentional status push". That step performs no tracker sync at all. `review-story` Step 10 is the only deliberate push among these skills. Corrected in the bug report and recorded in the review report.


## Completion

**Branch:** `bugfix/bug.12.review-syncs-relink-without-no-transition`
**PR:** https://github.com/Gamaroff/agent-skills/pull/330
**DoD Summary:** [`bug.12.dod.1.review-syncs-relink-without-no-transition.md`](./bug.12.dod.1.review-syncs-relink-without-no-transition.md) — ✅ SATISFIED (6 criteria met, 1 gap recorded and judged non-blocking)

## Completion Summary

**Outcome**: bug.12 fixed, verified and closed in one pipeline run. Two fix iterations.

**What shipped**
- `--no-transition` at the three body/link-only Jira syncs (`review-story` 9.6, `review-task` 8.6,
  `review-epic` 11.5), each with a call-site rationale.
- The mirror-image note at `review-story` Step 10 recording why it deliberately omits the flag.
- Parity guard **G/G2/G3/G4** asserting the invariant over the whole population of shipped
  invocations, not the four sites anyone happened to list.

**Evidence**: 23/23 guard tests, six executed mutations each proving a specific test fails without
its fix, `npm run ci:fast` 2505 pass / 0 fail, all five CI checks green on `00030655` (== local HEAD),
`npm run bundle` + `generate-catalog` clean.

**Honest gaps**
- The full-PR adversarial review never completed (subagent stopped after ~17 min). Its one lead was
  reproduced independently and the other four risks verified in-line; a scoped review of the cycle-1
  diff completed clean. Recorded in the DoD as a non-blocking gap rather than smoothed over.

**Two convention traps hit and recorded**, both specific to this repo and both silent:
- A `shared/resources/…` path in shipped prose is an instruction to the bundler to copy that file
  into the skill — including when the path is written in order to warn about paths.
- Prettier covers `docs/` too, so a doc edit after a green gate can still turn CI red.
