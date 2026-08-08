# Changelog

All notable changes to this project will be documented in this file. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Fixed

- **The one shared resource vendored outside `.agents/` carried no do-not-edit warning, and a consumer lost the same fix to it twice.** `setup-consumer.sh` copies `shared/resources/generate-prd-epic-index.mjs` into a consumer's **`scripts/`** so their `docs:epic-index` npm script can reach it. Every other shared resource is protected twice over — it lives under `.agents/`, which consumers' `AGENTS.md` documents as vendored, **and** it carries the bundler's `AUTO-GENERATED — DO NOT EDIT` header. This file's `scripts/` copy had neither, because the installer copies the **source**, not the bundled output the header is injected into. It landed beside the consumer's own tooling, reading like their code, and `--update` overwrote it silently.

  A downstream repo hit exactly that: it fixed a YAML quote-escaping bug in its own `scripts/` copy and lost the fix **twice** to `--update` before anyone noticed. Nothing failed at any point — the fix simply stopped existing, and the bug quietly came back.

  The header now lives in the **source**, so it travels to both destinations. Two regression tests pin it, because the trap for a future reader is that the bundler *does* add the header to `skills/*/references/`, which makes the source copy look redundant — deleting it would silently un-protect every consumer's `scripts/`. The second test asserts the installer still vendors from `shared/resources/`, so if that ever changes the tests say the source header is no longer needed rather than letting it outlive its reason.

  Note what this does **not** do: `--update` still overwrites without warning. This makes the file announce itself before someone edits it; it does not make the overwrite safe. A checksum-and-refuse in `setup-consumer.sh`, or not vendoring into `scripts/` at all, remain open options.

## [v0.37.3] - 2026-08-08

### Fixed

- **The epic-index generator leaked YAML's escaped apostrophe into every table it wrote.** `frontmatterField` stripped quotes with a single `replace(/^['"]|['"]$/g, '')`, which removes the wrapper but leaves the escaping the wrapper *requires*. A title written `'[Epic 1] Anna''s wallet'` — the only legal single-quoted YAML spelling — rendered as `Anna''s wallet`, doubling visible to every reader of the generated index. The same one-liner also stripped a leading **or** trailing quote independently, so an unquoted value merely *ending* in one (`Say it "loud"`) silently lost its last character.

  Replaced with an `unquote()` that only strips a **matching pair** and then undoes that pair's escaping — `''` → `'` inside single quotes, `\\"` → `"` inside double quotes.

  Worth recording how this was found, because the mechanism outlasts the bug: a consumer repo had already fixed it — locally, in `scripts/generate-prd-epic-index.mjs`. But `setup-consumer.sh` **vendors this file into `scripts/`** (it copies `shared/resources/generate-prd-epic-index.mjs` over it and prints "vendor-managed — do not hand-edit"). So every `setup-consumer.sh --update` silently reverted the consumer's fix; it had happened twice before anyone noticed, and would have kept happening indefinitely. **A vendored file can only be fixed here.** Two regression tests pin both behaviours.

### Changed

- **The four live workflows now pin `actions/checkout@v7`, `actions/setup-node@v7` and `actions/setup-python@v7`** — previously `@v4`/`@v4`/`@v5`, all of which target Node.js 20. GitHub-hosted runners already force those to Node.js 24 and annotate every run saying so; the deprecation ends with the shim being removed, at which point the pinned versions stop running rather than degrading. Bumping now is the same behaviour without the annotation.

  Each major between the old and new pins was checked against what these workflows actually do, because the version numbers cover three separate breaking changes that don't apply here: checkout v7 blocks fork-PR checkout under `pull_request_target` and `workflow_run` (no workflow here uses either trigger); setup-node v5 auto-caches when `package.json` declares `packageManager` and v6 narrows that to npm (this repo declares no `packageManager`, so nothing turns on); setup-python v7 removes the `pip-install` input (unused — both Python jobs install PyYAML with an explicit `pip install` step). Node 24 runtimes also require runner ≥ v2.327.1, which GitHub-hosted runners satisfy.

  The archived YAML snippets in `.github/workflows/README.md` are deliberately left at their original pins — they record removed workflows as they were, not workflows that run.

## [v0.37.2] - 2026-08-08

### Fixed

- **A ladder walk parked one rung short of a target the board was offering directly.** `walkLadder` planned every intermediate rung between the card's position and the moment's target, then treated a rung the board did not offer as the end of the walk. But `no-transition` does not mean "this gate is closed" — it means "there is no such path from here", which is a statement about the board's _shape_, not about permission. When the destination itself was directly reachable, the walk still stopped at the phantom gate and reported `walk-incomplete`.

  Observed live: `ready-for-merge` from `Ready for Testing` planned a hop through a showcase column the board does not offer from there, while the real destination appeared in the run's **own `available` list**. The CLI exited 0 — correct for a genuinely blocked walk, and indistinguishable from one — so the failure read as a deliberate no-op and a human moved the card by hand. Boards only hit this from positions whose column ordering disagrees with the authored ladder, which is why it survived the original walking work.

  A `no-transition` on an intermediate rung now falls through to the destination before parking. The skip is recorded as `shortcut: true` in `hops`, so a reader auditing "did my ladder do this?" sees the rung that was bypassed rather than a clean walk that quietly omits declared rungs. **Only `no-transition` falls through** — `required-fields`, HTTP errors and the cycle guard are real obstructions and still park the walk, because routing around an enforced gate is the opposite of the bug being fixed. Both properties are pinned by tests.

- **`/finalise`'s CI gate was GitHub-only, which made the skill unable to accept anything on Bitbucket.** The gate reads `gh pr view --json statusCheckRollup`; against a Bitbucket remote that fails, resolving to `UNKNOWN`, which the decision table maps to `PENDING` — never acceptance. Read literally, a Bitbucket consumer could never finalise a story. The gate exists to stop a _pending_ build being rounded up to green, not to make acceptance unreachable on a platform the skill otherwise supports end to end.

  Adds a Bitbucket branch that reads the pipeline for the PR head, with the platform split stated before either query so the GitHub block is no longer the implicit default.

  The Bitbucket path carries a warning the GitHub one does not need: **a `403` is indistinguishable from a repository with no CI.** Bitbucket answers `403` on `/pipelines/` when the token lacks `read:pipeline:bitbucket`, and the commit-status endpoint returns an empty list rather than an error — while the repository root and pull-request endpoints keep returning `200` on the same credential, so nothing looks broken. Two stories in one consumer repo diagnosed this independently, because no part of the output says "scope". The branch therefore checks the HTTP status **before** reading the body, and records `unverified: token lacks read:pipeline:bitbucket` rather than the actively misleading "no CI found".

## [v0.37.1] - 2026-08-07

### Added

- **[Pipeline artifacts](docs/reference/pipeline-artifacts.md) — a user-facing map of every file `/develop-story` and `/develop-task` write.** The information existed, split three ways and joined nowhere: `docs/standards/file-naming.md` gave the filename grammar, `docs/standards/{story,task}-documents.md` gave the directory layout, the runbooks gave the pipeline steps, and only the skill READMEs' Artifact Lifecycle Tables connected a step to the file it produces — written for harness maintainers and eval anchors, not for someone asking "what should be on disk right now?". The new page answers that directly: annotated directory trees per pipeline, a Phase 0e → Step 8 table with a **Committed?** column, plain-language ownership of the seven documents (including that gate files are QA-write-only), and runtime state — the pipeline lock, halt snapshot, test logs, `.summaries/` — in a separate table because none of it should be committed. It also reads a **partial** run: an implementation report with no gate file stopped in Steps 3–5; a gate file with no DoD summary stopped before Step 7.

### Fixed

- **Eight documents still described the epic-integration branch model as mandatory, four releases after it stopped being so** — making a choice that the pipelines have always offered look unavailable. v0.24.0 replaced the mandatory long-lived `feature/epic.{n}.{name}` integration branch with flat Gitflow, and v0.35.0 reinstated it as a per-epic opt-in; neither change propagated past the skills into the consumer docs. `docs/standards/story-documents.md` still tabulated "Story branch → created from Epic branch → PR targets Epic branch"; `docs/runbooks/story-development.md` still drew the two-level branch tree and listed a since-removed "Create epic branch from develop?" prompt; `docs/concepts/getting-started.md` told first-time readers that story branches "always target a parent epic branch, not `develop` directly". `epic-documents.md`, `quickstart-story.md`, `task-development.md`, `troubleshooting.md` and `first-week/day-4-parallel.md` carried the same assumption in smaller pieces.

  Nothing in the skills was wrong. `/develop-story` Phase 0d (Q1 branch base, Q2 PR target) and `/create-branch` Steps 2b–3 have both offered `develop` **and** the epic integration branch on every prompt; the epic's `branch_model:` frontmatter decides only which one is marked _Recommended_, and `branching.epicIntegration.offerWhenUndeclared` (default `true`) keeps the other on the list. The docs are now corrected to state both models, when each is the right call, and the three traps of the integration path: **Q1 and Q2 must name the same branch** (basing on `epic/178.feature-ui` and targeting `develop` yields a PR containing every earlier story in the epic), **selecting the option does not update the epic document** (record `branch_model:` yourself or the next story loses the recommendation), and **nothing promotes the integration branch** — every roadmap row ticked is not the same as the epic having landed.

  `docs/standards/story-documents.md § Branch strategy` is now the canonical statement; the other seven link to it rather than restating it, so the next change to this model has one place to land.

- **The develop-story eval docs named an assertion that does not exist and inverted what it checks.** `docs/contributing/evals/recipes.md` described `prTargetsEpicBranch` as verifying "the PR base is `feature/epic.5.example`, not `develop`" and called it "the primary regression guard for story pipeline drift". The real assertion is `prTargetsBranch(receiptPath, expectedBase)`, and both scenarios that use it (`smoke/01-end-to-end-dry`, `step-isolation/04-create-pr`) pass `"develop"` — so the guard asserts the exact opposite of what the recipe claimed, and a contributor debugging a failure would have been reading the inverse of the truth. `live-github-test.md`'s Step 4 walkthrough likewise scripted three Phase 0 prompts including a since-removed "Create epic branch from develop?", where the pipeline now asks two.

