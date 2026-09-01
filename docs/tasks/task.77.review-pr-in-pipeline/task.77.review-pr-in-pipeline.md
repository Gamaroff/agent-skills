---
id: task.77
title: "[Task 77] Run the PR conformance review before a work item is finalised"
type: task
description: "/review-pr runs two lenses; only one of them duplicates the pipeline. Its code lens is the same reviewer qa-story and qa-task already dispatch every cycle, but its conformance lens — does the diff deliver what the work item promised, and does the trail behind it hold up — has no counterpart anywhere in the pipeline. Wire it in as the exit gate of the Step 5–6 QA loop, where the trail it audits exists and an adverse verdict can still reach qa-fix."
tags: [pipeline, review-pr, qa, conformance, documentation]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-01
updated: 2026-09-01
assignee:
estimated_effort_hours: 10
---

# Technical Task: Run the PR conformance review before a work item is finalised

**Status:** Ready for Development

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
✅ **A `docs-pipeline` conflict tag** in the roadmap Legend

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
- [ ] Repoint the PASS and WAIVED arms of *Outcome branching (shared)* from
      "exit loop, proceed to Step 7" to "proceed to 5c"
- [ ] Add a **§5c — PR conformance review** section invoking
      `/review-pr --effort {medium|low} --comment` against the open PR
- [ ] Add the verdict branch: REQUEST CHANGES → 5b (increment the shared counter); APPROVE and
      CONCERNS → signal `ready-for-merge`, exit to Step 7
- [ ] Move the `ready-for-merge` stage block so it fires **after** 5c clears, not on the QA gate
- [ ] Add a **PR Review** row to the `### QA Cycle {N}` template
- [ ] Extend Loop Limit Escalation text to cover a loop exhausted by review verdicts

### Phase 2: The lock tolerates a third loop member

**Risk Level**: Low
**Files**: `shared/resources/advance-pipeline-lock.sh`, `advance-pipeline-lock.test.sh`

- [ ] Add `review-pr` to the noop arm: `qa-story|qa-task|qa-fix|review-pr) exit 0 ;;`
- [ ] Cover it in the shell test — a `--skill review-pr` call must leave `current_step` untouched

### Phase 3: Contracts and templates

**Risk Level**: Low

- [ ] `develop-pipeline-resume-contract.md` — Step 5–6 row: once the gate reads PASS/WAIVED,
      `*.pr-review.{n}.*.md` must also exist. Conditional, because a mid-loop resume on a CONCERNS
      gate legitimately has none
- [ ] `develop-pipeline-step-0-resolve-and-prepare.md` — both Pipeline Progress templates: add the
      report to the Step 5–6 row's Required Artifacts
- [ ] `develop-pipeline-lite-mode.md` — lite runs `/review-pr --effort low`; it never skips
- [ ] `develop-pipeline-autonomous-defaults.md` — the pipeline passes `--comment` explicitly,
      because `/review-pr` otherwise asks before posting and the pipeline cannot prompt. Already
      -authorised ground: Steps 5–6 and 7 both comment on the PR
- [ ] `pipeline-resume-detector-prompt.md` — 5c dispatches subagents, so it writes
      `.summaries/step-5-pr-review-{N}.json`. Step 5 is already non-exempt; the `[1, 2, 4, 8]` list
      is unchanged
- [ ] `develop-pipeline-remaining-work-banner.md` — the 5c cycle banner

### Phase 4: Skill prose

**Risk Level**: Low

- [ ] `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` — Step 5–6 section text and
      the Related Skills list gain `/review-pr`. **No `{N}/8` string changes**
- [ ] `skills/review-pr/SKILL.md` — rewrite *Relationship to the develop pipelines*, which currently
      states the opposite. Distinguish **writing a gate** (still never) from **being consulted by a
      pipeline** (now yes). Keep every advisory sentence intact

### Phase 5: Tests

**Risk Level**: Medium

- [ ] `evals/develop-{task,story}/protocol/pipeline-shape.test.mjs` — add `review-pr` to
      `EXPECTED_STEPS` between `qa-fix` and `finalise` (the test walks `indexOf` monotonically)
- [ ] `evals/develop-{task,story}/protocol/step-contract.test.mjs` — add a `review-pr` keyword to
      `STEP_KEYWORDS["5-6"]`
