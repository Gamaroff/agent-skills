# Implementation Report: [Task 54] Intercept GitHub board mutations, and give `gh-stage.js` the credential-free plan its sibling already has

**Task**: `task.54.github-board-interception.md`
**Run Number**: 1
**Started**: 2026-08-19 09:58
**Status**: In Progress

---

## Summary

Make restricted access real for GitHub Projects v2 — add `gh-stage.js --print-plan` (credential-free, above the auth gate), inject a recording `exec` so board mutations can be deferred, guard the two board-field shell helpers, rename `tracker_call_with_retry` → `tracker_write` (alias kept), and teach `finalise` the `deferred` reason.

---

## Pipeline Configuration

| Setting             | Value                                                                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Feature branch base | `develop`                                                                                                                               |
| PR target           | `develop`                                                                                                                               |
| qa-planning gate    | skipped (auto)                                                                                                                          |
| Task risk level     | medium                                                                                                                                  |
| Pipeline mode       | standard                                                                                                                                |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (Todo → In Progress, verified) · Priority P1 High already set — left untouched                                            |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                | Notes | Subagent summary ref |
| -------------------------- | ---------- | ----------------------------------------------------------------- | ----- | -------------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.54.github-board-interception` exists in git  | Branch created at `96ca648`, pushed with upstream tracking | —                    |
| 2. review-task             | ✅ Done    | `task.54.review.1.github-board-interception.md`                   | READY TO IMPLEMENT · 7/10 → 9/10 post-fix · 1 Critical, 5 Important, 2 Optional — all applied · status promoted to `ready-for-development` | —                    |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                  | 6/6 plan items; 25 new tests; 6 invariants mutation-proved; `npm test` 1441/0 + shell 401/0; `validate:all` 115/0; bundle committed | —                    |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                       | PR #255: https://github.com/Gamaroff/agent-skills/pull/255 → `develop`, state OPEN. Commit `ec136c5` (146 files) | —                    |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.54.qa.{1,2}.*.md`; `task.54.gate.{1,2}.*.yml`; PR comments posted | Cycle 1 FAIL 70/100 (1 HIGH, 1 MEDIUM) → cycle 2 **PASS 95/100**, 0 open issues | —                    |
| 7. finalise                | ✅ Done    | `task.54.dod.1.*.md`; task `status: accepted`                      | DoD PASSED. CI waited from PENDING → SUCCESS on final head. Issue #232 closed+verified; board `already` Done | —                    |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                | Final report commit                                        | —                    |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent.

---

## Decisions Log

### Pipeline Startup — 2026-08-19

- Q1 — Feature branch base: `develop` — current branch is `develop`; tasks 51–53 all landed there.
- Q2 — PR target branch: `develop` — standard Gitflow, matches the base.
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 2 (matches the required count for `develop-task`).
- Phase 0 fan-out run inline via Bash rather than via Explore subagents — the file path was supplied
  directly (no resolver needed) and the tracker/lite-mode inputs were each a single cheap read.
  Session-level guidance prohibits unrequested Agent-tool dispatch; the inputs and the resulting
  values are identical either way.
- Pipeline mode: **standard** — computed from `risk_ok = (risk_level "medium" ∈ {low, absent}) = false`
  AND `phase_count = 6 < 3 = false` AND `single_module = false` (touches `shared/resources/`,
  `skills/finalise/`, and `docs/`). Any one false ⇒ standard.
- Always-load files resolved: 3 files from `skills-config.yaml` `devLoadAlwaysFiles`; all three verified present on disk.
- Tracker: GitHub (`JIRA_URL` unset), issue #232.
- Task status on entry: `planned` — proceeding; Step 2 (`/review-task`) validates and updates the status autonomously.
- Dependency pre-check: tasks 51, 52, 53 all `accepted` — no blockers.

### Step 1 — create-branch — 2026-08-19

