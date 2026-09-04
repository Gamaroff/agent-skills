# QA Report: Task 90 - `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Task**: [task.90.pipeline-lock-silent-success.md](./task.90.pipeline-lock-silent-success.md)
**Gate File**: [task.90.gate.1.pipeline-lock-silent-success.yml](./task.90.gate.1.pipeline-lock-silent-success.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: FAIL

---

## Executive Summary

**The code fix is correct, complete, and its tests are real.** Both defects were re-verified by execution, both mutation proofs were independently re-derived (not taken on trust), and all 22 scenarios pass under bash and zsh. Nothing about the change to `advance-pipeline-lock.sh` is wrong.

The gate fails on what surrounds it. A **28 MB corrupted implementation report** — 480,884 lines, one paragraph repeated 12,326 times — was committed in `293da69` and pushed to PR #313, destroying the audit trail for this run. And the task's central rationale, repeated verbatim in `CHANGELOG.md` and the PR body, is **factually false on 6 of the 8 inputs it names**.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (12 numbered sections + Progress Tracking + Change Log)
- [x] All implementation phases completed (36 checkboxes ticked, 0 unticked)
- [x] Tests passing
- [x] Breaking changes documented (§5 — exit code and file mode)
- [x] Code on feature branch with open PR (#313 OPEN, head `293da69c164d`)

### Testing Approach

- [x] Automated Testing (the script's own harness, bash + zsh)
- [x] Regression Testing (14 pre-existing scenarios)
- [x] Security Review (symlink probe executed)
- [x] Code Review (diff, direct tools)
- [x] Adversarial probing (9 malformed-input shapes executed, not read)

### Review Methodology

**Direct tools.** Adaptive Review Strategy: 5 phases, single module (`shared/resources/` + generated copies), `risk_level: medium`, first review. Direct tools give full coverage of a 56-line script diff without agent overhead.

Every success criterion was verified by **executing its evidence**, per the orchestrator's instruction and because this run's own §13 records a false finding it previously made — self-reports were treated as claims to check, not as results.

**Step 4b: not applicable** — no `SKILL.md` and no `shared/resources/*.md` in the change set. The deliverable is an executable `.sh` plus its `.test.sh` harness; the runnable-prose rule does not fire. Recorded rather than skipped silently.

---

## Implementation Verification

| Phase                                   | Status | Test Result | Notes |
| --------------------------------------- | ------ | ----------- | ----- |
| Phase 1: Fail closed on empty lock      | PASS   | Verified by execution | `require_parsable_lock` called at both JSON-reading sites; `--complete` exempt as designed |
| Phase 2: Harden the temp write          | PASS   | Verified by execution | `mktemp` in the lock dir; symlink canary intact |
| Phase 3: Tests                          | PASS   | 22/22 bash, 22/22 zsh | Scenarios 8–11 parameterised on interpreter, `command -v zsh` guarded |
| Phase 4: Mutation proof                 | PASS   | Independently re-derived | See Code Review below |
| Phase 5: Legend tag + re-bundle         | PASS   | Verified by content | Tag present; row retagged; 9/9 copies correct |

**Overall Phase Completion**: 5/5 phases passed

---

## Success Criteria Verification

Each row was **executed**, not read.

| # | Criterion | Expected | Actual | Status |
|---|-----------|----------|--------|--------|
| 1 | Zero-byte lock exits non-zero, untouched, no success line | rc≠0, 0 bytes, silent | rc=1, 0 bytes, stdout empty | PASS |
| 2 | Whitespace-only identical, not truncated | rc≠0, bytes preserved | rc=1, 5→5 bytes | PASS |
| 3 | `--complete` still removes a malformed lock | rc=0, lock gone | rc=0, lock gone | PASS |
| 4 | Symlink at `$LOCK.tmp` does not receive the write | canary intact, advance succeeds | canary `CANARY` intact, lock → 3 | PASS |
| 5 | All four cases covered, green under bash **and** zsh | 22/22 both | 22/22 both | PASS |
| 6 | The 14 pre-existing scenarios remain green | 14/14 | 14/14 (green under both mutations too) | PASS |
| 7 | Mutation-proved, each fix reverted individually | each turns its own scenarios red | M1 → 4 fail (both shells); M2 → 2 fail (both shells) | PASS |
| 8 | 9 bundled copies refreshed, verified **by content** | copy == source + banner | 9 checked, 0 mismatched | PASS |
| 9 | `touches:` tag exists in legend; row retagged | `pipeline-lock` present, row uses it | tag present; `touches: pipeline-lock!, bundles!` | PASS |
| 10 | `npm run ci` exits 0 | exit 0 | exit 0 (full tier, pre-corruption); `ci:fast` exit 0 re-run at review time | PASS |

**All 10 success criteria met.** The gate does not fail on any of them.

---

## Breaking Changes Validation

### Breaking Change: exit code 1 on an empty/whitespace-only lock

Documented: Yes (§5) · Migration path: N/A (no caller checks the status) · Verified: every call site is `bash …advance-pipeline-lock.sh N` with the status unchecked or `|| true`. **PASS**

### Breaking Change: lock file mode 0644 → 0600

Documented: Yes (§5) · Migration path: N/A · Verified by execution — mode is `600` after an advance. `.claude/state/` is per-user. **PASS**

**Overall Breaking Changes Assessment: PASS**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The implementation report is corrupted — 28 MB, committed and pushed**

- **Severity**: HIGH
- **Category**: Quality / audit trail
- **Bug Report**: [task.90.bug.1.implementation-report-corrupted.md](./task.90.bug.1.implementation-report-corrupted.md)
- **Observation**: `task.90.implementation.1.*.md` is **480,884 lines / 27,992,499 bytes**. The Step 3 retraction block is duplicated **12,326 times** and the report's real structure (Pipeline Configuration, Progress table, Decisions Log, Completion) is buried or destroyed. The file now *begins* mid-section.
- **Where it came from**: a correction script computed `old = s[start:end]` where `end` was located **earlier** in the file than `start`. Python returns `''` for such a slice, and `str.replace('', X)` inserts `X` between **every character** — hence ~12.3k copies for a ~12 KB file.
- **Impact**: The implementation report is the pipeline's own record of what it decided and why; it is currently unreadable. It is committed in `293da69` and present on `origin`, so PR #313 carries a 28 MB junk file.
- **Why no gate caught it**: `prettier --check` passes on it (it is well-formed markdown, just enormous), and `npm run ci` ran *before* the corruption was introduced. Nothing in this repo asserts a plausible size for a committed artifact.
- **Recommendation**: rebuild the report from its real content and verify `wc -l` before committing.
- **Priority**: P0

### MEDIUM Severity Issues (2)

**Issue: The task's §2 rationale is factually false, and is shipped in CHANGELOG.md**

- **Severity**: MEDIUM
- **Category**: Documentation accuracy
- **Bug Report**: [task.90.bug.2.false-single-hole-claim.md](./task.90.bug.2.false-single-hole-claim.md)
- **Observation**: §2 states that 18 executed `current_step` values — naming `null`, absent, `"abc"`, `-3`, `3.7`, `1e400`, malformed JSON, non-JSON — "all correctly preserve the lock and exit non-zero", and concludes the zero-byte case is "the single hole in an otherwise well-behaved validator". Executed against the current script:

  | Input | rc | Lock |
  |---|---|---|
  | `{"current_step": null}` | **0** | rewritten to `{"current_step":5}` |
  | `{"other": 1}` (absent) | **0** | rewritten |
  | `{"current_step": "abc"}` | **0** | rewritten |
  | `{"current_step": -3}` | **0** | rewritten |
  | `{"current_step": 3.7}` | **0** | rewritten |
  | `{"current_step": 1e400}` | **0** | rewritten |
  | `{"current_step": ` (malformed) | 1 | preserved |
  | `hello world` (non-JSON) | 1 | preserved |

  **6 of the 8 named values advance and exit 0.** Only the two unparseable ones fail closed.
- **Impact**: The claim is repeated verbatim in `CHANGELOG.md` under Unreleased → Fixed (user-facing) and in the PR #313 body. This repository holds a deliberately high bar against overclaiming — `task.76` exists for exactly this — and "the single hole in an otherwise well-behaved validator" is the load-bearing sentence of the fix's rationale.
- **Note on blame**: the claim was inherited from task 77's DoD probe and carried forward unverified. That is the failure mode, not the arithmetic.
- **Recommendation**: state what actually holds — unparseable input fails closed; a parseable object with a garbage `current_step` advances to a valid step (defensible, and not what this task changes).
- **Priority**: P1

**Issue: whole-file `null` lock still reports a fabricated advance**

- **Severity**: MEDIUM
- **Category**: Functional (residual, pre-existing)
- **Bug Report**: [task.90.bug.3.whole-file-null-lock.md](./task.90.bug.3.whole-file-null-lock.md)
- **Observation**: a lock whose entire content is the 4 bytes `null` prints `advance-pipeline-lock: step 0 → 5`, exits 0, and writes `{"current_step":5}` — **fabricating an object from a lock that held none**. This is the exact silent-success shape the task exists to close.
- **Pre-existing**: byte-identical behaviour on `origin/develop`. Not a regression introduced here, and outside the task's stated §4 scope ("empty or whitespace-only").
- **Impact**: bounded — the resulting lock is *valid*, so the state machine is not left corrupt as it was in the zero-byte case. But it is the counterexample that falsifies the "single hole" rationale, and it sits one predicate away from the guard that was just added.
- **Recommendation**: extend `require_parsable_lock` with a `jq -e 'type == "object"'` check plus a test scenario, **or** record it explicitly in §4 Out of scope. Either is acceptable; leaving it unstated is not.
- **Priority**: P2

### LOW Severity Issues (1)

- A NUL-byte-only lock makes bash print `warning: command substitution: ignored null byte in input` to stderr before `require_parsable_lock` correctly fires (rc=1, lock untouched). The **outcome is right**; only the stderr noise is untidy. No bug file.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Security — PASS

The symlink hardening was verified by execution, not by reading: a symlink planted at `$LOCK.tmp` pointing at a canary file is not followed, the canary is byte-intact, and the advance still succeeds. `mktemp` gives `O_EXCL` on an unpredictable name, which closes the class properly — `set -o noclobber`, the alternative the task considered and rejected, would not have (a symlink to a non-existent target is still created through it). The `0644 → 0600` tightening is documented. No new surface.

### Performance — PASS

One extra `tr` per lock advance, on a script that runs once per pipeline step. Immaterial.

### Reliability — CONCERNS

The stated defect is closed and fails closed correctly on both interpreters. **T90-QA1-003** leaves an adjacent input on the same silent-success path — pre-existing rather than introduced, but currently neither fixed nor recorded as a known residual.

### Maintainability — CONCERNS

**T90-QA1-001** leaves the run's own audit trail unreadable. **T90-QA1-002** places a false factual claim into a user-facing changelog.

---

## Code Review

Reviewed the 56-line script diff and the 110-line test addition directly.

**Correctness bugs (1):**

- [medium/high] `shared/resources/advance-pipeline-lock.sh:~90` — the guard covers "empty or whitespace-only" but not "parseable JSON that is not an object". A whole-file `null` therefore fabricates `{"current_step":5}` and reports success. See T90-QA1-003.

**Cleanups (0 blocking):**

- The guard is defined once and called twice rather than inlined — correct.
- `--complete` exemption is both commented at the definition and pinned by scenario 11, so the reasoning survives a later refactor. This is the right shape.
- Test scenarios 8–11 are parameterised on the interpreter rather than copy-pasted, and scenario 10 asserts **both** that the canary survives and that the advance still succeeds — a version that simply stopped working would not pass. Good test design.
- Scenario 8 asserts three claims separately (exit, file, **stdout silence**); the stdout assertion is the one that actually binds the defect.

**Mutation proofs — independently re-derived, not accepted on trust:**

| Mutation | Result | `mutation-proven` |
|---|---|---|
| Neuter `require_parsable_lock`'s body | 18 passed, **4 failed** — zero-byte + whitespace-only, both shells | yes |
| Revert `mktemp` → `$LOCK.tmp` | 20 passed, **2 failed** — symlink scenario, both shells | yes |
| Restored | 22 passed, 0 failed | — |

Each mutation turned red exactly the scenarios it should and no others. The tests are **not** vacuous.

Per `mutation-proving.md`: this establishes the tests bind these behaviours. It does **not** establish the fix is complete — and indeed T90-QA1-003 is a live example of a real gap that all 22 green tests say nothing about.

---

## Regression Testing

| Area | Result |
|---|---|
| 14 pre-existing scenarios (commit-changes nesting contract, Steps 5–6 loop noops) | PASS — green throughout, including under both mutations |
| `npm run ci:fast` (`format:check` + full hermetic suite) | PASS — exit 0; 6 + 401 + 22 + 3 assertions, 0 failed |
| 9 bundled consumer copies | PASS — all carry the guard and the `mktemp` write; 0 stale |
| Live pipeline use (this run advanced its own lock through steps 2→5) | PASS — no anomaly |

---

## Test Artifacts

### Test Commands Executed

```bash
bash shared/resources/advance-pipeline-lock.test.sh      # 22 passed, 0 failed
zsh  shared/resources/advance-pipeline-lock.test.sh      # 22 passed, 0 failed
npm run ci:fast                                          # exit 0
# adversarial probes: 9 malformed-lock shapes executed against the script
# mutation proofs: guard neutered, then mktemp reverted, each re-run and restored
for f in skills/*/references/advance-pipeline-lock.sh; do
  diff <(sed '2d' "$f") shared/resources/advance-pipeline-lock.sh || echo "MISMATCH $f"
done                                                     # 9 checked, 0 mismatched
```

### Coverage Report

Not applicable — the deliverable is a shell script with a bespoke harness, not an instrumented JS/TS project. Coverage is expressed as scenario count (22) and mutation-proof results above.

---

## Recommendations

### Immediate Actions (Blocking)

1. **P0** — Rebuild the corrupted implementation report; verify `wc -l` before committing.
2. **P1** — Correct the falsified §2 rationale in the task, `CHANGELOG.md`, and the PR #313 body.
3. **P2** — Close the whole-file `null` residual, or record it explicitly in §4 Out of scope.

### Short-term Actions (Non-Blocking)

1. Consider a cheap committed-artifact size sanity check. `prettier --check` passes on a 28 MB markdown file, so nothing in the current gate set can see this class of defect.
2. The NUL-byte stderr warning is cosmetic; leave or silence as preferred.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: All 10 success criteria pass and the code change is sound and genuinely well-tested. The gate fails on a HIGH-severity corrupted artifact already pushed to the PR, and on a false factual claim in a user-facing changelog. Neither is in the script; both are in what ships alongside it.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T90-QA1-001 and T90-QA1-002 must be resolved. T90-QA1-003 must be either fixed or explicitly recorded.

---

**Next Steps**: `/qa-fix` addresses the three findings, then re-review.
