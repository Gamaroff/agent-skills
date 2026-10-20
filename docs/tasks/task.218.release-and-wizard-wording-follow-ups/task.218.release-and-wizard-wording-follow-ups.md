---
id: task.218
title: "Release runbook and setup wizard wording follow-ups"
type: task
description: "Fix five low wording defects task.199's QA gate 4 carried to future work: the release runbook's develop-sync section opens with a dangling Otherwise and leaves the operator on develop, the wizard's approve summary points at a checklist it never named, the wizard's section banners use older step numbers than its header, and restricted-access.md omits the autonomous-run fallback for approve."
tags: [docs, release, setup-consumer, restricted-access, follow-up]
category: documentation
status: accepted
priority: Low
created: 2026-10-20
updated: 2026-10-20
assignee:
estimated_effort_hours: 2
github_issue: 705
completed_date: 2026-10-20
pr_number: 707
---

# Technical Task: Release runbook and setup wizard wording follow-ups

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.218.review.1.release-and-wizard-wording-follow-ups.md` implemented 2026-10-20

**GitHub Issue**: [#705](https://github.com/Gamaroff/agent-skills/issues/705)

---

## 1. Overview

task.199 (PR #704, merged 2026-10-20) brought the setup, configuration and process docs in line with the scripts. Its QA gate 4 passed at 94 and carried five low wording points to future work (`task.199.gate.4.setup-config-and-process-docs.yml`, `recommendations.future`). This task fixes all five. No script behaviour changes.

**Scope**: `docs/runbooks/release-and-install.md` §4, `scripts/setup-consumer.sh` (comment banners, the header list and one `echo` string), `docs/concepts/restricted-access.md` (Limits item 2 and the mode table), and `CHANGELOG.md`.

**Key deliverables**:

1. The release runbook's §4 opens with its condition, and every path through it (the manual block and both mid-sync recoveries) ends where `release.sh` ends: on `main`.
2. The wizard's closing summary names the checklist that `/tracker-reconcile` ticks, and its section banners use the header's step numbers.
3. `restricted-access.md` names both cases where `approve` falls back to `command`: no tty, and an autonomous run.

**Expected outcome**: every item in gate 4's `recommendations.future` that names a doc or a wording defect is closed. The two that remain are routed elsewhere (see Scope).

---

## 2. Motivation

### Current Problems

1. **The recoveries leave the operator on `develop`** (QA-8). In `docs/runbooks/release-and-install.md` §4, the merge-conflict and push-rejected bullets stop at `git push origin develop`. `release.sh`'s sync block ends with `git checkout main` (`scripts/release.sh:605`, inside `# ── 5. sync develop`). An operator who follows the runbook ends on a different branch from one whose run succeeded.
2. **§4 opens with a dangling "Otherwise"** (QA-9). `release-and-install.md:62` starts "Otherwise `--tag` has already merged `main` into `develop`…". Nothing before it sets up the contrast, because the heading `### 4. Sync \`develop\` forward` comes straight before it.
3. **"ticks that checklist" has no referent under `approve`** (QA-10). `scripts/setup-consumer.sh:2238` (`echo "  Later, /tracker-reconcile re-reads the board and ticks that checklist."`) is shared by both branches. Only the `else` branch names `*.handover.*.md`. Rendered under `ACCESS_TRACKER=approve` (command in §8), the summary says "that checklist" right after a sentence about `*.sh`.
4. **The section banners use older numbering than the header.** The header (`setup-consumer.sh:6-19`) says its numbering "matches docs/concepts/getting-started.md § What the wizard does". The banners do not match it:

   | Banner (line) | Function | Header / getting-started step |
   | --- | --- | --- |
   | `2a. skill install profile` (303) | `select_skill_profile` | 2b |
   | `2b. tracker access level` (349) | `select_access` (called from `select_platform`, `:300`) | part of 2 |
   | `5b. tracker-workflow.yaml` (676) | `write_tracker_workflow` | 8a |
   | `8b. install profiles (task 84)` (1185) | profile helpers for `install_skills` | part of 8 |
   | `agent links` (1934), unnumbered | `link_agents` | 8b |

   The header also leaves out the skill-profile step that getting-started lists as 2b.

   The table comes from `grep -n '^# ── ' scripts/setup-consumer.sh`: 22 banners at `965c7e19`. Most name a helper block (`colours`, `flags`, `summary`); the five above are the ones whose step number disagrees with the header, or that run as a numbered step without one.
