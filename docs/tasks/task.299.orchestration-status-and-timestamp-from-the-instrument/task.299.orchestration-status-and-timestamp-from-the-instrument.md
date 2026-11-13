---
id: task.299
title: "Orchestration reads status and time from the instrument"
type: task
description: "Stop pipeline prose that reads a background step's exit code from a wrapped command or types a timestamp by hand."
tags: [develop-task, qa-task, observation]
category: refactoring
status: ready-for-review
priority: Low
created: 2026-11-10
updated: 2026-11-13
estimated_effort_hours: 4
---

# Technical Task: Orchestration reads status and time from the instrument

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.299.review.1.orchestration-status-and-timestamp-from-the-instrument.md` implemented 2026-11-13

Cut from observation #164.

---

## 1. Overview

On task.295 a background command written as `cmd; echo exit=$?` reported the exit code of the whole compound, so a notification said "exit 0" for a run whose real step had failed. Separately, `updated:` values typed into gate files drifted from the real time and had to be re-read from `date -u`. This task finds where the pipeline prose teaches either habit and replaces it.

## 2. Motivation

A status or a time that comes from the line that wraps it, or from memory, is wrong silently. The user's own global rules already say a background task's exit code belongs to the whole compound command; the pipeline's prose should not teach the opposite.

## 3. Technical Background

**Current state:** unmeasured. Phase 1 measures it with two greps over `skills/`, `shared/resources/` and `docs/`: background blocks that end in `echo` after the real command, and instructions that tell the author to write a timestamp rather than run `date -u`. **(unverified)** until Phase 1 records the commands and counts.

**Target:** each hit either fixed (the step's own status is written to a file and read back; the time comes from `date -u` in the same block) or named as an exclusion with its reason.

## 4. Scope

**In scope:** ✅ the measurement ✅ the fixes in shipped prose and scripts ✅ a guard test over the measured population.

**Out of scope:** ❌ changing how the harness reports exit codes ❌ fixing files outside the skills and shared resources. Phase 1 still measures `docs/`, so a hit there is seen and classed: a counter-example kept to show the wrong form (for example `docs/bugs/bug.4.snippet-engine-symlink-noop`) is an exclusion with its reason, not a fix. Test fixtures under `shared/resources/tests/` and `skills/*/tests/` that run `cmd; echo "rc=$?"` in the foreground to read the command's own status are exclusions: the status of the command directly before the `echo` is the intended reading.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1: Measure — Risk: Low

- [x] Record the two grep commands, their counts and each hit as `path:line`, each classed as a fix or an exclusion with its witness. Starting definitions, to be refined and then frozen as the guard's own: (a) `git grep -nE 'echo[ ]+"?[A-Za-z_]*(exit|rc|status)[A-Za-z_]*=\$\?'` over `skills/`, `shared/resources/` and `docs/`, keeping only hits whose block runs in the background (`run_in_background`, a trailing `&`, or prose that says "background"); (b) `git grep -niE '(write|type|fill in|record)[^.]{0,40}(timestamp|current (date|time))'` over the same roots, keeping hits that tell the author to produce the value by hand rather than run `date -u`. A bundled copy under `skills/*/references/` counts once, with its `shared/resources/` source; the source is what is fixed. The first pass found the `updated:` sentence in `shared/resources/qa-re-review-scope.md:189` and in `skills/qa-task/SKILL.md:248,481`, which already teach the instrument: classify them as exclusions with that witness.
- [x] State the guard's claim as a bounded set: a fixture table of the shapes the scan catches (`; echo exit=$?`, `; echo "rc=$?"`, `; echo status=$?`, and the typed-timestamp phrasings), with the shapes it knowingly does not see named. "Any wrapped status" is an unbounded claim.

### Phase 2: Fix — Risk: Medium

- [x] For each background-status hit, write the step's own status to a file and read it. For each timestamp hit, take it from `date -u` in the same block.
- [x] Edit sources under `shared/resources/` and `skills/`, then `npm run bundle`.

### Phase 3: Guard — Risk: Low

- [x] A test, `tests/orchestration-instrument-reads.test.js` (style of `tests/doc-id-chokepoint.test.js`), that scans the same population with the recorded definition and fails on a new hit, with a non-vacuity floor so a broken scan cannot read as clean. Confirm `npm test` reaches it: `tests/test-runner-reach.test.js` is the backstop, and the Files Summary lists any `package.json` edit it needs.
- [x] Mutation-proof: reintroduce one hit in a shipped source, confirm the guard goes red, revert (with the Edit tool).

## 7. Files Summary

The list comes from Phase 1's measurement, not from recall: record the command and its count here when Phase 1 is done. Fixed files are `shared/resources/*.md`, `skills/*/SKILL.md` and their bundled copies; the guard is a new test, `tests/orchestration-instrument-reads.test.js`. Reuse the scan helpers `tests/doc-id-chokepoint.test.js` already uses rather than writing a second walker.

## 8. Testing Strategy

Assert behaviour: a fixture block containing `cmd; echo exit=$?` is flagged and the corrected form is not. Mutation-prove the guard by reintroducing a hit. Run the whole suite through `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] Phase 1's measurement (commands, counts, every hit classed) is recorded in the QA report's Findings table.
- [ ] No unclassed hit remains; each is fixed or excluded with a reason. Held by `tests/orchestration-instrument-reads.test.js`: its allowlist carries a reason per entry and its non-vacuity floor fails on an empty scan.
- [ ] The guard flags a fixture hit and passes the fixed form. Held by the same test's fixture table (a flagged and a passing case per shape).

