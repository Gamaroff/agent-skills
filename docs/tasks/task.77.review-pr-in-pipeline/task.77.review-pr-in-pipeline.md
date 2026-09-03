---
id: task.77
title: "[Task 77] Run the PR conformance review before a work item is finalised"
type: task
description: "/review-pr runs two lenses; only one of them duplicates the pipeline. Its code lens is the same reviewer qa-story and qa-task already dispatch every cycle, but its conformance lens — does the diff deliver what the work item promised, and does the trail behind it hold up — has no counterpart anywhere in the pipeline. Wire it in as the exit gate of the Step 5–6 QA loop, where the trail it audits exists and an adverse verdict can still reach qa-fix."
tags: [pipeline, review-pr, qa, conformance, documentation]
category: infrastructure
status: ready-for-review
priority: High
risk_level: medium
created: 2026-09-01
updated: 2026-09-03
assignee:
estimated_effort_hours: 10
---

# Technical Task: Run the PR conformance review before a work item is finalised

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.77.review.1.review-pr-in-pipeline.md` implemented 2026-09-03

---

## 1. Overview

`/review-pr` (task 66) reviews a pull request **as a claim**: *this PR says it implements task 65 —
does it, and is the evidence there?* It runs two read-only lenses over the scoped diff and emits a
deterministic verdict — `✅ APPROVE` / `⚠️ CONCERNS` / `🚨 REQUEST CHANGES`.

It ships deliberately standalone. Its SKILL.md closes with:

> `/develop-story` and `/develop-task` do **not** call `/review-pr`. Their QA step already runs the
> code reviewer every cycle with `code_review_blocking=true`.

That reasoning is sound for the **code** lens and silent about the **conformance** lens, which has
no counterpart anywhere in the pipeline.

This task wires `/review-pr` into `develop-task` and `develop-story` as **Step 5c** — the exit gate
of the existing Step 5–6 QA loop — and updates every consumer document, runbook and diagram that
describes the pipeline shape.

**Scope**: one behavioural file, one shell guard, six contracts/templates, three SKILL.md files,
five test files, and a documentation sweep across roughly fifteen consumer docs and three diagrams.

---

## 2. Motivation

### Current Problems

1. **Nothing in the pipeline checks conformance.** `qa-story` / `qa-task` validate acceptance
   criteria and dispatch the code reviewer. Neither asks the four questions `/review-pr`'s
   conformance lens asks: does the diff **cover** what the work item promised; did it drift outside
   that **scope**; is the artifact **trail** complete and honest; is the work item **consistent**
   with what shipped. A run can reach `accepted` with a complete-looking trail that does not hold.

2. **This is not hypothetical — it is this skill's own origin story.** Task 66 shipped `accepted`
   through 2 QA cycles, a DoD gate and 40 contract tests while carrying a multi-glob `ls` that
   collected 6 files under bash and **0 under zsh**, the default macOS shell. What caught it was
   `/review-pr` dogfooding on its own PR (#283), returning REQUEST CHANGES and generating tasks
   67–70. The instrument existed and was not in the loop.

3. **The artifact exists but nothing produces it.** `docs/standards/file-naming.md` already defines
   the `*.pr-review.{n}.{name}.md` grammar for both stories and tasks. No pipeline step emits one.

4. **`ready-for-merge` fires too early.** The stage signals the moment the QA gate reads PASS. With
   a review still to come, a card can be advertised as merge-ready while the pipeline is about to
   loop back into `/qa-fix`.

### Why now

`/review-pr` is `accepted` and its four follow-ups (67–70) are filed, so its contract is stable.
Task 67 has already landed the discipline this task depends on — a QA gate that *executes* a prose
skill rather than reading it.

---

## 3. Technical Background

### The step number is a single integer

Pipeline position lives in `.claude/state/develop-pipeline.lock` as `current_step`, validated by a
hard-coded range in `shared/resources/advance-pipeline-lock.sh`:

```sh
case "$NEXT" in 1|2|3|4|5|6|7|8) ;; *) echo "...invalid next step '$NEXT' (expected 1..8)"; exit 1 ;; esac
```

No fractional value can be stored. A ninth integer step would ripple through that validator, both
`case` blocks in `develop-pipeline-on-stop.sh`, the resume detector's stated range and its
`[1, 2, 4, 8]` exemption list, both Pipeline Progress templates, the remaining-work banner, every
`{N}/8` string in three SKILL.md files, and the protocol eval step maps — for no behavioural gain.

### The loop is the shape this file is built for

Steps 5 and 6 already share **one** file and **one** banner (`Steps 5–6/8`), and the lock advancer
already noops for loop members:

```sh
qa-story|qa-task|qa-fix)    exit 0 ;;  # iterative loop, orchestrator manages
```

A third loop member is the existing pattern, not a new one.

### The trail is complete at PASS

By the time the gate reads PASS, every artifact the conformance lens audits exists — implementation
report, review report, QA report, gate. Only the DoD is missing; `finalise` writes it at Step 7. And
an adverse verdict still has somewhere to go, because `/qa-fix` is live.

### `develop-bug` does not share this file

It runs its own `develop-bug-step-5-6-verify-loop.md`. Editing the shared QA loop file does not
reach it — a clean scope boundary, not an oversight.

---

## 4. Scope

### In Scope

✅ **Step 5c in the shared QA loop** — `/review-pr` runs when the gate reads PASS/WAIVED
✅ **Verdict routing** — REQUEST CHANGES returns to 5b `/qa-fix` on the shared 5-cycle budget
✅ **`ready-for-merge` moves behind the review** — same file, same stage, same off-by-default default
✅ **Lite mode** — degrades to `--effort low`, never skips
✅ **Resume contract, progress templates, banners, autonomous defaults**
✅ **`/review-pr` SKILL.md** — rewrite the section that states the opposite
✅ **Tests** — extend the protocol evals, add a routing parity test
✅ **Full documentation, runbook and diagram sweep** — Phase 6, with its own success criteria
✅ ~~**A `docs-pipeline` conflict tag** in the roadmap Legend~~ — **already satisfied at filing**:
   the tag is defined at `docs/development/project-completion-roadmap.md:68` and T77's own row already
   carries `docs-pipeline!`. No Phase covers a Legend edit and §7 does not list the roadmap file. Do
   **not** add a second Legend row.

### Out of Scope

❌ **`/develop-bug`** — separate verify-loop file
❌ **Any renumbering of `develop-next` / `develop-batch` steps** — they inherit the review by
   delegation; their merge lane is pinned by a test that hard-codes a heading string
❌ **Inline PR comments** — that is task 70
❌ **Giving `/review-pr` the power to write a gate or submit a formal review** — the advisory
   contract is preserved exactly
❌ **A new integer pipeline step**

---

## 5. Breaking Changes

None for consumers. The pipeline gains a step inside an existing loop; the lock schema, step count,
and every `{N}/8` banner are unchanged. A resumed run started before this change lands re-enters at
Step 5 and picks up 5c naturally.

One behavioural change worth naming: a run whose PR review returns REQUEST CHANGES now consumes a
QA cycle it would not have consumed before, and can therefore reach Loop Limit Escalation on a run
that previously exited clean. That is the point of the gate, and the escalation path already exists.

---

## 6. Implementation Plan

> **Edit `shared/resources/` only.** Every `skills/*/references/*` copy carries an
> `AUTO-GENERATED — DO NOT EDIT` banner; a change made there is reverted by the next `npm run bundle`.

### Phase 1: The loop gains an exit gate

**Risk Level**: Medium
**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:
- [x] Repoint the PASS and WAIVED arms of *Outcome branching (shared)* from
      "exit loop, proceed to Step 7" to "proceed to 5c"
- [x] Add a **§5c — PR conformance review** section invoking
      `/review-pr --effort {medium|low} --comment` against the open PR
- [x] Add the verdict branch: REQUEST CHANGES → 5b (**counter incremented once, by 5b step 7, on
      exit** — QA cycle 1 found that incrementing at 5c too burns two cycles per fix); APPROVE and
      CONCERNS → signal `ready-for-merge`, exit to Step 7
- [x] Move the `ready-for-merge` stage block so it fires **after** 5c clears, not on the QA gate
- [x] Add a **PR Review** row to the `### QA Cycle {N}` template
- [x] Extend Loop Limit Escalation text to cover a loop exhausted by review verdicts

### Phase 2: The lock tolerates a third loop member

**Risk Level**: Low
**Files**: `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`

- [x] Add `review-pr` to the noop arm: `qa-story|qa-task|qa-fix|review-pr) exit 0 ;;`
- [x] Cover it in the shell test — a `--skill review-pr` call must leave `current_step` untouched.
      **This is greenfield**: all 6 existing scenarios in `advance-pipeline-lock.test.sh` invoke
      `--skill commit-changes`, and the `qa-story|qa-task|qa-fix` arm has no coverage at all today.
      Backfill the three existing arms in the same edit

### Phase 3: Contracts and templates

**Risk Level**: Low

- [x] `develop-pipeline-resume-contract.md` — Step 5–6 row: once the gate reads PASS/WAIVED,
      `*.pr-review.{n}.*.md` must also exist. Conditional, because a mid-loop resume on a CONCERNS
      gate legitimately has none
- [x] `develop-pipeline-step-0-resolve-and-prepare.md` — both Pipeline Progress templates: add the
      report to the Step 5–6 row's Required Artifacts
- [x] `develop-pipeline-lite-mode.md` — lite runs `/review-pr --effort low`; it never skips
- [x] `develop-pipeline-autonomous-defaults.md` — the pipeline passes `--comment` explicitly,
      because `/review-pr` otherwise asks before posting and the pipeline cannot prompt. Already
      -authorised ground: Steps 5–6 and 7 both comment on the PR
- [x] `pipeline-resume-detector-prompt.md` — **corrected during implementation**: 5c dispatches no
      summary-writing subagent of its own (`/review-pr` runs its lenses internally), so it writes no
      `.summaries/step-*.json` and its absence is never a gap. Step 5 is already non-exempt; the
      `[1, 2, 4, 8]` list is unchanged either way
- [x] `develop-pipeline-remaining-work-banner.md` — the 5c cycle banner

### Phase 4: Skill prose

**Risk Level**: Low

- [x] `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` — Step 5–6 section text and
      the Related Skills list gain `/review-pr`. **No `{N}/8` string changes**
- [x] `skills/review-pr/SKILL.md` — rewrite *Relationship to the develop pipelines*, which currently
      states the opposite. Distinguish **writing a gate** (still never) from **being consulted by a
      pipeline** (now yes). Keep every advisory sentence intact

### Phase 5: Tests

**Risk Level**: Medium

- [x] `evals/develop-{task,story}/protocol/pipeline-shape.test.mjs` — add `review-pr` to
      `EXPECTED_STEPS` between `qa-fix` and `finalise` (the test walks `indexOf` monotonically). **Fix
      both test titles in the same edit**: develop-task's reads `"lists all 8 pipeline steps in order"`
      (L41) and goes stale at 9; develop-story's reads `"lists all 9 pipeline sub-skills in order"`
      (L45) against an 8-entry array and is **already off by one**
- [x] `evals/develop-{task,story}/protocol/step-contract.test.mjs` — add a `review-pr` keyword to
      `STEP_KEYWORDS["5-6"]`
- [x] **New** `evals/shared/tests/pr-review-loop-parity.test.mjs` — assert the routing literally:
      REQUEST CHANGES → 5b; APPROVE/CONCERNS → exit; `ready-for-merge` appears **after** the 5c
      section, not before; the 5-cycle bound covers 5c. No `package.json` edit needed —
      `evals/shared/tests/*.test.mjs` is already globbed
- [x] `evals/shared/tests/transition-protocol-parity.test.mjs` — confirm the step-file → stage pair
      assertions still hold once `ready-for-merge` moves within the file
- [x] `skills/review-pr/tests/review-pr.test.js` — update any assertion quoting the "do not call"
      sentence; leave the advisory assertions untouched and green

### Phase 6: Documentation, runbooks and diagrams

**Risk Level**: Low — but this phase is **not optional and not a tail**. See §10 Risk 3.

Pipeline behaviour is restated independently across roughly fifteen consumer documents, and nothing
tests them. A developer's model of the pipeline comes from these files, not from
`shared/resources/`. **The task is not done until a reader of any of them learns that a PR
conformance review now runs, what verdict routing it performs, and what new artifact appears on
disk.**

**Diagrams** — each is a mermaid graph whose PASS edge currently jumps straight from the QA gate to
finalise. Keep the house theme in `develop-pipeline-readme-mermaid-theme.md`; author and audit via
`mermaid-architect`.

| File | Current edge | Becomes |
| --- | --- | --- |
| `skills/develop-story/README.md` (~L112–125) | `S5gate -- PASS no top_issues --> S7` | `--> S5c[Step 5c: review-pr]` → `S5cv{Verdict}`; `S5cv -- REQUEST CHANGES --> S6`; `S5cv -- APPROVE / CONCERNS --> S7` |
| `skills/develop-task/README.md` (~L110–125) | same edge, same shape (no traceability-mapper pre-step) | same |
| `docs/runbooks/qa-flow.md` (L18–23) | `B -->\|CONCERNS/FAIL\| D[qa-fix]`, PASS has no successor | add `B -->\|PASS/WAIVED\| E[review-pr]`, `E -->\|REQUEST CHANGES\| D`, `E -->\|APPROVE/CONCERNS\| F[finalise]` |

**Runbooks** — the walkthroughs developers actually follow:
- [x] `docs/runbooks/task-development.md` — numbered step table (L113–115, the `5–6` row) and skills
      table (L147–150): name `review-pr`, its verdict routing, its shared 5-cycle budget
- [x] `docs/runbooks/story-development.md` — equivalent tables, plus the develop-next/develop-batch
      merge note at L223 (the PR they merge is now pre-reviewed)
- [x] `docs/runbooks/qa-flow.md` — prose beyond the diagram: "Repeat until `PASS` or `WAIVED`" (L60)
      is no longer the exit condition; `review-pr` needs a section beside `qa-fix` and `qa-gate`, and an
      entry in **`## See also` (L92)** — there is no "Related skills" heading in this file; L88 is inside
      `## Cross-skill data flow`. Note also that this diagram's terminal today is `C[qa-gate]` and it has
      **no `finalise` node**, so adding one widens what the diagram models — a deliberate call, not a
      mechanical edge-add
- [x] `docs/runbooks/unattended-overnight-runs.md` — what one `/develop-next` iteration now includes
- [x] `docs/runbooks/first-week/day-1-tasks.md` (L97), `day-2-stories.md` (L81) — the one-line
      pipeline shapes new developers read first
- [x] ~~`docs/runbooks/restricted-access.md`~~ **ruled out** (the task's premise does not hold:
      `resolve-platform.sh` accepts only `access.vcs: full`, so nothing defers on the VCS axis);
      `docs/concepts/restricted-access.md` — updated instead, on the **tracker** axis, qualified to
      GitHub since the Bitbucket comment path is single-shot

**Reference and concept docs**:
- [x] `docs/reference/pipeline-artifacts.md` — **the direct contradiction**, line 50:
      `| — | review-pr (standalone — not a pipeline step) | …`. Also the Step→artifact table, the
      co-located tree diagrams (`← Step N` annotations must place the pr-review report), and the
      "Steps 5–6 loop up to 5 cycles" note
- [x] `docs/operations/workflows.md` — story, task and both orchestrator chains
- [x] `docs/reference/invocation.md` (L89, L98), `docs/reference/commands.md` (**L11–12** and L57–58 —
      **not** L20–24, which are the `/develop-next` / `/develop-batch` / `/loop` orchestrator rows this
      task puts out of scope. L11 is the file's one literal spelling-out of the pipeline chain,
      `branch → review → develop → PR → QA → fix → finalise → commit`, and is the line 5c invalidates)
- [x] `docs/concepts/quickstart-story.md` (L131), `quickstart-task.md` (L94), `overview.md` (L100)
- [x] `docs/reference/activation-phrases.md` — still user-invocable; note it now also runs
      automatically
- [x] `docs/reference/skill-catalog.md` — **generated**; `npm run generate-catalog`, never hand-edit
- [x] `docs/standards/story-documents.md` (L106) and `docs/standards/task-documents.md` (L108) — the
      artifact-ownership tables. Both currently attribute the PR review report to `review-pr`
      **(standalone)**; that is the same contradiction as `pipeline-artifacts.md:50` and neither
      re-derivation grep below reaches them (they contain no `qa-*` token, and the second grep is scoped
      to `docs/reference/` and `docs/concepts/`)
- [x] `CHANGELOG.md` — a release entry describing the new capability

**Re-derive the list before closing the phase** — the enumeration above is a snapshot, not an
inventory:

```bash
grep -rln "qa-fix\|qa-story\|qa-task" docs/ skills/*/README.md README.md
grep -rn "not a pipeline step\|standalone" docs/reference/ docs/concepts/ docs/standards/
# Word-boundary form — a bare `review-pr` also matches `code-review-prompt.md` and `review-prd`,
# which manufactures phantom hits (including two inside the QA-loop file itself).
grep -rnE "review-pr([^a-z-]|$)" docs/ skills/*/README.md skills/*/SKILL.md README.md
```

Every hit is updated or consciously ruled out, and the ruled-out ones are **named in the
implementation report**.

### Phase 7: Bundle and regenerate

- [x] `npm run bundle` — verify propagation to develop-task and develop-story and **not** develop-bug
- [x] `npm run generate-catalog` if any `description:` changed

---

## 7. Files Summary

### Files to Modify — behaviour

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — the whole functional change
2. ✅ `shared/resources/advance-pipeline-lock.sh` + `.test.sh` — third loop member

### Files to Modify — contracts, templates, prose

3. ✅ `shared/resources/develop-pipeline-{resume-contract,lite-mode,autonomous-defaults,remaining-work-banner}.md`
4. ✅ `shared/resources/develop-pipeline-step-0-resolve-and-prepare.md`
5. ✅ `shared/resources/pipeline-resume-detector-prompt.md`
6. ✅ `skills/{develop-task,develop-story,review-pr}/SKILL.md`

### Files to Modify — tests

7. ✅ `evals/develop-{task,story}/protocol/{pipeline-shape,step-contract}.test.mjs`
8. ✅ `evals/shared/tests/pr-review-loop-parity.test.mjs` **(new)**
9. ✅ `skills/review-pr/tests/review-pr.test.js`

### Files to Modify — documentation (Phase 6)

10. ✅ 3 diagrams, 7 runbooks, 8 reference/concept docs, `CHANGELOG.md` — enumerated in Phase 6

### Files Regenerated (commit them — CI checks freshness)

11. ✅ `skills/{develop-task,develop-story}/references/*` — `npm run bundle`
12. ✅ `docs/reference/skill-catalog.md` — `npm run generate-catalog`

### Explicitly NOT modified

- **`skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`** — they delegate at their
  Step 2, so every PR they merge is now pre-reviewed by inheritance. `develop-batch`'s per-item
  merge lane is pinned by `transition-protocol-parity.test.mjs:258-283`, which hard-codes
  `indexOf("## Step 4 — Clean up worktrees")` as the lane's end marker
- **`skills/develop-bug/SKILL.md`** and `develop-bug-step-5-6-verify-loop.md` — separate file. Note it
  is **skill-native**: it lives only at `skills/develop-bug/references/`, carries no `AUTO-GENERATED`
  banner and has no `shared/resources/` source, so §6's "edit the shared source" rule does not apply to
  it. `develop-bug` does not bundle the shared QA loop at all
- **`package.json`** — the new test lands under an existing glob

---

## 8. Testing Strategy

### Structural checks

- [x] `npm run bundle` leaves the tree clean; `git diff --stat skills/*/references/` shows
      develop-task and develop-story updated and develop-bug untouched
- [x] `npx prettier --check` passes
- [x] `npm test` **and** `npm run eval:all` — CI runs `format:check` + `npm test` + `eval:all`;
      running only `npm test` locally is the exact gap task 75 exists to close
- [x] link-check passes against the **tracked** tree, not the working tree — working-tree checks
      miss `#anchors` and gitignored targets

