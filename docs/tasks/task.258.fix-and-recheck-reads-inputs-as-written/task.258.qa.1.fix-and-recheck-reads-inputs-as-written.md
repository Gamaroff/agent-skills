# QA Report: Task 258 - finalise fix-and-recheck reads test names, scope entries and run logs as written

**Task**: [Link to task document](./task.258.fix-and-recheck-reads-inputs-as-written.md)
**Gate File**: [task.258.gate.1.fix-and-recheck-reads-inputs-as-written.yml](./task.258.gate.1.fix-and-recheck-reads-inputs-as-written.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-04
**Testing Completed**: 2026-11-04
**Gate Status**: PASS

---

## Executive Summary

The four edge cases task 257's gate 2 left open (CR2-1 to CR2-4) are fixed in the Step 8a evaluator. Each is held by a committed test, and QA reverted each fix in turn and saw its named test go red.

**Overall Assessment**: PASS (95/100)
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4 of 4)
- [x] Tests passing
- [x] Breaking changes documented (a record naming `tests/x.sh` or `test_foo.py` now halts on `mutation-proved`)
- [x] Code on feature branch with open PR 832

### Testing Approach

- [x] Automated Testing
- [x] Security Review (probe engine)
- [x] Code Review
- [x] Regression Testing

### Review Methodology

Direct tools plus one read-only Explore subagent for the diff review (Step 3b). First review, so the whole branch diff, filtered to the evaluator, its test file, `skills/finalise/SKILL.md` and `CHANGELOG.md`; the bundled copy and the task documents were left out because the first is generated and the second is not code. Reviewer dispatched 15:27:04Z, returned within the same minute (duration_ms 33947).

Step 4b: ran `qa-execute-snippets.mjs` over `skills/finalise/SKILL.md` with `--diff-base`. The change touched prose only: changed blocks 0, executed 0. The file has 43 blocks (0 runnable, 3 placeholder, 40 mutating). Shells that ran: bash; `zsh-unavailable` on this host.

CI on c6e1d753e747: pending. Recorded and not waited on; CI is gated once at `/finalise`.

Re-review scope: not applicable (first review).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| 1: `isTestFileName` (CR2-1) | PASS | Verified | Test-file spellings refused in any case; titles with whitespace and `.md` paths are not |
| 2: `normaliseEntry` (CR2-2) | PASS | Verified | `./x`, `/x` and backticked entries read as `x`; candidate guard unchanged |
| 3: CRLF and `:<digit>` (CR2-3, CR2-4) | PASS | Verified | `split` on `\r?\n`; `pathy` is `.md` only |
| 4: Bundle, CHANGELOG, Step 8a sentence | PASS | Verified | `bundle:check` clean; entry cites task 258; sentence names the shapes |

**Overall Phase Completion**: 4/4

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| Four named test files refused with "a test file — name the test by its title" | Test "a test file is refused by name in every common spelling and any letter case (task 258, CR2-1)"; red under mutation 1 | PASS |
| `pathInScope("src/a.js", [e])` true for `./src/a.js`, `/src/a.js`, backticked; false for `/etc/passwd` candidate | Test for CR2-2; red under mutation 2; probe run below | PASS |
| A CRLF red line proves its test | Test "a CRLF run log is read like an LF one (task 258, CR2-3)"; red under mutation 3 | PASS |
| `✖ GET /v1:5 stuff` does not prove `GET /v1`; docs-link `.md` proof still proves | Test for CR2-4; red under mutation 4; the `.md` control stays green | PASS |
| `CI=true` evaluator tests plus consumer suites | 59 evaluator tests plus 87 across the three consumer suites, 0 fail | PASS |
| `bundle:check`, prettier, `validate -- skills/finalise/` | 0 problems; all files formatted; finalise validates | PASS |
| CHANGELOG entry | `changelog-cites.sh task.258` reports `cites (task 258)` | PASS |
| Step 8a sentence matches the shapes | Read against `isTestFileName` (`*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`, `test/`, `tests/`, `__tests__/`) | PASS |
| Mutation record in the QA report | Table below | PASS |

Criteria drift: clean (`criteria-drift.js`, base review commit). The Performance criterion was reworded at review and carries the review's approval.

### Mutation record (task § 8)

Each fix was reverted from a `cp` snapshot, the named test was expected red, the file was restored and `cmp` verified, and the suite was baselined green (59 pass) afterwards. Working tree identical to the start.