5. **`restricted-access.md` names only one fallback for `approve`.** Limits item 2 (`docs/concepts/restricted-access.md:34`, "**Without a tty it degrades to `command`**") and the mode table's `approve` row (`:72`, "degrades to `command` (sh only) without one") name only the missing tty. The step-7 finalise doc says "no tty (or an autonomous pipeline run)" (`shared/resources/develop-pipeline-step-7-finalise.md:514`). `which-access.md:51` and `configuration.md:944` already name both.

### Benefits of Fixing Them

- An operator who recovers a release by hand ends in the same state as a clean run.
- The wizard's summary and comments say the same thing as the getting-started table they cite.
- All four places that describe the `approve` fallback agree.

---

## 3. Technical Background

### Current Architecture

- **Release sync.** `release.sh --tag` merges `main` into `develop`, pushes, and returns to `main` (`scripts/release.sh:590-606`, `git checkout develop` … `git checkout main`). `--no-sync-develop` skips this. Runbook §4 covers both the manual sync and recovery from a sync that stopped partway.
- **Wizard summary.** `print_summary` (`scripts/setup-consumer.sh:2163`) prints a `Tracker access is …` block when `ACCESS_TRACKER` is not `full` (`:2228-2241`). The `approve` and `else` branches each print one line, then three shared lines follow.
- **Wizard structure.** `main` (`:2273`) calls the steps in this order: `check_prereqs`, `select_platform` (which calls `select_access`), `select_skill_profile`, `collect_env_vars`, `write_env_files`, `write_skills_config`, `create_registries`, `scaffold_docs`, `install_skills`, `write_tracker_workflow`, `link_agents`, `install_hooks`, `print_summary`. Section banners are `# ── … ──` comment lines.
- **Fallback wording.** The `approve` fallback appears in five places. `restricted-access.md:34` and `:72` name only the tty. `which-access.md:51`, `configuration.md:944` and `develop-pipeline-step-7-finalise.md:514` name both cases. Measured with `grep -rn -i "without a tty\|no tty" docs shared/resources --include=*.md`, excluding `docs/tasks/`.

### Target Architecture

- §4 opens: "Run this step only if you passed `--no-sync-develop`; otherwise `--tag` has already merged `main` into `develop` and pushed it." The manual block gains `git checkout main` as its last line, and the merge-conflict and push-rejected recoveries each end with `git checkout main`. The third recovery (`git pull --rebase` failed) sends the reader back to the manual block, so it ends on `main` too.
- The shared summary line names its artifact: "Later, /tracker-reconcile re-reads the board and ticks the committed *.handover.*.md checklist."
- Banners use the header's numbering: `2b. skill install profile`, `2. tracker access level`, `8a. tracker-workflow.yaml`, `8b. agent links`. The profile-helper banner keeps its place without a step number (`install profile helpers (task 84)`), because it holds helpers, not a wizard step. The header gains `2b. Skill install profile`. After the change two banners read `2.` (`2. platform` and `2. tracker access level`). That is intended: the header's and getting-started's step 2 covers both prompts.
- `restricted-access.md:34` and `:72` name both cases: "without a tty, or in an autonomous run".

### Important Clarifications

- **Where each block lives in the file is out of scope.** `write_tracker_workflow` stays at `:687`, between steps 5 and 6, even though it runs as 8a. Moving the function to sit in run order is a larger diff for no change in behaviour. The banner number is what a reader uses to match the code to the table.
- **The `else` branch's `*.handover.*.md` line stays as it is.** Once the shared line names the checklist, the `else` line repeats it. That is acceptable: the `else` line says what to *work* now, and the shared line says what reconcile *ticks* later.

---

## 4. Scope

### In Scope

- ✅ The five items in §2
- ✅ `CHANGELOG.md` `[Unreleased]` › Fixed

### Out of Scope

