# QA Report: Task 231 - Test infrastructure hygiene

**Task**: [task.231.test-infrastructure-hygiene.md](./task.231.test-infrastructure-hygiene.md)
**Gate File**: [task.231.gate.1.test-infrastructure-hygiene.yml](./task.231.gate.1.test-infrastructure-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-26
**Testing Completed**: 2026-10-26
**Gate Status**: CONCERNS

---

## Executive Summary

The review covered all six phases of PR #752 at head `0963c9e8`: the temp-dir wrapper and ratchet, the leak fixes, the worktree-safe scratch root, anchor checking in `doc-links.js` and its CI step, the block-owned wait rule, and the close-out. CI is green on the head, and every committed mutation proof goes red when its behaviour is reverted. One medium defect blocks a clean pass. The new anchor check reads a tracked symlink's index blob, and that blob holds the link's target path, not the Markdown. So every fragment link to a symlinked Markdown file is a false `[no-anchor]`.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (CR-1 fixed and covered by a test)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (Phases 0–5 boxes ticked)
- [x] Tests passing (CI `test` pass @ `0963c9e8`; the 7 changed test files run locally: 195/195)
- [x] Breaking changes documented (Section 5: `npm test` wrapper; `[no-anchor]` state)
- [x] Code on feature branch with open PR (#752 → `develop`)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration)
- [x] Performance Testing (anchor-corpus timing taken from the implementation report)
- [x] Regression Testing
- [x] Security Review (probe engine, 8 cases)
- [x] Code Review

### Review Methodology

Direct tools, plus one read-only Explore code reviewer (Step 3b). This is a first review, so the whole branch diff was reviewed. The diff excluded the generated `skills/*/references/` byte copies and `docs/tasks/`, and covered 25 files and about 2,000 lines. The reviewer was dispatched at 2026-10-26T06:28:11Z and its result was read at 06:37:10Z (`duration_ms` 515240). Mutation proofs ran only after it returned.

Step 4b does not apply: the change set touches no `SKILL.md` or `shared/resources/*.md`, so it has no runnable prose to execute.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Measure | PASS | Recorded | Two base runs, escapes traced, anchor population counted and `markdown-link-check` gap measured (implementation report, Decisions Log) |
| Phase 1: Contain and ratchet | CONCERNS | Verified | Wrapper, ratchet and four leak fixes are correct; QA-1 (low): `groupByPrefix` drops a `__proto__` prefix |
| Phase 2: Worktree scratch root | PASS | Verified | `mainCheckout()` via `--git-common-dir`; new worktree case; 56/56 |
| Phase 3: Anchor checking | CONCERNS | Verified | CR-1 (medium): symlinked targets; CR-2 (advisory): engine-only PR checks nothing |
| Phase 4: Block-owned wait | PASS | Verified | `isWaitMarked` unit case; CR-3 cleanup |
| Phase 5: Close-out | PASS | Verified | CHANGELOG `(task 231)`, full suite green locally and in CI |

**Overall Phase Completion**: 6/6 delivered; 2 carry findings.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| SC-1 per-run dir removed | pass, fail or signal | removed | PASS | `tests/test-tmpdir.test.js` (6 cases incl. SIGTERM and read-only subtree); mutation 1 → 7 red |
| SC-2 new/over prefix fails | non-zero, named | yes | PASS | `tests/test-tmpdir.test.js`; mutation 2 → 2 red; probe engine 5/5 hostile rejected |
| SC-3 four prefixes un-ratcheted, count lower | absent; lower | absent; 442 ≤ 448 | PASS | `tests/tmp-leak-ratchet.json` (committed-ratchet test asserts the four absent) |
| SC-4 observation-log in a worktree | passes | 56/56 | PASS | worktree case `scratchRoot: a linked worktree's scratch base…`; mutation 5 → 2 red |
| SC-5 `other.md#nope` → `[no-anchor]` | reported | reported | PASS (with CR-1) | `doc-links.test.mjs` anchor cases; mutation 3 → 2 red. The criterion holds, but CR-1 is a false positive the listed shapes do not cover |
| SC-6 CI runs `doc-links.js` per changed file | step present and run | yes | PASS (box unticked) | run 40279891591, step "Check anchors and tracked-tree links in changed files": success, 5 files |
| SC-7 block-owned wait accepted | accept/refuse | yes | PASS | `isWaitMarked` unit test; mutation 4 → 1 red |
| Mutation proofs recorded | 5 | 5 re-run in QA | PASS | below |
| `bundle:check`, `format:check`, `lint:shell` | clean | clean | PASS | implementation report verification run; CI `validate`, `shellcheck` pass |
| CHANGELOG / traps.md | present | present | PASS | `CHANGELOG.md` `[Unreleased]`; `docs/contributing/traps.md` `df -i` trap |

---

## Breaking Changes Validation

### Breaking Change: `npm test` becomes a wrapper
Documented: Yes
Migration Path Provided: Yes (none needed for callers; ratchet-update rule for contributors)
Migration Tested: Yes (CI `ci:fast` path ran through the wrapper: `test` pass, ratchet ok)
Consumer Code Updated: Yes (`shell-suite-guard.test.js`, `test-runner-reach.test.js` read `test:suite`)

### Breaking Change: `doc-links.js` reports `[no-anchor]`
Documented: Yes
Migration Path Provided: Yes (`KNOWN_ANCHORS` ratchets, both empty after the fixes)
Migration Tested: Yes (repo-wide corpus test; `qa-read-back` `no-anchor` remedy and halt test)
Consumer Code Updated: Yes. CR-1 is a false positive this change introduces for consumers with symlinked Markdown.

**Overall Breaking Changes Assessment**: PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: anchor check reads a symlink's blob, not its target's text (TASK-231-CR-1)**
- **Severity**: MEDIUM
- **Category**: Functional
- **Location**: `shared/resources/doc-links.js:468`
- **Observation**: `anchorsFor` reads a tracked target with `git show :<path>`. When that path is a symlink (index mode `120000`), the blob is the link's target path. The anchor set comes back empty, and every fragment link to the file is reported `[no-anchor]`. Reproduced in a scratch repository: with `LINK.md -> REAL.md` and `REAL.md` holding `## Testing`, `[a](LINK.md#testing)` fails while `[b](REAL.md#testing)` passes. In this repository, `git show :CLAUDE.md` prints `AGENTS.md`.
- **Provenance**: new to this change. The base did not check fragments at all, and no tracked document currently links into `CLAUDE.md#…` (the corpus test is green).
- **Impact**: any consumer document that links a fragment of a symlinked Markdown file fails `doc-links.js`, and the CI step and `qa-read-back` both go red.
- **Recommendation**: resolve a tracked symlink to its in-repository target before reading anchors, and add a test case with a tracked symlinked target.
- **Priority**: P1

### LOW Severity Issues (1)

**TASK-231-QA-1** (`scripts/test-tmpdir.mjs:76`): `groupByPrefix` counts into a plain `{}`. A leaked `__proto__-Ab12Cd` disappears from the result, and `constructor-Ab12Cd` counts as `"function Object() { [native code] }1"`. Reproduced by calling `groupByPrefix(["__proto__-Ab12Cd","constructor-Ab12Cd","ok-Ab12Cd"])`, which returns only `constructor` and `ok`. The fix is to count into `Object.create(null)`. Found by QA, not by the reviewer.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
`dirSet` is memoised per tracked set, which brought the repo-wide anchor corpus test from 9.2 s to 2.7 s. CI `test` ran in 4m0s.

### Reliability — CONCERNS
CR-1 is a silent false positive that halts `qa-read-back`. QA-1 lets a leak with a prototype-key name past the ratchet. Wrapper cleanup is proven on pass, fail, signal and read-only subtrees.

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8 (`escaped: 0`), copied from `task.231.qa.1.security.run.json` `totals`
- **Boundary**: `true`, on `scripts/test-tmpdir.mjs#compareRatchet`, an exported verdict (`{ ok }`) whose `false` fails `npm test`. It was probed through the JS entry form with `--args-json '[{"known":2}]'` and `task.231.qa.1.ratchet-cases.json`. The 5 hostile cases (new prefix, over count, `__proto__`, `constructor`, string count) were all rejected, and the 3 legitimate ones (within, below, healed) were all accepted.
- **Not a security boundary**: the `doc-links.js` anchor check, `anchorsOf` and `sameFileFragments`. They are lint over repository Markdown, which matches the task.139 DoD judgement of `doc-links.js`. They read only index blobs or files that resolve inside the repository, and run `git` with an argument array, with no shell string.

### Maintainability — PASS
One shared scanner, `scanLinks`, sits behind both link extractors. The header contract, `traps.md` and `tech-stack.md` are updated. CR-3 is a minor cleanup.

---

## Code Review

Code review is blocking for this run (`code_review_blocking=true` from the pipeline; the document sets no flag). One finding is promoted to the gate: CR-1 → `TASK-231-CR-1`. Every anchor checks `ok` (`finding-anchors`, `--rev HEAD`).

**Correctness bugs (2):**
- [medium/high] `shared/resources/doc-links.js:468`: for a tracked symlink, `git show :<path>` returns the link target path, so every fragment link to it is `[no-anchor]`. Fix: resolve the symlink to its in-repository target and read that. **Promoted: TASK-231-CR-1.**
- [low/medium] `.github/workflows/docs-link-check.yml:31`: a PR that changes only `doc-links.js` triggers the workflow, but `changed.txt` holds only Markdown, so the anchor step passes without exercising the engine. Fix: run a fixed sample when the engine changes, or drop the trigger. Advisory (confidence medium).

**Cleanups (1):**
- `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:389`: `blocksOf(rel)` re-reads and re-parses the file for every dispatch line. Fix: compute it once per file.

**Boundary**: `true`, with `probes_executed: 8` and `escaped: 0`. Details are under Security above.

**Platform variance**: the wrapper and the scratch root both derive from `os.tmpdir()`. Both the review host and CI are Linux with `/tmp`, and CI passed on the head. The `/var/folders` (macOS) variant was not run because no macOS host was available.

**Mutation proofs** (re-run in QA against `0963c9e8`; the tree was restored and `git status` was unchanged afterwards):

- mutation-proven: wrapper `finally` removal deleted → `tests/test-tmpdir.test.js` "a suite that leaks nothing exits 0, and the per-run directory is gone" (+6) → covered
- mutation-proven: ratchet over-count branch disabled → `tests/test-tmpdir.test.js` "a ratcheted prefix within its count passes; above its count it fails" (+1) → covered
- mutation-proven: `doc-links.js` fragment branch removed → `doc-links.test.mjs` "anchors: a dead cross-file or same-file fragment is [no-anchor]…" (+1) → covered
- mutation-proven: `isWaitMarked` block-owned arm returns false → parity test "isWaitMarked: a block that marks its own wait counts…" → covered
- mutation-proven: `mainCheckout` returns the cwd → `observation-log.test.mjs` "scratchRoot: a linked worktree's scratch base is the main checkout's" (+1) → covered

All five were proven. The ratchet proof's pattern needed updating first, because Prettier had reflowed the `else if` onto two lines.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Full suite through the wrapper (CI, zsh + gawk + mawk) | PASS, `test` 4m0s @ `0963c9e8` |
| Repo-wide anchor corpus (every tracked `*.md`) | PASS, `KNOWN_ANCHORS` empty |
| `qa-read-back` (bundled to qa-task and qa-story) | PASS, `no-anchor` halt test added |
| Suite-list guards (`shell-suite-guard`, `test-runner-reach`) | PASS, they now read `test:suite` |
| `npm run validate` on the 11 changed skills | PASS (calibrated: an unknown skill exits 1) |

---

## Test Artifacts

### Files Reviewed
`scripts/test-tmpdir.mjs`, `tests/test-tmpdir.test.js`, `tests/tmp-leak-ratchet.json`, `package.json`, `shared/resources/doc-links.js`, `shared/resources/qa-read-back.js`, `shared/resources/tests/doc-links.test.mjs`, `shared/resources/tests/observation-log.test.mjs`, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, `.github/workflows/docs-link-check.yml`, and the leak-fix test files.

### Test Commands Executed
```bash
gh pr checks 752
command node --test tests/test-tmpdir.test.js shared/resources/tests/doc-links.test.mjs shared/resources/tests/qa-read-back.test.mjs evals/shared/tests/qa-loop-lock-fields-parity.test.mjs shared/resources/tests/observation-log.test.mjs tests/shell-suite-guard.test.js tests/test-runner-reach.test.js
npm run -s validate -- skills/<each changed skill>/
command node shared/resources/security-probe.mjs --sink path --entry 'scripts/test-tmpdir.mjs#compareRatchet' --args-json '[{"known":2}]' --cases-file docs/tasks/task.231.test-infrastructure-hygiene/task.231.qa.1.ratchet-cases.json --record docs/tasks/task.231.test-infrastructure-hygiene/task.231.qa.1.security.run.json --json
python3 mutate.py   # scratch; five split/join mutations, restored and compared
```

### Coverage Report
Not measured. The repository has no coverage tooling for `node --test`. Each criterion is covered by its named, mutation-proven test.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: resolve tracked symlinks before reading anchors, and add a test (P1).

### Short-term Actions (Non-Blocking)
1. QA-1: count prefixes in a null-prototype object.
2. CR-2: make an engine-only PR exercise the anchor step, or drop the path trigger.
3. CR-3: hoist `blocksOf(rel)` out of the per-line loop.
4. Tick SC-6 from run 40279891591.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one medium correctness defect (CR-1) and reliability NFR CONCERNS. No high issues, and every other criterion is met with executed evidence.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed and covered by a test.

---

**QA Report**: co-located at `task.231.qa.1.test-infrastructure-hygiene.md`
**Gate File**: co-located at `task.231.gate.1.test-infrastructure-hygiene.yml`
**Next Steps**: `/qa-fix` for CR-1 (with QA-1 if cheap), then QA cycle 2.
