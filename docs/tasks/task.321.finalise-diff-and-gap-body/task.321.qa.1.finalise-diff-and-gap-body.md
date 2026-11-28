# QA Report: Task 321 - finalise's diff fallback is one commit, and its gap body leaks a marker

**Task**: [Link to task document](./task.321.finalise-diff-and-gap-body.md)
**Gate File**: [task.321.gate.1.finalise-diff-and-gap-body.yml](./task.321.gate.1.finalise-diff-and-gap-body.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: CONCERNS

---

## Executive Summary

The diff reader, the three prompts and the gap-body rule do what the task asks, and every § 8 row is held by a test that drives the script. The independent diff review found two defects, and QA reproduced both by execution. The Step 3e cleanup block reads `$DIFF_FILE` with no writer in its own shell: it deletes `./.names` and leaves both state files behind. The forge arm keeps bundled copies that the contract says the patch leaves out.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — T321-CR-101 fixed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 boxes ticked)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#969, OPEN)

### Testing Approach

- [x] Automated Testing (unit, executed prose)
- [x] Regression Testing (`ci:fast` on the LAN server)
- [x] Security Review
- [x] Code Review (independent subagent)

### Review Methodology

Direct tools (4 phases, low risk, one module family), plus one read-only Explore subagent for the diff review. First review (no prior gate), so the diff was not scoped: `origin/develop...HEAD`, 21 files, 1930 patch lines. Reviewer dispatched 12:18Z and returned at 12:20Z (`duration_ms` 92600). Its two anchors both check `ok` (`finding-anchors.js`, rev `d7eb2ce2cc5c`).

Diff review: code review (the change set holds `.sh` and `.mjs` files).

CI on d7eb2ce2cc5c: pending

Step 4b: `qa-execute-snippets.mjs` over the four changed runnable-prose files, `--diff-base` the merge base:

- `skills/finalise/SKILL.md`: 2 changed blocks, both `mutating` (they call `resolve-pr-number.sh`, `gh` and `rm`), so 0 executed. The engine reports `changed-blocks-not-executed` and `zero-blocks-executed` (52 blocks: 2 placeholder, 50 mutating). Both are advisory and are kept as the engine reported them.
- The three prompts hold no bash block (0 changed).

The Step 3a diff lines are executed by a committed test instead: `finalise-diff.test.mjs` "Step 3a records a **PR diff:** line for merge-base, forge and unresolved" cuts them out of `SKILL.md` and runs them in bash and zsh. The Step 3e block had no such test, and CR-101 is that gap.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :-- | :-- | :-- | :-- |
| Phase 1: The diff reader | CONCERNS | Verified | 4 steps, 2 files, 1 line, bash and zsh; CR-102 on the forge arm |
| Phase 2: `/finalise` uses it | CONCERNS | Verified | Step 3a correct and executed; Step 3e misfires in its own shell (CR-101) |
| Phase 3: The gap body | PASS | Verified | Red before the rule, green after |
| Phase 4: Records and bundle | PASS | Verified | CHANGELOG cites task 321; `bundle:check` 0 problems |

**Overall Phase Completion**: 4/4 implemented; 2 with findings

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| :-- | :-- | :-- | :-- |
| 1 | Every row of the two § 8 tables holds in a test that drives the script | PASS | `finalise-diff.test.mjs`: one case per row, ×2 shells; the gh-fails row is the first case (it asserts no `pr diff` call); the check-5 row is the bundled-copy case plus the prompt-contract check-5 test. Gap rows: `finalise-gaps-path.test.mjs` marker, fenced and count cases |
| 2 | No block in `skills/finalise/SKILL.md` runs `git diff HEAD~1 HEAD` | PASS | `finalise-dod-prompt-contract.test.mjs` "Step 3a reads the change through finalise-diff.sh…" |
| 3 | The Step 3a block writes a `**PR diff:**` line for each source | PASS | the executed-prose case above |
| 4 | The AC prompt fails a set criterion on an empty names list | PASS | prompt-contract "the AC quantifier rule…" |
| 5 | Docs and fix-evidence: FAIL "the change could not be read"; check 5 reads `.names` | PASS | prompt-contract "each diff-reading prompt…" and "fix-evidence check 5…" |
| 6 | Performance: not applicable | PASS | no bound claimed |
| 7 | Reverting each rule alone turns a named test red (recorded here) | PASS | § Mutation proofs below, re-run at this head |
| 8 | `npm run test:remote` passes | PASS | `ci:fast` on the LAN server: 9045 tests, 9042 pass, 0 fail, 3 skipped (GATE_RC=0). The commits after that run change only documents |
| 9 | `bundle:check` passes, and shellcheck on the new script | PASS | `bundle freshness: 129 skill(s) checked, 0 problems`; `shellcheck --severity=warning` clean at HEAD |
| 10 | `npm run validate -- skills/finalise/` passes | PASS | `✓ finalise`; also `✓ review-story`, `✓ review-task` (their bundled copies changed) |
| 11 | `CHANGELOG.md` `[Unreleased]` names the change | PASS | `changelog-cites.sh task.321` → `cites (task 321)`, rc 0 |

