---
id: task.138
title: "[Task 138] finalise --bug shipped through eleven gates with six low findings nobody closed and no end-to-end run: assert a state Step 7 must have written, fill the template's block instead of appending a second, refuse a verdict remainder that names the other verdict, read before grep, hoist newest_numbered, and run the whole thing once in a scratch clone"
type: task
description: "Close the bug-mode residuals task.125's review trail carried out of its QA loop — 7.6b's template-satisfied final assertion, 7.1's append-vs-fill with no bug-mode row, a `PASS or FAIL` verdict reading PASS, one HALT for an unreadable report and a report with no verdict, the `newest_numbered` helper defined once and inlined twice — and produce the feature's missing acceptance evidence: one end-to-end `/finalise --bug` run in a scratch clone against a real bug report, recorded."
tags: [finalise, develop-bug, bug-mode, dod, qa-task]
category: refactoring
status: planned
priority: Medium
created: 2026-09-21
updated: 2026-09-21
assignee:
estimated_effort_hours: 8
risk_level: medium
github_issue: 450
---

# Technical Task: finalise bug-mode residuals and the end-to-end run task.125 never had

**Status:** Planned
**GitHub Issue**: [#450](https://github.com/Gamaroff/agent-skills/issues/450)

---

## 1. Overview

Task.125 (PR #447) made `/finalise --bug` the only DoD path a bug can take (obs #69) and shipped it after eleven QA cycles; the last gate is clean. But a loop closes what a gate would block, and the review trail — gates 9–11's `future` lists and the 5c PR review's CR-1, CR-2 and PC-1 — carries six low findings in the bug-mode path that no cycle fixed because none was ever HIGH. Obs #146 records them and its principle: carry them out of the loop as one named follow-up, not as `future` lists on eleven gates nobody reads again. This task is that follow-up. Its last phase is the one the feature never had: `/finalise --bug` executed end to end in a scratch clone against a real bug report, rather than block-by-block against fixtures.

**Scope**: `skills/finalise/SKILL.md` Steps 6b, 7.1, 7.6a, 7.6b; `skills/finalise/assets/bug-dod-template.md` (read, not changed, unless the fill needs a marker); a new `shared/resources/newest-numbered.sh` bundled into finalise's `references/`; `evals/shared/tests/finalise-bug-mode.test.mjs`; the end-to-end run's record in this task's implementation report; CHANGELOG.

**Key deliverables**: (1) **7.6b asserts a state Step 7 must have written.** The bug-mode final assertion greps `^## Verification Complete` on the pushed DoD — a heading `assets/bug-dod-template.md` ships at Step 0, so a template stub and a filled DoD reach the same PASS (5c CR-1). It becomes `^\*\*Final Status:\*\* ✅ ACCEPTED` on `$DOD_PATH`, which only 7.1 writes. (2) **7.1 fills, never appends.** The template already carries `## Verification Complete` / `**Final Status:** {…}`; 7.1 says *append* and has no bug-mode row, so a verbatim bug run writes a second heading and a second Final Status line (5c CR-2). 7.1 gains a `**Bug mode (\`verification-complete\`):**` row in the skip table — fill the template's block in place — and the once-only Final Status test extends from the template to the written DoD. (3) **A verdict remainder that begins with the opposite verdict is refused.** `**Verdict**: PASS or FAIL` reads `PASS` today (gate 11 future); after the first word, a remainder whose first word is `FAIL`/`PASS`/`or`/`|` is a template remnant, same treatment as the existing `/`- and `|`-leading remainder. (4) **Two diagnostics stay two.** `[ -r "$IMPLEMENTATION_REPORT" ]` before the verdict grep, so an unreadable report HALTs as unreadable and a readable one with no verdict line HALTs as that (gate 11 future). (5) **`newest_numbered` is defined once.** It is defined in 6b and inlined in 7.6a/7.6b because fenced blocks share no shell function; it moves to `shared/resources/newest-numbered.sh`, bundled to `references/`, with the cwd contract for a `references/` script called from a fenced block decided and written down once (gate 9 future). (6) **One end-to-end run**, in a scratch clone of this repository, `/finalise --bug docs/bugs/bug.14.precompact-hook-bare-tracker-comment/bug.14.precompact-hook-bare-tracker-comment.md` (a closed general bug whose fix evidence exists), with tracker mutations deferred — recorded in this task's implementation report as the acceptance evidence for the whole feature (5c PC-1; task.125 § 8 item unticked).

**Expected outcome**: a bug-mode DoD that reaches PASS carries exactly one `**Final Status:** ✅ ACCEPTED` that Step 7 wrote; a report whose verdict line is a template remnant HALTs naming it; the helper has one definition; and the feature has one recorded run from Step 0 to Step 8.

---

## 2. Motivation

### Current Problems

- **7.6b's assertion is satisfied by the template.** `FINAL_ASSERT_PATTERN='^## Verification Complete'` on `$DOD_PATH` — Step 0 wrote that heading from the template before any verification ran. The assertion proves the file was pushed, not that Step 7 finished.
- **7.1 and the template disagree, and no row arbitrates.** Story/task runs create the running summary without the section and append it; the bug template ships with it. 7.1's prose is the story/task prose and the skip table has no `verification-complete` key, so a bug run following 7.1 verbatim appends a second heading — and the once-only test (`finalise-bug-mode.test.mjs` "exactly one **Final Status:** line") reads the template, not a DoD a run wrote.
- **A reworded verdict passes.** The first-word extractor takes `PASS` from `**Verdict**: PASS or FAIL`; the remainder check refuses `/` and `|` but not a word.
- **One HALT for two states.** A report that cannot be read and a report with no verdict line both reach "no **Verdict**: line found"; the reader told to write one cannot tell that the file was unreadable.
- **Three copies of one helper.** `newest_numbered` (6b ~line 1553) is inlined in 7.6a and 7.6b because a fenced block is its own shell; a fix to one copy is a fix to one copy.
- **The feature has no run.** Every cycle executed blocks against fixtures and real reports; no cycle ran `/finalise --bug` from Step 0 to Step 8 on a bug. PC-1 said so; § 8's end-to-end item is unticked.

### Benefits

- The pushed-assertion means what its name says: acceptance was written.
- One `**Final Status:**` per DoD, by construction and by test.
- A template remnant in a verdict line is a HALT with the line quoted, not a PASS.
- One definition of numbered-newest, reused by task.137's swept sites if it lands first.
- A recorded end-to-end run to cite — and to rerun after any bug-mode change.

---

## 3. Technical Background

### Current Architecture

`skills/finalise/SKILL.md` resolves `DOC_KIND` once (story/task/bug) and states every bug-mode difference in one skip table (§ "What bug mode runs and skips"), each key appearing exactly once in the prose as `**Bug mode (\`key\`):**`; `evals/shared/tests/finalise-bug-mode.test.mjs` asserts table and markers agree both ways and executes the sliced 6b/7.6b blocks under `bash` and `zsh`. Step 0 creates the running summary from `assets/bug-dod-template.md` in bug mode — a file whose last section is already `## Verification Complete` with `**Final Status:** {✅ ACCEPTED | ❌ GAPS IDENTIFIED - NOT ACCEPTED}`. Step 7.1 says "Append the `## Verification Complete` section below". 6b binds `IMPLEMENTATION_REPORT` via `newest_numbered`, extracts the last `**Verdict**:` line, takes its first word, refuses a remainder beginning `/` or `|`, and HALTs with one of two messages — but the unreadable-file state falls into the "no line found" branch because `grep` on an unreadable path prints nothing. 7.6b branches on `DOC_KIND`: bug → `FINAL_ASSERT_PATTERN='^## Verification Complete'`.

`develop-bug` Step 7 calls `/finalise --bug`; Part B then writes `closed` and `## Resolution Summary`. `docs/bugs/bug.14.precompact-hook-bare-tracker-comment/` is a closed general bug with an implementation report, a review, and a `bug.14.dod.1.*.md` from task.125's own by-hand cycles — the closest thing to a real fixture, and the file this task runs against.

### Target Architecture

```
7.1  **Bug mode (`verification-complete`):** fill — the template's block exists; replace its
     {…} placeholders in place; never append a second heading.  (new skip-table row: run — fill)
6b   [ -r "$IMPLEMENTATION_REPORT" ] || HALT "unreadable: <path>"     ← before the grep
     remainder first word ∈ {PASS, FAIL, or, OR, |, /} → refused as a template remnant
7.6b bug: FINAL_ASSERT_PATTERN='^\*\*Final Status:\*\* ✅ ACCEPTED'  on $DOD_PATH
6b/7.6a/7.6b:  source references/newest-numbered.sh || exit 1 ; newest_numbered <dir> <kind> -name …
```

The `references/` cwd contract, written once in the sourced script's header and in `skills/create-skill/SKILL.md` beside the existing `source references/resolve-platform.sh || exit 1` convention: **a fenced block sources a `references/` script by the path the skill states, relative to the skill's base directory, exactly as `resolve-platform.sh` is sourced today — there is no second contract.** The blocks already do this for `resolve-platform.sh`; the helper joins that convention rather than inventing a `$SKILL_DIR`.

### Important Clarifications

- **Why `**Final Status:** ✅ ACCEPTED` and not `status: accepted`.** Bug mode deliberately does not write `accepted` to the bug's frontmatter (`frontmatter-accepted` skip); the DoD file is the only artefact Step 7 changes, and its Final Status line is the only thing Step 7 alone writes.
- **Fill vs append is a table row, not prose.** Adding a `verification-complete` key means the parity test enforces that the marker exists in 7.1 — that is the mechanism obs #69 chose and this task extends it rather than adding a paragraph.
- **The verdict refusal is a first-word check on the remainder**, matching the existing `case "$VERDICT_AFTER" in /*|\|*)` form; a trailing `{placeholder}` in prose stays legal (cycle-10 CR-1).
- **The end-to-end run is evidence, not a test.** It runs once, by hand, in a scratch clone with `access.tracker: read-only` (or the deferred-mutation record) so nothing reaches GitHub, and its Step 0–8 record — the DoD file, the HALTs hit, the deferred mutations — is pasted into the implementation report. It is not added to CI.

---

## 4. Scope

### In Scope

✅ `skills/finalise/SKILL.md` — Step 7.1 bug-mode row and marker; 6b `[ -r ]` and the verdict-remainder first-word refusal; 7.6b bug-mode assertion; 6b/7.6a/7.6b `source references/newest-numbered.sh`
✅ `shared/resources/newest-numbered.sh` — the one definition, with its cwd contract in the header; bundled into `skills/finalise/references/`
✅ `skills/create-skill/SKILL.md` — one sentence naming the sourcing convention for `references/` scripts (beside the `resolve-platform.sh` rule)
✅ `evals/shared/tests/finalise-bug-mode.test.mjs` — rows for each of items 1–5, including the once-only test over a DoD the 7.1 block wrote
✅ The end-to-end run in a scratch clone and its record in the implementation report
✅ `npm run bundle`; CHANGELOG [Unreleased]

### Out of Scope

❌ The security-probe boundary that FAILed task.125's DoD — task.136
❌ The `ls`-glob sites in 7.6b — task.137 rewrites them; this task's 7.6b edit is the assertion pattern and the `source` line only
❌ `develop-bug` Part B and `## Resolution Summary` — unchanged
❌ Story/task mode of finalise — no line outside a `DOC_KIND = bug` branch or the shared helper changes behaviour
❌ Adding the end-to-end run to CI — it needs a scratch clone and a bug with a real trail; it is a recorded run

---

## 5. Breaking Changes

None — API stable. A bug-mode run that today reaches PASS with a DoD carrying one filled `**Final Status:** ✅ ACCEPTED` passes the new 7.6b assertion; a run whose DoD carries only the template line (`{✅ ACCEPTED | …}`) now HALTs at 7.6b, which is the defect being fixed. `newest_numbered`'s signature is unchanged; the three inline copies become three `source` lines.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.138.plan.finalise-bug-mode-residuals.md](task.138.plan.finalise-bug-mode-residuals.md)

### Phase 1: The helper, hoisted (items 5)

**Risk**: Low
**Files**: `shared/resources/newest-numbered.sh` (new), `skills/finalise/SKILL.md` 6b/7.6a/7.6b, `skills/create-skill/SKILL.md`, `evals/shared/tests/finalise-bug-mode.test.mjs`

- [ ] Test first: a row that sources the script and asserts `.19` beats `.9` for `dod`, `gate`, `implementation`; a row that greps `skills/finalise/SKILL.md` for `newest_numbered() {` and expects zero definitions
- [ ] Script: the 6b function verbatim, header stating the sourcing contract; `source references/newest-numbered.sh || exit 1` replaces each inline copy
- [ ] `create-skill/SKILL.md`: one sentence — a `references/` script is sourced by the path the skill states, as `resolve-platform.sh` is; no `$SKILL_DIR`
- [ ] `npm run bundle`

### Phase 2: 6b — read before grep; refuse the reworded verdict (items 3, 4)

**Risk**: Low
**Files**: `skills/finalise/SKILL.md` 6b, test file

- [ ] Rows: `**Verdict**: PASS or FAIL` → HALT "not an exact PASS or FAIL" quoting the line; `**Verdict**: PASS — the {placeholder} case` → PASS (cycle-10 CR-1 stays green); an unreadable report (`chmod 000`) → HALT naming the path as unreadable, not "no line found"
- [ ] `[ -r "$IMPLEMENTATION_REPORT" ] || { echo "HALT: bug mode — ${IMPLEMENTATION_REPORT} is not readable"; exit 1; }` before the grep
- [ ] Extend the remainder `case` with `PASS*|FAIL*|or\ *|OR\ *` → refused
- [ ] Mutation: drop the `[ -r ]` → the unreadable row falls to the wrong message; drop the word arm → the `PASS or FAIL` row reads PASS

### Phase 3: 7.1 fills; 7.6b asserts what 7.1 wrote (items 1, 2)

**Risk**: Medium
**Files**: `skills/finalise/SKILL.md` 7.1 and the skip table, 7.6b; `assets/bug-dod-template.md` (only if a fill marker is needed); test file

- [ ] Skip-table row `verification-complete` — story/task: run (append); bug: run — **fill** the template's block
- [ ] 7.1: `**Bug mode (\`verification-complete\`):** fill …` marker; a fenced fill block that replaces the `{✅ ACCEPTED | ❌ …}` placeholder and the `{current-date-time}` line in place (`sed -i`-free: write to a temp file and `mv`)
- [ ] Test: run the 7.1 fill block against a fresh copy of the template → exactly one `## Verification Complete`, exactly one `**Final Status:**`, and it reads `✅ ACCEPTED`; run it twice → still one (idempotent)
- [ ] 7.6b bug branch: `FINAL_ASSERT_PATTERN='^\*\*Final Status:\*\* ✅ ACCEPTED'`, `FINAL_ASSERT_DESC` reworded; the executed 7.6b row's fixture gains a filled DoD (positive) and a template-only DoD (negative → HALT)
- [ ] Mutation: revert the pattern to `^## Verification Complete` → the template-only row passes (red)

### Phase 4: The end-to-end run

**Risk**: Medium
**Files**: the implementation report; scratch clone (outside the repo)

- [ ] `git clone` this repository to the scratchpad; check out this task's branch; set `access.tracker: read-only` in the clone's `skills-config.yaml` (or confirm the deferred-mutation record is what fires)
- [ ] Run `/finalise --bug docs/bugs/bug.14.precompact-hook-bare-tracker-comment/bug.14.precompact-hook-bare-tracker-comment.md` from Step 0 through Step 8; at every HALT, record the step, the message, and whether the HALT is correct (a real gap in bug.14's trail) or a defect (fix it in this task, re-run)
- [ ] Paste into the implementation report: the DoD file produced, the running-summary `Verification Complete` block, the skip lines logged, every deferred mutation, and the 7.6b assertion outcome
- [ ] Tick task.125 § 8's end-to-end item by reference (a line in task.125's implementation report Notes pointing here), not by editing an accepted document's checklist

### Phase 5: Bundle, CHANGELOG

- [ ] `npm run bundle`, `bundle:check` 0; CHANGELOG [Unreleased]: the five behaviour changes and the recorded run

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/finalise/SKILL.md` — skip table (+1 row), 7.1 (marker + fill block), 6b (`[ -r ]`, remainder arm, `source`), 7.6a/7.6b (`source`; 7.6b assertion)
2. ✅ `skills/create-skill/SKILL.md` — one sentence on sourcing `references/` scripts

### Files to Create (Core Implementation)

3. ✅ `shared/resources/newest-numbered.sh` — the one definition + cwd contract

### Files to Modify (Tests)

4. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` — rows for items 1–5; the once-only test over a written DoD

### Files to Modify (Documentation)

5. ✅ `skills/finalise/assets/bug-dod-template.md` — only if the fill needs a marker line; otherwise untouched
6. ✅ `CHANGELOG.md`
7. ✅ `skills/finalise/references/newest-numbered.sh` — generated by `npm run bundle`
8. ✅ `docs/tasks/task.138.finalise-bug-mode-residuals/task.138.implementation.1.*.md` — carries the end-to-end record (written by `/develop-task`)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope**: `finalise-bug-mode.test.mjs` — the skip-table/marker parity (now including `verification-complete`); the 7.1 fill block executed twice against the template; 6b's three verdict rows and the unreadable-report row; 7.6b's filled-vs-template-only rows; the helper's `.9`/`.19` rows; zero inline definitions in SKILL.md.
- **Mutation proofs**: one per item (listed in each phase); recorded in the implementation report.
- **Command**: `command node --test evals/shared/tests/finalise-bug-mode.test.mjs`; `npm run ci:fast`.

### Integration Tests

- The Phase 4 run is the integration test — recorded, not automated.
- `npm run eval:develop-bug` (if a hermetic fixture exercises Step 7) after Phase 3.

### Contract Tests

- `npm run bundle:check` 0; the bundled `references/newest-numbered.sh` byte-identical to its source.
- The positional-token guard: the new script and blocks use `${1}` forms.

### Performance Tests

Not applicable.

### Consumer Tests

- `develop-bug` Step 7 invokes `/finalise --bug`; the Phase 4 run is driven from it where possible so the caller's Part B is exercised too.

---

## 9. Success Criteria

### Functional

- [ ] A bug-mode DoD that reaches PASS carries exactly one `**Final Status:** ✅ ACCEPTED`, written by 7.1's fill; a template-only DoD HALTs at 7.6b
- [ ] `**Verdict**: PASS or FAIL` HALTs quoting the line; an unreadable report HALTs as unreadable
- [ ] `newest_numbered` has one definition, sourced from three blocks; `.19` beats `.9`
- [ ] `/finalise --bug` ran Step 0 → Step 8 in a scratch clone against bug.14 and its record is in the implementation report

### Performance

- [ ] Not applicable

### Code Quality

- [ ] One mutation proof per item recorded; `ci:fast`, `bundle:check`, Prettier, shellcheck on `newest-numbered.sh` green

### Migration

- [ ] The sourcing contract for `references/` scripts is stated once (`create-skill/SKILL.md`) and the script header cites it; CHANGELOG entry
- [ ] Obs #146 set `actioned` with the PR as resolution; task.125 § 8's end-to-end item referenced from task.125's implementation report Notes

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **The 7.1 fill changes a story/task run**
   - **Risk**: the fill block is executed on a story/task running summary that has no template block, and writes nothing.
   - **Probability**: Low · **Impact**: Medium — a story/task DoD without a Final Status.
   - **Mitigation**: the fill is inside the `DOC_KIND = bug` branch; the story/task append is unchanged; the parity test asserts the row reads "run (append)" for story/task and the executed rows cover both kinds.
   - **Rollback**: revert Phase 3.

2. **The end-to-end run hits a real HALT in bug.14's trail**
   - **Risk**: bug.14's implementation report predates cycle-9's exact-verdict rule and HALTs at 6b on its verdict line.
   - **Probability**: Medium · **Impact**: Low — that is a correct HALT and the record says so; the run is re-done against a scratch copy of the bug with the line corrected, and both outcomes are recorded.
   - **Mitigation**: the phase says: record whether each HALT is correct or a defect.

### Low Risk Areas

1. **`source references/newest-numbered.sh` from a cwd that is not the skill base** — the same exposure `resolve-platform.sh` has today; the contract sentence names it and nothing new is introduced.
2. **Task.137 edits the same 7.6b block** — land one, rebase the other (Notes).

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers**: a story/task finalise run changes behaviour; a bug run that should PASS HALTs at 7.6b with a filled DoD.
- **Steps**: revert Phase 3 (the assertion and the fill); `npm run bundle`; push. Phases 1–2 are independent and can stay.
- **Validation**: the parity test and the executed 7.6b rows.

### Partial Rollback (1-2 hours)

- **When to use**: the helper hoist breaks a block's `source` path in a bundled consumer — revert Phase 1 alone; the inline copies return with it.

### Forward Fix (< 4 hours)

- **When to use**: a HALT message, a remainder arm that refuses a legitimate line, a template placeholder the fill misses.

### Rollback Triggers

- **Critical**: story/task mode behaviour change; a correct bug run HALTs.
- **Non-critical**: wording; the run record's format.

---

## Change Log

<!-- change-log-start -->

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-09-21 | 1.0 | Initial draft — obs #146; task.125 gates 9–11 futures, pr-review.1 CR-1/CR-2/PC-1 | create-task |

<!-- change-log-end -->

## Progress Tracking

- [ ] Phase 1: `newest_numbered` hoisted
- [ ] Phase 2: 6b read-before-grep; reworded verdict refused
- [ ] Phase 3: 7.1 fills; 7.6b asserts the written state
- [ ] Phase 4: end-to-end run recorded
- [ ] Phase 5: bundle, CHANGELOG
- [ ] QA: `task.138.qa.[N].finalise-bug-mode-residuals.md`
- [ ] Gate: `task.138.gate.[N].finalise-bug-mode-residuals.yml`

## References

- Observation #146; #69 (why `--bug` is the only path); #137 (change-log.js repair — a finalise finding of the same "nothing noticed" class, not in scope here)
- `docs/tasks/task.125.develop-bug-finalise-mode-and-issue-create/task.125.pr-review.1.*.md` — CR-1 (template-satisfied assertion), CR-2 (append vs fill), PC-1 (no end-to-end run)
- `docs/tasks/task.125.develop-bug-finalise-mode-and-issue-create/task.125.gate.{9,10,11}.*.yml` — the `future` lists
- `skills/finalise/SKILL.md` § "What bug mode runs and skips" — the table this task adds a row to; 6b (`newest_numbered`, verdict extraction); 7.6b (`FINAL_ASSERT_*`)
- `docs/bugs/bug.14.precompact-hook-bare-tracker-comment/` — the end-to-end run's subject

## Notes

- QA artifacts land beside this file: `task.138.qa.[N].*.md`, `task.138.bug.[N].*.md`, `task.138.gate.[N].*.yml`.
- Independent of tasks 136 and 137 in outcome. Shares `skills/finalise/SKILL.md` 7.6b with task.137 (its `ls` sites) — land one, rebase the other; not in one worktree. If task.137 lands first, its swept 7.6b lines are what this task's `source` line sits above.
- The end-to-end run in Phase 4 is by hand in a scratch clone with tracker mutations deferred or read-only; it is never run against this checkout.
