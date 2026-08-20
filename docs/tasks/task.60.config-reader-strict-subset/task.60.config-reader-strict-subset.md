---
id: task.60
title: '[Task 60] Give the config reader''s awk tier a grammar, or make it refuse'
type: task
description: 'Closes LIMIT-1 from task.51 — the no-dependency awk tier of read-config.sh approximates YAML with anchored regexes, so an access level written with a merge key, a quoted key, or a mapping-valued child reads as absent and resolves to the permissive default at exit 0. That tier is the DEFAULT on a stock macOS host, where /usr/bin/python3 ships without pyyaml. Rather than close one more spelling — six QA cycles each did that and each left the siblings open — tier 2 is narrowed to a documented strict subset and made to REFUSE anything outside it. Every silent escalation becomes a loud, correct refusal. Prerequisite of task.52, which is the first task to gate a real mutation on ACCESS_TRACKER.'
tags: [restricted-access, config, parser, fail-closed, security]
category: infrastructure
status: accepted
priority: High
risk_level: medium
created: 2026-08-18
updated: 2026-08-18
completed_date: 2026-08-18
estimated_effort_hours: 8
github_issue: 247
pr_number: 248
---

# [Task 60] Give the config reader's awk tier a grammar, or make it refuse

**Status:** Accepted

**Review**: ✅ All Critical and Important recommendations from `task.60.review.1.config-reader-strict-subset.md` implemented 2026-08-18

**Task File**: [task.60.config-reader-strict-subset.md](./task.60.config-reader-strict-subset.md)

