# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.17.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.17.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: PASS (90/100)

---

## Executive Summary

Gate 17 re-probed head `023d903e`, unscoped, after the Arm 3 record moved to a JSON file read with `JSON.parse`. About 120 reviewer probes and five hand runs found no input that exits 0 wrongly. Three low cleanups remain.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

## Re-Review Context

| Gate 16 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-34 escapes undecoded | FIXED | an escaped duplicate case id is read; hand run `a` is unapproved |
| T271-QA-35 root rows dropped | FIXED | no YAML reader remains; trailing data is unverifiable (`d`) |
| T271-QA-36 line separators | FIXED | JSON has one line grammar |
| T271-QA-37 NBSP before comment | FIXED | no comments; an NBSP in the approver is unapproved (`c`) |
| T271-QA-38 multi-document | FIXED | a second document is unverifiable (`d`) |

## New Findings This Cycle

- **[low]** the Target Architecture bullet and the plan still describe the retired sources (T271-QA-39)
- **[low]** `namesCase` is dead code (T271-QA-40)
- **[low]** a blocking cross-case mention reports the wrong reason (T271-QA-41)
- Future: the skill block substitutes the case id into double quotes before validation, a pattern shared with its siblings.

## Review Methodology

Re-review scope: unscoped, both engines. Reviewer: read-only Explore subagent, about 120 probes (24 judge and shape cases, 17 case-matching cases, 9 argv cases, a 200k-iteration fuzz of the repeated-key scanner, 21 bash and zsh runs of the skill block, 16 `finalise-delta.js` runs, `bundle --check`, byte checks that `yaml-subset.js` equals `develop`). Five hand runs.

mutation-proven: five mutations of the matcher (duplicate-key check, unknown-field check, key decoding, exact approver compare, cross-case mention block) each turn a named test red.

boundary: true; boundary_signals: ["refuses"]; probes_executed: 5; escaped: 0.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | gates 9 to 17 |
| Arm 2: one re-run, outside the diff | PASS | same |
| Arm 3: mechanical match on a JSON record, owner-only approver | PASS | five hand runs; reviewer fuzz |
| Performance: within 10% of develop | UNMEASURED | idle machine needed |

## NFR Assessment

- **Security** - PASS (5 runs; 0 escapes)
- **Performance** - CONCERNS (unmeasured)
- **Reliability** - PASS (`ci:fast` 8059 tests, 0 failed)
- **Maintainability** - PASS

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 90/100 (100 minus 10 for the unmeasured performance criterion)
**Deployment Recommendation**: READY
**Next Steps**: three low cleanups to the exit gate; measure performance on an idle machine.

---

## Addendum (written by `/finalise`, 2026-11-08): records the DoD run asked for

### Named tests per arm (criterion 1)

- Arm 1 (docs-only tree equivalence): `finalise-delta.test.mjs`, accept "a delta of documentation files only is tree-equivalent"; refusals "code-changed", "unverifiable"; the output carries both commit ids and the changed files.
- Arm 2 (one re-run of a red outside the diff): `finalise-delta.test.mjs`, accept "a red outside the PR diff over a docs-only delta, no re-run yet, is eligible"; control "a red inside the PR's own diff is in-diff, not re-run"; "already-rerun" once a re-run is recorded.
- Arm 3 (deferral, JSON record): `finalise-deferral-match.test.mjs`, accept "record: id, task, owner approver and date match"; controls for no approver, a non-owner approver, a different case id, a missing task, a bad date, no owner configured, an unreadable record, repeated keys, unknown fields.

### Mutation proofs per arm (criterion 5)

Each is a revert, a run that names the test that went red, and a restore checked with `cmp`.

- Arm 1: dropping the docs-path check turned 5 tests red (M1). Dropping the file the engine reads for the base turned the basis-carrying tests red (2 red, `/finalise` run 1).
- Arm 2: dropping the in-diff exclusion turned 1 test red (M2); allowing unlimited re-runs turned 1 red (M4).
- Arm 3: five mutations of the JSON matcher (duplicate-key check, unknown-field check, key decoding, exact approver compare, cross-case mention block) each turned a named test red (QA cycle 17, and the cross-case reason in `/finalise` run 1). Earlier designs' proofs (owner-list check, 2 red; real-date check; placeholder refusal) are recorded in the implementation report.

### Wall time (criterion 4)

Command: `CI=true npm test`, five alternating runs, `develop` (`d3b71ef3`, worktree) then the branch (`71301805`, worktree), each run timed with `date +%s%N`. The load average (the first field of `/proc/loadavg`, the figure `uptime` prints first) was read just before each run. The machine was **not idle**: the load was 1.9 to 5.7, because the probe plan and review agents ran alongside. The comparison is alternating, so both sides saw the same conditions.

| Run | develop (ms) | load before | branch (ms) | load before |
| --- | --- | --- | --- | --- |
| 1 | 162026 | 1.92 | 161258 | 3.98 |
| 2 | 158949 | 5.05 | 162689 | 4.20 |
| 3 | 170786 | 5.62 | 164972 | 5.66 |
| 4 | 158587 | 4.68 | 160949 | 4.68 |
| 5 | 158848 | 4.21 | 168976 | 5.23 |

Median develop 158949 ms, median branch 162689 ms: **+2.4%**, inside the 10% bound. All ten runs exited 0. The branch head measured is `71301805`; the later commits are one documentation line and one test file, so they do not change the engines.

**Re-measured on head `a35d236e`** (the first figure was taken one commit earlier, and that commit changed a test file, so it is not a docs-only delta). Same command, same alternation, load read from `/proc/loadavg` before each run:

| Run | develop (ms) | load before | branch (ms) | load before |
| --- | --- | --- | --- | --- |
| 1 | 164227 | 1.34 | 162056 | 4.04 |
| 2 | 159545 | 4.03 | 160647 | 4.75 |
| 3 | 161262 | 3.98 | 161074 | 4.22 |
| 4 | 165076 | 4.54 | 162824 | 5.94 |
| 5 | 159091 | 4.41 | 161273 | 5.81 |

Median develop 161262 ms, median branch 161273 ms: **+0.0%**, inside the 10% bound. All ten runs exited 0. This is the figure that counts; the earlier +2.4% is kept as a second sample.

### Fixture-vanish cause (criterion 8)

Not proven, recorded as not found. Commands tried: `GIT_TRACE2_EVENT=<file> node probe-fixture.mjs` on the executed-prose fixture template build, which showed 3 detached `git maintenance run --auto --quiet --detach` children; the template's repositories were then set to `maintenance.auto=false`, `gc.auto=0`, `receive.autogc=false`, held by `executed-prose-no-background-git.test.mjs` (reverting the setting turns it red). The one-in-6142 ENOENT itself was not reproduced, so the cause stays suspected.
