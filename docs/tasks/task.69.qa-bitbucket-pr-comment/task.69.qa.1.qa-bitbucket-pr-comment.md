# QA Report: Task 69 — Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path

**Task**: [Link to task document](./task.69.qa-bitbucket-pr-comment.md)
**Gate File**: [task.69.gate.1.qa-bitbucket-pr-comment.yml](./task.69.gate.1.qa-bitbucket-pr-comment.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-01
**Gate Status**: FAIL

---

## Executive Summary

All four implementation phases are present and the Bitbucket arm itself is correct in both skills — right endpoint, right payload shape, guarded credential resolution, and a genuine cross-file drift guard behind it. The task's stated goal is met.

It fails on a side effect of *how* the body moved to a file. `qa-story`'s comment body contains three real shell variables where `qa-task`'s contains only `{SLOT}` placeholders; a single-quoted heredoc is correct for the latter and wrong for the former. The result is a silent content regression on GitHub — the one platform the task explicitly promised to leave unchanged.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All four implementation phases marked complete
- [x] Tests passing (2139 tests, 0 failures)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#295, OPEN)

### Testing Approach

- [x] Automated testing (contract suites, full `npm run ci:fast`)
- [x] Regression testing (base-vs-head comparison)
- [x] Code review (Step 3b)
- [x] Documented-command execution analysis (Step 4b)
- [x] Independent mutation proving (Step 3c)

### Review Methodology

Direct tools. Adaptive Review Strategy selects this for a 4-phase, `risk_level: low` task; the change set is two prose files plus two test files, well inside what direct reading covers. Phase 0: no prior gate — first review, `NEXT_QA_NUM=1`.

Step 3b ran as a direct adversarial read of the branch diff rather than via a dispatched subagent — the diff is ~966 lines across 9 files, most of it documentation, and it had already been read in full during this review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
|---|---|---|---|
| Phase 1: qa-task | PASS | Verified | `$VCS` branch, both arms, body file, preamble, asymmetry documented |
| Phase 2: qa-story | **CONCERNS** | Partial | Structurally identical to Phase 1 and correct, but the body's placeholder style was not reconciled — see TASK69-001 |
| Phase 3: Platform preamble | PASS | Verified | Added to both (was absent from both); `bitbucket-auth.sh` and `resolve-platform.sh` both sourced guarded; `qa-story`'s broken `$(dirname "$0")` form correctly normalised |
| Phase 4: Tests | **CONCERNS** | Partial | Two suites, 23 tests, both globs registered; structural coverage is good but body semantics are uncovered — see TASK69-002 |

**Overall Phase Completion**: 4/4 implemented, 2/4 with concerns.

Independently verified, not taken from the implementation report:

- `$VCS` branch present exactly once per skill; comments endpoint referenced twice per skill (prose + code).
- `bitbucket-auth.sh` sourced in both; `BB_WORKSPACE` derived in both.
- Both test globs present in `package.json`.

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status |
|---|---|---|---|
| On `VCS=bitbucket`, both QA skills post the gate decision to the Bitbucket PR | Yes | Arm present and correct in both | PASS (unexecutable here — see Limitations) |
| On `VCS=github`, behaviour unchanged apart from `--body-file` | Unchanged | **Changed** — `qa-story` emits literal `$PR_NUMBER` / `$PR_TITLE` / `$PR_STATE` | **FAIL** |
| `/review-code`'s "mirror `/qa-story` step 6" pointer becomes true | True | True — step 6 now has a Bitbucket arm to mirror | PASS |

### Code Quality

| Criterion | Target | Actual | Status |
|---|---|---|---|
| Both skills have a `tests/` directory registered in `package.json` | Yes | Yes | PASS |
| Every fix mutation-proved | Yes | 3 structural mutations proved; body semantics unproved | **CONCERNS** |
| Wording identical between the two skills | Identical | Near-identical; bodies diverge in placeholder style | **CONCERNS** |

---

## Breaking Changes Validation

### Breaking Change: "None on GitHub — same endpoint, same body, delivered via `--body-file`"

Documented: Yes · Migration Path Provided: N/A · Migration Tested: Yes · Consumer Code Updated: N/A

**Validation: FAIL.** The claim holds for `qa-task` and not for `qa-story`. Same endpoint and same delivery, but not the same body — see TASK69-001. This is the specific claim the change is measured against, which is why the finding is HIGH rather than cosmetic.

**Overall Breaking Changes Assessment**: FAIL

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: qa-story's PR-comment body variables stop expanding**

- **Severity**: HIGH · **Category**: Functional (regression)
- **Bug Report**: [task.69.bug.1.qa-story-body-vars-stop-expanding.md](./task.69.bug.1.qa-story-body-vars-stop-expanding.md)
- **Observation**: `skills/qa-story/SKILL.md` writes its body with `cat > "$BODY_FILE" <<'EOF'` — a **single-quoted** heredoc, in which nothing expands. Its body contains `**PR**: #$PR_NUMBER - $PR_TITLE` and `**PR State**: $PR_STATE`. Previously the body was a double-quoted `--body "…"` string, where all three expanded. `qa-task` is unaffected: its body uses `#{PR_NUMBER} - {PR_TITLE}`, template slots the agent substitutes, for which the quoted heredoc is right.
- **Impact**: Every `qa-story` QA cycle on GitHub posts a comment reading `**PR**: #$PR_NUMBER - $PR_TITLE`. Delivery succeeds, so the step's own BLOCKING exit-code check passes and nothing surfaces the fault. It is silent by construction, and it contradicts the task's own success criterion and Breaking Changes claim.
- **Recommendation**: Convert the three to `{SLOT}` placeholders. Do **not** unquote the heredoc — the body carries a backtick pair on the Code Review Findings line that would become command substitution, trading a display bug for an execution one.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: no test can see the comment body's expansion semantics**

- **Severity**: MEDIUM · **Category**: Quality (test coverage)
- **Bug Report**: [task.69.bug.2.no-coverage-for-body-expansion.md](./task.69.bug.2.no-coverage-for-body-expansion.md)
- **Observation**: Independently mutation-tested during this review — with the TASK69-001 defect present, `qa-story`'s suite reports 12 passed / 0 failed; with it fixed, 12 passed / 0 failed. Identical. The suites assert structure only.
- **Impact**: This is what allowed TASK69-001 to reach a PR carrying three recorded mutation proofs. All three mutations were structural, so they exercised the structural assertions and nothing else — coverage looked complete because every mutation anyone thought to run was of the kind already covered.
- **Recommendation**: Assert in **both** suites that the quoted-heredoc body contains no unescaped `$VAR`, and mutation-prove it.
- **Priority**: P2

### LOW Severity Issues (1)

- **`COMMENT_RC` is unset if `$VCS` is neither arm.** Both skills evaluate `[ "$COMMENT_RC" -ne 0 ]` after an `if/elif` with no `else`. Unreachable in practice — `resolve-platform.sh` is sourced guarded and admits only `github` or `bitbucket` — and the quoted form degrades to a shell diagnostic rather than a false success. Noted, not worth a fix.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Prose-and-tests change; no runtime path touched. The two new suites add 23 tests and ~190 ms to a 2139-test run.

### Reliability — CONCERNS
The GitHub arm of `qa-story` emits placeholder text where PR metadata belongs. The comment still posts, so the BLOCKING check passes — the fault cannot be detected by the mechanism meant to guard the step. Error handling is otherwise sound: `curl -sf` fails non-zero on HTTP errors, and the single-shot Bitbucket path logs and continues as documented.

### Security — PASS
No secrets in the diff. Credential resolution is delegated to the already-shipped `bitbucket-auth.sh`, sourced guarded in both skills. The move off an inline `--body` **reduces** injection surface: backticks and `$(…)` in the body are no longer evaluated by the shell — which is precisely why the fix for TASK69-001 must not unquote the heredoc.

### Maintainability — CONCERNS
Strong overall. The two skills are near-identical, the retry asymmetry and the deliberate non-idempotence are both stated rather than left implicit, and the cross-file drift guard has a companion test preventing it from silently skipping when a sibling is absent — the failure mode found in task 68 and correctly pre-empted here. The deduction is that the two comment bodies still diverge in placeholder style: exactly the divergence Phase 2 existed to remove, and exactly the cause of TASK69-001.

---

## Code Review

Advisory — the task does not set `code_review_blocking`, and no run-level override was passed. The two findings above are recorded as gate `top_issues` on their own merits (a functional regression and a coverage gap), not through the code-review promotion path.

**Correctness bugs (1):**
- [high/high] `skills/qa-story/SKILL.md` (body heredoc) — real shell variables inside a single-quoted heredoc will not expand → convert to `{SLOT}` placeholders

**Cleanups (2):**
- `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` — `COMMENT_RC` unset on the unreachable third branch; harmless
- `jq -n --arg raw "$(cat "$BODY_FILE")"` strips trailing newlines via command substitution; cosmetic only, and it matches the shipped `qa-fix` precedent the task deliberately copied

**Positives worth recording** (a review that only lists faults misrepresents the change): the `$(dirname "$0")` normalisation in `qa-story` is a genuine latent-bug fix that was not in the task's original scope and was correctly identified during review; and the `shared/resources/tracker-access.test.sh` floor change is the right repair — lowering to 1 preserves the only thing the assertion can honestly detect, and the instruction to delete the arm rather than drop to 0 prevents the next person from hollowing it out.

---

## Step 4b — Documented-command execution

**The rule fires**: the diff modifies two `SKILL.md` files containing fenced `bash` blocks.

| File | Blocks | runnable | placeholder | mutating | Result |
|---|---|---|---|---|---|
| `skills/qa-task/SKILL.md` | 15 | 0 | 4 | 11 | `zero-blocks-executed` |
| `skills/qa-story/SKILL.md` | 14 | 0 | 5 | 9 | `zero-blocks-executed` |

**Not suppressed, and not caused by this change.** The same engine run against `origin/develop` reports `zero-blocks-executed` for both files already (14 and 13 blocks). This change adds exactly one block to each, and both are correctly classified `mutating` — they post PR comments, which the safety boundary deny-lists by design.

The consequence is worth stating plainly rather than rediscovering next cycle: **Step 4b can never provide execution coverage for these two steps**, on this change or any future one. The dual-shell guard that caught task 66's zsh glob bug is structurally unavailable here. That is a correct safety decision, not a defect — but it means these two steps rest entirely on contract tests, which is why TASK69-002 matters more than a coverage gap normally would.

Skipped blocks are enumerated with line numbers and reasons in the engine output; no silent skips.

---

## Regression Testing

| Area | Result |
|---|---|
| Full `npm run ci:fast` (format:check + npm test) | PASS — 2139 tests, 0 failures, prettier clean |
| Both new suites | PASS — 23/23 |
| `shared/resources/tracker-access.test.sh` (touched by this branch) | PASS — 401/401, including the adjusted §11 floor |
| `qa-fix` / `finalise` (recipe sources, untouched) | No change; their Bitbucket call sites are byte-identical to before |
| Dot-source call-site count repo-wide | 2 → 1, intentional; floor adjusted with rationale |

No regressions outside the one documented in TASK69-001.

---

## Test Artifacts

### Files Reviewed
`skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-task/tests/qa-task.test.js`, `skills/qa-story/tests/qa-story.test.js`, `package.json`, `shared/resources/tracker-access.test.sh`

### Test Commands Executed
```bash
node --test 'skills/qa-task/tests/*.test.js' 'skills/qa-story/tests/*.test.js'
npm run ci:fast
bash shared/resources/tracker-access.test.sh
node references/qa-execute-snippets.mjs --file skills/qa-task/SKILL.md --json
node references/qa-execute-snippets.mjs --file skills/qa-story/SKILL.md --json
```

### Step 3c — Mutation-Proof Spot Check

The implementation report records three mutations. All three are structural, and all three are genuine — spot-checked by re-running the drift-guard mutation independently (delete `qa-story`'s Bitbucket arm → 4 tests red).

One **independent** mutation was then run, of a kind the developer did not try:

| Mutation | Suite result | Verdict |
|---|---|---|
| Fix TASK69-001 (convert `$VAR` → `{SLOT}`) | 12 passed, 0 failed — **unchanged** | **not mutation-proven**; no test covers this behaviour |

Per fixed defect: `mutation-proven: no` for the body semantics. The structural invariants are proven; the body's is not.

---

## Recommendations

### Immediate Actions (Blocking)
1. **TASK69-001** — convert `qa-story`'s three body variables to `{SLOT}` placeholders. P1.
2. **TASK69-002** — add a no-`$VAR`-in-body assertion to both suites and mutation-prove it. P2.

### Short-term Actions (Non-Blocking)
1. Record the Step 4b limitation for these two steps so it is not re-derived each cycle.
2. `bitbucket_call_with_retry` remains the standing repo-wide gap — correctly deferred by this task.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH functional regression (TASK69-001) — deterministic gate rule 1. The task's core objective is achieved and the Bitbucket work is sound; the failure is a narrowly-scoped, one-line-per-variable defect in `qa-story`'s body, plus the coverage gap that hid it.
**Quality Score**: 60/100

**Deployment Recommendation**: BLOCKED
**Conditions**: TASK69-001 fixed and verified.

---

## Known Limitations

This repo is GitHub-hosted, so **the Bitbucket arm ships unexecuted** in both skills, and Step 4b cannot execute it either. Verification of the Bitbucket path is therefore by inspection against two already-shipped call sites (`qa-fix`, `finalise`) only. The task states this limitation itself and it is accepted — but it is the reason the GitHub-side regression matters as much as it does: GitHub is the only arm this repo can actually observe.

---

**Next Steps**: `/qa-fix` addresses TASK69-001 and TASK69-002, then re-review.
