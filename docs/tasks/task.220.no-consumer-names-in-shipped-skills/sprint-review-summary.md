# Sprint Review Summary - No consumer names in shipped skills

**Story/Task ID:** task.220
**Completed Date:** 2026-10-20
**Completed By:** Lorien Gamaroff
**Pull Request:** [#710](https://github.com/Gamaroff/agent-skills/pull/710)

---

## Summary

This task removed one consumer project's names from every shipped skill and shared resource: its product and repository name, its brand, its Jira key and its Jira host. A guard test now fails CI if any of them comes back.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The guard `tests/no-consumer-names.test.js` walks `skills/` and `shared/`, scans paths and contents, and passes
- [x] The guard was shown red before the edits; the evidence was recorded masked as `path: count`
- [x] The wireframe skill's consumer format profile (`references/html-formats/`) is removed, and SKILL.md links nothing in it
- [x] `npm run ci:fast` passes
- [x] The guard adds under 2 s on the PR head
- [x] `npm run bundle:check` is clean, and no generated `references/` copy was hand-edited
- [x] `npm run validate -- skills/wireframe` passes
- [x] CHANGELOG [Unreleased] records the change, the removed profile and a migration path

### Key Features Implemented

- **Name neutralisation**: comments, prose, examples and fixture values across the shipped skills and shared resources now use generic placeholders (`PROJ-702`, `acme.atlassian.net`).
- **Fixture renames**: ten test fixtures whose filenames carried a consumer name were renamed. The renames are R100, so content is unchanged.
- **Guard test**: case-insensitive, letter-bounded patterns over paths and contents, a 500-file non-vacuity floor, and masked evidence on failure.
- **Wireframe**: the skill ships no format profile. A project that converts one format repeatedly keeps its own profile outside `.agents/skills/`.

---

## Technical Details

### Files Modified/Created

- `tests/no-consumer-names.test.js` - new guard (4 tests)
- `shared/resources/*` - comment and prose edits, then re-bundled into 126 `skills/*/references/` copies
- `skills/wireframe/SKILL.md` - step 2 rewritten; profile file deleted; 2 profile tests removed
- `skills/finalise/SKILL.md`, `skills/review-pr/SKILL.md` - provenance notes and examples neutralised
- `CHANGELOG.md` - Added entry and a BREAKING Removed entry

### Architecture/Design Decisions

The edits were made at the `shared/resources/` source and regenerated with `npm run bundle`, never by hand in the bundled copies. A project-extension mechanism for wireframe format profiles was considered and declined.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** The wireframe skill no longer ships a format profile. A consumer that used it must copy it out before `setup-consumer.sh --update`, which replaces the skill directory.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 4 guard tests in `tests/no-consumer-names.test.js`; 5 mutation proofs in QA cycle 1
- **Test Coverage:** per-file pass counts unchanged, except wireframe (44 → 42, the 2 removed profile tests); full run 6007 tests, 0 fail

### Code Review

- **Reviewers:** QA cycle 1 code reviewer (0 bugs, 1 cleanup); Step 5c PR conformance review (0 findings)
- **Approval Status:** ✅ Approved (QA gate PASS 100/100; review-pr APPROVE)
- **Review Comments Addressed:** the one cleanup (CR-1) was carried to future work

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] No secrets or credentials introduced
- [x] No new unsafe patterns (one fixed-argument `execFileSync("git", …)` in a test)
- [x] No dependencies added
- [x] Not a boundary deliverable: every changed line in a shipped script is a comment

### Compliance Review

✅ **Compliance Requirements Met**

- [x] GDPR, PCI-DSS, WCAG, HIPAA: not applicable (internal refactor, no personal data)

---

## Documentation

### Updated Documentation

- [x] CHANGELOG [Unreleased] entry with migration note
- [x] wireframe SKILL.md step 2

### Documentation Links

- `docs/tasks/task.220.no-consumer-names-in-shipped-skills/task.220.dod.1.no-consumer-names-in-shipped-skills.md`

---

## Demo Notes

### How to Verify

1. Run `command node --test tests/no-consumer-names.test.js` and see 4/4 pass.
2. Add a consumer name to any file under `skills/` and re-run the test; it fails and names the file.
3. Run `npm run bundle:check` and see 0 problems.

---

## Impact & Value

### User Impact

Every consumer installs skills that are neutral to any one project, with no other project's names, keys or hosts in their prompts and examples.

### Technical Impact

The guard makes the neutrality permanent: a reintroduced name fails CI, in a path or in content.

---

## Known Limitations & Future Work

### Current Limitations

- The guard exempts all of `pipeline-answers-generic.test.mjs`, and that file keeps its own name list (CR-1).
- Residue outside the shipped tree: one line in a reference doc and nine lines in one test.

### Suggested Follow-Up Stories

- Share one name list between the guard and `pipeline-answers-generic.test.mjs`.

---

## Metrics _(if applicable)_

- **Time to Complete:** 1 day
- **Lines of Code Changed:** +1354 / -825 (167 files, 126 of them generated copies)

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
