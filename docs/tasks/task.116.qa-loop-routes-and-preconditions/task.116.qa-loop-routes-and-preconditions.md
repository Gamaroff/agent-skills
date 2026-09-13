---
id: task.116
title: "[Task 116] The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran"
type: task
description: "Six observations on qa-task / qa-story and the 5b/5c router. A CONCERNS gate with empty top_issues[] — legitimate under gate rule 4 — has no route and halts the run on 'nothing to fix' (#51). Step 10 can write and publish a PASS gate while the Step 3b code review is still running; task.106's gate 1 was posted minutes before the review returned two confirmed defects (#56). A predicate deliverable is read at QA and only executed at the Step 7 DoD probe, so its defect lands after the gate that should have covered it (#20). A green suite on macOS was blessed as evidence about Linux (#17). And skills document an agent that failed but not one that was unavailable (#44) or one whose output file is small (#62)."
tags: [qa-task, qa-story, pipeline, subagents]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-13
assignee:
estimated_effort_hours: 6
github_issue: 403
---

# Technical Task: The QA loop routes on the verdict token, gates before its own review returns, reads boundary deliverables it could execute, and has no vocabulary for a subagent that never ran

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.116.review.1.qa-loop-routes-and-preconditions.md` implemented 2026-09-13
**GitHub Issue**: [#403](https://github.com/Gamaroff/agent-skills/issues/403)

---

## 1. Overview

The QA loop (`qa-task`, `qa-story`, and the shared §5b/§5c router) has four gaps that each cost a
real cycle between 09-09 and 09-11. They cluster into one task because the fixes live in the same
three files and the same steps.

## 2. Motivation

### Current Problems

1. **A router that reads the verdict when it means the queue.** §5c admits `PASS`/`WAIVED` or the
   diminishing-returns exit (which needs a non-empty `top_issues[]`); an NFR-driven `CONCERNS` with
   `top_issues: []` therefore routes to 5b, whose no-code-change HALT fires. task.105 halted on a
   gate saying "fine, with reservations" (#51). Task.113 fixes the same substitution in
   develop-next's merge gate.
2. **A gate written before its evidence arrived.** Step 3b dispatches a background reviewer; nothing
   blocks on its return; Step 10 writes and Step 13 publishes. task.106: gate 1 `PASS` 95 posted to
   PR #381 and issue #380; the review returned a high and a medium minutes later (#56).
3. **Boundary deliverables are read, not run, at the gating step.** `probe-boundary-rule.md`
   triggers `review-security` and finalise's DoD probe; qa-task has no such trigger. A 14-star glob
   compiled to `[^/]*` × 14 was found at Step 7 after five green cycles (#20).
4. **Local green blessed as platform-independent.** `os.tmpdir()` fixtures passed to a process that
   refuses `/tmp`; the QA report reasoned the asymmetry "real and correct" from macOS; CI failed
   (#17). `TMPDIR=/tmp node --test …` reproduces and proves it locally.
5. **No word for an agent that never ran.** Skills document agent *failure*; a session without
   subagent dispatch has no row, and the inline substitute — same context reviewing its own code —
   was invented ad hoc (#44). Output-file size was then used as a liveness signal and a working
   agent was killed on a stale 159-byte reading (#62).

### Benefits

1. Honest gates route to the reviewer who can use them instead of to a fix loop with nothing to fix.
2. Published gates are verdicts on all the evidence.
3. Boundary defects surface in cycle 1, inside the gate.

## 3. Technical Background

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5b entry, §5c routes (≈857: "condition 2
  requires a non-empty `top_issues[]`") — the accepting-route set is stated once by design.
- `skills/qa-task/SKILL.md` Step 3b (dispatch), 3c (mutation), 4b (`qa-execute-snippets`, the
  execution precedent), Step 10 (gate rules 1–5), Step 13 (publish). `qa-story` mirrors.
- `shared/resources/probe-boundary-rule.md`; `review-security`'s probe path; finalise's
  `finalise-dod-security-prompt.md` — the machinery that already exists.
- `shared/resources/develop-pipeline-autonomous-defaults.md` — the home for decisions taken without
  prompting; `shared/resources/qa-execute-snippets.mjs` `zshAvailable()` (the environment-probe precedent).

## 4. Scope

### In Scope

✅ §5c route 3 + §5b entry condition on open findings
✅ Step 3b post-condition (findings block in hand), Step 10 precondition, Step 13 precondition
✅ Step 3b boundary trigger → execute candidates; report on the existing `code_review` shape
✅ Platform-variance check in Step 3b/3c and `code-review-prompt.md` (env-derived path + validating consumer ⇒ run under the other value)
✅ Subagent rows (unavailable / failed / slow) in autonomous-defaults, referenced from the four dispatch sites; wall-clock budget; "size is not liveness"

### Out of Scope

❌ Gate rule changes (rule 4 stays) · ❌ new report schemas

## 5. Breaking Changes

None. A CONCERNS/empty gate now reaches 5c instead of halting — intended; CHANGELOG.

## 6. Implementation Plan

1. §5c/§5b wording; extend the eval that pins the accepting-route set —
   `evals/shared/tests/pr-review-loop-parity.test.mjs` ("a clean QA gate routes to 5c", ≈116–133),
   which today asserts only the `PASS`/`WAIVED` arms — with the CONCERNS-with-empty-`top_issues[]` arm.
2. Step 3b/10/13 pre/post-conditions in qa-task and qa-story (same text, both files; parity test).
3. Boundary trigger paragraph in Step 3b, pointing at `probe-boundary-rule.md`; `probes_executed`
   on the finding block.
4. Platform-variance paragraph + the one-line reproduction command.
5. Subagent rows in autonomous-defaults; four dispatch sites gain a pointer.
6. Bundle; suite; mutation-prove the route test.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `shared/resources/develop-pipeline-step-5-6-qa-loop.md` | §5b/§5c |
| `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` | 3b / 1.6 (post-condition, boundary rule, platform variance), 3c / Mutation-Proof (platform pointer), 10 / Output 2 (gate precondition), 13 / Post QA Summary (publish precondition) |
| `shared/resources/code-review-prompt.md` | platform-variance category |
| `shared/resources/develop-pipeline-autonomous-defaults.md` | §Subagents — unavailable / failed / slow table, wall-clock budget, size-is-not-liveness |
| `shared/resources/develop-pipeline-step-3-develop-loop.md`, `skills/review-task/SKILL.md`, `skills/review-story/SKILL.md`, `skills/qa-fix/SKILL.md` | dispatch-site pointers to §Subagents |
| `evals/develop-task/step-isolation/09-qa-concerns-empty-gate-routes-to-5c/` (new) | replay fixture — CONCERNS / empty `top_issues[]` routes to 5c, no qa-fix |
| `skills/*/references/` (bundled) | regenerated by `npm run bundle` — qa-task / qa-story gain `probe-boundary-rule.md`, `security-input-corpus.{md,mjs}`, `finalise-dod-security-prompt.md`; qa-fix / review-task / review-story gain the autonomous-defaults closure |
| `evals/shared/tests/pr-review-loop-parity.test.mjs` | route 3 assertion (extend) |
| `evals/shared/tests/qa-gate-preconditions-parity.test.mjs` (new) | qa-task ↔ qa-story parity for the 3b/10/13 sentences |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Protocol shape tests for the new route and preconditions; qa-task/qa-story parity test; a replay
fixture with a CONCERNS/empty gate routing to 5c.

## 9. Success Criteria

1. A `CONCERNS` gate with empty `top_issues[]` reaches 5c; 5b is entered only on an open finding
2. qa-task/qa-story cannot write a gate while a dispatched review is outstanding, and cannot publish one
3. Step 3b executes candidates when the boundary rule fires, reporting `probes_executed`
4. The platform-variance check and its command are in Step 3b/3c and the review prompt
5. Autonomous-defaults names unavailable / failed / slow with the substitute and the record required; "output-file size is not a liveness signal" appears at every dispatch site
6. Observations #17, #20, #44, #51, #56, #62 close naming this PR

## 10. Risk Assessment

**Medium.** Waiting on a background reviewer lengthens cycles; bound it with the wall-clock budget
from item 5 and record `killed at N minutes`, never `stalled`.

## 11. Rollback Plan

`git revert` + bundle.

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
| 2026-09-13 | 1.1     | Review passed (8/10) — eval pointer corrected to `pr-review-loop-parity.test.mjs`, Files Summary eval row rewritten, install-path refs → `skills/`, GitHub issue #403 linked | review-task |
| 2026-09-13 |         | Status → ready-for-development                | review-task |
| 2026-09-13 |         | Implemented — 12 source files + bundled references, 2 test files (10 new assertions) + 1 replay fixture; ci:fast 3266/3266 | develop |

---

## Progress Tracking

### Phase 1: routes
- [x] §5c names the third accepting route (CONCERNS with empty `top_issues[]`); 5b's entry condition keys on open findings, not the verdict token
### Phase 2: preconditions
- [x] qa-task/qa-story Step 3b ends when the findings block is in hand; Step 10 refuses to write a gate while a dispatched review is outstanding; Step 13 refuses to publish
### Phase 3: what QA runs, not reads
- [x] Step 3b applies `probe-boundary-rule.md` after the diff review; boundary deliverables get executed candidates on the existing finding shape
- [x] Platform-variance check for env-derived fixture paths passed to a validating process (`TMPDIR=/tmp node --test …`)
### Phase 4: subagents
- [x] `develop-pipeline-autonomous-defaults.md` gains the unavailable / failed / slow rows: inline substitute + recorded independence loss; a wall-clock budget; output-file size is not a liveness signal

---

## References

- **Plan**: [`task.116.plan.qa-loop-routes-and-preconditions.md`](task.116.plan.qa-loop-routes-and-preconditions.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #17, #20, #44, #51, #56, #62
- **Related**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5b/§5c; `skills/qa-task/`, `skills/qa-story/`; `shared/resources/probe-boundary-rule.md`; `shared/resources/develop-pipeline-autonomous-defaults.md`
- **Second site of the verdict-vs-queue substitution**: task.113 (develop-next merge gate)

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.116.qa-loop-routes-and-preconditions/task.116.qa-loop-routes-and-preconditions.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
