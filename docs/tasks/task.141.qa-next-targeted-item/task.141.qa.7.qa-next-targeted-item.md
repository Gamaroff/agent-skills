# QA Report: Task 141 - cycle 7 (last granted cycle)

**Task**: [task.141.qa-next-targeted-item.md](./task.141.qa-next-targeted-item.md)
**Gate File**: [task.141.gate.7.qa-next-targeted-item.yml](./task.141.gate.7.qa-next-targeted-item.yml)
**Review Date**: 2026-09-23
**Gate Status**: CONCERNS — no HIGH, third gate running

---

## Executive Summary

Cycle 6 closed the **validated-vs-published** divergence on the *row-state* axis and reopened it on
the *link-shape* axis: `checkRegistry` learned to skip a prose URL and `describeRow` did not. The
fixture cycle 6's own test declares legal was `--check` green while the payload handed the skill
`https://example.com/issues/99` — the path Step 4 opens.

Cycle 7 closes it **structurally**: one `isToolWrittenLink`, used by the reader and the checker
alike, so the published link *is* the validated link by construction rather than by two sites
agreeing. Same move as cycle 3's append rule — replace an alignment that must be maintained with a
property that holds itself.

Three findings, all closed in-cycle, no HIGH.

---

## Re-Review Context — cycle 6's three fixes

| Fix | Verdict |
| :--- | :--- |
| `checkRegistry` validates every repo-relative link on every row | **Two defects** — BUG-16 below |
| `appendNote` header comment deleted | **CLEAN** — the reviewer confirmed no contradicting comment remains anywhere in the file |
| STATES population floor derived | **CLEAN** — reds on a skipped state, on a state missing from `RULES`, and on a wrong tabulated value; the one vacuous path (a falsy `RULES` value) predates the change and was not widened |

---

## New Findings — all fixed in-cycle

- **[medium] BUG-16** — the divergence, on a new axis. Also: a `fail` row could satisfy "requires a
  bug link" with a URL alone and existence-check nothing, where the base exited 1 — cycle 6 had
  quietly *weakened* a check while fixing another. Both closed by the shared predicate; the
  fail-row requirement now counts only tool-written links, restoring the base's strictness.

- **[medium] BUG-17** — the twin statement. README still said "❌ carries a bug link that resolves".
  **And a third statement was found**: `renderSkeleton` writes the same rule into the header of
  every registry `--init` creates. It had gone unnoticed for six cycles and was found by grepping
  for the rule rather than by being told about it. All three updated in one edit.

- **[low] CR7-3** — a `#fragment` on a repo-relative path errored naming a file that exists, and
  `//host/x` did the same. Fragment stripped before the exists check; `//` treated as prose.

**Pre-existing, recorded not fixed**: `checkFindings` applies no prose-link skip, so the same URL is
legal in `Notes / bug` and an error in a run file's `Filed as`. Identical on `origin/develop`.

---

## Verification

| Mutation | Test that went red |
| :--- | :--- |
| M33 `describeRow` publishes any bug link again | the-link-validated-is-the-link-published |
| M34 the `#fragment` is not stripped | fragment-resolves |

34 mutations across seven cycles; none survived. 41 tests, `npm test` **3944 green**, `validate`
green, `check:generated` / `bundle --check` / Prettier clean.

---

## The honest position at the end of the granted budget

**The 7-cycle budget is spent and no gate has read cycle 7's three fixes.** Same shape as the first
escalation, with two differences worth weighing:

- **Severity has fallen and stayed down.** HIGH by gate: 1, 1, 1, 0, 1, 0, 0 — none for three
  consecutive gates. Cycle 5 found 5 defects, cycle 6 four, cycle 7 three, and cycle 7's were two
  MEDIUM and one LOW with nothing structural left open.
- **The last two fixes were structural rather than corrective.** Cycle 3 replaced an enumeration of
  flags with an operation; cycle 7 replaced an alignment of two readers with one predicate. Those
  are the two changes in this loop that removed a *class* rather than an instance, and both came
  after the cheaper corrections had been tried and failed.

Against that: six of seven cycles found their defect in the previous cycle's fix, and cycle 7 is no
exception. The base rate on this branch for "fixed and green" meaning "correct" is poor, and one
more cycle would very likely find something — probably small.

**Recommended**: `/review-pr` and finalise on the evidence. An eighth cycle would most likely
return another LOW in the same small area, and the two structural changes have removed the
mechanisms that generated the earlier HIGHs. But that is a judgement about diminishing returns, not
a claim that the code is now provably clean, and it is the operator's call.

---

**Gate**: CONCERNS · **Quality Score**: 85/100 · staging APPROVED, production CONDITIONAL.