**Performance**

- [ ] The guard adds at most 3 seconds to `ci:fast`: median of five runs of `command node --test tests/orchestration-instrument-reads.test.js`, with `uptime` beside each, outliers reported, recorded in the QA report.

**Code quality**

- [ ] `npm run bundle:check`, `format:check`, `lint:shell` and `ci:fast` pass.

**Migration**

- [x] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a broad scan flags prose that legitimately shows the wrong form as a counter-example. Mitigation: the allowlist carries a reason per entry, and a non-vacuity floor. **Low:** bundled copies drift; run `npm run bundle`.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a guard that fails on unrelated work (Critical); an allowlist wording (non-critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-13
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.299.qa.4.orchestration-status-and-timestamp-from-the-instrument.md](./task.299.qa.4.orchestration-status-and-timestamp-from-the-instrument.md)
- **Gate File**: [task.299.gate.4.orchestration-status-and-timestamp-from-the-instrument.yml](./task.299.gate.4.orchestration-status-and-timestamp-from-the-instrument.yml)

### Test Coverage Summary
- **Tests Executed**: 4
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 3's finding is fixed and the real population scans clean. One low-severity edge remains: a single quote glued to the preceding word is not masked.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #164 | create-task |
| 2026-11-13 | 1.1     | Review passed (8/10) — 6 Important fixes applied: named guard test and runner reach, numeric performance bound, docs/ measurement vs fix scope, bounded-set guard claim, starting grep definitions | review-task |
| 2026-11-13 |         | Status → ready-for-development                                                                                                                        | review-task |
| 2026-11-13 |         | Implemented: bounded guard test, `date -u` named at every time placeholder, background-status reading rule; status → ready-for-review                   | develop     |
| 2026-11-13 |         | QA gate CONCERNS (70/100) — 3 findings                                                                                                                | qa-task     |
| 2026-11-13 |         | QA findings fixed — guard status rule widened (`&&`, `||`, quoted, braced), non-vacuity floor added, 1 iteration                                       | qa-fix      |
| 2026-11-13 |         | QA gate CONCERNS (80/100) — 2 findings                                                                                                                | qa-task     |
| 2026-11-13 |         | QA findings fixed — quoted content masked once before parsing, single `&` / `|` operators, 2 iterations                                                | qa-fix      |
| 2026-11-13 |         | QA gate CONCERNS (90/100) — 1 finding                                                                                                                 | qa-task     |
| 2026-11-13 |         | QA findings fixed — apostrophe in prose no longer opens a quote, 3 iterations                                                                         | qa-fix      |
| 2026-11-13 |         | QA gate PASS (95/100) — 1 low finding                                                                                                                 | qa-task     |

<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 3

## References

- Observation #164 — Background exit codes and typed timestamps: read the instrument, not the wrapper
