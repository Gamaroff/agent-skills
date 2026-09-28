# QA Report: Task 150 - create-task: anchored claims, a bounded title, and a --from-observation entry (cycle 5)

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Gate File**: [task.150.gate.5.create-task-authoring-evidence.yml](./task.150.gate.5.create-task-authoring-evidence.yml)
**Previous Report**: [task.150.qa.4.create-task-authoring-evidence.md](./task.150.qa.4.create-task-authoring-evidence.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Gate Status**: PASS

---

## Executive Summary

The last budgeted cycle. It verifies cycle 4's two fixes: observe-work's review Step 6 passes
`--expect-status`, and the flag is rejected outside `set-status`. It re-probes the delivered
boundary, and there is no high or medium finding. Two low advisory findings are carried as
follow-ups.

**Overall Assessment**: PASS. **Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| CR4-1 (MEDIUM): observe-work Step 6 wrote without `--expect-status` | FIXED | The reviewer ran Step 6's command in a scratch log: `status-changed` on a changed entry, `ok` on an unchanged one |
| CR4-2 (low): the flag was accepted outside `set-status` | FIXED | `scan` / `write --expect-status` answer usage (exit 2); the committed test was mutation-proved |

### Review Methodology

Direct tools plus one independent Explore subagent, which ran the engine against a scratch workspace.
Re-review scope: since `2026-09-28T19:48:40Z` (default; gate 4's security axis was a measured PASS).
6 files, 830 diff lines.

---

## New Findings This Cycle

- **[low/medium, advisory]** `skills/observe-work/references/review-cycle.md:182`. CR5-1: the command
  template hard-codes `--expect-status open`, while the prose below it says to pass the status actually
  read. A parked entry actioned from the template answers `status-changed`, and it is not retried.
  The same applies to the SKILL.md quick-reference row.
- **[cleanup]** `skills/create-task/SKILL.md:196`. CR5-2: § 1.1 selects by the padded string prefix
  `0124-`, while the engine matches on the parsed number, so an unpadded twin is caught only at § 5
  (`ambiguous-id`, nothing written).

---

## Security probe

`boundary: true`, `probes_executed: 22` (from the run record's `totals.executed`, in
`task.150.qa.5.security.run.json`). `parkWrites` engages 10/10, `seedFromRealScan` 12/12, and 0
are reproduced.

---

## Other checks

- Targeted suites: 101/101 (card-preflight, corpus, presence, from-observation, observation-log).
  `ci:fast` at `ead30d17`: 4393 pass, 0 fail. `bundle:check`: 0 problems.
- mutation-proven: remove the non-`set-status` guard → the `expect-status` test (scan case) → covered

---

## NFR Assessment

Security: PASS (measured, 22 probes). Performance: PASS. Reliability: PASS. Maintainability: PASS
(two advisory lows).

---

## Final Assessment

**Gate Status**: PASS. **Quality Score**: 100/100.
**HIGH per cycle**: 1, 1, 1, 0, 0. **MEDIUM per cycle**: 1, 0, 1, 1, 0.
**Next Steps**: Step 5c `/review-pr`.
