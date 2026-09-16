# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.17.session-handoff-skill.yml](./task.110.gate.17.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: PASS

---

## Executive Summary

Cycle 17 re-reviews the cycle-16 fix (`ce15f7c7`: tsc `-p`/`--project` as data value flags;
`--pretty=` dropped; shellcheck `-e` held to `SC` codes; the prettier string-config residual
documented). Gate 16's security axis was `CONCERNS / measured`, so the scope is the default
narrowing to the fix, plus QA's own regression re-run. **The fix holds**: bug.23 is closed — every
cycle-16 spelling is refused through the clone's own verifier with the `--noEmit/` directory
present and nothing emitted, all five mechanisms are mutation-proven, and of the 3,653 prior
spellings only the three intended decisions moved.

**Bugs 1–23 are all closed. No HIGH, no MEDIUM.** Two LOW cleanups are promoted from the reviewer:
jest/vitest `-t` is a value-taking option declared bare (no bypass — the parsers refuse or ignore
a following dash token; a consistency gap with the gate-16 mechanism), and the fix made a common
spelling unverifiable — `npx tsc --noEmit -p ./tsconfig.json` was admitted with `-p` bare and is
refused now because `DATA_FILE` admits no leading `./`. **PASS (90/100)**; open LOW entries route
to `/qa-fix` once more before 5c.

**Overall Assessment**: PASS (90/100)
**Deployment Recommendation**: APPROVED for staging; CONDITIONAL for production

---

## Testing Scope

### Prerequisites Verified

- [x] Task document (`status: ready-for-review`, `pr_number: 408`)
- [x] Phases complete; tests passing (33/33; full suite green — `npm test` exit 0; bundle, prettier, validate exit 0)
- [x] Breaking changes: none
- [x] PR #408 OPEN, head `ce15f7c7` = origin

### Review Methodology

Direct tools plus one read-only Explore reviewer over the cycle-16 fix diff (125 lines) with the
full code diff for context, asked to refute the fix: every spelling where tsc would consume a
required token, the data kind against what tsc loads, shellcheck's `-e` grammar, the bare-flag
audit claim against the installed parsers, test vacuity, and regressions. Traceability mapper
skipped; Step 4b `no-executable-blocks` (obs #90).

```
Re-review scope: default narrowed (prior gate: security CONCERNS / measured → SAFETY_REPROBE=false)
```

Reviewer: dispatched 22:54, returned 23:01 local (6m58s, in budget). Probe hygiene as before
(clone9 pulled to `ce15f7c7`, consumer9, `env -i`, throwaway HOME, local listener — zero requests);
the `--noEmit/` directory, `b.ts`, `x.sh` and canaries removed.

---

## Re-Review Context

| Gate-16 finding | Bug | Status | Evidence (cycle 17) |
| --- | --- | --- | --- |
| QA-1 MEDIUM — tsc `-p`/`--project` declared bare | bug.23 | **FIXED** — Closed | clone's verifier at `ce15f7c7`, consumer9 with `./--noEmit/{a.ts,tsconfig.json}`: `npx tsc -p --noEmit`, `--project --noEmit`, `--noEmit -p` → `unverifiable: not on whitelist: npx`, nothing emitted; `-p tsconfig.json --noEmit` → `confirmed`. M1 (`-p`/`--project` back to bare), M5 (value kind dropped) → red — `covered` ×2 |
| QA-2 LOW — prettier string-valued data config | — | **DOCUMENTED** | SKILL.md npx row and the prettier spec comment name the class beside `tsbuildinfo` |
| QA-3 LOW — tsc `--pretty=` dead | — | **FIXED** | `--pretty=false --noEmit` → refused. M2 → red — `covered` |
| (audit) shellcheck `-e` bare | — | **FIXED** | `-e --format=json x.sh` → refused; `-e SC2086,SC2046 x.sh` admitted. M3, M4 → red — `covered` ×2 |

---

## New Findings This Cycle

Searched: the fix diff through the reviewer; 3,653 prior spellings re-run (three intended moves);
8 in-process; 8 executed end-to-end.

- **[LOW]** jest `-t` (`testNamePattern`, `type: string`, `requiresArg: true`) and vitest `-t` are
  value-taking options declared bare: `npx jest -t --ci`, `npx vitest -t --run x` admitted. No
  bypass — jest's yargs errors "Not enough arguments following: t" (confirmed with the installed
  jest-cli 30.5.1); cac sets `-t` true and still sees `--run`. Consistency with the gate-16
  mechanism, which mocha already follows (reviewer CR-1 → QA-1).
- **[LOW]** `npx tsc --noEmit -p ./tsconfig.json` was admitted before the fix and is refused now:
  `DATA_FILE` admits no leading `./`, while a positional does. The pre-existing data-kind rule,
  surfaced on a common spelling (reviewer CR-2 → QA-2).
- **Advisory** `npx tsc -p tsconfig.json --noEmit src/x.ts` is admitted; tsc refuses the mix
  itself (TS5042) and the line reads stale with the exit code (reviewer CR-3 — left to tsc).

---

## Implementation Verification

| Phase | Status |
| --- | --- |
| Phase 1: contract | PASS |
| Phase 2: read mode is real | PASS |
| Phase 3: write mode + wiring | PASS |

---

## Success Criteria Verification

Criteria 1–6 PASS; §10 risk (read-only whitelist) PASS — bugs 1–23 closed; no reachable write or
egress in any executed arm.

---

## Issues Found

**HIGH (0)** · **MEDIUM (0)** · **LOW (2)** QA-1, QA-2

---

## NFR Assessment

- **Performance — PASS**: 33/33; full suite green (exit 0).
- **Reliability — PASS**.
- **Security — PASS** (measured; probes executed: 3,669 — 3,653 regression, 8 in-process, 8
  end-to-end, 5 mutation proofs, minus overlap). Zero requests on the listener.
- **Maintainability — PASS**: comments and SKILL.md match the code; the bug.23 audit sentence
  should be reworded when QA-1 lands.

---

## Code Review

Explore subagent, narrowed. 3 findings (0 bugs, 3 cleanups; 2 promoted, 1 advisory).
`boundary: true`.

```
mutation-proven: -p/--project back to bare       → whitelist: mutating shapes … refused → covered
mutation-proven: --pretty= re-admitted           → whitelist: mutating shapes … refused → covered
mutation-proven: shellcheck -e back to bare      → whitelist: mutating shapes … refused → covered
mutation-proven: SHELLCHECK_CODES widened        → whitelist: mutating shapes … refused → covered
mutation-proven: tsc project value kind dropped  → whitelist: mutating shapes … refused → covered
```

**Platform variance:** `TMPDIR=/tmp` → 33/33.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No HIGH, no MEDIUM; every NFR axis PASS; bugs 1–23 closed. Two LOW refinements
stay open in `top_issues`, so the loop takes `/qa-fix` once more before 5c.
**Quality Score**: 90/100

**Deployment Recommendation**: APPROVED for staging; CONDITIONAL for production
**Conditions**: QA-1, QA-2 closed.

**On the loop.** HIGH per gate (6–17): 1 1 1 1 0 0 0 0 1 1 0 0. No strike. The reviewer found no
bug this cycle; both open items are refinements of the mechanism that closed bug.23.

---

**QA Report**: co-located at `task.110.qa.17.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.17.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 17 (two LOW) → cycle 18 → 5c.
