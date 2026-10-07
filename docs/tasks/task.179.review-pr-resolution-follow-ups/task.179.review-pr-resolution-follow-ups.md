---
id: task.179
title: "/review-pr resolution follow-ups"
type: task
description: "Close the six low-severity follow-ups task.177's QA and PR review recorded: one host reading for both parser arms, prose that describes the known-host scheme-less rule, a comment-only .env value, stale test comments, §0a's KEY_FIELD contract, and a mis-titled docs-guard test."
tags: [review-pr, input-resolution, follow-up]
category: refactoring
status: planned
priority: Low
created: 2026-10-03
updated: 2026-10-03
assignee:
estimated_effort_hours: 4
github_issue: 558
---

# Technical Task: /review-pr resolution follow-ups

**Status:** Planned
**GitHub Issue**: [#558](https://github.com/Gamaroff/agent-skills/issues/558)

---

## 1. Overview

Task.177 shipped four `/review-pr` resolution fixes and left six low-severity follow-ups in its
records (`task.177.pr-review.1` CR-1 and CR-2, `task.177.gate.3` CR3-1 to CR3-4, the DoD docs
advisory). This task closes all six. One is a real parser defect; the rest are prose, comments and a
test title that describe rules the code no longer has, plus one pre-existing `.env` edge.

**Scope**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/SKILL.md`,
`skills/review-pr/tests/review-pr.test.js`, the shared step-0 document's §0a contract
(`shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`, rebundled), and `CHANGELOG.md`.

---

## 2. Motivation

### Current Problems

1. **Two host readings disagree (CR-1).** The scheme-less arm matches the known-host list against the
   raw first segment (`_host=$(printf '%s' "${TARGET%%/*}" | …)`, `parse-target.sh:182`), while the
   URL arm derives `HOST` after stripping `?…`, `#…` and `…@` (`HOSTPORT` lines,
   `parse-target.sh:196-200`). So `ghe.corp#.atlassian.net/o/r/pull/7` passes the `?*.atlassian.net`
   check, gets `https://`, and parses as `kind=pr pr=7 host=ghe.corp`. A self-hosted target is
   parsed even though the rule says it must keep its scheme (measured under bash and zsh, 2026-10-03).
2. **The prose describes a rule the code no longer has (CR-2, DoD docs advisory).** The parser header
   says "a URL never falls through to the branch arm" (`parse-target.sh:31`), and SKILL.md Step 0b
   repeats it (`SKILL.md:105`). Under task.177's known-host rule, a scheme-less self-hosted URL is a
   branch. The KIND table's `branch` row says "anything else that is not a URL" (`SKILL.md:204`), and
   the `target` argument row (`SKILL.md:40`) does not say a platform URL may omit `https://`.
3. **A comment-only `.env` value warns falsely (CR3-1, pre-existing).** `JIRA_URL= # prod` yields
   `# prod`. The comment strip `s/[[:space:]]+#.*$//` (`SKILL.md:144`) needs whitespace before `#`,
   and the extracting sed (`SKILL.md:141`) has already removed it. The run then warns "differs from
   JIRA_URL # prod" instead of "JIRA_URL is not set". Base produced the same output.
