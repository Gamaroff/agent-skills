# QA Report: Task 89 — Cycle 2 (refute pass)

**Task**: [task.89.relationship-assertion-lint.md](./task.89.relationship-assertion-lint.md)
**Gate File**: [task.89.gate.2.relationship-assertion-lint.yml](./task.89.gate.2.relationship-assertion-lint.yml)
**Previous Gate**: [task.89.gate.1.relationship-assertion-lint.yml](./task.89.gate.1.relationship-assertion-lint.yml) — CONCERNS 90/100
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: PASS

---

## Executive Summary

CY1-1 is closed at the mechanism rather than patched, and the closure was verified by attacking it,
not by reading it. Both arms of the fix are independently mutation-proved, and — the part that
actually decides this gate — the corpus-level reachability sweep was proved **capable of failing**,
which a guard over a corpus that currently triggers nothing otherwise cannot demonstrate.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

**Direct tools, full refute pass over the whole branch diff** — per the cycle-2 rule, not narrowed to
the fixes. `PRIOR_GATES=1` → `REFUTE_PASS=true`. `SAFETY_REPROBE=false` (gate 1's security axis was
PASS).

**Re-review scope: unscoped (cycle 2 refute pass — whole `origin/develop...HEAD` diff).**

> **Same independence limitation as cycle 1, restated because it does not go away by being mentioned
> once.** Step 3b's subagent exists so the reviewer is not the author; this session's standing
> instruction not to dispatch subagents means the pass was again performed inline. Mitigated the same
> way — by execution: 6 regression probes, 3 new mutations, and a full re-derivation of every number.
> A constructed counter-example is indifferent to who wrote the code. It is still weaker than an
> independent reader, and cycle 1's finding was the kind an independent reader might have found
> sooner.

**Step 4b**: not applicable — 0 fenced bash blocks added to any `SKILL.md` or `shared/resources/*.md`.

---

## Re-Review Context

| Issue | Severity | Status | Evidence |
| --- | --- | --- | --- |
| **CY1-1** — scanner goes blind silently | MEDIUM | **FIXED** | Both arms mutation-proved (M11 5 red, M12 3 red); corpus sweep proved able to fail (M13); 6 regression probes clean |

### How the fix was verified, rather than accepted

| # | Mutation | Result | Proves |
| - | --- | --- | --- |
| M11 | Revert `>` from the value-position set | 26 pass / **5 fail** | the `=>`, `>`, backtick and escaped-slash arms |
| M12 | Revert the keyword arm | 28 pass / **3 fail** | the `return`, `typeof`, `case` arms |
| **M13** | Revert `>` **and** inject a real odd-quote line into a live corpus file | 25 pass / **6 fail**, naming `shared/resources/tests/tracker-workflow.test.mjs` | **the corpus sweep is a live guard, not vacuous-by-construction** |

M13 is the one that decides this gate. M11 and M12 only prove the *isolated probes* fire. The
corpus-wide sweep passes today because no live file carries the shape — which is exactly what a guard
that could never fire would also look like. M13 distinguishes them.

### Regression probes — does accepting `>`/`<` eat legitimate division?

Six constructed cases, each ending in an odd-quote string so a desync would be detectable, all clean:

| Probe | Result |
| --- | --- |
| `(a > b) ? total / 2 : 0` | ok |
| `(a < b) ? total / 2 : 0` | ok |
| `a > b && c / d > e` | ok |
| `obj.return / 2` | ok |
| `obj.of / 2` | ok |
| `(x >> 2) / 3` | ok |

A useful thing surfaced here: a **regex** misparse is bounded to one line (the scan bails at `\n`),
whereas a **string** misparse is not (strings span lines). CY1-1's severity came from the second, and
the fix closes the path that reaches it. That asymmetry was not stated in cycle 1 and is worth having
on the record.

---

## New Findings This Cycle

One, LOW.

