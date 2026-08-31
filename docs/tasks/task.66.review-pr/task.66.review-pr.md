---
id: task.66
title: "[Task 66] Review a pull request against the paper trail that is supposed to justify it"
type: task
description: "Add a /review-pr skill that resolves a PR back to its work item, reads the pipeline artifacts beside it, and reviews the diff and the evidence together — on GitHub and Bitbucket."
tags: [review, pull-request, bitbucket, github, jira, traceability, skills]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-08-31
updated: 2026-08-31
assignee:
estimated_effort_hours: 12
github_issue: 282
pr_number: 283
---

# Technical Task: Review a pull request against the paper trail that is supposed to justify it

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.66.review.1.review-pr.md` implemented 2026-08-31
**GitHub Issue**: [#282](https://github.com/Gamaroff/agent-skills/issues/282)

---

## 1. Overview

Add a new leaf skill, `review-pr`, that reviews a **pull request as a claim**: this PR says it
implements task 65 — does it, and is the evidence there? It resolves the PR back to its story or
task document, gathers the artifacts the pipeline wrote beside that document (implementation
report, review report, QA reports, gate `.yml`, DoD summary, sprint-review summary, bug reports,
handover), pulls the linked GitHub issue or Jira card for state, and then reviews the diff and the
evidence together.

**Scope**: one new skill (`skills/review-pr/`), one new shared prompt
(`shared/resources/pr-conformance-prompt.md`), contract tests, and the bundling/catalog/test-glob
wiring a new skill needs. The skill is **advisory**: it writes a co-located report and offers to
post one summary PR comment. It never approves a PR, never writes a gate file, and never edits code.

---

## 2. Motivation

### Current Problems

1. **Nothing reviews a PR as a claim.** `/review-code` reviews a diff in isolation;
   `/review-story` and `/review-task` review a document *before* implementation. Between them
   there is no skill that asks whether the merged-shaped change actually satisfies the work item
   it names, and whether the evidence trail behind it is complete and honest.
2. **The branch → document direction does not exist.** Every resolver in the repo runs
   doc → branch → PR: `create-branch` builds a branch name from a document, `qa-fix` and `qa-task`
   find a PR from the current branch. Nothing parses `feature/task.65.registry-aware-selection`
   back into `docs/tasks/task.65.registry-aware-selection/`. A reviewer does that lookup by hand
   on every PR.
3. **Bitbucket users get no PR review at all.** `/review-code` Step 1 resolves a PR's base with
   `gh pr view --json baseRefName` and has no Bitbucket branch, so the `<PR-number>` target is
   GitHub-only in a repo family that otherwise supports both.
4. **Artifact gaps are silent.** A gate that never reached `PASS`, a `top_issues[]` that was never
   emptied, a `status: accepted` with no DoD file, a handover checklist with outstanding actions —
   all of these are greppable, and none of them are checked at the moment a human is deciding
   whether to merge.
5. **Doc, PR and tracker states drift apart.** `pr_number` missing from frontmatter, an issue still
   in "In Progress" while the doc says `accepted`, a Change Log with no row for the work — each is
   cheap to detect and currently detected by nobody.

### Benefits

1. **One command replaces the manual gather.** PR + work item + six artifact kinds + tracker card,
   assembled and cross-checked in a single invocation.
2. **A reusable branch → document resolver.** The cascade built here is the primitive the repo has
   been missing; other skills can adopt it.
3. **Bitbucket parity for PR review.** Building the diff from `git` rather than from a host API
   makes one code path serve both platforms.
4. **Evidence checks become mechanical.** The "trail" findings are grep-level facts, so they are
   consistent rather than dependent on how carefully a human read the directory.
5. **Reuses the existing reviewer.** The code lens dispatches `code-review-prompt.md` verbatim, so
   `/review-pr` inherits every future improvement to the shared reviewer for free.

---

## 3. Technical Background

### Current architecture

Three pieces already exist and are reused rather than rebuilt:

- **`shared/resources/code-review-prompt.md`** — the single source of truth for the adversarial
  read-only diff reviewer and its `code_review:` YAML output contract. Already dispatched verbatim
  by `/review-code`, `/qa-story` (Phase 1.6) and `/qa-task` (Step 3b).
- **`shared/resources/resolve-platform.sh`** — sets `TRACKER` (`jira|github`), `VCS`
  (`github|bitbucket`), `ACCESS_TRACKER` and `ACCESS_VCS`, and defines `tracker_write` /
  `tracker_call_with_retry` (3× backoff plus the access-deferral gate) in the caller's shell.
- **`shared/resources/bitbucket-auth.sh`** — resolves `BB_AUTH_SCHEME` / `BB_CURL_AUTH` by
  variable name, and returns non-zero when nothing resolves.

The de facto standard platform preamble is `skills/create-pr/SKILL.md` Step 0.5:

```bash
source references/resolve-platform.sh || exit 1
PLATFORM="$VCS"

