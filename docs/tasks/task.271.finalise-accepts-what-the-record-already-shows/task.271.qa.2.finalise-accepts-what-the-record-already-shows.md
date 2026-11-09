# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.2.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.2.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Cycle 2 was a full refute pass over the whole branch diff, with the safety re-probe, on head `aec627b3`. All four cycle-1 findings are closed. The refute pass and the probe engine found three new defects, two of them high: the Arm 3 work-item matcher accepts a negated bullet, a bullet inside an HTML comment, and one approval for several case ids; and `rerun-eligible` follows a symlinked failing test file to its target name.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 1 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-1 failed-file spellings | FIXED | absolute, `./`, `a/./b`, `a//b` all `in-diff` (probe cases `ff.*`, 10 executed, 0 reproduced) |
| T271-QA-2 unsubstituted placeholder | FIXED | `{failed-files}` answers `bad-failed-file` (probe `ff.placeholder` rejected) |
| T271-QA-3 impossible date | FIXED | mutation-proven this cycle: replacing the final `return t <= now` with `return true` turns the T271-QA-3 control red |
| T271-QA-4 zsh `read -a` | FIXED | `finalise-acceptance-blocks.test.mjs` runs the block under bash and zsh, 8 of 8 |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:231` — the work-item matcher accepts a negated bullet ("NOT deferred to task.5; was not approved by ...") → match one anchored form (T271-QA-5)
- **[high]** `shared/resources/finalise-deferral-match.js:242` — a bullet inside an HTML comment, and a bullet naming two case ids, both match → strip comments, make the case id the leading token (T271-QA-6)
- **[medium]** `shared/resources/finalise-delta.js:155` — a symlinked failing test file resolves to its target and reads as outside the diff → resolve the parent directory only (T271-QA-7)

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security; cycle 2 is also the refute pass) — the full `origin/develop...HEAD` diff, 22 files, 3568 patch lines. Both the refute and the safety re-probe directives were appended to the reviewer prompt. The reviewer ran as a read-only Explore subagent (duration 53.8 s from the completion notice); every finding was reproduced by hand before it entered the gate (CR-1 to CR-3 reproduced; CR-4 and CR-5 left advisory, see below).

CI on `aec627b3`: not read this cycle (the `qa-ci-read.sh` read runs at gate time; the PR check rollup was empty when last queried, so nothing is recorded as green or red).

Step 4b: the change set adds fenced bash blocks to `skills/finalise/SKILL.md`; they are executed under bash and zsh by `finalise-acceptance-blocks.test.mjs` (8 tests, committed, passing).

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only`, 17 tests |
| Arm 2: one re-run, outside the diff, docs-only delta | PASS with T271-QA-7 | engine refuses every spelling and non-path; symlink gap above |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-5, T271-QA-6 reproduced |
| Performance: `npm test` median of 5 alternating runs within 10% of develop | UNMEASURED | job still running when written; see gate `performance` |

## NFR Assessment

### Security — FAIL

- **Evidence**: measured
- **Probes executed**: 17
- Probe engine, cli form, path sink. `finalise-delta.js`: 10 executed, 0 reproduced. `finalise-deferral-match.js`: 7 executed, 3 reproduced. Escapes: 0.

### Performance — CONCERNS

Unmeasured at write time (frozen worktrees: head `aec627b3` against `d3b71ef3`, five alternating runs).

### Reliability — PASS

### Maintainability — PASS

## Code Review

**Correctness bugs (5):**
- [high/high] `shared/resources/finalise-deferral-match.js:231` — negation-blind bullet matcher → anchored form (gate T271-QA-5)
- [high/high] `shared/resources/finalise-deferral-match.js:242` — comments and multi-id bullets (gate T271-QA-6)
- [medium/medium] `shared/resources/finalise-delta.js:155` — symlink resolved to target (gate T271-QA-7; reproduced, original severity medium kept)
- [low/medium] `shared/resources/finalise-delta.js:225` — `--base` ancestry not checked → advisory, `recommendations.future`
- [low/medium] `shared/resources/finalise-deferral-match.js:129` — `toLowerCase` folds the Kelvin sign → advisory, `recommendations.future`

mutation-proven: dropped the `t <= now` future-date bound → T271-QA-3 control in `finalise-deferral-match.test.mjs` → covered. File restored from a byte snapshot (`cmp` clean; the first restore attempt did not match, the snapshot copy was used).

boundary: true; boundary_signals: ["refuses"]; probes_executed: 17; escaped: 0.

## Test Artifacts

### Test Commands Executed
```bash
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:shared/resources/finalise-delta.js' ...
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:shared/resources/finalise-deferral-match.js' ...
CI=true node --test shared/resources/tests/finalise-deferral-match.test.mjs
```

Run records, cases and fixtures are beside this report (`task.271.qa.2.security.*`).

## Final Assessment

**Gate Status**: FAIL
**Rationale**: two reproduced high findings in Arm 3, which fails open on text the same pipeline writes.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` T271-QA-5 to T271-QA-7 with refused controls, then cycle 3.
