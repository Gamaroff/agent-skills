---
id: task.176
title: "[Task 176] /review-pr accepts a Jira card or GitHub issue and resolves it to its PR"
type: task
description: "/review-pr only takes a PR number, a PR URL or a branch. Teach it to start from the work item instead — a Jira key or URL, or a GitHub issue — and resolve that to the PR it should review, so the existing PR-vs-requirements report can be produced from the card a person is actually holding."
tags: [review-pr, input-resolution, jira, github, bitbucket]
category: infrastructure
status: ready-for-review
priority: Medium
created: 2026-10-02
updated: 2026-10-02
assignee: TBD
estimated_effort_hours: 12
risk_level: low
github_issue: 553
---

# Technical Task: /review-pr accepts a Jira card or GitHub issue and resolves it to its PR

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.176.review.1.review-pr-tracker-issue-input.md` implemented 2026-10-02
**GitHub Issue**: [#553](https://github.com/Gamaroff/agent-skills/issues/553)

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
- **Same-class mechanism — the existing key → doc lookup.** Rung 4 delegates to
  `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` §0a (lines 27/70 Jira, 29/72
  GitHub): `grep -rl "jira_key: ${JIRA_KEY}"` and `grep -rl "github_issue: {N}"`. Both are
  **unanchored** (`RAPP-70` also matches `RAPP-702`; `github_issue: 5` matches `55`), **quote-intolerant**
  (`jira_key` is quoted in every observed consumer doc), and exclude only three artifact kinds. This
  task **replaces** that lookup with the corrected one and has review-pr **cite** it — it does not add
  a second lookup beside it. The same grep is restated in `skills/review-task/SKILL.md:99,134` and
  `skills/review-story/SKILL.md:189`; those are deferred (see Deferred Work).
- Step 0b's PR-URL arm takes `${TARGET##*/}`, so `https://github.com/o/r/pull/12/files` binds
  `PR=files` today (measured under bash and zsh). The parser fixes this; it is a repair, not a change
  to a working form.
- `VCS` and `TRACKER` are separate axes (`references/resolve-platform.sh`); a repo can host code on
  Bitbucket and track work in Jira, or on Bitbucket with GitHub issues.

### Target Architecture

- **Parse** (pure, offline): a small script turns `target` into key=value lines — `kind`
  (`pr` | `branch` | `jira` | `github-issue`), `pr`, `branch`, `jira_key`, `issue_num`, `host`. Pure
  so it is unit-testable; the skill's tests today pin prose, which cannot prove a URL form parses.
  The parser never decides a key's issue type — a story key and an epic key have the same shape — so
  it refuses only **malformed** input.
- **Platform by host first, then by shape**: for a URL, the **host** decides the platform
  (`github.com` → GitHub; a Jira host → Jira; a Bitbucket host → Bitbucket) *before* any path arm is
  tried — Jira Cloud's issue view `…/projects/RAPP/issues/RAPP-702` contains `/issues/` and must not
  reach a GitHub-issue arm. The key or number is then extracted with an anchored pattern, and any
  `?query` or `#fragment` is stripped. A bare `ABC-12` is Jira; `#12` is a GitHub issue.
- **Host check, per kind** (never "every URL vs the git remote", which would halt every Jira URL):
  - PR URL → host vs `git remote get-url origin`; mismatch → HALT naming both.
  - Jira URL → host vs `JIRA_URL`; mismatch → warn, naming both, and continue with the key.
  - GitHub issue URL → `owner/repo` vs the GitHub tracker repo; mismatch → HALT naming both.
- **Resolve card → doc → PR**, in preference order:
  1. work item doc by `jira_key:` / `github_issue:` frontmatter — the corrected shared §0a lookup
     (anchored, quote-tolerant, recursive, no `**` glob, full exclusion list incl. `.request.`);
  2. the doc's `pr_number:`;
  3. a PR whose source branch is the doc's stem or ends in `/STEM` — Bitbucket
     `q=source.branch.name ~ "<STEM>"` then the same anchored filter; GitHub `gh pr list --state all
     --limit 1000 --json number,headRefName,state`, filtered on `headRefName == STEM` or ending in
     `/STEM` (`--head` is an exact match; a substring match would let `task.10.x` claim `task.10.x-two`);
  4. a PR whose title or description names the key (Jira) or that closes the issue
     (`gh issue view N --json closedByPullRequestsReferences`, **GitHub VCS only**);
  5. `kind=jira` and still nothing → retry the input **as a branch** (a branch may be named
     `RAPP-702`), recording `resolved_via: jira key → branch fallback`;
  6. none → HALT naming every rung tried.
- **GitHub issue with `VCS=bitbucket`**: rungs 1–3 only. Rung 4 is skipped, and a HALT names it as
  GitHub-only.
- **Selection**: exactly one open PR → use it. Several → list them and ask (interactive) or halt with
  the list (non-interactive). Merged PRs are allowed — the diff fallback already supports them. Zero
  → HALT. **Epic** → HALT: "pass a story or task key". An epic is detected after rung 1, when the
  resolved doc is an `epic.*` file or carries `type: epic`, or — with no doc — from the Step 3b
  `issuetype`.
- Step 2 receives the doc already resolved; its `resolved_via` gains the card routes.

### Important Clarifications

- **A bare number stays a PR number.** The develop pipelines and existing users rely on it. On GitHub,
  if `gh pr view N` fails, run `gh issue view N`: the PR error for an issue number is identical to the
  one for a missing number (`GraphQL: Could not resolve to a PullRequest…`, verified on #551 and
  #9999), so only the issue call tells them apart. If it is an issue, resolve as one and say so in
  `resolved_via`. `#N` is an issue.
- **GitHub PR URLs and Bitbucket PR numbers already work** — only the host check is new for them.
- **Bitbucket's own issue tracker is out of scope.** The skill's tracker axis knows `jira` and
  `github` only.
- **Verified (Phase 0, 2026-10-02):** the Bitbucket `q=` filters on `title`, `description` and
  `source.branch.name` work; `gh issue view --json closedByPullRequestsReferences` returns only PRs
  with a closing keyword. Findings and exact queries: the plan file, Phase 0.
- **Key matches are candidates, not answers.** One Jira card matched 3 merged PRs by title and 5 by
  description, so "several" is the common case and the doc's own `pr_number:` / branch stem outrank
  any key search.

---

## 4. Scope

### In Scope

✅ Jira key, Jira `/browse/` URL, Jira board URL with `selectedIssue`, GitHub issue URL, `#N`.
✅ Card → doc → PR resolution and its selection rules, on GitHub and Bitbucket.
✅ The URL-host check.
✅ The pure parser and its offline tests; the SKILL.md prose and the tests that pin it.
✅ The shared §0a key → doc lookup in `develop-pipeline-step-0-resolve-and-prepare.md`, corrected and
   cited by review-pr.
✅ Bundled copies regenerated (`npm run bundle`); CHANGELOG; docs listing `target` forms.

### Out of Scope

❌ Bitbucket issues as a tracker.
❌ Reviewing every PR of an epic.
❌ Any change to the diff, the two lenses, the verdict table or the report template.
❌ Any change to how the develop pipelines call `/review-pr` at Step 5c.
❌ Writing anything to Jira or GitHub — resolution is read-only.
❌ The same lookup restated in `skills/review-task/SKILL.md:99,134` and `skills/review-story/SKILL.md:189`
   (see Deferred Work).

---

## 5. Breaking Changes

None — API stable. Every form accepted today parses to the same `PR` / `BRANCH` it does now; the new
forms were previously read as branch names and could only halt. Two edges, both handled:

- A branch literally named like a Jira key (`RAPP-702`) now parses as `kind=jira`. If no doc or PR
  resolves for the key, it is retried as a branch (rung 5), so it still reviews that branch's PR.
- The corrected §0a lookup stops matching by prefix. A develop run that used to resolve `RAPP-70` to
  `RAPP-702`'s document now halts with "no local document". That is the correct outcome, but a
  pipeline user can see it, so CHANGELOG says so.

---

## 6. Implementation Plan

> Detailed implementation guide:
> [task.176.plan.review-pr-tracker-issue-input.md](task.176.plan.review-pr-tracker-issue-input.md)

### Phase 0: Verify the unverified calls — done 2026-10-02

**Risk Level**: Low

**Files**: none (findings recorded in the plan file)

**Changes**:

- [x] Prove the Bitbucket PR search for a Jira key in the title or description — filter field, quoting,
      pagination — against a real repo. Record the exact query.
- [x] Confirm what `closedByPullRequestsReferences` returns for an issue closed by a merged PR.

**Dependencies**: none. Outcome: both calls work; four findings changed Phase 2 (below).

### Phase 1: The parser

**Risk Level**: Low

**Files**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/tests/review-pr.test.js`

**Changes**:

- [x] Parse every accepted form, old and new, to the key=value contract — host first, then an
      anchored key/number pattern, with `?query` / `#fragment` stripped.
- [x] Refuse malformed input (a URL with no key or number) with a named reason, never a silent branch
      fallthrough. No issue-type judgement — epics are Phase 2's job.
- [x] Cases in `review-pr.test.js`, spawning the script under **both `bash` and `zsh`** (the suite is
      already in the `npm test` glob, so no `package.json` edit): one case per form; the board URL's
      `selectedIssue`; Jira Cloud `…/projects/RAPP/issues/RAPP-702` → `kind=jira`;
      `/browse/RAPP-702?focusedCommentId=1` → `jira_key=RAPP-702`; `…/pull/12/files` → `pr=12`; a bare
      number stays `kind=pr`; a bare key → `kind=jira`; garbage → named refusal.
- [x] `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh` clean.

**Dependencies**: Phase 0.

### Phase 2: Resolution in the skill

**Risk Level**: Medium

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`,
`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`

**Changes**:

- [x] Step 0b calls the parser; the Arguments table gains the new forms.
- [x] **Fix §0a** (lines 27/70 Jira, 29/72 GitHub): anchored and quote-tolerant —
      `^jira_key:[[:space:]]*['"]?KEY['"]?[[:space:]]*$` and the `github_issue:` equivalent — with the
      full Step 2 exclusion list. review-pr's card → doc step and Step 2 rung 4 **cite** §0a instead of
      restating a grep.
- [x] Step 2's exclusion filter (and §0a's) gains `.request.`, so a key lookup resolves to one work item.
- [x] Host check per kind: PR URL vs the git remote (HALT); Jira URL vs `JIRA_URL` (warn); GitHub issue
      URL vs the tracker repo (HALT).
- [x] Key matches on a PR are listed as candidates; an auto-pick requires the doc's `pr_number:` or
      branch stem, never a title or description match alone.
- [x] Step 1 gains the card → PR resolution (rungs 1–6, including the GitHub rung-3 command), the
      `VCS=bitbucket` GitHub-issue rule (rungs 1–3 only), the branch fallback for `kind=jira`, and the
      selection rules.
- [x] Epic detection after rung 1 (`epic.*` doc or `type: epic`; else Step 3b `issuetype`) → HALT.
- [x] Step 2 takes the pre-resolved doc and records the new `resolved_via` values.
- [x] Tests pin each documented route and selection rule; that no write to a tracker appears; that
      card resolution is gated on `kind=jira|github-issue`, so the `kind=pr` arm goes straight to
      Step 1; and that §0a's lookup is anchored (a `RAPP-70` lookup does not match a `RAPP-702` doc).

**Dependencies**: Phase 1.

### Phase 3: Bundle, docs, changelog

**Risk Level**: Low

**Files**: `skills/review-pr/references/*`, the bundled copies of `develop-pipeline-step-0-resolve-and-prepare.md`
(every skill whose `references/` carries it), `CHANGELOG.md`

**Changes**:

- [x] `npm run bundle`, then `npm run bundle:check` green.
- [x] Docs: at review time `grep -rn 'review-pr' docs/` found **no** page listing `target` forms
      (`docs/reference/invocation.md:89,98` names Step 5c only), so the SKILL.md Arguments table is the
      one list. If the SKILL.md description gains a card trigger, run `npm run generate-catalog`.
- [x] CHANGELOG `[Unreleased]`, including the stricter §0a lookup (see Breaking Changes).

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `skills/review-pr/SKILL.md` — Steps 0b, 1, 2; Arguments table.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — §0a key → doc lookup (lines 27, 29, 70, 72).

### Files to Create

- `skills/review-pr/scripts/parse-target.sh` — pure target parser.

### Files to Modify (Tests)

- `skills/review-pr/tests/review-pr.test.js` — parser cases (bash and zsh), the new routes, the selection rules, and §0a's anchoring.

### Files to Modify (Documentation)

- `CHANGELOG.md`. No `docs/` page lists `/review-pr` target forms (checked at review); `docs/reference/skill-catalog.md` only if the description changes.

### Generated (do not hand-edit)

- `skills/*/references/develop-pipeline-step-0-resolve-and-prepare.md` and review-pr's `references/` — via `npm run bundle`.

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Parser (in `review-pr.test.js`, each case run under `bash` and `zsh`): every form to its key=value
  output, including the board URL, `#N`, a bare key, a bare number, Jira Cloud `…/issues/RAPP-702`,
  `/browse/KEY?query`, `…/pull/12/files`, a PR URL reporting its `host`, and garbage (named refusal).

### Integration Tests

- Prose pins in `review-pr.test.js`: Step 0b names the parser; each resolution route and each
  selection outcome is documented; resolution performs no tracker write; the existing assertions
  (anchored greps, no `**` globs, bash/zsh parity) still hold for the new snippets; the card-resolution
  block is gated on `kind=jira|github-issue`; the `kind=jira` branch fallback and the
  `VCS=bitbucket` GitHub-issue rule are stated; §0a's lookup is anchored and quote-tolerant (a
  `RAPP-70` lookup does not match a fixture doc carrying `jira_key: 'RAPP-702'`).
- **Mutation check**: break the board-URL arm, the host-first ordering (Jira `/issues/KEY`), and §0a's
  anchor in turn, and confirm *that* named case goes red — a green suite is not evidence.

### Performance Tests

None — one extra read per run. The "no extra call for a PR target" bound is held by the gating
prose pin above.

### Consumer Tests (post-release — not an acceptance gate)

- After the release is installed: `/review-pr` on a real Jira key whose card has one open PR; one with a
  merged PR; one with no PR (halts); an epic key (halts). These need the merged release, so they are
  Deferred Work, not success criteria.

---

## 9. Success Criteria

### Functional

- [ ] Every new form — Jira key, `/browse/` URL (with or without a query), board URL, Jira Cloud
      `/issues/KEY` URL, GitHub issue URL, `#N` — parses to its documented `kind` and value (parser
      cases, bash and zsh), and SKILL.md routes each `kind` to the named card → PR rungs (prose pin).
- [ ] SKILL.md states each selection outcome — one, several (ask / halt with list), merged, none,
      epic — and each has a prose pin in `review-pr.test.js`.
- [ ] SKILL.md halts on a PR URL whose host differs from the git remote, naming both, and only warns
      on a Jira URL host that differs from `JIRA_URL` (prose pins).
- [ ] Every previously accepted `target` form parses to the same `PR` / `BRANCH` as before (parser
      cases), except `…/pull/N/files`, which now yields `pr=N` instead of `files`.
- [ ] A Jira-key-shaped input that resolves no doc and no PR is retried as a branch (prose pin).
- [ ] A card whose key appears in several PRs (e.g. a task with a docs PR, a reconcile PR and the work
      PR) is never auto-resolved from the key match alone (prose pin).
- [ ] The §0a card → doc lookup is anchored, quote-tolerant and excludes `.request.`: a fixture with a
      work item, its `.request.` artifact and a `RAPP-702` neighbour returns exactly one document for
      its key (test in `review-pr.test.js`).

### Performance

- [ ] No extra network call when `target` is already a PR number or URL — held by the
      `review-pr.test.js` pin that card resolution is gated on `kind=jira|github-issue`.

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

- **Card → PR guesses wrong.** Observed, not hypothetical: one card matched 3 PRs by title and 5 by
  description. Mitigation: the rung order puts the doc's own `pr_number:` and branch stem first; a
  title/description match alone is never auto-picked; every route is named in `resolved_via`.

- **Stricter §0a lookup changes develop-pipeline resolution.** A doc found only by prefix match now
  halts. Mitigation: correct by construction; named in CHANGELOG; the halt message already says what
  to do.

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

## Deferred Work

- **Restated key lookups**: `skills/review-task/SKILL.md:99,134` and `skills/review-story/SKILL.md:189`
  carry the same unanchored, quote-intolerant `grep -rl "jira_key: …"` / `"github_issue: …"`. A
  follow-up task makes them cite the corrected §0a lookup. Consider a positive work-item filter (a
  filename `{kind}.{N}.{slug}.md` whose parent directory is the same stem) over a growing exclusion
  list there.
- **Consumer runs after release**: the four live `/review-pr` runs in Testing Strategy › Consumer Tests.
- **Carried from QA gate 4 (route 2b, cosmetic residue)**: CR4-2 — a `.env` line with a trailing
  `# comment` defeats `/review-pr` Step 0b's quote strip, so a correct Jira host warns "differs".
- **Pre-existing, found in QA cycle 4**: CR4-1 — review-pr Step 2 rung 2's `pr_number` grep (and
  rung 1's `-name` fallback) apply no artifact filter; `bug.3.dod.1.*.md` carries `pr_number: 290`
  while bug.3's own document does not. Route both through the §0a rule.
- **From the Step 5c PR review (`task.176.pr-review.1`, CONCERNS)**: CR-1 — `/review-pr` should treat a
  missing `docs/` as "no document" (continue to rung 4 / code-only) instead of inheriting the §0a
  lookup's HALT, which the develop pipelines keep; CR-2 — accept a scheme-less platform URL
  (`github.com/o/r/pull/12`) instead of reading it as a branch.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-02
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.176.qa.4.review-pr-tracker-issue-input.md](./task.176.qa.4.review-pr-tracker-issue-input.md)
- **Gate File**: [task.176.gate.4.review-pr-tracker-issue-input.yml](./task.176.gate.4.review-pr-tracker-issue-input.yml)

