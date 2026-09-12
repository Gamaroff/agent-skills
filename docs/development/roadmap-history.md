# Roadmap History

Completed phases from [`project-completion-roadmap.md`](./project-completion-roadmap.md), archived
at phase close so the live roadmap shows only what is still in play.

**Phases 1, 2, 3, 4 and 5 are archived here.**

**These rows still satisfy `deps:`.** A `deps:` entry naming a row that appears in no current phase
means _already shipped_, not a dangling reference — this file is where to resolve it.

Rows are preserved verbatim, including their `touches:` tags and acceptance annotations. The
delivery narrative for each item — what was found on the way, what was waived, what was deferred —
lives in the roadmap's own append-only Change Log, which is not duplicated here.

---

## PHASE 1 — tracker workflow: consumer-owned status ladder

A hand-authored `tracker-workflow.yaml` in the consumer repo declares the project's statuses **in
order** and maps each pipeline moment to one of them. Order is rank (a resumed run cannot drag a
card backwards) and order is the walk path (a gate column needs no graph authored).

Ordered so risk front-loads into the reversible parts: T36 is a pure deletion of generated text;
T37–T39 were inert until T40 wired the first live behaviour change. **As of T40 the GitHub path
is live** — a consumer's `tracker-workflow.yaml` now drives their board.

**The series is complete as of T41.** All eight moments have a call site, the file is scaffolded on
install without ever overwriting one, `--check` fails CI on drift, and all three develop pipelines
signal the same moments. Both moments T41 added remain **off by default** — absent from the built-in
`pipeline:` map — so a consumer who upgrades and changes nothing sees no new card movement.

### Independent fix

- [x] **T36** Stop `setup-consumer.sh` generating a narrowing `jira.statusMap` · deps: none · touches: setup-consumer!, docs-config~ · /develop-task docs/tasks/task.36.setup-consumer-statusmap-fix/task.36.setup-consumer-statusmap-fix.md

### Engine

- [x] **T37** `tracker-workflow.yaml` config engine + promoted YAML parser · deps: none · touches: workflow-engine!, docs-config~ · /develop-task docs/tasks/task.37.tracker-workflow-config-engine/task.37.tracker-workflow-config-engine.md

### Per-tracker execution ‖ (dependency-independent once T37 lands)

- [x] **T38** Jira: walk the status ladder + last-rung terminal restriction · deps: T37 · touches: jira-sync!, workflow-engine~, docs-config~ · /develop-task docs/tasks/task.38.jira-ladder-walking/task.38.jira-ladder-walking.md
- [x] **T39** `gh-stage.js` — GitHub Projects board engine · deps: T37 · touches: gh-stage!, workflow-engine~, docs-config~ · /develop-task docs/tasks/task.39.github-board-stage-engine/task.39.github-board-stage-engine.md

### Wiring — first live behaviour change

- [x] **T40** Replace the five inline GitHub GraphQL board blocks with `gh-stage.js` calls · deps: T39 · touches: pipeline-steps!, bundles!, gh-stage~ · /develop-task docs/tasks/task.40.github-pipeline-step-wiring/task.40.github-pipeline-step-wiring.md

### Capstone

- [x] **T41** New pipeline moments, workflow-file scaffolding, `--check`, `develop-bug` parity · deps: T38, T40 · touches: orchestrators!, pipeline-steps!, setup-consumer!, bundles!, docs-config~ · /develop-task docs/tasks/task.41.pipeline-moments-and-scaffolding/task.41.pipeline-moments-and-scaffolding.md

---

## PHASE 2 — document history: one canonical section across PRD / epic / story / task

<!-- Heading names in this phase deliberately avoid the words "change log", "deferred",
     "human-gated" and "housekeeping": select-next.mjs excludes any section whose heading
     matches EXCLUDED_HEADING_RE, and a matching heading drops its rows silently, with no
     lint warning. A `## PHASE …` heading is exempt (the phase branch resets the flag), but
     `###` sub-headings are not. -->


