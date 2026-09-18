# Task Review Report: Task 121 - QA tracker comments are keyed per stage, so every QA cycle after the first is silently dropped

**Reviewed:** 2026-09-18
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

> **Implementation Status**: ✅ All 9 recommendations implemented — 2026-09-18 (4 Important, 5 Optional)

---

## Executive Summary

The task's diagnosis is correct and every factual claim in it was re-verified against the tree
and against issue #419 (one `qa-gate`, one `qa-fix`, no `qa-cycle`, across three gate files). The
mechanism it proposes already exists for `qa-fix` and `qa-cycle`; nothing new is designed. What the
review found is a **scope boundary drawn one call site short in two places**: the orchestrator's
qa-loop doc carries a second unobserved duplicate (`qa-fix-{N}`, step 4a) beside the `qa-cycle-{N}`
block the task removes, and `develop-bug`'s verify loop is a live consumer of `qa-cycle-{N}` that
one success criterion would forbid. Both were resolved with the user and are folded into the
recommendations below.

**Critical Issues:** 0 🚨
**Important Issues:** 4 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 2 questions asked and answered
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (once the Important fixes below are applied)

---

## Decisions Log

```
Branch setup:
  - Started on: develop
  - Now on:     feature/task.121.cycle-scoped-qa-tracker-comments
  - Base:       develop
  - Epic branch:N/A
  - Auto-skip:  false
```

Output format: Comprehensive report (user choice, Step 0).

---

## Pre-pass Summaries

**Agent B — architecture alignment:** `alignment: drift`, two `severity: low` pattern notes
(test files are `.test.mjs` under `shared/resources/tests/` where coding-standards describe
co-located `*.test.js`; avoid `shared/resources/` literals inside shared sources). Both describe
the repository's existing convention rather than a defect in this task — no question raised.

**Agent C — already-implemented scan:** `implementation_status: not-implemented`. Every
deliverable is absent: `CYCLE_SCOPED_STAGES` lacks `qa-gate`; the three call sites pass bare
stages; the orchestrator block is present; the contract table and guard do not exist. The task is
open work. Agent C located the call sites at different line numbers than the plan cites — see O1.

---

## User Decisions & Clarifications

### Question Point 1: Scope

**Q1: The orchestrator's qa-loop doc also carries a `qa-fix-{N}` block (step 4a, ~line 894)
that the task never mentions. What should happen to it?**
- **User Decision**: Delete it too — same treatment as the `qa-cycle-{N}` block.
- **Impact**: Phase 2 gains one deletion; the qa-loop doc ends up with one pointer sentence per
  moment instead of a second writer. After the change `/qa-fix` Step 7 is the only writer of
  `qa-fix-N`.

**Q2: Should the `stakeholder-summary-cli.js` PR-lead calls beside each tracker call be suffixed
too, and should the bare-stage guard cover `PR_SITES` as well as `SITES`?**
- **User Decision**: Suffix both, guard both.
- **Impact**: Four PR-lead sites change, not three — `develop-pipeline-on-precompact.sh:227`
  passes `--stage pipeline-paused` bare to the lead CLI while its tracker call at `:329` is
  already `pipeline-paused-${CURRENT_STEP}`. In `qa-task`/`qa-story`, `QA_CYCLE` must be derived
  **before** the PR-lead call (`:1264` / `:1854`), which currently precedes the `THIS_GATE`
  resolution (`:1328` / `:1915`) that the plan says to derive it from.

---

## 1. Template Structure Compliance

**Status:** PASS

- All 11 numbered sections present, plus Change Log, Progress Tracking, References, Notes.
- File name `task.121.cycle-scoped-qa-tracker-comments.md` follows the dot convention.
- OKF: `type: task`, `description`, `tags` (list), `updated` all present.
- No placeholders.
- `estimated_effort_hours: 4` present (see O5).
- Change Log present and current for `planned` (one `1.0 Initial draft` row).
- Tracker: `github_issue: 421` — issue is OPEN, title matches, body link
  `[#421](…/issues/421)` matches. Board Priority self-healed to P1 (no-op check).
