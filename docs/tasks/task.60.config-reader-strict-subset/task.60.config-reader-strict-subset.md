---
id: task.60
title: '[Task 60] Give the config reader''s awk tier a grammar, or make it refuse'
type: task
description: 'Closes LIMIT-1 from task.51 — the no-dependency awk tier of read-config.sh approximates YAML with anchored regexes, so an access level written with a merge key, a quoted key, or a mapping-valued child reads as absent and resolves to the permissive default at exit 0. That tier is the DEFAULT on a stock macOS host, where /usr/bin/python3 ships without pyyaml. Rather than close one more spelling — six QA cycles each did that and each left the siblings open — tier 2 is narrowed to a documented strict subset and made to REFUSE anything outside it. Every silent escalation becomes a loud, correct refusal. Prerequisite of task.52, which is the first task to gate a real mutation on ACCESS_TRACKER.'
tags: [restricted-access, config, parser, fail-closed, security]
category: infrastructure
status: planned
priority: High
risk_level: medium
created: 2026-08-18
updated: 2026-08-18
estimated_effort_hours: 8
github_issue: 247
---

# [Task 60] Give the config reader's awk tier a grammar, or make it refuse

**Status:** Planned

**Task File**: [task.60.config-reader-strict-subset.md](./task.60.config-reader-strict-subset.md)

**GitHub Issue**: [#247](https://github.com/Gamaroff/agent-skills/issues/247)

Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) (accepted). **Blocks [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)** — see Motivation for why that ordering is not negotiable.

---

## 1. Overview

`shared/resources/read-config.sh` reads `skills-config.yaml` through two tiers: tier 1 is
`python3` + `pyyaml`, a real parser; tier 2 is `awk`, a set of anchored line regexes with no
grammar. The two tiers disagree about legal YAML, and they disagree in the permissive direction —
an `access:` level tier 1 reads as `manual`, tier 2 reads as *absent*, and absent means `full`.

This task stops tier 2 guessing. It defines a **documented strict subset** of YAML that tier 2
accepts, and makes tier 2 **refuse** — loudly, non-zero — anything outside it, instead of returning
a confident wrong answer. It also carries the parse-failure *reason* across the reader's record
format, so a refusal can name the offending line.

**Scope**: `shared/resources/read-config.sh` and its callers' expectations; the tier-2 half of
`resolve-platform.sh`; `tracker-access.test.sh`; the two documents that currently describe the
limit.

**Key deliverables**

1. A written, testable definition of the tier-2 subset, in `platform-detection.md`.
2. Tier 2 refuses anything outside that subset rather than reading it as absent.
3. A test suite that asserts the **resolved value** under both tiers for every shape, with the
   `§41 KNOWN LIMIT` block deleted rather than repaired.

**Expected outcome**: no legal spelling of `access:` resolves more permissive than declared, on
either tier. Where tier 2 cannot be sure, the run halts with a message naming what it could not read.

---

## 2. Motivation

### Current problems

1. **Four legal spellings of `access:` silently escalate on tier 2.** A merge key or anchor
   (`access:` / `<<: *defaults`), a quoted key (`"access":`), and a mapping-valued child
   (`access:` → `tracker:` → `mode: manual` — an ordinary nesting typo) all read as *absent*, and
   absent means `full`. The file is well-formed, the exit status is 0, and stderr is empty.

2. **Tier 2 is the default tier for a consumer, not a rare fallback.** `/usr/bin/python3` on a stock
   macOS host ships **without** `pyyaml`. This repo's own developers resolve `python3` to a Homebrew
   build that has it. So the tier consumers actually run is the one the project least exercises —
   which is exactly how four HIGH defects survived to task.51's sixth QA cycle.

3. **Patching spellings does not converge.** Task.51 ran seven QA cycles. Six of them closed one
   spelling each — the block form, then the flow form, then the multi-line flow form, then the
   anchored form — and each left its siblings open. There is no finite list of spellings, because
   the thing being approximated is a grammar. Cycle 7 stopped patching and recorded the limit
   instead; this task is the recorded work.

