# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.15.session-handoff-skill.yml](./task.110.gate.15.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 15 re-reviews the cycle-14 fix (`72bf03b4`: the universal npx positional rule; `CI` forced)
and, because gate 14's security axis was `FAIL / measured`, runs unscoped. **The cycle-14 fix
holds**: bugs 19 and 20 are closed — every cycle-14 spelling is refused through the clone's own
verifier under an inherited `CI=false` (no emit, no snapshot), all four mechanisms are
mutation-proven, and the 3,653 prior spellings moved nowhere.

Two new defects, both distinct from anything a prior cycle touched: jest's `--reporters` is a
**greedy yargs array** option, so a following "test path" positional is loaded as a reporter module
— `npx jest --ci --reporters default ./zzrep.js` executed `./zzrep.js` through read mode (bug.21,
HIGH); and the spec tables are plain objects, so `constructor`/`toString` resolve as rules and
`__proto__ x` **crashes the run** (bug.22, MEDIUM). **FAIL (50/100).**

**Overall Assessment**: FAIL (50/100)
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document (`status: ready-for-review`, `pr_number: 408`)
- [x] Phases complete; tests passing (32/32; full suite 3302/3302)
- [x] Breaking changes: none
- [x] PR #408 OPEN, head `72bf03b4` = origin

### Review Methodology

Direct tools plus one read-only Explore reviewer over the whole code diff with the SAFETY RE-PROBE
directive, asked to walk every bare flag against its tool's parser for value-taking and
array/greedy semantics. Traceability mapper skipped; Step 4b `no-executable-blocks` (obs #90).

```
Re-review scope: unscoped (prior gate: security FAIL / measured → SAFETY_REPROBE=true)
```

Reviewer: dispatched 19:13, returned 19:24 (10m55s — marginally past budget, not killed; block in
hand before the gate). Probe hygiene as before; artefacts removed.

---

## Re-Review Context

| Gate-14 finding | Bug | Status | Evidence (cycle 15) |
| --- | --- | --- | --- |
| QA-1 HIGH — npx positional read as flag value / response file | bug.19 | **FIXED** — Closed | clone's verifier at `72bf03b4`, consumer9 under `CI=false`: `--noEmit null zz.ts`, `--noEmit @tsargs.txt`, `--noEmit false zz.ts`, `jest --ci false --silent`, `mocha zz.ts` → refused; no `zz.js`, no snapshot; `--noEmit zz.ts` `confirmed`. M1–M3 → red — `covered` ×3 |
| QA-2 MEDIUM — runner lets `CI=false` through | bug.20 | **FIXED** — Closed | `npx jest --silent` under `CI=false` fails on the missing snapshot instead of writing it. M4 → red — `covered` |
| QA-3 LOW — cap-test bound | — | **FIXED** | full suite green; the test ran in 145 ms |
| QA-4 LOW — tsbuildinfo / dead entries / comment | — | **FIXED** | documented; entries dropped; comment replaced by the universal rule's |

---

## New Findings This Cycle

Searched unscoped: the whole code diff through the reviewer; 3,653 prior spellings re-run (no
change); 8 in-process spellings on the two classes; 8 executed end-to-end.

- **[HIGH]** `handoff-verify.mjs` jest spec — `--reporters` is a greedy yargs array: `npx jest --ci
  --reporters default ./zzrep.js` parses as `reporters: [default, ./zzrep.js]` and jest requires
  `./zzrep.js` before any test runs. Executed: `confirmed`, canary written. **bug.21** (reviewer
  CR-1).
- **[MEDIUM]** `handoff-verify.mjs` `isAllowed`/`npxRule`/`gitRule` — plain-object tables: `constructor
  rm -rf x`, `toString anything`, `git hasOwnProperty x`, `npx constructor foo` admitted; `__proto__
  x` throws out of `isAllowed` and `verify`. Confirmed in-process. **bug.22** (reviewer CR-2).

---

## Implementation Verification

| Phase | Status |
| --- | --- |
| Phase 1: contract | PASS |
| Phase 2: read mode is real | FAIL — bug.21 (executed), bug.22 |
| Phase 3: write mode + wiring | PASS |

---

## Success Criteria Verification

Criteria 1–6 PASS; §10 risk (read-only whitelist) FAIL — bug.21 executed.

---

## Issues Found

**HIGH (1)** bug.21 · **MEDIUM (1)** bug.22 · **LOW (0)**

---

## NFR Assessment

- **Performance — PASS**: 32/32; 3302/3302.
- **Reliability — CONCERNS**: a `__proto__` line crashes the run (bug.22).
- **Security — FAIL** (measured; probes executed: 3,672 — 3,653 regression, 8 in-process, 8 end-to-end, 4 mutation proofs, minus overlap).
- **Maintainability — PASS**.

---

## Code Review

Explore subagent, unscoped. 2 findings (2 bugs). `boundary: true`.

```
mutation-proven: not-a-file rule removed     → whitelist: mutating shapes … refused → covered
mutation-proven: null re-admitted            → whitelist: mutating shapes … refused → covered
mutation-proven: @response re-admitted       → whitelist: mutating shapes … refused → covered
mutation-proven: CI defaulted not forced     → runner: CI is forced to 1 …          → covered
```

**Platform variance:** `TMPDIR=/tmp` → 32/32.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — one HIGH (bug.21, executed). The cycle-14 fix holds; the residue is a
parser semantic (greedy arrays) the specs do not model, and a table-lookup robustness defect.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.21, bug.22 closed.

**On the loop.** HIGH per gate (6–15): 1 1 1 1 0 0 0 0 1 1. No strike (gate 13 raised none).
Each residue is a distinct parser semantic; each fix has held.

---

**QA Report**: co-located at `task.110.qa.15.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.15.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 15 → cycle 16 → 5c.
