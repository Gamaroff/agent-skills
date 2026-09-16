# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.11.session-handoff-skill.yml](./task.110.gate.11.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 11 re-reviews the cycle-10 fix (`e4d0a8a9`: the `name` kind deleted in favour of per-tool
closed sets of stdout-only reporters and formatters; the jq `//` loophole closed; the `data`
dotfile alternative narrowed). Gate 10's security axis was `CONCERNS / measured`, so the
safety carve-out does not fire and the review runs at the **default narrowed scope** — files
changed since gate 10 — plus QA's own re-run of every prior spelling.

**The cycle-10 fix holds.** Bugs 17 and 18 are closed: `npx mocha -R zzrep t.js` with a
root-level `zzrep.js` present, `-R index`, `--reporter=html`, `--reporters=jest-junit` and
`jq -n null//env` under a canary secret are all refused through the clone's *own* verifier and
the consumer-shaped project; all nine cycle-10 mechanisms are mutation-proven `covered`; the
3,653 prior spellings re-run moved only where intended. **Bugs 1–18 are now all closed; no HIGH,
no MEDIUM.**

Four LOW residues, none executed and none a reachable write or egress on any installed tool: the
shared dotfile alternative gives eslint's `-c` an extensionless shape ESLint 9 would `import()`
(reviewer CR-1); `ESLINT_FORMATS` lists seven names ESLint 9 removed from core, which now resolve
package-first (CR-2); `VITEST_REPORTERS` lists `basic`, removed in Vitest 4 (CR-3); a stale header
comment and two dead `PATTERN_FLAGS` entries (CR-4/5). Security PASS (measured); maintainability
CONCERNS → gate rule 4 → **CONCERNS** (80/100) with an open queue of one-line refinements → one
more `/qa-fix`.

