# FAQ

> **Audience:** developers curious about why things work this way.

Design-rationale questions. Pairs with [Troubleshooting](./troubleshooting.md) (which answers *"X broke, what do I do?"*) — this page answers *"why is X this way?"*

## Pipeline design

### Why bounded loops (MAX_ITER=5)?

LLM-driven pipelines can spiral. A bug in the develop step might cause the agent to keep "trying again" indefinitely, burning agent cost and producing nothing useful. `MAX_ITER=5` is the empirically-chosen cap that's large enough for the messy-but-honest cases and small enough that you hit it before the costs become absurd.

If you hit the cap, the right move is usually to **stop and re-scope** rather than raise the cap.

### Why are QA gate files owned exclusively by QA skills?

If dev skills could write gate files, the pipeline guarantee — "merged code has a green gate" — would mean nothing. The gate is the firewall between "code that was written" and "code that's known to work." A gate file written by the same skill that wrote the code is just self-certification.

### Why does `finalise` run full side-effects in lite mode?

Lite mode is about skipping work that's *recoverable* (re-reading the codebase, regenerating context). Step 7 side-effects (PR comment, tracker update, board move) are *not* recoverable — they update external state collaborators rely on. Skipping them silently would create drift between what's merged and what's tracked.

If you genuinely need to skip Step 7, bypass `develop-*` entirely.

### Why is the develop-story branch model two levels deep (epic → story)?

Because stories within an epic often share infrastructure changes that aren't shippable on their own. The epic branch is a long-lived integration point that collects sibling stories. Each story PR is small (epic → story diff), the epic PR to `develop` is the big merge that ships the whole feature.

Tasks don't have this structure because tasks are standalone — no parent that collects siblings.

### Why epic numbers globally unique, not unique-per-PRD?

Because branch names, commit messages, PR titles, and tracker references all carry the number out of context. `epic.178.feature-ui` should be unambiguous in `git log` even if you've forgotten which PRD it came from.

## Skill design

### Why progressive disclosure (metadata → SKILL.md → resources)?

Loading every skill's full body into every conversation would saturate the context window. Loading only metadata keeps the agent aware of what's available without paying the body cost. The body loads when the skill triggers; bundled resources load when the body needs them. Each tier is opt-in based on actual relevance.

See [overview](../concepts/overview.md).

### Why are some "orchestrators" and others "leaf skills"?

Composition. An orchestrator is a skill that calls other skills as steps. Leaf skills do one focused thing. Splitting them keeps each skill's instructions short (progressive disclosure works better) and lets us mix-and-match (the same `create-pr` works inside `develop-story`, `develop-task`, and standalone).

### Why does `develop-story` invoke `review-story` again as Step 2 if I already reviewed?

Defensive: stories sometimes get edited between review and development. Step 2 is a fast revalidation, not a full re-review — it's skipped if the story is recently reviewed and `ready-for-development`.

### Why are skills distributed as zips?

To make them self-contained at installation time. The packager bundles shared resources and rewrites paths so a skill installed in a target project doesn't depend on the layout of *this* repo. Without bundling, consumers would need to install `shared/resources/` separately and keep it in sync.

## Document model

### Why nested story directories instead of a flat list?

Because the artifacts (plan, review, implementation, QA, DoD, gate) all belong to one story and should be findable together. A flat list of `story.{E}.{S}.{name}.md` becomes an unsearchable mess as soon as you have 50 stories with 5–7 artifacts each.

Nested layout is a [fixed convention](./configuration.md#fixed-conventions-not-configurable) — there is no flat-layout mode.

### Why two status fields (frontmatter + body)?

Frontmatter is for machines (skill enforcement, tracker sync). Body `**Status:**` is for humans skimming the doc. The sync rule (`finalise` enforces them together) keeps them from drifting.

Could we have just one? Yes, but humans don't read YAML frontmatter at a glance, and machines don't reliably parse `**Status:**` from arbitrary body text. Keeping both is cheap insurance.

### Why are task numbers globally unique, not per-area?

Same reason as epic numbers — task references travel out of context. `task.44.db-migration` should be unambiguous across the whole project's history.

## Configuration

### Why are PRD, epic, story, task, and registry paths not configurable?

Enough projects share these conventions that pinning the paths removes a configuration burden. Skills hardcode `docs/prd/`, nested stories, `docs/tasks/`, and the two registry filenames — see [Fixed conventions](./configuration.md#fixed-conventions-not-configurable). If you need a different layout, you are off the supported path.

## Repo design

### Why a `shared/resources/` directory if every skill is meant to be self-contained?

Self-contained at *install* time, not at *authoring* time. The packager pulls from `shared/resources/` and bundles into each skill's zip. This avoids duplicating cross-skill docs in 124 skill directories during development — there's one canonical copy that the packager fans out.

### Why audience-driven docs subdirectories?

Because the docs serve at least three readers — library users, library contributors, and the curious — and a flat layout forced every reader to filter the same shelf. The subdir taxonomy (`concepts/`, `runbooks/`, `reference/`, `standards/`, `contributing/`, `operations/`) lets each reader find their material in seconds.

### Why is `docs/reference/skill-catalog.md` regenerated, not hand-maintained?

Because it derives from skill frontmatter. Hand-maintained, it would drift. Regenerated, the only source of truth is the skill itself — change the SKILL.md and the catalog reflects it.

## See also

- [Anti-patterns](./anti-patterns.md) — collected "never do X" rules
- [Troubleshooting](./troubleshooting.md) — what to do when something breaks
- [Architecture](../concepts/architecture.md) — how the pieces fit together
- [Glossary](./glossary.md)