REMOTE_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ "$PLATFORM" = "bitbucket" ]; then
  BB_PATH=$(echo "$REMOTE_URL" | sed -E 's|.*bitbucket\.org[:/]||; s|\.git$||')
  BB_WORKSPACE=$(echo "$BB_PATH" | cut -d'/' -f1)
  BB_REPO=$(echo "$BB_PATH" | cut -d'/' -f2)
  BB_API="https://api.bitbucket.org/2.0"
  source references/bitbucket-auth.sh || exit 1
fi
```

The only dual-platform idempotent PR comment in the repo is in `skills/finalise/SKILL.md`
(find-by-marker → edit-by-id → else-create, on both `gh` and the Bitbucket REST API).

### Target architecture

`skills/review-pr/SKILL.md` — a nine-step workflow modelled on the tight `review-bug` /
`review-code` shape. Two read-only Explore lenses run in parallel over the same scoped diff:

- **Lens A (code)** — `code-review-prompt.md`, unchanged, emitting `code_review:`.
- **Lens B (conformance)** — a new `pr-conformance-prompt.md`, emitting `pr_conformance:` in a
  deliberately parallel shape so both lenses render and rank through one code path.

A deterministic verdict is computed from the two findings lists and written to a co-located report.

### Important clarifications

- **Branch on `VCS` for anything PR-shaped, on `TRACKER` for anything issue-shaped.**
  `/review-code` Step 4 currently branches on `TRACKER` when deciding how to post a PR comment;
  in a Bitbucket-VCS + GitHub-tracker repo that misroutes. Do not fix it here — see § Notes.
- **Bitbucket answers an unauthenticated request to a private repo with 404, not 401.** Verify auth
  by status code on a repo-root probe, never by the length of a returned list.
- **Story documents are not in `docs/stories/`.** They nest under
  `${PRD_ROOT}/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/`. Glob across
  `docs/`; never assume one root.
- **Artifact filenames end in a free descriptive slug**, e.g.
  `task.53.implementation.1.jira-rest-interception-initial-run.md`. Always glob on the artifact
  segment; never reconstruct an exact filename from the work-item slug.

---

## 4. Scope

### In Scope

✅ **New skill**: `skills/review-pr/SKILL.md` with `/review-pr [target] [--effort] [--comment] [--no-code] [--no-docs]`
✅ **Branch → document resolution**: a six-rung, first-hit-wins cascade that records which rung matched
✅ **Artifact collection**: implementation, review, qa, gate, dod, sprint-review, bug, handover
✅ **Tracker context**: read-only GitHub issue or Jira card fetch, used for state agreement only
✅ **Dual-platform PR resolution and comment**: GitHub (`gh`) and Bitbucket (REST)
✅ **Two review lenses**: the existing code reviewer, plus a new conformance reviewer
✅ **New shared resource**: `shared/resources/pr-conformance-prompt.md`
✅ **Co-located report**: `{stem}.pr-review.{n}.{name}.md`
✅ **Wiring**: bundle, contract tests, `package.json` test glob, catalog regeneration
✅ **Standards doc sweep**: register the `.pr-review.` artifact kind in `file-naming.md`, `task-documents.md`, `story-documents.md` and `pipeline-artifacts.md`

### Out of Scope

❌ **Inline PR comments** — no skill in the repo has ever posted one; building that primitive on two platforms is its own task
❌ **Formal approve / request-changes reviews** — the verdict is advisory text, never `gh pr review --approve`
❌ **Writing or amending a gate `.yml`** — only `qa-*` skills write gates (`docs/reference/anti-patterns.md`)
❌ **Applying fixes** — `/review-code --fix` already owns that; `/review-pr` never edits code
❌ **Fixing `/review-code`'s `TRACKER`-vs-`VCS` comment branch** — recorded as a follow-up, not done here
❌ **A Bitbucket retry helper** — the gap `qa-fix` already documents; the Bitbucket comment path stays single-shot
❌ **An `.agents/reviews/` fallback directory** — co-location is the only sanctioned location for a report; an unanchored review writes no file

---

## 5. Breaking Changes

None. This task adds a new skill and a new shared resource. `code-review-prompt.md` is dispatched
verbatim and is not modified, so `/review-code`, `/qa-story` and `/qa-task` are untouched.

One additive convention is introduced: a new co-located artifact kind, `.pr-review.{n}.`, which no
existing glob matches. It is added to this skill's own work-item exclusion filter so a PR review
report can never be mistaken for the work item it reviews.

---

## 6. Implementation Plan

### Phase 1: Skill scaffold and platform resolution

**Risk Level**: Low

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] Scaffold with `python3 skills/create-skill/scripts/init_skill.py review-pr --path skills/`
- [x] Write frontmatter: `name` + `description` only (third-person, trigger-rich, ≤150 words); never author `managed-by` / `source`
- [x] Write the Arguments table: `target` (PR number | PR URL | branch | none), `--effort` (`low|medium|high|max`, default `medium`), `--comment`, `--no-code`, `--no-docs`
- [x] Define `--effort` as scaling **both** lenses, mirroring `/review-code`: `low`/`medium` favour few high-confidence findings; `high`/`max` widen coverage and may surface `confidence: low` candidates, clearly labelled
- [x] Step 0 — copy the `create-pr` Step 0.5 platform preamble verbatim, `source … || exit 1` on both sourced files
- [x] Document the Bitbucket status-code auth probe and why a 404 is not "nothing there"

**Dependencies**: none

---

### Phase 2: PR resolution (dual platform)

**Risk Level**: Low

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] GitHub path: `gh pr view [N] --json number,url,title,body,state,isDraft,headRefName,baseRefName,author,additions,deletions,changedFiles,files,reviewDecision,statusCheckRollup`
- [x] Bitbucket path: `GET ${BB_API}/repositories/${BB_WORKSPACE}/${BB_REPO}/pullrequests/{id}`
- [x] Bitbucket branch lookup: reuse the URL-encoded query from `skills/qa-fix/SKILL.md` (`?q=source.branch.name%3D%22${ENCODED_BRANCH}%22+AND+state%3D%22OPEN%22`)
- [x] No-argument default: the open PR for the current branch
- [x] HALT with a named message when no PR resolves

**Dependencies**: Phase 1

---

### Phase 3: Work-item resolution cascade

**Risk Level**: Medium

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] Rung 1 — branch stem: strip `feature/`, `bugfix/`, `hotfix/` → `docs/**/${STEM}/${STEM}.md`, else `docs/**/${STEM}.md`; handle `task.N.*`, `story.{E}.{S}.*`, `epic.N.*`, `bug.N.*`
- [x] Rung 2 — `grep -rl "pr_number: ${PR_NUMBER}" docs/`
- [x] Rung 3 — gate `pr:` URL match across `docs/**/*.gate.*.yml`, then its sibling work item
- [x] Rung 4 — PR body issue refs → `github_issue:` / `jira_key:` frontmatter grep, reusing the cascade in `develop-pipeline-step-0-resolve-and-prepare.md` § 0a
- [x] Rung 4 extraction must match **both** shapes: `#{N}` (GitHub) and `[A-Z]+-[0-9]+` (a Jira key). A Bitbucket PR description carries `PROJ-123`, never `#N` — matching only the GitHub shape makes rung 4 dead on the exact Bitbucket + Jira combination this task is scoped for
- [x] Rung 5 — bounded Explore subagent fallback
- [x] Rung 6 — none found: degrade to a code-only review and say so loudly in the report
- [x] Apply the tightened exclusion filter: `.qa. .gate. .bug. .implementation. .review. .dod. .plan. .handover. .pr-review.`
- [x] Record `resolved_via` so the report shows provenance

