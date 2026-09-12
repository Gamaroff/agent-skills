# QA Report: Task 114 - mutation-proving.md documents the false green and the false red, and none of the other seven things a mutation run can tell you

**Task**: [Link to task document](./task.114.mutation-proving-outcomes.md)
**Gate File**: [task.114.gate.1.mutation-proving-outcomes.yml](./task.114.gate.1.mutation-proving-outcomes.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered and green: the canonical document is rewritten around a 13-row
outcomes table with instrument rules and a seventh shape, the three consumers no longer state a
count, Step 3c records an outcome token per proof, six bundled copies match the source byte-for-byte,
and the new parity test goes red under both of QA's own mutations. Two MEDIUM defects survive the
change, both in the instrument rather than the content: the parity guard can be walked past by an
emphasised or hard-wrapped count word (CR-1), and the document's own "assert applied" snippet prints
`MUTATION APPLIED` when its snapshot file is missing (QA-1) — found by executing the block, which is
what the document says to do.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing (`npm run ci:fast` — 3232 pass / 0 fail / 1 skipped; prettier clean)
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#400, OPEN, head `400ec041`)

### Testing Approach

- [x] Automated Testing (unit — full `npm test` via `ci:fast`)
- [x] Regression Testing (whole suite; bundled-copy parity guard)
- [x] Security Review (reasoned)
- [x] Code Review (Step 3b, read-only Explore subagent over the scoped diff)
- [x] Documented-command execution (Step 4b)
- [x] Mutation-proof spot check (Step 3c)

### Review Methodology

Direct tools plus one read-only Explore subagent for Step 3b (first review; standard mode; 4 phases,
low risk, documentation category — the default row of the Adaptive Review Strategy). First review —
no re-review scope line.

**Step 4b**: the change set modifies one `shared/resources/*.md` and three `SKILL.md` files that
contain fenced `bash` blocks, so the rule fires. Engine: `qa-execute-snippets.mjs --copy .`, both
shells available.

| File | Blocks | runnable / placeholder / mutating | Executed | Disagreements |
| :-- | --: | :-- | :-- | :-- |
| `shared/resources/mutation-proving.md` | 3 | 1 / 0 / 2 | line 34 — bash 0, zsh 0, identical output | none |
| `skills/develop/SKILL.md` | 5 | 1 / 0 / 4 | line 140 — bash 0, zsh 0 | none |
| `skills/qa-task/SKILL.md` | 16 | 3 / 1 / 12 (with `--bind TASK_FILE TASK_DIR TRACKER GITHUB_ISSUE_QA`) | lines 152, 214, 1212 — all 0/0 | none |
| `skills/qa-story/SKILL.md` | 14 | 5 / 0 / 9 (with `--bind STORY_FILE STORY_DIR TRACKER GITHUB_ISSUE_QA PR_*`) | lines 180, 195, 228, 262, 1805 — all 0/0 | none |

Skipped blocks (all `mutating`, by design — `git push`, `gh`, `awk`, `node`, `source`, write
redirections, or fail-closed unrecognised commands): mutation-proving 272, 310; develop 620, 834,
1014, 1123; qa-task 115, 159, 173, 229, 294 (template slot), 372, 453, 514, 547, 986, 1086, 1105,
1223; qa-story 155, 236, 467, 877, 958, 992, 1683, 1702, 1817. The unbound first run of qa-task and
qa-story emitted `zero-blocks-executed`; re-run with bindings cleared it. **The one runnable block in
`mutation-proving.md` executed cleanly and, in doing so, exposed QA-1** — its stdout was
`MUTATION APPLIED` with stderr `No such file or directory`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: the outcomes table | PASS | Verified | 13 rows, each with discriminating question, action and token; rows 5/6 and 2 called out; cross-refs (rows 3/4/10, 9/13, 11/12) checked |
| Phase 2: the instrument rules | CONCERNS | Verified | 6 rules + blind-iteration rule present; the snippet implementing rule 3 violates rule 5 (QA-1) |
| Phase 3: the corpus rules | PASS | Verified | Seventh shape; absorbed → search; committed vs dev-only; heading/entry count self-consistent |
| Phase 4: consumers | CONCERNS | Verified | Pointers drop the count; Step 3c records token per proof; parity test present and red under mutation — but evadable by emphasis/wrap (CR-1) |

**Overall Phase Completion**: 4/4 phases delivered, 2 with MEDIUM findings

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| 1. Doc names every §2 outcome with a rule and discriminating question | 12 observations mapped | #41→row 2; #47→row 3; #37→row 4; #32→rows 5/6; #19→row 7 + shape 7; #29→row 8; #45→row 11; #55→row 13 + rule 1; #26→rule 5; #16→rule 6; #42→check rule; #18→parity test | PASS | |
| 2. No consumer states a count; a test asserts it | 0 counts; test red on reinsertion | 0 counts in sources; test 1 red on reinsertion (QA-proved) | CONCERNS | Evadable spellings — CR-1 |
| 3. Step 3c distinguishes committed vs development-time | separate tokens | `covered` vs `dev-only`, stated in both qa-task and qa-story | PASS | |
| 4. Observations close naming this PR | after merge | operator action; PR body lists the twelve ids | N/A | out of QA's hands |

**Code Quality**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Test suite | 0 failures | 3232 pass / 0 fail | PASS |
| Formatting | prettier clean | clean | PASS |
| Bundle freshness | 0 problems | 126 skills, 0 problems | PASS |

---

## Breaking Changes Validation

None declared; none found. Step 3c's record gains a column — additive.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: The count guard misses an emphasised or line-wrapped count word**
- **Severity**: MEDIUM
- **Category**: Quality (test vacuity by spelling)
- **Bug Report**: [task.114.bug.1.count-guard-misses-emphasis-and-wraps.md](./task.114.bug.1.count-guard-misses-emphasis-and-wraps.md)
- **Observation**: `the **four** shapes` and `four` + newline + `shapes` both pass the parity test (verified by the reviewer).
- **Impact**: The house prose style walks past the guard that exists because three pointers drifted.
- **Recommendation**: Join the window, strip emphasis, match; add both spellings to the mutation set.
- **Priority**: P2

**Issue: The document's own applied-check prints MUTATION APPLIED when the snapshot is missing**
- **Severity**: MEDIUM
- **Category**: Quality (instrument reports success when broken)
- **Bug Report**: [task.114.bug.2.applied-check-lies-on-missing-snapshot.md](./task.114.bug.2.applied-check-lies-on-missing-snapshot.md)
- **Observation**: `diff <missing> <file> || echo "MUTATION APPLIED"` → prints it (diff exit 2).
- **Impact**: Rule 3's instrument violates rule 5, in the document that states both.
- **Recommendation**: Discriminate `$?` (1 applied / 0 not / other = no snapshot, halt); same in the Validate-the-probe block.
- **Priority**: P2

### LOW Severity Issues (2)

- CR-2 `evals/shared/tests/mutation-proving-pointers-parity.test.mjs:146` — overlapping pointer windows report the same offending line once per pointer. → dedupe violations.
- CR-3 `…parity.test.mjs:200` — `text.indexOf(heading[0])` re-searches for a position already in `heading.index`, and the section slice depends on `\s*$` capturing the newline. → use `heading.index`, drop `\s*`.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 2

---

## NFR Assessment

### Performance — PASS
New test ~165 ms; ci:fast unchanged.

### Reliability — PASS
Non-vacuity floors on both scans; bundle idempotent; rollback is `git revert` + `npm run bundle`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- Documentation plus a hermetic test; no auth, crypto, network or secret surface. The 4b engine executed the runnable blocks under both shells in a temp copy.

### Maintainability — PASS
One authored definition, six generated copies guarded byte-for-byte; the outcome vocabulary lives once in the table and is quoted in Step 3c.

---

## Code Review

Step 3b, read-only Explore subagent over `origin/develop...HEAD` excluding bundled copies and task
artifacts (758-line patch). `code_review_blocking=true` (pipeline override; no per-doc opt-out), so
CR-1 (bug, medium, high confidence) is promoted to the gate.

**Correctness bugs (1):**
- [medium/high] `evals/shared/tests/mutation-proving-pointers-parity.test.mjs:123` — COUNTED_SHAPES is per-line with a bare `\s+`, so `**four** shapes` and a hard-wrapped `four\nshapes` both pass. → Match on joined, emphasis-stripped window text. **Promoted to gate as CR-1.**

**Cleanups (2):**
- `…parity.test.mjs:146` — overlapping windows list a violation once per pointer. → dedupe.
- `…parity.test.mjs:200` — use `heading.index`; drop the `\s*$` newline capture. → simplify.

**Mutation-proof spot check (Step 3c)** — on the committed test, per the procedure (snapshot `cp`,
predicted test named first, applied count 0→1 asserted, restored from snapshot, baseline green
between; 2 pass / 0 fail before, between and after):

```markdown
mutation-proven: reinstate "the four shapes" in skills/develop/SKILL.md → test 1 "no source pointer … states a count" (named skills/develop/SKILL.md:659) → covered
mutation-proven: add a bold **8.** entry under the seven-shapes heading → test 2 "counted heading agrees with the entries" ("heading says 7, section lists 8") → covered
```

Two of two proved; both `covered`. The four development-time mutations recorded in the PR body were
not re-run and are `dev-only` evidence — the two above are QA's own.

---

## Regression Testing

- Full `npm test` (3233 tests) — PASS
- `finalise-dod-prompt-contract.test.mjs` BUNDLED_REFS (six bundled copies) — PASS
- `tests/relationship-assertion-lint.test.js` — PASS (unchanged; the doc no longer claims it reads the doc)
- `npm run bundle -- --check` — 0 problems

---

## Test Artifacts

### Files Reviewed
`shared/resources/mutation-proving.md`, `skills/{develop,qa-story,qa-task}/SKILL.md`,
`evals/shared/tests/mutation-proving-pointers-parity.test.mjs`, `CHANGELOG.md`, six bundled copies.

### Test Commands Executed
```bash
npm run ci:fast                                    # 3232 pass / 0 fail
command node --test evals/shared/tests/mutation-proving-pointers-parity.test.mjs   # ×5 (baseline, 2 mutations, restores)
npm run bundle -- --check
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file <each changed file> --copy . [--bind …] --json
```

### Coverage Report
Not applicable (Markdown + a test file; the repo does not instrument coverage).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 — robust count matching (join window, strip emphasis); extend the mutation set.
2. QA-1 — exit-code-discriminating applied-check in both places it appears.

### Short-term Actions (Non-Blocking)
1. CR-2, CR-3 test-file cleanups.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Deliverable complete and green; two MEDIUM instrument defects, each bounded to one file with a stated fix.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and QA-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.114.qa.1.mutation-proving-outcomes.md`
**Gate File**: co-located at `task.114.gate.1.mutation-proving-outcomes.yml`
**Next Steps**: `/qa-fix` on the gate; re-review cycle 2 (full-diff refute pass).
