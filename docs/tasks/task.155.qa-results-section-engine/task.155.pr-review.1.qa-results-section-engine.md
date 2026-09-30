# PR Review Report: PR #537 — feat(qa-results): QA Testing Results section engine — one writer, one place, refuses to stack (task 155)

**Reviewed:** 2026-09-30
**PR:** [#537](https://github.com/Gamaroff/agent-skills/pull/537) — `feature/task.155.qa-results-section-engine` → `develop` (OPEN, head `6bf14169`)
**Work item:** [`task.155.qa-results-section-engine.md`](./task.155.qa-results-section-engine.md) — resolved via `branch-stem`
**Tracker:** [#486](https://github.com/Gamaroff/agent-skills/issues/486) — OPEN (labels `task`, `priority:medium`; milestone Technical Tasks (standalone))
**Verdict:** ⚠️ CONCERNS

**Scope:** `git diff origin/develop...origin/feature/task.155.qa-results-section-engine`, 18 of 20 files. Excluded: `skills/qa-task/references/qa-results.js` and `skills/qa-story/references/qa-results.js`. Both are listed under "Generated" in the task's Files Summary. Apart from their AUTO-GENERATED header line, both were checked byte-identical to `shared/resources/qa-results.js`, so this review covers them through that file. Effort: medium.

**Implementation report read:** the **working-tree** copy. Its uncommitted edits add the Step 4 row and the QA Cycle 1–3 entries. The committed copy on the branch is from Step 4 and has no QA cycle entries. The pipeline's Step 8 commit is expected to carry them.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.155.implementation.1.qa-results-section-engine-initial-run.md` (QA Cycle 3 `**Action**: Proceeding to 5c`, working tree) |
| Review report | ✅ | `task.155.review.1.qa-results-section-engine.md` (I2 retracted as a false positive at Step 3, annotated) |
| QA reports | 3 | `task.155.qa.1…`, `task.155.qa.2…`, `task.155.qa.3.qa-results-section-engine.md` |
| Gate | PASS | `task.155.gate.3.qa-results-section-engine.yml` (100). Route 2b cosmetic-residue exit. REL-007/REL-008 were carried to `recommendations.future` and are listed under `## Deferred Work` |
| DoD | ❌ (expected) | Not written yet. The task is `ready-for-review` and Step 7 writes it |
| Sprint review | ❌ (expected) | Written at Step 7 |
| Open bugs | 0 | none |
| Handover | ✅ n/a | no handover file |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `upsertQaResults` returns `replaced` / `relocated` / `created` / `multiple` / `bad-section` and writes nothing on the last two | `shared/resources/qa-results.js`; `shared/resources/tests/qa-results.test.mjs` | ✅ met |
| A fenced or inline-code heading is never found or replaced | `qa-results.js` reuses the `change-log.js` protected ranges; unit tests | ✅ met |
| qa-task and qa-story Step 12 write through the engine, and the extracted call leaves one section | `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`; `tests/qa-results-step12-wiring.test.js` | ✅ met |
| The corpus guard passes after the task.65 repair and fails, naming the file, on a re-added copy | `tests/qa-results-corpus.test.js`; task.65 repair (−100 lines) | ✅ met |
| Performance: under 2 s and no network | QA reports 1–3 | ✅ met |
| Code quality: no second fence scanner; every assertion mutation-proved; ci:fast, bundle:check and validate clean | imports from `change-log.js`; mutation table in the implementation report | ✅ met |
| Migration: CHANGELOG `[Unreleased]` cites task 155 | `CHANGELOG.md` | ✅ met |
| Migration: obs #178 → `actioned` on merge | unticked, post-merge by design | ⚠️ pending (expected) |
| § 3: one blank line on each side of the written section | engine yes; the Change Log write that follows removes the lower blank line (PC-1) | ⚠️ partial |

## Conformance Findings

```
[PC-2] consistency · medium · confidence: high — task.155.qa-results-section-engine.md frontmatter (no pr_number)
  The frontmatter has no pr_number. The implementation report records PR #537, and the
  task body has no "PR #537" / "pull/537" text either. /finalise Step 3a would therefore
  get an empty PR_NUMBER and fall back to `git diff HEAD~1 HEAD` for the AC agent.
  → Add `pr_number: 537` to the task frontmatter before /finalise.

[PC-1] coverage · low · confidence: high — task.155.qa-results-section-engine.md § 3 Target Architecture
  upsertQaResults leaves a blank line before the change-log start marker. The Change Log
  write that Step 12 runs next removes it, so the committed document shows the section
  directly against the marker, and § 3's promise of one blank line on each side is not
  delivered end to end.
  → Add a Step 12 test that runs the QA write then the Change Log write. Then either make
    change-log.js keep the blank line or narrow § 3's wording. A follow-up task is fine.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/qa-results.js:246
  In a document whose change log is a marker-less H3 "### Change Log", canonicalOffset puts
  a new "## QA Testing Results" directly above it. The section's span ends only at an
  H1/H2 or a marker block, so it absorbs the log: a created write followed by a replaced
  write deletes the whole change log.
  → End the section at the start of a marker-less change log, as the code already does for
    marker blocks, or use the doc-type anchor when the found log is deeper than H2.

[CR-2] bug · low · confidence: high — shared/resources/qa-results.js:268
  normaliseSection keeps a trailing "---" in the caller's section, but trimSeparator leaves
  that break outside the old span. Each later write therefore keeps the old "---" and adds
  a new one (created, replaced, replaced gave two stacked "---" lines).
  → In normaliseSection, strip one trailing thematic break that follows a blank line, so the
    written body follows the same separator rule as the span.
```

**Caller verification.** CR-1 and CR-2 were both reproduced against `shared/resources/qa-results.js` at the PR head using a minimal fixture:

- **CR-1:** `created` then `replaced` deleted the header and rows of an H3 `### Change Log`.
- **CR-2:** three writes produced two `---` lines.

Corpus exposure for CR-1 today is low. Eight tracked work items carry a marker-less H3 `### Change Log`. Each either already has a section, which takes the replace path (all 155 corpus sections replaced cleanly in the gate 3 dry run), or also carries an H2 `## Change Log`. The engine is still new shared code that any consumer document with an H3 log would reach on first write. Severity and confidence are recorded as the lens returned them.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-2
    category: consistency
    severity: medium
    confidence: high
    ref: "task.155.qa-results-section-engine.md frontmatter (no pr_number)"
    finding: "The frontmatter has no pr_number and the body names no PR, so /finalise Step 3a would get an empty PR_NUMBER although the implementation report records PR #537."
    suggested_action: "Add `pr_number: 537` to the task frontmatter before /finalise."
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "task.155.qa-results-section-engine.md § 3 Target Architecture"
    finding: "The Change Log write that follows the QA write in Step 12 removes the blank line the engine leaves before the change-log start marker, so § 3's one-blank-line separator is not delivered end to end."
    suggested_action: "Add a Step 12 test running the QA write then the Change Log write, and either make change-log.js keep the blank line or narrow § 3's wording."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/qa-results.js:246"
    finding: "In a document with a marker-less H3 change log, a created section sits directly above the log and a later replace deletes the whole log, because the span ends only at H1/H2 or a marker block."
    suggested_action: "End the section at the start of a marker-less change log, or use the doc-type anchor when the found log is deeper than H2."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/qa-results.js:268"
    finding: "A trailing thematic break in the caller's section stacks on every replace, because trimSeparator leaves the old break outside the span while normaliseSection keeps the new one."
    suggested_action: "Strip one trailing thematic break that follows a blank line in normaliseSection, so the written body follows the span's separator rule."
truncated_count: 0
```

## Recommended Actions

1. **CR-1:** decide whether it goes to `/qa-fix` or a follow-up task. It is reproducible data loss (the whole change log is deleted) in new shared code, although no tracked document hits it today. The minimal fix bounds the span at a marker-less log start. Add a create-then-replace fixture with an H3 `### Change Log`.
2. **PC-2:** add `pr_number: 537` to the task frontmatter so `/finalise` Step 3a diffs the PR rather than `HEAD~1`.
3. **CR-2 and PC-1:** record them under `## Deferred Work` beside REL-007/REL-008 (both LOW, separator cosmetics).
4. Commit the working-tree implementation report (QA Cycle 1–3 entries) with the Step 5c record, so the branch trail matches the pipeline's state.
