# PR Review Report: PR #817 — feat(task.252): migrate-doc-numbering names every document it cannot classify

**Reviewed:** 2026-11-03
**PR:** [#817](https://github.com/Gamaroff/agent-skills/pull/817) — `feature/task.252.migrate-doc-numbering-name-blockers` → `develop` (OPEN)
**Work item:** [`task.252.migrate-doc-numbering-name-blockers.md`](./task.252.migrate-doc-numbering-name-blockers.md) — resolved via `branch stem`
**Tracker:** none — no tracker linkage
**Verdict:** ⚠️ CONCERNS

Scope note: the code lens was skipped (`--no-code`; QA ran it in both cycles). The diff reviewed excludes `docs/tasks/*` and bundled `references/` copies; those were read per file where a finding needed them. The PR also carries the task.253 documents and a registry row from the docs commit `6dcf5960`, which is an expected companion addition, not drift.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.252.implementation.1.migrate-doc-numbering-name-blockers-initial-run.md |
| Review report | ✅ | task.252.review.1.migrate-doc-numbering-name-blockers.md |
| QA reports | 2 | task.252.qa.1…md, task.252.qa.2…md |
| Gate | PASS | task.252.gate.2.migrate-doc-numbering-name-blockers.yml (100) |
| DoD | ❌ | not yet written — Step 7 writes it |
| Sprint review | ❌ | not yet written — Step 7 writes it |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

Nine of the ten success criteria were verified in QA cycles 1 and 2 against the diff and the 90-test suite. The directory-allowlist wording is the exception (PC-2).

## Conformance Findings

[PC-1] scope · medium · confidence: high — docs/tasks/task.252.migrate-doc-numbering-name-blockers/task.252.migrate-doc-numbering-name-blockers.md
  The diff exempts L3 PRDs and any PRD directory holding an index.md from the loose-file rule, but the task's Important Clarifications still say a loose file is a blocker unless the allowlist names it, so the shipped behaviour (including the trade-off where a stray file beside index.md is silent) is not described by the document.
  → Record the shard exemption as a decision in the task document, as QA cycle 2 already suggests.

[PC-2] coverage · low · confidence: medium — shared/resources/migrate-doc-numbering.mjs:238 ⚠️ unverified anchor (text-mismatch; the text is at line 240)
  The task says the allowlist covers directories as well as files (for example an assets/ directory), but only dot-directories are excused, so a non-dot directory such as assets or _archive under epics/ or stories/ now blocks (gate recommendation CR-3, left open as a future item).
  → Add a reasoned directory allowlist or an underscore rule, or amend the task text to say dot-directories are the only directory exemption.

[PC-3] consistency · low · confidence: medium — docs/tasks/task-registry.md
  The registry row for task.252 reads status `planned` while the work item reads `ready-for-review` and gate 2 is PASS.
  → Not an action for this pipeline: `/finalise` ticks the row in the same moment it writes `accepted`, and the drift test backs that.

[PC-4] consistency · low · confidence: medium — docs/tasks/task.252.migrate-doc-numbering-name-blockers/task.252.migrate-doc-numbering-name-blockers.md
  The work item frontmatter has no `pr_number` although the implementation report records PR #817.
  → Add `pr_number: 817` to the frontmatter.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 4 checked against `6e499d10ba79b0517534f70ce49c7b447dcd90c1` (via `head-branch`) — 1 unverified (1 text-mismatch)

## Machine-Readable Findings

```yaml
reviewed_gate: task.252.gate.2.migrate-doc-numbering-name-blockers.yml
findings:
  - id: PC-1
    category: scope
    severity: medium
    confidence: high
    ref: "docs/tasks/task.252.migrate-doc-numbering-name-blockers/task.252.migrate-doc-numbering-name-blockers.md"
    anchor_check: no-line
    finding: "The shard exemption (L3 PRDs and any PRD directory with an index.md) is not described by the task document, which still says a loose file blocks unless the allowlist names it."
    suggested_action: "Record the shard exemption as a decision in the task document."
  - id: PC-2
    category: coverage
    severity: low
    confidence: medium
    ref: "shared/resources/migrate-doc-numbering.mjs:238"
    anchor_check: text-mismatch
    finding: "The task says the allowlist covers directories such as assets/, but only dot-directories are excused, so a non-dot directory under epics/ or stories/ now blocks."
    suggested_action: "Add a reasoned directory allowlist or an underscore rule, or amend the task text to say dot-directories are the only exemption."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task-registry.md"
    anchor_check: no-line
    finding: "The registry row for task.252 reads planned while the work item reads ready-for-review."
    suggested_action: "Leave it: /finalise ticks the row when it writes accepted."
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.252.migrate-doc-numbering-name-blockers/task.252.migrate-doc-numbering-name-blockers.md"
    anchor_check: no-line
    finding: "The work item frontmatter has no pr_number although the implementation report records PR 817."
    suggested_action: "Add pr_number 817 to the frontmatter."
truncated_count: 0
```

## Recommended Actions

1. PC-2: decide the directory allowlist (it is an open coverage finding, so it returns the run to 5b).
2. PC-1 and PC-4: document the shard exemption in the task and add `pr_number: 817`.
3. PC-3: no action; `/finalise` ticks the row.
