---
id: task.173
title: "[Task 173] Fold the 5c review and its doc-only fixes into the acceptance commit"
type: task
description: "On APPROVE or CONCERNS, the 5c PR-review report and any doc-only CONCERNS fixes are staged, not committed, and ride /finalise's 6a acceptance commit. This removes one pushed tail commit and one CI run per item. Every other commit in the pipeline commits only its own paths, so the staged set cannot be swept into the wrong commit."
tags: [develop-story, develop-task, finalise, qa-loop, review-pr, ci, performance, consumer-handoff]
category: refactoring
status: planned
priority: Medium
created: 2026-10-01
updated: 2026-10-01
assignee:
estimated_effort_hours: 8
github_issue: 540
---

# Technical Task: Fold the 5c review and its doc-only fixes into the acceptance commit

**Status:** Planned

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
  so the staged set cannot land in the wrong commit.

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
   table (`shared/resources/develop-pipeline-step-5-6-qa-loop.md:1315`) says to record `CONCERNS`
   findings and "Do not block". It says nothing about the review report file or about fixing
   doc-only findings. tinker-city's run applied them in a separate pushed commit (`b8f0c781`), which
   then needed its own CI reading 1.
2. **The report already rides 6a, but by accident.** `/review-pr` stages its report
   (`skills/review-pr/SKILL.md:421`, `git add "{work-item-dir}/{prefix}.pr-review.{n}.{name}.md"`)
   and says "the pipeline commits these files next anyway" (`:427`). `/finalise` 6a stages its own
   paths and then runs a bare `git commit` (`skills/finalise/SKILL.md:1302`), which commits the
   whole index, staged report included. Nothing states this, so nothing protects it.
3. **Two other commits sweep the index too.** `/finalise` 8a commits with a bare `git commit`
   (`skills/finalise/SKILL.md:2537`). Its `--git-base` check (`:2545`) refuses "a file the record did
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

Each current-state name below was grepped on 2026-10-01.

- **5c verdict table:** `shared/resources/develop-pipeline-step-5-6-qa-loop.md:1314–1317`
  (`| ⚠️ **CONCERNS** | Record the findings …`). No commit or push instruction between `:1187`
  (`### 5c. PR Conformance Review (shared)`) and the Step 7 transition, apart from the path-1
  assertions at `:1253–1267`, which concern the gate and QA report.
- **6a:** `skills/finalise/SKILL.md:1239` (`6a. **Acceptance commit + push.**`), with
  `git add "${ADD_PATHS[@]}"` and then `git commit -m "${COMMIT_MSG}${REG_SUFFIX}"`. The comment at
  `:1257` reads "The implementation report is NOT staged here". The idempotency guard is
  `git diff --cached --quiet`.
- **Post-finalise boundary check:** `shared/resources/develop-pipeline-step-7-finalise.md:147`
  (`OTHER=$(git status --porcelain | …`). Any dirty path other than the implementation report
  HALTs. 6a must therefore commit everything staged before it, which it does today.
- **8a:** `skills/finalise/SKILL.md:2537` (`` `git commit` — one commit``) and `:2545`
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
  commit*.
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
  gains `; 5c review carried`. Nothing else in 6a changes: `ADD_PATHS`, the guard and the push all
  stay as they are.
- **8a:** the commit becomes `git commit -m … -- <touched>`, which leaves 5c's staged paths for 6a.
- **PreCompact hook:** `git commit -m … -- "$REPORT"`. A pause commits the report only.

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

- [ ] 8a: `git commit … -- <touched>`
- [ ] PreCompact hook: `git commit … -- "$REPORT"`, plus a test that a staged sibling survives a pause

### Phase 2: the 5c carry path (Risk: Medium)

Depends on Phase 1 and on task.172 (`ci.docsOnly.patterns`).

- [ ] The *Carry the review into the acceptance commit* subsection, and the `APPROVE`/`CONCERNS` table rows pointing at it
- [ ] The doc-only test reads `ci.docsOnly.patterns` through `glob-match.js`, with no second definition
- [ ] The `**Carried to 6a**` line in the QA Cycle entry

### Phase 3: 6a states what it carries (Risk: Low)

- [ ] The 6a comment, and the `; 5c review carried` suffix keyed on staged paths beyond `ADD_PATHS`
- [ ] A step-7 doc line noting that the boundary check passes because 6a commits the 5c set

### Phase 4: docs and validation (Risk: Low)

- [ ] `npm run bundle`, CHANGELOG `[Unreleased]`, `npm run ci`

---

## 7. Files Summary

### Files to Modify

1. `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: the 5c carry subsection
2. `skills/finalise/SKILL.md`: 6a comment and suffix; the 8a commit
3. `shared/resources/develop-pipeline-on-precompact.sh`: the pause commit
4. `shared/resources/develop-pipeline-on-precompact.test.sh`: the staged-sibling case
5. `shared/resources/develop-pipeline-step-7-finalise.md`: one line
6. `CHANGELOG.md`

### Files to Add

7. `shared/resources/tests/acceptance-commit-carries-5c.test.mjs`: carry and narrowing tests

### Generated (`npm run bundle`)

8. The bundled copies of the step docs and hook under `skills/{develop-story,develop-task,develop-bug}/references/`

### Files to Delete

None.

---

## 8. Testing Strategy

### Behaviour tests (scratch git repos)

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

- [ ] A run whose 5c returns `CONCERNS` with only doc-only findings pushes no commit between the last QA push and 6a (Phase 2)
- [ ] The 6a commit carries the review report and the doc fixes, and the step-7 boundary check passes (Phase 3)
- [ ] 8a with a staged 5c set commits only `touched`, and `--git-base` exits 0 (Phase 1)
- [ ] A PreCompact pause with a staged 5c set commits only the report (Phase 1)
- [ ] A non-doc `CONCERNS` finding is recorded and not fixed, exactly as today

### Performance

- [ ] Pushed commits after the last QA cycle drop from three to two on a doc-only `CONCERNS` run
- [ ] CI runs triggered after the last QA cycle drop by one on the same run

### Code Quality

- [ ] Each new test is mutation-proved red on revert
- [ ] `npm run ci` green; `npm run validate -- skills/finalise/` passes; `bundle:check` clean

### Migration

- [ ] CHANGELOG `[Unreleased]` entry
- [ ] The 5c subsection states the doc-only rule once, and the table rows point at it

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

<!-- change-log-start -->

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-10-01 | 1.0     | Initial draft | create-task |

<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: narrow the index-sweeping commits
- [ ] Phase 2: the 5c carry path
- [ ] Phase 3: 6a states what it carries
- [ ] Phase 4: docs and validation

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
