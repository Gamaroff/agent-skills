---
id: task.226
title: "security-probe: refuse every LD_* and DYLD_* variable on cli: case fixtures"
type: task
description: "A cli: case's fixture.env refuses dynamic-loader variables by prefix, not by four exact names, so LD_AUDIT, DYLD_FRAMEWORK_PATH and the rest are declined as the docs already say."
tags: [security-probe, cli-entry, fixture, finalise, qa-task, qa-story, review-security]
category: infrastructure
status: planned
priority: Medium
estimated_effort_hours: 2
created: 2026-10-22
updated: 2026-10-22
github_issue: 727
---

# Technical Task: security-probe — refuse every `LD_*` and `DYLD_*` variable on `cli:` case fixtures

**Status:** Planned
**GitHub Issue**: [#727](https://github.com/Gamaroff/agent-skills/issues/727)

---

## 1. Overview

A `cli:` probe case may carry `fixture.env` (task.216). The engine refuses the keys that steer the interpreter rather than the CLI under probe. Today it refuses the dynamic-loader variables by four exact names, so `LD_AUDIT`, `DYLD_FRAMEWORK_PATH`, `DYLD_FALLBACK_LIBRARY_PATH` and every other loader variable pass through. Two of the documents that describe the refusal already say every `LD_*`/`DYLD_*` variable is refused. This task makes the code match that claim: any key starting `LD_` or `DYLD_` is declined by name, before anything spawns.

**Scope:** `CLI_INTERPRETER_ENV` and its one check in `shared/resources/security-probe.mjs`, the decline test, the wording in `probe-boundary-rule.md` §5, and a CHANGELOG entry.

**Key deliverables:**

- The `cli:` arm declines any `fixture.env` key with an `LD_` or `DYLD_` prefix, naming the key.
- A test row per prefix for a name outside the old exact list (`LD_AUDIT`, `DYLD_FRAMEWORK_PATH`), on Node and Python.
- `probe-boundary-rule.md` §5 states the prefix rule instead of the four-name list.

**Expected outcome:** the docs, the CHANGELOG and the engine agree on which loader variables a `cli:` case may set: none.

---

## 2. Motivation

### Current Problems

- **The code refuses less than the docs promise.** `finalise-dod-security-prompt.md` tells the DoD security agent that "the LD_*/DYLD_* loader variables are refused in a cli: case's env", and the task.216 CHANGELOG entry lists `DYLD_*`. The engine refuses four exact names.
- **The unrefused names load code too.** `LD_AUDIT` loads an audit library into the interpreter before `main`, which is the same harm `LD_PRELOAD` is refused for. On macOS, `DYLD_FRAMEWORK_PATH` and `DYLD_FALLBACK_LIBRARY_PATH` redirect library resolution, as `DYLD_LIBRARY_PATH` does.
- **A probe author cannot tell from the docs which variables are safe.** A plan that sets `LD_AUDIT` runs, and its verdict describes the interpreter's behaviour, not the CLI's.

### Benefits

- One rule instead of a list: a loader variable added to glibc or dyld later is covered without a code change.
- The DoD prompt's guidance becomes true, so a security agent's plan cannot rely on a refusal that does not exist.
- Closes TASK-216-QA3-1, the one finding carried out of task.216's QA loop.

---

## 3. Technical Background

### Current Architecture

- `shared/resources/security-probe.mjs:3161` (`const CLI_INTERPRETER_ENV = Object.freeze([`) lists `PATH`, `NODE_OPTIONS`, `LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_INSERT_LIBRARIES`, `DYLD_LIBRARY_PATH`.
- `shared/resources/security-probe.mjs:2591` (`CLI_INTERPRETER_ENV.includes(k),`) is the only reader. It sits in `runCliCase`, after `fixtureProblem(c.fixture)` and before the files are written, and declines with `case's \`fixture.env\` may not set ${steers} on the cli: form — it steers the interpreter the form runs, not the CLI under probe`.
- `.includes` is an exact match, so `LD_AUDIT` is not refused: `["LD_PRELOAD","LD_LIBRARY_PATH"].includes("LD_AUDIT")` is `false`.
- `fixtureProblem` (the `SANDBOX_OWNED_ENV` check, `security-probe.mjs:3206`) is shared with `fence:` and `shell-argv:`. It is not changed. The loader refusal is the `cli:` form's own, because only that form spawns an interpreter the case does not control.
- Test: `shared/resources/tests/security-probe.test.mjs:4027`. Its title is `cli entry (${lang}): fixture.env reaches the child; HOME, PATH, NODE_OPTIONS and LD_PRELOAD in it are declined by name`. It is parameterised over Node and Python and asserts `executed == 0` plus the decline detail for each key.

### What the documents say today

| Document | Wording | Matches the code? |
| --- | --- | --- |
| `shared/resources/finalise-dod-security-prompt.md:235` | "the LD_*/DYLD_* loader variables are refused" | No: it claims the prefix |
| `CHANGELOG.md:16` | "(`LD_PRELOAD`, `LD_LIBRARY_PATH`, `DYLD_*`)" | No: it claims every `DYLD_*` |
| `shared/resources/probe-boundary-rule.md:496` | lists the four names | Yes, but it is the list this task replaces |
| `security-probe.mjs:201`, `security-input-corpus.mjs:75` | "the dynamic-loader variables" / "a dynamic-loader variable" | Already true after the fix |

### Target Architecture

- `CLI_INTERPRETER_ENV` keeps the exact names `PATH` and `NODE_OPTIONS`. A separate frozen list of prefixes, `["LD_", "DYLD_"]`, covers the loader. One predicate, `steersInterpreter(k)`, answers both, and line 2591 calls it.
- The decline message is unchanged, so it still names the key.
- The match is case-sensitive, as POSIX environment names are: `ld_audit` is a different variable and the loader ignores it.

---

## 4. Scope

### In Scope

✅ The refusal predicate and its constant in `shared/resources/security-probe.mjs`
✅ New test rows in `shared/resources/tests/security-probe.test.mjs` (Node and Python)
✅ `probe-boundary-rule.md` §5 wording, and the `security-probe.mjs` header and constant comments
✅ The bundled copies, regenerated with `npm run bundle`
✅ A CHANGELOG `[Unreleased]` entry

### Out of Scope

❌ `fence:` and `shell-argv:` env refusals: those forms run a shell the case controls, so they already see the loader. They are not part of this finding.
❌ Other interpreter-steering variables (`PYTHONPATH` is ignored under `-E`; `NODE_PATH` and similar are a separate question, not raised by QA).
❌ The two pre-existing gate-3 future items: the shared fixture-prelude helper, and `shell:`/`shell-fn:` ignoring a case fixture.

---

## 5. Breaking Changes

**`cli:` cases that set a loader variable outside the old list are now declined.**

- **Before:** `{ fixture: { env: { LD_AUDIT: "/x.so" } } }` on a `cli:` case ran.
- **After:** the case is declined: `case's \`fixture.env\` may not set LD_AUDIT on the cli: form — it steers the interpreter the form runs, not the CLI under probe`.
- **Affected:** a probe plan or cases file that sets such a variable. None is known: no corpus case carries `fixture`, and task.216 shipped two days ago with the docs already saying these were refused.
- **Migration:** drop the variable from the case. A CLI whose behaviour depends on a loader variable cannot be probed through `cli:`, because the verdict would describe the interpreter. Use `shell-argv:` if it really must be set.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.226.plan.probe-cli-loader-env-prefix-refusal.md](task.226.plan.probe-cli-loader-env-prefix-refusal.md)

