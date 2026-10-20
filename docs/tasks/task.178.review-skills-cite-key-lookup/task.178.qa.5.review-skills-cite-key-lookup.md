# QA Report: Task 178 - review-task and review-story cite the §0a key lookup (cycle 5)

**Task**: [task.178.review-skills-cite-key-lookup.md](./task.178.review-skills-cite-key-lookup.md)
**Gate File**: [task.178.gate.5.review-skills-cite-key-lookup.yml](./task.178.gate.5.review-skills-cite-key-lookup.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Gate Status**: CONCERNS

---

## Re-Review Context

| Gate 4 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 (high) — prose apostrophe swallowed a code span | FIXED — the backtick-first split holds; its unbalanced-chunk fallback regressed another combination (this cycle's CR-1) | two-apostrophe fixture; mutation → red |

---

## Review Methodology

Re-review scope: files changed since gate 4 (head c288e3428f26; 2 files) — default. Reviewer: one
read-only Explore subagent, 61525 ms (completion notice `duration_ms`), asked to find the input the
cycle-4 split gets wrong. Step 4b: not applicable — no `SKILL.md` or shared resource changed.

---

## New Findings This Cycle

- **[medium]** `tests/key-lookup-single-statement.test.js:84` — a chunk with an unpaired apostrophe is
  split on every `|`, breaking a quoted-alternation lookup; three lines that matched before the
  cycle-4 commit do not now. (CR-1)
- Low (advisory): the header does not describe the unbalanced-chunk behaviour (CR-2).

Fifth consecutive cycle on the guard's matcher. HIGH sequence 0, 0, 0, 1, 0; MEDIUM 1, 1, 2, 0, 1.
The deliverable itself (the three citations, the bundle, the review-task branch) has had no finding
since cycle 1.

---

## NFR Assessment

- **Security** — PASS · Evidence: reasoned · Probes executed: 0
- **Performance** — PASS · **Reliability** — PASS
- **Maintainability** — CONCERNS (CR-1)

---

## Final Assessment

**Gate Status**: CONCERNS · **Quality Score**: 90/100
**Next Steps**: `/qa-fix` cycle 5 — the last in budget; Loop Escalation follows.
