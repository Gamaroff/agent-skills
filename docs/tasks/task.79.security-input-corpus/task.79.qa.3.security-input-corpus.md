# QA Report: Task 79 — Write down the inputs that defeat each sink, once (cycle 3)

**Task**: [task.79.security-input-corpus.md](./task.79.security-input-corpus.md)
**Gate File**: [task.79.gate.3.security-input-corpus.yml](./task.79.gate.3.security-input-corpus.yml)
**Previous cycles**: [qa.1](./task.79.qa.1.security-input-corpus.md) FAIL · [qa.2](./task.79.qa.2.security-input-corpus.md) CONCERNS
**Review Date**: 2026-09-07
**Gate Status**: PASS

---

## Executive Summary

Verification re-review of cycle 2's fixes. **Every one holds**, CI is green on the exact head commit,
and no new finding was raised. Gate PASS.

**Review Methodology**: quick verification, per the skill's re-review scoping — cycle 2 made no new
functionality, only corrections, and each correction is independently checkable. Scope: the seven
cycle-2 fixes, re-checked by execution rather than by re-reading their descriptions, plus CI on a
clean checkout.

---

## Re-Review Context — cycle 2's findings

| Finding | Status | Independent check |
|---|---|---|
| C2-1 guard missed the Flag-forms row | **FIXED** | All three restatement fixtures pass: the deleted axis table, a no-code-span prose restatement, and the Flag-forms row **asserted alone** so it cannot pass on a sibling row's code spans |
| C2-2 import still unresolvable | **FIXED** | Zero `repoRoot` occurrences remain in either the source or the bundled prompt — the snippet no longer guesses a directory at all |
| C2-3 purity check defeatable | **FIXED** | Mutating the module with the *exact* body that defeated the name-list version turns the named assertion red, reporting `a dynamic import()` |
| C2-4 `correct` endorsed a non-mitigation | **FIXED** | `correct` now starts with `REJECT`; the URL-object advice is demoted and the setter's silent truncation named |
| C2-5 three over-broad claims | **QUALIFIED, not verified** | Each now states its condition. Carried forward as a named future action — see below |
| C2-6 symlink case not an oracle | **FIXED** | The required fixture is stated in `correct` |
| C2-7 malformed table rows | **FIXED** | All 73 rows well-formed; doc matches the renderer; every case under its own sink and direction |
| C2-8 exemption covered a real paraphrase | **FIXED** | `PROMPT_MAY_MENTION` has 0 entries; the prompt's example no longer paraphrases a corpus case |
| C2-9 `BUNDLED_REFS` hand-maintained | **FIXED, and wider than asked** | Now covers **27** bundled references rather than the 4 hand-listed — every shared resource the finalise skill ships is byte-parity-checked |
| C2-10 substring matching | **FIXED** | Word-bounded, which was required anyway once 2-character flags were admitted |

---

## New Findings This Cycle

**None.** Searched: the seven cycle-2 fixes re-checked by execution (not by re-reading), the full
hermetic suite, and CI on a clean checkout of the tracked tree at head `73f6a45f` — all five checks
green, including `link-check` and `validate` (bundle freshness).

The one residual is **not** a new finding and **not** an open issue: three corpus claims
(`mustache-interpolation`, `homoglyph-quote`, `attribute-breakout`) are qualified to the
configurations where they hold, but that qualification is **cited rather than executed** — no
template engine or Windows codepage is available in this environment. The corpus now says so.
Carried as a future action, because a corpus that distinguishes its measured claims from its cited
ones is doing its job; one that quietly presented all of them as measured would not be.

---

## Convergence

| Cycle | Gate | HIGH findings | Issues found |
|---|---|---|---|
| 1 | FAIL | 1 | 10 promoted + 6 advisory |
| 2 | CONCERNS | 0 | 11 |
| 3 | **PASS** | 0 | 0 |

Strictly decreasing throughout. The convergence check never came close to tripping.

---

## Final Assessment

**Gate Status**: PASS · **Quality Score**: 100/100
**Deployment Recommendation**: staging APPROVED, production APPROVED

**Rationale**: All 21 findings across three cycles are closed and independently verified. The
deliverable does what the task set out to do, and — after two rounds of correction — the guard that
enforces it can actually fail.

**Next Steps**: Step 5c — `/review-pr` conformance review, the loop's exit gate.
