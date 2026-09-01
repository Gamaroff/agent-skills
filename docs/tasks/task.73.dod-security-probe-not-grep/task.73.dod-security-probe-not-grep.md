---
id: task.73
title: "[Task 73] Make the DoD security check execute candidate inputs, not grep for them"
type: task
description: "The finalise DoD security agent is a grep-only inspector. On task 67 a substituted prompt that executed candidate inputs found 14 fail-open routes past a boundary the grep version reported as PASS — two of them commands the code deny-listed by name. Give the agent a probe mode for work items whose deliverable is a boundary."
tags: [qa, dod, finalise, security, verification]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-01
updated: 2026-09-01
assignee:
estimated_effort_hours: 6
---

# Technical Task: Make the DoD security check execute candidate inputs, not grep for them

**Status:** Ready for Development

---

## 1. Overview

`/finalise` dispatches four parallel DoD agents. The security one is instructed to **read**:

> `skills/finalise/references/finalise-dod-security-prompt.md:15` — "You are a read-only security
> verification agent."
> `:23` — "For each check: **grep** the repository or diff for `file:line` evidence."

Every check in it is a grep for a pattern (`@UseGuards`, `class-validator`, `dangerouslySetInnerHTML`,
raw SQL). That is a reasonable *inventory* check. It is not a security test, and for a work item whose
deliverable **is** a boundary — a parser, a classifier, a validator, a sanitiser, an authorisation
check — inventory is the wrong instrument entirely.

**Scope**: a detection rule for when a work item's deliverable is a boundary, plus a probe mode in the
security prompt for that case. No change to the DoD schema, the agent count, or the other three prompts.

---

## 2. Motivation

### Current Problems

1. **Measured, on this repository, in the run that produced task 67.** The shipped grep prompt was
   replaced with one that said *"actually test candidate inputs by calling `classifyBlock` via a small
   node script — do not reason abstractly."* It found **14 fail-open routes**, all reproduced, several
   executed. Two of them — `gh pr comment` and `curl -X POST` — were on the code's own deny-list **by
   name**, reached by adding a quote (`g\h`, `cu'r'l`).
2. **The grep prompt would have found none of them.** Every one of those 14 inputs passes inspection:
   the deny-list is present, the allow-list is present, the fail-closed default is present. The code
   *reads* correctly. It behaves incorrectly. A grep for "is there a deny-list?" answers yes.
3. **It had already passed a QA security gate.** `task.67.gate.2` recorded `security: PASS` an hour
   earlier. Both checks asked whether the mechanism existed; neither asked whether it held.
4. **"Read-only" is being conflated with "does not execute".** The agent runs as an `Explore` subagent,
   which has `Bash`. It can run a probe script without mutating the repository — that is exactly what
   the substituted prompt did. The current wording forecloses a capability the agent already has.
5. **This is the same defect task 67 exists to fix, one layer up.** Task 67 added a QA step because
   *prose nobody runs is prose nobody verified*. The gate that certifies that work is itself a check
   that reads and never runs.

### Benefits

1. **Catches the class of defect inspection structurally cannot** — a boundary that is present,
   well-formed, and permeable.
2. **Cheap where it does not apply.** A work item with no boundary in its diff skips probe mode and the
   existing checklist runs unchanged.
3. **Findings arrive reproduced.** A probe that ran is a finding with an input attached, not a
   suspicion — which is what makes it actionable and what stops false positives entering the gate.

---

## 3. Technical Background

### Current architecture

`/finalise` Step 3b dispatches four Explore subagents in one parallel message. Agent 2 loads
`finalise-dod-security-prompt.md`, substitutes `<STORY_FILE>` and `<STORY_TYPE>`, and returns a YAML
block of `{check, status, citation}`. `PASS` requires a non-null citation; no citation means `FAIL`.

The prompt's checks are organised by story type (API, UI, Data, Auth, Infrastructure) and every one of
them is a grep instruction.

### Target architecture

The same agent, the same YAML shape, plus a **probe mode** that fires on a detection rule. In probe
mode the agent additionally:

1. Identifies the boundary's entry point (an exported predicate, validator, parser or classifier).
2. Generates candidate inputs designed to defeat it.
3. **Executes** them against the shipped code and reports only what reproduced.

The return shape gains one optional key, `probes[]`, carrying `{input, expected, actual, reproduced}`.

### Important clarifications

- **Read-only stays read-only.** The agent must not mutate the repository, open network connections, or
  write outside a temp directory. Executing a pure predicate against candidate inputs does none of those.
- **This is not fuzzing and not a sandbox.** It is a bounded, hand-reasoned candidate set, executed once.
- **It does not replace the checklist.** Probe mode is additive; the grep checks still run.

---

## 4. Scope

### In Scope

✅ **Detection rule** — when a work item's deliverable counts as a boundary
✅ **Probe-mode section** in `finalise-dod-security-prompt.md`, gated on that rule
✅ **`probes[]` in the returned YAML**, and its rendering into the DoD running summary
✅ **The rule that an unreproduced finding is not reported** — probe mode reports what it ran

