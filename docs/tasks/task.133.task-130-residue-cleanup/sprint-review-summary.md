# Sprint Review Summary - Residue of task.130's seven QA cycles: eleven advisory findings, grouped by file

**Story/Task ID:** task.133
**Epic:** _(standalone task)_
**Completed Date:** 2026-09-30
**Completed By:** develop-task pipeline (Claude Code)
**Pull Request:** [#528](https://github.com/Gamaroff/agent-skills/pull/528)

---

## Summary

Closes the eleven advisory findings task.130 carried out of its QA loop and Step 5c review, grouped by the file each touches. The largest addition is `change-log.js --check-append-only`, a cross-commit check that names any Change Log row a document lost since a base revision. It replaces a writer-side guard that the review showed could never fire.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] SC-F1 — the no-overwrite lock scenario is falsifiable: it goes red under an unconditional directory overwrite
- [x] SC-F2 — a bystander legacy snapshot beside a matched claim restores quietly; legacy-only still advises once
- [x] SC-F3 — the delete block names three outcomes (unparsable, directory-less, unrecognised label) and deletes nothing
- [x] SC-F4a — detector Step 1 states the legacy-refusal and provenance rules, citing `choose_candidate()`
- [x] SC-F4b — the candidate listing is pinned as glob-safe; a `bash -O failglob` arm runs it on every PR
- [x] SC-F5 — `--check-append-only` reports the six fdba78d9 rows; nothing for an append or a migration; exit 1/0
- [x] SC-F6 — every lint `2)` arm cites the one step-8 sentence that names every `usage(` cause
- [x] SC-P1, SC-Q1, SC-Q2, SC-M1, SC-M2 — resume cost unchanged; CI green; mutation proofs recorded; CHANGELOG and task.130 Deferred Work annotated

### Key Features Implemented

- **Append-only check** (`change-log.js`): `rowsDropped` + `--check-append-only --file <doc> --against <rev>`. An empty `--against` is a usage error, not a clean log. It is wired into the 5c TRAIL lens (`pr-conformance-prompt.md`).
- **Lock script** (`advance-pipeline-lock.sh`): the legacy advice prints only when nothing restores, and the `--accept-legacy` stamp is stated wherever the contract is mirrored.
- **Resume contract / detector**: three named HALTs in the delete block, the candidate rule stated once, and conditional `--restore` citations at five sites.

---

## Technical Details

### Files Modified/Created

- `shared/resources/change-log.js` (+ `tests/change-log.test.mjs` J1–J5, two fixtures) — append-only check
- `shared/resources/advance-pipeline-lock.sh` (+ `.test.sh`), `grant-qa-cycles.sh` — advice placement, stamp note
- `shared/resources/develop-pipeline-resume-contract.md`, `pipeline-resume-detector-prompt.md`, `develop-pipeline-step-{0,8}-*.md`, `develop-pipeline-pause.md`, `pr-conformance-prompt.md`
- `skills/develop-{task,story,bug}/SKILL.md` — Step 0-lock paragraphs made conditional
- New tests: `detector-candidate-rule.test.mjs`, `who-restores-single-statement.test.mjs`; extended `stale-snapshot-delete`, `report-lint-call-sites`
- `CHANGELOG.md`; 69 bundled `skills/*/references/` copies

### Architecture/Design Decisions

- The review rescoped Phase 5 after running the code. `upsertChangeLog` already keeps every row, and the six lost rows came from a hand edit. A throw in the writer would never have fired, so the check compares revisions instead.
- The Phase 3 listing was already `find`-based since task.137, so it got a test rather than a rewrite.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

### Test Coverage

- **Unit/suite tests:** 2 new suites + 4 extended; CI `npm test` 4413 pass / 0 fail at `c64a18cd`
- **Mutation proofs:** 15 in the implementation phases, 5 in QA cycle 2, 1 for the failglob arm
- **QA:** 3 cycles (FAIL 70 → CONCERNS 70 → PASS 90); 4 bugs filed and closed

### Code Review

- **Reviewers:** Step 5c `/review-pr` (CONCERNS, non-blocking); no human review (single-maintainer repo)
- **Approval Status:** CI 5/5 green; no formal review decision required
- **Review Comments Addressed:** the 5c medium (TRAIL reads the working tree) is recorded as advisory

---

## Security & Compliance

### Security Review

✅ **Security Review Completed — accepted by recorded human override**

- [x] No hardcoded secrets; `git show` runs through `execFileSync` with an argv array and no shell
- [x] `choose_candidate()`: the probe engine has no entry form for a flag + positional shell script, so it is recorded as unverifiable. The override rests on the per-PR tests and a §5.1 by-hand probe (`task.133.dod.security.by-hand-probe.md`: bash 48/48, zsh 47/48).
- [x] The one zsh-only NUL finding predates this task and is filed as bug 17

### Compliance Review

✅ **Not applicable** — internal pipeline tooling; no personal data, payments, UI or health data

---

## Documentation

### Updated Documentation

- [x] CHANGELOG [Unreleased] Added + Fixed entries (task 133)
- [x] Skill and shared-resource docs; bundled copies regenerated
- [ ] `document-change-log.md` does not yet describe `--check-append-only` (non-blocking follow-up)

---

## Demo Notes

### How to Verify

1. `command node shared/resources/change-log.js --check-append-only --file <task doc> --against origin/develop` → `ok … no Change Log row lost`
2. Hand-delete a row from a committed Change Log and re-run → exit 1 `rows-dropped`, naming the row
3. `command node --test shared/resources/tests/detector-candidate-rule.test.mjs` → C runs under bash, bash-failglob and (when installed) zsh

---

## Impact & Value

### Technical Impact

A Change Log row lost to a hand edit is now caught mechanically, and the resume path's rules are each stated once with a test at every site.

---

## Known Limitations & Future Work

### Current Limitations

- The zsh arm of test C still runs only where zsh is installed. The failglob arm is the per-PR guard.
- The 5c TRAIL check reads the working tree, so a standalone review of a PR that isn't checked out compares the wrong revision (5c advisory).

### Suggested Follow-Up Stories

- Bug 17: refuse a control character in `task_or_story_directory` before `canon()`
- Probe engine: an argv template for shell scripts, so `choose_candidate()` can be probed (obs #231)
- Document `--check-append-only` in `document-change-log.md`

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