**Overall Assessment**: CONCERNS (80/100)
**Deployment Recommendation**: APPROVED (staging) / CONDITIONAL (production) on QA-1..QA-4

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists (`status: ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (31/31; full suite 3301 pass / 0 fail / 1 skipped)
- [x] Breaking changes documented (§5: none)
- [x] Code on feature branch with open PR (#408, head `e4d0a8a9` = origin)

### Testing Approach

- [x] Manual Testing — executed probes through the clone's own verifier at `e4d0a8a9` and the consumer-shaped project
- [x] Automated Testing — `npm test`, skill suite, `TMPDIR=/tmp`
- [ ] Performance Testing — timings only
- [x] Regression Testing — 3,653 prior spellings re-run and diffed; gate-6..10 executed spellings; bundle / prettier / validate
- [x] Security Review — nine mutation proofs; 19 executed end-to-end
- [x] Code Review — Explore subagent over the fix diff (default narrowed scope)

### Review Methodology

Direct tools plus one read-only Explore reviewer. Traceability mapper skipped (no Success Criteria
table). Step 4b: `no-executable-blocks` (unchanged; obs #90).

```
Re-review scope: since 2026-09-15T16:45:00Z (default) — gate 10 security CONCERNS / measured; clauses 1–3 do not fire
```

Reviewer: dispatched 16:49, returned 16:54 (4m52s, in budget). Probe hygiene as in cycles 9–10:
`clone9` pulled to `e4d0a8a9`, `consumer9` (mocha + prettier), `env -i` with a throwaway HOME and
`CANARY_SECRET`, listener on 127.0.0.1:8099 (zero requests); artefacts removed; nothing under
`~/.claude/projects/` or `~/.cache`.

---

## Re-Review Context

| Gate-10 finding | Bug | Status | Evidence (cycle 11) |
| --- | --- | --- | --- |
| QA-1 MEDIUM — reporter `name` kind: mocha cwd fallback; vitest/jest writing reporters | bug.17 | **FIXED** — Closed | consumer9 with root-level `zzrep.js`: `npx mocha -R zzrep t.js`, `-R index t.js` → refused, no canary; `-R spec` runs. Clone: `--reporter=html`, `--reporters=jest-junit` refused; `shellcheck -f gcc -S warning -s bash <file>` runs. Mutations M1–M6 (each set widened to the bare-name shape; vitest admitting html/blob) → red — `covered` ×6 |
| QA-2 MEDIUM — `jq -n null//env` | bug.18 | **FIXED** — Closed | Clone under `CANARY_SECRET`: `null//env`, `env` → refused, measured empty; `.name package.json` `confirmed`. Reviewer: `[env]`, `{a:env}`, `(env)`, `1+env`, `env.HOME`, `.a\|env`, `"\(env)"` refused; `envs`, `input`, `@base64d` admitted. M7 (`/` exemption restored) → red — `covered` |
| QA-3 LOW — `data` dotfiles judged by name | — | **FIXED**, one shape left | `.env` refused; `.prettierrc`, `.eslintrc`, `.gitignore`, `.nvmrc` admitted. M8 (any dotfile name) → red — `covered`. Residue: the alternative is shared, so eslint `-c .zzrc` is admitted (→ this cycle's QA-1) |
| QA-4 LOW — `DATA_FILE` cosmetics | — | **FIXED** | `.js`, `..json`, `x..json` refused. M9 (`..` inside a basename) → red — `covered` |

---

## New Findings This Cycle

Searched at the default narrowed scope (gate 10: security CONCERNS / measured): the fix diff
(252 lines) through the reviewer, which probed ~40 further spellings in-process; QA re-ran the
3,653 cycle-9/10 spellings and diffed the decisions (five moved, all intended: three package-name
formatters and two `env`-segment paths now refused); 19 spellings executed end-to-end.

- **[LOW]** `handoff-verify.mjs:223` (`DATA_FILE`) — the dotfile alternative is shared across tools,
  so `npx eslint -c .zzrc .` / `-c .gitignore .` are admitted; ESLint 9 `import()`s whatever `-c`
  names and Node parses an extensionless file as JavaScript (reviewer CR-1, rated high/medium —
  held at LOW: not executed, no tracked dotfile carries JS, and ESLint 9 accepts no data config at
  all, so the right per-tool answer is `.json/.jsonc/.yaml/.yml` only).
- **[LOW]** `handoff-verify.mjs:230` (`ESLINT_FORMATS`) — seven legacy names ESLint 9 removed from
  core resolve `eslint-formatter-<name>` package-first (CR-2; an installed package is the same
  trust as the tool).
- **[LOW]** `handoff-verify.mjs:235` (`VITEST_REPORTERS`) — `basic` removed in Vitest 4 (CR-3).
- **[LOW]** `handoff-verify.mjs:946`, `:151` — stale header comment; dead `--severity`/`--shell`
  in `PATTERN_FLAGS` (CR-4/CR-5, cleanups).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract | PASS | Verified | SKILL.md rows match; the eslint/vitest lists to be trimmed with QA-2/3 |
| Phase 2: read mode is real | PASS | Verified | Bugs 1–18 closed; every executed spelling from gates 6–10 refused; the residues are unexecuted set refinements |
| Phase 3: write mode + wiring | PASS | Verified | `bundle --check` 128/0 |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| 1. One verdict per figure; fixture reads `stale` on both annotated lines | yes | yes | PASS |
| 2. `--json` follows the `reason` / exit-code contract | yes | yes | PASS |
| 3. Write mode fixed section order; traps section a pointer | yes | yes | PASS |
| 4. Tests run under `npm test` and in CI | yes | yes | PASS |
| 5. `quick_validate.py`; catalog and deps regenerate to no diff | yes | yes | PASS |
| 6. AGENTS.md names the read mode | yes | yes | PASS |
| §10 risk: the whitelist is read-only | yes | yes (measured) | PASS — no reachable write or egress on any tool installed here or in the consumer-shaped project; the LOW residues are version-drift in the closed sets |

---

## Breaking Changes Validation

None declared (§5). **Assessment: PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (0)

None.

### LOW Severity Issues (4)

- **QA-1** eslint `-c` shares the dotfile alternative; ESLint 9 imports whatever `-c` names (CR-1) → eslint config `.json/.jsonc/.yaml/.yml` only.
- **QA-2** `ESLINT_FORMATS` legacy names resolve package-first on ESLint 9 (CR-2) → trim to the core four.
- **QA-3** `VITEST_REPORTERS` `basic` removed in Vitest 4 (CR-3) → drop.
- **QA-4** stale header comment; dead `PATTERN_FLAGS` entries (CR-4/5).

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 4

---

## NFR Assessment

### Performance — PASS
31/31 in 4.9 s; full suite 3301/3302.

### Reliability — PASS
Listener empty; no orphaned children; JSON contract holds.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 3,672 — 3,653 regression re-run, 19 end-to-end, 9 mutation proofs (the reviewer's ~40 in-process decisions not counted).
- Bugs 1–18 closed; every executed spelling from gates 6–10 refused; the residues are unexecuted refinements of closed sets.

### Maintainability — CONCERNS
The NPX_TOOLS header still says `name`; two dead `PATTERN_FLAGS` entries; two closed sets carry names the current tool versions no longer treat as built-ins. One-line edits each.

---

## Code Review

Explore subagent, default narrowed scope. 5 findings (3 bugs, 2 cleanups). `boundary: true`.
`probes_executed: 3672`.

- [high/medium] `:223` — CR-1 eslint `-c .zzrc` → QA-1 (held at low; see above).
- [medium/high] `:230` — CR-2 legacy eslint formatter names → QA-2 (low).
- [low/medium] `:235` — CR-3 vitest `basic` → QA-3 (low).
- cleanups `:946`, `:151` — CR-4/5 → QA-4.

**Mutation proofs (all nine cycle-10 mechanisms; snapshot → mutate → run → restore; baseline
31/31 before and after; each target exactly once):**

```
mutation-proven: MOCHA_REPORTERS widened to a shape        → whitelist: mutating shapes … refused → covered
mutation-proven: VITEST_REPORTERS admits html|blob         → whitelist: mutating shapes … refused → covered
mutation-proven: JEST_REPORTERS widened to a shape         → whitelist: mutating shapes … refused → covered
mutation-proven: ESLINT_FORMATS widened to a shape         → whitelist: mutating shapes … refused → covered
mutation-proven: STYLELINT_FORMATTERS widened to a shape   → whitelist: mutating shapes … refused → covered
mutation-proven: SHELLCHECK_FORMATS widened to a shape     → whitelist: mutating shapes … refused → covered
mutation-proven: jq `/` exemption restored                 → whitelist: mutating shapes … refused → covered
mutation-proven: dotfile alternative any name              → whitelist: mutating shapes … refused → covered
mutation-proven: `..` inside a basename admitted           → whitelist: mutating shapes … refused → covered
```

**Platform variance:** `TMPDIR=/tmp` → 31/31.

---

## Regression Testing

| Area | Result |
| --- | --- |
| 3,653 cycle-9/10 spellings, diffed against gate 10 | PASS — 5 intended moves, 0 collateral |
| Gate-6..10 executed spellings through the clone's own verifier | PASS — all refused |
| Full hermetic suite / bundle / prettier / validate | PASS |

---

## Test Artifacts

### Test Commands Executed
```bash
command npm test && command npm run bundle -- --check && command npx prettier --check . && python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff
command node --test --test-reporter=tap skills/session-handoff/tests/handoff-verify.test.js   # ×11 (baseline, 9 mutations, restore)
TMPDIR=/tmp command node --test skills/session-handoff/tests/handoff-verify.test.js
command node scratchpad/probe9.mjs; command node scratchpad/probe10.mjs   # diffed against cycle-10 output
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=<throwaway> CI=1 CANARY_SECRET=… npm_config_registry=http://127.0.0.1:8099 \
  node skills/session-handoff/scripts/handoff-verify.mjs <probe>.md --json [--cwd consumer9]   # probes 11-a, 11-b
```

---

## Recommendations

### Immediate Actions (Non-blocking for staging)
1. QA-1..QA-4 — one-line refinements to the closed sets, the header comment and `PATTERN_FLAGS`.

### Short-term Actions
1. Scrubbed child environment (future); quoted-glob tokenising (cycle-9 CR-6).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 4 — maintainability CONCERNS; no HIGH, no MEDIUM; security PASS (measured). The queue holds four LOW refinements, so the gate routes to `/qa-fix` once more rather than to 5c; the diminishing-returns exit does not apply (the residue is not test machinery).
**Quality Score**: 80/100

**Deployment Recommendation**: APPROVED (staging) / CONDITIONAL (production)
**Conditions**: QA-1..QA-4 closed.

**On the loop.** HIGH per gate: 3 → 7 → 0 → 0 → 0 → 1 → 1 → 1 → 1 → 0 → **0**. MEDIUM: … → 2 → 2 →
**0**. Converging.

---

**QA Report**: co-located at `task.110.qa.11.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.11.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 11 (four one-liners) → cycle 12 → 5c `/review-pr`.
