---
id: task.94
title: "Add the observe-work meta-skill"
type: task
description: "Author the observe-work skill — a meta-skill that observes the session for skill-improvement signals, writes them to a durable observation log, and runs a periodic review that stages skill updates — and register it through every gate this repo's CI enforces."
tags: [observe-work, meta-skill, skills, progressive-disclosure]
category: infrastructure
status: planned
priority: High
created: 2026-09-07
updated: 2026-09-07
assignee:
estimated_effort_hours: 16
github_issue: 340
---

# Technical Task: Add the observe-work meta-skill

**Status:** Planned
**GitHub Issue**: [#340](https://github.com/Gamaroff/agent-skills/issues/340)

---

## 1. Overview

Author `skills/observe-work/` — the meta-skill that runs alongside ordinary work, notices corrections, gaps and recurring patterns, writes each as an observation to the durable log that task 93 built, and periodically turns that backlog into **staged** skill updates the user installs.

The methodology is adapted from `rebelytics/one-skill-to-rule-them-all` (CC BY 4.0, Eoghan Henn / rebelytics.com). The mechanism is this repo's: the engine and resolver from task 93 replace every shell snippet upstream embeds in prose.

**Scope**: one `SKILL.md`, five authored reference files, one test suite, and the eleven registration steps CI enforces for any new skill.

**Key deliverables**:

1. `skills/observe-work/SKILL.md` — a lean core (~350 lines) carrying only what changes behaviour on every invocation.
2. Five references loaded on demand, each pointer stating its own load trigger.
3. Full registration: catalog, dependency graph, `commands.md`, `activation-phrases.md`, the `package.json` test glob.

**Expected outcome**: `/observe-work` is invocable, `/observe-work --review` runs the review cycle, and a session that uses the skill produces observation files in the resolved workspace.

---

## 2. Motivation

### Current Problems

1. **Nothing in this library observes the agent's own work.** `autoskill` analyses a session but writes straight to skill files and needs an explicit trigger; `remember-insight` writes a durable log but takes the insight as input; `double-check` audits the artifact just produced, not the behaviour that produced it; `loop-supervisor` logs runs but only inside a loop. The gap — continuous, passive capture into a reviewable backlog — is real and is exactly what the upstream skill fills.
2. **Skills here are frozen once written.** This repository has 124 skills. Nothing systematically notices when one of them is wrong, out of date, or repeatedly violated, so improvements depend on someone remembering a friction they hit days ago.
3. **Task 93's engine has no caller.** The engine, resolver and contract exist but nothing invokes them. Until a skill does, the mechanism is inert.
4. **The upstream skill cannot simply be installed here.** Its `SKILL.md` is ~710 lines and hand-substitutes an absolute path in roughly a dozen snippets; its authoring guidance duplicates material this repo already owns in `create-skill` and `docs/contributing/authoring-skills.md`; and it carries a legacy-migration path for a log format that cannot exist in a fresh install.
5. **Registration here is not optional and not discoverable.** A new skill that skips the dependency-graph regen, the catalog regen, or either of the two doc-coverage pages fails CI. A per-skill test suite that is not added to `package.json` by hand runs nowhere — a trap that has already left 232 tests silently unrun in this repo.

### Benefits

1. **The library starts improving itself.** Corrections made in the course of ordinary work become recorded, reviewable proposals instead of evaporating at the end of the session.
2. **Capture is enforced by writes, not by memory.** Observations are written at checkpoints hooked onto tool calls that were happening anyway, so the write is a side effect of work rather than a separate act of remembering.
3. **Nothing goes live without the user.** Every update is staged and presented; the skill never edits a live skill file, in any environment.
4. **A body under 500 lines.** Upstream states the progressive-disclosure rule and then violates it. Meeting it here is what keeps the per-invocation cost honest.
5. **The engine gains its first consumer**, which is also the point at which `tests/executable-instructions.test.js` starts proving that every command the prose tells a reader to run actually ships.
6. **Boundaries are stated rather than discovered.** The skill says plainly which of `autoskill`, `remember-insight` and `double-check` it is *not*, which is the thing that stops four overlapping skills becoming a coin toss at invocation time.

---

## 3. Technical Background

### Current Architecture

After task 93, this exists and has no caller:

```
shared/resources/
├── observation-log.js                    # ten subcommands, --json + reason
├── resolve-observation-workspace.sh      # OBS_WORKSPACE / OBS_LOG_DIR / OBS_STAGING_DIR
├── observation-log-contract.md           # canonical storage spec
└── tests/observation-log.test.mjs
```

The four neighbouring skills and what each actually is:

| Skill | Input | Output | Trigger |
|---|---|---|---|
| `autoskill` | the current session | edits proposed against active skills' `SKILL.md` | explicit ("learn from this session") |
| `remember-insight` | an insight the user states | a file in the project memory dir | explicit |
| `double-check` | the artifact just produced | a Verification Audit Report | explicit, once per cycle |
| `loop-supervisor` | a loop run | per-iteration ledger and log | inside a loop only |

None of them is continuous passive capture into a durable, reviewable backlog.

### Target Architecture

```
skills/observe-work/
├── SKILL.md                              # ~350 lines, lean core
├── references/
│   ├── signals.md                        # full catalogue of what is / isn't worth logging
│   ├── review-cycle.md                   # the review: steps, approval policy, delivery
│   ├── applying-updates.md               # staging discipline, live-file rule, confidentiality
│   ├── environments.md                   # activation tiers, SessionStart hook, handoff-doc mode
│   ├── starter-principles.md             # optional provenance-stripped seed set
│   ├── observation-log-contract.md       # ← auto-bundled from shared/resources/
│   ├── observation-log.js                # ← auto-bundled
│   └── resolve-observation-workspace.sh  # ← auto-bundled
└── tests/observe-work.test.js
```

**Three-tier loading.** Frontmatter is always in context; the `SKILL.md` body loads when the skill triggers; references load only when their episode fires. The body is therefore a per-invocation tax and the references are not — which is why the body holds only per-session rules and every pointer states its trigger explicitly. A pointer without a trigger reads as optional and gets skipped; an unconditioned list of filenames is a bibliography, not progressive disclosure.

**Activation is a separate problem from installation**, and only one tier is enforced:

| Tier | Mechanism | Enforced? |
|---|---|---|
| 1 | frontmatter description matching | No — loses on short tool-using openers |
| 2 | user-level preferences | No — probabilistic |
| 3 | `AGENTS.md` / `CLAUDE.md` instruction | No — absent when the file is not in context |
| 4 | harness `SessionStart` hook | **Yes** — but it can only inject a prompt |

**The one honest limit**: the installing session cannot prove activation. A skill is callable by hand the moment it is installed, which proves nothing. The install is reported as **activation unverified** until a fresh session is seen invoking it unprompted.

### Important Clarifications

- **Every read and write of the log is one engine call.** No step doc reimplements id derivation, archival or scanning.
- **The skill never edits a live skill file.** Staging-only is the safety property that makes an autonomous review acceptable; the "apply small changes directly" rule decides *when*, never *where*.
- **`invokes:` must be inline flow form** — `invokes: [create-skill]`. Block form is rejected by the dependency generator.
- **The `description` must not contain `<` or `>`** (hard validator failure) and must be single-quoted if it contains a colon-space.
- **`skills/*/tests/*.test.js` is not auto-discovered.** The glob goes into `package.json` by hand.
- **Never hand-edit `skills/observe-work/references/` copies of shared resources** — the next `npm run bundle` reverts them silently. Edit `shared/resources/`.

---

## 4. Scope

### In Scope

✅ **`SKILL.md`**: attribution block, workspace resolution, Session Start Protocol, when/what to observe, how to log, surfacing protocol, acting-on rules, boundaries, quick-reference table, triggered pointers.
✅ **Five authored references**: `signals.md`, `review-cycle.md`, `applying-updates.md`, `environments.md`, `starter-principles.md`.
✅ **Tests**: `skills/observe-work/tests/observe-work.test.js` — structural invariants of the prose, in the house style for prose-driven skills.
✅ **Registration**: `invokes:`, dependency-graph regen, catalog regen, `generate_catalog.py` CATEGORIES entry, `commands.md` row, `activation-phrases.md` row, `package.json` test glob.
✅ **Bundling**: the three task-93 shared resources become `references/` copies via `npm run bundle` (the pre-commit hook does this).
✅ **Activation**: the `AGENTS.md` activation instruction, a shipped-but-opt-in `SessionStart` hook, and the fresh-session verification handed to the user as a named check.

### Out of Scope

❌ **The engine, resolver and contract** — task 93.
❌ **Boundary notes inside `autoskill` / `remember-insight` / `double-check`** — task 95. This task states the boundaries from `observe-work`'s side only.
❌ **The `observations:` block in `docs/reference/configuration.md`** — task 95.
❌ **`skill-profiles.json` membership** — `full` is `*`, so the skill is reachable without an edit. Adding it to `minimal` or `pipeline` is a deliberate later decision.
❌ **Backfilling observations from this repo's history.** The first-run backfill pass is documented in the skill; running it is a user action, not part of this task.
❌ **Upstream's `migration.md` / `migrate-log.py`** — omitted permanently.

---

## 5. Breaking Changes

**None to any existing skill's behaviour.** `observe-work` is additive: no existing skill invokes it, and its presence changes no existing code path.

Two changes are worth naming because they are not confined to the new directory:

### Change 1: `package.json` test script gains a glob

**What Changed**: the `test` script gains `'skills/observe-work/tests/*.test.js'`.

**Before**:
```
… 'skills/tracker-reconcile/tests/*.test.js' 'skills/jira-epic-creator/tests/*.test.js' …
```

**After**:
```
… 'skills/tracker-reconcile/tests/*.test.js' 'skills/jira-epic-creator/tests/*.test.js' 'skills/observe-work/tests/*.test.js' …
```

**Impact**: none to existing suites; the new suite runs. **Migration Path**: none — but omitting it is the actual hazard, because the suite then silently runs nowhere and CI stays green.

### Change 2: generated files gain entries

**What Changed**: `shared/resources/skill-dependencies.json` gains an `"observe-work"` key and `docs/reference/skill-catalog.md` gains a row.

**Impact**: both are CI drift-checked, so a stale copy fails the build. **Migration Path**: run `npm run generate-skill-deps` and `npm run generate-catalog` and commit the result — never hand-edit either file.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.94.plan.observe-work-skill.md](task.94.plan.observe-work-skill.md)

