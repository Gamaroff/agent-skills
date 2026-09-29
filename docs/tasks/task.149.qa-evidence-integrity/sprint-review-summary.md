# Sprint Review Summary - QA evidence integrity: qa-task/qa-story claims that no check reads back

**Story/Task ID:** task.149
**Completed Date:** 2026-09-26
**Completed By:** Claude (develop-task pipeline, via develop-next)
**Pull Request:** [#493](https://github.com/Gamaroff/agent-skills/pull/493)

---

## Summary

The QA skills recorded four claims that no check ever read back. Each one now has a check that
runs: seeding a path-addressed directory for snippet execution, exporting and probing an
unexported predicate, running the validation commands the standards name, and reading a document's
links and `updated:` back after QA edits it.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `qa-execute-snippets.mjs --copy-as SRC:DEST` seeds a directory at the path a block addresses. It refuses any DEST that is absolute, escaping, symlinked or already present, and leaves no temp files behind (obs #143)
- [x] An unexported predicate reports `entry-not-probeable … export it`, and is never recorded as `boundary: false` (obs #156)
- [x] qa-task Step 4 and qa-story Phase 4 run the validation commands the coding standards name (obs #163)
- [x] qa-task Step 12b and qa-story item 3e read the document's claims back with `qa-read-back.js`, which decides: exit 0 clean, 1 halt, 2 could not look (obs #164)
- [x] `doc-links.js` labels each broken link with a state; `change-log.js --check-updated` checks `updated:` against the newest row
- [x] A section-scoped population test covers all eleven prose sites; every new assertion is mutation-proved

### Key Features Implemented

- **`qa-read-back.js`**: one tested script replaces a fenced block that five QA cycles found gaps in
- **`qa-cycle.sh --path gate|qa`**: names the current cycle's gate and QA report with the same grammar that counts the cycle
- **`--copy-as` containment**: fresh-path seeding only, with no merge and no symlink traversal

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - `--copy-as`, `isWithin`
- `shared/resources/security-probe.mjs` - absent-export detail
- `shared/resources/doc-links.js` - per-link `state`
- `shared/resources/change-log.js` - `checkUpdatedCoherence`, `--check-updated`
- `shared/resources/qa-read-back.js` - new
- `shared/resources/qa-cycle.sh` - `--path`
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/create-task/SKILL.md` and the task template - prose sites
- Tests: `qa-execute-snippets`, `security-probe`, `doc-links`, `change-log`, `qa-read-back` (shared), plus `tests/qa-evidence-integrity.test.js`, `tests/qa-read-back-block.test.js`, `tests/qa-cycle.test.js`, `tests/work-item-artifact-naming.test.js`

### Architecture/Design Decisions

- Four QA cycles failed to close the read-back as prose, so it became one script tested directly (cycle 4).
- The gate-file grammar drifted three times as a second copy, so it was consolidated into `qa-cycle.sh --path` (cycle 7).
- The script's exit-2 contract was narrowed to "the run could not complete" instead of chasing every per-link state (cycle 6).

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. `--copy`, the doc-links markers and `qa-cycle.sh`'s no-mode output are unchanged.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** full suite 4238 (4237 pass, 0 fail, 1 skipped). CI 5/5 green.
- **Boundary probes:** 84 executed across 4 controls, 0 reproduced
- **QA:** 8 cycles, final gate PASS 100/100. BUG-1 … BUG-11 were all closed.

### Code Review

- **Reviewers:** Step 5c `/review-pr` (code and conformance lenses). This is a solo-maintained repository with no formal GitHub review.
- **Approval Status:** ⚠️ CONCERNS (advisory). Its documentation findings are closed; CR-1 is carried as a follow-up.

---

## Security & Compliance

### Security Review

✅ **Security Review Completed** — no secrets, no shell interpolation, and four fail-closed boundaries probed (84 candidates, 0 reproduced).

### Compliance Review

✅ **Not applicable** — internal QA tooling; no personal, payment, UI or health data.

---

## Documentation

- [x] CHANGELOG `[Unreleased]` entries (task 149)
- [x] Skill prose: qa-task, qa-story, create-task, probe-boundary-rule, qa-runnable-prose-detection

---

## Demo Notes

### How to Verify

1. `node shared/resources/qa-read-back.js --doc docs/tasks/task.149.qa-evidence-integrity/task.149.qa-evidence-integrity.md` → `ok qa-read-back: …`
2. `bash shared/resources/qa-cycle.sh docs/tasks/task.149.qa-evidence-integrity --path gate` → the gate-8 path
3. `node --test shared/resources/tests/qa-read-back.test.mjs tests/qa-cycle.test.js` → all pass

---

## Impact & Value

### Technical Impact

A QA cycle can no longer post a PR comment that links a report that does not exist, or a Change Log
row dated after `updated:`. Before this change, both defects were caught only by CI after the fact.

---

## Known Limitations & Future Work

### Suggested Follow-Up Stories

- From cycle 2 on, the read-back should require the document to link **this** cycle's gate and report. It currently requires only that they exist (5c CR-1).
- Move the QA skills' `find -name "*.gate.${N}.*.yml"` lookups to `qa-cycle.sh --path` (gate 8).
- Replace `security-probe.mjs`'s bare `startsWith("..")` containment with the shared test. This defect predates the branch.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
