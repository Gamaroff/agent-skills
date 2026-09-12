---
id: task.113
title: "[Task 113] develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item"
type: task
description: "Six observations (#13, #30, #31, #34, #35, #46) record that develop-next Step 4 'Tick the roadmap' has no branch for a registry-sourced selection — now the default path, since no phase is open. task.103 closed most of it from finalise (registry-tick.js writes the Status cell), so the remedy the early observations propose is stale: what remains is the notes/PR and issue cells, the step's title and commit convention, and the empty-tick case. Two adjacent gaps ride along: the merge gate blocks on the literal PASS token when finalise has already accepted a CONCERNS gate with no findings (#52), and the work-started signal skipped at Step 1 for a fresh item is never re-fired after Step 2 creates the issue (#53)."
tags: [develop-next, develop-batch, pipeline, tracker]
category: refactoring
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 5
github_issue: 397
---

# Technical Task: develop-next's Step 4, merge gate and Step 1→2 signal still assume a roadmap-sourced, PASS-gated item

**Status:** Ready for Review
**GitHub Issue**: [#397](https://github.com/Gamaroff/agent-skills/issues/397)
**Review**: ✅ All review recommendations from `task.113.review.1.develop-next-registry-bookkeeping.md` implemented 2026-09-12

---

## 1. Overview

Three bookkeeping gaps in the orchestrator, all of the same shape: a step written when the only
input was a roadmap row and the only good gate was `PASS`, left unchanged when selection widened to
the registries and `/finalise` learned to accept a CONCERNS gate with no open findings.

**Scope**: `skills/develop-next/SKILL.md` Steps 3 and 4, the `develop-batch` merge-and-tick step,
`shared/resources/develop-pipeline-step-2-review.md`, and an additive `--annotate` mode on
`shared/resources/registry-tick.js` so the registry write is a tested command rather than a sed.

## 2. Motivation

### Current Problems

1. **Step 4 is roadmap-only, and the registry path is now the default.** Tasks 98, 100, 101, 106
   and 107 were all selected via the registry fallback; every run improvised the same registry tick
   and wrote a near-identical commit message explaining why there was no roadmap row (#30, #31,
   #34, #35). Since task.103, `/finalise` writes the Status cell — so a Step 4 registry writer must
   be **additive** (notes/PR, issue cell), never a second Status writer (#46). The 2026-09-12 sweep
   settled the roadmap-row question: registry items get no roadmap row. Step 4 still says nothing.
2. **The merge gate re-reads the gate token with less information than `/finalise` had.** Step 3
   requires `PASS`; QA rule 4 yields `CONCERNS` on any NFR concern with `top_issues: []`, and
   `/finalise`'s matrix accepts that. task.105 was blocked at 90/100, accepted, CI 5/5, on the
   literal token (#52). `WAIVED` is not mentioned at all.
3. **The work-started signal has a guard that becomes true one step after it is checked.** For a
   freshly authored item `TRACKER_ISSUE` is empty at Step 1, so 0c-reg is skipped; Step 2's linkage
   check creates the issue; nothing re-fires the signal. The card sits in the first column and the
   pipeline-start comment is never posted (#53, task.106 — fixed by hand).

### Benefits

1. The durable, committed record of a run stops depending on who ran it.
2. Honest CONCERNS gates stop being punished, so QA keeps recording them.
3. Tracker cards move when work starts, on the normal path.

## 3. Technical Background

- `skills/develop-next/SKILL.md` Step 1 already records `item.source` on every selection (≈99-104).
  Step 4 (≈"Tick the roadmap") edits `<roadmapPath>` only. Step 3 "Verify green" (≈133) reads
  the gate token.
- `shared/resources/registry-tick.js` (task.103) — the Status writer; returns `not-a-task` for
  non-task documents; every outcome exits 0. It already owns the row locator (`| N |` at line
  start) and the cell-splitting; the annotate mode below extends it rather than duplicating either.
- **Registry column shapes** (read them, do not assume a "Notes" column exists):
  - `docs/tasks/task-registry.md`: `# | Title | Status | Category | Priority | Created | Issue | Depends on`.
    The 7th cell (`Issue`) holds the tracker link (`[#N](url)` or `—`); the 8th (`Depends on`) is
    the de-facto notes cell — rows 100–106 carry `… · PR #M merged` there, appended after whatever
    the cell already held (a lone `—` is replaced, not appended to).
  - `docs/bugs/bug-registry.md`: `# | Title | Status | Severity | Priority | Created | Area`. **No
    Issue cell, no notes cell.** `develop-bug` flips Status to `closed`; there is nothing for the
    orchestrator to add, and the registry arm must say so rather than invent a cell.
- `docs/development/project-completion-roadmap.md` — Change Log row 2026-09-12 (Housekeeping item 1):
  registry-selected items need no roadmap row and no roadmap Change Log row.
- The tracker issue for a fresh task is created **inside `/review-task`** (its Step 2 check 5 →
  `ensure-task-github-issue` / `ensure-task-jira-issue`), which writes `github_issue:` / `jira_key:`
  into the document. `shared/resources/develop-pipeline-step-2-review.md` is the orchestrator step
  that *invokes* `/review-task`; its `TRACKER_ISSUE` was captured at Phase 0c and is never re-read,
  and the pipeline lock's `tracker_issue` (read by the PreCompact/Stop hooks) is stale the same way.
  `develop-pipeline-step-0-resolve-and-prepare.md` §0c-reg is the signal procedure (idempotent:
  comment marker → `already`; `gh-stage.js`/`jira-stage.js` exit 0 on `already`).
- `skills/develop-batch/SKILL.md` — the serial merge-and-tick step, same duty.

## 4. Scope

### In Scope

✅ Step 4 renamed source-neutrally ("Record the acceptance"); `item.source` branch: roadmap
(unchanged) / `task-registry` (append `· PR #M merged` to the 8th cell, fill the `Issue` cell when
the run created an issue and the cell is `—`; `docs(registry): record <id> — PR #M merged` commit;
**no** Status write, **no** roadmap row, **no** roadmap Change Log row) / `bug-registry` (no cell
to write — report it and skip the commit); the empty-tick / re-run case reports `already`
✅ The registry write is an **engine call, not prose**: `registry-tick.js --annotate --pr <n>
[--issue <ref>]` (new mode; reasons `annotated | already | no-cell | no-row | no-registry |
not-a-task`, all exit 0, `--json`), reusing the existing row locator. Finalise keeps the Status
write; develop-next calls the annotate mode. One file owns the row.
✅ Step 3 precondition: `accepted` ∧ gate ≠ `FAIL` ∧ no `open` entry in `top_issues[]`; `WAIVED` named;
head-SHA and quality-gate clauses kept. The step carries this matrix verbatim:

| Document `status` | Gate decision | `top_issues[]` has an `open` entry | Action |
| :--- | :--- | :--- | :--- |
| `accepted` | `PASS` | — (none) | merge |
| `accepted` | `CONCERNS` | no | merge |
| `accepted` | `WAIVED` | no | merge (the waiver is a recorded human decision) |
| `accepted` | `CONCERNS` / `WAIVED` | **yes** | HALT — an open finding survived finalise |
| `accepted` | `FAIL` | any | HALT |
| not `accepted` | any | any | HALT — finalise did not accept |
| `accepted` | gate file missing / unparseable | — | HALT — cannot establish the no-open-finding condition |

✅ Step 2 doc: after `/review-task` (or `/review-story`) returns, **re-read** `github_issue:` /
`jira_key:` from the document; if `TRACKER_ISSUE` was empty at Step 1 and is now set, update
`tracker_issue` in `.claude/state/develop-pipeline.lock` and run 0c-reg once (comment + board move
+ priority default). A second run reports `already` from both the comment marker and the stage CLI.
✅ `develop-batch` mirror; eval/protocol tests updated (`evals/develop-next/protocol/skill-shape.test.mjs`
and the batch sibling assert step shapes)

### Out of Scope

❌ Any selector change · ❌ making `--batch` registry-aware (documented as deliberate)

## 5. Breaking Changes

None to consumers. A run's Step 3 will now merge an `accepted` + `CONCERNS`/`WAIVED` item it
previously halted on — the intended behaviour, stated in CHANGELOG.

## 6. Implementation Plan

1. Read the six observations together and #46 first; write Step 4's registry branch from what
   remains after task.103, not from the early proposals.
2. Step 3 wording; enumerate the gate/document combinations in a small table in the step.
3. Step 2 re-fire conditional; confirm idempotence by reading 0c-reg's marker handling.
4. develop-batch mirror; update the protocol tests that pin step shapes; mutation-prove one
   (remove the registry branch → the shape test reds).
   Before 1: add the `--annotate` mode to `registry-tick.js` with its fixture tests — the prose in
   Step 4 then calls a command that a test has already exercised, instead of describing a sed.
5. Verify against a real run: this task is itself registry-sourced, so the `/develop-next` run that
   develops it exercises the new Step 4 on row 113 — record that Step 4 output (and the Step 2
   re-fire, since row 113 had no issue at Step 1) in the implementation report. `develop-batch`'s
   mirror is verified by its shape test only; no batch run is in scope.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/develop-next/SKILL.md` | Steps 3 (matrix), 4 (rename + `item.source` branch) |
| `skills/develop-batch/SKILL.md` | Step 3 serial lane: gate matrix + registry arm mirror; "Tick the roadmap immediately" wording |
| `shared/resources/registry-tick.js` | `--annotate --pr <n> [--issue <ref>]` mode + reasons; bundled copies regenerate via `npm run bundle` |
| `shared/resources/tests/registry-tick*.test.mjs` (or the existing registry-tick suite) | annotate fixtures: task row (append / replace `—` / already / fill Issue), bug document → `not-a-task`, missing row |
| `shared/resources/develop-pipeline-step-2-review.md` | post-review re-read + conditional 0c-reg re-fire (bundles into develop-story/task) |
| `evals/develop-next/protocol/skill-shape.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs` | shape assertions for the branch, the matrix and the annotate call, each with a non-vacuity floor |
| `docs/standards/task-registry.md` | name the annotate mode as the second (additive) writer |
| `CHANGELOG.md` | Changed |

## 8. Testing Strategy

Protocol shape tests for the new step text (with a floor); fixture tests for
`registry-tick.js --annotate` against a scratch registry file (append, replace `—`, `already` on
re-run, `Issue` fill, bug document → `not-a-task`, missing row → `no-row`); mutation of each new
clause reds its assertion by name. The gate matrix is asserted row-by-row (each `HALT` row and each
`merge` row present) so a later edit cannot drop a row silently.

## 9. Success Criteria

1. Step 4 contains an explicit `item.source` branch; the `task-registry` arm calls `registry-tick.js --annotate` (8th cell + `Issue` cell only, never Status), the `bug-registry` arm records that there is no cell to write, and the re-run case reports `already`
2. Step 3 merges an `accepted` document with a `CONCERNS` or `WAIVED` gate that has no open findings, and still halts on `FAIL` or an open finding
3. Step 2 re-reads the tracker key after the review returns, updates the lock's `tracker_issue`, and re-fires 0c-reg when the key was empty at Step 1; a second run reports `already`
4. `develop-batch` carries the same branch
5. Observations #13, #30, #31, #34, #35, #46, #52, #53 close with this task's PR named (an observation-log action, performed after merge via `observation-log.js set-status`; not part of the PR diff)

## 10. Risk Assessment

**Medium.** Step 3 is the merge gate; loosening it wrongly merges bad work. Mitigation: the
loosening is only from "PASS token" to "finalise's verdict + no open finding", which is strictly
more information, and `FAIL` still halts.

## 11. Rollback Plan

`git revert`; the old Step 3/4 text returns. No state.

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
| 2026-09-12 | 1.1     | Review passed (8/10) — registry column shapes named (no Notes column; bug-registry has no cell), registry write moved onto a `registry-tick.js --annotate` mode, Step 3 gate matrix specified, Step 2 re-fire re-reads the key and updates the lock, B13 verification target replaced | review-task |
| 2026-09-12 |         | Status → ready-for-development | review-task |
| 2026-09-12 |         | Implemented — 12 files (engine mode + 11 fixtures, 2 orchestrator SKILLs, step-2 doc, 3 shape suites, standard, CHANGELOG), 3222 tests green, 9 mutations proven | develop |
| 2026-09-12 |         | QA gate CONCERNS (70/100) — 4 medium, 4 low findings | qa-task |
| 2026-09-12 |         | QA findings fixed — QA-1…QA-6 all addressed, 1 iteration; 6 mutations proven | qa-fix |
| 2026-09-12 |         | QA gate CONCERNS (80/100) — cycle 2 refute pass: 6/6 fixed, 1 medium + 4 low new | qa-task |
| 2026-09-12 |         | QA findings fixed — QA-7…QA-11 + 3 cleanups, 2 iterations total; 7 mutations proven | qa-fix |
| 2026-09-12 |         | QA gate CONCERNS (85/100) — cycle 3: 5/5 fixed, 1 medium (staged-edit half of the crash window) + 2 low new | qa-task |
| 2026-09-12 |         | QA findings fixed — QA-12…QA-14, 3 iterations total; 4 mutations proven | qa-fix |

---

## Implementation Notes

**Implementation Summary** (2026-09-12): the registry write became an engine mode
(`registry-tick.js --annotate`), and the three orchestrator steps were rewritten to branch on facts
the pipeline already had — `item.source`, `/finalise`'s `accepted` verdict, and the tracker key as
it stands after the review — instead of on the shape of the first run that exercised them.

**Approach**:
- Phase 1a — `shared/resources/registry-tick.js` gains `--annotate --pr <n> [--issue <ref>]`.
  Notes cell is the row's **last** cell by position (`no-cell` guard below five cells); Issue cell
  is found by header **name** with no positional fallback (a wrong Issue cell is a corrupted
  link). `--issue` never overwrites a filled cell (`kept`). Status is never read or written in this
  mode; the annotate call does not require `accepted` (a merge is a fact about the PR). Reasons:
  `annotated | already | no-cell | no-row | no-registry | not-a-task`, all exit 0; `--annotate`
  without `--pr` and `--pr` without `--annotate` are usage errors (exit 2). The selector's
  `COLUMN_ALIASES` was deliberately **not** extended (out of scope); the header is read locally.
- Phase 1 — `skills/develop-next/SKILL.md` Step 4 → "Record the acceptance" with three
  `### item.source` arms; the roadmap arm is the previous text verbatim. `develop-batch` Step 3
  lane mirrors the matrix and the three arms (its `--batch` still selects from the roadmap only,
  stated in place).
- Phase 2 — Step 3 first bullet replaced by the seven-row matrix; head-SHA and quality-gate clauses
  kept and named as commit-bound.
- Phase 3 — `shared/resources/develop-pipeline-step-2-review.md` gains "Re-read the Tracker Key"
  between the review invocation and outcome detection: captures the Step 1 value, re-reads
  `github_issue:`/`jira_key:`, updates the lock's `tracker_issue` with `jq`, and points at 0c-reg
  rather than restating it. Bundled into develop-story and develop-task.
- Tests: 11 annotate fixtures in `shared/resources/tests/registry-tick.test.mjs` (the flag-list
  guard updated with the argument for the three new flags); 5 shape tests in
  `evals/develop-next/protocol/skill-shape.test.mjs` (matrix rows asserted individually with a
  floor of 7; the old PASS clause asserted *absent*); 2 in the batch sibling; 1 in
  `evals/develop-task/protocol/step-contract.test.mjs`.

**QA fix cycle 1** (2026-09-12): QA-1 array-expanded `--issue`; QA-2 `--issue` validated (missing/flag-shaped/empty/`|`/CR/LF → exit 2); QA-3 `no-cell` resolved from the row's own header via `findHeader()` + `DATA_COLUMN_NAMES`; QA-4 waiver clause in both matrices; QA-5 `GITHUB_ISSUE` set after the null reset; QA-6 header walk bounded to the row's own table (stops at the first non-table line; separator must be a table row) — the selector's regex is still not imported, deliberately: the task rules out selector changes and this walk answers a narrower question. Six further mutations proven.

**QA fix cycle 2** (2026-09-12): QA-7 `already` now checks `git diff --quiet` on the registry and commits a pre-crash edit before `ticked: true` (both orchestrators); QA-8 annotate refuses a row that does not read `accepted` (`not-accepted`) — the notes cell is the `Depends on` cell `parseDepCell` reads, so a note on a non-accepted row is a phantom dependency; QA-9 run-state schema gains `source`, named as what Step 4 reads on resume; QA-10 `findHeader` accepts any GFM delimiter row; QA-11 every exit-0 reason enumerated; CR-6 dead `undefined` branch removed; CR-7 the tick path calls `setCell()`; CR-8 CHANGELOG count replaced with the cycle summary. Seven mutations proven.

**QA fix cycle 3** (2026-09-12): QA-12 `git diff --quiet HEAD -- …` in both orchestrators (a staged edit was invisible to the index diff); QA-13 `emit()` normalises the payload key per mode; QA-14 `EMPTY_CELL_RE` mirrors the selector's `DEP_EMPTY_RE`. Four mutations proven.

**Mutations proven (9)**: engine — Issue overwrite guard removed, `already` guard removed, append
replaced by overwrite, annotate routed into the tick path; prose — registry arm deleted, `FAIL`
matrix row deleted, old PASS clause restored beside the matrix, step-2 conditional replaced with
`true`, batch bug-registry arm deleted. Each reddened the assertion that names it.

**Verification against a real run** (plan step 5): this task's own pipeline was registry-sourced
(`item.source: task-registry`) and had no issue at Step 1; the Step 2 re-fire was applied by hand
after `/review-task` created #397 — comment `posted`, board `transitioned`, second call `already`.
The Step 4 annotate call was dry-run against row 113 (`notes written, issue written`) and will run
for real after merge; its output belongs in the implementation report.

**Deferred**: none. Observation closures (SC5) happen after merge, outside the diff.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-12
**Quality Score**: 85/100 (cycle 3; cycles 1–2: 70, 80)
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.113.qa.3.develop-next-registry-bookkeeping.md](./task.113.qa.3.develop-next-registry-bookkeeping.md) (earlier: [qa.1](./task.113.qa.1.develop-next-registry-bookkeeping.md), [qa.2](./task.113.qa.2.develop-next-registry-bookkeeping.md))
- **Gate File**: [task.113.gate.3.develop-next-registry-bookkeeping.yml](./task.113.gate.3.develop-next-registry-bookkeeping.yml) (earlier: [gate.1](./task.113.gate.1.develop-next-registry-bookkeeping.yml), [gate.2](./task.113.gate.2.develop-next-registry-bookkeeping.yml))

### Test Coverage Summary
- **Tests Executed**: 93 targeted (3221 full fast gate)
- **Phases Verified**: 5/5
- **Critical Issues**: 0 (4 MEDIUM, 4 LOW)
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Bug Reports
- [Bug 1: zsh `:+` expansion](./task.113.bug.1.zsh-conditional-issue-flag.md) — ✅ Closed (verified QA cycle 2)
- [Bug 2: `--issue` unvalidated](./task.113.bug.2.annotate-issue-cell-injection.md) — ✅ Closed (verified QA cycle 2)
- [Bug 3: `no-cell` guard unreachable](./task.113.bug.3.no-cell-guard-ineffective.md) — ✅ Closed (verified QA cycle 2)
- [Bug 4: `WAIVED → merge` unreachable](./task.113.bug.4.waived-row-unreachable.md) — ✅ Closed (verified QA cycle 2)
- [Bug 5: `already` strands an uncommitted registry edit](./task.113.bug.5.already-strands-dirty-registry.md) — ✅ Closed (verified QA cycle 3)
- [Bug 6: the dirty check misses a staged edit](./task.113.bug.6.staged-edit-reads-clean.md) — ✅ Ready for QA (fixed 2026-09-12)

### Key Findings
Cycle 3: QA-7…QA-11 FIXED; new QA-12 — `git diff --quiet` without `HEAD` misses a staged edit (the other half of bug 5's window), QA-13 payload shape, QA-14 empty-cell spellings.
Cycle 2: QA-1…QA-6 all FIXED (verified by execution); new QA-7 `already` strands a pre-crash registry edit (medium), QA-8 phantom dependency via the notes cell on a non-accepted row, QA-9 run-state `source`, QA-10 GFM separator, QA-11 reason enumeration.
Cycle 1: QA-1 zsh word-split in the Step 4 `--issue` expansion; QA-2 `--issue` unvalidated (missing/empty/`|`/newline); QA-3 `no-cell` guard unreachable — a 6-column registry gets a data cell annotated; QA-4 the `WAIVED → merge` matrix row is unreachable under qa-gate's schema. Bug reports 1–4 co-located.

---

## Progress Tracking

### Phase 1: Step 4 branches on `item.source`
- [x] `registry-tick.js --annotate` mode + fixture tests (8th cell + `Issue` cell; `already`; `not-a-task` for bug docs)
- [x] Registry branch in Step 4: calls the annotate mode; commit convention; bug-registry no-cell case and re-run `already` case named
- [x] `develop-batch` merge-and-tick step mirrors it
### Phase 2: merge gate
- [x] Step 3 keys on `accepted` + not `FAIL` + no open `top_issues[]`; `WAIVED` named; the matrix is in the step verbatim (develop-next and develop-batch)
### Phase 3: work-started re-fire
- [x] Step 2 doc: re-read the key after `/review-*` returns; if `TRACKER_ISSUE` was empty at Step 1 and is now set, update the lock and run 0c-reg once

---

## References

- **Plan**: [`task.113.plan.develop-next-registry-bookkeeping.md`](task.113.plan.develop-next-registry-bookkeeping.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #13, #30, #31, #34, #35, #46 (re-scope), #52, #53
- **Related Skill**: `.agents/skills/develop-next/`, `.agents/skills/develop-batch/`; `shared/resources/develop-pipeline-step-2-review.md`
- **Already landed**: task.103 — `/finalise` ticks the registry Status cell via `registry-tick.js`

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.113.develop-next-registry-bookkeeping/task.113.develop-next-registry-bookkeeping.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