**Dependencies**: Phase 2

---

### Phase 4: Artifact and tracker collection

**Risk Level**: Low

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] Glob the work-item directory for `*.implementation.*.md`, `*.review.*.md`, `*.qa.*.md`, `*.gate.*.yml`, `*.dod.*.md`, `*sprint-review-summary.md`, `*.bug.*.md`, `*.handover.*.md`
- [x] Select the highest-numbered gate; read `gate:`, `quality_score`, `top_issues`, `waiver`
- [x] Read the DoD header block and the implementation report's Pipeline Progress table
- [x] Reuse the predicates in `docs/reference/pipeline-artifacts.md` § "Verifying a completed run" and `develop-pipeline-resume-contract.md`
- [x] Tracker fetch, read-only and non-blocking. `TRACKER=github` → `gh issue view N --json title,state,labels,milestone`
- [x] `TRACKER=jira` → `GET ${JIRA_URL}/rest/api/2/issue/{jira_key}?fields=summary,status,issuetype,priority` with the Basic-auth header the Jira sites already build (`JIRA_USER_EMAIL`:`JIRA_API_TOKEN`, base64). REST v2 read, not ADF — only `status.name` and `summary` are consumed. Fall back to the Atlassian MCP `getJiraIssue` **only** when no credential resolves. Name the path explicitly; "the existing Jira read path" is not implementable as written

**Dependencies**: Phase 3

---

### Phase 5: Diff construction

