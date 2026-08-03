---
id: task.41
title: "Two new pipeline moments, workflow-file scaffolding, and the develop-bug gap"
type: task
description: "Add the changes-requested and pr-merged moments, scaffold tracker-workflow.yaml on install without ever overwriting, add --init-workflow and a CI --check, and close the develop-bug QA-stage gap."
tags: [pipeline, scaffolding, setup, github, jira, documentation]
category: infrastructure
status: planned
priority: Medium
created: 2026-08-03
updated: 2026-08-03
assignee:
estimated_effort_hours: 16
---

# Technical Task: New moments, scaffolding, and the `develop-bug` gap

**Status:** Planned

---

## 1. Overview

The capstone of the tracker-workflow series. Three things:

1. **Two new pipeline moments** — `changes-requested` and `pr-merged` — declared in task.37 but not
   yet fired anywhere. `pr-merged` is where a column like "Ready for Showcase" most naturally sits
   on a board that showcases after merge.
2. **Scaffolding** — `setup-consumer.sh` writes `tracker-workflow.yaml` when absent and never
   overwrites when present; `--init-workflow` for consumers who upgrade a skill directory without
   re-running the wizard; `--check` for CI.
3. **The `develop-bug` gap** — it has no QA-loop step file, so it never signals `in-qa` or
   `ready-for-merge`. That is an oversight, not a decision.

---

## 2. Motivation

### Current Problems

1. **Two moments in the pipeline are unnamed.** A card sits frozen in review through up to five QA
   fix cycles, and nothing at all fires when the PR actually merges — the only moment at which "the
   code is on develop" is known.
2. **Nothing scaffolds the workflow file.** Tasks 37-40 make it authoritative, but a consumer has to
   hand-write it from documentation.
3. **A consumer who upgrades without the wizard has no route to the file.** Consumers upgrade by
   `rm -rf`ing one skill directory and copying a new one; the installer is not necessarily involved.
4. **No CI check.** `jira-sync.js:1812` claims records are "meant to be `--check`ed in CI"; no such
   flag exists. A renamed board column is the most common way this breaks, and it breaks silently.
5. **`develop-bug` signals four of the moments, not six.** It has no
   `develop-pipeline-step-5-6-qa-loop.md` in its references, so a consumer who turns `in-qa` on
   finds it works for stories and tasks but not bugs, with no explanation anywhere.
6. **Two READMEs describe the pre-v0.34.0 world.** `skills/develop-{story,task}/README.md` still
   claim three MCP transitions fired from "Phase 0c-reg" and contradict their own line 45.

### Benefits

1. **A post-merge column becomes expressible** — the most common home for a showcase step.
2. **A card's board position tracks the QA loop** instead of freezing for five cycles.
3. **New consumers get a working file automatically**; existing ones get a one-command route.
4. **CI catches a renamed column** before a run silently stops moving cards.
5. **All three develop pipelines behave the same**, and the READMEs stop lying.

---

## 3. Technical Background

### Current Architecture

Six moments fire from the step files; two more are declared in `tracker-workflow.js` (task.37) with
no call site. `setup-consumer.sh` writes `.env`, `skills-config.yaml`, `project.yml` scaffolding and
docs skeletons, but nothing for the workflow. `--probe-workflow --write-record` exists only as a
flag on three `sync-jira-*` skills.

### Target Architecture

| Moment | Fires at | New? |
| --- | --- | --- |
| `work-started` | Step 1, after branch + lock | |
| `in-review` | Step 4, after PR URL | |
| `changes-requested` | Step 5-6 §5b, entering a QA fix cycle | **yes** |
| `in-qa` | Step 5, once, entering the QA loop | |
| `ready-for-merge` | Step 6, on a gate that exits the loop | |
| `pr-merged` | post-merge tick in `/develop-next`, `/develop-batch` | **yes** |
| `blocked` | before a terminal HALT | |
| `done` | Step 7, by `/finalise` | |

