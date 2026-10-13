# PR Review Report: PR #642 — fix(task.182): reenter-qa refusal diagnostics and the qa_reentry reader population

**Reviewed:** 2026-10-13
**PR:** [#642](https://github.com/Gamaroff/agent-skills/pull/642) — `feature/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population` → `develop` (OPEN)
**Work item:** [`task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md`](./task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md) — resolved via `branch stem`
**Tracker:** [#565](https://github.com/Gamaroff/agent-skills/issues/565) — OPEN
**Verdict:** ⚠️ CONCERNS

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.182.implementation.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population-initial-run.md (updates uncommitted until Step 8, by design) |
| Review report | ✅ | task.182.review.1.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md |
| QA reports | 4 | task.182.qa.1 … qa.4 |
| Gate | PASS | task.182.gate.4.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml (100; diminishing-returns exit, TASK-182-005 carried) |
| DoD | ❌ (expected) | `/finalise` has not run — the task is at `ready-for-review` |
| Sprint review | ❌ (expected) | as above |
| Open bugs | 0 | task.182.bug.1, task.182.bug.2 — both Closed |
| Handover | — | none written (no deferred tracker action) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Three `no-gate` causes relay `qa-cycle.sh`'s reason | `shared/resources/reenter-qa-after-finalise.sh:169-180`; `expect_gate_cause` cases in `reenter-qa-after-finalise.test.sh` | ✅ met |
| `git-unreadable` before any write | `reenter-qa-after-finalise.sh` (the `git-unreadable` refusal on the `git status` read); "git status fails" case | ✅ met |
| Contract list = script reasons incl. `git-unreadable` | `evals/shared/tests/reenter-qa-refusals-parity.test.mjs` | ✅ met |
| Hooks doc and detector name `qa_reentry`; hooks doc names both `qa_max_cycles` writers | `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs` | ✅ met |
| Gate-read additions only `mktemp`/`sort`/`rm` | `reenter-qa-after-finalise.sh:169-172` | ✅ met |
| ShellCheck, Prettier, `npm test`, `bundle:check` | implementation report, gate 4 | ✅ met |
| Mutation-proven | QA reports 1–4, Code Review sections | ✅ met |
| CHANGELOG cites task 182 | `CHANGELOG.md` `[Unreleased]` › Fixed | ✅ met |

## Conformance Findings

```
[PC-2] scope · medium · confidence: high — docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:101
  The diff changes the no-gate route (contract: "the next bullet" → back to the operator, never step 7; QA cycle 2 CR-2), which this task lists as Out of Scope, and the task document was never amended.
  → Record the route change as a scope amendment, with its QA cycle 2 rationale and a Change Log row.

[PC-3] scope · medium · confidence: high — docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:107
  §5 Breaking Changes says no-gate "keeps its reason and route" — false since QA cycle 2.
  → State that no-gate now routes back to the operator, never step 7.

[PC-4] scope · medium · confidence: high — docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:75
  §3 Target Architecture says "the reason no-gate and its route are unchanged" — false since QA cycle 2.
  → Describe the new no-gate route.

[PC-1] consistency · low · confidence: medium — docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:161
  The Files Summary reports 16 bundled copies and omits develop-pipeline-pause.md and both develop-* SKILL.md, which QA cycles 2–3 changed; the PR changes 21 bundled copies.
  → List the three sources and the measured bundled-copy count.

[PC-5] scope · low · confidence: medium — shared/resources/reenter-qa-after-finalise.sh:129
  The cwd usage guard (exit 2 when the cwd is not <doc-dir>'s repository root; QA cycle 2 CR-5) is in neither the task's Scope, Breaking Changes nor Implementation Summary.
  → Add it to the Implementation Summary and Breaking Changes.
```

## Code Review Findings

Skipped (`--no-code`) — the develop pipeline's QA step ran the code reviewer on every cycle (4 cycles).

**Anchors:** 5 checked against `a7229c9751450d261f0ebcd26004a8087219ff44` (via `head-branch`) — all verified (`unchecked-text` ×5).

**Scope:** `origin/develop...origin/feature/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population`, excluding 21 auto-generated `*/references/*` copies (the task's Files Summary names them only as regenerated).

## Machine-Readable Findings

```yaml
reviewed_gate: task.182.gate.4.reenter-qa-refusal-diagnostics-and-qa-reentry-population.yml
findings:
  - id: PC-2
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:101"
    anchor_check: unchecked-text
    finding: "The no-gate route changed (QA cycle 2 CR-2) although the task lists it as Out of Scope, and the task document was not amended."
    suggested_action: "Record the route change as a scope amendment with its rationale and a Change Log row."
  - id: PC-3
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:107"
    anchor_check: unchecked-text
    finding: "Breaking Changes says no-gate keeps its route; it no longer does."
    suggested_action: "State that no-gate now routes back to the operator, never step 7."
  - id: PC-4
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:75"
    anchor_check: unchecked-text
    finding: "Target Architecture says the no-gate route is unchanged; it changed."
    suggested_action: "Describe the new no-gate route."
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population/task.182.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md:161"
    anchor_check: unchecked-text
    finding: "The Files Summary omits three changed sources and miscounts the bundled copies."
    suggested_action: "List develop-pipeline-pause.md and both SKILL.md; give the measured count (21)."
  - id: PC-5
    category: scope
    severity: low
    confidence: medium
    ref: "shared/resources/reenter-qa-after-finalise.sh:129"
    anchor_check: unchecked-text
    finding: "The cwd usage guard (exit 2) is not described in the task's Scope, Breaking Changes or Implementation Summary."
    suggested_action: "Add the guard to the Implementation Summary and Breaking Changes."
truncated_count: 0
```

## Recommended Actions

1. Amend the task document: record the `no-gate` route change as a scope amendment, and correct Target Architecture, Breaking Changes and the Files Summary (PC-1–PC-4, doc-only — fixable in the acceptance commit).
2. Describe the cwd usage guard in the Implementation Summary and Breaking Changes (PC-5).
