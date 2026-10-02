# QA Report: Task 166 - Give measured non-functional criteria a defined path through review and finalise

**Task**: [task.166.measured-non-functional-criteria.md](./task.166.measured-non-functional-criteria.md)
**Gate File**: [task.166.gate.1.measured-non-functional-criteria.yml](./task.166.gate.1.measured-non-functional-criteria.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-02
**Testing Completed**: 2026-10-02
**Gate Status**: CONCERNS

---

## Executive Summary

All four phases are delivered and the 9 new tests pass; the AC prompt now has three test-free kinds and one count, and review-task check 4 carries the three Important rules. The diff review found two medium defects in review-task check 4: it restates the kind count where no test reaches it (CR-1), and its bound rule flags a criterion that finalise would pass (CR-2). Three low cleanups in the tests and prompt wording ride along.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 resolved

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (13/13 plan checkboxes)
- [x] Tests passing
- [x] Breaking changes documented (none to any interface)
- [x] Code on feature branch with open PR (#550, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit — text pins)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore subagent for the Step 3b diff review (default strategy: 4 phases, two modules, Medium risk). First review — whole-branch diff (`origin/develop...HEAD`, 12 files). Reviewer duration: 129.7s (completion notice `duration_ms`).

Step 4b: `finalise-dod-ac-prompt.md` has no fenced bash — not applicable there. `skills/review-task/SKILL.md`: 17 blocks — 0 runnable, 1 placeholder (line 95, `unbound-variable: INPUT`), 16 mutating (deny-list: `gh issue`, `curl`, redirections, …); bash and zsh available. Finding `zero-blocks-executed` (medium). Re-run with `--bind INPUT=PROJ-45`: the line-95 block exits 1 in both shells, identically — by design, it halts when no local document holds the Jira key, and the temp copy holds none. **Provenance**: the same engine on `origin/develop:skills/review-task/SKILL.md` gives identical counts and the same finding, and the diff adds no fence (`git diff … | grep -c '^+.*```'` → 0) → **pre-existing**, routed to `recommendations.future`, not `top_issues`.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: AC prompt measured kind | PASS | Verified | Heading "Three … three"; measured bullet; closing sentence; Execution-rule count dropped |
| Phase 2: review-task check 4 | CONCERNS | Verified | Three rules at Important + Issues to Flag; CR-1, CR-2 |
| Phase 3: Pins | PASS | Verified | 5 + 4 tests; both in `npm test` globs |
| Phase 4: Proof and gates | PASS | Verified | 14 dev mutations red; bundle, validate, check:generated clean |

**Overall Phase Completion**: 4/4 phases delivered; 1 with findings

---

## Success Criteria Verification

**Functional:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| AC prompt names three kinds; measured PASS bar; unbounded → FAIL; pinned | Yes | Yes (`finalise-dod-ac-kinds.test.mjs` tests 1–2) | PASS |
| Closing sentence covers all three; testable bound → behaviour; pinned | Yes | Yes (test 3) | PASS |
| review-task flags unbounded non-functional criterion as Important; pinned | Yes | Yes — but over-fires on a bound with a planned test (CR-2) | CONCERNS |
| obs #204 documentation kind covered by the AC pin | Yes | Yes (test 1 `test_citation` string) | PASS |
| review-task flags behaviour-without-test and post-merge, Important; pinned | Yes | Yes (tests 7–8) | PASS |

**Performance:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Each new test file finishes in under 1s (`time node --test <file>`) | < 1s | 0.31s / 0.25s (implementation report) | PASS |

**Code Quality:**

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `ci:fast` with `.agents/skills` aside | pass | 4996 pass; 2 first-run failures explained and green alone | PASS |
| `bundle:check`, validate finalise + review-task | pass | pass | PASS |
| Phase 4 mutations red, `cmp` restore | all | 14/14 dev + 3/3 QA | PASS |
| CHANGELOG `[Unreleased]` cites (task 166) | Yes | Yes | PASS |

---

## Breaking Changes Validation

None to any interface. The one behaviour change (a bounded, measured, cited criterion now PASSes) is documented in § 5 and the CHANGELOG. **PASS**.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (2)

**Issue: TASK-166-CR-1 — review-task restates the kind count where no test reaches it**
- **Severity**: MEDIUM · **Category**: Quality
- **Observation**: `skills/review-task/SKILL.md` check 4 says "one of three test-free kinds" and names all three. The new one-count test reads only the AC prompt, and its regex needs `<count> (`NOT_APPLICABLE` )?kinds`, so "three test-free kinds" would pass it even inside that file.
- **Impact**: A fourth kind added to finalise leaves review-task describing three — the drift review 1 removed from the AC prompt's Execution rule, now in a second file.
- **Recommendation**: Drop the count word in check 4, or pin it to the AC prompt's heading count.
- **Bug report**: not filed separately — the finding is fully specified here and in the gate, and the pipeline's 5b consumes the gate.

**Issue: TASK-166-CR-2 — the bound rule flags criteria finalise would pass**
- **Severity**: MEDIUM · **Category**: Functional
- **Observation**: check 4's bound rule: "any criterion that bounds a time, size, count or rate, names a numeric bound and the command that measures it. Missing either → Important". finalise sends a bound a per-PR test could assert down the behaviour path, where a test is the evidence, not a command.
- **Impact**: "Exactly 3 kinds, pinned by test X" draws an Important finding at review that finalise would pass — the rule contradicts its own "classify each criterion the way finalise will" lead.
- **Recommendation**: Carve out a bound that names its planned per-PR test.

### LOW Severity Issues (3)

- **CR-4** `finalise-dod-ac-kinds.test.mjs` — closing test hardcodes "three"; derive it from the heading.
- **CR-5** `finalise-dod-ac-kinds.test.mjs` — measured-kind slice runs to the section end; bound it at the next kind bullet.
- **CR-6** `finalise-dod-ac-prompt.md` — the measured FAIL clause covers "no bound", which the definition excludes; route it to the behaviour path in words.

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 3

---

## NFR Assessment

### Performance — PASS
Measured in the implementation report: 0.31s and 0.25s per file against a < 1s bound.

### Reliability — PASS
Both pins fail closed on a missing heading, section or check (non-vacuity floors); rollback is a revert plus `npm run bundle`.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false` — the diff adds no accept/reject function. Candidates considered: `kindsSection` and `check4` (test helpers that slice text; no input from outside the repository, no action gated on their result). Prompt prose and read-only text pins.

### Maintainability — CONCERNS
CR-1: a second, unpinned statement of the kind count.

---

## Code Review

Diff review (Explore subagent, whole-branch diff, 12 files). Run-level `code_review_blocking=true`; no finding is `bug` + `confidence: high`, so none was promoted automatically. CR-1 and CR-2 were **verified by QA against the source** (lines 1112–1124 of review-task SKILL.md; lines 51–53 of the AC prompt) and entered in `top_issues[]` as QA findings.

**Correctness bugs (3):**
- [medium/medium] `skills/review-task/SKILL.md:1115` — check 4 restates the kind count, unpinned → drop the count or pin it (gate: TASK-166-CR-1)
- [medium/medium] `skills/review-task/SKILL.md:1121` — bound rule flags a bound pinned by a planned test → carve it out (gate: TASK-166-CR-2)
- [medium/low] `shared/resources/finalise-dod-ac-prompt.md:51` — "whether a per-PR test could assert that bound" is open to either reading → make it concrete (recommendations.future)

**Cleanups (3):**
- `shared/resources/tests/finalise-dod-ac-kinds.test.mjs:91` — hardcoded "three" (gate: TASK-166-CR-4)
- `shared/resources/tests/finalise-dod-ac-kinds.test.mjs:75` — unbounded measured slice (gate: TASK-166-CR-5)
- `shared/resources/finalise-dod-ac-prompt.md:51` — FAIL clause vs definition (gate: TASK-166-CR-6)

**Mutation spot checks (QA, bash, `cp` snapshot, `cmp` restore):**

- mutation-proven: "**committed**" dropped from the measured kind's `code_citation` → `the measured kind's PASS needs a stated bound…` red → covered
- mutation-proven: "**after merge**" dropped from the post-merge rule → `review-task check 4 carries the post-merge rule…` red → covered
- mutation-proven: a fourth kind bullet added with the heading left at "Three" → `the stated count equals the bulleted kinds…` red → covered

(A first attempt under zsh reported no reds: `$T` was not word-split, so `node --test` received one non-existent path. Re-run under bash with an array; the results above are from that run.)

---

## Regression Testing

| Area | Check | Result |
| --- | --- | --- |
| Full hermetic suite | `npm run ci:fast` (implementation report) | PASS (2 first-run failures explained, green alone) |
| Bundled copies | `bundle:check`; AC pin copy test | PASS |
| Skill validation | `quick_validate.py` finalise, review-task | PASS |
| Generated files | `check:generated` | PASS |
| Links | `doc-links.js` review-task SKILL.md; CI link-check | PASS |

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-dod-ac-prompt.md`, `skills/review-task/SKILL.md`, `shared/resources/tests/finalise-dod-ac-kinds.test.mjs`, `tests/review-task-measured-criterion.test.js`, `tests/lib/markdown-section.js`, both bundled copies, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test --test-reporter=tap shared/resources/tests/finalise-dod-ac-kinds.test.mjs tests/review-task-measured-criterion.test.js
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-task/SKILL.md --json
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/review-task/SKILL.md --bind INPUT=PROJ-45 --json
python3 skills/create-skill/scripts/quick_validate.py skills/finalise/   # and skills/review-task/
```

### Coverage Report
Not applicable — Markdown prose and text pins; no line coverage instrument applies.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 and CR-2 in review-task check 4, each pinned.

### Short-term Actions (Non-Blocking)
1. CR-4, CR-5, CR-6 (low).
2. CR-3: a concrete test for "measured vs behaviour".

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Two verified medium defects in the review-task rule this task adds; everything else meets its criterion.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 resolved

---

**QA Report**: co-located at `task.166.qa.1.measured-non-functional-criteria.md`
**Gate File**: co-located at `task.166.gate.1.measured-non-functional-criteria.yml`
**Next Steps**: `/qa-fix` (pipeline Step 5b)
