# QA Report: Task 154 - Bundler and snippet-test hygiene: attributed warning, symlink-free test run

**Task**: [task.154.bundler-and-snippet-test-hygiene.md](./task.154.bundler-and-snippet-test-hygiene.md)
**Gate File**: [task.154.gate.1.bundler-and-snippet-test-hygiene.yml](./task.154.gate.1.bundler-and-snippet-test-hygiene.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-29
**Testing Completed**: 2026-09-29
**Gate Status**: FAIL

---

## Executive Summary

This was a first review of PR #513, covering the whole branch diff: 22 files, +1036/−98. The obs #151
half works: the bundler warning is attributed, it is deduplicated, and it has a live-tree reader. All
six of the task's mutation proofs hold. The obs #149 half has one HIGH defect, found by executing it.
The clean-checkout runner `rm -rf`s whatever `CLEAN_CHECKOUT_DIR` names. A by-hand probe in a scratch
fixture deleted the repository, `.git` included, and also its parent directory. One MEDIUM test defect
came from code review.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`)
- [x] All implementation phases completed (28/28 checklist items)
- [x] Tests passing
- [x] Breaking changes documented
- [x] Code on the feature branch with open PR #513

### Testing Approach

- [x] Automated Testing (unit, fixture, full suite in place and in a clean clone)
- [x] Regression Testing
- [x] Security Review (a by-hand probe of the runner's env-var sink)
- [x] Code Review (Step 3b, Explore subagent, blocking via `code_review_blocking=true`)

### Review Methodology

The review used direct tools plus one code-review subagent. The task has more than 5 phases across
several modules, but every file was small and every phase had a committed test, so parallel agents
added nothing over direct execution. This was a first review, so the scope was the whole branch diff
`origin/develop...HEAD`.

- **Step 4b.** `skills/create-skill/SKILL.md` has 4 blocks: 1 placeholder (line 350, the `<skill-name>`
  template slot, which `--bind` cannot fill) and 3 mutating. That produced a `zero-blocks-executed`
  finding at medium confidence. `shared/resources/observation-log-contract.md` has 5 blocks, all
  mutating, which produced a `no-executable-blocks` note. The diff adds **no** fenced block to either
  file (`git diff … | grep -c '^+```'` → 0), so both results are pre-existing. The finding is
  advisory, not gated.
- **Boundary rule.** The runner's `CLEAN_CHECKOUT_DIR` guard is a refusal on an env-var arm. That arm
  is a declined sink, because no `shell:` / `shell-fn:` / `cli:` entry form passes an environment
  value, so it was probed by hand per `probe-boundary-rule.md` §5.1. `shared_refs_with_lines` is a
  collector, not a predicate: `boundary: false`.
- **Platform variance.** The three new test files were run under `TMPDIR=/tmp`: 13 pass, 0 fail.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| 1: Remove the placeholder literal | PASS | Verified | Contract prose reworded; the bundled copy is regenerated; `npm run bundle` prints 0 `not found` lines |
| 2: Attribute the warning | PASS | Verified | Origin carried; `seen` unchanged; `bundle:check` shows 129 skills, 0 problems |
| 3: CI reader | CONCERNS | Partial | §1a–§1d are sound; §2 depends on the zero-problem summary line (T154-QA1-2) |
| 4: Consumer-root helper | PASS | Verified | 88/84 counts unchanged; premise test red without the symlink |
| 5: Clean-checkout runner | FAIL | Verified | Works on the default path; destructive on an operator-supplied path (T154-QA1-1) |
| 6: Rule, trap, docs | PASS | Verified | create-skill ✓, observe-work ✓ (`npm run validate`) |

**Overall Phase Completion**: 4/6 phases passed.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| `npm run -s bundle` `not found` count | 0 | 0 | PASS |
| An unresolvable citation produces exactly one attributed line | 1 | 1 (§1a, §1b) | PASS |
| `consumer-root.mjs` is the only builder | yes | no `symlinkSync` in the migrated files | PASS |
| `test:clean-checkout` fails on the symlink fixture | fails | fails (fixture test) | PASS |
| `release.sh` gates on `test:clean-checkout` | yes | yes (and the header updated) | PASS |
| New test files under 10s | <10s | 5.3s / 0.23s / 1.3s | PASS |
| Clean-checkout wall time recorded | yes | 279s vs 250s in place | PASS |
| Mutation table proven | 6/6 | 6/6 (implementation report) | PASS |
| ci:fast, bundle:check, lint:shell, validate | clean | clean | PASS |

---

## Breaking Changes Validation

### Breaking Change: the release gate tests committed HEAD

Documented: Yes · Migration Path Provided: Yes (commit first; the runner warns) · Migration Tested: Yes
(the dirty-tree fixture case) · Consumer Code Updated: N/A

### Breaking Change: bundler output text gains `— cited at <file>:<line>`

Documented: Yes · No test parsed the old text · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: The clean-checkout runner deletes whatever `CLEAN_CHECKOUT_DIR` names**

- **Severity**: HIGH · **Category**: Reliability / data loss
- **Bug Report**: [task.154.bug.1.clean-checkout-dir-deletes-repo.md](./task.154.bug.1.clean-checkout-dir-deletes-repo.md)
- **Observation**: `rm -rf "$DIR"` runs before the clone and again in the `EXIT` trap, and the only
  guard is the temp-dir refusal. By-hand probe results: DIR = the repo → the repo is deleted;
  DIR = its parent → the parent is deleted; DIR = an unrelated non-empty directory → it is deleted at
  rc 0; DIR = `sub` → the clone is leaked.
- **Impact**: One mistaken export deletes a working repository, and `release.sh` now runs this script.
- **Recommendation**: Resolve DIR first. Refuse DIR == REPO, a DIR that contains REPO, and an existing
  DIR that has no marker file. Test each refusal.
- **Priority**: P1 · **Provenance**: new. The file is added by this PR.

### MEDIUM Severity Issues (1)

**Issue: bundle-missing-source §2 needs the zero-problem summary line**

- **Severity**: MEDIUM · **Category**: Test correctness
- **Bug Report**: [task.154.bug.2.missing-source-test-summary-line.md](./task.154.bug.2.missing-source-test-summary-line.md)
- **Observation**: `check_all` prints `bundle freshness: N skill(s) checked` only on the zero-problem
  path (`bundle_skill.py:1267`); on problems it prints the `❌ … problem(s)` form (`:1277`). §2's
  comment says a stale copy must not turn it red.
- **Recommendation**: Take the count from a freshness-independent source, or match both forms. Add a
  stale-copy fixture case.
- **Priority**: P2 · **Provenance**: new.

### LOW Severity Issues (1)

- CR-2 (platform-variance): the runner's temp-dir case list is a hand copy of `EPHEMERAL_PATTERNS`. It
  omits `.claude/worktrees/` and tests the literal DIR rather than the resolved path. The natural fix
  is to ask `ephemeralReason()` on the resolved DIR, which folds into the HIGH fix.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS

The clean-checkout suite takes 279s, against 250s for in-place `ci:fast`. The new tests take 5.3s,
0.23s and 1.3s.

### Reliability — FAIL

The runner makes a destructive `rm -rf` on an operator-settable path (T154-QA1-1).

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured — the six candidates were executed by hand, per §5.1, because this env-var arm
  has no engine entry form
- **Probes executed**: 6
- The input is the operator's own environment, so the risk is data loss, not privilege escalation.
  `bundle_skill.py`'s `_within` containment is unchanged by the diff.

### Maintainability — CONCERNS

CR-2, CR-4, CR-5 and CR-6 (see Code Review).

---

## Code Review

This section records Step 3b. Review was blocking via `code_review_blocking=true`: 22 files in the
diff, with the scripts, tests, bundler and helper read in full.

**Correctness bugs (4):**

- [high/high, by-hand probe] `scripts/test-clean-checkout.sh:44` — `rm -rf "$DIR"` deletes the repo,
  an ancestor, or an unrelated directory → refuse any path the runner did not create. **Promoted to
  T154-QA1-1.** The reviewer rated it CR-3 low/medium on reading; the probe measured it.
- [medium/high] `tests/bundle-missing-source.test.js:196` — the summary regex needs the zero-problem
  form, contradicting the comment → match both forms or count independently. **Promoted to
  T154-QA1-2** (CR-1).
- [low/medium] `scripts/test-clean-checkout.sh:27` — platform-variance: a hand copy of
  `EPHEMERAL_PATTERNS` without `.claude/worktrees/`, tested against the unresolved path → ask the
  engine (CR-2).
- [medium/medium, Step 4b] `skills/create-skill/SKILL.md` — `zero-blocks-executed` (1 placeholder,
  3 mutating). Pre-existing: the diff adds no fence. Advisory.

**Cleanups (3):**

- `skills/create-skill/scripts/bundle_skill.py:156` — `shared_refs_with_lines` repeats the collector
  regex (guarded by §1d) → move it to one constant (CR-4).
- `skills/create-skill/scripts/bundle_skill.py:180` — the `origin is None` branch is unreachable,
  because only quiet entries carry None → drop it or assert (CR-5).
- `evals/shared/lib/consumer-root.mjs:37` — one `exit` listener per root, and `"use strict"` is inert
  in ESM → use a single hook (CR-6).

**Mutation proofs (development-time, committed tests):**

- mutation-proven: contract literal restored → bundle-missing-source §2 → covered
- mutation-proven: unattributed print → bundle-missing-source §1a → covered
- mutation-proven: dedupe set dropped → bundle-missing-source §1b → covered
- mutation-proven: `symlinkSync` removed from `makeConsumerRoot` → consumer-root helper-root case → covered
- mutation-proven: runner `cp -R` instead of clone → test-clean-checkout (3 cases) → covered
- mutation-proven: finalise-bug-mode cwd → REPO_ROOT → `npm run test:clean-checkout` (46 red; 88/88 in place) → covered

No fix landed this cycle, so no new proof was owed.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Bundler (`tests/bundle-*.test.js`, `bundle:check`) | PASS — 129 skills, 0 problems; bundled sets unchanged |
| Migrated snippet tests | PASS — 88 and 84 tests, the same as `develop` |
| Full suite in place (`ci:fast`) | PASS — 4415 tests, 0 fail, 1 skipped |
| Full suite in a clean clone | PASS — 4415 tests, 0 fail, 1 skipped |

---

## Test Artifacts

### Files Reviewed

`scripts/test-clean-checkout.sh`, `scripts/release.sh`, `package.json`, `.gitignore`,
`evals/shared/lib/consumer-root.mjs`, `evals/shared/tests/{consumer-root,finalise-bug-mode,optional-file-lookups}.test.mjs`,
`skills/create-skill/scripts/bundle_skill.py`, `tests/{bundle-missing-source,test-clean-checkout}.test.js`,
`shared/resources/observation-log-contract.md`, `skills/create-skill/SKILL.md`, `docs/contributing/traps.md`, `CHANGELOG.md`.

### Test Commands Executed

```bash
npm run ci:fast                                   # 4415 / 0 fail / 1 skipped
npm run test:clean-checkout                       # 4415 / 0 fail / 1 skipped
TMPDIR=/tmp node --test evals/shared/tests/consumer-root.test.mjs tests/test-clean-checkout.test.js tests/bundle-missing-source.test.js   # 13 / 0
npm run validate -- skills/create-skill/          # ✓
npm run validate -- skills/observe-work/          # ✓
npm run lint:shell                                # clean
python3 skills/create-skill/scripts/bundle_skill.py --check   # 129 skills, 0 problems
node references/qa-execute-snippets.mjs --file skills/create-skill/SKILL.md --json
node references/qa-execute-snippets.mjs --file shared/resources/observation-log-contract.md --json
# by-hand probe: env -i PATH=… HOME=<scratch> CLEAN_CHECKOUT_DIR=<candidate> CLEAN_CHECKOUT_CMD=true bash scripts/test-clean-checkout.sh
```

### Coverage Report

No coverage instrumentation in this repository. Coverage is asserted by mutation proofs (above).

---

## Recommendations

### Immediate Actions (Blocking)

1. T154-QA1-1: make the runner refuse to delete what it did not create (P1).
2. T154-QA1-2: make §2 depend only on the missing-source warning and the floor (P2).

### Short-term Actions (Non-Blocking)

1. CR-2: ask `ephemeralReason()` instead of keeping a second pattern list. This fits into fix 1.
2. CR-4, CR-5, CR-6: the cleanups.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: The runner is destructive on an operator-settable path (HIGH, reproduced), and a test
contradicts its own documented tolerance (MEDIUM).
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED

---

**QA Report**: co-located at `task.154.qa.1.bundler-and-snippet-test-hygiene.md`
**Gate File**: co-located at `task.154.gate.1.bundler-and-snippet-test-hygiene.yml`
**Next Steps**: `/qa-fix` cycle 1 → re-review (cycle 2, refute pass).
