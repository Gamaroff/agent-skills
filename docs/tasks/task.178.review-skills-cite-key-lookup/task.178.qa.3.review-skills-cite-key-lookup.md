# QA Report: Task 178 - review-task and review-story cite the §0a key lookup (cycle 3)

**Task**: [task.178.review-skills-cite-key-lookup.md](./task.178.review-skills-cite-key-lookup.md)
**Gate File**: [task.178.gate.3.review-skills-cite-key-lookup.yml](./task.178.gate.3.review-skills-cite-key-lookup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 2 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium) — flag-spelling key missed restatements | FIXED for every spelling named (`--include`, `-m1`, flags after the pattern, `egrep`, `--files-with-match`, verbatim §0a, `rg`, `git grep`) | must-match fixtures; mutation (egrep restatement in review-story) → red |
| CR-3 (low) — non-lookups flagged | FIXED | pipeline, prose and inventory negatives; mutation (value requirement relaxed) → red |

---

## Review Methodology

Re-review scope: files changed since gate 2 (head abec1e35bd77; 2 files) — default. `SAFETY_REPROBE=false`
(gate 2 security PASS). Reviewer: one read-only Explore subagent, 74277 ms (completion notice
`duration_ms`); it ran the suite (12/12, bash) and probed the matcher with 8 spellings not in the
fixtures. Step 4b: not applicable this cycle — no `SKILL.md` or shared resource changed since gate 2.

Route classifier (`classifyLoopRoute`, cycle 3, HIGH `[0, 0, 0]`): `continue` — `not-a-pass-gate`;
route 2 declined (`product-defect-signal`).

---

## New Findings This Cycle

- **[medium]** `tests/key-lookup-single-statement.test.js:45` — `segments()` splits on a `|` inside a
  quoted pattern, so an alternation lookup over both key fields is missed. (CR-1)
- **[medium]** `tests/key-lookup-single-statement.test.js:52` — `DOCS_TREE` accepts only bare
  `docs`/`docs/`; `./docs/`, `"$ROOT/docs"`, `docs/**/*.md`, `docs/{stories,tasks}/` are missed and
  the scope is stated nowhere. (CR-2)
- Advisory (low/medium, not gated): escape-class values (`\s`) and `\`-continued lines (CR-3); `rg -L`
  is `--follow` (CR-4).

This is the third consecutive cycle whose findings sit in one mechanism — the guard's lexical
matcher. A lexical matcher cannot see every spelling of a grep; the claim it carries should say which
shapes it catches.

---

## NFR Assessment

- **Security** — PASS · Evidence: reasoned · Probes executed: 0 (BND-1 standing deferral to task.180)
- **Performance** — PASS
- **Reliability** — PASS
- **Maintainability** — CONCERNS (the guard claims more coverage than its matcher has)

---

## Code Review

**Correctness bugs (4):** CR-1, CR-2 (medium/high — **promoted**); CR-3, CR-4 (low/medium — advisory).
**Cleanups (0).** **Boundary:** unchanged (review-task not in this cycle's scope).

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 3 — Step 2.6 repeat subject (third cycle on the matcher): scope the claim to the shapes caught, and fix the two cheap misses.
