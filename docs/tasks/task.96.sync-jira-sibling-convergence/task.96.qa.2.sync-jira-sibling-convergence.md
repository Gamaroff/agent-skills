# QA Report: Task 96 — sync-jira sibling convergence (cycle 2)

**Task**: [task.96.sync-jira-sibling-convergence.md](./task.96.sync-jira-sibling-convergence.md)
**Gate File**: [task.96.gate.2.sync-jira-sibling-convergence.yml](./task.96.gate.2.sync-jira-sibling-convergence.yml)
**Previous Gate**: [gate.1](./task.96.gate.1.sync-jira-sibling-convergence.yml) — FAIL (50/100)
**Review Date**: 2026-09-07
**Gate Status**: PASS

---

## Executive Summary

Cycle 2 is the mandatory **refute pass**: an unscoped re-review of the whole branch diff whose brief is to find what is false, starting with cycle 1's own fixes. It earned its cost. All four gate-1 issues are genuinely fixed, and eight further findings surfaced — **three of them introduced by cycle 1's fixes**, which is exactly the failure mode the refute pass exists to catch.

All eight are now closed. No finding remains open.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Review Methodology

Direct tools plus one read-only Explore subagent. **Re-review scope: unscoped (cycle 2 refute pass)** — the whole `origin/develop...HEAD` diff, 6943 lines / 46 files, rather than narrowing to files changed since gate 1. Narrowing on cycle 2 would have read only cycle 1's repairs and never re-read the original change with what cycle 1 taught.