- **Six develop-story step-isolation fixtures still answered the Phase 0 base-branch prompt with `feature/epic.5.example`.** The v0.24.0 rewrite updated the two scenarios that assert on the branch (`01-create-story-branch`, `04-create-pr`) to `develop` and left the rest, because nothing asserted on them — so they were inert, but they modelled a story based on an epic branch, under the _pre_-v0.24.0 name (`feature/epic.*`, not the current `epic/{n}.{slug}`). All eight now answer `develop`. Verified against `npm run eval:develop-story` before and after: 55 protocol tests and 10 replay scenarios pass either way, which is the point — the fixtures were describing a contract nothing was checking.

## [v0.37.0] - 2026-08-06

### Added

- **`/scaffold-tracker-workflow` — generate `tracker-workflow.yaml` from a live board** instead of hand-deriving it. Reads the board's columns and their order from Jira (`/rest/agile/1.0/board/{id}/configuration` plus per-issue-type statuses) or GitHub Projects v2 (the Status single-select field's options, which are already in board order), infers which pipeline moment belongs at each column, and emits an annotated file. Validated through `tracker-workflow.js` — the same engine the pipelines read it with — and it refuses to write anything that fails.

  **The ladder is observed; the mapping is inferred.** Column names are written by humans for humans, so mapping them onto a closed moment vocabulary is inference and is the part that gets things wrong. Every choice is emitted with the evidence behind it, `--print` shows the file before it lands, and four things are flagged for a human rather than guessed: moment **inversions**, ambiguous columns, unmapped moments, and `done`.

  Three behaviours are deliberate, and each came out of a real board rather than a design sketch:

  - **A side-state is lifted off the ladder.** A Blocked column is an interruption, not a position, and boards put it anywhere — the board this was built against has it at index 1, _before_ In Progress. Since a rung's index is its rank, laddering it would rank a blocked card below one being worked on, making the way out a backward move; and because order is the path, the walker would pass _through_ Blocked en route elsewhere. It is emitted as a moment target and omitted from `statuses:`.
  - **Moment order is checked against the ladder and reported, never repaired.** A board arranged for the people who look at it routinely puts QA before review. Rank comes from ladder position, so that makes `in-qa` after `in-review` a backward move the guard refuses — a run that looks frozen with nothing in the log to explain it. The fix is a human deciding whether the board or the expectation is wrong; both answers are legitimate, so the tool states the problem and stops.
  - **`done` is suppressed by default when the board has a merge queue below its terminal column.** Accepting work and merging it are different events, and a pipeline that closes a card on acceptance closes it while its pull request is still open — taking anything tracking it as a parent down with it. The card stops at the merge queue and a human closes it. `--enable-done` overrides. This is derived from the board's own shape, not hardcoded: a board with no merge queue gets `done` mapped normally.

  Also: a moment targets the **entry** of a phase rather than its exit (given "Ready for Testing" and "Testing", `in-qa` takes the first), a Jira column aggregating several statuses becomes one rung with alternatives, and a per-issue-type overlay is emitted only when it changes behaviour — an overlay _replaces_ the ladder, so an inert one is a second copy to keep in step.

### Fixed

- **`develop-batch` worktree seeding now specifies a path-preserving copy.** Step 2 said only "copy every `developBatch.worktreeSeedPaths` entry from the main tree into `<dir>`", which reads naturally as `cp "$p" "$dir/"` — correct for every entry that is a repo-root basename, and silently wrong for any that is not. Two entries sharing a basename both land at the same flattened destination: the second clobbers the first, _and_ the nested location that actually needed the file is never created. Nothing fails; the seed step reports success and the worktree looks configured, so the defect surfaces much later as whatever the missing file was supposed to prevent. Found downstream by a consumer that seeds both a repo-root `.env` and a per-workspace `apps/<svc>/.env` — only the nested one carried the database URL its test run needed, so a flattening copy would have re-created the exact worktree failure the entry was added to fix. Step 2 and `docs/reference/configuration.md` now state that entries are **repo-relative paths**, show the `mkdir -p "$dir/$(dirname "$p")" && cp "$p" "$dir/$p"` form (with `rsync -R` as the one-liner), and name the clobber as the failure mode rather than leaving it to be rediscovered.

## [v0.36.0] - 2026-08-06

### Added

- **Stories and tasks can now carry a stakeholder sign-off gate**, off by default, enabled with a `sign-off:` block in `skills-config.yaml`. `create-story` and `create-task` seed a three-column table — **Role | Signature | Date** — and `review-story` / `review-task` check that every required row is signed before development begins. Canonical spec: [`shared/resources/sign-off.md`](shared/resources/sign-off.md).

  Stakeholders sign by editing the document — in the Bitbucket or GitHub web editor, or via `git` — and **committing the change themselves**. The typed name is the human-readable signature; the commit authorship is the audit trail. Nothing cross-checks the two, and nothing needs to: if they disagree, `git log` shows exactly what happened, and the evidence is durable and inspectable. This is also why the section is **never synced to a tracker** — signing in a Jira or GitHub UI produces no commit and therefore no evidence, so `STORY_SECTIONS` and `TASK_SECTIONS` are deliberately unchanged.

  **Agents scaffold the section but never sign it**, including when asked to sign on someone's behalf — an agent-written signature destroys the only thing the design rests on. The rule is stated in all four skills and enforced by a test.

  **The roster resolves in three levels**: `sign_off_roles` in the individual story/task frontmatter (the one-off — "this one needs the CTO") → `sign-off.{story,task}.required` + `.optional` in config (the project default) → a single `Stakeholder` row. Optional roles carry a ` (optional)` suffix in the Role cell, which is what lets the table stay three columns. **After creation the table itself is authoritative, not the config**: `review-*` grades the rows present in the document, so a `| CTO | | |` typed in during refinement is enforced like any other, and deleting a row removes that requirement — visibly, in the diff. A later config change never rewrites an existing table.

  **Enforcement is per-project via `sign-off.enforcement`.** The default `advisory` flags an unsigned document as Important and docks the readiness score but does not HALT, so `/develop-next` and `/develop-batch` keep running unattended. Under `blocking` it is Critical, and the review **withholds the status promotion** — that, not the numeric score, is what stops the pipeline, since `develop-*` gates on `Status:`.

  The task section is deliberately **unnumbered**, alongside `Progress Tracking` / `References` / `Notes`: the 11-section contract asserted by `countMandatorySections` and `tests/skill-protocol.test.js` is unchanged.

  **Inert for anyone who does not opt in**: with no `sign-off:` block, `create-*` emits nothing and `review-*` checks nothing — exactly the previous behaviour. Existing story and task documents are not backfilled; adoption is additive and going-forward only, matching how OKF frontmatter was rolled out.

  Covered by 9 new protocol tests — including one pinning the two `story-template.yaml` copies byte-identical, since that pair is kept in sync by hand and its task-side equivalent has already drifted — plus a new `fileDoesNotMatch` eval assertion, two new eval scenarios (`create-story/03-sign-off-enabled`, `create-task/04-sign-off-enabled`, the latter pinning frontmatter-beats-config), and negative assertions on both happy paths locking in the default-off behaviour.

### Fixed

- **The release workflow could not run the test suite.** `v0.35.0`'s frontmatter work added a PyYAML dependency — `tests/skill-frontmatter.test.js` asserts the strict, PyYAML-backed validation path is active — and added an `Install PyYAML` step to `test.yml` and `validate.yml`, but not to `release.yml`. `actions/setup-python` provides a bare interpreter, so the first tag cut afterwards failed 4 tests and published no GitHub Release. Fixed and shipped inside `v0.36.0` itself — the tag was re-pointed at the fix and re-pushed, so the published `v0.36.0` tarball contains it.

  This was worth fixing rather than working around: `quick_validate.py` **silently degrades to lenient parsing** when PyYAML is absent, so the release gate would have waved through malformed frontmatter that a consumer install then rejects. The gate was weaker than the PR gate that preceded it.

- **The roadmap no longer offers already-merged work.** `T38` stayed `[ ]` in `project-completion-roadmap.md` and `planned` in `task-registry.md` after PR #194 merged, so `select-next.mjs` picked it as the next candidate — `/develop-next` would have re-run a completed task. Ticking the row moves selection on to `T39`, which is the correct frontier. The roadmap is load-bearing, not descriptive: only `[ ]` rows are candidates and `deps:` are satisfied by `[x]` rows, so an unticked merge is a live defect rather than a tidiness issue.

- **User-facing docs no longer instruct people to create a credential type Atlassian has removed.** v0.35.0 renamed the Bitbucket credential to `BITBUCKET_API_TOKEN` and recorded that app passwords were removed on **2026-07-28**, but only `docs/reference/configuration.md` and `setup-consumer.sh` were updated. `getting-started.md` — the _first-run_ doc — still pointed at "Bitbucket → Settings → App passwords", and `quickstart-story.md`'s troubleshooting table still said to "regenerate app password with `repo:write` + `pullrequest:write` scopes". Corrected across `getting-started.md`, `quickstart-story.md`, `quickstart-task.md`, `troubleshooting.md`, `new-project-setup.md`, and `story-development.md`.

  This mattered beyond naming. A wrong or unscoped Bitbucket credential fails as a **404 that reads as an empty result**, because Bitbucket hides private repositories from anonymous callers — precisely the silent-failure mode v0.35.0 existed to eliminate. Anyone following getting-started landed in it. The auth probes in those docs now use the `${BITBUCKET_API_TOKEN:-$BITBUCKET_APP_PASSWORD}` form the skills actually resolve, and `troubleshooting.md` gained a status-code probe so an empty listing is never read as evidence. The skills and `shared/resources/` were already correct and are untouched.

- **`/document-project` was documented but does not exist.** `commands.md` listed it; the skill is `document-existing-project`. Corrected to the real command name.

