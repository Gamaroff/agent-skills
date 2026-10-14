# PR Review Report: PR #637 — feat(task.180): security-probe fence: entry form for a fenced bash block in a step doc

**Reviewed:** 2026-10-12
**PR:** [#637](https://github.com/Gamaroff/agent-skills/pull/637) — `feature/task.180.probe-engine-fence-entry-form` → `develop` (OPEN)
**Work item:** [`task.180.probe-engine-fence-entry-form.md`](./task.180.probe-engine-fence-entry-form.md) — resolved via `branch stem`
**Tracker:** [#560](https://github.com/Gamaroff/agent-skills/issues/560) — OPEN
**Verdict:** ⚠️ CONCERNS

Run as the pipeline's Step 5c (`--effort medium --comment --no-code`): the conformance lens only. The QA loop already ran the code reviewer on every cycle. Scope: the branch diff with the bundled `*/references/*` copies excluded; the task's Files Summary lists those as generated ("Files Regenerated").

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.180.implementation.1.probe-engine-fence-entry-form-initial-run.md` |
| Review report | ✅ | `task.180.review.1.probe-engine-fence-entry-form.md` |
| QA reports | 8 | `task.180.qa.1` … `task.180.qa.8` |
| Gate | CONCERNS | `task.180.gate.8.probe-engine-fence-entry-form.yml` (90) |
| DoD | ❌ | not yet — `/finalise` runs next |
| Sprint review | ❌ | not yet — `/finalise` runs next |
| Open bugs | 2 | bugs 13 and 14 (Ready for QA; fixed in `30769d36`, not yet gated). Bugs 1–5 closed at this review (PC-2 … PC-6) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 `fence:` probes a block, scored per `scoreFenceRun` | `shared/resources/security-probe.mjs` (`runFenceCase`, `scoreFenceRun`); `fence entry` tests | ✅ met |
| SC2 missing heading / block → `entry-not-probeable` | `extractFencedBlock`; tests | ✅ met |
| SC3 `fixture` env/files; outside path declined | `fixtureProblem`, `runFenceCase`; tests | ✅ met |
| SC4 task.167's 13 cases: `engages`, flagless copy over-blocks 4 | `t167-cases.json`; tests | ✅ met |
| SC5 existing entry forms unchanged | `ci:fast` green | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.implementation.1.probe-engine-fence-entry-form-initial-run.md:379
  The highest gate (gate 8, CONCERNS, TASK-180-020/021 open) never reached 5c; its cycle entry reads "Escalating — loop limit reached", and cycle 8's fix 30769d36 has not been read by any gate.
  → Grant one more cycle so a gate reads 30769d36, or commit the user-acceptance record and carry TASK-180-020/021 explicitly into /finalise.

[PC-2] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.1.shell-syntax-error-scored-as-refusal.md
  Still open ("Ready for QA") although later gates verified the fix.
  → Close it citing the verifying QA report. (Done at this review: qa.2 / qa.4.)

[PC-3] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.2.fence-control-key-ignores-slot.md
  Still open although qa.2 verified the fix.
  → Close it. (Done at this review.)

[PC-4] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.3.expected-absent-collides-with-fixture-files.md
  Still open although qa.3 and qa.4 verified the fix.
  → Close it. (Done at this review.)

[PC-5] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.4.shell-diagnostics-read-as-refusal.md
  Still open although the mechanism was replaced at cycle 3 and qa.4 verified it.
  → Close it. (Done at this review.)

[PC-6] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.5.parse-failure-masks-reproduced-side-effect.md
  Still open although qa.3 verified the fix.
  → Close it. (Done at this review.)

[PC-7] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.13.ghfreepath-integration-test-vacuous.md
  Open, and its fix (30769d36) has not been read by any gate.
  → Gate the cycle-8 fix and close the bug, or carry it explicitly into /finalise.

[PC-8] trail · medium · confidence: high — docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.14.emit-block-drops-fence-slot.md
  Open, and its fix (30769d36) has not been read by any gate.
  → Gate the cycle-8 fix and close the bug, or carry it explicitly into /finalise.

[PC-9] consistency · low · confidence: high — pr_number
  The task's frontmatter has no pr_number although PR #637 is open.
  → Add pr_number: 637 (/finalise writes it at acceptance).
```

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 9 checked against `954e77b7` (via `HEAD`) — all verified (1 `ok`, 8 `no-line`)

## Machine-Readable Findings

```yaml
reviewed_gate: task.180.gate.8.probe-engine-fence-entry-form.yml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.implementation.1.probe-engine-fence-entry-form-initial-run.md:379"
    anchor_check: ok
    finding: "The highest gate never reached 5c and cycle 8's fix 30769d36 has not been read by any gate."
    suggested_action: "Grant one more cycle, or commit the user-acceptance record and carry TASK-180-020/021 into /finalise."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.1.shell-syntax-error-scored-as-refusal.md"
    anchor_check: no-line
    finding: "Bug report still open although later gates verified the fix."
    suggested_action: "Close it citing the verifying QA report."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.2.fence-control-key-ignores-slot.md"
    anchor_check: no-line
    finding: "Bug report still open although later gates verified the fix."
    suggested_action: "Close it citing the verifying QA report."
  - id: PC-4
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.3.expected-absent-collides-with-fixture-files.md"
    anchor_check: no-line
    finding: "Bug report still open although later gates verified the fix."
    suggested_action: "Close it citing the verifying QA report."
  - id: PC-5
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.4.shell-diagnostics-read-as-refusal.md"
    anchor_check: no-line
    finding: "Bug report still open although later gates verified the fix."
    suggested_action: "Close it citing the verifying QA report."
  - id: PC-6
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.5.parse-failure-masks-reproduced-side-effect.md"
    anchor_check: no-line
    finding: "Bug report still open although later gates verified the fix."
    suggested_action: "Close it citing the verifying QA report."
  - id: PC-7
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.13.ghfreepath-integration-test-vacuous.md"
    anchor_check: no-line
    finding: "Bug report open and its fix 30769d36 not read by any gate."
    suggested_action: "Gate the cycle-8 fix and close the bug, or carry it into /finalise."
  - id: PC-8
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.180.probe-engine-fence-entry-form/task.180.bug.14.emit-block-drops-fence-slot.md"
    anchor_check: no-line
    finding: "Bug report open and its fix 30769d36 not read by any gate."
    suggested_action: "Gate the cycle-8 fix and close the bug, or carry it into /finalise."
  - id: PC-9
    category: consistency
    severity: low
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: "The task's frontmatter has no pr_number although PR #637 is open."
    suggested_action: "Add pr_number: 637."
truncated_count: 0
```

## Recommended Actions

1. Decide PC-1 / PC-7 / PC-8: one more gate on `30769d36`, or carry TASK-180-020/021 explicitly into `/finalise` (the user chose the latter, 2026-10-12).
2. PC-2 … PC-6: done at this review — bugs 1–5 closed citing their verifying QA reports.
3. PC-9: `/finalise` writes `pr_number` at acceptance.
