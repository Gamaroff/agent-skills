# QA Report: Task 240 - Fail-closed reader for the 5c open-coverage check (cycle 2)

**Task**: [Link to task document](./task.240.open-coverage-fail-closed-reader.md)
**Gate File**: [task.240.gate.2.open-coverage-fail-closed-reader.yml](./task.240.gate.2.open-coverage-fail-closed-reader.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-28
**Testing Completed**: 2026-10-28
**Gate Status**: CONCERNS

---

## Executive Summary

Cycle 1's fix holds. The wrapped shapes from bug.1 read `0` and `1` as YAML reads them, the trap
shape still reads `unreadable`, and the corpus still reads the same as the old awk. QA re-proved
two of the fix's guards, and CI is green on the fixed head.

The refute pass found one in-scope false 0. A quoted value that opens on the line after an empty
`finding:` value hides a key-indent line, which is bug.1's trap one line lower (BUG-2). Three
further YAML disagreements read identically on the base awk, so they are routed as pre-existing.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix TASK-240-QA-2)

---

## Re-Review Context

| Previous issue | Status | Evidence |
| --- | --- | --- |
| TASK-240-QA-1 / BUG-1: wrapped value under a non-deciding key read `unreadable` | ✅ FIXED | The fixtures `w-plain`, `w-quoted` and `w-trap` read 0, 1 and `unreadable`. The parity rows and unit cases pass, and M5 and M6 were re-proven `covered`. bug.1 is closed. |

---

## New Findings This Cycle

- **[medium]** `shared/resources/open-coverage.js:162`: after an empty non-deciding value, a quoted scalar opened on the next deeper line is not tracked, so a key-indent line inside it is read as a key. That gives a false 0 where PyYAML reads 1. The fix is to apply cycle 1's quote rule after an empty value too (TASK-240-QA-2, [bug.2](./task.240.bug.2.quoted-value-after-empty-value-hides-key.md)).

