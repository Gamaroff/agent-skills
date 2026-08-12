# Sprint Review Summary — Task 40

**Task:** Wire `gh-stage.js` into the pipeline step files
**Status:** ✅ Accepted — 2026-08-12
**PR:** [#207](https://github.com/Gamaroff/agent-skills/pull/207) · **Issue:** [#188](https://github.com/Gamaroff/agent-skills/issues/188)
**Final Gate:** PASS (100/100) after 2 QA cycles

---

## Summary

Task 39 shipped `gh-stage.js` — a GitHub Projects board engine driven by the consumer's status ladder — and shipped it **inert**. Task 40 is the wiring that makes it real, and the first task in this series to change live pipeline behaviour.

Five inline `gh api graphql` board blocks, roughly 240 lines of duplicated prose across four pipeline step files and `skills/finalise/SKILL.md`, are now one-line `gh-stage.js --stage <moment>` calls. The option names that used to be `jq` literals are gone; which column each moment targets comes from `pipeline.<moment>` in the consumer's `tracker-workflow.yaml`.

The headline effect: a team whose board reads `Backlog / In Development / Ready for Showcase / Shipped` no longer has to edit a skill file to make the pipeline work.

## What changed for users

**Three behavioural changes, all intended:**

1. **Backward board moves are refused.** The QA-start step previously force-wrote "In Review" over whatever column a card was on, silently dragging back cards a human had advanced. It now logs `would-regress` and leaves the card alone. `--allow-regress` exists for a deliberate reset; no pipeline step passes it. Note the guard is **inert without a declared ladder** — declaring one is what switches the protection on.

2. **`/finalise`'s Done match became case-insensitive.** It used `name == "Done"` while every step file used `ascii_downcase`, so a board with a lowercase `done` column silently skipped there and worked everywhere else. Strictly widening — it can only start working where it used to skip.

3. **The Step 0 post-condition stopped false-passing.** It asked "is the card still literally in the column named `Todo`?", so any board whose first column was named otherwise printed "✅ Post-condition verified" after a move that never happened. Deleted rather than repaired: the CLI re-reads and reports the option it actually landed on. Some runs that looked clean will now correctly warn.

**Also removed:** the paragraph instructing readers to hand-edit `select(.name == "In Review")` — its removal was the acceptance criterion — and a `BOARD_NUM` that had been computed and never used since it was written.

## Technical highlights

- **Phase order was load-bearing**, not cosmetic: 4 → 5-6 → 0 → 7 → guards. Steps 4 and 5-6 perform the *same* board move, so a failure in either is masked by the other; they went first for that reason. `npm run bundle && npm test` ran after each phase rather than batched.
- **Step 0's three tangled concerns were separated carefully.** `item-add` + propagation retry delegated to `--add-to-board` (task.39 had already ported the dance verbatim); Priority-→-P2 kept inline with its own query; post-condition deleted. Keeping Priority inline was deliberate — delegating it would have swapped P2-when-unset for mirror-the-label, an undocumented fourth behavioural change on the riskiest phase.
- **`/finalise` was reordered** so the ladder resolves Done before the `sync-jira-*` re-link. The two previously resolved the same question from different config sources, so one skill answered it two ways.

## The bug found on the way

Writing the CLI call was not enough to ship it. **The bundler cannot see `.agents/skills/…/references/X` paths** — `bundle_skill.py:178` runs only `collect_shared_refs` (the `shared/resources/X` form) when recursing into shared files. So the first bundle left `gh-stage.js` out of every skill, shipping installs that referenced a file not present in them.

This is the task's own Critical "bundle drift ships a broken install" risk, arriving by a route nobody predicted. `jira-stage.js` had never hit it only because `jira-transition-protocol.md` happens to name its `shared/resources/` path in prose. Each site now names the engine source explicitly, a guard asserts any skill invoking the CLI bundles it, and **CI gained a bundle-freshness check** — previously this class of drift surfaced only at release time.

## Quality

| | |
|---|---|
| Tests | **1070 passing**, 0 failing (baseline 1065 + 5 new guards) |
| Guard verification | All 5 **mutation-tested** — the violation each targets was injected and the suite confirmed red |
| CI | ✅ green on the exact head commit (`link-check`, `test`, `validate`) |
| QA cycles | 2 — CONCERNS 90/100 → qa-fix → PASS 100/100 |
| Live verification | `--probe-board --issue 188` reproduced this repo's ladder exactly against board #1 |

**On guard quality specifically.** The task warned that v0.33 shipped an absence-only guard that passed vacuously and flagged the sentence that got it right. Two guards here hit that same class of failure during development — both matched the *prose documenting the correct behaviour* — and both were caught and rescoped to fenced code blocks before review. The second was found by QA rather than by the author, which is the loop working as intended.

## Known limitations

Two consumer tests are **deferred and recorded unchecked**, not quietly ticked:

1. **Live proof that a backward move is refused.** Board #1 has three columns with `in-review` disabled, so there is no rung above review to advance a card to. The behaviour is guarded and mutation-tested; no card was actually refused on a real board.
2. **A full run against a scratch board with bespoke column names.** No such board exists.

Both need a throwaway Projects v2 board. They are board-topology limitations, not implementation gaps.

## Demo note

The board move at acceptance ran through the very call this task added to `finalise`, and returned `reason: "already"` rather than the expected `transitioned` — closing the issue had fired GitHub's built-in *item-closed → Done* automation first, so the CLI found the card already correct and made no mutation.

That is worth showing: exit 0 alone would have been reported as "the pipeline moved it", which is false. Reading `reason` is what makes the difference between an accurate log and a plausible one — and it exercised the new reason table's `already` row on live infrastructure rather than only in a test.

## Follow-on

- **task.41** wires new moments (`in-qa`, `ready-for-merge`, `changes-requested`, `pr-merged`) into these same files, and addresses `develop-bug` having no QA-loop step file — so it never signals `in-qa`.
- The bundler-path limitation found here applies directly to task.41, which adds more call sites.
