# QA Report: Task 212 - qa-next: a note finding can be resolved, with evidence

**Task**: [Link to task document](./task.212.qa-next-resolvable-note-findings.md)
**Gate File**: [task.212.gate.1.qa-next-resolvable-note-findings.yml](./task.212.gate.1.qa-next-resolvable-note-findings.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-16
**Testing Completed**: 2026-10-16
**Gate Status**: CONCERNS

---

## Executive Summary

The marker is parsed, verified, counted and checked, and the `--resolve-finding` writer changes only its cell. The `--by` boundary engages: all 12 executed probes behaved correctly. Three MEDIUM defects reproduce and keep the gate at CONCERNS:

- **An invalid marker cannot be repaired.** The writer reports success over a marker that no longer holds.
- **"Later" is not chronological.** It fails across directories and environments, and for run-directory files with no date.
- **Duplicate finding numbers redirect the writer to the wrong row.**

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix the three MEDIUM findings

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (Progress Tracking 3/3)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#680, OPEN)

### Testing Approach

- [x] Automated Testing (unit + CLI end-to-end against a git-repo fixture)
- [x] Regression Testing (the 68 pre-existing qa-next tests)
- [x] Security Review (executed boundary probe)
- [x] Code Review (Step 3b, independent subagent)

### Review Methodology

The task has 3 phases, touches a single module, and its risk is not set. QA used direct tools plus the Step 3b diff reviewer (one Explore subagent), dispatched at 14:34Z. The reviewer took `duration_ms` 148706 (≈2.5 min). The traceability matrix came from the pipeline's mapper and was saved under `.summaries/` (gitignored).

First review, so no re-review scope applies. The reviewed diff was `origin/develop...HEAD` minus `docs/tasks/`, 897 lines, at head `525c9bb3`.

Step 4b (documented commands) ran over `skills/qa-next/SKILL.md`. It found 9 bash blocks: 0 runnable, 0 placeholder, 9 refused as mutating (write-redirection ×6, unrecognised command ×3). This is `no-executable-blocks`, which is information, not a finding. Only `bash` ran.

---

## New Findings This Cycle

First review — every finding below is new.

- **[medium]** `skills/qa-next/scripts/uat-status.mjs:950` — invalid marker cannot be repaired (T212-QA1-CR1)
- **[medium]** `skills/qa-next/scripts/uat-status.mjs:735` — "later" is index order, not chronology; undated files accepted (T212-QA1-CR2)
- **[medium]** `skills/qa-next/scripts/uat-status.mjs:935` — duplicate finding numbers: writer edits the first row (T212-QA1-CR3)
- **[low]** `skills/qa-next/README.md:86` — "a rebased-away sha reopens the row" is false until gc (advisory)
- **[low]** `evals/qa-next/unit/uat-status.test.mjs:3243` — not-a-git-repo test depends on `os.tmpdir()` placement (advisory)

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Parse, verify, count | CONCERNS | Verified | CR-2: the `run-not-later` rule is not chronological |
| Phase 2: The writer | CONCERNS | Verified | CR-1, CR-3 |
| Phase 3: Docs | PASS | Verified | The doc-agreement test passes. README carries the CR-2 and CR-4 sentences |

**Overall Phase Completion**: 3/3 implemented, 2 with open findings.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --------- | -------- | ------ |
| SC1 sha-resolved note closed, shown resolved | test "CLI: a validly resolved note is closed…" | PASS |
| SC2 absent sha → open, `--check` names commit-not-found | same test | PASS |
| SC3 later run closes; self/earlier/missing open; bad-evidence | `verifyResolution names every reason`, CLI test | CONCERNS — "later" is mis-defined (CR-2) |
| SC4 bug-link marker ignored, on-a-bug-link reported | pure + CLI tests | PASS |
| SC5 writer: one cell, idempotent, refusals byte-identical | writer test (10 refusals), CRLF test | CONCERNS — CR-1, CR-3 |
| SC6 no markers → identical output | "a run file with no markers…" test | PASS |
| SC7 `isOpenFinding` pure | plain-object test | PASS |
| SC8 `npm test` / `ci:fast` with `.agents/skills` aside | implementation record: 5766 tests, 0 fail | PASS (process check) |
| SC9 every criterion has a per-PR test | `evals/qa-next/unit/*.test.mjs` is in `npm test` | PASS |
| SC10–12 docs | doc-agreement test (`resolv` match for Step 5 is weak; text read: Step 5 names the resolved run files) | PASS |

---

## Breaking Changes Validation

None declared. Run files without markers read exactly as before. The criterion is asserted by a test, and the 68 pre-existing tests pass unchanged.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (3)

**Issue: An invalid marker cannot be repaired (T212-QA1-CR1)**
- **Severity**: MEDIUM
- **Category**: Functional / Reliability
- **Observation**: Resolve a finding by `runs/zz.md`, delete `runs/zz.md`, then re-run with the same `--by`. The writer prints `already resolved`, exits 0, and the row stays open. A different `--by` is refused with "already resolved by".
- **Impact**: A marker that stops holding becomes permanent: `--check` stays red, and the only remedy is a hand edit that SKILL.md forbids.
- **Recommendation**: Verify the existing marker first. Replace an invalid one with newly verified evidence. Report success only over a marker that holds.

**Issue: "Later" is index order, not chronology (T212-QA1-CR2)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**:
  - `listRunFiles` sorts by basename-with-sequence, then by path. Same-day runs in different function directories or environments are therefore ordered arbitrarily.
  - A run-directory file with no date is accepted by name order. Reproduced: `runs/zz.md` was accepted as evidence for `runs/A.4/2026-10-15-lan.md`, exit 0.
- **Impact**: A row can close on evidence that is not later, or not a run at all.
- **Recommendation**: Treat evidence as later only when its date prefix is strictly later, or when it has the same date, directory and environment and a higher sequence. Everything else is `run-not-later`. Fix the README sentence.

**Issue: Duplicate finding numbers (T212-QA1-CR3)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Observation**: A run file has two rows numbered `1`. Resolving `1` again answers "already resolved by" the first row's evidence, so the second row can never be targeted.
- **Recommendation**: Refuse with a non-zero exit, writing nothing, when more than one row carries the number.

Each of the three is recorded in gate `top_issues[]` and in this report, and a fix cycle is next. No separate bug files were written.

### LOW Severity Issues (2)

- CR-4: verification checks that the commit object exists, not that it is reachable, so a rebased-away sha keeps verifying until gc. The README claims otherwise.
- CR-5: the `not-a-git-repo` test assumes `os.tmpdir()` lies outside any git work tree.

**Total Issues**: HIGH: 0, MEDIUM: 3, LOW: 2

---

## NFR Assessment

### Performance — PASS
git is spawned only for commit markers and is cached per sha. A corpus with no markers spawns no process.

### Reliability — CONCERNS
See CR-1: the writer cannot recover a marker that no longer holds.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 12 (copied from `task.212.qa.1.security.run.json` `totals.executed`)
- **Probe**: `cli:skills/qa-next/scripts/uat-status.mjs`, run as `--resolve-finding runs/A.1/2026-10-15-lan.md 1 --by {input}` against a real fixture root, sink `path`.
- **Result**: verdict `engages`, 0 escapes.
  - All 11 hostile inputs were refused, each for its named reason: self, `..` traversal, a non-canonical path, an absolute path, a missing run, a sha with no repository, an option-like value, a backtick, a pipe, a newline row injection, and prose.
  - The legitimate later-run input was accepted, and it wrote only its cell.
- **Note**: the first probe run used `fixture.files`, which the `cli:` form does not materialise. All 12 cases then hit "no run file", so that vacuous run was discarded and re-run against a real `--root`.
- **Other checks**: git runs through `execFileSync` with an argument array, and commit evidence is hex-only, so no flag can reach git.

### Maintainability — PASS
Reader and writer share one row locator. `verifyResolution` is pure, with its I/O injected.

---

## Code Review

Advisory, except where a finding was promoted to the gate (`code_review_blocking=true`). Every anchor was checked with `finding-anchors.js`: CR-1, CR-2, CR-3 and CR-5 read `ok`; CR-4 reads `unchecked-text`.

**Correctness bugs (5):**
- [medium/high] `skills/qa-next/scripts/uat-status.mjs:950` — an invalid existing marker short-circuits to "already resolved" or a refusal → verify it first, and replace it if it is invalid. **Promoted: T212-QA1-CR1.**
- [medium/high] `skills/qa-next/scripts/uat-status.mjs:735` — "later" is `listRunFiles` index order → decide from the date, directory, environment and sequence. **Promoted: T212-QA1-CR2.**
- [medium/medium] `skills/qa-next/scripts/uat-status.mjs:935` — duplicate finding numbers make the writer edit the first row → refuse when the number is ambiguous. **Reproduced by QA and promoted as a QA finding: T212-QA1-CR3.**
- [low/medium] `skills/qa-next/README.md:86` — existence is not reachability → reword the README, or check reachability.
- [low/medium] `evals/qa-next/unit/uat-status.test.mjs:3243` — the test depends on where the temp dir lives → set `GIT_CEILING_DIRECTORIES`.

**Cleanups (0).**

**Boundary**: `boundary: true`. The boundary is the `--resolve-finding --by` evidence check, and `probes_executed: 12`.

**Provenance**: all three MEDIUM findings are in code this branch adds, so none are pre-existing.

**Mutation spot-check**:
- QA cycle 1 made no fixes. Two guards were spot-checked:
  - mutation-proven: `run-is-self` check removed → `verifyResolution names every reason` → covered
  - mutation-proven: writer verification skipped → `--resolve-finding writes one cell … every refusal leaves the file byte-identical` → covered
- The implementation record has a dev-time table with 7 more proofs. QA did not re-run those; they are dev-only.

**Platform variance**: the CI host is Linux with `TMPDIR=/tmp`, the same as this host. CR-5 records the remaining dependency on `os.tmpdir()` placement.

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| 68 pre-existing qa-next unit tests | PASS (unchanged) |
| `npm run ci:fast` (5766 tests) | PASS — implementation record, `.agents/skills` moved aside |
| `npm run validate -- skills/qa-next/` | PASS |

---

## Test Artifacts

### Files Reviewed
`skills/qa-next/scripts/uat-status.mjs`, `evals/qa-next/unit/uat-status.test.mjs`, `skills/qa-next/{SKILL.md,README.md,assets/run.template.md}`, `CHANGELOG.md`

### Test Commands Executed
```bash
npm run validate -- skills/qa-next/
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/qa-next/SKILL.md --json
node .agents/skills/qa-task/references/security-probe.mjs --sink path --entry 'cli:skills/qa-next/scripts/uat-status.mjs' --argv '["--root","<fixture>","--resolve-finding","runs/A.1/2026-10-15-lan.md","1","--by","{input}","--date","2026-10-16"]' --cases-file task.212.qa.1.security.cases.json --record task.212.qa.1.security.run.json --json
node --test --test-name-pattern='<test>' evals/qa-next/unit/uat-status.test.mjs   # mutation spot-checks
```

---

## Recommendations

### Immediate Actions (Blocking)
1. T212-QA1-CR1, CR2, CR3 — fix each with a test.

### Short-term Actions (Non-Blocking)
1. CR-4 README wording; CR-5 test pinning; a duplicate-number check in `checkFindings` (would newly fail consumer `--check`).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: No HIGH findings, and every NFR except reliability passes. Three reproduced MEDIUM defects are open in the gate queue.
**Quality Score**: 70/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix the three MEDIUM findings

---

**QA Report**: co-located at `task.212.qa.1.qa-next-resolvable-note-findings.md`
**Gate File**: co-located at `task.212.gate.1.qa-next-resolvable-note-findings.yml`
**Next Steps**: `/qa-fix` cycle 1
