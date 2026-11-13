# PR Review Report: PR #876 — QA snippet classifier refuses git literal execution

**Reviewed:** 2026-11-11
**PR:** [#876](https://github.com/Gamaroff/agent-skills/pull/876) — `feature/task.304.qa-snippet-classifier-git-literal-execution` → `develop` (open)
**Work item:** `task.304.qa-snippet-classifier-git-literal-execution.md` — resolved via `branch stem`
**Tracker:** none — `github_issue` does not resolve in this repository (non-blocking)
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (the QA loop already ran the code lens seven times). The 12 bundled `references/` copies were excluded from the diff. All six findings are about the task document and trail, and all are fixed in the working tree (doc-only, no code change).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.304.implementation.1 (cycle 7 entry added) |
| QA reports | 7 | qa.1 to qa.7 |
| Gate | PASS | task.304.gate.7 (95) |
| DoD | ❌ | not yet written (Step 7) |
| Sprint review | ❌ | not yet written (Step 7) |

## Conformance Findings

- **PC-1** coverage · medium · high — criterion 1 and two notes said `--exec-path` is not refused. Fixed: rewritten to say `--exec-path=<dir>` is refused after QA cycle 2.
- **PC-2** coverage · medium · high — ticked criteria quoted stale evidence (600 blocks, 397 tests, four mutation proofs). Fixed: refreshed to the cycle 7 figures.
- **PC-3** scope · medium · high — the broader refusals (brace, unknown flag, operand-taking global flags) were not in the document's scope. Fixed: recorded as an owner-extended scope with its accepted cost.
- **PC-4** scope · low · medium — the detection doc said `--git-dir` stays runnable. Fixed: only the `=`-joined spellings and `-C <one plain word>`.
- **PC-5** trail · low · high — no QA cycle 7 entry in the implementation report. Fixed: entry added.
- **PC-6** consistency · low · medium — no `pr_number` in the frontmatter. Fixed: `pr_number: 876`.

## Code Review Findings

Skipped (`--no-code`).

## Machine-Readable Findings

```yaml
reviewed_gate: task.304.gate.7.qa-snippet-classifier-git-literal-execution.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/task.304.qa-snippet-classifier-git-literal-execution.md"
    anchor_check: unchecked-text
    finding: "Criterion 1 said --exec-path is not refused, but the engine refuses --exec-path=<dir>."
    suggested_action: "Rewrite the criterion and notes to match the engine (fixed in this pass)."
  - id: PC-2
    category: coverage
    severity: medium
    confidence: high
    ref: "docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/task.304.qa-snippet-classifier-git-literal-execution.md"
    anchor_check: unchecked-text
    finding: "Ticked criteria quoted stale evidence and a mutation-proof list naming only the original refusals."
    suggested_action: "Refresh to the cycle 7 figures (fixed in this pass)."
  - id: PC-3
    category: scope
    severity: medium
    confidence: high
    ref: "shared/resources/qa-execute-snippets.mjs"
    anchor_check: unchecked-text
    finding: "The diff refuses brace expansion, unknown flags and operand-taking global flags, which the task scope did not name."
    suggested_action: "Record the owner-extended scope and accepted cost in the document (fixed in this pass)."
  - id: PC-4
    category: scope
    severity: low
    confidence: medium
    ref: "shared/resources/qa-runnable-prose-detection.md"
    anchor_check: unchecked-text
    finding: "The detection doc said --git-dir and --work-tree stay runnable, true only for the = spelling."
    suggested_action: "State the =-joined and -C one-plain-word rule (fixed in this pass)."
  - id: PC-5
    category: trail
    severity: low
    confidence: high
    ref: "docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/task.304.implementation.1.qa-snippet-classifier-git-literal-execution-initial-run.md"
    anchor_check: unchecked-text
    finding: "The implementation report had no QA Cycle 7 entry."
    suggested_action: "Add the entry (fixed in this pass)."
  - id: PC-6
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.304.qa-snippet-classifier-git-literal-execution/task.304.qa-snippet-classifier-git-literal-execution.md"
    anchor_check: unchecked-text
    finding: "Frontmatter had no pr_number although the work is PR 876."
    suggested_action: "Set pr_number: 876 (fixed in this pass)."
truncated_count: 0
```

## Recommended Actions

1. Proceed to `/finalise`. Every finding is fixed and doc-only, so no further QA cycle is needed.