### Phase 1: Test first (Risk: Low)

**Files:** `shared/resources/tests/security-probe.test.mjs`

- [ ] Add `LD_AUDIT` and `DYLD_FRAMEWORK_PATH` rows to the env-decline test at `security-probe.test.mjs:4027`, and update its title
- [ ] Run the test and confirm both new rows are red against the current engine (they execute instead of declining)

### Phase 2: The prefix refusal (Risk: Low)

**Files:** `shared/resources/security-probe.mjs`

- [ ] Split the constant: exact names `PATH`, `NODE_OPTIONS`; prefixes `LD_`, `DYLD_`
- [ ] Add `steersInterpreter(k)` and call it at the `runCliCase` check
- [ ] Update the constant's comment and the `cli:` header paragraph
- [ ] Phase 1 rows go green; the existing `LD_PRELOAD` row stays green

### Phase 3: Docs, bundle, changelog (Risk: Low)

**Files:** `shared/resources/probe-boundary-rule.md`, `CHANGELOG.md`, bundled copies

- [ ] §5: replace the four-name list with "any `LD_*` or `DYLD_*` variable (the dynamic loader's)"
- [ ] CHANGELOG `[Unreleased]` → `### Fixed` entry citing task 226
- [ ] `npm run bundle`, then `npm run bundle:check` exits 0
- [ ] Mutation-prove: revert the predicate to `.includes` and confirm the new rows go red

---

## 7. Files Summary

### Core Implementation

1. ✅ `shared/resources/security-probe.mjs`: the constant, the predicate, the check in `runCliCase`, two comments

### Tests

2. ✅ `shared/resources/tests/security-probe.test.mjs`: two new decline rows, updated title

