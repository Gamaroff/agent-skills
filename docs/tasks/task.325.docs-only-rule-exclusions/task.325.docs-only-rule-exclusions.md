---
id: task.325
title: "The docs-only CI rule can exclude a path"
type: task
description: "Let ci.docsOnly.patterns hold an exclusion (a glob that starts with an exclamation mark), so a project can keep one tested document out of the rule that lets the pipelines stop waiting for CI."
tags: [ci, docs-only-rule, skills-config]
category: infrastructure
status: accepted
priority: Medium
risk_level: low
created: 2026-11-25
updated: 2026-11-26
estimated_effort_hours: 4
github_issue: 947
completed_date: 2026-11-26
---

# Technical Task: The docs-only CI rule can exclude a path

**GitHub Issue**: [#947](https://github.com/Gamaroff/agent-skills/issues/947)

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.325.review.1.docs-only-rule-exclusions.md` implemented 2026-11-26

---

## 1. Overview

The pipelines stop waiting for CI when a head differs from a green ancestor only by documentation, as
`ci.docsOnly.patterns` defines it. The patterns can be narrowed, but one file cannot be taken out of a
directory. This task reads a pattern that starts with `!` as an exclusion.

**Scope**: one predicate, its configuration check, their tests and the reference.

**Key deliverables:**

- `isDocsPath` reads a path that an exclusion matches as code;
- a list with no inclusion is a usage error;
- the reference and the CI skip runbook describe it.

**Expected outcome**: a project whose tests read `docs/catalogue.md` keeps `docs/**` and excludes that
file, and the pipelines wait for CI when it changes.

---

## 2. Motivation

### Current Problems

1. **An exclusion is accepted and ignored.** `!docs/catalogue.md` passes the configuration check and
   matches nothing. The file stays documentation, with no message.
2. **The workaround decays.** A project must list every sibling, and a new sibling is code until then.
3. **The result is a merge without the test's answer.** The pipeline does not wait for a run it calls
   docs-only.

### Benefits of Solution

1. One line protects one file.
2. A written exclusion is never ignored.
3. The rule can match the CI skip template once task 324 gives that template its own list.

---

## 3. Technical Background

Every result below was run on 2026-11-25 at `17a112e6d`.

### Current Architecture

- **The predicate.** `shared/resources/ci-tree-equivalence.js:167` *(`function isDocsPath`)* ends in
  `matchesAnyGlob(file, globs)`. `glob-match.js` has no negation.
- **The configuration check.** The same file, `:751` *(`"patterns" in block`)*: a block list of
  non-empty strings. A quoted and an unquoted `!docs/b.md` both parse to the string.
- **Every reader goes through the predicate.** `git grep -nE 'isDocsPath' -- shared/resources` finds
  (line numbers re-measured at `684b2db38`, after task 320 landed):
  the ancestor walk (`:260`), `fixPathTarget` (`:199`), `dirtyNonDocsPaths` (`:1217`), the push policy
  (`:1451`, `:1466`), `finalise-delta.js:324`, `finalise-rerun-at-head.js:929`,
  `reenter-qa-after-finalise.sh:241`, and the 5c classify block
  (`develop-pipeline-step-5-6-qa-loop.md:1779`). None calls `matchesAnyGlob` with the patterns itself.
- `qa-diminishing-returns.js` also calls `matchesAnyGlob`, for `qa.testArtifactGlobs`. So the negation
  belongs in `isDocsPath`, and **not** in `glob-match.js`.

### Target Architecture

In `isDocsPath`, after the existing refusals: a path that matches any pattern starting with `!`, read
without it, is not documentation. Order in the list does not matter. The other patterns then decide as
they do today.

**Tried** in a scratch clone:

| Patterns `docs/**`, `!docs/catalogue.md`, `!docs/guides/**` | Today | After |
| :-- | :-- | :-- |
| `docs/a.md` | docs | docs |
| `docs/catalogue.md`, in either list order | docs | code |
| `docs/guides/x/y.md` | docs | code |
| `src/a.ts` | code | code |
| `docs/a.md`, with only `!docs/b.md` in the list | code | code |

The four suites that drive it (`ci-tree-equivalence`, `finalise-rerun-at-head`, `push-policy`,
`finalise-delta`: 222 tests) pass with the change. No committed test uses a `!` pattern.

**Not exercised**: the usage error, `reenter-qa-after-finalise.test.sh`, and the 5c block.

### Important Clarifications

- **Not last-match-wins.** `.gitignore` order rules would let a later inclusion undo an exclusion. Here
  an exclusion always wins, which is the answer that waits.
- **A path whose name starts with `!`** is matched as a name, like any other, today and after:
  `isDocsPath("!x.md", ["**/*.md", "docs/**"])` returns `true` (run on 2026-11-26 at `684b2db38`).
  Only a **pattern** that starts with `!` changes meaning. A project that wrote `!x.md` to match a
  file literally named `!x.md` now excludes `x.md` instead (Breaking Change 1).
- **An empty list is not "a list with no inclusion".** `patterns: []` keeps its present answer
  (nothing is documentation). The usage error is for a **non-empty** list in which every entry is an
  exclusion; `Array.prototype.every` is `true` on `[]`, so the check must test the length first.

---

## 4. Scope

### In Scope

✅ `isDocsPath`, and the check of `ci.docsOnly.patterns`

✅ The reference, the configuration example and the runbook's docs-set section

### Out of Scope

❌ **Negation in `glob-match.js`**: `qa.testArtifactGlobs` uses it, with another meaning of a miss.

❌ **A new default.** Scripts and test files stay documentation by default here. Every consumer has this
rule on, and narrowing it makes them wait.

❌ **The CI skip template**: task 324.

---

## 5. Breaking Changes

### Breaking Change 1: a pattern that starts with `!` has a meaning

**What Changed**: it excludes. Before, it matched nothing.

**Impact**: a project that already wrote one gets the exclusion it wrote. It waits more, never less.

### Breaking Change 2: a list with only exclusions is a usage error

**What Changed**: a non-empty list whose every entry starts with `!`, and an entry that is `!` alone,
are refused. An empty list is not affected. Before, it read as "nothing is documentation".

**Migration**: write `enabled: false`, which says the same.

### Breaking Change 3: an exclusion that would exclude nothing is a usage error

**What Changed** (added in QA cycles 2–4): an exclusion is refused when its path is not in git's form. That covers a space after or before the `!`, `!./`, `!/`, a trailing `/`, and an empty, `.` or `..` segment. These are the forms `isDocsPath` refuses before it matches, defined once as `hasPathFormDefect`. An exclusion holding braces, a character class, `@(`, `!(`, `+(` or `|` is also refused, because this matcher reads those literally. Before, each was accepted and silently excluded nothing.

**Migration**: write the path in git's form. Write a directory as `!docs/dir/**`. List each file as its own exclusion, or use `*` or `?`.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.325.plan.docs-only-rule-exclusions.md](task.325.plan.docs-only-rule-exclusions.md)

### Phase 1: The predicate

**Risk Level**: Low

**Files**:
- `shared/resources/ci-tree-equivalence.js`
- `shared/resources/tests/ci-tree-equivalence.test.mjs`

**Changes**:
- [x] Write the failing cases first (§ 8)
- [x] Add the exclusion to `isDocsPath`

**Dependencies**: task 320, which edits the same file

### Phase 2: The configuration check

**Risk Level**: Low

**Files**:
- the same two

**Changes**:
- [x] Refuse a list with no inclusion, and a bare `!`, each by name

**Dependencies**: Phase 1

### Phase 3: Records and bundle

**Risk Level**: Low

**Files**:
- `docs/reference/configuration.md`
- `docs/runbooks/ci-docs-only-skip.md`
- `CHANGELOG.md`
- Generated copies under `skills/*/references/`

**Changes**:
- [x] Document the exclusion, and that it wins in any order
- [x] Write the CHANGELOG entry
- [x] Run `npm run bundle`, then `npm run bundle:check`

**Dependencies**: Phases 1 and 2

---

## 7. Files Summary

### Files to Create

None.

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/ci-tree-equivalence.js` - the predicate and the check

### Files to Modify (Tests)

2. ✅ `shared/resources/tests/ci-tree-equivalence.test.mjs`
3. ✅ `shared/resources/reenter-qa-after-finalise.test.sh` - one case through a real reader, and its sibling control
3a. ✅ `shared/resources/tests/push-policy.test.mjs` - the § 8 push-policy row (added at develop: § 8 names the case, this list did not name its file)

### Files to Modify (Documentation)

4. ✅ `docs/reference/configuration.md`
5. ✅ `docs/runbooks/ci-docs-only-skip.md`
6. ✅ `CHANGELOG.md`
6a. ✅ `shared/resources/qa-docs-only-review-prompt.md`, `skills/qa-task/SKILL.md`,
   `skills/qa-story/SKILL.md`, `skills/finalise/SKILL.md` — the prose readers state the exclusion
   (QA cycle 1, T325-CR-101)

### Generated

7. ✅ `skills/*/references/` copies of 1, by `npm run bundle`: `develop-batch`, `develop-bug`,
   `develop-next`, `develop-story`, `develop-task`, `finalise`; and of
   `qa-docs-only-review-prompt.md` in `qa-task` and `qa-story`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

| Case | Today | After |
| :-- | :-- | :-- |
| each row of the § 3 table | as there | as there |
| an ancestor walk whose delta holds an excluded path | `tree-equivalent` | `code-changed` |
| the push policy on a commit that changes an excluded path | `defer` | `push` |
| `patterns: ["!docs/b.md"]` | accepted | usage error naming `ci.docsOnly.patterns` |
| `patterns: ["docs/**", "!"]` | accepted | usage error |
| `patterns: []` | accepted, nothing is docs | unchanged |
| no `!` in the list | unchanged | unchanged |
| `qa.testArtifactGlobs` with a `!` entry | matches only a path literally named with the `!` | unchanged |

**Command**: `command node --test shared/resources/tests/ci-tree-equivalence.test.mjs shared/resources/tests/push-policy.test.mjs`, and `bash shared/resources/reenter-qa-after-finalise.test.sh`; `npm run lint:shell` after editing the `.test.sh`

### Mutation Tests

Each alone turns a named test red: the exclusion removed; the exclusion made order-dependent; the usage
error removed; the negation moved into `glob-match.js`.

### Consumer Tests

`npm run test:remote` runs the whole suite.

### Performance Tests

Not applicable.

---

## 9. Success Criteria

### Functional

- [x] Every row of the § 8 table holds in a test
- [x] `git grep -nE 'matchesAnyGlob' -- shared/resources` shows no new caller

### Performance

- [x] Not applicable: no bound is claimed

### Code Quality

- [x] Every mutation in § 8 is recorded in the QA report with the test it turned red
- [x] `npm run test:remote` and `npm run bundle:check` pass

### Migration

- [x] The reference states the syntax, that an exclusion wins in any order, and the usage error
- [x] `CHANGELOG.md` `[Unreleased]` names both changes of § 5

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

#### 1. A consumer's run is refused

**Risk**: a list of exclusions only now stops a run
**Probability**: Low
**Impact**: Low
**Mitigation**: the message names the key and the setting that says the same

#### 2. A future reader skips the predicate

**Risk**: new code matches the patterns itself and ignores exclusions
**Probability**: Low
**Impact**: Medium
**Mitigation**: the success criterion on callers, and the note in the predicate's comment

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a run refused on a list that has an inclusion

**Steps**:
1. `git revert` the merge commit
2. `npm run bundle`, then `npm run bundle:check`

**Validation**: the two commands of § 8

### Partial Rollback (1-2 hours)

Phase 2 can be reverted alone.

### Forward Fix (< 4 hours)

Wording of the message or the reference.

### Rollback Triggers

**Critical**: an excluded path read as documentation

**Non-critical**: wording

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-26
**Quality Score**: 96/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.325.qa.5.docs-only-rule-exclusions.md](./task.325.qa.5.docs-only-rule-exclusions.md)
- **Gate File**: [task.325.gate.5.docs-only-rule-exclusions.yml](./task.325.gate.5.docs-only-rule-exclusions.yml)

