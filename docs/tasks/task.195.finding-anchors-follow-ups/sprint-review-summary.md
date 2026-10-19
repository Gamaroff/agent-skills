# Sprint Review Summary - Finding-anchors follow-ups

**Story/Task ID:** task.195
**Completed Date:** 2026-10-19
**Completed By:** Lorien Gamaroff (pipeline: `/develop-next` → `/develop-task --defaults`)
**Pull Request:** [#695](https://github.com/Gamaroff/agent-skills/pull/695)

---

## Summary

This task closes the seven advisory items task.194 left open, so a code-review finding's location is never reported as verified when it was not checked. It covers the anchor checker, the four review dispatchers that run it, and the two places that post findings inline.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-1: a code `file_line` that is not `path:line` reads `unparseable`, a malformed verdict. A conformance `ref` still reads `no-line`.
- [x] SC-2: `--rev` with a `--root` that is absent from that commit exits `bad-root`.
- [x] SC-3: the new `--index` flag reads staged content for `--staged` reviews. `--index` combined with `--rev` is a usage error.
- [x] SC-4: all four dispatchers (review-pr, review-code, qa-task, qa-story) decide on the checker's JSON `reason`. A checker that cannot load HALTs as "not runnable" and is never read as "malformed, continue".
- [x] SC-5: both `--inline` blocks refuse un-annotated or non-findings input, and never post `[]`.
- [x] SC-6: `/review-pr` Step 6 passes `--rev` bound to the PR head on GitHub and on Bitbucket.
- [x] SC-7: the develop-bug verify loop records a malformed anchor as `(location unverified: …)`.
- [x] SC-8: each distinct path is still read once per run.
- [x] SC-9–SC-11: npm test, bundle:check and validate pass; mutation proofs are recorded; the CHANGELOG entry is written.

### Key Features Implemented

- **`unparseable` verdict**: a code anchor the checker cannot parse is malformed, not silently clean.
- **One field reader (`fieldOf`)**: it decides `file_line`, `ref` and `line_text` in one place. A non-string value is never stringified into a verified anchor.
- **Reason-deciding dispatchers**: an exit code of 1 no longer stands for both "malformed" and "could not run".
- **`--inline` guards**: these require a findings array for each lens present and a string `anchor_check` on every finding. A refusal leaves no scratch file behind.

---

## Technical Details

### Files Modified/Created

- `shared/resources/finding-anchors.js`: the `unparseable` verdict, the root-in-rev check, `--index`, and `fieldOf`. It is bundled into four skills.
- `skills/{review-pr,review-code,qa-task,qa-story}/SKILL.md`: the checker blocks decide on `reason`. The review-pr and review-code `--inline` guards are rewritten.
- `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`: adds the `(location unverified: …)` rule.
- Tests: `shared/resources/tests/finding-anchors.test.mjs`, `evals/shared/tests/finding-anchors-{blocks,callers}.test.mjs`, `skills/review-pr/tests/review-pr.test.js`, `skills/review-code/tests/review-code.test.js`.
- `CHANGELOG.md`: a `[Unreleased]` › Fixed entry.

### Architecture/Design Decisions

QA cycles 3 and 4 each found another field type the checker read leniently. Cycle 4's fix applied the consolidate move: one allow-list reader replaced the per-field patches, so the next field cannot drift.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. Verdicts for string inputs match `develop`.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 37 engine tests, plus block, caller and guard suites. The fast gate ran 5968 tests with 0 failures.
- **Mutation proofs:** each QA fix was proven by reverting the behaviour and seeing a test go red.
- **Security probes:** 57 candidates against two boundary controls, with 0 reproduced and 0 escapes.

### Code Review

- **Reviewers:** the automated code reviewer ran every QA cycle with `code_review_blocking=true`, and `/review-pr` ran at 5c.
- **Approval Status:** ✅ APPROVE (`task.195.pr-review.2.finding-anchors-follow-ups.md`)
- **Review Comments Addressed:** all blocking findings fixed across 5 QA cycles. Advisory items are carried in gate 5.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: malformed and non-string finding fields are refused or read as malformed
- [x] No shell exec: git runs through `execFileSync` with an argv array
- [x] Path containment: reviewer paths are checked against `--root` before any read
- [x] No new dependencies

### Compliance Review

Not applicable. This is internal tooling, with no personal, payment or health data and no UI.

---

## Documentation

### Updated Documentation

- [x] Skill documentation updated for the four dispatchers and the develop-bug loop
- [x] CHANGELOG `[Unreleased]` entry

### Documentation Links

- DoD log: `task.195.dod.2.finding-anchors-follow-ups.md`
- QA report: `task.195.qa.5.finding-anchors-follow-ups.md`

---

## Demo Notes

### How to Verify

1. `command node shared/resources/finding-anchors.js --findings-file f.json --root . --json`, with a code finding whose `file_line` is `a.js` (no line number).
2. Expect `reason: malformed-anchors` and the finding annotated `unparseable`.
3. Repeat with `"line_text": ["first line"]`. Expect `text-mismatch`, not `ok`.

---

## Impact & Value

### User Impact

Inline review comments are anchored only where the location was actually verified, and a broken checker stops the review instead of passing it.

### Technical Impact

The checker has one field reader, and every dispatcher decides on a named reason rather than an overloaded exit code.

---

## Known Limitations & Future Work

### Current Limitations

- Advisory items carried in gate 5: CR-2 (a reviewer-supplied `anchor_check` passes the guards), CR-3 (a non-object conformance finding is not annotated), CR-4 (the selector's colon split), a leading-whitespace `file_line` reaching the selector untrimmed, the null-finding crash, `--staged --fix`, and unbound variables in review-code `--inline`.

### Suggested Follow-Up Stories

- One follow-up task for the gate 5 advisory items above.

---

## Metrics

- **Time to Complete:** 1 day (2026-10-19), 5 QA cycles and 2 finalise runs
- **Lines of Code Changed:** +6936 / -358 across 55 files. Most of this is QA and DoD records plus the four bundled copies.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
