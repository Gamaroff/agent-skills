# PR Review Report: PR #675 — feat(task.204): numbered PRDs in the PRD skills

**Reviewed:** 2026-10-15
**PR:** [#675](https://github.com/Gamaroff/agent-skills/pull/675) — `feature/task.204.numbered-prds-in-prd-skills` → `develop` (OPEN)
**Work item:** [`task.204.numbered-prds-in-prd-skills.md`](./task.204.numbered-prds-in-prd-skills.md) — resolved via `branch stem`
**Tracker:** [#647](https://github.com/Gamaroff/agent-skills/issues/647) — OPEN
**Verdict:** ⚠️ CONCERNS

Effort `medium`, `--no-code` (Step 5c, after the QA loop escalated; the maintainer chose to accept via
this review). Scope: `origin/develop...origin/feature/task.204.numbered-prds-in-prd-skills` at
`687560bb`, auto-generated `skills/*/references/*` excluded (five byte copies of
`shared/resources` sources that are themselves in the diff: create-prd, review-prd and shard-prd
`doc-id.js`, review-prd `doc-links.js` and `migrate-doc-numbering.mjs`).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.204.implementation.1.numbered-prds-in-prd-skills-initial-run.md |
| Review report | ✅ | task.204.review.1.numbered-prds-in-prd-skills.md |
| QA reports | 8 | task.204.qa.1 … qa.8 |
| Gate | CONCERNS | task.204.gate.8.numbered-prds-in-prd-skills.yml (50) |
| DoD | ❌ | not yet — /finalise has not run |
| Sprint review | ❌ | not yet — /finalise has not run |
| Open bugs | 0 | — |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Covered by the conformance lens against the task's Success Criteria; the two criteria it found only
partly met are PC-1 and PC-2 below. All other criteria trace to rows of
`evals/shared/tests/prd-skill-numbering.test.mjs` (40 rows) or to the block they describe.

## Conformance Findings

```
[PC-1] coverage · medium · confidence: medium — docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.numbered-prds-in-prd-skills.md:462
  The Migration criterion promises every consumer holding docs/prd.md a Critical finding plus a
  migration offer, but since 63c1e06b the migration guard withholds the offer for no-frontmatter and
  outside-links shapes; the task document does not record the narrowing.
  → Amend the criterion with a note naming the guard's refusals until the engine follow-up lands.

[PC-3] trail · medium · confidence: high — docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.implementation.1.numbered-prds-in-prd-skills-initial-run.md:293
  The highest QA cycle entry reads "Escalating — loop limit reached", not "Proceeding to 5c", and
  63c1e06b (the fix for gate 8's five open mediums) has not been read by any gate.
  → Record the maintainer's accept-at-5c decision, and the check it rests on, in the implementation report.

[PC-4] trail · medium · confidence: high — docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.gate.8.numbered-prds-in-prd-skills.yml:100
  Gate 8's condition is "CR-1..CR-5 closed or moved to a follow-up task", but no follow-up task
  exists for the deferred engine fixes (frontmatter creation, outside-link prefilter, domain prompt).
  → Create the follow-up task with /create-task and cite it before /finalise.

[PC-2] coverage · low · confidence: high — docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.numbered-prds-in-prd-skills.md:445
  The criterion's git grep matches 27 fixture lines in prd-skill-numbering.test.mjs besides the
  legacy-detection lines, so its literal "returns only" check fails.
  → Add the test file to the criterion's exclusion list.

[PC-5] scope · low · confidence: high — shared/resources/migrate-doc-numbering.mjs:922
  The migration engine is changed (token-pass stem filter; TEST_FILE_EXCEPTIONS literal) though the
  task lists it as Out of Scope; the deviation is recorded only in the implementation report.
  → Record both engine edits and their reasons in the task's Scope or Files Summary.
```

## Code Review Findings

Skipped (`--no-code`) — the QA loop ran the code reviewer on every cycle.

**Anchors:** 5 checked against `687560bb` (via `origin/feature/task.204.numbered-prds-in-prd-skills`) — all verified (`unchecked-text`)

## Machine-Readable Findings

```yaml
reviewed_gate: task.204.gate.8.numbered-prds-in-prd-skills.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.numbered-prds-in-prd-skills.md:462"
    anchor_check: unchecked-text
    finding: "The Migration criterion promises a migration offer for every docs/prd.md, but the guard now withholds it for no-frontmatter and outside-links shapes, unrecorded in the task."
    suggested_action: "Amend the criterion with a note naming the guard's refusals until the engine follow-up lands."
  - id: PC-3
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.implementation.1.numbered-prds-in-prd-skills-initial-run.md:293"
    anchor_check: unchecked-text
    finding: "The loop escalated rather than exiting to 5c, and 63c1e06b has been read by no gate."
    suggested_action: "Record the maintainer's accept-at-5c decision and its basis in the implementation report."
  - id: PC-4
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.gate.8.numbered-prds-in-prd-skills.yml:100"
    anchor_check: unchecked-text
    finding: "No follow-up task exists for the deferred migration-engine fixes gate 8's condition names."
    suggested_action: "Create the follow-up task with /create-task and cite it before /finalise."
  - id: PC-2
    category: coverage
    severity: low
    confidence: high
    ref: "docs/tasks/task.204.numbered-prds-in-prd-skills/task.204.numbered-prds-in-prd-skills.md:445"
    anchor_check: unchecked-text
    finding: "The docs/prd.md grep criterion also matches 27 fixture lines in the new test file."
    suggested_action: "Add the test file to the criterion's exclusion list."
  - id: PC-5
    category: scope
    severity: low
    confidence: high
    ref: "shared/resources/migrate-doc-numbering.mjs:922"
    anchor_check: unchecked-text
    finding: "The migration engine, listed as Out of Scope, is changed; the deviation is recorded only in the implementation report."
    suggested_action: "Record both engine edits and their reasons in the task's Scope or Files Summary."
truncated_count: 0
```

## Recommended Actions

1. Create the follow-up task for the migration-engine fixes and cite it (PC-4).
2. Record the accept-at-5c decision in the implementation report (PC-3).
3. Amend the task document: Migration criterion note (PC-1), grep exclusion (PC-2), engine edits in Scope (PC-5).
4. Then `/finalise`.
