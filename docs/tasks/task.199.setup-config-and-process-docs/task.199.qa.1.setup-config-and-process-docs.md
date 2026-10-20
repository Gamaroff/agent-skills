# QA Report: Task 199 - Setup, configuration and process docs

**Task**: [Link to task document](./task.199.setup-config-and-process-docs.md)
**Gate File**: [task.199.gate.1.setup-config-and-process-docs.yml](./task.199.gate.1.setup-config-and-process-docs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

QA reviewed the whole branch diff: 16 docs plus the doc-drift audit report. Each changed claim was checked against the script or skill it describes, and every one matches. The gate is CONCERNS because three stale copies of the corrected claims remain outside the diff, each the same defect class the task set out to fix: configuration.md still says "three sync skills", three consumer docs still say Node ≥ 20, and the `setup-consumer.sh` header no longer matches the wizard table it pins.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (6/6 ticked)
- [x] Tests passing (`npm run ci:fast` 5,969 / 0 fail; PR #704 CI `test`, `link-check`, `shellcheck` pass @ `d0c72dab`)
- [x] Breaking changes documented (none — documentation only)
- [x] Code on feature branch with open PR (#704, OPEN)

### Testing Approach

- [x] Manual Testing (the new command was re-run independently)
- [x] Automated Testing (fast gate, CI)
- [ ] Performance Testing — N/A
- [x] Regression Testing (enumeration of stale copies outside the diff)
- [x] Security Review (reasoned; no boundary)
- [x] Code Review (Step 3b, independent subagent)

### Review Methodology

Direct tools, plus one read-only diff-review subagent (Step 3b). This is a small, low-risk, documentation-only task, so the Adaptive Review Strategy calls for direct tools. The traceability matrix from the pipeline's mapper was used as input (`.summaries/qa-traceability-matrix.md`). The diff reviewer was dispatched at 07:30Z and returned in 176,557 ms (completion notice `duration_ms`). It was told that a "correctness bug" here is a changed claim that contradicts its source, and to look for stale copies of each corrected claim outside the diff.

Step 4b: not applicable. No `SKILL.md` or `shared/resources/*.md` is in the change set, so it contains no runnable prose.

First review: no prior gate, so there is no re-review scope.

---

## Implementation Verification

| Phase | Status | Test Result | Notes |
| --- | --- | --- | --- |
| Phase 0: Re-verify | PASS | Verified | The task's Approach table records each finding's state. SKILL-READMES-STANDARDS-28 is closed as superseded, with the reason given |
| Phase 1: Overview | CONCERNS | Verified | Edits match their sources. Stale Node ≥ 20 copies remain beside them (QA-1); the `setup-consumer.sh` header no longer matches the table (QA-2) |
| Phase 2: Reference | CONCERNS | Verified | configuration.md:710 still says "three sync skills" (CR-1) |
| Phase 3: Runbooks | PASS | Verified | Sources re-read: change-checklist headings, release.sh CI refusal, develop-bug mirroring |
| Phase 4: Standards | PASS | Verified | bug-documents.md and bug-registry.md are indexed |
| Phase 5: Close-out | PASS | Verified | The audit report marks all 20 findings |

**Overall Phase Completion**: 6/6 delivered; 2 phases carry residue.

---

## Success Criteria Verification

| Criterion | Target | Actual | Status | Evidence |
| --- | --- | --- | --- | --- |
| SC-1 every finding fixed or closed | 20/20 | 19 fixed, 1 closed (superseded) | PASS | Audit report `**Resolved:**` lines; the task's Approach table |
| SC-2 no changed doc states old behaviour | 0 hits | 0 in the changed passages | CONCERNS | The changed passages are clean. The same claims survive at configuration.md:710 and getting-started.md:11 (both changed docs) and in the quickstarts (CR-1, QA-1) |
| SC-3 changed commands run or cited | all | run / cited | PASS | QA re-ran `source .agents/skills/create-pr/references/bitbucket-auth.sh` in a consumer-shaped scratch directory: token set → rc 0, scheme `bearer`; unset → rc 1 with the documented message. The old `shared/resources/` path fails there (rc 1). `release.sh --tag`/`--skip-ci-check` are cited at `scripts/release.sh` (header and CI refusal) |
| SC-4 performance | N/A | N/A | PASS | Documentation only |
| SC-5 prettier | pass | pass (vacuous) | PASS | `.prettierignore` excludes `*.md` |
| SC-6 doc-links + Docs link check | green | green | PASS | Mapper re-ran `doc-links.js` on all 16 docs: ok. PR #704 `link-check`: pass |
| SC-7 skill README | N/A | N/A | PASS | No skill README in the diff |
| SC-8 audit report marks each finding | 20/20 | 20/20 | PASS | `.agents/plans/doc-drift-audit-2026-10-07.md` |

No behaviour criterion here needs a committed test. Every criterion is a documentation or measurement criterion, and its evidence is cited above.

---

## Breaking Changes Validation

None — documentation only. **Overall Breaking Changes Assessment:** PASS (N/A).

---

## Issues Found

### HIGH Severity Issues (0)

### MEDIUM Severity Issues (1)

**Issue: configuration.md still says "three sync skills" (CR-1)**
- **Severity**: MEDIUM
- **Category**: Quality (documentation accuracy)
- **Bug Report**: none filed. This cycle's qa-fix closes it in one line, and the gate is the fix queue
- **Observation**: `docs/reference/configuration.md:710` reads "`--probe-workflow` on any of the three sync skills". RUNBOOKS-23 corrected the same count to four in jira-publish.md. `sync-jira-bug` is the fourth.
- **Impact**: A reader of the configuration reference does not learn that the bug sync can probe a board.
- **Recommendation**: Say "four", then grep docs/ for other copies of the count (excluding dated audits, task and bug records, and CHANGELOG).
- **Priority**: P2

### LOW Severity Issues (2)

- **QA-1** — `getting-started.md:11`, `quickstart-task.md:22` and `:59`, and `quickstart-story.md:22` give Node ≥ 20. `package.json` `engines.node` and the `setup-consumer.sh` header both require ≥ 22, and the diff already made this correction in day-1-tasks.md.
- **QA-2** — `scripts/setup-consumer.sh:6` claims "numbering matches docs/concepts/getting-started.md § What the wizard does". After this diff the header has no 8a and still describes step 4 as `.env optionally`.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS
N/A — documentation only.

### Reliability — PASS
`git revert` restores the previous docs. The one new consumer command was executed and behaves as documented.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary in the change set (see Code Review). The new command reads credentials from the environment and prints none of them.

### Maintainability — PASS
Each edit cites the source it was written from. The residue is three stale copies outside the diff, listed above.

---

## Code Review

Step 3b ran over the whole branch diff with the work-item directory excluded: 17 files. All findings are anchored at `HEAD`, and every `anchor_check` is `ok`.

**Correctness bugs (3):**
- [medium/high] `docs/reference/configuration.md:710` — enumeration risk: the diff fixed "three" → "four" sync skills in jira-publish.md, and this copy was missed → say four, and grep for other copies. **Promoted to gate `top_issues[]` as CR-1** (`code_review_blocking=true`).
- [low/medium] `docs/concepts/getting-started.md:11` — Node ≥ 20 remains in getting-started and both quickstarts while the requirement is ≥ 22 → update each. Advisory as returned. QA verified it independently and raised it as **QA-1** (low).
- [low/medium] `scripts/setup-consumer.sh:6` — the header's numbering-parity claim is broken by step 8a and the step 4 rewrite → update the header. Advisory as returned. QA verified it independently and raised it as **QA-2** (low).

**Cleanups (0):** none.

**Provenance (5b):** all three findings are in scope. Each is a second copy of a claim a task finding corrected (RUNBOOKS-23, RUNBOOKS-26, OVERVIEW-10/11), or a parity claim this diff broke. None is pre-existing debt from outside the task.

**Boundary rule:** `boundary: false`. The change set adds no function, script or fenced guard that accepts or rejects input. No predicate-shaped code was added, so there are no candidates to name. `probes_executed: 0`.

**Mutation proof:** not run. No committed test guards documentation wording (the review-task sweep found none), and this cycle fixed nothing, so no fix needs proving.

**Platform variance:** not applicable. No environment-derived value reaches a validating consumer.

---

## Regression Testing

| Area | Result |
| --- | --- |
| Fast gate (`npm run ci:fast`, `.agents/skills` moved aside) | PASS — 5,969 tests, 0 fail |
| PR #704 CI (`test`, `link-check`, `shellcheck`) | PASS @ `d0c72dab` |
| Stale copies of corrected claims, tree-wide | CONCERNS — CR-1, QA-1 |
| Standards-named validation (`npm run validate -- skills/<changed-skill>/`) | not run — no skill changed |

---

## Test Artifacts

### Files Reviewed
The 16 changed docs; `.agents/plans/doc-drift-audit-2026-10-07.md`; `scripts/setup-consumer.sh`, `scripts/release.sh`, `shared/resources/resolve-platform.sh`, `shared/resources/tracker-workflow.js`, `skills/create-pr/references/bitbucket-auth.sh`, `package.json`.

### Test Commands Executed
```bash
npm run ci:fast                       # Step 3, .agents/skills moved aside — TEST_EXIT=0
gh pr checks 704                      # test / link-check / shellcheck: pass
# consumer-shaped scratch dir with .agents/skills/create-pr/references/bitbucket-auth.sh:
source .agents/skills/create-pr/references/bitbucket-auth.sh   # unset → rc 1; BITBUCKET_ACCESS_TOKEN set → rc 0, bearer
source shared/resources/bitbucket-auth.sh                      # old path → rc 1
grep -rnE '\b(three|3) (Jira )?sync skills' docs
grep -rnE 'Node.{0,6}(≥|>=) *20' docs
command node .agents/skills/qa-task/references/finding-anchors.js --rev HEAD ...   # reason ok
```

### Coverage Report
N/A — documentation only.

---

## Recommendations

### Immediate Actions (Blocking)
1. CR-1: configuration.md:710 "three" → "four" sync skills (P2).

### Short-term Actions (Non-Blocking)
1. QA-1: Node ≥ 22 in getting-started and both quickstarts.
2. QA-2: bring the `setup-consumer.sh` header back into parity with the wizard table.
3. Future: CI's `markdown-link-check@3` does not check cross-file anchors.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: Every changed claim matches its source. One medium and two low findings remain, all stale copies of claims this task corrected.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: CR-1 fixed; QA-1 and QA-2 in the same cycle.

---

**QA Report**: co-located at `task.199.qa.1.setup-config-and-process-docs.md`
**Gate File**: co-located at `task.199.gate.1.setup-config-and-process-docs.yml`
**Next Steps**: `/qa-fix` cycle 1, then re-review.
