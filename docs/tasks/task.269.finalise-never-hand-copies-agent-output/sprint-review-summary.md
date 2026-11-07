# Sprint Review Summary - finalise never hand-copies agent output

**Story/Task ID:** task.269
**Completed Date:** 2026-11-07
**Pull Request:** [#857](https://github.com/Gamaroff/agent-skills/pull/857)

---

## Summary

`/finalise` no longer retypes a subagent's reply into a file that decides acceptance. The security probe plan and the AC YAML are now taken from the subagent's transcript, with a byte count and a SHA-256 that are checked on the way in.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A plan using `cases_file:` produces a cases file byte-identical to its source.
- [x] The AC record carries the byte count and SHA-256 of the extracted block; a modified block is refused.
- [x] An escaped plan is refused at the write step; the control case is accepted.
- [x] A prior plan is reused only when its hashes and engine path still match.
- [x] A `cases_file` outside the work-item directory, or a symlink, is refused.
- [x] No new test case takes over one second (slowest 410.7 ms over five runs).
- [x] Each new refusal has a recorded mutation proof.
- [x] Bundle check and `npm test` pass; `quick_validate.py skills/finalise` passes; inline `cases` plans still run.

### Key Features Implemented

- **Transcript extraction**: `agent-reply-block.js` takes the last fenced block of a subagent's final reply, and refuses a missing, empty, ambiguous or entity-escaped one.
- **`cases_file` route**: a plan can name a committed cases file, copied byte for byte and confined to the work-item directory.
- **Reuse check**: a prior plan is reused only when its cases-file hashes and engine paths are unchanged.

---

## Technical Details

### Files Modified/Created

- `shared/resources/agent-reply-block.js` - new extractor
- `shared/resources/security-probe-plan.mjs` - `cases_file`, entity refusal, `reuse`
- `shared/resources/finalise-rerun-scope.js` - `extract` and `merge --sha256`
- `skills/finalise/SKILL.md` - Steps 3b.1 and 3c use the new route
- `shared/resources/tests/` - tests for each of the above

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None

---

## Testing & Quality Assurance

- **Tests:** 41 across the three related test files; the fast gate runs 7999 tests.
- **QA:** four cycles (FAIL 70, CONCERNS 90, PASS 100, PASS 100); two PR reviews, both APPROVE.
- **Mutation proofs:** every new refusal has a revert-and-red proof in the QA reports; one (M1a) exposed an untested guard, now covered.

---

## Security & Compliance

- **Security:** PASS. Ten hostile and legitimate names were run against the confinement check; none reproduced.
- **Compliance:** not applicable (internal tooling).

---

## Notes

- **Owner recommendation:** consider requiring the `*.security.cases.json` name pattern for `cases_file`.
- Task 286 stays queued separately.
