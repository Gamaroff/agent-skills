# Implementation Report: QA applies the finalise DoD's rules before finalise does

**Task**: `task.248.qa-applies-finalise-rules.md`
**Run Number**: 1
**Started**: 2026-11-01 17:52
**Status**: In Progress

---

## Summary

Give the four finalise-DoD rules QA skips (boundary classification, quantifier rule, unapproved criterion amendments, CHANGELOG citation) one runnable definition each, and wire QA to run them.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | not set                                                                    |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Tracker Issue       | #801 (GitHub)                                                              |
| Board status        | In Progress ✅ (transitioned from Todo, verified)                          |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.248.*` exists in git                             | Branch created at `4cbfa679` | —                    | 2026-11-01T17:53Z |
| 2. review-task             | ✅ Done | `task.248.review.{N}.{name}.md` exists (or skip logged)               | `task.248.review.1.qa-applies-finalise-rules.md` — READY TO IMPLEMENT 8/10; Planned → Ready for Development | —                    | 2026-11-01T17:58Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | 4/4 phases, 1 iteration; `npm run ci` 6952/0 | —                    | 2026-11-01T18:27Z |
| 4. create-pr               | ⏳ Pending | PR URL; issue comment posted                                           |       | —                    |                 |
| 5–6. qa-task / qa-fix loop | ⏳ Pending | `task.248.qa.{N}.*.md`; `task.248.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted |       | —                    |                 |
| 7. finalise                | ⏳ Pending | `task.248.dod.{N}.*.md`; task `status: accepted`                      |       | —                    |                 |
| 8. commit-changes          | ⏳ Pending | All artifacts committed and pushed                                     |       | —                    |                 |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-01

- Feature branch base: develop — source: asked (Recommended accepted)
- PR target branch: develop — source: asked (Recommended accepted)
- qa-planning gate: skipped (auto — no prompt)
- Mode: standard — source: detector. Phase 0 run inline (no subagents; Explore subagents have hung before). Inputs: risk_level absent (risk_ok true), phase_count 4 (not < 3), single_module false (shared/resources + 5 skills) → standard.
- Skips: none. Refused flags: none.
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, tech-stack.md, source-tree.md (from skills-config.yaml devLoadAlwaysFiles, all present).
- Task status at start: Planned — Step 2 (/review-task) validates and promotes.
- AskUserQuestion: 2 questions asked (Q1 base, Q2 PR target), matching the required count from `questions[]`.

### Step 1 — create-branch

- Branch `feature/task.248.qa-applies-finalise-rules` cut from `develop` at `4cbfa679`, pushed with tracking. Report stashed and restored cleanly.
- Lock written at `current_step: 2` with answers persisted.
- Tracker comment (work-started): posted. GitHub board: work-started → transitioned Todo → In Progress (verified). Priority already P2 Medium — left alone.

### Step 2 — review-task