### Execute the prose, do not only read it

**This is the lesson of task 67, learned from this very skill.** Every shell snippet added to §5c
runs under **both bash and zsh**. Task 66 shipped `accepted` past 2 QA cycles and 40 contract tests
with a glob returning 6 files under bash and 0 under zsh. Contract tests that assert what prose
*says* would pass that defect again.

### End-to-end dogfood

> **Not run — and deliberately not ticked.** This is a documentation-and-contract change: 5c does
> not execute until a *subsequent* pipeline run reaches it, so no `*.pr-review.*` artifact can exist
> on this branch. QA cycle 2 caught these as ticked-without-evidence; they are now deferred to the
> first real run. The one that is already known to be wrong is struck through.

- [ ] `/develop-task` on a small task produces `task.{id}.pr-review.1.{name}.md` beside the QA report
- [ ] The QA Cycle entry carries the PR Review row
- [x] Step 8's `grep -q "⏳ Pending"` assertion still finds nothing
- [ ] ~~A forced REQUEST CHANGES routes back into `/qa-fix` and increments the shared counter~~ —
      restated: routes back into `/qa-fix`, and the counter is incremented **once, by 5b step 7**
- [ ] One `/develop-next` run merges a PR that already has a pr-review report on disk — **with no
      orchestrator edit**

