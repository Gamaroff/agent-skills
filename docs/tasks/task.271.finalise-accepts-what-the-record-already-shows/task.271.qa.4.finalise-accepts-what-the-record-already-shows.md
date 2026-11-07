# QA Report: Task 271 - finalise accepts what the record already shows

**Task**: [Link to task document](./task.271.finalise-accepts-what-the-record-already-shows.md)
**Gate File**: [task.271.gate.4.finalise-accepts-what-the-record-already-shows.yml](./task.271.gate.4.finalise-accepts-what-the-record-already-shows.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: FAIL (60/100)

---

## Executive Summary

Cycle 4 re-probed the whole safety surface on head `6e09fba4` (unscoped; the prior gate failed on security). Cycle 3's two findings are closed. The same class appeared a third time in the Arm 3 matcher, and a symlink gap appeared in the failed-file check. This is the third consecutive gate with a HIGH on `finalise-deferral-match.js`, so the fix must replace the mechanism, not patch the pattern.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Re-Review Context

| Cycle 3 finding | Status | Evidence |
| --------------- | ------ | -------- |
| T271-QA-9 free-prose lead | PARTIAL | `case.conditional-lead` now rejected; the bold slot of the same lead is still free prose (T271-QA-10) |
| T271-QA-8 directory, subdirectory root | FIXED | probe `ff.directory` rejected; subdirectory root test committed |

## New Findings This Cycle

- **[high]** `shared/resources/finalise-deferral-match.js:265` — prose in the bold slot of the lead qualifies the approval (probe: 2 of 2 accepted) → replace the grammar with one exact line (T271-QA-10)
- **[high]** `shared/resources/finalise-delta.js:252` — a symlink to a changed file passes the blob check (probe: accepted) → require mode 100644/100755 (T271-QA-11)
- **[medium]** `shared/resources/finalise-deferral-match.js:347` — first match wins, so a later revocation is ignored; a gate entry is matched on a mention in free text (T271-QA-12)

---

## Review Methodology

Re-review scope: unscoped (prior gate failed on security) — the full `origin/develop...HEAD` diff, 4854 patch lines. Reviewer: read-only Explore subagent, 89.7 s from the completion notice. CR-1 and CR-2 were reproduced by hand; CR-1, CR-2 and CR-3 were reproduced by the probe engine. CR-4 is folded into T271-QA-12; CR-5 and CR-6 are advisory.

CI on `6e09fba4`: not read as a decided state this cycle; nothing recorded green or red.

Step 4b: the SKILL.md blocks are executed under bash and zsh by `finalise-acceptance-blocks.test.mjs` (8 tests, committed, passing).

## Success Criteria Verification

| Criterion | Status | Evidence |
| --------- | ------ | -------- |
| Arm 1: equal code tree counts | PASS | `finalise-delta.js docs-only` |
| Arm 2: one re-run, outside the diff, docs-only delta | FAIL | T271-QA-11 reproduced |
| Arm 3: mechanical case-id match, owner-only approver | FAIL | T271-QA-10, T271-QA-12 reproduced |
| Performance: median of 5 alternating `npm test` runs within 10% of develop | UNMEASURED | 4 of 5 pairs; the machine was loaded by other work, the spread within one side exceeds the bound |

## NFR Assessment

### Security — FAIL

- **Evidence**: measured
- **Probes executed**: 14
- Probe engine, cli form, path sink: `finalise-deferral-match.js` 7 executed, 4 reproduced; `finalise-delta.js` 7 executed, 1 reproduced. Escapes: 0.

### Performance — CONCERNS

Medians so far: branch 194 s, develop 180 s (+8%), but the spread inside one side is 166 to 224 s. Not a usable measurement; rerun on an idle machine.

### Reliability — PASS

### Maintainability — CONCERNS

Three cycles patched one phrasing of the same text matcher.

## Code Review

**Correctness bugs (6):**
- [high/high] `shared/resources/finalise-deferral-match.js:265` — free prose in the bold slot (gate T271-QA-10)
- [high/high] `shared/resources/finalise-delta.js:252` — symlink to a file passes the blob check (gate T271-QA-11)
- [medium/high] `shared/resources/finalise-deferral-match.js:347` — first match wins (gate T271-QA-12)
- [medium/high] `shared/resources/finalise-deferral-match.js:194` — gate entry matched on a mention (folded into T271-QA-12)
- [low/low] `shared/resources/finalise-deferral-match.js:146` — approver compared case-insensitively → advisory
- [low/low] `shared/resources/finalise-deferral-match.js:225` — section ends only at the next H2 → advisory

mutation-proven: no new mutation run on the committed head this cycle (the cycle-3 mutation proofs stand as recorded in the implementation report).

boundary: true; boundary_signals: ["refuses"]; probes_executed: 14; escaped: 0.

## Test Artifacts

Run records, cases and fixtures are beside this report (`task.271.qa.4.security.*`).

## Final Assessment

**Gate Status**: FAIL
**Rationale**: the Arm 3 matcher fails open a third time; the third-strike rule applies to `finalise-deferral-match.js`.
**Quality Score**: 60/100
**Deployment Recommendation**: BLOCKED
**Next Steps**: `/qa-fix` with a replacement grammar, then cycle 5 (the last gate in the budget).
