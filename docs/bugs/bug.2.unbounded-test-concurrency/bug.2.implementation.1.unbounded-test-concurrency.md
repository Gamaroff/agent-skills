---
type: implementation-report
status: complete
bug: 'bug.2.unbounded-test-concurrency'
mode: 'general'
started: '2026-08-29T13:47:10Z'
---

# Implementation Report — bug.2.unbounded-test-concurrency

**Started:** 2026-08-29T13:47:10Z
**Finished:** 2026-08-29
**Final Status:** ✅ Complete — bug closed
**Branch model:** bugfix (base: develop, PR target: develop)
**Severity / Priority:** Major / High
**Lite mode:** off
**Fix Iterations:** 4

## Pipeline Progress

| Step | Skill | Status | Notes | Subagent summary ref |
|------|-------|--------|-------|----------------------|
| 1 | create-branch | ✅ Done | Branch `bugfix/bug.2.unbounded-test-concurrency` created at `c5d4573` off `develop` | |
| 2 | review-bug | ✅ Done | READY TO FIX, 10/10. 0 Critical, 0 Important, 2 Optional. duplicate=none, reproduces=likely | `bug.2.review.1.unbounded-test-concurrency.md` |
| 3 | investigate-fix | ✅ Done | Bound all 5 runners + extracted shared spawn budget; 11 bare literals migrated. 7 regression cases, all mutation-proven. Suite 1883 pass / 0 fail | measurements inline in bug Evidence + Fix Implementation |
| 4 | create-pr | ✅ Done | PR #279 → develop. Commit `82cbd82`. Scope-staged; no out-of-scope leak; bundle in sync | |
| 5–6 | verify-fix loop | ✅ Done | 5 cycles: 1 FAIL (format), 2 FAIL (6 defects), 3 FAIL (4 defects), 4 FAIL (template lexing), 5 **PASS**. Commits `2905d7e`, `a631617`, `60f778d` | 3 diff-review rounds, findings inline |
| 7 | finalise-close | ✅ Done | DoD PASSED (CI SUCCESS on `60f778d` after waiting out a PENDING sample). Resolution Summary written; bug `closed`; registry row → closed; PR comment posted | `bug.2.dod.1.unbounded-test-concurrency.md` |
| 8 | commit-changes | ✅ Done | Final report + closed bug + registry committed and pushed | |

## Decisions Log

- 2026-08-29T13:47:10Z — Bug resolved: docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md (mode=general, prefix=bug.2.unbounded-test-concurrency)
- 2026-08-29T13:47:10Z — Invoked from /develop-next (roadmap item B2, PHASE 4 — maintenance backlog). Autonomous run.
- 2026-08-29T13:47:10Z — Q1 branch model: **bugfix** (auto-answered, recommended). Not a production regression — the defect is in the repo's own test gate, not in shipped behaviour.
- 2026-08-29T13:47:10Z — Q2 base branch: **develop** (auto-answered, derived from Q1).
- 2026-08-29T13:47:10Z — Q3 PR target: **develop** (auto-answered, derived from Q1).
- 2026-08-29T13:47:10Z — Lite mode: **off** — severity=Major (lite requires Minor/Trivial + Low/Medium).
- 2026-08-29T13:47:10Z — Tracker issue: none (no `github_issue`/`jira_key` in frontmatter). Work-started/blocked signals skipped silently.
- 2026-08-29T13:47:10Z — Platform resolved: VCS=github, TRACKER=github, ACCESS_TRACKER=full, ACCESS_VCS=full.

