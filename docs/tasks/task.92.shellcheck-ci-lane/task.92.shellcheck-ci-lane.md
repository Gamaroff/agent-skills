---
id: task.92
title: "Add a shellcheck CI lane for the repo's shell scripts"
type: task
description: "No workflow runs shellcheck, so a shell-script success criterion cannot be evaluated by any automated gate — task 83's had to be closed by hand with a container."
tags: [ci, shellcheck, test-harness]
category: testing
status: ready-for-review
priority: Medium
created: 2026-09-04
updated: 2026-09-05
assignee:
estimated_effort_hours: 3
github_issue: 321
---

# Technical Task: Add a shellcheck CI lane for the repo's shell scripts

**Status:** Ready for Review
**GitHub Issue**: [#321](https://github.com/Gamaroff/agent-skills/issues/321)
**Review**: ✅ All review recommendations from `task.92.review.1.shellcheck-ci-lane.md` implemented 2026-09-05

---

## 1. Overview

This repo ships **56 source shell scripts** — the platform resolver every skill sources, the pipeline
hooks, the consumer setup wizard, nine shell test suites — and **no workflow lints any of them**.

Task 83 made that concrete. Its Success Criteria included "`shellcheck scripts/setup-consumer.sh` no
new warnings", and nothing in the pipeline could evaluate it: the binary is not installed on the dev
host and `grep -rn shellcheck .github/` returns nothing. QA correctly escalated it to Step 7 rather
than looping on a criterion no fix cycle could close, and it was eventually settled by hand with
`docker run … koalaman/shellcheck:stable`. That worked, but **a criterion no automated gate can
evaluate is one that gets waived by accident** the next time nobody happens to run a container.

This task adds the lane. The scope has been measured rather than estimated — see §3.

---

## 2. Motivation

### Current Problems

**1. Shell is the least-gated language in the repo.** `npm run ci` runs `prettier --check` over
everything and `node --test` over 2,356 tests, and nine of those suites *are* shell scripts executed
by `bash`. But nothing statically analyses shell. A script can be committed with a quoting bug that
only fires on a path the tests do not take.

**2. The gap is not theoretical — it has already cost a QA cycle.** Task 83 carried an unverifiable
criterion through three QA cycles, a gate, and a DoD. Every one of those steps handled it correctly
and none of them could close it.

**3. `bash -n` is not a substitute.** It catches syntax errors only. Every finding in the measured
baseline below is something `bash -n` passes cleanly.

### Benefits

- A shell-script criterion becomes checkable by the same gate that checks everything else.
- Regressions are caught at push rather than at a maintainer's discretion.
- The false-positive families this repo's idioms provoke get annotated **once**, in the code, with
  reasons — instead of being rediscovered by each person who runs shellcheck by hand.

---

## 3. Technical Background

### Measured baseline

Run on 2026-09-04 against `koalaman/shellcheck:stable`, over the **tracked source scripts**:

```bash
git ls-files '*.sh' | grep -v 'skills/.*/references/' > /tmp/sh-sources.txt   # 56 files
docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable $(cat /tmp/sh-sources.txt | tr '\n' ' ')
```

| Severity gate | Findings | Files affected |
|---|---|---|
| `--severity=error` | **0** | 0 |
| `--severity=warning` | **26** | 14 |
| `--severity=info` | 79 | 26 |
| `--severity=style` (default) | 81 | 27 |

**Zero errors.** Nothing in the tree is broken; this lane is about keeping it that way.

> **Re-measured 2026-09-05** at implementation time, per §11 Known Issues, against
> `koalaman/shellcheck:stable` **0.11.0**: `git ls-files '*.sh'` = 247, sources = 56, and the four
> severity counts reproduce **exactly** — 0 / 26 / 79 / 81, with 14 files affected at `warning`.
> The snapshot below is therefore current, not historical.

### The scoping decision that matters most

`git ls-files '*.sh'` returns **247** files. Only **56** are sources — the other **191 are bundled
copies** under `skills/*/references/`, written by `npm run bundle` from `shared/resources/`.

| What is linted | Findings |
|---|---|
| 56 sources | **81** |
| all 247 (naive `**/*.sh`) | **725** |

A 9× inflation, because each shared script is bundled into four or five skills and every finding is
reported once per copy. **Lint sources only.** Bundle drift is already guarded by
`evals/shared/tests/` and by `validate.yml`'s existing bundle check; this lane must not duplicate that
job or couple itself to the bundler.

### The 26 warnings, and why 25 of them are false positives

This is the triage, done in advance so the implementer does not have to rediscover it:

| Code | Count | What it is | Real? |
|---|---|---|---|
| **SC2034** "appears unused" | **15** | Variables a **sourced** file sets *for its caller* — `BB_CURL_AUTH` and `BB_AUTH_SCHEME` are the documented outputs of `bitbucket-auth.sh`; `JSM_DEFERRED`/`JSM_DEFERRED_RECORD` are `jira-sprint-lib.sh`'s output contract. shellcheck cannot see cross-file use. See the attribution note below — the `JSM_DEFER_*` half runs the *other* way. | ❌ |
| **SC1007** "remove space after `=`" | 4 | `CDPATH= cd -P -- …` — the standard idiom for neutralising `CDPATH` for one command. Misparsed as a malformed assignment. | ❌ |
| **SC2209** "use `var=$(command)`" | 3 | `ACCESS_TRACKER=command` — assigning the literal access-mode value `command`, which happens to share a name with a shell builtin. | ❌ |
| **SC2211** "glob used as a command name" | 2 | Backticks used as *markdown emphasis inside an assertion message string* in `tracker-access.test.sh` (`assert_rc "…explicit-key \`? access\` → refused"`). shellcheck parses the prose as command substitution. | ❌ |
| **SC1090** "can't follow non-constant source" | 1 | A resolver sourcing a path computed at runtime — inherent to the design. | ❌ |
| **SC2010** "don't use `ls \| grep`" | 1 | Possibly genuine. **Look at this one properly.** | ⚠️ |

So: **one warning worth investigating, 25 needing an annotation** (15 + 4 + 3 + 2 + 1 = 25, plus
the single SC2010 = 26). The `--severity=warning` gate is
achievable in an afternoon, which is why it is the recommended target rather than the aspirational one.

> **Attribution correction (verified 2026-09-05).** An earlier draft of this table said the
> `JSM_DEFER_*` family is `jira-sprint-lib.sh`'s output contract. It is the reverse:
> `jira-sprint-lib.sh:195-198` **reads** `JSM_DEFER_KIND`/`INTENT`/`TARGET`/`DESIRED`, and the
> **writers** are `skills/jira-sprint-manager/scripts/manage-sprint-state.sh:45-48` and
> `move-sprint-issues.sh:49-52` — which is where SC2034 actually fires (4 findings each). A disable
> placed in the library would silence nothing. The genuine in-library case is the separate pair
> `JSM_DEFERRED` / `JSM_DEFERRED_RECORD` (`jira-sprint-lib.sh:224-225,239-240`), written there and
> read by the two sprint scripts. Annotate at the **writing** site in each case.

The `info` tier adds 53 more, dominated by **SC2016** (24 — "expressions don't expand in single
quotes", which is exactly what an `awk`/`jq` program string is *for*) and **SC2015** (16 —
`A && B || C`). Both are overwhelmingly deliberate here. `info` is not a realistic gate for this
codebase without a large blanket-exclude list, which would make the lane weaker than one that gates at
`warning` honestly.

---

## 4. Scope

### In Scope

- A shellcheck job in `.github/workflows/validate.yml` (or its own workflow — see Phase 1).
- Inline `# shellcheck disable=SCxxxx` annotations **with a stated reason** for the false-positive
  families above, in the ~14 affected files.
- A `.shellcheckrc` if a repo-wide setting (severity, `external-sources`) is cleaner than per-file
  annotations.
- A documented way to run the same check locally, since **no contributor is guaranteed to have the
  binary** — the container invocation used by task 83 is the working reference.
- `docs/contributing/` or the relevant CI documentation, so the lane is discoverable.

### Out of Scope

- **Fixing the 53 `info`-tier findings.** Gating at `info` is a separate decision and a much larger
  triage; if it is wanted, file it separately once the `warning` lane has been green for a while.
- Linting the 191 bundled copies under `skills/*/references/`.
- Any behaviour change to the scripts themselves. If the single SC2010 turns out to be a real bug, fix
  it — but a fix with a behaviour change needs its own test, and if it is more than trivial it should
  be split out rather than smuggled into a CI task.
- `shfmt` or any formatting tool. Different tool, different argument.

---

## 5. Breaking Changes

**None to shipped behaviour.** This adds a CI job and comments.

The one migration consequence: **the lane will fail any PR that adds a new warning-tier finding**,
including in a file the author did not know shellcheck was now watching. That is the point, but it
should be announced in the CHANGELOG rather than discovered.

---

## 6. Implementation Plan

> Detailed implementation guide: [task.92.plan.shellcheck-ci-lane.md](task.92.plan.shellcheck-ci-lane.md)

### Phase 1 — Choose the gate and the wiring (Risk: Low)

**Files**: none — decision, recorded in this document.

- [x] **Severity gate.** Recommended: `--severity=warning`, because `error` is 0 today and would very
      likely stay 0 (syntax errors are already caught by `bash -n` and by the nine shell suites that
      actually execute), making the lane decorative. Decide explicitly and record why.
- [x] **Where it runs.** `validate.yml` looks like the natural home — it already does repo-hygiene
      checks (catalog, bundle) rather than tests — **but it cannot host this lane as configured**, and
      that is a decision this phase must make explicitly rather than inherit:

      - **`validate.yml` is path-filtered**, on both `pull_request` and `push`, to `skills/**`,
        `shared/resources/**`, `scripts/generate-skill-dependencies.mjs`,
        `docs/reference/skill-catalog.md` and its own file. **Three of the 56 source scripts sit
        outside every one of those filters** — `scripts/setup-consumer.sh`, `scripts/release.sh` and
        `.agents/scripts/backfill-story-issues.sh` — and all three carry a warning-tier finding today.
        `setup-consumer.sh` is *the script whose shellcheck criterion motivated this task*. A lane in
        `validate.yml` would not have fired for the change that caused it to be written.
      - **`test.yml` has no path filter** and would give the coverage — but
        `evals/shared/tests/ci-gate-parity.test.mjs` asserts **set equality in both directions**
        between the npm scripts run by `test.yml`'s `test` job and the `npm run ci` composite. Adding
        a step there turns that eval red unless a matching script is also added to `ci`, which
        contradicts §9's "no change to local gate duration". Do not walk into this.

      **Recommended: a separate one-job `shellcheck.yml`**, triggers mirroring `test.yml`
      (`on: pull_request` + `push: branches: [main, develop]`, no path filter). It is the only option
      that satisfies §9's "every push" criterion, covers all 56 files wherever they live, leaves
      `validate.yml`'s deliberately-reasoned filters alone, and stays outside the parity test's scope.
      It also matches house style — every workflow in this repo has exactly one job.
- [x] **How shellcheck is obtained in CI.** GitHub's `ubuntu-latest` ships a `shellcheck` binary —
      prefer it over a container action for speed, but **pin and print the version**, because a
      version bump can introduce new findings and turn a green lane red with no code change. That is
      the main operational risk of this lane.
- [x] **File selection.** Must exclude `skills/*/references/`. Derive from `git ls-files` rather than
      a shell glob, so untracked scratch scripts are never linted.

**Dependencies**: none.

### Phase 2 — Triage and annotate (Risk: Low)

**Files**: ~14 shell scripts across `shared/resources/`, `skills/*/scripts/`, `scripts/`

- [x] Investigate the single **SC2010** properly. If it is real, fix it and add a test; if the fix is
      non-trivial, file it separately rather than expanding this task.
- [x] Annotate the 25 false positives with `# shellcheck disable=SCxxxx` **and a one-line reason**.
      A bare disable is a suppression; a disable with a reason is documentation. Prefer a file-level
      disable only where the code recurs throughout the file (e.g. the `JSM_DEFER_*` outputs).
- [x] For the SC2034 "unused" family, **annotate at the writing site**, not at the reader — see the
      attribution correction in §3. The `JSM_DEFER_*` findings are in `manage-sprint-state.sh` and
      `move-sprint-issues.sh`; only `JSM_DEFERRED`/`JSM_DEFERRED_RECORD` belong in `jira-sprint-lib.sh`.
- [x] **Do not reach for `export` on `BB_CURL_AUTH`.** It is a bash **array**, and bash cannot export
      arrays — `export BB_CURL_AUTH` sets an attribute that no child process ever sees, so it would be
      a no-op dressed up as a fix. `export` remains a legitimate answer for a scalar that genuinely
      crosses a process boundary; for a value that crosses only a `source` boundary, a disable with a
      stated reason is the honest form.

**Dependencies**: Phase 1.

### Phase 3 — Add the lane and prove it fires (Risk: Low)

**Files**: `.github/workflows/validate.yml`, `.shellcheckrc` (if used)

- [x] Add the job. Confirm green on the current tree.
- [x] **Prove the gate can fail.** Introduce a deliberate warning-tier finding on a scratch branch and
      confirm CI goes red, then revert. A gate never observed failing is not known to be a gate — this
      repo has been bitten by exactly that shape (`task.90`, a lock helper that reported success for
      an advance that did not happen).
- [x] Confirm the lane does **not** lint bundled copies, by checking the reported file count is 56 and
      not 247.

**Dependencies**: Phase 2.

### Phase 4 — Documentation (Risk: Low)

**Files**: `CHANGELOG.md`, contributing/CI docs

- [x] CHANGELOG `[Unreleased]` entry naming the gate level and that new warning-tier findings will now
      fail CI.
- [x] Document the **local** invocation, including the container form for hosts without the binary:
      `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable <files>`. **Targets are
      pinned, not "or":** `CONTRIBUTING.md` § "Before you open a PR" (the human-facing list of local
      gates) **and** `docs/architecture/concepts/coding-standards.md` § "Validation before commit"
      (the agent-facing second copy of that same list). Both, in the same edit, or they diverge.
- [x] Update `docs/architecture/concepts/tech-stack.md` § "Infrastructure and CI". It is **already
      stale** — it claims a single `validate.yml` that "runs `npm test` on every push to `main`",
      which describes neither workflow that exists. This task invalidates that paragraph further, so
      it fixes the paragraph it touches.
- [x] Note the sources-only rule and why (**81 findings vs 725**), written where the file list is
      built, so nobody "fixes" the lane by widening its glob.
- [x] Do **not** treat `.github/workflows/README.md` as authoritative — it is stale (claims the
      workflows are disabled, documents `sbom.yml`/`codeql.yml`, which do not exist).

**Dependencies**: Phase 3.

---

## 7. Files Summary

**Core Implementation**

1. `.github/workflows/shellcheck.yml` — **new**, one job, unfiltered triggers, ShellCheck pinned to
   v0.11.0, `--severity=warning`, sources-only file list with a count assertion
2. `.shellcheckrc` — **not added.** Every setting it would have carried is expressed more precisely at
   the call site: severity is a job flag, and `external-sources` would have changed the behaviour of the
   two pre-existing `# shellcheck source=` directives for no gain. A config file would also have moved
   the sources-only rule away from the glob it governs.

**Fixed (9 findings — real fixes, no behaviour change)**

3. `.agents/scripts/backfill-story-issues.sh` — removed dead `EPIC` assignment (SC2034)
4. `shared/resources/develop-pipeline-on-precompact.sh` — removed dead `TASK_ID` read (SC2034)
5. `skills/mermaid-architect/scripts/lint.sh` — removed dead `VALID_TYPES_RE`, which had already
   drifted from the live inline regex it duplicated (SC2034)
6. `scripts/release.sh`, `scripts/setup-consumer.sh`, `shared/resources/read-config.sh` — quoted five
   string literals that shadow command names (`patch`, `true`, `command`, `env`) (SC2209)
7. `shared/resources/tracker-access.test.sh` — two assertion messages whose backticks sat inside a
   **double-quoted** string and were therefore executed as command substitution, silently dropping the
   emphasis (SC2211); and `ls | grep` replaced by a glob loop into an array, which also removed a
   pre-existing SC2086 disable and added the empty-list guard the `ls` form silently lacked (SC2010)

**Annotated (17 findings — reasoned disables)**

8. `shared/resources/bitbucket-auth.sh` (2), `shared/resources/jira-sprint-lib.sh` (2 SC2034 + SC1007 +
   SC1090), `shared/resources/resolve-platform.sh`, `set-github-project-priority.sh`,
   `set-github-project-estimate.sh` (SC1007 `CDPATH=`),
   `skills/jira-sprint-manager/scripts/{manage-sprint-state,move-sprint-issues}.sh` (4 each, SC2034)

**Documentation**

9. `CHANGELOG.md` — `### Changed` entry naming the gate level and the migration consequence
10. `CONTRIBUTING.md` § "Before you open a PR" — local invocation, binary and container forms
11. `docs/architecture/concepts/coding-standards.md` § "Validation before commit" — the agent-facing
    second copy of that list, updated in the same change so the two cannot diverge
12. `docs/architecture/concepts/tech-stack.md` § "Infrastructure and CI" — rewritten; it described a
    single `validate.yml` running `npm test` on pushes to `main`, which matched neither workflow

**Generated**

13. 137 bundled copies under `skills/*/references/` — regenerated by `npm run bundle`

**Not linted, but regenerated**

- `skills/*/references/*.sh` — bundled copies. They are **excluded from the lane** (linting them
  reports every shared finding 4–5 times), but they are **not unchanged**: 8 of the 14 files needing
  an annotation live in `shared/resources/`, and `npm run bundle` fans those edits out to
  **139 bundled copies** (`read-config.sh` → 44, `bitbucket-auth.sh` → 38, `resolve-platform.sh` → 38,
  `set-github-project-priority.sh` → 9, `set-github-project-estimate.sh` → 4, `jira-sprint-lib.sh` → 3,
  `develop-pipeline-on-precompact.sh` → 3, `tracker-access.test.sh` → 0). `validate.yml`'s existing
  **Bundle freshness check** fails the PR if they are not regenerated and committed, so `npm run bundle`
  is a required step of Phase 2 and the PR diff will be large and mostly generated. Expect ~150 changed
  files for ~25 hand-written comment lines.

**Unchanged by design**

- The nine shell **test** suites' behaviour — they are linted like any other source, not rewritten.

---

## 8. Testing Strategy

The deliverable is a CI job, so "testing" is mostly proving the job behaves:

- **Green on the current tree** at the chosen severity.
- **Red on a deliberate regression** — the Phase 3 proof. This is the mutation proof for a CI lane:
  a gate that has never been seen to fail is not known to work.
- **Correct file selection** — assert the job reports 56 files, not 247. A count assertion is cheap
  and catches the most likely misconfiguration.
- **`npm run ci` unaffected** — this lane is CI-only; the local composite gate is not slowed by it.

> Per `shared/resources/mutation-proving.md`: reverting a behaviour must turn something red. For a
> workflow, the behaviour is "fails on a new finding", and the revert is "introduce a finding".

---

## 9. Success Criteria

### Functional

- [x] A CI job runs shellcheck on every tracked source shell script, on **every pull request and
      every push to `main`/`develop`** — with **no path filter**, so a change to a script outside
      `skills/**` and `shared/resources/**` (e.g. `scripts/setup-consumer.sh`) still triggers it.
- [x] The job lints **56** files, not 247 — bundled copies excluded.
- [x] The job is **green** on the tree as it stands at implementation time.
- [x] The job has been **observed failing** on a deliberately introduced warning-tier finding, and the
      evidence is recorded in the implementation report.
- [x] The shellcheck version is pinned or printed, so a version bump is diagnosable rather than
      mysterious.

### Code Quality

- [x] Every `# shellcheck disable` carries a stated reason. No bare suppressions.
- [x] The single SC2010 is either fixed or explicitly justified.
- [x] `npm run ci` still green; no change to local gate duration.

### Migration

- [x] CHANGELOG entry states the gate level and that new warning-tier findings will fail CI.
- [x] The local invocation is documented, including the container form for hosts without the binary.
- [x] The sources-only rule is documented **where the glob lives**, so widening it is a deliberate act.

---

## 10. Risk Assessment

### MEDIUM RISK

**1. A shellcheck version bump turns the lane red with no code change**

- **Risk**: `ubuntu-latest` updates its shellcheck; a new check fires on existing code; every PR goes
  red for a reason unrelated to the PR.
- **Probability**: Medium over a long enough window — this is the normal failure mode of an unpinned
  linter in CI.
- **Impact**: Medium — noisy and confusing, and the natural reaction (widen the excludes) weakens the
  lane permanently.
- **Mitigation**: pin the version, or at minimum print it in the job output so the cause is one glance
  away. Decide in Phase 1 and state the reasoning.

**2. The lane is hosted where it cannot see the files it is meant to gate**

- **Risk**: `validate.yml` is path-filtered; a lane placed there never fires for
  `scripts/setup-consumer.sh`, `scripts/release.sh` or `.agents/scripts/backfill-story-issues.sh` —
  all three of which carry a warning today, and the first of which is the file that motivated the
  task. The lane looks green because it never ran.
- **Probability**: High if Phase 1's original recommendation is followed without checking the filter.
- **Impact**: High — a gate that cannot fail is indistinguishable from no gate, which is exactly the
  failure mode §8 and `task.90` warn about.
- **Mitigation**: own workflow, no path filter (Phase 1). The Phase 3 deliberate-regression proof
  must introduce the finding in a file **outside** `skills/**` and `shared/resources/**`, or it
  proves nothing about this risk.

### LOW RISK

**2b. The annotation phase produces a ~150-file PR**

- **Risk**: 8 of the 14 files needing annotations are in `shared/resources/`, which `npm run bundle`
  fans out to 139 bundled copies. A reviewer sees a 150-file diff for a CI task and either rubber-stamps
  it or stalls on it.
- **Mitigation**: run `npm run bundle` as an explicit Phase 2 step, commit the generated copies
  **separately** from the hand-written annotations, and say so in the PR description. See §7.

**2. Suppressions accumulate into a lane that checks nothing**

- **Risk**: each new finding is silenced rather than considered, and in a year the lane is decorative.
- **Mitigation**: require a reason on every disable. A reviewer can then see the difference between
  "this is a known false positive because X" and "this was in the way".

**3. Annotating 14 files touches code other in-flight tasks are editing**

- **Risk**: conflicts with T83's follow-ups. `resolve-platform.sh`, `bitbucket-auth.sh` and
  `setup-consumer.sh` all appear in the warning list and are also **T91**'s subject.
- **Mitigation**: the roadmap row marks `platform-detection~` and `setup-consumer~` so the batch
  selector holds this out of any parallel batch with T91. Sequence them; do not run them concurrently.

---

## 11. Rollback Plan

Delete the workflow job. The annotations are inert comments and can stay — they document real
false positives whether or not a lane reads them.

**Rollback trigger**: the lane goes red for reasons unrelated to the change under review (a version
bump, a new check) and cannot be pinned quickly. Disable the job rather than blanket-excluding the
findings — a disabled lane is honestly absent; a lane full of excludes looks like coverage that is not
there.

---

## QA Testing Results

**QA Status**: CONCERNS
**QA Engineer**: QA Engineer
**Testing Date**: 2026-09-05
**Quality Score**: 80/100
**Gate Decision**: CONCERNS

### QA Report

- **Full Report**: [task.92.qa.1.shellcheck-ci-lane.md](./task.92.qa.1.shellcheck-ci-lane.md)
- **Gate File**: [task.92.gate.1.shellcheck-ci-lane.yml](./task.92.gate.1.shellcheck-ci-lane.yml)

### Test Coverage Summary

- **Tests Executed**: 7 shell suites + full `ci:fast` + 5/5 CI jobs on PR #322
- **Phases Verified**: 4/4
- **Critical Issues**: 0 (HIGH 0, MEDIUM 2, LOW 1)
- **NFR Status**: Security: PASS, Performance: PASS, Reliability: PASS, Maintainability: CONCERNS

### Key Findings

All 11 success criteria met, with the central ones verified in **real CI** rather than by proxy — the
new `shellcheck` job passed on PR #322, as did `test` (which runs `eval:all`, closing criterion 8).
Three of four mutation proofs hold.

Two MEDIUM findings, both in code this task introduced:

- **TASK-92-001** — the empty-list guard added to `tracker-access.test.sh:1496` does not guard.
  `return` at top level is illegal, `2>/dev/null || true` swallows it, and execution falls through
  into the very `sed` hang the guard's comment claims to prevent. Unreachable in practice, but the
  comment asserts something false — the `task.90` shape.
- **TASK-92-002** — three pre-existing bare `# shellcheck disable` directives in `jira-sprint-lib.sh`
  leave criterion 6 unmet repo-wide, inside the change that introduces the rule.

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-04 | 1.0     | Initial draft — filed from `task.83.gate.3` `recommendations.future`, with the baseline measured rather than estimated (56 sources, 81 findings, 0 errors, 26 warnings of which 25 are identified false positives) | create-task |
| 2026-09-05 | 1.1 | Review passed (8/10). Baseline re-measured against shellcheck 0.11.0 and reproduces exactly (247/56 files, 0/26/79/81). Five corrections applied: `validate.yml` is path-filtered and cannot see 3 of the 56 sources including the motivating `setup-consumer.sh`, so Phase 1 now recommends a separate unfiltered workflow and records the `ci-gate-parity` constraint that rules out `test.yml`; the `JSM_DEFER_*` SC2034 attribution was inverted (the library reads them, the sprint scripts write them); `export` cannot work on the `BB_CURL_AUTH` array; SC2034 is 15 not 14; and §7's "unchanged by design" understated 139 regenerated bundled copies | review-task |
| 2026-09-05 |         | Status → ready-for-development | review-task |
| 2026-09-05 |         | Implemented — 155 files (18 hand-edited, 137 bundled), 0 new tests; all 26 warning-tier findings resolved (9 real fixes, 17 reasoned disables), lane added and mutation-proved red on a finding in `scripts/setup-consumer.sh` | develop |
| 2026-09-05 |         | Status → ready-for-review | develop |
| 2026-09-05 |         | QA gate CONCERNS (80/100) — 2 MEDIUM, 1 LOW; all 11 criteria met, 5/5 CI jobs green | qa-task |
| 2026-09-05 |         | qa-fix cycle 1 — TASK-92-001 (vacuous empty-list guard) fixed and mutation-proved; TASK-92-002 + the LOW closed: zero bare disables remain in any of the 56 sources | qa-fix |
| 2026-09-05 |         | QA gate 2 CONCERNS (85/100) — refute pass; cycle-1 findings verified fixed, two new documentation-accuracy defects found | qa-task |
| 2026-09-05 |         | qa-fix cycle 2 — TASK-92-003 (fix/annotation split miscounted 11/15; true split 9/17) and TASK-92-004 (tech-stack said five workflows, there are six) corrected | qa-fix |

---

## Progress Tracking

- [x] Phase 1 — Choose the gate and the wiring
- [x] Phase 2 — Triage and annotate
- [x] Phase 3 — Add the lane and prove it fires
- [x] Phase 4 — Documentation
- [x] QA review complete
- [x] Quality gate PASS

---

## References

- [Task 83](../task.83.platform-aware-skill-exclusion/task.83.platform-aware-skill-exclusion.md) — the task whose shellcheck criterion no gate could evaluate
- [`task.83.dod.1.platform-aware-skill-exclusion.md`](../task.83.platform-aware-skill-exclusion/task.83.dod.1.platform-aware-skill-exclusion.md) § Step 4b — the container invocation that closed it by hand, and the baseline-vs-branch comparison method
- [`task.83.gate.3.platform-aware-skill-exclusion.yml`](../task.83.platform-aware-skill-exclusion/task.83.gate.3.platform-aware-skill-exclusion.yml) — `recommendations.future`, where this was recorded
- [Task 91](../task.91.reconcile-tracker-resolution/task.91.reconcile-tracker-resolution.md) — overlaps on `resolve-platform.sh` / `setup-consumer.sh`; sequence, do not parallelise
- [Task 90](../task.90.pipeline-lock-silent-success/task.90.pipeline-lock-silent-success.md) — the precedent for "a gate never observed failing is not known to be a gate"
- `.github/workflows/validate.yml` — the likely home
- [`shared/resources/mutation-proving.md`](../../../shared/resources/mutation-proving.md)

---

## Notes

### Important Reminders

- **Lint sources, not bundles.** 56 files, not 247. The difference is 81 findings versus 725, and the
  extra 644 are the same findings counted five times.
- **A gate never seen to fail is not known to be a gate.** Phase 3's deliberate-regression proof is
  the point of Phase 3, not a formality.
- **A disable without a reason is a suppression.** The 25 false positives below are all explicable in
  one line each; write the line.

### Known Issues

- The measured baseline in §3 is a snapshot taken on 2026-09-04 with `koalaman/shellcheck:stable`.
  **Re-measure at implementation time** — both the tree and the shellcheck version will have moved,
  and the numbers here are a scoping aid, not an assertion about the tree on the day.
