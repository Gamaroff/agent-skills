# QA Report: Task 321 - finalise's diff fallback is one commit, and its gap body leaks a marker

**Task**: [Link to task document](./task.321.finalise-diff-and-gap-body.md)
**Gate File**: [task.321.gate.2.finalise-diff-and-gap-body.yml](./task.321.gate.2.finalise-diff-and-gap-body.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-28
**Testing Completed**: 2026-11-28
**Gate Status**: CONCERNS

---

## Executive Summary

Both cycle-1 findings are fixed. Each fix is held by a test that goes red when the fix is reverted. The cycle-2 refute pass found one defect in a cycle-1 fix: the forge-patch rewording tells the agents to read a `**PR diff:**` line they are never given. QA also reproduced that the merge-base patch picks up the host's git config.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — T321-CR-201 fixed

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| :-- | :-- | :-- | :-- |
| T321-CR-101 — Step 3e read an unbound `$DIFF_FILE` | medium | ✅ FIXED | Step 3a and Step 3e bind the same fixed path; `finalise-diff.test.mjs` runs Step 3a and then Step 3e in separate shells (bash, zsh): both state files go, and `./.names` stays. Mutation re-run at this head below |
| T321-CR-102 — the forge patch keeps copies the contract denied | low | ⚠️ PARTIAL | The script, the CHANGELOG and the test now state and hold the behaviour ("source=forge keeps a bundled copy…"). The prompts' new wording depends on a line the agents never receive: T321-CR-201 |

## New Findings This Cycle

- **[medium/high]** `shared/resources/finalise-dod-ac-prompt.md:56` (and `finalise-dod-fix-evidence-prompt.md:51`) — the prompts read "Step 3a's `**PR diff:**` line", which no agent receives → pass it as a `<DIFF_LINE>` substitution. **T321-CR-201.**
- **[low/low, reproduced]** `shared/resources/finalise-diff.sh:132` — the merge-base patch takes the host's git config → pin the output flags. **T321-CR-202.**
- Advisory: CR-2, CR-3, CR-5 (see Code Review).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#969, OPEN)

### Testing Approach

- [x] Automated Testing (unit, executed prose)
- [x] Regression Testing (`ci:fast` on the LAN server)
- [x] Security Review
- [x] Code Review (independent subagent, refute pass)

### Review Methodology

Direct tools, with one read-only Explore subagent for the diff review. **Cycle 2, so this was a full-diff refute pass:** `origin/develop...HEAD`, 24 files, 2388 patch lines. The reviewer was told about cycle 1's two fixes and asked to refute them first. Dispatched 12:50Z, returned 12:53Z (`duration_ms` 142023). All five anchors were clean (`finding-anchors.js`, rev `6230df1b18da`). CR-1's line was given no text (`unchecked-text`); QA read line 56 directly.

Diff review: code review (the change set holds `.sh` and `.mjs` files).

Re-review scope: unscoped — cycle 2 full-diff refute pass.

CI on 6230df1b18da: pending

Step 4b: `qa-execute-snippets.mjs`, with `--diff-base` set to the merge base:

- `skills/finalise/SKILL.md`: 2 changed blocks, both `mutating`, so 0 executed. The engine reported `changed-blocks-not-executed` and `zero-blocks-executed`, as in cycle 1. Both changed blocks, Step 3a's diff lines and the Step 3e cleanup, are run in bash and zsh by committed tests in `finalise-diff.test.mjs`.
- The two changed prompts hold no bash block.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| :-- | :-- | :-- | :-- |
| Phase 1: The diff reader | CONCERNS | Verified | CR-202: the patch depends on host git config |
| Phase 2: `/finalise` uses it | CONCERNS | Verified | Step 3e fixed; CR-201: the prompts read a line no agent receives |
| Phase 3: The gap body | PASS | Verified | Unchanged since cycle 1 |
| Phase 4: Records and bundle | PASS | Verified | CHANGELOG states the forge rule; `bundle:check` 0 problems |

**Overall Phase Completion**: 4/4 implemented; 2 with findings

---

## Success Criteria Verification

| # | Criterion | Status | Evidence |
| :-- | :-- | :-- | :-- |
| 1 | Every § 8 row holds in a test that drives the script | PASS | `finalise-diff.test.mjs`, 33 of 33 at this head (one case per row, ×2 shells, plus the cycle-1 cases) |
| 2 | No block in `skills/finalise/SKILL.md` runs `git diff HEAD~1 HEAD` | PASS | prompt-contract "task 321: Step 3a reads the change through finalise-diff.sh" |
| 3 | The Step 3a block writes a `**PR diff:**` line for each source | PASS | the executed Step 3a case. The line is printed and recorded, but no agent is given it (CR-201) |
| 4 | The AC prompt fails a set criterion on an empty names list | PASS | prompt-contract "the AC quantifier rule…" |
| 5 | Docs and fix-evidence: FAIL "the change could not be read"; check 5 reads `.names` | PASS | prompt-contract "each diff-reading prompt…", "fix-evidence check 5…" |
| 6 | Performance: not applicable | PASS | no bound claimed |
| 7 | Reverting each rule alone turns a named test red (recorded here) | PASS | § Mutation proofs |
| 8 | `npm run test:remote` passes | PASS | `ci:fast` on the LAN server at the fix tree: 9050 tests, 9047 pass, 0 fail, 3 skipped (GATE_RC=0) |
| 9 | `bundle:check` passes, and shellcheck on the new script | PASS | 129 skills, 0 problems; `shellcheck --severity=warning` clean |
| 10 | `npm run validate -- skills/finalise/` passes | PASS | `✓ finalise`, `✓ review-story`, `✓ review-task` |
| 11 | `CHANGELOG.md` `[Unreleased]` names the change | PASS | `changelog-cites.sh task.321` → `cites (task 321)` |

Criteria drift: `clean` (base `review-commit`). Boundary signals: `[]`.

### Mutation proofs (criterion 7)

At head `6230df1b18da`, run after the reviewer had returned. Each file was snapshotted with `cp`, edited with the file tool, restored, and checked with `cmp`. Baseline was 33 of 33 before and after.

- mutation-proven: the Step 3e `DIFF_FILE=` bind removed → `finalise-diff.test.mjs` "Step 3e binds the same DIFF_FILE path Step 3a writes" and "[bash|zsh] Step 3e, run in its own shell, removes what Step 3a wrote and nothing else", all 3 red → covered
- mutation-proven (in the qa-fix cycle, at the same tree): Step 3a back to `pr-diff-$(date +%s).diff` → the same 3 tests red → covered
- Carried from QA report 1, with the code lines unchanged since (cycle 1 edited only the comments in `finalise-diff.sh`, and `dod-gap-count.sh` not at all):
  - mutation-proven: exclusion lookup disabled → "a bundled copy is excluded from the patch and kept in the names…" and "every changed file is a bundled copy: unresolved…" → covered
  - mutation-proven: the empty-patch rule disabled → "every changed file is a bundled copy: unresolved, and the names list is kept" → covered
  - mutation-proven: the `dod-gap-count.sh` marker rule disabled → "--body stops at every start marker change-log.js defines" and "--body keeps a fenced marker inside the section" → covered

---

## Breaking Changes Validation

None declared. The patch path moved from `.claude/state/pr-diff-<epoch>.diff` to `.claude/state/finalise-pr.diff`. Both are internal to one `/finalise` run, and no other reader names either path (`git grep` over `skills/finalise`, `shared/resources` and `evals`).

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: the prompts read a `**PR diff:**` line no agent receives (T321-CR-201)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: Cycle 1's CR-102 fix changed `finalise-dod-ac-prompt.md:56` and `finalise-dod-fix-evidence-prompt.md:51`. Both now decide whether `<DIFF_FILE>` holds the bundled copies "when Step 3a's `**PR diff:**` line reads `source=merge-base`". The Step 3b dispatch table gives the AC agent (`SKILL.md:708`), the docs agent (`:711`) and the bug-mode fix-evidence agent (`:721`) no `DIFF_LINE` substitution. The running summary's Step 2 block is written at Step 3d, after the agents return, and its Append 1 template has no `**PR diff:**` slot.
- **Impact**: an agent cannot follow the instruction. It will either guess or read every patch as one kind. On a merged PR (`source=forge`) the copies' hunks are then judged as if they were absent, or the reverse.
- **Recommendation**: pass `<DIFF_LINE>` in the three dispatch rows, have the prompts read that placeholder, and put `**PR diff:** {DIFF_LINE}` in the Append 1 template. That template slot also answers CR-2.
- **Origin**: code-review CR-1 (medium/high), confirmed by QA reading the dispatch table and the template. It gates under `code_review_blocking=true`. Provenance: new in cycle 1, since the base prompts named no such line.

### LOW Severity Issues (1)

**T321-CR-202: the merge-base patch takes the host's git config.**
- Reproduction (`cr4-repro.mjs`, a fixture repo with one changed file, run with `GIT_CONFIG_GLOBAL` set to a file holding `color.ui = always` and `diff.noprefix = true`): `source=merge-base … files=1`, ESC sequences in the patch, and the headers lack the `a/`/`b/` prefixes.
- Control: the same run with `GIT_CONFIG_GLOBAL=/dev/null` gives a clean patch with `diff --git a/a.txt b/a.txt`.
- Every test pins `/dev/null`, so the suite cannot see this.
- Provenance: new. The base's primary path was `gh pr diff`.
- Origin: code-review CR-4 (low/low). The confidence is recorded unchanged; the finding was reproduced by QA.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No bound is claimed. The base fetch has no timeout (CR-5, advisory).

### Reliability — CONCERNS
- CR-201: the agents cannot tell which kind of patch they hold.
- CR-202: the patch depends on host config.
- The Step 3e cleanup now fails on an empty path (`${DIFF_FILE:?}`) instead of matching `./.names`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Unchanged from gate 1:
  - `dod-gap-count.sh` is `boundary: internal`. The `markdown-structure` sink fits its input, but the shell entry form refuses it (`entry-not-probeable`).
  - `finalise-diff.sh` is `boundary: false`. It is a reader whose `unresolved` answer is recorded and blocks nothing.
- Cycle 1 changed only comments in the script, plus the Step 3a and Step 3e prose.

### Maintainability — PASS
The Step 3e cleanup is held by execution in two shells. The source-text check it replaced has been removed.

---

## Code Review

**Correctness bugs (5):**
- [medium/high] `shared/resources/finalise-dod-ac-prompt.md:56` ⚠️ unverified anchor (unchecked-text; QA read the line) — the prompts read a `**PR diff:**` line no agent receives → pass `<DIFF_LINE>`. **Promoted: T321-CR-201.**
- [medium/medium] `skills/finalise/SKILL.md:548` — the `**PR diff:**` line is to go under a `**PR:**` line, but the Append 1 template has no slot for it. On a re-run, the idempotent paragraph reuses the earlier Step 2 block, so the DoD can keep an old source line → put the line in the template and replace it on a re-run. QA confirmed that the template lacks the slot. The re-run staleness is agent behaviour and cannot be executed, so the finding stays advisory. T321-CR-201's remedy covers the template half.
- [low/medium] `shared/resources/finalise-diff.sh:135` — when every changed file is a bundled copy, the names list is kept and the patch is empty, but the prompts read "could not be read" from an empty names list only → write the copies' patch, or key on the `unresolved:` line too. Advisory, recorded under `recommendations.future`.
- [low/low] `shared/resources/finalise-diff.sh:132` — porcelain `git diff` follows the user's config. **Reproduced by QA (control clean): T321-CR-202.**
- [low/low] `shared/resources/finalise-diff.sh:109` — the base fetch has no timeout and no `GIT_TERMINAL_PROMPT=0`. Advisory, recorded under `recommendations.future`.

**Cleanups (0).**

Boundary decision: unchanged from gate 1 (see Security). `probes_executed: 0`, `escaped: 0`.

---

## Regression Testing

| Area | Result |
| :-- | :-- |
| Whole suite (`ci:fast`, LAN server, the fix tree) | PASS — 9050 tests, 0 failed |
| The three task suites at this head | PASS — 128 of 128 |
| Other readers of `.claude/state/pr-diff-*` | none (`git grep`) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-diff.sh`, the three DoD prompts, `skills/finalise/SKILL.md` Steps 3a, 3b, 3d and 3e, and both test files.

### Test Commands Executed
```bash
command node --test shared/resources/tests/finalise-diff.test.mjs shared/resources/tests/finalise-gaps-path.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
command node <scratchpad>/cr4-repro.mjs
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
bash .agents/skills/qa-task/references/changelog-cites.sh task.321
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 969
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed file> --diff-base <merge-base> --json
```

### Coverage Report
Not measured. There is no coverage tool for shell or Markdown here.

---

## Recommendations

### Immediate Actions (Blocking)
1. T321-CR-201: pass `<DIFF_LINE>` to the agents, and put the line in the Append 1 template.

### Short-term Actions (Non-Blocking)
1. T321-CR-202: pin the patch's output flags, and add a hostile-config test.
2. CR-3 and CR-5, as recorded in the gate's `recommendations.future`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium defect, introduced by a cycle-1 fix, in prose the agents follow. One low reproduced dependence on host config.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: T321-CR-201 fixed

---

**QA Report**: co-located at `task.321.qa.2.finalise-diff-and-gap-body.md`
**Gate File**: co-located at `task.321.gate.2.finalise-diff-and-gap-body.yml`
**Next Steps**: `/qa-fix` for T321-CR-201 and T321-CR-202, then QA cycle 3.