- 2026-08-29 — Branch name `bugfix/bug.2.unbounded-test-concurrency` (bugfix/{bug-prefix}; the pattern review-bug's branch-setup reference already recognises). Implementation report stashed before branch creation, restored after.
- 2026-08-29 — Signal Work Started skipped: no tracker issue linked to this bug.

- 2026-08-29 — review-bug invoked in validate-and-apply mode. Verdict **READY TO FIX (10/10)**; review report `docs/bugs/bug.2.unbounded-test-concurrency/bug.2.review.1.unbounded-test-concurrency.md`. Bug lifecycle status left at `new` (review-bug never transitions it).
- 2026-08-29 — Pre-pass A (duplicate scan): `duplicate: none` — ~30 sibling story/task bugs plus the registry examined; nearest miss `task.63.bug.1` is a heartbeat-reader defect, not the test gate.
- 2026-08-29 — Pre-pass B (already-fixed scan): `reproduces: likely` — all 5 filed claims re-verified against `c5d4573` with file:line evidence. Nothing fixed in code to date.
- 2026-08-29 — Applied to the bug report: verified-evidence table, one correction (the parity remedy covers only 1 of 12 spawnSync sites in its own file), `updated:` frontmatter, Status History row. Severity/priority assessed and left unchanged.
- 2026-08-29 — Noted out of scope: `package.json` test globs are hand-maintained (11 of 21 one-skill-one-line). No suite is orphaned today; not fixed here.

- 2026-08-29 — **Reproduced the margin, not a failure.** `jira-interception.test.mjs` alone: 3.20s idle → 48.51s under 24 spawn workers (15.2x); worst single test 461ms → 6741ms against a bare 20s timeout.
- 2026-08-29 — **Measurement redirected the fix, and this is the main decision of the run.** Full suite on a quiet box: unbounded 37s / c4 37s / c8 39s / unbounded-again 36s, with worst-test 2814 / 2638 / 2577 / 2602 ms. Bounding is free (confirms the report) but also buys nothing on a quiet box — the spread between the two *unbounded* runs is as wide as bounded-vs-unbounded. The suite does not self-oversubscribe enough to threaten a 20s timeout.
- 2026-08-29 — Under 16 competing spawn loops: unbounded 204s / worst test 16183ms; c4 226s / worst test 17110ms. Bounding does not help against load the suite does not own. A 16.2s worst case vs a bare `timeout: 20000` is a 1.2x margin — that is the coin flip, and it explains why failures only appeared alongside agent pipelines, never in isolation or CI.
- 2026-08-29 — Decisive detail: the file that absorbed the 16.2s spike was `access-config-parity.test.mjs`, the one file already carrying a 60s budget. `jira-interception.test.mjs` peaked at only 4.3s in the same run. So the report's option 2 (timeout headroom) is the effective remedy and option 1 alone would have closed the bug without changing the failure probability.
- 2026-08-29 — Shipped **both**: (1) `--test-concurrency="${TEST_CONCURRENCY:-4}"` on all 5 `node --test` invocations — free, and removes self-contention as a variable; (2) new `shared/resources/tests/spawn-budget.mjs` (60s default, 2 retries, `{PREFIX}_` → `TEST_` → default precedence, plus `neverRan()`), with all 11 bare timeout literals migrated onto it (6 in jira-interception, 5 in access-config-parity's raw sites). `PARITY_SPAWN_*` behaviour preserved exactly.
- 2026-08-29 — Not done, deliberately: retry wrapper not retrofitted onto all 20 spawn call sites. `neverRan()` is exported and the parity suite keeps using that logic, but rewriting 20 differently-shaped call sites carries regression risk with no measurement demanding it. Recorded as a follow-up trigger: only if a *timeout* failure recurs rather than a slow run.
- 2026-08-29 — Regression test `tests/test-harness-concurrency.test.js` (7 cases). Mutation-proven three ways: dropping the bound from one `eval:*` script, restoring one bare literal, and tightening the budget default each reddened exactly one guard, and only that guard.

- 2026-08-29 — Ran `npm run bundle` before the PR (new file under `shared/resources/`): all skills in sync, no drift to commit. `spawn-budget.mjs` is a test helper, not referenced by any skill doc.
- 2026-08-29 — Commit `82cbd82`; PR #279 opened against `develop`. No `--issue` (bug has no linked tracker issue), so the Step 6b issue comment was skipped silently.


## QA Iteration History

### Verify Cycle 1 — 2026-08-29
**Regression test**: pass (7/7)
**Suite + lint**: **FAIL** — `prettier --check` flagged 3 of the new/edited files. CI runs `format:check` *ahead of* the suite deliberately (`.github/workflows/test.yml:45`), and all three passed prettier on `develop`, so this was a CI-breaking regression introduced by the fix.
**Code review**: not reached
**Verdict**: FAIL
**Action**: `prettier --write`; confirmed cosmetic line-wrapping only, no semantic change.

### Verify Cycle 2 — 2026-08-29
**Regression test**: pass (7/7)
**Suite + lint**: pass — 1883 pass / 0 fail; `format:check` clean
**Code review**: **6 blocking correctness findings**, every one reproduced independently before being accepted
**Verdict**: FAIL
**Action**: fixed all six; commit `2905d7e`.

The four that mattered most all had the same shape — *the guard passed on the regression it was named after*:

1. **Comment stripper deleted executable source.** Block comments stripped before line comments, so a `/*` inside a `//` comment opened a phantom block running to the next `*/` anywhere later — 53 lines of `setup-consumer-config.test.mjs` were invisible to the hardcode scan. Now one left-to-right pass over strings and comments together, preserving string literals.
2. **Runner detector split on the literal `node --test`.** `node --experimental-vm-modules --test` and `node  --test` were not seen as runners at all; `node --test-concurrency=4 --test` was reported unbounded because the split ate the flag. Now per-shell-command: contains `node`, contains `--test` as its own flag.
3. **`{PREFIX}_SPAWN_RETRIES=0` no longer disabled retries** — `readInt` rejected 0 and returned the fallback 2. 0 is the only way to say "do not retry", and `access-config-parity` passes `retries: 0` explicitly. Retries now take min 0; timeout keeps min 1.
4. **The documented precedence ladder was broken** — `??` only falls through on null/undefined, so a set-but-empty specific var masked `TEST_SPAWN_TIMEOUT_MS`. An empty env var is the normal shape of an unset CI input, so it failed in exactly the scenario the module exists for. Parsing and defaulting are now separate.

Plus two lower-severity: a false positive on a flag placed before `--test`, and the `TEST_CONCURRENCY=0` case (documented, not guarded — see below).

**Not fixed, documented instead**: `TEST_CONCURRENCY=0` or a typo'd value is accepted by the shell and silently ignored by node, returning CPU-count concurrency with exit 0. No static guard can read the effective value, and the failure mode is a return to the pre-fix default — which the measurements show was not what tripped the gate.

### Verify Cycle 3 — 2026-08-29
**Regression test**: pass (14/14)
**Suite + lint**: pass — 1890 pass / 0 fail / 1 skipped; `format:check` clean
**Code review**: **4 findings**, two of them high
**Verdict**: FAIL
**Action**: fixed all four; commit `a631617`.

The stripper was still wrong in *both* directions: a regex literal ending in an escaped slash put a
literal `//` into the source and the rest of that line was deleted (11 real sites in this tree),
while a quote inside a character class opened a pseudo-string that preserved every comment to the
next quote — including a 94-line slice of the guard file itself. Patching the regex a third time was
not the answer: **a regex cannot lex JavaScript**, so it became a scanner.

Two guards were also not measuring their stated property: `runnerScripts()` was never exercised (both
detector tests re-declared the predicate locally, so reverting the real function changed nothing
observable), and the stripper fixture contained no regex literal — the very class of input that broke
it. `readInt` also accepted `0x10` as 16, a 16 ms budget that would kill every child.

### Verify Cycle 4 — 2026-08-29
**Regression test**: pass (16/16)
**Suite + lint**: pass — 1892 pass / 0 fail / 1 skipped; `format:check` clean
**Code review**: **2 blocking findings** (F1/F2), plus 6 non-blocking
**Verdict**: FAIL
**Action**: fixed; commit `60f778d`.

The scanner did not lex template substitutions. A nested template inside a `${}` closed the outer
template, so its contents were read as code and a URL, a glob or a `//` inside it deleted the rest of
the line — to EOF for a `/*`. Both shapes are already present in the scanned corpus
(`setup-consumer-config.test.mjs:291,340`), harmless only because they contain no slash. Same lesson a
third time: **the fixture, not the implementation, decides whether the guard is worth anything.**

Also closed: line comments now end at `\r`; `regexAllowed()` no longer trims the whole accumulated
output on every slash (quadratic — 3.9s on a 1.2MB input; now 5ms on the largest real file).

### Verify Cycle 5 — 2026-08-29
**Regression test**: pass (16/16)
**Suite + lint**: pass — 1892 pass / 0 fail / 1 skipped; `format:check` clean
**Code review**: cycle-4 findings verified closed against the reviewer's own inputs; whole-corpus check clean
**Verdict**: **PASS**
**Action**: proceeding to Step 7.

Final evidence: strip all 74 scanned files and `node --check` the output → **0 parse failures** (an
earlier revision produced 5). Ten mutations, each reddening exactly one guard. Four residual
limitations recorded in the bug file rather than buried.

- 2026-08-29 — `/finalise` run against the bug file. DoD **PASSED**. The CI gate sampled `PENDING` (`test` IN_PROGRESS) and **waited** rather than rounding up to green — final rollup SUCCESS on `60f778d`, the exact head being finalised.
- 2026-08-29 — Security surface verified rather than assumed: the diff touches only docs, `*.test.*`, one test helper and `package.json`'s test scripts; no credentials, network calls or new process execution added; no spawn site lost its timeout.
- 2026-08-29 — Compliance N/A (no user-facing surface). Change Log N/A — bug reports use `## Status History` by design.
- 2026-08-29 — Bug closed: Resolution Summary written (6 lessons learned), frontmatter `status: closed`, body `✅ Closed`, final Status History row. General-bug linkage: `docs/bugs/bug-registry.md` row 2 → `closed`; **Next Available Bug Number left at 3** (numbers are never reused).
- 2026-08-29 — Tracker close skipped: no `github_issue`/`jira_key` on this bug. Canonical DoD comment posted to PR #279 instead.

## Issues Log

- 2026-08-29 — **A mutation that silently did nothing.** The first M2 mutation used `sed -i '' '0,/re/s//repl/'`, which is a GNU extension BSD sed does not support: it applied no change, and the guard's resulting silence read as a hole in the guard. Re-run with Python it reddens correctly. Worth recording because a no-op mutation is indistinguishable from an unheld test if the mutation is not itself verified — the check is `grep` the file after mutating, before trusting the result.

- 2026-08-29 — A first full-suite run measured 291s and briefly looked like the bound was costing 2x. It was machine load (15-min load average 11.8, from the measurement runs themselves), not the flag; a quiet back-to-back benchmark showed 36-39s across every configuration. Recorded because the wrong conclusion was available and cheap to draw.


## Completion

**Branch:** bugfix/bug.2.unbounded-test-concurrency
**PR:** https://github.com/Gamaroff/agent-skills/pull/279
**DoD Summary:** `docs/bugs/bug.2.unbounded-test-concurrency/bug.2.dod.1.unbounded-test-concurrency.md` — PASSED

## Completion Summary

**Outcome:** bug.2 fixed, verified, and closed. PR #279 open against `develop`, CI green, awaiting merge.

**What shipped**

1. `--test-concurrency="${TEST_CONCURRENCY:-4}"` on all five `node --test` invocations in `package.json`.
2. `shared/resources/tests/spawn-budget.mjs` — a shared, env-tunable spawn budget (60 s / 2 retries,
   `{PREFIX}_` → `TEST_` → default), with all eleven previously-bare timeout literals migrated onto it.
3. `tests/test-harness-concurrency.test.js` — 16 regression cases, every one mutation-proven.

**The decision that mattered.** The bug asked for (1) and ranked (2) second. Measurement inverted
that: (1) is free but buys nothing on a quiet box, and cannot help against the external load that
actually collapses the margin. (2) is what the surviving file already had. Shipping (1) alone would
have closed the bug without changing the failure probability.

**The cost.** Five verify cycles, four failed, every failure in the guard rather than the fix —
three successive comment-stripper/detector versions each passed on the exact regression they were
named after. The recurring lesson is that the *fixture* decides whether a guard is worth anything,
and that a claim like "comments are stripped correctly" needs a whole-corpus check (strip 74 files,
parse the output, expect zero failures) rather than an assertion about one string.

**Residual, recorded not buried:** four known limitations in the bug's QA Verification subsection,
plus one adjacent defect explicitly out of scope (hand-maintained test globs in `package.json`).