- Card preflight: exit 0 — Summary 597 chars (+1 omitted), Success Criteria 437 chars (+2
  omitted), Breaking Changes 281 chars. Information only.
- `sign-off` and `change-log` not configured in `skills-config.yaml` → sign-off skipped;
  change-log at default `advisory`, and it is current.

### Issues

None.

---

## 2. Technical Accuracy

**Status:** ACCURATE — every substantive claim verified
**Hallucinations Detected:** 0

Verified true against the tree:

- `CYCLE_SCOPED_STAGES` = `["qa-cycle","qa-fix","pipeline-paused"]` at `tracker-comment.js:107`;
  `isKnownStage` at `:251-261` accepts a numeric suffix only for list members.
- `CYCLE_SCOPED_LEAD_STAGES` at `stakeholder-summary.js:290`; `stripCycleSuffix` at `:296`.
- `stakeholder-summary.test.mjs:492-505` holds the two lists behaviourally equal with a `≥ 3`
  floor.
- `qa-fix` Step 7 passes `--stage qa-fix` (`:900`) with `--slot cycle="$FIX_CYCLE"` on the next
  line; `FIX_CYCLE` is derived at `:820` via `sed -E 's/.*\.gate\.([0-9]+)\..*/\1/'`.
- `qa-task` `:1339` and `qa-story` `:1926` pass `--stage qa-gate` bare; `THIS_GATE` is resolved
  at `:1328` / `:1915` for `blocking_count`.
- The `qa-gate` lead (`stakeholder-summary.js:115`) reads `verdict` and `blocking_count`;
  `qa-cycle` reads `verdict` and `cycle` — the stated reason for choosing `qa-gate` holds.
- `stakeholder-summary-cli.js --stage qa-gate-2` is rejected today (exit 2, "unknown --stage")
  and will be accepted once Phase 1 lands — the "verify, do not assume" note is discharged.
- Issue #419 markers: `review-task`, `work-started`, `develop-complete`, `in-review`, `qa-gate`,
  `qa-fix`, `done` — one QA marker each across three gate files. No `qa-cycle`, no `qa-fix-N`.

### Issues

#### Important

- **I4 — `tracker-comment.test.mjs:1506-1509` asserts the list literally.**
  `assert.deepEqual([...cli.CYCLE_SCOPED_STAGES], ["qa-cycle","qa-fix","pipeline-paused"])` goes
  red the moment `qa-gate` is added. The plan leaves this as "check whether the cases are
  table-driven or enumerated" — they are enumerated. Phase 1 must list the `deepEqual` update
  explicitly, not as a contingency; a developer who only adds the `qa-gate-2` case will get an
  unexplained red test.

#### Optional

