---
id: task.148
title: "[Task 148] qa-fix and the QA loop: offer a structural move before another prose patch"
type: task
description: "Give qa-fix a step that offers a structural move — consolidate the contract into one enumerable place, or scope a best-effort claim down — before it patches the same subject again; give the QA loop a checkable narrowing-residue signal (HIGH 0 on two consecutive gates, every MEDIUM on one file) that hands qa-fix that offer instead of letting the loop run to its budget; and widen qa-fix Step 3.5's documentation probe from the edited file to every executed document that restates the subject."
tags: [qa-fix, qa-loop, develop-task, develop-story, observation]
category: other
status: planned
priority: Medium
created: 2026-09-24
updated: 2026-09-25
assignee:
estimated_effort_hours: 16
github_issue: 478
---

# Technical Task: qa-fix and the QA loop — offer a structural move before another prose patch

**Status:** Planned

**GitHub Issue**: [#478](https://github.com/Gamaroff/agent-skills/issues/478)

---

## 1. Overview

When a QA cycle's finding corrects a subject that the previous cycle's fix already corrected, the loop
has no rule that says "stop correcting sentences; change the shape". `qa-fix` has a replace-don't-patch
rule only for a HIGH third strike, and the QA loop has no guard that fires when HIGH stays at 0 while
the MEDIUMs keep narrowing one mechanism. This task adds the missing offer on both sides, and fixes the
documentation probe that let a cross-file restatement go unseen.

**Scope**: one new `qa-fix` step, one rewritten Step 3.5 probe row, one pure predicate in the QA-loop
engine, one wiring subsection in the loop document, four test files, CHANGELOG.

**Key deliverables**:

1. `qa-fix` **Step 2.6: Offer the structural move before another patch** (obs #167, #172). It gives a
   four-move menu: **consolidate the contract**, **scope the claim**, **waive** or **patch**. The fix
   summary records the choice.
2. `classifyNarrowingResidue` in `shared/resources/qa-diminishing-returns.js`, and a **Narrowing-residue
   offer** in the loop's 5b that passes its result into the `/qa-fix` prompt. It is an offer, not a
   route: `classifyLoopRoute` is unchanged (obs #172).
3. `qa-fix` Step 3.5, documentation row 1: the population is **every executed document that restates the
   subject**, found by a named command. The population size is recorded, and a population above 1 leads
   to the consolidate move (obs #174). The fix summary records the command and every hit with its
   disposition (updated, or unaffected and why), because a probe that leaves no record cannot be told
   apart from one that was skipped (obs #177).

**Expected outcome**: on task.143's own gates, the predicate fires at cycles 2, 3 and 6. Those are the
cycles whose fixes had to change the mechanism's claim by judgement. At each of them, `/qa-fix` is
prompted with the structural move before it writes another rule.

---

## 2. Motivation

### Current Problems

1. **A contract kept only in prose is corrected one sentence at a time (obs #167).** On task.141, cycles
   10–12 each found one MEDIUM in the `/qa-next` SKILL.md prose that describes its state file. Each fix
   aligned the readers it enumerated and exposed the next one. task.143 later resolved *that instance* by
   moving the state file into `uat-status.mjs` (`STATE_FIELDS` at `skills/qa-next/scripts/uat-status.mjs:1165`,
   `--state-init` / `--state-set` / `--state-clear`; merged in `30178250`, 2026-09-24 per
   `git log -1 --format='%h %ad' --date=short 30178250`). The *rule* was never added: `qa-fix` has no
   step that offers a schema or ownership move before another prose patch
   (`grep -n -i 'schema\|ownership\|scope the claim' skills/qa-fix/SKILL.md` finds only an unrelated
   example option and the gate-ownership line).
2. **The loop spends its budget narrowing a best-effort mechanism, and no guard fits (obs #172).**
   task.143 ran 7 QA cycles (`ls docs/tasks/task.143.*/task.143.gate.*.yml | wc -l` → 7). It escalated
   at the loop limit twice: at cycle 5, and again at cycle 7 after two granted cycles. HIGH was 0 on every
   gate. MEDIUM read **2, 1, 2, 0, 1, 1, 0** (`countRaised` over each gate; command in § 3). Every MEDIUM
   from cycle 2 onward sat in the v0.51.0 legacy-migration derivation. The implementation report's Issues
   Log calls it "one mechanism", and each fix made the derivation more precise and exposed a narrower case.
   None of the four guards fits this shape:
   - the Convergence check needs HIGH > 0;
   - the third strike is HIGH-only;
   - the Diminishing-returns exit needs a test-machinery residue;
   - route 2c needs MEDIUM strictly falling.

   The moves that converged at cycle 3 and cycle 6 both stopped claiming exactness. Judgement reached
   them; no rule prompted them.
3. **The documentation probe searches where the edit was, not where the copies are (obs #174).**
   `qa-fix` Step 3.5, row *What did this edit make false elsewhere?*, says "Grep the file for other
   statements about the same subject". On task.124, four consecutive cycles (bugs 9 → 11 → 12 → 13) each
   found that the previous prose fix to the "who restores the lock" rule made a sibling false. The
   siblings were in **other** files. task.130 collapsed that one rule. The probe still reads the one
   file, so the next rule restated across files will repeat the pattern.
4. **The probe is read, not run, and nothing shows the difference (obs #177).** On task.145 (develop-next
   T145, 2026-09-25), QA cycle 2 changed the rule "flag an outcome no branch returns" to "no *current or
   planned* branch" in the check item at review-task Step 3 and review-story Step 4. It left the same rule
   unchanged, eight lines later, in each section's *Common Hallucination Patterns* list. That is the
   **same** file, so the existing probe covered it. The fix summary said the adversarial pass had run, but
   it recorded no phrase and no hits. QA cycle 3 found the survivor (CR3-2, medium). Widening the
   population (problem 3) does not help a probe nobody executes; the output has to show that it ran.

### Benefits of Solution

- A fixer facing its second correction of the same subject gets a named alternative to a third
  correction. The alternative is the move that ended task.141's and task.143's loops, offered when the
  loop can still use it.
- The loop gets a signal for the HIGH-0 narrowing shape. The signal is keyed on `file:`, which the
  third-strike rule already treats as the only checkable trigger. It needs no new gate field and no
  judgement field.
- The documentation probe reports a population. A population of 1 for a rule that three orchestrators
  execute is itself visible as a finding.
- Each change is held by a test that goes red when the change is reverted.

---

## 3. Technical Background

> Citations pair a line number with the text at that line, so a stale coordinate can still be found.

### Current Architecture

**`qa-fix`** (`skills/qa-fix/SKILL.md`, canonical, not bundled):

- `:548` *(`### Step 2.5: Honour the third strike — replace, do not patch again`)*. This step acts only
  on a strike the pipeline passes in (`:575`, *Determining the strike is the pipeline's job*), and the
  strike is HIGH-only (`:550`). Its menu (`:564`, `| Move |` table) has three moves: delete, replace or
  waive. It has no offer below the strike and no move that narrows a claim.
- `:607` *(`### Step 3.5: Adversarial pass over the fixes themselves`)*. The documentation-deliverable
  table starts at `:631` and scopes the problem to "a *sentence elsewhere in the same file*". Row 1 is
  at `:638` (`Grep the file for other statements about the same subject`).
- Sibling in flight: **task.146** (planned) adds an identity-rule table to the same Step 3.5, after the
  documentation table. The two tasks touch adjacent lines of one section and are otherwise independent.

**The QA loop** (`shared/resources/develop-pipeline-step-5-6-qa-loop.md`, bundled into
`skills/develop-task/references/` and `skills/develop-story/references/` by `npm run bundle`):

| Guard                    | Anchor                                                            | Why task.143's shape misses it                        |
| ------------------------ | ----------------------------------------------------------------- | ----------------------------------------------------- |
| Convergence check        | `:530` *(`From cycle 3 onward, if \`HIGH_N > 0\``)*               | HIGH was 0 on all 7 gates                             |
| Diminishing-returns exit | `:630` *(`` `HIGH_N == 0` **and** `HIGH_{N-1} == 0` ``)*          | needs every `file:` in `qa.testArtifactGlobs`         |
| Cosmetic residue (2b)    | `:685` heading                                                    | PASS-only; every task.143 gate read CONCERNS          |
| Gate-the-last-fix (2c)   | `:1351` *(`MEDIUM_N < MEDIUM_{N-1} < MEDIUM_{N-2}`)*              | declined twice as `medium-not-falling`                |
| Third strike             | `:814` *(`The permitted moves are exactly three`)*                | HIGH `file:` only                                     |
| Pre-strike shape         | `:825` *(`A recognisable pre-strike shape`)*                      | HIGH only                                             |

Two standing constraints bind any new guard. First, there is exactly one escalation path (`:1280`,
*There is deliberately no second escalation path*). Escalating a HIGH-0 run "would misreport finished
work as stalled" (`:580`); that is the task.110 precedent behind the Convergence precondition. Second,
a trigger must be checkable against the diff, never a field the constrained party fills in (`:859`,
*Why the trigger is `file:` and not a judgement field*).

**The engine** (`shared/resources/qa-diminishing-returns.js`: pure, a library rather than a CLI):
`readTopIssues` `:263`, `countRaised` `:608` (MEDIUM/LOW raised, `status: closed` included),
`classifyLoopRoute` `:662`, `module.exports` `:882`. Two properties matter here. The engine never
counts HIGH itself: `qa-diminishing-returns.test.mjs` *"the module source contains no HIGH-counting
logic"* reads the source to hold that. And the route table in `shared/resources/tests/qa-loop-route.test.mjs`
(`const ROWS = [`) is the spec that the loop prose is written from.

### Evidence — task.143's gates, read by the engine

Command (run 2026-09-24 on develop `e04de749`):

```bash
for g in docs/tasks/task.143.*/task.143.gate.*.yml; do command node -e '
  const {countRaised, readTopIssues} = require("./shared/resources/qa-diminishing-returns.js");
  const t = require("fs").readFileSync(process.argv[1], "utf8");
  const is = readTopIssues(t);
  console.log(process.argv[1].match(/gate\.(\d+)/)[1], JSON.stringify(countRaised(t)),
    is.filter(e => e.severity === "medium").map(e => e.file).join(","));' "$g"; done
```

| Gate | MEDIUM | MEDIUM `file:`s                                   | Narrowing signal (proposed) |
| ---- | ------ | ------------------------------------------------- | --------------------------- |
| 1    | 2      | `skills/qa-next/scripts/uat-status.mjs` ×2        | — (cycle 1)                 |
| 2    | 1      | `skills/qa-next/scripts/uat-status.mjs`           | **fires**                   |
| 3    | 2      | `skills/qa-next/scripts/uat-status.mjs` ×2        | **fires**                   |
| 4    | 0      | —                                                 | no (`no-medium`)            |
| 5    | 1      | `skills/qa-next/SKILL.md`                         | no (`no-medium`, gate 4)    |
| 6    | 1      | `skills/qa-next/SKILL.md`                         | **fires**                   |
| 7    | 0      | —                                                 | no (`no-medium`)            |

The same command over `docs/tasks/task.117.*` shows HIGH 0 on all six gates, with gates 1 and 2 raising
MEDIUMs only in `shared/resources/jira-sync.js`, which was that task's deliverable. The signal fires
there at cycle 2, and the right answer there is **patch**. Keying on `file:` cannot separate "narrowing
a side mechanism" from "refining the deliverable". That is why the signal is an **offer** and not a
constraint or a route (§ 10).

### Target Architecture

**`qa-fix` Step 2.6: Offer the structural move before another patch** (new, between Step 2.5 and
Step 3). It has two triggers:

- **(a)** the pipeline passes a narrowing-residue offer;
- **(b)** the Findings Summary shows a finding whose subject the previous cycle's fix edited. That is a
  fixer-side judgement, and it is allowed here because the step only *offers*. It exits nothing.

It has one four-row menu. The fix plan records the chosen move and the fix summary carries it in a
fixed shape:

| Move                        | When it is right                                                                                                                                                                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Consolidate the contract** | The subject is a record the skill passes between its own steps (a state file, run-state JSON or handoff record), or a rule stated at several sites. Define it once — a field / writer / readers table, ownership moved into the skill's script so a test holds it, or one statement plus citations plus a single-statement test (task.130) |
| **Scope the claim**         | The subject is a best-effort derivation (compatibility, migration, inference) that lacks the fact it needs. Flag the value `unverifiable`, document the limitation, or drop the precision; do not add a rule (task.143 cycles 3 and 6)            |
| **Waive**                   | As in Step 2.5, with the reason stated                                                                                                                                                                                                             |
| **Patch**                   | Allowed. The fix summary must say why neither structural move applies (for example, distinct defects in the deliverable itself, which is task.117's case)                                                                                        |

```
Narrowing residue: {subject} ({trigger: pipeline offer | repeat subject})
Move: consolidate | scope the claim | waive | patch — {one sentence why}
```

**`qa-fix` Step 3.5, documentation row 1.** Its population becomes every executed document that
restates the subject:

```bash
git grep -l -F -i -e '<subject phrase>' -- ':(glob)skills/*/SKILL.md' ':(glob)shared/resources/*.md'
```

`:(glob)` is load-bearing. Without it, git's pathspec `*` crosses `/`, and the population picks up
`shared/resources/tests/fixtures/**`. Running the command with `-e 'third.strike'` and no `:(glob)`
returned `shared/resources/tests/fixtures/report-lint/green/task.118.md`. The command also leaves out
the generated `skills/*/references/` copies, which are never the file to edit, and task history under
`docs/`. For task.124's rule, `-e 'who restores'` returns 5 files: the resume contract, step 0, and
the develop-task, develop-story and develop-bug SKILL.md. That is exactly the site set task.130
collapsed. The row also requires the population size in the fix summary, and when the population is
greater than 1 it points to Step 2.6's **consolidate** move. The row's lead paragraph changes from
"elsewhere in the same file" to "elsewhere, in this file or in another file that restates it".

**Engine: `classifyNarrowingResidue({cycle, highCounts, latestGateContent, previousGateContent})`**
(pure; does not count HIGH). It returns `{signal, reason, detail, file, ids}`. The signal fires only
when all of these hold:

1. `cycle >= 2`
2. `highCounts[N-1] === 0 && highCounts[N-2] === 0`. HIGH is an input, as the engine's rule requires.
   With HIGH present, the third strike and the Convergence check own the run, so the two signals are
   disjoint by construction.
3. Both gates raised at least one MEDIUM (raised, `status: closed` included, as `countRaised` counts).
4. Every MEDIUM entry in both gates names a `file:`, and there is exactly one distinct `file:` across
   them. A missing `file:` fails the rule: the signal needs positive evidence.

Reasons: `narrowing-residue`, `below-cycle-floor`, `high-counts-missing`, `high-findings-remain`,
`gate-unreadable`, `no-medium`, `medium-file-missing`, `medium-files-differ`.

**Loop document, 5b: `#### Narrowing-residue offer`** (new, after the third-strike rule and before
*Where the gate and QA report get committed*). It calls the predicate with `$CYCLE`,
`$HIGH_SEQUENCE_JSON`, `$GATE_N` and `$GATE_N1`, which the third-strike rule already binds. When
`signal` is true, it appends one prompt block to the `/qa-fix` invocation. The block names the file,
the two cycles and the MEDIUM ids, and says *"apply qa-fix Step 2.6"*. It **cites** the menu and does
not restate it (the obs #174 principle applied to this task's own text). No route, cycle-entry row or
escalation trigger changes.

### Same-class mechanism inventory (obs #103)

The engine already has predicates of this kind. `classifyDiminishingReturns` and `classifyLoopRoute`
each read gates and return a decision. `classifyNarrowingResidue` **sits beside** them rather than
extending `classifyLoopRoute`. A route decides where the loop goes next. This signal only changes what
5b tells `qa-fix`, and folding it into the route classifier would make every narrowing run a routing
question. The third-strike detector (`high_files()`, an awk in the loop document) is the other
same-class mechanism. The new predicate does **not** replace it and does not move it into the engine.
That detector reads HIGH, which the engine must not count.

---

## 4. Scope

### In Scope

- ✅ `skills/qa-fix/SKILL.md`: new Step 2.6; Step 3.5 documentation lead paragraph and row 1
- ✅ `shared/resources/qa-diminishing-returns.js`: `classifyNarrowingResidue`, `describeNarrowingResidue`, exports
- ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b *Narrowing-residue offer*
- ✅ Tests: the new predicate table, two route-table rows, the qa-fix section and population-command test, and the loop wiring test
- ✅ Fixtures: copies of task.143 gates 1–7 and task.117 gates 1–3, plus three synthetic gates
- ✅ `npm run bundle` output for develop-task / develop-story `references/`; CHANGELOG `[Unreleased]`

### Out of Scope

- ❌ **A new loop route or escalation trigger for narrowing residue.** An early HALT at cycle 3 on a
  HIGH-0 run is the misreport that `:580` forbids, and the file-keyed signal has a known false positive
  (task.117). See Open Question 1.
- ❌ **Obs #172 improvement 3**: create-task / review-task requiring a migration task to state which cases
  are exact and which are best effort. That is an authoring-side check with its own sites and test (the
  task.145 shape). It is independently shippable, so it is a separate task (Open Question 2).
- ❌ develop-bug's verify loop. It writes no gates, so the predicate has nothing to read.
- ❌ Moving the HIGH third-strike detector (`high_files()`) into the engine.
- ❌ Editing the `file:`-reader notes in `qa-gate`, `qa-task` and `qa-story` (population:
  `git grep -l -i -e 'third-strike rule' -- ':(glob)skills/*/SKILL.md' ':(glob)shared/resources/*.md'`
  → the loop document, `qa-gate`, `qa-story`, `qa-task`). They stay true, because the rule they
  describe is unchanged. A copied-forward MEDIUM would make the offer fire spuriously, and the cost of
  that is one sentence in a fix summary, not a refused fix.

---

## 5. Breaking Changes

None. The change is additive. `classifyLoopRoute`'s inputs and outputs are unchanged. The new predicate
is a new export. The new `/qa-fix` prompt block and the new fix-summary lines are additions. No gate
field, cycle-entry row, route or escalation trigger changes.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.148.plan.structural-move-before-prose-patch.md](task.148.plan.structural-move-before-prose-patch.md)

### Phase 1: engine predicate (Risk: Low)

**Files**: `shared/resources/qa-diminishing-returns.js`, `shared/resources/tests/qa-narrowing-residue.test.mjs`, `shared/resources/tests/fixtures/qa-narrowing-residue/`

- [ ] Add `classifyNarrowingResidue` and `describeNarrowingResidue`; export both
- [ ] HIGH is read only from `highCounts`, so the engine's source guard stays green
- [ ] Fixture table of 13 rows (listed in § 8), each mutation-proved

### Phase 2: route-table pins (Risk: Low)

**Files**: `shared/resources/tests/qa-loop-route.test.mjs`

- [ ] Add 2 rows to `ROWS` pinning that task.143's shape still routes `continue` (§ 8)

### Phase 3: loop wiring (Risk: Medium)

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`

- [ ] Add `#### Narrowing-residue offer` in 5b after the third-strike rule, with the `command node -e` call and the prompt block
- [ ] The prompt block cites `qa-fix` Step 2.6 and does not restate its menu
- [ ] `npm run bundle` refreshes both `references/` copies

### Phase 4: qa-fix (Risk: Low)

**Files**: `skills/qa-fix/SKILL.md`, `tests/qa-fix-structural-move.test.js`

- [ ] Add Step 2.6, with its two triggers, the four-move menu and the fixed fix-summary shape; cite obs #167 and #172
- [ ] Step 3.5: change the lead paragraph to "in this file or in another file that restates it"; row 1 gets the population command, the population-size requirement and the pointer to Step 2.6; cite obs #174
- [ ] Step 3.5 row 1: the fix summary records the population command and every hit with its disposition (`Probe:` block: command, then one line per hit, `updated` or `unaffected — {why}`). A documentation fix whose summary has no `Probe:` block has not run the probe. Cite obs #177

### Phase 5: docs and validation (Risk: Low)

**Files**: `CHANGELOG.md`

- [ ] Cite `(task 148)` under CHANGELOG `[Unreleased]`
- [ ] Run `npm run ci:fast`, `npm run bundle:check`, and `npm run validate` on qa-fix, develop-task and develop-story

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/qa-diminishing-returns.js`: new predicate and describer
2. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: 5b Narrowing-residue offer
3. ✅ `skills/qa-fix/SKILL.md`: Step 2.6; Step 3.5 lead paragraph and row 1

### Files to Add (Tests and Fixtures)

4. ✅ `shared/resources/tests/qa-narrowing-residue.test.mjs` (covered by the `shared/resources/tests/*.test.mjs` glob)
5. ✅ `shared/resources/tests/fixtures/qa-narrowing-residue/`: `task143-gate-{1..7}.yml`, `task117-gate-{1..3}.yml`, `medium-no-file.yml`, `medium-closed.yml`, `medium-two-files.yml`, `README.md`
6. ✅ `tests/qa-fix-structural-move.test.js` (covered by the `tests/*.test.js` glob)
7. ✅ `evals/shared/tests/qa-narrowing-offer-wiring.test.mjs` (covered by the `evals/shared/tests/*.test.mjs` glob)

### Files to Modify (Tests)

8. ✅ `shared/resources/tests/qa-loop-route.test.mjs`: 2 rows

### Generated (never edited by hand; `npm run bundle`)

9. `skills/develop-task/references/qa-diminishing-returns.js`, `skills/develop-story/references/qa-diminishing-returns.js`
10. `skills/develop-task/references/develop-pipeline-step-5-6-qa-loop.md`, `skills/develop-story/references/develop-pipeline-step-5-6-qa-loop.md`

### Files to Modify (Documentation)

11. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests: the predicate (`shared/resources/tests/qa-narrowing-residue.test.mjs`)

This is a row table in the shape of `qa-loop-route.test.mjs`. Each row is `(label, input, signal, reason)`:

| #   | Input                                                     | Expected                                   |
| --- | --------------------------------------------------------- | ------------------------------------------ |
| 1   | task.143 gates 1→2, cycle 2, HIGH `[0,0]`                  | fires, `file` = `…/uat-status.mjs`         |
| 2   | task.143 gates 2→3, cycle 3, HIGH `[0,0,0]`                | fires                                      |
| 3   | task.143 gates 3→4, cycle 4                                | `no-medium`                                |
| 4   | task.143 gates 4→5, cycle 5                                | `no-medium`                                |
| 5   | task.143 gates 5→6, cycle 6                                | fires, `file` = `skills/qa-next/SKILL.md`  |
| 6   | task.143 gates 6→7, cycle 7                                | `no-medium`                                |
| 7   | task.143 gate 1 only, cycle 1                              | `below-cycle-floor`                        |
| 8   | task.143 gates 1→2 with HIGH `[1,0]`                       | `high-findings-remain` (HIGH is an input)  |
| 9   | task.117 gates 1→2, cycle 2                                | fires: the documented deliverable case     |
| 10  | task.117 gates 2→3, cycle 3                                | `medium-files-differ`                      |
| 11  | `medium-no-file.yml` twice                                 | `medium-file-missing`                      |
| 12  | `medium-closed.yml` twice (MEDIUM entries `status: closed`) | fires: raised, not open, is what counts    |
| 13  | latest gate `null`                                         | `gate-unreadable`                          |

It also includes a never-throws group (`undefined`, `{}` and non-array `highCounts`), and one assertion
that `describeNarrowingResidue` names the file and the two cycles.

Command: `command node --test shared/resources/tests/qa-narrowing-residue.test.mjs`

### Unit Tests: route-table pins (`shared/resources/tests/qa-loop-route.test.mjs`)

These are the fixture rows added to `ROWS`. Both assert that the new signal is **not** a route:

- `"task.143 cycle 3 — narrowing residue on a CONCERNS gate still routes continue"`: cycle 3, HIGH
  `[0,0,0]`, gate `task143-gate-3.yml`, `budgetSpent: false` → `continue` / `not-a-pass-gate`.
- `"task.143 cycle 5 at the budget — the real run's 2c decline"`: cycle 5, HIGH `[0,0,0,0,0]`, MEDIUM
  `[2,1,2,0]`, gate `task143-gate-5.yml`, `budgetSpent: true`, `lastCycleAction` `Running qa-fix (cycle 5 of 5)`
  → `continue` / `medium-not-falling`.

### Section and behaviour tests: qa-fix (`tests/qa-fix-structural-move.test.js`)

- Extract Step 2.6 (from its heading to the next `### `). Assert that it has the four move names, the two
  triggers, the fix-summary shape (`Narrowing residue:` / `Move:`), and `obs #167` and `obs #172`.
- Extract Step 3.5. Assert that row 1 no longer says `Grep the file`, that it carries the population
  command, and that it names the population size and Step 2.6. Also assert that it requires the `Probe:`
  block (command plus per-hit disposition) and cites `obs #177`.
- **Behaviour**: extract the population command from the fenced `bash` block directly under the
  documentation table (row 1 points to it; a table cell cannot hold a fence), substitute a phrase, and
  **execute it** in a temporary git repository. The repository has the phrase in `skills/a/SKILL.md`,
  `skills/b/SKILL.md` and `shared/resources/x.md` (these count). It also has the phrase in
  `skills/a/references/x.md`, `shared/resources/tests/fixtures/y.md` and `docs/tasks/t.md` (these must
  not count). Assert exactly 3 paths.

### Wiring test: loop document (`evals/shared/tests/qa-narrowing-offer-wiring.test.mjs`)

- The 5b section contains `#### Narrowing-residue offer`, calls `classifyNarrowingResidue`, and names
  `qa-fix` Step 2.6.
- **Single statement**: the loop document has no `Scope the claim` or `Consolidate the contract` menu
  row. The menu lives only in `qa-fix`.
- **Behaviour**: extract the section's `command node -e` block and run it from a consumer-shaped
  temporary cwd. That cwd has `.agents/skills/develop-task/references/qa-diminishing-returns.js` copied
  in, because a snippet test needs a consumer-shaped `cwd`. Use `CYCLE=3`, `HIGH_SEQUENCE_JSON=[0,0,0]`,
  and `GATE_N` / `GATE_N1` set to the task.143 gate 3 and gate 2 fixtures. Assert `signal: true`.

### Regression

- `npm test`. The engine suite's group 7 source guard must stay green.
- `npm run bundle:check`, because the two `references/` copies must match their sources.

### Behavioural evidence (recorded, not automated)

The qa-fix tests prove that Step 2.6 is **stated** and that its population command **works**. They do
not prove that a fixer **chooses well**. The implementation report records one hand run: `/qa-fix`
against a scratch copy of task.143's gate 3 with the narrowing prompt block appended. The fix plan is
expected to record a Step 2.6 move, and the report says which one.

---

## 9. Success Criteria

### Functional

- [ ] `classifyNarrowingResidue` fires on task.143 at cycles 2, 3 and 6 and at no other cycle: rows 1–7 of `qa-narrowing-residue.test.mjs`
- [ ] The predicate declines on HIGH present, on files that differ, on a missing `file:` and on unreadable input, and it counts closed MEDIUMs: rows 8, 10, 11, 12 and 13 of `qa-narrowing-residue.test.mjs`
- [ ] `classifyLoopRoute` is unchanged on task.143's shape: the 2 new `ROWS` in `qa-loop-route.test.mjs`
- [ ] The loop's 5b offer runs from a consumer-shaped cwd and returns `signal: true` on task.143 cycle 3: `qa-narrowing-offer-wiring.test.mjs`
- [ ] `qa-fix` Step 2.6 carries the triggers, the four moves and the fix-summary shape: `qa-fix-structural-move.test.js`
- [ ] The Step 3.5 population command returns exactly the 3 restating files in the fixture repository: `qa-fix-structural-move.test.js`
- [ ] Step 3.5 row 1 requires a `Probe:` block recording the command and every hit's disposition, and cites obs #177: `qa-fix-structural-move.test.js`

### Performance

- [ ] The predicate and route tests run in under one second (pure, no I/O in the engine)
- [ ] The git-fixture and snippet tests use only a temporary directory and no network

### Code Quality

- [ ] Every assertion is mutation-proved, and the implementation report records each result:
  - drop condition 2 → row 8 goes red;
  - use open-only counting → row 12 goes red;
  - allow two files → row 10 goes red;
  - drop `:(glob)` → the population test counts 4 and goes red;
  - restore `Grep the file` → the qa-fix test goes red;
  - delete the `Probe:` block requirement → the qa-fix test goes red;
  - paste the menu into the loop document → the single-statement test goes red;
  - fold the signal into `classifyLoopRoute` as a route → a route-table row goes red.
- [ ] `qa-diminishing-returns.test.mjs` group 7 stays green, because the engine still counts no HIGH
- [ ] `npm run ci:fast`, `npm run bundle:check` and `npm run validate` pass for qa-fix, develop-task and develop-story

### Migration

- [ ] CHANGELOG `[Unreleased]` cites `(task 148)`
- [ ] The implementation report records the Step 2.6 hand run
- [ ] Observations #167, #172, #174 and #177 are set to `actioned` on merge. #172's resolution names Open Question 2 as the remaining work.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The offer fires on a loop that is refining its deliverable**
   - Risk: task.117 gates 1→2 fire, but the findings were distinct defects in the deliverable. A fixer
     could read the offer as a push to scope a claim that should simply be fixed.
   - Probability: Medium · Impact: Low
   - Mitigation: **patch** is a named move, and its "why" line is required. The fixture table records
     task.117 as a firing row with that answer. The signal changes no route, so a false positive costs
     one line in the fix summary.
2. **Merge conflict with task.146 in qa-fix Step 3.5**
   - Risk: both tasks edit Step 3.5. task.146 appends a table after the documentation table, and this
     task rewrites that table's row 1 and lead paragraph.
   - Probability: Medium · Impact: Low
   - Mitigation: the edits are adjacent but not overlapping. Whichever task lands second rebases. Each
     task's test extracts the section by heading, not by line number.

### Low Risk Areas

1. **Snippet-test cwd**: a loop-document snippet resolves `./.agents/skills/…`. The wiring test builds that
   path in a temporary directory rather than relying on the repository's gitignored symlink.
2. **Pathspec portability**: the population test executes the command itself, so a git that ignored
   the `:(glob)` magic would fail it rather than pass silently.

### Open Questions (recorded instead of asked; defaults taken)

1. **Should an unanswered narrowing offer become an escalation trigger?** If the signal fires on two
   consecutive cycles *after* a structural move was recorded, the move did not work. Default: **no**,
   because this task keeps one escalation path and changes no route. Revisit with evidence from runs
   that use Step 2.6.
2. **Obs #172 improvement 3** (migration tasks declare exact vs best-effort cases at authoring). Default:
   a separate task in the task.145 shape, covering create-task Step 3.5, review-task Step 3 and a
   population test. It is not cut here.
3. **Window of 2 gates or 3.** Default: **2**, which fires at task.143 cycles 2, 3 and 6. A 3-gate window
   fires only at cycle 3 and would have missed cycle 6. The window is one constant in the predicate.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: the offer derails fixes in normal use (fixers scope claims that should have been fixed),
  or the wiring snippet fails in a consumer project.
- **Steps**: revert the PR, then run `npm run bundle` so the `references/` copies follow the reverted
  sources.
- **Validation**: `npm test` and `npm run bundle:check` pass on the reverted tree.

### Partial Rollback (1–2 hours)

- Remove only the loop document's *Narrowing-residue offer* subsection and keep the exported predicate.
  qa-fix Step 2.6 trigger (b) and the Step 3.5 population row stand alone.

### Forward Fix

- Tighten the predicate's conditions (for example, require the file to be outside the task's Files
  Summary) and add the counter-example as a fixture row.

### Rollback Triggers

- **Critical**: none. This is advisory; no route changes.
- **Non-critical**: noisy offers. Fix forward.

---
<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-24 | 1.0     | Initial draft — cut from observations #167, #172, #174 (2026-09-24 observation review)       | create-task |
| 2026-09-25 | 1.1 | Scope widened: obs #177 folded in. Step 3.5 row 1 also requires a Probe: block (command plus per-hit disposition), with a matching test assertion, mutation and success criterion | observe-work |
<!-- change-log-end -->

---

## Progress Tracking

- [ ] Phase 1: engine predicate
- [ ] Phase 2: route-table pins
- [ ] Phase 3: loop wiring
- [ ] Phase 4: qa-fix
- [ ] Phase 5: docs and validation

---

## References

- Observation #167: a skill-internal record described only in prose yields one defect per QA cycle
- Observation #172: the QA loop spent its budget narrowing a best-effort migration mechanism
- Observation #174: the qa-fix Step 3.5 documentation probe greps the edited file
- Observation #177: the qa-fix Step 3.5 probe was read, not run, and a same-file restatement survived the fix (task.145 QA cycle 2 → 3, CR3-2)
- task.143: [`task.143.qa-next-state-file-owned-by-the-tool.md`](../task.143.qa-next-state-file-owned-by-the-tool/task.143.qa-next-state-file-owned-by-the-tool.md) (PR #475). Its implementation report's Issues Log and QA Iteration History are the worked evidence.
- task.130: the one-statement-plus-citations collapse, held by `shared/resources/tests/who-restores-single-statement.test.mjs`
- task.146: [`task.146.identity-rule-fix-probe.md`](../task.146.identity-rule-fix-probe/task.146.identity-rule-fix-probe.md), which also edits qa-fix Step 3.5

---

## Notes

### Important Reminders

- QA artifacts land in this directory: `task.148.qa.{N}.structural-move-before-prose-patch.md`,
  `task.148.gate.{N}.structural-move-before-prose-patch.yml`, and bug reports `task.148.bug.{N}.{name}.md`.
- Edit `shared/resources/` sources only. The `skills/*/references/` copies are generated by `npm run bundle`.