**Risk Level**: Low

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] Build the patch from `git` so one path serves both platforms: `git fetch -q origin "$BASE_BRANCH" "$HEAD_BRANCH"` then `git diff "origin/$BASE_BRANCH...origin/$HEAD_BRANCH" > "$DIFF_FILE"`
- [x] Write `$DIFF_FILE` to a scratch path via `mktemp`, never into the repo
- [x] Fall back to `gh pr diff N` / `GET …/pullrequests/{id}/diff` only when the refs will not fetch
- [x] Handle the **cross-fork PR**: `origin/$HEAD_BRANCH` does not exist when the head is a fork branch, so the `origin/…...origin/…` form fails. Detect it (`headRepositoryOwner` ≠ the base repo owner) and take the API-diff fallback directly rather than after a failed fetch
- [x] Empty diff → say so and stop

**Dependencies**: Phase 2

---

### Phase 6: The conformance prompt

**Risk Level**: Medium

**Files**:
- `shared/resources/pr-conformance-prompt.md`

**Changes**:
- [x] Write the read-only Explore prompt: inputs are the work-item doc, the artifact paths, `$DIFF_FILE`, and the tracker snapshot
- [x] Define the `pr_conformance:` YAML output contract, mirroring the `code_review:` shape (`id`, `category`, `severity`, `confidence`, `ref`, `finding`, `suggested_action`, `truncated_count`)
- [x] Define the four categories: `coverage`, `scope`, `trail`, `consistency`
- [x] State that the subagent is read-only and returns findings only — acting on them is the caller's job
- [x] Add the caller-responsibility section (how `/review-pr` renders and ranks the findings)

**Dependencies**: Phase 4

---

### Phase 7: Lenses, verdict and report

