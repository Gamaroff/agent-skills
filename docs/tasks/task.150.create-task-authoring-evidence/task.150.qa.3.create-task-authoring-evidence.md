# QA Report: Task 150 - create-task: anchored claims, a bounded title, and a --from-observation entry (cycle 3)

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Gate File**: [task.150.gate.3.create-task-authoring-evidence.yml](./task.150.gate.3.create-task-authoring-evidence.yml)
**Previous Report**: [task.150.qa.2.create-task-authoring-evidence.md](./task.150.qa.2.create-task-authoring-evidence.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 moved the seed's identity to the file prefix, and that fix holds: the re-probe driven by real
scan output engages 12/12. The unscoped review then traced the park path **across the whole log**.
`set-status` resolves `--id N` to the *first* file whose prefix is N. So when two files share a prefix,
the vector parks the wrong one and reports `ok`. This is reproduced, and it is HIGH. It is the third
consecutive cycle with one HIGH finding in the same `--from-observation` identity mechanism, so the
pipeline's convergence check trips.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-150-BUG-3 (HIGH): the seed identity was not the engine's identity | FIXED | Real-scan re-probe `seedFromRealScan` engages 12/12 (8 hostile file/id shapes refused, 4 legitimate accepted). The test on real scan output is committed |
| Refute CR-3: park over an entry that changed | PARTIAL | The re-check exists, but it keys on the scan `id`, not the file (now CR3-2, MEDIUM) |
| Refute CR-4: duplicate ids | PARTIAL | Refused among the selected entries only; the whole-log case is BUG-4 |
| Refute CR-6: the ratchet restated the rule | FIXED | The ratchet calls `checkCardTitle` |

### Review Methodology

Direct tools plus one independent Explore subagent. Cycle 3: the prior gate failed on a boundary, so
`SAFETY_REPROBE` was set and the review was unscoped. The reviewer ran the whole path against the real
engine in a scratch workspace.

Re-review scope: unscoped (prior gate failed on a boundary): full `origin/develop...HEAD` diff,
25 files, 3071 lines.

---

## New Findings This Cycle

- **[high]** `skills/create-task/scripts/lib.js:345`. TASK-150-BUG-4: the duplicate refusal covers
  only the selected entries, and `findById` picks the first same-prefix file in the whole log.
  Reproduced by QA: `0005-a-actioned.md` was rewritten to `parked`, and `0005-b-target.md` stayed
  `open`.
- **[medium]** `skills/create-task/SKILL.md:709`. CR3-2: the § 1.1 selection and the § 5 re-check
  match on the scan `id`, not the `file` the vector resolves.
- **[low/medium, advisory]** `lib.js:324`. CR-3: the agreement check reads scan's `parseInt` value,
  so `id: 7abc` in `0007-*.md` passes. This is harmless to identity, because the file parked is the
  one selected, but the claim of a "strict" read is overstated.

---

## Security probe

`boundary: true`, `probes_executed: 24` (from the run record's `totals.executed`, in
`task.150.qa.3.security.run.json`). Every control engages: `seedFromRealScan` 12/12,
`seedAcceptsStatus` 7/7, `titleWithinBound` 5/5. The probe drives one entry per workspace, so it
structurally cannot see BUG-4. The reviewer found it by reading `findById`.

---

## Other checks

- Targeted suites: 44/44. `ci:fast` at `701e5e4e`: 4389 pass, 0 fail.
- mutation-proven: `fileId` → the pre-fix `lib.js` → the real-scan-output test → covered
- mutation-proven: remove the agreement check → the BUG-1/-3 test and the real-scan test → covered
- mutation-proven: remove the duplicate check → the file/duplicate test → covered
- mutation-proven: `isSafeInteger` → `isInteger` on the file prefix → the file/duplicate test → covered

---

## NFR Assessment

- **Security**: CONCERNS. Evidence `measured`, 24 probes.
- **Reliability**: CONCERNS. BUG-4 overwrites a resolved entry's lifecycle and reports `ok`.
- **Performance**: PASS. **Maintainability**: PASS, with the advisory CR-3.

---

## Final Assessment

**Gate Status**: FAIL. **Quality Score**: 70/100.
**HIGH findings**: 1. **MEDIUM findings**: 1.
**HIGH per cycle**: 1, 1, 1. The convergence check trips at cycle 3, and the loop escalates.

**Next Steps**: the operator decides. The recommended fix is at the root. `findById` / `set-status`
should refuse an id that more than one file matches, since that protects every caller, not only this
entry. Selection and the re-check should key on `file`.
