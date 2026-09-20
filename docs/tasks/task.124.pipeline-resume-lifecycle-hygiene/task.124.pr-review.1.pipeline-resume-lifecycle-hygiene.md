# PR Review Report: PR #436 — feat(task.124): resume trusts what it finds on disk

**Reviewed:** 2026-09-20
**PR:** [#436](https://github.com/Gamaroff/agent-skills/pull/436) — `feature/task.124.pipeline-resume-lifecycle-hygiene` → `develop` (OPEN)
**Work item:** [`task.124.pipeline-resume-lifecycle-hygiene.md`](./task.124.pipeline-resume-lifecycle-hygiene.md) — resolved via `branch-stem`
**Tracker:** [#424](https://github.com/Gamaroff/agent-skills/issues/424) — OPEN
**Verdict:** ⚠️ CONCERNS

**Scope:** `origin/develop...origin/feature/task.124.pipeline-resume-lifecycle-hygiene` excluding `*/references/*` (131 bundled AUTO-GENERATED copies, 9 980 / 1 524 lines — none named in the PR body or a commit subject); reviewed 103 files, 8 421 / 405 lines. Effort: medium. Pipeline Step 5c (develop-task), after gate 6 PASS.

---

## Artifact Trail

| Artifact | Status | Detail |
|---|---|---|
| Implementation report | ✅ | task.124.implementation.1.pipeline-resume-lifecycle-hygiene-initial-run.md |
| Review report | ✅ | task.124.review.1.pipeline-resume-lifecycle-hygiene.md |
| QA reports | 6 | task.124.qa.1–6.pipeline-resume-lifecycle-hygiene.md |
| Gate | PASS | task.124.gate.6.pipeline-resume-lifecycle-hygiene.yml (95) — reached 5c (`**Action**: Proceeding to 5c` on `### QA Cycle 6`) |
| DoD | ❌ | none — correct: document is `ready-for-review`, not `accepted` |
| Sprint review | ❌ | none (task; not expected) |
| Open bugs | 0 | 14 bug reports, all Closed |
| Handover | ❌ | none |

## Acceptance Criteria Traceability

| Criterion | Evidence in diff | Status |
|---|---|---|
| Dirty tree on resume classified and recorded; an overlay never reaches `git add` | `develop-pipeline-resume-contract.md` Working-tree probe; eval fixtures 13–16 | ✅ met (see CR-1 for the bug-variant gap) |
| Healthy resume with no step-3 summary not blocked | `pipeline-resume-detector-prompt.md` summary-gap rule keyed on the report's `Subagent summary ref` column; fixture 15 | ✅ met |
| No `last-halt.json` survives a completed run for the same work item | `develop-pipeline-step-8-commit.md` same-document deletion; fixture 16 | ✅ met (see CR-5) |
| Stop hook does not re-prompt a step with `waiting_on` set | `set-waiting-on.sh` + `develop-pipeline-on-stop.sh` jq predicate; `set-waiting-on.test.sh` 19/19; `qa-loop-lock-fields-parity` dispatch-population test | ✅ met (see CR-2) |
| HALT removes the lock in bash and zsh with an empty glob | two-command form in 3 SKILL.md + step-8; `halt-snippet-glob-safe.test.mjs` 8/8 | ✅ met |
| Structurally invalid report cannot be committed by the pipeline | `report-lint.js` at four call sites; `report-lint.test.mjs` 12/12 | ✅ met |
| In-session continuation restores the lock with one command; advancing with no lock is an error | `advance-pipeline-lock.sh --restore`; `advance-pipeline-lock.test.sh` 67/67; exercised live twice on this PR | ✅ met |
| Performance: probe cost as stated | Cost sentence matches the shipped probe | ✅ met |
| `report-lint.js` pure with a thin CLI; one reader | `report-lint.js` exports + CLI | ✅ met |
| Every mechanism has a mutation proof recorded | QA reports 1–6 | ✅ met |
| Migration: observations #85 #86 #88 #89 #111 #115 #123 close naming the PR | observations still `parked` (`parked_until: task.124 merged to develop`) | ⚠️ partial — post-merge action (PC-1) |

## Conformance Findings

```
[PC-1] coverage · low · confidence: high — §9 Migration criterion (ticked)
  The Migration criterion is ticked, but all seven observations still read status: parked with parked_until "task.124 merged to develop" and an empty resolved: field; PR #436 is still OPEN.
  → Untick until the PR merges and the observations are resolved naming #436, or note in the criterion that closure is a post-merge action.

[PC-2] consistency · low · confidence: high — §6 Phase 3 lint call-site bullet
  The task document says every lint call site exits 1 on failure, but the shipped contract (QA cycle 2 CR-5) has call site (2) in the three orchestrator HALT rules and the PreCompact hook skip only the commit and proceed with the halt.
  → State that sites (1) and (4) HALT with exit 1 while site (2) and the PreCompact hook skip the commit and continue the halt.

[PC-3] consistency · low · confidence: high — ## Progress Tracking (QA / Gate rows)
  The Progress Tracking checklist leaves QA and Gate unticked although six QA reports and six gates exist and the QA Testing Results block records gate 6 PASS.
  → Tick the QA and Gate rows naming qa.6 / gate.6.
```

## Code Review Findings

```
[CR-1] bug · medium · confidence: high — shared/resources/develop-pipeline-resume-contract.md:115
  The probe's base fallback greps a "| Feature branch base |" row that only the story/task report variants carry; the bug variant records the base as "**Branch model:** … (base: X …)" (implementation-report-template.md:244), so a develop-bug hotfix off main resumed before Step 4 (no PR yet) is still classified against origin/develop — the cycle-5 CR-2 defect, in the one pipeline where the base is routinely not develop.
  → Add a second sed arm for the bug variant's "(base: X" form (or HALT instead of defaulting when the report carries neither shape), and pin it with a develop-bug hotfix eval.

[CR-2] bug · medium · confidence: high — shared/resources/develop-pipeline-hooks.md:129
  The waiting_on population check passes while missing a dispatch in its own scope: develop-bug-step-3-investigate-fix.md:18 dispatches a read-only Explore subagent (root-cause localisation) with the lock present and carries no set-waiting-on mark, so that wait is still re-prompted as a stall.
  → Widen the enumeration pattern (case-insensitive "Explore subagent|Agent tool"), mark the develop-bug Step 3 dispatch, and assert every match has a set-waiting-on.sh call within N lines.

[CR-3] bug · medium · confidence: medium — shared/resources/pipeline-resume-detector-prompt.md:85
  The stale-snapshot rule has the detector rm -f last-halt.json, but the detector runs as a read-only Explore subagent; "deleted" is then a self-reported verdict the orchestrator trusts while the file may survive, and a later --restore for that document could rebuild a lock for a merged run.
  → Have the detector only report stale-snapshot with the path, and perform the rm -f in the orchestrator's Phase 0a handling (or in --restore via a MERGED check).

[CR-4] bug · low · confidence: medium — shared/resources/grant-qa-cycles.sh:144
  The never-lower guard reads qa_max_cycles from $SNAPSHOT only, while the --restore it delegates to may pick a newer .lock.pausing.<pid> claim (or reject a snapshot for another document), so the guard can compare k against the wrong file's budget. (Carried since QA cycle 1 as CR-5 → recommendations.future.)
  → Resolve the candidate the way --restore will (a --which/--dry-run that prints the winner) and read the budget from that file.

[CR-5] cleanup · low · confidence: medium — shared/resources/develop-pipeline-step-8-commit.md:105
  Step 8 deletes only a snapshot whose task_or_story_directory is non-empty and matches, whereas --restore accepts a snapshot with no directory as a match for any document, so a pre-task.123 snapshot survives every completed run.
  → Treat an absent directory the same way at both sites.
```

## Machine-Readable Findings

```yaml
findings:
  - id: PC-1
    category: coverage
    severity: low
    confidence: high
    ref: "§9 Migration — Observations #85, #86, #88, #89, #111, #115, #123 close naming the PR (ticked)"
    finding: "The Migration criterion is ticked, but all seven observations still read status: parked with parked_until \"task.124 merged to develop\" and an empty resolved: field, and PR #436 is still OPEN."
    suggested_action: "Untick the Migration checkbox until the PR merges and the observations are resolved naming PR #436, or note that closure is a post-merge action."
  - id: PC-2
    category: consistency
    severity: low
    confidence: high
    ref: "§6 Phase 3 — lint call-site bullet"
    finding: "The task document states every lint call site exits 1 on failure, but call site (2) in the three orchestrator HALT rules and the PreCompact hook skip only the commit and proceed with the halt."
    suggested_action: "Update the Phase 3 bullet to state that sites (1) and (4) HALT with exit 1 while site (2) and the PreCompact hook skip the commit and continue the halt."
  - id: PC-3
    category: consistency
    severity: low
    confidence: high
    ref: "## Progress Tracking — QA and Gate rows"
    finding: "The Progress Tracking checklist leaves QA and Gate unticked although six QA reports and six gates exist and the QA Testing Results block records gate 6 PASS."
    suggested_action: "Tick the QA and Gate rows naming qa.6 / gate.6."
  - id: CR-1
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/develop-pipeline-resume-contract.md:115"
    finding: "The probe's base fallback greps a Feature-branch-base row only the story/task report variants carry; the bug variant records the base as **Branch model:** … (base: X …), so a develop-bug hotfix off main resumed before Step 4 is still classified against origin/develop."
    suggested_action: "Add a second sed arm for the bug variant's (base: X form, or HALT instead of defaulting when the report carries neither shape, and pin it with a develop-bug hotfix eval."
  - id: CR-2
    category: bug
    severity: medium
    confidence: high
    ref: "shared/resources/develop-pipeline-hooks.md:129"
    finding: "The waiting_on population check misses develop-bug-step-3-investigate-fix.md:18, which dispatches a read-only Explore subagent with the lock present and carries no set-waiting-on mark."
    suggested_action: "Widen the enumeration pattern, mark the develop-bug Step 3 dispatch, and assert every match has a set-waiting-on.sh call within N lines."
  - id: CR-3
    category: bug
    severity: medium
    confidence: medium
    ref: "shared/resources/pipeline-resume-detector-prompt.md:85"
    finding: "The stale-snapshot rule has the read-only detector subagent rm -f last-halt.json, so \"deleted\" is a self-reported verdict the orchestrator trusts while the file may survive."
    suggested_action: "Have the detector only report stale-snapshot and perform the rm -f in the orchestrator's Phase 0a handling or in --restore via a MERGED check."
  - id: CR-4
    category: bug
    severity: low
    confidence: medium
    ref: "shared/resources/grant-qa-cycles.sh:144"
    finding: "The never-lower guard reads qa_max_cycles from $SNAPSHOT only, while --restore may select a different candidate."
    suggested_action: "Resolve the candidate the way --restore will and read the budget from that file."
  - id: CR-5
    category: cleanup
    severity: low
    confidence: medium
    ref: "shared/resources/develop-pipeline-step-8-commit.md:105"
    finding: "Step 8 deletes only a snapshot with a matching non-empty task_or_story_directory, whereas --restore accepts a snapshot with no directory for any document."
    suggested_action: "Treat an absent directory the same way at both sites."
truncated_count: 0
```

## Recommended Actions

1. **CR-1 (medium/high)** — bind the probe base for the bug-variant report (`**Branch model:** … (base: X`) or HALT when neither shape is found; the develop-bug hotfix is the branch model where the default is wrong and the (a) discard is destructive. Worth fixing before merge; one sed arm.
2. **CR-2 (medium/high)** — mark the develop-bug Step 3 root-cause dispatch with `set-waiting-on.sh`; widen the dispatch-population pattern in `qa-loop-lock-fields-parity.test.mjs` so this site is enumerated.
3. **CR-3 (medium/medium)** — move the stale-snapshot `rm -f` out of the read-only detector into the orchestrator's Phase 0a handling. (Premise partly unverified: in this repository's sessions the Explore subagent does have Bash and the delete has executed; the point stands that a self-reported delete is trusted without a re-read.)
4. PC-1..PC-3 — task-document hygiene: Migration criterion is post-merge; Phase 3 lint bullet overstates the contract; Progress Tracking rows unticked.
5. CR-4 / CR-5 — carried follow-ups (cycle-1 CR-5 already in every gate's `recommendations.future`).
