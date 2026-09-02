# QA Report: Task 74 — A security re-review must re-probe, not re-read (cycle 2)

**Task**: [Link to task document](./task.74.security-re-review-reprobes.md)
**Gate File**: [task.74.gate.2.security-re-review-reprobes.yml](./task.74.gate.2.security-re-review-reprobes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-02
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 ran as a **refute pass** — `PRIOR_GATES=1`, whole-branch diff, instructed to find the claim
that is false rather than to confirm the fixes. It found one: **CR-2's fix did not work**. Cycle 1
made the shared-rule read lazy but left `const CLAUSE_1 = extractProbe()` at module level, which calls
it at import anyway. The claimed fix changed nothing observable.

That is filed as CR-4, fixed, and proven. CR-1 and CR-3 verified genuinely closed. No other new
findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

**Previous QA Review**: [task.74.qa.1.security-re-review-reprobes.md](./task.74.qa.1.security-re-review-reprobes.md)
**Previous Gate**: CONCERNS (Quality Score: 90/100)
**Previous Issues**: 3 (0 HIGH, 1 MEDIUM, 2 LOW)

### Issues from Previous Review

1. **CR-1 — clause-1 probe hangs on empty `$LATEST_GATE`** — Status: ✅ **FIXED**
   - Previous concern: `awk 'prog' ""` passes no filename, falls back to reading stdin, blocks forever.
   - Current status: guarded on `[ -n "$LATEST_GATE" ] && [ -r "$LATEST_GATE" ]` with `</dev/null`.
     **Verified by execution, not by reading**: the block was extracted **verbatim, indentation intact**
     from each of the three shipped files and run under both shells against `task.67.gate.1` (`true`),
     an empty `LATEST_GATE` (`false`, no hang) and a nonexistent path (`false`, no hang). Independently
     mutation-proven: reverting the guard reddens the empty-`LATEST_GATE` test on a real timeout.

2. **CR-2 — missing rule crashes the suite at import** — Status: ❌ **NOT FIXED** → refiled as **CR-4**
   - Previous concern: top-level `readFileSync` pre-empts `the shared rule exists`.
   - Current status: `ruleText()` was made lazy, but `const CLAUSE_1 = extractProbe()` on the next
     screen calls it **at module level**. Deleting the rule still produced a raw ENOENT and
     `tests 1 / fail 1`; the assertion still never reported. **The fix's stated effect was not
     achieved.** See CR-4.

3. **CR-3 — `extractProbe` unanchored** — Status: ⚠️ **PARTIAL** → same root cause as CR-4
   - Previous concern: first-match extraction could silently redirect the replay tests.
   - Current status: the `matchAll` + `assert.equal(all.length, 1)` logic is correct and does fire —
     but, being reached at import, it fired as a **crash** rather than a reported assertion. Correct in
     substance, defeated in delivery by the same module-level call. Closed by the CR-4 fix.

---

## New Findings This Cycle

**CR-4 [LOW] — `evals/shared/tests/qa-re-review-scope-parity.test.mjs:355` — `const CLAUSE_1 =
extractProbe()` runs at import, defeating cycle 1's CR-2 fix and demoting CR-3's assertion to a crash.**

Two independent refutes reproduced it:

| Refute | Before CR-4 fix | After |
| --- | --- | --- |
| Delete the shared rule | raw `ENOENT`, `tests 1 / fail 1` | ✖ `the shared rule exists` + 5 more, each reported |
| Add a second `SAFETY_REPROBE=false` block | raw crash, `tests 1 / fail 1` | ✖ the four replay tests + 2 more, each reported |

Never a false green — the suite failed in every case. But the diagnostics written for exactly these
cases were unreachable, and **QA cycle 1 recorded CR-2 as fixed when it was not**. Fixed by making
`clause1()` lazy in the same shape as `ruleText()`; both refutes above now report as assertions.

**What was searched, beyond the prior findings.** The refute directive asks for more than re-testing
cycle 1's fixes, so the following were probed independently and found sound:

- **The indented copies actually run.** The parity test compares on normalised indentation, so it
  structurally cannot catch a block broken *by* its indentation. Both `SKILL.md` blocks were extracted
  **verbatim with indentation preserved** and executed under bash and zsh: `true` on `gate.1`, `false`
  on empty. No finding.
- **`</dev/null` and the `-r` test are separately load-bearing** — MF-2 and MF-3 each redden alone, so
  neither is redundant padding.
- **The combination of cycle-1 fixes** — CR-2 and CR-3 touched the same region; re-read as one change,
  which is how the shared module-level root cause surfaced rather than two separate symptoms.
- **The regression tests' own vacuity** — the two earlier vacuous versions (closed stdin; sleep with
  stdout redirected) are documented in the file, and the surviving version was re-proven to
  discriminate under the spawn budget.