**GitHub Issue**: [#247](https://github.com/Gamaroff/agent-skills/issues/247)

Depends on [task.51](../task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md) (accepted). **Blocks [task.52](../task.52.deferred-mutation-record-and-renderers/task.52.deferred-mutation-record-and-renderers.md)** — see Motivation for why that ordering is not negotiable.

---

## 1. Overview

`shared/resources/read-config.sh` reads `skills-config.yaml` through two tiers: tier 1 is
`python3` + `pyyaml`, a real parser; tier 2 is `awk`, a set of anchored line regexes with no
grammar. The two tiers disagree about legal YAML, and they disagree in the permissive direction —
an `access:` level tier 1 reads as `manual`, tier 2 reads as *absent*, and absent means `full`.

One shape escapes **both** tiers: a mapping-valued child (`access:` → `tracker:` → `mode: manual`)
reads as absent under `pyyaml` too, because `read_nested_config_key_strict` maps tier 1's `__MAP__`
signal to the empty string. That case is in scope here as well — see §2 problem 2 and §4.

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

1. **Three legal spellings of `access:` silently escalate on tier 2.** A merge key or anchor
   (`access:` / `<<: *defaults`) and a quoted key (`"access":`) read as *absent* there, and absent
   means `full`. The file is well-formed, the exit status is 0, and stderr is empty.

2. **A fourth shape escalates on BOTH tiers.** A mapping-valued child — `access:` → `tracker:` →
   `mode: manual`, an ordinary nesting typo — resolves to `full` at exit 0 under `pyyaml` as well.
   Tier 1's reader returns the `__MAP__` signal and `read_nested_config_key_strict` maps it to the
   empty string, which `resolve_access` cannot tell from "not configured". Reproduced:

   ```
   $ printf 'access:\n  tracker:\n    mode: manual\n' > skills-config.yaml
   $ AGENT_SKILLS_CONFIG_TIER=python  … source resolve-platform.sh   → rc=0 ACCESS_TRACKER=full
   $ AGENT_SKILLS_CONFIG_TIER=awk     … source resolve-platform.sh   → rc=0 ACCESS_TRACKER=full
   ```

   `tracker-access.test.sh` §41 already pins this for both tiers. It is therefore **not** a tier-2
   defect and is not closed by giving tier 2 a grammar; it needs its own fix in
   `read_nested_config_key_strict`, and it is in scope here because §9 promises no spelling escalates
   *on either tier*.

3. **Tier 2 is the default tier for a consumer, not a rare fallback.** `/usr/bin/python3` on a stock
   macOS host ships **without** `pyyaml`. This repo's own developers resolve `python3` to a Homebrew
   build that has it. So the tier consumers actually run is the one the project least exercises —
   which is exactly how four HIGH defects survived to task.51's sixth QA cycle.

4. **Patching spellings does not converge.** Task.51 ran seven QA cycles. Six of them closed one
   spelling each — the block form, then the flow form, then the multi-line flow form, then the
   anchored form — and each left its siblings open. There is no finite list of spellings, because
   the thing being approximated is a grammar. Cycle 7 stopped patching and recorded the limit
   instead; this task is the recorded work.

5. **A refusal cannot say why.** Every parse exception collapses to a single `__ERR__` sentinel, so
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

**The subset is defined by what can mislead, not by shape.** The question each construct is judged
against is: *can this change what one of the six keys resolves to, relative to what its own line
says?* The **aliasing family** can — anchors (`&d`), aliases (`*d`), merge keys (`<<`), quoted keys
(`"access":`), explicit `?`-form keys, multi-line flow mappings, explicit tags, a leading BOM, and
document separators (`---` / `...`). Those are outside the subset and tier 2 refuses them. Nesting
depth, block sequences, flow sequences and sequences-of-mappings **cannot** — a deeper key is still
read from its own line — so they are *ignorable*: recognised, skipped, never refused.

Defining the subset by shape instead was tried on paper and fails immediately: a "no nesting deeper
than two levels" rule refuses this project's **own documented schema**. `docs/reference/configuration.md`'s
canonical example carries `jira.statusMap.*`, `sign-off.story.required`, `branching.epicIntegration.*`
(three levels), `developBatch.resources[].probe.command` (four), flow sequences
(`[Waiting for Review, In Review]`) and sequences-of-mappings (`identities:` → `- jira:` / `  git:`).
A subset that refuses the schema the project publishes is a specification error, not a config error —
which is exactly R-1, arriving before any code is written.

Tier 1 continues to accept everything, so a consumer who needs the aliasing family installs `pyyaml`.

> **Decision Flow** — a diagram is not warranted here; the three-outcome table above is the whole
> logic and a flowchart would restate it.

---

## 4. Scope

### In scope

- ✅ Define the tier-2 strict subset and document it in `platform-detection.md`, validated against
      **`docs/reference/configuration.md`'s canonical example config** as well as this repo's own
      `skills-config.yaml` and every existing test fixture
- ✅ Tier-2 readers refuse (rather than return absent) on anything outside the subset
- ✅ Make a **mapping-valued `access.tracker` / `access.vcs` refuse on tier 1 too**, instead of
      collapsing `__MAP__` to absent (the both-tiers escalation in §2 problem 2)
- ✅ Propagate the refusal through `resolve-platform.sh` so a guarded call site halts — from **one
      site above the identity block**, so a single message covers all consumed keys
- ✅ Add `gawk` and `mawk` to CI (`.github/workflows/test.yml`) and treat any divergence they reveal
      as in scope
- ✅ Carry the parse-failure **reason** across the reader's record format (LIMIT-2)
- ✅ Rewrite the tier coverage in `tracker-access.test.sh` to assert **resolved values** under both
      tiers; delete the `§41 KNOWN LIMIT` block
- ✅ Remove the *Known limit* section from `platform-detection.md` and the canonical-block-form
      warning from `configuration.md`'s `access.tracker` row, once genuinely closed
- ✅ Update task.51's *Known limits* section to record LIMIT-1 and LIMIT-2 as closed here

### Out of scope

- ❌ Changing tier 1's YAML **parsing** — it is a real parser and is not the problem. Its handling of
      an already-parsed mapping-valued `access.*` **is** in scope; see In scope above
- ❌ Adding a `pyyaml` dependency (that was option 1; see Decisions)
- ❌ Vendoring a YAML parser (option 2; see Decisions)
- ❌ Anything that consumes `ACCESS_TRACKER` — that is task.52 onward
- ❌ Widening the six-key surface, or supporting new config keys

---

## 5. Breaking Changes

### BC-1 — A config outside the subset now halts on a host without `pyyaml`

**Before**: a config using an anchor, merge key or quoted key was read as *absent* on tier 2 and the
run continued with defaults — silently, and for `access:` that meant `full`.

**After**: tier 2 refuses. With this repo's `|| exit 1` guards on all 21 resolver sourcing lines,
that halts the run.

```yaml
# Before: tier 2 → ACCESS_TRACKER=full, exit 0, no output
# After:  tier 2 → refusal naming the line; exit 1
defaults: &d
  tracker: manual
access:
  <<: *d
```

**Affected**: a consumer on a host without `pyyaml` whose config uses YAML outside the subset **and
declares (or may declare) `access:`**. Unknown in number; this repo's own config is inside the subset.

**Not affected**: a config outside the subset that provably declares no `access:` — it warns and
degrades to detection, exactly as a malformed file always has. The refusal is gated on the same
fail-closed probe as the malformed branch, because the asymmetry is the same one: the default for
access is `full` and must fail closed, while the default for identity is *detection*, which is the
documented behaviour rather than a guess. See *Implementation Record → Decision 2*.

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

- [x] Enumerate the **refused** constructs — the aliasing family only (anchor, alias, merge key,
      quoted key, explicit `?`-form key, multi-line flow mapping, explicit tag, BOM, document
      separator) — as a table with an example of each and the reason each one can mislead
- [x] Enumerate the **accepted** and **ignorable** constructs with the same treatment; nesting depth,
      block sequences, flow sequences and sequences-of-mappings are ignorable, never refused
- [x] Validate the subset against **all three** corpora, in this order — if any falls outside, the
      subset is wrong, not the config:
      1. `docs/reference/configuration.md`'s canonical example config (lines ~40–125) — the config a
         real consumer writes, and the one a shape-based subset refuses outright
      2. this repo's own `skills-config.yaml`
      3. every fixture in `tracker-access.test.sh`
- [x] State the two migration paths (rewrite, or install `pyyaml`) in the doc, in those words

**Dependency**: none. This phase is the specification the rest is tested against, so it lands first.

### Phase 2 — Give tier 2 a third answer (Risk: Medium)

**Files**: `shared/resources/read-config.sh`

- [x] Add an `__UNSUPPORTED__` outcome, distinct from absent and from a value
- [x] Tier-2 scan classifies each line: in-subset, ignorable (comment / blank / deeper nesting /
      sequence item / block-scalar body), or out-of-subset
- [x] Any out-of-subset construct anywhere in the file yields `__UNSUPPORTED__` — the blast radius is
      the file, because an aliasing construct may change what a later line means
- [x] **Run the scan once at source time**, at the bottom of `read-config.sh`, setting a global —
      exactly as `_config_probe` does, and for the same reason: the readers run inside command
      substitutions, so a lazily-memoised scan caches into a subshell that exits immediately and
      re-runs on every call. A `$(_config_subset_scan)` call site defeats its own cache
- [x] Carry the offending line number and a short construct name alongside the outcome
- [x] Decide and document how the scan relates to `config_file_status`'s existing tier-2 awk lint,
      which returns a third value (`unverified`) the resolver's malformed branch does not act on.
      Recommended: keep them independent — `config_file_status` answers "is this YAML at all", the
      scan answers "can I read it correctly" — and say so in the header comment. Two overlapping awk
      lints with an unstated relationship will drift
- [x] Make a mapping-valued `access.tracker` / `access.vcs` refuse on **tier 1** as well:
      `read_nested_config_key_strict` must distinguish `__MAP__` from absent for the access keys
      instead of mapping both to `""` (§2 problem 2). The non-strict reader keeps collapsing it, so
      `resolve-paths.sh` is unaffected
- [x] Preserve tier 1 as authoritative for parsing — when it runs, tier 2 is not consulted (unchanged)

**Dependency**: Phase 1.

### Phase 3 — Propagate the refusal (Risk: Medium)

**Files**: `shared/resources/resolve-platform.sh`

- [x] **Raise the refusal from one site, above the identity block** (after the malformed branch,
      before `TRACKER=$(read_config_key tracker)` at ~line 305). The identity block runs *first*, so
      a refusal raised only inside `resolve_access` is unreachable: `read_config_key` would return
      `__UNSUPPORTED__`, `validate_enum` would halt at ~line 307 with `Legal values for tracker: jira
      github auto`, and the designed message — which BC-1 designates as the entire migration path —
      would never print
- [x] The hoisted check reads the scan's **verdict global directly**, never a reader's stdout. Tier
      2's plain-stdout channel has no kind byte, so a config value spelling `__UNSUPPORTED__` on a
      clean file must stay DATA and fail enum validation — the `__MAP__` forgery class task.51 spent
      three cycles closing (see R-4)
- [x] One halt naming the line, the construct, and both migration paths, covering all consumed keys
- [x] Fold the existing `__UNREADABLE__` multi-line-flow-map branch into the new mechanism — it is
      the same idea, added narrowly during task.51. Fold, do not run both
- [x] `resolve-paths.sh` keeps its never-fail contract: `read_nested_config_key` maps
      `__UNSUPPORTED__` to `""` exactly as it already maps `__UNREADABLE__`
- [x] Re-check the fail-closed branch, the `access:` opt-in probe, and `config_child_shape`'s awk
      fallback (which today grades `access: &acc` as a scalar and halts with the wrong reason)
      against the new outcome — with tier 2 refusing, their jobs may shrink; **do not delete any of
      them without a test proving it**

**Dependency**: Phase 2.

### Phase 4 — Carry the parse-failure reason (Risk: Low)

**Files**: `shared/resources/read-config.sh`

- [x] Extend the typed US/RS record format to carry a reason with the `__ERR__` signal
- [x] Tier 1 reports the `yaml` exception's line and message instead of a bare sentinel
- [x] Halt messages name the cause; retire the enumerated-shapes workaround added in task.51 cycle 7
- [x] The reason is DATA and travels the same hardened transport — a reason containing a separator
      or NUL must be refused, not injected

**Dependency**: Phase 2. Independently revertable if it overruns.

### Phase 5 — Make the suite hold it (Risk: Medium)

**Files**: `shared/resources/tracker-access.test.sh`, `.github/workflows/test.yml`

- [x] Assert the **resolved value** under both tiers for every shape — never the exit code alone
- [x] **Invert `§30`'s awk-tier assertion** (`tracker-access.test.sh:700–703`). Its `merge-override`
      fixture uses an anchor *and* a merge key and asserts `rc=0` for `for tier in python awk`; under
      this task the awk arm must assert `rc=1`. This is a deliberate deliverable, not a regression —
      and it is the **only** existing fixture that conflicts (§25, §31 and §37's merge/anchor
      fixtures are all forced to the python tier; §26's multi-line-flow fixture asserts only that no
      sentinel leaks, which still holds)
- [x] **Migrate `§41`, do not merely delete it** (currently ~lines 1024–1055). Its three awk-tier
      spelling fixtures become refusal-matrix cases; its `knownlimit-child` fixture — which asserts
      `full` on **both** tiers — inverts into a refusal on both, per §2 problem 2. Its own comment
      says a failure there means the limit has been fixed; repairing it back would be the wrong
      reading, but dropping the coverage silently would be worse
- [x] Add refusal assertions: every out-of-subset construct halts, on both shells, **asserting the
      stderr text** (line number + construct + both migration paths), not `rc=1` alone
- [x] Add acceptance assertions: every in-subset construct resolves identically on both tiers,
      including the whole of `configuration.md`'s canonical example config as a single fixture
- [x] Add a forgery fixture: `tracker: __UNSUPPORTED__` on a clean file is rejected as an invalid
      *value*, never obeyed as a signal
- [x] Mutation-witness every new invariant — see Testing Strategy
- [x] Add `gawk`/`mawk` to the fixture matrix and install both in `.github/workflows/test.yml`; skip
      gracefully with a printed notice when a variant is absent locally

**Dependency**: Phases 2–4.

### Phase 6 — Retire the documentation of the limit (Risk: Low)

**Files**: `shared/resources/platform-detection.md`, `docs/reference/configuration.md`,
`docs/tasks/task.51.../task.51.access-mode-config-and-resolver.md`

- [x] Remove the *Known limit* section from `platform-detection.md`, replaced by the subset spec
- [x] Remove the canonical-block-form warning from `configuration.md`'s `access.tracker` row
- [x] Mark LIMIT-1 and LIMIT-2 closed in task.51's *Known limits*, linking here
- [x] `npm run bundle` and commit the regenerated `skills/*/references/` trees

**Dependency**: Phase 5 green. **Do this last** — documentation claiming the limit is closed must not
land before the tests prove it.

---

## 7. Files Summary

### Core implementation

1. ✅ `shared/resources/read-config.sh` — the `__UNSUPPORTED__` outcome, the subset scan, the reason field
2. ✅ `shared/resources/resolve-platform.sh` — refusal handling, halt message, `__UNREADABLE__` fold-in

### Tests

3. ✅ `shared/resources/tracker-access.test.sh` — per-tier value assertions, refusal/acceptance suites, `§30` awk arm inverted, `§41` migrated. This file also carries the `resolve-paths.sh` never-fail coverage (`§26`, `§14`)
4. ✅ `shared/resources/resolve-platform.test.sh` — regression only; it contains no `resolve-paths.sh` / `PRD_ROOT` / `ARCH_ROOT` coverage, so the never-fail contract is asserted in `tracker-access.test.sh` (above), not here
5. ✅ `.github/workflows/test.yml` — install `gawk` and `mawk` on the CI runner

### Documentation

6. ✅ `shared/resources/platform-detection.md` — subset spec replaces the *Known limit* section
7. ✅ `docs/reference/configuration.md` — Phase 1 **input** (its canonical example config is the primary validation corpus and becomes a test fixture); in Phase 6 its `access.tracker` row loses the workaround warning
8. ✅ `docs/tasks/task.51.access-mode-config-and-resolver/task.51.access-mode-config-and-resolver.md` — LIMIT-1/2 marked closed

### Read-only references (Phase 1 validation corpus)

9. 📖 `skills-config.yaml` — this repo's own config; must stay inside the subset unchanged

### Generated (do not hand-edit)

10. ✅ `skills/*/references/read-config.sh`, `resolve-platform.sh`, `platform-detection.md` — via `npm run bundle`

### Deleted

11. ❌ `tracker-access.test.sh` `§41 KNOWN LIMIT` block (~lines 1024–1055) — **after** its four fixtures are migrated into the refusal matrix, not before

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
- **Acceptance matrix**: every in-subset construct resolves identically on both tiers — including
  `configuration.md`'s canonical example config in full.
- **Refusal matrix**: every out-of-subset construct halts on tier 2, with a message naming the line,
  the construct and both migration paths. **Assert the stderr text**, not `rc=1` alone: the halt can
  fire from the wrong site with the wrong words and still return 1.
- **Regression matrix**: this repo's own `skills-config.yaml` and every existing fixture keep
  working — **except `§30`'s awk-tier assertion**, which inverts from `rc=0` to `rc=1` because its
  fixture uses an anchor and a merge key. That inversion is a Phase 5 deliverable, not a regression;
  it is the only such conflict in the suite.

### Mutation testing (required, not optional)

Every new invariant must be **watched failing**. For each: revert the guard in isolation, run the
full suite, record the failure count. An invariant with no witness is not tested, however many
assertions surround it. Specifically watch:

- Deleting the `__UNSUPPORTED__` branch (must go red, not fall back to absent)
- Narrowing each refused-construct regex to match nothing (must go red)
- Removing a tier-forcing guard (must go red — this one survived at task.51 gate 6)
- Widening the subset to accept a construct the spec excludes (must go red)
- Moving the hoisted refusal back below the identity block (must go red — the stderr assertions
  catch it; an rc-only suite would not)
- Making the subset scan lazy again (must go red — the source-time spawn count rises)
- Making `read_nested_config_key` propagate `__UNSUPPORTED__` (must go red — `resolve-paths.sh` must
  never fail)
- Collapsing tier 1's `__MAP__` for `access.*` back to absent (must go red)

### Consumer / regression tests

- `resolve-paths.sh` never fails — `PRD_ROOT` / `ARCH_ROOT` resolve to defaults on a refused config
- `npm test` (node suites plus the **nine** shell suites `package.json` invokes), `npm run
  validate:all`, `npm run bundle` idempotent. Record the pre-change counts rather than quoting these;
  the numbers drift between cycles
- The **21** guarded call sites still halt end-to-end through a real guarded caller, not just by
  return code

---

## 9. Success Criteria

### Functional

- [x] No legal spelling of `access:` resolves **more permissive than declared** on either tier — it
      either resolves correctly or the tier refuses
- [x] Every construct in the documented subset resolves **identically** on both tiers
- [x] Every construct outside it produces a refusal naming the line and the construct
- [x] A refused config halts a run through a real guarded call site (verified end-to-end)
- [x] `resolve-paths.sh` still never fails — defaults on a refused config
- [x] The repo's own `skills-config.yaml` **and `configuration.md`'s canonical example config** are
      both inside the subset and resolve unchanged
- [x] The refusal fires from a single site above the identity block, so its message is what an
      operator actually sees — asserted on stderr text, not exit code
- [x] A mapping-valued `access.tracker` refuses on tier 1 as well as tier 2

### Performance

- [x] No additional process spawns per `source` — the tier-2 scan is one `awk` pass.
      **Measured** against the parent commit, counting `awk` invocations for one `source` of
      `resolve-platform.sh` against this repo's own config: **awk tier 8 → 9** (the one scan pass,
      as designed); **python tier 13 → 13** (unchanged — the scan skips itself when tier 1 is
      authoritative). **No additional `python` spawns on either tier.**

      The tier-1 path reached 15 on a first measurement, because the new `__MAP__` signal check
      asked for each record twice — `_rp_val` then `_rp_sig`, each spawning its own `awk` for an
      answer the single record already carried. Folded into one `_rp_acc` lookup per index, which
      is what returns it to the baseline. Worth stating rather than rounding away: a resolver that
      21 skills source is the wrong place to pay twice for one read.
