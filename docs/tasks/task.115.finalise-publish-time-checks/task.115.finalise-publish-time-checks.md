---
id: task.115
title: "[Task 115] finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism"
type: task
description: "Four observations on finalise share one shape — the step checks something, then changes the thing it checked, then publishes. The DoD header said IN PROGRESS under a sentence saying accepted, posted verbatim to the PR (#57). The CI rollup is read before Step 7's own commits, so the accepted head is never the verified one (#40). A gate certified a working tree whose commit had been silently rejected by the pre-commit hook (#48). And the release checklist's CHANGELOG box is the one item with no mechanism; five merges had no entry (#59). Give the publish step the checks, in the order task.103 used: a check first, then an owner."
tags: [finalise, pipeline, ci, changelog]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-13
assignee:
estimated_effort_hours: 6
github_issue: 401
---

# Technical Task: finalise publishes before it verifies: a doubled status header, a CI reading on the wrong head, a working-tree gate, and a CHANGELOG box with no mechanism

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.115.review.1.finalise-publish-time-checks.md` implemented 2026-09-13
**GitHub Issue**: [#401](https://github.com/Gamaroff/agent-skills/issues/401)

---

## 1. Overview

`/finalise` Step 7 is the pipeline's publish step: it writes the DoD file, flips the document to
`accepted`, ticks the registry, and posts to the PR and the tracker. Four observations record that
its checks run **before** its own writes, or check the wrong artefact, or do not exist. This task
adds the checks at the publish boundary, where a check cannot be forgotten.

## 2. Motivation

### Current Problems

1. **Doubled status.** The DoD report opens `**Status:** IN PROGRESS` and closes
   `**Final Status:** ✅ ACCEPTED`; the header is written at Step 0 action 3 and its update asked for
   at Step 7 action 1, roughly 740 lines later; the header was missed on task.106 and Step 7 posted the
   file verbatim under a lead saying "no further action is needed" (#57).
   `document-status-lifecycle.md` §"Frontmatter vs Body Sync Rule" already states the both-locations
   rule for frontmatter vs body; the DoD header is an unenforced third instance.
2. **CI verified on an ancestor.** The rollup is read at Step 6, before any acceptance artefact
   exists; the artefacts are committed and pushed only at pipeline Step 8 (`/commit-changes`), after
   every outward side-effect has already fired. So the acceptance commit is structurally never the
   verified one, and neither Step 7 Completion Checklist (12 items in `finalise/SKILL.md`, 11 in the
   pipeline step-7 doc) includes "CI green on the head that carries this acceptance" (#40).
3. **A gate describes a working tree; a PR describes a branch.** A suppressed `git commit` rejection
   left a whole QA cycle staged and unpushed under a PASS gate; only Step 5c's conformance lens, which
   reads the PR head, caught it (#48). No shipped step doc suppresses a commit — the chain was
   improvised — so the remedy is a stated rule plus assertions, not an audit.
4. **The CHANGELOG box has no mechanism.** Every generated artefact is machine-checked; the
   hand-checked item drifted on the five most recent merges (#59). `releases.md` now carries the
   measuring one-liner (v0.46.0 prep); nothing fails.

### Benefits

1. A published DoD cannot contradict itself.
2. "Green" means green on the accepted head.
3. The CHANGELOG gets task.103's treatment: a test, then an owner.

## 3. Technical Background

- `skills/finalise/SKILL.md` — Step 0 action 3 (the inline DoD template with `**Status:** IN
  PROGRESS`; there is no separate asset), Step 6 §"CI status is a DoD gate" (the rollup query and the
  `PENDING`/`NONE`/`UNKNOWN` table — the *first* reading), Step 7 action 1 (the two-edit sentence),
  Step 7 actions 7–8 (PR canonical comment, issue close, board move), the Step 7 Completion Checklist.
  `/finalise` itself never commits or pushes.
- `shared/resources/develop-pipeline-step-7-finalise.md` — the orchestrator's Step 7: DoD-body-to-PR
  post, tracker comment/close/board, its own Completion Checklist. `develop-pipeline-step-8-commit.md`
  — where the acceptance artefacts are committed and pushed today. Both are bundled into
  `skills/*/references/`; edit the `shared/resources/` source only and run `npm run bundle`.
- `develop-next` Step 3 already re-verifies the PR head before merging (head-SHA equality, CI
  rollup, local `npm run ci`) — that covers pipeline-driven merges, not `/finalise` standalone or a
  hand-merged PR, so the second read here is not a duplicate of the merge gate.
- `shared/resources/registry-tick.js` — the task.103 pattern (every outcome exits 0, drift test is
  the backstop) to mirror for the CHANGELOG owner.
- `evals/shared/tests/task-registry-drift.test.mjs` — the shape of the backstop test.
- `docs/contributing/releases.md` — the checklist and the `git log --merges` one-liner.

## 4. Scope

### In Scope

✅ Remove the DoD header's `**Status:** IN PROGRESS` line — the DoD body carries its status once, at `**Final Status:**`
✅ An **acceptance commit + push inside Step 7**, after the local writes and before every outward side-effect (PR comment, issue comment/close, board move)
✅ Second CI read on that pushed acceptance head, before the outward-facing side-effects; both readings and both heads recorded on the PR canonical comment and in the implementation report; the DoD summary records reading 1 with its head and points at where reading 2 lives
✅ Tracked-and-pushed assertions (`git ls-files --error-unmatch`, `git show origin/<branch>:<path>`) where Step 7 and 5c assert artifacts exist; a stated rule that a `git commit`'s output and exit status are never suppressed in a chain
✅ CHANGELOG: `(task N)` / `(bug N)` citation convention + a drift test over accepted **tasks** merged since the last tag + `/finalise` loud failure (advisory first; not auto-writing the entry)

### Out of Scope

❌ Generating CHANGELOG prose · ❌ changes to QA gate ownership · ❌ backfilling `(bug N)` citations for bugs 13 and 15 (named as the follow-on that lets the drift test widen to bugs) · ❌ a second read on pipeline Step 8's implementation-report commit — that commit is docs-only and `develop-next`'s merge gate re-verifies the final head

## 5. Breaking Changes

None for consumers. `/finalise` gains two HALT reasons: `ci-not-green-on-acceptance-head` (blocking
from day one — it is the gate this task exists for) and `no-changelog-entry` (advisory at first —
warn — and flipped to blocking in the release *after* the one this ships in; the flip is a checklist
line in `docs/contributing/releases.md` so it is a release-time decision, not a memory). State both in
the skill.

## 6. Implementation Plan

1. DoD header: remove the `**Status:** IN PROGRESS` line from the inline template (Step 0 action 3)
   and from the Step 8 mirror; retire the "update status from IN PROGRESS" instruction at Step 7
   action 1 and Step 8; re-check every remaining `IN PROGRESS` mention in `SKILL.md` (11 today — the
   decision-matrix rows are verdicts, not the header, and stay).
2. Reorder Step 7 into a publish boundary: (a) local writes — DoD final section, frontmatter,
   Change Log row, registry tick, DoD section in the document, sprint review; (b) **acceptance
   commit + push** of exactly those artefacts, output and exit status never suppressed; (c) re-run the
   Step 6 rollup query on `git rev-parse HEAD` — bounded poll while `NONE`/`CANCELLED`/`UNKNOWN`
   resample, HALT `ci-not-green-on-acceptance-head` on `FAILURE`, and on `PENDING` past the bound
   (waiting is correct; assuming is not); (d) only then the outward side-effects. Record reading 1
   + head and reading 2 + head on the PR canonical comment and in the implementation report; the DoD
   summary carries reading 1 and a pointer. Update the pipeline step-7 doc's Completion Checklist and
   step-8 doc (Step 8 now commits the implementation report only).
3. Tracked-and-pushed assertions where Step 7 and 5c check artifacts: `git ls-files --error-unmatch
   <path>` and `git show origin/<branch>:<path> | grep -q <marker>`; state the no-suppression rule
   once, beside them.
4. CHANGELOG: `(task N)` / `(bug N)` convention in `releases.md`; a drift test in
   `evals/shared/tests/` that walks `accepted` task documents whose `pr_number` merge is an ancestor
   of HEAD and later than the last tag, and fails naming each task with no `[Unreleased]` citation;
   `/finalise` Step 7 greps the same and warns.
5. Mutation-prove every new test (remove a citation → red naming the task; restore the header line →
   the shape test goes red).

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/finalise/SKILL.md` | inline DoD template header removed; Step 7 reordered around an acceptance commit + push; second CI read; tracked-and-pushed checks; changelog warn; two HALT reasons |
| `shared/resources/develop-pipeline-step-7-finalise.md` | Completion Checklist gains the acceptance-commit, second-read and both-heads items; side-effects ordered after the push |
| `shared/resources/develop-pipeline-step-8-commit.md` | Step 8 commits the implementation report only |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | tracked-and-pushed assertion at 5c; no-suppression rule |
| `evals/shared/tests/changelog-entry-drift.test.mjs` (new) | backstop, tasks since last tag |
| `evals/shared/tests/finalise-publish-boundary.test.mjs` (new) | 11 protocol-shape assertions: header absent; 6a→6b→6c→6d→7→8 order; both heads; tracked-and-pushed at 6b / DoD-post / 5c; no suppressed `git commit`; exit codes read; 6d + releases.md flip; 6c backgrounded (no foreground sleep); 6d without BASH_REMATCH — mutation-proved 9 ways (6 + 3 from QA cycle 1) |
| `docs/contributing/releases.md` | citation convention; advisory→blocking flip as a checklist line |
| `skills/*/references/` (generated) | `npm run bundle` after the shared edits |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Protocol-shape tests: the DoD template in `finalise/SKILL.md` carries no `**Status:** IN PROGRESS`
line and a DoD body carries exactly one status line; the Step 7 prose orders commit+push before the
first outward side-effect and the second rollup read between them. The changelog drift test carries a
non-vacuity floor (it must find ≥1 accepted task since the last tag on this repo) and is
mutation-proved by deleting one citation. Existing `finalise` protocol tests updated for the reorder.

## 9. Success Criteria

1. A DoD body carries its status in exactly one place, or the PR post refuses a contradicting body
2. Two CI readings with their heads are recorded — the first in the DoD summary at the acceptance decision, the second on the PR canonical comment and in the implementation report, taken on the pushed acceptance commit — and no outward side-effect fires before the second reads `SUCCESS`
3. Step 7 (and 5c) assert artifacts are tracked and pushed, not present; no step doc suppresses a `git commit`'s output or exit status
4. An accepted task merged since the last tag with no `[Unreleased]` citation fails a test naming it, and `/finalise` warns on accepting one; the `(bug N)` convention is documented and bugs are the named follow-on
5. Observations #40, #48, #57, #59 close naming this PR

## 10. Risk Assessment

**Medium.** The second CI read adds wall-clock to every finalise (bounded poll until the rollup is
non-empty and concluded — see `docs/contributing/traps.md` "`mergeable` lies"; never a foreground
`--watch`). Moving the commit point from Step 8 into Step 7 touches the step with the most
side-effects in the pipeline — the protocol-shape tests are what hold the order. The CHANGELOG
check must not block genuinely complete work over a missing line — hence advisory first.

## 11. Rollback Plan

One PR, one `git revert`; the new tests can stay skipped rather than deleted if the check is reverted.
Reverting restores Step 8 as the commit point, which is today's behaviour.

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
| 2026-09-13 | 1.1     | Review passed (8/10, pre-fix 6/10) — Phase 2 made closable: acceptance commit+push moved into Step 7 before the side-effects, second CI read recorded off the verified commit; citations corrected; file map gains the pipeline step-7/8 docs; header removal chosen over a pre-post check; changelog drift test scoped to tasks | review-task |
| 2026-09-13 |         | Status → ready-for-development                | review-task |
| 2026-09-13 |         | Implemented — 8 files, 15 tests (+ 7 mutation proofs) | develop |
| 2026-09-13 |         | QA gate CONCERNS (80/100) — 2 MEDIUM findings (6d zsh BASH_REMATCH; 6c foreground poll) | qa-task |
| 2026-09-13 |         | QA findings fixed — CR-1 (6d parameter expansion), CR-2 (6c backgrounded poll + result file), 2 LOW cleanups; shape test +2 assertions, mutation-proved 3 ways; 1 iteration | qa-fix |
| 2026-09-13 |         | QA gate PASS (95/100) — cycle 2 refute pass, 0 findings gated, 1 LOW documented | qa-task |
| 2026-09-13 |         | PR review (5c) findings fixed — CR-1 Jira `jira_last_*` residue exempted from the dirty-document HALT (step-7/8 docs), CR-2 idempotent 6a commit guard, CR-3 `mkdir -p` + pid-aware later-turn read, CR-4 `\|\| :` regex, CR-5 `-i` grep, PC-1 file map; shape test +3 assertions, mutation-proved 5 ways; 1 iteration | qa-fix |
| 2026-09-13 |         | QA gate PASS (95/100) — cycle 3, all six 5c findings verified fixed, 0 new | qa-task |

---

## Progress Tracking

### Phase 1: one status location
- [x] DoD report header `**Status:** IN PROGRESS` removed from the inline template and its Step 8 mirror; the body carries its status once, at `**Final Status:**`; a shape test holds it
### Phase 2: verify the head that carries the acceptance
- [x] Step 7 commits and pushes the acceptance artefacts itself, after the local writes and before any outward side-effect; pipeline Step 8 commits the implementation report only
- [x] After that push, re-read the CI rollup on `git rev-parse HEAD` before PR comment / issue close / board move; HALT `ci-not-green-on-acceptance-head` on anything but `SUCCESS` within the bound; reading 1 + head in the DoD summary, both readings + heads on the PR canonical comment and in the implementation report
- [x] Artifact-exists checks at Step 7 and 5c assert tracked-and-pushed (`git ls-files --error-unmatch`, `git show origin/<branch>:<path>`), not working-tree presence; the no-suppression rule stated beside them
### Phase 3: CHANGELOG mechanism
- [x] Citation convention (`(task N)` / `(bug N)`) documented in `releases.md`; a test fails naming each `accepted` task merged since the last tag with no `[Unreleased]` citation (tasks only in this version; bugs 13 and 15 are the named follow-on); `/finalise` warns on accepting a task with no entry, with the advisory→blocking flip recorded as a release-checklist line

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-13
**Quality Score**: 95/100
**Gate Decision**: PASS (cycle 3)

### QA Report
- **Full Report**: [task.115.qa.3.finalise-publish-time-checks.md](./task.115.qa.3.finalise-publish-time-checks.md) (earlier: [qa.1](./task.115.qa.1.finalise-publish-time-checks.md), [qa.2](./task.115.qa.2.finalise-publish-time-checks.md))
- **Gate File**: [task.115.gate.3.finalise-publish-time-checks.yml](./task.115.gate.3.finalise-publish-time-checks.yml) (earlier: [gate.1](./task.115.gate.1.finalise-publish-time-checks.yml), [gate.2](./task.115.gate.2.finalise-publish-time-checks.yml))

### Test Coverage Summary
- **Tests Executed**: 3254 (full `ci:fast`) + 102 targeted re-run; 15 mutation proofs across three cycles
- **Phases Verified**: 4/4
- **Critical Issues**: 0 HIGH, 0 MEDIUM (cycle-1 CR-1/CR-2 and the six 5c findings fixed and verified), 1 LOW documented
- **NFR Status**: Security: PASS (reasoned), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Cycle 1 found two MEDIUMs by executing the new Step 7 prose under bash and zsh; cycle 2 (refute pass) verified both fixed; the 5c PR review found six more (one consumer-breaking on Jira), fixed in a review-driven cycle and verified in cycle 3 — 14 shape assertions, all mutation-proved. SC5 (observations close) is correctly deferred to merge (`parked_until: task.115 merged to develop`).

---

## References

- **Plan**: [`task.115.plan.finalise-publish-time-checks.md`](task.115.plan.finalise-publish-time-checks.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #40, #48, #57, #59
- **Related Skill**: `.agents/skills/finalise/`; `shared/resources/document-status-lifecycle.md:79` (the both-locations rule this extends)
- **Precedent**: task.103 (registry tick: a check first, then an owner)
- **Follow-on**: `[Unreleased]` cites bug 14 but not bugs 13 and 15 (all three merged since v0.46.0) — backfill those two lines, then widen the drift test to `(bug N)`
- **Review**: [`task.115.review.1.finalise-publish-time-checks.md`](task.115.review.1.finalise-publish-time-checks.md)

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
