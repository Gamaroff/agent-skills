# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.10.session-handoff-skill.yml](./task.110.gate.10.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 10 re-reviews the cycle-9 fix (`efcd3ae3`: the fourth-strike mechanism replacement — an
`npx` flag value the tool loads is judged by **kind**, never by path; mocha/vitest subcommands
refused; empty quoted tokens kept) and, because gate 9's security axis was `FAIL / measured`, runs
another **unscoped safety re-probe**.

**The cycle-9 fix holds.** Bugs 14, 15 and 16 are closed: every cycle-9 spelling and every
gate-6/7/8 spelling, re-executed through the clone's *own* verifier at `efcd3ae3` under a stripped
environment with a listener, is refused — the consumer-shaped PRD's md5 unchanged, no canary, no
scaffold, zero requests. All twelve cycle-9 mechanisms are mutation-proven `covered`. **No HIGH
finding for the first time since gate 5.**

Two MEDIUM residues of the new mechanism, both narrower than anything a prior cycle found: the
`name` kind is a character class, and a *reporter* name is not one — mocha resolves a bare name
against the working directory (executed: a root-level module ran through read mode) and vitest/jest
ship built-in reporters that write files (bug.17; reviewer CR-2/CR-3); and the jq `env` refusal
exempts a `/` before the word, which is jq's `//` operator, so `jq -n null//env` printed the whole
environment (executed; bug.18; reviewer CR-1 — the QA-4 fix regressed on its own exemption). Two
LOW. Gate rule 2 → **CONCERNS** (70/100), open queue → `/qa-fix`.

