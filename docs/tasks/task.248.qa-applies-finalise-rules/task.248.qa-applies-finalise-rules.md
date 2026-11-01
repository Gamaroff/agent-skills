---
id: task.248
title: "QA applies the finalise DoD's rules before finalise does"
type: task
description: "Make qa-task and qa-story apply, mechanically and from one definition each, the four rules /finalise's DoD agents apply and QA currently skips or judges by eye: the boundary classification of the Success Criteria, the per-member quantifier rule, the ban on unapproved criterion amendments, and the CHANGELOG citation — so each failure surfaces in the QA loop, where a fix is cheap, instead of halting /finalise."
tags: [qa-task, qa-story, finalise, qa-fix, develop, observation]
category: refactoring
status: ready-for-review
priority: Medium
created: 2026-11-01
updated: 2026-11-01
assignee:
estimated_effort_hours: 16
github_issue: 801
---

# Technical Task: QA applies the finalise DoD's rules before finalise does

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.248.review.1.qa-applies-finalise-rules.md` implemented 2026-11-01
**GitHub Issue**: [#801](https://github.com/Gamaroff/agent-skills/issues/801)

---

## 1. Overview

**Description.** `qa-task` and `qa-story` already say "classify each criterion the way finalise will".
In practice, four of the rules `/finalise`'s DoD agents enforce reach QA as prose, or not at all, so
QA judges them by eye and passes what finalise later fails. This task gives each of the four one
definition that both sides run.

**Scope.** The QA skills (`qa-task`, `qa-story`), the finalise DoD prompts that own the rules
(`finalise-dod-ac-prompt.md`, `finalise-dod-security-prompt.md`), `finalise` Step 6d, and `develop`'s
completion checklist.

**Key deliverables.**

1. A runnable criteria boundary check, shared by QA and the DoD security agent, whose result a gate
   must record and answer.
2. A criteria-drift engine that lists every Success Criteria line changed since the PR base, and
   whether it carries an approver.
3. One CHANGELOG-citation script used by `/finalise` 6d, `develop`'s completion checklist and QA's
   docs check.
4. QA cites finalise's quantifier rule and turns each unmapped member into a MEDIUM finding.

**Expected outcome.** None of the four rules can pass a QA gate and then fail `/finalise` on the same
evidence.

## 2. Motivation

### Current Problems

- **The boundary question gets two answers** (obs #140). On task.234, all seven QA gates recorded
  security `boundary: false`. `/finalise`'s security agent recorded `boundary: true` on the same diff.
  It cited criterion #2 ("Teardown **never** changes the mode…"), which `classifyBoundaryText`'s
  criteria scope matches, and a root guard that refuses on filesystem state. The signal list is
  defined once (`shared/resources/probe-boundary-signals.mjs:82`, `classifyBoundaryText`), but nothing
  in QA runs it. QA reads the rule and decides, and that decision is where the two diverge. The DoD
  zero-guard then needed an owner override at the last step.
- **An amended criterion passes on its checkbox** (obs #139). On task.234, qa-fix cycle 2 wrote
  "That is accepted as the cost…" into criterion #5 after the bound was missed, and left it ticked.
  `skills/qa-fix/SKILL.md:825` (`### Step 5: Update Story File and Bug Reports (Authorized Sections
  ONLY)`) does not authorise that edit, but nothing checks it. Five QA gates and the 5c conformance
  lens read the box as met. Only the DoD AC agent failed it, for having no approver.
- **The quantifier rule lives only in the DoD** (obs #23). `finalise-dod-ac-prompt.md:51` (Step 3,
  rule 6, `**Quantifier rule**`) checks a criterion over a set member by member.
  `skills/qa-task/SKILL.md:1037` and `skills/qa-story/SKILL.md:1576` ("Classify each … criterion the
  way finalise will") name finalise's criterion kinds, but not this rule. On task.181, three QA
  cycles passed two set criteria on evidence for some of their members, and the DoD failed both.
- **The CHANGELOG citation is checked only at 6d** (obs #43, part a). `skills/finalise/SKILL.md:1947`
  (6d) HALTs `no-changelog-entry` when `[Unreleased]` does not cite the task. `skills/develop/SKILL.md:813`
  asks only for "CHANGELOG.md updated (if public behaviour…)", and QA's docs check does not ask at
  all. The missing entry is found after the acceptance commit has already been pushed.

### Benefits of Solution

- Each of the four failures surfaces at gate 1, when a fix is one qa-fix cycle instead of a HALT
  that needs an operator.
- One definition per rule: QA and finalise cannot drift apart again, and a change to the rule
  changes both.
- The boundary answer becomes a recorded fact with a stated reason, not a silent judgement.
- Criterion amendments become visible and need a named approver, as waivers already do
  (`approved_by` in the gate `waiver:` block).

## 3. Technical Background

### Current Architecture

- **Boundary signals.** `shared/resources/probe-boundary-signals.mjs:82` exports
  `classifyBoundaryText(text, { scope })`. Its `"criteria"` scope adds the Success Criteria
  vocabulary (*never*, *must not*, *fails closed*, *refused*). It is a library with no CLI.
  `shared/resources/security-probe.mjs:321` re-exports it. `finalise-dod-security-prompt.md:50`
  describes it to the agent as prose. `skills/qa-task/SKILL.md:709` (`3. **Apply the boundary rule —
  execute, do not only read.**`) and `skills/qa-story/SKILL.md:1211` cite Step 1b and leave the
  decision to the reviewer.
- **Criteria reading.** `shared/resources/finalise-rerun-scope.js:92` (`readCriteria(body)`) reads
  the Success or Acceptance Criteria section and returns `[{ id, text, text_hash }]`, one per
  checkbox or numbered line. It reads **only the criterion line itself**. The task.234 amendment was
  an indented italic continuation line under the checkbox, which `readCriteria` does not see. A
  drift check built on it as it stands would have missed that amendment.
- **Quantifier rule.** It is stated once, at `shared/resources/finalise-dod-ac-prompt.md:51`.
- **CHANGELOG check.** It is inline in `skills/finalise/SKILL.md` 6d: an `awk` over `[Unreleased]`
  plus `grep -qiE "\btask[ .]${N}\b"`, gated on `changelog-enforce.sh` (`shared/resources/changelog-enforce.sh`).
  Nothing else calls the check.

### Target Architecture

- `probe-boundary-signals.mjs` gains a CLI entry: `--doc <work-item.md> --json` extracts the criteria
  section and prints `{ boundary, matched[] }` from `classifyBoundaryText(section, { scope: "criteria" })`.
  The QA skills run it at the boundary step and write the result into the gate as
  `nfr_validation.security.boundary_signals`. A gate that records `boundary: false` while
  `matched[]` is non-empty must carry `boundary_reason`. The DoD security prompt's Step 1b runs the
  same command for the criteria signal.
- A new engine, `shared/resources/criteria-drift.js`, compares the criteria section, **including
  each criterion's continuation lines**, between the PR base (`git merge-base HEAD origin/<base>`) and
  the working tree. It ignores checkbox ticks. It reports each changed criterion with a `kind` and
  whether its new text carries `approved by <name>`:
  - `reworded`: the criterion's existing words changed (on the checkbox line or a continuation line).
    QA turns each unapproved `reworded` change into a MEDIUM `top_issues[]` entry.
  - `appended`: the old text survives unchanged and text was only added. Develop and QA legitimately
    append evidence notes this way (task.234 criteria #1, #2 and #4), and the task.234 amendment was
    itself written inside one. So the engine does not decide: the QA gate must record, per `appended`
    criterion, whether the added text relaxes the criterion (`criteria_drift[].relaxes: true|false`,
    with a one-line `reason`). An `appended` change recorded `relaxes: true` without an approver is a
    MEDIUM finding; an `appended` criterion with no recorded answer is a gate read-back failure.
    *(Decided at review, 2026-11-01: split reworded/appended — the engine forces the answer, as the
    boundary CLI does.)*

  The finalise AC prompt reads an unapproved `reworded` change, or an `appended` change that relaxes
  the bound without an approver, as FAIL, `note: "amendment unapproved"`.
- `shared/resources/changelog-cites.sh <stem>` moves 6d's check into one script. Exit codes:
  - 0: `[Unreleased]` cites the stem.
  - 1: `CHANGELOG.md` exists, enforcement is on, and the entry is missing.
  - 2: usage (no argument, or a stem `doc-id.js` cannot read).
  - 3: not applicable: enforcement off, no `CHANGELOG.md`, or a valid non-task stem (story, bug).
    6d checks tasks only today, so a story or bug stem must stay a pass-through, or "6d behaviour is
    unchanged" is false.
  - 4: unknown: `changelog-enforce.sh` answered neither `on` nor `off`. 6d maps this to its existing
    `changelog-unknown` HALT, word for word.

  6d, `develop`'s completion checklist and QA's docs check all call it.
- The QA skills **cite** `finalise-dod-ac-prompt.md` Step 3 rule 6 rather than restating it, and
  turn every unmapped member into a MEDIUM finding.

## 4. Scope

### In Scope

✅ The criteria boundary CLI, and its use in `qa-task`, `qa-story` and `finalise-dod-security-prompt.md`
✅ `criteria-drift.js`, and its use in `qa-task`, `qa-story` and `finalise-dod-ac-prompt.md`
✅ `changelog-cites.sh`, and its use in `finalise` 6d, `develop`'s completion checklist, `qa-task` and `qa-story`
✅ The quantifier-rule citation in `qa-task` and `qa-story`
✅ A rule in `qa-fix` Step 5: a criterion bound it cannot meet is an open finding for escalation, never an edit to the criterion

### Out of Scope

❌ obs #43 part (b), a PR-head measurement taken by `/finalise`. That belongs to the measured-criteria card (obs #31, #32, #33).
❌ New criterion kinds in the DoD AC prompt: process, CI-state, implementation-report evidence. That is task.249.
❌ Making the `forceRemoveTree` root guard probeable by an engine form. That is a separate engine change.
❌ `review-task` / `review-story` checks. They already cite the classification (`skills/review-task/SKILL.md:1243`).

## 5. Breaking Changes

**Gate schema: an additive field.** `nfr_validation.security.boundary_signals` (the CLI's `matched[]`)
and `boundary_reason` are new optional keys. Gates without them stay valid. A `schema: 2` gate written
after this task, whose `boundary: false` sits beside a non-empty `boundary_signals` with no
`boundary_reason`, is reported by the QA skill's own read-back.

**Migration path:** none for existing gates. New QA runs write the keys.

**6d behaviour is unchanged.** The same check moves into a script; the HALT reasons and messages
stay the same.

## 6. Implementation Plan

> Detailed implementation guide: [task.248.plan.qa-applies-finalise-rules.md](task.248.plan.qa-applies-finalise-rules.md)

### Phase 1: Criteria boundary CLI (Risk: Low)

**Files:** `shared/resources/probe-boundary-signals.mjs`, `shared/resources/tests/probe-boundary-signals.test.mjs`

- [x] Add a CLI entry, guarded so an import does not run it: `--doc <path> [--json]` reads the
      criteria section with the same heading pair `readCriteria` uses, and prints
      `{ reason, boundary, matched }`.
- [x] Return reasons: `classified`, `no-criteria` (exit 1, never `boundary: false`), and `usage` (exit 2).
- [x] Tests: task.234's criterion #2 wording matches; a criteria section with no signal word reports
      `boundary: false`; a document with no criteria section reports `no-criteria`.

### Phase 2: criteria-drift engine (Risk: Medium)

**Files:** `shared/resources/criteria-drift.js` (new), `shared/resources/tests/criteria-drift.test.mjs` (new),
`shared/resources/finalise-rerun-scope.js` (export a continuation-aware reader, or a shared helper both use)

- [x] Read each criterion **with its continuation lines** (indented lines up to the next criterion
      or heading), both at `--base <ref>` and in the working tree.
- [x] Report `{ reason, changed: [{ id, kind, before, after, approved, approver }] }`, `kind` one of
      `reworded` or `appended` (see Target Architecture). A checkbox tick alone is not a change.
      `approved` means the new text carries `approved by <name>`.
- [x] Reasons: `clean`, `drift` (exit 0, both of them), `new-document` (the file did not exist at base),
      and `usage` (exit 2). A base the engine cannot read is `usage`, never `clean`.
- [x] Tests, on committed fixture documents (a before and an after copy under
      `shared/resources/tests/fixtures/criteria-drift/`, never read from git history): the task.234
      criterion #5 amendment as it stood before approval is `appended`, unapproved; the same text with
      `approved by <name>` is `appended`, approved; a tick-only change is `clean`; a criterion
      reworded on its checkbox line is `reworded`; a changed word inside an existing continuation line
      is `reworded`; edits to QA Results and the Change Log only are `clean`.

### Phase 3: CHANGELOG citation script (Risk: Low)

**Files:** `shared/resources/changelog-cites.sh` (new), `shared/resources/tests/changelog-cites.test.mjs` (new), `skills/finalise/SKILL.md`

- [x] Move 6d's `awk` and `grep` into the script, gated on `changelog-enforce.sh`. Exit codes:
      0 cites, 1 missing, 2 usage, 3 not applicable (including a story or bug stem), 4 enforcement
      unknown.
- [x] 6d calls the script and keeps its HALT messages (`no-changelog-entry`, `changelog-unknown`) and
      its two "not applicable" lines word for word.
- [x] Tests under bash and zsh (CI installs zsh, `test.yml`): cites, missing, enforce off, enforce
      unknown, no `CHANGELOG.md`, a story stem (3), a malformed stem (2), and both directions of the
      prefix control: a `(task 24)` entry does not satisfy `task.248`, and a `(task 248)` entry does
      not satisfy `task.24`. A test pins the 6d HALT strings.

### Phase 4: Wire the QA skills, qa-fix and develop (Risk: Medium)

**Files:** `skills/qa-task/SKILL.md`, `skills/qa-story/SKILL.md`, `skills/qa-fix/SKILL.md`,
`skills/develop/SKILL.md`, `shared/resources/finalise-dod-security-prompt.md`, `shared/resources/finalise-dod-ac-prompt.md`

- [x] Boundary step (`qa-task:709`, `qa-story:1211`): run the Phase 1 CLI, record
      `boundary_signals` in the gate, and require `boundary_reason` beside `boundary: false` when
      signals matched.
- [x] Criterion classification (`qa-task:1037`, `qa-story:1576`): cite `finalise-dod-ac-prompt.md`
      Step 3 rule 6; each unmapped member is a MEDIUM `top_issues[]` entry.
- [x] Same step: run `criteria-drift.js`. Each unapproved `reworded` change is a MEDIUM
      `top_issues[]` entry whose remedy is "escalate for an approver, or restore the criterion". Each
      `appended` change gets a gate `criteria_drift[]` entry with `relaxes` and `reason`; `relaxes: true`
      without an approver is the same MEDIUM finding.
- [x] Gate read-back (a fenced block in each QA skill, beside the existing gate read-back): fail when
      `boundary: false` sits beside a non-empty `boundary_signals` with no `boundary_reason`, or when
      an `appended` criterion has no `criteria_drift[]` answer.
- [x] Docs check: run `changelog-cites.sh`; exit 1 is a MEDIUM finding.
- [x] `qa-fix` Step 5: state that a criterion bound qa-fix cannot meet is recorded as an open
      finding for Loop Escalation, never as an edit to the criterion.
- [x] `develop` completion checklist (`skills/develop/SKILL.md:813`): add the `changelog-cites.sh` line.
- [x] `finalise-dod-security-prompt.md` Step 1b: run the Phase 1 CLI for the criteria signal.
      `finalise-dod-ac-prompt.md`: run `criteria-drift.js`, and read an unapproved amendment as FAIL.
- [x] `npm run bundle`, and commit the regenerated `references/` copies.
- [x] Wiring test `shared/resources/tests/qa-finalise-rules-wiring.test.mjs` (new; reached by the
      `shared/resources/tests/*.test.mjs` glob in `package.json`): extracts the new fenced blocks from
      `skills/qa-task/SKILL.md` and `skills/qa-story/SKILL.md` with `extractBlocks`
      (`qa-execute-snippets.mjs`) and runs them on fixtures — the boundary block writes
      `boundary_signals`; the read-back block fails a `boundary: false` gate with signals and no
      `boundary_reason`, and passes one with it; the drift block produces a MEDIUM for an unapproved
      `reworded` fixture. It also holds the single-home rule: the quantifier rule's text appears in
      `finalise-dod-ac-prompt.md` only, and both QA skills cite it.

## 7. Files Summary

**Core implementation**

1. `shared/resources/probe-boundary-signals.mjs`: the CLI entry
2. `shared/resources/criteria-drift.js`: new engine
3. `shared/resources/finalise-rerun-scope.js`: the continuation-aware criteria reader (export or shared helper)
4. `shared/resources/changelog-cites.sh`: new script

**Prose**

5. `skills/qa-task/SKILL.md`: boundary step, criterion classification, docs check
6. `skills/qa-story/SKILL.md`: the same three sites
7. `skills/qa-fix/SKILL.md`: Step 5 rule
8. `skills/develop/SKILL.md`: completion checklist line
9. `skills/finalise/SKILL.md`: 6d calls the script
10. `shared/resources/finalise-dod-security-prompt.md`: Step 1b runs the CLI
11. `shared/resources/finalise-dod-ac-prompt.md`: unapproved amendment is FAIL

**Tests**

12. `shared/resources/tests/probe-boundary-signals.test.mjs`
13. `shared/resources/tests/criteria-drift.test.mjs` (new)
14. `shared/resources/tests/changelog-cites.test.mjs` (new)
15. `shared/resources/tests/qa-finalise-rules-wiring.test.mjs` (new)
16. `shared/resources/tests/fixtures/criteria-drift/` (new fixture documents)

**Generated:** `skills/*/references/` copies from `npm run bundle`.

**Documentation:** `CHANGELOG.md` (`[Unreleased]`, citing task 248).

## 8. Testing Strategy

**Unit tests (per PR, `npm test`).** One test file per engine (Phases 1–3), covering each reason
code and each exit code. `changelog-cites.sh` also runs under bash and zsh.

**Controls (obs #176).** Each engine is tested on the task.234 case that motivated it **and** on a
case the task text never mentions:

- boundary CLI: a criteria section whose only signal is "must not";
- drift: an amendment written on the checkbox line itself rather than a continuation;
- CHANGELOG: a `(task 248)` entry must not satisfy stem `task.24` (the direction that could
  false-pass), and a `(task 24)` entry must not satisfy `task.248`.

There is also one correct instance per engine that it must leave alone.

**Mutation proofs.** For each engine, revert the deciding branch and confirm a named test goes red:

- the `approved` match in drift;
- the continuation-line read;
- the 3-vs-0 split in `changelog-cites.sh`;
- the `no-criteria` arm in the CLI.

**Prose wiring.** QA's use of the engines is asserted by `qa-finalise-rules-wiring.test.mjs`, which
extracts the new fenced blocks with `qa-execute-snippets.mjs`'s `extractBlocks` and runs them on
fixtures, not by grepping the source (memory: assert behaviour, not source text). Note that
`qa-execute-snippets` is QA's run-time snippet executor, not a per-PR test of `qa-task`'s blocks;
without this file no per-PR test would hold the integration criteria.

## 9. Success Criteria

### Functional

- [x] The boundary CLI on task.234's document reports `boundary: true` with a matched `never`
      signal. On a criteria section with no signal word it reports `boundary: false`. On a document
      with no criteria section it reports `no-criteria`, exit 1.
- [x] `criteria-drift.js` reports task.234's criterion #5 amendment (fixture), as it stood before the
      owner approved it, as `appended` and unapproved. It reports the approved wording as approved, a
      checkbox-line rewording as `reworded`, and a tick-only change as clean
      (`criteria-drift.test.mjs`).
- [x] `changelog-cites.sh` returns 0, 1, 2, 3 and 4 on the cited, missing, malformed-stem,
      not-applicable and enforcement-unknown fixtures, the same under bash and zsh. Neither prefix
      control (`task 24` vs `task.248`, `task 248` vs `task.24`) is satisfied
      (`changelog-cites.test.mjs`).
- [x] `finalise` 6d calls `changelog-cites.sh`, and its HALT messages are unchanged (pinned by
      `changelog-cites.test.mjs`).

### Integration

- [x] The `qa-task` boundary block, run on a document whose criteria match a boundary signal, records
      `boundary_signals`; the gate read-back fails `boundary: false` without `boundary_reason`
      (`qa-finalise-rules-wiring.test.mjs`).
- [x] The QA skills cite `finalise-dod-ac-prompt.md` Step 3 rule 6. The rule's text appears in that
      prompt only (`qa-finalise-rules-wiring.test.mjs`).

### Code Quality

- [x] `npm run ci` passes, run with `.agents/skills` moved aside (memory: the symlink masks CI failures).
- [x] `npm run bundle:check` reports 0 problems, and no copy is `UNREACHED`.
- [x] Each engine fix is mutation-proved, recorded per engine in the implementation report.

### Migration

- [x] CHANGELOG `[Unreleased]` cites task 248.

## 10. Risk Assessment

### MEDIUM

1. **The drift engine over-reports.**
   - Risk: a QA cycle legitimately edits the document (QA Results, Change Log), and a reader that
     strays outside the criteria section would flag those edits.
   - Probability: Medium. Impact: noisy MEDIUM findings.
   - Mitigation: the engine reads the criteria section only, ignores ticks, and has a test where
     QA Results and the Change Log change and the result is `clean`. Evidence notes appended under a
     criterion are reported as `appended`, not as findings: QA records whether each relaxes the
     bound, so a note costs one gate line, not a MEDIUM.
2. **Boundary signals fire on ordinary criteria wording.**
   - Risk: "never" in a criterion is common.
   - Probability: Medium. Impact: more `boundary_reason` lines to write.
   - Mitigation: that is the point. A stated reason replaces a silent false. The CLI does not decide
     the boundary; it forces the answer to be recorded.

### LOW

3. **6d's message text drifts in the move.**
   - Mitigation: a test pins the HALT strings.

## 11. Rollback Plan

**Immediate (< 1 hour).**
- Triggers: the QA loop raises a false MEDIUM on every run, or 6d HALTs on a cited entry.
- Steps: revert the merge commit on `develop`. The engines are additive, and the prose returns to
  its current wording.
- Validation: `npm run ci` is green on the revert, and one `/qa-task` dry read shows the old step text.

**Partial.** Each phase stands alone. Revert Phase 4's prose for one rule and keep its engine; the
engine stays unused but tested.

**Forward fix.** For wording or threshold issues in a single engine, fix forward with a test.

## QA Testing Results

**QA Status**: FAIL
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-01
**Quality Score**: 40/100
**Gate Decision**: FAIL

### QA Report
- **Full Report**: [task.248.qa.2.qa-applies-finalise-rules.md](./task.248.qa.2.qa-applies-finalise-rules.md)
- **Gate File**: [task.248.gate.2.qa-applies-finalise-rules.yml](./task.248.gate.2.qa-applies-finalise-rules.yml)

### Test Coverage Summary
- **Tests Executed**: 6970
- **Phases Verified**: 4/4
- **Critical Issues**: 2
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: FAIL, Maintainability: CONCERNS

### Key Findings
The cycle-2 refute pass found two HIGH defects. T248-QA2-1: finalise 6d reads an unbound `STEM` and HALTs on every run. T248-QA2-2: `criteria-drift.js` can take a co-located bug's review report as its base. It also found two MEDIUMs: T248-QA2-3, a symlinked path reads as `new-document`, and T248-QA2-4, the read-back trusts the gate's own drift block. One LOW: T248-QA2-5. All three cycle-1 findings are fixed.

## Change Log

<!-- change-log-start -->
| Date       | Version | Description | Author      |
| ---------- | ------- | ----------- | ----------- |
| 2026-11-01 | 1.0     | Initial draft — cut from observations #23, #43, #139, #140 | create-task |
| 2026-11-01 | 1.1     | Review passed (8/10) — drift engine splits reworded/appended (owner decision); changelog-cites.sh gains exit 4 (unknown) and story/bug → 3; wiring test and drift fixtures named; integration criteria name their tests | review-task |
| 2026-11-01 |         | Status → ready-for-development | review-task |
| 2026-11-01 | 1.2     | Implemented all four phases; status → ready-for-review. Gate read-back checks went into `qa-read-back.js`, not per-skill blocks; 6d gains HALT `changelog-stem` | develop |
| 2026-11-01 |         | QA gate CONCERNS (80/100) — 3 findings (2 medium, 1 low) | qa-task |
| 2026-11-01 |         | QA findings fixed (T248-QA-1, -2, -3) — 1 iteration; each fix mutation-proved | qa-fix |
| 2026-11-01 |         | QA gate FAIL (40/100) — 5 findings (2 high, 2 medium, 1 low); status → in-progress | qa-task |
| 2026-11-01 |         | QA findings fixed (T248-QA2-1 to -5) — fix cycle 2, 1 iteration; each fix mutation-proved; status → ready-for-review | qa-fix |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Criteria boundary CLI
- [x] CLI entry and reasons
- [x] Tests

### Phase 2: criteria-drift engine
- [x] Continuation-aware reader
- [x] Engine and tests

### Phase 3: CHANGELOG citation script
- [x] Script and tests
- [x] 6d calls it

### Phase 4: Wiring
- [x] qa-task, qa-story
- [x] qa-fix, develop
- [x] DoD prompts
- [x] Bundle

---

## References

- Observation #23: QA classifies criteria like finalise but skips finalise's per-member quantifier rule
- Observation #43: Finalise-only checks halt runs on gaps no earlier step asks about (part a; part b is the measured-criteria card)
- Observation #139: An unapproved criterion amendment passed five QA gates and 5c; only the DoD caught it
- Observation #140: QA and the finalise DoD disagree on the security boundary classification
- Sibling: task.249 (/finalise grades every criterion kind). It is independent; the registry Notes give the order.
- Incident: `docs/tasks/task.234.probe-teardown-and-reap-hardening/task.234.dod.1.probe-teardown-and-reap-hardening.md`

---

## Implementation Summary

**Completion Date:** 2026-11-01

**Approach.** Each of the four rules got one runnable definition, and the QA skills, the DoD
prompts and `develop` run it rather than restating it.

- `criteria-section.js` (new) is the shared criteria reader. `finalise-rerun-scope.js`,
  `probe-boundary-signals.mjs` and `criteria-drift.js` all use it.
- `probe-boundary-signals.mjs --doc` is the criteria-boundary CLI.
- `criteria-drift.js` compares the criteria with the reviewed text. Its base is the review report's
  `reviewed_blob`, then the commit that added the report, then the merge-base.
- `changelog-cites.sh` is 6d's check, moved into a script.
- `qa-read-back.js` gained check 6: the gate answers the boundary signal and each appended
  criterion. It re-runs `criteria-drift.js` (`--target`, the PR base) and halts on a changed
  criterion the gate's block leaves out (QA cycle 2, T248-QA2-4).

**Deviations.**

- The gate read-back checks live in `qa-read-back.js`, which both skills already run from one
  block, rather than in a new fenced block per skill (obs #164 replaced exactly such paired blocks).
- The read-back does not require a `criteria_drift` block, so gates written before this task still
  read back.
- 6d gained one HALT, `changelog-stem`, for a stem `doc-id.js` cannot read. Its other messages are
  unchanged and pinned.

**Testing results.** `npm run ci` with `.agents/skills` moved aside: 6952 pass, 0 fail.
`bundle:check`: 0 problems. Each engine's deciding branch is mutation-proved, as recorded in the
implementation report. The first full run found two defects that per-file runs missed:

- the CLI's entry guard compared paths without resolving the `.agents/skills` symlink (obs #126);
- the read-back block test's install list lacked the three new siblings.

Both are fixed. The `[zsh]` cases skip on this laptop, which has no zsh, and run in CI.

**Deferred work.** None in scope. Story and bug citations in `changelog-cites.sh` remain the
documented 6d follow-on.

---

## Notes

### Important Reminders

- Cite, don't restate: each rule keeps one home. The QA skills point at it and run its engine.
- Edit `shared/resources/` sources, then run `npm run bundle`. A fix made only in `references/` is reverted by the next bundle.
- Run `CI=true node --test tests/ci-tool-skips.test.js` before pushing test changes, and pass any stand-in tool names as argv.
