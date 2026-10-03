---
id: task.177
title: "/review-pr resolution edge cases"
type: task
description: "Close four edge cases task.176 left in /review-pr's target resolution: a .env JIRA_URL with a trailing comment, a repository with no docs/, a scheme-less platform URL, and Step 2 rung 2 matching an artifact's pr_number."
tags: [review-pr, input-resolution, follow-up]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-02
updated: 2026-10-03
assignee:
estimated_effort_hours: 8
github_issue: 555
---

# Technical Task: /review-pr resolution edge cases

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.177.review.1.review-pr-resolution-edge-cases.md` implemented 2026-10-03
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
  then number, Jira key, else branch (`parse-target.sh:173-233`; the `*://*` arm is at `:178`).
- **Step 2 rung 2** — a bare grep (`SKILL.md:397`). Rung 1's fallback, `find docs -type f -name "${STEM}.md"`,
  matches only an exact work-item filename, so it does not have this problem.
- **The work-item rule** — §0a keeps a file named after its own directory (`{stem}/{stem}.md`) and
  otherwise drops a basename carrying a kind segment. It is stated once, there, and Step 2's exclusion
  filter cites it (`SKILL.md`, "The rule is stated once, in [§0a …]").

### Target Architecture

- `.env` read: when the value starts with a quote, take the text inside the first quote pair. Otherwise
  strip an unquoted ` #…` tail. Then trim.
- `/review-pr` checks for `docs/` at the repository root (`git rev-parse --show-toplevel`) **before**
  calling §0a, in **one fenced bash block** (the docs guard) so a test can extract and run it. A
  missing `docs/` means "no document": the block binds `DOC_FILE=""` without calling §0a; otherwise it
  runs §0a and binds `DOC_FILE=$LOCAL_PATH`. Step 1a rung 1 runs it and continues at rung 4 when
  `DOC_FILE` is empty; Step 2 skips rungs 1–4 and continues at rung 5/6. §0a itself is unchanged, so
  the develop pipelines still halt.
- Parser: a target with no scheme whose first path segment is a known platform host (`github.com`,
  `www.github.com`, `bitbucket.org`, `api.bitbucket.org`, `*.atlassian.net`) is re-parsed as
  `https://<target>`. A dotted host followed by a recognised marker (`/pull/N`, `/pull-requests/N`,
  `/pullrequests/N`, `/issues/`, `/browse/`) is re-parsed the same way. Anything else stays a branch.
- Step 2 rung 2 **is** the §0a Key → document lookup run with `KEY_FIELD=pr_number KEY_VALUE=$PR_NUMBER`
  — the work-item rule is reused, not restated. Measured on the live tree: `pr_number 290` →
  `DOC_STATUS=none` (the bare grep returns the bug.3 DoD), `pr_number 554` → `found` (task.176's own
  document). It runs after the docs guard, since §0a HALTs on a missing `docs/`.

### Important Clarifications

- A branch whose **first** segment holds a dot, followed by two or more segments and a marker
  (`v1.2/x/pull/3`), would now parse as a URL. `v1.2/pull/3` and `release/v1.2/pull/3` stay branches —
  every marker pattern needs `host/x/…`, and `release` holds no dot (measured under bash and zsh). No
  branch in this repository's history has the misread shape (`git branch -a`). The task's tests carry
  real branch names (`feature/task.1.x`, `release/v1.2`, `v1.2/pull/3`) that must stay branches.
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

One resolver behaviour tightens: Step 2 rung 2 reuses §0a, so two work items carrying the same
`pr_number` now HALT as ambiguous (listing both) instead of the rung returning several files. A wrong
pick would anchor the whole review on the wrong work item.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.177.plan.review-pr-resolution-edge-cases.md](task.177.plan.review-pr-resolution-edge-cases.md)

### Phase 1: Parser — scheme-less URLs

**Risk Level**: Low

**Files**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/tests/review-pr.test.js`

- [x] Re-parse a scheme-less target whose first segment is a known platform host, or a dotted host
      followed by a recognised marker, as `https://<target>`.