- **O1 — Plan line anchors have drifted** (claims true, coordinates moved — obs #22 class):

  | Plan cites | Actual |
  |---|---|
  | `qa-fix/SKILL.md` Step 7 line ~859 | `:898-900` (`FIX_CYCLE` at `:820`, PR lead at `:828`) |
  | `qa-task/SKILL.md` Step 13b line ~1301 | `:1337-1339` (`THIS_GATE` at `:1328`, PR lead at `:1264`) |
  | `qa-story/SKILL.md` line ~1892 | `:1924-1926` (`THIS_GATE` at `:1915`, PR lead at `:1854`) |
  | `qa-loop.md` lines ~352-379 | `:350-379` (invocation at `:362`, `--stage` at `:364`) ✓ |
  | `stakeholder-summary.js` ~291 | `:290` ✓ |
  | `tracker-comment.js` 107 / 249-260 / `stakeholder-summary.js` 296 / tests 493-505, 1506 | ✓ |

- **O2 — The guard-regex contingency is already resolved.** The collector's
  `/--stage\s+"?([A-Za-z0-9_-]+)/` captures `qa-gate-` from `--stage "qa-gate-${QA_CYCLE}"` and
  `baseStage` strips the trailing hyphen to `qa-gate` — so a suffixed site reads
  `baseStage(stage) !== stage` and a bare one reads `CYCLE_SCOPED_STAGES.includes(stage)`. No
  regex extension is needed once `qa-gate` is in the list. Record this so nobody widens the regex.

---

## 3. Implementation Plan Completeness

**Status:** GAPS FOUND (two call sites outside the drawn boundary)

### Issues

#### Important

- **I1 — The orchestrator carries a second unobserved duplicate, for `qa-fix`.**
  `develop-pipeline-step-5-6-qa-loop.md` step 4a (`:894-910`) posts `--stage qa-fix-{N}` after
  each `/qa-fix` run. The task removes only the `qa-cycle-{N}` block (`:350-379`). After the fix,
  `/qa-fix` Step 7 and orchestrator 4a would both post marker `qa-fix-N`; whichever ran first
  wins and the other silently reads `already` — the bodies differ (fix summary vs commit hash).
  #419 shows 4a never ran (only one bare `qa-fix`). _Per user decision on Q1: delete 4a and its
  slot note alongside the `qa-cycle` block, leaving a one-line pointer to `/qa-fix` Step 7._

- **I3 — PR-lead calls: four sites, and an ordering constraint.** _Per user decision on Q2_:
  suffix `stakeholder-summary-cli.js --stage` at `qa-fix:828`, `qa-task:1264`, `qa-story:1854`
  **and** `develop-pipeline-on-precompact.sh:227` (`pipeline-paused` →
  `"pipeline-paused-${CURRENT_STEP}"`), and run the bare-stage guard over `PR_SITES` as well as
  `SITES`. In `qa-task`/`qa-story` the PR lead is rendered ~60 lines **before** `THIS_GATE` is
  resolved, so `QA_CYCLE` must be derived once, above the PR-lead call, and reused by both — the
  same "derive once, both comments need it" comment `qa-fix` already carries at `:816-822`.

#### Optional

- **O3 — State the expected site count, not just a floor.** After the change the collector finds
  5 suffixed `tracker-comment.js` sites (`precompact.sh:329`, `develop-bug` verify-loop `:89`,
  `qa-task`, `qa-story`, `qa-fix`) and 4 suffixed PR-lead sites. A `≥ 3` floor is satisfied but
  loose; state the count and the command that produced it (obs #117 class) so a future removal
  is noticed.

---

## 4. Consistency & Completeness

**Status:** ISSUES FOUND

### Issues

#### Important

- **I2 — Success criterion "No `qa-cycle` comment is posted by the orchestrator" is overbroad.**
  `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md:89` (a source file, not a
  bundle copy) posts `--stage qa-cycle-{N}` on every verify cycle. `develop-bug` never runs
  `qa-task`/`qa-story`, so that is its **only** per-cycle tracker comment and must stay. Scope
  the criterion to the `develop-story`/`develop-task` qa-loop doc. The Out-of-Scope rationale for
  keeping `qa-cycle` in the engine should name `develop-bug` as the live consumer — "removing a
  stage touches the lead catalogue" is true but secondary.

#### Optional

- **O4 — Motivation item 5** says "Two stages exist for the same moment" about `qa-cycle`; the
  finding is broader — the orchestrator doc carries **two** never-observed blocks (`qa-cycle-{N}`
  and `qa-fix-{N}`), one per QA moment. Say so, since it is why both are removed.

Scope and complexity: three phases, ~10 files plus bundle churn, one mechanism — correctly sized
for one task. No split recommended.

Testing Strategy covers unit, guard, contract and consumer layers, with a mutation proof. Rollback
covers all phases with triggers and validation.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

Risk register matches the change: no schema, no API, one list member and text edits. The one
medium risk (two `sed` expressions drifting) is mitigated by the user's Q2 decision — a single
`QA_CYCLE` derivation per skill, above both calls.

### Issues

#### Optional

- **O5 — Effort.** Rubric recomputes to 8h (9 criteria → +4, 10 plan tasks → +3, >5 files → +1,
  "integration" keyword → +2; computed 12 → bucket 8) against frontmatter 4h. Divergence is
  exactly 0.5 — at, not over, the flag threshold. Given Q1/Q2 added four call sites and a second
  guard population, 8h is the more defensible number. Informational; not a gate input.

---

## Summary of Recommendations

### Must Fix (Critical) - 0 issues

None.

### Should Fix (Important) - 4 issues

1. **I1** Add the orchestrator `qa-fix-{N}` block (qa-loop doc step 4a) to Phase 2's deletions and
   to Scope / Files Summary / Motivation — _per Q1_.
2. **I2** Scope success criterion "No `qa-cycle` comment…" to the develop-story/develop-task
   qa-loop doc; name `develop-bug`'s verify loop as the live `qa-cycle` consumer in Out of Scope.
3. **I3** Phase 2: suffix the four PR-lead calls (`qa-fix:828`, `qa-task:1264`, `qa-story:1854`,
   `precompact.sh:227`); derive `QA_CYCLE` once above the PR-lead call in `qa-task`/`qa-story`;
   Phase 3: the guard iterates `SITES` and `PR_SITES` — _per Q2_.
4. **I4** Phase 1: update the literal `deepEqual` at `tracker-comment.test.mjs:1506-1509`.

### Consider (Optional) - 5 items

1. **O1** Correct the plan's drifted line anchors.
2. **O2** Record that the collector regex already handles `"qa-gate-${…}"` — no extension.
3. **O3** State the expected suffixed-site counts (5 tracker, 4 PR-lead) with the command.
4. **O4** Motivation item 5: both orchestrator blocks are unobserved duplicates.
5. **O5** Consider `estimated_effort_hours: 8`.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10
- Technical Accuracy: 8/10 — every claim true; anchors drifted; one enumerated test not called out
- Implementation Clarity: 8/10 — precise plan; two "check whether" contingencies now resolvable
- Consistency: 7/10 — boundary missed one duplicate block and one live consumer
- Risk Management: 9/10

**Confidence Level for Successful Implementation:** High

**Recommendation:** ✅ **READY TO IMPLEMENT** — after the four Important fixes are written into
the task and plan. No critical issues; the fixes are scope statements, not design changes.

**Justification:** The diagnosis, mechanism and evidence are all correct and the engine already
does what the task asks it to do for two sibling stages. The gaps are two call sites that the
same collector the task's own guard reuses finds in under a second — writing them into the
document is what makes the guard's first green run meaningful.

---

## Next Steps

Task is ready for implementation once the fixes above are applied. Developer should:

1. Follow the plan phase by phase — Phase 1 (engine + tests, including the `deepEqual`) must
   land before any suffixed call site.
2. Derive `QA_CYCLE` once per QA skill, above the PR-lead call.
3. Run the guard over both site populations; mutation-prove it against `qa-fix` Step 7 and
   record the failure text in the implementation report.
4. `npm run bundle`, then `npm test` and `npm run bundle:check`.

---

## Review Metadata

- **Reviewer:** review-task (Claude)
- **Review Date:** 2026-09-18
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.cycle-scoped-qa-tracker-comments.md`
- **Plan File:** `docs/tasks/task.121.cycle-scoped-qa-tracker-comments/task.121.plan.cycle-scoped-qa-tracker-comments.md`
- **Architecture Docs Consulted:** `docs/architecture/concepts/coding-standards.md`, `tech-stack.md` (via pre-pass Agent B)
- **Sources Verified:** `shared/resources/tracker-comment.js`, `stakeholder-summary.js`, `stakeholder-summary-cli.js`, `tests/{tracker-comment,stakeholder-summary,comment-slot-coverage}.test.mjs`, `develop-pipeline-step-5-6-qa-loop.md`, `develop-pipeline-on-precompact.sh`, `skills/{qa-task,qa-story,qa-fix}/SKILL.md`, `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`, GitHub issue #419 comments
