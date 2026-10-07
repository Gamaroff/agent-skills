---
id: task.187
title: "Review checks for plan shapes"
type: task
description: "review-task and review-story gain the checks for nine plan shapes that passed review and failed later — removed literals, other writers in a replaced region, shell identity rules, unreached test files, untestable prose fixes, resume-rule states, guard exemptions, CI-platform criteria and control cases — plus a guard that every tracked test file is reached by npm test."
tags: [review-task, review-story, observation, review-checks, test-reach]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-07
updated: 2026-10-07
assignee:
estimated_effort_hours: 16
github_issue: 586
completed_date: 2026-10-07
pr_number: 593
---

# Technical Task: Review checks for plan shapes

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.187.review.1.review-plan-shape-checks.md` implemented 2026-10-07
**GitHub Issue**: [#586](https://github.com/Gamaroff/agent-skills/issues/586)

---

## 1. Overview

`/review-task` and `/review-story` check that the things a plan names exist. They do not check nine
plan **shapes** that each passed review on a real task and failed later — in QA, at finalise, or
after merge. This task adds one check per shape to `review-task`, ports the same checks into
`review-story`, and adds a mechanical guard so a new test file outside `npm test`'s globs fails CI
instead of relying on a reviewer to notice.

**Scope**: prose checks in `skills/review-task/SKILL.md` (Step 3, Step 6, Step 7, Detection Rules)
and `skills/review-story/SKILL.md` (Step 4, Step 5, Detection Rules); one new repository guard test
(`tests/test-runner-reach.test.js`); one presence test for the new checks
(`tests/review-plan-shape-checks.test.js`); a CHANGELOG entry.

**Key deliverables**:

1. Six new Step 3 checks in review-task (15–20) and their review-story Step 4 twins (11–16).
2. Step 6 check 2 and check 4 extensions plus a Step 7 risk rule in review-task; review-task's
   check 4 ported into review-story Step 5.
3. `tests/test-runner-reach.test.js`: every tracked test file is reached by `npm test`.

---

## 2. Motivation

### Current Problems

Each problem below is one observation, with the task where it happened.

1. **A removed literal breaks tests nobody listed** (obs #203). Review greps tests by feature name.
   A test that locates a block by the literal the plan removes breaks when the literal goes, and
   the error does not name the behaviour change.
2. **A plan replaces a region another skill writes into** (obs #242). Review has no check for other
   writers inside a section, block or table a plan replaces whole. task.171 ruled this out of its
   own scope.
3. **An identity rule over a shell command string is specified as a pattern** (obs #252). task.157
   specified "identity = command containing `context-pressure.mjs check`", and every QA cycle paid
   for the substring match. It should be a parse into shell words that inverts the writer's quoting.
4. **A planned test file the runner never reaches** (obs #255). `package.json`'s `test` script lists
   suites by glob, by hand. A new suite directory outside every glob runs nowhere and passes
   silently.
5. **A behaviour fix landing in prose no test can execute** (obs #258). Check 4 accepts a named test
   even when the fix lands in a sentence, table cell or blockquote that no test helper extracts.
6. **A resume-contract change with no list of reconstruction states** (obs #264). A resume or lock
   rule must hold in several reconstruction states (report ahead of or behind the gates, gate
   written but entry not, back-filled entry, in-place vs re-invocation). Review never asks for the
   list.
7. **An exemption to a refuse-by-default guard rated low risk** (obs #269). Widening what a fail-safe
   guard admits is a safety change. Review rates it like any refactor and asks for no differential
   oracle.
8. **A criterion whose test cannot run on CI's platform** (obs #279). A criterion needing zsh or
   macOS passes review and reaches finalise, where a human must decide. CI is
   `ubuntu-latest` only (`.github/workflows/test.yml`).
9. **No control case for behavioural evidence, and review-story lacks check 4** (obs #285, carrier
   for #176 and #224). Evidence that re-runs the incident a rule quotes proves only that the rule
   fires on its own example. review-story has no equivalent of review-task's "classify each
   criterion the way finalise will".

Observation #129 (parked; a site list must carry the grep that defines it) is the same family and
is carried here as check 20 / 16.

### Benefits

- Each shape is caught at review, one edit from the fix, instead of in QA or at finalise.
- review-story reaches parity with review-task on criterion classification, so a story's criteria
  fail at review rather than at acceptance.
- The test-reach guard closes obs #255's root cause mechanically. A missing glob fails CI on the PR
  that adds the suite, whoever reviewed it.

---

## 3. Technical Background

### Current Architecture

Line numbers are from `develop` at `0b6003fe` and are paired with the text they point at.

- **review-task Step 3** (`skills/review-task/SKILL.md:765`, `### Step 3: Technical Accuracy and
  Anti-Hallucination Review`) has checks 1–14. The last is `14. **Call-site population** (obs
  #120):` at `:933`. Below it sit the `**Common Hallucination Patterns to Detect**:` list (one `❌`
  line per numbered check, each ending `(check N)`) and `**Issues to Flag**:`.
