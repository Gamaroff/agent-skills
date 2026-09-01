---
type: implementation-report
status: in-progress
bug: 'bug.4.snippet-engine-symlink-noop'
mode: 'general'
started: '2026-09-01T13:28:39Z'
---

# Implementation Report — bug.4.snippet-engine-symlink-noop

**Started:** 2026-09-01T13:28:39Z
**Finished:** —
**Final Status:** In Progress
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 1

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.4.snippet-engine-symlink-noop` created at `700d81c` | |
| 2 | review-bug | ✅ Done | READY TO FIX 10/10 · dup none · reproduces likely · 2 Critical auto-fixed | `bug.4.review.1.snippet-engine-symlink-noop.md` |
| 3 | investigate-fix | ✅ Done | Realpath guard + bundle to 4 copies; 3 regression tests under spawnBudget; 4 mutations proven; `npm run ci:fast` **green** (2098 tests, 0 fail) | root cause pre-localised by Step 2 prepass |
| 4 | create-pr | ⏳ Pending | | |
| 5–6 | verify-fix loop | ⏳ Pending | | |
| 7 | finalise-close | ⏳ Pending | | |
| 8 | commit-changes | ⏳ Pending | | |

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

## Completion

**Branch:** bugfix/bug.4.snippet-engine-symlink-noop
**PR:** —
**DoD Summary:** —
