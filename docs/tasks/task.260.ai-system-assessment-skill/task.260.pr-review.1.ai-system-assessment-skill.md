# PR Review Report: PR #837 — feat(task.260): add ai-system-assessment skill

**Reviewed:** 2026-11-04
**PR:** [#837](https://github.com/Gamaroff/agent-skills/pull/837) — `feature/task.260.ai-system-assessment-skill` → `develop` (OPEN)
**Work item:** [`task.260.ai-system-assessment-skill.md`](./task.260.ai-system-assessment-skill.md) — resolved via `branch stem` (called from Step 5c)
**Tracker:** [#834](https://github.com/Gamaroff/agent-skills/issues/834) — open
**Verdict:** ⚠️ CONCERNS

Review scope: conformance lens only (`--no-code`; the code lens ran in QA cycles 1 and 2). Run inline, not by an independent subagent, so the independence of this review is reduced. Auto-generated `references/` copies were not reviewed.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.260.implementation.1.ai-system-assessment-skill-initial-run.md |
| Review report | ✅ | task.260.review.1.ai-system-assessment-skill.md |
| QA reports | 2 | task.260.qa.1…, task.260.qa.2… |
| Gate | PASS | task.260.gate.2.ai-system-assessment-skill.yml (96) |
| DoD | ❌ | not yet written (Step 7) |
| Sprint review | ❌ | not yet written (Step 7) |
| Open bugs | 0 | task.260.bug.1 is Closed |
| Handover | ❌ | not yet written (Step 7) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Report with rating, evidence, gaps per principle | `skills/ai-system-assessment/assets/report.template.md`, template-slot test | ✅ met |
| Every rating cites `path:line` or command, else Unverified | `skills/ai-system-assessment/references/rubric.md`, SKILL.md rule 2 | ✅ met |
| A Gap lists the locations searched | rubric.md "Gap versus Unverified" | ✅ met |
| No write to the target; QA records `git status --porcelain` before and after the Consumer Test run, differing only by the report file | tree-hash test; QA reports record the signal run only | ⚠️ partial (PC-1) |
| Roadmap orders by value per effort, names a closing artefact | `assets/roadmap.template.md`, roadmap-columns test | ✅ met |
| SKILL.md names checklists by path, at most 300 lines | `SKILL.md` (58 lines), length test | ✅ met |
| Report written to a single file in one run; Consumer Test records the file's path in the QA report | SKILL.md Output section; no QA report records a report path | ⚠️ partial (PC-1) |
| `CI=true npm test` passes with the glob listed | `package.json` glob added; full run recorded at 5c below | see note |
| `npm run validate` passes | QA cycle 2: `validate:all` exit 0 | ✅ met |
| Mutation proving recorded in the QA report | QA report 1, four proofs | ✅ met |
| Tests assert behaviour, not SKILL.md strings | test file reads the fixture and runs the signals | ✅ met |
| Named in `commands.md` and `activation-phrases.md` | both diffs | ✅ met |
| `bundle:check` and `check:generated` clean | pipeline Step 3 gate | ✅ met |
| Consumer Test run recorded in the QA report | QA report 1 table | ✅ met |

## Conformance Findings

[PC-1] coverage · medium · confidence: high — docs/tasks/task.260.ai-system-assessment-skill/task.260.qa.2.ai-system-assessment-skill.md
  Two Success Criteria ask the QA report to record the Consumer Test's output file path, and `git status --porcelain` before and after a run that differs only by the report file. The Consumer Test run in the QA reports executed the signal tables only; no assessment report was written, so no path exists to record and the before/after differs by nothing.
  → Write a report for this repository to a user-named path outside the repository, record that path and the before/after `git status --porcelain` in the QA report.

[PC-2] consistency · low · confidence: high — docs/tasks/task.260.ai-system-assessment-skill/task.260.ai-system-assessment-skill.md
  The Success Criteria checkboxes in the work item still read `[ ]` while its status is `ready-for-review`.
  → Left for `/finalise`, which owns the acceptance edit.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 2 checked against `origin/feature/task.260.ai-system-assessment-skill` (via `origin/<head-branch>`) — all verified (artifact path and frontmatter-free refs, no line anchors).

## Machine-Readable Findings

```yaml
reviewed_gate: task.260.gate.2.ai-system-assessment-skill.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "docs/tasks/task.260.ai-system-assessment-skill/task.260.qa.2.ai-system-assessment-skill.md"
    anchor_check: ok
    finding: "Two Success Criteria need the QA report to record the Consumer Test's report file path and a before and after git status, but the run wrote no report so neither exists."
    suggested_action: "Write the assessment report for this repository to a path outside the repository and record that path and the before and after git status in the QA report."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.260.ai-system-assessment-skill/task.260.ai-system-assessment-skill.md"
    anchor_check: ok
    finding: "Success Criteria checkboxes are unticked while the status reads ready-for-review."
    suggested_action: "Leave for finalise, which owns the acceptance edit."
truncated_count: 0
```

## Recommended Actions

1. Fix PC-1: produce the repository assessment report and record its path and the status before and after in a QA report.
