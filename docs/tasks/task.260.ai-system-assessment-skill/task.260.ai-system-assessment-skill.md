---
id: task.260
title: "ai-system-assessment skill"
type: task
description: "Build a read-only skill that assesses a system, repo or project against eight AI-system best practices and produces an evidence-cited report plus a prioritised roadmap."
tags: [skill, assessment, ai-systems, guardrails, evals, observability]
category: other
status: ready-for-review
priority: High
created: 2026-11-04
updated: 2026-11-04
estimated_effort_hours: 8
github_issue: 834
---

# Technical Task: ai-system-assessment skill

**Status:** Ready for Review

**GitHub Issue**: [#834](https://github.com/Gamaroff/agent-skills/issues/834)

---

## 1. Overview

Add a new skill, `skills/ai-system-assessment/`, that evaluates a system, repository or project against eight practices for building AI systems. The practices come from a video on how production AI assistants mature. A team wraps a model, then adds a system prompt, retrieval, tools, access control, guardrails, cost control, observability and evals, each in response to a failure. The video closes on the lesson that an unevaluated prompt edit undoes all of it.

The skill reads the target, rates each practice from evidence, and writes a report with a prioritised roadmap. It never edits the target.

**Scope**: the skill directory (`SKILL.md`, per-principle checklists, rating rubric, report and roadmap templates), a fixture target with seeded gaps, tests, bundling, catalog and the two hand-maintained reference pages.

**Key deliverables**:

1. `skills/ai-system-assessment/SKILL.md` with a read-only assessment workflow.
2. Eight principle checklists and one rating rubric under `references/`.
3. Report and roadmap templates under `assets/`, and tests proving the skill rates a seeded fixture correctly.

**Expected outcome**: `/ai-system-assessment` on any repo yields a report whose every rating cites `path:line` or a command, and a roadmap ordered by value per effort.

---

## 2. Motivation

### Current Problems

1. **No repeatable way to check an AI system against known practice.** An assessment of this repository was done by hand in one session (see the co-located plan). It cannot be rerun on another repo or on this one next quarter, and its findings are not comparable over time.
2. **The riskiest gaps are the least visible.** The hand assessment found that this repository has no rule treating tracker text, PR comments or fetched pages as untrusted data, no model-routing or caching guidance, and no behavioural eval that gates a prompt edit. None of these fails a test today, so nothing surfaces them.
3. **Existing audit skills do not cover this lens.** `tech-debt-audit` is a code-health audit and `review-security` tests whether one security control engages. Neither asks whether a system has grounding, access control, observability and evals.
4. **A one-off assessment decays.** Ratings stated from memory drift. Without a skill that carries the evidence method, the next assessment starts from nothing.

### Benefits of the Skill

1. **Repeatable**: the same eight checklists and rubric on any target.
2. **Evidence-backed**: a rating without a cited `path:line` or command is reported as `Unverified`, never as a guessed Gap.
3. **Target-aware**: applicability is judged per target type, so a prompt library is not marked down for lacking a vector database.
4. **Actionable**: the roadmap orders gaps by value per effort and names the artefact that would close each.
5. **Comparable over time**: a stable report shape lets two runs be diffed.

---

## 3. Technical Background

### Current Architecture

Skills live in `skills/<name>/` with a required `SKILL.md` (frontmatter `name`, `description`), and optional `scripts/`, `references/`, `assets/` (`CLAUDE.md` § Skill Structure).

Verified current-state facts the new skill must satisfy:

- **Closest sibling**: `skills/tech-debt-audit/SKILL.md` is user-invoked (`disable-model-invocation: true`, `skills/tech-debt-audit/SKILL.md:4`) and writes a cited findings file. It is the structural model; it audits code health, so there is no overlap in purpose.
- **Adjacent skill**: `skills/review-security/SKILL.md` covers whether one security control engages under adversarial input. This skill rates the whole security posture at coarse grain and points to `review-security` for depth on principle 5.
- **Skill scaffolding scripts**: `skills/create-skill/scripts/` holds `init_skill.py`, `package_skill.py`, `bundle_skill.py`, `generate_catalog.py` and `quick_validate.py`.
- **Test globs are hand-listed.** `package.json:27` (`test:suite`) names each `skills/<skill>/tests/*.test.js` glob by hand. A new skill's tests run nowhere until its glob is added (project memory: npm test globs orphan new skill suites).
- **A new skill must be findable.** `tests/skill-doc-coverage.test.js` requires every skill to be named in both `docs/reference/commands.md` and `docs/reference/activation-phrases.md`, or to sit an adoption list. New skills cannot join the lists without a written reason, so the skill must be documented in both pages.
- **Catalog is generated**: `docs/reference/skill-catalog.md` via `npm run generate-catalog`.
- **Structural guards that will apply**: `tests/skill-frontmatter.test.js`, `tests/skill-protocol.test.js`, `evals/shared/tests/bundled-parity.test.mjs`.
- **Mutation proving** is the repository's rule for fixes: `shared/resources/mutation-proving.md`.

### Target Architecture

```
skills/ai-system-assessment/
├── SKILL.md                      # workflow, read-only rule, output contract
├── references/
│   ├── rubric.md                 # Strong / Partial / Gap / Not applicable / Unverified, with the evidence bar for each
│   ├── target-types.md           # prompt library | deployed assistant | agent framework | product feature; which principles apply
│   ├── p1-prompt-and-change-control.md
│   ├── p2-grounding.md
│   ├── p3-tools.md
│   ├── p4-access-control.md
│   ├── p5-guardrails.md
│   ├── p6-cost-and-routing.md
│   ├── p7-observability.md
│   └── p8-evals-before-change.md
├── assets/
│   ├── report.template.md        # per-principle status, evidence, gaps
│   └── roadmap.template.md       # gaps ordered by value per effort
└── tests/                        # fixture target + rating tests
```

Each principle checklist holds: what the practice protects against (the video's failure), evidence signals to look for with the grep or command that finds them, rating thresholds, the common false positive, and the artefact that closes a gap.

**The eight principles** (from the video, with its failure scene):

| # | Practice | Failure it prevents |
|---|---|---|
| 1 | System prompt: identity, scope, change control | The assistant recommends a competitor |
| 2 | Grounding (retrieval over owned documents) | A confident wrong answer ($500 refund limit vs $50) |
| 3 | Tools and MCP, with idempotent calls | A chatbot that cannot act, or acts twice |
| 4 | Access control: user identity passed into each tool call | A new hire reads a manager's pay |
| 5 | Guardrails: injection detection, input filters, PII masking | A hidden line in an email triggers refunds |
| 6 | Cost control: caching and model routing | A Monday-morning token bill |
| 7 | Observability: traces, logs, prompt and tool records | A wrong answer nobody can explain |
| 8 | Evals before every change | A Friday prompt edit undoes everything |

### Important Clarifications

- **The target is often a prompt library, not a deployed assistant.** This repository is one. Principle 2 (grounding) then means how the prompts get ground-truth context, and principle 4 means what the agent is permitted to do, not end-user identity. `target-types.md` must state the mapping per type; without it the skill marks a library down for things it cannot have.
- **Absence of evidence is not a Gap.** A grep that finds nothing may mean the control does not exist or that it lives under a name the checklist did not anticipate. The rubric therefore separates `Gap` (a search was run, covered the plausible locations, and found nothing; the report lists the searches) from `Unverified` (no search was possible or the target was too large to cover).
- **Read-only.** The skill must not edit, install, run the target's code or call its network services. Every check is a read or a grep. Running the target's test suite is out of scope and is offered to the user, not done. The one write the skill makes is its own report file. It goes to a user-named path, defaulting to `AI_SYSTEM_ASSESSMENT.md` in the working directory, and never inside the assessed target when the target is another repository. No other write is permitted.
- **Ratings are made by the model; signals are checked by tests.** No script applies the rubric, because the collector is out of scope. What a test can hold is the signal layer: each checklist declares its signals as a table with an extended-regex `Pattern` column and a `Paths` glob column, and the fixture test extracts those rows and runs them over the fixture tree. It asserts which signals hit and which do not, per principle. The rubric-to-rating step is held by the checklist's `Thresholds` text and the Consumer Test, not by a test.
- **The plan file holds the worked example.** The hand assessment of this repository is copied into the plan as the expected-output fixture. This task does not reference where it was first drafted.

---

## 4. Scope

### In Scope

✅ **Skill content**: `SKILL.md`, eight principle checklists, rubric, target-type mapping, report and roadmap templates.
✅ **Workflow**: target discovery, applicability decision, evidence gathering per principle, rating, roadmap, report.
✅ **Fixture and tests**: a small fixture repository with known seeded gaps and controls, and tests asserting the skill's rating rules against it.
✅ **Integration**: bundling, catalog regeneration, `package.json` test glob, the two reference pages. (The registry row already exists.)

### Out of Scope

❌ **Fixing the gaps it finds.** The skill reports and recommends. Closing this repository's own gaps (untrusted-content rule, CODEOWNERS, behavioural evals) are separate tasks cut from the roadmap.
❌ **Running the target's code, tests or services.** Read-only is the safety property.
❌ **A scripted evidence collector.** If the checklists prove too slow by hand, a collector becomes a follow-up task (splitting test, `create-task` § 1.2: the skill is shippable and valuable without it).
❌ **Live model evals of the skill's judgement.** Deterministic fixture tests only; a live pass-rate eval is a later task.
❌ **Scoring or certifying compliance.** Ratings are advisory, not a certification.

---

## 5. Breaking Changes

None. This adds a new skill. Existing skills, scripts and documents are unchanged apart from additive lines in the catalog, the two reference pages and the `test:suite` glob list.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.260.plan.ai-system-assessment-skill.md](task.260.plan.ai-system-assessment-skill.md)

### Phase 1: Rubric and target types

**Risk Level**: Low

**Files**:
- `skills/ai-system-assessment/references/rubric.md`
- `skills/ai-system-assessment/references/target-types.md`

**Changes**:
- [x] Define the five ratings and the evidence bar for each, including the `Gap` vs `Unverified` rule.
- [x] Define the four target types and, per type, which principles apply and what each means.
- [x] State the search-coverage rule: a `Gap` lists the locations searched.

**Dependencies**: none.

---

### Phase 2: Eight principle checklists

**Risk Level**: Medium

**Files**:
- `skills/ai-system-assessment/references/p1-prompt-and-change-control.md` through `p8-evals-before-change.md`

**Changes**:
- [x] For each principle: the failure it prevents, evidence signals with the grep or command, rating thresholds, common false positive, and closing artefact.
- [x] Declare each principle's evidence signals as a table with columns `Signal`, `Pattern` (extended regex) and `Paths` (glob), so the Phase 4 test can run them. A signal that needs a non-grep command (`ls CODEOWNERS`) is a `Command` row the test skips and the checklist's thresholds still use.
- [x] Principle 5 points to `review-security` for execution-level depth and states that it does not duplicate it.
- [x] Principle 8 distinguishes hermetic checks from behavioural evals and states that replayed fixtures do not detect a behaviour regression from a prompt edit.

**Dependencies**: Phase 1.

---

### Phase 3: SKILL.md workflow and templates

**Risk Level**: Medium

**Files**:
- `skills/ai-system-assessment/SKILL.md`
- `skills/ai-system-assessment/assets/report.template.md`
- `skills/ai-system-assessment/assets/roadmap.template.md`

**Changes**:
- [x] Frontmatter with a trigger-rich `description` and `disable-model-invocation: true` (user-invoked, like `tech-debt-audit`), after confirming the choice in review.
- [x] Workflow: discover the target, decide target type, load only the checklists that apply, gather evidence, rate, build the roadmap, write the report.
- [x] State the read-only rule and the "no evidence is not a Gap" rule in the body.
- [x] Roadmap ordering rule: value per effort, with the closing artefact named per item.
- [x] Output location: one report file at a user-named path, default `AI_SYSTEM_ASSESSMENT.md` in the working directory; never inside `skills/`, and never inside an assessed target that is another repository.
- [x] Frontmatter `allowed-tools`, if the repository's frontmatter schema accepts it (check `skills/create-skill/scripts/skill_frontmatter.py`), lists read tools plus the one report write; if it does not, say so in the Decisions Log and rely on the body's read-only rule.

**Dependencies**: Phases 1 and 2.

---

### Phase 4: Fixture and tests

**Risk Level**: Medium

**Files**:
- `skills/ai-system-assessment/tests/fixtures/` (a small target with seeded controls and gaps)
- `skills/ai-system-assessment/tests/*.test.js`

**Changes**:
- [x] Fixture with at least one control present and one absent per principle, and one deliberately misleading signal (a control named differently from the checklist).
- [x] Tests assert behaviour, not source text: the structural contract of the skill (every checklist exists, every principle carries the required headings and a signals table, every roadmap template slot is filled by the report template) and the checklists' signal patterns run over the fixture (which signals hit, which do not, per principle).
- [x] A test asserts `SKILL.md` stays within 300 lines (`wc -l` bound) and that running the signal harness leaves the fixture tree byte-identical (hash before and after).
- [x] Mutation-prove: remove a seeded control and confirm the matching test goes red; restore it.
- [x] Add `skills/ai-system-assessment/tests/*.test.js` to the `test:suite` glob list in `package.json`.

**Dependencies**: Phase 3.

---

### Phase 5: Integration

**Risk Level**: Low

**Files**:
- `docs/reference/commands.md`, `docs/reference/activation-phrases.md`
- `docs/reference/skill-catalog.md` (generated)
- `docs/tasks/task-registry.md`

**Changes**:
- [x] Name the skill in both reference pages.
- [x] Do not touch `docs/tasks/task-registry.md`: `/create-task` already appended the row and advanced the counter, and `/finalise` ticks the Status cell.
- [x] `npm run bundle`, `npm run generate-catalog`, `npm run validate -- skills/ai-system-assessment/`.
- [x] Run the skill once against this repository and compare with the expected-output fixture in the plan.

**Dependencies**: Phase 4.

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `skills/ai-system-assessment/SKILL.md` - new; workflow and contract
2. ✅ `skills/ai-system-assessment/references/rubric.md` - new
3. ✅ `skills/ai-system-assessment/references/target-types.md` - new
4. ✅ `skills/ai-system-assessment/references/p1-prompt-and-change-control.md` through `p8-evals-before-change.md` - new, eight files
5. ✅ `skills/ai-system-assessment/assets/report.template.md`, `roadmap.template.md` - new

### Files to Modify (Tests)

6. ✅ `skills/ai-system-assessment/tests/*.test.js` and `tests/fixtures/` - new
7. ✅ `package.json` - add the new test glob to `test:suite` (line 27)

### Files to Modify (Documentation)

8. ✅ `docs/reference/commands.md`, `docs/reference/activation-phrases.md` - name the skill
9. ✅ `docs/reference/skill-catalog.md` - regenerated
10. `docs/tasks/task-registry.md` - not modified by this task (row exists; `/finalise` ticks it)

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: skill structure and rating rules.

**Actions**:
- [ ] Every principle checklist exists and carries the required headings (failure prevented, signals, thresholds, false positive, closing artefact).
- [ ] The report template has a slot for every principle and every rating.
- [ ] Running each principle's declared signal patterns over the fixture hits the seeded controls and misses the seeded gaps.
- [ ] The misleading-signal case (a control under a nonstandard name) is hit by a pattern written to the control's behaviour, and a name-only pattern misses it; the test asserts both.
- [ ] `SKILL.md` is at most 300 lines, and the signal harness leaves the fixture tree byte-identical.

**Command**: `node --test skills/ai-system-assessment/tests/*.test.js`

**Target**: every rule in the rubric is exercised by at least one fixture case.

### Mutation Proving

**Scope**: each seeded control.

**Actions**:
- [ ] Remove one seeded control per principle in turn; confirm the matching test fails; restore.

### Integration Tests

**Scope**: repository guards.

**Actions**:
- [ ] `CI=true npm test` passes, including `skill-frontmatter`, `skill-protocol`, `skill-doc-coverage` and `bundled-parity`.
- [ ] `npm run bundle:check` and `npm run check:generated` are clean.

### Consumer Tests

**Scope**: run against this repository.

**Actions**:
- [ ] Run `/ai-system-assessment` here; the report must reproduce the gaps listed in the plan's expected output (untrusted-content rule, change control, behavioural evals, routing and caching), except any a task merged since 2026-11-04 has closed (task 261 closes the untrusted-content gap). A difference is judged gap by gap and recorded in the QA report; it is not a failure by itself.

---

## 9. Success Criteria

### Functional

- [ ] The skill produces a report with a rating, evidence and gaps for each of the eight principles.
- [ ] Every `Strong`, `Partial` and `Gap` rating cites a `path:line` or a command; a rating with neither is `Unverified`.
- [ ] A `Gap` lists the locations searched.
- [ ] The skill makes no write to the target and runs none of its code. Held by the fixture-tree-unchanged test and by the Consumer Test run: the QA report records `git status --porcelain` of this repository before and after the run, differing only by the report file.
- [ ] The roadmap orders gaps by value per effort and names a closing artefact for each. Held by the roadmap template's required `Closing artefact` and `Value` and `Effort` columns, asserted by the template-slot test.

### Performance

- [ ] Progressive disclosure: `SKILL.md` names each checklist by path and does not inline it, and stays at most 300 lines (the repository defines no skill-size limit; 300 is this task's bound, measured with `wc -l skills/ai-system-assessment/SKILL.md` and asserted by the Phase 4 test).
- [ ] The report is written to a single file in one run; the Consumer Test run records the file's path in the QA report.

### Code Quality

- [ ] `CI=true npm test` passes, including the new suite, which is present in the `test:suite` glob list.
- [ ] `npm run validate -- skills/ai-system-assessment/` passes.
- [ ] Mutation proving recorded in the QA report: removing a seeded control turns its test red.
- [ ] Tests assert behaviour on the fixture, not strings in `SKILL.md`.

### Migration

- [ ] The skill is named in `docs/reference/commands.md` and `docs/reference/activation-phrases.md`, and `tests/skill-doc-coverage.test.js` passes without a new allowlist entry.
- [ ] `npm run bundle:check` and `npm run check:generated` are clean.
- [ ] The run against this repository is recorded in the QA report (not the implementation report, which is committed after `/finalise`).

---

## 10. Risk Assessment

### High Risk Areas

**1. False Gaps from a failed search**
- **Risk**: the skill rates a control absent because it lives under a name or path the checklist did not anticipate.
- **Probability**: High
- **Impact**: Major
- **Mitigation**: `Gap` requires a recorded search over the plausible locations; otherwise `Unverified`. The fixture includes a misleading-signal case and a test for it.
- **Rollback**: tighten the rubric; the skill is read-only so no target is harmed.

**2. Rating a prompt library like a deployed assistant**
- **Risk**: principles that cannot apply (a vector database, end-user identity) mark the target down.
- **Probability**: High
- **Impact**: Major
- **Mitigation**: `target-types.md` and an explicit `Not applicable` rating with a reason.
- **Rollback**: as above.

### Medium Risk Areas

**1. Checklists that restate the video and add no evidence method**
- **Risk**: generic advice instead of greppable signals.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: each signal carries its command; review rejects a signal without one.
- **Rollback**: revise the checklist.

**2. Overlap with `review-security` and `tech-debt-audit`**
- **Risk**: duplicated or contradictory guidance.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: principle 5 defers to `review-security` for execution-level testing; the `SKILL.md` carries a "what this is not" table.
- **Rollback**: trim the overlapping text.

**3. New skill unreachable by tests or docs**
- **Risk**: suite not in `test:suite`, or skill not named in the two pages.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: Phase 4 and 5 name both edits; `skill-doc-coverage` fails if missed.
- **Rollback**: add the missing line.

### Low Risk Areas

**1. Report length**
- **Risk**: the report is too long to read.
- **Probability**: Low
- **Impact**: Minor
- **Mitigation**: one table of ratings first, detail below.
- **Rollback**: edit the template.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- A repository guard (`skill-protocol`, `bundled-parity`) fails and cannot be fixed within the hour.
- The skill writes to the target in any test.

**Steps**:
1. `git revert` the merge commit.
2. Re-run `npm run generate-catalog` and `npm run bundle`.
3. Confirm `CI=true npm test` is green.

**Verification**: the skill is absent from `skills/`, the catalog and both reference pages, and the suite passes.

---

### Partial Rollback (1-2 hours)

**When to Use**: one principle checklist is wrong but the rest is sound.

**Steps**:
1. Revert that checklist and mark the principle `Unverified` in the rubric until corrected.
2. Re-run the fixture tests.

---

### Forward Fix (< 4 hours)

**When to Use**: a wrong rating threshold or a missing signal.

**Approach**: add the signal and a fixture case; mutation-prove it.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The skill modifies the assessed target.
- A repository-wide guard goes red on main because of this skill.

**Non-Critical (Forward Fix)**:
- A checklist signal misses a common naming.
- A report formatting defect.

---

## Stakeholder Sign-off

Not enabled for this repository (`sign-off.enabled` is not set); no section is emitted.

---

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-11-04
**Quality Score**: 96/100
**Gate Decision**: PASS

### QA Report
- **Full Report**: [task.260.qa.2.ai-system-assessment-skill.md](./task.260.qa.2.ai-system-assessment-skill.md)
- **Gate File**: [task.260.gate.2.ai-system-assessment-skill.yml](./task.260.gate.2.ai-system-assessment-skill.yml)

### Test Coverage Summary
- **Tests Executed**: 12
- **Phases Verified**: 5/5
- **Critical Issues**: 0
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS

### Key Findings
No open findings. Cycle 1's CHANGELOG finding is fixed.

<!-- change-log-start -->
## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-11-04 | 1.0     | Initial draft | create-task |
| 2026-11-04 | 1.1     | Review passed (8/10) — fixed size-limit claim, report location, signal-table test mechanism, stale registry edit, two unheld criteria | review-task |
| 2026-11-04 |         | Status → ready-for-development | review-task |
| 2026-11-04 |         | Implementation complete — status → ready-for-review | develop |
| 2026-11-04 |         | QA gate CONCERNS (90/100) — 1 finding | qa-task |
| 2026-11-04 |         | QA findings fixed — cycle 1, 1 finding | qa-fix |
| 2026-11-04 |         | QA gate PASS (96/100) — 0 findings | qa-task |
<!-- change-log-end -->

---

## Progress Tracking

### Phase 1: Rubric and target types
- [x] Ratings and evidence bar
- [x] Target-type mapping

### Phase 2: Eight principle checklists
- [x] p1 to p8 written
- [x] Principle 5 defers to `review-security`

### Phase 3: SKILL.md workflow and templates
- [x] SKILL.md
- [x] Report and roadmap templates

### Phase 4: Fixture and tests
- [x] Fixture with seeded gaps
- [x] Tests, mutation proved
- [x] Glob added to `package.json`

### Phase 5: Integration
- [x] Reference pages, bundle, catalog, validate
- [x] Run against this repository

---

## References

- **Related Skill**: `.agents/skills/tech-debt-audit/` (structural model), `.agents/skills/review-security/` (principle 5 depth)
- **Related Documentation**: `docs/reference/anti-patterns.md`, `shared/resources/mutation-proving.md`
- **Source**: a transcript on how AI systems are built, from which the eight principles are taken

---

## Notes

### Important Reminders

- Edit `shared/resources/` sources, never bundled `references/` copies, if any shared file is cited.
- Run the tests with `CI=true` before pushing.
- A new skill's test glob must be added to `package.json` by hand, or its suite runs nowhere.

### Future Improvements

- A scripted evidence collector, if hand-run checklists prove slow.
- A live pass-rate eval of the skill's judgement (`live.minPass`).
- Follow-up tasks cut from this repository's own roadmap: untrusted-content rule, CODEOWNERS and required checks, behavioural evals on prompt change, model-routing and caching guidance.

---

**Status:** Ready for Review

**Next Steps**:
1. Implement according to implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.260.qa.[number].ai-system-assessment-skill.md`
   - Bug Reports (if needed): `task.260.bug.[N].[name].md`
   - Quality Gate: `task.260.gate.[number].ai-system-assessment-skill.yml`