Scaffolding: `setup-consumer.sh` reuses its own existing "already exists → `kept (existing)`"
pattern (L307-317). `--init-workflow` on both stage CLIs writes the file, preferring a live probe of
the real board over the static template, and refusing to overwrite without `--force`.

### Important Clarifications

- **Both new moments are absent from the default `pipeline:` map**, so they fire nowhere until a
  consumer names a status for them. Same discipline as v0.34.0's three opt-in stages: consumers
  upgrade by replacing a directory wholesale, and a moment that defaulted on would start moving
  cards into columns nobody asked about.
- **`--check` is the one mode that exits non-zero on failure** — the inverse of every other entry
  point in this family. It must say so in a comment, or someone will "fix" it to match.
- **`pr-merged` fires outside the develop-* pipelines**, in the orchestrators that actually merge.
  That is a different file set from tasks 38-40.

---

## 4. Scope

### In Scope

✅ `changes-requested` wired into the QA fix cycle, both trackers.
✅ `pr-merged` wired into `/develop-next` and `/develop-batch` post-merge ticks, both trackers.
✅ `setup-consumer.sh` scaffolds `tracker-workflow.yaml`, never overwriting.
✅ `--init-workflow [--force]` on `jira-stage.js` and `gh-stage.js`, including conversion of an
existing `jira.workflowRecord` JSON into the YAML ladder.
✅ `--check [--offline]` on both CLIs, exiting non-zero on drift.
✅ `develop-bug`: signal `in-qa` and `ready-for-merge` from its verify loop.
✅ Both stale READMEs corrected, with a self-policing checklist row.
✅ `docs/reference/configuration.md`: the missing `project.yml` section.

### Out of Scope

❌ **Consolidating `project.yml` into the workflow file** — board identity, different lifetime,
five call sites. Documenting it is in scope; moving it is not.
❌ **Auto-editing an existing consumer's config or workflow file.**
❌ **New moments beyond these two.**
❌ **Retiring `jira.workflowRecord` / `jira.statusMap`** — both keep loading at lower precedence.

---

## 5. Breaking Changes

**None.** Both new moments are absent from the default `pipeline:` map and therefore inert.
Scaffolding never overwrites. `--check` is opt-in.

### Behavioural change: `develop-bug` gains two signals

**What changed**: `develop-bug`'s verify loop signals `in-qa` on entry and `ready-for-merge` on a
passing exit, as the story and task pipelines do.

**Impact**: only consumers who have *already* opted those moments in — for whom the current
behaviour is an unexplained inconsistency.

**Migration path**: none. A consumer wanting bugs to skip those columns omits them under a
`byIssueType` overlay for the bug issue type.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.41.plan.pipeline-moments-and-scaffolding.md](task.41.plan.pipeline-moments-and-scaffolding.md)

### Phase 1: `changes-requested`

**Risk Level**: Low

**Files**: `shared/resources/develop-pipeline-step-5-6-qa-loop.md`

**Changes**:

- [ ] Fire on entering a QA fix cycle (§5b, before `/qa-fix`), both trackers
- [ ] Fires per cycle — unlike `in-qa`, which fires once — because it marks a state the card
      re-enters. Say so explicitly, since the adjacent rule is the opposite
- [ ] Default candidates deliberately exclude "In Progress", which would drag cards backwards on
      most boards

**Dependencies**: task.37; tasks 38/40 for the respective trackers

---

### Phase 2: `pr-merged`

**Risk Level**: Medium

**Files**: `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md`

**Changes**:

- [ ] Fire at the post-merge tick, after `gh pr merge` succeeds and before the roadmap tick
- [ ] Both trackers; non-blocking, exit 0 on every skip
- [ ] `develop-batch` merges serially — fire per item, not once per batch
- [ ] Note the ordering relative to `done`: Step 7 moves to `done` while the PR is still open, so a
      board wanting a merge gate should leave `done` out of `pipeline:` and let `pr-merged` be the
      last automated move

**Dependencies**: Phase 1

---

### Phase 3: Scaffolding and `--init-workflow`

