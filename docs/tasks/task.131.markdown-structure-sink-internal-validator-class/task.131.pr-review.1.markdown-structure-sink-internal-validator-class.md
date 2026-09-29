# PR Review Report: PR #526 — feat(task.131): markdown-structure sink, --args-json, and boundary: internal (#438)

**Reviewed:** 2026-09-30
**PR:** [#526](https://github.com/Gamaroff/agent-skills/pull/526) — `feature/task.131.markdown-structure-sink-internal-validator-class` → `develop` (OPEN)
**Work item:** [`task.131.markdown-structure-sink-internal-validator-class.md`](./task.131.markdown-structure-sink-internal-validator-class.md) — resolved via `branch-stem`
**Tracker:** [#438](https://github.com/Gamaroff/agent-skills/issues/438) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope note: 44 bundled `skills/*/references/` copies were excluded from the diff. They are generated from the `shared/resources/` sources, and none is named as an authored change in the Files Summary, PR body or commit subjects. The reviewed diff is 4,404 lines. Effort: medium.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.131.implementation.1.markdown-structure-sink-internal-validator-class-initial-run.md |
| Review report | ✅ | task.131.review.1.markdown-structure-sink-internal-validator-class.md |
| QA reports | 4 | task.131.qa.1–4 |
| Gate | PASS | task.131.gate.4 (100). QA Cycle 4 entry reads `Proceeding to 5c` (Cosmetic-residue exit) |
| DoD | — (expected at Step 7) | not yet written |
| Sprint review | — (expected at Step 7) | not yet written |
| Open bugs | 0 | bug.1–7 all Closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `corpusFor("markdown-structure")` both directions; each hostile trips its code(s) | `security-input-corpus.mjs` MARKDOWN_STRUCTURE; `security-probe.test.mjs` isolation test | ✅ met |
| Probe of `lintReport` via `--args-json` executes every case; green accepted, corrupt refused | `security-probe.mjs` args + ok rule; engine tests; QA run records 15/15 | ✅ met |
| `internal` renders a skip with the reason; without one it is a FAIL | finalise Step 3c/3d; `finalise-dod-prompt-contract.test.mjs` | ✅ met |
| Probe < 10 s | 1.6 s measured | ✅ met |
| Mutation proof; schema non-vacuous; `bundle:check` 0 | QA reports list the mutants; floor test; bundle:check | ✅ met |
| CHANGELOG; `boundary` consumers enumerated; task.124 cited | CHANGELOG `[Unreleased]`; enumeration test (floor 5); anti-patterns entry | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: medium — task.131.markdown-structure-sink-internal-validator-class.md:353-354 (## Progress Tracking)
  The QA and Gate items in Progress Tracking are unticked, although four QA reports and four gates exist and gate 4 reads PASS 100.
  → Tick both and point them at qa.4 and gate.4.

[PC-2] scope · low · confidence: high — shared/resources/change-log.js
  The CRLF fencedRanges fix is recorded only in the Change Log row and CHANGELOG; no Scope line or Files Summary entry names change-log.js.
  → Add the file and its regression tests to Scope / Files Summary as a defect the new probe found.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/security-probe.mjs:1855
  args is recorded but not part of controlKey, so two probes of one export with different --args-json share one record entry and the later silently replaces the earlier.
  → Include a canonical serialisation of args in the JS control key (null keeps today's names), or let a JS control take --name; test two arg sets → two controls.
  (Already carried in gate 2 and gate 4 recommendations.future.)

[CR-2] bug · medium · confidence: medium — shared/resources/change-log.js:126
  The CRLF fence defect remains in jira-sync.js makeFenceTracker (1207) and skills/jira-epic-creator/scripts/jira-create-epic.js:249; no check enumerates fence matchers.
  → Enumerate every `(.*)$`-anchored fence regex run on split("\n") lines and normalise CRLF at each, with a population test.
  (Pre-existing on develop — carried from gate 1 as a follow-up; jira-create-epic.js is a new site for that list.)
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "task.131.markdown-structure-sink-internal-validator-class.md:353-354 (## Progress Tracking)"
    finding: "The QA and Gate items in Progress Tracking are unticked although four QA reports and gates exist and gate 4 reads PASS 100."
    suggested_action: "Tick both and point them at qa.4 and gate.4."
  - id: PC-2
    category: scope
    severity: low
    confidence: high
    ref: "shared/resources/change-log.js"
    finding: "The CRLF fencedRanges fix is not named in the task's Scope or Files Summary."
    suggested_action: "Add change-log.js and its regression tests to Scope / Files Summary as a probe-found defect."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/security-probe.mjs:1855"
    finding: "args is recorded but not part of controlKey, so two probes of one export with different --args-json collapse into one record entry."
    suggested_action: "Key JS controls on a canonical serialisation of args when non-null, or accept --name for JS controls, with a two-arg-set test."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/change-log.js:126"
    finding: "The CRLF fence defect remains in jira-sync.js makeFenceTracker and jira-create-epic.js; no check enumerates fence matchers."
    suggested_action: "Normalise CRLF at every (.*)$-anchored fence matcher run on split lines, with a population test."
truncated_count: 0
```

## Recommended Actions

1. PC-1 / PC-2: tick the Progress Tracking items and name `change-log.js` in Scope and Files Summary. These are document edits and can land at finalise.
2. File a follow-up task for CR-1 (the JS control key) and CR-2 (the CRLF fence-matcher population, which now includes `jira-create-epic.js`).
