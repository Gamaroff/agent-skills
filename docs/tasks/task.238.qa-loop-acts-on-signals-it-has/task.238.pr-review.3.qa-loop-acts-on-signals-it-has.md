# PR Review Report: PR #770 — feat(task.238): QA loop acts on the signals it already has (#768)

**Reviewed:** 2026-10-28
**PR:** [#770](https://github.com/Gamaroff/agent-skills/pull/770) — `feature/task.238.qa-loop-acts-on-signals-it-has` → `develop` (OPEN)
**Work item:** [`task.238.qa-loop-acts-on-signals-it-has.md`](./task.238.qa-loop-acts-on-signals-it-has.md) — resolved via `branch-stem`
**Tracker:** [#768](https://github.com/Gamaroff/agent-skills/issues/768) — OPEN
**Verdict:** 🚨 REQUEST CHANGES

Run by hand after the QA loop escalated at its limit (9 of 9): HALT option 2, "accept the current
gate status". Effort `medium`, `--no-code`: the code lens ran in every QA cycle, so only the
conformance lens ran here.

**Scope:** the diff excludes the generated `skills/*/references/*` copies (headed
`AUTO-GENERATED`). One hand-authored file under `references/` is reviewed: the task names
`skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md` (Escalated) |
| Review report | ✅ | `task.238.review.1.qa-loop-acts-on-signals-it-has.md` |
| QA reports | 9 | `task.238.qa.1` … `task.238.qa.9` |
| Gate | CONCERNS | `task.238.gate.9.qa-loop-acts-on-signals-it-has.yml` (80) |
| DoD | ✅ | `task.238.dod.1.qa-loop-acts-on-signals-it-has.md` (gaps; all 5 fixed since) |
| Sprint review | ❌ | none: the task is not accepted, which is correct |
| Open bugs | 2 | `task.238.bug.18…`, `task.238.bug.19…` (Ready for QA) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The conformance lens raised no coverage finding. Per-criterion evidence is in QA report 9.

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC-1 – SC-6 (behaviour) | QA report 9 traceability; `pr-review-loop-parity.test.mjs`, `qa-loop-fast-gate-outcomes.test.mjs`, `qa-ci-read.test.mjs` | ✅ met (SC-2 as amended in cycle 6) |
| SC-7 – SC-9 (gates) | ci:fast 6535/0, bundle:check and validate green at `0df2880e` | ✅ met |
| SC-10 (mutation-proved) | each cycle's commit message | ✅ met |
| SC-11, SC-12 (docs) | `CHANGELOG.md`; the Step 3.5 probe in each fix | ✅ met |

## Conformance Findings

```
[PC-1] trail · high · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md:577
  The highest gate (gate.9, CONCERNS 80) never reached 5c: its QA Cycle 9 entry reads "Escalating — loop limit reached" and "PR Review: not reached", and the Completion block records the run as halted.
  → Re-gate the branch through QA and let a cycle exit on an accepting route, so its entry reads "Proceeding to 5c" with a terminal PR Review verdict, before /finalise.

[PC-2] trail · medium · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.gate.9.qa-loop-acts-on-signals-it-has.yml
  The newest gate judges head 51dc912e, but the PR head ded46852 also holds the cycle 9 fix commit 0df2880e, which no gate has judged.
  → Run a QA cycle (gate.10) on the current PR head so the cycle 9 fix has a gate behind it.

[PC-3] trail · medium · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.18.open-coverage-reads-empty-when-awk-fails.md
  The co-located bug report is still open: Status reads Ready for QA, not Closed.
  → Verify the fix in a new QA cycle and close the bug report.

[PC-4] trail · medium · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.19.open-coverage-reads-keys-after-a-flow-entry.md
  The co-located bug report is still open: Status reads Ready for QA, not Closed.
  → Verify the fix in a new QA cycle and close the bug report.

[PC-5] consistency · medium · confidence: high — pr_number
  The work item's frontmatter has no pr_number field, though the work item is implemented by PR #770.
  → Add pr_number: 770 to the task document's frontmatter.

[PC-6] consistency · low · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:34
  The Overview still promises three fast-gate outcomes, including "pre-existing red", which QA cycle 6 removed.
  → Reword the Overview deliverable to the amended two outcomes for a red gate.

[PC-7] consistency · low · confidence: high — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:156
  The Phase 1 checkbox is ticked for a "pre-existing red" outcome and BASE_CHECK=unavailable handling that the diff no longer delivers.
  → Amend the Phase 1 checkbox text to match the delivered two-outcome classification.

[PC-8] consistency · low · confidence: medium — docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:383
  The Definition of Done gaps section still cites gate 3 with unticked Next Steps, though gate 9 is the latest and the five DoD gaps were fixed in adff39e2.
  → Refresh the DoD gaps section when /finalise re-runs, or mark it superseded.
```

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 8 checked against `ded4685242e16470fba751f76db9cb65914be41f` (via `head-branch`) — all verified (2 ok, 2 unchecked-text, 4 no-line)

## Machine-Readable Findings

```yaml
reviewed_gate: task.238.gate.9.qa-loop-acts-on-signals-it-has.yml
findings:
  - id: PC-1
    category: trail
    severity: high
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.implementation.1.qa-loop-acts-on-signals-it-has-initial-run.md:577"
    anchor_check: ok
    finding: "The highest gate (gate.9) never reached 5c; its QA Cycle 9 entry reads Escalating — loop limit reached."
    suggested_action: "Re-gate the branch through QA so a cycle exits on an accepting route before /finalise."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.gate.9.qa-loop-acts-on-signals-it-has.yml"
    anchor_check: no-line
    finding: "The cycle 9 fix commit 0df2880e on the PR head has no gate behind it."
    suggested_action: "Run a QA cycle (gate.10) on the current PR head."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.18.open-coverage-reads-empty-when-awk-fails.md"
    anchor_check: no-line
    finding: "The co-located bug report is still open (Ready for QA)."
    suggested_action: "Verify the fix in a new QA cycle and close the bug report."
  - id: PC-4
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.bug.19.open-coverage-reads-keys-after-a-flow-entry.md"
    anchor_check: no-line
    finding: "The co-located bug report is still open (Ready for QA)."
    suggested_action: "Verify the fix in a new QA cycle and close the bug report."
  - id: PC-5
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The work item's frontmatter has no pr_number field."
    suggested_action: "Add pr_number: 770 to the task document's frontmatter."
  - id: PC-6
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:34"
    anchor_check: unchecked-text
    finding: "The Overview still promises three fast-gate outcomes."
    suggested_action: "Reword the Overview deliverable to the amended two outcomes for a red gate."
  - id: PC-7
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:156"
    anchor_check: unchecked-text
    finding: "The Phase 1 checkbox is ticked for an outcome the diff no longer delivers."
    suggested_action: "Amend the Phase 1 checkbox text to match the delivered classification."
  - id: PC-8
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.238.qa-loop-acts-on-signals-it-has/task.238.qa-loop-acts-on-signals-it-has.md:383"
    anchor_check: ok
    finding: "The Definition of Done gaps section still cites gate 3."
    suggested_action: "Refresh the DoD gaps section when /finalise re-runs, or mark it superseded."
truncated_count: 0
```

## Recommended Actions

1. Run one QA cycle (gate 10) on the PR head. That clears PC-1 to PC-4 if it reads clean.
2. Add `pr_number: 770` and fix the two stale task-doc lines (PC-5 to PC-7).
3. Then `/finalise`.
