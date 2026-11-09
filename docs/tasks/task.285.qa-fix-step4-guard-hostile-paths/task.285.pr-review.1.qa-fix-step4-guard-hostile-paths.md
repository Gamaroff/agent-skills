# PR Review Report: PR #856 — fix(qa-fix): Step 4 guard survives hostile paths (task.285)

**Reviewed:** 2026-11-07
**PR:** [#856](https://github.com/Gamaroff/agent-skills/pull/856) — `feature/task.285.qa-fix-step4-guard-hostile-paths` → `develop` (open)
**Work item:** [`task.285.qa-fix-step4-guard-hostile-paths.md`](./task.285.qa-fix-step4-guard-hostile-paths.md) — resolved via `branch stem`
**Tracker:** [#855](https://github.com/Gamaroff/agent-skills/issues/855) — open
**Verdict:** ⚠️ CONCERNS

Step 5c run: conformance lens only (`--no-code`); the code lens ran in QA every cycle.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.285.implementation.1.qa-fix-step4-guard-hostile-paths-initial-run.md (QA Cycle 1–5 entries) |
| Review report | ✅ | task.285.review.1.qa-fix-step4-guard-hostile-paths.md |
| QA reports | 5 | task.285.qa.1 to qa.5 |
| Gate | CONCERNS | task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml (80) |
| DoD | ❌ | expected: written by /finalise after this step |
| Sprint review | ❌ | expected: written by /finalise after this step |
| Open bugs | 0 | |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Reviewed by the conformance lens against the diff and tests. The Section 9 boxes in the task document are unticked until `/finalise`. One criterion is not met as worded: see PC-1.

## Conformance Findings

[PC-1] coverage · medium · confidence: medium — docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.qa.5.qa-fix-step4-guard-hostile-paths.md:110
  The two Performance criteria ask for a recorded suite median (five alternating pairs, load recorded) and a per-new-test figure. QA 5 said only "Performance — PASS / Unchanged". The measurement was taken at this review, and it shows the first criterion is **not met as worded**: see the measurement below.
  → Record the figures in the QA report (done, see below) and decide whether to amend the criterion with an approver, or reduce the test cost.

[PC-2] trail · low · confidence: medium — docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml
  Gate 5 names CR-1, CR-2 and CR-3 as future items with no follow-up task id; the id (task 286) is only in the uncommitted implementation report.
  → Name task 286 in the committed artifacts.

[PC-3] consistency · low · confidence: medium — docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.qa-fix-step4-guard-hostile-paths.md
  The task document gives no pointer to task 286 and its Section 9 boxes are unticked.
  → At `/finalise`, tick the met criteria and name task 286 as owner of CR-1, CR-2 and CR-3.

**Measurement taken at this review (head `03de471a`, load 0.85 to 1.33 from `uptime` and `/proc/loadavg`):**

- Slowest new case: 564 ms (bound 1000 ms). Met.
- Stand-in suite `tests/qa-fix*.test.js`, five alternating pairs: develop 1344 to 1420 ms (median 1356), branch 4995 to 5130 ms (median 5018). That is +270%, against a bound of +10%. **Not met as worded.** The file grew from 17 to 37 tests, and each case spawns bash and zsh.
- The whole-suite median (`npm test`) was not measured; at roughly 3.7 s added it is likely small against that total.

## Code Review Findings

Skipped (`--no-code`): ran in QA each cycle with `code_review_blocking=true`.

**Anchors:** 3 checked, all verified.

## Machine-Readable Findings

```yaml
reviewed_gate: task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.qa.5.qa-fix-step4-guard-hostile-paths.md:110"
    anchor_check: ok
    finding: "The suite-median performance criterion has no recorded figure in the QA reports, and the measurement taken at review shows it is not met as worded (+270 percent against a 10 percent bound for the qa-fix test files)."
    suggested_action: "Amend the criterion with an approver or reduce the cost of the new tests."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.gate.5.qa-fix-step4-guard-hostile-paths.yml"
    anchor_check: ok
    finding: "Gate 5 names no follow-up task id for the deferred advisories."
    suggested_action: "Name task 286 in the committed artifacts."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.285.qa-fix-step4-guard-hostile-paths/task.285.qa-fix-step4-guard-hostile-paths.md"
    anchor_check: ok
    finding: "The task document has no pointer to task 286 and its success criteria boxes are unticked."
    suggested_action: "Tick the met criteria and name task 286 at finalise."
truncated_count: 0
```

## Recommended Actions

1. Decide PC-1: amend the first Performance criterion (needs an approver) or cut the cost of the 20 new tests.
2. Name task 286 in the committed artifacts (PC-2, PC-3).
