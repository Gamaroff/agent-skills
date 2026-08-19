# QA Report: Task 61 — Let the JavaScript gates read a config-declared access mode

**Task**: [task.61.access-mode-config-tier.md](./task.61.access-mode-config-tier.md)
**Gate File**: [task.61.gate.1.access-mode-config-tier.yml](./task.61.gate.1.access-mode-config-tier.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-08-19
**PR**: [#252](https://github.com/Gamaroff/agent-skills/pull/252)
**Gate Status**: **FAIL**

---

## Executive Summary

The feature works on the happy path, the six phases are genuinely complete, and the parity corpus is
real work that does what it says: 31 fixtures × 2 reader tiers, expectations derived from
`read-config.sh` at run time, mutation-proven four ways. 1416 tests pass and all three CI gates are
green.

It nonetheless **fails**, because four high-severity paths survive all of that, and each one
resolves a declared restriction to a mode **more permissive** than the config says — the precise
failure this task exists to remove. One of them is additionally arbitrary code execution.

The common thread is worth stating plainly: **every one of the four was invisible to the corpus**,
and for a structural reason. The suite runs the shell reader with `{ PATH, HOME }` and the JS reader
with the full `process.env`, so it never compares the two under the same conditions — which makes
the entire class of environment-driven divergence unobservable to the one artifact built to observe
divergence. That is the finding behind the findings.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All 6 implementation phases completed (31/31 checkboxes)
- [x] Tests passing (1416/1416)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR #252 (OPEN, MERGEABLE)

### Testing Approach

- [x] Automated Testing (unit + parity corpus + mutation testing)
- [x] Regression Testing (full suite + three CI gate simulations)
- [x] Security Review
- [x] Code Review (adversarial diff review, Step 3b)
- [x] Performance measurement
- [ ] Manual Testing — N/A (no user-facing surface)

### Review Methodology

Parallel agents, per the Adaptive Review Strategy: the task is `risk_level: high`, spans 6 phases and
touches multiple modules. One read-only Explore subagent ran the adversarial diff review over a
scoped 1022-line diff (9 hand-edited files; the 141 bundle copies were excluded as generated
output). Direct tools ran the suite, the CI gate simulations, the performance measurement and
independent probing of the escalation surface.

Two of the four HIGH findings were reproduced independently by the reviewer before being accepted,
with a concrete triggering input recorded for each.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1 — Build the parity corpus first | PASS | Verified | 349 lines + 31 fixtures. Derived at run time, both tiers |
| 2 — Decide the "present but unreadable" shape | PASS | Verified | Decision recorded and mutation-proven both ways |
| 3 — Implement the tier | **CONCERNS** | Partial | Works; two escalation paths (T61-H1, T61-H2) |
| 4 — Thread through the JS gates | **CONCERNS** | Partial | Two call sites missed the anchor (T61-M2, T61-M3); degraded path half-closed (T61-H3) |
| 5 — Shell seam | **CONCERNS** | Partial | Works from the repo root only (T61-H4); fails open when absent (T61-M1) |
| 6 — Documentation and bundle | PASS | Verified | 18/18 skills carry the resolvers; bundle-freshness CI gate green |

**Overall Phase Completion**: 6/6 complete, 3 with issues.

---

## Success Criteria Verification

| # | Criterion | Target | Actual | Status |
| - | --------- | ------ | ------ | ------ |
| 1 | Every fixture resolves identically through both readers | all | 62/62 cells agree | PASS |
| 2 | A restriction gates every documented bare invocation | all | e2e proven; 18/18 bundled | PASS |
| 3 | **No path where a gate that cannot answer proceeds as `full`** | none | **4 such paths** | **FAIL** |
| 4 | A read-only CLI mode survives an unreadable config | yes | never throws; mutation-proven | PASS |
| 5 | A `.env` cannot redirect the config path around the snapshot | yes | **defeated via BASH_ENV** | **FAIL** |
| 6 | A refused write still produces a record + one stderr line | yes | e2e proven | PASS |
| 7 | `jira-sprint-lib.sh` same answer, no fourth mode table | yes | only from the repo root | **PARTIAL** |
| 8 | The seven carried findings each closed or dismissed | all 7 | documented; C5-CR4/CR6 reopened by H3/H4 | **PARTIAL** |
| 9 | `npm test`, `validate:all` green; `npm run bundle` committed | green | 1416/1416, 115 skills, no drift | PASS |

Criterion 5 deserves emphasis: it is worded as "a `.env` cannot redirect the config path around the
pre-`loadDotEnv` snapshot", and T61-H1 is a `.env` doing exactly that — by a route the snapshot was
never widened to cover.

---

## Issues Found

### HIGH Severity (4)

**T61-H1 — `probeResolver` spreads the live `process.env` into the child shell**
- **Category**: Security (escalation + arbitrary code execution)
- **Observation**: `jira-stage.js` and `gh-stage.js` call `loadDotEnv()` *before* `resolveAccessTracker`. `loadDotEnv` copies every key from `.env` / `.secrets/tooling.env` into `process.env`. `probeResolver` then builds the child env as `{ ...process.env }` and deletes only the two ACCESS names — so `BASH_ENV` survives, and `bash --noprofile --norc -c` **sources** `$BASH_ENV`.
- **Reproduced**: with `BASH_ENV` pointing at a file containing `ACCESS_TRACKER=full; source() { :; }`, a repo declaring `access.tracker: manual` resolves to **`full`**.
- **Impact**: a repo-local `.env` — a file that is routinely gitignored and not reviewed — can both forge `full` over a committed restriction and execute arbitrary code in the child. `PATH` is inheritable by the same route, so it can also substitute `bash` outright.
- **Why it matters beyond the bug**: this defeats the pre-`loadDotEnv` snapshot in the very change whose comments explain that the snapshot exists to stop a `.env` influencing the answer. The snapshot was widened to carry `SKILLS_CONFIG_FILE` but the *consumer* of that snapshot then read the live environment anyway.

**T61-H2 — the `/access/i` fast-path is an authorisation decision, and it is unsound**
- **Category**: Security (escalation)
- **Observation**: `readConfiguredAccessTracker` skips the subprocess when the file text contains no `access` substring. `read-config.sh` tier 1 is real PyYAML, which resolves `"\x61ccess":` to the key `access`.
- **Reproduced**: on a tier-1 host, `"\x61ccess":\n  tracker: manual` → shell `manual`, JS `full`, no warning.
- **Scope**: tier-1 only — a tier-2 (awk) host answers `full` on both sides, so they agree there. Tier 1 is authoritative wherever it exists, so the escalation is live on any host with `pyyaml`.
- **Impact**: an optimisation added to avoid a 500 ms spawn silently became the thing that decides whether a restriction applies.

**T61-H3 — `jira-create-epic.js` consults the config only when both env names are empty**
- **Category**: Functional (escalation)
- **Observation**: `if (!seen.length) return configMayRestrict() ? "manual" : "full";`. With `AGENT_SKILLS_ACCESS_TRACKER=read-only` set and `access.tracker: manual` committed, the degraded path resolves `read-only` — more permissive than declared — and the epic create proceeds.
- **Impact**: C5-CR4, one of the seven findings this task carries, is only half closed.

**T61-H4 — the shell seam inherits the caller's working directory**
- **Category**: Functional (escalation)
- **Observation**: `read-config.sh` defaults `SKILLS_CONFIG_FILE` to the *relative* `skills-config.yaml`, and the subshell inherits the caller's cwd. None of the `jira-sprint-manager` scripts `cd` to the repo root, and the skill documents bare `manage-sprint-state.sh <id> closed` invocations.
- **Reproduced**: same repo, `access.tracker: manual` — from the repo root the seam resolves `manual`; from `docs/` it resolves **`full`**.
- **Impact**: this is C5-CR6, the anchoring defect, fixed on the JS side in this diff and left in place on the shell side. The seam was verified only from the repo root.

### MEDIUM Severity (5)

- **T61-M1** — `jira-sprint-lib.sh` fails **open** when `resolve-platform.sh` is absent (no `else` branch); the JS analogue fails closed for the identical condition.
- **T61-M2** — `jira-sync.js`'s injected-`access` clamp resolves against `process.cwd()`; one call site was given the anchor and the other was not, falsifying the "may RESTRICT but never escalate" comment directly above it.
- **T61-M3** — `jira-stage.js` builds `makeHttp({ fetchImpl })` with no `cwd`, so the CLI gate and layer 1 can resolve different answers in one run.
- **T61-M4** — `AGENT_SKILLS_CONFIG_TIER` is forwarded unscrubbed; forcing `python` on a host without `pyyaml` makes the resolver exit 0 with `full` over a committed restriction.
- **T61-M5** — **the parity suite compares the two readers under different environments.** This is the root cause of H1 and H2 surviving, and is the most important non-HIGH finding in this review.

### LOW Severity (5)

- **T61-L1** — `configMayRestrict` treats `SKILLS_CONFIG_FILE=skills-config.yaml` as a redirect, diverging from the default-basename rule the rest of the diff mirrors carefully. Fails safe.
- **T61-L2** — the memo key joins three unescaped strings with a space; a path containing a space can collide two distinct states.
- **T61-L3** — the refusal warning always says `access.tracker:`, but the resolver also exits non-zero for an invalid `tracker:`/`vcs:` enum and for `access.vcs != full`.
- **T61-L4** — three matrix tests are vacuous by construction if `TIERS`/`MATRIX` are empty; the only guard is an assert in the root `before()` hook.
- **T61-L5** — `access-config-parity.test.mjs` fails `prettier --check`.

**Total**: HIGH 4, MEDIUM 5, LOW 5.

> **Deviation from the documented process, stated rather than hidden.** The skill asks for a
> separate `task.61.bug.N.*.md` file per HIGH and MEDIUM issue — nine files. They are recorded here
> and in the gate's `top_issues[]` instead, each with a reproduction and a suggested action, because
> `qa-fix` runs immediately in the same pipeline cycle and the gate is the tracking mechanism across
> cycles. If any issue survives this cycle it should get its own bug file on the re-review.

---

## NFR Assessment

### Security — **FAIL**

Two verified escalation paths (H1, H2), two more by inspection and reproduction (H3, H4). H1 is
additionally arbitrary code execution through a subshell this change introduced. For a task whose
entire subject is an access control, this is the determining assessment.

### Performance — PASS

Measured. A repo with no `access` key spawns nothing (0 ms) — the fast-path is genuinely free on the
common path, which is also why removing it outright is not the right fix. A restricted repo pays one
527 ms subprocess per process, memoised thereafter. Acceptable: a restricted repo is deferring
writes anyway.

### Reliability — CONCERNS

The shell seam fails open where the JS tier fails closed (M1) — the two halves of one contract
disagreeing about what to do when they cannot answer. Two gates inside a single `jira-stage` run can
resolve different answers (M3).

### Maintainability — CONCERNS

The "does this file mention access" question is now asked in three places with three different
grammars: `/access/i` in `defer-mutation.js`, `/access/i` again in `jira-create-epic.js`, and the
careful `_rp_access_may_be_declared` in `resolve-platform.sh`. The shell one is the reviewed one.
Three grammars for one predicate is the same shape of duplication this task set out to remove.

---

## Code Review

Adversarial diff review over 1022 lines / 9 hand-edited files. **Advisory findings are folded into
the issue list above**; `code_review_blocking=true` applies (pipeline default; the task does not opt
out), so the `category: bug` + `confidence: high` findings were promoted into the gate as
T61-H1..H4, T61-M1..M3 and T61-L1..L4.

**Cleanups (6)** — not gating:

- `jira-create-epic.js:89` (efficiency) — `repoRootOrCwd()` shells out to git on every call, twice per gated operation. Memoise.
- `defer-mutation.js:583` (reuse) — three grammars for one predicate; export one.
- `jira-sync.js:45` (simplification) — `cwd ? { cwd } : {}` is redundant; `resolveAccessTracker` already does `opts.cwd || process.cwd()`.
- `defer-mutation.js:605` (simplification) — `fs.existsSync` before `spawnSync` is a TOCTOU-shaped pre-check; the spawn is the authority either way.
- `jira-sprint-lib.sh:83` (simplification) — `2>&1` discards the resolver's refusal line, so the shell path gives `manual` with no reason while the JS path works to surface exactly that line. `JSM_ACCESS_ERROR` is never populated here.
- `jira-sprint-lib.sh:89` (reuse) — the mode→rank table is still written twice inside one function, which is the duplication the new header comment says sourcing the resolver removes.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| Full suite (`npm test`) | PASS — 1416/1416, exit 0 |
| CI gate: bundle freshness | PASS — no drift after `bundle_skill.py --all` |
| CI gate: catalog up-to-date | PASS |
| CI gate: skill validation | PASS — 115 skills |
| Existing access-gate suites | PASS — `stage-access-gate`, `jira-interception` both green and updated rather than merely kept green |
| Common path (no `access:` key) | PASS — resolves `full`, spawns nothing, unchanged |

No regressions found. The failures in this review are all new-surface defects, not breakage of
existing behaviour.

---

## Test Artifacts

### Test Commands Executed

```bash
npm test                                              # 1416/1416
npm run validate:all                                  # 115 skills
python3 skills/create-skill/scripts/bundle_skill.py --all   # CI gate simulation
python3 skills/create-skill/scripts/generate_catalog.py     # CI gate simulation
node --test shared/resources/tests/access-config-parity.test.mjs
npx prettier --check shared/resources/tests/access-config-parity.test.mjs
```

### Coverage

No coverage instrumentation in this repo (`node --test` without `--experimental-test-coverage`).
Coverage was assessed structurally instead: every phase has an asserting test, and the corpus was
mutation-proven four ways. The gap this review found is not missing coverage but **mis-specified**
coverage — see T61-M5.

---

## Recommendations

### Immediate (Blocking)

1. Allowlist the child environment in `probeResolver`; drop `BASH_ENV`, `ENV`, `SHELLOPTS`, `BASHOPTS`, `LD_PRELOAD`, `DYLD_*`. (T61-H1)
2. Make the fast-path fail *toward* spawning — it must be a performance hint, never an authorisation decision. (T61-H2)
3. Fold the config signal into the reduction unconditionally on the degraded path. (T61-H3)
4. Anchor the shell seam's subshell to the git top level. (T61-H4)
5. Give both readers one environment in the parity suite, and add escaped-key, unicode-escaped-key, unreadable-file and `BASH_ENV` fixtures. (T61-M5) — **do this first**: it is what turns the other four into red tests rather than review findings.

### Short-term (Non-blocking)

1. One exported access-may-be-declared predicate instead of three grammars.
2. Memoise `repoRootOrCwd`.
3. Populate `JSM_ACCESS_ERROR` on the shell refusal path.
4. `npm run format`.

---

## Final Assessment

**Gate Status**: **FAIL**
**Quality Score**: 40/100
**Deployment Recommendation**: **BLOCKED**

**Rationale**: four high-severity escalation paths, one of them arbitrary code execution, in a
change whose single purpose is to make a declared restriction take effect. Success criteria 3 and 5
fail outright and 7 and 8 are partial.

The underlying work is sound and the design decision — delegate to one reader rather than write a
second — is right. What failed is the boundary around that decision: an optimisation that quietly
became an authorisation check, a subprocess that inherited an environment the caller had just been
careful to snapshot, and a corpus that could not see either because it never put the two readers in
the same conditions. Fixing T61-M5 first is what makes the rest verifiable.

---

**Next Steps**: `/qa-fix` — address T61-H1..H4 and T61-M1..M5, starting with M5 so the HIGHs become
red tests; then re-review.
