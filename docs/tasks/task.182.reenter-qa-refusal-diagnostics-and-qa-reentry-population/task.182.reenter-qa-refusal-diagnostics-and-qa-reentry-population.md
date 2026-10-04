---
id: task.182
title: "[Task 182] reenter-qa refusal diagnostics and the qa_reentry reader population"
type: task
description: "Follow-ups from task.170's PR review 2. The no-gate refusal in reenter-qa-after-finalise.sh discards qa-cycle.sh's stderr, so three different gate states print one message. A failing git status reads as a clean tree. And the qa_reentry lock field, plus the second writer of qa_max_cycles and qa_phase, never reached the hooks doc, the resume detector prompt or the lock-fields parity test."
tags: [develop-task, develop-story, resume, pipeline-lock, qa-loop, review-follow-up]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-04
updated: 2026-10-04
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 565
---

# Technical Task: reenter-qa refusal diagnostics and the `qa_reentry` reader population

**Status:** Planned

**GitHub Issue**: [#565](https://github.com/Gamaroff/agent-skills/issues/565)

---

## 1. Overview

This task closes the three code-review findings that task.170's Step 5c review ([`task.170.pr-review.2`](../task.170.qa-reentry-after-finalise-gaps/task.170.pr-review.2.qa-reentry-after-finalise-gaps.md)) carried past its merge:

- **CR-1 (medium):** the `no-gate` refusal says which of three states caused it.
- **CR-3 (low):** a failing `git status` refuses the re-entry instead of reading as a clean tree.
- **CR-2 (medium):** every document that names a QA-loop lock field or its writer also names `qa_reentry` and the second writer. The lock-fields parity test enforces that population.

**Deliverables:** a script change and its tests; the hooks doc, detector prompt and contract edits; the extended parity test.

**Outcome:** an operator who hits a `no-gate` refusal can tell a missing gate from an ambiguous one without re-running `qa-cycle.sh` by hand. No lock-field reader is blind to `qa_reentry`.

## 2. Motivation

### Current Problems

- **One refusal for three states (CR-1).** `reenter-qa-after-finalise.sh` calls `qa-cycle.sh` twice with `2>/dev/null` (`shared/resources/reenter-qa-after-finalise.sh:161-162` *(`GATE=$(bash "$QA_CYCLE_SH" "$DOC_DIR" --path gate 2>/dev/null)`)*). It then refuses with a fixed string (`:164` *(`refuse no-gate "qa-cycle.sh found no single current gate in '$DOC_DIR'"`)*). `qa-cycle.sh` reports three causes on stderr, and all of them are discarded:
  - no gate file (`shared/resources/qa-cycle.sh:102`);
  - gate files with no cycle number (`:100`);
  - two files claiming one cycle (`:125`).

  The contract's route for `no-gate` (`shared/resources/develop-pipeline-resume-contract.md:632`) tells the operator to "resolve the gate files first if the refusal names an ambiguity". The refusal can never name one.
- **A failed read is a clean tree (CR-3).** The uncommitted-fix check is `DIRTY=$(git status … 2>/dev/null)` (`reenter-qa-after-finalise.sh:169`). If `git status` fails, `DIRTY` is empty and the check passes. The script can then go on to refuse `no-code-moved`, whose route resumes `/finalise` at step 7. That is the one outcome the script exists to prevent. It needs a failing git (index lock, corrupt index), so it is rare, but it fails open.
- **The reader population stopped at task.123 (CR-2).** task.170 added the `qa_reentry` field and a second writer of `qa_max_cycles` and `qa_phase`. They were not carried to two readers:
  - `shared/resources/develop-pipeline-hooks.md:86` says `qa_max_cycles` and `extra_cycles_granted` are "written together at a resume after a loop-limit halt" and does not mention `qa_reentry`.
  - `shared/resources/pipeline-resume-detector-prompt.md:115-117` lists the QA-loop fields the detector reports. It has no `qa_reentry` line (`git grep -c qa_reentry` → 0).

  The parity test that pins lock-field spellings across files (`evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`, `FILES` table at line ~45) has no `qa_reentry` entry. So nothing notices the gap.

### Benefits of the Fix

- A `no-gate` refusal carries `qa-cycle.sh`'s own reason line. The contract's ambiguity route becomes reachable.
- The uncommitted-fix check fails closed. An unreadable tree never routes to step 7.
- A resume detector reports a re-entered lock as a re-entry. The hooks doc names both writers.
- The parity test enforces `qa_reentry` in every file that participates, so the next new reader cannot be missed silently.

## 3. Technical Background

### Current Architecture

- **The no-snapshot pattern to copy.** The `no-snapshot` refusal already passes a helper's stderr through. `reenter-qa-after-finalise.sh:121-126` sends `--restore --which`'s stderr to a `mktemp` file, reads it into `WHY`, prints it with the `advance-pipeline-lock:` prefix rewritten to `reenter-qa:`, and then refuses. The `no-gate` path does not do this.
- **qa-cycle.sh's two modes.** Plain mode prints the cycle, or exits 1 with a reason line on stderr. `--path gate` prints the file, or exits non-zero with a reason. "Two files claim one cycle" (`qa-cycle.sh:125`) fails only under `--path`. Plain mode returns the cycle number for it. So the reason must come from whichever call failed.
- **Refusal list ↔ script parity.** `evals/shared/tests/reenter-qa-refusals-parity.test.mjs` asserts three things. The contract's list between the `<!-- reenter-qa-refusals: start/end -->` markers equals the script's `refuse <reason>` calls. The script header documents each reason. Every listed reason carries a route.
- **Lock-field parity.** `qa-loop-lock-fields-parity.test.mjs` maps each lock field to the files that read or write it (the `FILES` table). It asserts the exact spelling in each, and that the helper stays monotonic.

### Target Architecture

- `no-gate` captures both `qa-cycle.sh` calls' stderr. On refusal it prints the captured reason line(s) as `reenter-qa:`-prefixed lines on stderr before the `refused (no-gate)` line. The reason `no-gate` and its route are unchanged.
- The uncommitted-fix check reads `git status`'s exit code. On a non-zero exit it refuses with a new reason, `git-unreadable`, whose route is **back to the operator, never step 7**. This is the same route as `uncommitted-fix`, and it is added to the contract's refusal list and the script header.
- `develop-pipeline-hooks.md:86` names `qa_reentry` and both writers of `qa_max_cycles` / `qa_phase`.
- The detector prompt gains a `qa_reentry` line. It reports `{from_step, reason, gate_head}` in `deltas_since_pause` so the operator sees the run is a re-entry.
- The lock-fields parity test gains `qa_reentry`, with its writer (`reenter-qa-after-finalise.sh`) and its readers (resume contract, pause doc, hooks doc, detector prompt, both develop-* SKILL.md).

### Important Clarifications

- **Scope of the population sweep (measured, not recalled).** The population is the sources that name a QA-loop lock field:
  `git grep -ln -E 'qa_max_cycles|extra_cycles_granted|qa_phase|qa_reentry' -- shared/resources skills/*/SKILL.md evals scripts | grep -v '/references/'`
  On 2026-10-04, for `qa_max_cycles|extra_cycles_granted`, it returned 21 paths: 6 eval fixtures, 11 shared sources, 2 SKILL.md, the parity test and a report-lint fixture. `qa_reentry` appeared in 8 of them. Phase 3 re-runs the command and classifies each path: fixture, writer, reader that must name `qa_reentry`, or reader that need not. The count goes in the PR, and the test owns the enforced subset.
- The eval fixtures (`evals/*/step-isolation/12-qa-reentry-after-loop-limit-with-grant/`) are loop-limit grants, not re-entries. They are not expected to carry `qa_reentry`.

## 4. Scope

### In Scope

✅ `shared/resources/reenter-qa-after-finalise.sh`: the `no-gate` stderr pass-through, and the `git-unreadable` refusal
✅ `shared/resources/reenter-qa-after-finalise.test.sh`: the three `no-gate` causes, and the git-failure case
✅ The contract refusal list (`develop-pipeline-resume-contract.md`), so it gains `git-unreadable` with its route
✅ `develop-pipeline-hooks.md` and `pipeline-resume-detector-prompt.md`: carry `qa_reentry` and the second writer
✅ `qa-loop-lock-fields-parity.test.mjs`: carries `qa_reentry`
✅ CHANGELOG `[Unreleased]`; regenerated bundled copies

### Out of Scope

❌ Changing what `no-gate` routes to. The fix is the message, not the decision.
❌ The other carried follow-ups: gate 6 CR-1/2/3, gate 7 CR-1 (the bash 3.x runtime suite) and PR review 2 PC-2. Each is low and unrelated to these three.
❌ task.181's `shell-argv:` probe form. That is a separate branch and task.

## 5. Breaking Changes

None. The API is stable. `no-gate` keeps its reason and route, and gains stderr lines above it. `git-unreadable` is a new refusal on a path that used to fall through. A caller reading the exit code sees 1 for both, as for every refusal.

## 6. Implementation Plan

> Detailed implementation guide: [task.182.plan.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md](task.182.plan.reenter-qa-refusal-diagnostics-and-qa-reentry-population.md)

### Phase 1: Tests first (red)

- **Risk:** Low
- **Files:** `shared/resources/reenter-qa-after-finalise.test.sh`, `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`
- [ ] For each of the three `no-gate` causes (no gate file; an unnumbered gate file; two gate files claiming one cycle), the refusal exits 1, reads `refused (no-gate)`, and its stderr contains `qa-cycle.sh`'s reason fragment for that cause. Write the fragments from the measured messages at `qa-cycle.sh:100`, `:102` and `:125`.
- [ ] A `git` that fails on `status` (a PATH stub, the same technique as the suite's failed-write case with its `jq` stub) gives `refused (git-unreadable)`, exit 1, no lock written and no snapshot consumed.
- [ ] The parity test pins `qa_reentry` in its writer and each named reader.
- [ ] All three go red on current code.

### Phase 2: The script

- **Risk:** Low
- **Files:** `shared/resources/reenter-qa-after-finalise.sh`, `shared/resources/develop-pipeline-resume-contract.md`
- [ ] Capture both `qa-cycle.sh` calls' stderr, as the `no-snapshot` block does, and print it before `refuse no-gate`.
- [ ] Add `|| refuse git-unreadable "…"` on the `git status` read. The branch: **condition** = `git status` exits non-zero; **outcome** = `refused (git-unreadable)`, before any write.
- [ ] Add `git-unreadable` to the script header and to the contract's refusal list, with **Route:** back to the operator, never step 7.
- [ ] `npm run bundle`.

### Phase 3: The reader population

- **Risk:** Low
- **Files:** `shared/resources/develop-pipeline-hooks.md`, `shared/resources/pipeline-resume-detector-prompt.md`
- [ ] Re-run the population command from §3 and classify every path. Record the count and the command in the PR.
- [ ] Hooks doc line 86: name `qa_reentry`, and say `qa_max_cycles` / `qa_phase` have two writers (`grant-qa-cycles.sh` and `reenter-qa-after-finalise.sh`).
- [ ] Detector prompt: add a `qa_reentry` line under "QA-loop fields" with its `deltas_since_pause` shape.
- [ ] CHANGELOG `[Unreleased]` › Fixed, citing task 182. Re-run `npm run bundle`.

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/reenter-qa-after-finalise.sh`: `no-gate` stderr pass-through; `git-unreadable` refusal; header
2. ✅ `shared/resources/develop-pipeline-resume-contract.md`: `git-unreadable` in the refusal list

### Files to Modify (Documentation — the reader population)

3. ✅ `shared/resources/develop-pipeline-hooks.md`: line 86
4. ✅ `shared/resources/pipeline-resume-detector-prompt.md`: QA-loop fields
5. ✅ `CHANGELOG.md`: `[Unreleased]` › Fixed

### Files to Modify (Tests)

6. ✅ `shared/resources/reenter-qa-after-finalise.test.sh`
7. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`

### Files Regenerated

8. ✅ Bundled `references/` copies of the files above. `npm run bundle` regenerates them; never hand-edit them.

### Files to Delete

None.

## 8. Testing Strategy

### Unit Tests

- **Scope:** the three `no-gate` causes, the `git-unreadable` refusal, and the parity test's new rows.
- **Commands:** `bash shared/resources/reenter-qa-after-finalise.test.sh`; `command node --test evals/shared/tests/qa-loop-lock-fields-parity.test.mjs evals/shared/tests/reenter-qa-refusals-parity.test.mjs`.

### Integration Tests

- **Scope:** `npm run ci:fast` (Prettier and the full `npm test`) and `npm run bundle:check`.

### Mutation proof

- Revert the stderr capture: the three cause cases go red.
- Remove `|| refuse git-unreadable`: the git-failure case goes red.
- Delete `qa_reentry` from the detector prompt: the parity test goes red.
- Each proof is recorded in the PR.

### Performance Tests

None needed. The change adds one `mktemp` on the refusal path.

### Consumer Tests

- The develop-task and develop-story Phase 0b re-entry is unchanged on the accept path. The suite's accept cases must stay green.
- Run the suite under `/bin/bash` 3.2 on macOS (task.170 DoD gap 1).

## 9. Success Criteria

### Functional

- [ ] Each of the three `no-gate` causes refuses `no-gate` (exit 1). Its stderr carries `qa-cycle.sh`'s reason for that cause (Phase 2, first bullet).
- [ ] A `git status` that exits non-zero refuses `git-unreadable` before any write. No lock is lowered and no snapshot is consumed (Phase 2, second bullet).
- [ ] The contract's refusal list equals the script's reasons, including `git-unreadable` (`reenter-qa-refusals-parity.test.mjs`).
- [ ] The hooks doc and the detector prompt name `qa_reentry`. The hooks doc names both writers of `qa_max_cycles`.

### Performance

- [ ] No measurable change. The accept path makes no extra calls.
- [ ] The re-entry suite's runtime stays within its current order of magnitude.

### Code Quality

- [ ] ShellCheck `--severity=warning` is clean on the changed `.sh`. Prettier is clean.
- [ ] `npm test` is green, and so is `npm run bundle:check`.
- [ ] Each new case is mutation-proven.

### Migration

- [ ] CHANGELOG `[Unreleased]` › Fixed cites task 182.
- [ ] No consumer migration (a new refusal on a formerly fall-through path).

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The parity test keys on a shared token** (obs #135)
   - Risk: `qa_reentry` is a unique string. But a test keyed on `qa_max_cycles` alone also matches the loop-limit grant's prose.
   - Probability: Medium. Impact: a test that is red at the wrong site.
   - Mitigation: pin `qa_reentry` per file in the `FILES` table, the same way the existing fields are pinned. Do not use a population-wide grep.

### Low Risk Areas

1. **A stub `git` leaks into other cases.** Mitigation: scope the PATH stub to the one subshell, as the `jq` stub is scoped.
2. **The reason text drifts.** If `qa-cycle.sh` rewords a message, the cause cases go red. Mitigation: match a stable fragment ("no gate file", "carry no cycle number", "claim cycle"), not the whole line.

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** the re-entry accept path refuses on a correct resume, or `npm test` goes red on `develop` after merge.
- **Steps:**
  1. `git revert` the merge commit.
  2. `npm run bundle`.
  3. Push.
- **Validation:** `bash shared/resources/reenter-qa-after-finalise.test.sh` passes at the task.170 count (53).

### Partial Rollback (1–2 hours)

- Revert Phase 2's `git-unreadable` alone (script, header, contract line and test case) if it misfires on a healthy tree. Keep the stderr pass-through and the population.

### Forward Fix (< 4 hours)

- A reason fragment that no longer matches after a `qa-cycle.sh` rewording: update the fragment.

### Rollback Triggers

- **Critical:** the accept path refuses on a healthy tree.
- **Non-critical:** a reworded stderr line. Fix this forward.

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-04 | 1.0 | Initial draft — from task.170 PR review 2 (CR-1, CR-2, CR-3) | create-task |

<!-- change-log-end -->

## Progress Tracking

### Phase 1: Tests first (red)

- [ ] No-gate cause cases, the git-failure case and the parity rows written, and red

### Phase 2: The script

- [ ] Stderr pass-through, `git-unreadable`, contract line, bundle

### Phase 3: The reader population

- [ ] Population measured and classified; hooks doc, detector prompt, CHANGELOG

## References

- [`task.170.pr-review.2`](../task.170.qa-reentry-after-finalise-gaps/task.170.pr-review.2.qa-reentry-after-finalise-gaps.md): the source findings (CR-1, CR-2, CR-3)
- [task.170](../task.170.qa-reentry-after-finalise-gaps/task.170.qa-reentry-after-finalise-gaps.md): the mechanism; this task's findings are listed in its QA Testing Results › Deferred Work

## Notes

- QA artifacts land beside this document: `task.182.qa.{N}.*.md`, `task.182.gate.{N}.*.yml`, `task.182.bug.{N}.*.md`.
- task.181 (`shell-argv:` entry form) is on its own unmerged branch, `docs/task.181.probe-engine-shell-argv`. This task takes the next number after it.
