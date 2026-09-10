# Sprint Review Summary — Task 101

**Task:** fail fast on a missing `fastGateCommand`
**Status:** ✅ Accepted — 2026-09-10
**PR:** [#371](https://github.com/Gamaroff/agent-skills/pull/371) · **Issue:** [#370](https://github.com/Gamaroff/agent-skills/issues/370)

---

## Summary

The develop loop's fast gate ran `develop.fastGateCommand`, defaulting to `npm run ci:fast` — a
script a consumer need not have. Nothing checked it before use, so the mismatch surfaced
**mid-iteration** as `Missing script: ci:fast`, at exactly the point where an operator invents a
substitute under time pressure. On the consumer run that produced this task the substitution was
invented **per-run**, so the fast gate silently differed between runs and nothing recorded that it
had.

A default cannot know a consumer's script names. It can refuse to start when it is wrong.

## Success Criteria Met

| # | Criterion | Verified by |
| --- | --- | --- |
| 1 | HALTs **before** the first iteration on a missing script | executing the extracted block against a fixture project → `exit 1` |
| 2 | Message names `develop.fastGateCommand` and `skills-config.yaml` | assertions on captured child output |
| 3 | Compound / non-npm commands left alone, not guessed at | six unreadable shapes skip; the `npm run`-leading compound checks its first script |
| 4 | The document no longer implies `npm run ci:fast` exists everywhere | mechanical sweep of all live authoring docs |
| 5 | Both shells agree **wherever both exist**, and the matrix says which ran | matrix derived from `zshAvailable()`; 12/12 with zsh, 8/8 without |

## Key Features

- **A precondition that runs once, before iteration 1** — not in the per-iteration capture block —
  extracting the script name from a command beginning `npm run <script>`, checking it against
  `npm run`'s own listing, and HALTing with the config key and file named in the message.
- **HALT rather than substitute.** Choosing a replacement gate decides what every iteration is
  checked against; that belongs in `skills-config.yaml`, where the next run reads the same value.
- **A fail-safe direction that points at skipping.** Anything the extraction cannot parse is skipped,
  never failed — a mis-parse would block correct consumers, while a false skip merely restores the
  silent mid-loop death. This is deliberately the opposite of the QA loop's exit condition.
- **`npm run ci:fast` reframed** as a suggested value for required configuration, in all six places
  that state it.

## Technical Details

**Files:** 24 changed. Authoring sources: the develop loop, the qa-fix cycle, `develop-bug`'s verify
cycle, `skills/develop/SKILL.md`, `skills/develop-next/SKILL.md`, `docs/reference/configuration.md`,
`CHANGELOG.md`. Added: `evals/shared/tests/fast-gate-precondition.test.mjs`. Modified guard:
`tests/executable-instructions.test.js`. Plus six regenerated `skills/*/references/` copies.

## Testing & QA

- **12 tests** (8 where zsh is absent), inside `npm test`. The suite **extracts the fenced block from
  the markdown and executes it** against throwaway fixture projects — behaviour, not source text.
- **3 QA cycles**: CONCERNS → CONCERNS (refute pass) → PASS 100/100. HIGH = 0 throughout.
- **Step 5c PR review**: CONCERNS; all 3 findings applied before acceptance.
- **7 mutations** applied and reverted, every one red in the predicted place.

## What went wrong, and what it cost

Three things were found *after* they had passed a gate, and each is recorded rather than smoothed over:

1. **The drafted snippet would have passed vacuously** — `$fastGateCommand` was bound nowhere, and an
   unset variable makes the check skip. Caught at review, before implementation.
2. **The precondition was filed where the loop reader would not reach it in time.** Cycle 1's
   placement check passed it, because that check used the wrong reference point — it was satisfiable
   without the property it was meant to establish. The cycle-2 refute pass found it.
3. **CI was red on the first attempt** while every local gate was green: the shell matrix was
   hardcoded and `ubuntu-latest` has no zsh. The same failure class this task exists to remove, met
   by the task's own deliverable.

The Step 5c spawn-budget finding paid for itself within the hour: it turned those four CI failures
into *"a claim about the machine, not about the check"* instead of four apparent behavioural
divergences between shells.

## Impact

Consumers whose `fastGateCommand` does not resolve now fail **at startup with an instruction naming
the key and the file**, instead of mid-loop without one. Behavioural and intended.

## Known Limitations

- The placement assertion pins the precondition below the loop section; moving it above — a
  legitimate improvement that would make the pointer unnecessary — would redden the test. Recorded
  as LOW so the objection is not rediscovered as a mystery.
- `qa-task` Step 4b cannot execute this block: `npm` is deliberately absent from the snippet engine's
  allow-list. Whether a bare `npm run` (a pure read) should be runnable is a change to a safety
  allow-list and deserves its own task.