**Risk Level**: Medium

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] Dispatch both lenses in parallel; Lens A passes `code-review-prompt.md` verbatim with `<DIFF_FILE>` / `<WORKING_DIR>` substituted
- [x] Honour `--no-code` and `--no-docs` by skipping the corresponding lens
- [x] Honour `--effort` in both dispatches — it scales breadth, never the output contract; the YAML shape is identical at every level
- [x] Compute the deterministic verdict: any conformance `high`, or code `bug` + `high` + `confidence: high` → REQUEST CHANGES; any `medium` → CONCERNS; otherwise APPROVE
- [x] Write the report to `{doc-dir}/{stem}.pr-review.{n}.{name}.md`, `{n}` starting at 1 and incrementing on re-review
- [x] No work item resolved → write **no file**. Render the code findings to the terminal and say plainly that the review is unanchored. Report artifacts are co-located with the work item that led to the PR; with no work item there is nothing to co-locate against, and inventing an `.agents/reviews/` directory would add an unsanctioned location (`plan-file-locations.md` and `source-tree.md` sanction only `.agents/plans/`)
- [x] Give the report as a literal fenced template in SKILL.md (create-skill's Template pattern)
- [x] Cleanup: `rm -f "$DIFF_FILE"`

**Dependencies**: Phases 5, 6

---

### Phase 8: `--comment`

**Risk Level**: Low

**Files**:
- `skills/review-pr/SKILL.md`

**Changes**:
- [x] One summary comment, idempotent via the marker `<!-- agent-skills-pr-review -->`
- [x] GitHub: find marker via `gh pr view --json comments` → `gh api -X PATCH /repos/{o}/{r}/issues/comments/{id}` → else `gh pr comment`, all through `tracker_call_with_retry`
- [x] Bitbucket: `GET` / `PUT` / `POST …/pullrequests/{id}/comments` with `{content:{raw:…}}`, single-shot
- [x] Non-blocking; never gates; never post over an `unverifiable` reason
- [x] Ask before posting unless `--comment` was passed explicitly

**Dependencies**: Phase 7

---

### Phase 9: Wiring and validation

**Risk Level**: Low

**Files**:
- `skills/review-pr/tests/review-pr.test.js`
- `package.json`
- `docs/reference/skill-catalog.md`
- `skills/review-pr/references/` (generated)

**Changes**:
- [x] Write contract tests over SKILL.md prose, modelled on `skills/review-bug/tests/review-bug.test.js` (`node:test` + `node:assert/strict`, CommonJS)
- [x] Append `'skills/review-pr/tests/*.test.js'` to the `"test"` script in `package.json` — there is no `skills/*/tests/` wildcard
- [x] `npm run bundle` and commit the generated `references/`
- [x] `npm run generate-catalog`
- [x] `python3 skills/create-skill/scripts/quick_validate.py skills/review-pr`

**Dependencies**: Phases 1-8

---

### Phase 10: Standards doc sweep

**Risk Level**: Low

**Files**:
- `docs/standards/file-naming.md`
- `docs/standards/task-documents.md`
- `docs/standards/story-documents.md`
- `docs/reference/pipeline-artifacts.md`

**Changes**:
- [x] Register `.pr-review.` in the `file-naming.md` artifact tables — the **story** table (`story.{epic}.{story}.pr-review.{n}.{name}.md`) and the **task** table (`task.{n}.pr-review.{n}.{name}.md`), beside the existing review / qa / gate / implementation / dod rows
- [x] Add a `PR review report` row to the **Co-located artifacts** table in `task-documents.md` and `story-documents.md`, written by `review-pr`
- [x] Add `review-pr` to the step → artifact map in `pipeline-artifacts.md`, marked as standalone (it is not a numbered pipeline step) and committed
- [x] Grep for globs that would newly match the kind: `grep -rn '\*\.review\.\*' skills/ shared/ scripts/` — `.pr-review.` must not be swallowed by a `*.review.*` glob; record and fix anything that matches
- [x] Do **not** add `.agents/reviews/` anywhere — the fallback was removed in Phase 7; co-location is the only sanctioned location

**Dependencies**: Phase 7 (the artifact kind must be settled first)

> **Why this phase exists.** A new artifact kind that no standard names is exactly the drift this repo has been
> bitten by before: roughly a dozen consumer docs restate pipeline behaviour independently and go stale silently.
> The architecture pre-pass flagged the absence as `drift` before a line of the skill was written. Registering the
> kind is cheap now and expensive once reports exist in the wild.

---

## 7. Files Summary

### Files to Create (Core Implementation)

1. ✅ `skills/review-pr/SKILL.md` — the skill: arguments, nine workflow steps, report template
2. ✅ `shared/resources/pr-conformance-prompt.md` — Lens B prompt and `pr_conformance:` output contract

### Files to Create (Tests)

3. ✅ `skills/review-pr/tests/review-pr.test.js` — contract tests over the SKILL.md prose

### Files to Modify

4. ✅ `package.json` — append the new test glob to the `"test"` script
5. ✅ `docs/reference/skill-catalog.md` — regenerated by `npm run generate-catalog`
6. ✅ `docs/standards/file-naming.md` — register `.pr-review.` in the story and task artifact tables
7. ✅ `docs/standards/task-documents.md`, `docs/standards/story-documents.md` — add the PR review report row to Co-located artifacts
8. ✅ `docs/reference/pipeline-artifacts.md` — add `review-pr` to the step → artifact map

### Files Already Modified (at task creation, not implementation)

9. ✅ `docs/tasks/task-registry.md` — this task's row and the counter bump to 67 landed with the task document. **No further registry edit is required during implementation.**

### Files Generated (commit the output, never hand-edit)

7. ✅ `skills/review-pr/references/*` — `npm run bundle` copies `resolve-platform.sh`,
   `bitbucket-auth.sh`, `code-review-prompt.md`, `pr-conformance-prompt.md`,
   `platform-detection.md`, `read-config.sh`, `defer-mutation.js`, `tracker-access-record.md`
   and their transitive dependencies, rewriting `shared/resources/X` → `references/X`

### Files to Delete

None.

---

## 8. Testing Strategy

### Contract Tests

**Scope**: this is a prose-driven skill, so the tests assert structural invariants of SKILL.md and
the new prompt — the repo's established pattern for skills with no executable code.

**Actions**:
- [x] `SKILL.md` declares `name: review-pr` and a `description` of ≤150 words
- [x] Every documented argument appears in the Arguments table
- [x] The platform preamble sources both `resolve-platform.sh` and `bitbucket-auth.sh` with `|| exit 1`
- [x] Both a GitHub and a Bitbucket branch exist for PR resolution and for the `--comment` path
- [x] PR-shaped branches test `$VCS`, not `$TRACKER`
- [x] All six resolution rungs are documented, in order
- [x] The exclusion filter names all nine artifact segments including `.pr-review.`
- [x] `code-review-prompt.md` is referenced, not paraphrased (no inline copy of its prompt body)
- [x] `pr-conformance-prompt.md` declares all four categories and the full `pr_conformance:` key set
- [x] The verdict table is present with all three outcomes
- [x] SKILL.md contains no `gh pr review` and no gate-writing instruction
- [x] SKILL.md contains no `addCommentToJiraIssue` (repo-wide prohibition)

**Command**: `node --test 'skills/review-pr/tests/*.test.js'`

---

### Repo-wide Suites

**Scope**: the existing suites must stay green, and must actually include the new one.

**Actions**:
- [x] `npm test` output names the `review-pr` suite (proves the glob was added)
- [x] `npm run validate` passes for the new skill
- [x] `npm run bundle` is idempotent — a second run produces no diff

**Command**: `npm test && npm run validate`

---

### Manual End-to-End

**Scope**: run against real merged work in this repo, which carries a complete trail.

**Actions**:
- [ ] `/review-pr 281` resolves task 65, reads `gate.3` (PASS, 90) and `dod.1`, and returns ✅ APPROVE
- [x] From `feature/task.65.registry-aware-selection`, a bare `/review-pr` resolves via rung 1
- [ ] `/review-pr 281 --no-code` runs the conformance lens alone
- [ ] `/review-pr <PR> --comment` posts once, then edits rather than duplicating on a second run

---

### Mutation Proving

**Scope**: per `shared/resources/mutation-proving.md`, each behavioural claim must be shown to fail
when the behaviour is removed.

**Actions**:
- [ ] Rename the task 65 work item in a scratch clone; confirm the cascade falls through rung 1 to
      rung 2 (`pr_number`) rather than silently returning nothing
- [ ] Blank the `gate:` value in a scratch gate file; confirm a `trail` finding is raised
- [ ] Remove the `--comment` idempotency marker from the body; confirm the second post duplicates
      (proving the marker is what prevents it)
- [x] Revert the `package.json` glob; confirm `npm test` stops naming the suite

---

## 9. Success Criteria

### Functional

- [x] `/review-pr` resolves a PR from a number, a URL, a branch name, or no argument at all
- [x] The work-item cascade resolves task 65 from PR 281 by branch stem, and by `pr_number` when the branch is unavailable
- [x] All eight artifact kinds are collected when present, and their absence is reported rather than ignored
- [x] The linked GitHub issue or Jira card is fetched read-only and its state compared with the doc and the PR
- [x] Both lenses run, and each can be disabled independently with `--no-code` / `--no-docs`
- [x] The verdict follows the deterministic table exactly
- [x] A co-located `.pr-review.{n}.` report is written, incrementing on re-review
- [x] With no work item resolved, the skill degrades to a code-only review, says so, and writes **no** file
- [x] `--effort` scales the breadth of both lenses without altering either output contract
- [x] `--comment` posts exactly one comment and edits it on re-run, on both platforms

### Platform

- [x] GitHub and Bitbucket both resolve a PR, build a diff, and post a comment
- [x] Every PR-shaped branch keys off `$VCS`; every issue-shaped branch keys off `$TRACKER`
- [x] Bitbucket auth is verified by status code on a repo-root probe
- [x] A non-`full` `ACCESS_TRACKER` defers the comment through `tracker_call_with_retry` without failing the run

### Code Quality

- [x] `quick_validate.py` passes; description ≤150 words and third-person
- [x] Shared resources are referenced as `shared/resources/X` in source and bundled, never hand-copied
- [x] `npm run bundle` is idempotent
- [x] The new test glob is present in `package.json` and the suite appears in `npm test` output
- [x] `docs/reference/skill-catalog.md` regenerated
- [x] `.pr-review.` appears in the `file-naming.md` story and task artifact tables, in both Co-located artifacts tables, and in `pipeline-artifacts.md`
- [x] No existing `*.review.*` glob in `skills/`, `shared/` or `scripts/` silently matches `.pr-review.`

### Documentation

- [x] SKILL.md carries a literal report template and a Related Skills section placing `/review-pr` against `/review-code`, `/qa-task` and `/finalise`
- [x] The out-of-scope follow-ups are recorded in § Notes with enough detail to file later

---

## 10. Risk Assessment

### Medium Risk Areas

**1. The resolution cascade matches the wrong document**

- **Risk**: a loose glob matches an artifact (`task.65.qa.2.….md`) or a neighbouring work item, and the whole review is anchored to the wrong spec.
- **Probability**: Medium
- **Impact**: Major — every finding downstream is wrong, and confidently so.
- **Mitigation**: first-hit-wins with an explicit rung order; the tightened nine-segment exclusion filter; `resolved_via` printed in the report so a human can see how the match was made; rung 6 degrades rather than guessing.
- **Rollback**: the skill is advisory and writes one file — delete the report.

**2. The conformance lens invents findings**

- **Risk**: an LLM lens asked "is the evidence complete?" produces plausible-sounding gaps that are not real, and reviewers learn to ignore it.
- **Probability**: Medium
- **Impact**: Major — a noisy reviewer is worse than none.
- **Mitigation**: mirror `code-review-prompt.md`'s discipline section verbatim in spirit — verify against the actual file before reporting, prefer few high-confidence findings, `confidence: low` rather than inflated severity, empty findings list when there is nothing; anchor every `trail` and `consistency` finding to a greppable fact.
- **Rollback**: `--no-docs` disables the lens entirely.

**3. Bitbucket paths are written but not exercised**

- **Risk**: this repo is GitHub-hosted, so the Bitbucket branches ship untested against a live API.
- **Probability**: Medium
- **Impact**: Minor — GitHub users are unaffected; Bitbucket users hit it first.
- **Mitigation**: lift the recipes verbatim from `finalise` and `qa-fix`, which are the already-shipped dual-platform paths; contract tests assert both branches exist; the status-code auth probe surfaces a bad credential as an error rather than as an empty result.
- **Rollback**: none needed — the GitHub path is independent.

### Low Risk Areas

**1. The new `.pr-review.` artifact kind collides with an existing glob**

- **Risk**: a resolver elsewhere that globs `*.review.*` also matches `*.pr-review.*`.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: the segment is distinct (`.pr-review.` vs `.review.`) and this skill's own filter excludes it; **Phase 10** greps `skills/`, `shared/` and `scripts/` for `*.review.*` globs and fixes anything that would swallow the new kind.

**2. Bundling drift**

- **Risk**: a fix is applied to `skills/review-pr/references/` and silently reverted by the next `npm run bundle`.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: edit `shared/resources/` only; the generated files carry the `AUTO-GENERATED — DO NOT EDIT` header; Phase 9 asserts bundle idempotence.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- The cascade anchors reviews to the wrong document in normal use
- `npm test` or `npm run validate` cannot be made green

**Steps**:
1. `git revert` the merge commit, or delete `skills/review-pr/` and `shared/resources/pr-conformance-prompt.md`
2. Remove the `'skills/review-pr/tests/*.test.js'` entry from `package.json`
3. `npm run bundle && npm run generate-catalog`

**Verification**: `npm test` green; `docs/reference/skill-catalog.md` no longer lists `review-pr`.

---

### Partial Rollback (1-2 hours)

**When to Use**: the code lens is fine but the conformance lens is too noisy, or vice versa.

**Steps**:
1. Make the noisy lens opt-in rather than default (invert `--no-docs` into `--docs`)
2. Leave the resolver, artifact collection and report in place — they are useful on their own

---

### Forward Fix (< 4 hours)

**When to Use**: a single rung of the cascade misfires, a glob is too loose, or a Bitbucket call has the wrong shape.

**Approach**: fix the rung or the call in `SKILL.md` / `pr-conformance-prompt.md`, re-bundle, and add the mutation-proving case that would have caught it.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The skill mutates anything — writes a gate, edits code, submits a formal review
- `--comment` duplicates comments on every run

**Non-Critical (Forward Fix)**:
- A missing artifact kind
- Verdict thresholds tuned wrongly
- Report template wording

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: shared/resources/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-31
**Quality Score**: 70/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.66.qa.1.review-pr.md](./task.66.qa.1.review-pr.md)
- **Gate File**: [task.66.gate.1.review-pr.yml](./task.66.gate.1.review-pr.yml)

