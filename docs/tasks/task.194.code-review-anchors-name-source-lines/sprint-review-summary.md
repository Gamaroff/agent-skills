# Sprint Review Summary - Code-review findings anchor to source lines

**Story/Task ID:** task.194
**Completed Date:** 2026-10-07
**Completed By:** develop-task pipeline (Claude), run 1
**Pull Request:** [#596](https://github.com/Gamaroff/agent-skills/pull/596)

## Summary

On `/review-pr 594` the shared code reviewer reported every finding at a patch-file line number
(`slugify.js:77` for an 11-line file), and nothing downstream noticed. The reviewer's coordinate is
now defined and quoted, and one shared checker verifies every `path:line` before any of the four
skills that dispatch the reviewer renders, posts or gates on it.

## What Was Delivered

### Acceptance Criteria Met

- SC-1 – SC-12, 13/13 (SC-6 split into 6a and 6b at review), each cited in `task.194.dod.1.code-review-anchors-name-source-lines.md`.

### Key Features Implemented

- **Prompt contract:** `file_line` is the PR-head line (the `+` side of the hunk), never a patch line; new `line_text`.
- **`shared/resources/finding-anchors.js`:** six verdicts (`ok`, `unchecked-text`, `no-line`, `no-such-file`, `out-of-range`, `text-mismatch`); `--rev` reads the reviewed tree through git, relative to `--root`; `--annotate` writes `anchor_check`; exit 2 `bad-root` / `bad-rev` when the tree cannot be read.
- **Four dispatchers wired:** `/review-pr`, `/review-code`, `/qa-task`, `/qa-story`. A malformed anchor renders `⚠️ unverified anchor`, is never dropped, never posted inline, never edited by `--fix`, and reaches `top_issues[]` only as `(location unverified: …)`.

## Technical Details

### Files Modified/Created

- `shared/resources/finding-anchors.js` and `shared/resources/tests/finding-anchors.test.mjs` (new)
- `evals/shared/tests/finding-anchors-callers.test.mjs` (new)
- `shared/resources/code-review-prompt.md`, `shared/resources/pr-conformance-prompt.md`
- `skills/{review-pr,review-code,qa-task,qa-story}/SKILL.md` and their bundled `references/`
- `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js`
- `CHANGELOG.md`

### Architecture/Design Decisions

- The checker **reports and never repairs**: guessing the intended line would hide the reviewer defect.
- `checkTree()` is the single "could not look" preflight, so the caller's mistake (unfetched head, wrong root) never reads as the reviewer's (`no-such-file`).
- The verdict key is `anchor_check`, not `anchor`, because `/review-pr`'s `--inline` jq already uses `anchor` for the `path:line`.

### Dependencies

None — Node built-ins only.

## Testing & Quality Assurance

### Test Coverage

- `finding-anchors.test.mjs` 23 tests, including the PR #594 shape and the long-file control; `finding-anchors-callers.test.mjs` 9; broader suites 3238/3238.
- Every fix mutation-proven (each reverted → its test red).
- Integration: PR #594's real reviewer output replayed through `/review-pr` Step 6 — all six patch-line anchors `out-of-range`, only the corrected control posted inline.

### Code Review

Three QA cycles (gates 80 → 70 → 90), five bugs found and closed; Step 5c `/review-pr` CONCERNS with advisory findings only.

## Security & Compliance

### Security Review

PASS — `makeReader`'s `--root` containment probed by the engine: 11 cases, 0 reproduced (a symlink escape found and fixed in cycle 1).

### Compliance Review

Not applicable — internal tooling.

## Documentation

### Updated Documentation

CHANGELOG `[Unreleased]` › Fixed; the four dispatcher `SKILL.md` files and both lens prompts.

### Documentation Links

- Task: `task.194.code-review-anchors-name-source-lines.md`
- DoD: `task.194.dod.1.code-review-anchors-name-source-lines.md`

## Demo Notes

### How to Verify

```bash
command node shared/resources/finding-anchors.js --findings-file <findings.json> --rev HEAD --json
command node --test shared/resources/tests/finding-anchors.test.mjs
```

## Impact & Value

### User Impact

A review finding now either points at the line it means or is visibly marked as unverified; a
mislocated line can no longer be posted inline on the wrong code or edited by `--fix`.

### Technical Impact

One checker with tests replaces four places that trusted the reviewer's coordinate.

## Known Limitations & Future Work

### Current Limitations

Advisory follow-ups recorded in gate 3 and the PR review: exit 1 also means "checker did not load"
at the dispatcher blocks; a `--root` absent from the `--rev` tree passes the preflight; the
`--inline` block binding; Bitbucket head recovery on the API-diff route; `no-line` for a malformed
code `file_line`; the dispatcher population scope (develop-bug's verify loop); `--staged` index reads.

### Suggested Follow-Up Stories

A follow-up task closing the advisory list above.

**Status:** ✅ **ACCEPTED**
