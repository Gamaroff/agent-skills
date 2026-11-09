# QA Report: Task 274 - QA engines stop passing what they cannot see

**Task**: [Link to task document](./task.274.qa-engines-stop-passing-what-they-cannot-see.md)
**Gate File**: [task.274.gate.3.qa-engines-stop-passing-what-they-cannot-see.yml](./task.274.gate.3.qa-engines-stop-passing-what-they-cannot-see.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-09
**Testing Completed**: 2026-11-09
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3 verified the cycle-2 fix and re-probed the whole classifier surface unscoped, because gate 2 failed on security. Bug 4 is fixed and guarded by committed tests that go red when the fix is reverted. The re-probe found five other gaps in the snippet runner's deny-list. All of them behave the same on `develop`, none is a shape this task names, and none appears in the tracked docs, so they are recorded as follow-up work and not as findings against this change.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: APPROVED for staging; CONDITIONAL for production (owner decision on the follow-up)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing (8,135 pass, 0 fail on the fix commit)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#863)

### Review Methodology

Direct tools plus one read-only Explore reviewer. Re-review scope: unscoped (prior gate failed on security), `origin/develop...HEAD`, 7,495 diff lines, with the safety re-probe directive. The reviewer returned in 1,521,617 ms (`duration_ms`). Diff review: code review. Step 4b over `qa-runnable-prose-detection.md` (the one changed in-scope file): 2 blocks, 1 runnable, 1 refused, 0 findings. CI: not read this cycle (gated once at `/finalise`).

### Re-Review Context

| Prior finding | Status | Evidence |
| --- | --- | --- |
| T274-QA-4 ANSI-C quoting and line continuation evade the deny-list | FIXED | `find docs $'-delete'`, `$"-delete"`, the hex form and the continuation splits now classify `mutating`; controls `'cost$'`, `"a$"`, `git` + continuation stay `runnable` |

---

## New Findings This Cycle

None against this change set. Searched unscoped (prior gate: security FAIL): the full `origin/develop...HEAD` diff, 7,495 lines. The reviewer built about 90 classifier inputs across command forms, redirections, find and sed actions, function and alias definitions, quoting and expansion tricks; QA reproduced each reported one and ran the dangerous ones under bash in a scratch directory.

Five pre-existing gaps were found (provenance below). They are routed to `recommendations.future`, not `top_issues[]`.

| # | Input | Head | Develop | Ran in scratch dir |
| --- | --- | --- | --- | --- |
| 1 | `echo () { touch out; }; echo hi` (function named after an allow-listed command) | runnable | runnable | wrote `out` |
| 2 | `echo hi <>out1` (read-write redirection) | runnable | runnable | wrote `out1` |
| 3 | `find . -maxdepth 0 -fprint0 out2` | runnable | runnable | wrote `out2` |
| 4 | `sed -n '1e touch out3' f` and `echo a \| sed 's/a/touch out4/e'` | runnable | runnable | wrote `out3`, `out4` |
| 5 | `sort --compress-program=touch x` | runnable | runnable | not executed (reviewer's medium-confidence claim) |

Controls: `f() { touch x; }; f`, `echo hi >out1`, `find . -fprint out2` classify `mutating`; `sed -n '1p' f` and `sort x` classify `runnable`.

Provenance (5b): identical output on `develop` for every row. Scope check: the task's Motivation and Scope name the heredoc, `$(…)`, quoted-flag and variable-argument shapes of obs #67, and the Out of Scope section does not list these; none of the five is one of those shapes. A scan of the 3,435 shell blocks in the tracked docs for each shape found 0 hits. So they are `pre-existing`, with both measurements recorded here.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1 Owner decisions | PASS | Verified | Recorded in the task document |
| 2 Base scan | PASS | Verified | Shapes 1-4 and the quote variants hold |
| 3 Syntax check | PASS | Verified | Template skip, `--` guard |
| 4 Probe record key, `--name`, `--fixture-copy` | PASS | Verified | Containment holds |
| 5 Status-history row width | PASS | Verified | Width mismatch refused |

**Overall Phase Completion**: 5/5.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| `CI=true npm test` wall time vs `develop` | within 10% (median of 5 alternating) | +4.7% | PASS | Measured in cycle 2 on `f6a73688`; the fix since adds two linear scans (125 ms on 320,000 backslashes) |
| task.205-shape cases file | under 100,000 bytes | 8,813 bytes | PASS | Measured in cycle 2 |
| Shapes 1 to 4 refused, controls runnable | as written | holds | PASS | 39-case probe, 39 as required |
| `npm run validate` on changed skills | exit 0 | exit 0 | PASS | No skill changed since cycle 2 |

---

## Breaking Changes Validation

None. PASS.

---

## Issues Found

None open. Bugs 1 to 4 are fixed.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
Cycle 2 measurement stands; the later change is linear.

### Reliability — PASS
Declined paths write nothing.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 39 (all as required, 0 reproduced, 0 escaped). Record: `task.274.qa.3.security.run.json`.
- The five pre-existing gaps above are why this is CONCERNS and not PASS. They are not caused by this change, but they bear on whether the runner can be trusted with an untrusted document.

### Maintainability — PASS
The rule is stated once and cited.

---

## Code Review

**Correctness bugs (5, all pre-existing):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1326` — a function named after an allow-listed command hides its body → refuse function definitions.
- [high/high] `shared/resources/qa-execute-snippets.mjs:872` — `<>` is invisible to `WRITE_REDIRECT` → add it.
- [high/high] `shared/resources/qa-execute-snippets.mjs:736` — `-fprint0` is missed by the trailing `\b` → widen the pattern.
- [high/high] `shared/resources/qa-execute-snippets.mjs:616` — sed `e` command and `s///e` flag execute commands → treat as mutating.
- [medium/medium] `shared/resources/qa-execute-snippets.mjs:407` — `sort --compress-program` and `file -C` on the allow-list (not executed by QA) → deny or drop the flag.

None entered `top_issues[]`; see New Findings This Cycle.

**Cleanups (0):** none.

Boundary: `true`. Signals `refused`, `is refused`.

mutation-proven: continuation fold removed → "a flag split by a line continuation…" and "a variable split by a line continuation…" → covered
mutation-proven: `hasDecodedQuote` call removed → the ANSI-C, ANSI-C hex and locale-quote tests → covered
mutation-proven: opener widened to any `$` → "task.274 base scan controls: the look-alikes that write nothing stay runnable" → covered

Mutations ran in a scratch worktree at `1d60b861`; each file restored from a `cp` snapshot and `cmp` printed nothing; baseline was green (18 pass, 0 fail). Platform variance: `TMPDIR=/tmp node --test` over the two engine test files: 509 pass, 0 fail.

---

## Regression Testing

Full suite on the fix commit: 8,135 pass, 0 fail (`CI=true npm test`, run by the fix cycle). `bundle --check`: 0 problems. PASS.

---

## Test Artifacts

### Test Commands Executed
```bash
node --test --test-name-pattern="task.274 base scan" shared/resources/tests/qa-execute-snippets.test.mjs   # baseline + 3 mutations
TMPDIR=/tmp node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/qa-execute-snippets.test.mjs
node .agents/skills/qa-task/references/security-probe.mjs --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --name classify-base-scan-3 --cases-file task.274.qa.3.security.cases.json
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/qa-runnable-prose-detection.md
```

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. File a task for the five deny-list gaps; the structural answer is an allow-list of accepted shapes instead of a deny-list.
2. Revisit the shape-4 refusal of `sed 2d "$f"` if it blocks real docs.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No open finding against the change set; one security concern that predates it.
**Quality Score**: 90/100

**Deployment Recommendation**: APPROVED for staging; CONDITIONAL for production
**Conditions**: Owner decision on the deny-list follow-up.

---

**QA Report**: co-located at `task.274.qa.3.qa-engines-stop-passing-what-they-cannot-see.md`
**Gate File**: co-located at `task.274.gate.3.qa-engines-stop-passing-what-they-cannot-see.yml`
**Next Steps**: review-pr (Step 5c), then finalise.
