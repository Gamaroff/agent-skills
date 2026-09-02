---
type: dod-verification
status: complete
bug: 'bug.3.stdout-truncation-on-exit'
pr_number: 290
started: '2026-09-01'
---

# Definition of Done Verification

**Bug:** bug.3.stdout-truncation-on-exit (general, cross-cutting)
**PR:** [#290](https://github.com/Gamaroff/agent-skills/pull/290) → `develop`
**Verification Started:** 2026-09-01
**Status:** ✅ COMPLETE — DoD PASSED

> A bug report has no acceptance criteria and no QA gate file, so this DoD is anchored on **fix
> evidence** rather than AC traceability: is the reported failure gone, is it held by a test that
> fails without the fix, did anything regress, and is CI green on the final head?

---

## 1. Fix present and targeted at the root cause

**Status:** ✅ PASS

The root cause is that `process.exit()` does not flush asynchronous stdio, and Node's stdio is
asynchronous on a pipe. All **10** exit-after-write sites across the three CLIs named in the bug's
Scope & Impact now set `process.exitCode` and return.

- `skills/develop-next/scripts/select-next.mjs` — 4 sites
- `shared/resources/qa-execute-snippets.mjs` — 3 sites
- `shared/resources/generate-prd-epic-index.mjs` — 3 sites
- 7 bundled `references/` copies regenerated via `npm run bundle`

The fix is at the root cause (the flush), not the symptom — the bug explicitly warned against
"fixing" this by shrinking `--lint` output, and that was not done.

## 2. Reported failure no longer reproduces

**Status:** ✅ PASS

`select-next.mjs --lint` through a pipe: **65,268 B and `JSON.parse` throws** before the fix,
**68,812 B and parses clean** after. Reproduced directly at both ends, not inferred.

## 3. Regression test present and mutation-proven

**Status:** ✅ PASS

`shared/resources/tests/stdout-drain-on-exit.test.mjs` — 10 tests in four layers (mechanism, live
>64KB case, drain equivalence, structural guard).

**Fails without the fix — proven three times:**

| Mutation | Result |
| -------- | ------ |
| Revert `select-next.mjs --lint` site | 3 tests red |
| Revert `qa-execute-snippets.mjs` site | guards red |
| Revert `generate-prd-epic-index.mjs` site | guards red |
| All three restored | 10 / 10 green |

The suite lands in the existing `shared/resources/tests/*.test.mjs` glob, so it is actually run by
`npm test` — no `package.json` change was needed and the suite cannot be orphaned.

> **A guard defect was caught here and fixed.** The first structural guard walked back six *lines*
> from each `process.exit()` looking for a write; the write in the manifesting instance is a
> ~20-line `JSON.stringify`, so it never reached it and **passed under mutation**. It now scans by
> character offset. This is recorded because a guard asserted green without a mutation step would
> have shipped as decoration.

## 4. Test suite green

**Status:** ✅ PASS (locally, in full)

`npm test` was run in chunks at normal priority (the whole chain exceeds a single 10-minute window):

| Phase | Result |
| ----- | ------ |
| 9 shell suites (incl. `tracker-access` 401) | all pass, 0 failed |
| Node — `shared/resources/tests` + `develop-next` | 998 / 998 |
| Node — skills suites | 641 / 641 |
| Node — evals suites | 445 pass, 1 pre-existing skip, 0 fail |

This is the gate the bug blocked: `npm test` is `developNext.qualityGateCommand`.

## 5. Lint / formatting

**Status:** ✅ PASS — `prettier --check .` clean repo-wide.

> Not clean on the first attempt. The guard suite was committed before `prettier --write` ran on it,
> so CI's `format:check` failed on `468067a` while every test passed. Fixed in `a2f826b`
> (formatting only — no assertion, threshold or allowlist change).

## 6. No new security surface

**Status:** ✅ PASS

The change removes process-termination calls and adds a test file. It introduces no new input
handling, no network calls, no credential handling, no filesystem writes outside OS temp dirs, and
no new dependencies. The test's own spawns run read-only commands (`--lint`, `--check`, `--help`).

## 7. No regressions

**Status:** ✅ PASS

Control-flow equivalence was verified directly rather than assumed, because replacing
`process.exit()` with `process.exitCode` lets execution continue where it previously stopped:

- `parseArgs` has exactly one caller, which handles the new `null` return.
- `generate-prd-epic-index.mjs` is never imported as a module (only spawned), so wrapping its body
  in `main()` changes nothing at import time. Its three exit paths were exercised by hand and return
  **0**, **2**, **1** as before.
- `qa-execute-snippets.mjs`'s `else if` chain writes on exactly one branch and sets `exitCode` on all
  three.
- Exit codes for `select-next` verified: clean roadmap → 0, unreadable roadmap → 1 (with halt JSON),
  bad argument → 1.

## 8. PR open and mergeable

**Status:** ✅ PASS — PR [#290](https://github.com/Gamaroff/agent-skills/pull/290), state OPEN,
mergeable MERGEABLE, base `develop`.

## 9. CI green on the final head

**Status:** ✅ PASS — rollup `SUCCESS` on `a2f826b`, which is the PR head **and** the local HEAD.

| Job | Result |
| --- | ------ |
| `test` | ✅ SUCCESS |
| `validate` | ✅ SUCCESS |
| `link-check` | ✅ SUCCESS |
| `PR into main comes from an allowed branch` | ✅ SUCCESS |

`468067a` was **FAILURE** on the `test` job (format:check). `a2f826b` fixed it and is green. The
green is on the head that carries the final code — a green on an ancestor would have been evidence
about that commit, not this one.

The rollup was read with the `.status`-discriminating query, not `.conclusion // .state`. That
mattered here in practice: `test` sat at `status=IN_PROGRESS, conclusion=""` for most of the wait,
and the naive form would have reported the empty string as green and accepted on a running job.

---

## Verdict

**✅ DoD PASSED — accepted.**

All nine criteria pass. No gaps.

| # | Criterion | Result |
| - | --------- | ------ |
| 1 | Fix present, targeted at root cause | ✅ PASS |
| 2 | Reported failure no longer reproduces | ✅ PASS |
| 3 | Regression test present + mutation-proven | ✅ PASS |
| 4 | Test suite green | ✅ PASS |
| 5 | Lint / formatting | ✅ PASS |
| 6 | No new security surface | ✅ PASS |
| 7 | No regressions | ✅ PASS |
| 8 | PR open and mergeable | ✅ PASS |
| 9 | CI green on the final head | ✅ PASS |

**Residual, recorded not hidden:** the same `process.exit()`-after-write idiom remains in **15
further files**, three of which write orchestrator JSON to a pipe and are latent 64KB bugs of the
identical shape. They are outside bug.3's stated scope and are named in `KNOWN_UNMIGRATED` in the
guard suite, which fails if an entry goes stale. This is tracked debt, not an open gap in this bug —
but it should be filed as a follow-up.

**Verification completed:** 2026-09-01
