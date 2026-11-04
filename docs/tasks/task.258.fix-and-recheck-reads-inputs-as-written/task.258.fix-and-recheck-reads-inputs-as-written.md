---
id: task.258
title: "finalise fix-and-recheck reads test names, scope entries and run logs as written"
type: task
description: "Close four edge cases the task 257 cycle 2 reviewer reproduced in the Step 8a evaluator: test-file shapes beyond .test.X, Files Summary entries written ./x or in backticks, CRLF run logs, and the :digit boundary on a title that contains a slash."
tags: [finalise, observation, advisory]
category: refactoring
status: planned
priority: Medium
created: 2026-11-04
updated: 2026-11-04
estimated_effort_hours: 4
---

# Technical Task: finalise fix-and-recheck reads test names, scope entries and run logs as written

**Status:** Planned

> Cut from the four advisories task 257's QA gate 2 left open (`recommendations.future`, CR2-1 to CR2-4 in `task.257.gate.2.fix-and-recheck-reads-what-it-claims.yml`; detail in `task.257.qa.2.fix-and-recheck-reads-what-it-claims.md` § New Findings This Cycle). One document because all four are in one file and are the same kind of defect: the evaluator reads its input more narrowly than the way people and runners write it. CR-4 and CR-6 from cycle 1 are not part of this task.

---

## 1. Overview

`/finalise` Step 8a lets a run fix one small finding and carry on. Its evaluator, `finalise-fix-and-recheck.mjs`, has four edges where a real input is read wrongly. Two of them accept a proof they should refuse. Two of them refuse a proof or a scope entry they should accept. The cycle 2 reviewer of task 257 reproduced all four, and so did this task's author on 2026-11-04.

**Scope**: `shared/resources/finalise-fix-and-recheck.mjs`, its test file `shared/resources/tests/finalise-fix-and-recheck.test.mjs`, the one bundled copy under `skills/finalise/references/`, `CHANGELOG.md`, and the Step 8a sentence in `skills/finalise/SKILL.md` that states the test-file rule.

---

## 2. Motivation

### Current Problems

Each was reproduced against `evaluateFixAndRecheck` on 2026-11-04 with a real run file (commands in § 8).

1. **CR2-1, a test file is accepted as a test.** `TEST_FILE_SHAPE` is `/\.(?:test|spec)\.(?!md$)[A-Za-z0-9]+$/`, lowercase and `.test.X` / `.spec.X` only. `mutationProof.test` of `tests/x.TEST.js`, `tests/x_test.go`, `tests/x.sh` or `test_foo.py` each returned `proceed: true`. A file name on a red line is the very proof task 257 set out to refuse: it names a file, not the one test that went red.
2. **CR2-2, a scope entry written the way authors write it is refused.** `pathInScope("src/a.js", ["./src/a.js"])` is false, and so are `"/src/a.js"` and `` "`src/a.js`" ``. The Step 8a prose tells the agent to copy Files Summary entries "as written", and a Files Summary is Markdown, so a leading `./` or a backtick pair is common. The candidate path is held to a canonical form, but the entries are not brought to it.
3. **CR2-3, a CRLF run log is not read.** A red line `not ok 1 - crlf title\r` fails the proof, because `analyseRun` splits on `"\n"` and the `\r` stays in the subject, so the title no longer ends at a boundary. It fails closed (a refusal, never a false accept), but a log recorded on Windows or through a CRLF-converting tool cannot be used.
4. **CR2-4, the `:<digit>` boundary applies to any title with a slash.** `subjectNames` sets `pathy` when the test includes `/` or ends in `.md`. For a title such as `GET /v1`, the red line `✖ GET /v1:5 stuff` returned `proceed: true`, so another test's name was read as this one's. The `:<line>` ending exists for the docs-link clause, whose proof is a `.md` path.

### Benefits

1. **No false proofs from file names**: every common test-file spelling is refused by name, in any letter case.
2. **No refused scope for a well-formed entry**: `./src/a.js`, `/src/a.js` and `` `src/a.js` `` mean `src/a.js`.
3. **A CRLF log is read** like an LF one.
4. **The `:<digit>` ending is tied to the clause that needs it**: a `.md` proof path.

---

## 3. Technical Background

### Current Architecture

All names below were grepped on 2026-11-04 in `shared/resources/finalise-fix-and-recheck.mjs`.

