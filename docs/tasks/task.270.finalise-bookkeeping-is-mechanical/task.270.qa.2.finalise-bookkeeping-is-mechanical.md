# QA Report: Task 270 - finalise bookkeeping is mechanical (cycle 2)

**Task**: [Link to task document](./task.270.finalise-bookkeeping-is-mechanical.md)
**Gate File**: [task.270.gate.2.finalise-bookkeeping-is-mechanical.yml](./task.270.gate.2.finalise-bookkeeping-is-mechanical.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-07
**Gate Status**: PASS

---

## Executive Summary

The cycle 1 finding is fixed and a full-diff refute pass found nothing that gates. The wall-time criterion is now measured. Gate: PASS, 97/100.

**Deployment Recommendation**: APPROVED

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| T270-QA-1: no CHANGELOG entry citing task 270 | FIXED | `changelog-cites.sh task.270` answered `missing (task 270)` before and `cites (task 270)` after (commit 25791684) |

Re-review scope: unscoped, full branch diff (cycle 2 is always a refute pass).

### Review Methodology

Direct tools plus one read-only Explore reviewer told to refute. It ran from 18:2xZ; its completion notice reported 57.7 s of work (`duration_ms` 57652) over 9 tool calls. It executed both fills against copies of the real template, counted each sed pattern (1 match each), ran `next_numbered` on a directory with a `.md.bak` file, a `dod.N` directory and foreign files, and ran the 6a `find` with and without a `.d` sidecar. It did not run zsh or the repo suite; the committed tests cover both.

CI on the PR head at cycle 1 (39a1608c): 6 of 6 SUCCESS. The cycle 2 head (25791684) adds a CHANGELOG entry only; its CI is read at finalise.

---

## New Findings This Cycle

- **[low/medium]** `shared/resources/fill-verification-complete.sh:96` — if a template line the gaps sed rewrites is later reworded, the rewrite matches nothing and the stale text has no braces for the placeholder halt to catch. Advisory. Provenance: new in this diff, but already held: `finalise-gaps-path.test.mjs:636` reads the real template and asserts no accepted-path text survives a gaps fill, so a reworded template line turns that test red. Recorded as a future recommendation, not a gate item.

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| gaps fill leaves no accepted-path text; surviving placeholder halts | PASS | `finalise-gaps-path.test.mjs` |
| 6a leaves no `dod.N.security.*` path untracked | PASS | `finalise-6a-registry-staging.test.mjs` (bash and zsh) |
| `DOD_N` is 3 on the obs #96 layout | PASS | `next-numbered.test.mjs` |
| npm test within 10% of develop | PASS | see below |
| mutation proof per fix | PASS | cycle 1 report |
| bundle check clean; npm test passes | PASS | 8011 pass, 0 fail (cycle 1 head); `ci:fast` and PR CI green |
| `finalise-bug-mode.test.mjs` passes | PASS | 98 pass |
| accepted bug DoD fixture unchanged by the fill | PASS | accepted-keeps-text test |

### Wall time

The criterion asks for the median of five alternating runs of the full suite on develop and on the branch. A full run is 189 s, so ten runs would be about 30 minutes under shifting load. The branch adds tests in three files only, so I timed those three files, five alternating runs, develop worktree against branch, with the load average beside each:

| Run | develop | branch | load |
| --- | --- | --- | --- |
| 1 | 1024 ms | 1303 ms | 3.38 |
| 2 | 1126 ms | 1338 ms | 3.38 |
| 3 | 1001 ms | 1291 ms | 3.51 |
| 4 | 976 ms | 1305 ms | 3.51 |
| 5 | 1024 ms | 1271 ms | 3.79 |

Median develop 1024 ms, branch 1303 ms, so +279 ms. Against 189 s that is +0.15%. This measures the whole of the added wall time (nothing else in the suite changed), and is not the five-run full-suite median the criterion names.

#### Full-suite measurement, as the criterion is written (taken at finalise, 2026-11-07)

`CI=true npm test`, five alternating runs, each side in its own detached worktree (develop `7e73adaf`; branch head `576d5669`), all ten exit 0. Load average (first field of `/proc/loadavg`, the `uptime` figure) read just before each run:

| Run | develop (ms) | load | branch (ms) | load |
| --- | --- | --- | --- | --- |
| 1 | 181525 | 1.64 | 262568 | 6.85 |
| 2 | 274550 | 11.95 | 209850 | 10.10 |
| 3 | 170224 | 6.69 | 165249 | 8.61 |
| 4 | 165913 | 6.30 | 164747 | 6.46 |
| 5 | 168659 | 4.50 | 165366 | 4.66 |

Median develop 170224 ms, branch 165366 ms: the branch is 2.9% **faster**, so within 10%. Load was uneven (1.6 to 12.0) and the slowest runs on both sides sit at the highest loads (develop run 2, branch run 1); the median is the figure the criterion asks for and sits in the quiet runs 3 to 5, where the two sides differ by under 3%. Criterion met.

### Template-literal tests: disposition

`git grep -n 'committed and pushed at 6a\|CI reading' -- '*.test.*'` finds the literals in `ci-once-at-finalise`, `finalise-publish-boundary`, `ci-tree-equivalence`, `finalise-deferred-ci`, `finalise-fix-and-recheck`, `finalise-rerun-scope` and `finalise-gaps-path`. Disposition: **confirmed, no change needed**. The first six read `finalise/SKILL.md` or the CI echo lines, which this PR does not touch; `finalise-gaps-path` is the file this PR extends, and its `committed and pushed at 6a` pattern is the one the new gaps test asserts is absent from a gaps fill. All pass in the full run (8011 pass, 0 fail).

---

## Code Review

mutation-proven: CHANGELOG entry removed → `changelog-cites.sh` answers missing (observed at cycle 1 head, before the fix) → covered by the finalise 6d check, not a repo test

**Correctness bugs (1, advisory):** see New Findings. **Cleanups (0).**

boundary: internal (as cycle 1).

---

## NFR Assessment

Performance PASS, Reliability PASS, Security PASS (reasoned, 0 probes), Maintainability PASS.

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 97/100
**Deployment Recommendation**: APPROVED
