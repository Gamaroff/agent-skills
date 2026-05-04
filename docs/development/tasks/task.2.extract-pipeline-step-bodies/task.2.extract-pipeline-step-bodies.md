---
id: 2
title: Extract develop-pipeline Step 0–9 bodies into shared resources
status: Planned
risk_level: medium
created: 2026-05-04
parent_task: 1
---

# Task 2 — Extract develop-pipeline step bodies into shared resources

## 1. Motivation

Task 1 extracted the 5 token-swap-only contract blocks (autonomous defaults, lite-mode, resume contract, pause/hook setup) from `develop-story/SKILL.md` and `develop-task/SKILL.md` into `shared/resources/develop-pipeline-*.md`. Line counts dropped:

- `develop-story/SKILL.md`: 1192 → 1139 (−53)
- `develop-task/SKILL.md`: 1153 → 1106 (−47)

The original target was ≤500 lines per orchestrator (≥30% body reduction). That target was deferred because the Phase 1 variance audit determined that **Steps 0–9** (resolve-and-prepare, branch creation, review, develop loop, create-PR, QA loop, finalise, commit) contain token-swap variants throughout — they are the bulk of remaining duplication but cannot be extracted with the same trivial pattern Task 1 used.

This task picks up where Task 1 stopped: extract the Step 0–9 bodies, accepting some structural rewriting to handle the woven token-swap variants.

## 2. Scope

In scope:
- Extract pipeline Step 0a/0b/0c/0c-reg/0d/0e/0f resolve-and-prepare bodies
- Extract Step 1 create-branch (board pre-flight, stash, lock-write)
- Extract Step 2 review-* gate logic
- Extract Step 3 develop-loop body (Explore subagent, plan-file discovery, internal-gate handling, loop iteration shell)
- Extract Step 4 create-PR body (GitHub vs Jira branching, lock pr_url update)
- Extract Step 5–6 QA loop body
- Extract Step 7 finalise + tracker close body
- Extract Step 8 commit-changes + lock-removal body

Out of scope:
- Changes to step semantics (this is a pure extraction)
- Cross-orchestrator behavior changes (any divergence stays per-orchestrator)
- New shared docs beyond what's needed for the Step 0–9 bodies

## 3. Approach

Two viable strategies:

**Strategy A — single shared body with token substitution.** One `shared/resources/develop-pipeline-steps.md` containing all step bodies with `{{ARTIFACT}} = story|task`, `{{REVIEW_SKILL}} = review-story|review-task`, etc. Each orchestrator's SKILL.md contains a token map and a single reference line per step.

  - Pro: maximum dedup, single source of truth
  - Con: requires a substitution mechanism the agent honors at read time; risks misinterpretation under context pressure

**Strategy B — per-step shared docs with explicit story/task tables.** One file per step (`develop-pipeline-step-1-create-branch.md` etc.), each containing both story and task variants in side-by-side tables (same pattern Task 1 used for `develop-pipeline-resume-contract.md`).

  - Pro: no substitution layer; pattern already validated by Task 1
  - Con: 8 new shared files; some content stays duplicated within the shared doc

Recommended: **Strategy B** unless we discover a robust substitution mechanism. Pre-task spike on Strategy A may be worthwhile for the team to evaluate before committing.

## 4. Phases

Pre-Phase: Strategy decision spike (A vs B). Evaluate by extracting one step (Step 1, lowest variance) under each strategy and comparing the result.

Phase 1: Extract Step 0 resolve-and-prepare (already largely token-swap-only, low risk)
Phase 2: Extract Step 1 create-branch
Phase 3: Extract Step 2 review-*
Phase 4: Extract Step 3 develop loop (highest content density — dedicated phase)
Phase 5: Extract Step 4 create-PR
Phase 6: Extract Step 5–6 QA loop
Phase 7: Extract Step 7 finalise + tracker close
Phase 8: Extract Step 8 commit + lock removal
Phase 9: Final validation, repackage, mental dry-run, drift canary

## 5. Success Criteria

- `develop-story/SKILL.md` ≤ 500 lines
- `develop-task/SKILL.md` ≤ 500 lines
- ≥30% unique-content reduction (measured by lines of *non-reference* content)
- All 5 affected skills pass `quick_validate.py`
- All zips contain expected `references/develop-pipeline-step-*.md` entries
- Drift canary: editing one shared step file propagates to both orchestrator zips
- Mental dry-run for both orchestrators with full pipeline (Steps 0–8)
- One full real `/develop-story` run AND one full real `/develop-task` run complete successfully against new docs before merge

## 6. Risks

- **High**: token-swap variants may be more woven than Phase 1 of Task 1 suggested. Mitigation: pre-Phase strategy spike + per-step variance audit before each extraction phase.
- **Medium**: extracting Step 3 (develop loop) risks breaking the bounded loop semantics that were hardened in Task 1 cleanup-brief items 11/13. Mitigation: dedicated phase, mental dry-run before extraction, regression-check against current resume-contract.md.
- **Low**: GitHub project board GraphQL block (~85 lines, currently duplicated in Step 0c-reg AND Step 1 board pre-flight) is the largest single token-swap candidate. Likely the highest LOC return per extraction.

## 7. References

- Parent task: `docs/development/tasks/task.1.extract-shared-develop-pipeline-body/task.1.extract-shared-develop-pipeline-body.md`
- Task 1 QA report: `docs/development/tasks/task.1.extract-shared-develop-pipeline-body/task.1.qa.1.extract-shared-develop-pipeline-body.md` (notes ≤500-line target deferred)
- Task 1 PR: https://github.com/Gamaroff/agent-skills/pull/2

## 8. Definition of Done

- [ ] Strategy decision documented (A or B)
- [ ] All 8 step bodies extracted to `shared/resources/`
- [ ] develop-story and develop-task SKILL.md ≤500 lines
- [ ] All 5 skills validate clean
- [ ] All bundling verified (no `shared/resources/` paths in zipped SKILL.mds)
- [ ] Drift canary passes
- [ ] One full real `/develop-story` run + one full `/develop-task` run complete against new docs
- [ ] PR opened, reviewed, merged
