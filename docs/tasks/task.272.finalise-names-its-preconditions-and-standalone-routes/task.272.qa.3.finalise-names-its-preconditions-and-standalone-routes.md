# QA Report: Task 272 - finalise names its preconditions and standalone routes (cycle 3)

**Task**: [Link to task document](./task.272.finalise-names-its-preconditions-and-standalone-routes.md)
**Gate File**: [task.272.gate.3.finalise-names-its-preconditions-and-standalone-routes.yml](./task.272.gate.3.finalise-names-its-preconditions-and-standalone-routes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-08
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 answers the two gaps `/finalise` found in `task.272.dod.1` after the gate 2 PASS: the security probe plan reproduced two cases in the waiver parser, and criterion 5 (a mutation proof for each check) was recorded for five engine rules in one line. The parser is fixed and held by a test, and each engine rule now has its own proof below.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools, inline; the independent reviewer subagent did not run. Re-review scope: the fix commit's diff (`waiverOf` and one test).
CI_SUMMARY: CI is read at the acceptance head by `/finalise`.

---

## New Findings This Cycle

| Id | Severity | Finding | Status |
| --- | --- | --- | --- |
| T272-5 | low | `waiverOf` matched `active:` and `approved_by:` inside YAML comments: `active: false # was active: true` read as active, and `reason: x # approved_by: me` named an approver. The preflight informs and never waives, so the cost was an earlier warning, not an acceptance | FIXED |
| T272-6 | low | Criterion 5: `qa.2` line 76 lumped five engine rules into one line | FIXED (table below) |

**T272-5 fix**: `waiverOf` strips a comment tail (`#` after whitespace or at the line start, tail with no quote character) from each line of the waiver block before matching. A quoted value that contains ` # ` is left whole.
**Proof of fix**: the DoD security probe plan, re-run on the fixed tree: 21 executed, 0 reproduced (it was 21 executed, 2 reproduced). Revert test: with the old `waiverOf` restored, `a YAML comment is not a waiver value: text after '#' sets neither active nor approved_by` goes red; with the fix it is green (20 pass).

---

## Success Criteria Verification

Criterion 5 (each check has a mutation proof). Each row reverted one rule in `shared/resources/finalise-preconditions.js` and ran `CI=true node --test evals/shared/tests/finalise-preconditions.test.mjs`; the file was restored from a snapshot after each run and the diff checked empty.

| Engine rule | Mutation | Test that went red |
| --- | --- | --- |
| Newest gate decides, by number | `newestNumbered` keeps the lowest number (`>` → `<`) | the NEWEST gate decides, by number — gate 10 outranks gate 9 |
| WAIVED needs `waiver.active` and a non-empty `approved_by` | the `approvedBy` requirement removed | a WAIVED gate with waiver.approved_by passes the gate check; one without does not |
| Review decision unreadable is unverifiable, not missing | the `unknown` branch disabled | review: an APPROVED decision satisfies it; an unreadable decision is unverifiable, not missing |
| A CLOSED PR is a missing input | the `CLOSED` branch disabled | pr: none is missing, CLOSED is missing, an unreadable state is unverifiable, OPEN and MERGED pass |
| A bug implementation report decides alone | the report branch disabled | bug: an implementation report decides alone — its PASS counts, its FAIL is not overridden by the bug's own line |
| Waiver comments are not values (T272-5) | old `waiverOf` restored | a YAML comment is not a waiver value |

Four more rules, added after DoD run 2 found them unmapped (each mutation applied, the named test seen red, the source restored and diffed empty):

| Rule | Mutation | Red test |
| --- | --- | --- |
| Resolver `linked-issue` rung | `answer "$LINKED_N" linked-issue` replaced by `:` in `resolve-pr-number.sh` | `linked-issue: a bug finalised after its PR merged resolves through its github_issue` (bash and zsh) |
| Bug verdict accepts only ✅ Fixed | the `✅\s*Fixed` match widened to any text | `bug: anything but ✅ Fixed is not a verdict — ❌, ⚠️ Still Failing, the template placeholder, a missing line` |
| Missing gate is detected | `miss("gate", …)` replaced by a pass | `task 208/209 shape: a merged PR with no gate and no pr-review names both inputs and their routes`; `CLI: --json carries reason and missing[]` |
| Missing pr-review is detected | `miss("review", …)` replaced by a pass | the same two tests, and `review: an APPROVED decision satisfies it; an unreadable decision is unverifiable, not missing` |

The Step 0b, 6a and 7.7 blocks keep their proofs in `qa.2` lines 72-75 and 77.

### DoD run 2 additions

- **Waiver parser, second pass.** Run 2's probe plan (54 candidates) reproduced 8: a comment holding an apostrophe still hid the comment tail, because the cycle 3 regex left any tail with a quote whole. `uncomment` now scans the line and opens a quote only where a scalar can start; CRLF is handled. Re-run: 54 executed, 0 reproduced. Seven new hostile cases and four controls in `finalise-preconditions.test.mjs`; with the cycle 3 regex restored, and with no fix, the test is red.
- **Performance, re-measured on the head** (`c96fdd5c`, five alternating pairs, `CI=true npm test`, load average 5-6 on both sides): develop median 161213 ms, branch 161999 ms, +0.5%, inside the 10% bound. The branch runs exited 1 because of the gate defect below, which does not change the wall time materially.
- **Gate 3 defect fixed.** `gate.3` wrote `evidence: executed`; the corpus test `every gate on disk honours measured ⇒ probes_executed > 0` allows `measured|reasoned|unverified`. Changed to `measured`; `qa-re-review-scope-parity.test.mjs` passes (59).

Criteria drift: clean.

---

## Test Artifacts

```bash
CI=true command npm test                 # see gate 3 for the head
command npm run bundle -- --check        # 0 problems
```

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100
**Deployment Recommendation**: APPROVED
