# Sprint Review Summary - /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Story/Task ID:** task.176
**Completed Date:** 2026-10-02
**Completed By:** Claude (develop-task pipeline)
**Pull Request:** [#554](https://github.com/Gamaroff/agent-skills/pull/554)

## Summary

`/review-pr` can now start from the work item a person is holding instead of a PR number. You can pass
any of these, and it resolves the card to the PR to review:

- a Jira key or Jira URL — `/browse/`, a board's `selectedIssue=`, or Jira Cloud `…/issues/KEY`
- a GitHub issue URL
- `#N`

The review itself is unchanged.

## What Was Delivered

### Acceptance Criteria Met

All 11 Success Criteria are met: 7 functional, 1 performance, 2 code quality and 1 migration. Each is
traced to code and to a test that runs on every PR (`task.176.dod.1.review-pr-tracker-issue-input.md`).

### Key Features Implemented

- **Pure target parser** (`skills/review-pr/scripts/parse-target.sh`). It is host-first, anchored, and
  refuses malformed URLs and control characters. It reads github.com and bitbucket.org paths by
  position. It can be sourced, so the security probe engine can execute it.
- **Card → PR resolution.** Step 1a tries, in order: the work-item doc, `pr_number:`, the branch stem,
  then a key search or closing PR, then a branch fallback.
  - A key match is listed as a candidate and never picked automatically.
  - An epic halts.
  - When several PRs match, it asks, or halts with the list.
- **Per-kind host check.** A PR URL or issue URL for another host or repo than `origin` halts. A Jira
  host mismatch only warns.
- **One shared key → document lookup** in step-0 §0a. It is anchored and quote-tolerant. It halts on
  several matches and keeps only the work item, never its artifacts. The develop pipelines and
  `/review-pr` both cite it.

## Technical Details

### Files Modified/Created

- `skills/review-pr/scripts/parse-target.sh` (new)
- `skills/review-pr/SKILL.md` — Steps 0, 0b, 1a, 1b and 2, and the Arguments table
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0a, plus 4 bundled copies
- `skills/review-pr/tests/review-pr.test.js` — 52 → 188 tests
- `tests/unbound-default-reads.test.js`, `CHANGELOG.md`

### Architecture/Design Decisions

- **Every fenced block in SKILL.md is self-contained.** The QA cycles found three defects where a
  block read a variable that another block bound. Each block now binds its own inputs, and the test
  suite runs the blocks exactly as delivered.
- **One remote → owner/repo expression.** It is used verbatim at three sites, and a test holds the
  copies equal.

### Dependencies

None.

## Testing & Quality Assurance

### Test Coverage

- **`review-pr.test.js`: 188 tests.** It covers:
  - the parser forms under bash and zsh
  - the Step 0b and rungs 3–4 blocks, executed in a consumer-shaped git repo with a stub `gh`
  - the §0a lookup run against fixtures
  - `bash -n` and `zsh -n` over every fenced block
  - the security engine's `shell-fn:` probe over the parser: 32 probes, which held
- **`ci:fast`: 5135 pass, 0 fail.**

### Code Review

- **QA:** 4 cycles, going CONCERNS 90 → FAIL 70 → CONCERNS 90 → PASS 100. Every fix was
  mutation-proven.
- **Step 5c `/review-pr`:** CONCERNS, non-blocking. Its follow-ups are in the task's Deferred Work.

## Security & Compliance

### Security Review

- The checklist passes: no secrets, no eval, inputs validated before `grep`, `gh` and `curl`, and host
  and repo halts against `origin`.
- The parser boundary is executed by the engine: 32 probes, 0 reproduced.

### Compliance Review

Not applicable. This is an internal skills-library change.

## Documentation

### Updated Documentation

- `CHANGELOG.md` `[Unreleased]`, including the stricter §0a lookup
- the `skills/review-pr/SKILL.md` Arguments table and description

### Documentation Links

- `skills/review-pr/SKILL.md`
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § Key → document lookup

## Demo Notes

### How to Verify

- `bash skills/review-pr/scripts/parse-target.sh https://acme.atlassian.net/browse/RAPP-702` prints
  `kind=jira`, `jira_key=RAPP-702` and `host=acme.atlassian.net`.
- `/review-pr #553` in this repository resolves the issue to PR #554 through its closing reference.

### Screenshots/Visuals

Not applicable (CLI).

## Impact & Value

### User Impact

A reviewer can paste the card they are working from, such as a Jira board link, instead of first
looking up the PR.

### Technical Impact

- The develop pipelines' key → document lookup no longer matches by prefix. Before, `RAPP-70` resolved
  to `RAPP-702`'s document, and every quoted `jira_key` was missed.
- The parser became the first one-string shell boundary the probe engine executes.

## Known Limitations & Future Work

### Current Limitations

These are recorded in the task's Deferred Work:

- An `.env` line with a trailing comment defeats the quote strip.
- A repository with no `docs/` makes `/review-pr` halt instead of falling back to a code-only review.
- Scheme-less URLs are read as branch names.
- Step 2 rung 2's `pr_number` grep applies no artifact filter. This one is pre-existing.

### Suggested Follow-Up Stories

- Make the restated key lookups in `review-task` and `review-story` cite §0a.
- Close the four limitations above.

---

**Status:** ✅ **ACCEPTED**
