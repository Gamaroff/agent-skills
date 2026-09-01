---
type: implementation-report
status: complete
bug: 'bug.4.snippet-engine-symlink-noop'
mode: 'general'
started: '2026-09-01T13:28:39Z'
---

# Implementation Report — bug.4.snippet-engine-symlink-noop

**Started:** 2026-09-01T13:28:39Z
**Finished:** 2026-09-01T15:58:59Z
**Final Status:** ✅ Complete — bug closed, DoD accepted, PR #292 ready to merge
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 3

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.4.snippet-engine-symlink-noop` created at `700d81c` | |
| 2 | review-bug | ✅ Done | READY TO FIX 10/10 · dup none · reproduces likely · 2 Critical auto-fixed | `bug.4.review.1.snippet-engine-symlink-noop.md` |
| 3 | investigate-fix | ✅ Done | Realpath guard + bundle to 4 copies; 3 regression tests under spawnBudget; 4 mutations proven; `npm run ci:fast` **green** (2098 tests, 0 fail) | root cause pre-localised by Step 2 prepass |
| 4 | create-pr | ✅ Done | [PR #292](https://github.com/Gamaroff/agent-skills/pull/292) → develop; commit `6a2a74a` | |
| 5–6 | verify-fix loop | ✅ Done | PASS on cycle 3/5 — 2 fix cycles, both on tests not the fix | 3 review passes |
| 7 | finalise-close | ✅ Done | DoD **ACCEPTED**, CI 4/4 green; bug closed, registry row → closed; canonical PR comment posted | 2 DoD agents (security, docs) |
| 8 | commit-changes | ✅ Done | Final report + DoD + registry committed and pushed | |

## Decisions Log

- 2026-09-01T13:28:39Z — Bug resolved: docs/bugs/bug.4.snippet-engine-symlink-noop/bug.4.snippet-engine-symlink-noop.md (mode=general, prefix=bug.4.snippet-engine-symlink-noop)
- 2026-09-01T13:28:39Z — Invoked from `/develop-next` (roadmap item **B4**, PHASE 5). Autonomous run: Phase 0d answered with recommended defaults.
- 2026-09-01T13:28:39Z — Q1 branch model: **bugfix** (auto-answered) — bug is a QA-tooling defect, not a production regression.
- 2026-09-01T13:28:39Z — Q2 base branch: **develop** (auto-answered, derived from Q1).
- 2026-09-01T13:28:39Z — Q3 PR target: **develop** (auto-answered, derived from Q1).
- 2026-09-01T13:28:39Z — Lite mode: **off** — severity=Major, priority=High (lite requires Minor/Trivial + Low/Medium).
- 2026-09-01T13:28:39Z — Platform resolved: TRACKER=github, VCS=github, ACCESS_TRACKER=full, ACCESS_VCS=full.
- 2026-09-01T13:28:39Z — TRACKER_ISSUE: empty (bug has no `github_issue` in frontmatter — normal for a general bug).

- 2026-09-01T13:29:27Z — Step 1: branch `bugfix/bug.4.snippet-engine-symlink-noop` cut from `develop` (convention `bugfix/bug.{N}.{name}`, matching `bugfix/bug.3.stdout-truncation-on-exit`). Report stashed/restored around branch creation.
- 2026-09-01T13:29:27Z — Signal Work Started: **skipped** — no linked tracker issue (general bug, no `github_issue`).

- 2026-09-01T13:32:42Z — Step 2: `/review-bug` validate-and-apply → **READY TO FIX 10/10**. Duplicate: none. Reproduces: likely (confirmed live). Report: `bug.4.review.1.snippet-engine-symlink-noop.md`.
- 2026-09-01T13:32:42Z — Auto-applied 2 Critical template gaps to the bug report: missing `## Developer Fix Cycle` and `## Resolution Summary` stubs. No severity/priority change, so no Status History row. Bug lifecycle `status` left at `new`.
- 2026-09-01T13:32:42Z — Step 2 tracker comment: **skipped** — no linked tracker issue.

