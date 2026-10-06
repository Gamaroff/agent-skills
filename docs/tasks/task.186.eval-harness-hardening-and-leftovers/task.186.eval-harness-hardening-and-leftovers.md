---
id: task.186
title: "Eval harness hardening and task.185 leftovers"
type: task
description: "Close the advisory findings task.185 carried forward: make the eval runner and repeat.mjs never score a non-verdict as a verdict, finish the fake gh's fail-closed rule, fix pr-inline-comment.js sending a review-comment listing as a POST, and stop four skills numbering their reports by counting."
tags: [evals, harness, fake-gh, review-pr, follow-up]
category: testing
status: planned
priority: Medium
created: 2026-10-06
updated: 2026-10-06
assignee:
estimated_effort_hours: 16
github_issue: 575
---

# Technical Task: Eval harness hardening and task.185 leftovers

**Status:** Planned

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
- **D.** Four skills number their co-located reports by counting instead of highest + 1.

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
5. **Four skills number reports by counting.** The obs #272 fix covered only `/review-pr`.
   Count-style prose remains at `skills/qa-planning/SKILL.md:649`, `skills/review-bug/SKILL.md:121`,
   `skills/review-epic/SKILL.md:535` and `skills/review-task/SKILL.md:2130`. A directory holding
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
- The opt-in codes move to a range Node and the shell do not use (64–113), and `repeat.mjs` and
  the README change together.
- Fake `gh` refusals carry `refusal: "write" | "not-a-served-read"`. `--version` is answered only
  as a one-element argv. `-R`/`--repo` leave `API_READ_FLAGS`. `pick()` reports a missing
  requested field as `unhandled`. Fixture lookup uses own keys only.
- `pr-inline-comment.js` passes `-X GET` with its `-f` parameters.
- One shared next-number helper in `shared/resources/`, called by `/review-pr`, `qa-planning`,
  `review-bug`, `review-epic` and `review-task`, bundled into each skill.

---

## 4. Scope

**In Scope:**

- ✅ `evals/shared/runner.mjs`, `repeat.mjs`, `drivers/claude-cli.mjs`, `lib/fake-gh.mjs`, their tests, and `evals/shared/README.md`
- ✅ `shared/resources/pr-inline-comment.js` and its test; the bundled copies via `npm run bundle`
- ✅ A shared next-number helper. Step-prose changes in the four skills plus `/review-pr` Step 7.

**Out of Scope:**

- ❌ review-pr eval scenarios 5–7 (their own follow-up, named in task.185)
- ❌ Any change to how `/review-pr` reviews: this task touches its numbering call only

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

- [ ] The runner sets a non-verdict `process.exitCode` at the top of `main()`, so only the post-assertion line can exit 0 (A1)
- [ ] Validate every `assertions` / `liveAssertions` `fn` against the known set before the driver runs; refuse with a non-verdict status (A2)
- [ ] Move `repeat.mjs`'s opt-in codes to 64–113 and update the README exit table (A3)
- [ ] `repeat.mjs` refuses a scenario with no assertions as a usage error (A4)
- [ ] A missing `jq` becomes could-not-run, not a failed run (A5)
- [ ] `claude-cli.mjs` adds `res.error?.code` and `res.signal` to the error when `status` is null (A6)

### Phase 2: Fake gh residue (B) — Risk: Low

- [ ] `refusal: "write" | "not-a-served-read"` on every refused entry
- [ ] `--version` / `version` answered only when argv has one element
- [ ] Drop `-R`/`--repo` from `API_READ_FLAGS`
- [ ] `pick()` reports requested fields the fixture lacks as `unhandled`
- [ ] Fixture lookup by own keys only (`Object.hasOwn`)
- [ ] The unhandled test asserts a log line exists (C8-CR-3)

### Phase 3: Inline comments read with GET (C) — Risk: Low

- [ ] Add `-X GET` to the `pr-inline-comment.js` comment listing; a test asserts the argv carries `-X GET` whenever it carries `-f`
- [ ] `npm run bundle`; the bundled copies in `review-pr` and `review-code` match

### Phase 4: One next-number rule (D) — Risk: Medium

- [ ] Decide: extend `newest-numbered.sh` with a next-number mode, or generalise `next-report-number.sh` into `shared/resources/` with a `<kind>` argument; record the decision
- [ ] Point `/review-pr` Step 7, `qa-planning`, `review-bug`, `review-epic` and `review-task` at it
- [ ] Tests run each skill's own call line under bash and zsh (the `review-pr.test.js` `step7CallLine` pattern)

---

## 7. Files Summary

**Core:**

1. ✅ `evals/shared/runner.mjs`
2. ✅ `evals/shared/repeat.mjs`
3. ✅ `evals/shared/drivers/claude-cli.mjs`
4. ✅ `evals/shared/lib/fake-gh.mjs`
5. ✅ `shared/resources/pr-inline-comment.js`
6. ✅ `shared/resources/newest-numbered.sh` or a new `shared/resources/next-report-number.sh` (Phase 4 decides)
7. ✅ `skills/review-pr/SKILL.md`, `skills/qa-planning/SKILL.md`, `skills/review-bug/SKILL.md`, `skills/review-epic/SKILL.md`, `skills/review-task/SKILL.md`

**Tests:**

8. ✅ `evals/shared/tests/runner-setup.test.mjs`, `repeat.test.mjs`, `fake-gh.test.mjs`
9. ✅ `shared/resources/tests/pr-inline-comment.test.mjs`
10. ✅ The next-number helper's tests, plus each skill's call-line test

**Documentation:**

11. ✅ `evals/shared/README.md`, `CHANGELOG.md`

**Generated:**

12. ✅ `skills/*/references/` copies, via `npm run bundle`

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

- [ ] A scenario whose setup hook never settles makes `repeat.mjs` exit 3 (could not run), not 0 (Phase 1, A1)
- [ ] A scenario with an unknown assertion `fn` makes `repeat.mjs` exit 3 before any driver runs (Phase 1, A2)
- [ ] `repeat.mjs` uses opt-in codes outside 0–5 and the README table matches the code (Phase 1, A3)
- [ ] Every refused fake `gh` entry carries `refusal`; `gh --version pr comment 901` is refused (Phase 2)
- [ ] `pr-inline-comment.js` never sends `-f` without `-X GET` (Phase 3)
- [ ] A directory holding `.1.` and `.3.` of each of the five report kinds gets `.4.` under bash and zsh (Phase 4)

**Code Quality:**

- [ ] `npm test`, `npm run eval:all`, `npm run bundle:check`, `npm run lint:shell` pass
- [ ] `npm run validate -- skills/<skill>/` passes for each SKILL.md changed

**Migration:**

- [ ] CHANGELOG `[Unreleased]` cites task.186
- [ ] `evals/shared/README.md` states the new exit codes and the `refusal` field

---

## 10. Risk Assessment

**MEDIUM:**

1. **Exit-code move breaks an external caller of the runner.**
   - Mitigation: the runner still honours any opt-in value from 3 to 125. Grep `EVAL_*_EXIT` across the repo before changing defaults.
2. **Phase 4 touches four skills' step prose.**
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

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-06 | 1.0 | Initial draft — task.185 follow-ups: runner verdicts, fake gh residue, inline-comment GET, shared next-number rule | create-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Runner and repeat verdicts
- [ ] A1–A6

### Phase 2: Fake gh residue
- [ ] B items

### Phase 3: Inline comments read with GET
- [ ] C

### Phase 4: One next-number rule
- [ ] D

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
