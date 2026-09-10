# Task Review Report: Task 105 — Every tracker-comment call site feeds the plain-language lead, and the seven that bypass the engine stop bypassing it

**Reviewed:** 2026-09-10
**Review Depth:** Standard
**Task Status:** Planned
**Overall Assessment:** GOOD

---

## Executive Summary

The task's direction is exactly what `AGENTS.md`, `tracker-comment-contract.md` and
`stakeholder-summary.md` argue for, its structure is complete, and its co-located plan is unusually
specific. What it gets wrong is concrete and mechanical: **roughly a third of its technical claims
about the engine do not match the engine as it stands today.** Three of the 22 sites are told to pass
slot names their stage's template does not read, the one slot `qa-gate` actually has besides
`verdict` is missing from the document entirely, the plan's close invocation is not a real
`tracker-issue.js` command line, and its justification for dropping `tracker_call_with_retry` rests on
a retry the engine does not have.

None of these blocks implementation and none is a design error — they are all "the spec drifted from
the code between authoring and pickup", which is what this review is for.

**Critical Issues:** 1 🚨
**Important Issues:** 6 ⚠️
**Optional Improvements:** 5 💡

**User Clarifications:** 0 questions asked — autonomous pipeline run (`/develop-next` → `/develop-task`); Step 8.5 and Step 9 auto-answered per the develop-task pipeline contract.
**Implementation Readiness:** 8/10
**Recommendation:** READY TO IMPLEMENT (after the Critical and Important fixes below, which this review applies)

---

## Pre-pass Summaries

Two read-only Explore agents ran in parallel before the review proper. **Every load-bearing claim
below was re-verified directly against the source before being written into this report** — per
`feedback_plan_is_intent_code_is_evidence` and because an agent's report is a claim, not evidence.

| Agent | Axis | Verdict |
| :--- | :--- | :--- |
| PREPASS_B | architecture / contract alignment | `drift` |
| PREPASS_C | codebase implementation status | `not-started` |

**PREPASS_C confirmed the task's two inventory claims exactly**, which matters because they are the
task's foundation: 22 `tracker-comment.js` invocation sites exist in source files (18 files), **zero**
pass any `--slot`, and there are exactly 7 bare-`gh` bypass sites at the 7 stated locations. No eighth
bypass site exists outside the deliberately-excluded precompact hook. The branch is 0 commits ahead of
`develop`; no source file has been touched.

