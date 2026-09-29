# QA Report: Task 141 - cycle 11 (fourth grant — gate the review-driven fix)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.11.qa-next-targeted-item.yml](./task.141.gate.11.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH; one MEDIUM open

---

## Executive Summary

This cycle gated `4d805a47`, the fix for PR review 1's findings. Four of the five hold: the literal
id, the run-path prose, the `debug.log` anchoring and the closed bug reports. The fifth (CR-2, the
state file carries `priorRuns` and `bug`) aligned Steps 4 and 5 but **missed Step 6**. Step 6 prints
"which run of this function it is and a link to the previous one" *after* deleting the state file,
and the resume map has no `committed` entry, so it can only re-query `--item`. That query counts the
run just committed (**BUG-22**). It is an enumeration miss by the previous fix, the pattern this
loop has shown throughout.

---

## Review Methodology

One dispatched read-only reviewer (Explore, the shared code-review prompt verbatim, with a
cycle-specific refute focus). It returned in 2m58s, after reading the 8 changed files and probing
`BUG_LINK_RE` on 8 link texts. Its findings were verified here against `SKILL.md` and against
`origin/develop` for provenance.

```
Re-review scope: commit 4d805a47 (review-driven fix) — SKILL.md, README.md, uat-status.mjs, uat-status.test.mjs, bug.1–4
```

**Step 4b**: `no-executable-blocks`, with 5 blocks correctly refused (SKILL.md changed).

---

## Re-Review Context — PR review 1's findings, as fixed in 4d805a47

| Finding | Verdict |
| :--- | :--- |
| CR-3 `--item D.2` literal | **HOLDS.** No other literal id in an executed block |
| CR-1 run-path location (prose) | **HOLDS** for the default registry. The claim that `--set --run` takes the printed path unchanged is false only when the registry directory is a string prefix of `runs/` (pre-existing `startsWith` guess, CR11-3) |
| CR-2 state file carries `priorRuns`/`bug` | **PARTIAL.** Steps 4 and 5 are aligned; Step 6 is missed (BUG-22) |
| CR-4 `\bbug\.` | **HOLDS.** M47 reds. The wording "starts a word" does not say that `_` and digits count as word characters (CR11-4) |
| PC-1 bug reports closed | **HOLDS.** The two new Status History sections skip the cycle-2 In Progress and Ready for QA rows (CR11-5) |

---

## New Findings This Cycle

- **[medium] BUG-22** `skills/qa-next/SKILL.md:211`: Step 6 reads `priorRuns`-derived data after
  deleting the state file, and there is no `committed` resume entry.
- **[low] CR11-4** `uat-status.mjs`: the rule wording versus `\b` for `x_bug.` and `1bug.`.
- **[low] CR11-5** bug.3 and bug.4: the histories skip In Progress and Ready for QA.

**Pre-existing, routed to future** (identical on `origin/develop`): CR11-2 (no `--registry` passed,
so a non-default `registryPath` is invisible to the tool); CR11-3 (`cmdSet`'s `startsWith` guess).

---

## Test Artifacts

`ci:fast` at `4d805a47`: 3947 tests, 0 fail. qa-next suite 44/44. `validate` ✓.

## NFR Assessment

Security PASS (reasoned, 0 probes) · Performance PASS · Reliability PASS · Maintainability CONCERNS (BUG-22).

## Final Assessment

**Gate**: CONCERNS · **Quality Score**: 90/100 · **HIGH**: 0 · **MEDIUM**: 1 · **LOW**: 2. The route
classifier returned `continue` (not a PASS gate), so the loop goes to 5b for cycle 11, the last budgeted cycle.

---

## Bug Resolution Summary — fixed in-cycle (5b, cycle 11 of 11)

| Finding | Fix | Proof |
| :--- | :--- | :--- |
| **BUG-22** | Step 6 now prints the run number and previous link from the **state file's** `priorRuns` and deletes the state file **last**, and the resume map gains `committed → Step 6`. Every `priorRuns` reader in SKILL.md (Steps 4, 5 and 6) now names the state file | Prose. Re-read against every `priorRuns` reader and every state-file lifetime statement in SKILL.md; they are consistent |
| **CR11-4** | The rule now reads "`bug.` is not preceded by a letter, digit or underscore", identical in the constant and the README. A clause row puts `x_bug.9` and `1bug.9` links to missing files after a real bug link on a fail row | M49 (only letters block `bug.`) → clause test red; M50 (README reverted) → rule-once test red |
| **CR11-5** | bug.3 and bug.4 histories gain their cycle-2 In Progress and Ready for QA rows | — |

qa-next suite 44/44. **The budget is spent at 11 and no gate reads this fix.**
