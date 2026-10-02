---
id: task.176
title: "[Task 176] /review-pr accepts a Jira card or GitHub issue and resolves it to its PR"
type: task
description: "/review-pr only takes a PR number, a PR URL or a branch. Teach it to start from the work item instead — a Jira key or URL, or a GitHub issue — and resolve that to the PR it should review, so the existing PR-vs-requirements report can be produced from the card a person is actually holding."
tags: [review-pr, input-resolution, jira, github, bitbucket]
category: infrastructure
status: planned
priority: Medium
created: 2026-10-02
updated: 2026-10-02
assignee: TBD
estimated_effort_hours: 10
risk_level: low
---

# Technical Task: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Status:** Planned

---

## 1. Overview

`/review-pr` already reviews a PR as a claim against its story or task: acceptance-criteria
traceability, the artifact trail, the tracker status, and a code lens. It writes a co-located
`*.pr-review.{n}.*.md` whose machine-readable findings block is what `/qa-fix` ingests. What it cannot
do is **start from the work item**. Its `target` is a PR number, a PR URL or a branch; a Jira board
link, a Jira key or a GitHub issue is read as a branch name, finds no PR, and halts.

This task adds the work-item entry points and the card → PR resolution behind them. Everything from
the diff onward is unchanged.

**Scope**: `skills/review-pr/SKILL.md` Steps 0b, 1 and 2; one small pure parser with its tests; the
bundled copies; docs that list the accepted `target` forms.

**Key deliverables**:

1. `target` accepts a Jira key (`RAPP-702`), a Jira `/browse/` URL, a Jira board URL carrying
   `?selectedIssue=`, a GitHub issue URL (`/issues/N`) and `#N`.
2. A card → PR resolution with documented selection rules (one open PR, several, merged, none, epic).
3. A URL-host check, so a PR URL for a different platform than the repo's remote halts clearly
   instead of being looked up on the wrong host.

