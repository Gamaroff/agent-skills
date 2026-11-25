# PR Review Report: PR #937 — feat(task.319): pipelines spend a CI run only where a run can answer something (#936)

**Reviewed:** 2026-11-24
**PR:** [#937](https://github.com/Gamaroff/agent-skills/pull/937) — `feature/task.319.ci-runs-only-where-needed` → `develop` (OPEN)
**Work item:** [`task.319.ci-runs-only-where-needed.md`](./task.319.ci-runs-only-where-needed.md) — resolved via `branch-stem`
**Tracker:** [#936](https://github.com/Gamaroff/agent-skills/issues/936) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.319.implementation.1.ci-runs-only-where-needed-initial-run.md |
| Review report | ✅ | task.319.review.1 and task.319.review.2 |
| QA reports | 7 | task.319.qa.1 to task.319.qa.7 |
| Gate | PASS | task.319.gate.7.ci-runs-only-where-needed.yml (100) |
| DoD | — | not expected before `/finalise` |
| Sprint review | — | not expected before `/finalise` |
| Open bugs | 0 | bugs 1, 2 and 3 are closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| 1 Every push site calls the helper, with a scan test | `shared/resources/push-policy.sh`, `push-policy.test.mjs` | ✅ met |
| 2 Simulated five-cycle run | `push-policy.test.mjs` | ✅ met |
| 3 The pause hook leaves the remote unmoved and says so | `develop-pipeline-on-precompact.sh`, its test | ⚠️ partial: the behaviour is there, four documents still say it pushes (PC-1 to PC-4) |
| 4 `skipMarker` never on a commit with code | `push-policy.test.mjs` | ✅ met |
| 5 A named command is graded on a run at the head | `finalise-rerun-at-head.js` and its test | ✅ met |
| 6 The probe scores an `eslint:` entry | `security-probe-eslint.test.mjs` | ✅ met |
| 7 Bitbucket poll writes the same line | `finalise-ci-poll.test.mjs` | ✅ met |
| 8 `tickVia: pr` ticks through a merged PR | `tick-pr.sh`, `tick-pr.test.mjs` | ✅ met |
| 9 Push count, before and after | QA report 7 | ✅ met |
| 10 Suite under `CI=true`; tests red before their change | QA report 7 | ✅ met |
| 11 Bundle leaves no diff | QA report 7 | ✅ met |
| 12 Four keys in the reference | `docs/reference/configuration.md` | ✅ met |
| 13 CHANGELOG | `CHANGELOG.md` `[Unreleased]` | ✅ met |

The criteria column is from the QA report's own table and the reviewer's reading of the diff.

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — shared/resources/develop-pipeline-pause.md:28
  A Phase 2 file still states that the PreCompact hook commits and pushes the pause entry, which is false under the new batched default
  → Say that the hook commits and that push-policy.sh decides the push (none under batched), then run npm run bundle

[PC-2] coverage · medium · confidence: high — skills/develop-task/SKILL.md:112
  The same statement
  → It commits, and pushes only under pipeline.pushRecordCommits: eager

[PC-3] coverage · medium · confidence: high — skills/develop-story/SKILL.md:117
  The same statement
  → As PC-2

[PC-4] coverage · medium · confidence: high — skills/develop-bug/SKILL.md:116
  The same statement
  → As PC-2

[PC-5] coverage · low · confidence: high — skills/develop-task/README.md:32
  Still says "push after every QA cycle", the rule this task removes
  → Reword to "pushed when push-policy.sh answers push"

[PC-6] coverage · low · confidence: high — skills/develop-task/README.md:25
  The Hooks row still lists "commit, push" for the PreCompact hook
  → Qualify it with pushRecordCommits: eager

[PC-7] coverage · low · confidence: high — skills/develop-story/README.md:27
  The same row
  → As PC-6

[PC-8] trail · low · confidence: high — docs/tasks/task.319.ci-runs-only-where-needed/task.319.plan.ci-runs-only-where-needed.md:117
  The Phase 0 appendix says it is the same table as push-policy.sh SITES, and no longer is
  → State that it is the Phase 0 snapshot, and that push-policy.sh --list is the current table

[PC-9] scope · low · confidence: high — docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md:308
  The Files Summary omits authored files this PR adds or changes, push-held.sh, tick-pr.sh and finalise-rerun-at-head.js among them
  → Add them to section 7

[PC-10] scope · low · confidence: high — docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md:176
  The document states fewer conditions for ci.skipMarker than the delivered script applies
  → State the delivered conditions in section 3
```

Each was checked by the orchestrator against the file at the head before it was recorded.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 10 checked against `35e3a97a8f5783cf40ba52bc5aa8c020749a3b8f` (via `head-branch`) — all verified

**Scope of the diff:** generated `skills/*/references/` copies were left out; the two hand-authored documents there (`develop-bug-step-5-6-verify-loop.md`, `develop-bug-step-7-close-bug.md`) were reviewed.

## Machine-Readable Findings

```yaml
reviewed_gate: task.319.gate.7.ci-runs-only-where-needed.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "shared/resources/develop-pipeline-pause.md:28"
    anchor_check: unchecked-text
    finding: "A Phase 2 file still states that the PreCompact hook commits and pushes the pause entry, which is false under the new batched default (section 5 change 2, criterion 3)."
    suggested_action: "Say that the hook commits and that push-policy.sh decides the push (none under batched), as lines 51 and 149 of the same file do, then run npm run bundle."
  - id: PC-2
    category: coverage
    severity: medium
    confidence: high
    ref: "skills/develop-task/SKILL.md:112"
    anchor_check: unchecked-text
    finding: "A Phase 2 file still states that the PreCompact hook commits and pushes the pause entry, which is false under the new batched default (section 5 change 2, criterion 3)."
    suggested_action: "Replace 'commits, pushes' with the batched behaviour: it commits, and pushes only under pipeline.pushRecordCommits: eager."
  - id: PC-3
    category: coverage
    severity: medium
    confidence: high
    ref: "skills/develop-story/SKILL.md:117"
    anchor_check: unchecked-text
    finding: "A Phase 2 file still states that the PreCompact hook commits and pushes the pause entry, which is false under the new batched default (section 5 change 2, criterion 3)."
    suggested_action: "Replace 'commits, pushes' with the batched behaviour: it commits, and pushes only under pipeline.pushRecordCommits: eager."
  - id: PC-4
    category: coverage
    severity: medium
    confidence: high
    ref: "skills/develop-bug/SKILL.md:116"
    anchor_check: unchecked-text
    finding: "A Phase 2 file still states that the PreCompact hook commits and pushes the pause entry, which is false under the new batched default (section 5 change 2, criterion 3)."
    suggested_action: "Replace 'commits, pushes' with the batched behaviour: it commits, and pushes only under pipeline.pushRecordCommits: eager."
  - id: PC-5
    category: coverage
    severity: low
    confidence: high
    ref: "skills/develop-task/README.md:32"
    anchor_check: unchecked-text
    finding: "The README still states the rule this task removes, 'push after every QA cycle', while its Git row and sequence diagrams were updated to push-policy.sh."
    suggested_action: "Reword the parenthesis to 'pushed when push-policy.sh answers push'."
  - id: PC-6
    category: coverage
    severity: low
    confidence: high
    ref: "skills/develop-task/README.md:25"
    anchor_check: unchecked-text
    finding: "The Hooks row still lists 'commit, push' for the PreCompact hook, which contradicts the same README's updated pause diagram."
    suggested_action: "Drop 'push' from the Hooks row or qualify it with pushRecordCommits: eager."
  - id: PC-7
    category: coverage
    severity: low
    confidence: high
    ref: "skills/develop-story/README.md:27"
    anchor_check: unchecked-text
    finding: "The Hooks row still lists 'commit, push' for the PreCompact hook, which contradicts the same README's updated pause diagram."
    suggested_action: "Drop 'push' from the Hooks row or qualify it with pushRecordCommits: eager."
  - id: PC-8
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.319.ci-runs-only-where-needed/task.319.plan.ci-runs-only-where-needed.md:117"
    anchor_check: unchecked-text
    finding: "The Phase 0 appendix says it is the same table as push-policy.sh SITES, but it lists qa-halt, qa-escalation and finalise-gaps, which the script no longer has, and lacks the halt and finalise-entry sites that it does have."
    suggested_action: "State that it is the Phase 0 snapshot and that push-policy.sh --list is the current table."
  - id: PC-9
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md:308"
    anchor_check: unchecked-text
    finding: "The Files Summary omits authored files this PR adds or changes (push-held.sh, tick-pr.sh, finalise-rerun-at-head.js, finalise-rerun-scope.js, criteria-section.js, pr-read.sh)."
    suggested_action: "Add the omitted files to section 7."
  - id: PC-10
    category: scope
    severity: low
    confidence: high
    ref: "docs/tasks/task.319.ci-runs-only-where-needed/task.319.ci-runs-only-where-needed.md:176"
    anchor_check: unchecked-text
    finding: "The document says any pushed tree-equivalent commit carries the marker once ci.skipMarker is set, but the delivered script also requires developNext.mergeStrategy: merge and no ci.docsOnly.checkCommand, and a HALT head is not marked."
    suggested_action: "State the delivered conditions in section 3, as docs/reference/configuration.md and the CHANGELOG already do."
truncated_count: 0
```

## Recommended Actions

1. PC-1 to PC-7: correct the seven statements that the pause or every QA cycle pushes
2. PC-8 to PC-10: bring the plan's appendix and the task document up to what was delivered