**Overall Assessment**: CONCERNS (70/100)
**Deployment Recommendation**: CONDITIONAL (staging) / BLOCKED (production) until bug.17 and bug.18 close

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`)
- [x] All implementation phases completed
- [x] Tests passing (skill suite 31/31; full hermetic suite 3301 pass / 0 fail / 1 skipped)
- [x] Breaking changes documented (§5: none)
- [x] Code on feature branch with open PR (#408, head `efcd3ae3` = origin)

### Testing Approach

- [x] Manual Testing — executed probes through the CLI in the scratch clone (updated to `efcd3ae3`) and the consumer-shaped project
- [x] Automated Testing — `npm test`, skill suite, `TMPDIR=/tmp` variance
- [ ] Performance Testing — timings only
- [x] Regression Testing — the 3,367 cycle-9 spellings re-run and diffed; the gate-6/7/8/9 executed spellings; bundle / prettier / validate gates
- [x] Security Review — unscoped safety re-probe (286 fresh spellings on the new mechanisms, 23 executed, 12 mutation proofs)
- [x] Code Review — Explore subagent, SAFETY RE-PROBE directive, whole code diff + this cycle's fix diff

### Review Methodology

Direct tools plus one read-only Explore reviewer. Traceability mapper skipped (no Success Criteria
table). Step 4b: `no-executable-blocks` — unchanged (obs #90); the documented commands are what
the executed probes run.

```
Re-review scope: unscoped (prior gate: security FAIL / measured → SAFETY_REPROBE=true)
```

Reviewer: dispatched 16:26, returned 16:36 (10m08s — marginally past the 10-minute budget, not
killed; block in hand before the gate). It noticed the working tree changing under it — QA's
mutation proofs — and reviewed HEAD, which is the right call.

**Probe hygiene (obs #97):** `scratchpad/clone9` pulled to `efcd3ae3` (its own verifier used this
cycle); `scratchpad/consumer9` (mocha + prettier@3); `env -i` with no `claude` on PATH, a throwaway
HOME, `CANARY_SECRET`, `npm_config_registry` at the listener. Afterwards: nothing new under
`~/.claude/projects/` or `~/.cache`; the listener log stayed **empty** this cycle (the vitest line
was refused before npx ran); every probe artefact removed.

---

## Re-Review Context

| Gate-9 finding | Bug | Status | Evidence (cycle 10) |
| --- | --- | --- | --- |
| QA-1 HIGH — npx loader values load in-repo modules | bug.14 | **FIXED** — Closed | Clone's own verifier: the PRD spelling, the canary import, `npx eslint -c <shipped .js> .`, `npx mocha -R <shipped .js> x` → `unverifiable: not on whitelist: npx`; PRD md5 unchanged; no canary; `--config=.prettierrc` (data) ran and `confirmed`. 177 fresh kind spellings refused, 109 admitted. Mutations M1 (kind check removed), M2 (`data` admits `.js`), M3 (`name` admits a path), M12 (spaced `-c` not consumed) → red — `covered` ×4 |
| QA-2 MEDIUM — mocha/vitest subcommand positionals | bug.15 | **FIXED** — Closed | `npx mocha init out9` (consumer9, mocha installed) → refused, no `out9/`; `npx vitest init browser` refused before npx ran (no registry request). `npx mocha -R dot README.md` still runs. M4, M5, M6 → red — `covered` ×3 |
| QA-3 MEDIUM — tokenize drops empty quoted tokens | bug.16 | **FIXED** — Closed | `grep -c "" README.md; expect: 1` → `confirmed` (measured 1); `grep -c "a b README.md` → `unverifiable: unterminated quote`; `''`, `""""`, `"a b"c`, `test -z ""` correct in-process. M7, M8 → red — `covered` ×2 |
| QA-4 LOW — `jq -n env` | — | FIXED, **regressed** in one spelling | `jq -n env`, `jq -rn env.X` refused; M9 → red. But `jq -n null//env` admitted and executed → **bug.18** |
| QA-5 LOW — directory path stack trace | — | **FIXED** | `handoff-verify.mjs <dir> --json` → `{ reason: "missing", detail: "EISDIR" }`; M11 → red |
| QA-6 LOW — eval live driver last segment only | — | **FIXED** | `npm run eval:x:cli:y` refused; M10 → red |
| CR-4 / CR-5 cleanups | — | **FIXED** | `find … ! …` still admitted (positional); `date -r 0` refused honestly |
| CR-6 cleanup (quoted globs refused) | — | NOT FIXED (deliberately) | advisory |

---

## New Findings This Cycle

Searched unscoped (prior gate: security FAIL / measured): the full code diff (4,345 lines) and the
cycle-9 fix diff (526 lines) through the reviewer; the 3,367 cycle-9 spellings re-run and diffed
against gate 9's decisions (only the intended 16 changed; no collateral refusal); 177 refused-list
and 109 allowed-list spellings written against the **new** mechanisms — every loader flag × every
code extension, joined and spaced, dot-dot, absolute, empty; subcommand vocabulary with and without
`--run`; tokenize edge cases; jq `env` in every syntactic position; `eval:` segments; `date -r`;
12 admitted, triaged by hand; 23 executed end-to-end; mocha's reporter resolution read in
`node_modules/mocha/lib/mocha.cjs`.

- **[MEDIUM]** `handoff-verify.mjs:1035` (`NPX_TOOLS.mocha`) / `:1024` (`vitest`) / `:1011` (`jest`) —
  the `name` kind is a shape; a reporter name is not one: mocha falls back to
  `require(path.resolve(name))` (executed: `npx mocha -R zzrep t.js` ran a root-level `zzrep.js`
  through read mode — canary written); vitest `html`/`blob` and jest `jest-junit` write files
  (reviewer CR-3, not executed) → per-tool closed set of stdout-only built-ins. **bug.17.**
- **[MEDIUM]** `handoff-verify.mjs:1196` (`UTIL_SPECS.jq`) — the `env` refusal's `/` exemption is
  jq's `//` operator: `jq -n null//env` executed and `confirmed` against the canary secret →
  filter judged with no `/` exemption. **bug.18** (reviewer CR-1).
- **[LOW]** `handoff-verify.mjs:212` (`DATA_FILE`) — the `data` kind judges the name: eslint 9
  imports any `-c` file as code; prettier resolves a string-valued config as a module (reviewer
  CR-4, low/low, not executed) → dotfile allow-list by tool.
- **[LOW]** `DATA_FILE` cosmetics — `--config=.js`, `x..json` admitted as data (executed: prettier
  does not import a dotfile named `.js`; the `..` guard holds).

Reviewer CR-2 (mocha, high/high) is folded into bug.17 with CR-3; QA holds the severity at MEDIUM by
the same measure as bug.15 — it needs mocha installed and a root-level module; nil here, real in a
consumer. Reviewer CR-1 (high/high) held at MEDIUM: the class (CR-6 measured echo) has been
advisory since gate 8 and nothing posts the report; not LOW, because the fix regressed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract | PASS | Verified | npx/jq rows match the specs after the cycle-9 edit; the `name` comment overstates its guarantee (fix with bug.17) |
| Phase 2: read mode is real | CONCERNS | Partial | Every arm holds against the enumerated surface except two narrow residues (bug.17, bug.18) |
| Phase 3: write mode + wiring | PASS | Verified | `bundle --check` 128/0 |

**Overall Phase Completion**: 2/3 passed (phase 2 concerns)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. One verdict per figure; fixture reads `stale` on both annotated lines | yes | yes | PASS | |
| 2. `--json` follows the `reason` / exit-code contract | yes | yes | PASS | directory path now one JSON object |
| 3. Write mode fixed section order; traps section a pointer | yes | yes | PASS | |
| 4. Tests run under `npm test` and in CI | yes | yes | PASS | 3301/3302 |
| 5. `quick_validate.py`; catalog and deps regenerate to no diff | yes | yes | PASS | |
| 6. AGENTS.md names the read mode | yes | yes | PASS | |
| §10 risk: the whitelist is read-only | yes | nearly | CONCERNS | bug.17 (executed: an in-repo module run via a reporter name in a consumer-shaped project), bug.18 (executed: environment echoed) |

---

## Breaking Changes Validation

None declared (§5). **Assessment: PASS.**

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (2)

**Issue: the `name` kind admits reporter names that load a cwd module (mocha) or write files (vitest/jest)**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: [bug.17](./task.110.bug.17.reporter-name-kind-is-a-shape-not-a-closed-set.md)
- **Observation**: `npx mocha -R zzrep t.js` through the CLI ran `./zzrep.js` (canary written) in the consumer-shaped project; `-R index`, `--reporter=scripts`, `--reporter=html`, `--reporter=blob`, `--reporters=jest-junit` admitted.
- **Impact**: bug.14's class one tool narrower; nil here, real in a consumer with mocha + `index.js`.
- **Recommendation**: per-tool closed set of stdout-only built-ins. **Priority**: P2

**Issue: `jq -n null//env` bypasses the `env` refusal**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: [bug.18](./task.110.bug.18.jq-alternative-operator-bypasses-the-env-refusal.md)
- **Observation**: executed with `CANARY_SECRET`: `confirmed`, measured carries the whole environment.
- **Impact**: the QA-4 fix reopened by its own `/` exemption. **Priority**: P2

### LOW Severity Issues (2)

- **QA-3** `data` kind judges the name, not the tool's loader (reviewer CR-4): eslint 9 imports any `-c` file; prettier resolves a string-valued config as a module.
- **QA-4** `DATA_FILE` cosmetics: `.js` / `x..json` admitted as data (harmless, executed).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
Skill suite 31/31; full hermetic suite 190 s; `TMPDIR=/tmp` 31/31; CR-6 timeout test green.

### Reliability — PASS
Directory path → JSON; unterminated quote → `unverifiable`; no orphaned children; listener empty.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 3,676 — 3,367 regression re-run, 286 fresh in-process, 23 end-to-end, 12 mutation proofs (the reviewer's ~95 in-process decisions are not counted).
- The read-only invariant holds through every arm against the enumerated surface; two residues, both executed in a consumer-shaped setting and nil in this repository. No egress; no write to this tree.

### Maintainability — PASS
The identity principle reads the same in both interpreter arms and the npx arm; SKILL.md matches; the `name` comment needs the bug.17 correction.

---

## Code Review

Explore subagent, SAFETY RE-PROBE directive. 4 findings (4 bugs, 0 cleanups). `boundary: true`.
`probes_executed: 3676`.

**Correctness bugs (4):**
- [high/high] `handoff-verify.mjs:1196` — CR-1 `jq -n null//env` → **promoted, QA-2 / bug.18** at medium (executed).
- [high/high] `handoff-verify.mjs:1035` — CR-2 mocha reporter cwd fallback → **promoted, QA-1 / bug.17** at medium (executed by QA independently).
- [medium/high] `handoff-verify.mjs:1024` — CR-3 vitest/jest writing reporters → folded into QA-1 / bug.17.
- [low/low] `handoff-verify.mjs:212` — CR-4 `data` dotfiles → QA-3.

**Mutation proofs (all twelve cycle-9 mechanisms; snapshot → mutate → run → restore; baseline
31/31 before and after; each target occurred exactly once):**

```
mutation-proven: kind check removed in valueOk           → whitelist: mutating shapes … refused → covered
mutation-proven: DATA_FILE admits .js/.mjs/.cjs          → whitelist: mutating shapes … refused → covered
mutation-proven: BARE_NAME admits `/` and `.`            → whitelist: mutating shapes … refused → covered
mutation-proven: vitest subcommand pattern removed       → whitelist: mutating shapes … refused → covered
mutation-proven: vitest --run no longer required         → whitelist: mutating shapes … refused → covered
mutation-proven: mocha init pattern removed              → whitelist: mutating shapes … refused → covered
mutation-proven: empty quoted token dropped again        → tokenize: … (gate 9, bug.16)         → covered
mutation-proven: unterminated quote tolerated again      → tokenize: … (gate 9, bug.16)         → covered
mutation-proven: jq env pattern removed                  → whitelist: mutating shapes … refused → covered
mutation-proven: EVAL_LIVE_DRIVER last-segment only      → whitelist: mutating shapes … refused → covered
mutation-proven: unreadable path throws again            → cli: missing file → reason=missing   → covered
mutation-proven: eslint -c no longer a valueFlag         → whitelist: read-only shapes pass      → covered
```

**Platform variance:** `TMPDIR=/tmp node --test skills/session-handoff/tests/handoff-verify.test.js` → 31/31.

---

## Regression Testing

| Area | Result |
| --- | --- |
| The 3,367 cycle-9 spellings, decisions diffed against gate 9 | PASS — 16 intended changes, 0 collateral |
| Gate-6/7/8/9 executed spellings through the clone's own verifier | PASS — all refused; no write, no request |
| 2026-09-10 fixture | PASS |
| Full hermetic suite | PASS — 3301 / 0 / 1 skipped |
| `bundle -- --check` / `prettier --check .` / `quick_validate` | PASS |
| Live `.agents/handoff.md` read mode (cycle 9, post-fix) | 15 confirmed / 3 stale / 2 unverifiable — no regression |

---

## Test Artifacts

### Files Reviewed
`handoff-verify.mjs` (whole), `handoff-verify.test.js`, `SKILL.md`, `node_modules/mocha/lib/mocha.cjs` (consumer9), `node_modules/prettier/index.mjs` (via the reviewer).

### Test Commands Executed
```bash
command npm test && command npm run bundle -- --check && command npx prettier --check . && python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff
command node --test --test-reporter=tap skills/session-handoff/tests/handoff-verify.test.js   # ×14 (baseline, 12 mutations, restore)
TMPDIR=/tmp command node --test skills/session-handoff/tests/handoff-verify.test.js
command node scratchpad/probe9.mjs; command node scratchpad/probe10.mjs
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=<throwaway> CI=1 CANARY_SECRET=… npm_config_registry=http://127.0.0.1:8099 \
  node skills/session-handoff/scripts/handoff-verify.mjs <probe>.md --json --timeout 30 [--cwd consumer9]   # probes 10-a…10-d
```

### Coverage Report
Not collected. 31 tests in the skill suite.

---

## Recommendations

### Immediate Actions (Blocking for production)
1. **bug.17** (P2) — reporter/formatter values as per-tool closed sets of stdout-only built-ins.
2. **bug.18** (P2) — jq filter refuses `env` with no `/` exemption (or a scrubbed child environment).

### Short-term Actions (Non-Blocking)
1. QA-3 dotfile allow-list for `data`; QA-4 `DATA_FILE` cosmetics; CR-6 quoted globs.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Rule 2 — two MEDIUM, no HIGH. The cycle-9 mechanism replacement holds and is proven; its two residues are narrower than any prior finding and one of them is a fix regression the loop should close before exit.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: bug.17 and bug.18 closed.

**On the loop.** HIGH per gate: 3 → 7 → 0 → 0 → 0 → 1 → 1 → 1 → 1 → **0**. The strike on
`handoff-verify.mjs` is not renewed. The queue is open, so the gate routes to 5b; the
diminishing-returns exit does not apply (the residue is not test machinery).

---

**QA Report**: co-located at `task.110.qa.10.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.10.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 10 — bug.17, bug.18; LOWs as time allows.