- [x] Source time unchanged within noise against the task.51 baseline — follows from the spawn
      counts above; `awk` is milliseconds against the ~500 ms `python` spawn the batched read exists
      to avoid, and no `python` spawn was added.

### Code quality

- [x] `tracker-access.test.sh` `§41` **deleted**, not repaired
- [x] Every new invariant mutation-witnessed, with the failure count recorded
- [x] Zero surviving mutations in the audit
- [x] `npm test`, `npm run validate:all` green; Prettier clean; `npm run bundle` idempotent
- [x] Verified under `bash` and `zsh`, and on a genuine awk-only host
- [x] Green under macOS BWK awk, `gawk` and `mawk`, with `gawk`/`mawk` installed in CI —
      **partially verified locally.** macOS BWK awk is the development host and is green.
      `gawk`/`mawk` are not installed there, so `§45` skips with a printed notice (never silently);
      the CI step that installs both is added in `.github/workflows/test.yml` and will exercise
      them on the first run of this branch. Flagged rather than claimed: the cross-awk assertion is
      written and wired, not yet observed passing.

### Migration

- [x] Subset spec published in `platform-detection.md` with accepted/refused examples
- [x] The *Known limit* section and the `configuration.md` workaround warning are **removed**
- [x] Task.51's *Known limits* marks LIMIT-1 and LIMIT-2 closed, linking here
- [x] BC-1's two migration paths appear in the refusal message itself, not only in the docs