### Test Coverage Summary
- **Tests Executed**: 187
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
All gate-3 findings fixed. No HIGH or MEDIUM finding; one low `.env` inline-comment edge open (CR4-2). One advisory finding (rung 2's `pr_number` grep has no artifact filter) is pre-existing and routed to future work.

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                                        | Author |
| ---------- | ------- | ------------------------------------------------------------------ | ------ |
| 2026-10-02 | 1.0     | Initial draft — cut from a request to start /review-pr from a card | Claude |
| 2026-10-02 | 1.1     | Phase 0 done: queries verified; four findings folded into Phase 2  | Claude |
| 2026-10-02 | 1.2     | Review 1 (7/10, needs revision): 9 important fixes applied — host-first parse, per-kind host check, epic check moved out of parser, shared §0a lookup fixed, parser tests in review-pr.test.js, testable criteria; GitHub issue #553 linked | review-task |
| 2026-10-02 |         | Status → ready-for-development | review-task |
| 2026-10-02 |         | Implemented — 9 files (parser, SKILL.md Steps 0b/1/2, shared §0a lookup + 4 bundled copies, CHANGELOG), 80 new tests (52 → 132 in review-pr.test.js) | develop |
| 2026-10-02 |         | QA gate CONCERNS (90/100) — 5 findings (4 medium, 1 low) | qa-task |
| 2026-10-02 |         | QA findings fixed — gate 1 CONCERNS: 5 queued + 5 advisory (CR-4/5/6/7/9) fixed, 1 iteration | qa-fix |
| 2026-10-02 |         | QA gate FAIL (70/100) — 4 findings (1 high, 2 medium, 1 low) | qa-task |
| 2026-10-02 |         | QA findings fixed — gate 2 FAIL: 4 queued + 5 advisory (CR2-4/5/6/8/9) fixed, iteration 2 | qa-fix |
| 2026-10-02 |         | QA gate CONCERNS (90/100) — 2 findings (1 medium, 1 low) | qa-task |
| 2026-10-02 |         | QA findings fixed — gate 3 CONCERNS: 2 queued + 5 advisory (CR3-2/4/5/6/7) fixed, iteration 3 | qa-fix |
| 2026-10-02 |         | QA gate PASS (100/100) — 1 finding (1 low) | qa-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 0: Verify the unverified calls

- [x] Bitbucket key search
- [x] `closedByPullRequestsReferences` behaviour

### Phase 1: The parser

- [x] Parser
- [x] Suite

### Phase 2: Resolution in the skill

- [x] Steps 0b, 1, 2
- [x] Prose pins and mutation check

### Phase 3: Bundle, docs, changelog

- [x] Bundle
- [x] Docs
- [x] CHANGELOG

---

## References

- `skills/review-pr/SKILL.md` — Steps 0b, 1, 2 (the resolver this extends)
- `skills/review-pr/references/resolve-platform.sh` — the `VCS` / `TRACKER` axes
- Origin: a 2026-10-02 session in rebirth-wallet where `/review-pr <Jira board URL>` was read as a
  branch name and halted (RAPP-702)

---
