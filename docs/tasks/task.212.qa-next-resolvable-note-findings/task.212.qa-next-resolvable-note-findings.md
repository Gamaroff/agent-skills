---
id: task.212
title: "qa-next: a note finding can be resolved, with evidence"
type: task
description: "Give uat-status.mjs a way to close a Findings-table row that has no bug: a `resolved <date> by \`<evidence>\`` marker in its Filed as cell, written by a new --resolve-finding command, verified against a real commit or a later run file, and counted as closed by --findings."
tags: [qa-next, uat, findings, uat-status, follow-up]
category: feature
status: planned
priority: Medium
created: 2026-10-16
updated: 2026-10-16
assignee:
estimated_effort_hours: 5
depends_on: []
---

# Technical Task: qa-next: a note finding can be resolved, with evidence

**Status:** Planned

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
    `priorRuns` already print), which must exist, must not be the finding's own run file, and must
    sort **after** it in `listRunFiles` order. A run cannot be resolved by an earlier run.
- **Parse.** `parseFindings` gains `resolution: { date, evidence } | null`, read from the cell's text.
- **Verify.** `loadFindings` adds `resolution.valid` and, when invalid, `resolution.reason`. The
  reason is one of `commit-not-found`, `not-a-git-repo`, `run-not-found`, `run-is-self`,
  `run-not-later`, `on-a-bug-link` or `bad-date`. All I/O stays in `loadFindings`.
- **Count.** `isOpenFinding` stays pure:
  `f.bug === null ? !(f.resolution?.valid) : !BUG_CLOSED.test(f.bugStatus ?? "")`.
  A resolution on a row that links a bug is ignored for state: the bug's status governs.
- **Check.** `checkFindings` adds one error per resolution whose `valid` is false, naming the run,
  the finding number and the reason. A marker that cannot be verified is a red `--check`, never a
  silently closed row.
- **Write.** `--resolve-finding <run> <n> --by <evidence> [--date YYYY-MM-DD]` (date defaults to
  today, UTC):
  - It appends the marker to that one row's `Filed as` cell and changes no other byte of the file.
  - It refuses, writing nothing, when:
    - the run or the finding does not exist (exit 4);
    - the row links a bug (exit 2; close the bug instead);
    - the evidence fails the same verification `loadFindings` applies (exit 2, with the reason);
    - the row is already resolved by different evidence (exit 2; a resolved finding is not
      re-resolved).
  - The same resolution twice is a no-op, exit 0.
- **Report.** `--findings` counts valid resolutions as closed. `--findings --all` renders the row's
  label as `[note — resolved <date> by <evidence>]`. `--json` carries `resolution`.

---

## 4. Scope

### In Scope

- Parse, verify, count and check resolutions in `uat-status.mjs`.
- `--resolve-finding` with its refusals and exit codes, and its line in the header usage block (`:24`).
- Unit tests in `evals/qa-next/unit/uat-status.test.mjs`.
- Docs that define the cell:
  - `skills/qa-next/assets/run.template.md` § Findings, the **Filed as** definition;
  - `skills/qa-next/SKILL.md` Step 4.3 (a later run that finds an earlier note's subject gone resolves
    it, with itself as evidence), § "What this skill never does" (the one narrow exception to
    "Overwrite a previous run file"), and § "Running as a loop";
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

1. `skills/qa-next/scripts/uat-status.mjs`: Phases 1–2.
2. `evals/qa-next/unit/uat-status.test.mjs`: every criterion in § 9 has a row here.
3. `skills/qa-next/assets/run.template.md`: the **Filed as** definition.
4. `skills/qa-next/SKILL.md`: Step 4.3, § "What this skill never does", § "Running as a loop".
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

- [ ] A note whose `Filed as` ends `— resolved 2026-10-16 by \`<sha>\`` naming an existing commit is
      counted as closed by `--findings`, and shown by `--findings --all` as resolved.
- [ ] The same marker naming a sha that is not a commit keeps the row open, and `--check` exits
      non-zero naming the run, the finding number and `commit-not-found`.
- [ ] A marker naming a later run file closes the row. One naming the row's own run (`run-is-self`),
      an earlier run (`run-not-later`) or a missing file (`run-not-found`) keeps it open, and
      `--check` names the reason.
- [ ] A marker on a row that links a bug changes nothing about its state (the bug's status
      governs), and `--check` reports `on-a-bug-link`.
- [ ] `--resolve-finding <run> <n> --by <evidence>`:
  - writes the marker into that row's `Filed as` cell, and every other byte of the run file is unchanged;
  - running it again with the same arguments exits 0 and changes nothing;
  - each refusal in § 3 Target exits with its stated code and leaves the file byte-identical.
- [ ] A run file with no markers yields the same `--findings`, `--findings --json` and `--check`
      output as before this task, asserted over the existing fixture.

### Code Quality

- [ ] `isOpenFinding` performs no I/O. A test calls it on plain objects.
- [ ] `npm test` and `npm run ci:fast` pass with `.agents/skills` moved aside.
- [ ] Every criterion above is asserted by a test in `evals/qa-next/unit/uat-status.test.mjs` that
      runs per PR.

### Documentation

- [ ] `run.template.md`, `SKILL.md` and `README.md` define the marker grammar identically and name
      `--resolve-finding` as its only writer.
- [ ] SKILL.md § "What this skill never does" states the one exception to "Overwrite a previous run
      file": `--resolve-finding` appends to a single `Filed as` cell.

---

## 10. Risk Assessment

- **Medium: the writer edits a committed record.** Mitigation: one cell only, located by
  `FINDING_ROW`, with a byte-equality assertion over the rest of the file in tests.
- **Medium: a resolution that claims more than its evidence shows.** Mitigation: evidence is
  verified on every `--check`, not only when written, so a rebased-away sha or a deleted run file
  reopens the row loudly.
- **Low: git unavailable.** A commit-evidence marker outside a git work tree is
  `not-a-git-repo`: the row stays open and `--check` reports it. It is never accepted unverified.

---

## 11. Rollback Plan

- **Immediate:** revert the task's commits. Markers already written stay in run files as plain text;
  the old parser ignores them, so the rows read as open notes again and nothing breaks.
- **Trigger:** `--findings` closing a row whose evidence does not hold, or `--resolve-finding`
  changing any byte outside the target cell.

---

## Change Log
<!-- change-log-start -->

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-16 | 1.0     | Initial draft | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Parse, verify, count
- [ ] Phase 2: The writer
- [ ] Phase 3: Docs

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
