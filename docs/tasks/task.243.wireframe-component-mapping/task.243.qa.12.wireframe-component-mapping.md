# QA Report: Task 243 - Link Wireloom wireframe nodes to the project's UI components

**Task**: [task.243.wireframe-component-mapping.md](./task.243.wireframe-component-mapping.md)
**Gate File**: [task.243.gate.12.wireframe-component-mapping.yml](./task.243.gate.12.wireframe-component-mapping.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: CONCERNS

---

## Re-Review Context

QA cycle 12 of 13. This is a re-entry after `/finalise` DoD run 3 found U+2028/U+2029 accepted in a
signature or label (9 low probes). It reviews the fix, `295974a5`. One `LINE_TERMINATOR` constant
now holds ECMAScript's whole LineTerminator set, and `parsePattern` and `record`'s per-field check
both use it. The test gains the probe inputs, and the eight bundled copies are updated.

| Previous issue | Source | Status |
| --- | --- | --- |
| DoD run 3 security gap: U+2028/U+2029 accepted by `parsePattern`, `record --signature` and `--label` | `task.243.dod.3` | ✅ FIXED. All 9 reproduced cases now score as required (114 executed, 0 reproduced); both arms mutation-proven at QA |
| TASK-243-CR11-1 (low): `--by`/`--date` odd-backtick refusal is stricter than needed | gate 11 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR11-2 (low): comment gives the wrong reason for `--by`/`--date` | gate 11 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR8-1 (low): `existsSync` assertions in the resolve unset test cannot fail | gate 8 | ❌ NOT FIXED (deferred, carried) |
| TASK-243-CR7-1 (low): no-jq test asserts `/HALT/` only | gate 7 | ❌ NOT FIXED (deferred, carried) |

---

## New Findings This Cycle

- **[medium]** `shared/resources/wireframe-map.js:215`: `signatureOf` writes attribute values
  unescaped, but `parsePattern` ends the list at `}` and splits it on `,`. `value="1,500"` parses
  back as `value: "1"`, and `placeholder="a}b"` does not parse. Reproduced by QA. Promoted as
  TASK-243-CR12-1, [bug.15](./task.243.bug.15.attribute-value-signatures-do-not-round-trip.md). →
  one encoding for both, plus a self-match test.
- **[low]** `wireframe-map.js:110`: an unreadable config reads as unset (CR12-2, advisory).
- **[low]** `wireframe-map.js:700`: the candidate filter matches by substring (CR12-3, advisory).
- **[low]** `wireframe-map.js:621`: CRLF files are rewritten with LF (CR12-4, advisory).

---

## Executive Summary

The DoD run 3 fix closes the class: a value is refused if it holds any character that
`unquote`'s `.` cannot cross, not only the two new ones. Re-running the DoD's own 114-case plan
against the fix reproduces nothing, and all 11 controls now engage. Reverting either arm turns its
named test red. The reviewer read the engine in full and found a defect older than this fix. A
node's signature does not survive an attribute value that holds a comma or a brace, and the
grammar's own `value="1,500"` example is one. Such a node never matches the row recorded for it.
That is a medium, promoted under `code_review_blocking`, so the gate is CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (TASK-243-CR12-1 fixed and re-gated)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#785, head `295974a5`)

### Testing Approach

- [x] Automated Testing (wireframe suite; fast gate on this head)
- [x] Regression Testing
- [x] Security Review (boundary probe, measured)
- [x] Code Review (Step 3b, Explore subagent)

### Review Methodology

Re-review, direct tools, plus one Explore reviewer for Step 3b. Pipeline run with
`code_review_blocking=true`.

Re-review scope: files changed since gate 11 (head 97035bae0cfe; 48 files) — default.
`SAFETY_REPROBE=false`: clause 1 computed false (gate 11 security PASS, measured), and clauses 2–3
do not hold (gate 11 PASS, no high). The DoD's security gap was still probed in full; see Security.

Reviewer dispatched 17:37:06Z; returned in 123 s (`duration_ms` 123254). All 6 anchors `ok`.

CI on 295974a5ee2b: pending.

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` changed since gate 11.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: engine | PASS | Verified | LINE_TERMINATOR fix verified |
| Phase 2: map read/write | CONCERNS | Verified | CR12-1: signatures with `,` or `}` in a value do not round-trip |
| Phase 3: skill hooks | PASS | Verified | Unchanged since gate 11 |
| Phase 4: bundling | PASS | Verified | 8 copies match the source; `bundle:check` clean |
| Phase 5: docs | PASS | Verified | Unchanged since gate 11 |

**Overall Phase Completion**: 5/5 delivered; one with a finding.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| SC-1 no `ui:` block → unset, nothing written | PASS | `wireframe-map.test.mjs:176` |
| SC-2 ensure seeds catalogue and map, second run unchanged | PASS | `wireframe-map.test.mjs:192` |
| SC-3 catalogue gains rows only for missing exports | PASS | `wireframe-map.test.mjs:215` |
| SC-4 resolve applies the most specific matching row | CONCERNS | `wireframe-map.test.mjs:382` holds for the tested shapes; CR12-1 shows a node whose own signature does not match it |
| SC-5 record adds or replaces a link | PASS | `wireframe-map.test.mjs:430`; refusal tests cover every LineTerminator |
| SC-6 eight skills carry hook, engine, procedure, parser | PASS | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:38` |
| #7 docs | PASS | `evals/shared/tests/wireframe-mapping-hooks.test.mjs:409` |

---

