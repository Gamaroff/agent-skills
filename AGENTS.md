# AGENTS.md

This file provides guidance to AI agents working with code in this repository.

> **Picking up work here? Read [`.agents/handoff.md`](./.agents/handoff.md) first** — where things stand, what to pick up, the standing decisions, and the traps that cost time. Its state figures each carry the command that produced them: **re-run those commands rather than trusting the date at the top**. State decays within days (branch tip, what is in flight, next available task number); the traps live in [`docs/contributing/traps.md`](./docs/contributing/traps.md) and stay true much longer.

## Repository Purpose

This is a library of agent skills — modular, self-contained packages that extend AI agent capabilities with specialized workflows, domain knowledge, and tooling. Skills are loaded into agents via `.agents/skills/` in target projects.

## Skill Structure

Each skill lives in `skills/{skill-name}/` with this layout:

```
skills/skill-name/
├── SKILL.md          # Required: YAML frontmatter + instructions
├── skill-name.zip    # Packaged distributable (gitignored — built on demand)
├── scripts/          # Executable scripts for deterministic tasks
├── references/       # Documentation loaded into context on demand
└── assets/           # Templates and boilerplate used in output
```

**SKILL.md frontmatter** (required fields):

```yaml
---
name: skill-name
description: Concise description of when/why to use this skill
---
```

The `description` field is critical — it's what agents use for auto-activation matching (~100 words always in context).

## Progressive Disclosure Loading

Skills load in three tiers:

1. **Metadata** (name + description) — always in context
2. **SKILL.md body** — loaded when skill triggers
3. **Bundled resources** — loaded as needed during execution

## Creating and Packaging Skills

**Initialize a new skill:**

```bash
python skills/create-skill/scripts/init_skill.py <skill-name> --path skills/
```

**Package a skill into a distributable zip:**

```bash
python skills/create-skill/scripts/package_skill.py skills/<skill-name>
```

**Bundle shared resources in-tree** (required before commit if you added/changed `shared/resources/` refs):

```bash
npm run bundle              # all skills
npm run bundle:skill skills/<skill-name>
```

Bundling copies referenced `shared/resources/*` into each skill's `references/` directory, rewrites `shared/resources/X` → `references/X` in `.md` and `.js` files, and re-relativises every other prose link in the copy — inside the skill → relative, anything else → the upstream `blob/develop` URL (task 108; guard: `tests/bundled-links.test.js`). This makes each skill directory self-contained, so installers that copy a skill verbatim (e.g. the tarball extracted by `setup-consumer.sh`) produce a working install without needing the rest of the repo. Idempotent — safe to re-run.

**Validate a skill:**

```bash
python skills/create-skill/scripts/quick_validate.py skills/<skill-name>
```

**Regenerate the skill catalog** (run after adding or editing skills):

```bash
npm run generate-catalog
```

Packaged `.zip` files are build artifacts (gitignored: `skills/*/*.zip`). Regenerate with `package_skill.py`; never commit.

## Configuration

Projects place a `skills-config.yaml` at their root. Full schema and key reference: [`docs/reference/configuration.md`](./docs/reference/configuration.md).

### Tracker Workflow

Canonical spec: [`docs/reference/tracker-workflow.md`](./docs/reference/tracker-workflow.md). TL;DR: an optional `tracker-workflow.yaml` at the consumer repo root declares the board's statuses **in order** plus which status each pipeline moment targets. Order is rank, order is the path between two positions, an omitted moment does not fire, and a target absent from `statuses:` is an off-ladder side-state. Missing file → a built-in default ladder reproducing today's behaviour. Engine: [`shared/resources/tracker-workflow.js`](./shared/resources/tracker-workflow.js) (pure, tracker-agnostic). **The Jira path reads it** (task.38); GitHub is task.39. An authored `pipeline:` block is what opts a file in — without one the JSON workflow record still decides.

### Platform Detection

Skills that interact with remote trackers or PRs use a resolver order to pick the platform — explicit config → env vars → git remote → default GitHub. Canonical spec: [`shared/resources/platform-detection.md`](./shared/resources/platform-detection.md).

