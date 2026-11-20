---
id: task.284
title: "Migrate shipped payload heredocs to the file tool"
type: task
description: "Move each payload heredoc in shipped skill prose to the file-edit tool plus --body-file or --findings-file, deleting one ratchet allowlist entry per site, and cite the fresh-body-post recipe at the other body-file posting sites."
tags: [qa-task, qa-story, finalise, create-pr, ensure-task-github-issue, observation]
category: refactoring
status: accepted
priority: Medium
created: 2026-11-06
updated: 2026-11-20
completed_date: 2026-11-20
depends_on: [265]
pr_number: 923
estimated_effort_hours: 16
---

# Task 284: Migrate shipped payload heredocs to the file tool

**Status:** Accepted

---

## 1. Overview

Task 265 stated the file-write rules once (`shared/resources/file-write-rules.md`), added the recipes, and ratcheted the payload heredocs that shipped prose still carries (32 allow-listed lines). This task is the migration half of that split: move each of those sites to the file-edit tool plus `--body-file` or `--findings-file`, and delete its allowlist entry. It also cites the fresh-body-post recipe at the other posting sites, which task 265's QA cycle 1 (T265-QA-2) left to this task.

**Scope**: the allow-listed sites, grouped per axis, and the citation sweep. Not a change to any engine.

---

## 2. Motivation

### Current Problems

1. **The prose still prescribes what the standing rules forbid.** The allowlist in `shared/resources/tests/payload-heredoc-ratchet.test.mjs` holds 32 payload-writing heredoc lines. Command: `CI=true command node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs` (its non-vacuity test asserts the count).
2. **An unquoted heredoc executes backticks in its own text.** This once ran `docker system prune -a --volumes` (operator rule) and, on task.180, truncated a gate's quoted spans (obs #15).
3. **The recipe is cited at three posting sites only.** `qa-task`, `qa-story` and `review-pr` cite `file-write-rules.md#fresh-body-post`; `create-pr`, `finalise`, `ensure-*-github-issue`, `sync-github-*`, `review-bug/story/task`, `create-issue` and `observe-work` post a `--body-file` and do not.

### Benefits

1. An agent copying the prose follows the operator's rule.
2. The allowlist shrinks to empty, so the ratchet becomes a plain "no payload heredoc" guard.
3. A stale body cannot reach a tracker from any posting site.

---

## 3. Technical Background

### Current Architecture

- The ratchet and allowlist: `shared/resources/tests/payload-heredoc-ratchet.test.mjs` (`payloadHeredocLines`, `diffAgainstAllowlist`). Each entry is `[file, line text, count]`; it fails on a new line and on a stale entry.
- The rule and recipes: `shared/resources/file-write-rules.md` (`### Mutation revert`, `### Gate write`, `### Fresh-body post`).
- Sites by axis (allowlist file prefixes): `shared/resources/develop-pipeline-step-*.md` (six files) and `tracker-comment-contract.md`; `skills/qa-task`, `qa-story`, `qa-fix`; `skills/finalise`; `skills/create-pr`, `create-issue`; `skills/ensure-{bug,epic,story,task}-github-issue`; `skills/review-{bug,story,task}`.
- The `--body-file` posting population: 31 files (`git grep -l -e '--body-file' -- 'skills/*/SKILL.md' 'shared/resources/*.md'`).

### Target Architecture

