---
type: implementation-report
status: in-progress
bug: 'bug.1.ready-for-development-candidates'
mode: 'general'
started: '2026-08-04T11:37:12Z'
description: 'develop-bug pipeline implementation report for bug.1 — ready-for-development cannot match a Jira column named "Ready for Development".'
tags: [implementation-report, bug, jira-sync, status-mapping]
---

# Implementation Report — bug.1.ready-for-development-candidates

**Started:** 2026-08-04T11:37:12Z
**Finished:** 2026-08-04T12:08:00Z
**Final Status:** ✅ Complete — Bug Closed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Minor / Medium
**Lite mode:** off
**Fix Iterations:** 1 (verification passed on cycle 1 of 5; no `/qa-fix` reopen)

## Pipeline Progress

| Step | Skill              | Status     | Notes | Subagent summary ref |
| ---- | ------------------ | ---------- | ----- | -------------------- |
| 1    | create-branch      | ✅ Done    | Branch `feature/bug.1.ready-for-development-candidates` already existed at develop's tip (`6d07f0a`), created by the prior `/review-bug` run — Step 1 post-condition verified rather than re-invoking `/create-branch`. Pushed to origin; lock written; issue #191 commented. | |
| 2    | review-bug         | ✅ Done    | Gate satisfied by existing `review.1` (9/10, READY TO FIX, 0 critical, duplicate: none, reproduces: likely/high). Not re-invoked — see Decisions Log. | `bug.1.ready-for-development-candidates.review.1.ready-for-development-candidates.md` |
| 3    | investigate-fix    | ✅ Done    | Reproduced verbatim; root cause at `jira-sync.js:1421`/`:1427`. Option 4 implemented + 11-test regression suite. Fails-without proven by stash-revert. 734/734 `npm test`; existing Jira suites 30/30 unchanged. Bug → `ready-for-qa`. | n/a — direct reads (line numbers supplied by the report) |
| 4    | create-pr          | ✅ Done    | PR [#192](https://github.com/Gamaroff/agent-skills/pull/192) → `develop`. Two commits: `6c7c23b` (fix) + `cd43e48` (bug docs). Issue #191 commented. | |
| 5–6  | verify-fix loop    | ✅ Done    | **PASS on cycle 1 of 5** — all 3 signals green. No `/qa-fix` cycle needed. | |
| 7    | finalise-close     | ✅ Done    | DoD satisfied (inline fallback + full CI gate). Resolution Summary written; bug → `closed`; registry row → `closed`; issue #191 closed (verified). | `bug.1.ready-for-development-candidates.dod.1.ready-for-development-candidates.md` |
| 8    | commit-changes     | ✅ Done    | Final report + DoD + registry committed; pushed; lock removed. | |

## Pipeline Configuration

| Setting        | Value                                            |
| -------------- | ------------------------------------------------ |
| Pipeline mode  | standard                                         |
| Bug mode       | general                                          |
| Tracker        | github (issue #191)                              |
| VCS            | github                                           |
| Branch model   | bugfix                                           |
| Base branch    | develop                                          |
| PR target      | develop                                          |

## Decisions Log

- 2026-08-04T11:37:12Z — Bug resolved: `docs/bugs/bug.1.ready-for-development-candidates/bug.1.ready-for-development-candidates.md` (mode=general, prefix=`bug.1.ready-for-development-candidates`)
- 2026-08-04T11:37:12Z — Pipeline lock check: no active lock, no `last-halt.json` snapshot → fresh run.
- 2026-08-04T11:37:12Z — Lite mode: **off**. Severity/priority (Minor/Medium) qualify under the bug-specific gate, but the shared lite-mode heuristic does not: the fix touches `shared/resources/jira-sync.js`, 11 bundled `skills/*/references/jira-sync.js` copies, 4 documentation tables, and the Jira stage test suites. Not single-module, and it deliberately changes resolution behaviour. Full QA in Steps 5–6.
- 2026-08-04T11:37:12Z — Q1 branch model → **regular bugfix** (user-selected recommended default). Bug is not a production regression: Minor severity, library-level defect, no production/hotfix language in the report.
- 2026-08-04T11:37:12Z — Q2 base branch → **develop** (user-selected recommended default). Branch `feature/bug.1.ready-for-development-candidates` already exists at develop's tip; no rebase required.
- 2026-08-04T11:37:12Z — Q3 PR target → **develop** (user-selected recommended default). Becomes `--base develop` in Step 4.
- 2026-08-04T11:37:12Z — **Fix option → Option 4 (append)** (user-selected recommended default). Binds both `"ready-for-development"` and the spelled-out alias `"ready for development"` to `[...NEW_CANDIDATES, "Ready", "Ready for Development"]`. Rationale: the only zero-regression variant — every existing board keeps its exact destination, a board with only a `Ready*` column starts working, and the existing `jira-stage.test.mjs` / `jira-stage-fixtures.test.mjs` suites must pass **unchanged** (any diff there indicates a bug in the fix). Accepted cost: a board with both `To Do` and `Ready for Development` keeps landing in `To Do`.

- 2026-08-04T11:38:04Z — Step 1: `/create-branch` **not re-invoked**. Its post-condition already held — `feature/bug.1.ready-for-development-candidates` existed, was checked out, and had `develop` as an ancestor with no divergence. Verified branch name, upstream, ancestry and HEAD (`6d07f0a`) instead. No stash was needed (the implementation report is the only untracked addition and no branch switch occurred).
- 2026-08-04T11:38:04Z — Pipeline lock written (`skill=develop-bug`, `tracker=github`, `tracker_issue=191`). Branch pushed to origin, upstream set.
- 2026-08-04T11:38:04Z — Signal Work Started: commented on GitHub issue [#191](https://github.com/Gamaroff/agent-skills/issues/191#issuecomment-5178469138) with branch name and chosen fix option.

- 2026-08-04T11:39:00Z — Step 2: `/review-bug` **not re-invoked**. A `/review-bug` report (`review.1`) already exists from earlier today, produced in interactive mode against this exact bug file. Currency verified by mtime: the review (13:15:38) postdates the last modification to the bug file (13:14:35), and nothing has touched the bug since — so the review's input is byte-identical to the file the gate would re-read. Its verdict clears all four Step 2 halt conditions: **9/10 ✅ READY TO FIX**, Critical 0, `duplicate: none`, `reproduces: likely (high confidence)`. Both pre-pass scans (Agent A duplicate, Agent B already-fixed/stale) were run and recorded. Re-running would emit a redundant `review.2` with the same verdict. Gate honoured; proceeding to Step 3.
- 2026-08-04T11:39:00Z — Review report path recorded: `docs/bugs/bug.1.ready-for-development-candidates/bug.1.ready-for-development-candidates.review.1.ready-for-development-candidates.md`.

- 2026-08-04T11:45:00Z — Step 3 fix summary:
  - Added `READY_FOR_DEVELOPMENT_CANDIDATES` to `shared/resources/jira-sync.js`, derived as the deduped union of `NEW_CANDIDATES` and `READY_CANDIDATES` (rather than hand-written) so future edits to either propagate and `READY_CANDIDATES` stops being orphaned.
  - Rebound **both** `"ready-for-development"` and the alias `"ready for development"` to it — fixing only one would make two spellings of one status diverge.
  - Ordering documented at the definition as the safety argument: appended, never prepended. Dedup keeps first occurrence, so `Selected for Development` stays at position 5 (the flip the report's correction block warns about is avoided).
  - Regression suite added as a **new** file (`shared/resources/tests/jira-ready-for-development-candidates.test.mjs`, 11 tests) rather than editing existing Jira suites, preserving "existing suites unchanged" as a verification signal. Covered by the existing `shared/resources/tests/*.test.mjs` glob — no `package.json` wiring needed (checked; this repo has a recorded history of orphaned suites).
  - All 4 doc tables updated; all 11 bundled `skills/*/references/jira-sync.js` regenerated via `npm run bundle` and verified.
- 2026-08-04T11:45:00Z — Blast-radius check: `DEFAULT_STATUS_RANK` derives from `NEW_CANDIDATES` + `DEFAULT_STAGE_MAP`, not `DEFAULT_STATUS_MAP`, so the rank/backwards-transition guard is provably unaffected by this rebinding.
- 2026-08-04T11:45:00Z — Fails-without property **proven**, not assumed: `jira-sync.js` was reverted via `git stash` and the suite re-run. The 2 defect-encoding tests failed; the 9 zero-regression guards passed both pre- and post-fix (correct — they assert behaviour that must not change). Fix restored and re-verified.
- 2026-08-04T11:45:00Z — Test results: new suite 11/11; `jira-stage.test.mjs` + `jira-stage-fixtures.test.mjs` 30/30 **unchanged** (the signal option 4 predicts — a diff would have meant a bug in the fix); full `npm test` 734/734, 0 fail.
- 2026-08-04T11:45:00Z — Bug status advanced `new → in-progress → ready-for-qa`; Iteration 1 Investigation + Fix Implementation written into the Developer Fix Cycle; 2 Status History rows added.

- 2026-08-04T11:52:00Z — Step 4: committed in two logical commits rather than one — `6c7c23b` (code + tests + 4 doc tables + 11 bundled copies, atomic per the bug's own scope requirement) and `cd43e48` (bug report fix cycle + review report). Implementation report deliberately held back from both, per the `commit-changes` step-3a exclusion rule; Step 8 owns it.
- 2026-08-04T11:52:00Z — PR [#192](https://github.com/Gamaroff/agent-skills/pull/192) opened against `develop`. Issue #191 commented with the PR link. `pr_url` written into the pipeline lock.
- 2026-08-04T11:52:00Z — A pre-commit hook independently re-ran `npm run bundle` and reported every skill "in sync", corroborating that the bundled copies were already correct before the commit.

- 2026-08-04T11:58:00Z — Step 5 signal 3 (`/review-code`) was performed **inline by the orchestrator rather than by dispatching a reviewer subagent**, because this session carries a standing instruction not to invoke the Agent tool unless the user asks. The diff is 4 substantive files (the other 11 are mechanically generated), so a direct adversarial read was tractable and no coverage was lost. Recorded so the deviation from the documented signal-3 mechanism is not mistaken for the subagent having run.
- 2026-08-04T11:58:00Z — Documentation completeness re-verified independently of the review's claims, since a wrong "not affected" call would silently leave a doc contradicting the code. Result: the review's exclusion list holds. `shared/resources/document-status-lifecycle.md:164` maps to a **Default Jira status** (singular — the *primary* candidate `To Do`), which this fix leaves unchanged and which the new suite pins via `mapStatus()`; its "Selected for Development" mention is prose. `CHANGELOG.md` is a historical release record — correctly left alone. `scripts/setup-consumer.sh` emits no `ready-for-development` binding (task.36 removed the generated `statusMap`; its only commented example uses `ready-for-review`). `jira-sync.js` `loadStatusMap` comments are YAML-syntax examples, not default claims. The `sync-github-*` tables map to GitHub `open`/`closed` and are unrelated.
- 2026-08-04T11:58:00Z — Bonus, no action needed: `--probe-workflow` reports through `mapStatusCandidates`, so its `ready-for-development` row now shows the corrected list automatically.

- 2026-08-04T12:05:00Z — Step 7 Part A: `/finalise` was **invoked** as required, but its workflow is story/task-shaped — it verifies numbered Acceptance Criteria, reads `pr_number`, generates `sprint-review-summary.md`, and drives the document to `status: accepted`. A bug has no acceptance criteria and must reach `closed`, and finalise's DoD phase fans out four Explore subagents (precluded this session). Step 7's reference explicitly provides for this: the documented **inline DoD fallback** was executed and recorded in `bug.1...dod.1...md`. The one finalise gate that *is* bug-applicable — the CI status gate — was run in full using its exact `statusCheckRollup` query, not skipped.
- 2026-08-04T12:05:00Z — **CI gate: `CI_ROLLUP=SUCCESS`** — `link-check`, `test`, `validate` all COMPLETED/SUCCESS. Verified against the **exact head commit** (`cd43e48…` == local HEAD), not an ancestor, so the green is evidence about this code rather than a predecessor.
- 2026-08-04T12:05:00Z — Step 7 Part B: Resolution Summary written (6 lessons learned); bug frontmatter `status: closed` + body `**Status:** ✅ Closed`; final Status History row added.
- 2026-08-04T12:05:00Z — Parent linkage (general-bug mode): `docs/bugs/bug-registry.md` row #1 status → `closed`. **Next Available Bug Number left at 2** — numbers are never reused. Registry change is committed atomically with the bug file in Step 8.
- 2026-08-04T12:05:00Z — Tracker close: issue #191 commented with the DoD result table and closed; closure verified via `gh issue view --json state` → `CLOSED`.
- 2026-08-04T12:05:00Z — Project board: issue #191 belongs to **no** GitHub project board (`projectItems` empty). Recorded as **N/A rather than a failure** — general bugs in this repo are tracked through `docs/bugs/bug-registry.md`, which was updated, so board membership was never expected. Posting finalise's "⚠️ Project Board Not Updated" warning here would have been a false alarm.

## QA Iteration History

### Verify Cycle 1 — 2026-08-04

**Regression test**: pass (11/11; fails-without established in Step 3 by stash-revert)
**Suite + lint**: pass (`npm test` 734/734, 0 fail; `npm run validate:all` 113 passed / 0 failed — no `lint` script exists in this repo, `validate:all` is the equivalent gate and was relevant because 3 `SKILL.md` files changed)
**Code review**: clean — 0 blocking correctness findings
**Verdict**: **PASS**
**Action**: Proceeding to Step 7 (finalise & close). No `/qa-fix` cycle required.

Code-review checks performed (all negative for defects):

- Declaration order safe — `READY_FOR_DEVELOPMENT_CANDIDATES` follows both source lists; no TDZ.
- `Set` dedup preserves insertion order and collapses the shared `Selected for Development`; result asserted empirically and by test.
- **No identity (`===`) or enumeration (`Object.values/entries/keys`) dependence on `DEFAULT_STATUS_MAP` anywhere in the file** — grepped explicitly, so rebinding a value cannot break a consumer of the map.
- `DEFAULT_STATUS_RANK` derives from `NEW_CANDIDATES` + `DEFAULT_STAGE_MAP`, not `DEFAULT_STATUS_MAP` — rank/backwards-transition guard provably untouched.
- Bundled-copy fidelity: all 11 differ from source by exactly one line (the bundler's `AUTO-GENERATED` header); fix region + both key bindings byte-identical.
- Doc completeness re-verified rather than trusted — see the Decisions Log entry below.

## Issues Log

- 2026-08-04T11:45:00Z — **Observation, not a defect, deliberately out of scope**: `"Ready"` and `"Ready for Development"` carry no entry in `DEFAULT_STATUS_RANK`, because that map is built from `NEW_CANDIDATES` and `DEFAULT_STAGE_MAP` and `READY_CANDIDATES` appears in neither. Unranked statuses are let through the backwards-transition guard rather than blocked. This is pre-existing behaviour (it already applied to the `ready` alias) and unchanged by this fix, but a board that now lands in a `Ready*` column will sit at an unranked status. Worth a follow-up decision; changing it here would be scope creep into rank semantics.
- 2026-08-04T11:45:00Z — **Follow-up for task.37** (`planned`): task.37 introduces a consumer-supplied `tracker-workflow.yaml` whose built-in default reproduces today's behaviour. Whichever lands second must carry this same binding for both keys, or the defect returns through the config path. Flagged in the bug's Scope & Impact and carried into the PR description.

## Completion

**Branch:** `feature/bug.1.ready-for-development-candidates` (base `develop`)
**PR:** [#192](https://github.com/Gamaroff/agent-skills/pull/192) → `develop`
**DoD Summary:** `bug.1.ready-for-development-candidates.dod.1.ready-for-development-candidates.md` — ✅ ACCEPTED (7/7 criteria)
**Bug Status:** `closed`
**Tracker:** GitHub issue [#191](https://github.com/Gamaroff/agent-skills/issues/191) — closed (verified `CLOSED`)
**Registry:** `docs/bugs/bug-registry.md` row #1 → `closed`; next-number counter unchanged at 2

### Fix delivered

`ready-for-development` (and its `ready for development` alias) now resolve to:

```
["To Do","Backlog","Open","New","Selected for Development","Ready","Ready for Development"]
```

Appended, not prepended — every existing board keeps its exact destination; a board whose only column
is `Ready for Development` starts working.

### Verification at a glance

| Gate | Result |
| ---- | ------ |
| New regression suite | 11/11 pass (fails-without **proven** by stash-revert) |
| Existing Jira suites | 30/30 pass, **unchanged** — the signal option 4 predicts |
| Full `npm test` | 734/734, 0 fail |
| `npm run validate:all` | 113 skills passed, 0 failed |
| CI rollup | SUCCESS on exact head `cd43e48` |
| Bundled copies | 11/11 carry the fix, byte-identical bar the generated header |
| Doc tables | 4/4 updated; 5 look-alike files verified genuinely unaffected |

### Commits

| Hash | Subject |
| ---- | ------- |
| `6c7c23b` | `fix(jira-sync): let ready-for-development match its own column name (#191)` |
| `cd43e48` | `docs(bug.1): record the fix cycle and review for the ready-for-development bug (#191)` |
| _(this step)_ | `docs(bug.1): close bug 1 — DoD verification and implementation report (#191)` |

### Open follow-ups (carried forward, not lost)

1. **task.37** (`planned`) — its built-in `tracker-workflow.yaml` default must carry this same binding
   for **both** status keys, or the defect reappears through the consumer-config path.
2. **Unranked `Ready*` statuses** — `Ready` / `Ready for Development` have no `DEFAULT_STATUS_RANK`
   entry, so a card landing there is let through the backwards-transition guard. Pre-existing and
   out of scope for this fix.
