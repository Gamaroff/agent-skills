# Sprint Review Summary - Review checks for plan shapes

**Story/Task ID:** task.187
**Completed Date:** 2026-10-07
**Completed By:** develop-task pipeline (run 1)
**Pull Request:** [#593](https://github.com/Gamaroff/agent-skills/pull/593)

---

## Summary

`/review-task` and `/review-story` now check nine plan shapes that each passed review on a real task
and then failed later, in QA or at finalise. A new guard test fails whenever a tracked test file is
not reached by any `npm test` entry.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] review-task Step 3 checks 15–20, each with a trigger, a worked example from its incident and Important severity
- [x] review-story Step 4 checks 11–16 (the same six, renumbered)
- [x] Not-applicable lines on the three checks that assume this repository's layout, so they read correctly in a consumer project
- [x] review-task Step 6: a control case for self-confirming evidence; prose-in-an-executable-block and CI-platform criteria
- [x] review-task Step 7 and review-story Step 5: a guard exemption needs a differential oracle and is at least Medium
- [x] Pattern lines, Detection Rules, Questions to Collect and Issues to Flag at both sites
- [x] `tests/test-runner-reach.test.js` — every tracked test file is reached by `npm test`
- [x] `tests/review-plan-shape-checks.test.js` — every new check is present at both sites
- [x] CHANGELOG entry

### Key Features Implemented

- **Six new plan checks**: removed-literal test sweep, other writers in a replaced region, identity over a shell command string, test file reached by the runner, reconstruction states for a resume rule, a site list carries its grep.
- **Test-reach guard**: parses `package.json` `scripts.test` (quoted `node --test` globs and `bash` entries) and fails on any tracked suite that no entry reaches. It reaches 227 suites today.

---

## Technical Details

### Files Modified/Created

- `skills/review-task/SKILL.md` — Step 3 checks 15–20, Step 6 / Step 7 additions
- `skills/review-story/SKILL.md` — Step 4 checks 11–16, Step 5 additions, checks 10–11
- `skills/review-story/references/finalise-dod-ac-prompt.md` — bundled copy (closure +1)
- `tests/test-runner-reach.test.js` — new reach guard
- `tests/review-plan-shape-checks.test.js` — new presence suite
- `CHANGELOG.md` — `[Unreleased]` entry

### Architecture/Design Decisions

The checks are written once in review-task and ported to review-story by renumbering, so the two
sites share one text. The presence test checks that each rule is stated, not that a reviewer applies
it; no CI layer exercises reviewer behaviour.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None — reviews may raise new Important findings, which is the intent

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 35 cases (31 presence, 4 reach), all mutation-proven
- **QA:** 1 cycle, gate PASS 100/100
- **CI:** green on PR #593 (link-check, shellcheck, test, validate)

### Code Review

- **Reviewers:** `/review-pr` Step 5c (conformance + code lenses); the repository requires no human reviewers
- **Approval Status:** ✅ APPROVE
- **Review Comments Addressed:** 10 LOW advisory findings routed to follow-up; none blocking

---

## Security & Compliance

✅ **Security Review Completed** — no secrets, no unsafe patterns, no boundary deliverable.
⚠️ **Compliance** — not applicable (prose and tests only).

---

## Known Limitations and Future Work

- Shipped prose in checks 18/19 names files that exist only in this repository (QA CR-1, PR review CR-1); review-story check 10 links to review-task, which is a dead link in a single-skill install (QA CR-3).
- The reach guard reads committed files only, and it drops non-ASCII paths without `git ls-files -z` (QA CR-2; security note).
- Test-helper hardening: per-check keywords, `citingItemOf` reuse, glob edge cases, bounding item assertions (QA CR-4..CR-7, PR review CR-2..CR-3).
