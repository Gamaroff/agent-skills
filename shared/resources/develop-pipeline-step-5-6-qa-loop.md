---
name: develop-pipeline-step-5-6-qa-loop
description: Steps 5–6 (QA loop) shared by develop-story and develop-task. Covers QA cycle counter setup, gate file location, qa-story/qa-task invocation (with lite mode directive), PASS/CONCERNS/FAIL branching, **Step 5c (the PR conformance review, `/review-pr`) as the loop's exit gate and its APPROVE/CONCERNS/REQUEST CHANGES verdict routing**, no-code-change HALT, qa-fix invocation, the convergence check (HIGH-count stall guard) and third-strike replace-don't-patch rule, the route classifier's Diminishing-returns (2), Cosmetic-residue (2b) and Gate-the-last-fix (2c) routes, the lock's `qa_phase` field (current_step stays 5 for the whole loop), one-commit-one-push-per-cycle, escalation entry template, and the loop-limit / not-converging HALT messages. Story vs task variants called out where they differ (skill names, file patterns, gate sort field, commit message format, escalation text).
---

# Develop Pipeline — Steps 5–6: QA Loop

## When This Document Applies

Loaded by `/develop-story` and `/develop-task` during Steps 5–6. Story/task variants are called out in labeled sub-sections where they differ.

---

## Loop Setup (shared)

This is the iterative heart of the pipeline. Maintain a **QA cycle counter** starting at 1. The loop limit is **`QA_MAX_CYCLES` complete cycles** — the lock's `qa_max_cycles` field when present, else **5**. The field is written only by a granted re-entry after a loop-limit halt (resume contract, **Re-entry after a QA loop escalation**; writer: `shared/resources/grant-qa-cycles.sh`), as `QA_CYCLE at resume + extra_cycles_granted` — relative to the count reconstructed from disk, never to 5, so a grant of `k` delivers `k` cycles whatever gates already exist:

```bash
QA_MAX_CYCLES=$(jq -r '.qa_max_cycles // 5' .claude/state/develop-pipeline.lock 2>/dev/null || echo 5)
```

Every "of 5" and "/5" in the strings below reads `QA_MAX_CYCLES`; the literal is the default, not the rule.

**A gate in the accepting-route set does not exit the loop — it hands to 5c.** A gate that reaches
5c (any of §5c's five routes) means the work is ready to be *reviewed as a PR*, not that the loop is over. 5c
(`/review-pr`) is the loop's exit gate, and its verdict can send the run back to 5b.

There are **five routes by which the loop reaches Step 7**, and all go through 5c — they are
§5c's accepting-route set: a gate with no open finding (route 1; `PASS`, or an active `WAIVED`, or —
route 3 — a `CONCERNS` whose queue is empty or all closed); from cycle 3 onward the
**Diminishing-returns exit** (route 2), which ends a loop whose HIGH findings are gone and whose
residue is entirely test machinery; from cycle 2 onward the **Cosmetic-residue exit** (route 2b),
which ends a loop whose HIGH findings are gone and whose `PASS` gate carries nothing but open LOW
entries; and, at the budget, the **Gate-the-last-fix half-cycle** (route 2c), which grants one
review + gate to a fix the last budgeted cycle landed and no gate has read — its gate reaches 5c
by the shape of route 1 or 3, and is named as its own route because of the moment it fires. None
of these is an exit *around* 5c: `APPROVE` or `CONCERNS` from 5c remains the only thing that opens
Step 7.

There are **two ways it escalates** instead: the 5-cycle limit, and — from cycle 3 onward — the
**Convergence check**, which halts the moment the loop stops reducing HIGH findings. The convergence
check usually fires first; see its section below. Both land in the same **Loop Escalation** block.

**The loop's four guards answer four different questions and must not be confused.** Two say the
loop *stopped* or *finished* working; one says what is left is not worth a cycle; one says the budget
ran out a gate too early. All four are predicates the engine evaluates
(`classifyLoopRoute()` in `qa-diminishing-returns.js` — the Convergence check is the one exception,
kept as the awk that predates the engine); none is evaluated by eye.

| Guard | Fires when | Outcome | Says |
| :-- | :-- | :-- | :-- |
| **Convergence check** (stall) | HIGH findings **remain and stop falling** for two cycles (cycle ≥ 3) | **Escalate** | the loop stopped working |
| **Diminishing-returns exit** (finished, route 2) | HIGH is 0 for two consecutive gates and the residue is **entirely test machinery** (cycle ≥ 3) | **Exit to 5c** | the loop finished working |
| **Cosmetic-residue exit** (cosmetic, route 2b) | HIGH is 0 for two consecutive gates and a **`PASS` gate's only open entries are LOW** (cycle ≥ 2) | **Exit to 5c** | what is left is not worth a fix cycle |
| **Gate-the-last-fix half-cycle** (budget, route 2c) | the budget is spent, the last gate raised no HIGH, MEDIUM fell strictly for three cycles, and the last cycle's fix has **no gate** | **One 5a, then 5c or escalate** | the budget ended one gate too early |

The stall and finished rows are the original pair and are still opposites: a run with HIGH
remaining can only stall; a run with HIGH gone can only finish. The cosmetic row is the finished
row's sibling for a residue that is not machinery but is also not work. The budget row is the only
one that fires *after* 5b rather than after 5a, and the only one that is not an exit.

### Lock position for the loop (option B — decided in task.123 review 1, Q2)

The pipeline lock's `current_step` reads **`5` for the whole loop** — 5a, 5b and 5c alike — and a
separate **`qa_phase: 5a|5b|5c`** field names the sub-step. `advance-pipeline-lock.sh` is
monotonic by design (`6 → 5` is refused, and must stay refused: the Stop hook's whole contract is
that the lock never points behind the work), and the loop's `5b → 5a` re-entry is a backward move,
so a step number cannot express it. A label can. **`advance-pipeline-lock.sh 6` is never called
inside the loop**, and no step of this document instructs a hand `jq` on `current_step`: the lock
goes `4 → 5` at the Step 4 → 5 transition and `5 → 7` at the Step 5–6 → 7 transition, both through
the orchestrator's ordinary Step Transition Protocol. Option A — teaching the helper a backward
move — was rejected because it would have given the lock two meanings for one field.

Each sub-step writes `qa_phase` as its **first action**, through the bundled writer — a **script**,
not a shell function, because every orchestrator Bash call is a fresh shell and a function defined
in one fenced block does not exist in the next (task.123 QA cycle 1, CR-2). It is the sibling of
`advance-pipeline-lock.sh`, uses the same `mktemp` + `mv` write, validates its one argument
against `5a|5b|5c`, fails closed on a non-object lock, noops with no lock, and never touches
`current_step`. Source: `shared/resources/set-qa-phase.sh`; suite: `set-qa-phase.test.sh`.

```bash
bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5a   # or 5b, 5c
```

The Stop hook (`develop-pipeline-on-stop.sh`) reads `qa_phase` on a step-5 lock to name `/qa-task`
(or `/qa-story`), `/qa-fix` or `/review-pr`; an **absent** `qa_phase` names 5a, the loud re-entrant
default. The halt snapshot is a superset of the lock, so `qa_phase` — and `extra_cycles_granted` /
`qa_max_cycles` above — travel into `develop-pipeline.last-halt.json` without a second writer.