4. **A refusal cannot say why.** Every parse exception collapses to a single `__ERR__` sentinel, so
   the operator is told "could not be parsed" and left to find the offending line themselves. The
   current mitigation — a halt message enumerating the shapes the reader rejects — is a workaround.

### Why now, and not after task.52

Today the escalation is inert: **nothing consumes `ACCESS_TRACKER`.** The value is vocabulary, not a
control. That is the only reason task.51 was accepted with this open.

[Task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)
and its successors are what change that. The moment a skill gates a mutation on the resolved value, a
wrong value stops being cosmetic and becomes an **unintended write to someone's tracker** — by an
agent the operator believed they had restricted. The whole task.51–58 sequence exists to make
restricted access real; shipping it on a reader that silently reports `full` would defeat it at the
first step.

### Benefits

- **Removes a silent-escalation class**, not an instance. The failure mode becomes "refuses to run",
  which is loud, correct, and fixable by the operator.
- **Unblocks task.52** on a foundation that means what it says.
- **Keeps zero-dependency operation.** A consumer without `pyyaml` still runs; they are simply held
  to a documented config subset, and told plainly when they leave it.
- **Makes the two tiers agree by construction** — not by enumerating the cases where they currently
  differ, which is the approach that failed six times.
- **A refusal names its cause**, cutting the operator's diagnosis from "read the whole file" to
  "look at line N".

---

## 3. Technical Background

### Current architecture

```
resolve-platform.sh
  └── read-config.sh
        ├── tier 1: python3 + pyyaml   ← a real parser; authoritative when it runs
        └── tier 2: awk                ← anchored regexes; used when pyyaml is absent
```

Only six values are ever read:

| Reader | Key |
| --- | --- |
| `read_config_key` | `tracker` |
| `read_config_key` | `vcs` |
| `read_nested_config_key` | `prd.prdShardedLocation` |
| `read_nested_config_key` | `architecture.architectureShardedLocation` |
| `read_nested_config_key_strict` | `access.tracker` |
| `read_nested_config_key_strict` | `access.vcs` |

**That small surface is what makes this tractable.** Tier 2 does not need to parse YAML. It needs to
recognise six keys written in a documented way, and refuse everything else.

Tier 2 today anchors on literal patterns — `^access:` at column 0, then `^[[:space:]]+tracker:`
beneath it. Anything else (a merge key, a quoted key, a deeper nesting, a `?`-form explicit key)
matches nothing, and *matching nothing is reported as "not configured"*. That conflation — **"I did
not find it" reported as "it is not there"** — is the entire defect. Every specific escalation in
task.51's gate 6 and gate 7 is an instance of it.

### Target architecture

```
read-config.sh
  ├── tier 1: python3 + pyyaml            ← unchanged; authoritative
  └── tier 2: awk, STRICT SUBSET
        ├── recognises: the documented subset  → returns the value
        ├── recognises: key provably absent    → returns absent
        └── anything else                      → REFUSES (non-zero, names the line)
```

Tier 2 gains a third answer. Today it has two — *value* and *absent* — and everything it cannot
read falls into *absent*, which is the permissive one. The fix is a **`__UNSUPPORTED__` outcome** for
"this file contains something I am not able to read correctly", distinct from "this key is not set".

The subset must at minimum express what a real consumer writes; this repo's own `skills-config.yaml`
is the reference case. Anchors, merge keys, quoted keys, flow mappings spanning lines, explicit
`?`-form keys and tags are **outside** the subset — legal YAML that tier 2 will refuse rather than
misread. Tier 1 continues to accept all of them, so a consumer who needs them installs `pyyaml`.

> **Decision Flow** — a diagram is not warranted here; the three-outcome table above is the whole
> logic and a flowchart would restate it.

---

## 4. Scope

### In scope