---

## 10. Risk Assessment

### HIGH

**R-1 — The subset is narrower than a real consumer's config.**
*Probability*: **Realised at review time** · *Impact*: High — a config that worked yesterday halts today.
*What happened*: the first draft of the subset refused "nesting deeper than two levels", which refuses
`docs/reference/configuration.md`'s own canonical example config (three- and four-level nesting, flow
sequences, sequences-of-mappings). The mitigation as first written would not have caught it, because
it named a corpus — this repo's twelve-line `skills-config.yaml` and the test fixtures — that
exercises none of those shapes.
*Mitigation*: the subset is now defined by **what can mislead** rather than by shape (§3), and Phase 1
validates against three corpora in order, `configuration.md`'s example config **first**, before any
code changes. If a real-world shape falls outside, widen the subset — that is a specification error,
not a config error. The refusal message must always name both migration paths.
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

**R-4 — The new sentinel and the reason field re-open in-band signalling.** Task.51 spent three QA
cycles on record forgery. Two surfaces, not one:
*(a) the reason field* — DATA on the existing typed US/RS transport with the kind byte, refused if it
contains a separator or NUL, the same rule as any other payload. Phase 4 is independently revertable.
*(b) `__UNSUPPORTED__` itself* — tier 2's plain stdout has **no kind byte**, so a config value that
spells `__UNSUPPORTED__` is indistinguishable from the signal on that channel. This is the `__MAP__`
forgery class, reintroduced on the one tier with no framing.
*Mitigation for (b)*: the hoisted check in `resolve-platform.sh` reads the scan's verdict global
directly and never a reader's stdout, so the sentinel never has to survive a round trip through the
untyped channel. Pinned by a `tracker: __UNSUPPORTED__` fixture that must fail enum validation as a
value, not be obeyed as a signal.

