---
id: task.173
title: "[Task 173] Fold the 5c review and its doc-only fixes into the acceptance commit"
type: task
description: "On APPROVE or CONCERNS, the 5c PR-review report and any doc-only CONCERNS fixes are staged, not committed, and ride /finalise's 6a acceptance commit. This removes one pushed tail commit and one CI run per item. The two other commits on the path to acceptance (8a, the PreCompact pause) commit only their own paths; a HALT commit in that window carries the set and pushes it."
tags: [develop-story, develop-task, finalise, qa-loop, review-pr, ci, performance, consumer-handoff]
category: refactoring
status: accepted
priority: Medium
created: 2026-10-01
updated: 2026-10-08
assignee:
estimated_effort_hours: 8
github_issue: 540
pr_number: 613
completed_date: 2026-10-08
---

# Technical Task: Fold the 5c review and its doc-only fixes into the acceptance commit

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.173.review.1.fold-5c-review-into-acceptance-commit.md` implemented 2026-10-08

**GitHub Issue**: [#540](https://github.com/Gamaroff/agent-skills/issues/540)

---

## 1. Overview

Between the last QA cycle and acceptance, a develop pipeline makes up to three docs-only commits,
and each one is pushed: a 5c review commit, `/finalise`'s 6a acceptance commit, and the Step 8
implementation-report commit. On tinker-city story 46.5 (PR #981) these were `b8f0c781`,
`9c91813a` and `e7a7f57a`. task.172 removes the CI **wait** on each of them. This task removes one
of the **commits**, the 5c one. That saves a push and a full CI run on every consumer's runners,
whatever CI rules the consumer has.

**Scope:**

- **The 5c commit.** On `APPROVE` or `CONCERNS`, the review report and any doc-only `CONCERNS`
  fixes are staged, not committed. `/finalise` 6a already commits the whole index, so they ride the
  acceptance commit. This task makes that path stated and asserted, where today it is accidental.
- **Commits that sweep the index.** Two other commits in the pipeline commit the whole index:
  `/finalise` 8a's fix commit and the PreCompact pause commit. Both are narrowed to their own paths,
  so on the path to acceptance the staged set cannot land in the wrong commit. A HALT commit in that
  window still carries it (§ 3, index-sweeping commits).

**Out of scope, by operator decision (2026-10-01):** removing the Step 8 report commit. Step 7
writes report lines after 6a (CI reading 2, the PR comment, issue close, board move), so that commit
cannot simply disappear. With task.172 its wait is already free.

**Key deliverables:**

1. A stated 5c `APPROVE`/`CONCERNS` path in `develop-pipeline-step-5-6-qa-loop.md`: stage the report
   and the doc-only fixes, then hand to Step 7. No commit and no push.
2. `/finalise` 6a: states that it commits the full index, and suffixes the message when it carries
   5c work.
3. `/finalise` 8a and the PreCompact hook: each commits only its own paths.

**Expected outcome:** one fewer pushed commit and one fewer CI run per item (three tail commits
become two), with no evidence lost.

---

## 2. Motivation

### Current Problems

1. **5c `APPROVE` and `CONCERNS` have no commit rule, so orchestrators invent one.** The verdict
   table (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1392`) says to record `CONCERNS`
   findings and "Do not block". It says nothing about the review report file or about fixing
   doc-only findings. tinker-city's run applied them in a separate pushed commit (`b8f0c781`), which
   then needed its own CI reading 1.
2. **The report already rides 6a, but by accident.** `/review-pr` stages its report
   (`skills/review-pr/SKILL.md:808`, `git add "{work-item-dir}/{prefix}.pr-review.{n}.{name}.md"`)
   and says "the pipeline commits these files next anyway" (`:814`). `/finalise` 6a stages its own
   paths and then runs a bare `git commit` (`skills/finalise/SKILL.md:1370`), which commits the
   whole index, staged report included. Nothing states this, so nothing protects it.
3. **Two other commits sweep the index too.** `/finalise` 8a commits with a bare `git commit`
   (`skills/finalise/SKILL.md:2655`). Its `--git-base` check (`:2663`) refuses "a file the record did
   not name", so a staged 5c report there sends the run to Step 8 on healthy work. The PreCompact
   hook (`shared/resources/develop-pipeline-on-precompact.sh:212`) commits and pushes the whole index
   under a "pipeline paused" message.

### Benefits of Solution

- One fewer push and one fewer full CI run per pipeline item, on every consumer.
- `CI_HEAD_1` stays the pushed, CI-verified head. Staged work is not in `HEAD`, which is why it is
  staged rather than committed locally.