4. **Test comments cite removed rules (CR3-2).** `review-pr.test.js:880` ("no dotted FIRST segment
   before a marker"), `:886` ("the inner guard") and `:891-892` ("last label is not two or more
   letters") describe task.177's cycle-1 rules, which cycle 2 dropped.
5. **§0a's contract lists two KEY_FIELD values; it has three callers' worth (CR3-3).** The comment
   `# KEY_FIELD: jira_key | github_issue.` (`develop-pipeline-step-0-resolve-and-prepare.md:106`), the
   `:?` message `bind KEY_FIELD (jira_key or github_issue)` (`:116`) and the intro "from a tracker
   key" (`:102`) omit `pr_number`, which `/review-pr` Step 2 rung 2 now passes (`SKILL.md:431`).
6. **A test title promises more than it checks (CR3-4).** "docs guard (…): with docs/ present it
   hands over to §0a" (`review-pr.test.js:2242`) asserts only the guard's output; nothing runs §0a.

### Benefits

1. One host reading for both parser arms, so the scheme-less rule cannot be bypassed by a character
   the URL arm strips.
2. A reader of SKILL.md learns which targets parse without a scheme.
3. A comment-only `.env` line reads as unset, the way a shell reads it.
4. Test comments and titles say what the tests check.

---

## 3. Technical Background

### Current Architecture

- **Parser** — `parse_target()` re-parses a scheme-less target (`case "$TARGET" in *://*) ;; ?*/*)`,
  `parse-target.sh:179-187`) when `_host` (`:182`), with its port stripped (`case "${_host%%:*}"`,
  `:183`), is a known platform host. The URL arm builds `HOSTPORT` / `HOST` separately (`:196-200`).
  There is no shared host function: these are two readings of one concept.
- **Step 0b `.env` read** — `SKILL.md:141-144`: the extracting sed strips `export`, `JIRA_URL=` and
  the space after it; the value sed takes the first quote pair (`-e t`), else strips
  `[[:space:]]+#.*$` and trailing space.
- **§0a lookup** — `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` § Key → document
  lookup. Its grep is generic in the field (`^${KEY_FIELD}:`), so `pr_number` already works; only the
  contract text is narrower than its use.

### Target Architecture

- **One host reading.** A `host_of` function in `parse-target.sh` returns the lowercased host of a
  host-and-rest string, with `?…`, `#…`, `…@` and `:port` stripped, exactly as the URL arm does
  today. Both arms call it. The scheme-less arm re-parses only when `host_of` of the first segment is
  a known platform host. The first segment is still the only one read, so
  `feature/foo.atlassian.net/x` stays a branch.
- **Prose** — the parser header, the Step 0b comment, the KIND table and the `target` row say: a URL
  with a scheme, or a scheme-less URL whose first segment is a known platform host, never falls
  through to the branch arm. A scheme-less self-hosted URL is a branch.
- **`.env`** — the comment strip becomes `(^|[[:space:]]+)#.*$`, so a value that is only a comment
  reads as empty and takes the "not set" branch. `https://a.net#frag` (no space before `#`) keeps its
  fragment.
- **§0a contract** — the comment, the `:?` message and the intro name `pr_number` beside `jira_key`
  and `github_issue`. Behaviour is unchanged.

### Important Clarifications

- `user@` in a scheme-less first segment: after `host_of`, `x@github.com/o/r/pull/1` reads host
  `github.com` and parses as PR 1, the same as `https://x@github.com/o/r/pull/1`.
  `github.com:1@evil.com/…` reads host `evil.com`, which is not a known host, so it stays a branch.
  Before this task it was re-parsed and reported `host=evil.com` for Step 0b's check (DoD probe
  `task.177.dod.security.run.json`). Both outcomes are safe; the new one follows from the single
  reading.
- **Task.178** adds citations of §0a in `review-task` and `review-story` and does not edit §0a's
  text. The two tasks are independent; whichever lands second re-runs `npm run bundle`.

---

## 4. Scope

### In Scope

✅ `host_of` in `parse-target.sh`, used by both arms (CR-1).
✅ Parser header, Step 0b comment, KIND table, `target` row (CR-2, DoD docs advisory).
✅ The `.env` comment-only value (CR3-1).
✅ Test comments at `review-pr.test.js:880`, `:886`, `:891-892` (CR3-2) and the docs-guard test title (CR3-4).
✅ §0a's KEY_FIELD contract text (CR3-3), rebundled.
✅ Tests for each behaviour change, under bash and zsh; CHANGELOG.

### Out of Scope

❌ Re-parsing scheme-less self-hosted URLs — task.177 dropped that rule deliberately.
❌ `review-task` / `review-story` lookups — task.178.
❌ The resolver's own `.env` parse (`shared/resources/resolve-platform.sh`) — it only asks whether a value is set.

---

## 5. Breaking Changes

None — API stable. Two targets change outcome, both from "parse as a URL" to "stay a branch":
`ghe.corp#.atlassian.net/…` (the CR-1 bypass) and a scheme-less first segment with `user@` before a
non-platform host (`github.com:1@evil.com/…`). Neither was a supported form. A `.env` line whose
`JIRA_URL` value is only a comment now reads as unset, as a shell reads it.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.179.plan.review-pr-resolution-follow-ups.md](task.179.plan.review-pr-resolution-follow-ups.md)

### Phase 1: Parser — one host reading

**Risk Level**: Low

**Files**: `skills/review-pr/scripts/parse-target.sh`, `skills/review-pr/tests/review-pr.test.js`

- [ ] Add `host_of`; call it from the URL arm and the scheme-less arm.
- [ ] Parser cases (bash, zsh): `ghe.corp#.atlassian.net/o/r/pull/7`, `ghe.corp?.atlassian.net/browse/AB-1` and `github.com:1@evil.com/o/r/pull/3` stay branches; `x@github.com/o/r/pull/1` parses as PR 1; every task.177 case still passes.
- [ ] Rewrite the parser header line (`:31`).

**Dependencies**: none.

### Phase 2: Skill prose and `.env`

**Risk Level**: Low

**Files**: `skills/review-pr/SKILL.md`, `skills/review-pr/tests/review-pr.test.js`

- [ ] Step 0b comment (`:105`), KIND table `branch` row (`:204`), `target` row (`:40`).
- [ ] `.env` comment strip `(^|[[:space:]]+)#.*$`.
- [ ] Step 0b test: `JIRA_URL= # prod` → "JIRA_URL is not set" warning, never "differs"; `https://a.net#frag` keeps its fragment.
- [ ] Test comments `:880`, `:886`, `:891-892`; rename the docs-guard test (`:2242`) to what it checks.