- `TEST_FILE_SHAPE` (`:259`), the regex above; used once, in the `"mutation-proved"` check (`:389`, `if (TEST_FILE_SHAPE.test(m.test.trim()))`).
- `pathInScope` (`:130`, exported): `filesSummary.includes(p)` for the exact string, else `isPlainRelativePath(p)` and `matchesAnyGlob(p, filesSummary.flatMap(entryPatterns))`.
- `entryPatterns` (`:150`): trims the entry, expands braces, adds `**` to a trailing `/`, drops a pattern with no literal segment. It does **not** strip `./`, a leading `/` or backticks.
- `isPlainRelativePath` (`:115`): refuses a leading `/`, `.` and `..` segments, backslashes, control characters and surrounding whitespace. It judges the candidate only.
- `RED_SUBJECT` (`:244`) and `analyseRun` (`:293`, `for (const line of text.split("\n"))`).
- `subjectNames` (`:268`): `const pathy = test.includes("/") || /\.md$/.test(test);`.

The existing tests in `shared/resources/tests/finalise-fix-and-recheck.test.mjs` already cover: a test-file-shaped `mutationProof.test` ("a test-file-shaped mutationProof.test is refused by name"), `pathInScope` ("the exported scope predicate agrees with the gate"), and the docs-link clause's `.md` proof ("the docs-link clause's `.md` proof still proves, on its `✖ <file>:<line>` line"). The helper `realRun` produces a log from a real `node --test` run, and `proofFor(test, run)` builds a finding.

Property claimed and run (obs #161): the four reproductions in § 8 were run against the shipped evaluator, not read off the code.

### Target Architecture

- **CR2-1.** `TEST_FILE_SHAPE` becomes a function `isTestFileName(name)`. A name is a test file when it has **no whitespace** (a title with spaces is a title) and does not end in `.md`, and either its basename matches, case-insensitively, `.test.X`, `.spec.X`, `_test.X` or `test_*.X`, or a directory segment is `test`, `tests` or `__tests__` and the basename has an extension. The "no whitespace" rule is the guard against refusing a real title.
- **CR2-2.** A single `normaliseEntry(entry)` brings a Files Summary entry to the canonical form: trim, drop one surrounding pair of backticks, then drop leading `./` segments and one leading `/`. `pathInScope` compares the candidate with the normalised entry as well as the raw one (the raw comparison stays, so nothing admitted today is refused), and `entryPatterns` builds its patterns from the normalised entry. The candidate is still judged by `isPlainRelativePath`, so `/etc/passwd` and `../x` remain refused whatever an entry says.
- **CR2-3.** `analyseRun` splits on `/\r?\n/`.
- **CR2-4.** `pathy` is `/\.md$/.test(test)`.

### Important Clarifications

- Stripping a leading `/` from an entry is a decision: Files Summary paths are repo-relative by contract, so `/src/a.js` names `src/a.js`. It does not widen the candidate, which stays canonical and relative.
- None of the four touches the severity merge (CR-4) or the runner-format fixtures (CR-6). Those stay open.

---

## 4. Scope

### In Scope

✅ **Test-file recognition (CR2-1)**: case-insensitive, `.test.X`, `.spec.X`, `_test.X`, `test_*.X`, and a file under a `test`/`tests`/`__tests__` directory.
✅ **Entry normalisation (CR2-2)**: `./`, leading `/`, surrounding backticks.
✅ **CRLF (CR2-3)** and **the `:<digit>` boundary (CR2-4)**.
✅ **Tests, the refreshed bundled copy, one CHANGELOG entry and the Step 8a sentence.**

### Out of Scope

❌ **CR-4 (merged severity over two failing members) and CR-6 (runner-format fixtures)**: carried from cycle 1, each its own change.
❌ **Any change to the severity, precondition ids or exit codes.**

---

## 5. Breaking Changes

None. Two behaviours get stricter and two get more accepting, all on inputs that were already wrong:

- A `mutationProof.test` that is a single token shaped like a test file is now refused. No real test title is a single token with an extension.
- A Files Summary entry spelled `./x`, `/x` or `` `x` `` is now read as `x`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.258.plan.fix-and-recheck-reads-inputs-as-written.md](task.258.plan.fix-and-recheck-reads-inputs-as-written.md)

### Phase 1: Test-file recognition (CR2-1)

**Risk Level**: Medium. This phase is the one that can refuse a real title.

**Files**:
- `shared/resources/finalise-fix-and-recheck.mjs`
- `shared/resources/tests/finalise-fix-and-recheck.test.mjs`

**Changes**:
- [ ] Write the failing tests first, using the four reproduced names (`tests/x.TEST.js`, `tests/x_test.go`, `tests/x.sh`, `test_foo.py`) and confirm each is red against the current code.
- [ ] Replace `TEST_FILE_SHAPE` with `isTestFileName` as described in § 3, and use it at the `"mutation-proved"` check.
- [ ] Add the controls: a title with spaces that contains `test` and `/` is not refused; a `.md` proof path is not refused; `tests/x.test.js` is still refused.

