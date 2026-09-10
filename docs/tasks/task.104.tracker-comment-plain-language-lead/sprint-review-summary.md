# Sprint Review Summary — Task 104

**Task:** Every tracker comment opens with a plain-language summary — the engine primitive
**Status:** ✅ Accepted · **Date:** 2026-09-10
**PR:** [#377](https://github.com/Gamaroff/agent-skills/pull/377) · **Issue:** [#376](https://github.com/Gamaroff/agent-skills/issues/376)

---

## Summary

Stakeholders who read the board — and only the board — said the pipeline's comments were unreadable. They open with gate verdicts, step numbers, file paths and scores on scales nobody outside the pipeline knows.

Every comment now opens with a paragraph written for a reader with no technical background: two to four sentences answering *what happened, what it means, what happens next*, followed by a rule and then everything the comment used to say, **unchanged**. Nothing was taken away from the developer; something was added for everyone else.

**No call site was edited.** The engine renders the lead from the stage value each caller already passes, so all existing sites gained one the moment this merged.

## What a stakeholder now sees

**Before**

> `QA Cycle 2 — CONCERNS (78/100)` followed by a five-row scoring table.

**After**

> "The work has been through another round of testing. The checks found some problems worth knowing about, but none that stop the work. If anything needs fixing it will be fixed and tested again before this item is finished."
>
> — then the same table, untouched.

## Success criteria met

13 of 13 — functional, performance, code quality and migration.

## Key decisions

- **The rule is mechanical, not documented.** A comment for which no lead can be produced **does not post**. A call site cannot forget a lead it never supplies, and a new stage cannot ship without one, because the engine has no template to render. The repo already had the counter-example: a documented-but-unenforced comment convention that several sites still bypass.
- **Verdict tokens are mapped, never passed through.** `CONCERNS` tells an outside reader nothing about whether to worry. An unknown verdict renders "the results are recorded below" rather than defaulting to reassurance — the one direction this must not fail in.
- **Every template must read correctly with no slots filled**, because that is the path that ships first.
- **The catalogue's stage list is imported from the engine, never restated**, so adding a stage without a lead turns a test red before the stage can be used.

## Technical details

| | |
| :--- | :--- |
| New | `shared/resources/stakeholder-summary.{md,js}` + its unit test |
| Modified | `tracker-comment.js` (two flags, composition, guard, `lead` in `--json`), `jira-sync.js` (optional `desired`), the contract, `AGENTS.md`, two test files |
| Generated | 13 skills × 4 bundled `references/` copies |
| Untouched | every call site, `pr-inline-comment.js`, the bare `gh issue comment` sites |

## Testing & QA

- `ci:fast` **3127 pass / 0 fail**; `eval:all` exit 0; CI green on the PR head
- **13 mutation proofs**, each naming the test it turns red
- Security `measured`: **45 boundary probes** executed against the shipped commit, **0 reproduced**
- Two QA cycles (FAIL 30/100 → PASS 92/100) plus a Step 5c PR review

## What the run cost, and why it is worth reporting

**24 findings**, closed across a pre-implementation review, two QA cycles and a PR review. Three are worth a sprint review's attention because they generalise:

1. **The blocking defect was invisible to a green suite.** Slot values arrive from the CLI as strings and were consumed by truthiness, so `--slot blocking=false` rendered *"Some things need answering before work can start"* — the opposite of the caller's intent, in the one paragraph aimed at a reader who cannot check the body underneath it. A missing lead is a gap; a confidently wrong one is misinformation.
2. **A closed finding is not evidence the defect is gone.** One finding was fixed on the GitHub arm, verified by a test that exercised only that arm, and recorded closed — while the identical regression survived on the Jira arm. A refute pass found it.
3. **A QA gate is a statement about a working tree; a PR is a statement about a branch.** Step 5c found the PR did not contain a full cycle of work its own gate had certified, because a rejected commit's output had been suppressed. Nothing before that step compares the two.

## Follow-on work

- **task.105** — feed real values into the lead's slots at the 22 call sites, and convert the bare `gh issue comment` sites.
- **task.106** — the same treatment for pull-request comments via `pr-inline-comment.js`.
- Deferred, filed as `future` in gate 2: a pre-existing issue where a deferred record's `command.stdin` carries no idempotency marker, so a replayed comment is not suppressed on the next run. Predates this change; worth its own bug.

## Known limitations

- The `---` separator renders on GitHub and is dropped on Jira, whose ADF converter emits no rule node. Accepted and documented rather than fixed: teaching the converter would change every Jira description the repo renders.
- A `--summary-file` lead is unvalidated — it is the deliberate escape hatch, and the standard says to prefer adding a stage.