- ✅ Define the tier-2 strict subset and document it in `platform-detection.md`
- ✅ Tier-2 readers refuse (rather than return absent) on anything outside the subset
- ✅ Propagate the refusal through `resolve-platform.sh` so a guarded call site halts
- ✅ Carry the parse-failure **reason** across the reader's record format (LIMIT-2)
- ✅ Rewrite the tier coverage in `tracker-access.test.sh` to assert **resolved values** under both
      tiers; delete the `§41 KNOWN LIMIT` block
- ✅ Remove the *Known limit* section from `platform-detection.md` and the canonical-block-form
      warning from `configuration.md`'s `access.tracker` row, once genuinely closed
- ✅ Update task.51's *Known limits* section to record LIMIT-1 and LIMIT-2 as closed here

### Out of scope

- ❌ Changing tier 1 (`pyyaml`) behaviour — it is a real parser and is not the problem
- ❌ Adding a `pyyaml` dependency (that was option 1; see Decisions)
- ❌ Vendoring a YAML parser (option 2; see Decisions)
- ❌ Anything that consumes `ACCESS_TRACKER` — that is task.52 onward
- ❌ Widening the six-key surface, or supporting new config keys
- ❌ `gawk`/`mawk` portability beyond adding them to the fixture matrix

---

## 5. Breaking Changes

### BC-1 — A config outside the subset now halts on a host without `pyyaml`

**Before**: a config using an anchor, merge key or quoted key was read as *absent* on tier 2 and the
run continued with defaults — silently, and for `access:` that meant `full`.

**After**: tier 2 refuses. With this repo's `|| exit 1` guards on all 20 resolver sourcing lines,
that halts the run.

```yaml
# Before: tier 2 → ACCESS_TRACKER=full, exit 0, no output
# After:  tier 2 → refusal naming the line; exit 1
defaults: &d
  tracker: manual
access:
  <<: *d
```

**Affected**: any consumer on a host without `pyyaml` whose config uses YAML outside the subset.
Unknown in number; this repo's own config is inside the subset.

**Migration path** — the refusal message must state both, concretely:

1. Rewrite the config in the documented subset (the message names the line and the construct), **or**
2. `pip install pyyaml` — tier 1 accepts full YAML.

> This is a breaking change **in the correct direction**: it converts a silent wrong answer into a
> loud refusal with two documented fixes. It must still be announced as breaking, because a config
> that worked yesterday can halt a run today.

### BC-2 — `__ERR__` gains structure

Internal to `read-config.sh` and its two callers. The record format grows a reason field. No
consumer outside `shared/resources/` reads these sentinels — confirmed by the six-key table in §3 —
but `resolve-paths.sh` must keep its contract of **never failing**, so it discards the reason and
falls back to defaults exactly as today.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.60.plan.config-reader-strict-subset.md](./task.60.plan.config-reader-strict-subset.md)

### Phase 1 — Define and document the subset (Risk: Low)

**Files**: `shared/resources/platform-detection.md`, `docs/reference/configuration.md`

- [ ] Enumerate the constructs tier 2 accepts, as a table with an example of each
- [ ] Enumerate the constructs it refuses, with the same treatment
- [ ] Validate the subset against this repo's `skills-config.yaml` and every fixture in
      `tracker-access.test.sh` — if a real config falls outside, the subset is wrong, not the config
- [ ] State the two migration paths (rewrite, or install `pyyaml`) in the doc, in those words

**Dependency**: none. This phase is the specification the rest is tested against, so it lands first.

### Phase 2 — Give tier 2 a third answer (Risk: Medium)

**Files**: `shared/resources/read-config.sh`

- [ ] Add an `__UNSUPPORTED__` outcome, distinct from absent and from a value
- [ ] Tier-2 scan classifies each line: in-subset, ignorable (comment/blank), or out-of-subset
- [ ] Any out-of-subset construct anywhere in the file yields `__UNSUPPORTED__` — the blast radius is
      the file, because a construct this reader cannot parse may change what a later line means
