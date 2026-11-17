# PR Review Report: PR #916 — feat(task.311): develop pipelines check the loaded skill and hand record criteria to QA

**Reviewed:** 2026-11-17
**PR:** [#916](https://github.com/Gamaroff/agent-skills/pull/916) — `feature/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name` → `develop` (OPEN)
**Work item:** [`task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md`](./task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md) — resolved via `branch stem`
**Tracker:** none — the task carries no `github_issue` or `jira_key`
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.311.implementation.1.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name-initial-run.md |
| Review report | ✅ | task.311.review.1.develop-pipelines-identity-check-and-record-handoff.md |
| QA reports | 1 | task.311.qa.1.develop-pipelines-identity-check-and-record-handoff.md |
| Gate | PASS | task.311.gate.1.develop-pipelines-identity-check-and-record-handoff.yml (100) |
| DoD | ❌ | not yet written; the task is `ready-for-review`, so this is expected before `/finalise` |
| Sprint review | ❌ | same reason |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `check` classifies a synced base dir as shadowed and a repo path as repo | `skill-resolution.test.mjs` | ✅ met |
| Three orchestrators cite the rule and a test runs the cited command | `skill-resolution-reach.test.mjs` | ✅ met |
| Dispatch passes `record_criteria`; test compares the listing | `record-criteria-dispatch.test.mjs` | ✅ met |
| `qa-task` lists `record_criteria` and instructs the write | `skills/qa-task/SKILL.md` | ✅ met |
| Identity check at most 1 s | QA report, Record 2 (117 ms median) | ✅ met |
| Bundle, format, shell lint, `ci:fast` | fast gate 8554 tests, 0 failed | ✅ met |
| `quick_validate.py` for the four skills | QA report | ✅ met |
| CHANGELOG entry | `CHANGELOG.md` | ✅ met |
| Bundled copies regenerated | reach test compares copies with the source | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: high — pr_number
  The task frontmatter has no pr_number field although PR #916 is open and the status is ready-for-review.
  → Add pr_number: 916 to the task frontmatter.

[PC-2] trail · low · confidence: medium — task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md
  The Phase 1 Measure first checkbox is still unticked although the QA report records the Phase 1 measurement.
  → Tick the box, or note that its evidence lives in the QA report.

## Code Review Findings

Skipped (`--no-code`). The QA cycle's own diff review ran with `code_review_blocking=true`.

**Anchors:** 2 checked against `2dbeee182` (via `head-branch`) — all verified (both findings name a field or a document, so the checker reads them as `no-line`).

Scope note: the diff given to the lens excluded `docs/` only. The generated `references/` copies were kept in because the task's Files Summary names them.

## Machine-Readable Findings

```yaml
reviewed_gate: task.311.gate.1.develop-pipelines-identity-check-and-record-handoff.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "pr_number"
    fix_path: "docs/tasks/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number field although PR #916 is open and the status is ready-for-review."
    suggested_action: "Add pr_number: 916 to the task frontmatter."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name/task.311.develop-pipelines-check-the-skill-they-loaded-and-the-records-criteria-name.md"
    anchor_check: no-line
    finding: "The Phase 1 Measure first checkbox is still unticked although the QA report records the Phase 1 measurement."
    suggested_action: "Tick the box, or note that its evidence lives in the QA report."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 916` to the task frontmatter and tick the Phase 1 checkbox before `/finalise`. Both are doc-only and were carried into the acceptance commit.
