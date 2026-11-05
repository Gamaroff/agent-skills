---
id: task.262
title: "Untrusted-content path bound hardening"
type: task
description: "Close the four advisory gaps left by task 261: CRLF in the fence regex, hostile-path assertions that do not name the guard, duplicated block extraction, and a path bound that hard-codes docs/ and ignores symlinks."
tags: [guardrails, prompt-injection, lint, hardening]
category: other
status: planned
priority: Low
created: 2026-11-05
updated: 2026-11-05
estimated_effort_hours: 4
---

# Technical Task: Untrusted-content path bound hardening

**Status:** Planned

---

## 1. Overview

Task 261 added a shared untrusted-content rule, a `docs/`-bounded check on a path derived from an issue body, and a lint test. Its QA gate 3 and its DoD left four advisory items open. This task closes them in one shippable unit, because they all touch the same test file and the same three bound blocks.

**Scope**: the fence regex and the bound tests in `tests/untrusted-content-rule.test.js`, and the "Bound the derived path" block at `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md` and `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`.

---

## 2. Motivation

### Current Problems

1. **CRLF is a latent miss.** The fence regex in `markerLines` (`tests/untrusted-content-rule.test.js`, the `l.match(/^\s*(`{3,}|~{3,})(.*)$/)` line) ends in `(.*)$`. `.` does not match `\r`, but `$` without the `m` flag only matches at the end of the string, and each line is split on `\n`, so a line ending `\r` leaves the capture holding the `\r`. A closing fence written ```` ```\r ```` is then read as a fence with trailing text, not as a close. A CRLF checkout would desynchronise fence tracking.
2. **The hostile path cases cannot tell the two guards apart.** The bound has two guards: outside `docs/`, and climbs out with `..`. The hostile test asserts only `assert.match(r.stdout, /HALT/)`, so deleting either guard while the other still fires for that input leaves the test green for many inputs.
3. **The block is extracted twice.** `boundBlock` is called from `runBound` and again from the `BOUND_SITES.map(...)` in the "same block at every site" test.
4. **The bound is a string check on `docs/`.** A custom `PRD_ROOT` outside `docs/` would make `review-story` HALT on a legitimate story path, and a symlink inside `docs/` that points outside the tree passes the string check.

### Benefits of This Task

1. **The fence tracker survives CRLF**, proven by a CRLF control case.
2. **Each guard is held by its own assertion**, proven by deleting one guard and seeing a test go red.
3. **One extraction path** for the bound block, so a change to it is made once.
4. **A bound that follows the configured root and resolves symlinks**, with the legitimate default path still accepted.

---

## 3. Technical Background

### Current Architecture

Every name below was grepped on 2026-11-05 at `develop` `0dce19fb`.

- `markerLines` and its fence regex: `tests/untrusted-content-rule.test.js:98` *(`const f = l.match(/^\s*(`{3,}|~{3,})(.*)$/);`)*.
- `BOUND_SITES`: `tests/untrusted-content-rule.test.js:303`. Its two users: `runBound` and the "same block at every site" test at `:339`.
- `boundBlock` / `BOUND_SLOT` lift the first bash fence under `#### Bound the derived path` and fill the `<derived-path>` slot.
- The hostile test's assertion: `tests/untrusted-content-rule.test.js:366` *(`assert.match(r.stdout, /HALT/);`)*.
- The block's two `case` guards print `HALT: derived path … is outside docs/` and `HALT: derived path … climbs out with ..`.
- `PRD_ROOT` is resolved by `shared/resources/resolve-paths.sh` (default `docs/prd`). Task documents live at the fixed `docs/tasks/`; only stories and epics follow `PRD_ROOT`.

### Target Architecture

- The fence regex captures the info string with `([^\n]*)` and strips a trailing `\r`.
- Each hostile case names the message it expects.
- One helper returns the bound block for a site; both tests use it.
- The block compares the resolved real path with the resolved root. The root is `docs` for a task and `${PRD_ROOT}` when set. The check does not use `realpath -m`, which macOS lacks (the macOS check, task 210, is deferred, so portability is by construction).

**Property to run before it is written down (obs #161).** Phase 4 claims `cd "$(dirname "$p")" && pwd -P` resolves a symlinked directory. Run it on a real symlink in a temp directory before the phase starts.

---

## 4. Scope

### In Scope

✅ The four items in Section 2
✅ The three identical bound blocks and their bundled `references/` copies
✅ Mutation proof for each fix

### Out of Scope

❌ Changing the rule document's wording
❌ New read sites or new citations
❌ PII masking
❌ Any macOS-specific run (task 210 is deferred)

---

## 5. Breaking Changes

None - API stable. Phase 4 narrows what the bound accepts only for a symlink that leaves the tree, and widens it for a configured `PRD_ROOT`. The default `docs/tasks/...` path is accepted before and after; the test for it stays.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.262.plan.untrusted-content-path-bound-hardening.md](task.262.plan.untrusted-content-path-bound-hardening.md)

### Phase 1: CRLF-safe fence tracking

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Dependencies**: none.

