# Sprint Review Summary - Probe expected.absent takes bare names; the rule doc says paths

**Story/Task ID:** task.232
**Completed Date:** 2026-10-25
**Completed By:** Lorien Gamaroff (develop-task pipeline)
**Pull Request:** [#748](https://github.com/Gamaroff/agent-skills/pull/748)

---

## Summary

Before this task, a security-probe case could only assert that a bare name was absent, though the rule doc said paths. Now `expected.absent` takes nested paths inside the case directory, and a new `expected.removed` asserts that a cleanup control deleted what the fixture created.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] `expectedProblem` accepts relative paths inside the case directory for `absent` and `removed`, and refuses `..`, absolute paths, `.` in any spelling, empty strings and NUL.
- [x] A nested `absent` side effect is caught as a mismatch on all five forms (`shell:`, `shell-fn:`, `cli:`, `shell-argv:`, `fence:`).
- [x] An `absent` path the fixture creates, or an ancestor of one, is declined on all five forms.
- [x] `removed`: a delete passes, a leftover reads `"<rel> was not removed"`, and a path the fixture does not create is declined, including one that differs only by case.
- [x] A path whose ancestor resolves outside the case directory is a mismatch and is never read through. An unreadable path is a mismatch too, never a probe crash.
- [x] task.227's two cleanup cases, rewritten with `removed`, are executed and accepted under every shell.
- [x] Every runner routes through one helper, `pathAssertionProblem`, proved by mutation on all five forms.
- [x] `npm run ci` (with `.agents/skills` moved aside) and `bundle:check` pass.
- [x] The four case-author docs and the CHANGELOG state the grammar and `removed`.

### Key Features Implemented

- **Case-path grammar**: `isCasePath` and `caseKey` (both exported) define one key for every made/absent/removed comparison. A trailing `/` is ignored.
- **`expected.removed`**: asserts a cleanup, scored on every form.
- **Contained reads**: `casePathState` resolves the parent by realpath and checks the leaf with `lstat`, so an outward symlink is reported, never followed.
- **Robust teardown**: `removeSandbox` restores permissions before removing the sandbox, so a case that leaves a mode-000 directory no longer crashes the run.

---

## Technical Details

### Files Modified/Created

- `shared/resources/security-probe.mjs` — grammar, shared helper, contained path state, teardown (266 lines changed)
- `shared/resources/tests/security-probe.test.mjs` — +644 lines of tests (265 tests in the file)
- `shared/resources/tests/fixtures/security-probe/` — 7 new fixtures (nested writers, removers, a symlink-out, a CLI)
- `shared/resources/probe-boundary-rule.md`, `security-input-corpus.md`, `finalise-dod-security-prompt.md`, `security-review-prompt.md` — case-author docs
- `CHANGELOG.md` — Added and Changed entries
- Bundled copies in `skills/{finalise,qa-story,qa-task,review-security}/references/`

### Architecture/Design Decisions

One helper owns every path-assertion rule, so no runner can drift from the others. `removed` is matched exactly (not case-folded), because a cleanup deletes the name it was given.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None for existing cases. Bare names stay valid; `shell:`/`shell-fn:` case-folding is narrowed as recorded in the CHANGELOG.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 265 tests in `shared/resources/tests/security-probe.test.mjs`
- **Full suite:** `npm run ci` 6339 tests, 0 failed
- **Test Coverage:** every rule mutation-proved (M1–M6 at implementation; Q4, Q6, F1, F2 during QA)

### Code Review

- **Reviewers:** QA code-review lens each cycle; Step 5c `/review-pr` conformance lens
- **Approval Status:** ✅ APPROVE (no human review required on this repo)
- **Review Comments Addressed:** 7 bugs filed across QA cycles 1–2, all closed; 4 low advisory findings left as follow-ups

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] The `isCasePath` boundary probed by `/finalise`: 31 executed, 0 reproduced, 0 escapes
- [x] No secrets or unsafe patterns added
- [x] No new dependencies

### Compliance Review

✅ **Compliance Requirements Met**

- [x] Not applicable: an internal test engine with no PII, payment, UI or health data

---

## Documentation

### Updated Documentation

- [x] `probe-boundary-rule.md` §5 — the grammar, `removed`, the decline rules
- [x] `security-input-corpus.md` — the expected-shape fields
- [x] Both security prompts — how to assert a side effect and a cleanup
- [x] CHANGELOG `[Unreleased]`

### Documentation Links

- [`shared/resources/probe-boundary-rule.md`](../../../shared/resources/probe-boundary-rule.md)

---

## Demo Notes

### How to Verify

1. `command node --test shared/resources/tests/security-probe.test.mjs`
2. Write a case with `expected: { absent: ["sub/marker"] }` against a script that creates `sub/marker`.
3. The probe reports `sub/marker was created`. A case with `removed: ["marker"]` against a script that leaves it reports `marker was not removed`.

---

## Impact & Value

### User Impact

Case authors can assert nested side effects and cleanups. task.227's two cleanup cases were declined before; now they are executed and accepted.

### Technical Impact

The doc and the engine now agree, and five copies of the assertion rules are one helper.

---

## Known Limitations & Future Work

### Current Limitations

- The teardown's permission walk can hit ENAMETOOLONG past PATH_MAX (no regression).
- `chmodSync` could follow a symlink swapped in mid-walk by a still-running process (low confidence).

### Suggested Follow-Up Stories

- Reap each case's process group before the path assertions are read (pre-existing).
- Make the permission walk best-effort, and harden the QA2-1 test (assert no sandbox remains; `t.skip` under root).

---

## Metrics _(if applicable)_

- **Time to Complete:** 2 days (2026-10-24 → 2026-10-25)
- **Lines of Code Changed:** +3744 / −482 across 49 files (including bundled copies and QA artefacts)
- **QA Cycles:** 3

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done and is ready for Sprint Review presentation._
