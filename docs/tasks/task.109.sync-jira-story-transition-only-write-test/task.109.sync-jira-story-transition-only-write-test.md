---
id: task.109
title: "[Task 109] sync-jira-story's skipped-but-transitioned write gate has no run()-level test"
type: task
description: "When a story's body is unchanged but its status has moved, sync-jira-story must still write the file (the Status → row and jira_last_synced_at). The gate at sync-jira-story.js ≈1265-1272 does this correctly — a 2026-09-12 probe shows transitioned:true, file changed, row written — but no test names the path: the story end-to-end suite uses --no-transition zero times, so run 2 is always the transitioned:false skip. The epic sibling gained exactly this test in task.96. Mirror it."
tags: [testing, sync-jira-story, jira]
category: testing
status: planned
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-12
assignee:
estimated_effort_hours: 2
---

# Technical Task: sync-jira-story's skipped-but-transitioned write gate has no run()-level test

**Status:** Planned

---

## 1. Overview

`skills/sync-jira-story/scripts/sync-jira-story.js` has a write gate for the **skipped-but-transitioned**
run: the body diff is empty, so the PUT is skipped, but the frontmatter status moved and the
transition fired, so the file **must still be written** — the `Status → …` Change Log row and the
refreshed `jira_last_synced_at` are the record of that transition. The gate (≈1265-1272, the
`changeLogEntries.length > 0` arm) behaves correctly. Nothing tests it.

**Scope**: one end-to-end test in `skills/sync-jira-story/tests/end-to-end.test.js`, mutation-proved,
mirroring the epic sibling's `end-to-end.test.js:290` that task.96 added.

## 2. Motivation

### Current Problems

1. The 2026-09-07 handoff carried "missing `run()`-level tests" for both `sync-jira-story` and
   `sync-jira-epic`. task.96 (PR #343, same day) added `end-to-end.test.js` to both — but the story
   suite's only transition test (≈line 240) creates **and** transitions on run 1, so run 2 is the
   `transitioned:false` skip. `grep -c no-transition` → story e2e **0**, epic e2e 3.
2. A gate with no test is a gate a refactor can drop silently. The story engine is the one consumers
   hit most (every `/develop-story` Step 1 signal is a status-only sync).
3. The claim "sync writes the row on a status-only run" appears in the skill's description and in
   `docs/reference/pipeline-artifacts.md`; today it rests on a probe, not a test.

### Benefits

1. The remaining half of handoff follow-up 3c closes with evidence.
2. Parity between the two sibling suites — the same path is named in both.

## 3. Technical Background

### Current Architecture

- `skills/sync-jira-story/tests/end-to-end.test.js` — 5 tests through `makeRunner` → `mod.run({argv})`
  against `fake-jira.js`. Transition case at ≈240: run 1 `--quiet` (creates + transitions), run 2
  `--quiet` (skip, `transitioned:false`, no PUT, file unchanged).
- `skills/sync-jira-epic/tests/end-to-end.test.js:290` — "the skip path's --json timestamp matches
  the one written to the file": run 1 with `--no-transition`, run 2 plain; asserts
  `out.skipped === true`, `out.statusOutcome?.transitioned === true`, `jira_last_synced_at` written.

### Target Architecture

Same shape in the story suite, plus one assertion the epic test omits: the `Status → <name>` Change
Log row is present in the written file after run 2.

### Important Clarifications

Probe on 2026-09-12 with the suite's own fixture: run 1 `--quiet --no-transition`, run 2 `--quiet`
→ `changeSummary: "Sync (no field changes detected)"`, `transitioned: true`, `PUTs: 0`,
`file changed: true`, rows `… | Jira story created (PROJ-901) | …` and `… | Status → In Progress | …`.
So the behaviour is right; the task is only the test.

## 4. Scope

### In Scope

✅ One new test in the story e2e suite; a helper if `--no-transition` needs plumbing in `makeRunner`
✅ Mutation proof against the gate

### Out of Scope

❌ Any engine change
❌ The epic suite (already covered) · the task/bug syncs (different gates, not in the handoff item)

## 5. Breaking Changes

None. Test only.

## 6. Implementation Plan

1. Copy the epic test's shape; adapt fixture and field names for the story.
2. Add the `Status →` row assertion.
3. Mutation-prove: comment out the `changeLogEntries.length > 0` arm (or force it false), run the
   file, confirm **this** test fails and no other; restore.
4. Run the full story + epic suites; run `command npm test`.

## 7. Files Summary

| File | Change |
| :--- | :--- |
| `skills/sync-jira-story/tests/end-to-end.test.js` | +1 test |
| `.agents/handoff.md` | §3c closed |

## 8. Testing Strategy

`command node --test skills/sync-jira-story/tests/` before/after; mutation run recorded in the
implementation report with the exact line disabled and the failing test name.

## 9. Success Criteria

1. A test named for the path exists and passes: run 1 `--no-transition`, run 2 plain → `skipped:true`, `transitioned:true`, file changed, `Status →` row present
2. Mutation proof: disabling the gate arm fails that test, by name, and only that test
3. `command npm test` exit 0

## 10. Risk Assessment

**Low.** Additive test. The only trap is a vacuous pass — the mutation step exists for that.

## 11. Rollback Plan

Delete the test. Nothing else changes.

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
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 repo sweep | create-task |

---

## Progress Tracking

### Phase 1: the test
- [ ] `--no-transition` run 1 + plain run 2 case added to `skills/sync-jira-story/tests/end-to-end.test.js`
- [ ] Mutation-proved against the gate at `sync-jira-story.js` ≈1265-1272
### Phase 2: close the loop
- [ ] Handoff §3c and this task's registry row updated

---

## References

- **Plan**: [`task.109.plan.sync-jira-story-transition-only-write-test.md`](task.109.plan.sync-jira-story-transition-only-write-test.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Related Skill**: `.agents/skills/sync-jira-story/`, `.agents/skills/sync-jira-epic/` (the covered sibling)
- **Handoff item**: carried follow-up 3c since 2026-09-07

---

**Status:** Planned

**Next Steps**:
1. `/develop-task docs/tasks/task.109.sync-jira-story-transition-only-write-test/task.109.sync-jira-story-transition-only-write-test.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