### Out of Scope

❌ **The other three DoD prompts** (AC, compliance, docs) — different instruments, different task
❌ **Property-based testing or fuzzing infrastructure** — a bounded candidate set, not a generator
❌ **Changing the DoD decision matrix, agent count, or YAML envelope**
❌ **Retrofitting past work items** — going-forward only

---

## 5. Breaking Changes

None. Probe mode is additive and gated; a work item with no boundary in its diff sees the current
behaviour exactly. The YAML gains an optional key that existing consumers ignore.

---

## 6. Implementation Plan

### Phase 1: Detection rule — when is the deliverable a boundary?

**Risk Level**: Medium

**Files**: `shared/resources/finalise-dod-security-prompt.md`

**Changes**:
- [ ] Define "boundary deliverable": the diff adds or modifies a function whose purpose is to **accept
      or reject** — a classifier, validator, parser, sanitiser, authorisation check, allow/deny-list, or
      any predicate whose `false` prevents an action
- [ ] State the signals: an exported predicate returning a verdict; a named allow-list or deny-list; a
      function whose own tests are mostly "X is refused"; a task document whose Success Criteria contain
      the words *never*, *must not*, *fails closed*, or *refused*
- [ ] State the negative case explicitly — a CRUD endpoint, a renderer, a report writer are **not**
      boundaries, and probe mode must not fire on them

**Dependencies**: none

---

### Phase 2: Probe-mode instructions

**Risk Level**: Medium

**Files**: `shared/resources/finalise-dod-security-prompt.md`

**Changes**:
- [ ] Add a **Probe mode** section, entered only when Phase 1's rule fires
- [ ] Instruct: locate the entry point, then generate candidates across the axes that defeat boundaries
      in practice — **alternative spellings** (quoting, escaping, globbing, case, unicode), **position**
      (a flag in trailing rather than leading position), **composition** (chaining, nesting,
      substitution), **the unparseable case** (input the checker cannot read at all), and **the
      long/short form of every flag the code names**
- [ ] Instruct: **execute** each candidate against the shipped code via a short script and report only
      reproduced results. An unreproduced suspicion is not a finding
- [ ] Instruct: assert the **other direction too** — a set of legitimate inputs that must still be
      accepted, so an over-strict fix is caught as readily as a permeable one
- [ ] Preserve the read-only contract in wording: no repository mutation, no network, no writes outside
      a temp directory — executing a pure predicate is none of these

**Dependencies**: Phase 1

---

### Phase 3: Return shape and DoD summary rendering

**Risk Level**: Low

**Files**: `shared/resources/finalise-dod-security-prompt.md`, `skills/finalise/SKILL.md`

**Changes**:
- [ ] Add optional `probes:` to the returned YAML — `{input, expected, actual, reproduced}`
- [ ] Render probe results in the DoD running summary's Security section, including the count of
      candidates run and the count that reproduced
- [ ] **A boundary work item where probe mode ran and executed zero candidates is a finding**, not a
      pass — the same self-guard task 67 applies to its own step, for the same reason

**Dependencies**: Phase 2

---

### Phase 4: Hold the prompt with a contract test

**Risk Level**: Low

**Files**: `evals/shared/tests/finalise-dod-prompt-contract.test.mjs` (new)

