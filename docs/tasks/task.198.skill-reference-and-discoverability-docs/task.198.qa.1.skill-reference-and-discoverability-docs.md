# QA Report: Task 198 - Skill reference and discoverability docs

**Task**: [Link to task document](./task.198.skill-reference-and-discoverability-docs.md)
**Gate File**: [task.198.gate.1.skill-reference-and-discoverability-docs.yml](./task.198.gate.1.skill-reference-and-discoverability-docs.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-10-20
**Testing Completed**: 2026-10-20
**Gate Status**: CONCERNS

---

## Executive Summary

All 27 audit findings are fixed across the 16 in-scope docs. Every mechanical check is clean: links, anchors, prettier, `validate`, the Mermaid map, `ci:fast` and PR CI. An independent fact-check of about 60 new claims against the skill sources found one medium and six low inaccuracies. Each one was introduced by the new text or left contradictory beside it. The medium is in the rewritten `resolve-platform.sh` paragraph in `overview.md`: it over-claims which skills source the helper, and its grep does not list them.

**Overall Assessment**: CONCERNS
**Deployment Recommendation**: CONDITIONAL

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (Section 6 boxes all ticked)
- [x] Tests passing
- [x] Breaking changes documented (N/A, documentation only)
- [x] Code on feature branch with open PR (#703, OPEN, base develop)

### Testing Approach

- [ ] Manual Testing
- [x] Automated Testing (`ci:fast`)
- [ ] Performance Testing
- [x] Regression Testing
- [x] Security Review (no boundary)
- [x] Code Review (claim fact-check)

### Review Methodology

Direct tools plus one read-only Explore reviewer. The first review covered the whole branch diff, excluding `docs/tasks/` and `.agents/plans/`: a 607-line patch of 16 docs and `CHANGELOG.md`. The diff holds no code, so the shared code-review prompt was replaced by a claim fact-check prompt. It asked the reviewer to refute each added or changed claim against `skills/*/SKILL.md` (bodies and `invokes:`), and to check Mermaid node ids, links, anchors and README step lists. The reviewer was dispatched at 05:01:51Z and returned at 05:05:34Z (204,605 ms by the completion notice).

Step 4b: not applicable. The change set contains no runnable prose (no `SKILL.md` or `shared/resources/*.md` changed).

---

## Implementation Verification

| Phase                          | Status   | Test Result | Notes                                                                 |
| ------------------------------ | -------- | ----------- | --------------------------------------------------------------------- |
| Phase 0: Re-verify findings    | PASS     | Verified    | All 27 open at `bc7cbd8b`; recorded in the implementation report       |
| Phase 1: Reference and overviews | CONCERNS | Partial   | overview.md resolve-platform paragraph over-claims (CR-1, CR-2)        |
| Phase 2: Command reference     | PASS     | Verified    | Flags and target forms match the SKILL.md argument tables              |
| Phase 3: Runbooks and READMEs  | CONCERNS | Partial     | Caller lists and step lists incomplete (CR-3 to CR-7)                  |

**Overall Phase Completion**: 2/4 phases passed clean; 2 carry low/medium wording findings.

---

## Success Criteria Verification

| Criterion | Kind          | Status   | Evidence                                                                                                         |
| --------- | ------------- | -------- | ---------------------------------------------------------------------------------------------------------------- |
| SC-1      | documentation | PASS     | 27/27 fixed; audit report carries 27 `Resolved` lines                                                            |
| SC-2      | documentation | PASS     | Old-wording greps 0 hits (implementation report, Step 3)                                                         |
| SC-3      | documentation | CONCERNS | Slash forms match their SKILL.md lines. The one new shell command (`grep -l resolve-platform.sh`) runs, but does not list what the prose says it lists (CR-1) |
| SC-4      | N/A           | N/A      | Documentation only                                                                                               |
| SC-5      | measured      | PASS     | `prettier --check` on all changed `.md`: clean                                                                    |
| SC-6      | measured      | PASS     | `markdown-link-check@3 -c .github/markdown-link-check.json` on all changed docs: 0 dead; `doc-links.js` ok; 4 new anchors ok, control `review-pr/SKILL.md#no-such-anchor` MISS |
| SC-7      | measured      | PASS     | `npm run validate -- skills/{develop-next,qa-next,review-story,review-task}/`: ✓ ×4                               |
| SC-8      | documentation | PASS     | `.agents/plans/doc-drift-audit-2026-10-07.md`: 27 findings marked                                                |
| SC-9      | measured      | PASS     | architecture.md dependency map at HEAD re-rendered with the Mermaid Chart validator: `valid: true`, flowchart     |

---

## Breaking Changes Validation

None. Documentation only.

**Overall Breaking Changes Assessment:** PASS

---

## Issues Found

### HIGH Severity Issues (0)

None.

### MEDIUM Severity Issues (1)

**Issue: resolve-platform paragraph over-claims, and its grep does not list the sourcing skills (QA1-CR-1)**

- **Severity**: MEDIUM
- **Category**: Quality (factual accuracy)
- **Observation**: `docs/concepts/overview.md:127` says every skill that touches a tracker or a PR sources `resolve-platform.sh`, and it names finalise and all the `ensure-*` routines among them. It then says `grep -l resolve-platform.sh skills/*/SKILL.md` lists them all. None of that holds:
  - `create-issue` does its own detection (`skills/create-issue/SKILL.md:133-150`, 0 mentions of the helper).
  - finalise and the Jira `ensure-*` routines read a `TRACKER` their caller set.
  - The bare grep matches mentions, not source lines. The canonical command at `shared/resources/platform-detection.md:540` finds 22 sourcing `SKILL.md` files.
- **Impact**: A reader adding a platform branch would trust a list that is wrong in both directions.
- **Recommendation**: Name the set as the skills that source the helper, and use the canonical grep.
- **Priority**: P2
- **Bug Report**: none. The finding is recorded in the gate and fixed in the same loop, so a separate bug file would duplicate it.

### LOW Severity Issues (6)

- **QA1-CR-2** `docs/concepts/overview.md:114`: the table row repeats the "every platform-aware skill" over-claim.
- **QA1-CR-3** `skills/review-story/README.md:103`: the step list omits Step 10a, Record the Reviewed Revision (`SKILL.md:2456`).
- **QA1-CR-4** `skills/review-task/README.md:87`: the step list omits Step 9a, Record the Reviewed Revision (`SKILL.md:1981`).
- **QA1-CR-5** `docs/runbooks/jira-publish.md:124`: review-epic also calls `ensure-epic-jira-issue` (`review-epic/SKILL.md:850`).
- **QA1-CR-6** `docs/runbooks/story-development.md:132`:
  - It leaves out create-epic and review-epic, which offer the epic sync themselves.
  - Its "exists by the time" guarantee is too strong, since the story-time sync is opt-in.
- **QA1-CR-7** `docs/runbooks/story-development.md:117,282`: the create-epic rows omit `ensure-epic-github-issue` and `sync-jira-epic`, which contradicts the new `CE --> EGH` edge.

**Total Issues**: HIGH: 0, MEDIUM: 1, LOW: 6

---

## NFR Assessment

### Performance — PASS

N/A. Documentation only.

### Reliability — PASS

Every changed link and new anchor resolves. The Mermaid map renders.

### Security — PASS

- **Status**: PASS
- **Evidence**: reasoned
- **Probes executed**: 0
- No boundary. The change contains no predicate, script, `SKILL.md` or `shared/resources` prose.

### Maintainability — PASS

The fixes point at canonical sources. The inaccuracies are tracked in `top_issues[]`.

---

## Code Review

The reviewer was a claim fact-check, dispatched because the diff has no code. Under `code_review_blocking=true` from the pipeline, every high-confidence bug finding is promoted to the gate.

boundary: false. The diff adds no predicate-shaped function, no script and no runnable prose, so it has no candidate to name.

**Correctness bugs (7)**, all promoted to `top_issues[]` as QA1-CR-1 to QA1-CR-7:

- [medium/high] `docs/concepts/overview.md:127`: resolve-platform over-claim and wrong grep.
- [low/high] `docs/concepts/overview.md:114`: the same over-claim in the table row.
- [low/high] `skills/review-story/README.md:103`: Step 10a missing.
- [low/high] `skills/review-task/README.md:87`: Step 9a missing.
- [low/high] `docs/runbooks/jira-publish.md:124`: review-epic missing as a caller.
- [low/high] `docs/runbooks/story-development.md:132`: epic-time sync paths missing; guarantee too strong.
- [low/high] `docs/runbooks/story-development.md:282`: the create-epic row contradicts the new edge (also :117).

**Cleanups (2)**, advisory:

- `docs/runbooks/story-development.md:284`: the review-story row omits `create-branch` (its `invokes:` list, Step 0a).
- `docs/concepts/architecture.md:120`: the prose credits only create-story with `ensure-story-*`, while the map draws `RS --> ESGH/ESGJ` (`review-story/SKILL.md:765`).

QA re-read the contradicting source for CR-1 (`create-issue` 0 mentions; the canonical grep gives 22 files), CR-3/CR-4 (the 10a/9a headings), CR-5 (`review-epic:850`), and CR-6/CR-7 (`story-development.md:282` unchanged).

No mutation proofs: no test guards a fix this cycle (documentation only).

---

## Regression Testing

| Area                        | Result |
| --------------------------- | ------ |
| `npm run ci:fast`           | PASS — 5969 tests, 5955 pass, 0 fail |
| PR #703 CI (`8a1e7f65`)     | PASS — validate, shellcheck, link-check, test |
| Corpus guards in `ci:fast`  | PASS (changelog-entry-drift, task-registry-drift, card-preflight-corpus included) |

---

## Test Artifacts

### Files Reviewed

The 16 in-scope docs, `CHANGELOG.md`, the audit report, and the task, plan and implementation report.

### Test Commands Executed

```bash
npm run ci:fast
npm run validate -- skills/<skill>/   # develop-next, qa-next, review-story, review-task
./node_modules/.bin/prettier --check <changed .md files>
markdown-link-check -q -c .github/markdown-link-check.json <changed docs>
node .agents/skills/qa-task/references/doc-links.js --file <each changed .md>
node scratchpad/slug.mjs <file#anchor> ...   # 4 new anchors + control
grep -rnoE '(^|[^=[:alnum:]_])source[[:space:]]+[^`]*resolve-platform\.sh' skills/*/SKILL.md
gh pr checks 703
```

### Coverage Report

N/A. Documentation only.

---

## Recommendations

### Immediate Actions (Blocking)

1. Fix QA1-CR-1 to QA1-CR-7.

### Short-term Actions (Non-Blocking)

1. Apply the two cleanups while editing `story-development.md` and `architecture.md`.

---

## Final Assessment

**Gate Status**: CONCERNS
**Rationale**: The 27 findings are fixed and every mechanical check is clean. The new text carries one medium factual error and six low gaps, and all seven open entries go to `/qa-fix`.
**Quality Score**: 90/100

**Deployment Recommendation**: CONDITIONAL
**Conditions**: QA1-CR-1 to QA1-CR-7 fixed.

---

**QA Report**: co-located at `task.198.qa.1.skill-reference-and-discoverability-docs.md`
**Gate File**: co-located at `task.198.gate.1.skill-reference-and-discoverability-docs.yml`
**Next Steps**: `/qa-fix` on gate 1, then QA cycle 2.