- **Broken relative links.** `epic-template.md`'s "Related Documentation" and "Project Resources" sections still pointed at six files carried over from an unrelated source project (`product-requirements.md`, `DEVELOPER-QUICK-START.md`, `IMPLEMENTATION-STATUS.md`, …). Replaced with links that resolve from an instantiated epic's actual location — the PRD, the architecture index and coding standards, and the three registries.

- **This repo's own epic registry sat off-spec.** `docs/standards/epic-registry.md`, `glossary.md`, `invocation.md`, `new-project-setup.md` and 35 skill references all name `docs/development/epic-registry.md`; the file was at `docs/epic-registry.md`. Moved (`git mv`) so the library follows the convention it publishes.

### Changed

- **`commands.md` covers the orchestrators and tracker skills shipped since 2026-05-28.** Added `/develop-next`, `/develop-batch` (both with `--dry-run`), `/loop`, `/develop-bug`, `/review-bug` (+ `--validate`), `/review-code` (+ `--comment` / `--fix`), `/create-issue`, and `/sync-github-epic|story|task` — nine commands that were live but absent. `/create-bug-report` had been described as story-only and now names all three modes. `activation-phrases.md` gained matching natural-language rows, and `workflows.md` gained a **Roadmap-driven orchestration** section covering `develop-next` / `develop-batch` and why the roadmap file is load-bearing.

- **README skill count corrected from 110 to 113** (badge and prose).

## [v0.35.0] - 2026-08-05

### Added

- **Document links in synced Jira issues can now point at the branch the documents actually live on**, via a new optional `jira.docBranch` key (env override `JIRA_DOC_BRANCH`), falling back to `developNext.baseBranch` before asking git. Resolution order is now `--doc-branch` → `JIRA_DOC_BRANCH` → `jira.docBranch` → `developNext.baseBranch` → the current branch's upstream → git's default.

  The bug: `getDefaultBranch()` asked `git symbolic-ref refs/remotes/origin/HEAD`, git correctly answered `main`, and the sync wrote a link to a path that does not exist on `main`. **git was not wrong** — it cannot know that a Gitflow repo's documents live on `develop` and reach `main` only through a release. That is a project convention, so it now comes from config. The `--doc-branch` flag already existed and already fixed this per-invocation, but **none of the 26 automated invocation sites passed it**, so every pipeline-driven sync silently re-derived the default. The fix is therefore a config read, not a new flag: a human can pass a flag on an ad-hoc sync, but `develop-task`, `qa-task` and `finalise` invoke these scripts internally and never will.

  **Config deliberately outranks the current branch's upstream.** A feature branch does contain the document, so a link to it resolves today — and 404s the moment the branch is deleted on merge. The configured branch is the durable one, which is the whole point of writing a permanent link into a tracker issue.

  `developNext.baseBranch` is read as a fallback so that a consumer which has already declared where its work lands does not have to repeat itself under a second key and invent a way for the two to disagree.

  **Inert for anyone who was not affected**: with neither key set, resolution falls through to exactly the previous behaviour. `getDefaultBranch()` keeps its name and now prefers config; the unchanged git-only logic is still available as `gitDefaultBranch()`. New exports: `resolveDocBranch`, `loadDocBranchSetting`, `gitDefaultBranch`, and `parseTopLevelScalar` — the existing `jira:`-block scalar parser generalised to any top-level block, with `parseJiraScalar` kept as a thin wrapper so its callers and tests are untouched. Covered by 14 new tests.

- **Jira now reads `tracker-workflow.yaml` and walks the ladder it declares.** `jira-stage.js` resolves each moment's target from the ladder (falling back to `jira.workflowRecord`, then the built-in defaults, per moment rather than per file), and when that target is not directly reachable it walks the rungs the ladder declares in between. The available transitions are **re-read after every hop**, because they are position-dependent — the set offered from `In Progress` is not the set offered from a showcase column — which is why a walk cannot be planned once and replayed. A board that gates Done behind a review column now works with no transition graph authored; previously the move was skipped, and because every later moment resolves from wherever the card actually sits, one missed hop silently disabled all of them.

  A partial walk is a **third outcome**, distinct from both success and no-op: `reason: "walk-incomplete"` with `landed` naming the rung the card stopped in and `remaining` listing what it did not reach. A gate a human must open is a legitimate board shape, so this is exit 0, not a failure. A walk aborted by the cycle guard reports the same shape — an aborted cycle is a blocked walk, and reporting it as completed would erase exactly the distinction the three outcomes exist to preserve. There is no rollback: the reverse transition may not exist, and attempting one fights the guard that just allowed the forward move.

  Costs `1 + 2n` API calls for an `n`-hop walk, via a new optional `transitions` parameter on `transitionToStatus` that lets a walk hand over the list it has already fetched. A one-rung ladder — which is every consumer without the file — issues exactly the calls it always did.

  New flags: **`--print-plan`** prints the resolved hops with no credentials and no network, which is what the MCP fallback protocol now reads for its candidates; **`--from <status>`** tells it where the card is, without which there is no distance to measure and every plan collapses to the target rung alone (reported honestly as `spansFrom: false`). `--dry-run` no longer overstates itself: it verifies hop 1 against live transitions and labels later hops `unverified (depends on hop 1)`, because the transitions available after a hop do not exist until that hop fires.

  The credential-free fallback (`jira-transition-protocol.md`) stays deliberately **one hop**. It consumes `--print-plan` but refuses to walk: firing hop 1 and stopping, or skipping the gate to jump at the final rung, are both worse than logging and leaving the card for a human.

### Changed

- **The Bitbucket credential is now called what it is: `BITBUCKET_API_TOKEN`.** `BITBUCKET_APP_PASSWORD` is still read as a fallback everywhere — `${BITBUCKET_API_TOKEN:-$BITBUCKET_APP_PASSWORD}` — so no existing consumer breaks and no migration is required.

  The value has not been an app password for some time: Atlassian **removed app passwords on 2026-07-28**, and what the variable holds is an Atlassian API token (`ATATT…`) that must be created with the **Bitbucket scopes ticked** — a scopeless token authenticates against Jira and fails against Bitbucket. Only the older variable _name_ was legacy.

  This is worth more than tidiness because the failure it produced was **silent**. An unauthenticated Bitbucket call returns **404, not 401**, since Bitbucket hides private repositories from anonymous callers — so a missing or wrong credential surfaces as an _empty result_ rather than an error. A query built on a credential that does not resolve reads as "no open pull requests", and it takes a repo-root probe returning 200 to tell the two apart. Every place the variable is introduced now says so, along with the fact that Bitbucket uses **Basic** auth and never Bearer.

  `setup-consumer.sh` prompts for `BITBUCKET_API_TOKEN` and writes the token under **both** names, so new consumers get the honest name without stranding the references that read the old one. It previously prompted for the retired credential type by name — correcting only the prose would have left the documentation right and the tooling wrong, which is worse than being consistently wrong.

  Two setup blocks in `create-pr` and `create-issue` also stopped pointing readers at `bitbucket.org/account/settings/app-passwords/`, a page for a credential that no longer exists, and now point at `id.atlassian.com/manage-profile/security/api-tokens`.

- **`create-pr` no longer aborts on a valid Bitbucket credential.** Its preflight probed `GET /2.0/user`, which needs the `read:user` scope that tokens scoped for PR work routinely lack — it answers 403 while every PR and repository call succeeds, so the check failed good credentials. It now probes the repository instead, which is what `develop-next` already documented and what this contradicted.

- **The done-category fallback no longer fires when `done` has been retargeted away from the end of the ladder.** Rule 4 of `resolveTransition` — "if exactly one transition leads to a `done` status, use it" — asks _is there exactly one way to finish?_, and that question only has a right answer when the target **is** the finish. Terminality is now two conditions, both required: the moment must be one the defaults mark terminal (today `done`, alone) **and** its resolved target must be the ladder's last rung, which `resolveMoment` reports as the new additive `isLastRung` field.

  Before: point `done` at a bespoke column, find it not directly reachable, fall through to the single done-category transition, and **the card goes to Done** — a confident wrong transition, which the resolver's own comments already argued is worse than a skip. After: the moment skips and lists what the board did offer.

  This narrowing is correct rather than merely cautious: a skip is recoverable and a terminal transition is not, and if a board genuinely wants the fallback then its target _is_ the last rung and it still gets it. Only boards that retargeted `done` are affected — which is the case the narrowing exists to protect. No migration path is needed or offered.

  `isLastRung` is computed inside `tracker-workflow.js` against the ladder resolved **for that issue type**, not at the call site: `workflow.ladder` is the base ladder, and a `byIssueType` overlay may replace it with one of a different length, so a caller measuring against it gets the wrong answer for precisely the issue types an overlay exists to serve.

- **The monotonicity guard ranks from the ladder**, so a rung you declare is finally guarded. Previously rank came from the workflow record and then from ranks derived from the built-in candidate lists — whose own comment names "READY FOR SHOWCASE" as the kind of column it deliberately leaves unranked — so the guard had no opinion about a bespoke column and a resumed run would drag a card straight back out of it.

  Ladder ranks are **rung indices** and the legacy ranks are on a different scale entirely, so the two are never mixed: supplying a ladder switches the guard to indices wholesale, and a status off that ladder ranks as _no opinion_ rather than falling through to a number that would be compared at the wrong magnitude. That fall-through would have read an ordinary forward move as a regress and refused it. Off-ladder meaning "no opinion" is also what side-states have always meant. Document, epic, story and task sync pass no ladder and are on the legacy path unchanged.

