# Implementation Report: A git-name sink for classifiers of repository names

**Task**: `task.329.git-name-probe-sink.md`
**Run Number**: 1
**Started**: 2026-11-26 13:36
**Status**: Completed
**Report format**: 2

---

## Summary

Add a `git-name` corpus sink and route name classifiers (`isDocsPath`) to it, so task 325's finalise probe tests what the function promises.

---

## Pipeline Configuration

| Setting             | Value                                                                      |
| ------------------- | -------------------------------------------------------------------------- |
| Feature branch base | develop                                                                    |
| PR target           | develop                                                                    |
| qa-planning gate    | skipped (auto)                                                             |
| Task risk level     | low                                                                        |
| Pipeline mode       | standard                                                                   |
| Always-load files   | 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md |
| Board status        | In Progress ✅ (gh-stage: transitioned)                                     |
| Tracker Issue       | #955 (GitHub)                                                              |

---

## Pipeline Progress

| Step                       | Status     | Required Artifacts                                                     | Notes | Subagent summary ref | Completed (UTC) |
| -------------------------- | ---------- | ---------------------------------------------------------------------- | ----- | -------------------- | --------------- |
| 1. create-branch           | ✅ Done    | Branch `feature/task.329.*` exists in git                              | Branch created at `ad2b2fde1`; pushed | —                    | 2026-11-26T13:38Z |
| 2. review-task             | ✅ Done    | `task.329.review.{N}.{name}.md` exists (or skip logged)                | review.1: READY TO IMPLEMENT 8/10; 2 Important fixed; Planned → Ready for Development | —                    | 2026-11-26T13:40Z |
| 3. develop                 | ✅ Done    | Task status == `Ready for Review`                                      | Inline, 1 iteration; 3 phases; 4 tests; gate 8898/1 (load flake, passes alone) | —                    | (not measured) |
| 4. create-pr               | ✅ Done    | PR URL; issue comment posted                                           | [#956](https://github.com/Gamaroff/agent-skills/pull/956); in-review comment posted; body written inline (no summariser agent, the diff was fully known) | —                    | 2026-11-26T14:13Z |
| 5–6. qa-task / qa-fix loop | ✅ Done    | `task.329.qa.{N}.*.md`; `task.329.gate.{N}.*.yml`; `**PR Review**` row on the highest `### QA Cycle {N}` holds `APPROVE`, or `CONCERNS` with no open coverage finding (Step 5c); PR comment posted | 3 QA cycles, 2 fix cycles; gate 3 PASS 96/100 (cosmetic-residue exit, 2 LOW deferred); 5c CONCERNS, no open coverage | —                    | 2026-11-26T14:39Z |
| 7. finalise                | ✅ Done    | `task.329.dod.{N}.*.md`; task `status: accepted`                       | dod.1 ACCEPTED, 7/7; one Step 8a fix (`d71760925`, M12); acceptance commit `77ffe8890` | —                    | 2026-11-26T17:53Z |
| 8. commit-changes          | ✅ Done    | All artifacts committed and pushed                                     | this report committed and pushed | —                    | 2026-11-26T17:53Z |

> The `Subagent summary ref` column points to the JSON artifact described in `references/subagent-summary-artifact.md`. Use `—` for steps that don't dispatch a subagent or for in-flight pipelines started before this column existed.
>
> `Completed (UTC)` is the moment the step's row went `✅` — `date -u +%Y-%m-%dT%H:%MZ` — written once by the Step Transition Protocol and never overwritten on resume (task.201). Leave it empty for a step that has not finished.

---

## Decisions Log

### Pipeline Startup — 2026-11-26

- Feature branch base: develop — source: flag
- PR target branch: develop — source: flag
- Mode: standard — source: flag (detector also standard: 3 phases)
- Skips: none
- qa-planning gate: skipped (auto — no prompt)
- Questions asked: 0 (`--defaults`, all answered by flags)
- Phase 0 ran inline (no Explore fan-out); lite-mode inputs derived from the document: risk_level low, 3 phases, single module → standard
- Always-load files resolved: 3 files — docs/architecture/concepts/coding-standards.md, docs/architecture/concepts/tech-stack.md, docs/architecture/concepts/source-tree.md
- Task status Planned — Step 2 review promotes it
- Context: cut in this session from task 325's DoD run 1 gaps; task 325's lock is parked at `.claude/state/parked-task.325/` while this run holds the lock. User approved auto-merge on green for this task.
- Branch: feature/task.329.git-name-probe-sink (from local develop at `ad2b2fde1`, which carries the unpushed task-filing commit; it rides this PR)
- Tracker comment work-started: posted. GitHub board: work-started → transitioned.

### Step 2 — review-task

- review-task output: Comprehensive report (pipeline default). Step 8.5 auto-answered: apply all critical + important fixes. Step 9 auto-answered: fixes complete.
- Review report: docs/tasks/task.329.git-name-probe-sink/task.329.review.1.git-name-probe-sink.md (reviewed_blob stamped)
- Planned promoted to Ready for Development by review-task
- Review outcome comment: review-task reported `posted` (stage review-task-1), so Step 2's own comment was skipped (one event, one writer)

### Step 3 — develop

- Plan file found: docs/tasks/task.329.git-name-probe-sink/task.329.plan.git-name-probe-sink.md — included as implementation context for /develop
- Pre-develop surface map: inline. `isDocsPath` (ci-tree-equivalence.js:167), corpus module and peer, three routing docs, two test files, all read during task authoring and review this session
- Step 3 inline — /develop not invoked: the plan names every hunk and the files were already mapped
- TDD: `FLOORS["git-name"]` and the `path`-pin test went in first. Two tests went red (no floor for a known sink; `corpusFor` throws), then green once the sink was added
- Deviation from plan: the `trailing-slash` input is `docs/guides/`, not `docs/`. `docs/` is already in `finalise-dod-security-prompt.md`, and `finalise-dod-prompt-contract.test.mjs` refuses a prompt that restates a whole corpus input. The new input still reproduces under the segment mutation
- Added a `␁` glyph for U+0001 to `renderInput`'s `CONTROL` map, so the generated table carries no raw control byte (the review's optional finding). The legend line in the `.md` names it
- Cross-branch check: task 325's branch moves the control, segment and normalise refusals into a `hasPathFormDefect` helper. The anchors now accept both spellings, and exactly one must occur exactly once. All three task.329 tests pass against 325's `ci-tree-equivalence.js`, swapped in and then restored (`git diff --quiet` afterwards). Calibration: a reworded control line turns the mutation test red, naming the anchor
- Fast gate run 1: red on `prettier --check` (2 files). Fixed with `prettier --write`
- Fast gate run 2: 8898 pass, 1 fail. The failure is `push-policy.test.mjs:1498` ("push-held says what is the remote's…"), which took 139 s under the full suite. Re-run alone, it passes in 26 s. The diff does not touch push-policy, so this is recorded as a load flake, and CI decides
- Status: Ready for Development → Ready for Review
- Mutation proof (in the test itself): at HEAD 22/22 cases hold. With each refusal line removed, exactly the listed hostile cases reproduce and nothing legitimate is refused. Every hostile id is reached by some mutation

