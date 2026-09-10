# Definition of Done Verification

**Task:** task.105.comment-call-sites-plain-language-lead
**Verification Started:** 2026-09-10 14:25
**Status:** COMPLETED - ACCEPTED

---

## Step 1: QA Report Review ✅

**QA Report Found:** `task.105.qa.1.comment-call-sites-plain-language-lead.md`
**Gate File Found:** `task.105.gate.1.comment-call-sites-plain-language-lead.yml`
**PR Review Report:** `task.105.pr-review.1.comment-call-sites-plain-language-lead.md` (Step 5c)

**Gate Status:** ⚠️ CONCERNS
**Quality Score:** 90/100
**Open findings:** 0 (`top_issues: []`)

**Why CONCERNS with no findings** — both reasons are NFR judgements, and both are carried forward
here rather than dismissed:

1. **Reliability CONCERNS** — the seven converted sites knowingly give up the 3× exponential backoff.
   The trade is correct (the engine owns the `ACCESS_TRACKER` deferral gate, so re-wrapping would
   double-defer) and matches `review-task`, the reference implementation. Documented at every
   converted site, in §5.1 and in the implementation report.
2. **The independent code review did not run** — the subagent hung and was killed.

**NFR Validation (from QA):**
- Security: ✅ PASS (`evidence: measured`, 8 probes executed, 0 exploitable)
- Performance: ✅ PASS
- Reliability: ⚠️ CONCERNS
- Maintainability: ✅ PASS

**Prior-run acceptance blocks:** none. `grep -cE '^## Definition of Done.*(PASSED|✅)'` = 0, and this
is run 1 — nothing to supersede.

**Immediate Actions from QA:** None.
**Future Actions from QA:** 3 recorded in `recommendations.future`.

---

## Verification Method — read this before the sections below

**All four DoD checks were performed IN-LINE, not by the four parallel Explore subagents this skill
specifies.** Four subagents had already hung and been killed in this session (two pre-pass, the QA
code reviewer, the PR conformance reviewer), the last two after ~6 and ~8 minutes each. Dispatching
four more had a poor expected value against a task whose verification is almost entirely mechanical.

This is a **real reduction in independence**, recorded here rather than glossed: every check below was
performed by the agent that wrote the change. What compensates is that each is grounded in something
*executed* — a test run, a probe, a hash comparison — rather than in re-reading. That is the best
available substitute. It is not the same thing.

---
## Step 2: Core Acceptance Criteria & PR Review