All leaf skills that branch on platform source `shared/resources/resolve-platform.sh` before the branch, **guarded as `source … || exit 1`** — it validates the `tracker:`/`vcs:`/`access:` keys and returns non-zero on an unrecognised value, which a bare `source` would print and then ignore. It also sets `ACCESS_TRACKER`/`ACCESS_VCS` (how much access the agent has, resolved most-restrictive-wins across config and env — a separate axis from which platform). `package_skill.py` auto-bundles and rewrites this path into each skill's zip.

## File Naming

Canonical patterns: [`docs/standards/file-naming.md`](./docs/standards/file-naming.md). Document-specific schemas under [`docs/standards/`](./docs/standards/) (epic, story, task, PRD).

## Status Lifecycle

Canonical spec: [`shared/resources/document-status-lifecycle.md`](./shared/resources/document-status-lifecycle.md). TL;DR: `draft → planned → ready-for-development → in-progress → ready-for-review → accepted`, with `cancelled` reachable from any non-terminal state. Frontmatter `status:` uses `lowercase-kebab-case`; body `**Status:**` uses `Title Case`. Update both in the same edit.

## Tracker Comments

Canonical spec: [`shared/resources/tracker-comment-contract.md`](./shared/resources/tracker-comment-contract.md). Engine: [`shared/resources/tracker-comment.js`](./shared/resources/tracker-comment.js) (peer of `jira-stage.js` / `gh-stage.js`, same exit codes and `--json` `reason` contract). TL;DR: a comment on a tracker **issue** is one CLI call — the engine resolves `TRACKER` itself, so a step doc never branches for a comment. Always `--body-file`, never an inline `--body`: bodies carry backticks, `$(…)` and newlines, and the file is also what carries the body into the deferred-mutation record's `command.stdin`. `--stage` is the comment's **identity**, not a board column — it builds the idempotency marker, and it is validated against a known list. Read `reason` and act on it; **never post over `unverifiable`**.

**`addCommentToJiraIssue` is prohibited in shipped prose.** It is legal in exactly one place — the `no-credentials` fallback documented in the contract file — and `evals/shared/tests/transition-protocol-parity.test.mjs` enforces that as an absolute rule with a two-file allowlist, so do not restate the fallback at a call site. An earlier version of that guard allowed the call near the literal `no-credentials`, which every site's own reason table pre-satisfied; it passed on the exact regression it named. Keeping the procedure in one file is what makes the rule enforceable.

## Stakeholder Summaries

Canonical spec: [`shared/resources/stakeholder-summary.md`](./shared/resources/stakeholder-summary.md). Engine: [`shared/resources/stakeholder-summary.js`](./shared/resources/stakeholder-summary.js) (pure — a frozen per-stage catalogue and `renderLead(stage, slots)`; no I/O, no `process.exit`). TL;DR: every comment this repository posts to a tracker issue opens with a **plain-language lead** — two to four sentences answering *what happened, what it means, what happens next*, written for a reader with no technical background, followed by a `---` and then the body unchanged. Nothing is taken away from the developer; something is added for everyone else.