- **Budget coupling** — `HOLD_STDIN_SECONDS` derives from `SPAWN_TIMEOUT_MS`, so a raised budget cannot
  silently outlive the stdin holder and re-vacate the test. Verified at both the 60s default and a 5s
  override.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Define the trigger | PASS | Verified | Unchanged since cycle 1; probe now guarded |
| Phase 2: The unscoped path | PASS | Verified | Disjunct intact in both skills; executed verbatim |
| Phase 3: Ask both questions | PASS | Verified | This report exercises the New Findings section itself |
| Phase 4: Hold it with a contract test | PASS | Verified | 34 tests; assertions now reachable (CR-4) |

**Overall Phase Completion**: 4/4

---

## Step 4b: Execute the Documented Commands

Fires again (the diff still modifies two `SKILL.md` files and a `shared/resources/*.md` prompt).

`zero-blocks-executed` again on all three files — unchanged classification, still
[bug.7](../../bugs/bug.7.zero-blocks-executed-fires-on-correct-refusal/bug.7.zero-blocks-executed-fires-on-correct-refusal.md)
case B, still pre-existing on `develop` for both skills. Not a finding.

Executed manually instead, this cycle **from each shipped file separately** rather than only from the
shared rule — which is what confirmed the indentation question above:

| Source | bash (`gate.1`) | zsh (`gate.1`) | empty `LATEST_GATE` |
| --- | --- | --- | --- |
| `shared/resources/qa-re-review-scope.md` | `true` | `true` | `false`, no hang |
| `skills/qa-task/SKILL.md` | `true` | `true` | `false`, no hang |
| `skills/qa-story/SKILL.md` | `true` | `true` | `false`, no hang |

No shell disagreement.

---

## Success Criteria Verification

All criteria verified PASS in cycle 1 remain PASS; none regressed. Re-checked directly rather than
carried forward: one `PRIOR_GATES` conditional per skill, both scope-decision strings present, the
`New Findings This Cycle` requirement stated inside its own section in both templates.

**Full suite**: `npm run ci:fast` → **EXIT=0**, 2202 pass / 0 fail. Parity suite **34/34**.

---

## Breaking Changes Validation

None. Unchanged from cycle 1. **PASS (N/A).**

---

## Issues Found

### HIGH (0) · MEDIUM (0) · LOW (1)

**CR-4** — described above; **fixed within this cycle** and verified by two refutes.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1 (closed)

---

## NFR Assessment

### Security — PASS

Unchanged and re-verified. The trigger predicate was re-probed from all three shipped sources with four
inputs each, including two negative controls, under both shells. The hang path CR-1 identified is
closed and its closure is mutation-proven; a hang in a safety-gate evaluator is itself a reliability
hazard on a security surface, and it no longer exists.

### Performance — PASS

Unchanged. One note recorded rather than filed: when the guard is broken, the two hang tests take the
full spawn-budget timeout (60s default) to fail. That is correct — a hang *should* cost — and costs
nothing on the healthy path, where they return in ~250ms.

### Reliability — PASS

Upgraded from CONCERNS. CR-1 is closed and proven; CR-4 is closed and proven. The regression tests
themselves were shown to discriminate rather than merely pass, at two different budget settings.

### Maintainability — PASS

The rule is stated once; both consumers reference it; the parity suite forbids restatement and now
reports its findings as assertions rather than crashes. Three separate vacuity traps found during this
task are documented in the test file itself, next to the code they explain.

---

## Code Review

Refute pass (`REFUTE_PASS=true`), whole `origin/develop...HEAD` diff, direct tools.

**Correctness bugs (1):**

- [low/high] `evals/shared/tests/qa-re-review-scope-parity.test.mjs:355` — module-level
  `extractProbe()` defeats the lazy read → make `clause1()` lazy. **Fixed this cycle.**

**Cleanups (0):** none identified.

**mutation-proven**: CR-1 — yes (MF-1/MF-2/MF-3, each red then restored). CR-4 — yes (both refutes
reproduce the crash before the fix and report as assertions after). CR-3 — yes, via refute B.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite | PASS — 2202 pass / 0 fail |
| Formatting | PASS |
| Repo spawn-timeout convention (`tests/test-harness-concurrency.test.js`) | PASS — 16/16 |
| Bundled `references/` in sync | PASS — both skills |
| Skill identity | PASS — both |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH or MEDIUM findings. The one LOW found by the refute pass was a false completion
claim from cycle 1, and it is fixed and proven within this cycle. All four phases complete, every
success criterion verified by execution, and the fixes are mutation-proven rather than asserted.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: `/finalise`.
