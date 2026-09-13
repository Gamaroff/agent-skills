# PR Review Report: PR #402 — feat(task.115): finalise publishes after its last write (pass 3)

**Reviewed:** 2026-09-13
**PR:** [#402](https://github.com/Gamaroff/agent-skills/pull/402) — `feature/task.115.finalise-publish-time-checks` → `develop` (OPEN; head `03c8f3c7`; CI pending on this head, 5/5 SUCCESS on earlier heads)
**Work item:** [`task.115.finalise-publish-time-checks.md`](./task.115.finalise-publish-time-checks.md) — resolved via `branch-stem`
**Tracker:** [#401](https://github.com/Gamaroff/agent-skills/issues/401) — OPEN
**Verdict:** ✅ APPROVE (deterministic table: four `low` findings, nothing `medium` or `high`)

> Pass-2's seven findings are confirmed fixed by both lenses — the code lens re-ran the add-failure
> and residue-check paths in a scratch repo. The four LOWs below are recorded for the follow-up; the
> loop exits to Step 7 as the table directs. Three 5c passes on one PR is the shared 5-cycle budget
> working as designed: each pass reviewed fixes that were themselves new code.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.115.implementation.1.*` |
| Review report | ✅ | `task.115.review.1.*` (READY 8/10) |
| QA reports / Gates | 4 / 4 | `qa.1` CONCERNS 80 → `qa.2`, `qa.3`, `qa.4` PASS 95; `gate.4` `top_issues: []` |
| PR reviews | 2 prior | `pr-review.1` (CONCERNS → fixed), `pr-review.2` (CONCERNS → fixed) |
| DoD / Sprint review | — | not yet expected (pre-`/finalise`) |
| Open bugs / Handover | 0 / — | |

## Acceptance Criteria Traceability

SC1–SC4 met (unchanged from passes 1–2); SC5 deferred by design (`parked_until: task.115 merged to develop`).

## Conformance Findings

```
[PC-1] consistency · low · confidence: high — task.115.…md:232 (QA Testing Results › Key Findings)
  The sentence still counts pass 1's "six more" 5c findings and omits pass 2's seven, which the
  Change Log row, the Critical Issues line and gate.4 all record as fixed.
  → Reword without a count: "two 5c passes found further issues, all fixed in review-driven cycles
    and verified by re-review".
```

## Code Review Findings

```
[CR-1] bug · low · confidence: high — shared/resources/develop-pipeline-step-7-finalise.md:155
  The pass-2 header filter `grep -vE '^(\+\+\+|---) '` also discards a removed body line that begins
  `-- ` (rendered `--- dash line`) or an added one beginning `++ `, so such an edit passes the residue
  check as clean. Verified. Narrow: task/story bodies rarely open a line with `-- `.
  → Strip the preamble positionally: `sed '1,/^@@/d'` before the `^[+-]` grep; update the assertion.

[CR-2] cleanup · low · confidence: high — skills/finalise/SKILL.md:1140
  After the pass-2 CR-4 fix the poll script's `EXPECTED_HEAD=$2` is dead — documented, passed, never
  read, since the result line carries `$(sampled_head)`.
  → Drop the argument, or use it to break the poll early when the sampled head diverges.

[CR-3] cleanup · low · confidence: medium — skills/finalise/SKILL.md:1120
  The first 6c block's PR-head equality check reads bare `$CI_HEAD_2`; run as a separate tool call
  from 6a it compares against an empty string and HALTs spuriously (fail-safe, but noisy).
  → Add the same `CI_HEAD_2=${CI_HEAD_2:-$(git rev-parse HEAD)}` line at the top of the first 6c
    block so both 6c blocks share one derivation rule.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md:232"
    finding: "The Key Findings sentence counts only pass 1's 5c findings."
    suggested_action: "Reword to cover both 5c passes without a count."
  - id: CR-1
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/develop-pipeline-step-7-finalise.md:155"
    finding: "The header filter also drops removed body lines beginning `-- ` and added lines beginning `++ `."
    suggested_action: "Strip the diff preamble positionally with sed '1,/^@@/d' instead of by pattern."
  - id: CR-2
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/finalise/SKILL.md:1140"
    finding: "EXPECTED_HEAD in the poll script is dead after the sampled-head fix."
    suggested_action: "Remove it or use it for an early divergence break."
  - id: CR-3
    category: cleanup
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:1120"
    finding: "The first 6c block does not re-derive CI_HEAD_2 and HALTs spuriously in a fresh shell."
    suggested_action: "Add the re-derivation line at the top of the first 6c block."
truncated_count: 0
```

## Recommended Actions

1. Fold the four LOWs into the follow-up alongside the unsubstituted-`rollup()` placeholder and the `(bug N)` backfill — none blocks merge.
2. Proceed to `/finalise`.