### Phase 1: Scaffold and frontmatter

**Risk Level**: Low

**Files**:
- `skills/observe-work/SKILL.md`

**Changes**:
- [ ] `python3 skills/create-skill/scripts/init_skill.py observe-work --path skills/`
- [ ] Remove the scaffold's placeholder `scripts/example.py`, `references/api_reference.md`, `assets/example_asset.txt`
- [ ] Write the frontmatter: `name`, single-quoted `description` (no `<` or `>`, under ~150 words), `invokes: [create-skill]` in inline flow form
- [ ] `python3 skills/create-skill/scripts/quick_validate.py skills/observe-work` passes on the frontmatter alone

**Dependencies**: task 93 merged

---

### Phase 2: The lean core

**Risk Level**: Medium

**Files**:
- `skills/observe-work/SKILL.md`

**Changes**:
- [ ] CC BY 4.0 attribution block naming Eoghan Henn / rebelytics.com, the canonical repo, and that changes were made
- [ ] Workspace resolution: `source references/resolve-observation-workspace.sh || exit 1`, never a cwd-relative path
- [ ] Session Start Protocol: storage probe, frontmatter scan, review trigger, activation check, staged-work reconciliation, first-run backfill offer
- [ ] When to observe / what to watch for / what never to log, with the generalisability test
- [ ] How to log: one `observation-log.js write` call; the same-turn rule; the checkpoint and deliverable-event flushes
- [ ] Surfacing protocol, including the log-and-defer default
- [ ] Acting on observations: the three contexts, and staging-only in every one of them
- [ ] Related skills — what `observe-work` is *not*, against the other three
- [ ] Quick-reference table
- [ ] Pointer list where every entry states its load trigger
- [ ] Body under 500 lines

