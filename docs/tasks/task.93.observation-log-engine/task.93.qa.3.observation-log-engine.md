# QA Report: Task 93 — Observation-log engine (Cycle 3)

**Task**: [task.93.observation-log-engine.md](./task.93.observation-log-engine.md)
**Gate File**: [task.93.gate.3.observation-log-engine.yml](./task.93.gate.3.observation-log-engine.yml)
**Previous**: [cycle 2](./task.93.qa.2.observation-log-engine.md) — FAIL (70/100)
**Review Date**: 2026-09-08
**Gate Status**: CONCERNS · **Quality Score**: 90/100

---

## Executive Summary

All three cycle-2 findings are fixed and mutation-proven. **Zero HIGH findings this cycle** — the
loop is converging, and the guard that would have stopped it does not trip.

One MEDIUM remains, and it is a direct consequence of the cycle-2 fix: there are now **two**
implementations of the project-path encoding, and nothing asserts they agree. They do agree today —
verified across six inputs. But an unguarded second derivation of the same path is the exact hazard
this task's own risk register names.

**Deployment Recommendation**: CONDITIONAL

---

## Convergence check

| Cycle | HIGH raised |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | **0** |

The guard trips when `HIGH_N >= HIGH_{N-1}` **and** `HIGH_{N-1} >= HIGH_{N-2}`. The second condition
already held (`2 >= 1`), so **cycle 3 had to raise fewer than 2 HIGH or the loop would have
escalated to a human**. It raised none.

Recording that explicitly because it was a live constraint while this review was being written, and
the correct response to a third HIGH would have been to escalate — not to soften a severity to keep
the loop alive.

---

## Re-Review Context

| Cycle 2 Finding | Severity | Status | Verification |
|---|---|---|---|
| **TASK-93-004** — fork sweep false-positives across projects | HIGH | ✅ **FIXED** | Both directions confirmed against a temp `HOME`: an unrelated project → `no-fork: true`; this project's own encoding → `fork-detected`. Mutation-proven. |
| **TASK-93-006** — test suite writes into the real `~/.claude` | HIGH | ✅ **FIXED** | `find ~/.claude` byte-identical before and after the full `ci:fast`; project count unchanged at 12. Mutation-proven. |
| **TASK-93-005** — `archive` silently overwrites | MEDIUM | ✅ **FIXED** | Archived file survives byte-for-byte, active file stays put, sweep reports `skipped: [{file, why: "collision"}]`. Mutation-proven. |

Each was verified by **re-reproducing the original defect against the fixed code**, not by reading
the diff.

### `repoWorktrees()` — the new code, probed adversarially

It is called on every `doctor` run and parses `.git` by hand, so it was probed rather than read:

| `.git` shape | Result |
|---|---|
| no repository anywhere above | `[]` |
| `.git` file with a malformed body (no `gitdir:`) | falls back to the containing directory |
| `.git` file whose `gitdir` has no `/worktrees/` segment | falls back to the containing directory |
| `.git` file pointing at a **nonexistent** admin directory | derives a bogus root (`/nope`) alongside the real one — harmless, see below |
| `.git` an empty directory | treated as the main worktree |
| **real repo root** | main worktree + linked worktree ✅ |
| **real repo subdirectory** | same pair ✅ |
| **inside a real linked worktree** | same pair ✅ |

Nothing throws. The three real cases return the correct pair from all three vantage points, which is
what fork detection depends on.

---

## New Findings This Cycle

- **[medium]** `shared/resources/tests/observation-log.test.mjs` — two path encoders, no test that
  they agree (TASK-93-007)

### TASK-93-007 — two encoders, no cross-check

The cycle-2 fix added `encodeProjectPath()` in JavaScript. `_ow_encode_project_path` already existed
in `resolve-observation-workspace.sh`. They answer the same question for different consumers:

- the **shell** one decides where the workspace **is**;
- the **JS** one decides where `doctor` **looks** for forks.

Verified this cycle that they currently agree:

| Input | Both produce |
|---|---|
| `/Users/gamaroff/Development/Projects/agent-skills` | `-Users-gamaroff-Development-Projects-agent-skills` |
| `/a/b` | `-a-b` |
| `/` | `-` |
| `/x/y/` (trailing slash) | `-x-y-` |
| `/has spaces/in it` | `-has spaces-in it` |
| `/uni-çøde/päth` | `-uni-çøde-päth` |

**So why is this a finding?** Because nothing keeps them in step. If they ever diverge, `doctor`
silently stops recognising the resolver's own workspace and the fork check goes quiet — a guard
failing silently, which is the failure mode this entire component exists to eliminate.

The task's own **Low Risk Areas §1** predicted this and prescribed the remedy ("assert it against the
documented convention in a test"). Cycle 1 satisfied that against the *documented* convention. The
cycle-2 fix then created a second *implementation*, and no one re-read the mitigation.

**Remedy**: run both encoders over a shared input set and assert equality — invoking the shell one
through `spawnSync` against the real script, **not** a reimplementation, which would merely be a
third encoder proving nothing.

---

## Success Criteria

Unchanged — all functional, performance, code-quality and migration criteria PASS. Tests 44 → **47**.
`npm run ci:fast` green: 2862/2863 (1 skipped), 448 shell assertions, `shellcheck` and `prettier`
clean.

---

## NFR Assessment

- **Security — PASS.** Still no shell-out, no `eval`, no network. `repoWorktrees()` was deliberately
  written against the filesystem rather than invoking `git`, which preserves the property.
- **Performance — PASS.** One upward directory walk plus a small readdir, on `doctor` only.
- **Reliability — PASS** *(upgraded from CONCERNS).* The workspace is deterministic across worktrees,
  archival can no longer destroy data, and the health check now reports accurately in both
  directions. The remaining MEDIUM is a missing guard against *future* drift, not a current defect.
- **Maintainability — PASS.** `repoWorktrees()` documents why it avoids shelling out; the fork tests
  document why both directions must be asserted.

---

## Final Assessment

**Gate**: CONCERNS · **Score**: 90/100 · **Deployment**: CONDITIONAL

Three cycles, seven findings, all but one closed. The pattern across all of them is worth stating
once, because it held every time: **the cheap version of a check reports success.** A single-offset
UTF-8 probe passed. A `cd`-based worktree test would have passed. A one-directional fork test did
pass — and let TASK-93-004 through. A test that cleaned up after itself still wrote into the user's
home directory. And now: two encoders that agree, with nothing to notice if they stop.

**Next Steps**: one test, mutation-proved, then re-review.