- Branch `feature/task.54.github-board-interception` created from `develop` at `96ca648`, pushed with upstream tracking.
- `/create-branch` base prompt skipped — Q1 answer (`develop`) pre-supplied by the orchestrator.
- Implementation report stashed before branch creation, restored after (clean pop).
- Tracker signal: comment posted on #232; `gh-stage.js --stage work-started --add-to-board` → `transitioned`, Todo → In Progress, verified.
- Board Priority left at `P1 High` (already set — the P2 default only fires when unset).

### Step 2 — review-task — 2026-08-19

- Output format auto-answered: **Comprehensive report** — required for the pipeline audit trail.
- Step 0a branch setup auto-skipped — already on `feature/task.54.github-board-interception`.
- Pre-pass (architecture alignment + already-implemented scan) run inline via file reads rather than
  dispatched to Explore subagents, per the same session policy recorded at startup. The
  already-implemented scan is what found the Critical.
- Review report: `docs/tasks/task.54.github-board-interception/task.54.review.1.github-board-interception.md`
- **Critical finding (C1)**: the task was authored 2026-08-17, two days before task.53 merged, and
  task.53's commit `bfbebc8` already landed the access gate at `gh-stage.js:828-940` — emitting
  `reason: "deferred"` and covering the whole invocation including `--add-to-board`, because it
  returns before the first credential read. Implementation Plan item 2 ("inject a recording `exec`")
  would have duplicated a shipped, tested gate. Item 2 re-scoped onto the two gaps that gate left:
  the record omits the board **add**, and `verify.cmd` uses `--dry-run`, which cannot run without
  `gh` auth on the machine that wrote the record.
- Items 1, 3, 4, 5, 6 each verified absent from the tree — all genuine work. `--print-plan` count in
  `gh-stage.js` is 0; neither `.sh` helper references `ACCESS_TRACKER`; `tracker_write` does not
  exist; `finalise`'s reason table has no `deferred` row.
- Step 8.5 auto-answered: **Yes, apply all critical + important fixes** — pipeline proceeds
  autonomously. 9 fixes applied, 0 skipped.
- Step 9 auto-answered: **Yes, fixes complete** — status `planned` → `ready-for-development`.
- Card preflight green before and after the edits (no `missing`/`empty`/`no-body` findings).
- Review outcome comment posted to GitHub issue #232.

### Step 3 — develop — 2026-08-19

- Plan file: none (`task.54.plan.*.md` absent) — optional, proceeding without.
- Always-load files: 3 read and passed to `/develop` (coding-standards, tech-stack, source-tree).
- Planned-status gate auto-answered: **Yes, ready to implement** — `/review-task` validated in Step 2.
- Alignment-mismatch gate: auto-answer **"Align code to document"** — the document is the source of truth.
- qa-planning: auto-skipped (silent, no prompt).
- **Pre-develop surface map: 15 files across `shared/resources/`, `skills/finalise/`, `docs/reference/`.**
  Carried forward from the Step 2 review rather than re-derived by a fresh Explore subagent — the
  review read every one of these files to verify the plan's claims, so a second pass would re-read
  what is already known. (Same session policy on unrequested subagent dispatch recorded at startup.)

  | File | Relevance |
  | ---- | --------- |
  | `shared/resources/gh-stage.js` (1856L) | Primary target. `printPlan` absent; access gate `:828-940`; `parseArgs` `:605-745`; `makeExec` `:264`; `ensureOnBoard` `:527`; `setOption` `:573`; `ghAvailable` def `:274` / call `:955`; `dryRun` branch `:1212`; `USAGE`/`--help` block |
  | `shared/resources/jira-stage.js` | The `--print-plan` to mirror: `:344-392`; `parseArgs` case `:94`; usage line `:138`; `no-credentials` `:533` |
  | `shared/resources/resolve-platform.sh` | `tracker_call_with_retry` `:505`; coverage banner `:465-479`; `ACCESS_TRACKER` resolve `:449` |
  | `shared/resources/set-github-project-priority.sh` | Ungated `gh api graphql` at `:70`, `:119` |
  | `shared/resources/set-github-project-estimate.sh` | Ungated `gh api graphql` at `:94`, `:141` |
  | `shared/resources/jira-sprint-lib.sh` `:27-140` | The guard precedent to reuse (subshell resolver, two env tiers, `defer-mutation.js` via `dirname BASH_SOURCE`) |
  | `shared/resources/defer-mutation.js` | The record writer — `defer()`, `resolveAccessTracker()` |
  | `shared/resources/handover-render.js` | Renders the journal into the four output shapes |
  | `shared/resources/tests/gh-stage.test.mjs` (1725L) | Throwing `gh` stub `:8-12`; fixtures `fixtures/gh-*.json` |
  | `shared/resources/tracker-access.test.sh` | Shell-side access-mode tests |
  | `shared/resources/resolve-platform.test.sh` | Resolver + helper tests |
  | `skills/finalise/SKILL.md` | Reason table `:1178-1187`; `not-on-board` escalation `:1193` |
  | `docs/reference/tracker-workflow.md` | Document `--print-plan` on the GitHub path + `deferred` |
  | `shared/resources/platform-detection.md` | Document `tracker_write` and the alias |
  | `docs/reference/troubleshooting.md` | "the board column did not change" entry |


