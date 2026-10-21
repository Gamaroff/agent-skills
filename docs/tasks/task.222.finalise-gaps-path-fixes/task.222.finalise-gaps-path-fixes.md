---
id: task.222
title: "finalise gaps-path fixes"
type: task
description: "When /finalise stops on DoD gaps, count only the gaps in the plain-language lead, and hold the pipeline lock at Step 7 instead of advancing it to Step 8."
tags: [finalise, develop-task, pipeline-lock, stakeholder-summary, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-21
updated: 2026-10-21
assignee:
estimated_effort_hours: 8
github_issue: 717
---

# Technical Task: finalise gaps-path fixes

**Status:** Ready for Review

**Review**: ✅ All review recommendations from `task.222.review.1.finalise-gaps-path-fixes.md` implemented 2026-10-21

**GitHub Issue**: [#717](https://github.com/Gamaroff/agent-skills/issues/717)

---

## 1. Overview

When `/finalise` stops on Definition of Done gaps, it gets two things wrong:

- the gaps comment overstates how many gaps there are;
- the pipeline lock moves to Step 8 as if the DoD had passed.

This task fixes both. It changes only the gaps path. The accepted path behaves as it does today.

**Scope**: `/finalise` Step 8.5's gap count, Step 8.4's gap-report rule, the `--skill finalise` arm of `advance-pipeline-lock.sh`, finalise's Pipeline Lock Cooperation block, their tests, and the docs that restate the lock advance.

**Key deliverables**:

1. A gap count that counts only the gaps: the list items under `### Missing Criteria`.
2. A lock advance to Step 8 that happens only when the DoD file reads `**Final Status:** ✅ ACCEPTED`.
3. Tests that reproduce both defects on today's code and pass after the fix.

---

## 2. Motivation

### Current Problems

1. **The gaps lead tells a non-technical reader there are more gaps than there are** (obs #24). Step 8.5 counts every `- [ ]` line in the whole `## Definition of Done - Gaps Identified` section. Step 8.4's template puts checkboxes under both `### Missing Criteria:` and `### Next Steps:`, so each gap is counted twice or more. Measured with Step 8.5's own awk range on the committed gap sections:

   | Run | Real gaps | Lead said |
   | --- | --- | --- |
   | task.181 (`d4f96471`) | 3 | 5 |
   | task.199 (`bce0ef11`) | 1 | 3 |
   | task.213 (issue #715 gaps comment, 2026-10-21) | 2 | 4 |

2. **Counting only `- [ ]` lines in Missing Criteria would undercount.** Step 8.4's own example (`skills/finalise/SKILL.md`, the `### Missing Criteria:` block under Step 8.4) lists 7 gaps, and 6 of them are `- ⚠️` lines with no checkbox. That example's PR comment says "7 of them". So the right unit is a list item under Missing Criteria, not a checkbox.

3. **A gaps halt leaves the lock at Step 8** (obs #79). `shared/resources/advance-pipeline-lock.sh` maps `finalise) NEXT=8 ;;` with no check of the outcome. Finalise's `## Pipeline Lock Cooperation` block runs that call as its last action, whether the DoD passed or not. The develop pipelines HALT at Step 7 on gaps (`shared/resources/develop-pipeline-step-7-finalise.md`, § "If DoD Gaps Are Found"). With the lock at 8, the resume reads the record as "Step 7 done".

4. **Four runs have worked around #79 by hand**, each writing in its implementation report that it skipped the call (`git grep -n "skill finalise" docs/tasks/`): task.173, task.199, task.213 and task.219. A rule that holds only because each session remembers to skip a step is not enforced.

### Benefits

1. **The gaps lead states the true number**: the one number a non-technical reader takes from the comment.
2. **The gap count has one definition**: a helper script, the way bug mode already has `fill-verification-complete.sh … count`.
3. **The lock means what it says**: Step 8 only after an accepted DoD. Resume after a gaps halt goes back to Step 7 without a judgement call.
4. **No per-run workaround**: the cooperation block runs on both paths and does the right thing.

---

## 3. Technical Background

### Current Architecture

**Gap count (Step 8.5, story/task arm).** `skills/finalise/SKILL.md`, Step 8.5's bash block (`GAP_COUNT=$(printf '%s' "$GAP_REPORT_BODY" | grep -c '^[[:space:]]*- \[ \]' || true)`):

- `GAP_REPORT_BODY` is the whole `## Definition of Done - Gaps Identified` section, cut out by `awk '/^## Definition of Done - Gaps Identified/{f=1;next} /^## /{f=0} f'`.
- The count feeds `stakeholder-summary-cli.js --stage dod-gaps --slot count=…`.
- The `dod-gaps` template (`shared/resources/stakeholder-summary.js`, `"dod-gaps": (s) =>`) renders `(${s.count} of them)` when the count is non-zero.
- The comment above the grep says it counts "across every section of the gap report" on purpose. That was obs #212's fix for *indented* boxes. It did not decide *which section* to count.

**Bug mode is already right.** Its arm calls `fill-verification-complete.sh "$DOD_PATH" count` (`shared/resources/fill-verification-complete.sh`). That script's header says "The gap list is ONE thing with ONE count", and it reads only the `- [ ]` lines under `## Step 5: Acceptance Decision`. This task gives story/task mode the same shape: one helper, one definition. It does not change bug mode.

**Gap report shape (Step 8.4).** The template's example, under `### Missing Criteria:`, has numbered category headings (`1. **Acceptance Criteria:**`). Under each heading are nested `- [ ]` or `- ⚠️` items. `### Next Steps:` follows, as `- [ ]` actions. The real reports in task.181, task.199 and task.213 all follow this shape.

**Lock advance.**

- `shared/resources/advance-pipeline-lock.sh`, in the `--skill)` case: `finalise)                   NEXT=8 ;;`. The header's mapping table says `finalise        → 8   (Step 7 done)`.
- `skills/finalise/SKILL.md`, `## Pipeline Lock Cooperation`, runs `bash .agents/skills/finalise/references/advance-pipeline-lock.sh --skill finalise 2>/dev/null || true` when `.claude/state/develop-pipeline.lock` exists.
- The DoD file's verdict is a single line, `**Final Status:** ✅ ACCEPTED` or `**Final Status:** ❌ GAPS IDENTIFIED - NOT ACCEPTED`:
  - story/task: appended at Step 7.1 or Step 8.1 (`skills/finalise/SKILL.md`, the `**Final Status:**` lines in both blocks);
  - bug mode: filled by `fill-verification-complete.sh` (`LINE='✅ ACCEPTED'` / `LINE='❌ GAPS IDENTIFIED - NOT ACCEPTED'`).
- Step 7.6b already asserts the accepted line on the pushed DoD (`FINAL_ASSERT_PATTERN='^\*\*Final Status:\*\* ✅ ACCEPTED'`). So the line is the existing, tested signal of acceptance for all three document kinds.

**Tests that pin today's behaviour.**

- `shared/resources/tests/step-8-completion-checklist.test.mjs`, test `"finalise's lock cooperation moves the record to step 8 before Step 7's tail runs"`: runs `--skill finalise` with no DoD and expects `current_step` 8. That premise test (task.160 CR5-1) must pass an accepted DoD after this task.
- The same file's mapping floor parses `^\s*([a-z|-]+)\)\s+NEXT=(\d+)` inside the `--skill)` case and requires `finalise → 8`. The arm must still start `finalise)` and set `NEXT=8` so the floor holds.
- `shared/resources/advance-pipeline-lock.test.sh`, `run_no_lock_split`: three `--skill finalise` calls with no lock. Their expectations (exit 0; stderr names `--restore` when a snapshot or claim exists) are unchanged.

**Docs that restate "`/finalise` moves the lock to 8".** These are true on the accepted path and false on the gaps path:

- `shared/resources/develop-pipeline-resume-contract.md` (Phase 0b, "because `/finalise` moves the lock to 8 as its last action");
- `shared/resources/develop-pipeline-step-8-commit.md` ("`/finalise` moves the lock to 8 as its last action");
- `shared/resources/develop-pipeline-remaining-work-banner.md` ("`/finalise` is one: it moves the lock to 8");
- `shared/resources/develop-pipeline-on-stop.sh` (the comments near `COMPLETION_LINE`, and the `COMPLETION_LINE` text itself);
- `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md` and `skills/develop-bug/SKILL.md` (the "Exception — a record at step 8" paragraph).

The search that defines this population (run from the repository root; bundled `references/` copies are regenerated, not edited):

```bash
git grep -nE "finalise[^|]{0,60}(moves|advances|move|advance)[^|]{0,30}(lock|it)( there| to 8)|lock reads 8 from the end of /finalise|finalise +→ 8" \
  -- 'shared/resources' 'skills/*/SKILL.md' 'skills/*/scripts' ':!skills/*/references/*'
```

On 2026-10-21 it returns the sites above plus these, which the literal `moves the lock to 8` misses:

- `shared/resources/develop-pipeline-on-stop.sh` lines 243 ("advances the lock to 8"), 252 ("The lock reads 8 from the end of /finalise"), 266 (`COMPLETION_LINE`, "/finalise moves it there") and 280 ("/finalise moves it to 8");
- `shared/resources/advance-pipeline-lock.sh` line 54 (the header mapping, Phase 3);
- test comments: `shared/resources/develop-pipeline-on-stop.test.sh` lines 125, 129, 185, and `shared/resources/tests/step-8-completion-checklist.test.mjs` lines 472, 764, 862.

**Wording two tests pin.** `step-8-completion-checklist.test.mjs` (`"the Stop hook and the resume contract describe Step 7's tail in the same words"`) and `develop-pipeline-on-stop.test.sh` (greps `at or below Step 7` and `Step 7's tail`) hold the Step 7 tail description. The qualifier goes on the lock clause ("on an accepted DoD, `/finalise` moves the lock to 8"), never inside the tail list.

**A second test pins today's gap count.** `evals/shared/tests/finalise-bug-mode.test.mjs`, test `"8.5 for a story/task still reads the document body, bounded at the next ## (task.152)"`, runs Step 8.5's extracted block on a gap section of bare `- [ ]` lines with no `### Missing Criteria` subsection and expects `GAP_COUNT=3`. After Phase 2 the helper HALTs on that fixture. Found with `git grep -ln "GAP_REPORT_BODY\|Gaps Identified\|GAP_COUNT" -- '*.test.*'`. The same file's `gapsCommentBlock()` extracts Step 8.5 and runs it from a consumer-shaped root; § 8's integration test reuses it rather than writing a second extractor.

### Target Architecture

**New helper `shared/resources/dod-gap-count.sh <doc-file>`.**

- It prints the number of list items (`^[[:space:]]*- `) between `### Missing Criteria` and the next `###` or `##` heading, inside `## Definition of Done - Gaps Identified`.
- It writes nothing. Every HALT goes to stderr, with exit 1, so a command substitution never swallows a reason.
- It HALTs when the section or the subsection is missing, and when the count is 0. A gaps report with no gaps is a defect, not a zero.
- Step 8.5's story/task arm calls it, the same way the bug arm calls `fill-verification-complete.sh … count`.
- Step 8.4's prose gains one rule: each gap is one list item under `### Missing Criteria:`, and `### Next Steps:` items are actions, not gaps.

**`advance-pipeline-lock.sh --skill finalise --dod <path>`.**

- The arm still reads `finalise) NEXT=8 ;;`. Before the write, a guard checks `--dod`: the file must exist and hold a line matching `^\*\*Final Status:\*\* ✅ ACCEPTED`.
- If the guard fails (no `--dod`, a missing file, or a GAPS or unfilled status), the helper prints `advance-pipeline-lock: finalise not accepted (<reason>) — lock held at step <current>` to stderr and exits 0. The lock is unchanged.
- Exit 0 is kept because `--skill` is a self-advance that must never fail the sub-skill (the file header's "Behaviour" list).

**Finalise's cooperation block** binds `DOD_PATH` (refusing an unsubstituted placeholder, like Step 8.5's block) and passes `--dod "$DOD_PATH"`. It stays the last action on both paths. The helper decides; the prose holds no outcome rule an agent could forget.

**Doc sweep.** Each restatement above gains the condition "when it accepts" (or "on an accepted DoD"). The resume rule built on it is unchanged: an unfinished Step 7 row still wins.

### Important Clarifications

- **Why the DoD file and not the document's `status: accepted`.** obs #79 proposed reading the work item's status. A bug is never `accepted` (Part B writes `closed`), and a bug's DoD lives in its parent's directory. The DoD's `**Final Status:**` line is written for all three document kinds and is already asserted at 7.6b. One signal covers story, task and bug.
- **Why a missing `--dod` holds rather than advances.** An unproven acceptance should fail toward re-running Step 7. That costs one `/finalise` re-run. Failing the other way skips Step 7, which is the defect.
- **The accepted path's timing does not change.** On acceptance the lock still reaches 8 before Step 7's tail runs. That is why the swept docs keep their "an unfinished Step 7 row still wins" rule.
- **Step 8.3's Change Log row** ("DoD incomplete — N gaps identified") is written before 8.4 writes the body. Deriving it from the helper would reorder Steps 8.3 and 8.4. That is out of scope; see § 4.
- **The mapping floor's regex spans more than the arm.** `step-8-completion-checklist.test.mjs` captures `/\n {2}--skill\)\n([\s\S]*?)\n {4}esac/`. The first `  --skill)` in the helper is the pre-jq `commit-changes` block, so the capture runs from there to the first 4-space `esac`. Place the guard so that no 4-space `esac` comes before the `finalise)` arm (for example, set a flag in the arm and check it after `CURRENT` is read).

### Resume states the lock rule must hold in

The resume contract (`develop-pipeline-resume-contract.md`, Phase 0b) reads the lock's `current_step`, the halt snapshot's `halt_step` and an orphaned claim. After this task:

| State | Lock / record | Resume |
| --- | --- | --- |
| `/finalise` accepted, Step 7's tail unfinished | 8 (unchanged) | The step-8 rule: the first unfinished row at or below Step 7 wins |
| `/finalise` found gaps, orchestrator HALTed at Step 7 | 7 (was 8); snapshot `halt_step` 7 | Resume at 7; task.170's "Re-enter QA at 5a" offer keys on `halt_step` 7 and a `❌ GAPS` DoD, so it now fires from the record as well as from the orchestrator's `halt_step` argument |
| Step 8a fix-and-recheck accepted on its second pass | DoD reads `✅ ACCEPTED`, so 7 → 8 | As the accepted row |
| PreCompact pause during Step 7, before the cooperation block | 7 either way | Resume at 7 (unchanged) |
| `/finalise` re-run after a gaps halt writes `dod.{N+1}` | The cooperation block must name the **newest** DoD; an older `dod.{N}` reading GAPS holds at 7 | Holds at 7 at worst; the orchestrator's own `advance-pipeline-lock.sh 8` recovers (§ 10, Medium risk 1) |

---

## 4. Scope

### In Scope

✅ **Gap count**: `shared/resources/dod-gap-count.sh`, the Step 8.5 story/task arm, the Step 8.4 rule sentence and its bundled copy.
✅ **Lock hold**: the `--dod` guard on `--skill finalise`, the helper header's mapping line, finalise's cooperation block.
✅ **Tests**: new unit tests for both; the task.160 premise test updated to pass an accepted DoD; a gaps-shaped DoD test asserting the lock stays at 7.
✅ **Doc sweep**: every site the § 3 restatement search returns, qualified "on acceptance".
✅ **CHANGELOG**: a `(task 222)` entry under `[Unreleased]` → `### Fixed`.

### Out of Scope

❌ **Step 8.3's Change Log gap count**: it is written before the body exists, so deriving it needs a step reorder. Record it as a follow-up if wanted.
❌ **Bug mode's count**: already one definition (`fill-verification-complete.sh count`), and correct.
❌ **Other sub-skills' self-advances** (`develop → 4`, `create-pr → 5`): their tails can also halt one step behind the lock (task.164 gate.2), but that is a different defect with no gaps outcome.
❌ **The PASS-lead defect** (obs #84): a different engine (`GATE_MEANING`), a different stage.

---

## 5. Breaking Changes

### Breaking Change 1: `--skill finalise` without `--dod` no longer advances

**What Changed**: `advance-pipeline-lock.sh --skill finalise` with no `--dod`, or with a DoD that does not read ACCEPTED, now holds the lock and exits 0. It used to advance to 8.

**Before**:

```bash
bash .agents/skills/finalise/references/advance-pipeline-lock.sh --skill finalise   # lock 7 → 8, always
```

**After**:

```bash
bash .agents/skills/finalise/references/advance-pipeline-lock.sh --skill finalise --dod "$DOD_PATH"   # 7 → 8 only on ✅ ACCEPTED
```

**Impact**: The only shipped caller is finalise's cooperation block, updated in Phase 3. A consumer whose installed finalise is older than its installed helper would hold at 7 after an accepted DoD. The orchestrator's own `advance-pipeline-lock.sh 8` after it reads `status: accepted` still moves the lock (develop-task SKILL.md, "advancing the lock to the next step"). So the cost is no self-advance, not a stuck run.

**Migration Path**: Re-install the skills together (`setup-consumer.sh`). Both files ship in the same skill bundle (`skills/finalise/references/`), so a normal install updates both at once.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.222.plan.finalise-gaps-path-fixes.md](task.222.plan.finalise-gaps-path-fixes.md)

### Phase 1: Reproduce both defects in tests (red)

**Risk Level**: Low

**Files**:

- `shared/resources/tests/finalise-gaps-path.test.mjs` (new)

**Changes**:

- [x] Gap count fixtures, using the 8.4 template's shape: the task.213 shape (2 gaps, 2 Next Steps), the task.181 shape (3 and 2), the task.199 shape (1 and 2), and the 8.4 example (7 list items, 6 of them `- ⚠️`, plus 7 Next Steps). Assert today's Step 8.5 grep returns 4, 5, 3 and 8 against these fixtures. That is the known failure the new check must reproduce first.
- [x] Lock fixture: a lock at `current_step: 7` plus a DoD whose `**Final Status:**` reads `❌ GAPS IDENTIFIED - NOT ACCEPTED`. Assert that today `--skill finalise` moves it to 8 (red against the target behaviour).

**Dependencies**: None

---

### Phase 2: One gap-count definition

**Risk Level**: Low

**Files**:

- `shared/resources/dod-gap-count.sh` (new)
- `skills/finalise/SKILL.md` (Step 8.4 rule, Step 8.5 story/task arm)

**Changes**:

- [x] Write `dod-gap-count.sh <doc-file>`: list items under `### Missing Criteria` inside the gaps section; HALT to stderr (exit 1) on a missing section, a missing subsection or a zero count.
- [x] Step 8.5's story/task arm calls it as `GAP_COUNT=$(bash .agents/skills/finalise/references/dod-gap-count.sh "$DOC_FILE") || exit 1`, and its comment is rewritten to say what it counts.
- [x] Step 8.4 gains the one-sentence rule: each gap is one list item under `### Missing Criteria:`; Next Steps are actions, not gaps.
- [x] Phase 1's fixtures now return 2, 3, 1 and 7.

**Dependencies**: Phase 1

---

### Phase 3: Hold the lock unless the DoD reads ACCEPTED

**Risk Level**: Medium

**Files**:

- `shared/resources/advance-pipeline-lock.sh`
- `skills/finalise/SKILL.md` (`## Pipeline Lock Cooperation`)

**Changes**:

- [x] Parse an optional `--dod <path>` after `--skill <name>`. The finalise arm keeps `finalise) NEXT=8 ;;` (the step-8 checklist test's mapping floor parses it), followed by a guard that holds the lock unless the DoD has the ACCEPTED line.
- [x] Update the header: the mapping line reads `finalise → 8 (Step 7 done; only with --dod on a ✅ ACCEPTED DoD, else hold)`, and the usage line shows `--dod`.
- [x] Rewrite the cooperation block: bind `DOD_PATH`, refuse a `{…}` placeholder, and pass `--dod "$DOD_PATH"`. Add one sentence: on a gaps outcome the helper holds the lock at 7, so the block runs on both paths.
- [x] Phase 1's lock fixture now stays at 7; an ACCEPTED DoD still moves 7 → 8.

**Dependencies**: Phase 1

---

### Phase 4: Existing tests, doc sweep, bundle

**Risk Level**: Low

**Files**:

- `shared/resources/tests/step-8-completion-checklist.test.mjs`
- every site the § 3 restatement search returns
- `evals/shared/tests/finalise-bug-mode.test.mjs`
- `CHANGELOG.md`

**Changes**:

- [x] The task.160 premise test writes an ACCEPTED DoD and passes `--dod`. Add a sibling assertion that the same call without `--dod` holds at 7.
- [x] `evals/shared/tests/finalise-bug-mode.test.mjs`: move the story/task 8.5 test's fixture to the 8.4 shape (`### Missing Criteria:` items, then `### Next Steps:` boxes) and keep its `GAP_COUNT=3` and "not a gap" assertions.
- [x] Qualify every site the § 3 restatement search returns with "when it accepts" (or "on an accepted DoD"), comments included. Put the qualifier on the lock clause, not in the Step 7 tail wording two tests pin. Leave the "unfinished Step 7 row still wins" rule as it is.
- [x] `npm run bundle`, then `npm run bundle:check`: `dod-gap-count.sh` lands in `skills/finalise/references/`, and the updated helper reaches every skill that bundles it.
- [x] CHANGELOG `[Unreleased]` → `### Fixed`, citing `(task 222)`.

**Dependencies**: Phases 2 and 3

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/advance-pipeline-lock.sh` — the `--dod` guard on the finalise arm; header mapping and usage lines
2. ✅ `skills/finalise/SKILL.md` — Step 8.4 rule, Step 8.5 story/task count, `## Pipeline Lock Cooperation` block

### Files to Create

3. ✅ `shared/resources/dod-gap-count.sh` — the one story/task gap-count definition
4. ✅ `shared/resources/tests/finalise-gaps-path.test.mjs` — gap count and lock-hold tests (already in the `shared/resources/tests/*.test.mjs` glob in `package.json`'s `test` script)

### Files to Modify (Tests)

5. ✅ `shared/resources/tests/step-8-completion-checklist.test.mjs` — the premise test passes an ACCEPTED DoD; a no-`--dod` hold assertion; comment wording
5a. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` — the story/task 8.5 fixture moves to the 8.4 shape; its `gapsCommentBlock()` hosts the § 8 integration test
5b. ✅ `shared/resources/develop-pipeline-on-stop.test.sh` — comment wording (lines 125, 129, 185)

### Files to Modify (Documentation)

6. ✅ `shared/resources/develop-pipeline-resume-contract.md` — Phase 0b qualifier
7. ✅ `shared/resources/develop-pipeline-step-8-commit.md` — "What the record covers" qualifier
8. ✅ `shared/resources/develop-pipeline-remaining-work-banner.md` — HALT rule qualifier
9. ✅ `shared/resources/develop-pipeline-on-stop.sh` — comments and `COMPLETION_LINE` qualifier
10. ✅ `skills/develop-task/SKILL.md` — step-8 exception qualifier
11. ✅ `skills/develop-story/SKILL.md` — step-8 exception qualifier
12. ✅ `skills/develop-bug/SKILL.md` — step-8 exception qualifier
13. ✅ `CHANGELOG.md` — `(task 222)` entry

### Generated (by `npm run bundle`, committed)

14. ✅ `skills/*/references/advance-pipeline-lock.sh`, `skills/finalise/references/dod-gap-count.sh`, and the bundled copies of the swept `shared/resources/*.md`

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `dod-gap-count.sh` and the `--skill finalise` guard, run under bash and zsh, like `advance-pipeline-lock.test.sh`.

**Actions**:

- [x] Gap count: the four fixtures from Phase 1 return 2, 3, 1 and 7.
- [x] Gap count refusals: no gaps section, no `### Missing Criteria`, and zero items each exit 1 with the reason on stderr and nothing on stdout.
- [x] **Control case** (obs #176): a Missing Criteria list whose items are `- ⚠️` and `- [x]` (none are `- [x]`), with Next Steps that do have `- [x]`. It must count the Missing Criteria items, not the Next Steps boxes. No fixture is copied from the three incidents.
- [x] Lock: lock at 7 + ACCEPTED DoD → 8. Lock at 7 + GAPS DoD → 7, stderr names the reason. Lock at 7 + DoD with the template's unfilled `{✅ ACCEPTED | ❌ …}` placeholder → 7. Lock at 7 + no `--dod` → 7. Lock at 7 + `--dod` naming a missing file → 7. Every case exits 0.
- [x] Lock, bug-mode shape: a DoD built from `skills/finalise/assets/bug-dod-template.md` and filled by `fill-verification-complete.sh … accepted` → 8; filled with `gaps` → 7.

**Command**: `node --test shared/resources/tests/finalise-gaps-path.test.mjs shared/resources/tests/step-8-completion-checklist.test.mjs && bash shared/resources/advance-pipeline-lock.test.sh`

### Integration Tests

**Scope**: The Step 8.5 block and the cooperation block as written in `SKILL.md`, executed rather than grepped.

**Actions**:

- [x] Extract Step 8.5's story/task arm from `skills/finalise/SKILL.md` with `finalise-bug-mode.test.mjs`'s `gapsCommentBlock()` and run it against the task.213-shaped fixture. Assert the rendered lead says "(2 of them)".
- [x] Extract the cooperation block, substitute `DOD_PATH`, and run it in a temp repo with a lock at 7: a GAPS DoD stays at 7, an ACCEPTED DoD moves to 8.

### Mutation proof

- [x] Revert `dod-gap-count.sh` to the old whole-section grep: the count tests go red.
- [x] Delete the `--dod` guard: the gaps-lock test goes red.
- [x] Restore `--skill finalise` without `--dod` in the cooperation block: the extracted-block test goes red (it holds at 7 on an ACCEPTED DoD).

### Performance Tests

Not applicable. Both helpers read one small file.

---

## 9. Success Criteria

### Functional

- [x] `dod-gap-count.sh` returns 2 for the task.213 shape, 3 for task.181, 1 for task.199 and 7 for the Step 8.4 example. — `finalise-gaps-path.test.mjs` ("counts only the Missing Criteria items: 2, 3, 1 and 7"; the 8.4 example is read out of SKILL.md).
- [x] Step 8.5's rendered `dod-gaps` lead for a two-gap report reads "(2 of them)". — `finalise-bug-mode.test.mjs` ("8.5's lead for a two-gap report with two Next Steps reads \"(2 of them)\""), Step 8.5 extracted and run.
- [x] `--skill finalise --dod <GAPS DoD>` leaves `current_step` at 7 and exits 0. — `finalise-gaps-path.test.mjs` ("holds the lock at 7, exit 0, on a GAPS DoD").
- [x] `--skill finalise --dod <ACCEPTED DoD>` moves `current_step` from 7 to 8. — `finalise-gaps-path.test.mjs` and the updated task.160 premise test in `step-8-completion-checklist.test.mjs`.
- [x] `--skill finalise` with no `--dod`, a missing file, or an unfilled status holds at 7 and exits 0. — `finalise-gaps-path.test.mjs`, one test per case.
- [x] A bug-mode DoD filled `accepted` advances; filled `gaps`, it holds. — `finalise-gaps-path.test.mjs` (template filled by `fill-verification-complete.sh`).
- [x] `run_no_lock_split`'s three `--skill finalise` cases pass unchanged. — `advance-pipeline-lock.test.sh`: 72 passed, 0 failed (bash; zsh runs in CI).

### Performance

- [x] `npm test` wall time does not rise by more than 2% (the new file is unit-sized). — measured: the new file 1851 ms plus the three new `finalise-bug-mode` tests 797 ms (file load included) ≈ 2.6 s, against a 300.4 s `npm test` on .249 (`# duration_ms 300402`) ≈ 0.9%. Command: a `date +%s%N` wrapper around `node --test` on each, load average 9.43 (`/proc/loadavg`), working tree on base `f67e6a8e`.

### Code Quality

- [x] `npm test` passes, with 0 failures. — on .249 (`npm run ci:fast`, local memory too low): 6135 pass, 1 fail. The one failure, `security-probe.test.mjs` "task.167's 13 cases against the shipped fast-gate precondition", is environmental: .249 has npm 9.2.0, whose update-notifier writes `home/.npm/_update-notifier-last-checked`; it fails identically on the untouched base `f67e6a8e` there and passes locally (npm 11.19.1). CI confirms on the PR.
- [x] `npm run bundle:check` is clean, with no `UNREACHED` copy. — exit 0.
- [x] `npm run validate -- skills/finalise/` passes (and for `develop-task`, `develop-story`, `develop-bug`). — all four ✓.
- [x] `shellcheck` is clean on `dod-gap-count.sh` and `advance-pipeline-lock.sh`. — `--severity=warning`, also `develop-pipeline-on-stop.sh`.
- [x] Each mutation in § 8 turns a test red. — M1 whole-section grep → 3 red; M2 guard removed → 5 red; M3 cooperation block without `--dod` → 1 red (`finalise-gaps-path.test.mjs`).

### Migration

- [x] CHANGELOG `[Unreleased]` → `### Fixed` cites `(task 222)` and names the `--dod` requirement.
- [x] Every site the § 3 restatement search returns carries the "on acceptance" qualifier (or, for the helper's header, the `--dod` condition). Re-running the search shows no unqualified hit. — re-run 2026-10-21: every hit qualified; the remaining `finalise → 8` match is the mapping-floor test's assertion message, which states the arm.

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

**1. An accepted run that never self-advances**

- **Risk**: the cooperation block passes a wrong `DOD_PATH` (an older `dod.{N}`, or a placeholder), so an accepted run holds at 7.
- **Probability**: Low
- **Impact**: Minor. The orchestrator's own `advance-pipeline-lock.sh 8` still runs after it reads `status: accepted`. The worst case is one resume re-running `/finalise`.
- **Mitigation**: the block refuses a `{…}` placeholder. The helper's stderr names the file it read. The extracted-block integration test covers the ACCEPTED case.
- **Rollback**: revert Phase 3 alone.

**2. A gap report that does not follow the 8.4 shape**

- **Risk**: an agent writes gaps outside `### Missing Criteria`, so the helper HALTs (zero items) and the gaps comment is not posted.
- **Probability**: Medium (four real reports followed the shape; prose drifts).
- **Impact**: Minor. The HALT names the missing subsection, so the fix is one edit.
- **Mitigation**: Step 8.4's new rule sentence; the HALT message names the expected heading.

### Low Risk Areas

**1. Bundle drift**

- **Risk**: a fix applied to a `references/` copy is reverted by `npm run bundle`.
- **Mitigation**: edit only `shared/resources/` sources; `bundle:check` runs in CI.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:

- An accepted `/finalise` run on `develop` leaves the lock at 7 when it should be at 8, and the orchestrator's own advance does not recover it.
- `dod-gap-count.sh` HALTs on a well-formed gap report.

**Steps**:

1. `git revert` the task's merge commit.
2. `npm run bundle` and commit the regenerated copies if the revert left them stale.
3. Re-run `npm test`.

**Verification**: `step-8-completion-checklist.test.mjs`'s premise test passes with `--skill finalise` and no `--dod`.

---

### Partial Rollback (1-2 hours)

**When to Use**: only one of the two fixes misbehaves. They are independent: Phase 2 touches only Step 8.5 and 8.4; Phase 3 touches only the lock helper and the cooperation block.

**Steps**:

1. Revert Phase 2's or Phase 3's commit alone, plus that phase's tests.
2. Re-bundle and re-run `npm test`.

---

### Forward Fix (< 4 hours)

**When to Use**: a doc-sweep wording miss, or a gap-report shape the helper should accept (for example `### Missing Criteria` without the colon).

**Approach**: widen the helper's heading match or fix the wording, with a test for the new shape.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:

- The lock is held at 7 after an accepted DoD, and the run is stuck.

**Non-Critical (Forward Fix)**:

- A gap-count HALT on a hand-edited report.
- A missed restatement in the doc sweep.

---

## Implementation Summary

**Completion Date:** 2026-10-21

**Approach:** Test-first, as planned. Phase 1's suite went red on today's code (9 of 12; `--skill finalise --dod X` ignored the extra arguments and moved the lock 7 → 8). `dod-gap-count.sh` is now the one story/task gap count, called by Step 8.5; Step 8.4 states the rule. The `--dod` guard sits after the lock parse (a corrupt lock is still exit 1) and after the idempotency check (a lock already at 8 stays a silent noop), and the arm literal `finalise) NEXT=8 ;;` is unchanged. finalise's cooperation block binds `DOD_PATH` and passes `--dod`. The doc sweep followed the § 3 search, not the literal.

**Testing Results:** `finalise-gaps-path.test.mjs` 12/12; `finalise-bug-mode.test.mjs` + `step-8-completion-checklist.test.mjs` 113/113; `advance-pipeline-lock.test.sh` 72/72; `npm run ci:fast` on .249: format clean, 6135 pass, 1 environmental failure (see § 9). zsh variants run in CI only (no zsh on this host or .249). Three mutation proofs each turned a test red.

**Deferred Work:** none. Step 8.3's Change Log gap count stays out of scope (§ 4).

---

<!-- change-log-start -->
## Change Log

| Date       | Version | Description                                    | Author      |
| ---------- | ------- | ---------------------------------------------- | ----------- |
| 2026-10-21 | 1.0     | Initial draft — cut from observations #24, #79 | create-task |
| 2026-10-21 | 1.1     | Review passed (8/10) — listed the finalise-bug-mode 8.5 test, recorded the restatement search, added resume states | review-task |
| 2026-10-21 |         | Status → ready-for-development | review-task |
| 2026-10-21 |         | Implemented — 2 new files (+1 bundled copy), 1 new test file (12 tests), 3 tests added to finalise-bug-mode, 23 files swept/re-bundled | develop |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Reproduce both defects in tests (red)

- [x] Gap-count fixtures reproduce 4 / 5 / 3 / 8
- [x] Lock fixture reproduces 7 → 8 on a GAPS DoD

### Phase 2: One gap-count definition

- [x] `dod-gap-count.sh`
- [x] Step 8.5 arm and Step 8.4 rule

### Phase 3: Hold the lock unless the DoD reads ACCEPTED

- [x] `--dod` guard and header
- [x] Cooperation block

### Phase 4: Existing tests, doc sweep, bundle

- [x] Premise test updated
- [x] Restatements qualified (§ 3 search)
- [x] `finalise-bug-mode.test.mjs` 8.5 fixture in the 8.4 shape
- [x] Bundle, CHANGELOG

---

## References

- Observation #24 — finalise gaps comment counts Next Steps checkboxes as gaps
- Observation #79 — finalise advances the pipeline lock to Step 8 even when DoD gaps were found
- **Related Skill**: `skills/finalise/` (Step 8.4, Step 8.5, § Pipeline Lock Cooperation)
- **Related helper**: `shared/resources/advance-pipeline-lock.sh`, `shared/resources/fill-verification-complete.sh` (bug mode's one gap-count definition, the shape this task copies)
- **Prior work**: task.160 (the premise test), task.164 (the HALT banner rule), obs #212 (indented boxes)

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources only; `npm run bundle` overwrites `references/` copies.
- Reproduce each defect in a test before fixing it (Phase 1). A green check that has never been red proves nothing.
- Keep the arm's literal `finalise) NEXT=8 ;;`. The step-8 checklist test's mapping floor parses it.

### Known Issues

**Open** (Non-blocking):

- ⚠️ Step 8.3's Change Log gap count is still composed by the agent (§ 4, out of scope).

---

**Status:** Ready for Review

**Next Steps**:

1. QA (`/qa-task`) through the develop-task pipeline.
2. QA will create `task.222.qa.{N}.finalise-gaps-path-fixes.md`, `task.222.gate.{N}.finalise-gaps-path-fixes.yml` and any `task.222.bug.{N}.*.md` in this directory.