**Changes**:
- [ ] Assert the security prompt contains a probe-mode section and the detection rule
- [ ] Assert it still returns the YAML shape `finalise/SKILL.md` renders, including `probes`
- [ ] Assert the read-only clauses survive — no-mutation, no-network, temp-dir-only
- [ ] Assert the zero-probes-executed guard is present and not softened

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. ✅ `evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

### Files to Modify

2. ✅ `shared/resources/finalise-dod-security-prompt.md` — detection rule + probe mode + return shape
3. ✅ `skills/finalise/SKILL.md` — render `probes[]` in the Security section of the running summary

### Files Regenerated (commit them — CI checks freshness)

4. ✅ `skills/finalise/references/finalise-dod-security-prompt.md` — `npm run bundle` output

> **Edit the source, never the generated copy.** `skills/finalise/references/finalise-dod-security-prompt.md`
> carries the `AUTO-GENERATED — DO NOT EDIT` banner and is rebuilt from
> `shared/resources/finalise-dod-security-prompt.md`. A fix applied to the bundled copy is silently
> reverted by the next `npm run bundle`, and `validate.yml`'s Bundle freshness check fails the PR either
> way. Run `npm run bundle` and commit the regenerated file as part of the change.

---

## 8. Testing Strategy

### Contract Tests

- [ ] Probe-mode section present; detection rule present; both negative and positive cases stated
- [ ] Return shape still matches what `finalise/SKILL.md` renders
- [ ] Read-only clauses intact
- [ ] Zero-probes-executed guard present

**Command**: `node --test evals/shared/tests/finalise-dod-prompt-contract.test.mjs`

### Replay Verification (the whole point)

- [ ] Run the new prompt against the **pre-fix** `qa-execute-snippets.mjs` from commit `a74c59a` and
      confirm it reproduces the 14 routes recorded in `task.67.bug.3`
- [ ] Run it against the **post-fix** version at `0c4c05f` and confirm it reports none

That second assertion is what stops the prompt from being a machine that always finds something.

### Mutation Proving

- [ ] Remove the "execute, do not reason abstractly" instruction → the replay stops reproducing
- [ ] Remove the legitimate-input direction → an over-strict mutation goes unreported

---

## 9. Success Criteria

### Functional

- [ ] A work item whose diff adds a boundary triggers probe mode
- [ ] A work item with no boundary does not, and the skip is recorded
- [ ] Probe results appear in the DoD running summary with candidate and reproduction counts
- [ ] Only reproduced findings are reported

### Regression

- [ ] Replay against `a74c59a` reproduces the task-67 routes
- [ ] Replay against `0c4c05f` reports none
- [ ] The existing grep checklist still runs and still returns its current shape

### Safety

- [ ] The agent performs no repository mutation, no network call, and no write outside a temp directory
- [ ] A boundary work item where zero candidates executed is reported as a finding

---

## 10. Risk Assessment

### High Risk Areas

**1. A probe that mutates something**

- **Risk**: a candidate input, executed, has a side effect.
- **Probability**: Low — candidates target a pure predicate, not a runner.
- **Impact**: Critical — the gate would cause the harm it checks for.
- **Mitigation**: instruct execution of the *classification* entry point only, never the execution one;
  temp cwd; no credentials in the environment.
- **Rollback**: remove the probe-mode section; the checklist still runs.

### Medium Risk Areas

**1. The prompt becomes a machine that always finds something**

- **Risk**: an agent asked to find holes will report holes, real or not.
- **Impact**: Major — false findings at the DoD gate are expensive and erode the gate.
- **Mitigation**: only reproduced results may be reported; the replay test asserts the post-fix code
  produces **zero** findings, which is the assertion that keeps it honest.

**2. Detection fires too widely**

- **Risk**: probe mode on every work item, adding cost and noise.
- **Impact**: Moderate.
- **Mitigation**: the rule names the negative case explicitly; the skip is recorded, so over-firing is
  visible in the DoD summary rather than silent.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a probe causes a side effect; persistent false findings.

**Steps**: delete the probe-mode section from the prompt. The detection rule becomes inert and the grep
checklist runs exactly as it does today.

**Verification**: a finalise run reports the current Security section shape with no `probes` key.

### Forward Fix (< 4 hours)

Narrow the detection rule, or narrow the candidate axes. Both live in one file.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                          | Author      |
| ---------- | ------- | -------------------------------------------------------------------- | ----------- |
| 2026-09-01 | 1.0     | Initial draft — filed from the task.67 pipeline retrospective          | create-task |

---

## Progress Tracking

### Phase 1: Detection rule
- [ ] Define and document the boundary rule, with its negative case

### Phase 2: Probe mode
- [ ] Candidate axes
- [ ] Execute-and-reproduce instruction
- [ ] Legitimate-input direction

### Phase 3: Return shape
- [ ] `probes[]` in YAML
- [ ] Rendering in the DoD summary
- [ ] Zero-probes-executed guard

### Phase 4: Contract test
- [ ] Prompt contract held
- [ ] Replay against a74c59a / 0c4c05f
- [ ] Mutation proofs

---

## References

- **The evidence**: [`task.67.bug.3.obfuscated-names-and-flag-writes.md`](../task.67.execute-the-skill-qa-gate/task.67.bug.3.obfuscated-names-and-flag-writes.md) — the 14 routes the grep prompt would have passed
- **The gate that passed them**: [`task.67.gate.2.execute-the-skill-qa-gate.yml`](../task.67.execute-the-skill-qa-gate/task.67.gate.2.execute-the-skill-qa-gate.yml) — `security: PASS`, an hour before
- **The DoD record**: [`task.67.dod.1.execute-the-skill-qa-gate.md`](../task.67.execute-the-skill-qa-gate/task.67.dod.1.execute-the-skill-qa-gate.md)
- **The prompt being changed**: `shared/resources/finalise-dod-security-prompt.md` (the **source**; `skills/finalise/references/` holds the generated copy)
- **Sibling lesson, same root cause**: `task.74` — a security re-review must re-probe, not re-read
- **Mutation proving**: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)

---

## Notes

### Important Reminders

- **"Read-only" must keep meaning "does not mutate", not "does not run".** The agent already has `Bash`;
  the current wording forecloses a capability it has, and that foreclosure is the defect.
- **The post-fix replay assertion is not optional.** Without it this task ships a prompt that finds
  something every time, which is worse than the grep it replaces.

### Why this is High priority

The evidence is not hypothetical. A boundary passed a QA security gate and a DoD security review one
hour apart, with fourteen ways through it, two of which were commands its own deny-list named. Both
gates asked whether the mechanism existed. Neither asked whether it held.