---

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

### QA Cycle 1 — 2026-08-19

**Gate Result**: FAIL (70/100)
**Issues Found**: 2 — 1 HIGH, 1 MEDIUM

- **[HIGH] TASK-54-BUG-1** — `defer-mutation.js` is not bundled beside `resolve-platform.sh` or the
  two board helpers. 17 of 35 skills lack it; in 11 the board helpers exit before their graphql call
  **under `full` mode**, so board Priority/Estimate writes silently stop. Root cause: the bundler
  discovers a sibling `.js` only from a literal `shared/resources/<file>` string;
  `jira-sprint-lib.sh:32` names it and is bundled correctly, these three do not.
- **[MEDIUM] TASK-54-BUG-2** — `--print-plan` sits below the `if (!args.probeBoard)` block that
  validates `--stage`, so `--probe-board`/`--check` bypass the `MOMENTS` check and the lowercasing.

**Why the suite did not catch BUG-1**: every test runs against `shared/resources/`; the defect exists
only in `skills/*/references/`. Source-level results were green throughout — 1441/0 JS, 416/0 shell,
`validate:all` 115/0, prettier clean — and six invariants were each watched failing. The gap is a
whole dimension, not a weak assertion.

**QA methodology deviation**: the Adaptive Review Strategy nominates parallel agents for this shape
of task, and Step 3b nominates a read-only Explore subagent for the diff review. Both were performed
directly instead, per the same session policy recorded at startup. Mitigated by reproducing every
finding through execution rather than inference.

**Action**: Running qa-fix (cycle 1 of 5)

---

## Completion