Three further disagreements with YAML read identically on the base awk, and each has 0 corpus hits.
They are routed to `recommendations.future` as pre-existing (CR-2, CR-3 and CR-4, under Code Review
below).

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (15/15 boxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#776)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, parity, corpus)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

The review used direct tools, plus one read-only Explore code reviewer.

- **Reviewer pass:** the cycle 2 **refute pass** over the whole branch diff against `origin/develop`. Generated `skills/*/references/` copies and the task's own documents were excluded.
- **Reviewer timing:** dispatched at 14:50:01Z; returned in 255,340 ms (completion notice `duration_ms`).
- **YAML comparison:** each finding was reproduced against PyYAML 6.0.3 and against the old awk block (`.claude/state/t240-rv/old.sh`, taken from `83aacf7b`).

CI on a98f54701983: green

**Step 4b:** the changed blocks are as in cycle 1: 1 changed, 0 executed, 1 mutating. The one changed
block (the §5c call) is refused because `command node` is not on the executor's allow-list. CI
installs zsh (`test.yml:37`), and its green run executed that block in the parity suite under bash
and zsh.

**Re-review scope:** unscoped. This is the cycle 2 refute pass over the full branch diff.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Precondition | PASS | Verified | Unchanged since cycle 1 |
| Phase 1: The reader | CONCERNS | Partial | BUG-1 fixed; BUG-2 is a false 0 on a contrived valid shape |
| Phase 2: The call site | PASS | Verified | Unchanged; CI green |
| Phase 3: Corpus, probe and docs | PASS | Verified | Corpus 0 changes; the CHANGELOG names the YAML-invalid exception |

**Overall Phase Completion**: 3/4 phases passed outright, 1 with a concern.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| SC-1 refusals read `unreadable`, counts read right, no skip branch | Every fixture row also asserts `countOpenCoverage`. BUG-2 is a count read wrong without a skip: the line is placed, but as the wrong thing | CONCERNS |
| SC-2 parity passes under bash and zsh | 87/87 locally (bash). CI is green on `a98f5470`, and `test.yml:37` installs zsh, so the zsh arm passed in CI. Re-checked this cycle | PASS |
| SC-3 a failing reader reads `unreadable` | Parity test with the `node` stub | PASS |
| SC-4 the corpus reads the same | Re-run after cycle 1's fix: 187 reports, 0 changes | PASS (measured) |
| SC-5 one `node` call, no awk | Parity assertion | PASS |
| SC-6 `ci:fast` | Green after cycle 1's fix: 6,618 pass, 0 fail | PASS |
| SC-7 `bundle:check` | Re-run by QA: exit 0 | PASS |
| SC-8 `validate` | Re-run by QA: develop-task, develop-story and qa-fix all exit 0 | PASS |
| SC-9 guards mutation-proven | The cycle 1 fix guards M5–M8 were proven by qa-fix, and M5 and M6 were re-proven by QA | PASS |
| SC-10 CHANGELOG | Entry updated in cycle 1 | PASS |
| SC-11 probe | Cycle 1 probe recorded in the fix summary | PASS |

---

## Breaking Changes Validation

None declared. The printed contract is unchanged.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A quoted value opened after an empty value hides a key line**

- **Severity**: MEDIUM. The reviewer rated it high; it was re-rated on a measurement, below.
- **Category**: Functional / Reliability
- **Bug Report**: [task.240.bug.2.quoted-value-after-empty-value-hides-key.md](./task.240.bug.2.quoted-value-after-empty-value-hides-key.md)
- **Observation**: the reader prints `OPEN_COVERAGE=0` where PyYAML reads 1.
- **Provenance**: the base awk also reads 0. The finding is still kept in the gate, because the
  shape is in scope: it is bug.1's trap, and this branch's reader header says a quote still open at
  the key indent is refused.
- **Re-rating**: from high to medium. The shape appears in 0 of 187 tracked review reports, and no
  writer or template emits it: review-pr writes `finding: {one sentence}` on one line. Confidence
  stays high.
- **Recommendation**: apply cycle 1's quote rule after an empty value.
- **Priority**: P1

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0

---

## NFR Assessment

### Performance: PASS

One linear pass over the block, and one `node` call at 5c.

### Reliability: CONCERNS

BUG-2. BUG-1 is fixed and verified.

### Security: PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: internal. The reader is `shared/resources/open-coverage.js#countOpenCoverage`, and
  its only input is the `/review-pr` report, which this pipeline writes. No corpus sink models that
  report. The reader parses text only: it has no `eval`, no shell, and no file write.

### Maintainability: PASS

The one-line and wrapped paths now share a single quoted-text scanner.

---

## Code Review

These findings are advisory unless promoted. Reviewer: one Explore subagent running the cycle 2
refute pass over the branch diff. `finding-anchors.js --rev HEAD` returned `ok` for all six.

**Correctness bugs (4):**

- [high→medium/high] `shared/resources/open-coverage.js:162`: a quoted value opened after an empty value hides a key-indent line, giving a false 0. **Promoted** as **TASK-240-QA-2**, with the re-rating recorded above.
  - The reviewer's exact shape reads `unreadable`, because a deeper line follows `provenance:`.
  - The variant that closes the quote on a key-indent line reads 0.
- [medium/high] `shared/resources/open-coverage.js:189`: a flow key with no space after its colon (`{category:coverage}`) reads 1, where YAML reads no category.
  - Old awk: 1. Corpus: 0.
  - Routed to `recommendations.future` as **pre-existing**.
- [medium/medium] `shared/resources/open-coverage.js:348`: keys are compared case-blind, so `Provenance: pre-existing` reads 0 and `Category: coverage` reads 1, where YAML disagrees on both.
  - Old awk: the same, 0 and 1. Corpus: 0.
  - **Pre-existing**, routed to future. It needs a decision: refuse case-variant deciding keys, or document case-blind keys.
- [low/medium] `shared/resources/open-coverage.js:285`: a comment line inside a wrapped plain value, followed by more wrapped text, reads 0 where YAML raises an error.
  - Old awk: 0.
  - **Pre-existing**, routed to future.

**Cleanups (2):**

- `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1537`: the reader's stderr is discarded, so a broken reader and a refused report halt with no reason. The fix is to echo the reason. Routed to future.
- `shared/resources/tests/open-coverage.test.mjs:75`: the PyYAML parity claim is hand-picked. A differential test against a real YAML parser is recommended, and routed to future.

**Step 4b:** `changed-blocks-not-executed` at medium confidence, unchanged from cycle 1.

**Boundary record:** `boundary: internal`, with the reason under Security. `probes_executed: 0`.

**Mutation proofs** (QA, in a scratch worktree of `a98f5470`; the baseline was green):

- mutation-proven: a wrapped plain value refused again (M5) → `open-coverage check: a plain finding: value wrapped onto a deeper line → 0` and `accepts a plain finding: wrapped onto deeper lines → 1` → covered
- mutation-proven: the key-indent check on an open quote removed (M6) → `open-coverage check: a quoted value still open at the entry's key indent → unreadable` and `refuses (bad-value): REFUSED[14]` → covered

qa-fix also proved M7 and M8 against committed tests. Its fix summary records that M8 first
survived, and a case was then added.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Targeted suites (unit, parity, extractor, relationship lint) | 168/168 |
| Tracked review corpus (187 reports) | 0 changes |
| CI on `a98f5470` | green |

---

## Test Artifacts

### Files Reviewed

`shared/resources/open-coverage.js`, `shared/resources/tests/open-coverage.test.mjs`,
`evals/shared/tests/pr-review-loop-parity.test.mjs`, `shared/resources/pr-review-current.js`,
`shared/resources/develop-pipeline-step-5-6-qa-loop.md` §5c, `CHANGELOG.md`.

### Test Commands Executed

```bash
command node --test shared/resources/tests/open-coverage.test.mjs evals/shared/tests/pr-review-loop-parity.test.mjs shared/resources/tests/pr-review-current.test.mjs tests/relationship-assertion-lint.test.js   # 168/168
npm run validate -- skills/develop-task/    # 0
npm run validate -- skills/develop-story/   # 0
npm run validate -- skills/qa-fix/          # 0
npm run bundle:check                        # 0
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 776   # CI on a98f54701983: green
```

Each finding's fixture was run three ways: through `open-coverage.js --file`, through the old awk
block, and through `yaml.safe_load` (PyYAML 6.0.3, `python3 -I`).

### Coverage Report

No coverage tool is configured for `shared/resources` Node modules. Coverage is measured by reason,
and every refusal reason is reached.

---

## Recommendations

### Immediate Actions (Blocking)

1. TASK-240-QA-2 / BUG-2.

### Short-term Actions (Non-Blocking)

1. CR-6: a differential test against a YAML parser. It would catch BUG-2's class without a hand-picked row.
2. CR-3: decide whether keys are compared case-blind.
3. CR-5: echo the reader's refusal reason at 5c.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: BUG-1 is fixed and verified. One medium false 0 remains, on a valid but contrived shape.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-240-QA-2 fixed

---

**QA Report**: co-located at `task.240.qa.2.open-coverage-fail-closed-reader.md`
**Gate File**: co-located at `task.240.gate.2.open-coverage-fail-closed-reader.yml`
**Next Steps**: run `/qa-fix` cycle 2 for TASK-240-QA-2, then QA cycle 3.
