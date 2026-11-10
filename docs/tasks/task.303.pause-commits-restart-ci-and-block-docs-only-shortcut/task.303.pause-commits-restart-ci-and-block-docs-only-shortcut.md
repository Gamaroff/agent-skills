---
id: task.303
title: "Pause commits restart CI and block the docs-only shortcut"
type: task
description: "Stop each pipeline pause commit from cancelling the previous head's CI run and forcing a full-CI wait at step 8."
tags: [pipeline, precompact, ci, finalise]
category: refactoring
status: planned
priority: Medium
created: 2026-11-10
updated: 2026-11-10
estimated_effort_hours: 4
---

# Technical Task: Pause commits restart CI and block the docs-only shortcut

**Status:** Planned

Cut from the handoff `handoff-precompact-keep-lock.md`, "Also found" item 1.

---

## 1. Overview

On a consumer run (task.153, 2026-11-10) each PreCompact pause commit at step 8 was pushed, which cancelled the previous head's CI run. The cancelled `ci-ok` read as a failure, so the docs-only shortcut did not apply, and the run waited for full CI each time (about 50 minutes at worst). The related consumer memory is "superseded CI runs poison the rollup".

## 2. Motivation

A pause commit changes only documents (the report and the pause snapshot). A run that is cancelled because a newer commit superseded it says nothing about the tree, yet it is read as red. The cost is wall-clock, never a wrong answer (see Technical Background), but a pause at step 8 on a long run multiplies it.

## 3. Technical Background

**Current state (grepped 2026-11-10):**

- `shared/resources/ci-tree-equivalence.js` header (lines 24-45): `code-changed` is final only when no nearer ancestor was walked past undecided (PENDING, NONE, CANCELLED, or green but not settled); otherwise the answer is `no-green-ancestor`, which a poll asks again. "A CANCELLED ancestor is re-asked too: it costs polling, never a wrong answer."
- The hook already holds the pause-commit push when the report links to a staged-but-uncommitted path (PR #873).

**So the premise is partly handled:** a cancelled ancestor is not a wrong answer today; it is a delay. What is missing is one of the two options below. **(unverified)** whether a cancelled ancestor whose own successor went green is already skipped; Phase 1 reads the walk.

**Options.** (a) Treat a cancelled ancestor whose own successor reached green as not red, in the ancestor walk. (b) Hold the pause-commit push at step 8, as the hook does for a dangling link, and let the step's own commit carry it. Phase 1 reads the code and the consumer evidence, and chooses.

## 4. Scope

**In scope:** ✅ the choice ✅ the fix ✅ tests of the walk or the hold.

**Out of scope:** ❌ changing how CI is configured in a consumer ❌ the docs-only path list.

## 5. Breaking Changes

None.

## 6. Implementation Plan

### Phase 1: Read and choose — Risk: Low

- [ ] Read the ancestor walk in `ci-tree-equivalence.js` and state what it does with a cancelled ancestor that has a green successor. Reproduce the consumer case with a fixture.
- [ ] Choose option (a) or (b) and record why.

### Phase 2: Fix — Risk: Medium

- [ ] Option (a): in the walk, a cancelled run superseded by a green run of a later commit on the same branch is skipped, never counted red. Option (b): the hook holds the pause-commit push at step 8.

### Phase 3: Tests and docs — Risk: Low

- [ ] A fixture with a cancelled ancestor and a green successor (or a step-8 pause); mutation-proved. `CHANGELOG.md` entry; bundled copies.

## 7. Files Summary

1. ✅ `shared/resources/ci-tree-equivalence.js` (option a) or `shared/resources/develop-pipeline-on-precompact.sh` (option b)
2. ✅ the matching test files, bundled `references/` copies, `CHANGELOG.md`

## 8. Testing Strategy

Fixture-driven: a cancelled ancestor with a green successor must read tree-equivalent (a) or a step-8 pause must not push (b). Mutation-prove. A control case: a cancelled ancestor with **no** green successor must still answer `no-green-ancestor`, because skipping every cancelled run would hide a real red. Run `lint:shell` and the full suite via `npm run test:remote`.

## 9. Success Criteria

**Functional**

- [ ] The consumer case (cancelled head, docs-only successor, green) no longer waits for full CI. Held by a fixture.
- [ ] The control case still answers `no-green-ancestor`. Held by a test.

**Performance**

- [ ] No extra API calls per poll: the fixture counts the calls.

**Code quality**

- [ ] `npm run bundle:check`, `lint:shell` and `ci:fast` pass.

**Migration**

- [ ] `CHANGELOG.md` entry.

## 10. Risk Assessment

**High:** treating a cancelled run as not red could hide a real failure. Mitigation: only when its own successor, on the same branch, is green; the control test. **Medium:** option (b) delays visibility of the pause commit. **Low:** wording.

## 11. Rollback Plan

Revert the commit and re-run `npm run bundle`. Triggers: a red tree accepted as green (Critical).

---

## Change Log

<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-10 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phases 1 to 3

## References

- the handoff `handoff-precompact-keep-lock.md`, "Also found" item 1
- PR #873 (the dangling-link push hold)
