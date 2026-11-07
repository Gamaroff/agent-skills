# Sprint Review Summary - qa-fix finds the whole defect the first time

**Story/Task ID:** task.268
**Completed Date:** 2026-11-07
**Pull Request:** [#854](https://github.com/Gamaroff/agent-skills/pull/854)

---

## Summary

`qa-fix` now catches the repeat-finding shapes the QA loop kept producing: eight rules from eight observations, so a fix is complete the first time instead of drawing a new finding each cycle.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] Eight rules in `skills/qa-fix/SKILL.md`, each citing its observation, listed in the QA report
- [x] Each rule fires on its fixture and stays silent on its control (8/8 and 8/8)
- [x] Step 7 warns, adds the owed block, then posts (criterion reworded from "refused", approved)
- [x] Suite wall time unchanged: median 160 s on `develop` and on the branch
- [x] Named tests pass, `bundle --check` clean, `quick_validate` passes, no "four moves" prose

### Key Features Implemented

- **Probes**: classifier direction, weakest value, earlier refusal, pre-fix population search (Step 3.5)
- **Structural moves**: narrow the contract, extract to a script (Step 2.6, now six moves)
- **Step 4 staging guard**: refuses untracked files, a mistyped path, and pathspec magic, held by a six-test file with four mutants
- **Step 7 check**: warns when an owed block is missing

---

## Technical Details

### Files Modified/Created

- `skills/qa-fix/SKILL.md` - the rules, probes and guards
- `tests/qa-fix-step4-guard.test.js` - new; the Step 4 guard with mutation proofs
- `tests/qa-fix-structural-move.test.js` - six-move wording
- `shared/resources/develop-pipeline-step-3-develop-loop.md` and its generated copies - stage new files before the gate
- `CHANGELOG.md` - entry for task 268

---

## Testing & QA

Five QA gates (the last CONCERNS, 80/100). Security probe: 18 executed, 0 reproduced.

## Known Limitations and Future Work

- T268-QA-10: shell metacharacters in a changed path expand in the Step 4 slot assignment
- T268-QA-11: a path in a nested repository or behind a symlink reads clean
- The develop-loop doc still shows a bare unguarded `git ls-files --others` listing