**Risk Level**: Medium

**Files**: `scripts/setup-consumer.sh`, `shared/resources/jira-stage.js`,
`shared/resources/gh-stage.js`, `assets/tracker-workflow.default.yaml`

**Changes**:

- [ ] `setup-consumer.sh` writes `tracker-workflow.yaml` only when absent; reports
      `kept (existing)` otherwise, reusing the L307-317 pattern
- [ ] Offer a live probe (`--probe-workflow` / `--probe-board`) to generate from the real board;
      fall back to the static template with no credentials
- [ ] `--init-workflow [--force]` on both CLIs; refuses to overwrite without `--force`
- [ ] Convert an existing `jira.workflowRecord` JSON into the YAML ladder, so migration is one
      command
- [ ] Record the outcome in the wizard's step summary

**Dependencies**: tasks 38 and 39 (both probes must exist)

---

### Phase 4: `--check`

**Risk Level**: Low

**Files**: `shared/resources/jira-stage.js`, `shared/resources/gh-stage.js`,
`shared/resources/tracker-workflow.js`

**Changes**:

- [ ] Parses; every `pipeline:` key is a known moment; no duplicate rungs
- [ ] Every status named by an enabled moment exists on the board
- [ ] Every enabled moment resolves to something reachable (Jira: from at least one sampled
      position; GitHub: matches an option)
- [ ] The file's project/site (Jira) or owner/repo/board (GitHub) matches the environment — catches
      a file copied between repos
- [ ] Drift: re-probe and print a diff plus the exact command that fixes it
- [ ] **Exits non-zero on failure** — with a comment saying why this inverts the family contract
- [ ] Without credentials, exits **0** with a loud skip, so a fork's PR does not fail on a secret it
      cannot have
- [ ] `--offline`: schema self-consistency only, no network — what most consumer CI will run

**Dependencies**: Phase 3

---

### Phase 5: `develop-bug` parity, READMEs, docs

**Risk Level**: Low

**Files**: `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`,
`skills/develop-{story,task}/README.md`, `docs/reference/configuration.md`, `CHANGELOG.md`

**Changes**:

- [ ] `develop-bug` signals `in-qa` on verify-loop entry and `ready-for-merge` on a passing exit
- [ ] Parity test: every pipeline with a verify/QA loop signals the same moments, or states in prose
      why not
- [ ] READMEs: replace the pre-v0.34.0 tracker tables; add rows for the opt-in moments
- [ ] Add a row to each README's "Verification Checklist (for diagram maintainers)": every tracker
      operation named in these tables must map to a `--stage` invocation or a named script, never a
      raw API verb — that is what makes the staleness self-policing
- [ ] `configuration.md`: the `project.yml` section that has never existed
- [ ] `CHANGELOG.md`

**Dependencies**: Phases 1-4

---

## 7. Files Summary

### Files to Modify (Core Implementation)

1. ✅ `shared/resources/develop-pipeline-step-5-6-qa-loop.md` — `changes-requested`
2. ✅ `skills/develop-next/SKILL.md`, `skills/develop-batch/SKILL.md` — `pr-merged`
3. ✅ `scripts/setup-consumer.sh` — scaffolding
4. ✅ `shared/resources/jira-stage.js`, `shared/resources/gh-stage.js` — `--init-workflow`, `--check`
5. ✅ `shared/resources/tracker-workflow.js` — shared validation for `--check`
6. ✅ `skills/develop-bug/references/develop-bug-step-5-6-verify-loop.md`

### Files to Modify (Tests)

7. ✅ `shared/resources/tests/tracker-workflow.test.mjs` — `--check` validation rules
8. ✅ `evals/shared/tests/transition-protocol-parity.test.mjs` — new moment literals; QA-loop parity
9. ✅ `shared/resources/tests/setup-consumer-config.test.mjs` — never-overwrite guard

### Files to Modify (Documentation)

