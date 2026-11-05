---
id: task.262
title: "Untrusted-content path bound hardening"
type: task
description: "Close the four advisory gaps left by task 261: CRLF in the fence regex, hostile-path assertions that do not name the guard, duplicated block extraction, and a path bound that hard-codes docs/ and ignores symlinks."
tags: [guardrails, prompt-injection, lint, hardening]
category: other
status: ready-for-review
priority: Low
created: 2026-11-05
updated: 2026-11-05
estimated_effort_hours: 4
---

# Technical Task: Untrusted-content path bound hardening

**Status:** Ready for Review

---

## 1. Overview

Task 261 added a shared untrusted-content rule, a `docs/`-bounded check on a path derived from an issue body, and a lint test. Its QA gate 3 and its DoD left four advisory items open. This task closes them in one shippable unit, because they all touch the same test file and the same three bound blocks.

**Scope**: the fence regex and the bound tests in `tests/untrusted-content-rule.test.js`, and the "Bound the derived path" block at `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md` and `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`.

---

## 2. Motivation

### Current Problems

1. **CRLF is a latent miss.** The fence regex in `markerLines` (`tests/untrusted-content-rule.test.js`, the `l.match(/^\s*(`{3,}|~{3,})(.*)$/)` line) ends in `(.*)$`. Each line is split on `\n`, so a CRLF line keeps its `\r`. In JavaScript `.` does not match `\r` and `$` (no `m` flag) only matches at the end of the string, so the regex **does not match a CRLF fence line at all** (measured: `"```\r".match(...)` is `null`, and so is `"```bash\r"`). A CRLF document therefore never opens a fence. A fenced line that holds a read marker is then judged as prose, and the forbidding-sentence filter (which applies only outside a fence) can drop it. The marker is silently lost, which is the miss.
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

- [x] Change the fence regex to capture `([^\n]*)` and strip a trailing `\r` before the close test
- [x] Add a control: a CRLF document with a fenced block whose body line holds both a read marker and a forbidding sentence (e.g. `# do not ...`). With the fence tracked the line counts as a read, so `markerLines` must return it. A control that only puts a marker *after* a closed fence passes on the old regex too (the fence never opens), so it cannot go red
- [x] Add a second control with LF endings (same text) that must give the same result, so the CRLF case is compared with a known-good case
- [x] Mutation-prove: revert the regex, confirm the CRLF control goes red and the LF control stays green

### Phase 2: Name the guard in each hostile case

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Dependencies**: none.

- [x] Replace the single `/HALT/` assertion with a table of `[path, expected message]` pairs
- [x] Mutation-prove each guard separately: delete the `docs/*` guard and confirm the outside-`docs/` rows go red; delete the `..` guard and confirm the climb rows go red

### Phase 3: One extraction helper

**Risk**: Low. **Files**: `tests/untrusted-content-rule.test.js`. **Dependencies**: Phase 2 (same hunk).

- [x] Add `boundBlockFor(site)` and use it in `runBound` and the "same block at every site" test
- [x] Confirm the test count is unchanged and nothing else reads the block another way

### Phase 4: Configured root and symlinks

**Risk**: Medium. **Files**: the three bound blocks and their bundled copies; `tests/untrusted-content-rule.test.js`; `CHANGELOG.md`. **Dependencies**: Phases 2 and 3.

- [x] Run the symlink-resolution property on a temp symlink (Section 3)
- [x] Decide and record the root: `docs` for tasks, `${PRD_ROOT:-docs/prd}` for stories (review-story and Step 0 when the document is a story)
- [x] Resolve the real path of the parent directory with `cd … && pwd -P` and compare with the real path of the root. Handle both empty cases explicitly, before the `case`: an empty `REAL_ROOT` (no `docs/` in the cwd) makes the pattern `"$REAL_ROOT"/*` equal `/*`, which admits every absolute path, so it must HALT; an empty `REAL_DIR` (the parent does not exist) must not HALT here and is left to the caller's existing file-exists check. Note `"$REAL_DIR/"` is never the empty string, so a `""` case arm cannot catch it (measured)
- [x] Add behaviour tests: a symlink inside `docs/` pointing outside is a HALT; a configured `PRD_ROOT` path is kept; the default path is kept; a path whose parent directory does not exist is kept (not a HALT); a cwd with no `docs/` is a HALT
- [x] Re-run the `fence:` probe plan for the three sites; update the cases (`probes_executed` must be above 0)
- [x] `npm run bundle`, then `npm run bundle:check`
- [x] Add a `CHANGELOG.md` entry citing task 262

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
5a. ✅ `tests/unbound-default-reads.test.js` - declares `PRD_ROOT` as an input of the three bound blocks (its guard flagged the new `${PRD_ROOT:-docs/prd}` read; found by `ci:fast`, not by the review)

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