- 2026-09-01T13:49:20Z — Step 3 fix (≤5 bullets):\n  1. Root cause: `shared/resources/qa-execute-snippets.mjs:996` compared realpath-resolved `import.meta.url` against an unresolved `process.argv[1]`, so any symlink in the invocation path made the guard false and `main()` never ran.\n  2. Replaced with `isInvokedDirectly()` (realpath both sides + `resolve()` catch fallback), lifted from `select-next.mjs:1492` — the engine becomes the fourth identical copy rather than the lone outlier.\n  3. Swapped `pathToFileURL` (now unused) for `fileURLToPath`; added `realpathSync`/`resolve` imports.\n  4. `npm run bundle` propagated to the 4 generated copies — all report **in sync**.\n  5. Original reproduction now agrees on both paths: `.agents/skills/...` emits the report and exits 1.\n- 2026-09-01T13:49:20Z — Regression tests (`shared/resources/tests/qa-execute-snippets.test.mjs`, already in the `npm test` glob): `CLI: runs when invoked through a symlinked path`, `CLI: the symlinked and real invocation paths agree exactly`, `CLI: no engine copy carries a naive entrypoint guard`. All three fail pre-fix.\n- 2026-09-01T13:49:20Z — No Explore dispatched in Step 3: the Step 2 prepass had already localised the root cause to file:line and enumerated every ESM guard in the repo. Re-running it would have re-derived known facts.\n\n## Issues Log\n\n- 2026-09-01T13:49:20Z — **Caught during mutation proof**: the first cut of the structural test asserted only `/realpathSync/`, which the `node:fs` import list satisfies even with the guard deleted — so it passed mutation 3 vacuously. This is the exact failure the bug report warned of (and that bug.3 shipped). Tightened to require the full `realpathSync(fileURLToPath(import.meta.url))` comparison plus a reachable `if (isInvokedDirectly())` call site; mutations 3 and 4 then both go red.\n- 2026-09-01T13:49:20Z — `npm run format:check` flagged the new test file on the first `ci:fast` run; fixed with `prettier --write`. Noted because this is the class of failure T75 moved the gate to catch.\n- 2026-09-01T13:49:20Z — Environment: a shell function shadows `node` with an `nvm` wrapper, so every Node invocation in this run uses the absolute path `/usr/local/bin/node`.

- 2026-09-01T14:11:28Z — **Gate observation (not caused by this change):** `npm run ci:fast` spent >17 min inside `shared/resources/tests/access-config-parity.test.mjs`, repeatedly spawning `bash -c source resolve-platform.sh` probes that return `spawnSync bash ETIMEDOUT`. That suite runs under `--test-timeout=0`, so it cannot self-abort. This is the symptom **B5** describes (`access-config parity JS probe records a timeout as a real answer`) — the next roadmap item. This change touches only `qa-execute-snippets.mjs` and its test file, neither of which that suite exercises. Zero test failures recorded up to that point.

- 2026-09-01T15:22:14Z — **Gate resolution.** Runs 1 and 2 of `ci:fast` failed, but never on the same tests and always with timeout-shaped durations (10s/22s/26s/60s). Isolated the cause: `access-config-parity.test.mjs` passes alone on **both** clean `develop` (baseline worktree at 700d81c) and this branch, and contains **zero** references to `qa-execute-snippets` — no coupling, so causation was impossible. The failures are B5 (`access-config parity JS probe records a timeout as a real answer`) surfacing under spawn load.
- 2026-09-01T15:22:14Z — **Real contribution found and fixed.** The first cut of the three CLI tests spawned without a budget and cost 1.5s/30.3s under load, adding genuine spawn pressure to a suite already running four files concurrently. Reworked them onto `spawnBudget("SNIPPETS")` + `neverRan()` retry (bug.2 remedy) and `--no-zsh`: same three now run in 0.13s/0.29s/0.002s, engine suite 69/69 in 1.7s. Mutation 1 re-proven red afterwards.
- 2026-09-01T15:22:14Z — Run 3 of `npm run ci:fast`: **exit 0**, 2098 tests, 0 failures, prettier clean.

- 2026-09-01T15:24:15Z — Step 4: committed `6a2a74a` (9 files, scope-clean — leak check OK, no secrets) and opened **PR #292** → `develop`. No `--issue` passed: general bug, no linked tracker issue. Pre-commit hook re-ran `npm run bundle` and reported all skills in sync.

## QA Iteration History

