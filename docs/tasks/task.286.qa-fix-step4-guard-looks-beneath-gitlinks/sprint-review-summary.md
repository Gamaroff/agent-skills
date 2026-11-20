# Sprint Review Summary - qa-fix Step 4 guard looks beneath gitlinks

**Story/Task ID:** task.286
**Completed Date:** 2026-11-21
**Pull Request:** [#927](https://github.com/Gamaroff/agent-skills/pull/927)

---

## Summary

The `qa-fix` Step 4 guard no longer reads a directory as clean when a checked-out submodule beneath it holds an untracked file. It also copes with a repository whose top level is `/`, and the refusal of an absolute path through an external symlink is now documented.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A changed directory over a gitlink holding an untracked file is refused in bash and zsh, with and without a trailing slash.
- [x] A changed directory over a clean, checked-out gitlink is admitted.
- [x] The external-symlink route is refused as "could not look" and says so in the skill prose; a scenario holds it.
- [x] The inside test works when `TOP` is `/`.
- [x] Each new clause has a mutant that turns a committed test red (one defensive fallback excepted).
- [x] `npm run validate -- skills/qa-fix/` and `npm run ci:fast` pass; CI is green on the PR head.
- [x] CHANGELOG `[Unreleased]` cites (task 286).
- [x] No performance criterion applies (recorded as not applicable, approved by the owner).

### Key Features Implemented

- **Gitlink look:** the guard lists gitlinks at or beneath each changed directory and checks each for untracked files; a gitlink that is not checked out is refused as "could not look".
- **Root top level:** `TOPP=${TOP%/}` removes the trailing slash before the inside test.
- **External symlink:** documented as refused, held by the existing CR-3 scenario.

---

## Technical Details

### Files Modified/Created

- `skills/qa-fix/SKILL.md` — Step 4 block and prose.
- `tests/qa-fix-step4-guard.test.js` — 47 tests: new admitted and refused gitlink scenarios, four mutants, a `TOP=/` test.
- `CHANGELOG.md` — `[Unreleased]` entry.
- `docs/tasks/task.286.*/` — task, review, QA, gate, DoD and probe records.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Unit tests:** 47 in `tests/qa-fix-step4-guard.test.js`, under bash and zsh.
- **QA gate:** PASS, 95/100. **PR review:** APPROVE.
- **Security probe:** 36 executed, 0 reproduced, 0 escaped.

## Known Limitations and Future Work

- A gitlink nested inside a gitlink is not looked into (pre-existing).
- A non-ASCII gitlink path is refused with the wrong reason (safe side, new with this change); remedy `git -c core.quotePath=false ls-files -s`, plus a non-ASCII admitted scenario.
- The `ls-files -s` failure fallback has no mutant (defensive, held by inspection).
