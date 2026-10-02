---
id: task.177
title: "/review-pr resolution edge cases"
type: task
description: "Close four edge cases task.176 left in /review-pr's target resolution: a .env JIRA_URL with a trailing comment, a repository with no docs/, a scheme-less platform URL, and Step 2 rung 2 matching an artifact's pr_number."
tags: [review-pr, input-resolution, follow-up]
category: refactoring
status: planned
priority: Medium
created: 2026-10-02
updated: 2026-10-02
assignee:
estimated_effort_hours: 8
github_issue: 555
---

# Technical Task: /review-pr resolution edge cases

**Status:** Planned
**GitHub Issue**: [#555](https://github.com/Gamaroff/agent-skills/issues/555)

---

## 1. Overview

Task.176 taught `/review-pr` to start from a Jira key, Jira URL or GitHub issue. Its QA cycles and its
Step 5c PR review left four edge cases recorded as Deferred Work. This task closes all four. Each one
is a case where the resolver halts, warns falsely, or picks the wrong document, when the right answer
is known.

**Scope**: `skills/review-pr/SKILL.md` (Step 0b's `.env` read, Step 1a rung 1, Step 2 rungs 2 and 4),
`skills/review-pr/scripts/parse-target.sh` (scheme-less URLs), and `skills/review-pr/tests/review-pr.test.js`.

---

## 2. Motivation

### Current Problems

1. **A commented `.env` line warns falsely.** `JIRA_URL="https://acme.atlassian.net" # prod` keeps the
   comment after Step 0b's sed. The quote strip then misses, `norm_host` reduces the value to `"https`,
   and a Jira URL on the correct host warns "differs from JIRA_URL" (task.176 gate 4, CR4-2).
2. **A repository with no `docs/` cannot be reviewed from a card.** The shared §0a Key → document
   lookup halts when `docs/` is missing: `[ -d docs ] && [ -r docs ] || … exit 1`
   (`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md:118`). `/review-pr` runs that block
   at Step 1a rung 1 and Step 2 rung 4, so a Jira-key review in such a repository halts. Its own
   documented paths, "no doc → continue at rung 4" and Step 2 rung 6 "code-only review", are never
   reached (task.176 pr-review.1, CR-1).
3. **A URL pasted without its scheme becomes a branch name.** `github.com/o/r/pull/12` and
   `acme.atlassian.net/browse/RAPP-702` skip the parser's `*://*` arm and fall to the final
   `printf 'kind=branch\nbranch=%s\n'` (`skills/review-pr/scripts/parse-target.sh:232`). The run then
   ends in "no pull request found for github.com/…" — the failure the script says it removes
   (task.176 pr-review.1, CR-2).
4. **Step 2 rung 2 can anchor on an artifact.** Rung 2 is
   `grep -rlE "^pr_number:[[:space:]]*${PR_NUMBER}[[:space:]]*$" docs/` (`skills/review-pr/SKILL.md:397`).
   It applies no work-item filter, and `docs/bugs/bug.3.stdout-truncation-on-exit/bug.3.dod.1.stdout-truncation-on-exit.md:5`
   carries `pr_number: 290` while bug.3's own document does not. A review of PR 290 therefore resolves
   the DoD summary as the work item. This predates task.176 (gate 4, CR4-1).

### Benefits

1. A correct `.env` never produces a false host warning.
2. `/review-pr` works from a card in a repository that keeps no `docs/` tree, degrading to the code-only
   review it documents.
3. Pasting a URL without `https://` works as people expect.
4. Rung 2 resolves the work item, not one of its artifacts, under the same rule §0a states.

---

## 3. Technical Background

### Current Architecture

- **`.env` read** — Step 0b binds `JIRA_URL_SEEN` from the environment, else
  `sed -nE 's/^[[:space:]]*(export[[:space:]]+)?JIRA_URL=//p' "<root>/.env" | tr -d '\r' | tail -1 | sed …`
  (`skills/review-pr/SKILL.md:135`). That strips an `export`, a CR and one surrounding quote pair. A
  trailing ` # comment` is not stripped, so the quote pair is not surrounding any more.
  `shared/resources/resolve-platform.sh` (the `.env` comment block above its parse, "THE PATTERN IS NOT
  `^JIRA_URL=.+`") parses the same file only to decide *whether* a value is set. A comment does not
  change that answer, so the resolver needs no change.
- **§0a lookup** — `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § Key → document
  lookup HALTs (exit 1, `DOC_STATUS=unreadable`) when `docs/` is missing. That is right for the develop
  pipelines, which cannot proceed without a document, and wrong for `/review-pr`, which can.
- **Parser** — `parse-target.sh` classifies by `case "$TARGET" in *://*)` (URL), `'#'*)` (issue ref),
  then number, Jira key, else branch (`parse-target.sh:227-233`).
- **Step 2 rung 2** — a bare grep (`SKILL.md:397`). Rung 1's fallback, `find docs -type f -name "${STEM}.md"`,
  matches only an exact work-item filename, so it does not have this problem.
- **The work-item rule** — §0a keeps a file named after its own directory (`{stem}/{stem}.md`) and
  otherwise drops a basename carrying a kind segment. It is stated once, there, and Step 2's exclusion
  filter cites it (`SKILL.md`, "The rule is stated once, in [§0a …]").

### Target Architecture

- `.env` read: when the value starts with a quote, take the text inside the first quote pair. Otherwise
  strip an unquoted ` #…` tail. Then trim.
- `/review-pr` checks for `docs/` at the repository root (`git rev-parse --show-toplevel`) **before**
  calling §0a. A missing `docs/` means "no document": Step 1a continues at rung 4 and Step 2 continues
  at rung 5/6. §0a itself is unchanged, so the develop pipelines still halt.
- Parser: a target with no scheme whose first path segment is a known platform host (`github.com`,
  `www.github.com`, `bitbucket.org`, `api.bitbucket.org`, `*.atlassian.net`) is re-parsed as
  `https://<target>`. A dotted host followed by a recognised marker (`/pull/N`, `/pull-requests/N`,
  `/pullrequests/N`, `/issues/`, `/browse/`) is re-parsed the same way. Anything else stays a branch.
- Step 2 rung 2: the grep's hits go through the §0a work-item rule, cited, not restated.

### Important Clarifications

- A branch named like a dotted host plus a marker (`v1.2/pull/3`) would now parse as a URL. No branch in
  this repository's history has that shape (`git branch -a`). The task's tests carry real branch names
  (`feature/task.1.x`, `release/v1.2`) that must stay branches.
- The parser's refusal of a malformed URL is unchanged. A re-parsed scheme-less URL with no target is
  refused exactly as its `https://` form is.

---

## 4. Scope

### In Scope

✅ Step 0b `.env` inline-comment handling.
✅ The docs-less fallback in `/review-pr` (Step 1a rung 1, Step 2 rung 4).
✅ Scheme-less platform URLs in `parse-target.sh`.
✅ The work-item filter on Step 2 rung 2.
✅ Tests for each, under bash and zsh; CHANGELOG.

### Out of Scope

❌ Changing §0a's HALT on a missing `docs/` — the develop pipelines keep it.
❌ `review-task` / `review-story` lookups — task.178.
❌ The resolver's own `.env` parse — it only asks whether a value is set.

---

## 5. Breaking Changes

None — API stable. Every target that parses today parses the same way, except that a scheme-less
platform URL now parses as its URL instead of as a branch. Before this task, that input could only halt.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.177.plan.review-pr-resolution-edge-cases.md](task.177.plan.review-pr-resolution-edge-cases.md)

### Phase 1: Parser — scheme-less URLs

**Risk Level**: Low

**Files**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/tests/review-pr.test.js`

- [ ] Re-parse a scheme-less target whose first segment is a known platform host, or a dotted host
      followed by a recognised marker, as `https://<target>`.
- [ ] Parser cases under bash and zsh: `github.com/o/r/pull/12` → `kind=pr`, `acme.atlassian.net/browse/RAPP-702`
      → `kind=jira`, `bitbucket.org/ws/r/pull-requests/7` → `kind=pr`. Real branch names
      (`feature/task.1.x`, `release/v1.2`, `hotfix/v1.2.1`) stay `kind=branch`.
- [ ] Add the scheme-less forms to the `shell-fn:` probe cases.

**Dependencies**: none.

### Phase 2: Skill prose — `.env`, docs-less fallback, rung 2 filter

**Risk Level**: Low

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`

- [ ] Step 0b: inline-comment handling for `JIRA_URL_SEEN`.
- [ ] Step 1a rung 1 and Step 2 rung 4: a missing `docs/` at the repository root means "no document".
- [ ] Step 2 rung 2: filter the grep's hits through the §0a work-item rule (cite it).
- [ ] Tests: the Step 0b block with a commented `.env` (no warning on the matching host); a docs-less
      consumer repo reaches rung 4 instead of halting; a fixture where only a DoD carries the `pr_number`
      resolves no artifact.

**Dependencies**: Phase 1 (shared test file).

### Phase 3: Bundle, CHANGELOG

**Risk Level**: Low

**Files**: `CHANGELOG.md`

- [ ] `npm run bundle:check` green (no shared source changes are expected).
- [ ] CHANGELOG `[Unreleased]` entry citing (task 177).

**Dependencies**: Phase 2.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `skills/review-pr/scripts/parse-target.sh` — scheme-less URLs.
- `skills/review-pr/SKILL.md` — Step 0b `.env`; Step 1a rung 1 and Step 2 rung 4 docs-less fallback;
  Step 2 rung 2 filter.

### Files to Modify (Tests)

- `skills/review-pr/tests/review-pr.test.js`

### Files to Modify (Documentation)

- `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Parser cases (bash and zsh) for the scheme-less forms and for real branch names that must stay
  branches.
- The `shell-fn:` probe gains the scheme-less cases. Its verdict must stay `engages`, with nothing
  reproduced or overblocked.

### Integration Tests

- The Step 0b block, run as delivered in a consumer-shaped git repo with an inline-commented `.env`.
- Step 1a in a consumer repo with no `docs/`, with a stub `gh`: reaches rung 4 and does not halt.
- Step 2 rung 2 against a fixture where only a `.dod.` file carries the `pr_number`.
- **Mutation check**: revert each fix in turn and confirm its named test goes red.

### Performance Tests

None.

### Consumer Tests

None beyond the suite.

---

## 9. Success Criteria

### Functional

- [ ] `JIRA_URL="https://acme.atlassian.net" # prod` in `.env` produces no warning for a Jira URL on
      `acme.atlassian.net` (executed Step 0b test, bash and zsh).
- [ ] In a repository with no `docs/`, `/review-pr RAPP-702` continues past rung 1 instead of halting
      (executed Step 1a test), while §0a still halts when called directly (existing test).
- [ ] `github.com/o/r/pull/12`, `acme.atlassian.net/browse/RAPP-702` and
      `bitbucket.org/ws/r/pull-requests/7` parse as their `https://` forms do, and the listed real
      branch names still parse as branches (parser cases, bash and zsh).
- [ ] Step 2 rung 2 never returns a file the §0a rule classes as an artifact (fixture test).

### Performance

- [ ] No extra network call for a PR target (the existing gating pin still holds).

### Code Quality

- [ ] `review-pr.test.js` green; the mutation check reds each named case.
- [ ] `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh` clean; `npm run bundle:check`
      and the full suite green.

### Migration

- [ ] None — no consumer action beyond `setup-consumer.sh --update`.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

- **A branch misread as a scheme-less URL.** Mitigation: only known hosts, or a dotted host plus a
  marker, are re-parsed, and the tests carry real branch names that must stay branches.

### Low Risk Areas

- `.env` parsing differences from the resolver. Mitigation: the resolver only asks whether a value is
  set, which a comment cannot change.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a previously working `target` stops resolving.

**Steps**: revert the merge commit; `npm test` and `npm run bundle:check` green.

### Partial Rollback (1-2 hours)

**When to Use**: the scheme-less arm misreads a real branch. **Steps**: revert Phase 1 only.

### Forward Fix (< 4 hours)

**When to Use**: a host or marker list that is too narrow or too wide.

### Rollback Triggers

**Critical**: a branch target resolving as a URL. **Non-critical**: warning wording.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-10-02 | 1.0     | Initial draft — task.176 Deferred Work items 1–4         | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Parser — scheme-less URLs

- [ ] Parser arm
- [ ] Tests

### Phase 2: Skill prose

- [ ] `.env`
- [ ] Docs-less fallback
- [ ] Rung 2 filter
- [ ] Tests

### Phase 3: Bundle, CHANGELOG

- [ ] Bundle check
- [ ] CHANGELOG

---

## References

- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review-pr-tracker-issue-input.md` § Deferred Work
- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.gate.4.review-pr-tracker-issue-input.yml` (CR4-1, CR4-2)
- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.pr-review.1.review-pr-tracker-issue-input.md` (CR-1, CR-2)

---

## Notes

- QA artifacts will be co-located here: `task.177.qa.{N}.*.md`, `task.177.gate.{N}.*.yml`, bug reports
  `task.177.bug.{N}.*.md`.
