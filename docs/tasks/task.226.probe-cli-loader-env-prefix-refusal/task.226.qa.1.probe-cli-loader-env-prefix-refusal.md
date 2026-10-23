# QA Report: Task 226 - security-probe: refuse every LD_* and DYLD_* variable on cli: case fixtures

**Task**: [task.226.probe-cli-loader-env-prefix-refusal.md](./task.226.probe-cli-loader-env-prefix-refusal.md)
**Gate File**: [task.226.gate.1.probe-cli-loader-env-prefix-refusal.yml](./task.226.gate.1.probe-cli-loader-env-prefix-refusal.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-22
**Testing Completed**: 2026-10-22
**Gate Status**: PASS

---

## Executive Summary

The task replaces four exact loader names with a prefix rule (`LD_`, `DYLD_`), so a `cli:` case's `fixture.env` now refuses every dynamic-loader variable. QA ran the probe engine on both fixture CLIs and the committed suite. It also ran three mutants and the diff reviewer, and checked the docs. Every check passed, and there are no findings.

**Overall Assessment**: PASS
**Deployment Recommendation**: READY

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases are completed (3/3, every checkbox ticked)
- [x] Tests pass
- [x] Breaking changes are documented (none for consumers. Probe plans that set an `LD_*`/`DYLD_*` name are now declined by name, as §5 says)
- [x] Code is on `feature/task.226.probe-cli-loader-env-prefix-refusal` with PR #729 open

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe engine, measured)
- [x] Code Review

### Review Methodology

Direct tools. This is a small task (3 phases, one module, Low risk) and a first review. The Step 3b diff reviewer ran as one read-only Explore subagent. It was dispatched 12:47:49Z and returned 84.9 s later (`duration_ms` 84908). Its scope was `origin/develop...HEAD` for `shared/resources/` and `CHANGELOG.md`, which is 4 files and 6 hunks. The four bundled `security-probe.mjs` copies and the two `probe-boundary-rule.md` copies were left out of the patch: `bundle:check` proves they match their sources, and the reviewer re-checked that too. The task documents were also left out.

Step 4b: `shared/resources/probe-boundary-rule.md` changed only in prose. `qa-execute-snippets.mjs --diff-base <merge-base>` reports 0 changed fenced blocks.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Test first | PASS | Verified | `LD_AUDIT` and `DYLD_FRAMEWORK_PATH` decline rows and the `MY_LD_FLAG` control case are in `security-probe.test.mjs`. The test was renamed. |
| Phase 2: The prefix refusal | PASS | Verified | `CLI_LOADER_ENV_PREFIXES` and `steersInterpreter` are beside `CLI_INTERPRETER_ENV`. `runCliCase` uses `.find(steersInterpreter)`. |
| Phase 3: Docs, bundle, changelog | PASS | Verified | §5 of `probe-boundary-rule.md`, the task 216 `### Added` entry and the new `### Fixed` entry all say "any `LD_*` or `DYLD_*`". Bundle check is clean. |

**Overall Phase Completion**: 3/3 phases passed

---

## Success Criteria Verification

### Functional

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| `LD_AUDIT` / `DYLD_FRAMEWORK_PATH` declined by name, nothing executed, Node and Python | declined | declined | PASS | test `cli entry (${lang}): … any LD_*/DYLD_* variable in it are declined by name`, both languages, plus the engine run (record) |
| `MY_LD_FLAG` still runs and is scored | accepted | accepted | PASS | the control case in the same test. Engine case `cli-fixture.env-mid-prefix-legit` accepted on both languages |
| `HOME`, `PATH`, `NODE_OPTIONS`, `LD_PRELOAD` still declined with their messages | unchanged | unchanged | PASS | existing rows in the same test. Engine cases `env-path`, `env-node-options`, `env-home` and `env-ld-preload` declined |
| `fence:` and `shell-argv:` unchanged | tests pass untouched | 54/54 | PASS | `--test-name-pattern="fence\|shell-argv"` |

### Performance

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Not applicable | — | — | PASS | One prefix comparison per env key, before the spawn (`security-probe.mjs`, `steersInterpreter`). Nothing to measure. |

### Code Quality

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| New rows red before Phase 2 | red | red | PASS | The implementation report records the Phase 1 run. QA's four-name mutant (M3) shows the same red state. |
| Mutation-proved | red on revert | red | PASS | M1, M2 and M3 below |
| `ci:fast` / `bundle:check` / `validate` | green | green | PASS | `ci:fast` per the implementation report (6201 tests, 0 fail). QA re-ran `bundle:check` (0 problems) and `validate` for all four skills (rc 0). |

### Migration

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| CHANGELOG `[Unreleased]` cites task 226 and names the new variables | yes | yes | PASS | `CHANGELOG.md:109-112` (`### Fixed`, inside `[Unreleased]`) |
| §5, the finalise prompt and both CHANGELOG entries describe one rule | yes | yes | PASS | `probe-boundary-rule.md:496`, `finalise-dod-security-prompt.md:235`, `CHANGELOG.md:16`, `CHANGELOG.md:109` |

---

## Breaking Changes Validation

