---
id: task.298
title: "review-task runs a plan's command and checks CI parity"
type: task
description: "Make review-task run a plan's own transfer or build command once, and make create-task ask for a container-versus-CI parity line when a task runs CI scripts in a new place."
tags: [review-task, create-task, observation]
category: refactoring
status: ready-for-review
priority: Low
created: 2026-11-10
updated: 2026-11-13
estimated_effort_hours: 4
---

# Technical Task: review-task runs a plan's command and checks CI parity

**Status:** Ready for Review

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

- [x] Add the next numbered check at the end of Step 3's list (the highest at review time is 30, found with `grep -nE '^[0-9]+\. \*\*' skills/review-task/SKILL.md`; re-read it at edit time, and use highest + 1). Keep the shape of checks 20 to 30: bold name with `(obs #163)`, **Trigger**, the rule, **Worked example** (task.295), and the severity line.
- [x] State the safe form: a dry-run flag or a scratch target, never the real target. **When the plan's command has neither** (a deploy script, a build that writes in place), the check says not to run it and to record `unrun — no safe form` as **Optional**; it never improvises a flag.
- [x] Add the new check to the three places that list checks by number or shape: Step 3's "Common Hallucination Patterns" bullets, its "Issues to Flag" **Important** line, and the Anti-Hallucination Protocol's detection rules. Check 30 itself is in none of them; do not copy that omission.

### Phase 2: The create-task item — Risk: Low

**Files:** `skills/create-task/SKILL.md`

- [x] Add the parity item to § 3.5 "Should Add", in the style of its neighbours (an obs number, `review-task check 31`, the rule, the evidence). The rule: when a task runs CI scripts in a new environment (a container, a remote host, a new runner), the Technical Background carries a **parity line** comparing the new environment with the CI workflow on user, base image, shells, awk variants and tool versions, and says how each was read (`id`, `awk --version`, the workflow's `runs-on` or `container:`).
- [x] Say in the item how it differs from review-task check 23 (a parity claim about a sibling *mechanism's guards*): this one compares *environments*.

### Phase 3: Tests and bundle — Risk: Low

- [x] One new test file, `tests/review-run-and-parity-checks.test.js`, modelled on `tests/review-plan-shape-checks.test.js` and reading the two skills through `tests/lib/markdown-section`. Do not extend `review-plan-shape-checks.test.js`: its `CHECKS × SITES` loop requires every check in `review-story` as well, and this task does not touch `review-story`. The file sits under `tests/`, which `npm run test:suite` reaches through `'tests/*.test.js'`.
- [x] The test reads the **skills' own text**: the new review-task item (its number is derived from the list, not typed in), and the new create-task bullet. It asserts what the siblings assert: the trigger, the safe form (`dry-run` and `scratch`), the no-safe-form fallback, the worked example, the severity, and that the three list sites name the check.
- [x] Mutation-prove each assertion: remove the item (red), remove the safe-form clause (red), remove the create-task bullet (red). Run it against a copy of the tree with a root override as the siblings do.
- [x] The tests that already read `skills/review-task/SKILL.md` (`git grep -l "review-task/SKILL.md" -- tests`: nine files) must stay green; run them with `ci:fast`. Then `npm run bundle`, and a `CHANGELOG.md` entry.

## 7. Files Summary

1. ✅ `skills/review-task/SKILL.md`
2. ✅ `skills/create-task/SKILL.md`
3. ✅ `tests/review-run-and-parity-checks.test.js` (new)
4. ✅ bundled copies (`npm run bundle`), `CHANGELOG.md`

Population: the skills' own text is the thing under test, so no site list is hand-kept here. The nine existing tests that read `skills/review-task/SKILL.md` are found with `git grep -l "review-task/SKILL.md" -- tests` and are re-run, not edited.

## 8. Testing Strategy

What CI can hold is **presence**: the siblings (`tests/review-plan-shape-checks.test.js`) state this in their header, and a reviewer applying a rule is a behaviour no CI layer exercises. So the new test asserts that each rule is stated at its site with its trigger, safe form, no-safe-form fallback, worked example and severity, and that the create-task bullet is present in § 3.5. Control cases: the test also asserts the new item is **not** a copy of check 23 (it names environments, not a sibling mechanism). Mutation-prove by removing the item, the safe-form clause and the bullet in turn. Run the whole suite via `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [x] `skills/review-task/SKILL.md` states the new check with its trigger (the plan names a command that moves or builds something), the safe form (a dry-run flag or a scratch target), the no-safe-form fallback and its severity. Held by `tests/review-run-and-parity-checks.test.js`, which reads the skill's own text, and goes red when the item or its safe-form clause is removed.
- [x] `skills/create-task/SKILL.md` § 3.5 "Should Add" carries the parity item. Held by the same test, which reads the skill's list, not a copy of it.

**Performance**

- [x] The check text permits running only a dry-run or scratch-target form, so the check adds no network call or write to a real target. Held by the same test's assertion on the safe-form clause.

**Code quality**

- [x] `npm run bundle:check`, `format:check` and `ci:fast` pass.

**Migration**

- [x] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** none. **Medium:** a check that runs a command could touch a real target. Mitigation: the check says dry-run or scratch only, and says not to run a command that has neither (recorded as `unrun — no safe form`); the test holds both clauses. **Low:** the check list's numbering collides with another task's; read the number at edit time.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a check that fires on every task (Critical); wording (non-critical).

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-13
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.298.qa.2.review-task-runs-plan-command-and-ci-parity.md](./task.298.qa.2.review-task-runs-plan-command-and-ci-parity.md)
- **Gate File**: [task.298.gate.2.review-task-runs-plan-command-and-ci-parity.yml](./task.298.gate.2.review-task-runs-plan-command-and-ci-parity.yml)

### Test Coverage Summary
- **Tests Executed**: 7
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No blocking findings. Cycle 1's finding is fixed and proven. One advisory cleanup: an assertion that cannot fail.

## Change Log

<!-- change-log-start -->

| Date       | Version | Description                              | Author      |
| ---------- | ------- | ---------------------------------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft — cut from observation #163 | create-task |
| 2026-11-13 | 1.1     | Review passed (8/10) — named the test file and why `review-plan-shape-checks.test.js` is not extended, added the no-safe-form fallback, reworded two criteria to what a test can hold, added the three list sites | review-task |
| 2026-11-13 |         | Status → ready-for-development | review-task |
| 2026-11-13 |         | Implemented: review-task check 31, create-task parity item, test, CHANGELOG; status → ready-for-review | develop |
| 2026-11-13 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-13 |         | QA findings fixed — cycle 1, 1 finding | qa-fix |
| 2026-11-13 |         | QA gate PASS (100/100) — 0 findings | qa-task |

<!-- change-log-end -->

## Progress Tracking

- [x] Phases 1 to 3

## References

- Observation #163 — Review does not run a plan's own command, and CI-parity gaps in a new run location go unchecked
