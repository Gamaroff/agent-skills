# QA Report: Task 83 - Platform-aware skill exclusion in setup-consumer.sh

**Task**: [Link to task document](./task.83.platform-aware-skill-exclusion.md)
**Gate File**: [task.83.gate.1.platform-aware-skill-exclusion.yml](./task.83.gate.1.platform-aware-skill-exclusion.yml)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Testing Completed**: 2026-09-04
**Gate Status**: FAIL

---

## Executive Summary

All four implementation phases are complete and the change is well-built: the grandfather rule is
real and mutation-proven, the classification drift guard fires, the documentation is accurate, and
`npm run ci:fast` is green (2343 tests, 0 failures, prettier clean). The independently-verified token
claim in the CHANGELOG reproduces to within 1%.

The gate fails on one defect, found by executing the resolver rather than reading it.
`_resolve_install_tracker` **re-derives** the config parse instead of mirroring
`shared/resources/resolve-platform.sh` — the very thing Phase 1 instructs ("mirror … do not
re-derive it") and the property the CHANGELOG advertises ("install time and run time cannot disagree
about what a repo is"). Three legal config shapes make the two resolvers disagree, and each one
inverts the filter: a Jira repo silently loses all 11 Jira skills, or a GitHub repo loses all 6
GitHub skills. Reproduced end-to-end against a fixture tarball, not merely reasoned about.

**Overall Assessment**: FAIL
**Deployment Recommendation**: BLOCKED

---

## Testing Scope

### Prerequisites Verified

- [x] Task document exists and complete
- [x] All implementation phases completed (4/4, all checkboxes ticked)
- [x] Tests passing — `npm run ci:fast` exit 0
- [x] Breaking changes documented (§5, with the grandfather guarantee)
- [x] Code on feature branch `feature/task.83.platform-aware-skill-exclusion` with open PR #315

### Testing Approach

- [x] Automated Testing (the new 22-test suite + full `npm run ci:fast`)
- [x] Regression Testing (whole repo suite, plus targeted install fixtures)
- [x] Code Review (Step 3b, whole-branch diff)
- [x] Mutation proving (Step 3c — 3 mutations)
- [ ] Manual Testing — n/a
- [ ] Performance Testing — n/a (filter is string matching over 17 names)
- [x] Security Review

### Review Methodology

Direct tools. Adaptive Review Strategy → "Default: direct tools first" — 4 phases, single module
(`scripts/setup-consumer.sh` plus its tests and docs), risk level not set. Step 3b's diff review was
performed directly rather than by a subagent (subagent dispatch is unavailable in this session);
scope was the whole `origin/develop...HEAD` diff, which is the first-review scope anyway.

First review — no prior gate, so no Re-Review Context or scope-narrowing applies.

**Step 4b (Execute the Documented Commands): not applicable** — the change set contains no
`SKILL.md` and no `shared/resources/*.md`, so no runnable prose is in scope.

---

## Implementation Verification

| Phase                                      | Status   | Test Result | Notes                                                                                                              |
| ------------------------------------------ | -------- | ----------- | ------------------------------------------------------------------------------------------------------------------ |
| Phase 1 — Classification and resolver      | CONCERNS | Partial     | Constants, `_skill_excluded_for_tracker`, and the `tracker: github` config key are all correct. The resolver is the exception — see CR-001: it re-derives the parse where the phase says "mirror … do not re-derive it" |
| Phase 2 — Wire the filter into the loop    | PASS     | Verified    | Grandfather branch precedes every `rm -rf` and is mutation-proven (M1, M2). Counters, `--all-skills`, `--dry-run` parity all hold |
| Phase 3 — Tests                            | PASS     | Verified    | 22 tests, all green; suite runs under the existing `shared/resources/tests/*.test.mjs` glob with no `package.json` change. Drift guard mutation-proven (M3) |
| Phase 4 — Documentation                    | PASS     | Verified    | `--help` renders the new flag; `getting-started.md` step 8 and the CHANGELOG entry match the implemented behaviour  |

**Overall Phase Completion**: 3/4 phases PASS, 1 CONCERNS

---

## Success Criteria Verification

### Functional

| Criterion                                                       | Target        | Actual                              | Status   |
| --------------------------------------------------------------- | ------------- | ----------------------------------- | -------- |
| Fresh install resolving `github` installs `total − 11`           | 11 pruned     | 11 pruned (fixture + unit)          | PASS     |
| Fresh install resolving `jira` installs `total − 6`              | 6 pruned      | 6 pruned                            | PASS     |
| An already-installed excluded skill survives `--update`          | kept          | kept, byte-identical (LOCAL-MARKER) | PASS     |
| No `tracker:` key and no `JIRA_URL` resolves `github`            | github        | github                              | PASS     |
| `--all-skills` installs every skill                              | all           | all                                 | PASS     |
| `--update` resolves the tracker with no wizard run               | both trackers | works — **but see CR-001/CR-002**   | CONCERNS |
| `--dry-run` writes nothing, names tracker + exclusion set        | yes           | yes                                 | PASS     |
| `create-pr`, `create-branch`, `create-issue` install under both  | always        | always                              | PASS     |

### Performance

| Criterion                          | Target      | Actual                                     | Status |
| ---------------------------------- | ----------- | ------------------------------------------ | ------ |
| No measurable wizard slowdown      | none        | 2 × `grep -qxF` per skill over ≤11 lines    | PASS   |
| Tarball download unchanged         | one request | one request; dry-run still downloads nothing | PASS   |

### Code Quality

| Criterion                                              | Target   | Actual                                        | Status   |
| ------------------------------------------------------ | -------- | --------------------------------------------- | -------- |
| `npm run ci:fast` green including the new suite        | green    | exit 0 — 2343 tests, 0 fail, 1 skipped        | PASS     |
| New suite runs under the existing glob                 | runs     | 22 tests observed in the full run             | PASS     |
| Classification-parity test exists and fails on drift   | fails    | mutation-proven (M3)                          | PASS     |
| Every fix mutation-proven                              | all      | 3 QA mutations red; dev proved 7              | PASS     |
| `shellcheck` no new warnings                           | 0 new    | **NOT VERIFIED** — shellcheck absent on host; `bash -n` clean | CONCERNS |
| New functions above `SETUP_CONSUMER_NO_MAIN` hook      | yes      | yes — tests reach them by sourcing            | PASS     |

### Migration

All four migration criteria verified: `getting-started.md` step 8 documents the filter and the
grandfather rule; `--all-skills` appears in both `--help` and the docs; the CHANGELOG `[Unreleased]`
entry names both counts and the guarantee; the `--update`-removes-nothing claim is held by the
mutation-proven grandfather test.

**Independent check of the CHANGELOG's token claim.** The entry states ~1,493 of ~11,602 tokens
(~13%) for a GitHub consumer. Summing `name` + `description` across all 120 `skills/*/SKILL.md`
gives 46,809 chars (~11,702 tok), of which the 11 Jira-only skills are 6,023 (~1,505 tok) — **12.9%**.
The claim reproduces.

---

## Breaking Changes Validation

### Breaking Change: Fresh installs receive a filtered skill set

Documented: Yes (§5, with a before/after table)
Migration Path Provided: Yes — none required; grandfather rule
Migration Tested: **Yes** — the grandfather test was mutated two ways (M1, M2) and went red both times
Consumer Code Updated: N/A
Notes: The guarantee is real. An excluded-but-installed skill is kept and its directory is left
untouched, not replaced — the test asserts a local marker file survives, which is the assertion that
distinguishes "kept" from "deleted and reinstalled".

**Overall Breaking Changes Assessment:** PASS

---

## Code Review

Scope: whole-branch diff, `origin/develop...HEAD`, 9 files, +1277/−94.
`code_review_blocking=true` (pipeline run-level override; the task carries no opt-out).

**Correctness bugs (3):**

- **[high/high] `scripts/setup-consumer.sh:808`** — `_resolve_install_tracker` extracts the config
  value with `awk '{print $2}'`, which does not normalise the token, whereas the runtime reader
  (`resolve-platform.sh`) parses YAML properly. Three legal shapes therefore resolve **differently at
  install time and run time**, and each inverts the filter:

  | `skills-config.yaml`   | runtime resolver | installer | consequence                                 |
  | ---------------------- | ---------------- | --------- | -------------------------------------------- |
  | `tracker: "jira"`      | `jira`           | `github`  | all 11 Jira skills pruned from a Jira repo   |
  | `tracker: 'jira'`      | `jira`           | `github`  | same                                          |
  | `tracker: jira` + CRLF | `jira`           | `github`  | same (Windows/WSL checkout)                   |

  Reproduced end-to-end against a fixture tarball with `tracker: "jira"` on disk:
  `Filtering skills for tracker: github … 2 skipped (github)`, leaving `create-pr` and
  `sync-github-story` installed and `sync-jira-story` / `jira-sprint-manager` absent — the exact
  inversion. Unquoted values, trailing whitespace, and trailing `# comments` all resolve correctly,
  so the defect is specific to quoting and CR.
  → Normalise the extracted value before the `case`: strip a surrounding pair of single or double
  quotes and a trailing `\r`. Add the three shapes above to the resolver tests.

- **[medium/high] `scripts/setup-consumer.sh:819-820`** — the same divergence in the opposite
  direction. The installer probes `.env` for `JIRA_URL`; `resolve-platform.sh` reads only the
  **environment**, never `.env`. A repo with no `tracker:` key and `JIRA_URL` in `.env` (not
  exported) resolves `jira` at install and `github` at runtime, so the 6 GitHub-only skills are
  pruned from a repo whose skills will look for them. Verified: `runtime=github install=jira`.
  → Make the two agree. Either drop the `.env` probe, or state in the comment that the installer is
  deliberately more generous and why — but not both resolvers claiming to mirror each other while
  reading different sources.

- **[low/high] `scripts/setup-consumer.sh:815-825`** — an unrecognised scalar (`tracker: bitbucket`,
  which `configuration.md:148` explicitly names as rejected) falls through the `case` to the
  positive probes and silently resolves `github`, where `resolve-platform.sh` **halts** with a
  validation error. Low impact — every runtime invocation halts loudly anyway — but the installer
  quietly filters a config it should refuse to interpret.

**Cleanups (1):**

- `scripts/setup-consumer.sh:801-827` — the comment block asserts this function "MIRRORS
  shared/resources/resolve-platform.sh … so install time and run time cannot disagree", and the
  CHANGELOG repeats the claim. The **order** is a faithful mirror (config → wizard answer → JIRA_URL
  → `github`; confirmed against `resolve-platform.sh:424-437`, which has no git-remote probe for
  `TRACKER`). The **value parsing** is not. Once CR-001 and CR-002 are fixed the comment becomes
  true; until then it is the most load-bearing sentence in the file and it is wrong.

CR-001 and CR-002 are promoted to gate `top_issues[]` under `code_review_blocking`. CR-003 and the
cleanup are advisory.

**Mutation proving (Step 3c)** — 3 mutations, each run against an isolated copy of the script so the
live tree was never left mutated. Baseline on that copy: 22/22 green.

| # | Mutation                                                            | Result                                                    | mutation-proven |
| - | ------------------------------------------------------------------- | --------------------------------------------------------- | --------------- |
| M1 | Grandfather branch `rm -rf`s the installed skill instead of keeping it | `GRANDFATHER — an excluded skill … survives` **red**       | yes             |
| M2 | Drop the `continue`, letting an excluded skill fall through to `rm -rf` + `cp -r` | that test **and** `fresh install with tracker github prunes …` **red** (2 fail) | yes |
| M3 | Remove `jira-standup-auditor` from the script list and the test mirror | `every tracker-specific skill … classified exactly once` **red**, with the actionable message | yes |

The two properties the task calls its highest risks — the grandfather rule and classification drift —
are genuinely held, not vacuously green.

---

## Issues Found

### HIGH Severity Issues (1)

**Issue: install-time and run-time tracker resolution diverge on quoted or CRLF `tracker:` values**

- **Severity**: HIGH
- **Category**: Functional
- **Bug Report**: [task.83.bug.1.tracker-resolution-divergence.md](./task.83.bug.1.tracker-resolution-divergence.md)
- **Observation**: `tracker: "jira"` resolves `jira` at runtime and `github` at install.
- **Impact**: A Jira consumer's install silently omits all 11 Jira skills. The failure surfaces days
  later, inside a pipeline step, as a missing skill — far from the install that caused it. The
  grandfather rule does not help a fresh install, which is precisely the case that is filtered.
- **Recommendation**: Normalise quotes and CR before the `case` in `_resolve_install_tracker`.
- **Priority**: P1

### MEDIUM Severity Issues (1)

**Issue: the installer reads `.env` for `JIRA_URL`; the runtime resolver does not**

- **Severity**: MEDIUM
- **Category**: Functional
- **Bug Report**: [task.83.bug.2.env-probe-asymmetry.md](./task.83.bug.2.env-probe-asymmetry.md)
- **Observation**: no config key + `JIRA_URL` in `.env` only → `runtime=github install=jira`.
- **Impact**: the 6 GitHub-only skills are pruned from a repo that resolves `github` at runtime.
- **Recommendation**: make both resolvers read the same sources, or document the asymmetry deliberately.
- **Priority**: P2

### LOW Severity Issues (2)

- **An invalid `tracker:` scalar is silently defaulted rather than refused** (`setup-consumer.sh:815-825`).
  `resolve-platform.sh` halts; the installer filters. Documented above as CR-003.
- **The `shellcheck` success criterion is unverified.** `shellcheck` is not installed on this host, so
  the criterion is correctly left unticked by the developer rather than falsely claimed. `bash -n`
  parses clean. This needs to run in CI or on a host that has it before the criterion can be ticked.

**Total Issues**: HIGH: 1, MEDIUM: 1, LOW: 2

---

## NFR Assessment

### Performance — PASS

The filter is two `grep -qxF` calls per skill against lists of 11 and 6 lines — O(skills × 17) fixed-string
matching, entirely local. The tarball is still downloaded once as a whole archive; the `--dry-run`
branch still returns before any network call, which the dry-run test asserts by checking nothing was
written. No measurable change to wizard wall-clock time.

### Reliability — CONCERNS

The grandfather rule is the reliability centrepiece and it holds under mutation — an existing install
loses nothing, on either tracker. `--all-skills` is a working escape hatch and is reachable from
`--help`.

The concern is CR-001/CR-002: a fresh install can silently receive the **wrong** skill set for a
legal configuration, with no error at install time and no error until a pipeline step reaches for a
skill that is not there. That is a quiet failure mode in the one direction the grandfather rule
cannot cover.

### Security — PASS

No new network calls, no new credential handling, no new writes outside `.agents/skills/`. The
resolver reads two local files (`skills-config.yaml`, `.env`) and one environment variable, and the
`.env` read is a `grep -qE` for presence only — the value is never captured or echoed. The filter can
only *reduce* what is written to disk. `_skill_excluded_for_tracker` uses `grep -qxF` (whole-line,
fixed-string), so a skill name cannot be interpreted as a pattern; the substring direction is tested
explicitly.

### Maintainability — PASS

The classification lists are hand-maintained, which is the obvious rot risk, and the task addressed
it directly: the drift guard fails CI until a new tracker skill is classified, and a second test
asserts the test's mirrors match the script's constants so the two cannot drift apart either. Both
are mutation-proven. Comments explain *why* the ordering is what it is rather than restating the
code. The `set -e` interactions (`(( x++ )) || true`, the `&&` assignment lists) were checked and are
correct.

---

## Regression Testing

| Area                                    | Result | Notes                                                                 |
| --------------------------------------- | ------ | --------------------------------------------------------------------- |
| Full repo suite (`npm run ci:fast`)     | PASS   | exit 0 — 2343 tests, 0 failures, 1 skipped; prettier clean            |
| `setup-consumer-config.test.mjs`        | PASS   | the new `tracker: github` key does not break the existing config assertions |
| `resolve-platform.test.sh`              | PASS   | the new top-level `tracker: github` in generated configs is read correctly |
| `--help` rendering                      | PASS   | the `sed '2,/^$/p'` header extraction still terminates correctly and includes `--all-skills` |
| Unknown-flag handling                   | PASS   | `*)` arm still rejects; `--all-skills` parsed before it               |
| Existing-install `--update`             | PASS   | 11 kept, 0 pruned, directories byte-identical                          |

---

## Test Artifacts

### Files Reviewed

- `scripts/setup-consumer.sh` (+172/−…) — flag parser, `write_skills_config`, `_resolve_install_tracker`, `_skill_excluded_for_tracker`, `install_skills`
- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` (new, 477 lines, 22 tests)
- `shared/resources/tests/setup-consumer-config.test.mjs` (+10)
- `docs/concepts/getting-started.md`, `CHANGELOG.md`
- `shared/resources/resolve-platform.sh`, `docs/reference/configuration.md` (read-only, for the mirror check)

### Test Commands Executed

```bash
npm run ci:fast                                   # exit 0 — 2343 tests, 0 fail, prettier clean
node --test shared/resources/tests/setup-consumer-skill-exclusion.test.mjs   # 22/22 (isolated copy)
node --test --test-name-pattern='GRANDFATHER' …   # M1, M2 mutation proofs
node --test --test-name-pattern='classified exactly once' …  # M3 mutation proof
bash scripts/setup-consumer.sh --help             # flag documentation
# resolver differential — runtime vs installer, over 8 config shapes
# end-to-end install over a fixture tarball with tracker: "jira"
```

### Coverage Report

Not applicable — this repo runs no coverage instrumentation. Coverage is evidenced by the 22
behavioural tests plus three mutation proofs.

---

## Recommendations

### Immediate Actions (Blocking)

1. **CR-001 (P1)** — normalise the value read by `_resolve_install_tracker` (strip a surrounding
   quote pair and a trailing `\r`) so a quoted or CRLF `tracker:` resolves as it does at runtime.
   Add `tracker: "jira"`, `tracker: 'jira'` and a CRLF fixture to the resolution-order tests.
   `refs: scripts/setup-consumer.sh:808`
2. **CR-002 (P2)** — reconcile the `.env` probe with `resolve-platform.sh`, which does not read
   `.env`. Add a test pinning whichever direction is chosen.
   `refs: scripts/setup-consumer.sh:819-820`

### Short-term Actions (Non-Blocking)

1. Consider refusing an unrecognised `tracker:` scalar at install time rather than defaulting
   (CR-003), matching the runtime resolver's halt.
2. Run `shellcheck scripts/setup-consumer.sh` on a host or CI lane that has it, and tick the
   outstanding Code Quality criterion.

---

## Final Assessment

**Gate Status**: FAIL
**Rationale**: One HIGH-severity, high-confidence correctness bug (CR-001) promoted to `top_issues`
under `code_review_blocking`, plus one MEDIUM (CR-002). Gate rule 1 applies. Everything else is in
good shape — all four phases delivered, the two named high risks are mutation-proven, the full suite
is green, and the documentation's quantitative claim independently reproduces. The failure is narrow
and the fix is small, but it defeats the property the change exists to provide.
**Quality Score**: 70/100

**Deployment Recommendation**: BLOCKED
**Conditions**: CR-001 and CR-002 fixed, each with a test that fails without the fix.

---

**QA Report**: co-located at `task.83.qa.1.platform-aware-skill-exclusion.md`
**Gate File**: co-located at `task.83.gate.1.platform-aware-skill-exclusion.yml`
**Next Steps**: `/qa-fix` — normalise the resolver's parse, reconcile the `.env` probe, extend the
resolution-order tests, then re-review.
