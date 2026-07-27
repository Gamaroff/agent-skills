# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **`develop-next` can now merge on Bitbucket — Step 3 was GitHub-only, making the skill inoperable on Bitbucket repos.** All four hosting calls (`gh pr merge`, `gh pr view --json headRefOid`, `gh pr checks`, and the Step 1 already-done `gh pr list`) were unconditional `gh` invocations with no platform detection, unlike `create-pr`/`qa-fix`/`create-issue` which already branch on `resolve-platform.sh`. `gh` cannot address a Bitbucket remote at all (`gh repo view` fails with *"none of the git remotes … point to a known GitHub host"*), so this was not a graceful degrade: the loop would select an item, run its full pipeline, open the PR — then halt at the merge, defeating one of the three manual gaps `develop-next` exists to close, and leaving a run-state file mid-flight on every item. Step 0 now resolves `VCS` once via the shared resolver (auto-bundled into `references/`) and Steps 1 and 3 branch on it; the GitHub path is byte-identical to before.
- **`mergeStrategy` is translated for Bitbucket rather than passed through.** The config key is documented in `gh` vocabulary (`merge`/`squash`/`rebase`) but Bitbucket's `merge_strategy` accepts a **non-overlapping** set (`merge_commit`/`squash`/`fast_forward`), so the default value `merge` is rejected outright by the API. Step 3 maps `merge → merge_commit` and `rebase → fast_forward`, and `--delete-branch` → `close_source_branch: true`. Consumers keep writing `gh` names in `skills-config.yaml`; unknown values now HALT rather than reaching the API.
- **Bitbucket CI checks are best-effort, and auth is never preflighted against `/2.0/user`.** Reading commit statuses requires the app password's `read:pipeline` scope, which PR-scoped credentials commonly lack; a `403 "credentials lack one or more required privilege scopes"` is now logged and stepped past instead of failing the merge of an otherwise-green PR (`qualityGateCommand` still runs unconditionally, on both platforms, and remains the real gate). An empty `values[]` means *no CI reported*, not *CI failed*. Relatedly, `GET /2.0/user` is explicitly rejected as a credential preflight — it needs `read:user` and returns 403 while PR and repository calls succeed, so it produces a false negative that would block every run.
- **Portable `sed` in every git-remote parser — the existing form is rejected outright by BSD `sed` (macOS default).** `s|.*bitbucket\.org[:/]([^/]+/[^/]+?)(\.git)?$|\1|` uses `+?`, a GNU extension; BSD `sed` exits with *"RE error: repetition-operator operand invalid"* on **every** input, so `BB_PATH`/`REPO_SLUG` come back empty and each subsequent API call is built against a malformed URL. Replaced with a two-pass strip (`s|.*host[:/]||; s|\.git$||`), verified equivalent across SSH, HTTPS and `.git`-less remotes. Fixes 5 call sites across `create-pr` (2), `create-issue` (2) and `qa-fix` (1) in addition to the new `develop-next` code.

### Changed

- **`develop-next`'s protocol suite grew by 4 checks** pinning the above: that every `gh` call site has a Bitbucket counterpart, that `mergeStrategy` is translated rather than forwarded, that `/2.0/user` is never used as a preflight, and that no BSD-incompatible lazy quantifier survives. The last two scan **executable content only** — fenced `bash`/`sh` blocks with shell comments stripped — because the prose deliberately names both anti-patterns in order to warn against them, and a whole-document match fired on the warnings themselves. All 4 verified to fail against the pre-fix SKILL.md.

## [v0.29.1] - 2026-07-27

### Fixed

- **`finalise` granted acceptance without ever looking at CI.** It verified the PR *review* decision (`pr_review_decision == APPROVED`) and stopped there — grepping the skill for `gh pr checks` or `statusCheckRollup` returned nothing — so an approved-but-red or approved-but-still-running PR passed the gate either way. Observed live: a task was marked `accepted` while its Playwright lane was still `queued`; the job then failed and the acceptance had to be withdrawn by hand. **Approval is a human judgement about the diff; the rollup is a machine result about the code**, and the skill was reading only the first. Adds a CI column to the decision matrix and a resolver that maps the rollup to `SUCCESS` / `FAILURE` / `PENDING` / `NONE` / `UNKNOWN`, with the raw per-job conclusions recorded in the DoD running summary so the decision stays auditable. Only `SUCCESS` accepts. `PENDING` is explicitly non-acceptance — *waiting is the correct action, assuming is not* — and `UNKNOWN` (a failed query) degrades to `PENDING` rather than to success, so the resolver cannot fail open. `NONE` is recorded in the DoD summary as *unverified by CI* instead of being silently rounded up. A green rollup on an ancestor commit is likewise called out as evidence about *that* commit.
- **`finalise` treated a previous run's acceptance banner as this run's evidence.** A reopened story/task still carries its old `## Definition of Done - PASSED ✅` / `**Status:** ACCEPTED` section verbatim in the body, and this skill reads those sections — so unless they were explicitly discounted the prior verdict was inherited wholesale. In the observed case run 1 passed 7/7, the task was reopened the same day with an eighth criterion, and the stale banner was still in the body: inheriting it would have declared 7/7 complete against a bar that now had 8 items, where the eighth was the entire reason for the reopen. `finalise` now counts prior acceptance blocks, treats every one of them as **superseded** when the document's `status:` is no longer `accepted`, re-verifies each criterion against the code, flags an unmarked stale banner as a finding in its own right (it is a trap for the next reader and the next run), and always scopes its verdict to a new `dod.{N}` file rather than editing a previous run's summary.
- **`qa-task` skipped re-review on a gate that had gone stale.** The skip branch keyed only on the *content* of the last gate — `PASS` with an empty `top_issues` — and never on whether that gate still described the current state. A reopened task carries its old `PASS` forward, so the one situation most in need of QA (work accepted and later found wanting) was precisely the one that skipped it; in the observed case the stale gate would have short-circuited the re-review that then found seven further defects. Skip now additionally requires that no source commit has landed since the gate was written, that the task document has not been edited since (`updated:` comparison), and that its status has not moved backwards from `accepted`. Any of those failing forces a re-review with the reason named in the message. **A green gate is a statement about a commit, not a property of the task.**

## [v0.29.0] - 2026-07-26

### Added

- **`develop-batch` gains a capacity-aware rolling scheduler (`scripts/schedule.mjs`)** — placement and admission move out of operator improvisation and into deterministic code. Previously the skill had **no routing seam at all**: the Step 2 dispatch directive carried exactly two placeholders (`<dir>`, `<baseBranch>`), so on a multi-machine setup *which host ran which suite* had to be hand-injected into every sub-agent prompt; Step 2 was wave-barriered, so a freed lane sat idle until its slowest sibling finished; and `maxParallel` was read as a global cap by the skill while at least one consumer's config described it as a per-host cap. New optional `developBatch.resources` declares named execution resources (`name`, `capacity`, `testCommand`, optional `env` and `probe`), with `maxParallel` now unambiguously the **global** ceiling and `capacity` the per-resource one (`min(maxParallel, sum(capacity))` when both are set). `schedule.mjs plan` returns `{admit[], hold[], inflight, globalCap}`; `resources` and `probe` are diagnostics. Placement filters to resources under static capacity, under probe-effective capacity and not saturated, then spreads by utilisation ratio with declaration order as the tiebreak. **Zero-config projects are byte-identical to before** — no `resources` yields one implicit resource at `maxParallel` and the four new directive paragraphs are omitted entirely. Exports 8 pure functions with 41 unit tests (`evals/develop-batch/unit/schedule.test.mjs`); `select-next.mjs` is deliberately untouched, since selection answers *what can run together* and scheduling answers *where and when*.
- **Capacity probes, with safety properties chosen so enabling one cannot hurt.** A probe is any shell command (`probe.command`, so `curl … | jq -e` suffices and no query-language interpreter enters this repo): exit 0 = available, exit 0 with `{"freeSlots": N}` = effective capacity `min(capacity, inflight + N)`, non-zero = saturated with the first stdout line logged as the reason, timeout/spawn-failure = **treated as available and flagged degraded**. Three invariants: a probe can only ever *subtract* capacity (static `capacity` stays the primary guard, so a probe bug slows a batch but can never overload a host); a flaky probe can never stall a batch; and placement happens **once, at admission** — no preemption, no migration — with a settle window (default = `intervalSec`) so three items cannot pile onto a "load 0.5" host in three seconds before the load average reacts.
- **`developBatch.worktreeSeedPaths`** — gitignored files copied from the main tree into each fresh worktree. A `git worktree add` carries none, and a missing runner config typically degrades *silently* (falling back to a local run) rather than failing, so a batch item can report green having never touched the machine it was assigned.
- **Interrupted is now distinct from HALTed** (`classifyStop`, `developBatch.maxResumeAttempts`, default 2). A pipeline that stopped citing an *external* directive — plan mode, a permission denial, context compaction, a user interrupt, a tool outage — is re-dispatched and **re-placed** (not pinned to its old resource, since the point is that a different one may now be idle); a pipeline that failed **its own gate** (review NO-GO, develop stall, 5 QA cycles, qa-fix no-op, DoD gaps, rebase/merge conflict) is never re-dispatched. Ambiguous text with no live `develop-pipeline.lock` **fails safe to `halt`**: wrongly halting costs one manual resume, wrongly resuming can re-run a pipeline that had already decided to stop. Exhausting the budget yields `haltKind: "interrupted-exhausted"`. Step 0 also gains an explicit **"do not run this skill in plan mode"** preflight — plan mode forbids writes, so it stops every dispatched pipeline at once.
- **Step 5.5 — immediate re-batch**, admitting rows the just-completed merges unblocked, gated by `shouldRebatch` on three guards: the previous batch must have ticked ≥1 roadmap row (the real anti-spin guard, making progress monotonic against the roadmap), the new `batch[]` id set must differ from the last, and `developBatch.maxRebatches` (default 3) must not be reached. Mid-Step-2 top-up of hard-`excluded[]` rows is explicitly refused as unsafe: while a conflicting PR is open but unmerged, a newly-admitted item branches from a base that lacks it and is guaranteed to collide at merge.
- **`references/execution-resources.md`** — the resource model, probe contract, rolling-admission loop, and a *rejected alternatives* section recording why rolling merges, capacity-aware selection, an HTTP probe type with a selector DSL, preemption, and a state `status` enum were all declined.

### Fixed

- **`schedule.mjs` resolves both sides of its direct-invocation guard through `realpath`.** Consumer projects symlink `.claude/skills` → `.agents/skills`; comparing a symlinked `process.argv[1]` against a realpath'd `import.meta.url` makes the CLI silently no-op (exit 0, no output). `select-next.mjs` still has this bug and is unchanged here.

### Changed

- **`develop-batch`'s protocol suite grew to 30 checks**, pinning the rolling loop (the old "in waves of that size" language must be gone), the background-dispatch mandate and its degraded fallback, the new directive paragraphs, the v2 state schema (and the absence of the ad-hoc `wave`/`lane` fields), the deferred-merge precondition, and Step 5.5. The banned-consumer-facts list now also rejects literal IP addresses, consumer runner-script names and host nicknames, and covers the new reference doc — it immediately caught real leaks in this change's own worked examples.

## [v0.28.0] - 2026-07-23

### Added

- **`develop-batch` skill** — parallel roadmap orchestrator, the fan-out sibling of `develop-next` (which builds one item at a time). Selects the maximal set of unblocked, **write-disjoint** roadmap items (via `select-next.mjs --batch`), fans each into its own git worktree, runs their `/develop-story` or `/develop-task` pipelines concurrently and fully autonomously, then merges the green PRs **serially** — rebasing each on the new base tip — and ticks the roadmap + Change Log per item. Develop in parallel, merge serially. Crash-safe via a batch run-state file (`.claude/state/develop-batch.state.json`), so re-running resumes where the last run stopped and a crash between any item's merge and tick can never re-select or re-dispatch it. Stops at an empty frontier, manual/blocked rows, planning gaps, or any pipeline HALT. Invoke with `/develop-batch`, `/develop-batch --dry-run` (read-only batch preview — fetch only, no worktrees/state), or wrap in `/loop /develop-batch` for continuous runs. Adds one batch-only config key `developBatch.maxParallel` (default `4`, waves beyond it) and otherwise reuses every `developNext.*` key (roadmap, base branch, merge gate, strategy) so single-item and batch runs never diverge. `create-branch` gains a linked-worktree-safe exception (branches from the base ref without checking it out). Ships a protocol test suite (`evals/develop-batch/`).
- **`develop-batch` warns when the `--batch` selector co-schedules multiple un-annotated `touches:` rows, and can defer them.** A roadmap row with no `touches:` field defaults to `+own` (assumed to share no resource) and never hard-conflicts, so several un-annotated rows could be fanned out in parallel on the silent assumption that they are write-disjoint — an authoring failure mode. The selector now preserves whether the field was written at all (an explicit `touches: +own`/`-` is a deliberate "no shared resource" declaration; an absent field is a forgotten annotation), emits a `lint.warnings` line plus a structured `unannotated[]` when ≥2 field-less rows land in the same batch, and — under the new opt-in `developBatch.requireTouches` config key (default `false`, non-breaking) or the `select-next.mjs --require-touches` flag — defers all but one un-annotated row per batch so an unverified write footprint can never over-parallelize. A lone un-annotated row stays silent (not a co-scheduling risk); a deliberate `+own` is never flagged. 5 new selector unit tests and a protocol assertion.

