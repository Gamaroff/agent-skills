# PR Review Report: PR #632 — feat(task.201): pipeline up-front answers and speed modes

**Reviewed:** 2026-10-11
**PR:** [#632](https://github.com/Gamaroff/agent-skills/pull/632) — `feature/task.201.pipeline-upfront-answers-and-speed-modes` → `develop` (OPEN)
**Work item:** [`task.201.pipeline-upfront-answers-and-speed-modes.md`](./task.201.pipeline-upfront-answers-and-speed-modes.md) — resolved via `branch-stem`
**Tracker:** [#621](https://github.com/Gamaroff/agent-skills/issues/621) — OPEN
**Verdict:** ⚠️ CONCERNS

Run as Step 5c after QA gate 6 (the second 5c of this run; `pr-review.1` approved at gate 4, before
the finalise DoD-gap re-entry). Lenses: conformance only (`--no-code`), effort medium. Excluded from
the diff: generated `*/references/*` copies.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.201.implementation.1.pipeline-upfront-answers-and-speed-modes-initial-run.md` |
| Review report | ✅ | `task.201.review.1.pipeline-upfront-answers-and-speed-modes.md` |
| QA reports | 6 | `task.201.qa.1` – `task.201.qa.6` |
| Gate | PASS | `task.201.gate.6.pipeline-upfront-answers-and-speed-modes.yml` (100) |
| DoD | ✅ (run 1, GAPS) | `task.201.dod.1.pipeline-upfront-answers-and-speed-modes.md` — finalise re-runs at Step 7 |
| Sprint review | ❌ | not expected until acceptance |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Unchanged from `pr-review.1` except AC10, which the re-entry addressed:

| Criterion | Evidence in diff | Status |
|---|---|---|
| No consumer-specific names; all limits from `skills-config.yaml` | `shared/resources/tests/pipeline-answers-generic.test.mjs` (names); docs test 4a/4g (limits) | ⚠️ partial — one hand-authored file outside the scan (PC-1) |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: medium — shared/resources/tests/pipeline-answers-generic.test.mjs:50
  The AC10 scan reads only each skill's SKILL.md, so the hand-authored develop-bug-step-0-resolve-bug.md, which task.201 changed and which carries develop-bug's §0d resolution, is not scanned.
  → Add it to the population, or derive hand-authored skills/*/references files that cite task.201.

[PC-2] consistency · low · confidence: low — docs/tasks/task.201.pipeline-upfront-answers-and-speed-modes/task.201.pipeline-upfront-answers-and-speed-modes.md:486
  The run-1 DoD gaps section still lists AC10 open while the criterion and QA results mark it closed under gate 6.
  → Have the /finalise re-run supersede the run-1 gap section.

[PC-3] consistency · low · confidence: low — pr_number
  The task frontmatter has no pr_number though PR #632 is open.
  → Write pr_number: 632 at /finalise.
```

Verified by the caller: `develop-bug-step-0-resolve-bug.md` carries no generated-copy marker and has
0 consumer-name hits today, so AC10 holds in fact; PC-1 is a coverage gap in the test, not a leak.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 3 checked against `a10086347444` (via `head-branch`) — all verified (`ok` ×2, `no-line` ×1).

## Machine-Readable Findings

```yaml
reviewed_gate: task.201.gate.6.pipeline-upfront-answers-and-speed-modes.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "shared/resources/tests/pipeline-answers-generic.test.mjs:50"
    anchor_check: ok
    finding: "The AC10 scan reads only each skill's SKILL.md, so the hand-authored develop-bug-step-0-resolve-bug.md, which task.201 changed and which carries develop-bug's §0d resolution, is not scanned."
    suggested_action: "Add it to the population, or derive hand-authored skills/*/references files that cite task.201."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "docs/tasks/task.201.pipeline-upfront-answers-and-speed-modes/task.201.pipeline-upfront-answers-and-speed-modes.md:486"
    anchor_check: ok
    finding: "The run-1 DoD gaps section still lists AC10 open while the criterion and QA results mark it closed under gate 6."
    suggested_action: "Have the /finalise re-run supersede the run-1 gap section."
  - id: PC-3
    category: consistency
    severity: low
    confidence: low
    ref: "pr_number"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number though PR #632 is open."
    suggested_action: "Write pr_number: 632 at /finalise."
truncated_count: 0
```

## Recommended Actions

1. Widen the AC10 scan to the hand-authored `develop-bug-step-0-resolve-bug.md` (PC-1).
2. At `/finalise`: supersede the run-1 gap section (PC-2) and write `pr_number` (PC-3).
