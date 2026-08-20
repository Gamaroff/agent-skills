# Troubleshooting

> **Audience:** developers hitting unexpected behaviour in a pipeline.

Common failure modes for `develop-story`, `develop-task`, and the surrounding skills, plus what to do.

## Tracker auth failure (Jira 401 / Bitbucket 403 / `gh` not authenticated)

**Symptom:** Skill exits with `401 Unauthorized`, `403 Forbidden`, or `gh: not authenticated`. Local files written; remote sync skipped.

**Cause:** Missing or stale credentials.

**Fix — quickest path:** re-run the setup wizard, which detects existing `.env` values and lets you update only the bad one:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)
```

**Fix — manual:**

| Platform | Check |
|---|---|
| GitHub | `gh auth status` — re-run `gh auth login` if expired |
| Jira | `curl -u "$JIRA_USER_EMAIL:$JIRA_API_TOKEN" "$JIRA_URL/rest/api/3/myself"` — should return your user JSON, not a 401 |
| Bitbucket | `source shared/resources/bitbucket-auth.sh && curl "${BB_CURL_AUTH[@]}" "https://api.bitbucket.org/2.0/user"` — the helper picks Bearer or Basic; `echo $BB_AUTH_SCHEME` says which |

**Bitbucket answers a bad credential with 404, not 401** — it hides private repositories from anonymous callers, so a missing token, an unscoped one, or the *wrong scheme* (Bearer sent where Basic was expected, or the reverse) all read as an *empty result* rather than an auth error, and are indistinguishable from each other. **Read the status code, never the length of the list.** Probe the repo root before believing an empty listing:

```bash
source shared/resources/bitbucket-auth.sh || echo "no credential resolved"
echo "scheme: $BB_AUTH_SCHEME"
curl -s -o /dev/null -w '%{http_code}\n' \
  "${BB_CURL_AUTH[@]}" \
  "https://api.bitbucket.org/2.0/repositories/{workspace}/{repo}"   # expect 200
```

Tokens are revocable — if `curl` confirms the creds are wrong, regenerate at [id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens). The **same page serves both**: Jira needs no extra scopes, Bitbucket needs the **Bitbucket scopes ticked** at creation time. (Bitbucket app passwords were removed by Atlassian on 2026-07-28; only the older `BITBUCKET_APP_PASSWORD` variable *name* survives as a fallback.) To work offline without fixing this, choose **Skip — docs only** at the tracker prompt — the creation and review skills never sync without it.

## `setup-consumer.sh` install fails or `.agents/skills/` is empty

**Symptom:** Install command errors with `Could not resolve host`, HTTP `404`, or finishes with `.agents/skills/` empty.

**Cause:** Network issue, GitHub rate limit on unauthenticated tarball downloads, or no GitHub releases yet (script falls back to `main`).

**Fix:**

```bash
# Verify network reach to GitHub
curl -fsSL -o /dev/null https://github.com/Gamaroff/agent-skills && echo ok

# Pin to a specific tag to bypass the releases API call
SKILLS_VERSION=v1.0.0 bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh) --update

# Fall back to the main branch directly (unpinned)
SKILLS_VERSION=main bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh) --update
```

**Offline / locked-down CI:** use the zip path documented in [`../concepts/getting-started.md`](../concepts/getting-started.md#option-c--manual-zip-install-offline--locked-down-ci).

## Hooks not firing — `.claude/settings.json` missing or empty

**Symptom:** `/develop-story` and `/develop-task` don't auto-advance through phases. Pipeline stalls after each skill returns instead of continuing.

**Cause:** Pipeline hooks (`PreCompact`, `Stop`) aren't registered in `.claude/settings.json`.

**Fix:**

```bash
# Verify hooks are present
cat .claude/settings.json | jq '.hooks'
# Should show keys: PreCompact, Stop

# Install or re-install (idempotent — preserves other settings)
bash .agents/skills/develop-task/scripts/install-hooks.sh

# Preview without writing
bash .agents/skills/develop-task/scripts/install-hooks.sh --dry-run
```

If the hook script is missing, your skills aren't installed yet. Run the full wizard first:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/Gamaroff/agent-skills/main/scripts/setup-consumer.sh)
```

## Skills not picking up stories / tasks from the expected location

**Symptom:** `create-story` or `develop-story` can't find epics, or writes artifacts to the wrong directory.