- [ ] Change the fence regex to capture `([^\n]*)` and strip a trailing `\r` before the close test
- [ ] Add a control: a CRLF document whose closing fence is ```` ```\r ``` ` still closes, and a read marker after it is found
- [ ] Mutation-prove: revert the regex, confirm the control goes red

### Phase 2: Name the guard in each hostile case

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Dependencies**: none.

- [ ] Replace the single `/HALT/` assertion with a table of `[path, expected message]` pairs
- [ ] Mutation-prove each guard separately: delete the `docs/*` guard and confirm the outside-`docs/` rows go red; delete the `..` guard and confirm the climb rows go red

### Phase 3: One extraction helper

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Dependencies**: Phase 2 (same hunk).

- [ ] Add `boundBlockFor(site)` and use it in `runBound` and the "same block at every site" test
- [ ] Confirm the test count is unchanged and nothing else reads the block another way

### Phase 4: Configured root and symlinks

**Risk**: Medium. **Files**: the three bound blocks and their bundled copies; `tests/untrusted-content-rule.test.js`; `CHANGELOG.md`. **Dependencies**: Phases 2 and 3.

- [ ] Run the symlink-resolution property on a temp symlink (Section 3)
- [ ] Decide and record the root: `docs` for tasks, `${PRD_ROOT:-docs/prd}` for stories (review-story and Step 0 when the document is a story)
- [ ] Resolve the real path of the parent directory with `cd … && pwd -P` and compare with the real path of the root
- [ ] Add behaviour tests: a symlink inside `docs/` pointing outside is a HALT; a configured `PRD_ROOT` path is kept; the default path is kept
- [ ] Re-run the `fence:` probe plan for the three sites; update the cases (`probes_executed` must be above 0)
- [ ] `npm run bundle`, then `npm run bundle:check`
- [ ] Add a `CHANGELOG.md` entry citing task 262

---

## 7. Files Summary

Core Implementation:

1. ✅ `skills/review-task/SKILL.md` - bound block (Phase 4)
2. ✅ `skills/review-story/SKILL.md` - bound block (Phase 4)
3. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` - bound block (Phase 4)

Generated (via `npm run bundle`, never hand-edited):

4. ✅ `skills/*/references/develop-pipeline-step-0-resolve-and-prepare.md` - the copies. Population: `git ls-files 'skills/*/references/develop-pipeline-step-0-resolve-and-prepare.md'`

Tests:

5. ✅ `tests/untrusted-content-rule.test.js` - Phases 1 to 4

Documentation:

6. ✅ `CHANGELOG.md`

---

## 8. Testing Strategy

Unit Tests:

- Scope: the lint test and its bound tests
- Command: `CI=true node --test tests/untrusted-content-rule.test.js`
- Target: all pass; runtime stays under 2 seconds

Integration Tests: `CI=true npm run ci` before push.

Mutation tests (each a recorded revert-and-red): CRLF regex, each of the two guards separately, the symlink check, the configured-root branch.

Security probe: the bound is a rejecting predicate. Re-run the `fence:<doc>#Bound the derived path` probe plan from task 261's DoD (`task.261.dod.1.security.cases.*.json`) with symlink and configured-root cases added.

---

## 9. Success Criteria

### Functional

- [ ] A CRLF document with a closing ```` ```\r ``` ` fence is tracked correctly (control case in the lint test)
- [ ] Each hostile path case asserts its own HALT message
- [ ] Deleting either guard turns a named test red (mutation proof recorded in the QA report)
- [ ] A symlink inside `docs/` that points outside the tree is a HALT
- [ ] A path under a configured `PRD_ROOT` is kept, and the default `docs/tasks/...` path is kept

### Performance

- [ ] The lint test runs in under 2 seconds; the figure and command are recorded in the QA report

### Code Quality

- [ ] `CI=true npm test` passes
- [ ] `npm run validate -- skills/review-task/ skills/review-story/` passes
- [ ] `npm run bundle:check` and `npm run check:generated` are clean

### Migration

- [ ] `CHANGELOG.md` has an entry citing task 262
- [ ] The probe plan is re-run with `probes_executed` above 0, recorded in the DoD

---

## 10. Risk Assessment

HIGH RISK: none.

MEDIUM RISK:

1. **The symlink check halts a legitimate run.**
   - Risk: a repository that symlinks `docs/` or a task directory is refused.
   - Probability: Low. Impact: Medium (a pipeline stops).
   - Mitigation: compare real paths of the parent and the root, so a link that stays inside is kept; a test covers it.
   - Rollback: revert Phase 4 alone.

LOW RISK:

1. **Portability of `pwd -P`.** POSIX, works on Linux and macOS. The macOS run is deferred (task 210).
2. **Three copies of one block drift.** The existing "same block at every site" test holds them equal.

---

## 11. Rollback Plan

Immediate rollback (under 1 hour):

- Triggers: a legitimate pipeline run HALTs on the bound; CI red on `develop` after merge.
- Steps: revert the merge commit; run `npm run bundle`; confirm `npm run bundle:check`.
- Validation: `CI=true node --test tests/untrusted-content-rule.test.js`.

Partial rollback (1-2 hours):

- When: only Phase 4 misbehaves. Revert the three bound blocks and their tests; keep Phases 1 to 3.

Forward fix:

- When: a test-only defect (Phases 1 to 3). Fix forward.

Rollback triggers:

- Critical: a legitimate run is refused by the bound.
- Non-critical: a test wording or helper naming issue.

---

## Progress Tracking

- [ ] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] QA gate PASS

---

## References

- Origin: [task.261.untrusted-content-rule.md](../task.261.untrusted-content-rule/task.261.untrusted-content-rule.md); gate: [task.261.gate.3.untrusted-content-rule.yml](../task.261.untrusted-content-rule/task.261.gate.3.untrusted-content-rule.yml) (recommendations.future CR-1 to CR-3)
- DoD spec challenge: [task.261.dod.1.untrusted-content-rule.md](../task.261.untrusted-content-rule/task.261.dod.1.untrusted-content-rule.md)
- Rule: `shared/resources/untrusted-content-rule.md`

## Notes

- Cut from the task 261 follow-ups; independent of every open task. One shippable unit: the four items share one test file and one block.
- QA artifacts will land beside this file: `task.262.qa.[N].*.md`, `task.262.gate.[N].*.yml`, `task.262.bug.[N].*.md`.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-05 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->