**The call site does not write the lead, and that is the whole point.** `tracker-comment.js` renders it from the `--stage` the caller already passes, so the rule needs no discipline to hold: a call site cannot forget a lead it never supplies, and **a comment for which no lead can be produced does not post** — no template and no `--summary-file` is exit 2, with nothing sent. This repository supplied its own counter-example: the comment contract asked every GitHub site to route through `tracker-comment.js`, and for months seven still posted a bare `gh issue comment`, because prose has no chokepoint. A convention documented and not enforced is a convention that drifts. Task 105 converted all seven and, more to the point, made the rule mechanical — `tests/mutation-call-site-coverage.test.js` now fails on a bare `gh issue comment` **invocation** in canonical sources (`SKILL.md`, `shared/resources/*.md`, and — since bug 14 — the tracked shell under `shared/resources/`, `skills/*/scripts/` and `scripts/`, which is how the PreCompact hook's bare call was found to be invisible to a Markdown-only scan), and `shared/resources/tests/comment-slot-coverage.test.mjs` fails on a call site that feeds the lead nothing or feeds it a slot name its stage does not read.

**Which slots a stage reads is fixed, and passing a name it does not read fails silently.** The engine validates no slot names: `--slot k=v` stores any key, and an unrecognised one reaches a template that never reads it — no exit code, no warning, a comment that posts and reads exactly as it would have with none. The mapping lives once, in the templates themselves, and `comment-slot-coverage.test.mjs` derives its expectations from that source rather than restating them. Task 105 shipped three wrong names into review (`pr` on `qa-gate`, `count` on `qa-cycle`) precisely because each is a real slot name on a *different* stage.

Two rules carry the weight. **A verdict token is mapped, never passed through** — `CONCERNS` tells an outside reader nothing about whether to worry, and guessing wrong in either direction is worse than the raw token; the sentence lives in `GATE_MEANING`, and an unknown verdict renders "the results are recorded below" rather than defaulting to reassurance. And **every template must read correctly with no slots filled**, because the slot-free rendering is the one that ships first and is therefore the most visible and least exercised.

The catalogue is keyed by `COMMENT_STAGES`, which its test **imports from the engine rather than restating** — so adding a stage without a lead turns that test red before the stage can be used anywhere. Two enumerations of "what stages exist" drift silently and in the worst direction; that is the enumeration class in [`docs/reference/anti-patterns.md`](./docs/reference/anti-patterns.md).

## Inline PR Comments

Canonical spec: [`shared/resources/pr-inline-comment-contract.md`](./shared/resources/pr-inline-comment-contract.md). Engine: [`shared/resources/pr-inline-comment.js`](./shared/resources/pr-inline-comment.js) (peer of `tracker-comment.js`, same exit codes and `--json` `reason` contract). TL;DR: a comment on a pull **request**, anchored to a line of the diff, is one CLI call — the engine resolves `VCS` itself. **This is the `VCS` axis, not `TRACKER`**: where a PR lives is a property of the remote, and a Bitbucket repo tracking work in Jira must not take a `gh` path that cannot address it.

**A finding is never dropped.** Line anchoring fails routinely — a line outside the diff hunk is a 422 — so anchoring failure **degrades to the summary comment** and reports `anchor-failed`, never `posted`. Reporting a degraded finding as posted makes the failure invisible, which from the reader's side is the same outcome as dropping it. Read the per-finding `reason`s, not just the top-level one. Always `--findings-file`, never inline bodies: findings quote the code they are about. Re-runs are marker + **update-in-place** — resolving and replying to existing threads is deliberately out of scope, and the rule was chosen so it needs neither.

## Authoring-Time Card Preflight

Canonical spec: [`shared/resources/authoring-card-preflight.md`](./shared/resources/authoring-card-preflight.md). Engine: [`shared/resources/card-preflight.js`](./shared/resources/card-preflight.js) (offline, tracker-neutral; no auth, no network, no writes). TL;DR: `create-task`, `create-story` and `create-epic` each run the preflight on the document they just wrote, so a document that would publish a thin tracker card is caught **where the defect is introduced** rather than one step later in `review-*` — or, as happened to `task.99`, by a zero-tolerance corpus assertion after a full push–CI round trip. **Advisory at authoring, blocking at review**: the CLI exits 0 even with findings, because a gate at authoring pushes an author toward writing filler, and filler is worse than a thin card since it looks deliberate.

**The section specs are defined exactly once**, as `CARD_SECTIONS_BY_KIND` in [`shared/resources/jira-sync.js`](./shared/resources/jira-sync.js), beside the `checkCardSections` that consumes them; all four `sync-jira-*` scripts re-export from there and no skill restates them. Two definitions of "what sections a card needs" drift silently and in the worst direction — the authoring check passing a document the sync then publishes thin — which is the enumeration class in [`docs/reference/anti-patterns.md`](./docs/reference/anti-patterns.md). A test asserts the one-definition property with a non-vacuity floor, and a second asserts every generated `references/` copy still matches its source: one *authored* definition is only one *effective* definition while the copies match it.

## Observation Log

Canonical spec: [`shared/resources/observation-log-contract.md`](./shared/resources/observation-log-contract.md). Engine: [`shared/resources/observation-log.js`](./shared/resources/observation-log.js) (pure, local, tracker-agnostic; same exit codes and `--json` `reason` contract as `tracker-comment.js`). TL;DR: the observation log is a **directory** — one Markdown file per observation, YAML frontmatter plus an Issue → Improvement → Principle body — and every read and write of it is one CLI call. Never hand-roll the id: `write` folds the archival sweep, the base-10 parse and the `wx` create into the same call, and there is deliberately **no `--id` flag** (a batch that pre-computes ids collapses N max-checks into one stale read). `parked` means decided-but-blocked: it leaves the work queue, requires `parked_until:`, and **never archives** — stamping a `resolved:` date on one to tidy it away loses it rather than deferring it. The workspace is resolved once by [`shared/resources/resolve-observation-workspace.sh`](./shared/resources/resolve-observation-workspace.sh), sourced as `source … || exit 1`, and never derived from the cwd; an ephemeral anchor (`/tmp`, `.claude/worktrees/`, a linked worktree) is refused, not warned about.

**An empty result is a claim about the instrument.** A scan returning nothing means either there is nothing to find or the reader is broken, and those are byte-identical from the caller's side — so `empty` and `scan-broken` are separate `reason` values, and both `scan` and `next-id` carry an independent count check that trips rather than returning a clean zero. Adapted from [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) (CC BY 4.0, Eoghan Henn); the methodology is kept, the mechanism is a rewrite — see the contract for the attribution and what changed.

## Document Change Log

Canonical spec: [`shared/resources/document-change-log.md`](./shared/resources/document-change-log.md). Engine: [`shared/resources/change-log.js`](./shared/resources/change-log.js) (pure, tracker-agnostic). TL;DR: every PRD, epic, story, and task carries an append-only `## Change Log` — four columns (`Date`, `Version`, `Description`, `Author`), newest at the bottom. Authoring/review/edit skills bump `Version`; machine writers (sync, QA, finalise, develop) leave it blank. **Every entry bumps frontmatter `updated:` in the same edit** (`updated` ≡ OKF `timestamp`). PRDs keep a nested `### Change Log`; readers accept H2 or H3 with optional numbering and preserve the level found. Markers are `<!-- change-log-start/end -->`, superseding the two legacy `jira-sync-`/`github-sync-` pairs, which migrate in place. Two exclusions: bug reports use `## Status History`, and tracker cards never carry the log. Adoption is additive and going-forward only — no backfill.

## Open Knowledge Format

Document frontmatter targets **OKF v0.1**. Canonical mapping + conformance statement: [`shared/resources/open-knowledge-format.md`](./shared/resources/open-knowledge-format.md). TL;DR: every document carries a non-empty `type` (OKF's one hard requirement); `description` is recommended and `tags` optional; `updated` ≡ OKF `timestamp`; the tracker URL (`github_url`/`jira_url`, or derived from `github_issue`) ≡ OKF `resource`. Adoption is additive and going-forward only — `review-*` enforce a missing `type` as Critical.

## Architecture Documents

Canonical spec: [`docs/standards/architecture-docs.md`](./docs/standards/architecture-docs.md). TL;DR: a consumer project must put architecture docs under `docs/architecture/` (sharded, default) with required files `concepts/coding-standards.md`, `concepts/tech-stack.md`, and `concepts/source-tree.md` — these are loaded into every pipeline run via `devLoadAlwaysFiles`. Copy-paste skeleton: [`docs/examples/architecture/`](./docs/examples/architecture/). Generate from an existing codebase with `/document-existing-project`.

## Skill Catalog

Generated index of all skills: [`docs/reference/skill-catalog.md`](./docs/reference/skill-catalog.md). Run `npm run generate-catalog` after adding or editing skills.

## Plan File Locations

Canonical rules: [`docs/standards/plan-file-locations.md`](./docs/standards/plan-file-locations.md). TL;DR: plans must be co-located with the work they describe — task plans inside the task dir, story plans inside the story dir, general plans in `.agents/plans/` in the repo. Never leave plans in agent scratch dirs (`~/.agents/plans/`, `/tmp/`).

## Task Registry

Canonical rules: [`docs/standards/task-registry.md`](./docs/standards/task-registry.md). TL;DR: `docs/tasks/task-registry.md` owns task numbering. Read **Next Available Task Number** before `/create-task`, append a row, increment the counter, commit atomically with the new task files. Task numbers are globally unique and never reused.

**The row has two writers and neither is you.** `/create-task` appends it; **`/finalise` ticks the Status column** via [`shared/resources/registry-tick.js`](./shared/resources/registry-tick.js), in the same moment it writes the document's `status: accepted` — one moment, one writer, so the row and the document cannot disagree by construction. Do not hand-tick a row, and do not skip `/finalise` expecting to tick it later. `evals/shared/tests/task-registry-drift.test.mjs` fails when a task document reads `accepted` and its row does not, or the reverse.

**The write never blocks acceptance** — every outcome exits 0, including "no row found", because refusing to finalise genuinely complete work over a human-readable index line would trade a cosmetic defect for a stuck pipeline. The drift test is the loud backstop, so a no-op is caught rather than lost. A **story** run writes nothing here: the guard lives in the writer, which returns `not-a-task` for a story, epic or bug document, rather than in a condition every caller has to remember.

## Epic Registry

Canonical rules: [`docs/standards/epic-registry.md`](./docs/standards/epic-registry.md). Epic numbers are globally unique; the registry at `docs/development/epic-registry.md` is the single source of truth.

## Bug Registry

Canonical rules: [`docs/standards/bug-registry.md`](./docs/standards/bug-registry.md). TL;DR: `docs/bugs/bug-registry.md` owns **general (cross-cutting) bug** numbering. Read **Next Available Bug Number** before filing a general bug with `/create-bug-report`, append a row, increment the counter, commit atomically with the new bug files. General bug numbers are globally unique and never reused. Story/task bugs are numbered per-parent instead — see [`docs/standards/bug-documents.md`](./docs/standards/bug-documents.md).

## Shared Resources

`shared/resources/` is the single source of truth for cross-skill documentation. Skills reference these files using the explicit path `shared/resources/<filename>` in their `.md` files. Two distribution paths consume these:

- **`package_skill.py`** (zip distribution) — bundles referenced files under `references/` inside each skill's `.zip` and rewrites paths.
- **`bundle_skill.py`** (in-tree, for `setup-consumer.sh` tarball installs and similar) — does the same rewrite but writes `references/` into each skill directory and updates source `.md`/`.js` files in place. Commit the result. Run via `npm run bundle`.

Never use symlinks or relative paths.

## Observing This Session

Before the first tool call of any session — and before writing or proposing a
plan, not merely before executing one — invoke the `observe-work` skill AND
execute its Session Start Protocol (workspace probe, frontmatter scan, review
trigger). Loading the skill and running the protocol are separate steps; a
session that loads the file and stops has activated nothing. Any turn that will
involve a tool call counts; do not classify the session as "too simple" from its
opening message.

After completing each task, report in one line the observations written this
session (ids and titles, or "none logged and why").

Skill: [`skills/observe-work/SKILL.md`](./skills/observe-work/SKILL.md). Activation tiers, the opt-in
`SessionStart` hook (`shared/resources/observe-work-session-start.sh`, shipped but **not** installed)
and the fallback ladder for when writing this file is refused:
[`skills/observe-work/references/environments.md`](./skills/observe-work/references/environments.md).

Two properties above are load-bearing, and both come from reported failures. The instruction demands
the **protocol by name**, because an agent that loads the skill and stops leaves nothing to surface
the omission — a loaded-but-inert skill looks identical to an active one from the user's side. And the
post-task line is the **backstop**: it forces a look at the log at every task boundary, so a session
that silently skipped the protocol is discovered at the first boundary instead of never.

## Development Pipeline

Stories are the unit of work; tasks are standalone. Pipeline reference: [`docs/operations/workflows.md`](./docs/operations/workflows.md). Walkthroughs: [`docs/runbooks/`](./docs/runbooks/README.md). Anti-patterns: [`docs/reference/anti-patterns.md`](./docs/reference/anti-patterns.md). Design rationale: [`docs/reference/faq.md`](./docs/reference/faq.md).

## Evals

Four-layer eval suite (unit → fixture → protocol → end-to-end). Hermetic layers run in CI on every push; live driver modes are opt-in. See [`docs/contributing/evals/README.md`](./docs/contributing/evals/README.md) and `evals/shared/README.md`.