**Dependencies**: none.

---

### Phase 2: Scope entries (CR2-2)

**Risk Level**: Low.

**Files**: the same two.

**Changes**:
- [ ] Failing tests first: `./src/a.js`, `/src/a.js`, `` `src/a.js` ``, and `./src/` as a directory prefix.
- [ ] Add `normaliseEntry`; use it in `pathInScope` and `entryPatterns`.
- [ ] Controls: `pathInScope("/etc/passwd", ["/etc/passwd"])` stays false because the candidate guard still refuses it; `pathInScope("src/b.js", ["./src/a.js"])` is false; an entry with no literal segment (`./**`) still stands for nothing.

**Dependencies**: none (independent of Phase 1).

---

### Phase 3: CRLF and the `:<digit>` boundary (CR2-3, CR2-4)

**Risk Level**: Low.

**Files**: the same two.

**Changes**:
- [ ] Failing tests first: a real-shaped log with `\r\n` line ends proves its test; `✖ GET /v1:5 stuff` does not prove `GET /v1`.
- [ ] `text.split(/\r?\n/)` in `analyseRun`; `pathy` becomes `/\.md$/.test(test)`.
- [ ] Control: the docs-link `.md` proof on its `✖ <file>:<line>` line still proves.

**Dependencies**: none.

---

### Phase 4: Bundle, CHANGELOG and prose

**Risk Level**: Low.

**Files**: `skills/finalise/references/finalise-fix-and-recheck.mjs` (generated), `CHANGELOG.md`, `skills/finalise/SKILL.md`.

**Changes**:
- [ ] Run `npm run bundle`, then `npm run bundle:check`.
- [ ] One CHANGELOG entry under `[Unreleased]` → `### Fixed` that cites `task 258` and the four ids.
- [ ] Update the Step 8a sentence "the evaluator refuses a file-shaped value" so it names the shapes (`*.test.*`, `*.spec.*`, `*_test.*`, `test_*.*`, a file under `tests/`), in any case.
- [ ] Run the mutation record (§ 8) and write it into the QA report.

**Dependencies**: Phases 1 to 3.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/finalise-fix-and-recheck.mjs` — `isTestFileName`, `normaliseEntry`, `analyseRun` split, `subjectNames` `pathy`

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/finalise-fix-and-recheck.test.mjs` — one failing-first test per defect, plus the controls

### Files to Modify (Documentation)

3. ✅ `CHANGELOG.md`
4. ✅ `skills/finalise/SKILL.md` — the Step 8a test-file sentence

### Generated (by `npm run bundle`)

5. ✅ `skills/finalise/references/finalise-fix-and-recheck.mjs`

The only skill that bundles the evaluator is `finalise`. Measured with `git ls-files | grep "finalise-fix-and-recheck"` on 2026-11-04: `shared/resources/finalise-fix-and-recheck.mjs`, its preconditions JSON and test, and `skills/finalise/references/` copies of the `.mjs` and the JSON. The preconditions JSON is not changed.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `shared/resources/tests/finalise-fix-and-recheck.test.mjs`.
- **Command**: `CI=true command node --test shared/resources/tests/finalise-fix-and-recheck.test.mjs`.
- **Reproduce first.** Each of the four must be red before its fix. The CR2-1, CR2-3 and CR2-4 reproductions build a finding with a one-line run file and call `evaluateFixAndRecheck`; CR2-2 calls `pathInScope("src/a.js", ["./src/a.js"])` and reads `false`. Run them on the unchanged tree and keep the red output.

### Controls (a rule that is only run on its own example proves little)

- **CR2-1**: `test_parse_title` (no extension) and the title `tests dir is skipped` are not refused; `docs/tests/x.md` is not refused.
- **CR2-2**: a directory prefix `./src/` still admits `src/a.js` and not `srcx/a.js`.
- **CR2-3**: an LF log still proves; a `\r` inside a title (not at the end) is unchanged.
- **CR2-4**: a `.md` proof path with `:12` still proves; a plain title with `:5` after it does not.

### Mutation

Revert each fix and name the test that goes red. Record the table in the QA report (`task.258.qa.{N}.*.md`), which is committed before acceptance.

| # | Mutation | Test expected red |
| - | -------- | ----------------- |
| 1 | `isTestFileName` back to the old regex | the case-insensitive and `_test` / `test_` tests |
| 2 | `normaliseEntry` returns the entry unchanged | the `./`, `/` and backtick tests |
| 3 | `split("\n")` | the CRLF test |
| 4 | `pathy` includes `/` again | the `GET /v1` test |