Each site writes its payload with the file tool (the agent's write is a tool call, not a shell line), and the block that follows reads the file by path. The site's allowlist entry is deleted in the same commit.

### Important Clarifications

- The `ensure-*-github-issue` siblings already say "prefer the editor tool" next to the heredoc; the migration turns that note into the instruction.
- `qa-task`'s findings JSON and PR comment body are `cat > … <<'JSON'` sites that `qa-read-back.js` and `gh pr comment --body-file` already read as files.

---

## 4. Scope

### In Scope

✅ **Migration**: every allowlist entry removed, per axis, one commit per axis.
✅ **Citation sweep**: `file-write-rules.md#fresh-body-post` cited at the remaining `--body-file` posting sites, or each named as excluded with a reason.
✅ **Ratchet**: when the allowlist is empty, drop the allowlist and keep the guard.

### Out of Scope

❌ **Engines** (`tracker-comment.js`, `qa-read-back.js`): they already read a body file. One exception, added by QA bugs 1–3: `tracker-comment.js` now removes `--body-file` once the comment is posted, already there, or deferred into the journal, so a skipped write fails instead of re-posting the previous comment. That change, its contract paragraph and its tests are in scope of this PR; `qa-read-back.js` is untouched.
❌ **`security-input-corpus.md` rows**: test data, not instructions.

---

## 5. Breaking Changes

None - prose and one test. No script, flag or exit code changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.284.plan.migrate-payload-heredocs-to-file-tool.md](task.284.plan.migrate-payload-heredocs-to-file-tool.md)

### Phase 1: Pipeline step docs and the comment contract

**Risk Level**: Low

**Files**:
- `shared/resources/develop-pipeline-step-{0,1,2,3,4,7}-*.md`, `shared/resources/develop-pipeline-resume-contract.md` (its `DETECTOR_EOF` summary heredoc), `shared/resources/tracker-comment-contract.md`

**Changes**:
- [x] Replace each payload heredoc with a file-tool write plus a path argument. The step 1 lock heredoc (`cat > .claude/state/develop-pipeline.lock <<EOF`, 2 sites) is unquoted and expands `$(date -u …)`: the migrated text gives the agent the timestamp command to run first and the value to write in.
- [x] Delete the matching allowlist entries; run `npm run bundle`.
- [x] Run the removed-literal sweep (Testing Strategy) before the first deletion.

**Dependencies**: task 265.

### Phase 2: QA skills

**Risk Level**: Medium

**Files**: `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md` (`skills/qa-fix/SKILL.md` has no allowlist entry: task 265 migrated it, and its one remaining `<<` is a `read` here-document, not a payload write; verify and leave it)

**Changes**:
- [x] Migrate the findings JSON and PR comment body sites.
- [x] Run `qa-execute-snippets.mjs` over each changed block.
- [x] Delete the entries.

**Dependencies**: Phase 1 pattern settled.

### Phase 3: Finalise, create-pr, create-issue

**Risk Level**: Medium

**Files**: `skills/finalise/SKILL.md`, `skills/create-pr/SKILL.md`, `skills/create-issue/SKILL.md`

**Changes**:
- [x] Migrate the heredoc sites and delete the entries.

**Dependencies**: none beyond task 265.

### Phase 4: Issue-sync and review skills

**Risk Level**: Low

**Files**: `skills/ensure-{bug,epic,story}-github-issue/SKILL.md` (`ensure-task-github-issue` carries no allowlist entry: it is a citation-sweep site, Phase 5), `skills/review-{bug,story,task}/SKILL.md`

**Changes**:
- [x] Migrate each site and delete the entries.

**Dependencies**: none.

### Phase 5: Citation sweep and ratchet tidy

**Risk Level**: Low

**Files**: the `--body-file` posting sites not yet citing the recipe; the ratchet test

**Changes**:
- [x] Cite `file-write-rules.md#fresh-body-post` at each remaining site, or list it as excluded with a reason in the QA report.
- [x] With the allowlist empty, delete it and assert the count is zero.

**Dependencies**: Phases 1-4.

---

## 7. Files Summary

Population commands: `git grep -nE "(cat|tee)[^|]*<<-?['\"]?[A-Za-z_]+['\"]?" -- 'skills/*/SKILL.md' 'shared/resources/*.md'` for the heredocs, and the `--body-file` command in § 3 for the posting files. Both figures decay: the ratchet test's own non-vacuity count (31 on 2026-11-20, 22 allowlist rows) and `git grep -l` (32 files on 2026-11-20) are the measurements, and this document's earlier "32" and "31" were the filing-day readings.