- **[LOW]** `tests/lib/relationship-assertion-lint.js` — the keyword arm does not exclude **property
  access**. `obj.return / 2` sets `prevWord = "return"` (the `.` clears it, then the word re-accumulates),
  so the `/` is taken as a regex start and that line misparses. → Skip a word whose preceding
  significant character was `.`, *if the idiom ever appears*.

  **Not fixed, deliberately.** 0 occurrences in the corpus; the damage is bounded to one line; and any
  blindness it did cause is now **named** by the reachability guard rather than silent. Fixing it would
  add a branch to satisfy a case that does not exist, against a guard that already covers the
  consequence. Recorded so the next person meets the reasoning rather than the surprise.

Searched: full `origin/develop...HEAD` diff, 8 files. Re-enumerated the scanner's value positions and
the analyser's argument extraction independently, and re-derived every published number.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1. The detector | **PASS** | 11 rule units + 8 scanner guards green | CY1-1 closed; value positions now cover `>`, `<` and 14 keywords |
| 2. Historical fixture corpus | PASS | 8 fixture assertions green | unchanged this cycle |
| 3. False-positive triage | PASS | 4 raw findings, all 4 suppressed with reasons | re-derived at the new HEAD |
| 4. CI + documentation | PASS | `ci:fast` exit 0 | unchanged this cycle |

**Overall Phase Completion**: 4/4, no open issues.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Flags all six historical instances | 6/6 | 6/6, each by its assigned rule | PASS |
| Does not flag the two survivors | 0 | 0 | PASS |
| FP rate measured and reported | measured | 4 raw / 2191 sites, all suppressed → **0 unsuppressed**; recorded in README | PASS |
| Each rule mutation-proved | 4/4 | 4 rules + 4 further proofs (M5, M6, M11, M12) + M13 | PASS |
| Runs in `npm run ci`, no `package.json` change | yes | yes | PASS |
| `npm run ci` exits 0 | 0 | `ci:fast` exit 0 (2320 / 2319 / 0 fail / 1 skipped); `eval:all` exit 0 at cycle 1, untouched since | PASS |

---

## Issues Found

**HIGH: 0 · MEDIUM: 0 · LOW: 1** (the property-access edge above)

---

## NFR Assessment

### Reliability — PASS *(was CONCERNS)*
The silent-degradation path is closed for `=>`, `>`, `<` and 14 keywords. More importantly, any
*remaining* member of the class is now loud: the corpus sweep names the blind file, and M13 proves
that sweep can fire. A residual that announces itself is a different kind of risk from one that does
not.

### Performance — PASS
The sweep re-analyses each file a second time with the bait appended: the lint's own cost roughly
doubles to ~340ms. Immaterial against a 2320-test run, and it is precisely what buys the
non-silence.

### Security — PASS
Unchanged. Pure file reads throughout.

### Maintainability — PASS
The guard's own near-miss is documented at the definition of `VALUE_POSITIONS`, including why the
shapes must stay isolated. Someone who later tries to consolidate them back into one probe file will
find the reason not to, written where they will be standing.

---

## Code Review

**Correctness bugs (0).**

**Cleanups (1):**

- `tests/lib/relationship-assertion-lint.js` — the property-access edge above. Advisory; see the
  reasoning for leaving it.

**mutation-proven**: CY1-1 — **yes**, both arms independently (M11, M12), plus the corpus guard
itself (M13). Every mutation was confirmed applied with `diff` before its result was read.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `ci:fast` | exit 0 — 2320 tests / 2319 pass / 0 fail / 1 skipped |
| Lint suite | 31/31 |
| Corpus re-derivation | 89 files, 2191 call sites, 4 raw findings, **0 blind** |
| Division parsing after `>`/`<` | 6/6 probes clean |
| Tree integrity after the mutation battery | clean except the implementation report |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 100/100
**Rationale**: no HIGH, no MEDIUM, no NFR below PASS. The one LOW is theoretical, bounded, and
covered by a guard.

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c — `/review-pr` conformance review, the loop's exit gate.