**Task 104 is fully landed** (merge `fbfc400c`, PR #377): `tracker-comment.js` parses `--slot`
(L332–342), `stakeholder-summary.js` exists with `renderLead`, and the module is already bundled into
13 skills. So the task's precondition is satisfied and it can start immediately.

---

## 1. Template Structure Compliance

**Status:** PASS

All 11 mandatory numbered sections present, plus `## Change Log`, `## Progress Tracking`,
`## References`. No placeholders (`[TBD]`, `[TODO]`, `???`) anywhere. Filename follows
`task.{n}.{descriptive-name}.md` with dots as structural separators.

**OKF frontmatter**: `type: task` present ✅, `description` present ✅, `tags` is a YAML list ✅,
`updated` present ✅. Conformant.

**Sign-off**: `sign-off.enabled` is absent from `skills-config.yaml` → check skipped entirely, as
specified. Not a finding.

**Change Log**: present with one row (`1.0 Initial draft`), consistent with `status: planned`. Current.

**Tracker linkage**: `github_issue` was absent. Dedup search (`in:title "[Task 105]"`, `--state all`)
returned zero matches, so issue **#378** was created, added to the project board, `Priority` mirrored to
P2, and `github_issue: 378` plus a body cross-reference link written back. The board `Estimate` field
does not exist on this board — logged, non-blocking.

**Tracker card preflight**: exit 0, zero findings — all three card blocks resolve.

> 💡 **Optional, and out of this task's scope:** the preflight passes, but the Success Criteria block
> it would publish is the 14-character string `**Functional**` and nothing else, with 8 items omitted.
> `summariseSection` treats a leading bold sub-heading as the section's prose and stops there. This is
> **not** a defect in task.105 — measured across the corpus, **15 of 106 task documents** publish the
> same near-empty Success Criteria card block. It is a defect in the summariser, and belongs in its own
> bug report rather than in this task. Recorded here so the passing preflight is not read as proof the
> card is good.

---

## 2. Technical Accuracy

**Status:** ISSUES FOUND
**Hallucinations Detected:** 0 — nothing is invented. Every file, flag and module the task names is
real. What is wrong is the *mapping* between them, which is drift, not hallucination.

### Critical

#### C1 — Three of the 22 sites are told to pass slot names their stage's template does not read, and the one slot `qa-gate` actually has is missing from the document

This is the task's central mechanism, and it is specified wrongly in three places.

The authoritative catalogue is `shared/resources/stakeholder-summary.js` L58–141, with slot
classification at L178–180. Per-stage, the templates read **exactly** these slots:

| Stage | Slots the template actually reads |
| :--- | :--- |
| `work-started` | `title` |
| `review` / `review-story` / `review-task` / `review-bug` | `outcome`, `blocking` |
| `develop-complete` | `count` |
| `in-review` | `pr` |
| `qa-gate` | `verdict`, **`blocking_count`** |
| `qa-cycle` | `verdict`, `cycle` |
| `qa-fix` | `cycle` |
| `done` | `pr` |

Against that, the task document §3 and the plan's site table say:

- **Sites 17–18 (`qa-gate`, `qa-story` / `qa-task`)** — task says slots `verdict`, `pr`.
  The `qa-gate` template reads **no `pr`**. `--slot pr=…` there is inert.
- **Site 8 (`qa-cycle-{N}`, step-5-6)** — task says slots `verdict`, `count`, `cycle`.
  The `qa-cycle` template reads **no `count`**. `count` is read only by `develop-complete`. Inert.
- **`blocking_count`** — the only slot `qa-gate` has besides `verdict`, and the one that would make the
  lead say how many problems must be dealt with — **appears nowhere in task.105**.

**Why this is Critical rather than Important.** `tracker-comment.js` performs **no slot-name
validation whatsoever**: L332–342 splits on the first `=` and stores any key. `normaliseSlots`
(`stakeholder-summary.js` L190–233) classifies known names and passes unknown ones through, where the
template simply never reads them. There is no exit code, no warning, no log line. A wrong slot name
produces a comment that posts successfully and reads as though the slot were never supplied. Faithfully
implementing the task as written would therefore ship three inert slots and satisfy Success Criterion 1
by its letter ("all 22 call sites pass at least one `--slot`") while missing its point.

**Fix applied**: §3's slot column corrected at sites 8, 17–18; `blocking_count` added to the `qa-gate`
row; the plan's site table corrected identically; a new §3 sub-section pins the authoritative
per-stage slot table with its source line reference.

### Important

#### I1 — The plan's close invocation is not a real `tracker-issue.js` command line

Plan L143 writes:

```bash
node …/tracker-issue.js --issue {TRACKER_ISSUE} --close --json
```

`tracker-issue.js` has **no `--close` flag**. Closing is a `--kind`: `--kind close --issue N`
(usage at L158, `KINDS` at L95, argv construction at L627/L778). As written the command exits 2 on a
usage error, which — in a step doc a reader executes — means the issue is commented and never closed.

**Fix applied**: corrected to `--kind close --issue {TRACKER_ISSUE} --reason completed --json`.

#### I2 — "The engine has its own retry" is false; converting these sites silently drops the 3× backoff

Plan L124–127 justifies dropping `tracker_call_with_retry` on the grounds that "the engine has its own
retry and its own `ACCESS_TRACKER` deferral gate — wrapping it again would double-defer."

**Half of that is true and half is not**, and the false half is the one the sentence leans on:

- ✅ The deferral gate is real. `tracker-comment.js` requires `defer-mutation.js` (L68) and returns
  `reason: "deferred"` under a restricted `ACCESS_TRACKER` (L663, L704). Wrapping it in `tracker_write`
  **would** double-defer.
- ❌ **`tracker-comment.js` contains no retry at all.** `grep -ci 'retry\|backoff\|sleep'` returns 0.
  The 3× exponential backoff lives in `tracker_write` (`resolve-platform.sh` L588), of which
  `tracker_call_with_retry` is a straight alias (L721–731). And
  `develop-pipeline-step-7-finalise.md` L164 currently states these calls **MUST** be wrapped in it.

So the conversion is a real trade, not a no-op: it buys correct single-deferral and idempotency, and it
costs the retry. The plan asks the implementer to "say in the implementation report which mechanism now
owns the retry" — the honest answer is **nothing does**, and that sentence must be written rather than
left to be discovered.

The established convention supports making the trade: the reference implementation this task points at,
`review-task` SKILL.md L1743, carries **no** retry wrapper and degrades with
`|| echo "⚠️ GitHub issue comment failed — continuing"`. Match it.

**Fix applied**: the plan's claim corrected to name the real owner of the retry, state the trade
explicitly, and require the implementation report to record it. §5.1's impact list gains the lost retry.

#### I3 — `outcome` is interpolated verbatim, which reproduces the raw-token failure the standard exists to prevent

The plan sets `outcome="{RECOMMENDATION}"` at the four review sites. `outcome` is a **TEXT** slot
(`TEXT_SLOTS` at `stakeholder-summary.js` L180) — passed through untouched into
`— the result was ${s.outcome}`.

`RECOMMENDATION` is one of `READY TO IMPLEMENT` / `NEEDS REVISION` / `REQUIRES REWORK`, and
`stakeholder-summary.md` L80–83 requires internal tokens to be **mapped, never passed through**. That
rule has exactly one implementation today — `GATE_MEANING`, which covers `verdict` only. Rendering
"the result was REQUIRES REWORK" in the paragraph written for a reader with no technical background is
the failure the standard names, arriving through the slot mechanism instead of the body.

**Fix applied**: the plan now requires plain-language values at these sites
(`outcome="ready to build"` / `"needs more detail"` / `"needs rework"`), mapped at the call site, with a
note that moving the mapping into the engine is the better long-term fix and belongs to whoever next
touches `stakeholder-summary.js`.

#### I4 — The slot half of the task has no population check, which is the anti-pattern the repo names explicitly

`docs/reference/anti-patterns.md` L129: *"when a fix is the same edit applied at more than one call site
… the deliverable is the check that finds site N+1 — not the N edits."*

Phase 4 provides exactly that for the **bypass** half (the zero-bare-`gh` guard). The **slot** half —
22 hand-enumerated sites, drawn from a line-number table the task itself admits is stale — has no
check at all. Nothing asserts that every `tracker-comment.js` site passes a slot, and nothing asserts
that a slot name is one its stage's template reads.

That second assertion is worth more than the first, because it is the automated form of finding **C1**:
with it in place, C1 could not have survived authoring, and cannot silently return.

**Fix applied**: Phase 4 gains a second guard — every `tracker-comment.js` invocation in shipped source
passes ≥1 `--slot`, and every slot name passed is in the set its stage's template reads (imported from
`stakeholder-summary.js`, never restated). Success Criterion 1 rewritten to require the check rather
than the count. A matching mutation proof added.

