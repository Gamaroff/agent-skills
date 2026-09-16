# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.9.session-handoff-skill.yml](./task.110.gate.9.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

Cycle 9 is the re-review of the cycle-8 fix (`cb3ddd63`, the third-strike mechanism replacement:
"runnable code is named by identity, never by shape" in the interpreter arms) and — because gate 8's
security axis was `FAIL / measured` — an **unscoped safety re-probe** of the whole boundary. The
handoff for this cycle also asked QA to decide explicitly whether the PRB-6 / CR-2 boundary
("`npx --config=`/`--format=`/`--reporter=` may name any in-repo module — in-repo code is trusted")
still stands.

**The cycle-8 fix holds.** Bugs 11, 12 and 13 are closed: every gate-6/7/8 spelling (fourteen of
them) re-executed through the CLI in a scratch clone under a stripped environment is refused with
no write and no request; all eight cycle-8 mechanisms are mutation-proven `covered`; QA-4 and QA-5
read `no figure` / `row N` through the CLI.

**The PRB-6 boundary does not stand.** Measured: prettier `import()`s a `--config=<file>.mjs`, this
repository ships `shared/resources/generate-prd-epic-index.mjs` with an unguarded top-level
`main()` that reads its flags from `process.argv` — which under this spelling is *prettier's*
argv — and, executed through read mode against a consumer-shaped PRD tree placed in the clone,
**a PRD document was rewritten and the line read `confirmed`**. The identity principle the
cycle-8 fix adopted for the `node` arm was never applied to the `npx` arm, which still names
runnable code by path shape. One HIGH (bug.14). Two further MEDIUMs from the same enumeration:
`npx mocha init <dir>` — a *subcommand* positional — wrote four files in a consumer-shaped project
(bug.15), and `tokenize()` drops an empty quoted token so `grep -c "" README.md` ran as `grep -c
README.md` and was `confirmed` against the wrong command (bug.16, reviewer CR-1). Three LOW.

