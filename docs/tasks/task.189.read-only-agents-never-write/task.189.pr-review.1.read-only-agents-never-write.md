# PR Review Report: PR #683 — fix(task.189): read-only agents never write — mapper returns its matrix, finalise runs the probe plan

**Reviewed:** 2026-10-17
**PR:** [#683](https://github.com/Gamaroff/agent-skills/pull/683) — `feature/task.189.read-only-agents-never-write` → `develop` (OPEN)
**Work item:** [`task.189.read-only-agents-never-write.md`](./task.189.read-only-agents-never-write.md) — resolved via `branch stem`
**Tracker:** [#588](https://github.com/Gamaroff/agent-skills/issues/588) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`, `--effort medium`) — the QA loop ran the code reviewer on every cycle. Excluded from the diff: the 15 `*/references/*` bundled copies, all headed `AUTO-GENERATED`; none is named as an authored change.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.189.implementation.1.read-only-agents-never-write-initial-run.md |
| Review report | ✅ | task.189.review.1.read-only-agents-never-write.md |
| QA reports | 6 | task.189.qa.1 … qa.6 |
| Gate | CONCERNS | task.189.gate.6.read-only-agents-never-write.yml (90) |
| DoD | ❌ | not yet — `/finalise` runs next |
| Sprint review | ❌ | not yet |
| Open bugs | 1 | task.189.bug.6 (Ready for QA; fix `2117b908`, no gate has read it) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Mapper prompt has no write instruction; dispatch sites say return | `tests/explore-prompts-no-write.test.js` | ✅ met (box unticked — PC-4) |
| Matrix block writes the marked matrix byte-for-byte, warns without markers | `shared/resources/tests/read-only-agent-writes.test.mjs` | ✅ met |
| DoD security prompt returns `probe_plan[]`, no `--record` | guard test + `finalise-dod-prompt-contract.test.mjs` | ✅ met |
| Step 3b.1 sets `probes_executed` from `totals.executed`; refusal not counted | `read-only-agent-writes.test.mjs` | ✅ met |
| Docs prompt runs no generator | `tests/explore-prompts-no-write.test.js` | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.189.read-only-agents-never-write/task.189.implementation.1.read-only-agents-never-write-initial-run.md:215
  The highest gate (gate 6) never reached 5c: its QA Cycle 6 entry reads "Escalating — loop limit reached", and the final fix commit 2117b908 lies after gate 6's head ad004b2c, so no gate has read it.
  → Record the operator's accept-current-state decision in the implementation report so /finalise sees the 5c exit was authorised, not skipped.

[PC-2] trail · medium · confidence: high — docs/tasks/task.189.read-only-agents-never-write/task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md:4
  bug.6 is still open (status: ready-for-qa) and its fix in 2117b908 has not been verified by any gate.
  → Verify the CR6-1 fix and close bug.6 with a resolution note, or have /finalise carry it as an explicitly accepted open item.

[PC-3] consistency · low · confidence: medium — docs/tasks/task.189.read-only-agents-never-write/task.189.read-only-agents-never-write.md:10 ⚠️ unverified anchor (text-mismatch)
  The task's updated: 2026-10-16 is older than sibling artifacts dated 2026-10-17; the trail mixes UTC and local dates for the same cycle.
  → Set updated: to the last change's date on one time base (bump it at /finalise).

[PC-4] consistency · low · confidence: medium — docs/tasks/task.189.read-only-agents-never-write/task.189.read-only-agents-never-write.md:365
  All five Functional success criteria in § 9 are unticked, though the Implementation Summary, gates 1–6 and the diff say they hold.
  → Tick them, each naming the test that holds it.
```

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 4 checked against `c94e47eba9b7` (via `head-branch`) — 1 unverified (text-mismatch: PC-3; `updated:` is line 11).

## Machine-Readable Findings

```yaml
reviewed_gate: task.189.gate.6.read-only-agents-never-write.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.189.read-only-agents-never-write/task.189.implementation.1.read-only-agents-never-write-initial-run.md:215"
    anchor_check: ok
    finding: "Gate 6 never reached 5c and fix commit 2117b908 lies after gate 6's head, so no gate has read it."
    suggested_action: "Record the operator's accept-current-state decision in the implementation report."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.189.read-only-agents-never-write/task.189.bug.6.argv-guard-blinded-by-stderr-redirect.md:4"
    anchor_check: ok
    finding: "bug.6 is open (ready-for-qa) and its fix has not been verified by any gate."
    suggested_action: "Verify and close bug.6, or have /finalise carry it as an accepted open item."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.189.read-only-agents-never-write/task.189.read-only-agents-never-write.md:10"
    anchor_check: text-mismatch
    finding: "updated: 2026-10-16 is older than sibling artifacts dated 2026-10-17 (mixed UTC and local dates)."
    suggested_action: "Bump updated: at /finalise on one time base."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.189.read-only-agents-never-write/task.189.read-only-agents-never-write.md:365"
    anchor_check: ok
    finding: "The five Functional success criteria in § 9 are unticked though the evidence says they hold."
    suggested_action: "Tick them, each naming the test that holds it."
truncated_count: 0
```

## Recommended Actions

1. Record the accept-current-state decision in the implementation report (PC-1).
2. Close or explicitly carry bug.6 at `/finalise` (PC-2).
3. Tick the § 9 Functional criteria and bump `updated:` at `/finalise` (PC-3, PC-4).
