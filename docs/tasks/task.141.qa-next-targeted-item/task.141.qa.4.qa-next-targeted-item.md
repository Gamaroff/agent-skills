# QA Report: Task 141 - cycle 4

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.4.qa-next-targeted-item.yml](./task.141.gate.4.qa-next-targeted-item.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-22
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 3's append rule **holds**, and it was verified the way the rule asks to be verified: by
enumerating the **writers** of the note cell rather than the flags that reach it. There are four
(`row.notes` at the clear, at the append, in the `untested` block, and in `cmdAccept`) and only the
append is reachable on a kept `✅`. That is a population of four in one function, against the
open-ended flag set the two previous guards each tried and failed to enumerate.

No HIGH. Four residual findings, all fixed in the same cycle. The most interesting is BUG-9, where
the *corruption* is pre-existing but the *irrecoverability* is this branch's — a distinction that
decides whether it belongs in `top_issues[]` or in `recommendations.future`, and it belongs in
`top_issues[]`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL → cleared by the cycle-4 fixes

---

## Review Methodology

Cycle 4, scoped to the four files the cycle-3 commit (`ba68544a`) changed, shown against the PR base
(1279 lines). **Re-review scope: scoped to the cycle-3 commit, 4 files** — the gate `updated:` field
is hand-written and proved unreliable as a `--since` key in cycle 3, so the commit boundary is used
instead, which is exact.

`SAFETY_REPROBE`: gate 3's security axis read `OK reasoned` → not triggered.

The review was **dispatched** and returned in 5m10s, having run the suite itself and executed the
append expression and the bug-link regex in-process. It found five things; the QA step had
independently found two of them (the unbounded cell, the pipe corruption) before it returned.

---

## Re-Review Context — cycle 3's findings

| Finding | Severity | Status | How verified |
| :--- | :--- | :--- | :--- |
| BUG-7 — `blocked`/`na` impossible on an accepted row | HIGH | **FIXED** | Executed: both now succeed, keep `✅`, and preserve the sign-off |
| BUG-8 — the guard omitted `--bug` | MEDIUM | **FIXED** | The append rule makes the flag set irrelevant; verified over the writer set |
| CR3-3 — README said only a fail moves an accepted row | LOW | **FIXED** | Re-read against the code |
| CR3-4 — `requireIdValue` on the readers only | LOW | **FIXED** | Population test over all six id-taking commands; mutation-proved (M21) |

---

## New Findings This Cycle

- **[medium] TASK-141-BUG-9** — `renderRow` joined cells with an unescaped `|`. A pipe in a `--note`
  split the row; `--check` reported `D.1: 11 cells, header has 10`, which `/qa-next` Step 0 treats
  as HALT `registry-invalid`.

  **Provenance, measured both ways**: `renderRow` is byte-identical on `origin/develop`, neither
  version escapes anything, and base's `cmdSet` wrote the raw note too — so the **corruption is
  pre-existing**. What this branch added is the **irrecoverability**: on a kept `✅`, `--clear-note`
  is refused and every later `--set` appends onto the already-split cell, so the only repairs were a
  demotion that destroys the sign-off, or a hand edit. The aggravation is attributable, so it enters
  `top_issues[]` rather than `recommendations.future`.

  Fixed by escaping `|` once in `renderRow` — the single writer of every cell the tool emits.
  `splitCells` has honoured `\|` through a `(?<!\\)` lookbehind since before this branch; the two
  halves were written for each other and had never met.

- **[medium] TASK-141-BUG-10** *(dispatched reviewer)* — `describeRow.bug` took the **first**
  bug-shaped link, and the append rule makes that cell multi-valued on a kept `✅`, so a superseded
  bug won over the newest — while `SKILL.md` Step 4 re-links precisely that value as "the open bug".
  Verified against a synthetic cell and then end to end. Fixed: the last match wins.

- **[low] CR4-3** — the append had no duplicate suppression and no cap. A `✅` row blocked nightly by
  the same missing credential grows its cell forever, and `--clear-note` is refused there so nothing
  could trim it. Measured: twelve identical blocked re-runs produced twelve segments. Fixed by
  suppressing an *immediate* repeat only — a different reason between two identical ones is still
  recorded, which keeps the cell an honest history rather than a set.

- **[low] CR4-4** — the fair criticism of cycle 3. `kept` is `!["fail","untested"].includes(state)`,
  a hand-listed subset of `STATES`, so the replacement for two failed flag-enumerations is itself an
  enumeration in the other direction: a seventh state would default to kept-on-accepted with nothing
  forcing the re-check, and `cmdSet` holds two more such lists.

  It is a smaller and stabler population than the one it replaced — `STATES` is a frozen object that
  changes rarely, flags are open-ended — but "nothing forces the re-check" is true either way.
  Answered with the forcing function rather than a refactor: a test lists `Object.keys(STATES)`
  once and fails until every state is classified by all three rules, asserting the `--run` and
  `--note` requirements **against the tool** rather than tabulating them.

- **[low] CR4-5** — README said a kept re-run "updates **Last run**", but `--run` is required for
  `pass`/`fail` only, so a `blocked` or `na` keeps `✅`, appends the note and leaves the stale link.
  Qualified.

---

## Verification of the cycle-4 fixes

| Mutation | Test that went red | Outcome |
| :--- | :--- | :--- |
| M22 `renderRow` stops escaping | pipe round-trip | `covered` |
| M23 `describeRow` back to the first bug link | newest-bug-link | `covered` |
| M24 repeat suppression removed | bounded-append | `covered` |
| M25 a state dropped from the rules table | STATES population | `covered` |

25 mutations across four cycles; none survived.

| Check | Result |
| :--- | :--- |
| `npm test` (symlink aside) | 3939, 0 fail, 1 skipped |
| qa-next suite | 36/36 |
| `npm run validate -- skills/qa-next/` | pass |
| `check:generated`, `bundle --check`, Prettier | clean |
| CI on the cycle-3 push | all five green |

---

## Process failure in this cycle, recorded

**This report did not exist when the cycle-4 commit was made.** The task document was updated to link
to it in the same commit, so the branch shipped a dangling relative link — and CI went red on
`link-check` and on the `doc-links` corpus test while the local `npm test` had been green, because
the local run happened *before* the link was added.

That is the third time this branch has met the tracked-tree-versus-working-tree asymmetry, and the
first time the artifact was missing rather than merely untracked. The earlier two were benign (the
target existed and was untracked, and committing fixed it); this one was a real omission that no
local gate caught, because the gate ran before the claim was written. Recorded here rather than
quietly repaired, and logged as an observation.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: no HIGH; the append rule verified over its writer set; four residual findings, all
fixed in-cycle and each mutation-proved.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL — conditions met by the cycle-4 fixes.

---

**Next Steps**: cycle 5 verification, then Step 5c (`/review-pr`).
