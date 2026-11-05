# QA Report: Task 250 - Security-probe tests write no scratch files into the repository

**Task**: [Link to task document](./task.250.security-probe-scratch-out-of-tree.md)
**Gate File**: [task.250.gate.1.security-probe-scratch-out-of-tree.yml](./task.250.gate.1.security-probe-scratch-out-of-tree.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-02
**Testing Completed**: 2026-11-02
**Gate Status**: CONCERNS

---

## Executive Summary

All 13 in-tree write sites are converted to temp roots, and a watched run sees no in-tree creates (61 before). Each existing test keeps its name, and the suite passes 276/276 with no runtime change. The gate is CONCERNS for one reproduced defect in the new guard: its stale-allowlist check matches its own string literal, so it can never fail (CR-1). One low finding covers temp roots that can leak on a throw before `try` (CR-4).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL (fix CR-1)

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists, status `ready-for-review`
- [x] All five implementation phases ticked
- [x] Tests passing (suite 276/276; `npm run ci:fast` 7113 pass, 0 fail)
- [x] Breaking changes: none (test-only change)
- [x] Code on `feature/task.250.security-probe-scratch-out-of-tree`, PR #813 open

### Review Methodology

Direct tools, with one Explore subagent for the Step 3b diff code review (single pass, first review). A traceability matrix from the pipeline's mapper was used as the criteria checklist (`.summaries/qa-traceability-matrix.md`). Reviewer dispatched 2026-11-02T18:25Z; returned in 174536 ms (from its completion notice).

CI on 1a4750a2c7a5: pending

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed).

Standards-named validation: `npm run validate -- skills/<changed-skill>/` is not run because no skill changed. `npm run format:check`: clean. `npm run lint:shell`: not applicable, as no `.sh` file is touched.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| ----- | ------ | ----------- | ----- |
| Phase 1: Guard first, red | CONCERNS | Verified | Guard red on the base file and on a one-site mutation. Its stale-allowlist half is vacuous (CR-1) |
| Phase 2: Helper and simple sites | PASS | Verified | `fenceRoot` takes `copy` and `{text, mode}` files and refuses an in-repo root |
| Phase 3: `t140Libs` and its callers | PASS | Verified | Returns `{ root, dir }`; `if-source.sh` / `quiet.sh` source the root's copy |
| Phase 4: Three containment tests | PASS | Verified | Premise controls fail under the wrong root (below) |
| Phase 5: Green and recorded | PASS | Verified | This report records the evidence |

**Overall Phase Completion**: 5/5 (1 with a finding)

---

## Success Criteria Verification

| # | Criterion | Evidence | Status |
| - | --------- | -------- | ------ |
| 1 | No test creates a file, directory or symlink under `REPO_ROOT` | Guard test green (static half); `fenceRoot` refuses an in-repo root (runtime half, shown with `TMPDIR` set inside the repo). Watched run: `inotifywait -m -r -e create,moved_to shared/resources/tests tests/fixtures` during a full run → **0 events** after (`.claude/state/t250/watch-after.txt`), **61** before (`watch-before.txt`). One allowlisted in-tree call remains, a `rmSync` that creates nothing | PASS |
| 2 | Every test keeps its name and assertions | No `test(` name removed in the diff; 2 tests added (the guard and its calibration). Per-test table below. One assertion was **strengthened**, not changed: the `--fake-gh` escape row now also asserts the detail `is outside` | PASS |
| 3 | Containment tests fail when their root is wrong | Premise controls below: each fails with `REPO_ROOT` substituted for its temp root | PASS |
| 4 | Suite runtime alone grows ≤ 10% | Interleaved base/head ×3 in two worktrees, load 1.6–2.0: base 32.41 / 31.47 / 31.60 s (median 31.60), head 32.49 / 31.58 / 31.39 s (median 31.58). **0%**. Command: `uptime; command node --test shared/resources/tests/security-probe.test.mjs`. Log: `.claude/state/t250/timing-qa1.txt`. The develop-time runs (33.16 vs 31.48 s) had different load and are superseded | PASS |
| 5 | No temp roots left behind | `npm run ci:fast` → `tmp-leak: ratchet ok` (no new or over-count prefix). On a throw before `try`, some roots can leak (CR-4) | PASS (CR-4 noted) |
| 6 | One root builder | `fenceRoot` (generalised); `t140Libs` wraps it. No third builder | PASS |
| 7 | `format:check` and `npm test` pass | `format:check` clean; `ci:fast` (the suite plus the tmp-leak ratchet) 7113 pass, 0 fail | PASS |
| 8 | Guard red before the change and on a one-site mutation | Before: the first run listed all 12 sites, plus BUG-12's cleanup and the `__pycache__` call. Mutation: one `mkdtempSync(join(REPO_ROOT, …))` added back → guard red, then reverted | PASS |
| 9 | CHANGELOG `[Unreleased]` cites task 250 | `changelog-cites.sh` → `cites (task 250)` | PASS |

