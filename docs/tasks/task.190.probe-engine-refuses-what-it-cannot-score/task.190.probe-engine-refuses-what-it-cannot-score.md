---
id: task.190
title: "Probe engine refuses what it cannot score"
type: task
description: "security-probe.mjs refuses a cases file with an unknown direction or sink before running anything, resolves its default repo root from the git checkout when run from a bundled copy and refuses an entry it cannot find before writing a record, and carries each declined case's reason into the run record."
tags: [security-probe, finalise, review-security, observation, run-record]
category: refactoring
status: planned
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 8
github_issue: 589
---

# Technical Task: Probe engine refuses what it cannot score

**Status:** Planned
**GitHub Issue**: [#589](https://github.com/Gamaroff/agent-skills/issues/589)

---

## 1. Overview

`shared/resources/security-probe.mjs` accepts three kinds of input it cannot score correctly and says
nothing. A cases file with an unknown `direction` runs, but those cases count toward neither side
(obs #201). A bundled copy resolves its default repo root to `skills/`, so a repo-relative entry
fails and the failed run lands in the record (obs #211). A declined case's reason never reaches the
run record (obs #207). This task makes the engine refuse the first two before it executes or writes
anything, and makes the record say why each declined case was declined.

**Scope**: `shared/resources/security-probe.mjs` (`main`, `runProbeSpec`, `defaultRepoRoot`,
`toRecordEntry`), `shared/resources/tests/security-probe.test.mjs`, the bundled copies, and a
CHANGELOG entry.

**Key deliverables**:

1. Supplied cases are validated before execution: an unknown `direction` or `sink` → exit 2,
   `reason: bad-cases`, naming the case id and the accepted values.
2. The default repo root is the git top level when the engine runs from a bundled copy, and an
   entry that does not exist is refused (exit 2) before `--record` writes anything.
3. The run record carries each declined case's `{id, reason, detail}`.

---

## 2. Motivation

### Current Problems

1. **An unknown direction is scored as neither** (obs #201). On task.159's finalise (2026-09-27)
   four cases were written `"direction": "benign"`. The engine ran all 9, counted those 4 as neither
   hostile nor legitimate, and returned `unverifiable` / `no-legitimate-evidence` with no mention of
   the value. The pre-fix reading showed `present-but-inert` with `overblocked: []`, though two
   "benign" cases had been rejected — a real over-block the verdict could not see.
2. **A bundled copy probes the wrong tree** (obs #211). Run as
   `.agents/skills/finalise/references/security-probe.mjs` without `--repo-root`, the default root is
   two directories above the file's real path, which is `skills/`. On task.150's finalise recheck
   every case errored `entry-not-probeable`, and two `unverifiable` controls were folded into the DoD
   record and had to be removed by hand.
3. **A declined case's reason is lost** (obs #207). On task.151 two `cli:` argv cases were declined
   (`cannot materialise ""`, `name carries a path separator`). The record counted them as declined
   but not why; the reason surfaced only by re-running with `--json`.

### Benefits

- A typo in a cases file is an immediate usage error, not a misleading verdict.
- A run through a bundled copy probes the consumer's tree by default.
- A run the engine itself could not set up never reaches the record.
- A reader of the record sees which cases were not run and why.

---

## 3. Technical Background

### Current Architecture

Line numbers are from `develop` at `b1807611`, paired with the text they point at.

- **Vocabulary** (`shared/resources/security-input-corpus.mjs`): `export const SINKS` (`:29`) and
  `export const DIRECTIONS = Object.freeze(["hostile", "legitimate"])` (`:40`). The engine imports
  only `MATERIALISED_SINKS` and `corpusFor` from it (`security-probe.mjs:192`).
- **Cases intake.** `main` (`security-probe.mjs:2396`) parses `--cases-file` with `JSON.parse` and
  nothing else (`cannot read --cases-file` is its only error). `runProbeSpec` (`:873`) takes supplied
  cases as-is: `if (Array.isArray(cases)) { probeCases = cases; }` (`:1093`).
- **Scoring** filters by direction (`const hostile = ran.filter((c) => c.direction === "hostile")`,
  `:824`; legitimate likewise). A case with any other direction is in neither list.
- **Default root**: `export function defaultRepoRoot() { return resolve(__dirname, "..", ".."); }`
  (`:343`), with `__dirname` from `fileURLToPath(import.meta.url)` (`:202`). Node resolves the
  `.agents/skills` symlink to its real path, so from a bundled copy two levels up is `skills/`.
  Every shipped prompt passes `--repo-root "$(git rev-parse --show-toplevel)"`; only a hand re-run
  without it fails.
- **Record**: `main` runs `preflightRecord` before the run and `recordRun(opts.record, result, …)`
  (`:2207`) after it, whatever the verdict. `toRecordEntry` (`:2030`) stores counts only
  (`declined: result.declined?.length ?? 0`), while `result.declined` holds `{id, reason, detail}`.
- **Argv cases.** Since `5f553950` (2026-09-23) the `cli:` form writes a per-case file only when the
  sink is in `MATERIALISED_SINKS` (`writeInput: fixture !== null`, `:1836`), and
  `probe-boundary-rule.md` says argv-only input belongs under a sink that writes no files. The
  task.151 incident used `--sink filename`. The part of obs #207 still open is the record's missing
  reasons.
- **Tests**: `shared/resources/tests/security-probe.test.mjs` (118 `test(` calls on `b1807611`).

### Target Architecture

- **`validateCases(cases)`**, exported, returns `null` or `{ id, field, value, accepted }` for the
  first bad case: not an object, a `direction` not in `DIRECTIONS`, or a `sink` present and not in
  `SINKS`. `main` calls it after parsing `--cases-file` and before `preflightRecord`: on a bad case
  it writes `bad-cases: case "<id>" has <field> "<value>"; accepted: <list>` to stderr and returns
  2. In `--json` mode it prints `{ reason: "bad-cases", … }`. `runProbeSpec` calls it too and returns
  `decline("bad-cases", …)` for library callers. Nothing executes and nothing is recorded.
- **`defaultRepoRoot()`**: when the file's directory is a `shared/resources` directory, keep two
  levels up. Otherwise (a bundled `references/` copy) use `git rev-parse --show-toplevel` run from
  `process.cwd()`. If git fails, fall back to two levels up, as today. An explicit `--repo-root`
  always wins.
- **Entry must exist before a record is written.** `main` resolves the entry (`resolveEntry`, `:371`)
  before `preflightRecord`. A resolved path that does not exist on disk → exit 2,
  `reason: entry-not-found`, naming the resolved path and the root used. No record is written.
- **`toRecordEntry`** keeps every count and adds
  `declined_cases: [{ id, reason, detail }]` (empty array when none). This is additive; record
  readers that read counts are unchanged.

### Important Clarifications

- Task.180 (`fence:` form) and task.181 (`shell-argv:` form), both planned, edit the same engine and
  test file. Their changes are new entry forms; this task touches intake, the default root and the
  record. Whichever lands second rebases. Neither depends on this one.
- No sink is added for argv cases: the existing rule (a sink that writes no files) already covers
  obs #207's first remedy.

---

## 4. Scope

### In Scope

✅ `security-probe.mjs`: `validateCases`, the `main` checks, `defaultRepoRoot`, `toRecordEntry`.
✅ `security-probe.test.mjs` cases for each.
✅ Bundled copies via `npm run bundle`; CHANGELOG.

### Out of Scope

❌ New entry forms or sinks (tasks 180 and 181).
❌ Changing any verdict rule in `computeVerdict`.
❌ Rewriting existing run records.

---

## 5. Breaking Changes

### Breaking Change 1: a cases file with an unknown direction or sink now exits 2

- **Before**: the run executes; unknown-direction cases count toward neither side; exit 0 or 1 by
  verdict.
- **After**: exit 2, `reason: bad-cases`, nothing executed, nothing recorded.
- **Affected**: any caller that wrote such a file. A repo grep for committed cases files with a
  direction outside `hostile`/`legitimate` is part of Phase 1; on `b1807611` the incident's file was
  a `.claude/state` scratch file, not committed.
- **Migration**: correct the value to `hostile` or `legitimate`; the error names the case.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.190.plan.probe-engine-refuses-what-it-cannot-score.md](task.190.plan.probe-engine-refuses-what-it-cannot-score.md)

### Phase 1: Validate supplied cases (obs #201)

**Risk**: Low. **Files**: `shared/resources/security-probe.mjs`, its test.

- [ ] Export `validateCases`; import `DIRECTIONS` and `SINKS` from the corpus module.
- [ ] `main`: validate after parsing `--cases-file`, before `preflightRecord`; exit 2 `bad-cases`.
- [ ] `runProbeSpec`: same check on supplied `cases`, returning `decline("bad-cases", …)`.
- [ ] Grep committed cases files (`git ls-files '*.json'` containing `"direction"`) for unknown
  values; fix any found.

### Phase 2: Default root and missing entry (obs #211)

**Risk**: Medium (every default call changes root on bundled copies). **Files**: same.

- [ ] `defaultRepoRoot`: git top level when not running from `shared/resources`; fallback as today.
- [ ] `main`: resolve the entry before `preflightRecord`; a missing path → exit 2
  `entry-not-found`, no record.

### Phase 3: Declined reasons in the record (obs #207)

**Risk**: Low. **Files**: same.

- [ ] `toRecordEntry`: add `declined_cases: [{id, reason, detail}]`.
- [ ] Confirm every reader of the record (`git grep -n 'totals\.\|declined' -- shared/resources/*.mjs
  shared/resources/*.md`) reads counts only, so the field is additive.

### Phase 4: Bundle and changelog

**Risk**: Low. **Files**: bundled copies, `CHANGELOG.md`.

- [ ] `npm run bundle`; `npm run bundle:check` clean.
- [ ] `[Unreleased]` › Fixed entry citing obs #201, #207, #211.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/security-probe.mjs` — `validateCases`, `main` checks, `defaultRepoRoot`,
   `toRecordEntry`.

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/security-probe.test.mjs` — new cases per phase.

### Files to Modify (Generated)

3. ✅ Bundled copies of `security-probe.mjs` under `skills/*/references/` (finalise, qa-task,
   qa-story, review-security, and any other the bundler reaches), regenerated by `npm run bundle`.

### Files to Modify (Documentation)

4. ✅ `CHANGELOG.md` — `[Unreleased]` › Fixed.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Command**: `command node --test shared/resources/tests/security-probe.test.mjs`
- **Phase 1**: a cases file with `"direction": "benign"` → exit 2, stderr names the case id and
  `hostile, legitimate`, no record file created; `"sink": "nope"` → same with the sink list; a valid
  file → unchanged behaviour. **Control**: a case with `direction: "legitimate"` and no `sink`
  passes validation (the check must not over-fire on an absent optional field).
- **Phase 2**: `defaultRepoRoot` evaluated from a copy of the engine placed under a temp
  `skills/x/references/` inside a temp git repo returns the repo's top level; from a copy under
  `shared/resources/` returns two levels up; outside any git repo it falls back. A missing entry with
  `--record` → exit 2 `entry-not-found`, record file absent.
- **Phase 3**: a run with one declined case writes a record whose entry carries `declined_cases` with
  that case's id, reason and detail, and `declined: 1`.

### Integration Tests

- `npm test` (the finalise and QA gate tests that read records), `npm run bundle:check`.

### Mutation proofs

- Remove the `main` validation call → the "benign" case runs and the exit-2 test goes red.
- Revert `defaultRepoRoot` → the bundled-copy test goes red.
- Move the entry check after `preflightRecord` → the "record file absent" assertion goes red.

### Performance Tests

Not applicable: one validation pass over the cases and one `git` call on the default path.

---

## 9. Success Criteria

### Functional

- [ ] A cases file with a `direction` outside `DIRECTIONS` exits 2 with `bad-cases`, names the case
  and the accepted values, executes nothing and writes no record — held by `security-probe.test.mjs`
  (Phase 1).
- [ ] A case `sink` outside `SINKS` is refused the same way — held by the same test (Phase 1).
- [ ] Run from a bundled `references/` copy inside a git repo with no `--repo-root`, the default root
  is the repo's top level — held by the same test (Phase 2).
- [ ] A non-existent entry with `--record` exits 2 with `entry-not-found` and leaves no record — held
  by the same test (Phase 2).
- [ ] A record entry carries `declined_cases` with each declined case's `id`, `reason` and `detail` —
  held by the same test (Phase 3).

### Performance

- [ ] Not applicable: no change to how many cases run.

### Code Quality

- [ ] `npm test`, `npm run bundle:check`, `prettier --check .` pass.

### Migration

- [ ] CHANGELOG entry states the new exit-2 refusals and the `declined_cases` field.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The default root changes for bundled copies**
   - **Risk**: a caller that relied on the old default (running from inside `skills/`) now resolves
     elsewhere.
   - **Probability**: Low — every shipped prompt passes `--repo-root` explicitly.
   - **Mitigation**: the explicit flag still wins; the fallback keeps today's root when git fails.
2. **Overlap with tasks 180 and 181**
   - **Mitigation**: disjoint functions; rebase whichever lands second.

### Low Risk Areas

1. **Record readers and a new field**: additive; Phase 3 confirms readers use counts only.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: QA or finalise probe runs exit 2 on valid input; a DoD record unreadable.
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: `security-probe.test.mjs` and the gate tests green.

### Partial Rollback (1-2 hours)

- Each phase reverts independently.

### Forward Fix (< 4 hours)

- A validation that over-fires: loosen the field check; the control case gains the shape.

### Rollback Triggers

- **Critical**: a valid probe run refused, or a record not written for a run that executed.
- **Non-critical**: a message that names the wrong field → forward fix.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #201, #207, #211 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Validate supplied cases

- [ ] Not started

### Phase 2: Default root and missing entry

- [ ] Not started

### Phase 3: Declined reasons in the record

- [ ] Not started

### Phase 4: Bundle and changelog

- [ ] Not started

---

## References

- Observation #201 — security-probe accepts an unknown case direction silently and scores it as neither
- Observation #207 — security-probe cli: form materialises argv cases as fixture files, declining the edge inputs an argv parser must refuse
- Observation #211 — security-probe default --repo-root resolves through the .agents/skills symlink to skills/, so a repo-relative entry is unprobeable and the decline lands in the record
- task.180, task.181 — planned entry-form work on the same engine

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.190.qa.{n}.probe-engine-refuses-what-it-cannot-score.md`,
  `task.190.gate.{n}.probe-engine-refuses-what-it-cannot-score.yml`, bug reports as
  `task.190.bug.{N}.{name}.md`.
- This task changes a security control's intake. QA's boundary rule applies: `validateCases` is a
  validator, so its probe is the cases-file shapes it must refuse and accept.

### Future Improvements

- Validate the rest of a case's shape (`id` presence and uniqueness, `input` type per entry form) in
  the same function.