**Dependencies**: Phase 1

---

### Phase 3: References

**Risk Level**: Low

**Files**:
- `skills/observe-work/references/signals.md`
- `skills/observe-work/references/review-cycle.md`
- `skills/observe-work/references/applying-updates.md`
- `skills/observe-work/references/environments.md`
- `skills/observe-work/references/starter-principles.md`

**Changes**:
- [ ] `signals.md` — new-skill / improve / simplify signals, the generalisability test, where the mindset stays on
- [ ] `review-cycle.md` — the review steps, approval policy, the three-way staged-work reconciliation, family drift audit, delivery and the summary format
- [ ] `applying-updates.md` — always start from the live file, staging discipline, confidentiality layers, principle propagation, pre-delivery gate; cross-reference `create-skill` and `docs/contributing/authoring-skills.md` rather than restating them
- [ ] `environments.md` — the four activation tiers, the activation block, the `SessionStart` hook, storage regimes, handoff-doc mode, and the "installing session cannot prove activation" rule
- [ ] `starter-principles.md` — the optional seed set, provenance-stripped, each entry marked as imported so a review can prune it
- [ ] Any reference over ~300 lines gets a table of contents

**Dependencies**: Phase 2

---

### Phase 4: Tests

**Risk Level**: Low

**Files**:
- `skills/observe-work/tests/observe-work.test.js`
- `package.json`