### Test Coverage Summary
- **Tests Executed**: ci:fast 8906 (0 failed) at 3a2d45cd9
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Five QA cycles. The exclusion check went through four fixes:
1. The prose readers.
2. The normalised form.
3. One definition of the path-form refusals.
4. A stated glob grammar.

No exclusion fails open. Two LOW findings (T325-CR-501, T325-CR-502) are carried to Deferred Work by the Cosmetic-residue exit.

## Definition of Done - Gaps Identified (DoD run 1 — superseded)

> **Superseded by DoD run 2** (`task.325.dod.2.docs-only-rule-exclusions.md`), below. Both gaps were a
> sink mismatch: `isDocsPath` is a name classifier, and task 329 (PR #956) added the `git-name` sink
> it is now probed under. Kept as the record of run 1.

### QA Gate Status

**Gate File**: `task.325.gate.5.docs-only-rule-exclusions.yml`. **Gate Status**: ✅ PASS (96/100). **PR review**: `task.325.pr-review.1.docs-only-rule-exclusions.md`, APPROVE. **CI**: SUCCESS @ `e950beb7f`.

### Missing Criteria:

1. **Security Review:**
   - [ ] The probe `0:path.encoded-traversal` (`..%2f..%2fetc%2fpasswd`) reproduced on `isDocsPath`: it was accepted as documentation under `["**","!secret/**"]`. Severity low. It is pre-existing, because origin/develop accepts it too. No owner deferral exists (`no-match`).
   - [ ] The probe `0:path.symlink-escape` (`uploads/link-to-etc/passwd`) reproduced on `isDocsPath`. Severity low. It is pre-existing. No owner deferral exists (`no-match`).

### Next Steps:

- [ ] Do one of these, as the owner:
  - Defer both cases to a follow-up task in `deferrals.json` beside this document. `isDocsPath` classifies git-form names, so it never decodes and never resolves symlinks; the path-sink corpus does not fit it.
  - Make the probe fit the sink.
- [ ] Re-run `/finalise`. This is a document-only change, so it does not re-enter QA.

**Estimated Effort:** Small

**Gap Report Generated:** 2026-11-26

**Detailed Verification Log:** See `task.325.dod.1.docs-only-rule-exclusions.md` for the full verification evidence and timestamps.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.325.qa.5.docs-only-rule-exclusions.md`
**Gate File**: `task.325.gate.5.docs-only-rule-exclusions.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 96/100

All Definition of Done criteria have been verified:

✅ **Success Criteria:** all 7 met (DoD run 2: #3 and #7 re-judged after the develop merge, five carried)
✅ **Tests:** CI SUCCESS @ `6e0523417` on all 6 checks; `npm run bundle:check` 129 skills, 0 problems
✅ **PR Review:** PR #954; `task.325.pr-review.1.docs-only-rule-exclusions.md` APPROVE (the host requires no review)
✅ **Documentation:** CHANGELOG `[Unreleased]` cites task 325; `docs/reference/configuration.md` and the CI docs-only runbook updated
✅ **Security Review:** PASS — 40 probe candidates under the `git-name` sink, 0 reproduced
✅ **Compliance Review:** NOT_APPLICABLE — internal CI tooling

**Detailed Verification Log:** See `task.325.dod.2.docs-only-rule-exclusions.md` for complete verification evidence and timestamps.

**Task marked as ACCEPTED on:** 2026-11-26
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-25 | 1.0     | Initial draft — split from a CI adoption handoff      | create-task |
| 2026-11-26 | 1.1     | Review passed (8/10) — fixed a false `!`-path clarification, scoped the usage error to non-empty lists, refreshed line anchors | review-task |
| 2026-11-26 |         | Status → ready-for-development                        | review-task |
| 2026-11-26 |         | Implemented — 15 files (6 generated), 7 tests          | develop     |
| 2026-11-26 |         | QA gate CONCERNS (90/100) — 1 finding                  | qa-task     |
| 2026-11-26 |         | QA findings fixed — cycle 1, 1 finding                 | qa-fix      |
| 2026-11-26 |         | QA gate CONCERNS (88/100) — 1 medium, 1 low            | qa-task     |
| 2026-11-26 |         | QA findings fixed — cycle 2, 2 findings                | qa-fix      |
| 2026-11-26 |         | QA gate CONCERNS (88/100) — 1 medium, 1 low (cycle 3)  | qa-task     |
| 2026-11-26 |         | QA findings fixed — cycle 3, 2 findings                | qa-fix      |
| 2026-11-26 |         | QA gate CONCERNS (90/100) — 1 medium (cycle 4)          | qa-task     |
| 2026-11-26 |         | QA findings fixed — cycle 4, 1 finding                 | qa-fix      |
| 2026-11-26 |         | QA gate PASS (96/100) — 2 LOW carried (route 2b)        | qa-task     |
| 2026-11-26 |  | DoD incomplete — 2 gaps identified | finalise |
| 2026-11-26 | 1.2 | DoD passed — accepted (PR #954) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: The predicate

- [x] Failing cases
- [x] Exclusion

### Phase 2: The configuration check

- [x] Usage errors

### Phase 3: Records and bundle

- [x] Reference and runbook
- [x] CHANGELOG
- [x] Bundle

---

## Implementation Summary

**Completion Date**: 2026-11-26

**Approach**: the plan's predicate lines, tests first. `isDocsPath` sets aside every pattern that
starts with `!`; a path any of them matches (read without the `!`) is code, whatever the rest say and
in any order; the rest then decide as before. `readConfig`'s `patterns` check refuses a bare `!` and a
non-empty list of exclusions only, each naming `ci.docsOnly.patterns`. `glob-match.js` is unchanged.

Beyond the plan: a `push-policy.test.mjs` case for § 8's push-policy row (its file was not in § 7), and
a sibling control beside the `reenter-qa-after-finalise.test.sh` case. The `p.length > 0` guard cannot
be reached from YAML: an empty `patterns:` is already refused by the block-list check.

QA cycles 2–4 added the refusals in Breaking Change 3:
- `hasPathFormDefect` holds `isDocsPath`'s pre-match path-form refusals, defined once. `interpretConfig` now asks it about each exclusion's remainder.
- A dialect-syntax refusal covers braces, classes, `@(`, `!(`, `+(` and `|`.
- The reference now states the glob grammar: `*`, `**` and `?` are the only wildcards.

**Testing Results**: `npm run test:remote` (`ci:fast` on the LAN server): 8904 tests, 8901 pass, 0 fail,
3 skipped. The four engine suites: 235 of 235. `reenter-qa-after-finalise.test.sh`: 85 of 85.
`bundle:check` 0 problems; `lint:shell` clean. Red before the change: 4 of the 6 new cases; the 2 green
are the "unchanged" controls. Mutations, each alone and restored: exclusion removed, order-dependent
(last-match-wins), usage errors removed (and the bare-`!` refusal alone), negation moved into
`glob-match.js` — each turned a named test red (listed in the implementation report; QA records them).

## Deferred Work

- T325-CR-501 (low), carried from gate 5 by route 2b. A bracketed literal exclusion is refused, and the refusal message's "list each path" advice names the same refused path. `?` works in its place. The fix is to say so in the message, the runbook and the CHANGELOG.
- T325-CR-502 (low), carried from gate 5 by route 2b. The CHANGELOG says "extglob" is refused, but only `@(`, `!(` and `+(` are. The fix is to name the three openers.

---

## References

- [The docs-only CI rule](../../reference/configuration.md#the-docs-only-ci-rule)
- [Docs-Only CI Skip runbook](../../runbooks/ci-docs-only-skip.md)
- [Task 320](../task.320.task-319-leftover-findings/task.320.task-319-leftover-findings.md), which edits the same engine
- [Task 324](../task.324.ci-skip-exclusions-and-guard/task.324.ci-skip-exclusions-and-guard.md), the template's own exclusion

---

## Notes

QA will create, beside this document: the QA report, bug reports if any, and the quality gate.
