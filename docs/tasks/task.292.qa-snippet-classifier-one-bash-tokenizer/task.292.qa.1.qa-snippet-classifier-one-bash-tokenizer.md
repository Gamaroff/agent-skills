# QA Report: Task 292 - One bash tokenizer for the QA snippet classifier

**Task**: [Link to task document](./task.292.qa-snippet-classifier-one-bash-tokenizer.md)
**Gate File**: [task.292.gate.1.qa-snippet-classifier-one-bash-tokenizer.yml](./task.292.gate.1.qa-snippet-classifier-one-bash-tokenizer.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-10
**Testing Completed**: 2026-11-10
**Gate Status**: FAIL

---

## Executive Summary

The tokenizer replaces the five lexical copies, closes T290-QA-3 and passes every instrument: fast gate green, 350 suite tests, 0 writes in a fresh differential, 0 newly runnable blocks in the docs scan, CI green on the head. The diff review found one shape the tokenizer reads wrongly: a left shift in `$[ ... ]` is taken for a heredoc, which hides a writer from the classifier. QA reproduced it by execution; it is HIGH because a write classifies runnable.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#869)

### Testing Approach

- [x] Automated Testing (fast gate, snippet suite)
- [x] Performance Testing
- [x] Regression Testing (docs scan against develop)
- [x] Security Review (shell-exec probe, differential)
- [x] Code Review

### Review Methodology

Direct tools plus one read-only Explore diff reviewer (first review, whole branch diff). Diff review: code review. Step 4b: not applicable beyond the engine itself; the change set adds no runnable prose (the one Markdown change is a description section).

Reviewer dispatched 05:11Z, returned in about 104 s (`duration_ms` 104312). CI_SUMMARY: CI on b708546f54d6: green.

---

## New Findings This Cycle

First review; findings are listed under Issues Found.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: instruments, calibration, gap rows | PASS | Verified | Scripts committed; slice and 10 gap/control rows in the suite |
| Phase 2: tokenizer | PASS | Verified | Unit rows for blanks, joins, quotes, heredocs, refusals, deep nest |
| Phase 3: migrate scans | PASS | Verified | Five old scans deleted; two regexes left (see Issues, LOW) |
| Phase 4: prove and document | PASS | Verified | Docs section 2a-i, CHANGELOG, bundles current |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Status | Evidence |
| --- | --- | --- |
| CR/FF/VT/NBSP/U+2028 before `#` classify mutating | PASS | Gap rows green; `a<CR>#...` rows in suite |
| task.290 gaps stay mutating, controls runnable | PASS | Suite 350/350 |
| No input makes classifyBlock throw | PASS | Existing "never throws" test green |
| Full differential, 200000+ blocks, 0 writes | PASS | Developer ran seed 101, 4 sets x 60000 = 240000, 0 writes. QA re-ran `node scripts/qa-snippets-differential.mjs --atoms nesting --count 20000 --seed 777`: 925 runnable, 0 writes. Neither run's atoms include `$[` (see T292-QA-1) |
| Docs scan time no worse than +10% | PASS | `node scripts/qa-snippets-docscan.mjs --time`, five runs, load 3.05/3.05/2.96/2.96/2.96: develop 508/499/491/476/479 ms, now 353/344/333/330/326 ms; median 491 to 333 ms |
| Slice under 10 s | PASS | Five runs 2.66/2.70/2.65/2.73/2.67 s, median 2.67 s |
| Every scan except sedScan reads the tokenizer; call-site test counts consumers | PASS (read) | The "every comment scan reads the one rule" test names the 3 known `"#"` sites and asserts `startsComment`/`closingParen` are gone; confirmed by reading |
| Test fails on an unlisted `\s` | PASS | Guard exists; goes red under mutation 2 below |
| Test fails if substitution scan made recursive | PASS (read) | The 20000-deep tokenize and classify rows would overflow a recursive scan; not mutation-run (see below) |
| Every change mutation-proven, red test named | PASS | See Code Review |
| Lint and prettier | PASS | Part of the fast gate |
| CHANGELOG; bundle:check | PASS | Fast gate includes bundle check; entry present and cites (task 292) |
| 0 newly runnable in docs scan | PASS | 3444 blocks, 257 to 257, 0 newly runnable, 0 newly refused (re-run) |

Criteria drift: clean (reviewed blob).

---

## Breaking Changes Validation

None documented; verdicts only move towards `mutating`. PASS.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: left shift in `$[ ]` read as a heredoc (T292-QA-1)**
- **Severity**: HIGH
- **Category**: Security
- **Bug Report**: [task.292.bug.1.arithmetic-shift-read-as-heredoc.md](./task.292.bug.1.arithmetic-shift-read-as-heredoc.md)
- **Observation**: `echo $[1<<z]`, `touch /tmp/qa292-a`, `z` classifies runnable on head. bash creates the file. Control: `$((1<<z))` form is refused; a real `cat <<z` heredoc stays runnable. Base gives the same verdict for the `$[` shape (and runnable for the `$((` form too), so this is not a regression, but the task requires unmodelled shapes to be refused.
- **Impact**: QA could execute a block that writes.
- **Recommendation**: throw on `$[`, or on `<<` inside it; add rows and differential atoms.
- **Priority**: P0

### LOW Severity Issues (2)

- The `WORD` regex in `variableArgumentToDenyListed` and the assignment regex in `assignedVariables` still carry quote-aware regexes (declared in the implementation report). No write found through them in 240000 + 20000 differential blocks. Follow-up candidate.
- The blank normalisation in `classifyInternal` is absorbed by the other two normalisation sites: removing it alone turns nothing red.

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS
Docs scan faster than develop; slice 2.67 s; 20000-deep nest linear.

### Reliability — PASS
Unmodelled shapes fail closed.

### Security — FAIL

- **Status**: FAIL
- **Evidence**: measured
- **Probes executed**: 31 (`shell-exec` sink, entry `isRunnableBlock`, record `task.292.qa.1.security.run.json`: 31 executed, 0 reproduced, 0 escaped)
- The corpus does not contain the `$[1<<z]` shape; T292-QA-1 was found by the reviewer and reproduced by hand. `boundary_signals: ["never"]`, `boundary: true`.

### Maintainability — PASS
One tokenizer instead of five copies.

---

## Code Review

**Correctness bugs (1):**
- [high/high] `shared/resources/qa-execute-snippets.mjs:1784` — `<<` in code is always a heredoc opener, wrong inside `$[ ]` → refuse `$[` / `<<` inside it. Promoted to gate as T292-QA-1 (reproduced by QA; control passed; provenance: base gives the same verdict, kept because the task scope says unmodelled shapes are refused).

**Cleanups (0):** none.

Mutation proofs (each reverted with `cmp` against a snapshot, tree clean after):
- mutation-proven: blank normalisation removed at the `classifyInternal` site only → nothing red (350 pass) → absorbed
- mutation-proven: `NOT_A_BASH_BLANK` made to match nothing (all three sites) → 5 assignment-gap rows, the `\s` allowlist guard and the differential slice → covered
- mutation-proven: `\r \f \v NBSP U+2028` added as blanks in the tokenizer → "a # starts a comment only at the start of a word" → covered (the T290-QA-3 gap rows stay green because the top-level normalisation also protects them)
- mutation-proven: substitution scan made recursive → not-run (not mutated; the 20000-deep rows are the guard by reading)

Diff-review anchor check: not run through `finding-anchors.js` (single finding, line verified by reproduction on the file).

---

## Regression Testing

Docs scan against `develop`: 0 newly runnable, 0 newly refused. `npm run validate -- skills/qa-task/`: pass. Fast gate `CI=true npm run ci:fast`: exit 0.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run ci:fast
node scripts/qa-snippets-differential.mjs --atoms nesting --count 20000 --seed 777
node scripts/qa-snippets-docscan.mjs --time
node --test shared/resources/tests/qa-execute-snippets.test.mjs
command node .agents/skills/qa-task/references/security-probe.mjs --sink shell-exec --entry 'shared/resources/qa-execute-snippets.mjs#isRunnableBlock' --repo-root "$PWD" --record task.292.qa.1.security.run.json --json
```

### Coverage Report
Not measured (no coverage tool configured for this suite).

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T292-QA-1 (refuse `$[` / `<<` inside it), with rows and differential atoms; mutation-prove.

### Short-term Actions (Non-Blocking)
1. Decide on a follow-up for the two unmigrated regexes.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one HIGH: a write classifies runnable.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED
**Conditions**: T292-QA-1 fixed and re-reviewed.

---

**QA Report**: co-located at `task.292.qa.1.qa-snippet-classifier-one-bash-tokenizer.md`
**Gate File**: co-located at `task.292.gate.1.qa-snippet-classifier-one-bash-tokenizer.yml`
**Next Steps**: `/qa-fix` cycle 1.