### Mutation Proving

Each behavioural claim gets a proof, per `shared/resources/mutation-proving.md`:

- [x] Revert the PASS→5c repoint → `pr-review-loop-parity.test.mjs` goes red
- [x] Revert the `review-pr` noop in `advance-pipeline-lock.sh` → **expected NOT to hold, and that is
      the finding.** `advance-pipeline-lock.sh:100` already has a `*)` catch-all (`# Unknown skill = not
      a pipeline sub-skill = silent noop`, `exit 0`), so removing `review-pr` from the explicit arm at
      L80 changes **no behaviour** — the call falls through and still leaves `current_step` untouched. A
      behaviour-asserting shell test therefore stays green. Per task 76's three diagnoses this is
      **redundant source**, not a vacuous test: the arm is worth adding for explicitness and
      documentation, but do not manufacture a literal-string assertion just to make a red appear.
      Record the unheld proof and its diagnosis in the implementation report.
- [x] Move `ready-for-merge` back ahead of 5c → the ordering assertion goes red

Per task 76's guidance: a held proof is evidence about a test, not about the input space. An unheld
proof gets investigated — vacuous test, redundant source, or wrong premise — before any test is
strengthened.

---

## 9. Success Criteria

### Functional

- [x] `/review-pr` runs in every `develop-task` and `develop-story` run once the QA gate reads
      PASS or WAIVED
