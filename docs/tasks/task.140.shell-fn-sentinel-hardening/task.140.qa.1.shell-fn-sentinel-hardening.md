# QA Report: Task 140 - Harden the shell-fn: sentinels and the fake-gh coverage

**Task**: [Link to task document](./task.140.shell-fn-sentinel-hardening.md)
**Gate File**: [task.140.gate.1.shell-fn-sentinel-hardening.yml](./task.140.gate.1.shell-fn-sentinel-hardening.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-30
**Testing Completed**: 2026-09-30
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR #527 at `30fbfa13`. All four phases are implemented as planned and every shape the success criteria name declines as specified; the task.136 green path still engages 20/20. The diff review found one regression the new harness body introduced — a library that replaces the EXIT trap and then fails under `set -e` is now scored on bash 5 and zsh — and one containment site (`--fake-gh`) left lexical after entry containment moved to real paths.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL — CR-1 and CR-2 fixed and re-reviewed

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (17/17 plan items checked)
- [x] Tests passing
- [x] Breaking changes documented (two tightenings, §5)
- [x] Code on feature branch with open PR (#527, OPEN)

### Testing Approach

- [x] Automated Testing (unit, contract, lint lanes)
- [x] Performance Testing (wall-clock against the branch point)
- [x] Regression Testing
- [x] Security Review (boundary probe executed)
- [x] Code Review (diff review, Explore subagent)

### Review Methodology

Standard mode, first review — direct tools plus one read-only Explore subagent for the diff code review (`code-review-prompt.md` verbatim over the whole `origin/develop...HEAD` diff, bundled copies excluded; 12 files, 1,180 lines). The traceability matrix from the pipeline's mapper (`.summaries/qa-traceability-matrix.md`) was consumed. Step 4b: 1 fenced bash block in the changed prose (`probe-boundary-rule.md:414`, outside this diff), refused `mutating` (write-redirection) → `no-executable-blocks`, recorded as information.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: the red rows | PASS | Verified | 5 rows; the implementation report records each red against the base engine for its stated reason |
| Phase 2: the body and the gates | CONCERNS | Partial | Body, gate, detector, dead clause and realpath all present; CR-1 (trap + errexit) and CR-2 (fake-gh containment) |
| Phase 3: the lint lanes | PASS | Verified | Identical block in both lanes; parity test 2/2; `lint:shell` 78 files, clean |
| Phase 4: rule, bundle, CHANGELOG | PASS | Verified | §5 updated; `bundle:check` 0; CHANGELOG [Unreleased] › Fixed |

**Overall Phase Completion**: 3/4 PASS, 1 CONCERNS

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Notes |
| --- | --- | --- | --- | --- |
| Own EXIT trap / `set -e` top-level failure decline, executed 0, bash + zsh | both shapes | both shapes as written in §9 | PASS | but the **combination** (own trap + errexit) is scored — CR-1 |
| `shell:` names gh → needs-fake-gh; `gh;` `gh>` `"$GH"` one-level source | all detected | all detected | PASS | quoted/backslashed gh and non-line-initial source missed — CR-3 (low) |
| Symlink refused `outside-repo-root` | refused | refused (3 entry forms); probe: `symlink-escape` refused, reproduced at base | PASS | `--fake-gh` containment still lexical — CR-2 |
| task.136 green path; pre-existing rows | engages 20/20; all green | engages 20/20; 100/100 + 5 new | PASS | |
| Wall-clock within noise | ≈ branch point | 63.1 s vs 63.0 s | PASS | task's "~30 s" had decayed |
| Mutation proofs; ci:fast / bundle:check / Prettier; lint:shell counts the fixture | all | 9 dev mutants; QA re-ran M2, M6 → covered; all green; 78 files | PASS | |
| Lanes byte-equivalent in one commit; rule once; CHANGELOG | yes | `2a8891cb` changes both; parity test; §5 once | PASS | |

---

## Breaking Changes Validation

### Breaking Change: a `shell:` script naming `gh` without `--fake-gh` now declines
Documented: Yes · Migration Path Provided: Yes (pass `--fake-gh <dir>`) · Migration Tested: Yes (the c3-CR-2 row runs the same script with the fixture) · Consumer Code Updated: N/A — no prompt names the old behaviour

### Breaking Change: two library shapes read `entry-not-probeable` instead of `absent`
Documented: Yes · Migration Path Provided: N/A (a truer verdict) · Consumer Code Updated: N/A

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### MEDIUM Severity Issues (2)

**Issue: A library that installs its own EXIT trap and then fails under `set -e` is scored (CR-1)**
- **Severity**: MEDIUM · **Category**: Reliability · **Priority**: P1
- **Bug Report**: [task.140.bug.1.library-trap-plus-errexit-scored.md](./task.140.bug.1.library-trap-plus-errexit-scored.md)
- **Observation**: errexit ends the shell without calling the shadowed `exit`, and the library's trap has replaced the harness's. Measured, base → branch: `f(){…}; trap true EXIT; set -e; false` → 97 → **1** on bash 5.3 and zsh 5.9 (a regression); `trap true EXIT; set -e; false; f(){…}` → 0 → 1.
- **Recommendation**: shadow `trap` during the source; rows for both orderings.

**Issue: `--fake-gh` containment is still lexical (CR-2)**
- **Severity**: MEDIUM · **Category**: Security · **Priority**: P2
- **Bug Report**: [task.140.bug.2.fake-gh-containment-still-lexical.md](./task.140.bug.2.fake-gh-containment-still-lexical.md)
- **Observation**: the reviewer's temp-root run accepted a symlinked fake-gh dir pointing outside the root (executed 28). Identical at base; attributed to this change because the diff made the engine's stated invariant ("same containment as an entry") false.
- **Recommendation**: `realpathSafe` on both sides at the check; realpath the root inside `namesGh` (CR-6).

### LOW Severity Issues (1)

- **CR-3** — `namesGh` misses a quoted or backslashed `gh` and a `source` that is not line-initial (`[ -f x ] && source x`, `set -e; source x`). In `top_issues[]` as low (high confidence; the source-follow is new code).

**Total Issues**: HIGH: 0, MEDIUM: 2, LOW: 1

---

## NFR Assessment

### Performance — PASS
`security-probe.test.mjs` 63.1 s on the branch vs 63.0 s on an untouched worktree at the branch point.

### Reliability — CONCERNS
CR-1.

### Security — CONCERNS

- **Status**: CONCERNS
- **Evidence**: measured
- **Probes executed**: 21 (copied from `task.140.qa.1.security.run.json` `totals.executed`)
- Boundary: `resolveEntry`, through the task.136 wrapper (`.claude/state/t140-probe-wrapper.mjs#containsShellFnEntry`) over its 21 `shell-fn:` path/name cases, with a **real** `uploads/link-to-etc → /etc` present in the repo for the run (created, then removed). Branch: `present-but-inert`, reproduced `["shellfn.encoded-traversal"]`. Base (`origin/develop`, same wrapper and symlink): reproduced `["shellfn.encoded-traversal","shellfn.symlink-escape"]`. The symlink escape is closed; `encoded-traversal` is identical at base and is a literal `%2f` filename inside the root, not a traversal → pre-existing, `recommendations.future`.
- `namesGh` is a predicate whose `true` stops a run; no corpus sink models "shell text that names a CLI", so it is covered by the committed rows (6 positive shapes, 3 negatives) rather than a probe. CR-3 records the shapes those rows do not cover.
- CONCERNS for CR-2.

### Maintainability — PASS
Rule, engine header and code moved together; the twin lanes are held by a parity test; each change mutation-proved.

---

## Code Review

Advisory by default; the pipeline passed `code_review_blocking=true`, so `bug` + `high` confidence findings are in the gate (CR-1, CR-2, CR-3).

**Correctness bugs (5):**
- [medium/high] `shared/resources/security-probe.mjs:653` — shadowed `exit` does not cover errexit under a library-installed EXIT trap → shadow `trap` during the source (**CR-1**, gate)
- [medium/high] `shared/resources/security-probe.mjs:441` — `--fake-gh` containment still lexical → real-path it (**CR-2**, gate)
- [low/high] `shared/resources/security-probe.mjs:548` — quoted/backslashed gh and non-line-initial `source` not detected (**CR-3**, gate)
- [low/medium] `scripts/lint-shell.sh:49` — enumeration: `.githooks/pre-commit` is a tracked extensionless bash script neither lane lints (CR-4, advisory → future)
- [low/low] `shared/resources/tests/security-probe.test.mjs:1860` — platform-variance: the symlink row assumes `os.tmpdir()` is outside `REPO_ROOT` (CR-5, advisory → future)

**Cleanups (1):**
- `shared/resources/security-probe.mjs:573` — `namesGh` does not realpath its own `root`, so a lexical symlinked root makes every candidate fail `isWithin` (CR-6; folded into CR-2's fix)

**Provenance (Step 3b.5b):** CR-1 measured on base and branch (table above) — new. CR-2 identical at base — attributed by judgement, stated in the bug report. CR-3 — the quote/backslash half is identical at base; the source-follow half is new code.

mutation-proven: M2 (`src=$?` → `|| exit 97`) → "set -e library whose top-level command fails" → covered
mutation-proven: M6 (drop `realpathSafe` on the entry) → "resolveEntry: a symlink inside the root …" → covered

---

## Regression Testing

| Area | Result |
| --- | --- |
| `security-probe.test.mjs` (all 100 pre-existing rows) | PASS |
| `tests/gh-labels.test.js` (consumer) | PASS 19/19 |
| `probe-boundary-signals.test.mjs` (site parity) | PASS |
| `lint-shell-absent-binary.test.mjs` (lane on a stubbed PATH) | PASS |
| `npm run validate -- skills/{finalise,qa-story,qa-task,review-security}/` (bundled copies changed) | PASS ×4 |

---

## Test Artifacts

### Files Reviewed
`shared/resources/security-probe.mjs`, `shared/resources/tests/security-probe.test.mjs`, `scripts/lint-shell.sh`, `.github/workflows/shellcheck.yml`, `evals/shared/tests/lint-lane-fixture-parity.test.mjs`, `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`.

### Test Commands Executed
```bash
command node --test shared/resources/tests/security-probe.test.mjs evals/shared/tests/lint-lane-fixture-parity.test.mjs evals/shared/tests/lint-shell-absent-binary.test.mjs shared/resources/tests/probe-boundary-signals.test.mjs   # 121/121
command node --test tests/gh-labels.test.js                                                      # 19/19
npm run validate -- skills/<s>/     # finalise, qa-story, qa-task, review-security — all ✓
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file shared/resources/probe-boundary-rule.md --json
command node shared/resources/security-probe.mjs --sink path --entry '.claude/state/t140-probe-wrapper.mjs#containsShellFnEntry' --cases-file .claude/state/t136-probe-cases.json --repo-root "$(pwd)" --record docs/tasks/task.140.shell-fn-sentinel-hardening/task.140.qa.1.security.run.json --json
```

### Coverage Report
Not instrumented (node:test, no coverage tool configured for `shared/resources`).

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1 / TASK-140-BUG-1 — P1
2. CR-2 / TASK-140-BUG-2 — P2
3. CR-3 — low; cheap to take with CR-2's detector edits

### Short-term Actions (Non-Blocking)
1. CR-4 — lint `.githooks/pre-commit` or name the exclusion
2. CR-5 — assert the symlink row's outside directory is outside the root

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: two medium findings with high confidence enter `top_issues[]` under `code_review_blocking`; no HIGH.
**Quality Score**: 80/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 and CR-2 fixed and re-reviewed

---

**QA Report**: co-located at `task.140.qa.1.shell-fn-sentinel-hardening.md`
**Gate File**: co-located at `task.140.gate.1.shell-fn-sentinel-hardening.yml`
**Next Steps**: `/qa-fix` (cycle 1)