**Cause:** Either the PRD root in `skills-config.yaml` doesn't match where your files actually live, or your nested layout doesn't match the [fixed conventions](./configuration.md#configurable-roots-and-fixed-conventions).

**Fix:** verify your configured root and the nested layout:

```bash
# What's the configured PRD root?
source shared/resources/resolve-paths.sh
echo "PRD_ROOT=$PRD_ROOT ARCH_ROOT=$ARCH_ROOT"

# Does it exist?
ls "$PRD_ROOT"                              # base PRD directory
ls "$PRD_ROOT"/*/epics/epic.*.md            # epic files
ls "$PRD_ROOT"/*/epics/*/stories            # nested story directories
```

If the root is wrong, set `prd.prdShardedLocation` in `skills-config.yaml` to the right path. If the *nested* layout is non-standard (e.g. you have a global `docs/stories/` folder), move files onto the convention — skills won't adapt to custom nested layouts.

## Pipeline halts with "epic frontmatter missing"

**Symptom:** `develop-story` exits immediately. The story file has no `epic:` field in frontmatter.

**Cause:** Hard gate — every story must declare its parent epic for branch targeting.

**Fix:** Add `epic: epic.{N}.{name}` to the story frontmatter, matching the parent epic directory stem exactly. Re-run.

See [Story documents](../standards/story-documents.md#frontmatter-schema).

## Branch base mis-pick

**Symptom:** Phase 0 created the story branch from `main` (or the wrong base) and the PR diff is huge.

**Cause:** You accepted the default at the Phase 0 Q1 prompt without checking that the project's integration branch is `develop` (not `main`), or Q1 and Q2 disagreed — basing on an epic integration branch and then targeting `develop` yields a PR containing every earlier story in the epic.

**Fix:** rebase onto the base you meant, where `{CORRECT_BASE}` is `develop` or the epic integration branch (`epic/{N}.{slug}`):

```bash
git checkout feature/story.{E}.{S}.{name}
git rebase --onto {CORRECT_BASE} <wrong-base>
git push --force-with-lease
```

If the PR is already open, update its base via `gh pr edit --base {CORRECT_BASE}`. Q1 and Q2 must name the same branch.

## Epic / task registry collision

**Symptom:** `create-epic` or `create-task` fails because the assigned number already exists.

**Cause:** Another author created an artifact with the same number, or you used a stale registry snapshot.

**Fix:** Pull the latest registry. The skill re-reads **Next Available** and assigns the next free number. If you've already committed locally with a colliding number, rename your epic/task directory and file to the new number before pushing.

See [Epic registry](../standards/epic-registry.md), [Task registry](../standards/task-registry.md).

## Gate file conflicts

**Symptom:** Merge conflict on `*.gate.{N}.{name}.yml` after rebasing on `develop` or the epic branch.

**Cause:** A new QA run on the parent branch produced a different gate decision.

**Fix:** Do not hand-merge gate files. Discard your local gate file and re-run `qa-story` / `qa-task` to regenerate it. **Dev skills must never modify gate files** — they're owned by QA skills.

```bash
git checkout --theirs path/to/story.{E}.{S}.gate.{N}.{name}.yml
/qa-story <story-path>
```

## "Status mismatch" in finalise DoD check

**Symptom:** `finalise` fails the DoD check with a status-sync error.

**Cause:** Frontmatter `status:` (lowercase kebab) and body `**Status:**` (Title Case) are out of sync.

**Fix:** Update both in the same edit. The `finalise` skill enforces this and will repeat the check after correction.

See [Status lifecycle](../standards/status-lifecycle.md).

## Lite mode surprise: side-effects still ran

**Symptom:** You expected `--lite` to skip the PR comment / tracker update.

**Cause:** This is by design. Lite mode skips context-gathering before development; Step 7 (`finalise`) always runs its full side-effects — DoD post to PR, tracker comment, board update.

**Fix:** Not a bug. If you genuinely need to skip Step 7, bypass `develop-*` and drive the pipeline manually.

## Develop loop hits `MAX_ITER=5`

**Symptom:** Develop step gives up after 5 iterations without passing acceptance criteria.

**Cause:** The story / task is too large or has ambiguous criteria. The bounded loop prevents runaway agent costs.

**Fix:**

1. Run `review-story` / `review-task` and tighten acceptance criteria.
2. If still too large, split the story (use `create-story` for sibling stories).
3. Re-invoke `/develop-*` — it resumes from the last completed step.

## QA fix loop hits 5 cycles

**Symptom:** `qa-fix` ran five times and the gate is still `CONCERNS` or `FAIL`.

**Cause:** The fixes don't address root cause, or the gate findings are infrastructure-level and need human attention.

**Fix:** Stop the orchestrator. Read the QA report, address the underlying issue manually, then run `/qa-story` or `/qa-task` to re-gate. Consider whether the failures warrant a `WAIVED` decision recorded via `/qa-gate`.

## Resume picked up the wrong step

**Symptom:** Re-invoking `/develop-story <path>` skipped a step you wanted to redo.

**Cause:** The artifact for that step exists on disk (branch, PR, gate file, implementation report) so the resume detector treats it as complete.

**Fix:** Delete the relevant artifact before re-running:

| To redo | Delete |
|---|---|
| Branch creation | The local branch (`git branch -D feature/story…`) |
| PR creation | The PR (`gh pr close --delete-branch`) |
| QA review | The gate file `*.gate.{N}.{name}.yml` |
| Implementation report | `*.implementation.{N}.{name}.md` |

## Platform resolver picked the wrong tracker

**Symptom:** GitHub issue created when you wanted Jira (or vice versa).

**Cause:** Resolver order: `skills-config.yaml` `tracker:` → env `JIRA_URL` → git remote → default GitHub.

**Fix:** Pin the choice explicitly in `skills-config.yaml`:

```yaml
tracker: jira     # or github
vcs: bitbucket    # or github
```

See [platform detection](../../shared/resources/platform-detection.md).

## My Jira card did not move, and nothing failed

**Symptom:** a sync or a pipeline step reports success, but the Jira issue was not created,
not updated, or not transitioned. The `--json` payload carries `"reason": "deferred"`, a
`record` id, and `jira_key: null` on a create. Output lines start `⏸️`.

**Cause:** `access.tracker` is set to something other than `full`, so the run may not write to
the tracker. The write was **refused and recorded**, not lost and not silently skipped. As of
task.53 this covers every Jira REST mutation — the shared `jira-sync.js` HTTP layer, the sprint
scripts, and `jira-epic-creator.js` — plus the board moves the stage CLIs own. A mutation nobody
annotated is still refused; it is recorded generically as `jira.unknown-mutation`.

The resolver says so on every restricted run:

```
⚠️  access.tracker=manual is PARTIALLY ENFORCED — Jira REST via jira-sync.js, the sprint scripts,
    board/status moves, the GitHub board-field helpers, every gh mutation routed through
    tracker_write, and the GitHub issue lifecycle via tracker-issue.js (create, edit, close,
    reopen, milestone, sub-issue link) are deferred and recorded, but Jira writes made by raw
    curl or the Atlassian MCP tools still proceed normally.
```

**Fix — read what was deferred, then either perform it or lift the restriction:**

```bash
cat .claude/state/tracker-actions.jsonl | jq -r '.intent'            # what the run wanted to do
node .agents/skills/develop-task/references/handover-render.js \
  --format md --format sh                                            # a checklist and a script
```

Then either work the checklist by hand, or re-run with `access.tracker: full` in
`skills-config.yaml` (config and env are read independently and the **more restrictive** wins,
so also check `AGENT_SKILLS_ACCESS_TRACKER`).

Narrative, decision guide, and a walkthrough against this repo's board:
[Restricted tracker access](../concepts/restricted-access.md),
[Which access model?](../concepts/which-access.md),
[Restricted access runbook](../runbooks/restricted-access.md).

## I re-ran it and it did nothing again

**Symptom:** a restricted run reported a `BLOCKING` action. You re-ran the same command and it
reported exactly the same thing. Nothing changed either time, and nothing failed.

**This is the expected behaviour, and it is the one place it looks most like a bug.**

**Cause:** the blocked action produces a value the run cannot obtain for itself — an issue number
from `gh issue create`, a milestone number. The run recorded the action and left the document's
frontmatter **unwritten**, because it has nothing true to write there.

Re-running cannot help on its own. The run has no way to learn the value except from the document,
so a second run makes the same discovery and records the same action. That is the **two-run
convergence**, and the middle step is the one that is easy to miss:

1. Perform the action. The checklist gives the deep link and the exact fields:

   ```bash
   node .agents/skills/develop-task/references/handover-render.js --format md
   ```

   Blocking actions are at the **top**, under a `🚫 BLOCKING — do these first` banner.

2. **Write the value it produced into the document's frontmatter** — `github_issue: 207`,
   `jira_key: PROJ-42`. This is the step that makes the next run different.

3. Re-run. The skill finds the field present and takes its ordinary update path.

**Why no placeholder was written for you.** Writing `github_issue: 0` or `jira_key: <pending>`
would let the run "continue", but the next run's idempotent lookup keys off that field: a wrong
value makes it create a **second** issue rather than finding the first. A duplicate somebody has
to notice and clean up is worse than a field left empty — so the run leaves it empty, says so,
and tells you what to put there.

Contract: [`tracker-issue-cli.md`](../../shared/resources/tracker-issue-cli.md) →
*The two-run convergence*.

**Not this:** a deferred create never writes a placeholder key to frontmatter. That is
deliberate — a placeholder would break the idempotent `synced-from-*` label search and the next
unrestricted run would create a duplicate. `jira_key` stays absent until the issue really exists.

Full schema and the roster of mutation kinds:
[`tracker-access-record.md`](../../shared/resources/tracker-access-record.md).

## The board column did not change, and nothing failed

**Symptom:** a pipeline step reports success but the card sits where it was. The `--json` payload
from `gh-stage.js` exits 0 — as it does for every documented outcome — so the exit code tells you
nothing. **Read `reason`.** Each of these is a *correct* outcome on some board:

| `reason` | What actually happened | What to do |
| --- | --- | --- |
| `deferred` | `access.tracker` is not `full`; the move was recorded, not performed | Work the handover checklist — see the section above |
| `already` | The card was already in the target column | Nothing. This is success |
| `stage-disabled` | Your `pipeline:` omits this moment | Nothing, if deliberate. Add the moment to `tracker-workflow.yaml` if not |
| `would-regress` | A human moved the card further along than this moment | Nothing — the board is ahead of the pipeline. `--allow-regress` overrides |
| `no-option` | The Status field has no column matching this moment | Fix the moment's target in `tracker-workflow.yaml`, or add the column |
| `not-on-board` | The issue is on no project board at all | Add it, or pass `--add-to-board` on the `work-started` call |
| `ambiguous-board` | The issue is on several boards and none was chosen | Set `github.projectBoard` in `skills-config.yaml` |

**Find out which column the moment even wanted — no credentials needed:**

```bash
node .agents/skills/develop-task/references/gh-stage.js --stage done --print-plan
```

That reads your ladder file alone and prints the target rung. Compare it with what the board really
has:

```bash
node .agents/skills/develop-task/references/gh-stage.js --probe-board   # the board's real options
node .agents/skills/develop-task/references/gh-stage.js --issue 42 --stage done --dry-run --json
```

If `--print-plan` names a column `--probe-board` does not list, your `tracker-workflow.yaml` is stale
— the board was renamed under it. `--dry-run` is the authority; the ladder file is a declaration.

**Priority or Estimate, not Status?** Those are different scripts —
`set-github-project-priority.sh` and `set-github-project-estimate.sh`. `gh-stage.js` owns the Status
field and nothing else. Both helpers always exit 0 and log their outcome; under a restricted access
mode both defer and record rather than write, and print `⏸️` with the record id.

## Everything is deferred, and I did not restrict anything

**Symptom:** every tracker write is refused and recorded, but `skills-config.yaml` declares no
`access.tracker` — or declares `full`. One line names a file and a reason:

```
⚠️  /path/to/skills-config.yaml was refused — 1: this file uses an anchor (`&name`), which the
    no-dependency config reader cannot parse. Resolving tracker access to "manual" — refusing
    rather than defaulting to "full", because that would silently escalate a declared
    restriction into a tracker write.
```

> The line deliberately does **not** begin `access.tracker:`. `resolve-platform.sh` also exits
> non-zero for an invalid `tracker:`/`vcs:` value and for `access.vcs`, so naming `access.tracker`
> as the cause misattributed those refusals. The resolver's own message, carried verbatim above,
> says which it was.

**Cause:** the config file exists and mentions `access`, but could not be read *correctly*. That is
not the same as "declares nothing", and the two must not resolve the same way — reading an
unreadable file as absent is what silently granted `full` over a committed restriction. The reader
refuses instead, and the JavaScript gates turn that refusal into the most restrictive mode.

The reason names the construct. On a host without `pyyaml` the no-dependency reader accepts a
documented subset of YAML; an anchor, an alias, a merge key, a document separator, a BOM, an
explicit tag or a multi-line flow mapping is outside it, as is a quoted or space-padded spelling of
a key the reader consumes. See
[Platform Detection → Tier 2 — the strict subset](../../shared/resources/platform-detection.md#tier-2--the-strict-subset).

**Fix — either rewrite the construct, or install a real parser:**

```bash
# See exactly what the reader objects to, and on which line:
SKILLS_CONFIG_FILE=skills-config.yaml bash -c 'source shared/resources/resolve-platform.sh'

python3 -m pip install pyyaml     # or: rewrite the offending line in the subset
```

A repo whose config declares no access restriction is never affected: it resolves to `full`. Note
the check is deliberately generous — the word `access` appearing **anywhere**, including inside a
comment, is enough to make the reader run, because under-matching it would be an escalation and
over-matching it is only slow. So a config that documents the option in a commented-out block does
pay one subprocess per process, and still answers `full`.

**Not this:** do not "fix" it by setting `AGENT_SKILLS_ACCESS_TRACKER=full`. Config and env are
reduced most-restrictively, so that changes nothing — by design. The file has to become readable.

## The handover says UNRECORDED

**Symptom:** `*.handover.*.md` contains `⚠️ UNRECORDED` for a kind (or the `.sh` echoes it).

**Cause:** the pipeline moment that should have written a deferred-mutation record did not. The
handover renders the gap on purpose so drift is visible — this is not a skip.

**Fix:** treat it as a run defect. Re-run the step that owns that kind, or file a bug against the
skill that performed the write without going through `defer-mutation` / `tracker_write`. Do not
delete the UNRECORDED line to make the checklist look clean.

## `/tracker-reconcile` is not a command yet

**Symptom:** the agent cannot find a `tracker-reconcile` skill, or you expected `--apply` to tick
the committed checklist from the live board.

**Cause:** `/tracker-reconcile` is **not shipped**. Task.57 is still `planned`. `divergent` and
`unverifiable` are glossary terms for that skill; they are not states the current renderer writes.

**Fix:** work the `.md` checklist (or the `.sh` under `command`) by hand. When task.57 lands,
reconcile will refuse `--apply` under `manual`, `command`, and `read-only`.

## `/develop-next` ran, and the board still did not move

**Symptom:** you set `access.tracker: manual` expecting `/develop-next` or `/develop-batch` to
refuse. They ran. The PR merged. The card is still in `Todo`.

**Cause:** those orchestrators refuse restricted **VCS** access (`access.vcs` only accepts `full`).
They do **not** refuse restricted **tracker** access. Tracker writes are deferred; git push and
`gh pr merge` still happen.

**Fix:** expected. Work the handover. If you needed the orchestrator not to run at all, that
behaviour does not exist.

## The GitHub issue appeared on the second run, not the first

**Symptom:** a restricted create left `github_issue` / `jira_key` empty. A later `full` (or
unrestricted) run created the issue.

**Cause:** two-run convergence. A deferred create never writes a placeholder key — a placeholder
would duplicate on retry.

**Fix:** expected. Do not invent a key by hand.

## I used Skip — docs only, but I wanted the board updated by a human

**Symptom:** no handover, no issue, local docs only.

**Cause:** **Skip — docs only** means *no tracker for this run*. Restricted access
(`access.tracker: manual` / `command`) means *there is a tracker, the agent must not write to it*.

**Fix:** do not Skip. Set an access model — [Which access model?](../concepts/which-access.md).

## See also

- [Story Development Runbook](../runbooks/story-development.md)
- [Task Development Runbook](../runbooks/task-development.md)
- [QA Flow Runbook](../runbooks/qa-flow.md)
- [Restricted Access Runbook](../runbooks/restricted-access.md)
- [Restricted tracker access](../concepts/restricted-access.md)
- [Configuration](./configuration.md)
- [Standards](../standards/README.md)
