---
id: task.212
title: "qa-next: a note finding can be resolved, with evidence"
type: task
description: "Give uat-status.mjs a way to close a Findings-table row that has no bug: a `resolved <date> by \`<evidence>\`` marker in its Filed as cell, written by a new --resolve-finding command, verified against a real commit or a later run file, and counted as closed by --findings."
tags: [qa-next, uat, findings, uat-status, follow-up]
category: feature
status: accepted
priority: Medium
created: 2026-10-16
updated: 2026-10-16
assignee:
estimated_effort_hours: 5
depends_on: []
github_issue: 679
completed_date: 2026-10-16
pr_number: 680
---

# Technical Task: qa-next: a note finding can be resolved, with evidence

**Status:** Accepted
**GitHub Issue**: [#679](https://github.com/Gamaroff/agent-skills/issues/679)
**Review**: ✅ All review recommendations from `task.212.review.1.qa-next-resolvable-note-findings.md` implemented 2026-10-16

---

## 1. Overview

`/qa-next` records every incidental observation in its run file's `## Findings` table. A row either
links a bug (`Filed as` = a markdown link) or is a `note`. `uat-status.mjs --findings` treats a row as
closed only when its linked bug's frontmatter `status` is `closed`, `done`, `fixed` or `resolved`. A
`note` has no bug, so **it is open forever**, whatever happens to the thing it describes.

This task adds the missing transition: a note can be marked resolved, the marker must name evidence
the tool can check, and `--findings` counts a validly resolved note as closed.

**Scope**: `skills/qa-next/scripts/uat-status.mjs` (parse, verify, count, one new write command),
its unit tests, and the four documents that define the `Filed as` cell.

**Key deliverables**:

- A `Filed as` grammar for a resolved note: `… — resolved YYYY-MM-DD by \`<evidence>\``, where the
  evidence is a commit sha or the repo-relative path of a later run file.
- `--resolve-finding <run> <n> --by <evidence> [--date YYYY-MM-DD]`, the only writer of that marker.
- `--findings` counts a validly resolved note as closed. `--check` reports a resolution whose
  evidence does not hold, or one written on a row that links a bug.

**Expected outcome**: the open-findings count in `uat-status.mjs`'s scoreboard means "observations
nobody has dealt with". A resolved note leaves the count only on evidence a reader can follow.

---

## 2. Motivation

- **The count stops meaning anything.** In the first consumer (tinker-city), 39 of 45 open findings
  on 2026-10-16 were notes. At least four were already resolved and could not be closed:
  - tinker-city run `A.4/2026-10-15-lan` finding 3: a registry sentence, reworded in commit `2de15bcf`.
  - tinker-city run `A.5/2026-10-16-lan` finding 1: a registry sentence, reworded in commit `96d7948e`.
  - The same run's finding 2, superseded by run `A.5/2026-10-16-lan-02` finding 2.
  - Run `A.5/2026-10-16-lan-02` finding 1: the same sentence, reworded in commit `96d7948e`.

  `skills/qa-next/SKILL.md` § "Running as a loop" tells the owner to read `--findings` as "what the
  loop has seen and nobody has closed". With notes that can never close, that list grows without
  bound and hides the rows that still need someone.
- **Editing the cell by hand does nothing.** The parser reads only the first markdown link in
  `Filed as` (`parseFindings`, `uat-status.mjs:670`), and `isOpenFinding` (`:743`) is
  `f.bugStatus === null || !BUG_CLOSED.test(f.bugStatus)`. No text in a note cell can change its state.
- **The obvious workaround is worse than the problem.** Filing a bug only to close it creates a
  defect record for a sentence rewording.

---

## 3. Technical Background

### Current

- `FINDING_ROW` (`:667`) splits a Findings row into `n | where | what | severity | filed`.
- `parseFindings` (`:670`) sets `bug` to the first markdown link's target in `filed`, otherwise `null`.
- `loadFindings` (`:723`) resolves `bug` relative to the run file and reads its frontmatter
  `status` into `bugStatus`: `missing` when the file is absent, `null` for a note.
- `isOpenFinding` (`:743`) treats every note as open.
- `checkFindings` (`:749`) errors only on `bugStatus === "missing"`.
- `--findings` prints the open rows and a count (`open`, `unfiled`, `in open bugs`, `closed`). The
  scoreboard footer repeats the open count.
- `SKILL.md` § "What this skill never does" says: "Overwrite a previous run file."

### Target

- **Grammar.** A note's `Filed as` cell may end with ` — resolved YYYY-MM-DD by \`<evidence>\``.
  The evidence is **backticked, never a markdown link**: `parseFindings` reads the first link as the
  bug, so a linked run file would turn the note into a "bug" with a non-bug status. Two evidence kinds:
  - a commit: `[0-9a-f]{7,40}`, verified with `git -C <root> cat-file -e <sha>^{commit}`;
  - a run file: a path ending `.md`, relative to the registry directory (the form `--findings` and
    `priorRuns` already print), which must be one of the paths `listRunFiles` returns (so it lies under `runs/`;
    anything else is `run-not-found`), must not be the finding's own run file, and must
    be **later** by name: a later date, or the same day's higher sequence of the same function and
    environment. A same-day run of another function or environment, or an undated file, is not
    later (QA cycle 1, CR-2 — `listRunFiles` order sorts those arbitrarily). A run cannot be
    resolved by an earlier run.
- **Parse.** `parseFindings` adds `resolution: { date, evidence }`, read from the cell's text, **only to a
  row that carries a marker**. A row without one gets no `resolution` key at all, so every existing
  `parseFindings` result, `--findings --json` payload and `deepEqual` test is unchanged byte for byte.
- **Verify.** `loadFindings` adds `resolution.valid` and, when invalid, `resolution.reason`. The
  reason is one of `commit-not-found`, `not-a-git-repo`, `run-not-found`, `run-is-self`,
  `run-not-later`, `on-a-bug-link`, `bad-date` or `bad-evidence` (evidence that is neither a
  commit-shaped hex string nor a path ending `.md`). All I/O stays in `loadFindings`.
- **Count.** `isOpenFinding` stays pure:
  `f.bug === null ? !(f.resolution?.valid) : !BUG_CLOSED.test(f.bugStatus ?? "")`.
  A resolution on a row that links a bug is ignored for state: the bug's status governs.
- **Check.** `checkFindings` adds one error per resolution whose `valid` is false, naming the run,
  the finding number and the reason. A marker that cannot be verified is a red `--check`, never a
  silently closed row.
- **Write.** `--resolve-finding <run> <n> --by <evidence> [--date YYYY-MM-DD]` (date defaults to
  today, UTC). `<run>` is the registry-relative path exactly as `--findings` prints it
  (`runs/A.5/2026-10-16-lan.md`). The three new flags join the `OPTIONS` allow-list, or the
  unknown-option guard refuses them:
  - It appends the marker to that one row's `Filed as` cell and changes no other byte of the file.
  - It refuses, writing nothing, when:
    - the run or the finding does not exist (exit 4);
    - the row links a bug (exit 2; close the bug instead);
    - the evidence fails the same verification `loadFindings` applies (exit 2, with the reason);
    - two rows in the table carry finding n (exit 2; renumber them first — QA cycle 1, CR-3);
    - the row is already resolved by different evidence **that still holds** (exit 2; a resolved
      finding is not re-resolved).
  - The same **evidence** twice is a no-op, exit 0, whatever `--date` says: the first date stands.
    A re-run on a later day must not be refused for the date it defaulted to. This holds only while
    the existing marker verifies; a marker that no longer holds is **replaced** by newly verified
    evidence, so the only writer can repair what it wrote (QA cycle 1, CR-1).
- **Stage.** `--changed-runs` prints the tracked run files under `<registry dir>/runs` that differ
  from `HEAD` — the earlier runs `--resolve-finding` edited — for `SKILL.md` Step 5 to stage. The
  registry directory comes from `--registry`, like every other command (QA cycles 2–3, CR1).
- **Report.** `--findings` counts valid resolutions as closed. `--findings --all` renders the row's
  label as `[note — resolved <date> by <evidence>]`. `--json` carries `resolution`.

---

## 4. Scope

### In Scope

- Parse, verify, count and check resolutions in `uat-status.mjs`.
- `--resolve-finding` with its refusals and exit codes, and its line in the header usage block (`:24`).
- `--changed-runs`, which prints the tracked run files under `<registry dir>/runs` that differ from
  `HEAD`, with its usage line. SKILL.md Step 5 calls it to stage the earlier runs a run resolved
  (added in QA cycle 3, T212-QA3-CR1).
- Unit tests in `evals/qa-next/unit/uat-status.test.mjs`.
- Docs that define the cell:
  - `skills/qa-next/assets/run.template.md` § Findings, the **Filed as** definition;
  - `skills/qa-next/SKILL.md` Step 4.3 (a later run that finds an earlier note's subject gone resolves
    it, with itself as evidence), Step 5 (the commit stages **only** named paths, so it must also
    stage every earlier run file this run resolved a finding in, or the edit is left uncommitted),
    § "What this skill never does" (the one narrow exception to "Overwrite a previous run file"), and
    § "Running as a loop";
  - `skills/qa-next/README.md` § findings (`:86`).
- A CHANGELOG entry naming the grammar and the command.

### Out of Scope

- Resolving tinker-city's four findings above. That is the consumer's step after re-vendor.
- Auto-detecting resolutions (for example, a later run whose Findings omit the row). Resolution is a
  claim a person or the skill makes on purpose, with evidence; inferring it from absence would close
  rows nobody re-checked.
- Any change to bug-linked findings, `BUG_CLOSED`, or bug files.
- A `reopen` command. Removing the marker by hand reopens the row, and `--check` stays green.

---

## 5. Breaking Changes

None. A run file with no resolution markers parses, counts and checks exactly as before. That is
asserted by a test over the existing `RUN_FILE` fixture.

---

## 6. Implementation Plan

### Phase 1: Parse, verify, count (Low risk)

Add `resolution` to `parseFindings`, verification to `loadFindings`, the new `isOpenFinding`
predicate, and the `checkFindings` errors. Render resolutions in `--findings`.

### Phase 2: The writer (Medium risk)

Add `--resolve-finding`, which rewrites one table cell in a committed record. Locate the row through
`FINDING_ROW`, replace only the last cell's content, and assert byte equality outside it.

### Phase 3: Docs (Low risk)

Update the template, SKILL.md, README and CHANGELOG.

See [task.212.plan.qa-next-resolvable-note-findings.md](task.212.plan.qa-next-resolvable-note-findings.md).

---

## 7. Files Summary

1. `skills/qa-next/scripts/uat-status.mjs`: Phases 1–2, and `--changed-runs` (QA cycle 3).
2. `evals/qa-next/unit/uat-status.test.mjs`: every criterion in § 9 has a row here.
3. `skills/qa-next/assets/run.template.md`: the **Filed as** definition.
4. `skills/qa-next/SKILL.md`: Step 4.3, Step 5 (its staging block calls `--changed-runs`), § "What this skill
   never does", § "Running as a loop".
5. `skills/qa-next/README.md`: § findings.
6. `CHANGELOG.md`: an `[Unreleased]` entry.

---

## 8. Testing Strategy

- **Unit** (`evals/qa-next/unit/uat-status.test.mjs`):
  - parser rows for each grammar shape, including a backticked run path and a malformed date;
  - verification rows using a temporary git repository fixture (a real commit and an absent sha) and
    a temporary `runs/` tree (a later run, an earlier run, the row's own run, a missing file);
  - `isOpenFinding` over every combination of bug link × resolution validity;
  - `--resolve-finding` run as a child process against a fixture copy, asserting the written cell,
    byte equality of the rest of the file, idempotency, and each refusal's exit code and unchanged file.
- **Regression:** the existing findings rows (`:624` onward) pass unchanged.
- **Mutation-proven while developing:** for each criterion, revert its code and name the row that goes
  red. The proof is that a per-PR test exists and fails; it is not a record kept in the notes.
- Run with `node --test evals/qa-next/unit/uat-status.test.mjs`, then `npm test`.

---

## 9. Success Criteria

### Functional

- [x] A note whose `Filed as` ends `— resolved 2026-10-16 by \`<sha>\`` naming an existing commit is
      counted as closed by `--findings`, and shown by `--findings --all` as resolved.
- [x] The same marker naming a sha that is not a commit keeps the row open, and `--check` exits
      non-zero naming the run, the finding number and `commit-not-found`.
- [x] A marker naming a later run file closes the row. One naming the row's own run (`run-is-self`),
      an earlier run (`run-not-later`) or a missing file (`run-not-found`) keeps it open, and
      `--check` names the reason. Evidence that is neither a sha nor a `.md` path is `bad-evidence`.
- [x] A marker on a row that links a bug changes nothing about its state (the bug's status
      governs), and `--check` reports `on-a-bug-link`.
- [x] `--resolve-finding <run> <n> --by <evidence>`:
  - writes the marker into that row's `Filed as` cell, and every other byte of the run file is unchanged;
  - running it again with the same evidence exits 0 and changes nothing, with or without a different
    `--date`;
  - each refusal in § 3 Target exits with its stated code and leaves the file byte-identical.
- [x] A run file with no markers yields the same `--findings`, `--findings --json` and `--check`
      output as before this task, asserted over the existing fixture.

### Code Quality

- [x] `isOpenFinding` performs no I/O. A test calls it on plain objects.
- [x] `npm test` and `npm run ci:fast` pass with `.agents/skills` moved aside.
- [x] Every criterion above is asserted by a test in `evals/qa-next/unit/uat-status.test.mjs` that
      runs per PR.

### Documentation

- [x] `run.template.md`, `SKILL.md` and `README.md` define the marker grammar identically and name
      `--resolve-finding` as its only writer.
- [x] SKILL.md Step 5 stages the earlier run files a run resolved findings in, as listed by
      `uat-status.mjs --changed-runs` under the configured registry.
- [x] SKILL.md § "What this skill never does" states the one exception to "Overwrite a previous run
      file": `--resolve-finding` appends to a single `Filed as` cell.

---

## 10. Risk Assessment

- **Medium: the writer edits a committed record.** Mitigation: one cell only, located by
  `FINDING_ROW`, with a byte-equality assertion over the rest of the file in tests.
- **Medium: a resolution that claims more than its evidence shows.** Mitigation: evidence is
  verified on every `--check`, not only when written, so a deleted run file reopens the row
  loudly. A sha is checked for existence, not reachability: a rebased-away commit keeps verifying
  until git collects it (QA cycle 1, CR-4 — documented, not changed).
- **Low: git unavailable.** A commit-evidence marker outside a git work tree is
  `not-a-git-repo`: the row stays open and `--check` reports it. It is never accepted unverified.

---

## 11. Rollback Plan

- **Immediate:** revert the task's commits. Markers already written stay in run files as plain text;
  the old parser ignores them, so the rows read as open notes again and nothing breaks.
- **Trigger:** `--findings` closing a row whose evidence does not hold, or `--resolve-finding`
  changing any byte outside the target cell.

---

## Implementation Record

**Completion Date:** 2026-10-16 (develop-task Step 3, run 1 — inline; see the implementation report)

### Implementation Summary

`skills/qa-next/scripts/uat-status.mjs`:

| Piece | Now |
|---|---|
| `findingRows` / `rowFinding` | one row locator shared by the reader and the writer; `parseFindings` maps over it. A marked row carries `resolution: { date, evidence }`; an unmarked row carries no `resolution` key |
| `verifyResolution` (exported, pure) | returns the reason a resolution does not hold, or `null`. `runs` and `commitState` are injected; reasons: `on-a-bug-link`, `bad-date`, `run-is-self`, `run-not-found`, `run-not-later`, `commit-not-found`, `not-a-git-repo`, `bad-evidence` |
| `gitCommitState` | lazy `git -C <root>` lookup (`rev-parse --is-inside-work-tree`, then `cat-file -e <sha>^{commit}`), cached per sha. It spawns nothing for a corpus with no commit markers. A missing git binary counts as "no repository" |
| `loadFindings` | adds `resolution.valid` and, when the resolution is invalid, `resolution.reason` |
| `isOpenFinding` | pure: a note is open unless its resolution is valid; a bug-linked row follows its bug's status |
| `checkFindings` | adds one error per resolution that does not hold, naming the run, the finding number, the reason and the evidence |
| `cmdFindings` | renders `[note — resolved <date> by <evidence>]` for a valid resolution and `[note — resolution does not hold: <reason>]` for an invalid one |
| `cmdResolveFinding` (`--resolve-finding`) | rewrites only the last cell of the row, keeping its padding and anything after the closing pipe, including a CRLF `\r`. It exits 4 when the run or the finding does not exist. It exits 2 on a bug link, a different-evidence re-resolution, any verification reason, or a missing `--by`. The same evidence again exits 0 with no write |
| `OPTIONS`, `dispatch`, header usage | `--resolve-finding`, `--by` and `--date` added; `--changed-runs` added in QA cycle 3 |
| `isLaterRun` / `runName` (QA cycles 1–2) | a later run is one with a later real date, or the same date, directory and environment with a higher sequence number. An unreal date counts as undated |
| writer repair and read-back (QA cycles 1–2) | `--resolve-finding` replaces a marker that no longer holds, refuses a finding number two rows share, and reads its row back through `rowFinding` before writing |
| `cmdChangedRuns` (`--changed-runs`, QA cycle 3) | lists the tracked run files under `<registry dir>/runs` that differ from `HEAD`, so Step 5 stages them from the tree and not from memory. The registry comes from `--registry` |

The docs are `run.template.md` (the **Filed as** definition), `SKILL.md` (Step 4.3 converse, Step 5 staging, the § "never does" exception, § "Running as a loop"), `README.md` § Findings, and a `CHANGELOG.md` `[Unreleased]` entry.

### Approach

Implemented inline from the plan, corrected by review.1, so `/develop` was not invoked. Every rule was mutation-proved by reverting it and running the task-212 tests:

| Mutation | Tests that fail |
|---|---|
| old `isOpenFinding` | 3 |
| `checkFindings` ignores resolutions | 3 |
| `resolution: null` on every row | 2 |
| idempotency also requires the same date | 1 |
| an earlier run accepted as evidence | 3 |
| no repository counted as a commit | 1 |
| a marker on a bug-link row accepted | 2 |

One mutation survived: dropping the CRLF handling. The `\r` sits after the closing `|`, and the slice keeps it anyway, so the code was redundant. It was removed, and the CRLF test still holds the behaviour.

### Deviations from the plan

1. **The `--findings` label for an invalid resolution** reads `note — resolution does not hold: <reason>`. The plan only covered the valid label. The new label shows the owner which marker is broken without needing `--check`.
2. **`verifyResolution` is exported**, with `runs` and `commitState` injected. Tests can then reach every reason without git or a file tree.

### Testing Results

**Final counts (after QA cycle 3, measured 2026-10-16):** 84 tests in
`evals/qa-next/unit/uat-status.test.mjs`, all passing: 68 pre-existing and 16 for task 212.
`npm run ci:fast` passed 5773/0 at `2f44919f`. The list below is the run-1 snapshot; QA reports
`task.212.qa.{1..4}` record what each cycle added.

- Run 1: `evals/qa-next/unit/uat-status.test.mjs` has 9 new tests, all passing:
  - parser shapes;
  - every `verifyResolution` reason;
  - `isOpenFinding` and `checkFindings` on plain objects;
  - a CLI corpus in a real git repository, covering valid and invalid markers, `--findings`, `--all`, `--json` and `--check`;
  - `not-a-git-repo` outside a work tree;
  - the writer's single-cell write, idempotency and each of its 10 refusals, each confirmed byte-identical;
  - CRLF;
  - no-marker output identical to before;
  - the doc-agreement test.
- The 68 pre-existing tests are unchanged and pass.
- `npm run ci:fast` (`format:check` + `npm test`) ran with `.agents/skills` moved aside: 5766 tests, 0 failures, exit 0.

### Deferred Work

None.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-16
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.212.qa.4.qa-next-resolvable-note-findings.md](./task.212.qa.4.qa-next-resolvable-note-findings.md)
- **Gate File**: [task.212.gate.4.qa-next-resolvable-note-findings.yml](./task.212.gate.4.qa-next-resolvable-note-findings.yml)

### Test Coverage Summary
- **Tests Executed**: 85 (qa-next unit) + 17 security probes
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No open findings. Every fix from QA cycles 1–3 is held by a test that fails when the fix is removed. Four low-severity improvements are recorded as future work.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.212.qa.4.qa-next-resolvable-note-findings.md`
**Gate File**: `task.212.gate.4.qa-next-resolvable-note-findings.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100 (4 QA cycles)

All Definition of Done criteria have been verified:

✅ **Acceptance Criteria:** 12/12 met, each asserted by a per-PR test in `evals/qa-next/unit/uat-status.test.mjs`
✅ **Tests:** 85 qa-next unit tests; `npm run ci:fast` 5773/0 with `.agents/skills` moved aside; CI green on PR #680
✅ **PR Review:** PR #680 — Step 5c `/review-pr` ✅ APPROVE (`task.212.pr-review.1.qa-next-resolvable-note-findings.md`)
✅ **Documentation:** CHANGELOG [Unreleased], qa-next SKILL.md, README and run template
✅ **Security Review:** ✅ PASS — `--resolve-finding --by` probed: 27 executed, 0 reproduced (verdict `engages`)
✅ **Compliance Review:** NOT_APPLICABLE — local developer CLI, no PII, payments, UI or health data

**Task marked as ACCEPTED on:** 2026-10-16

**Detailed Verification Log:** See `task.212.dod.1.qa-next-resolvable-note-findings.md` for complete verification evidence and timestamps.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-16 | 1.0     | Initial draft | create-task |
| 2026-10-16 | 1.1     | Review passed (8/10) — added `bad-evidence`, run-evidence membership, `resolution` key only on marked rows, `<run>` argument form, evidence-only idempotency, SKILL.md Step 5 commit scope; linked #679 | review-task |
| 2026-10-16 |         | Status → ready-for-development | review-task |
| 2026-10-16 |         | Implemented — 4 code/doc files + CHANGELOG, 9 tests (mutation-proved); status → ready-for-review | develop |
| 2026-10-16 |         | QA gate CONCERNS (70/100) — 3 findings | qa-task |
| 2026-10-16 |         | QA findings fixed — cycle 1, 3 findings (CR-1 stale-marker repair, CR-2 later-by-name, CR-3 duplicate numbers) + 2 low | qa-fix |
| 2026-10-16 |         | QA gate CONCERNS (80/100) — 3 findings | qa-task |
| 2026-10-16 |         | QA findings fixed — cycle 2, 3 findings (CR1 Step 5 stages edited runs from the tree, CR2 writer read-back, CR7 real-date run names) + 4 advisory | qa-fix |
| 2026-10-16 |         | QA gate FAIL (80/100) — 1 finding; status → in-progress | qa-task |
| 2026-10-16 |         | QA findings fixed — cycle 3, 1 finding (CR1: --changed-runs owns the run-file listing; Step 5 calls it); status → ready-for-review | qa-fix |
| 2026-10-16 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-16 | 1.2 | DoD passed — accepted (PR #680) | finalise |
| 2026-10-16 |  | Folded in pr-review.1 PC-1/PC-2: `--changed-runs` named in §4, §7 and §9; Implementation Record gains the QA-cycle additions and final test counts (84 = 68 + 16) | Claude |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: Parse, verify, count
- [x] Phase 2: The writer
- [x] Phase 3: Docs

---

## References

- `skills/qa-next/scripts/uat-status.mjs`: `FINDING_ROW` `:667`, `parseFindings` `:670`,
  `loadFindings` `:723`, `isOpenFinding` `:743`, `checkFindings` `:749` (as of `daf07988`; re-grep
  before editing).
- `skills/qa-next/SKILL.md` Step 4.3 and § "What this skill never does".
- tinker-city `docs/qa/runs/A.5/2026-10-16-lan.md` and `2026-10-16-lan-02.md` § Findings, and
  `docs/qa/runs/A.4/2026-10-15-lan.md` finding 3: the originating rows.

## Notes

Raised from a tinker-city `/qa-next` session on 2026-10-16. After rewording two registry rows, the
owner asked how the findings that described them would close, and found they cannot.

QA artifacts will be co-located here: `task.212.qa.{n}.*.md`, `task.212.gate.{n}.*.yml`,
`task.212.bug.{n}.*.md`.
