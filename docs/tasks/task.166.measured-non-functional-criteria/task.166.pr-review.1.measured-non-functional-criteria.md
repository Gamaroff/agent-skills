# PR Review Report: PR #550 — feat(task.166): measured non-functional criteria get a defined path through review and finalise

**Reviewed:** 2026-10-02
**PR:** [#550](https://github.com/Gamaroff/agent-skills/pull/550) — `feature/task.166.measured-non-functional-criteria` → `develop` (OPEN)
**Work item:** [`task.166.measured-non-functional-criteria.md`](./task.166.measured-non-functional-criteria.md) — resolved via `branch-stem`
**Tracker:** [#510](https://github.com/Gamaroff/agent-skills/issues/510) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the full `origin/develop...origin/feature/task.166.measured-non-functional-criteria` diff (24 files, +2148/−50). No paths excluded — the two bundled `references/` copies are named in the task's Files Summary, so they were reviewed.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.166.implementation.1.measured-non-functional-criteria-initial-run.md` (QA-cycle entries uncommitted at review time — PC-2) |
| Review report | ✅ | `task.166.review.1.measured-non-functional-criteria.md` |
| QA reports | 6 | `task.166.qa.1` … `qa.6` |
| Gate | PASS | `task.166.gate.6.measured-non-functional-criteria.yml` (100) — gate-the-last-fix half-cycle |
| DoD | ❌ | not yet — Step 7 has not run (expected) |
| Sprint review | ❌ | not yet — Step 7 (expected) |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| AC prompt names three test-free kinds; measured PASS bar; unbounded criterion fails unless a per-PR test holds it | `shared/resources/finalise-dod-ac-prompt.md` § Step 3; `finalise-dod-ac-kinds.test.mjs` | ✅ met |
| Closing sentence covers all kinds; testable bound → behaviour | same | ✅ met |
| review-task flags a non-functional criterion not held by a planned test or a measured bound | `skills/review-task/SKILL.md` check 4; `review-task-measured-criterion.test.js` | ✅ met |
| obs #204 documentation kind covered | `finalise-dod-ac-kinds.test.mjs` | ✅ met |
| Behaviour-without-test and post-merge rules at Important | check 4; pin | ✅ met |
| Performance: each pin < 1s, measured | measurement taken at Step 3 on an earlier tree | ⚠️ partial (PC-1) |

## Conformance Findings

```
[PC-1] trail · low · confidence: high — implementation report:86
  The Performance criterion's only recorded measurement predates qa-fix cycles 1–5, which rewrote both pin files and added tests/lib/count-of-kinds.js.
  → Re-run `time node --test` on both pins at the PR head and record it with its command before /finalise.

[PC-2] trail · low · confidence: medium — implementation report on HEAD a96bbff9
  The QA-cycle entries exist only in the working tree; the pushed report does not show how the loop exited.
  → Commit the report with the 5c result (Step 8 does this).

[PC-3] scope · low · confidence: high — tests/lib/count-of-kinds.js; task § 7 Files Summary
  The diff adds a shared test helper the Files Summary does not list.
  → Add it to § 7 under Tests.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/finalise-dod-ac-prompt.md:51
  The measured kind passes on a value the pipeline wrote into its own report; the AC agent reads the line and checks a command is named, but does not re-measure.
  → Re-run the named command when cheap and read-only, or mark the PASS in `note` as resting on a self-reported measurement.

[CR-2] cleanup · low · confidence: high — tests/review-task-measured-criterion.test.js:106
  acKinds() re-parses the kinds section with its own regex, duplicating kindsSection() in the AC pin.
  → Share the section reader through tests/lib/.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: low
    confidence: high
    ref: "task.166.implementation.1.measured-non-functional-criteria-initial-run.md:86"
    finding: "The Performance criterion's only recorded measurement predates qa-fix cycles 1–5, which rewrote both pin files and added a helper."
    suggested_action: "Re-run time node --test on both pins at the PR head and record it with its command before /finalise."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "task.166.implementation.1.measured-non-functional-criteria-initial-run.md (HEAD a96bbff9)"
    finding: "The QA-cycle entries exist only in the working tree, so the pushed report does not show how the loop exited."
    suggested_action: "Commit the report with the 5c result."
  - id: PC-3
    category: scope
    severity: low
    confidence: high
    ref: "tests/lib/count-of-kinds.js"
    finding: "The diff adds a shared test helper the Files Summary does not list."
    suggested_action: "Add it to § 7 Files Summary under Tests."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/finalise-dod-ac-prompt.md:51"
    finding: "The measured kind passes on a self-reported value without re-measurement."
    suggested_action: "Re-run the named command when cheap and read-only, or mark the PASS as resting on a self-reported measurement in note."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "tests/review-task-measured-criterion.test.js:106"
    finding: "acKinds() duplicates the AC pin's section reader."
    suggested_action: "Share the section reader through tests/lib/."
truncated_count: 0
```

## Recommended Actions

1. PC-1 and PC-3 before `/finalise` (both cheap and mechanical); PC-2 is closed by Step 8's commit.
2. CR-1 — a follow-up: whether the AC agent should re-measure a measured criterion is a design choice with a cost (re-running commands inside finalise), recorded for a separate task rather than changed here.
3. CR-2 — a follow-up cleanup.
