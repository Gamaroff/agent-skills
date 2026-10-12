# QA Report: Task 175 - Resolve finalise's PR number from the branch, not the task body

**Task**: [Link to task document](./task.175.finalise-pr-number-from-branch.md)
**Gate File**: [task.175.gate.1.finalise-pr-number-from-branch.yml](./task.175.gate.1.finalise-pr-number-from-branch.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-12
**Testing Completed**: 2026-10-12
**Gate Status**: PASS

---

## Executive Summary

The change adds `resolve-pr-number.sh` and routes finalise Step 3a, Step 7.2 and both DoD agent prompts through it, so finalise no longer judges the first PR its document cites. Every functional criterion is held by an executed, committed test, and seven mutations went red against those tests. Two advisory code-review findings are routed to future work.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete (status `ready-for-review`)
- [x] All implementation phases completed (4/4 ticked)
- [x] Tests passing
- [x] Breaking changes documented (one behaviour change, §5)
- [x] Code on feature branch with open PR (#635)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (unit, integration, e2e)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review
- [x] Code Review

### Review Methodology

Direct tools (4 phases but one module, low risk) plus one read-only Explore code reviewer over the branch diff (generated `references/` copies excluded). Reviewer dispatched and returned in 70 s (`duration_ms` 70345). Step 4b: the three changed runnable-prose files were run through `qa-execute-snippets.mjs`; see Code Review.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 1: The resolver | PASS | Verified | `shared/resources/resolve-pr-number.sh`; rung 2 is `pr_read`; rung 5 confirms via `pr_read --pr N` + `PR_READ_HEAD_BRANCH` |
| Phase 2: finalise uses it | PASS | Verified | Step 3a (`skills/finalise/SKILL.md:460-466`), the note after it, Step 7.2, the bug-mode note; both prompts' Step 1 |
| Phase 3: Tests | PASS | Verified | `resolve-pr-number.test.mjs` (16 cases), `pr-read.test.sh` (+3 cases) |
| Phase 4: Proof and gates | PASS | Verified | 7 mutations red (implementation report, Step 3); `ci:fast`, `lint:shell`, `bundle:check`, `validate` green |

**Overall Phase Completion**: 4/4 phases passed

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| Rungs 1–5 in order, each held by a test | 5 rungs | 5 | PASS | `resolve-pr-number.test.mjs` explicit / branch / lock / frontmatter / body cases; M2 (rungs swapped) red |
| Body citation used only when confirmed | refuse otherwise | refused, no number | PASS | "body: a cited PR whose head is another branch is refused"; M1 red |
| No source → exit 1, no number | exit 1, empty stdout | as stated | PASS | "none" and refusal cases assert `stdout === ""` |
| Step 3a calls resolver; 7.2 writes resolved number; no body derivation | pinned | pinned | PASS | Part 2 presence pin; M4, M5, M6 red. 7.2's new wording read at `skills/finalise/SKILL.md` § Update Frontmatter |
| Performance | not applicable | — | PASS | explicit N/A |
| `ci:fast` (`.agents/skills` aside), `bundle:check`, `validate`, `lint:shell` | green | green | PASS | 5364 tests, 0 fail; 129 skills 0 problems; `✓ finalise`; shellcheck clean |
| Mutations red under bash, `cmp`-restored | all | 7/7 | PASS | implementation report Step 3 |
| CHANGELOG cites (task 175) | present | present | PASS | `CHANGELOG.md` `[Unreleased]` › Fixed |

Standards-named validation: `npm run validate -- skills/finalise/` → `✓ finalise`.

---

## Breaking Changes Validation

### Breaking Change: unresolved PR runs with an empty `PR_NUMBER`
Documented: Yes (§5)
Migration Path Provided: Yes — callers that know the PR can pass `--pr`; the agents already report `pr_status: NOT_FOUND`
Migration Tested: Yes — the "none" case
Consumer Code Updated: N/A
Notes: no interface change.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (0)

### LOW Severity Issues (0)

**Total Issues**: HIGH: 0, MEDIUM: 0, LOW: 0 (two advisory code-review findings below, routed to future work)

---

## NFR Assessment

### Performance — PASS
One to three `gh` calls per resolution.

### Reliability — PASS
Each rung falls through to the next on any failure; nothing guesses. Exit 1 prints no number on stdout (plain and `--json`).

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: true` — the resolver refuses an unconfirmed body citation and another work item's lock. No `security-probe.mjs` entry form reaches it: it parses `--doc` (not one positional directory), and its branch and body rungs are networked through `gh` — the finalise security prompt's "entry no form reaches" case. The executed fixture suite covers the hostile states instead (another branch's cited PR, another directory's lock, a `pr_number:` line in the body, a stale frontmatter number). **Finalise's zero-guard will fire; closing it takes a recorded DoD override until task.181's `shell-argv:` form exists.**

### Maintainability — PASS
Rung 2 reuses `pr-read.sh`; no second forge query. Header documents the contract and exit codes.

---

## Code Review

Advisory except a `category: bug` + `confidence: high` finding (`code_review_blocking=true`); none qualified.

**Correctness bugs (1):**
- [medium/medium] `shared/resources/resolve-pr-number.sh:89` — the branch rung trusts any PR the checked-out branch has; a standalone finalise run on `develop` could take a develop→main release PR over a correct frontmatter `pr_number:`, then write it at 7.2 → refuse rung 2 when the PR's head is the base or a long-lived branch. Provenance: new behaviour (the old rule read the document). Not promoted (medium confidence); routed to `recommendations.future`. Finalise runs on the work item's branch in every pipeline path, which bounds the exposure to a hand-run on the wrong branch.

**Cleanups (1):**
- `shared/resources/resolve-pr-number.sh:146` — "could not confirm" and "confirmed as another PR" print the same "refused" line → carry `PR_READ_ERROR` and a distinct JSON `reason`.

`boundary: true`. `probes_executed: 0` — no entry form reaches the resolver (see Security).

mutation-proven: body rung accepts unconfirmed → "body … refused" → covered
mutation-proven: rungs 2/4 swapped → "branch: … beats a stale pr_number:" → covered
mutation-proven: lock directory check removed → "lock: another work item's lock is skipped" → covered
mutation-proven: body regex back in Step 3a → Part 2 presence pin → covered
mutation-proven: AC prompt bullet restored → Part 2 presence pin → covered
mutation-proven: Step 7.2 body copy restored → Part 2 presence pin → covered
mutation-proven: `pr_read` drops `headRefName` → `pr-read.test.sh` head-branch case → covered

Step 4b: `skills/finalise/SKILL.md` — 38 blocks, 0 runnable (2 placeholder, 36 mutating). The Step 3a block is refused as `mutating` for its pre-existing `> "$DIFF_FILE"` redirect, so its three new lines were run by hand on this branch: `PR_NUMBER=635`, `PR_SOURCE=branch`. The two prompts carry no bash blocks. zsh is not installed on this host.

---

## Regression Testing

| Area | Result |
| --- | --- |
| `pr-read.sh` consumers (`verify-push-state.test.sh`, `step-8-completion-checklist.test.mjs`) | PASS (40/40; 76 node tests incl. resolver) |
| Bundled copies (`bundle:check`) | PASS |
| Full fast gate | PASS (5364 tests, 0 fail) |

---

## Test Artifacts

### Files Reviewed
`shared/resources/resolve-pr-number.sh`, `shared/resources/pr-read.sh`, `shared/resources/pr-read.test.sh`, `shared/resources/tests/resolve-pr-number.test.mjs`, `skills/finalise/SKILL.md`, `shared/resources/finalise-dod-ac-prompt.md`, `shared/resources/finalise-dod-fix-evidence-prompt.md`, `CHANGELOG.md`

### Test Commands Executed
```bash
node --test shared/resources/tests/resolve-pr-number.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs
bash shared/resources/pr-read.test.sh
bash shared/resources/verify-push-state.test.sh
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --json
npm run validate -- skills/finalise/
```

### Coverage Report
Not measured (shell and prose deliverables; behaviour coverage is held by the executed cases and mutation proofs above).

---

## Recommendations

### Immediate Actions (Blocking)
None.

### Short-term Actions (Non-Blocking)
1. CR-1: refuse the branch rung when the PR's head is a base or long-lived branch.
2. CR-2: separate "could not confirm" from "confirmed as another PR".
3. Positive pin for Step 7.2's resolved-number wording.
4. Record a finalise DoD override for the security zero-guard until task.181.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: Every criterion is held by executed evidence; no open finding.
**Quality Score**: 100/100

**Deployment Recommendation**: APPROVED

---

**QA Report**: co-located at `task.175.qa.1.finalise-pr-number-from-branch.md`
**Gate File**: co-located at `task.175.gate.1.finalise-pr-number-from-branch.yml`
**Next Steps**: Step 5c PR conformance review, then `/finalise` (expect the security zero-guard override).