- ❌ Moving any function in `setup-consumer.sh`, or changing what it does
- ❌ Gate 4's `/qa-fix` bug-registry source gap: that is task.219
- ❌ Gate 4's cross-file anchor check: logged as observation #80 for the observation queue
- ❌ Other docs that restate the wizard steps beyond the five places named in §2

---

## 5. Breaking Changes

None. This task changes documentation, comment lines and one `echo` string. No flag, exit code, output file or config key changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.218.plan.release-and-wizard-wording-follow-ups.md](task.218.plan.release-and-wizard-wording-follow-ups.md)

### Phase 1: Release runbook §4

**Risk**: Low
**Files**: `docs/runbooks/release-and-install.md`

- [x] Open §4 with its condition (QA-9)
- [x] End the manual block and the merge-conflict and push-rejected recoveries with `git checkout main` (QA-8)

### Phase 2: Setup wizard text

**Risk**: Low
**Files**: `scripts/setup-consumer.sh`, `shared/resources/tests/setup-consumer-config.test.mjs`

- [x] Name the `*.handover.*.md` checklist in the shared summary line (QA-10)
- [x] Add a test that renders `print_summary` under `approve` and `command` and asserts the `/tracker-reconcile` line names `*.handover.*.md`
- [x] Renumber the four banners, un-number the profile-helper banner, and add `2b` to the header

### Phase 3: restricted-access.md and the changelog

**Risk**: Low
**Files**: `docs/concepts/restricted-access.md`, `CHANGELOG.md`

