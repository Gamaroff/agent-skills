---
id: task.115
title: "[Task 115] finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism"
type: task
description: "Four observations on finalise share one shape — the step checks something, then changes the thing it checked, then publishes. The DoD header said IN PROGRESS under a sentence saying accepted, posted verbatim to the PR (#57). The CI rollup is read before Step 7's own commits, so the accepted head is never the verified one (#40). A gate certified a working tree whose commit had been silently rejected by the pre-commit hook (#48). And the release checklist's CHANGELOG box is the one item with no mechanism; five merges had no entry (#59). Give the publish step the checks, in the order task.103 used: a check first, then an owner."
tags: [finalise, pipeline, ci, changelog]
category: refactoring
status: planned
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 6
---

# Technical Task: finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism

**Status:** Planned

---

## 1. Overview

`/finalise` Step 7 is the pipeline's publish step: it writes the DoD file, flips the document to
`accepted`, ticks the registry, and posts to the PR and the tracker. Four observations record that
its checks run **before** its own writes, or check the wrong artefact, or do not exist. This task
adds the checks at the publish boundary, where a check cannot be forgotten.

## 2. Motivation

### Current Problems

1. **Doubled status.** The DoD report opens `**Status:** IN PROGRESS` and closes
   `**Final Status:** ✅ ACCEPTED`; Step 5 asks for both edits in one sentence 700 lines apart; the
   header was missed on task.106 and Step 7 posted the file verbatim under a lead saying "no further
   action is needed" (#57). `document-status-lifecycle.md:79` already states the both-locations rule
   for frontmatter vs body; the DoD header is an unenforced third instance.
2. **CI verified on an ancestor.** The rollup is read, then Step 7 commits docs (which CI lints), so
   the acceptance commit is structurally never the verified one; the checklist's fourteen items do
   not include "CI green on the head that carries this acceptance" (#40).
3. **A gate describes a working tree; a PR describes a branch.** A suppressed `git commit` rejection
   left a whole QA cycle staged and unpushed under a PASS gate; only Step 5c's conformance lens, which
   reads the PR head, caught it (#48).
4. **The CHANGELOG box has no mechanism.** Every generated artefact is machine-checked; the
   hand-checked item drifted on the five most recent merges (#59). `releases.md` now carries the
   measuring one-liner (v0.46.0 prep); nothing fails.

### Benefits

1. A published DoD cannot contradict itself.
2. "Green" means green on the accepted head.
3. The CHANGELOG gets task.103's treatment: a test, then an owner.

## 3. Technical Background

- `skills/finalise/SKILL.md` — Step 5 (≈830, the two-edit sentence), Step 7 (writes, then
  `gh pr comment` via the PR-stage lead path, issue close, board move), the CI gate section
  (`PENDING`/`NONE`/`UNKNOWN` handling), Completion Checklist.
- `shared/resources/registry-tick.js` — the task.103 pattern (every outcome exits 0, drift test is
  the backstop) to mirror for the CHANGELOG owner.
- `evals/shared/tests/task-registry-drift.test.mjs` — the shape of the backstop test.
- `docs/contributing/releases.md` — the checklist and the `git log --merges` one-liner.

## 4. Scope

### In Scope

✅ Remove the DoD header's `Status:` (preferred) or add a fail-closed check before the PR post
✅ Second CI read on the pushed acceptance head, before the outward-facing side-effects; both heads recorded
✅ Tracked-and-pushed assertions where Step 7 (and 5c) assert artifacts exist; never suppress `git commit` output in a chain
✅ CHANGELOG: citation convention + drift test + `/finalise` loud failure (not auto-writing the entry)

### Out of Scope

❌ Generating CHANGELOG prose · ❌ changes to QA gate ownership

## 5. Breaking Changes

None for consumers. `/finalise` gains one more HALT reason (`no-changelog-entry`) — advisory at
first (warn), blocking after one release cycle; state the plan in the skill.

## 6. Implementation Plan

1. DoD header: remove; update the template and every `IN PROGRESS` mention (11 in SKILL.md).
2. CI: after the Step 7 push, re-run the rollup read (existing helper) on `git rev-parse HEAD`;
   HALT on anything but `SUCCESS`; record both heads in the DoD summary.
3. Remote-ref assertions; audit Step 7 and 5c for `>/dev/null 2>&1` on commits.
4. CHANGELOG: convention in `releases.md`; test in `evals/shared/tests/`; finalise check.
5. Mutation-prove the test (remove an entry → red naming the task).

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/finalise/SKILL.md` (+ DoD template asset) | header, second CI read, remote-ref checks, changelog check |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | remote-ref assertion at 5c |
| `evals/shared/tests/changelog-entry-drift.test.mjs` (new) | backstop |
| `docs/contributing/releases.md` | citation convention |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Fixture DoD bodies (agreeing / contradicting) against the pre-post check; the changelog test with
a floor; `finalise` protocol shape tests updated.

## 9. Success Criteria

1. A DoD body carries its status in exactly one place, or the PR post refuses a contradicting body
2. The DoD summary records two CI readings with their heads, and the second is the pushed acceptance head
3. Step 7 asserts artifacts are tracked and pushed, not present
4. An accepted, merged task with no `[Unreleased]` citation fails a test, and `/finalise` warns on it
5. Observations #40, #48, #57, #59 close naming this PR

## 10. Risk Assessment

**Medium.** The second CI read adds wall-clock to every finalise (poll until the rollup is
non-empty and concluded — see `docs/contributing/traps.md` "`mergeable` lies"). The CHANGELOG
check must not block genuinely complete work over a missing line — hence advisory first.

## 11. Rollback Plan

`git revert`; the new test can stay skipped rather than deleted if the check is reverted.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |

---

## Progress Tracking

### Phase 1: one status location
- [ ] DoD report header `**Status:**` removed (or Step 7 refuses to post a body whose header contradicts its verdict)
### Phase 2: verify the head that carries the acceptance
- [ ] After Step 7's commit+push, re-read the CI rollup on that head before issue close / board move / PR comment; both readings + heads in the DoD summary
- [ ] Artifact-exists checks assert tracked-and-pushed (`git ls-files --error-unmatch`, `git show origin/<branch>:<path>`), not working-tree presence
### Phase 3: CHANGELOG mechanism
- [ ] Citation convention (`(task N)` / `(bug N)`) made mechanical; a test fails when an `accepted` task merged in HEAD has no `[Unreleased]` entry; `/finalise` fails loudly on accepting an item with no entry

---

## References

- **Plan**: [`task.115.plan.finalise-publish-time-checks.md`](task.115.plan.finalise-publish-time-checks.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #40, #48, #57, #59
- **Related Skill**: `.agents/skills/finalise/`; `shared/resources/document-status-lifecycle.md:79` (the both-locations rule this extends)
- **Precedent**: task.103 (registry tick: a check first, then an owner)

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