**Changes**:
- [ ] Assert every `references/` path named in `SKILL.md` resolves to a shipped file
- [ ] Assert every reference pointer carries a load trigger, not just a description
- [ ] Assert the body stays under 500 lines
- [ ] Assert the attribution block names the author, the licence and the canonical repo
- [ ] Assert no snippet in the prose hand-rolls an id, an archival sweep or a frontmatter scan — every log operation goes through the engine
- [ ] Assert prose uses `command node`, never bare `node`
- [ ] **Add `'skills/observe-work/tests/*.test.js'` to the `test` script in `package.json`**
- [ ] Prove the glob runs: change an assertion to fail, confirm `npm test` goes red, revert

**Dependencies**: Phase 3

---

### Phase 5: Registration

**Risk Level**: Medium

**Files**:
- `skills/create-skill/scripts/generate_catalog.py`
- `docs/reference/skill-catalog.md`
- `shared/resources/skill-dependencies.json`
- `docs/reference/commands.md`
- `docs/reference/activation-phrases.md`
- `skills/observe-work/references/` (generated)

**Changes**:
- [ ] Add `observe-work` to the appropriate `CATEGORIES` tuple in `generate_catalog.py`
- [ ] `npm run generate-catalog` and commit
- [ ] `npm run generate-skill-deps` and commit
- [ ] Add the `commands.md` row for `/observe-work` and `/observe-work --review`
- [ ] Add the `activation-phrases.md` row
- [ ] `npm run bundle` (or let the pre-commit hook fire) and commit the generated `references/` copies
- [ ] `npm run format`, `npm test`, `python3 skills/create-skill/scripts/quick_validate.py skills/observe-work`

**Dependencies**: Phase 4

---

### Phase 6: Activation — the step that decides whether any of this runs

**Risk Level**: Medium

**Files**:
- `AGENTS.md`
- `shared/resources/observe-work-session-start.sh`
- `skills/observe-work/references/environments.md`

**Changes**:
- [ ] Add the activation instruction to `AGENTS.md` — this repo dogfoods its own skills, so it is both the fix and the worked example. It must demand the Session Start Protocol **by name**, not merely the skill load: a session that loads the file and stops has activated nothing, and a loaded-but-inert skill is indistinguishable from a working one from the user's side
- [ ] Include the post-task backstop line — after each task, report the observations written this session (ids and titles, or "none logged and why"). This is what makes a silently skipped protocol visible at the first task boundary instead of never
- [ ] Ship `observe-work-session-start.sh` as an **opt-in** hook: it computes the open-observation count and last-review date and emits them as `hookSpecificOutput.additionalContext`. Shipping the file is not installing it — installation stays the user's decision, and `environments.md` says so
- [ ] Prove the hook's branches fire: run it against fixtures at `never`, 30 days stale, and 2 days stale, and confirm the third stays silent. A nag that never fires and a nag that is correctly silent look identical from a passing run
- [ ] Count only files whose `status` field reads `open` — never a raw file count, which overstates the backlog by every entry the last review just closed, for a day, in every session
- [ ] Compare dates without `<` inside `[ ]` — ISO dates sort lexically; `\<` is a bash/ksh extension that zsh rejects
- [ ] `shellcheck --severity=warning` the hook, and run it
- [ ] Report the install as **activation unverified**, and hand the user the named check for their next session: confirm the skill was *invoked* (not merely listed) and that the Session Start Protocol ran