#### I5 — `BARE_COMMENT_ALLOWLIST` is incomplete, and the gap is the "allowlist widens silently" failure

The plan's six-entry allowlist misses four shipped-prose sites carrying the literal
`gh issue comment`: `develop-pipeline-step-0-resolve-and-prepare.md` L401,
`develop-pipeline-step-4-create-pr.md` L196 and L215, and `create-pr/SKILL.md` L386. Three of those four
are prose *prohibiting* a bare `gh issue comment` — so a naive literal guard fails on the documentation
of the very rule it enforces.

Widening the allowlist to cover them is the wrong fix: it is the silent-widening failure
`anti-patterns.md` names in the same section. The guard must distinguish an **invocation** from a
**mention**.

**Fix applied**: Phase 4 now specifies matching invocation shape (line begins with the command, or is
preceded by `tracker_call_with_retry`/`tracker_write`) rather than the bare literal, keeps the allowlist
for genuine exceptions only, and keeps both the non-vacuity floor and the on-disk existence check.

#### I6 — §8's "16 test files" is inflated; five of the eight named per-skill test directories do not exist

§8 names `skills/{qa-story,qa-task,qa-fix,review-story,review-task,review-bug,finalise,create-pr}/tests/*`.
Only three of those eight directories exist (`qa-story`, `qa-task`, `review-bug`), and of those only
`qa-story` and `qa-task` contain comment-shape assertions. Three further named files
(`handover-verify`, `handover-render`, `qa-execute-snippets`) contain no `tracker-comment` reference at
all.

An inflated test inventory is not harmless in this repo: `npm test` lists per-skill globs by hand
(`project_npm_test_glob_orphans_suites`), so a plan that assumes a suite exists is a plan that assumes
it runs.

**Fix applied**: §8's table replaced with the verified set, with the two "these directories do not
exist" facts stated so a new suite is a deliberate decision rather than an assumed one.

---

## 3. Implementation Plan Completeness

**Status:** COMPLETE

Five phases, each with files, risk level and concrete checkboxes. The co-located plan file is
genuinely executable: it gives the diff shape, a per-site slot table, the ordering argument (risky half
first, guard last), and the exact mutation proofs. This is above the median for this repo.

Two things it does especially well and which should survive editing:

