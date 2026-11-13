# PR Review Report: PR #896 — security-probe names what a clean count could not observe

**Reviewed:** 2026-11-13
**PR:** [#896](https://github.com/Gamaroff/agent-skills/pull/896) — `feature/task.300.security-probe-names-the-sink-it-observes` → `develop` (OPEN)
**Work item:** [`task.300.security-probe-names-the-sink-it-observes.md`](./task.300.security-probe-names-the-sink-it-observes.md) — resolved via `branch stem`
**Tracker:** none — no tracker issue linked
**Verdict:** ✅ APPROVE

Review scope: conformance lens only (`--no-code`; QA gate 2 already ran the code review). Bundled `references/` copies were excluded from the diff as generated (byte-identical to `shared/resources/` sources; `bundle:check` clean). The conformance subagent returned in 8.5 seconds with no findings, which is too shallow to rely on alone, so the mechanical trail checks were re-run by the orchestrator (below). This review supersedes `pr-review.1`, which was against gate 1.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.300.implementation.1.security-probe-names-the-sink-it-observes-initial-run.md |
| Review report | ✅ | task.300.review.1.security-probe-names-the-sink-it-observes.md |
| QA reports | 2 | task.300.qa.1…, task.300.qa.2… |
| Gate | PASS | task.300.gate.2.security-probe-names-the-sink-it-observes.yml (96) |
| DoD | ❌ (expected) | status is ready-for-review; `/finalise` has not run |
| Sprint review | ❌ (expected) | written by `/finalise` |
| Open bugs | 0 | none |
| Handover | ❌ (expected) | none written |

Checks re-run by hand: the Change Log is append-only against the merge base (`rows-dropped` absent); gate 1 and gate 2 `head:` values both resolve and are ancestors of HEAD; each gate's `updated:` is later than the author time of the commit its `head:` names; QA report count (2) equals gate count (2); `pr_number: 896` is in the frontmatter.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Phase 1's finding on the premise is recorded in the QA report | QA report 1; Decisions Log in the implementation report | ✅ met |
| A run through an entry form with a stated limit yields `observation_limits` in the record and on the DoD Probe Results line | `shared/resources/security-probe.mjs` (`OBSERVATION_LIMITS`, `toRecordEntry`, `emitBlock`); `skills/finalise/SKILL.md` Probe Results; the "observation limits:" tests; the new pin in `finalise-dod-prompt-contract.test.mjs` | ✅ met |
| Form-specific mapping; counts unchanged by the field | `observationLimitsFor`; mapping test | ✅ met |
| No extra probe executions | run-count assertion in the tests | ✅ met |
| `bundle:check`, `format:check`, `ci:fast` pass | `ci:fast` TEST_EXIT=0 on the LAN server; `bundle:check` 129 skills, 0 problems | ✅ met |
| `CHANGELOG.md` entry; readers tolerate the field | CHANGELOG "task 300"; legacy-record read-back test | ✅ met |

## Conformance Findings

None. The three findings of `pr-review.1` are resolved: PC-1 (`probe-boundary-rule.md` section 5 now cites `OBSERVATION_LIMITS`), PC-2 (a pin for the limits line in `finalise-dod-prompt-contract.test.mjs`, mutation-proved by QA 2) and PC-3 (`pr_number: 896`).

## Code Review Findings

Skipped (`--no-code`). The QA gate's code review ran in 5a.

**Anchors:** none to check (no findings).

## Machine-Readable Findings

```yaml
reviewed_gate: task.300.gate.2.security-probe-names-the-sink-it-observes.yml
findings: []
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`. CI on the head was still pending when this review ran and is gated there.
