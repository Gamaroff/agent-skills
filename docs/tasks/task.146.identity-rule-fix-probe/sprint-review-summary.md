# Sprint Review Summary - qa-fix: a fix to an identity rule must prove both directions

**Story/Task ID:** task.146
**Completed Date:** 2026-09-25
**Completed By:** develop-task pipeline (Claude), run by /develop-next for the repository maintainer
**Pull Request:** [#488](https://github.com/Gamaroff/agent-skills/pull/488)

---

## Summary

A rule that decides whether two things are the same (a dedupe key, a cache key, a record identity, a
normaliser, an equality predicate) can split what is one or merge what is two. A fix for one
direction pushes toward the other. qa-fix now makes a fix to such a rule carry test pairs for both
directions, drawn from real call sites, and the cycle-2 refute pass looks for both pairs. On task.144,
four of five QA cycles went round this loop one direction at a time (obs #169).

---

## What Was Delivered

### Acceptance Criteria Met

- [x] qa-fix Step 3.5 carries the identity-rule table (Should merge / Should not merge / Which direction did the last fix move?), its trigger list and the real-call-site rule, citing obs #169
- [x] qa-task's and qa-story's `REFUTE PASS.` blocks both carry the Identity rules paragraph outside the four-item list, and are byte-identical
- [x] The test fails on drift, removal, the entry moving into the list (any list glyph), or a qa-fix table row being removed
- [x] The test runs in under one second, with no network access
- [x] Every new assertion is mutation-proved
- [x] `ci:fast`, `format:check` and `bundle --check` are clean
- [x] CHANGELOG `[Unreleased]` cites task 146
- [x] The worked application against task.144's historical keys is recorded

### Key Features Implemented

- **Identity-rule probe (qa-fix Step 3.5)**: a third table beside the lifecycle and documentation tables. It covers the should-merge pair, the should-not-merge pair, and the direction the last fix moved.
- **Refute directive paragraph (qa-task / qa-story)**: placed as its own paragraph, not as a fifth transition bullet. That keeps "probe these four transitions" true and frees the probe from the lifecycle trigger.
- **Shared description kept in step**: `shared/resources/code-review-prompt.md`'s cycle-2 section now names the identity pair too, outside the prompt template, so the general reviewer is unchanged.
- **Parity guard**: the two refute directives are one text in two files, and a test now holds that. Before this change an edit to one of them alone still passed CI.

---

## Technical Details

### Files Modified/Created

- `skills/qa-fix/SKILL.md` — Step 3.5 identity-rule table; the combination sentence now names its subject
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — Identity rules paragraph in the REFUTE PASS directive
- `shared/resources/code-review-prompt.md` (+6 bundled copies) — the cycle-2 description names the identity pair
- `tests/identity-rule-probe.test.js` — 7 tests: table, paragraph, placement plus a glyph-agnostic item count, parity, and the shared description
- `CHANGELOG.md` — `[Unreleased]` › Changed

### Testing & QA

- 4 QA cycles: CONCERNS 80 → CONCERNS 90 → CONCERNS 90 → PASS 100. There were no HIGH findings in any cycle. Seven findings (QA-1 to QA-7) were raised and fixed, and each fix was mutation-proved.
- Step 5c `/review-pr`: CONCERNS. PC-1 (bugs still at Ready for QA) was resolved; three low findings are follow-ups.
- Worked application: the probe's pairs were run against task.144's real historical key functions (`5f553950`, `ef1ed9d6`). Each fix merged a should-not-merge pair from `uat-status.mjs`'s argv, the defect the next QA cycle then reported.

### Security & Compliance

- Security: PASS. No boundary in the change set (verified by the classifier); no secrets or unsafe patterns.
- Compliance: NOT_APPLICABLE.

---

## Known Limitations and Future Work

- CR-1 / CR-2 (low): the placement test does not catch the paragraph written as an indented continuation of the Reconnect bullet, and one of its assertions is redundant.
- obs #183: qa-fix's "one Change Log row on exiting the fix loop" rule is keyed to a moment qa-fix cannot observe.
- Process observations raised during this run: #181 (BSD mktemp suffix template), #182 (the cycle-3 scope uses a hand-written gate timestamp), #184 (finalise PR-number derivation), plus recurrences of #171 and #178.
