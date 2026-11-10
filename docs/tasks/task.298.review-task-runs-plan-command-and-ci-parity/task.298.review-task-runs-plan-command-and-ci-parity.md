---
id: task.298
title: "review-task runs a plan's command and checks CI parity"
type: task
description: "Make review-task run a plan's own transfer or build command once, and make create-task ask for a container-versus-CI parity line when a task runs CI scripts in a new place."
tags: [review-task, create-task, observation]
category: refactoring
status: planned
priority: Low
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: review-task runs a plan's command and checks CI parity

**Status:** Planned

Cut from observation #163.

---

## 1. Overview

Task.295 was reviewed without anyone running the rsync command its plan named, and its container differed from CI (user, image base, shell and awk variants). Both gaps surfaced only in later QA cycles and in the acceptance runs. This task adds two checks: `review-task` runs a plan's own command once against a scratch target, and `create-task` asks for a parity line when a task runs CI scripts somewhere new.

## 2. Motivation

A plan states what a command will do; running it once shows what it does. A new place to run CI is a new environment, and the differences are the defects: on task.295 the container ran as a different user and lacked tools CI has. Each was found by a gate that had to be spent on it.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- `skills/review-task/SKILL.md` lists numbered Step 3 checks; the list reaches at least check 30 (`skills/create-task/SKILL.md` cites "review-task check 30" for the ignore-file rule).
- `skills/create-task/SKILL.md` § 3.5 holds the "Should Add" list where a parity item belongs.

**Target:** a new review check that says: when the plan names a command that moves or builds something (rsync, docker build, a deploy script), run it once with a dry-run flag or against a scratch target and record the result; and a new create-task "Should Add" item: when a task runs CI scripts in a new environment, the Technical Background carries a parity line (user, base image, shells, tool versions) compared with the CI workflow.

## 4. Scope

**In scope:** ✅ one new check in `review-task` ✅ one new item in `create-task` ✅ tests.

**Out of scope:** ❌ running a command that has side effects outside a scratch target ❌ changing task.295.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1: The review check — Risk: Low

**Files:** `skills/review-task/SKILL.md`

- [ ] Add the next numbered check (read the current highest number first; do not assume 31).
- [ ] State the safe form: a dry-run flag or a scratch target, never the real target.

### Phase 2: The create-task item — Risk: Low

**Files:** `skills/create-task/SKILL.md`

- [ ] Add the parity item to § 3.5 "Should Add".

### Phase 3: Tests and bundle — Risk: Low

- [ ] A test for each, in the style of the existing check tests; `npm run bundle`; `CHANGELOG.md`.

## 7. Files Summary

1. ✅ `skills/review-task/SKILL.md`
2. ✅ `skills/create-task/SKILL.md`
3. ✅ the tests that hold the check list (found by grepping the existing check numbers)
4. ✅ bundled copies, `CHANGELOG.md`

## 8. Testing Strategy

Assert behaviour: a fixture task document whose plan names an `rsync` command must produce the new finding, and one that does not must not. Mutation-prove by removing the check. Run the whole suite via `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] The new review check fires on a fixture plan that names a transfer command, and not on one that does not. Held by a test.
- [ ] The create-task item is present in § 3.5 and a test reads the skill's list, not a copy of it.

**Performance**

- [ ] No new network or long-running step in the check itself.

**Code quality**

- [ ] `npm run bundle:check`, `format:check` and `ci:fast` pass.

**Migration**

- [ ] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a check that runs a command could touch a real target. Mitigation: the check says dry-run or scratch only. **Low:** the check list's numbering collides with another task's; read the number at edit time.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a check that fires on every task (Critical); wording (non-critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #163 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 3

## References

- Observation #163 — Review does not run a plan's own command, and CI-parity gaps in a new run location go unchecked
