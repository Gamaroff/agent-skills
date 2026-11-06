---
id: task.280
title: "Skill and test tooling see what ships"
type: task
description: "Make four checks look at what actually ships: flag a quote inside a ${NAME:?message} guard, require executed-block tests to use the one fence reader, have bundle:check scan skill-owned reference docs for unvendored scripts, and keep probe mutants out of the tree other tests walk."
tags: [create-skill, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 280: Skill and test tooling see what ships

**Status:** Planned

---

## 1. Overview

Four checks pass while looking at the wrong thing: a block whose `${NAME:?message}` guard holds an apostrophe parses only when a test runs it; tests that run skill blocks find them with a hand-written regex; `bundle:check` skips skill-owned reference docs; and one test's scratch directories sit in the tree another test walks (obs #47, #48, #112, #102).

**Scope**: one lint, one test-helper rule with a repository-wide count check, one discovery change in `bundle_skill.py`, and a scratch location.

---

## 2. Motivation

### Current Problems

1. **An apostrophe inside a `:?` word breaks the block** (obs #47). On task.205 `skills/create-epic/SKILL.md` failed `bash -n` (`unexpected EOF while looking for matching '"'`) because of `: "${DOMAIN:?bind DOMAIN to the epic's domain directory}"`; it was caught only because a test ran the block.
2. **A hand-written fence regex passes on blocks no engine sees** (obs #48). `tests/epic-numbering-retirement.test.js` used `/^([ \t]*)```bash\n([\s\S]*?)^\1```/gm`, which ignores fence nesting. A stray four-backtick fence at `skills/create-epics-from-shards/SKILL.md:334` (on develop since `0260bd17b`, 2026-05-28) put Steps 6–7 inside a code block; the test still passed for five QA cycles.
3. **`bundle:check` misses an invocation in a skill-owned reference** (obs #112). On task.238 `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md` gained `bash .agents/skills/develop-bug/references/fast-gate-outcome.sh`; `npm run bundle` did not vendor the script and `bundle:check` returned rc 0.
4. **Probe mutants race the live-tree scan** (obs #102). `npm run ci` on task.233 failed 1 of 6,340 tests: `tests/bundle-comment-origin.test.js` §2 threw ENOENT on `shared/resources/tests/.t131-mutant-vv92na/change-log.js` while the probe test deleted it.

### Benefits

1. The failure appears where the defect is authored, not in a later run.
2. A test that executes skill blocks executes the same blocks the engines do.
3. `bundle:check` means every shipped invocation resolves.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`.

- `skills/create-skill/scripts/bundle_skill.py:585` `def discover_needed(skill_path, shared_dir, refs_dir)`; `:622` filters scanned files with `'references' not in f.relative_to(skill_path).parts`, so a skill-owned reference doc is never scanned.
- `tests/unbound-default-reads.test.js` scans every `${NAME:?}` read (obs #47); `tests/epic-numbering-retirement.test.js` and `tests/bundle-comment-origin.test.js` exist.
- `shared/resources/qa-execute-snippets.mjs:70` `export function extractBlocks(markdown)` is the one fence reader.
- `shared/resources/tests/security-probe.test.mjs:4517` passes `prefix: "t131-mutant-"` to a mutant-root helper; earlier `mkdtempSync(join(tmpdir(), "probe-…"))` calls (`:337`, `:1121`, `:1227`, `:1524`) already use `os.tmpdir()`. Whether the `t131-mutant-` root still lands under `shared/resources/tests` is `(unverified: the plan opens :4505–:4530)`.

### Target Architecture

- **Lint** (obs #47): flag a `'` (or any unescaped quote) inside the word of a `"${NAME:?word}"`, in `unbound-default-reads.test.js` or the existing fenced-block lint; the convention is stated beside the loud-failure-guard rule in `create-skill`.
- **Fence reader** (obs #48): a test that executes blocks from a `SKILL.md` or shared resource uses `extractBlocks`; a repository-wide check asserts the reader's bash-block count equals the raw ` ```bash ` line count per file, so an unbalanced fence fails when it is authored.
- **Discovery** (obs #112): `discover_needed` (or `bundle:check`) scans skill-owned `references/*.md` for the invocation form and fails when the named script is neither present nor vendorable.
- **Scratch** (obs #102): probe tests create mutants under `os.tmpdir()` (or a gitignored directory the scanners skip), so no test scans a tree another test writes into.

### Important Clarifications

- The stray four-backtick fence at `skills/create-epics-from-shards/SKILL.md:334` is a live defect the count check will find; it is fixed in this task.
- Scanning skill-owned reference docs must not pick up examples in prose; the plan uses the same invocation-form rule discovery already uses for `SKILL.md`.

---

## 4. Scope

### In Scope

✅ **The four checks** and their tests.
✅ **The stray fence** and any other the count check finds.
✅ **A convention sentence** in `create-skill`.

### Out of Scope

❌ **Rewriting every executed-block test** beyond the ones using a hand regex (the plan lists them).
❌ **Changing the fence reader.**

---

## 5. Breaking Changes

None - the checks start failing on defects already present; Phase 1 to 3 fix those that exist.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.280.plan.skill-and-test-tooling-see-what-ships.md](task.280.plan.skill-and-test-tooling-see-what-ships.md)

### Phase 1: The quote lint and the fence count

**Risk Level**: Medium

**Files**:
- `tests/unbound-default-reads.test.js`
- a new fence-count check beside it
- `skills/create-skill/SKILL.md`

**Changes**:
- [ ] `:?` word lint; fence-count check; fix each defect they find (the known four-backtick fence and `create-epic`).

**Dependencies**: none.

---

### Phase 2: Executed-block tests use the one reader

**Risk Level**: Medium

**Files**:
- `tests/epic-numbering-retirement.test.js` and any other hand-regex block extractor (the plan lists them with a grep)

**Changes**:
- [ ] Switch to `extractBlocks`; a rule in `create-skill` and a test that fails on a new hand-written fence regex in `tests/`.

**Dependencies**: Phase 1.

---

### Phase 3: bundle discovery

**Risk Level**: Medium

**Files**:
- `skills/create-skill/scripts/bundle_skill.py`, its tests

**Changes**:
- [ ] Scan skill-owned `references/*.md`; fail on an unresolved invocation; vendor what is vendorable.

**Dependencies**: none.

---

### Phase 4: Scratch location

**Risk Level**: Low

**Files**:
- `shared/resources/tests/security-probe.test.mjs`

**Changes**:
- [ ] Mutant roots under `os.tmpdir()`.

**Dependencies**: none.

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] `command npm run bundle`, `command npm run bundle -- --check`; mutation proofs.

**Dependencies**: Phases 1 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/create-skill/scripts/bundle_skill.py` - discovery
2. ✅ `skills/create-skill/SKILL.md` - two convention sentences
3. ✅ `skills/create-epic/SKILL.md`, `skills/create-epics-from-shards/SKILL.md` - the defects found

### Files to Modify (Tests)

4. ✅ `tests/unbound-default-reads.test.js`, `tests/epic-numbering-retirement.test.js`, a new fence-count test
5. ✅ the bundle script's test file under `skills/create-skill/tests/`
6. ✅ `shared/resources/tests/security-probe.test.mjs`

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each check and its control.

**Actions**:
- [ ] A block with an apostrophe in a `:?` word is flagged; **control**: the same message without it, and an apostrophe in a `:-` default of a single-quoted context that parses, are not.
- [ ] A file with an unbalanced four-backtick fence fails the count check; a balanced one passes.
- [ ] A skill-owned reference doc invoking an unvendored script fails `bundle:check`; one naming a vendored script passes; an example in prose does not trip it.
- [ ] The probe suite and `bundle-comment-origin.test.js` run in parallel 10 times without the ENOENT.
- [ ] Mutation proofs for each.

**Command**: `CI=true command node --test` on the named files; the Python tests via the repository's runner.

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] Each check fails on its defect and passes its control, shown by named tests recorded in the QA report.
- [ ] The repository has no unbalanced fence (the count check passes on the whole tree).
- [ ] `bundle:check` fails on the task.238 shape, shown by a test that recreates it.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each check has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] Ten parallel runs of the two racing test files pass, command and exit codes in the QA report.

### Migration

- [ ] No hand-written fence regex remains in `tests/` (`git grep` count 0, recorded).

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The new checks find more than the known defects**
- **Risk**: several existing files fail.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: Phase 1 measures first; each is fixed here, or a stated exception is added with a reason.
- **Rollback**: revert the check.

**2. Discovery vendors the wrong script**
- **Risk**: a reference-doc example becomes a dependency.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: same invocation-form rule as `SKILL.md`; the "cite or depend" rule keeps fragment citations out.
- **Rollback**: revert Phase 3 and re-bundle.

### Low Risk Areas

**1. Scratch under tmpdir changes a mutant test**
- **Risk**: a path assumption breaks.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the suite runs before and after.
- **Rollback**: revert Phase 4.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `bundle:check` or the new tests are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one check misfires.

**Steps**:
1. Revert that phase and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: an exception or wording.

**Approach**: edit and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- `develop` CI red from the new checks

**Non-Critical (Forward Fix)**:
- a wording or exception

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                 | Author      |
| ---------- | ------- | ----------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #47, #48, #102, #112  | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The quote lint and the fence count
- [ ] Lint, count, defects fixed

### Phase 2: Executed-block tests use the one reader
- [ ] Switched, guarded

### Phase 3: bundle discovery
- [ ] Reference docs scanned

### Phase 4: Scratch location
- [ ] Mutants under tmpdir

### Phase 5: Bundle and sweep
- [ ] Mutation proofs, bundle clean

---

## References

- Observation #47 — Apostrophe inside a ${NAME:?message} guard breaks the skill block's bash parse
- Observation #48 — Executed-block tests parse fences with their own regex and pass on blocks no engine can see
- Observation #102 — security-probe mutant dirs inside shared/resources/tests race the live-tree scan in bundle-comment-origin
- Observation #112 — bundle:check passes when a skill-owned reference doc invokes a shared script that was never vendored

---

## Notes

### Important Reminders

`create-skill` is the home of the cite-or-depend rule; Phase 3 must not turn a citation into a dependency.

### Future Improvements

None.

---

**Status:** Planned