- [ ] Carry the offending line number and a short construct name alongside the outcome
- [ ] Preserve tier 1 as authoritative — when it runs, tier 2 is not consulted (unchanged)

**Dependency**: Phase 1.

### Phase 3 — Propagate the refusal (Risk: Medium)

**Files**: `shared/resources/resolve-platform.sh`

- [ ] `__UNSUPPORTED__` becomes a halt naming the line, the construct, and both migration paths
- [ ] Fold the existing `__UNREADABLE__` multi-line-flow-map branch into the new mechanism — it is
      the same idea, added narrowly during task.51
- [ ] `resolve-paths.sh` keeps its never-fail contract: it discards the reason and uses defaults
- [ ] Re-check the fail-closed branch and the `access:` opt-in probe against the new outcome — with
      tier 2 refusing, the probe's job may shrink; **do not delete it without a test proving it**

**Dependency**: Phase 2.

### Phase 4 — Carry the parse-failure reason (Risk: Low)

**Files**: `shared/resources/read-config.sh`

- [ ] Extend the typed US/RS record format to carry a reason with the `__ERR__` signal
- [ ] Tier 1 reports the `yaml` exception's line and message instead of a bare sentinel
- [ ] Halt messages name the cause; retire the enumerated-shapes workaround added in task.51 cycle 7
- [ ] The reason is DATA and travels the same hardened transport — a reason containing a separator
      or NUL must be refused, not injected

**Dependency**: Phase 2. Independently revertable if it overruns.

### Phase 5 — Make the suite hold it (Risk: Medium)

**Files**: `shared/resources/tracker-access.test.sh`

- [ ] Assert the **resolved value** under both tiers for every shape — never the exit code alone
- [ ] Delete the `§41 KNOWN LIMIT` block (currently ~lines 1024–1055). Its own comment says a failure
      there means the limit has been fixed; repairing it back would be the wrong reading
- [ ] Add refusal assertions: every out-of-subset construct halts, on both shells
- [ ] Add acceptance assertions: every in-subset construct resolves identically on both tiers
- [ ] Mutation-witness every new invariant — see Testing Strategy
- [ ] Add `gawk`/`mawk` to the fixture matrix (only macOS BWK awk has been exercised)

**Dependency**: Phases 2–4.

### Phase 6 — Retire the documentation of the limit (Risk: Low)

**Files**: `shared/resources/platform-detection.md`, `docs/reference/configuration.md`,
`docs/tasks/task.51.../task.51.access-mode-config-and-resolver.md`

- [ ] Remove the *Known limit* section from `platform-detection.md`, replaced by the subset spec
- [ ] Remove the canonical-block-form warning from `configuration.md`'s `access.tracker` row
- [ ] Mark LIMIT-1 and LIMIT-2 closed in task.51's *Known limits*, linking here
- [ ] `npm run bundle` and commit the regenerated `skills/*/references/` trees

**Dependency**: Phase 5 green. **Do this last** — documentation claiming the limit is closed must not
land before the tests prove it.

---

## 7. Files Summary

### Core implementation

1. ✅ `shared/resources/read-config.sh` — the `__UNSUPPORTED__` outcome, the subset scan, the reason field
2. ✅ `shared/resources/resolve-platform.sh` — refusal handling, halt message, `__UNREADABLE__` fold-in

### Tests

3. ✅ `shared/resources/tracker-access.test.sh` — per-tier value assertions, refusal/acceptance suites, `§41` deleted
4. ✅ `shared/resources/resolve-platform.test.sh` — verify the never-fail path contract still holds

### Documentation

5. ✅ `shared/resources/platform-detection.md` — subset spec replaces the *Known limit* section
6. ✅ `docs/reference/configuration.md` — `access.tracker` row loses its workaround warning
7. ✅ `docs/tasks/task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md` — LIMIT-1/2 marked closed

### Generated (do not hand-edit)

8. ✅ `skills/*/references/read-config.sh`, `resolve-platform.sh`, `platform-detection.md` — via `npm run bundle`

