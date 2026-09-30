# PR Review Report: PR #537 — feat(qa-results): QA Testing Results section engine — one writer, one place, refuses to stack (task 155)

**Reviewed:** 2026-10-01
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537) — `feature/task.155.qa-results-section-engine` → `develop` (OPEN, head `10340a1f`)
**Work item:** [`task.155.qa-results-section-engine.md`](./task.155.qa-results-section-engine.md) — resolved via `branch-stem`
**Tracker:** [#486](https://github.com/Gamaroff/agent-skills/issues/486) — OPEN
**Verdict:** ⚠️ CONCERNS

This is the fifth pass (Step 5c), run after QA cycle 10 (gate 10, CONCERNS 90), at effort `medium`. The scope was `git diff origin/develop...origin/feature/task.155.qa-results-section-engine`, excluding `*/references/*`. The excluded `skills/qa-{task,story}/references/qa-results.js` are bundled copies of `shared/resources/qa-results.js`, and `bundle:check` reports 0 problems. The implementation report was read from the **working tree**, which is 42 lines ahead of HEAD. There is no DoD yet, as expected before finalise.

The operator's decisions were checked, not re-argued:

- REL-028 and REL-029 were waived under the operator rule.
- REL-030 was accepted by an explicit decision, with the fix moved to a follow-up task.
- REL-031 was fixed after the gate.

Each one appears in gate 10's `top_issues` and `recommendations.future` and in the task's `## Deferred Work`. The wording differs in two places (PC-4, PC-5).

**The post-gate commit changed no behaviour.** `git diff 5322ba05 10340a1f` touches the gate 10 and QA 10 files, the task document's QA section and Deferred Work, one test title (N2), and three re-indented lines of qa-story Step 12 prose. It does not touch `qa-results.js`. The engine, wiring and corpus tests pass (68/68).

**No new deletion path was found, and no false refusal was found.** The code lens re-ran `upsertQaResults` read-only over all 155 tracked documents that have a QA section:

- All 155 were replaced, with no refusals.
- 0 lines were lost outside the section.
- A second run changed nothing.
- All 33 documents with a carried Bug Reports or Deferred Work heading kept every carried line. task.141's 22-line block was kept.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ (working tree ahead of HEAD) | `task.155.implementation.1.qa-results-section-engine-initial-run.md`. Cycle 10 reads `**Action**: Proceeding to 5c`. Cycles 9 and 10 and the operator decisions are **uncommitted** (PC-1). |
| Review report | ✅ | `task.155.review.1.qa-results-section-engine.md` |
| QA reports | 10 | `task.155.qa.1` … `task.155.qa.10` |
| Gate | CONCERNS | `task.155.gate.10.qa-results-section-engine.yml` (90), with REL-028/029 waived, REL-030 accepted by the operator and REL-031 fixed |
| DoD | — (expected) | not finalised |
| Sprint review | — (expected) | not finalised |
| Open bugs | 0 | — |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| One writer for the section (find + upsert) | `shared/resources/qa-results.js` `findQaResults` / `upsertQaResults`; `shared/resources/tests/qa-results.test.mjs` | ✅ met |
| Canonical placement before the change-log block | `canonicalOffset`; corpus test | ✅ met |
| Refuses to stack (`multiple`) and never deletes outside the span | refusals and `removesStructure`. Gate 10: 0 lines lost outside the span over 1,992 docs × 4 writes. This lens re-ran all 155 sections. | ✅ met |
| qa-task and qa-story Step 12 write through the engine | Step 12 in `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md`; `tests/qa-results-step12-wiring.test.js` | ✅ met |
| Corpus repaired and guarded (task.65) | `task.65` diff (−100); `tests/qa-results-corpus.test.js` | ✅ met |
| Content other writers put inside the section survives a replace | `CARRIED_SUBSECTIONS` holds Bug Reports and Deferred Work (tests N1, N2). Residuals REL-027/028/030 are recorded and accepted. | ✅ met (with accepted residuals) |
| § 3 reason table and § 9 criterion describe the shipped engine | They list five reasons. The engine returns seven and adds carry and refuse behaviour. | ⚠️ partial (PC-6) |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — task.155.implementation.1.qa-results-section-engine-initial-run.md (git diff HEAD: +42/−1, uncommitted)
  At 10340a1f the committed implementation report still reads "Status: Escalated" and stops at QA cycle 8.
  Missing from it: re-entry 2, the gate-9 operator rule, QA cycle 9, PR review 4, and QA cycle 10, including the REL-030 operator decision that gate 10 cites.
  All of these exist only in the working tree. PR review 4 PC-3 asked for them to be committed.
  → Commit the working-tree implementation report before finalise.

[PC-2] trail · low · confidence: high — implementation report § Pipeline Progress, row "5–6. qa-task / qa-fix loop"
  The row still reads "⏳ Pending" with empty notes, although the Decisions Log records ten cycles and four PR reviews.
  → Set the row to in progress and note 10 cycles, gate 10 CONCERNS 90, and 5c pass 5.

[PC-3] trail · low · confidence: medium — task doc § Deferred Work "Follow-up task (operator decision, 2026-10-01)"; gate.10 REL-030 resolution
  REL-030 is a deletion path that was accepted on condition that a follow-up task fixes it at the source.
  No task or issue number for that follow-up is cited anywhere yet.
  → File the follow-up task or issue, then cite its id in the task's Deferred Work and in gate 10's REL-030 resolution.

[PC-4] consistency · low · confidence: high — task.155.gate.10.qa-results-section-engine.yml deployment_readiness.conditions
  The conditions still say "Operator rule applied to REL-028..031".
  The gate's own top_issues, the task doc and the implementation report record something else:
  REL-030 falls outside the rule and was accepted by a separate explicit decision, and REL-031 was fixed.
  → Reword the conditions to match top_issues.

[PC-5] consistency · low · confidence: high — CHANGELOG.md [Unreleased] task 155 entry, "Known residuals (…)"
  The residuals clause names only a non-standard label (REL-027) and duplicate comment peels (REL-024).
  It leaves out the one accepted deletion path, REL-030 (a bold **Deferred Work** label in the section is deleted).
  It also leaves out REL-028 (nested carried blocks double on each write) and REL-029 (a heading that starts with a carried name is refused).
  → Name at least REL-030 and REL-028 in the residuals clause.

[PC-6] scope · low · confidence: medium — task doc § 3 reason table; § 9 Functional criterion
  The spec lists five reasons. It does not mention `unbounded`, `unplaceable`, the structural refusal,
  or the carried-block carry and refuse rule. The engine, the CHANGELOG and the Step 12 prose all describe these.
  → Update § 3 and § 9 to the seven reasons and the carried-subsection rule.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/qa-task/SKILL.md:1351
  Five distinct causes share `bad-section`, and both Step 12 halts print it with no repair hint:
  no leading heading, an unclosed fence, a fenced H1/H2, a render that brings a carried block (new in 5322ba05), and a result that is not exactly one section.
  An agent that re-renders from an existing section holding `### Bug Reports` halts its cycle and cannot tell what to remove.
  The halt does not delete anything. The missing hint is already recorded and deferred (REL-019, and REL-029's "the halt gives no hint").
  → Give the carried-block refusal its own reason or detail, and add a hint to both Step 12 halts: drop the block, the engine carries it.

[CR-2] cleanup · low · confidence: high — shared/resources/qa-results.js:171
  `linksIn` has no callers since 5322ba05 removed the line merge. The `end` field that collectBlocks returns (line 164) is unread.
  → Delete both, then run `npm run bundle`.

[CR-3] cleanup · low · confidence: medium — shared/resources/tests/qa-results.test.mjs:700
  N2 was renamed to claim "appended in CARRIED_SUBSECTIONS order" but asserts presence only.
  No test pins the reorder of a Deferred Work block that sits above Bug Reports.
  → Assert the order, including reversed input, or drop the order claim from the name.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "task.155.implementation.1.qa-results-section-engine-initial-run.md (git diff HEAD: +42/-1, uncommitted)"
    finding: "The committed implementation report stops at QA cycle 8. Cycles 9 and 10, PR review 4 and the REL-030 operator decision exist only in the working tree."
    suggested_action: "Commit the working-tree implementation report before finalise."
  - id: PC-2
    category: trail
    severity: low
    confidence: high
    ref: "implementation report § Pipeline Progress row 5–6"
    finding: "The QA loop row still reads Pending with empty notes after ten cycles and four PR reviews."
    suggested_action: "Mark the row in progress and note 10 cycles, gate 10 CONCERNS 90 and 5c pass 5."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "task doc § Deferred Work Follow-up task; gate.10 REL-030 resolution"
    finding: "REL-030 was accepted on condition of a follow-up task, but no follow-up task or issue id is cited anywhere."
    suggested_action: "File the follow-up and cite its id in Deferred Work and in gate 10's REL-030 resolution."
  - id: PC-4
    category: consistency
    severity: low
    confidence: high
    ref: "task.155.gate.10.qa-results-section-engine.yml deployment_readiness.conditions"
    finding: "The conditions say the operator rule was applied to REL-028..031, but REL-030 was a separate explicit decision and REL-031 was fixed."
    suggested_action: "Reword the conditions to match top_issues."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "CHANGELOG.md [Unreleased] task 155 entry, Known residuals"
    finding: "The CHANGELOG residuals leave out the accepted REL-030 deletion path and the REL-028 and REL-029 residuals."
    suggested_action: "Name at least REL-030 and REL-028 in the residuals clause."
  - id: PC-6
    category: scope
    severity: low
    confidence: medium
    ref: "task doc § 3 reason table; § 9 Functional criterion"
    finding: "The spec lists five reasons and no carried-block rule, but the engine returns seven reasons and carries and refuses blocks."
    suggested_action: "Update § 3 and § 9 to the shipped behaviour."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/qa-task/SKILL.md:1351"
    finding: "The carried-block refusal shares `bad-section` with four other causes, and both Step 12 halts print it with no hint; this overlaps the deferred REL-019 and REL-029."
    suggested_action: "Give the refusal its own reason or detail, and add a repair hint to both Step 12 halts."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/qa-results.js:171"
    finding: "`linksIn` and collectBlocks' `end` field are dead since 5322ba05."
    suggested_action: "Delete both, then run npm run bundle."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/tests/qa-results.test.mjs:700"
    finding: "N2's new name claims an order that the test does not assert."
    suggested_action: "Assert the order, including reversed input, or drop the claim from the name."
truncated_count: 0
```

## Recommended Actions

1. Commit the working-tree implementation report, with the Pipeline Progress row updated (PC-1, PC-2).
2. Make the records agree: reword gate 10's `conditions`, extend the CHANGELOG residuals to name REL-030 and REL-028, and bring task § 3 and § 9 up to date (PC-4, PC-5, PC-6). This is documentation only and changes no behaviour.
3. File the named follow-up task and cite its id where REL-030 is accepted (PC-3). The follow-up should also cover CR-1's `bad-section` hint (with REL-019 and REL-029) and the CR-2 and CR-3 cleanups.
