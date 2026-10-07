# PR Review Report: PR #563 — feat(task.170): QA re-entry after a finalise DoD-gaps halt fixed by a code change

**Reviewed:** 2026-10-04
**PR:** [#563](https://github.com/Gamaroff/agent-skills/pull/563) — `feature/task.170.qa-reentry-after-finalise-gaps` → `develop` (OPEN)
**Work item:** [`task.170.qa-reentry-after-finalise-gaps.md`](./task.170.qa-reentry-after-finalise-gaps.md) — resolved via `branch stem`
**Tracker:** [#536](https://github.com/Gamaroff/agent-skills/issues/536) — OPEN
**Verdict:** ⚠️ CONCERNS

Re-review (develop-task Step 5c, QA cycle 7, after the finalise DoD-gaps re-entry). Effort `medium`. Diff `origin/develop...origin/feature/task.170.qa-reentry-after-finalise-gaps`, with 24 bundled `*/references/*` copies excluded (AUTO-GENERATED from `shared/resources/`; none is named as a deliberate change). Lenses dispatched 2026-10-04T06:22:11Z; both returned by 2026-10-04T06:25:21Z (code `duration_ms` 167692, conformance 67241).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.170.implementation.1.qa-reentry-after-finalise-gaps-initial-run.md` |
| Review report | ✅ | `task.170.review.1.qa-reentry-after-finalise-gaps.md` |
| QA reports | 7 | `task.170.qa.1` … `task.170.qa.7` |
| Gate | PASS | `task.170.gate.7.qa-reentry-after-finalise-gaps.yml` (100) |
| DoD | ✅ (GAPS — `/finalise` re-runs next) | `task.170.dod.1.qa-reentry-after-finalise-gaps.md` |
| Sprint review | ❌ | not yet — written by `/finalise` on acceptance |
| Open bugs | 0 | bugs 1–6 closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Unchanged from [`task.170.pr-review.1`](./task.170.pr-review.1.qa-reentry-after-finalise-gaps.md): every criterion met. The delta since that review (`3008d0d7`) adds bash 3.2 parse compatibility, covered by the `/bin/bash -n` case in `reenter-qa-after-finalise.test.sh`.

## Conformance Findings

```
[PC-1] consistency · low · confidence: medium — task.170.qa-reentry-after-finalise-gaps.md QA Deferred Work vs gate.7 recommendations.future
  Deferred Work lists only gate 6's CR-1, and the Implementation Summary says "Deferred work: none", while gate 7 also carries its own CR-1 and gate 6's CR-2 and CR-3.
  → Before /finalise re-runs, list gate 7's CR-1 and gate 6's CR-2 and CR-3 under Deferred Work.

[PC-2] scope · low · confidence: low — shared/resources/set-qa-phase.sh:9-12
  The diff edits set-qa-phase.sh's header comment (from QA cycle 1, CR-3), but the Files Summary does not list the file.
  → Add set-qa-phase.sh to the Files Summary documentation entries.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/reenter-qa-after-finalise.sh:161
  Both qa-cycle.sh calls discard stderr, so no gate, an unnumbered gate and two gates claiming one cycle all print the same no-gate refusal; the contract's route says to resolve the gate files "if the refusal names an ambiguity", which it never can.
  → Capture qa-cycle.sh's stderr and pass it through in the no-gate refusal.

[CR-2] bug · medium · confidence: medium — shared/resources/develop-pipeline-resume-contract.md:445
  Enumeration risk: qa_reentry and a second writer of qa_max_cycles/qa_phase were added, but develop-pipeline-hooks.md:86 still says qa_max_cycles is written only at a loop-limit resume, and pipeline-resume-detector-prompt.md does not read qa_reentry.
  → Grep every document naming a lock field or its writer, add qa_reentry where missing, and extend qa-loop-lock-fields-parity.test.mjs to cover it.

[CR-3] bug · low · confidence: low — shared/resources/reenter-qa-after-finalise.sh:169
  A failing git status yields an empty DIRTY, read as a clean tree; the script could then refuse no-code-moved, whose route resumes at step 7.
  → Check git status's exit code separately and fail closed.
```

Orchestrator verification: CR-1 confirmed (lines 161–162, `2>/dev/null` on both calls); its failure direction is a less specific refusal message, never a wrong re-entry. CR-2 confirmed (`develop-pipeline-hooks.md:86`; `qa_reentry` appears 0 times in the detector prompt).

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.170.qa-reentry-after-finalise-gaps/task.170.qa-reentry-after-finalise-gaps.md:430-432"
    finding: "Deferred Work lists only gate 6's CR-1 and the Implementation Summary says none, while gate 7 carries gate 7 CR-1 and gate 6 CR-2 and CR-3."
    suggested_action: "List gate 7's CR-1 and gate 6's CR-2 and CR-3 under Deferred Work before /finalise re-runs."
  - id: PC-2
    category: scope
    severity: low
    confidence: low
    ref: "shared/resources/set-qa-phase.sh:9-12"
    finding: "The diff edits set-qa-phase.sh's header comment but the Files Summary does not list the file."
    suggested_action: "Add set-qa-phase.sh to the Files Summary documentation entries."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/reenter-qa-after-finalise.sh:161"
    finding: "Both qa-cycle.sh calls discard stderr, so three distinct gate states print one no-gate refusal that can never name an ambiguity."
    suggested_action: "Capture qa-cycle.sh's stderr and pass it through in the no-gate refusal."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/develop-pipeline-resume-contract.md:445"
    finding: "qa_reentry and the second writer of qa_max_cycles/qa_phase are missing from develop-pipeline-hooks.md:86 and pipeline-resume-detector-prompt.md."
    suggested_action: "Add qa_reentry wherever lock fields and writers are listed, and extend qa-loop-lock-fields-parity.test.mjs to cover it."
  - id: CR-3
    category: bug
    severity: low
    confidence: low
    ref: "shared/resources/reenter-qa-after-finalise.sh:169"
    finding: "A failing git status is read as a clean tree, which could route a no-code-moved refusal to step 7."
    suggested_action: "Check git status's exit code separately and fail closed."
truncated_count: 0
```

## Recommended Actions

1. CR-1 — pass `qa-cycle.sh`'s stderr through in the `no-gate` refusal (small; the contract already promises it).
2. CR-2 — add `qa_reentry` to the hooks doc and the resume detector, and to the lock-fields parity test.
3. PC-1 — bring the task's Deferred Work up to date with gate 7's `recommendations.future` before `/finalise` re-runs.
4. CR-3, PC-2 — low follow-ups.
