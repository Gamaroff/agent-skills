---
id: task.80
title: "[Task 80] Make a security probe runnable without widening the snippet allow-list"
type: task
description: "task.73's probe mode is prose: it tells the agent to hand-write a script and run it, and then trusts the probes_executed count the agent types. Build the engine that runs the probe and computes the verdict — without putting an interpreter on the snippet allow-list, which would make that boundary fail open."
tags: [security, probe, sandbox, engine, shared-resources]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-09-02
updated: 2026-09-07
completed_date: 2026-09-07
pr_number: 337
assignee:
estimated_effort_hours: 6
depends_on: task.79
---

# Technical Task: Make a security probe runnable without widening the snippet allow-list

**Status:** Accepted
**Review**: ✅ All review recommendations from `task.80.review.1.security-probe-engine.md` implemented 2026-09-07 (1 skipped — tracker linkage needs consent)

---

## 1. Overview

`task.73` gave the DoD security check a probe mode. Read what it actually instructs
(`shared/resources/finalise-dod-security-prompt.md:145-146`, under §"Step 4: Probe mode"):

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

`shared/resources/qa-execute-snippets.mjs` (1517 lines) is the only hardened executor in the repo. Its
safety model is an **allow-list that fails closed** (`:117` `SAFE_COMMANDS`, `:165` `COMMAND_RUNNERS`,
`:422` `DENY_PATTERNS`, `:982` `classifyBlock`), plus containment: `runBlock` (`:1113`) runs in a temp
working copy with a minimal env (`:1121-1127`), and `snapshotTree` (`:1081`) reports any write that
escapes it.

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
- [x] Export `sandboxEnv()` — the CR-12 minimal env (`PATH`, `HOME`, `LANG`, `TERM`, `TMPDIR`, `PWD` plus
      bindings), currently inlined in `runBlock` at `:1121-1127`, so no parent token reaches a child
- [x] **Export `snapshotTree()`** — it is defined at `:1081` as a module-private `function snapshotTree(`,
      **not** exported. Adding the `export` keyword is the change; there is nothing to "confirm". Its body
      stays byte-identical
- [x] `runBlock()` calls both rather than inlining them
- [x] **Assert the classifier is untouched**: `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS` and
      `classifyBlock()` byte-identical in behaviour, pinned by a test over the existing QA-1…QA-17 cases
- [x] Mutation-prove the extraction: change `sandboxEnv` to spread `process.env` and confirm the
      no-parent-tokens test goes red

**Dependencies**: none

---

### Phase 2: The probe runner

**Risk Level**: Medium

**Files**: `shared/resources/security-probe.mjs` (new)

**Changes**:
- [x] `runProbeSpec({ sink, entry, cases })` where `entry` is `path#exportName` and `cases` come from
      `corpusFor(sink)` (task.79) or are caller-supplied in the same shape
- [x] **Resolve `entry` and assert it is under the repo root** before importing; reject otherwise
- [x] Run each case in its own child process, so a hang, throw or `process.exit` is contained and
      attributable to one case rather than killing the run
- [x] Inputs cross as JSON — never interpolated into a shell string
- [x] Per-case timeout from the shared spawn budget (`shared/resources/tests/spawn-budget.mjs`), **not a
      literal** — `tests/test-harness-concurrency.test.js` fails the build on a hardcoded `timeout: <n>`
- [x] Report `{ executed, passed, reproduced[], declined[] }`; exit 0 / 1 / 2 per the convention at the top
      of `qa-execute-snippets.mjs`; `--json`

**Dependencies**: Phase 1, task.79

---

### Phase 3: Verdicts, and the states that must not collapse

**Risk Level**: Medium

**Files**: `shared/resources/security-probe.mjs`, `shared/resources/probe-boundary-rule.md` (new)

**Changes**:
- [x] Compute the verdict from the run, never from a caller-supplied field:
      - **`engages`** — hostile cases handled as `correct` says, and at least one `legitimate` case passes
      - **`present-but-inert`** — the control is reachable in source but a hostile case is handled as if it
        were absent. **High severity**: worse than absent, because it has already been reviewed and believed
      - **`absent`** — no control found at the entry point
      - **`unverifiable`** — could not run: zero cases, an entry point that is not importable, a declined
        target, a timeout
