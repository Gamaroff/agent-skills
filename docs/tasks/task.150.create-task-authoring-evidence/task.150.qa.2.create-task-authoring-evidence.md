# QA Report: Task 150 - create-task: anchored claims, a bounded title, and a --from-observation entry (cycle 2)

**Task**: [task.150.create-task-authoring-evidence.md](./task.150.create-task-authoring-evidence.md)
**Gate File**: [task.150.gate.2.create-task-authoring-evidence.yml](./task.150.gate.2.create-task-authoring-evidence.yml)
**Previous Report**: [task.150.qa.1.create-task-authoring-evidence.md](./task.150.qa.1.create-task-authoring-evidence.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-28
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 was a refute pass over the whole branch, plus a safety re-probe of the seed. The re-probe
used a freshly enumerated set of inputs, not cycle 1's list. Cycle 1's two fixes hold for the
inputs they were written against. But the refute reviewer found that the id guard **never sees the
raw id on the path the skill prescribes**. Scan output is already `parseInt`-ed, and `set-status`
resolves its target by the **filename prefix**, not the frontmatter id. A malformed entry can still
park a different observation. This is reproduced with real scan output, and it is HIGH.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| -------------- | ------ | -------- |
| TASK-150-BUG-1 (HIGH): the id guard was inert on raw strings | FIXED for raw inputs; **re-scoped as BUG-3** | The re-probe refuses every raw malformed string. On the scan path the guard is bypassed (BUG-3) |
| TASK-150-BUG-2 (MEDIUM): the status read diverged from the engine | FIXED | The `seedAcceptsStatus` re-probe engages 7/7, including `"\topen\n"` and `null` accepted and `"Open"` and `" parked "` refused |
| CR-3 (advisory): the park block hard-coded its ids | FIXED | § 5 step 2b now runs `{park-vector}` verbatim |
| CR-4 (advisory): `OBS_LOG_DIR` was read in a later shell | FIXED | § 1.1 step 3 re-sources the resolver in the reading shell |

### Review Methodology

Direct tools plus one independent Explore subagent. Cycle 2 means `REFUTE_PASS=true`. The prior gate
failed on a boundary, so `SAFETY_REPROBE` was set by judgement (clause 2 of the shared rule). Both
directives were appended.

Re-review scope: unscoped (refute pass + safety re-probe): full `origin/develop...HEAD` diff,
24 files.

---

## New Findings This Cycle

- **[high]** `skills/create-task/scripts/lib.js:291`. TASK-150-BUG-3 (refute CR-1 and CR-2, plus
  the re-probe). The park vector keys on the frontmatter id, which scan has already `parseInt`-ed,
  while `set-status` resolves by filename prefix. Reproduction: file `0005-x.md` with `id: 1e2`
  scans as id `1`, and the seed emits `--id 1`. Unsafe integers (`9007199254740993`, `1e21`) also
  convert. Fix: derive the id from `file`, check it against the frontmatter, refuse duplicates.
- **[medium/medium, advisory]** `skills/create-task/SKILL.md:696`. CR-3 (refute). The entry is checked
  as open at § 1.1 but parked at § 5, and `set-status` overwrites without checking its current value.
- **[low/medium, advisory]** `lib.js:310`. CR-4: duplicate ids are not refused (folded into BUG-3).
- **[low/low, advisory]** `lib.js:256`. CR-5: `firstSentence` stops at abbreviations (`e.g.`).
- **[cleanup]** `card-preflight-corpus.test.mjs:125`. CR-6: the ratchet restates the length rule.

---

## Security probe (Step 3b.3)

`boundary: true`. `probes_executed: 30` (copied from the run record's `totals.executed`, in
`task.150.qa.2.security.run.json`).

| Control | Verdict | Executed | Reproduced |
| ------- | ------- | -------- | ---------- |
| `titleWithinBound` (`checkCardTitle`) | engages | 5 | none |
| `seedAcceptsStatus` | engages | 7 | none |
| `seedAcceptsId` | present-but-inert | 18 | `id2.bigstr`, `id2.bignum`, `id2.unsafe` |

The probe drives the seed with raw values. The scan-path bypass was found by the reviewer reading
`cmdScan` and `findById`, and was then reproduced by hand. The fix's test must drive the seed with
**real scan output**, not raw values.

---

## Other checks

- Targeted suites: 42/42. `ci:fast` at the fix commit: 4387 pass, 0 fail.
- Step 4b: create-task has 5 blocks, all refused as mutating (`no-executable-blocks`), unchanged.
- Mutation proofs (3c) for cycle 1's fixes are recorded in the implementation report. Both tests
  are `covered`.
  - mutation-proven: `observationId` → pre-fix `Number()` guard → BUG-1 refusal test → covered
  - mutation-proven: `statusOf` → pre-fix `String(status || "open")` → BUG-2 acceptance test → covered

  The BUG-1 test is covered **for raw inputs only**, which is the gap BUG-3 names.

---

## NFR Assessment

- **Security**: CONCERNS. Evidence `measured`, 30 probes. There is no network or credential surface,
  and the defect is integrity of local operator data.
- **Reliability**: CONCERNS. CR-3: parking can silently overwrite an entry that changed since it
  was selected.
- **Performance**: PASS.
- **Maintainability**: PASS, with the CR-6 cleanup.

---

## Final Assessment

**Gate Status**: FAIL (deterministic rule 1: a HIGH `top_issues` entry)
**Quality Score**: 70/100
**HIGH findings**: 1. **MEDIUM findings**: 0 in `top_issues` (CR-3 is advisory: medium confidence)

**Next Steps**: `/qa-fix` cycle 2. Key the id on the file prefix, check it against the frontmatter,
refuse duplicates and unsafe integers, and test with real scan output. CR-3 and CR-6 are cheap and
in the same files.