- **A project can now describe its board as an ordered list of columns, and get rank, multi-hop paths and per-moment enablement out of that one list.** `tracker-workflow.yaml` at the repo root declares the statuses a board actually has, in the order they appear on it, plus which status each pipeline moment targets. Three things that previously needed three separate mechanisms fall out of the ordering alone: a rung's index **is** its rank, so a bespoke column like "Ready for Showcase" is finally guarded instead of returning `null` from `resolveStatusRank` and letting a resumed run drag a card back out of it; the rungs between two positions **are** the path, so a board that gates Done behind a showcase column needs no transition graph authored, where `resolveTransition`'s single hop would have skipped the move and silently disabled every later moment; and a moment omitted from `pipeline:` simply does not fire, replacing `enabled: false` and `defaultEnabled` with absence.

  A status named under `pipeline:` but absent from `statuses:` is an **off-ladder side-state** — `Blocked`, `Cancelled` — entered directly and never walked to. There is no second list to declare side-states in, so the two cannot drift apart.

  **The file is optional.** With no file, a built-in default ladder reproduces the existing candidate lists exactly, rung for rung, pinned by a snapshot test that derives its expectations from `jira-sync.js`'s `*_CANDIDATES` constants rather than transcribing them — so a change to those constants fails loudly instead of passing against a stale copy. Jira reads the file as of the entry above; GitHub execution is task.39 and step wiring task.40. `jira.workflowRecord` and `jira.statusMap` both keep loading, at lower precedence; no migration is required.

  A rung may carry **alternatives** (`names:` with several entries) because today's defaults are candidate _lists_, not single statuses. Flattening them would have moved a board whose column is "Waiting for Review" to "In Review" instead — precisely the behaviour change the default exists to prevent. `resolveMoment` therefore returns `targets` (plural, in preference order) and `planMove` returns rungs rather than first names.

- **`shared/resources/yaml-subset.js`** — the YAML reader from `develop-batch` promoted to a shared module, leaving four hand-rolled readers in the repo instead of five. Behaviour is unchanged and pinned by a contract test that parses the shapes `skills-config.yaml` actually uses; only the export form differs (`export function` → `module.exports`), since `package.json` is `"type": "commonjs"` and the bundler follows only `require("./x.js")`.

  It gains one capability: **quoted mapping keys**. `byIssueType` is keyed on live Jira issue type names such as `"IT / DevOps Task"`, and the previous key pattern admitted no quote, space or slash — so such a row matched nothing and the **entire overlay disappeared with no error**. Bare keys take the identical path, which a dedicated test asserts rather than assumes.

### Fixed

- **`bundle_skill.py` could not carry a shared dependency into any skill whose script is `.mjs`.** Pass 1 walked `*.md`/`*.js`/`*.sh` only, `rewrite_text` had no `.mjs` branch, and `JS_SHARED_RE` matched `require(…)` but never `import`. All three had to hold, and none did — so an ESM skill script importing `shared/resources/…` was never collected, never copied into `<skill>/references/`, and never rewritten. The result would have been a skill that works in a checkout and is broken in every tarball and zip install, because the un-bundled relative path resolves here and only here. `npm test` cannot see this: the in-repo suites resolve that same path. `tests/bundle-mjs.test.js` now runs the real bundler against throwaway fixture skills and asserts the collection, the rewrite, dynamic and side-effect imports, ESM sibling following, and idempotency.

- **The setup wizard generated a `jira.statusMap` that silently disabled status syncing on any board not using vanilla names.** The block was correct when it was written (`088af2b`, 2026-06-30): a map entry was one name, and one name was all there was. Candidate lists arrived in `2e14043` (2026-07-29) and made an override _replace_ the list rather than seed it — so the same seven generated lines began pinning every status to one vanilla name, discarding the five candidate lists behind them. A project whose board said "Waiting for Review" stopped syncing that status entirely, with the sync still reporting success. The generator never changed; its meaning did.

  `setup-consumer.sh` now emits commented guidance instead of a live block, pointing at `--probe-workflow`. Nothing is rewritten in existing consumers — this repo does not edit a config it did not just create — so detection is the only route out, and it runs in two places. `--probe-workflow` reports any narrowed entry, distinguishing the generated fingerprint (every entry) from a partial one that may well be deliberate; gating only on "every entry" would have stayed silent for the project that hand-fixed one status, which is the project closest to noticing. And when a sync actually skips a status, the warning now names the candidates that status's override discarded — the one moment the reader is looking. `docs/reference/configuration.md` gains that recipe (delete the block, probe, re-add only what the probe shows being skipped, as ordered lists), and its two worked examples no longer teach the narrowing shape — one of which had asserted the values were "the built-in defaults", which is what let the drift survive review.

## [v0.34.1] - 2026-08-03

### Fixed

- **A stage that found no transition told the reader to edit the wrong key.** The skip message named `jira.statusMap`, which configures document-status syncing and has no effect on pipeline stages — so anyone following it would edit a key that could not change what they had just seen. The advice now depends on which caller is asking, pointing a stage skip at the workflow record instead.

## [v0.34.0] - 2026-08-03

### Added

- **The develop pipelines can drive more of a board than three columns, and a project can describe its board once instead of every consumer re-deriving it.** Until now `/develop-story` and `/develop-task` signalled exactly three points — In Progress, a review status, Done — with the candidate lists written out as **literals in prose** inside the step files, and an LLM executing the matching loop against the Atlassian MCP tools. Project configuration had no effect on any of it: `jira.statusMap` is read only by `jira-sync.js`, i.e. only by the `sync-jira-*` skills. Every other column a team actually uses — testing, merge queue, blocked — was moved by hand or not at all.

  Adds a **stage vocabulary** distinct from the seven document statuses: `work-started`, `in-review`, `in-qa`, `ready-for-merge`, `blocked`, `done`. A stage is a point in a _run_; a document status is a word in a _file_. They are a superset, not a rename — `in-qa` names a column no document status has ever named, and `draft` names a state no run signals.

  Three of the six **alias the existing frozen candidate constants** rather than re-declaring them. A second, independently overridable copy of the review candidates would let `/sync-jira-story` and `/develop-story` be configured to disagree about the same transition on the same board — precisely the drift this is meant to end. Only `in-qa` and `ready-for-merge` introduce new lists.

  **The three new stages default off.** Consumers upgrade by replacing a skill directory wholesale; a stage that defaulted on would start moving cards into columns that project has never used, with nobody having asked. `work-started`, `in-review` and `done` behave byte-identically to v0.33.0.

- **`jira.workflowRecord` — a machine-readable description of the board**, default `docs/development/jira-workflow.json`. Declares which stages to drive, per Jira issue type, plus the status ranks the monotonicity guard uses. Keyed on the **live Jira issue type name**, not the `story|task|epic` docKind `jira.statusMap` uses: one board routinely gives several task types genuinely different workflows, which a three-way layer cannot express. Absent or unreadable → built-in defaults, so a project with no record behaves exactly as before. `--probe-workflow --write-record <path>` generates it and preserves hand-authored `enabled`/`reason`/`worklog` intent on regeneration.

  JSON rather than YAML because the record nests three levels where the hand-rolled parser handles one, and because it is meant to be generated and `--check`ed in CI — JSON round-trips with zero dependencies where YAML would need a writer too.

- **`shared/resources/jira-stage.js` — the deterministic half of the transition protocol.** One command per stage point (`--issue KEY --stage in-review`), replacing an LLM executing a prose algorithm. The prose protocol survives as the **fallback**, not as dead weight: the MCP path rides Claude's Atlassian connector and needs no API token, so deleting it would regress every consumer that has the connector but no `.env`. Absent credentials is therefore a normal exit-0 outcome carrying `reason: "no-credentials"` — the signal the caller uses to take that fallback.

  Exit codes are the load-bearing part of the contract. Pipeline steps run inside shells; a non-zero exit on "this board has no review column" would kill the run. So 0 for transitioned, already, disabled, no-transition and no-credentials alike; 1 only for a skip under `--strict`; 2 for usage errors. `--dry-run` is strictly GET-only, so a whole ladder is re-verifiable against a live board without moving anything.

  On a skip it names the transitions the board _did_ offer and flags any leading somewhere a later stage wants. Stages resolve from wherever the issue currently sits, so one missed hop silently disables every stage after it; this turns a silent ladder failure into a one-line diagnosis.

- **`jira.worklogTimeSpent` — opt-in, satisfies a time-spent workflow validator.** A required _field_ is visible in `expand=transitions.fields`; a _validator_ ("Please enter the time spent in order to move the task") is not, and surfaces only as a 400 on the transition. When the setting is present and the 400 names time, the transition is retried once with a worklog in the `update` verb — not `fields`, which Jira rejects outright.

  Deliberately a retry rather than a pre-emptive attach: a worklog sent to a transition whose screen has no Log Work field is _itself_ rejected, so attaching one unconditionally would break transitions that would otherwise have succeeded. Both behaviours were observed on the same board. Safe to retry because a failed validator is atomic — Jira applies nothing, so the first call cannot have booked time. Fires at most once; worklogs are cumulative and cannot be silently undone. Never invented: unset means such a transition fails exactly as it always did.

### Fixed

- **`.env` was not found inside a linked git worktree**, so every `/develop-batch` agent silently degraded to "no credentials" and skipped every tracker update. `git rev-parse --show-toplevel` returns the _worktree_ root there, `.env` is gitignored, and `git worktree add` carries no ignored files. Falls back to `--git-common-dir`, which points at the main repo. Fixes all five sync scripts, not only the new CLI.

- **A resumed pipeline could drag a card backwards.** Boards routinely offer backward transitions, so re-running an earlier step after a resume would move an issue that had already progressed. `transitionToStatus` now takes the rank it is moving to and refuses when the card already sits higher, overridable with `--allow-regress`. Unranked on either side means no opinion.

- **`git rev-parse` printed `fatal: not a git repository` when run outside a repo.** Every such call already sat inside a try/catch reading failure as "no config, use defaults"; inheriting stderr turned that silent fallback into five `fatal:` lines that read as a broken tool.

- **`develop-pipeline-step-7` fired the Done transition a second time**, after `/finalise` had already driven it. Harmless — the second call resolved to `already` — but it meant the candidate list was derived in two places, which is how two paths drift apart. Step 7 now treats the CLI as a **repair** for when `/finalise` reports its Jira step failed or skipped.