### Deleted

9. ❌ `tracker-access.test.sh` `§41 KNOWN LIMIT` block (~lines 1024–1055)

---

## 8. Testing Strategy

### The failure mode to design against

Task.51's gate 6 found **11 of 35 mutations surviving** behind a green 166/166 suite. Four HIGH
defects sat behind it, and they sat there specifically because **the suite's value assertions forced
the python tier** — so every `[python]` label was unproven and every escalation on the awk tier was
invisible. The suite reported success in the same words whether it was testing everything or nothing.

Every rule below exists because of that.

### Unit / fixture tests

- **Assert resolved VALUES under every tier.** An exit-code assertion is not sufficient and never
  was: the escalating configs in task.51 all returned 0. Where a test forces a tier, the reason must
  be written next to it.
- **Both shells.** `bash` and `zsh` — macOS logins are zsh, and task.51's first cycle shipped a
  bash-only `${!var}` that broke every call site.
- **A genuine awk-only host**, not a forced tier: shim `python3` and `python` to exit 127 on `PATH`.
  Forcing `AGENT_SKILLS_CONFIG_TIER=awk` tests the branch; the shim tests what a consumer runs.
- **Acceptance matrix**: every in-subset construct resolves identically on both tiers.
- **Refusal matrix**: every out-of-subset construct halts on tier 2, with a message naming the line.
- **Regression matrix**: this repo's own `skills-config.yaml` and every existing fixture keep working.

### Mutation testing (required, not optional)

Every new invariant must be **watched failing**. For each: revert the guard in isolation, run the
full suite, record the failure count. An invariant with no witness is not tested, however many
assertions surround it. Specifically watch:

- Deleting the `__UNSUPPORTED__` branch (must go red, not fall back to absent)
- Narrowing each subset regex (must go red)
- Removing a tier-forcing guard (must go red — this one survived at task.51 gate 6)
- Widening the subset to accept a construct the spec excludes (must go red)

### Consumer / regression tests

- `resolve-paths.sh` never fails — `PRD_ROOT` / `ARCH_ROOT` resolve to defaults on a refused config
- `npm test` (1287 node + 7 shell suites), `npm run validate:all`, `npm run bundle` idempotent
- The 20 call-site guards still halt end-to-end through a real guarded caller, not just by return code

---

## 9. Success Criteria

### Functional

- [ ] No legal spelling of `access:` resolves **more permissive than declared** on either tier — it
      either resolves correctly or the tier refuses
- [ ] Every construct in the documented subset resolves **identically** on both tiers
- [ ] Every construct outside it produces a refusal naming the line and the construct
- [ ] A refused config halts a run through a real guarded call site (verified end-to-end)
- [ ] `resolve-paths.sh` still never fails — defaults on a refused config
- [ ] The repo's own `skills-config.yaml` is inside the subset and unaffected

### Performance

- [ ] No additional process spawns per `source` — the tier-2 scan is one `awk` pass
- [ ] Source time unchanged within noise against the task.51 baseline

### Code quality

- [ ] `tracker-access.test.sh` `§41` **deleted**, not repaired
- [ ] Every new invariant mutation-witnessed, with the failure count recorded
- [ ] Zero surviving mutations in the audit
- [ ] `npm test`, `npm run validate:all` green; Prettier clean; `npm run bundle` idempotent
- [ ] Verified under `bash` and `zsh`, and on a genuine awk-only host

### Migration

- [ ] Subset spec published in `platform-detection.md` with accepted/refused examples
- [ ] The *Known limit* section and the `configuration.md` workaround warning are **removed**
- [ ] Task.51's *Known limits* marks LIMIT-1 and LIMIT-2 closed, linking here
- [ ] BC-1's two migration paths appear in the refusal message itself, not only in the docs

---

## 10. Risk Assessment

### HIGH

