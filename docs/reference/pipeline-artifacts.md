# Pipeline Artifacts

> **Audience:** developers using these skills in a downstream project.

Every file `/develop-story` and `/develop-task` create, in the order the pipeline creates them. Use this to answer "what should be on disk right now?", "why is this file here?", and "what do I commit?".

Filename grammar lives in [File naming](../standards/file-naming.md); this page says **who writes each file, when, and what happens to it**.

## Where artifacts land

Everything the pipeline produces is **co-located with the work item** — there is no central `docs/qa/` or `docs/reports/` directory.

```
docs/prd/{domain}/{feature}/epics/epic.{N}.{name}/stories/story.{E}.{S}.{name}/
├── story.{E}.{S}.{name}.md                     # you wrote this
├── story.{E}.{S}.plan.{name}.md                # you (or /plan) wrote this
├── story.{E}.{S}.review.{n}.{name}.md          # ← Step 2
├── story.{E}.{S}.implementation.{n}.{name}.md  # ← Phase 0e, appended to all run
├── story.{E}.{S}.qa.{n}.{name}.md              # ← Step 5, one per QA cycle
├── story.{E}.{S}.gate.{n}.{name}.yml           # ← Step 5, one per QA cycle
├── story.{E}.{S}.pr-review.{n}.{name}.md       # ← Step 5c, on the cycle that exits
├── story.{E}.{S}.dod.{n}.{name}.md             # ← Step 7
└── .summaries/                                 # ← runtime only, gitignored
```

```
docs/tasks/task.{N}.{name}/
├── task.{N}.{name}.md                          # you wrote this
├── task.{N}.plan.{name}.md                     # you (or /plan) wrote this
├── task.{N}.review.{n}.{name}.md               # ← Step 2
├── task.{N}.implementation.{n}.{name}.md       # ← Phase 0e, appended to all run
├── task.{N}.qa.{n}.{name}.md                   # ← Step 5, one per QA cycle
├── task.{N}.gate.{n}.{name}.yml                # ← Step 5, one per QA cycle
├── task.{N}.pr-review.{n}.{name}.md            # ← Step 5c, on the cycle that exits
├── task.{N}.dod.{n}.{name}.md                  # ← Step 7
├── task.{N}.handover.{n}.{name}.md             # ← run end, only when a mutation was deferred
├── task.{N}.handover.{n}.{name}.sh             # ← the same records, as a runnable script
├── task.{N}.handover.{n}.{name}.json           # ← the same records, for task.57's reconcile
└── .summaries/                                 # ← runtime only, gitignored
```

The two pipelines are the same shape. Read `story.{E}.{S}` and `task.{N}` as interchangeable prefixes below.

## Step → artifact

| Step | Skill | Artifact produced | Committed? |
| --- | --- | --- | --- |
| Phase 0e | (orchestrator) | **Implementation report** `*.implementation.{n}.{name}.md` | Yes — Step 8 |
| 1 | `create-branch` | **Feature branch** `feature/story.{E}.{S}.*` / `feature/task.{N}.*`, plus the epic integration branch if you chose one that did not exist | n/a (git ref) |
| 1 (end) | (orchestrator) | **Pipeline lock** `.claude/state/develop-pipeline.lock` | No |
| 2 | `review-story` / `review-task` | **Review report** `*.review.{n}.{name}.md` | Yes — Step 8 |
| 5c | `review-pr` | **PR review report** `*.pr-review.{n}.{name}.md` — the exit gate of the Steps 5–6 loop; also invocable standalone | Yes — Step 8 |
| 3 | `develop` | Source changes, tests, and transient **test logs** `.claude/state/test-output-{ITER}-*.log` | Source yes, logs no |
| 4 | `create-pr` | **Pull request** against the Q2 base | n/a (remote) |
| 5 | `qa-story` / `qa-task` | **QA report** `*.qa.{n}.{name}.md` **and gate file** `*.gate.{n}.{name}.yml` — one pair per cycle | Yes — Step 8 |
| 6 | `qa-fix` | Fix commits pushed to the branch (no new document) | Yes — immediately |
| 7 | `finalise` | **DoD summary** `*.dod.{n}.{name}.md`, a PR comment, a tracker-issue comment, a board move, and `status: accepted` on the work item | Yes — Step 8 |
| Run end | `handover-render` | **Tracker handover** `*.handover.{n}.{name}.{md,sh,json}` — written only when the run deferred (or failed) a tracker mutation; an empty journal writes nothing | Yes — Step 8 |
| 8 | `commit-changes` | The commit containing everything above marked "Yes" | — |

Steps 5–6 loop up to 5 cycles. Cycle *n* produces `qa.{n}` **and** `gate.{n}` as a pair — a gate file without its report (or vice versa) means the cycle did not finish, and resume will redo it.

**Step 5c is the loop's exit.** A gate reading `PASS` or `WAIVED` does not go straight to Step 7: it
hands to `review-pr`, which reviews the PR against the work item and returns a verdict. `REQUEST
CHANGES` routes back to `qa-fix` and consumes a cycle from the same 5-cycle budget; `APPROVE` and
`CONCERNS` exit to Step 7. So a completed run leaves **one** `pr-review.{n}` report, written on the
cycle that exited — not one per cycle. A clean gate with no `pr-review` report beside it means the
run stopped inside 5c.

## The eight documents, in plain terms

