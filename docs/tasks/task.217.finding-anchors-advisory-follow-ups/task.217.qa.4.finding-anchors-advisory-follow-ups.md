# QA Report: Task 217 - Finding-anchors advisory follow-ups (cycle 4)

**Task**: [Link to task document](./task.217.finding-anchors-advisory-follow-ups.md)
**Gate File**: [task.217.gate.4.finding-anchors-advisory-follow-ups.yml](./task.217.gate.4.finding-anchors-advisory-follow-ups.yml)
**Previous Report**: [task.217.qa.3.finding-anchors-advisory-follow-ups.md](./task.217.qa.3.finding-anchors-advisory-follow-ups.md)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-24
**Testing Completed**: 2026-10-24
**Gate Status**: PASS

---

## Executive Summary

Cycle 4 re-reviewed the 13 files changed since gate 3's head (`0e350ce2`): the Step 5 prose and block
comment, the CHANGELOG bullet, and the Step 5 block test. QA3-1 is fixed. The claim now matches the
block, and the test runs the block exactly as shipped. Three mutations are covered, every probe
control engages (73 executed, 0 escaped), and the diff review raised no high-confidence bug. Its
three findings are advisory, and one of them is pre-existing.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-217-QA3-1: the Step 5 block over-claims cwd independence, and its test swaps the path | medium | ✅ FIXED | SKILL.md Step 5 prose and comment scoped. The test installs the checker at its bundled path and runs the block unchanged. From `skills/` the block HALTs ("finding-anchors produced no apply list"), and the checker's list matches the root's (run by hand). Mutations 3/3 `covered`. BUG-5 closed |

---

## New Findings This Cycle

None promoted. The diff review returned three advisory findings, all with anchors `ok`:

- **[medium/medium-confidence]** `skills/review-code/SKILL.md:247` (CR-1): the Step 4.3 fallback reads
  `$SUMMARY_FILE` with no writer in the block. This is **pre-existing**: the merge base carries the
  same `cat "$SUMMARY_FILE"` unbound (line 213 there), and gate 2 recorded it as CR-4. It goes to
  `recommendations.future`.
- **[cleanup]** `skills/review-code/SKILL.md:206` (CR-2): `select($m != null)` never filters, because
  jq `capture` yields nothing on a non-match.
- **[cleanup]** `skills/review-code/SKILL.md:177` (CR-3, carried from gate 3): the `${PR_NUMBER:?…}`
  guard cannot fire on the literal placeholder.

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on the feature branch with open PR #745

### Testing Approach

- [x] Automated Testing (unit, block, eval)
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review (scoped diff, one Explore subagent)

### Review Methodology

Direct tools plus one read-only Explore code reviewer (re-review). The reviewer was dispatched at
06:02:35Z and returned with `duration_ms` 110695.

Re-review scope: files changed since gate 3 (head 0e350ce2ffec; 13 files) — default

`SAFETY_REPROBE=false` (clause 1 is false, gate 3 has no HIGH, and it is not FAIL).

Step 4b: `skills/review-code/SKILL.md`. 2 changed blocks, both `mutating`, so the result is
`changed-blocks-not-executed`. These blocks are measured by the `fence:` probes and the committed
block test. File level: `no-executable-blocks`, with 7 mutating blocks. Shells: bash only.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Engine — refuse non-object findings, stamp annotated files | PASS | Verified | Unchanged this cycle |
| Phase 2: `--inline` blocks — grammar, stamp, verdicts | PASS | Verified | Unchanged this cycle; CR-2 cleanup advisory |
| Phase 3: review-code `--staged --fix`, population guard, changelog | PASS | Verified | QA3-1 fixed |

