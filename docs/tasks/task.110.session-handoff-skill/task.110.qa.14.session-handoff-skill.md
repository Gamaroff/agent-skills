# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.14.session-handoff-skill.yml](./task.110.gate.14.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 14 re-reviews the review-driven cycle-13 fix (`e7eca2b4`: tsc refuses `true`/`false`; mocha
takes no positional; gh `--jq` held to the jq `env` rule; kill-on-cap; win32 fallback; trail fixes).
Gate 13's security axis read `PASS / measured`, so the carve-out does not fire mechanically — but
5c had just found an **executed HIGH on the boundary** one cycle after that measured PASS, which is
the exact situation the carve-out exists for. QA ran the re-probe **unscoped** by judgement and says
so here.

**The cycle-13 fixes hold**: all five mechanisms mutation-proven; `--noEmit false`, `mocha <file>`
and `gh --jq env` refused through the clone's own verifier; the 3,653 prior spellings moved only
where intended. **The class they closed one spelling of is still open**: a positional the specs
read as a file is read by the tool's parser as a flag *value* or a *response file* — `npx tsc
--noEmit null zz.ts` and `npx tsc --noEmit @tsargs.txt` (a repository file carrying `--noEmit
false`) both emitted, and `npx jest --ci false` wrote a snapshot; all three executed in the
consumer-shaped project (bug.19, HIGH). And the runner forces `CI=1` only when `CI` is unset, so an
inherited `CI=false` let `npx jest --silent` write a snapshot with no flag at all (bug.20, MEDIUM,
executed). Two LOW (the cap test's timing bound went red once under full-suite load; tsbuildinfo
under an incremental tsconfig) and two cleanups. **FAIL (50/100).**

**Overall Assessment**: FAIL (50/100)
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (`status: ready-for-review`, `pr_number: 408`)
- [x] All implementation phases completed
- [x] Tests passing (31/31 alone; full suite 3300 pass / 1 fail — the cap test's timing bound under load, QA-3)
- [x] Breaking changes documented (§5: none)
- [x] Code on feature branch with open PR (#408, head `e7eca2b4` = origin)

### Review Methodology

Direct tools plus one read-only Explore reviewer over the whole code diff with the SAFETY RE-PROBE
directive and an explicit instruction to walk every admitted flag against each tool's real parser.
Traceability mapper skipped (no Success Criteria table). Step 4b: `no-executable-blocks` (obs #90).

```
Re-review scope: unscoped — QA judgement (5c found an executed HIGH on the boundary after a measured PASS; gate 13 itself would not have fired the carve-out)
```

Reviewer: dispatched 18:12, returned 18:24 (12m06s — past the 10-minute budget, not killed; block
in hand before the gate). It verified the parsers against the installed TypeScript 6.0.3,
jest-cli 29.7 + yargs-parser 21.1.1, prettier 3.9.6 and vitest 4.1.11.

**Probe hygiene:** `clone9` at `e7eca2b4`; `consumer9` (typescript, jest, mocha, prettier
declared); `env -i` with a throwaway HOME; every probe artefact removed (`zz.js`, `zz.ts`,
`tsargs.txt`, `__tests__/`, snapshots). Nothing under `~/.claude/projects/` or `~/.cache`.

**QA touched a test file and reverted it.** While confirming QA-3, QA drafted the widened timing
bound in `handoff-verify.test.js`, then `git checkout`-ed it: the edit is qa-fix's, and it is
recorded in the gate as QA-3's suggested action rather than applied from the QA seat.

---

## Re-Review Context

| Cycle-13 5c finding | Status | Evidence (cycle 14) |
| --- | --- | --- |
| CR-1 HIGH — `npx tsc --noEmit false` emits | **FIXED** (spelling) — class open, bug.19 | `--noEmit false`, `--noEmit FALSE`, `--noEmit true` refused; clone + consumer9: `--noEmit false zz.ts` refused, no `zz.js`; `--noEmit zz.ts` `confirmed`. M1 → red — `covered`. But `--noEmit null` and `@tsargs.txt` emit — see New Findings |
| CR-2 MEDIUM — `npx mocha <file>` runs it | **FIXED** | `npx mocha skills/…/run-loop.mjs`, `npx mocha test`, `-t 5000 test` refused; `npx mocha -R spec -t 5000 --grep=x` admitted. Clone: refused. M2 → red — `covered` |
| CR-3 MEDIUM — gh `--jq env` | **FIXED** | `gh api /user --jq env`, `-q env`, `--jq=env`, `gh pr list --jq env`, `-q null//env` refused; `--jq .login`, `-q .state` admitted. Clone: refused. M3, M4 → red — `covered` ×2 |
| CR-4 LOW — win32 kill | **FIXED** (platform-only) | `taskkill /T /F` branch; untestable on darwin — mutation NO-RED by construction |
| CR-6 LOW — kill on cap | **FIXED** | the cap test now asserts the kill; M5 → red — `covered`. Its 10 s bound is load-sensitive (QA-3) |
| CR-5, PC-1..4 | **FIXED** | `expect: exit N` documented; report header/row/Completion current; `pr_number: 408`; CHANGELOG; §7 |

---

## New Findings This Cycle