- The two index-sweeping commits stop carrying files they did not make, which also closes a latent
  8a refusal.

---

## 3. Technical Background

### Current Architecture

Each current-state name below was grepped on 2026-10-01; line numbers re-measured on `develop` @ `3a62c860` on 2026-10-08 (review 1).

- **5c verdict table:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1391–1393`
  (`| ⚠️ **CONCERNS** | Record the findings …`). No commit or push instruction between `:1258`
  (`### 5c. PR Conformance Review (shared)`) and the Step 7 transition, apart from the path-1
  gate commit before 5c (`:383–396`), which concerns the gate and QA report.
- **6a:** `skills/finalise/SKILL.md:1307` (`6a. **Acceptance commit + push.**`), with
  `git add "${ADD_PATHS[@]}"` and then `git commit -m "${COMMIT_MSG}${REG_SUFFIX}"`. The comment at
  `:1325` reads "The implementation report is NOT staged here". The idempotency guard is
  `git diff --cached --quiet`.
- **Post-finalise boundary check:** `shared/resources/develop-pipeline-step-7-finalise.md:154`
  (`OTHER=$(git status --porcelain | …`). Any dirty path other than the implementation report
  HALTs. 6a must therefore commit everything staged before it, which it does today.
- **8a:** `skills/finalise/SKILL.md:2655` (`` `git commit` — one commit``) and `:2663`
  (`finalise-fix-and-recheck.mjs … --git-base "$CI_HEAD_1"`), which derives `touched` from
  `git diff --name-only <base>..HEAD` and refuses a file the record did not name.
- **PreCompact hook:** `shared/resources/develop-pipeline-on-precompact.sh:211–212` (`git add
  "$REPORT"`, then a bare `git commit -m "docs(${SKILL}): pipeline paused …"`). Tests are in
  `shared/resources/develop-pipeline-on-precompact.test.sh`.
- **Docs set:** task.172's `ci.docsOnly.patterns` and `shared/resources/glob-match.js`
  `matchesAnyGlob`. This task depends on task.172 for that one definition.

**Measured: a path-limited commit leaves the rest of the index staged** (obs #161, run 2026-10-01 in
a scratch repo). Stage `a` and `b`, then `git commit -m only -- a`. The commit carries only `a`, and
`git status --porcelain` still shows `A  b`.

### Target Architecture

