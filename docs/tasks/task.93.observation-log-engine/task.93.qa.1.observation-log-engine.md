# QA Report: Task 93 - Observation-log engine, workspace resolver and contract

**Task**: [task.93.observation-log-engine.md](./task.93.observation-log-engine.md)
**Gate File**: [task.93.gate.1.observation-log-engine.yml](./task.93.gate.1.observation-log-engine.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Testing Completed**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

This is high-quality work with a thorough, self-aware test suite — 41 tests, 19 guards mutation-proven, full `npm run ci:fast` green, `shellcheck` clean across all 56 tracked source scripts. The gate is nevertheless **FAIL**, on three defects that share a property: **none of them is visible from reading the code, and none is caught by the existing suite.** All three were found by *executing* the code against inputs the suite does not construct.

The headline finding is the one the component was built to prevent. `resolve-observation-workspace.sh` derives a **different workspace per linked git worktree**, which is exactly the silent fork `doctor` exists to catch — and the second finding is that `doctor` cannot see it, because `forkCandidates()` never scans the directory the default actually writes to. One defect creates a silent fork; the other guarantees it stays silent.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5, all checkboxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (none — every file is new)
- [x] Code on feature branch with open PR ([#353](https://github.com/Gamaroff/agent-skills/pull/353), OPEN, commit `b542db10`)

### Testing Approach

- [x] Automated Testing (unit, integration, contract)
- [x] Performance Testing (scan cost vs body size, baselines)
- [x] Regression Testing (the one edit to pre-existing code)
- [x] Security Review
- [x] Code Review (Step 3b)
- [x] Manual Testing (every subcommand exercised end to end)

### Review Methodology

Direct tools, per the Adaptive Review Strategy — 5 phases (not >5), single module (`shared/resources/`), `risk_level` absent.

> ⚠️ **The Step 3b subagent pass did not complete, and the findings below are not its output.** A
> read-only Explore subagent was dispatched over the branch diff (3,707 lines) and was still
> running, having produced nothing beyond reading its own prompt, after five minutes. It was
> stopped. This is a known failure mode in this environment, and the rule it triggers is to verify
> in-line and **record that the independent pass did not run** rather than let its absence go
> unstated. Every finding in this report was produced by the reviewer directly, by execution.
> Recorded here because "the subagent found nothing" and "the subagent never reported" are the same
> sentence from the outside — which is the exact confusion this task's own contract exists to
> prevent.

**The findings in this report came from execution, not from reading.** That is a deliberate choice and it is the reason this cycle found anything: the change set is *already* covered by a suite whose author mutation-proved every guard in it, so a reading pass would largely re-derive conclusions the tests already encode. Constructing inputs the suite does not construct — a real linked worktree, a frontmatter larger than one chunk, non-ASCII on a buffer boundary — is where the remaining defects were.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: Contract first | PASS | Verified | 401 lines. CC BY 4.0 attribution present with an explicit statement that changes were made. Layout, field table, id rule, archival gate, `parked` semantics, families/`siblings_checked`, carrier pattern and version-control hazards all present. |
| Phase 2: The resolver | **CONCERNS** | Partial | Three-source order, exports and ephemeral refusal all correct and tested. **TASK-93-001**: the project-identity default is worktree-dependent. |
| Phase 3: Engine — reads | **CONCERNS** | Partial | `init`/`scan`/`queue`/`doctor` correct; `process.exitCode` discipline verified (zero real `process.exit()` calls — the three grep hits are comment text). **TASK-93-002** (doctor blind to project-path forks) and **TASK-93-003** (UTF-8 boundary). |
| Phase 4: Engine — writes | PASS | Verified | `next-id` folds the sweep; `write` uses `wx`; no `--id`; `set-status` validates lifecycle and — verified directly — leaves a `skill:` list byte-intact; `archive` correct in all four date/status cases. |
| Phase 5: Tests and registration | PASS | Verified | 41 tests, 19 guards mutation-proven, `AGENTS.md` section and `CHANGELOG` entry present. |

**Overall Phase Completion**: 3/5 phases clean; 2 with findings.

---

## New Findings This Cycle

- **[high]** `shared/resources/resolve-observation-workspace.sh` — worktree-dependent project-identity default (TASK-93-001) → derive from `--git-common-dir`
- **[medium]** `shared/resources/observation-log.js:990` — `forkCandidates()` does not scan `~/.claude/projects/*/skill-observations` (TASK-93-002) → add the glob
- **[medium]** `shared/resources/observation-log.js` — UTF-8 corruption on the chunk boundary in `readFrontmatterBounded()` (TASK-93-003) → use `StringDecoder`

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| All ten subcommands implemented and reachable | 10 | 10 | PASS |
| `doctor --json` returns valid JSON with a `reason` on a fresh workspace | yes | `reason: ok` | PASS |
| `next-id` over a log containing `0108` returns `109` | 109 | **109** | PASS |
| `next-id` performs the archival sweep, proven without calling `archive` | yes | verified | PASS |
| `write` exposes no way to supply an id | rejected | exit 2, explicit error | PASS |
| `set-status` rejects `parked` without `parked_until` | rejected | `parked-without-condition`, exit 1 | PASS |
| `queue` surfaces statusless files as OPEN and names them | yes | in `open[]` **and** `statusless[]` | PASS |
| The resolver refuses an ephemeral anchor with a non-zero exit | yes | `/tmp`, `/var/tmp`, `.claude/worktrees/`, linked worktree — all refused, rc=1 | PASS |
| The resolver's three-source precedence is asserted in that order | yes | config > env > default, all three tested | PASS |

### Performance

| Criterion | Target | Actual | Status |
|---|---|---|---|
| `scan` never reads an observation body | structural | 5,000,029-byte file → 8,192 bytes read | PASS |
| `scan --json` over 500 observations through a pipe emits complete JSON | complete | 261,087 bytes, `JSON.parse` clean, 500/500 entries | PASS |
| Baseline scan timings recorded for 1 / 100 / 1000 | recorded | 90.3 / 108.0 / 152.7 ms | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Every guard mutation-proven | all | **19/19** reverted → named test red → restored | PASS |
| `npm test` passes | pass | 2856/2857 (1 skipped), 448 shell assertions | PASS |
| `npm run format` clean | clean | `prettier --check` clean | PASS |
| `shellcheck --severity=warning` clean — **run**, not assumed | clean | clean on the new script and all 56 tracked sources | PASS |
| Engine takes no dependency on `resolve-platform.sh` or any tracker module | none | only local require is `./yaml-subset.js`, asserted by a test; the one grep hit is prose | PASS |
| No `process.exit()` after an output write | zero | zero real calls | PASS |

### Migration

| Criterion | Status |
|---|---|
| `AGENTS.md` carries the `## Observation Log` section | PASS |
| Contract carries CC BY 4.0 attribution + "changes were made" | PASS |
| `CHANGELOG.md` updated | PASS |

---

## Breaking Changes Validation

**None declared, and none found.** Every deliverable file is new. Two edits touch existing files and both are additive: `AGENTS.md` gains a section, and `read-config.sh` gains one key in `_CONFIG_GUARDED_KEYS` plus a comment line.

The `read-config.sh` edit was regression-tested directly — `resolve-platform.sh` and `resolve-paths.sh` still resolve correctly, and the 401-assertion `tracker-access.test.sh` suite passes. N/A for migration paths.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The resolver derives a different workspace per linked git worktree**

- **Severity**: HIGH
- **Category**: Functional / data integrity
- **ID**: TASK-93-001
- **Observation**: `_ow_project_root` uses `git rev-parse --show-toplevel`, which returns the *worktree* path inside a linked worktree. Demonstrated with a real worktree:

  ```
  main checkout   → ~/.claude/projects/-Users-gamaroff-Development-Projects-agent-skills
  linked worktree → ~/.claude/projects/-private-tmp-...-scratchpad-probe
  ```

- **Impact**: Two workspaces for one project — the **silent fork** `doctor` exists to catch, produced by the resolver itself. Not hypothetical in this repo: `/develop-batch` dispatches every parallel story into a linked worktree, so each would log observations to its own throwaway-path workspace, invisible to the main checkout and to each other. The contract's own words apply: "an empty, clean backlog … the one answer that never gets questioned."
- **Recommendation**: derive from the main worktree — `dirname "$(git rev-parse --path-format=absolute --git-common-dir)"`. **Verified**: returns `/Users/gamaroff/Development/Projects/agent-skills` from both the main tree and a linked worktree. The covering test must create a *real* linked worktree; nothing else reproduces it.
- **Priority**: P1

### MEDIUM Severity Issues (2)

**Issue: `doctor` cannot see the fork the resolver produces**

- **Severity**: MEDIUM · **ID**: TASK-93-002 · **Category**: Functional
- **Observation**: `forkCandidates()` (`observation-log.js:990`) scans `<cwd>/skill-observations`, `~/skill-observations` and `~/.claude/skill-observations`. It does **not** scan `~/.claude/projects/*/skill-observations` — which is precisely where the project-identity default writes, and therefore where TASK-93-001's forks land.
- **Impact**: The two findings compound. One creates a silent fork; this one guarantees it stays silent. `doctor` reports `no-fork` on a workspace that has one.
- **Recommendation**: glob `~/.claude/projects/*/skill-observations`, excluding the resolved workspace's own path. Cover it with a test that plants a second workspace under a sibling project directory.
- **Priority**: P2

**Issue: UTF-8 characters spanning the chunk boundary corrupt to U+FFFD**

- **Severity**: MEDIUM · **ID**: TASK-93-003 · **Category**: Functional / data integrity
- **Observation**: `readFrontmatterBounded()` accumulates with `buf.toString("utf8", 0, n)`. A multi-byte character straddling the 8192-byte boundary decodes as two partial sequences. Reproduced at **all eight** byte alignments tested (frontmatter >8 KB containing `é`): the title came back 5001 characters instead of 5000, carrying a replacement character.
- **Impact**: Silent data corruption — the header still parses, so nothing errors. Requires frontmatter over 8 KB, which is uncommon but reachable via a long `resolution:` or `session_context:`.
- **Worth recording**: the **first** single-offset probe passed. This defect hides from a spot check, which is why the covering test must sweep alignments rather than assert one fixture.
- **Recommendation**: `StringDecoder` from `node:string_decoder` — `dec.write(buf.subarray(0, n))` in the loop, `dec.end()` after. **Verified** to eliminate the corruption.
- **Priority**: P2

### LOW Severity Issues (0)

None.

**Total Issues**: HIGH: 1, MEDIUM: 2, LOW: 0

---

## NFR Assessment

### Performance — PASS

`scan` reads only to the closing `---`, so cost is flat in body size — measured at 8,192 bytes for a 5 MB file, and identical for a 500 KB and a 2 MB body. Baselines recorded (90.3 / 108.0 / 152.7 ms for 1 / 100 / 1000 observations); ~90 ms is fixed Node startup and the marginal cost is ~60 µs per observation. Asserted in **bytes, not seconds**, which correctly avoids the load-flaky timing assertion this repo has been bitten by twice.

### Reliability — CONCERNS

Guards are thorough, and the archival gate behaves correctly in all four cases tested (resolved-today stays, resolved-yesterday moves, ancient-parked stays, malformed-date stays). The `wx` create genuinely refuses to truncate.

The CONCERNS is TASK-93-001 and TASK-93-003: the *workspace itself* is non-deterministic across worktrees, and a decode boundary silently corrupts data. Both are reliability properties, and both fail silently — the mode this component was explicitly built to eliminate.

### Security — PASS

The engine shells out to nothing, evaluates nothing, and makes no network call. Its only requires are `fs`, `path`, `os` and the local `yaml-subset.js` — asserted by a test rather than by inspection. The resolver refuses ephemeral anchors before exporting anything. No secrets, tokens or credentials anywhere in the change set.

### Maintainability — PASS

Unusually strong. Every non-obvious rule carries the reason it exists and the failure it prevents, at the site where a reader would otherwise "simplify" it. The test file names the exact mutation that catches each guard, so the proofs are repeatable rather than asserted. The contract and the engine header were cross-checked for `reason`-vocabulary agreement and a real drift (`usage` undocumented) was found and closed during development.

---

## Code Review

Scoped to the branch diff (3,707 lines, excluding the 48 generated bundle copies and the pipeline's own report artifacts). **Performed by the reviewer directly** — the dispatched subagent did not complete (see Review Methodology).

**Correctness bugs (3)** — each confirmed by execution rather than by reading:

- [high/high] `shared/resources/resolve-observation-workspace.sh` — worktree-dependent workspace derivation → derive from `--git-common-dir`
- [medium/high] `shared/resources/observation-log.js:990` — `forkCandidates()` misses `~/.claude/projects/*` → add the glob
- [medium/high] `shared/resources/observation-log.js` — UTF-8 chunk-boundary corruption → `StringDecoder`

**Cleanups (0 blocking):** none material. The engine reuses `yaml-subset.js` rather than hand-rolling a sixth YAML reader, and reuses `read-config.sh`'s `read_nested_config_key` rather than re-implementing config access — both the correct calls.

**Checks that came back clean under direct testing:**

- `rewriteLifecycle` does **not** corrupt a `skill:` list — indented `  - a` items do not match the key regex. Verified on a three-entry list: byte-intact through a `set-status actioned`, and `scan` still returns `["a","b","c"]`.
- The `wx` create genuinely preserves pre-existing content rather than truncating it.
- `--dry-run` writes nothing while still reporting what it would do.

`code_review_blocking` was **not** set for this run, so these findings are advisory *by that mechanism* — but all three are independently recorded in the gate's `top_issues[]` as QA findings in their own right, which is what makes the gate FAIL.

---

## Step 4b: Execute the Documented Commands

The change set adds `shared/resources/observation-log-contract.md`, which contains fenced bash blocks, so the rule fires.

```
blocks: 1 · runnable: 0 · placeholder: 0 · mutating: 1
line 313 — skipped, reason: unrecognised-command: source (fail-closed)
note: no-executable-blocks
shells: bash, zsh (both available)
```

This is the **`no-executable-blocks`** case, not `zero-blocks-executed`: `placeholder` is 0 and the single block was refused because it documents `source`, which is deny-listed by design. No configuration makes it runnable, so there is nothing to act on — recorded and continued, per the rule.

The refused block is the call-site contract `source … || exit 1`. It is **not** left unverified: the test suite exercises it directly in five tests, including both directions of the ephemeral refusal and all three precedence tiers.

---

## Regression Testing

| Area | Result |
|---|---|
| `read-config.sh` consumers (`resolve-platform.sh`, `resolve-paths.sh`) | PASS — both resolve correctly; the edit is one key plus a comment |
| `tracker-access.test.sh` (the suite that guards the key list) | PASS — 401/401 |
| Bundled `references/read-config.sh` × 48 | PASS — refreshed via `npm run bundle`; byte-identical-to-source check green |
| Full repo suite | PASS — 2856/2857 node tests, 1 skipped, 0 failed |
| **Tracked-tree probe** | PASS — a detached worktree at `HEAD` contains all four new files and runs the suite 41/41, confirming nothing depends on untracked working-tree state |

---

## Test Artifacts

### Files Reviewed

- `shared/resources/observation-log.js` (1,347 lines)
- `shared/resources/resolve-observation-workspace.sh` (183)
- `shared/resources/observation-log-contract.md` (401)
- `shared/resources/tests/observation-log.test.mjs` (1,277)
- `shared/resources/read-config.sh` (diff only)
- `AGENTS.md`, `CHANGELOG.md` (diff only)

### Test Commands Executed

```bash
npm run ci:fast                                            # format:check + full test suite
node --test shared/resources/tests/observation-log.test.mjs
shellcheck --severity=warning $(git ls-files '*.sh' | grep -v '^skills/[^/]*/references/')
shellcheck --severity=warning shared/resources/resolve-observation-workspace.sh
node .agents/skills/qa-task/references/qa-execute-snippets.mjs \
  --file shared/resources/observation-log-contract.md --json
git worktree add --detach <probe> HEAD                     # tracked-tree probe
```

### Coverage

The repo runs no coverage instrumentation, so no percentages are reported. The stronger signal available here is the **19 mutation proofs**, which establish that the guards can fail — a property line coverage does not measure. Spot-checked independently: reverting the bounded read turned the named test red, and restoring it turned it green.

---

## Recommendations

### Immediate Actions (Blocking)

1. **TASK-93-001** — derive the project root from the main worktree (`--git-common-dir`); cover with a real-linked-worktree test. P1.
2. **TASK-93-002** — scan `~/.claude/projects/*/skill-observations` in `forkCandidates()`. P2.
3. **TASK-93-003** — use `StringDecoder` in `readFrontmatterBounded()`; cover with a multi-alignment test. P2.

### Short-term Actions (Non-Blocking)

1. The resolver reads `observations.workspace`, whose schema is deferred to task 95. Anyone reading the resolver before 95 lands has no reference. The task already records this as a known non-blocking issue; no action needed this cycle.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH finding (rule 1: any high-severity issue → FAIL). The HIGH is not a peripheral defect — it is the component's own headline failure mode, occurring in the component built to prevent it, in a repo that actively uses the trigger condition.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

**Conditions**:
- TASK-93-001 fixed and covered by a real-linked-worktree test
- TASK-93-002 fixed so `doctor` can see project-path forks
- TASK-93-003 fixed with a multi-alignment test

**A note on what this gate is not saying.** The FAIL is narrow. 41 tests, 19 mutation proofs, full CI green, `shellcheck` clean, and a contract that documents its own reasoning — this is materially better than most work that passes first time. All three findings live in the same seam: **the boundary between the process and the world outside it** (which checkout am I in, which directory is the real one, where does a buffer end). Everything the engine does to its own data is correct and proven. That is a coherent, fixable shape, not a scattering.

---

**QA Report**: `task.93.qa.1.observation-log-engine.md`
**Gate File**: `task.93.gate.1.observation-log-engine.yml`
**Next Steps**: three fixes and their tests, then re-review.
