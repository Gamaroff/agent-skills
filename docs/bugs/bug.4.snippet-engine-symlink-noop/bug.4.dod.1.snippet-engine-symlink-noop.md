---
type: dod-summary
status: complete
bug: 'bug.4.snippet-engine-symlink-noop'
created: '2026-09-01'
updated: '2026-09-01'
description: 'Definition of Done verification for bug.4 (snippet engine no-ops through a symlinked path). Bug-shaped DoD: fix evidence, regression test fails-without/passes-with, suite + lint green, CI green, no new security surface.'
---

# Definition of Done Verification

**Bug:** bug.4.snippet-engine-symlink-noop (general, Major/High)
**PR:** [#292](https://github.com/Gamaroff/agent-skills/pull/292) → `develop`
**Verification Started:** 2026-09-01
**Status:** COMPLETED — ACCEPTED

> **Bug-shaped DoD.** This document is a bug report, not a story or task, so there are no acceptance
> criteria and no `*.gate.*.yml`. The equivalent evidence bar is the one `develop-bug` Step 7 names:
> fix present, a regression test with the fails-without/passes-with property established, suite and
> lint green, and no new security surface. The QA reports' role is played by the three verify cycles
> recorded in the implementation report and the three adversarial review passes over the diff.

---

## Step 1: Prior-Run and QA Artifact Review

**Prior DoD/ACCEPTED blocks in the bug body:** 0 — this is the first finalise run for this bug, so
there is nothing to supersede.

**QA report / gate files:** none, and none expected (see the note above). Evidence used instead:

| Artifact | Role |
| --- | --- |
| `bug.4.review.1.snippet-engine-symlink-noop.md` | Pre-fix readiness gate — READY TO FIX 10/10, duplicate scan clean, defect confirmed live |
| `bug.4.implementation.1.snippet-engine-symlink-noop.md` | Pipeline audit trail incl. the three verify cycles |
| Bug body `## Developer Fix Cycle` | Three iterations with Investigation / Fix Implementation / QA Verification |

**Verify cycle outcomes:** cycle 1 FAIL (blocking review finding), cycle 2 FAIL (blocking review
finding), cycle 3 **PASS**. Both rejections were in the tests; the production fix reviewed clean on
the first pass and was never modified after Iteration 1.

---

## Step 2: Fix Evidence & CI (the AC-equivalent)

**Overall status:** ✅ PASS
**PR status:** OPEN, MERGEABLE (PR #292)
**CI rollup:** ✅ **SUCCESS**

### CI — a hard DoD gate, checked not assumed

Rollup read on head `7bd448e`, which **equals local `HEAD`** — the green is on the commit that
carries the final code, not on an ancestor:

| Check | Status | Conclusion |
| --- | --- | --- |
| `test` | COMPLETED | SUCCESS |
| `validate` | COMPLETED | SUCCESS |
| `link-check` | COMPLETED | SUCCESS |
| `PR into main comes from an allowed branch` | COMPLETED | SUCCESS |

Rollup resolved to `SUCCESS` with no re-sampling needed (no `PENDING`, `CANCELLED`, `NONE` or
`UNKNOWN` states encountered).

### Fix evidence

| # | Criterion | Status | Evidence |
| --- | --- | --- | --- |
| 1 | **Fix present at the root cause** | ✅ PASS | `shared/resources/qa-execute-snippets.mjs:1002` — `isInvokedDirectly()` realpaths both sides, with a `resolve()` fallback when realpath throws. Root cause was the raw comparison at old line 996. |
| 2 | **Fix propagated to every shipped copy** | ✅ PASS | `npm run bundle` reports all four skills in sync; the four `skills/*/references/qa-execute-snippets.mjs` differ from source only by the AUTO-GENERATED banner. These are the paths the documented invocations actually name. |
| 3 | **Reported failure no longer reproduces** | ✅ PASS | The bug's own reproduction, re-run: `.agents/skills/qa-task/references/qa-execute-snippets.mjs …` now exits **1** with a 1396-byte JSON report. Before: exit 0, zero bytes. |
| 4 | **Regression test present** | ✅ PASS | Three tests in `shared/resources/tests/qa-execute-snippets.test.mjs` — two behavioural, one structural. That path is already inside the `npm test` glob, so they actually run in CI. |
| 5 | **fails-without / passes-with established** | ✅ PASS | All three were observed **red** on the pre-fix code before the fix was written (test-first), and green after. Not inferred — executed in both states. |
| 6 | **Mutation-proved** | ✅ PASS | Five mutations, each turning the intended guard red. See the matrix below. |
| 7 | **Suite + lint green** | ✅ PASS | `npm run ci:fast` exit 0 — **2098 tests, 0 failures**, prettier clean. Engine suite alone 69/69. |
| 8 | **No unrelated scope** | ✅ PASS | Nine files: the engine source, its test, four generated copies, and three co-located pipeline artifacts. No config, no secrets, no stray edits. |

### Mutation matrix

| # | Mutation | Behavioural tests | Structural scan |
| --- | --- | --- | --- |
| M1 | Naive guard restored (canonical operand order) | ✖ red | ✖ red |
| M5 | Naive guard, **commuted** operand order | ✖ red | ✖ red |
| M3 | Guard function deleted entirely | ✖ red | ✖ red |
| M4 | Guard defined but never called (`if (true)`) | ✔ pass | ✖ red |
| M2 | Stale bundle — source fixed, one copy left naive | ✔ pass | ✖ red |
| — | *(clean)* | ✔ pass | ✔ pass |

M4 and M2 turning **only** the structural test red is the evidence that the two guard types are not
redundant: the behavioural tests exercise the source through a symlink, so neither a mis-wired guard
nor an unbundled fix is visible to them.

Two of these mutations were not planned — they were forced by failures found *during* mutation
proving. M5 exists because the original regex was order-sensitive and passed the commuted defect;
M3 initially passed because the anti-vacuous assertion matched a bare token that the `node:fs`
import list already satisfied. Both are recorded in the bug's Iterations 2 and 3.

---
## Step 3: Security Review

**Overall status:** ✅ PASS — no new security surface

| Check | Status | Evidence |
| --- | --- | --- |
| New filesystem surface (`realpathSync` on `argv[1]`) | ✅ PASS | `qa-execute-snippets.mjs:996-1011` — `argv[1]` is controlled by the invoker who is already running the process. `realpathSync` reads path metadata only (no write, no exec). A TOCTOU symlink swap between the two calls at worst flips whether `main()` runs, on data the invoker already supplied — no privilege boundary is crossed. |
| Catch-fallback safety | ✅ PASS | `:1005-1010` — the `catch` is untyped so it absorbs any realpath throw (ENOENT/EACCES). The fallback is exact-string, so a test *importing* the module (where `argv[1]` is the test runner, not the module) correctly evaluates **false**. Confirmed against the 69/69 green run — `main()` never fires on import. |
| Guard not weakened vs. the old string comparison | ✅ PASS | Realpath equality holds only when both paths resolve to the same inode. There is no case where the old guard was correctly `false` and the new one becomes incorrectly `true`. |
| `--preserve-symlinks` behaviour | ✅ PASS | The fix realpaths **both** sides explicitly rather than relying on Node's own resolution, so it is unaffected by the flag. Repo-wide grep for `preserve-symlinks` / `NODE_OPTIONS`: zero occurrences. |
| Secrets / injection / classifier widening | ✅ PASS | The diff touches only the import list and the entrypoint guard. `SAFE_COMMANDS`, `COMMAND_RUNNERS` and `DENY_PATTERNS` — the execution allow-list this engine runs shell snippets through — are **untouched**. Nothing about what gets executed changed. |
| Test cleanup cannot delete the real engine | ✅ PASS | `tests/qa-execute-snippets.test.mjs:52-62` — temp dirs live under `os.tmpdir()`, outside the repo; `rmSync(dir, {recursive:true})` unlinks the symlink *entry* rather than following it. The real module survives, verified after a full run. |

**Agent summary:** a like-for-like realpath fix already proven in three sibling scripts, introducing
read-only filesystem calls under the invoker's own control, with a non-widening fallback and no
change to the execution allow-list.

---

## Step 4: Compliance Review

**Overall status:** ⚠️ NOT_APPLICABLE (counts as pass)

No GDPR, PII, accessibility, licensing or PCI surface. The change is a CLI entrypoint guard in a
development-tooling script. Confirmed by direct diff inspection rather than assumed.

---

## Step 4b: Docs & Change Log

**Overall status:** ✅ PASS

| Item | Status | Evidence |
| --- | --- | --- |
| Bug document complete | ✅ PASS | All sections written across three iterations; `## Status History` carries 8 dated rows. Only `## Resolution Summary` remains a stub — expected, and written by Part B below. |
| Other docs needing update | ✅ PASS | Every `.md` reference to `qa-execute-snippets` was checked. `qa-task/SKILL.md:433`, `qa-story/SKILL.md:867` and `qa-runnable-prose-detection.md:216` all document invocation via the skill-relative `references/…` path — *exactly* the symlinked path this bug broke. **Those docs were already correct; the script was not.** Nothing to change. Remaining hits (`CHANGELOG.md`, task.67/75, bug.3, roadmap) are historical narrative. |
| Change Log correctly absent | ✅ PASS | `document-change-log.md:175-178` excludes bug reports from the Change Log convention — they use `## Status History` instead. The bug file correctly has no Change Log. |
| Bundle integrity | ✅ PASS | All four copies carry the AUTO-GENERATED banner and are byte-identical to source once that line is stripped — regenerated, not hand-edited. |

---

## Step 5: Acceptance Decision

**Decision:** ✅ **ACCEPTED**

| Decision-matrix column | Result |
| --- | --- |
| Fix evidence (AC-equivalent) | ✅ PASS — 8/8 criteria |
| CI green (hard gate) | ✅ **SUCCESS** — 4/4 checks on head `7bd448e` = local HEAD |
| Tests | ✅ PASS — 2098 tests, 0 failures; 3 regression tests, fails-without proven, 5 mutations |
| Documentation | ✅ PASS |
| Security | ✅ PASS — no new surface |
| Compliance | ⚠️ NOT_APPLICABLE |
| Verify loop | ✅ PASS on cycle 3 of 5 |

**No section returned `NEEDS_MANUAL_REVIEW`.** No blocking issues.

**Outcome:** bug.4 meets the Definition of Done. Proceeding to close.

*Not applicable to a bug:* the Sprint Review summary artifact (a story/task deliverable). The bug's
`## Resolution Summary` is the equivalent closing artifact and is written in Part B.

---

## Verification Complete

**Final Status:** ✅ ACCEPTED
**Completion Time:** 2026-09-01

**Artifacts:**

- ✅ This DoD summary
- ✅ Bug `## Resolution Summary` written, status → `closed` (Part B)
- ✅ `docs/bugs/bug-registry.md` row 4 → `closed` (Part B)
- ✅ Canonical PR comment posted to PR #292
- — Tracker issue close: **N/A** — general bug, no `github_issue`/`jira_key`
- — Project board move: **N/A** — same reason

**Next steps:** merge PR #292; `/develop-next` ticks the roadmap's B4 row.
