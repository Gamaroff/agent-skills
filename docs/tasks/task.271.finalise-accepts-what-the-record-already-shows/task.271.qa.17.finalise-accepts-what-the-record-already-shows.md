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
