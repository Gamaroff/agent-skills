---
id: task.186
title: "Eval harness hardening and task.185 leftovers"
type: task
description: "Close the advisory findings task.185 carried forward: make the eval runner and repeat.mjs never score a non-verdict as a verdict, finish the fake gh's fail-closed rule, fix pr-inline-comment.js sending a review-comment listing as a POST, and stop four skills numbering their reports by counting."
tags: [evals, harness, fake-gh, review-pr, follow-up]
category: testing
status: accepted
completed_date: 2026-10-06
pr_number: 576
priority: Medium
created: 2026-10-06
updated: 2026-10-06
assignee:
estimated_effort_hours: 16
github_issue: 575
---

# Technical Task: Eval harness hardening and task.185 leftovers

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.186.review.1.eval-harness-hardening-and-leftovers.md` implemented 2026-10-06

**GitHub Issue**: [#575](https://github.com/Gamaroff/agent-skills/issues/575)

---

## 1. Overview

task.185 (PR #574, merged `bc177cb9`) shipped the `/review-pr` eval suite and closed every
blocking finding. Its gates, three `/review-pr` 5c reviews and three `/finalise` DoD runs recorded
a set of advisory findings and one real defect outside the harness. This task closes them. The
groups are four independent units, delivered as phases.

**Scope**:

- **A.** The eval runner and `repeat.mjs` never score a non-verdict as a verdict.
- **B.** The fake `gh`'s remaining gaps.
- **C.** `pr-inline-comment.js` lists PR review comments as a POST; it must use GET.
- **D.** Five skills number their co-located reports by counting instead of highest + 1.

**Key deliverables**: a runner whose pass and fail codes are verdicts only; a fake `gh` whose
refusals say why; a GET-only inline-comment listing; one shared next-number helper for every
skill that numbers co-located reports.

---

## 2. Motivation

### Current Problems

1. **A run that never judged can count as a pass or a fail.** `repeat.mjs` reads runner exit 0 as
   a pass and `EVAL_FAIL_EXIT` (5) as a failed run. A setup hook or driver promise that never
   settles leaves Node with an empty event loop, and it exits 0 without reaching the assertions
   (`evals/shared/runner.mjs:416` `main().catch(...)`). An unknown assertion name is turned into a
   failed result (`runner.mjs:181–182`, `unknown assertion fn: …`), so a typo in `liveAssertions`
   shows up as paid live runs that look like agent failures. task.185 cycles 1–3 closed three
   members of this class; these are the rest.
2. **The opt-in exit codes collide with Node's.** `repeat.mjs:44–46` uses 3, 4 and 5. Node exits
   with 5 itself on a fatal V8 error, so a crashed runner can read as a failed run.
3. **The fake `gh` still has small gaps.** `--version` is answered whenever it is `argv[0]`,
   whatever follows (`evals/shared/lib/fake-gh.mjs:298`). A refusal carries no reason, so a failed
   "never posts" assertion cannot tell a write from an unmodelled read. `-R`/`--repo` is allowed on
   `api` (`fake-gh.mjs:101–102`), though real `gh api` rejects it. `pick()` (`fake-gh.mjs:220`)
   drops requested `--json` fields the fixture lacks. Fixture lookup by `table[key]`
   (`fake-gh.mjs:345`) reads prototype keys (`pr diff constructor`).
4. **`pr-inline-comment.js` lists review comments with POST.** `shared/resources/pr-inline-comment.js:455–462`
   calls `gh api --paginate --slurp -f per_page=100 /repos/{slug}/pulls/{pr}/comments`. In
   `gh` 2.94, `gh api --help` says: "The default HTTP request method is `GET` normally and `POST`
   if any parameters" are added. So the listing that finds existing inline comments is sent as a
   POST. `/review-pr --inline` and `/review-code` both bundle this file.
5. **Five skills number reports by counting.** The obs #272 fix covered only `/review-pr`.
   Count-style prose remains at `skills/qa-planning/SKILL.md:649`, `skills/review-bug/SKILL.md:121`,
   `skills/review-epic/SKILL.md:535`, `skills/review-task/SKILL.md:2130` and
   `skills/finalise/SKILL.md:162` (the last found by the review-task probe, 2026-10-06). A directory holding
   `.1.` and `.3.` gets a second `.3.` that overwrites the first.

### Benefits

- A live pass rate means what it says: every counted run was judged.
- A failed scenario names its cause: a write attempt, an unmodelled read, or a fixture gap.
- `/review-pr --inline` and `/review-code` stop sending a POST where they mean to read.
- One numbering rule for every co-located report, defined once.

---

## 3. Technical Background

### Current Architecture

- **Runner exit contract** (`evals/shared/README.md` § Repeat runner): runner 0 = pass,
  `EVAL_FAIL_EXIT` = assertions ran and failed, and every other status = could not run.
  `repeat.mjs` sets `EVAL_SKIP_EXIT=3`, `EVAL_DRIVER_ERROR_EXIT=4` and `EVAL_FAIL_EXIT=5` in the
  child env (`repeat.mjs:44–46`, `127–132`). The runner's final line is
  `process.exit(agg.ok ? 0 : optInExit("EVAL_FAIL_EXIT", 1))` (`runner.mjs:413`).
- **Assertion dispatch**: `runAssertions` (`runner.mjs:113`) has a `default:` arm that records
  `unknown assertion fn` as a failed result (`runner.mjs:181–182`).
- **Driver error text**: `claude-cli.mjs:100` throws `claude-cli exited ${res.status}: …`. The
  timeout is `Number(process.env.EVAL_TIMEOUT_MS) || 5 * 60 * 1000` (`claude-cli.mjs:94`).
- **Fake `gh`**: `parseArgs`, `servedShape` and `runFakeGh` in `evals/shared/lib/fake-gh.mjs`.
  `API_READ_FLAGS` (from line 82) includes `-R`/`--repo`. A missing `jq` returns
  `{ ok: false, unhandled: "jq not available for -q/--jq" }` (`fake-gh.mjs:237`), which the
  scenario scores as a failure.
- **Report numbering**: `skills/review-pr/scripts/next-report-number.sh` prints the highest
  `.pr-review.{n}.` + 1 at depth 1, in base 10, refusing a non-directory or an `{n}` over 18 digits.
  It is specific to `.pr-review.`.
- **Existing numbered-series helper** (second-mechanism check): `shared/resources/newest-numbered.sh`
  is "the ONE definition of 'the newest artefact of a numbered series'". It returns the newest
  *path*, by number, for `dod`, `implementation` and similar series. The next-number helper in
  Phase 4 must **extend or reuse** it rather than add a third numbering rule. The plan decides
  which, and says so.

### Target Architecture

- The runner exits 0 **only** from the post-assertion line. Everything before it defaults to a
  non-verdict status, and unknown assertion names are refused before any driver runs.
- The set of known assertion names lives in a module that both `runner.mjs` and `repeat.mjs`
  import (e.g. exported from `evals/shared/assertions.mjs`), and the dispatcher reads the same set.
  It cannot live in `runner.mjs`: that file calls `main()` on load (`runner.mjs:416`), so importing
  it would start a run.
- The opt-in codes move to a range Node and the shell do not use (64–113), and `repeat.mjs` and
  the README change together.
- Fake `gh` refusals carry `refusal: "write" | "not-a-served-read"`. `--version` is answered only
  as a one-element argv. `-R`/`--repo` leave `API_READ_FLAGS`. `pick()` reports a missing
  requested field as `unhandled`. Fixture lookup uses own keys only.
- `pr-inline-comment.js` passes `-X GET` with its `-f` parameters.
- One shared next-number helper in `shared/resources/`, called by `/review-pr`, `qa-planning`,
  `review-bug`, `review-epic`, `review-task` and `finalise`, bundled into each skill.

---

## 4. Scope

**In Scope:**

- ✅ `evals/shared/runner.mjs`, `repeat.mjs`, `drivers/claude-cli.mjs`, `lib/fake-gh.mjs`, their tests, and `evals/shared/README.md`
- ✅ `shared/resources/pr-inline-comment.js` and its test; the bundled copies via `npm run bundle`
- ✅ A shared next-number helper. Step-prose changes in the five skills plus `/review-pr` Step 7.

**Out of Scope:**

- ❌ review-pr eval scenarios 5–7 (their own follow-up, named in task.185)
- ❌ Any change to how `/review-pr` reviews: this task touches its numbering call only
- ❌ Numbering sites that are not count-style (review-task probe, 2026-10-06): `create-bug-report`,
  `review-prd` and the implementation report already use highest + 1; `code-smell-validator`
  numbers by date, not a co-located series; `qa-story/SKILL.md:494` numbers from the prior QA
  cycle inside the QA loop

---

## 5. Breaking Changes

1. **Runner opt-in exit codes change (A3).** A caller that sets `EVAL_SKIP_EXIT`,
   `EVAL_DRIVER_ERROR_EXIT` or `EVAL_FAIL_EXIT` itself keeps working, because the runner honours any
   value from 3 to 125. Only `repeat.mjs`'s defaults move. Migration: none for callers. The README
   table changes in the same commit.
2. **Fake `gh` log entries gain a `refusal` field (B).** Scenario assertions match `"refused":true`
   with a substring check, and the extra field does not change that match. Migration: none.

No other breaking changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.186.plan.eval-harness-hardening-and-leftovers.md](task.186.plan.eval-harness-hardening-and-leftovers.md)

### Phase 1: Runner and repeat verdicts (A) — Risk: Medium

- [x] The runner sets a non-verdict `process.exitCode` at the top of `main()`, so only the post-assertion line can exit 0 (A1)
- [x] Validate every `assertions` / `liveAssertions` `fn` against the known set before the driver runs; refuse with a non-verdict status (A2). The set lives in a module both files import, and `repeat.mjs` checks it in its pre-run validation loop as a usage error (exit 2)
- [x] Move `repeat.mjs`'s opt-in codes to 64–113 and update the README exit table (A3)
- [x] `repeat.mjs` refuses a scenario with no assertions as a usage error (A4)
- [x] A missing `jq` becomes could-not-run, not a failed run (A5)
- [x] `claude-cli.mjs` adds `res.error?.code` and `res.signal` to the error when `status` is null (A6)

### Phase 2: Fake gh residue (B) — Risk: Low

- [x] `refusal: "write" | "not-a-served-read"` on every refused entry
- [x] `--version` / `version` answered only when argv has one element
- [x] Drop `-R`/`--repo` from `API_READ_FLAGS`
- [x] `pick()` reports requested fields the fixture lacks as `unhandled`
- [x] Fixture lookup by own keys only (`Object.hasOwn`)
- [x] The unhandled test asserts a log line exists (C8-CR-3)

### Phase 3: Inline comments read with GET (C) — Risk: Low

- [x] Add `-X GET` to the `pr-inline-comment.js` comment listing; a test asserts the argv carries `-X GET` whenever it carries `-f`
- [x] `npm run bundle`; the bundled copies in `review-pr` and `review-code` match

### Phase 4: One next-number rule (D) — Risk: Medium

- [x] Decide: extend `newest-numbered.sh` with a next-number mode, or generalise `next-report-number.sh` into `shared/resources/` with a `<kind>` argument; record the decision — **Option 1**: `next_numbered` beside `newest_numbered`, `next-report-number.sh` removed (implementation report, Decisions Log)
- [x] Point `/review-pr` Step 7, `qa-planning` (`risk`, `test-design`), `review-bug`, `review-epic`, `review-task` and `finalise` (`dod`) at it
- [x] Tests run each skill's own call line under bash and zsh (the `review-pr.test.js` `step7CallLine` pattern)

---

## 7. Files Summary

**Core:**

1. ✅ `evals/shared/runner.mjs`
2. ✅ `evals/shared/repeat.mjs`
3. ✅ `evals/shared/drivers/claude-cli.mjs`
4. ✅ `evals/shared/lib/fake-gh.mjs`
5. ✅ `shared/resources/pr-inline-comment.js`
6. ✅ `shared/resources/newest-numbered.sh` — `next_numbered` added (Phase 4 chose Option 1)
6a. ✅ `evals/shared/lib/assertion-dispatch.mjs` (new) — the one table of assertion names, imported by `runner.mjs` and `repeat.mjs`
6c. ✅ `evals/shared/lib/driver-name.mjs` (new, QA cycle 2 C2-CR-1) — `driverNameFrom`, the one driver resolution; import-free so the `gh` launcher stays light
6b. ❌ `skills/review-pr/scripts/next-report-number.sh` — removed; `/review-pr` Step 7 uses `next_numbered`
7. ✅ `skills/review-pr/SKILL.md`, `skills/qa-planning/SKILL.md`, `skills/review-bug/SKILL.md`, `skills/review-epic/SKILL.md`, `skills/review-task/SKILL.md`, `skills/finalise/SKILL.md`

**Tests:**

8. ✅ `evals/shared/tests/runner-setup.test.mjs`, `repeat.test.mjs`, `fake-gh.test.mjs`
9. ✅ `shared/resources/tests/pr-inline-comment.test.mjs`
10. ✅ `shared/resources/tests/next-numbered.test.mjs` (new) — the helper, and each of the six skills' own call line under bash and zsh; `skills/review-pr/tests/review-pr.test.js` — its script-specific numbering tests replaced by a Step 7 prose check

**Documentation:**

11. ✅ `evals/shared/README.md`, `CHANGELOG.md`

**Generated:**

12. ✅ `skills/*/references/` copies, via `npm run bundle`: `pr-inline-comment.js` in `review-pr` and `review-code`; `newest-numbered.sh` updated in `develop-story`, `develop-task`, `finalise`, and new in `qa-planning`, `review-bug`, `review-epic`, `review-pr`, `review-task`

---

## 8. Testing Strategy

- **Unit**: each phase's tests, mutation-proven (revert the behaviour; the named test goes red).
- **Regression**: `npm run ci:fast`, `npm run eval:all` (43 scenarios), `npm run bundle:check`.
- **Live**: one `eval:review-pr:cli --runs 1` pass after Phase 1, to show the runner change keeps
  live verdicts intact.
- **Boundary**: re-run the fake `gh` probe sets from task.185 (`qa.5`–`qa.8` list the forms) after
  Phase 2.

---

## 9. Success Criteria

**Functional:**

- [x] A scenario whose setup hook never settles makes `repeat.mjs` exit 3 (could not run), not 0 (Phase 1, A1)
- [x] A scenario with an unknown assertion `fn` makes `repeat.mjs` exit 2 (usage) before any run starts, and makes `runner.mjs` alone exit with a non-verdict status before the driver runs (Phase 1, A2)
- [x] `repeat.mjs` uses opt-in codes outside 0–5 and the README table matches the code (Phase 1, A3)
- [x] Every refused fake `gh` entry carries `refusal`; `gh version issue close 5` is refused (it exits 0 on `develop` today), and `gh --version pr view 901` is not answered as a version (Phase 2)
- [x] `pr-inline-comment.js` never sends `-f` without `-X GET` (Phase 3)
- [x] For each of the six call sites, a directory holding `.1.` and `.3.` of that site's kind(s) gets `.4.` under bash and zsh — kinds `pr-review`, `risk`, `test-design`, `review` (review-bug, review-epic, review-task) and `dod` (Phase 4) *(Scope, 2026-10-06, operator decision: the bash arm is guarded per PR in CI; the zsh arm is verified locally, since `ubuntu-latest` has no zsh — the state task.185 and task.176 were accepted in.)*

**Code Quality:**

- [x] `npm test`, `npm run eval:all`, `npm run bundle:check`, `npm run lint:shell` pass
- [x] `npm run validate -- skills/<skill>/` passes for each SKILL.md changed

**Migration:**

- [x] CHANGELOG `[Unreleased]` cites task.186
- [x] `evals/shared/README.md` states the new exit codes and the `refusal` field

---

## 10. Risk Assessment

**MEDIUM:**

1. **Exit-code move breaks an external caller of the runner.**
   - Mitigation: the runner still honours any opt-in value from 3 to 125. Grep `EVAL_*_EXIT` across the repo before changing defaults.
2. **Phase 4 touches five skills' step prose.**
   - Mitigation: one helper and one call-line test per skill. Run Step 3.5's population probe for "starts at 1 and increments".

**LOW:**

1. **`refusal` field changes a log shape.** Assertions match by substring, so the change is additive.
2. **`-X GET` change in `pr-inline-comment.js`.** It is a one-argument change with a test pinning it.

---

## 11. Rollback Plan

**Immediate rollback (< 1 hour):** each phase is its own commit. Revert the phase's commit and run
`npm run bundle`. Trigger: `eval:all` or `npm test` red on `develop` after merge.

**Partial rollback:** phases are independent. Revert one without the others.

**Forward fix:** a wrong reason label or a doc mismatch is fixed forward.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-06
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.186.qa.3.eval-harness-hardening-and-leftovers.md](./task.186.qa.3.eval-harness-hardening-and-leftovers.md)
- **Gate File**: [task.186.gate.3.eval-harness-hardening-and-leftovers.yml](./task.186.gate.3.eval-harness-hardening-and-leftovers.yml)

### Test Coverage Summary
- **Tests Executed**: 394
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
- Gate 2's C2-CR-1 is fixed: replay runs are judged without jq; live runs skip.
- C3-CR-1 (test machinery) was carried by the Diminishing-returns exit; no open entry remains.

## Definition of Done - Gaps Identified — run 1 (historical, superseded)

> Superseded by run 2 (`task.186.dod.2.eval-harness-hardening-and-leftovers.md`): the AC6 gap was closed by the operator scope annotation (`eb4c884`). Kept as history, not evidence.

**Status:** IN PROGRESS (run 1)

### QA Gate Status

**QA Report**: `task.186.qa.3.eval-harness-hardening-and-leftovers.md`
**Gate File**: `task.186.gate.3.eval-harness-hardening-and-leftovers.yml`
**Gate Status**: ⚠️ CONCERNS — no open entry (Diminishing-returns exit)
**Quality Score**: 90/100

### Missing Criteria:

1. **Acceptance Criteria:**
- [ ] AC6 — the six call sites are tested under bash per PR, but the zsh arm of `shared/resources/tests/next-numbered.test.mjs` runs only where zsh is installed, and CI's `ubuntu-latest` has none (`.github/workflows/test.yml` installs none). Verified locally under zsh.

### Next Steps:

- [ ] Operator decision on AC6: install zsh in `.github/workflows/test.yml` (a code change — the resume re-enters QA at 5a), or annotate the criterion "zsh verified locally", as task.185 (dod.3) and task.176 were accepted (a document-only change — the resume re-runs `/finalise`)

**Estimated Effort:** Small — one CI line, or one scope annotation.

**Gap Report Generated:** 2026-10-06
**QA Gate Reference**: See `task.186.gate.3.eval-harness-hardening-and-leftovers.yml` for full details

**Detailed Verification Log:** See `task.186.dod.1.eval-harness-hardening-and-leftovers.md` for complete verification evidence and timestamps.

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Report Summary

**QA Report**: `task.186.qa.3.eval-harness-hardening-and-leftovers.md`
**Gate File**: `task.186.gate.3.eval-harness-hardening-and-leftovers.yml`
**Gate Status**: ⚠️ CONCERNS — no open entry (Diminishing-returns exit, cycle 3)
**Quality Score**: 90/100

All Definition of Done criteria have been verified (run 2):

✅ **Acceptance Criteria:** 10/10 — AC6 under the operator scope annotation (bash arm per PR, zsh arm verified locally)
✅ **Tests & Review:** 394 targeted tests; 3 QA cycles; Step 5c `/review-pr` CONCERNS with no high finding; CI green on `6723c20` (5 checks)
✅ **Documentation:** CHANGELOG `[Unreleased]` cites task.186 four times; `evals/shared/README.md` states the exit codes and the `refusal` field
✅ **Security Review:** PASS — `next_numbered` probed 30/30, 0 reproduced; fake gh classifier 33/33; no secrets, unsafe execution or new dependencies
⚠️ **Compliance Review:** NOT_APPLICABLE — internal tooling only

**Task marked as ACCEPTED on:** 2026-10-06

**Detailed Verification Log:** See `task.186.dod.2.eval-harness-hardening-and-leftovers.md` for complete verification evidence and timestamps.

## Deferred Work

- **C3-CR-1** (MEDIUM, test machinery) — carried to gate 3 `recommendations.future` (route 2, cycle 3): the no-jq meta-test in `evals/shared/tests/fake-gh.test.mjs` asserts `skipped >= 1`, which its own self-skip always satisfies, and has no pass floor
- **CR-2** (gate 1, MEDIUM, advisory) — `skills/review-story/SKILL.md` numbers `story.{epic}.{story}.review.{n}.` with no rule, and `next-numbered.test.mjs` derives its population from skills already calling `next_numbered`; build the population from report-name templates (follow-up task)
- **CR-4** (gate 1, LOW) — `refusal: "write"` also covers an `api` GET refused for an off-list flag
- **CR-5** (gate 1, LOW) and **5c CR-1** (PR review, MEDIUM/medium) — `next_numbered` reads an unsubstituted `{placeholder}` in `-name`, a missing predicate, or a failed `find` as an empty series and prints 1; every shipped call site passes a tested `-name`
- **CR-6** (gate 1, LOW) — a setup that never settles leaves its sandbox behind
- **C2-CR-3, C2-CR-4** (gate 2, LOW) — a `requiresLiveDriver` live-only scenario under replay reads usage (2), not 3; `env.json` values are coerced differently by runner and `repeat.mjs`
- **C3-CR-2, C3-CR-3** (gate 3, cleanup) — stale A5 comment in `runner-setup.test.mjs`; `jqTest` name
- **5c CR-2** (PR review, cleanup) — `evals/shared/README.md` says the runner exits 0 only from its final line; a skip still exits 0 unless `EVAL_SKIP_EXIT` is set
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-06 | 1.0 | Initial draft — task.185 follow-ups: runner verdicts, fake gh residue, inline-comment GET, shared next-number rule | create-task |
| 2026-10-06 | 1.1 | Review passed (8/10) — fixed two criteria that could not go red or named the wrong exit code, moved the A2 name set out of runner.mjs, added finalise as a sixth numbering site | review-task |
| 2026-10-06 |  | Status → ready-for-development | review-task |
| 2026-10-06 |  | Implemented — 4 phases, 32 files outside docs/tasks (2 new modules, 1 removed script, 9 bundled copies); 16 test cases added to existing suites and 37 in the new next-numbered.test.mjs | develop-task |
| 2026-10-06 |  | QA gate CONCERNS (90/100) — 2 findings (CR-1 medium, CR-3 low) | qa-task |
| 2026-10-06 |  | QA gate CONCERNS (90/100) — 1 finding (C2-CR-1 medium) | qa-task |
| 2026-10-06 |  | QA findings fixed — CR-1 (driver-aware assertion floor), CR-3 (fake-gh tests without jq), C2-CR-1 (jq refusal scoped to live drivers), 2 iterations | qa-fix |
| 2026-10-06 |  | QA gate CONCERNS (90/100) — 1 finding, carried by the Diminishing-returns exit; no open entry | qa-task |
| 2026-10-06 |  | DoD incomplete — 1 gap identified (AC6 zsh arm has no CI lane) | finalise |
| 2026-10-06 |  | Scope annotation on the six-call-site criterion: zsh arm verified locally (operator decision, task.185/176 precedent) | operator |
| 2026-10-06 | 1.2 | DoD passed — accepted (PR #576) | finalise |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Runner and repeat verdicts
- [x] A1–A6

### Phase 2: Fake gh residue
- [x] B items

### Phase 3: Inline comments read with GET
- [x] C

### Phase 4: One next-number rule
- [x] D

---

## Implementation Summary

**Completion Date**: 2026-10-06 (develop-task run 1, inline implementation from the plan)

**Approach**: four phases, each from a test that was red on `develop`, each mutation-proven
(Phase 1 9/9 mutations killed, Phase 2 6/6, Phase 3 red-before/green-after, Phase 4 8/8).

- **Phase 1 (A1–A6)**: the runner sets `process.exitCode = 1` first, so only its final line
  exits 0. Assertion names live in one table, `evals/shared/lib/assertion-dispatch.mjs`; the
  runner dispatches through it and refuses an unknown name before the sandbox (exit 1), and
  `repeat.mjs` refuses it, and an empty scenario, as usage (exit 2). Opt-in codes are 73/74/75.
  `installFakeGh` throws `evalSkip` without `jq`, which the runner reports as a skip. A killed
  `claude` names `ETIMEDOUT` and the signal.
- **Phase 2 (B)**: `refusal` on every refused entry, `--version` only as the whole argv,
  `-R`/`--repo` out of `API_READ_FLAGS`, missing `--json` fields `unhandled`, own-key lookup,
  and a log-line floor on the unhandled test.
- **Phase 3 (C)**: `-X GET` on the inline-comment listing; a test holds every `gh api` argv with
  a field parameter to `-X GET`.
- **Phase 4 (D)**: Option 1 — `next_numbered` beside `newest_numbered`; six skills call it
  (`review-pr`, `qa-planning`, `review-bug`, `review-epic`, `review-task`, `finalise`) and
  `next-numbered.test.mjs` runs each one's own call line under bash and zsh, with a derived
  population check.

**Testing Results**: `npm run ci` (ci:fast, eval:all, validate:all, check:generated,
bundle:check, lint:shell) exit 0 — 5395 tests pass, 0 fail; eval:all 43 scenarios green. Counts
measured with `git status --porcelain --untracked-files=all` (files) and `git diff -U0 | grep -cE '^\+\s*test\('` (test cases).

Live: `EVAL_RUNS=1 env -u ANTHROPIC_API_KEY npm run eval:review-pr:cli` — 4/4 scenarios passed
(01-happy 6/6, 02-renumber-gap 7/7, 03-unanchored 5/5, 04-planted-bug 6/6 assertions), exit 0.

**Deferred Work**: see `## Deferred Work` — the advisory findings the QA gates and the PR review carried, none blocking. Review Optional O1 and O2 were both applied.

---

## References

- **Origin**: task.185 (`docs/tasks/task.185.review-pr-eval-suite/`, PR #574): gates 4–8 `recommendations.future`, `task.185.pr-review.1`–`3`, `task.185.dod.1`–`3`
- **Observations**: #272 (report numbering), #274, #276 (deny-list over gh argv)
- **Related skills**: `.agents/skills/review-pr/`, `.agents/skills/review-code/`

---

## Notes

### Important Reminders

- Every one of these findings was advisory or latent in task.185: no shipped scenario hits them
  today. Prove each fix with a test that is red before it, as task.185 did.
- Phase 3 is a real defect in shipped skills (`/review-pr --inline`, `/review-code`). If it needs
  to ship sooner, it is independent of the other phases.