**Core**: the 32-line allowlist's files (listed in the ratchet test); `shared/resources/tests/payload-heredoc-ratchet.test.mjs`.
**Generated**: `skills/*/references/` copies, via `npm run bundle`.
**Docs**: `CHANGELOG.md`.

---

## 8. Testing Strategy

- **Ratchet**: `CI=true command node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs` stays green after every deletion; mutation-prove the final state by adding one heredoc and seeing it red.
- **Runnable prose**: `qa-execute-snippets.mjs` over every changed fenced block (QA Step 4b).
- **Bundle**: `npm run bundle -- --check` reports 0 problems; `CI=true npm test`.
- **Removed-literal sweep** (before the first deletion): for each heredoc line the migration rewrites, `git grep -n` its literal across the tracked tests. Files that mention heredoc payload literals on 2026-11-20: `skills/qa-task/tests/qa-task.test.js`, `skills/qa-story/tests/qa-story.test.js`, `tests/mutation-call-site-coverage.test.js`, `tests/fenced-bash-positional-params.test.js`, `shared/resources/tests/pipeline-answers-docs.test.mjs`, `shared/resources/tests/step-8-completion-checklist.test.mjs`, `evals/shared/tests/finding-anchors-blocks.test.mjs`, `evals/shared/tests/ci-gate-parity.test.mjs`. Read each for a block located by the literal; list the ones that break and update them in the axis commit. Search again by file name for each rewritten document (`git grep -l "<basename>" -- 'tests/**' 'evals/**' '*.test.*'`) for pattern pins.

---

## 9. Success Criteria

### Functional
- [x] The ratchet's allowlist is empty and the test fails on any added payload heredoc (mutation-proven).
- [x] Every changed block that `qa-execute-snippets.mjs` classes as runnable still runs clean (1 of about 30 changed blocks; the rest are tracker or `gh` posts and placeholders, held by the test suites instead), approved by the repository owner on 2026-11-20.

### Performance
- [x] `CI=true npm test` wall time is within 10% of `develop`, measured with `uptime; time CI=true npm test` on the PR head and on `develop` on the same machine (the LAN server), the two figures and their `uptime` load recorded in the QA report's Findings section.

### Code Quality
- [x] `npm run bundle -- --check` reports 0 problems and `npm run validate -- skills/<changed-skill>/` passes for each changed skill.

### Migration
- [x] `CHANGELOG.md` has an `[Unreleased]` entry citing (task 284).
- [x] Each remaining `--body-file` posting site cites the fresh-body-post recipe or is listed as excluded with a reason in the QA report.

---

## 10. Risk Assessment

### Medium

1. **A migrated block loses a behaviour the heredoc carried** (variable expansion in an unquoted heredoc). Mitigation: for each site, check whether it relied on expansion and substitute the value into the file text explicitly. Rollback: revert the axis commit.

### Low

1. **Bundled copies drift.** Mitigation: `npm run bundle` per commit; `--check` in CI.

---

## 11. Rollback Plan

**Immediate (< 1 hour)**: revert the axis commit that broke a block; the allowlist entry returns with it.
**Partial**: keep the axes already migrated; each axis is independent.
**Rollback triggers**: a QA Step 4b execution failure on a migrated block, or `bundle --check` failing.
**Forward fix**: a single mis-migrated block is fixed in place.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-20
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.284.qa.5.migrate-payload-heredocs-to-file-tool.md](./task.284.qa.5.migrate-payload-heredocs-to-file-tool.md)
- **Gate File**: [task.284.gate.5.migrate-payload-heredocs-to-file-tool.yml](./task.284.gate.5.migrate-payload-heredocs-to-file-tool.yml)

