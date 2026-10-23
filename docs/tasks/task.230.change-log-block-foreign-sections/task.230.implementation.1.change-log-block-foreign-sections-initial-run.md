# Implementation Report: Keep foreign sections out of the change-log block

**Task**: `task.230.change-log-block-foreign-sections.md`
**Run Number**: 1
**Started**: 2026-10-22 21:35
**Status**: Completed

---

## Summary

Lift sibling sections out of the change-log marker block in `change-log.js`, anchor the Deferred Work placement rule on the marker, repair four task documents and add a corpus guard (develop-next autonomous run, roadmap item T230).

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
| Board status        | In Progress ✅ (gh-stage: transitioned, re-read `already`)               |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done | Branch `feature/task.230.*` exists in git                              | Branch created at `344f552b` | —                    | 2026-10-22T21:33Z |
| 2. review-task             | ✅ Done | `task.230.review.{N}.{name}.md` exists (or skip logged)                | READY TO IMPLEMENT 8/10; review.1; Planned → Ready for Development | —                    | 2026-10-22T21:38Z |
| 3. develop                 | ✅ Done | Task status == `Ready for Review`                                      | Inline (plan + map); 1 iteration; audit 15/15 ready-for-review; ci:fast 6221 pass / 0 fail | docs/tasks/task.230.change-log-block-foreign-sections/.summaries/step-3-iteration-audit-1.json | 2026-10-22T21:52Z |
| 4. create-pr               | ✅ Done | PR URL; issue comment posted                                           | PR #735: https://github.com/Gamaroff/agent-skills/pull/735 | — | 2026-10-22T21:55Z |
| 5–6. qa-task / qa-fix loop | ✅ Done | `task.230.qa.{N}.*.md`; `task.230.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE` or `CONCERNS` (Step 5c); PR comment posted | 4 cycles: FAIL 60 → CONCERNS 70 → CONCERNS 70 → PASS 95 (route 2b, 2 lows carried); 5c APPROVE (pr-review.1) | —                    | 2026-10-22T23:20Z |
| 7. finalise                | ✅ Done | `task.230.dod.{N}.*.md`; task `status: accepted`                       | dod.1 ACCEPTED (15/15); acceptance commit 27d41e80; issue #734 closed; board Done (`already`) | —                    | 2026-10-23T00:00Z |
| 8. commit-changes          | ✅ Done | All artifacts committed and pushed                                     | Implementation report committed and pushed | —                    | 2026-10-22T23:12Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-10-22

- Invoked by `/develop-next` (roadmap item T230) with `--defaults` and the AUTONOMOUS RUN directive.
- Phase 0 run inline (no Explore fan-out): the path was given exactly, and the three detector inputs were read from the document directly — risk_level absent, phase_count 4, single_module false → `PIPELINE_MODE=standard`.
- Previous run check: no `feature/task.230.*` branch, no PR, no implementation report → fresh start.
- Status `planned` → proceed; Step 2 `/review-task` validates and promotes.
- Feature branch base: develop — source: recommended (`--defaults`; on `develop`)
- PR target branch: develop — source: recommended (`--defaults`)
- Mode: standard — source: detector
- Skips: none — source: none
- Questions asked: 0 (`questions[]` empty under `--defaults`)
- qa-planning gate: skipped (auto — no prompt)
- Branch: `feature/task.230.change-log-block-foreign-sections` from develop @ 344f552b, pushed with upstream; report stashed/restored around branch creation.
- Lock written at current_step 2; §0d answers persisted into it.
- Tracker #734: work-started comment `posted`; board work-started → In Progress (`transitioned`). P2 priority default block not run (issue created by create-task, which sets Priority).
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md

### Step 2 — review-task

- Gate: status `Planned`, no review report → ran `/review-task` (output: Comprehensive report — required for pipeline audit trail).
- review-task Step 8.5 auto-answered: Yes, apply all critical + important fixes; Step 9 auto-answered: Yes, fixes complete.
- Pre-pass agents B and C dispatched (Explore): B `aligned` (generic axes_checked — weak), C `not-implemented`.
- Review report: docs/tasks/task.230.change-log-block-foreign-sections/task.230.review.1.change-log-block-foreign-sections.md (reviewed_blob stamped).
- Key fix: the foreign-section partition must run inside `splitCarriedLines` before table classification, or a foreign section holding its own pipe table loses that table to the log. Plan and task updated.
- Planned promoted to Ready for Development by review-task.
- Tracker key re-read: #734, unchanged — no re-fire.
- Review outcome comment skipped — review-task reported `posted` (stage review-task).