Stakeholders want a readable history of changes on the work-item documents. A Change Log already
exists in four incompatible shapes, on two of the four document types, written by nine skills that
disagree — plus a placement bug that inserts a duplicate block above the Epic Goal. This is a
consolidation. Series rationale: `.agents/plans/document-change-log-series.md`.

Strictly sequential — each row depends on the one above it. T42 ships back-compat wrappers so no
caller changes until T45 removes them.

> **Dogfooding note.** T43–T45 modify skills this pipeline runs on itself: T43 the `create-task` /
> `review-task` templates, T44 `review-task`'s grading (invoked at Step 2 of every later run), T45
> the `develop-pipeline-step-*` docs and the `sync-jira-*` scripts. Each task's changes take effect
> for the next task's run — which is why T45 is gated below.

### Foundation

- [x] **T42** Canonical Change Log spec + shared engine extracted from `jira-sync.js` · deps: none · touches: jira-sync!, change-log!, docs-config~, bundles~ · /develop-task docs/tasks/task.42.change-log-spec-and-engine/task.42.change-log-spec-and-engine.md

### Emit

- [x] **T43** Templates and `create-*` skills emit the canonical section · deps: T42 · touches: templates!, bundles~ · /develop-task docs/tasks/task.43.change-log-templates-and-creation/task.43.change-log-templates-and-creation.md

### Record and grade

- [x] **T44** `review-*` / `edit-*` skills log their document mutations · deps: T43 · touches: review-skills!, bundles~ · /develop-task docs/tasks/task.44.change-log-review-and-edit/task.44.change-log-review-and-edit.md

### Capstone — operator gate

