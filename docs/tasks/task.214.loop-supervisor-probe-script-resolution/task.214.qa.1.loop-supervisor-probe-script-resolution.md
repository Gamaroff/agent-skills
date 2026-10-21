# QA Report: Task 214 - loop-supervisor: find select-next.mjs wherever the skills are installed

**Task**: [Link to task document](./task.214.loop-supervisor-probe-script-resolution.md)
**Gate File**: [task.214.gate.1.loop-supervisor-probe-script-resolution.yml](./task.214.gate.1.loop-supervisor-probe-script-resolution.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-21
**Testing Completed**: 2026-10-21
**Gate Status**: PASS

---

## Executive Summary

The `develop-next` and `develop-batch` adapters now find `select-next.mjs` under `.agents/skills`, then `.claude/skills`, then `skills`, and fall back to `skills/` when none exists. A configured override still wins.

Results:
- Both phases are verified, and every success criterion is held by a committed test or by the `validate` run.
- The adapters suite passes 43/43.
- The diff review returned one low/medium bug and one cleanup, both advisory.
- Three of four mutations went red; the fourth is an equivalent mutant.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and is complete (status `ready-for-review`).
- [x] Both implementation phases are complete (7/7 checkboxes).
- [x] Tests pass.
- [x] Breaking changes: the task documents none.
- [x] The code is on `feature/task.214.loop-supervisor-probe-script-resolution`, with PR #722 open.

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools. This is a small task (2 phases, one module, low risk) and the first review. The pipeline passed `code_review_blocking=true`, and the task has no frontmatter opt-out, so `CR_BLOCKING=true`.

- **Diff review:** one read-only Explore subagent over the whole branch diff (`origin/develop...HEAD`, 902 lines). It was dispatched at 18:24:18Z and returned in 42.2 s (`duration_ms` 42198).
- **Mutation proofs:** run in a detached scratch worktree, never the live tree. The worktree has no `.agents/skills` symlink, so they ran CI-shaped. `git status --porcelain` showed the same state before and after.
- **Step 4b:** not applicable. The change set has no runnable prose, because no `SKILL.md` or `shared/resources/*.md` changed.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The resolver | PASS | Verified | `PROBE_SCRIPT_CANDIDATES`, `firstExisting` with an injectable `exists`, `defaultProbe: true` on both adapters, and `resolveAdapter(name, config, { cwd })` with the search before the override loop (`adapters.js`). |
| Phase 2: Wire-up, tests, docs | PASS | Verified | `run-loop.mjs:1105` passes `{ cwd }`. 14 new tests. The existing override test uses a temp `cwd`. One sentence each was added to the README and `docs/reference/configuration.md`. |

**Overall Phase Completion**: 2/2 phases passed

---

## Success Criteria Verification

Each criterion is verified from a test or a command, not from its checkbox.

**Functional Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| `.agents/skills` alone → that path | `adapters.test.mjs`: the "each candidate alone" tests, for both adapters | PASS |
| `.claude/skills` or `skills` alone → each selected | the same tests | PASS |
| None present → the `skills/…` default, and today's probe error | the "none present" tests; `adapters.js:238` falls back to the last candidate | PASS |
| An override is returned verbatim | the "override while all three exist" test | PASS |

**Performance Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| At most three `exists` calls | the call-count test: 3 on a miss, 1 on a first hit | PASS |

**Code Quality Criteria:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| The loop-supervisor suites pass with no reliance on the symlink | `node --test 'evals/loop-supervisor/**/*.test.mjs'`: 231 tests, 230 pass, 0 fail. The same suite passes in a symlink-free worktree (mutation baseline 0 fail). | PASS |
| `npm run validate -- skills/loop-supervisor/` | `✓ loop-supervisor`, exit 0 | PASS |

**Migration:**

| Criterion | Evidence | Status |
| --- | --- | --- |
| Two documentation sentences state the order and that an override wins | `skills/loop-supervisor/README.md`, `docs/reference/configuration.md:301` | PASS |

---

## Breaking Changes Validation

None documented, and none found. `resolveAdapter`'s third argument is optional. In this repository, the newly selected `.agents/skills/…` path is the same file as before, reached through the symlink.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (2, both advisory, listed under Code Review)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 2 (advisory)

---

## NFR Assessment

### Performance — PASS

At most three `existsSync` calls per resolution, pinned by the call-count test.

### Reliability — PASS

A miss falls back to the previous default, so the failure mode is unchanged, and an override still wins. The shared `ADAPTERS` table is not mutated (tested).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `firstExisting` chooses one of three fixed relative paths under the caller's `cwd`. No input crosses a trust boundary, and a configured `probeScript` was already trusted before this change.

### Maintainability — PASS

The change is small and documented. One cleanup (CR-2) is advisory.

---

## Code Review

The findings are advisory: neither is a `category: bug` with `confidence: high`, so nothing was promoted to the gate. Both anchors checked `ok`.

**Correctness bugs (1):**

- [low/medium] `skills/loop-supervisor/references/adapters.js:238`. `firstExisting` returns `skills/…` in two cases: when that file exists, and when no candidate exists. A consumer with no selector therefore still sees the old "probe produced no output" error. → Report the not-found case separately. This contradicts the explicit success criterion "the probe error is the one produced today", so it is routed to `recommendations.future` as its own task rather than fixed here.

**Cleanups (1):**

- `skills/loop-supervisor/references/adapters.js:256`: the table `probeScript` literal repeats the last candidate (also at `:275`). → Derive it from the `"skills/" + SELECT_NEXT` constant.

**Boundary rule:** `boundary: false`, so `probes_executed: 0`. These are the predicate-shaped functions the diff adds:

| Function | What it does | Why it is not a boundary |
| --- | --- | --- |
| `firstExisting` (`adapters.js`) | Selects a path | Its "no match" outcome is a fallback, not a refusal. Nothing is prevented when it returns the last candidate. |
| `resolveAdapter` | Merges configuration | It accepts and rejects nothing new. Its unknown-adapter refusal is unchanged by this diff. |

**Platform variance:** not applicable. The resolution reads `cwd`, not an environment-derived temp path. The tests use `mkdtemp` directories only as fixtures for `existsSync`, with no containment check.

**Mutation proofs** (scratch worktree, CI-shaped; baseline green between each):

```
mutation-proven: search disabled (`if (false && merged.defaultProbe)`) → 5 adapters tests red → covered
mutation-proven: firstExisting skips the existence check (`return c`) → 8 adapters tests red → covered
mutation-proven: fallback is the first candidate, not the last → 2 adapters tests red ("none present") → covered
mutation-proven: run-loop main drops `{ cwd }` → nothing red → no-red-dead (main binds cwd = process.cwd(), which is resolveAdapter's own default; an equivalent mutant today)
```

Three of four are `covered`. The fourth is an equivalent mutant, so it does not indicate a coverage gap. The develop step's four proofs (candidate order, override ordering, loop-past-hit, search removed) also went red.

---

## Regression Testing

| Area | Result |
| --- | --- |
| loop-supervisor suites (`run-loop`, `engines`, `dashboard`, `adapters`) | PASS: 231 tests, 0 fail |
| Full fast gate (develop Step 3, CI-shaped, `npm run ci:fast`) | PASS: 6171 tests, 0 fail |
| `ADAPTERS["develop-next"].probeArgs` table test | PASS: the table literal is kept as the fallback |

---

## Test Artifacts

### Files Reviewed

- `skills/loop-supervisor/references/adapters.js`
- `skills/loop-supervisor/scripts/run-loop.mjs`
- `evals/loop-supervisor/unit/adapters.test.mjs`
- `skills/loop-supervisor/README.md`, `docs/reference/configuration.md`, `CHANGELOG.md`

### Test Commands Executed

```bash
command node --test evals/loop-supervisor/unit/adapters.test.mjs        # 43/43
command node --test 'evals/loop-supervisor/**/*.test.mjs'               # 231 tests, 0 fail
npm run validate -- skills/loop-supervisor/                             # ✓, exit 0
bash scratchpad/qa-mutate.sh                                            # 4 mutations in a detached worktree
```

### Coverage Report

Not measured. The repository's `node --test` runs collect no coverage. Coverage is argued per criterion above, and by the mutation proofs.

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. CR-1: a distinct "selector not found" error, as its own task, because it changes a stated criterion.
2. CR-2: derive the fallback literal from the constant.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by a committed test or by the validate command. Both mutation sets went red where they should have. Neither code-review finding is a high-confidence bug.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED
**Conditions**: None. CI `test` was pending at review time (`870f6519`); `/finalise` gates CI on the final commit.

---

**QA Report**: co-located at `task.214.qa.1.loop-supervisor-probe-script-resolution.md`
**Gate File**: co-located at `task.214.gate.1.loop-supervisor-probe-script-resolution.yml`
**Next Steps**: Step 5c `/review-pr`, then `/finalise`.