`SAFETY_REPROBE` evaluated false (gate 1's security axis was PASS), so no additional surface re-probe was appended.

Every finding below was independently verified by QA before being recorded, and three were verified as **more specific** than the reviewer stated.

---

## Re-Review Context — gate 1 findings

| ID | Finding | Status | Verification |
|---|---|---|---|
| TASK96-001 | e2e suites unrunnable in a consumer install | **FIXED** | Helper moved to `shared/resources/`; all four suites re-run in a simulated consumer install (plain directory copy, no symlink) — 18 tests pass |
| TASK96-002 | `--force` a silent no-op on an unchanged story | **FIXED** | `!args.force` restored; mutation-proven. See CR-1 below — the fix was necessary but not sufficient |
| TASK96-003 | epic UPDATE-path test never transitioned | **FIXED** | Fixture now advances frontmatter status; test asserts `statusOutcome.transitioned === true` |
| TASK96-004 | task label test asserted builder determinism | **FIXED** | Now compares the PUT payload against what Jira holds; mutation-proven to go red with the defect restored |

The reviewer independently confirmed the `shared/resources/` move is correctly wired: all 22 bundled `jira-sync.js` and 4 bundled `fake-jira.js` copies match their sources byte-for-byte modulo the generated banner, and `validate.yml` carries a real bundle-freshness gate, so the vendored copies cannot silently drift.

---

## New Findings This Cycle

Eight findings, all closed within the cycle.

### Caused by cycle 1's own fixes (3)

- **[medium] `sync-jira-story.js`** — **`--force` was restored but made no repair.** The two-pass build strips `description` whenever the diff reports no change, which is always true on a forced unchanged sync — so the forced PUT carried exactly the three fields the diff had just proved identical to Jira. The comment I had written at the fix site cited "a card someone blanked in the Jira UI" as the rationale; that scenario provably did not work. **Verified**: forced PUT fields were `summary, labels, priority`, no `description`. Fixed by forcing `includeDescription` when `args.force`; mutation-proven; the test now blanks the card and asserts the description is restored.
- **[medium] `sync-jira-epic.js`** — the skip path writes the **refreshed** post-transition timestamp to the file but emitted the **stale** one to `--json`, so file and machine-readable output disagreed on precisely the run that transitioned. Newly reachable, because this change set is what opened that gate for the first time. Fixed.
- **[low] `sync-jira-story/SKILL.md`** — `--force` acquired a second effect (bypassing the no-change fast path) and the docs still described only the first. Epic documents both; story was the odd sibling out. Fixed, matching epic's wording.

### Pre-existing or introduced-by-the-move (5)

- **[medium] `deferred-no-network.test.js`** — the test claimed to exercise the `!deferred` guard, but a deferred transition returns `transitioned: false`, so `statusOutcome?.transitioned` already short-circuits: **deleting `&& !deferred` left the test green**. It also asserted on transition POSTs, not the GET the guard governs. **Verified by mutation.** Resolved honestly rather than cosmetically: the guard is *kept* (the plan specifies all three conditions and `sync-jira-bug` carries them), the docblock now **states plainly that the term is redundant defence-in-depth**, and the test asserts the observable that does matter — no `fields=updated` GET on a restricted run.
- **[low] three dangling `tests/lib/fake-jira.js` references** in `CHANGELOG.md`, `sync-jira-task/SKILL.md` and a code comment, left behind by cycle 1's move. No CI lane catches these — `docs-link-check` covers `docs/`, README, AGENTS and CONTRIBUTING, and these are code spans rather than links. All live references fixed; the ones inside gate-1's QA report and the review report were **left alone deliberately**, as dated records of the finding itself.
- **[low] `countRequests`** interpolated `issueKey` into a `RegExp` unescaped, and its comment described an anchor (`/`) the pattern does not implement. Both fixed; verified that a metacharacter key now matches literally rather than as a wildcard, and that the anchor still counts every real PUT.
- **[low] story's hoist comment** omitted epic's note that the moved build can emit advisory warnings on a path that previously emitted none. Carried across.
- **[low] `putsAfterCreate`** was always 0 (creating is a POST), so "no second PUT" was `0 === 0`. Now asserts the literal 0, as epic's twin already did.

---

## Mutation-Proof Spot Check (Step 3c)

Every behavioural fix in this cycle was reverted and its named test confirmed red:

| Fix | Mutation | Result |
|---|---|---|
| `args.force` in `includeDescription` | term removed | ✅ red |
| `!args.force` in the skip gate | term removed | ✅ red |
| deferred-run guard | `ACCESS_TRACKER=full` | ✅ red |
| label diff (all three, re-verified) | reverted to frontmatter rebuild | ✅ red |
| post-transition re-read (all three, re-verified) | guard forced false | ✅ red |

`mutation-proven: yes` for every fix. The packaging defect (TASK96-001) is not mutation-provable in-process; it was verified instead against a simulated consumer install, which is the stronger evidence for that class.

---

## Adversarial Pass Over the Fixes (Step 3.5)

Four transitions probed against the changed code:

- **Error path** — a 500 on the post-transition GET leaves the run at exit 0 with the earlier timestamp written. Best-effort holds; it warns rather than throwing, as designed.
- **Combination** — `!args.force` interacts with `shouldWriteFile` (`!skippedNoChanges || changeLogEntries.length > 0`). Verified a forced unchanged sync writes **no** spurious Change Log row: row count 3 before and 3 after.
- **In-flight / reconnect** — not applicable; these scripts are single-shot CLI runs with no subscription or long-lived state.

One finding came out of this pass rather than from QA: making story's gate reachable also made its unconditional `Updated: ${changedFields.join(", ")}` reachable with an empty list, printing a bare `Updated: `. Recorded as a cycle finding and fixed by matching task and epic's ternary.

---

## Regression Testing

| Area | Result |
|---|---|
| Full suite | PASS — 2676 tests, 2675 pass, 0 fail, 1 pre-existing skip |
| `sync-jira-bug` (reference implementation) | PASS — 91 tests, assertions still unchanged |
| Simulated consumer install | PASS — all four e2e suites run from a plain directory copy |
| Formatting | PASS — `prettier --check` clean |
| Generators | PASS — bundle, catalog, skill-deps all no-drift |

---

## Final Assessment

**Gate Status**: PASS
**Quality Score**: 95/100

**Rationale**: Every gate-1 issue is fixed and verified, and the refute pass's eight further findings are all closed. The three findings caused by cycle 1's fixes are the substantive result of this cycle: two of them (`--force` repairing nothing, the epic JSON/file timestamp split) would have shipped as silent defects behind a green suite and a passing gate.

The five points withheld are for the three residuals recorded as future work — the `--json`-suppressed warning, the read-after-write window, and the task/bug scripts' missing skip gate. None blocks this change; each deserves its own evidence.

**Deployment Recommendation**: APPROVED

**Next Steps**: Step 5c — `/review-pr` as the loop's exit gate.
