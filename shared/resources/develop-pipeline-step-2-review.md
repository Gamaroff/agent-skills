---
name: develop-pipeline-step-2-review
description: Step 2 (review) shared by develop-story and develop-task. Covers gate check logic (skip conditions), review skill invocation, output format autonomous decision, outcome detection with post-review status table, and blocking/non-blocking findings handling. Story vs task variants are called out where they differ (skill name, file patterns, status values, commit message format).
---

# Develop Pipeline — Step 2: Review

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Step 2. Story/task variants are called out in labeled sub-sections where they differ.

---

## Gate Check

Re-read the document's `Status:` field (captured in Phase 0). Then check for an existing review report:

#### develop-story
```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```

#### develop-task
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```

### Skip/Run Decision Table

#### develop-story

| Pre-review status       | Review report exists? | Action                                                                               |
| ----------------------- | --------------------- | ------------------------------------------------------------------------------------ |
| `Draft`                 | Either                | Run `/review-story` — story needs validation and promotion                           |
| `Ready for Development` | Yes                   | **Skip** — story reviewed and report exists; log and proceed                         |
| `Ready for Development` | No                    | Run `/review-story` — status set without completing a review                         |
| `In Progress`           | Yes                   | **Skip** — review already completed; log and proceed                                 |
| `In Progress`           | No                    | Run `/review-story` — story may have been marked In Progress without a proper review |

#### develop-task

| Pre-review status       | Review report exists?  | Action                                                                             |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------------------- |
| `Planned`               | Yes, and **current**   | **Skip** — the task is demonstrably reviewed; log and proceed                       |
| `Planned`               | No, or **stale**       | Run `/review-task` — task needs validation and promotion                           |
| `Ready for Development` | Yes                    | **Skip** — task reviewed and report exists; log and proceed                        |
| `Ready for Development` | No                     | Run `/review-task` — status set without completing a review                        |
| `In Progress`           | Yes                    | **Skip** — review already completed; log and proceed                               |
| `In Progress`           | No                     | Run `/review-task` — task may have been marked In Progress without a proper review |

**"Current" is defined, not judged.** A report is current when it is not older than the task
document's last content change. Compute it with the engine — never eyeball the two dates:

```bash
node -e '
  const fs = require("fs");
  const { classifyReviewReport, describeVerdict } =
    require("./.agents/skills/{develop-story|develop-task|develop-bug}/references/review-report-freshness.js");
  const r = classifyReviewReport({
    taskContent:   fs.readFileSync(process.argv[1], "utf8"),
    reportContent: process.argv[2] ? fs.readFileSync(process.argv[2], "utf8") : null,
  });
  console.log(JSON.stringify({ ...r, message: describeVerdict(r, { reportPath: process.argv[2] }) }));
