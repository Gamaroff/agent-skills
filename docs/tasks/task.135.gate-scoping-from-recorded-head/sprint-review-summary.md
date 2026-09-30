# Sprint Review Summary - Gate scoping from a recorded head, not a typed timestamp

**Story/Task ID:** task.135
**Completed Date:** 2026-09-30
**Completed By:** Claude (develop-next → develop-task pipeline)
**Pull Request:** [#531](https://github.com/Gamaroff/agent-skills/pull/531)

---

## Summary

QA gates now record the commit they judged (`head:`) and a clock-written `updated:`, and the QA loop's cycle-3+ scope and `qa-task`'s re-review trigger are derived from that commit instead of from a hand-typed timestamp.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A gate written by `qa-task`, `qa-story` or `qa-gate` carries `schema: 2`, a 40-hex `head:` and an `updated:` from `date -u`
- [x] Cycle N+1's file list is `git diff --name-only <gate N head>..HEAD`, whatever the gate's `updated:` says
- [x] The re-review trigger re-reviews after a commit a future-dated gate would have hidden
- [x] A schema-1 prior gate runs unscoped with the reason printed — never `--since`
- [x] The freshness test holds rewrite-proof rules over the corpus (criterion amended in QA cycle 2); no `--since=` remains in any scope path
- [x] CHANGELOG names schema 2 as Breaking with the migration

### Key Features Implemented

- **Recorded head**: every gate binds `head:` from `git rev-parse HEAD` and `updated:` from the clock.
- **One scope block**: byte-identical in the shared rule and both skills' Step 3b; NUL-delimited file list; HALTs on a missing, off-branch or unreadable head, an unbound `SAFETY_REPROBE`, or an unbound work-item directory.
- **Trigger**: counts every change outside the task's own directory — committed, uncommitted or untracked — since the head.
- **5c conformance**: two new trail rows for a gate's `head:` and `updated:`.

---

## Technical Details

### Files Modified/Created

- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-gate/SKILL.md`, `skills/qa-fix/SKILL.md`, `skills/qa-fix/resources/qa-gate-template.yaml` — gate schema 2, bind block, Phase 0 and Step 3b blocks
- `shared/resources/qa-re-review-scope.md`, `shared/resources/code-review-prompt.md`, `shared/resources/pr-conformance-prompt.md` — the scope rule and review prompts
- `shared/resources/tests/qa-scope-from-head.test.mjs` (new), `shared/resources/tests/gate-head-freshness.test.mjs` (new), `evals/shared/tests/qa-re-review-scope-parity.test.mjs`
- `CHANGELOG.md`; regenerated bundled `references/` copies

### Architecture/Design Decisions

The corpus freshness test keeps only rules a branch rewrite cannot break; existence and ancestry of a head are checked in the loop and at 5c, while the branch is intact, because `develop-batch` rebases open PRs and `mergeStrategy` allows squash.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** gate `schema: 2` — schema-1 gates stay valid; tooling that accepts only schema 1 adds 2

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 45 new tests across the two new suites (bash + zsh variants), plus the updated parity suite
- **Mutation proofs:** 21 (M1–M21), each reddening its predicted test
- **QA:** 4 cycles (FAIL 60 → FAIL 40 → FAIL 40 → CONCERNS 90); 13 bugs filed and closed; 5c PR review APPROVE

---

## Known Limitations and Future Work

- CR4-1: validate `head:` (40-hex, resolves, ancestor) before counting in the trigger
- CR4-2: run the scoped diff with `--literal-pathspecs`
- CR3-4 / CR3-7: recompute clause 1 inside the scope block; show uncommitted fixes
- 5c CR-1 / CR-2: check the step-5 helper's exit code; trim before unquoting in `field()`
- Pre-existing (not this branch): the Step 3b `mktemp` template is not randomised by BSD `mktemp` (observation #181)
