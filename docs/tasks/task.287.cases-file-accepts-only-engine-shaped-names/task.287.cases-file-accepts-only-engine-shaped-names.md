---
id: task.287
title: "cases_file accepts only engine-shaped names"
type: task
description: "Make the security probe plan's cases_file route refuse any file whose name is not one the engine itself writes, so a plan cannot point the runner at an arbitrary JSON array in the work-item directory."
tags: [finalise, security-probe, observation]
category: refactoring
status: accepted
priority: Low
created: 2026-11-07
updated: 2026-11-23
completed_date: 2026-11-23
pr_number: 933
estimated_effort_hours: 2
---

# Task 287: cases_file accepts only engine-shaped names

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.287.review.1.cases-file-accepts-only-engine-shaped-names.md` implemented 2026-11-23

---

## 1. Overview

Task 269 added a `cases_file` route to `shared/resources/security-probe-plan.mjs`: a plan entry names a committed cases file and the runner copies it byte for byte instead of retyping the cases. The route confines the name to the work-item directory, refuses symlinks, and needs a JSON array. It does not check the name's shape, so any regular file in the directory is accepted.

This task adds that check: the basename must match a name the engine itself writes.

**Scope**: one basename check in `resolveCasesFile`, its own refusal reason, tests, and the prompt and skill wording that names the rule.

---

## 2. Motivation

### Current Problems

1. **The accepted set is wider than the written set.** The engine writes `<stem>.dod.<N>.security.cases.json`, or `<stem>.dod.<N>.security.cases.<i>.json` when a plan has several entries (`security-probe-plan.mjs:467-468`). `resolveCasesFile` accepts any other regular file too (`security-probe-plan.mjs:179`).
2. **The only remaining bounds are indirect.** A wrong file is stopped by the JSON-array parse and, when the plan carries one, `cases_sha256`. Neither says "this is a cases file".
3. **Found by review, not by incident.** DoD run 1 of task 269 raised it as a spec challenge and `gate.4` recorded it under `recommendations.future`. Nothing has gone wrong.

### Benefits

1. **The route's contract is one sentence.** "A cases file the engine wrote, or one named like it."
2. **A mistyped or wrong-purpose name fails loudly** with a reason of its own, instead of failing later on content.
3. **Low cost.** The risk it removes is small, so the change must stay small.

---

## 3. Technical Background

### Current Architecture

- `resolveCasesFile(name, workDir)` is the single decision point (`security-probe-plan.mjs:179`). `casesFileAccepted` wraps it as a boolean for the probe engine (`security-probe-plan.mjs:229`).
- Two callers: the plan-entry validator (`security-probe-plan.mjs:407`) and the reuse check (`security-probe-plan.mjs:625`).
- Refusals today: `bad-name`, `outside-work-dir`, `unreadable`, `missing`, `symlink`, `not-a-file`. The caller prefixes them as `plan-entry-cases-file-<why>` and `cases-file-<why>`.
- The engine's own names: `${opts.casesBase}.json`, or `${opts.casesBase}.${i + 1}.json` (`security-probe-plan.mjs:467-468`), with `casesBase` = `<stem>.dod.<N>.security.cases` (`--cases-base` at `skills/finalise/SKILL.md:763`).

### Measured population (re-measured 2026-11-23, review 1)

The draft measured this on 2026-11-07 (284 files, two plans). It had moved by review time; the figures below are the re-measure, and the commands are the definition — re-run them rather than trusting the numbers.

Files. Command: `git ls-files 'docs/**/*security*cases*.json'` — 355 files. Of those, 344 match `\.security\.cases(\.[0-9]+)?\.json$` and 11 do not:

- `task.154.security-probe-cases.json`
- `task.200.qa.4.security.cases.bug.json`, `task.200.qa.4.security.cases.story.json`
- `task.204.dod.1.security.cases.domain.json`, `task.204.dod.1.security.cases.slug.json`
- `task.271.qa.{2,3,4}.security.{delta,match}.cases.json` (six files)

Plans. Command: `git ls-files 'docs/**/*.security.plan.json'` — 31 plans, and `jq -r '.[]? | select(.cases_file!=null) | .cases_file'` over them lists 54 `cases_file` entries. 53 match the pattern. **One does not: `task.304.dod.1.security.plan.json` names `task.304.dod.1.security.cases.new.json`**, and that file is not tracked (`git ls-files` does not list it), so the plan is already `not-reusable` today as `cases-file-missing`. After this task it answers `cases-file-bad-name-shape` instead. The outcome is the same (the caller plans afresh) and only the reason changes. No other committed plan is affected. None of the 11 non-matching files is named by a plan.

### Target Architecture

`resolveCasesFile` gains one check after the confinement checks and before the filesystem reads: the basename must match `/\.security\.cases(\.[0-9]+)?\.json$/`. A miss returns `{ ok: false, why: "bad-name-shape" }`, which surfaces as `plan-entry-cases-file-bad-name-shape` and `cases-file-bad-name-shape` with no caller change.

---

## 4. Scope

In Scope:

✅ The basename check and its refusal reason in `resolveCasesFile`
✅ Tests, including a mutation proof
✅ The wording in `finalise-dod-security-prompt.md` and `skills/finalise/SKILL.md` that says what `cases_file` may name
✅ Regenerating the bundled copies and a `CHANGELOG.md` entry

Out of Scope:

❌ Renaming or deleting the five legacy files above (no plan names them)
❌ Any change to the inline `cases` route
❌ Any change to confinement, symlink or hash checks

---

## 5. Breaking Changes

**A plan whose `cases_file` is named some other way now refuses.**

- Before: any regular file in the work-item directory holding a JSON array of cases.
- After: only a file named `*.security.cases.json` or `*.security.cases.<n>.json`.
- Affected: a hand-authored plan naming a hand-named file. One committed plan does (`task.304.dod.1.security.plan.json`, measured above), and it was already not reusable because its file is not tracked; only the refusal reason changes. The security agent's prompt tells it to name the engine's file.
- Migration: rename the file to the engine shape and re-run, or put the cases inline. The refusal reason names the shape.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.287.plan.cases-file-accepts-only-engine-shaped-names.md](task.287.plan.cases-file-accepts-only-engine-shaped-names.md)

### Phase 1: The check (Risk: Low)

Files: `shared/resources/security-probe-plan.mjs`

- [x] Add the basename pattern as a named constant beside `resolveCasesFile`
- [x] Return `bad-name-shape` after the `outside-work-dir` check and before any filesystem call
- [x] Update the function's doc comment to list the new refusal

### Phase 2: Tests (Risk: Low)

Files: `shared/resources/tests/security-probe-plan-cases-file.test.mjs`

- [x] Re-point every fixture name in the file at an engine-shaped name: `ok.json`, `mixed.json`, `only.json`, `esc.json`, `obj.json`, `missing.json`, `link.json` (the plan-entry tests, about lines 95-195) **and the probe-engine test `casesFileAccepted: the probe engine executes hostile and legitimate names` (about lines 282-310)**, whose `link.json` and `sub` cases would otherwise pass as `bad-name-shape` and stop exercising the symlink and not-a-file refusals
- [x] Add one test per accepted shape (`…security.cases.json`, `…security.cases.2.json`)
- [x] Add one refusal test for a plain `x.json` and for a near miss (`x.security.cases.json.bak`, `x.security.cases.a.json`)
- [x] Add one test that a bad-shape name whose file does not exist answers `bad-name-shape`, not `missing`, so the check provably runs before `lstat`
- [x] Mutation-prove it: remove the check and confirm the refusal tests go red

### Phase 3: Wording, bundle, changelog (Risk: Low)

Files: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `CHANGELOG.md`

- [x] State the accepted shape where `cases_file` is described (`finalise-dod-security-prompt.md:430`, `skills/finalise/SKILL.md:797`)
- [x] `npm run bundle`, then `npm run bundle -- --check`
- [x] Add a `CHANGELOG.md` entry citing task 287

---

## 7. Files Summary

Core Implementation:

1. ✅ `shared/resources/security-probe-plan.mjs` — the check
2. ✅ `skills/finalise/references/security-probe-plan.mjs` — generated copy

Tests:

3. ✅ `shared/resources/tests/security-probe-plan-cases-file.test.mjs`

Documentation:

4. ✅ `shared/resources/finalise-dod-security-prompt.md` and its generated copies
5. ✅ `skills/finalise/SKILL.md`
6. ✅ `CHANGELOG.md`

---

## 8. Testing Strategy

Unit Tests:

- Scope: `resolveCasesFile` and the two callers' reasons.
- Command: `CI=true command node --test shared/resources/tests/security-probe-plan-cases-file.test.mjs`
- Accepted: both engine shapes. Refused: a plain name, a near miss, an engine shape in a sub-directory path (already refused as a non-basename by confinement).
- Control case: the reuse check keeps accepting task 269's two committed plans, which name matching files. Corpus control: `reusePlan` is run (in the test, over a copy of the plan and its files in a temp directory) for the committed plans whose `cases_file` entries all exist, and none of them changes answer; `task.304.dod.1.security.plan.json` answers `cases-file-bad-name-shape` (it answered `cases-file-missing`).

Mutation proof:

- Remove the shape check. The refusal tests must go red and the accepted-shape tests must stay green. Record the mutant and the fail count in the QA report.

Regression:

- `CI=true npm run ci:fast` and `npm run bundle -- --check`.

---

## 9. Success Criteria

**Functional**

- [x] `cases_file: "x.dod.1.security.cases.json"` and `"x.dod.1.security.cases.2.json"` are accepted
- [x] `cases_file: "x.json"` and `"x.security.cases.a.json"` are refused as `plan-entry-cases-file-bad-name-shape`
- [x] The reuse check answers `cases-file-bad-name-shape` for a prior plan naming a bad shape
- [x] Task 269's two committed plans still reuse
- [x] `task.304.dod.1.security.plan.json` answers `cases-file-bad-name-shape` and stays not-reusable (held by the corpus control case in Testing Strategy)

**Performance**

- [x] No new test case runs over one second (five runs, slowest recorded in the QA report with `/proc/loadavg` beside each)
- [x] A bad-shape name never reaches `lstat`: the test "a bad-shape name whose file does not exist answers `bad-name-shape`, not `missing`" holds it

**Code Quality**

- [x] The new refusal has a revert-and-red mutation proof recorded in the QA report
- [x] `CI=true npm run ci:fast` passes
- [x] `python3 skills/create-skill/scripts/quick_validate.py skills/finalise` passes

**Migration**

- [x] `npm run bundle -- --check` reports 0 problems
- [x] `CHANGELOG.md` has an entry citing task 287
- [x] The prompt and `SKILL.md` state the accepted shape

---

## 10. Risk Assessment

**HIGH:** none.

**MEDIUM:** none.

**LOW**

1. A hand-authored plan naming a differently shaped file refuses.
   - Probability: Low. No committed plan does, and the prompt tells the agent to name the engine's file.
   - Impact: Low. The refusal names the shape; rename or inline the cases.
   - Mitigation: the measured population above; the wording change in Phase 3.
   - Rollback: revert the commit.
2. The pattern is narrower than a real engine name, for example a stem containing a dot.
   - Probability: Low. The pattern keys on the suffix only, so any stem passes.
   - Mitigation: a test with a dotted stem (`task.9.dod.2.security.cases.json`, as at `read-only-agent-writes.test.mjs:322`).

---

## 11. Rollback Plan

IMMEDIATE (under an hour): `git revert` the merge commit. The route returns to accepting any regular file in the work-item directory. Verify with `CI=true command node --test shared/resources/tests/security-probe-plan-cases-file.test.mjs`.

PARTIAL: none; the change is one check.

FORWARD FIX: if a legitimate name is refused, widen the pattern in a follow-up rather than reverting.

Triggers: a `/finalise` run refusing a plan whose file the engine wrote (revert at once); a hand-named file refused (forward fix).

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report**: `task.287.qa.1.cases-file-accepts-only-engine-shaped-names.md`; **Gate**: `task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml` — PASS, 95/100.

- ✅ **Acceptance Criteria:** all 13 met (10 by code and test evidence, 3 by green CI on the PR head)
- ✅ **PR:** #933, review report APPROVE (`task.287.pr-review.1.cases-file-accepts-only-engine-shaped-names.md`); CI green on `4b72c73bd`
- ✅ **Documentation:** CHANGELOG entry cites task 287; SKILL.md and the security prompt state the shape
- ✅ **Security:** boundary probed by `/finalise` — 8 executed, 0 reproduced, 0 escapes
- ✅ **Compliance:** not applicable (internal tooling)

**Detailed Verification Log:** see `task.287.dod.1.cases-file-accepts-only-engine-shaped-names.md`.

**Task marked as ACCEPTED on:** 2026-11-23

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-23
**Quality Score**: 95/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.287.qa.1.cases-file-accepts-only-engine-shaped-names.md](./task.287.qa.1.cases-file-accepts-only-engine-shaped-names.md)
- **Gate File**: [task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml](./task.287.gate.1.cases-file-accepts-only-engine-shaped-names.yml)

### Test Coverage Summary
- **Tests Executed**: 16 in the changed file; fast gate 8741, 0 fail
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No blocking issues. One advisory note: the pattern also accepts the bare name `.security.cases.json` and zero-padded indices, which the engine never writes.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-07 | 1.0     | Initial draft, cut from task 269 `gate.4` `recommendations.future` and DoD run 1     | create-task |
| 2026-11-23 | 1.1     | Review passed (8/10): population re-measured (31 plans, one names a non-engine file), probe-engine test added to Phase 2, "no filesystem call" criterion made testable, line anchors refreshed | review-task |
| 2026-11-23 |         | Status → ready-for-development                                                       | review-task |
| 2026-11-23 |         | Implemented — 8 source files + 3 generated copies, 5 new tests, 4 mutation-red       | develop     |
| 2026-11-23 |         | QA gate PASS (95/100) — 0 blocking findings, 1 advisory                              | qa-task     |
| 2026-11-23 | 1.2 | DoD passed — accepted (PR #933) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: The check
- [x] Phase 2: Tests
- [x] Phase 3: Wording, bundle, changelog

---

## References

- Origin: [task.269 gate 4](../task.269.finalise-never-hand-copies-agent-output/task.269.gate.4.finalise-never-hand-copies-agent-output.yml) (`recommendations.future`) and [DoD run 2](../task.269.finalise-never-hand-copies-agent-output/task.269.dod.2.finalise-never-hand-copies-agent-output.md) (recommendation for the owner)
- Task 269: [task.269.finalise-never-hand-copies-agent-output.md](../task.269.finalise-never-hand-copies-agent-output/task.269.finalise-never-hand-copies-agent-output.md)

---

## Notes

Low priority by design: the review found the risk small. File it, do it when convenient, do not let it grow.