- [x] **Zero cases yields `unverifiable`, never `engages`** and never a pass
- [x] **`declined` is its own state**, never folded into `executed: 0` — collapsing states is the defect
      `task.73` chased through four QA cycles and `bug.7` documents one layer up
- [x] `probe-boundary-rule.md`: the trust-class argument, the v1 limits (importable entry points only; the
      harness contains the harness, not arbitrary repo code), and **the refusal to add `node` to
      `SAFE_COMMANDS`, with the reason** — someone will propose it as the easy path

**Dependencies**: Phase 2

---

### Phase 4: Tests and mutation proofs

**Risk Level**: Low

**Files**: `shared/resources/tests/security-probe.test.mjs` (new)

**Changes**:
- [x] A fixture whose control engages → `engages`; one that is present-but-inert → `present-but-inert`
- [x] `cases: []` → `unverifiable`
- [x] A non-importable entry → `declined`, not `executed: 0`
- [x] An entry path outside the repo root → rejected
- [x] The sentinel fires when a probe writes outside its temp dir
- [x] **Mutation proofs**: remove the `present-but-inert` branch → the inert fixture test goes red; make
      zero cases return `engages` → that test goes red; restore both

**Dependencies**: Phase 3

---

## 7. Files Summary

### Files to Create

1. `shared/resources/security-probe.mjs`
2. `shared/resources/probe-boundary-rule.md`
3. `shared/resources/tests/security-probe.test.mjs`

### Files to Modify

4. `shared/resources/qa-execute-snippets.mjs` — extract + export `sandboxEnv()`, add `export` to the
   existing `snapshotTree()`; classifier untouched
5. `shared/resources/tests/qa-execute-snippets.test.mjs` — parity assertions
6. `CHANGELOG.md`

### Files Regenerated

7. `skills/*/references/*` — `npm run bundle` output

### Files Actually Landed

> Refreshed after QA cycle 3 in response to PR-review finding **PC-2** — the first version of this
> table recorded the develop-time state and was never updated by the two QA fix cycles, while its
> heading claimed to describe what shipped.

**Created**

| File | Note |
| --- | --- |
| `shared/resources/security-probe.mjs` | 593 lines — engine, verdict computation, CLI |
| `shared/resources/probe-boundary-rule.md` | 222 lines — the argument, the refusal, the v1 limits |
| `shared/resources/tests/security-probe.test.mjs` | 22 tests |
| `shared/resources/tests/fixtures/security-probe/*.mjs` | 7 fixtures — one per verdict, plus escape, engaging-but-escaping, and not-a-function |

**Modified**

| File | Note |
| --- | --- |
| `shared/resources/qa-execute-snippets.mjs` | `sandboxEnv()` extracted + exported; `export` added to `snapshotTree()`. Classifier untouched. |
| `shared/resources/tests/qa-execute-snippets.test.mjs` | +9 parity tests (98 total, was 89) |
| `skills/create-skill/scripts/bundle_skill.py` | QA cycle 2 — create nested parents before writing a transitive dep |
| `tests/bundle-mjs.test.js` | QA cycle 2 — nested-sibling regression; helper creates nested `sharedFiles` parents |
| `CHANGELOG.md` | Added section |

**Moved** *(QA cycle 2, TASK80-006 — a production module must not import from `tests/`)*

| From | To |
| --- | --- |
| `shared/resources/tests/spawn-budget.mjs` | `shared/resources/spawn-budget.mjs` |

**Import sites updated for the move** — `shared/resources/tests/access-config-parity.test.mjs`,
`shared/resources/tests/jira-interception.test.mjs`,
`shared/resources/tests/qa-execute-snippets.test.mjs`,
`shared/resources/tests/stdout-drain-on-exit.test.mjs`,
`evals/shared/tests/qa-re-review-scope-parity.test.mjs`,
`tests/test-harness-concurrency.test.js` (3 references), and `shared/resources/security-probe.mjs`.

**Regenerated** — `skills/*/references/qa-execute-snippets.mjs` (5 copies, `npm run bundle` output).

