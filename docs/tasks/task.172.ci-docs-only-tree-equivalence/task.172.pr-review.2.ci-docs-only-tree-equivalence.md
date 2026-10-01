# PR Review Report: PR #543 — feat(task.172): one docs-only CI rule at every pipeline CI wait

**Reviewed:** 2026-10-01 (second review; the first is `task.172.pr-review.1.ci-docs-only-tree-equivalence.md`)
**PR:** [#543](https://github.com/Gamaroff/agent-skills/pull/543) — `feature/task.172.ci-docs-only-tree-equivalence` → `develop` (OPEN)
**Work item:** [`task.172.ci-docs-only-tree-equivalence.md`](./task.172.ci-docs-only-tree-equivalence.md) — resolved via `branch-stem`
**Tracker:** [#539](https://github.com/Gamaroff/agent-skills/issues/539) — OPEN
**Verdict:** ⚠️ CONCERNS

Scope: the whole PR against `develop` (about 10,000 lines) with the generated `skills/*/references/*` copies excluded (byte copies of `shared/resources/` sources plus one header line). Run at `--effort medium` after QA cycle 8 (gate 8 PASS 95, through the Cosmetic-residue exit) and the DoD security fixes (`1cde0528`). The conformance lens was told what the first review and `/finalise` run 1 found and asked to check the trail afresh; the code lens was pointed at the paths QA reviewed least (the Bitbucket reads, the three prose call sites, the evals tests, an end-to-end wrong-acceptance construction) and told not to re-review the matcher, the group kill or the dirty-tree rule. Both lenses ran as dispatched read-only subagents (conformance about 2 minutes, code about 8.5 minutes; neither hung).

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | `task.172.implementation.1.ci-docs-only-tree-equivalence-initial-run.md` |
| Review report | ✅ | `task.172.review.1.ci-docs-only-tree-equivalence.md` |
| QA reports | 8 | `task.172.qa.1` to `task.172.qa.8` |
| Gate | PASS | `task.172.gate.8.ci-docs-only-tree-equivalence.yml` (95); head `1cde0528` is an ancestor of the PR head |
| DoD | ⚠️ | `task.172.dod.1.*.md` is the `/finalise` run that stopped on five gaps; no accepted DoD yet (expected) |
| Sprint review | ❌ | not expected yet |
| Open bugs | 27 | `task.172.bug.1` to `task.172.bug.27`, each `Ready for QA`; gate 8 verified the last two |
| Handover | ❌ | none |
| PR reviews | 2 | this one and `task.172.pr-review.1.*.md` |

## Acceptance Criteria Traceability

| Criterion group | Evidence | Status |
|---|---|---|
| Functional (4 sites, FAILURE never equivalent, code-changed, Bitbucket 403, opt-out) | gate 8 phases 1 to 4; the engine's tests | ✅ met per gate 8 |
| Performance | gate 8 performance PASS | ✅ met per gate 8 |
| Code quality (as narrowed by the operator to fix-driven tests) | QA 6 to 8 `mutation-proven:` lines; see PC-1 and PC-2 | ⚠️ partial: one proof was not recorded in a report, two branches are untested |
| Migration (CHANGELOG, `configuration.md`) | both edited in the PR | ✅ present |

## Conformance Findings

[PC-1] coverage · medium · confidence: high — Success Criteria (narrowed) and `task.172.qa.8` lines 100-105
  The SEC-2 test (the token-walk glob matcher, bug 27) had no `mutation-proven:` line in any QA report, so the narrowed wording was evidenced for three of the four SEC fixes.
  → Record the proof, or re-run it. **Addressed after the review:** a `mutation-proven:` line for it was added to QA report 8, from the run in the fix cycle (red after 304 s of exponential matching).

[PC-2] coverage · low · confidence: medium — `task.172.qa.8` lines 103-104
  Two branches of the dirty-tree rule (the rename/copy source-path parse; an unreadable `git status` read as clean) have tests that stay green when the code is mutated, so "every fix-driven test is mutation-proved red on revert" is literally unmet for them; gate 8 carries them in `recommendations.future`.
  → Add the two cases to SEC-3 and record the red proofs, or state the exception in the criterion. **Not addressed:** recorded in Deferred Work.

[PC-3] trail · low · confidence: high — Change Log rows
  There was no "QA findings fixed" row for cycle 5 (fix commit `e5547550`) and none for the DoD security fix commit `1cde0528`.
  → **Addressed after the review:** both rows added.

[PC-4] trail · low · confidence: medium — `task.172.bug.1` to `task.172.bug.27`, line 7
  All 27 bug reports read `Ready for QA` beside a PASS gate.
  → Close them, or leave it to `/finalise`. **Not addressed.**

[PC-5] consistency · low · confidence: high — the work item's `## Definition of Done - Gaps Identified`
  The gaps block was not labelled superseded and contradicted the QA Testing Results section.
  → **Addressed after the review:** retitled "run 1 (historical, superseded)" with a status line saying so.

[PC-6] consistency · low · confidence: medium — `docs/reference/configuration.md`, the `checkCommand` foreground bullet; gate 8 CR8-1
  `configuration.md` stated the process-group kill without the reproduced interrupt-path residual.
  → **Addressed after the review:** one sentence added.

[PC-7] consistency · low · confidence: medium — the work item's `### Deferred Work` against gate 8's `recommendations.future`
  Deferred Work omitted the PR-review items gate 8 still carries.
  → **Addressed after the review:** the items were added.

## Code Review Findings

[CR-1] bug · medium · confidence: medium — `skills/finalise/SKILL.md:2645`
  The Step 8a retake of reading 1 is recorded as plain `{CI_ROLLUP} @ {CI_HEAD_1}` while Step 7 reuses the stale `CI_TREE_EQ` from the first reading; after a docs-only fix the poll can conclude tree-equivalent and the record then reads plain SUCCESS, and after a retake that waited for real CI it can be labelled with the old green sha. The lens judged it **cannot cause a wrong acceptance**: the engine refuses a code fix (`code-changed`) and a red docs ancestor stops the walk.
  → Add the tree-equivalent clause to the 8a record and checklist and re-bind `CI_TREE_EQ` from the poll's `TREE_EQ` field. (The first review's CR-3, still open.)

[CR-2] bug · medium · confidence: high — `skills/finalise/SKILL.md:797`
  `CI_CHECKS_1` is counted from the PR head's rollup before the docs-only arm, so a tree-equivalent reading 1 hands the 6c poll the unfinished head's check count as its `EXPECTED_CHECKS` floor, and the partial-rollup guard drops to "stable". It cannot by itself accept unverified code, because the acceptance commit is docs-only over code the green ancestor verified; it can record a plain SUCCESS for reading 2 over fast lanes only.
  → Set `CI_CHECKS_1` to 0 and record it as not applicable when the arm resolved the reading, or take it from the green ancestor's check count. (The first review's CR-2, still open.)

