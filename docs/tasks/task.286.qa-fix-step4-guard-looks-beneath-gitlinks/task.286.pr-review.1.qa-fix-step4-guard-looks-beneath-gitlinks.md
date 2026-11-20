# PR Review Report: PR #927 — fix(qa-fix): Step 4 guard looks beneath gitlinks (task 286)

**Reviewed:** 2026-11-20
**PR:** [#927](https://github.com/Gamaroff/agent-skills/pull/927) — `feature/task.286.qa-fix-step4-guard-looks-beneath-gitlinks` → `develop` (OPEN)
**Work item:** [`task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md`](./task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md) — resolved via `branch stem`
**Tracker:** none linked
**Verdict:** ✅ APPROVE

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.286.implementation.1.qa-fix-step4-guard-looks-beneath-gitlinks-initial-run.md |
| Review report | ✅ | task.286.review.1.qa-fix-step4-guard-looks-beneath-gitlinks.md |
| QA reports | 1 | task.286.qa.1.qa-fix-step4-guard-looks-beneath-gitlinks.md |
| Gate | PASS | task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml (95) |
| DoD | ❌ | not yet written; `/finalise` has not run (expected at Step 5c) |
| Sprint review | ❌ | not yet written; same reason |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Directory over a gitlink holding an untracked file is refused (bash and zsh) | `gitlink-under-dir` scenarios in `tests/qa-fix-step4-guard.test.js` | ✅ met |
| Directory over a clean checked-out gitlink is admitted | `clean-gitlink-under-dir` | ✅ met |
| CR-3 route behaves as decided and a scenario holds it | prose in `skills/qa-fix/SKILL.md`; existing CR-3 test | ✅ met |
| Inside test works when `TOP` is `/` | standalone `TOP=/` test | ✅ met |
| CHANGELOG entry citing (task 286) | `CHANGELOG.md` | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: high — the task document
  The task frontmatter has no `pr_number` field, although the implementation report records PR #927 as open for this branch.
  → Add `pr_number: 927` to the task frontmatter.

## Code Review Findings

Skipped (`--no-code`): the QA cycle ran the code reviewer over this diff.

**Anchors:** 1 checked — all verified (a document path, not a line).

## Machine-Readable Findings

```yaml
reviewed_gate: task.286.gate.1.qa-fix-step4-guard-looks-beneath-gitlinks.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks/task.286.qa-fix-step4-guard-looks-beneath-gitlinks.md"
    anchor_check: ok
    finding: "The task frontmatter has no pr_number field although the implementation report records PR 927 as open for this branch."
    suggested_action: "Add pr_number: 927 to the task frontmatter."
truncated_count: 0
```

## Recommended Actions

1. Let `/finalise` write `pr_number: 927` into the task frontmatter, or add it by hand.
