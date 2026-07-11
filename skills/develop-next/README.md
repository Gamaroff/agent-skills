# develop-next — setup & operating guide

`/develop-next` takes the next unblocked item on the consumer project's completion roadmap (`docs/development/project-completion-roadmap.md`) from "outstanding" to "merged + ticked" with zero prompts. `/loop /develop-next` chains runs until a stop condition (epic boundary, `manual` item, or pipeline HALT). See [SKILL.md](SKILL.md) for the step protocol and [references/roadmap-selection.md](references/roadmap-selection.md) for selection rules.

## One-time setup (before the first unattended run)

1. **Pipeline hooks** (shared with develop-story/develop-task — graceful pause on compaction, forced continuation on premature stop):
   ```bash
   bash .agents/skills/develop-story/scripts/install-hooks.sh
   ```
2. **Permission allowlist** — run `/fewer-permission-prompts` once so routine `git`, `env gh`, and `npm run` calls don't stall the loop. Explicitly allowlist `env gh pr merge` — it is the one hard-to-reverse action this skill automates; everything else was already automated by the pipelines.
3. **Permission mode** — run loop sessions in **acceptEdits**. Do not use `--dangerously-skip-permissions`; the allowlist + acceptEdits covers the pipeline with a bounded blast radius.

## What "green" means (CI caveat)

GitHub Actions does **not** run on PRs yet — Task 1's self-hosted runner is unregistered and the workflow triggers are commented out (roadmap §Deferred ops). Until it lands, the merge gate is local:

- QA gate file `PASS` + document `accepted` (finalise), and
- `npm run lint && npm run typecheck && npm test` clean on the branch being merged.

Registering the Task 1 runner (scheduled with 5.1a) is the single biggest upgrade to auto-merge safety — once PR CI exists, add a check-state verification (`env gh pr checks`) before merge.

## Operating model

- **One-shot:** `/develop-next` — one item, full report, stops.
- **Dry run:** `/develop-next --dry-run` — prints which item would be selected and why. Run this first in any new session.
- **Continuous:** `/loop /develop-next` — self-paced; each iteration is one item. The loop ends itself at stop conditions and sends a push notification.
- **Review cadence:** you review once per **epic** (the epic→develop merge is followed by a stop) instead of once per story. Merges, ticks, and auto-answered decisions are all recoverable from the run report, each story's implementation report (Decisions Log), and the roadmap Change Log.
- **Resuming after an interruption:** just run `/develop-next` again — Step 0 detects a live pipeline lock and re-enters that run's resume path instead of selecting a new item.
