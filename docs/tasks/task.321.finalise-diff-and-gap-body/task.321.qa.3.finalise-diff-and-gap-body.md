# QA Report: Task 321 - finalise's diff fallback is one commit, and its gap body leaks a marker

**Task**: [Link to task document](./task.321.finalise-diff-and-gap-body.md)
**Gate File**: [task.321.gate.3.finalise-diff-and-gap-body.yml](./task.321.gate.3.finalise-diff-and-gap-body.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: PASS

---

## Executive Summary

Both cycle-2 findings are fixed. Each fix is held by a test that went red before the fix and goes red again when the fix is removed. The scoped refute pass found no bugs, only three low cleanups, which are recorded as future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| :-- | :-- | :-- | :-- |
| T321-CR-201 — the prompts read a `**PR diff:**` line no agent received | medium | ✅ FIXED | `<DIFF_LINE>` is passed by the AC and fix-evidence dispatch (`skills/finalise/SKILL.md` Step 3b), and `DIFF_LINE` is bound in Step 3a before dispatch. The Append 1 and bug-template Step 2 blocks carry the slot. Held by three `finalise-dod-prompt-contract.test.mjs` tests: mutation (bug row without `<DIFF_LINE>`, Append 1 without the slot) → 2 red |
| T321-CR-202 — the merge-base patch took the host's git config | low | ✅ FIXED | `PIN` flags on both `git diff` calls; `gh pr diff --color=never`. Held by "[bash\|zsh] a hostile user git config does not reach the patch": mutation (`PIN` removed from the patch diff) → 2 red |

## New Findings This Cycle

None that gate. Three low cleanups (CR-301 to CR-303), recorded under `recommendations.future`.

---

## Testing Scope

### Review Methodology

Direct tools, with one read-only Explore subagent for the diff review.

Re-review scope: scoped — `6230df1b1..391bd04e5` (the prior gate's `head:` to this head), 15 files.

The reviewer was asked to refute both fixes first. Every refutation failed: `DIFF_LINE` is bound at Step 3a before dispatch, `--color=never` is a listed `gh pr diff` form, the `PIN` flags leave `--name-only -z` and the pathspec excludes intact, and the new tests are not vacuous.

CI on 391bd04e5f03: pending

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| :-- | :-- | :-- | :-- |
| 1 | Every § 8 row holds in a test that drives the script | PASS | `finalise-diff.test.mjs` 35 of 35 |
| 2 | No block in `skills/finalise/SKILL.md` runs `git diff HEAD~1 HEAD` | PASS | prompt-contract "Step 3a reads the change through finalise-diff.sh" |
| 3 | The Step 3a block writes a `**PR diff:**` line for each source | PASS | executed Step 3a case; the line now reaches the agents and the Append 1 slot |
| 4 | The AC prompt fails a set criterion on an empty names list | PASS | prompt-contract "the AC quantifier rule…" |
| 5 | Docs and fix-evidence: FAIL "the change could not be read"; check 5 reads `.names` | PASS | prompt-contract "each diff-reading prompt…", "fix-evidence check 5…" |
| 6 | Performance: not applicable | PASS | no bound claimed |
| 7 | Reverting each rule alone turns a named test red (recorded here) | PASS | § Mutation proofs |
| 8 | `npm run test:remote` passes | PASS | `ci:fast` on the LAN server at `391bd04e5`: 9055 tests, 9052 pass, 0 fail, 3 skipped (rc 0) |
| 9 | `bundle:check` passes, and shellcheck on the new script | PASS | 129 skills, 0 problems; shellcheck clean |
| 10 | `npm run validate -- skills/finalise/` passes | PASS | `✓ finalise`, `✓ review-story`, `✓ review-task` |
| 11 | `CHANGELOG.md` `[Unreleased]` names the change | PASS | the task 321 entry, now naming `<DIFF_LINE>` and the pinned flags |

Criteria drift: `clean` (base `review-commit`). Boundary signals: `[]`.

### Mutation proofs (criterion 7)

At head `391bd04e5` (the qa-fix cycle 2 tree). Each was edited with the file tool, run, restored, and re-run green (133 of 133).

- mutation-proven: bug-mode dispatch without `<DIFF_LINE>` → "task 321: every <DIFF_*> placeholder a DoD prompt reads is passed by its dispatch row" → covered
- mutation-proven: Append 1 without `**PR diff:** {DIFF_LINE}` → "task 321: the PR diff line has one writer, the Step 2 template, and a re-run replaces it" → covered
- mutation-proven: `PIN` removed from the patch `git diff` → "[bash|zsh] a hostile user git config does not reach the patch…" → covered
- Carried from QA report 2, with the code lines unchanged since: the Step 3e bind, the exclusion lookup, the empty-patch rule and the `dod-gap-count.sh` marker rule.

---

## Issues Found

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (gating)

---

## Code Review

**Correctness bugs (0).**

**Cleanups (3):**
- [low/high] `shared/resources/tests/finalise-diff.test.mjs:229` — `diff.relative` only acts from a subdirectory, and the test runs at the repo top, so `--no-relative` is untested → add a subdirectory case.
- [low/high] `shared/resources/finalise-diff.sh:116` — no test covers `--no-ext-diff` or `--no-textconv` → add `diff.external` to the hostile config.
- [low/medium] `skills/finalise/SKILL.md:1371` — a summary written before this change has no `**PR diff:**` line to replace → say "replace or insert under `**PR Status:**`".

Boundary decision: unchanged from gate 1. `probes_executed: 0`, `escaped: 0`.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No open finding; both cycle-2 fixes are held by mutation-proven tests; the full suite is green.
**Quality Score**: 96/100

**QA Report**: co-located at `task.321.qa.3.finalise-diff-and-gap-body.md`
**Gate File**: co-located at `task.321.gate.3.finalise-diff-and-gap-body.yml`
**Next Steps**: `/review-pr` (Step 5c).