## [v0.27.0] - 2026-07-23

### Added

- **`develop-next` gains a `--batch` parallel-worktree planning mode.** `node .agents/skills/develop-next/scripts/select-next.mjs --batch` returns the maximal set of roadmap rows that are both dependency-ready (the exact predicate single-item selection uses) **and** write-disjoint, for fanning work out across git worktrees. It's a planning aid orthogonal to selection — selection answers "what's next", batch answers "what can N agents safely do at once" — and is advisory only: it emits a plan (`batch[]`, `excluded[]` hard conflicts, `softOverlaps[]` accepted rebase points, `skippedPhases[]`, and `git worktree add … develop` commands) and runs nothing. Reads a new optional `touches:` write-footprint field on roadmap rows (comma-separated resource tags, each `!` hard/exclusive or `~`/unmarked soft/additive; `+own`/`-` = no shared resource), terminated by ` · ` so it never disturbs the `deps:`/`gate:`/`flag:` captures beside it. Two rows hard-conflict when they share a tag either side marks `!`; soft overlaps are allowed and surfaced. Phase discipline is relaxed for planning — batch advances past a phase whose ready frontier is empty (recording it) rather than STOPping like the autonomous loop. Single-item selection is unchanged (pinned by a parity test). Documented in `references/roadmap-selection.md` §Parallel batch, with 6 new unit tests (suite 12).

### Added