**Dependencies**: Phase 5

---

## 7. Files Summary

### Files to Create (Core Implementation)

1. ✅ `skills/observe-work/SKILL.md` — the lean core
2. ✅ `skills/observe-work/references/signals.md` — what is worth logging
3. ✅ `skills/observe-work/references/review-cycle.md` — the review procedure
4. ✅ `skills/observe-work/references/applying-updates.md` — staging and editing discipline
5. ✅ `skills/observe-work/references/environments.md` — activation and environment mapping
6. ✅ `skills/observe-work/references/starter-principles.md` — optional seed set

### Files to Create (Tests)

7. ✅ `skills/observe-work/tests/observe-work.test.js` — structural invariants of the prose

### Files to Modify (Dependencies)

8. ✅ `package.json` — add the per-skill test glob

### Files to Modify (Generated — regenerate, never hand-edit)

9. ✅ `docs/reference/skill-catalog.md` — `npm run generate-catalog`
10. ✅ `shared/resources/skill-dependencies.json` — `npm run generate-skill-deps`
11. ✅ `skills/observe-work/references/observation-log-contract.md` — `npm run bundle`
12. ✅ `skills/observe-work/references/observation-log.js` — `npm run bundle`
13. ✅ `skills/observe-work/references/resolve-observation-workspace.sh` — `npm run bundle`

### Files to Create (Activation)

14. ✅ `shared/resources/observe-work-session-start.sh` — opt-in `SessionStart` hook; shipped, not installed

### Files to Modify (Documentation)

15. ✅ `AGENTS.md` — the activation instruction and the post-task backstop
16. ✅ `skills/create-skill/scripts/generate_catalog.py` — CATEGORIES entry
17. ✅ `docs/reference/commands.md` — slash-command row
18. ✅ `docs/reference/activation-phrases.md` — activation-phrase row
19. ✅ `CHANGELOG.md`

### Files to Delete

20. ❌ `skills/observe-work/scripts/example.py` — `init_skill.py` scaffold placeholder
21. ❌ `skills/observe-work/references/api_reference.md` — scaffold placeholder
22. ❌ `skills/observe-work/assets/example_asset.txt` — scaffold placeholder

---

## 8. Testing Strategy

### Unit Tests

**Scope**: structural invariants of `SKILL.md` and the references. This is a prose-driven skill, so the suite asserts the properties that make the prose executable — not that particular sentences exist.

**Actions**:
- [ ] Every `references/*` path named in the body resolves to a shipped file
- [ ] Every pointer states a load trigger
- [ ] Body length under 500 lines
- [ ] Attribution block complete (author, licence, canonical repo, changes-made statement)
- [ ] No hand-rolled id derivation, archival sweep or frontmatter scan anywhere in the prose
- [ ] `command node`, never bare `node`
- [ ] `invokes:` is inline flow form and names a real skill directory

**Command**: `npm test`

**Target**: every invariant that a future edit could plausibly break has an assertion.

---

### Integration Tests

**Scope**: the repo-level suites that apply to every skill automatically.

**Actions**:
- [ ] `tests/skill-frontmatter.test.js` — strict YAML, `name` + `description`, catalog in sync
- [ ] `tests/skill-doc-coverage.test.js` — the skill is named in **both** `commands.md` and `activation-phrases.md`
- [ ] `tests/executable-instructions.test.js` — every command the prose says to run resolves to a shipped file. This is the check that proves the engine calls in the prose are real
- [ ] `evals/shared/tests/skill-dependencies-drift.test.mjs` — dependency graph up to date
- [ ] Bundle-freshness: `npm run bundle` produces no diff after commit

---

### Contract Tests

**Scope**: the boundary with the engine.

**Actions**:
- [ ] Every engine subcommand the prose invokes exists in `observation-log.js`
- [ ] Every `reason` value the prose tells the agent to branch on is in the engine's vocabulary
- [ ] The prose never instructs a bare `source` of the resolver — always `source … || exit 1`