- [x] `REQUEST CHANGES` routes into `/qa-fix` and shares the 5-cycle budget
- [x] `CONCERNS` records findings and does not block; `APPROVE` exits clean
- [x] `ready-for-merge` fires only after the review clears
- [x] A `*.pr-review.{n}.{name}.md` report lands beside the work item on every completed run
- [x] Lite mode degrades to `--effort low` and never skips
- [x] `/develop-next` and `/develop-batch` merge pre-reviewed PRs **with no orchestrator change**

### Documentation

- [x] All three mermaid diagrams show the verdict branch and parse under `mermaid-architect`
- [x] `docs/reference/pipeline-artifacts.md` no longer calls `/review-pr` "not a pipeline step",
      and its Step→artifact table places the report
- [x] `docs/runbooks/{task,story}-development.md` step tables name the review and its routing
- [x] `docs/runbooks/qa-flow.md` no longer presents the QA gate as the loop's exit
- [x] A developer reading any single runbook end-to-end learns the review exists, what it decides,
      and what artifact it leaves
- [x] The re-derivation greps return no un-triaged hit; ruled-out hits are named in the
      implementation report

### Regression

- [x] The pipeline is still 8 steps; no `{N}/8` string changed; the lock still validates `1..8`
- [x] `/review-pr` still writes no gate, never approves, never edits code — its advisory contract
      tests stay green and untouched
