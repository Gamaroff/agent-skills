# Sprint Review Summary - review-task and review-story cite the §0a key lookup

**Story/Task ID:** task.178
**Completed Date:** 2026-10-12
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#636](https://github.com/Gamaroff/agent-skills/pull/636)

---

## Summary

review-task and review-story no longer carry their own copies of the tracker-key → document lookup. All three sites now cite the shared, anchored §0a lookup that the develop pipelines use, and a guard test fails if a canonical source restates it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] No canonical source except §0a greps the docs tree for a tracker-key value — guard test with a one-entry allowlist
- [x] review-task's Jira-key branch resolves a quoted key to its one task document, not a `.request.` sibling or a prefix neighbour — fixture tests under bash and zsh
- [x] One lookup replaces one lookup (no performance change)
- [x] Guard red on revert; `bundle:check` and the full suite green
- [x] `npm run validate` passes for both skills
- [x] No migration beyond `setup-consumer.sh --update`

### Key Features Implemented

- **review-task Jira-key branch**: a bind block, the cited §0a block and a task-only check, run as one script; the check HALTs loudly on unbound inputs instead of reporting "no local document"
- **Fallback sites**: review-task Step 3 and review-story's issue fallback cite §0a with `KEY_FIELD` / `KEY_VALUE`
- **Guard test**: `tests/key-lookup-single-statement.test.js` — a tripwire over a fixture table of lookup shapes, plus executed fixtures for the Jira-key branch

---

## Technical Details

### Files Modified/Created

- `skills/review-task/SKILL.md` — Jira-key branch and Step 3 fallback cite §0a
- `skills/review-story/SKILL.md` — issue fallback cites §0a
- `skills/review-task/references/`, `skills/review-story/references/` — bundled step-0 document (citation: the file alone)
- `tests/key-lookup-single-statement.test.js` — new, 12 tests
- `CHANGELOG.md` — `[Unreleased]` › Changed entry

### Architecture/Design Decisions

The lookup is cited, not restated: one anchored, quote-tolerant definition serves the develop pipelines and both review skills. The guard's claim was deliberately scoped to the shapes in its fixture table after QA showed a lexical matcher cannot enumerate every way of writing `grep`.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** A prefix-only match (`RAPP-7` finding `RAPP-70`) now reports "no local document" — correct by construction; documented in CHANGELOG

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 12 tests in `tests/key-lookup-single-statement.test.js`
- **Test Coverage:** all three sites, the allowlist, non-vacuity and the Jira-key branch's five cases

### Code Review

- **Reviewers:** QA code reviewer every cycle (`code_review_blocking=true`); Step 5c `/review-pr` conformance review
- **Approval Status:** ✅ APPROVE (5c); QA gate 6 PASS 100/100
- **Review Comments Addressed:** all blocking findings across 6 QA cycles; one low advisory routed to future work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] JIRA_KEY validated by `^[A-Z]+-[0-9]+$` before it reaches the §0a regex
- [x] No secrets, unsafe patterns or dependency changes
- [x] The task-only check (a boundary) probed through the engine: 17 cases, 0 reproduced

### Compliance

Not applicable — internal refactor of skill instructions.

---

## Known Limitations and Future Work

- BND-1: a `fence:` probe form (task.180) would let QA probe fenced-block boundaries directly
- A real shell quote glued between word characters (`-e'…|…'`) is outside the guard's fixture table
- review-task Step 2's bare `$INPUT` read is pre-existing; review-pr has the same cross-block pattern
- `tests/bundle-missing-source.test.js` exceeds its 20 s budget on slower hosts (pre-existing)