### Step 7 — finalise

- DoD run 1: `task.329.dod.1.git-name-probe-sink.md` — ✅ ACCEPTED, 7/7 criteria; security PASS (`boundary: false`), compliance N/A, docs PASS
- First AC pass failed #4: three of § 8's four mutations had never been run. M8–M11 were run and recorded in qa.3 (`f43ad031c`)
- M12 (`git-name` dropped from the review prompt's list) survived. Step 8a fix-and-recheck, once: `d71760925` ends the review prompt's enumeration extract at "Pick by". Mutation-proved (M12 and M10 both red); evaluator exit 0 on all five preconditions
- Fast gate at `d71760925`: `npm run test:remote --timeout-min 60` 8902 tests, 0 fail. The first attempt timed out at 30 min (exit 124), masked as 0 by a trailing `echo`; caught from the output
- A stale `.claude/state/finalise-ac-result-1.yaml` from task 325 was nearly merged under task 329's ids; deleted and replaced with task 329's own YAML (recorded in the DoD)
- CI reading 1: SUCCESS @ d71760925 (6 checks); CI reading 2: SUCCESS (tree-equivalent to d71760925f0c) @ f0ac104af
- Acceptance commit `77ffe8890` (registry ticked; the 5c review and qa.3 mutation records carried). A one-line pr-review.1 correction followed as `f0ac104af`, before CI reading 2
- PR canonical comment posted; tracker `done` comment posted; issue #955 closed; board `done`: already

---

## Issues Log

_Problems encountered and how they were resolved or escalated._

- Step 2: review pre-pass agents B and C did not run. The review was done inline, so there was no independent read of the document.
- Step 3: the cross-branch calibration edited the swapped-in `ci-tree-equivalence.js` with `node -e`, not the file-edit tool. The file was restored at once and verified with `git diff --quiet`.
- Step 3: one load-sensitive failure in fast gate run 2 (push-policy push-held, 139 s). It passed alone; see Decisions Log.

---

## QA Iteration History

_Track each QA review/fix cycle._

### QA Cycle 1 — 2026-11-26
**Gate Result**: PASS
**Issues Found**: 3 LOW. Each is a wording error in the new corpus prose that QA confirmed against the source: T329-QA-1 (core.quotePath), T329-QA-2 ("no `..`"), T329-QA-3 (`.git` spellings)
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (mapper not dispatched — the Success Criteria are six rows, each mapped by hand in the QA report)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 1 of 5)

