# Sprint Review Summary - Snippet engine runs pipeline blocks

**Story/Task ID:** task.191
**Completed Date:** 2026-10-19
**Completed By:** Lorien Gamaroff (autonomous `/develop-next` run)
**Pull Request:** [#687](https://github.com/Gamaroff/agent-skills/pull/687)

---

## Summary

`qa-execute-snippets.mjs` now executes the pipeline blocks a change actually touches. It fills `{template}` slots, runs blocks that call or source a bundled helper when the helper itself would run, and reports changed blocks separately, so a QA pass can no longer go green while executing none of them.

---

## What Was Delivered

### Acceptance Criteria Met

- [x] A `{NAME}` block runs with `--slot NAME=VALUE`. Without the flag, the placeholder finding names the missing slot.
- [x] A slot value that adds a write makes the block mutating, because slot values are classified as code.
- [x] `bash` / `sh` / `source` / `.` of a runnable helper inside the working copy runs, and functions a sourced helper defines are recognised.
- [x] These are refused: a writing helper, a variable path, a path escaping the copy, a depth-2 writer, and a helper call after a directory change.
- [x] The shipped `qa-cycle.sh` / `newest-numbered.sh` classify runnable. `advance-pipeline-lock.sh` / `set-qa-phase.sh` classify mutating.
- [x] `--diff-base <rev>` counts changed blocks apart, and `changed-blocks-not-executed` fires when none of them ran.
- [x] qa-task Step 4b and qa-story Phase 1.7 pass `--diff-base` and report the changed counts first.
- [x] Helper classification is bounded at depth 2. `npm test`, `bundle:check`, `prettier --check` and `quick_validate` all pass.
- [x] The CHANGELOG entry names `--slot`, the helper rule and `--diff-base`.

### Key Features Implemented

- **`--slot`**: fills template slots before classification, so a filled block is judged as written.
- **Helper rule**: a helper call runs only when the helper's own text is runnable. Forwarded arguments are judged as if written to the reached command. A function's reach is the union of every definition of its name.
- **`--diff-base`**: a per-block `changed` flag, a `changed` summary, and the `changed-blocks-not-executed` finding.

---

## Technical Details

### Files Modified/Created

- `shared/resources/qa-execute-snippets.mjs` - `--slot`, the helper rule, `--diff-base` (+874)
- `shared/resources/tests/qa-execute-snippets.test.mjs` - 180 tests, including every refusal control and the incident fixtures (+894)
- `shared/resources/qa-runnable-prose-detection.md` - §2aa helper rule, §2c slots, §4a diff base
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` - Step 4b / Phase 1.7 pass `--diff-base` and `--slot`
- `evals/shared/tests/qa-execution-step-parity.test.mjs` - pins the two callers to the same text
- `CHANGELOG.md` - task 191 entry
- Bundled copies under `skills/*/references/` - regenerated

### Architecture/Design Decisions

The allow-list stays the boundary. A helper adds nothing its text would not do written as a block. Four QA cycles tightened that rule. On the third strike against function propagation, the mechanism was replaced rather than patched: every body defined under a name counts toward its reach.

### Dependencies

- **New Dependencies Added:** None
- **Breaking Changes:** None. Blocks that ran before still run, and the new flags are opt-in.

---

## Testing & Quality Assurance

### Test Coverage

- **Unit Tests:** 180 tests in `shared/resources/tests/qa-execute-snippets.test.mjs`; parity test in `evals/shared/tests/qa-execution-step-parity.test.mjs`
- **Full suite:** ci:fast 5878/0; CI green on `97f29ef2` (link-check, shellcheck, test, validate)
- **Security probes:** 102 executed at DoD, 0 reproduced (`task.191.dod.1.security.run.json`)

### Code Review

- **Reviewers:** Step 5c `/review-pr` (this repository requires no human reviews)
- **Approval Status:** ✅ APPROVE
- **Review Comments Addressed:** 10 QA bugs found and closed over 4 cycles

---

## Security & Compliance

### Security Review

✅ **Security Review Completed**

- [x] Helper paths are resolved by realpath and contained in the working copy
- [x] A `--diff-base` revision that is empty or starts with a dash is refused (exit 2)
- [x] No secrets, eval or shell-string execution added
- [x] No dependencies added

### Compliance Review

✅ **Not applicable** — internal QA tooling with no personal data, payments, UI or PHI.

---

## Documentation

### Updated Documentation

- [x] Rule document `qa-runnable-prose-detection.md` (§2aa, §2c, §4a)
- [x] qa-task Step 4b and qa-story Phase 1.7
- [x] CHANGELOG entry

---

## Demo Notes

### How to Verify

1. `command node shared/resources/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --copy-as skills:.agents/skills --diff-base origin/develop --json`
2. Read the `changed` summary: changed blocks are counted apart from the rest.
3. Expected: helper-calling blocks that previously classified `unrecognised-command` now execute.

---

## Impact & Value

### User Impact

QA reports now say whether the blocks a change touched actually ran, instead of a green total that may cover none of them.

### Technical Impact

The snippet engine's runnable population grows to include the pipeline's own helper-calling blocks, without widening what may write.

---

## Known Limitations & Future Work

### Current Limitations

- CR2-7: the `runBlock` timeout kills only the outer shell. CR2-8: an empty-fence span (both advisory).
- Observation #67: pre-existing base-scan limits (a command after a heredoc, `"$(…)"` inside double quotes, quoted deny words).

### Suggested Follow-Up Stories

- Run each block in its own process group (CR2-7), and store the closing-fence line (CR2-8).
- CR4-1/CR4-2 cleanups; a test for `--no-textconv`; observation #68 (security-probe JS-entry control keying).

---

## Metrics _(if applicable)_

- **Lines of Code Changed:** +1993 / -48 (excluding bundled copies and task docs)
- **QA Cycles:** 4

---

**Status:** ✅ **ACCEPTED**

_This story/task has been verified against the Definition of Done and is ready for Sprint Review presentation._
