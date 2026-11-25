# Runbook — Skip the Heavy CI Jobs on a Docs-Only Push

> **Audience:** a consumer project's maintainer deciding whether to adopt an **optional** CI
> template. Nothing installs it: `setup-consumer.sh` does not copy it, and no skill requires it.

## When to use this runbook

Use it when your CI runs a long suite on every push, and many pushes change only Markdown:
pipeline items end with docs-only commits (implementation reports, DoD files, hand-offs), and each
one costs a full run.

Skip it when your full suite takes a few minutes anyway, or when you would rather never reason
about a skipped run. Adopting it is optional, and leaving it out costs runner minutes, nothing else.

**How this relates to the pipeline's own rule.** `ci.docsOnly` in `skills-config.yaml` (task.172;
[The docs-only CI rule](../reference/configuration.md#the-docs-only-ci-rule)) stops `/finalise`
and `/develop-next` **waiting** on a docs-only commit. It does not stop the run. This template stops
the **run**. The two are independent: either works without the other, and both use the same
definition of docs (checked by a parity test, below).

## What it does

A `changes` job runs first and writes one output, `code=true|false`. Every heavy job gates on
`code == 'true'`. The classifier answers `false` in exactly two cases:

1. **The whole pull request is docs.** The three-dot diff against the base touches only docs paths.
2. **The push added only docs to a head that already passed.** On a PR `synchronize` push, the
   push's own commits (`before..after`) are all docs, **and** `before` has a successful
   `pull_request` run of the workflow you name in `CI_WORKFLOW_PATH`.

On a push to a branch, case 1 uses `before..after` instead of a merge base.

## The contract: every uncertain path runs the full suite

Each of these gives `code=true`, with a `::warning::` where the classifier could not look:

- `CI_WORKFLOW_PATH` unset or empty (a misconfigured template is loud, never a silent skip)
- a `workflow_dispatch`, a missing or unreachable `before` (new branch, force-push), an empty diff
- a base branch it cannot fetch, or a diff it cannot compute (a shallow clone)
- `jq` missing; the API request failing; a response that is not a workflow-runs list
- `before` has no successful `pull_request` run of that workflow: none, failed, still running,
  cancelled only, a `push`-event run only, or another workflow's run only
- a rename that moves code into `docs/` (`--no-renames` lists both paths)
- a path name git C-quotes (non-ASCII, a tab): it cannot be read, so it is code

The classifier writes `code` on **every** exit. That matters: a gate of `== 'true'` reads an empty
output as skip.

## Measured

On tinker-city, where this template comes from (task.127, merged as PR #984 on 2026-10-02), one
pull request's runs of the same `ci.yml`, all on 2026-11-02 (GitHub Actions run IDs; the
repository is private, so they are not linked):

| Run | Push | Heavy jobs | Wall clock |
| --- | --- | --- | --- |
| 41439187444 | code (`cd95db60`) | all ran | **37 min 27 s** |
| 41444278348 | docs only (`536c4ff0`) | all skipped | **3 min 42 s** |
| 41445192250 | docs only, 3 `.md` files (`d88b1f96`) | all skipped | **2 min 52 s** |

In run 41445192250, `changes`, `docs-lint` and `guards` ran; `smoke`, `api-tests`, `portal-tests`,
`portal-e2e` and `live-e2e` were skipped; the required `ci-ok` check passed. Your numbers depend
on your suite. The skip saves whatever your heavy jobs cost.

## Triggers: one run per push

A workflow that runs `on: push` for feature branches **and** `on: pull_request` runs twice for every
push to a branch with an open PR. Bitbucket has the same trap: a `branches: 'feature/**'` trigger
beside `pull-requests: '**'` starts two pipelines, and neither suppresses the other. Fix this first. It
needs no classifier, and the skip below cannot remove a duplicate run.

**Limit the branch trigger to long-lived branches** (`main`, `develop`, `release/**`) and leave
feature branches to the pull-request trigger. Both snippets are written that way. Keep the
pull-request run and not the branch run: it tests the head merged into the base.

```yaml
on:
  pull_request:
  push:
    branches: [main, develop, "release/**"]
```

On Bitbucket, list the same branches under `pipelines: branches:` and nothing that matches a feature
branch (`feature/**`, `**`, or a `default:` section, which runs on every branch no other entry names).

**What it costs:**

- **A push with no open PR runs nothing.** Feedback starts when the PR opens. Open the PR early, as a
  draft if need be. agent-skills' pipelines open it right after the first push.
- **On GitHub, a PR with a merge conflict runs nothing.** `pull_request` workflows do not start until
  the conflict is resolved
  ([events](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#pull_request)).
  A feature-branch `push` run used to cover that case.
- **A merge check that reads the branch run stops working.** Before you remove the trigger, look for a
  required check, a badge or a script that reads the feature branch's own run, and point it at the
  pull-request run.

## Wiring — GitHub Actions

Files, in agent-skills' `docs/examples/ci/github-actions/`:

- `classify-changes.sh`: copy it into your repository, for example `scripts/ci/classify-changes.sh`.
- `changes-job.yml`: a **snippet**. Copy its `changes` job, the `if:` gate on each heavy job, and
  the `ci-ok` aggregate into your own workflow.
- `classify-changes.test.js`: the spec. Copy it beside the script if you want the template's own
  tests in your repository. It needs `node`, `bash`, `git` and `jq` wherever it runs.

The job needs:

- `permissions: { contents: read, actions: read }`. `actions: read` lets it read the workflow runs
  of `before`. Without it, every lookup fails, and fails safe.
- `fetch-depth: 0` on checkout, or the three-dot diff has no merge base.
- `bash`, `git`, `jq` and `curl` on the runner. It does not need `node` or `gh`.

Inputs (job `env`):

| Variable | Required | Meaning |
| --- | --- | --- |
| `CI_WORKFLOW_PATH` | yes | This workflow's own path, e.g. `.github/workflows/ci.yml`. Its successful `pull_request` runs are the evidence. |
| `DOCS_PATTERNS` | no | Space-separated shell `case` patterns. Default `*.md docs/*`. Set but empty means nothing is docs. |
| `EVENT_NAME`, `EVENT_ACTION`, `BASE_REF`, `BEFORE_SHA`, `AFTER_SHA`, `GITHUB_TOKEN` | yes | From the event, as the snippet passes them. |
| `CI_OK_LOOKUP_FILE` | **never** | Tests only: replaces the API call. A workflow that sets it decides from a file. |

**Your required check must pass when the heavy jobs skip.** A skipped job's result is `skipped`,
not `success`. The snippet's `ci-ok` job runs `if: always()` and fails unless `changes` succeeded and
each heavy job succeeded or was skipped. Branch protection then requires `ci-ok`, never the heavy jobs
themselves. Add every heavy job to its `needs` and its `case`: one left out can fail with `ci-ok`
green. Two reasons:

- **A required heavy job can pass with no test run.** GitHub reports a skipped job as `Success`, and
  it does not stop a merge, even when the check is required
  ([conditions](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/control-jobs-with-conditions)).
  A job is also skipped when a job in its `needs` fails. So if `changes` itself fails, every heavy
  job is skipped and each required check reads as passed. `ci-ok` fails in that case.
- **A check that is never created blocks.** A workflow that a `paths` filter skips leaves its required
  checks pending, and the PR cannot merge. That is why this template filters jobs and not the workflow.

## Config: env, and a parity test

The docs set lives in the workflow's `env`, not in `skills-config.yaml`. A runner need not have
`node` (tinker-city's has none), so the script cannot use agent-skills' YAML reader. A second
`jq`/`awk` YAML parser would be one more thing to keep honest. Decided in task.174, option (a).

The patterns are shell `case` patterns, and in a `case` pattern `*` matches `/`. So `*.md` covers
`**/*.md` at any depth, including the root, and `docs/*` covers `docs/**`. The pipeline rule's
`ci.docsOnly.patterns` are globs, so the strings differ. In agent-skills,
`docs/examples/ci/github-actions/docs-set-parity.test.js` checks behaviour instead: the template's
default and the pipeline rule's default (`["**/*.md", "docs/**"]`) give the same answer on a fixed
path list (`skills/x/SKILL.md`, `docs/a/b.yml`, `README.md`, `.github/workflows/ci.yml`,
`src/a.ts`).

If you widen or narrow one, do the same to the other. A path that CI calls docs and the pipeline
calls code costs a wait. A path that the pipeline calls docs and CI calls code costs a run, **and the
pipeline does not wait for that run**: it can accept or merge before the tests finish. When a test
reads the path, that is a merge without the test's answer.

## The docs set must not cover a file a test reads

A skip is safe only while nothing the heavy jobs run reads the files it covers. The default is
too wide for many repositories. `*.md docs/*` covers every Markdown file at any depth
(`scripts/README.md`, `tests/fixtures/a.md`, `apps/web/README.md`) and every file under `docs/`, whatever it is
(`docs/x.test.js`, `docs/build.sh`). A spec that reads a component catalogue, a guide or an app's
README then stops running on the one PR that breaks it.

**Find the readers before you adopt.** Run both searches from the repository root and read every hit:

```bash
# Tests, build configs and project inputs that name a Markdown file or docs/.
git grep -nE "\.mdx?|docs['\"/]" -- \
  '*.test.*' '*.spec.*' 'test/*' 'tests/*' '*/__tests__/*' \
  '*.config.*' '*.json' '*.toml' Makefile '.github/workflows/*' ':!*lock*'
# Tests that read a whole directory, so they name no file.
git grep -nE "readdir|opendir|glob|walk" -- \
  '*.test.*' '*.spec.*' 'test/*' 'tests/*' '*/__tests__/*'
```

Change the file patterns to your own test names. A hit in a comment or a message is not a reader. Look
also at what the searches cannot see: a path built from variables, a script a heavy job runs, a tool
that formats or lints Markdown inside a heavy job (a formatter's check is skipped with it).

**Then name directories, not file types.** List the directories nothing reads:

```yaml
DOCS_PATTERNS: "docs/tasks/* docs/prd/* docs/bugs/*"
```

- **`scripts/` and test directories are never docs**, Markdown included. Heavy jobs run the first, and
  fixtures live in the second. A `*.md` pattern covers both, so leave it out unless the searches show
  that no test reads a `.md` file.
- **Listing fails safe.** A path nobody listed is code, so a new directory runs the suite until
  someone decides otherwise.
- **A pattern cannot exclude.** `!docs/catalogue.md` excludes nothing. To keep one file of a directory
  as code, list its siblings and leave it out.
- **Mirror the list in `ci.docsOnly.patterns`**, in its own syntax (`docs/tasks/**`). The default there
  is on, and as wide as this one
  ([The docs-only CI rule](../reference/configuration.md#the-docs-only-ci-rule)).

Look again when a test starts to read a new file. Nothing in this template notices that for you.

## The merge-result trade-off

CI on a pull request tests the head **merged into the base**. A skip stands on `before`'s run,
which tested `before` merged into the base **as it was then**. If the base moved in between, the
skipped push's merge result was never run. The lookup is keyed by SHA alone, and GitHub cannot say
which PR or base a run belonged to.

This is accepted, as tinker-city's `merge-gate.mjs` accepts it: the push to the base after the
merge is a `push` event, and a code change there runs in full. If your base moves fast and your
merges need the merge result tested, keep a merge queue, or do not adopt this.

## `cancel-in-progress`

**Cancel pull-request runs only.** The snippet groups a PR's runs by workflow and PR number, and sets
`cancel-in-progress: ${{ github.event_name == 'pull_request' }}`. Each push run gets a group of its
own (its run id), because a shared group drops a *pending* run when a newer one queues, even with
`cancel-in-progress` off. The workflow name is in every group because concurrency groups are
repository-wide: without it, a second workflow that copied the block would cancel this one's run on
the same PR push. tinker-city's `ci.yml` likewise supersedes PR runs only. Once the classifier is
in place this is not optional.

On a pull request, a newer push cancels the older run. A cancelled run is not a success, so on its
own it never grants a skip. Any success on the same SHA does, so a cancelled run and a successful
re-run of `before` still grant one. Two quick pushes in a row (code, then docs) can mean `before`
(the code push) never finished. Then the docs push finds no evidence and runs in full. That is the
safe direction.

**A superseded run reads red on purpose; do not "fix" `ci-ok` with `if: !cancelled()`.** When a
newer push cancels a run, the `if: always()` aggregator fails on the cancelled job, so that run
reads red and the head's docs-only shortcut waits for a full run. That is a wall-clock cost, and it
is the price of failing closed. `!cancelled()` would skip `ci-ok` on a cancelled run, and GitHub
counts a skipped required check as passing, so a run cancelled by hand or stopped by
`timeout-minutes` would satisfy branch protection with no tests run. A job cannot tell a superseded
cancel from a manual one, so no condition inside `ci-ok` keeps both properties. Avoid the cost at
its source instead: do not push commits that supersede a run you still need. agent-skills' own
pipelines do this by asking `push-policy.sh` at every push (task 319): a commit that holds only
records waits for the next push that has to happen
([rule](../reference/configuration.md#when-the-pipelines-push)).

On the base branch the classifier asks for no evidence: a docs-only `before..after` push skips
whether or not `before` went green. With `cancel-in-progress: true` on every event, a docs-only
merge landing while a code merge's run is in flight would cancel that run and then skip its own.
PR-only cancellation removes that one case. It does **not** make the base-branch run of a code merge
always reach a verdict, and nothing in the template does. The docs merge after it still skips, and
the base head still shows green, when the code merge's run:

- failed (it is red on its own commit, and the green docs commit sits on top of it);
- was cancelled by hand, hit `timeout-minutes`, or lost its runner;
- was still running when the docs merge landed (it goes on to finish, and may go red).

This is the lifted behaviour, accepted for the same reason as the merge-result trade-off above. So
read the base branch by commit, not by its head: a red or unfinished run on a code merge is not
cleared by the green docs merge after it. If you need the base head itself to prove the code under
it passed, do not adopt the push-path skip: make the heavy jobs' `if:` run on every `push`
(`github.event_name == 'push' || needs.changes.outputs.code == 'true'`), or keep a merge queue.

## Wiring — Bitbucket Pipelines

Files, in agent-skills' `docs/examples/ci/bitbucket-pipelines/`: `classify-changes.sh`, its
`classify-changes.test.js`, and a `bitbucket-pipelines.yml` snippet.

Same contract, with two differences forced by Bitbucket:

- **No `before` SHA.** Bitbucket Pipelines does not expose the push's previous head. The
  classifier uses the pushed commit's **first parent** (`BITBUCKET_COMMIT^`). If that parent has a
  completed, `SUCCESSFUL` pull-request pipeline, and the change over it is all docs, the steps are
  skipped. A multi-commit push whose first parent never ran a pipeline finds no evidence and runs
  in full.
- **Only pull-request pipelines classify.** A branch pipeline always runs in full.

There is no job-level `if:` on an output, so the `changes` step writes `ci-changes.env` as an
artifact. Each heavy step exits early only on an explicit `code=false`. Use `clone: depth: full`,
or the merge base is out of reach and nothing ever skips.

Credentials, in the order agent-skills' `bitbucket-auth.sh` uses: `BITBUCKET_ACCESS_TOKEN`
(Bearer), or `BITBUCKET_USERNAME` with `BITBUCKET_API_TOKEN` (Basic; `BITBUCKET_APP_PASSWORD` as a
fallback). The token needs **`read:pipeline:bitbucket`**.

> **A `403` is a missing scope, not "no CI".** Without `read:pipeline:bitbucket`, Bitbucket answers
> `403` on `/pipelines/`, while the repository and pull-request endpoints keep answering `200` on
> the same credential. `/finalise` records this trap from two live stories: see "A 403 here is the
> trap" in [`skills/finalise/SKILL.md`](../../skills/finalise/SKILL.md). The classifier decides on
> the status code, never the body. Any status but `200` runs the full suite, and a `403` is named
> as the missing scope.

The classifier also checks that each returned pipeline's own `target.commit.hash` is the parent.
It does not rely on the query filter alone: if the API ignored the filter, other commits'
pipelines would come back and grant a wrong skip.

### Bitbucket's own step condition, and the branch pipeline

Bitbucket can skip a step with no script, through `condition: changesets:` on the step
([dynamic step conditions](https://support.atlassian.com/bitbucket-cloud/docs/dynamic-step-conditions/)).
It is simpler than this template and needs no credential. What it compares depends on the pipeline:

| Pipeline | Compares | Safe? |
| --- | --- | --- |
| Pull request | the whole PR against its destination | Yes. Code anywhere in the PR runs the step, so a later docs-only push to a code PR also runs in full. This template's increment rule is what saves that run |
| Branch | the pushed commit against its first parent | Two risks, below |

Use `excludePaths`, never `includePaths`. With `excludePaths` a step is skipped only when **every**
changed file is listed, so a path nobody listed runs the step. With `includePaths` a path nobody
listed skips it. The rules for the list are the ones above.

On a **branch** trigger the condition sees one commit, whatever the push held:

1. **A direct push of a code commit and then a docs-only commit skips the code.** The pipeline runs
   for the last commit, whose own change is docs. The code commit under it is never tested.
2. **A docs-only merge makes a red branch read green.** The code merge before it failed, the docs
   merge skips its steps and passes, and the branch's badge shows the last result.

Choose one, and write the choice beside the condition:

- **Keep it on branch triggers** when the branch takes no direct push (every commit arrives by a PR, so
  risk 1 cannot happen) and people read the branch by commit, not by its badge.
- **Drop it from branch triggers** when direct pushes happen, or when the badge or a deployment reads
  the branch's last result. Each docs-only merge then costs one full run.

This template's `classify-changes.sh` takes the second choice: a branch pipeline always runs in full.
Risk 1 does not exist on GitHub, where `before..after` covers the whole push. Risk 2 does; see
[`cancel-in-progress`](#cancel-in-progress) for what the push path gives up.

## Adoption prompt

Paste this into an agent session opened in your own repository. It changes CI configuration, so read
the result before you merge it.

```text
Adopt agent-skills' docs-only CI skip in this repository, so that each push gets one CI run and a
docs-only change skips the heavy jobs. Guide: docs/runbooks/ci-docs-only-skip.md in
https://github.com/Gamaroff/agent-skills. Read all of it first. Its templates are in
docs/examples/ci/ in the same repository. Work on a new branch. Ask me before you merge anything,
and before you change branch protection or required checks.

1. Audit, and report before you edit:
   - every workflow or pipeline trigger, and each push that starts more than one run;
   - every required check and merge check, and the job each one reads. Keep existing job names
     unchanged;
   - which jobs are heavy, and which must always run (linters, secret scans, docs checks);
   - every file outside the code that a test, a build config or a project input reads. Use the
     guide's two searches, and say what they cannot see here.
2. Apply, and nothing else:
   - limit the branch triggers to long-lived branches, and tell me what loses its run;
   - set DOCS_PATTERNS to directories that nothing reads, and ci.docsOnly.patterns in
     skills-config.yaml (if this repository has one) to the same set. scripts/ and test directories
     are never docs;
   - GitHub: the changes job, the gate on each heavy job, an aggregate job that fails when changes
     did not succeed, and the cancel-in-progress block exactly as the snippet has it;
   - Bitbucket: the changes step and the early exit in each heavy step, or Bitbucket's own
     excludePaths condition, with my choice for branch triggers written beside it.
   List any required check that must move to the aggregate job, and wait for my answer.
3. Prove it on throwaway PRs, based on the adoption branch, because the base branch does not have
   the new configuration yet. If a trigger filters PRs by base branch, tell me before you work
   around it:
   - a docs-only PR: heavy jobs skipped, the aggregate check passed. Branch protection may not apply
     on that base, so "mergeable" there proves little: name each check the real base requires, and
     show that it was reported and passed;
   - a code PR: heavy jobs ran;
   - a docs-only push onto that code PR once it is green: heavy jobs skipped (this template), or run
     again (Bitbucket's own condition);
   - a PR that changes one file a test reads: heavy jobs ran.
   Give me the run link for each. A heavy job that was skipped on any PR with code in it is a stop:
   remove the gates and tell me.
4. Close the throwaway PRs and delete their branches. Then open the adoption PR and ask me before
   you merge it.
```

## Rolling back

- **One push ran tests it should not have skipped?** Treat it as critical: any `code=false` on a
  non-docs change. Remove the `if:` gates (GitHub) or the early-exit line (Bitbucket), and every job
  runs again on the next push. Then report it against agent-skills, with the run.
- **A docs-only push still ran in full?** That is non-critical. Read the `changes` job's log: each
  "running the full suite" line names its reason.

## Provenance

Lifted from tinker-city task.127 (`scripts/ci/classify-changes.sh` and its spec, as merged at
`88f98a27`). Three changes: `DOCS_PATTERNS` and `CI_WORKFLOW_PATH` are inputs, and tinker-city's
per-lane `engine` output (its task.128) is gone. Every other lifted case in the spec still runs, in
agent-skills' `npm test`.