### Documentation

3. ✅ `shared/resources/probe-boundary-rule.md`: §5 wording
4. ✅ `CHANGELOG.md`: `[Unreleased]` entry
5. ✅ Bundled copies under `skills/{finalise,qa-story,qa-task,review-security}/references/` (generated; `probe-boundary-rule.md` reaches `qa-story` and `qa-task`, `security-probe.mjs` reaches all four)

`finalise-dod-security-prompt.md` needs no edit: its sentence becomes true.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** the `cli:` env refusal, on both the Node and the Python fixture CLI (`cli-needs-data.mjs`, `cli-needs-data.py`)
- **Cases:** `LD_AUDIT` and `DYLD_FRAMEWORK_PATH` declined by name with `executed == 0`; `HOME`, `PATH`, `NODE_OPTIONS`, `LD_PRELOAD` still declined; `PROBE_MARKER` still reaches the child and is accepted
- **Command:** `command node --test --test-name-pattern="cli entry" shared/resources/tests/security-probe.test.mjs`

### Control Case

A name that only looks similar must still pass. Lowercase `ld_audit` and a name with the prefix in the middle (`MY_LD_FLAG`) are not loader variables, so a case setting them must run. Add one of these as a positive row, so a predicate that matches too much (`includes("LD_")`) is caught.

### Regression

- The full `security-probe.test.mjs` file and `npm run ci:fast`
- `npm run bundle:check`

---

## 9. Success Criteria

### Functional

- [ ] A `cli:` case whose `fixture.env` sets `LD_AUDIT` or `DYLD_FRAMEWORK_PATH` is declined by name, with nothing executed, on Node and Python (Phase 2)
- [ ] A `cli:` case setting `MY_LD_FLAG` (prefix not at the start) still runs and is scored
- [ ] `HOME`, `PATH`, `NODE_OPTIONS` and `LD_PRELOAD` are still declined with their existing messages
- [ ] `fence:` and `shell-argv:` behaviour is unchanged (their existing tests pass untouched)

### Performance

- [ ] No measurable change: one string-prefix test per env key, before any spawn

### Code Quality

- [ ] The new rows are red before Phase 2 and green after (test first)
- [ ] Mutation-proved: reverting the predicate to an exact match turns the new rows red
- [ ] `npm run ci:fast` green; `npm run bundle:check` exits 0; `npm run validate -- skills/finalise/ skills/qa-story/ skills/qa-task/ skills/review-security/` passes

### Migration

- [ ] CHANGELOG `[Unreleased]` cites task 226 and names the newly refused variables
- [ ] `probe-boundary-rule.md` §5, `finalise-dod-security-prompt.md` and the CHANGELOG describe the same rule

---

## 10. Risk Assessment

### HIGH RISK

None.

### MEDIUM RISK

1. **The prefix catches a variable a CLI legitimately reads**
   - **Risk:** a CLI under probe reads its own variable named `LD_…` or `DYLD_…`.
   - **Probability:** Low. Both prefixes are the loaders' namespaces.
   - **Impact:** Medium. The case is declined, not mis-scored, and the message names the key.
   - **Mitigation:** the decline names the variable, and §5 says to use `shell-argv:` when one really must be set.

### LOW RISK

1. **Bundled copies drift**
   - **Mitigation:** `npm run bundle` then `bundle:check` in CI.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** the security-probe suite is red on develop, or a known-good probe plan is now declined.
- **Steps:** `git revert` the merge commit, then `npm run bundle:check`.
- **Validation:** `security-probe.test.mjs` passes.

### Partial Rollback (1-2 hours)

Not applicable. There is one code change.

### Forward Fix

For a wording problem or one over-matching name, fix it forward in the predicate.

### Rollback Triggers

- **Critical:** a red suite on develop.
- **Non-critical:** wording. Fix it forward.

---

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-22 | 1.0 | Initial draft — follow-up to task.216 QA gate 3 TASK-216-QA3-1 | create-task |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: Test first
- [ ] Phase 2: The prefix refusal
- [ ] Phase 3: Docs, bundle, changelog

## References

- [task.216](../task.216.probe-engine-cli-case-fixture-files/task.216.probe-engine-cli-case-fixture-files.md): the `cli:` case fixture this task tightens.
- [task.216 QA gate 3](../task.216.probe-engine-cli-case-fixture-files/task.216.gate.3.probe-engine-cli-case-fixture-files.yml): `recommendations.future`, TASK-216-QA3-1.

## Notes

QA artifacts land beside this file: `task.226.qa.[N].*.md`, `task.226.bug.[N].*.md`, `task.226.gate.[N].*.yml`.