**R-1 — The subset is narrower than a real consumer's config.**
*Probability*: Medium · *Impact*: High — a config that worked yesterday halts today.
*Mitigation*: Phase 1 validates the subset against this repo's own config and every existing fixture
**before** any code changes. If a real-world shape falls outside, widen the subset — that is a
specification error, not a config error. The refusal message must always name both migration paths.
*Rollback*: revert Phases 2–3; tier 2 returns to today's behaviour (with LIMIT-1 reopened).

**R-2 — Repeating task.51's pattern: the fix introduces its own defect.**
*Probability*: Medium — it happened in six of seven cycles on this exact file.
*Impact*: High — a new silent escalation is worse than the documented one being replaced.
*Mitigation*: mutation-witness every invariant before believing the suite; assert resolved values
under both tiers; adversarially probe each fix against the parent commit before committing. Two of
task.51's cycle-7 defects were caught precisely this way.

### MEDIUM

**R-3 — "Refuse everything unknown" over-triggers.** A construct in a section this reader never
consumes (a `jira:` sub-map, a comment-heavy block) trips the refusal.
*Mitigation*: the subset must cover the whole file, not only the six keys — Phase 1 validates against
real configs. Where a construct is genuinely irrelevant and unambiguous, it may be *ignorable* rather
than refused; that must be a written decision with a test, not an accident.

**R-4 — The reason field re-opens the transport.** Task.51 spent three QA cycles on record forgery
via in-band signalling.
*Mitigation*: the reason is DATA on the existing typed US/RS transport with the kind byte, and is
refused if it contains a separator or NUL — the same rule as any other payload. Phase 4 is
independently revertable.

### LOW

**R-5 — `gawk`/`mawk` differ from macOS BWK awk** (notably `[[:space:]]` and `\r`).
*Mitigation*: both added to the fixture matrix in Phase 5. Untested today, so this is a reduction in
risk rather than a new one.

**R-6 — Documentation lands ahead of the code.**
*Mitigation*: Phase 6 is last and gated on Phase 5 green.

---

## 11. Rollback Plan

### Immediate rollback (< 1 hour)

**Triggers**

- A consumer reports a halt on a config that is inside the documented subset
- `resolve-paths.sh` fails for any reason (it must never fail)
- Any escalation found post-merge — a config resolving more permissive than declared

**Steps**

1. `git revert <sha>` for the Phase 2–3 commits
2. `npm run bundle` and commit the regenerated references
3. Verify: `npm test` green, and `source shared/resources/resolve-platform.sh` returns 0 on the
   repo's own `skills-config.yaml`
4. Reopen LIMIT-1 in task.51's *Known limits* and re-add the `§41` block

**Validation**: the reverted state is task.51's accepted state, which is green and documented — a
known-good resting point rather than an unknown one.

### Partial rollback (1–2 hours)

Phase 4 (the reason field) is independently revertable and touches only diagnostics. Revert it alone
if the transport work overruns; Phases 1–3 and 5 stand without it, with the enumerated-shapes
message from task.51 cycle 7 retained as the mitigation.

### Forward fix

Preferred when the subset proves too narrow (R-1): **widen the subset and add the fixture**, rather
than reverting. The specification is the thing that was wrong. Forward-fix only when a real config
demonstrates the gap — not on speculation, which is how the six-cycle patching loop started.

### Rollback triggers — summary

| Severity | Condition | Action |
| --- | --- | --- |
| Critical | Any silent escalation, or `resolve-paths.sh` failing | Immediate rollback |
| Critical | Halt on an in-subset config | Immediate rollback |
| Non-critical | Halt on an out-of-subset config a real consumer needs | Forward fix — widen the subset |
| Non-critical | Refusal message unclear or missing a migration path | Forward fix |

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-08-18 | 1.0     | Initial draft | create-task |

---

## Progress Tracking

### Phase 1: Define and document the subset
- [ ] Enumerate accepted constructs, with an example of each
- [ ] Enumerate refused constructs, with an example of each
- [ ] Validate against the repo's own config and every existing fixture
- [ ] State both migration paths in the doc

