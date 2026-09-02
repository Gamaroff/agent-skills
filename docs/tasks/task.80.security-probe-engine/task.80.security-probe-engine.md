---
id: task.80
title: "[Task 80] Make a security probe runnable without widening the snippet allow-list"
type: task
description: "task.73's probe mode is prose: it tells the agent to hand-write a script and run it, and then trusts the probes_executed count the agent types. Build the engine that runs the probe and computes the verdict — without putting an interpreter on the snippet allow-list, which would make that boundary fail open."
tags: [security, probe, sandbox, engine, shared-resources]
category: infrastructure
status: ready-for-development
priority: High
risk_level: medium
created: 2026-09-02
updated: 2026-09-02
assignee:
estimated_effort_hours: 6
depends_on: task.79
---

# Technical Task: Make a security probe runnable without widening the snippet allow-list

**Status:** Ready for Development

---

## 1. Overview

`task.73` gave the DoD security check a probe mode. Read what it actually instructs
(`shared/resources/finalise-dod-security-prompt.md:120-122`):

> **3. Execute them.** Write a short script in a temporary directory that imports the entry point and
> calls it on each candidate, and **run it**.

By hand. Every time. With no shared containment, no reusable candidate set, and — the part that matters —
**`probes_executed` is a number the agent types.** The guard "`boundary: true` and `probes_executed: 0` →
FAIL" is a self-guard whose input is self-reported.

This task builds the engine.

**Scope**: extract the sandbox primitives already proven in `qa-execute-snippets.mjs`, add a probe runner
that computes verdicts itself, and record in writing why the snippet allow-list must not be widened to
admit an interpreter.

---

## 2. Motivation

### Current Problems

1. **The count is self-reported.** An agent that executed nothing can write `probes_executed: 12`. The
   anti-vacuity guard `task.73` built cannot see that.
2. **Containment is re-improvised per run.** `qa-execute-snippets.mjs` has a hardened sandbox — a stripped
   env so no parent tokens leak (`:688-698`), a `snapshotTree` escape sentinel (`:648`), per-block timeouts
   — and probe mode reuses none of it, because it is prose rather than a caller.
3. **The obvious shortcut is a real regression.** `SAFE_COMMANDS` (`:117`) excludes `node` and `python`, so
   a probe classifies `mutating` and is skipped. Adding them looks like a one-line fix and would let **any
   fenced bash block in any document** run arbitrary code through the QA path. That allow-list gates
   untrusted prose extracted from markdown; an interpreter on it makes it fail open.
4. **Verdicts are prose-shaped.** There is no `engages` / `present-but-inert` / `absent` / `unverifiable`
   anywhere — the distinction the whole series exists to draw has no representation in code.

### Benefits

1. **The engine computes the verdict, so an agent that ran nothing cannot report a pass.**
2. **One containment mechanism, two execution policies** — the snippet path keeps its allow-list byte for
   byte; probes get a different gate because they are a different trust class.
3. **`unverifiable` becomes a first-class outcome** rather than a gap that renders as success.

---

## 3. Technical Background

### Current architecture

`shared/resources/qa-execute-snippets.mjs` (1032 lines) is the only hardened executor in the repo. Its
safety model is an **allow-list that fails closed** (`:117` `SAFE_COMMANDS`, `:165` `COMMAND_RUNNERS`,
`:259` `DENY_PATTERNS`, `:561` `classifyBlock`), plus containment: `runBlock` (`:680`) runs in a temp
working copy with a minimal env, and `snapshotTree` (`:648`) reports any write that escapes it.

The subject it was built for is **untrusted text extracted from documentation**. That is why `node`, `gh`
and `curl` are absent from the allow-list in every form.

### The trust-class distinction this task rests on

| | Snippet execution (task.67) | Probe execution (this task) |
| --- | --- | --- |
| Subject | text extracted from a markdown fence | a named export in the repo |
| Who chooses the command | the document | the engine |
| Agent supplies | the whole command line | a module path + export name + input **values** |
| Gate | command allow-list | resolved-path check; inputs never reach a shell |

