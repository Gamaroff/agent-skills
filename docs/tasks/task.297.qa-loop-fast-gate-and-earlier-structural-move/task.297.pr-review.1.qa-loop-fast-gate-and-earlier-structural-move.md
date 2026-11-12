# PR Review Report: PR #895 — feat(task.297): QA loop records a skipped fast gate; structural-move trigger is a rule

**Reviewed:** 2026-11-13
**PR:** [#895](https://github.com/Gamaroff/agent-skills/pull/895) — `feature/task.297.qa-loop-fast-gate-and-earlier-structural-move` → `develop` (OPEN)
**Work item:** `task.297.qa-loop-fast-gate-and-earlier-structural-move.md` — resolved via `branch stem`
**Tracker:** none — the task carries no github_issue or jira_key
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.297.implementation.1.qa-loop-fast-gate-and-earlier-structural-move-initial-run.md |
| Review report | ✅ | task.297.review.1.qa-loop-fast-gate-and-earlier-structural-move.md |
| QA reports | 1 | task.297.qa.1.qa-loop-fast-gate-and-earlier-structural-move.md |
| Gate | PASS | task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml (100) |
| DoD | ❌ | not yet written; expected, the work item is at ready-for-review |
| Sprint review | ❌ | not yet written; expected |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| An unset key records `Fast gate: skipped (develop.fastGateCommand unset)` and runs no gate | `shared/resources/fast-gate-outcome.sh` `--command` branch; step 0a text; `qa-loop-fast-gate-outcomes.test.mjs` | ✅ met |
| Two consecutive gates naming one file the fix edited trigger the offer; a different file, or an unedited shared one, does not | `shared/resources/repeat-subject.mjs`; `repeat-subject.test.mjs` with controls | ✅ met |
| The diagnosis of task.295 is recorded | `## Diagnosis` in the task document | ✅ met |
| No extra gate runs on a configured repository | the test's call count | ✅ met |
| `bundle:check` and `ci:fast` pass | `bundle:check` clean; ci:fast 8445 pass on the LAN server | ✅ met |
| Each fix is mutation-proved | recorded in the task document and QA report 1 | ✅ met |
| CHANGELOG states an unset key is still a skip, now recorded | CHANGELOG Unreleased/Added | ✅ met |

## Conformance Findings

[PC-1] consistency · medium · confidence: medium — docs/tasks/task.297.qa-loop-fast-gate-and-earlier-structural-move/task.297.qa-loop-fast-gate-and-earlier-structural-move.md
  The work item frontmatter has no pr_number field although PR 895 is open and the implementation report records it.
  → Add pr_number 895 to the work item frontmatter.

  Orchestrator note: `/finalise` writes `pr_number` in the same edit that sets `status: accepted` (its Step 3a resolver), so this resolves at Step 7 with no separate fix.

## Code Review Findings

Skipped (`--no-code`). QA cycle 1 ran the diff code review inline (no subagent), which found 0 bugs and 2 LOW cleanups.

**Anchors:** 1 checked against `e0a964b364edc75a27ec60b70b12c285f5586a65` (via `head-branch`) — all verified

Excluded from the diff as generated: the `skills/*/references/` bundled copies of `fast-gate-outcome.sh`, `repeat-subject.mjs` and the QA-loop step document. Each is named in the work item as bundled output of a `shared/resources/` source, and `bundle:check` holds them equal to it.

## Machine-Readable Findings

```yaml
reviewed_gate: task.297.gate.1.qa-loop-fast-gate-and-earlier-structural-move.yml
findings:
  - id: PC-1
    category: consistency
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.297.qa-loop-fast-gate-and-earlier-structural-move/task.297.qa-loop-fast-gate-and-earlier-structural-move.md"
    anchor_check: no-line
    finding: "The work item frontmatter has no pr_number field although PR 895 is open and the implementation report records it."
    suggested_action: "Add pr_number 895 to the work item frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Let `/finalise` write `pr_number: 895` at acceptance; confirm it is present after Step 7.
