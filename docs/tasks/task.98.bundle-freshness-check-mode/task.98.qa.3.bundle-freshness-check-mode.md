# QA Report: Task 98 — cycle 3

**Task**: [task.98.bundle-freshness-check-mode.md](./task.98.bundle-freshness-check-mode.md)
**Gate File**: [task.98.gate.3.bundle-freshness-check-mode.yml](./task.98.gate.3.bundle-freshness-check-mode.yml)
**PR**: [#367](https://github.com/Gamaroff/agent-skills/pull/367)
**Review Date**: 2026-09-09
**Gate Status**: PASS

---

## Executive Summary

Cycle 3 re-probed the boundary the cycle-2 fix touched and found a **third** instance of the same
conflation, one level up: an unreadable *directory* under `references/` was silently unwalked by
`Path.rglob`, so the run reported `0 problems` over files it had never listed.

That is now fixed, and the pattern across the three cycles is the finding worth recording. The same
defect class — a failed read presented as a clean result — appeared in three separate places in one
function, and each fix was correct without being complete:

| Cycle | Site | Symptom |
|---|---|---|
| 1 | main loop, `_looks_bundled` fall-through | Unreadable file reported as "no banner, not byte-identical" |
| 2 | orphan scan, `if text is None: continue` | Orphan + unreadable → `0 problems` |
| 3 | orphan scan traversal, `Path.rglob` | Unreadable subtree → `0 problems` |

A narrowed re-review would have caught none of the second and third: each lives in code the previous
fix's own diff never touched.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| # | Finding | Status | Verification |
|---|---|---|---|
| T98-QA-001 | Headerless remedy pointed the wrong way | **FIXED** (cycle 1) | Re-probed; `.md` case verified to keep the generic text |
| T98-QA-002 | Unreadable file described as read-and-rejected | **FIXED** (cycle 1) | Re-probed → `UNREADABLE` |
| T98-QA-003 | Orphan scan returned a clean result over an unreadable file | **FIXED** (cycle 2) | Re-probed; mutation-proved in both directions (M15 under-report, M16 over-report) |
| T98-QA-004 | Unwalkable subtree returned a clean result | **FIXED** (cycle 3) | Re-probed → `UNREADABLE — directory could not be listed … anything beneath it was not checked`; M17 reds |

---

## New Findings This Cycle

Searched: the two branches cycle 2 introduced, re-probed unscoped rather than re-read — six hostile
probes executed, three of them new this cycle.

- **[medium, FIXED this cycle]** `bundle_skill.py` (orphan-scan traversal) — **T98-QA-004**.
  `Path.rglob` swallows a directory it cannot enter and yields nothing for it, so an unreadable
  subtree under `references/` was never walked and the run reported clean. Replaced with `os.walk`
  plus an `onerror` callback that reports the unwalkable directory and says what its failure means for
  the result. Verified: `UNREADABLE references/sub — directory could not be listed (PermissionError) —
  anything beneath it was not checked`.

- **[coverage gap, CLOSED this cycle]** The `os.walk` switch needed a compensating branch —
  `os.walk` yields directory *names* in `dirnames`, never as entries, so a symlinked directory that
  `rglob` used to surface would have been lost. The branch was written; **the mutation that removed it
  reded nothing**, which meant it was real but unguarded, and the traversal fix would have traded one
  blind spot for another with no test to say so. A test was added; M18 now reds.

  This is the second time in this task that a mutation proving nothing was the useful result — see
  M3 in cycle 1. Both are recorded rather than quietly fixed, because the discipline is what produced
  them.

Nothing else. Two probes returned findings that are **not** defects in this change:

- An unreadable **directory at a needed reference name** reports `AMBIGUOUS — not a regular file`.
  Correct: `is_file()` is tested before any read is attempted, so no read failure occurs.
- An unreadable **`references/` directory itself** crashes with a raw `PermissionError` traceback.
  **Verified pre-existing**: `bundle_skill.py` *without* `--check` crashes identically on the same
  input, in the write path this check shares. It also fails **safe** — loud, non-zero exit, CI red —
  which is the opposite of the defect class above, and the task's Out of Scope explicitly excludes
  changing the bundler's write behaviour. Recorded as a follow-up, not a blocker.

---

## Issues Found

HIGH: 0 · MEDIUM: 0 · LOW: 0 — all four findings across the three cycles are fixed and verified.

---

## NFR Assessment

### Performance — PASS
126 skills in ~2.8s, improved from cycle 2 by the `_is_binary` one-byte read. `os.walk` is
cost-equivalent to `rglob`.

### Reliability — PASS
The defect class is closed at all three sites, each with a test and — where over-reporting was also
possible — a mutation proof in both directions. The one remaining crash is pre-existing and fails safe.

### Security — PASS
`evidence: measured`, 6 probes executed across cycles 1 and 3. No writes, no network, no file content
echoed into output.

### Maintainability — PASS
The check shares the writer's definition of "in sync" rather than re-deriving it. Reasons are recorded
at the sites where they were decided, including both moments where a mutation proved nothing.

---

## Regression Testing

| Area | Result |
|---|---|
| All prior findings | PASS — each re-probed individually |
| Nested `references/` subtrees | PASS — a test pins that `os.walk` still reaches `sub/x.md` |
| Symlinked directories | PASS — newly covered |
| Existing bundler tests | PASS |
| Full suite | PASS — 3021+ pass / 0 fail |
| Full-tree `--check` | PASS — 126 skills, 0 problems |

---

## Mutation Proof Summary — 18 total

| Cycles | Count | Result |
|---|---|---|
| Cycle 1 (implementation) | M1–M11 | All red; M3 initially proved nothing → drove a new late-banner orphan test |
| Cycle 1 fixes | M12–M14 | All red |
| Cycle 2 fix | M15–M16 | Both red — under-reporting *and* over-reporting |
| Cycle 3 fix | M17–M18 | M17 red; M18 initially proved nothing → drove a new symlinked-directory test |

Control restores 29/29 after every mutation.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open findings. 7/7 success criteria met, 4/4 phases verified, 29 tests, 18 mutation
proofs, `ci:fast` green. The defect class that dominated cycles 1–3 is closed at every site it was
found in, and both coverage gaps the mutation discipline exposed are closed with tests.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**Next Steps**: Step 5c `/review-pr` as the loop's exit gate, then `/finalise`.
