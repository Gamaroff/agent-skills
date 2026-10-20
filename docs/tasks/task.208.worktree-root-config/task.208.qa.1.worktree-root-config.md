# QA Report: Task 208 - Worktrees live inside the repo under a configurable root

**Task**: [Link to task document](./task.208.worktree-root-config.md)
**Gate File**: [task.208.gate.1.worktree-root-config.yml](./task.208.gate.1.worktree-root-config.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-14
**Testing Completed**: 2026-10-14
**Gate Status**: CONCERNS

---

## Executive Summary

Retroactive QA of PR #657, which merged before the develop pipeline ran. The change does what the task
says, every new test guard goes red when its fix is reverted, and the suite, evals, bundle check and
validation are green. The security probe found one real gap: a symlinked worktree root still puts
worktrees outside the repository (TASK-208-BUG-1).

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — fix TASK-208-BUG-1

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5 ticked)
- [x] Tests passing (CI `test` green on the PR head; see Test Artifacts for the local run)
- [x] Breaking changes documented (§5: worktree location moves; no consumer config change needed)
- [ ] Code on feature branch with open PR — PR #657 is **merged**; reviewed against its merge diff

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, protocol, full suite)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (probe executed)
- [x] Code Review

### Review Methodology

Direct tools, with one parallel reviewer. Default strategy: 5 phases across several modules, not high
risk.

- **Scope:** merge commit `65bb2b0f` against its first parent, excluding the 11 generated
  `*/references/*` copies. First review — no prior gate.
- **Step 3b code review** reused the `/review-pr` code lens dispatched minutes earlier on the
  identical patch with the identical shared prompt (`code-review-prompt.md`). It was not dispatched a
  second time; the reuse is recorded here so the loss of a second independent pass is visible.
  Reviewer times: not measured.
- **Code review blocking:** treated as `true`, the run-level override the develop-task pipeline sets,
  because this QA stands in for the pipeline step that was skipped.
- **Step 4b:** run (runnable prose in the change set). See Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: Selector | CONCERNS | Verified | Symlinked root accepted (TASK-208-BUG-1); NUL accepted (low) |
| Phase 2: develop-batch | PASS | Verified | Step 0.3a ignore check, stale glob, `--worktree-root` all present; protocol tests pin them |
| Phase 3: create-parallel-stories and runbooks | PASS | Verified | No `../worktrees/` remains; cleanup depth issue is PR review CR-2 (advisory) |
| Phase 4: Discovery | PASS | Verified | `.gitignore`, copy filter, grep/find exclusions all checked by execution |
| Phase 5: Docs and close-out | PASS | Verified | `configuration.md` row and schema line present; CHANGELOG entries present |

**Overall Phase Completion**: 5/5 delivered, 1 with a finding.

---

## Success Criteria Verification