' "{task-file}" "{resolved-report-file-or-empty}"
```

Engine source: `shared/resources/review-report-freshness.js` (bundled into each skill as
`references/review-report-freshness.js`). It is a **library, not a CLI** — deliberately, because its
only caller is this gate and a CLI would be a second interface to keep honest. It returns
`{verdict, reason, taskDate, reportDate}` with `verdict ∈ {fresh, stale, absent}`.

**Only `fresh` skips.** `stale` and `absent` both run the review, and so does every malformed input —
the module resolves each ambiguity toward running, because a needless review costs one pass while a
wrong skip develops against an unreviewed card.

The task's date is its frontmatter `updated:`. The report's date is its body `**Reviewed:**` line,
falling back to `**Review Date:**` — **not** frontmatter, which review reports mostly do not carry,
and **not** filesystem mtime, which is the checkout time in a fresh clone and would make the gate
decide differently in CI than on a developer's machine.

> ⚠️ **`Planned` + a current report was added 2026-09-07, closing a gate whose only intuitive remedy
> was a no-op.** This row previously read `Planned` + *either* → run the review, so the skip decision
> keyed on **status** while the fact that answers "has this been reviewed?" is the **report**. Any
> path that leaves a reviewed task at `planned` — and two exist, `sign-off.enforcement: blocking` and
> `change-log.enforcement: blocking`, both of which run a full review and then decline to promote —
> produced a card that was demonstrably reviewed and permanently unstartable. The halt landed before
> any work existed, which is the point at which an operator reaches for a re-review rather than
> questioning the gate; and a re-review cannot clear it, because whatever withheld the promotion
> fires again identically.
>
> Reported by a consumer (`rebirth-wallet` task.113 / RAPP-728) that **predicted** the halt from
> reading these tables and steered around it by hand rather than hitting it — the operator ruled
> "Skip — already reviewed" at Phase 0d. The consumer's diagnosis, that the two tables contradict
> each other, does not hold: `/review-task` does promote `planned → ready-for-development`, so the
> tables were consistent and the halt was the correct response to a promotion that did not happen.
> What was wrong was that the correct halt had no recovery path. Freshness is what keeps the gate
> honest while giving it one — a stale report is not evidence about a card that has since been
> rewritten.

> **Resolving *which* report is the caller's job, and `sort | tail -1` does not do it.** Report
> filenames come in at least three shapes — `task.12.review.2026-05-06.md`,
> `task.11.review-task-tracker-dedup.review.2026-05-06.md`, and the canonical
> `task.97.review.1.name.md` — so the date is not reliably the last sortable segment and the newest
> filename is not reliably the newest report. Where several exist, prefer the highest `review.{N}.`
> index; the freshness engine takes the resolved report's **contents**, not a glob, precisely so this
> decision stays visible here rather than hiding inside it.

---

## If Skipping

#### develop-story
- Log in Decisions Log: "review-story skipped — story status is `{status}` and review report exists at `{path}`"
- Update Pipeline Progress: ✅ review-story (skipped — already reviewed)

#### develop-task
- Log in Decisions Log: "review-task skipped — task status is `{status}` and review report exists at `{path}`"
- When the status was `Planned`, the freshness verdict is what authorised the skip, so log it too:
  "review-task skipped — task status is `Planned` and `{path}` is current ({reportDate} ≥ updated {taskDate})".
  A skip on `Planned` that does not record both dates is indistinguishable in the log from the
  status-only skip this row replaced.
- Update Pipeline Progress: ✅ review-task (skipped — already reviewed)

**Post skip notice to tracker issue** (non-blocking — skip if `TRACKER_ISSUE` is empty):

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
## 📋 Review — Step 2/8

**Outcome**: Skipped — already reviewed
**Status**: {status}
**Review report**: {path}
EOF

node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage review --json
```

> Engine source: `shared/resources/tracker-comment.js` (bundled into each skill as `references/tracker-comment.js`). Contract: `shared/resources/tracker-comment-contract.md`.


Read `reason` and act per the table in [`shared/resources/tracker-comment-contract.md`](tracker-comment-contract.md) — `posted`/`already`/`deferred` need nothing, `unverifiable` is logged and never posted over, and `no-credentials` is the one case that may fall back to MCP.

On failure: log warning in Issues Log and continue.

Proceed to Step 3.

---

## If Running the Review Skill

#### develop-story
Invoke the `/review-story` skill with the story file path in **validate-and-apply** mode (`MODE=validate` + `APPLY=true`). This is non-interactive — no output-format question is asked. The variant scores the story, applies critical + important fixes, and promotes `Draft → Ready for Development` on a GO (HALT on NO-GO), then writes a comprehensive `story.{epic}.{story}.review.{n}.{story-name}.md` report for the pipeline audit trail. Log: "review-story invoked in validate-and-apply mode".