**Expected outcome**: `/review-pr RAPP-702` (or the card's URL, or `#536`) produces the same report a
`/review-pr <PR number>` run would, with `resolved_via` recording the route taken.

---

## 2. Motivation

### Current Problems

1. **The person holds a card, not a PR number.** Reviewing "the PR for RAPP-702" means looking the PR
   up by hand first. A pasted Jira board URL is the natural thing to hand the skill, and it fails.
2. **The failure is quiet in the wrong direction.** A non-numeric `target` falls to the branch arm of
   Step 0b, so a URL becomes a branch name and the user sees "no pull request found for
   `https://…`" — true, and no help.
3. **PR URLs ignore their own host.** Step 0b keeps only the trailing number and takes the platform
   from `git remote`. A GitHub PR URL pasted into a Bitbucket checkout is looked up on Bitbucket.

### Benefits

1. The review can start from where work is tracked, on either tracker.
2. Provenance stays visible: `resolved_via` names the route (`jira key → pr_number`, `github issue →
   closing PR`, …), which is what lets a human catch a wrong anchor.
3. Pipeline behaviour is untouched: the develop pipelines run Step 5c with the PR already known.

---

## 3. Technical Background

### Current Architecture

- `skills/review-pr/SKILL.md` Step 0b parses `target` into `PR` / `BRANCH`. Recognised: GitHub
  `/pull/N`, Bitbucket web `/pull-requests/N`, Bitbucket API `/pullrequests/N`, a bare number
  (PR), anything else (branch).
- Step 1 resolves the PR through `gh pr view` (GitHub) or the Bitbucket REST API, branching on `$VCS`.
- Step 2 resolves the *work item* from the PR by a first-hit cascade: branch stem, `pr_number:`
  frontmatter, gate `pr:`, tracker issue in the PR body, Explore, none. Rung 4 already greps
  `jira_key:` / `github_issue:` frontmatter — the lookup this task needs, run in the other direction.
- `VCS` and `TRACKER` are separate axes (`references/resolve-platform.sh`); a repo can host code on
  Bitbucket and track work in Jira, or on Bitbucket with GitHub issues.

### Target Architecture

- **Parse** (pure, offline): a small script turns `target` into key=value lines — `kind`
  (`pr` | `branch` | `jira` | `github-issue`), `pr`, `branch`, `jira_key`, `issue_num`, `host`. Pure
  so it is unit-testable; the skill's tests today pin prose, which cannot prove a URL form parses.
- **Platform by shape, not by `TRACKER`**: `ABC-12` is Jira; `#12` and `/issues/N` are GitHub. A URL's
  host decides the platform for a URL, and a mismatch with the repo's remote halts with both named.
- **Resolve card → doc → PR**, in preference order:
  1. work item doc by `jira_key:` / `github_issue:` frontmatter (anchored, recursive, no `**` glob);
  2. the doc's `pr_number:`;
  3. a PR whose source branch contains the doc's stem;
  4. a PR whose title or description names the key (Jira) or that closes the issue
     (`gh issue view N --json closedByPullRequestsReferences`, GitHub);
  5. none → HALT naming what was tried.
- **Selection**: exactly one open PR → use it. Several → list them and ask (interactive) or halt with
  the list (non-interactive). Merged PRs are allowed — the diff fallback already supports them. Zero
  → HALT. An **epic** key resolves to many PRs → HALT: "pass a story or task key".
- Step 2 receives the doc already resolved; its `resolved_via` gains the card routes.

### Important Clarifications

- **A bare number stays a PR number.** The develop pipelines and existing users rely on it. On GitHub,
  if `gh pr view N` fails because `N` is an issue, retry as an issue and say so in `resolved_via`.
  `#N` is an issue.
- **GitHub PR URLs and Bitbucket PR numbers already work** — only the host check is new for them.
- **Bitbucket's own issue tracker is out of scope.** The skill's tracker axis knows `jira` and
  `github` only.
- **Verified here:** `gh` 2.94.0 exposes `closedByPullRequestsReferences` on `gh issue view --json`.
  **Not yet verified:** the Bitbucket `q=` filter for "PRs mentioning a key" — Phase 0.

---

## 4. Scope

### In Scope

✅ Jira key, Jira `/browse/` URL, Jira board URL with `selectedIssue`, GitHub issue URL, `#N`.
✅ Card → doc → PR resolution and its selection rules, on GitHub and Bitbucket.
✅ The URL-host check.
✅ The pure parser and its offline tests; the SKILL.md prose and the tests that pin it.
✅ Bundled copies regenerated (`npm run bundle`); CHANGELOG; docs listing `target` forms.

### Out of Scope

❌ Bitbucket issues as a tracker.
❌ Reviewing every PR of an epic.
❌ Any change to the diff, the two lenses, the verdict table or the report template.
❌ Any change to how the develop pipelines call `/review-pr` at Step 5c.
❌ Writing anything to Jira or GitHub — resolution is read-only.

---

## 5. Breaking Changes

None — API stable. Every form accepted today parses to the same `PR` / `BRANCH` it does now; the new
forms were previously read as branch names and could only halt.

---

## 6. Implementation Plan

> Detailed implementation guide:
> [task.176.plan.review-pr-tracker-issue-input.md](task.176.plan.review-pr-tracker-issue-input.md)

### Phase 0: Verify the one unverified call

**Risk Level**: Low

**Files**: none (findings recorded in the plan file)

**Changes**:

- [ ] Prove the Bitbucket PR search for a Jira key in the title or description — filter field, quoting,
      pagination — against a real repo. Record the exact query.
- [ ] Confirm what `closedByPullRequestsReferences` returns for an issue closed by a merged PR.

**Dependencies**: none. **If the Bitbucket query cannot be made to work, halt and re-scope** — do not
ship rung 4 on a query that has not run.

### Phase 1: The parser

**Risk Level**: Low

**Files**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/tests/parse-target.test.sh`

**Changes**:

- [ ] Parse every accepted form, old and new, to the key=value contract.
- [ ] Refuse an epic-shaped or malformed key with a named reason, never a silent branch fallthrough.
- [ ] Suite: one case per form; the board URL's `selectedIssue`; a PR URL on the wrong host; a bare
      number stays `kind=pr`.

**Dependencies**: Phase 0.

### Phase 2: Resolution in the skill

**Risk Level**: Medium

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`

**Changes**:

- [ ] Step 0b calls the parser; the Arguments table gains the new forms.
- [ ] Step 1 gains the card → PR resolution and the selection rules.
- [ ] Step 2 takes the pre-resolved doc and records the new `resolved_via` values.
- [ ] Tests pin each documented route and selection rule, and that no write to a tracker appears.

**Dependencies**: Phase 1.

### Phase 3: Bundle, docs, changelog

**Risk Level**: Low

**Files**: `skills/review-pr/references/*`, `docs/` pages naming `/review-pr` targets, `CHANGELOG.md`

**Changes**:

- [ ] `npm run bundle`, then `npm run bundle:check` green.
- [ ] Update every doc that lists the accepted `target` forms (find with `grep -rn 'review-pr' docs/`).
- [ ] CHANGELOG `[Unreleased]`.

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `skills/review-pr/SKILL.md` — Steps 0b, 1, 2; Arguments table.

### Files to Create

- `skills/review-pr/scripts/parse-target.sh` — pure target parser.

### Files to Modify (Tests)

- `skills/review-pr/tests/review-pr.test.js` — pin the new routes and selection rules.
- `skills/review-pr/tests/parse-target.test.sh` — new, offline.

### Files to Modify (Documentation)

- `CHANGELOG.md`; any `docs/` page listing `/review-pr` target forms.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Parser: every form to its key=value output, including the board URL, `#N`, a bare key, a bare
  number, a wrong-host PR URL, an epic-shaped key, and garbage.

### Integration Tests

- Prose pins in `review-pr.test.js`: Step 0b names the parser; each resolution route and each
  selection outcome is documented; resolution performs no tracker write; the existing assertions
  (anchored greps, no `**` globs, bash/zsh parity) still hold for the new snippets.
- **Mutation check**: break the board-URL arm and the host check in turn and confirm *that* named
  case goes red — a green suite is not evidence.

### Performance Tests

None — one extra read per run.

### Consumer Tests

- With the release installed: `/review-pr` on a real Jira key whose card has one open PR; one with a
  merged PR; one with no PR (halts); an epic key (halts). Record in the implementation report.

---

## 9. Success Criteria

### Functional

- [ ] `/review-pr <Jira key | /browse/ URL | board URL | GitHub issue URL | #N>` reaches Step 3 on the
      right PR and writes the same report a PR-number run would.
- [ ] Each selection outcome (one, several, merged, none, epic) behaves as documented.
- [ ] A PR URL for the other platform halts naming both hosts.
- [ ] Every previously accepted `target` form resolves exactly as before.

### Performance

- [ ] No extra network call when `target` is already a PR number or URL.

### Code Quality

- [ ] Parser suite and `review-pr.test.js` green; the mutation check above reds the named case.
- [ ] `npm run bundle:check` and the repo's full test run green.

### Migration

- [ ] None — no consumer action beyond `setup-consumer.sh --update`.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

- **Card → PR guesses wrong.** A key mentioned in another PR's description matches. Mitigation: the
  rung order puts the doc's own `pr_number:` first; every route is named in `resolved_via`; several
  matches are listed, never auto-picked.
- **Bitbucket query unproven.** Mitigation: Phase 0 gates the work.

### Low Risk Areas

- A bare number or branch regresses. Mitigation: parser cases for every old form.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: an old `target` form stops resolving.

**Steps**: revert the merge commit; `npm test`, `npm run bundle:check` green.

### Partial Rollback (1-2 hours)

**When to Use**: the parser is sound but card → PR picks wrongly.

**Steps**: revert Phase 2's rung 4 only; keep the parser and the Jira/GitHub doc routes.

### Forward Fix (< 4 hours)

**When to Use**: a selection rule too eager or too strict.

### Rollback Triggers

**Critical**: a review run against the wrong PR with no `resolved_via` to show it. **Non-critical**:
message wording.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                                        | Author |
| ---------- | ------- | ------------------------------------------------------------------ | ------ |
| 2026-10-02 | 1.0     | Initial draft — cut from a request to start /review-pr from a card | Claude |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Verify the one unverified call

- [ ] Bitbucket key search
- [ ] `closedByPullRequestsReferences` behaviour

### Phase 1: The parser

- [ ] Parser
- [ ] Suite

### Phase 2: Resolution in the skill

- [ ] Steps 0b, 1, 2
- [ ] Prose pins and mutation check

### Phase 3: Bundle, docs, changelog

- [ ] Bundle
- [ ] Docs
- [ ] CHANGELOG

---

## References

- `skills/review-pr/SKILL.md` — Steps 0b, 1, 2 (the resolver this extends)
- `skills/review-pr/references/resolve-platform.sh` — the `VCS` / `TRACKER` axes
- Origin: a 2026-10-02 session in rebirth-wallet where `/review-pr <Jira board URL>` was read as a
  branch name and halted (RAPP-702)

---
