# PR Review Report: PR #563 — feat(task.170): QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Reviewed:** 2026-10-03
**PR:** [#563](https://github.com/Gamaroff/agent-skills/pull/563) — `feature/task.170.qa-reentry-after-finalise-gaps` → `develop` (OPEN)
**Work item:** [`task.170.qa-reentry-after-finalise-gaps.md`](./task.170.qa-reentry-after-finalise-gaps.md) — resolved via `branch stem`
**Tracker:** [#536](https://github.com/Gamaroff/agent-skills/issues/536) — OPEN
**Verdict:** ✅ APPROVE

Scope: `origin/develop...origin/feature/task.170.qa-reentry-after-finalise-gaps`, 37 files, excluding the 24 generated `*/references/*` bundled copies (none is named in the work item, PR body or a commit subject). Effort: medium. Both lenses received their prompts as substituted files they read in full.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.170.implementation.1.qa-reentry-after-finalise-gaps-initial-run.md |
| Review report | ✅ | task.170.review.1.qa-reentry-after-finalise-gaps.md |
| QA reports | 6 | task.170.qa.1 … qa.6 |
| Gate | PASS | task.170.gate.6.qa-reentry-after-finalise-gaps.yml (100) |
| DoD | ❌ | not yet — Step 7 runs after this review |
| Sprint review | ❌ | not yet — Step 7 |
| Open bugs | 0 | bugs 1–6 closed |
| Handover | — | none |

## Acceptance Criteria Traceability

The conformance lens found every criterion covered. Its one finding is the work item's stale Implementation Summary (PC-1).

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.170.qa-reentry-after-finalise-gaps.md:375-384
  The Implementation Summary still describes the first design (seven refusals, full qa-task Phase 0
  measure, 25-case suite), contradicting the shipped script (eight refusals, committed-history
  measure with uncommitted-fix) and the 52/52 suite.
  → Update the Approach and Testing results to the shipped design before /finalise reads them.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — shared/resources/reenter-qa-after-finalise.sh:216
  The script writes qa_phase, qa_max_cycles and qa_reentry, but it is missing from the lock-field
  parity test's FILES map, and develop-pipeline-hooks.md:86 still says qa_max_cycles is written only
  after a loop-limit halt.
  → Add the script to the parity test's FILES map and update the hooks doc's lock-field paragraph.

[CR-2] cleanup · low · confidence: high — shared/resources/reenter-qa-after-finalise.test.sh:313
  The "refused (no-dod), never guessed" case checks only exit 1, so any refusal passes it.
  → Assert stderr names "refused (no-dod)", or remove the case.

[CR-3] cleanup · low · confidence: medium — shared/resources/reenter-qa-after-finalise.sh:208
  The not-an-object path after --restore exits 1 without keep_restored, unlike the other
  post-restore failure paths.
  → Call keep_restored there too.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: 'docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.qa-reentry-after-finalise-gaps.md:375'
    finding: 'The Implementation Summary still describes the first design (seven refusals, full Phase 0 measure, 25-case suite), not the shipped one.'
    suggested_action: 'Update the Approach and Testing results to the shipped design before /finalise reads them.'
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: 'shared/resources/reenter-qa-after-finalise.sh:216'
    finding: 'A new writer of qa_phase, qa_max_cycles and qa_reentry is missing from the lock-field parity test, and the hooks doc still names one writer of qa_max_cycles.'
    suggested_action: 'Add the script to the parity test FILES map and update develop-pipeline-hooks.md:86.'
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: 'shared/resources/reenter-qa-after-finalise.test.sh:313'
    finding: 'The no-dod case passes on any refusal because it checks only the exit code.'
    suggested_action: 'Assert the refusal reason in stderr, or remove the case.'
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: 'shared/resources/reenter-qa-after-finalise.sh:208'
    finding: 'The not-an-object failure after --restore does not call keep_restored.'
    suggested_action: 'Call keep_restored on that path.'
truncated_count: 0
```

## Recommended Actions

1. Bring the Implementation Summary in line with the shipped design before `/finalise` (PC-1).
2. Follow-up: list the script in the lock-field parity test and fix the hooks doc paragraph (CR-1).
3. Optional cleanups: CR-2, CR-3.
