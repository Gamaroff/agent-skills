---
id: task.139
title: "[Task 139] The Change Log engine is unreachable from a skill whose prose runs it: spell the writer alternation in the contract's one-liner and pin engine reachability with a parity test"
type: task
description: "Make `references/change-log.js` ship with every skill whose SKILL.md tells the agent to append a Change Log row through it — today `develop` cites the engine and does not carry it, so the documented append fails MODULE_NOT_FOUND in every consumer install and the contract's own 'no regex fallback' rule turns that into a silently skipped row — by spelling the writer alternation in the contract's one-liner (the discovery form the bundler already follows) and adding a parity test that derives the writer population from the prose."
tags: [bundler, change-log, develop, parity-test, observation-152]
category: infrastructure
status: planned
priority: High
created: 2026-09-22
updated: 2026-09-22
assignee:
estimated_effort_hours: 4
risk_level: low
github_issue: 463
---

# Technical Task: The Change Log engine is unreachable from a skill whose prose runs it

**Status:** Planned
**GitHub Issue**: [#463](https://github.com/Gamaroff/agent-skills/issues/463)

---

## 1. Overview

`shared/resources/document-change-log.md` § *How a writer appends a row* is the one statement of how a Change Log row is written: a `node -e` one-liner that `require`s `./.agents/skills/{skill}/references/change-log.js`, with the rule **"append through `change-log.js`, never by text search"** and **"a writer that cannot reach the engine reports that as a skipped step; it does not fall back to a regex"**. `develop` (§ Develop Task Workflow step 12, § Develop Story Workflow step 14) tells the agent to run exactly that, and `develop`'s bundle does not contain `change-log.js`. On task.136 (2026-09-21) the call failed `MODULE_NOT_FOUND` and the orchestrator pointed it at `shared/resources/change-log.js` instead — a path that exists only in this repository. In a consumer install the same call fails the same way, and by the contract's own rule the `Implemented — N files, M tests` row is silently skipped on every `/develop` run. Obs #152.

**Scope**: `shared/resources/document-change-log.md` (the one-liner's `{skill}` placeholder becomes the spelled alternation of the skills that run it), `npm run bundle` (which then vendors the engine into those skills), and one parity test that derives the writer population from the prose and asserts each writer ships the engine — with a non-vacuity floor, so a rewording that empties the population goes red rather than green.

**Key deliverables**: (1) The contract's one-liner names the running skills in the `{a|b|c}` alternation form the bundler follows out of shared text (`create-skill` § *A bundled copy nothing reaches is `UNREACHED`*), replacing the bare `{skill}` placeholder that names no skill and is invisible to discovery **by design**. (2) `references/change-log.js` present in `skills/develop/` and any other skill the population names, produced by the bundler, not by hand. (3) `tests/change-log-engine-reachability.test.js`: for every `skills/*/SKILL.md` whose text instructs appending through `change-log.js`, `skills/<skill>/references/change-log.js` exists and is byte-identical (modulo the bundler's header) to the shared source; the population is derived from the prose with a floor of ≥ 2 members (`develop`, `finalise`) so the test cannot pass on an empty set; and the alternation in the contract names every member of that population. (4) A Notes entry naming the five writers that append rows **by hand** today (`edit-epic`, `edit-story`, `sync-github-epic`, `sync-github-story`, `sync-github-task`) as the migration seam this task deliberately does not take.

**Expected outcome**: a `/develop` run in a consumer install appends its Implemented row through the engine; a skill added later that cites the engine without shipping it turns the parity test red before it can be installed anywhere.

---

## 2. Motivation

### Current Problems

1. **The engine reaches skills by accident, not by declaration.** The nine skills that ship `change-log.js` get it transitively: `jira-sync.js`, `status-history.js` and `report-lint.js` each `require("./change-log.js")`, and the bundler's `JS_SIBLING_RE` follows that. A skill that bundles only the `.md` contract — 24 of the 41 that carry `document-change-log.md` — has the one-liner and not the module it requires.
2. **The contract's placeholder is invisible on purpose, and nothing replaced it.** `create-skill` records why the bare `references/<file>` form is not followed out of shared text: measured 2026-09-17, following it vendored `change-log.js` into all 24 non-carrying skills — a 38-file over-match. The sanctioned remedy — "if a shared doc genuinely invokes a script that must ship with the skill, spell the alternation" — was never applied to this one-liner.
3. **The failure is silent by contract.** "Reports that as a skipped step; does not fall back to a regex" is the right rule for a missing engine, and it is also what makes the defect invisible: no row, no error in the diff, and the next reader sees a document whose history stops at `Status → ready-for-development`.
4. **No test says which skills must carry it.** Two enumerations exist implicitly — the prose that names the engine, and the `references/` directories that contain it — and nothing compares them. That is the enumeration class in `docs/reference/anti-patterns.md`.

### Benefits

- A consumer's `/develop` writes the Implemented row it has documented since the Change Log contract landed; the drift test for stale logs (`review-task` check 4b) then sees a current log instead of a stale one on every developed task.
- The dependency is **declared** in the one file that states the append rule, so a reader of the contract sees who runs it.
- Adding a fourth writer is a one-token change to the alternation, and forgetting it is a red test — the same shape as `comment-slot-coverage.test.mjs` for tracker leads and `probe-boundary-signals.test.mjs` for the probe entry forms.

---

## 3. Technical Background

### Current Architecture

`bundle_skill.py` discovers a skill's shared dependencies from three forms: a `shared/resources/<file>` literal in a skill file (`SHARED_REF_RE`), a `require("./<sibling>.js")` inside an already-bundled `.js` (`JS_SIBLING_RE`, transitive), and — out of **shared** `.md`/`.sh` text — the invocation form `.agents/skills/<skill>/references/<file>` **only when `<skill>` names the skill being bundled**, literally or inside a `{a|b|c}` alternation. A bare `{placeholder}` group names no skill and is skipped, which is what keeps the 38-file over-match from recurring.

`shared/resources/document-change-log.md` § *How a writer appends a row* spells the invocation as `require("./.agents/skills/{skill}/references/change-log.js")` — the bare placeholder. It is bundled into 41 skills. Nine of them carry `change-log.js` because a `.js` they bundle for another reason requires it (`finalise`, `create-epic`, `create-story`, `create-task`, `qa-fix`, `qa-story`, `qa-task`, `review-story`, `review-task`, the `sync-jira-*` and bug skills). `develop` bundles the contract and nothing that requires the engine.

`skills/develop/SKILL.md` step 12/14: "**Append through `change-log.js`, never by text search** — the one-liner is in [document-change-log.md § How a writer appends a row](references/document-change-log.md)". `finalise` § 7.3 says the same and ships the engine (via `report-lint.js` / `jira-sync.js`).

### Target Architecture

```
document-change-log.md § How a writer appends a row
  require("./.agents/skills/{develop|finalise}/references/change-log.js")
                              └── spelled alternation: followed by the bundler for
                                  exactly the named skills → each ships references/change-log.js

tests/change-log-engine-reachability.test.js
  population  = skills/*/SKILL.md matching /through `change-log\.js`/   (≥ 2, else red)
  for each    : skills/<s>/references/change-log.js exists and matches shared/resources/change-log.js (header-stripped)
  alternation = the {…} group on the contract's require line
  assert      : every population member ∈ alternation, and every alternation member ∈ population
```

The population and the alternation are two enumerations of one fact and the test is what keeps them equal; a writer named in the prose and not in the alternation, or the reverse, is the red.

### Important Clarifications

- **Why spell the alternation rather than declare a `bundle-dependency:` line.** The `// bundle-dependency: shared/resources/X` form is for `.js`/`.mjs` files whose only citation is a comment. A shared `.md` that names `shared/resources/change-log.js` as a literal would vendor the engine into all 41 bundlers of the contract — the over-match the `create-skill` rule exists to prevent. The alternation is the form that rule names for this case, and it vendors the engine into exactly the skills that run it.
- **Why the population is derived from prose and not listed in the test.** A list in the test is a third enumeration. The test reads `skills/*/SKILL.md` for the instruction that runs the engine (`through \`change-log.js\``, the phrase both current writers use), so a new writer that copies the phrase joins the population automatically and fails until the alternation names it. The floor of 2 is what stops a rewording of the phrase from emptying the population and passing (obs #117: a figure a test re-measures needs its definition recorded, not its number).
- **Byte-identical, not merely present.** `bundle:check` already asserts freshness for every bundled copy; the test's identity assertion is redundant with it on a fresh bundle and non-redundant on a hand-copied file, which is the shape obs #152's workaround would have taken if it had been "fixed" in the skill directory.
- **What this task does not do.** Five skills instruct "Append a Change Log row" without naming the engine at all (`edit-epic`, `edit-story`, `sync-github-epic`, `sync-github-story`, `sync-github-task`). They are hand-appending against a contract that forbids it, but moving them onto the engine is a *migration* of five call sites with their own tests — the primitive → migration seam in `create-task` § 1.2 — and is recorded in § Notes as the next task, not folded in here.

---

## 4. Scope

### In Scope

✅ `shared/resources/document-change-log.md` — the one-liner's `{skill}` → `{develop|finalise}` (plus any skill the population derivation names at implementation time)
✅ `npm run bundle` — `skills/develop/references/change-log.js` (and any other newly reached copy) generated, not hand-copied; `bundle:check` 0 problems, no `UNREACHED`
✅ `tests/change-log-engine-reachability.test.js` — population derivation, floor, identity, two-way alternation parity
✅ `skills/develop/SKILL.md` — no wording change needed if the phrase already matches the derivation; if the derivation phrase is changed, both writers change in the same commit
✅ `package.json` — no change needed: `tests/*.test.js` is already in the `npm test` glob (verify, do not assume — obs: a suite runs nowhere until its glob is listed)
✅ CHANGELOG [Unreleased]; obs #152 → `actioned` with the PR

### Out of Scope

❌ Migrating the five hand-appending writers onto the engine (§ Notes — next task)
❌ Changing the bundler's discovery rules — the alternation form already exists and is tested (`tests/bundle-transitive.test.js`, `bundle-check-mode.test.js`)
❌ Any change to `change-log.js` itself
❌ Bug reports (they carry `## Status History`, engine `status-history.js`, which is reached today via the bug skills' own `.js` requires)

---

## 5. Breaking Changes

None — API stable. The engine's behaviour and interface do not change; two skill bundles gain a file they were documented as already having.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.139.plan.change-log-engine-reachability.md](task.139.plan.change-log-engine-reachability.md)

### Phase 1: The red test

**Risk**: Low
**Files**: `tests/change-log-engine-reachability.test.js`

- [ ] Derive the population: every `skills/*/SKILL.md` whose text matches the instruction phrase; assert the floor (≥ 2) with a message naming the phrase
- [ ] For each member assert `skills/<s>/references/change-log.js` exists and, header-stripped, equals `shared/resources/change-log.js`
- [ ] Parse the `{…}` alternation from the contract's `require` line; assert set equality with the population in both directions, naming the missing side
- [ ] Run it: red on `develop` (missing copy; absent from the alternation), green on `finalise`

### Phase 2: Spell the alternation and bundle

**Risk**: Low
**Files**: `shared/resources/document-change-log.md`, `skills/*/references/document-change-log.md` (generated), `skills/develop/references/change-log.js` (generated)

- [ ] Replace `{skill}` in the one-liner with the alternation the population derivation produced; keep the surrounding prose's `{skill}` mentions that are illustrative, not invocations (the bundler follows only the invocation form)
- [ ] `npm run bundle`; confirm `skills/develop/references/change-log.js` appeared and no skill outside the alternation gained a copy (`git status --porcelain | grep change-log.js`)
- [ ] `npm run bundle:check` → 0 problems, no `UNREACHED`
- [ ] Phase 1 test green; mutation: remove `develop` from the alternation → red naming `develop`; hand-copy a modified engine into `develop/references/` → red on identity

### Phase 3: Prove the documented call runs from the bundle

**Risk**: Low
**Files**: none (verification), implementation report

- [ ] From the repo root, run the contract's one-liner verbatim against a scratch copy of a task document with `.agents/skills/develop/references/change-log.js` as the path — the exact call that failed on task.136 — and record the appended row
- [ ] Record the pre-fix failure (`MODULE_NOT_FOUND`) and the post-fix row side by side in the implementation report

### Phase 4: Docs, CHANGELOG, observation

**Risk**: Low
**Files**: `CHANGELOG.md`, observation log

- [ ] CHANGELOG [Unreleased]: the alternation, the test, the skills that gained the engine
- [ ] Obs #152 → `actioned` with the PR as resolution
- [ ] § Notes of this task carries the migration seam for the five hand-appending writers

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/document-change-log.md` — `{skill}` → spelled alternation on the `require` line

### Files to Create (Tests)

2. ✅ `tests/change-log-engine-reachability.test.js` — population derivation, floor, identity, two-way alternation parity

### Files Generated (by `npm run bundle`)

3. ✅ `skills/develop/references/change-log.js` — new copy
4. ✅ `skills/*/references/document-change-log.md` — the 41 bundled copies of the contract, re-rendered

### Files to Modify (Documentation)

5. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `tests/change-log-engine-reachability.test.js` — population (with floor), existence + identity per member, alternation ⊆ population and population ⊆ alternation.
- **Command**: `command node --test tests/change-log-engine-reachability.test.js`; `npm run ci:fast`.
- **Target**: red on the pre-fix tree for exactly `develop`; green after Phase 2; each of the three mutations in Phase 2 reds its own assertion.

### Integration Tests

- The contract's one-liner executed verbatim against `.agents/skills/develop/references/change-log.js` (Phase 3) — the reproduction of obs #152's failure, now succeeding. Recorded in the implementation report, not asserted in CI (it is the same call `develop` makes at loop exit).

### Contract Tests

- `npm run bundle:check` — 0 problems; the new copy is reached (not `UNREACHED`) because the alternation names `develop`.
- `tests/bundle-transitive.test.js`, `tests/bundle-check-mode.test.js` — unchanged and green (the alternation form is the one they already cover).

### Performance Tests

Not applicable.

### Consumer Tests

- `npm run validate:all`, `npm run check:generated` — the generated tree still agrees with its generator.

---

## 9. Success Criteria

### Functional

- [ ] `skills/develop/references/change-log.js` exists after `npm run bundle` and equals the shared source header-stripped
- [ ] The contract's `require` line names `develop` and `finalise` in the alternation; no skill outside the alternation gained a copy
- [ ] The one-liner run verbatim from the repo root with the `develop` path appends a row (Phase 3 evidence)

### Performance

- [ ] `npm run bundle` wall-clock unchanged within noise (one 37 KB file more)

### Code Quality

- [ ] `tests/change-log-engine-reachability.test.js` red on the pre-fix tree naming `develop`, green after; three mutants (member removed from the alternation; copy tampered; instruction phrase reworded so the population empties) each red their own assertion
- [ ] `ci:fast`, `bundle:check` (0 problems, no `UNREACHED`), Prettier green

### Migration

- [ ] CHANGELOG entry; obs #152 `actioned`; § Notes names the five hand-appending writers as the next task

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The alternation is read by a regex in the bundler, and its spelling has rules**
   - **Risk**: a space inside the braces, a trailing `|`, or a skill name with a character the bundler's class rejects makes the group silently not match — the copy never appears and `bundle:check` reports the *absence* as nothing at all (there is no copy to call `UNREACHED`).
   - **Probability**: Low · **Impact**: Medium — the fix that ships is the fix that did nothing.
   - **Mitigation**: Phase 1's test is red *before* the alternation is written and must go green *because of* the bundle; a green that arrives without `skills/develop/references/change-log.js` appearing in `git status` is the regex not matching. The Phase 2 mutation (remove `develop`) proves the parity half; `git status` proves the bundler half.
   - **Rollback**: revert Phase 2; the test goes red again and says why.

### Low Risk Areas

1. **A future skill copies the phrase without meaning it** — the floor and the two-way parity turn that into a red test, which is the intended cost.
2. **The 41 bundled copies of the contract re-render** — a one-token change in each; `bundle:check` compares them to the source.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the bundle vendors `change-log.js` into skills outside the alternation (an over-match), or `bundle:check` reports `UNREACHED` on the new copy.
- **Steps**: revert the `document-change-log.md` change; `npm run bundle`; delete the test or mark it `skip` with the reason; push.
- **Validation**: `git status` shows no `change-log.js` under any skill that lacked it before; `bundle:check` 0.

### Partial Rollback (1-2 hours)

- **When to use**: the test's population derivation over-matches a skill that merely *mentions* the engine (e.g. a "do not reach for `change-log.js`" warning) — tighten the phrase, keep the alternation.

### Forward Fix (< 4 hours)

- **When to use**: a writer is missing from the alternation — add it; the test names it.

### Rollback Triggers

- **Critical**: any skill outside the alternation gains the engine.
- **Non-critical**: wording of the floor's failure message.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-22 | 1.0 | Initial draft — obs #152 (task.136 instance); the `create-skill` UNREACHED rule names this exact case and its remedy | create-task |
| 2026-09-22 |  | Priority Medium → High (owner decision); issue label and board priority updated | edit-task |
<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: the red test
- [ ] Phase 2: spell the alternation and bundle
- [ ] Phase 3: prove the documented call runs from the bundle
- [ ] Phase 4: docs, CHANGELOG, observation
- [ ] QA: `task.139.qa.[N].change-log-engine-reachability.md`
- [ ] Gate: `task.139.gate.[N].change-log-engine-reachability.yml`

## References

- Observation #152 (develop: the Change Log row's engine is not bundled)
- `skills/create-skill/SKILL.md` § "A bundled copy nothing reaches is `UNREACHED`, and a bare `{placeholder}` invocation reaches nothing" — the rule, the 38-file over-match measurement, and the alternation remedy
- `shared/resources/document-change-log.md` § How a writer appends a row — the one-liner
- `skills/create-skill/scripts/bundle_skill.py` — `JS_SIBLING_RE` (why nine skills carry the engine today), the alternation discovery
- `tests/bundle-transitive.test.js`, `tests/bundle-check-mode.test.js` — the discovery forms already under test
- `docs/tasks/task.136.shell-fn-probe-entry-form/task.136.implementation.1.*.md` Step 3 — the `MODULE_NOT_FOUND` instance

## Notes

- QA artifacts land beside this file: `task.139.qa.[N].*.md`, `task.139.bug.[N].*.md`, `task.139.gate.[N].*.yml`.
- **Migration seam, deliberately not taken here**: `edit-epic`, `edit-story`, `sync-github-epic`, `sync-github-story` and `sync-github-task` instruct "Append a Change Log row" without naming the engine — hand appends against a contract that forbids text-search appends (task.42/43 landed a row inside a fenced example that way). Moving those five onto the one-liner is one task (primitive → migration: this task ships the reachable primitive, that one moves the call sites and then joins the alternation). File it once this lands.
- Independent of task.140 (shell-fn sentinels).