---

### Performance Tests

**Scope**: the per-invocation cost of the always-loaded and on-trigger content.

**Metrics to Measure**: `SKILL.md` line count and byte size; each reference's size; total bundle size.

**Baseline**: upstream's `SKILL.md` is ~710 lines / ~44KB, with ~170KB of references.

**Expectation**: body under 500 lines, and materially smaller than upstream's once the dropped migration path and the de-duplicated authoring guidance are accounted for. Assert the line count directly; do not assert a token estimate, which is not measurable here.

---

### Consumer Tests

**Scope**: nothing consumes `observe-work`. It consumes `create-skill` (via `invokes:`) and the task-93 engine.

**Actions**:
- [ ] Confirm `create-skill` still validates and its own suite passes — this task adds an inbound edge, not a change to it

---

## 9. Success Criteria

### Functional

- [ ] `python3 skills/create-skill/scripts/quick_validate.py skills/observe-work` passes
- [ ] `/observe-work` and `/observe-work --review` are documented in `commands.md` and behave as described
- [ ] The Session Start Protocol resolves the workspace through the resolver, never from the cwd
- [ ] Every observation write in the prose is a single `observation-log.js write` call
- [ ] The skill stages updates and never edits a live skill file, in every documented environment
- [ ] The three scaffold placeholder files are deleted
- [ ] `AGENTS.md` carries the activation instruction, demanding the Session Start Protocol by name and including the post-task backstop line
- [ ] The `SessionStart` hook emits valid JSON and its three date branches are each proven against a fixture — including the one that must stay silent
- [ ] The hook counts `status: open` files, never a raw directory count

### Performance

- [ ] `SKILL.md` body under 500 lines
- [ ] Every reference over ~300 lines carries a table of contents
- [ ] Bundle size recorded and materially below upstream's ~214KB total

### Code Quality

- [ ] `npm test` passes **with the new glob present in `package.json`**, proven by making an assertion fail and watching `npm test` go red
- [ ] `npm run generate-catalog` and `npm run generate-skill-deps` produce a clean `git diff` after commit
- [ ] `npm run bundle` produces a clean diff after commit
- [ ] No file under `skills/observe-work/references/` that is a bundled copy has been hand-edited
- [ ] `tests/skill-doc-coverage.test.js` passes without an entry in `UNDOCUMENTED_AT_ADOPTION`

### Migration

- [ ] `CHANGELOG.md` updated
- [ ] The catalog row renders under a real category, not "Other"
- [ ] `shellcheck --severity=warning` clean on the hook — run, not assumed
- [ ] Install reported as **activation unverified**, with the next-session check handed to the user as a concrete instruction, not a caveat

---

## 10. Risk Assessment

### High Risk Areas

**1. The skill installs but never activates**

- **Risk**: description matching alone under-triggers. The skill is present, listed, callable — and never invoked on its own, so nothing is ever logged. The failure is self-concealing: a loaded-but-inert skill is indistinguishable from an active one from the user's side.
- **Probability**: High. This is upstream's most-reported failure, and it is the default outcome without an explicit activation step.
- **Impact**: Critical. The entire skill is inert.
- **Mitigation**: Phase 6 makes this scoped work rather than advice. `AGENTS.md` gets the instruction (demanding the protocol by name, with the post-task backstop that surfaces a silent skip at the first task boundary); the hook — the only *enforced* tier — is shipped ready to install; the install is reported as **activation unverified** with a named next-session check. The external diagnostic is stated plainly for the case where every layer is skipped anyway: if the observation-log directory does not exist after a few sessions of real work, activation never happened.
- **Residual risk, stated rather than closed**: even a hook can only inject a prompt — choosing to invoke a skill remains a model decision. No tier available here makes activation certain, and the honest position is that the strongest one is a strong nudge.
- **Rollback**: revert the `AGENTS.md` block; the hook is inert unless installed.

### Medium Risk Areas

**1. The test glob is omitted from `package.json`**

