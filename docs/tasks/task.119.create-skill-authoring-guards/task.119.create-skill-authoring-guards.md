---
id: task.119
title: "[Task 119] Four authoring rules the corpus already obeys by accident: positional tokens in fenced bash, hardcoded shell matrices, comment paths the bundler follows, and how many task docs a change is"
type: task
description: "The harness substitutes $0–$9 inside a SKILL.md's fenced bash when the skill is invoked with an argument — the delivered copy is corrupted while every test reads the file from disk; 12 files carry such tokens (#23). A hand-written const SHELLS = ['bash','zsh'] passed every local gate and failed CI, while zshAvailable() already existed (#36). bundle_skill.py follows shared/resources paths inside .js comments, so moving four commented constants added +16,000 lines of bundle churn (#39). And create-task decides whether to write a task doc but never how many; three authors hand-wrote the same splitting rule into the registry (#24). One task: a guard test for the first, and the rules for all four where authors read."
tags: [create-skill, create-task, authoring, bundling, testing]
category: documentation
status: accepted
priority: Medium
risk_level: low
created: 2026-09-12
updated: 2026-09-17
assignee:
estimated_effort_hours: 5
github_issue: 419
completed_date: 2026-09-17
pr_number: 420
---

# Technical Task: Four authoring rules the corpus already obeys by accident: positional tokens in fenced bash, hardcoded shell matrices, comment paths the bundler follows, and how many task docs a change is

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.119.review.1.create-skill-authoring-guards.md` implemented 2026-09-17
**GitHub Issue**: [#419](https://github.com/Gamaroff/agent-skills/issues/419)
**PR**: [#420](https://github.com/Gamaroff/agent-skills/pull/420)

---

## 1. Overview

Four observations about writing skills, each a rule that exists nowhere and was learned by a
failure that every gate passed. Three belong in `create-skill`; one in `create-task`. One of them
also needs a test, because it cannot be seen from disk.

## 2. Motivation

### Current Problems

1. **Fenced bash is a template, not source.** `/qa-task <path>` rendered
   `match($0, /^[[:space:]]*/)` as `match(docs/tasks/task.82…md, …)` — eight substitutions in one
   awk program, silent failure; the warning comment written to prevent it contained `$0` and was
   corrupted too. Tests over the source cannot see it. 12 shipped files carry `$0`–`$9` in runnable
   blocks (#23).
2. **Shell matrices get hand-written.** `const SHELLS = ["bash", "zsh"]` — three QA cycles, 5c and
   four `ci:fast` runs green; CI red on four `[zsh]` cases. `qa-execute-snippets.mjs` exports
   `zshAvailable()` for exactly this (#36).
3. **The bundler cannot tell code from comment.** Four `// see shared/resources/…` comments moved
   into `jira-sync.js` (bundled into 21 skills) pulled a 646-line test and a 172-line doc into twenty
   skills that use neither; the bundler reported ✅ (#39).
4. **`create-task` never asks "one or several?"** The decision tree ends at "use this skill"; the
   registry carries three hand-written dependency-ordering notes (tasks 51–58, 62–64, 93–95) because
   the seam was re-derived each time (#24).

### Benefits

1. Delivery-time corruption becomes an authoring-time test failure.
2. Environment facts are inherited from the probe that exists.
3. Bundle churn from comments is named before commit.
4. Multi-document decompositions follow the house pattern instead of the session's mood.

## 3. Technical Background

- `skills/create-skill/SKILL.md` — §Signal Design Principle (the pattern for a rule with its
  failure), bundling section; `skills/create-skill/scripts/bundle_skill.py` `SHARED_REF_RE` (matches
  anywhere in a file — code, string or comment alike). Bundler tests are JavaScript under
  `tests/bundle-*.test.js`, driving the Python script through `child_process`; the new test follows
  that shape.
- `shared/resources/qa-execute-snippets.mjs` `zshAvailable()`; `qa-task` Step 4b (executes
  snippets **from disk** — cannot see #23's class; say so). The hardcoded `SHELLS` matrix from #36
  has **already been replaced** in the fast-gate test — it now derives from `zshAvailable()`. Only
  the authoring rule is outstanding; do not hunt for the matrix.
- **Two premises about the harness are unverified and decide the guard's definition.** #23 observed
  substitution in the *invoked* `SKILL.md`. Whether a bundled `references/*.md` loaded via Read is
  ever substituted is asserted nowhere; whether a backslash escape (`\$0`) survives rendering is
  asserted nowhere. Phase 0 settles both empirically before the test is written, because a guard
  scoped on a guess opens with an allowlist of false positives, and an allowlist nobody believes is
  a guard nobody reads.
- `skills/create-task/SKILL.md` §1 → §1.5; `resources/sections-guide.md` L≈1023 (splits phases,
  not documents).
- `docs/architecture/concepts/coding-standards.md` §Cross-skill resources.

## 4. Scope

### In Scope

✅ Phase 0: two scratch-skill probes that settle (a) whether a Read-loaded reference is substituted and (b) whether `\$0` survives rendering; both results recorded in the guard test's header comment
✅ `tests/fenced-bash-positional-params.test.js` (new): scan fenced blocks whose info string is `bash`, `sh` or `shell` for `$0`–`$9`; **scope fixed by Phase 0** — `skills/*/SKILL.md` only if references are not rendered, `skills/*/SKILL.md` + `shared/resources/*.md` if they are (never the generated `skills/*/references/` copies); the escape lookbehind kept only if Phase 0 (b) shows the escape survives; allowlist by path+line with reason; floor ≥ 50 blocks; the test records the hit count at authoring time — the document does not carry a number that decays
✅ create-skill rules (three paragraphs, each with its failure and the alternative)
✅ `bundle_skill.py`: warn when a followed reference originates from a comment-only line in `.js`/`.mjs`, **and** `tests/bundle-comment-origin.test.js` (new) asserts the live tree has zero comment-only origins (allowlist with reason, shape of `tests/mutation-call-site-coverage.test.js`); a warning alone has no reader in CI
✅ create-task "One task or several?" step
✅ Reduce the hit files' token uses where an implicit form exists; allowlist the rest with a note

### Out of Scope

❌ Changing the harness's substitution · ❌ rewriting `sections-guide.md`

## 5. Breaking Changes

None. The new test may fail on first run until every hit file is fixed or allowlisted — do that in
the same PR.

## 6. Implementation Plan

0. **Verify the harness premises.** Two scratch skills under a throwaway directory, each invoked with
   an argument: one whose `SKILL.md` instructs the agent to Read a sibling `references/probe.md`
   containing `$0`–`$2` in a fenced block (is the *reference* substituted?); one whose `SKILL.md`
   carries `\$0` in a fenced block (does the *escape* survive?). Record both answers, with the date
   and the harness version, in the guard test's header comment. Fix the scope and the regex from them.
1. Test first (scope and regex from Phase 0); the test records the hit count; fix or allowlist each
   hit, running every edited block before and after (Testing Strategy).
2. create-skill: three rules; qa-task 4b limit sentence. The `awk '{print $2}'` alternative must be
   one that is actually equivalent — `cut -f2` is tab-delimited and is not; `$(2)` is awk-native and
   carries no `$[0-9]` token — verify the chosen form in Phase 0's scratch skill before shipping it as
   the rule.
3. Bundler warning + `tests/bundle-comment-origin.test.js` with a comment-only fixture and a live-tree
   assertion.
4. create-task step (§1.2, between §1 and §1.5); point at the three registry notes as the format.
5. Mutation: reintroduce one `$0` → the guard names the file; reintroduce one commented
   `shared/resources/` path → the bundler test names the line.
6. Close #23, #24, #36, #39: `observation-log.js set-status --id N --status actioned --resolution
   "task.119 (PR #…)"` once per observation — they are `parked`, and parked entries never archive on
   their own.

## 7. Files Summary

As implemented (2026-09-17). Bundled `skills/*/references/` copies regenerated by `npm run bundle` are
not listed — they are mechanical churn from the `defer-mutation.js` and `generate-prd-epic-index.mjs`
comment rewrites.

| File | Change |
| :--- | :--- |
| `tests/fenced-bash-positional-params.test.js` (new) | the guard — scope `skills/*/SKILL.md` (Phase 0 fixed it), regex `(?<!\\)\$[0-9]`, floor 50 blocks (485 scanned; fences tracked as a stack so nested template fences cannot hide a real block, and a fence-shaped line inside a runnable block is content — §5 asserts, per runnable opener in the live tree, that the content line after it was scanned), empty allowlist with reason-checking, Phase 0 findings in the header; `package.json` unchanged (`tests/*.test.js` already in the glob — verified) |
| `tests/bundle-comment-origin.test.js` (new) | fixture proves the bundler warning fires and that a `bundle-dependency:` line and a code reference do not; live-tree assertion over every JS/MJS the bundler reads; empty allowlist with reason-checking |
| `skills/create-skill/scripts/bundle_skill.py` | `comment_only_refs()` / `warn_comment_only_refs()` — `⚠️ comment-only reference: <file>:<line> → <target>` on a comment-only origin in a `.js`/`.mjs`; `// bundle-dependency: shared/resources/X` is the silent declaration form; self-references skipped |
| `skills/create-skill/SKILL.md` | new § *Three Rules the Corpus Learned by Failing* — runnable prose, shell matrices, comments as dependency declarations — each with its failure; written token-free because this file is rendered on invocation |
| `skills/create-skill/references/runnable-prose.md` (new) | the Phase 0 evidence table and the token-free equivalents, Read-loaded so the literal tokens are never rendered |
| `skills/qa-task/SKILL.md` Step 4b | "What a green Step 4b does not prove" — executes from disk, cannot see render-time corruption |
| `skills/create-task/SKILL.md` | new §1.2 *One Task or Several?* — the three-way splitting test, the three seams, the registry-note obligation, the by-file anti-pattern |
| 12 `SKILL.md` hit files (22 sites): `docker`, `ensure-{bug,epic,story,task}-github-issue`, `finalise`, `loop-supervisor`, `qa-story`, `qa-task`, `review-code`, `review-story`, `review-task` | `awk '{print $(2)}'` ×19, `${1}…${4}` script header, `$(dirname "${0}")`, `20 USD` — each verified equivalent under bash and zsh |
| `shared/resources/defer-mutation.js` | its two deliberate comment-path declarations become `bundle-dependency:` lines |
| `shared/resources/generate-prd-epic-index.mjs`, `shared/resources/tests/*.test.mjs` (9), `skills/{create-story,develop-batch,develop-next,jira-epic-creator,scaffold-tracker-workflow}/scripts/*`, `skills/review-security/tests/fixtures/redis-tls/engaged.mjs`, `skills/sync-jira-bug/tests/end-to-end.test.js` | comment paths → bare filenames (prose); bundle graph unchanged (`npm run bundle -- --check` clean, no references added or removed) |
| `docs/architecture/concepts/coding-standards.md` § Cross-skill resources | the comment-path rule and the declaration form |
| `skills/develop-next/references/document-status-lifecycle.md` (removed) | the rewritten `select-next.mjs` comment was its only discovery edge; nothing in develop-next reads it (QA cycle 2, CR-6) |
| `CHANGELOG.md` | Unreleased → Added entry |

## 8. Testing Strategy

- The guard with a floor (≥ 50 blocks scanned) and an allowlist whose every entry carries a reason.
- **Before/after execution of every edited block**: each shipped block that loses a `$` token is run
  with `qa-execute-snippets.mjs` before the edit and after, and the outputs compared — each edit is a
  behaviour change in runnable prose (Risk Assessment).
- **Mutation per rule** (plan step 5): reintroduce one `$0` → the guard names the file; reintroduce
  one commented `shared/resources/` path → the bundler test names the line. A fix that cannot be
  made to fail is unheld.
- `tests/bundle-comment-origin.test.js`: fixture with a comment-only reference → warning printed;
  live tree → zero comment-only origins.
- `npm run bundle` idempotent after the edits; suite green.

## 9. Success Criteria

1. The guard runs under `npm test` and CI, has a floor, and every allowlisted site carries a reason
2. create-skill states the three rules with their failure modes; qa-task 4b states its from-disk limit
3. `bundle_skill.py` warns on a comment-only origin, and `tests/bundle-comment-origin.test.js` asserts the live tree has none
4. create-task has the "One task or several?" step with the three seams and the dependency-note obligation
5. Observations #23, #24, #36, #39 close naming this PR

## 10. Risk Assessment

**Low.** Removing `$` tokens from shipped awk/shell needs care — each edit is a behaviour change in
runnable prose; verify each block by running it (Step 4b-style) before and after.

## 11. Rollback Plan

`git revert`; the guard can stay with a wider allowlist.

**Trigger to re-plan rather than roll back:** if Phase 0 shows references *are* substituted, the
`shared/resources` hits are real hazards and allowlist-and-note is the wrong fix for them — they
need rewriting, which raises the effort; stop and re-estimate before Phase 1.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-17 (cycle 3)
**Quality Score**: 100/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.119.qa.3.create-skill-authoring-guards.md](./task.119.qa.3.create-skill-authoring-guards.md) (earlier cycles: [qa.1](./task.119.qa.1.create-skill-authoring-guards.md), [qa.2](./task.119.qa.2.create-skill-authoring-guards.md))
- **Gate File**: [task.119.gate.3.create-skill-authoring-guards.yml](./task.119.gate.3.create-skill-authoring-guards.yml) (earlier: [gate.1](./task.119.gate.1.create-skill-authoring-guards.yml), [gate.2](./task.119.gate.2.create-skill-authoring-guards.yml))

### Test Coverage Summary
- **Tests Executed**: 3411 (3410 pass, 1 skipped)
- **Phases Verified**: 4/4 + close-out
- **Critical Issues**: 0
- **NFR Status**: Security: PASS (reasoned, boundary: false), Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
Three QA cycles. Cycle 1: CR-1 fence-state loss on nested template fences (fixed: stack reader). Cycle 2 (refute pass): CR-4 the parity test could not fail (fixed: line-level §5, mutation-proven against the original reader), CR-5 heredoc fence lines, CR-6 orphaned vendored copy. Cycle 3: no gating finding; advisory residue (§5 opener tokeniser divergence — latent; stale doc counts) recorded in the gate's `recommendations.future`.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Reports**: `task.119.qa.1` (CONCERNS 90) → `task.119.qa.2` (CONCERNS 90, refute pass) → `task.119.qa.3` (PASS 100)
**Gate File**: `task.119.gate.3.create-skill-authoring-guards.yml`
**Gate Status**: ✅ PASS
**Quality Score**: 100/100
**PR Review (5c)**: ✅ APPROVE — `task.119.pr-review.1.create-skill-authoring-guards.md`

All Definition of Done criteria have been verified:

✅ **Success Criteria:** All 5 met — guard under `npm test` with floor and reasoned allowlist; create-skill three rules + qa-task 4b limit; bundler warning + comment-origin guard; create-task §1.2; observations #23/#24/#36/#39 actioned naming PR #420
✅ **Tests:** `npm run ci:fast` 3410 pass / 0 fail / 1 skipped; both guards mutation-proven (four proofs in develop, five re-run by QA)
✅ **PR Review:** PR #420 — 8 commits, 3 QA cycles, 5c APPROVE; CI reading 1 SUCCESS @ `9dfc8586a295`
✅ **Documentation:** CHANGELOG (Unreleased → Added), create-skill/create-task/qa-task SKILL.md, `references/runnable-prose.md`, coding-standards § Cross-skill resources
✅ **Security Review:** ✅ PASS — no secrets, no unsafe patterns, no dependency changes; `boundary: false`
✅ **Compliance Review:** ⚠️ NOT_APPLICABLE — no data, payments, UI or healthcare surface

**Deployment Readiness:**

- Staging: ✅ APPROVED
- Production: ✅ APPROVED

**Task marked as ACCEPTED on:** 2026-09-17

**Detailed Verification Log:** See `task.119.dod.1.create-skill-authoring-guards.md` for complete verification evidence and timestamps.

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
  Deliberately UNNUMBERED — the 11 numbered sections above are the mandatory contract.
  Canonical spec: references/document-change-log.md
  Authoring/review/edit skills bump Version; machine writers leave it blank.
  EVERY new row bumps frontmatter `updated:` in the same edit.
-->

## Change Log

| Date       | Version | Description                                   | Author      |
| ---------- | ------- | --------------------------------------------- | ----------- |
| 2026-09-12 | 1.0     | Initial draft — filed from the 2026-09-12 observation review | create-task |
| 2026-09-17 | 1.1     | Review 1 (7/10, NEEDS REVISION → fixes applied): Phase 0 verifies the two harness premises and fixes the guard's scope and regex; bundler warning gains a guard test; verification and mutation folded into Testing Strategy; `cut -f2` qualified; GitHub issue #419 linked | review-task |
| 2026-09-17 |         | Status → ready-for-development | review-task |
| 2026-09-17 |         | Implemented — 38 files (+128 regenerated bundle copies), 9 tests; status → ready-for-review | develop |
| 2026-09-17 |         | QA gate CONCERNS (90/100) — 1 finding (CR-1 fence nesting), 2 cleanups | qa-task |
| 2026-09-17 |         | QA findings fixed — CR-1 stack-based fence tracking + §5 opener parity (485 blocks), CR-2 scope docstring/depth, CR-3 warning dedupe; 1 iteration | qa-fix |
| 2026-09-17 |         | QA gate CONCERNS (90/100), cycle 2 refute — CR-1/2/3 fixed; 1 new finding (CR-4 §5 tautology), 2 advisory | qa-task |
| 2026-09-17 |         | QA findings fixed — CR-4 §5 now line-level (mutation: original reader → red naming lines), CR-5 fence lines inside runnable blocks are content + heredoc fixture, CR-6 orphaned develop-next copy removed; 2 iterations | qa-fix |
| 2026-09-17 |         | QA gate PASS (100/100), cycle 3 — CR-4/5/6 verified fixed; 0 gating findings, 3 advisory | qa-task |
| 2026-09-17 | 1.2     | DoD passed — accepted (PR #420) | finalise |

---

## Progress Tracking

### Phase 0: verify the harness premises
- [x] Scratch skill A: is a Read-loaded `references/*.md` substituted? **No** — arrived verbatim (2026-09-17, Claude Code 2.1.274); scope fixed to `skills/*/SKILL.md`. Also found: substitution is zero-indexed and leaves tokens past the argument count literal. Recorded in the guard header
- [x] Scratch skill B: does `\$0` survive rendering? **Yes** (backslash consumed, token intact) — but the on-disk form is an awk syntax error, so the lookbehind is kept and the escape is confined to double-quoted bash strings; `${N}` / `$(N)` / `${BASH_SOURCE[0]}` verified unsubstituted and runnable
### Phase 1: the guard
- [x] Test scans fenced `bash`/`sh`/`shell` blocks for `$0`–`$9` over the scope Phase 0 fixed; allowlist with reasons; floor ≥ 50; the test records the hit count at authoring time (22 hits / 12 files / 485 blocks; all rewritten; mutation: one `$2` reintroduced → red naming `qa-task/SKILL.md:161`)
### Phase 2: the rules in create-skill
- [x] Runnable prose: no positional-parameter tokens; the implicit-form alternatives; qa-task Step 4b's from-disk limit stated
- [x] Shell matrices derive from `zshAvailable()`; `bash` unconditional; `zsh-unavailable` note
- [x] In a `.js` under `shared/resources/`, a `shared/resources/` path in a comment is a dependency declaration — refer to siblings by bare filename; bundler warns on comment-only origins; `tests/bundle-comment-origin.test.js` asserts the live tree has none (12 live hits: 9 → bare filename, 2 → `bundle-dependency:` declarations, 1 self-reference excluded by rule; mutation: one path reintroduced → red naming `generate-prd-epic-index.mjs:76`)
- [x] `docs/architecture/concepts/coding-standards.md` §Cross-skill resources carries the comment-path rule; `CHANGELOG.md` entry
### Phase 3: create-task
- [x] "One task or several?" step (§1.2): the three-way splitting test, the three named seams, the dependency-note obligation, the by-file anti-pattern
### Close-out
- [x] Observations #23, #24, #36, #39 set to `actioned` with resolution naming PR #420 (2026-09-17)

---

## References

- **Plan**: [`task.119.plan.create-skill-authoring-guards.md`](task.119.plan.create-skill-authoring-guards.md)
- **Sweep of origin**: `.agents/handoff.md` (2026-09-12 refresh) — the findings this task was filed from
- **Observations**: #23, #24, #36, #39
- **Related Skill**: `.agents/skills/create-skill/` (SKILL.md, `scripts/bundle_skill.py`), `.agents/skills/create-task/`
- **Evidence for the seams**: `docs/tasks/task-registry.md` notes on tasks 51–58, 62–64, 93–95

---

**Status:** Accepted

**Next Steps**:
1. `/develop-task docs/tasks/task.119.create-skill-authoring-guards/task.119.create-skill-authoring-guards.md`
2. QA will create the co-located QA report, gate and (if needed) bug reports