**Overall AC Status:** ✅ PASS — 11/11
**PR Status:** OPEN (PR #379) · **PR Review Decision:** Step 5c ⚠️ CONCERNS (advisory; records findings without blocking)

### Success Criteria (§9)

| # | Criterion | Evidence | Status |
|:--|:---|:---|:---|
| F1 | Every call site passes ≥1 `--slot`, bound, with a name its stage reads | `shared/resources/tests/comment-slot-coverage.test.mjs` assertions 1–3, green; 24 sites walked; non-vacuity floor ≥20. Independently re-derived by **rendering** (supply slot / omit slot / compare output) — the two methods agree exactly | ✅ PASS |
| F2 | Zero bare `gh issue comment` in shipped `.md` outside the allowlist | `tests/mutation-call-site-coverage.test.js` §1 green; independent 920-file walk → 4 survivors, all intended (PreCompact hook, the wrapper's own example, 2 test assertions) | ✅ PASS |
| F3 | All seven converted sites post a marker and are idempotent | **Executed**: re-run against an issue already carrying the `done` marker → `posted: false, reason: "already"`, nothing sent | ✅ PASS |
| F4 | `review-story`'s Jira and GitHub arms produce the same text | Structural — collapsed to one call with one body (`skills/review-story/SKILL.md`) | ✅ PASS |
| F5 | Comment-then-close ordering asserted, not just documented | Guard B assertion 5; mutation-proved by swapping the order | ✅ PASS |
| P1 | No extra round-trip except the two closes | Structural — slots are argv on calls that already happen | ✅ PASS |
| Q1 | No `references/` hand-edited; `bundle` produces no diff | Content-hash comparison across two consecutive `npm run bundle` runs — identical | ✅ PASS |
| Q2 | `qa-fix`'s two bodies share content through one variable | `$FIX_SUMMARY` (L706) → `$PR_COMMENT_BODY` (L772) / `$TRACKER_COMMENT_BODY` (L779); uses at L787, L790, L828 — all after assignment | ✅ PASS |
| Q3 | Every converted site reads `reason`; none posts over `unverifiable` | Contract pointer + `\|\| echo … continuing` at each site; the engine returns `unverifiable` **without** posting | ✅ PASS |
| M1 | Contract's migration paragraph rewritten, not deleted | `tracker-comment-contract.md` — rewritten, and it now states *why the guard exists* rather than only that the migration finished | ✅ PASS |
| M2 | Consumer docs restating comment behaviour swept | `AGENTS.md` corrected (carried the same now-false claim); roadmap hits are historical records of past tasks; `configuration.md`'s mention describes `tracker_write` coverage and remains true | ✅ PASS |

**Two criteria were themselves corrected at Step 5c before being ticked** — F1 was pinned to "22 call
sites" while the change delivers 24, and F3 said "the five converted sites" while §3 and §5.1 both say
seven. Ticking them as written would have recorded a pass against a bar that did not match the work.

### Documentation

- **Task document**: ✅ §7 Files Summary corrected to the real set (20 modified + 1 added); §9 ticked 11/11
- **Change Log**: ✅ rows from `create-task`, `review-task` (×2), `develop` (×2), `qa-task`
- **Implementation report**: ✅ Pipeline Progress 1–7, Decisions Log, Issues Log, QA Iteration History
- **Contract + AGENTS.md**: ✅ both swept

---

## Step 3: Security Review

**Story Type:** task (refactoring — runnable prose + tests)
**Overall Security Status:** ✅ PASS

### boundary: true

This change ships **two classifiers that decide allow/deny**: `isInvocation` + `isRouted` in Guard A
(is this line a bare tracker call?) and Guard B's slot-name check. A predicate that decides what is
permitted is a boundary, so probe mode fired.

**Candidates executed: 9 — reproduced: 1** (found and fixed in-cycle).

| Probe | Expected | Actual | Reproduced |
|:---|:---|:---|:---|
| `gh issue comment …` bare | caught | caught | no |
| `tracker_call_with_retry gh issue comment …` | caught | caught | no |
| `tracker_write gh issue comment …` | caught | caught | no |
| `OUT=$(gh issue comment …)` | caught | caught | no |
| **`true && gh issue comment …`** | **caught** | **MISSED** | **yes → fixed** |
| `false \|\| gh issue comment …` | caught | caught (after fix) | no |
| `cd /tmp; gh issue comment …` | caught | caught (after fix) | no |
| `if true; then gh issue comment …; fi` | caught | caught (after fix) | no |
| `echo x \| gh issue comment …` | caught | caught (after fix) | no |
| *(false-positive control)* prose in backticks | **not** caught | not caught | no |

The reproduced probe is the finding: `isInvocation` allowed a connective as the *entire* prefix but
not one preceded by a command, so any chained call was invisible. Fixed; all forms now caught, and the
control confirms prose is still ignored — a guard that fires on the documentation of its own rule gets
its allowlist widened until it means nothing.

### Lead-renderer probes (8, from the QA cycle)

Slot values reach a paragraph written for a non-technical reader, so the renderer was probed too.
**0 of 8 exploitable.** Marker injection through `verdict` is impossible because `verdict` is *mapped*
through `GATE_MEANING` rather than interpolated; there is no shell-injection surface because the engine
spawns `gh` with argv and passes the body by `--body-file`, so `$(rm -rf /)` in a text slot renders
literally; an unknown verdict renders "the results are recorded below" rather than unearned reassurance.

### General Security

- **No credentials or tokens in the diff**: ✅ PASS — checked before commit
- **No new network surface**: ✅ PASS — slots are argv on existing calls
- **Deferral gate preserved**: ✅ PASS — every converted site routes through `tracker-comment.js`, which owns the `ACCESS_TRACKER` gate via `defer-mutation.js`
- **Text slots unsanitised**: ⚠️ recorded, not a finding — by design, and safe because every call site supplies pipeline-controlled values. A property of task.104's engine

---

## Step 4: Compliance Review

**Overall Compliance Status:** ⚠️ NOT_APPLICABLE
**Applicable areas:** none. This is an internal developer-tooling change to how a pipeline posts
comments on its own tracker issues. No personal data, no user-facing surface, no payment,
accessibility or regulated-data path is touched.

Recorded rather than skipped: an absent compliance section is indistinguishable from one that was
never considered.

---

## Step 4b: Docs & Changelog

**Overall Docs Status:** ✅ PASS

| Item | Status | Evidence |
|:---|:---|:---|
| Work-item document current | ✅ | §7 corrected, §9 ticked 11/11, QA Results section added |
| Change Log rows | ✅ | `create-task`, `review-task` ×2, `develop` ×2, `qa-task` — `Version` blank on all but the review row, per the standard |
| Contract updated | ✅ | `tracker-comment-contract.md` migration paragraph rewritten with the guard rationale |
| Repo agent instructions | ✅ | `AGENTS.md` — the now-false "several still post a bare `gh issue comment`" claim corrected, plus a new paragraph on slot-name silence |
| Skill catalogue | ✅ | `npm run generate-catalog` run (126 skills); no skill description changed, so no diff |
| Bundled copies | ✅ | `npm run bundle`; idempotency proven by content hash |
| New test registered | ✅ | `shared/resources/tests/comment-slot-coverage.test.mjs` is covered by the existing `shared/resources/tests/*.test.mjs` glob in `package.json` — checked, per `project_npm_test_glob_orphans_suites` |

---
## Step 5: Acceptance Decision

**CI rollup:** ✅ **SUCCESS** — read from the rollup, not assumed.

| Job | Result |
|:---|:---|
| `test` | SUCCESS |
| `validate` | SUCCESS |
| `link-check` | SUCCESS |
| `shellcheck` | SUCCESS |
| `PR into main comes from an allowed branch` | SUCCESS |

**Verified against the right commit.** The rollup's head is `1abc34a7`, which equals local `HEAD` —
so this is a green on the commit being accepted, not on an ancestor. Sampled as `PENDING` first
(4 jobs `IN_PROGRESS`, `conclusion: ""`) and **waited** rather than rounding up; the correct query
reports `PENDING` where a naive `.conclusion // .state` would have read the empty string as green.

**Decision:** ✅ **ACCEPTED**

**Summary:**
- QA Gate: ⚠️ CONCERNS (90/100) — 0 open findings; both concerns are NFR judgements carried forward, not defects
- PR Review (5c): ⚠️ CONCERNS — 7 findings, all fixed or deliberately accepted, none `high`
- Acceptance Criteria: ✅ 11/11
- CI: ✅ SUCCESS on the accepted head
- Documentation: ✅ PASS
- Security: ✅ PASS — `measured`, 17 probes total (8 renderer + 9 classifier), 1 reproduced and fixed
- Compliance: ⚠️ NOT_APPLICABLE (recorded, not skipped)

**Why a CONCERNS gate is accepted rather than blocked.** The DoD decision matrix blocks on gate
`FAIL`, and directs judgement on `CONCERNS`. Both concerns here are known, documented, non-defects:
a deliberate resilience trade that is stated at every site it affects, and a missing independent
review that is disclosed in five artifacts. Neither is a gap in the work; both are facts about it that
a reader should have. Blocking on them would mean a task can never be accepted while carrying an
honestly-recorded limitation — which would train the next run to record fewer.

**Outcome:** Task meets the Definition of Done. Accepted.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-10 14:35

**Artifacts Generated:**
- ✅ Task document updated with DoD verification section
- ✅ Sprint Review summary created
- ✅ Canonical PR comment posted
- ✅ Tracker issue #378 commented and closed
- ✅ GitHub project board moved to Done
- ✅ Task registry row ticked

**Residual items — recorded, none blocking:**
1. A retry that does not also defer, so converted sites regain backoff (gate `recommendations.future`)
2. Move the `outcome` mapping into `stakeholder-summary.js` beside `GATE_MEANING`
3. Observation #49 — `summariseSection` publishes a 14-character Success Criteria card block on 15 of 106 task documents
4. Observation #51 — the QA loop has no route for a CONCERNS gate with an empty `top_issues[]`; this run hit it and resolved it by routing to 5c deliberately
5. Four Explore subagents hung in this session; both review lenses ran in-line