- [x] `develop-bug`'s **own** files are byte-unchanged — `skills/develop-bug/SKILL.md` and
      `develop-bug-step-5-6-verify-loop.md` — and it gains no 5c step.

      > **Corrected during implementation.** The original criterion read "`develop-bug` is
      > byte-unchanged", which is unachievable given this task's own Phase 3: `develop-bug` bundles
      > `develop-pipeline-{lite-mode,autonomous-defaults,remaining-work-banner,resume-contract,step-0-resolve-and-prepare}.md`
      > and `pipeline-resume-detector-prompt.md`, all of which Phase 3 edits. Those bundled copies
      > will mention Step 5c, which is the pre-existing pattern — they already name `qa-story`,
      > which `develop-bug` does not run either. What must hold is behavioural isolation, which is
      > what this criterion now states.
      >
      > A real leak was caught here and fixed: linking the QA-loop step file **by path** from
      > `develop-pipeline-autonomous-defaults.md` made the bundler follow the reference and copy
      > `develop-pipeline-step-5-6-qa-loop.md` — plus its own transitive refs (`code-review-prompt.md`,
      > `qa-execute-snippets.mjs`, `qa-re-review-scope.md`, `qa-runnable-prose-detection.md`,
      > `qa-traceability-mapper-prompt.md`) — into `skills/develop-bug/references/`. Verified against a
      > clean `origin/develop` worktree that the baseline bundles clean, so the leak was introduced by
      > that reference and not pre-existing. **Do not reference the QA-loop step file by path from any
      > shared resource that `develop-bug` bundles.**