- It **instructs the implementer to re-locate every site by grep before editing** and says why. That
  instruction earned its place — 5 of the 22 line numbers had already decayed by the time this review
  ran (step-3 207→265 and 230→288; step-5-6 794→796; finalise 1196→1241 and 1292→1337). The inventory
  held; only the coordinates moved.
- It **flags the `--stage done` marker collision** rather than leaving it to be discovered. See O4.

**Effort estimate**: `estimated_effort_hours: 12` against 5 phases, 13 success criteria and ~15 test
files. Consistent with the rubric; no finding.

---

## 4. Consistency & Completeness

**Status:** CONSISTENT

Overview, Scope, Implementation Plan, Files Summary and Success Criteria agree with each other.
Breaking Changes §5.1–5.3 each carry impact and migration. Out-of-scope is explicit and correctly
excludes task.106 (PR comments), the precompact hook and `tracker-reconcile`.

Scope is one coherent concern (tracker-issue comment transport + slot values). Five phases is under the
>8 threshold. No split recommended.

### Optional

#### O1 — The dependency prose is stale

The task reads as though `--slot` does not exist yet ("It supplies values to a flag that does not exist
until then"). Task 104 merged on 2026-09-09 as PR #377; `--slot` ships today, and this very pipeline
run posted its `work-started` comment with `--slot title=…` successfully.

**Fix applied**: reworded to past tense with the merge recorded.

#### O2 — The precompact hook is cited at two lines; only one is a live call

§3 cites `develop-pipeline-on-precompact.sh` L133/L140. Only **L140** is a live `gh issue comment`.
**Fix applied**: corrected to L140.

#### O3 — Prior art exists for comment-then-close, and the task should copy it rather than invent it

`skills/finalise/SKILL.md` L1325–1347 already implements exactly the pattern Phase 3 describes: a
`tracker-comment.js --stage done` comment, then `tracker-issue.js --kind close --reason completed` with
no `--comment`, and a note explaining that `--comment` on a close is an unmarked second comment the
marker cannot see, so it recurs on every resume.

**Fix applied**: Phase 3 now points at it as the worked example.

#### O4 — The `--stage done` marker collision is real but already solved upstream; no task.104 change is needed

The plan correctly identifies that two `--stage done` comments on one issue collapse — verified:
`tracker-comment.js` L751–786 returns `already` on exactly one marker match and does not post. It then
warns this "is the one place where this task can require a change back in task.104's module", which
would put a new stage and a new lead template into task.105's scope.

**It does not.** Two findings close it:

1. The `--stage done` call at `develop-pipeline-step-7-finalise.md` L241 is in the **Jira** arm. The
   four bare-`gh` sites are in the **GitHub** arm. The file branches on `TRACKER`, so they are mutually
   exclusive and never collide in one run.
2. Within the GitHub arm, the two comments (completion, then close) *would* collide — and O3's prior art
   is the resolution: **one** `--stage done` comment carrying PR, status, DoD and report path, then a
   close with no `--comment`. The two existing texts are near-duplicates; merging them loses nothing.

**Fix applied**: recorded as a resolved decision in Phase 3 with both reasons, and the "may require a
change back in task.104" warning removed so it does not re-open at implementation time.

#### O5 — `pr` slot: URL or number

`pr="{PR_URL}"` renders a full URL inside the lead. `stakeholder-summary.md` L41 forbids file paths,
command names and branch names in the lead and L44 forbids unexpanded acronyms; a bare URL is not
listed either way, and the catalogue does define `{pr}` for `in-review` and `done`. Permitted, but worth
settling once before 22 sites bake it in.

**Fix applied**: none to the spec — recorded as a decision for the implementer, with the recommendation
to pass the URL (it is the one thing a reader can act on) and to keep it out of the sentence's grammar.

---

## 5. Risk & Rollback Assessment

**Status:** ADEQUATE

§10 identifies the right HIGH risk — an unbound variable rendering a literal `${…}` into a live
comment with nothing failing — and §11's rollback is unusually well-reasoned: the partial revert
(Phase 3 alone) correctly identifies the transport conversions as the risky half, and the forward fix
correctly relies on task.104's design property that a template renders correctly with `{}`.

**One gap, folded into I4.** §10's HIGH-risk mitigation is a per-site check that each slot's **variable
is bound**. That catches an unbound variable. It does **not** catch a slot whose *name* is wrong —
which is C1, which actually happened, three times, in the task's own table. A bound variable passed
under a name no template reads is silent in exactly the way §10 says this defect class is dangerous.

**Fix applied**: §10's HIGH-risk mitigation extended to cover the slot-name axis and to name the Phase 4
guard as the mechanical form of it.

---

## Summary of Recommendations

### Must Fix (Critical) — 1

1. **C1** — Correct the slot-to-stage mapping at sites 8 and 17–18; add `blocking_count`; pin the
   authoritative per-stage slot table in §3 with its source reference. ✅ applied

### Should Fix (Important) — 6

1. **I1** — `tracker-issue.js --kind close --issue N`, not `--close`. ✅ applied
2. **I2** — Correct the false "engine has its own retry" claim; state the trade; require it in the
   implementation report. ✅ applied
3. **I3** — Map `outcome` to plain language at the call site rather than passing `RECOMMENDATION`
   through. ✅ applied
4. **I4** — Add the slot-half population check (every site passes a slot; every slot name is one its
   stage reads); rewrite Success Criterion 1 around the check. ✅ applied
5. **I5** — Make the bypass guard match invocation shape, not the bare literal, so it does not fail on
   prose prohibiting the thing it enforces. ✅ applied
6. **I6** — Replace §8's inflated test inventory with the verified set. ✅ applied

### Consider (Optional) — 5

1. **O1** — De-stale the task.104 dependency prose. ✅ applied
2. **O2** — precompact hook is L140 only. ✅ applied
3. **O3** — Point Phase 3 at the `finalise` prior art. ✅ applied
4. **O4** — Record the `--stage done` collision as resolved; no task.104 change needed. ✅ applied
5. **O5** — Settle `pr` = URL before 22 sites bake it in. Recorded as an implementer decision.

**Not applied — out of scope, recorded for follow-up**: the `summariseSection` defect that publishes a
14-character Success Criteria card block on 15 of 106 task documents (see §1). This is a defect in the
card summariser, not in task.105, and belongs in its own bug report.

---

## Implementation Readiness Assessment

**Score:** 8/10

**Scoring Breakdown:**

- Template Compliance: 10/10 — all sections, no placeholders, OKF-conformant, card preflight clean
- Technical Accuracy: 5/10 — one Critical and three Important factual drifts against current code
- Implementation Clarity: 9/10 — the co-located plan is specific, ordered and executable
- Consistency: 9/10 — internally coherent; scope boundaries explicit and correct
- Risk Management: 8/10 — right risks, good rollback; the mitigation missed the slot-name axis

**Confidence Level for Successful Implementation:** High (after the applied fixes)

**Recommendation:** ✅ **READY TO IMPLEMENT**

**Justification:** The task is structurally complete, correctly scoped, endorsed by the contracts it
cites, and its precondition (task.104) is fully landed. Its defects were all of one kind — a spec
written against the code as it was, reviewed against the code as it is — and all of them were
correctable in the document rather than requiring a rethink. The single most valuable change is I4:
the task now ships the check that would have caught its own Critical finding.

---

## Next Steps

Task is ready for implementation. The implementer should:

1. **Re-grep every site before editing.** The task says so and it was right — 5 of 22 line numbers had
   already moved.
2. Follow the plan's ordering: one Phase 3 conversion with its behavioural test first, then the Phase
   1–2 bulk sweeps, then the remaining conversions, then the Phase 4 guards last.
3. Record in the implementation report, explicitly: that nothing owns the retry after conversion (I2),
   which body won the `review-story` arm collapse, and the `pr`-slot decision (O5).
4. Run `qa-execute-snippets.test.mjs` alone before believing a failure in it — it is load-flaky
   (`project_qa_execute_snippets_load_flake`).
5. `npm run bundle` last, and confirm only `skills/*/references/` copies changed.

---

## Review Metadata

- **Reviewer:** Claude (`/review-task`, invoked by `/develop-task` Step 2 under `/develop-next`)
- **Review Date:** 2026-09-10
- **Review Depth:** Standard
- **Task File:** `docs/tasks/task.105.comment-call-sites-plain-language-lead/task.105.comment-call-sites-plain-language-lead.md`
- **Pre-pass agents:** 2 dispatched, 2 returned (architecture alignment: `drift`; codebase: `not-started`)
- **Sources consulted:** `shared/resources/stakeholder-summary.js`, `shared/resources/stakeholder-summary.md`, `shared/resources/tracker-comment.js`, `shared/resources/tracker-comment-contract.md`, `shared/resources/tracker-issue.js`, `shared/resources/resolve-platform.sh`, `shared/resources/develop-pipeline-step-7-finalise.md`, `skills/finalise/SKILL.md`, `skills/review-task/SKILL.md`, `shared/resources/jira-sync.js`, `docs/reference/anti-patterns.md`, `AGENTS.md`
