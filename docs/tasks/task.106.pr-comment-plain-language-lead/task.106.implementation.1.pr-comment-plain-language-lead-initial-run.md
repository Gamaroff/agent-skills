# Implementation Report: Pull-request summary comments open with a plain-language lead

**Task**: `task.106.pr-comment-plain-language-lead.md`
**Run Number**: 1
**Started**: 2026-09-10 14:55
**Status**: In Progress

---

## Summary

Give the eleven pull-request conversation templates a plain-language lead drawn from task.104's catalogue, so a reader following a linked PR gets the same two-to-four-sentence orientation that tracker-issue comments already carry.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | Todo → **In Progress** ✅ (`gh-stage.js work-started`, verified)            |
| Tracker Issue       | [#380](https://github.com/Gamaroff/agent-skills/issues/380) (GitHub)       |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.106.*` exists in git                              | `feature/task.106.pr-comment-plain-language-lead` created from `develop` at `606a0078`, pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.106.review.1.pr-comment-plain-language-lead.md` exists                | READY TO IMPLEMENT, 9/10. 0 Critical / 2 Important / 3 Optional — all applied. Status promoted `planned → ready-for-development` | PREPASS_B `aligned`; PREPASS_C `not-started` |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 5 phases; 3 test suites extended (52+53+10); 8 mutation proofs (4 re-run after a bad restore method); `npm run ci:fast` green, 0 failures | Pre-develop surface map (Explore) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #381](https://github.com/Gamaroff/agent-skills/pull/381) ← `develop`. Commit `44eacbe3`, 65 files, 65/65 in scope (no leak). Issue #380 commented (`in-review`, posted) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.106.qa.{N}.*.md`; `task.106.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | Cycle 1 CONCERNS 80/100 (2 findings) → qa-fix → cycle 2 PASS 95/100, 0 open. Both PR and issue commented; the cycle-1 PASS was corrected publicly. Step 5c in flight | Step 3b code review (Explore) |
| 7. finalise                | ⏳ Pending | `task.106.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-10

- **Invoked by `/develop-next`** (autonomous run). Item T106 selected by `select-next.mjs`; `item.source` = `task-registry` (no phase held an actionable row; 117 registry rows rejected on document status). Dependency `task.104` is `accepted`.
- Feature branch base: **develop** — auto-answered per the develop-next autonomous directive (auto-derived recommended option; current branch was `develop`).
- PR target branch: **develop** — auto-answered per the develop-next autonomous directive (auto-derived recommended option).
- qa-planning gate: skipped (auto — no prompt)
- Phase 0b: no prior run detected (no `feature/task.106.*` branch, no PR, no implementation report) — starting fresh.
- Phase 0a-parallel: **Agent 3 (lite-mode + always-load detector) dispatched and returned.** Agent 1 (resolver) not dispatched — path supplied directly by the orchestrator. Agent 2 (tracker poller) not dispatched — the task frontmatter carries no `github_issue:`/`jira_key:`, and `PR_NUMBER` is empty in Phase 0, so the poll had no input and would have returned null fields.
- `PIPELINE_MODE` = **standard**, computed from Agent 3's three booleans: `risk_ok = ("low" ∈ {low, absent}) = true`, `phase_count = 5` (**not** < 3), `single_module = false` (scope spans `shared/resources/` plus six skills and `evals/`). Two of three conditions fail, so lite mode does not apply.
- Always-load files resolved: 3 files — `docs/architecture/concepts/coding-standards.md`, `docs/architecture/concepts/tech-stack.md`, `docs/architecture/concepts/source-tree.md` (from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk).
- Step 1: implementation report stashed before `/create-branch`, restored after (`git stash pop`, clean).
- Step 1 “Signal Work Started”: **skipped** — `TRACKER_ISSUE` is empty (the task carries no `github_issue:` yet). The 0c-reg procedure is conditional on a linked issue; `/review-task` creates it in Step 2.
- **Step 2 — Phase 1.5 pre-pass**: 2 Explore agents dispatched in parallel. Agent B (architecture alignment) returned `aligned`; Agent C (codebase scan) returned `not-started`, and confirmed task.105's `$PR_COMMENT_BODY` precondition is satisfied at `skills/qa-fix/SKILL.md:772`.
- **Step 2 — output format**: auto-answered "Comprehensive report" (pipeline audit trail).
- **Step 2 — tracker sync**: auto-answered "Sync to GitHub" (recommended). Dedup search `gh issue list --search 'in:title "[Task 106]"' --state all` returned zero matches → created issue **#380**, added to the *Agent Skills* board, Priority P3, `github_issue: 380` written back with a body cross-reference link.
- **Step 2 — deferred work-started signal fired.** The Step 1 0c-reg signal had been skipped for want of an issue; now that #380 exists it was run once: pipeline-start comment `posted`, and `gh-stage.js --stage work-started --add-to-board` moved the card **Todo → In Progress** (`verified: true`).
- **Step 2 — review-task Step 8.5** auto-answered: "Yes, apply all critical + important fixes". 5 fixes applied, 0 skipped.
- **Step 2 — review-task Step 9** auto-answered: "Yes, fixes complete" — status promoted `planned → ready-for-development`.
- **Step 2 finding (mutation-verified)**: Phase 1 could not land as written — `stakeholder-summary.test.mjs` requires every `LEAD_TEMPLATES` key to be in `tracker-comment.js`'s `COMMENT_STAGES`. Proven by mutation: baseline 43/43 → adding `pr-summary` alone gives 42 pass / 1 fail. Mutation reverted, tree confirmed clean. Task gained §5.4 specifying a second PR-stage enumeration with a union assertion, and ruling out the wrong fix (widening `COMMENT_STAGES`, which would let a PR lead post to a tracker issue).
- Tracker: `TRACKER=github` (no `JIRA_URL`), `TRACKER_ISSUE` empty — the task has no linked issue yet. All tracker comments/transitions are skipped until Step 2 creates the issue.

---

## Issues Log

### Step 2 — GitHub Projects board has no `Estimate` field
`set-github-project-estimate.sh` reported `⚠️ Estimate skip on 'Agent Skills' — 'Estimate' number field not found`. Non-blocking per spec (priority and board membership both succeeded). No action taken.

---

## Step 3 — Development Record

### Decision: add `shared/resources/stakeholder-summary-cli.js`

The plan (§Phase 4) left this open: "Decide in Phase 1 whether to add it." Added. Eleven prose sites
need a lead above their arm split, and the alternative is eleven copies of the same `node -e`
expression — which is the drift this task exists to remove. The CLI renders and prints, nothing
else. It **exits 2 on an unknown stage** rather than printing an empty string: an empty `$LEAD`
would make each site's `printf '%s\n\n---\n\n%s'` post a comment opening with a bare horizontal
rule, which reads as a formatting slip rather than as a missing paragraph. Every call site guards
with `|| exit 1`.

Bundling: `bundle_skill.py`'s `JS_SIBLING_RE` follows `require("./stakeholder-summary.js")`
transitively, so `review-code` — which today carries neither engine in its `references/` — gets the
dependency pulled in without a separate reference.

### Phase 1 — Catalogue entries ✅

Three templates (`pr-summary`, `board-warning`, `dod-gaps`); `degraded` classified numeric and
`what` classified text. `PR_COMMENT_STAGES` declared in `stakeholder-summary.js` beside the
templates — **not** in either engine, because the audience of a lead is a property of the lead.

`stakeholder-summary.test.mjs` now iterates `ALL_STAGES` (the union) rather than `COMMENT_STAGES`.
That mattered more than it first appeared: the per-stage **rendering** and **jargon deny-list**
tests are generated by that loop, so leaving it iterating one namespace would have given the three
new leads no rendering test and no jargon check at all — coverage that reads as present and is not.
Four assertions hold the split honest: union membership, disjointness, no phantom names in
`PR_COMMENT_STAGES`, and one asserting `tracker-comment.js` still **refuses** a pull-request stage.
43 → 52 tests.

### Phase 2 — Engine ✅

`buildSummaryBody()` prepends `renderLead("pr-summary", {degraded})`. The `else if` is load-bearing:
`finishRun` posts the summary comment when **either** a caller summary or a degraded finding is
present, so "caller summary, no findings" is reachable and an unconditional prepend would explain
findings that do not exist. A caller-supplied `--summary-file` wins outright and is not double-led.

### Phase 3 — `finalise` ✅

Sites 1, 2, 6 lead below the marker; sites 3, 4, 5 rewritten consequence-first. Site 4 keeps its
deferral record id, and its `what` clause says *deliberately* recorded — of the three notices it is
the only one that is not a malfunction, and a lead reading as breakage would misreport the
operator's own declared policy as a fault.

### Phase 4 — three variables in the task's plan do not exist

Re-grepped every variable rather than trusting the plan, per the task's own Notes. Three of the
obvious names are not real:

| Plan/obvious name | Reality |
| :--- | :--- |
| `$QA_CYCLE` (qa-fix) | **qa-fix documents this by name as a variable that exists nowhere in the skill** (`SKILL.md` L849–856) — an earlier draft used it, it would have expanded to empty, and the lead would have degraded silently and correctly with nobody finding out. The real value is `FIX_CYCLE`, derived from the gate filename. |
| `$GATE_DECISION` (qa-story, qa-task) | The body heredoc is `<<'EOF'` — **quoted** — so `[GATE_DECISION]` is a textual placeholder the agent fills in, never a shell variable. The lead needs a real value, so the inserted block binds one explicitly. |
| `$SUMMARY_BODY` (review-code) | No body variable is named on the fallback path at all; `$SUMMARY_FILE` is the one that exists. |

Had the first been used as drafted, it would have reproduced exactly the defect the skill already
carries a paragraph warning about.

`FIX_CYCLE` is now derived **once**, where `$PR_COMMENT_BODY` is built, and reused by the tracker
comment below it — so the pull-request comment and the tracker comment cannot disagree about which
round they are reporting. Previously only the tracker comment knew the cycle at all.

### Phase 5 — Tests and bundle ✅

`comment-slot-coverage.test.mjs` scanned only `tracker-comment.js` invocations, so **all eleven new
call sites would have shipped unguarded** against the exact defect that file exists to catch — the
one task 105 hit three times, each with a slot name that is real on a different stage. Collector
widened to a second engine; Guard C added (slot names must be ones the stage reads; a pull-request
stage must never reach the tracker engine in shipped prose; non-vacuity floor).

`npm run bundle` carried the new CLI to all nine calling skills and pulled `stakeholder-summary.js`
into `review-code` **transitively** via `JS_SIBLING_RE`, confirming the reason a CLI was chosen over
eleven inline `node -e` expressions.

---

## Mutation Proofs

**The first run of these was invalid, and the correction is the most useful thing in this report.**

Proofs 1–4 were run by editing `shared/resources/pr-inline-comment.js`, testing, and reverting with
`git checkout -- <file>`. That restores from **HEAD**. The fix was uncommitted, so the first revert
deleted the mutant *and the fix together*, and every later proof measured a tree with no fix in it.
`git status --porcelain` read "clean" after each revert — which meant *the mutant is gone* and *the
fix is gone* in the same word. It surfaced only when the engine failed to appear in a list of changed
files. Logged as observation #55.

Re-run with a snapshot restore (`cp` the fix aside before the first mutation, `cp` it back after each,
re-establishing a green baseline between mutations):

| # | Mutation | First (invalid) run | Correct run | Verdict |
| :-- | :--- | :--- | :--- | :--- |
| 1 | remove the lead from `buildSummaryBody()` | 2 fail | **2 fail** | genuinely caught |
| 2 | double-lead (unconditional prepend, not `else if`) | 2 fail | **0 fail → survived** | test was vacuous |
| 3 | lead below `DEGRADED_HEADING` instead of above | 13 fail | **1 fail** | caught; 13 was the absent fix |
| 4 | lead on one inline finding body | 4 fail | **0 fail → survived** | floor too loose |

Two of four were false positives. Both survivors exposed real vacuity in tests written minutes
earlier:

- **#2** compared the body against `renderLead(stage, {})` — the **no-slot** rendering — while the
  code path renders **with** slots, folding "(2 of them)" into the middle of the sentence. Neither
  string contains the other, so `!body.includes(lead)` was trivially true and could never fail. Now
  matches on the leading phrase, after the caller summary.
- **#4** asserted `constructions.length >= 4` against **five** real inline-body sites, so one site
  acquiring a lead left four and passed. Now an exact equality between "bare marker+body
  constructions" and "all marker-prefixed constructions", with a separate non-vacuity floor.

After the repairs, all four go red and green on restore:

| # | Mutation | Result |
| :-- | :--- | :--- |
| 1 | remove the lead | 51 pass / **2 fail** |
| 2 | double-lead | 52 pass / **1 fail** |
| 3 | lead after the heading | 51 pass / **2 fail** |
| 4 | lead on one inline body | 52 pass / **1 fail** |
| — | restored | **53 pass / 0 fail** |

Guard C proofs (`comment-slot-coverage.test.mjs`, baseline 10/10): wrong slot name → 2 fail; a PR
site dropping a slot its stage reads → 1 fail; a PR stage passed to the tracker engine in prose →
1 fail; the walk regex matching nothing → 1 fail.

---

## Issues Log — Step 3

### The parity test knew two `--stage` engines; this task added a third
`transition-protocol-parity.test.mjs` attributes each `--stage` literal in shipped prose to the
nearest CLI named above it, then validates it against that CLI's namespace. With
`stakeholder-summary-cli.js` unknown to it, twenty literals were misattributed — `board-warning` read
as a **board** stage, `pr-summary` as a **comment** stage, and `qa-gate` (a genuinely correct comment
stage) as a board one. Fixed by teaching the attributor the third engine. The attributor is a third
enumeration of "which engines exist" and has to move with them.

### Two doc sentences tripped absolute guards, and both were reworded rather than exempted
1. `` `tracker-comment.js --stage pr-summary` exits 2, deliberately `` — written as a counter-example,
   indistinguishable to the scanner from a real call site. **Not** exempted: an exception carved for a
   documented counter-example is the shape that made an earlier guard in this repository vacuous. The
   prose now describes the refusal instead of spelling out the command.
2. The note explaining *that* incident named the prohibited MCP identifier, and the second guard
   caught it. Reworded to describe the incident without quoting the identifier.

An absolute rule stays enforceable only if the documentation of why it exists does not itself violate
it.

---

## QA Iteration History

### QA Cycle 1 — CONCERNS (80/100)

**Gate**: `task.106.gate.1.pr-comment-plain-language-lead.yml`

Two findings, both from the Step 3b adversarial code review, both confirmed independently before
being accepted:

| id | severity | file | finding |
| :-- | :--- | :--- | :--- |
| T106-001 | high | `skills/finalise/SKILL.md` | Site 6 interpolated `${GAP_COUNT}` and `$GAP_REPORT_BODY`, neither bound anywhere in the file. Both expand to empty, so the gaps comment posts as a heading, a lead and a bare horizontal rule — nothing errors, because the numeric slot is dropped silently by design. |
| T106-002 | medium | `shared/resources/tests/comment-slot-coverage.test.mjs` | The stage capture absorbed shell punctuation, so `$(node … --stage done)` captured `done)`. Not a catalogue key, so both Guard C content assertions skipped the site. 4 of 11 sites found but never checked, while the non-vacuity floor passed — it counts sites found. |

**PROCESS DEFECT, recorded because it caused both to nearly ship.** Gate 1 was written `PASS` (95)
and **published to PR #381 and issue #380** while the Step 3b review was still running. `qa-task`
Step 3b ends at *dispatch*; Step 10 has no precondition requiring the result. A late gate costs
minutes; an early one is broadcast and Steps 5c and 7 both key off it. Gate 1 was corrected in place
to CONCERNS rather than rewritten clean, and a correction comment was posted to both surfaces.
Logged as observation #56 against `qa-task` and `qa-story`.

### QA Cycle 2 — PASS (95/100)

**Gate**: `task.106.gate.2.pr-comment-plain-language-lead.yml`. Both findings fixed, 0 open.

Fixes mutation-proved with **snapshot restore**, never `git checkout --`:

| Mutation | Result |
| :--- | :--- |
| Revert the capture regex | 1 fail — the new resolvability assertion catches it |
| Plant a wrong slot name at a site the **old** regex used to skip | 1 fail |

The second is the decisive one: it proves the hole is closed rather than the symptom masked. Fixing
the regex alone would have left the guard skipping silently on the next punctuation shape nobody
anticipated, which is why the separate "every collected stage resolves to a real catalogue key"
assertion was added.

`npm run ci:fast` green, 0 failures. Committed as `284325a1`.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.106.pr-comment-plain-language-lead`
**PR**: [#381](https://github.com/Gamaroff/agent-skills/pull/381)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
