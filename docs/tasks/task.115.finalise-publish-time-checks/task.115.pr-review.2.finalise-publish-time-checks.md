# PR Review Report: PR #402 — feat(task.115): finalise publishes after its last write (pass 2)

**Reviewed:** 2026-09-13
**PR:** [#402](https://github.com/Gamaroff/agent-skills/pull/402) — `feature/task.115.finalise-publish-time-checks` → `develop` (OPEN; head `01ace56a`; CI run pending on this head, 5/5 SUCCESS on the previous one)
**Work item:** [`task.115.finalise-publish-time-checks.md`](./task.115.finalise-publish-time-checks.md) — resolved via `branch-stem`
**Tracker:** [#401](https://github.com/Gamaroff/agent-skills/issues/401) — OPEN
**Verdict:** ⚠️ CONCERNS (deterministic table: one `medium`, six `low`; no `high`)

> **Orchestrator note.** Pass 1's six findings are confirmed fixed by both lenses. Pass 2 finds one
> new MEDIUM (CR-1: a failed `git add` in 6a now presents as the idempotent "already committed" path
> — the same misattribution class obs #48 named, introduced by pass 1's own CR-2 fix) and six LOWs.
> The table says CONCERNS; this run routes to 5b once more — cycle 4 of 5 — because CR-1 inverts a
> safety check in the deliverable and the fixes are small and verified. Stated so the cost is visible.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.115.implementation.1.*` |
| Review report | ✅ | `task.115.review.1.*` |
| QA reports | 3 | `qa.1` CONCERNS 80 · `qa.2` PASS 95 · `qa.3` PASS 95 |
| Gate | PASS | `task.115.gate.3.*` (95), `top_issues: []` |
| DoD / Sprint review | — | not yet expected (pre-`/finalise`) |
| Open bugs / Handover | 0 / — | |
| Prior PR review | ✅ | `task.115.pr-review.1.*` — CR-1..5, PC-1 all fixed in `88c372dc` |

## Acceptance Criteria Traceability

Unchanged from pass 1: SC1–SC4 met; SC5 deferred by design (`parked_until: task.115 merged to develop`).

## Conformance Findings

```
[PC-1] coverage · low · confidence: low — task.115.…md:148 (§8 Testing Strategy)
  "Existing finalise protocol tests updated for the reorder" has no corresponding hunk — no existing
  test needed changing (the contract/parity suites pass untouched).
  → Reword §8: the existing finalise protocol tests needed no change; CI green confirms it.

[PC-2] consistency · low · confidence: high — task.115.…md:137 (§7 Files Summary)
  The row was re-counted to 11/9 in 88c372dc, which itself added three assertions — 14 today.
  → Stop stating tree-derived counts in the row; describe the assertion groups instead.

[PC-3] consistency · low · confidence: medium — CHANGELOG.md [Unreleased] task 115 entry
  "mutation-proved six ways" is the cycle-0 tally; the guard it names now has 14 assertions.
  → Same remedy: name the guard, not the count.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — skills/finalise/SKILL.md:1049
  6a's `git add` of the acceptance artefacts has no exit check. When it fails — bash: "pathspec did
  not match" exit 128; zsh: "no matches found" refuses the command — the index stays clean and the
  pass-1 guard reports "acceptance artefacts already committed — skipping commit, pushing": a staging
  failure presented as the benign idempotent path. Verified in a scratch repo under both shells.
  → Read the add's exit code before the guard and HALT on failure (same on the registry add), so the
    `git diff --cached --quiet` branch can only mean "already committed".

[CR-2] bug · low · confidence: high — shared/resources/develop-pipeline-step-7-finalise.md:152
  `grep -E '^[+-][^+-]'` (meant to drop +++/--- headers) also drops changed bullet lines (`+- item`,
  `-- item`), so a body edit made only of bullets is silently exempted from the residue HALT. Verified.
  → `grep -E '^[+-]' | grep -vE '^(\+\+\+|---) '`.

[CR-3] bug · low · confidence: medium — shared/resources/develop-pipeline-step-7-finalise.md:152
  `git diff -- "$f"` is unstaged-only; a document 6a staged but never committed shows `M ` in
  porcelain and an empty diff, so it passes the residue check. Verified (0 vs 7 lines).
  → `git diff HEAD -- "$f"`.

[CR-4] bug · low · confidence: medium — skills/finalise/SKILL.md:1162
  The later-turn read compares against `$CI_HEAD_2` from an earlier tool call (unset in a fresh
  shell) and the poll echoes back its own EXPECTED_HEAD argument, so the head check never tests what
  CI was sampled on; a push landing mid-poll could be recorded as SUCCESS @ CI_HEAD_2.
  → Re-derive `CI_HEAD_2=${CI_HEAD_2:-$(git rev-parse HEAD)}` on the later turn; have the poll write
    the PR head it actually sampled (`gh pr view --json headRefOid`) beside the state.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: low
    ref: "docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md:148"
    finding: "§8 claims existing finalise protocol tests were updated; no existing test changed and none needed to."
    suggested_action: "Reword §8 to say the existing tests needed no change."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md:137"
    finding: "The Files Summary row's assertion/proof counts are stale again (11/9 vs 14/14)."
    suggested_action: "Replace the counts with a description of the assertion groups."
  - id: PC-3
    category: consistency
    severity: low
    confidence: medium
    ref: "CHANGELOG.md:61"
    finding: "The task 115 CHANGELOG entry says mutation-proved six ways; the guard now has 14 assertions."
    suggested_action: "Name the guard without a count."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "skills/finalise/SKILL.md:1049"
    finding: "6a's git add has no exit check, so a staging failure leaves the index clean and the idempotency guard reports the benign already-committed path."
    suggested_action: "HALT on a non-zero git add exit before the guard, on both add lines."
  - id: CR-2
    category: bug
    severity: low
    confidence: high
    ref: "shared/resources/develop-pipeline-step-7-finalise.md:152"
    finding: "The diff-header filter also drops changed markdown bullet lines, exempting bullet-only body edits from the residue HALT."
    suggested_action: "Filter only the +++/--- header lines."
  - id: CR-3
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-7-finalise.md:152"
    finding: "git diff without HEAD misses staged-but-uncommitted changes to the document."
    suggested_action: "Use git diff HEAD -- \"$f\"."
  - id: CR-4
    category: bug
    severity: low
    confidence: medium
    ref: "skills/finalise/SKILL.md:1162"
    finding: "The later-turn head check compares an unset variable against the poll's echoed argument, so it never tests the sampled head."
    suggested_action: "Re-derive CI_HEAD_2 from git rev-parse HEAD and have the poll record the PR head it sampled."
truncated_count: 0
```

## Recommended Actions

1. CR-1 — exit-check both `git add` lines in 6a before the idempotency guard.
2. CR-2, CR-3 — fix the residue check's filter and diff base.
3. CR-4 — head-bind the later-turn read and the poll's result.
4. PC-1..3 — drop the tree-derived counts from prose; reword §8.
5. QA cycle 4, then 5c pass 3.