- [x] `transition-protocol-parity.test.mjs` still passes, including its `pr-merged`-fires-nowhere-else
      assertion and the develop-batch lane markers

---

## 10. Risk Assessment

| # | Risk | Likelihood | Impact | Mitigation |
| - | ---- | ---------- | ------ | ---------- |
| 1 | **Prose passes review but fails on zsh** — the exact defect task 66 shipped | Medium | High | Execute every snippet under both shells (§8). Contract tests alone would not catch it |
| 2 | **A REQUEST CHANGES loop burns the cycle budget**, escalating runs that used to pass | Medium | Medium | Shared counter is deliberate — an escalation is the correct outcome for a PR that cannot satisfy the review in 5 cycles. Escalation path already exists |
| 3 | **The doc sweep is dropped under time pressure** — it is the phase that always goes | High | Medium | Phase 6 has its own success criteria and its own re-derivation greps; the criteria in §9 gate acceptance. This repo has already learned that consumer docs drift silently because nothing tests them |
| 4 | **Moving `ready-for-merge` breaks a parity assertion** | Low | Medium | `transition-protocol-parity.test.mjs` pins step-file → stage pairs; the stage stays in the same file. Verified explicitly in Phase 5 |
| 5 | **A bundled copy is edited instead of the source** — silently reverted by the next bundle | Medium | Medium | Standing repo rule, restated at the head of §6. Phase 7 diffs the regenerated tree |
| 6 | **The conformance lens is noisy on early runs**, blocking on trail gaps that are normal mid-pipeline | Low | Medium | The lens already scopes this: "Absence of an artifact is a finding ONLY when the work item's own state implies it should exist." 5c runs at PASS, when the trail is complete by construction |

