# Sprint Review Summary — Task 94: Add the observe-work meta-skill

**Task:** [`task.94.observe-work-skill.md`](./task.94.observe-work-skill.md)
**PR:** [#354](https://github.com/Gamaroff/agent-skills/pull/354) · **Issue:** [#340](https://github.com/Gamaroff/agent-skills/issues/340)
**Accepted:** 2026-09-08 · **Gate:** PASS 100/100 · **QA cycles:** 5

---

## Summary

The library now has a skill that watches how the library itself is used. `observe-work` runs alongside ordinary work, notices the moments that would otherwise evaporate — a correction, a gap no skill covers, a rule the agent broke — writes each as a durable observation, and periodically turns that backlog into **staged** skill updates the user installs.

It is the first consumer of the observation-log engine shipped by task 93. Until now that engine, resolver and contract existed with nothing calling them; the mechanism was inert.

Adapted from [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) (CC BY 4.0, Eoghan Henn) — **changes were made**; the methodology is kept and the mechanism is a rewrite.

## What was delivered

| | |
|---|---|
| `skills/observe-work/SKILL.md` | The lean core — **283 lines** against a 500-line ceiling |
| Five authored references | `signals`, `review-cycle`, `applying-updates`, `environments`, `starter-principles` — each opening with its own load trigger |
| Two test suites | 28 assertions: structural invariants of the prose, and behavioural tests for the hook |
| Registration | All eleven CI-enforced steps — catalog, dependency graph, both doc pages, the `package.json` glob, bundling |
| Activation | `AGENTS.md` instruction demanding the Session Start Protocol *by name*, plus an opt-in `SessionStart` hook |

**Size against upstream:** authored total **49.1 KB vs ~214 KB** (4.4× smaller); body **13.1 KB / 283 lines vs ~44 KB / ~710**. Upstream states a 500-line rule in a 710-line body; meeting it here is what makes progressive disclosure real rather than stated.

## Demo notes

- `/observe-work` — capture mode; `/observe-work --review` — the review cycle.
- Run `command node skills/observe-work/references/observation-log.js doctor --json` in a fresh project: `reason: "ok"`, `healthy: false`, and a `checks[]` entry telling you to run `init`. That gap between `reason` and `healthy` is where two of this task's findings lived.
- The `SessionStart` hook is **shipped, not installed** — deliberately. Installation is the user's call.

## Quality

**5 QA cycles, 7 findings, all closed.** Scores 60 → 70 → 90 → 90 → 100; HIGH counts 1 → 1 → 0 → 0 → 0.

Three things are worth carrying into the next task:

**1. Two of the seven findings were introduced by the fixes for earlier findings.** Cycle 2's refute pass exists for exactly this, and it earned its place: the fix for cycle 1's HIGH had added a catch-all reading *"`healthy: false` → do not write until it is resolved"*, and `healthy` is false in every project that has not yet added the activation instruction. It would have silently disabled capture on every fresh install — and Session Start step 4, which suggests adding that instruction, runs *after* step 1, so the protocol blocked before reaching its own remedy.

**2. One root cause produced three defects in three cycles.** The hook reimplemented the engine's queue rule in shell: undercount, then overcount, then both at once *cancelling each other* — hook and engine each reported "2 open" and appeared to agree; only `total` disagreed, 3 against 2. Gate 2 had written the rule in advance ("if a third arises, replace the mechanism rather than correcting it again"), so cycle 3 deleted the shell logic entirely and called the engine. The formal third-strike trigger counts HIGH findings and these were MEDIUM; waiting for it would have meant a fourth patch.

**3. The decisive findings came from executing the documentation, not reading it.** Every document-anchored check — `quick_validate`, the structural assertions, all repo-level suites, `ci:fast` — was green when cycle 1 found its HIGH. Ten engine invocations against a real workspace found it in the first two.

## Security & compliance

Boundary probe mode fired on the workspace resolver: **4 candidates executed, 0 reproduced** — the boundary held. The ephemeral-anchor refusal was observed firing three times during the loop, twice unplanned. It is engaged, not merely present.

CC BY 4.0 attribution is complete on all four required elements and **asserted by the test suite**, so it cannot be silently dropped by a later edit.

## Known limitations

**The install is `activation unverified`** — by construction, not by omission. The installing session cannot prove activation: a skill being callable right after install only shows it was invoked by hand, and the config file is read at session start, so an instruction written mid-session takes effect only on the next one.

> **Next session, before anything else:** confirm `observe-work` was *invoked* — not merely listed — and that its Session Start Protocol ran. The external diagnostic, for when every layer is skipped anyway: if the observation-log directory does not exist after a few sessions of real work, activation never happened.

## Follow-up recorded, not lost

| Item | Where |
|---|---|
| `qa-execute-snippets` refuses `command node`, so QA Step 4b is structurally inert for any skill obeying this repo's own rule | `gate.5` → `recommendations.future` |
| `docs-link-check` is path-filtered to `docs/**`; everything under `skills/**` ships unchecked | `gate.5` → `recommendations.future` |
| `/review-pr`'s exclusion rule hides authored files that live in `references/` | `task.94.pr-review.1.*` → Recommended Actions |
| Task 95 — the `observations:` config schema, reciprocal boundary notes in the three neighbouring meta-skills, and the skill-family registry | Task registry |
