# Sprint Review Summary - A call-site list in a task document is the author's recall, not a measurement

**Story/Task ID:** task.129
**Completed Date:** 2026-09-29
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#525](https://github.com/Gamaroff/agent-skills/pull/525)

---

## Summary

A task or story that scopes itself as "the N call sites of engine X" is now checked against a measurement at review, not trusted: one shared collector, `call-sites.js`, measures the population, and review-task and review-story diff the document's list against it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `call-sites.js --engine tracker-comment --json` returns exactly the sites the guard test scans (24; stakeholder-summary-cli 12)
- [x] On the task.121 fixture (`c69f5115^`) the collector returns the two sites the document did not name, and the check reports them Important — committed test
- [x] The guard test's floors and proofs are unchanged after consuming the shared collector
- [x] The CLI measures the live tree in under 2 s (~0.2 s) — committed test
- [x] One collector, three consumers; the guard restates no call-site shape — committed test
- [x] Mutation proof: removing a root class makes the fixture test name it
- [x] Observation #120 closed naming PR #525

### Key Features Implemented

- **`shared/resources/call-sites.js`**: one collector of engine invocations (`tracker-comment`, `stakeholder-summary-cli`, `gh-stage`, `jira-stage`, `tracker-issue`) with a CLI (`--engine`, `--root`, `--json`). Every outcome is one row of a `REASONS` table with a unique non-zero exit code. An explicit `--root` is measured as given, so an exported earlier tree can be measured wherever it sits.
- **Call-site population check**: review-task Step 3 check 14 and review-story Step 4 check 10, with Detection Rules entries; both Agent C pre-pass prompts return `population_diff`; create-task 3.5 carries the authoring twin.
- **Guard lift**: `comment-slot-coverage.test.mjs` imports the collector instead of carrying its own copy; its populations are unchanged.

---

## Technical Details

### Files Modified/Created

- `shared/resources/call-sites.js` — new collector + CLI (bundled into review-task, review-story, create-task)
- `shared/resources/tests/call-sites.test.mjs` — 32 tests: root classes, decoys, engine shapes, `REASONS` rows, the `c69f5115^` fixture, the 2 s bound, the no-restated-shape guard
- `shared/resources/tests/comment-slot-coverage.test.mjs` — imports the shared collector
- `tests/review-call-site-population-check.test.js` — presence of the check at all five prose sites (10 tests)
- `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/create-task/SKILL.md`, both `shared/resources/review-*-prepass-prompts.md` — the check and its authoring twin
- `CHANGELOG.md`, `docs/contributing/traps.md` — entry; load-sensitive list

### Architecture/Design Decisions

- The collector's two lifted shapes are byte-identical to the guard's, so the guard's population could not move; the before/after count (24 / 12) was asserted.
- After three QA cycles each found a new edge in the CLI's exit contract, the contract was consolidated into one `REASONS` table that every exit path reads and one test drives row by row (narrowing-residue move).
- `node "$VAR"` sites are found on a stated best-effort rule; its limits are documented rather than patched.

### Dependencies

None added — Node built-ins only.

---

## Testing & Quality Assurance

### Test Coverage

- `npm run ci:fast`: 4,579 pass, 0 fail on the acceptance head's parent
- Every new test mutation-proved (reverting the behaviour turns the named test red)

### Code Review

- QA: 4 cycles — gates CONCERNS 80 ×3, then PASS 100; HIGH 0 throughout
- Step 5c PR review: CONCERNS (`task.129.pr-review.1.review-call-site-population-check.md`) — PC-1..PC-3 corrected; CR-1 open as a follow-up
- DoD: run 1 found 4 gaps (missing per-PR tests, obs #120); run 2 passed

---

## Security & Compliance

### Security Review

- Not a boundary: the collector is a measurement whose result gates no action. No secrets, no unsafe patterns; its only child process is a fixed-argv `git rev-parse`.

### Compliance Review

- Not applicable — internal review tooling.

---

## Documentation

### Updated Documentation

- review-task check 14, review-story check 10, both Agent C prompts, create-task 3.5
- CHANGELOG `[Unreleased]`; `docs/contributing/traps.md` load-sensitive list

### Documentation Links

- Task: `docs/tasks/task.129.review-call-site-population-check/task.129.review-call-site-population-check.md`
- DoD: `task.129.dod.2.review-call-site-population-check.md`

---

## Demo Notes

### How to Verify

1. `command node shared/resources/call-sites.js --engine tracker-comment` → `ok call-sites: 24 …`
2. `git archive c69f5115^ shared/resources skills scripts | tar -x -C /tmp/x && command node shared/resources/call-sites.js --engine tracker-comment --root /tmp/x | grep -E 'qa-loop.md:905|verify-loop.md:89'` → the two sites task.121 did not name
3. `node --test shared/resources/tests/call-sites.test.mjs tests/review-call-site-population-check.test.js`

### Screenshots/Visuals

N/A — CLI and prose.

---

## Impact & Value

### User Impact

A reviewer running review-task or review-story on a document that enumerates engine call sites now gets unnamed sites as Important findings at review, when fixing them is a paragraph — not after development, when it is a scope change.

### Technical Impact

One collector replaces a private copy; the review and the guard can no longer disagree about what a call site is.

---

## Known Limitations & Future Work

### Current Limitations

- CR-1 (5c): exit 1 also occurs when the bundled module cannot load (MODULE_NOT_FOUND); the prose should branch on the JSON `reason`.
- The `node "$VAR"` rule is best-effort (within-function reassignment, globals used in later functions, Markdown blocks sharing one set).

### Suggested Follow-Up Stories

- Prose sites branch on the JSON `reason`, and the four hand-listed reason lists are tied to `REASONS` by a test (CR-1, C4-CR-1).
- Unit-test `installExitGuards` directly; give the output-closed driver an error/timeout path (C4-CR-2, C4-CR-3).