- **Risk**: `skills/*/tests/` is not auto-discovered. A suite that is not globbed runs nowhere, CI stays green, and the skill ships untested.
- **Probability**: Medium — it is an easy step to miss and produces no error.
- **Impact**: Major. This repo has already lost 232 tests to exactly this.
- **Mitigation**: an explicit Success Criterion that the glob is proven by making an assertion fail and watching `npm test` go red. A passing suite is not evidence the suite ran.
- **Rollback**: one-line `package.json` edit.

**2. The body grows past the point where progressive disclosure is real**

- **Risk**: upstream's own body is 710 lines while stating a 500-line rule. Porting its content section by section reproduces that outcome.
- **Probability**: Medium. Every individual paragraph looks load-bearing.
- **Impact**: Major — the per-invocation cost is paid by every session, including ones where nothing is observed.
- **Mitigation**: an asserted line-count ceiling, and the rule that content belongs in the body only if it changes behaviour on *every* invocation.
- **Rollback**: move sections into references; the pointer discipline makes this a mechanical edit.

**3. `applying-updates.md` drifts from `create-skill`**

- **Risk**: authoring guidance restated in two places diverges, and the agent follows whichever it loaded.
- **Probability**: Medium over time.
- **Impact**: Major — contradictory rules are worse than a missing one.
- **Mitigation**: `applying-updates.md` carries only what `create-skill` and `docs/contributing/authoring-skills.md` do not, and cross-references rather than restates. This is the same rule the repo already enforces for the tracker-comment procedure.

### Low Risk Areas

**1. The catalog row lands under "Other"**

- **Risk**: `generate_catalog.py` buckets by a hardcoded list; an unlisted name falls through.
- **Probability**: Low if the CATEGORIES edit is in the phase list.
- **Impact**: Minor — cosmetic, caught on review.

**2. A bundled `references/` copy gets hand-edited**

- **Risk**: an edit to a bundled copy is reverted silently by the next `npm run bundle`.
- **Probability**: Low, given the pre-commit hook and CI freshness check.
- **Impact**: Minor — the fix is lost, not corrupted, and CI catches the drift.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**:
- `tests/skill-doc-coverage.test.js` or the dependency-drift test fails and cannot be resolved by regeneration
- The new skill's description matches so aggressively it displaces existing skills on unrelated openers

**Steps**:
1. Delete `skills/observe-work/`
2. Revert the `package.json` glob and the `generate_catalog.py` CATEGORIES entry
3. Revert the `commands.md` and `activation-phrases.md` rows
4. `npm run generate-catalog && npm run generate-skill-deps && npm run bundle`
5. `npm test`

**Verification**: clean `git diff` on all generated files; `npm test` green; no `observe-work` reference outside `docs/tasks/task.94.*`.

---

### Partial Rollback (1–2 hours)

**When to Use**: the skill is sound but a single reference is wrong or over-scoped.

**Steps**:
1. Remove that reference file and its pointer from `SKILL.md`
2. Fold the still-needed rules into the body only if they change behaviour every invocation; otherwise drop them
3. Re-run the test suite — the "every pointer resolves" assertion catches a stale pointer immediately

---

### Forward Fix (< 4 hours)

**When to Use**: under-triggering, over-triggering, or a body that is too long. All are description and structure edits with no data migration.

**Approach**: fix forward. The observation log is append-only and format-stable, so a prose change cannot invalidate existing entries.

---

### Rollback Triggers

**Critical (Immediate Rollback)**:
- The skill triggers on unrelated work and displaces domain skills
- CI cannot be made green by regeneration alone

**Non-Critical (Forward Fix)**:
- Body slightly over the line ceiling
- A reference missing its table of contents
- Catalog category wrong

---

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-07 | 1.0     | Initial draft | create-task |
| 2026-09-07 | 1.1     | Activation promoted from a flagged risk to Phase 6 (AGENTS.md instruction, opt-in SessionStart hook, named verification); effort 8h → 16h | create-task |

---

## Progress Tracking

### Phase 1: Scaffold and frontmatter
- [ ] `init_skill.py` scaffold
- [ ] Delete the three placeholder files
- [ ] Frontmatter written and validating

### Phase 2: The lean core
- [ ] Attribution block
- [ ] Workspace resolution
- [ ] Session Start Protocol
- [ ] Observation rules and the generalisability test
- [ ] How to log, checkpoints, deliverable flush
- [ ] Surfacing protocol
- [ ] Acting on observations
- [ ] Related-skills boundaries
- [ ] Quick-reference table
- [ ] Triggered pointer list
- [ ] Under 500 lines