- **review-task Step 6** (`:1075`, `### Step 6: Consistency and Completeness Review`) has
  `2. **Testing Completeness**:` (`:1097`) with four plain bullets, and
  `4. **Success Criteria Measurability**:` (`:1108`), which carries the obs #206 / #222 / #268
  classification rules.
- **review-task Step 7** (`:1202`, `### Step 7: Risk Assessment and Rollback Review`) has
  `1. **Risk Identification**:` with four "X = risk level" bullets.
- **review-task Detection Rules** (`:2070`, `### Detection Rules`) lists eight `**… Verification**`
  rules.
- **review-story Step 4** (`skills/review-story/SKILL.md:879`, `### Step 4: Technical Accuracy and
  Anti-Hallucination Review`) has checks 1–10. The last is `10. **Call-site population** (obs
  #120):` at `:1007`. **review-story Step 5** (`:1065`, `### Step 5: Completeness and Gap
  Analysis`) has `4. **Testing Coverage**:` (`:1102`) and no criterion-classification check.
  review-story has **no risk step**: its Step 7 is `Quality and Clarity Assessment` (`:1281`).
  review-story Detection Rules are at `:2638`.
- **The test runner.** `package.json` `scripts.test` chains 14 `bash <file>.test.sh` calls and one
  `node --test` over 31 quoted globs. Measured on `0b6003fe` with the command in § 8: 231 tracked
  `*.test.{js,mjs,sh}` files, 4 not reached. All 4 are bundled copies under
  `skills/{qa-task,qa-story}/references/tests/` whose sources in `shared/resources/tests/` are
  reached.
- **Presence tests pin the existing checks by number and text.** `tests/review-property-checks.test.js`
  (checks 11–12 / 8–9), `tests/outcome-reachability-check.test.js` (check 10 / 7),
  `tests/review-call-site-population-check.test.js` (check 14 / 10) and
  `tests/review-task-measured-criterion.test.js` (Step 6 check 4) pin item text and severity at
  every site, and pattern lines for checks 11 and 14 only. Only checks 11–14 have a `❌ … (check N)`
  line in Common Hallucination Patterns (`skills/review-task/SKILL.md:972`–`:976`); check 10's reads
  "under check 10" and checks 1–9 have none. No sibling counts checks or asserts which is last, so
  the new checks append after the last number and no existing number moves.
- **Check 4's intro counts its items.** `skills/review-task/SKILL.md:1121` reads "Three shapes reach
  that point, and each is **Important** here:", and `tests/lib/count-of-kinds.js` (used by
  `review-task-measured-criterion.test.js`) scans all of check 4 for an "N kinds" phrase.

### Target Architecture

