---
id: task.228
title: "Replace the sample tokens gitleaks flags in tracked files"
type: task
description: "Swap the testing guide's sample tokens for a placeholder gitleaks does not flag, and reword two prose lines it misreads."
tags: [gitleaks, secret-scan, test-co-location-enforcer, consumer]
category: documentation
status: ready-for-review
priority: High
created: 2026-10-22
updated: 2026-10-22
assignee:
estimated_effort_hours: 2
github_issue: 730
---

# Technical Task: Replace the sample tokens gitleaks flags in tracked files

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.228.review.1.fake-sample-tokens-gitleaks.md` implemented 2026-10-22
**GitHub Issue**: [#730](https://github.com/Gamaroff/agent-skills/issues/730)

---

## 1. Overview

`gitleaks dir .` reports four `generic-api-key` hits on tracked files. Two of them sit in the
testing guide that consumers vendor, and they stop a consumer repository passing a secret scan
unless it adds a path-based allowlist. This task replaces the guide's two sample token values with
an obviously fake placeholder, and rewords two prose lines that gitleaks misreads as key
assignments.

**Scope:** `skills/test-co-location-enforcer/references/testing-framework-guide.md` (two lines),
`scripts/setup-consumer.sh` (one comment line), one line of a historical task.60 review report, and a
CHANGELOG entry. No code behaviour changes.

**Key deliverables:**

- The guide's two sample values become `<header>.<payload>.<signature>`. The example still reads as a
  JWT placeholder.
- The two prose lines are reworded so gitleaks no longer matches them, with their meaning unchanged.
- `gitleaks dir . --no-banner --redact` reports no hit on any **tracked** file.

**Expected outcome:** after the next release, the downstream repository (`omarchy-dotsync`) can
re-vendor and delete the first `[[allowlists]]` entry in its `.gitleaks.toml`.

---

## 2. Motivation

### Current Problems

1. **A consumer cannot go public without an allowlist.** The vendored copy
   `.agents/skills/test-co-location-enforcer/references/testing-framework-guide.md` fails
   `generic-api-key` on two lines. The only way through today is a path-based allowlist, which
   also hides any real secret that might later land in that file.
2. **The values look real.** Both are long, high-entropy strings (gitleaks entropy 4.42). A reader
   cannot tell at a glance that they are fake.
3. **This repository fails its own scan.** Two prose lines also trip the same rule, so a clean
   result is impossible today, and so is any guard built on one (task.229).

### Benefits

1. **Consumers scan clean without an allowlist** for this file.
2. **The placeholder explains itself.** `<header>.<payload>.<signature>` names the three JWT parts.
3. **A clean baseline** for the CI guard in task.229. That guard is red on the current tree.
4. **No behaviour change**: documentation and a comment only.

---

## 3. Technical Background

### Current state

Measured 2026-10-22 with
`gitleaks dir . --no-banner --redact --exit-code 0 --report-format json --report-path <scratch>`.
The matched values are never printed: `--redact` is always on.

| File | Line (anchor) | Rule | What matches |
|---|---|---|---|
| `skills/test-co-location-enforcer/references/testing-framework-guide.md` | 142 (`it('should decode JWT tokens client-side'` → `const token = '…'`) | generic-api-key | single-quoted sample value, entropy 4.42 |
| same file | 1023 (`it("should decode token for display"` → `const token = "…"`) | generic-api-key | double-quoted sample value, entropy 4.42 |
| `scripts/setup-consumer.sh` | 11 (`#   3. Credential collection      (gh auth check, …`) | generic-api-key | prose after `auth check, ` |
| `docs/tasks/task.60.config-reader-strict-subset/task.60.review.1.config-reader-strict-subset.md` | 57 (the YAML-features list that begins `resolves to — anchors, aliases`) | generic-api-key | the words after the comma that follows `explicit keys` |

Three more hits are under `.claude/state/` (`t205-*.diff`, `t205-*.patch`). That directory is
gitignored (`.gitignore:19:.claude/`), so those files are out of scope.

- Both guide samples are already truncated with `...`. The examples parse no real token, so
  replacing the value changes nothing a reader could run.
- The guide is **not** a bundled copy. There is no `shared/resources/testing-framework-guide.md`
  (`ls shared/resources | grep -i testing-framework` returns nothing), so the skill file is the
  source and `npm run bundle` does not overwrite it.
- `git ls-files | grep -i testing-framework-guide` returns only this one file.

### Target state

- Line 142: `const token = '<header>.<payload>.<signature>';`
- Line 1023: `const token = "<header>.<payload>.<signature>";`
- `setup-consumer.sh:11`: `(gh auth check; Bitbucket and Jira API tokens)`
- task.60 review line 57: `quoted/explicit keys, ` → `quoted or explicit keys; `

### Calibration already run (2026-10-22)

Each probe was run on a scratch copy and must be re-run during implementation:

- The original two guide lines: **2 leaks**. The replacement lines: **no leaks**. `<` and `>` fall
  outside the rule's secret character class.
- `setup-consumer.sh:11` original: 1 leak. Changing only `check` → `status`: still 1 leak.
  The `;`-and-`and` reword: no leaks.
- task.60 line 57 original: 1 leak. Inserting `and` after `keys,`: still 1 leak. The `; ` reword:
  no leaks.

---

## 4. Scope

### In Scope

✅ **Guide samples**: the two `const token =` values in the testing guide.
✅ **Prose false positives**: `scripts/setup-consumer.sh:11` and task.60 review line 57.
✅ **CHANGELOG**: one `### Fixed` entry under `[Unreleased]`.

### Out of Scope

❌ **A CI guard.** That is task.229, which depends on this task.
❌ **Git history.** `gitleaks git` still finds the old values in past commits. Consumers vendor only
the current file, so rewriting history buys nothing.
❌ **`.claude/state/` scratch diffs.** Untracked and gitignored.
❌ **A version bump.** `scripts/release.sh` sets the version from tags at release time
(`docs/contributing/releases.md`). This is patch-level, and when to release is the owner's call.
❌ **The downstream repository.** Re-vendoring `omarchy-dotsync` and deleting its allowlist entry is
a separate task in that repository, after a release.

---

## 5. Breaking Changes

None. Documentation text and one shell comment change. No interface, output or behaviour changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.228.plan.fake-sample-tokens-gitleaks.md](task.228.plan.fake-sample-tokens-gitleaks.md)

### Phase 1: Replace the guide's sample tokens

**Risk Level**: Low

**Files**:
- `skills/test-co-location-enforcer/references/testing-framework-guide.md`

**Changes**:
- [x] Replace the value on the line `const token = '…';` under `it('should decode JWT tokens client-side'` with `<header>.<payload>.<signature>`.
- [x] Replace the value on the line `const token = "…";` under `it("should decode token for display"` the same way, keeping the double quotes.
- [x] `gitleaks dir <that file> --no-banner --redact --exit-code 1` exits 0.

**Dependencies**: none

---

### Phase 2: Reword the two prose false positives

**Risk Level**: Low

**Files**:
- `scripts/setup-consumer.sh`
- `docs/tasks/task.60.config-reader-strict-subset/task.60.review.1.config-reader-strict-subset.md`

**Changes**:
- [x] `setup-consumer.sh` header comment, step 3: the parenthesis becomes `(gh auth check; Bitbucket and Jira API tokens)` — the comma after `check` becomes a semicolon, and the slash pair becomes `Bitbucket and Jira`.
- [x] task.60 review line 57: `quoted/explicit keys, ` → `quoted or explicit keys; `.
- [x] Re-scan each file and confirm no leaks.

**Dependencies**: none (independent of Phase 1)

---

### Phase 3: CHANGELOG and full verification

**Risk Level**: Low

**Files**:
- `CHANGELOG.md`

**Changes**:
- [x] Add one entry under `## [Unreleased]` → `### Fixed`, citing task 228. It says the testing guide's sample tokens now use a placeholder, so a consumer's secret scan passes without an allowlist.
- [x] Full-tree scan: the only remaining hits are under `.claude/state/`.
- [x] `npm test` and `npm run bundle:check` are green.

**Dependencies**: Phases 1 and 2

---

## 7. Files Summary

### Files to Modify (Core)

1. ✅ `skills/test-co-location-enforcer/references/testing-framework-guide.md`: two sample values.
2. ✅ `scripts/setup-consumer.sh`: one comment line.
3. ✅ `docs/tasks/task.60.config-reader-strict-subset/task.60.review.1.config-reader-strict-subset.md`: one prose line.

### Files to Modify (Documentation)

4. ✅ `CHANGELOG.md`: `[Unreleased]` → `### Fixed` entry.

### Files to Delete

None.

---

## 8. Testing Strategy

### Scan tests

**Scope**: gitleaks over each changed file and over the whole tree.

**Actions**:
- [ ] Re-run the calibration first: the **old** guide lines, saved to a scratch file, must still give 2 leaks. This proves the probe catches the defect before its green on the new lines means anything.
- [ ] Each changed file: `gitleaks dir <file> --no-banner --redact --exit-code 1` exits 0.
- [ ] Whole tree: `gitleaks dir . --no-banner --redact --exit-code 0 --report-format json --report-path <scratch>/repo.json`. Every remaining hit's `File` starts with `.claude/`.

**Command**: `gitleaks dir . --no-banner --redact --exit-code 0`

### Regression tests

**Scope**: the repository suite. No test asserts the guide's sample text, so nothing should move.

**Command**: `npm test` and `npm run bundle:check`

### Consumer check

**Scope**: the vendored copy. `setup-consumer.sh` copies the skill directory as-is. After the
change, a scan of a copied `skills/test-co-location-enforcer/` directory is clean.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [ ] `gitleaks dir skills/test-co-location-enforcer/references/testing-framework-guide.md --no-banner --redact --exit-code 1` exits 0.
- [ ] `gitleaks dir . --no-banner --redact` reports no hit on a tracked file. Any remaining hit is under `.claude/`. This includes this task's own directory, so the scan runs **after** finalise has written its artefacts.
- [ ] The guide's two examples still read as JWT-decoding examples. Only the literal changed.
- [ ] No matched value appears in a commit message, PR text, QA report or tracker comment. Checked by the full-tree scan above (it covers the task directory's reports), by `git log --format=%B develop..HEAD | gitleaks stdin --no-banner --redact --exit-code 1` (commit messages), and by `gh pr view --json body -q .body | gitleaks stdin --no-banner --redact --exit-code 1` (PR text). Each exits 0.

### Performance

- [ ] Not applicable: text-only change.

### Code Quality

- [ ] `npm test` passes.
- [ ] `npm run bundle:check` passes.
- [ ] `bash -n scripts/setup-consumer.sh` passes (comment-only edit).
- [ ] `npm run lint:shell` passes (ShellCheck over every tracked `.sh` source, including `scripts/setup-consumer.sh`).

### Migration

- [ ] CHANGELOG `[Unreleased]` → `### Fixed` entry cites task 228.
- [ ] No version bump in this task.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. A matched value leaks into text while the work is done**
- **Risk**: an unredacted `gitleaks` run or a `git diff` pasted into a report prints the old value.
- **Probability**: Medium
- **Impact**: Minor. The values are fake, but printing them defeats the task's purpose and feeds the leak guard.
- **Mitigation**: always pass `--redact`. Describe hits by file, line and rule only. Never paste the guide diff into a report. The two **prose** lines trip the rule too: an artefact that quotes them verbatim (this task document did, at review) is itself a hit. Describe the old prose, never reproduce it, in every report, PR body and commit message.
- **Rollback**: none needed. Edit the text that carries the value.

### Low Risk Areas

**1. A reword still matches**
- **Risk**: gitleaks' rule set differs between versions, so a reword clean on one version may match on another.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: re-run the calibration with the version used here, and record that version in the implementation report. Read it with `pacman -Q gitleaks` (8.30.1 at review): this build's `gitleaks version` prints no version.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The guide's examples read wrongly after the change.

**Steps**:
1. `git revert` the task's commit on `develop`.

**Verification**: `git diff` against the parent commit is empty for the four files.

### Partial Rollback

**When to Use**: one reword reads badly. Revert that one line and pick another reword that scans
clean.

### Forward Fix

**When to Use**: any wording issue. The change is four lines, so fix forward.

### Rollback Triggers

**Critical**: none. Nothing executes.
**Non-Critical**: wording. Fix forward.

---

## Implementation Record

**Started**: 2026-10-22 · **Completed**: 2026-10-22 · implemented inline by the `/develop-task` orchestrator (run 1; plan file and surface map in hand, `/develop` not invoked).

**Summary.** The testing guide's two `const token = …` samples now read `<header>.<payload>.<signature>` (single and double quotes kept). The `setup-consumer.sh` step-3 comment and the task.60 review's YAML-features line are reworded exactly as Phase 2 states. CHANGELOG `[Unreleased]` → `### Fixed` carries the task 228 entry.

**Approach.** The guide's two values were replaced by a script that matched each `const token = <quote>…<quote>;` line and rewrote it, so the old value never appeared in a command line or in output. The two prose lines were replaced by exact-string substitution, each asserted to occur once.

**Testing.** gitleaks 8.30.1 (`pacman -Q gitleaks`). Calibration first: the original lines, saved to scratch files, gave 2 leaks (guide), 1 (`setup-consumer.sh:11`) and 1 (task.60 :57). After the change, each changed file and the task directory scan with `--exit-code 1` → exit 0. Full tree (`gitleaks dir . --redact`): 3 hits, all under `.claude/state/` (gitignored), none on a tracked file. `bash -n scripts/setup-consumer.sh` ok; `npm run lint:shell` clean (93 scripts); `npm run bundle:check` 128 skills, 0 problems; `npm run ci:fast`: format check passed, 6187/6202 tests passed (the rest skipped), 1 failed — `tests/bundle-missing-source.test.js`, its LOAD-SENSITIVE budget (20313 ms against 20000 ms, load average 19.5). Re-run alone: 7/7 pass in 17.4 s.

**Deferred Work.** None in scope. The pre-commit hook pins gitleaks v8.21.2 (`.pre-commit-config.yaml`), and this task calibrated on 8.30.1. Aligning the versions belongs with task.229's scan lane.

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-22
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.228.qa.1.fake-sample-tokens-gitleaks.md](./task.228.qa.1.fake-sample-tokens-gitleaks.md)
- **Gate File**: [task.228.gate.1.fake-sample-tokens-gitleaks.yml](./task.228.gate.1.fake-sample-tokens-gitleaks.yml)

### Test Coverage Summary
- **Tests Executed**: 6201 (6187 pass, 0 fail, 14 skipped)
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Redacted gitleaks scans of each changed file, the task directory, the commit messages and the PR body all exit 0. One advisory cleanup (CR-1: the placeholder is not a decodable JWT if copied verbatim). The full-tree scan runs at finalise.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-22 | 1.0     | Initial draft | create-task |
| 2026-10-22 | 1.1     | Review 9/10 after fixes — ready to build: reworded the document's own quotations of the two prose lines (they tripped gitleaks), named the commit/PR-text check, added `npm run lint:shell`, recorded the gitleaks version | review-task |
| 2026-10-22 |         | Status → ready-for-development | review-task |
| 2026-10-22 |         | Implemented — 4 files (guide samples, 2 prose rewords, CHANGELOG); tracked tree scans clean | develop |
| 2026-10-22 |         | QA gate PASS (100/100) — 0 blocking findings, 1 advisory cleanup | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Replace the guide's sample tokens
- [x] Line 142 value
- [x] Line 1023 value
- [x] File scan clean

### Phase 2: Reword the two prose false positives
- [x] `setup-consumer.sh:11`
- [x] task.60 review line 57

### Phase 3: CHANGELOG and full verification
- [x] CHANGELOG entry
- [x] Full-tree scan
- [x] `npm test`, `bundle:check`

---

## References

- **Related Skill**: `skills/test-co-location-enforcer/`
- **Follow-on**: task.229 (the CI secret-scan lane that holds this fix)
- **Release rules**: `docs/contributing/releases.md`
- **Origin**: a handoff from the downstream `omarchy-dotsync` repository, whose `.gitleaks.toml` carries a path allowlist for the vendored guide.

---

## Notes

### Important Reminders

- Never print a matched value. Use `--redact` on every scan.
- After this merges, a release is needed before the downstream repository can re-vendor. That is the
  owner's call.

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.228.fake-sample-tokens-gitleaks/task.228.fake-sample-tokens-gitleaks.md`
2. QA artifacts land beside this file: `task.228.qa.[n].fake-sample-tokens-gitleaks.md`, `task.228.gate.[n].fake-sample-tokens-gitleaks.yml`