### Phase 3: References
- [ ] `signals.md`
- [ ] `review-cycle.md`
- [ ] `applying-updates.md`
- [ ] `environments.md`
- [ ] `starter-principles.md`
- [ ] Tables of contents where needed

### Phase 4: Tests
- [ ] Structural invariant assertions
- [ ] `package.json` glob added
- [ ] Glob proven by a deliberate red

### Phase 5: Registration
- [ ] CATEGORIES entry
- [ ] Catalog regen
- [ ] Dependency regen
- [ ] `commands.md` row
- [ ] `activation-phrases.md` row
- [ ] Bundle
- [ ] Format, test, validate

### Phase 6: Activation
- [ ] `AGENTS.md` instruction, demanding the protocol by name
- [ ] Post-task backstop line
- [ ] `SessionStart` hook shipped (opt-in)
- [ ] Three date branches proven against fixtures
- [ ] `status: open` counting, not a raw file count
- [ ] Portable date comparison
- [ ] `shellcheck` clean
- [ ] Install reported as activation unverified, with the named check

---

## References

- **Upstream methodology**: [rebelytics/one-skill-to-rule-them-all](https://github.com/rebelytics/one-skill-to-rule-them-all) — CC BY 4.0, Eoghan Henn / rebelytics.com
- **Depends on**: task 93 (`shared/resources/observation-log.js`, `resolve-observation-workspace.sh`, `observation-log-contract.md`)
- **Followed by**: task 95 (boundary notes, config schema, doc rows beyond the two mandatory ones)
- **Authoring conventions**: `docs/contributing/authoring-skills.md`, `CONTRIBUTING.md`, `skills/create-skill/SKILL.md`
- **Prose-driven test style**: `skills/review-code/tests/review-code.test.js`, `skills/explain-simply/tests/template.test.js`
- **Neighbouring skills**: `skills/autoskill/`, `skills/remember-insight/`, `skills/double-check/`, `skills/loop-supervisor/`
- **Source plan**: [task.94.plan.observe-work-skill.md](task.94.plan.observe-work-skill.md)

---

## Notes

### Important Reminders

- **Add the test glob to `package.json`.** It is one line, nothing discovers it automatically, and omitting it costs the whole suite silently.
- **Prove the glob runs.** Make an assertion fail on purpose and watch `npm test` go red. A green run over zero tests is indistinguishable from a green run over a passing suite.
- **Never hand-edit a bundled `references/` copy.** Edit `shared/resources/` and re-bundle.
- **`invokes: [create-skill]`, inline flow form.** Block form is rejected.
- **Report the install as activation unverified.** The installing session cannot prove activation; hand the check to the user for their next session.
- **Do not restate `create-skill`'s guidance.** Cross-reference it. The repo already enforces exactly this rule for the tracker-comment procedure, for the same reason: a procedure kept in one file is the only kind that can be enforced.

### Known Issues

**Open** (Non-blocking):
- ⚠️ Until task 95 lands, the `observations:` config key the resolver reads has no schema documentation. Acceptable for one task's window.
- ⚠️ The overlap with `autoskill` is stated from `observe-work`'s side only until task 95 adds the reciprocal notes. A user reading `autoskill` alone will not yet see the boundary.

### Future Improvements

- Wire observation flush points into `develop-story` / `develop-task` / `finalise` as deliberate deliverable events, and have `review-*` skills query the log for open observations naming them. Deliberately deferred: it touches many existing skills and should follow evidence from real use, not precede it.
- Declare the meta-skill family in `skill-families.md` so the sibling check has a registry from day one — natural to do in task 95 alongside the boundary notes.

---

**Status:** Planned

**Next Steps**:
1. Implement according to the implementation plan
2. Mark checkboxes as completed
3. Hand off to QA when complete
4. QA will create:
   - QA Report: `task.94.qa.[number].observe-work-skill.md`
   - Bug Reports (if needed): `task.94.bug.[N].[name].md`
   - Quality Gate: `task.94.gate.[number].observe-work-skill.yml` (co-located in task directory)