### Verify Cycle 1 — 2026-09-01
**Regression test**: pass — 3/3, all established failing pre-fix in Step 3
**Suite + lint**: pass — engine suite 69/69; prettier clean
**Bug repro**: pass — documented symlinked path exits 1 with 1396 bytes (was exit 0, 0 bytes)
**Code review**: **1 blocking finding** — the fix itself reviewed clean (faithful port, no unused/shadowed imports, bug.3's `process.exitCode` chain intact, reviewer re-ran the engine through the real symlink). But `the symlinked and real invocation paths agree exactly` still called `spawnSync` directly: no timeout, no `neverRan()` retry, 4 shells instead of 1 — false-divergence risk under load.
**Verdict**: **FAIL**
**Action**: fix cycle 2

### Verify Cycle 2 — 2026-09-01 (commit `75c861c`)
**Regression test**: pass — 3/3
**Suite + lint**: pass — `npm run ci:fast` exit 0, 2098 tests, 0 failures
**Code review**: all 5 cycle-1 findings VERIFIED fixed; **1 new blocking finding (NEW-1)** — `viaReal.stdout.length` dereferenced with no `neverRan()` on either arm, nine lines below the guard cycle 2 had just added to the sibling test. Same class, reintroduced.
**Verdict**: **FAIL**
**Action**: fix cycle 3

### Verify Cycle 3 — 2026-09-01 (commit `7bd448e`)
**Regression test**: pass — 3/3
**Suite + lint**: pass — engine suite 69/69, prettier clean; full `ci:fast` re-run
**Mutations**: 5/5 re-proven, differentiation intact (M4 and M2 turn only the structural test red)
**Code review**: **clean** — reviewer verdict "ready to merge"; independently re-confirmed the engine runs through the real symlink, the 4 bundled copies are byte-identical to source, bug.3 chain untouched, and bug.2 spawn-budget rule still satisfied
**Verdict**: **PASS** — proceeding to Step 7

**Tracker signals**: `in-qa`, `changes-requested`, `ready-for-merge` all skipped — no linked tracker issue (general bug).

- 2026-09-01T15:58:40Z — Step 7: `/finalise` → **ACCEPTED**. CI rollup SUCCESS (4/4) on head `7bd448e` = local HEAD. Security agent: no new surface (realpath is read-only, catch fallback cannot false-positive on import, execution allow-list untouched, temp-dir cleanup unlinks the symlink rather than following it). Docs agent: no other doc needed updating — `qa-task`/`qa-story` SKILL.md already document the symlinked invocation correctly; the script was the thing that was wrong. Change Log correctly absent (bug reports use Status History).
- 2026-09-01T15:58:40Z — Step 7 Part B: Resolution Summary written (5 lessons), bug `status: closed`, registry row 4 → `closed` (Next Available Bug Number left at 6 — numbers are never reused), canonical PR comment posted. Tracker close + board move: **N/A**, no linked issue.
- 2026-09-01T15:58:40Z — Sprint Review summary: **not generated** — it is a story/task artifact; a bug's equivalent closing artifact is its `## Resolution Summary`.

## Completion

**Branch:** bugfix/bug.4.snippet-engine-symlink-noop
**PR:** https://github.com/Gamaroff/agent-skills/pull/292
**DoD Summary:** `bug.4.dod.1.snippet-engine-symlink-noop.md` — ✅ ACCEPTED (fix evidence 8/8, CI SUCCESS 4/4, security PASS, compliance N/A, docs PASS)

## Completion Summary

**Outcome:** bug.4 fixed, verified, closed and accepted. PR #292 is green and ready to merge.

**What was wrong:** `shared/resources/qa-execute-snippets.mjs` compared a realpath-resolved
`import.meta.url` against a raw `process.argv[1]`, so any symlink in the invocation path — which the
documented path always has — made the entrypoint guard false. `main()` never ran and the process
exited 0 silently, which is indistinguishable from a clean run. The QA step built to catch prose that
is never executed was itself never executed, and recorded a pass.

**What changed:** the six-line `isInvokedDirectly()` helper already used by three sibling CLIs,
bundled to the four generated copies, plus three regression tests (two behavioural, one structural)
proven against five mutations.

**Shape of the work:** 3 fix iterations, 3 verify cycles, 3 adversarial review passes. **Both
rejections were in the tests, not the fix** — the production change reviewed clean on the first pass
and was never modified after Iteration 1. What needed the extra cycles was making the evidence
trustworthy, which on a bug about a false pass is the substance rather than a detail.

**Things this run got wrong, and how they were caught:**

| # | Slip | Caught by |
| --- | --- | --- |
| 1 | Structural assertion matched a bare `realpathSync` token that the `node:fs` import list already satisfied — passed with the guard deleted | Running mutation 3, not reasoning about it |
| 2 | An exact-string edit silently missed its second target because `prettier --write` had reflowed the code; the script asserted only that *some* replacement happened | Review cycle 1 |
| 3 | Fixed a null-deref in one test and reintroduced it nine lines away in its sibling | Review cycle 2 |
| 4 | Structural regex anchored on operand order, so the commuted defect passed | Review cycle 2 |

Slips 1 and 4 are the same lesson twice: **a structural scan fails silently toward "pass"**, and only
executing mutations reveals it. Slip 2 changed how the rest of the run edited files — per-replacement
assertions with a write after each, rather than one aggregate check at the end.

**Environment note:** a shell function shadows `node` with an `nvm` wrapper on this machine, so every
Node invocation in this run used the absolute path `/usr/local/bin/node`.
