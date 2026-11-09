# Sprint Review Summary - QA engines stop passing what they cannot see

**Story/Task ID:** task.274
**Completed Date:** 2026-11-09
**Pull Request:** [#863](https://github.com/Gamaroff/agent-skills/pull/863)

---

## Summary

Five QA engine defects fixed: the snippet runner now refuses four write-capable shapes it used to run and cannot confuse an unparseable block with a refused one, the probe record keeps a second control, shared fixtures are copied once, and a status-history row of the wrong width is refused.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] The four base-scan shapes classify as mutating, with controls that stay runnable
- [x] The newly refused blocks in the real docs are listed with their command (17, against develop)
- [x] A second control against one probe entry coexists, and a status-history width mismatch is refused
- [x] Test-suite wall time is within 10% of develop (+1.9%, median of five alternating runs)
- [x] Each fix has a mutation proof
- [x] `bundle --check` reports 0 problems and the suite passes
- [x] The task.205-shape cases file is under 100,000 bytes (8,813)
- [x] An existing committed cases file runs unchanged

### Key Features Implemented

- **Snippet runner**: refuses heredoc-trailing commands, command substitution in double quotes, quoted deny-listed flags, and variable, ANSI-C and continuation-split arguments to deny-listed commands; checks syntax with `-n` before running
- **Probe engine**: keys each record entry by `--name`, adds `--fixture-copy` with realpath containment
- **status-history.js**: refuses a row whose width differs from the table

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - classifier shapes, syntax check
- `shared/resources/security-probe.mjs` - record key, `--name`, `--fixture-copy`
- `shared/resources/status-history.js` - row width check
- `shared/resources/tests/` - tests for each of the above, mutation-proven
- `shared/resources/qa-runnable-prose-detection.md`, `CHANGELOG.md` - the rule restated; 17 bundled copies regenerated

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none

---

## Testing & Quality Assurance

- **Tests:** 8,135 pass, 0 fail on CI; 33 tests added
- **QA:** three gates (FAIL 70, FAIL 80, CONCERNS 90), four bugs found and fixed, 59 DoD probes with none reproduced
- **PR review:** APPROVE

---

## Known Limitations & Future Work

- Five deny-list gaps, identical on develop: a function named after an allow-listed command, the `<>` redirection, `find -fprint0`, sed `e`, `sort --compress-program`. Suggested follow-up: replace the deny-list with an allow-list.
- 17 shell blocks in the tracked docs are now refused (reported as refused, never run). Decide whether to accept the lost coverage or add value tracking.
- A test outside this change (`context-pressure-statusline`) intermittently leaks a temp directory and failed a CI leak check once.

---

**Status:** ✅ **ACCEPTED**

_This task has been verified against the Definition of Done._
