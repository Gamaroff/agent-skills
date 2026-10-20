# Sprint Review Summary - Resume from evidence, not flags

**Story/Task ID:** task.188
**Epic:** _(standalone task)_
**Completed Date:** 2026-10-11
**Completed By:** develop-next → develop-task pipeline (Claude Code)
**Pull Request:** [#634](https://github.com/Gamaroff/agent-skills/pull/634)

---

## Summary

`/develop-next` and `/develop-batch` now resume from evidence (the PR's state and the roadmap row) rather than from their own run-state flags. A merge is judged by the PR's state, a pipeline HALT is recorded and surfaced on resume, and stale `merged` / `ticked` flags are reconciled before any routing.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] AC1 — a merge that exits 1 while the PR reads `MERGED` exits 0 at every merge site (bash + zsh)
- [x] AC2 — a PR that is not `MERGED` exits 1 with no remote branch delete, even when the merge exited 0
- [x] AC3 — the run state documents `halted` / `haltKind` / `prNumber`; Step 2 writes `halted: true`; a recorded HALT is checked first
- [x] AC4 — a cleared, not-accepted run re-dispatches Step 2 with `--defaults`, never Step 3
- [x] AC5 — both skills reconcile `merged`, and develop-next also reconciles `ticked`, before routing
- [x] AC6 — the roadmap-row check answers ticked / not-ticked against a fixture
- [x] AC7–AC11 — performance N/A; `npm test`, `bundle:check`, prettier, `quick_validate.py` green; CHANGELOG entry; a file without the new fields resumes unchanged

### Key Features Implemented

- **Merge verdict from the PR's state**: after `gh pr merge`, `gh pr view --json state` decides. Its exit code also covers local follow-ups and misreported a landed merge (obs #197).
- **A recorded HALT**: develop-next's run state carries the HALT. Step 0.1 surfaces the halt snapshot and stops instead of routing into Step 3 (obs #286).
- **Reconcile, then route**:
  - The merge flag is read from the PR.
  - The tick flag is read from the roadmap row on origin, then the local base branch, through select-next's own parser.
  - The tick check has five answers: ticked / ticked-unpushed / not-ticked / uncommitted / unknown.
  - Anything it cannot read halts (obs #180).

---

## Technical Details

### Files Modified/Created

- `skills/develop-next/SKILL.md`: run-state fields; Step 0.1 split into "recorded HALT", "reconcile" and the routing table; Step 2 halt write; Step 3 GitHub merge arm
- `skills/develop-batch/SKILL.md`: Step 0.1 "Reconcile first, then route"; Step 3 merge verdict
- `shared/resources/tests/merge-delete-branch-guard.test.mjs`: verdict cases per merge site, plus the merge-flag and tick-flag reconciliation cases, run against fixture repositories with a `gh` stub
- `evals/develop-next/protocol/skill-shape.test.mjs`, `evals/develop-batch/protocol/skill-shape.test.mjs`: ordering, routing rows, rule text
- `CHANGELOG.md`: `[Unreleased]` › Fixed

### Architecture/Design Decisions

The reconciliation blocks are self-contained: each sources the platform resolver itself and binds its own inputs, because every fenced block runs as its own shell. Cycle 1's version refused an unbound `VCS`, and so never ran in practice; cycle 2 caught that. The tick check reuses select-next's `parseRoadmap` instead of a second row matcher, so the `T1`/`T10`/`T100` and archived-row cases have one definition.

### Dependencies

- **New Dependencies Added:** none
- **Breaking Changes:** none. A run-state file without the new fields resumes unchanged.

---

## Testing & Quality Assurance

### Test Coverage

- **Executed tests:** the guard test's verdict and reconciliation cases (bash locally; bash + zsh on CI), 44+ in that file
- **Shape tests:** both skill-shape suites
- **QA:** 4 cycles, CONCERNS 80 → FAIL 40 → CONCERNS 90 → PASS 100; every finding closed with a mutation proof

### Code Review

- **Reviewers:** Step 5c `/review-pr` (conformance lens); a code reviewer every QA cycle
- **Approval Status:** ✅ APPROVE (`task.188.pr-review.1.resume-from-evidence-not-flags.md`)
- **Review Comments Addressed:** 1 low finding (`pr_number` absent), closed by acceptance

---

## Security & Compliance

### Security Review

✅ **Security Review Completed — PASS by recorded human override**

- [x] No hardcoded secrets; the Bitbucket credential comes from `bitbucket-auth.sh`
- [x] No unsafe patterns: static `node -e`, argv inputs, `jq --argjson`
- [x] Refusals fail closed: anything but `MERGED` halts before any delete
- [x] Probe zero-guard: the boundary is fenced prose that no probe entry form reaches. The operator overrode it on the executed fixture evidence (task.125 / task.133 precedent; follow-up task.181).

### Compliance Review

⚠️ **Not applicable**: no personal, payment, UI or health data.

---

## Documentation

### Updated Documentation

- [x] Both SKILL.md files
- [x] CHANGELOG `[Unreleased]` › Fixed

---

## Demo Notes

### How to Verify

1. `node --test shared/resources/tests/merge-delete-branch-guard.test.mjs`
2. `node --test evals/develop-next/protocol/skill-shape.test.mjs evals/develop-batch/protocol/skill-shape.test.mjs`
3. Expected outcome: every case passes, including the `OPEN`-after-exit-0 control and the uncommitted-roadmap halt

---

## Impact & Value

### User Impact

An unattended `/develop-next` or `/develop-batch` no longer re-merges a merged PR, reports a landed merge as failed, or resumes past its own HALT.

### Technical Impact

The run state is now a cache of evidence, not a source of truth. Three observed failure classes (obs #180, #197, #286) are closed at one place each.

---

## Known Limitations & Future Work

### Current Limitations

- The Bitbucket merge arm keeps its own parsing note; it does not re-query `.state` (advisory LOW in gate.4)
- A failed `git diff` reads `uncommitted` rather than `unknown` (both halt)

### Suggested Follow-Up Stories

- task.181: a probe entry form (`shell-argv:`) for fenced bash blocks, so the security zero-guard can be met without an override
- A Bitbucket guard stub for the merge-verdict cases

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +845 / -16 across 6 files (excluding task docs and bundled copies)

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