| Document | What it is | Who may edit it |
| --- | --- | --- |
| **Story / task file** | The work item. Source of truth for acceptance criteria and `status:`. | You; skills update `status:` and Change Log |
| **Plan** | How the work will be done. Written *before* the pipeline runs; the pipeline reads it and checks its mtime against the work item (Plan Freshness) but never rewrites it. | You |
| **Review report** | The pre-flight check — what was ambiguous, what got fixed, GO/NO-GO with a 1–10 readiness score. | `review-*` skills |
| **PR review report** | The post-flight check — does the PR deliver what the work item promised, and is the trail behind it complete? Advisory verdict, never a gate; the orchestrator is what acts on it. Written at **Step 5c**, the QA loop's exit gate, and also produced by a standalone `/review-pr` run. | `review-pr` |
| **Implementation report** | The pipeline's running log: Pipeline Progress table, Decisions Log, Issues Log, QA Iteration History. **This is the file to read when a run goes wrong** — it records every prompt answer and every fork taken. | The orchestrator, at every step |
| **QA report** | The full quality review for one cycle: NFR assessment, requirements traceability, findings. | `qa-*` skills |
| **Gate file** (`.yml`) | The machine-readable verdict for that cycle — `PASS` / `CONCERNS` / `FAIL` / `WAIVED`. Small on purpose: it is what tooling greps. | **`qa-*` skills only.** Dev skills must never write a gate file — see [Anti-patterns](./anti-patterns.md) |
| **DoD summary** | The Definition of Done checklist as evaluated at the end, and the thing posted to the PR. Its existence is what lets `status:` advance to `accepted`. | `finalise` |
| **Tracker handover** (`.md` / `.sh` / `.json`) | What the run wanted to change on the tracker but could not — because `access.tracker` restricts it, or because the call failed. Three renderings of one journal: a checklist to click through, a dry-run-by-default script to run, and a JSON sidecar for reconcile. Contains no credential by construction. Absent when nothing was deferred. | `handover-render`, from records written by `defer-mutation` |

Numbering (`{n}`) restarts per work item and increments per run or per cycle: a second pipeline run on the same story writes `implementation.2.…`, a second QA cycle writes `qa.2.…` + `gate.2.…`.

## Runtime state — not artifacts, and not yours to commit

These exist only while a pipeline is in flight (or just after a crash). All are gitignored.

| File | Purpose | Lifetime |
| --- | --- | --- |
| `.claude/state/develop-pipeline.lock` | Holds `current_step`, work-item path, and `pr_url`. This is what makes resume possible and what stops two pipelines colliding. | Created end of Step 1; deleted at Step 8 success or on HALT |
| `.claude/state/develop-pipeline.last-halt.json` | Snapshot of the lock at the moment of a terminal HALT, plus `halted_at` / `halt_reason` / `halt_step`. | Written on HALT; persists until you choose "Start fresh" on the next run |
| `.claude/state/test-output-{ITER}-*.log` | Raw test output for the triage subagent to read. | Deleted when tests pass; **retained on failure** so you can read it |
| `{work-item-dir}/.summaries/step-*.json` | Structured subagent results (pre-develop surface map, test-failure triage, QA traceability, post-fix tracker sync). Let the orchestrator drop bulky intermediate content from context and replay it on resume instead of re-running the subagent. | Retained on disk; resume tolerates absence |
| `{work-item-dir}/.summaries/qa-traceability-matrix.md` | AC → test mapping. `develop-story` only — `develop-task` does not produce one. | Overwritten each QA cycle |

If `.summaries/` is missing entirely, nothing is broken — resume falls back to the implementation report's prose.

## Verifying a completed run

```bash
# Work item dir — set to your story or task directory
D=docs/tasks/task.{N}.{name}

ls "$D"/*.implementation.*.md          # pipeline ran
ls "$D"/*.gate.*.yml                   # QA produced a verdict
grep '^gate:' "$D"/*.gate.*.yml        # ...and it is PASS or WAIVED
ls "$D"/*.dod.*.md                     # finalise completed
grep -E '^status:' "$D"/*.{N}.{name}.md   # should read: accepted
```

```bash
gh pr view --json baseRefName,state,statusCheckRollup
gh pr view --json comments | jq -r '.comments[].body' | grep -i 'definition of done'
```

A run that produced an implementation report but no gate file stopped in Steps 3–5. One with a gate file but no DoD summary stopped before Step 7. Re-invoking the same command resumes at the first incomplete step — it verifies these artifacts on disk rather than trusting the report, so it will not redo finished work.

## What to commit

Commit the whole work-item directory. Step 8 does this for you; if you are cleaning up by hand, the rule is:

- **Commit:** every `.md` and `.yml` in the work-item directory
- **Never commit:** `.summaries/`, `.claude/state/`

Both exclusions belong in your repo's `.gitignore`. If `.summaries/` shows up in `git status`, add it.

## See also

- [File naming](../standards/file-naming.md) — the filename grammar for every artifact above
- [Story documents](../standards/story-documents.md) / [Task documents](../standards/task-documents.md) — schemas and directory layout
- [Story Development](../runbooks/story-development.md) / [Task Development](../runbooks/task-development.md) — the step-by-step walkthroughs
- [Troubleshooting](./troubleshooting.md) — what to do when an expected artifact is missing
- [Worked examples](../../examples/README.md) — real artifacts this repo produced running its own pipeline
- `skills/develop-story/README.md` § Artifact Lifecycle Table — the maintainer-level view, including per-artifact resume verification commands
