# Troubleshooting

> **Audience:** developers hitting unexpected behaviour in a pipeline.

Common failure modes for `develop-story`, `develop-task`, and the surrounding skills, plus what to do.

## Pipeline halts with "epic frontmatter missing"

**Symptom:** `develop-story` exits immediately. The story file has no `epic:` field in frontmatter.

**Cause:** Hard gate — every story must declare its parent epic for branch targeting.

**Fix:** Add `epic: epic.{N}.{name}` to the story frontmatter, matching the parent epic directory stem exactly. Re-run.

See [Story documents](../standards/story-documents.md#frontmatter-schema).

## Branch base mis-pick

**Symptom:** Phase 0 created the story branch from `main` (or the wrong base) and the PR diff is huge.

**Cause:** You accepted the default at the Phase 0 base-branch prompt without checking that the project's integration branch is `develop` (not `main`).

**Fix:**

```bash
git checkout feature/story.{E}.{S}.{name}
git rebase --onto feature/epic.{N}.{name} <wrong-base>
git push --force-with-lease
```

If the PR is already open, update its base via `gh pr edit --base feature/epic.{N}.{name}`.

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

## See also

- [Story Development Runbook](../runbooks/story-development.md)
- [Task Development Runbook](../runbooks/task-development.md)
- [QA Flow Runbook](../runbooks/qa-flow.md)
- [Configuration](./configuration.md)
- [Standards](../standards/README.md)