mutation-proven: `isTestFileName` call replaced by the old `TEST_FILE_SHAPE` regex → "a test file is refused by name in every common spelling and any letter case (task 258, CR2-1)" → covered
mutation-proven: `normaliseEntry(entry)` replaced by `entry.trim()` in `entryPatterns` → "scope: a Files Summary entry written ./x, /x or in backticks means x (task 258, CR2-2)" → covered
mutation-proven: `split(/\r?\n/)` replaced by `split("\n")` in `analyseRun` → "a CRLF run log is read like an LF one (task 258, CR2-3)" → covered
mutation-proven: `pathy` restored to `test.includes("/") || /\.md$/.test(test)` → "the `:<digit>` boundary belongs to a .md proof path, not to any title with a slash (task 258, CR2-4)" → covered

4 of 4, each exactly one test red, each the predicted one.

---

## Breaking Changes Validation

### Breaking Change: named test files are refused

Documented: Yes (task, PR body, CHANGELOG "Changed refusal")
Migration Path Provided: Yes (name the test by its title)
Migration Tested: Yes (the refusal detail is asserted)
Consumer Code Updated: N/A

**Overall**: PASS

---

## Issues Found

HIGH: 0, MEDIUM: 0, LOW: 1 (advisory, below)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 1

---

## NFR Assessment

### Performance — PASS
No loop or process call added.

### Reliability — PASS
A CRLF log is read like an LF one; a named test file is refused, which fails closed.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 11
- `pathInScope` is the scope boundary. Probed with the engine's `path` sink (`--args-json` carrying one array argument): entries `./reports/`, a backticked name, `/.gitkeep`, `./src/` and `/`. Verdict `engages`, 11 passed, 0 reproduced, 0 escaped. An earlier run that passed the entries as separate arguments, not one array, scored `rejects-every-input` because `pathInScope` then received a string; that was a wrong call, not a finding. Record: [task.258.qa.1.security.run.json](./task.258.qa.1.security.run.json).
- `boundary_signals: ['refused']`; `boundary: true`. `isTestFileName` is module-private and judges a name the author wrote, not a path used to reach a file; it is held by committed unit tests.

### Maintainability — PASS
One predicate and one normaliser, each named by a test.

---

## Code Review

Reviewed three files in the filtered patch. Advisory (the reviewer reported no bug).

**Correctness bugs (0):** none.

**Cleanups (1):**
- `shared/resources/finalise-fix-and-recheck.mjs:311` — low/low: `isTestFileName` tests `.md` case-insensitively while `subjectNames` tests it case-sensitively, so a proof path ending `.MD` is exempt from the test-file refusal yet gets no `:<line>` boundary. Before this task, `test.includes("/")` gave such a path the boundary. QA confirmed the mismatch by reading both lines; the case needs an upper-case `.MD` extension on a docs-link proof, which no writer in this repository produces. Routed to `recommendations.future`.

Boundary rule: `boundary: true` (the criteria use "refused"; `pathInScope` guards scope). `probes_executed: 11`, `escaped: 0`.

Platform variance: no environment-derived value reaches a validating consumer in the diff.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `finalise-rerun-scope` | PASS |
| `acceptance-commit-carries-5c` | PASS |
| `entrypoint-guard-realpath` | PASS |

87 tests, 0 fail.

---

## Test Artifacts

### Files Reviewed
`shared/resources/finalise-fix-and-recheck.mjs`, `shared/resources/tests/finalise-fix-and-recheck.test.mjs`, `skills/finalise/SKILL.md`, `CHANGELOG.md`, the task document.

### Test Commands Executed
```bash
CI=true command node --test shared/resources/tests/finalise-fix-and-recheck.test.mjs
CI=true command node --test shared/resources/tests/finalise-rerun-scope.test.mjs shared/resources/tests/acceptance-commit-carries-5c.test.mjs shared/resources/tests/entrypoint-guard-realpath.test.mjs
npm run validate -- skills/finalise/
npm run bundle:check
./node_modules/.bin/prettier --check shared/resources/finalise-fix-and-recheck.mjs shared/resources/tests/finalise-fix-and-recheck.test.mjs CHANGELOG.md skills/finalise/SKILL.md
command node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'shared/resources/finalise-fix-and-recheck.mjs#pathInScope' --args-json '[["./reports/","`archive..2026.tar.gz`","/.gitkeep","./src/","/"]]' --record task.258.qa.1.security.run.json --json
```

Standards-named validation: `npm run validate -- skills/finalise/` run (pass).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. Share one `.md` predicate between `isTestFileName` and `subjectNames` (CR-1).

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by a committed test that goes red when its fix is reverted; the scope boundary was probed and held.
**Quality Score**: 95/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.258.qa.1.fix-and-recheck-reads-inputs-as-written.md`
**Gate File**: co-located at `task.258.gate.1.fix-and-recheck-reads-inputs-as-written.yml`
**Next Steps**: review-pr (Step 5c), then finalise.
