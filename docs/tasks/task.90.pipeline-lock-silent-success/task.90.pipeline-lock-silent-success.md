---
id: task.90
title: "[Task 90] advance-pipeline-lock.sh reports success for an advance that did not happen"
type: task
description: "A zero-byte lock file passes the jq guard — jq on empty input emits nothing and exits 0 — so the script prints 'step 0 → 5', exits 0, and leaves the lock empty. Success is reported for a state transition that never occurred, in the pipeline's own state machine. Second, lower-severity defect in the same script: the $LOCK.tmp redirect follows a pre-existing symlink on a predictable path."
tags: [pipeline, shell, silent-failure, state-machine]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-04
updated: 2026-09-04
assignee: TBD
estimated_effort_hours: 5
---

# Technical Task: `advance-pipeline-lock.sh` reports success for an advance that did not happen

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.90.review.1.pipeline-lock-silent-success.md` implemented 2026-09-04

---

## 1. Overview

Found by the DoD security probe on task 77 (3029 executed probes), and **verified byte-identical on
`origin/develop`** — pre-existing, not introduced by that task, and deliberately left out of scope
there because task 77 had already reached Loop Escalation.

**Defect 1 — silent success on a zero-byte lock.** With `$PIPELINE_LOCK` a zero-byte file:

```bash
PIPELINE_LOCK=$T/lk bash shared/resources/advance-pipeline-lock.sh 5   # $T/lk is zero bytes
# prints: advance-pipeline-lock: step 0 → 5
# exits:  0
# leaves: $T/lk still zero bytes
```

`jq` on empty input emits nothing and exits **0**, so the `if ! jq` guard at `:138` does not fire and
`mv` installs the empty file. The caller is told the pipeline advanced. It did not.

The same fabrication happens for any input `jq` parses but that holds no object — a bare `null`, `[]`,
`"str"` or `42`, where `.current_step = $n` invents `{"current_step":5}` out of nothing. QA found that
neighbour while probing the fix for the empty case; both are closed by the same guard.

A whitespace-only lock is worse in one respect: the same path *truncates* a file that had content to
zero bytes, and still reports success.

**Defect 2 — symlink follow on a predictable path.** The `> "$LOCK.tmp"` redirect follows a
pre-existing symlink at that path, writing the JSON through to the target before `mv`. Low severity —
`.claude/state/` is same-trust-domain — but it is an insecure temp file on a guessable name.

## 2. Motivation

### Current problems

- The lock is the pipeline's state machine. A silent no-op that reports success is the worst shape a
  state-machine bug can take: the run believes it moved, the resume path reads a step that was never
  written, and nothing in the output distinguishes it from a real advance.
- Both `PreCompact` and `Stop` hooks read `current_step` from this file. An empty lock makes both
  hooks read `0` and re-drive the pipeline from the wrong position after a compaction.
- **The inherited "single hole" claim was false, and QA caught it.** This task was filed asserting
  that 18 executed `current_step` values (`null`, absent, `"abc"`, `-3`, `3.7`, `1e400`, malformed
  JSON, non-JSON) "all correctly preserve the lock and exit non-zero", making the zero-byte case the
  lone defect in an otherwise sound validator. Executed against the pre-fix script, **6 of those 8
  advance and exit 0** — only the two *unparseable* inputs failed closed. The claim came from task
  77's DoD probe and was carried into this document unverified.

  What actually held before this task: the script failed closed on input `jq` could not **parse**,
  and advanced on anything it could. Both the empty file and a bare `null` fall in the second group,
  which is why neither was caught.

  What holds after it: the script fails closed on anything that is not a **JSON object**. Inside a
  valid object a garbage `current_step` (`"abc"`, `-3`, `3.7`) still falls back to `0` and advances —
  deliberate, long-standing, and untouched here: the lock ends up in a *valid* state, so nothing is
  misreported.

### Benefits

- The one remaining silent-success path in the state machine becomes a fail-closed path, consistent
  with the other 18 malformed inputs.
- The temp write stops being addressable from outside the process.
- The test file gains the two cases and a zsh interpreter pass, so a regression is caught by
  `npm test` rather than by a confused resume.

## 3. Technical Background

### Current behaviour

`shared/resources/advance-pipeline-lock.sh` reads and writes the lock in two places:

| Site | Lines | Reads | Writes |
| ---- | ----- | ----- | ------ |
| `--skill commit-changes` arm | `:95-102` | `.current_step` | no (removes lock at `>= 8`) |
| main advance path | `:128-144` | `.current_step` | yes, via `> "$LOCK.tmp"` then `mv` |

`--complete` (`:68-72`) removes the lock with `rm -f` and never parses it.

The read at `:128` is already defensive — `jq -r '.current_step // 0' 2>/dev/null`, then an explicit
empty/`null` fallback to `0`. The write at `:138` is where the hole is: `jq` given empty input
produces empty output and exits 0, so `if ! jq` is false and `mv` installs a zero-byte file.

Verified locally:

```
jq -r '.current_step // 0' <empty file>   → no output, exit 0
jq -e . <empty file>                      → exit 4
jq --argjson n 5 '.current_step = $n' <empty file> → no output, exit 0   ← the hole
```

### Target behaviour

An empty or whitespace-only lock is treated as malformed at every site that **reads or writes the
lock JSON**: exit non-zero, print a diagnostic to stderr, leave the file untouched, print no success
line. `--complete` stays exempt — it only `rm`s, and gating it would make a corrupt lock permanently
unclearable, which is a worse failure than the one being fixed.

The temp write moves to `mktemp` in the lock's own directory, so the intermediate file has an
unpredictable name and is created `O_EXCL` — a pre-existing symlink at `$LOCK.tmp` is never opened.

## 4. Scope

In scope:

- Treat any lock that is **not a JSON object** as malformed — empty, whitespace-only, malformed, or
  parseable-but-not-an-object (`null`, `[]`, `"str"`, `42`): fail closed, exit non-zero, leave the
  lock untouched. Applies to the main advance path and the `--skill commit-changes` arm; **not** to
  `--complete`. (Widened from "empty or whitespace-only" after QA found the `null` case — same defect
  class, one predicate away.)
- Harden the temp write with `mktemp` in the lock's directory, so the redirect cannot follow a
  symlink.
- Extend `shared/resources/advance-pipeline-lock.test.sh` with both cases, and add a zsh interpreter
  pass guarded by `command -v zsh` (the convention `tracker-access.test.sh` already uses).
- Re-bundle: the script has **9 bundled copies** under `skills/*/references/` (10 files in total,
  counting the `shared/resources/` source).

Out of scope:

- The step allow-list and the `1..8` validator, both verified fail-closed under 144 executed probes.
- Any change to what the lock records or how orchestrators call it.
- `--complete` on a malformed lock — deliberately still removes it (see §3, Target behaviour).

## 5. Breaking Changes

None to any documented interface. Two behaviour changes worth naming:

- A zero-byte or whitespace-only lock now **exits 1** where it previously exited 0. No caller depends
  on that: every call site is `bash …advance-pipeline-lock.sh N` with its exit status unchecked or
  `|| true`, and a lock in that state was already broken.
- The lock file's mode after an advance becomes `0600` (mktemp's default) rather than umask-derived
  `0644`. `.claude/state/` is per-user state, so this is a tightening with no reader affected.

## 6. Implementation Plan

### Phase 1 — Fail closed on an empty or whitespace-only lock (Risk: Medium)

**Files**

- Modify `shared/resources/advance-pipeline-lock.sh`

**Changes**

- [x] Add a `require_parsable_lock()` helper that exits 1 with a stderr diagnostic when the lock is
      zero bytes or contains only whitespace. Use a textual test (`[ ! -s "$LOCK" ]` plus a
      whitespace-stripped read) rather than a second `jq` invocation — it tests exactly the stated
      condition and does not depend on jq's empty-input exit code, which is `4` for `-e .` and `0`
      for a filter.
- [x] Call it at the top of the `--skill commit-changes` arm, before the `CUR=$(jq …)` read.
- [x] Call it immediately before the `CURRENT=$(jq …)` read on the main advance path.
- [x] Leave `--complete`, the no-lock exit, the jq-missing exit and the loop-member noops untouched —
      none of them parse the lock.

**Dependencies**: none.

### Phase 2 — Harden the temp write (Risk: Low)

**Files**

- Modify `shared/resources/advance-pipeline-lock.sh`

**Changes**

- [x] Replace `> "$LOCK.tmp"` with a `mktemp` in `$(dirname "$LOCK")`, cleaning up the temp file on
      the jq-failure path exactly as the current code does.
- [x] Prefer `mktemp` over `set -o noclobber`: noclobber refuses to overwrite an existing file, but a
      symlink pointing at a **non-existent** target still gets created through. `mktemp` is `O_EXCL`
      on an unpredictable name and closes both.
- [x] Keep the `mv` — it is already atomic within the directory.

**Dependencies**: Phase 1 (same file; sequence to keep the diff readable).

### Phase 3 — Tests (Risk: Low)

**Files**

- Modify `shared/resources/advance-pipeline-lock.test.sh`

**Changes**

- [x] Scenario 8 — zero-byte lock: exit non-zero, file still zero bytes, no `step X → Y` on stdout.
- [x] Scenario 9 — whitespace-only lock: identical assertions, plus the file's bytes unchanged
      (this is the case that currently truncates).
- [x] Scenario 10 — a symlink at `$LOCK.tmp` pointing at a canary file: canary content unchanged
      after a successful advance, and the advance itself still succeeds.
- [x] Scenario 11 — `--complete` on a zero-byte lock still removes it (pins the §4 exemption, so a
      later widening of the guard is caught).
- [x] zsh pass: re-run scenarios 8–11 with `zsh "$SCRIPT"` as the interpreter, guarded by
      `command -v zsh` with a `SKIP` line when absent — the pattern `tracker-access.test.sh` §12 and
      §45 already use, and the reason CI (ubuntu-latest, no zsh) stays green.
- [x] Update the file's header comment block to list the new scenarios.

**Dependencies**: Phases 1–2.

### Phase 4 — Mutation proof (Risk: Low)

**Changes**

- [x] Revert Phase 1's guard alone → confirm scenarios 8 and 9 go red; restore.
- [x] Revert Phase 2's mktemp alone → confirm scenario 10 goes red; restore.
- [x] Record both in the implementation report. Per `shared/resources/mutation-proving.md`, a held
      proof says the test binds this behaviour — it does not say the fix is complete.

**Dependencies**: Phase 3.

### Phase 5 — Roadmap legend tag + re-bundle (Risk: Low)

**Files**

- Modify `docs/development/project-completion-roadmap.md`
- Regenerate `skills/*/references/advance-pipeline-lock.sh` (9 copies) via `npm run bundle`

**Changes**

- [x] Add a distinct legend tag — `pipeline-lock` — covering
      `shared/resources/advance-pipeline-lock.sh` and `advance-pipeline-lock.test.sh`.
- [x] Retag the T90 row to use it, replacing the approximate `bundles!, test-harness~`.
- [x] Do **not** widen `pipeline-steps`: that tag is prose (`develop-pipeline-step-*.md`,
      `lite-mode.md`), and lumping in an executable would make every doc-editing row falsely conflict
      with lock edits.
- [x] Run `npm run bundle`, then verify each of the 9 copies **by content** (`diff` or checksum
      against the source) — the bundler prints `in sync` for stale transitive copies (task 86).
- [x] Add the roadmap Change Log row.

**Dependencies**: Phases 1–2 (the bundled copies must carry the fixed script).

## 7. Files Summary

**Modify**

- `shared/resources/advance-pipeline-lock.sh` — the guard and the temp write
- `shared/resources/advance-pipeline-lock.test.sh` — scenarios 8–11 + zsh pass
- `docs/development/project-completion-roadmap.md` — legend tag + T90 row retag + Change Log

**Regenerate** (via `npm run bundle`, 9 files)

- `skills/{commit-changes,create-branch,create-pr,develop,develop-bug,develop-story,develop-task,finalise,review-story}/references/advance-pipeline-lock.sh`

> **A bundled copy is the source plus one line** — an `AUTO-GENERATED — DO NOT EDIT` banner the
> bundler inserts at line 2. "Verify by content" therefore means comparing the copy against the source
> *with that line removed*, not a raw checksum of the two files. See §13.

**Add** — none.
**Delete** — none.

## 8. Testing Strategy

- **Unit / behavioural** — `shared/resources/advance-pipeline-lock.test.sh`, run by `npm test`. The
  14 existing scenarios must stay green: they pin the `commit-changes` nesting contract and the
  Steps 5–6 loop noops, neither of which this change touches.
- **Interpreter parity** — scenarios 8–11 additionally under `zsh`, guarded by `command -v zsh`.
  macOS logins are zsh; the guard is what keeps ubuntu-latest CI green rather than red-on-absent.
- **Mutation proof** — Phase 4: each fix reverted individually, its scenario confirmed red, restored.
- **Bundle verification** — content comparison of all 9 bundled copies against the source, not the
  bundler's own `in sync` report.
- **Full gate** — `npm run ci` (format:check + npm test + eval:all) exits 0.

No integration or contract tests apply: the script has no network, no tracker, and no consumer beyond
the local lock file.

## 9. Success Criteria

- [x] A zero-byte lock file exits non-zero, leaves the file untouched, and prints no success line.
- [x] A whitespace-only lock file behaves identically, and is not truncated.
- [x] A lock that parses but is not an object (`null`, `[]`, `"str"`, `42`) fails closed and is left
      byte-identical.
- [x] `--complete` on a malformed lock still removes it (the deliberate exemption, pinned by a test).
- [x] A pre-existing symlink at `$LOCK.tmp` does not receive the write.
- [x] All cases covered in `advance-pipeline-lock.test.sh`, green under bash **and** zsh (30 scenarios).
- [x] The 14 pre-existing scenarios remain green.
- [x] Mutation-proved: revert each fix, confirm the new test goes red, restore.
- [x] All 9 bundled copies refreshed and verified **by content** (the bundler prints `in sync` for
      stale transitive copies — see task 86).
- [x] **A `touches:` tag covering this script exists in the roadmap legend, and this row is retagged
      to use it.** No tag covers `shared/resources/advance-pipeline-lock.sh` today: `pipeline-steps`
      is scoped to `develop-pipeline-step-*.md` and `lite-mode.md`, and `test-harness` covers
      `shared/resources/tests/*`, which does not include `advance-pipeline-lock.test.sh`. This row is
      therefore tagged `bundles!, test-harness~` — honest but approximate, so `--batch` could pair it
      with another row editing the same script and the two would conflict for real. Do **not** widen
      `pipeline-steps` to cover it: that tag is prose, and lumping in an executable would make every
      doc-editing row falsely conflict with lock edits. Add a distinct tag instead.
- [x] `npm run ci` exits 0.

## 10. Risk Assessment

| Risk | Level | Mitigation |
| ---- | ----- | ---------- |
| The new fail-closed guard fires on a legitimate lock, stalling live pipelines | Medium | The lock is only ever written by `jq` with a full JSON object or by an orchestrator heredoc; neither can produce an empty file. The 14 existing scenarios cover every legitimate shape and must stay green. |
| `--complete` gets caught by the guard, making a corrupt lock unclearable | Medium | Explicitly exempted in §4 and pinned by scenario 11, so a later refactor that widens the guard fails a test rather than shipping. |
| A bundled copy is left stale, so a consumer keeps the buggy script | Medium | Content verification of all 9 copies, not the bundler's `in sync` line (task 86's lesson). |
| `mktemp` unavailable or behaving differently across bash/zsh, macOS/Linux | Low | `mktemp` with an explicit `XXXXXX` template is POSIX-portable and already used by the test file itself (`mktemp -d`). Covered by the zsh pass. |
| Mode change `0644 → 0600` surprises a reader | Low | Named in §5. `.claude/state/` is per-user; no cross-user reader exists. |

## 11. Rollback Plan

**Trigger**: any pipeline halting at a lock advance that previously succeeded, or `npm test` red on
the pre-existing 14 scenarios.

**Procedure**

1. `git revert` the PR merge commit — the change is confined to one script, one test file, one
   roadmap file and 9 generated copies, with no migration and no persisted state.
2. `npm run bundle` to restore the 9 bundled copies from the reverted source.
3. Verify: `bash shared/resources/advance-pipeline-lock.test.sh` returns the original 14 passes.

**Estimated rollback time**: under 5 minutes. No data migration, no external state.

## 12. References

- `shared/resources/advance-pipeline-lock.sh` — the ineffective `if ! jq` guard at `:138-142`, the
  `> "$LOCK.tmp"` write at `:138`, the `--skill commit-changes` read at `:95-102`, and the `1..8`
  validator at `:120-126`
- `shared/resources/advance-pipeline-lock.test.sh` — 14 scenarios, bash only today; zsh parity is
  added by this task
- `shared/resources/tracker-access.test.sh` — §12 and §45, the `command -v zsh` guarded parity
  pattern to copy
- `docs/tasks/task.77.review-pr-in-pipeline/task.77.dod.3.review-pr-in-pipeline.md` — Step 3, both
  probes with their reproductions
- `docs/tasks/task.86.bundle-transitive-refresh/` — why the bundled copies need content verification
- `shared/resources/mutation-proving.md` — what a held mutation proof does and does not establish

## Progress Tracking

- [x] Phase 1 — fail-closed guard on empty / whitespace-only lock
- [x] Phase 2 — mktemp temp write
- [x] Phase 3 — scenarios 8–11 + zsh pass
- [x] Phase 4 — mutation proof recorded
- [x] Phase 5 — legend tag, row retag, 9 copies re-bundled and content-verified

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-04
**Quality Score**: 100/100
**Gate Decision**: PASS (cycle 2 of max 5)

### QA Reports

| Cycle | Gate | Score | Report | Gate file |
| --- | --- | --- | --- | --- |
| 1 | FAIL | 60/100 | [task.90.qa.1.*.md](./task.90.qa.1.pipeline-lock-silent-success.md) | [gate.1](./task.90.gate.1.pipeline-lock-silent-success.yml) |
| 2 | **PASS** | 100/100 | [task.90.qa.2.*.md](./task.90.qa.2.pipeline-lock-silent-success.md) | [gate.2](./task.90.gate.2.pipeline-lock-silent-success.yml) |

### Test Coverage Summary

- **Tests Executed**: 30 bash + 30 zsh; 20 input shapes probed; 7 refute probes; 3 mutation proofs
- **Phases Verified**: 5/5 · **Success Criteria**: 11/11, each verified by execution
- **Open Issues**: 0 HIGH, 0 MEDIUM, 3 LOW (all pre-existing, report-only)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings

Cycle 1 (FAIL, 60/100) found a 28 MB corrupted implementation report already pushed to the PR, a false "single hole" rationale shipped in `CHANGELOG.md`, and a whole-file `null` lock that fabricated an advance. All three are closed and **verified by execution** in cycle 2.

Fixing the third surfaced a fourth, which the fix cycle caught on itself: appending the type check after the existing emptiness check left the original mutation proof silently broken — neutering the emptiness branch kept all 30 tests green. That branch had become control flow no test could falsify. Resolved by restructuring to one decision predicate rather than keeping both.

Cycle 2 specifically checked whether the *replacement* claims repeat cycle 1's unverified-claim pattern. They do not: 9/9 and 4/4 probes hold, and cycle 1's own modest coverage claim about scenario 12 turned out to be exactly right.

Three LOW observations remain, all pre-existing and none a defect introduced here: a symlinked `$LOCK` is replaced rather than followed (safer for a hardening change), `PIPELINE_LOCK` as a directory is a silent noop (matches the documented contract), and a NUL-byte lock emits a cosmetic bash warning before the guard correctly fires.

---

## 13. Implementation Record

**Implemented**: 2026-09-04 · **Branch**: `feature/task.90.pipeline-lock-silent-success`

### Summary

Both defects fixed in `shared/resources/advance-pipeline-lock.sh`, covered by four new test scenarios
run under bash **and** zsh, each fix mutation-proved individually, a new `pipeline-lock` legend tag
added and the T90 row retagged, and all 9 bundled copies refreshed and content-verified.

### Approach

**Phase 1 — the fail-closed guard.** Added `require_parsable_lock()`, called at the two sites that
read or write the lock JSON: the `--skill commit-changes` arm and the main advance path. It tests the
condition **textually** (`[ ! -s "$LOCK" ]` plus a whitespace-stripped read) rather than with a second
`jq` call, because jq's empty-input exit code is inconsistent — `4` for `-e .`, `0` for a filter — and
that inconsistency is the bug's own cause. `--complete` is not guarded: it removes the lock without
parsing it, and gating it would make a corrupt lock permanently unclearable.

**Phase 2 — the temp write.** `> "$LOCK.tmp"` replaced with `mktemp` in the lock's own directory.
`mktemp` is `O_EXCL` on an unpredictable name, so a planted symlink is never opened. `noclobber` was
rejected as weaker: it refuses to overwrite an existing file, but a symlink pointing at a
*non-existent* target is still created through it.

**Phase 3 — tests.** Scenarios 8–11 factored into `run_malformed_lock_scenarios()`, parameterised on
the interpreter and called for `bash` and — guarded by `command -v zsh` — for `zsh`. The guard is what
keeps ubuntu-latest CI green rather than red-on-absence; it is the convention
`tracker-access.test.sh` §12/§45 already uses. Scenario 8 asserts three separate claims (non-zero
exit, lock untouched, **no success line**); the third is the defect itself. Scenario 10 asserts both
that the canary survives *and* that the advance still succeeds — checking only the canary would pass
a version that had simply stopped working.

**Phase 4 — mutation proof.** Each fix reverted alone:

| Mutation | Result | Verdict |
| -------- | ------ | ------- |
| Remove both `require_parsable_lock` calls | 18 passed, **4 failed** — zero-byte + whitespace-only, on both interpreters | held |
| Revert `mktemp` → `$LOCK.tmp` | 20 passed, **2 failed** — symlink scenario, on both interpreters | held |
| Restored | 22 passed, 0 failed | — |

Each mutation turned red exactly the scenarios it should and no others. Per
`shared/resources/mutation-proving.md`, this establishes that the tests bind these behaviours — not
that the fix is complete.

**Phase 5 — legend tag and re-bundle.** New `pipeline-lock` tag covering the script and its test file.
The T90 row moved from `bundles!, test-harness~` to `pipeline-lock!, bundles!` — `test-harness~` was
dropped because it covers `package.json`'s test script and `shared/resources/tests/*`, neither of
which this task touches, and the test file it *does* touch is now covered by the new tag.
`pipeline-steps` was deliberately **not** widened: it is a prose tag, and admitting an executable
would make every doc-editing row falsely conflict with lock edits.

### Correction: the bundler is fine; the first content check was wrong

A first pass at the "verify **by content**" criterion compared `sha256` of each bundled copy against
the source, found all 9 different, and concluded `npm run bundle` was reporting `in sync` while
leaving them stale — the task-86 defect. **That conclusion was wrong and is retracted here rather
than quietly deleted.**

A bundled copy is *not* a byte-copy of the source. The bundler inserts one line at position 2:

```
# AUTO-GENERATED — DO NOT EDIT. Source: shared/resources/advance-pipeline-lock.sh. Regenerate via `npm run bundle`.
```

So a raw checksum comparison can never match, for any file, however fresh. All 9 copies sharing one
hash that differs from the source is exactly what a *correctly* bundled set looks like — the evidence
was consistent with the opposite of the conclusion drawn from it.

Two things went wrong, worth separating:

1. **The check was invalid**, as above.
2. **The bundler's output was read from its tail only.** `npm run bundle` prints one line per skill
   across ~130 skills; the lines actually inspected were the last fifteen, which cover `shard-prd`
   through `ux-expert` — none of which carry this file. The nine `✅ … 1 bundled` lines were in the
   part not read. "Reported `in sync` for every skill" was an inference from an unrepresentative
   sample, stated as an observation.

Verified empirically afterwards: appending a probe marker to the source and running `npm run bundle`
propagates it to `skills/develop-task/references/advance-pipeline-lock.sh` in the same run. The
bundler refreshes correctly.

The interim `cp` used to "fix" the copies actually **removed** the AUTO-GENERATED banner from all
nine — a real regression, introduced by acting on the false finding. The pre-commit hook re-ran
`npm run bundle` and restored it before the commit landed, so nothing shipped: the committed copies
carry the banner, the guard (3 references each) and the `mktemp` write (1 each), with zero remaining
`> "$LOCK.tmp"` redirects.

**The correct content check**, used for the final verification:

```bash
for f in skills/*/references/advance-pipeline-lock.sh; do
  diff <(sed '2d' "$f") shared/resources/advance-pipeline-lock.sh || echo "MISMATCH $f"
