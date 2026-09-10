# QA Report: Task 82 - Feed the measured security verdict into the QA gate (cycle 2)

**Task**: [task.82.security-gate-evidence-field.md](./task.82.security-gate-evidence-field.md)
**Gate File**: [task.82.gate.2.security-gate-evidence-field.yml](./task.82.gate.2.security-gate-evidence-field.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 was the mandated **refute pass** — unscoped, over the whole branch diff, asked to find the
claim that is false rather than to confirm the change works. It found one: the probe could not tell a
**broken reader** from a gate with **no security axis**, so a corrupted awk program silently disabled
the very carve-out this task widens. That is the cycle-1 defect's own failure mode, one layer down,
and nothing would have caught it.

It then found a defect in the *first fix for it*. Both are closed, mutation-proven, and pinned.
Cycle-1's maintainability CONCERNS is resolved. **Gate: PASS, 100/100.**

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools, inline (no subagents — session constraint, as in cycle 1).

```
Re-review scope: unscoped — cycle 2 is always a full refute pass (REFUTE_PASS=true, PRIOR_GATES=1)
```

`SAFETY_REPROBE` resolved to **false** from gate 1 — whose own security axis reads `OK measured`, so
the safety carve-out correctly declined to fire. That is the machinery this task adds, evaluated
against its own first gate, behaving as designed. The unscoped scope came from the cycle-2 rule, not
from the carve-out.

---

## Re-Review Context

| Previous finding | Severity | Status | Verification |
| --- | --- | --- | --- |
| TASK82-001 — awk program named the whole-record variable | HIGH | **FIXED** | Zero occurrences in the extracted program across all three files; guard test present and mutation-proven (reintroducing it reds 2 tests) |
| TASK82-002 — apostrophe in a comment closes the program | MEDIUM | **FIXED** | Zero apostrophes in the extracted program; guard test present and mutation-proven (reintroducing it reds 20 tests) |
| NFR maintainability CONCERNS — snippet grew to ~25 lines, triplicated | — | **RESOLVED** | Constraint comment ~10 lines → 3-line pointer; reasoning moved once into a "Transit constraints" section of the shared rule, outside the code block, with the extraction threshold stated. All four guards re-proved by mutation *after* the shortening, so the reduction did not weaken what it documents |

---

## New Findings This Cycle

**TASK82-003 [MEDIUM]** `shared/resources/qa-re-review-scope.md` — an empty reading was treated as
`absent`. → exhaustive `case` over the emitted vocabulary with a fail-open catch-all.

Searched unscoped (cycle-2 refute rule): full `origin/develop...HEAD` diff, 24 files. Re-enumerated
the probe's inputs rather than re-testing the ones cycle 1 named, and added a class cycle 1 never
tested at all — **the instrument itself failing**.

---

## Issues Found

### MEDIUM Severity Issues (1)

**TASK82-003: an empty reading is a claim about the instrument, and was read as a claim about the gate**

- **Severity**: MEDIUM · **Category**: Reliability · **Priority**: P2 · **Status**: Closed 2026-09-09
- **Observation**: The probe emits `absent` for a gate with no `security:` block, and
  `"<status> <evidence>"` otherwise. The `case` handled `absent`, `*FAIL*` and `*unverified*`, and
  everything else fell through to no-op. The **empty string** — what you get when awk dies, is
  missing, or has had its program corrupted — therefore read exactly like `absent`.
- **How it was found**: by execution, not reading. The probe was run against a `security: FAIL` gate
  with a `PATH` whose `awk` exits 127. Result: `SAFETY_REPROBE=false`, `AXIS=[]` — the carve-out
  silently off on a gate that had failed on security.
- **Why it matters more than it looks**: a corrupted awk program produces exactly this empty
  reading. That is precisely what TASK82-001 did. The transit constraints stop the corruption being
  *introduced*; nothing caught its *effect*. This is the runtime backstop.
- **Fix**: the `case` is now exhaustive over the emitted vocabulary, with clean readings listed
  explicitly and a catch-all that fails **open**.

### A defect in the fix for the finding — recorded rather than quietly corrected

The catch-all as **first written** was `*) SAFETY_REPROBE=true`, placed after only three branches.
`"OK measured"` matches none of them, so **every passing gate fired**: 7 of the 8 "does not fire"
tests went red at once, including two real-gate replays.

Caught immediately by the existing suite. It is recorded here because the qa-fix contract says a fix
is new code rather than the closure of a finding — and this is a clean instance: a correct diagnosis,
an incorrect first remedy, caught only because the negative cases were already pinned. The
exhaustive form lists the clean readings *before* the catch-all, and a structural test now asserts
`absent` and the catch-all are distinct branches so the distinction cannot be collapsed into one
wildcard later.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 — closed.

---

## Success Criteria Verification

All Functional, Regression and Safety criteria verified in cycle 1 remain met; re-verified by the
full suite (58/58) and `npm run ci` (exit 0). No criterion regressed. Two additions this cycle:

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| A broken instrument does not read as a clean gate | fires | fires | PASS |
| `absent` and an empty reading stay distinct branches | structural | asserted | PASS |

---

## NFR Assessment

### Security — PASS (`evidence: measured`, `probes_executed: 24`)

Cycle 2 executed 24 probes: cycle 1's 15 re-run against the amended program, plus 9 new — a broken
reader against both a FAIL gate and a clean gate, the case's exhaustiveness over each emitted
reading, and four mutations, two of them targeting the new branch itself.

It found TASK82-003 **and** the defect in its first fix. Neither was findable by reading; both came
from running the thing.

**Still not covered**: execution under **zsh**. The suite spawns bash only. Named in both gates
rather than left implicit in a PASS.

### Reliability — PASS (improved this cycle)

The probe now fails **open** when the instrument is broken, and closed only when the gate is
genuinely readable and clean. The two are distinct `case` branches, asserted structurally.

### Performance — PASS

One awk invocation per evaluation, unchanged. 58 tests in 0.42s.

### Maintainability — PASS (was CONCERNS)

The triplicated snippet shrank; the reasoning moved once into the single-source file; the threshold
for abandoning copy-paste entirely (a fourth constraint) is now written into the rule rather than
left in a gate nobody re-reads.

---

## Code Review

**Correctness bugs (1):** TASK82-003, promoted to the gate — see above.

**Cleanups (0):** none this cycle.

### Mutation-Proof Spot Check — 7/7 red

| # | Mutation | Result |
| --- | --- | --- |
| M1 | missing `evidence:` key reads as `reasoned` | 3 red |
| M2 | a gate claiming `measured` with `probes_executed: 0` | corpus check red |
| M3 | clause 1 narrowed back to `status` only | 4 red |
| M4 | reintroduce a whole-record reference | 2 red |
| M5 | reintroduce an apostrophe in a comment | 20 red |
| M6 | broken-reader catch-all made a silent no-op | 2 red |
| M7 | catch-all placed *before* the clean readings | 20 red |

M6 and M7 are the new branch's own proofs, and M7 is the mutation that reproduces the defect found in
the first fix.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full parity suite | PASS — 58/58 (34 before this task) |
| `npm run ci` | PASS — exit 0 |
| Bundled mirrors | PASS — `npm run bundle` in sync across 126 skills |
| Gate 1 still resolves correctly under the amended probe | PASS — `OK measured`, does not fire |
| Gate 2 under its own shipped probe | PASS — `OK measured`, does not fire |

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every cycle-1 finding verified fixed; the maintainability CONCERNS resolved; one new
MEDIUM found by the refute pass, fixed, and pinned by three tests plus two mutations. No open
issues, no NFR below PASS.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None.

---

**Next Steps**: Step 5c — `/review-pr`, the QA loop's exit gate.
