# PR Review Report: PR #932 — feat(task.312): review-task check 32 and a timing-statistic rule

**Reviewed:** 2026-11-23
**PR:** [#932](https://github.com/Gamaroff/agent-skills/pull/932) — `feature/task.312.allow-list-and-timing-criteria-name-what-they-need` → `develop` (OPEN)
**Work item:** [`task.312.allow-list-and-timing-criteria-name-what-they-need.md`](./task.312.allow-list-and-timing-criteria-name-what-they-need.md) — resolved via `current branch stem`
**Tracker:** none linked
**Verdict:** ✅ APPROVE

Scope note: conformance lens only (`--no-code`; the code lens ran in QA cycle 1). The lens was an inline pass by the pipeline session, not an independent subagent, so independent review did not run. Excluded from the diff: bundled `*/references/*` copies (generated, none named in the work item's Files Summary).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.312.implementation.1…initial-run.md (Completion block fills at Step 8) |
| Review report | ✅ | task.312.review.1…md (8/10) |
| QA reports | 1 | task.312.qa.1…md |
| Gate | PASS | task.312.gate.1…yml (95) |
| DoD | ❌ | not yet written; `/finalise` Step 7 writes it |
| Sprint review | ❌ | written by `/finalise` |
| Open bugs | 0 | none |
| Handover | ❌ | none needed |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Check 32 states trigger, coverage rule, Important severity; coverage-rule removal turns the test red | `skills/review-task/SKILL.md` check 32; `tests/review-allow-list-timing-checks.test.js` "check 32 states its trigger…"; red test named in QA report | ✅ met |
| Write-by-operand probe per unaudited member, `uniq in out` fixture | check 32 `- Probe:` line; test executing `uniq` in a temp dir | ✅ met |
| create-task 3.5 and review-task carry the same timing rule, held by a parity test | `skills/create-task/SKILL.md`, `skills/review-task/SKILL.md` Step 6 check 4; parity test | ✅ met |
| `bundle:check`, `format:check`, `ci:fast` pass | bundled copies in sync; fast gate 8733 pass, 0 fail | ✅ met |
| `quick_validate.py` passes for the three skills | QA report command log | ✅ met |
| CHANGELOG entry citing task 312 | `CHANGELOG.md` `### Added` | ✅ met |

## Conformance Findings

[PC-1] consistency · low · confidence: high — Success Criteria, Functional 3
  The criterion says the rule sits in "review-task check 22", but the sentence lives in Step 6 check 4. The task's own Technical Background states that check 22's wall-clock note sits in Step 6 check 4, so the work item is internally consistent and the PR placed it where the document says.
  → Optional: reword the criterion to "review-task Step 6 check 4" when the document is next edited. No change to the PR.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 0 checked — the one finding names a criterion, not a line.

## Machine-Readable Findings

```yaml
reviewed_gate: task.312.gate.1.allow-list-and-timing-criteria-name-what-they-need.yml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "Success Criteria Functional 3"
    anchor_check: no-line
    finding: "The criterion names review-task check 22 but the sentence sits in Step 6 check 4, as the task's own Technical Background says."
    suggested_action: "Reword the criterion to name Step 6 check 4 at the next edit; no PR change needed."
truncated_count: 0
```

## Recommended Actions

1. None blocking. Proceed to `/finalise`.
