---
type: implementation-report
status: complete
bug: 'bug.8.bug-status-outside-lifecycle-is-invisible'
mode: 'general'
started: '2026-09-06T00:00:00Z'
---

# Implementation Report — bug.8.bug-status-outside-lifecycle-is-invisible

**Started:** 2026-09-06
**Finished:** 2026-09-06
**Final Status:** ✅ Complete — bug closed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.8.bug-status-outside-lifecycle-is-invisible` created at `9e54f93f` off `develop` | |
| 2 | review-bug | ✅ Done | READY TO FIX 9/10 — 0 Critical, 1 Important (applied), duplicate=none, reproduces=likely | `bug.8.….review.1.…md` |
| 3 | investigate-fix | ✅ Done | Fix + 13 regression tests; npm test 2482/2483 pass, 0 fail; bug → ready-for-qa | — (in-line, no subagents) |
| 4 | create-pr | ✅ Done | PR #327 → develop; commit `6de113a5`; no --issue (no tracker issue) | |
| 5–6 | verify-fix loop | ✅ Done | Cycle 1 PASS, no reopen. 3 signals green; 2 review findings applied (`ca4992ff`) | |
| 7 | finalise-close | ✅ Done | DoD ACCEPTED (`bug.8.dod.1.*.md`); CI SUCCESS on `ca4992ff`; bug closed; registry row 8 → closed | |
| 8 | commit-changes | ✅ Done | Final commit + push; lock removed | |

## Decisions Log

- 2026-09-06 — Bug resolved: `docs/bugs/bug.8.bug-status-outside-lifecycle-is-invisible/bug.8.bug-status-outside-lifecycle-is-invisible.md` (mode=general, prefix=`bug.8.bug-status-outside-lifecycle-is-invisible`)
- 2026-09-06 — No active pipeline lock; `last-halt.json` belongs to task.84 (different work item) — fresh run.
- 2026-09-06 — Bug status `new`; severity Major / priority High → **lite mode off** (Major bugs always run full QA in Steps 5–6).
- 2026-09-06 — Q1 branch model: **regular bugfix** (user-confirmed recommended default; not a production regression).
- 2026-09-06 — Q2 base branch: **develop** (user-confirmed).
- 2026-09-06 — Q3 PR target: **develop** (user-confirmed).
- 2026-09-06 — No `github_issue`/`jira_key` in bug frontmatter → `TRACKER_ISSUE` empty; tracker signalling skipped.

- 2026-09-06 — Step 1: branch `bugfix/bug.8.bug-status-outside-lifecycle-is-invisible` cut from `develop` (9e54f93f). Pipeline lock written (current_step=2). No tracker issue → Signal Work Started skipped.

- 2026-09-06 — Step 2: /review-bug (validate-and-apply) → **READY TO FIX 9/10**. Duplicate scan: none (nearest neighbour bug.9, different defect). Stale scan: reproduces=likely — all four claims re-verified on HEAD 9e54f93f. One Important fix applied to the bug report: the "not mentioned in `skipped[]`" claim understated the code — the row IS recorded in `registryFrontier.passedOver[]`; the real defect is indistinguishability from a terminal status. Review report: `bug.8.bug-status-outside-lifecycle-is-invisible.review.1.bug-status-outside-lifecycle-is-invisible.md`.
- 2026-09-06 — Step 7: `/finalise` invoked; its 4 parallel DoD subagents were **not** dispatched (session directive: no AgentTool unless requested), so the bug-shaped DoD ran in-line — the fallback Step 7 Part A explicitly permits. Method recorded in the DoD file itself.
- 2026-09-06 — Step 7: **CI was PENDING on first sample and was waited on, not assumed.** `test` was IN_PROGRESS; re-sampled to SUCCESS on head `ca4992ff`, which equals local HEAD — the green covers the review fixes, not just the first commit.
- 2026-09-06 — Step 7: bug closed — `## Resolution Summary` written (4 lessons), frontmatter + body `status: closed`, final Status History row. **General-bug linkage:** `docs/bugs/bug-registry.md` row 8 → `closed`, Last Updated → 2026-09-06, Next Available Bug Number left at 11 (numbers are never reused).
- 2026-09-06 — Step 7: tracker close **N/A** — the bug carries no `github_issue`/`jira_key`, so `TRACKER_ISSUE` is empty and the close + board-move steps are skipped by design, not by failure.
- 2026-09-06 — The corpus guard validated its own closing act: flipping this bug to `closed` kept it green, because `closed` is a lifecycle member. Had the close used an off-lifecycle value, the build would have caught it.
- 2026-09-06 — Step 4: staged via `--scope` (5 paths: bug dir, `evals/develop-next/unit`, `evals/shared/tests`, `skills/develop-next/references`, `skills/develop-next/scripts`). Nothing was out of scope, so the pre-flight hold was a no-op. One commit `6de113a5`; PR #327 → `develop`. PR body composed in-line (no Explore subagent, per session directive) — the fallback path the skill already documents.
- 2026-09-06 — Step 3 fix, 3 changes (floor deliberately NOT widened, per the bug's own `Do not`):
  1. `BUG_LIFECYCLE_STATUSES` / `TASK_LIFECYCLE_STATUSES` exported from `select-next.mjs` — the lifecycle had no home in code, only in prose, so nothing could validate against it.
  2. `registryFrontier()` tests lifecycle **before** floor: off-lifecycle rows get their own `reason`, `offLifecycle: true`, a `warnings[]` entry, and a named mention in the `roadmap-complete` `detail`. **Second gap found and closed**: `frontier.warnings` was returned only under `--lint` — the unattended loop, the caller that most needed it, could never see it.
  3. New `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` — the filing-time guard, moved upstream of the gate it previously sat behind.
- 2026-09-06 — Regression tests: 7 in `select-next.test.mjs` (§B8) + 6 corpus. Fails-without proved, then **mutation-proved 6 ways** (each reversion turned the expected test red, listed in the bug's Fix Implementation table).
- 2026-09-06 — Doc sweep: `skills/develop-next/references/roadmap-selection.md` §127 (canonical passed-over-reason list) and §173 (test coverage). `skill-catalog.md` regenerated — unchanged, no SKILL.md frontmatter touched.
- 2026-09-06 — Pre-pass run in-line rather than via Explore subagents (session directive: no AgentTool unless requested). Both axes verified directly with grep + a live `--lint` run; recorded so the audit trail is honest about how the scan was performed.

## QA Iteration History

### Verify Cycle 1 — 2026-09-06

**Regression test**: pass — 148/148 (`select-next.test.mjs` + corpus guard), all 7 `B8:` and all 6 corpus tests
**Suite + lint**: pass — `npm run ci:fast` exit 0; `prettier --check` clean; 2482 pass / 0 fail / 1 skipped
**Code review**: 3 findings — CR-1 (bug, low) and CR-2 (cleanup, low) applied in `ca4992ff`; CR-3 deliberately declined; **0 blocking**
**Fast gate**: n/a — the cycle passed at 5a, so 5b never ran
**Verdict**: **PASS**
**Action**: proceeding to Step 7 (finalise & close). No reopen; the bug stayed at Iteration 1.

> The review was run in-line rather than via the `/review-code` Explore subagent (session directive:
> no AgentTool unless requested). Reviewing one's own diff is the weak case for adversarial review, so
> it was run deliberately sceptically — and it did find a real defect (CR-1) that the green suite had
> not: an experimental Node API in the new guard, invisible to a passing run on Node 24.

## Issues Log

- 2026-09-06 — **Environment, not a repo defect.** `node` is a shell function here that runs bare `nvm` first, so nvm help lands on stdout before every node CLI's output. It corrupted the first `select-next.mjs --lint` capture. Every node call in this run uses `command node`. Worth knowing for any future session on this machine.
- 2026-09-06 — **A `str.replace` without an assertion silently no-opped**, dropping one Status History row. Caught on read-back and fixed; every subsequent edit script asserts each pattern before replacing.

### Environment hazard (recorded for every later step)

The shell snapshot defines `node()` as a function that runs bare `nvm` before `command node "$@"`, so **nvm's help text is written to stdout ahead of every node CLI's real output**. Any JSON captured from a node CLI in this session is corrupted unless invoked as `command node`. All node invocations in this pipeline use `command node`.

## Completion Summary

**Outcome:** bug.8 fixed, verified, and closed in a single fix iteration and a single verify cycle.

The defect was a **composition gap**, exactly as the report argued: the selector was right, the
template was right, and `review-bug`'s check was right — but the check sat downstream of the gate it
would have to pass, and nothing validated between filing and selection. Two changes close it, and one
was found while making the first:

1. The lifecycle now exists in code and the frontier consults it **before** the eligibility floor, so
   "not a status" stops wearing the same sentence as "a status we don't select on".
2. A corpus test fails the build on any off-lifecycle bug/task document or registry row — the guard
   moved upstream of selection, where it can actually fire.
3. *(found in flight)* `frontier.warnings` was reaching only the `--lint` path. The unattended loop
   was the one caller that could not read its own diagnostics; it now can.

The eligibility floor is untouched, per the report's own `Do not`.

**Evidence:** 13 regression tests, fails-without proved and mutation-proved six ways, each paired with
a terminal-status counterexample so the new distinction cannot pass vacuously. `npm run ci:fast`
exit 0 (2482 pass / 0 fail). CI green on `ca4992ff` — waited for, not assumed, after an initial
`PENDING` sample.

**Two things worth carrying forward** (also in the bug's Lessons Learned): a check's *position* in a
pipeline is as load-bearing as its logic; and an enum that lives only in prose cannot be enforced,
because no filing-time check against it is even expressible.

## Completion

**Branch:** bugfix/bug.8.bug-status-outside-lifecycle-is-invisible
**PR:** https://github.com/Gamaroff/agent-skills/pull/327
**DoD Summary:** `bug.8.dod.1.bug-status-outside-lifecycle-is-invisible.md` — ✅ ACCEPTED (fix evidence, CI green on the final head, 13 regression tests mutation-proved 6 ways, suite 2482/0, no new security surface, docs swept)