10. ✅ `assets/tracker-workflow.default.yaml`
11. ✅ `docs/reference/tracker-workflow.md`, `docs/reference/configuration.md` (incl. `project.yml`)
12. ✅ `skills/develop-{story,task}/README.md`
13. ✅ `CHANGELOG.md`

### Files to Delete

None.

---

## 8. Testing Strategy

### Unit Tests

**Scope**: `--check` rules and the never-overwrite guard

**Actions**:

- [ ] Unknown moment key → error
- [ ] Duplicate rung → error
- [ ] A `pipeline:` target that is neither a rung nor a plausible side-state → warning
- [ ] `--offline` performs schema checks only, issuing no network call
- [ ] `--init-workflow` refuses to overwrite; `--force` overwrites
- [ ] JSON-record → YAML-ladder conversion round-trips

**Command**: `node --test 'shared/resources/tests/*.test.mjs'`

---

### Integration Tests

**Scope**: the new moments appear where they should and nowhere else

**Actions**:

- [ ] `--stage changes-requested` appears in the QA loop step file, per cycle
- [ ] `--stage pr-merged` appears in both orchestrators' post-merge ticks
- [ ] Neither is in the default `pipeline:` map — a consumer without the file sees no new calls
- [ ] `develop-bug` signals the same moments as the story/task loops

**Command**: `npm test`

---

### Contract Tests

**Scope**: the inverted `--check` exit code

**Actions**:

- [ ] `--check` exits non-zero on drift, 0 on a clean file, and **0** with no credentials
- [ ] Every other mode still exits 0 on every documented skip

---

### Performance Tests

**Scope**: added API calls

**Metrics**: `changes-requested` fires per fix cycle — up to five per run.

**Baselines**: today, zero.

**Expectations**: ≤ 5 extra calls per run, and only for consumers who opted in. If that proves too
chatty, fire once on first entry — but measure before deciding.

---

### Consumer Tests

**Scope**: the whole feature, end to end

**Actions**:

- [ ] Fresh `setup-consumer.sh` run produces a working `tracker-workflow.yaml`
- [ ] Re-run leaves an existing file untouched and reports `kept (existing)`
- [ ] A full `/develop-task` run against a scratch board with a post-merge showcase column lands the
      card in it after merge

---

## 9. Success Criteria

### Functional

- [ ] `changes-requested` and `pr-merged` fire at their moments, both trackers
- [ ] Neither fires for a consumer with no `tracker-workflow.yaml`
- [ ] `setup-consumer.sh` scaffolds when absent and never overwrites
- [ ] `--init-workflow` converts an existing JSON record
- [ ] `--check` exits non-zero on drift and 0 without credentials
- [ ] `develop-bug` signals the same moments as the other two pipelines

### Performance

- [ ] At most 5 additional API calls per run, only when opted in
- [ ] `--check --offline` issues no network call

### Code Quality

- [ ] Shared validation lives in `tracker-workflow.js`, not duplicated per CLI
- [ ] The inverted `--check` exit code is commented as deliberate
- [ ] Edits in `shared/resources/` only; bundles regenerated

### Migration

- [ ] `CHANGELOG.md` covers both moments, scaffolding, `--check`, and the `develop-bug` fix
- [ ] READMEs corrected and given the self-policing checklist row
- [ ] `configuration.md` documents `project.yml` for the first time

---

## 10. Risk Assessment

### High Risk Areas

**1. `pr-merged` fires in an orchestrator that merges many PRs**

- **Risk**: `develop-batch` merges serially in a loop. Firing once per batch instead of per item
  would move the wrong card, or one card repeatedly.
- **Probability**: Medium
- **Impact**: Critical (wrong card moved on a shared board)
- **Mitigation**: fire inside the per-item merge block, keyed on that item's `TRACKER_ISSUE`.
  Explicit test asserting the call sits inside the loop body.
- **Rollback**: revert Phase 2; it is independent of the rest.

### Medium Risk Areas

**1. Scaffolding writes a file that does not match the real board**

- **Risk**: the static template's generic ladder does not match the consumer's columns, so the first
  run resolves nothing.