- **Nothing asserted that the prose protocol and `resolveTransition` stayed in step**, though `jira-transition-protocol.md` claimed they must. The candidate lists quoted in the prose are now compared against the JS constants by a test.

## [v0.33.0] - 2026-08-01

### Added

- **An epic can opt in to an integration branch again — per epic, by declaration, and only where it is argued for.** v0.24.0 removed the epic-integration model wholesale, because it had been **mandatory**: every epic got a long-lived `feature/epic.{n}.{name}` branch whether or not it needed one, and the resulting drift, deferred integration and big-bang merges are the well-known failure mode of that pattern. Nothing about that reasoning has changed, and `develop` remains the default and the recommendation. What returns is the narrow case the blanket removal also took with it: an epic whose stories are meaningless apart — a workspace foundation, a migration, a compliance boundary — where a partial landing on `develop` is worse than no landing. Such an epic now declares itself:

  ```yaml
  branch_model: epic-integration
  integration_branch: "epic/178.feature-ui"
  ```

  `/create-branch` gains **Step 2b**: for a story input, resolve the parent epic, read the declaration, and offer the integration branch as a base — **Recommended when the epic declares one, offered-but-not-recommended when it does not**, and creating the branch from `develop` (then pushing it) if it does not yet exist. `/develop-story` Phase 0d derives Q1/Q2 from the same declaration, so the autonomous orchestrators inherit correct behaviour with no new prompt and no change to the two-question count. **An epic that declares nothing behaves exactly as it did in v0.32.0** — this adds an option, never a default.

  The declaration is read, never written: choosing the integration branch at the prompt does not edit the epic document. Record the keys in the epic's frontmatter so later stories in the same epic get the recommendation instead of depending on whoever runs them next remembering.

- **`epic/{n}.{name}` is a new namespace, deliberately distinct from `feature/epic.{n}.{name}`.** The latter already exists and means something else — an ordinary short-lived branch for editing the epic **document**, which `/review-epic` creates. Reusing one name for both would have made a doc-review branch and an integration branch the same ref, quietly gating epic-document edits behind the entire epic's delivery. The split also makes the two expressible separately in branch protection, which matters because an integration branch must never be force-pushed while `feature/*` stays force-pushable. `create-branch`'s Gitflow reference gains a row for it; both documents state the distinction outright, and an eval test asserts they keep stating it.

- **`branching.epicIntegration.*` configuration — all optional, no configuration required.** Frontmatter key names (`epicFrontmatterKey`, `epicFrontmatterValue`, `branchKey`), the fallback branch name (`branchPattern`, default `epic/{n}.{slug}`), and `offerWhenUndeclared` (set `false` to restrict integration branches to epics that opted in explicitly). Defaults are the conventions above, so a consumer that wants this needs to add nothing; a consumer that spells its conventions differently overrides the names rather than renaming its documents.

### Changed

- **`develop-next` / `develop-batch` are only partly automated for an epic-integration epic, and now say so.** The merge step needed no change — the platform merges each PR into the base the PR itself declares, so a story based on `epic/178.feature-ui` merges there rather than into `develop`. But **nothing promotes the integration branch to the base branch**: the epic-completion check and the epic→base promotion were removed in v0.24.0 along with the mandatory model, and reinstating them is not part of this opt-in feature. `develop-next`'s SKILL.md previously asserted "there is no epic integration branch to promote", which is now false; it instead states where the automation stops and that the final `epic/{n}.{name}` → base PR is raised by hand. The trap this closes is reading "every row in this epic is ticked" as "the epic has landed" — the roadmap tracks stories, not branches, and for these epics the two diverge. A half-automated flow that looks complete is worse than one that says where it ends.

- **`develop-story`'s skill description no longer asserts that an epic is "never a git integration branch."** It is the string the model matches on when selecting the skill, so leaving it would have argued against the feature at the point of use.

### Fixed

- **The eval guard for the flat flow asserted the absence of a phrase rather than the presence of the behaviour.** `develop-branch-flow-rules.test.mjs` failed on any occurrence of `EPIC_BRANCH` anywhere in step-0 — so it could not distinguish "the mandatory model is back" from "an opt-in path is documented", and it would have blocked this change without indicating what was actually wrong. It now pins the invariants that matter: `develop` stays the recommendation when an epic declares nothing, the opt-in path fails open when the epic cannot be resolved, Phase 0 stays side-effect-free, and the pre-v0.24.0 machinery (`Step 1a`, `create-epic-branch`, `EPIC_BRANCH_EXISTS`) stays gone. All three new assertions were falsified individually before shipping.

  The namespace guard was written twice. The first version hunted prose for a bad phrasing and flagged the very sentence that draws the distinction correctly — so it now asserts **positively** that the disambiguation is present. A guard that cries wolf gets disabled, which is worse than no guard.

## [v0.32.0] - 2026-07-31

Four defects in Jira sync, every one of which **reported success while publishing something wrong**. They are grouped because that is the shared property, not the shared file: each prints `✅` and exits `0`, so none was findable by watching for failures. Falsified before shipping — the new test file fails 11/15 against the pre-fix code and passes 15/15 after.

### Fixed

- **A story's body did not reach Jira, and the sync said it did.** `STORY_SECTIONS` named `User Story`, but that heading is nearly extinct in practice: measured across 426 story documents, `## Story` appears 234 times, `## Story Statement` 161 and `## User Story` **7**. For ~98% of stories the section simply did not resolve, so the published description contained the acceptance criteria and nothing else — which reads as a thin story, not a broken sync. `extractBodySections` now accepts an **alias array** for a section (`["User Story", "Story", "Story Statement"]`), tries alternatives in order, and still emits the _canonical_ first name so switching between accepted spellings does not churn `hashBody` into a no-op PUT. When a section genuinely is missing, the warning now names every accepted spelling — telling a reader only "User Story not found" sends them to rename a heading that was already fine.
- **A description over Jira's limit failed the whole PUT, leaving the issue silently stale.** Above ~32,767 extracted characters Jira returns `CONTENT_LIMIT_EXCEEDED`; the update is rejected wholesale, so the card keeps its _previous_ description while the error names neither the size nor the cause. New `capDescriptionAdf()` trims to fit by dropping **whole top-level blocks** — never slicing one, since a half-emitted table is invalid ADF and rejected for a different and even less obvious reason — and announces the truncation twice: in the published description, so a Jira reader knows they are seeing part of it, and on stderr, so the operator knows it happened. Truncating quietly would have been the same defect class as the failure it replaces.
- **The changelog could be written into a document's YAML frontmatter.** Both the hand-written-changelog finder and the insert-point search scanned the whole file with `/^## /m`, so a frontmatter value that _quotes_ a heading name — a `description:` block scalar mentioning `## Change Log` — captured the insertion point. The changelog was then written inside the frontmatter, which still parsed as valid YAML, so nothing errored and the mangled value was published to Jira as part of that field. Both searches now start after the frontmatter block.
- **Every synced document came back prettier-dirty in a `singleQuote: true` repo.** `formatYamlScalar` hardcoded double quotes while writing frontmatter back, so the sync — an author of files the repo then formats — put every card it touched out of house style until someone reformatted it. Quote style now follows the consuming repo's Prettier config (`.prettierrc`, `.prettierrc.{json,yaml,yml}`, or the `prettier` key in `package.json`), defaulting to double quotes so a repo with no config sees no change. `JIRA_SYNC_QUOTE_STYLE=single|double` overrides detection. Single-quoted output escapes an embedded quote by doubling it, per YAML — a backslash is literal inside single quotes and would have corrupted the value.
- **`sync-jira-epic` deleted the only Parent PRD link that works outside Jira.** It rewrote the `**Parent PRD**:` line to hold just the Bitbucket URL, dropping any in-repo relative link — the one that resolves in an editor, on a checkout, in a diff. The rewritten line is still valid Markdown pointing at something real, which is why no check caught it. An existing relative link is now preserved and the Bitbucket URL appended beside it.

### Added

- `capDescriptionAdf()`, `adfTextLength()` and `JIRA_TEXT_LIMIT` exported from `shared/resources/jira-sync.js`; wired into all three sync skills.
- `shared/resources/tests/jira-sync-publishing-fidelity.test.mjs` — 15 tests. Four deliberately pass against the pre-fix code: they are the regression guards (normal changelog placement, no-frontmatter documents, the double-quote default, unquoted scalars) and would be worthless if they moved.

## [v0.31.1] - 2026-07-31

### Fixed

- **`documentation-standards-validator` told agents to write an emoji into frontmatter `status:`, and the resulting Jira transition silently did nothing.** Its epic frontmatter example shipped `status: 🔄 In Progress`, and a note beside the story schema asserted "emoji status is epics only" — both contradicting this repo's own [`document-status-lifecycle.md`](shared/resources/document-status-lifecycle.md), which is kebab-case for every document type. The failure was invisible rather than loud: an emoji value canonicalises to `🔄-in-progress`, matches no `sync-jira-*` transition candidate, and the transition is skipped with no error — the card stays in whatever state it was in while the sync reports success. The example is now `status: in-progress`, the note points at the lifecycle spec, and the Standard Status Icons block states outright that those icons are body prose only and never a frontmatter value.
- **`superseded` removed from the story `status` enum in `documentation-standards-validator`.** It was listed as a valid required-field value, but `develop-story` halts at Phase 0 on any status outside its own enum, which does not include it — so a story following this skill's advice became undevelopable. Use `cancelled`, or leave the story at `draft` and record the supersession in the Change Log.
- **CANCELLED and NONE are undecided CI states in `finalise`, not verdicts.** The CI gate bucketed `CANCELLED` with `FAILURE`. On a repo whose workflow sets `concurrency: cancel-in-progress`, every push cancels the previous run, so a rollup sampled in that window contains CANCELLED entries that say nothing about the code — treating them as red blocks acceptance on healthy work, the mirror of the bug this gate was written to prevent. `NONE` had the same shape: an empty rollup is the normal state in the seconds between a push and its run registering, but the gate concluded "no checks configured" from a single sample. Both now resolve by re-sampling before any conclusion is drawn; `FAILURE` still means failure.

