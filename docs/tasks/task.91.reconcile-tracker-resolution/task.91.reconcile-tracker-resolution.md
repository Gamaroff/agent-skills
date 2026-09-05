---
id: task.91
title: "Reconcile install-time and run-time tracker resolution"
type: task
description: "setup-consumer.sh and resolve-platform.sh resolve TRACKER from different sources and grade malformed input differently, so a repo can install one platform's skills and run as the other."
tags: [setup-consumer, platform-detection, resolver-parity]
category: infrastructure
status: ready-for-review
priority: Medium
risk_level: medium
github_issue: 319
created: 2026-09-04
updated: 2026-09-05
assignee:
estimated_effort_hours: 3
---

# Technical Task: Reconcile install-time and run-time tracker resolution

**Status:** Ready for Review
**Review**: ✅ All review recommendations from `task.91.review.1.reconcile-tracker-resolution.md` implemented 2026-09-05
**GitHub Issue**: [#319](https://github.com/Gamaroff/agent-skills/issues/319)

---

## 1. Overview

Task 83 made `setup-consumer.sh` install only the tracker skills a consumer's platform can fire. That
filter is only as good as its answer to "which platform is this repo?", and it answers that question
with `_resolve_install_tracker` — a **second implementation** of the resolution that every skill
performs at run time via `shared/resources/resolve-platform.sh`.

Two implementations of one decision drift. Task 83's own QA loop caught the drift twice, closed both
instances, and left two known residuals behind because closing them properly changes behaviour outside
that task's scope. This task closes them, and — more valuably — removes the conditions under which a
third instance can appear.

The residuals, both recorded in `task.83.gate.3.*.yml` under `recommendations.future`:

1. **Different sources.** The installer probes `.env` for `JIRA_URL`; `resolve-platform.sh` reads only
   the process environment.
2. **Different grading of malformed input.** The installer silently defaults where the runtime halts.

---

## 2. Motivation

### Current Problems

**1. A repo can install one platform's skills and run as the other.**

With no `tracker:` key in `skills-config.yaml` and `JIRA_URL` present in `.env` but never exported:

| | resolves |
|---|---|
| `_resolve_install_tracker` (install time) | `jira` |
| `resolve-platform.sh` (run time) | `github` |

The installer therefore prunes the six GitHub-only skills — `sync-github-*`, `ensure-*-github-issue`
— from a repo whose skills will resolve `github` and reach for exactly those skills. The failure is
silent at install and surfaces later, inside a pipeline step, as a skill that is not on disk.

**2. Malformed config is graded two different ways.**

`docs/reference/configuration.md:153` states that a scalar `tracker:` is validated against
`jira`/`github`/`auto` and that "anything else halts the run" — `tracker: bitbucket` is explicitly
named as rejected. `resolve-platform.sh` does halt. The installer falls through to its positive probes
and silently resolves `github`, then filters on that. A second shape behaves the same way:
`tracker:<TAB>jira` is malformed YAML that `yaml.safe_load` itself rejects, and the installer accepts
it as `jira` while the runtime refuses. (This one is **pre-existing** — verified against the pre-task-83
script at `9edb699` — and is included here because it is the same defect class, not because task 83
introduced it.)

**3. The structural problem: parity is maintained by hand.**

Task 83 added a ten-case parity test asserting the two resolvers agree, which is a good guard and
found nothing after it was written. But a guard is not the same as an invariant. The two resolvers can
still be given different sources, different validation, or different normalisation by anyone editing
either file, and the parity test only catches the cases someone thought to enumerate.

### Benefits of reconciling

- A repo cannot install one platform's skill set and run as the other.
- Malformed config is refused consistently rather than silently interpreted at install and refused at
  run time.
- If the resolution is unified rather than merely re-synchronised, the parity test becomes a guard
  against regression rather than the only thing holding two implementations together.

---

## 3. Technical Background

### Current Architecture

`shared/resources/resolve-platform.sh` — sourced by every leaf skill that branches on platform. Order
(`resolve-platform.sh:424-437`):

1. `skills-config.yaml` scalar `tracker:`, parsed by a real YAML reader (pyyaml tier, or a documented
   strict subset)
2. `validate_enum … jira github auto` — **returns 1** on anything else
3. `auto` → `JIRA_URL` in the **process environment** → `jira`, else `github`

There is deliberately **no git-remote probe** for `TRACKER` (unlike `VCS`).

`scripts/setup-consumer.sh:878` — `_resolve_install_tracker`. Same order, different reading:

1. `skills-config.yaml` `tracker:`, parsed by `awk` plus bash normalisation (strips a trailing `\r`
   and one matched quote pair — added in task 83 QA cycle 1)
2. `$TRACKER`, when `select_platform` has run in this process
3. `JIRA_URL` in the environment **or in `.env`** → `jira`
4. otherwise `github`

It does not source `resolve-platform.sh`, for a stated reason: that file validates and can `exit 1`,
which would abort an install over a key the installer only wants a hint from.

### Target Architecture

Three approaches, in descending order of how much they close:

**Option A — one implementation (preferred, if it can be made to work).**
Have `_resolve_install_tracker` call `resolve-platform.sh` in a **subshell** and tolerate its failure,
rather than re-implementing it:

```bash
_t=$(bash -c "source '$RESOLVER' >/dev/null 2>&1 && printf '%s' \"\${TRACKER:-}\"" || true)
```

The subshell contains the `exit 1`, which is the objection that produced the second implementation in
the first place. Parity stops being something to maintain.

**The constraint that decides whether this is viable** is availability: `setup-consumer.sh` runs
standalone in a repo that may have no `.agents/skills/` yet.

- On the **real install path** the tarball is already extracted to `$_tmpdir` when the resolver is
  called, so `$_tmpdir/skills/<any-skill>/references/resolve-platform.sh` exists (the bundler puts a
  copy in every skill that references it).
- On the **`--dry-run` path** it is not — that branch returns before the download.
- On an **`--update` over an existing install**, `.agents/skills/*/references/resolve-platform.sh`
  exists from the previous run.

So Option A needs a located-or-fallback shape: use the real resolver when a copy can be found,
otherwise fall back to the local implementation. **Verify this before committing to it** — if the
fallback has to exist anyway, the parity problem is not fully removed and Option B may be the honest
answer.

**Option B — keep two implementations, make the sources identical.**
Teach `resolve-platform.sh` to read `.env` for `JIRA_URL`, so both sides see the same inputs.

> **This is a behaviour change for every skill in the repo**, and that is the whole reason task 83
> did not do it. A repo with a **stale** `JIRA_URL` in `.env` — one that outlived the setup that wrote
> it — currently resolves `github` at run time and would begin resolving `jira`. The installer's own
> header comment names that hazard as the reason `JIRA_URL` is the *last* positive probe. Any
> implementation must keep the config key winning over `.env`, and should consider whether `.env`
> ranks below the process environment.

**Option C — remove the installer's `.env` probe.**
Rejected, and the reasoning is recorded in `task.83.bug.2.env-probe-asymmetry.md`: the installer runs
**once**, often in a plain shell, while the skills run **later** in a shell that has `JIRA_URL`
because they need it. Dropping the probe trades a rare disagreement for a common one. Do not choose
this without new evidence that overturns that argument.

### Phase 1 Decision — established empirically 2026-09-05

> Recorded before any code was written, per Phase 1's own instruction. The reachability answers below
> come from **running** the wizard's code paths and downloading the real release archive, not from
> reading the script.

**Resolver reachability at the three call sites:**

| Site | Reachable? | Evidence |
|---|---|---|
| Real install (`setup-consumer.sh:1256`) | ✅ | The v0.45.0 release tarball carries **38** copies at `skills/*/references/resolve-platform.sh`. `_resolve_install_tracker` is called at line 1256, *after* `tar -xzf` at line 1254, and `$_tmpdir` is a caller local, so it is in dynamic scope. |
| `--update` | ✅ | `--update` takes the same download path (`UPDATE_ONLY` only skips the wizard's question steps), so `$_tmpdir` exists; `.agents/skills/*/references/resolve-platform.sh` is also present from the prior install. |
| `--dry-run` (`setup-consumer.sh:1154`) | ❌ | The branch returns before the download. The documented consumer invocation is `bash <(curl -fsSL …)` (`getting-started.md:107`), where `BASH_SOURCE[0]` is `/dev/fd/N` — so the sibling-repo path that the existing `_dry_cli` line already relies on does not resolve either. It *is* reachable when the wizard is run from a repo checkout. |

**The finding that changes the framing: Options A and B are not alternatives.** They fix different rows
of the divergence table, and neither fixes the other's:

- Rows 6 (`tracker: bitbucket`) and 7 (`tracker:<TAB>jira`) are **config-parsing** divergences. Option A
  fixes both by construction.
- Row 5 (`.env`-only `JIRA_URL`) is a **source** divergence. **Option A cannot fix it.** Delegating the
  whole resolution to `resolve-platform.sh` as it stands would drop the installer's `.env` probe — which
  is Option C, explicitly rejected in this document and in `task.83.bug.2`.

**Decision: implement A *and* B.**

1. **B first** — `resolve-platform.sh` gains a `.env` probe for `JIRA_URL`, ranked **below** the config
   key and **below** the process environment. This is the behaviour change, and it is what makes A
   viable: once the `.env` probe lives in the runtime resolver, delegating to it wholesale *preserves*
   the probe instead of deleting it, so A stops being C.
2. **A second** — `_resolve_install_tracker` delegates the entire resolution to a located copy of
   `resolve-platform.sh` run in a subshell. The local `awk` + quote/CRLF normalisation is **deleted**,
   not kept as a fallback: parity stops being a thing to maintain.

**On the tab case, and why delegation had to be wholesale.** An earlier design delegated only
`read_config_key`. That is wrong, and testing caught it: for `tracker:<TAB>jira`, `read_config_key`
returns `jira` while the resolver's own full resolution returns `github` — because pyyaml rejects the
tab, the typed bulk read reports the file unparseable, and the resolver falls back to detection rather
than to its tier-2 grep. Delegating a *part* of the resolution would have reproduced the divergence one
layer down. Only the final exported `TRACKER` is authoritative.

**`--dry-run` with no locatable resolver reports "unresolved" rather than guessing.** This is the plan's
stated preference and it is the honest option: a dry run that guesses differently from the real run is
the exact bug class this task closes. The branch already declines to report per-skill counts for the
same reason.

**The vestigial `$TRACKER` rung.** Rung 2 (the wizard's in-process answer) is unreachable on both real
paths: `write_skills_config` always emits a `tracker:` block (`tracker: github`, or `tracker: jira`) and
runs *before* `install_skills` in `main()`, so the full-wizard path always has an explicit key by the
time the resolver is called; and `--update` never runs `select_platform`, so `$TRACKER` is unset there.
It is removed along with the rest of the local implementation rather than preserved as dead code.

---

### Important Clarifications

- **The `tracker:` map form is not a platform override.** `tracker: {workflowFile: …}` means "no
  scalar override" and must continue to resolve as `auto`. Both resolvers already handle this; do not
  regress it.
- **`access.tracker` is a different axis.** A nested `tracker:` under `access:` must never be read as
  a platform. Both resolvers rely on `^tracker:` being anchored.
- **The wizard now always writes a `tracker:` key** (task 83), so a wizard-generated config cannot
  reach the `.env` divergence at all. The window is hand-authored and pre-task-83 configs. This bounds
  the severity — it does not make it acceptable, but it does mean the fix should not be paid for with
  a behaviour change that is riskier than the bug.

---

## 4. Scope

### In Scope

- `_resolve_install_tracker` in `scripts/setup-consumer.sh` — its source list and its handling of
  malformed values.
- `shared/resources/resolve-platform.sh` — only if Option A or B requires it.
- The resolver parity tests in `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`
  (§4b), extended to cover whichever behaviour is chosen.
- `docs/reference/configuration.md` and the `_resolve_install_tracker` header comment, if the
  documented resolution order changes.

### Out of Scope

- The skill classification lists (`SKILLS_JIRA_ONLY` / `SKILLS_GITHUB_ONLY`) and the filter itself —
  task 83 delivered and QA'd those; this task changes only how the tracker is *decided*.
- `VCS` resolution. Only the `TRACKER` axis diverges.
- Skill install profiles — that is task 84, which builds on task 83's filter independently.
- A `shellcheck` CI lane. Named in `task.83.gate.3` under `future` and genuinely separate work: a new
  lane runs against every shell script in the repo, not just this one.

---

## 5. Breaking Changes

**Depends entirely on the option chosen, and this is the main thing to decide before implementing.**

| Option | Breaking? | Who is affected |
|---|---|---|
| A — one implementation | No, if the fallback preserves current behaviour where the resolver cannot be located | Nobody, if done correctly |
| B — `resolve-platform.sh` reads `.env` | **Yes** — for every skill, not just the installer | A repo with no `tracker:` key and a **stale** `JIRA_URL` in `.env` flips from `github` to `jira` at run time |
| Refusing malformed input at install | Minor | A repo with an invalid `tracker:` scalar currently installs a `github`-filtered set; it would instead fail loudly — which is what the runtime already does to it |

If Option B is chosen, the migration note is: **set an explicit `tracker:` key**. That already wins
over `.env`, and the wizard writes one on both platforms since task 83.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.91.plan.reconcile-tracker-resolution.md](task.91.plan.reconcile-tracker-resolution.md)

### Phase 1 — Decide the approach (Risk: Low, but this phase carries the task)

**Files**: none — this is analysis, recorded in the task document.

- [x] Establish empirically whether a copy of `resolve-platform.sh` is reachable at each of the three
      call sites (real install, `--update`, `--dry-run`). Do this by **running the wizard**, not by
      reading it.
- [x] If Option A is viable at two of three sites, decide whether a fallback at the third is
      acceptable, or whether the dry-run branch should simply report "tracker not resolved" rather
      than guess.
- [x] Record the decision and its rationale in §3 before writing code. A later reader must be able to
      see why the other options were rejected — `task.83.bug.2` is the model for this.

**Dependencies**: none.

### Phase 2 — Unify or synchronise the resolution (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`, possibly `shared/resources/resolve-platform.sh`

- [x] Implement the chosen option.
- [x] Preserve every behaviour the task-83 parity table pins: the ten spellings, the map form, the
      lone-unmatched-quote case, and the deliberate config-beats-`$TRACKER` ordering that keeps the
      filter working on the `--update` path.
- [x] If `resolve-platform.sh` changes, re-run `npm run bundle` — every skill carries a bundled copy.

**Dependencies**: Phase 1.

**Risk note**: this is the phase that can change resolution for every skill in the repo. A regression
here is not scoped to the installer.

### Phase 3 — Grade malformed input consistently (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [x] An unrecognised `tracker:` scalar (e.g. `tracker: bitbucket`) must not be silently interpreted.
      Match the runtime: refuse, naming the file and the value. Decide explicitly whether the
      installer **halts** or **skips filtering** — halting is consistent with the runtime; skipping is
      more forgiving for a tool whose failure mode is "you get extra skills". State which and why.
- [x] A tab separator (`tracker:<TAB>jira`) must resolve the same way at both ends.
- [x] Neither change may make a *valid* config harder to read.

**Dependencies**: Phase 2.

### Phase 4 — Tests and documentation (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`, `docs/reference/configuration.md`

- [x] Extend the §4b parity table with the `.env`-only case and the malformed-input cases. The
      existing `the .env probe is a DELIBERATE asymmetry` test **must be updated or removed** — it
      currently pins the divergence this task removes, and its failure message says so explicitly.
- [x] Keep the parity assertion shape: compare the two resolvers against **each other**, not against
      hardcoded expectations on both sides, so they cannot drift together and still pass.
- [x] Mutation-prove each change per `shared/resources/mutation-proving.md`.
- [x] Update `configuration.md` and the resolver header comments if the documented order changes.

**Dependencies**: Phases 2–3.

---

## 7. Files Summary

**Core Implementation**

1. `scripts/setup-consumer.sh` — `_resolve_install_tracker`
2. `shared/resources/resolve-platform.sh` — only under Option B

**Tests**

3. `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — §4b parity block

**Documentation**

4. `docs/reference/configuration.md` — the `tracker` row, if the order changes
5. `CHANGELOG.md` — `[Unreleased]`

**Unchanged by design**

- The classification lists and the filter — task 83's delivery, not this task's subject.
- `shared/resources/platform-detection.md` — unless the canonical order itself changes, in which case
  it is the source of truth and must change **first**.

---

## 8. Testing Strategy

### Unit Tests

- The existing ten-case parity table, still green.
- New: `.env`-only `JIRA_URL` with no config key — both resolvers agree.
- New: `tracker: bitbucket` — both refuse, or both resolve identically, per the Phase 3 decision.
- New: `tracker:<TAB>jira` — both agree.
- Unchanged: the map form, the lone unmatched quote, `access.tracker` not being read as a platform.

### Integration Tests

- A fixture-tarball install for the `.env`-only case, asserting the **installed skill set** matches the
  tracker the skills will resolve at run time. The unit test proves the resolvers agree; this proves
  the agreement reaches disk.

### Regression

- `npm run ci` — `resolve-platform.test.sh` and `tracker-access.test.sh` both exercise the runtime
  resolver directly and will catch an unintended change to it.

> **Mutation-prove every fix.** Revert each behaviour and confirm a test goes red. Task 83's loop
> found that a green suite with seven proofs still shipped an inverted feature; the proofs that
> mattered were the ones that reverted the *specific* behaviour rather than the general one.

---

## 9. Success Criteria

### Functional

- [x] No config shape resolves differently at install time and run time. Demonstrated by a parity
      table that compares the two resolvers against each other.
- [x] A repo with no `tracker:` key and `JIRA_URL` in `.env` only installs the skill set that matches
      what its skills resolve at run time.
- [x] An unrecognised `tracker:` scalar is graded the same way at both ends.
- [x] `tracker:<TAB>jira` is graded the same way at both ends.
- [x] The map form still resolves as `auto` at both ends.
- [x] `access.tracker` is still never read as a platform.

### Code Quality

- [x] `npm run ci` green.
- [x] `shellcheck scripts/setup-consumer.sh` — no new warnings against the `origin/develop` baseline.
      (The baseline is **1** warning: a pre-existing `SC2209`. Run via
      `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable`, since the binary is not
      installed on the dev host and no CI lane runs it.)
- [x] Every behaviour change mutation-proven.
- [x] If `resolve-platform.sh` changed, `npm run bundle` run and the result committed.

### Migration

- [x] If the chosen option changes runtime resolution, `CHANGELOG.md` states which repos are affected
      and what to set to opt out.
- [x] The `DELIBERATE asymmetry` test and the header comment it points at are updated or removed —
      leaving a test that pins a divergence this task removed would be actively misleading.

---

## 10. Risk Assessment

### HIGH RISK

**1. Option B changes tracker resolution for every skill in the repo**

- **Risk**: a repo with a stale `JIRA_URL` in `.env` and no `tracker:` key silently flips from
  `github` to `jira` at run time — every tracker call then targets the wrong system.
- **Probability**: Low but not negligible; `.env` files outlive the setup that wrote them, which is
  the hazard the installer's own comment already names.
- **Impact**: High — wrong-tracker calls fail late and confusingly.
- **Mitigation**: prefer Option A. If Option B is chosen, the config key must keep winning, and the
  CHANGELOG must name the affected shape and the one-line opt-out.

### MEDIUM RISK

**2. Option A's fallback reintroduces the second implementation**

- **Risk**: if `resolve-platform.sh` cannot be located on the `--dry-run` path, a local fallback stays,
  and the parity problem is narrowed rather than removed.
- **Mitigation**: decide in Phase 1 whether `--dry-run` should report an unresolved tracker instead of
  guessing. A dry run that says "cannot determine the tracker without the release archive" is honest;
  one that guesses differently from the real run is the same class of bug as the one being fixed.

### LOW RISK

**3. Refusing malformed input turns a working install into a halt**

- **Risk**: someone with `tracker: bitbucket` in a config today gets a `github`-filtered install; after
  this change they may get a hard failure.
- **Mitigation**: this is arguably the point — the runtime already refuses them, so their skills do not
  work either. Make the message name the file, the value and the legal set.

---

## 11. Rollback Plan

Revert the commit. The installer returns to its task-83 behaviour, which is the current shipped state:
the filter works for every config the wizard generates, and diverges only in the two narrow shapes this
task exists to close. If `resolve-platform.sh` was changed, the revert must also re-run
`npm run bundle` so the per-skill copies match.

**Rollback triggers**: any report of a repo resolving a different tracker than it did before, on a
config that carries an explicit `tracker:` key.

---

## Bug Reports

### In QA Verification

- [Bug 1: rc 2 conflates every resolver refusal](./task.91.bug.1.rc2-conflates-every-resolver-refusal.md) — ✅ Ready for QA — HIGH (fixed 2026-09-05)
- [Bug 2: `.env` probe spelling and CRLF](./task.91.bug.2.env-probe-spelling-and-crlf.md) — ✅ Ready for QA — MEDIUM (fixed 2026-09-05)
- [Bug 3: dry run previews with the installed resolver](./task.91.bug.3.dry-run-previews-with-installed-resolver.md) — ✅ Ready for QA — MEDIUM (fixed 2026-09-05)
- [Bug 4: dry run prints an unfiltered profile count](./task.91.bug.4.dry-run-unfiltered-profile-count.md) — ✅ Ready for QA — MEDIUM (fixed 2026-09-05)
- [Bug 5: empty resolution reports no message](./task.91.bug.5.empty-tracker-reports-no-message.md) — ✅ Ready for QA — MEDIUM (iteration 2, fixed 2026-09-05)
- [Bug 6: pre-identity refusal blamed the wrong file](./task.91.bug.6.pre-identity-refusal-blamed-the-wrong-file.md) — ✅ Ready for QA — MEDIUM (fixed 2026-09-05)

---

## QA Testing Results

**QA Status**: FAIL (cycle 2)
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-05
**Quality Score**: 70/100
**Gate Decision**: FAIL

### Cycle 2 (latest)

- **Gate**: [task.91.gate.2.reconcile-tracker-resolution.yml](./task.91.gate.2.reconcile-tracker-resolution.yml) — FAIL, 70/100
- **Report**: [task.91.qa.2.reconcile-tracker-resolution.md](./task.91.qa.2.reconcile-tracker-resolution.md)
- Cycle-1 findings: **4 of 5 FIXED** and re-verified by execution. TASK-91-005 is **NOT fixed** — its branch is unreachable.
- **New HIGH (TASK-91-006)**: command substitution strips the trailing newline, so cycle 1's two-line rc/`TRACKER` payload collapses when `TRACKER` is empty and the installer resolves the literal string `"0"` as a tracker. The filter it feeds then keeps every skill and reports success — a *silent* failure where the bug it replaced was a loud one.
- The lesson is the coverage one: three of five cycle-1 fixes shipped with no test, and the empty-`TRACKER` path was never executed, so a shell subtlety that made the branch unreachable still produced a green suite.

### Cycle 1

### QA Report

- **Full Report**: [task.91.qa.1.reconcile-tracker-resolution.md](./task.91.qa.1.reconcile-tracker-resolution.md)
- **Gate File**: [task.91.gate.1.reconcile-tracker-resolution.yml](./task.91.gate.1.reconcile-tracker-resolution.yml)

### Test Coverage Summary

- **Tests Executed**: 2429 (`npm run ci` green, exit 0)
- **Phases Verified**: 4/4 (2 clean, 2 with concerns)
- **Critical Issues**: 1 HIGH, 4 MEDIUM, 5 LOW
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: **FAIL**, Maintainability: CONCERNS

### Key Findings

All six functional success criteria are **met** — 12 config shapes verified to resolve identically at
install and run time, including the three the task was filed to close.

The gate fails on what the change *acquired*, not what it set out to do. Delegating to
`resolve-platform.sh` imported that resolver's entire failure surface, and the installer maps all of it
onto one message: a valid `tracker: github` config with a restricted `access.vcs` now cannot install and
is told to fix a key that is already correct ([bug.1](./task.91.bug.1.rc2-conflates-every-resolver-refusal.md)).
The `.env` probe also misses `export JIRA_URL=` and false-positives on a CRLF empty value
([bug.2](./task.91.bug.2.env-probe-spelling-and-crlf.md)) — the latter being the exact spelling class
task 83 existed to fix.

Blast radius was named as a first-class concern for this review and did not land where anyone was
looking: the `.env` behaviour change is correctly bounded, while the delegation's **error contract** —
which reads like plumbing — is where the regression is.

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-04 | 1.0     | Initial draft — filed from task 83's `gate.3` `recommendations.future`, covering the two resolver-parity residuals it deliberately left open | create-task |
| 2026-09-05 | 1.1     | Review passed (9/10) — linked GitHub issue #319, corrected two stale line references (`setup-consumer.sh:820`→`878`, `configuration.md:148`→`153`), added `risk_level: medium` so the pipeline cannot select lite mode for a task carrying a HIGH RISK entry | review-task |
| 2026-09-05 |         | Status → ready-for-development | review-task |
| 2026-09-05 |         | Implemented A+B: `resolve-platform.sh` reads `.env` for `TRACKER` (below env, below config); `_resolve_install_tracker` delegates to it in a subshell and its local `awk` parser is deleted; an unrecognised scalar now halts the install and `--dry-run` reports "unresolved" rather than guessing. All 7 divergence-table rows read OK; 4 mutation proofs; `npm run bundle` re-run | develop |
| 2026-09-05 |         | Status → ready-for-review | develop |
| 2026-09-05 |         | QA gate FAIL (70/100) — 1 HIGH, 4 MEDIUM, 5 LOW. All 6 functional criteria met; the delegation's error contract conflates every resolver refusal with a bad `tracker:` value, blocking installs on valid configs | qa-task |
| 2026-09-05 |         | Status → in-progress (QA FAIL, returning to fix) | qa-task |
| 2026-09-05 |         | QA findings fixed — all 5 addressed in 1 iteration. rc 2 now means only a tracker rejection (a non-tracker refusal proceeds with a warning); the `.env` probe accepts `export` and rejects CRLF/quoted-empty; the dry run names which resolver copy answered and no longer prints an unfiltered count; the empty resolution gets its own message. 12 new tests, 3 mutation proofs, `npm run ci` green at 2441 | qa-fix |
| 2026-09-05 |         | Status → ready-for-review | qa-fix |
| 2026-09-05 |         | QA gate 2 FAIL (70/100) — 4 of 5 cycle-1 findings fixed; 1 new HIGH introduced BY the cycle-1 fix (rc/`TRACKER` payload collapses on an empty tracker → literal `"0"` resolved as a tracker), leaving TASK-91-005 unfixed | qa-task |
| 2026-09-05 |         | Status → in-progress (QA cycle 2 FAIL) | qa-task |
| 2026-09-05 |         | QA cycle 2 findings fixed — tab separator with the possibly-empty field first (a newline is stripped by command substitution); `.env` now last-match-wins like a sourcing shell; the COVERED/NOT-COVERED refusal split documented honestly and the rc-2 message stops naming the wrong file; the fixture tarball now ships the real resolver so the `release` origin is exercised at all. 4 new tests, 2 mutation proofs, `npm run ci` green at 2448 | qa-fix |
| 2026-09-05 |         | Status → ready-for-review | qa-fix |

---

## Progress Tracking

- [x] Phase 1 — Decide the approach
- [x] Phase 2 — Unify or synchronise the resolution
- [x] Phase 3 — Grade malformed input consistently
- [x] Phase 4 — Tests and documentation
- [ ] QA review complete
- [ ] Quality gate PASS

---

## References

- [Task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) — the filter this decides the input for
- [`task.83.bug.2.env-probe-asymmetry.md`](../task.83.platform-aware-skill-exclusion/task.83.bug.2.env-probe-asymmetry.md) — why the `.env` probe was kept, and why Option C is rejected
- [`task.83.gate.3.platform-aware-skill-exclusion.yml`](../task.83.platform-aware-skill-exclusion/task.83.gate.3.platform-aware-skill-exclusion.yml) — `recommendations.future`, where these residuals were recorded
- `shared/resources/resolve-platform.sh:424-437` — the runtime identity resolution
- `scripts/setup-consumer.sh:878` — `_resolve_install_tracker`
- [`shared/resources/platform-detection.md`](../../../shared/resources/platform-detection.md) — the canonical resolver order
- [`docs/reference/configuration.md`](../../reference/configuration.md) — the `tracker` key and its validation

---

## Notes

### Important Reminders

- **The parity test's shape is the valuable part.** It compares the two resolvers against **each
  other** by sourcing the real `resolve-platform.sh`, so they cannot drift together and still pass. An
  assertion against hardcoded expectations on both sides would not have caught task 83's defect.
- **Scrub the environment in any new test.** `hermeticEnv()` exists because an ambient
  `SKILLS_CONFIG_FILE` silently redirected every parity case away from its fixture. If you add a
  variable either resolver reads, add it to that list.

### Known Issues

- The `the .env probe is a DELIBERATE asymmetry, not an oversight` test currently **pins the
  divergence this task removes**. Its failure message says "if you changed that, update the installer
  and this test together" — this task is that change. Expect it to go red; that is correct, not a
  regression.
