# QA Report: Task 280 - Skill and test tooling see what ships

**Task**: [Link to task document](./task.280.skill-and-test-tooling-see-what-ships.md)
**Gate File**: [task.280.gate.1.skill-and-test-tooling-see-what-ships.yml](./task.280.gate.1.skill-and-test-tooling-see-what-ships.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-11-18
**Testing Completed**: 2026-11-18
**Gate Status**: CONCERNS

---

## Executive Summary

First review of PR 919 at head 56444d372. The three checks work and each has a mutation proof. One reproduced bug in the new bundler discovery (sentence-final punctuation) holds the gate at CONCERNS.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL on fixing T280-CR-1

---

## Testing Scope

### Review Methodology

Direct tools plus one read-only Explore reviewer for the diff. Diff review: code review (the change set holds code). Step 4b: the engine ran on `skills/create-skill/SKILL.md`; the change touched 0 of its blocks (changed: total 0), and the file-level result was `zero-blocks-executed` (1 placeholder, 3 mutating), recorded and not attributable to this change.

CI_SUMMARY: not read by `qa-ci-read.sh` this cycle; the server gate (8587 tests, 0 failed) stands in, and `/finalise` reads CI once on the final commit.

The reviewer returned all five findings with wrong line numbers (`finding-anchors` reported `text-mismatch` for three and `out-of-range` for two); the real lines were found by search and are given below.

---

## New Findings This Cycle

Not a re-review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: quote lint and fence balance | PASS | 62/62 across the four relevant files | `fenceProblems` shares one walk with `extractBlocks`; 193 files, none unbalanced |
| Phase 2: one reader and ratchet | PASS | ratchet 3/3 | 2 migrated, 17 allowlisted, 3 comment-only; table below |
| Phase 3: bundle discovery | CONCERNS | bundle-check-mode 49/49 | CR-1 below |
| Phase 4 | dropped | n/a | already on develop |
| Phase 5: bundle and sweep | PASS | `bundle -- --check` clean | ten parallel runs exit 0 |

**Overall Phase Completion**: 4/4 live phases implemented; Phase 3 has one open bug.

### Migration table (Phase 2)

`git grep` population at head: 22 test files held a fence regex literal.

| Disposition | Count | Files |
| --- | --- | --- |
| Migrated to `extractBlocks` | 2 | halt-fence, worktree-root-coverage |
| Allowlisted with a reason | 17 | create-bug-report-bug-reports-heading, create-task-authoring-evidence, deferred-work-placement, doc-id-chokepoint, doc-link-branch-sites-execute, ensure-bug-label-tolerance, fenced-bash-optional-file-globs, gh-labels, identity-rule-probe, key-lookup-single-statement, qa-cycle, qa-fix-structural-move, qa-read-back-block, qa-results-step12-wiring, restricted-access-docs, unbound-default-reads, untrusted-content-rule |
| Comment-only match, no reader | 3 | epic-numbering-retirement, json-output-fidelity, qa-results-corpus |

Final allowlist size: 17.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status |
| --- | --- | --- | --- |
| Each check fails on its defect and passes its control | named tests | `tests/fence-balance.test.js` (unclosed, stray, nested control), `tests/unbound-default-reads.test.js` quote-lint fixture (shown failing `bash -n`), `tests/fence-reader-ratchet.test.js` detector fixture, `tests/bundle-check-mode.test.js` (vendoring, UNVENDORED, controls) | PASS |
| No unbalanced fence in the repository | 0 | 0 of 193 | PASS |
| `bundle:check` fails on the task.238 shape | test recreates it | the vendoring test reports MISSING before the bundle and is clean after | PASS |
| `CI=true npm test` wall time within 10% of develop | 5 alternating runs | method not followed; new tests add about 0.5 s of a 757.9 s suite (0.07%) | PASS on the bound, method deviation stated |
| Each check has a mutation proof | recorded | see below | PASS |
| `bundle -- --check` 0 problems; npm test passes | 0 / pass | 0 problems; 8587 tests, 0 failed on the server | PASS |
| Ten parallel runs of the two racing files | exit 0 | 20 runs, all 0, no ENOENT | PASS |
| No un-allowlisted fence reader remains | ratchet passes | passes; table above | PASS |

---

## Breaking Changes Validation

None. `bundle:check` gains a finding class (`UNVENDORED`); the real tree reports none.

---

## Issues Found

### MEDIUM Severity Issues (1)

**T280-CR-1 — trailing sentence dot captured**
- **Severity**: MEDIUM; reviewer confidence high; origin: code-review, reproduced by QA.
- **Reproduction**: a fixture skill whose own `references/own.md` says "Then run .agents/skills/fx/references/helper.sh." with `helper.sh` in `shared/resources`. `skill_owned_invocations` returned `('references/own.md', 'helper.sh.')`; the control ("… helper.sh and stop.") returned `helper.sh`. The script is then not vendored.
- **Provenance**: the function is new in this PR, so not pre-existing.
- **Location**: `skills/create-skill/scripts/bundle_skill.py:620` (the reviewer cited `:158`, an anchor that did not match).
- **Recommendation**: strip trailing sentence punctuation from the captured name; add a test with the dotted form and its control.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 0 (the other findings are advisory, below).

---

## NFR Assessment

### Performance — PASS
Suite 757.9 s on the server, new tests about 0.5 s.

### Reliability — PASS
Ten parallel runs of the two racing files: 20 exits of 0, no ENOENT.

Command, re-run by `/finalise` on 2026-11-18 at head `50b002fa1` because the original record omitted it (20 background jobs, one `wait`; logs scanned for ENOENT; result: 20 exits of 0, 0 logs with ENOENT):

```text
for i in 1..10: CI=true command node --test tests/bundle-comment-origin.test.js &
                CI=true command node --test shared/resources/tests/security-probe.test.mjs &
wait
```

### Security — PASS
- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0 (boundary: false; no accept-or-reject boundary: the helpers are lints and discovery whose result fails a test)
- Candidates named: `fenceProblems`, `quotedGuardWords`, `holdsFenceRegex`, `skill_owned_invocations`. Criteria boundary signals: none.

### Maintainability — PASS
One fence walk; `extractBlocks` output unchanged over 4834 tracked markdown files (reviewer comparison).

---

## Code Review

Reviewer anchors were wrong in all five findings; real lines are given.

**Correctness bugs (4):**
- [medium/high] `skills/create-skill/scripts/bundle_skill.py:620` ⚠️ unverified anchor (text-mismatch, reviewer wrote :158) — sentence-final invocation captures `helper.sh.` → strip trailing punctuation. **Promoted to the gate as T280-CR-1 (reproduced by QA).**
- [low/medium] `skills/create-skill/scripts/bundle_skill.py:1256` ⚠️ unverified anchor (text-mismatch, reviewer wrote :1255) — an invocation-form mention of a missing file fails as UNVENDORED, and a bundle run cannot clear it → restrict to an invocation shape. Advisory, not reproduced.
- [low/medium] `skills/create-skill/scripts/bundle_skill.py:614` ⚠️ unverified anchor (text-mismatch, reviewer wrote :152) — a nested doc whose bare name equals a shared file is treated as generated → top-level only. Advisory, not reproduced.
- [low/medium] `tests/fence-reader-ratchet.test.js:35` ⚠️ unverified anchor (out-of-range, reviewer wrote :509) — the detector misses a slash inside a character class and a `new RegExp` reader → make it class-aware and flag `new RegExp`. Advisory.

**Cleanups (1):**
- `tests/unbound-default-reads.test.js:205` ⚠️ unverified anchor (out-of-range, reviewer wrote :673) — the quote lint flags any quote in a guard word, not only an unbalanced one → balance check, or say so in the comment.

mutation-proven: `fenceProblems` open-fence push disabled → `tests/fence-balance.test.js` (3 tests red) → covered
mutation-proven: `skill_owned_invocations` edge in `discover_needed` disabled → `tests/bundle-check-mode.test.js` vendoring test → covered
mutation-proven: quote regex matched against `Z` → `tests/unbound-default-reads.test.js` quote-lint fixture test → covered
mutation-proven: ratchet stale entry and unlisted reader (during development) → `tests/fence-reader-ratchet.test.js` both tests → dev-only

Three files were restored from a `cp` snapshot (`cmp` printed nothing) and the baseline of four test files was 62 of 62 green before this report was written.

---

## Regression Testing

Full suite on the server: 8587 tests, 8584 pass, 0 fail, 3 skipped. `relationship-assertion-lint` regression from the first gate run was fixed in `tests/fence-balance.test.js`.

---

## Test Artifacts

### Test Commands Executed
```bash
CI=true npm run test:remote
CI=true command node --test tests/fence-balance.test.js tests/bundle-check-mode.test.js tests/unbound-default-reads.test.js tests/fence-reader-ratchet.test.js
npm run validate -- skills/create-skill/
command node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/create-skill/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
```

`npm run validate -- skills/create-skill/` passed. Other standards-named commands: no skill other than `create-skill` changed outside regenerated copies.

---

## Recommendations

### Immediate Actions (Blocking)
1. Fix T280-CR-1.

### Short-term Actions (Non-Blocking)
1. Consider CR-2 to CR-5 above.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: one reproduced medium bug in new code; all success criteria otherwise evidenced.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: fix T280-CR-1.

---

**QA Report**: co-located at `task.280.qa.1.skill-and-test-tooling-see-what-ships.md`
**Gate File**: co-located at `task.280.gate.1.skill-and-test-tooling-see-what-ships.yml`
**Next Steps**: qa-fix cycle for T280-CR-1, then re-review.
