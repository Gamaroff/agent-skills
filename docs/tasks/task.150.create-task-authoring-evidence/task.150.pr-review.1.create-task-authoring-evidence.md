# PR Review Report: PR #512 — feat(task.150): create-task — anchored claims, a bounded title, and a --from-observation entry

**Reviewed:** 2026-09-28
**PR:** [#512](https://github.com/Gamaroff/agent-skills/pull/512) — `feature/task.150.create-task-authoring-evidence` → `develop` (OPEN)
**Work item:** [`task.150.create-task-authoring-evidence.md`](./task.150.create-task-authoring-evidence.md) — resolved via `branch-stem`
**Tracker:** [#480](https://github.com/Gamaroff/agent-skills/issues/480) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.150…` (4183 lines). Bundled `skills/*/references/` copies
and `*.security.run.json` probe records are excluded (`bundle:check` proves the copies identical).
`skills/observe-work/references/review-cycle.md` is hand-authored and named in a commit, so it is
**included**.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.150.implementation.1.create-task-authoring-evidence-initial-run.md` (cycle 4–5 entries not yet committed, deferred to Step 8 by design; see PC-1) |
| Review report | ✅ | `task.150.review.1.create-task-authoring-evidence.md` |
| QA reports | 5 | `task.150.qa.1` … `qa.5` |
| Gate | PASS | `task.150.gate.5.create-task-authoring-evidence.yml` (100) |
| DoD | ❌ | not yet written (Step 7) |
| Sprint review | ❌ | not yet written (Step 7) |
| Open bugs | 0 | bugs 1–4 closed |
| Handover | ❌ | none (no deferred tracker actions) |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Over-bound title: one `title-too-long` naming the H1; exit 0, 1 under `--strict` | `shared/resources/tests/card-preflight.test.mjs` (7 title tests) | ✅ met |
| No title outside `LEGACY_LONG_TITLES` over the bound; every listed one still over | `card-preflight-corpus.test.mjs` ratchet (43 ids) | ✅ met |
| Section-scoped rules (§ 3.5 ×3, Section 3, review-task Step 3) | `tests/create-task-authoring-evidence.test.js` | ✅ met |
| `seedFromObservations` refuses non-open, `title: null` over bound, park vectors accepted by the real engine | `skills/create-task/tests/from-observation.test.js` (13 tests incl. real scan output and engine round trips) | ✅ met |
| Offline, one parse per document, mutation table, one definition of `CARD_TITLE_MAX`, `ci:fast`/`bundle:check`/`validate` clean, CHANGELOG, contract doc, task.123 hand run | tests, CHANGELOG, `authoring-card-preflight.md`, implementation report | ✅ met |

## Conformance Findings

```
[PC-1] trail · medium · confidence: high — docs/tasks/task.150.create-task-authoring-evidence/task.150.implementation.1.create-task-authoring-evidence-initial-run.md
  The committed report still reads Status: Escalated with no QA Cycle 4/5 entries; the working copy still says Final Status: Escalated, QA Iterations: 3 and ❌ Failed on the Steps 5–6 row.
  → Bring the header, the Steps 5–6 row and the Completion block in line with the resumed PASS, and commit the report (Step 8).

[PC-2] consistency · low · confidence: low — task.150 frontmatter (no pr_number)
  No pr_number: 512, although sibling tasks carry one.
  → Add it, or confirm /finalise sets it.

[PC-3] scope · low · confidence: medium — skills/observe-work/SKILL.md:330, skills/observe-work/references/review-cycle.md:177-182, shared/resources/tests/observation-log.test.mjs
  Files Summary 5a lists only observation-log.js and its contract; the QA-directed observe-work and engine-test changes are not named there.
  → Extend Files Summary 5a.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — skills/observe-work/references/review-cycle.md:183
  The Step 6 set-status block and the SKILL.md:330 quick-reference row hard-code --expect-status open, while the review also actions PARKED entries whose parked_until is met — the very entries create-task's park vectors create; run as written it answers status-changed and the prose says not to retry.
  → Replace the literal with a placeholder for the status read (e.g. --expect-status {status-read}).

[CR-2] bug · low · confidence: low — skills/create-task/scripts/lib.js:343
  When the body has no parsable frontmatter, the agreement check falls back to scan's parseInt'd id, so a malformed id passes on that path.
  → Refuse when the raw id cannot be read from the body.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: trail
    severity: medium
    confidence: high
    ref: "docs/tasks/task.150.create-task-authoring-evidence/task.150.implementation.1.create-task-authoring-evidence-initial-run.md"
    finding: "The committed implementation report still reads Status: Escalated without QA Cycle 4/5 entries, and the working copy's Completion block and Steps 5-6 row still read Escalated / Failed."
    suggested_action: "Bring the report in line with the resumed PASS and commit it at Step 8."
  - id: PC-2
    category: consistency
    severity: low
    confidence: low
    ref: "task.150.create-task-authoring-evidence.md frontmatter (no pr_number)"
    finding: "The task frontmatter carries no pr_number for PR #512."
    suggested_action: "Add pr_number: 512 or confirm finalise sets it."
  - id: PC-3
    category: scope
    severity: low
    confidence: medium
    ref: "skills/observe-work/SKILL.md:330"
    finding: "Files Summary 5a omits the observe-work and engine-test files changed for QA CR4-1."
    suggested_action: "Extend Files Summary 5a."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/observe-work/references/review-cycle.md:183"
    finding: "The Step 6 block and SKILL.md quick-reference row hard-code --expect-status open, so actioning a parked entry from them answers status-changed and is not retried."
    suggested_action: "Use a placeholder for the status read instead of the literal open."
  - id: CR-2
    category: bug
    severity: low
    confidence: low
    ref: "skills/create-task/scripts/lib.js:343"
    finding: "Without parsable frontmatter in the body, the agreement check falls back to scan's parseInt'd id."
    suggested_action: "Refuse when the raw id cannot be read."
truncated_count: 0
```

## Recommended Actions

1. CR-1: replace the literal `open` in observe-work review Step 6 and the quick-reference row with a
   placeholder for the status read. This is the only finding that affects a shipped workflow: parked
   entries could not be actioned from the template.
2. PC-1: correct the implementation report at Step 8, as the pipeline already does.
3. PC-3 and PC-2: extend Files Summary 5a, and confirm `pr_number`.
4. CR-2: refuse when the raw id cannot be read.
