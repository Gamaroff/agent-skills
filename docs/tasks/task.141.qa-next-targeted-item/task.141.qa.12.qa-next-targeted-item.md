# QA Report: Task 141 - cycle 12 (fifth grant — gate 0c0ed980 alone)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.12.qa-next-targeted-item.yml](./task.141.gate.12.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH; one MEDIUM open

---

## Executive Summary

`0c0ed980` holds for `priorRuns`: Step 6 reads it from the state file and deletes the file last, and
the new `committed → Step 6` resume entry is reachable, because Step 5 sets `phase: committed`. The
rule that fix relies on is over-broad, though. Line 84 says every later step reads `priorRuns` **and
`bug`** from the state file, and the state file's `bug` is the row's link **at selection**. The bug
this run files or re-links in Step 4.2 is never saved, so Step 6's "the bug (if any)" prints nothing
after a first failure and the old closed bug after a repeat one (**BUG-23**). The rule wording also
says "letter" where JS `\b` means an ASCII letter (CR12-2, probed).

## Review Methodology

One dispatched read-only reviewer (Explore, the shared prompt verbatim, with a cycle-specific refute
focus). It returned in 3m31s after 25 tool calls and read all 9 files of the commit. BUG-23, CR12-2
and CR12-4 were verified here: BUG-23 by reading lines 84 and 211 against Step 4.2, and CR12-2 by
executing `BUG_LINK_RE` on `[ébug.9](x)` and `[Ωbug.9](x)` (1 match each).

```
Re-review scope: commit 0c0ed980 (operator-granted cycle) — SKILL.md, README.md, uat-status.mjs, uat-status.test.mjs, bug.3, bug.4, gate.11, qa.11
```

**Step 4b**: `no-executable-blocks`, with 5 blocks correctly refused.

## Re-Review Context — 0c0ed980

| Fix | Verdict |
| :--- | :--- |
| BUG-22 Step 6 reads `priorRuns` from the state file, deletes it last; `committed → Step 6` | **HOLDS for `priorRuns`**; the rule's `bug` half is wrong (BUG-23) |
| CR11-4 rule says what `\b` does | **PARTIAL**: true for ASCII only (CR12-2); the comment and the test label still say "starts a word" (CR12-4) |
| CR11-5 bug.3/bug.4 histories | **HOLDS** |

## New Findings This Cycle

- **[medium] BUG-23** `skills/qa-next/SKILL.md:84` / `:211`: the state file's `bug` is the pre-run
  link, and Step 6 prints it as this run's bug.
- **[low] CR12-2** `uat-status.mjs:555`: the rule says "letter", and `\b` is ASCII-only.
- **[low] CR12-4** `uat-status.mjs:534` and the test label: stale "starts a word" wording.

Advisory, routed to future: CR12-3 (a state file from the pre-task.141 skill has no `priorRuns`) and
CR12-5 (gate 11's closure notes were written by the fixer in the same commit).

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 90/100 · **HIGH**: 0 · **MEDIUM**: 1 · **LOW**: 2. Route
`continue`, so the loop goes to 5b for cycle 12, the last budgeted cycle.

---

## Bug Resolution Summary — fixed in-cycle (5b, cycle 12 of 12)

| Finding | Fix | Proof |
| :--- | :--- | :--- |
| **BUG-23** | The state-file rule is scoped. `priorRuns` is read by Steps 4, 5 and 6. `bug` is the row's **pre-run** link and is read only by Step 4's reuse decision. The bug this run files or re-links is written to the state file as `filedBug` (schema updated), `--set … fail --bug` takes `filedBug`, and Step 6 prints it | Prose. Every `bug`/`filedBug` reader in SKILL.md re-read against the scoped rule |
| **CR12-2** | The rule says "an **ASCII** letter, digit or underscore", verbatim in the constant and the README. A clause row puts `[ébug.9]` to a missing file on a fail row, expecting `--check` rc 1 and `bug` = `docs/bugs/gone.md` | M51 (Unicode-aware lookbehind) → clause test red; M52 (README drops "ASCII") → rule-once test red |
| **CR12-4** | The comment and the test label reworded to the rule | — |

**These fixes are unverified by a gate**: the budget is spent at cycle 12.