| Criterion | Evidence | Status |
| --- | --- | --- |
| No shipped skill, script or runbook creates a worktree outside the repository | `grep` for `worktree add …../` and `../(tc-)wt-`/`../worktrees/` across `skills/`, `shared/`, `scripts/`, runbooks: no hits (story 4.4's accepted plan excluded by design). Symlinked roots excepted — see criterion 3 | PASS (text) |
| `developBatch.worktreeRoot` documented, default `.worktrees` | `docs/reference/configuration.md` row + schema line; `skills/develop-batch/SKILL.md` config table; test `worktreeRoot must appear in both` | PASS |
| The selector refuses a root that leaves the repository | `13b: normaliseWorktreeRoot accepts repo-relative roots and refuses escapes` holds `..` and absolute; **symlinked root accepted** (probe + git reproduction) | **CONCERNS** — TASK-208-BUG-1 |
| `develop-batch`'s stale check matches the selector's paths, enforced by a test | `evals/develop-batch/protocol/skill-shape.test.mjs` ties the glob to the exported prefix and root | PASS |
| `/.worktrees/` ignored; develop-batch ignores the root before creating a worktree | `.gitignore:25`; SKILL Step 0.3a `git check-ignore` then `info/exclude` | PASS |
| Root-wide searches and copies skip `.worktrees/` | Executed against a fixture: traceability `grep -rl` blocks, co-location `find` commands, `--copy`/`--copy-as` (QA-18b) | PASS |
| `npm test`, evals, `bundle:check` pass | CI `test` SUCCESS; local: evals 199 + 76 pass, bundle clean, suite 5467/5471 with the 4 worktree-only failures (obs #39), which pass 55/55 in the main checkout at the same commit | PASS |

---

## Breaking Changes Validation

### Breaking Change: worktrees move from beside the checkout to `<repo>/.worktrees/`
Documented: Yes
Migration Path Provided: Yes — old sibling worktrees are left alone; `git worktree list` finds them
Migration Tested: No — no consumer with sibling worktrees to migrate
Consumer Code Updated: N/A
Notes: develop-batch now ignores the root itself, so a consumer without `/.worktrees/` in `.gitignore` is not left with a dirty tree.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: A symlinked worktree root puts worktrees outside the repository**
- **Severity**: MEDIUM
- **Category**: Security
- **Bug Report**: [task.208.bug.1.symlinked-worktree-root-escapes-repo.md](./task.208.bug.1.symlinked-worktree-root-escapes-repo.md)
- **Observation**: `normaliseWorktreeRoot(".wt")` accepts a `.wt` that links to `/tmp/outside`; `git worktree add .wt/batch-x` lands at `/tmp/outside/batch-x`
- **Impact**: the failure mode task 208 removes, reachable by configuration
- **Recommendation**: real-path containment check in develop-batch Step 0.3a
- **Priority**: P2

### LOW Severity Issues (1)

- **NUL in the root is accepted** (`path.null-byte`). Node refuses NUL in argv, so it fails loudly
  later rather than escaping; reject control characters at the source.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 1

---

## NFR Assessment

### Performance — PASS
No hot path changed. The copy filter adds one `lstat` and, for a `.git` file, one small read per entry.

### Reliability — PASS
A refused root exits 1 with a message and sets `exitCode` rather than calling `process.exit()`
(bug.3). develop-batch ignores the root before creating worktrees, so the next run does not stop on
its own worktrees.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 11 (`task.208.qa.1.security.run.json`, `totals.executed`)
- Path sink against `select-next.mjs#normaliseWorktreeRoot`: 8 rejected or legitimately accepted as
  expected; 3 hostile accepted:
  - `path.symlink-escape` — real: reproduced with git (TASK-208-BUG-1).
  - `path.null-byte` — low: no escape, Node refuses NUL in argv.
  - `path.encoded-traversal` — inert: the root is never URL-decoded, so `..%2f..` is a literal folder
    name inside the repo. Recorded, not promoted.

### Maintainability — PASS
The prefix and default root are exported once and the SKILL's glob is tested against them, so the
`../tc-wt-` / `../wt-` drift cannot recur silently.

---

## Code Review

Advisory findings from the shared reviewer (PR review lens A), plus the probe findings. Blocking was
treated as `true`; only `category: bug` + `confidence: high` entries reach the gate.

**Correctness bugs (4):**
- [medium/high] `skills/develop-next/scripts/select-next.mjs:53` — symlinked root accepted → real-path check in develop-batch Step 0.3a. Promoted: QA-208-1.
- [low/high] `skills/develop-next/scripts/select-next.mjs:53` — NUL accepted → reject control characters. Promoted: QA-208-2.
- [low/medium] `skills/develop-next/scripts/select-next.mjs:1608` — the standalone `develop-next --batch` path has no gitignore check and its docs omit `--worktree-root` → document both, or warn on stderr. Advisory.
- [low/medium] `skills/create-parallel-stories/SKILL.md:268` — cleanup returns with a fixed `cd ../..`, wrong for a multi-segment root → return by variable, or require one segment. Advisory.

**Cleanups (0)**

**Boundary rule:** `boundary: true` — `normaliseWorktreeRoot` refuses inputs. Probe executed, 11 cases.
`isLinkedWorktree` / `skipNestedWorktrees` are classifiers over the filesystem with no string input a
sink models; their behaviour is held by `QA-18b` against real nested worktrees and a submodule.

**Mutation proofs** (run in a scratch worktree, tree clean after):
- mutation-proven: `worktreeFor` → `../tc-wt-${slug}` → `13b: --batch worktrees default to .worktrees/batch-<slug>, inside the repo` (+2 more) → covered
- mutation-proven: drop the `..` refusal → `13b: normaliseWorktreeRoot accepts repo-relative roots and refuses escapes` → covered
- mutation-proven: drop the `--copy` filter → `QA-18b: --copy and --copy-as skip a nested linked worktree but keep the rest` → covered
- mutation-proven: drop the `--copy-as` filter → same test → covered

**Step 4b — documented commands:**
- `skills/develop-batch/SKILL.md`, `skills/create-parallel-stories/SKILL.md`, `skills/develop-next/SKILL.md`: 0 runnable, all mutating (`git worktree`, `gh`) — `no-executable-blocks`, nothing to configure.
- `skills/railway-postgres-crud/SKILL.md`: 2 runnable, 0 findings.
- `shared/resources/qa-traceability-mapper-prompt.md`: 2 blocks are template slots (`{keyword1}`), which `--bind` cannot fill. Run **by hand** with the slots substituted, against a fixture holding `src/`, `.worktrees/batch-x/src/` and `node_modules/`: each block returned only `./src/…`. bash only — zsh is not installed on this host.
- `skills/test-co-location-enforcer/SKILL.md`: its `find` commands are not in bash fences; run by hand against a fixture: `.worktrees/` pruned, `__tests__` under `src/` found. Both commands still list `node_modules/` — unchanged from before this PR (pre-existing, out of scope).

---

## Regression Testing

| Area | Result |
| --- | --- |
| develop-next selection (`eval:develop-next`) | PASS — 199 |
| develop-batch protocol and schedule (`eval:develop-batch`) | PASS — 76 |
| qa-execute-snippets copy behaviour | PASS — QA-18b plus existing copy tests |
| Bundled copies | PASS — `bundle:check` 0 problems |
| Skill validation (12 changed skills) | PASS — `npm run validate` exit 0 each |

---

## Test Artifacts

### Files Reviewed
`skills/develop-next/scripts/select-next.mjs`, `skills/develop-batch/SKILL.md`,
`skills/create-parallel-stories/SKILL.md`, `shared/resources/qa-execute-snippets.mjs`,
`shared/resources/qa-traceability-mapper-prompt.md`, `skills/test-co-location-enforcer/SKILL.md`,
`skills/railway-postgres-crud/SKILL.md`, `docs/reference/configuration.md`, `.gitignore`, the two
runbooks and the four changed test files.

### Test Commands Executed
```bash
npm test                                   # 5485 tests: 5467 pass, 4 fail (obs #39, worktree-only), 14 skipped/todo
node --test shared/resources/tests/observation-log.test.mjs   # main checkout, same commit: 55/55
npm run eval:develop-next                  # 199 pass
npm run eval:develop-batch                 # 76 pass
npm run bundle:check                       # 0 problems
npm run validate -- skills/<skill>/        # 12 changed skills, each exit 0
node skills/qa-task/references/security-probe.mjs --sink path \
  --entry 'skills/develop-next/scripts/select-next.mjs#normaliseWorktreeRoot' \
  --record docs/tasks/task.208.worktree-root-config/task.208.qa.1.security.run.json --json
node shared/resources/qa-execute-snippets.mjs --file <changed SKILL.md> --json
```

### Coverage Report
Not measured — the repository has no coverage tooling for `node --test`.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix TASK-208-BUG-1: refuse a worktree root whose real path is outside the repository.

### Short-term Actions (Non-Blocking)
1. Reject control characters in the root (QA-208-2).
2. Document `--worktree-root` and the gitignore requirement on `develop-next --batch` (PR review CR-1).
3. Return by variable in create-parallel-stories cleanup (PR review CR-2).

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: One medium finding against success criterion 3, measured and reproduced; everything else verified by execution.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: TASK-208-BUG-1 fixed

---

**QA Report**: co-located at `task.208.qa.1.worktree-root-config.md`
**Gate File**: co-located at `task.208.gate.1.worktree-root-config.yml`
**Next Steps**: `/qa-fix` for QA-208-1 and QA-208-2, then re-review.