Separately, several **HALT** paths end the run without reaching escalation: the no-code-change HALT
and the mid-loop PR MERGED/CLOSED HALT (both in 5b), the twice-red fast-gate bail-out (5b step 0a),
and a 5c review failure (see 5c's verdict table). These are terminal handovers to a person, not loop
exits, and they are listed where they occur rather than here.

#### develop-story

Each cycle = one `/qa-story` + one `/qa-fix`. A clean gate from `qa-story` hands to **5c**, which is what exits the loop.

#### develop-task

Each cycle = one `/qa-task` + one `/qa-fix`. A clean gate from `qa-task` hands to **5c**, which is what exits the loop.

### Signal the `in-qa` stage (when `TRACKER=jira` and `TRACKER_ISSUE` is set)

Run **once**, before the first cycle. Do **not** repeat this per cycle — the same rule the GitHub re-assertion below follows, for the same reason. (Re-running is harmless: the stage resolves to `already` and makes no network call. The reason to run once is that a per-cycle move says nothing a reader of the board cannot already see.)

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage in-qa --json
```

`in-qa` is **off by default**. A project turns it on in its workflow record (`jira.workflowRecord`), per issue type — most boards have no testing column, and a stage that moved cards into one uninvited would be worse than one that does nothing. Expect `reason: "stage-disabled"` until a project opts in; that is a success, not a warning.

Log in Decisions Log: "Jira {TRACKER_ISSUE} — in-qa: {landed status / disabled / skip reason}."

### Re-assert board status at QA start (when `TRACKER=github` and `TRACKER_ISSUE` is set)

Belt-and-suspenders: run **once**, before the first cycle, to re-assert the `in-review` moment on entering QA. Step 4 (create-pr) already performs this move; this re-assertion corrects the board if that move was skipped (e.g. transient API error). Skip silently if `TRACKER` is not `github` or `TRACKER_ISSUE` is empty. Do **not** repeat this per cycle.

```bash
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage in-review --json
```

Engine source: `shared/resources/gh-stage.js` (bundled into each skill as `references/gh-stage.js`).

Note the absence of `--allow-regress`, which is deliberate. **This re-assert is guarded.** A card someone has already advanced past review — to a showcase or merge column — will log `would-regress` and stay where it is. That is correct: the board is ahead of the pipeline, not behind it. Pass `--allow-regress` only for a deliberate reset.

A card already sitting on the review column returns `reason: "already"` and the CLI makes no mutation, so no hand-rolled "is it already there?" check is needed.

Log in Decisions Log: "GitHub board: QA-start re-assert → {landed / already / would-regress / no-option / skipped}."

---

## Finding the Latest Gate File

Use a format-agnostic regex to extract the numeric `{N}` from each filename, sort numerically, and pick the highest. Robust to story/task names that contain dots.

#### develop-story

```bash
find {story-directory} -maxdepth 1 -name "story.{epic}.{story}.gate.*.yml" 2>/dev/null \
  | awk -F'gate\\.' '{ split($2, a, "."); printf "%d\t%s\n", a[1], $0 }' \
  | sort -k1,1 -n | tail -1 | cut -f2-
```

#### develop-task

```bash
find {task-directory} -maxdepth 1 -name "task.{id}.gate.*.yml" 2>/dev/null \
  | awk -F'gate\\.' '{ split($2, a, "."); printf "%d\t%s\n", a[1], $0 }' \
  | sort -k1,1 -n | tail -1 | cut -f2-
```

The gate file pattern is `…gate.{N}.{name}.yml` — the awk splits on `gate.`, takes the first `.`-delimited token from the right side as `{N}`. Names containing dots (e.g. `auth.v2`) no longer affect ordering.

**Note (tasks only)**: The legacy path `docs/qa/gates/tasks/` is deprecated. qa-task v2.0 co-locates gate files in the task directory alongside the task document.

Read the gate file to determine the gate result.

---

## Each Cycle

### 5a. Run QA Review

**Lock**: `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5a` before anything else in this sub-step. `current_step` stays `5`.

> **When the work item's deliverable is runnable prose, the QA skill executes it.** A change set that
> adds or modifies a `SKILL.md` or a `shared/resources/*.md` prompt containing fenced ```bash blocks
> triggers an execution step inside the QA skill — `qa-task` **Step 4b**, `qa-story` **Phase 1.7** —
> which runs the documented snippets under both `bash` and `zsh` and reports disagreements.
>
> The rule lives in one place: `shared/resources/qa-runnable-prose-detection.md`. It is **not** restated
> here, and this orchestrator does nothing to trigger it — the QA skills own both the detection and the
> execution. This note exists so a reader of the pipeline knows the step is there, and knows where the
> rule is when a QA cycle reports a shell disagreement.


#### develop-story

**Pre-step: Dispatch traceability mapper (standard mode only)**

Before invoking `/qa-story`, dispatch the QA traceability mapper as an Explore subagent (see `shared/resources/qa-traceability-mapper-prompt.md` for the full execution protocol). Mark the wait beside the dispatch — `bash .agents/skills/develop-story/references/set-waiting-on.sh "step-5 traceability mapper"` — and `… --clear` once its confirmation is read (task.124):

```
Agent(subagent_type="Explore", prompt="Run the QA traceability mapper (shared/resources/qa-traceability-mapper-prompt.md).
Inputs:
  STORY_FILE={story-file}
  STORY_DIR={story-directory}

Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation.")
```

`{story-file}` and `{story-directory}` are the story file path and story directory path resolved in Phase 0a.

After the subagent completes:

1. Confirm `{story-directory}/.summaries/qa-traceability-matrix.md` was written.
2. Write the summary JSON artifact to `{story-directory}/.summaries/step-5-traceability-mapper.json` (schema: `shared/resources/subagent-summary-artifact.md`).
3. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the JSON path.

If the subagent fails or the matrix file is absent: log warning in Issues Log and proceed without the matrix (qa-story falls back to internal mapping).

Skip this pre-step when any of:

- `PIPELINE_MODE=lite` — the mapper adds overhead that lite mode trades away.
- Story has **no Acceptance Criteria section** (`grep -ciE '^##+ +acceptance criteria' {story-file}` returns 0). Nothing to map.
- Story has **≤ 2 ACs** (count `^- ` or `^[0-9]+\.` lines under the AC heading). The mapper's overhead exceeds its value at this size; qa-story's internal mapping is sufficient.

Log the bypass reason in the Decisions Log (`Traceability mapper skipped: {reason}`).

**Invoke `/qa-story`**

Invoke the `/qa-story` skill with the story file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This story is running in lite mode."

**Code-review-and-fix loop (pipeline default).** Always pass the run-level override `code_review_blocking=true`. This makes the diff code review qa-story already runs (Phase 1.6) gate the build on high-confidence correctness bugs, which then flow into this loop's qa-fix step (5b) and get fixed and re-reviewed each cycle. A story opts **out** with `code_review_blocking: false` in its frontmatter (escape hatch) — the override never overrides an explicit `false`. See the **Opt-in to blocking** resolution matrix in `shared/resources/code-review-prompt.md`.

Pass args as space-separated `key=value` tokens. When the traceability matrix was generated:

```
Skill(qa-story, args="traceability_matrix={story-directory}/.summaries/qa-traceability-matrix.md code_review_blocking=true")
```

If the matrix was not generated (lite mode or mapper failure), omit only the `traceability_matrix` token — still pass `code_review_blocking=true` so the code-review-and-fix loop stays active:

```
Skill(qa-story, args="code_review_blocking=true")
```

#### develop-task

**Pre-step: Dispatch traceability mapper (standard mode + Success Criteria table only)**

Conditions to dispatch the mapper for tasks (all must be true):

1. `PIPELINE_MODE = standard` (lite mode skips the mapper)
2. `HAS_SUCCESS_CRITERIA_TABLE = true` (set by Phase 0a Agent 3 — the lite-mode/always-load detector)

If both are true, dispatch the mapper as an Explore subagent — same prompt as develop-story, but pass the **task** file/directory as the values for `STORY_FILE`/`STORY_DIR` (the mapper accepts both doc types — see `qa-traceability-mapper-prompt.md` "Doc type" note). Mark the wait beside the dispatch — `bash .agents/skills/develop-task/references/set-waiting-on.sh "step-5 traceability mapper"` — and `… --clear` once its confirmation is read (task.124):

```
Agent(subagent_type="Explore", prompt="Run the QA traceability mapper (shared/resources/qa-traceability-mapper-prompt.md).
Inputs:
  STORY_FILE={task-file}
  STORY_DIR={task-directory}

Follow the Execution Protocol exactly. Write the matrix file and return a one-line confirmation.")
```

After the subagent completes:

1. Confirm `{task-directory}/.summaries/qa-traceability-matrix.md` was written.
2. Write the summary JSON artifact to `{task-directory}/.summaries/step-5-traceability-mapper.json` (schema: `shared/resources/subagent-summary-artifact.md`).
3. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the JSON path.

If the subagent fails or the matrix file is absent: log warning in Issues Log and proceed without the matrix (qa-task falls back to its internal mapping).

Skip this pre-step when `PIPELINE_MODE=lite` OR `HAS_SUCCESS_CRITERIA_TABLE=false`. Tasks with no Success Criteria table (e.g. pure infra cleanup) gain nothing from the mapper.

**Invoke `/qa-task`**

Invoke the `/qa-task` skill with the task file path. If `PIPELINE_MODE=lite`, prefix the invocation with explicit context: "Use **direct tools only** for this review — skip parallel agents regardless of the adaptive strategy decision. This task is running in lite mode."

**Code-review-and-fix loop (pipeline default).** Always pass the run-level override `code_review_blocking=true`. This makes the diff code review qa-task already runs (Step 3b) gate the build on high-confidence correctness bugs, which then flow into this loop's qa-fix step (5b) and get fixed and re-reviewed each cycle. A task opts **out** with `code_review_blocking: false` in its frontmatter (escape hatch) — the override never overrides an explicit `false`. See the **Opt-in to blocking** resolution matrix in `shared/resources/code-review-prompt.md`.

Pass args as space-separated `key=value` tokens. When the traceability matrix was generated:

```
Skill(qa-task, args="traceability_matrix={task-directory}/.summaries/qa-traceability-matrix.md code_review_blocking=true")
```

If the matrix was not generated (lite mode, no Success Criteria table, or mapper failure), omit only the `traceability_matrix` token — still pass `code_review_blocking=true` so the code-review-and-fix loop stays active:

```
Skill(qa-task, args="code_review_blocking=true")
```

### Change Log (shared — who writes what)

Two skills write rows across this loop, and **this step document writes none**. It states the
contract; the skills perform the writes. Canonical format:
[document-change-log.md](document-change-log.md).

| Writer     | When                          | Row                                                     |
| ---------- | ----------------------------- | ------------------------------------------------------- |
| `qa-story` / `qa-task` | each QA cycle, alongside its QA Results section | `\| 2026-05-14 \|  \| QA gate CONCERNS (6/10) — 2 findings \| qa-story \|` |
| `qa-fix`   | on **exiting** the fix loop   | `\| 2026-05-14 \|  \| QA findings fixed — gate PASS (9/10), 2 iterations \| qa-fix \|` |

Three rules make this loop's history readable rather than a churn log:

- **`Version` stays blank.** Only `/finalise` bumps it, at acceptance.
- **`qa-fix` writes once per loop exit, not once per finding or per cycle.** Put the iteration
  count in the Description. The per-cycle detail already lives in the QA Iteration History section
  of the implementation report, which is its proper home.
- **`qa-gate` writes nothing to the document — ever.** It owns the `.yml` and only the `.yml`.
  The verdict row is written by `qa-story` / `qa-task`, which already own document sections. See
  [`docs/reference/anti-patterns.md`](../../docs/reference/anti-patterns.md).

A QA cycle that finds nothing still writes its verdict row: the verdict is the event being
recorded, not the findings.

### Outcome branching (shared)

After completion, find and read the latest gate file. **One definition governs every arm below:** an
entry in `top_issues[]` is **open** when its `status:` is absent or reads `open`; a gate has **no open
entry** when the list is empty **or** every entry reads `status: closed`. The arms are the
**accepting-route set** §5c enumerates, stated here as the router and there as the receiver; every
other document that needs the set points at §5c rather than restating the tokens. **The mechanical
record that a gate reached 5c** is the cycle's `### QA Cycle {N}` entry in QA Iteration History: 5a
writes `**Action**: Proceeding to 5c (PR conformance review)` on every accepting route and
`Running qa-fix (cycle {N} of {QA_MAX_CYCLES})` on the road to 5b, so a consumer that must decide "did gate N reach
5c?" reads that row rather than re-deriving the set from the gate. **The row is written when the
route is known, not when the entry is opened**: the entry is created as soon as the gate is read, but
arms 4–5 run the Convergence check and then the route classifier (the Diminishing-returns exit and
the Cosmetic-residue exit) first, and only their outcome decides between 5c and 5b. So the rule is a **post-guard write**: once the arm resolves — directly for
arms 1–3, after both guards for arms 4–5 — overwrite `**Action**` with the destination and `**PR
Review**` with `pending — 5c not yet run` (for 5c) or `not reached — gate did not exit the loop` (for
5b). The arm has a third resolution: when the Convergence check trips, the run leaves the loop
without reaching 5c, and the same write puts `**Action**: Escalating — loop not converging` and
`**PR Review**: not reached — gate did not exit the loop` on the row. The Diminishing-returns exit's
own `On exit` list repeats this as its first step so a run that takes route 2 cannot leave the row at
its 5b value, and the Cosmetic-residue exit's does the same for route 2b. The arm has a fourth
resolution, written by Loop Escalation's **Loop limit** trigger on **every** path it takes: it puts
`**Action**: Escalating — loop limit reached` on the entry of the **last cycle that ran** — cycle
`{N}` when the half-cycle was declined, cycle `{N+1}` when the half-cycle ran and its gate has an
open entry — and **never touches the `**PR Review**` row** (on an entry whose gate never reached 5c
it already reads `not reached — gate did not exit the loop`, written when the entry was opened). On the loop-limit-via-review
path cycle `{N}`'s gate *did* reach 5c and its row holds a real `REQUEST CHANGES`; that verdict is
what the escalation template's "Step 5c returned REQUEST CHANGES on cycle(s) {list}" line and the
resume contract's escalation row read, and the Action write must not blank it (task.123 QA cycle 3,
CR-1). A loop-limit escalation therefore always leaves the same Action signal the Convergence trip
leaves, and a resume reads it from the last entry's Action row rather than from which route happened
to run (task.123 QA cycle 2, CR-4). The row's value set is exactly `{Proceeding to 5c
(PR conformance review), Running qa-fix (cycle {N} of {QA_MAX_CYCLES}), Escalating — loop not converging, Escalating — loop limit reached}`.

- `PASS` with **no open entry in `top_issues[]`** → **proceed to 5c** (the loop's exit gate), not straight to Step 7
- `WAIVED` with `waiver.active: true` and a documented reason/approver → **proceed to 5c** (finalise treats `WAIVED` as accept-eligible; re-running qa-fix would churn against an intentionally-waived gate)
- `CONCERNS` with **no open entry in `top_issues[]`** — the list is empty, or every entry reads
  `status: closed` → **proceed to 5c** (the loop's exit gate). This is §5c's **route 3**, and it is
  legitimate by construction: gate rule 4 makes any NFR-level `CONCERNS` a CONCERNS gate with an
  empty queue. 5b would have nothing to act on — its no-code-change HALT fires on a gate that says
  "fine, with reservations" (task.105, obs #51).
- `FAIL`, or `CONCERNS` with an **open entry in `top_issues[]`** (an entry whose `status:` is absent
  or reads `open`) → run the **Convergence check** (below); if it does not trip, run the
  **route classifier** (below that — the **Diminishing-returns exit**, then the **Cosmetic-residue
  exit**). Proceed to 5b only when none fires — the Convergence check escalates, the two exits hand
  to 5c. (The Cosmetic-residue exit is PASS-only, so on this arm only the Diminishing-returns exit
  can fire; the classifier is still asked once, as one call, so the arm cannot drift from the next.)
- **Any other gate — read by its queue.** With an open entry in `top_issues[]` — a `PASS` carrying open LOW entries
  (legal under gate rule 5, which lets LOW findings ride on a passing verdict), or a `WAIVED` whose
  `waiver.active` is not `true` and whose queue has an open entry → the same road as the `FAIL` arm:
  Convergence check, then the route classifier, then 5b. **This is the arm the Cosmetic-residue exit
  (route 2b) lives on**: a `PASS` whose open entries are all LOW, after two HIGH-0 gates, hands to 5c
  from here instead of spending a fix cycle on nits (task.110 ran cycles 12–13 for two; obs #100). The queue is what `/qa-fix` consumes,
  and an open LOW is still open work; a waiver that is not active has waived nothing, so its gate is
  read by its queue like any other — which also means a `WAIVED` whose `waiver.active` is not `true`
  **and** whose queue has no open entry → **proceed to 5c**, exactly as a `PASS` with no open entry
  does.
- A gate that matches **none** of the arms above is malformed, not a route — a `gate:` that reads
  none of the four tokens, or a `top_issues[]` that cannot be parsed well enough to say whether an
  entry is open. **HALT** and surface the file rather than routing it anywhere. (A `PASS` with an
  open HIGH entry is *not* this case: it is caught by the arm above and sent to 5b, where `/qa-fix`
  reads the entry — the gate writer's mistake becomes a fix cycle, not a halt.) The five arms are meant to be exhaustive over `{PASS, WAIVED, CONCERNS,
  FAIL} × {no open entry, open entry}`, and `evals/shared/tests/pr-review-loop-parity.test.mjs` pins
  that; a gate this arm catches is a bug in the gate writer.

> **5b is entered on an open finding, never on the verdict token.** The token says how worried QA
> is; the queue says whether there is anything to fix; and `/qa-fix` consumes the queue. A router
> that keys on the token sends a reservation to a fix loop, which then halts on "nothing to fix" —
> the same substitution `develop-next`'s merge gate made in the other direction (task.113). `FAIL`
> is the one token that always routes to 5b: gate rules 1 and 3 produce it only from a HIGH entry or
> a failing NFR, so a `FAIL` gate is a fix queue by definition — and a `FAIL` whose `top_issues[]` is
> empty names its failure in the QA report's NFR section, which the findings ingester also reads.

**On any gate that reaches 5c**, commit this cycle's gate `.yml` and QA report `.md` and push once
before invoking `/review-pr` — there is no `fix(...)` commit on this path to carry them, and 5c reads
the artifact trail off the branch. See **Where the gate and QA report get committed** in 5b.

> **A clean gate no longer exits the loop on its own.** It hands to **5c**, which runs
> `/review-pr` over the open PR and is the only thing that can exit to Step 7. The
> `ready-for-merge` stage moved there with it: signalling merge-readiness the moment the gate
> read PASS advertised a card as mergeable while the run could still loop back into `/qa-fix`.

Log the result in the QA Iteration History section:

```
### QA Cycle {N} — {YYYY-MM-DD}
**Gate Result**: {PASS / CONCERNS / FAIL / WAIVED}
**Issues Found**: {count and brief descriptions, or "none"}
**HIGH findings**: {HIGH_N}
**MEDIUM findings**: {MEDIUM_N}
**PR Review**: {pending — 5c not yet run / APPROVE / CONCERNS / REQUEST CHANGES / review failed / not reached — gate did not exit the loop}
**Loop exit**: {n/a — this exit not taken / the `describeLoopRoute()` message verbatim}
**Action**: {Proceeding to 5c (PR conformance review) / Running qa-fix (cycle N of {QA_MAX_CYCLES}) / Escalating — loop not converging / Escalating — loop limit reached}
```

A cycle written by the **gate-the-last-fix half-cycle** (route 2c, Loop Escalation) uses the same
template with one extra row directly under the heading — `**Half-cycle**: gate-the-last-fix (review +
gate on cycle {N}'s fix; no 5b)` — and an entry back-filled on resume for a cycle the operator ran
outside the loop carries `**Origin**: run outside the loop (operator)` in the same position (resume
contract, **Re-entry after a QA loop escalation**). Neither row appears on an ordinary cycle.

The `**HIGH findings**` line is not decoration: it is the persisted sequence the **Convergence
check** below compares across cycles, and the only place a resumed run can read the earlier counts
back from. Write it on every cycle, including one that found none (`0`). `**MEDIUM findings**` is
the same kind of row for the **Gate-the-last-fix half-cycle** (route 2c), which needs three MEDIUM
readings to see a strictly falling sequence; it is the engine's count (`countRaised()`, Convergence
check step 2), written every cycle, `0` included.

`**PR Review**` follows the same rule for the same reason, but note **who writes it and when**: 5a
writes the row when it writes the entry, and at that moment no 5c verdict exists. On any gate that
routes to 5c (any of §5c's five routes) 5a writes `pending — 5c not yet run`, and **5c overwrites it** with its verdict. A cycle whose gate never
reached 5c keeps `not reached — gate did not exit the loop`. It is never omitted. An omitted row is
indistinguishable from a review that was skipped, and on resume the two must not be confused.

`**Loop exit**` is the record of the **route classifier**'s exits — the Diminishing-returns exit
(route 2), the Cosmetic-residue exit (route 2b) and the Gate-the-last-fix half-cycle (route 2c) —
and it exists for one reader: whoever opens this history six months from now and has to tell a
clean early exit from a stall. On every cycle that took none of them it reads `n/a — this exit not
taken`, which is a claim rather than a gap. On the cycle that did, write `describeLoopRoute(r)`
**verbatim** (for route 2 that is the `describeDiminishingReturns()` text, unchanged) — the message
is a function precisely so that what lands here is assertable rather than composed afresh each time.

> **The default says "this exit not taken", not "loop continued".** Those are different claims, and
> the second is false on the cycle where a clean `PASS` gate hands to 5c and 5c returns APPROVE: the
> loop did not continue there, it exited by the ordinary route. A row whose whole purpose is letting a
> reader distinguish two exits must not itself assert something untrue about one of them.

**The per-cycle gate comment is posted by the QA skill itself** (`qa-task` / `qa-story` Step 13b,
stage `qa-gate-{N}`, suffixed with the cycle it derives from the gate filename). The orchestrator
posts nothing to the tracker issue here. This step used to carry its own `qa-cycle-{N}` block for
the same moment; it was never observed posting, and once the skill's stage is cycle-scoped the two
would race for one marker — whichever posted first would win and the other would silently read
`already` (task.121). `qa-cycle` stays in the engine for `develop-bug`'s verify loop, which never
runs `qa-task` / `qa-story` and so posts it as its only per-cycle *gate* comment (it does run
`/qa-fix` on a FAIL cycle, whose own per-cycle comment is a separate concern — see the
follow-up named in task.121's PR review).

**Remaining Work Status block (required, per cycle).** Before re-invoking the QA skill for the next cycle, emit the block with the position line `Steps 5–6/8 — QA LOOP ⏳ in progress, cycle {N}/5`. On the cycle that exits the loop, the block is emitted as part of the Step 7 transition instead, in the form 5c specifies (`Steps 5–6/8 — QA LOOP ✅ complete ({N} cycles, {gate}, PR review {verdict})`). Format: [`shared/resources/develop-pipeline-remaining-work-banner.md`](develop-pipeline-remaining-work-banner.md).

A cycle that reaches 5c emits **two further blocks**, both instructed in 5c below: one immediately
before `/review-pr`, and one on the REQUEST CHANGES arm before re-entering 5b. Ownership of the
Steps 5–6 progress blocks is therefore: this paragraph owns the per-cycle one, **5c owns those
two**, and the Step 7 transition owns the exit one. The banner's **HALT** row is additional to all
of them and fires wherever these steps halt — 5c's `review failed` arm, 5b's step-0 no-change HALT,
and Loop Escalation included. Do not read the progress blocks as an exhaustive list of the blocks
Steps 5–6 emit.

### Convergence check (shared) — the QA loop's stall guard

Perform this check **after the cycle's gate file has been written and read (5a), before entering
5b**. A gate that hands to 5c (any arm of the accepting-route set above, §5c routes 1 and 3 — routes 2 and 2b are decided *after* it) skips it — the gate is accept-eligible, so there is
nothing for a stall guard to act on. (Note this is *not* because the HIGH count is zero: a `WAIVED`
gate carries its HIGH `top_issues[]` with `waiver.active: true`, so that cycle's
`**HIGH findings**` line is still a real, usually non-zero, count.)

> **A `REQUEST CHANGES` re-entry into 5b is deliberately not convergence-checked.** The guard measures
> whether the *gate's* HIGH count is still falling, and a review-driven cycle produces no gate reading
> to compare. The 5-cycle limit is what bounds that path — which is why 5c consumes cycles from the
> shared budget rather than running outside it. There is no separate cycle entry to write: because 5c
> defers the increment to 5b step 7, the review-driven fix rides **inside cycle N**, whose
> `### QA Cycle {N}` entry already carries the real `**HIGH findings**` count from that cycle's gate.
> Leave it as written — do not overwrite a real reading with `n/a`.

The Step 3 develop loop halts when it stops making progress (`develop-pipeline-resume-contract.md`
→ **Develop Loop — Stall Semantics and MAX_ITER Bound**). This is the same guard for the QA loop,
and it reads the same way on purpose: define progress, and halt when a cycle produces none. Without
it the QA loop always runs its full five cycles. One observed task produced HIGH counts of
`7, 7, 7, 7, 4` across five gates — four consecutive cycles that reduced nothing — and nothing in
the pipeline noticed.

1. **Count the HIGH findings the latest gate raised.** Count every entry in `top_issues[]` whose
   `severity` is `high`. Call it `HIGH_N`.

   ```bash
   HIGH_N=$(awk '
     /^top_issues:/         { ti=1; next }
     ti && /^[^[:space:]#]/ { ti=0 }
     !ti                    { next }
     { ind = match($0, /[^ ]/) - 1 }
     /^[[:space:]]*-[[:space:]]/ {
       if (!seen) { base = ind; seen = 1 }        # first entry sets the entry indent
       if (ind == base) { n += hi; hi = 0 }       # a dash at that indent starts a new entry
     }
     seen && (ind == base + 2 || ind == base) && /severity:[[:space:]]*["'"'"']?high/ { hi = 1 }
     END { n += hi; print n+0 }
   ' "$LATEST_GATE")
   ```

   **Count what the gate raised, not what is still open — do not exclude `status: closed`.** The
   QA skills update a gate *in place* after its cycle's fixes land, stamping `status: closed` and
   `fixed_date` on each resolved entry. Every mature gate therefore has most of its HIGH entries
   closed, and a counter that skips them reads `0` on all of them, compares `0 >= 0 >= 0`, and
   trips on cycle 3 of every run — or, read the other way, measures nothing at all. Verified
   against five real gates: the raised counts are `7, 7, 7, 7, 4` while the closed-excluded counts
   are `7, 0, 0, 0, 0`. `HIGH_N` is the review's verdict at the moment it was written, which is the
   only reading that makes the sequence comparable across cycles.

   **Both indent rules are load-bearing, and each closes a way the simpler versions were fooled.**
   Gate entries carry multi-line `finding: >-` block scalars, so (a) a wrapped line beginning with
   `- ` splits one entry into two unless entry boundaries are pinned to the *first* entry's indent,
   and (b) a `severity: high` written inside that prose is counted as a finding unless `severity:`
   is required at the entry's own key indent (`base + 2`, or `base` for the inline
   `- {severity: high}` form). Scoping to the `top_issues:` block additionally keeps a top-level or
   sibling key from inflating the count. The pattern deliberately carries **no `\b` word
   boundary** — that is a GNU extension, and the one-true-`awk` shipped on macOS silently matches
   nothing with it, which would report every gate as `HIGH_N=0` and disarm this guard without ever
   failing. Verified under both `bash` and `zsh` against the five real gate files of the observed
   task (`7, 7, 7, 7, 4`) and against a fixture carrying every decoy above.

2. **Keep the sequence across cycles.** Record `HIGH_N` in this cycle's QA Iteration History entry
   as `**HIGH findings**: {HIGH_N}` — that entry is what a resume reads the earlier counts back
   out of, and what the escalation entry tabulates. Record `MEDIUM_N` beside it as
   `**MEDIUM findings**: {MEDIUM_N}`, from the engine rather than a second awk:

   ```bash
   MEDIUM_N=$(command node -e '
     const { countRaised } = require("./.agents/skills/{develop-story|develop-task}/references/qa-diminishing-returns.js");
     const c = countRaised(require("fs").readFileSync(process.argv[1], "utf8"));
     console.log(c === null ? 0 : c.medium);
   ' "$LATEST_GATE")
   ```

   `countRaised` applies the awk's own rules — count what the gate *raised*, `status: closed`
   included, entry boundaries at the first entry's indent, `severity:` at the entry's key indent —
   and deliberately does not count HIGH: the HIGH count stays the awk's (engine property 2), so the
   two guards can never disagree about it.

3. **From cycle 3 onward, if `HIGH_N > 0` AND `HIGH_N >= HIGH_{N-1}` AND `HIGH_{N-1} >= HIGH_{N-2}`
   — i.e. HIGH findings *remain* and the count has failed to strictly decrease across two
   consecutive cycles — the loop is not converging. Stop and escalate.** Do not run 5b. Go to
   **Loop Escalation** below and use the *QA Loop Not Converging* variant.

   **`HIGH_N > 0` is a precondition, not a refinement.** The check exists to catch a loop that
   *fails to reduce* HIGH findings; a sequence with none has nothing to reduce. Without the
   precondition the formula reads a flat `0, 0, 0` as `0 >= 0 AND 0 >= 0` — true — and escalates a
   loop whose remaining findings are all medium or low, which is a loop that is *working*. That is
   exactly the sequence task.110 produced at cycle 3 (obs #71, #77), and the prose two paragraphs
   up already excluded it; the formula did not. State the precondition in the check itself so a
   reader implementing the formula cannot drop it.

   Cycles 1 and 2 never trip it: the rule needs three readings to see a flat line, and a single
   flat cycle is normal.

   Worked examples — the second is the one the rule must **not** match:

   | Sequence (oldest → newest) | Trips? | Why |
   |---|---|---|
   | `7, 7, 7` | yes, at cycle 3 | `7 > 0`, `7 >= 7`, `7 >= 7` — two flat cycles with HIGH findings remaining |
   | `0, 0, 0` | **no** | `HIGH_N = 0`: nothing to reduce; the loop routes on the open queue (medium/low) instead |
   | `3, 0, 0` | no | `HIGH_N = 0` |
   | `2, 2, 1` | no | `1 >= 2` is false — the count fell |

   On the observed `7, 7, 7, 7, 4` sequence this trips at the end of cycle 3 — `7 >= 7` and
   `7 >= 7` — cutting three futile cycles.

**Escalate; do not silently accept.** The remaining HIGH findings are not noise to be dropped
because the loop got tired of them. On the observed task a genuine defect in the *shipped* artifact
surfaced only at cycle 5, and it had been present in the original commit; any rule that quietly
exits early loses it. Escalation hands the residual to a person **together with the evidence that
the loop had stopped working**, which is the project's Fail Loudly rule and the entire point of
this check. A convergence stall is never a reason to write a PASS, to waive, or to proceed to
Step 7.

### Diminishing-returns exit (shared) — the QA loop's clean early exit

Perform this check **after** the Convergence check above, in the same place: the cycle's gate has
been written and read (5a), and 5b has not been entered. It runs **only when the Convergence check
did not trip**, and only from **cycle 3 onward**.

The two guards answer opposite questions and must never both claim the same run:

| | Convergence check (above) | Diminishing-returns exit (here) |
| :-- | :--- | :--- |
| Fires when | HIGH findings **remain and stop falling** | HIGH findings are **gone**, and the residue is machinery |
| Outcome | **Escalate** — the loop stopped working | **Exit cleanly** — the loop finished working |
| Because | a real blocker is unfixed | nothing is blocked; further cycles refine the pins |

Escalating a run with zero HIGH would misreport finished work as stalled, and the Fail Loudly rule
cuts the other way here: what is loud is the *record*, not the halt.

**The conditions.** Ask the engine; do not evaluate them by eye. This one call is the **route
classifier** for the whole post-Convergence moment: it evaluates the Diminishing-returns exit
(route 2) first and the Cosmetic-residue exit (route 2b, next section) second, and returns **one**
route, so the two exits cannot be asked in different orders by different readers. Its inputs are
bound as follows — an orchestrator that cannot resolve one of them has not met the precondition for
running the check at all, and should continue into 5b rather than guess:

| Variable | Where it comes from |
| :--- | :--- |
| `$CYCLE` | the QA cycle counter from **Loop Setup** — the cycle whose gate was just written |
| `$HIGH_SEQUENCE_JSON` | the `**HIGH findings**` rows of the `### QA Cycle {N}` entries in QA Iteration History, oldest first, as a JSON array. This is the Convergence check's own recorded sequence; do **not** recount it from the gates |
| `$LATEST_GATE` | the gate path resolved in **Loop Setup** (`…gate.{N}.{name}.yml`, highest `{N}`) |
| `$TEST_ARTIFACT_GLOBS_JSON` | `qa.testArtifactGlobs` from the consumer's `skills-config.yaml`, as a JSON array. **Absent ⇒ `[]`**, which matches nothing and is why an unconfigured project never takes this exit |

```bash
ROUTE_JSON=$(command node -e '
  const fs = require("fs");
  const { classifyLoopRoute, describeLoopRoute } =
    require("./.agents/skills/{develop-story|develop-task}/references/qa-diminishing-returns.js");
  const r = classifyLoopRoute({
    cycle:              Number(process.argv[1]),
    highCounts:         JSON.parse(process.argv[2]),
    latestGateContent:  fs.readFileSync(process.argv[3], "utf8"),
    testArtifactGlobs:  JSON.parse(process.argv[4]),
    budgetSpent:        false,
  });
  console.log(JSON.stringify({ ...r, message: describeLoopRoute(r) }));
' "$CYCLE" "$HIGH_SEQUENCE_JSON" "$LATEST_GATE" "$TEST_ARTIFACT_GLOBS_JSON")
ROUTE=$(printf '%s' "$ROUTE_JSON" | jq -r '.route')
```

Engine source: `shared/resources/qa-diminishing-returns.js` (bundled into each skill as
`references/qa-diminishing-returns.js`). It is a **library, not a CLI** — deliberately, on the same
reasoning as `review-report-freshness.js`: its only callers are this gate and Loop Escalation, and a
CLI would be a second interface to keep honest. `classifyDiminishingReturns` is still exported and
still the predicate for route 2; `classifyLoopRoute` wraps it. Its fixture table —
`qa-loop-route.test.mjs`, beside the engine's own suite under `tests/` — is the spec these sections are written from.

It returns `{route, reason, detail, findings, …}` with
`route ∈ {diminishing-returns, cosmetic-residue, gate-the-last-fix, continue}`. Here, with
`budgetSpent: false`, only the first two exits and `continue` can come back (`gate-the-last-fix`
is Loop Escalation's, and the engine returns it only when told the budget is spent). **Only an exit
route exits.** `continue` continues into 5b exactly as today; its `reason` names which condition
stopped each exit, and is what to write in the Issues Log if the loop later escalates.

What it evaluates, stated so the JSON's `reason` values are readable:

1. `HIGH_N == 0` **and** `HIGH_{N-1} == 0` — two consecutive gates with no blocker. **`HIGH_N` is
   the number the Convergence check already computed**, passed in from this cycle's and the previous
   cycle's `**HIGH findings**` lines in QA Iteration History. It is not recounted here: a second
   implementation of one count drifts silently, and the two guards would then disagree about the same
   run while each looked right alone. One quiet cycle is normal and is not enough.
2. **Every** `top_issues[]` entry in the latest gate names a `file:` that matches
   `qa.testArtifactGlobs`. A finding with **no** `file:`, or one the globs do not match, **fails**
   the condition — the exit is opt-in on positive evidence, never on absence. This is the same
   `file:` the third-strike rule already depends on.
3. No positive signal that product behaviour is implicated: every `nfr_validation.*.status` reads
   `PASS`, and no entry declares `category: bug` against a non-machinery path. Condition 3 reads a
   **different part of the gate** from condition 2, and that independence is the point — it is what
   catches a product defect filed against the test that found it.

> **Condition 3 and the `category:` field.** No gate in this corpus carries `category:` — real
> entries carry `id`, `severity`, `file`, `finding`, `suggested_action`, `suggested_owner`, `status`.
> A rule requiring a field nothing emits would be unreachable, which is not conservative but dead,
> and indistinguishable from broken. So `nfr_validation` carries condition 3 today and `category:` is
> honoured as an optional refinement for the day a QA skill starts emitting it.
>
> Note the asymmetry with condition 2, which is deliberate: condition 2 wants positive evidence that
> every finding **is** machinery, so absence fails it; condition 3 asks whether any finding **is** a
> product defect, so only positive evidence fails it. Demanding proof of a negative there would make
> every gate fail, which is the dead rule again.

**A gate with no findings at all does not take this exit.** Condition 2 is vacuously true of an empty
`top_issues[]`, and a rule that fires on vacuous truth fires hardest exactly when its reader is
broken. A clean gate is a clean gate: it leaves through 5c on the ordinary `PASS` path.

**`qa.testArtifactGlobs` defaults to `[]`**, which matches nothing, so a consumer who has not
configured it keeps today's behaviour exactly. That is the fail-safe direction expressed as the
default rather than as an opt-out. See [`configuration.md`](../../docs/reference/configuration.md).

#### On exit

1. **Overwrite the cycle entry's routing rows first**: `**Action**: Proceeding to 5c (PR conformance
   review)` and `**PR Review**: pending — 5c not yet run`. The entry was opened before the guards ran
   and may still carry the 5b values; the resume contract and the PR conformance review both decide
   "did this gate reach 5c?" from this row, so leaving it unwritten sends a route-2 run back to 5a on
   resume and files a trail defect at 5c.
2. **Do not run 5b.**
3. **Hand to 5c**, exactly as a `PASS` gate does. Since 5c became the loop's exit gate the only route
   to Step 7 is 5c returning `APPROVE` or `CONCERNS`, and this must not become the one path that
   reaches Step 7 without a PR conformance review — that would make it a *weaker* exit than a clean
   gate takes, on a run that by construction has stopped finding blockers.
4. Record the residual in the gate's `recommendations.future` **and** on the work item.
5. Write `describeDiminishingReturns(r)` verbatim into this cycle's `### QA Cycle {N}` entry, on its
   own `**Loop exit**` row. A reader six months later must be able to tell this exit from a stall,
   and the message is a function rather than a sentence composed here precisely so it is assertable.

> **This is not a licence to stop at the first quiet cycle.** It needs two consecutive zero-HIGH
> gates **and** a residue that is entirely machinery **and** two full adversarial passes behind it.
> The run it was derived from spent cycles 3 and 4 examining the repairs to cycle 2's repairs, and
> reached this conclusion by hand at cycle 4; the rule reaches it at cycle 3.

### Cosmetic-residue exit (shared) — route 2b, the loop's exit for a PASS gate that carries only nits

Evaluated by the **same** `classifyLoopRoute` call as the Diminishing-returns exit, after it and only
when it declined. It fires on the **"Any other gate — read by its queue"** arm of the Outcome
branching — the arm a `PASS` gate with open LOW entries lands on — and nowhere else.

**Why it exists.** Gate rule 5 lets LOW findings ride on a passing verdict, and the Outcome branching
routes on the open queue rather than the token, so a `PASS` + open-LOW gate went to 5b like any
other. task.110 ran cycles 12 and 13 — a full `/qa-fix`, commit, push, CI round and a fresh gate —
to close two nits that a reviewer would have waved through (obs #100). The loop was not wrong, it
was expensive, and the expense bought nothing 5c would not have seen anyway.

**The conditions**, as the fixture table states them (`qa-loop-route.test.mjs`, "route 2b" rows):

1. The gate token reads **`PASS` — and only `PASS`, stated as an exclusion.** A `CONCERNS` gate
   whose queue is all LOW does **not** take this exit: a `CONCERNS` token is a *reservation* QA
   raised about the work, and 5c must see it raised, not carried. It goes to 5b as today.
2. **Every open entry** in `top_issues[]` reads `severity: low` (open = `status:` absent or
   `open`). An open MEDIUM beside the LOWs is not cosmetic. A queue whose entries are all closed is
   route 1's clean gate and never reaches the classifier; the rule is stated so it cannot fire on an
   empty open set.
3. `HIGH_N == 0` **and** `HIGH_{N-1} == 0` — the same two-quiet-gates floor route 2 uses, read from
   the same recorded sequence. So it fires from **cycle 2** onward: unlike route 2 it needs no third
   adversarial pass, because a PASS gate is QA's own statement that nothing is blocked.

#### On exit

1. **Overwrite the cycle entry's routing rows first**: `**Action**: Proceeding to 5c (PR conformance
   review)` and `**PR Review**: pending — 5c not yet run` — the same post-guard write route 2 makes,
   for the same reason.
2. **Do not run 5b.**
3. **Move the open LOWs to the gate's `recommendations.future`, by id** — `ROUTE_JSON`'s `lowIds`
   names them in gate order. Each entry keeps its finding text and `suggested_action`, and gains
   `carried_from: top_issues (route 2b, cycle {N})`. The `top_issues[]` entries themselves are stamped
   `status: closed` with `resolution: carried to recommendations.future (route 2b)`, so the gate
   still records what QA raised and a later reader can tell a carried LOW from a fixed one. Record the
   same ids on the work item under **Deferred Work**.
4. **Hand to 5c**, exactly as a `PASS` gate with no open entry does. Commit the gate and QA report
   first (5b's **Where the gate and QA report get committed**, path 1) — the gate was just edited.
5. Write `describeLoopRoute(r)` verbatim on this cycle's `**Loop exit**` row. The message begins
   `Cosmetic-residue exit taken —` and names the ids it carried.

> **Route 2b is PASS-only, and route 2 is what handles a `CONCERNS` residue.** The two exits are
> deliberately not one rule with a looser token check: route 2 demands positive evidence that every
> finding is machinery, route 2b demands positive evidence that the verdict was PASS. Loosening
> either to "PASS or CONCERNS with only LOWs" is the mutation the fixture table's
> `concerns-low-only` row exists to catch.

### 5b. Run QA Fix (shared)

**Lock**: `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5b` before anything else in this sub-step. `current_step` stays `5`.

#### Signal the `changes-requested` stage (when `TRACKER_ISSUE` is set)

Run on **entering** each fix cycle, before invoking `/qa-fix` — the gate has come back with issues and the card is going back for rework. Branch on `TRACKER`:

```bash
# TRACKER=jira
node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage changes-requested --json

# TRACKER=github
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage changes-requested --json
```

> **This one fires per cycle — the opposite of the rule for `in-qa` a few sections above.** The distinction is not an oversight, so do not "correct" it to match: `in-qa` marks a phase the card enters **once**, and re-announcing it every cycle would tell a board reader nothing they cannot already see. `changes-requested` marks a state the card **re-enters**, once per gate that comes back with issues — a board that shows it on cycle 1 and then goes quiet through cycles 2–5 is actively telling the team something false.

`changes-requested` is **off by default** and, like `blocked`, is an **unranked side-state**: a consumer names it under `pipeline:` but usually not under `statuses:`. Being unranked is what lets a card re-enter it without the backward-move guard rejecting the second and subsequent moves. Its default candidates deliberately exclude "In Progress" — see the comment on `CHANGES_REQUESTED_CANDIDATES` in `jira-sync.js` for why naming a ranked development column here would make the guard fight itself.

Expect `reason: "stage-disabled"` until a project opts in, and `no-option` / `no-transition` on a board that has no such column. All are correct outcomes; the CLI exits 0 for each and the loop continues either way. Never let this call block a fix cycle.

Log in Decisions Log, once per cycle: "QA Cycle {N} — changes-requested: {landed status / disabled / skip reason}."

#### Invoke qa-fix

Invoke the `/qa-fix` skill with the path to the most recent **gate file** (the `.yml` file located using the sort command above). The gate file is the authoritative source of issues for qa-fix.

#### Third-strike rule — replace, do not patch again

> **A gate carries only its OWN cycle's findings.** This is a precondition of the rule below, not a
> style preference, and it is the one way to feed the detector a wrong answer.
>
> The detector reads the `file:` of every HIGH `top_issues[]` entry across the last three gates and
> **deliberately ignores `status: closed`** — see the comment in `high_files()` for why. That is
> correct *given* one gate per cycle carrying that cycle's findings. Copy a closed HIGH forward into
> the next gate "so the gate carries the history" and one real finding now looks like a file struck
> twice; a third cycle trips "replace, do not patch again" on a file with nothing wrong with it, in a
> loop that was converging cleanly.
>
> It is an easy mistake to make for good reasons — the phrasing above is the actual justification an
> agent wrote before doing it on task 83, and it took a later cycle to catch. Put the history where it
> belongs instead: `bug_resolution`, the QA report's Re-Review Context table, and the bug reports.
> Those are read by people; `top_issues[]` is read by this rule.

Before invoking `/qa-fix`, work out which files have been the subject of HIGH findings for three
consecutive cycles. Every `top_issues[]` entry carries a **`file:`** key (gate schema: `qa-task`
**Step 10: Create Quality Gate File**, `qa-story` **Output 2: Quality Gate File**), so this is
*read off the gates*, not judged:

```bash
# Subject files of the HIGH findings ONE gate raised, one path per line.
# Entry boundaries are the `- ` markers at the FIRST item's indent — deeper dashes belong to
# wrapped `finding: >-` text, not to a new entry. `status: closed` is deliberately ignored: a
# gate is updated in place after its own cycle's fixes, so filtering on it reads every mature
# gate as empty.
high_files() {
  awk '
    /^top_issues:/         { ti=1; next }
    ti && /^[^[:space:]#]/ { ti=0 }
    !ti                    { next }
    { ind = match($0, /[^ ]/) - 1 }
    /^[[:space:]]*-[[:space:]]/ {
      if (!seen) { base = ind; seen = 1 }
      if (ind == base) { if (hi && f != "") print f; hi = 0; f = "" }
    }
    seen && (ind == base + 2 || ind == base) && /severity:[[:space:]]*["'"'"']?high/ { hi=1 }
    seen && (ind == base + 2 || ind == base) && /file:[[:space:]]*[^[:space:]]/ {
      v=$0; sub(/^.*file:[[:space:]]*/, "", v); sub(/[},].*$/, "", v)
      gsub(/["'"'"'[:space:]]/, "", v); f=v
    }
    END { if (hi && f != "") print f }
  ' "$1" | sort -u
}
# Files on their third consecutive strike, given the last three gates oldest→newest:
comm -12 <(comm -12 <(high_files "$GATE_N2") <(high_files "$GATE_N1")) <(high_files "$GATE_N")
```

**If the same file is the subject of HIGH findings in three consecutive cycles, `/qa-fix` may not
patch it again.** The permitted moves are exactly three:

> **The strike is detected on the `file:`; the constraint applies to the mechanism.** The detector
> keys on `file:` because that is checkable (below). But what three consecutive HIGH findings share
> is almost never "this file" — it is one mechanism inside it: a hand-rolled parser, a regex over a
> format that has a real reader, a fallback that absorbs the case it was meant to reject. When
> passing the strike, **name the mechanism from the three `finding:` texts**, and say so in the
> prompt: *other* findings in the same file are fixed normally; only the struck mechanism may not
> be patched again. A fixer told only "you may not patch `foo.js`" has to decide alone whether a
> one-line fix to an unrelated function in `foo.js` is a fourth patch (obs #98).
>
> **A recognisable pre-strike shape**: from cycle 2 onward, if every HIGH finding of the last two
> cycles sits in **one file this pipeline created** — a test helper, a fixture parser, a scratch
> script — the third strike is a cycle away and the third-strike menu already applies. Task.110
> spent five cycles patching one test-helper YAML parser before replacing it with a real reader
> (obs #105); naming the pattern at cycle 2 would have saved three. Offer the menu early; do not
> wait for the detector to prove what the diff already shows.

1. **Delete the artifact** — if what it was for is already covered, or was never worth its cost.
2. **Replace its mechanism** — a different approach to the same job, not another correction to this
   one. A rewrite that keeps the defeated mechanism is a patch wearing a rewrite's diff.
3. **Waive** — record the finding as accepted with a documented reason in the gate's `waiver`
   block, and say why the residual is tolerable.

Pass the constraint into the invocation, naming the file **and the mechanism**:

```
Skill(qa-fix, args="gate={gate-file-path}") — plus, in the prompt:
"Third strike: {file} has been the subject of HIGH findings in cycles {N-2}, {N-1}, {N}.
 Struck mechanism: {one line, derived from the three finding: texts — e.g. 'the hand-rolled
 workflow-YAML parser in parseWorkflow()'}.
 You may NOT patch that mechanism again. Delete it, replace it, or waive with a documented
 reason. Other findings in {file} that do not touch the struck mechanism are fixed as usual.
 Say in the fix summary: struck mechanism: X; move: delete / replace / waive; other findings
 in the file: fixed as usual."
```

The fix summary shape is fixed so the next cycle's reader can tell a replaced mechanism from a
patched one without re-reading the diff.

**Why this rule earns its keep.** On the observed task the verification artifact was patched four
times before being deleted, and its replacement was then deleted too. Deletion was the right answer
both times; the loop took four cycles to reach it, absorbing ~1,560 lines of rewrite while the
deliverable itself changed by 193.

**Why the trigger is `file:` and not a judgement field.** `file:` is checkable against the diff —
anyone can confirm the entry names a path the change set touches. A field asking the fixer to
classify its own findings (how important, what kind, whose fault) is written by the party the rule
constrains and is unfalsifiable: an agent that classifies its residual findings favourably exits
the loop a cycle sooner and nothing can catch it. Keep any future trigger for this rule on the same
footing.

#### Where the gate and QA report get committed (one commit, one push, per cycle)

**This cycle's gate `.yml` and QA report `.md` are evidence for this cycle's fix, and belong in the
same `fix(...)` commit as the fix.** Only the *implementation report* defers to Step 8. Stage all
three together:

| Artifact                                   | Commit                                   |
| ------------------------------------------ | ---------------------------------------- |
| Code/test changes from `/qa-fix`            | this cycle's `fix(...)` commit           |
| `…gate.{N}.{name}.yml` (written by 5a)      | this cycle's `fix(...)` commit           |
| `…qa.{N}.{name}.md` (written by 5a)         | this cycle's `fix(...)` commit           |
| `…implementation.{name}.md`                 | **deferred to Step 8** (`docs(...)`)     |

**There is exactly one `git push origin HEAD` per cycle** — at step 3 below on a cycle that enters 5b
from 5a, or **before 5c** on a cycle whose gate reached 5c from 5a (path 1 above — §5c routes 1, 2, 2b and 3), never both. Do not create a separate
`docs(...): QA cycle {N} gate + report` commit, and do not push twice in a cycle. The rule is about
the **push**, not the commit: a review-driven cycle legitimately makes two commits (the pre-5c
gate+report, then 5b's `fix(...)`), and still pushes once.

Left unstated, the gate and report fall into `/commit-changes`' default sweep and an orchestrator
invents a second commit for them and pushes it separately — observed seven times on one PR. The
cost is not mainly CI minutes (four of the five superseded runs there died within 3m35s, so roughly
ten minutes of runner time). It is that **every fix commit reached merge without a completed CI run
of its own**, because a cycle's second push kept cancelling its own in-flight run.

Staging the gate here does **not** conflict with qa-fix's "Dev does not modify gate YAML files"
(`qa-fix` Step 6): this orchestrator stages a gate that `/qa-gate` wrote during 5a. `/qa-fix` never
touches it. Nor does it move anything the resume contract reads — cycle reconstruction counts
`### QA Cycle` headings in the working-tree implementation report, which stays where it is.

**Two paths leave 5a without a `fix(...)` commit. Both must still commit the cycle's
gate and QA report — the evidence for a cycle that ran belongs on the branch, not only in the
working tree, where a branch switch loses it and no reader of the PR ever sees it:**

1. **Any gate that reaches 5c from 5a — §5c routes 1, 2, 2b and 3** — and the half-cycle gate of route 2c (Outcome branching, above) — the cycle reaches 5c without entering
   5b, so no `fix(...)` commit exists. Commit the gate `.yml` and QA report `.md` **before invoking
   `/review-pr` at 5c**, and push once. This is the single stated commit point for this path.
   Committing here rather than at the Step 7 transition is load-bearing twice over: 5c reads the
   artifact trail **off the branch**, so an uncommitted gate is invisible to the very review that
   audits it; and if 5c returns `REQUEST CHANGES`, the Step 7 transition never happens on this
   cycle. Message: `docs(story.{epic}.{story}): QA cycle {N} gate + report` (or `docs(task.{id}): …`).

   > **This is the one path on which a cycle commits twice, and the push budget is what matters.**
   > A `REQUEST CHANGES` verdict re-enters 5b *inside the same cycle N*, and 5b then makes its own
   > `fix(...)` commit. That is two commits in cycle N — which is fine — but the one-push-per-cycle
   > rule below still binds, because its purpose is to stop a cycle's second push cancelling its own
   > in-flight CI run. **Cycle N's push is spent here.** On the review-driven re-entry, 5b commits
   > **without pushing**; the push happens once, on the next transition that leaves 5b.
2. **The no-code-change HALT** (step 0 below) — HALTs before any commit. Commit the gate `.yml` and
   QA report `.md` before halting, same message shape, and push once.

Those two, plus the convergence-stall escalation, are the **only** places a standalone `docs(...)`
commit for the gate and QA report is correct — each because there is no `fix(...)` commit in that
cycle to carry them. In a cycle that runs 5b, a second commit for these files is the defect this
section exists to prevent.

After fixes are applied:

0. **Check for actual changes**: Before committing, run `git diff --stat HEAD` to verify qa-fix actually modified files. If no files changed (qa-fix made no code edits), do NOT increment the cycle counter. Instead:
   - **First, if this cycle entered 5b from a 5c `REQUEST CHANGES` verdict**, confirm the PR review
     report path was actually passed in the invocation. A no-change result on that path is far more
     likely to mean the findings never reached qa-fix than that they are unfixable — the gate it
     reads is the clean one. If the path was omitted, re-invoke once with it before treating this as
     a HALT, and log the re-invocation.
   - Log in Issues Log: "QA Cycle {N}: qa-fix made no code changes — issues may be unfixable with current approach"
   - **Commit this cycle's gate `.yml` and QA report `.md` first**, then push once — per path 2 above. A HALT is a handover to a person: evidence left uncommitted is not on the PR they will read, and does not survive a branch switch. **Skip this when the cycle reached 5b via a 5c `REQUEST CHANGES` verdict** — it arrived through path 1, which already committed and pushed both files earlier in the same cycle, and repeating it produces an empty commit or a redundant push.
   - HALT with: "qa-fix could not address the remaining issues. Human review required. See implementation report for details."

0-stage. **Stage this cycle's evidence before the gate.** The fast gate's doc-links check reads the
   **tracked** tree (`git ls-files`), and `/qa-task` / `/qa-story` have just linked the work item to
   this cycle's gate and QA report, which are still untracked. Gating before they are staged reports
   both links dead, and spends one of step 0a's two bounded attempts on the cycle's own evidence
   (obs #171; task.143 cycles 1 and 6: "attempt 1 red … gate.1/qa.1 were not yet staged, attempt 2
   green after staging them"). Staging them here makes the gate measure the tree the `fix(...)`
   commit will carry:

   ```bash
   # Stage-before-gate: this cycle's gate and QA report, and nothing else.
   GATE_FILE="{the latest gate file — resolved per §Finding the Latest Gate File}"
   QA_FILE="{this cycle's QA report — the .qa. file carrying the gate's cycle number}"
   git add -- "$GATE_FILE" "$QA_FILE"
   ```

   **After step 0, never before it.** A staged new file shows in `git diff --stat HEAD`, so staging
   first would make step 0's no-change HALT unreachable. Step 1 unstages only the implementation
   report, so these two stay staged into the commit. On a cycle that reached 5b through a 5c
   `REQUEST CHANGES` verdict both files are already committed (path 1), and this `git add` is a
   no-op.

0a. **Run the fast gate before committing.** Only reached when step 0 found changes — there is
   nothing to gate otherwise, and step 0's no-change path HALTs before this point. Capture to a log
   rather than streaming:

   ```bash
   FIX_LOG=".claude/state/qa-fix-gate-${QA_CYCLE}-$(date +%s).log"
   <fastGateCommand> > "$FIX_LOG" 2>&1
   GATE_EXIT=$?
   ```

   `<fastGateCommand>` is `develop.fastGateCommand` from `skills-config.yaml` — the same fast tier
   the develop loop runs (see
   [`develop-pipeline-step-3-develop-loop.md`](develop-pipeline-step-3-develop-loop.md) §"What the
   loop runs"). **`npm run ci:fast` is the suggested value, not a default that works everywhere**;
   the develop loop checks the named script resolves before its first iteration, so by the time this
   cycle runs the key has already been proven to name a real script. The slow tier stays out of this
   cycle by design; it runs once at `develop-next`'s merge gate.

   **This is a gate on the commit, not a new halt.** On `GATE_EXIT != 0`, do **not** commit — a
   red tree is exactly what the cycle machinery is for. Triage per the step-3 pattern, feed the
   finding back into this cycle's fixes, and re-run the gate.

   **Bound this retry at 2 attempts.** After a second red gate in the same cycle, stop retrying:
   commit nothing, record the failing output in the QA Iteration History, and let the cycle end so
   the next QA review writes a gate. That is what actually reaches the convergence check and
   MAX_ITER — both of which count *cycles*, so an unbounded inner re-run would never reach either.
   An earlier revision of this block claimed "the MAX_ITER cap still bounds the loop"; it does not
   bound this retry, and a stated guarantee that is not real is worse than an unstated one.

   Cleanup mirrors step 3: `GATE_EXIT == 0` → `rm -f "$FIX_LOG"`; non-zero → retain for post-mortem.

   > **Why the gate sits between 0 and 1, and not after the commit.** A qa-fix cycle pushes to the PR
   > branch, so a red commit is a red PR the reviewer sees before the next cycle repairs it — and on
   > the last cycle nothing repairs it at all. Formatting is the concrete case: `prettier --check` is
   > not in `npm test`, so a cycle could close green, push, and fail CI on a file it had just
   > rewritten. It sits *after* step 0 because gating a tree that step 0 is about to declare unchanged
   > pays a full format+test run on the one path that always HALTs.

1. **Exclude the implementation report's *updates* from this commit — and only that** — Step 8 owns the report's final state, so qa-fix cycles must not bring report mutations into a `fix(...)` commit. The gate and QA report are **not** excluded; they ride along per the table above. The file itself is already tracked (Step 4 committed it), so this defers changes rather than withholding the file: no link to the report can dangle. Before invoking `/commit-changes`, unstage the report explicitly:

   ```bash
   # develop-story
   git reset HEAD -- '**/story.*.implementation.*.md' 2>/dev/null || true
   # develop-task
   git reset HEAD -- '**/task.*.implementation.*.md' 2>/dev/null || true
   ```

   Then invoke `/commit-changes` with an explicit `exclude` directive in the prompt: pass `exclude=story.{epic}.{story}.implementation.*.md` (or `task.{id}.implementation.*.md`). The skill respects the directive and will not re-stage the report.

   Conventional Commits message:

   #### develop-story

   `fix(story.{epic}.{story}): qa-fix cycle {N} — {brief summary of fixes}`

   #### develop-task

   `fix(task.{id}): qa-fix cycle {N} — {brief summary of fixes}`

   Rationale: previously the report was simply "not needed" in qa-fix commits but nothing prevented inclusion. Decisions Log / QA Iteration History entries written during the cycle would silently land in `fix(...)` commits, splitting report history across the branch. Step 8 is the single owner of the report's **final** commit (`docs(...)`).

   > **Do not extend this to the report's first commit.** An earlier revision of this pipeline held the file out of *every* commit until Step 8, which left the audit trail absent from the branch throughout the QA loop and turned any document linking to the report into a dangling relative link — one that resolves locally, because the file is present but untracked, and fails only in CI. Step 4 commits the file for that reason; this step defers only its churn.

2. Run `git log --oneline -1` to capture the fix commit hash.

3. Push to the remote branch so the PR reflects the latest changes — **once per cycle**:

   > **Skip this push when the cycle entered 5b from a 5c `REQUEST CHANGES` verdict.** Cycle N's
   > push was already spent on the pre-5c commit (path 1). The `fix(...)` commit rides to the remote
   > on the **next** push — the one taken by whichever cycle exits next, either at this step or
   > before that cycle's 5c. A second push here is the one this section exists to prevent: it
   > cancels the cycle's own in-flight CI run.
   >
   > **Consequence for step 5's PR-state poll**, which runs after this step: on the skipped-push
   > path the local branch is ahead of the remote, so poll the PR's *state* (open / merged / closed)
   > as usual and do **not** treat an unchanged head SHA as a failure.

   ```bash
   git push origin HEAD
   ```

4. Log what was fixed in the QA Cycle entry:
   ```
   **Fixes Applied**: {brief description of what qa-fix changed}
   **Commit**: `{hash}`
   ```

4a. **The per-cycle fix comment is posted by `/qa-fix` itself** (Step 7, stage `qa-fix-{N}`). The
   orchestrator posts nothing to the tracker issue here — an orchestrator block for the same moment
   would race the skill for the same `qa-fix-{N}` marker (task.121).

5. **Post-fix PR state check (uses tracker state poller)**: Invoke the tracker state poller (see `shared/resources/tracker-state-poller-subagent.md`) via an Explore subagent with `PR_NUMBER={PR_NUMBER}` and `ISSUE_KEY=` (empty).

   Persist the result to `{story-or-task-directory}/.summaries/step-5-post-fix-tracker-{N}.json` where `{N}` is the **current cycle number** (do NOT overwrite earlier cycles' artifacts — each cycle gets its own file). Schema per `shared/resources/subagent-summary-artifact.md`. Update the Pipeline Progress `Subagent summary ref` column for Step 5–6 with the latest path.

   Branch on `result.pr.state`:
   - `"OPEN"` → continue QA loop normally.
   - `"MERGED"` or `"CLOSED"` → HALT: "PR #{PR_NUMBER} was {state} mid-QA loop — pipeline cannot continue. Verify PR state and re-run if needed." Log in Issues Log.
   - `null` / missing / empty (poller succeeded but state field absent) → log warning `"⚠️ PR state unknown after qa-fix push — re-polling once"`; re-invoke the poller once. If the second result is still null/missing, log `"⚠️ PR state could not be determined — proceeding optimistically (treating as OPEN)"` in Issues Log and continue. Do **not** HALT on null — flaky `gh pr view` is more common than mid-loop close.
   - `result.errors | length > 0` → log each error in Issues Log; treat `pr.state` per the rules above (the poller may still return a usable state alongside non-fatal errors).

6. **Emit eval marker (EVAL_MODE guard)**: If the environment variable `EVAL_MODE=1` is set, write an empty marker file after each completed qa-fix iteration so eval harnesses can detect the iteration boundary and send a kill signal for resume testing:

   ```bash
   if [ "${EVAL_MODE}" = "1" ]; then
     mkdir -p .task-state
     touch ".task-state/qa-fix-iter-${QA_CYCLE}.marker"
   fi
   ```

   This is a no-op in all production runs where `EVAL_MODE` is unset.

7. **If the counter reads `QA_MAX_CYCLES`, the budget is spent: do not return to 5a.** Go to
   **Loop Escalation** with the *Loop limit* trigger — which evaluates the **Gate-the-last-fix
   half-cycle** (route 2c) *before* writing any escalation entry. Otherwise increment the cycle
   counter and return to 5a. The **Convergence check** runs again after the next gate is written —
   it, not this step, is what ends a loop that has stopped reducing HIGH findings before the budget
   does.

---

### 5c. PR Conformance Review (shared)

**Lock**: `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5c` before anything else in this sub-step. `current_step` stays `5`;
it advances to `7` only at the Step 7 transition, on `APPROVE` or `CONCERNS`.

Perform this step **before Step 7**, on any of the **five routes out of 5a**:

1. a gate with **no open finding** — `PASS` with no open `top_issues[]` entry, or `WAIVED` with
   `waiver.active: true` (its HIGH entries are waived, not open); an inactive `WAIVED` with no open
   entry is read by its queue and arrives here as a `PASS` does — the ordinary route; or
2. a gate that took the **Diminishing-returns exit** above. That gate is `CONCERNS` by construction —
   the exit's own condition 2 requires a non-empty `top_issues[]`, and any MEDIUM makes the gate
   CONCERNS — so it must be named here explicitly. It arrives with a residue that is entirely test
   machinery and no HIGH finding across two consecutive cycles; or
3. a gate that reads **`CONCERNS` with no open entry in `top_issues[]`** — empty, or every entry
   `status: closed`. Gate rule 4 produces this shape from any NFR-level CONCERNS (an `nfr_validation`
   axis at `CONCERNS` with nothing in the queue), so it is a reservation, not a fix list. It reaches
   5c directly from the Outcome branching above without passing the Convergence check or the
   Diminishing-returns exit, because both of those reason about a queue this gate does not have.
   Before this route existed the gate fell through to 5b, whose no-code-change HALT then ended a
   run on a gate that said "fine, with reservations" (task.105, obs #51); or
4. **(route 2b)** a gate that took the **Cosmetic-residue exit** above. That gate is `PASS` by
   construction — the exit is PASS-only — and arrives with its LOW entries carried to
   `recommendations.future` and closed in `top_issues[]`, after no HIGH finding across two
   consecutive cycles (task.110, obs #100); or
5. **(route 2c)** the gate written by the **Gate-the-last-fix half-cycle** in Loop Escalation, when
   it reads `PASS` or `CONCERNS` with no open entry. By its shape this is route 1 or route 3 on the
   half-cycle's own gate (cycle `{N+1}`); it is named here because of the moment it fires — the
   budget was spent, and this gate was granted to the last budgeted cycle's fix so the run could
   leave through 5c rather than escalate an ungated head (task.117, obs #112). A half-cycle gate
   with an open entry never reaches 5c; it goes to the escalation as written.

A gate that routes to **5b** never reaches this step, and none of the five routes above routes to
5b — 5b is entered only on an open finding (see the Outcome branching). This is the loop's **exit
gate**: 5a and 5b can cycle without it, but nothing leaves the loop except through here.

> **Route 2 is named rather than left implied, and that is not tidiness.** An earlier draft of the
> Diminishing-returns exit said it hands to 5c "exactly as a `PASS` gate does" while this sentence
> still admitted only `PASS` / `WAIVED` — so one runnable document held two rules about whether a
> CONCERNS gate may reach 5c, and an orchestrator's behaviour depended on which section it read
> first. Whatever else changes here, the set of gates 5c accepts is stated in **one** place, and this
> is it.

**Why this exists, and what is genuinely new.** `/qa-story` and `/qa-task` already dispatch the
**code** reviewer every cycle, so 5c's code lens is duplication and is not the reason it runs. Its
**conformance** lens has no counterpart anywhere in the pipeline: does the diff *cover* what the
work item promised, did it drift outside that *scope*, is the artifact *trail* complete and honest,
is the work item *consistent* with what shipped. A run can otherwise reach `accepted` with a
complete-looking trail that does not hold — which is exactly how `/review-pr` itself shipped, and
what its own dogfood run on PR #283 caught.

**Why here and not earlier.** By the time a gate reads PASS the trail 5c audits already exists —
implementation report, review report, QA report, gate. Only the DoD is missing, and Step 7 writes
it. And an adverse verdict still has somewhere to go, because `/qa-fix` is live.

**Remaining Work Status block (required, before the review).** Emit the block with the position
line `Steps 5–6/8 — QA LOOP ⏳ PR conformance review, cycle {CYCLE}/5` immediately before invoking
`/review-pr`. This is a mandatory firing point in
[`shared/resources/develop-pipeline-remaining-work-banner.md`](develop-pipeline-remaining-work-banner.md)
and **this section owns it**: the review is a subagent dispatch that can run long, and without the
block the user's last position marker is the QA cycle that has already finished.

#### Assert the trail is on the branch, not in the working tree (before the review)

5c reads the artifact trail **off the PR branch** — that is what makes its conformance lens
independent of the session that wrote the trail. So the trail has to be there. Path 1 above
committed the cycle's gate and QA report and pushed once; this assertion is what turns that
instruction into a fact. A `-f` or `ls` check answers "is there a file here", which a
suppressed `git commit` rejection satisfies perfectly: on one run a whole QA cycle sat staged and
unpushed under a `PASS` gate, and only this step's lens — reading the PR head — caught it (obs #48,
task.115).

```bash
BRANCH=$(git rev-parse --abbrev-ref HEAD)
GATE_FILE="{the latest gate file — resolved per §Finding the Latest Gate File}"
QA_FILE="{the cycle's QA report — the .qa.{N}. file with the same N}"
for ARTIFACT in "$GATE_FILE" "$QA_FILE"; do
  git ls-files --error-unmatch "$ARTIFACT" >/dev/null \
    || { echo "HALT: $ARTIFACT is not tracked — the path-1 commit did not include it"; exit 1; }
  git show "origin/${BRANCH}:${ARTIFACT}" 2>/dev/null | grep -q . \
    || { echo "HALT: $ARTIFACT is not on origin/${BRANCH} — the cycle's push did not carry it"; exit 1; }
done
```

> **Never suppress a `git commit`'s output or exit status in a chain.** `git commit … >/dev/null
> 2>&1 || true` is how a pre-commit hook's refusal becomes an invisible no-op, and the assertion
> above is the backstop for exactly that — it should never be the *first* thing to notice. Read the
> exit code where the commit is made; the same rule holds at `/finalise` Step 7 action 6a.

#### Invoke the review

```bash
# standard mode
/review-pr --effort medium --comment

# lite mode — degrades the review, never skips it
/review-pr --effort low --comment
```

> **Written as two concrete invocations, not one `{medium|low}` placeholder.** zsh parses a
> word-initial `{` as a brace-group keyword, so the single-line placeholder form was a **zsh parse
> error** inside a ```` ```bash ```` fence — `bash -n` clean, `zsh -n` failing on `}`. That is Risk 1,
> the defect class task 66 shipped, sitting in the line that invokes the review. The mid-word form
> used elsewhere in this file (`.../{develop-story|develop-task|develop-bug}/...`) is unaffected and
> parses in both shells.

- **Target**: the open PR for this branch — pass nothing and `/review-pr` resolves it from the
  current branch.
- **`--effort`**: `medium` in standard mode, `low` in lite mode. Lite **degrades** the review; it
  never skips it. See [`shared/resources/develop-pipeline-lite-mode.md`](develop-pipeline-lite-mode.md).
- **`--comment` is passed explicitly and is not optional here.** `/review-pr` otherwise asks before
  posting, and the pipeline cannot prompt. Steps 5–6 and 7 already comment on the PR, so this is
  authorised ground rather than a new outward-facing capability.
- `/review-pr` writes `{story|task}.{id}.pr-review.{n}.{name}.md` beside the work item. The grammar
  is already defined in `docs/standards/file-naming.md` (named in prose rather than linked: this
  file is bundled into skill `references/` directories, where a `../../` link resolves to a path
  that does not exist); before this step existed, nothing emitted it.

**`/review-pr` remains advisory and its contract is unchanged.** It writes no gate `.yml`, never
submits a formal review, and never edits code. The orchestrator acts on a verdict the skill merely
reports — that separation is what makes this wiring legitimate. Do not give 5c the power to write a
gate.

#### Verdict branching

| Verdict | Action |
| --- | --- |
| 🚨 **REQUEST CHANGES** | Return to **5b** and run `/qa-fix` with the review's findings (see the invocation below). **Do not increment the counter here** — 5b's step 7 increments it on exit, exactly as on any other cycle. A review-driven fix is a cycle like any other, and it is counted in the same one place. |
| ⚠️ **CONCERNS** | Record the findings in the QA Cycle entry and the implementation report. **Do not block.** Signal `ready-for-merge`, exit the loop, proceed to Step 7. |
| ✅ **APPROVE** | Signal `ready-for-merge`, exit the loop, proceed to Step 7. |
| ❌ **Review failed** — `/review-pr` HALTed, could not resolve a PR, or errored | **Not a verdict, and not an exit.** Log it in the Issues Log, record `review failed` on the cycle's `**PR Review**` row, the gate and QA report are already committed by path 1 — do not commit again — and **HALT** naming the PR and the failure. Do **not** fall through to Step 7: 5c is the only exit, so a run that skips it silently finalises without the check this step exists to add. |

> **Why the failure arm is spelled out.** A gate that reaches 5c from 5a (§5c routes 1, 2, 2b and 3) does so without entering 5b, so
> it skips 5b step 5's mid-loop PR-state poll — which means a PR closed or merged underneath the run
> is first discovered *by* `/review-pr`, and `/review-pr` HALTs with text addressed to a human. Without
> this row the orchestrator has no arm for that state, and the likeliest improvisation is the one
> outcome that must never happen: proceeding to `/finalise` with no review.

The 5-cycle budget is **shared**, not additional. A run whose review returns REQUEST CHANGES
therefore consumes a cycle it would not have consumed before, and can reach Loop Escalation on a
run that previously exited clean. That is the gate working, not a regression — and the escalation
path already exists.

#### Invoking `/qa-fix` on a REQUEST CHANGES verdict

**Remaining Work Status block (required, before re-entering 5b).** Emit the block with the
position line `Steps 5–6/8 — QA LOOP ⏳ review requested changes, cycle {CYCLE}/5` before the
invocation below — the second of the two firing points this section owns.

The ordinary 5b invocation passes the latest **gate file**, and on no route into 5c does that
gate carry the review's findings. Pass the **PR review report** as well:

```
Skill(qa-fix, args="gate={gate-file-path} pr_review={pr-review-report-path}")
```

The findings ingester globs `*.pr-review.*.md` for exactly this reason (see
`qa-findings-ingester-prompt.md`), and treats a finding whose rendered severity field reads
`high` as equivalent to a HIGH gate `top_issue` — the report carries no `severity:` key, and the
ingester warns by name against searching for one. Without both halves of this — the glob and the passed path — qa-fix reads a
clean gate, finds nothing, changes nothing, and 5b step 0 HALTs reporting the issues as unfixable
when in fact they were never delivered.

> **What the gate carries differs by route, and on no route is it the work.** Four shapes arrive
> here:
>
> | Gate | `top_issues[]` | Is it the fix target? |
> | :--- | :--- | :--- |
> | `PASS` (route 1) | no open entry — empty, or only `status: closed` entries | — nothing to mistake |
> | `WAIVED` (route 1) | its HIGH entries, with `waiver.active: true` | **No.** They were waived on purpose; the outcome-branching list above says re-running qa-fix on them "would churn against an intentionally-waived gate" |
> | `CONCERNS` (route 2, the Diminishing-returns exit) | the test-machinery residue that exit declined to fix | **No.** Leave it where the exit put it — the gate's `recommendations.future` and the work item |
> | `CONCERNS` (route 3, no open entry) | empty, or only `status: closed` entries | — nothing to mistake; the reservation lives in `nfr_validation` and `status_reason` |
>
> **Only the review's findings are the work**, and they arrive in the `pr_review=` report, not in the
> gate. Working a gate's carried entries instead re-does what was waived, or resumes refining the
> pins — the behaviour the Diminishing-returns exit exists to end, re-entered through the back door.
>
> Nothing mechanical prevents either: `/qa-fix`'s priority order picks up whatever `top_issues[]`
> holds, so **the instruction is the whole guard.**

> **REQUEST CHANGES re-enters 5b, not 5a.** The gate for this cycle has already been written and
> read; what is wanted is a fix pass against the review's findings, after which the loop returns to
> 5a for a fresh gate in the normal way. Entering at 5a instead would re-run QA against an unchanged
> tree and re-derive the gate that just passed.

#### Signal the `ready-for-merge` stage

Only on **APPROVE** or **CONCERNS** — never on REQUEST CHANGES, which is still inside the loop.
When `TRACKER_ISSUE` is set, branch on `TRACKER` — the same shape as the `changes-requested` signal
in 5b, which has always covered both:

```bash
# TRACKER=jira
node .agents/skills/{develop-story|develop-task|develop-bug}/references/jira-stage.js \
  --issue {TRACKER_ISSUE} --stage ready-for-merge --json

# TRACKER=github
node .agents/skills/{develop-story|develop-task|develop-bug}/references/gh-stage.js \
  --issue {TRACKER_ISSUE} --stage ready-for-merge --json
```

Like `in-qa`, this stage is **off by default** and opted into per issue type in the workflow record;
`reason: "stage-disabled"` is the expected outcome on a board without a merge-queue column.
Non-blocking either way.

Note the ordering: this fires once the review has cleared, still **before** Step 7. Step 7 is what
moves the issue to `done`, and it runs while the PR is still open — merging happens later, by hand
or via `/develop-next`. A board that wants a card to sit in a merge queue until the PR actually
lands should leave `done` to a human, not turn this stage off.

> **This block moved here from 5a's Outcome branching with task 77.** It used to fire the moment
> the gate read PASS, which advertised a card as merge-ready while the run could still loop back
> into `/qa-fix`. It now fires only once nothing can send the run backwards.

#### Record the outcome

Write the verdict into this cycle's `### QA Cycle {N}` entry on the `**PR Review**` row, and record
the report path in the implementation report. Then emit the Step 7 transition block with
`Steps 5–6/8 — QA LOOP ✅ complete ({N} cycles, {gate}, PR review {verdict})`.

---

## Loop Escalation (shared)

**Two triggers reach this block, and they share everything below except the heading and the
opening sentence.** There is deliberately no second escalation path: same artifact, same
commit-and-HALT shape, one set of templates.

> **The Diminishing-returns exit is not one of them, and the distinction is the whole reason that
> exit exists.** It ends a loop that *finished working* — zero HIGH across two consecutive gates,
> residue entirely machinery — and it hands to 5c and then Step 7. It writes no escalation entry and
> raises no HALT. A reader who finds a run that stopped at cycle 3 with a `CONCERNS` gate must be
> able to tell which of the two happened; the `**Loop exit**` row that exit writes into the cycle's
> QA Iteration History entry is what tells them, and it says so in words rather than leaving it to be
> inferred from the absence of an escalation entry.

| Trigger               | Entry heading           | Fires when                                                                                                             |
| --------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Loop limit**        | `QA Loop Limit Reached` | `QA_MAX_CYCLES` complete cycles finished without reaching Step 7 — whether because no gate read clean, or because 5c returned REQUEST CHANGES and sent the run back to 5b. **The Gate-the-last-fix half-cycle (route 2c, below) is evaluated first, and the entry is written only if it declines or its gate has an open entry.** |
| **Convergence stall** | `QA Loop Not Converging` | The **Convergence check** above tripped — cycle ≥ 3, and the HIGH count failed to strictly decrease across two consecutive cycles. |

### Gate-the-last-fix half-cycle (shared) — route 2c, the loop-limit trigger's pre-escalation step

Runs **only on the Loop limit trigger**, after 5b of cycle `N = QA_MAX_CYCLES` has committed and
pushed its fix, and **before** the escalation entry is written. The Convergence stall never reaches
it: a stall has HIGH remaining, and this route requires HIGH 0 on the last gate.

**Why it exists.** The loop's shape is *gate → fix → gate*, and a budget of N cycles ends on a
**fix**: cycle N's 5b lands a commit that no gate ever reads. On task.117 the loop ran five
`CONCERNS` gates with HIGH 0 throughout and MEDIUM strictly falling — a loop that was *working*, one
gate from clean — and escalated a fix nobody had gated (obs #112). The defect is at the budget
boundary, not in the fixes. This route grants that fix the gate it is owed, and nothing more: one 5a,
no 5b, and the gate decides.

**The conditions**, as the fixture table states them (`qa-loop-route.test.mjs`, "route 2c" rows).
Ask the engine with `budgetSpent: true`; do not evaluate them by eye:

```bash
ROUTE_JSON=$(command node -e '
  const fs = require("fs");
  const { classifyLoopRoute, describeLoopRoute } =
    require("./.agents/skills/{develop-story|develop-task}/references/qa-diminishing-returns.js");
  const r = classifyLoopRoute({
    cycle:              Number(process.argv[1]),
    highCounts:         JSON.parse(process.argv[2]),
    mediumCounts:       JSON.parse(process.argv[3]),
    latestGateContent:  fs.readFileSync(process.argv[4], "utf8"),
    budgetSpent:        true,
    lastCycleAction:    process.argv[5],
  });
  console.log(JSON.stringify({ ...r, message: describeLoopRoute(r) }));
' "$CYCLE" "$HIGH_SEQUENCE_JSON" "$MEDIUM_SEQUENCE_JSON" "$LATEST_GATE" "$LAST_CYCLE_ACTION")
ROUTE=$(printf '%s' "$ROUTE_JSON" | jq -r '.route')
```

| Variable | Where it comes from |
| :--- | :--- |
| `$CYCLE` | `QA_MAX_CYCLES` — the last budgeted cycle |
| `$HIGH_SEQUENCE_JSON` | the `**HIGH findings**` rows, oldest first, as for the Diminishing-returns exit |
| `$MEDIUM_SEQUENCE_JSON` | the `**MEDIUM findings**` rows, oldest first, as a JSON array — cycles `1..N-1` are what the engine reads; cycle `N`'s reading it takes from the gate itself |
| `$LATEST_GATE` | cycle `N`'s gate (`…gate.{N}.{name}.yml`) |
| `$LAST_CYCLE_ACTION` | the `**Action**` row of the `### QA Cycle {N}` entry, verbatim |

The route fires — `gate-the-last-fix` — only when **all** of:

1. cycle `N`'s `**Action**` row reads `Running qa-fix …` — so a fix exists on the head that no gate
   has read. A cycle `N` that reached 5c and was sent back by `REQUEST CHANGES` does **not**
   qualify (fixture row "2c negative: the last cycle reached 5c"): the review's findings are outside
   the gate sequence this route reasons over, and it is 5c, not 5a, that would have to re-read that
   fix — which the spent budget does not allow.
2. `HIGH_N == 0` — the **last** gate, the one cycle `N`'s fix answers, raised no blocker. The
   reading is the last gate's, not the whole history's: an earlier version required HIGH 0 at
   *every* cycle, and declined two loops that had raised a blocker mid-run, fixed it in one cycle,
   and ended on a HIGH-0 gate (task.130 `0,1,0,1,0`; task.125 `1,1,0,1,0` — obs #139). Both were
   granted a cycle by hand and read clean. A blocker on the last gate still escalates with its
   evidence — that fix is not owed a half-cycle.
3. `MEDIUM_N < MEDIUM_{N-1} < MEDIUM_{N-2}` — strictly falling across the last three gates. Flat, or
   fell-then-plateaued, is not evidence that one more gate would clear.

**On `gate-the-last-fix`:**

1. Write `describeLoopRoute(r)` on cycle `N`'s `**Loop exit**` row — it begins
   `Gate-the-last-fix half-cycle granted —` and says in words that this is neither an exit nor an
   escalation.
2. Run **one ordinary 5a** — `bash .agents/skills/{develop-story|develop-task}/references/set-qa-phase.sh 5a`,
   then invoke `/qa-task` / `/qa-story` exactly as a cycle does, on the head cycle `N`'s fix left. It writes `gate.{N+1}` and `qa.{N+1}` and a
   `### QA Cycle {N+1}` entry carrying the `**Half-cycle**: gate-the-last-fix` row (template above).
   Cost: half a cycle — no fix, no suite re-run beyond the gate's own. **There is no 5b**, whatever
   the gate says.
3. Read gate `{N+1}` by the Outcome branching's own definition of "open":
   - `PASS`, or `CONCERNS` with **no open entry** → write `**Action**: Proceeding to 5c (PR
     conformance review)` and `**PR Review**: pending — 5c not yet run` on cycle `{N+1}`'s entry,
     commit the gate and QA report (path 1), and **hand to 5c** — route 2c of §5c's set. The run
     leaves the loop through its exit gate like any other.
   - **any open entry** → write `**Action**: Escalating — loop limit reached` on that entry (its
     `**PR Review**` row already reads `not reached — gate did not exit the loop`, written when the
     half-cycle's entry was opened; leave it), and continue into the escalation below **with gate
     `{N+1}` in its table**: it is the last gate, and the head it read is the head being handed
     over.

**On `continue`:** overwrite cycle `N`'s `**Action**` row with `Escalating — loop limit reached` —
**and only that row**: cycle `N`'s `**PR Review**` stays as written, which on the
loop-limit-via-review path is a real `REQUEST CHANGES` the escalation entry quotes — then write the
escalation entry as today. Put `ROUTE_JSON`'s `reason` in the entry's **What was attempted per cycle** so the reader
knows the half-cycle was considered and why it was declined (`last-cycle-not-a-fix`,
`high-on-last-gate`, `medium-not-falling`, …). The Action overwrite is not optional: the resume
contract's 5c sub-state table keys the "left the loop through escalation" row on it, and the
Convergence trip already writes its own value the same way.

Before halting, write a thorough escalation entry in the Issues Log. Use the template for the
work item type, substituting the heading and opening sentence for the trigger that fired, and
listing the cycles that actually ran (`{N}`, which is `QA_MAX_CYCLES` on the loop limit — or
`QA_MAX_CYCLES + 1` when the half-cycle ran and its gate had an open entry — and usually 3 on a
convergence stall).

**5c adds no third trigger.** A REQUEST CHANGES verdict routes back to 5b and consumes a cycle from
the same 5-cycle budget, so a loop exhausted by review verdicts escalates through the **Loop limit**
trigger above like any other. There is still exactly one escalation path. Where a cycle was consumed
by a review rather than by a failing gate, say so in **What was attempted per cycle** — the final
gate may read `PASS` while the run still escalated, and an entry that does not explain that reads as
a contradiction to whoever picks it up.

#### develop-story escalation template

```
### {QA Loop Limit Reached | QA Loop Not Converging} — {YYYY-MM-DD}

{Loop limit:        The pipeline completed {QA_MAX_CYCLES} qa-story/qa-fix cycles without a clean PASS.}
{Loop limit via review: The pipeline completed {QA_MAX_CYCLES} cycles. The final gate read {status},
                    but Step 5c returned REQUEST CHANGES on cycle(s) {list}, so the run never
                    cleared the loop's exit gate.}
{Convergence stall: The pipeline stopped after {N} qa-story/qa-fix cycles: the HIGH finding
                    count failed to strictly decrease across two consecutive cycles, so the
                    loop was no longer converging. The remaining findings are NOT accepted —
                    they are handed over below.}

**Final gate status**: {status}
**HIGH findings per cycle**: {HIGH_1}, {HIGH_2}, … {HIGH_N} — {flat from cycle {i} onward / still rising}
**Remaining issues** (from final gate file):
{List each top_issue: description, severity, file (from the entry's `file:` key)}

**What was attempted per cycle**:
- Cycle 1: {fixes applied}
- Cycle 2: {fixes applied}
- Cycle 3: {fixes applied}
- {…through cycle {N}}

**Likely root cause**: {Assessment — e.g., architectural mismatch, missing test
infrastructure, acceptance criteria that cannot be met with current approach; on a
convergence stall, say which file the fixes kept circling and why patching it stopped
working}

**Recommended next steps**:
1. {Specific action}
2. {Specific action}
3. {Specific action — e.g., update story if issues reflect out-of-scope requirements}
```

#### develop-task escalation template

```
### {QA Loop Limit Reached | QA Loop Not Converging} — {YYYY-MM-DD}

{Loop limit:        The pipeline completed {QA_MAX_CYCLES} qa-task/qa-fix cycles without a clean PASS.}
{Loop limit via review: The pipeline completed {QA_MAX_CYCLES} cycles. The final gate read {status},
                    but Step 5c returned REQUEST CHANGES on cycle(s) {list}, so the run never
                    cleared the loop's exit gate.}
{Convergence stall: The pipeline stopped after {N} qa-task/qa-fix cycles: the HIGH finding
                    count failed to strictly decrease across two consecutive cycles, so the
                    loop was no longer converging. The remaining findings are NOT accepted —
                    they are handed over below.}

**Final gate status**: {status}
**HIGH findings per cycle**: {HIGH_1}, {HIGH_2}, … {HIGH_N} — {flat from cycle {i} onward / still rising}
**Remaining issues** (from final gate file):
{List each top_issue: description, severity, file (from the entry's `file:` key)}

**What was attempted per cycle**:
- Cycle 1: {fixes applied}
- Cycle 2: {fixes applied}
- Cycle 3: {fixes applied}
- {…through cycle {N}}

**Likely root cause**: {Assessment — e.g., architectural mismatch, missing test
infrastructure, success criteria that cannot be met with current approach; on a
convergence stall, say which file the fixes kept circling and why patching it stopped
working}

**Recommended next steps**:
1. {Specific action}
2. {Specific action}
3. {Specific action — e.g., update task if issues reflect out-of-scope requirements}
```

Set report status to `Escalated`. Invoke the `/commit-changes` skill to commit the implementation
report — **and, on a convergence stall, this cycle's gate `.yml` and QA report `.md` alongside it**,
since a stall halts before 5b and so has no `fix(...)` commit to carry them (see **Where the gate
and QA report get committed** in 5b):

#### develop-story escalation commit

Suggested commit message: `docs(story.{epic}.{story}): implementation report — qa loop escalation`

#### develop-task escalation commit

Suggested commit message: `docs(task.{id}): implementation report — qa loop escalation`

Then push:

```bash
git push origin HEAD
```

#### develop-story HALT message

```
⚠️ Story Development Paused — {QA Loop Limit Reached | QA Loop Not Converging}

Story:               {story filename}
QA cycles completed: {N}
HIGH per cycle:      {HIGH_1}, {HIGH_2}, … {HIGH_N}
Final gate status:   {status}
Implementation Report: {report file path}

The implementation report contains a full breakdown of every issue and fix attempted.
On a convergence stall the remaining findings are outstanding, not accepted — the loop stopped
because it was no longer reducing them, which is a reason to look at them, not past them.
Options:
1. Fix remaining issues manually, then re-run /qa-story
2. Accept the current gate status and proceed manually with /finalise
3. Update the story requirements if issues reflect unintended scope
4. Re-run /develop-story to resume with more cycles — Phase 0b offers "Resume at 5a with {k}
   more cycles"; any /qa-story you run by hand in between is counted from its gate on disk
```

#### develop-task HALT message

```
⚠️ Task Development Paused — {QA Loop Limit Reached | QA Loop Not Converging}

Task:                {task filename}
QA cycles completed: {N}
HIGH per cycle:      {HIGH_1}, {HIGH_2}, … {HIGH_N}
Final gate status:   {status}
Implementation Report: {report file path}

The implementation report contains a full breakdown of every issue and fix attempted.
On a convergence stall the remaining findings are outstanding, not accepted — the loop stopped
because it was no longer reducing them, which is a reason to look at them, not past them.
Options:
1. Fix remaining issues manually, then re-run /qa-task
2. Accept the current gate status and proceed manually with /finalise
3. Update the task requirements if issues reflect unintended scope
4. Re-run /develop-task to resume with more cycles — Phase 0b offers "Resume at 5a with {k}
   more cycles"; any /qa-task you run by hand in between is counted from its gate on disk
```