After review-story completes, locate the generated review report:
```bash
ls {story-directory}/story.{epic}.{story}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-story did not produce a review report file") but do not halt.

#### develop-task
Invoke the `/review-task` skill with the task file path.

**Output format gate**: `/review-task` Step 0 asks for output format. The pipeline auto-answers "Comprehensive report" (the canonical default lives in `shared/resources/develop-pipeline-autonomous-defaults.md`). Log: "review-task output: Comprehensive report — required for pipeline audit trail".

After review-task completes, locate the generated review report:
```bash
ls {task-directory}/task.{id}.review.*.md 2>/dev/null | sort | tail -1
```
Record the path in the Decisions Log: "Review report: {path}". If no review report file is found, log a warning in the Issues Log ("review-task did not produce a review report file") but do not halt — the post-review table below is what decides, and it needs the status as well as the report.

> **`sort | tail -1` is a heuristic here, and it is wrong for some real filenames.** Reports exist in
> at least three shapes (`task.12.review.2026-05-06.md`, `task.11.slug.review.2026-05-06.md`,
> `task.97.review.1.slug.md`), so lexical order is not recency order across them. Where more than one
> matches, prefer the highest `review.{N}.` index and fall back to this `ls` only when no report
> carries one. This matters more than it used to: the Skip/Run table now lets a *current* report
> authorise skipping the review, so picking the wrong report is no longer merely a mis-logged path.

---

## Detecting Outcomes

Re-read the document file and check the `Status:` field. Apply these autonomous rules:

#### develop-story post-review status table

| Post-review status      | Action                                                             |
| ----------------------- | ------------------------------------------------------------------ |
| `Ready for Development` | Proceed — draft promoted                                           |
| `In Progress`           | Proceed — acceptable intermediate state                            |
| `Draft` (unchanged)     | review-story left it Draft — log as issue, HALT and report to user |
| Downgraded / unclear    | HALT — report to user                                              |

#### develop-task post-review status table

| Post-review status      | A report now exists?                                        | Action                                        |
| ----------------------- | ----------------------------------------------------------- | --------------------------------------------- |
| `Ready for Development` | —                                                           | Proceed — clean pass or Planned promoted      |
| `In Progress`           | —                                                           | Proceed — acceptable intermediate state       |
| `Planned` (unchanged)   | Yes — written this run, or already present and **current**  | Proceed — log as an issue, do **not** HALT    |
| `Planned` (unchanged)   | Yes, but **stale**, and none written this run               | **HALT** — log as an issue and report to user |
| `Planned` (unchanged)   | No — none written, none already present                     | **HALT** — log as an issue and report to user |
| Downgraded / unclear    | —                                                           | HALT — report to user                         |

**The three `Planned` rows are exhaustive on purpose.** A report is `fresh`, `stale`, or `absent` —
the freshness engine returns exactly those three — so every state has a row. An earlier draft of this
table had only the first and third, which left a *pre-existing stale* report matching neither: the
skip table correctly ran the review, the review wrote no new report and did not promote, and the run
fell through to "a report exists → proceed" and developed against a report that reviewed an earlier
version of the card. **That is the same over-permissive skip the freshness rule exists to prevent,
reintroduced in prose after the code had refused it.** A decision table in a runnable-prose
deliverable is executed by a reader; a gap in it is a branch, not an omission.

> ⚠️ **The unconditional `Planned` → HALT was narrowed 2026-09-07: a review that ran, wrote its
> report and left the status alone is a completed review, not a failed one.** Two supported
> configurations produce exactly that — `sign-off.enforcement: blocking` with an unsigned row, and
> `change-log.enforcement: blocking` with a missing log. Both are documented in `review-task` Step 9
> as withholding promotion *"regardless of the review outcome, and including the pipeline
> auto-answer path"*. Under stock defaults (sign-off absent, change-log advisory) `/review-task`
> promotes and this row is never reached, which is why the halt had never been observed when it was
> reported — it was predicted from reading the table.
>
> The HALT is **kept** for the case it was written for: a review that produced nothing at all, on a
> card nothing had reviewed before. That is the genuine failure, and buying liveness by removing it
> would trade a needless halt for developing against an unreviewed card.
>
> Read the two `Planned` rows together with "If Running the Review Skill" above, which logs a missing
> report as a warning **without halting there**. That warning is not the decision; this table is. A
> review that produced no report but *did* promote the status lands on row 1 and proceeds; one that
> produced no report and did not promote lands on the HALT row. The status and the report are two
> independent signals, and it takes the absence of both to stop the pipeline.

---

## Handling Findings

#### develop-story

- **Draft → Ready for Development**: Log "Draft promoted to Ready for Development by review-story" in Decisions Log. Proceed autonomously.
- **Non-blocking suggestions**: Log as "Proceeding despite minor review suggestions: {list}" and continue.
- **Clean pass**: Log "Story review passed" and continue.
- **Blocking issues** (contradictory specs, missing ACs, status still `Draft`): Log each in Issues Log, invoke `/commit-changes` (message: `docs(story.{epic}.{story}): implementation report — review-story blocking halt`), then HALT: "review-story could not resolve blocking issues — human input required before development can proceed".

#### develop-task

- **Planned → Ready for Development**: Log "Planned promoted to Ready for Development by review-task" in Decisions Log. Proceed autonomously.
- **Non-blocking suggestions**: Log as "Proceeding despite minor review suggestions: {list}" and continue.
- **Clean pass**: Log "Task review passed" and continue.
- **Planned unchanged, but a CURRENT report exists**: Log in Issues Log — "review-task left the status at `Planned` but {wrote / found} a current report at `{path}` ({reportDate} ≥ updated {taskDate}); proceeding on the report. Two supported configs withhold promotion after a successful review — `sign-off.enforcement: blocking` and `change-log.enforcement: blocking` — so check those before treating this as a defect." Then **proceed**. This is not a blocking issue.

  **`current` is the load-bearing word.** Run the freshness engine; do not infer it from the report merely being present. A stale report reaching this bullet is the HALT row above, not this one.
- **Blocking issues** (missing success criteria, conflicting specs, or status still `Planned` after review with **no current report** — none written this run, and none already present that is current): Log each in Issues Log, invoke `/commit-changes` (message: `docs(task.{id}): implementation report — review-task blocking halt`), then HALT.

  **The HALT message must name which precondition failed, not just the symptom.** `describeVerdict()`
  from the freshness engine produces that sentence; do not compose one by hand. Emit:

  ```
  review-task could not resolve blocking issues — human input required before development can proceed.

    Task status:     Planned (unchanged by the review)
    Review report:   {describeVerdict(result, {reportPath}) — e.g. "no review report exists beside
                     this task, and the review produced none", or "task.97.review.1.x.md is dated
                     2026-05-11, older than the task's `updated: 2026-05-12` — it reviewed an earlier
                     version of this card"}
    Review outcome:  {READY TO IMPLEMENT / NEEDS REVISION / REQUIRES REWORK / not recorded}

  If the outcome was READY TO IMPLEMENT, the review passed and something withheld the promotion.
  Check `sign-off.enforcement` and `change-log.enforcement` in skills-config.yaml before re-running
  the review — if either is `blocking` and unsatisfied, a re-run will halt here again identically.
  ```

  > ⚠️ **Naming only the symptom is what made this misdiagnosable.** The message used to say
  > *"review-task left it Planned"* and nothing else — not whether a report existed, not its age, not
  > the review's own verdict. A consumer with every relevant file installed read that, inferred that
  > `/review-task` never promotes out of `planned`, and filed a report against the wrong cause. The
  > three lines above are the three facts that distinguish "the review failed" from "the review
  > passed and a gate withheld the promotion", which need opposite responses.

---

## Post Review Outcome to Tracker Issue

After detecting outcomes and handling findings (non-blocking — skip if `TRACKER_ISSUE` is empty):

#### develop-story

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
## 📋 Story Review Complete — Step 2/8

**Outcome**: {Ready for Development / Needs Revision}
**Review report**: {path, or 'not produced — see Issues Log'}
**Findings**: {brief summary of blocking/non-blocking issues, or 'No blocking issues found'}
EOF

node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage review --json
```

Read `reason` and act per the table in [`shared/resources/tracker-comment-contract.md`](tracker-comment-contract.md) — `posted`/`already`/`deferred` need nothing, `unverifiable` is logged and never posted over, and `no-credentials` is the one case that may fall back to MCP.

#### develop-task

```bash
mkdir -p .claude/state
cat > .claude/state/comment-body.md <<'EOF'
## 📋 Task Review Complete — Step 2/8

**Outcome**: {Ready for Development / Needs Revision}
**Review report**: {path, or 'not produced — see Issues Log'}
**Findings**: {brief summary of blocking/non-blocking issues, or 'No blocking issues found'}
EOF

node .agents/skills/{develop-story|develop-task|develop-bug}/references/tracker-comment.js \
  --issue {TRACKER_ISSUE} --body-file .claude/state/comment-body.md \
  --stage review --json
```

Read `reason` and act per the table in [`shared/resources/tracker-comment-contract.md`](tracker-comment-contract.md) — `posted`/`already`/`deferred` need nothing, `unverifiable` is logged and never posted over, and `no-credentials` is the one case that may fall back to MCP.

On failure: log warning in Issues Log and continue.

Do NOT post this comment when the path leads to a blocking HALT — commit + halt comes first and no comment is needed.

Log in Decisions Log: "Review outcome comment posted to {TRACKER} issue {TRACKER_ISSUE}."

---

## Update Pipeline Progress

#### develop-story
Update Pipeline Progress: ✅ review-story

#### develop-task
Update Pipeline Progress: ✅ review-task