### Step 3 — develop

- Fast gate precondition: `develop.fastGateCommand` unset → suggested `npm run ci:fast`; resolves in package.json.
- Pre-develop surface map: 9 files identified in shared/resources (change-log.js and its tests, the QA-loop step doc, the change-log spec), evals/shared/tests (new guard), tests/ (placement test) and docs/tasks (four repairs). Built inline from the review pass, which had already read every file the plan names — no Explore dispatch; independence loss: the map is the reviewer's own.
- Plan file found: docs/tasks/task.230.change-log-block-foreign-sections/task.230.plan.change-log-block-foreign-sections.md — included as implementation context for /develop.
- Step 3 inline — /develop not invoked: the plan names every hunk and the surface map was already recorded; the inline path wrote the one develop Change Log row.
- Phase 1 red first: 11 new section-K tests in shared/resources/tests/change-log.test.mjs, all 11 red before the engine change, 97/97 green after.
- Engine: `partitionForeign` runs inside `splitCarriedLines` over the `[line, fenced]` pairs, before table classification (the review's fix). `foreignSections` reads it; `rebuildChangeLog` (extracted from `upsertChangeLog`) applies it for both `upsertChangeLog` and the new `liftForeignSections` (newRow null). The lifted-before seam is head, blank line, section, marker — what the next write produces — so the idempotence case holds byte for byte.
- Mutation proof 1: `partitionForeign` made to return every line as the log's own → 10 K tests red (K8, the controls, stays green as it must); restored, `cmp` clean.
- Mutation proof 2: table boundary at the first pipe line instead of the first entry row → K3 and K9 red; restored. A first attempt (boundary forced onto the `| Date |` fallback) was survived — the fallback finds the same line in every fixture — so it is recorded and not counted.
- Callers unchanged: sync-jira-task/story/epic/bug, tracker-reconcile, jira-sync-publishing-fidelity, qa-results, status-history, deferred-work-placement — 573 pass, 0 fail, no expectation changed.
- Phase 2: the Deferred Work rule reworded to finalise 7.4's marker-anchored words; the Markers section of document-change-log.md gains an "only the log lives inside the markers" paragraph; tests/deferred-work-placement.test.js comment reworded plus a new assertion, calibrated red against the old step doc and green on the new. `npm run bundle`: no closure change, no untracked copies.
- Phase 3: corpus guard evals/shared/tests/change-log-foreign-section-corpus.test.mjs — red on the unrepaired tree, naming exactly task.166/170/175/203; a positive-control test plants a section into a live document. The first plant used `String.replace` on the marker string and landed in the task document's own fenced example (a document about this engine quotes the marker); fixed to splice at `findChangeLog`'s offset. 120 marker blocks scanned; floor 100.
- Repair: four documents through `upsertChangeLog` (row "Change-log block repaired — DoD section moved above the markers (task.230)", author develop-task, version blank) plus `bumpUpdated`; `--check-append-only --against develop` ok on each; each diff is the DoD move plus one row. Guard green.
- Phase 4: CHANGELOG entry under Unreleased → Changed.
- Fast gate (`npm run ci:fast`, `.agents/skills` moved aside and restored): TEST_EXIT=0 — 6235 tests, 6221 pass, 0 fail.
- Loop audit iter 1 (Explore): ready-for-review, 15/15 → loop exit.
- Development completion comment posted to github issue 734 (`posted`).

### Step 4 — create-pr

- SCOPE_PATHS (58 entries, `.claude/state/step4-scope-paths.txt`): the work-item dir, CHANGELOG.md, the four repaired task dirs, shared/resources, shared/resources/tests, tests, evals/shared/tests, and 49 `skills/*/references` dirs from the bundle.
- Pre-flight guard: 0 out-of-scope untracked files held. Report links: `doc-links.js` ok (0 relative links).
- /commit-changes made three commits: fae7f683 feat(change-log), db88d9e6 docs(tasks) repairs, 46794bb9 docs(task.230). Leak check over all three: OK.
- PR body written by the orchestrator, not the Explore summariser: the diff was authored in this session and every hunk was already known. github-body-text.js passed.
- PR created: https://github.com/Gamaroff/agent-skills/pull/735 (base develop). Issue #734 in-review comment: `posted`.
- GitHub board: in-review → stage-disabled (no `in-review` moment in tracker-workflow.yaml).
- Post-PR state check: PR #735 state = OPEN. errors = 0.
- Threat Radar circuit-breaker hook blocked one Write (more than 10 file changes in 30s) during the report update. The Bash splice that followed failed before writing anything (tree verified clean). Retried once after slowing down; the hook was not bypassed.

---

- **Step 7 — CI readings**: CI reading 1: SUCCESS @ d40f65521968 over 6 checks (the acceptance decision). CI reading 2: SUCCESS (tree-equivalent to d40f65521968) @ 27d41e80144b, over 6 checks after 30 s. The acceptance head's own `test` lane was still running; the docs-only rule (task.172) satisfied the reading.
- **Step 7 — DoD**: dod.1 ACCEPTED. The AC agent returned PARTIAL on AC8 alone: the corpus-guard figure was recorded on b2b0d4bb, not the head. Re-measured on d40f6552: 0.941 s at load 2.35. Recorded as a deviation in dod.1.
- **Step 7 — tracker**: Document link already on `develop`; `done` comment posted; issue #734 closed and re-read CLOSED; board `done` → `already`. Canonical PR comment posted, reporting 4 QA cycles. The skill's `^### (QA|Verify) Cycle` grep would have counted 7, because this report wrote the qa-fix subsections as `###`. They are now `####`, so the count reads 4.

## Issues Log

_Problems encountered and how they were resolved or escalated._

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-10-22
**Gate Result**: FAIL
**Issues Found**: 2 promoted — TASK-230-CR-1 (high: a foreign date-first table is taken as the log), TASK-230-CR-2 (medium: the no-entry-row fallbacks split a foreign table); CR-3 advisory (same root cause); CR-4 cleanup
**HIGH findings**: 1
**MEDIUM findings**: 1
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### QA Cycle 1 — qa-fix (5b)

- Findings ingested inline (Step 1b): the gate was written in this session and holds two entries; no ingester dispatched. Independence loss recorded: the fixer is also the gate's author.
- Fix: `partitionForeign` now picks the log's table by what it is, among the table runs at or after the removed Change Log heading: the first whose header reads `| Date | Version |`, else the first holding an entry row, else the first headed `| Date |`. The two weaker rules are limited to runs before the first foreign heading at or after the log's heading. With no candidate and a heading, the log starts at the heading. Before the table, a foreign section ends at the next foreign heading, at the log's heading, or at the table. `splitCarriedLines` records `headingAt` where it drops the heading.
- First attempt (anchor the table at the first pipe line after the heading) failed the task.203 shape, where the DoD section sits between the heading and the table: 10 tests red. Replaced, not patched further.
- New tests K12–K16: CR-1 (before-side dated table), CR-3 (foreign table flush against the heading), CR-2 (no log table), K14 (after-side dated table under an unparseable log), K15 (an authoring note under the heading stays when a section above is lifted). K15 was red before the fix too: the cycle-1 rule lifted the note along with the section above it, a fourth shape of the same root cause, found by the fix pass.
- Mutation proofs, each killed by the predicted test:
  - candidate runs scanned from 0 instead of the heading → K12 and K16 red
  - claim filter dropped → K14 red
  - heading reset dropped → K15 red
  - no-candidate fallback removed → K13 red
- Corpus property check, in memory, over all 120 tracked marker blocks: upsert leaves nothing foreign, keeps every entry plus the row, and is idempotent. 0 problems. Uncalibrated on the corpus, which holds none of the cycle-1 shapes; the K tests carry the calibration.
- Known limit: a foreign section between the heading and the log whose own table has exactly the log's header is still read as the log. The structure cannot tell the two apart. Recorded, not patched.
- CR-4: `upsertChangeLog`'s JSDoc moved back above it.

Probe: comm -23 <(git grep --full-name -l -F -i -e 'first entry row' -- skills/*/SKILL.md skills/*/references/*.md shared/resources/*.md) <(generated copies)
  (no executed Markdown document restates the rule; the edited file is change-log.js, whose header comment is the one statement)
  docs/tasks/task.230…/task.230.change-log-block-foreign-sections.md §3 — updated (now cites the header comment)
  docs/tasks/task.230…/task.230.plan.change-log-block-foreign-sections.md Phase 1 — updated (cites)
  docs/tasks/task.230…/task.230.review.1….md — unaffected — historical record of the review's decision
  shared/resources/document-change-log.md — unaffected — says only that a section's pipe table moves with it, still true
  CHANGELOG.md — unaffected — states the lift, not the boundary rule
Population: 2 (both work-item documents)
Move: consolidate — both now cite the one statement instead of restating it

### QA Cycle 2 — 2026-10-22
**Gate Result**: CONCERNS (70/100)
**Issues Found**: 4 promoted — TASK-230-CR2-1 (medium, regression: a `Version | Date` log behind a DoD leaves the markers), CR2-2 (medium: a foreign Date/Version table beats the log), CR2-3 (medium: a headingless block takes a foreign table), CR2-4 (low: a doubled heading does not converge on the first write)
**HIGH findings**: 0
**MEDIUM findings**: 3
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — route `continue` (not-a-pass-gate; route 2 below-cycle-floor)
**Action**: Running qa-fix (cycle 2 of 5)

#### QA Cycle 2 — qa-fix (5b)

- Findings ingested inline: the gate was written in this session and has four entries. Independence loss recorded: the fixer is also the gate's author.
- Fix: position decides first, then shape.
  - With a heading, the first table run in the log's own section is the log's, whatever its header. Only when that section has none does the search look past a foreign heading, first for a log-shaped run (a header naming Date plus Version, Description, Change(s) or Author, in any order), then for entry rows.
  - Headingless: a log-shaped run anywhere, else an own-section run with entry rows, else the first own-section run.
  - Any Change Log heading ends a before-side foreign run, and a repeated one is dropped.
  - `LOG_HEADER_CELLS` is the one list of log header cells. The rule is stated once, in `partitionForeign`'s header comment.
- New tests K17–K22: the four reproduced shapes (K17–K20), a property test over the cycle-2 shapes (K21), and K22. K22 covers position beating shape, which no reproduced shape tested: K18's own table happened to be log-shaped too. K17–K21 were red before the fix. K22 was added after the fix and proven by mutation E.
- K21 compares the log's own header and separator out of the multiset. The writer renders a non-canonical log header in the canonical form, and the base engine does the same (verified), so that rewrite is pre-existing, not a loss.
- Mutation proofs, each killed by the predicted test:
  - E: own-section-first dropped → K22 red
  - F: past-foreign shape search dropped → K17, K2, K3, K11 and others red
  - G: headingless picks the first run → K19, K21 red
  - H: repeated heading kept → K20 red
- Corpus property check over all 120 tracked marker blocks: nothing foreign after a write, every entry kept, idempotent. 0 problems.
- Known limit, unchanged: a non-log table that is the first table in the log's own section is taken as the log.

Cycle-2 refute pass: Explore reviewer over the whole branch diff, 169.3 s. All four findings reproduced on the PR head and run against the `origin/develop` engine: all new to this change. The four cycle-1 guards were re-proven (covered).

### QA Cycle 3 — 2026-10-22
**Gate Result**: CONCERNS (70/100)
**Issues Found**: 3 promoted — TASK-230-CR3-1 (medium: a Date/Author sign-off table counts as log-shaped), CR3-2 (medium, regression against the cycle-2 head: headingless block prefers a log-shaped foreign table), CR3-4 (low: a deeper `### Change Log` heading is dropped); CR3-3 and CR3-5 advisory
**HIGH findings**: 0
**MEDIUM findings**: 2
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — route `continue` (not-a-pass-gate; route 2 declined: product-defect-signal)
**Action**: Running qa-fix (cycle 3 of 5)

#### QA Cycle 3 — qa-fix (5b)

- Findings ingested inline; independence loss recorded as in earlier cycles.
- Fix:
  - `LOG_HEADER_CELLS` drops `author`, so Date plus Author (a sign-off header) is no longer log-shaped (CR3-1).
  - One pick order now serves both branches: first own-section log-like run (log-shaped or dated) → first log-shaped run anywhere → first own-section run → with a heading, a dated run past a foreign heading (CR3-2, plus advisory CR3-3).
  - The repeat-heading drop applies only at the log's level or shallower (CR3-4).
  - CR3-5 (advisory) is not fixed: an after-side Change Log heading inside a foreign run still leaves with it.
- New tests K23–K27. K23–K26 were red before the fix. K27 was added after mutation L (order swap) redded nothing: K24 turned out to be held by the Author change, not by the order. K27 red under L.
- Mutation proofs, each killed by the predicted test:
  - I: `author` restored → K22, K23 red
  - J: own log-like → own[0] → K25 red
  - K: level check dropped → K26 red
  - L: order swapped → K27 red
- Corpus property check over all 120 blocks: 0 problems. Caller suites 564/0.

Scoped review (2 files since gate 2), 199.0 s. All five findings reproduced; the four cycle-2 guards re-proven (covered).

### QA Cycle 4 — 2026-10-22
**Gate Result**: PASS (95/100)
**Issues Found**: 2 promoted at low — TASK-230-CR4-1 (a log-shaped foreign table outranks a non-log own table), TASK-230-CR4-2 (a deeper Change Log heading inside a foreign run does not converge); CR4-3 advisory; 2 cleanups
**HIGH findings**: 0
**MEDIUM findings**: 0
**PR Review**: ✅ APPROVE — `task.230.pr-review.1.change-log-block-foreign-sections.md` (conformance lens, effort medium; PC-1 and PC-2 both low)
**Loop exit**: Cosmetic-residue exit taken — PASS gate at cycle 4 with HIGH 0 for cycles 3 and 4; all 2 open findings are LOW and are carried to the gate's recommendations.future by id (TASK-230-CR4-1, TASK-230-CR4-2). This is a CLEAN exit, not a stall: nothing is blocked and nothing is being accepted over; a full qa-fix cycle for cosmetic findings is what this route exists to avoid.
**Action**: Proceeding to 5c (PR conformance review)

Scoped review (2 files since gate 3), 319.1 s. The reviewer prompt carried a plausibility scope note: name a writer or template before rating a finding above low. All four cycle-3 guards were re-proven. Deferred Work H2 written before the change-log block.

**Carried to 6a**: docs/tasks/task.230.change-log-block-foreign-sections/task.230.pr-review.1.change-log-block-foreign-sections.md

5c findings:
- **PC-1** (recorded, not fixed at 5c: the implementation report belongs to Step 8). The Performance criterion figure: corpus guard `evals/shared/tests/change-log-foreign-section-corpus.test.mjs` at 0.726 s wall, load average 1.32, on head b2b0d4bb, against a 5 s bound. Re-measured at /finalise on the PR head d40f6552 (clean code tree), as the Performance criterion asks: `uptime; time command node --test evals/shared/tests/change-log-foreign-section-corpus.test.mjs` gave 0.941 s real at load average 2.35 (2 pass, 0 fail).
- **PC-2** (resolved by running it, no edit). Full `npm run ci` with `.agents/skills` moved aside and restored, on PR head d40f6552: CI_EXIT=0. Every chained step passed: format:check, test (6251 tests, 6237 pass, 0 fail), eval:all, validate:all, check:generated, bundle:check, lint:shell, lint:secrets. The Phase 4 box stays ticked.
- `ready-for-merge` stage: `stage-disabled` (expected on this board).

---

## Completion

**Finished**: 2026-10-22T23:12Z
**Final Status**: Completed
**Branch**: feature/task.230.change-log-block-foreign-sections
**PR**: https://github.com/Gamaroff/agent-skills/pull/735
**QA Iterations**: 4 (plus Step 5c PR review: APPROVE)
**DoD Summary**: `task.230.dod.1.change-log-block-foreign-sections.md` — ACCEPTED
**Tracker debt**: none

### Completion Summary

Implemented the lift of foreign sections out of the change-log markers. `partitionForeign` in `shared/resources/change-log.js` is one partition that `upsertChangeLog`, `foreignSections` and `liftForeignSections` all read. The work also anchored the Deferred Work placement rule on the marker, repaired task.166/170/175/203, and added a corpus guard over every tracked block.

QA took 4 cycles. Cycles 1–3 each hardened how the log's table is chosen: by heading anchor, then own section first, then a sign-off table is not a log. 16 engine mutations were proven. The two low residuals left at cycle 4 were carried to Deferred Work by route 2b. The 5c conformance review approved, and full `npm run ci` is green.

Notable decisions: the table choice is stated once, in `partitionForeign`'s header comment; the K21 property test excludes the log's own header, because the writer normalises it, as the base engine already did; and AC8 was re-measured on the PR head at finalise.