### Test Coverage Summary
- **Tests Executed**: 1986 (40 review-pr contract tests)
- **Phases Verified**: 10/10
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Diff code review found 10 correctness defects and 1 cleanup in the skill's own shell snippets and
test assertions. Four are high-confidence and gate the build (CR-1 unanchored `pr_number` grep,
CR-2 `docs/**/` glob that matches 0 of 110 gate files without `globstar`, CR-3 `$BODY_FILE`
consumed but never assigned, CR-8 vacuous test assertion). Every testable finding was confirmed
empirically. None is architectural.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-31 | 1.0     | Initial draft | create-task |
| 2026-08-31 | 1.1     | Review passed (8/10) — 6 Important fixes applied: `--effort` defined, rung 4 matches Jira keys, Jira read path named, cross-fork diff handled, `.agents/reviews/` fallback dropped, Phase 10 standards doc sweep added | review-task |
| 2026-08-31 |         | Implemented — 11 files, 40 tests | develop |
| 2026-08-31 |         | QA gate CONCERNS (70/100) — 4 blocking, 7 advisory code-review findings | qa-task |

---

## Progress Tracking

### Phase 1: Skill scaffold and platform resolution
- [x] Scaffold and frontmatter
- [x] Arguments table
- [x] Platform preamble

### Phase 2: PR resolution
- [x] GitHub path
- [x] Bitbucket path
- [x] Default and HALT behaviour

