# PR Review Report: PR #949 — fix(task.320): close the findings task 319 carried forward

**Reviewed:** 2026-11-25
**PR:** [#949](https://github.com/Gamaroff/agent-skills/pull/949) — `feature/task.320.task-319-leftover-findings` → `develop` (OPEN)
**Work item:** [`task.320.task-319-leftover-findings.md`](./task.320.task-319-leftover-findings.md) — resolved via `branch stem`
**Tracker:** [#938](https://github.com/Gamaroff/agent-skills/issues/938) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the diff against `origin/develop` without the generated `skills/*/references/` copies and the security probe run records (87 files in the PR).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.320.implementation.1.task-319-leftover-findings-initial-run.md` |
| Review report | ✅ | `task.320.review.1.task-319-leftover-findings.md` |
| QA reports | 4 | `task.320.qa.1` to `task.320.qa.4` |
| Gate | PASS | `task.320.gate.4.task-319-leftover-findings.yml` (100) |
| DoD | ❌ | not due before `/finalise` |
| Sprint review | ❌ | not due before `/finalise` |
| Open bugs | 0 | bugs 1 and 2 are Closed |
| Handover | none | |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| T319-CR-1201 | `finalise-rerun-at-head.js`; tests "T319-CR-805" | ✅ met |
| T319-CR-1202 | `finalise-rerun-at-head.js`; test "T319-CR-1005" | ✅ met |
| T319-CR-1203 | `finalise-rerun-at-head.js`; tests "T319-CR-1203" | ✅ met |
| T319-CR-1302 | `push-held.sh`; `push-policy.test.mjs` | ✅ met |
| T319-CR-1303 | `push-held.sh`; `push-policy.test.mjs` | ✅ met |
| T319-CR-1304 | `tick-pr.sh`; `tick-pr.test.mjs` | ✅ met |
| The limit of T319-CR-1301 is stated | `tick-pr.sh`, `develop-next/SKILL.md`, `configuration.md` | ✅ met |
| Escaped keys are refused | `ci-tree-equivalence.js`; `push-policy.test.mjs`, `ci-tree-equivalence.test.mjs` | ✅ met |
| The marker's edge | `ci-tree-equivalence.js`; `push-policy.test.mjs` | ✅ met |
| No new test over 30 s | QA report 4, Durations | ✅ met |
| Red before the change | QA reports 1 to 4 | ✅ met |
| Mutation table | QA report 4 | ✅ met |
| The suite under `CI=true`, the bundle | QA report 4 | ✅ met |
| `validate` of `develop-next` | QA report 4 | ✅ met |
| CHANGELOG | `CHANGELOG.md` cites task 320 | ✅ met |
| The reference on `ci.skipMarker` | `configuration.md` | ✅ met |
| Task 319's Deferred Work | task 319's document | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.qa.4.task-319-leftover-findings.md
  Section 10, medium risk 1, says of its document population measurement "Repeat it at QA and put the count in the QA report", and none of QA reports 1 to 4 holds the count or mentions the measurement; QA cycles 1 to 3 also widened the rule to documents whose reader result is an empty list, which the recorded measurement (null only) does not count.
  → Record the count in QA report 4, for both inputs of the widened rule; at the PR head readCriteriaEntries gave 342 documents, 0 null and 1 empty (task.308).

[PC-2] consistency · low · confidence: high — docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md:623
  The Notes still say that nothing in shared/resources has been changed and every test is still to be written, while the same document is ready-for-review with all phases ticked and the diff changes five engine files and four suites.
  → Put the two sentences in the past tense, as the state when the task was written, or remove them.

[PC-3] scope · medium · confidence: high — shared/resources/ci-tree-equivalence.js:567
  assertMarkerRow refuses a control or format character anywhere on the skipMarker row, its comment included, and any non-plain space at the value's ends, while Breaking Change 2 describes only a control or format character at the edge of a quoted value, says "Spaces at the ends need no change", and quotes the old error message.
  → Extend Breaking Change 2 with the comment and non-plain-space refusals and the new message, as CHANGELOG and the configuration reference already do.

[PC-4] scope · medium · confidence: medium — shared/resources/finalise-rerun-at-head.js:991
  The whole document is now searched also when a known criteria section holds none of the listed shapes (plain text, a fence, or a lone Given or Then line), so such a document is newly refused, while section 3 and section 10 risk 1 describe the search only for a document with no criteria heading the reader knows and section 5 lists no such refusal.
  → State the widened refusal in section 5 and correct section 10 risk 1 to the rule as it landed.

[PC-5] scope · low · confidence: high — skills/finalise/SKILL.md:614
  skills/finalise/SKILL.md is changed by the diff and named neither in Phase 4's files nor in section 7, whose documentation list ends at four files.
  → Add skills/finalise/SKILL.md to Phase 4 and to the section 7 documentation list.
```

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 5 checked against `7f00b91ffbbefa701cf30eb70311aea6581c8163` (via `head-branch`) — all verified

## Machine-Readable Findings

```yaml
reviewed_gate: task.320.gate.4.task-319-leftover-findings.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.qa.4.task-319-leftover-findings.md"
    anchor_check: no-line
    finding: "Section 10, medium risk 1, says of its document population measurement 'Repeat it at QA and put the count in the QA report', and none of QA reports 1 to 4 holds the count or mentions the measurement; QA cycles 1 to 3 also widened the rule to documents whose reader result is an empty list, which the recorded measurement (null only) does not count."
    suggested_action: "Record the count in QA report 4, for both inputs of the widened rule; at the PR head readCriteriaEntries gave 342 documents, 0 null and 1 empty (task.308)."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md:623"
    anchor_check: ok
    finding: "The Notes still say that nothing in shared/resources has been changed and every test is still to be written, while the same document is ready-for-review with all phases ticked and the diff changes five engine files and four suites."
    suggested_action: "Put the two sentences in the past tense, as the state when the task was written, or remove them."
  - id: PC-3
    category: scope
    severity: medium
    confidence: high
    ref: "shared/resources/ci-tree-equivalence.js:567"
    fix_path: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md"
    anchor_check: ok
    finding: "assertMarkerRow refuses a control or format character anywhere on the skipMarker row, its comment included, and any non-plain space at the value's ends, while Breaking Change 2 describes only a control or format character at the edge of a quoted value, says 'Spaces at the ends need no change', and quotes the old error message."
    suggested_action: "Extend Breaking Change 2 with the comment and non-plain-space refusals and the new message, as CHANGELOG and the configuration reference already do."
  - id: PC-4
    category: scope
    severity: medium
    confidence: medium
    ref: "shared/resources/finalise-rerun-at-head.js:991"
    fix_path: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md"
    anchor_check: ok
    finding: "The whole document is now searched also when a known criteria section holds none of the listed shapes (plain text, a fence, or a lone Given or Then line), so such a document is newly refused, while section 3 and section 10 risk 1 describe the search only for a document with no criteria heading the reader knows and section 5 lists no such refusal."
    suggested_action: "State the widened refusal in section 5 and correct section 10 risk 1 to the rule as it landed."
  - id: PC-5
    category: scope
    severity: low
    confidence: high
    ref: "skills/finalise/SKILL.md:614"
    fix_path: "docs/tasks/task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md"
    anchor_check: unchecked-text
    finding: "skills/finalise/SKILL.md is changed by the diff and named neither in Phase 4's files nor in section 7, whose documentation list ends at four files."
    suggested_action: "Add skills/finalise/SKILL.md to Phase 4 and to the section 7 documentation list."
truncated_count: 0
```

## Recommended Actions

1. Record the population count in QA report 4 (PC-1).
2. Bring the task document's Breaking Changes, risk 1, file lists and Notes to what landed (PC-2 to PC-5).