## Breaking Changes Validation

None. The change refuses two more characters in values that could never be matched.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: An attribute value with a comma or brace breaks its own signature**
- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.243.bug.15.attribute-value-signatures-do-not-round-trip.md](./task.243.bug.15.attribute-value-signatures-do-not-round-trip.md)
- **Observation**: `listNodes` → `parsePattern` gives `value: "1"` for `value="1,500"`; the self-match returns `null`.
- **Impact**: the `record` → `resolve` loop never converges for such a node.
- **Recommendation**: one attribute-value encoding shared by `signatureOf` and `parsePattern`, and a self-match test over `listNodes` output.
- **Priority**: P2

Provenance: `wireframe-map.js` is new on this branch, so the defect cannot be pre-existing. It sits
in SC-4's scope.

### LOW Severity Issues (3)

CR12-2 (unreadable config reads as unset), CR12-3 (substring candidate filter), CR12-4 (CRLF
rewritten as LF). All three are advisory, at medium confidence, under `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 3

---

## NFR Assessment

### Performance — PASS
One precompiled regex test per value.

### Reliability — PASS
A refused `record` leaves the map byte-identical, and the refusal tests assert this after every case.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 114 (escaped: 0)
- `boundary: true`. The DoD run 3 plan (`gen-dod3-plan.mjs`, unchanged inputs) was re-run as
  `task.243.qa.12.security.run.json`. It has 11 controls: the Step 2 and Step 3 fence guards, the
  `parsePattern` signature gate, and `record --signature/--label/--component/--variant/--hint/--notes/--by/--date`.
  All 11 engage. The 9 cases that reproduced at DoD run 3 are in the plan and now score as
  required, so the probe is calibrated on the defect this cycle fixed.
- CR12-1 is an identity defect, not a refusal gap. No probe sends a signature that `signatureOf`
  produced, which is why the probe could not see it.

### Maintainability — PASS
One named constant serves both checks. The test builds U+2028/U+2029 with `String.fromCharCode`, so
no invisible character is in the source.

---

## Code Review

Advisory, except where `code_review_blocking=true` promotes a high-confidence bug.

**Correctness bugs (4):**
- [medium/high] `shared/resources/wireframe-map.js:215`: `signatureOf` writes values unescaped; `,` and `}` break the signature's own parse → shared encoding plus a self-match test. **Promoted: TASK-243-CR12-1.**
- [low/medium] `shared/resources/wireframe-map.js:110`: an unreadable `skills-config.yaml` returns null like a missing one → null only on ENOENT.
- [low/medium] `shared/resources/wireframe-map.js:700`: substring component match; a missing catalogue section disables the filter → exact match; tell unreadable from empty.
- [low/medium] `shared/resources/wireframe-map.js:621`: CRLF files rejoined with LF → keep the file's line ending.

**Cleanups (2):**
- `shared/resources/wireframe-map.js:770`: `record` re-finds the header `readMap` already found → return it from `readMap`.
- `shared/resources/wireframe-map.js:754`: `record` calls the whole `ensure` to create a missing map → a map-only helper.

Mutation proofs (QA, scratch worktree at `295974a5`):

```markdown
mutation-proven: parsePattern LINE_TERMINATOR → /[\r\n]/ → "record refuses a signature with a line break and leaves the map unchanged" → covered
mutation-proven: record per-field LINE_TERMINATOR → /[\r\n]/ → "record refuses a line break in any written field, and a backtick in a code cell" → covered
```

2 of 2 proven. Baseline 19/19, each mutant 18/19, restored 19/19. The working tree was untouched.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `shared/resources/tests/wireframe-map.test.mjs` | PASS 19/19 |
| Fast gate (`npm run ci:fast`, symlink aside) at `295974a5` | PASS: 6842 tests, 0 failed |
| `npm run validate` × 8 changed skills | PASS (all exit 0) |
| `npm run bundle:check` | PASS (128 skills, 0 problems) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/wireframe-map.js`, `shared/resources/tests/wireframe-map.test.mjs`, 8 ×
`skills/*/references/wireframe-map.js`, the task.243 DoD run 3 artefacts.

### Test Commands Executed
```bash
command node --test shared/resources/tests/wireframe-map.test.mjs
bash fast-gate.sh fast-gate-dod3.log     # npm run ci:fast with .agents/skills moved aside
npm run -s validate -- skills/<s>/       # x8
npm run -s bundle:check
command node .agents/skills/finalise/references/security-probe-plan.mjs --plan qa12-plan.json \
  --record docs/tasks/task.243.wireframe-component-mapping/task.243.qa.12.security.run.json \
  --cases-base docs/tasks/task.243.wireframe-component-mapping/task.243.qa.12.security.cases --repo-root . --json
```

### Coverage Report
Not measured; the repository runs `node --test` without coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. TASK-243-CR12-1 / bug.15: attribute values must round-trip through their own signature (P2).

### Short-term Actions (Non-Blocking)
1. CR12-2 to CR12-5, and the carried CR11-1, CR11-2, CR8-1 and CR7-1.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: the DoD fix is complete and proven; one new medium, found by reading the whole engine, is promoted.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-243-CR12-1 fixed and re-gated.

---

**QA Report**: co-located at `task.243.qa.12.wireframe-component-mapping.md`
**Gate File**: co-located at `task.243.gate.12.wireframe-component-mapping.yml`
**Next Steps**: `/qa-fix` cycle 12 for CR12-1, then gate 13 (the last of the 13-cycle budget).