`criteria-drift.js`: clean (base: review commit). Criteria boundary signals: none.

### Converted tests: root and premise, before → after

| Test (site) | Before | After |
| ----------- | ------ | ----- |
| BUG-7 own 126/127 (`.t128-launch-`) | dir under `REPO_ROOT`, engine root `REPO_ROOT` | `fenceRoot` with `exits-127.sh` (0o755); `repoRoot: root` |
| CR-3 errored-all (`.t128-errall-`) | same | `fenceRoot` with `writes-then-hangs.sh`; `repoRoot: root` |
| obs #73 leaky/clean (`.obs73-`) | same | `fenceRoot` with both scripts; record written in root |
| BUG-12 writes-home-tmp-self (`PWNED-self`) | fixture in tree, target wrote beside it | fixture copied into `fenceRoot`; `repoRoot: root`; the in-tree cleanup is gone |
| task.131 mutant (`.t131-mutant-`) | copies under `shared/resources/tests/` | copies of `report-lint.js`, `change-log.js` and the template under `root/shared/resources`; `repoRoot: root` |
| task.136 ×4 (`.t136-source/-collide/-toplevel-exit/-errexit`) | dir under `tests/fixtures/shell-fn/` | `t140Libs("t136-…")`; entries relative to root; `repoRoot: root` |
| `t140Libs` callers (own-trap, errexit-src, shell-gh, gh-shapes+gh-clean, trap-errexit+int-trap, gh-more, trap-shapes, gh-runtime+gh-quiet, gh-escape, gh-env-i, gh-abs, gh-prepend) | `tests/fixtures/shell-fn/.t140-*` | root with `FN_LIB` and `FAKE_GH` copied in; `repoRoot: root`; `namesGh(…, root)`; "root via symlink" links to `root` |
| `.t140-symlink-` containment | scratch dir in tree; premise "outside ∉ REPO_ROOT" | scratch dir in R; premise "outside ∉ R"; `resolveEntry(e, R)` |
| `.t140-fakegh-` containment | same shape | R with `FN_LIB` and `FAKE_GH`; in-tree link targets R's copy; asserts `is outside` |
| `.t140-missing-` containment | same shape | scratch dir in R; escape row checked against R |

### Premise controls (criterion 3)

| Test | Mutation | Result |
| ---- | -------- | ------ |
| symlink containment | `resolveEntry(e, REPO_ROOT)` instead of R | red (`actual: true`) |
| `--fake-gh` containment | `repoRoot: REPO_ROOT` on the escape row only | at first **green**: `bad-fake-gh` is also returned for a path that does not resolve. After the detail assertion was added: red (`expected: /is outside/`) |
| missing-path containment | escape row checked against `REPO_ROOT` | red (`actual: undefined`, `expected: 'outside-repo-root'`) |

All three were mutated in a `cp` snapshot and restored. The tree was unchanged afterwards.

---

## Breaking Changes Validation

