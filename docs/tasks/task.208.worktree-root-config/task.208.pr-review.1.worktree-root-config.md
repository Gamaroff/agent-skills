# PR Review Report: PR #657 — feat: worktrees live inside the repo under a configurable root (task.208)

**Reviewed:** 2026-10-14
**PR:** [#657](https://github.com/Gamaroff/agent-skills/pull/657) — `feature/task.208.worktree-root-config` → `develop` (MERGED)
**Work item:** [`task.208.worktree-root-config.md`](task.208.worktree-root-config.md) — resolved via `branch stem`
**Tracker:** none — the task has no tracker issue
**Verdict:** 🚨 REQUEST CHANGES

> Retroactive review. The task was implemented by hand and merged without running `/develop-task`,
> so this review, the QA pass and `/finalise` run after the merge. The verdict's high findings are
> about the missing paper trail, which the catch-up run supplies; none is a defect in the code.

**Scope:** diff of merge commit `65bb2b0f` against its first parent, excluding the 11 bundled
`*/references/*` copies (generated from `shared/resources/` sources, which are in the diff).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ❌ | none |
| Review report | ❌ | none |
| QA reports | 0 | none |
| Gate | absent | none |
| DoD | ❌ | none |
| Sprint review | ❌ | none |
| Open bugs | 0 | none |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

The task's §9 Success Criteria were all unticked at merge (PC-4); traceability is left to the QA pass.

## Conformance Findings

```
[PC-1] trail · high · confidence: high — docs/tasks/task.208.worktree-root-config/
  PR #657 merged with only the task document and plan in the task directory; no implementation
  report records how the phases were done or verified.
  → Add an implementation report recording the changes and the test, mutation-proof, eval and
    bundle:check results.

[PC-2] trail · high · confidence: medium — docs/tasks/task.208.worktree-root-config/
  The merged PR has no QA report and no gate file, though the task's Notes name both; the change
  reached develop without a recorded QA verdict.
  → Run /qa-task against the merged change.

[PC-3] consistency · high · confidence: high — docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:8
  Frontmatter and body both say in-progress while the PR is merged.
  → Run /finalise once the trail exists.

[PC-4] consistency · medium · confidence: high — docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:177
  All seven Success Criteria in §9 are unticked while all five Progress Tracking phases are ticked.
  → Check each criterion against the merged code and tests, and tick those met.

[PC-5] consistency · medium · confidence: high — pr_number
  The task frontmatter has no pr_number, so nothing links it to PR #657.
  → Add pr_number: 657.

[PC-6] consistency · medium · confidence: high — docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:215
  The Change Log has only the Initial draft row; nothing records the implementation or the merge.
  → Append a Change Log row.

[PC-7] consistency · low · confidence: high — docs/tasks/task-registry.md:252
  The registry row reads in-progress though the PR is merged.
  → Leave it to /finalise, which ticks the row with the document.
```

## Code Review Findings

```
[CR-1] bug · low · confidence: medium — skills/develop-next/scripts/select-next.mjs:1608
  The standalone /develop-next --batch path now emits worktree commands inside the repo, but nothing
  on that path checks the root is gitignored, and its docs mention neither --worktree-root nor the
  gitignore requirement; only develop-batch got the Step 0.3a guard.
  → Add the gitignore-first note and --worktree-root to develop-next's --batch docs, or have the
    selector warn on stderr when the root is not ignored.

[CR-2] bug · low · confidence: medium — skills/create-parallel-stories/SKILL.md:268
  The skill says any configured root may be substituted, but the cleanup blocks return with a fixed
  `cd ../..`, which reaches the repo root only for a one-segment root.
  → Return to the repo root by an explicit variable, or state that the root must be one segment.
```

**Anchors:** 9 checked against `53b60f7a` (via `head-branch`) — all verified (2 ok, 4 unchecked-text, 3 no-line).

## Machine-Readable Findings

```yaml
reviewed_gate: none
findings:
  - id: PC-1
    category: trail
    severity: high
    confidence: high
    ref: "docs/tasks/task.208.worktree-root-config/"
    anchor_check: no-line
    finding: PR #657 merged with no implementation report recording how the phases were done or verified.
    suggested_action: Add an implementation report with the test, mutation-proof, eval and bundle:check results.
  - id: PC-2
    category: trail
    severity: high
    confidence: medium
    ref: "docs/tasks/task.208.worktree-root-config/"
    anchor_check: no-line
    finding: The merged PR has no QA report and no gate file.
    suggested_action: Run /qa-task against the merged change.
  - id: PC-3
    category: consistency
    severity: high
    confidence: high
    ref: "docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:8"
    anchor_check: unchecked-text
    finding: Frontmatter and body say in-progress while the PR is merged.
    suggested_action: Run /finalise once the trail exists.
  - id: PC-4
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:177"
    anchor_check: unchecked-text
    finding: All seven Success Criteria are unticked while every phase is ticked.
    suggested_action: Check each criterion against the merged code and tests, and tick those met.
  - id: PC-5
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: The task frontmatter has no pr_number.
    suggested_action: Add pr_number 657.
  - id: PC-6
    category: consistency
    severity: medium
    confidence: high
    ref: "docs/tasks/task.208.worktree-root-config/task.208.worktree-root-config.md:215"
    anchor_check: unchecked-text
    finding: The Change Log does not record the implementation or the merge.
    suggested_action: Append a Change Log row.
  - id: PC-7
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task-registry.md:252"
    anchor_check: unchecked-text
    finding: The registry row reads in-progress though the PR is merged.
    suggested_action: Leave it to /finalise.
  - id: CR-1
    category: bug
    severity: low
    confidence: medium
    ref: "skills/develop-next/scripts/select-next.mjs:1608"
    anchor_check: ok
    finding: The standalone develop-next --batch path emits in-repo worktree commands with no gitignore check or documentation of --worktree-root.
    suggested_action: Document both in develop-next's --batch docs, or warn on stderr when the root is not ignored.
  - id: CR-2
    category: bug
    severity: low
    confidence: medium
    ref: "skills/create-parallel-stories/SKILL.md:268"
    anchor_check: ok
    finding: Cleanup blocks return with a fixed cd ../.., which is wrong for a multi-segment root.
    suggested_action: Return by an explicit repo-root variable, or require a one-segment root.
truncated_count: 0
```

## Recommended Actions

1. Run `/qa-task` on task 208 so the change gets a recorded QA verdict (PC-1, PC-2).
2. Fix CR-1 and CR-2 through the QA loop.
3. Run `/finalise` once the gate passes (PC-3 to PC-7).