- [x] Name the autonomous-run fallback in Limits item 2 and the `approve` table row
- [x] CHANGELOG entry

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `scripts/setup-consumer.sh`: one `echo` string, five banner comments, one header line

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/setup-consumer-config.test.mjs`: one new test for the rendered summary. The file already sources the wizard with `SETUP_CONSUMER_NO_MAIN=1` and calls `print_summary` (`runWorkflowWriter`), and `npm test` already reaches it. The other `setup-consumer-*.test.mjs` suites must stay green.

### Files to Modify (Dependencies)

None.

### Files to Modify (Documentation)

2. ✅ `docs/runbooks/release-and-install.md`
3. ✅ `docs/concepts/restricted-access.md`
4. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

One new test in `shared/resources/tests/setup-consumer-config.test.mjs`, `rendered summary names the checklist /tracker-reconcile ticks`. For each of `approve` and `command`, it sources the wizard in a temp directory with `SETUP_CONSUMER_NO_MAIN=1` and `ACCESS_TRACKER=<mode>` in the environment, then runs `print_summary`. It asserts that:

- the line containing `/tracker-reconcile` also contains `*.handover.*.md`
- the output does not contain `ticks that checklist`
- under `command`, the branch line `After a run, work the committed *.handover.*.md checklist` is still printed

Mutation proof: restore the old `echo` and the test goes red. The rest of `npm test` must stay green.

### Integration Tests

- **Rendered summary, by eye.** From a scratch directory:
  `SETUP_CONSUMER_NO_MAIN=1 bash -c 'source <repo>/scripts/setup-consumer.sh; ACCESS_TRACKER=approve; UPDATE_ONLY=false; DRY_RUN=true; print_summary'`.
  Repeat with `ACCESS_TRACKER=command`. The review ran this at `965c7e19`, and it renders the current text. The new line is 97 columns, so it stays one `echo`.
- **Syntax.** `bash -n scripts/setup-consumer.sh` and `shellcheck --severity=warning scripts/setup-consumer.sh` (the CI gate's severity) are clean.

### Performance Tests

Not applicable.

### Consumer Tests

- `npm run ci:fast`, and the docs link check on the two changed docs (`doc-links.js --file` on each)

---

## 9. Success Criteria

### Functional

- [x] `release-and-install.md` §4's first sentence begins "Run this step only if you passed `--no-sync-develop`"
- [x] §4's manual block and both recovery bullets (merge conflict, push rejected) end with `git checkout main`, matching `release.sh`'s sync block
- [x] The rendered `approve` and `command` summaries name `*.handover.*.md` in the `/tracker-reconcile` line, held by the new `setup-consumer-config.test.mjs` test (§8 Unit Tests)
- [x] Every numbered banner in `setup-consumer.sh` (`grep -nE '^# ── [0-9]+[a-z]?\. ' scripts/setup-consumer.sh`) uses a step number from the header list, and the header lists `2b. Skill install profile`
- [x] `restricted-access.md` Limits item 2 and the `approve` table row both name "an autonomous run" beside the missing tty

### Performance

- [x] No behaviour change. `git diff develop -- scripts/setup-consumer.sh | grep -E '^[+-][^+-]' | grep -vE '^[+-]#'` prints exactly two lines, the old and new summary `echo`. Measured in the implementation report.
- [x] Under `ACCESS_TRACKER=command`, the summary's branch line is unchanged, held by the same test's third assertion

### Code Quality

- [x] `npm run ci` passes (format, tests, evals, bundle:check, shellcheck)
- [x] `bash -n scripts/setup-consumer.sh` is clean
- [x] `command node shared/resources/doc-links.js --file <doc>` reports `ok` for both changed docs

### Migration

- [x] CHANGELOG `[Unreleased]` › Fixed cites `(task 218)`
- [x] No consumer action needed: the wizard text changes on the next `setup-consumer.sh --update`

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

1. **A test pins the summary text.**
   - Risk: an assertion matches the old `ticks that checklist` string.
   - Probability: Low. `git grep -n "ticks that checklist"` finds only `scripts/setup-consumer.sh:2238` (measured at `9067ba92`).
   - Mitigation: re-run the grep before editing, and update any new hit in the same commit.
2. **A banner rename breaks a test that anchors on a banner.**
   - Probability: Low. `git grep -n "5b. tracker-workflow\|2a. skill install\|8b. install profiles"` finds only `setup-consumer.sh` (measured at `9067ba92`).
   - Mitigation: the same grep before editing.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a red CI lane caused by this task's diff.

**Steps**:
1. Revert the task's merge commit on `develop`.
2. Run `npm run ci:fast`.

**Validation**: CI is green on the revert.

### Partial Rollback (1-2 hours)

**When to use**: one phase's wording is wrong and the others are fine. Revert that phase's commit alone. The three phases touch separate files.

### Forward Fix (< 4 hours)

**When to use**: a wording problem found after merge. Fix it forward in a follow-up commit. Nothing here can break a run.

### Rollback Triggers

- **Critical**: any change to `setup-consumer.sh`'s behaviour (a non-comment line other than the summary `echo`)
- **Non-critical**: wording a reviewer would phrase differently

---

## Implementation Summary

**Completion Date:** 2026-10-20

All five wording items from task.199's gate 4 are fixed. A new test checks the wizard's rendered summary under `approve` and `command`. No script behaviour changed.

### Approach

| Item | File | Change |
| --- | --- | --- |
| QA-9 | `docs/runbooks/release-and-install.md` | §4 opens with its condition |
| QA-8 | `docs/runbooks/release-and-install.md` | The manual block and both mid-sync recoveries end with `git checkout main`, as `release.sh`'s sync block does (review D1 added the manual block) |
| QA-10 | `scripts/setup-consumer.sh` | The shared `/tracker-reconcile` line names `*.handover.*.md` |
| Banners | `scripts/setup-consumer.sh` | `2a`→`2b`, `2b`→`2`, `5b`→`8a`, the profile helpers are un-numbered, and `agent links` becomes `8b`. Each banner keeps the 79-column width. The header gains `2b. Skill install profile`, and step 2 now names the tracker-access prompt, so the `2.` access banner has a header entry |
| Fallback | `docs/concepts/restricted-access.md` | Limits item 2 and the `approve` table row name the autonomous run |

### Testing Results

- New test `rendered summary names the checklist /tracker-reconcile ticks` (`shared/resources/tests/setup-consumer-config.test.mjs`). It was red on the old `echo` and is green on the new one, which is the mutation proof.
- `bash -n` and `shellcheck --severity=warning` on `scripts/setup-consumer.sh` are clean. `doc-links.js` reports `ok` on both changed docs (8 and 18 links).
- The diff criterion: `git diff develop -- scripts/setup-consumer.sh | grep -E '^[+-][^+-]' | grep -vE '^[+-]#'` prints exactly the old and new summary `echo`.
- `npm run ci:fast` passed 5956 of 5971 tests. The one failure was `tests/bundle-missing-source.test.js`, which states it is load-sensitive: 21.9s against its 20s budget under the full suite. Re-run alone, all 7 of its tests pass in 16.2s. This task does not touch that test.

### Deferred Work

None.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-20
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.218.qa.1.release-and-wizard-wording-follow-ups.md](./task.218.qa.1.release-and-wizard-wording-follow-ups.md)
- **Gate File**: [task.218.gate.1.release-and-wizard-wording-follow-ups.yml](./task.218.gate.1.release-and-wizard-wording-follow-ups.yml)

### Test Coverage Summary
- **Tests Executed**: 1 new test (mutation-proven, 2 mutations), plus the full `npm run ci`
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. The diff review returned no findings.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.218.qa.1.release-and-wizard-wording-follow-ups.md`
**Gate File**: `task.218.gate.1.release-and-wizard-wording-follow-ups.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Review (5c)**: `task.218.pr-review.1.release-and-wizard-wording-follow-ups.md`, ✅ APPROVE with 0 findings

Every Definition of Done criterion was verified:

✅ **Success Criteria:** All 12 met (5 functional, 2 performance, 3 code quality, 2 migration). The two behaviour criteria are each held by a per-PR test that was mutation-proven.
✅ **Tests & PR:** PR #707, with all 5 checks green on `49344075`. The repository requires no reviewers, so the 5c review report stands in for an approval.
✅ **Documentation:** The CHANGELOG cites `(task 218)`, and the runbook and restricted-access wording is in the diff.
✅ **Security Review:** PASS. No secrets and no unsafe patterns. The deliverable is not a boundary, so no probe ran.
✅ **Compliance Review:** Not applicable. No personal, payment or health data is touched, and the only UI is one line of terminal text.

**Task marked as ACCEPTED on:** 2026-10-20

**Detailed Verification Log:** See `task.218.dod.1.release-and-wizard-wording-follow-ups.md` for the full verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-20 | 1.0     | Initial draft — the five wording items task.199's QA gate 4 carried to future work | create-task |
| 2026-10-20 | 1.1     | Review passed (8/10), ready to build. Added a per-PR test for the rendered summary, recorded the banner grep, gave the diff criterion its command, and extended QA-8 to the manual block | review-task |
| 2026-10-20 |         | Status → ready-for-development | review-task |
| 2026-10-20 |         | Implemented: 5 files and 1 new test; status → ready-for-review | develop-task (inline) |
| 2026-10-20 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-20 | 1.2 | DoD passed — accepted (PR #707) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Release runbook §4
- [x] Opening condition (QA-9)
- [x] `git checkout main` in the manual block and both recoveries (QA-8)

### Phase 2: Setup wizard text
- [x] Summary line names the checklist (QA-10)
- [x] Rendered-summary test
- [x] Banners and header renumbered

### Phase 3: restricted-access.md and changelog
- [x] Autonomous-run fallback named
- [x] CHANGELOG

---

## References

- **Parent**: [task.199](../task.199.setup-config-and-process-docs/task.199.setup-config-and-process-docs.md) (PR #704); [gate 4](../task.199.setup-config-and-process-docs/task.199.gate.4.setup-config-and-process-docs.yml), `top_issues` QA-8/9/10 and `recommendations.future`
- **Sibling**: [task.219](../task.219.bug-registry-status-mirror/task.219.bug-registry-status-mirror.md), the gate's source gap
- **Canonical step list**: `docs/concepts/getting-started.md` § What the wizard does

---

## Notes

### Important Reminders

- `CHANGELOG.md` is in `ci.docsOnly.patterns`, but `scripts/setup-consumer.sh` is not, so this task runs full CI and is not a docs-only change.
- Line numbers above were measured at `9067ba92`. Find each site by the quoted text, not the line number.

### Known Issues

None.

### Future Improvements

- If `setup-consumer.sh` is ever reorganised, move `write_tracker_workflow` into run order next to `install_skills`.