- [x] Parser cases under bash and zsh: `github.com/o/r/pull/12` → `kind=pr`, `acme.atlassian.net/browse/RAPP-702`
      → `kind=jira`, `bitbucket.org/ws/r/pull-requests/7` → `kind=pr`. Real branch names
      (`feature/task.1.x`, `release/v1.2`, `hotfix/v1.2.1`) stay `kind=branch`.
- [x] Add the scheme-less forms to the `shell-fn:` probe cases.

**Dependencies**: none.

### Phase 2: Skill prose — `.env`, docs-less fallback, rung 2 filter

**Risk Level**: Low

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`

- [x] Step 0b: inline-comment handling for `JIRA_URL_SEEN`.
- [x] Step 1a: a fenced **docs guard** block — a missing `docs/` at the repository root binds
      `DOC_FILE=""` and skips §0a; otherwise it runs §0a. Step 1a rung 1 and Step 2 (rungs 1–4) cite it.
- [x] Step 2 rung 2: the §0a lookup with `KEY_FIELD=pr_number KEY_VALUE=$PR_NUMBER` (cite it).
- [x] Tests: the Step 0b block with a commented `.env` (no warning on the matching host); the docs
      guard block, extracted and run in a docs-less consumer repo, binds `DOC_FILE=""` and exits 0, and
      the rungs 3–4 block then reports `RUNG=key search`; `lookupBlock()` with `KEY_FIELD=pr_number`
      against a fixture where only a DoD carries the `pr_number` returns `DOC_STATUS=none`, and one
      where two work items share it HALTs as ambiguous.

**Dependencies**: Phase 1 (shared test file).

### Phase 3: Bundle, CHANGELOG

**Risk Level**: Low

**Files**: `CHANGELOG.md`

- [x] `npm run bundle:check` green (no shared source changes are expected).
- [x] CHANGELOG `[Unreleased]` entry citing (task 177).

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

- [x] `JIRA_URL="https://acme.atlassian.net" # prod` in `.env` produces no warning for a Jira URL on
      `acme.atlassian.net` (executed Step 0b test, bash and zsh).
- [x] In a repository with no `docs/`, `/review-pr RAPP-702` continues past rung 1 instead of halting
      (the docs guard block, extracted and executed), while §0a still halts when called directly
      (existing test, `review-pr.test.js` CR2-6).
- [x] `github.com/o/r/pull/12`, `acme.atlassian.net/browse/RAPP-702` and
      `bitbucket.org/ws/r/pull-requests/7` parse as their `https://` forms do, and the listed real
      branch names still parse as branches (parser cases, bash and zsh).
- [x] Step 2 rung 2 never returns a file the §0a rule classes as an artifact (`lookupBlock()` with
      `KEY_FIELD=pr_number`, fixture test, bash and zsh).

### Performance

- [x] No extra network call for a PR target (the existing gating pin still holds).

### Code Quality

- [x] `review-pr.test.js` green; the mutation check reds each named case.
- [x] `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh` clean; `npm run bundle:check`
      and the full suite green.

### Migration

- [x] None — no consumer action beyond `setup-consumer.sh --update`.

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

## Implementation Summary

**Completed**: 2026-10-03 (`/develop-task` run 1, Step 3 implemented inline from the plan file).

### Approach

- **Phase 1 — parser.** `parse-target.sh` gains one `case` before classification: a target with no
  `://` whose first segment is `github.com`, `www.github.com`, `bitbucket.org`, `www.bitbucket.org`,
  `api.bitbucket.org` or `*.atlassian.net` (port stripped, case folded) is re-parsed as
  `https://<target>`. Nothing else is. `www.bitbucket.org` was added beyond the task's list because
  the URL arm already accepts it.
  - **Narrower than § 3's Target Architecture, deliberately.** § 3 also re-parsed "a dotted host
    followed by a recognised marker". QA cycle 1 found that rule reading version branches as hosts
    (`v2.0/browse/x`, CR-3); a TLD-shape guard fixed those, and cycle 2 then found it reading
    user-namespaced branches (`jane.doe/fix/issues/123`, CR2-1). Every guess at an unknown dotted
    segment collides with some branch-naming convention, and § 10 names "a branch target resolving as
    a URL" as the Critical rollback trigger. So the guess was dropped (qa-fix Step 2.6, *scope the
    claim*): a self-hosted URL keeps its scheme. No success criterion depended on it.
