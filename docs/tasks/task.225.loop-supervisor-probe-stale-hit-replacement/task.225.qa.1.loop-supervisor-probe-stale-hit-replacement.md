# QA Report: Task 225 - loop-supervisor: find a replacement probe script after a stale hit

**Task**: [task.225.loop-supervisor-probe-stale-hit-replacement.md](./task.225.loop-supervisor-probe-stale-hit-replacement.md)
**Gate File**: [task.225.gate.1.loop-supervisor-probe-stale-hit-replacement.yml](./task.225.gate.1.loop-supervisor-probe-stale-hit-replacement.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-31
**Testing Completed**: 2026-10-31
**Gate Status**: PASS

---

## Executive Summary

QA cycle 1 (first review) of PR #798 at `159f41a3`. `resolvesAsMain` now resolves a stale `require.resolve` hit again in a fresh `node` process, so a probe script replaced in another shape reads as present. Every success criterion except SC7's CI half is test-backed. Both mutation proofs reached `covered`. The diff review returned two low findings, both advisory.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (2/2, 9/9 boxes)
- [x] Tests passing
- [x] Breaking changes documented (none)
- [x] Code on feature branch with open PR (#798, OPEN)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Adaptive strategy override: lite mode — direct tools only. Step 3b ran as one read-only Explore subagent over the branch diff without `docs/` (192-line patch; dispatched 07:02:49Z, returned in 44.7 s per its `duration_ms`).

Tests and mutations ran in a detached scratch worktree at `HEAD`. That worktree has no gitignored `.agents/skills` symlink, the same tree CI checks out. The worktree was removed afterwards.

CI on 159f41a35ac4: pending

Step 4b: not applicable — no runnable prose in the change set (no `SKILL.md` or `shared/resources/*.md` changed).

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The fallback | PASS | Verified | `resolveInFreshNode` at `adapters.js:403`; stale-hit branch at `adapters.js:391`; doc comment; `resolvesAsMain` exported at `adapters.js:459` |
| Phase 2: Tests and changelog | PASS | Verified | Two swap tests, the spawn-count test, the CHANGELOG `### Fixed` entry |

**Overall Phase Completion**: 2/2 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| SC1 file → directory | `probeMissing` null after swap | null | PASS | test "probeMissing finds a replacement after a stale hit: file → directory" |
| SC2 directory → file | null after reverse swap | null | PASS | test "…: directory → file" |
| SC3 stale, no replacement | reason starts `probe script not found:` | as specified | PASS | last step of both swap tests |
| SC4 controls unchanged | agreement cases + QA-3 pair pass | pass | PASS | suite: 255 pass, 0 fail |
| SC5 spawn only on a stale hit | 0 / 0 / 1 calls | 0 / 0 / 1 | PASS | test "resolvesAsMain spawns a fresh resolve only on a stale hit"; one-`exists`-call test unchanged |
| SC6 mutation-proven | swap tests red under `return false` | red | PASS | M1 below |
| SC7 suite local + CI; validate | pass | local pass; validate pass; CI pending | PARTIAL | CI is gated at `/finalise`; this cycle read it once (pending) |
| SC8 CHANGELOG | `[Unreleased]` cites task 225 | `### Fixed` entry | PASS | `CHANGELOG.md:69` |

---

## Breaking Changes Validation

None. `resolvesAsMain` gains an optional second parameter and is newly exported. `probeMissing` is unchanged.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2)

- **CR-1** (bug, low/medium confidence): `resolveInFreshNode` returns null both when the path does not resolve and when the child could not run (spawn failure, timeout). Both read as "probe script not found". Before this change every stale hit read as not found, so a spawn failure falls back to the old answer. Routed to `recommendations.future`.
- **CR-2** (cleanup): after one swap, every later probe of that path spawns, because the stale cache entry is never replaced. The task accepts this cost (§ 10, risk 2). Routed to `recommendations.future`.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2

---

## NFR Assessment

### Performance — PASS

A live hit and a miss spawn nothing. A stale hit costs one `node` start (about 30 ms). See CR-2.

### Reliability — PASS

The child has a 10 s timeout. Any failure reads as missing, which is the pre-change answer (CR-1).

### Security — PASS

- **Status**: PASS
- **Evidence**: measured
- **Probes executed**: 8
- `boundary: true`. `resolvesAsMain` is now an exported predicate that returns a verdict, and its `false` stops the probe from running. Engine run: `security-probe.mjs --entry 'skills/loop-supervisor/references/adapters.js#resolvesAsMain' --cases-file task.225.qa.1.security.cases.json`. Result: 6 hostile cases rejected (missing, `$(…)`, backticks, option-shaped, NUL byte, empty), 2 legitimate cases accepted. Verdict `engages`, `escaped: 0`. Record: `task.225.qa.1.security.run.json`.
- The engine's child process has no stale hit, so it cannot reach the new spawn. That path was probed by hand, which does not count toward `probes_executed`. For four hostile file names, the test created the file, resolved it, deleted it, and called `resolvesAsMain` again, which ran the real `resolveInFreshNode`. The names were command substitution, backticks, `;` separators and `--require=…`. Each stale call returned `false`, each re-created file returned `true`, and no marker file was written. The spawn uses no shell, and `probeMissing` passes an absolute path.

### Maintainability — PASS

The change is small. The doc comment records why a fresh process is needed: `Module._pathCache` does not drop the stale hit on Node v26.8.2.

---

## Code Review

Advisory under `code_review_blocking=true`, because neither finding is a high-confidence bug.

**Correctness bugs (1):**

- [low/medium] `skills/loop-supervisor/references/adapters.js:391` — two distinguishable states (the path does not resolve; the child could not run) reach one `null`, so a spawn failure is reported as "probe script not found" → separate `MODULE_NOT_FOUND` from a spawn or timeout error and report the second as its own probe error.

**Cleanups (1):**

- `skills/loop-supervisor/references/adapters.js:385` — the stale cache entry is never replaced, so after one swap every later probe spawns → remember the last fresh-resolved path, or document the repeat.

Anchors: both `ok` (`finding-anchors.js --rev HEAD`).

Mutation proofs (scratch worktree, `cp` snapshot and restore, baseline green between):

- mutation-proven: `return freshResolve(file) !== null;` → `return false;` → both swap tests and the spawn-count test red (63 pass / 3 fail) → covered
- mutation-proven: live hit also calls `freshResolve` → "resolvesAsMain spawns a fresh resolve only on a stale hit" red (65 pass / 1 fail) → covered

2 of 2 mutations covered.

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor unit suite (all files) | PASS — 256 tests, 255 pass, 0 fail, 1 skipped (opt-in live-network case, pre-existing) |
| task.224 agreement cases, QA-3 pair, one-`exists`-call test | PASS, unchanged |
| tmp-leak ratchet prefixes `ls-replace-`, `ls-spawn-` | 0 entries left in `/tmp` after the runs |

---

## Test Artifacts

### Files Reviewed

- `skills/loop-supervisor/references/adapters.js`
- `evals/loop-supervisor/unit/adapters.test.mjs`
- `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test 'evals/loop-supervisor/unit/*.test.mjs'          # in a worktree at HEAD
command node --test --test-name-pattern='replacement after a stale hit|spawns a fresh resolve' evals/loop-supervisor/unit/adapters.test.mjs
npm run validate -- skills/loop-supervisor/                            # pass
command node .agents/skills/qa-task/references/security-probe.mjs --entry 'skills/loop-supervisor/references/adapters.js#resolvesAsMain' \
  --cases-file docs/tasks/task.225.loop-supervisor-probe-stale-hit-replacement/task.225.qa.1.security.cases.json \
  --repo-root "$(git rev-parse --show-toplevel)" --record docs/tasks/task.225.loop-supervisor-probe-stale-hit-replacement/task.225.qa.1.security.run.json --json
bash .agents/skills/qa-task/references/qa-ci-read.sh --vcs github --pr 798
```

### Coverage Report

Not measured (the repository's `node --test` suites do not collect coverage).

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: distinguish "could not run the child" from "does not resolve".
2. CR-2: avoid the repeated spawn after a swap, or document it.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All criteria verifiable at this cycle hold, each test-backed and mutation-proven. No high or medium finding.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: none (CI on the final commit is read at `/finalise`)

---

**QA Report**: co-located at `task.225.qa.1.loop-supervisor-probe-stale-hit-replacement.md`
**Gate File**: co-located at `task.225.gate.1.loop-supervisor-probe-stale-hit-replacement.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise`.