### Breaking Change: a `cli:` case may no longer set any `LD_*` / `DYLD_*` name
Documented: Yes (task §5 and `probe-boundary-rule.md` §5)
Migration Path Provided: Yes. Use `shell-argv:` when one of these variables really must be set.
Migration Tested: N/A. No probe plan in the repository sets such a name (the review's removed-literal search).
Consumer Code Updated: N/A
Notes: The case is declined by name, not mis-scored, so a consumer's plan fails loudly.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)
### MEDIUM Severity Issues (0)
### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0

---

## NFR Assessment

### Performance — PASS
One `startsWith` per prefix per env key, before any spawn.

### Reliability — PASS
The decline path and message are task 216's and unchanged. A declined case reports its key by name.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 16 (record [task.226.qa.1.security.run.json](./task.226.qa.1.security.run.json); `reproduced` 0, `overblocked` 0, `escaped` 0)
- Boundary: `boundary: true`. The boundary is `runCliCase`'s fixture validation, now through `steersInterpreter`. It was probed with the `cli:` form on `cli-needs-data.mjs` and `cli-needs-data.py`. The cases file is task 216's 13 cases plus 6 new ones ([cases](./task.226.qa.1.security.cases.json)). The new cases decline `LD_AUDIT`, `LD_PRELOAD`, `DYLD_FRAMEWORK_PATH` and `DYLD_FALLBACK_LIBRARY_PATH`, and accept `MY_LD_FLAG` and lowercase `ld_audit`. Every declined case names its key. The two new accepted cases are among the 8 that ran on each language.
- The threat is real. Under the old exact-name list (mutant M3), the `LD_AUDIT` case reached the dynamic loader: `ld.so: object '/tmp/x' cannot be loaded as audit interface`.

### Maintainability — PASS
The bundled copies match their sources. The predicate sits beside the constants it reads and has one reader.

---

## Code Review

Reviewed: 4 files, 6 hunks (`CHANGELOG.md`, `probe-boundary-rule.md`, `security-probe.mjs` header, the `runCliCase` check and constants, and `security-probe.test.mjs:4027-4080`). The reviewer also checked that `steersInterpreter` is the only reader, that every bundled copy matches, and that the control case tells `startsWith` apart from `includes`. `finding-anchors.js`: `ok`.

**Correctness bugs (0):** None identified.

**Cleanups (0):** None identified.

Platform variance: not applicable. The decline happens before any spawn, and no environment-derived value reaches a validating consumer.

Mutation proofs. Each mutant was applied to `shared/resources/security-probe.mjs` from a `cp` snapshot, its count was asserted, and the file was restored. Baseline was green after the runs, and `git diff` is clean.

- mutation-proven: `k.startsWith(p)` → `k.includes(p)` → `cli entry (node|python) … declined by name` (the `MY_LD_FLAG` control) → covered
- mutation-proven: the prefix clause replaced with `false` → `cli entry (node|python) … declined by name` → covered
- mutation-proven: the prefix clause replaced with the old four exact names → `cli entry (node|python) … declined by name` (the `LD_AUDIT` row: `rejected`, `ld.so` loaded the audit path) → covered

3 of 3 proofs are `covered`.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (whole file) | 217/217 pass |
| `fence:` / `shell-argv:` tests | 54/54 pass |
| Bundled copies (`bundle:check`) | 0 problems, 128 skills |
| `validate` for finalise, qa-story, qa-task, review-security | rc 0 each |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/security-probe.mjs`
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/probe-boundary-rule.md`
- `shared/resources/finalise-dod-security-prompt.md`
- `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs
command node --test --test-name-pattern="fence|shell-argv" shared/resources/tests/security-probe.test.mjs
command node --test --test-name-pattern="declined by name" shared/resources/tests/security-probe.test.mjs   # per mutant
npm run -s validate -- skills/{finalise,qa-story,qa-task,review-security}/
npm run -s bundle:check
./node_modules/.bin/prettier --check shared/resources/security-probe.mjs shared/resources/tests/security-probe.test.mjs
command node shared/resources/security-probe.mjs --cases-file docs/tasks/task.226.probe-cli-loader-env-prefix-refusal/task.226.qa.1.security.cases.json \
  --sink markdown-structure --entry 'cli:shared/resources/tests/fixtures/security-probe/cli-needs-data.<mjs|py>' --argv '["merge-back","{input}"]' \
  --name 'cli-needs-data.<mjs|py> merge-back' --repo-root "$(git rev-parse --show-toplevel)" \
  --record docs/tasks/task.226.probe-cli-loader-env-prefix-refusal/task.226.qa.1.security.run.json --json
```

### Coverage Report
Not measured. The repository's suite collects no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
None.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: No findings. The boundary was probed on both languages, and every criterion is backed by a committed test or a cited line.
**Quality Score**: 100/100

**Deployment Recommendation**: READY
**Conditions**: None

---

**QA Report**: co-located at `task.226.qa.1.probe-cli-loader-env-prefix-refusal.md`
**Gate File**: co-located at `task.226.gate.1.probe-cli-loader-env-prefix-refusal.yml`
**Next Steps**: 5c PR conformance review.