[CR-3] bug · medium · confidence: medium — `shared/resources/ci-tree-equivalence.js:962`
  The foreground arms run `checkCommand` with a default timeout of 1500 s (this repository sets 570 s) and tell the agent nothing about the host call's own timeout (default 120 s); a host kill orphans the check, because the check is detached (confirmed: a detached child survives its parent being SIGKILLed). The result is no answer, a leaked suite and a rule that never fires.
  → Default `checkTimeoutSeconds` under the host timeout and have the prose tell the agent to raise the Bash timeout for the foreground arm, or run the check in the background with a result file. (The same family as gate 8's CR8-1.)

[CR-4] bug · low · confidence: high — `skills/develop-next/SKILL.md:221`
  On the Bitbucket path nothing in develop-next Step 3 binds `CI_ROLLUP` (the rollup jq is gh-only), so the arm's `${CI_ROLLUP:?}` guard aborts and the Bitbucket engine path is unreachable unless the agent hand-maps the statuses.
  → Add a Bitbucket statuses-to-PENDING/NONE reduction that binds `CI_ROLLUP`, or state the mapping in the arm.

[CR-5] bug · low · confidence: low — `shared/resources/ci-tree-equivalence.js:733`
  The engine's network reads have no bound: the Bitbucket `fetch` has no `AbortSignal` timeout and the `gh api` calls have no timeout, so a hung call in the 6c poll's decision loop stalls the poll past `MAX_WAIT`.
  → Pass an `AbortSignal.timeout` to `fetch` and a timeout to the `gh` and `git` exec calls so each read fails closed as UNKNOWN.

[CR-6] bug · low · confidence: low — `skills-config.yaml:54`
  This repository's `checkCommand` runs no docs link check, although `docs-link-check.yml` runs only on docs paths, so a docs-only head with a broken link is accepted as tree-equivalent while its own link-check is still pending. The residual is documented as accepted.
  → Append a loop that runs `doc-links.js` over the changed docs to `checkCommand`, or record the exposure.

[CR-7] cleanup · low · confidence: high — `shared/resources/ci-tree-equivalence.js:537`
  `readConfig`, the working-tree reader, is exported but has no production caller, and a comment in `isDocsPath` names it where `readConfigAtCommit` is meant.
  → Remove `readConfig` or mark it test-only, and correct the comment.

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: medium
    confidence: high
    ref: "Success Criteria (narrowed) and task.172.qa.8 lines 100-105"
    finding: "The SEC-2 test had no mutation-proven line in any QA report, so the narrowed criterion was evidenced for three of four SEC fixes."
    suggested_action: "Record the proof in a QA report."
  - id: PC-2
    category: coverage
    severity: low
    confidence: medium
    ref: "task.172.qa.8 lines 103-104"
    finding: "Two branches of the dirty-tree rule have tests that stay green when the code is mutated."
    suggested_action: "Add the two cases to SEC-3 and record the red proofs, or state the exception."
  - id: PC-3
    category: trail
    severity: low
    confidence: high
    ref: "task.172.ci-docs-only-tree-equivalence.md Change Log"
    finding: "No qa-fix row for cycle 5 and none for the DoD security fix commit 1cde0528."
    suggested_action: "Add both rows."
  - id: PC-4
    category: trail
    severity: low
    confidence: medium
    ref: "task.172.bug.1 to task.172.bug.27, line 7"
    finding: "All 27 bug reports read Ready for QA beside a PASS gate."
    suggested_action: "Close them, or leave it to /finalise."
  - id: PC-5
    category: consistency
    severity: low
    confidence: high
    ref: "task.172.ci-docs-only-tree-equivalence.md Definition of Done - Gaps Identified"
    finding: "The gaps block was not labelled superseded and contradicted the QA Testing Results section."
    suggested_action: "Label it as run-1 history."
  - id: PC-6
    category: consistency
    severity: low
    confidence: medium
    ref: "docs/reference/configuration.md checkCommand foreground bullet"
    finding: "configuration.md stated the process-group kill without the interrupt-path residual."
    suggested_action: "Add one sentence."
  - id: PC-7
    category: consistency
    severity: low
    confidence: medium
    ref: "task.172.ci-docs-only-tree-equivalence.md Deferred Work versus gate 8 recommendations.future"
    finding: "Deferred Work omitted the PR-review items gate 8 still carries."
    suggested_action: "List them."
  - id: CR-1
    category: bug
    severity: medium
    confidence: medium
    ref: "skills/finalise/SKILL.md:2645"
    finding: "The 8a retake of reading 1 has no tree-equivalent clause and Step 7 reuses a stale CI_TREE_EQ, so the record can read plain SUCCESS or carry the old green sha; it cannot cause a wrong acceptance."
    suggested_action: "Add the clause and re-bind CI_TREE_EQ from the poll's TREE_EQ field."
  - id: CR-2
    category: bug
    severity: medium
    confidence: high
    ref: "skills/finalise/SKILL.md:797"
    finding: "CI_CHECKS_1 is counted before the docs-only arm, so a tree-equivalent reading 1 gives the 6c poll the unfinished head's check count as its floor."
    suggested_action: "Set it to zero or take it from the green ancestor when the arm resolved the reading."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/ci-tree-equivalence.js:962"
    finding: "A host kill of the engine orphans the detached check, and the foreground arms say nothing about the host's tool timeout."
    suggested_action: "Default the check timeout under the host timeout and tell the arm to raise it, or run the check in the background."
  - id: CR-4
    category: bug
    severity: low
    confidence: high
    ref: "skills/develop-next/SKILL.md:221"
    finding: "On Bitbucket nothing in develop-next Step 3 binds CI_ROLLUP, so the arm's guard aborts."
    suggested_action: "Add a Bitbucket statuses-to-rollup reduction or state the mapping."
  - id: CR-5
    category: bug
    severity: low
    confidence: low
    ref: "shared/resources/ci-tree-equivalence.js:733"
    finding: "The engine's network reads have no timeout, so a hung call can stall the 6c poll."
    suggested_action: "Pass timeouts so each read fails closed as UNKNOWN."
  - id: CR-6
    category: bug
    severity: low
    confidence: low
    ref: "skills-config.yaml:54"
    finding: "This repository's checkCommand runs no docs link check, so a docs-only head with a broken link can be accepted while its link-check is pending."
    suggested_action: "Run doc-links.js over the changed docs in checkCommand, or record the exposure."
  - id: CR-7
    category: cleanup
    severity: low
    confidence: high
    ref: "shared/resources/ci-tree-equivalence.js:537"
    finding: "readConfig is exported with no production caller and a comment names it where readConfigAtCommit is meant."
    suggested_action: "Remove or mark readConfig test-only and fix the comment."
truncated_count: 0
```

## Recommended Actions

1. Before relying on a `/finalise` reading satisfied by tree-equivalence, decide CR-2 and CR-1: neither can cause a wrong acceptance (the lens argued this and the engine refuses a code delta), but they weaken the partial-rollup guard and the record's wording.
2. CR-3 and gate 8's CR8-1 are one family: a check detached into its own session is not stopped by a host kill of the engine. Raise the Bash timeout for the foreground arm when it runs, or move the check to a background poll.
3. PC-2 and PC-4 are open; the rest of the conformance findings were fixed in the same step.
4. CR-4 to CR-7 are advisory.