A probe has no command to allow-list, because the engine constructs the runner. Inputs cross as JSON data,
never interpolated into a shell string, so `node` never appears as a token in agent-authored text.

### Prior art

- **`task.73`** — the method and the `probes_executed` envelope this engine makes trustworthy.
- **`task.67`** — the containment being extracted, and the `qa-runnable-prose-detection.md` convention of
  pairing a rule document with its mechanism.
- **`bug.3` / `bug.6`** — 26 documented fail-open routes past the snippet classifier, which is the evidence
  that widening its allow-list is not a small change.

### Target architecture

`sandboxEnv()` and `snapshotTree()` extracted as reusable primitives; `security-probe.mjs` as a second
caller with its own policy; `probe-boundary-rule.md` as the argument beside the mechanism.

---

## 4. Scope

### In Scope

✅ **Extract `sandboxEnv()` and `snapshotTree()`** from `qa-execute-snippets.mjs`, no behaviour change
✅ **`shared/resources/security-probe.mjs`** — `runProbeSpec({ sink, entry, cases })`
✅ **The engine computes the verdict** — `engages` / `present-but-inert` / `absent` / `unverifiable`
✅ **`shared/resources/probe-boundary-rule.md`** — including the written refusal to widen `SAFE_COMMANDS`
✅ **Parity tests** proving the extraction changed nothing observable in the snippet path

### Out of Scope

❌ **Adding `node` or `python` to `SAFE_COMMANDS`** — refused, with the reason recorded in the rule doc
❌ **Network probes** — both motivating defects are pure; no probe dials out
❌ **Non-importable sinks** — shell/exec and live-DB return `unverifiable` **by design in v1**
❌ **Any skill** — that is `task.81`
❌ **Any gate-schema change** — that is `task.82`
❌ **An OS-level sandbox** — the honest limit is stated, not engineered around

---

## 5. Breaking Changes

None intended. The extraction must be behaviour-preserving for `qa-execute-snippets.mjs`; Phase 1's parity
tests are what establish that rather than assert it.

---

## 6. Implementation Plan

### Phase 1: Extract the containment, prove nothing moved

**Risk Level**: Medium

**Files**: `shared/resources/qa-execute-snippets.mjs`, `shared/resources/tests/qa-execute-snippets.test.mjs`

**Changes**:
- [ ] Export `sandboxEnv()` — the CR-12 minimal env (`PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`, `PWD` plus
      bindings), so no parent token reaches a child
- [ ] Export `snapshotTree()` unchanged — it is already exported at `:648`; confirm and pin
- [ ] `runBlock()` calls both rather than inlining them
- [ ] **Assert the classifier is untouched**: `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS` and
      `classifyBlock()` byte-identical in behaviour, pinned by a test over the existing QA-1…QA-14 cases
- [ ] Mutation-prove the extraction: change `sandboxEnv` to spread `process.env` and confirm the
      no-parent-tokens test goes red

**Dependencies**: none

---

### Phase 2: The probe runner

**Risk Level**: Medium

**Files**: `shared/resources/security-probe.mjs` (new)

**Changes**:
- [ ] `runProbeSpec({ sink, entry, cases })` where `entry` is `path#exportName` and `cases` come from
      `corpusFor(sink)` (task.79) or are caller-supplied in the same shape
- [ ] **Resolve `entry` and assert it is under the repo root** before importing; reject otherwise
- [ ] Run each case in its own child process, so a hang, throw or `process.exit` is contained and
      attributable to one case rather than killing the run
- [ ] Inputs cross as JSON — never interpolated into a shell string
- [ ] Per-case timeout from the shared spawn budget (`shared/resources/tests/spawn-budget.mjs`), **not a
      literal** — `tests/test-harness-concurrency.test.js` fails the build on a hardcoded `timeout: <n>`
- [ ] Report `{ executed, passed, reproduced[], declined[] }`; exit 0 / 1 / 2 per the convention at the top
      of `qa-execute-snippets.mjs`; `--json`

