# QA Report: Task 178 - review-task and review-story cite the §0a key lookup (cycle 4)

**Task**: [task.178.review-skills-cite-key-lookup.md](./task.178.review-skills-cite-key-lookup.md)
**Gate File**: [task.178.gate.4.review-skills-cite-key-lookup.yml](./task.178.gate.4.review-skills-cite-key-lookup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Gate Status**: FAIL

---

## Re-Review Context

| Gate 3 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (medium) — quoted alternation split the segment | FIXED — but the fix regressed another shape (this cycle's CR-1) | alternation fixtures green |
| CR-2 (medium) — prefixed/globbed docs paths | FIXED | `./docs/`, `$ROOT/docs`, `docs/**/*.md`, `docs/{…}/` fixtures; mutation → red |

---

## Review Methodology

Re-review scope: files changed since gate 3 (head 1e47097bd65a; 2 files) — default. Reviewer: one
read-only Explore subagent, 88852 ms (completion notice `duration_ms`), judging the matcher against
its newly scoped claim. QA reproduced the HIGH finding with the test file's own `isKeyLookup`
(`/tmp` probe script, two prose lines → `false`). Step 4b: not applicable — no `SKILL.md` or shared
resource changed since gate 3.

---

## New Findings This Cycle

- **[high]** `tests/key-lookup-single-statement.test.js:66` — the quote-aware splitter reads a prose
  apostrophe (`skill's`, `doesn't`) as an opening quote; the code span after it is never split out, so
  `fall back to the skill's \`grep -rl "github_issue: {N}" docs/\`` is no longer caught. A regression
  from cycle 3's fix, in a shape the header claims. (CR-1)
- Advisory (low/medium): `docs/{task-file}` reads as a brace set (CR-2).
- Cleanups: the header sentence lacks "outside quotes" (CR-3); the CHANGELOG entry leads with the
  unscoped claim (CR-4).

Fourth consecutive cycle on the guard's matcher; the first HIGH, and it was introduced by the
previous fix.

---

## NFR Assessment

- **Security** — PASS · Evidence: reasoned · Probes executed: 0
- **Performance** — PASS · **Reliability** — PASS
- **Maintainability** — CONCERNS (CR-1)

---

## Final Assessment

**Gate Status**: FAIL · **Quality Score**: 80/100
**Next Steps**: `/qa-fix` cycle 4; cycle 5 is the last in budget.
