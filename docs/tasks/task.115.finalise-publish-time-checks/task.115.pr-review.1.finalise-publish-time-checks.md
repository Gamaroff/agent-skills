# PR Review Report: PR #402 — feat(task.115): finalise publishes after its last write — publish boundary, second CI read, CHANGELOG mechanism

**Reviewed:** 2026-09-13
**PR:** [#402](https://github.com/Gamaroff/agent-skills/pull/402) — `feature/task.115.finalise-publish-time-checks` → `develop` (OPEN, CI 5/5 SUCCESS on `ba11efc1`)
**Work item:** [`task.115.finalise-publish-time-checks.md`](./task.115.finalise-publish-time-checks.md) — resolved via `branch-stem`
**Tracker:** [#401](https://github.com/Gamaroff/agent-skills/issues/401) — OPEN
**Verdict:** ⚠️ CONCERNS (deterministic table: three `medium` findings, none `high`+`high`)

> **Orchestrator note (develop-task Step 5c).** The table yields CONCERNS, which does not block. This
> run nevertheless routes back to 5b before Step 7, because CR-1 — verified independently against
> `sync-jira-task.js` — would make the rule this PR adds false-fire on **every Jira consumer's**
> `/finalise`, and a cycle spent fixing it now is cheaper than a bug filed by the first consumer
> to hit it. The lens ratings are kept as emitted; the routing decision is the orchestrator's and is
> recorded in the implementation report's Decisions Log.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.115.implementation.1.finalise-publish-time-checks.md` |
| Review report | ✅ | `task.115.review.1.finalise-publish-time-checks.md` (READY TO IMPLEMENT 8/10) |
| QA reports | 2 | `task.115.qa.1.*` (CONCERNS 80), `task.115.qa.2.*` (PASS 95) |
| Gate | PASS | `task.115.gate.2.finalise-publish-time-checks.yml` (95) — `top_issues: []` |
| DoD | — | not yet expected (status `ready-for-review`, pre-`/finalise`) |
| Sprint review | — | not yet expected |
| Open bugs | 0 | — |
| Handover | — | none (access `full`) |

Scope excluded from the diff: `skills/*/references/*` (12 regenerated bundler copies).

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| SC1 — DoD body carries its status once | `skills/finalise/SKILL.md` Step 0 template; shape test `the DoD running-summary template carries no **Status:** header line` | ✅ met |
| SC2 — two CI readings, second on the pushed head, no side-effect before SUCCESS | `SKILL.md` Step 6 `CI_HEAD_1`, Step 7 6a–6c; shape tests (order, both heads, background poll) | ✅ met (CR-2, CR-3 harden 6a/6c) |
| SC3 — tracked-and-pushed at Step 7 and 5c; no suppressed `git commit` | `SKILL.md` 6b; step-7 doc DoD post; step-5-6 doc 5c; fenced-commit scan | ✅ met (CR-4: the `\|\| :` alias slips the scan) |
| SC4 — drift test + `/finalise` warn; `(bug N)` documented | `evals/shared/tests/changelog-entry-drift.test.mjs`; `SKILL.md` 6d; `releases.md` | ✅ met (CR-5: case mismatch between the two checks) |
| SC5 — observations close naming the PR | `parked_until: task.115 merged to develop` | ⚠️ deferred by design (post-merge) |

## Conformance Findings

```
[PC-1] consistency · low · confidence: medium — task.115.finalise-publish-time-checks.md:137 (§7 Files Summary)
  The Files Summary row still says "9 protocol-shape assertions … mutation-proved 6 ways" while the
  shipped test has 11 test() blocks and the qa-fix Change Log row and gate 2 record 11 / 9.
  → Update the §7 row to 11 assertions, mutation-proved 9 ways (6 + 3 from QA cycle 1).
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/develop-pipeline-step-7-finalise.md:135
  The new "document still dirty after /finalise returns means 6a did not run — HALT" rule (restated
  in step-8-commit.md) false-fires on every Jira project: Step 7 action 8's Document-link re-point
  runs sync-jira-{story,task} AFTER the 6a acceptance commit, and that script unconditionally rewrites
  jira_last_synced_at / jira_last_body_hash / jira_last_meta_hash (updateTaskFile → writeFileSync).
  Verified: sync-jira-task.js:313–356, 1007–1008.
  → Exempt the jira_last_* frontmatter-only residue from the HALT rule (compare the diff minus those
    keys) and have Step 8 carry it explicitly; or move the re-link before 6a (rejected: it is an
    outward Jira write and belongs after the boundary).

[CR-2] bug · medium · confidence: high — skills/finalise/SKILL.md:1059
  6a runs `git commit` unconditionally and HALTs on any non-zero exit, while the note two lines later
  says to skip the commit when the staged paths are already clean — on a re-run `git commit` exits 1
  for "nothing to commit", reported as "acceptance commit rejected", indistinguishable from a hook
  rejection.
  → Put the `git diff --cached --quiet` guard in the block: skip the commit (not the push) when clean;
    keep the HALT for a genuine non-zero exit.

[CR-3] bug · medium · confidence: medium — skills/finalise/SKILL.md:1118
  6c writes the poll script, its log and the result file under .claude/state/ without `mkdir -p
  .claude/state`; in a standalone run or fresh worktree the heredoc write and the nohup redirect
  fail, the poll never starts, and the later-turn read reports "still polling" forever.
  → `mkdir -p .claude/state` before `rm -f "$RESULT"`; record the poll pid and have the later-turn read
    HALT when the pid is gone and no result exists.

[CR-4] bug · low · confidence: high — evals/shared/tests/finalise-publish-boundary.test.mjs:256
  The suppression regex `\|\|\s*(true|:)\b` never matches `|| :` at end of line (`\b` after `:` needs
  a following word character) — verified false on `git commit -m x || :`.
  → `\|\|\s*(true\b|:(?=\s|$))`.

[CR-5] cleanup · low · confidence: high — skills/finalise/SKILL.md:1192
  In 6d the first alternative `\(task ${N}\b` is subsumed by `\btask[ .]${N}\b`, and the grep is
  case-sensitive while the drift test's citedTasks uses /i — `Task 115` passes CI but warns at
  acceptance (one such capitalised citation exists in [Unreleased] today).
  → Drop the redundant alternative and add -i so both checks accept the same set.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/tasks/task.115.finalise-publish-time-checks/task.115.finalise-publish-time-checks.md:137"
    finding: "Files Summary describes the shape test as 9 assertions mutation-proved 6 ways; the shipped file, the qa-fix Change Log row and gate 2 record 11 / 9."
    suggested_action: "Update the §7 row to 11 protocol-shape assertions, mutation-proved 9 ways."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/develop-pipeline-step-7-finalise.md:135"
    finding: "The new dirty-document HALT rule false-fires on every Jira project because Step 7 action 8's sync-jira re-link rewrites jira_last_* frontmatter after the 6a commit."
    suggested_action: "Exempt the jira_last_* frontmatter-only residue from the HALT rule in the step-7 and step-8 docs and have Step 8 carry it explicitly."
  - id: CR-2
    category: bug
    severity: medium
    confidence: high
    ref: "skills/finalise/SKILL.md:1059"
    finding: "6a's unconditional git commit reports a nothing-to-commit exit 1 on re-run as an acceptance-commit rejection."
    suggested_action: "Guard the commit with git diff --cached --quiet inside the block, skipping the commit but not the push when clean."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/finalise/SKILL.md:1118"
    finding: "6c writes under .claude/state/ without mkdir -p, so in a fresh worktree the poll never starts and the later-turn read says still polling forever."
    suggested_action: "Add mkdir -p .claude/state before rm -f $RESULT, record the poll pid, and HALT the later-turn read when the pid is gone with no result."
  - id: CR-4
    category: bug
    severity: low
    confidence: high
    ref: "evals/shared/tests/finalise-publish-boundary.test.mjs:256"
    finding: "The suppression regex cannot match `|| :` at end of line because \\b after `:` needs a following word character."
    suggested_action: "Use \\|\\|\\s*(true\\b|:(?=\\s|$))."
  - id: CR-5
    category: cleanup
    severity: low
    confidence: high
    ref: "skills/finalise/SKILL.md:1192"
    finding: "6d's first grep alternative is redundant and the grep is case-sensitive while the drift test matches case-insensitively."
    suggested_action: "Drop the redundant alternative and add -i."
truncated_count: 0
```

## Recommended Actions

1. CR-1 — exempt the `jira_last_*` residue from the dirty-document HALT in both pipeline docs (consumer-breaking on Jira as written).
2. CR-2, CR-3 — harden 6a (idempotent commit guard) and 6c (`mkdir -p`, pid-aware read).
3. CR-4, CR-5, PC-1 — regex, `-i`, Files Summary row.
4. Re-run QA (cycle 3) and 5c on the fixed tree before `/finalise`.