### Removed

- **The "Runnable lint/census" section of `documentation-standards-validator`, and the linter invocation in `create-parallel-stories`.** Both ran `node docs/tasks/task.12.documentation-conventions-normalization-validator/scripts/lint-docs.mjs` — a consumer repo's task directory hardcoded into a vendored skill, so it could never have resolved anywhere except the one repo that happened to have a task 12. The missing file was the symptom; the portability violation was the bug. The skill still _defines_ the seven checks (status vocabulary, frontmatter completeness, Change Log header, FR-tags, registry⇔PRD parity, `estimated_stories` parity, stray `PROGRESS*.md`) — each consuming repo implements them as its own gates against its own layout and canon, which beats one linter guessing at everyone's doc roots. `create-parallel-stories` now describes the `estimated_stories` parity check in prose.

## [v0.31.0] - 2026-07-29

### Changed

- **Jira status transitions are now workflow-agnostic — they adapt to the board instead of assuming one vocabulary.** A local status no longer maps to a single hardcoded Jira status name; it resolves against an ordered list of candidates (`In Review` / `Code Review` / `Waiting for Review` / …) matched against the transitions the issue actually offers. Any board whose workflow used different words was previously having _every_ status change silently skipped while the sync still reported success. Resolution order is: already-in-a-candidate → `to.name` across all candidates → transition `name` (catching workflows that name the action, e.g. an `Implemented` transition leading to `Waiting for Review`) → for `accepted`/`cancelled` only, the single transition into the `done` category. Most projects can now delete their `jira.statusMap` entirely; `mapStatus()` still returns the primary candidate, so existing callers are unaffected.

  A statusCategory fallback for `new`/`indeterminate` was implemented and then **rejected**: dry-run against a real board showed it picking _wrong_ transitions — `ready-for-review` resolving to "In Progress", `in-progress` resolving to "Waiting for Review" — because those categories hold several unrelated states. It is restricted to terminal statuses, with a regression test pinning that.

### Added

- **Required transition fields are now satisfied from the transition's own schema.** Transitions are fetched with `expand=transitions.fields`, and a required `resolution` is filled from that transition's `allowedValues` — preferring `Done`/`Resolved`/`Fixed` for `accepted` and `Won't Do`/`Cancelled`/`Declined` for `cancelled`. Previously a workflow requiring a resolution on its Done transition returned a bare HTTP 400 that was swallowed as a warning, so issues silently never closed. Any _other_ required field is reported by name and the transition skipped rather than sent — a request the workflow has already declared incomplete cannot succeed. Overridable via `jira.doneResolution` / `jira.cancelledResolution` (or `JIRA_DONE_RESOLUTION` / `JIRA_CANCELLED_RESOLUTION`).
- **`--probe-workflow` on all three sync skills.** Read-only diagnostic printing the project's statuses per issue type, the live transitions from a sampled issue of each type, and exactly which transition each canonical local status would take and by which rule. Replaces guess-and-check when adopting a new board; transitions nothing.
- **`--fail-on-status-skip`.** Opt-in non-zero exit when a requested status change did not happen. Regardless of the flag, a skipped transition now prints an explicit end-of-run summary line naming the reason, the candidates tried, and the transitions available — previously the only signal was a warning buried mid-run, and all three sync scripts discarded `transitionToStatus`'s return value entirely.
- **`jira.statusMap` accepts ordered lists and a per-issue-type layer.** Values may be a scalar (as before), a flow sequence (`[A, B]`), or a block sequence; a nested `story:` / `task:` / `epic:` sub-map layers over the flat map, for projects running a different workflow per issue type (e.g. an Epic with only `Open`/`Done` beside a Story with a full review-and-test lane).

### Fixed

- **`transitionToStatus` no longer makes a network call when the issue is already in the target status** — the check now happens before fetching transitions, and considers every candidate rather than one name.
- **`finalise` no longer carries its own divergent transition prose.** It referenced neither `jira-transition-protocol.md` nor its MUST-NOT clauses, giving a third implementation of the same matching logic; it now defers to the protocol. The protocol itself, the develop-pipeline step candidate lists, and the tracker-state poller's done-check were all aligned with the library's resolution order.

## [v0.30.0] - 2026-07-29

### Added

- **`jira.defaultAssignee` in `skills-config.yaml` — assign every synced card without repeating an accountId in each document.** Read by all three sync skills; a document's frontmatter `assignee` still wins. Left unset in both places the field is **omitted entirely**, so an update leaves Jira's existing assignee untouched rather than clearing it — that distinction is why the resolver returns `""` rather than `null` for "send nothing". It lives in config rather than in the template because an accountId is specific to one Jira site and one person, so hardcoding one into a shared skill would make the template wrong for every other consumer. Overridable per-run with `JIRA_DEFAULT_ASSIGNEE`. Documented in `docs/reference/configuration.md` and scaffolded (commented) by `setup-consumer.sh`.

### Fixed

- **`assignee: TBD` shipped in the task template, and the sync passed it to Jira verbatim as an accountId.** Every task card created the intended way and then synced came back `HTTP 400` with nothing in the message naming the cause — the template and the tool disagreed, again, and the failure pointed nowhere. `create-task/scripts/lib.js` made it worse by listing `assignee` as a **required** answer and substituting it unvalidated; its own test asserted `assignee: platform-team`, a team name, which would have failed identically. Now: the template ships the key with a **blank** value and a comment stating it must be an accountId; `populateTaskTemplate` no longer requires it and only substitutes when one is supplied; and `resolveAssignee` refuses a placebo list (`TBD`, `TBA`, `none`, `unassigned`, `unset`, `todo`, `n/a`, `na`, `-`, `?`, case- and whitespace-insensitive) in **either** frontmatter or config, warning with the reason and the three ways to fix it instead of letting Jira reject it. A frontmatter placeholder falls through to the configured default rather than aborting. Two guard tests added: one asserts the shipped template value is blank, one asserts omitting the answer leaves the key present and empty.

## [v0.29.5] - 2026-07-29

### Fixed

- **Every task card created the intended way published a Jira description with no body, and nothing reported a problem.** `create-task`'s own template emits `## 1. Overview` … `## 11. Rollback Plan`, and `create-task/scripts/lib.js` requires those literal numbered strings (`countMandatorySections`, pinned by `tests/skill-protocol.test.js`). But `sectionRe` in `shared/resources/jira-sync.js` matched `## ${name}` only — no numbering — so `extractBodySections(task-template.md, TASK_SECTIONS)` returned **0 of 11**. Two subsystems in this repo disagreed about the heading contract, and the sync silently omitted every section it could not match: no warning, no non-zero exit, a `✅ Task updated` and a Jira issue containing Change Log, Source Documents and Metadata and nothing else. Found in a consumer repo where four consecutive cards had been synced that way; the two cards there that _did_ render were hand-deviations from the template, not the conforming ones. `sectionRe` now tolerates an optional `1.` / `1)` prefix and returns the **canonical** unnumbered name, so `hashBody` does not churn and no description is rewritten merely because a doc gained or lost numbering.
- **`sectionRe` was not anchored to line start, so a sub-heading could impersonate its parent section.** `## Foo` matched as a substring of `### Foo`, `#### Foo`, and of prose (`see ## Foo`). A document with `## 4. Scope` and a nested `### Scope` under it returned the _nested_ content as the whole section — verified before the fix. This was independent of the numbering bug but compounds with it, since tolerating numbering makes the two forms co-occur more often. Now anchored with `(?:^|\n)`, which still admits a section at position 0 of the body. `### Sub-headings` inside a section body remain part of it: the terminating lookahead matches `\n## ` and `\n# `, neither of which matches `\n### `.
- **An empty section swallowed the section after it.** The `\s*\n+` heading terminator consumed the blank line separating `## Overview` from an immediately following `## Motivation`, capturing Motivation's heading _and_ body as Overview's content — mislabelling one section and dropping the other. Tightened to consume the heading line only (`[ \t]*\n`); leading blank lines now fall inside the capture, which is harmless because callers `.trim()`.
- **The same pattern was inlined in two more places and did not move when the canonical one was fixed.** `sync-jira-epic`'s `extractStoriesTable` now calls the shared `sectionRe`. `jira-epic-creator`'s copy is standalone (requiring the shared module would vendor the whole Jira client into a skill that does not use it) so it stays inline, but is corrected in step and carries a pointer to the canonical comment. That third copy additionally required exactly `\n\n` after the heading, so a single newline before the table silently yielded no stories at all.

### Added