### Consumer Tests

`evals/shared/tests/` suites that import the evaluator are run in full: `grep -rln "finalise-fix-and-recheck" evals shared skills --include=*.mjs --include=*.js`, then `CI=true` over each.

---

## 9. Success Criteria

### Functional

- [ ] `tests/x.TEST.js`, `tests/x_test.go`, `tests/x.sh` and `test_foo.py` as `mutationProof.test` are each refused with "a test file — name the test by its title".
- [ ] `pathInScope("src/a.js", [e])` is true for `e` of `./src/a.js`, `/src/a.js` and `` `src/a.js` ``, and false for `/etc/passwd` as a candidate.
- [ ] A CRLF red line proves its test.
- [ ] `✖ GET /v1:5 stuff` does not prove `GET /v1`; the docs-link `.md` proof still proves.
- [ ] Each of the four mutations in § 8 turns the named test red, recorded in the QA report.

### Performance

- [ ] No measurable change: the evaluator reads one small file and a short list. No baseline is needed.

### Code Quality

- [ ] `CI=true` over `shared/resources/tests/finalise-fix-and-recheck.test.mjs` and the consumer suites passes.
- [ ] `npm run bundle:check` is clean and `./node_modules/.bin/prettier --check` passes on the changed files.
- [ ] `npm run validate -- skills/finalise/` passes (the `SKILL.md` changes).

### Migration

- [ ] `CHANGELOG.md` has the entry, and `changelog-cites.sh task.258` reports it.
- [ ] The Step 8a sentence matches the evaluator's shapes.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A real title refused as a file (Phase 1)**
   - Risk: a rule that is too wide refuses a legitimate `mutationProof.test` and stops a fix-and-recheck.
   - Probability: Low. Impact: Medium (a halt that a person clears).
   - Mitigation: the "no whitespace" rule, the `.md` exclusion and the controls in § 8. The run is refused, never silently passed, so the failure is loud.

### Low Risk Areas

1. **Leading `/` stripped from an entry (Phase 2)**: it can only widen the entries to repo-relative paths the author named, and the candidate guard is unchanged. Mitigation: the `/etc/passwd` control.
2. **Bundle drift**: a hand edit of the `references/` copy is reverted by the next `npm run bundle`. Mitigation: edit only `shared/resources/`.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a legitimate fix-and-recheck refused after merge, or `bundle:check` red on `develop`.
- **Steps**: `git revert` the merge commit, `npm run bundle`, push through a PR.
- **Validation**: the evaluator's test file passes on the reverted tree.

### Partial Rollback (1-2 hours)

- **When to use**: only one of the four misbehaves. Revert that phase's hunk and its test, then re-run `npm run bundle`.

### Forward Fix (< 4 hours)

- **When to use**: Phase 1 refuses a title shape not foreseen. Add the shape to the controls and narrow the rule.

### Rollback Triggers

- **Critical**: a proof accepted that names a test file, or a scope entry admitting a path outside the Files Summary.
- **Non-critical**: a refused input that a person can fix by naming the test by its title.

---

## Progress Tracking

### Phase 1: Test-file recognition (CR2-1)
- [ ] Failing tests, then `isTestFileName`, then controls

### Phase 2: Scope entries (CR2-2)
- [ ] Failing tests, then `normaliseEntry`, then controls

### Phase 3: CRLF and the `:<digit>` boundary (CR2-3, CR2-4)
- [ ] Failing tests, then both fixes, then the control

### Phase 4: Bundle, CHANGELOG and prose
- [ ] Bundle, CHANGELOG, Step 8a sentence, mutation record in the QA report

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-04 | 1.0 | Initial draft — cut from the CR2-1 to CR2-4 advisories of task 257 QA gate 2 | create-task |
<!-- change-log-end -->

---

## References

- `docs/tasks/task.257.fix-and-recheck-reads-what-it-claims/task.257.gate.2.fix-and-recheck-reads-what-it-claims.yml` — `recommendations.future`, CR2-1 to CR2-4
- `docs/tasks/task.257.fix-and-recheck-reads-what-it-claims/task.257.qa.2.fix-and-recheck-reads-what-it-claims.md` — § New Findings This Cycle
- PR #829 (task 257), issue #826
- **Rules**: `shared/resources/mutation-proving.md`

---

## Notes

CR-4 (merged severity can keep `low` over two failing members) and CR-6 (runner-format fixtures) stay open from task 257's cycle 1 and are deliberately not in this task.