done
# 9 copies checked, 0 mismatched
```

`task.86.bundle-transitive-refresh` remains filed and open on its own merits; **this run produced no
evidence for or against it**, and should not be cited as having reproduced it.

### Testing results

| Gate | Result |
| ---- | ------ |
| `bash shared/resources/advance-pipeline-lock.test.sh` | **22 passed, 0 failed** (14 pre-existing + 4 new × 2 interpreters) |
| `zsh shared/resources/advance-pipeline-lock.test.sh` | **22 passed, 0 failed** |
| `bash -n` / `zsh -n` on the changed script | clean |
| `npm run ci:fast` (`format:check` + `npm test`) | **exit 0** |
| `npm run ci` (`ci:fast` + `eval:all`) | **exit 0** — 432 shell assertions, node suite, and every replay eval green |
| Bundled-copy content verification | 9 checked, 0 stale |

The 14 pre-existing scenarios — the `commit-changes` nesting contract and the Steps 5–6 loop noops —
stayed green throughout, including under both mutations.

### Deferred

- The `npm run bundle` transitive-refresh defect above. Owned by `task.86`, out of scope here.

---

## Change Log

| Date       | Version | Description                                                      | Author      |
| ---------- | ------- | ---------------------------------------------------------------- | ----------- |
| 2026-09-04 | 1.0     | Filed from task 77's DoD security probe — pre-existing on develop, out of scope there | create-task |
| 2026-09-04 | 1.1     | Added the legend-tag success criterion — the gap was recorded in PR #310 but owned by nobody; folded into the scope of the task that already edits this script | edit-task |
| 2026-09-04 | 1.2     | Review passed (8.6/10) — restructured to the 11-section template (added Motivation, Technical Background, Breaking Changes, Implementation Plan, Files Summary, Testing Strategy, Risk Assessment, Rollback Plan, Progress Tracking); corrected three factual errors: the failing guard is at `:138`, not `:94-104`; there are **9** bundled copies, not 10; the test file does **not** run under zsh today, so that coverage is added rather than extended. Resolved the unstated scope gap on which invocation paths the new guard covers (`--complete` exempt, pinned by a test) | review-task |
| 2026-09-04 |         | Status → ready-for-development                                   | review-task |
| 2026-09-04 |         | Implemented — 12 files (1 script, 1 test file, 2 docs, 9 bundled copies), 22 tests green under bash and zsh, both fixes mutation-proved | develop |
| 2026-09-04 |         | QA gate FAIL (60/100) — 1 HIGH, 2 MEDIUM, 1 LOW; all 10 success criteria met, findings are in the artifacts shipped alongside the fix | qa-task |
| 2026-09-04 |         | QA findings fixed — 1 HIGH + 2 MEDIUM closed in 1 iteration: report rebuilt 480,884 → 218 lines, false "single hole" claim corrected in task/CHANGELOG/PR, non-object lock guard added (scenario 12); guard restructured to one falsifiable predicate on mutation-proof evidence | qa-fix |
| 2026-09-04 |         | QA gate PASS (100/100) cycle 2 — all 3 findings closed and verified by execution; refute pass found no new HIGH/MEDIUM; 3 LOW pre-existing observations recorded | qa-task |
