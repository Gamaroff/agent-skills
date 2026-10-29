---
id: task.242
title: "Scope finalise re-runs"
type: task
description: "Give a /finalise re-run a fixed scope: re-judge only the gaps the previous run reported and the criteria whose evidence changed since its head, carry every other verdict forward, and report anything new on an untouched criterion as advisory."
tags: [finalise, dod, observation]
category: refactoring
status: planned
priority: Medium
created: 2026-10-29
updated: 2026-10-29
assignee:
estimated_effort_hours: 8
github_issue: 780
---

# Technical Task: Scope finalise re-runs

**Status:** Planned
**GitHub Issue**: [#780](https://github.com/Gamaroff/agent-skills/issues/780)

---

## 1. Overview

**Description:** Give a `/finalise` re-run a fixed scope. A run that follows a gaps run re-judges the gaps that run reported and every criterion whose evidence changed since the head it judged. It carries every other verdict forward with its evidence. Anything new the AC agent notices on an untouched criterion is reported as advisory, not as a gap.

**Scope:** The AC traceability agent (agent 1) of the story/task DoD. That covers its prompt, a persisted per-run AC record, a scope engine that decides what a re-run re-judges, and the merge that enforces the scope on the agent's answer. The security, compliance and docs agents, and bug mode's fix-evidence agent, are unchanged.

**Key Deliverables:**

- A per-run AC record, `{STEM}.dod.{N}.ac.json`, written beside each DoD summary. It holds the head the run judged, each criterion's text hash, its verdict and citations, and for a quantified criterion its members.
- `shared/resources/finalise-rerun-scope.js`. Its `scope` command reads the newest prior record and returns `full` or `scoped`, each with a reason. Its `merge` command restores carried verdicts over whatever the agent returned.
- `/finalise` Step 3 wired to both commands, and the AC prompt given a re-run scope it honours.

**Expected Outcome:** Re-running `/finalise` on an unchanged tree after a gaps run judges the same criteria the same way. The DoD loop on task.239 needed five runs and a human stop rule. It would have stopped at the first run that found nothing new in its scope.

---

## 2. Motivation

### Current Problems

- **No fixed point.** task.239 ran `/finalise` five times (observation #121). Each AC run judged the criteria more finely than the one before and found a gap the previous run had passed. Run 5 failed SC-11 on three assertion groups (`qa-escalation-template.test.mjs:102-106`, `:356-360`, `:410-412`). Runs 1–4 had read those groups and passed them. No code changed between runs 4 and 5: `b324b496` touched only the task document.
- **The loop ended by hand.** The pipeline has no rule that stops a run from re-judging what the last run passed. Run 5 was accepted only because the user set one in advance ("if run 5 finds yet another new gap, accept with a recorded override"). See `task.239.dod.5.qa-escalation-and-grant-say-what-runs.md` § Step 5.
- **Every extra run is expensive.** One DoD run is four agents, a 30-case probe and a CI reading. On task.239 that was four extra runs.
- **Nothing is kept to compare with.** The AC agent's result is captured as `AC_RESULT` (`skills/finalise/SKILL.md:513`, *`Each agent returns YAML. Capture: \`AC_RESULT\``*). It is rendered into the DoD markdown and then discarded. A re-run has no machine-readable record of what the last run passed, so it cannot carry anything.

### Benefits

- A re-run on an unchanged tree reaches the same verdict as the run before it, so the loop terminates.
- A reported gap is re-judged against the commits that claim to close it, and nothing else becomes a gap.
- A finer finding is still surfaced as advisory, so nothing the agent sees is dropped.
- Re-runs get cheaper: the AC agent judges K criteria, not all of them.

---

## 3. Technical Background

### Current Architecture

- **Dispatch.** `/finalise` Step 3 dispatches four Explore agents in one message (`skills/finalise/SKILL.md:508`, the dispatch table row *`| 1. AC traceability | \`references/finalise-dod-ac-prompt.md\``*). The AC agent's substitutions are `<STORY_FILE>`, `<PR_NUMBER>`, `<STORY_TYPE>` and `<DIFF_FILE>`. There is no re-run input.
- **The AC prompt** (`shared/resources/finalise-dod-ac-prompt.md`) judges every criterion from scratch. Its quantifier rule (`:38`, *`6. **Quantifier rule**`*) maps members to evidence, but it reports only the unmapped ones, and only in free-text `note`. Nothing records which members a PASS rested on.
- **Prior runs.** Step 2's rule (`skills/finalise/SKILL.md:283`, *`Treat **every** existing DoD/ACCEPTED block as **superseded**. Verify each criterion afresh`*) applies when a document that was accepted is reopened (`PRIOR_DOD > 0` and status not `accepted`). It stays as it is: a reopened document is new work. Step 3's "Idempotent re-run" (`:859`) is about not duplicating sections in one running summary. It is unrelated to scope.
- **Heads.** Step 6 records `CI_HEAD_1=$(git rev-parse HEAD)` (`:1139`) for the CI reading. No per-run record of the head the AC agent read exists.
- **Numbering.** DoD files are numbered by `newest-numbered.sh` (`next_numbered` at `skills/finalise/SKILL.md:171`). The same helper can find the newest prior AC record.
- **Other readers of the AC prompt.** `qa-task/SKILL.md:1015`, `qa-story/SKILL.md:1538`, `review-task/SKILL.md:1244` and `review-story/SKILL.md:1264` cite it. The last two link to the anchor `#step-3-check-each-acceptance-criterion`. None of them dispatch it. Each has a bundled copy at `skills/{finalise,review-task,review-story}/references/finalise-dod-ac-prompt.md`.
- **Bug mode.** The bug-mode table (`skills/finalise/SKILL.md`, § "What bug mode runs and skips") lists every step key. `evals/shared/tests/finalise-bug-mode.test.mjs` asserts that the table and the `**Bug mode (\`key\`):**` markers agree in both directions.

### Target Architecture

```
Step 3a (new, before dispatch)
  PRIOR = newest ${STEM}.dod.*.ac.json beside the document (none on a first run)
  node finalise-rerun-scope.js scope --prior PRIOR --doc DOC --head HEAD --json
    → { mode: full | scoped, reason, rejudge[], carry[] }
  substitute <RERUN_SCOPE> into the AC prompt (full → "judge every criterion")

Step 3b dispatch (unchanged shape: four agents, one message)
  AC agent judges rejudge[]; copies carry[] through; anything else it sees → advisories[]

Step 3c aggregation
  node finalise-rerun-scope.js merge --scope SCOPE --result AC_YAML --json
    → AC_RESULT with every carried verdict restored; a carried criterion the agent
      re-judged differently is moved to advisories[], never into status
  write ${STEM}.dod.${DOD_N}.ac.json (head, text hashes, verdicts, citations, members)
```

**When the scope is `full`** (the engine's reason in brackets): no prior record (`no-prior-record`), a record it cannot read or whose schema it does not know (`prior-unreadable`), a reopened document under the Step 2 rule (`reopened`), or a prior head that is not an ancestor of HEAD (`head-not-ancestor`, a rebase or force-push). Every doubt fails toward a full run, which is today's behaviour.

**When the scope is `scoped`,** each criterion gets one of these outcomes:

| Prior state | Condition | Outcome | Reason |
| --- | --- | --- | --- |
| absent | — | re-judge | `new-criterion` |
| any | criterion text hash differs | re-judge | `criterion-changed` |
| `FAIL` | — | re-judge, carrying the members the prior run mapped whose evidence is unchanged | `reported-gap` |
| `PASS` | a cited path (code, test, or a member's evidence) is in `git diff --name-only PRIOR_HEAD..HEAD` | re-judge | `evidence-changed` |
| `PASS` | none of the above | carry | `unchanged` |

The `reported-gap` row is what would have stopped task.239. Run 4 named SC-11's unmapped groups, and run 5 should have checked those and the members whose evidence moved. It re-opened members run 4 had already mapped.

**Existing mechanisms of this kind.** `finalise-fix-and-recheck.mjs` decides whether one finding may be fixed in-run (Step 8a). It does not scope a whole run, and this task does not change it. The Step 2 reopen rule stays in force: the engine reads it as `reopened` → `full`. Neither mechanism is replaced. The engine sits beside both.

### Important Clarifications

- Carrying a verdict is not trusting a checkbox. The carried verdict is the prior run's own evidence, and it is re-judged as soon as any cited path changes.
- CI and the QA gate still gate acceptance as they do today. A change elsewhere that breaks a carried criterion turns CI red, and Step 6 refuses on CI.

---

## 4. Scope

### In Scope

✅ The AC record: its schema, written at Step 3c for story/task runs
✅ `shared/resources/finalise-rerun-scope.js` (`scope` and `merge`) and its tests
✅ AC prompt: a re-run scope section, a structured `members[]` for quantified criteria, and `advisories[]`
✅ `/finalise` Steps 3a–3c and the DoD Step 2 block: a scope line and an "Advisory (not a gap)" list
✅ A bug-mode table key `rerun-scope` (bug mode skips it)
✅ Bundled copies (`npm run bundle`) and a CHANGELOG entry

### Out of Scope

❌ The security, compliance and docs agents. Their findings are not the ratchet observed.
❌ Bug mode's fix-evidence agent. It has five fixed checks and no criteria list to scope. A later task can extend the record to it if the ratchet appears there.
❌ A cap on consecutive gap runs. Considered and not chosen (2026-10-29): the scope removes the loop at its source.
❌ `finalise-fix-and-recheck.mjs` and Step 8a.

---

## 5. Breaking Changes

### A re-run no longer fails an untouched criterion on a finer reading

**Before:** every run judges every criterion from scratch, and a new finding on any of them is a gap.
**After:** a run with a readable prior record carries an untouched PASS. A new finding on it is listed under "Advisory (not a gap)" and does not block acceptance.

**Impact:** a real defect in an untouched criterion that every earlier run missed is now advisory on a re-run, not blocking.

**Migration path:** none required by consumers. To force a full re-judge, delete or move the newest `*.dod.*.ac.json` beside the document. The engine then reports `no-prior-record` and the run is full. The DoD scope line names the reason on every run, so the mode is never silent.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.242.plan.scope-finalise-re-runs.md](task.242.plan.scope-finalise-re-runs.md)

### Phase 1: The engine (Risk: Medium)

- [ ] `scope`: the four `full` reasons and the five per-criterion rows of § 3, with criterion text hashing on a normalised line (checkbox state stripped, whitespace collapsed)
- [ ] `merge`: restore every carried verdict and citation, move a carried criterion's differing agent verdict into `advisories[]`, recompute `overall` from the merged list
- [ ] Exit codes in the repository's idiom: 0 for any answer (read `mode`/`reason`), 2 for a usage error
- [ ] Unit tests on a temp git repo, one per reason, plus the task.239 replay and its controls (§ 8)

### Phase 2: The AC prompt (Risk: Medium)

- [ ] A new section before Step 3 that reads `<RERUN_SCOPE>`. Keep the `### Step 3: Check each acceptance criterion` heading byte-identical, because two skills link to its anchor.
- [ ] Output gains `members[]` (member, evidence, status) on quantified criteria and a top-level `advisories[]`
- [ ] `full` scope reads exactly as today's prompt

### Phase 3: Wire `/finalise` (Risk: Medium)

- [ ] Step 3a: locate the prior record with `newest_numbered … -name "${STEM}.dod.*.ac.json"` and run `scope`. Add `<RERUN_SCOPE>` to the dispatch table.
- [ ] Step 3c: run `merge` and write `${STEM}.dod.${DOD_N}.ac.json`
- [ ] DoD Step 2 block: the line `**Re-run scope:** {mode} ({reason}) — {K} re-judged, {M} carried`, and the advisory list
- [ ] Bug-mode table row `rerun-scope` (story/task run, bug skip) and its marker
- [ ] 6a and 8 stage the AC record with the DoD file

### Phase 4: Bundle, docs, record (Risk: Low)

- [ ] `npm run bundle`, then confirm `bundle:check` is clean
- [ ] CHANGELOG [Unreleased] entry citing task 242
- [ ] Mutation-prove each new guard and record it in the commit body

---

## 7. Files Summary

### Files to Create

1. ✅ `shared/resources/finalise-rerun-scope.js` — engine (`scope`, `merge`)
2. ✅ `shared/resources/tests/finalise-rerun-scope.test.mjs` — engine tests (already in `npm test` by the `shared/resources/tests/*.test.mjs` glob)

### Files to Modify (Core Implementation)

3. ✅ `shared/resources/finalise-dod-ac-prompt.md` — scope section, `members[]`, `advisories[]`
4. ✅ `skills/finalise/SKILL.md` — Steps 3a–3c, the dispatch table, the DoD Step 2 block, the bug-mode table, the 6a/8 staging lists

### Files to Modify (Generated — `npm run bundle`)

5. ✅ `skills/finalise/references/finalise-dod-ac-prompt.md`, `skills/review-task/references/…`, `skills/review-story/references/…`
6. ✅ `skills/finalise/references/finalise-rerun-scope.js` (new copy)

### Files to Modify (Tests)

7. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` — the AC prompt carries the scope section, the Step 3 heading is unchanged, and `<RERUN_SCOPE>` is in the dispatch table
8. ✅ `evals/shared/tests/finalise-bug-mode.test.mjs` — no edit expected. It derives the keys from the table, so the new row is checked automatically (confirm it goes red without the marker).

### Files to Modify (Documentation)

9. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `finalise-rerun-scope.js`, both commands, every reason.
- **Fixture:** a temp git repo with a task document and cited files, and a prior record at commit A. Each case makes one change and commits B.
- **task.239 replay:** a prior record in which SC-11 is FAIL with groups G1–G3 named unmapped and G4–G6 mapped. HEAD changes only the task document. Expected: SC-11 is `reported-gap`, with G4–G6 carried and G1–G3 re-judged. Every untouched PASS is `unchanged`.
- **Controls** (obs #176 — vary each dimension the rule reads):
  - a cited test file changed → `evidence-changed`
  - a criterion reworded → `criterion-changed`
  - a criterion added → `new-criterion`
  - a rebased prior head → `full`/`head-not-ancestor`
  - a corrupt record → `full`/`prior-unreadable`
  - a reopened document → `full`/`reopened`
- **merge:**
  - an agent that returns FAIL for a carried criterion: the merged status stays PASS, and the finding appears in `advisories[]`
  - an agent that omits a carried criterion: still restored
  - `overall` is recomputed, never copied from the agent
- **Command:** `command node --test shared/resources/tests/finalise-rerun-scope.test.mjs`

### Integration Tests

- **Scope:** the contract tests over `finalise/SKILL.md` and the AC prompt (file 7), plus the bug-mode table test (file 8).
- **Command:** `npm run ci:fast`

### Performance Tests

Not applicable. The engine reads one JSON record and runs one `git diff --name-only`.

### Consumer Tests

- `review-task` and `review-story` link to the Step 3 anchor. `tests/bundled-links.test.js` and the link check guard it, and the heading must be byte-identical.
- `qa-task` and `qa-story` cite the prompt by name only. No change.

---

## 9. Success Criteria

### Functional

- [ ] SC-1: `scope` returns `full` with reasons `no-prior-record`, `prior-unreadable`, `reopened` and `head-not-ancestor`, each pinned by a test on the temp-repo fixture
- [ ] SC-2: `scope` assigns `new-criterion`, `criterion-changed`, `reported-gap`, `evidence-changed` and `unchanged` per § 3's table, each pinned by a test
- [ ] SC-3: The task.239 replay fixture scopes SC-11 to `reported-gap`. The members the prior run mapped are carried; the ones it named unmapped are re-judged. Every untouched PASS is `unchanged`.
- [ ] SC-4: `merge` keeps a carried criterion's prior status and citations whatever the agent returned, and moves a differing agent verdict into `advisories[]`. Pinned by tests for "agent returns FAIL" and "agent omits it".
- [ ] SC-5: `merge` recomputes `overall` from the merged criteria. An agent `overall: FAIL` over all-PASS merged criteria yields PASS.
- [ ] SC-6: `/finalise` Step 3a runs `scope` before dispatch, and Step 3c runs `merge` and writes `${STEM}.dod.${DOD_N}.ac.json`. A contract test reads both commands in `skills/finalise/SKILL.md`.
- [ ] SC-7: The AC prompt reads `<RERUN_SCOPE>` in a section before Step 3. `### Step 3: Check each acceptance criterion` is byte-identical to today's (contract test).
- [ ] SC-8: The DoD Step 2 block template carries the re-run scope line and the "Advisory (not a gap)" list (contract test).
- [ ] SC-9: The bug-mode table carries `rerun-scope` with a bug-mode skip marker. `finalise-bug-mode.test.mjs` is green and goes red with the marker removed.

### Performance

- [ ] SC-10: Not applicable. No numeric bound is claimed (§ 8).

### Code Quality

- [ ] SC-11: Each new guard is mutation-proved (red without the behaviour, green with it), and the proofs are recorded in commit bodies
- [ ] SC-12: `npm run ci:fast` and `npm run bundle:check` pass on the PR head

### Migration

- [ ] SC-13: CHANGELOG [Unreleased] cites task 242, names the forced-full escape (move the newest `*.ac.json`), and says that a first run after upgrade is `full` (`no-prior-record`)

---

## 10. Risk Assessment

### High Risk Areas

None.

### Medium Risk Areas

1. **A real defect missed by every run becomes advisory on a re-run.**
   - Probability: Low. Impact: Medium.
   - Mitigation: advisories are listed in the DoD file and the PR gaps or acceptance comment, not dropped. Any cited-path change re-opens the criterion. CI still gates acceptance.
   - Rollback: delete the prior `*.ac.json` to force a full run.
2. **Evidence outside the cited paths.** A criterion can rest on a file its citations do not name.
   - Probability: Medium. Impact: Medium.
   - Mitigation: `members[]` carries each member's evidence path, and the citation rule already requires a code and a test citation for a PASS. The task.239 replay control varies a cited test file.
3. **The agent ignores the scope.**
   - Probability: Medium. Impact: Low.
   - Mitigation: `merge` enforces the scope mechanically. Whatever the agent returns for a carried criterion becomes an advisory, never a status.

### Low Risk Areas

1. **Anchor breakage in `review-task` and `review-story`.** Mitigation: the Step 3 heading is pinned byte-identical.
2. **Record files in the work-item directory.** They are small JSON files committed beside the DoD, like the security run records.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

- **Triggers:** a re-run accepts a document with a FAIL the scope wrongly carried; or `scope` crashes on a real record.
- **Steps:** revert the merge commit on `develop`, run `npm run bundle`, confirm `bundle:check` is clean, and push.
- **Validation:** `/finalise` dispatches with no `<RERUN_SCOPE>`, and `npm run ci:fast` is green.

### Partial Rollback (1-2 hours)

- **When to use:** the engine is sound but the prompt change misleads the agent.
- **Steps:** revert Phase 2 only. `merge` still enforces carry, so behaviour stays scoped.

### Forward Fix

- **When to use:** a wrong reason on one edge case (for example, a renamed cited file).
- **Approach:** add the case as a failing fixture first, then fix the engine.

### Rollback Triggers

- **Critical:** a carried verdict that is false on the merged tree.
- **Non-critical:** an advisory list that is noisy. Tune the prompt; do not revert.

---

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-29 | 1.0 | Initial draft — cut from observation #121 | create-task |

---

## Progress Tracking

- [ ] Phase 1: The engine
- [ ] Phase 2: The AC prompt
- [ ] Phase 3: Wire `/finalise`
- [ ] Phase 4: Bundle, docs, record

---

## References

- Observation #121 — Finalise re-runs re-judge passed criteria more finely each time, so a DoD loop has no fixed point
- `docs/tasks/task.239.qa-escalation-and-grant-say-what-runs/task.239.dod.5.qa-escalation-and-grant-say-what-runs.md` — the override that ended the five-run loop
- `skills/finalise/SKILL.md` § Step 2 (reopen rule), § Step 3 (dispatch), § Step 8a (`finalise-fix-and-recheck.mjs`)

## Notes

- QA report: `task.242.qa.{N}.scope-finalise-re-runs.md`
- Bug reports: `task.242.bug.{N}.{name}.md`
- Quality gate: `task.242.gate.{N}.scope-finalise-re-runs.yml` (co-located)
