---
name: develop-pipeline-autonomous-defaults
description: Canonical autonomous decision defaults shared by develop-story and develop-task. Lists every decision taken without user prompting. Skill-specific rows (Register handling for story; Step 9 answer and completion status for task) live in each SKILL.md as a "Skill-specific defaults" addendum.
---

# Develop Pipeline — Autonomous Decision Defaults

## When This Table Applies

This table is consulted during any `develop-story` or `develop-task` pipeline run whenever the orchestrator must take an action without prompting the user. Load it at the start of Phase 0 setup and refer back to it at each decision point. Skill-specific rows that apply to only one orchestrator are in each SKILL.md's **Skill-specific defaults** section beneath the reference line — check both sources before deciding.

Every default applied must be recorded in the Decisions Log.

The rows below apply to both `develop-story` and `develop-task`. Where the two skills differ in terminology only (story ↔ task, `Draft` ↔ `Planned`, `review-story` ↔ `review-task`), both forms are shown. Skill-specific rows that apply to only one orchestrator are listed in each SKILL.md's own **Skill-specific defaults** section beneath the reference line.

| Situation | Default |
|-----------|---------|
| Feature branch base | User-selected in Upfront Setup (Q1) |
| PR target branch | User-selected in Upfront Setup (Q2) |
| High-risk gate (story / task) | User-selected in Upfront Setup (Q3) |
| Story status is `Draft` / Task status is `Planned` | Step 2 runs the review skill (`/review-story` or `/review-task`) to validate and promote autonomously. Do NOT ask the user. |
| Status `Ready for Development` or `In Progress` AND review report exists | Step 2 skips the review skill — document already reviewed |
| Status `Ready for Development` or `In Progress` AND no review report | Step 2 runs the review skill — status set without completing a review |
| Review skill output format | Always select "Comprehensive report" — pipeline requires a co-located review report file |
| Draft/Planned status gate (develop) | Proceed — review skill already validated the document in Step 2 |
| Alignment mismatch (develop) | Align code to document — document is source of truth |
| Commit style | Conventional Commits |
| Commit granularity | Multiple logical commits |
| Implementation report in create-pr commit | EXCLUDE — unstage before create-pr commits; Step 8 commits it |
| Pre-develop codebase mapping | Always run Explore subagent; pass summary to `/develop`, do not re-read files. Subagent unavailable / failed / slow → see **Subagents** below |
| qa-fix with no file changes | HALT — do not increment cycle; log as unfixable and surface to user |
| Step 5c `/review-pr` — post the summary PR comment? | Pass `--comment` explicitly. `/review-pr` otherwise asks before posting and the pipeline cannot prompt. Already-authorised ground: Steps 5–6 and 7 both comment on the PR. |
| Step 5c `/review-pr` verdict | `REQUEST CHANGES` → return to 5b. **The counter is incremented once, by 5b step 7, on exit — never at 5c.** Incrementing here as well burns two of the five cycles per review-driven fix and desynchronises resume, which reconstructs the count from `### QA Cycle` headings the extra increment never writes. `CONCERNS` → record findings, do not block, exit to Step 7. `APPROVE` → exit to Step 7. The full routing lives in the Steps 5–6 QA loop step file, §5c — not linked by path here, because this file is bundled into `develop-bug` too and a path reference would drag the story/task QA loop into a skill that runs its own verify loop. |
| Resume state validation | Per-step artifact verification AND branch + PR cross-check before skipping any ✅ step — full contract in `shared/resources/develop-pipeline-resume-contract.md` |
| Completion status (story or task) | `accepted` (lowercase, matches finalise canonical YAML schema). Note: document `Status:` fields use Title Case (`Draft`, `Planned`, `In Progress`, `Ready for Review`) — `accepted` is the YAML frontmatter value only. |
| Pipeline mode (lite vs standard) | See `shared/resources/develop-pipeline-lite-mode.md` for trigger conditions and behaviour. Default to `standard` if any condition fails. |
| qa-story / qa-task invocation in lite mode | Prepend the lite-mode directive (see lite-mode contract) to the invocation context |
| Final commit push (Step 8) | Always push after Step 8 commit so PR reflects completed report |
| Tracker mutation retry policy | 3× exponential backoff (1s, 2s, 4s). Shell calls (`gh`) wrap with `tracker_call_with_retry` from `shared/resources/resolve-platform.sh`. Atlassian MCP calls retry inline with the same schedule. All tracker mutations are non-blocking — final failure logs a warning in Issues Log and continues. |

## Subagents — unavailable, failed, slow

Every dispatch site in the pipeline — the pre-develop surface map (develop Step 3), `review-task` /
`review-story` Step 1 pre-pass, the QA diff reviewer (`qa-task` Step 3b / `qa-story` Phase 1.6) and the
`qa-fix` findings ingester (Step 1a) — points **here** for what to do when the subagent it asked for
does not come back the way it expected. Three states, and they are not the same state:

| Subagent state | What it means | Substitute | What the record must say |
|---|---|---|---|
| **Unavailable** — the `Agent` tool is absent, refused, or the session has no subagent dispatch at all | Nothing ran. There is no output to inspect and no failure to log; the step simply cannot be delegated in this session | Perform the pass **inline**, in the main context, following the same prompt file verbatim | `subagent: unavailable — pass performed inline; independence lost` — the inline substitute is the same context reviewing its own work, and that loss is the finding, not a footnote. **Never** report an inline pass as a dispatched one (obs #44) |
| **Failed** — the subagent ran and returned nothing usable: empty output, an error message, a block that lacks the contract's required keys | The instrument broke mid-run | Perform the pass inline **once**; do not re-dispatch the failed agent (a second identical dispatch learns nothing the first did not) | `subagent: failed — {what came back}; pass performed inline; independence lost`. QA additionally records a **Review Gaps** entry and cannot issue `PASS` on an axis whose agent failed |
| **Slow** — the subagent is still running past its **wall-clock budget** | Nothing is known yet. A running agent is not a failed one | Wait until the budget elapses, then stop it and perform the pass inline | `subagent: killed at N minutes (budget M) — pass performed inline; independence lost`. Write `killed at N minutes`, **never** `stalled` — "stalled" is a diagnosis nobody made |

**Wall-clock budget.** Ten minutes per dispatch by default (`subagents.wallClockMinutes` in
`skills-config.yaml` overrides it — read it once per run with
`source shared/resources/read-config.sh && read_nested_config_key subagents wallClockMinutes`, and
treat an empty result as `10`); the QA diff reviewer's Step 3b post-condition and the pre-develop
surface map both wait against this number. Start the clock at dispatch and record it in the
Decisions Log with the outcome: `dispatched HH:MM → returned HH:MM` or `→ killed at N minutes`.

**Output-file size is not a liveness signal.** A subagent's output file is a transcript that grows in
bursts; a small file is consistent with an agent that is reading, thinking, or blocked on a tool, and
a stale size reading is consistent with a working agent whose last write has not flushed. Deciding
that an agent has died because its file is 159 bytes killed a working reviewer on one run (obs #62).
The **only** liveness signals are the harness's own completion notification and the wall-clock
budget above. Do not poll the file, do not `tail` it, and do not infer state from its size.

If a situation arises that is not covered by this table or the skill-specific table, and the stakes are non-trivial, **HALT and ask the user**. Log the question and the user's answer in the Decisions Log.
