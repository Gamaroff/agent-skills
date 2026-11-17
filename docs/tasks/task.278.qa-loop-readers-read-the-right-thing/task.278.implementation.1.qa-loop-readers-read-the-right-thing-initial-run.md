# Implementation Report: QA loop readers read the right thing

**Task**: `task.278.qa-loop-readers-read-the-right-thing.md`
**Run Number**: 1
**Started**: 2026-11-16 17:31
**Status**: In Progress
**Report format**: 2

---

## Summary

Fix three QA-loop readers that classify on the wrong input: the narrowing-residue file fold, the 5c carry on the fix path, and the gate reader's top-level status.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | defaults (no skills-config.yaml)                                           |
| Board status        | N/A (no issue linked)                                                      |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.278.*` exists in git                              | Branch created at `76f4d35ae` | —                    | 2026-11-16T17:32Z |
| 2. review-task             | ✅ Done | `task.278.review.{N}.{name}.md` exists (or skip logged)                | Review 1: 7/10 → 9/10 after 4 Important + 2 Optional fixes; status → ready-for-development; pre-pass subagents not dispatched (done inline) | —                    | 2026-11-16T17:35Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Phases 1–4 done inline; ci:fast green; perf −3.5% | —                    | 2026-11-16T20:28Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #915; no `github_issue` on the task, so no issue comment | —                    | 2026-11-16T20:29Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.278.qa.{N}.*.md`; `task.278.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 4 QA cycles; gate 4 PASS 95; criterion 3 amended by the owner; 5c APPROVE; PR comment not posted (finalise posts the canonical summary) | —                    | 2026-11-17T03:46Z |
| 7. finalise                | ✅ Done | `task.278.dod.{N}.*.md`; task `status: accepted`                       | DoD 1 ACCEPTED, 8 of 8 criteria; #4 re-measured +6.6%; CI reading 1 SUCCESS @ ce14eebb6c72; CI reading 2 SUCCESS (tree-equivalent to ce14eebb6c72) @ 71ad0338c1af; canonical PR comment posted; no tracker issue | —                    | 2026-11-17T07:00Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Implementation report committed in the Step 8 commit | —                    | 2026-11-17T07:10Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-16

- Feature branch base: develop — source: recommended (`--defaults`, develop-next autonomous run)
- PR target branch: develop — source: recommended (`--defaults`, develop-next autonomous run)
- Pipeline mode: standard — source: detector (no `risk_level`; task plan has 4 phases)
- qa-planning gate: skipped (auto — no prompt)
- Phase 0b: no previous run detected (no branch, PR or report) — fresh start
- Questions asked: 0 (the resolver answered everything)

### Step 3 — develop (inline)

- Pre-develop surface map: done inline, not by a subagent. Independent review did not run for the map or the pre-pass.
- `/develop` was not invoked: a plan file exists and the surface map was done inline.
- Phase 1 re-scoped: the quoted-text filter already existed; the defect was within one line (quoted text at a key position). Found by running the reader, not reading it.
- Phase 2: `foldTestFilesIntoSubjects` folds a test file into its production MEDIUM only when `testArtifactGlobs` is set. Unconfigured consumers keep `medium-files-differ`.
- Phase 3: `fix_path` counts only for a `.md` directly in the work item directory that is a docs path. Anything else reads as absent.
- Migration check: 14 of 1021 committed gates read differently (2202 entries). All 14 were the old reader taking `status` or `category` from quoted prose.
- Mutation proofs: each phase's behaviour reverted → tests red (8, 1, 2 failures); restored → green.
- `ci:fast` on the LAN server: green, 8528 pass, 0 fail, 3 skipped.
- Performance (`CI=true npm run test:remote -- --run test`, five alternating runs, develop vs branch, LAN server; secs, load-1m at start): develop 1093 (16.3), 770 (11.9), 875 (10.7), 726 (0.2), 728 (0.5); branch 878 (2.7), 1196 (18.8), 743 (1.7), 725 (0.2), 726 (0.8). Median develop 770, branch 743 (−3.5%), within 10%. The two quiet-server pairs agree within 2 s. The server is shared, so the loaded pairs are noise.

- QA Cycle 2 — changes-requested: gate 2 CONCERNS (3 MEDIUM, HIGH 0); T278-QA-5 and T278-QA-6 go to qa-fix, T278-QA-2 needs an approver and cannot be fixed by it.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **T278-QA-2 escalated, not fixed (QA cycle 1).** Success criterion 3 says every other `readTopIssues` consumer passes its existing fixtures unchanged, and one pinned expectation in `accept-qa-residual.test.mjs` moved from the refuses list to the edits list, because the old expectation encoded the defect. The criterion is not reworded. The deviation and its evidence are in the task's Notes. It needs an approver's `approved by <name>`; the finding stays open.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-16
**Gate Result**: CONCERNS
**Issues Found**: 4 MEDIUM — T278-QA-1 CHANGELOG entry missing; T278-QA-2 an existing consumer fixture changed against criterion 3; T278-QA-3 globs wiring has no committed test; T278-QA-4 the `fix_path` boundary has no engine probe
**HIGH findings**: 0
**MEDIUM findings**: 4
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)

- T278-QA-1: CHANGELOG `[Unreleased]` entry cites (task 278); `changelog-cites.sh` answers `cites`.
- T278-QA-3: wiring test runs the narrowing block with globs set, empty, unset and unparseable, in bash and zsh. Mutation: reading `[]` instead of argv[5] → 2 fail, restored byte-identical, 13 pass.
- T278-QA-4: `fixPathTarget` moved into `ci-tree-equivalence.js`; the block calls it. Probe corpus `tests/fixtures/probe/fix-path-target.cases.json` (12 cases): engine verdict `engages`, 12 executed. Mutation: directory check removed → committed test 1 fail and probe `present-but-inert`; restored, 116 pass.
- T278-QA-2: not fixed. Deviation recorded in the task Notes; criterion untouched; needs an approver.
- Probe: `git grep -l -F -i fix_path` over executed documents → 4 files, all already edited by this task; none describes the predicate as inline (unaffected). Population: 4. Move: patch — distinct defects.
- Validation: `ci:fast` on the LAN server, 8531 pass, 0 fail, 3 skipped; `bundle --check` 0 problems.

### QA Cycle 2 — 2026-11-16
**Gate Result**: CONCERNS
**Issues Found**: 3 MEDIUM — T278-QA-2 criterion-3 deviation still awaits an approver; T278-QA-5 `fixPathTarget` does not normalise the work-item directory; T278-QA-6 the fold's dash-cut has no floor
**HIGH findings**: 0
**MEDIUM findings**: 3
**Traceability**: skipped (no Success Criteria table)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)

- T278-QA-5: `fixPathTarget` normalises `workItemDir` (and strips a trailing slash) before comparing. New test: five spellings of one directory match their own file; four other directories do not. Mutation: normalisation removed → 1 fail; restored.
- T278-QA-6: the fold cuts a test stem only at a named test kind (`differential`, `property`, `fuzz`, `integration`, `unit`, `e2e`, `regression`, `contract`, `snapshot`); other dash segments stay a separate subject. New fixture `medium-code-and-prefix-test.yml` and row 21 (`user-service` vs `user` stays two subjects); the motivating `open-coverage-differential` pair (row 17) still folds. Mutation: allow-list removed → row 21 red; restored byte-identical.
- T278-QA-2: unchanged, still needs an approver.
- Probe: `git grep -l -F -i -e 'its own test' -e 'cut back' -e 'differential-test'` over executed documents → the step doc's `$TEST_ARTIFACT_GLOBS_JSON` row restated the fold and now names the kind suffix (updated); the other hits (`develop-pipeline-resume-contract.md`, `qa-re-review-scope.md`, `target-types.md`, `create-skill/SKILL.md`) restate nothing about the fold (unaffected). Population: 5 (1 updated). Move: patch — two distinct defects in the deliverable.
- Validation: `ci:fast` on the LAN server, 8533 pass, 0 fail, 3 skipped; `bundle --check` 0 problems.

### QA Cycle 3 — 2026-11-17
**Gate Result**: CONCERNS
**Issues Found**: 1 MEDIUM — T278-QA-2 criterion-3 deviation awaits an approver; QA-5 and QA-6 closed
**HIGH findings**: 0
**MEDIUM findings**: 1
**Traceability**: skipped (no Success Criteria table)
**PR Review**: pending — 5c not yet run
**Loop exit**: n/a — this exit not taken
**Action**: Owner amended criterion 3 (approved by Lorien Gamaroff, 2026-11-17) in place of a fix cycle; re-running qa-task as cycle 4

### QA Cycle 4 — 2026-11-17
**Gate Result**: PASS
**Issues Found**: 0
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (no Success Criteria table)
**PR Review**: APPROVE (conformance lens; 1 low finding PC-1 fixed — `pr_number: 915` added) — task.278.pr-review.1.qa-loop-readers-read-the-right-thing.md
**Loop exit**: PASS gate — proceeding to 5c (PR conformance review)
**Action**: Proceeding to 5c (PR conformance review)

### Step 7 — finalise (2026-11-17)

- Criterion #4 was the only gap on the first pass: the cycle 1 figure (−3.5%) predated the cycle 2 code change. Re-measured on the LAN server at head ce14eebb6c72, five alternating runs: develop 717, 777, 1068, 722, 721 s; branch 920, 770, 958, 736, 719 s; median 722 vs 770 s = +6.6%. Load beside each run is in the DoD file. Re-judged by a scoped re-run (1 re-judged, 7 carried); the AC YAML was edited from the first pass's copy (`verified: false`).
- CI reading 1: SUCCESS @ ce14eebb6c72 (all six checks). CI reading 2: SUCCESS (tree-equivalent to ce14eebb6c72) @ 71ad0338c1af; the head's own checks also finished green (`test` 4m40s).
- A background wait was reaped for low memory once; it was not restarted. The poll itself finished.
- Acceptance commit 71ad0338c; canonical PR comment posted on #915. No `github_issue`, so no tracker step.

---

## Completion

**Finished**: 2026-11-17T07:10Z
**Final Status**: Completed
**Branch**: feature/task.278.qa-loop-readers-read-the-right-thing
**PR**: #915
**QA Iterations**: 4
**DoD Summary**: ACCEPTED — `task.278.dod.1.qa-loop-readers-read-the-right-thing.md`
**Tracker debt**: none (no linked issue)