#### qa-fix (5b)
- Ingester subagent not dispatched: the gate was written in this session, and its 3 entries were already in hand
- T329-QA-1, T329-QA-2, T329-QA-3: reworded in `security-input-corpus.mjs`; the three `.md` rows updated from `renderCorpusTables()`; bundle regenerated (`bundle:check` 0 problems)
- Probe: the population command for `core.quotePath`, `with no \`..\` in it` and `only a segment equal to`. The corpus `.mjs` and `.md` were updated. The plan's `dotfile` line was updated. The other `core.quotePath` hits (`develop-pipeline-step-5-6-qa-loop.md`, `qa-re-review-scope.md`, finalise, qa-story and qa-task SKILL.md) are unaffected: each passes `-c core.quotePath=false` and makes no claim about control characters. Population: 2 for each phrase. Move: patch — three distinct wording errors in the deliverable itself
- mutation-proven: one `.md` row reverted → "the prose peer contains the generated tables verbatim" red → covered
- Tests: `security-input-corpus.test.mjs` 24/24, `finalise-dod-prompt-contract.test.mjs` green, task.329 probe tests 3/3. Full fast gate not re-run for a string-only change; CI runs it on push
- changes-requested stage: stage-disabled

### QA Cycle 2 — 2026-11-26
**Gate Result**: CONCERNS
**Issues Found**: 2 MEDIUM, 3 LOW. All are corpus or comment texts that misstate `isDocsPath`. QA ran `isDocsPath` on each: T329-QA-4 (the `.git` spelling list is claimed complete, but `.git:` stream forms pass), T329-QA-5 ("only control characters are refused" is false both ways), T329-QA-6 (the "one refusal line" header), T329-QA-7 (the "since task.325" comment), T329-QA-8 (the regex-from-name rationale)
**HIGH findings**: 0
**MEDIUM findings**: 2
**Traceability**: skipped (unchanged from cycle 1; no criterion moved, criteria_drift clean)
**PR Review**: not reached — gate did not exit the loop
**Loop exit**: n/a — this exit not taken
**Action**: Running qa-fix (cycle 2 of 5)

