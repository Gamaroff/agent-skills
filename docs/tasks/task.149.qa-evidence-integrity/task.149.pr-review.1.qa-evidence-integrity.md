# PR Review Report: PR #493 — feat(task.149): QA evidence integrity — claims that no check read back (#479)

**Reviewed:** 2026-09-26
**PR:** [#493](https://github.com/Gamaroff/agent-skills/pull/493) — `feature/task.149.qa-evidence-integrity` → `develop` (OPEN)
**Work item:** [`task.149.qa-evidence-integrity.md`](./task.149.qa-evidence-integrity.md) — resolved via `branch-stem`
**Tracker:** [#479](https://github.com/Gamaroff/agent-skills/issues/479) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the PR diff against `origin/develop`, with the 29 bundled `*/references/*` copies excluded as
generated. None of those copies is named as authored work in the Files Summary, the PR body or a
commit subject. They are byte-identical to `shared/resources/`, and `bundle:check` reports 0 problems.
The review ran at `/develop-task` Step 5c, before `/finalise`, so an absent DoD is expected.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.149.implementation.1.qa-evidence-integrity-initial-run.md |
| Review report | ✅ | task.149.review.1.qa-evidence-integrity.md |
| QA reports | 8 | task.149.qa.1 … qa.8 |
| Gate | PASS | task.149.gate.8.qa-evidence-integrity.yml (100) |
| DoD | — (Step 7 pending) | — |
| Sprint review | — (Step 7 pending) | — |
| Open bugs | 0 | BUG-1 … BUG-11 closed |
| Handover | — | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| `--copy-as` seeds at the addressed path, contained | `shared/resources/qa-execute-snippets.mjs` isWithin / refuseSymlinkedPath; QA-18…28 | ✅ met |
| Export-and-probe decline | `shared/resources/probe-boundary-rule.md`, security-probe entry | ✅ met |
| Standards-named validation commands run | qa-task / qa-story Step 4 prose | ✅ met |
| Post-edit link / `updated:` read-back | `shared/resources/qa-read-back.js`, Step 12b / 3e | ⚠️ partial — reads back *a* gate/report/row, not *this cycle's* links (CR-1) |
| Behavioural evidence (§ 8 bullet 2) | not recorded in the implementation report | ⚠️ partial (PC-1) |

## Conformance Findings

```
[PC-1] coverage · low · confidence: medium — task.149.qa-evidence-integrity.md § 8 Behavioural evidence, bullet 2
  The scratch-branch doc-links run (untracked, then missing after deletion) that § 8 promises is not in the implementation report.
  → Record that run, or state that the doc-links unit test for `missing` replaces it.

[PC-2] trail · low · confidence: medium — task.149.implementation.1.qa-evidence-integrity-initial-run.md § Completion / header Status / row 5–6
  The report still reads Escalated, 5 cycles and "Needs Attention", although cycle 8 is PASS 100 and proceeding to 5c.
  → At Step 8, rewrite Completion, the header Status and row 5–6 to show 8 cycles ending at gate 8 PASS.

[PC-3] consistency · low · confidence: high — shared/resources/qa-cycle.sh:32
  The header says --path is "the only definition" of this cycle's file, but the QA skills' THIS_GATE / LATEST_GATE `find -name` lookups still exist.
  → Reword the header until the follow-up switches those lookups.

[PC-4] consistency · low · confidence: medium — CHANGELOG.md [Unreleased] task 149 entries
  The new public `qa-cycle.sh <dir> --path gate|qa` mode is not mentioned in the CHANGELOG.
  → Add one sentence to the task 149 read-back entry.

[PC-5] consistency · low · confidence: low — task.149.qa-evidence-integrity.md frontmatter
  There is no `pr_number: 493`, although sibling tasks carry one.
  → Confirm that /finalise writes it.

[PC-6] scope · low · confidence: high — task.149.qa-evidence-integrity.md § 6 Phase 4 / § 7 Files Summary
  qa-read-back.js, qa-cycle.sh --path, tests/qa-read-back-block.test.js, tests/qa-cycle.test.js and tests/lib/markdown-section.js are not named. Phase 4 still says the steps "run both CLIs". The bug reports (BUG-6/7/9/11) justify the additions.
  → Update § 3, Phase 4 and § 7 to name what shipped.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: medium — shared/resources/qa-read-back.js:282
  From cycle 2 on, a document that the Step 12 / item 3 edit never touched still reads clean. It keeps cycle 1's row and links, and the new gate/report only need to exist on disk. The reproduction runs rc=0 with gate.1/qa.1 committed, gate.2/qa.2 new, and the doc unchanged.
  → Halt unless the document links this cycle's gate and QA report (the paths qa-cycle.sh --path returns) and the newest Change Log row is dated on or after the gate. Add a cycle-2 "document not re-edited" test.

[CR-2] cleanup · low · confidence: medium — shared/resources/qa-read-back.js:114
  The `..`-aware containment test is copied by hand three times (qa-read-back isWithin, qa-execute-snippets isWithin, doc-links linkState). A fourth copy (security-probe) has already drifted.
  → Export one isWithin and import it everywhere, or add a parity test over one case table.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: medium
    ref: "task.149.qa-evidence-integrity.md § 8 Behavioural evidence, bullet 2"
    finding: "The scratch-branch doc-links untracked-then-missing run promised in § 8 is not recorded in the implementation report."
    suggested_action: "Record the run, or state that the doc-links missing unit test replaces it."
  - id: PC-2
    category: trail
    severity: low
    confidence: medium
    ref: "task.149.implementation.1.qa-evidence-integrity-initial-run.md § Completion / header Status / row 5–6"
    finding: "The implementation report still reads Escalated / 5 cycles / Needs Attention after cycle 8 PASS."
    suggested_action: "Rewrite Completion, header Status and row 5–6 at Step 8."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "shared/resources/qa-cycle.sh:32"
    finding: "The header claims --path is the only definition while the QA skills' find -name lookups remain."
    suggested_action: "Reword until the follow-up switches the lookups."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "CHANGELOG.md [Unreleased] task 149 entries"
    finding: "The qa-cycle.sh --path mode is not in the CHANGELOG."
    suggested_action: "Add one sentence to the task 149 read-back entry."
  - id: PC-5
    category: consistency
    severity: low
    confidence: low
    ref: "task.149.qa-evidence-integrity.md frontmatter"
    finding: "No pr_number: 493 in the frontmatter."
    suggested_action: "Confirm that /finalise writes it."
  - id: PC-6
    category: scope
    severity: low
    confidence: high
    ref: "task.149.qa-evidence-integrity.md § 6 Phase 4 / § 7 Files Summary"
    finding: "The shipped additions (qa-read-back.js, qa-cycle.sh --path, the new tests) are not named in the task document."
    suggested_action: "Update § 3, Phase 4 and § 7."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/qa-read-back.js:282"
    finding: "From cycle 2, an un-re-edited document reads clean because only the existence of this cycle's gate/report is checked, not that the document links them."
    suggested_action: "Require links to the --path gate and report and a Change Log row dated on or after the gate; add a cycle-2 test."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/qa-read-back.js:114"
    finding: "The containment predicate is hand-copied in three places."
    suggested_action: "Export one isWithin or add a parity test."
truncated_count: 0
```

## Recommended Actions

1. CR-1: make the read-back require that the document links **this** cycle's gate and QA report. It
   was reproduced. Medium at medium confidence, so it does not block, but it is the most substantive
   residue. It is suited to a follow-up task together with the gate-8 `find -name` lookups, because
   both are about "this cycle's file".
2. PC-2 and PC-5 are handled at Step 7 / Step 8 of this run (the report rewrite and `pr_number`).
3. PC-3, PC-4, PC-6 and CR-2 are low-severity document and cleanup items for the same follow-up.