**Dependencies**: Phase 1, task.79

---

### Phase 3: Verdicts, and the states that must not collapse

**Risk Level**: Medium

**Files**: `shared/resources/security-probe.mjs`, `shared/resources/probe-boundary-rule.md` (new)

**Changes**:
- [ ] Compute the verdict from the run, never from a caller-supplied field:
      - **`engages`** — hostile cases handled as `correct` says, and at least one `legitimate` case passes
      - **`present-but-inert`** — the control is reachable in source but a hostile case is handled as if it
        were absent. **High severity**: worse than absent, because it has already been reviewed and believed
      - **`absent`** — no control found at the entry point
      - **`unverifiable`** — could not run: zero cases, an entry point that is not importable, a declined
        target, a timeout
- [ ] **Zero cases yields `unverifiable`, never `engages`** and never a pass
- [ ] **`declined` is its own state**, never folded into `executed: 0` — collapsing states is the defect
      `task.73` chased through four QA cycles and `bug.7` documents one layer up
- [ ] `probe-boundary-rule.md`: the trust-class argument, the v1 limits (importable entry points only; the
      harness contains the harness, not arbitrary repo code), and **the refusal to add `node` to
      `SAFE_COMMANDS`, with the reason** — someone will propose it as the easy path

**Dependencies**: Phase 2

---

### Phase 4: Tests and mutation proofs

**Risk Level**: Low

**Files**: `shared/resources/tests/security-probe.test.mjs` (new)

**Changes**:
- [ ] A fixture whose control engages → `engages`; one that is present-but-inert → `present-but-inert`
- [ ] `cases: []` → `unverifiable`
- [ ] A non-importable entry → `declined`, not `executed: 0`
- [ ] An entry path outside the repo root → rejected
- [ ] The sentinel fires when a probe writes outside its temp dir
- [ ] **Mutation proofs**: remove the `present-but-inert` branch → the inert fixture test goes red; make
      zero cases return `engages` → that test goes red; restore both

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. `shared/resources/security-probe.mjs`
2. `shared/resources/probe-boundary-rule.md`
3. `shared/resources/tests/security-probe.test.mjs`

### Files to Modify

4. `shared/resources/qa-execute-snippets.mjs` — export the primitives; classifier untouched
5. `shared/resources/tests/qa-execute-snippets.test.mjs` — parity assertions
6. `CHANGELOG.md`

### Files Regenerated

7. `skills/*/references/*` — `npm run bundle` output

---

## 8. Testing Strategy

### Contract Tests

- [ ] The four verdicts, each produced by a fixture
- [ ] Zero cases → `unverifiable`; declined ≠ executed-zero
- [ ] Entry-path containment
- [ ] Snippet classifier behaviour unchanged across QA-1…QA-14

**Command**: `node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/qa-execute-snippets.test.mjs`

### Mutation Proving

- [ ] `sandboxEnv` spreads `process.env` → the token-leak test reds
- [ ] The `present-but-inert` branch removed → the inert fixture reds
- [ ] Zero cases returns `engages` → that test reds
- [ ] `declined` folded into `executed: 0` → the state-separation test reds

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [ ] `runProbeSpec` returns a verdict the engine computed, not one a caller supplied
- [ ] Zero executed cases yields `unverifiable`; a declined target is distinguishable from a zero count
- [ ] Probes run contained: minimal env, temp cwd, escape sentinel, budgeted timeout
- [ ] `probe-boundary-rule.md` records the `SAFE_COMMANDS` refusal and the v1 limits

### Regression

- [ ] `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS`, `classifyBlock` behaviourally unchanged
- [ ] `bug.3`'s 14 replay routes still classify as they did — `snippet-classifier-fail-open-replay.test.mjs` green
- [ ] `npm run ci` green

### Safety

- [ ] No interpreter added to `SAFE_COMMANDS`
- [ ] An entry path outside the repo root is rejected before import
- [ ] No probe opens a network connection
- [ ] Inputs never reach a shell as text

