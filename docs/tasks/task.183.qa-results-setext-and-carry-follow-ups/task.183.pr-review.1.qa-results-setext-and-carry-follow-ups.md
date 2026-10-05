# PR Review Report: PR #571 — fix(task.183): qa-results setext and carry follow-ups

**Reviewed:** 2026-10-05
**PR:** [#571](https://github.com/Gamaroff/agent-skills/pull/571) — `feature/task.183.qa-results-setext-and-carry-follow-ups` → `develop` (OPEN)
**Work item:** [`task.183.qa-results-setext-and-carry-follow-ups.md`](./task.183.qa-results-setext-and-carry-follow-ups.md) — resolved via `branch-stem`
**Tracker:** [#569](https://github.com/Gamaroff/agent-skills/issues/569) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: `origin/develop...origin/feature/task.183.qa-results-setext-and-carry-follow-ups`, 21 files,
2966 patch lines. Excluded `*/references/*` (2 files: the bundled `qa-results.js` copies in qa-task
and qa-story, byte-identical to `shared/resources/qa-results.js` apart from the generated header).
Effort `medium`. Run inside develop-task Step 5c, QA cycle 6.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.183.implementation.1.qa-results-setext-and-carry-follow-ups-initial-run.md` |
| Review report | ✅ | `task.183.review.1.qa-results-setext-and-carry-follow-ups.md` |
| QA reports | 6 | `task.183.qa.1` … `task.183.qa.6` |
| Gate | PASS | `task.183.gate.6.qa-results-setext-and-carry-follow-ups.yml` (100) |
| DoD | ❌ (expected) | not yet finalised — Step 7 writes it |
| Sprint review | ❌ (expected) | not yet finalised |
| Open bugs | 0 | — |
| Handover | ❌ | none — no restricted-access run |

Gate heads 1–6 are all ancestors of the PR head and each gate's `updated:` follows its head's
author time.

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Six CR5-1 shapes refused, document unchanged | `shared/resources/qa-results.js` `notParagraph()`; test R1 | ✅ met |
| CR-7 shapes stay refused (deferred) | test R2 | ✅ met (deferred by design) |
| Version-first log refused, Date-less table writable | `hasDateColumn()`; test R3 | ⚠️ partial — marker blocks only (CR-2, pre-existing marker-less path) |
| `####` group survives; grouped bug list carried | `collectBlocks` `stops`; test R4 | ⚠️ partial — nesting under `#### Bug Reports` drops a group (CR-1, pre-existing) |
| Tests under 2 s | gate 6: 1.45 s at load 3.45 | ✅ met |
| Corpus write survey 0/0/0 | `tests/qa-results-corpus.test.js` | ✅ met |
| Mutation-proved | gates 1–6 | ✅ met |
| CHANGELOG cites `(task 183)` | `CHANGELOG.md` | ✅ met |
| task.171 items link here | task.171 `## Deferred Work` | ✅ met |

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.183 Phase 5 checkbox, § 9 Migration, § 2 Benefits, Progress Tracking Phase 4
  The CR-7 / CR2-4 deferral did not reach four passages: two promise CHANGELOG "newly written
  shapes" (none are newly written), and two say stale QA text stops being carried (CR2-4 is deferred).
  → Reword the four passages to the deferred outcome, with a Change Log row.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/qa-results.js:199
  A bold **Bug Reports** block inside a `#### Bug Reports` block can now run past the outer
  block's end; carriedBlocks drops the nested block, so `#### Bug Reports` / `- [a]` /
  `**Bug Reports**` / `#### From cycle 2` / `- [b]` loses [b] on replace.
  Provenance (orchestrator probe): identical on origin/develop (replaced ×3, a: 1, b: 0 on both);
  0 tracked docs carry a bold Bug Reports label → pre-existing.
  → Extend the outer block to the nested block's end in carriedBlocks; add the shape to R4.

[CR-2] bug · medium · confidence: medium — shared/resources/qa-results.js:572
  On the marker-less path underTablelessLog still requires a Date-first table, so a section below
  a marker-less `| Version | Date |` log that quotes a `| Date | Note |` table is relocated and
  the quoted rows stay in the Change Log; the comment at :310-312 says a Version-first log is
  refused. Provenance: identical on origin/develop (relocated on both); 0 tracked docs carry a
  Version-first table → pre-existing. The marker-less Date-first rule is the operator's CR3-2
  decision; the comment over-claims.
  → Scope the comment to marker blocks, or use hasDateColumn only to detect a log above the section.

[CR-3] cleanup · low · confidence: high — shared/resources/tests/qa-results.test.mjs:1157
  R2 ends by calling assertCr51Refused(), repeating R1's assertions.
  → Drop the call from R2.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "task.183 Phase 5 checkbox; § 9 Migration; § 2 Benefits; Progress Tracking Phase 4"
    finding: "The CR-7 and CR2-4 deferral amendments did not reach four passages, which still describe both as fixed."
    suggested_action: "Reword the four passages to the deferred outcome and add a Change Log row."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/qa-results.js:199"
    finding: "A bold Bug Reports block nested in a #### Bug Reports block loses its #### group on replace (pre-existing: identical on origin/develop)."
    suggested_action: "Extend the outer carried block to the nested block's end, and add the nesting shape to R4."
  - id: CR-2
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/qa-results.js:572"
    finding: "A section quoting a Date table below a marker-less Version-first log is relocated with the quoted rows left in the log (pre-existing: identical on origin/develop), and the comment at 310-312 over-claims."
    suggested_action: "Scope the comment to marker blocks, or detect a log above the section with hasDateColumn on the marker-less path."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/tests/qa-results.test.mjs:1157"
    finding: "R2 repeats R1's whole assertion set via assertCr51Refused()."
    suggested_action: "Remove the call from R2."
truncated_count: 0
```

## Recommended Actions

1. File a follow-up task for CR-1 and CR-2 — both pre-existing `qa-results.js` content-loss shapes,
   0 corpus instances — alongside the gate 6 CR6-1 paragraph-first shape.
2. PC-1: reword the four task.183 passages that still read as if CR-7 and CR2-4 were fixed.
3. CR-3: drop the duplicate assertion call from R2.