### LOW

**R-5 — `gawk`/`mawk` differ from macOS BWK awk** (notably `[[:space:]]` and `\r`).
*Mitigation*: both added to the fixture matrix in Phase 5 and installed in CI, with divergences in
scope. Not wholly untested today — CI runs `npm test` on `ubuntu-latest`, whose `awk` is not BWK awk,
so a second variant is already exercised on every push; what is missing is a *named* matrix that says
which variant produced a result. This is a reduction in risk rather than a new one.

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
4. Reopen LIMIT-1 in task.51's *Known limits*. Restore `§41` by reverting Phase 5's commit — do not
   reconstruct the block by hand; its assertions pin exact escalating values and a from-memory
   rewrite would pin the wrong ones

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
| 2026-08-18 | 1.1     | Review 1 — NEEDS REVISION (6/10), 5 Critical + 5 Important closed: subset redefined by "what can mislead" after the shape-based draft was shown to refuse `configuration.md`'s own example config; tier-1 mapping-valued `access.*` escalation brought in scope; refusal hoisted above the identity block where its message is reachable; `§30`'s awk assertion added to Phase 5 and `§41` migrated rather than deleted; subset scan moved to source time; `config_file_status` reconciled; R-4 widened to the sentinel; gawk/mawk exclusion removed; Files Summary and regression baselines corrected | review-task |
| 2026-08-18 |         | Status → ready-for-development | review-task |
| 2026-08-18 |         | Implemented — 8 files (2 resolvers, 1 suite, 1 workflow, 4 docs) + 104 bundled copies, tracker-access.test.sh 285 → 371 assertions, 21 mutations audited with 0 survivors | develop |
| 2026-08-18 |         | QA gate CONCERNS (80/100) — 2 medium, 2 low; duplicate-key escalation survives on tier 2 | qa-task |
| 2026-08-18 |         | QA findings fixed — 2 medium + 2 low closed, suite 371 → 378, 1 iteration | qa-fix |
| 2026-08-18 |         | QA gate PASS (95/100) — all cycle-1 findings verified closed, no new findings | qa-task |
| 2026-08-18 | 1.2     | DoD verified 23/23, CI green — accepted (PR #248) | finalise |

---

## Progress Tracking

### Phase 1: Define and document the subset
- [x] Enumerate refused constructs (the aliasing family), with an example and a reason for each
- [x] Enumerate accepted and ignorable constructs, with an example of each
- [x] Validate against `configuration.md`'s example config **first**, then `skills-config.yaml`, then
      every existing fixture
- [x] State both migration paths in the doc

### Phase 2: Give tier 2 a third answer
- [x] `__UNSUPPORTED__` outcome, distinct from absent
- [x] Line classifier: in-subset / ignorable / out-of-subset
- [x] Scan runs once at source time into a global, like `_config_probe`
- [x] Carry line number and construct name
- [x] Relationship to `config_file_status`'s `unverified` decided and documented
- [x] Mapping-valued `access.*` refuses on tier 1 too
- [x] Tier 1 remains authoritative for parsing

### Phase 3: Propagate the refusal
- [x] Single refusal site hoisted above the identity block
- [x] Check reads the verdict global, never a reader's stdout
- [x] Halt naming line, construct and both migration paths
- [x] Fold in the `__UNREADABLE__` branch
- [x] `resolve-paths.sh` never-fail contract preserved
- [x] Re-check the fail-closed branch, the `access:` opt-in probe and `config_child_shape`

### Phase 4: Carry the parse-failure reason
- [x] Record format carries a reason
- [x] Tier 1 reports the exception's line and message
- [x] Retire the enumerated-shapes workaround
- [x] Reason travels as hardened DATA

### Phase 5: Make the suite hold it
- [x] Per-tier value assertions everywhere
- [x] `§30`'s awk-tier assertion inverted (rc=0 → rc=1)
- [x] `§41`'s four fixtures migrated into the refusal matrix, then the block deleted
- [x] Refusal matrix, asserting stderr text not just rc
- [x] Acceptance matrix, including `configuration.md`'s example config
- [x] `tracker: __UNSUPPORTED__` forgery fixture
- [x] Every invariant mutation-witnessed
- [x] `gawk`/`mawk` in the fixture matrix and installed in CI

### Phase 6: Retire the documentation of the limit
- [x] `platform-detection.md` — subset spec replaces *Known limit*
- [x] `configuration.md` — workaround warning removed
- [x] Task.51 *Known limits* marked closed
- [x] `npm run bundle`; regenerated references committed

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

## QA Testing Results

**QA Status**: PASS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-08-18
**Quality Score**: 95/100
**Gate Decision**: PASS (cycle 2; cycle 1 was CONCERNS 80/100)

### QA Reports

- **Latest Report**: [task.60.qa.2.config-reader-strict-subset.md](./task.60.qa.2.config-reader-strict-subset.md)
- **Latest Gate**: [task.60.gate.2.config-reader-strict-subset.yml](./task.60.gate.2.config-reader-strict-subset.yml)
- Cycle 1: [QA report 1](./task.60.qa.1.config-reader-strict-subset.md) · [gate 1](./task.60.gate.1.config-reader-strict-subset.yml)

### Test Coverage Summary

- **Tests Executed**: 378 (`tracker-access.test.sh`), 1287 (`npm test`), 115 (`validate:all`)
- **Phases Verified**: 6/6
- **Critical Issues**: 0 HIGH, 0 MEDIUM, 0 LOW open (2 MEDIUM + 2 LOW found in cycle 1, all closed)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: PASS
- **QA Cycles**: 2

### Key Findings

- **TASK-60-QA1-1 (MEDIUM)** — a duplicated `access:` key is not in the refused set, so the tier-2
  scan reports the file clean and the first-wins block reader returns the permissive value while
  tier 1 halts. The same class this task closes, one spelling further along, on the tier a stock
  macOS host runs. `read-config.sh:81` names this exact shape as why tier 1 rejects duplicates.
- **TASK-60-QA1-2 (MEDIUM)** — the awk-variant CI install has no `apt-get update`, so a stale index
  fails the whole Test job before `npm test` runs.
- Two LOW items: the else-branch indentation in the hoisted refusal, and an undocumented deliberate
  narrowness in the alias rule.

All four were closed in qa-fix cycle 1 and verified in cycle 2 — including nine transition probes
against the new scanner state, and an assertion in the over-refusal direction (a duplicated key this
reader never consumes must still degrade, per §38). Mutation total 24, 0 survivors.

The subset, the refusal position, the message, the anti-forgery property and the mutation audit all
verified sound. See QA report 1's *Verification of the dev's two flagged items* — all three plan
deviations were reviewed and confirmed correct.

**Carried forward, non-blocking**: duplicates deeper than the first child level are not refused (not
an escalation — tier 2 resolves correctly there and tier 1 halts); and `gawk`/`mawk` remain
unobserved locally, to be confirmed on the first CI run of this branch.

---

## Definition of Done - PASSED ✅

**Status:** ACCEPTED

**Detailed Verification Log:** [task.60.dod.1.config-reader-strict-subset.md](./task.60.dod.1.config-reader-strict-subset.md)

### QA Summary

**Final Gate**: [gate 2](./task.60.gate.2.config-reader-strict-subset.yml) — ✅ PASS, 95/100 · **QA Cycles**: 2
Cycle 1 was CONCERNS 80/100 with 2 MEDIUM + 2 LOW findings; all four closed in qa-fix cycle 1 and re-verified in cycle 2.

### Criteria verified

- ✅ **Success Criteria**: 23/23 — functional 8/8, performance 2/2, code quality 6/6, migration 4/4
- ✅ **Tests**: 378 local / 375 CI, 0 failing; `npm test` 1287/1287; `validate:all` 115/115
- ✅ **CI**: rollup **SUCCESS** on `e1f16bc` — the exact commit at HEAD. Read, not assumed
- ✅ **Cross-implementation**: green under BWK awk (local), `gawk` and `mawk` (CI). Local and CI skip *different* sections, so between them every assertion is exercised and none is skipped in both
- ✅ **Mutation audit**: 24 mutations, **0 survivors** — including one witnessing the *over-refusal* direction
- ✅ **Security**: net-negative on escalation routes; fail-closed on unreadable input; the refusal signal is unforgeable from config data
- ⚠️ **Compliance**: NOT_APPLICABLE — internal config reader in a developer-tooling library
- ✅ **Documentation**: subset spec published, obsolete warnings retired, task.51 LIMIT-1/2 closed, CHANGELOG updated

### Residual gaps (non-blocking, recorded not glossed)

1. **No human has reviewed PR #248** — both QA cycles and this DoD were performed by the pipeline. The same condition task.51 was accepted under; restated so a green DoD does not imply sign-off it did not have.
2. **Duplicates deeper than the first child level are not refused** — not an escalation (tier 2 resolves correctly there, tier 1 halts), but worth a spec line if the key surface grows deeper.

**Task marked as ACCEPTED on:** 2026-08-18

---

## Implementation Record

**Implemented**: 2026-08-18 · **Branch**: `feature/task.60.config-reader-strict-subset`

### What was built

| Phase | Outcome |
| --- | --- |
| 1 — the subset | `_CONFIG_GUARDED_KEYS` + the accept/refuse tables, published in `platform-detection.md` as *Tier 2 — the strict subset*. Validated against all three corpora **before** any code landed. |
| 2 — the third answer | `_config_subset_scan` (one `awk` pass, run once at source time), `_CONFIG_SUBSET_VERDICT`, `_config_subset_refuses`, and the `__UNSUPPORTED__` guard at the top of each tier-2 reader branch. Tier 1's `__MAP__` split out from `__NONE__` in the strict reader; `_config_nested_shape_awk` gives tier 2 the same distinction by look-ahead. |
| 3 — propagation | One hoisted refusal above the identity block; the `__UNREADABLE__` branch folded into it and deleted; the bulk path reads the `__MAP__` **signal** rather than the empty value it decays to. |
| 4 — the reason | `__ERR__:<line>:<reason>`, sanitised before framing; the malformed halt prints `Cause:` and the enumerated-shapes list is retired. |
| 5 — the suite | 285 → **371** assertions. `§30` awk arm inverted, `§41 KNOWN LIMIT` deleted with all four fixtures migrated, `§41`–`§46` added. |
| 6 — retirement | *Known limit* removed from `platform-detection.md`, the workaround warning removed from `configuration.md`, LIMIT-1/LIMIT-2 marked closed in task.51, `npm run bundle` re-run. |

### Decisions taken during implementation

Three points where the running code forced a choice the plan left open. Each is recorded because a
reader of the diff would otherwise have to reconstruct the reasoning.

**1. The subset splits into non-local and local constructs, rather than being uniformly file-wide.**
The plan specified a single file-wide blast radius for every refused construct. Implementing it that
way failed `§14`, which pins valid YAML the tier-2 lint must not reject: a fixture carrying
`"my key": 1` beside a perfectly readable `access:` block was refused, because a quoted key was on
the refused list. A quoted key cannot mislead anything except the key it spells. The rule the plan
itself states — *can this change what one of the six keys resolves to?* — answers **no** there, so
the implementation follows the rule rather than the shape list: aliasing constructs stay file-wide,
key-spelling constructs are refused only for keys in `_CONFIG_GUARDED_KEYS`. That list is pinned
against the live call sites by `§44`, so widening the key surface without widening the guard cannot
pass silently. A quoted key containing a backslash escape is refused unconditionally, because the
name this scanner compares is then not the name a parser would see.

**2. A file outside the subset that declares no `access` warns and degrades rather than halting.**
BC-1 as drafted made every out-of-subset config halt on an awk-only host. That broke `§8`, whose
contract — *unparseable, and `access` provably not a key → warn, degrade to detection* — is
documented in `platform-detection.md`'s own file-state table. The asymmetry that table encodes is
the right one and applies unchanged here: the default for access is `full` and must fail closed;
the default for identity is *detection*, which is the documented behaviour rather than a guess.
Halting a consumer who never opted in, over a construct in a section nobody reads, is precisely the
over-refusal R-1 names. The refusal is therefore gated on `_rp_access_may_be_declared` — the same
fail-closed probe the malformed branch uses, which over-matches on purpose and greps the file
independently of the reader that just refused it. `§42d` pins the degrade path; BC-1 above and the
file-state table are updated to match.

**3. The tier-1 half needed fixing in the bulk path, not only in the strict reader.** The plan
located the mapping-valued-`access.tracker` escalation in `read_nested_config_key_strict`, which is
where the `__MAP__ → ""` collapse is written. But `resolve-platform.sh` reads through `config_bulk`
whenever tier 1 is available, and `_rp_val` yields nothing for a **signal** — so `__MAP__` arrived
as an empty string, indistinguishable from "not configured", and the strict reader was never called
on that path. Both sites are fixed; `§42b` asserts the refusal on both tiers, which is the assertion
that would have caught the gap.

### QA cycle 1 — findings and fixes

| Finding | Fix |
| --- | --- |
| **TASK-60-QA1-1** (medium) — a duplicated `access:` key was not refused, so tier 2's first-wins block matcher returned the permissive value at rc=0 while tier 1 halted. YAML says last-wins. | Duplicate detection added to `_config_subset_scan` for the **consumed** keys — a repeated top-level guarded key, and a repeated first-level child under one. Scoped deliberately: a repeated `jira:` cannot change what any of the six keys resolves to, and refusing it would halt a consumer over a section this reader never reads (§38 depends on that). |
| **TASK-60-QA1-2** (medium) — the awk-variant CI install had no `apt-get update`, and sits before `npm test`, so a stale runner index reddened the whole job. | `apt-get update` added, with the reason stated in the step. |
| **LOW-1** — the else-branch of the hoisted refusal was indented at the outer level, reading as unconditional on a skim of a security-relevant branch. | Re-indented. |
| **LOW-2** — the alias rule's deliberate narrowness was undocumented. | Comment added explaining that it misses an alias whose name starts with a non-alphanumeric, and why that is structural rather than lucky: a legal alias needs its anchor declared earlier, `&[^[:space:]]` catches that, and the scan reports the first construct it meets. |

Found while fixing, and worth recording because it is a live hazard rather than a style point: the
`OUT_OF_SUBSET` matrix in the test suite is a **double-quoted** shell string, so a backtick in a
construct label is command substitution — the first version of the duplicate rows silently executed
the label and left the stderr assertion matching a shorter needle. Backticks escaped and the hazard
noted in the file.

Three further mutations witness the new rule: deleting the top-level duplicate refusal → 2 failing;
deleting the child-level one → 2 failing; **widening it to every key rather than the consumed ones →
1 failing** (the over-refusal direction, which is the one that would lock a consumer out).

### Verification

- `tracker-access.test.sh`: **378 passed, 0 failed** (baseline 285/0; 371 before the QA cycle).
- Mutation audit: **24 mutations reverted in isolation, 0 survivors** (21 pre-QA + 3 for the duplicate rule). Three survived a first pass
  and each was closed by adding the missing witness rather than by accepting the count:

  | Mutation | Failing | Mutation | Failing |
  | --- | --- | --- | --- |
  | M1 delete a reader's `__UNSUPPORTED__` guard | 1 † | M12 drop `access` from the guarded list | 3 |
  | M2 anchor regex matches nothing | 6 | M13 `__ERR__` reason dropped | 2 |
  | M3 accept merge keys | 1 | M14 alias regex matches nothing | 1 † |
  | M4 non-strict reader propagates the sentinel | 1 | M15 accept unbalanced flow mappings | 5 |
  | M5 move the refusal below the identity block | 18 | M16 ungate the refusal (halt always) | 7 |
  | M6 collapse tier-1 `__MAP__` back to absent | 1 † | M17 remove the explicit-key rule | 1 |
  | M7 hoisted check reads a reader's stdout | 1 | M18 remove the explicit-tag rule | 2 |
  | M8 make the subset scan lazy | 28 | M19 remove the BOM rule | 1 |
  | M9 remove the tier-2 mapping look-ahead | 3 | M20 remove the quoted-key escape rule | 1 |
  | M10 bulk path ignores the `__MAP__` signal | 3 | M21 a failed awk reads as clean | 1 † |
  | M11 drop the guarded-key narrowing | 2 | | |

  † **Survived the first pass.** M1 and M6 were masked by the resolver-level refusal answering
  first, so `§42e` calls the readers directly. M14 had no independent witness because every legal
  YAML alias needs an anchor and the anchor rule fires on the earlier line, so the classifier is now
  asserted construct-by-construct. **M21 is the one worth naming**: it is this task's own defect one
  layer down — a failed `awk` produces no output, which was byte-identical to "found nothing outside
  the subset", so absence of evidence read as evidence of absence and resolved to the permissive
  answer. The fallback verdict is a refusal, and it has a test. A count is not a result.
- Corpora: `configuration.md`'s canonical example config and this repo's `skills-config.yaml` both
  resolve identically on both tiers, `rc=0`.
- Cross-shell (`bash`, `zsh`) and a shimmed no-python host, both asserted end-to-end through a
  guarded call site. `§46` additionally asserts the shim **is** the `python3` on `PATH`: macOS
  `/etc/zshrc` prepends `/usr/local/bin` and put a real interpreter back in front of it, which had
  quietly turned that section into a tier-1 test passing for the wrong reason.
- `gawk` / `mawk` are exercised by `§45` and installed in CI; they are absent on the development
  host, where the section skips with a printed notice rather than silently passing.

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