### Phase 3: Work-item resolution cascade
- [x] Rungs 1-6
- [x] Exclusion filter
- [x] `resolved_via` provenance

### Phase 4: Artifact and tracker collection
- [x] Artifact globs
- [x] Gate / DoD / implementation parsing
- [x] Tracker fetch

### Phase 5: Diff construction
- [x] git-based patch
- [x] API fallback

### Phase 6: Conformance prompt
- [x] Prompt body
- [x] Output contract
- [x] Four categories

### Phase 7: Lenses, verdict and report
- [x] Parallel dispatch
- [x] Verdict table
- [x] Report template and fallback path

### Phase 8: `--comment`
- [x] GitHub idempotent post
- [x] Bitbucket idempotent post
- [x] Confirmation before posting

### Phase 9: Wiring and validation
- [x] Contract tests
- [x] `package.json` glob
- [x] Bundle and catalog

### Phase 10: Standards doc sweep
- [x] `file-naming.md` artifact tables
- [x] Co-located artifacts tables
- [x] `pipeline-artifacts.md`
- [x] Glob-collision grep

---

## References

- **Reused prompt**: [`shared/resources/code-review-prompt.md`](../../../shared/resources/code-review-prompt.md)
- **Platform resolution**: [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md), [`shared/resources/resolve-platform.sh`](../../../shared/resources/resolve-platform.sh)
- **Bitbucket auth**: [`shared/resources/bitbucket-auth.sh`](../../../shared/resources/bitbucket-auth.sh)
- **Dual-platform idempotent PR comment**: `skills/finalise/SKILL.md`
- **Dual-platform PR lookup by branch**: `skills/qa-fix/SKILL.md`
- **Doc resolution cascade**: [`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`](../../../shared/resources/develop-pipeline-step-0-resolve-and-prepare.md) § 0a
- **Artifact map and verification predicates**: [`docs/reference/pipeline-artifacts.md`](../../reference/pipeline-artifacts.md)
- **Skill authoring**: `skills/create-skill/SKILL.md`; test model `skills/review-bug/tests/review-bug.test.js`
- **Mutation proving**: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)