- **5c, `APPROVE` or `CONCERNS`:** one new subsection, *Carry the review into the acceptance
  commit*. Its steps are a **fenced bash block** (review 1, I1; obs #258), not a numbered list, so the
  test extracts and runs the block the orchestrator runs. The block contains no `git commit` and no
  `git push`.
  1. Assert the review report is staged (`git diff --cached --name-only` lists it). Stage it if it
     is not.
  2. On `CONCERNS`, a finding is **doc-only** when its `file:` matches `ci.docsOnly.patterns`.
     The orchestrator may apply doc-only findings and stage exactly the paths it changed. It
     commits nothing and pushes nothing. A finding without a `file:`, or one outside the patterns,
     is recorded as today and not fixed.
  3. List the staged paths in the implementation report's QA Cycle entry (`**Carried to 6a**:
     …`). The report itself is still Step 8's.
- **6a:** the comment states that the commit carries the full index: the acceptance artefacts plus
  anything 5c staged. When the index holds paths beyond `ADD_PATHS` and the registry, the message
  gains `; 5c review carried`. Both sides of the comparison are repo-root-relative with any leading `./`
  stripped, or every path reads as extra. In a standalone `/finalise`, anything the operator staged
  by hand counts as carried, and the suffix then states that truthfully. Nothing else in 6a changes:
  `ADD_PATHS`, the guard and the push all stay as they are.
- **8a:** the commit becomes `git commit -m … -- <touched>`, which leaves 5c's staged paths for 6a.
- **PreCompact hook:** `git commit -m … -- "$REPORT"`. A pause commits the report only.

### Index-sweeping commits — the search, and each site classified (review 1, I3)

Search: `git grep -nE 'git commit( |$)' -- 'shared/resources/*.md' 'shared/resources/*.sh' 'skills/*/SKILL.md'`,
filtered to the develop pipelines, `/finalise` and `/review-pr`, plus every `/commit-changes` invocation in
those sources. Run on 2026-10-08:

| Site | When it runs relative to 5c | Disposition |
| --- | --- | --- |
| `/finalise` 8a fix commit (`skills/finalise/SKILL.md:2655`) | after 5c, before 6a | **Narrowed** (Phase 1) |
| PreCompact pause commit (`develop-pipeline-on-precompact.sh:212`) | any time | **Narrowed** (Phase 1) |
| `/finalise` 6a (`skills/finalise/SKILL.md:1370`) | after 5c | **Carries** the set (Phase 3) |
| QA path-1 gate commit (`develop-pipeline-step-5-6-qa-loop.md:395`) | before 5c | Untouched: no carried set exists yet |
| 5b `/commit-changes` `fix(...)` sweep | before 5c (REQUEST CHANGES stays in the loop) | Untouched |
| HALT-report `/commit-changes` sweep | any HALT | Untouched: a carried set rides it and is pushed; nothing is lost |
| Step 8 `/commit-changes --scope` | after 6a | Untouched: 6a already committed the set |

The one state in which a carried set meets an untouched sweeper is a `/finalise` DoD-gaps HALT followed by
re-entry at 5a (task.170): the HALT commit sweeps the set and pushes it. That is today's behaviour, and the
set is review evidence, so carrying it there loses nothing.

### Same-class mechanism inventory (obs #103)

| Existing mechanism | Relationship |
| --- | --- |
| `/review-pr`'s own `git add` (`:421`) | **Kept.** The 5c subsection asserts it rather than repeating it. |
| 5b `fix(...)` commits | **Untouched.** `REQUEST CHANGES` still loops through 5b with its own commit. |
| Step 8 `/commit-changes --scope` | **Untouched.** It still commits the report after Step 7. |
| `/develop-bug` | **Not affected.** It has no 5c step. Its `/finalise --bug` 6a commits the index as before. |

---

## 4. Scope

### In Scope

- ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the 5c carry subsection and the verdict-table rows
- ✅ `skills/finalise/SKILL.md`: the 6a comment and message suffix, and the 8a path-limited commit
- ✅ `shared/resources/develop-pipeline-on-precompact.sh`: the path-limited pause commit
- ✅ `shared/resources/develop-pipeline-step-7-finalise.md`: one line noting that 6a carries the 5c set
- ✅ `shared/resources/develop-pipeline-hooks.md` and `develop-pipeline-pause.md`: the pause-commit restatements
- ✅ Tests and bundle

### Out of Scope

- ❌ Removing the Step 8 report commit (operator decision, 2026-10-01; see § 1)
- ❌ Fixing non-doc `CONCERNS` findings at 5c. That would be a code change after the last QA cycle,
  which the loop exists to prevent.
- ❌ The CI wait itself: that is task.172.

---

## 5. Breaking Changes

**None.** On a run with no doc-only fixes, the acceptance commit is byte-identical to today's: the
review report already rides it. One commit fewer is pushed when 5c finds doc-only `CONCERNS`.
Standalone `/finalise` stages nothing extra and behaves as today.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.173.plan.fold-5c-review-into-acceptance-commit.md](task.173.plan.fold-5c-review-into-acceptance-commit.md)

### Phase 1: narrow the index-sweeping commits (Risk: Low)

This phase is independent and ships value alone. It closes the latent 8a refusal.

- [x] 8a: `git commit … -- <touched>`
- [x] PreCompact hook: `git commit … -- "$REPORT"`, plus a test that a staged sibling survives a pause

### Phase 2: the 5c carry path (Risk: Medium)

Depends on Phase 1 and on task.172 (`ci.docsOnly.patterns`).

- [x] The *Carry the review into the acceptance commit* subsection, and the `APPROVE`/`CONCERNS` table rows pointing at it
- [x] The doc-only test reads `ci.docsOnly.patterns` through `glob-match.js`, with no second definition — via task.172's own reader (`readConfig` + `isDocsPath` in `ci-tree-equivalence.js`, which calls `matchesAnyGlob`), so the defaults and the path guards are one definition too
- [x] The `**Carried to 6a**` line in the QA Cycle entry

### Phase 3: 6a states what it carries (Risk: Low)

- [x] The 6a comment, and the `; 5c review carried` suffix keyed on staged paths beyond `ADD_PATHS`
- [x] A step-7 doc line noting that the boundary check passes because 6a commits the 5c set

### Phase 4: docs and validation (Risk: Low)

- [x] `npm run bundle`, CHANGELOG `[Unreleased]`, `npm run ci`

---

## 7. Files Summary

### Files to Modify

1. `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the 5c carry subsection
2. `skills/finalise/SKILL.md`: 6a comment and suffix; the 8a commit
3. `shared/resources/develop-pipeline-on-precompact.sh`: the pause commit
4. `shared/resources/develop-pipeline-on-precompact.test.sh`: the staged-sibling case
5. `shared/resources/develop-pipeline-step-7-finalise.md`: one line
6. `shared/resources/develop-pipeline-hooks.md` (`:50`) and `shared/resources/develop-pipeline-pause.md`
   (`:141`): both restate the pause commit as `git add <report> && git commit …`; update to the path-limited form (review 1, I4)
7. `shared/resources/develop-pipeline-resume-contract.md`: the Phase 0b working-tree probe sets the staged 5c carried set aside rather than HALTing on it (QA cycle 2, CR2-1). A path-limited pause leaves the set staged.
7a. `shared/resources/develop-pipeline-step-8-commit.md`: Step 8 deletes `.claude/state/5c-carry-*.txt` beside Step 4's records (QA cycle 3, CR3-1).
7b. `CHANGELOG.md`
7c. `shared/resources/ci-tree-equivalence.js` and `shared/resources/tests/ci-tree-equivalence.test.mjs` (SEC-5): `isDocsPath` refuses a path containing a control character (DoD run 3; task.172's module, consumed by the 5c classifier).
7d. `docs/reference/configuration.md` (`:331`): control characters added to the never-docs path forms (DoD run 3).

### Files to Add

8. `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`: carry and narrowing tests

### Generated (`npm run bundle`)

9. The bundled copies of the step docs and hook under `skills/{develop-story,develop-task,develop-bug}/references/`
10. New bundled copies in `skills/{develop-story,develop-task}/references/`: `ci-tree-equivalence.js` (and its `bb-auth.js` dependency) and `doc-links.js`, which the 5c carry blocks call

### Files to Delete

None.

---

## 8. Testing Strategy

### Behaviour tests (scratch git repos)

- **5c carry block:** extract the *Carry the review into the acceptance commit* fenced block from
  `develop-pipeline-step-5-6-qa-loop.md` and run it in a scratch repo whose `HEAD` is the "last QA
  push", with a `pr-review` file staged and one doc-only plus one non-doc finding. `HEAD` is unchanged
  (zero commits since the QA head), the doc path is staged, the non-doc path is not.

- **6a carry:** stage a `pr-review` file and a doc fix, then run the 6a block extracted from
  `SKILL.md`. One commit carries the acceptance artefacts and both 5c paths. The message ends
  `; 5c review carried`. `git status --porcelain` is clean.
- **6a, nothing carried:** the message has no suffix, and the commit is identical in paths to
  today's.
- **8a narrowing:** with a staged `pr-review` file, the 8a commit carries only `touched`. The
  `--git-base` check passes, and the staged file is still staged.
- **PreCompact:** with a staged sibling, the pause commit carries only the report.
- **Doc-only classification:** a finding on `docs/…/x.md` is doc-only; one on `skills/x/SKILL.md`
  is not under this repository's `["docs/**"]` override; one with no `file:` is not.

### Mutation proofs

- Revert 8a to a bare `git commit`: the 8a test goes red.
- Drop the suffix condition: the suffix test goes red.
- Revert the hook to a bare commit: the PreCompact test goes red.

### Regression

- `npm run ci`, in particular `finalise-publish-boundary.test.mjs`,
  `finalise-fix-and-recheck.test.mjs` and `develop-pipeline-on-precompact.test.sh`.

---

## 9. Success Criteria

### Functional

- [x] A run whose 5c returns `CONCERNS` with only doc-only findings pushes no commit between the last QA push and 6a (Phase 2) — held by the 5c carry-block test
- [x] The 6a commit carries the review report and the doc fixes, and the step-7 boundary check passes (Phase 3) — held by the 6a carry test
- [x] 8a with a staged 5c set commits only `touched`, and `--git-base` exits 0 (Phase 1) — held by the 8a narrowing test
- [x] A PreCompact pause with a staged 5c set commits only the report (Phase 1) — held by the `develop-pipeline-on-precompact.test.sh` staged-sibling case
- [x] A non-doc `CONCERNS` finding is recorded and not fixed, exactly as today — held by the doc-only classification test and the carry-block test's non-doc path

### Performance

- [x] Pushed commits after the last QA cycle drop from three to two on a doc-only `CONCERNS` run — held by the 5c carry-block test (zero commits between the QA head and 6a, where the pre-change path made one)
- [x] CI runs triggered after the last QA cycle drop by one on the same run — follows from the criterion above: the pipeline pushes every tail commit and each push triggers one CI run; no separate per-PR test

### Code Quality

- [x] Every behaviour this task added, and every fix made after it, has a recorded mutation outcome in the **Mutation-proof ledger** (§ Testing results): `covered` (its guarding test went red on revert), `no-red-untested`, `absorbed`, or prose-only (no guarding test). A fix missing from the ledger fails this criterion. _Re-scoped 2026-10-08 by operator decision at the Step 7 DoD halt. The original wording ("each new test") required a per-test mapping that was never recorded. Corrected after DoD run 2. Rewritten after DoD run 4 to cite one ledger instead of listing the fixes inline, because the inline list went stale with every later cycle (obs #254)._
- [x] `npm run ci` green; `npm run validate -- skills/finalise/` passes; `bundle:check` clean

### Migration

- [x] CHANGELOG `[Unreleased]` entry
- [x] The 5c subsection states the doc-only rule once, and the table rows point at it

---

## 10. Risk Assessment

### High Risk Areas

None identified. The acceptance commit already carries the staged report today.

### Medium Risk Areas

1. **A staged 5c set outlives a crashed run.** A resume from Step 7 finds it still staged and 6a
   carries it, which is correct. A run abandoned and restarted at Step 0 finds stray staged files.
   - Mitigation: the `**Carried to 6a**` line names them, so a human can see them. The resume
     contract needs no change, because the index is durable across processes.
2. **A doc-only fix breaks the doc-link CI check.** Mitigation: 5c runs `doc-links.js` on each
   staged `.md` path, as `/review-pr` already does for its report (`:422`). A failure means the fix
   is not staged; the finding is recorded and not fixed.

### Low Risk Areas

3. **The commit message grows a suffix.** No parser reads 6a's message. Grep for consumers before
   merging.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a 6a commit carries a path that is not a 5c artefact, or the step-7 boundary check
  HALTs on a 5c-carried path.
- **Steps:** revert the Phase 2 commit. 5c returns to recording findings only. Phase 1 stays, since
  it is independently correct.
- **Validation:** a pipeline run's 6a commit carries only the acceptance artefacts and the review
  report.

### Partial Rollback (1–2 hours)

- Keep the carry path and revert only the doc-fix half (step 2 of the subsection).

### Forward Fix

- A wrong doc-only classification is fixed in the subsection. The patterns are task.172's.

### Rollback Triggers

- **Critical:** a code change reaches the acceptance commit through the 5c path.
- **Non-critical:** a doc-only fix that should have been carried was recorded instead.

---

## Implementation Notes

**Completed:** 2026-10-08 (pipeline run 1, Step 3 inline — the plan file named every hunk).

**Summary.** Phase 1 narrowed the two index-sweeping commits: `/finalise` 8a is now a fenced block
that commits `-- "${TOUCHED[@]}"` (read from the finding record, zsh-safe), and the PreCompact hook
commits `-- "$REPORT"`. Phase 2 added *Carry the review into the acceptance commit* to the 5c
section as two fenced blocks: a classifier that prints `doc-only` / `record` per finding, and a
stage block that stages the report and each doc-only fix, restores anything that is not doc-only or
fails `doc-links.js`, and HALTs if `HEAD` moved. Phase 3 made 6a state that it commits the full
index, and suffix its message `; 5c review carried` when the index holds paths beyond `ADD_PATHS`
and the registry.

**Approach — two departures from the plan, both recorded in the implementation report.**

1. **The finding's path comes from `ref`, not `file:`.** `/review-pr`'s machine-readable block
   has no `file:` key; it has `ref: "path:line"` (or an `AC-n` id). The classifier strips the
   quotes and the `:line` suffix; an id-only `ref` is not a path and is recorded.
2. **The doc-only test calls task.172's reader, not `glob-match.js` directly.** `readConfig` +
   `isDocsPath` in `ci-tree-equivalence.js` own the default patterns and the path guards (`..`,
   the config file itself, gitlinks); `isDocsPath` calls `matchesAnyGlob`. Calling the matcher
   directly would have restated the default list here.

**Testing results.** `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`: 5 tests × bash
and zsh = 10, all pass. `develop-pipeline-on-precompact.test.sh` scenario 17: pass (19/19).
`npm run ci:fast`: 5,522 tests, 0 failures. `npm run ci` (incl. `eval:all`): exit 0. `bundle:check`: 0 problems. `validate skills/finalise/`: ✓.
Mutation proofs (each restored after): 8a bare commit → 2 red; 6a suffix dropped → 2 red; 6a suffix
always on → 2 red; a commit inside the carry block → 2 red; classifier marks everything doc-only →
2 red; stage block skips the doc check → 2 red; stage block skips the restore → 2 red; hook bare
commit → scenario 17 red.

**Mutation-proof ledger.** One row per behaviour or fix. Outcome tokens are from `mutation-proving.md`.

| Source | Behaviour or fix | Outcome | Evidence |
| --- | --- | --- | --- |
| Initial | 8a bare commit; 6a suffix dropped; 6a suffix always on; a commit inside the carry block; classifier marks all doc-only; stage skips the doc check; stage skips the restore; hook bare commit | covered (×8) | this section, above |
| QA 1 | CR-1 ×3, CR-2, CR-3, CR-4 | covered | qa.2:106 |
| QA 1 | CR-5 (HALT-commit carry stated) | prose-only | implementation report, QA Cycle 1 |
| QA 2 | CR2-1 ×2, CR2-2, CR2-4, CR2-5, CR2-6 | covered | qa.3:69 |
| QA 2 | CR2-2's doc-links "exit other than 0/1" HALT branch | no-red-untested | qa.3:70 |
| QA 2 | CR2-3 (8a hint soft reset) | prose-only | implementation report, QA Cycle 2 |
| QA 3 | CR3-1 staged check, CR3-2, CR3-5, CR3-6, CR3-7 | covered | implementation report, QA Cycle 3 |
| QA 3 | CR3-1 work-item binding | absorbed | implementation report, QA Cycle 3 |
| QA 3 | Step 8 eligible-list deletion | no-red-untested | implementation report, QA Cycle 3 |
| QA 3 | CR3-3, CR3-4 | prose-only | implementation report, QA Cycle 3 |
| QA 4 | CR4-2, CR4-4 | covered | implementation report, QA Cycle 4 |
| QA 4 | CR4-3 (restore failure HALTs STILL STAGED) | no-red-untested | implementation report, QA Cycle 4 |
| QA 4 | CR4-1 (8a overlap recovery scoped) | prose-only | implementation report, QA Cycle 4 |
| QA 5 | CR5-1 | covered | qa.6:75 |
| QA 6 | CR6-1 | covered | qa.7:75 |
| DoD 3 | `isDocsPath` refuses control characters | covered: SEC-5 (node, both shells), and the classify case red under zsh only | implementation report, Decisions Log (DoD run 3) |
| QA 8 | CR8-1 exact-one-path clearance; literal `git add` | covered (bash and zsh) | implementation report, QA Cycle 8 |
| QA 8 | CR8-1 literal `restore`, `checkout`, and probe header check | no-red-untested | implementation report, QA Cycle 8 |
| QA 9 | CR9-2 (the probe matches git's own spelling) | covered (bash and zsh) | implementation report, QA Cycle 9 |
| QA 9 | CR9-4 (`printf` for untrusted output) | covered under zsh only; CI installs no zsh, so no per-PR red (CR10-3) | implementation report, QA Cycle 9 |

**Deferred work.** None.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-08
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.173.qa.10.fold-5c-review-into-acceptance-commit.md](./task.173.qa.10.fold-5c-review-into-acceptance-commit.md)
- **Gate File**: [task.173.gate.10.fold-5c-review-into-acceptance-commit.yml](./task.173.gate.10.fold-5c-review-into-acceptance-commit.yml)

### Test Coverage Summary
- **Tests Executed**: 5561
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
CR9-2 and CR9-4 are closed. No open entries. Advisory follow-ups, including installing zsh on CI, are in the gate's `recommendations.future`.

## Definition of Done - Gaps Identified — run 1 (historical, superseded)

**Status:** IN PROGRESS at run 1. All three gaps were resolved by operator decision on 2026-10-08 (below), before `/finalise` was re-run.

### QA Gate Status

**QA Report**: `task.173.qa.7.fold-5c-review-into-acceptance-commit.md`
**Gate File**: `task.173.gate.7.fold-5c-review-into-acceptance-commit.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

### Missing Criteria:

1. **Acceptance Criteria:**
   - [x] AC8: each new test is mutation-proved red on revert. The proofs are recorded as per-cycle totals and cannot be traced test by test. **Resolved:** AC8 was re-scoped to what the record shows (§ Success Criteria), naming the two `no-red-untested` fixes.

2. **Security Review:**
   - [x] The probe zero-guard fired. The 5c classify/stage allow-list (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1505-1514`) is a boundary that no engine form can probe, so `probes_executed: 0`. **Resolved by recorded human override.** The operator accepted it on 2026-10-08 ("Go ahead", on the recommendation to sign off citing the suite). Engine: unverifiable — no entry form executes a fenced Markdown block, and `shell-argv:` (task.181) does not exist yet. Evidence: `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`, 38 cases under bash and zsh. It executes the classify and stage blocks against scratch repositories on every PR: untracked, dirty, implementation-report and review-report paths refused; dirty listed paths HALT in both arms; a stale list is replaced only when clean. Precedent: task.133, task.125.

3. **Trail:**
   - [x] `task.173.bug.2.classifier-silent-on-unparsed-findings.md` still reads `Ready for QA` (5c PR review PC-1). **Resolved:** closed, citing QA cycle 2.

### Next Steps:

- [x] AC8: map each test to a recorded red run, re-running the proofs where none exists. Or re-scope AC8 to "each fix's test is mutation-proved", by recorded decision. (Re-scoped.)
- [x] Security: make the entry probeable (a sourceable script, or `shell-argv:` from task.181) and probe it. Or record a human override citing the 38-case suite that executes these blocks. (Override recorded.)
- [x] Close bug.2, citing QA cycle 2.

**Estimated Effort:** Medium

**Gap Report Generated:** 2026-10-08

**Detailed Verification Log:** See `task.173.dod.1.fold-5c-review-into-acceptance-commit.md` for the complete verification evidence.
## Definition of Done - Gaps Identified — run 2 (historical, superseded)

**Status:** IN PROGRESS at run 2. Resolved on 2026-10-08 by correcting AC8's exception list, within the operator's re-scope decision.

### QA Gate Status

**Gate Status**: ✅ PASS (`task.173.gate.7.fold-5c-review-into-acceptance-commit.yml`, 100/100)

### Missing Criteria:

1. **Acceptance Criteria:**
   - [x] AC8: the re-scoped criterion names two `no-red-untested` exceptions, but the record holds more. CR2-2's HALT branch is a third `no-red-untested` (qa.3:70). CR3-1's binding is `absorbed`. Five prose-only fixes (CR-5, CR2-3, CR3-3, CR3-4, CR4-1) have no guarding test.

### Next Steps:

- [x] Correct AC8's exception list to match the record. (Corrected: every QA fix is now listed by its recorded outcome.)

**Estimated Effort:** Small (document-only)

**Detailed Verification Log:** See `task.173.dod.2.fold-5c-review-into-acceptance-commit.md`.
## Definition of Done - Gaps Identified — run 3 (historical, superseded)

**Status:** IN PROGRESS at run 3. Resolved on 2026-10-08 by a code fix (operator "Go ahead"): `isDocsPath` now refuses any path containing a control character. The fix re-enters QA at 5a.

### QA Gate Status

**Gate Status**: ✅ PASS (`task.173.gate.7.fold-5c-review-into-acceptance-commit.yml`, 100/100)

### Missing Criteria:

1. **Security Review:**
   - [x] `isDocsPath` accepts a path with an embedded NUL. Under zsh, the 5c classify block then clears a tracked code file (`src/a.js\0.md`) as doc-only. Medium. The stage block's exact-match check contains it.

### Next Steps:

- [x] Refuse control characters in the doc-only decision (`isDocsPath` or the classify block), with a zsh test. This is a code fix, so it re-enters QA at 5a.

**Estimated Effort:** Small

**Detailed Verification Log:** See `task.173.dod.3.fold-5c-review-into-acceptance-commit.md`.
## Definition of Done - Gaps Identified — run 4 (historical, superseded)

**Status:** IN PROGRESS at run 4. Resolved on 2026-10-08: AC8 now cites the Mutation-proof ledger (§ Testing results), within the operator's AC8 decision.

### Missing Criteria:

1. **Acceptance Criteria:**
   - [x] AC8 enumerates the QA fixes, and the list predates the run-3 NUL fix and QA cycles 8–9. CR8-1's literal restore, checkout and probe header (`no-red-untested`) are not named.

### Next Steps:

- [x] Rewrite AC8 to cite the record rather than restate it.

**Detailed Verification Log:** See `task.173.dod.4.fold-5c-review-into-acceptance-commit.md`.
## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.173.qa.10.fold-5c-review-into-acceptance-commit.md`
**Gate File**: `task.173.gate.10.fold-5c-review-into-acceptance-commit.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100

All Definition of Done criteria have been verified (DoD run 5):

✅ **Acceptance Criteria:** 11/11. AC8 is held by the Mutation-proof ledger (§ Testing results)
✅ **Tests & PR:** PR #613, 5c review APPROVE (`task.173.pr-review.2…`); CI green on `6dfd8a6e`
✅ **Documentation:** the step docs, finalise `SKILL.md`, `configuration.md` and the CHANGELOG are updated
✅ **Security Review:** PASS. 104 engine probes on `isDocsPath`; the 5c git-state arms rest on the recorded human override citing the 48-case suite; a pre-existing `.git`-segment LOW goes to a follow-up
✅ **Compliance Review:** NOT_APPLICABLE

**Task marked as ACCEPTED on:** 2026-10-08

**Detailed Verification Log:** See `task.173.dod.5.fold-5c-review-into-acceptance-commit.md` for the complete verification evidence. Runs 1–4 found gaps, and their gap reports above are historical.
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-01 | 1.0     | Initial draft | create-task |
| 2026-10-08 | 1.1     | Review passed (8/10) — 4 Important fixes applied: executable 5c carry block, criteria mapped to tests, index-sweeper search recorded, pause-commit doc sweep; anchors refreshed | review-task |
| 2026-10-08 |         | Status → ready-for-development | review-task |
| 2026-10-08 |         | Implemented — 8 source files, 1 new test file (10 cases), 1 new hook scenario | develop-task (inline) |
| 2026-10-08 |         | Status → ready-for-review | develop-task (inline) |
| 2026-10-08 |         | QA gate FAIL (70/100) — 5 findings (1 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 1, 5 findings (CR-1..CR-5) | qa-fix |
| 2026-10-08 |         | QA gate CONCERNS (70/100) — 6 findings (0 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 2, 6 findings (CR2-1..CR2-6) | qa-fix |
| 2026-10-08 |         | QA gate CONCERNS (80/100) — 7 findings (0 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 3, 7 findings (CR3-1..CR3-7) | qa-fix |
| 2026-10-08 |         | QA gate CONCERNS (90/100) — 4 findings (0 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 4, 4 findings (CR4-1..CR4-4) | qa-fix |
| 2026-10-08 |         | QA gate CONCERNS (90/100) — 1 finding (0 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 5, 1 finding (CR5-1) | qa-fix |
| 2026-10-08 |         | QA gate CONCERNS (90/100) — 1 finding (0 high) | qa-task |
| 2026-10-08 |         | QA findings fixed — cycle 6, 1 finding (CR6-1) | qa-fix |
| 2026-10-08 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-08 |  | DoD incomplete — 3 gaps identified | finalise |
| 2026-10-08 |  | DoD gaps resolved by operator decision — AC8 re-scoped; bug.2 closed; security zero-guard override recorded | develop-task |
| 2026-10-08 |  | DoD incomplete — 1 gap identified (run 2) | finalise |
| 2026-10-08 |  | AC8 exception list corrected to the record (DoD run 2 gap) | develop-task |
| 2026-10-08 |  | DoD incomplete — 1 gap identified (run 3) | finalise |
| 2026-10-08 |  | DoD run-3 gap fixed — isDocsPath refuses control characters; re-enters QA | develop-task |
| 2026-10-08 |  | QA gate FAIL (70/100) — 1 finding (1 high) | qa-task |
| 2026-10-08 |  | QA findings fixed — cycle 8, 1 finding (CR8-1) | qa-fix |
| 2026-10-08 |  | QA gate PASS (100/100) — 2 findings (0 high) | qa-task |
| 2026-10-08 |  | QA findings fixed — cycle 9, 2 findings (CR9-2, CR9-4) | qa-fix |
| 2026-10-08 |  | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-08 |  | DoD incomplete — 1 gap identified (run 4) | finalise |
| 2026-10-08 |  | AC8 cites a Mutation-proof ledger (DoD run 4 gap) | develop-task |
| 2026-10-08 | 1.2 | DoD passed — accepted (PR #613) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

- [x] Phase 1: narrow the index-sweeping commits
- [x] Phase 2: the 5c carry path
- [x] Phase 3: 6a states what it carries
- [x] Phase 4: docs and validation

---

## References

- Hand-off: `~/.claude/projects/-Users-gamaroff-Development-Projects-tinker-city/skill-observations/handoff-2026-09-30-ci-time-develop-pipelines.md` (change 2)
- tinker-city PR #981: commits `b8f0c781`, `9c91813a` and `e7a7f57a`
- task.172: the docs set (`ci.docsOnly.patterns`) and the free wait on the remaining tail commits

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.173.qa.{N}.fold-5c-review-into-acceptance-commit.md`,
  `task.173.gate.{N}.fold-5c-review-into-acceptance-commit.yml`, bug reports `task.173.bug.{N}.{name}.md`.
- Phase 1 can merge before task.172. Phase 2 cannot.