---

## 11. Rollback Plan

Revert the commit and run `npm run bundle`. The change is additive within one loop: no lock schema
change, no step renumber, no migration. A run resumed after a rollback re-enters at Step 5 and exits
on the QA gate as it did before.

Partial rollback is available and cheap — deleting the §5c section and restoring the two PASS/WAIVED
arms disables the gate while leaving every doc, test and contract in place.

---

## QA Testing Results

**QA Status**: CONCERNS at cycle 4; **Step 5c returned REQUEST CHANGES** — 4 trail findings, loop continues
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-03
**Quality Score**: 70/100
**Gate Decision**: FAIL

### QA Report

- **Cycle 1**: [qa.1](./task.77.qa.1.review-pr-in-pipeline.md) · [gate.1](./task.77.gate.1.review-pr-in-pipeline.yml) — FAIL, 7 findings
- **Cycle 2** (refute pass): [gate.2](./task.77.gate.2.review-pr-in-pipeline.yml) — FAIL, 11 findings, 2 of 3 HIGH introduced by cycle 1's own fixes
- **Cycle 4**: [gate.4](./task.77.gate.4.review-pr-in-pipeline.yml) — CONCERNS (85), 0 HIGH. Both escalated decisions implemented as mechanism replacements; 2 items deferred to tasks 85/86/87
- **Step 5c**: [pr-review.1](./task.77.pr-review.1.review-pr-in-pipeline.md) — 🚨 **REQUEST CHANGES**. First real execution of the step this task adds, on its own PR. Found 4 high-confidence trail defects four QA cycles missed, including a self-upgraded gate
- **Cycle 3**: [gate.3](./task.77.gate.3.review-pr-in-pipeline.yml) — FAIL, **convergence stall**. 9 of 11 cycle-2 closures verified real; the 3 that were not cluster on one predicate that has now failed three cycles (third strike). Escalated — two scope decisions required

### Test Coverage Summary

- **Tests Executed**: 324 (plus full `npm run ci`, exit 0)
- **Phases Verified**: 7/7 implemented, 3 with issues
- **Critical Issues**: 3 HIGH
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: FAIL, Maintainability: CONCERNS

### Key Findings

Every regression criterion holds and the design is sound, but three contradictions make the new path
unrunnable: Loop Setup still says a clean PASS exits the loop (so 5c may never be entered), the shared
cycle counter is incremented twice on a review-driven cycle, and the `REQUEST CHANGES` route cannot
deliver its findings to `/qa-fix` so it dead-ends in the no-code-change HALT.

---

## Change Log

| Date       | Version | Description                                                       | Author      |
| ---------- | ------- | ----------------------------------------------------------------- | ----------- |
| 2026-09-01 | 1.0     | Initial draft — wire /review-pr into the develop pipelines as 5c   | create-task |
| 2026-09-03 | 1.1     | Review passed (9/10) — 0 critical, 6 important. Added `docs/standards/{story,task}-documents.md` to the Phase 6 sweep (both attribute the pr-review report to `review-pr` (standalone) and neither re-derivation grep reached them); corrected the `commands.md` citation from L20–24 (out-of-scope orchestrator rows) to L11–12; restated the `advance-pipeline-lock.sh` mutation proof as expected-not-to-hold (the `*)` catch-all already noops — redundant source, per task 76); marked the `docs-pipeline` Legend item already satisfied at filing; widened the re-derivation greps and switched to a word-boundary `review-pr` pattern | review-task |
| 2026-09-03 |         | Status → ready-for-review — all 7 phases implemented, full `npm run ci` green (format:check + npm test + eval:all) | develop |
| 2026-09-03 |         | QA gate FAIL (70/100) — 3 HIGH, 2 MEDIUM, 2 LOW. Status → in-progress | qa-task |
| 2026-09-03 |         | QA findings fixed — all 7 gate issues plus 6 advisory cleanups, 1 iteration. Status → ready-for-review | qa-fix |
| 2026-09-03 |         | QA gate 2 FAIL (70/100, refute pass) — 11 findings, 2 of 3 HIGH introduced by cycle 1's fixes; all closed | qa-task |
| 2026-09-03 |         | QA gate 3 FAIL (70/100) — convergence stall (HIGH 3/3/3). Third strike on the resume predicate; escalated to a human | qa-task |
| 2026-09-03 |         | QA gate 4 CONCERNS (85/100) — resume predicate and ingester contract replaced per operator decision; 0 HIGH. Follow-ups filed as tasks 85-87 | qa-fix |
| 2026-09-03 |         | Step 5c REQUEST CHANGES — 4 high-confidence trail findings; a self-upgrade of gate 4 was caught and withdrawn. Routing back to 5b, cycle 5 | review-pr |