### Phase 2: Give tier 2 a third answer
- [ ] `__UNSUPPORTED__` outcome, distinct from absent
- [ ] Line classifier: in-subset / ignorable / out-of-subset
- [ ] Carry line number and construct name
- [ ] Tier 1 remains authoritative

### Phase 3: Propagate the refusal
- [ ] Halt naming line, construct and both migration paths
- [ ] Fold in the `__UNREADABLE__` branch
- [ ] `resolve-paths.sh` never-fail contract preserved
- [ ] Re-check the fail-closed branch and the `access:` opt-in probe

### Phase 4: Carry the parse-failure reason
- [ ] Record format carries a reason
- [ ] Tier 1 reports the exception's line and message
- [ ] Retire the enumerated-shapes workaround
- [ ] Reason travels as hardened DATA

### Phase 5: Make the suite hold it
- [ ] Per-tier value assertions everywhere
- [ ] `§41 KNOWN LIMIT` deleted
- [ ] Refusal matrix
- [ ] Acceptance matrix
- [ ] Every invariant mutation-witnessed
- [ ] `gawk`/`mawk` in the fixture matrix

### Phase 6: Retire the documentation of the limit
- [ ] `platform-detection.md` — subset spec replaces *Known limit*
- [ ] `configuration.md` — workaround warning removed
- [ ] Task.51 *Known limits* marked closed
- [ ] `npm run bundle`; regenerated references committed

---

## References

- [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) — introduced `access:` and the two-tier reader; **records LIMIT-1 and LIMIT-2 under *Known limits***
- [task.51 gate 6](../task.51.access-mode-config-and-resolver/task.51.gate.6.access-mode-config-and-resolver.yml) — the independent adversarial pass: BUG-18, BUG-26, BUG-27 are this task's subject matter; BUG-28 is the mutation audit
- [task.51 gate 7](../task.51.access-mode-config-and-resolver/task.51.gate.7.access-mode-config-and-resolver.yml) — LIMIT-1 and LIMIT-2 as deferred, with the acceptance condition naming this work
- [task.51 QA report 7](../task.51.access-mode-config-and-resolver/task.51.qa.7.access-mode-config-and-resolver.md) — why patching spellings does not converge
- [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md) — **blocked by this task**; first consumer of `ACCESS_TRACKER`
- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — canonical resolver spec; currently carries the *Known limit* section
- [`docs/reference/configuration.md`](../../reference/configuration.md) — config schema; `access.tracker` row carries the workaround warning

---

## Notes

**On the title.** "Or make it refuse" is the chosen half. Options 1 (require `pyyaml`) and 2 (vendor a
subset parser) were considered and rejected — see Decisions below. The title keeps both halves because
the *principle* is the deliverable: a reader that cannot parse something must say so, not guess.

### Decisions

| Option | Verdict | Why |
| --- | --- | --- |
| 1. Require `pyyaml`, fail without it | Rejected | Smallest change and removes the class permanently, but imposes a hard dependency on every consumer host. On a stock macOS host that means installing `pyyaml` before any skill runs at all — too high a toll for a config reader, and it would break existing working installs on first upgrade. |
| 2. Vendor a minimal pure-python YAML parser | Rejected | Keeps zero-dependency operation and gives a real grammar, but a hand-written parser is a large new attack surface in the one file most hardened against hostile input, and its own defect rate is unknown. Reconsider only if the subset proves unworkably narrow. |
| **3. Strict subset + refuse** | **Chosen** | Cheapest of the three, keeps zero-dependency operation, and converts every silent escalation into a loud, correct refusal. The six-key surface (§3) is small enough that a documented subset is realistic. Its risk is a subset that is too narrow — mitigated by validating against real configs in Phase 1, before any code changes. |

**The principle worth carrying past this task**: tier 2's defect was never a missing regex. It was
reporting *"I did not find it"* as *"it is not there"*. Any reader that cannot distinguish those two
will eventually resolve a restriction to a permission.
