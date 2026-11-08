# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.3.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.3.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL (70/100)

---

## Executive Summary

Cycle 3 re-probed the whole safety surface on head `31ee1c69` (the prior gate failed on security, so the re-review is unscoped). Cycle 2's three findings are closed. Two new defects: the Arm 3 bullet lead is still free prose behind a closed list of negation words, and `rerun-eligible` reads a directory name as a failed file outside the diff.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 2 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-5 negated bullet | FIXED | probe cases `case.negated-lead`, `case.negated-approval`, `case.trailing-condition` rejected |
| T271-QA-6 comment, two ids | FIXED | probe cases `case.commented-out`, `case.two-cases` rejected |
| T271-QA-7 symlink | FIXED | probe case `ff.symlink-changed` rejected |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:231` — the bullet lead is unconstrained prose behind a word filter; "only if Sam agrees", "withheld", "If accepted" and "is to be deferred" all match → allow-list the lead (T271-QA-9)
- **[medium]** `shared/resources/finalise-delta.js:247` — a directory name, or a name relative to a subdirectory workspace root, reads as outside the diff → require a blob at head and reduce against the toplevel (T271-QA-8)

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security) — the full `origin/develop...HEAD` diff, 4210 patch lines. The refute directive is not appended (cycle 3); the safety re-probe directive is. Reviewer: read-only Explore subagent, 57.1 s from the completion notice. The reviewer's CR-1 and CR-2 were reproduced by hand (CR-2) or by the probe engine (CR-1) before entering the gate.

CI on `31ee1c69`: not read as a decided state this cycle; nothing recorded green or red.

Step 4b: the SKILL.md blocks are executed under bash and zsh by `finalise-acceptance-blocks.test.mjs` (8 tests, committed, passing).

Gate 2 recorded a quality score of 60; its rule (100 minus 20 for the security FAIL, 10 for performance CONCERNS) gives 70. This gate applies the rule.

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff, docs-only delta | PASS with T271-QA-8 | 11 probes, 0 reproduced; the directory gap above |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-9 reproduced |
| Performance: median of 5 alternating `npm test` runs within 10% of develop | UNMEASURED | 2 of 5 pairs done under varying load |

## NFR Assessment

### Security — FAIL

- **Evidence**: measured
- **Probes executed**: 21
- Probe engine, cli form, path sink: `finalise-delta.js` 11 executed, 0 reproduced; `finalise-deferral-match.js` 10 executed, 1 reproduced. Escapes: 0.

### Performance — CONCERNS

Unmeasured; see the gate.

### Reliability — PASS

### Maintainability — PASS

## Code Review

**Correctness bugs (4):**
- [high/high] `shared/resources/finalise-deferral-match.js:231` — free-prose lead behind a word filter (gate T271-QA-9)
- [medium/high] `shared/resources/finalise-delta.js:247` — directory and subdirectory-root names (gate T271-QA-8)
- [low/medium] `shared/resources/finalise-deferral-match.js:178` — gate entry `action` text and duplicate keys are not checked → advisory, `recommendations.future`
- [low/medium] `shared/resources/finalise-delta.js:117` — exact-case comparison → advisory (macOS only, task 210 deferred)

mutation-proven: dropped the `t <= now` future-date bound (cycle 2) → T271-QA-3 control → covered; no new mutation run this cycle on the committed head (the fixes for this gate's findings are not yet written).

boundary: true; boundary_signals: ["refuses"]; probes_executed: 21; escaped: 0.

## Test Artifacts

Run records, cases and fixtures are beside this report (`task.271.qa.3.security.*`).

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Arm 3 still fails open on a bullet phrasing the filter does not list.
**Quality Score**: 70/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` T271-QA-8 and T271-QA-9 (a working-tree fix for both is already prepared and tested, to be committed with this gate), then cycle 4.