--- | --- | --- |
| `shared/resources/security-probe.mjs` | created | 430 lines — engine, verdict computation, CLI |
| `shared/resources/probe-boundary-rule.md` | created | 208 lines — the argument, the refusal, the limits |
| `shared/resources/tests/security-probe.test.mjs` | created | 18 tests |
| `shared/resources/tests/fixtures/security-probe/*.mjs` | created | 6 fixtures — one per verdict, plus escape and not-a-function |
| `shared/resources/qa-execute-snippets.mjs` | modified | `sandboxEnv()` extracted + exported; `export` added to `snapshotTree()`. Classifier untouched. |
| `shared/resources/tests/qa-execute-snippets.test.mjs` | modified | +8 parity tests (97 total, was 89) |
| `CHANGELOG.md` | modified | Added section |
| `skills/*/references/*` | regenerated | `npm run bundle` |

---

## 8. Testing Strategy

### Contract Tests

- [x] The four verdicts, each produced by a fixture
- [x] Zero cases → `unverifiable`; declined ≠ executed-zero
- [x] Entry-path containment
- [x] Snippet classifier behaviour unchanged across QA-1…QA-17

**Command**: `node --test shared/resources/tests/security-probe.test.mjs shared/resources/tests/qa-execute-snippets.test.mjs`

### Mutation Proving

- [x] `sandboxEnv` spreads `process.env` → the token-leak test reds
- [x] The `present-but-inert` branch removed → the inert fixture reds
- [x] Zero cases returns `engages` → that test reds
- [x] `declined` folded into `executed: 0` → the state-separation test reds

Procedure: [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md).

---

## 9. Success Criteria

### Functional

- [x] `runProbeSpec` returns a verdict the engine computed, not one a caller supplied
- [x] Zero executed cases yields `unverifiable`; a declined target is distinguishable from a zero count
- [x] Probes run contained: minimal env, temp cwd, escape sentinel, budgeted timeout
- [x] `probe-boundary-rule.md` records the `SAFE_COMMANDS` refusal and the v1 limits

### Regression

- [x] `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS`, `classifyBlock` behaviourally unchanged
- [x] `bug.3`'s 14 replay routes still classify as they did — `snippet-classifier-fail-open-replay.test.mjs` green
- [x] `npm run ci` green

### Safety

