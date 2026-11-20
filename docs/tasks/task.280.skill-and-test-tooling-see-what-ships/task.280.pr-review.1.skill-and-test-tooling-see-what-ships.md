# PR Review Report: PR #919 — feat(task.280): skill and test tooling see what ships

**Reviewed:** 2026-11-18
**PR:** [#919](https://github.com/Gamaroff/agent-skills/pull/919) — `feature/task.280.skill-and-test-tooling-see-what-ships` → `develop` (OPEN)
**Work item:** [`task.280.skill-and-test-tooling-see-what-ships.md`](./task.280.skill-and-test-tooling-see-what-ships.md) — resolved via `branch stem`
**Tracker:** none linked (no `github_issue`)
**Verdict:** ⚠️ CONCERNS

Scope: conformance lens only (`--no-code`; the QA loop's code review ran every cycle). The diff excluded the seven bundled `references/qa-execute-snippets.mjs` copies, which are byte-identical regenerations of `shared/resources/qa-execute-snippets.mjs`; none is named in the task's Files Summary as hand-authored.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.280.implementation.1.skill-and-test-tooling-see-what-ships-initial-run.md |
| Review report | ✅ | task.280.review.1.skill-and-test-tooling-see-what-ships.md |
| QA reports | 3 | task.280.qa.1 / qa.2 / qa.3 |
| Gate | PASS | task.280.gate.3.skill-and-test-tooling-see-what-ships.yml (95) |
| DoD | ❌ | not yet written: `/finalise` (Step 7) runs after this review |
| Sprint review | ❌ | not yet written: `/finalise` (Step 7) runs after this review |
| Open bugs | 0 | none |
| Handover | ❌ | none expected |

## Acceptance Criteria Traceability

Covered by the three QA reports and gate 3 (all five Success Criteria evidenced; wall-time criterion met on a stated bound). One gap: Phase 2's wording against what the diff delivered (PC-1).

## Conformance Findings

[PC-1] coverage · medium · confidence: medium — `tests/unbound-default-reads.test.js:192`
  Phase 2 says to switch each bash/sh extractor to `extractBlocks` and §7 item 5 ticks this file's own switch, but the diff leaves its hand-written reader in place and allowlists it as `SH_TOO`, so Phase 2 is only partly delivered (2 migrated, 17 allowlisted) and the tick overstates it.
  → Amend the task document so Phase 2 and §7 record that these readers stay allowlisted and why, or migrate them.

[PC-2] consistency · low · confidence: high — `pr_number`
  The task frontmatter has no `pr_number` field, although the implementation report records PR 919.
  → Add `pr_number: 919` to the task frontmatter.

[PC-3] trail · low · confidence: medium — `docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.implementation.1.skill-and-test-tooling-see-what-ships-initial-run.md:13`
  The report Summary still describes the pre-review scope (four checks, a fence-count check, probe mutants kept out of the walked tree) while the task as amended has three checks, a fence-balance check, and Phase 4 dropped.
  → Rewrite the Summary line to match the task's current scope.

## Code Review Findings

Skipped (`--no-code`).

**Anchors:** 3 checked against `976fe31ec63b0b19d2ad8cca4fa538915ed0f52d` (via `head-branch`) — all verified (two `unchecked-text`, one `no-line`: neither is malformed).

## Machine-Readable Findings

```yaml
reviewed_gate: task.280.gate.3.skill-and-test-tooling-see-what-ships.yml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: medium
    ref: "tests/unbound-default-reads.test.js:192"
    fix_path: "docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md"
    anchor_check: unchecked-text
    finding: "Phase 2 says to switch each bash/sh extractor to extractBlocks and section 7 item 5 ticks this file's own switch, but the diff leaves its hand-written reader in place and allowlists it as SH_TOO, so Phase 2 is only partly delivered (2 migrated, 17 allowlisted) and the tick overstates it."
    suggested_action: "Amend the task document so Phase 2 and section 7 record that these readers stay allowlisted and why, or migrate them."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "pr_number"
    fix_path: "docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.skill-and-test-tooling-see-what-ships.md"
    anchor_check: no-line
    finding: "The task frontmatter has no pr_number field, although the implementation report records PR 919."
    suggested_action: "Add pr_number: 919 to the task frontmatter."
  - id: PC-3
    category: trail
    severity: low
    confidence: medium
    ref: "docs/tasks/task.280.skill-and-test-tooling-see-what-ships/task.280.implementation.1.skill-and-test-tooling-see-what-ships-initial-run.md:13"
    anchor_check: unchecked-text
    finding: "The report Summary still describes the pre-review scope (four checks, a fence-count check, probe mutants kept out of the walked tree) while the task as amended has three checks, a fence-balance check, and Phase 4 dropped."
    suggested_action: "Rewrite the Summary line to match the task's current scope."
truncated_count: 0
```

## Recommended Actions

1. Amend the task document's Phase 2 and §7 item 5 to say the `sh`-reading and line-state readers stay allowlisted, and why (`extractBlocks` reads `bash` only).
2. Add `pr_number: 919` to the task frontmatter.
3. Rewrite the implementation report's Summary line to the three-check scope.