- [x] **T45** Pipeline, QA, finalise, and tracker sync write the Change Log · deps: T44 · touches: pipeline-steps!, jira-sync!, bundles! · gate cleared 2026-08-12 — T44's `change-log.enforcement: advisory` default was verified against a pre-T43 document (`task.22`): check 4b graded its non-canonical Change Log **Important, not Critical**, verdict **GO** at 9/10, so this row's own Step 2 review did not HALT on the new check · ✅ **accepted + merged** ([PR #213](https://github.com/Gamaroff/agent-skills/pull/213), QA PASS 95/100 after 1 fix cycle) — the run also closed a pre-existing T42 engine defect that silently dropped Change Log rows it could not parse · /develop-task docs/tasks/task.45.change-log-pipeline-and-sync/task.45.change-log-pipeline-and-sync.md

---

## PHASE 3 — loop-supervisor: fresh-context sequential loop runner

Design: [`.agents/plans/loop-supervisor.md`](../../.agents/plans/loop-supervisor.md). T62 is the only
unit that has to exist — it delivers a usable runner with log files alone. T63 and T64 both depend on
it and are independent of each other, but they hard-conflict on `run-loop.mjs`, so `--batch` will
correctly take only one of them at a time.

- [x] **T62** Run each loop iteration in a fresh Claude process, and classify the outcome from the filesystem · deps: none · touches: loop-supervisor!, docs-config~ · /develop-task docs/tasks/task.62.loop-supervisor-runner/task.62.loop-supervisor-runner.md
- [x] **T63** Make an unattended run watchable from a second terminal, and audible when it stops · deps: T62 · touches: loop-supervisor!, docs-config~ · /develop-task docs/tasks/task.63.loop-supervisor-status-views/task.63.loop-supervisor-status-views.md ✅ **accepted + merged** ([PR #277](https://github.com/Gamaroff/agent-skills/pull/277), QA PASS 100/100)
- [x] **T64** Publish the supervisor run over HTTP, and write the operator documentation that makes an overnight run repeatable · deps: T62 · touches: loop-supervisor!, orchestrators~, docs-config~ · /develop-task docs/tasks/task.64.loop-supervisor-dashboard-and-docs/task.64.loop-supervisor-dashboard-and-docs.md ✅ **accepted + merged** ([PR #278](https://github.com/Gamaroff/agent-skills/pull/278), QA PASS 100/100)


---

## Where the narrative lives

Each row above has a corresponding entry in the **Change Log** of
[`project-completion-roadmap.md`](./project-completion-roadmap.md), recording what shipped, what was
found on the way, and what was left open. That log is append-only and is deliberately **not** moved
here — a document's own history stays with the document.

Per-item detail sits in the task directories under [`docs/tasks/`](../tasks/), each with its review,
QA, gate, DoD and implementation-report artifacts.

---

## PHASE 4 — maintenance backlog (retired)

A **standing** phase rather than a planned sequence: it held whatever was currently outstanding so
that `/develop-next` always had a frontier. Its ordering rule was that a known-broken thing outranks
intended work.

**It is retired, not merely emptied.** Its own preamble named T65 as the reason it existed — and T65
removes the need for it, because selection now falls through to `docs/bugs/bug-registry.md` and
`docs/tasks/task-registry.md` directly. A filed bug or task is visible to the loop without anyone
hand-writing a row here, which is the transcription step this phase *was*. Leaving it standing would
also have suppressed the new fallback outright: roadmap precedence is absolute, so while this phase
held any actionable row the registries could never be reached.

T65's row was archived **unticked** because it was in flight when the phase was retired — the archival
is part of T65's own delivery, so ticking it then would have attested to a merge that had not happened.
It merged as PR #281 on 2026-08-29 and is **now ticked**, with the acceptance recorded in the roadmap
Change Log as promised. Nothing depends on it, so no `deps:` resolution was ever affected.

- [x] **B2** `npm test` runs `node --test` unbounded, so spawn-heavy suites breach their timeouts and the suite fails for environmental reasons · deps: none · touches: test-harness! · /develop-bug docs/bugs/bug.2.unbounded-test-concurrency/bug.2.unbounded-test-concurrency.md
- [x] **T65** Derive the selection frontier from the registries, so an outstanding bug or task cannot be invisible to `/develop-next` · deps: none · touches: orchestrators!, docs-config~ · /develop-task docs/tasks/task.65.registry-aware-selection/task.65.registry-aware-selection.md

---

## PHASE 5 — Current frontier (closed 2026-09-12)

An **override** phase, not a planned sequence: it restated the registry fallback's own order
explicitly so the sequence lived in one place. Every row is ticked; the phase was fully delivered
between 2026-08-25 and 2026-09-09 and archived on 2026-09-12. Nothing now sits in a phase — the
registries are the whole frontier, which is the designed terminal state of the roadmap, not a gap.

- [x] **T67** Make QA execute a prose skill, not only read it · deps: none · touches: pipeline-steps!, qa-skills!, test-harness~ · /develop-task docs/tasks/task.67.execute-the-skill-qa-gate/task.67.execute-the-skill-qa-gate.md — ✅ **accepted + merged** ([PR #289](https://github.com/Gamaroff/agent-skills/pull/289), QA PASS 90/100)
- [x] **B3** Three CLIs truncate piped stdout at ~64KB by exiting before the write drains · deps: none · touches: selection!, test-harness! · /develop-bug docs/bugs/bug.3.stdout-truncation-on-exit/bug.3.stdout-truncation-on-exit.md — ✅ **accepted + merged** ([PR #290](https://github.com/Gamaroff/agent-skills/pull/290), DoD 9/9 PASS)
- [x] **T75** Make the pipeline quality gate run what CI runs · deps: none · touches: orchestrators!, pipeline-steps!, test-harness!, bundles~ · /develop-task docs/tasks/task.75.quality-gate-matches-ci/task.75.quality-gate-matches-ci.md — ✅ **accepted + merged** ([PR #291](https://github.com/Gamaroff/agent-skills/pull/291), QA PASS 100/100)
- [x] **B4** Snippet engine silently no-ops when invoked through a symlinked path · deps: none · touches: qa-skills!, test-harness! · /develop-bug docs/bugs/bug.4.snippet-engine-symlink-noop/bug.4.snippet-engine-symlink-noop.md — ✅ **accepted + merged** ([PR #292](https://github.com/Gamaroff/agent-skills/pull/292), DoD PASS, CI 4/4)
- [x] **B5** access-config parity JS probe records a timeout as a real answer · deps: none · touches: test-harness! · /develop-bug docs/bugs/bug.5.access-parity-js-probe-conflates-timeout/bug.5.access-parity-js-probe-conflates-timeout.md — ✅ **accepted + merged** ([PR #293](https://github.com/Gamaroff/agent-skills/pull/293), DoD 6/6 PASS, CI 4/4)
- [x] **T68** `/review-code` branches on TRACKER where it should branch on VCS · deps: none · touches: review-skills!, test-harness~ · /develop-task docs/tasks/task.68.review-code-vcs-branch/task.68.review-code-vcs-branch.md — ✅ **accepted + merged** ([PR #294](https://github.com/Gamaroff/agent-skills/pull/294), DoD 6/6 PASS, QA PASS 100/100, CI 4/4)
- [x] **T69** Give `/qa-story` and `/qa-task` a Bitbucket PR-comment path · deps: none · touches: qa-skills!, test-harness~ · /develop-task docs/tasks/task.69.qa-bitbucket-pr-comment/task.69.qa-bitbucket-pr-comment.md — ✅ **accepted + merged** ([PR #295](https://github.com/Gamaroff/agent-skills/pull/295), DoD PASS, QA PASS 100/100, CI 4/4)
- [x] **T72** Pin the bug-axis divergence exactly instead of asserting it loosely · deps: none · touches: selection! · /develop-task docs/tasks/task.72.pin-bug-axis-divergence/task.72.pin-bug-axis-divergence.md — ✅ **accepted + merged** ([PR #296](https://github.com/Gamaroff/agent-skills/pull/296), QA PASS 100/100)
- [x] **T73** Make the DoD security check execute candidate inputs, not grep for them · deps: none · touches: finalise!, bundles~ · /develop-task docs/tasks/task.73.dod-security-probe-not-grep/task.73.dod-security-probe-not-grep.md — ✅ **accepted + merged** ([PR #297](https://github.com/Gamaroff/agent-skills/pull/297), DoD PASS, QA PASS 95/100, CI 4/4) — found 12 open classifier routes on its first run → `bug.6`
- [x] **T74** A security re-review must re-probe, not re-read · deps: none · touches: qa-skills!, bundles~ · /develop-task docs/tasks/task.74.security-re-review-reprobes/task.74.security-re-review-reprobes.md — ✅ **accepted + merged** ([PR #299](https://github.com/Gamaroff/agent-skills/pull/299), DoD PASS, QA PASS 100/100, CI 4/4) — probe mode 12/0 at the DoD gate; found a red-CI dead link and a third stale copy of the scoping rule
- [x] **B9** The registry frontier ignores the `Depends on` column, so it can nominate work whose prerequisite is unbuilt · deps: none · touches: selection!, test-harness~, docs-pipeline~ · /develop-bug docs/bugs/bug.9.registry-frontier-ignores-depends-on/bug.9.registry-frontier-ignores-depends-on.md — ✅ **accepted + merged** ([PR #303](https://github.com/Gamaroff/agent-skills/pull/303))
- [x] **T76** State what a mutation proof does not tell you · deps: none · touches: mutation-proving!, bundles~ · /develop-task docs/tasks/task.76.mutation-proof-limits/task.76.mutation-proof-limits.md — ✅ **accepted + merged** ([PR #304](https://github.com/Gamaroff/agent-skills/pull/304), DoD PASS, QA PASS 100/100, CI 4/4) — review caught the task describing a 96-line/four-shape file that had already grown to 140/five, and stopped a bare "9 proofs held" going into the one document that forbids overclaiming
- [x] **T70** Build the inline PR comment primitive, on GitHub and Bitbucket · deps: none · touches: review-skills!, test-harness~ · /develop-task docs/tasks/task.70.inline-pr-comments/task.70.inline-pr-comments.md — ✅ **accepted + merged** ([PR #308](https://github.com/Gamaroff/agent-skills/pull/308), QA PASS 92/100)
- [x] **T77** Run the PR conformance review before a work item is finalised · deps: none · touches: pipeline-steps!, review-skills!, docs-pipeline!, test-harness~, bundles~ · /develop-task docs/tasks/task.77.review-pr-in-pipeline/task.77.review-pr-in-pipeline.md
- [x] **T89** Lint for prose-matching assertions that claim a relationship but test only co-occurrence · deps: none · touches: test-harness! · /develop-task docs/tasks/task.89.relationship-assertion-lint/task.89.relationship-assertion-lint.md — ✅ **accepted + merged** ([PR #312](https://github.com/Gamaroff/agent-skills/pull/312), DoD PASS, QA PASS 100/100 over 2 cycles, CI 4/4) — found **6 live instances of its own bug class** on its first run
- [x] **T90** `advance-pipeline-lock.sh` reports success for an advance that did not happen · deps: none · touches: pipeline-lock!, bundles! · /develop-task docs/tasks/task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md — ✅ **accepted + merged** ([PR #313](https://github.com/Gamaroff/agent-skills/pull/313), DoD PASS, QA PASS 100/100 over 2 cycles, CI 4/4) — QA found a **28 MB corrupted artifact this run had already pushed**, and no gate in the repo could see it
- [x] **T78** Give `develop-bug`'s fix cycle the same fast gate as the other pipelines · deps: none · touches: pipeline-steps!, test-harness~, bundles~ · /develop-task docs/tasks/task.78.develop-bug-fast-gate/task.78.develop-bug-fast-gate.md — ✅ **accepted + merged** ([PR #314](https://github.com/Gamaroff/agent-skills/pull/314), QA PASS 100/100)
- [x] **T83** Skip installing tracker-specific skills the consumer's platform can never fire · deps: none · touches: setup-consumer!, test-harness~, docs-pipeline~ · /develop-task docs/tasks/task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md — ✅ **accepted + merged** ([PR #315](https://github.com/Gamaroff/agent-skills/pull/315), DoD PASS, QA PASS 95/100 over 3 cycles, CI 3/3) — QA found the filter **inverted** for quoted config, then found the follow-on defect in its own fix
- [x] **T84** Skill install profiles with dependency closure · deps: T83 · touches: setup-consumer!, test-harness~, docs-config~, docs-pipeline~ · /develop-task docs/tasks/task.84.skill-install-profiles/task.84.skill-install-profiles.md — ✅ **accepted + merged** ([PR #318](https://github.com/Gamaroff/agent-skills/pull/318), DoD PASS, QA PASS 95/100 over 4 cycles + /review-pr, CI 4/4) — a consumer now picks `minimal` (5) / `pipeline` (36) / `full` (109); measured **−60%** of the description budget for `pipeline` (35,425 → 14,281 bytes), the tier that is paid on every request before the agent reads an instruction. **The specified design did not work and was replaced mid-implementation.** §3 said to derive the call graph by scraping `/slash-command` tokens from prose; built, measured, and it collapsed `minimal` (5 seeds) and `pipeline` (26 seeds) to the SAME ~34 of 120 skills — a feature that does nothing while reporting success. Prose carries no edge direction: `review-code/SKILL.md:180` literally reads "`/develop-story` and `/develop-task` do **not** call `/review-code`", which the scrape read as two edges. Replaced with a declared `invokes:` frontmatter key on 20 skills; absent key = no edges, the safe default. **27 defects across 4 passes, and every pass found the previous pass's fixes defective** — 11 → 5 → 5 → 10, same author throughout. Four reachable configs silently installed EVERY skill (a typo'd include, an exclude emptying the profile, a comment after `skills:`, a `$`-prefixed profile). The worst was a bare `X=$(cmd)` assignment that aborts the wizard under errexit **introduced in the same commit as a comment warning against it**, invisible to its own test because that test ran under `set +e`. `parseInvokes` needed four fixes before being restructured and given an exhaustive 20-shape matrix rather than patched shape-by-shape. **Two lessons worth carrying.** (1) Tests asserting on SOURCE TEXT caught **0 of 27** defects and twice gave false confidence about the exact line one sat on; one asserted on a code comment, which cannot fail. (2) **Recording a check as unrunnable is a claim** — `shellcheck` was written off across three gates as "not installed, no lane"; docker was available all along and this roadmap's own T83 entry documents it being run that way, and when finally run it found a new SC2155 in this very change. The real `--update` was likewise called impractical, then run non-dry against a full 120-skill install: 120 → 120, nothing pruned, confirming the tracker/profile keep paths by execution. **Residual, deliberate**: `install_skills` still has no behavioural CI coverage — the `--update` proof is manual. Extracting the per-skill decision into a testable helper touches the only code that can delete a consumer's skills and belongs in its own task; `gate.4` records maintainability as CONCERNS for it. Merge authorised by maintainer instruction; no review was recorded on the PR and the DoD says so rather than ticking that box
- [x] **T91** Reconcile install-time and run-time tracker resolution · deps: T83 · touches: setup-consumer!, platform-detection!, test-harness~, docs-config~ · /develop-task docs/tasks/task.91.reconcile-tracker-resolution/task.91.reconcile-tracker-resolution.md — ✅ **accepted + merged** ([PR #320](https://github.com/Gamaroff/agent-skills/pull/320), DoD PASS, QA PASS 95/100 over 4 gates + /review-pr, CI 4/4) — `setup-consumer.sh` no longer re-implements tracker resolution, it **delegates** to `resolve-platform.sh` in a subshell and its local awk parser is deleted; parity is structural rather than maintained by hand. **A and B, not A or B**: the task framed three exclusive options, but they fix different rows — the `bitbucket` and TAB cases are config-*parsing* divergences (A), while the `.env` case is a *source* divergence A cannot fix, because delegating wholesale would delete the installer's `.env` probe and collapse into the rejected Option C. So `resolve-platform.sh` learned to read `.env` (below env, below config) and delegation then *preserves* the probe. ⚠️ **Behaviour change**: no `tracker:` key + a `JIRA_URL` in `.env` now resolves `jira` at run time; opt out with an explicit `tracker: github`. No wizard-generated config can reach it — the wizard has written a `tracker:` key since T83. **21 findings over 4 gates, and the first two cycles shipped fixes that NO TEST EXECUTED.** Cycle 1's fix for the empty-`TRACKER` case was *unreachable* — `printf "%s\n%s"` loses its trailing newline to command substitution, so both halves of the split returned `"0"` and the installer resolved the literal string **`"0"`** as a tracker, matching no classification list and leaving the filter silently inert. The suite stayed green at 2441 tests throughout. **The gap was in the FIXTURE, not the code**: `makeFixtureTarball` shipped no resolver, so every install test resolved through this repo's own checkout and the `release` origin — the copy a real consumer installs with — was exercised by nothing. **`/review-pr` then found two the QA loop had not**: the PR did not contain the PASS evidence it was being judged on (gate.4, qa.3, qa.4 untracked — anyone opening it read `FAIL 70/100`), and `platform-detection.md`, the file §7 designates the source of truth and requires to change *first*, was two commits behind the resolver it governs, asserting a `^JIRA_URL=.+` pattern neither side used any more — baked into all 38 bundled copies. Four QA cycles chased the installer's error contract exhaustively and never re-read the canonical spec against the code. **The lesson**: a green suite was never evidence here — every one of the 21 findings came from running the code against a hostile input, and a fix no test executes is a claim, not a guarantee. Tests 40 → 61 in the parity file, plus 8 new cases in the runtime resolver's own suite (which §8 named as the regression net and which nothing had extended). **Residual, deliberate**: `tracker-access.test.sh` still never asserts `TRACKER` stays `github` for its own fixtures, and `_config_skills_profile` remains a hand-rolled awk YAML parser — the same mirror-the-reader pattern this task removed for `tracker:`, and the obvious next task
- [x] **T92** Add a shellcheck CI lane for the repo's shell scripts · deps: none · touches: ci-workflows!, shell-scripts!, platform-detection~, setup-consumer~ · /develop-task docs/tasks/task.92.shellcheck-ci-lane/task.92.shellcheck-ci-lane.md — ✅ **accepted + merged** ([PR #322](https://github.com/Gamaroff/agent-skills/pull/322), DoD PASS, QA PASS 96/100 over 3 cycles + /review-pr, CI 5/5) — shell was the least-gated language here: `npm run ci` runs `prettier --check` over everything and `node --test` over the suite, and **nine of those suites *are* shell scripts executed by bash**, yet nothing statically analysed shell. T83 proved the cost — a `shellcheck scripts/setup-consumer.sh` criterion rode three QA cycles, a gate and a DoD with no step able to evaluate it, and was settled by hand with a container. Gate is `--severity=warning` over the **56 tracked source** scripts, ShellCheck **pinned to v0.11.0** and printed. All 26 pre-existing warnings resolved: **9 by a real fix, 17 by a disable with a stated reason**; zero bare suppressions remain. **The task's own recommended home would not have worked, and would have looked like it had.** §6 said put the job in `validate.yml`; that workflow is path-filtered to `skills/**` and `shared/resources/**`, which excludes `scripts/setup-consumer.sh`, `scripts/release.sh` and `.agents/scripts/backfill-story-issues.sh` — all three carrying a warning, the first being *the script that motivated the task*. A lane there would never have fired for the change that caused it to be written and would have reported green while structurally unable to fail. `test.yml` is unfiltered but guarded by `ci-gate-parity.test.mjs`, which asserts set equality with the `npm run ci` composite — so a separate one-job workflow, no path filter, ~15s. **Every one of the five findings was in code this task itself introduced**; the inherited tree was clean at `error`. The sharpest was a guard added *while fixing the SC2010* that reported a failure and then **continued**, into the exact `sed`-reads-STDIN hang its own comment claimed to prevent — `return` at the top level of an executed script is illegal, and the `2>/dev/null || true` after it swallowed both the error and the status. It is the **task.90 shape, reproduced inside the task built to catch that shape**. Unreachable in practice, so the suite stayed green throughout and would have stayed green forever; found by mutation-proving the guard, not by running the tests. Three more were numbers true once and silently not any more — **11/15 where the split is 9/17** (counting *assignments quoted*, not *findings resolved*), **"five workflows" where there are six**, and a sources-only comment still claiming **"725 vs 81"** when this very change made it 515 vs 55. Two of the 26 were **not false positives at all**: the SC2211 backticks sat inside a *double-quoted* `assert_rc` message, so bash was executing `? access` and silently stripping the emphasis. **A green suite was never evidence on this task.** ⚠️ **Independent review never ran** — three Explore subagents (the QA cycle-2 refute pass and both Step 5c lenses) hung, returned nothing, ignored wrap-up requests and were killed, one after ~40 minutes; finalise's four DoD agents were skipped on that evidence and verified in-line. Self-review found four of five findings, but the mechanism meant to catch what self-review misses was never exercised, and the DoD records that as a partial rather than ticking the box. **A human read of the 28-file reviewable surface is the outstanding mitigation** — the other 137 files are generated and isolated in `d383fa90`. That subagent failure is itself worth a task
- [x] **B6** Ten more fail-open routes past the snippet classifier, plus two over-refusals · deps: none · touches: qa-skills!, test-harness!, bundles~ · /develop-bug docs/bugs/bug.6.snippet-classifier-ten-more-fail-open-routes/bug.6.snippet-classifier-ten-more-fail-open-routes.md — ✅ **accepted + merged** ([PR #323](https://github.com/Gamaroff/agent-skills/pull/323), DoD 10/10 PASS, CI 5/5) — two verify cycles; the fix's own first cut opened two NEW fail-open routes that the 13-input corpus passed clean
- [x] **B10** sed's `w` write flag is only caught when a space follows it, leaving seven glued forms fail-open · deps: none · touches: qa-skills!, test-harness! · /develop-bug docs/bugs/bug.10.sed-w-glued-filename/bug.10.sed-w-glued-filename.md — ✅ **accepted + merged** ([PR #325](https://github.com/Gamaroff/agent-skills/pull/325), 93 tests, 25-input probe: 0 fail-open, 0 over-refusal) — B6's own fix left the rule demanding a space after `w`; no regex closes this, so the sed script is now **walked by position** rather than matched, and fixing the seven reported routes surfaced eight more — two of them holes in this fix's own first cut
- [x] **B8** A bug status outside the lifecycle is silently invisible to selection · deps: none · touches: selection!, test-harness!, docs-pipeline~ · /develop-bug docs/bugs/bug.8.bug-status-outside-lifecycle-is-invisible/bug.8.bug-status-outside-lifecycle-is-invisible.md — ✅ **accepted + merged** ([PR #327](https://github.com/Gamaroff/agent-skills/pull/327), DoD PASS, CI 5/5, 13 tests mutation-proved 6 ways) — the lifecycle existed only in prose, so `registryFrontier` could only ask "is this selectable?" and gave `closed` and `open` the same sentence; the guard that *did* check it (`review-bug`) sat **downstream of the selection a misfiled bug never reaches**
- [x] **T97** Step 2 has no recovery path when `review-task` Step 9 does not promote · deps: none · touches: pipeline-steps!, bundles~ · /develop-task docs/tasks/task.97.develop-task-review-gate-already-reviewed/task.97.develop-task-review-gate-already-reviewed.md — ✅ **accepted + merged** ([PR #350](https://github.com/Gamaroff/agent-skills/pull/350), DoD PASS, QA PASS 95/100 over 3 cycles + /review-pr, CI 5/5) — Step 2's skip decision now keys on **evidence of review** (a current report) rather than on status, so a card left at `planned` by a blocking gate is no longer permanently unstartable. **The halt it replaces was correct**; what was wrong is that its only intuitive remedy — re-running the review — is provably a no-op, because whatever withheld the promotion fires again identically. **Phase 1's binary question had a third answer**: the HALT is *conditionally* reachable, via `sign-off.enforcement: blocking` and `change-log.enforcement: blocking`, and unreachable under stock defaults — which is why the consumer who reported it *predicted* it from reading the tables rather than hitting it, and why their diagnosis (two contradictory tables) does not survive measurement. **The substance of this run was not the fix but what the fix kept getting wrong.** The freshness rule was defeatable **seven** ways before it held — HTML comment, 4-space indent, nested fence, date on the following line, a comment that closed its own fence, a phantom fence from an inline code span, and comment removal shifting the indent bound — **every one toward `fresh`**, which is precisely the over-correction §10 named as *worse* than the halt being removed. Cycle 2's refute pass found the sharpest: **two of cycle 1's own fixes cancelled each other out**, comment-stripping running inside fences and its output re-tested as a delimiter. **The full suite was green at every one of those moments** — the starting net was zero, because the only test touching this file asserted that the substrings `review` and `skip` appear somewhere in it and would have passed with both decision tables deleted. Freshness derives from document *content* (frontmatter `updated:` vs the report's body `**Reviewed:**`), never mtime, which is the checkout time in a fresh clone; the divergence from the pipeline's own mtime-based plan-freshness rule is now **stated** rather than left for a reader to trip over. **Three §9 criteria were ticked before they were true** and were corrected rather than accepted — the resume-contract divergence note was genuinely absent while the module's header pointed at it, the fresh-clone criterion described an experiment nobody performed, and the develop-story guarantee was three manual reads; the last is now a test. 68 tests from a standing start, 21 mutations proved red, `/develop-story` byte-identical throughout. **Five string-replacement edits silently no-op'd during the run** — prettier had reformatted their targets — four of them mutations reporting a false "still green", and one dropping a test the author believed existed; the reviewing agent hit the same failure mode and caught it only because the disclosure warned it to assert the needle first. ⚠️ **Found in passing, out of scope**: Step 4's staging scope silently excludes every repo-root file (`dirname` `.`), while `/develop` *requires* a CHANGELOG update for behaviour changes — Step 3 mandates the edit and Step 4 declines to stage it; and `develop-bug` still carries the presence-only Step 2 gate in its own step-2 document