**Finished**: 2026-08-19 13:00
**Final Status**: Completed
**Branch**: `feature/task.54.github-board-interception` (base `develop`)
**PR**: [#255](https://github.com/Gamaroff/agent-skills/pull/255) → `develop`
**QA Iterations**: 2 (of a possible 5) — cycle 1 FAIL 70/100, cycle 2 PASS 95/100
**DoD Summary**: `task.54.dod.1.github-board-interception.md` — ACCEPTED

#### Step 3 — implementation outcome

Six plan items, all complete. `/develop` ran in `orchestrated` mode (lock present, branch matched),
so it wrote no report of its own and did not call `/finalise` — Step 7 owns that.

| Item | What landed |
| ---- | ----------- |
| 1. `--print-plan` | `gh-stage.js:806-857` — resolves the moment from the ladder alone and emits `{stage, reason:"plan", enabled, targets, offLadder, isLastRung, source, authored}`. Placed above the `ghAvailable` call at `:955`, the first credential read. No `--from`/`hops`: a Projects v2 Status is a single-select field, so there is no route to walk. |
| 2a. Board add in the record | The deferred record's `intent`, `desired.onBoard`, `manual.ui` and `command.argv` now all reflect `--add-to-board`. Previously the checklist told a human to set a field on an item that `ensureOnBoard` had not yet put on the board. |
| 2b. Credential-free `verify.cmd` | Was `--dry-run --json`, which sits *below* `ghAvailable` — unrunnable on the `manual`-mode host that wrote the record. Now `--stage {s} --print-plan`. |
| 3. The two `.sh` guards | Both gated above their first `gh api graphql`. Neither open-codes the mode table: they call the new `defer-mutation.js --resolve-access`. |
| 4. `tracker_write` | Gate prepended to the retry wrapper, covering ~38 call sites with zero call-site edits. Kind inferred from argv (`gh issue comment` → `github.issue.comment`, …), falling back to a new `github.unknown-mutation`. `tracker_call_with_retry` kept as an alias with a test. Coverage banner updated. |
| 5. `finalise` | `deferred` row added to the reason table; reuses the `not-on-board` escalation with wording that reads as a declared policy rather than a malfunction, and requires the record id. |
| 6. Tests + docs + bundle | 25 new tests; 6 invariants mutation-proved; 3 docs updated; `npm run bundle` run and committed. |

**Design decision that departs from the task text (and why).** The task said the two `.sh` helpers
should "guard, record, keep exiting 0", and the review pointed them at `jira-sprint-lib.sh:27-140` as
the precedent. On reading that precedent it is ~110 lines of hard-won shell — subshell-sourced
resolver, two env tiers, CDPATH and empty-`BASH_SOURCE` hazards, each line carrying a CR reference.
Copying it into two more files would have been the fifth copy of the mode table, which that file's
own comments explicitly warn against. Instead `defer-mutation.js` gained `--resolve-access`, a flag
that prints the mode `resolveAccessTracker` already computes for `gh-stage.js`. Each `.sh` guard is
now one line of mode resolution against **the same JS implementation the CLIs use**, so shell and JS
cannot drift. Logged here because it is a structural choice the task document did not specify.

**Roster change requiring a paired constant.** `github.unknown-mutation` was added to
`tracker-access-record.md`, which forced `EXPECTED_KIND_COUNT` 21 → 22 in `defer-mutation.js` plus
three "21 kinds" references in the doc. That coupling is deliberate friction by design — see the
note under the roster table.

**A portability bug caught during testing, not review.** The first `tracker_write` used
`${BASH_SOURCE[0]}` inside the function to locate `defer-mutation.js`. That is bash-only, and this
repo's own resolver already handles the zsh case at `:47-53` with a `%x` fallback. Under zsh the
writer was "not found" and every deferral went unrecorded — the gate still refused the write, so
nothing unsafe happened, but the audit trail was silently empty. Fixed by resolving `_RP_SELF_DIR`
once at source time, where both forms still work, and documenting why a `local` there would shadow
it to empty.

**One existing test was updated rather than left green.** `tracker-access.test.sh`'s
`"names GitHub as a gap"` asserted the banner's claim that *all* GitHub issue and PR writes proceed
normally — which this task falsifies. It was replaced with four assertions naming what is now gated
and what genuinely remains a gap, plus a guard that fails if the stale claim ever returns. This is
the one deviation from "existing suite green unchanged": the assertion was testing a fact the task
deliberately changed.

#### Step 3 — verification

- **Mutation-prove, 6 of 6 watched failing**: `--print-plan` below the auth gate → source-order test red · `verify.cmd` back to `--dry-run` → 2 red · drop `--add-to-board` from replay argv → 1 red · drop the `tracker_call_with_retry` alias → alias test red · let the priority helper past its gate → 2 red · revert the coverage banner → 5 red.
- **No-write proof**: both `.sh` helpers and `tracker_write` run under `manual` against a `gh` stub that exits 99 and prints on any write verb. All exit 0, all record, none issue a verb.
- **Credential-free proof**: `--print-plan` run under `env -i` with node on PATH, no `gh`, `HOME=/nonexistent` → exits 0 with the resolved target.
- **Agreement proof**: `--dry-run`'s `would` ∈ `--print-plan`'s `targets` on the same board fixture. Containment, not equality — `--print-plan` returns the whole rung.
- `npm run validate:all` → **115 passed, 0 failed**.
- `npm run bundle` → propagated to 18 skill copies of `defer-mutation.js` and the roster; 125 `references/` files updated.

#### Step 3 — full-suite failures found and fixed

The first full `npm test` after implementation surfaced **5 failures, all real, all caused by the new
roster kind**. Each was the totality machinery doing precisely what it was built for:

| Failure | Cause | Fix |
| ------- | ----- | --- |
| `§1 roster has exactly 21 kinds` | Added `github.unknown-mutation` | Count → 22, `{jira:10, github:12}` |
| `§1 every roster kind has a renderer` | New kind had no `KIND_PRESENTATION` entry — the renderers would have **silently omitted it from every checklist** | Added the entry to `handover-render.js` |
| `§1 every kind renders in all four formats` | The `handover-all-kinds.jsonl` fixture carried 21 records | Appended a 22nd; updated three count assertions |
| `§10 the PARTIALLY ENFORCED notice` | Asserted the banner's old "GitHub issue and PR writes" gap claim | Replaced with assertions naming what is now gated **and** what remains, plus a guard against the stale claim returning |
| `§12 every bundled copy carries the change` | Pinned bundled copies at `EXPECTED_KIND_COUNT = 21` / `Total: 21` | Bumped to 22 and added an explicit `github.unknown-mutation` pin |

`§1 every roster kind has a renderer` is the one worth calling out: without it the new kind would
have been accepted by `defer()`, written to the journal, and then dropped from the rendered
checklist — a deferral recorded but never surfaced to the human, which is the exact invisible-drift
failure this whole sequence exists to remove. It was caught by a test, not by review.

`§12` also caught that `npm run bundle` had to run **after** the `handover-render.js` edit, not
before. Re-bundled.

Prettier: `gh-stage.js` and `stage-access-gate.test.mjs` were reformatted to match the repo style
(`npx prettier --write`), then re-verified — 30/30 still green.

#### Step 3 — a second portability bug, found the same way

While adding `target` to the `tracker_write` record (so the checklist can say *which* issue, not just
that something was deferred), the argument was passed as `${_tw_target:+--target "$_tw_target"}`.
That form relies on the expansion **word-splitting into two arguments** — which bash does and **zsh
does not**. Under zsh the whole thing arrived as a single argument, `defer-mutation.js` rejected it,
and every `tracker_write` deferral went unrecorded.

The write was still correctly refused, so nothing unsafe happened — but the audit trail was silently
empty, which is precisely the failure this mechanism exists to prevent. This is the same zsh rule
`resolve-platform.sh` already documents at `:78-81` for `validate_enum`; it applies to anything that
reaches an argv. Fixed by always passing `--target`, defaulting to `{}`.

Caught by running the same command under both shells rather than by review — which is now a
permanent test: `[bash]`/`[zsh] tracker_write records WHICH issue`, in `tracker-access.test.sh` §47.
Shell suite: **401 passed, 0 failed**.

### Step 4 — create-pr — 2026-08-19

- Staging scope: `docs/tasks/task.54.github-board-interception`, `shared/resources`, `skills`,
  `docs/reference`, `CHANGELOG.md`. Pre-flight guard found **no out-of-scope untracked files** —
  both untracked files were the review report and this report, inside the task dir.
- Leak check: all 146 staged paths matched a scope prefix. No leak.
- Commit `ec136c5` — one commit, not split: the six plan items are one coherent change (a gate is
  not shippable without the flag its records point at), and 125 of the 146 files are `npm run bundle`
  output generated from the other 21. Splitting would have produced a commit whose tests fail.
- A pre-commit hook re-verified the bundle is in sync — it is.
- `/create-pr` base and issue pre-supplied (`--base develop --issue 232`), so its Step 1 prompt was
  skipped as designed.
- PR #255 opened against `develop`; state verified **OPEN** after creation.
- PR-opened comment posted to issue #232.
- **Board `in-review`: `stage-disabled`.** This repo's `tracker-workflow.yaml` does not declare an
  `in-review:` moment under `pipeline:`, so there was never a move to make. Per `finalise`'s reason
  table this is *success, not a warning* — a human moves this card by design. Exit 0. No action.
- Implementation report was **included** in this commit rather than excluded. It is the audit trail
  and Step 8 commits its final state on top; excluding it would have left the PR without the record
  of how the work was done.

### Step 6 — qa-fix cycle 1 — 2026-08-19

Both findings fixed. No ambiguity in either — the gate's `suggested_action` fields were specific, so
no clarifying questions were needed.

**TASK-54-BUG-1 (HIGH)** — the fix is **comments only**. `git diff --stat` on the two board helpers
is `30 insertions(+)`, all comment lines; `resolve-platform.sh` likewise. That is the correct shape:
the runtime logic was never wrong, only its dependency *declaration*. Each of the three files now
names `shared/resources/defer-mutation.js` literally, and says in the comment why that string is
load-bearing rather than decorative — otherwise the next reader tidies it away and the defect returns.

Two assertions were added rather than one, because each covers the other's blind spot: the
co-location check alone passes on a stale tree that happens to still hold the file, and the
comment check alone passes on a tree that was never re-bundled.

Result: `defer-mutation.js` present beside **35 of 35** bundled `resolve-platform.sh` (was 18) and
every bundled board helper. Full-mode regression verified gone against two different bundled copies;
manual-mode recording verified working from `skills/qa-fix/references/`.

**Deliberately not done**: the QA report floated making the missing-writer branch fail *open* under
`full` (listed as future/non-blocking). Rejected — it would weaken a fail-closed access gate to
compensate for a packaging bug the new test makes impossible. Recorded in the bug report so the
decision is visible rather than looking like an oversight.

**TASK-54-BUG-2 (MEDIUM)** — validation moved onto the `--print-plan` path itself rather than being
inherited from the `if (!args.probeBoard)` block. The deeper reason the shared gate was wrong: the
two paths have genuinely different argument requirements (`--print-plan` needs no `--issue`), so one
condition covering both had to be weakened, and the weakening dropped what the new mode still needed.
7 tests, including a guard that `--probe-board` **without** `--print-plan` still reaches the board
read — the obvious wrong fix is to hoist the check, which would make `--stage` mandatory for a path
that legitimately takes none.

**Step 3.5 adversarial pass over the fixes.** Both fixes re-read as one change:

- BUG-1 touches no executable line, so it cannot introduce a transition defect.
- BUG-2 mutates `args.stage` (lowercases) on a path that returns immediately after — nothing
  downstream reads it. Verified `--check` alone still validates (exit 0 on a clean file) and
  `--init-workflow` still probes.
- Noted, not fixed: `--check --print-plan` resolves the plan and skips the check. That ordering
  predates this cycle and is unchanged by it.

**Mutation-proved, 3 of 3:** revert BUG-2's validation → 24 failed · delete the literal path from
`resolve-platform.sh` → 1 failed · remove one bundled `defer-mutation.js` → 1 failed. Restored: 85
passed, 0 failed across the two suites.

**A second defect, caught by the pre-commit hook rather than by the adversarial pass.** The cycle-1
fix explained the bundler's discovery rule by *quoting the pattern it matches* —
`shared/resources/<file>` — inside the very files the bundler scans. `SHARED_REF_RE` matched the
placeholder and every `npm run bundle` then printed `⚠️ shared/resources/<file> not found` ~30 times.

Harmless to the bundle, which was correct and complete throughout. But a warning nobody can act on is
one everybody learns to scroll past, which is exactly how the real warning gets missed next time —
and this is the task whose whole subject is warnings that overstate or understate what happened.
Fixed in `760c189` by describing the rule instead of quoting it. The load-bearing string is untouched
and the co-location test still passes, which is what proves the rephrase did not undo the fix it
explains.

Worth recording that Step 3.5's four-transition checklist did not catch this: the checklist asks
about teardown, in-flight, error and reconnect, and this was none of those — it was a change whose
*text* had a side effect on a tool that reads the text. The pre-commit hook caught it immediately,
which is the right layer for it.

**Cycle 1 commits**: `1555b01` (both fixes + 8 tests), `760c189` (bundler-warning follow-up). Both
pushed. PR #255 verified still OPEN after the push.


### QA Cycle 2 — 2026-08-19

**Gate Result**: PASS (95/100) — loop exits after 2 cycles
**Issues Found**: 0 open. Both cycle-1 findings verified fixed; 1 LOW observation carried to `future`.

Verification was by **re-executing each bug report's own steps**, not by reading the diff — a diff
shows what the developer intended, running the steps shows what a consumer gets. The full-mode
regression was re-tested against **three** separate bundled skills rather than one, because a single
sample cannot distinguish "fixed" from "that one happened to work".

| Was | Now |
| --- | --- |
| Writer beside 18/35 bundled `resolve-platform.sh` | **35/35** |
| Writer beside 0/11 bundled board helpers | **11/11** |
| Bundled helper under `full` — skipped the write | reaches the graphql call, in all 3 sampled |
| Bundled `tracker_write` under `manual` — refused, unrecorded | refuses **and** records, 0 write verbs |
| Reliability NFR | FAIL → **PASS** |

The 5 points withheld: the LOW message-quality item, and the durable gap the task deliberately did
not close — the bundler still has no rule for a shell script invoking a sibling `.js`, so the
convention is held by a comment plus a test rather than by the tool. Reasonable to stop there (the
test makes silent reintroduction impossible), but it is a convention, not a mechanism, and the gate
says so rather than scoring it as if it were solved.

**Loop exited at cycle 2 of a possible 5.**


### Step 7 — finalise — 2026-08-19

**Outcome: ACCEPTED.** DoD verified across success criteria, CI, security, compliance and docs.

**CI was the gate that actually bit.** First sample returned `PENDING` — three jobs `IN_PROGRESS`.
The DoD contract is explicit that waiting is correct and assuming is not, so the run waited rather
than rounding a pending rollup up to green, then re-sampled to `SUCCESS` and additionally verified
the green run was on the **final head** (`16a2234`) rather than an ancestor. A green on an ancestor
is evidence about that commit, not this one.

**Two verification claims were checked rather than accepted**, both of which initially looked like
findings and were not:

- A grep suggested the journal-unwritable path might fall through to performing the mutation. Reading
  `gh-stage.js:1065-1066` shows it returns `deferred` with `transitioned: false` — correct; the grep
  pattern simply missed the comment wording.
- A scan reported five `env|token|auth` additions to `gh-stage.js`. All five are the substring `auth`
  inside `authored` / `pipelineAuthoredFor` or in comment prose. Zero credential surface added.

**PR review honestly scored.** No human reviewer is assigned — this is a solo-maintainer repository.
Rather than record APPROVED, the DoD names the fact and states what serves the review function
instead (the two-cycle QA gate plus CI). "Nobody objected" and "someone approved" are different
facts and the artifact should not conflate them.

**Residual items carried openly** into gate 2's `future` list rather than quietly closed: the LOW
message-quality item, and the bundler rule that remains absent — the root cause of TASK-54-BUG-1,
left guarded by a test rather than by the tool.

Tracker: issue #232 closed and verified `CLOSED`; board `done` returned `reason: "already"` (GitHub
moved the card on close) — success with no mutation needed, per the reason table.

### Step 8 — commit-changes — 2026-08-19

Final implementation-report commit. This is the only commit that carries the report, by design: every
`fix(...)` commit in the QA loop deliberately excluded it so the report's history stays in one place
rather than being split across the branch.

## Completion Summary

Six plan items delivered, two QA cycles, one HIGH and one MEDIUM defect found and fixed, and five
further defects caught by tooling during the run (two zsh-vs-bash portability bugs, one self-inflicted
bundler warning, and the two suite failures from the new roster kind). Every one of them shared a
shape worth naming: **the write was refused correctly, but the record of it was silently absent** —
which is precisely the failure this task sequence exists to remove, showing up inside the work that
removes it.

Final verification: `npm test` 1448/0 · shell 416/0 · `validate:all` 115/0 · prettier clean · bundle
warning-free · CI green on the final head.