### Test Coverage Summary
- **Tests Executed**: 8670
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All four bugs are fixed and closed. The citation criterion holds: every body-file site is cited or listed as excluded with a reason in the QA report. PR CI on the head was pending when read.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.284.qa.5.migrate-payload-heredocs-to-file-tool.md`
**Gate File**: `task.284.gate.5.migrate-payload-heredocs-to-file-tool.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** all 6 success criteria met. Criterion 2 was narrowed by the repository owner on 2026-11-20 and reads as approved.
✅ **Tests:** the ratchet test asserts an empty result and was mutation-proven; the full suite wall time is within 10% of `develop` (head median 618,157 ms, base median 618,433 ms, ten runs, QA report 1).
✅ **PR Review:** PR #923, review verdict APPROVE (`task.284.pr-review.1.migrate-payload-heredocs-to-file-tool.md`); CI green on the head.
✅ **Documentation:** `CHANGELOG.md` `[Unreleased]` cites (task 284); bundled copies regenerated, `bundle:check` 129 skills, 0 problems.
✅ **Security Review:** PASS — 18 probe candidates executed, none reproduced; one spec challenge left for the owner.
✅ **Compliance Review:** not applicable (no data, payments, UI or health data).

**Detailed Verification Log:** See `task.284.dod.1.migrate-payload-heredocs-to-file-tool.md` for the complete verification evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-11-20

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                                 | Author      |
| ---------- | ------- | --------------------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — migration half of the task 265 split (QA T265-QA-1/2)       | create-task |
| 2026-11-20 | 1.1     | Review passed (8/10) — added resume-contract site, lock-heredoc expansion note, qa-fix/ensure-task scope corrections, removed-literal sweep, measured perf criterion | review-task |
| 2026-11-20 |         | Status → ready-for-development                                              | review-task |
| 2026-11-20 |         | All 31 payload heredocs migrated, allowlist emptied, CI-parity gate green; status → ready-for-review | develop-task |
| 2026-11-20 |         | QA gate CONCERNS (90/100) — 2 findings                                      | qa-task |
| 2026-11-20 |         | QA findings fixed — 2 bugs Ready for QA, 1 iteration                        | qa-fix |
| 2026-11-20 |         | QA gate CONCERNS (90/100) — 1 finding (bugs 1 and 2 closed)                 | qa-task |
| 2026-11-20 |         | QA findings fixed — 1 bug Ready for QA, 1 iteration                         | qa-fix |
| 2026-11-20 |         | QA gate PASS (100/100) — 0 findings (bug 3 closed)                          | qa-task |
| 2026-11-20 |         | PR review findings fixed — citation sweep completed, pr_number, scope note, footer status; 1 iteration | qa-fix |
| 2026-11-20 |         | QA gate CONCERNS (90/100) — 1 finding (review-code citation wrong)          | qa-task |
| 2026-11-20 |         | QA findings fixed — 1 bug Ready for QA, 1 iteration                         | qa-fix |
| 2026-11-20 |         | QA gate PASS (100/100) — 0 findings (bug 4 closed)                          | qa-task |
| 2026-11-20 |         | Success criterion 2 narrowed by the owner to the blocks `qa-execute-snippets` classes runnable (finalise DoD found the original wording unmet for 29 of about 30 blocks); head wall time re-measured in QA report 1 | finalise |
| 2026-11-20 | 1.2     | Accepted — all six criteria met, wall time re-measured (PR #923)            | finalise    |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1
- [x] Phase 2
- [x] Phase 3
- [x] Phase 4
- [x] Phase 5

## References

- Task 265 (the rule, recipes and ratchet): `docs/tasks/task.265.skill-prose-follows-the-file-write-rules/`
- Observations #15, #85, #88, #106, #123, #158

## Notes

Depends on task 265 and is the migration half of the split noted in `docs/tasks/task-registry.md`.

---

**Status:** Ready for Review