- **`extractBodySections` warns about sections it could not find**, given an optional `output` handle. This is the deeper fix: silence is why the mismatch above survived across 28 cards. Two messages — a plain "not found, omitted" list when _some_ sections resolve, and a louder "the Jira description will have no body" naming every expected heading when _none_ do, because all-missing is a contract mismatch rather than an incomplete document. Wired into `buildDescriptionAdf` in all three sync skills and deliberately **not** into `hashBody`, which extracts from the same body in the same run and would double-warn; routed through `output.warn` so `--json` output stays parseable.
- **`shared/resources/tests/jira-sync-sections.test.mjs`** — the first test file for `jira-sync.js`, which previously had none. The load-bearing case feeds the **real** `create-task` template through the **real** section list and asserts all 11 resolve; it fails against the pre-fix code. Every pre-existing test used hand-written unnumbered fixtures, which is exactly why none of them caught this — at least one test must stay wired to real artifacts. Also pins the line anchoring, the empty-section case, exact name matching (`Testing` must not match `Testing Strategy`), metacharacter escaping, the absence of the `m` flag (with it, the lookahead's `$` would mean end-of-line and truncate every section to one line), and the warning behaviour. `skills/sync-jira-task/tests/sync-jira-task.test.js` gains the warning assertion its existing "omits sections with no body match" case lacked — that test asserted the empty document and stopped, encoding the silence.

## [v0.29.4] - 2026-07-28

### Fixed

- **`finalise`'s CI gate accepted work while CI was still running — a _pending_ rollup was computed as `SUCCESS`.** The gate's decision table was already correct (`PENDING` and `FAILURE` both block; only `SUCCESS` passes) and the surrounding prose already warned against exactly this failure, but the jq feeding it could never _produce_ `PENDING` for a GitHub Actions job. The query normalised nodes with `.conclusion // .state`, and while a `CheckRun` is in flight GitHub returns `conclusion: ""` — an **empty string**, not `null`. jq's `//` only falls through on `null`/`false`, so `""` was taken as a real value, matched none of the `PENDING` tokens, and dropped to `else "SUCCESS"`. A `portal-e2e` job that had not started yet therefore read as green, and `/finalise` could mark a story `accepted` on CI that later failed. Verified live against a queued job, then reproduced in isolation: `{"status":"IN_PROGRESS","conclusion":""}` returned `SUCCESS` before the fix and `PENDING` after. The rollup mixes two node types with different field sets (`CheckRun` has `.status`/`.conclusion`; `StatusContext` has only `.state`), so the query now discriminates on `.status` — a `CheckRun` is only decided at `COMPLETED` — and treats an empty normalised value as `PENDING` rather than green. `SKIPPED`/`NEUTRAL` still count as passing (a `paths:`-filtered job is not a failure), and `FAILURE` still wins over a concurrent `PENDING`. Adds a standing note that any future change to this jq must be tested against a running check, since a gate whose logic is right but whose input is mis-parsed is worse than no gate — it reports success.

## [v0.29.3] - 2026-07-27

### Added

- **Runbook tutorial wrappers (epic 3) — "Before you start" anchors, satellite callouts, and a first-time-errors section.** The runbooks were written as reference material and read as such: correct, dense, and hostile to anyone arriving without the shape of the pipeline already in their head. `story-development.md` and `task-development.md` now open with a **Before you start** block that says plainly what the page assumes, points first-timers at the 60-minute quickstart instead, lists the three standards worth skimming (file-naming, status-lifecycle, epic-registry), and — most useful when someone has landed in the wrong place — enumerates the conditions under which a _different_ runbook is the right one, with the decision tree as the fallback. The four satellite runbooks (`bug-fix`, `hotfix`, `change-management`, `create-parallel-stories`) get the short form of the same callout, so no runbook is now an entry point without saying so.
- **`docs/runbooks/{story,task}-development.md` gain a "Common first-time errors" section** — five friction events **actually hit** during this PRD's dogfood run of epics 1–3, not a hypothetical list. Each entry is written in symptom-first order (`You see:` / `Cause:` / `Fix:`) so it is greppable from the error text a reader is staring at: the `PIPELINE-PAUSED` compaction banner, a Phase-0 base prompt with no `develop` option (repo initialised from `main` without one), a stale `develop-pipeline.lock` blocking a fresh run, Step 4 marked done with an empty PR URL after an interrupt, and `/finalise` flagging a missing CHANGELOG entry on work `/develop` judged docs-only. Every entry carries a `_Provenance:_` line naming the implementation report it was observed in, so each claim is traceable to the run that produced it rather than to someone's recollection.
- **`docs/reference/configuration.md` documents Claude Code hooks and environment variables** — the `.claude/settings.json` hook surface, the Jira / Bitbucket / GitHub environment variables, and the platform resolution order that decides between them.
- **`.env.example`** — a copy-and-fill template for the environment variables above, annotated with which are required versus optional and _why_ each optional one exists (`JIRA_BOARD_ID` for Scrum backlog placement only; the `JIRA_EPIC_LINK_FIELD` / `JIRA_EPIC_NAME_FIELD` overrides for classic projects only; `BITBUCKET_REPO_URL` when remote auto-detection needs overriding). GitHub is deliberately the odd one out — it authenticates through `gh auth login` rather than a variable, with `GH_TOKEN` documented as the CI-only path where interactive login is unavailable.

## [v0.29.2] - 2026-07-27

### Fixed

- **`develop-next` can now merge on Bitbucket — Step 3 was GitHub-only, making the skill inoperable on Bitbucket repos.** All four hosting calls (`gh pr merge`, `gh pr view --json headRefOid`, `gh pr checks`, and the Step 1 already-done `gh pr list`) were unconditional `gh` invocations with no platform detection, unlike `create-pr`/`qa-fix`/`create-issue` which already branch on `resolve-platform.sh`. `gh` cannot address a Bitbucket remote at all (`gh repo view` fails with _"none of the git remotes … point to a known GitHub host"_), so this was not a graceful degrade: the loop would select an item, run its full pipeline, open the PR — then halt at the merge, defeating one of the three manual gaps `develop-next` exists to close, and leaving a run-state file mid-flight on every item. Step 0 now resolves `VCS` once via the shared resolver (auto-bundled into `references/`) and Steps 1 and 3 branch on it; the GitHub path is byte-identical to before.
- **`mergeStrategy` is translated for Bitbucket rather than passed through.** The config key is documented in `gh` vocabulary (`merge`/`squash`/`rebase`) but Bitbucket's `merge_strategy` accepts a **non-overlapping** set (`merge_commit`/`squash`/`fast_forward`), so the default value `merge` is rejected outright by the API. Step 3 maps `merge → merge_commit` and `rebase → fast_forward`, and `--delete-branch` → `close_source_branch: true`. Consumers keep writing `gh` names in `skills-config.yaml`; unknown values now HALT rather than reaching the API.
- **Bitbucket CI checks are best-effort, and auth is never preflighted against `/2.0/user`.** Reading commit statuses requires the app password's `read:pipeline` scope, which PR-scoped credentials commonly lack; a `403 "credentials lack one or more required privilege scopes"` is now logged and stepped past instead of failing the merge of an otherwise-green PR (`qualityGateCommand` still runs unconditionally, on both platforms, and remains the real gate). An empty `values[]` means _no CI reported_, not _CI failed_. Relatedly, `GET /2.0/user` is explicitly rejected as a credential preflight — it needs `read:user` and returns 403 while PR and repository calls succeed, so it produces a false negative that would block every run.
- **`select-next.mjs` resolves both sides of its direct-invocation guard through `realpath`.** Consumer projects symlink `.claude/skills` -> `.agents/skills`, so `process.argv[1]` arrives symlinked while `import.meta.url` is already real; comparing them raw makes the guard false, `main()` never runs, and the CLI exits 0 with no output. The failure is silent and _misreads as a verdict_ — `develop-next` Step 1 sees no JSON and the loop does nothing, rather than reporting an error. This is the same bug fixed in `schedule.mjs` in v0.29.0, whose changelog recorded `select-next.mjs` as knowingly still carrying it; both guards now match and `schedule.mjs`'s cross-reference comment is updated so it no longer claims otherwise. Reproduced against a real symlinked layout (0 JSON objects emitted pre-fix, 1 post-fix) and pinned by a unit test that creates an actual symlink and invokes through it — verified to fail against the pre-fix guard.
- **Portable `sed` in every git-remote parser — the existing form is rejected outright by BSD `sed` (macOS default).** `s|.*bitbucket\.org[:/]([^/]+/[^/]+?)(\.git)?$|\1|` uses `+?`, a GNU extension; BSD `sed` exits with _"RE error: repetition-operator operand invalid"_ on **every** input, so `BB_PATH`/`REPO_SLUG` come back empty and each subsequent API call is built against a malformed URL. Replaced with a two-pass strip (`s|.*host[:/]||; s|\.git$||`), verified equivalent across SSH, HTTPS and `.git`-less remotes. Fixes 5 call sites across `create-pr` (2), `create-issue` (2) and `qa-fix` (1) in addition to the new `develop-next` code.

### Changed

- **`develop-next`'s protocol suite grew by 4 checks** pinning the above: that every `gh` call site has a Bitbucket counterpart, that `mergeStrategy` is translated rather than forwarded, that `/2.0/user` is never used as a preflight, and that no BSD-incompatible lazy quantifier survives. The last two scan **executable content only** — fenced `bash`/`sh` blocks with shell comments stripped — because the prose deliberately names both anti-patterns in order to warn against them, and a whole-document match fired on the warnings themselves. All 4 verified to fail against the pre-fix SKILL.md.

## [v0.29.1] - 2026-07-27

### Fixed

- **`finalise` granted acceptance without ever looking at CI.** It verified the PR _review_ decision (`pr_review_decision == APPROVED`) and stopped there — grepping the skill for `gh pr checks` or `statusCheckRollup` returned nothing — so an approved-but-red or approved-but-still-running PR passed the gate either way. Observed live: a task was marked `accepted` while its Playwright lane was still `queued`; the job then failed and the acceptance had to be withdrawn by hand. **Approval is a human judgement about the diff; the rollup is a machine result about the code**, and the skill was reading only the first. Adds a CI column to the decision matrix and a resolver that maps the rollup to `SUCCESS` / `FAILURE` / `PENDING` / `NONE` / `UNKNOWN`, with the raw per-job conclusions recorded in the DoD running summary so the decision stays auditable. Only `SUCCESS` accepts. `PENDING` is explicitly non-acceptance — _waiting is the correct action, assuming is not_ — and `UNKNOWN` (a failed query) degrades to `PENDING` rather than to success, so the resolver cannot fail open. `NONE` is recorded in the DoD summary as _unverified by CI_ instead of being silently rounded up. A green rollup on an ancestor commit is likewise called out as evidence about _that_ commit.
- **`finalise` treated a previous run's acceptance banner as this run's evidence.** A reopened story/task still carries its old `## Definition of Done - PASSED ✅` / `**Status:** ACCEPTED` section verbatim in the body, and this skill reads those sections — so unless they were explicitly discounted the prior verdict was inherited wholesale. In the observed case run 1 passed 7/7, the task was reopened the same day with an eighth criterion, and the stale banner was still in the body: inheriting it would have declared 7/7 complete against a bar that now had 8 items, where the eighth was the entire reason for the reopen. `finalise` now counts prior acceptance blocks, treats every one of them as **superseded** when the document's `status:` is no longer `accepted`, re-verifies each criterion against the code, flags an unmarked stale banner as a finding in its own right (it is a trap for the next reader and the next run), and always scopes its verdict to a new `dod.{N}` file rather than editing a previous run's summary.
- **`qa-task` skipped re-review on a gate that had gone stale.** The skip branch keyed only on the _content_ of the last gate — `PASS` with an empty `top_issues` — and never on whether that gate still described the current state. A reopened task carries its old `PASS` forward, so the one situation most in need of QA (work accepted and later found wanting) was precisely the one that skipped it; in the observed case the stale gate would have short-circuited the re-review that then found seven further defects. Skip now additionally requires that no source commit has landed since the gate was written, that the task document has not been edited since (`updated:` comparison), and that its status has not moved backwards from `accepted`. Any of those failing forces a re-review with the reason named in the message. **A green gate is a statement about a commit, not a property of the task.**

## [v0.29.0] - 2026-07-26

### Added

- **`develop-batch` gains a capacity-aware rolling scheduler (`scripts/schedule.mjs`)** — placement and admission move out of operator improvisation and into deterministic code. Previously the skill had **no routing seam at all**: the Step 2 dispatch directive carried exactly two placeholders (`<dir>`, `<baseBranch>`), so on a multi-machine setup _which host ran which suite_ had to be hand-injected into every sub-agent prompt; Step 2 was wave-barriered, so a freed lane sat idle until its slowest sibling finished; and `maxParallel` was read as a global cap by the skill while at least one consumer's config described it as a per-host cap. New optional `developBatch.resources` declares named execution resources (`name`, `capacity`, `testCommand`, optional `env` and `probe`), with `maxParallel` now unambiguously the **global** ceiling and `capacity` the per-resource one (`min(maxParallel, sum(capacity))` when both are set). `schedule.mjs plan` returns `{admit[], hold[], inflight, globalCap}`; `resources` and `probe` are diagnostics. Placement filters to resources under static capacity, under probe-effective capacity and not saturated, then spreads by utilisation ratio with declaration order as the tiebreak. **Zero-config projects are byte-identical to before** — no `resources` yields one implicit resource at `maxParallel` and the four new directive paragraphs are omitted entirely. Exports 8 pure functions with 41 unit tests (`evals/develop-batch/unit/schedule.test.mjs`); `select-next.mjs` is deliberately untouched, since selection answers _what can run together_ and scheduling answers _where and when_.
- **Capacity probes, with safety properties chosen so enabling one cannot hurt.** A probe is any shell command (`probe.command`, so `curl … | jq -e` suffices and no query-language interpreter enters this repo): exit 0 = available, exit 0 with `{"freeSlots": N}` = effective capacity `min(capacity, inflight + N)`, non-zero = saturated with the first stdout line logged as the reason, timeout/spawn-failure = **treated as available and flagged degraded**. Three invariants: a probe can only ever _subtract_ capacity (static `capacity` stays the primary guard, so a probe bug slows a batch but can never overload a host); a flaky probe can never stall a batch; and placement happens **once, at admission** — no preemption, no migration — with a settle window (default = `intervalSec`) so three items cannot pile onto a "load 0.5" host in three seconds before the load average reacts.
- **`developBatch.worktreeSeedPaths`** — gitignored files copied from the main tree into each fresh worktree. A `git worktree add` carries none, and a missing runner config typically degrades _silently_ (falling back to a local run) rather than failing, so a batch item can report green having never touched the machine it was assigned.
- **Interrupted is now distinct from HALTed** (`classifyStop`, `developBatch.maxResumeAttempts`, default 2). A pipeline that stopped citing an _external_ directive — plan mode, a permission denial, context compaction, a user interrupt, a tool outage — is re-dispatched and **re-placed** (not pinned to its old resource, since the point is that a different one may now be idle); a pipeline that failed **its own gate** (review NO-GO, develop stall, 5 QA cycles, qa-fix no-op, DoD gaps, rebase/merge conflict) is never re-dispatched. Ambiguous text with no live `develop-pipeline.lock` **fails safe to `halt`**: wrongly halting costs one manual resume, wrongly resuming can re-run a pipeline that had already decided to stop. Exhausting the budget yields `haltKind: "interrupted-exhausted"`. Step 0 also gains an explicit **"do not run this skill in plan mode"** preflight — plan mode forbids writes, so it stops every dispatched pipeline at once.
- **Step 5.5 — immediate re-batch**, admitting rows the just-completed merges unblocked, gated by `shouldRebatch` on three guards: the previous batch must have ticked ≥1 roadmap row (the real anti-spin guard, making progress monotonic against the roadmap), the new `batch[]` id set must differ from the last, and `developBatch.maxRebatches` (default 3) must not be reached. Mid-Step-2 top-up of hard-`excluded[]` rows is explicitly refused as unsafe: while a conflicting PR is open but unmerged, a newly-admitted item branches from a base that lacks it and is guaranteed to collide at merge.
- **`references/execution-resources.md`** — the resource model, probe contract, rolling-admission loop, and a _rejected alternatives_ section recording why rolling merges, capacity-aware selection, an HTTP probe type with a selector DSL, preemption, and a state `status` enum were all declined.

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

- **`develop-next` gains a `--batch` parallel-worktree planning mode.** `node .agents/skills/develop-next/scripts/select-next.mjs --batch` returns the maximal set of roadmap rows that are both dependency-ready (the exact predicate single-item selection uses) **and** write-disjoint, for fanning work out across git worktrees. It's a planning aid orthogonal to selection — selection answers "what's next", batch answers "what can N agents safely do at once" — and is advisory only: it emits a plan (`batch[]`, `excluded[]` hard conflicts, `softOverlaps[]` accepted rebase points, `skippedPhases[]`, and `git worktree add … develop` commands) and runs nothing. Reads a new optional `touches:` write-footprint field on roadmap rows (comma-separated resource tags, each `!` hard/exclusive or `~`/unmarked soft/additive; `+own`/`-` = no shared resource), terminated by `·` so it never disturbs the `deps:`/`gate:`/`flag:` captures beside it. Two rows hard-conflict when they share a tag either side marks `!`; soft overlaps are allowed and surfaced. Phase discipline is relaxed for planning — batch advances past a phase whose ready frontier is empty (recording it) rather than STOPping like the autonomous loop. Single-item selection is unchanged (pinned by a parity test). Documented in `references/roadmap-selection.md` §Parallel batch, with 6 new unit tests (suite 12).

### Added

- **`shared/resources/generate-prd-epic-index.mjs`** — the epic-creating skills now emit and refresh a PRD→epic index automatically, so a consumer's `docs:epic-index:check` never fails in normal flow. The generator injects a marker-delimited `## Epics` table (`<!-- epics-index-start --> … <!-- epics-index-end -->`) into each sharded sub-PRD (`prd.<feature>.md`), linking down to its child epic files with each epic's status — closing the PRD↔epic loop (the reverse `prd_source` link already existed). Promoted verbatim from the `rebirth-wallet` consumer copy (byte-for-byte output preserved — same markers, table header, auto-generated line, H1 placement, numeric sort) with two generalizations: the PRD root is no longer hardcoded (resolves `--prd-root` → `prd.prdShardedLocation` in `skills-config.yaml` → default `docs/prd`), and a new `--strict` flag turns a canonical epic file missing `epic_number` into a hard error instead of a silent skip. Keeps `--check` (CI drift gate) and `*.review.*.md` exclusion. Dependency-free (Node stdlib only). Covered by a new `shared/resources/tests/generate-prd-epic-index.test.mjs` suite (idempotency, review exclusion, relative-link shape, `--check` exit codes, `--strict`, and PRD-root resolution) wired into `npm test`.
- **`create-epics-from-shards`, `create-epic`, and `sync-jira-epic` regenerate the PRD epic index** after they write/update epics and the epic-registry. New final step in each runs the vendored `scripts/generate-prd-epic-index.mjs` (falling back to the skill's bundled `references/` copy), then stages the changed `prd.*.md` in the same commit. `sync-jira-epic` runs it post-sync so a status transition is reflected in the index.

### Changed

- **`create-epics-from-shards` now writes `epic_number` into new epic frontmatter.** It previously embedded the number only in the `title`/filename, so the index generator (which keys off `epic_number`) would silently skip those epics — the exact gap `--strict` now guards. Aligns with the required-field schema in `docs/standards/epic-documents.md` and with `create-epic` (which already wrote it).
- **The bundler/packager understand `.mjs`.** `bundle_skill.py` maps `.mjs` to the `//` auto-generated header comment and inserts it after a `#!/usr/bin/env node` shebang; `REFS_REF_RE` now discovers already-bundled `references/*.mjs` on re-runs. `package_skill.py` already zips `.mjs` verbatim.
- **`setup-consumer.sh` vendors the generator to the consumer's canonical `scripts/generate-prd-epic-index.mjs`** on install and `--update`, sourced from the release's `shared/resources/`, so the CI script and the skills' logic are one vendor-managed file. **Consumer note:** this file is now vendor-managed — do not hand-edit it downstream (it is currently hand-authored in `rebirth-wallet`); change it in agent-skills and re-run `--update`.

## [v0.25.0] - 2026-07-21

### Added

- **`review-bug` skill** — bug-report review, the bug-side sibling of `review-story`/`review-task`. Dual-mode (interactive default + `--validate` GO/NO-GO with a 1–10 fix-readiness score). Checks template/frontmatter compliance, reproducibility _from the report_, severity/priority correctness, and mode/linkage; runs two read-only pre-pass Explore scans — a **duplicate scan** (sibling bugs + `bug-registry`) and an **already-fixed/stale scan** of the root-cause area. Emits READY TO FIX / NEEDS DETAIL / DUPLICATE / STALE. Never mutates the bug lifecycle `status`; may edit the report to add missing detail. Slots into `develop-bug` as its Step 2 gate (validate-and-apply). Handles story / task / general bugs.
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