Searched unscoped: the whole code diff through the reviewer (which walked every admitted flag
against each tool's installed parser); 3,653 prior spellings re-run and diffed; 16 boolean-value
spellings across every npx tool in-process; 11 executed end-to-end.

- **[HIGH]** `handoff-verify.mjs` npx specs — a positional the spec reads as a file is read by the
  tool as a flag value (`true`/`false`/`null`) or a response file (`@file`): `npx tsc --noEmit null
  zz.ts` → emit; `npx tsc --noEmit @tsargs.txt` → emit (every refused flag back through a repository
  data file); `npx jest --ci false` → snapshot written. All executed. Reviewer CR-1/2/3 folded.
  **bug.19.**
- **[MEDIUM]** `handoff-verify.mjs` `defaultRunner` — `CI: process.env.CI ?? "1"` lets an inherited
  `CI=false` through; `npx jest --silent` under `CI=false` wrote a snapshot with no flag. Executed.
  Reviewer CR-4. **bug.20.**
- **[LOW]** `handoff-verify.test.js` — the cap test's 10 s bound went red once under the full suite
  at concurrency 4 (20.2 s, the child's linger) while green 3/3 alone and at concurrency 4 over
  four files; the mechanism is proven, the bound is tight.
- **[LOW]** tsbuildinfo under an `incremental`/`composite` tsconfig (reviewer CR-5); dead
  `--jq`/`-q` entries in `GH_API_FLAGS` (CR-6); the tsc pattern's `/i` over-approximates (CR-7).

Harmless boolean-value spellings admitted today and worth the same universal rule: `npx vitest
--run false x`, `npx stylelint --quiet false src`, `npx prettier --check false .`, `npx jest
--silent false`, `npx shellcheck -x false y`, `gh pr list --draft false`.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phase 1: contract | PASS | rows current; the tsc row needs bug.19/QA-4 |
| Phase 2: read mode is real | FAIL | bug.19 (executed writes ×3), bug.20 (executed) |
| Phase 3: write mode + wiring | PASS | `bundle --check` 128/0 |

**Overall Phase Completion**: 2/3

---

## Success Criteria Verification

Criteria 1–6 PASS (unchanged); §10 risk (read-only whitelist) **FAIL** — bug.19, bug.20 executed.

---

## Breaking Changes Validation

None declared. **PASS.**

---

## Issues Found

**HIGH (1)** — bug.19 · **MEDIUM (1)** — bug.20 · **LOW (2)** — QA-3 cap-test bound, QA-4 tsbuildinfo + cleanups

---

## NFR Assessment

- **Performance — PASS**: 31/31 alone; full suite 3300/3301 (the one red is QA-3's timing bound).
- **Reliability — CONCERNS**: kill-on-cap holds but its test is load-sensitive; the CI promise is conditional (bug.20).
- **Security — FAIL** (evidence: measured; probes executed: 3,680 — 3,653 regression, 16 boolean-value, 11 end-to-end, 5 mutation proofs).
- **Maintainability — PASS**: two dead entries and one over-precise comment (QA-4).

---

## Code Review

Explore subagent, unscoped with the re-probe directive. 7 findings (5 bugs, 2 cleanups).
`boundary: true`. `probes_executed: 3680`.

- [high/high ×3] CR-1 tsc `null`; CR-2 tsc `@response`; CR-3 jest `--ci false` → **promoted as one class, QA-1 / bug.19** (all executed by QA).
- [medium/medium] CR-4 runner `CI ?? "1"` → **QA-2 / bug.20** (executed).
- [low/medium] CR-5 tsbuildinfo; cleanups CR-6/CR-7 → QA-4.

```
mutation-proven: tsc true/false pattern removed       → whitelist: mutating shapes … refused → covered
mutation-proven: mocha positional re-admitted         → whitelist: mutating shapes … refused → covered
mutation-proven: gh api --jq unguarded                → whitelist: mutating shapes … refused → covered
mutation-proven: gh list/view --jq unguarded          → whitelist: mutating shapes … refused → covered
mutation-proven: kill-on-cap removed                  → runner: output beyond the cap …        → covered
mutation-proven: win32 branch removed                 → (no red on darwin — platform-only)    → not-run
```

**Platform variance:** `TMPDIR=/tmp` → 31/31.

---

## Regression Testing

| Area | Result |
| --- | --- |
| 3,653 prior spellings, diffed against gate 13 | PASS — only the intended mocha moves |
| Gate-6..13 executed spellings (sample through the clone) | PASS |
| Full suite | 3300 / 1 (QA-3) · bundle / prettier / validate PASS |

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — one HIGH (bug.19, executed writes on two tools). The cycle-13 fix closed
one spelling of a class the specs do not model; the universal rule (no `true`/`false`/`null`, no
`@file` as an npx positional) closes the class.
**Quality Score**: 50/100

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.19, bug.20 closed.

**On the loop.** HIGH per gate: … 1 → 1 → 0 → 0 → 0 → 0 → **1** (gates 6–14). Not a strike
(gates 12 and 13 raised none). The finding is the parser-value class that 5c's tsc spelling first
exposed; one universal rule ends it.

---

**QA Report**: co-located at `task.110.qa.14.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.14.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 14 → cycle 15 → 5c.