Criteria drift: `criteria-drift.js` → `clean` (base `review-commit`). Boundary signals: `[]`.

### Mutation proofs (criterion 7)

Re-run at head `d7eb2ce2cc5c`, after the diff reviewer had returned and with nothing else reading the tree. Each file was snapshotted with `cp`, mutated with the file tool, restored, and `cmp`-checked. Baseline was 74/74 before the first mutation and after the last.

- mutation-proven: exclusion lookup disabled (`false && git cat-file -e …`) → `finalise-diff.test.mjs` "a bundled copy is excluded from the patch and kept in the names…" and "every changed file is a bundled copy: unresolved…", red in bash and zsh → covered
- mutation-proven: the empty-patch rule disabled (`if false && [ ! -s "$OUT" ]`) → "every changed file is a bundled copy: unresolved, and the names list is kept", red in bash and zsh → covered
- mutation-proven: the `dod-gap-count.sh` marker rule disabled (`0 && …`) → `finalise-gaps-path.test.mjs` "--body stops at every start marker change-log.js defines" and "--body keeps a fenced marker inside the section", red in bash and zsh → covered

Two more were run at development time, before the commits, and recorded in the implementation report: the forge-arm empty check → "the branch adds nothing and the forge diff is empty"; the marker rule's `!infence` → "--body keeps a fenced marker inside the section". Both are held by the same committed tests.

---

## Breaking Changes Validation

None declared. `/finalise` takes the same arguments. A run with no readable change now records `unresolved` and fails set criteria instead of passing them; that is the intended fix, and the CHANGELOG states it.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: Step 3e cleanup reads `$DIFF_FILE` with no writer (T321-CR-101)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: `skills/finalise/SKILL.md:1359`, `rm -f "$DIFF_FILE" "$DIFF_FILE.names"`, is its own fenced block, and nothing in it binds `DIFF_FILE`. Run alone it is `rm -f "" ".names"`.
- **Reproduction** (scratch directory holding `.claude/state/pr-diff-1.diff`, its `.names` and a `./.names`; the block cut from `SKILL.md`):
  - bash: `./.names` deleted; `pr-diff-1.diff pr-diff-1.diff.names` left.
  - zsh: `./.names` deleted.
  - Control, with `DIFF_FILE=.claude/state/pr-diff-1.diff` bound in the same shell: both state files removed, `./.names` kept.
- **Provenance**: the base block is `rm -f "$DIFF_FILE"`. It had the same unbound read but deleted nothing. This task introduced the `.names` deletion, and the task's own Phase 2 changed this line, so the finding is in scope.
- **Impact**: each `/finalise` run leaves a patch and a names list in `.claude/state/`, and may delete a `.names` file at the repository root.
- **Recommendation**: bind `DIFF_FILE` in the Step 3e block from a path Step 3a records, use `${DIFF_FILE:?}`, and add an executed test in both shells.
- **Origin**: code-review CR-1 (medium/high), reproduced by QA. Gate-blocking under `code_review_blocking=true`.

### LOW Severity Issues (1)

**T321-CR-102 — the forge patch keeps bundled copies.** `shared/resources/finalise-diff.sh:144` writes `gh pr diff` verbatim. Reproduction: a merged PR that changes `shared/resources/tool.md` and `skills/s/references/tool.md` gives `source=forge pr=7 files=2` with the copy in the patch. Control: the same change read on the merge-base arm gives `files=1 excluded=1` and no copy in the patch. The header, Step 3a's prose and the fix-evidence prompt all say the patch leaves the copies out. The names list is right on both arms, so check 5 still works; the docs prompt reads hunks from a larger patch than described. Origin: code-review CR-2 (low/medium), reproduced by QA. Script: `cr2-repro.mjs`, run from the session scratchpad.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No bound is claimed. One `git diff --name-only` and one `git diff` replace one forge call, plus one `git cat-file -e` per `references/` path.

