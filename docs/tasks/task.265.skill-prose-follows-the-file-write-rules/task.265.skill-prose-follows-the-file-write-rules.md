---
id: task.265
title: "Skill prose follows the file-write rules"
type: task
description: "State once that repository files and body payloads are written with the file tool, add the sanctioned recipes the prose lacks (edit, mutation revert, gate write, fresh-body post), and ratchet the payload heredocs the shipped prose still carries."
tags: [qa-task, qa-fix, finalise, ensure-task-github-issue, develop-task, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 8
---

# Task 265: Skill prose follows the file-write rules

**Status:** Planned

---

## 1. Overview

The maintainer's standing rules forbid a heredoc that carries doc text or a payload, and forbid editing a file with an interpreter script or `sed -i`. The shipped skill prose contradicts both rules in places, names no sanctioned replacement for the jobs the rules block, and has no guard. Agents copy the prose, so the rules hold only while an agent remembers them (six observations, #15, #85, #88, #106, #123, #158).

**Scope**: (a) one statement of the rule, (b) the recipes the prose lacks, (c) a ratchet over the payload heredocs that remain. Moving the remaining payload heredocs off is a separate task (see § 4 and Notes).

---

## 2. Motivation

### Current Problems

1. **The prose prescribes what the rules forbid.** Measured 2026-11-06 with `git grep -nE "(cat|tee)[^|]*<<-?['\"]?[A-Za-z_]+['\"]?" -- 'skills/*/SKILL.md' 'shared/resources/*.md'` (minus `security-input-corpus.md`, whose rows are test data): **32** payload-writing heredoc lines. The looser #88 command, `git grep -nE "<<-?['\"]?[A-Z_]+['\"]?"` over the same paths, returns 47 lines in 22 files; the other 15 are prose about heredocs, one `done <<EOF` loop and corpus rows (obs #88, #106).
2. **No recipe for the jobs the rules block.** A mutation proof needs a revert-and-restore edit; `shared/resources/mutation-proving.md` step 4 suggests "a Python `assert new != old` after `str.replace`", an interpreter edit. The `develop-pipeline-step-3-develop-loop.md` § "Inline implementation instead of `/develop`" says nothing about how files are changed. The rule was then broken three times in seven days, on correct diffs (obs #123, #158).
3. **A gate written through an unquoted heredoc executes its own findings.** `qa-task` Step 10 binds `GATE_HEAD` and `GATE_UPDATED` and then shows a YAML block, without saying how it is written. On task.180 an unquoted heredoc ran three backtick spans quoted in a finding and truncated them silently (obs #15).
4. **A post can republish last cycle's body.** `qa-fix` Step 7 writes `.claude/state/comment-body.md` and posts it, and nothing asserts the file is this cycle's. On task.222 a failed write and the two posts ran in one parallel batch; two comments went out stale (obs #85).

### Benefits

1. A prose example no longer pulls an agent against the operator's rule.
2. Each blocked job has a named replacement, so the fast shell edit stops looking like the only fast option.
3. A new payload heredoc fails a test instead of passing review.
4. A stale body cannot reach a tracker or a PR.

---

## 3. Technical Background

### Current Architecture

Every `path:line` below is a `git grep -n` hit from 2026-11-06 at `develop` `bdd755c7`; an entry marked `(unverified)` was not grepped.

- Payload heredocs in shipped prose: 32 lines (command in § 2). Sites that matter here: `skills/qa-task/SKILL.md:680` (findings JSON), `:1873` (PR comment body); `skills/qa-story/SKILL.md:1181`, `:2417`; `skills/finalise/SKILL.md:2530`, `:2629`, `:3123`; `skills/ensure-task-github-issue/SKILL.md:172`; `shared/resources/tracker-comment-contract.md:59`. The CI poll heredoc obs #106 named is already gone (`83fc192b`, `references/finalise-ci-poll.sh`).
- `skills/ensure-task-github-issue/SKILL.md:162` already tells the reader the unquoted heredoc "is a real residual risk" and to prefer the editor tool — the prose knows the rule and ships the heredoc anyway. The same note sits in the bug, epic and story siblings.
- `skills/qa-task/SKILL.md:1266` (`### Step 10: Create Quality Gate File`) binds the head and the clock, then shows the gate schema without a write method.
- `skills/qa-fix/SKILL.md:903` (`### Step 7: Post Fix Summary to PR`) writes the body at `:1086` with `printf '%s' "$TRACKER_COMMENT_BODY" > .claude/state/comment-body.md` and no freshness assertion. `grep -n -iE "stale"` over the file returns only an unrelated hit at `:705`.
- `shared/resources/mutation-proving.md:53` names the Python `assert` after `str.replace`. `skills/qa-task/SKILL.md:849` points at the same document's `cp`-snapshot rule.
- `shared/resources/develop-pipeline-step-3-develop-loop.md:145` is `#### Inline implementation instead of /develop (iteration 1 only)`. It is bundled byte-for-byte into `skills/develop-{task,story,bug}/references/`. The `--body-file` population is 31 files (`git grep -lE -- '--body-file'` over the same paths).

### Target Architecture

- **One rule statement** in a shared source, cited by fragment from the sites below (not bundled as a dependency): repository files are changed with the file tool, one hunk per call; bodies and payloads are written with the file tool and passed by path; a block an agent runs verbatim carries no payload heredoc.
- **Recipes**, each beside the job: mutation revert (Edit, run, Edit back, `git diff --stat` empty); gate write (file tool, then the two computed fields); fresh-body post (write in one call, post in a later one, assert a line only this cycle's body carries).
- **A ratchet test** that counts payload heredocs in shipped prose, holds the count at today's 32 through an allowlist keyed on file and line text, and fails on a new one or on a stale allowlist entry.

### Important Clarifications

- The ratchet does not remove any existing heredoc. It stops the number rising and makes each removal a visible allowlist deletion.
- `qa-task` Step 10's head and clock are read, never typed (task.135). The recipe keeps that: the bind block prints both values and the gate-head freshness test stays the backstop.

---

## 4. Scope

### In Scope

✅ **Rule statement**: one shared source plus fragment citations from the sites below.
✅ **Recipes**: Edit rule for the `develop-*` orchestrators including the QA loop, mutation revert recipe, gate write shape, fresh-body assertion.
✅ **Ratchet**: a test over shipped prose with a non-vacuity control.

### Out of Scope

❌ **Rewriting the 32 heredoc sites.** That is the migration half of a primitive-then-migration split (`create-task` § 1.2): the primitive here is the rule, recipes and ratchet; a follow-up task moves each site. Splitting by outcome keeps this task shippable alone.
❌ **Changing any engine** (`tracker-comment.js`, `qa-read-back.js`). They already read a body file.
❌ **The user-level memory file** obs #123 mentions; it was rewritten already.

---

## 5. Breaking Changes

None - prose and one new test. No script, flag or exit code changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.265.plan.skill-prose-follows-the-file-write-rules.md](task.265.plan.skill-prose-follows-the-file-write-rules.md)

### Phase 1: State the rule once

**Risk Level**: Low

**Files**:
- `shared/resources/` (one new or extended source; plan names it)
- `shared/resources/develop-pipeline-step-3-develop-loop.md`
- `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:
- [ ] Write the rule statement (obs #88 decision: the library does not show payload heredocs; an agent without a file tool is the only exception).
- [ ] Cite it by fragment from the inline-implementation section (obs #123) and from the QA loop, which the third slip happened in.

**Dependencies**: none.

---

### Phase 2: Mutation revert recipe

**Risk Level**: Low

**Files**:
- `shared/resources/mutation-proving.md`
- `skills/qa-fix/SKILL.md`, `skills/qa-task/SKILL.md`, `skills/develop-task/SKILL.md` (a citation each)

**Changes**:
- [ ] Replace the Python `assert` wording at `mutation-proving.md:53` with the Edit-based recipe; keep the applied-check block unchanged.
- [ ] Add the one-line citation at each site (obs #158).

**Dependencies**: Phase 1 (the citation target).

---

### Phase 3: Gate write and fresh-body post

**Risk Level**: Medium

**Files**:
- `skills/qa-task/SKILL.md` (Step 10), `skills/qa-story/SKILL.md` (gate step)
- `skills/qa-fix/SKILL.md` (Step 7)

**Changes**:
- [ ] State the gate write shape at Step 10 in both QA skills (obs #15).
- [ ] Add the freshness assertion and the two-call rule at `qa-fix` Step 7, and cite it from the other `--body-file` posting sites the plan lists (obs #85).

**Dependencies**: Phase 1.

---

### Phase 4: Ratchet

**Risk Level**: Medium

**Files**:
- `shared/resources/tests/payload-heredoc-ratchet.test.mjs` (new)
- `package.json` (test glob, only if the new file is outside an existing glob)

**Changes**:
- [ ] Count payload heredocs with the § 2 definition; hold today's 32 in an allowlist; fail on a new site and on a stale entry.
- [ ] Control cases: a fixture with one quoted and one unquoted payload heredoc must be counted (calibration), and a prose line that only mentions `<<'EOF'` must not be.

**Dependencies**: Phases 1 to 3 (the ratchet's message cites the rule).

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] `npm run bundle`, then `npm run bundle -- --check`.
- [ ] Doc sweep: grep the consumer docs for any restatement of the heredoc advice (behaviour-change doc sweep).

**Dependencies**: Phases 1 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/mutation-proving.md` - Edit-based revert recipe
2. ✅ `shared/resources/develop-pipeline-step-3-develop-loop.md` - how files are changed on the inline path
3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` - same rule in the QA loop
4. ✅ `skills/qa-task/SKILL.md` - Step 10 gate write; mutation citation
5. ✅ `skills/qa-story/SKILL.md` - gate step write shape
6. ✅ `skills/qa-fix/SKILL.md` - Step 7 freshness assertion; mutation citation
7. ✅ `skills/develop-task/SKILL.md` - mutation citation (plan confirms the exact anchor)
8. ✅ one shared source for the rule statement (new or extended; Phase 1 decides)

### Files to Modify (Tests)

9. ✅ `shared/resources/tests/payload-heredoc-ratchet.test.mjs` - new

### Files to Modify (Generated)

10. ✅ bundled `references/` copies under `skills/*/references/` - regenerated by `npm run bundle`, never hand-edited

### Files to Modify (Documentation)

11. ✅ `docs/reference/skill-catalog.md` - only if a skill description changes (`npm run generate-catalog`)

---

## 8. Testing Strategy

### Unit Tests

**Scope**: the ratchet's counting function.

**Actions**:
- [ ] A fixture with a quoted and an unquoted `cat > f <<…` is counted twice.
- [ ] A prose line mentioning `<<'EOF'` and a `done <<EOF` loop are not counted.
- [ ] An allowlist entry with no matching line fails the test.

**Command**: `CI=true command node --test shared/resources/tests/payload-heredoc-ratchet.test.mjs`

**Target**: the new test is red against a copy of the prose with one heredoc added (mutation proof, recorded in the QA report).

### Integration Tests

**Scope**: bundling.

**Actions**:
- [ ] `command npm run bundle -- --check` reports 0 problems.
- [ ] `CI=true command npm test` passes.

### Behavioural Evidence

The recipes are prose. Evidence is a fresh session following the Step 10 and Step 7 text with a finding that quotes backticks; the control is a finding quoting `$(…)` the text never mentions.

---

## 9. Success Criteria

### Functional

- [ ] The rule is stated in exactly one shared source and cited by fragment from the inline-implementation section, the QA loop and the mutation recipe; `grep` of each site returns the citation (command in the QA report).
- [ ] `mutation-proving.md` no longer names an interpreter edit (`grep -n "Python" shared/resources/mutation-proving.md` returns nothing for step 4).
- [ ] `qa-task` Step 10 and `qa-story`'s gate step state the write method; `qa-fix` Step 7 holds a freshness assertion and the two-call rule.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, measured once and recorded in the QA report.

### Code Quality

- [ ] The ratchet fails when a payload heredoc is added to a shipped prose file and passes at the committed count (mutation proof recorded in the QA report).
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/<skill>` passes for each skill edited.

### Migration

- [ ] The follow-up task for the 32 sites is filed and named in the QA report.
- [ ] A one-line note on the split is in `docs/tasks/task-registry.md` § Notes.

---

## 10. Risk Assessment

### High Risk Areas

None identified.

### Medium Risk Areas

**1. The ratchet's definition is wrong**
- **Risk**: it counts prose or misses a spelling (`tee`, `<<-`).
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: the § 2 definition is measured, the controls in § 8 calibrate it, and the allowlist is keyed on file plus line text, not number.
- **Rollback**: delete the test file.

**2. Edited prose is bundled into skills that ship**
- **Risk**: a hand edit to `references/` is reverted by the next bundle.
- **Probability**: Low
- **Impact**: Major
- **Mitigation**: edit `shared/resources/` sources only; `bundle --check` in the gate.
- **Rollback**: revert the commit.

### Low Risk Areas

**1. The freshness assertion blocks a legitimate post**
- **Risk**: a body lacks the asserted line.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the assertion names the line it expects and exits non-zero with a message; it posts nothing.
- **Rollback**: forward fix.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- the ratchet is red on `develop` after merge
- a bundled skill fails `quick_validate.py`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green on `develop`.

---

### Partial Rollback (1-2 hours)

**When to Use**: only the ratchet misbehaves.

**Steps**:
1. Delete `payload-heredoc-ratchet.test.mjs` and its `package.json` glob entry if one was added.

---

### Forward Fix (< 4 hours)

**When to Use**: a recipe reads wrongly.

**Approach**: edit the shared source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- a red `develop` pipeline caused by the new test

**Non-Critical (Forward Fix)**:
- wording of a recipe

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #15, #85, #88, #106, #123, #158 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: State the rule once
- [ ] Rule statement written
- [ ] Cited from the inline section and the QA loop

### Phase 2: Mutation revert recipe
- [ ] Recipe replaces the interpreter wording
- [ ] Citations added

### Phase 3: Gate write and fresh-body post
- [ ] Gate write shape stated
- [ ] Freshness assertion added

### Phase 4: Ratchet
- [ ] Test and controls written

### Phase 5: Bundle and sweep
- [ ] Bundle clean, doc sweep done

---

## References

- Observation #15 — qa-task gate write via unquoted heredoc executes backticks in quoted findings
- Observation #85 — Comment posted with a stale body file after its write failed in the same parallel batch
- Observation #88 — Skills prescribe heredocs for bodies and scripts, against the maintainer's no-heredoc rule
- Observation #106 — Verbatim pipeline blocks write payloads with heredocs the operator forbids
- Observation #123 — Inline Step 3 edited a doc through an interpreter heredoc against the Edit-tool rule
- Observation #158 — Edit-only rule broken for mutation proofs: no sanctioned revert recipe

---

## Notes

### Important Reminders

A prohibition without its replacement gets broken at the moment the replacement looks slower (obs #158). Every rule sentence this task adds names the sanctioned recipe beside it.

### Future Improvements

The migration task: move the 32 sites to the file tool plus `--body-file`, deleting one allowlist entry each, per-axis (`qa-*`, `finalise`, `ensure-*-github-issue`, `review-*`, pipeline steps).

---

**Status:** Planned
