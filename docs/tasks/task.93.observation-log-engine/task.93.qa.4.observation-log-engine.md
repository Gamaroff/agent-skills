# QA Report: Task 93 — Observation-log engine (Cycle 4)

**Task**: [task.93.observation-log-engine.md](./task.93.observation-log-engine.md)
**Gate File**: [task.93.gate.4.observation-log-engine.yml](./task.93.gate.4.observation-log-engine.yml)
**Previous**: [cycle 3](./task.93.qa.3.observation-log-engine.md) — CONCERNS (90/100)
**Review Date**: 2026-09-08
**Gate Status**: PASS · **Quality Score**: 96/100

---

## Executive Summary

TASK-93-007 is fixed and mutation-proven on **both** shipped encoders. No new findings. All seven
findings across four cycles are closed.

**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Finding | Cycle | Severity | Status |
|---|---|---|---|
| TASK-93-001 — worktree-dependent workspace | 1 | HIGH | ✅ FIXED |
| TASK-93-002 — doctor blind to project-path forks | 1 | MEDIUM | ✅ FIXED |
| TASK-93-003 — UTF-8 chunk-boundary corruption | 1 | MEDIUM | ✅ FIXED |
| TASK-93-004 — fork sweep false-positives across projects | 2 | HIGH | ✅ FIXED |
| TASK-93-006 — test suite writes into the real `~/.claude` | 2 | HIGH | ✅ FIXED |
| TASK-93-005 — `archive` silently overwrites | 2 | MEDIUM | ✅ FIXED |
| **TASK-93-007** — two path encoders, no cross-check | 3 | MEDIUM | ✅ **FIXED** |

### TASK-93-007 verification

The replacement test runs the **real** resolver in a **real** temp git repository under an isolated
`HOME`, and asserts the workspace it exports equals what the JS encoder predicts. Mutation-proven on
both sides:

| Mutation | Result |
|---|---|
| JS `encodeProjectPath` joins with `_` | RED |
| shell `_ow_encode_project_path` substitutes `_` | RED |

Both directions matter. A test that only caught the JS change would leave the shell side unguarded —
and it is the shell side that decides where data is actually written.

---

## Convergence

| Cycle | HIGH raised |
|---|---|
| 1 | 1 |
| 2 | 2 |
| 3 | 0 |
| 4 | **0** |

The count rose at cycle 2 and the stall guard was one cycle from firing. It did not, because cycle 3
raised none — and had it raised two, the correct outcome would have been escalation to a human, not
a softened severity.

---

## New Findings This Cycle

**None.**

Searched: the cycle-3 diff (one test file), plus a full ten-subcommand smoke sequence over a fresh
workspace, because the engine changed across three cycles and the end-to-end path had not been
re-run since cycle 1.

```
init → write ×3 → scan (ok, 3) → queue (ok, 3 open, reconciled)
     → set-status actioned → next-id (id=4, archived ["0002-obs-2.md"])
     → doctor (ok) → archive (already) → families (empty) → checkpoint (ok)
```

The `next-id` line is the assertion that matters: it archived the resolved file **as a side effect**,
without `archive` being called. That is the folded sweep still holding after three cycles of edits
around it.

---

## Success Criteria

All functional, performance, code-quality and migration criteria PASS. Tests **48**.
`npm run ci:fast` green: 2863/2864 (1 skipped), 448 shell assertions. `shellcheck` clean across all
56 tracked source scripts. `prettier` clean. `find ~/.claude` byte-identical before and after the
full suite.

---

## NFR Assessment

- **Security — PASS.** No shell-out, no `eval`, no network. `repoWorktrees()` reads the filesystem
  rather than invoking `git`, preserving the engine's no-subprocess property.
- **Performance — PASS.** `scan` cost is flat in body size (8,192 bytes for a 5 MB file), asserted in
  bytes. Baselines 90.3 / 108.0 / 152.7 ms.
- **Reliability — PASS.** Deterministic workspace across worktrees; archival cannot destroy data;
  the health check is accurate in both directions; the two encoders are pinned end to end.
- **Maintainability — PASS.** Every non-obvious rule carries the failure it prevents. Where a cheap
  test would prove nothing, the test says so.

---

## Final Assessment

**Gate**: PASS · **Score**: 96/100 · **Deployment**: APPROVED

Seven findings over four cycles, every one closed and mutation-proven. One pattern held throughout,
and it is the thing worth carrying out of this task:

> **The cheap version of a check reports success.**

A single-offset UTF-8 probe passed. A `cd`-based worktree test would have passed. A one-directional
fork test *did* pass, and let a HIGH through. A test that cleaned up after itself still wrote into
the user's home directory. And the first encoder-parity test passed while exercising neither shipped
encoder — the finding reproduced inside its own fix.

Each was caught only by constructing the input that could actually fail. That is what the mutation
discipline buys, and it is why this component's guards can be trusted rather than merely believed.

**Next Steps**: Step 5c — `/review-pr`, the QA loop's exit gate.
