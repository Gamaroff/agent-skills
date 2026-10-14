# PR Review Report: PR #659 — feat(setup-consumer): checkbox list links each user's agents (task.209)

**Reviewed:** 2026-10-14
**PR:** [#659](https://github.com/Gamaroff/agent-skills/pull/659) — `feature/task.209.setup-consumer-agent-links` → `develop` (MERGED)
**Work item:** [`task.209.setup-consumer-agent-links.md`](task.209.setup-consumer-agent-links.md) — resolved via `branch stem`
**Tracker:** none — the task has no tracker issue
**Verdict:** ⚠️ CONCERNS

> Retroactive review. The task was implemented by hand and merged without running `/develop-task`,
> so this review, the QA pass and `/finalise` run after the merge.

**Scope:** diff of merge commit `391c193e` against its first parent (7 files; no generated files).

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

| Criterion | Evidence in diff | Status |
|---|---|---|
| Ticking agents makes exactly their links, gitignored | `shared/resources/tests/setup-consumer-agent-links.test.mjs` (link and list tests) | ✅ met |
| Nothing existing is replaced or deleted | same file, existing-file and foreign-link tests | ✅ met |
| Works without a terminal via `--link-agents`; skips cleanly without either | same file, detached no-terminal test | ⚠️ partial — an unknown id exits 0 (CR-1) |
| `--links-only` covers a new clone or worktree | `scripts/setup-consumer.sh` main wiring | ✅ met |
| Tests pass and each guard is mutation-proved | no recorded run in the trail | ⚠️ partial (PC-2) |
| Tried by the user in a real terminal (Linux and macOS) | — | ❌ unmet (PC-1) |

## Conformance Findings

```
[PC-1] coverage · medium · confidence: high — docs/tasks/task.209.setup-consumer-agent-links/task.209.setup-consumer-agent-links.md:151
  PR #659 merged with one success criterion open: nobody has tried the list in a real terminal, and
  the risk table says it has not run on macOS bash 3.2.
  → Have the user run setup-consumer.sh --links-only on Linux and macOS, or file a follow-up.

[PC-2] trail · medium · confidence: medium — docs/tasks/task.209.setup-consumer-agent-links/
  The task folder holds only the task doc and plan, so the ticked criterion "Tests pass and each
  guard is mutation-proved" has no recorded evidence.
  → Run /qa-task on the merged change.

[PC-3] consistency · medium · confidence: high — pr_number
  The task frontmatter has no pr_number though PR #659 has merged.
  → Add pr_number: 659.

[PC-4] consistency · low · confidence: medium — docs/tasks/task.209.setup-consumer-agent-links/task.209.setup-consumer-agent-links.md:8
  Document and registry row say in-progress while the PR is merged, and no Change Log row records
  the merge.
  → Add a Change Log row; let /finalise set the status.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — scripts/setup-consumer.sh:2031
  An unknown --link-agents id records a fail step and prints "Setup failed", but link_agents
  returns 0, so `--links-only --link-agents claud` exits 0, which a calling script reads as
  success. The unknown-id test never checks the exit code.
  → Return non-zero after recording the fail, and assert the exit code in the test.

[CR-2] cleanup · low · confidence: high — scripts/setup-consumer.sh:1930
  The agent-links block was inserted between the summary header and _status_badge doc comment and
  the function they describe.
  → Move the agent-links block above the summary header.
```

**Anchors:** 6 checked against `862c7223` (via `head-branch`) — all verified (4 ok, 2 no-line).

## Machine-Readable Findings

```yaml
reviewed_gate: none
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "docs/tasks/task.209.setup-consumer-agent-links/task.209.setup-consumer-agent-links.md:151"
    anchor_check: ok
    finding: One success criterion is open; the list has not been tried in a real terminal or on macOS.
    suggested_action: Have the user run setup-consumer.sh --links-only on Linux and macOS, or file a follow-up.
  - id: PC-2
    category: trail
    severity: medium
    confidence: medium
    ref: "docs/tasks/task.209.setup-consumer-agent-links/"
    anchor_check: no-line
    finding: No implementation report, QA report or gate records the test and mutation runs.
    suggested_action: Run /qa-task on the merged change.
  - id: PC-3
    category: consistency
    severity: medium
    confidence: high
    ref: "pr_number"
    anchor_check: no-line
    finding: The task frontmatter has no pr_number.
    suggested_action: Add pr_number 659.
  - id: PC-4
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.209.setup-consumer-agent-links/task.209.setup-consumer-agent-links.md:8"
    anchor_check: ok
    finding: Status reads in-progress while the PR is merged, and no Change Log row records the merge.
    suggested_action: Add a Change Log row; let /finalise set the status.
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "scripts/setup-consumer.sh:2031"
    anchor_check: ok
    finding: An unknown --link-agents id prints Setup failed but the script exits 0.
    suggested_action: Return non-zero after recording the fail, and assert the exit code in the test.
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "scripts/setup-consumer.sh:1930"
    anchor_check: ok
    finding: The agent-links block separates the summary header and badge comment from _status_badge.
    suggested_action: Move the agent-links block above the summary header.
truncated_count: 0
```

## Recommended Actions

1. Fix CR-1: an unknown agent id must exit non-zero.
2. Run `/qa-task` on task 209 (PC-2).
3. Try `--links-only` in a real terminal on Linux and macOS (PC-1).
