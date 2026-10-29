---
id: task.242
title: "Scope finalise re-runs"
type: task
description: "Give a /finalise re-run a fixed scope: re-judge only the gaps the previous run reported and the criteria whose evidence changed since its head, carry every other verdict forward, and report anything new on an untouched criterion as advisory."
tags: [finalise, dod, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-10-29
updated: 2026-10-29
assignee:
estimated_effort_hours: 8
github_issue: 780
---

# Technical Task: Scope finalise re-runs

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.242.review.1.scope-finalise-re-runs.md` implemented 2026-10-29
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

- **No fixed point.** task.239 ran `/finalise` five times (observation #121). Each AC run judged the criteria more finely than the one before and found a gap the previous run had passed. Run 5 failed SC-11 on three assertion groups (`qa-escalation-template.test.mjs:102-106`, `:356-360`, `:410-412`). None of runs 1–4 named them; run 4 had listed seven other groups (`:231`, `:93-96`, `:108-112`, `:113-115`, `:352-355`, `:190-205`, `:156`/`:210-216`). No code changed between runs 4 and 5: `b324b496` touched only the task document.
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
- **Other readers of the AC prompt.** Search: `git grep -n finalise-dod-ac-prompt -- 'skills/*/SKILL.md' 'shared/resources' evals tests`, bundled `references/` copies excluded.
  - Skills: `qa-task/SKILL.md:1015`, `qa-story/SKILL.md:1538`, `review-task/SKILL.md:1244` and `review-story/SKILL.md:1264` cite it. The last two link to the anchor `#step-3-check-each-acceptance-criterion`. None of them dispatch it. Each has a bundled copy at `skills/{finalise,review-task,review-story}/references/finalise-dod-ac-prompt.md`.
  - Tests:
    - `tests/explore-prompts-no-write.test.js:158` reads the prompt as an Explore prompt, so the new Step 0 must not instruct a write.
    - `tests/review-task-measured-criterion.test.js:119` uses `tests/lib/count-of-kinds.js` to hold that the prompt states the count of test-free kinds once, in Step 3, so Step 0 must not state a count of kinds.
    - `tests/review-plan-shape-checks.test.js:225` pins the Step 3 anchor.
- **Bug mode.** The bug-mode table (`skills/finalise/SKILL.md`, § "What bug mode runs and skips") lists every step key. `evals/shared/tests/finalise-bug-mode.test.mjs` asserts that the table and the `**Bug mode (\`key\`):**` markers agree in both directions.

### Target Architecture

```
Step 3a (existing "Prepare Shared Context", extended)
  PRIOR = newest ${STEM}.dod.*.ac.json beside the document (none on a first run)
  node finalise-rerun-scope.js scope --prior PRIOR --doc DOC --head HEAD --json
    → { mode: full | scoped, reason, criteria[] (id, text_hash), rejudge[], carry[] }
  substitute <RERUN_SCOPE> into the AC prompt: the criterion ids the agent must echo,
    plus (scoped only) the rejudge and carry lists. Full → "judge every criterion".

Step 3b dispatch (unchanged shape: four agents, one message)
  AC agent judges rejudge[]; copies carry[] through; anything else it sees → advisories[]

Step 3c aggregation (existing, extended: after the YAML parse, before Step 3d renders)
  node finalise-rerun-scope.js merge --scope SCOPE --result AC_YAML --json
    → AC_RESULT with every carried verdict restored; a carried criterion the agent
      re-judged differently is moved to advisories[], never into status
  write ${STEM}.dod.${DOD_N}.ac.json (head, ids, text hashes, verdicts, citations, members)
```

**Criterion identity.** The engine assigns every criterion's id, and the agent echoes it. The id is the document's own leading id when the line has one (`SC-7`, `AC3`). Otherwise it is `#N`, the criterion's position in the section. Of the 14 most recent task documents, 10 carry no leading ids. A prior criterion is matched by id when the document has ids, and otherwise by text hash. An id-less criterion whose text changed is therefore `new-criterion`. `<RERUN_SCOPE>` lists the ids in full mode too, so every record is keyed the same way. `merge` joins on these ids and never on an id the agent invented.

**Citation paths.** A citation contributes a path only when it resolves to a file `git ls-files` tracks:
- a repo-relative `path:line` resolves to its path, including a path deleted or renamed since the prior head (it counts as changed);
- a bare basename resolves to every file that has it, at HEAD or deleted since the prior head. Any token without a slash is a bare basename, even when a repository-root file has that name: `README.md` resolves to the root file and every nested `README.md` (QA cycle 9, QA9-1). The engine never guesses which one a citation meant: the evidence changed when any of those files changed since the prior head (added, modified, deleted or renamed), and is unchanged when none did. So a file moved under its own name, or a same-basename file added beside the cited one, re-judges the criterion, and a basename several unchanged files share carries it, alone or beside other unchanged paths (QA cycles 2–8: CR2-3, CR3-1, CR4-1, CR6-1, QA8-1). A deleted file is a basename candidate only for the prior record's citations. A new member's evidence is cited by this run's agent against HEAD, so `merge` takes its bare basename's candidates from HEAD alone (QA cycle 5, CR5-1); the rule is otherwise the same one (QA cycles 7–8, QA7-1, QA8-1);
- an abbreviated `:N-M` or a commit SHA does not resolve.

task.239's DoD runs cite all three unresolvable shapes. A PASS with no resolvable code, test or member-evidence path cannot be watched for change, so it is re-judged rather than carried.

**When the scope is `full`** (the engine's reason in brackets): no prior record (`no-prior-record`), a record it cannot read or whose schema it does not know (`prior-unreadable`), a reopened document under the Step 2 rule (`reopened`), or a prior head that is not an ancestor of HEAD (`head-not-ancestor`, a rebase or force-push). Every doubt fails toward a full run, which is today's behaviour.

**When the scope is `scoped`,** each criterion gets one of these outcomes:

| Prior state | Condition | Outcome | Reason |
| --- | --- | --- | --- |
| absent | — | re-judge | `new-criterion` |
| any | criterion text hash differs | re-judge | `criterion-changed` |
| `FAIL` | — | re-judge, carrying the members the prior run mapped whose evidence is unchanged | `reported-gap` |
| `PASS` | a cited path (code, test, or a member's evidence) is in `git diff --name-only PRIOR_HEAD..HEAD` | re-judge | `evidence-changed` |
| `PASS` | no citation resolves to a tracked path (see *Citation paths*) | re-judge | `evidence-unresolved` |
| `PASS` | none of the above | carry | `unchanged` |

**Members in a `reported-gap` re-judge.** Only two kinds of member are judged: the members the prior run reported as FAIL, and members whose evidence path changed or does not resolve. A carried member keeps its prior verdict. A member the prior record never listed, whose evidence is unchanged, goes to `advisories[]` and does not count toward the verdict. A finer re-split is how the task.239 loop found a new gap each run, and this rule stops it. The criterion's status is then recomputed from its merged members: PASS when every counted member is PASS. An agent FAIL is overturned only when the members explain it, meaning every member it failed is carried or advisory. A FAIL that names no failing member, sets `non_member_fail`, or reports `test_runs_per_pr: false` stands. A gap the agent does not answer keeps its prior FAIL. (QA cycles 1–2: CR-3, CR2-1, CR2-2.)

The `reported-gap` row is what would have stopped task.239. Run 4 named SC-11's unmapped groups, and run 5 should have checked those and the members whose evidence moved. Instead it judged three finer groups that no earlier run had named.

**Existing mechanisms of this kind.** `finalise-fix-and-recheck.mjs` decides whether one finding may be fixed in-run (Step 8a). It does not scope a whole run, and this task does not change it. The Step 2 reopen rule stays in force: the engine reads it as `reopened` → `full`. Neither mechanism is replaced. The engine sits beside both.

### Important Clarifications

- Carrying a verdict is not trusting a checkbox. The carried verdict is the prior run's own evidence, and it is re-judged as soon as any cited path changes.
- CI and the QA gate still gate acceptance as they do today. A change elsewhere that breaks a carried criterion turns CI red, and Step 6 refuses on CI.
- `overall` is recomputed from the merged `acs[]` **and** `docs[]`. A failing `docs[]` item keeps `AC_OVERALL` off PASS, as it does today.
- A reopened document is always `full`. Its `PASSED ✅` heading still matches the Step 2 rule after it is retitled historical, so every re-run after a reopen judges every criterion. This is intended: a reopened document is new work.
- **Reconstruction states.** The record is the only state `scope` reads, and it must answer correctly in each of these:
  - the record's run crashed before Step 6 decided: its verdicts are still judgements at its head, so it is used;
  - prior head equals HEAD: a re-run with no commits, where only the reported gaps are re-judged;
  - the record exists on disk but was never committed: it is found by the same glob and used;
  - Step 8a changed the tree after 3c wrote the record: the next run sees the fix commit in `git diff` and re-judges what it touched;
  - a later DoD run wrote no record (it crashed before 3c): the newest record is the older run's, and its head is diffed against HEAD as usual.

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

- [x] `scope`: the four `full` reasons and the six per-criterion rows of § 3, with criterion text hashing on a normalised line (checkbox state stripped, whitespace collapsed)
- [x] Criterion identity (§ 3): the document id or `#N`, matched by id or by text hash
- [x] Citation resolution (§ 3): repo-relative path, or a unique basename through `git ls-files`; an ambiguous basename resolves to every candidate (changed when any changed)
- [x] `merge`: restore every carried verdict and citation, and move a carried criterion's differing agent verdict into `advisories[]`. Apply the § 3 member rules and recompute a `reported-gap` criterion's status from its merged members. Recompute `overall` from the merged `acs[]` and `docs[]`. Parse the agent's YAML with `yaml-subset.js` (`parseYamlSubset`). Unparseable output leaves Step 3c's existing `NEEDS_MANUAL_REVIEW` rule in force, and no record is written.
- [x] Exit codes in the repository's idiom: 0 for any answer (read `mode`/`reason`), 2 for a usage error
- [x] Unit tests on a temp git repo, one per reason, plus the task.239 replay and its controls (§ 8)

### Phase 2: The AC prompt (Risk: Medium)

- [x] A new section before Step 3 that reads `<RERUN_SCOPE>`. Keep the `### Step 3: Check each acceptance criterion` heading byte-identical, because two skills link to its anchor.
- [x] The section tells the agent to use the criterion ids `<RERUN_SCOPE>` lists, in full mode too. It instructs no write (`explore-prompts-no-write.test.js`) and states no count of kinds (`count-of-kinds.js`).
- [x] Output gains `members[]` (member, evidence, status) on quantified criteria and a top-level `advisories[]`
- [x] `full` scope reads exactly as today's prompt

### Phase 3: Wire `/finalise` (Risk: Medium)

- [x] Existing Step 3a (Prepare Shared Context): locate the prior record with `newest_numbered … -name "${STEM}.dod.*.ac.json"` and run `scope`. Add `<RERUN_SCOPE>` to the Step 3b dispatch table. No new step heading.
- [x] Existing Step 3c (Aggregate Results): after the YAML parse and before Step 3d renders, run `merge` and write `${STEM}.dod.${DOD_N}.ac.json`
- [x] DoD Step 2 block: the line `**Re-run scope:** {mode} ({reason}) — {K} re-judged, {M} carried`, and the advisory list
- [x] Bug-mode table row `rerun-scope` (story/task run, bug skip) and its marker
- [x] 6a and 8 stage the AC record with the DoD file (6a: an existence-checked add beside the registry add; `/finalise` Step 8 stages nothing, and the orchestrator's Step 8 `/commit-changes --scope` carries the record on a gaps halt)

### Phase 4: Bundle, docs, record (Risk: Low)

- [x] `npm run bundle`, then confirm `bundle:check` is clean
- [x] CHANGELOG [Unreleased] entry citing task 242
- [x] Mutation-prove each new guard and record it in the commit body

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
9. ✅ Must stay green, no edit expected: `tests/explore-prompts-no-write.test.js`, `tests/review-task-measured-criterion.test.js` and `tests/review-plan-shape-checks.test.js`. Each reads the AC prompt (§ 3, *Other readers*).

### Files to Modify (Documentation)

10. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

- **Scope:** `finalise-rerun-scope.js`, both commands, every reason.
- **Fixture:** a temp git repo with a task document and cited files, and a prior record at commit A. Each case makes one change and commits B.
- **task.239 replay:** a prior record in which SC-11 is FAIL with groups G1–G3 named unmapped and G4–G6 mapped. HEAD changes only the task document. Expected from `scope`: SC-11 is `reported-gap`, with G4–G6 carried and G1–G3 re-judged. Every untouched PASS is `unchanged`. The replay continues through `merge`. The agent returns SC-11 FAIL, with G1–G3 PASS, G5 FAIL, and a new finer group G7 FAIL whose evidence is unchanged. The merged SC-11 is PASS: G5 is restored and G7 goes to `advisories[]`.
- **Controls** (obs #176 — vary each dimension the rule reads):
  - a cited test file changed → `evidence-changed`
  - a criterion reworded → `criterion-changed`
  - a criterion added → `new-criterion`
  - a rebased prior head → `full`/`head-not-ancestor`
  - a corrupt record → `full`/`prior-unreadable`
  - a reopened document → `full`/`reopened`
  - a carried PASS whose citations are `:356-360` and a commit SHA → `evidence-unresolved`. Control: a bare basename that matches exactly one tracked file resolves, and the PASS carries as `unchanged`.
  - an id-less document (a story fixture and a task fixture): criteria get `#N` ids; a reworded id-less criterion → `new-criterion`; an unchanged one matches by text hash
  - the reconstruction states of § 3: prior head equal to HEAD, and a record that is not committed
- **merge:**
  - an agent that returns FAIL for a carried criterion: the merged status stays PASS, and the finding appears in `advisories[]`
  - an agent that omits a carried criterion: still restored
  - an agent that returns its own ids (`AC1`, `AC2`) instead of the engine's: the join uses the engine's ids, and the mismatch is reported, not silently merged
  - `overall` is recomputed, never copied from the agent. A failing `docs[]` item over all-PASS criteria keeps `overall` off PASS.
- **Guards to mutation-prove (the closed set SC-11 counts).** Each guard gets one mutation that turns its test red, and is then restored:
  1. each of the ten scope reasons (four `full`, six per-criterion)
  2. criterion id assignment and text-hash matching
  3. citation resolution
  4. the `merge` rules: carried status restored, differing verdict sent to advisory, reported-gap status recomputed, new unchanged member sent to advisory, and `overall` taken from `acs[]` and `docs[]`
  5. the contract pins: the Step 0 section, the byte-identical Step 3 heading, `<RERUN_SCOPE>` in the dispatch row, the scope line, the advisory list, and the `rerun-scope` bug-mode marker
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
- [ ] SC-2: `scope` assigns `new-criterion`, `criterion-changed`, `reported-gap`, `evidence-changed`, `evidence-unresolved` and `unchanged` per § 3's table, each pinned by a test. Criteria in an id-less document get `#N` ids and match by text hash, pinned on a story fixture and a task fixture.
- [ ] SC-3: The task.239 replay fixture scopes SC-11 to `reported-gap`. The members the prior run mapped are carried; the ones it named unmapped are re-judged. Every untouched PASS is `unchanged`. Through `merge`, an agent FAIL that rests only on a carried member and a new unchanged member yields SC-11 PASS, with the new member in `advisories[]`.
- [ ] SC-4: `merge` keeps a carried criterion's prior status and citations whatever the agent returned, and moves a differing agent verdict into `advisories[]`. Pinned by tests for "agent returns FAIL" and "agent omits it".
- [ ] SC-5: `merge` recomputes `overall` from the merged `acs[]` and `docs[]`. An agent `overall: FAIL` over all-PASS criteria and docs yields PASS. A failing `docs[]` item over all-PASS criteria does not.
- [ ] SC-6: `/finalise` Step 3a runs `scope` before dispatch, and Step 3c runs `merge` and writes `${STEM}.dod.${DOD_N}.ac.json`. A contract test reads both commands in `skills/finalise/SKILL.md`.
- [ ] SC-7: The AC prompt reads `<RERUN_SCOPE>` in a section before Step 3. `### Step 3: Check each acceptance criterion` is byte-identical to today's (contract test).
- [ ] SC-8: The DoD Step 2 block template carries the re-run scope line and the "Advisory (not a gap)" list (contract test).
- [ ] SC-9: The bug-mode table carries `rerun-scope` with a bug-mode skip marker. `finalise-bug-mode.test.mjs` is green and goes red with the marker removed.

### Performance

- [ ] SC-10: Not applicable. No numeric bound is claimed (§ 8).

### Code Quality

- [ ] SC-11: Each guard in § 8's *Guards to mutation-prove* list is mutation-proved: red without the behaviour, green with it. The implementation report has one mutation row per listed guard, and the list is closed.
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
   - Mitigation: `members[]` carries each member's evidence path, and the citation rule already requires a code and a test citation for a PASS. A PASS whose citations resolve to no tracked path is re-judged (`evidence-unresolved`), never carried. The task.239 replay control varies a cited test file.
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

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-10-29
**Quality Score**: 90/100
**Gate Decision**: CONCERNS

### QA Report
- **Full Report**: [task.242.qa.10.scope-finalise-re-runs.md](./task.242.qa.10.scope-finalise-re-runs.md)
- **Gate File**: [task.242.gate.10.scope-finalise-re-runs.yml](./task.242.gate.10.scope-finalise-re-runs.yml)

### Test Coverage Summary
- **Tests Executed**: 52
- **Phases Verified**: 18/18
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
The cycle-9 fix is verified (2 of 2 mutations covered) and there is no high finding. One medium remains:
- QA10-1: a path citation written with `./`, a leading `/`, backslashes or a `#L` anchor is matched exactly and resolves to nothing, while the plain `path:line` form resolves. Promoted at high confidence; reproduced by execution. No committed record here uses these shapes.

## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-10-29 | 1.0 | Initial draft — cut from observation #121 | create-task |
| 2026-10-29 | 1.1 | Review 1 (6/10 → 8/10): engine-assigned criterion ids; citation resolution and `evidence-unresolved`; reported-gap member rules and status recompute; `overall` from `acs[]` and `docs[]`; reconstruction states; tests that read the AC prompt; SC-11 closed to a named guard list | review-task |
| 2026-10-29 |  | Status → ready-for-development | review-task |
| 2026-10-29 |  | Implemented — 9 authored files (engine, its 33 tests, AC prompt, finalise SKILL.md, 2 pipeline step docs, 2 eval tests, CHANGELOG) plus bundled copies; 4 contract tests added; 28 guards mutation-proved | develop |
| 2026-10-29 |  | QA gate FAIL (30/100) — 5 findings (2 high: unbound `STEM`/`DOD_N` in Steps 3a and 3c); Status → in-progress | qa-task |
| 2026-10-29 |  | QA fix cycle 1 — all 8 findings fixed (CR-1–CR-5 from the gate, CR-6–CR-8 advisory): Steps 3a and 3c bind `STEM`/`DOD_N` in-block with a HALT guard; reported-gap merge keeps an unexplained agent FAIL and fails an unanswered re-check member; 7.6a/7.6b use this run's AC record; 8 new tests plus CR-6 assertions in an existing one, 9 mutations covered; Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate FAIL (40/100) — 3 findings (all high: reported-gap merge passes an omitted criterion and an invented-member FAIL; a deleted or renamed cited path is dropped); cycle-1 fixes verified; Status → in-progress | qa-task |
| 2026-10-29 |  | QA fix cycle 2. The 3 gate findings are fixed, plus advisory CR2-4. CR2-1: an unanswered gap keeps its prior FAIL. CR2-2: a structured `non_member_fail` keeps a non-member agent FAIL, and the overturned note is kept as an advisory. CR2-3: deleted and renamed cited paths now count as changed. CR2-4: the record carries the dirty paths, re-judged next run. § 3 merge rule restated to match. 4 new tests; 10 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate FAIL (80/100). 1 finding: CR3-1, a same-basename directory move makes a bare citation ambiguous and the criterion is carried, introduced by the CR2-3 fix. The cycle-2 fixes verified (10 of 10 covered). Status → in-progress | qa-task |
| 2026-10-29 |  | QA fix cycle 3. CR3-1: a bare basename resolves against HEAD first, falling back to a gone path only when HEAD has none, so a file moved under its own name is re-judged. CR3-2: diffs read with `-z`. Two dead-code cleanups. § 3 *Citation paths* restated. 3 new tests; 6 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: CR4-1 (medium), an ambiguous bare basename across HEAD and a gone path is resolved as exact and carried. The cycle-3 fixes verified (6 of 6 covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 4. CR4-1: when a gone path also carries a bare basename, the citation resolves to every candidate and the criterion is re-judged, not carried on a guess. § 3 *Citation paths* restated. 1 test rewritten, 1 added; 4 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: CR5-1 (medium, promoted). The gone-candidate rule also reaches merge's new-member evidence, so a same-basename deletion counts a new member on unchanged evidence. CR4-1 verified (4 of 4 covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 5. CR5-1: `merge` resolves a new member's evidence against HEAD alone; the gone-candidate rule stays with the prior record's citations. § 3 *Citation paths* restated. 1 test added, seen failing before the fix; mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: CR6-1 (medium, promoted). A file added under a cited basename makes a bare prior-record citation resolve to nothing, so a criterion whose cited file changed is carried. CR5-1 verified (covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 6. CR6-1 (scope the claim): a bare basename several files carry no longer names one. It resolves to every candidate when any of them changed since the prior head (added, modified or gone), else to nothing. This subsumes the CR4-1 gone-only rule. `merge` keeps the HEAD-alone rule (CR5-1). § 3 *Citation paths* restated. 1 test added, 1 extended, both seen failing first; 2 of 3 mutations covered, 1 absorbed. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: QA7-1 (medium). On the merge side, a multi-token new-member citation with an ambiguous changed basename reads as unchanged, so the agent's FAIL is overturned. Reproduced by execution. CR6-1 verified (2 of 2 covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 7. QA7-1 (consolidate the contract): `merge` builds its index with `evidenceIndex(…, { goneCandidates: false })`. That keeps `changed`, so one ambiguity rule runs over HEAD's candidates, and the hand-built `changed: null` override is gone. § 3 *Citation paths* restated. 1 merge test added (candidate changed → FAIL stands; none changed → overturned), 1 extended, both seen failing first; 2 of 2 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: QA8-1 (medium, promoted). In merge, a new member citing only an ambiguous bare basename with no changed candidate reads unresolved and keeps its FAIL, while the same token beside an unchanged path overturns it. Reproduced by execution. QA7-1 verified (2 of 2 covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 8. QA8-1 (replace the mechanism, operator's choice): a bare basename resolves to every file that carries it, always, so evidence is changed when any candidate changed and unchanged when none did; an ambiguous basename is never unresolved. The scope side follows the same rule (CR-2), and the goneCandidates comments say what they exclude (CR-3). § 3 *Citation paths* restated. 3 tests updated, 1 extended, 1 added, all seen failing first; 3 of 3 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: QA9-1 (medium, promoted). A bare citation that also names a repository-root file stops at the exact-path check and resolves to that file alone, so a changed same-basename file elsewhere is missed; in merge a deleted root file still matches. Reproduced by execution. QA8-1 verified (3 of 3 covered) | qa-task |
| 2026-10-29 |  | QA fix cycle 9. QA9-1 (finishing the cycle-8 replace): a token without a slash always goes through the basename rule, so a name a root file shares resolves to every candidate, and merge's index no longer matches a deleted root file. § 3 *Citation paths* restated. 3 tests added, all seen failing first; 2 of 2 mutations covered. Status → ready-for-review | qa-fix |
| 2026-10-29 |  | QA gate CONCERNS (90/100). 1 finding: QA10-1 (medium, promoted). A path citation written with `./`, a leading `/`, backslashes or a `#L` anchor is matched exactly and resolves to nothing, while the plain form resolves. Reproduced by execution. QA9-1 verified (2 of 2 covered). The granted budget (10) is spent at this gate | qa-task |

---

## Progress Tracking

- [x] Phase 1: The engine
- [x] Phase 2: The AC prompt
- [x] Phase 3: Wire `/finalise`
- [x] Phase 4: Bundle, docs, record

---

## References

- Observation #121 — Finalise re-runs re-judge passed criteria more finely each time, so a DoD loop has no fixed point
- `docs/tasks/task.239.qa-escalation-and-grant-say-what-runs/task.239.dod.5.qa-escalation-and-grant-say-what-runs.md` — the override that ended the five-run loop
- `skills/finalise/SKILL.md` § Step 2 (reopen rule), § Step 3 (dispatch), § Step 8a (`finalise-fix-and-recheck.mjs`)

## Notes

- QA report: `task.242.qa.{N}.scope-finalise-re-runs.md`
- Bug reports: `task.242.bug.{N}.{name}.md`
- Quality gate: `task.242.gate.{N}.scope-finalise-re-runs.yml` (co-located)