- review-task invoked: output = Comprehensive report (pipeline default); Step 8.5 auto-answered "apply all critical + important fixes"; Step 9 auto-answered "Yes, fixes complete".
- Review report: `docs/tasks/task.248.qa-applies-finalise-rules/task.248.review.1.qa-applies-finalise-rules.md` — READY TO IMPLEMENT, 8/10, 0 critical / 5 important / 2 optional, all applied. `reviewed_blob` stamped.
- One owner question asked (genuine design choice): drift engine splits `reworded`/`appended`; owner chose the recommended split.
- Pre-pass agents B/C run inline rather than as Explore subagents — independence loss recorded in the review report.
- Planned promoted to Ready for Development by review-task. Tracker key unchanged (#801). Review outcome comment skipped by orchestrator — review-task reported `posted` (stage review-task).
- Step 2 artifacts committed (`362cfe90`) so the drift engine's reviewed base exists as a commit.

### Step 3 — develop

- Codebase map and loop audit run inline, not as Explore subagents: they hung three times in an earlier session. Independence loss: no second reader mapped the surface.
- Implementation inline from the committed plan file plus the map. One iteration: all four phases landed.
- `criteria-section.js` (new, pure) holds the criteria reader that `finalise-rerun-scope.js`, `probe-boundary-signals.mjs` and `criteria-drift.js` share. It is a separate file because reusing `jira-sync.js`'s `extractSection` would vendor jira-sync's closure into `review-security`. A parity test holds it against jira-sync over every task and story document.
- `criteria-drift.js --base-from-review <target>` picks its base in this order: the review report's `reviewed_blob` if git can read it, then the commit that added the review report, then `merge-base HEAD origin/<target>`. `reviewed_blob` is a `git hash-object` without `-w`, so it is readable only once a commit carries the exact reviewed bytes.
- `changelog-cites.sh` checks the file before the kind, as 6d did, so a story in a repository with no `CHANGELOG.md` is still told "no CHANGELOG.md". 6d gained one HALT, `changelog-stem` (exit 2: a stem `doc-id.js` cannot read), named in the heading, the checklist and the runbook, as the finalise-publish-boundary test requires.
- **Deviation from the plan, gate read-back.** The task asked for "a fenced block in each QA skill". The two checks went into `qa-read-back.js` instead, which both skills already run from one fenced block. obs #164 replaced exactly such paired blocks with that script after three cycles of gaps. The wiring test runs the shipped read-back block from each skill.
- The read-back does not require a `criteria_drift` block: requiring it would refuse every gate written before this task (19 existing read-back cases). It does require an answer on each `appended` entry a block carries.
- Story stems pass through `changelog-cites.sh` as not applicable (exit 3), as 6d did. qa-story still runs the check, so a story never reads as checked when it was skipped.

**Mutation proofs** (each reverted the deciding branch, saw the named test go red, then restored it green):

| Engine | Mutation | Red test |
| ------ | -------- | -------- |
| boundary CLI | `no-criteria` arm removed | `CLI: a document with no criteria section reports no-criteria, exit 1` |
| criteria-drift | `approved` match emptied | `task.234: the approved wording is approved` |
| criteria-drift | continuation read disabled | 8 drift tests |
| changelog-cites | enforcement-off exit 3 → 0 | `[bash] 3 not applicable…` and `[bash] 6d's HALT and not-applicable lines are unchanged` |
| qa-read-back | boundary check never fires | `task.248: a criteria signal with boundary: false and no reason halts` |
| qa-task drift block | jq selector `!= "appended"` → `== "MUTANT"` | `[qa-task/bash] the drift block makes an unapproved rewording a MEDIUM` |

- Loop audit (inline): 4/4 phases complete, every Phase checkbox and Progress Tracking item ticked, status → Ready for Review, one `develop` Change Log row. Development completion comment posted to GitHub issue #801 (`posted`).

zsh is not installed on this laptop, so the `[zsh]` cases skipped locally. CI installs zsh (`test.yml`), and `ci-tool-skips` fails CI if they skip there.

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- **Step 3, full CI run 1: formatting.** Prettier flagged 12 files, so nothing after `format:check` ran. Formatted with `prettier --write`, re-bundled.
- **Step 3, full CI run 2: 7 of 6952 tests red, two real defects.**
  - `probe-boundary-signals.mjs`'s entry guard compared `import.meta.url` with `argv[1]` without `realpathSync`. Through the `.agents/skills` symlink the CLI ran nothing and exited 0, and I reproduced that on the bundled copy. It now resolves real paths on both sides, as `security-probe.mjs` does (`entrypoint-guard-realpath.test.mjs`, obs #126).
  - `tests/qa-read-back-block.test.js` installs a fixed list of `qa-read-back.js`'s siblings, and the list lacked `yaml-subset.js`, `probe-boundary-signals.mjs` and `criteria-section.js`. The read-back then exited 2, "could not look". All three are added to the list.
  - Per-file runs missed both, because neither ran the consumer-shaped install.
- **Step 3, full CI run 3:** 6952 pass, 0 fail, with `.agents/skills` moved aside. `CI=true` ci-tool-skips fails locally only on `zsh`, which this laptop lacks. CI installs it.

---

## QA Iteration History

_Track each QA review/fix cycle._

---

## Completion

**Finished**: {populated at end}
**Final Status**: {Completed / Failed / Escalated}
**Branch**: feature/task.248.qa-applies-finalise-rules
**PR**: {populated after Step 4}
**QA Iterations**: {populated at end}
**DoD Summary**: {populated after Step 7}
**Tracker debt**: {populated after Step 7 — "none", or "{N} action(s) outstanding — see ## Tracker Actions Required"; reconcile later with /tracker-reconcile}
