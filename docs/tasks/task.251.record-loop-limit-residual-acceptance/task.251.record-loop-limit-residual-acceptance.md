---
id: task.251
title: "Record loop-limit residual acceptance"
type: task
description: "When the owner accepts the residual after a QA loop-limit escalation, one writer records that decision as a gate waiver and returns the run to Step 5c, so the conformance lens, /finalise, develop-next and develop-batch all read the same fact."
tags: [develop-task, develop-story, qa-loop, observation]
category: refactoring
status: accepted
completed_date: 2026-11-03
priority: Medium
risk_level: medium
created: 2026-11-03
updated: 2026-11-03
assignee:
estimated_effort_hours: 16
github_issue: 814
pr_number: 815
---

# Record loop-limit residual acceptance

**Status:** Accepted

**Review**: ✅ All review recommendations from `task.251.review.1.record-loop-limit-residual-acceptance.md` implemented 2026-11-03

**GitHub Issue**: [#814](https://github.com/Gamaroff/agent-skills/issues/814)

---

## 1. Overview

After a QA loop-limit escalation, the HALT message offers option 2: "Accept the current gate status: run Step 5c first, then /finalise". Nothing in the pipeline records that acceptance. Two later checks therefore refuse it by construction. The conformance lens refuses it because the last QA Cycle entry reads `Escalating — loop limit reached` (obs #115). `develop-next` Step 3 refuses it because the gate still lists the accepted findings as `open` (obs #150).

This task adds **one writer**, `accept-qa-residual.js`, the sibling of `grant-qa-cycles.sh`. When the owner picks "accept", it:

- rewrites the highest gate as `WAIVED`, naming the owner as approver;
- marks each accepted finding `status: waived`;
- moves the last QA Cycle entry onto the accepting route (`Proceeding to 5c`), with a `Loop exit` row that names the decision;
- re-enters the loop at 5c through the lock.

Every downstream reader already honours an active `WAIVED` gate, so most of them need no change. The task wires the writer into the HALT message, Phase 0b and the resume contract, and proves the downstream readers accept its output.

**Key deliverables**

1. `shared/resources/accept-qa-residual.js` and its test suite. One call, idempotent per artefact, `--json` `reason` contract.
2. Option 2 of both HALT messages and both Phase 0b prompts call the writer, and nothing else records acceptance.
3. Evidence that the lens, `/finalise`, `develop-next` Step 3 and `develop-batch` Step 3 accept a run the writer has processed. Each piece of evidence includes a control case.

**Expected outcome:** an accepted residual goes from HALT to merged with no hand edits. task.250 needed edits to its implementation report and then its gate (PR #813); after this task it would need none.

## 2. Motivation

**Current problems**

- **Option 2 cannot succeed.** On task.238 (PR #770) the owner chose option 2 twice. Both times the 5c review returned REQUEST CHANGES on the trail rule (`task.238.pr-review.2.*.md`, `task.238.pr-review.3.*.md`), and the run fell back to granting another cycle (obs #115).
- **The acceptance lives only in prose.** On task.250 the owner accepted CR5-1 and CR5-2 on 2026-11-03. The DoD, the implementation report and the sprint review say so, but the gate still read `CONCERNS` with both entries `open`. So `develop-next` Step 3 halted on signed-off work, and the gate had to be edited by hand before merging (commit `cd6420d0`, obs #150).
- **Each session improvises the workaround.** task.238 granted a cycle. task.250 appended `→ residual accepted by the user; Proceeding to 5c` to its Action row (`task.250.implementation.1.*.md`, QA Cycle 5), which is outside the row's fixed value set. Then it edited the gate. There are two improvisations and no shared mechanism.
- **The HALT offers a path no step implements.** A HALT option is a promise that the path works (obs #115, Principle).

**Benefits**

- One writer, one fact: the gate the readers already read. No reader learns a second source of truth.
- The fixed Action value set stays fixed. The accepted run is on the existing accepting route, and the `Loop exit` row names the reason.
- A waiver never masks a failure: the writer refuses a `FAIL` gate, as `pipeline-answers.js` `gateFor` does.
- Crash-safe and idempotent, like `grant-qa-cycles.sh`: re-running the writer after a Stop finishes the job and never doubles it.

## 3. Technical Background

Citations pair a line with an identifier. Every line was grepped on 2026-11-03 at `develop` `cdee24da` (the tip after the T250 registry commit).

### Current architecture

- **HALT option 2.** The develop-story text is at `shared/resources/develop-pipeline-step-5-6-qa-loop.md:2112` and the develop-task text at `:2136`, both reading *`2. Accept the current gate status: run Step 5c first (/review-pr --effort medium --comment`*. The note below them, *`Option 2 goes through 5c, not around it`*, explains why 5c must run first. Nothing records the acceptance.
- **Phase 0b after an escalation.** `skills/develop-task/SKILL.md:334` and `skills/develop-story/SKILL.md:347` (*`Re-entry after a QA loop escalation`*) offer "the halt message's own three options plus a fourth", the grant. Only the grant has a writer: `grant-qa-cycles.sh`, called at `skills/develop-task/SKILL.md:337`.
- **Resume contract.** `shared/resources/develop-pipeline-resume-contract.md:611` (*`### Re-entry after a QA loop escalation`*) specifies reconstruction, back-fill and the grant. It has no accept arm.
- **The Action row's value set is fixed.** `develop-pipeline-step-5-6-qa-loop.md:406`: *`The row's value set is exactly {Proceeding to 5c (PR conformance review), Running qa-fix …, Escalating — loop not converging, Escalating — loop limit reached}`*. A loop-limit escalation writes the last value on the last cycle (`:396`–`:397`).
- **The Loop exit row's value set.** `develop-pipeline-step-5-6-qa-loop.md:487`: *`**Loop exit**: {n/a — this exit not taken / the describeLoopRoute() message verbatim}`*.
- **A WAIVED gate already exits to 5c.** `develop-pipeline-step-5-6-qa-loop.md:409`: *`WAIVED with waiver.active: true and a documented reason/approver → proceed to 5c`*.
- **The rule this task makes an exception to.** `develop-pipeline-step-5-6-qa-loop.md:343`: *`dev-side steps never modify a gate file`*. Today the only waiver writer is the QA skill, under the `--skip` directive, checked by `pipeline-answers.js gate` (`:350`–`:356`).
- **A waiver never masks a failure.** `shared/resources/pipeline-answers.js:666` `gateFor` (the string is at `:684`): *`earned FAIL — a waiver never masks a failure`*. `gateFor` cannot be called for this writer's refusal: with no step skip it returns the earned token, not `WAIVED`, so the writer applies the same rule with its own `FAIL` check and cites `gateFor` in a comment.
- **The conformance lens, trail rule C.** `shared/resources/pr-conformance-prompt.md:67`: the highest gate's `### QA Cycle {N}` entry must carry `**Action**: Proceeding to 5c`. It falls back to the gate only with no report: *`an open entry (status absent or open) that no active waiver covers`* (`:75`).
- **develop-next Step 3.** `skills/develop-next/SKILL.md:297` (*`the WAIVED row reachable`*): an entry is open when its `status:` is absent or `open`. Under an active `WAIVED`, entries with **no** `status:` count as waived. An entry that still reads `status: open` counts as open even under `WAIVED`, so a writer must stamp `waived`. `develop-batch` repeats the clause at `skills/develop-batch/SKILL.md:475`.
- **/finalise.** `skills/finalise/SKILL.md:344`–`:349` (*`If gate status is WAIVED`*) checks the waiver is documented and writes `**Waiver**: {waiver.reason} — approved by {waiver.approved_by}` into the DoD.
- **Gate readers to reuse.** `shared/resources/qa-diminishing-returns.js:174` `readTopIssues`, `:493` `readGateToken`, `:527` `isOpen`. `readTopIssues` and `readGateToken` are exported (`module.exports`, `:877`). `isOpen` is **not** (`sed -n 877,895p … | grep isOpen` returns nothing), so Phase 1 exports it.
- **Writer pattern.** `shared/resources/grant-qa-cycles.sh`: it reconstructs the base from disk, restores the lock through `advance-pipeline-lock.sh --restore`, and writes its lock fields in one atomic `jq` write. Suite: `grant-qa-cycles.test.sh`. Run from `package.json:27` `test:suite`.
- **Lock-field parity.** `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs:97` (`grantScript`) and `:104` (`reenterScript`) enumerate the re-entry writers of `qa_phase`. `:300` loops over exactly those two.

### Target architecture

```
loop-limit HALT ──► Phase 0b: "Accept the residual"   (owner picks it)
                       │
                       ▼
        accept-qa-residual.js --doc-dir D --report R --approved-by "<git user.name>" --reason "…"
            1. gate.{N} (highest):  CONCERNS → WAIVED, waiver{active,reason,approved_by,approved_at},
                                    each open top_issue → status: waived, updated: <now>, head unchanged
            2. report, QA Cycle N:  Action → Proceeding to 5c (PR conformance review)
                                    Loop exit → residual accepted by <approver> on <date> (accept-qa-residual)
                                    + one Decisions Log row
            3. lock:                restore from snapshot (advance-pipeline-lock.sh --restore) and set
                                    qa_phase: 5c in one atomic write
                       │
                       ▼
        resume ──► 5c /review-pr  ──► Step 7 /finalise ──► develop-next Step 3 merges
```

There is still one escalation path and one route out of it per option. The accepted run leaves the loop on the existing `WAIVED → 5c` route (`:409`), so the lens, `/finalise` and the merge gates see what they already accept.

**Second mechanism check (obs #103).** The writer reconciles a gate with a human decision. The only existing gate writer is the QA skill, under `--skip`, verified by `pipeline-answers.js gate`. The new writer **sits beside** it: the QA skill records a waiver it was told to apply before review, and this writer records one the owner granted after review. Both produce the same `waiver:` shape. The writer applies `gateFor`'s rule (a `FAIL` is never waived) with a direct token check, because `gateFor` itself only waives for its `STEP_SKIPS` list; a mutation test holds the check.

## 4. Scope

**In scope**

- ✅ `shared/resources/accept-qa-residual.js` and `shared/resources/tests/accept-qa-residual.test.mjs`.
- ✅ HALT option 2 text (story and task) and the "Option 2 goes through 5c" note.
- ✅ Phase 0b's escalation prompt in `skills/develop-task/SKILL.md` and `skills/develop-story/SKILL.md`.
- ✅ The resume contract's escalation section: an accept arm beside the grant.
- ✅ The `:343` exception, stated once, and the `:487` `Loop exit` value set.
- ✅ The lock-field parity test: a third re-entry writer.
- ✅ One step-isolation eval per pipeline: loop limit → accept → 5c.
- ✅ `npm run bundle`, catalog, CHANGELOG, and a doc sweep of consumer docs that restate option 2.

**Out of scope**

- ❌ Changing what option 1, 3 or 4 does.
- ❌ The not-converging HALT. Its text says the findings "are NOT accepted" (`:1956`), so accepting there is a separate decision. The writer refuses a not-converging escalation (see Phase 1).
- ❌ Rewriting historical gates and reports, task.238 and task.250 included. Adoption is going-forward only.
- ❌ Changing trail rule C's wording, unless Phase 3's evidence shows the lens refuses the writer's output.
- ❌ Bitbucket-specific merge paths: develop-next's gate rule is host-neutral.

## 5. Breaking Changes

None to an API. One behaviour changes. Option 2 of the loop-limit HALT stops meaning "run `/review-pr` then `/finalise` by hand" and becomes "pick Accept in Phase 0b". A consumer who follows the old text by hand still reaches 5c, and still gets the trail finding it gets today. The new HALT text names the new path, so nobody follows the old one without seeing it.

## 6. Implementation Plan

> Detailed implementation guide: [task.251.plan.record-loop-limit-residual-acceptance.md](task.251.plan.record-loop-limit-residual-acceptance.md)

### Phase 1: The writer (Risk: Medium)

Files: `shared/resources/accept-qa-residual.js`, `shared/resources/tests/accept-qa-residual.test.mjs`, `shared/resources/qa-diminishing-returns.js` (export `isOpen`).

- [x] CLI: `--doc-dir`, `--report`, `--approved-by` (required, non-empty), `--reason` (required, non-empty), `--json`, and `--now` (test clock only). Exit codes: 0 for `accepted` and `already`, 1 for a guard, 2 for usage.
- [x] Find the highest `*.gate.{N}.*.yml` in `--doc-dir`. With none: `no-gate`, exit 1.
- [x] Refuse a `FAIL` gate (`fail-gate`), applying `gateFor`'s rule with a direct token check. Refuse a gate whose verdict `readGateToken` cannot read (`unreadable-gate`): a verdict nobody can read is never waived. Refuse a gate with no open entry that is not already `WAIVED` (`nothing-to-accept`). Such a gate already exits the loop.
- [x] Refuse when the report has no `### QA Cycle {N}` entry for the highest gate (`no-report-entry`). Phase 0b's back-fill (resume contract, escalation section, step 2) runs before the prompt, so this state means the back-fill did not run.
- [x] Refuse unless the report's QA Cycle `{N}` entry reads `**Action**: Escalating — loop limit reached` (`no-loop-limit`). This covers a not-converging escalation and a run that never escalated. Two exceptions: on a re-run the entry already reads `Proceeding to 5c` and its `Loop exit` already names an acceptance (`already`, see below); and a back-filled entry (`**Origin**: run outside the loop (operator)`) on the highest gate is accepted when an earlier entry reads `Escalating — loop limit reached` and none after it reads `Escalating — loop not converging` (state 3 below).
- [x] Gate write: set `gate: WAIVED`, set the waiver block (`active: true`, `reason`, `approved_by`, `approved_at`), stamp every open entry `status: waived`, and set `updated:` from the clock. Leave `head:`, every other entry and every other key byte-identical. Write to a temp file, then rename.
- [x] Report write: on QA Cycle `{N}`, set `**Action**: Proceeding to 5c (PR conformance review)` and `**Loop exit**: residual accepted by {approved_by} on {date} (accept-qa-residual)`. Append one Decisions Log row. Leave the escalation section and the `**PR Review**` row untouched.
- [x] Idempotence per artefact. A gate already `WAIVED` with an active waiver and no open entry is left alone, and so is a report entry already rewritten. The run reports `already` when both were done, and `accepted` otherwise. So a re-run after a Stop between the two writes finishes the job.
- [x] Order: gate first, then report. A Stop between them leaves a state the re-run finishes.

**States the writer must hold in** (the reconstruction states of the resume contract's escalation section; each is a unit or `.test.sh` case):

1. **Fresh re-invocation, no lock.** The HALT removed the lock; the writer restores it from the halt snapshot (Phase 2), then writes `qa_phase: 5c`.
2. **In-place continuation, lock present.** The writer leaves the restore alone and writes `qa_phase: 5c` only.
3. **The operator ran a cycle by hand after the HALT.** The highest gate is `N+1` and its entry is a back-filled `**Origin**: run outside the loop (operator)` entry whose Action comes from the gate's queue. The writer accepts the highest gate under the exception above; it never rewrites gate `N`.
4. **The report is behind the gates** (a gate with no entry): `no-report-entry`, nothing written.
5. **A Stop between the gate write and the report write**: the re-run skips the gate and finishes the report (`accepted`).
6. **Step 5c returns REQUEST CHANGES after an acceptance.** The budget is spent, so the existing **Loop limit** trigger (`develop-pipeline-step-5-6-qa-loop.md:1921`) re-escalates at 5c of cycle `N`, rewriting its Action to `Escalating — loop limit reached`. A second acceptance is a new owner decision: the gate is already `WAIVED` and is left alone, the report arm runs again and appends a second Decisions Log row, and the run reports `accepted`. The 5c findings live in the `pr-review` report, so the owner's `--reason` should name it.
7. **A snapshot for another document**: the restore refuses, and the writer relays the refusal and writes no lock.

### Phase 2: Lock re-entry (Risk: Medium)

Files: `shared/resources/accept-qa-residual.js` (or a thin `accept-qa-residual.sh` beside `grant-qa-cycles.sh`, the plan decides), `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`.

- [x] With no lock, restore it through `advance-pipeline-lock.sh --restore {doc-dir}`, the one restore path. Relay its refusal verbatim (`legacy-snapshot`, another document's snapshot, no candidate).
- [x] Write `qa_phase: 5c` in one atomic write. Never touch `current_step`, `qa_max_cycles` or `extra_cycles_granted`.
- [x] Add the writer to the parity test's re-entry writers (`:97`, `:104`, `:300`), so a fourth writer that skips `qa_phase` is caught.

### Phase 3: Wire the option and prove the readers (Risk: Medium)

Files: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`, `shared/resources/develop-pipeline-resume-contract.md`, `skills/develop-task/SKILL.md`, `skills/develop-story/SKILL.md`, the eval scenarios below.

- [x] HALT option 2, both variants: "Accept the residual: re-run /develop-{task|story} and pick **Accept the residual** in Phase 0b; it records the waiver and resumes at 5c". Rewrite the "Option 2 goes through 5c" note to match.
- [x] Phase 0b, both skills: the accept option calls the writer with `--approved-by "$(git config user.name)"` and the owner's reason (default: "residual accepted at the loop-limit escalation"). It reads `reason`, and resumes at 5c only on `accepted` or `already`.
- [x] Resume contract, escalation section: an accept arm beside the grant, with one call and the same "record the decision in one place" rationale.
- [x] `:343`: state the exception once. An owner's decision recorded by `accept-qa-residual` is not a dev-side verdict; it is the waiver the gate schema already defines.
- [x] `:487`: add the acceptance value to the `Loop exit` set.
- [x] New step-isolation eval in `evals/develop-task/step-isolation/` and `evals/develop-story/step-isolation/`: loop limit → accept → the run re-enters at 5c. Model it on `12-qa-reentry-after-loop-limit-with-grant`.
- [ ] Reader evidence (each with a control, Testing Strategy): develop-next's Step 3 rule and develop-batch's clause read the written gate as mergeable. The lens trail rule reads the written report as `Proceeding to 5c`. `/finalise` writes the `**Waiver**` line.

### Phase 4: Bundle, sweep, release notes (Risk: Low)

- [x] `npm run bundle`, then `npm run bundle:check`. The writer must reach develop-task, develop-story and any skill whose prose names it.
- [x] Confirm the new suite runs under `npm test`. `package.json` already globs `'shared/resources/tests/*.test.mjs'`, so a suite at that path needs no registration. A `.test.sh` beside `grant-qa-cycles.test.sh` would need adding to `test:suite` (`package.json:27`).
- [x] Doc sweep: `git grep -n "Accept the current gate status"` and `git grep -n "option 2"` across `docs/`, `shared/resources/`, `skills/`. Every restatement of option 2 is updated or cites the HALT message.
- [x] `npm run generate-catalog` if a skill description changed. Add a CHANGELOG entry.

## 7. Files Summary

**Core implementation**

1. ✅ `shared/resources/accept-qa-residual.js`: new, the writer.
2. ✅ `shared/resources/qa-diminishing-returns.js`: export `isOpen`, which is not exported today.

**Pipeline prose**

3. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md`: HALT option 2 (`:2112`, `:2136`), its note, `:343`, `:487`.
4. ✅ `shared/resources/develop-pipeline-resume-contract.md`: accept arm in the escalation section (`:611`).
5. ✅ `skills/develop-task/SKILL.md`: Phase 0b (`:334`).
6. ✅ `skills/develop-story/SKILL.md`: Phase 0b (`:347`).

**Tests and evals**

7. ✅ `shared/resources/tests/accept-qa-residual.test.mjs`: new.
8. ✅ `evals/shared/tests/qa-loop-lock-fields-parity.test.mjs`: the third re-entry writer.
8a. ✅ `shared/resources/accept-qa-residual.sh` and `shared/resources/accept-qa-residual.test.sh`: the lock wrapper (plan, Phase 2) and its suite.
8b. ✅ `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs`: the develop-next / develop-batch reader evidence.
9. ✅ `evals/develop-task/step-isolation/{N}-qa-accept-residual-after-loop-limit/`: new scenario and replay fixture. `{N}` is the next free number, measured by `ls evals/develop-task/step-isolation/` at implementation time (`13` is already taken).
10. ✅ `evals/develop-story/step-isolation/{N}-qa-accept-residual-after-loop-limit/`: the same, numbered from its own directory.

**Generated and docs**

11. ✅ `skills/{develop-task,develop-story,…}/references/`: generated by `npm run bundle`.
12. ✅ `package.json`: `test:suite` (`:27`) gains `accept-qa-residual.test.sh`. The `.mjs` suites are already globbed.
13. ✅ `CHANGELOG.md`.

The plan names any other file the doc sweep finds, with the `git grep` that found it.

## 8. Testing Strategy

**Unit (`accept-qa-residual.test.mjs`)**, against fixture gates and reports in a temp root under `os.tmpdir()`, never in the repository (task.250):

- **Happy path, modelled on task.250.** A `CONCERNS` gate with two open entries and a report whose last cycle reads `Escalating — loop limit reached` becomes `WAIVED`, with both entries `waived`, a waiver naming the approver, and `head:` unchanged. Then `readTopIssues` + `isOpen` count zero open entries.
- **Control (obs #176).** A gate unlike task.250 in every dimension the rule reads: one `high` entry already `status: resolved` beside one with no `status:` at all, and an inline `{ id: …, status: open }` flow-style entry. Only the open ones are stamped; the resolved one is byte-identical.
- **Refusals, each byte-identical afterwards:** a `FAIL` gate; a gate with an unreadable verdict; a report whose last Action reads `Escalating — loop not converging`; one whose last Action reads `Running qa-fix`; a report with no entry for the highest gate; no gate on disk; an empty `--approved-by`.
- **Idempotence:** a second run returns `already` and changes nothing. A run after a simulated Stop between the gate write and the report write returns `accepted` and finishes the report.
- **Reconstruction states** (Phase 1, "States the writer must hold in"): state 3, a back-filled operator entry on the highest gate after an escalated one, is accepted, and gate `N` is byte-identical; state 6, a re-escalated entry on an already-`WAIVED` gate, rewrites the report only and adds a second Decisions Log row.
- **Mutation proof:** remove the `FAIL` refusal, the `status: waived` stamp and the report rewrite in turn. Each mutation must turn a named test red.

**Lock:** extend the parity test, and test the restore and `qa_phase: 5c` write in `shared/resources/accept-qa-residual.test.sh`, the way `grant-qa-cycles.test.sh` does (states 1, 2 and 7). Add the suite to `package.json` `test:suite`.

**Readers, behavioural, with a control each:**

- **develop-next and develop-batch.** `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs` (reached by the `evals/develop-next/unit/*.test.mjs` glob) applies their open-entry rule to the written gate: zero open, so the table row is "merge". Control: the same gate with one entry left `status: open` under `WAIVED` reads as "HALT". That is the task.250 state before the hand edit. The rule is prose, so the test encodes it once and cites `skills/develop-next/SKILL.md:297`.
- **The conformance lens.** Run the replay eval, plus one `/review-pr` dry run on a fixture report the writer processed. Control: the same report left at `Escalating — loop limit reached` must still draw the trail finding (task.238's failure).
- **/finalise.** The DoD for a fixture that the writer processed carries the `**Waiver**` line.

**Commands:** `npm run ci:fast` per iteration, `npm run ci` before merge, and `npm run validate -- skills/develop-task/ skills/develop-story/`.

## 9. Success Criteria

**Functional**

- [ ] On a fixture modelled on task.250 (a `CONCERNS` gate with two open entries, last Action `Escalating — loop limit reached`), the writer exits 0 with `reason: accepted`. Afterwards: the gate reads `WAIVED`, `waiver.active: true` with a non-empty `approved_by`, both entries `status: waived`, `head:` unchanged; QA Cycle `{N}` reads `**Action**: Proceeding to 5c (PR conformance review)`. Recorded in the QA report.
- [ ] The writer refuses with exit 1, writing nothing (checked byte-identical), for: a `FAIL` gate (`fail-gate`), an unreadable verdict (`unreadable-gate`), a not-converging escalation and a non-escalated run (`no-loop-limit`), a report with no entry for the highest gate (`no-report-entry`), and no gate (`no-gate`). An empty `--approved-by` exits 2. Held by `accept-qa-residual.test.mjs`.
- [ ] A second run returns `already` and changes no byte. A run resumed after a Stop between the two writes completes the report (Phase 1, idempotence). Held by `accept-qa-residual.test.mjs`.
- [ ] The writer holds in reconstruction states 3 and 6 (Phase 1): a back-filled operator entry is accepted with gate `N` untouched, and a re-escalation after an acceptance rewrites the report only. Held by `accept-qa-residual.test.mjs`.
- [ ] After acceptance, the lock reads `qa_phase: 5c` and its other fields are unchanged. With no lock, it is restored from the snapshot; a snapshot for another document is refused (Phase 2). Held by `accept-qa-residual.test.sh`.
- [ ] Both HALT messages' option 2 and both Phase 0b prompts name the accept path, and `git grep -n "Accept the current gate status"` returns no hit outside `docs/tasks/` and generated `references/`.
- [ ] develop-next's and develop-batch's Step 3 open-entry rule reads the written gate as mergeable. The control (one entry left `open` under `WAIVED`) reads as HALT. Held by `evals/develop-next/unit/accept-qa-residual-merge-rule.test.mjs`; the result is recorded in the QA report.
- [ ] The lens does not raise the trail finding on a report the writer processed. The control (the same report unprocessed) still raises it. Recorded in the QA report.

**Performance**

- [ ] The writer finishes in under 1 s on the task.250 gate and report (`uptime; time …`, measured once on the PR's head commit, recorded in the QA report with the load line).
- [ ] `npm run ci` wall time does not rise by more than 5% over the `develop` baseline (two runs each, with `uptime` beside each `time`, on the PR's head commit; recorded in the QA report).

**Code quality**

- [ ] Each of the three Phase 1 mutations (remove the `FAIL` refusal, the `waived` stamp, the report rewrite) turns a named test red. Recorded in the QA report.
- [ ] The new suite runs under `npm test`: its test count appears in the run output.
- [ ] `npm run ci` passes, including `prettier --check`, `bundle:check`, `lint:shell` and `eval:all`.
- [ ] `npm run validate -- skills/develop-task/ skills/develop-story/` passes.

**Migration**

- [ ] CHANGELOG entry names the new option 2 path.
- [ ] Every doc that restated option 2 (doc sweep, Phase 4) is updated or cites the HALT message. The `git grep` commands and their hits are recorded in the QA report.

## 10. Risk Assessment

**HIGH**

1. **A waiver masks a real failure.**
   - Probability: Low. Impact: Critical.
   - Mitigation: refuse `FAIL` using `gateFor`'s rule; a mutation test proves it.
   - Rollback: revert the writer; option 2 returns to today's text.

**MEDIUM**

2. **The lens still refuses.** Trail rule C may have another clause that a processed report trips.
   - Probability: Medium. Impact: High, since option 2 would still fail.
   - Mitigation: Phase 3's lens evidence and its control. If the lens refuses, amend rule C in this task, citing the writer, and record the amendment as a scope change.
3. **A gate rewrite corrupts YAML that a reader parses differently.**
   - Probability: Medium. Impact: Medium.
   - Mitigation: line-preserving edits, readers reused from `qa-diminishing-returns.js`, and a flow-style entry in the control fixture (obs #134: a classifier and a writer read input differently).
4. **The exception to "dev-side steps never modify a gate" spreads.**
   - Probability: Low. Impact: Medium.
   - Mitigation: state it once at `:343`, naming the one writer and the owner's decision it records.

**LOW**

5. **Doc drift.** Consumer docs restate option 2.
   - Mitigation: the Phase 4 sweep, with its greps recorded.

## 11. Rollback Plan

**Immediate (< 1 hour)**
- Triggers: a `WAIVED` gate on a run that had a `FAIL`; a lens or merge gate refusing a processed run; `npm run ci` red on `develop` after the merge.
- Steps: `git revert` the merge commit; `npm run bundle`; push.
- Validation: `git grep -n "accept-qa-residual"` returns no hit outside `docs/tasks/`, and `npm run ci` passes.

**Partial (1–2 hours)**
- When the writer is sound but the Phase 0b wiring misfires: revert Phase 3's prose only and keep the writer as a manual tool named in the HALT message.

**Forward fix**
- Lens wording or a doc-sweep miss: fix forward in a follow-up commit.

**Rollback triggers**
- Critical: any masked `FAIL`; a corrupted gate.
- Non-critical: wording, or a missed doc restatement.

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-03
**Quality Score**: 92/100
**Gate Decision**: WAIVED (QA wrote CONCERNS; the owner then accepted the loop-limit residual, so gate 5 reads WAIVED with bug 7 as the accepted residual)

### QA Report
- **Full Report**: [task.251.qa.5.record-loop-limit-residual-acceptance.md](./task.251.qa.5.record-loop-limit-residual-acceptance.md)
- **Gate File**: [task.251.gate.5.record-loop-limit-residual-acceptance.yml](./task.251.gate.5.record-loop-limit-residual-acceptance.yml)

### Test Coverage Summary
- **Tests Executed**: 7147 (`ci:fast`), 35 new
- **Phases Verified**: 4/4
- **Critical Issues**: 0
- **NFR Status**: Security: CONCERNS, Performance: PASS, Reliability: CONCERNS, Maintainability: PASS

### Key Findings
Cycle 4 fixes hold. One low residual: an empty status value in a flow entry is edited to `status:waived` (T251-CR5-1), a shape the pipeline never writes. The loop budget was spent; the owner accepted the residual (bug 7), recorded by `accept-qa-residual` on 2026-11-03, and the run left the loop on the WAIVED route to Step 5c.
## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**QA Report**: `task.251.qa.5.record-loop-limit-residual-acceptance.md`
**Gate File**: `task.251.gate.5.record-loop-limit-residual-acceptance.yml`
**Gate Status**: WAIVED (92/100). **Waiver**: loop limit reached after 5 gates; residual T251-CR5-1 (low) accepted by the owner — approved by Lorien Gamaroff.

✅ **Acceptance Criteria:** 16 of 16 met. The four carried as unverified (lens trail rule, writer timing, `npm run ci` wall time, doc-sweep record) are now evidenced in the QA 5 addendum.
✅ **Tests:** the new suite runs under `npm test`; PR #815 CI is green on 6 of 6 checks.
✅ **Documentation:** CHANGELOG entry and the skill and pipeline docs updated.
✅ **Security Review:** boundary held, 9 probes, 0 reproduced.
✅ **Compliance Review:** not applicable.

**Detailed Verification Log:** see `task.251.dod.2.record-loop-limit-residual-acceptance.md` (run 1, `task.251.dod.1…`, ended in gaps and is kept as history).

**Task marked as ACCEPTED on:** 2026-11-03

<!-- change-log-start -->
## Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2026-11-03 | 1.0     | Initial draft — cut from observations #115, #150 | create-task |
| 2026-11-03 | 1.1     | Review passed (8/10) — added the writer's reconstruction states, `unreadable-gate` and `no-report-entry` refusals, named the test holding each behaviour criterion, aligned the `gateFor` wording with the plan | review-task |
| 2026-11-03 |         | Status → ready-for-development | review-task |
| 2026-11-03 |         | Implemented — 45 new files (most of them two replay eval fixtures, plus 4 bundled copies), 29 modified; 29 new tests (16 engine, 10 lock, 3 merge rule) and 2 replay evals | develop |
| 2026-11-03 |         | Status → ready-for-review | develop |
| 2026-11-03 |         | QA gate CONCERNS (90/100) — 3 medium findings | qa-task |
| 2026-11-03 |         | QA findings fixed — 3 medium, 1 iteration | qa-fix |
| 2026-11-03 |         | QA gate CONCERNS (92/100) — 1 medium finding | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 medium, 2 iterations | qa-fix |
| 2026-11-03 |         | QA gate CONCERNS (92/100) — 1 medium finding | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 medium, 3 iterations | qa-fix |
| 2026-11-03 |         | QA gate CONCERNS (92/100) — 1 medium, 1 low finding | qa-task |
| 2026-11-03 |         | QA findings fixed — 1 medium, 1 low, 4 iterations | qa-fix |
| 2026-11-03 |         | QA gate WAIVED (92/100) — 1 low finding; QA wrote CONCERNS, owner accepted the loop-limit residual | qa-task |
| 2026-11-03 |         | Loop-limit residual accepted by the owner — bug 7 waived, run resumes at 5c | accept-qa-residual |
| 2026-11-03 | 1.2 | DoD passed — accepted (PR #815) | finalise |
<!-- change-log-end -->

## Progress Tracking

- [x] Phase 1: The writer
- [x] Phase 2: Lock re-entry
- [x] Phase 3: Wire the option and prove the readers (the lens and `/finalise` reader evidence is QA's: Testing Strategy)
- [x] Phase 4: Bundle, sweep, release notes

## References

- Observation #115 — Loop-limit HALT option 2 (accept via 5c then finalise) is refused by the conformance lens by construction
- Observation #150 — Accepted loop-limit residual is never written to the gate, so develop-next Step 3 halts on signed-off work
- task.238 (PR #770): option 2 refused twice by the lens.
- task.250 (PR #813): the acceptance was hand-recorded in the report, and then in the gate (commit `cd6420d0`).

## Notes

- QA report: `task.251.qa.{N}.record-loop-limit-residual-acceptance.md`
- Bug reports: `task.251.bug.{N}.{name}.md`
- Quality gate: `task.251.gate.{N}.record-loop-limit-residual-acceptance.yml`, co-located here.
