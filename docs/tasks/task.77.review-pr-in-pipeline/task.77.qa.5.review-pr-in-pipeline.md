# QA Report: Task 77 — Cycle 5 (independent)

**Task**: [task.77.review-pr-in-pipeline.md](./task.77.review-pr-in-pipeline.md)
**Gate File**: [task.77.gate.5.review-pr-in-pipeline.yml](./task.77.gate.5.review-pr-in-pipeline.yml)
**Review Date**: 2026-09-03
**Gate Status**: FAIL — **Loop Escalation** (5 of 5 cycles used)

> **Written from an independent assessment**, not by the agent that produced the fixes. Step 5c's
> first finding (PC-1) was that the fixing agent had also written the gate clearing it. This cycle's
> reviewer was dispatched with no account of how the fixes were made and instructed to treat every
> repo artifact as a hypothesis to test. It verified by execution — and the most load-bearing claim
> it tested turned out to be false.

---

## Executive Summary

**13 of the 20 Step 5c findings are fully closed**, including the one that mattered most: the
withdrawal of the self-upgraded gate 4 is complete and honest, verified by diffing the gate against
the upgraded revision and grepping the repo for surviving traces.

But **five findings are only PARTIAL, one (CR-3) was dropped with no disclosure while full closure
was claimed**, and the fixes introduced three fresh contradictions on the same trail/resume axis that
produced HIGH findings in cycles 1–3.

**Gate**: FAIL. **Budget**: 5 of 5 used → this escalates to a human rather than a sixth cycle.

---

## The finding that justified the independence

`npm run ci` was **exiting 1** on branch HEAD while the handover brief asserted it was green.

`tests/work-item-artifact-naming.test.js` rejected `task.77.resume-brief.md` — `resume-brief` is not
a registered artifact type. The hazard is not cosmetic: `task.{n}.{slug}.md` is the *primary
task-document* shape, so every glob enumerating tasks counted a handover briefing as a task and could
have handed it to `/develop-task`. `gh pr checks 309` confirmed the `test` job red on the same SHA.

The file was added **after** the cycle-5 fix commit whose message claimed CI was green, and the brief
itself repeated the claim. A reviewer that had accepted the artifacts' word for it would have missed
this entirely.

**Now fixed** — the brief moved to `.agents/plans/task.77-resume-brief.md`; `npm run ci` exits 0,
verified. Recorded as closed in gate 5 **without re-grading the verdict**, because re-grading on the
strength of one's own subsequent fix is exactly what PC-1 was about.

---

## Re-Review Context

| Finding | Status | Note |
| --- | --- | --- |
| PC-1 self-upgraded gate | ✅ FIXED | Withdrawal complete; no surviving traces of PASS/92 |
| PC-2 rationale vs verdict | ✅ FIXED | `status_reason` restored, consistent with CONCERNS |
| PC-3 missing QA reports | ✅ FIXED | qa.2–4 exist with adequate retrospective disclosure — *but see the caveat below* |
| PC-4 trail reconciliation | ⚠️ PARTIAL | Introduced a **new** contradiction: task doc says Reliability FAIL, gate 4 says PASS |
| PC-5 dogfood framing | ✅ FIXED | False rationale replaced; boxes ticked with named evidence |
| PC-6 / CR-12 severity key | ⚠️ PARTIAL | Wording fixed; the test pin asked for was not added |
| PC-7 follow-ups in §7 | ⚠️ PARTIAL | §7 and registry date done; **Change Log row never added** |
| PC-8 ordering | ⚠️ PARTIAL | Bullets reordered; `## Completion` **still not last**, though the report claims it is |
| CR-1 ingester scope | ✅ FIXED | |
| CR-2 sequence diagrams | ✅ FIXED | Both gained the 5c branch and the `review failed` arm |
| **CR-3 banner firing points** | ❌ **NOT FIXED** | File untouched by the cycle-5 commit, and absent from the closure table that claims all twelve were addressed |
| CR-4 predicate's second home | ✅ FIXED | Removed and pinned; mutation-proved |
| CR-5 sectionBetween | ⚠️ PARTIAL | Footgun closed, but the comment says "BOTH indices asserted" and only `start` is |
| CR-6 report-template pin | ✅ FIXED | Now asserts the Step 7 template, not the Step 6 example |
| CR-7 5a placeholder | ⚠️ PARTIAL | Added to the loop doc; **not** added to the resume table — see CY5-4 |
| CR-8 retry bound | ⚠️ PARTIAL | Stated but not mechanizable — no attempt counter is persisted anywhere |
| CR-9 / CR-10 / CR-11 | ✅ FIXED | |

---

## New Findings This Cycle

Seven, recorded as `CY5-1` … `CY5-7` in the gate. One HIGH (now closed), four MEDIUM, two LOW.

The pattern worth naming: **three of the four MEDIUMs are defects introduced by cycle 5's own fixes**,
on the same axis as cycles 1–3. CY5-4 is the sharpest — the CR-7 fix added a sixth `**PR Review**`
enum value without adding its row to the resume table, breaking the very invariant gate 4 had closed
TASK77-024 on, while the test written to prevent that class of gap still enumerates only three values.

---

## Verification performed (all by execution)

| Check | Result |
| --- | --- |
| `npm run ci` at assessment | **exit 1** — 2284 tests, 1 fail |
| `gh pr checks 309` | `test` job **FAIL**, same SHA — independent confirmation |
| `npm run ci` after the CY5-1 fix | **exit 0** |
| Parity suite | 17/17 pass; **17/17 fail against `origin/develop`** — none vacuous |
| Lock test | 14/14 under **bash and zsh** |
| Bundle freshness | 45 copies compared **by content**, not by trusting the bundler — 0 mismatching |

Vacuity was re-derived rather than accepted: all 17 tests' assertions were re-implemented against
`git show origin/develop:<path>` content. One sub-assertion caveat — within the ingester test, the
four assertions on `review-pr`'s SKILL.md pass unmodified against `develop`, because that file is not
changed by this PR. They are legitimate forward regression pins but measure nothing this change did.

---

## Caveat on the retrospective QA reports

The disclosure in `qa.2`/`qa.3`/`qa.4` is adequate *as disclosure* — prominent, naming the rule it
broke, refusing to claim contemporaneity. But be clear what now exists: three files that satisfy the
1:1 gate↔report pairing while containing no independent measurement. **The trail now *looks* 1:1 to
any glob that counts pairs.** An operator should not read it as three cycles having been reviewed and
written up.

---

## Final Assessment

**Gate**: FAIL · **Quality Score**: 70/100 · **Deployment**: BLOCKED

**The substance of the change is good.** Every functional criterion is delivered, scope is tight,
nothing on the Out-of-Scope list was touched, the shell surface got smaller rather than larger, and
17 non-vacuous tests pin the behaviour. What fails is the **trail** — for the fourth cycle running.

**Loop Escalation.** The budget is spent. A human decides whether the six open findings block the
merge or become a follow-up work item.