- [ ] **New** `evals/shared/tests/pr-review-loop-parity.test.mjs` — assert the routing literally:
      REQUEST CHANGES → 5b; APPROVE/CONCERNS → exit; `ready-for-merge` appears **after** the 5c
      section, not before; the 5-cycle bound covers 5c. No `package.json` edit needed —
      `evals/shared/tests/*.test.mjs` is already globbed
- [ ] `evals/shared/tests/transition-protocol-parity.test.mjs` — confirm the step-file → stage pair
      assertions still hold once `ready-for-merge` moves within the file
- [ ] `skills/review-pr/tests/review-pr.test.js` — update any assertion quoting the "do not call"
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
- [ ] `docs/runbooks/task-development.md` — numbered step table (L113–115, the `5–6` row) and skills
      table (L147–150): name `review-pr`, its verdict routing, its shared 5-cycle budget
- [ ] `docs/runbooks/story-development.md` — equivalent tables, plus the develop-next/develop-batch
      merge note at L223 (the PR they merge is now pre-reviewed)
- [ ] `docs/runbooks/qa-flow.md` — prose beyond the diagram: "Repeat until `PASS` or `WAIVED`" (L60)
      is no longer the exit condition; `review-pr` needs a section beside `qa-fix` and `qa-gate`,
      and an entry in Related skills (L88)
- [ ] `docs/runbooks/unattended-overnight-runs.md` — what one `/develop-next` iteration now includes
- [ ] `docs/runbooks/first-week/day-1-tasks.md` (L97), `day-2-stories.md` (L81) — the one-line
      pipeline shapes new developers read first
- [ ] `docs/runbooks/restricted-access.md`, `docs/concepts/restricted-access.md` — the review's PR
      comment is a VCS mutation and defers like any other

**Reference and concept docs**:
- [ ] `docs/reference/pipeline-artifacts.md` — **the direct contradiction**, line 50:
      `| — | review-pr (standalone — not a pipeline step) | …`. Also the Step→artifact table, the
      co-located tree diagrams (`← Step N` annotations must place the pr-review report), and the
      "Steps 5–6 loop up to 5 cycles" note
- [ ] `docs/operations/workflows.md` — story, task and both orchestrator chains
- [ ] `docs/reference/invocation.md` (L89, L98), `docs/reference/commands.md` (L20–24, L57–58)
- [ ] `docs/concepts/quickstart-story.md` (L131), `quickstart-task.md` (L94), `overview.md` (L100)
- [ ] `docs/reference/activation-phrases.md` — still user-invocable; note it now also runs
      automatically
- [ ] `docs/reference/skill-catalog.md` — **generated**; `npm run generate-catalog`, never hand-edit
- [ ] `CHANGELOG.md` — a release entry describing the new capability

**Re-derive the list before closing the phase** — the enumeration above is a snapshot, not an
inventory:

```bash
grep -rln "qa-fix\|qa-story\|qa-task" docs/ skills/*/README.md README.md
grep -rn "not a pipeline step\|standalone" docs/reference/ docs/concepts/
```

Every hit is updated or consciously ruled out, and the ruled-out ones are **named in the
implementation report**.

### Phase 7: Bundle and regenerate

- [ ] `npm run bundle` — verify propagation to develop-task and develop-story and **not** develop-bug
- [ ] `npm run generate-catalog` if any `description:` changed

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
- **`skills/develop-bug/SKILL.md`** and `develop-bug-step-5-6-verify-loop.md` — separate file
- **`package.json`** — the new test lands under an existing glob

---

## 8. Testing Strategy

### Structural checks

- [ ] `npm run bundle` leaves the tree clean; `git diff --stat skills/*/references/` shows
      develop-task and develop-story updated and develop-bug untouched
- [ ] `npx prettier --check` passes
- [ ] `npm test` **and** `npm run eval:all` — CI runs `format:check` + `npm test` + `eval:all`;
      running only `npm test` locally is the exact gap task 75 exists to close
- [ ] link-check passes against the **tracked** tree, not the working tree — working-tree checks
      miss `#anchors` and gitignored targets

### Execute the prose, do not only read it

**This is the lesson of task 67, learned from this very skill.** Every shell snippet added to §5c
runs under **both bash and zsh**. Task 66 shipped `accepted` past 2 QA cycles and 40 contract tests
with a glob returning 6 files under bash and 0 under zsh. Contract tests that assert what prose
*says* would pass that defect again.

### End-to-end dogfood

