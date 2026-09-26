# QA Report: Task 152 - finalise: bug-mode gaps path and co-located artifacts in 8a and link guard

**Task**: [Link to task document](./task.152.finalise-gaps-path-and-artifact-links.md)
**Gate File**: [task.152.gate.2.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.2.finalise-gaps-path-and-artifact-links.yml)
**Previous Gate**: [task.152.gate.1.finalise-gaps-path-and-artifact-links.yml](./task.152.gate.1.finalise-gaps-path-and-artifact-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-26
**Testing Completed**: 2026-09-26
**Gate Status**: CONCERNS

---

## Executive Summary

All six cycle-1 findings are fixed. Each fix was mutation-proved, and CI on `b4c9c8b7` is green
(link-check, test, validate, shellcheck). The cycle-2 refute pass found two new medium defects.
First, the bug-mode "no gap lines" refusal runs at 8.5, after two writes that cannot be undone.
Second, the shared artifact set does not match the unprefixed `sprint-review-summary.md` that
finalise writes. There is no HIGH finding.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Re-Review Context

| Prior finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| QA-2 report quote renders a dead link | high | FIXED | quote fenced; CI link-check + test PASS on `b4c9c8b7`; unfencing → artifact corpus test red (F5) |
| CR-1 qa-story stages an unwritten gate | medium | FIXED | report staged alone; re-adding the gate → writer-sites test red (F4, QA re-run: covered) |
| CR-2 bug-mode 8.5 post-condition vacuous | medium | FIXED (but see new CR-1) | `GAP_COUNT=0` refused; removing it → zero-gap test red (F1, QA re-run: covered) |
| QA-1 two artifact regexes disagree | medium | FIXED (but see new CR-2) | one exported regex, imported by the guards; removing `sprint-review-summary` → two tests red (F3) |
| CR-5 8.3 guards only DOC_FILE | low | FIXED | four values bound and guarded; executed test in bash + zsh (F2) |
| CR-7 wall-clock assertion | low | FIXED | assertion removed |

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (fast gate at `b4c9c8b7`: 4,268 tests, 4,267 pass, 0 fail; CI green)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#495, OPEN)

### Testing Approach

- [x] Automated Testing
- [x] Regression Testing (CI on the head)
- [x] Security Review (probe re-run)
- [x] Code Review (independent refute pass)

### Review Methodology

This is a re-review, and cycle 2 is a refute pass: the whole branch diff (1,601 lines) went to an
independent subagent told to find the false claim, starting from cycle 1's fixes and reviewing them
in combination. Direct tools were used for everything else.

```
Re-review scope: unscoped (cycle 2 refute pass — whole branch diff)
```

Step 4b ran on `finalise` and `qa-story`, the two `SKILL.md` files cycle 1 changed. On `finalise`,
with `DOC_FILE` bound, one block ran under bash and zsh with no findings. On `qa-story` every block
was classified placeholder or mutating: zero executed, reported by the engine as
`zero-blocks-executed`. None of those placeholder blocks is new. The new blocks in both files are
executed by the committed tests in bash and zsh.

The fast gate was not re-run by QA. `b4c9c8b7` is the tree the 5b fast gate ran on (green, with
the symlink moved aside), and CI's `test` job passed on the same commit.

---

## New Findings This Cycle

- **[medium]** `skills/finalise/SKILL.md:2339` — the zero-gap refusal is ordered after 8.1's GAPS
  fill and 8.3's Status History append. 8.3 also takes GAP_TOTAL and DOD_NAME as placeholders
  instead of deriving them. → Count and refuse inside 8.1 before the fill, and derive both values
  in 8.3. (CR-1)
- **[medium]** `shared/resources/finalise-fix-and-recheck.mjs:77` — `sprint-review-summary.md` is
  written with no id prefix (112 tracked files; 5 legacy prefixed ones). `isCoLocatedArtifact` and
  the artifact walk see only the prefixed form. → Admit the exact unprefixed basename in the
  document directory, and test it on the real filename. (CR-2)
- **[low]** `skills/finalise/SKILL.md` 8.3 and the `status-history.js` header advertise an
  unreachable `unchanged`. → Say that a repeat appends. (CR-3)

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: fill helper | PASS | unchanged since cycle 1 |
| Phase 2: Step 8 rows + markers | CONCERNS | CR-1 (ordering of the zero-gap refusal; 8.3 self-reported values) |
| Phase 3: status-history.js | CONCERNS | CR-3 (documented `unchanged` unreachable) |
| Phase 4: evaluator | CONCERNS | CR-2 (unprefixed sprint-review summary) |
| Phase 5: 8a + corpus guard | CONCERNS | CR-2 (walk misses the unprefixed file) |
| Phase 6: writer sites | PASS | CR-1 of cycle 1 fixed |
| Phase 7: docs + validation | PASS | CI green |

---

## Success Criteria Verification

Unchanged from cycle 1 except where noted. CI is green, which resolves the one FAIL. The 8.5
bug-mode criterion now holds for a DoD without gap lines. The claim "the evaluator and the corpus
guard check what CI checks" does not hold for the unprefixed sprint-review summary (CR-2).

---

## Breaking Changes Validation

**Overall Breaking Changes Assessment:** PASS. The cycle is unchanged since cycle 1.

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**CR-1 — the zero-gap refusal comes after two irreversible writes.** Severity MEDIUM, Reliability.
Recommendation: count the gap lines and refuse zero in 8.1, before the fill. Have 8.3 derive
GAP_TOTAL and DOD_NAME from the DoD file.

**CR-2 — the shared artifact set misses the filename finalise writes.** Severity MEDIUM,
Maintainability. Recommendation: admit the unprefixed `sprint-review-summary.md` in the document
directory, in both the evaluator and the artifact walk.

### LOW Severity Issues (1)

- CR-3 — an unreachable `unchanged` is documented as a reason.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS

The artifact walk takes 2–8 s depending on runner load. No timing gate remains in the test.

### Reliability — CONCERNS

CR-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 41 (from `task.152.qa.2.security.run.json` `totals.executed`)
- The probe was re-run because `isCoLocatedArtifact`'s regex changed this cycle. The cases were
  cycle 1's 37 plus four sprint-review-summary cases (one legitimate prefixed, and hostile
  other-stem, other-directory and `.yml`). Verdict `engages`: 0 reproduced, 0 over-blocked. CR-2 is
  a legitimate file the predicate refuses (over-blocking of an input no case named), not an escape.

