---
id: task.287
title: "cases_file accepts only engine-shaped names"
type: task
description: "Make the security probe plan's cases_file route refuse any file whose name is not one the engine itself writes, so a plan cannot point the runner at an arbitrary JSON array in the work-item directory."
tags: [finalise, security-probe, observation]
category: refactoring
status: planned
priority: Low
created: 2026-11-07
updated: 2026-11-07
estimated_effort_hours: 2
---

# Task 287: cases_file accepts only engine-shaped names

**Status:** Planned

---

## 1. Overview

Task 269 added a `cases_file` route to `shared/resources/security-probe-plan.mjs`: a plan entry names a committed cases file and the runner copies it byte for byte instead of retyping the cases. The route confines the name to the work-item directory, refuses symlinks, and needs a JSON array. It does not check the name's shape, so any regular file in the directory is accepted.

This task adds that check: the basename must match a name the engine itself writes.

**Scope**: one basename check in `resolveCasesFile`, its own refusal reason, tests, and the prompt and skill wording that names the rule.

---

## 2. Motivation

### Current Problems

1. **The accepted set is wider than the written set.** The engine writes `<stem>.dod.<N>.security.cases.json`, or `<stem>.dod.<N>.security.cases.<i>.json` when a plan has several entries (`security-probe-plan.mjs:455-456`). `resolveCasesFile` accepts any other regular file too (`security-probe-plan.mjs:175`).
2. **The only remaining bounds are indirect.** A wrong file is stopped by the JSON-array parse and, when the plan carries one, `cases_sha256`. Neither says "this is a cases file".
3. **Found by review, not by incident.** DoD run 1 of task 269 raised it as a spec challenge and `gate.4` recorded it under `recommendations.future`. Nothing has gone wrong.

### Benefits

1. **The route's contract is one sentence.** "A cases file the engine wrote, or one named like it."
2. **A mistyped or wrong-purpose name fails loudly** with a reason of its own, instead of failing later on content.
3. **Low cost.** The risk it removes is small, so the change must stay small.

---

## 3. Technical Background

### Current Architecture

- `resolveCasesFile(name, workDir)` is the single decision point (`security-probe-plan.mjs:175`). `casesFileAccepted` wraps it as a boolean for the probe engine (`security-probe-plan.mjs:225`).
- Two callers: the plan-entry validator (`security-probe-plan.mjs:395`) and the reuse check (`security-probe-plan.mjs:611`).
- Refusals today: `bad-name`, `outside-work-dir`, `unreadable`, `missing`, `symlink`, `not-a-file`. The caller prefixes them as `plan-entry-cases-file-<why>` and `cases-file-<why>`.
- The engine's own names: `${opts.casesBase}.json`, or `${opts.casesBase}.${i + 1}.json` (`security-probe-plan.mjs:455-456`), with `casesBase` = `<stem>.dod.<N>.security.cases` (`skills/finalise/SKILL.md:707`).

### Measured population (2026-11-07)

Command: `git ls-files 'docs/**/*security*cases*.json'` — 284 files. Of those, 279 match `\.security\.cases(\.[0-9]+)?\.json$` and 5 do not:

- `task.154.security-probe-cases.json`
- `task.200.qa.4.security.cases.bug.json`
- `task.200.qa.4.security.cases.story.json`
- `task.204.dod.1.security.cases.domain.json`
- `task.204.dod.1.security.cases.slug.json`

All five predate the `cases_file` route, and no committed plan names any of them: `git ls-files 'docs/**/*.security.plan.json'` finds two plans (task 269's), each naming a matching file. So the pattern breaks no recorded plan.

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
- Affected: a hand-authored plan naming a hand-named file. None is committed (measured above). The security agent's prompt tells it to name the engine's file.
- Migration: rename the file to the engine shape and re-run, or put the cases inline. The refusal reason names the shape.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.287.plan.cases-file-accepts-only-engine-shaped-names.md](task.287.plan.cases-file-accepts-only-engine-shaped-names.md)

### Phase 1: The check (Risk: Low)

Files: `shared/resources/security-probe-plan.mjs`

- [ ] Add the basename pattern as a named constant beside `resolveCasesFile`
- [ ] Return `bad-name-shape` after the `outside-work-dir` check and before any filesystem call
- [ ] Update the function's doc comment to list the new refusal

### Phase 2: Tests (Risk: Low)

Files: `shared/resources/tests/security-probe-plan-cases-file.test.mjs`

- [ ] Re-point the fixtures that use `ok.json`, `mixed.json`, `only.json`, `esc.json` and `obj.json` at engine-shaped names
- [ ] Add one test per accepted shape (`…security.cases.json`, `…security.cases.2.json`)
- [ ] Add one refusal test for a plain `x.json` and for a near miss (`x.security.cases.json.bak`, `x.security.cases.a.json`)
- [ ] Mutation-prove it: remove the check and confirm the refusal tests go red

### Phase 3: Wording, bundle, changelog (Risk: Low)

Files: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`, `CHANGELOG.md`

- [ ] State the accepted shape where `cases_file` is described (`finalise-dod-security-prompt.md:428`, `skills/finalise/SKILL.md:741`)
- [ ] `npm run bundle`, then `npm run bundle -- --check`
- [ ] Add a `CHANGELOG.md` entry citing task 287

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
- Control case: the reuse check keeps accepting task 269's two committed plans, which name matching files.

Mutation proof:

- Remove the shape check. The refusal tests must go red and the accepted-shape tests must stay green. Record the mutant and the fail count in the QA report.

Regression:

- `CI=true npm run ci:fast` and `npm run bundle -- --check`.

---

## 9. Success Criteria

**Functional**

- [ ] `cases_file: "x.dod.1.security.cases.json"` and `"x.dod.1.security.cases.2.json"` are accepted
- [ ] `cases_file: "x.json"` and `"x.security.cases.a.json"` are refused as `plan-entry-cases-file-bad-name-shape`
- [ ] The reuse check answers `cases-file-bad-name-shape` for a prior plan naming a bad shape
- [ ] Task 269's two committed plans still reuse

**Performance**

- [ ] No new test case runs over one second (five runs, slowest recorded in the QA report with `/proc/loadavg` beside each)
- [ ] The check adds no filesystem call

**Code Quality**

- [ ] The new refusal has a revert-and-red mutation proof recorded in the QA report
- [ ] `CI=true npm run ci:fast` passes
- [ ] `python3 skills/create-skill/scripts/quick_validate.py skills/finalise` passes

**Migration**

- [ ] `npm run bundle -- --check` reports 0 problems
- [ ] `CHANGELOG.md` has an entry citing task 287
- [ ] The prompt and `SKILL.md` state the accepted shape

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

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                                                                          | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------------ | ----------- |
| 2026-11-07 | 1.0     | Initial draft, cut from task 269 `gate.4` `recommendations.future` and DoD run 1     | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: The check
- [ ] Phase 2: Tests
- [ ] Phase 3: Wording, bundle, changelog

---

## References

- Origin: [task.269 gate 4](../task.269.finalise-never-hand-copies-agent-output/task.269.gate.4.finalise-never-hand-copies-agent-output.yml) (`recommendations.future`) and [DoD run 2](../task.269.finalise-never-hand-copies-agent-output/task.269.dod.2.finalise-never-hand-copies-agent-output.md) (recommendation for the owner)
- Task 269: [task.269.finalise-never-hand-copies-agent-output.md](../task.269.finalise-never-hand-copies-agent-output/task.269.finalise-never-hand-copies-agent-output.md)

---

## Notes

Low priority by design: the review found the risk small. File it, do it when convenient, do not let it grow.
