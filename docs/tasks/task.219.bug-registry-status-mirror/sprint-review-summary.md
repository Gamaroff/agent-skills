# Sprint Review Summary - General-bug registry status: one writer at every transition

**Story/Task ID:** task.219
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff
**Pull Request:** [#708](https://github.com/Gamaroff/agent-skills/pull/708)

---

## Summary

A general bug's status in `docs/bugs/bug-registry.md` now has one tested writer, `registry-tick.js --bug-status`. Every bug status transition calls it, including the two `/qa-fix` makes after a reopen, which used to leave the registry row stale.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] AC1: `--bug-status` on a `reopened` row with a `ready-for-qa` file changes the Status cell only and answers `mirrored`
- [x] AC2: a registry in the emoji vocabulary gets `🔍 Ready for QA`
- [x] AC3: a task bug answers `not-a-general-bug`; a bug run without the flag still answers `not-a-task`
- [x] AC4: `/qa-fix`'s In Progress and Ready for QA steps call the CLI
- [x] AC5: the drift test reads the label map through `registry-tick.js`'s exports; there is no second map
- [x] AC6: no develop-bug step hand-edits the Status cell
- [x] AC7: `bug-registry-drift.test.mjs` passes, and goes red when a row disagrees with its file
- [x] PERF1, PERF2, CQ1 to CQ3, MIG1, MIG2

### Key Features Implemented

- **`--bug-status` mode**: reads the bug file's `status:`, picks the registry's own vocabulary (tokens or emoji labels), and rewrites one cell with one registry read and at most one write
- **One writer at every transition**: develop-bug Steps 3, 5-6 and 7 and `/qa-fix` call the CLI instead of editing the row by hand
- **Drift guard**: `evals/shared/tests/bug-registry-drift.test.mjs` fails CI when a registry row and its bug file disagree

---

## Technical Details

### Files Modified/Created

- `shared/resources/registry-tick.js` - the `--bug-status` mode, `BUG_STATUS_LABELS` and `normaliseBugRegistryStatus` exports
- `skills/{qa-fix,develop-bug,finalise,develop-next,develop-batch}/references/registry-tick.js` - bundled copies
- `skills/qa-fix/SKILL.md`, `skills/develop-bug/SKILL.md` and its Step 3, 5-6 and 7 docs - call sites
- `shared/resources/tests/registry-tick.test.mjs` - mode tests, including the I/O-count test for PERF1
- `skills/develop-bug/tests/develop-bug.test.js` - call-site and no-hand-edit assertions
- `evals/shared/tests/bug-registry-drift.test.mjs` - new drift test
- `CHANGELOG.md` - `[Unreleased]` entry

### Architecture/Design Decisions

The status write belongs in the writer, not in prose: one CLI owns the mapping and the vocabulary choice, and every step calls it. The classifier refuses anything that is not a general bug (`bug.{N}.…` with no other type), so a task or story bug cannot write a registry row.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. `finalise --bug` still answers `not-a-task`

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** registry-tick 69/69, develop-bug 24/24, bug-registry-drift 4/4
- **Integration Tests:** the CLI runs as a child process in every mode test
- **Test Coverage:** every success criterion has a per-PR test (MIG1 is a documentation criterion); every change was mutation-proven

### Code Review

- **Reviewers:** QA cycles 1 and 2 (code lens, whole-branch refute pass); Step 5c `/review-pr` (APPROVE, 0 findings)
- **Approval Status:** ✅ Approved (single-maintainer repo; no formal reviews required)
- **Review Comments Addressed:** 0 gating findings; 5 low advisory recommendations carried forward

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Input validation: the general-bug classifier held under 19 executed probes (15 hostile, 4 legitimate), 0 reproduced, 0 escaped
- [x] No shell or eval in production code
- [x] No sensitive data exposure
- [x] No dependency change

### Compliance Review

✅ **Compliance Requirements Met**

- [x] Not applicable: internal skill tooling with no personal, payment, UI or health data

---

## Documentation

### Updated Documentation

- [x] Skill call-site docs (qa-fix, develop-bug)
- [x] CLI header documentation for `--bug-status`
- [x] CHANGELOG `[Unreleased]`

### Documentation Links

- [Task document](./task.219.bug-registry-status-mirror.md)
- [DoD verification](./task.219.dod.2.bug-registry-status-mirror.md)

---

## Demo Notes

### How to Verify

1. Pick a general bug with a row in `docs/bugs/bug-registry.md` and set its frontmatter `status:` to `ready-for-qa`.
2. Run `node shared/resources/registry-tick.js --bug-status --file docs/bugs/<bug-dir>/<bug>.md --json`.
3. The answer is `mirrored`, and only that row's Status cell changes. A second run answers `already`.

---

## Impact & Value

### User Impact

The bug registry stops lying after a reopen: a reader of the registry sees the status the bug actually has.

### Technical Impact

Four prose instructions become one tested CLI call, and a drift test catches any row that falls out of step.

---

## Known Limitations & Future Work

### Current Limitations

- A `select-next.mjs` older than the `BUG_LIFECYCLE_STATUSES` export throws instead of answering `engine-unavailable` (gate 2 CR-1, low)

### Suggested Follow-Up Stories

- Gate 2 CR-1 and CR-2; gate 1 CR-1 to CR-3 (all advisory)

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day
- **Lines of Code Changed:** +5,783 / -275 across 31 files (most of it bundled copies and pipeline records)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
