# PR Review Report: PR #447 — feat(task.125): finalise --bug, tolerant bug issue create, and an explicit fix_cycle for qa-fix (#425)

**Reviewed:** 2026-09-21
**PR:** [#447](https://github.com/Gamaroff/agent-skills/pull/447) — `feature/task.125.develop-bug-finalise-mode-and-issue-create` → `develop` (OPEN)
**Work item:** [`task.125.develop-bug-finalise-mode-and-issue-create.md`](./task.125.develop-bug-finalise-mode-and-issue-create.md) — resolved via `branch-stem`
**Tracker:** [#425](https://github.com/Gamaroff/agent-skills/issues/425) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope of the diff reviewed: 31 files / 4395 patch lines — the whole-branch diff with the 39 generated `*/references/*` bundled copies and the task's own QA artefacts (`docs/tasks/task.125.*/`) excluded, and develop-bug's five **authored** `references/` step docs added back (the path heuristic would otherwise have dropped the files the cycle-6 fix was about). Effort: medium, both lenses.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.125.implementation.1.develop-bug-finalise-mode-and-issue-create-initial-run.md` (uncommitted by design — Step 8 owns its final commit) |
| Review report | ✅ | `task.125.review.1.develop-bug-finalise-mode-and-issue-create.md` — READY TO IMPLEMENT 9/10 |
| QA reports | 11 | `task.125.qa.{1..11}.*.md` |
| Gate | PASS | `task.125.gate.11.develop-bug-finalise-mode-and-issue-create.yml` (100) — empty queue; QA Cycle 11 entry reads `Proceeding to 5c` |
| DoD | ❌ | absent — correct, Step 7 has not run |
| Sprint review | ❌ | absent — correct, same reason |
| Open bugs | 24 | `task.125.bug.{1..24}.*.md` — every fix verified by the cycle after it, but all 24 still read `Ready for QA` (PC-2) |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 `/finalise --bug` produces the DoD file, CI readings, PR comment; no Change Log row | `skills/finalise/SKILL.md` (kind block, skip table, 7.2/7.3/7.6a/7.6b/7.7), `assets/bug-dod-template.md`; `evals/shared/tests/finalise-bug-mode.test.mjs` (59 executed cases × bash + zsh) | ✅ met (PC-1: no end-to-end run) |
| SC2 Step 7 has no fallback paragraph | `skills/develop-bug/references/develop-bug-step-7-close-bug.md`; test "carries no inline DoD fallback" | ✅ met |
| SC3 A label absent from the repo never fails an issue create | `shared/resources/gh-labels.sh` + 9 call sites; `tests/gh-labels.test.js`, `tests/ensure-bug-label-tolerance.test.js` | ✅ met |
| SC4 Any `tracker-issue.js` failure carries gh's first line | `shared/resources/tracker-issue.js` (`withStdin` stderr pipe, `ghFailureArgv`); `tracker-issue.test.mjs` | ✅ met |
| SC5 verify loop posts `qa-fix-{N}` per cycle with no gate | `skills/qa-fix/SKILL.md` (both Step 7 blocks), `develop-bug-step-5-6-verify-loop.md`; `tests/qa-cycle.test.js` | ✅ met |
| SC6 One extra `gh label list` per create | `gh-labels.sh` | ✅ met |
| SC7 Skip list stated once; mutation-proved | finalise skip table + `parseSkipTable` test | ✅ met |
| SC8 observations close on merge | — | ⏳ on merge |

## Conformance Findings

```
[PC-2] trail · medium · confidence: high — task.125.bug.{1..24}.*.md `**Status**: ✅ Ready for QA`; gate.11 `bugs_fixed: 24 / bugs_remaining: 0`
  All 24 co-located bug reports still read Ready for QA and none carries a QA Verification section, while gate 11 and QA reports 2–11 record every one as verified FIXED — the trail shows 24 open bugs against a PASS gate.
  → Append the QA Verification section and set Closed on each (each was verified by the cycle after its fix); commit them with the Step 8 artefacts.

[PC-1] coverage · low · confidence: medium — §8 Integration Tests / qa.1:76
  The §8 item "/finalise --bug on bug.14's file in a scratch clone produces a DoD file matching the template's sections" is unticked; every cycle executed the blocks against fixtures and real reports, but no cycle ran the mode end to end.
  → Run /finalise --bug once against a copy of bug.14's file in a scratch clone and tick the item with the evidence.

[PC-3] trail · low · confidence: high — implementation report Pipeline Progress row "5–6. qa-task / qa-fix loop"
  The table still reads "In progress (resumed, budget 7) … 5 cycles … fix 03be14e5 ungated; 5c not reached", contradicting the Decisions Log and the QA Cycle 11 entry.
  → Refresh the row before the Step 8 commit.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/finalise/SKILL.md:1299
  The bug-mode 7.6b final assertion `grep -q '^## Verification Complete'` on the pushed DoD is satisfied by the template as written at Step 0, so a completed DoD and a template stub reach the same PASS.
  → Assert a state Step 7 must have written (e.g. `**Final Status:** ✅ ACCEPTED` on $DOD_PATH).

[CR-2] bug · low · confidence: medium — skills/finalise/SKILL.md:951
  Step 7.1 says to *append* a `## Verification Complete` section, but in bug mode the template already carries it and the running-summary marker says Steps 3d/7 *fill* it; 7.1 has no bug-mode marker, so a verbatim run produces a second heading and a second Final Status line.
  → Give 7.1 its own skip-table row/marker (fill the existing block, never append) and extend the once-only Final Status assertion to the written DoD.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.125.develop-bug-finalise-mode-and-issue-create/task.125.bug.{1..24}.*.md"
    finding: "All 24 co-located bug reports still read Ready for QA with no QA Verification section, while gate 11 records every one as verified fixed."
    suggested_action: "Append the QA Verification section and set Closed on each, verified by the cycle after its fix; commit with the Step 8 artefacts."
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "task.125.develop-bug-finalise-mode-and-issue-create.md:235"
    finding: "The §8 end-to-end integration test of /finalise --bug in a scratch clone is unticked; no cycle ran the mode end to end."
    suggested_action: "Run /finalise --bug once against a copy of bug.14's file in a scratch clone and tick the item with the evidence."
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "task.125.implementation.1.develop-bug-finalise-mode-and-issue-create-initial-run.md:39"
    finding: "The Pipeline Progress row for Steps 5–6 still describes the cycle-5 escalation state."
    suggested_action: "Refresh the row to 11 cycles, gate 11 PASS, 5c run, before the Step 8 commit."
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:1299"
    finding: "The bug-mode 7.6b assertion on ## Verification Complete is satisfied by the template's own heading, so a stub and a completed DoD reach the same PASS."
    suggested_action: "Assert a state Step 7 must have written, e.g. the filled Final Status line."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:951"
    finding: "Step 7.1 appends a Verification Complete section the bug template already carries; 7.1 has no bug-mode marker."
    suggested_action: "Add a 7.1 skip-table row/marker (fill, never append) and assert Final Status appears once in the written DoD."
truncated_count: 0
```

## Recommended Actions

1. **PC-2 / PC-3 — before Step 8**: close the 24 bug reports with their QA Verification sections (the cycle that verified each is on record in the QA reports' Re-Review Context tables) and refresh the report's progress row. Both are trail hygiene the orchestrator can do now.
2. **CR-1 / CR-2** (low, bug-mode finalise): a follow-up on the finalise skill together with gate 9–11's `recommendations.future` (reworded placeholder verdicts, unreadable-report diagnostic, the `newest_numbered` hoist, the orchestrator path-sort lookups) — one task, not a twelfth cycle here.
3. **PC-1** (low): an end-to-end `finalise --bug` run in a scratch clone is the one evidence shape this task never produced; run it once when the follow-up above lands.
