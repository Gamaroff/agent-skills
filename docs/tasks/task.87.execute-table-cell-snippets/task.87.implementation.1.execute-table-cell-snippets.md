# Implementation Report: Shell commands in table cells escape the snippet-execution gate

**Task**: `task.87.execute-table-cell-snippets.md`
**Run Number**: 1
**Started**: 2026-09-09 17:35
**Status**: In Progress

---

## Summary

Extend `shared/resources/qa-execute-snippets.mjs` so commands written inside markdown table cells are
extracted, classified and executed under both bash and zsh — closing the false-pass hole that shipped
a zsh-broken verification predicate through three QA cycles.

---

## Pipeline Configuration

| Setting             | Value                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------- |
| Feature branch base | `develop` (auto — develop-next autonomous directive)                                     |
| PR target           | `develop` (auto — develop-next autonomous directive)                                     |
| qa-planning gate    | skipped (auto)                                                                           |
| Task risk level     | low                                                                                      |
| Pipeline mode       | standard                                                                                 |
| Always-load files   | 3 files — docs/architecture/concepts/{coding-standards,tech-stack,source-tree}.md         |
| Tracker issue       | [#364](https://github.com/Gamaroff/agent-skills/issues/364) (GitHub)                     |
| Board status        | In Progress ✅ (Todo → In Progress, verified)                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.87.*` exists in git                               | `feature/task.87.execute-table-cell-snippets` cut from `develop` at `a3d8273b`; pushed with tracking | —                    |
| 2. review-task             | ✅ Done    | `task.87.review.{N}.{name}.md` exists (or skip logged)                 | `task.87.review.1.execute-table-cell-snippets.md` — READY TO IMPLEMENT, 8/10; 2 Critical + 5 Important + 2 Optional all fixed; `draft` → `ready-for-development` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | 4 phases; 115/115 tests green; mutation proof 3× red then green; bundle propagated to 6 skills | inline (no subagents) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [PR #365](https://github.com/Gamaroff/agent-skills/pull/365); 2 commits (`48f987ee` feat, `e7931bf4` docs); issue comment `posted` | —                    |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.87.qa.{N}.*.md`; `task.87.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted |       | —                    |
| 7. finalise                | ⏳ Pending | `task.87.dod.{N}.*.md`; task `status: accepted`                        |       | —                    |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |

---

## Decisions Log

### Pipeline Startup — 2026-09-09

- Dispatched by `/develop-next` (item T87, source **task-registry** — no roadmap phase held an
  actionable row). Run state at `.claude/state/develop-next.state.json`.
- Feature branch base: `develop` — auto-answered per the develop-next AUTONOMOUS RUN directive
  (Phase 0d Q1 recommended option); no prompt issued.
- PR target branch: `develop` — auto-answered per the same directive (Phase 0d Q2 recommended option).
- qa-planning gate: skipped (auto — no prompt).
- Task status on entry: `draft`. Phase 0c table for develop-task says proceed and let Step 2
  `/review-task` promote it. No halt.
- **Phase 0a-parallel run inline rather than via Explore subagents.** This session's operating
  instructions prohibit calling the Agent tool unless the user requests it, so the resolver
  (unnecessary — an exact file path was supplied), the tracker poller (no `github_issue`/`jira_key`
  in frontmatter, so there is no card to poll) and the lite-mode detector were all executed directly.
  The lite-mode inputs were read from the document rather than judged by impression, as the contract
  requires.
- Tracker signal (0c-reg) **skipped**: no `github_issue` in the task frontmatter, so there is no card
  to comment on or move. Step 2 `/review-task` runs `ensure-task-github-issue`, which creates it.
- **Step 2 `/review-task` findings and decisions.** Output format auto-answered "Comprehensive report";
  Step 8.5 auto-answered "Yes, apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes
  complete" → `draft` → `ready-for-development`. Report:
  `task.87.review.1.execute-table-cell-snippets.md` (READY TO IMPLEMENT, 8/10, was 4/10).
  Freshness engine confirms the report is `fresh` (`current`, 2026-09-09 ≥ updated 2026-09-09).
- **Step 2 tracker sync auto-answered "Sync to GitHub"** — dedup search for `in:title "[Task 87]"`
  returned zero matches, so issue **#364** was created (milestone `Technical Tasks (standalone)`,
  labels `task` + `priority:medium`, board Priority P2).
- **Step 2 pre-pass (Phase 1.5) run inline, not via two Explore subagents** — same prohibition as
  Phase 0a-parallel. Architecture alignment: no drift. Already-implemented scan: `not-implemented`,
  confirmed by grepping the engine, its tests and the rule doc for any table/cell handling.
- **The task-77 false-pass predicate was reproduced by execution** rather than taken on trust: in an
  empty directory `bash` exits 2 (`[: : integer expected`) and `zsh` exits 0 (both globs abort the
  command substitution silently). The mutation-proof fixture named in success criterion 2 is therefore
  known to work before Phase 3 is written.
- Pipeline mode: **standard**. Inputs: `risk_level: low` → `risk_ok = true`; `phase_count = 0`
  (the task document defines no implementation-phase section) → `< 3` true; `single_module = false`.
  The module boundary is genuinely arguable — the edit itself lands in `shared/resources`, but the
  extractor's blast radius is every skill document the gate scans, and a newly-visible table-cell
  command anywhere in the corpus becomes a finding. The contract's tie-break ("when the module
  boundary is genuinely arguable, answer false — `standard` is the safe default") therefore applies,
  and standard is additionally the right call for a task whose whole subject is a false-pass defect
  class.

---

## Step 3 — Development Record

### Pre-develop surface map

Established **inline** (no Explore subagent — same prohibition as Phase 0a). The review had already
read the engine, so no fresh discovery was needed:

| File | Role |
| ---- | ---- |
| `shared/resources/qa-execute-snippets.mjs` | the engine — `extractBlocks()` L51, `classifyBlock()` L982, `runBlock()` L1151, `executeFile()` L1262, `render()` L1474 |
| `shared/resources/tests/qa-execute-snippets.test.mjs` | 98 tests, `node:test`, imports the module surface by destructuring |
| `shared/resources/qa-runnable-prose-detection.md` | the rule the engine implements — §1 scope, §3 dual-shell |
| `shared/resources/develop-pipeline-resume-contract.md` | the real target: two command-column tables |
| `skills/*/references/qa-execute-snippets.mjs` | 6 generated copies, via `npm run bundle` |

No plan file exists (`task.87.plan.*.md` absent) — proceeded without one, as the contract allows.

### What was implemented

| Phase | Outcome |
| ----- | ------- |
| 1 | `extractTableCellCommands()`, `splitTableRow()`, `unescapeCell()` exported; plus internal `isTableRow`, `isDelimiterRow`, `looksLikeCommand`, `fenceMask` |
| 2 | `origin: "fence"` on fenced blocks; both extractor streams merged and line-sorted in `executeFile()`; `origin` carried onto every `results[]` entry **and** onto every finding; `render()` annotates `line N (table cell)` and reports the table-cell count |
| 3 | 17 new tests (115 total, all green), including the mutation proof |
| 4 | rule doc §1a + §3 rewritten; `npm run bundle` propagated to 6 skills; corpus measured |

### One finding the task did not know about, and the scope decision it forced

**`shell-disagreement` compares stdout only — so success criterion 2 was not literally satisfiable.**
The task-77 predicate prints nothing under either shell; its entire defect is in the **exit status**
(`bash` 2, `zsh` 0). Extracting it from a table cell therefore produced a bare `execution-failure`
and never named the portability defect.

A `channel` was added to `shell-disagreement` — `stdout` (existing) and `status` (new) — rather than
loosening the criterion. Three properties made this the right call rather than scope creep:

1. It makes criterion 2 true as written instead of rewriting the criterion to match the code.
2. It **cannot turn a previously clean file red.** A status disagreement implies at least one non-zero
   status, which has already raised `execution-failure`, so the file was never clean. It is a label on
   a failure the gate already caught.
3. `kind` is unchanged, so every existing consumer keying on `kind === "shell-disagreement"` keeps
   working; the two existing tests that do exactly that still pass untouched.

The two channels are each other's blind spot, and this repository has now shipped one of each — task 66
disagreed on stdout with matching exit statuses, task 77 the exact mirror. Both are documented in §3.

### Mutation proof — three reverts, each red

Required by criterion 2 and by the repo's own rule that a fix is unheld until the behaviour is reverted
and a test goes red. Baseline: **115 pass / 0 fail**.

| Mutation | Reverted behaviour | Result |
| -------- | ------------------ | ------ |
| A | `executeFile` back to `extractBlocks(markdown)` alone — table cells invisible again | **2 fail** (`MUTATION PROOF…`, `origin is carried onto every result…`) |
| B | `unescapeCell` returns its input — the predicate is extracted but `\|` never becomes a pipe | **3 fail** (mutation proof + the two escape tests) |
| C | the `status` channel disabled — the disagreement is unlabelled again | **2 fail** (mutation proof + the status-channel test) |
| — | restored | **115 pass / 0 fail** |

The independent premise was also verified without the engine at all: in an empty directory
`bash -c '<predicate>'` exits **2** (`[: : integer expected`) and `zsh -c '<predicate>'` exits **0**.

### Phase 4 corpus measurement — the High-likelihood risk did not materialise

Scanned every `shared/resources/*.md` and `skills/*/SKILL.md` in the tracked tree (182 files, bundled
`references/` copies excluded), then executed the ones with table-cell commands and compared against a
pre-change copy of the engine.

**4 files contain table-cell commands. 42 new blocks. Zero new findings.**

| File | blocks before → after | findings before → after | exit before → after |
| ---- | --------------------- | ----------------------- | ------------------- |
| `shared/resources/develop-pipeline-resume-contract.md` | 4 → 26 | 1 → **0** | 1 → **0** |
| `skills/observe-work/SKILL.md` | 5 → 15 | 0 → 0 | 0 → 0 |
| `skills/use-railway/SKILL.md` | 5 → 11 | 0 → 0 | 0 → 0 |
| `shared/resources/observation-log-contract.md` | 1 → 5 | 0 → 0 | 0 → 0 |

The risk rated **High likelihood** in §10 of the task — "a QA gate that previously passed now fails on
unrelated documents" — did not occur on any file. The column restriction is what bounded it: only 4 of
182 files write commands in a column whose header names one.

**One file got *cleaner*, and that needs saying rather than quietly banking.** The resume contract went
from one finding and exit 1 to zero and exit 0. Its four fenced blocks are all placeholders, so
`counts.runnable === 0` held before and the gate reported `zero-blocks-executed` — *"the gate did
nothing here"*. Two of its table cells are runnable, so that premise is now false. `zero-blocks-executed`
is a statement about **coverage**, not a defect (the code comment is explicit that it is `medium` and
deliberately not gate-blocking), so it must stop firing rather than be kept alive on a run that did
execute something.

That interaction is now pinned by two tests rather than left incidental — one asserting the guard
falls silent once a cell runs, one asserting it still fires when fenced *and* cell commands are all
placeholders (success criterion 4). It is the single corpus-visible behaviour change, and it is easy to
mistake for a regression, which is exactly why it is recorded here with the before/after numbers.

Triage of these 42 blocks is **out of scope** per §4 of the task. Nothing needs triaging: none of them
produced a finding.

### Full `npm run ci` — green, and run here rather than deferred to the merge gate

`CI_EXIT=0`. **2983 pass, 0 fail**, and the log confirms all four stages ran: `format:check`, `test`,
`eval:all` and the composite. Run against the exact tree that was committed — the working tree was clean
between the run finishing and the push.

Run at Step 3/4 rather than left to `develop-next`'s merge gate on purpose: `eval:all` and
`prettier --check` are the two things the fast tier does not cover, and task.67 shipped a red build
because `/finalise` accepted a task whose only local evidence was `npm test`.

### Design decisions worth recording

- **Command-column restriction, not an explicit marker.** The task's scope offered either; the column
  header is what the real corpus supports, and it needs no document edits to take effect.
- **The whitespace rule is a noise bound, not a safety boundary.** A span with no whitespace is a glob,
  a status or a field name. It fails toward running *less*, and no unspaced word can carry a shell
  disagreement — that needs a substitution, a `[` test or a pipeline.
- **Only `\|` is unescaped.** GFM applies that escape inside code spans; nothing else does. Unescaping
  `\` too would corrupt `printf 'a\nb'` in the name of reading it. There is a test for exactly that.
- **`fenceMask` mirrors `extractBlocks`' state machine**, including treating an unterminated fence as
  open to end-of-file. Two extractors reading one file must agree about where the fences are; a
  malformed document is better read conservatively by both than differently by each.
- **Residual noise is accepted and recorded, not filtered further.** On the real target file, cells
    holding prose with backticked field values — a cell reading "Story file `Status:` field reads
  `Ready for Review`" — classify as `mutating — unrecognised-command: Ready (fail-closed)`. That is a `SKIP` line, not a
  finding: it does not gate. Adding a second heuristic to suppress it would be a weaker boundary beside
  a fail-closed one.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 2 — task document was missing 6 of 11 mandatory sections**, including Implementation Plan and
  Testing Strategy (both Critical). Resolved: `/review-task` Step 8.5 applied all critical + important
  fixes. Not escalated — the pipeline's auto-answer is designed for exactly this.
- **Step 3 — the fast gate caught a defect in my own new test.** `tests/test-harness-concurrency.test.js`
  failed on `timeout: 5000` hardcoded in the new status-channel test: the repo forbids a spawn-timeout
  literal in a test file, because a number chosen against an idle machine sits ~1.2x above the loaded
  worst case (bug.2, and two merges already went through over a red local suite because of it).
  Replaced with `CLI_BUDGET.timeoutMs` from the shared `spawn-budget.mjs`. Worth recording as a hit for
  the guard rather than as noise — it is exactly the class of thing it was built to stop, and the
  correct fix was already sitting imported at the top of the file.
- **Step 3 — `prettier --check` flagged the two edited source files** on the first fast-gate run.
  Formatted and re-bundled. This is the failure mode that motivated moving formatting into the fast
  tier (task.67 shipped a red build on exactly this).
- **Step 2 — GitHub board has no `Estimate` number field**, so the effort mirror was skipped
  (`⚠️ Estimate skip on 'Agent Skills'`). Non-blocking, priority mirror succeeded (P2).
- **Step 1 — `work-started` tracker signal could not fire in Step 1** because the task had no linked
  issue at that point. Fired retroactively in Step 2 immediately after `ensure-task-github-issue`
  created #364: pipeline-start comment `posted`, board `Todo → In Progress` (`verified: true`). Run
  exactly once, as the contract requires.

---

## QA Iteration History

### QA Cycle 1 — 2026-09-09

**Gate**: CONCERNS (90/100) — `task.87.gate.1.execute-table-cell-snippets.yml`
**QA report**: `task.87.qa.1.execute-table-cell-snippets.md`
**PR Review**: pending — 5c not yet run

**Findings**: 0 HIGH, 1 MEDIUM, 2 LOW, 2 cleanups. 8/8 success criteria met — the defect sits in a
path no criterion names, and was found because the probes went past the criteria.

**How it was found matters.** Step 3b's Explore subagent is prohibited in this session, so the pass
was conducted by **executing seven probes** against the module rather than reading the diff. Six found
nothing (and are listed in the QA report so the silence is auditable); one found TASK87-001. Reading
the diff would not have found it — the defect is in the interaction between two cells of the same row.

**TASK87-001 (MEDIUM, confidence high) — fixed this cycle.** A runnable command in a well-formed
command-column cell was silently dropped when *another* cell in the same row carried an unescaped pipe
inside a code span: `| \`a|b\` | \`echo shifted\` |` split into three cells, the command column index
read the wrong one, and the file reported zero blocks, zero findings and no note — byte-identical to a
document with no commands in it. **That is the silent skip this engine exists to eliminate, reached
through a different door**, which is why a MEDIUM was worth a fix cycle rather than a waiver.

Fix: `splitOnDelimiters(line, codeSpanAware)` — a pipe inside an open backtick span is content. A span
closes only on a run of its own length, so `\`a\`` inside a two-backtick span stays content. This
**deliberately diverges from GFM**, which splits an unescaped pipe even inside a code span; rendering
cares where the boundaries are, this engine cares whether a command was seen. A span left open at end
of line falls back to the naive split — trusting the code-span reading there would collapse the row
into one cell and make the command column disappear, worse than the bug being fixed.

**Both cleanups the gate named were also done**, since each was a few lines:

- `column` now earns its place — carried into `results[]` and printed as `line 79 (table cell:
  Verification command)`. It was previously set on every block and never read.
- A block diverging on stdout **and** exit status now says so: the stdout finding appends
  `; exit status also differs (bash 2, zsh 0)`. One finding still fires per block — stdout is the more
  specific statement — but silence about a second divergence understates the defect.

**The two LOW findings were documented rather than fixed** (§1a of the rule doc): blockquoted tables
are not recognised, and an unequal backtick run truncates the span. Neither has a corpus instance and
both fail toward extracting less.

**Mutation proof of the fix — two reverts, each red.** Baseline 122/0.

| Mutation | Reverted | Result |
| -------- | -------- | ------ |
| D | `splitOnDelimiters(line, false)` — code-span awareness off | **3 fail** |
| E | the unclosed-span fallback removed | **1 fail** |
| — | restored | **122 pass / 0 fail** |

**Corpus re-measured after the fix: unchanged** — 4 files, 42 blocks, 0 findings. No corpus document
has an unescaped pipe in a command-column row, so the fix is protective going forward rather than a
change to what the gate reports today. Worth stating: a fix that widens the surface and a fix that
does not are different risks, and this one does not.

5 tests added (117 → 122).

### QA Cycle 2 — 2026-09-09 (refute pass)

**Gate**: PASS (100/100) — `task.87.gate.2.execute-table-cell-snippets.yml`
**QA report**: `task.87.qa.2.execute-table-cell-snippets.md`
**PR Review**: pending — 5c not yet run

`PRIOR_GATES=1` → **REFUTE_PASS=true**, whole branch diff. `SAFETY_REPROBE=false` (gate 1's security
axis read `OK measured`). The refute pass produced two findings, and both are the reason it exists.

**TASK87-002 — a regression introduced by cycle 1's own fix.** An *escaped* backtick was read as a
code-span delimiter, so two of them in one row (`| a \` b | c \` d |`) opened and closed a span, the
real delimiter between them became content, and the row collapsed to a **single cell**. A command
column in such a row does not exist, so its command was dropped in silence — the same class of defect
as TASK87-001, reintroduced by the fix for TASK87-001. Fixed: the escape branch consumes `\`` as
literal content when no span is open, guarded on `spanLen === 0` because markdown's rule is asymmetric
(inside a span a backslash is literal, so the backtick still counts toward closing).

Reachability stated honestly: no in-scope corpus file writes an escaped backtick in a table row, but
**5 markdown files in the repo already do**, and the engine accepts any `--file`.

**A vacuous test — mine, from cycle 1 — caught by the mutation check.** The assertion offered as proof
of the `spanLen === 0` guard passed **with the guard removed**: dropping it leaves the span open to end
of line, the unclosed-span fallback fires, and the fallback's naive split gives the same cells. It
reported coverage that was not there, which is exactly what Step 3c exists to catch, in the suite the
previous cycle had just written.

Replaced with `splitTableRow("| x | \`a|b\` | y |")`, where the guarded reading *closes* the span and
the unguarded one does not. Found by **brute-forcing short strings over `{| \` \\ a space}`** for a
difference rather than by reasoning about which input ought to differ — the reasoning had already
failed once, which is the argument for searching instead of thinking harder.

**The full mutation matrix — every behaviour this task added, reverted one at a time.** Baseline 127/0.

| # | Reverted behaviour | Result |
| - | ------------------ | ------ |
| A | `executeFile` back to `extractBlocks` alone | **4 fail** |
| B | `unescapeCell` returns its input | **4 fail** |
| C | the `status` disagreement channel disabled | **2 fail** |
| D | code-span-aware splitting off | **5 fail** |
| E | the unclosed-span fallback removed | **1 fail** |
| F | the escaped-backtick branch removed | **2 fail** |
| G | the `spanLen === 0` guard dropped | **1 fail** |
| — | restored | **127 pass / 0 fail** |

Two honesty notes worth keeping: **G was `mutation-proven: no` on first attempt** — that is the vacuous
test, reported as a finding rather than quietly repaired, because a cycle that silently fixes its own
instrument reports a cleaner history than it earned. And one batch attempt at B produced `pass 0 /
fail 1`, a module-load failure from a malformed edit rather than a clean mutation; it was re-run
properly. **A broken mutation is not evidence**, and counting it would have inflated the matrix.

**Refute directive's four transition classes**, translated to a pure text extractor rather than
dismissed as inapplicable: end-of-input (span open at EOL → fallback, mutation E), in-flight state
(`spanLen` fresh per row; two calls byte-identical), error path (six pathological inputs including a
2000-backtick string — none threw, slowest 4ms), re-entrancy (stable). Plus scale: 5000 rows in 22ms.

**Corpus re-measured again: unchanged** — 4 files, 42 blocks, 0 findings. Neither fix widened the
surface.

5 tests added (122 → 127).

---

## Completion

**Finished**: _pending_
**Final Status**: _pending_
**Branch**: `feature/task.87.execute-table-cell-snippets`
**PR**: [#365](https://github.com/Gamaroff/agent-skills/pull/365)
**QA Iterations**: _pending_
**DoD Summary**: _pending — populated after Step 7_
**Tracker debt**: _pending — populated after Step 7_
