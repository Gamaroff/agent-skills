# QA Report: Task 108 - The bundler copies depth-relative links verbatim, so every bundled references/ file carries broken links

**Task**: [Link to task document](./task.108.bundler-rewrites-relative-links.md)
**Gate File**: [task.108.gate.2.bundler-rewrites-relative-links.yml](./task.108.gate.2.bundler-rewrites-relative-links.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-12
**Testing Completed**: 2026-09-12
**Gate Status**: PASS (one low-severity entry in `top_issues` — routes a fix cycle)

---

## Executive Summary

Re-review after qa-fix cycle 1 (`1d18e0e3`). All eight cycle-1 findings are fixed; CR-1's fail-closed behaviour is covered by a new test that goes red when the `ok` check is reverted. The cycle-2 **refute pass** (whole-branch diff, 16 files, reviewed to find the false claim rather than confirm the fix) surfaced one latent, high-confidence, low-severity bug — the bundled-sibling branch mis-relativises when the shared source lives in a subdirectory, a case the corpus does not contain today — plus two medium-confidence edge observations and two hygiene items. No medium or high finding: gate **PASS**; C2-CR-1 enters `top_issues` under `code_review_blocking` so the pipeline fixes it before the PR review.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (5/5)
- [x] Tests passing (`npm run ci:fast` 3,200/0 on `1d18e0e3`; CI on PR #396 pending at review time, green on the prior head)
- [x] Breaking changes documented
- [x] Code on feature branch with open PR (#396, OPEN, head `1d18e0e3`)

### Testing Approach

- [x] Automated Testing (unit, integration)
- [x] Regression Testing
- [x] Security Review (reasoned)
- [x] Code Review (refute pass)

### Review Methodology

Direct tools + one read-only Explore subagent in **refute mode** (cycle 2 rule: whole branch diff, not narrowed to the fixes; directive to find the false claim, with the four lifecycle transitions and the combination of fixes named). QA additionally probed the two memoisation concerns (`_skill_dirs` lru_cache; `bundleCheck` memo) before dispatch. Step 4b: not applicable (no `SKILL.md` / `shared/resources/*.md` in the diff).

Re-review scope: unscoped (cycle-2 refute pass — whole `origin/develop...HEAD` diff, 16 files)

### Re-Review Context

| Cycle-1 finding | Status | Evidence |
| --- | --- | --- |
| CR-1 `isFreshBundledCopy` fails open | FIXED | `ok && !problems.has(rel)`; `bundled-parity.test.mjs` "fails CLOSED" case; reverting the check turns it red |
| CR-2 root-absolute target twin disagreement | FIXED | both `is_external_target` and `isExternal` treat leading `/` as external; asserted in both test files |
| CR-3 `decodeURIComponent` throw | FIXED | `decodeURIComponentSafe` + test |
| CR-4 fixture cleanup | FIXED | `t.after(rmSync)` in `makeFixture` |
| CR-5 double corpus scan | FIXED | `scanned()` memo |
| CR-6 repo-root walk per file | FIXED | `_skill_dirs()` lru_cache |
| CR-7 import placement | FIXED | moved into the import block |
| CR-8 comment overstated parity | FIXED | reworded to state the precondition |

---

## New Findings This Cycle

- **[low/high]** `skills/create-skill/scripts/bundle_skill.py:276` — bundled-sibling branch joins the references-relative name onto `dst_dir` instead of the `references/` root; for a nested shared source `y.md` → `sub/y.md` (→ `references/sub/sub/y.md`) and `../x.md` → `x.md`. Probed and reproduced. Latent (the only nested shared `.md` today is a test fixture README, never bundled). → relpath from the references root; add a nested-source test. **Gated as C2-CR-1.**
- **[low/medium]** `evals/shared/lib/bundled-parity.mjs:100` — `ok` folds `problems.size`, so a stale *unrelated* sibling de-allowlists a fresh copy with a message that points at the MCP rule, not the stale file. Conservative direction, misleading message. → expose a `ran` flag. Advisory.
- **[low/medium]** `bundle_skill.py:274` — a link resolving to the skill directory itself (`../../skills/s/`) fails `startswith(skill_dir + '/')` and becomes an upstream URL. Probed. Edge case; no such link exists. Advisory.
- Cleanups: `execFileSync("rm")` vs `fs.rmSync` in the new eval test; a duplicated comment at the decode call site.
- QA probe (informational, not a finding): `bundleCheck` memoises per skill for the process lifetime, so a tamper *after* a first check in the same process is not seen. Documented in the helper; no caller mutates a real skill mid-run, and every test fixture directory is unique.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: measure | PASS | Verified | unchanged since cycle 1 |
| Phase 2: rewrite in the bundler | PASS | Verified | bundle still a no-op; `--check --all` 0 problems after CR-2/CR-6 |
| Phase 3: guard + audit note | PASS | Verified | new eval test picked up by the `evals/shared/tests/*.test.mjs` glob; not gitignored |

**Overall Phase Completion**: 3/3

---

## Success Criteria Verification

All six criteria re-verified unchanged from cycle 1 (checker 0 broken over 606 files; idempotent bundle; zips clean; under `npm test`; mutation proofs; audit note). Additional: `ci:fast` 3,201 tests / 3,200 pass / 0 fail on the fix commit.

---

## Breaking Changes Validation

Unchanged — PASS.

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (3)

C2-CR-1 (gated), C2-CR-2, C2-CR-3 — see New Findings This Cycle.

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 3

---

## NFR Assessment

### Performance — PASS
### Reliability — PASS
### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
### Maintainability — PASS

(Details in the gate file notes.)

---

## Code Review

**Correctness bugs (3):**
- [low/high] `skills/create-skill/scripts/bundle_skill.py:276` — nested-source bundled sibling mis-relativised → relpath from references root. **Promoted to gate as C2-CR-1.**
- [low/medium] `evals/shared/lib/bundled-parity.mjs:100` — `ok` conflates could-not-run with sibling-stale → `ran` flag.
- [low/medium] `skills/create-skill/scripts/bundle_skill.py:274` — skill-dir self-link becomes upstream → treat `resolved == skill_dir` as inside.

**Cleanups (2):**
- `evals/shared/tests/bundled-parity.test.mjs:37` — `fs.rmSync` instead of `execFileSync("rm")`.
- `tests/bundled-links.test.js:92` — drop the duplicated comment.

**Mutation-proven (Step 3c):** cycle-1 CR-1 fix — yes (reverting the `ok` check → red).

---

## Regression Testing

| Area | Result |
| --- | --- |
| Affected suites (bundler ×5, eval parity ×3) | 131/131 |
| `npm run ci:fast` on `1d18e0e3` | 3,200 pass / 0 fail |
| `bundle --check --all` | 126 skills, 0 problems |
| Second `npm run bundle` | no-op |

---

## Test Artifacts

### Test Commands Executed
```bash
node --test evals/shared/tests/bundled-parity.test.mjs tests/bundled-links.test.js tests/bundle-link-rewrite.test.js evals/shared/tests/finalise-dod-prompt-contract.test.mjs evals/shared/tests/transition-protocol-parity.test.mjs tests/bundle-*.test.js
npm run ci:fast
python3 skills/create-skill/scripts/bundle_skill.py --check --all
python3 -c 'from bundle_skill import _relocate_target as r; ...'   # C2-CR-1 / C2-CR-3 probes
```

---

## Recommendations

### Immediate Actions (routed to qa-fix by the gate entry)
1. C2-CR-1 — references-root relpath + nested-source test.

### Short-term Actions (Non-Blocking)
1. C2-CR-2, C2-CR-3, C2-CR-4, C2-CR-5.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every cycle-1 finding verified fixed; the refute pass found only low-severity, latent or edge issues.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.108.qa.2.bundler-rewrites-relative-links.md`
**Gate File**: co-located at `task.108.gate.2.bundler-rewrites-relative-links.yml`
**Next Steps**: `/qa-fix` on gate 2 (C2-CR-1); then the PR conformance review (5c).
