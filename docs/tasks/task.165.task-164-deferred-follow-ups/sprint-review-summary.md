# Sprint Review Summary — Task 165

**Task:** Close task.164's deferred follow-ups
**PR:** [#757](https://github.com/Gamaroff/agent-skills/pull/757) → `develop`
**Accepted:** 2026-10-26 · **Gate:** PASS 100/100 · **QA cycles:** 5 · **DoD runs:** 2

---

## Summary

Task.164 was accepted with eight LOW items carried forward. Six of them were wording or guard-reach
gaps in what it shipped. One was test cost. One was a mismatch that predated it: the `--skill`
mapping in `advance-pipeline-lock.sh` claimed `review-task` advances the lock, and nothing in
`review-task` did. This task closes all eight. It also gates both review skills' lock advance on a
passing review, so a lock never reaches Step 3 on a review the orchestrator is about to HALT on.

## Success Criteria Met

9 / 9. DoD run 1 found two gaps (AC3, AC8): the "a decoy `NEXT=` arm is not read" clause had been
proven only by a one-off mutation, with no lasting test. Both were closed by a mutation-proven test
and re-gated. Run 2 accepted.

## Key Features

- **Outcome-gated lock cooperation** in `review-task` (new) and `review-story` (gated). The lock
  advances only on READY TO IMPLEMENT / GO with the document promoted to `ready-for-development`.
  On any other outcome the block holds the lock and says why.
- **Exception 2** in the remaining-work banner now cites the `--skill` mapping as where a sub-skill
  moves the lock. It contrasts only with blocks derived from `current_step`, and it says what a HALT
  inside the Steps 5–6 loop lists first.
- **The HALT pin** refuses a plain-prose relisting of the mapping, not only a backticked one. It
  reads the mapping from its own `case "$SKILL_NAME" in`, not from the first `--skill)` arm.
- **The hook `--complete` floor** checks the `COMPLETION_LINE=` and `ALREADY_DONE=` bindings by name.
- **The 4b meta-test** no longer re-runs the whole lock test file. It went from 3.729s at base to
  0.251s at head, re-measured on the PR head at DoD run 2.

## Testing & QA

- `ci:fast` green at 6394 / 0. All 6 CI checks are green on the PR.
- Eight Phase 5 mutations proven red with `cmp`-checked restores, each held by a lasting per-PR test.
- New `review-lock-cooperation.test.mjs` executes both gated blocks as written, under every shell
  available, against a lock at Step 2.

## Security

Probe mode fired on the two review-skill lock gates (sink `filename`, slot `{outcome}`). It ran 22
cases from committed fixtures at gate 3, dod.1 and dod.2, with **0 reproduced and 0 escaped** each
time. No secrets, unsafe patterns or dependency changes.

## Demo Notes

```
review-task, lock at 2:  READY TO IMPLEMENT + ready-for-development  → lock 3
review-task, lock at 2:  NEEDS REVISION                              → lock 2,
  "review-task: pipeline lock not advanced — the verdict is not a pass, ..."
review-story, lock at 2: NO-GO                                       → lock 2, the same line for review-story
```

## Impact

The `--skill` mapping is now true for every skill it names. A failed review can no longer move the
lock past the step it should HALT on. The 4b meta-test's cost is gone from every `npm test` run.

## Known Limitations / Future Work

From gate 5's `recommendations.future`:

- CR-1: positive controls for `namesSkill`
- CR-2: anchor the hook-floor check to the `NEXT=8` branch
- CR-3: the redundant `/?`
- From gate 3: the review gates read status from frontmatter only; review-story Step 10 field; unset `ADVANCE_LOCK_TEST_4B_ONLY` for `test:suite`
