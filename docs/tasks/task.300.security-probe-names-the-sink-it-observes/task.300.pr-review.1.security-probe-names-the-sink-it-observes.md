# PR Review Report: PR #896 — feat(task.300): security-probe names what a clean count could not observe

**Reviewed:** 2026-11-13
**PR:** [#896](https://github.com/Gamaroff/agent-skills/pull/896) — `feature/task.300.security-probe-names-the-sink-it-observes` → `develop` (OPEN)
**Work item:** [`task.300.security-probe-names-the-sink-it-observes.md`](./task.300.security-probe-names-the-sink-it-observes.md) — resolved via `branch stem`
**Tracker:** none — standalone task, no linked issue
**Verdict:** ⚠️ CONCERNS

Review scope: conformance lens only (`--no-code`; the QA gate already ran the code review). The bundled `references/` copies were excluded from the diff as generated; the source files are in `shared/resources/`. The conformance reviewer was a read-only subagent; PC-2 and PC-3 were then confirmed by reading the files.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.300.implementation.1.security-probe-names-the-sink-it-observes-initial-run.md |
| Review report | ✅ | task.300.review.1.security-probe-names-the-sink-it-observes.md |
| QA reports | 1 | task.300.qa.1.security-probe-names-the-sink-it-observes.md |
| Gate | PASS | task.300.gate.1.security-probe-names-the-sink-it-observes.yml (95) |
| DoD | ❌ | not yet written; `/finalise` is Step 7 |
| Sprint review | ❌ | not yet written; `/finalise` is Step 7 |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Conformance Findings

[PC-3] consistency · medium · confidence: high — docs/tasks/task.300.security-probe-names-the-sink-it-observes/task.300.security-probe-names-the-sink-it-observes.md
  The frontmatter has no `pr_number`, though PR #896 is open for this work item.
  → Add `pr_number: 896` to the task frontmatter.

[PC-1] coverage · low · confidence: medium — shared/resources/probe-boundary-rule.md
  Phase 2 says §5 cites the limit constant and never restates the limit text, but the diff leaves §5 untouched and it still states the outside-sandbox write limit in prose.
  → Add a one-line citation of `OBSERVATION_LIMITS` in §5.

[PC-2] coverage · low · confidence: medium — skills/finalise/SKILL.md:1125
  The QA report holds the DoD Probe Results line as covered by tests that never read `SKILL.md`, and `finalise-dod-prompt-contract.test.mjs` was not extended, so the new line has no test.
  → Pin the new `{if}` block in `finalise-dod-prompt-contract.test.mjs`.

## Code Review Findings

Skipped (`--no-code`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.300.gate.1.security-probe-names-the-sink-it-observes.yml
findings:
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.300.security-probe-names-the-sink-it-observes/task.300.security-probe-names-the-sink-it-observes.md"
    anchor_check: no-line
    finding: "Frontmatter has no pr_number although PR 896 is open for this work item."
    suggested_action: "Add pr_number: 896 to the task frontmatter."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "shared/resources/probe-boundary-rule.md"
    anchor_check: no-line
    finding: "Phase 2 promises probe-boundary-rule.md section 5 cites OBSERVATION_LIMITS, but the diff leaves section 5 untouched."
    suggested_action: "Add a one-line citation of OBSERVATION_LIMITS in section 5."
  - id: PC-2
    category: coverage
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:1125"
    anchor_check: ok
    finding: "The new Not observed by this run line in the Probe Results block has no test."
    suggested_action: "Pin the new if block in finalise-dod-prompt-contract.test.mjs."
truncated_count: 0
```

## Recommended Actions

1. Add `pr_number: 896` to the task frontmatter (PC-3).
2. Pin the Probe Results `Not observed by this run` block in `finalise-dod-prompt-contract.test.mjs` (PC-2).
3. Cite `OBSERVATION_LIMITS` from `probe-boundary-rule.md` §5 (PC-1).