### Reliability — CONCERNS
CR-101: the cleanup misfires in its own shell. Otherwise the reader answers `unresolved` for every failure path the § 8 table names: no PR, a failed PR read, a missing base, a failed forge call, an empty forge diff, and only bundled copies. Each answer truncates both files, so a stale patch is never read as this run's.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `dod-gap-count.sh` is `boundary: internal`. Its input is the gaps section `/finalise` writes. The `markdown-structure` sink fits the content, but `security-probe.mjs --sink markdown-structure --entry 'shell:shared/resources/dod-gap-count.sh'` refuses it: `entry-not-probeable — sink "markdown-structure" is not materialised — the shell entry form needs a fixture definition in MATERIALISED_SINKS`. Task 222's gates 1–2 made the same decision. That refused run wrote a record with `executed: 0`, and it was removed, since `/finalise`'s zero-guard would read it as an unprobed boundary.
- `finalise-diff.sh` is `boundary: false`. It is a reader that reports its source, and its `unresolved` answer is recorded and prevents no action (exit 1 is not a HALT). Candidates looked at: the resolved/unresolved arms and the bundled-copy lookup.
- No input reaches a shell evaluation. Paths travel as arguments, the exclusions use `:(top,exclude,literal)`, and the forge's error text is printed, never run.

### Maintainability — PASS
One reader replaces an inline fallback chain. The test reads the change-log markers from `change-log.js` rather than restating them, and it has a non-vacuity floor.

---

## Code Review

**Correctness bugs (2):**
- [medium/high] `skills/finalise/SKILL.md:1359` — Step 3e reads `$DIFF_FILE` with no writer in its own shell, deleting `./.names` and leaving both state files → bind it in the block and fail on empty. **Promoted: T321-CR-101.**
- [low/medium] `shared/resources/finalise-diff.sh:144` — the forge patch keeps bundled copies the contract says it leaves out → filter them, or document that it keeps them. **Promoted (reproduced): T321-CR-102.**

**Cleanups (0).**

Boundary decision: `dod-gap-count.sh` internal; `finalise-diff.sh` false (see Security). `probes_executed: 0`, `escaped: 0`.

---

## Regression Testing

| Area | Result |
| :-- | :-- |
| Whole suite (`ci:fast`, LAN server) | PASS — 9045 tests, 0 failed |
| `finalise-gaps-path.test.mjs`, the task 222/223 cases and the new ones | PASS — 46 of 46 (the whole file) |
| `finalise-dod-prompt-contract.test.mjs` existing cases | PASS |
| The eleven pattern-pinning tests listed in § 7 | PASS — inside `ci:fast` |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-diff.sh`, `shared/resources/dod-gap-count.sh`, `skills/finalise/SKILL.md` Steps 3a and 3e, the three DoD prompts, and the three test files.

### Test Commands Executed
```bash
command node --test shared/resources/tests/finalise-diff.test.mjs shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
npm run test:remote
npm run bundle:check
shellcheck --severity=warning shared/resources/finalise-diff.sh
npm run validate -- skills/finalise/   # and review-story, review-task
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
bash .agents/skills/qa-task/references/changelog-cites.sh task.321
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 969
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed file> --diff-base <merge-base> --json
```

### Coverage Report
Not measured. The repository has no coverage tool for shell or Markdown; coverage here is the per-row test table and the mutation proofs.

---

## Recommendations

### Immediate Actions (Blocking)
1. T321-CR-101 — bind `DIFF_FILE` in Step 3e and fail on an empty value; hold it with an executed test.

### Short-term Actions (Non-Blocking)
1. T321-CR-102 — make the forge patch match the contract, or say what it holds.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium functional defect, reproduced, in a line this task changed; one low contract mismatch, reproduced.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T321-CR-101 fixed

---

**QA Report**: co-located at `task.321.qa.1.finalise-diff-and-gap-body.md`
**Gate File**: co-located at `task.321.gate.1.finalise-diff-and-gap-body.yml`
**Next Steps**: `/qa-fix` for CR-101 and CR-102, then QA cycle 2 (refute pass).