- [x] A CRLF document with a closing ```` ```\r ``` ` fence is tracked correctly (control case in the lint test)
- [x] Each hostile path case asserts its own HALT message
- [x] Deleting either guard turns a named test red (mutation proof recorded in the QA report)
- [x] A symlink inside `docs/` that points outside the tree is a HALT
- [x] A path under a configured `PRD_ROOT` is kept, and the default `docs/tasks/...` path is kept

### Performance

- [x] The lint test runs in under 2 seconds; the figure and command are recorded in the QA report

### Code Quality

- [x] `CI=true npm test` passes
- [x] `npm run validate -- skills/review-task/ skills/review-story/` passes
- [x] `npm run bundle:check` and `npm run check:generated` are clean

### Migration

- [x] `CHANGELOG.md` has an entry citing task 262
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

- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [ ] QA gate PASS

---

## References

- Origin: [task.261.untrusted-content-rule.md](../task.261.untrusted-content-rule/task.261.untrusted-content-rule.md); gate: [task.261.gate.3.untrusted-content-rule.yml](../task.261.untrusted-content-rule/task.261.gate.3.untrusted-content-rule.yml) (recommendations.future CR-1 to CR-3)
- DoD spec challenge: [task.261.dod.1.untrusted-content-rule.md](../task.261.untrusted-content-rule/task.261.dod.1.untrusted-content-rule.md)
- Rule: `shared/resources/untrusted-content-rule.md`

## Notes

- Cut from the task 261 follow-ups; independent of every open task. One shippable unit: the four items share one test file and one block.
- QA artifacts will land beside this file: `task.262.qa.[N].*.md`, `task.262.gate.[N].*.yml`, `task.262.bug.[N].*.md`.

## Implementation Summary

**Completed**: 2026-11-05

**Approach**: Test-first, one phase at a time. Phases 1 to 3 changed only `tests/untrusted-content-rule.test.js`; Phase 4 rewrote the "Bound the derived path" block at the three sites and `npm run bundle` regenerated the six bundled copies of the step-0 document.

- **Phase 1**: the fence regex is `([^\n]*)`. The review found that the old regex did not mis-read a CRLF fence line, it never matched one. The control puts a fenced read marker with a forbidding word in a CRLF text and asserts the hit survives; an LF twin must give the same result.
- **Phase 2**: the hostile table is `[path, expected message]`; the outside-`docs/` and `..` rows name their own guard.
- **Phase 3**: `boundBlockFor(site)` is the only caller of `boundBlock`.
- **Phase 4**: the block accepts `docs/` or `${PRD_ROOT:-docs/prd}`, refuses a symlinked file, and compares the real path of the parent directory with the real path of each root (`cd … && pwd -P`, no `realpath -m`). A missing parent directory is not a HALT. Behaviour tests run in a scratch repo with real symlinks.

**Testing Results**: `CI=true node --test tests/untrusted-content-rule.test.js`: 33 tests pass, 1.6 to 1.9 s over three runs at load average about 5. Every fix was mutation-proved (see the implementation report's Decisions Log). Probe plan re-run: 60 probes executed, verdict `engages`, no escapes.

**Deferred Work**: none. Two things were decided in-session: the bound also refuses a symlinked file (the plan compared only the parent directory), and the Phase 4 behaviour tests run at one site because the three blocks are asserted equal.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-05 | 1.0     | Initial draft | create-task |
| 2026-11-05 | 1.1     | Review passed (8/10) after 3 fixes: CRLF mechanism corrected (old regex never matches a CRLF fence), CRLF control redesigned so it can go red, Phase 4 empty-path handling specified | review-task |
| 2026-11-05 |         | Status → ready-for-development | review-task |
| 2026-11-05 |         | Implemented — 13 files, 15 new tests | develop |
<!-- change-log-end -->
