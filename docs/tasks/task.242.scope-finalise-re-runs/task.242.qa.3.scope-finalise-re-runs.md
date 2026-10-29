# QA Report: Task 242 - Scope finalise re-runs to the gaps and the changed evidence

**Task**: [task.242.scope-finalise-re-runs.md](./task.242.scope-finalise-re-runs.md)
**Gate File**: [task.242.gate.3.scope-finalise-re-runs.yml](./task.242.gate.3.scope-finalise-re-runs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-29
**Testing Completed**: 2026-10-29
**Gate Status**: FAIL

---

## Re-Review Context

| Previous finding | Severity | Status | Evidence |
| --- | --- | --- | --- |
| TASK-242-CR2-1: an omitted reported gap flips to PASS | high | ✅ FIXED | `mergeReportedGap` returns the prior FAIL when `agentAc` is absent. Test "no agent verdict keeps the prior FAIL", mutation-proven `covered` |
| TASK-242-CR2-2: an invented member overturns a non-member FAIL | high | ✅ FIXED | `non_member_fail` gates `explainedByMembers`; the record keeps it and the scope text names it. 4 mutations `covered` |
| TASK-242-CR2-3: a deleted or renamed cited path drops out of the evidence | high | ✅ FIXED, with a regression (CR3-1) | `evidenceIndex` plus `--no-renames`. 2 mutations `covered`. Its basename side effect is CR3-1 below |
| TASK-242-CR2-4 (advisory): the record keys on HEAD, not the judged tree | medium | ✅ FIXED | `dirty` becomes `dirty_paths`, which the next scope counts as changed. 3 mutations `covered` |

---

## Executive Summary

The four cycle-2 findings are fixed: 10 of 10 mutation proofs `covered`, run against the committed head in a scratch worktree. The independent cycle-3 reviewer found one new high defect. The CR2-3 fix feeds changed paths into the citation index, and that breaks the unique-basename rule when a cited file moves directory under the same name: the criterion is carried where it used to be re-judged. Reproduced at both heads.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Review Methodology

Re-review, direct tools plus one independent Explore code reviewer (Step 3b).

Re-review scope: files changed since gate 2 (head 15185f81e9e4; 11 files) — default. `SAFETY_REPROBE=false`: clause 1 false (gate 2 security PASS); clauses 2-3 do not apply (no safety-axis criterion).

Reviewer: dispatched 07:41:46Z (`date -u`), returned in 149.2 s (`duration_ms`). It was also given the cycle's own code delta (`15185f81..HEAD`) to start from.

CI on a43bee983bd7: pending

Step 4b: `skills/finalise/SKILL.md` has 4 changed blocks (3a, 3c, 6a, 6b), all refused as `mutating`, 0 executed (`changed-blocks-not-executed`). File level: 42 blocks (3 placeholder, 39 mutating), `zero-blocks-executed`. The engine cannot reach these blocks; `finalise-rerun-scope-blocks.test.mjs` executes 3a and 3c directly, 138/138 green. `shared/resources/finalise-dod-ac-prompt.md`: 0 changed blocks. Shells run: bash; zsh is not installed on this host (`zsh-unavailable`).

---

## New Findings This Cycle

- **[high]** `shared/resources/finalise-rerun-scope.js:161`: a same-basename directory move makes a bare citation ambiguous, so the criterion is carried rather than re-judged (TASK-242-CR3-1) → resolve a bare basename against HEAD first, or treat an ambiguous one as changed.
- **[low]** `shared/resources/finalise-rerun-scope.js:229`: `git diff --name-only` without `-z` returns C-quoted non-ASCII paths, which never match the raw index (CR3-2, advisory) → `-z` split on NUL.

---

## Implementation Verification

| Phase | Status | Notes |
| --- | --- | --- |
| Phases 1-6 | PASS (18/18 items) | The cycle-2 fixes touch Phases 2-3 (engine merge and scope). Phase 2 carries CR3-1 |

---

## Success Criteria Verification

The criteria verified in cycles 1-2 hold on the targeted suites (138/138). This cycle moved one rule: a scoped PASS is re-judged when its cited evidence changed or no longer resolves. CR3-1 is a hole in that rule (the evidence-changed criterion, Phase 2).

---

## Breaking Changes Validation

The record gains `dirty_paths` and `non_member_fail`, both additive. A record without them reads as `[]` and `null`: the scope loop guards `Array.isArray(prior.dirty_paths)`, and `nonMemberFail` returns `null` for an absent field. No migration is needed. **PASS**

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: a same-basename directory move carries a PASS (TASK-242-CR3-1)**

- **Severity**: HIGH
- **Category**: Functional (reliability)
- **Observation**: in a repository where SC-2 cites `b.js:1` and `tests/a.test.mjs:1`, `git mv src/b.js lib/b.js` gives SC-2 `evidence-changed` at 15185f81 and `unchanged` at a43bee98. `--no-renames` lists both `src/b.js` and `lib/b.js` as changed; `evidenceIndex` adds both; two `b.js` candidates make the bare token unresolvable, and the unchanged co-citation carries the criterion.
- **Impact**: a re-run carries a PASS whose cited code moved, which is the failure this task exists to prevent.
- **Recommendation**: see the gate's `suggested_action`. The new test must cover the identity-rule direction CR2-3's test did not: same basename, cited bare.
- **Priority**: P1

### LOW Severity Issues (1)

- CR3-2: non-ASCII paths are C-quoted by `git diff --name-only` (advisory).

**Total Issues**: HIGH: 1, MEDIUM: 0, LOW: 1 (plus 2 cleanups)

---

## NFR Assessment

### Performance — PASS

One more `git diff --name-only` per scope.

### Reliability — FAIL

CR3-1.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- `boundary: false`, as in cycles 1-2. The candidates are `resolveCitation`, `evidenceIndex`, `nonMemberFail`, and the scope/merge classifiers. Each decides re-judge vs carry over pipeline-written records and git state, writes no disk path, and no corpus sink models it.

### Maintainability — PASS

Fixes are commented with their finding ids. CR3-3 and CR3-4 are dead-code cleanups.

---

## Code Review

Advisory except where promoted (`code_review_blocking=true`, pipeline run-level).

**Correctness bugs (2):**

- [high/high] `shared/resources/finalise-rerun-scope.js:161`: a same-basename directory move leaves two `b.js` paths in `evidenceIndex`, so a bare `b.js:3` citation stops resolving and the criterion is carried → resolve against HEAD first, or treat an ambiguous basename as changed. **Promoted: TASK-242-CR3-1.**
- [low/medium] `shared/resources/finalise-rerun-scope.js:229`: `dirty` and `changed` read `git diff --name-only` without `-z`, so quoted non-ASCII paths never match the raw `ls-files -z` index → use `-z` split on NUL.

**Cleanups (2):**

- `shared/resources/finalise-rerun-scope.js:497`: `agentAc &&` is always true after the new early return → drop it.
- `shared/resources/finalise-rerun-scope.js:460`: `|| null` after `nonMemberFail` is a no-op → remove it.

Anchors: all 4 `ok` (`finding-anchors.js --rev HEAD`).

Provenance (5b): CR3-1 was reproduced at 15185f81 (`evidence-changed`) and at a43bee98 (`unchanged`), so it is new to this cycle. Script: a real git repo, the engine's own `gitIo`.

Mutation proofs (scratch worktree at a43bee98; reviewer not reading it):

- mutation-proven: no-verdict branch removed → "no agent verdict keeps the prior FAIL" → covered
- mutation-proven: `non_member_fail` ignored in `explainedByMembers` → "non_member_fail keeps an agent FAIL" → covered
- mutation-proven: overturned note not kept as an advisory → same test → covered
- mutation-proven: record drops `non_member_fail` → same test → covered
- mutation-proven: scope text omits the prior non-member FAIL → same test → covered
- mutation-proven: `evidenceIndex` ignores changed paths → "deleted or renamed since the prior head" → covered
- mutation-proven: committed diff detects renames → same test → covered
- mutation-proven: scope ignores prior `dirty_paths` → "read uncommitted, then discarded" → covered
- mutation-proven: record writes no `dirty_paths` → same test → covered
- mutation-proven: scope reports no `dirty` → same test → covered

All 10 of 10 fixes from cycle 2 are proven; the baseline was green and the worktree clean afterwards.

---

## Regression Testing

Targeted suites under `TMPDIR=/tmp`: `finalise-rerun-scope.test.mjs`, `finalise-rerun-scope-blocks.test.mjs`, `finalise-bug-mode.test.mjs`, `finalise-dod-prompt-contract.test.mjs`: 138/138. `ci:fast` before the cycle-2 commit: 6777 pass, 0 fail. `validate`: finalise, review-story, review-task ✓.

---

## Test Artifacts

### Test Commands Executed

```bash
TMPDIR=/tmp node --test shared/resources/tests/finalise-rerun-scope.test.mjs evals/shared/tests/finalise-rerun-scope-blocks.test.mjs evals/shared/tests/finalise-bug-mode.test.mjs evals/shared/tests/finalise-dod-prompt-contract.test.mjs
npm run validate -- skills/finalise/   # and review-story, review-task
node .agents/skills/qa-task/references/qa-execute-snippets.mjs --file skills/finalise/SKILL.md --diff-base "$(git merge-base origin/develop HEAD)" --copy-as skills:.agents/skills --json
node scratchpad/qa3/repro-cr1.mjs <engine at 15185f81 | at HEAD>
node scratchpad/qa3/mut5.mjs           # in a scratch worktree
```

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: one high reliability defect (CR3-1), introduced by the CR2-3 fix.
**Quality Score**: 80/100

**Deployment Recommendation**: BLOCKED

**Next Steps**: qa-fix cycle 3: CR3-1 (and CR3-2, cheap), then QA cycle 4.
