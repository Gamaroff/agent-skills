# QA Report: Task 118 - review-security's strongest verdict rests on a probe count the agent types, not one the engine emitted

**Task**: [Link to task document](./task.118.probes-executed-from-engine.md)
**Gate File**: [task.118.gate.2.probes-executed-from-engine.yml](./task.118.gate.2.probes-executed-from-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-17
**Testing Completed**: 2026-09-17
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle-2 re-review. All three cycle-1 findings are **FIXED** and each fix is mutation-proven against its own test. The full-diff refute pass then found that the run record's merge is last-writer-wins under concurrent `--record` runs — reproduced by QA (three parallel probes → one surviving control), which is an undercount in the artefact this task made authoritative — plus two low contract gaps in the same functions (a null control element crashes `--emit-block` outside the exit-2 mapping; `yamlStr` leaves YAML-typed scalars bare). No HIGH; one MEDIUM, two LOW, all high-confidence, all gating.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — merge after CR2-1..3 close

---

## Re-Review Context

| Prior finding | Status | Verification |
| --- | --- | --- |
| CR-1 — review-security command omits `--repo-root` (bug 1) | **FIXED** | `grep -c repo-root` → 2 in the prompt, 2 in SKILL.md, 2 in the bundled copy. Population guard `every shipped security-probe invocation … passes --repo-root` green; QA mutation: deleting the §4 flag line reds it. Bug 1 → Closed. |
| CR-2 — `emitBlock` trusts file `totals`; no-totals record throws | **FIXED** | `evidenceOf({controls:[], totals:{executed:12}})` → `reasoned`; `{version:1,controls:[]}` → exit 2 "not a version-1 record". Mutations: dropping the totals guard reds the corrupt-record test; trusting file totals reds the evidenceOf-floor test. |
| CR-3 — `--repo-root` test passes for `entry-not-probeable`, prose says "escape" | **FIXED** | Nested copy → `{verdict: unverifiable, reason: entry-not-probeable}`, asserted by the test; the four wording sites now read "resolves under the skill dir, cannot be imported". |
| CR-4/5/6 + `emitBlock(null)` (advisory) | FIXED | `#foo` / `@x:1` quoted; every operand flag exit 2 on its own (mutation: removing the check reds the per-flag test); `--mode sideways` exit 2 in probe mode; null path routes through `evidenceOf`. |

**Re-review scope**: cycle 2 — whole branch diff, **refute pass** (`REFUTE_PASS=true`, `SAFETY_REPROBE=false` — gate 1 security axis `OK reasoned`).

---

## New Findings This Cycle

- **[medium]** `shared/resources/security-probe.mjs:616` — `recordRun` is an unlocked read→merge→rename; concurrent runs sharing one `--record` lose controls (reproduced: 3 runs → 1 control) → lock the merge, prove with a concurrent-runs test. **Gate CR2-1**, [bug 2](./task.118.bug.2.record-merge-last-writer-wins.md).
- **[low]** `shared/resources/security-probe.mjs:599` — `readRecord` accepts `{controls:[null]}`; `totalsOf` throws from `emitBlock` outside the exit-2 try (verified: exit 1, stack trace); a string `executed` concatenates → validate each control. **Gate CR2-2.**
- **[low]** `shared/resources/security-probe.mjs:658` — `--name 123` / `--call-site true` render as int/bool (verified) → quote YAML-typed scalars. **Gate CR2-3.**
- cleanups: CR2-4 record validated only after the probe run (fail-late, misworded); CR2-5 totals requirement is now dead validation with a stale test comment; CR2-6 prompt severity table restates `SEVERITY_BY_VERDICT` untied; CR2-7 temp file left on rename failure.

---

## Testing Scope

### Prerequisites Verified
- [x] Task document complete; 4/4 phases; tests passing (`npm run ci:fast` 3384 / 3383 / 1 skipped / 0); breaking change documented; PR #418 OPEN at `0fd2ab10`.

### Review Methodology

Standard mode, re-review. Direct tools for verification of the three prior findings and the cycle-1 fix diff (`a7b0c973..HEAD`: 19 files, +910/−225, mostly bundles); **one read-only Explore subagent** for the Step 3b refute pass over the whole branch diff (7,796 lines; sources named, bundled copies skipped), returned in 4m03s with 7 findings, three of which QA reproduced.

**Step 4b:** the cycle-1 diff changes no fence (0 `+/-` fence lines across `SKILL.md` / `shared/resources/*.md`; the §4 command block gained one continuation line inside an existing fence). Unbound runs over the three security docs: 1 block each, `mutating` → `no-executable-blocks`, information. Cycle-1's bound QA-skill executions stand.

**Boundary rule:** `boundary: false`, `probes_executed: 0`, `evidence: reasoned` — unchanged; the cycle-1 diff adds a stricter record schema and parse-time operand checks, neither an accept/reject boundary over untrusted input.

**Platform variance:** n/a for the cycle-1 diff (no environment-derived value reaches a validator).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the artefact | CONCERNS | Verified with gap | Record + emit + evidence correct in isolation; **merge not concurrency-safe (CR2-1)**; control schema unvalidated (CR2-2); YAML typing (CR2-3). |
| Phase 2: the readers | PASS | Verified | `--repo-root` now at every site; population guard. |
| Phase 2b: qa-story / qa-task 3b | PASS | Verified | unchanged this cycle. |
| Phase 3: the population check | PASS | Verified | 6 tests incl. the new invocation guard. |

**Overall Phase Completion**: 4/4; 1 with a gap (Phase 1, CR2-1).

---

## Success Criteria Verification

| # | Criterion | Status | Notes |
| --- | --- | --- | --- |
| 1 | count and evidence copied from an engine-written record | PASS | — but see CR2-1: under concurrent runs the record itself is incomplete |
| 2 | `measured` cannot appear without a record; contract test fails if it does | PASS | forged totals now `reasoned` |
| 3 | finalise reads the same record | PASS | |
| 4 | population test ≥ 2 sites, all read or allowlisted | PASS | + `--repo-root` guard |
| 5 | obs #10 closes naming this PR | N/A | finalise |

---

## Breaking Changes Validation
Unchanged from cycle 1 — PASS.

---

## Issues Found

### HIGH Severity Issues (0)
None.

### MEDIUM Severity Issues (1)
**Issue: concurrent `--record` runs lose controls** — [bug 2](./task.118.bug.2.record-merge-last-writer-wins.md); observation and repro in the bug; impact: silent undercount in the authoritative artefact; recommendation: lock the merge; P1.

### LOW Severity Issues (2 gating + 4 cleanups)
CR2-2, CR2-3 (above, in `top_issues`); CR2-4..7 cleanups (above).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 6

---

## NFR Assessment

### Performance — PASS
### Reliability — CONCERNS
Merge not concurrency-safe (CR2-1); malformed control element crashes outside the exit-2 mapping (CR2-2).
### Security — PASS
- **Status**: PASS · **Evidence**: `reasoned` · **Probes executed**: 0 (`boundary: false`)
### Maintainability — PASS
Cleanups CR2-5/6/7 noted.

---

## Code Review

From Step 3b — refute pass, **blocking** under `code_review_blocking=true`.

**Correctness bugs (3):**
- [medium/high — QA-reproduced; reviewer rated medium confidence] `shared/resources/security-probe.mjs:616` — last-writer-wins merge → lock. **→ CR2-1**
- [low/high] `shared/resources/security-probe.mjs:599` — null / non-integer control not validated → validate each control. **→ CR2-2**
- [low/high] `shared/resources/security-probe.mjs:658` — YAML-typed scalars bare → quote. **→ CR2-3**

**Cleanups (4):** CR2-4 fail-late record validation and misworded error; CR2-5 dead totals requirement + stale comment; CR2-6 prompt severity table untied from `SEVERITY_BY_VERDICT`; CR2-7 temp file on rename failure.

**Mutation proofs (QA, cycle-1 fixes):**
```
mutation-proven: readRecord totals requirement removed → CLI: a corrupt record is exit 2 (noTotals) → covered
mutation-proven: evidenceOf trusts file totals → `measured` is unrepresentable … evidenceOf never says it on zero → covered
mutation-proven: parse-time operand check removed → CLI: every operand flag rejects a missing or flag-shaped operand → covered
mutation-proven: --repo-root line deleted from §4 → every shipped security-probe invocation … passes --repo-root → covered
```

---

## Regression Testing

| Area | Result |
| --- | --- |
| `npm run ci:fast` | PASS — 3384 tests, 3383 pass, 1 skipped, 0 fail |
| `review-security.test.js` (38) | PASS |
| `probes-executed-population.test.mjs` (6) | PASS |
| Step 4b | no fence changed; 3 docs all-mutating |

---

## Test Artifacts

### Test Commands Executed
```bash
npm run ci:fast
node --test skills/review-security/tests/review-security.test.js evals/shared/tests/probes-executed-population.test.mjs
node $E --sink url-authority --entry … --record $R --name a & node $E … --name c & wait; jq '.controls|length' $R   # CR2-1 repro → 1
echo '{"version":1,"controls":[null],"totals":{}}' > r.json; node $E --emit-block r.json                    # CR2-2 → TypeError, exit 1
```

---

## Recommendations

### Immediate Actions (Blocking)
1. CR2-1 — exclusive lock around read→merge→rename; concurrent-runs test.
2. CR2-2 — validate control elements in `readRecord`.
3. CR2-3 — quote YAML-typed scalars.

### Short-term Actions (Non-Blocking)
1. CR2-4..7.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: prior findings closed and proven; the refute pass surfaced a real concurrency defect in the merge (medium, reproduced) and two low schema gaps in the same functions.
**Quality Score**: 90/100
**Deployment Recommendation**: CONDITIONAL — CR2-1 fixed; CR2-2/3 closed.

---

**QA Report**: co-located at `task.118.qa.2.probes-executed-from-engine.md`
**Gate File**: co-located at `task.118.gate.2.probes-executed-from-engine.yml`
**Next Steps**: `/qa-fix` on CR2-1..3 (cycle 2 of 5), then re-review.