- [x] No interpreter added to `SAFE_COMMANDS`
- [x] An entry path outside the repo root is rejected before import
- [x] No probe opens a network connection
- [x] Inputs never reach a shell as text

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
| 2026-09-07 | 1.1     | Review passed (8/10) — corrected 5 stale source anchors that drifted when task.79 landed; `snapshotTree` is module-private, not exported, so Phase 1 gains a real export step; QA case range widened to QA-17 | review-task |
| 2026-09-07 |         | Implemented — 8 files (3 created, 3 modified, 6 fixtures), 26 tests added (18 new + 8 parity), 4 mutation proofs | develop |
| 2026-09-07 |         | QA gate CONCERNS (60/100) — 4 MEDIUM findings, all peripheral; all 7 safety criteria verified | qa-task |
| 2026-09-07 |         | QA findings fixed — 4 MEDIUM closed + 1 new latent bug (exit-after-write truncation), 1 iteration | qa-fix |
| 2026-09-07 |         | QA gate CONCERNS (80/100) cycle 2 — all 4 prior findings verified fixed; 2 new MEDIUM found by the refute pass | qa-task |
| 2026-09-07 |         | QA findings fixed — 2 MEDIUM closed; spawn-budget moved out of tests/, bundler nested-dep fix, 2 iterations | qa-fix |
| 2026-09-07 |         | QA gate PASS (100/100) cycle 3 — both prior findings verified fixed, no new findings | qa-task |
| 2026-09-07 |         | PR conformance review CONCERNS — 2 doc-currency findings, both fixed | review-pr |
| 2026-09-07 | 1.2     | DoD verified — accepted (PR #337), CI green on the accepted head | finalise |

---

## Progress Tracking

### Phase 1: Extract containment
- [x] `sandboxEnv()` / `snapshotTree()` exported, `runBlock` calls them
- [x] Classifier proven unchanged
- [x] Extraction mutation-proved

### Phase 2: Probe runner
- [x] `runProbeSpec` with per-case child processes
- [x] Entry-path containment
- [x] Timeout from the spawn budget, not a literal

### Phase 3: Verdicts
- [x] Four verdicts computed by the engine
- [x] Zero cases → unverifiable; declined is its own state
- [x] `SAFE_COMMANDS` refusal recorded with its reason

### Phase 4: Tests
- [x] Four verdicts covered by fixtures
- [x] Sentinel and containment cases
- [x] Mutation proofs

---

## References

- **The prose this replaces**: `shared/resources/finalise-dod-security-prompt.md:145-146` (task.73)
- **The containment being extracted**: `shared/resources/qa-execute-snippets.mjs:1081,1113,1121-1127` (task.67)
- **Why the allow-list must not widen**: [`bug.6`](../../bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md),
  and `bug.3` before it — 26 documented routes past that boundary
- **Collapsed-state precedent**: `task.73`'s tri-state conflation, and `bug.7` one layer up
- **The corpus this consumes**: `task.79`
- **Consumer**: `task.81`

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

### QA Summary

**Final gate:** [`task.80.gate.3.security-probe-engine.yml`](./task.80.gate.3.security-probe-engine.yml) — ✅ **PASS**, 100/100
**QA cycles:** 3 (CONCERNS 60 → CONCERNS 80 → **PASS 100**) · six findings raised, six closed, 0 HIGH throughout
**PR conformance review:** [`task.80.pr-review.1.security-probe-engine.md`](./task.80.pr-review.1.security-probe-engine.md) — ⚠️ CONCERNS (advisory); both medium findings fixed before acceptance

All Definition of Done criteria verified:

✅ **Success Criteria:** 11/11 met, each traced to a named test
✅ **Tests:** `npm run ci:fast` — 2570 tests, 0 failures. Targeted: 276/276 across the eight suites this change touches
✅ **CI:** **SUCCESS** on head `9ab45cba` — the commit being accepted, not an ancestor. The first sample read `PENDING` and finalise **waited** rather than assuming
✅ **Documentation:** `probe-boundary-rule.md` (222 lines, the task's own §4 deliverable); CHANGELOG three Added entries; task doc and PR description both refreshed at Step 5c
✅ **Security:** all seven §9 safety criteria hold, each verified by execution. **Probe mode fired** (this is a boundary deliverable): **39 candidates executed, 1 reproduced** — analysed as a LOW misclassification, not a containment escape; `/etc/passwd` was never read. See the DoD summary for the full analysis
⚠️ **Compliance:** NOT APPLICABLE — no personal data, payment path, UI or health data

**Outstanding follow-ups (non-blocking, recorded not papered over):**

1. **No linked tracker issue** — flagged Important at Step 2 and carried through all three cycles because creating one is consent-gated and this run is autonomous. No DoD criterion requires it. Run `/sync-github-task`.
2. `file://` entry specifiers are silently reinterpreted as relative paths and reported as `entry-not-probeable` rather than `bad-entry` (LOW; cannot leak).
3. `runProbeSpec` falls back to the budget on an unparseable `timeoutMs` rather than reporting it — deliberate and documented.

**Detailed Verification Log:** see [`task.80.dod.1.security-probe-engine.md`](./task.80.dod.1.security-probe-engine.md) for complete evidence, the CI rollup per job, and the probe analysis.

**Task marked as ACCEPTED on:** 2026-09-07

---

## QA Testing Results

**QA Status**: PASS (cycle 3)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-07
**Quality Score**: 100/100 (60 → 80 → 100)
**Gate Decision**: PASS

### QA Reports
- **Cycle 3 (current)**: [task.80.qa.3.security-probe-engine.md](./task.80.qa.3.security-probe-engine.md) · [gate.3](./task.80.gate.3.security-probe-engine.yml)
- **Cycle 2**: [task.80.qa.2.security-probe-engine.md](./task.80.qa.2.security-probe-engine.md) · [gate.2](./task.80.gate.2.security-probe-engine.yml)
- **Cycle 1**: [task.80.qa.1.security-probe-engine.md](./task.80.qa.1.security-probe-engine.md) · [gate.1](./task.80.gate.1.security-probe-engine.yml)

### Test Coverage Summary
- **Tests Executed**: 276 targeted (2570 on the full `ci:fast` run), 0 failures
- **Phases Verified**: 4/4
- **Critical Issues**: **0 open**. Six findings raised across three cycles (0 HIGH throughout), all closed and independently verified — none carried, none waived.
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: **PASS** (was CONCERNS), Maintainability: PASS

### Key Findings — cycle 3 (final)

**Gate PASS, 100/100, no open findings.** Both cycle-2 findings closed, and **both halves of each
verified** — the half that could have been faked as easily as fixed:

- The timeout fallback handles nine bad programmatic values without crashing, **and** `timeoutMs: 1`
  still bites (`executed 0, declined 1`), so it is not swallowing every input.
- The module move left **no stale reference anywhere** — not in code, not as a markdown link a
  checker would follow, not in any bundled `references/` copy. `npm run bundle` reports 0 files
  bundled.

No new findings from a scope aimed at the one thing cycle 3 owed: the blast radius of a move.

### Key Findings — cycle 2

All four gate-1 findings **verified fixed and mutation-proved**. The refute pass found two new MEDIUM
issues, both latent and both aimed at the declared consumer (`task.81`), sharing one shape: *a fix that
satisfies the finding as written while leaving the mechanism reachable by the route the consumer
actually takes.*

- **TASK80-005** — the `--timeout` fix was CLI-only; `runProbeSpec({timeoutMs: NaN})` still throws the
  same uncaught `RangeError`, and `timeoutMs: 0` still disables containment. `task.81` calls the API,
  not the CLI.
- **TASK80-006** — `import … from "./tests/spawn-budget.mjs"` will crash `npm run bundle`: the bundler
  captures the nested sibling then writes to `references/tests/` without creating it. It does not fire
  today only because no skill references this module yet — `task.81` is the change that triggers it.

### Key Findings — cycle 1 (all fixed)

All seven §9 safety criteria hold under **independent** probing — each was tested against running code, not read in the source. The out-of-root rejection was proved to precede `import()` using a fixture whose module top level writes a sentinel (never created), and the no-shell property was proved with a shell-injection input (clean rejection, no artifact). The Phase 1 extraction is behaviour-preserving against 105 tests including the `bug.3` replay eval.

Four MEDIUM findings, all in the engine's **periphery** rather than its verdict logic:

- **TASK80-001** — `--timeout` unvalidated: `NaN` reaches `spawnSync` and throws an uncaught `RangeError`; `--timeout 0` silently disables the per-case timeout.
- **TASK80-002** — `escapes` is `undefined` on four of five result paths; the declared consumer (`task.81`) would throw.
- **TASK80-003** — a sandbox escape is invisible in default CLI output.
- **TASK80-004** — the parity block's comment claims broader coverage than it pins: adding only `rm` to `SAFE_COMMANDS` is a genuine fail-open that leaves 105/105 tests green.

---

## QA Fix Cycle 2 — 2026-09-07

Both cycle-2 findings fixed and mutation-proved. Status stays `Ready for Review`.

| Finding | Fix | Mutation-proven |
| --- | --- | --- |
| **TASK80-005** timeout validated at the CLI only | `readInt(timeoutMs, 1)` moved to where `perCaseTimeout` resolves, so validation sits at the boundary the caller actually crosses. An unparseable value **falls back to the budget** rather than throwing — the function's contract is that it returns a verdict, and making it throw for a bad argument would make an out-of-range timeout louder than an unimportable entry point, which is backwards. The CLI keeps its `return 2` so a bad *flag* still reports as an argument error. | **yes** — reverting to `timeoutMs ?? budget.timeoutMs` reds the new test with the original `RangeError` |
| **TASK80-006** production module importing from `tests/` | `shared/resources/tests/spawn-budget.mjs` **moved** to `shared/resources/spawn-budget.mjs`; all 7 import sites updated (4 sibling test suites, 1 eval, 3 references in `test-harness-concurrency.test.js`, and the probe engine). **No shim** — a re-exporting shim would leave two paths for one module, which is the same smell in a different place. | **yes** (bundler half) |
| **TASK80-006, class fix** | `dst.parent.mkdir(parents=True, exist_ok=True)` in `bundle_skill.py`, plus a regression test in `tests/bundle-mjs.test.js` (which *is* in the `npm test` glob). | **yes** — removing the mkdir reds the new test |

### Why the move rather than a shim

The QA finding offered either. A shim keeps every existing import working with no edits, but it also
keeps `shared/resources/tests/spawn-budget.mjs` in existence — so anything importing through that
path would still hand the bundler a nested dep, and the inverted dependency would still be one
`import` away. Seven call sites is a small enough cost to remove the path entirely.

### The advisory, decided rather than deferred

`escapes` accumulates one entry per (case, path) and is **not** de-duplicated. The question a reader
asks of an escape is *"which inputs caused a write outside the sandbox?"* — a probe that escapes on
one hostile input and one that escapes on all twelve are different findings, and collapsing to a path
set renders them identically. A consumer wanting the path set can take
`new Set(escapes.map((e) => e.path))`; that direction is lossless, the other is not. Recorded in a
comment at the accumulation site.

**Fast gate**: `npm run ci:fast` green — **2570 tests, 0 failures**. `npm run bundle`: clean no-op.

---

## QA Fix Cycle 1 — 2026-09-07

All four MEDIUM findings from gate 1 fixed; both advisory cleanups taken. Status stays
`Ready for Review` — `qa-fix` hands work back to QA.

| Finding | Fix | Mutation-proven |
| --- | --- | --- |
| **TASK80-001** `--timeout` unvalidated | `main()` now validates with `readInt(value, 1)`, **imported from `spawn-budget.mjs`** rather than restated — that module's own comment already documents the `timeout: 0` hazard. Returns exit 2 on a non-integer or `< 1`. | **yes** — reverting to bare `Number()` reds the new test |
| **TASK80-002** `escapes` undefined on 4/5 paths | `escapes: []` added to the `base` object; a new test compares **key sets** across all five result paths, which is what catches a missing key. | **yes** — removing it from `base` reds |
| **TASK80-003** escape invisible in default output | Summary line appends `ESCAPED n`; **an escape now forces a non-zero exit even on `engages`**, and `probe-boundary-rule.md` §6 records the rule with its reason. | **yes** — but only after the test was rebuilt; see below |
| **TASK80-004** parity claim overreached | Comment narrowed to what it actually pins, plus a new test asserting five destructive commands with **no deny-pattern** fail closed via the allow-list. | **yes** — adding `"rm"` to `SAFE_COMMANDS` reds it, and only it |

### Two things worth recording, because both were found by mutation rather than by review

**The first version of the TASK80-003 test was vacuous.** It used the existing `escaping-probe`
fixture, which rejects every input and therefore scores `unverifiable` — exiting 1 whether or not
the escape guard exists. Removing the guard left the suite green. A new fixture
(`engaging-but-escaping.mjs`) earns `engages` *and* escapes, so the escape is the only thing that
can make the exit non-zero. This is exactly the failure mutation-proving exists to catch, and it
was in a test written to close a QA finding.

**A repository guard caught a latent bug the QA cycle had not found.** `stdout-drain-on-exit.test.mjs`
flagged the child runner: it called `process.exit(0)` immediately after writing its JSON payload,
which truncates the write at ~64KB when the caller pipes the process — and this caller *always*
pipes, since `spawnSync` captures stdout. A truncated payload would have surfaced as "no result
payload from child", i.e. **a large probe result would have silently become a declined one**. The
runner now returns from every arm and sets `process.exitCode`. Recorded as a new finding of this
cycle rather than fixed silently.

### Advisory cleanups taken

- The `COMMAND_RUNNERS` assertion is kept but re-justified: that set makes the classifier **recurse
  into** a command's argument, so membership is *stricter*, not laxer — which is why `eval` and
  `exec` are legitimately on it. The assertion now states the correctness reason rather than
  implying a second allow-list.
- `OUTCOMES` stays exported, documented as deliberate public vocabulary alongside `VERDICTS`: a
  consumer branching on an outcome should import the strings rather than retype them.

**Fast gate after fixes**: `npm run ci:fast` green — **2568 tests, 0 failures**.

---

## Implementation Record

**Started / Completed**: 2026-09-07 (single develop pass, no iterations)
**Implemented by**: `/develop` via `/develop-task` Step 3/8

### Approach, phase by phase

**Phase 1 — extract the containment, prove nothing moved.** `sandboxEnv()` lifted out of `runBlock`
(it was inlined at `:1121-1127`) and exported; `export` added to `snapshotTree()`, which was
module-private at `:1081` despite the task's original claim that it was already exported. `runBlock`
now calls both. The classifier — `SAFE_COMMANDS`, `COMMAND_RUNNERS`, `DENY_PATTERNS`,
`classifyBlock` — was not touched.

Eight parity tests pin the extraction: the export shape, `QA-1…QA-17` classification (all 17, not
the 14 the task originally named — three routes were added after it was authored), the six-key
environment allow-list, binding precedence, `PWD` defaulting, and `snapshotTree`'s `skipDir`
pruning. **Mutation proof**: reverting `sandboxEnv` to spread `process.env` turned two tests red —
the new allow-list test and the pre-existing `QA-12: snippets do not inherit the parent environment`,
which is the stronger signal, since it confirms the extraction is pinned by a test that predates it.

**Phase 2 — the probe runner.** `runProbeSpec({sink, entry, cases, timeoutMs, repoRoot})`. Each case
runs in its own child process (`node --input-type=module -e RUNNER`), so a hang, throw or
`process.exit` is contained and attributable to one case. `RUNNER` is a fixed string with nothing
interpolated into it; the entry path, export name and input all arrive as **JSON on stdin**. That is
the property that makes an interpreter on `SAFE_COMMANDS` unnecessary, and it is tested directly —
a case whose input is `"; touch /tmp/probe-pwned-$$; echo "` produces a clean rejection and no file.

The child's answer is bracketed with a sentinel and the parent extracts the **last** complete
payload, because a module under probe that logs to stdout is ordinary and must not be misread as a
harness failure. Per-case timeout comes from `spawnBudget("PROBE")`, never a literal —
`tests/test-harness-concurrency.test.js:403` fails the build on a hardcoded one.

**Phase 3 — verdicts.** The design decision the task states in prose but does not mechanise: the
corpus `correct` field is human-readable prose, so "handled as `correct` says" is derived from
`direction` instead. hostile → should reject; legitimate → should accept. A control rejects by
throwing *or* by returning `null`/`undefined`/`false`, the non-throwing rejection shape a validator
commonly uses.

Two branches that are not obvious and are documented in `probe-boundary-rule.md` §3:

- `present-but-inert` = a hostile case reproduced **while others were rejected**. A control
  demonstrably exists and demonstrably let one through — worse than `absent` because it has already
  been reviewed and believed.
- **`engages` additionally requires ≥1 legitimate case to pass.** Without that clause, a stub that
  throws unconditionally rejects every hostile case and scores a clean probe — the same failure as a
  self-reported `probes_executed: 0` in different clothes. It scores `unverifiable` /
  `rejects-every-input` instead.

**Phase 4 — tests and mutation proofs.** 18 tests, 6 fixtures (one per verdict, plus an escaping
probe and a non-callable export). All four required mutation proofs run and each reds exactly the
test that guards it:

| Mutation | Tests red | Restored |
| --- | --- | --- |
| `sandboxEnv` spreads `process.env` | 2 (incl. pre-existing QA-12) | ✅ |
| `present-but-inert` branch removed | 1 | ✅ |
| zero cases returns `engages` | 1 | ✅ |
| `declined` list emptied | 4 | ✅ |

### Testing results

- `shared/resources/tests/security-probe.test.mjs` — **18/18 pass**
- `shared/resources/tests/qa-execute-snippets.test.mjs` — **97/97 pass** (was 89; +8 parity)
- CLI smoke against the live 12-case `url-authority` corpus: `engages` → exit 0, `absent` → exit 1
  (9 reproduced), `present-but-inert` → exit 1 (6 reproduced), missing `--sink` → exit 2
- No `/tmp/probe-pwned-*` artifacts — inputs never reached a shell

### Deferred work

None deferred from this task's scope. Out-of-scope items remain with their owners: the skill that
calls this engine is `task.81`, the gate-schema change is `task.82`.

### Notes for the reviewer

`engaging-control.mjs` scores `passed 11` of 12 against the real corpus, not 12 — one legitimate
corpus case is over-blocked by the fixture's deliberately strict regex. The verdict is still
`engages`, which is correct: over-blocking is reported in `overblocked[]` and does not by itself
negate a control that rejects every hostile input and accepts some legitimate ones. The fixture is a
test double, not a reference implementation.

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
