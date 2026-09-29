# QA Report: Task 150 - create-task: anchored claims, a bounded title, and a --from-observation entry (cycle 4)

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Gate File**: [task.150.gate.4.create-task-authoring-evidence.yml](./task.150.gate.4.create-task-authoring-evidence.yml)
**Previous Report**: [task.150.qa.3.create-task-authoring-evidence.md](./task.150.qa.3.create-task-authoring-evidence.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Gate Status**: CONCERNS

---

## Executive Summary

This is the first cycle after the operator-granted re-entry (2 extra cycles). It reviews the root fix
made outside the loop. `set-status` refuses an ambiguous id and honours `--expect-status`, and the
seed passes `--expect-status open` and reads the raw id. The fix holds: a new probe of the whole park
path through the real engine engages 10/10. **No HIGH finding.** There is one MEDIUM: the engine's
other caller, observe-work's review Step 6, still guards by a hand re-scan, which this change's own
prose says cannot protect a later write.

**Overall Assessment**: CONCERNS. **Deployment Recommendation**: CONDITIONAL (CR4-1)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-150-BUG-4 (HIGH): the park resolved to the first same-prefix file | FIXED | `parkWrites` probe: a same-prefix sibling (sorting first, sorting last, different padding) is refused with no file written. The engine test `ambiguous-id` and the seed end-to-end test are committed and mutation-proved |
| CR3-2 (MEDIUM): selection and the re-check keyed on the scan id | FIXED | § 1.1 selects by `file`; § 5 relies on the engine's write-time `--expect-status` |
| Cycle-3 CR-3 (advisory): the agreement check read `parseInt` | FIXED | The seed reads the raw id from the file text (`7abc` in `0007` refused, both by test and by `pk.mismatch`) |

### Review Methodology

Direct tools plus one independent Explore subagent, which ran the seed and the park vectors against
the real bundled engine in a scratch log. `SAFETY_REPROBE` was set by judgement: the loop escalated
on a boundary.

Re-review scope: unscoped (safety re-probe after escalation): full `origin/develop...HEAD` diff,
37 files.

---

## New Findings This Cycle

- **[medium/high]** `skills/observe-work/references/review-cycle.md:166`. CR4-1: Step 6 re-scans by
  hand, then runs `set-status … --status actioned` without `--expect-status`. The SKILL.md
  quick-reference row does the same. An entry resolved by another session during a review is still
  overwritten. Confirmed by reading.
- **[low/medium, advisory]** `shared/resources/observation-log.js:1581`. CR4-2: `--expect-status` is
  accepted and ignored by `scan` and the other subcommands (confirmed: `scan --expect-status parked`
  answers `empty`/`ok` unfiltered). The parser already rejects `write --id` for the same reason.

---

## Security probe

`boundary: true`, `probes_executed: 34` (from the run record's `totals.executed`, in
`task.150.qa.4.security.run.json`). 0 reproduced.

| Control | Verdict | Executed |
| ------- | ------- | -------- |
| `parkWrites`: the whole path (scan → seed → set-status) against collision and changed-status scenarios | engages | 10 |
| `seedFromRealScan` | engages | 12 |
| `seedAcceptsStatus` | engages | 7 |
| `titleWithinBound` | engages | 5 |

This control answers cycle-3 observation #209. The fixture is built through the real producer, it
contains a colliding sibling, and it asserts which file was written, not only whether the call was
accepted.

---

## Other checks

- `ci:fast` at `f2358724`: 4393 pass, 0 fail. `bundle:check`: 0 problems. `validate` passes on
  create-task and observe-work.
- mutation-proven: engine first-match → the `ambiguous-id` test → covered
- mutation-proven: no `--expect-status` check → the `expect-status` test → covered
- mutation-proven: no `--expect-status` validation → the same test (usage case) → covered
- mutation-proven: the pre-fix seed → the seed end-to-end test → covered
- mutation-proven: the agreement check without the raw read → the raw-id test → covered
- Step 4b: create-task has 5 blocks, all refused as mutating (`no-executable-blocks`), unchanged.

---

## NFR Assessment

- **Security**: PASS. Evidence `measured`, 34 probes, 0 reproduced.
- **Reliability**: CONCERNS (CR4-1).
- **Performance**: PASS. **Maintainability**: PASS, with the advisory CR4-2.

---

## Final Assessment

**Gate Status**: CONCERNS (rule 2: a MEDIUM `top_issues` entry). **Quality Score**: 90/100.
**HIGH findings**: 0. **MEDIUM findings**: 1.
**HIGH per cycle**: 1, 1, 1, 0. The count fell, so the convergence check does not trip.

**Next Steps**: `/qa-fix` cycle 4. Add `--expect-status` to observe-work Step 6 and its
quick-reference row. CR4-2 is cheap and in the same engine.
