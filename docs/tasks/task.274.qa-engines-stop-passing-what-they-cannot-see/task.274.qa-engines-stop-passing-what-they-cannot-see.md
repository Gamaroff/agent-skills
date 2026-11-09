---
id: task.274
title: "QA engines stop passing what they cannot see"
type: task
description: "Fix five QA engine defects that pass or lose what they cannot see: the snippet runner's base scan and syntax blindness, the probe record that overwrites a second control, the MB-sized per-case fixtures, and a status-history row that does not match its table."
tags: [qa-task, finalise, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-11-06
updated: 2026-11-06
estimated_effort_hours: 16
---

# Task 274: QA engines stop passing what they cannot see

**Status:** Planned

---

## 1. Overview

Five scripts that QA and finalise rely on report a clean or accepted result for an input they could not examine: `qa-execute-snippets.mjs` classifies four write-capable shapes `runnable` and cannot tell an unparseable block from a refused one; `security-probe.mjs` loses a second control and embeds MB of fixtures; `status-history.js` appends a row of the wrong width (obs #52, #54, #67, #68, #99).

**Scope**: the three engines and their tests. Prose that restates their behaviour is swept.

---

## 2. Motivation

### Current Problems

1. **The base scan runs write-capable blocks** (obs #67), measured on task.191 QA-fix cycle 2: `cat <<EOF`/`hello`/`EOF`/`touch /tmp/x`, `echo "$(touch /tmp/x)"` (it created the file), `find docs "-delete"` and its quote variants, and `X=-delete; find docs $X` all classify `runnable`.
2. **An unparseable block reads as refused** (obs #54). On task.204 three fenced bash blocks failed to parse (an apostrophe closed a single-quoted `node -e` body); Step 4b refused all five new blocks as `mutating` and reported `no-executable-blocks`.
3. **A second control replaces the first** (obs #68). `security-probe.mjs --record` keys a JS-entry control by sink + entry, so two `--name`s against one entry lose one (task.191 QA cycle 2).
4. **Fixtures are repeated per case** (obs #52). On task.205 the fence-form cases files are 0.8–1.6 MB each against a 20,132-byte precedent, because every case embeds full copies of `doc-id.js`, `resolve-paths.sh` and `read-config.sh`.
5. **A row of the wrong width** (obs #99). On task.232 `status-history.js --set-status` appended four-column rows under a three-column header, exit 0, no warning.

### Benefits

1. A clean report means the engine looked.
2. Committed cases files stay reviewable.

---

## 3. Technical Background

### Current Architecture

Verified by `grep` on 2026-11-06 at `develop` `bdd755c7`. Edit the `shared/resources/` sources; the copies under `skills/*/references/` are generated.

- `shared/resources/qa-execute-snippets.mjs` holds `classifyBlock`, `classifyInternal`, `stripNonCode`, `commandInvocations`, `collapseQuotedSpans`, `DENY_PATTERNS` (names from obs #67, measured against `origin/develop`).
- `shared/resources/security-probe.mjs` holds `--record`, `--entry`, `--sink`, `--name`, `--cases-base` (`skills/finalise/SKILL.md:661`–`:662`).
- `shared/resources/status-history.js:48` defines `RE_ENTRY_ROW` (a data row opens with a date); `:40` builds `HEADER_ROW` from `COLUMNS` and a separator; the engine never compares the table's own header width to the row it appends (obs #99).
- Test files: `shared/resources/tests/qa-execute-snippets.test.mjs` (load-flaky per memory; re-run alone before believing a red), the security-probe suite, and a status-history test `(unverified: the plan lists them)`.

### Target Architecture

- **Base scan** (obs #67 shapes 1 to 3): make `stripProse` idempotent by neutralising the heredoc operator it keeps; keep `$(…)` and backticks inside double-quoted spans when collapsing; run `DENY_PATTERNS` over an unquoted copy of the prose too. Shape 4 (a variable argument to a deny-listed command) is decided separately in Phase 1.
- **Syntax check** (obs #54): `bash -n` (and `zsh -n` when present) on every block refused as mutating or placeholder-free; a parse failure is an execution-failure finding, `high`, separate from the refusal.
- **Record key** (obs #68): key a JS-entry control by sink + entry + name (or by the cases file's digest).
- **Shared fixtures** (obs #52): a top-level `shared_files` in the cases file (or `--fixture-copy`), copied once per run.
- **Row width** (obs #99): read the header; refuse with exit 2 naming the file and both counts, or write in the header's shape.

### Important Clarifications

- Fixing the base scan makes previously hidden commands visible, so blocks in the real skill docs will newly refuse. The task re-runs the scan over the real docs and lists the newly refused blocks.
- Each fix needs a control test and a mutation proof (the repository rule).

---

## 4. Scope

### In Scope

✅ **The three engines** and their tests.
✅ **A measured re-run** of the real skill docs through the base scan.
✅ **A sweep** of prose that restates the engines' behaviour.

### Out of Scope

❌ **Shape 4** if Phase 1 decides it needs value tracking: re-filed.
❌ **Changing the probe verdict logic** (task 256, merged).

---

## 5. Breaking Changes

### Breaking Change 1: previously runnable blocks may refuse

**What Changed**: blocks the base scan hid are now seen.

**Before**: `echo "$(touch /tmp/x)"` classified `runnable`.

**After**: classified as mutating and refused.

**Impact**: a skill doc whose runnable example hid a write fails its Step 4b run until fixed.

**Migration Path**: Phase 2 lists the newly refused blocks in the real docs and fixes or annotates each in this task.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.274.plan.qa-engines-stop-passing-what-they-cannot-see.md](task.274.plan.qa-engines-stop-passing-what-they-cannot-see.md)

### Phase 1: Decide shape 4 and the fixture form

**Risk Level**: Low

**Changes**:
- [x] Ask the user: refuse variable arguments to deny-listed commands, or track values; `shared_files` or `--fixture-copy`. **Decided by the owner 2026-11-09: refuse variable arguments to deny-listed commands (no value tracking; a wrongly refused block is annotated in Phase 2); shared fixtures use `--fixture-copy`, copied once per run.**

**Dependencies**: none.

---

### Phase 2: The snippet runner

**Risk Level**: High

**Files**:
- `shared/resources/qa-execute-snippets.mjs`, its test

**Changes**:
- [ ] Shapes 1 to 3, each with a control.
- [ ] `bash -n` / `zsh -n` finding (obs #54).
- [ ] Measured re-run over the real docs; fix or annotate the newly refused blocks.

**Dependencies**: Phase 1.

---

### Phase 3: The probe record and fixtures

**Risk Level**: Medium

**Files**:
- `shared/resources/security-probe.mjs`, its test

**Changes**:
- [ ] Key by name (obs #68); test two names against one entry.
- [ ] Shared fixtures once per run (obs #52).

**Dependencies**: Phase 1.

---

### Phase 4: status-history

**Risk Level**: Low

**Files**:
- `shared/resources/status-history.js`, its test

**Changes**:
- [ ] Refuse on a width mismatch, or write in the header's shape (obs #99).

**Dependencies**: none.

---

### Phase 5: Bundle and sweep

**Risk Level**: Low

**Changes**:
- [ ] `command npm run bundle`, `command npm run bundle -- --check`; grep prose restatements.

**Dependencies**: Phases 2 to 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-execute-snippets.mjs`
2. ✅ `shared/resources/security-probe.mjs`
3. ✅ `shared/resources/status-history.js`

### Files to Modify (Tests)

4. ✅ `shared/resources/tests/qa-execute-snippets.test.mjs`
5. ✅ the security-probe and status-history test files (plan names them)

### Files to Modify (Documentation)

6. ✅ skill docs the re-run newly refuses (listed by the measurement)

### Files to Modify (Generated)

7. ✅ bundled copies under `skills/*/references/`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: each fix and its control.

**Actions**:
- [ ] The three base-scan shapes classify as mutating; **controls**: a heredoc with no write after it, a quoted `$(…)` in single quotes (text, not substitution) and `find docs -name x` stay runnable.
- [ ] An unparseable block yields a `high` execution-failure finding, distinct from a refusal; a parseable mutating block still refuses only.
- [ ] Two `--name` controls against one entry both read back; shared fixtures are copied once and the cases file is under the precedent's size for the task.205 shape.
- [ ] A three-column table and a four-column row: refusal with both counts; a four-column table accepts.
- [ ] Mutation proofs for each fix.

**Command**: `CI=true command node --test` on the named files (re-run `qa-execute-snippets.test.mjs` alone before believing a red).

### Regression

**Command**: `CI=true command npm test`; `command npm run bundle -- --check`.

---

## 9. Success Criteria

### Functional

- [ ] The four base-scan shapes classify as decided in Phase 1, shown by named tests in the QA report.
- [ ] The newly refused blocks in the real docs are listed with their command (`git grep` count and the runner's output) and each is fixed or annotated.
- [ ] A second control against one entry coexists; a width mismatch is refused; both shown by named tests.

### Performance

- [ ] `CI=true command npm test` wall time is within 10% of `develop`, as the median of five alternating runs with `uptime` beside each, recorded in the QA report.

### Code Quality

- [ ] Each fix has a mutation proof in the QA report.
- [ ] `command npm run bundle -- --check` reports 0 problems; `CI=true command npm test` passes.
- [ ] The task.205-shape cases file is under 100,000 bytes, measured with `wc -c` and recorded in the QA report.

### Migration

- [ ] An existing committed cases file still runs unchanged.

---

## 10. Risk Assessment

### High Risk Areas

**1. The base-scan fix refuses blocks that must run**
- **Risk**: a doc example newly refuses and its QA step breaks.
- **Probability**: High
- **Impact**: Major
- **Mitigation**: the measured re-run over every real doc, with each block fixed in this task.
- **Rollback**: revert the scan change.

### Medium Risk Areas

**1. A cases-file schema change**
- **Risk**: old cases files stop loading.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: `shared_files` is optional; an existing file runs unchanged (a criterion).
- **Rollback**: revert.

### Low Risk Areas

**1. status-history refusal blocks a bug flow**
- **Risk**: a legitimate old table is refused.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: write in the header's shape instead if Phase 1 prefers.
- **Rollback**: forward fix.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- Step 4b refuses a block it ran before and no fix lands the same day
- the engine suites are red on `develop`

**Steps**:
1. `git revert` the merge commit.
2. `command npm run bundle -- --check`.

**Verification**: `CI=true command npm test` is green.

---

### Partial Rollback (1-2 hours)

**When to Use**: one engine misbehaves.

**Steps**:
1. Revert that phase's files and re-bundle.

---

### Forward Fix (< 4 hours)

**When to Use**: a message or one block.

**Approach**: edit the source and re-bundle.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- QA cannot run documented commands

**Non-Critical (Forward Fix)**:
- wording

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                                     | Author      |
| ---------- | ------- | --------------------------------------------------------------- | ----------- |
| 2026-11-06 | 1.0     | Initial draft — cut from observations #52, #54, #67, #68, #99   | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Decide shape 4 and the fixture form
- [x] Answers recorded

### Phase 2: The snippet runner
- [ ] Shapes, syntax check, re-run

### Phase 3: The probe record and fixtures
- [ ] Name key, shared fixtures

### Phase 4: status-history
- [ ] Width check

### Phase 5: Bundle and sweep
- [ ] Mutation proofs, bundle clean

---

## References

- Observation #52 — Fence-form probe cases embed per-case fixture copies, making committed cases files MB-sized
- Observation #54 — Step 4b refuses node blocks without syntax-checking them; an unparseable block reads as no-executable-blocks
- Observation #67 — qa-execute-snippets base scan: heredoc double-strip, quoted $(…) and quoted deny words classify runnable
- Observation #68 — security-probe --record keys a JS-entry control by sink+entry, so a second --name replaces the first
- Observation #99 — status-history.js appends rows that do not match the table's column count

---

## Notes

### Important Reminders

Do not trust a single red from `qa-execute-snippets.test.mjs` under load; re-run it alone.

### Future Improvements

Shape 4 (value tracking), if Phase 1 defers it.

---

**Status:** Planned