- **review-task Step 3** gains checks 15–20, each in the house shape: a bold name with its obs id, a
  `Trigger:` line, the action, a `Worked example:` line, and a severity line. **review-task ships to
  consumer projects**, so each check names the project's own artefacts generically ("the project's
  test files", "the project's test runner configuration", "the project's skill and resource sources")
  and uses this repository's paths only inside its worked example. Where the artefact a check needs
  does not exist in the project, the check records "not applicable", as check 14 does for `no-roots`
  (`skills/review-task/SKILL.md:943`–`:958`):
  - **15. Removed-literal test sweep** (#203): when the plan removes or inverts a behaviour, search
    every test file the project tracks for the literal being removed (command, path, message), for
    example `git grep -n '<literal>' -- '*.test.*'` plus the project's test fixture directories, and
    list every hit as a test to update. Missing → Important.
  - **16. Other writers in a replaced region** (#242): when the plan replaces, rewrites or deletes a
    region of a document, search the project's skill and resource sources (every file type, code as
    well as prose) for writers that target it. Each must be named as carried, refused or owned.
    Missing → Important.
  - **17. Identity over a shell command string** (#252): an identity, dedupe or uninstall key read
    from a shell command string is specified as a parse into shell words that inverts the writer's
    quoting, never a substring or regex. A pattern → Important.
  - **18. Test file reached by the runner** (#255): every new test file the plan names is reached
    by the project's test runner configuration (its globs or file list), or the plan lists the
    runner edit. In this repository the reach test (Phase 4) is the backstop, named in the worked
    example only. Missing → Important.
  - **19. Reconstruction states for a resume rule** (#264): a plan that adds or changes a resume,
    lock or reconstruction rule lists the states the rule must hold in. The resume contract is named
    by its bare filename or a `#fragment` citation, never a path literal: a bare path would make
    review-task and review-story depend on the contract's whole closure. Missing → Important.
  - **20. A site list carries its grep** (#129): a list of "every X site" records the grep that
    defines X, and the reviewer re-runs it. A disagreement or a missing grep → Important. Check 14
    stays the measured form for the five engines; check 20 covers every other enumeration.
- **review-task Step 6 check 2** gains the control-case rule (#285 ← #176). It cites create-task
  § Section 8 (`skills/create-task/SKILL.md:894`), which states the rule, rather than restating it.
  **Check 4** gains two items at Important, after the post-merge item and **under their own
  lead-in sentence**, so the existing "Three shapes reach that point" stays true: a behaviour fix
  landing in skill prose must sit in a fenced block a test helper extracts and runs (#258); a
  criterion needing a shell or OS CI lacks is scoped to the CI shell plus "verified locally", or
  the plan adds the lane (#279). No "N kinds" phrase is added anywhere in check 4.
- **review-task Step 7 Risk Identification** gains: an exemption to a refuse-by-default guard, or a
  widening of what it treats as safe, is at least Medium risk and needs a differential oracle —
  shapes the exemption must still refuse, compared head vs base (#269).
- **review-story** mirrors all of it: Step 4 checks 11–16 (the six Step 3 checks), Step 5 gains
  check 10 "Acceptance Criteria Classification". It **cites** review-task check 4 by the link
  `../review-task/SKILL.md#step-6-consistency-and-completeness-review` (check 4 is a list item, not a
  heading; the repository links across skills this way, e.g. `skills/sync-jira-story/SKILL.md:360`)
  and `finalise-dod-ac-prompt.md` Step 3 by its `#step-3-check-each-acceptance-criterion` anchor
  (`shared/resources/finalise-dod-ac-prompt.md:31`), with non-path link text, rather than restating
  either (#285 ← #224). Step 5's Testing
  Coverage gains the control-case, prose-in-a-fence and CI-platform items. The guard-exemption rule
  goes into Step 5 as an item, since review-story has no risk step.
- **Detection Rules** in both skills gain one line per new Step 3/4 check, and the Step 3 / Step 4 /
  Step 5 "Issues to Flag" Important lines name the new checks.
- **`tests/test-runner-reach.test.js`** reads `package.json` `scripts.test`, extracts its quoted
  `node --test` globs and its `bash <file>` entries, and asserts every tracked
  `*.test.{js,mjs,sh}` is reached. It excludes bundled copies under `skills/*/references/` and
  carries a non-vacuity floor on the number of files it checked.
- **`tests/review-plan-shape-checks.test.js`** holds presence, in the shape of its four siblings:
  each new check's heading, its `Trigger:` and `Worked example:` lines, its `❌ … (check N)` line and
  its severity at every site; each new Step 6 / Step 7 / Step 5 item by its bold lead-in; each new
  Detection Rules and Questions to Collect line. Check 4's "no count" property reuses
  `tests/lib/count-of-kinds.js`.

### Important Clarifications

- These are **review** rules. Their application is a reviewer behaviour no CI layer exercises. The
  presence test holds that the rules are stated at every site, as its four siblings do and say.
- create-task's § 3.5 authoring twins (as task.145 and task.151 added for their checks) are **out
  of scope** here; see § 4.

---

## 4. Scope

### In Scope

✅ `skills/review-task/SKILL.md`: Step 3 checks 15–20 with their Common Hallucination Patterns
lines and Detection Rules; Step 6 check 2 and check 4 items; Step 7 risk rule.
✅ `skills/review-story/SKILL.md`: Step 4 checks 11–16 with pattern lines and Detection Rules; Step 5
check 10 and the Testing Coverage items; the guard-exemption item.
✅ `tests/test-runner-reach.test.js` (new) and `tests/review-plan-shape-checks.test.js` (new).
✅ `CHANGELOG.md` `[Unreleased]` entry.

### Out of Scope

❌ create-task § 3.5 authoring twins for the new checks. Each is a separate edit with its own test,
and review is the gate these observations name. Recorded under Future Improvements.
❌ review-bug. Its review step has a different shape (fix readiness, not a plan), and none of the
nine observations names it.
❌ Changing any existing check's number or wording. The new checks append. (Extending an "Issues
  to Flag" line with the new checks' names is an addition, not a rewording.)
❌ Fixing the test runner's hand-listed globs (for example, a single `**/*.test.*` glob). The reach
test makes the hand list safe; replacing it is a separate decision.

---

## 5. Breaking Changes

None. The checks add Important findings to reviews; they change no file a consumer reads at
runtime. A consumer project's review may now raise findings it did not raise before, which is the
intent.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.187.plan.review-plan-shape-checks.md](task.187.plan.review-plan-shape-checks.md)

### Phase 1: review-task Step 3 checks 15–20

**Risk**: Low. **Files**: `skills/review-task/SKILL.md`.

- [x] Add checks 15–20 after check 14, each with a `Trigger:` line, action, `Worked example:` line
  and severity, worded for any consumer project (this repository's paths in the worked example
  only), each with its "not applicable" line where its artefact may not exist.
- [x] Add one `❌ … (check N)` line per check to Common Hallucination Patterns.
- [x] Add one Detection Rules line per check.
- [x] Add a "When … :" line per check to Questions to Collect where the check needs an author
  decision (16, 17, 19).
- [x] Extend Step 3's Issues to Flag Important line with the new checks.

### Phase 2: review-task Step 6 and Step 7

**Risk**: Low. **Files**: `skills/review-task/SKILL.md`. **Depends on**: none.

- [x] Step 6 check 2: the control-case rule (#285 ← #176).
- [x] Step 6 check 4: the prose-in-a-fence item (#258) and the CI-platform item (#279), at
  Important, after the post-merge item under their own lead-in sentence (the "Three shapes" intro
  stays true), with no count of kinds (`tests/lib/count-of-kinds.js` scans all of check 4).
- [x] Step 7 Risk Identification: the guard-exemption rule with its differential oracle (#269).

### Phase 3: review-story parity

**Risk**: Medium (two step shapes differ; see § 10). **Files**: `skills/review-story/SKILL.md`.
**Depends on**: Phases 1–2 (the wording is ported, not re-derived).

- [x] Step 4 checks 11–16 mirroring review-task 15–20, worked examples adapted where a story
  differs; pattern lines and Detection Rules.
- [x] Step 5 check 10 "Acceptance Criteria Classification", citing review-task check 4
  (`../review-task/SKILL.md#step-6-consistency-and-completeness-review`) and
  `finalise-dod-ac-prompt.md` Step 3 by fragment link with non-path link text (#285 ← #224).
- [x] Step 5 Testing Coverage: control case, prose-in-a-fence and CI-platform items.
- [x] Step 5: the guard-exemption item (no risk step exists).
- [x] Extend Step 4's and Step 5's Issues to Flag Important lines with the new checks.
- [x] `npm run bundle`; confirm the bundler prints closure ±0 for review-task and +1 for
  review-story (`finalise-dod-ac-prompt.md` only), and `npm run bundle:check` is clean.

### Phase 4: test-runner reach guard

**Risk**: Low. **Files**: `tests/test-runner-reach.test.js` (new). **Depends on**: none.

- [x] Parse `scripts.test` for quoted `node --test` globs and `bash <file>.test.sh` entries.
- [x] Enumerate `git ls-files` `*.test.{js,mjs,sh}`; exclude `skills/*/references/**`.
- [x] Assert every remaining file is reached; on failure, name each file and the glob that would
  reach it.
- [x] Non-vacuity floor: the checked population is ≥ 200 files and the glob count ≥ 25 (both
  printed).
- [x] In-file mutation case: `reach()` run on the script string with one glob removed reports that
  suite as unreached.

### Phase 5: presence test and changelog

**Risk**: Low. **Files**: `tests/review-plan-shape-checks.test.js` (new), `CHANGELOG.md`.
**Depends on**: Phases 1–3.

- [x] One assertion per check per site: heading, `Trigger:` and `Worked example:` lines, pattern
  line with its own number, severity; one per Step 6 / Step 7 / Step 5 item, per Detection Rules
  line and per Questions to Collect line.
- [x] Floor: the test finds all 6 + 6 checks and all Step 6/Step 5 items (a missing site is red,
  never skipped).
- [x] Mutation proof: delete one check from a copy of each SKILL.md; the test goes red naming it.
- [x] CHANGELOG `[Unreleased]` › Changed entry citing obs #129, #203, #242, #252, #255, #258, #264,
  #269, #279, #285.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/review-task/SKILL.md` — Step 3 checks 15–20, Step 6 checks 2 and 4, Step 7, Detection
   Rules.
2. ✅ `skills/review-story/SKILL.md` — Step 4 checks 11–16, Step 5 check 10 and items, Detection
   Rules.

### Files to Modify (Tests)

3. ✅ `tests/test-runner-reach.test.js` — new; reached by the existing `'tests/*.test.js'` glob.
4. ✅ `tests/review-plan-shape-checks.test.js` — new; reached by the same glob.

### Files to Modify (Generated)

5. ✅ `skills/review-story/references/finalise-dod-ac-prompt.md` — new bundled copy, written by
   `npm run bundle` once review-story cites the prompt (Phase 3). Never hand-edited.

### Files to Modify (Documentation)

6. ✅ `CHANGELOG.md` — `[Unreleased]` › Changed entry.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: the reach guard and the presence of every new check.
- **Command**: `command node --test tests/test-runner-reach.test.js tests/review-plan-shape-checks.test.js`
- **Reach population** (the definition the guard re-measures; the figure lives in the test, not
  here): tracked files from `git ls-files` matching `\.test\.(m?js|sh)$`, minus
  `^skills/[^/]+/references/`, each tested against the quoted `node --test` globs (`*` = one path
  segment) and the `bash <path>` entries of `scripts.test`.

### Integration Tests

- `npm test` and `npm run bundle:check` on the branch.

### Mutation proofs

- Reach guard: drop `'skills/wireframe/tests/*.test.js'` from a copy of the script string → red,
  naming `skills/wireframe/tests/wireframe.test.js`.
- Presence test: delete check 17 from a copy of review-task, and check 13 from a copy of
  review-story → red, naming each.
- **Control case** (obs #176's own rule): the reach guard is also run against a script string with
  a glob that reaches a suite through a different directory depth, and against one suite that is
  correctly reached, to show it neither under- nor over-fires.

### Performance Tests

Not applicable: no runtime code path changes. The two new test files run in the existing
`tests/*.test.js` glob.

---

## 9. Success Criteria

### Functional

- [ ] review-task Step 3 states checks 15–20, each with its obs id, a `Trigger:` line, a
  `Worked example:` line, Important severity and a `❌ … (check N)` line naming its own number —
  held by `tests/review-plan-shape-checks.test.js` (Phase 5).
- [ ] review-story Step 4 states checks 11–16 with the same lines and pattern lines — held by the
  same test (Phase 5).
- [ ] Checks 15, 16 and 18 (and their review-story twins) carry a "not applicable" line for a project
  that lacks the artefact they read — held by the same test (Phase 5).
- [ ] review-task Step 6 check 2 states the control-case rule, and check 4 states the
  prose-in-a-fence and CI-platform items at Important under their own lead-in, with the "Three
  shapes" intro unchanged and no count of kinds in check 4 (via `tests/lib/count-of-kinds.js`) —
  held by the same test (Phase 5).
- [ ] review-task Step 7 states the guard-exemption rule with its differential oracle — held by the
  same test (Phase 5).
- [ ] review-story Step 5 states check 10 "Acceptance Criteria Classification" citing review-task
  check 4 and `finalise-dod-ac-prompt.md` Step 3 by link, the three Testing Coverage items, and the
  guard-exemption item — held by the same test (Phase 5).
- [ ] Each new check has one Detection Rules line in its skill, and checks 16, 17 and 19 (and their
  twins) one Questions to Collect line — held by the same test (Phase 5).
- [ ] `tests/test-runner-reach.test.js` passes on the branch, and its in-file case running
  `reach()` on the script string with one glob removed reports that suite unreached — held by the
  same file (Phase 4).

### Performance

- [ ] Not applicable: no runtime code changes. The task adds two test files to the existing
  `tests/*.test.js` glob.

### Code Quality

- [ ] `npm test` passes, with no existing check renumbered (the four sibling presence tests stay
  green unchanged).
- [ ] `npm run bundle:check` clean; `prettier --check .` clean.
- [ ] `python skills/create-skill/scripts/quick_validate.py skills/review-task` and
  `skills/review-story` pass.

### Migration

- [ ] CHANGELOG `[Unreleased]` entry names the new checks and the reach guard.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **review-story's step shapes differ from review-task's**
   - **Risk**: ported text cites a step or check number review-story does not have (the defect
     `outcome-reachability-check.test.js` records as CR5-2).
   - **Probability**: Medium. **Impact**: a check that points nowhere.
   - **Mitigation**: the presence test asserts each pattern line's `(check N)` against the heading
     it sits under, per file.
2. **Overlap with planned task.178** (review-task and review-story cite the §0a key lookup)
   - **Risk**: a merge conflict in the same two files.
   - **Probability**: Low; task.178 edits the document-lookup sections, not Steps 3–7.
   - **Mitigation**: rebase on whichever lands second.

### Low Risk Areas

1. **Review length.** Six more checks lengthen every review. Each check has a trigger and is skipped
   when the plan has no matching shape.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a sibling presence test goes red after merge; reviews raise the new findings on
  plans that plainly lack the shape (a trigger misfires).
- **Steps**: `git revert` the merge commit; `npm run bundle`; `npm test`.
- **Validation**: `npm test` and `bundle:check` green on `develop`.

### Partial Rollback (1-2 hours)

- A single misfiring check: remove that check and its pattern line from both skills and the
  presence test; keep the rest.

### Forward Fix (< 4 hours)

- A trigger that over-fires: narrow the trigger wording in place.

### Rollback Triggers

- **Critical**: a sibling presence test red on `develop`.
- **Non-critical**: one check judged noisy in practice → forward-fix its trigger.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-07
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.187.qa.1.review-plan-shape-checks.md](./task.187.qa.1.review-plan-shape-checks.md)
- **Gate File**: [task.187.gate.1.review-plan-shape-checks.yml](./task.187.gate.1.review-plan-shape-checks.yml)

### Test Coverage Summary
- **Tests Executed**: 35
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. The Step 3b review raised seven LOW findings, none of them high-confidence, so all are advisory: three bugs (CR-1 to CR-3, consumer-facing wording and links, and untracked suites in the reach guard) and four test-helper cleanups. They are routed to the gate's `recommendations.future`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.187.qa.1.review-plan-shape-checks.md`
**Gate File**: `task.187.gate.1.review-plan-shape-checks.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Review**: `task.187.pr-review.1.review-plan-shape-checks.md` — APPROVE

All Definition of Done criteria have been verified:

✅ **Success Criteria:** 13/13. Each behaviour criterion cites code and a committed test that runs on every PR.
✅ **Tests:** 35 new cases across two suites, mutation-proven; CI green on PR #593.
✅ **PR Review:** /review-pr APPROVE. The repository requires no human reviewers.
✅ **Documentation:** CHANGELOG `[Unreleased]` entry; both SKILL.md files updated.
✅ **Security Review:** PASS. No boundary deliverable; no secrets or unsafe patterns.
⚠️ **Compliance Review:** Not applicable (prose and tests only).

**Follow-up (non-blocking):** the LOW findings from QA (CR-1..CR-7) and the PR review (CR-1..CR-3), plus the security agent's note that the reach guard's `git ls-files` population drops C-quoted non-ASCII paths.

**Task marked as ACCEPTED on:** 2026-10-07

**Detailed Verification Log:** See `task.187.dod.1.review-plan-shape-checks.md` for full verification evidence and timestamps.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-07 | 1.0 | Initial draft — cut from observations #203, #242, #252, #255, #258, #264, #269, #279, #285 | create-task |
| 2026-10-07 | 1.1 | Review: needs revision (6/10) → fixed to 9/10 — checks 15/16/18 made consumer-neutral with not-applicable lines; check 4 items under their own lead-in; criteria added for every deliverable | review-task |
| 2026-10-07 |  | Status → ready-for-development | review-task |
| 2026-10-07 |  | Implemented — 6 files outside docs/tasks (2 skills, 2 new test files, 1 bundled copy, CHANGELOG); 35 test cases added | develop-task |
| 2026-10-07 |  | QA gate PASS (100/100) — 0 blocking findings, 7 advisory | qa-task |
| 2026-10-07 | 1.2 | DoD passed — accepted (PR #593) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: review-task Step 3 checks 15–20

- [x] Done

### Phase 2: review-task Step 6 and Step 7

- [x] Done

### Phase 3: review-story parity

- [x] Done

### Phase 4: test-runner reach guard

- [x] Done

### Phase 5: presence test and changelog

- [x] Done

---

## Implementation Summary

**Completion Date**: 2026-10-07 (develop-task run 1, inline implementation from the plan)

**Approach**: five phases from the plan, in order. Checks 15–20 were written into review-task first
and ported into review-story by renumbering, so the two sites share one text. The two tests were
written last and mutation-proven against copies of the skill files.

- **Phase 1**: review-task Step 3 checks 15–20, each with a `Trigger:` line, a `Worked example:`
  line quoting its incident (task.161, task.155, task.157, task.176, task.170, task.124) and
  Important severity; checks 15, 16 and 18 carry a "Not applicable when" line. Six
  `❌ … (check N)` pattern lines, six Detection Rules (9–14), three Questions to Collect lines (16,
  17, 19), and the Step 3 Issues to Flag line.
- **Phase 2**: Step 6 check 2 cites create-task § Section 8 for the control case; check 4's two new
  items sit under "Two more shapes fail later than review", so "Three shapes reach that point"
  stays true; Step 7 rates a guard exemption at least Medium with a differential oracle.
- **Phase 3**: review-story Step 4 checks 11–16 (ported; cross-references renumbered to checks 9
  and 10), Step 5 testing items, check 10 "Acceptance Criteria Classification" and check 11 "Guard
  exemptions". `npm run bundle`: review-story closure 31 (+1, `finalise-dod-ac-prompt.md`),
  review-task closure 30 (+0).
- **Phase 4**: `tests/test-runner-reach.test.js` — population 227 tracked test files (4 bundled
  copies excluded), 31 globs, 14 bash entries, all reached; an in-file control case and an in-file
  mutation case (the wireframe glob removed).
- **Phase 5**: `tests/review-plan-shape-checks.test.js` — 31 cases.

**Testing Results**: the two new files 35/35. Mutation proofs (`REVIEW_SHAPE_ROOT` pointed at
copies): deleting check 17 (review-task) and check 13 (review-story) turned 4 cases red, naming each;
an unmutated copy stayed 31/31; writing "three test-free kinds" into check 4 turned the Step 6 case
red. The four sibling presence tests stay 39/39 unchanged. Fast gate (`npm run ci:fast`): 5446/5449 pass;
the 2 failures were the LOAD-SENSITIVE file-budget assertions in `bundle-missing-source.test.js` and
`test-clean-checkout.test.js` (load average 9–10), both green re-run alone (7/7, 13/13).

**Deferred Work**: none.

---

## References

- Observation #203 — Removing a behaviour: review greps tests by feature name, missing tests that pin the removed literal
- Observation #242 — review-task has no check for other writers inside a region a plan replaces whole
- Observation #252 — Identity rules over shell command strings should be specified as a parse, not a pattern
- Observation #255 — review-task has no check that a planned new test file is reached by the test runner
- Observation #258 — review-task check 4 accepts a named test for a fix that lands in prose no test can execute
- Observation #264 — review-task passes resume-contract changes without enumerating the reconstruction states the rule must hold in
- Observation #269 — review-task passes exemptions to a refuse-by-default guard as low risk
- Observation #279 — review-task passes criteria whose test cannot run on CI's platform
- Observation #285 — review-task/review-story: no control-case check for behavioural evidence, and review-story lacks check 4 (carrier for #176, #224)
- Observation #129 (parked) — review-task: no check for a hand-enumerated site list
- Sibling presence tests: `tests/review-property-checks.test.js`, `tests/outcome-reachability-check.test.js`, `tests/review-call-site-population-check.test.js`, `tests/review-task-measured-criterion.test.js`

---

## Notes

### Important Reminders

- QA artifacts land beside this document: `task.187.qa.{n}.review-plan-shape-checks.md`,
  `task.187.gate.{n}.review-plan-shape-checks.yml`, and bug reports as
  `task.187.bug.{N}.{name}.md`.

### Future Improvements

- create-task § 3.5 authoring twins for checks 15–20, so the shapes are caught where they are
  written.
