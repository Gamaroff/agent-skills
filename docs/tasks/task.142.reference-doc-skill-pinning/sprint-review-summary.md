# Sprint Review Summary - Pin the hand-written reference docs to the skills they describe

**Story/Task ID:** task.142
**Completed Date:** 2026-09-30
**Completed By:** Claude (develop-next → develop-task pipeline)
**Pull Request:** [#534](https://github.com/Gamaroff/agent-skills/pull/534)

---

## Summary

A new guard test fails CI when `docs/reference/commands.md` or `docs/reference/activation-phrases.md` names a skill that does not exist or advertises a flag the skill never documents. Its first run found and fixed one real defect.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Every command in `commands.md` resolves to a skill, or to the named non-skill allowlist (asserted exactly)
- [x] Every `--flag` a row advertises exists in that skill's `SKILL.md`
- [x] Every skill named in `activation-phrases.md` exists
- [x] `/loop /develop-next` resolves to `develop-next`; a quoted script path never wins
- [x] Deleted-skill and fake-flag mutations each turn the suite red
- [x] The guard's own cost is pinned: no spawn, no network, one `SKILL.md` read per skill
- [x] Three floors whose messages blame the extractor; failure messages carry file, line and token
- [x] Header states what the guard does not pin (prose meaning — the `qa-next` story→function drift)

### Key Features Implemented

- **Word-start command resolution**: `/name` counts only at a word start, last wins; rows split on unescaped pipes.
- **One code path**: `resolveCorpus()` does every lookup and check; the assertions and the cost tests both run it.
- **Real finding fixed**: `/session-handoff --read` advertised a flag the skill never documents.

---

## Technical Details

### Files Modified/Created

- `tests/reference-doc-skill-pinning.test.js` (new, 17 tests)
- `docs/reference/commands.md` (row 143)
- `CHANGELOG.md` (`[Unreleased]` › Added)

### Architecture/Design Decisions

The guard asserts one direction only (reference → skill); the reverse stays `tests/skill-doc-coverage.test.js`. Prose accuracy is out of reach of any assertion and stays a human sweep (obs #159, `create-skill`).

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** 17 (9 fixture, 6 live-corpus, 2 cost); full `ci:fast` 4714 pass / 0 fail
- **QA:** 3 cycles — PASS (100), CONCERNS (90, cost tests spied on the wrong code path), PASS (100)
- **Mutations:** 13 across the run, each turning the intended test red
- **CI:** green on PR #534

---

## Known Limitations and Future Work

- Substring flag match (`--read` would pass on `--read-only`); activation-table flags are extracted but unchecked; empty vs missing `SKILL.md` share one message; the corpus is resolved twice.
- Observation #159 → `actioned` after merge.
- Generating `commands.md` from skill frontmatter would retire this guard's prose gap entirely.
