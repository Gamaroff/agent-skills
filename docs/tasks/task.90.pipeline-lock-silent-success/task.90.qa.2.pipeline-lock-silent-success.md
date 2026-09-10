# QA Report: Task 90 - `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Task**: [task.90.pipeline-lock-silent-success.md](./task.90.pipeline-lock-silent-success.md)
**Gate File**: [task.90.gate.2.pipeline-lock-silent-success.yml](./task.90.gate.2.pipeline-lock-silent-success.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: PASS
**Cycle**: 2 of max 5

---

## Executive Summary

All three cycle-1 findings are **verified fixed by execution**, not by reading the fix notes. The full refute pass over the whole branch diff found **no new HIGH or MEDIUM**. Two LOW observations are recorded, both pre-existing and both arguably correct behaviour.

The one thing worth calling out: cycle 1 failed partly because a factual claim had been carried forward unverified. Cycle 2 specifically checked whether the *replacement* claims repeat that pattern. **They do not** — every corrected statement was re-executed, including the deliberately modest "honest limit" cycle 1 attached to its own test coverage, which turns out to be exactly right.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| ID | Severity | Finding | Status | How verified |
| --- | --- | --- | --- | --- |
| **T90-QA1-001** | HIGH | Implementation report corrupted to 480,884 lines / 28 MB, committed | ✅ **FIXED** | `wc -l` → **218 lines / 14,978 bytes**. All 7 required sections present exactly once. Max identical-line count is **7**, all `---` separators — no implausible repetition. Confirmed on `origin` too: the pushed blob is 218 lines. |
| **T90-QA1-002** | MEDIUM | False "single hole in an otherwise well-behaved validator" rationale, shipped in `CHANGELOG.md` and the PR body | ✅ **FIXED** | Both replacement claims re-executed — see below. `grep` confirms the only surviving "single hole" mentions are the retraction itself and the QA finding that raised it. |
| **T90-QA1-003** | MEDIUM | Whole-file `null` lock fabricated `{"current_step":5}` and reported success | ✅ **FIXED** | `printf 'null'` → rc=1, lock byte-intact, stdout empty. Nine non-object shapes probed, all closed. |

### The corrected claims, re-executed

Cycle 1's failure mode was an unverified inherited claim. These are its replacements, and they were **run**, not read.

**Claim A — "fails closed on anything that is not a JSON object":**

| Input | rc | Lock | stdout |
|---|---|---|---|
| (empty) | 1 | untouched | silent |
| `   ` (whitespace) | 1 | untouched | silent |
| `null` | 1 | untouched | silent |
| `[]` | 1 | untouched | silent |
| `"str"` | 1 | untouched | silent |
| `42` | 1 | untouched | silent |
| `true` | 1 | untouched | silent |
| `{"a":1` (malformed) | 1 | untouched | silent |
| `hello` (non-JSON) | 1 | untouched | silent |

**9/9 hold.**

**Claim B — "inside a valid object a garbage `current_step` still falls back to 0 and advances":**

| Input | rc | stdout |
|---|---|---|
| `{"current_step":"abc"}` | 0 | `step abc → 5` |
| `{"current_step":-3}` | 0 | `step -3 → 5` |
| `{"current_step":3.7}` | 0 | `step 3.7 → 5` |
| `{"other":1}` (absent) | 0 | `step 0 → 5` |

**4/4 hold.** The distinction the corrected text draws — *parse* failure vs *shape* failure — is the real one.

**Claim C — cycle 1's own honest limit.** It stated that scenario 12's `[]`, `"str"` and `42` shapes are asserted but **not** mutation-proved against the new predicate, because they already failed closed through the write path. Verified by removing the predicate and re-probing each shape:

| Shape | rc with predicate removed | Verdict |
|---|---|---|
| `null` | 0 — advances | **binds the predicate** |
| `[]` | 1 | already closed via the write path |
| `"str"` | 1 | already closed via the write path |
| `42` | 1 | already closed via the write path |

**The self-report was accurate.** A cycle that had learned nothing from cycle 1 would have claimed all four shapes as proven.

---

## New Findings This Cycle

Searched **unscoped** — the full `origin/develop...HEAD` diff across 19 files, per the cycle-2 refute rule — with attention weighted toward cycle 1's fixes, which are the least-reviewed code in the change set.

**No new HIGH or MEDIUM findings.**

Two LOW observations, both **pre-existing** and neither a defect introduced by this task:

- **[LOW]** `shared/resources/advance-pipeline-lock.sh` — when `$LOCK` **itself** is a symlink, `mv "$TMP" "$LOCK"` replaces the link with a regular file rather than writing through to the target. This is standard `mv` semantics and predates the change. For a task whose second defect was *symlink follow*, not writing through the link is the **safer** outcome, so it is recorded rather than flagged.
- **[LOW]** `shared/resources/advance-pipeline-lock.sh` — `PIPELINE_LOCK` pointing at a **directory** exits 0 silently, because `[ -f "$LOCK" ]` treats a directory as "no lock present". Pre-existing, and consistent with the documented "no lock file → silent noop" contract.

The previously-recorded NUL-byte stderr warning is unchanged and remains LOW.

### Transitions probed explicitly (refute directive)

| Transition | Probe | Result |
|---|---|---|
| **Error path** | Read-only lock directory, so `mktemp` cannot create | Exit 1, lock **byte-intact**, clear diagnostic, **no stray temp file** |
| **Error path** | `jq` genuinely absent from `PATH` | Exit 0 with the documented warning, lock untouched — degraded mode intact, not broken by the new guard |
| **Alternate entry** | `--skill commit-changes` arm with a non-object lock | Exit 1, guard fires, lock preserved |
| **Exemption** | `--complete` on a non-object lock | Exit 0, lock removed — exemption holds, corrupt locks stay clearable |
| **Combination** | Both fixes together (guard + `mktemp`) on every shape above | No interaction defect; no path leaves a temp file behind |

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Fail closed on empty lock | PASS | Verified by execution | Widened to non-object after cycle 1; one decision predicate |
| Phase 2: Harden the temp write | PASS | Verified by execution | `mktemp`; error path clean |
| Phase 3: Tests | PASS | 30/30 bash, 30/30 zsh | Scenario 12 added |
| Phase 4: Mutation proof | PASS | Independently re-derived | See below |
| Phase 5: Legend tag + re-bundle | PASS | 9/9 content-verified | `touches: pipeline-lock!, bundles!` |

**Overall Phase Completion**: 5/5

---

## Success Criteria Verification

| # | Criterion | Actual | Status |
|---|---|---|---|
| 1 | Zero-byte lock fails closed, silent | rc=1, 0 bytes, stdout empty | PASS |
| 2 | Whitespace-only identical, not truncated | rc=1, bytes preserved | PASS |
| 3 | Non-object lock fails closed, byte-identical | 9/9 shapes | PASS |
| 4 | `--complete` still removes a malformed lock | rc=0, lock gone | PASS |
| 5 | Symlink at `$LOCK.tmp` not written through | canary intact, advance succeeds | PASS |
| 6 | All cases covered, green under bash **and** zsh | 30/30 both | PASS |
| 7 | 14 pre-existing scenarios remain green | 14/14, green under both mutations | PASS |
| 8 | Mutation-proved individually | 6 red / 2 red, exactly as predicted | PASS |
| 9 | 9 bundled copies content-verified | 9 checked, 0 mismatched | PASS |
| 10 | Legend tag + row retag | present and correct | PASS |
| 11 | `npm run ci` exits 0 | exit 0 (full tier); `ci:fast` exit 0 re-run post-fix | PASS |

---

## Breaking Changes Validation

Unchanged from cycle 1 and still accurate: the exit-code change affects no caller (every call site ignores the status or uses `|| true`), and the `0644 → 0600` mode tightening is documented in §5 with no cross-user reader. **PASS**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (3)

Symlinked `$LOCK` replaced rather than followed (safer, pre-existing); `PIPELINE_LOCK` as a directory is a silent noop (pre-existing, matches the documented contract); NUL-byte stderr warning (cosmetic, outcome correct). No bug files — LOW is report-only.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Security — PASS

Symlink hardening re-verified. Additionally probed: with `$LOCK` itself a symlink, the write no longer reaches the target at all. For a hardening change that is the outcome you want, and it is pre-existing `mv` semantics rather than anything this task introduced.

### Performance — PASS

One `jq -e` and at most one `tr` per lock advance, on a script that runs once per pipeline step.

### Reliability — PASS

Upgraded from CONCERNS. The cycle-1 residual is closed, and the error paths were **executed** rather than reasoned about: `mktemp` failure leaves the lock byte-intact with no stray temp file; the jq-absent degraded path still exits 0 with its warning; both the `--skill commit-changes` arm and the `--complete` exemption behave as specified.

### Maintainability — PASS

Upgraded from CONCERNS. The report is rebuilt, complete and structurally sound. The guard now has **one** decision predicate — verified structurally, not just claimed: a single `exit 1` inside the `if ! jq` block, with the inner `if` choosing only between two messages. Every corrected claim in the task, `CHANGELOG.md` and the PR body was re-executed.

---

## Code Review

Full refute pass over the whole `origin/develop...HEAD` diff (19 files), weighted toward cycle 1's fixes.

**Correctness bugs (0).** The cycle-1 finding is closed and no replacement defect was introduced by the fix.

**Notable — a defect the fix cycle introduced and then removed itself:**

Cycle 1's first attempt at the `null` fix *appended* the type check after the existing emptiness check. The suite stayed green, and the original mutation proof silently stopped holding: neutering the emptiness branch left all 30 tests passing, because the type predicate already covers empty input. That branch had become **control flow no test could falsify**.

This is the shape `mutation-proving.md` exists to catch, and it was caught — by running the mutation proof rather than assuming it still held after a fix. The restructure to one decision predicate is the right resolution; keeping both "for defence in depth" would have preserved an unfalsifiable branch.

**Cleanups (0 outstanding).** The guard reads cleanly, the `--complete` exemption is commented at the definition and pinned by scenario 11, and scenario 12 asserts four shapes rather than one — a guard that special-cased the `null` literal would not satisfy it.

**mutation-proven per fixed defect (cycle 2, independently re-derived):**

| Defect | Mutation | Result | `mutation-proven` |
|---|---|---|---|
| Non-object / empty lock silent success | Remove the `type == "object"` predicate | 24 passed, **6 failed** — empty, whitespace, `null` × 2 shells | yes |
| `$LOCK.tmp` symlink follow | Revert `mktemp` → `$LOCK.tmp` | 28 passed, **2 failed** — symlink × 2 shells | yes |
| — | Restored | 30 passed, 0 failed | — |

**Not proven, and correctly declared as such**: scenario 12's `[]`, `"str"` and `42` shapes. They already fail closed through the write path, so they document intent rather than bind it. Cycle 1 said exactly this; cycle 2 confirmed it.

---

## Regression Testing

| Area | Result |
|---|---|
| 14 pre-existing scenarios | PASS — green throughout, including under both mutations |
| `npm run ci:fast` (`format:check` + full hermetic suite) | PASS — exit 0, 0 failures |
| 9 bundled consumer copies | PASS — 9 checked, 0 mismatched |
| jq-absent degraded mode | PASS — unchanged by the new guard |
| Working tree | Clean — everything committed at `584bdbb` |

---

## Test Artifacts

### Test Commands Executed

```bash
bash shared/resources/advance-pipeline-lock.test.sh    # 30 passed, 0 failed
zsh  shared/resources/advance-pipeline-lock.test.sh    # 30 passed, 0 failed
npm run ci:fast                                        # exit 0
# 13 input shapes probed against the guard (9 non-object, 4 valid-object)
# 7 refute probes: error paths, alternate entry points, exemption, combination
# 2 mutation proofs re-derived + 1 targeted proof of cycle 1's honest-limit claim
for f in skills/*/references/advance-pipeline-lock.sh; do
  diff <(sed '2d' "$f") shared/resources/advance-pipeline-lock.sh || echo "MISMATCH $f"
done                                                   # 9 checked, 0 mismatched
```

### Coverage Report

Not applicable — shell script with a bespoke harness. Coverage is expressed as scenario count (30), input shapes probed (20), and mutation-proof results above.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. **Nothing in this repo can see an artifact orders of magnitude larger than plausible.** `prettier --check` passes on a 28 MB markdown file, and `npm run ci` had already run before the corruption existed. A cheap size sanity-check on committed markdown would have caught T90-QA1-001 at commit time rather than at QA. Worth its own task.
2. The NUL-byte stderr warning is cosmetic; leave or silence as preferred.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All three cycle-1 findings verified closed by execution. The unscoped refute pass found no new HIGH or MEDIUM. All four NFRs pass, with Reliability and Maintainability upgraded from CONCERNS on executed evidence. The replacement claims for the false rationale were re-run and hold, including cycle 1's own deliberately modest coverage claim.
**Quality Score**: 100/100

> The score describes the state at `584bdbb`, not the path taken to it. Getting here cost one QA cycle that found a 28 MB corrupted artifact and a false claim in a user-facing changelog — both of which shipped to the PR before QA caught them.

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**Next Steps**: Step 5c (`/review-pr`) — the QA loop's exit gate — then `/finalise`.