This is the **fourth consecutive HIGH on `handoff-verify.mjs`** (gates 6, 7, 8, 9). The operator
waived the strike halt for this run ("continue beyond 4 strikes if necessary; repeat while the
cycles show continuous improvement"). QA's reading of that criterion: each cycle's fix has held
and been mutation-proven; the residual has moved to a different arm each time; and this cycle's
HIGH is the re-decision of a boundary the operator explicitly asked to have re-decided, not a
regression — so the loop continues to `/qa-fix` under the replace-the-mechanism rule.

**Overall Assessment**: FAIL (40/100)
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (`status: ready-for-review`; body **Status:** Ready for Review)
- [x] All implementation phases completed (Progress Tracking 4/4 boxes)
- [x] Tests passing (skill suite 30/30; full hermetic suite 3300 pass / 0 fail / 1 skipped)
- [x] Breaking changes documented (§5: none — new skill)
- [x] Code on feature branch with open PR (#408, base `develop`, head `cb3ddd63` = origin = local)

### Testing Approach

- [x] Manual Testing — executed probes through the CLI in a scratch clone and a consumer-shaped project
- [x] Automated Testing — `npm test`, skill suite, `TMPDIR=/tmp` variance
- [ ] Performance Testing — timings from the suite only
- [x] Regression Testing — the fourteen gate-6/7/8 spellings; the 2026-09-10 fixture; bundle / prettier / validate gates
- [x] Security Review — unscoped safety re-probe (3,367 in-process spellings, 30 executed, 8 mutation proofs, static module scan)
- [x] Code Review — Explore subagent over the code-only branch diff with the SAFETY RE-PROBE directive

### Review Methodology

Direct tools plus one read-only Explore reviewer (Step 3b), per the re-review row of the Adaptive
Review Strategy. Traceability mapper skipped (no Success Criteria *table* — §9 is a numbered list;
same as every prior cycle). Step 4b: `no-executable-blocks` — unchanged since cycle 1 (the one
fenced block in SKILL.md is refused as `unrecognised-command: command`; obs #90); the documented
commands were executed by hand through the CLI instead, which is what this cycle's probes are.

```
Re-review scope: unscoped (prior gate: security FAIL / measured → SAFETY_REPROBE=true)
```

Reviewer: dispatched 15:41, returned 15:53 (11m33s — past the 10-minute budget, not killed; block
in hand before the gate was written). Instructed read-only with in-process `isAllowed` probes only,
after the cycle-8 reviewer's probe launched two `claude -p` sessions (obs #97).

**Probe hygiene (obs #97).** Every executed probe ran in `scratchpad/clone9` (a `git clone` of the
branch at `cb3ddd63`, `node_modules` symlinked, no `.claude/skills` or `.agents/skills` link) or in
`scratchpad/consumer9` (a fresh `git init` with `mocha` and `prettier@3` installed), under
`env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=<throwaway> CI=1 CANARY_SECRET=… npm_config_registry=http://127.0.0.1:8099`
— no `ANTHROPIC_API_KEY`, no `CLAUDE_*`, no `GH_TOKEN`, no `claude` on PATH. A request listener on
127.0.0.1:8099 logged every hit. Afterwards: nothing new under `~/.claude/projects/` or `~/.cache`;
the listener saw exactly two `GET /vitest` (the documented `--no-install` manifest residual); the
scratch clone's tree was clean except for the probes' own untracked outputs, which were removed.

---

## Re-Review Context

| Gate-8 finding | Bug | Status | Evidence (cycle 9) |
| --- | --- | --- | --- |
| QA-1 HIGH — `--test`-mode positional runs any in-repo file (`node --test <file>`, `npm test -- <file>`) | bug.11 | **FIXED** — Closed | CLI in the clone: `node --test scripts/generate-skill-dependencies.mjs`, `node --test skills/loop-supervisor/scripts/run-loop.mjs`, `npm test -- scripts/…`, `npm run test -- skills/…` → `unverifiable: not on whitelist`; the deleted `skill-dependencies.json` stayed deleted; no `.claude/state`; nothing under HOME. `node --test`, `--test-name-pattern=`, `--test-only`, all five built-in reporters still admitted. Mutations M1 (positional re-admitted in `testModeArgsOk`), M2 (`interpreterRule` runs a test-mode positional), M3 (bare `--test` refused) → red on the named tests — `covered` ×3 |
| QA-2 MEDIUM — `git remote show <url>` queries a document-chosen host | bug.13 | **FIXED** — Closed | With the listener up: `remote show http://127.0.0.1:8099/x.git`, `remote show 127.0.0.1:8099/x.git`, `remote get-url http://127.0.0.1:8099/x.git` → refused; no request, no ssh. `remote -v`, `get-url origin`, `get-url --push origin` admitted. M5 (`show` re-admitted), M6 (`get-url` anchor dropped) → red — `covered` ×2 |
| QA-3 MEDIUM — `observation-log.js next-id` archives and writes the id floor | bug.12 | **FIXED** — Closed | `next-id --workspace <throwaway>/obs --json` → refused; no tree at the workspace. `doctor`/`scan`/`queue`/`families` admitted. M4 (`next-id` re-admitted) → red — `covered` |
| QA-4 LOW — empty `; expect:` reads `stale` | — | **FIXED** | CLI: `<!-- cmd: git rev-parse HEAD; expect: -->` → `unverifiable: no figure`. M7 → red — `covered` |
| QA-5 LOW — short row → `check` undefined | — | **FIXED** | CLI, header `Command \| Check \| Result`, row `\| \`git rev-parse --short HEAD\` \|` → `row 21`; the full row beside it `confirmed`. M8 → red — `covered` |
| QA-6 LOW — python `-X…` cache write | — | NOT FIXED (deliberately) | Carried as an advisory; unchanged |

Reviewer advisories carried from gate 8 and left unchanged by design (judged, not rediscovered):
CR-4 DRIVER/MODE env passthrough (the runner inherits the reader's env; `eval:*` default driver is
`replay`, verified in `evals/shared/runner.mjs`), CR-5 win32 cwd-first resolution, CR-6 absolute
reads + measured echo (this cycle adds a path-free spelling of it — QA-4 below), CR-9 `gh api
--cache`. **CR-2 is not carried: it is this cycle's QA-1.**

---

## New Findings This Cycle

Searched unscoped (prior gate: security FAIL / measured): the full `origin/develop...HEAD` code
diff (4,116 lines, 15 files) through the reviewer; the boundary re-enumerated from the source —
every flag the specs admit for `git` (16 subcommands), `gh` (api + 6 groups × 5 verbs), `node`,
`python3`, `npm`, `npx` (10 tools), and the 12 utilities — tested as 3,106 refused-list and 261
allowed-list spellings through `isAllowed()`, 186 of the refused list admitted and triaged by hand
(three hazardous, below; the rest harmless — `jq` flag clusters, `test` operators, `head -n -1`,
non-existent `gh` verbs that the binary rejects, `git show HEAD:/x` which reads the tree); 30
spellings executed end-to-end; the 208 tracked modules statically scanned for an unguarded
top-level `main()`.

- **[HIGH]** `skills/session-handoff/scripts/handoff-verify.mjs:885` (`NPX_TOOLS`) — a module-loading
  flag value is admitted by path shape and the tool imports and runs it under its own argv;
  executed: `npx prettier -l --config=shared/resources/generate-prd-epic-index.mjs <js>` rewrote a
  consumer-shaped PRD through read mode and read `confirmed` → hold loader values by kind (data
  file or bare name) or drop the loader flags. **bug.14.** This is the explicit decision the handoff
  asked for: **PRB-6 / CR-2 does not stand.**
- **[MEDIUM]** `handoff-verify.mjs:947` (`mocha`) / `:939` (`vitest`) — a positional is a subcommand;
  executed: `npx mocha init out9` wrote four files in a consumer-shaped project; `npx vitest init
  browser` admitted by construction (refused here only by `--no-install`, tool absent) → drop the
  two tools or refuse their subcommand vocabulary. **bug.15.**
- **[MEDIUM]** `handoff-verify.mjs:1220` (`tokenize`) — an empty quoted token is dropped; executed:
  `grep -c "" README.md; expect: 0` → `confirmed`, measured `0` (the command recorded prints 1) →
  preserve empty tokens, refuse an unterminated quote. **bug.16** (reviewer CR-1).
- **[LOW]** `handoff-verify.mjs:1081` (`jq`) — `jq -n env` echoes the verifier's inherited
  environment into `measured`; executed with a canary variable → a path-free spelling of CR-6
  (reviewer CR-2).
- **[LOW]** `handoff-verify.mjs:1819` (`run`) — a directory path throws EISDIR and the CLI exits with
  a stack trace, no JSON; executed (reviewer CR-3).
- **[LOW]** `handoff-verify.mjs:858` (`EVAL_LIVE_DRIVER`) — `:cli`/`:sdk` excluded only as the last
  segment; `npm run eval:x:cli:y` admitted by construction (no such script exists — nil today).

Wrongly **refused** (usability, advisory): `git status -sb` (no flag cluster on `status`), quoted
globs and regexes (`'feature/*'`, `'a.*b'`, `--include=*.md`, `'$x'` in a jq filter — reviewer
CR-6: SHELL_EXPANSION is applied after quoting is discarded), `date -r 0` (reviewer CR-5: `-r`
admitted but its operand refused). Cosmetic: `gh pr list -R ../y` passes `GH_OWNER_REPO` (`..` as
an owner; same host, harmless).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract (SKILL.md, section/verdict tables) | PASS | Verified | `quick_validate.py` ✓; npx row still carries the cycle-8 wording and must change with bug.14/15 |
| Phase 2: read mode is real (`handoff-verify.mjs`) | CONCERNS | Partial | Cycle-8 mechanisms hold and are mutation-proven; the read-only invariant is open through the `npx` arm (bug.14, bug.15) and one verdict is measured against the wrong command (bug.16) |
| Phase 3: write mode + wiring | PASS | Verified | Template test ✓; catalog/deps `bundle --check` 128/0; test glob present; CHANGELOG entry |

**Overall Phase Completion**: 2/3 phases passed (phase 2 blocked)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. One verdict per figure; 2026-09-10 fixture reads `stale` on the frontier line and the change-log.js claim | yes | yes | PASS | regression test green |
| 2. `--json` follows the `reason` / exit-code contract | yes | mostly | CONCERNS | directory path → stack trace (QA-5, low) |
| 3. Write mode emits the fixed section order; traps section is a pointer | yes | yes | PASS | template test |
| 4. Tests run under `npm test` and in CI | yes | yes | PASS | glob present; 3300/3301 |
| 5. `quick_validate.py` passes; catalog and deps regenerate to no diff | yes | yes | PASS | `bundle -- --check` 0 problems |
| 6. AGENTS.md names the read mode | yes | yes | PASS | |
| §10 risk: the whitelist is read-only | yes | **no** | FAIL | bug.14 (executed write of a document), bug.15 (executed write of four files, consumer-shaped) |

---

## Breaking Changes Validation

None declared (§5). New skill; no consumer code changes. **Assessment: PASS.**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `npx` loader-flag values name in-repo modules by shape; the tool imports and runs them**
- **Severity**: HIGH
- **Category**: Security (read-only invariant)
- **Bug Report**: [task.110.bug.14.npx-config-and-formatter-values-load-in-repo-modules.md](./task.110.bug.14.npx-config-and-formatter-values-load-in-repo-modules.md)
- **Observation**: Executed through read mode: a canary `.mjs` named as `--config=` was imported
  (file written); `shared/resources/generate-prd-epic-index.mjs` — unguarded top-level `main()`,
  argv-driven — named as `--config=` rewrote a consumer-shaped PRD and the line read `confirmed`.
  Six loader-flag spellings across prettier/eslint/stylelint/mocha/markdownlint admitted in-process.
- **Impact**: A write to a tracked document through read mode; the fourth HIGH on this file; the
  PRB-6 boundary re-decided on measurement.
- **Recommendation**: Mechanism change — loader values held by kind (data file / bare name), or the
  loader flags dropped from `NPX_TOOLS`.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: a positional under `npx mocha` / `npx vitest` is a subcommand; `init` scaffolds files**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: [bug.15](./task.110.bug.15.npx-subcommand-positional-selects-a-scaffolder.md)
- **Observation**: `npx mocha init out9` through the CLI wrote four files in a consumer-shaped project; `npx vitest init browser` admitted (not executed; refused here by `--no-install`).
- **Impact**: Tree write through read mode wherever the consumer has either devDependency.
- **Recommendation**: Drop the two tools or refuse the subcommand vocabulary. **Priority**: P2

**Issue: `tokenize()` drops empty quoted tokens — the verdict is about a different command**
- **Severity**: MEDIUM · **Category**: Functional · **Bug Report**: [bug.16](./task.110.bug.16.tokenize-drops-empty-quoted-tokens.md)
- **Observation**: `grep -c "" README.md; expect: 0` → `confirmed`, measured `0`; the recorded command prints `1`. Reviewer CR-1, executed.
- **Impact**: A false `confirmed` — the outcome read mode exists to prevent. **Priority**: P2

### LOW Severity Issues (3)

- **QA-4** `jq -n env` echoes the inherited environment into `measured` (executed with a canary; reviewer CR-2) — path-free CR-6.
- **QA-5** directory path → EISDIR stack trace, no JSON (executed; reviewer CR-3).
- **QA-6** `EVAL_LIVE_DRIVER` matches only the last segment; `eval:x:cli:y` admitted by construction (nil today).

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
Skill suite 30/30 in 4.8 s; full hermetic suite 177 s; `TMPDIR=/tmp` 30/30. The CR-6 timeout test
(known load flake, 3 s window) passed in the full run at 3.1 s.

### Reliability — PASS
No orphaned children after the executed probes (`ps` clean; the vitest 404 exited on its own);
timeout, cap and group-kill paths unchanged since gate 8. `--json` holds for every outcome but the
directory-path case (QA-5).

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 3,405 — 3,367 in-process (`isAllowed`), 30 end-to-end through the CLI
  (scratch clone + consumer-shaped project, stripped env, listener), 8 mutation proofs.
- The cycle-8 identity principle holds in the interpreter arms (fourteen prior spellings refused
  end-to-end; eight mutations covered). The `npx` arm still names runnable code by shape (bug.14
  executed: PRD rewritten) and admits writing subcommands as positionals (bug.15 executed: four
  files). The reader's environment is echoable without a path (QA-4). No egress beyond the
  documented `--no-install` manifest GET.

### Maintainability — CONCERNS
The identity principle is stated in the interpreter arm's header comment and contradicted by the
`npx` arm below it; SKILL.md's npx row and the gate-3 "accepted boundary" note restate the
contradiction. Cleanups CR-4/5/6 advisory.

---

## Code Review

Explore subagent, SAFETY RE-PROBE directive, code-only branch diff (4,116 lines). Returned 6
findings (3 bugs, 3 cleanups). `boundary: true` — `isAllowed()` / `WHITELIST`. `probes_executed: 3405`.

**Correctness bugs (3):**
- [medium/high] `handoff-verify.mjs:1220` — CR-1 tokenize drops empty quoted tokens → **promoted to QA-3 / bug.16** (executed).
- [low/medium] `handoff-verify.mjs:1081` — CR-2 `jq -n env` dumps the environment into `measured` → QA-4 (executed).
- [low/high] `handoff-verify.mjs:1819` — CR-3 directory path → stack trace, no JSON → QA-5 (executed).

**Cleanups (3):**
- `handoff-verify.mjs:1161` — CR-4 the `find` `!` filter and the `"!"` flags entry are dead (`!` never starts with `-`; passes POS.PATHS unchanged).
- `handoff-verify.mjs:1143` — CR-5 `date -r` is admitted but its operand is refused by the `+`-only rule.
- `handoff-verify.mjs:1247` — CR-6 SHELL_EXPANSION runs after quoting is discarded, so quoted globs/regexes/`$v` are refused although no shell would expand them.

**QA's own findings, beyond the reviewer:** bug.14 (the PRB-6 re-decision, executed) and bug.15
(subcommand positionals, executed), from the boundary enumeration; QA-6 from reading `npmRule`.

**Mutation proofs (all eight cycle-8 mechanisms; snapshot → mutate → run → restore; baseline 30/30
before and after; each target string occurred exactly once):**

```
mutation-proven: testModeArgsOk admits a positional          → whitelist: mutating shapes … are refused   → covered
mutation-proven: interpreterRule runs a test-mode positional → whitelist: mutating shapes … are refused   → covered
mutation-proven: bare --test refused                         → whitelist: read-only shapes pass            → covered
mutation-proven: next-id re-admitted                         → whitelist: mutating shapes … are refused   → covered
mutation-proven: remote show re-admitted                     → whitelist: mutating shapes … are refused   → covered
mutation-proven: get-url anchor dropped                      → whitelist: mutating shapes … are refused   → covered
mutation-proven: empty expect: → figure of ""                → parse: an empty expect: is no figure … (QA-4/QA-5) → covered
mutation-proven: short row → check undefined                 → parse: an empty expect: is no figure … (QA-4/QA-5) → covered
```

**Platform variance:** `TMPDIR=/tmp node --test skills/session-handoff/tests/handoff-verify.test.js` → 30/30, exit 0.

---

## Regression Testing

| Area | Result |
| --- | --- |
| The fourteen gate-6/7/8 executed spellings through the CLI | PASS — all refused; deleted file stayed deleted; no request; nothing under HOME |
| 2026-09-10 fixture (frontier + change-log.js lines) | PASS |
| Full hermetic suite (`npm test`) | PASS — 3300 pass / 0 fail / 1 skipped |
| `npm run bundle -- --check` | PASS — 128 skills, 0 problems |
| `npx prettier --check .` | PASS |
| `quick_validate.py skills/session-handoff` | PASS |
| Allowed-list (261 read-only spellings the handoff family uses) | PASS bar 7 usability refusals (advisory) |

---

## Test Artifacts

### Files Reviewed
`skills/session-handoff/scripts/handoff-verify.mjs` (whole file), `tests/handoff-verify.test.js`,
`SKILL.md`, `shared/resources/generate-prd-epic-index.mjs`, `shared/resources/registry-tick.js`,
`evals/shared/runner.mjs`, `package.json` scripts, `.prettierignore`.

### Test Commands Executed
```bash
command npm test && command npm run bundle -- --check && command npx prettier --check . \
  && python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff
command node --test --test-reporter=tap skills/session-handoff/tests/handoff-verify.test.js   # ×17 (baseline + 8 mutations + restore), 30/30
TMPDIR=/tmp command node --test skills/session-handoff/tests/handoff-verify.test.js
command node scratchpad/probe9.mjs                                                            # 3,367 isAllowed spellings + parser checks
# scratch clone / consumer project, stripped env, listener on 127.0.0.1:8099:
env -i PATH=/usr/local/bin:/usr/bin:/bin HOME=<throwaway> CI=1 CANARY_SECRET=… npm_config_registry=http://127.0.0.1:8099 \
  node skills/session-handoff/scripts/handoff-verify.mjs <probe>.md --json --timeout 30 [--cwd consumer9]   # probes A–F, 30 lines
```

### Coverage Report
Not collected (no coverage tooling in this repo). 30 tests in the skill suite.

---

## Recommendations

### Immediate Actions (Blocking)
1. **bug.14** (P1) — under the strike rule, replace the mechanism: loader-flag values held by kind, or the loader flags dropped from `NPX_TOOLS`; SKILL.md npx row and the "accepted boundary" note corrected.
2. **bug.15** (P2) — drop `mocha`/`vitest` or refuse their subcommand vocabulary; require `--run` on vitest.
3. **bug.16** (P2) — preserve empty quoted tokens; refuse an unterminated quote.

### Short-term Actions (Non-Blocking)
1. QA-4 (`jq env` echo), QA-5 (directory-path JSON), QA-6 (`eval:*:cli:*` segment match).
2. Reviewer cleanups CR-4/5/6; `git status -sb` flag cluster.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: Rule 1 — one HIGH (bug.14). Cycle-8 fixes verified and mutation-proven; the
read-only invariant is open through the `npx` arm, executed twice (a document rewritten; four
files scaffolded), and one verdict is measured against the wrong command.
**Quality Score**: 40/100 (one HIGH, two MEDIUM, security FAIL — scored as gates 6–8 were for the same shape)

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.14, bug.15, bug.16 closed.

**On the loop.** HIGH per gate: 3 → 7 → 0 → 0 → 0 → 1 → 1 → 1 → 1. Four consecutive HIGHs on the
same file would halt the develop-task loop on both the convergence check and the strike rule; the
operator waived both for this run and asked QA to continue while the cycles improve. They do, by
the measure that matters — every fix holds, every mechanism is proven, and each residual is in a
new arm — and this cycle's HIGH is the answer to a question the operator put to QA. Continuing to
`/qa-fix`.

---

**QA Report**: co-located at `task.110.qa.9.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.9.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 9 — mechanism change on the `npx` arm (bug.14) under the strike rule; bug.15, bug.16; LOWs as time allows.