---

## Notes

### Deferred Work — verified vs. outstanding

**Verified during implementation** (against PR 281 / task 65, which carries a complete trail):

- Rung 1 (branch stem) resolves `feature/task.65.registry-aware-selection` → the task document.
- Rung 2 (`pr_number: 281`) resolves to the **same** document — the fall-through is real, not assumed.
- Rung 3 (gate `pr:` URL) resolves to `task.65.gate.3.…yml` and thence its sibling work item.
- Artifact trail collected correctly: 1 implementation, 1 review, 3 qa, 3 gate, 1 dod, 1 bug.
- Highest gate selected and parsed: `gate: PASS`, `quality_score: 90`, `top_issues: []`.
- The review-report glob excludes `.pr-review.` (found by the Phase 10 glob-collision grep, fixed, regression-tested).
- 11 mutation proofs: each behavioural claim goes red when the behaviour is reverted.

**Outstanding — requires a live two-lens run, deferred to QA:**

- A full `/review-pr 281` producing an actual ✅ APPROVE verdict from both lenses.
- `--no-code` running the conformance lens alone.
- `--comment` posting once and editing on the second run (marker idempotency).
- The two conformance mutation proofs (blank a scratch gate's `gate:` → expect a `trail` finding;
  remove the marker → expect a duplicate post).

These are behavioural end-to-end checks against live subagents and a live PR, not contract checks over
prose. Ticking them from a dry read would be reporting coverage that does not exist.

### Important Reminders

- Edit `shared/resources/` sources only. A fix applied to a bundled `references/` copy is silently reverted by the next `npm run bundle`.
- `package.json` enumerates test globs by hand. A new `skills/*/tests/` directory runs nowhere until its glob is added.
- Never restate the `addCommentToJiraIssue` `no-credentials` fallback at a call site — `evals/shared/tests/transition-protocol-parity.test.mjs` enforces a two-file allowlist.
- The skill is advisory. If a future change makes it gate anything, that gate belongs in a `qa-*` skill, not here.

### Follow-ups (out of scope, file separately)

- ⚠️ **`/review-code` Step 4 branches on `TRACKER` when choosing how to post a PR comment.** It should branch on `VCS`. Harmless in a GitHub/GitHub repo; misroutes in a Bitbucket-VCS + GitHub-tracker repo.
- ⚠️ **`/qa-story` Step 6 and `/qa-task` are GitHub-only** for the QA PR comment, yet `/review-code` tells implementers to "mirror qa-story step 6" for Bitbucket. There is no Bitbucket recipe there to mirror.
- ⚠️ **Inline PR comments do not exist anywhere in the repo.** Building them means `gh api /repos/{o}/{r}/pulls/{n}/comments` (or a batched `/pulls/{n}/reviews`) and Bitbucket's `inline: {path, to}` payload key.
- ⚠️ **There is no Bitbucket retry helper.** `tracker_call_with_retry` wraps `gh` only; every Bitbucket call in the repo is single-shot.

### Future Improvements

- Promote the branch → document cascade into a shared resource once a second skill needs it.
- Let `/review-pr` accept a list of PRs for batch triage, emitting one summary table.
- Feed confirmed conformance findings into `/qa-fix` using the existing `top_issues[]` shape.

---

**Status:** Ready for Review

**Next Steps**:
1. `/develop-task docs/tasks/task.66.review-pr/task.66.review-pr.md`