- **`shared/resources/generate-prd-epic-index.mjs`** — the epic-creating skills now emit and refresh a PRD→epic index automatically, so a consumer's `docs:epic-index:check` never fails in normal flow. The generator injects a marker-delimited `## Epics` table (`<!-- epics-index-start --> … <!-- epics-index-end -->`) into each sharded sub-PRD (`prd.<feature>.md`), linking down to its child epic files with each epic's status — closing the PRD↔epic loop (the reverse `prd_source` link already existed). Promoted verbatim from the `rebirth-wallet` consumer copy (byte-for-byte output preserved — same markers, table header, auto-generated line, H1 placement, numeric sort) with two generalizations: the PRD root is no longer hardcoded (resolves `--prd-root` → `prd.prdShardedLocation` in `skills-config.yaml` → default `docs/prd`), and a new `--strict` flag turns a canonical epic file missing `epic_number` into a hard error instead of a silent skip. Keeps `--check` (CI drift gate) and `*.review.*.md` exclusion. Dependency-free (Node stdlib only). Covered by a new `shared/resources/tests/generate-prd-epic-index.test.mjs` suite (idempotency, review exclusion, relative-link shape, `--check` exit codes, `--strict`, and PRD-root resolution) wired into `npm test`.
- **`create-epics-from-shards`, `create-epic`, and `sync-jira-epic` regenerate the PRD epic index** after they write/update epics and the epic-registry. New final step in each runs the vendored `scripts/generate-prd-epic-index.mjs` (falling back to the skill's bundled `references/` copy), then stages the changed `prd.*.md` in the same commit. `sync-jira-epic` runs it post-sync so a status transition is reflected in the index.

### Changed

- **`create-epics-from-shards` now writes `epic_number` into new epic frontmatter.** It previously embedded the number only in the `title`/filename, so the index generator (which keys off `epic_number`) would silently skip those epics — the exact gap `--strict` now guards. Aligns with the required-field schema in `docs/standards/epic-documents.md` and with `create-epic` (which already wrote it).
- **The bundler/packager understand `.mjs`.** `bundle_skill.py` maps `.mjs` to the `//` auto-generated header comment and inserts it after a `#!/usr/bin/env node` shebang; `REFS_REF_RE` now discovers already-bundled `references/*.mjs` on re-runs. `package_skill.py` already zips `.mjs` verbatim.
- **`setup-consumer.sh` vendors the generator to the consumer's canonical `scripts/generate-prd-epic-index.mjs`** on install and `--update`, sourced from the release's `shared/resources/`, so the CI script and the skills' logic are one vendor-managed file. **Consumer note:** this file is now vendor-managed — do not hand-edit it downstream (it is currently hand-authored in `rebirth-wallet`); change it in agent-skills and re-run `--update`.

## [v0.25.0] - 2026-07-21

### Added

- **`review-bug` skill** — bug-report review, the bug-side sibling of `review-story`/`review-task`. Dual-mode (interactive default + `--validate` GO/NO-GO with a 1–10 fix-readiness score). Checks template/frontmatter compliance, reproducibility *from the report*, severity/priority correctness, and mode/linkage; runs two read-only pre-pass Explore scans — a **duplicate scan** (sibling bugs + `bug-registry`) and an **already-fixed/stale scan** of the root-cause area. Emits READY TO FIX / NEEDS DETAIL / DUPLICATE / STALE. Never mutates the bug lifecycle `status`; may edit the report to add missing detail. Slots into `develop-bug` as its Step 2 gate (validate-and-apply). Handles story / task / general bugs.
- **`develop-bug` skill** — end-to-end bug-fix lifecycle orchestrator. Takes an existing bug report (story / task / general mode) and runs it from open to a closed, verified, documented fix: create-branch → reproduce & triage → investigate & fix → create-pr → verify & fix loop (bounded, up to 5 cycles) → finalise & close → commit-changes. Researches the root cause, implements the fix plus a regression test, and writes the fix record (Investigation, Fix Implementation, QA Verification, and the `## Resolution Summary` that closes the bug) back into the bug file. Supports both bugfix (off `develop`) and production-hotfix (off `main`) branch models. Reuses the shared develop-pipeline hooks / lock / resume / autonomous-defaults infrastructure with bug-specific step docs. Fills the gap between `create-bug-report` (creates the file) and `qa-fix` (interim fix record, stops at `ready-for-qa`). Includes a docs contract test suite wired into `npm test`.

### Changed

- **`develop-bug` Step 2 is now `/review-bug`** (validate-and-apply), replacing the previous bespoke "reproduce & triage" step — full symmetry with `develop-story`/`develop-task` Step 2. The actual reproduce folds into Step 3 (investigate & fix). The pipeline now HALTs on a duplicate, already-fixed, or under-specified bug before any fix work.
- **`review-pipeline-step-0a-branch-setup.md`** gains a `review-bug` variant (validate-mode short-circuit, bug-branch auto-skip, base default `develop`) — additive; review-story/task/epic behaviour unchanged.
- **`develop-pipeline-install-hooks.sh`** now also discovers `develop-bug` hook script dirs; **`develop-pipeline-on-stop.sh`** gains a `develop-bug` arm with its own step-name map (Step 2 = REVIEW BUG) — additive, story/task behaviour unchanged.
- Cross-linked `review-bug` + `develop-bug` from `create-bug-report`, `qa-fix`, `docs/standards/bug-documents.md`, and `docs/operations/workflows.md` (Bug pipeline: `create-bug-report → review-bug → develop-bug`).

## [v0.24.0] - 2026-07-21

### Added

- **`create-bug-report` gains a third mode for general (ownerless) bugs** — cross-cutting sweep bugs with no single story or task owner. General bugs live in `docs/bugs/bug.{N}.{name}/` with global, never-reused numbering allocated from `docs/bugs/bug-registry.md` (bootstrapped on first use), mirroring the task-registry mechanics. The skill now opens with a 3-mode type decision (story / task / general). The previously-duplicated inline bug template is consolidated into a single bundled `assets/bug-report-template.md` (now carrying OKF `type: bug` frontmatter), shared across all three modes, and the dangling `docs/templates/bug-report-template.md` reference is removed. New schema and rules docs land at `docs/standards/bug-documents.md` and `docs/standards/bug-registry.md`, with a Bug Registry TL;DR added to `AGENTS.md` and the `file-naming.md` core-document table.

### Changed

- **Story development switched from an epic-integration-branch model to flat Gitflow feature branches.** `develop-story` previously cut a long-lived `feature/epic.{n}.{name}` branch from `develop` (Step 1a `create-epic-branch`), branched each story off _that_, targeted story PRs at it, and left `develop-next` to promote the epic branch to `develop` only once every story in the epic was accepted. Long-lived integration branches drift from `develop`, defer integration (the one thing CI exists to force), and end in a big-bang merge — the less-recommended pattern. Story branches are now cut from `develop` and PR back to `develop`, short-lived and integrated continuously; epics remain an organisational construct (Jira/docs) and are never a git branch. Concretely: Step 1a is gone (Step 1 is just `create-story-branch`); Phase 0d asks the same two questions as `develop-task` (Q1 branch base, Q2 PR target, both defaulting to `develop`, both overridable — e.g. `main` for a hotfix story) rather than an epic-branch creation/confirmation prompt; Step 4 targets the resolved Q2 base. `develop-next` drops the epic-completion check, the epic→`develop` promotion, and the "epic boundary" stop — story PRs merge straight to the base branch and the loop runs continuously across epics (`select-next.mjs` loses its now-dead `--epic-status`/`epicStatus` surface; `T`-row exclusion from epic sections is retained for selection). The review pipeline (`review-story`, `review-epic`, `review-task`) is flattened the same way: `review-story` branches a story feature branch from `develop` with no epic-branch resolution; `review-epic` still creates a `feature/epic.{n}.{name}` branch, now framed explicitly as an ordinary epic-**document** feature branch (from `develop`, PR to `develop`), not an integration branch. `create-branch`'s Gitflow reference and every affected SKILL.md/README were updated to match, and the eval protocol/unit tests + scenario fixtures were rewritten to pin the flat contract (story branch base = `develop`, PR target = `develop`, no `create-epic-branch` step). **Consumer note:** in-flight epics that already have a `feature/epic.*` integration branch should be merged to `develop` manually on next release; new stories will branch from `develop` regardless.

### Fixed

- **The pre-commit hook rewrote your commit, sweeping in bundled copies whose source the commit did not carry:** it ran `git add skills/*/references/` unconditionally, staging every pending bundle change. Two failures followed, both silent, and both biting exactly when work is split into logical commits. First, a commit touching any `SKILL.md` absorbed unrelated bundled copies. Second and worse, `npm run bundle` regenerates from the **working tree** while a commit carries the **index**, so the blanket add could stage bundles built from `shared/resources/` edits deliberately left unstaged — producing commits whose bundled copies had no corresponding source at all. Hit while committing the v0.23.2 lite-mode fix: a naming-conventions-only commit absorbed four step-0 bundles built from unstaged shared source, and had to be reset and reordered. The hook now snapshots the dirty set under `skills/*/references/` before and after bundling and stages only the difference — what that run produced. The normal flow (edit a shared resource, stage it, commit) is unchanged and still auto-stages the bundles it generates; pre-existing drift is left alone and reported rather than swept in; and if bundling changes `references/` while a shared source has unstaged edits, the hook now **fails** rather than commit copies embedding source the commit does not include. (The complete fix for that last case is bundling from the index via `git stash --keep-index`; rejected because stashing inside hooks is fragile — an aborted commit can strand work in a stash.) One subtlety is called out in the hook itself: `REFS_PATHSPEC='skills/*/references/*'` needs its trailing `*`, because as a _git pathspec_ `skills/*/references/` matches nothing — unlike the _shell_ glob the old `git add` relied on, which the shell expanded to real directories first. Getting it wrong makes every set silently empty, so the hook stages nothing and source lands without its bundles — the same drift inverted. Verified against all three cases: pre-existing drift left unstaged with only the intended file committed; normal flow auto-staging source plus all bundled copies; unstaged shared source exiting 1 with an actionable message.

## [v0.23.2] - 2026-07-16

### Fixed

- **Phase-0 lite-mode detection instructed every consumer to run a CLI that has never existed, then told it not to use the only path that worked:** `develop-pipeline-step-0-resolve-and-prepare.md` ordered Agent 3 to `npm run lite-mode` — "do NOT re-evaluate the FR3/FR17 conditions in prose" — claiming the CLI wrapped "production parsers" (`parseLiteModeInputs` / `decideLiteMode` / `parseSuccessCriteria`) for a byte-identical decision. No such CLI, npm script, or parser exists in this repo or in its history; the entire subsystem was fabricated by v0.13.0's `607380a`, which cited `[task.16/M3]` for authority (task.16 is `review-story-prepass-subagent` and mentions none of it). Every `/develop-story`, `/develop-task`, `/qa-story`, `/qa-task` run in every consumer since has failed the command and taken the documented fallback — prose evaluation, the exact thing the instruction forbade — so the docs asserted a rigour the shipped artifact could never deliver, and implementation reports inherited the claim. This was **not** a bundling miss: there was nothing to bundle. Prose evaluation is now the documented primary path, framed as normal rather than degraded, with the extraction rule for each input stated (`risk_level` absent ⇒ `"absent"`, never inferred from tone; an arguable module boundary ⇒ `single_module: false`, since `standard` is the safe default and lite mode shortens QA). Agent 3 no longer returns `pipeline_mode` at all — the Aggregation block already recomputed `PIPELINE_MODE` from the three booleans as defence-in-depth, and no other step consumed the field, so removing it deletes the drift surface rather than detecting it. Resolves the contradiction with `develop-pipeline-lite-mode.md`, the canonical contract, which always said the mode is decided "after reading the document" and never mentioned a CLI.
- **`develop-story` / `develop-task` SKILL.md documented a Mastra execution surface that does not exist:** the "Execution Surfaces" section described a `developStoryWorkflow` / `developTaskWorkflow` at `src/mastra/pipelines/`, a factory at `create-develop-pipeline.ts`, four named `state.approvalGates`, and a table of halt-time behaviour differences readers were warned "do not assume parity" about. `src/mastra` has never existed in this repo's history — same fabricating commit as the lite-mode CLI. Section removed from both skills.

- **`qa-story` / `qa-task` shipped a step-0 doc pointing at `develop-pipeline-autonomous-defaults.md`, which was never bundled into either skill:** found by sweeping the live shipping surface after the lite-mode fix. This is a genuine instance of the defect class the lite-mode report _hypothesised_ — a referenced file that exists at source but never reaches consumers. Root cause is a bundler blind spot worth knowing about: `bundle_skill.py` detects dependencies **only** via the literal `shared/resources/X` string, so a shared doc referred to by its **post-bundle** name (`references/X.md`) is silently un-declared. `develop-story`/`develop-task` received the file only by accident — they also bundle `step-2-review.md`, which happens to cite the `shared/resources/` form — while `qa-story`/`qa-task`, which don't bundle step-2, got nothing. Fixed by writing all five such refs (across step-0, step-3-develop-loop, and autonomous-defaults itself) in the `shared/resources/` form: the bundler copies the file **and** rewrites the ref back to `references/X`, so bundled output is byte-for-byte unchanged (the four step-0 copies keep md5 `6602de0f…`) while the dependency becomes visible. Only rewrote refs whose target actually exists in `shared/resources/`, so the pass can't invent a dependency.
- **Four skills pointed at `docs/standards/naming-conventions.md`, which has never existed in this repo:** the file is `docs/standards/file-naming.md`. Worst in `enforce-standards`, whose protocol opens _"Read `docs/standards/naming-conventions.md` to refresh on naming rules"_ — so the skill named for enforcing naming conventions silently proceeded without them. Also cited by `create-bug-report` (×2), `review-epic`, and `review-prd`. Predates the fabricated-CLI commits (2026-05-11 or earlier); same failure shape — prose pointing at something that was never there, failing silently.

### Added

- **Bundle-time guard against instructing consumers to run what we don't ship** (`tests/executable-instructions.test.js`, in the existing `tests/*.test.js` CI glob): every interpreter invocation in skill prose (`node x.ts`, `bash references/y.sh`) must resolve to a real file, and every `npm run X` must be in our `package.json` or explicitly classified in `CONSUMER_PROVIDED_NPM_SCRIPTS` — making the ours-vs-theirs call a deliberate act rather than an omission. Deliberately narrow, because a guard that cries wolf gets disabled: it targets imperative invocations only, never paths that prose merely _describes_. Ambiguity is resolved structurally — a bare `scripts/x.sh` is ours when the owning skill ships a `scripts/` dir (`create-skill`) and the consumer's when it doesn't (`deploy-remote`) — and bare filenames, absolute paths, and `{placeholder}` forms are skipped as unjudgeable. Verified by construction: it flagged the four stale lite-mode bundles and nothing else before the fix, and is green after.
- **The same guard covers doc references**, since a doc a skill is told to _read_ is as load-bearing as a script it is told to run, and an unreadable one fails just as silently. Every `references/X.md` must resolve within its skill, and every `docs/{standards,reference,operations,contributing,runbooks}/X.md` must exist. In `shared/resources/`, a `references/X.md` ref naming a real shared doc is itself the failure — that spelling is invisible to the bundler — and the message says to write `shared/resources/X.md` instead. Verified by construction against both bugs it was written for: reintroducing either makes it fail. `create-skill/SKILL.md` is exempt from the doc-ref check alone (as the authoring guide, its `references/finance.md`-style refs illustrate a hypothetical skill's layout rather than files it ships); its scripts remain covered.

## [v0.23.1] - 2026-07-15

### Fixed

- **`develop-next` silently dropped `T`-prefixed task dependencies, dispatching work whose hard prerequisite was unbuilt:** the selector's item-id grammar was digit-anchored, so a standalone-task row (`T22`) parsed as id-less — benign in itself, but it also meant `deps: T22` on a dependent row was discarded with only a lint warning (`dep segment "T22" on 28.2 has no item id — ignored`), one of ~35 on a real roadmap. The dependent then carried an incomplete dep set and `/develop-next` would select and build it while its declared prerequisite was still outstanding: the selector failed **open**, on the single decision it exists to get right. Found in a consumer repo where `deps: T22` gated an epic's stories behind an engine migration — the loop would have built them against the old engine. `ID_RE_SRC` now accepts an optional `T` prefix (load-bearing: a Task 22 and an Epic 22 can both exist, so a bare `22` would be ambiguous; `T` must be followed by a digit, so prose like "Task 22" still reads as `22`). `T`-rows are excluded from epic completion sets — such a row lives in its _consumer_ epic's section for readability but is not a story of it, and without this exclusion, making it parseable would strand that epic's promotion forever; they stay in `byId`/`idInstances`, so deps still resolve. `references/roadmap-selection.md` gains an "Item ids" section: the convention previously had no written home, which is how it drifted from the parser in the first place. **Consumer note:** a `T`-row with no `⏭️`/`manual` marker is now an ordinary candidate and **will** be auto-selected when reached. That is the intended fix, but any repo relying on a T-row being unreachable should mark it `⏭️ SKIP` to state that policy explicitly.
- **`develop-next` now warns when a dep is satisfied only because its target is `⏭️ SKIP`:** `idDone()` counts an all-SKIP id as done, so such deps passed mute. The behaviour is intended — a deferred block must not stall the loop — but it is the same silently-satisfied-dep family as the bug above, so it is now surfaced (`X dep Y is ⏭️ SKIP — dep treated as satisfied`) rather than left invisible.
- **`develop-next` recognises `deps: —` as no-deps:** `\b` cannot follow a dash (both sides non-word), so the old `…|-)\b` alternation never matched an em-dash and every such row emitted a spurious "has no item id — ignored" — noise in the exact channel that hid the dropped `deps: T22`.

## [v0.23.0] - 2026-07-15

### Added

- **Relative markdown links now resolve to absolute Bitbucket URLs in Jira descriptions:** a link written relative to a doc's own directory (`[runbook](task.4.runbook.md)`) resolves fine in a Bitbucket file viewer but is dead the moment that prose is copied into a Jira description — Jira has no "relative to this file" base path. `shared/resources/jira-sync.js` gains `resolveRelativeLink` / `makeRelativeLinkResolver`, threaded as an optional `linkResolver` through `textToAdfNodes` → `blockToAdf` → `tableLinesToAdf` → `inlineMarkdownToAdf`, so links resolve in prose, list items, and table cells alike. `#fragments` are preserved. Links carrying a scheme (`http:`, `mailto:`), in-page anchors, and targets that do not exist on disk are deliberately left as-authored — a broken link stays visibly broken rather than being masked by a confident-looking URL that 404s. Wired into `sync-jira-story`, `sync-jira-epic`, and `sync-jira-task`; requires a detectable Bitbucket repo (`bitbucket.org` remote or `BITBUCKET_REPO_URL`) and silently no-ops back to prior behaviour without one.
- **Jira "Source Documents" now cross-links each doc's companions,** discovered structurally from the filesystem rather than from a frontmatter field nobody remembers to update, so new companions appear on the next sync with no manual step. The three doc types have different folder shapes, so each discovers what it actually has instead of sharing one wrong abstraction: **tasks** link flat siblings (runbooks, scan reports); **stories** link their durable artifacts (plan, review, QA, implementation, DoD) and skip point-in-time ones (dated `validate.<date>` runs, `sprint-review-summary.md`, non-`.md` gate files) because those age out and a stale link is worse than none; **epics** link child story cards under `stories/<story-dir>/`, identified by the card matching its own directory name rather than a blocklist of artifact types that would rot as new kinds appear, ordered numerically so `story.2.10` follows `story.2.2`. Repeated story artifact types are qualified by instance ("Story review 1", "Story review 2").

### Changed

- **`hashBody` in all three `sync-jira-*` scripts now incorporates the link resolver and related-doc links.** Without this the change-detection hash could match while the rendered description differed, silently skipping the Jira update. This adds no new branch sensitivity — the hash already embedded branch via the `*BbUrl` fields. **Operational note:** because the hash's shape changed, the first sync of each already-synced doc rewrites its Jira description and appends one `Updated: description` Change Log entry, including for docs containing no links at all. This is one-time; subsequent syncs are quiet again.

### Fixed

- **`sync-jira-story.js` was invisible to grep:** `withCodeBlocksMasked` used raw NUL bytes as fenced-code-block placeholders, embedded directly in the source rather than written as escape sequences. A single NUL makes the whole file "binary" to `file(1)`, GNU grep, and ugrep, so the script was silently skipped by every recursive grep over the repo — it never appeared in results, and nothing signalled it had been passed over. Now uses `\x01` written as a source escape, matching the existing placeholder convention in `jira-sync.js` (`PH = "\x01"`); the two never share text, so no collision is possible. Runtime behaviour is unchanged — the file on disk is simply plain UTF-8 again.
- **`npm test` never ran four skill test suites:** the `test` script enumerates test paths as explicit per-skill globs rather than discovering `skills/*/tests/`, so `sync-jira-epic`, `sync-jira-story`, `sync-jira-task` (node) and `jira-sprint-review-prep` (shell) had never executed — locally or in CI, which only invokes `npm test`. That was 232 passing tests providing no protection: the suite went green precisely _because_ they never ran. All four pass as-is, so wiring them in only added coverage (239 → 471 tests, zero failures), confirming they were unrun rather than broken. Adding a new `skills/<name>/tests/` still requires adding its glob by hand.

## [v0.22.0] - 2026-07-13

### Changed

- **`develop-next` reworked around a deterministic roadmap selector:** item selection moved from SKILL.md prose to `scripts/select-next.mjs` (parser + algorithm + linter, JSON output) — the unattended loop's highest-stakes decision is now unit-tested code. Parsing is tolerant (a roadmap is a living backlog: a dep naming no current row means "shipped", not error; only a file with no parseable rows halts) and models the real marker vocabulary: `⏭️ SKIP` (non-blocking defer), epic-level and slash-group deps, strikethrough recaps, `-NFR`-suffixed ids, `gate:`/`flag:`, `⛔ BLOCKED`, and story paths from `[story](…)` links. `--dry-run` is now genuinely read-only (fetch only); a run-state file makes merge→tick crash-safe and idempotent; epic promotion uses `--assume-ticked` (decoupled from tick ordering); the merge gate verifies the PR `headRefOid` against local HEAD plus `gh pr checks`; `/create-*` rows stop the loop before authoring; a missing roadmap offers to scaffold from `assets/project-completion-roadmap.template.md` rather than fabricating work.
- **`develop-next` consumer-specific facts moved to config:** roadmap path, base branch, quality-gate command, and merge strategy are now `developNext.*` keys in `skills-config.yaml` (`docs/reference/configuration.md`), replacing values hard-coded into the library skill.

### Added

- **Four-layer eval suite for `develop-next`** (previously none): unit tests over the selector (one fixture per rule, both sides of each boundary, plus a synthetic real-world-shaped roadmap), protocol tests for SKILL.md invariants incl. a no-consumer-facts guard, replay/CI step-isolation scenarios, and a live smoke. The two riskiest rules (SKIP-non-blocking, archived-dep tolerance) are sabotage-verified. Wired into `npm test` and `npm run eval:develop-next[:smoke]`.

## [v0.21.0] - 2026-07-11

### Added

- **New `develop-next` skill — roadmap loop orchestrator:** selects the next unblocked item from the consumer project's `docs/development/project-completion-roadmap.md` (deterministic selection rules in `references/roadmap-selection.md`: phase boundaries, `deps:` vs ship-`gate:` vs `flag:`, `manual`/`⛔`/`🚧` skips, `→`/`‖` flow), dispatches `/develop-story`/`/develop-task` with an AUTONOMOUS RUN directive that auto-answers the Phase 0d Upfront Setup prompt with the auto-derived recommended options (recorded in the Decisions Log), verifies green (QA gate PASS + local lint/typecheck/test — consumer CI on PRs may not exist yet), merges the PR (`env gh pr merge --merge`; story→epic, and epic→develop when the epic's last story lands), ticks the roadmap `[x]` + Change Log, and reports. Stops (with a push notification) at epic boundaries, `manual`/ops/legal-gated items, authoring items (`/create-story`/`/create-epic`), any pipeline HALT, or a merge/quality-gate failure. Supports `--dry-run` (selection rationale only) and continuous runs via `/loop /develop-next` (self-paced; one item per iteration). Re-enters a live `develop-pipeline.lock` run's resume path instead of selecting a new item. One-time consumer setup (pipeline hooks, permission allowlist incl. `env gh pr merge`, acceptEdits mode) documented in the skill README. No shared-resource references — bundling is a no-op. Catalog category: Development — Orchestration.

## [v0.20.0] - 2026-07-09

### Added

- **`github.projectEstimateField` config key resolves the GitHub Projects estimate field name:** `shared/resources/set-github-project-estimate.sh` now resolves the estimate field name from the `GH_PROJECT_ESTIMATE_FIELD` env var (precedence), then `github.projectEstimateField` in `skills-config.yaml` (parsed via Python `yaml` with an `awk` fallback), falling back to the built-in default `"Estimate"`. This lets projects whose GitHub Projects board names the field something other than "Estimate" mirror story/task estimates without patching the script. Consumed by `ensure-story-github-issue`, `ensure-task-github-issue`, `sync-github-story`, and `sync-github-task` (bundled `references/` copies updated). The new key is documented in `docs/reference/configuration.md` with a worked example and resolution/failure-mode notes.

### Changed

- **`documentation-standards-validator` documents the story plan filename pattern:** `story.EPIC.STORY.plan.descriptive-name.md`, co-located in the story's subdirectory, is now the documented required naming pattern for story plan files, with a corresponding checklist item for validating plan filenames.

### Fixed

- **`develop-pipeline` Stop/PreCompact hooks are now cwd-independent:** the registered hook `command` was a bare relative path (`bash .agents/skills/.../on-stop.sh`), which Claude Code resolves against the shell's cwd at hook-fire time — so it broke with "No such file or directory" the moment any command in the session had `cd`'d into a subdirectory, even though the script existed (regression reported 2026-07-09). Both installers (`shared/resources/develop-pipeline-install-hooks.sh` and the inline patcher in `scripts/setup-consumer.sh`) now emit `bash "${CLAUDE_PROJECT_DIR}/<base>/on-{event}.sh"`, with the literal, escaped `${CLAUDE_PROJECT_DIR}` expanded to the project root at fire time, independent of cwd. New exact-match de-registration helpers run across all candidate bases before patching, so a re-run migrates a legacy bare-relative entry in place instead of stacking a second still-broken one alongside the fix. A behavioural eval (`install-hooks-behavior.test.mjs`) plus static guards cover the migration, subdir resolution, and the legacy form as a negative control. Bundled `references/` copies (`develop-story`, `develop-task`, `develop`) updated to match.
- **`skills-config.yaml` Jira parser now strips YAML inline `#` comments:** the hand-rolled scalar/status-map parser in `shared/resources/jira-sync.js` captured everything after the colon verbatim, so a value carrying a trailing comment — e.g. `devEstimateField: customfield_10594 # optional — ...` — was passed to Jira including the comment text, which Jira rejected on issue creation. This was self-inflicted: `setup-consumer.sh` scaffolds exactly that shape (a commented `devEstimateField` hint plus a `statusMap:` opener with a trailing `# local document status -> ...` comment). The `statusMap:` opener regex also required nothing after the colon, so the scaffolded `statusMap` block was **silently dropped** whenever the trailing comment was present. New quote-aware `stripInlineComment()` helper (a `#` starts a comment only at the start of the token or when preceded by whitespace, never inside quotes — matching YAML) is applied to `parseJiraScalar()` and `parseStatusMapBlock()` value captures; the `jira:` and `statusMap:` block-opener regexes now tolerate a trailing comment. A `#` that is part of a value (`abc#def`) or inside quotes is preserved. The `.env` loader is intentionally left unchanged (secrets can contain `#`). Regression tests added to the `sync-jira-story`/`sync-jira-task`/`sync-jira-epic` suites; bundled `references/` copies regenerated.

## [v0.19.1] - 2026-06-30

### Changed

- **`develop-pipeline` reference docs document the Stop-hook re-prompt-on-pause as expected behaviour (not a bug):** `shared/resources/develop-pipeline-hooks.md` now explains that `stop_hook_active` only suppresses a _second_ block within the **same** stop attempt, so every mid-step pause (most commonly while waiting on background subagents, or any pause while `current_step` is in `[1, 7]`) is a _fresh_ stop attempt that re-fires the continue-prompt — the hook has no signal for "background work is in flight." The correct response is to ignore the re-prompt and keep working, performing the Bash → Edit → banner → invoke transition only once the step's own work and gates have completed; advancing early is the actual failure mode. A new troubleshooting-table row captures the same guidance. Bundled per-skill `references/` copies (`develop-story`, `develop-task`) updated to match.

## [v0.19.0] - 2026-06-30

### Added

- **`jira.devEstimateField` config key mirrors a story/task's `estimated_effort_hours` onto a Jira numeric custom field:** in addition to the built-in `timetracking.originalEstimate`, `sync-jira-story` and `sync-jira-task` now optionally write the numeric estimate to a configured custom field (e.g. `customfield_xxxxx` backing a "Dev Estimate (hour)" field). The field id is resolved from the `JIRA_DEV_ESTIMATE_FIELD` env var (precedence) or `jira.devEstimateField` in `skills-config.yaml`; unset → the field is skipped (no behaviour change). Numeric `estimated_effort_hours` is written as a raw number; non-numeric values are skipped. Create and update are resilient — if Jira rejects the configured field (wrong id, not on the screen), the sync warns, drops just that field, and retries, so a misconfigured field can never block the sync (the existing single-field timetracking strip path was generalised to drop multiple rejected fields from one 400). Implemented via two new pure, unit-tested helpers in `shared/resources/jira-sync.js` — `parseJiraScalar()` (a no-YAML-dependency indentation scanner for direct children of the `jira:` block) and `loadDevEstimateField()` — bundled into the `create-story`, `create-task`, `sync-jira-epic`, `sync-jira-story`, and `sync-jira-task` `references/`. `setup-consumer.sh` scaffolds a commented `devEstimateField` hint in the generated Jira config block; `docs/reference/configuration.md` documents the key (table row + "Jira estimate field" section + worked example), cross-linked from `docs/standards/{story,task}-documents.md` and both SKILL.md files.

### Changed

- **`setup-consumer.sh` scaffolds an active `jira.statusMap` block in the generated `skills-config.yaml` when tracker is Jira:** the setup wizard previously emitted only `tracker: jira`. It now also emits a `jira.statusMap` block keyed by the canonical kebab-case lifecycle statuses (`draft`, `planned`, `ready-for-development`, `in-progress`, `ready-for-review`, `accepted`, `cancelled`) mapped to the built-in default Jira targets, ready for consumers to edit to match their own workflow. Canonical kebab-case keys are used deliberately — underscore keys (e.g. `in_progress`) never match real statuses because `mapStatus()` does not normalise `_`↔`-`. The `docs/reference/configuration.md` worked example is kept in sync.

## [v0.18.0] - 2026-06-29

### Added

- **Open Knowledge Format (OKF) v0.1 conformance for document tooling (task.35):** a new single-source-of-truth mapping doc `shared/resources/open-knowledge-format.md` documents the repo's conformance (`okf_version: "0.1"`), the `updated` ≡ OKF `timestamp` and tracker-URL (`github_url`/`jira_url`, or derived from `github_issue`) ≡ OKF `resource` mappings, the validation severities, the migration path for existing docs, and the intentionally out-of-scope OKF features. Linked from `AGENTS.md` and all four `docs/standards/{epic,story,task,prd}-documents.md` schemas, and bundled into the ten consuming `create-*`/`review-*`/`documentation-standards-validator` skills.

### Changed

- **Document templates and skills now emit OKF recommended fields (task.35, additive, going-forward only):** every document template emits a non-empty `type` (OKF's one hard requirement). `skills/create-task/resources/task-template.md` was converted from a bold-line header to a YAML frontmatter block (`id`, `title`, `type: task`, `description`, optional `tags`, `category`, `status`, `priority`, `created`, `updated`, `assignee`). `docs/templates/epic-template.md` and the `create-task`/`create-epic`/`create-story`/`create-prd`/`create-doc` skills now emit `type`, a recommended `description`, and optional `tags`. `docs/standards/{epic,story,task}-documents.md` gained `description`/`tags`/`resource` schema rows + the `updated`≡`timestamp` mapping note; `docs/standards/prd-documents.md` gained a full frontmatter schema table (it previously had none). No existing `docs/` document was retrofitted.
- **Review tooling enforces OKF `type` (task.35):** `review-epic`, `review-story`, `review-task`, `review-prd`, and `documentation-standards-validator` now flag a missing/empty `type` as **Critical**, a missing `description` as **Important**, and malformed `tags`/`resource` as **Optional**. Previously `review-epic` and `documentation-standards-validator` did not enforce `type`. Existing docs are not retrofitted — the gate applies to docs created/edited under the updated skills (a one-line `type:` fix on next review).

## [v0.17.1] - 2026-06-27

### Fixed

- **`develop-pipeline` PreCompact hook now snapshots resume state before it removes the pipeline lock (task.48):** the `develop-pipeline-on-precompact.sh` hook removed the lock via an unconditional `trap 'rm -f "$LOCK"' EXIT`. A harness kill (SIGTERM/timeout) before the graceful-pause flow completed still fired the trap, deleting the lock with **no resume artifact** — leaving the pipeline both unlocked _and_ un-resumable (no lock, no `last-halt.json` for Phase 0b; observed live in the task.46 run). The hook now writes `develop-pipeline.last-halt.json` (a lock superset tagged `pause_reason: "precompact"`, `paused_at`, `halt_step = current_step`) **once, early** — before the EXIT trap is armed and before any `rm` — with a `cp` fallback that still preserves `current_step` when `jq` is absent. `LOCK` is parameterised via `PIPELINE_LOCK` (mirroring `advance-pipeline-lock.sh`) so the hook can be sandboxed in tests. New regression test `develop-pipeline-on-precompact.test.sh` (wired into `npm test`) covers the jq-absent mid-run kill, the success path (snapshot tagged, `PIPELINE-PAUSE-SIGNAL` still emitted), and the no-lock re-fire noop. Docs (`develop-pipeline-hooks.md`, `develop-pipeline-pause.md`, `pipeline-resume-detector-prompt.md`) note the snapshot-before-removal guarantee and that the resume detector reads `pause_reason` for precompact snapshots. Bundled per-skill `references/` copies updated to match.

## [v0.17.0] - 2026-06-27

### Added

- **New `review-code` skill (`/review-code`):** a standalone, self-hosted alternative to the built-in `/code-review`. Runs the same adversarial diff reviewer the QA skills use, but against any diff (working tree, a `<base>...<head>` range, `--staged`, or a PR) with no work-item document or quality gate required. Advisory by default; `--comment` posts findings as inline PR comments, `--fix` applies them to the working tree (no commit). `--effort low|medium|high|max` scales coverage. The reviewer subagent stays read-only — commenting/fixing are orchestration decisions the skill makes from the returned findings.

### Changed

- **`/develop-story` and `/develop-task` now run a code-review-and-fix loop by default.** The diff code review that `qa-story` (Phase 1.6) / `qa-task` (Step 3b) already perform each QA cycle is now **gate-blocking by default within the pipelines**: the QA-loop step passes a run-level `code_review_blocking=true` override, so high-confidence (`confidence: high`) correctness bugs (`category: bug`) are appended to the gate `top_issues[]`, fixed by `qa-fix`, and re-reviewed on the next cycle — until clean or the 5-cycle limit. Cleanups and uncertain findings stay advisory. A story/task opts **out** with `code_review_blocking: false` in its frontmatter (escape hatch; an explicit `false` always wins over the run-level override). Standalone `/qa-story`/`/qa-task` behaviour is unchanged (advisory unless the doc sets `code_review_blocking: true`). The blocking decision is now a single **canonical resolution** (run-level override + per-doc flag, with a resolution matrix) documented in `shared/resources/code-review-prompt.md` and implemented verbatim by both QA skills. `code_review_blocking` field docs in `docs/standards/{story,task}-documents.md` updated for the new default.
- **Renamed shared resource `qa-code-review-prompt.md` → `code-review-prompt.md`** and reframed it as the tool-neutral single source of truth shared by `/review-code`, `/qa-story` (Phase 1.6), and `/qa-task` (Step 3b). The prompt template is now caller-agnostic; QA-specific behaviour (gate `top_issues[]` mapping, `code_review_blocking` opt-in) and standalone behaviour (`--comment`/`--fix`) are documented as separate caller-responsibility sections. `qa-story` and `qa-task` references updated to the new filename; no behaviour change to the QA gate. Customise the reviewer for all three skills by editing the one shared source and running `npm run bundle`.

## [v0.16.0] - 2026-06-25

### Added

- **`qa-story` and `qa-task` gain an adversarial diff code-review pass (`qa-story` Phase 1.6 / `qa-task` Step 3b):** a read-only Explore subagent reviews the change-set diff for correctness bugs (logic/null/async/race, API misuse, broken invariants) and cleanups (reuse, simplification, efficiency) — the lens the document-anchored QA checks don't provide. The reviewer persona, scope, and YAML output contract live in a new single-source-of-truth shared resource `shared/resources/qa-code-review-prompt.md` (bundled into both skills' `references/`) and are dispatched verbatim by both skills. Findings are **advisory by default** and always recorded in the QA report `## Code Review` section and the PR comment. A story/task opts into gate-blocking by setting `code_review_blocking: true` in its frontmatter — then `category: bug` + `confidence: high` findings are appended to the gate `top_issues[]` (keyed `finding:`, matching the ingester / `qa-gate` schema) and the existing deterministic gate rules apply unchanged. The diff is scoped to the PR base (resolved via `gh pr view --json baseRefName`, defaulting to `develop`), and on re-review to files changed since the last gate; raw diff bytes are kept out of main context via a temp patch file. Lite mode runs exactly one light code-review pass (the sole exception to "skip parallel agents"). New optional `code_review_blocking` frontmatter field documented in `docs/standards/story-documents.md` and `docs/standards/task-documents.md`.

## [v0.15.4] - 2026-06-20

### Fixed

- **`develop-pipeline` Steps 4 and 8 no longer sweep unrelated untracked files into the PR (PR #207 root cause):** pipeline-mode commit staging previously used `git add -A -- '.' ':(exclude){report}'` — a denylist that staged every untracked path except the implementation report. Sibling task dirs and stray `.plans/` artifacts scaffolded in the same batch were pulled into the work item's PR (reproduced in PR #207). Step 4 now builds `SCOPE = {work-item-dir} ∪ {top-level dirs from git diff --name-only {base}...HEAD}` and passes the paths as `--scope` flags to `/create-pr`, which forwards them to `/commit-changes`; Step 8 passes `--scope {work-item-dir}` for the final commit. A pre-flight guard (`git status --porcelain`) detects any untracked path outside the scope set, moves it to a temporary hold dir before the PR, and restores it after — automating the manual hold-aside workaround from PR #207. Bundled copies in `skills/develop-story/references/` and `skills/develop-task/references/` updated to match.

### Added

- **`commit-changes` gains a repeatable `--scope <path>` allowlist flag:** when one or more `--scope` paths are passed, staging uses `git add -u` (tracked modifications, any path) plus `git add -- <scope-paths>` (explicitly named new-artifact dirs); `git add -A` is never invoked in scope mode. `--scope` and `--exclude` coexist — the scope set is staged first, then `git restore --staged -- <exclude-path>` removes excluded paths from within it ("exclude wins inside scope"). New untracked files outside the named scope dirs must be listed explicitly; `git add -u` will not pick them up. Standalone invocation without `--scope` is byte-identical to prior behaviour.
- **`create-pr` gains a matching repeatable `--scope <path>` flag:** values are collected into `SCOPE_PATHS` and forwarded to `/commit-changes --scope p1 --scope p2 …` when uncommitted changes are present. Silently ignored (with a log line) when no uncommitted changes exist, mirroring `--exclude` behaviour.

## [v0.15.3] - 2026-06-19

### Added

- **`develop-task` SKILL.md gains an "Execution Surfaces" section (task.16 / M2):** documents that the skill (Claude Code orchestrator) and the Mastra `developTaskWorkflow` are two surfaces of the same 8-stage pipeline, lists the four opt-in approval gates (`review-clarifications`, `qa-clarifications`, `pre-finalise`, `on-halt`) and their default-off/autonomous semantics, and states the inactive-`on-halt` HALT-artifact difference (the workflow emits a terminal `halt` without the skill's report-entry / tracker-comment / lock-snapshot artifacts).

### Changed

- **`develop-pipeline` Phase-0 lite-mode detector (Agent 3) now runs a deterministic CLI instead of re-deriving the FR3 rule in prose (task.16 / M3):** the detector shells out to the consumer's `npm run lite-mode -- <doc>` (a pure CLI wrapping the production `parseLiteModeInputs` / `decideLiteMode` / `parseSuccessCriteria`), merges the result with its own skills-config discovery (adding `ac_count`, preserving `skills_config_exists` / `always_load_files`), and the Aggregation block recomputes `PIPELINE_MODE` from the returned booleans (`risk_level ∈ {low,absent} AND phase_count < 3 AND single_module`) as defence-in-depth. The "do not re-evaluate conditions inline" guidance is revised to permit this mechanical boolean AND of pre-computed values (distinct from the forbidden prose re-derivation of the rule from the document). A prose fallback remains if the CLI is unavailable. Bundled copies in all four `develop-*`/`qa-*` skills updated to match.

## [v0.15.2] - 2026-06-15

### Fixed

- **`develop-pipeline` Step 3 high-risk gate no longer references a stale Q3 answer:** the high-risk gate bullets in `develop-pipeline-step-3-develop-loop.md` previously conditioned on a Q3 answer from Upfront Setup that was removed when `qa-planning` was made fully silent/automatic (no user question). Both bullets (develop-story and develop-task) now unconditionally auto-select "Skip" and log `high-risk gate: auto-skipped qa-planning` in the Decisions Log. Bundled copies in `skills/develop-story/references/` and `skills/develop-task/references/` updated to match.

## [v0.15.1] - 2026-06-15

### Fixed

- **`sync-jira-{story,task,epic}` status mapping consolidated and made configurable:** three defects addressed. (1) `draft`, `ready-for-review`, and `accepted` were absent from all per-skill `STATUS_MAP` constants and leaked verbatim to Jira's transition matcher, causing failures on any Jira workflow. The three maps had also drifted (epic was a superset of story/task). (2) Transition target names were hardcoded (`To Do` / `In Progress` / `Done`), preventing projects using custom workflow names (e.g. `Selected for Development`) from overriding them. Fixed by adding a `DEFAULT_STATUS_MAP` (full-lifecycle superset covering all canonical statuses and historical aliases), a `loadStatusMap()` function (reads `jira.statusMap` from `skills-config.yaml` and merges with the default), and a shared `mapStatus()` helper in `shared/resources/jira-sync.js`; per-skill duplicate `STATUS_MAP` consts and `mapStatus()` copies removed. The no-match warning now lists available Jira transition names and points at `jira.statusMap`. `docs/reference/configuration.md` documents the new `jira.statusMap` key with a defaults table, override example, and behaviour notes; `shared/resources/document-status-lifecycle.md` gains an "External Tracker Mapping (Jira)" section.

## [v0.15.0] - 2026-06-11

### Changed

- **Canonical `[Epic N]` / `[Story N.M]` / `[Task N]` bracket form adopted across templates, skill instructions, and tooling:** the bracket form is now the single canonical title form, replacing the colon (`Epic N:`, `Story N.M:`) and hyphen (`Story N-M:`) variants. Templates (`docs/templates/epic-template.md`, the `story-template.yaml` for `create-story`/`review-story`, `prd-template`/`brownfield-prd-template` yaml) and prose examples (`prd-template`, `create-epic`, `create-epics-from-shards`, `change-management`, `qa-story`, `documentation-standards-validator`, `epic-registry-manager`) now emit bracket-form titles. `jira-epic-creator` gains a `normaliseEpicSummary` helper (strips any colon/bracket prefix and re-wraps as `[Epic N]`, with `epic_number` frontmatter taking precedence over an id embedded in the title), and the `ensure-epic/story/task-github-issue` + `sync-github-epic` strip logic now handles both the colon form and an already-bracketed prefix to prevent a double prefix like `[Epic 1] Epic 1: …`.

### Added

- **`review-epic` and `review-story` flag non-canonical title forms:** `review-epic` adds a Major check flagging colon-form titles (with fix guidance and a Recommendations-table row); `review-story` adds a Title Format check (Major) flagging colon/hyphen/bare prefixes, noting that the hyphen form is not stripped on Jira push.

## [v0.14.3] - 2026-06-11

### Fixed

- **`sync-jira-story`, `sync-jira-task`, `sync-jira-epic` now emit the canonical bracket summary:** the three Jira sync scripts previously normalised the Jira issue summary to a colon prefix (`Story 1.3: …`, `Task 5: …`, `Epic 1: …`), diverging from the bracket form (`[Story 1.3] …`, `[Task 5] …`, `[Epic 1] …`) used by `create-story`, the `sync-github-*` siblings, and relied upon by `review-story`'s dedup search (`summary ~ "[Story {epic}.{story}] {title}"`). Each script now strips whatever prefix the `title` frontmatter carries (bracket or colon) and re-wraps it in brackets via a new pure, unit-tested helper (`normaliseStorySummary` / `normaliseTaskSummary` / `normaliseEpicSummary`). The transform is idempotent and resolves the id from the title's prefix, the filename (story/task), or `epic_number` (epic, which takes precedence). **One-time correcting change:** after consumers re-install the skills, the first sync of any previously-synced story/task/epic will rewrite its Jira summary from the colon form to the bracket form. Repairing already-mislabeled live issues otherwise requires a re-sync or a manual edit in Jira.
- **`sync-github-story` / `sync-github-task` update path no longer risks a malformed issue title:** both skills' update path (Step 5b / 4b) build the GitHub issue title from `${STORY_TITLE}` / `${TASK_TITLE}`, but their Step 3 only extracted the raw `title` frontmatter and never defined or stripped that variable — so updating an existing issue could emit an empty title (`[Story 1.3] `) or a double prefix (`[Story 1.3] Story 1.3: …`). Step 3 now instructs stripping the `Story {E}.{S}: ` / `Task {N}: ` (or already-bracketed) prefix into `STORY_TITLE` / `TASK_TITLE`, matching `sync-github-epic`. The create path was already correct (it delegates to the `ensure-*-github-issue` sub-routines, which strip).

## [v0.14.2] - 2026-06-11

### Changed

- **`create-prd` warns against artificially collapsing epics:** added a callout block, a worked example table (authentication, notifications, data sync, reporting), and an anti-pattern pitfalls entry to guide authors toward correct epic granularity when a feature naturally spans 4+ functional areas.

## [v0.14.1] - 2026-06-09

### Fixed

- **Epic body `Source PRD` link now works in all markdown renderers (GitHub, Bitbucket, VS Code):** `create-epic` previously wrote a bare repo-relative path as the link target, which resolved incorrectly in both GitHub (relative to file directory) and Bitbucket (relative to the domain root). `create-epic` now resolves a full `https://` URL at write-time — using `gh repo view` on GitHub repos or normalising the `git remote get-url origin` on Bitbucket repos — so the link is clickable wherever the epic file is rendered.

## [v0.14.0] - 2026-06-09

### Added

- **Parent PRD reference flows into every epic artefact:** stakeholders can now navigate from an epic straight to its source PRD. `create-epic` gained a **Discover Parent PRD** step that resolves `prd_source` from the epic's location (canonical `prd.{feature}.md` → glob fallback → `brownfield-enhancement` sentinel) instead of leaving the `[source-document].md` placeholder, and writes a `**Source PRD**: [View document](…)` link into the epic body. GitHub epic issues now include a `📋 Parent PRD` link in their `## Document` block on both the create path (`ensure-epic-github-issue`) and the update path (`sync-github-epic`), matching the PRD link `sync-jira-epic` already embedded.

### Changed

- **Epic templates carry the PRD body link:** `docs/templates/epic-template.md` and the bundled `epic-registry-manager` / `documentation-standards-validator` reference templates now express the Source PRD as a `**Source PRD**: [View document]({{PRD_SOURCE_PATH}})` line tied to the `prd_source` frontmatter field, replacing the hardcoded `../product-requirements.md#section-name` placeholder.
- **`review-epic` validates PRD linkage:** template-compliance now flags a missing/placeholder/unresolvable `prd_source` as Critical and a PRD reference that lives only in frontmatter (not the rendered body) as Major, skipping both for `brownfield-enhancement` epics.

### Fixed

- **Created the missing canonical `docs/templates/epic-template.md`:** `review-epic` cited this file as its template-compliance baseline but it did not exist. Added it using **Schema A** (`epic_number`, `domain`, `estimated_stories`, `created`, `target_completion`, `prd_source`) — the schema `create-epic` actually emits and that real epics use.
- **Reconciled `review-epic`'s frontmatter checks to the real schema:** Step 2 now validates the Schema A field set instead of the stale `epic_type` / `estimated_sprints` / `completion_percentage` set, and the Step 6 consistency checks plus the Epic Split heuristic are guarded so they no longer force false failures on Schema A epics.
- **`docs-link-check` CI now skips `docs/templates/`:** template files contain placeholder links (`{{PRD_SOURCE_PATH}}`, `[spec-name].md`, etc.) that are intentionally unresolvable; the workflow now filters them out before passing changed files to `markdown-link-check`.

## [v0.13.4] - 2026-06-08

### Fixed

- **`commit-changes` pipeline lock preserved during nested orchestration:** the pipeline lock is now only removed at Step 8 (the final lock-release step), not on any earlier nested invocation of `commit-changes`. Previously, a nested call from within `develop-story` or `develop-task` could prematurely clear the lock, allowing concurrent pipeline runs to proceed unsafely.

## [v0.13.3] - 2026-06-04

### Fixed

- **`review-story` validate-and-apply contract for orchestrated `develop-story` flow (SF-1):** standalone validate mode is strictly read-only (unchanged); a new `validate-and-apply` variant (`MODE=validate + APPLY=true`) is used by the orchestrator — it applies critical/important fixes, promotes Draft → Ready for Development on GO (HALTs on NO-GO), and writes a canonical `story.{epic}.{story}.review.{n}.{name}.md` report, eliminating the artifact-name mismatch that caused Step-2's `.review.*.md` lookup to fail.
- **QA-loop exit now treats a pre-existing WAIVED gate as done (SF-2):** a gate with `waiver.active` and a documented waiver skips to `finalise` instead of cycling through `qa-fix`, matching `finalise`'s own accept-eligible treatment. Applies to both `develop-story` and `develop-task` pipelines via the shared `develop-pipeline-step-5-6-qa-loop.md` resource.
- **Pipeline Step-7 references updated to note `finalise`'s doc-link re-point (SF-3):** the orchestration reference and completion checklist now document that `finalise` re-syncs the tracker issue with `--doc-branch` (durable integration branch), ensuring closed tracker issues do not point at deleted feature branches.

## [v0.13.2] - 2026-06-04

### Changed

- **Document codes glossary consolidated into the docs reference:** Removed the duplicated "Document Codes and Abbreviations" section from the `create-story` and `review-story` skill bodies (it was loaded into context on every trigger with no payoff, and was never injected into generated stories). The codes (AC, FR, CR, IV, US, REQ, OQ-D, TBD, QA, SM, UX, E2E, IaC, PR, CI/CD) now live in the canonical [`docs/reference/glossary.md`](docs/reference/glossary.md), alongside the existing PRD/DoD/NFR entries.

## [v0.13.1] - 2026-06-04

### Changed

- **`review-story` consolidates its three interactive question points into a single unified gate:** the Interactive-mode question points (QP1 after Step 3, QP2 after Step 5, QP3 final) are collapsed into one **Unified Question Point** after Step 8. Analysis now runs as a single pass that batches every finding — compliance gaps, epic conflicts, technical inaccuracies, UI wireframe opportunities — then asks up to 4 consolidated questions in one `AskUserQuestion` turn. The "zero interruptions" protocol is scoped to finding-clarification only, carving out the Step 0 output-format, Step 0a branch-setup, and Step 2 tracker-sync gates that must still fire mid-flow. A question slot is reserved for unresolved split/wireframe decisions so they can't be crowded out of the 4-question budget. Validate mode is unchanged (still never prompts). Also fixes pre-existing off-by-one step references in the Pre-pass Summary Consumption section and dangling "Phase 1.5"/"Step 7.7" references.

## [v0.13.0] - 2026-06-04

### Added

- **`markdown-wireframe` skill integration in story workflows:** Integrated the `markdown-wireframe` skill into both `create-story` and `review-story` to check if a story describes a UI that can be wireframed. In Interactive mode, the agent asks if a wireframe should be generated and embedded into the story's Dev Notes, along with a task to Stitch it.
- **Document codes and abbreviations glossary in story skills:** Added a "Document Codes and Abbreviations" reference section to the `create-story` and `review-story` skills, defining common terms such as AC, DoD, FR, NFR, CR, IV, US, REQ, OQ-D, PRD, QA, SM, TBD, UX, E2E, IaC, PR, and CI/CD.

## [v0.12.0] - 2026-06-04

### Added

- **`markdown-wireframe` skill:** Creates low-fidelity, mobile-focused outline wireframes to visualize bespoke user interfaces strictly based on provided briefs. Integrates with the Stitch workflow to generate functional, monochrome, outline-based components with grayscale styling and crossed-diagonal image/icon placeholders. Includes reference guides for prototyping techniques, wireframe examples, and ergonomic testing.

## [v0.11.0] - 2026-06-03

### Added

- **`sync-github-epic` skill:** completes the `{epic,story,task} × {github,jira}` sync matrix — the GitHub epic sync was the only missing leaf. Mirrors `sync-jira-epic`'s semantics (top-level work item, milestone-carried hierarchy) with `sync-github-story`'s GitHub mechanics (`gh` CLI, project board, Change Log, status reconciliation). The create path delegates to `ensure-epic-github-issue` so an epic synced here converges on the same issue as one auto-created during story work.

### Changed

- **Jira sync uses current-branch upstream for Bitbucket document links:** `sync-jira-epic`, `sync-jira-story`, and `sync-jira-task` now resolve the current branch's remote-tracking name (e.g. `feature/story.5.1.foo`) and use it as the `branch` in embedded Bitbucket doc links, falling back to the repo's default branch. A `--doc-branch <name>` CLI flag lets callers pin links to a durable integration branch after merge so closed issues don't point at deleted feature branches.
- **`finalise` re-points document links to the durable branch:** after accepting a story or task, `finalise` re-runs the Jira sync with `--doc-branch` (pointing at the integration branch) and surgically rewrites `blob/<branch>/<path>` in GitHub issue bodies — so closed tracker issues link to the long-lived branch, not the deleted feature branch.
- **Dynamic doc-link branch resolution in GitHub sync skills:** `ensure-epic/story/task-github-issue` and `sync-github-epic/story/task` now resolve the document branch dynamically (current-branch upstream → `gh repo view defaultBranchRef` → `develop`) instead of hardcoding `blob/develop/`.

## [v0.10.0] - 2026-06-02

### Changed

- **Opt-in tracker sync extended to the epic skills** (completes the v0.9.0 family — `create-story`/`create-task`/`review-story`/`review-task` already covered):
  - `create-epic`: the auto-on "Create Tracker Issue" step (opt-_out_ via `SKIP_TRACKER=1`) is replaced with an opt-_in_ "Offer Tracker Sync" step gated behind `AskUserQuestion` (Sync to GitHub / Sync to Jira / Skip — docs only). A remote issue is **never created unprompted**; the existing frontmatter idempotency guard (`github_issue`/`jira_key` present → silent skip) is retained. The `SKIP_TRACKER=1` env-var opt-out is removed from this skill (the "Skip" option replaces it), matching the story/task siblings.
  - `review-epic`: gains Step 11.6 — an opt-in path that offers to create a tracker issue for an **unlinked** epic (one with no `github_issue`/`jira_key`), via the `ensure-epic-github-issue` / `ensure-epic-jira-issue` sub-routines. Mutually exclusive with Step 11.5 (which re-syncs an already-linked Jira epic). Skipping keeps the unlinked-epic gap flagged and never halts. `resolve-platform.sh` + `platform-detection.md` are now bundled into the skill's `references/`.

### Docs

- **Dropped dead `SKIP_TRACKER=1` references:** the env var is no longer read by any live skill (the opt-in "Skip — docs only" prompt replaced it across all six create/review skills). Updated `docs/concepts/getting-started.md`, `docs/concepts/quickstart-story.md`, `docs/concepts/quickstart-task.md`, and `docs/reference/troubleshooting.md` to point at the prompt instead. Historical task/story artifacts under `docs/tasks/task.6.*` and `docs/prd/onboarding/**` are left as-is (they record what was true at the time).

## [v0.9.0] - 2026-06-02

### Changed

- **Tracker sync is now opt-in across doc-authoring and review skills:** remote issue creation (GitHub/Jira) is gated behind an explicit `AskUserQuestion` prompt with a "Skip — docs only" option, and is never performed unprompted. Previously `create-story`/`create-task` synced unconditionally and `review-story`/`review-task` asked a free-text yes/no.
  - `create-story`: Step 5.2a renamed "Create Tracker Issue" → "Offer Tracker Sync (opt-in)"; detect → `AskUserQuestion` (Sync to GitHub / Sync to Jira / Skip) → act-on-answer flow; scope banner, forbidden/allowed-writes lists, and the 5.2-est estimate hand-off updated.
  - `create-task`: mirrors the same opt-in flow at step 4.5; scope banner, forbidden/allowed-writes lists, critical-rule step 5, and the 4.4 estimate hand-off updated.
  - `review-story` / `review-task`: free-text "Should I create one now?" prompt replaced with the `AskUserQuestion` opt-in gate for both Jira and GitHub paths; skip keeps the Important gap flagged and never halts.
  - All skip paths log a "run `/sync-*-{story,task}` later" hint and continue.

## [v0.8.2] - 2026-06-01

### Fixed

- **`develop-pipeline` case-insensitive board moves — source/bundle drift:** the v0.8.1 case-insensitive board-status fix (`ascii_downcase` / `tr` matching) had been applied **only to the bundled `references/` copies**, not to the `shared/resources/develop-pipeline-step-{0,4,5-6,7}.md` sources — so `npm run bundle` silently reverted it. Forward-ported the fix into the shared sources, making bundling idempotent. Side benefit: `qa-story` and `qa-task` (which bundle step-0 + step-7) previously never received the fix and now do.
- **CI — docs link check scoped to changed files:** `docs-link-check.yml` now checks markdown links only in the files a PR (or push) actually changes — computed against the real base via a 3-dot diff — instead of scanning the whole `docs/` tree. Whole-tree scanning flagged pre-existing dead links in committed pipeline artifacts (`docs/prd/**` dogfood output, `docs/tasks/**`) on every unrelated docs edit. Replaces the `gaurav-nelson` action, whose single `base-branch` default (`master`) didn't fit this repo's gitflow (PRs target `develop`, sometimes `main`).
- **CI — eval replay fixtures now tracked:** blanket `.gitignore` rules (`*.log`, `.claude/`) excluded committed replay fixtures the eval runner copies into its sandbox — `…/replay/.eval/halt.log` (create-task `02-id-collision`, create-story `02-missing-core-config`) and `…/replay/.claude/state/develop-pipeline.lock` (develop-story/develop-task step-isolation scenarios). `npm run eval:all` passed locally (fixtures present on disk) but failed in CI on a fresh clone. Re-included the entire `evals/**/replay/` subtree via a `.gitignore` negation block (placed at end-of-file so it overrides all prior rules) and committed the 6 fixtures. `eval:all` now passes from a clean checkout.

### Removed

- **`develop-pipeline` `PostToolUse`/`on-skill-return.sh` hook:** removed the third pipeline hook that auto-advanced the lock and injected a "skip to next step" reminder when a sub-skill "returned". The Skill tool executes **inline** in the orchestrator's context, so a `PostToolUse:Skill` hook fires the instant a sub-skill's instructions are _loaded_ — before any of its work runs — and Claude Code has no skill-_completion_ hook event. The hook therefore mis-fired on every sub-skill call (`/review-story`, `/develop`, `/create-pr`, `/finalise`, …), advancing the pipeline before the step did any work; followed literally it produced empty PRs and premature DoDs. Lock advancement now relies on the correctly-timed layers: **sub-skill self-advance** (an inline instruction that runs _after_ the work) plus the **`Stop`** hook backstop. Deleted the canonical script, both skill wrappers, and bundled copies. `install-hooks.sh` and `setup-consumer.sh` now register only `PreCompact` + `Stop` and **actively de-register** any stale `PostToolUse`/`on-skill-return.sh` entry from older installs (self-healing on next run). Docs realigned to the two-hook model; regression coverage added in `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` (`#2d`).

## [v0.8.1] - 2026-06-01

### Fixed

- **`develop-pipeline` GitHub board moves:** Kanban column matching is now case-insensitive when moving issues, so columns named `in progress`, `In Progress`, or `IN PROGRESS` all match correctly.

## [v0.8.0] - 2026-06-01

### Fixed

- **`develop-pipeline` GitHub board moves:** Step 0 (`In Progress`) now logs `item-add` outcome, waits for Projects API propagation, and retries the project-item query once if it returns empty — previously the move could silently no-op on a slow-propagating board. Step 4 (`create-pr`) now moves the issue to `In Review` on the GitHub Projects board (previously only the Jira path transitioned; the GitHub path posted a PR comment but never moved the board column). Applied to `develop-story` and `develop-task` (plus `qa-story`/`qa-task` Step 0) via bundled `shared/resources/develop-pipeline-step-{0-resolve-and-prepare,4-create-pr}.md`.

### Added

- **`develop-pipeline` QA-start board re-assert:** Steps 5–6 (QA loop) now re-assert `In Review` on the GitHub Projects board once at QA start — a no-op when already `In Review`, a corrective move when Step 4's transition was skipped. GitHub-only, non-blocking. Applied to `develop-story` and `develop-task` via bundled `shared/resources/develop-pipeline-step-5-6-qa-loop.md`.

## [v0.7.2] - 2026-05-31

### Fixed

- **`jira-sync`:** fix issue-type lookup and auto-set Team field on epic create.

### Docs

- **`prd` directory convention:** rename to `prd.{feature}/` format.

## [v0.7.1] - 2026-05-28

### Changed

- **Docs:** reformat markdown tables in contributing and standards docs for improved readability.
- **`epic-registry`:** fix registry path reference in docs.

## [v0.7.0] - 2026-05-28

### Removed

- **`scrum-master` skill:** deleted as redundant — its `description:` triggered on the same phrases as `create-story` (the more specific match always won), it was not invoked by any other skill, and most of its body duplicated content in `create-story`. The Story Section Ownership table migrated to `docs/standards/story-documents.md`; the parallel/validate/pivot decision pointers folded into `create-story`'s "When to Use" section. `owner: scrum-master` role identifiers in `story-template.yaml`, lifecycle docs, and historical Change Logs are intentionally left as-is — they refer to the story-authoring role, now performed by `create-story`. Catalog now lists 106 skills.

## [v0.6.0] - 2026-05-28

### Added

- **`develop-pipeline` tracker milestone comments:** Steps 2, 3, and 5–6 now post non-blocking issue comments at review outcome, development completion, QA cycle result, and QA fix summary milestones. Covers GitHub (`gh issue comment`) and Jira (`addCommentToJiraIssue`); silently skipped when `TRACKER_ISSUE` is empty. Applied to `develop-story` and `develop-task` via bundled `shared/resources/develop-pipeline-step-{2-review,3-develop-loop,5-6-qa-loop}.md`.

### Fixed

- **`sync-jira-story` / `sync-jira-task` status map:** `ready-for-development` now maps to `"To Do"` so stories synced from that lifecycle state land in the correct Jira column instead of being silently unmapped.
- **`review-prd` / `review-story` filename convention:** review report filename derivation aligned across both skills; GitHub sync paths added to review output.

## [v0.5.0] - 2026-05-27

### Added

- **`jira-sprint-review-prep` skill:** automates Sprint Review data collection — collects completed increments, evaluates Definition of Done compliance, highlights scope creep/uncompleted items, and formats meeting agenda or release notes. Ships `scripts/compile-sprint-review-data.sh`, `scripts/compile-sprint-review-agenda.sh`, `scripts/compile-release-notes.sh`, `references/dod-rules.md`, and a fixture-based offline DoD eval test. Triggers on "prepare for sprint review", "compile demo agenda", "generate release notes".
- **`create-skill` packager `.sh` bundling:** `bundle_skill.py` and `package_skill.py` now walk `.sh` files alongside `.md`/`.js`, rewriting `shared/resources/<name>` → `references/<name>` so shell scripts under `<skill>/scripts/` can source bundled libs. Transitive sibling-source detection pulls in shared `.sh` files that source other shared `.sh` files. Executable bit is preserved and re-synced on bundled `.sh` files. Applied to 30 already-bundled skills.

### Changed

- **`jira-sprint-manager` lib extraction:** moved `_lib.sh`, `discover-sp-field.sh`, `get-active-sprint.sh`, `list-sprints.sh` out of the skill to `shared/resources/{jira-sprint-lib,discover-sp-field,jira-get-active-sprint,jira-list-sprints}.sh` so they're reusable by `jira-sprint-review-prep`. Remaining scripts updated to source the bundled lib from `../references/jira-sprint-lib.sh`.
- **`develop-pipeline` hook scripts extraction:** canonical implementations of `install-hooks`, `on-precompact`, `on-skill-return`, `on-stop` moved to `shared/resources/develop-pipeline-*.sh`; `develop-story` and `develop-task` now ship thin wrappers that `exec` the bundled canonical, eliminating ~1100 lines of duplicated bash. Stall-and-cleanup eval invariants now assert on the canonical; wrapper tests assert byte-identity.

### Fixed

- **`jira-standup-auditor` Jira `expand` payload:** `get-recent-jira-activity.sh` passes `expand: "changelog"` (string) instead of `["changelog"]` (array). The `/rest/api/3/search/jql` endpoint expects comma-separated string; the array form silently omitted changelog data and broke standup audits.
- **`create-skill` `quick_validate` shared-ref scan:** `collect_shared_refs` drops empty matches from trailing punctuation.

### Docs

- **`review-story` filename derivation:** `{descriptive-name}` placeholder replaced with `{story-name}` across SKILL.md and README.md, with explicit rule that the slug MUST be the parent story file's own name slug (not a free-form summary of the review focus). Worked example included.

## [v0.4.0] - 2026-05-26

### Added

- **`jira-standup-auditor` skill:** generates async daily standup updates by correlating recent Jira activity (issues + changelog filtered to current user's `accountId`, with `nextPageToken` pagination) with local Git telemetry (active branch, last-48h commits, uncommitted file status). Ships `scripts/get-recent-jira-activity.sh`, `scripts/get-local-git-activity.sh`, and `references/setup.md` (token creation, scopes, troubleshooting). Triggers on "standup prep", "daily update", "async update", "EOD summary", "what did I do yesterday", "what should I work on today".
- **`.github/workflows/test.yml` CI workflow:** runs `npm test` (L1–L4 hermetic) and `npm run eval:all` (L4 replay) on every PR and push to `main`/`develop` under Node 22.

### Changed

- **Release checklist (`docs/contributing/releases.md`):** collapsed the separate `npm test` and hermetic-evals checklist items into a single "`test.yml` CI workflow is green on the release commit" item, reflecting the new combined workflow.

## [v0.3.0] - 2026-05-26

### Added

- **`jira-sprint-manager` skill:** Jira sprint lifecycle operations via the Agile REST API — start/close sprints, audit velocity, detect unestimated issues, list active/future sprints, migrate leftover scope to backlog or next sprint. Includes `scripts/` wrapping endpoints (check-auth, list-sprints, get-active-sprint, get-sprint-issues, manage-sprint-state, move-sprint-issues, discover-sp-field) with shared `_lib.sh` (pagination, 429/5xx retry, JSON output) and `references/jira-agile-api.md`.

### Fixed

- **`develop-pipeline` Jira transition matching:** strict deterministic matching prevents LLM from picking fallback transitions when no candidate matches. Previously, workflows missing "In Review" caused Step 4 to silently move issues from "In Progress" back to "To Do". New `shared/resources/jira-transition-protocol.md` documents the algorithm and MUST-NOT clauses (no fallback, no status-category inference, no silent retry); referenced by Step 0c-reg, Step 4, Step 7. Bundled into `develop-story`, `develop-task`, `qa-story`, `qa-task`.

## [v0.2.0] - 2026-05-25

### Added

- **`review-story` Step 1 parallel fan-out:** collapses Step 1 + Phase 1.5 into a single 4-subagent dispatch (discovery + epic/architecture/codebase pre-pass) to cut latency.
- **`review-story` Tracker Dedup Fallback Search Addendum:** structural label search (`story-{epic}.{story}`) when primary title-prefix match returns zero — wired into both Jira (`searchJiraIssuesUsingJql` by label) and GitHub (`gh issue list --search label:`) dedup paths.
- **`review-story` Missing Diagram Proactive Draft Rule:** generates a sample mermaid snippet inline when a diagram is absent but recommended.
- **`review-story` Critical Scoring Engine Floor Gate:** caps Implementation Readiness Score at 5/10 when Technical Accuracy or Completeness < 6, forcing NO-GO regardless of other dimensions.
- **`review-story` Step 9.5 Atomic Rollback Protocol:** snapshots the story before the auto-fix Edit batch and reverts all edits if any individual edit fails.
- **`review-{epic,story,task}` Jira body push (Step 11.5 / 9.6 / 8.6):** after Step *.5 fixes, pushes body edits to Jira via the bundled sync script, refreshing `jira_last_body_hash` and appending a Change Log. Skipped when TRACKER=github, in validate mode, or no body edits.

### Fixed

- **`ensure-{epic,story,task}-jira-issue` + `jira-epic-creator` script paths:** replaced nonexistent `.scripts/jira-sync*.js` references with the bundled `.agents/skills/sync-jira-{epic,story,task}/scripts/...` paths, with explicit notes warning agents not to look for `.scripts/` in the consumer repo root.

### Changed

- **`review-story` QUESTION POINT 1/2:** demoted from h3 headings to bold to prevent TOC noise.

## [v0.1.1] - 2026-05-18

### Added

- **`scripts/release.sh --retry [<tag>]`:** recovery flag for orphan tags — when CI fails between tag push and `gh release create`, re-runs the release pipeline by deleting and re-pushing the tag at the latest `main` HEAD. Skips bump/CHANGELOG/commit; refuses if a GitHub Release is already published for that tag.
- **`workflow_dispatch` trigger on `.github/workflows/release.yml`:** re-run a failed release from the GitHub UI or `gh workflow run release.yml -f tag=<tag>` without touching the tag — checks out the tag's commit and passes it to `gh release create` via a job-level `RELEASE_TAG` env var.
- **`docs/contributing/releases.md`:** new "Recovering from a failed release" section documenting when to use `workflow_dispatch` vs `--retry`.

### Fixed

- **CI Node version:** `.github/workflows/release.yml` now uses Node 22 so `node --test` expands the quoted glob patterns in `npm test`. Node 20 treated them as literal paths and aborted the release before the GitHub Release was published.
- **`scripts/setup-consumer.sh` silent exits:** `_read_config_path` and `env_get` appended `|| true` so a non-matching `grep` doesn't kill the wizard under `set -euo pipefail`. The wizard previously died after the skills-config skip prompt with no error message.

### Changed

- **`scripts/setup-consumer.sh` end-of-wizard summary:** per-step status table with `ok` / `skipped` / `warn` / `fail` badges, coloured `✓` / `⚠` / `✗` banner, and an actionable Warnings block (e.g. "Skills pinned to main — set `SKILLS_VERSION=<tag>` once a release exists"). An `EXIT` trap ensures the summary prints even when a sub-step aborts mid-run.

## [v0.1.0] - 2026-05-15

### Added

- **Release automation:** `.github/workflows/release.yml` triggers on `v*.*.*` tag push — runs `npm test`, fails if the skill catalog is out of date, validates all skills via `quick_validate.py`, then creates a GitHub release with auto-generated notes (source tarball attached automatically).
- **`scripts/release.sh`:** end-to-end semver release script (`--major|--minor|--patch`, `--dry-run`). Confirms a clean `main` branch in sync with `origin/main` (with direction-aware push/pull hints), runs pre-release checks (`npm test`, `validate:all`, `generate-catalog`), bumps version from the latest git tag, moves `[Unreleased]` → `[vX.Y.Z]` in CHANGELOG, commits, tags, and pushes. Verifies `[Unreleased]` has non-empty content before tagging. Portable across BSD/GNU sed (uses awk for the multi-line CHANGELOG insert).
- **CI catalog-stale guard:** `validate.yml` regenerates the skill catalog on every PR and `develop`/`main` push and fails if it differs from the committed file — drift is caught at PR time rather than at release time.
- **`scripts/setup-consumer.sh --update`:** flag that skips the full wizard and re-downloads only the latest skills release into `.agents/skills/`. For day-to-day skill upgrades after the initial wizard run. Clearly distinguished in docs from the first-install path (full wizard, no flag).
- **`scripts/setup-consumer.sh` docs scaffold (step 7):** creates `${PRD_DIR}/`, `${ARCH_DIR}/index.md`, and three required always-loaded stubs (`concepts/coding-standards.md`, `concepts/tech-stack.md`, `concepts/source-tree.md`). Honours user-customised paths from `skills-config.yaml` (parser strips quotes and trailing comments). Idempotent; warns when stubs need filling in.
- **`SKILLS_VERSION` env var:** consumers can pin `setup-consumer.sh` installs to a specific release tag (e.g. `SKILLS_VERSION=v1.0.0`). Download failures (e.g. invalid tag → 404) surface as explicit errors that point at `gh release list` and the releases API.
- **`README.md`:** "Start here" callout block (lines 15–19) — links to decision tree (`docs/concepts/which-path.md`), task quickstart, and story quickstart; visible within the first viewport at 1080p.
- **Docs (onboarding & rationale):** `docs/concepts/getting-started.md` (install → first command), `docs/concepts/architecture.md` (system view + dependency map + design principles), `docs/reference/glossary.md`, `docs/reference/faq.md` (design rationale), `docs/reference/anti-patterns.md`, `docs/reference/commands.md` (every `/foo` consolidated), `docs/reference/activation-phrases.md`, `docs/contributing/doc-style.md`, `docs/contributing/releases.md`.
- **CI:** `.github/workflows/docs-link-check.yml` + `.github/markdown-link-check.json` — markdown link checker on every PR touching docs.
- **`configuration.md`:** worked-example `skills-config.yaml` blocks (typical project, greenfield, task-only).
- **`generate_catalog.py`:** scope-notes preface explaining foundational vs workflow-specific vs stack-specific vs specialised categories.
- **Docs:** `docs/runbooks/` — 12 step-by-step walkthroughs (story-development, task-development, qa-flow, bug-fix, hotfix, sprint-cycle, pm-workflows, jira-publish, new-project-setup, create-parallel-stories, change-management, document-existing-project) with per-runbook prereqs, Mermaid pipeline diagrams, called-skills maps, and verification commands.
- **Docs:** `docs/standards/` — split document schemas into `prd-documents.md`, `epic-documents.md`, `story-documents.md`, `task-documents.md`; new `file-naming.md`, `status-lifecycle.md`, `epic-registry.md`, `task-registry.md`, `plan-file-locations.md`.
- **Docs:** `docs/reference/` — added `configuration.md` (consolidated `skills-config.yaml` keys + placeholders) and `troubleshooting.md` (common pipeline failures + recovery).
- **Docs:** subdirectory indexes (`README.md`) for `concepts/`, `reference/`, `standards/`, `contributing/`, `operations/`.
- **`skill-catalog.md`:** featured starting-points preface emitted by `generate_catalog.py`.
- **`develop-pipeline`**: Phase 0 parallel fan-out (task.25) — three Explore subagents (resolver + tracker-state-poller + lite-mode/board-detector) dispatched in a single parallel tool-call block; results aggregated before Step 1. Adds tracker state poller and lite-mode detector as new Phase 0 signals; `0c` and `0c-load` updated to consume `LITEMODE_RESULT` directly.
- **`develop-pipeline`**: stale-context detector Explore subagent dispatched as Phase 0a on resume — reads lock + `.summaries/step-*.json` + artifact mtimes; returns `recommended_step`, `deltas_since_pause`, and `blocking_issues`. Narrows Phase 0b artifact verification scope. Wired into both `develop-story` and `develop-task` resume flows.
- **`develop-pipeline`**: `devLoadAlwaysFiles` resolution (Phase 0c-load) — reads `skills-config.yaml` `devLoadAlwaysFiles` key and passes those files as labelled context to `/develop` on the first iteration.
- **`develop-pipeline`**: Explore audit subagent replaces inline loop reads for pre-develop codebase mapping.
- **`develop-pipeline`**: test-failure triage Explore subagent for structured diagnosis on failing test suites.
- **`develop-story`**: epic-branch-first branching enforced — story branches always created from their parent epic branch (`feature/epic.{n}.{name}`), never directly from `develop`.
- **`create-pr`**: diff-aware PR body generation via Explore subagent — richer, context-aware PR descriptions from actual diff content.
- **`review-story`**: Phase 1.5 pre-pass with 3 parallel Explore subagents for deeper pre-review codebase analysis.
- Subagent summaries persisted as `.summaries/` JSON artifacts by the pipeline orchestrator.
- Shared tracker state poller Explore subagent available for create-pr/finalise flows.
- `docs/`: PRD/story and task document reference guides (`prd-story-reference.md`, `task-reference.md`).
- `GOVERNANCE.md`, `CITATION.md`, and Copilot agent instructions (`copilot-instructions.md`).

### Changed

- **Skill install model:** replaced `npx skills add` (third-party Vercel Labs `skills` npm package, unrelated to this repo) with direct tarball download from this repo's GitHub releases. `setup-consumer.sh` resolves the latest release tag via the GitHub API and downloads from `archive/refs/tags/<tag>.tar.gz`. Manual installs and CI use the same URL pattern.
- **`docs/contributing/releases.md`, `docs/concepts/getting-started.md`:** rewritten to describe the tag-driven release flow (push `v*.*.*` → workflow creates release → consumers pull pinned tarball). New release workflow split into three sections in `releases.md`: "Branch flow" (`develop` → `main` promotion with direct-fast-forward and PR-based variants, plus a Merge-type aesthetics table), "Cutting a release" (`release.sh` invocation and what `release.yml` does), and "Sync develop with main after release" (universal sync step that applies after any branch-flow variant). Removed `npx skills add` install commands across `README.md`, `AGENTS.md`, `docs/concepts/quickstart-{task,story}.md`, `docs/runbooks/first-week/day-1-tasks.md`, `docs/reference/troubleshooting.md`, `docs/contributing/{packaging,authoring-skills}.md`, `docs/architecture/concepts/tech-stack.md`, `shared/resources/develop-pipeline-hooks.md`, `skills/develop-{story,task}/scripts/install-hooks.sh`, and example PRD/epic templates.
- **`setup-consumer.sh` pipeline hooks:** registers `PreCompact`, `Stop`, and `PostToolUse` hooks inline via `jq` instead of delegating to a separate `install-hooks.sh` invocation. Registration no longer depends on `install-hooks.sh` living inside an installed skill, so the wizard can register hooks at any point regardless of skills install order.
- **Docs reorganisation:** `docs/` restructured into audience-driven subdirectories — `concepts/`, `runbooks/`, `reference/`, `standards/`, `contributing/`, `operations/`. Flat docs moved with `git mv` (history preserved): `overview.md` → `concepts/`; `usage.md` → `reference/invocation.md`; `skill-catalog.md` → `reference/`; `creating-skills.md` → `contributing/authoring-skills.md`; `packaging.md`, `evals.md` → `contributing/`; `workflows.md` → `operations/`; `prd.md` → `standards/story-documents.md` (split, see Added); `task.md` → `standards/task-documents.md`; `conventions.md` → `standards/file-naming.md` (split, see Added). `placeholders.md` folded into `reference/configuration.md`. `evals.md` split into `contributing/evals/{README,recipes,reference,secrets}.md`.
- **`AGENTS.md`:** trimmed duplicated content — file-naming table, status lifecycle, configuration snippet, plan-file-locations, task-registry rules, development pipeline, and evals descriptions now link to canonical homes under `docs/standards/`, `docs/reference/`, `docs/operations/`, and `docs/contributing/`.
- **`README.md`:** skill-categories list replaced with link to generated `docs/reference/skill-catalog.md` + a short curated featured-starting-points list.
- **`generate_catalog.py`:** output path `docs/skill-catalog.md` → `docs/reference/skill-catalog.md`.
- **Agent-agnostic repo guidance**: `CLAUDE.md` content migrated to `AGENTS.md`; `CLAUDE.md` is now a thin redirect shim and is gitignored. All "Claude Code"-specific language in `AGENTS.md` replaced with neutral agent terminology.
- **`qa-gate`**: gate files co-located with their story/task documents instead of central `docs/qa/gates/` — gate path is now `<story-dir>/story.{e}.{s}.gate.{n}.{name}.yml`.
- PRD/epic/story doc paths canonicalized across skills for consistent path resolution.
- `.agents/plans/` is now version-controlled; `.agents/state/` is gitignored as a runtime-artifact directory.
- Pipeline Step 7 (finalise) hardened: DO-NOT-inline rule added, completion checklist documented; lite mode confirmed to still execute all finalise side-effects (post DoD to PR, comment issue, update board).
- CI workflows disabled to stay within GitHub Free tier action-minute limits.

### Fixed

- **`create-skill`**: validator now handles both quoted and plain (block-scalar) multi-line `description` fields in `SKILL.md` frontmatter.

### Removed

- `skills/offline-first-enforcer/references/offline-capabilities-prd.md` — 1900-line product-specific PRD; skill is now self-contained with generic offline-first patterns.
- Stale `api-endpoint-validator.zip` build artifact at repo root.

### Changed

- **Decoupled skills from private monorepo.** Replaced `@{org}/<lib>` import examples with `@your-org/<lib>` across `platform-separation-validator`, `testing-setup-shared|nestjs|react-native`, `test-co-location-enforcer`, `documentation-standards-validator`, `epic-registry-manager`, `react-native-debug`, `nestjs-debug`, `develop`, `create-task`.
- **Loosened "NX monorepo" hard requirements** in `develop`, `qa-fix`, `nestjs-debug`, `testing-setup-shared`, `testing-setup-nestjs` so skills apply to any workspace setup.
- **Genericized leftover product references**: `my-wallet:start:device` → generic dev-command example; "this platform" / "financial coverage 95%" → neutral wording.
- `CODE_OF_CONDUCT.md` and `SECURITY.md` now list a contact email directly instead of pointing to a GitHub profile.

### Added

- `docs/placeholders.md` — legend for `{project}`, `{api-service}`, `{db-service}`, `{cache-service}`, `@your-org/...` template tokens used across skills, with substitution guidance.
- Placeholder notes in `docker`, `deploy-remote`, `nestjs-debug`, `qa-task` linking to `docs/placeholders.md`.
- `CHANGELOG.md`.
- `examples/README.md` pointing at `docs/tasks/` as a worked record of the develop/QA pipeline.

### Notes

- This pass is the OSS-readiness sweep: domain-specific business entities (financial wallets, mobile-money market analysis, etc.) and references to non-existent private libraries were removed or genericized so that every skill stands on its own when installed into an arbitrary project.

## Earlier history

See `git log` for the pre-OSS-prep history. Notable inflection points:

- `46bd6ca` — Mermaid diagrams added for `develop-story` and `develop-task`.
- `3f97fd3` — Skill catalog generator, CI packaging smoke test, npm scripts.
- `c2d8e4b` — Public-facing documentation overhaul for OSS release.
- `241abe1` — Skill content normalization and initial OSS anonymization pass.
