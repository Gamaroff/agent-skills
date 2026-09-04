---
id: task.92
title: "Add a shellcheck CI lane for the repo's shell scripts"
type: task
description: "No workflow runs shellcheck, so a shell-script success criterion cannot be evaluated by any automated gate — task 83's had to be closed by hand with a container."
tags: [ci, shellcheck, test-harness]
category: testing
status: planned
priority: Medium
created: 2026-09-04
updated: 2026-09-04
assignee:
estimated_effort_hours: 3
---

# Technical Task: Add a shellcheck CI lane for the repo's shell scripts

**Status:** Planned

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
| **SC2034** "appears unused" | **14** | Variables a **sourced** file sets *for its caller* — `BB_CURL_AUTH` and `BB_AUTH_SCHEME` are the documented outputs of `bitbucket-auth.sh`; the `JSM_DEFER_*` family is `jira-sprint-lib.sh`'s output contract. shellcheck cannot see cross-file use. | ❌ |
| **SC1007** "remove space after `=`" | 4 | `CDPATH= cd -P -- …` — the standard idiom for neutralising `CDPATH` for one command. Misparsed as a malformed assignment. | ❌ |
| **SC2209** "use `var=$(command)`" | 3 | `ACCESS_TRACKER=command` — assigning the literal access-mode value `command`, which happens to share a name with a shell builtin. | ❌ |
| **SC2211** "glob used as a command name" | 2 | Backticks used as *markdown emphasis inside an assertion message string* in `tracker-access.test.sh` (`assert_rc "…explicit-key \`? access\` → refused"`). shellcheck parses the prose as command substitution. | ❌ |
| **SC1090** "can't follow non-constant source" | 1 | A resolver sourcing a path computed at runtime — inherent to the design. | ❌ |
| **SC2010** "don't use `ls \| grep`" | 1 | Possibly genuine. **Look at this one properly.** | ⚠️ |

So: **one warning worth investigating, 25 needing an annotation.** The `--severity=warning` gate is
achievable in an afternoon, which is why it is the recommended target rather than the aspirational one.

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

- [ ] **Severity gate.** Recommended: `--severity=warning`, because `error` is 0 today and would very
      likely stay 0 (syntax errors are already caught by `bash -n` and by the nine shell suites that
      actually execute), making the lane decorative. Decide explicitly and record why.
- [ ] **Where it runs.** `validate.yml` already does repo-hygiene checks (catalog, bundle) and is the
      natural home. A separate workflow is justified only if the container pull materially slows that
      job.
- [ ] **How shellcheck is obtained in CI.** GitHub's `ubuntu-latest` ships a `shellcheck` binary —
      prefer it over a container action for speed, but **pin and print the version**, because a
      version bump can introduce new findings and turn a green lane red with no code change. That is
      the main operational risk of this lane.
- [ ] **File selection.** Must exclude `skills/*/references/`. Derive from `git ls-files` rather than
      a shell glob, so untracked scratch scripts are never linted.

**Dependencies**: none.

### Phase 2 — Triage and annotate (Risk: Low)

**Files**: ~14 shell scripts across `shared/resources/`, `skills/*/scripts/`, `scripts/`

- [ ] Investigate the single **SC2010** properly. If it is real, fix it and add a test; if the fix is
      non-trivial, file it separately rather than expanding this task.
- [ ] Annotate the 25 false positives with `# shellcheck disable=SCxxxx` **and a one-line reason**.
      A bare disable is a suppression; a disable with a reason is documentation. Prefer a file-level
      disable only where the code recurs throughout the file (e.g. the `JSM_DEFER_*` outputs).
- [ ] For the SC2034 "unused" family specifically, consider whether the variable should simply be
      `export`ed — that is a real answer to "is this used elsewhere?" rather than a suppression, and
      may be more honest for a documented output contract.

**Dependencies**: Phase 1.

### Phase 3 — Add the lane and prove it fires (Risk: Low)

**Files**: `.github/workflows/validate.yml`, `.shellcheckrc` (if used)

- [ ] Add the job. Confirm green on the current tree.
- [ ] **Prove the gate can fail.** Introduce a deliberate warning-tier finding on a scratch branch and
      confirm CI goes red, then revert. A gate never observed failing is not known to be a gate — this
      repo has been bitten by exactly that shape (`task.90`, a lock helper that reported success for
      an advance that did not happen).
- [ ] Confirm the lane does **not** lint bundled copies, by checking the reported file count is 56 and
      not 247.

**Dependencies**: Phase 2.

### Phase 4 — Documentation (Risk: Low)

**Files**: `CHANGELOG.md`, contributing/CI docs

- [ ] CHANGELOG `[Unreleased]` entry naming the gate level and that new warning-tier findings will now
      fail CI.
- [ ] Document the **local** invocation, including the container form for hosts without the binary:
      `docker run --rm -v "$PWD:/mnt" -w /mnt koalaman/shellcheck:stable <files>`.
- [ ] Note the sources-only rule and why, so nobody "fixes" the lane by widening its glob.

**Dependencies**: Phase 3.

---

## 7. Files Summary

**Core Implementation**

1. `.github/workflows/validate.yml` — the new job
2. `.shellcheckrc` — optional, only if repo-wide settings beat per-file annotations

**Annotated (no behaviour change)**

3. ~14 files across `shared/resources/`, `skills/*/scripts/`, `scripts/`, `.agents/scripts/`

**Documentation**

4. `CHANGELOG.md`
5. Contributing / CI documentation

**Unchanged by design**

- `skills/*/references/*.sh` — bundled copies; linting them reports every shared finding 4–5 times.
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

- [ ] A CI job runs shellcheck on every tracked source shell script on every push.
- [ ] The job lints **56** files, not 247 — bundled copies excluded.
- [ ] The job is **green** on the tree as it stands at implementation time.
- [ ] The job has been **observed failing** on a deliberately introduced warning-tier finding, and the
      evidence is recorded in the implementation report.
- [ ] The shellcheck version is pinned or printed, so a version bump is diagnosable rather than
      mysterious.

### Code Quality

- [ ] Every `# shellcheck disable` carries a stated reason. No bare suppressions.
- [ ] The single SC2010 is either fixed or explicitly justified.
- [ ] `npm run ci` still green; no change to local gate duration.

### Migration

- [ ] CHANGELOG entry states the gate level and that new warning-tier findings will fail CI.
- [ ] The local invocation is documented, including the container form for hosts without the binary.
- [ ] The sources-only rule is documented **where the glob lives**, so widening it is a deliberate act.

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

### LOW RISK

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

## Change Log

| Date       | Version | Description   | Author      |
| ---------- | ------- | ------------- | ----------- |
| 2026-09-04 | 1.0     | Initial draft — filed from `task.83.gate.3` `recommendations.future`, with the baseline measured rather than estimated (56 sources, 81 findings, 0 errors, 26 warnings of which 25 are identified false positives) | create-task |

---

## Progress Tracking

- [ ] Phase 1 — Choose the gate and the wiring
- [ ] Phase 2 — Triage and annotate
- [ ] Phase 3 — Add the lane and prove it fires
- [ ] Phase 4 — Documentation
- [ ] QA review complete
- [ ] Quality gate PASS

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
