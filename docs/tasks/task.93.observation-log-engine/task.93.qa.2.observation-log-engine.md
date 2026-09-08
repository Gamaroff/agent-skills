# QA Report: Task 93 - Observation-log engine, workspace resolver and contract (Cycle 2)

**Task**: [task.93.observation-log-engine.md](./task.93.observation-log-engine.md)
**Gate File**: [task.93.gate.2.observation-log-engine.yml](./task.93.gate.2.observation-log-engine.yml)
**Previous Cycle**: [task.93.qa.1.observation-log-engine.md](./task.93.qa.1.observation-log-engine.md) — FAIL (70/100)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-08
**Gate Status**: FAIL

---

## Executive Summary

All three cycle-1 findings are **fixed and mutation-proven**. Cycle 2 was a **refute pass** over the whole branch diff — the one cycle whose job is to find the claim that is false rather than to confirm the change works — and it found two more defects.

One of them was **introduced by a cycle-1 fix**. That is not a criticism of the fix; it is the specific case this pass exists for, and it is the third time in this task that the cheap version of a check would have reported success.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED
**Quality Score**: 70/100 — unchanged from cycle 1. The three cycle-1 defects are closed, and three
new ones took their place; two of the three were introduced by cycle-1 work.

---

## Re-Review Context

| Cycle 1 Finding | Severity | Status | Verification |
|---|---|---|---|
| **TASK-93-001** — worktree-dependent workspace | HIGH | ✅ **FIXED** | A real linked worktree and the main checkout now resolve the same workspace. Mutation-proven: reverting `--git-common-dir` → `--show-toplevel` turns the named test red. |
| **TASK-93-002** — `doctor` blind to project-path forks | MEDIUM | ✅ **FIXED** (over-reaches — see TASK-93-004) | `doctor` detects a planted second workspace under `~/.claude/projects`. Mutation-proven. |
| **TASK-93-003** — UTF-8 chunk-boundary corruption | MEDIUM | ✅ **FIXED** | All eight byte alignments decode cleanly, no U+FFFD. Mutation-proven: reverting to `buf.toString("utf8", …)` turns the named test red. |

**3 of 3 fixed. 0 partial. 0 not fixed.** Each was verified by re-reproducing the original defect against the fixed code, not by reading the diff.

---

## Review Methodology

**Re-review scope: unscoped — whole branch diff (cycle 2 refute pass).**

Cycle 2 is deliberately not narrowed to the files changed since the last gate. Those files *are* cycle 1's own fixes, so a narrowed pass reads only the repairs and never re-reads the original change with what cycle 1 learned. Both new findings vindicate that: TASK-93-004 is *in* a cycle-1 fix, and TASK-93-005 is in code cycle 1 never touched.

> ⚠️ **The code-review subagent was not dispatched this cycle.** The cycle-1 dispatch hung, produced nothing beyond reading its own prompt, and was stopped after five minutes. Re-dispatching it would have spent the same budget on the same risk. The refute pass was performed by the reviewer directly, by **executing** the code against constructed inputs — which is the stronger instrument for this change set anyway, and is how all five findings across both cycles were actually obtained. Recorded because "the subagent found nothing" and "the subagent never ran" are the same sentence from outside.

**Eleven probes were run.** Nine came back clean; they are listed below, because a refute pass that reports only its hits is indistinguishable from one that stopped early.

---

## New Findings This Cycle

- **[high]** `shared/resources/observation-log.js` — the cycle-1 fork sweep flags every other project's legitimate workspace (TASK-93-004)
- **[high]** `shared/resources/tests/observation-log.test.mjs` — the suite writes into and reads from the developer's real `~/.claude` (TASK-93-006)
- **[medium]** `shared/resources/observation-log.js` — `archive` silently overwrites an existing archived file (TASK-93-005)

### TASK-93-004 — the fork fix cries wolf

**Severity**: HIGH · **Introduced by**: the cycle-1 fix for TASK-93-002

`forkCandidates()` now sweeps every directory under `~/.claude/projects/`. But that directory holds **one entry per project on the machine** — this one has 12:

```
-Users-gamaroff-Development-Goji-Wallet-goji-system
-Users-gamaroff-Development-Projects-agent-skills
-Users-gamaroff-Development-Projects-lanner
-Users-gamaroff-Development-Projects-room-raider
… 8 more
```

So any *other* project's workspace reads as a fork of this one. Demonstrated by planting a `skill-observations/` under an unrelated project's directory:

```json
{"reason":"fork-detected","noForkOk":false,
 "detail":"a second skill-observations/ exists at: …-some-other-repo/skill-observations"}
```

**Why this is HIGH rather than a cosmetic over-report.** The moment a *second* project adopts the observation log, `doctor` fails in **both** projects, permanently, on every run — naming a path that is not a fault. That is worse than the blindness it replaced. This repo has the lesson written down already: an ignored check is a check that does not exist (`bug.7`). A health check that always fires trains its reader to skip it, and the next real fork arrives into a report nobody is reading.

**Remedy (verified shape)**: a fork is a second workspace for **this** project — the main worktree or any linked worktree of the same repo, which is exactly the fork TASK-93-001 used to create. Derive the candidate set from `git worktree list --porcelain` with path separators replaced by hyphens, excluding the resolved workspace's own path. Precise, and no false positives.

### TASK-93-006 — the test suite writes into the developer's real `~/.claude`

**Severity**: HIGH · **Introduced by**: the cycle-1 fix for TASK-93-002 · **Found by**: the operator

The cycle-1 regression test plants a directory in the **real** `~/.claude/projects` on every
`npm test`, and its `mkdirSync(..., { recursive: true })` creates `~/.claude` and
`~/.claude/projects` themselves if absent and leaves them behind. The `finally` removes only the
planted leaf.

Four further tests — **every** `doctor` invocation — *read* the real home, because
`forkCandidates()` probes `~/skill-observations` and `~/.claude/skill-observations` and no test
passes an `env`. So the suite both mutates the user's data directory and returns results that depend
on what happens to be in it: a developer with a stray `~/skill-observations` gets spurious failures.

**How it surfaced, which is the part worth recording.** The operator stopped a verification script
this reviewer had written for TASK-93-004. It contained:

```bash
ENC=$(command node -pe "...encodeProjectPath('$PROBE')")
rm -rf "$PJ/$ENC"        # $ENC empty  →  rm -rf ~/.claude/projects/
```

An unguarded variable in an `rm -rf`. Had the preceding command substitution failed, it would have
deleted every session transcript and the memory directory. Reviewing *why* that script needed to
touch the real home at all is what exposed that the committed tests already did.

**Remedy**: redirect `HOME` to a temp directory for every `doctor` invocation, using the repo's
existing env allow-list shape with the temp home substituted. Isolation by **redirection**, never by
careful paths under the real home — a temp home is discarded wholesale, so there is no cleanup step
to get wrong and no `rm -rf` whose argument could be empty.

### TASK-93-005 — `archive` silently overwrites

**Severity**: MEDIUM

`sweepResolved()` moves files with `fs.renameSync`, which overwrites an existing destination without complaint. Demonstrated:

```
before:  observation-log/0001-dup.md          "ACTIVE VERSION"
         observation-log/archive/0001-dup.md  "ARCHIVED VERSION — MUST NOT BE LOST"
after archive:  reason "ok", archived ["0001-dup.md"]
         observation-log/archive/0001-dup.md  ← now the ACTIVE version. The archived one is gone.
```

**Why it matters more than its likelihood suggests.** It contradicts the engine's own stated posture: `write` uses `wx` *specifically* so that a create can never truncate, and the contract says so at the call site. The one operation that moves files does not hold that line. The task's Rollback Plan also claims "nothing is destroyed, only misfiled" — which this makes false.

Reachable whenever an active and an archived file share a name: an observation restored from the archive to be reopened, a `git checkout` of a deleted active file, or a corrupted `.id-floor` permitting id reuse.