---

## 10. Risk Assessment

### High Risk Areas

**1. The extraction silently changes snippet-execution behaviour**

- **Risk**: `runBlock` is the containment for a boundary with 26 documented fail-open routes behind it.
- **Probability**: Medium. **Impact**: Major.
- **Mitigation**: Phase 1 lands the extraction *alone*, with parity tests and a mutation proof, before any
  probe code exists.
- **Rollback**: revert Phase 1; the new files are inert without it.

**2. Someone adds `node` to `SAFE_COMMANDS`**

- **Risk**: it is the obvious shortcut, and it makes the snippet allow-list fail open for every document.
- **Mitigation**: refused in writing in `probe-boundary-rule.md`, with the reason, plus a test asserting
  no interpreter is present in the set.

### Medium Risk Areas

**1. `unverifiable` becomes the common answer and the engine reads as useless**

- **Risk**: if most real controls are not importable in-process, v1 declines almost everything.
- **Mitigation**: both measured defects are pure composers, which is evidence the shape is common enough to
  be worth v1. If Phase 4's fixtures are the only things it can probe, that is a finding to record in the
  rule doc's limits section rather than paper over.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: a snippet-execution regression, or the sentinel firing on legitimate probes.

**Steps**: revert Phase 1's extraction (restoring the inlined env and sentinel in `runBlock`); delete
`security-probe.mjs`. `task.73`'s prose probe mode is unaffected — it never depended on this engine.

**Verification**: `node --test shared/resources/tests/qa-execute-snippets.test.mjs` and
`evals/shared/tests/snippet-classifier-fail-open-replay.test.mjs` both green.

### Forward Fix (< 4 hours)

Keep the extraction, narrow the probe runner to the fixture cases only, and widen once the containment has
run clean for a cycle.

---

<!--
  Append-only. Newest row LAST. Four columns, exactly as below.
-->

## Change Log

| Date       | Version | Description                                                                    | Author      |
| ---------- | ------- | ------------------------------------------------------------------------------ | ----------- |
| 2026-09-02 | 1.0     | Initial draft — filed from the rebirth-wallet security-review handover           | create-task |

---

## Progress Tracking

### Phase 1: Extract containment
- [ ] `sandboxEnv()` / `snapshotTree()` exported, `runBlock` calls them
- [ ] Classifier proven unchanged
- [ ] Extraction mutation-proved

### Phase 2: Probe runner
- [ ] `runProbeSpec` with per-case child processes
- [ ] Entry-path containment
- [ ] Timeout from the spawn budget, not a literal

### Phase 3: Verdicts
- [ ] Four verdicts computed by the engine
- [ ] Zero cases → unverifiable; declined is its own state
- [ ] `SAFE_COMMANDS` refusal recorded with its reason

### Phase 4: Tests
- [ ] Four verdicts covered by fixtures
- [ ] Sentinel and containment cases
- [ ] Mutation proofs

---

## References

- **The prose this replaces**: `shared/resources/finalise-dod-security-prompt.md:120-122` (task.73)
- **The containment being extracted**: `shared/resources/qa-execute-snippets.mjs:648,680,688-698` (task.67)
- **Why the allow-list must not widen**: [`bug.6`](../../bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md),
  and `bug.3` before it — 26 documented routes past that boundary
- **Collapsed-state precedent**: `task.73`'s tri-state conflation, and `bug.7` one layer up
- **The corpus this consumes**: `task.79`
- **Consumer**: `task.81`

---

## Notes

### The one sentence this task exists for

`probes_executed` is currently a number an agent types. Everything else here is in service of making it a
number an engine counted.

### The honest limit, which belongs in the rule doc

The harness contains *the harness*. The module under probe runs with full Node privileges — there is no
OS-level sandbox, exactly as `qa-runnable-prose-detection.md` §3aa already says of the snippet path. The
precondition is a pure-ish predicate or composer, which is what the boundary rule selects for anyway. A
target that opens sockets must be **declined and recorded as declined**, never counted as probed.
