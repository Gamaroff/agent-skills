# QA Report: Task 274 - QA engines stop passing what they cannot see

**Task**: [Link to task document](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Gate File**: [task.274.gate.2.qa-engines-stop-passing-what-they-cannot-see.yml](./task.274.gate.2.qa-engines-stop-passing-what-they-cannot-see.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Testing Completed**: 2026-11-09
**Gate Status**: FAIL

---

## Executive Summary

Cycle 2 re-reviewed the whole branch as a refute pass with a safety re-probe, because cycle 1 failed on security. The three cycle-1 findings are fixed, each guarded by a committed test that goes red when the fix is reverted. The refute pass found one more high defect: an ANSI-C quoted flag and a line-continuation split still classify as runnable and delete files when run. The two open measurement criteria are met.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (8,100 pass, 2 harness-only failures, same two on develop)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#863)

### Review Methodology

Direct tools plus one read-only Explore reviewer. Re-review scope: unscoped (prior gate failed on security; cycle 2 is a full-branch refute pass), `origin/develop...HEAD`, 6,495 diff lines, reviewer asked to refute and to re-probe the surface. Diff review: code review. Step 4b: ran `qa-execute-snippets.mjs` over `shared/resources/probe-boundary-rule.md` (the cycle-1 template false positive): 0 findings, 1 block refused as `mutating`. CI: not read this cycle (no push since the cycle-1 read; CI is gated once at `/finalise`).

Reviewer timing: dispatched and returned within one `duration_ms` of 55,492.

### Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T274-QA-1 `--fixture-copy` follows a symlinked directory | FIXED | `realpathSync` containment; test red when the check is disabled |
| T274-QA-2 dash-prefixed expansion runnable | FIXED | `A=delete; find docs -$A`, quoted-braced and `$(…)` forms now `mutating`; controls `find docs -name x`, `X=y; find docs/$X -name z` stay `runnable` |
| T274-QA-3 syntax check flags templates | FIXED | `probe-boundary-rule.md`: 0 findings; test red when the slot test or `--` is dropped |

---

## New Findings This Cycle

- **[high]** `shared/resources/qa-execute-snippets.mjs:1871` — ANSI-C quoted flag and backslash-newline split evade the quote-stripped deny-list reading → fold continuations, refuse or decode `$'…'` (T274-QA-4, [bug 4](./task.274.bug.4.ansi-c-quote-and-continuation-evade-deny-list.md)).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1 Owner decisions | PASS | Verified | Recorded in the task document |
| 2 Base scan | CONCERNS | Verified | Quote-variant class still incomplete (T274-QA-4) |
| 3 Syntax check | PASS | Verified | Template skip, `--` guard |
| 4 Probe record key, `--name`, `--fixture-copy` | PASS | Verified | Containment fixed in cycle 1 |
| 5 Status-history row width | PASS | Verified | Width mismatch refused |

**Overall Phase Completion**: 4/5 passed, 1 with a concern.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `CI=true npm test` wall time vs `develop` | within 10% (median of 5 alternating runs) | +4.7% | PASS | develop 228.2 s, head 239.0 s; per-run pairs below |
| task.205-shape cases file | under 100,000 bytes | 8,813 bytes | PASS | The real task.205 cases file (1,588,414 bytes) with its 48 embedded helper copies removed; `wc -c` |
| Base-scan shapes 1 to 4 refused, controls runnable | as written | holds | PASS | 34-case probe: 32 as required |
| `npm run validate` on changed skills | exit 0 | exit 0 | PASS | `response-envelope-enforcer` |

Timing pairs (develop / head, seconds): 224.6 / 203.6, 263.1 / 239.0, 228.2 / 240.6, 224.5 / 247.1, 233.2 / 233.6. Load average 7 to 9 beside each. The premise "a clean machine" did not hold (other work was running), so the 4.7% carries that noise; order was alternated to keep it unbiased.

---

## Breaking Changes Validation

None documented, none found. Overall: PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: ANSI-C quoting and line continuation evade the deny-list**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.274.bug.4.ansi-c-quote-and-continuation-evade-deny-list.md](./task.274.bug.4.ansi-c-quote-and-continuation-evade-deny-list.md)
- **Observation**: `find w $'-delete'` and `find w -dele\` + newline + `te` classify `runnable`; run under bash, each deleted its target directory. Controls behave (`find w -delete` is `mutating`).
- **Impact**: A skill doc could hide a destructive flag and Step 4b would run it.
- **Recommendation**: Fold continuations before classification; refuse or decode `$'…'`.
- **Priority**: P1

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Median ratio 1.047 against a 1.10 bound.

### Reliability — PASS
Declined paths return reasons without partial writes.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 34 (22 hostile, 12 legitimate), 2 reproduced, 0 escaped
- Record: `task.274.qa.2.security.run.json`. The two reproduced cases are T274-QA-4. The CRLF continuation and an ANSI-C `rm` flag were rejected.

### Maintainability — PASS
Doc comment and `qa-runnable-prose-detection.md` state the real rule.

---

## Code Review

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1871` — second deny-list reading strips quotes and backslashes, which does not model `$'…'` or `\`-newline → fold continuations, refuse `$'…'`. Promoted to gate as T274-QA-4 (reproduced by QA; origin: code-review, reproduced by QA).

**Cleanups (0):** none.

Boundary: `true`. Signals `refused`, `is refused`. Provenance (5b): identical output on `develop`, but the task's scope names quote variants, so the finding stays in the gate.

mutation-proven: `couldBeFlag` reverted to the empty-prefix test → three named base-scan tests ("a dash followed by a variable…", "a double-quoted dash followed by a braced variable…", "a dash followed by a command substitution…") → covered
mutation-proven: `isSyntaxCheckable` slot test replaced by `return true` → "task.274 syntax controls: …" → covered
mutation-proven: `--` removed from the `-n -c` argv → "task.274 syntax controls: …" → covered
mutation-proven: realpath containment disabled in `--fixture-copy` → "fixture-copy: every unusable value is declined `bad-fixture-copy` before a case runs" → covered

Mutations ran in a scratch worktree at the head commit; each file was restored from a `cp` snapshot and `cmp` printed nothing. Baseline was green (504 pass, 0 fail) before the first mutation.

---

## Regression Testing

Full suite on head: 8,100 pass, 2 fail (`from-observation`, `test-clean-checkout`, harness-only, identical on develop). PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm test                                  # five alternating pairs, develop vs head
node --test shared/resources/tests/qa-execute-snippets.test.mjs shared/resources/tests/security-probe.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --name classify-base-scan-2 --cases-file task.274.qa.2.security.cases.json
python3 skills/create-skill/scripts/quick_validate.py skills/response-envelope-enforcer
```

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T274-QA-4 (bug 4) with controls and mutation proofs.

### Short-term Actions (Non-Blocking)
1. Revisit the shape-4 refusal of `sed 2d "$f"` if it blocks real docs.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One reproduced high defect in the quote-variant class the task names.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.274.qa.2.qa-engines-stop-passing-what-they-cannot-see.md`
**Gate File**: co-located at `task.274.gate.2.qa-engines-stop-passing-what-they-cannot-see.yml`
**Next Steps**: `/qa-fix` for bug 4, then QA cycle 3.