### Maintainability — CONCERNS

CR-2.

---

## Code Review

Independent refute pass over the whole branch diff (13 files, 1,601 lines).

**Correctness bugs (2):**

- [medium/high] `skills/finalise/SKILL.md:2339` — the zero-gap refusal comes after 8.1 and 8.3 have already written, and 8.3's values are self-reported → count and refuse in 8.1 and derive in 8.3. **Promoted: CR-1.**
- [medium/high] `shared/resources/finalise-fix-and-recheck.mjs:77` — the unprefixed `sprint-review-summary.md` is outside the shared set → admit that exact basename. **Promoted: CR-2.**

**Cleanups (1):**

- `shared/resources/status-history.js:278` — `unchanged` is documented but cannot be reached → document the append. **Promoted as low: CR-3.**

**Boundary rule:** `boundary: true`, `isCoLocatedArtifact`, `probes_executed: 41`.

**Mutation spot checks (QA):**

mutation-proven: drop the bug-mode `GAP_COUNT -eq 0` refusal → 8.5 zero-gap test (bash, zsh) → covered
mutation-proven: re-add the gate to qa-story's `git add` → writer-sites test → covered

---

## Regression Testing

CI on `b4c9c8b7`: link-check, test, validate, shellcheck and the branch policy all PASS.

---

## Test Artifacts

### Test Commands Executed

```bash
gh pr checks 495                                                   # all pass on b4c9c8b7
node .agents/skills/qa-task/references/security-probe.mjs --sink path \
  --entry '.claude/state/t152-probe-wrapper.mjs#admitsArtifact' \
  --cases-file .claude/state/t152-probe-cases-2.json --record task.152.qa.2.security.run.json --json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md \
  --bind DOC_FILE=<task doc> --copy-as docs:docs --json
git ls-files 'docs/**/sprint-review-summary.md' | wc -l            # 112
git ls-files 'docs/**/*.sprint-review-summary.md' | wc -l          # 5
```

### Coverage Report

Not measured (no coverage flag in `node --test`). Coverage is argued per criterion through the
executed and mutation-proved tests.

---

## Recommendations

### Immediate Actions (Blocking)

1. CR-1, CR-2 (P1); fold in CR-3.

### Short-term Actions (Non-Blocking)

1. Carried from gate 1: CR-3 (bare engine paths in finalise), CR-4 (sync-jira-bug casing), CR-6.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings remain and CI is green. Two medium findings stand.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed.

---

**QA Report**: co-located at `task.152.qa.2.finalise-gaps-path-and-artifact-links.md`
**Gate File**: co-located at `task.152.gate.2.finalise-gaps-path-and-artifact-links.yml`
**Next Steps**: `/qa-fix` cycle 2
