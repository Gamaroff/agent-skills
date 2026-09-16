# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.16.session-handoff-skill.yml](./task.110.gate.16.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 16 re-reviews the cycle-15 fix (`9cf723a6`: jest `--reporters` dropped; own-property table
lookups; a throwing rule is one unverifiable line) and, because gate 15's security axis was
`FAIL / measured`, runs unscoped. **The cycle-15 fix holds**: bugs 21 and 22 are closed — the
greedy-reporters spelling and the prototype-key spellings are refused through the clone's own
verifier with no canary and a completed run, all three mechanisms are mutation-proven, and of the
3,653 prior spellings only the five intended jest decisions moved.

One new defect of the value-flag class: tsc's `-p` / `--project` are declared **bare** while tsc
consumes the next token as the project path, so `npx tsc -p --noEmit` satisfies the required flag
and tsc never sets it — executed, emitted into the tree under a directory named `--noEmit`
(bug.23, held at **MEDIUM**: the repository model matches no real project). Two LOW: prettier
resolves a string-valued data file as a module specifier (executed; no tracked file of that shape;
the in-repo-config class), and tsc `--pretty=` is dead. **No HIGH. CONCERNS (80/100).**

**Overall Assessment**: CONCERNS (80/100)
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document (`status: ready-for-review`, `pr_number: 408`)
- [x] Phases complete; tests passing (33/33; full suite green — `npm test` exit 0; bundle, prettier, validate exit 0)
- [x] Breaking changes: none
- [x] PR #408 OPEN, head `9cf723a6` = origin (the later `dd934a86` is the pause-hook docs commit)

### Review Methodology

Direct tools plus one read-only Explore reviewer over the whole code diff with the SAFETY RE-PROBE
directive, asked to walk every remaining bare, value-taking and file-loading flag against its
tool's parser, the `own()`/`npxPositionalsOk` interplay, and the tests for vacuity. Traceability
mapper skipped; Step 4b `no-executable-blocks` (obs #90).

```
Re-review scope: unscoped (prior gate: security FAIL / measured → SAFETY_REPROBE=true)
```

Reviewer: dispatched 22:24, returned 22:38 local (14m00s — past the 10-minute budget, not killed;
it was mid-verification in the installed parsers and the block was in hand before the gate).
Probe hygiene as before (clone9 pulled to `9cf723a6`, consumer9, `env -i`, throwaway HOME, local
listener — zero requests); the `--noEmit/` directory, `.zzrc`, `zz.yml`, `zzrep.js`, `__tests__/`
and canaries removed.

---

## Re-Review Context

| Gate-15 finding | Bug | Status | Evidence (cycle 16) |
| --- | --- | --- | --- |
| QA-1 HIGH — jest `--reporters` greedy array | bug.21 | **FIXED** — Closed | clone's verifier at `9cf723a6`, consumer9 with jest + `./zzrep.js`: `npx jest --ci --reporters default ./zzrep.js` → `unverifiable: not on whitelist: npx`, no canary; `npx jest --ci --silent` → `confirmed`. Regression: the five `--reporters` spellings moved to refused, nothing else. M1 (`--reporters=` re-admitted) → red — `covered` |
| QA-2 MEDIUM — prototype keys are rules; `__proto__` crashes | bug.22 | **FIXED** — Closed | `__proto__ x`, `constructor rm -rf x` → `unverifiable: not on whitelist`, run completes with a JSON object. M2 (`own()` → plain lookup), M3 (verify guard removed) → red — `covered` ×2 |

---

## New Findings This Cycle

Searched unscoped: the whole code diff through the reviewer; 3,653 prior spellings re-run; 4
in-process spellings on the tsc class; 11 executed end-to-end.

- **[MEDIUM]** `handoff-verify.mjs` tsc spec — `-p` / `--project` bare; tsc consumes the next
  token: `npx tsc -p --noEmit` and `--project --noEmit` admitted (`requireFlag` satisfied by the
  token tsc eats). Executed against consumer9 with `./--noEmit/{a.ts,tsconfig.json}`: both
  `confirmed`, `./--noEmit/zzout/a.js` emitted. Without the directory: exit 1, no emit. Held at
  MEDIUM on gate 11's ground (the repository model is contrived; the grammar defect is real).
  **bug.23** (reviewer CR-1).
- **[LOW]** prettier `--config <data file>` whose parsed value is a string → shareable-config
  module load: `.zzrc` = `./canary.mjs` imported (`CANARY-IMPORTED.txt`); `zz.yml` = `canary.mjs`
  (bare) did not resolve. The in-repo-config class already accepted for `tsbuildinfo`; document
  it (reviewer CR-2).
- **[LOW]** tsc `--pretty=` dead — `Unknown compiler option '--pretty=false'`, exit 1 (reviewer
  CR-3).

---

## Implementation Verification

| Phase | Status |
| --- | --- |
| Phase 1: contract | PASS |
| Phase 2: read mode is real | CONCERNS — bug.23 (executed under a contrived model) |
| Phase 3: write mode + wiring | PASS |

---

## Success Criteria Verification

Criteria 1–6 PASS; §10 risk (read-only whitelist) CONCERNS — one misdeclared value flag.

---

## Issues Found

**HIGH (0)** · **MEDIUM (1)** bug.23 · **LOW (2)** QA-2, QA-3

---

## NFR Assessment

- **Performance — PASS**: 33/33; full suite green (exit 0).
- **Reliability — PASS**: bug.22 closed; no orphaned children.
- **Security — CONCERNS** (measured; probes executed: 3,667 — 3,653 regression, 4 in-process, 11
  end-to-end, 3 mutation proofs, minus overlap). Zero requests on the listener.
- **Maintainability — CONCERNS**: one dead tsc entry; two misdeclared flags.

---

## Code Review

Explore subagent, unscoped. 3 findings (2 bugs, 1 cleanup). `boundary: true`.

```
mutation-proven: --reporters= re-admitted       → whitelist: mutating shapes … refused → covered
mutation-proven: own() bypassed (plain lookup)  → whitelist: mutating shapes … refused → covered
mutation-proven: verify guard removed (rethrow) → verify: a rule that throws …        → covered
```

**Platform variance:** `TMPDIR=/tmp` → 33/33.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — one MEDIUM (bug.23), no HIGH; NFR security and maintainability CONCERNS.
The cycle-15 fix holds; the residue is one more flag whose grammar the spec misdescribes, and it
is the last such flag the reviewer could find after walking every tool's parser.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug.23 closed; QA-2 documented; QA-3 dropped.

**On the loop.** HIGH per gate (6–16): 1 1 1 1 0 0 0 0 1 1 0. No strike. The findings have
narrowed from executed writes on realistic repositories (cycles 14–15) to an executed write on a
contrived one; each fix has held.

---

**QA Report**: co-located at `task.110.qa.16.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.16.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 16 → cycle 17 → 5c.
