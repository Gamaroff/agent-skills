# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

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
  - `create-epic`: the auto-on "Create Tracker Issue" step (opt-*out* via `SKIP_TRACKER=1`) is replaced with an opt-*in* "Offer Tracker Sync" step gated behind `AskUserQuestion` (Sync to GitHub / Sync to Jira / Skip — docs only). A remote issue is **never created unprompted**; the existing frontmatter idempotency guard (`github_issue`/`jira_key` present → silent skip) is retained. The `SKIP_TRACKER=1` env-var opt-out is removed from this skill (the "Skip" option replaces it), matching the story/task siblings.
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
- **`develop-pipeline` `PostToolUse`/`on-skill-return.sh` hook:** removed the third pipeline hook that auto-advanced the lock and injected a "skip to next step" reminder when a sub-skill "returned". The Skill tool executes **inline** in the orchestrator's context, so a `PostToolUse:Skill` hook fires the instant a sub-skill's instructions are *loaded* — before any of its work runs — and Claude Code has no skill-*completion* hook event. The hook therefore mis-fired on every sub-skill call (`/review-story`, `/develop`, `/create-pr`, `/finalise`, …), advancing the pipeline before the step did any work; followed literally it produced empty PRs and premature DoDs. Lock advancement now relies on the correctly-timed layers: **sub-skill self-advance** (an inline instruction that runs *after* the work) plus the **`Stop`** hook backstop. Deleted the canonical script, both skill wrappers, and bundled copies. `install-hooks.sh` and `setup-consumer.sh` now register only `PreCompact` + `Stop` and **actively de-register** any stale `PostToolUse`/`on-skill-return.sh` entry from older installs (self-healing on next run). Docs realigned to the two-hook model; regression coverage added in `evals/develop-story/protocol/stall-and-cleanup-protocol.test.mjs` (`#2d`).

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