- **Phase 2 — skill prose.** Step 0b's `.env` value parse takes the inside of the first quote pair
  (each `t` its own `-e`, for BSD sed), else strips an unquoted ` #…` tail. Step 1a gains a fenced
  **docs guard** block (`DOCS=absent DOC_FILE=""` with no `docs/` at the repository root, never
  calling §0a; `DOCS=present` hands over to §0a). Rung 1's row and Step 2 cite it; Step 2 skips rungs
  1–4 on `DOCS=absent`. Step 2 rung 2 is now the §0a lookup with `KEY_FIELD=pr_number`.
- **Phase 3.** CHANGELOG `[Unreleased]` › Fixed entry. No shared source changed, so no bundle churn.

### Testing Results

- `skills/review-pr/tests/review-pr.test.js`: 227/227 passing (was 208 before the task's tests), bash
  and zsh. New cases: 10 parser cases (scheme-less URLs, real branch names incl.
  `release/v1.2/x/pull/3`), a scheme-less malformed URL, 3 probe cases, commented-`.env` Step 0b runs
  (same host: no warning; other host: still warns), the docs guard (absent from a subdirectory,
  present, docs-less → rung 4 `RUNG=key search`), and rung 2 via §0a (`.dod.` only → `none`;
  anchored 28 ≠ 281; shared `pr_number` → ambiguous HALT).
- **Mutation check** — each fix reverted, its tests red: parser arm (11 red), the first-segment guard
  (2 red), the `.env` parse (4 red), the docs guard replaced by a bare §0a (4 red), rung 2 back to a
  bare grep (1 red).
- `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh` clean;
  `npm run bundle:check` green; `npm run ci:fast` — see the implementation report.
- Live tree: `pr_number 290` → `DOC_STATUS=none`, `554` → `found` (task.176).

### Deferred Work

None.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-03
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.177.qa.3.review-pr-resolution-edge-cases.md](./task.177.qa.3.review-pr-resolution-edge-cases.md)
- **Gate File**: [task.177.gate.3.review-pr-resolution-edge-cases.yml](./task.177.gate.3.review-pr-resolution-edge-cases.yml)

### Test Coverage Summary
- **Tests Executed**: 247
- **Phases Verified**: 3/3
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No critical issues identified. Three QA cycles: gate 1 CONCERNS (3), gate 2 CONCERNS (2), gate 3 PASS. Four advisory items are carried as future recommendations; one of them (CR3-1, a `.env` value that is only a comment) predates this task.

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-10-02 | 1.0     | Initial draft — task.176 Deferred Work items 1–4         | create-task |
| 2026-10-03 | 1.1     | Review 1 (7/10 → 9/10): portable `.env` sed, corrected misread-branch example, docs guard as a fenced block, rung 2 reuses §0a with `pr_number` | review-task |
| 2026-10-03 |         | Status → ready-for-development | review-task |
| 2026-10-03 |         | Implemented — 4 files, 19 tests | develop |
| 2026-10-03 |         | QA gate CONCERNS (80/100) — 3 findings | qa-task |
| 2026-10-03 |         | QA gate CONCERNS (90/100) — 2 findings | qa-task |
| 2026-10-03 |         | QA gate PASS (100/100) — 0 findings | qa-task |
| 2026-10-03 |         | QA findings fixed — gate PASS (100/100), 2 iterations | qa-fix |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Parser — scheme-less URLs

- [x] Parser arm
- [x] Tests

### Phase 2: Skill prose

- [x] `.env`
- [x] Docs-less fallback
- [x] Rung 2 filter
- [x] Tests

### Phase 3: Bundle, CHANGELOG

- [x] Bundle check
- [x] CHANGELOG

---

## References

- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.review-pr-tracker-issue-input.md` § Deferred Work
- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.gate.4.review-pr-tracker-issue-input.yml` (CR4-1, CR4-2)
- `docs/tasks/task.176.review-pr-tracker-issue-input/task.176.pr-review.1.review-pr-tracker-issue-input.md` (CR-1, CR-2)

---

## Notes

- QA artifacts will be co-located here: `task.177.qa.{N}.*.md`, `task.177.gate.{N}.*.yml`, bug reports
  `task.177.bug.{N}.*.md`.