---

## Progress Tracking

### Phase 1: The loop gains an exit gate
- [x] PASS/WAIVED arms repointed to 5c
- [x] §5c section with verdict routing
- [x] `ready-for-merge` moved behind the review
- [x] QA Cycle template carries a PR Review row

### Phase 2: Lock tolerates a third loop member
- [x] `review-pr` in the noop arm, covered by the shell test

### Phase 3: Contracts and templates
- [x] Resume contract, progress templates, lite mode, autonomous defaults, detector, banner

### Phase 4: Skill prose
- [x] develop-task, develop-story Step 5–6 + Related Skills
- [x] review-pr "Relationship to the develop pipelines" rewritten

### Phase 5: Tests
- [x] Protocol evals extended; routing parity test added; review-pr tests green

### Phase 6: Documentation, runbooks and diagrams
- [x] 3 diagrams re-drawn and validated
- [x] 7 runbooks updated
- [x] 8 reference/concept docs updated; `pipeline-artifacts.md:50` contradiction removed
- [x] CHANGELOG entry
- [x] Re-derivation greps clean; ruled-out hits named in the implementation report

### Phase 7: Bundle and regenerate
- [x] `npm run bundle` (develop-bug untouched), `npm run generate-catalog`

---

## References

- **The skill being wired in**: [`skills/review-pr/SKILL.md`](../../../skills/review-pr/SKILL.md) —
  see *Relationship to the develop pipelines*, which this task rewrites
- **The file that changes**:
  [`shared/resources/develop-pipeline-step-5-6-qa-loop.md`](../../../shared/resources/develop-pipeline-step-5-6-qa-loop.md)
  — *Outcome branching (shared)*
- **The contradiction**:
  [`docs/reference/pipeline-artifacts.md`](../../reference/pipeline-artifacts.md) line 50
- **Where the skill came from**:
  [`task.66.review-pr.md`](../task.66.review-pr/task.66.review-pr.md) — and its own dogfood report,
  `task.66.pr-review.1.review-pr.md`, which returned REQUEST CHANGES on PR #283
- **Why reading a skill is not testing it**:
  [`task.67.execute-the-skill-qa-gate.md`](../task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md)
- **What a held proof does not tell you**:
  [`task.76.mutation-proof-limits.md`](../task.76.mutation-proof-limits/task.76.mutation-proof-limits.md)
- **Why `npm test` alone is not the gate**:
  [`task.75.quality-gate-matches-ci.md`](../task.75.quality-gate-matches-ci/task.75.quality-gate-matches-ci.md)
- **Artifact grammar, already defined**:
  [`docs/standards/file-naming.md`](../../standards/file-naming.md) — `*.pr-review.{n}.{name}.md`

---

## Notes

### Important Reminders

- **Edit `shared/resources/`, never `skills/*/references/`.** The bundled copies are
  `AUTO-GENERATED`; a fix applied there is silently reverted by the next `npm run bundle`.
- **Do not renumber anything.** The whole design exists to avoid it. If a change starts touching
  `{N}/8` strings or the lock's `1..8` range, the approach has drifted.
- **Do not weaken `/review-pr`'s advisory contract.** It still writes no gate and never approves.
  The orchestrator acts on a verdict the skill merely reports — that distinction is the reason this
  wiring is legitimate, and its contract tests must stay green untouched.
- **Phase 6 is acceptance-gating.** Its criteria sit in §9 alongside the functional ones.

### Why High and not Medium

The conformance gap is not theoretical. The one time this instrument was pointed at a pipeline-built
PR, it returned REQUEST CHANGES and produced four tasks — one of which (67) closed a structural hole
that had let a broken skill ship `accepted`. Every run between now and this task landing is
unreviewed on the axis nothing else covers.

### Why the docs phase is unusually specific

Roughly fifteen documents restate pipeline behaviour independently, and no test catches a runbook
describing a shape that no longer exists. Naming files and line numbers here is not padding — it is
the difference between a sweep that is complete and one that is merely plausible. The re-derivation
greps exist because the enumeration will be stale by the time the task runs.
