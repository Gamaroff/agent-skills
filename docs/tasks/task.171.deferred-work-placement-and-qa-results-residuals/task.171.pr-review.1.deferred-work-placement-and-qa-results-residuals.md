# PR Review Report: PR #568 — feat(task.171): Deferred Work home + qa-results engine residuals

**Reviewed:** 2026-10-05
**PR:** [#568](https://github.com/Gamaroff/agent-skills/pull/568) — `feature/task.171.deferred-work-placement-and-qa-results-residuals` → `develop` (OPEN)
**Work item:** [`task.171.deferred-work-placement-and-qa-results-residuals.md`](./task.171.deferred-work-placement-and-qa-results-residuals.md) — resolved via `branch stem`
**Tracker:** [#538](https://github.com/Gamaroff/agent-skills/issues/538) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.171…` (3427 lines). Excluded: the four bundled
`*/references/*` copies (`develop-pipeline-step-5-6-qa-loop.md` ×2, `qa-results.js` ×2). The task's
Files Summary names them only under "Generated (`npm run bundle`, never edited by hand)", and
`npm run bundle:check` holds them byte-equal to their sources, so the exclusion is the default rule
and not a deviation. Effort: medium. Run at develop-task Step 5c, before `/finalise` — no DoD and a
`ready-for-review` status are expected here.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.171.implementation.1.deferred-work-placement-and-qa-results-residuals-initial-run.md` (Step 5–8 updates uncommitted by design) |
| Review report | ✅ | `task.171.review.1.deferred-work-placement-and-qa-results-residuals.md` |
| QA reports | 5 | `task.171.qa.1` … `task.171.qa.5` |
| Gate | PASS | `task.171.gate.5.deferred-work-placement-and-qa-results-residuals.yml` (100) |
| DoD | ❌ (expected — Step 7 not yet run) | — |
| Sprint review | ❌ (expected — Step 7 not yet run) | — |
| Open bugs | 0 | — |
| Handover | ❌ | none (no deferred tracker actions) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| One home for the loop-exit Deferred Work record; survives three QA writes | `shared/resources/develop-pipeline-step-5-6-qa-loop.md` § Where the Deferred Work record goes; `tests/deferred-work-placement.test.js` | ✅ met |
| Every § 2 residual writes correctly or refuses with a `detail` | `shared/resources/qa-results.js`; engine tests O1–O14, P1–P4, Q1–Q4 | ⚠️ partial — the setext residual is closed for the plain-text shape only (gate 5 CR5-1, pre-existing); a Version-first log under a marker block still loses rows on relocate (CR-1, pre-existing) |
| Both Step 12 halts print the refusal `detail` | `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`; `tests/qa-results-step12-wiring.test.js` | ✅ met |
| create-bug-report task mode checks for the heading it writes | `skills/create-bug-report/SKILL.md` Step 5; `tests/create-bug-report-bug-reports-heading.test.js` | ✅ met |
| Engine, wiring and corpus tests < 2 s; no network | measured 1.62 s | ✅ met |
| Corpus 0 false refusals / 0 deletions / 0 non-idempotent | `tests/qa-results-corpus.test.js` write survey (engine-independent) | ✅ met |
| Every new assertion mutation-proved | implementation report tables | ✅ met |
| CHANGELOG cites task 171 and names the new refusals | `CHANGELOG.md` | ✅ met |
| task.155's Deferred Work items marked resolved | `docs/tasks/task.155…md` § Deferred Work | ⚠️ partial — REL-019 omitted; setext marked resolved without caveat (PC-1, PC-3) |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: medium — gate.5 recommendations.future[0] (CR5-1); task.155 Deferred Work note
  The setext residual is closed only for the plain-text shape, yet task.155's note marks setext resolved and § 9 reads as fully met.
  → Qualify the setext claim in task.155's note and task.171 § 3 as plain-text only, pointing at the CR5-1 follow-up.

[PC-2] trail · medium · confidence: high — gate.5 recommendations.future (CR5-1, CR2-4, CR-7)
  A HIGH deletion path and two lows are routed to a "follow-up task" that exists nowhere: no task, no issue, no Deferred Work record on task.171.
  → File the follow-up, and list the ids under a `## Deferred Work` H2 on task.171 that links to it.

[PC-3] trail · low · confidence: medium — task.155 Deferred Work note
  REL-019 (no repair hint on the bad-section halt) is closed by this PR but not listed as resolved.
  → Add REL-019 to task.155's "Resolved by task.171" list.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/qa-results.js:2196
  Under a marker block above a Version-first log (| Version | Date | … |), the underLog guard sees neither an ISO-first row nor a Date-first header, so a relocate deletes the log rows. origin/develop deletes them the same way.
  → Count change-log.js's isUnparsedRow as a log row under underLog; add the Version-first fixture beside P3.

[CR-2] bug · low · confidence: medium — shared/resources/qa-results.js:2056
  A bold-label carried block stops at any heading, so a **Bug Reports** label over a #### group carries only the label and the grouped links are deleted on the next replace.
  → Stop a bold-label block only at a heading of level 3 or shallower; add the bold-over-#### shape.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "task.171.gate.5 recommendations.future[0] (CR5-1); task.155 Deferred Work note"
    finding: "The setext residual is closed only for the plain-text shape, yet task.155 marks setext resolved without a caveat."
    suggested_action: "Qualify the setext claim in task.155's note and task.171 § 3, pointing at the CR5-1 follow-up."
  - id: PC-2
    category: trail
    severity: medium
    confidence: high
    ref: "task.171.gate.5 recommendations.future (CR5-1, CR2-4, CR-7)"
    finding: "Items routed to a follow-up task that exists nowhere, with no Deferred Work record on task.171."
    suggested_action: "File the follow-up and list the ids under a ## Deferred Work H2 on task.171."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "task.155 Deferred Work note"
    finding: "REL-019 is closed by this PR but not listed as resolved in task.155."
    suggested_action: "Add REL-019 to task.155's resolved list."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/qa-results.js:2196"
    finding: "A Version-first log under a marker block loses its rows on relocate; the underLog guard reads only ISO-first rows and Date-first headers."
    suggested_action: "Count isUnparsedRow as a log row under underLog and add the Version-first fixture."
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/qa-results.js:2056"
    finding: "A bold-label carried block stops at any heading, dropping a #### group under it on the next replace."
    suggested_action: "Stop a bold-label block only at a heading of level 3 or shallower."
truncated_count: 0
```

## Recommended Actions

1. PC-2 — record the deferred items (CR5-1, CR2-4, CR-7, CR-1, CR-2) under a `## Deferred Work` H2 on task.171, and file the follow-up task.
2. PC-1, PC-3 — correct task.155's resolution note (setext caveat, REL-019).
3. CR-1 / CR-2 — fold into the same follow-up as CR5-1: all three are carry or guard gaps in `qa-results.js`, and CR-1 is pre-existing.