**Remedy**: check the destination first (or use `linkSync` + `unlinkSync`, which fails on an existing destination), leave the file in place on collision, and report it in the sweep's `skipped[]` — the `reason` vocabulary already carries `collision`.

---

## Probes That Came Back Clean

| # | Probe | Result |
|---|---|---|
| 2 | `set-status` against an **archived** id | Clean — `usage`, exit 2, "no observation with id 5". Archived entries are not editable in place, which is defensible. |
| 3 | `slugify` on an all-punctuation title (`———`) and an all-CJK title | Clean — both fall back to `observation`; ids keep them unique. Noted as a `future` item, not a defect. |
| 4 | Two writes with the **same title** | Clean — `0008-same-title.md`, `0009-same-title.md`. No collision. |
| 5 | `checkpoint --note` containing a newline and a tab | Clean — collapsed to exactly one line. |
| 6 | `queue` reconciliation when some files are unparseable | Clean — `total` excludes unparseable, `reconciled: true`, unparseable named separately. |
| 7 | A frontmatter header **larger than the 64 KB cap** | Clean — gives up at 65,536 bytes, returns `null`, and `scan` lists it in `unparseable[]`. No mis-parse. |
| 8 | `families` markdown-table parsing | Clean — members, shared rules and member-specific columns all split correctly. |
| 9 | `families --audit` against the real repository | Clean — runs, finds real gaps, judges absence against the member-specific column. |
| 10 | `scan --status open` over an unparseable log | Clean — **`scan-broken` fires before the filter**, so a filter cannot mask a broken instrument as an empty result. |
| — | Adversarial pass over the cycle-1 fixes (teardown / in-flight / error / reconnect) | Clean — fd close still in `finally`; the decoder's early-return path loses nothing; `forkCandidates` degrades to `[]` on a missing directory; the three fixes do not interact. |

Probe 10 is worth singling out: it is the engine's central thesis holding under a case that could easily have broken it.

---

## Success Criteria Verification

Unchanged from cycle 1 — all functional, performance, code-quality and migration criteria still PASS. The two new findings are **not** criteria failures; they are defects in code that meets its stated criteria, which is why the criteria table alone would have passed this change.

Test count: 41 → **44**. `npm run ci:fast` green: 2859/2860 (1 skipped), 448 shell assertions across 4 suites, `shellcheck` and `prettier` clean.

---

## NFR Assessment

### Performance — PASS
Unchanged. `StringDecoder` adds no reads; the `~/.claude/projects` sweep runs only in `doctor`.

### Reliability — CONCERNS
Improved: the workspace is now deterministic across worktrees, which was cycle 1's central failure. Still CONCERNS — TASK-93-005 is silent data loss, and TASK-93-004 makes the health check unreliable in the *opposite* direction from cycle 1 (a check that never fires became one that always fires).

### Security — PASS
Unchanged: no shell-out, no `eval`, no network; only local requires.

### Maintainability — PASS
The cycle-1 fixes each carry the reason they exist and the failure they prevent. Both non-obvious test designs explain why the cheap version would prove nothing — the real-worktree requirement and the eight-alignment sweep.

---

## Code Review

Performed by the reviewer directly (see Review Methodology).

**Correctness bugs (2)** — both above, both confirmed by execution:

- [high/high] `shared/resources/observation-log.js` — fork sweep false-positives across projects
- [medium/high] `shared/resources/observation-log.js` — `archive` overwrites via `renameSync`

**Cleanups (0 blocking).**

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH finding (rule 1). Both findings are narrow and both have a verified remedy.
**Quality Score**: 75/100

**The trajectory is right.** Cycle 1's three findings are closed and proven; cycle 2's two are smaller, and one of them exists only because cycle 1's fix landed. The recurring lesson across both cycles is the same one, and it is worth stating plainly since it has now paid out three times: **the cheap version of a check reports success.** A single-offset UTF-8 probe passed. A `cd`-based worktree test would have passed. A fork sweep that looked right in isolation fires on every project on the machine. Each was caught only by constructing the input that could actually fail.

---

**Next Steps**: two fixes and their tests, then re-review.