- **Probability**: Medium
- **Impact**: Major
- **Mitigation**: prefer a live probe; when falling back to the template, say so loudly and point at
  `--probe-board` / `--probe-workflow`. `--check` catches it immediately.

**2. `changes-requested` is too chatty**

- **Risk**: five moves per run on a busy board reads as noise.
- **Probability**: Medium
- **Impact**: Minor
- **Mitigation**: off by default; measure before changing to fire-once.

**3. `--check`'s inverted exit code gets "fixed"**

- **Risk**: every other mode exits 0 on failure, so a future contributor harmonises it.
- **Probability**: Medium
- **Impact**: Major (a CI check that cannot fail)
- **Mitigation**: comment beside the exit table explaining the inversion, plus a test asserting
  non-zero on drift.

### Low Risk Areas

**1. README drift returns**

- **Mitigation**: the added checklist row makes it self-policing — that is why they drifted for a
  whole release.

---

## 11. Rollback Plan

### Immediate Rollback (< 1 hour)

**Triggers**: the wrong card moved by `pr-merged`; scaffolding overwrote an existing file; `--check`
failing a green repo.

**Steps**:

1. Revert the offending phase — all five are independent
2. `npm run bundle`
3. `npm test`

**Verification**: a `develop-batch --dry-run` shows the expected items; a scratch wizard run leaves
an existing workflow file untouched.

---

### Partial Rollback (1-2 hours)

**When to Use**: one phase misbehaves. Revert it alone; Phases 1, 2, 3, 4 and 5 have no
interdependencies beyond ordering.

---

### Forward Fix (< 4 hours)

**When to Use**: `--check` message wording, template content, README phrasing, candidate lists for
the new moments.

---

### Rollback Triggers

**Critical**: wrong card moved; an existing consumer file overwritten; `--check` failing spuriously
in CI.

**Non-Critical**: chattiness, wording, template defaults.

---

## Progress Tracking

### Phase 1: `changes-requested`

- [ ] Wired into the QA fix cycle, both trackers
- [ ] Per-cycle firing documented as deliberate

### Phase 2: `pr-merged`

- [ ] Wired into `develop-next` and `develop-batch` post-merge ticks
- [ ] Fires per item inside the serial merge loop

### Phase 3: Scaffolding

- [ ] `setup-consumer.sh` writes when absent, never overwrites
- [ ] `--init-workflow [--force]` on both CLIs
- [ ] JSON-record → YAML conversion

### Phase 4: `--check`

- [ ] All validation rules
- [ ] Non-zero on drift; 0 without credentials; `--offline` mode

### Phase 5: Parity, READMEs, docs

- [ ] `develop-bug` signals `in-qa` + `ready-for-merge`
- [ ] QA-loop parity test
- [ ] READMEs corrected + checklist row
- [ ] `project.yml` documented

---

## References

- **Depends on**: task.37 (moments declared), task.38 (Jira execution), task.39 (`gh-stage.js`),
  task.40 (step wiring)
- **Scaffolding precedent**: `scripts/setup-consumer.sh:307-317` — the existing
  "already exists → keep" pattern
- **Preserve-intent precedent**: `jira-sync.js:2731` (`buildWorkflowRecord`)
- **The unmet claim**: `jira-sync.js:1812` — "meant to be `--check`ed in CI"
- **Stale READMEs**: `skills/develop-story/README.md:25,475-478`,
  `skills/develop-task/README.md:23,457-460`

---

## Notes

### Important Reminders

- Both new moments must be **absent** from the default `pipeline:` map. A moment that defaulted on
  would move cards into columns nobody asked about, on upgrade, with no one having chosen it.
- `--check` is the one non-zero-on-failure mode in this family. Comment it, test it, and expect
  someone to try to harmonise it.
- `pr-merged` fires inside `develop-batch`'s per-item merge block, not once per batch.

### Known Issues

**Open** (non-blocking):

- ⚠️ `project.yml` remains a second config file. Documented here; consolidation deliberately deferred.
