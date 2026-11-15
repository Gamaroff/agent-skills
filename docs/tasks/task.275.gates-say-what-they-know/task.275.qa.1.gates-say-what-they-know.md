# QA Report: Task 275 - Gates say what they know

**Task**: [Link to task document](./task.275.gates-say-what-they-know.md)
**Gate File**: [task.275.gate.1.gates-say-what-they-know.yml](./task.275.gate.1.gates-say-what-they-know.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-15
**Testing Completed**: 2026-11-15
**Gate Status**: PASS

---

## Executive Summary

The PASS gate lead now counts open minor points, a helper counts them from the gate, every shipped site feeds it, and a guard test fails on a site that does not. Gate `recommendations.future` actions carry `remedy:`. Verified by execution, by a cross-check against a YAML parser over 997 committed gates, and by two mutations.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#911)

### Testing Approach

- [x] Automated Testing (unit; `ci:fast` on the LAN server, `CI=true`)
- [x] Regression Testing
- [x] Code Review (inline)
- [x] Mutation proofs

### Review Methodology

First review, so Re-Review Context does not apply. Direct tools only (3 phases, one module, Low risk).

Diff review: code review, performed **inline by the QA run**. No Explore subagent was dispatched, so this pass was not independent of the author's session; that loss of independence is recorded here as the autonomous defaults require.

Step 4b: the engine found two changed bash blocks in each of `qa-task/SKILL.md` and `qa-story/SKILL.md` and one in the develop-bug verify-loop doc, all refused as mutating (they call `tracker-comment.js` and `gh`). The new fragment in them (qa-cycle.sh `--path gate`, `gate-open-count.js`, `stakeholder-summary-cli.js`) was executed by hand against task 213's real gate dir under bash and zsh: cycle 2, open 0, lead reads "The checks found no problems."; with `open_count=2` it reads "The checks passed, with 2 minor points recorded below." An unreadable gate printed nothing on stdout and exited 1.

CI on 33c58de0c3e8: pending (the `test` job had not finished; every other check passed).

---

## New Findings This Cycle

Not a re-review. Finding recorded in the gate: T275-QA-1 (low).

---

## Implementation Verification

| Phase                         | Status | Test Result | Notes                                                                 |
| ----------------------------- | ------ | ----------- | --------------------------------------------------------------------- |
| Phase 1: The count slot       | PASS   | Verified    | Slot, templates, helper, five sites, feed guard, catalogue doc        |
| Phase 2: The remedy status    | PASS   | Verified    | `remedy:` in qa-task, qa-story, qa-gate; create-task § 3.5 line       |
| Phase 3: Evidence and sweep   | PASS   | Verified    | Mutations, bundle `--check` clean, validate clean, CHANGELOG cites    |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion                                                                 | Evidence                                                                                                  | Status     |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------- |
| PASS with `open_count` 2 reads "passed, with 2 minor points"; 0 or absent reads bare; CONCERNS/FAIL unchanged | `stakeholder-summary.test.mjs` (4 new tests, incl. control for other verdicts)         | PASS       |
| Wrong-stage slot fails coverage; a site omitting the slot fails the feed guard | `comment-slot-coverage.test.mjs` Guard B and Guard D (non-vacuity floor 5, synthetic control)           | PASS       |
| Helper counts open entries, ignores closed and `recommendations:`, `[]` is 0 | `gate-open-count.test.mjs` (11 tests); 997 committed gates compared with a YAML parser, 0 mismatches   | PASS       |
| Mutation: remove the count branch, the PASS-with-count test turns red     | Development run (1 fail of 60); see Code Review                                                           | PASS       |
| A PASS comment with open lows never says "found no problems"              | Test "a PASS lead counts open minor points instead of saying there are no problems"                       | PASS       |
| All three gate-writing skills describe `remedy:`; create-task treats unverified as a claim | `git grep -c "remedy:"`: qa-gate 2, qa-story 4, qa-task 4; `git grep -n "unverified" skills/create-task/SKILL.md` hits line 577 | PASS       |
| Missing field and missing slot render as before                           | Existing fixtures pass unchanged in `ci:fast`                                                              | PASS       |
| `npm run bundle -- --check` 0 problems; `CI=true` suite passes            | Bundle: 129 skills, 0 problems. `ci:fast` exit 0 on .249                                                   | PASS       |
| `quick_validate.py` passes for qa-task, qa-story, create-task             | All three (and qa-gate, develop-bug) pass                                                                  | PASS       |
| Past gates untouched                                                      | `git diff --stat` over `docs/` lists only this task's files                                                | PASS       |
| `CI=true npm test` wall time within 10% of `develop` (five alternating runs) | Not run as specified. Bounded: added tests take 0.4 s against a 685 s run (0.06%)                       | UNVERIFIED |

The unverified row is gate finding T275-QA-1 (low).

CHANGELOG: `changelog-cites.sh task.275` exits 0, "cites (task 275)". Criteria drift: clean.

---

## Breaking Changes Validation

None. A gate without `remedy:` and a site without `open_count` render as before.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (1)

- T275-QA-1: the wall-time criterion was bounded, not measured as specified (see the criteria table).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
Added tests 0.4 s. The helper is one linear pass over a gate file.

### Reliability — PASS
An unreadable gate, a missing `top_issues:` key or a flow-style list exits 1 with nothing on stdout, and every call site stops on it with `|| exit 1`. No path defaults a count to 0.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- The helper takes one local path argument, reads it, and executes nothing. Boundary recorded as `internal`: its only input is a gate this pipeline writes and no corpus sink models one. The criteria signal `never` governs rendered lead text, not an input gate.

### Maintainability — PASS
One definition of "open" (the helper) and one of which stages read the count (the templates, from which Guard D derives its stage list).

---

## Code Review

Inline pass over the diff (45 files; 4 hand-written source files, the rest bundled copies, docs and tests).

**Correctness bugs (0).** Probes run:

- Helper against 997 committed gates versus a YAML parser (status absent or not in the closed set counts as open): 997 compared, 14 skipped (no parsable `top_issues`), 0 mismatches. An earlier sweep covered 400 files and only proved the helper did not crash; this one proves the counts.
- Indentation variants (4-space list, unindented list, nested `evidence:` map with its own `status:`), a quoted and a commented status, `top_issues: [] # none`, CRLF: covered by tests or by the sweep.
- Template reads: `gateSentence` takes `s.verdict, s.open_count` as arguments, so the source-scan test (`slotsReadBy`) still sees both slots.

**Cleanups (0).**

mutation-proven: count branch disabled in `stakeholder-summary.js` → "a PASS lead counts open minor points instead of saying there are no problems" → covered
mutation-proven: `--slot open_count` removed from the qa-task issue-comment site → "Guard D — every shipped qa-gate / qa-cycle site feeds open_count" → covered
mutation-proven: closed statuses emptied in `gate-open-count.js` → four tests in `gate-open-count.test.mjs` (closed/resolved/fixed…, quoted status, nested status, task 213 shape) → covered

All three mutations were applied to a snapshot, then restored with `cmp` printing nothing; `git status` shows only the implementation report modified.

---

## Regression Testing

`ci:fast` on the LAN server with `CI=true`: exit 0, including the existing `qa-cycle`, `stakeholder-summary` and `comment-slot-coverage` suites and the bundle freshness check.

---

## Test Artifacts

### Files Reviewed
`shared/resources/gate-open-count.js`, `shared/resources/stakeholder-summary.js` and its `.md`, the three test files, `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-gate/SKILL.md`, `skills/create-task/SKILL.md`, the develop-bug verify-loop reference.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/gate-open-count.test.mjs shared/resources/tests/stakeholder-summary.test.mjs shared/resources/tests/comment-slot-coverage.test.mjs
npm run test:remote            # ci:fast on .249, exit 0
npm run bundle -- --check      # 129 skills, 0 problems
python skills/create-skill/scripts/quick_validate.py skills/<each changed skill>
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Decide whether T275-QA-1's criterion stands as written or is amended to the bound.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every functional and quality criterion is verified by execution and mutation; one low point is open.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.275.qa.1.gates-say-what-they-know.md`
**Gate File**: co-located at `task.275.gate.1.gates-say-what-they-know.yml`
**Next Steps**: finalise