None. This change touches only tests, `.gitignore` and `CHANGELOG.md`. The removed `.gitignore` rule ignored only leftovers, which nothing writes any more.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: The stale-allowlist check is vacuous (TASK-250-CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality
- **Observation**: `t250InTreeWrites` scans the file's whole source, including string literals. The `T250_ALLOWED` key `'rmSync(join(REPO_ROOT, FIXTURES, "__pycache__"), …)'` (line 8102) is itself matched as a write call. So `found.some(… === key)` is always true for every key, and the "stale entry" assertion cannot fail.
- **Reproduced**: snapshot the file; change line 2992's target to `join(tmpdir(), "t250-cr1-mutant")`; run `node --test --test-name-pattern "task.250: no write"`. Result: `pass 1, fail 0`. The guard should have been red with a stale-entry message. Restored from the snapshot.
- **Impact**: a stale allowlist entry stays forever. Worse, any write call quoted in a string literal can satisfy the scan. The calibration test hid this only because its sample was built at run time.
- **Recommendation**: skip string and template literal contents when matching call names (or build the key at run time), and add a calibration row that must not count a call inside a string literal. Then mutation-prove the stale check.
- **Priority**: P2

No bug file was created: the finding is in the gate's `top_issues[]` and goes to `/qa-fix` in this loop.

### LOW Severity Issues (1)

- **TASK-250-CR-4**: a throw before `try` can leak a temp root. `t140Libs` writes after `fenceRoot()` with no cleanup of its own. `fenceRoot`'s `cpSync` runs after `mkdtempSync`. The symlink, fakegh and missing rows create scratch dirs before `try`, and gh-abs and gh-prepend create `outside` before `try`. The passing path leaks nothing (ratchet ok).

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
Interleaved runs under similar load: medians 31.60 s (base) vs 31.58 s (head). The limit is +10%.

### Reliability — CONCERNS
CR-4: cleanup on a throw before `try` is incomplete. No leak on the passing path.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- **Boundary**: false. The change is test-only and the engine is unchanged. The predicate-shaped functions added are `t250InTreeWrites` (input: this file's own source) and `fenceRoot`'s inside-repo refusal (input: its own `mkdtempSync` result). Neither takes external input, and no corpus sink models them.
- The containment tests still exercise the engine's real checks, now against temp roots, and each fails under the wrong root.

### Maintainability — PASS
One root builder. The `.gitignore` rule that hid killed-run leftovers is gone, so a regression now shows up in `git status`.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true`, run-level override).

**Correctness bugs (4):**
- [medium/high] `shared/resources/tests/security-probe.test.mjs:8122`: the stale-allowlist check self-matches the key literal and can never fail. Fix: skip string literals or build the key at run time. **Promoted: TASK-250-CR-1**, reproduced above.
- [low/medium] `shared/resources/tests/security-probe.test.mjs:8088`: the guard flags only a path starting `join(REPO_ROOT` or `REPO_ROOT`, and `T250_WRITE_ARG` omits `appendFileSync`, `copyFileSync`, `linkSync`, `openSync` and others. A future `resolve(REPO_ROOT, …)` or template-literal write would pass. Fix: widen the match and the call list. Advisory, routed to `recommendations.future`.
- [low/medium] `shared/resources/tests/security-probe.test.mjs:1007`: the BUG-12 row would still pass if the engine resolved the entry against `REPO_ROOT`, because the fixture exists in both places. Fix: assert the escape path is under `root` and that the in-tree `PWNED-self` is absent. Advisory, routed to `recommendations.future`.
- [low/high] `shared/resources/tests/security-probe.test.mjs:1832`: temp roots can leak on a throw before `try`. Fix: try/rethrow cleanup in `fenceRoot`/`t140Libs`, and move pre-`try` creates inside `try`. **Promoted: TASK-250-CR-4** (low).

**Cleanups (0).**

All four anchors check `ok` (`finding-anchors.js`).

mutation-proven: one `mkdtempSync(join(REPO_ROOT, …))` added back → "task.250: no write call … from REPO_ROOT" → covered
mutation-proven: real `__pycache__` call removed → "task.250: no write call … from REPO_ROOT" (stale check) → no-red-untested (CR-1)
mutation-proven: symlink containment given `REPO_ROOT` → that test → covered
mutation-proven: `--fake-gh` escape row given `REPO_ROOT` → that test → covered (after the `is outside` assertion; absorbed before it)
mutation-proven: missing-path escape row given `REPO_ROOT` → that test → covered

---

## Regression Testing

| Area | Result |
| ---- | ------ |
| `security-probe.test.mjs` alone | 276/276 |
| Full fast gate (`npm run ci:fast`) | 7113 pass, 0 fail, 14 skipped; tmp-leak ratchet ok |
| `tests/bundle-comment-origin.test.js` (the #145 reader) | passes within `ci:fast` |

---

## Test Artifacts

### Files Reviewed
- `shared/resources/tests/security-probe.test.mjs`
- `shared/resources/security-probe.mjs` (read only: `repoRoot`, `fakeGh`, `namesGh` resolution)
- `.gitignore`, `CHANGELOG.md`

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs
npm run ci:fast
npm run format:check
inotifywait -m -r -e create,moved_to --format '%w%f' shared/resources/tests tests/fixtures
command node --test --test-name-pattern "task.250: no write" shared/resources/tests/security-probe.test.mjs
bash .agents/skills/qa-task/references/changelog-cites.sh task.250
command node .agents/skills/qa-task/references/criteria-drift.js --doc <task> --base-from-review develop --json
command node .agents/skills/qa-task/references/probe-boundary-signals.mjs --doc <task> --json
```

### Coverage Report
Not applicable: the change set is test code and the suite reports no coverage.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix TASK-250-CR-1 and mutation-prove the stale check (P2).

### Short-term Actions (Non-Blocking)
1. TASK-250-CR-4: cleanup on a throw before `try`.
2. CR-2: widen the guard's write-call list and path match.
3. CR-3: tighten the BUG-12 row's escape assertion.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One reproduced medium defect in the new guard. Every success criterion is met.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-250-CR-1 fixed and re-gated.

---

**QA Report**: co-located at `task.250.qa.1.security-probe-scratch-out-of-tree.md`
**Gate File**: co-located at `task.250.gate.1.security-probe-scratch-out-of-tree.yml`
**Next Steps**: `/qa-fix` for CR-1 (and CR-4), then QA cycle 2.