**Overall Phase Completion**: 3/3 passed.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| A non-object finding is refused as `usage` | PASS | `finding-anchors.test.mjs` usage tests |
| The `--inline` blocks post exactly the anchor the checker verified | PASS | Stamp tests in both skills, plus the selector grammar test |
| review-code `--inline` and `--fix` never edit an unchecked file | PASS | The `--fix-list` tests, and the Step 5 block test running the shipped block from the root and from `sub/`. Mutations covered |
| Verdict restatements held to the engine | PASS | `finding-anchors-blocks.test.mjs` |
| Dispatcher population derived from the tree | PASS | Unchanged |
| `--index` outside-a-work-tree test passes with TMPDIR in a checkout | PASS | Unchanged since gate 3 (65/65) |

---

## Breaking Changes Validation

The two breaking changes are unchanged since gate 3: non-object findings are refused, and the
guards and `--fix-list` require the checker's stamp. Both are documented with a migration path.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0. Three advisory review findings are listed above.

---

## NFR Assessment

### Performance — PASS
No change on the hot path.

### Reliability — PASS
The block fails closed from a subdirectory, as documented, and the test pins that. TMPDIR=/tmp 18/18.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 73 (`task.217.qa.4.security.run.json`, `totals.executed`), escaped 0
- `boundary: true`. Three `fence:` controls all engage: Step 4.2 at 19/19, review-pr `--inline` at
  31/31, and Step 5 at 23/23 on the edited block.

### Maintainability — PASS
The block test runs the shipped block with no path rewriting.

---

## Code Review

Reviewed: 13 files in the scoped patch, with the 2 code-bearing files read in full. The anchor check
gives `finding-anchors: ok`, 3/3 `ok` against `--rev HEAD`.

**Correctness bugs (1):**
- [medium/medium] `skills/review-code/SKILL.md:247`: Step 4.3 reads `$SUMMARY_FILE` unbound. →
  Bind `SUMMARY_FILE="{summary-file}"` with a `[ -s ]` HALT. Provenance: `pre-existing`, since the
  merge base has the same unbound read, and its confidence is medium, so it is advisory.

**Cleanups (2):**
- `skills/review-code/SKILL.md:206`: `select($m != null)` is dead. → Drop it and fix the comment.
- `skills/review-code/SKILL.md:177`: the `PR_NUMBER` guard cannot fire. → Use a digits check.

Mutation proofs, re-run by QA (snapshot and restore, with a green baseline between each):

```markdown
mutation-proven: Step 5 resolves the checker from the top level (block works from sub/) → "Step 5 skips a finding whose working tree differs…" → covered
mutation-proven: Step 5 names the repo-only path skills/review-code/references/… → same test → covered
mutation-proven: Step 5 ignores the checker exit → same test → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| finding-anchors, review-code, review-pr suites + checker-blocks eval | PASS (255/255) |
| `npm run validate -- skills/review-code/` | PASS |
| qa-fix's fast gate at `d44191a8` | PASS (6273/6287, 0 fail, 14 skipped) |

---

## Test Artifacts

### Files Reviewed
`skills/review-code/SKILL.md`, `skills/review-code/tests/review-code.test.js`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/finding-anchors.test.mjs skills/review-code/tests/review-code.test.js skills/review-pr/tests/ evals/shared/tests/finding-anchors-blocks.test.mjs   # 255 pass
TMPDIR=/tmp command node --test skills/review-code/tests/review-code.test.js      # 18 pass
npm run validate -- skills/review-code/                                          # ✓
command node shared/resources/security-probe.mjs --sink filename --slot '{findings-json}' --entry 'fence:…' --cases-file … --record task.217.qa.4.security.run.json   # ×3, 73 executed, 0 escaped
(cd skills && bash -c "<Step 5 block as shipped>")                              # rc=1, HALT, nothing applied
```

### Coverage Report
Not measured (`node --test` without instrumentation).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1 (pre-existing): bind `SUMMARY_FILE` in Step 4.3.
2. CR-2 and CR-3: the two selector and guard cleanups.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every finding from cycles 1–3 is fixed and held by a committed test. No open finding remains.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.217.qa.4.finding-anchors-advisory-follow-ups.md`
**Gate File**: co-located at `task.217.gate.4.finding-anchors-advisory-follow-ups.yml`
**Next Steps**: Step 5c PR conformance review (`/review-pr`), then `/finalise`.
