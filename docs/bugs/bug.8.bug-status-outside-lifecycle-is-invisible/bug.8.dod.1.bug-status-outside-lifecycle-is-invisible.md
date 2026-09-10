---
type: dod-summary
status: complete
bug: 'bug.8.bug-status-outside-lifecycle-is-invisible'
created: '2026-09-06'
updated: '2026-09-06'
description: 'Definition of Done verification for bug.8 (a bug status outside the lifecycle is invisible to selection). Bug-shaped DoD: fix evidence, regression tests fails-without/passes-with, suite + lint green, CI green on the final head, no new security surface.'
---

# Definition of Done Verification

**Bug:** bug.8.bug-status-outside-lifecycle-is-invisible (general, Major/High)
**PR:** [#327](https://github.com/Gamaroff/agent-skills/pull/327) → `develop`
**Verification Started:** 2026-09-06
**Status:** COMPLETED — ACCEPTED

> **Bug-shaped DoD.** This document is a bug report, not a story or task, so there are no acceptance
> criteria and no `*.gate.*.yml`. The equivalent evidence bar is the one `develop-bug` Step 7 names:
> fix present, a regression test with the fails-without/passes-with property established, suite and
> lint green, CI green on the final head, and no new security surface.
>
> **How this run was performed.** `/finalise`'s four parallel DoD subagents were not dispatched — this
> session carries a standing directive not to use the Agent tool unless the user asks. Every check
> below was executed in-line instead, which is the fallback `develop-bug` Step 7 Part A explicitly
> permits ("fall back to the equivalent inline DoD checklist, record it in the report, and continue").
> It is recorded here rather than left implicit, because a DoD whose method is undocumented is a DoD
> a later reader cannot weigh.

---

## Step 1: Prior-Run and QA Artifact Review

**Prior DoD/ACCEPTED blocks in the bug body:** 0 — first finalise run for this bug, nothing to supersede.

**QA report / gate files:** none, and none expected (see the note above). Evidence used instead:

| Artifact | Role |
| --- | --- |
| `bug.8.…review.1.….md` | Pre-fix readiness gate — READY TO FIX 9/10, duplicate scan clean, defect confirmed live on HEAD `9e54f93f` |
| `bug.8.…implementation.1.….md` | Pipeline audit trail incl. the verify cycle and the in-line review findings |
| Bug body `## Developer Fix Cycle` | Iteration 1 — Investigation / Fix Implementation / QA Verification |

**Verify cycle outcomes:** cycle 1 **PASS** on the first pass; the bug was never reopened, so there is
exactly one iteration.

---

## Step 2: Fix Evidence & CI (the AC-equivalent)

**Overall status:** ✅ PASS
**PR status:** OPEN (PR #327)

### CI — a hard DoD gate, checked not assumed

The rollup was **`PENDING` when first sampled** (`test` IN_PROGRESS) and was **waited on**, not
rounded up. Re-sampled to `SUCCESS` on head `ca4992ff`, which **equals local `HEAD`** — the green is
on the commit carrying the final code, including the two review fixes, not on an ancestor:

| Check | Status | Conclusion |
| --- | --- | --- |
| `test` | COMPLETED | SUCCESS |
| `validate` | COMPLETED | SUCCESS |
| `link-check` | COMPLETED | SUCCESS |
| `shellcheck` | COMPLETED | SUCCESS |
| `PR into main comes from an allowed branch` | COMPLETED | SUCCESS |

**CI rollup:** ✅ **SUCCESS**

### The fix, against what the bug reported

| Reported | Fix evidence | Status |
| --- | --- | --- |
| A status outside the lifecycle is silently skipped | `select-next.mjs` `registryFrontier()` now tests lifecycle before floor: distinct `reason`, `offLifecycle: true`, and a `warnings[]` entry | ✅ |
| Nothing validates the status at filing time | `evals/shared/tests/document-status-lifecycle-corpus.test.mjs` fails the build on any off-lifecycle bug/task document or registry row | ✅ |
| The one check that would catch it runs downstream of the gate | The corpus guard runs in `npm test` on every commit — upstream of selection entirely | ✅ |
| `roadmap-complete` is indistinguishable from "nothing to do" | Off-lifecycle rows are named in the stop `detail`, and `frontier.warnings` is now returned on the normal path, not only under `--lint` | ✅ |
| **Do not** widen `BUG_ELIGIBLE_STATUSES` to admit `open` | Unchanged — still `{new, reopened}`; §16/H1 (the bug-axis-gap test) still passes | ✅ |

---

## Step 3: Regression Test — fails-without / passes-with

**Overall status:** ✅ PASS

13 tests added: 7 in `evals/develop-next/unit/select-next.test.mjs` (§B8), 6 in the new corpus guard.

**Fails-without established:** all 7 §B8 tests fail on the pre-fix code
(`TypeError: BUG_LIFECYCLE_STATUSES is not iterable`, plus reason/warning mismatches).

**Then mutation-proved six ways** — each reversion applied in isolation, each turning the expected
test red and no others:

| Reversion | Tests that went red |
| --- | --- |
| delete the off-lifecycle branch | reason · warning · task-axis · stop-path (4) |
| drop `warnings` from the normal-path output | stop-path · clean-stop (2) |
| drop the off-lifecycle suffix from `detail` | stop-path (1) |
| fire the warning on *every* rejection | clean-stop · warning-anti-vacuity (2) |
| set a bug document to `status: open` | corpus guard — bug documents (1) |
| set a registry row to `open` | corpus guard — bug registry rows (1) |

The corpus guard was **re-mutation-proved after** the CR-1 fix swapped its file-enumeration API, so
the swap cannot have quietly turned it into a scan that matches nothing and passes by never looking.

**Anti-vacuity is structural, not incidental.** Every assertion about the new behaviour is paired with
a terminal-status counterexample, so "not a status" and "a status we don't select on" cannot collapse
into one another and still pass; and the corpus scan asserts a minimum document count, so an empty
glob fails rather than passing silently.

---

## Step 4: Suite + Lint

**Overall status:** ✅ PASS

`npm run ci:fast` → **exit 0**:

- `prettier --check .` — clean across the repo
- `npm test` — **2483 tests, 2482 pass, 0 fail, 1 skipped**

The 1 skip is pre-existing and unrelated to this change.

---

## Step 5: Security Review

**Overall status:** ✅ PASS — no new security surface

**Not a boundary deliverable** in the probe-mode sense: nothing here is a validator, classifier, or
allow/deny-list guarding execution or access. The nearest thing — the lifecycle membership test — is a
*reporting* discriminator: both arms refuse selection, and they differ only in the sentence emitted.
Widening or narrowing it cannot make an ineligible row selectable.

| Check | Result | Evidence |
| --- | --- | --- |
| No new execution or shell surface | ✅ | Diff adds two frozen `Set`s, a branch, a string, and a test file. No `exec`, `spawn`, `eval`, or filesystem write |
| No credential or token handling touched | ✅ | Secret scan over the staged diff returned nothing |
| No privilege or eligibility widening | ✅ | `BUG_ELIGIBLE_STATUSES` / `TASK_ELIGIBLE_STATUSES` byte-identical; asserted by the §16/H1 test and by the new supersets test |
| New test reads only, and only inside the repo | ✅ | `readdirSync` under `REPO_ROOT/docs` + `readFileSync`; no writes, no network |
| Warning strings carry no sensitive data | ✅ | They carry a repo-relative document path and its own frontmatter status |

---

## Step 6: Docs & Changelog

**Overall status:** ✅ PASS

| Item | Result | Evidence |
| --- | --- | --- |
| Canonical prose updated | ✅ | `skills/develop-next/references/roadmap-selection.md` §127 (passed-over reason list, both-paths warning, the "do not widen the floor" rule) and §173 (test coverage) |
| Behaviour-change doc sweep | ✅ | The other `passedOver`/`eligibility floor` hits are historical task/bug artifacts (immutable records) and the roadmap — correctly left alone |
| Skill catalog | ✅ | `npm run generate-catalog` re-run — no diff; no SKILL.md frontmatter was touched |
| Bug Change Log | ⚠️ N/A | Bug reports are the documented exclusion from the canonical Change Log — they use `## Status History`, which is updated (5 rows) |
| Registry | ✅ | `docs/bugs/bug-registry.md` row 8 → `closed`, Last Updated refreshed, Next Available Bug Number left at 11 (numbers are never reused) |

---

## Step 7: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Category | Result |
| --- | --- |
| Fix evidence (AC-equivalent) | ✅ PASS |
| CI rollup on the final head | ✅ SUCCESS (`ca4992ff`) |
| Regression test, fails-without proved | ✅ PASS (13 tests, mutation-proved 6 ways) |
| Suite + lint | ✅ PASS (2482/0, prettier clean) |
| Security | ✅ PASS (no new surface) |
| Docs & changelog | ✅ PASS |
| Code review | ✅ 0 blocking (2 findings applied in `ca4992ff`, 1 declined with reason) |

**Outcome:** every bug-shaped DoD criterion is met. The reported failure no longer reproduces, the
guard that would have caught it now runs upstream of the gate it previously sat behind, and the
eligibility floor the bug explicitly warned against widening is unchanged.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-06
**Fix Iterations:** 1 (no reopen)
**Verify Cycles:** 1 (PASS on the first)

**Artifacts:**

- ✅ Bug `## Resolution Summary` written; `status: closed`
- ✅ `docs/bugs/bug-registry.md` row 8 → `closed`
- ✅ Implementation report finalised
- ⚠️ N/A — tracker issue close: this bug has no `github_issue`/`jira_key` (general bugs are tracked in the registry), so `TRACKER_ISSUE` is empty and the close/board steps are skipped by design
- ⚠️ N/A — project board move: same reason
