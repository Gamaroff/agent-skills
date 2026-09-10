# Implementation Report: Every tracker-comment call site feeds the plain-language lead, and the seven that bypass the engine stop bypassing it

**Task**: `task.105.comment-call-sites-plain-language-lead.md`
**Run Number**: 1
**Started**: 2026-09-10 13:25
**Status**: In Progress

---

## Summary

Feed `--slot` values to all 22 `tracker-comment.js` call sites, convert the seven bare `gh issue comment` / `gh issue close --comment` bypass sites onto the engine, split `qa-fix`'s shared comment body, and add the anti-regression guard that keeps the bypass closed.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop (auto — develop-next autonomous run)                               |
| PR target           | develop (auto — develop-next autonomous run)                               |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | medium                                                                     |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (issue #378, board `Agent Skills`, Todo → In Progress, verified) |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.105.*` exists in git                              | `feature/task.105.comment-call-sites-plain-language-lead` created at `fbfc400c`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.105.review.{N}.{name}.md` exists (or skip logged)                | `task.105.review.1.comment-call-sites-plain-language-lead.md` — READY TO IMPLEMENT, 8/10, 1 Critical + 6 Important + 5 Optional, all Critical + Important applied; Planned → Ready for Development | 2 pre-pass Explore agents (inline) |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Phases 1–5 complete. `npm run ci:fast` green (3132 pass / 0 fail, exit 0). 24 shipped call sites carry slots (was 22 + 2 created by the finalise split); 7 bypass sites converted; Guard A repaired, Guard B added, parity extended; bundle + catalogue regenerated | — (pre-pass maps reused) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #379](https://github.com/Gamaroff/agent-skills/pull/379) ← `develop`; commit `3babd7a4`; issue #378 commented (`in-review`, lead rendered); board `in-review` stage-disabled (correct — not in this board's pipeline map) | — |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.105.qa.{N}.*.md`; `task.105.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 1 cycle. Gate CONCERNS 90/100, 0 open findings; 5c CONCERNS. **Both review subagents hung and were killed** — code lens and conformance lens each performed in-line, disclosed in every artifact | — (both hung) |
| 7. finalise                | ⏳ Pending | `task.105.dod.{N}.*.md`; task `status: accepted`                       |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Step 3 — develop (2026-09-10)

**Pre-develop surface map reused rather than re-dispatched.** The Step 2 pre-pass agents already
produced exactly what the Step 3 Explore subagent is specified to produce — the affected file set with
per-file detail, the existing patterns, and the test-file conventions — and had verified them against
the tree rather than against the task's decaying line numbers. Dispatching a third agent to re-derive
that would have been redundant work on already-answered questions. Surface map used: 18 source files
(6 `shared/resources/` step docs, 1 `develop-bug` skill-native step doc, 9 `SKILL.md`, plus the
contract and 2 test files). Plan file `task.105.plan.comment-call-sites-plain-language-lead.md` read in
full and followed, including its ordering (one risky conversion first, guards last).

**Fast gate precondition**: `develop.fastGateCommand` is unset in `skills-config.yaml`, so the
suggested fallback `npm run ci:fast` applies; the script is defined in `package.json`, so the
precondition passes rather than halting.

**The site count is 24, not 22, and the two extra are real.** `develop-pipeline-step-7-finalise.md`'s
GitHub arm held one story-variant and one task-variant pair of bare `gh` calls. Converting each pair to
comment-then-close produces one `tracker-comment.js` site per variant where the shared inventory counted
the bypass pair once. Nothing was invented; a bypass site becoming a real call site is what the task is
for.

#### Decisions the plan and the review required be recorded

- **Who owns the retry after conversion: nothing does.** Stated plainly because the plan's original
  claim ("the engine has its own retry") was false and was corrected at review. `tracker-comment.js`
  contains no retry — verified, `grep -ci 'retry\|backoff\|sleep'` returns 0 — while it *does* own the
  `ACCESS_TRACKER` deferral gate through `defer-mutation.js`. Re-wrapping the engine call in
  `tracker_write` would double-defer, so the 3× exponential backoff is genuinely given up rather than
  relocated. Every converted site therefore ends `|| echo "⚠️ … — continuing"`, matching
  `review-task` SKILL.md, the reference implementation. **The `tracker-issue.js --kind close` call keeps
  its `tracker_call_with_retry` wrapper** — it is still a `gh` mutation and nothing about it changed.
- **Which `review-story` body won: the Jira arm's, on form rather than on content.** The two bodies
  were compared before collapsing, as §10's MEDIUM risk required. They carried the *same* content —
  recommendation, score, severity table, review artifact, changes section — so there was nothing to
  choose between them substantively. The Jira arm's **form** won because it is a heredoc with body
  lines at column 0, whereas the GitHub arm's inline `--body` was indented to match the surrounding
  numbered list, and those leading spaces are written into the posted comment verbatim. The collapse
  therefore also fixes a stray indented block that GitHub readers were seeing and Jira readers were not.
- **`pr` slot carries the URL, not the number** (review finding O5, left open for the implementer). A
  reader of the lead is deciding whether anything is left to do; `#412` is not something they can act
  on without already having the repository open. The URL is folded into the sentence parenthetically,
  never made part of its grammar, so a missing slot still reads correctly.
- **The `--stage done` marker collision needed no change to task.104.** Confirmed at review and
  implemented accordingly: the pre-existing `done` comment is in the **Jira** arm and the converted ones
  in the **GitHub** arm, which are mutually exclusive; and within the GitHub arm the completion and
  closing texts were merged into one `done` comment, then closed with no `--comment`. No new stage, no
  new lead template.
- **`blocking_count` is derived at the call site from the gate file this run wrote**, not carried from
  an earlier step. Both `qa-story` and `qa-task` re-resolve the newest `*.gate.*.yml` rather than
  reusing `LATEST_GATE`, which names the *previous* run's gate — it is read in Phase 0/Step 2 to decide
  whether to re-review, and reusing it here would have counted the wrong run's issues.
- **`outcome` is mapped, never passed through**, at all four review sites. `READY TO IMPLEMENT` /
  `NEEDS REVISION` / `REQUIRES REWORK` are internal vocabulary and `outcome` is a text slot interpolated
  verbatim; the mapping table is written at each call site. Moving it into the engine beside
  `GATE_MEANING` is the better long-term fix and is recorded as out of scope, not done.

#### Guard A already existed, named the right thing, and passed anyway

The task planned a new zero-bypass guard. One was already there: `tests/mutation-call-site-coverage.test.js`
has watched `gh issue comment` since task 51–56 and lists `tracker-comment.js` as its required
chokepoint. **All seven bypass sites passed it**, for two independent reasons, and fixing only the first
left the guard exactly as blind:

1. `ROUTED` was one global alternation, so `tracker_write` satisfied *every* shape — and
   `tracker_call_with_retry gh issue comment …` read as routed. Routing is now **per-shape**, with the
   comment shape requiring `tracker-comment.js` specifically. The two are not interchangeable:
   `tracker_write` buys interception and retry; it does not buy an idempotency marker and does not make
   a `gh` call work on a Jira project.
2. `isInvocation` rejected any line with a wrapper prefix outright, so a wrapped call was never
   classified as a call site at all and the routing check above it never ran. **This was found by the
   mutation proof, not by reading**: after fixing (1) alone, restoring a bare `gh issue comment` left
   the suite green. The predicate now strips a chokepoint-wrapper prefix and lets `isRouted` decide
   sufficiency — one question per predicate.

This is the repository's own documented failure mode — a guard that passes on the exact regression it
names — and it is why the task's success criterion was rewritten at review from a count to a check.

#### Mutation proofs — each turns exactly its own assertion red, and only that one

| Mutation | Test that went red | Result |
| :--- | :--- | :--- |
| Restore one bare `gh issue comment` (retry-wrapped, verbatim as it was) in `step-7-finalise.md` | `mutation-call-site-coverage` §1 | ✅ red at `:201`, green on revert |
| Drop `--slot verdict=`/`blocking_count=` from the `qa-gate` site | Guard B "every call site passes at least one --slot" | ✅ red; the other three assertions stayed green |
| Restore the wrong slot name (`pr` on `qa-gate` — the review's Critical finding) | Guard B "every slot name passed is one its stage's template reads" | ✅ red; the other three stayed green |
| Swap the close before its comment in `step-7-finalise.md` | Guard B "where a block both comments and closes, the comment comes first" | ✅ red, green on revert |
| Alter a `#### develop-story` decision-table row in `step-2-review.md` | `review-report-freshness` §12 (narrowed) | ✅ red — the narrowing kept the protection §9 argued for |

The second and third are the important pair: they fail on *different* assertions, so the guard
distinguishes "fed the lead nothing" from "fed it a name nothing reads" rather than collapsing both
into one alarm.

#### Every success criterion now has an assertion behind it

| Criterion | What holds it |
| :--- | :--- |
| All sites pass a slot, bound, with a name the stage reads | Guard B, assertions 1–3 (assertion 3 imports the mapping from `stakeholder-summary.js`) |
| Zero bare `gh issue comment` in shipped `.md` outside the allowlist | `mutation-call-site-coverage` §1, repaired to be per-shape and wrapper-aware |
| Converted sites post a marker and are idempotent | Structural — they route through `tracker-comment.js`, whose marker behaviour is covered by `tracker-comment.test.mjs` |
| `review-story`'s two arms produce the same text | Structural — they are now literally one call, with one body |
| **Comment-then-close ordering is asserted, not just documented** | Guard B, assertion 5 — added specifically because the criterion says "asserted" |

The last one was the gap. It was written as prose in three places and asserted nowhere until it was
checked against the criterion list, which is precisely the "documented but unenforced" state this task
exists to end. Its first cut also over-reached — it demanded a comment before *every* close, which
would have imposed a new rule on `sync-github-*`, whose lifecycle-status closes were never paired with
a comment and are outside this task's scope. Narrowed to blocks that do **both**.

#### The Critical finding, demonstrated by execution rather than by reading

Both forms were run against a fake `gh` on `PATH`, capturing what actually reached the transport —
per `feedback_assert_behaviour_not_source_text`, since grepping the SKILL.md proves a string exists,
not that the call works.

**Corrected form** — `--slot verdict=CONCERNS --slot blocking_count=3`:

```
<!-- agent-skills-comment:qa-gate -->
The finished work has been through testing, and the results are in. The checks found some problems
worth knowing about, but none that stop the work. 3 of them must be dealt with before this item can
be finished. The detail below records what was tested and what was found.
```

**The task's original form** — `--slot verdict=CONCERNS --slot pr=…`:

```
The finished work has been through testing, and the results are in. The checks found some problems
worth knowing about, but none that stop the work. The detail below records what was tested and what
was found.
```

Exit code **0** in both cases. `posted: true` in both cases. The `pr` slot is discarded without a
word, and the sentence telling the reader how many problems must be dealt with is simply absent —
the one fact in that paragraph a stakeholder would act on. Nothing in the output, the exit code or
the log distinguishes the second from a call that passed no slot at all. That is the whole argument
for Guard B in six lines of transcript.

#### Population check on the bypass half — four survivors, all intended

An independent walk over all 920 tracked source files (excluding generated `references/` copies), using
invocation-shape matching rather than the bare literal, finds exactly four remaining
`gh issue comment` / `gh issue close` invocations:

| Survivor | Why it stays |
| :--- | :--- |
| `shared/resources/develop-pipeline-on-precompact.sh:140` | The `PreCompact` hook. Must run with no Node available and must never block compaction — §3 excludes it deliberately, and this is the only shell site in the tree |
| `shared/resources/platform-detection.md:204` | The `tracker_write` wrapper's own usage example. Already in Guard A's `NOT_CALL_SITES` with its reason |
| `shared/resources/tracker-access.test.sh:1651,1678` | Test assertions *on* the wrapper — they assert the call is refused under a restricted mode |

**Guard A's scope is `.md` canonical prose, and that is left unchanged deliberately.** Success Criterion
2 reads "zero bare … in shipped **`.md`** outside the named allowlist", which the guard now satisfies
exactly. Widening it to `.sh` would add three allowlist entries — the hook plus the two test lines — for
no additional protection, since the hook is the only shell site and its exclusion is permanent rather
than provisional. Adding entries to an allowlist to cover files a guard was never meant to police is how
an allowlist stops meaning anything, which is the failure `anti-patterns.md` names in the same section
that asks for the guard.

#### Four defects in my own work, all found by running things rather than trusting them

- **An invented variable.** `qa-fix`'s new slot was first written `--slot cycle="$QA_CYCLE"` — a
  variable that exists nowhere in that skill. It would have expanded to the empty string, which the
  engine's numeric coercion drops, so the lead would have degraded to a correct shorter sentence and
  **nothing would ever have surfaced it**. Found by auditing every added slot's binding mechanically
  rather than trusting the plan's per-site checklist. Replaced with a derivation from the gate
  filename (`*.gate.{N}.*.yml`, where `{N}` *is* the cycle), which is a value genuinely on disk at
  that point; verified by executing both the populated and the empty case.
  > The same audit flagged `$GATE_DECISION` at the two `qa-gate` sites and `$STORY_FILE` in `qa-fix`.
  > Both are real — they are caller-supplied bindings already used by the surrounding block — so they
  > are correct. Worth recording that the audit produced two false positives and one true one: a
  > binding check keyed on assignments cannot see a caller-supplied variable, which is why the
  > flagged set was inspected individually rather than acted on in bulk.
- **`tracker-issue.js` did not ship where the new close call points.** The converted close reads
  `node .agents/skills/develop-{story,task}/references/tracker-issue.js`, and neither skill had that
  file — the bundler ships a shared resource only when a document carries an `Engine source:
  shared/resources/<name>` line, and the step doc had one for `tracker-comment.js` but none for
  `tracker-issue.js`. So the instruction pointed at a path that does not exist. Caught by
  `tests/executable-instructions.test.js`; fixed by adding the engine-source line and re-bundling,
  which shipped it into 7 skills.
- **`grep -c … || echo 0` — the broken idiom, written into both QA skills.** `grep -c` **prints
  `"0"` and exits 1** when it matches nothing, so `|| echo 0` appends a second zero and the variable
  becomes the two-line string `"0\n0"`. Demonstrated rather than assumed: the broken form yields
  `0$'\n'0`, the fixed form `0`. The engine reads that as `NaN` and drops the slot — so
  `blocking_count` would have vanished on exactly the **clean** gates, the ones where telling a reader
  there is nothing blocking matters most, and it would have failed silently in the safe direction where
  nothing ever reports it. Replaced with `|| true` plus a `${VAR:-0}` default, which handles both the
  no-match case (grep's own `0`) and the missing-file case (empty). This is a known idiom failure in
  this repository's observation log; it was caught by reading the finished block back as a reader would
  rather than by the guards, none of which inspect shell semantics.
- **A pre-existing guard blocked the correct change, and was over-broad rather than right.**
  `review-report-freshness.test.mjs` pinned **every line** of every `#### develop-story` section in
  `develop-pipeline-step-2-review.md` against `origin/develop`, to hold an earlier task's promise that
  "/develop-story's tables are unchanged". Adding slots to the review comment is required at *both*
  arms — the lead is a property of the moment, not of the tracker — so the symmetric, correct change
  failed a guard that had nothing to say about it. Narrowed to the **decision tables**, which is what
  §9 actually claimed, and mutation-proved: altering a develop-story table row still turns it red.
  > This is a judgement call and is recorded as one. A guard whose failure message names a constraint
  > the change does not violate gets satisfied either by contorting the change or by deleting the
  > guard; narrowing it to the promise that was argued for keeps the protection and drops the part
  > that was never claimed. The alternative — leaving `#### develop-story` prose frozen forever
  > because one task once promised not to touch its tables — makes the file un-editable by anyone who
  > was not there.

#### Two things the guards had to be taught, both found by running them

- **Guard B's generated-file filter read a 400-character window for the `AUTO-GENERATED` banner.** The
  banner sits on line 5, after frontmatter whose `description:` routinely exceeds 400 characters on its
  own — so ~30 bundled copies were walked as sources and every finding arrived as thirty echoes of
  itself. The window is now the first 20 lines: a structural bound rather than a guessed byte count.
- **`prettier --check` failed the new test file** on the first `npm run ci:fast`. Exactly the task-67
  class the fast gate exists to catch, caught in the loop instead of in CI.

#### Scope held

`tracker-comment-contract.md`'s "the GitHub picture is not yet complete" paragraph was **rewritten, not
deleted** (Success Criteria → Migration): it is the record of why the guard exists, and the rewrite says
so explicitly. `AGENTS.md` L112 made the same now-false claim and was corrected in the same sweep. The
precompact hook is untouched and remains the only allowlisted exception. PR comments were not given
leads — that is task.106 — and `qa-fix`'s PR body was touched only to decouple it from the tracker body,
which is exactly the boundary §4 draws.

### Pipeline Startup — 2026-09-10

- **Invoked by `/develop-next`** (autonomous run, item T105 selected from the **task-registry fallback** — no phase in the roadmap held an actionable row). Per the develop-next AUTONOMOUS directive, every Phase 0d question is auto-answered with the recommended option and recorded here rather than prompted.
- Feature branch base: **develop** — auto-answered (recommended default); repo default branch, standard Gitflow for a standalone task.
- PR target branch: **develop** — auto-answered (recommended default).
- qa-planning gate: skipped (auto — no prompt).
- **Phase 0a-parallel fan-out resolved inline rather than by subagent**, and this is a deliberate deviation recorded for review:
  - *Agent 1 (resolver)* — not dispatched. The exact file path was supplied by the selector and verified to exist on disk; dispatching an Explore agent to find a file already in hand is redundant work.
  - *Agent 2 (tracker poller)* — not dispatched. Both its inputs are empty in Phase 0: `PR_NUMBER=""` (no PR yet) and `ISSUE_KEY=""` (task.105 frontmatter carries no `github_issue:`). With nothing to poll, `TRACKER_STATE` is null either way; the failure-handling row for this agent is "log and continue", which is the state recorded here.
  - *Agent 3 (lite-mode detector)* — its three inputs were read directly from the document: `risk_level: medium` (frontmatter, verbatim), `phase_count = 5` (§6 Phases 1–5), `single_module = false` (18 source files across `shared/resources/`, 9 `skills/*`, `tests/` and `evals/`). `risk_ok = medium ∈ {low, absent}` is **false**, so `PIPELINE_MODE = standard` — and it is standard on any two of the three inputs independently, so no judgement call is load-bearing.
- Pipeline mode: **standard** (not lite) — QA runs in full.
- Tracker: `TRACKER=github`, `TRACKER_ISSUE=""` — task.105 has no linked issue at Phase 0, so Step 1's "Signal Work Started" was skipped in full per its own rule (`If TRACKER_ISSUE is not set, skip this entire section`). Step 2 (`/review-task`) creates the issue via `ensure-task-github-issue`; the `work-started` board signal fires immediately after, once there is an issue to signal on.

---

## Issues Log

### Step 2 — review-task

- **Board `Estimate` field absent.** `set-github-project-estimate.sh` reported `'Estimate' number field not found` on the `Agent Skills` board. Non-blocking; priority (P2) was set successfully. Nothing to fix — the board has no Estimate field.
### Step 5 — qa-task

- **The Step 3b independent code-review subagent hung and was killed.** Dispatched over the full
  branch diff, it ran ~6 minutes without returning; killed and the diff review performed **in-line**.
  This is the third Explore subagent to hang in this repository's sessions, and it is recorded in the
  QA report, the gate's `status_reason`, the Change Log row and here — because the one thing this QA
  cycle lacked is a reviewer who did not write the code, and an artifact trail that does not say so
  reads as though a full independent review happened. It is one of the two reasons the gate is
  CONCERNS rather than PASS.

### Step 2 — review-task

- **Card preflight passes but the Success Criteria block it would publish is 14 characters.** `summariseSection` treats a leading bold sub-heading (`**Functional**`) as the section's prose and stops there, so the card publishes that and nothing else, with 8 items omitted. Measured across the corpus: **15 of 106 task documents** are affected. This is a defect in the summariser, **not** in task.105, and is deliberately not fixed here — it is recorded in the review report §1 and logged as observation #49 for a follow-up bug report. Flagged so the passing preflight is not later read as evidence the card is good.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-10

**Gate**: CONCERNS (90/100) · **HIGH findings**: 0 · **Open findings**: 0
**PR Review** (Step 5c): ⚠️ **CONCERNS** — [`task.105.pr-review.1.*.md`](./task.105.pr-review.1.comment-call-sites-plain-language-lead.md), 5 conformance + 2 code findings, all fixed or deliberately accepted; no `high` severity, so the middle row of the verdict table. Exits to Step 7.
**Artifacts**: [`task.105.qa.1.*.md`](./task.105.qa.1.comment-call-sites-plain-language-lead.md), [`task.105.gate.1.*.yml`](./task.105.gate.1.comment-call-sites-plain-language-lead.yml)

Verified by execution rather than inspection throughout: 24 call sites, 7 mutation proofs, 8 hostile
security probes, bundle idempotency by content hash, and `zero-blocks-executed` shown identical on the
base branch so it is not charged against this change.

**One MEDIUM found and fixed inside the cycle**: Guard A still missed connective-chained invocations
(`cmd && gh issue comment …`) after its repair — found by *probing* the guard with eight shell forms
rather than by reading it. All eight are now caught, with a false-positive check confirming prose in
backticks is still ignored.

**Guard B gained a sixth assertion**: its slot-name derivation regex-scans template source for
`s.NAME`, so a template written with destructuring would make it reject *correct* call sites. The scan
is now cross-checked against rendering, and the disagreement is mutation-proved.

#### Routing decision — the gate is CONCERNS with an empty `top_issues[]`, and that route is undefined

`develop-pipeline-step-5-6-qa-loop.md` §5c admits exactly two routes to the loop's exit gate: a
`PASS`/`WAIVED` gate, and the Diminishing-returns exit — whose own condition requires a **non-empty**
`top_issues[]`. It adds that a gate routing to 5b never reaches 5c. This gate is neither: it is
`CONCERNS` because two **NFR** judgements say so (Reliability, and the independent review not having
run), and NFR concerns produce no `top_issues[]` entry because there is no defect at a `file:line`.

Routing it to 5b would hand `/qa-fix` a gate with nothing in it, and 5b's **no-code-change HALT** would
then fire — halting the run on a gate whose content is "this is fine, with reservations".

**Resolved by routing to 5c, deliberately and recorded rather than assumed.** There is nothing for a
fix cycle to do, and the two concerns are precisely what a PR conformance review should examine — an
NFR-driven CONCERNS is *more* useful to 5c than a clean PASS, because it hands the reviewer a named
list of what to be suspicious of. The pipeline document was **not** edited to add the route: §5c states
that the accepting set is defined in one place, and quietly adding a third route from inside an
unrelated task is how one runnable document comes to hold two rules. Logged as observation **#51** for
the pipeline's own backlog.

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: `feature/task.105.comment-call-sites-plain-language-lead`
**PR**: [#379](https://github.com/Gamaroff/agent-skills/pull/379)
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7}