- [ ] `/develop-task` on a small task produces `task.{id}.pr-review.1.{name}.md` beside the QA report
- [ ] The QA Cycle entry carries the PR Review row
- [ ] Step 8's `grep -q "⏳ Pending"` assertion still finds nothing
- [ ] A forced REQUEST CHANGES routes back into `/qa-fix` and increments the shared counter
- [ ] One `/develop-next` run merges a PR that already has a pr-review report on disk — **with no
      orchestrator edit**

### Mutation Proving

Each behavioural claim gets a proof, per `shared/resources/mutation-proving.md`:

- [ ] Revert the PASS→5c repoint → `pr-review-loop-parity.test.mjs` goes red
- [ ] Revert the `review-pr` noop in `advance-pipeline-lock.sh` → its shell test goes red
- [ ] Move `ready-for-merge` back ahead of 5c → the ordering assertion goes red

Per task 76's guidance: a held proof is evidence about a test, not about the input space. An unheld
proof gets investigated — vacuous test, redundant source, or wrong premise — before any test is
strengthened.

---

## 9. Success Criteria

### Functional

- [ ] `/review-pr` runs in every `develop-task` and `develop-story` run once the QA gate reads
      PASS or WAIVED
- [ ] `REQUEST CHANGES` routes into `/qa-fix` and shares the 5-cycle budget
- [ ] `CONCERNS` records findings and does not block; `APPROVE` exits clean
- [ ] `ready-for-merge` fires only after the review clears
- [ ] A `*.pr-review.{n}.{name}.md` report lands beside the work item on every completed run
- [ ] Lite mode degrades to `--effort low` and never skips
- [ ] `/develop-next` and `/develop-batch` merge pre-reviewed PRs **with no orchestrator change**

### Documentation

- [ ] All three mermaid diagrams show the verdict branch and parse under `mermaid-architect`
- [ ] `docs/reference/pipeline-artifacts.md` no longer calls `/review-pr` "not a pipeline step",
      and its Step→artifact table places the report
- [ ] `docs/runbooks/{task,story}-development.md` step tables name the review and its routing
- [ ] `docs/runbooks/qa-flow.md` no longer presents the QA gate as the loop's exit
- [ ] A developer reading any single runbook end-to-end learns the review exists, what it decides,
      and what artifact it leaves
- [ ] The re-derivation greps return no un-triaged hit; ruled-out hits are named in the
      implementation report

### Regression

- [ ] The pipeline is still 8 steps; no `{N}/8` string changed; the lock still validates `1..8`
- [ ] `/review-pr` still writes no gate, never approves, never edits code — its advisory contract
      tests stay green and untouched
- [ ] `develop-bug` is byte-unchanged
- [ ] `transition-protocol-parity.test.mjs` still passes, including its `pr-merged`-fires-nowhere-else
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

## Change Log

| Date       | Version | Description                                                       | Author      |
| ---------- | ------- | ----------------------------------------------------------------- | ----------- |
| 2026-09-01 | 1.0     | Initial draft — wire /review-pr into the develop pipelines as 5c   | create-task |

---

## Progress Tracking

### Phase 1: The loop gains an exit gate
- [ ] PASS/WAIVED arms repointed to 5c
- [ ] §5c section with verdict routing
- [ ] `ready-for-merge` moved behind the review
- [ ] QA Cycle template carries a PR Review row

### Phase 2: Lock tolerates a third loop member
- [ ] `review-pr` in the noop arm, covered by the shell test

### Phase 3: Contracts and templates
- [ ] Resume contract, progress templates, lite mode, autonomous defaults, detector, banner

### Phase 4: Skill prose
- [ ] develop-task, develop-story Step 5–6 + Related Skills
- [ ] review-pr "Relationship to the develop pipelines" rewritten

### Phase 5: Tests
- [ ] Protocol evals extended; routing parity test added; review-pr tests green

### Phase 6: Documentation, runbooks and diagrams
- [ ] 3 diagrams re-drawn and validated
- [ ] 7 runbooks updated
- [ ] 8 reference/concept docs updated; `pipeline-artifacts.md:50` contradiction removed
- [ ] CHANGELOG entry
- [ ] Re-derivation greps clean; ruled-out hits named in the implementation report

### Phase 7: Bundle and regenerate
- [ ] `npm run bundle` (develop-bug untouched), `npm run generate-catalog`

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