#### qa-fix (5b)
- Ingester subagent not dispatched: the gate was written in this session, and its 5 entries were already in hand
- Narrowing residue: `shared/resources/security-input-corpus.mjs` (repeat subject: `repeat-subject.mjs` named it, and fix commit 6709861a4 changed it)
- Move: scope the claim. Both cycles found texts that claim more about `isDocsPath` than the case tests. Each text now states only the property its own input checks, and claims no complete list
- T329-QA-4: `dotfile` correct now settles only "a `.git` prefix is not internal". T329-QA-5: `non-ascii` correct now says a character above 0x7F is not refused for being non-ASCII. T329-QA-6: the header names the two cases that have two defences. T329-QA-7: the comment says the second spelling is on the unmerged task-325 branch. T329-QA-8: `plus-signs` names a name-as-pattern matcher or an unescaped glob compile
- Probe: the population command, run after the edit for each old phrase (`only control characters are refused`, `one refusal line removed`, `builds a regex from the name`, `since task.325`, `only a spelling of`), returned 0 hits. It was calibrated on the new phrase `not refused for being non-ASCII`, which returns the corpus `.mjs` and `.md`. Pre-edit sites: the corpus `.mjs` and `.md` (updated) and the plan's `dotfile` line (updated). CHANGELOG.md:14 and task doc § "Measured" say "each refusal line removed"; both are unaffected, since they describe the test, which also has a two-line row. Population: 2 to 3 per phrase
- mutation-proven: the `non-ascii` `.md` row reverted → "the prose peer contains the generated tables verbatim" red → covered
- Tests: `security-input-corpus.test.mjs` 24/24, `finalise-dod-prompt-contract.test.mjs` green, task.329 probe tests 3/3, `bundle:check` 0 problems, prettier clean
- Follow-up (not this PR): `isDocsPath` admits `.git:` NTFS stream spellings and U+0085. Identical on develop, so it is gate.2 `recommendations.future`
- changes-requested stage: stage-disabled

### QA Cycle 3 — 2026-11-26
**Gate Result**: PASS
**Issues Found**: 2 LOW prose cleanups: T329-QA-9 (`plus-signs` glob clause not exercised under `**`), T329-QA-10 (`IS_DOCS_LINES` comment overstates the two spellings). QA ran `isDocsPath` on 9 inputs, and every reworded claim holds
**HIGH findings**: 0
**MEDIUM findings**: 0
**Traceability**: skipped (unchanged since cycle 1; criteria_drift clean)
**PR Review**: CONCERNS — [task.329.pr-review.1.git-name-probe-sink.md](./task.329.pr-review.1.git-name-probe-sink.md) (conformance lens only, `--no-code`). PC-1 MEDIUM (pr_number missing; fixed in 5c), PC-2 LOW (criteria unticked; /finalise ticks them). No coverage finding
**Loop exit**: Cosmetic-residue exit (route 2b): HIGH 0 on gates 2 and 3, and this PASS gate's only open entries are LOW. T329-QA-9 and T329-QA-10 go to `## Deferred Work`
**Action**: Proceeding to 5c (PR conformance review). 5c returned CONCERNS with no open coverage finding, so the run exits to Step 7

---

## Completion

**Finished**: 2026-11-26T17:53Z
**Final Status**: Completed
**Branch**: feature/task.329.git-name-probe-sink
**PR**: [#956](https://github.com/Gamaroff/agent-skills/pull/956)
**QA Iterations**: 3 QA cycles, 2 fix cycles, plus one finalise Step 8a fix
**DoD Summary**: [task.329.dod.1.git-name-probe-sink.md](./task.329.dod.1.git-name-probe-sink.md)
**Tracker debt**: none
