---
id: task.91
title: "Reconcile install-time and run-time tracker resolution"
type: task
description: "setup-consumer.sh and resolve-platform.sh resolve TRACKER from different sources and grade malformed input differently, so a repo can install one platform's skills and run as the other."
tags: [setup-consumer, platform-detection, resolver-parity]
category: infrastructure
status: planned
priority: Medium
created: 2026-09-04
updated: 2026-09-04
assignee:
estimated_effort_hours: 3
---

# Technical Task: Reconcile install-time and run-time tracker resolution

**Status:** Planned

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

`docs/reference/configuration.md:148` states that a scalar `tracker:` is validated against
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

`scripts/setup-consumer.sh:820` — `_resolve_install_tracker`. Same order, different reading:

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

- [ ] Establish empirically whether a copy of `resolve-platform.sh` is reachable at each of the three
      call sites (real install, `--update`, `--dry-run`). Do this by **running the wizard**, not by
      reading it.
- [ ] If Option A is viable at two of three sites, decide whether a fallback at the third is
      acceptable, or whether the dry-run branch should simply report "tracker not resolved" rather
      than guess.
- [ ] Record the decision and its rationale in §3 before writing code. A later reader must be able to
      see why the other options were rejected — `task.83.bug.2` is the model for this.

**Dependencies**: none.

### Phase 2 — Unify or synchronise the resolution (Risk: Medium)

**Files**: `scripts/setup-consumer.sh`, possibly `shared/resources/resolve-platform.sh`

- [ ] Implement the chosen option.
- [ ] Preserve every behaviour the task-83 parity table pins: the ten spellings, the map form, the
      lone-unmatched-quote case, and the deliberate config-beats-`$TRACKER` ordering that keeps the
      filter working on the `--update` path.
- [ ] If `resolve-platform.sh` changes, re-run `npm run bundle` — every skill carries a bundled copy.

**Dependencies**: Phase 1.

**Risk note**: this is the phase that can change resolution for every skill in the repo. A regression
here is not scoped to the installer.

### Phase 3 — Grade malformed input consistently (Risk: Low)

**Files**: `scripts/setup-consumer.sh`

- [ ] An unrecognised `tracker:` scalar (e.g. `tracker: bitbucket`) must not be silently interpreted.
      Match the runtime: refuse, naming the file and the value. Decide explicitly whether the
      installer **halts** or **skips filtering** — halting is consistent with the runtime; skipping is
      more forgiving for a tool whose failure mode is "you get extra skills". State which and why.
- [ ] A tab separator (`tracker:<TAB>jira`) must resolve the same way at both ends.
- [ ] Neither change may make a *valid* config harder to read.

**Dependencies**: Phase 2.

### Phase 4 — Tests and documentation (Risk: Low)

**Files**: `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`, `docs/reference/configuration.md`

- [ ] Extend the §4b parity table with the `.env`-only case and the malformed-input cases. The
      existing `the .env probe is a DELIBERATE asymmetry` test **must be updated or removed** — it
      currently pins the divergence this task removes, and its failure message says so explicitly.
- [ ] Keep the parity assertion shape: compare the two resolvers against **each other**, not against
      hardcoded expectations on both sides, so they cannot drift together and still pass.
- [ ] Mutation-prove each change per `shared/resources/mutation-proving.md`.
- [ ] Update `configuration.md` and the resolver header comments if the documented order changes.

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

- [ ] No config shape resolves differently at install time and run time. Demonstrated by a parity
      table that compares the two resolvers against each other.
- [ ] A repo with no `tracker:` key and `JIRA_URL` in `.env` only installs the skill set that matches
      what its skills resolve at run time.
- [ ] An unrecognised `tracker:` scalar is graded the same way at both ends.
- [ ] `tracker:<TAB>jira` is graded the same way at both ends.
- [ ] The map form still resolves as `auto` at both ends.
- [ ] `access.tracker` is still never read as a platform.

### Code Quality

- [ ] `npm run ci` green.
- [ ] `shellcheck scripts/setup-consumer.sh` — no new warnings against the `origin/develop` baseline.
      (The baseline is **1** warning: a pre-existing `SC2209`. Run via
      `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable`, since the binary is not
      installed on the dev host and no CI lane runs it.)
- [ ] Every behaviour change mutation-proven.
- [ ] If `resolve-platform.sh` changed, `npm run bundle` run and the result committed.

### Migration

- [ ] If the chosen option changes runtime resolution, `CHANGELOG.md` states which repos are affected
      and what to set to opt out.
- [ ] The `DELIBERATE asymmetry` test and the header comment it points at are updated or removed —
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

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-04 | 1.0     | Initial draft — filed from task 83's `gate.3` `recommendations.future`, covering the two resolver-parity residuals it deliberately left open | create-task |

---

## Progress Tracking

- [ ] Phase 1 — Decide the approach
- [ ] Phase 2 — Unify or synchronise the resolution
- [ ] Phase 3 — Grade malformed input consistently
- [ ] Phase 4 — Tests and documentation
- [ ] QA review complete
- [ ] Quality gate PASS

---

## References

- [Task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) — the filter this decides the input for
- [`task.83.bug.2.env-probe-asymmetry.md`](../task.83.platform-aware-skill-exclusion/task.83.bug.2.env-probe-asymmetry.md) — why the `.env` probe was kept, and why Option C is rejected
- [`task.83.gate.3.platform-aware-skill-exclusion.yml`](../task.83.platform-aware-skill-exclusion/task.83.gate.3.platform-aware-skill-exclusion.yml) — `recommendations.future`, where these residuals were recorded
- `shared/resources/resolve-platform.sh:424-437` — the runtime identity resolution
- `scripts/setup-consumer.sh:820` — `_resolve_install_tracker`
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