**Dependencies**: Phase 1 (shared test file).

### Phase 3: §0a contract, bundle, CHANGELOG

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` (and its bundled copies), `CHANGELOG.md`

- [ ] §0a comment, `:?` message and intro name `pr_number`.
- [ ] `npm run bundle`; `npm run bundle:check` green.
- [ ] CHANGELOG `[Unreleased]` › Fixed entry citing (task 179).

**Dependencies**: none (can run in parallel with Phases 1–2).

---

## 7. Files Summary

### Files to Modify (Core Implementation)

- `skills/review-pr/scripts/parse-target.sh` — `host_of`; header line.
- `skills/review-pr/SKILL.md` — Step 0b comment and `.env` strip; KIND table; `target` row.
- `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md` — §0a KEY_FIELD contract text.

### Files to Modify (Tests)

- `skills/review-pr/tests/review-pr.test.js`

### Files to Modify (Generated)

- Every bundled copy of `develop-pipeline-step-0-resolve-and-prepare.md` (`npm run bundle`).

### Files to Modify (Documentation)

- `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- Parser cases under bash and zsh for each new shape in Phase 1, plus every existing case.
- The `shell-fn:` probe gains the CR-1 bypass shapes as hostile cases; its verdict stays `engages`.

### Integration Tests

- The Step 0b block, run as delivered in a consumer-shaped repo, with a comment-only `.env` value.
- **Mutation check**: revert each fix and confirm its named test goes red.

### Performance Tests

None.

### Consumer Tests

None beyond the suite.

---

## 9. Success Criteria

### Functional

- [ ] `ghe.corp#.atlassian.net/o/r/pull/7` and `ghe.corp?.atlassian.net/browse/AB-1` parse as `kind=branch` (Phase 1 parser cases, bash and zsh).
- [ ] Both parser arms read the host through `host_of`; no second host expression remains in `parse-target.sh`.
- [ ] `JIRA_URL= # prod` in `.env` produces the "JIRA_URL is not set" warning, never "differs" (executed Step 0b test, bash and zsh).
- [ ] SKILL.md's `target` row and KIND table state that a platform URL may omit `https://` and a self-hosted one may not.

### Performance

- [ ] No extra network call for any target (the existing gating pin holds).

### Code Quality

- [ ] `review-pr.test.js` green; the mutation check reds each named case.
- [ ] `shellcheck --severity=warning skills/review-pr/scripts/parse-target.sh` clean; `npm run validate -- skills/review-pr/`, `npm run bundle:check` and the full suite green.

### Migration

- [ ] None — no consumer action beyond `setup-consumer.sh --update`.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

None.

### Low Risk Areas

- **`host_of` changes what the URL arm reads.** Mitigation: it is lifted verbatim from the `HOSTPORT`
  lines, and every existing URL case in the suite must still pass.
- **The `.env` strip matches a value that starts with `#`.** Mitigation: a shell reads it as a
  comment too; covered by the new test.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a previously working `target` stops resolving.

**Steps**: revert the merge commit; `npm test` and `npm run bundle:check` green.

### Partial Rollback (1-2 hours)

**When to Use**: `host_of` misreads a URL form. **Steps**: revert Phase 1 only.

### Forward Fix (< 4 hours)

**When to Use**: prose or comment wording.

### Rollback Triggers

**Critical**: a branch target resolving as a URL, or a supported URL resolving as a branch.
**Non-critical**: wording.

---

<!-- change-log-start -->

## Change Log

| Date       | Version | Description                                              | Author      |
| ---------- | ------- | -------------------------------------------------------- | ----------- |
| 2026-10-03 | 1.0     | Initial draft — task.177 follow-ups CR-1, CR-2, CR3-1 to CR3-4 | create-task |

<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Parser — one host reading

- [ ] `host_of`
- [ ] Tests

### Phase 2: Skill prose and `.env`

- [ ] Prose
- [ ] `.env`
- [ ] Tests and test comments

### Phase 3: §0a contract, bundle, CHANGELOG

- [ ] §0a
- [ ] Bundle
- [ ] CHANGELOG

---

## References

- `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.pr-review.1.review-pr-resolution-edge-cases.md` (CR-1, CR-2)
- `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.gate.3.review-pr-resolution-edge-cases.yml` (CR3-1 to CR3-4)
- `docs/tasks/task.177.review-pr-resolution-edge-cases/task.177.dod.1.review-pr-resolution-edge-cases.md` (docs advisory)

---

## Notes

- QA artifacts will be co-located here: `task.179.qa.{N}.*.md`, `task.179.gate.{N}.*.yml`, bug reports
  `task.179.bug.{N}.*.md`.
