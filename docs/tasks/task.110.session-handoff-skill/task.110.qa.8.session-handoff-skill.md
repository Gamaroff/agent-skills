# QA Report: Task 110 - A session-handoff skill that writes the handoff and re-measures it on read

**Task**: [Link to task document](./task.110.session-handoff-skill.md)
**Gate File**: [task.110.gate.8.session-handoff-skill.yml](./task.110.gate.8.session-handoff-skill.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-15 (cycle 8 — explicitly authorised by the operator after the loop escalated at cycle 7)
**Testing Completed**: 2026-09-15
**Gate Status**: FAIL

---

## Executive Summary

Every cycle-7 fix holds and every one of its mechanisms is mutation-proven (eleven reverts, eleven
named committed tests red): the interpreter arm is an exact list with per-entry specs at both
install paths, gh value flags consume their value and `--repo`/`-R` is `OWNER/REPO`, list/view
positionals are anchored, `-w` is a workflow only under `run list`, `npm view`/`ls` take bare
package names, `--no-install` is injected into every npx argv and `--no` is refused, and the spec's
own policy holds after `--`. The seventeen spellings gate 7 executed were re-executed through the
CLI in a scratch clone with a local listener: all seventeen `unverifiable: not on whitelist`, no
write, no request. The documented npx residual was measured and is as documented — one manifest
GET (retried once), no tarball, exit 1.

The unscoped safety re-probe then found the bug.8 class open in the **one spelling bug.8 did not
hold**. `interpreterRule` still treats every `--test`-mode positional as "a pattern, not a script",
but to Node an explicit file path under `--test` is a test file **whatever its name**, so `node
--test <any in-repo .js/.mjs>` — and `npm test -- <file>`, the same rule — runs the file bare.
**Executed through read mode** in a scratch clone: `node --test
scripts/generate-skill-dependencies.mjs` re-created a deleted tracked file (`confirmed`), and `node
--test skills/loop-supervisor/scripts/run-loop.mjs` — whose default subcommand is `run` — **spawned
two `claude -p` sessions** targeting roadmap item T111 before stopping idle (`confirmed`, exit 0);
in a checkout where the skill is installed that is the autonomous `/develop-next` pipeline
launched from a read. A second, bounded write came in with the cycle-7 fix itself:
`observation-log.js next-id` is admitted as a read verb, and it archives resolved entries and
writes the id floor at any absolute `--workspace` (executed against a scratch workspace). One HIGH
with no precondition → FAIL.

**Third strike.** The pipeline's detector (`high_files()` over gates 6, 7, 8) names
`skills/session-handoff/scripts/handoff-verify.mjs` on all three. Per the QA-loop rule, `/qa-fix`
may not patch that file again: delete, replace the mechanism, or waive — and say which.

**Overall Assessment**: FAIL · **Deployment Recommendation**: BLOCKED (bug.11; bug.12; bug.13)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (frontmatter `status: ready-for-review`; the body `**Status:**` line still reads `In Progress` — LOW, below)
- [x] All implementation phases completed (4/4 boxes ticked)
- [x] Tests passing (29/29 skill suite; full `npm test` 3299 pass / 0 fail / 1 skipped)
- [x] Breaking changes: none declared, none found
- [x] Code on `feature/task.110.session-handoff-skill` with open PR #408 → `develop` (head `36884e6f`)
- [x] bugs 8, 9, 10 at **Ready for QA**, each with a Developer Fix Cycle section

### Testing Approach

- [x] Automated Testing (skill suite; full hermetic suite; `TMPDIR=/tmp` variance run 29/29)
- [x] Boundary probing — executed, per `references/probe-boundary-rule.md` (95 fresh spellings through `isAllowed()`; 26 executed end-to-end through the CLI in a scratch clone, 5 more directly against the engines)
- [x] Mutation proofs of the cycle-7 fixes (eleven mechanisms)
- [x] Security Review (executed write, launch, egress and install probes with a local listener on 127.0.0.1:8099)
- [x] Code Review (read-only Explore subagent, unscoped, with the SAFETY RE-PROBE directive — see Code Review)
- [x] Regression (live handoff read mode; `quick_validate.py`; `npm run bundle -- --check`; `npx prettier --check .`)

### Review Methodology

Direct tools + one read-only Explore subagent. Standalone invocation, but the operator is running the
develop-task loop by hand and authorised this cycle as its continuation, so the orchestrator's
`code_review_blocking=true` is applied as on cycles 1–7 (high-confidence `category: bug` findings
enter `top_issues[]`). Not lite. Traceability mapper skipped (§9 is a numbered list, as in cycles
1–7).

```
Re-review scope: unscoped (prior gate 7: security FAIL, evidence measured → SAFETY_REPROBE=true)
```

**Step 4b**: `qa-execute-snippets.mjs --file skills/session-handoff/SKILL.md` → 1 bash block (line
32), classified `mutating` (`unrecognised-command: command`, fail-closed), 0 placeholder →
`no-executable-blocks` (information). The block's three invocations were run by hand as the live
read below; bash + zsh both available.

**Platform variance**: `TMPDIR=/tmp command node --test 'skills/session-handoff/tests/*.test.js'` → 29/29, exit 0.

---

## Re-Review Context

| Cycle-7 finding | Status | Evidence |
| --- | --- | --- |
| QA-1 (HIGH) node/python3 run any relative script with any arguments → bug.8 | **FIXED** | Through the CLI in a scratch clone: `node node_modules/prettier/bin/prettier.cjs --write scripts/ugly.js`, `node …/registry-tick.js --dry-run`, `node …/gh-stage.js --stage done`, `python3 …/generate_catalog.py`, `python3 …/bundle_skill.py --all`, `node …/observation-log.js write --title x`, `node --test-only …/registry-tick.js --stage done` all `unverifiable: not on whitelist`; `scripts/ugly.js` byte-identical after. Mutants: any-script-passes → `mutating shapes` red; listed-script-any-tail → same red; `.agents/` root dropped → `read-only shapes pass` red → **covered ×3** |
| QA-2 (MEDIUM) `gh -R <host>/o/r`, `--repo=<url>`, URL positionals → bug.9 | **FIXED** | `gh pr list -R 127.0.0.1:8099/o/r`, `--repo=127.0.0.1:8099/o/r`, `gh repo view 127.0.0.1:8099/o/r` through the CLI: refused, listener received nothing. Mutants: value-flag not consumed (gate-7 shape) → `mutating shapes` red; `valuePatterns` removed → red; positional anchor removed → red → **covered ×3** |
| QA-3 (MEDIUM) `npm view <url-spec>` → bug.9 | **FIXED** | `npm view http://127.0.0.1:8099/pkg.tgz`, `git+http://…` through the CLI: refused, no request. Mutant (`NPM_PKG_SPEC` → any non-flag) → red → **covered** |
| QA-4 (MEDIUM) `npx` installs a missing tool → bug.10 | **FIXED** | `npx eslint .` through the CLI with `npm_config_registry` at the listener: argv ran with `--no-install`, listener saw `GET /eslint` ×2 (manifest, one retry) and nothing else, `npm error 404` exit 1 → `command failed`; no install. The documented residual is exactly that. `npx --no prettier --check .` and `npx stylelint --version` refused. Mutants: injection removed → `injected once` + regression test red; `--no` re-admitted → `mutating shapes` red → **covered ×2** |
| QA-5 (LOW) `-w` is `--web` on every view | FIXED | `gh pr view 1 -w` refused through the CLI; `gh run list -w ci.yml` allowed. Mutant (`-w` back in the common list) → red → **covered** |
| QA-6 (LOW) `POS.ANY` after `--` | FIXED | `git diff --no-index -- /etc/hosts scripts/ugly.js` refused through the CLI. Mutant (passthrough back to `POS.ANY`) → red → **covered** |
| Maintainability: SKILL.md "read-only whitelist" vs open node trust | FIXED | The `node` row now states the exact list and the one argv exception; consistent with the code — except the `next-id` verb (bug.12) |

bug.8, bug.9 and bug.10 → **Closed** (verified this cycle).

## New Findings This Cycle

- **[high]** `skills/session-handoff/scripts/handoff-verify.mjs:773` (`interpreterRule`, test mode) — every `--test`-mode positional is admitted as a `POS.PATHS` pattern, but Node runs an explicitly named file as a test **regardless of its name**, so `node --test <any in-repo file>` and `npm test -- <file>` (same `testModeArgsOk`) execute it bare. **Executed through read mode** in a scratch clone (`git clone` of this branch, `node_modules` linked): `node --test scripts/generate-skill-dependencies.mjs` with the output file deleted → verdict `confirmed`, `measured: skill-dependencies.json: 128 skills, 71 edges …`, file re-created (`npm run generate-skill-deps` is refused); `node --test skills/loop-supervisor/scripts/run-loop.mjs` → verdict `confirmed` (exit 0), and `.claude/state/loop-supervisor/runs.jsonl` recorded **two spawned `claude -p` iterations** (`spawned: true`, `itemId: T111`, two session ids, two transcripts under `~/.claude/projects/…`, each exiting at turn 0 only because the clone had no `.claude/skills` link — `Unknown command: /develop-next`); the `claude` start-up ran `npx` for a configured MCP server, seen by the listener as `GET /@google-cloud%2fgcloud-mcp` ×4. `isAllowed` also admits `node --test node_modules`, `node --test .`, `node --test --experimental-strip-types scripts/x.ts`, `npm run test -- skills/loop-supervisor/scripts/run-loop.mjs`. → [bug.11](./task.110.bug.11.test-mode-positional-runs-any-in-repo-file.md)
- **[medium]** `handoff-verify.mjs:749` (`NODE_SCRIPTS` → `observation-log.js` spec) — `next-id` is on the "read verbs only" pattern, but `nextId()` runs the archival sweep (`renameSync` of every resolved entry into `archive/`) and `writeIdFloor()` (`mkdirSync` + write); `--dry-run` is not admitted. **Executed** against a scratch workspace under `$HOME`: fresh empty dir → `{ reason: ok, id: 1 }` and `skill-observations/observation-log/archive/.id-floor` created; after `init` plus one `status: actioned` entry → `archived: ["0001-x.md"]`, file moved, floor `2`. `isAllowed("node skills/observe-work/references/observation-log.js next-id --workspace /Users/x/anywhere --json").ok === true`. `doctor`, `scan`, `queue`, `families` verified writer-free. → [bug.12](./task.110.bug.12.observation-log-next-id-is-a-write.md)
- **[medium]** `handoff-verify.mjs:553` (`gitRule`, `remote show`) — reviewer CR-1: `remote show` positionals are `POS.ANY`, and git resolves an unconfigured name as a URL alias and queries it — the PRB-8 primitive `ls-remote` was anchored against, one subcommand over. **Executed through read mode** against the listener: `git remote show http://127.0.0.1:8099/x.git` → `GET /x.git/info/refs?service=git-upload-pack`; `git remote show 127.0.0.1:8099/x.git` → `ssh: connect to host 127.0.0.1 port 22` (the reader's ssh invoked against the chosen host); `get-url` unaffected (`No such remote`). → [bug.13](./task.110.bug.13.git-remote-show-resolves-a-url-positional.md)
- **[low]** `handoff-verify.mjs:1372` — reviewer CR-7, confirmed: an empty `; expect:` on a prose line yields `figures: [""]`, reported `stale: moved:` (blank) instead of `unverifiable: no figure` — the table branch filters empty figures, the comment branch does not.
- **[low]** `handoff-verify.mjs:1331` — reviewer CR-8, confirmed: a table row shorter than the header leaves `check` undefined (`undefined` in the table; key absent in `--json`); the command and result cells already fall back to `""`.
- **[low]** `handoff-verify.mjs:802` (`PY_FLAG_PATTERN`) — `-Xpycache_prefix=<name>` is admitted and relocates Python's bytecode cache into the tree: executed, `python3 -Xpycache_prefix=zzcache skills/create-skill/scripts/quick_validate.py skills/session-handoff` → `confirmed` and a `zzcache/` directory appeared. Cache bytes only, and Python writes `__pycache__` beside imported modules by default anyway; note as a tolerated cache write or drop `-X` values containing `=`. Not a bug file.
- **[low]** `docs/tasks/task.110.session-handoff-skill/task.110.session-handoff-skill.md:21` — frontmatter `status: ready-for-review` while the body `**Status:** In Progress`; the lifecycle rule is both in the same edit. Cosmetic; `/finalise` rewrites both.
- **Probed and refuted** (recorded so the next cycle does not re-run them): `gh api repos/o/r -H Host:evil.example` — admitted, but Go's client takes the connection target from the URL, not the `Host` header (reasoned); `gh pr list -R ../x` — matches `OWNER/REPO`, but a two-segment value goes to the default host as `repos/../x` (reasoned, api.github.com); `gh api graphql -f …`, `-X`, `--method`, `-F`, `--input`, `gh run download`, `gh pr checks --watch`, `gh run view --log`, `gh workflow run`, `git -C`, `--output=`, `--ext-diff`, `git ls-remote git@evil:x/y` / `https://evil/x`, `git remote show -n`, `npm ci`, `npm install`, `npm run generate-skill-deps`, `npm run format`, `npm view --json`, `npm view x@npm:evil`, `npx jest --coverage`, `-u`, `--cache`, `--fix`, `--write=.`, `-w`, `--package=`, `tool@version`, `python3 -m` / `-c` / `-`, `find -delete` / `-exec` / `-fprint`, `tail -f` / `-F`, `jq -f` / `--rawfile`, `date -s` / `-r` / bare — all refused; `node --test node_modules/prettier/bin/prettier.cjs` — executed, admitted, prettier bare prints usage and exits 1 (`command failed`) — third-party bins are in the bug.11 class but this one is inert bare; `npm run ci` / `eval:all` — replay runner writes only its own tmp sandbox (read); `cat /dev/zero`, `head -c 10 /dev/urandom`, `grep -r x /` — plain readers by design, bounded by the cap and timeout; `jq -n env.HOME`, `gh api /user/emails`, `cat <absolute>` — local disclosure to the reader's own terminal, by design (gate 6's note stands).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: contract (SKILL.md, template, parse rule) | PASS | Verified | The `node` row's verb list names `next-id` as a read (bug.12); otherwise consistent with the code |
| Phase 2: read mode is real (verifier, whitelist, tests) | **FAIL** | 29/29 green; boundary open | `--test`-mode positional runs any in-repo file — a `claude -p` launch through read mode (bug.11); `next-id` writes (bug.12) |
| Phase 3: write mode + wiring (AGENTS.md pointer, live handoff) | PASS | Verified | Live read: 17 confirmed · 1 stale (observation total 52 → 58, genuinely moved) · 2 timeout at `--timeout 20`; 58 s wall; no orphaned children; tree clean |

**Overall Phase Completion**: 2/3 (phase 2 blocked)

---

## Success Criteria Verification

| Criterion (§9) | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Read mode never writes the handoff | Yes | Yes | PASS | No write path to the handoff file exists |
| Commands run only through a read-only whitelist | Yes | **No** | **FAIL** | `node --test <file>` runs any in-repo file (a generated-file write and a `claude -p` launch executed); `next-id` archives and writes the id floor |
| Verdict per figure: confirmed / stale / unverifiable | Yes | Yes | PASS | Live read exercises all three |
| `unverifiable` never merged with `confirmed` | Yes | Yes | PASS | Rendered `?` vs `✓`; JSON `verdict` distinct |
| Timeout / interrupt kill the process group | Yes | Yes | PASS | CR-6 / CR-7 tests green; no stragglers after the live run |
| Tests | Passing | 29/29; 3299/3300 full (1 skipped) | PASS | |
| Lint / format / bundle / validate | 0 errors | 0 errors | PASS | `npm run bundle -- --check` 128 skills 0 problems; prettier clean; `quick_validate` ✓ |

---

## Breaking Changes Validation

None declared in §5; none found. N/A.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: `--test`-mode positional runs any in-repo file — read mode launched `claude -p`**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.110.bug.11.test-mode-positional-runs-any-in-repo-file.md](./task.110.bug.11.test-mode-positional-runs-any-in-repo-file.md)
- **Observation**: `node --test scripts/generate-skill-dependencies.mjs` re-created a deleted tracked file; `node --test skills/loop-supervisor/scripts/run-loop.mjs` spawned two `claude -p` iterations — both `confirmed` through read mode
- **Impact**: arbitrary in-repo entry points run with their bare defaults from a read; in this repo that is a generator write and an autonomous, billed agent launch
- **Recommendation**: hold test-mode positionals to a directory or a test-file name (Node's own patterns) in `testModeArgsOk`, so `node` and `npm test --` move together; refused/allowed tests; fix the comment
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: `observation-log.js next-id` admitted as a read, writes**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.110.bug.12.observation-log-next-id-is-a-write.md](./task.110.bug.12.observation-log-next-id-is-a-write.md)
- **Observation**: fresh `--workspace` dir gained `skill-observations/observation-log/archive/.id-floor`; a resolved entry was moved to `archive/`
- **Impact**: bounded, non-destructive write into the reader's observation log at a document-chosen absolute path
- **Recommendation**: drop `next-id` from the verb pattern (or require `--dry-run`); refused test; SKILL.md row
- **Priority**: P2

**Issue: `git remote show <url>` queries a document-chosen host**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.110.bug.13.git-remote-show-resolves-a-url-positional.md](./task.110.bug.13.git-remote-show-resolves-a-url-positional.md)
- **Observation**: http form reached the listener; scp form invoked the reader's ssh
- **Impact**: egress; the scp form presents the reader's ssh identity to the host
- **Recommendation**: anchor `remote show`/`get-url` positionals as `ls-remote` is, or drop `remote show`
- **Priority**: P2

### LOW Severity Issues (4)

- `-Xpycache_prefix=<name>` relocates the bytecode cache into the tree (executed: `zzcache/` created) — cache bytes only; tolerate and document, or refuse `-X…=…`.
- Task document body `**Status:** In Progress` disagrees with frontmatter `ready-for-review`.
- CR-7: empty `; expect:` reads `stale` rather than `no figure` (confirmed).
- CR-8: short table row → `check` undefined (confirmed).

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 4

---

## NFR Assessment

### Performance — PASS
Live read at `--timeout 20`: 58 s wall for 20 lines (two of them the full suites hitting the timeout); every child bounded by the cap and the timeout.

### Reliability — PASS
Timeout and truncation report `unverifiable`; no orphaned children after the live run (`ps` clean); `TMPDIR=/tmp` 29/29; the spawn-throw path resolves `truncated: false`.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 136 — 95 fresh spellings through `isAllowed()`; 17 gate-7 spellings + 6 new spellings + 1 write probe + 3 reviewer-candidate spellings executed end-to-end through the CLI in a scratch clone with a listener; 2 direct `next-id` executions; 12 `isAllowed` / parse spot checks
- Findings: `node --test <file>` executes any in-repo file (HIGH, executed — write and `claude -p` launch); `next-id` writes (MEDIUM, executed); `git remote show <url>` egress incl. ssh (MEDIUM, executed — reviewer CR-1); `-Xpycache_prefix` cache write (LOW, executed). All cycle-7 shapes refused; no request reached the listener from any refused spelling; the npx residual is one manifest GET as documented.

### Maintainability — CONCERNS
The `interpreterRule` comment ("In test mode the positionals are patterns, not a script") states the false premise bug.11 rests on, and SKILL.md's `node` row lists `next-id` among the reads. Both are one-line corrections once the mechanism is settled. Otherwise: the exact-list discipline is now documented consistently across the row, the specs and the tests; 29 tests with the corpus, property and mutation-visible structure the earlier cycles asked for.

---

## Code Review

**Reviewer**: read-only Explore subagent over the code-only branch diff (`origin/develop...HEAD` minus `docs/tasks/`, 4,046 lines), with the SAFETY RE-PROBE directive; `code_review_blocking` applied as on cycles 1–7. `boundary: true` — `isAllowed()` is the classifier; the probes above are its execution.

**Dispatched 14:36 → returned 14:47 (10m55s — past the 10-minute budget, not killed; its block was in hand before this gate was written).** Eleven findings; each verified here before mapping. `probes_executed: 136` (QA); the reviewer executed `isAllowed()` only.

**Correctness bugs (9):**
- [high/high] `handoff-verify.mjs:553` — `git remote show <url>`: an unconfigured name is a URL alias and is queried. **Confirmed by execution** (listener `GET /x.git/info/refs?service=git-upload-pack`; scp form invoked ssh). Severity set to **medium** for consistency with gate 7's egress findings (bug.9) — no write, no code run — and promoted → QA-2 / [bug.13](./task.110.bug.13.git-remote-show-resolves-a-url-positional.md)
- [high/high] `handoff-verify.mjs:870` — npx tools load in-repo modules through `--config=`, `--format=`/`-f`, `--reporter=`, `-R`, `mocha <file>`. Verified admitted. **Not promoted** (confidence lowered to medium): relative module loads were accepted as the trust boundary at gate 3 (PRB-6) and gate 5, and every in-repo entry point checked (`run-loop.mjs`, `generate-skill-dependencies.mjs`, the `shared/resources` engines) guards its main, so being *imported* does not run it — the bug.11 harm needs execution as main. Recorded for the fixer: if bug.11 is closed by mechanism, decide this boundary explicitly in the row.
- [medium/high] `handoff-verify.mjs:802` — `-X…=…` python values (`pycache_prefix`, `perf`) write cache/map files. Confirmed (`zzcache/` created). Kept at **low** — cache bytes, and Python writes `__pycache__` beside `quick_validate.py`'s sibling import regardless. Reviewer's fix (enumerate `-X` values; inject `-B`) adopted as the recommendation.
- [medium/medium] `handoff-verify.mjs:858` — `DRIVER=claude-cli` / `MODE=live` in the reader's environment pass through to `npm run eval:*` and select the live driver. Reasoned, plausible; advisory (medium confidence) → future: pin `DRIVER=replay` / delete `MODE` in the spawned env for eval scripts.
- [medium/medium] `handoff-verify.mjs:1514` — win32 shell-less spawn resolves a bare binary from cwd before PATH, so a committed `git.exe` runs. Reasoned; advisory → future: `NoDefaultCurrentDirectoryInExePath=1` in the child env, or resolve against PATH first.
- [medium/medium] `handoff-verify.mjs:1017` — absolute reads + `jq -n env.X` + `measured` echo can print a reader's token into the report. Design decision from gate 6 (plain readers read absolute paths; output-channel note stands); advisory.
- [low/high] `handoff-verify.mjs:1372` — an empty `; expect:` yields `figures: [""]`, which passes the `no figure` guard and always reads `stale: moved:` (blank). **Confirmed in-process.** Promoted → QA-3 (low).
- [low/high] `handoff-verify.mjs:1331` — a table row with fewer cells than the header leaves `check` undefined (`undefined` in the table, key dropped from `--json`). **Confirmed in-process.** Promoted → QA-4 (low).
- [low/medium] `handoff-verify.mjs:637` — `gh api --cache 1h` writes gh's HTTP cache under the reader's cache dir. Advisory → future: drop `--cache`.

**Cleanups (2):**
- `handoff-verify.mjs:117` — `..` segment rule refuses jq's `..` filter; find's `-mtime -1` style operands refused as unknown flags — both read-only, both `unverifiable`.
- `handoff-verify.mjs:784` — `node --test` with no positional is refused while `npm test` is admitted (confirmed: `isAllowed("node --test").ok === false`).

Promoted to gate `top_issues[]`: CR-1 (as medium), CR-7, CR-8.

**Mutation proofs (Step 3c)** — snapshot `cp`, `perl -0pi` mutation asserted by md5 change, skill suite run, snapshot restored (md5 verified equal to the snapshot after every proof):

```
mutation-proven: any script passes the interpreter arm (`return true`) → whitelist: mutating shapes … refused → covered
mutation-proven: listed script, tail unchecked (`entry ? true : false`) → whitelist: mutating shapes … refused → covered
mutation-proven: SKILL_ROOT without the `.agents/` alternative → whitelist: read-only shapes pass → covered
mutation-proven: value flag accepted but value not consumed (gate-7 shape) → whitelist: mutating shapes … refused (+ read-only shapes) → covered
mutation-proven: valuePatterns lookup removed (`--repo` unconstrained) → whitelist: mutating shapes … refused → covered
mutation-proven: list/view positionalPattern removed → whitelist: mutating shapes … refused → covered
mutation-proven: `-w` back in GH_LIST_VIEW_VALUE_FLAGS → whitelist: mutating shapes … refused → covered
mutation-proven: NPM_PKG_SPEC → any non-flag token → whitelist: mutating shapes … refused → covered
mutation-proven: npxArgv injection removed from isAllowed → an approved npx argv runs with --no-install, injected once (+ regression: 2026-09-10 handoff) → covered
mutation-proven: `--no` accepted as an --no-install alias → whitelist: mutating shapes … refused → covered
mutation-proven: passthrough after `--` back to POS.ANY → whitelist: mutating shapes … refused → covered
```

Eleven of eleven `covered`. (The first attempt at the value-flag proof disabled the flag outright and red-ed the allowed list instead — `wrong-test-red` for that mutation, which is a fact about the mutation, not the test; re-run with the faithful gate-7 shape above.)

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full hermetic suite (`npm test`) | PASS — 3300 tests, 3299 pass, 1 skipped, 0 fail, 78 s |
| Skill suite (`skills/session-handoff/tests`) | PASS — 29/29 |
| `TMPDIR=/tmp` variance | PASS — 29/29 |
| `npm run bundle -- --check` | PASS — 128 skills, 0 problems |
| `npx prettier --check .` | PASS |
| `quick_validate.py skills/session-handoff` | PASS |
| Live handoff read (`.agents/handoff.md`, `--timeout 20`) | PASS — 17 confirmed · 1 stale (genuine) · 2 timeout; no orphans; tree clean |
| Step 4b snippets (SKILL.md) | information — `no-executable-blocks` (1 block, `command` fail-closed) |

---

## Test Artifacts

### Files Reviewed
`skills/session-handoff/scripts/handoff-verify.mjs` (whole), `skills/session-handoff/tests/handoff-verify.test.js` (corpora + npx test), `skills/session-handoff/SKILL.md`, `shared/resources/observation-log.js` (`nextId`, `sweepResolved`, `writeIdFloor`, the five read verbs), `scripts/generate-skill-dependencies.mjs` (`isMain`), `skills/loop-supervisor/scripts/run-loop.mjs` (`parseArgs` default), `package.json` scripts, bug.8/9/10 fix records, gates 5–7.

### Test Commands Executed
```bash
command node --test skills/session-handoff/tests/handoff-verify.test.js          # 29/29
command npm test                                                                  # 3299 pass, 0 fail, 1 skipped
TMPDIR=/tmp command node --test 'skills/session-handoff/tests/*.test.js'          # 29/29
command npm run bundle -- --check && command npx prettier --check . \
  && python3 skills/create-skill/scripts/quick_validate.py skills/session-handoff # all exit 0
command node skills/session-handoff/scripts/handoff-verify.mjs --timeout 20       # live read
command node skills/qa-task/references/qa-execute-snippets.mjs --file skills/session-handoff/SKILL.md --json
# scratch clone: git clone -q --no-hardlinks . $S/fx && ln -s $PWD/node_modules $S/fx/node_modules
# listener on 127.0.0.1:8099 logging every request; probes 1–3 through the CLI (see New Findings)
command node shared/resources/observation-log.js next-id --workspace $HOME/.cache/qa110-ws-probe --json   # ×2
# mutation proofs: $S/mutate.sh <label> <perl subst> <expected red test>, ×12
```

### Coverage Report
Not instrumented (repo convention); 29 tests across parse / whitelist / verify / cli / runner / template.

---

## Recommendations

### Immediate Actions (Blocking)
1. bug.11 — hold `--test`-mode positionals to a directory or a Node test-file name in `testModeArgsOk` (both arms), refused tests for the two executed spellings plus `npm test -- scripts/…` and `node --test node_modules/prettier/bin/prettier.cjs`, allowed tests for the test-directory and `*.test.js` shapes; fix the comment. **Third strike applies to `handoff-verify.mjs`** — the fix must be a mechanism change, a deletion, or a documented waiver, not a patch, and the fix summary must say which.
2. bug.12 — drop `next-id` from the observation-log verb pattern (or require `--dry-run`); refused test; SKILL.md `node` row.
3. bug.13 — anchor `remote show` / `get-url` positionals as `ls-remote` is (or drop `remote show`); refused tests for the http, https and scp spellings.

### Short-term Actions (Non-Blocking)
0. CR-7 / CR-8 (low, promoted): filter empty `expect:` figures on the comment path; fall back to `row N` for a missing check cell.
1. Decide whether `-X…=…` python values are tolerated (cache-only) and say so in the row, or refuse them.
2. Body `**Status:**` ↔ frontmatter `status` in the task document (`/finalise` will rewrite both).

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH `top_issues` entry (bug.11, executed, no precondition); security NFR FAIL (measured, 136 probes). Cycle-7 fixes verified and mutation-proven in full.
**Quality Score**: 40/100 (100 − 20 × 2 FAIL [HIGH issue, security NFR] − 10 × 2 CONCERNS [MEDIUM issues, maintainability])

**Deployment Recommendation**: BLOCKED
**Conditions**: bug.11 closed; bug.12 closed; bug.13 closed

---

**QA Report**: co-located at `task.110.qa.8.session-handoff-skill.md`
**Gate File**: co-located at `task.110.gate.8.session-handoff-skill.yml`
**Next Steps**: `/qa-fix` on gate 8 under the third-strike constraint; then re-review.
