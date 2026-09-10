# QA Report: Task 83 - Platform-aware skill exclusion in setup-consumer.sh (Cycle 3)

**Task**: [Link to task document](./task.83.platform-aware-skill-exclusion.md)
**Gate File**: [task.83.gate.3.platform-aware-skill-exclusion.yml](./task.83.gate.3.platform-aware-skill-exclusion.yml)
**Previous Cycles**: [qa.1](./task.83.qa.1.platform-aware-skill-exclusion.md) (FAIL, 70) → [qa.2](./task.83.qa.2.platform-aware-skill-exclusion.md) (CONCERNS, 80)
**QA Engineer**: QA Engineer
**Review Date**: 2026-09-04
**Gate Status**: PASS

---

## Executive Summary

RF-001 is closed, and verified in the strongest available form: the suite was re-run with the
polluting variables **actually exported** into the runner's environment, not merely with a test that
simulates them. It passes. The fix went further than the finding — enumerating what either resolver
reads turned up a third copy of the scrub list nobody had asked about, and the consolidation closes
the class rather than the instance.

No new findings. All three cycle-1 and cycle-2 issues are closed, no fix reopened another, and the
full suite is green at 2356 tests.

One thing is deliberately **not** blocking and needs to be visible at merge rather than looped on:
the `shellcheck` success criterion remains unverified. `shellcheck` is not installed on this host and
is not run by any CI workflow, so no number of fix cycles can tick it. It is carried into Step 7 as a
known gap with an owner, which is the honest disposition — not a criterion quietly marked done.

**Overall Assessment**: PASS
**Deployment Recommendation**: APPROVED

---

## Testing Scope

### Review Methodology

Direct tools, re-review. Scope narrowed per the default rule — cycle 3 is not the refute pass, and
`SAFETY_REPROBE` is false (gate 2's security NFR was PASS and no `top_issues` entry sat on a safety
axis).

```
Re-review scope: since gate 2 (default) — shared/resources/tests/setup-consumer-skill-exclusion.test.mjs
```

The only file changed since gate 2 is the test file. `scripts/setup-consumer.sh` was untouched this
cycle, which is itself worth stating: RF-001 was a defect in the *guard*, not in the shipped
behaviour.

**Step 4b (Execute the Documented Commands): not applicable** — no `SKILL.md` and no
`shared/resources/*.md` in the change set.

---

## Re-Review Context

| # | Finding | Cycle | Status | Evidence |
| - | -------- | ----- | ------ | --------- |
| CR-001 (HIGH) | Quoted / CRLF `tracker:` resolved the wrong platform at install | 1 | **CLOSED** | Verified in cycle 2 by re-running the differential and the end-to-end repro; unchanged since |
| CR-002 (MEDIUM) | `.env` probe asymmetry | 1 | **CLOSED as documented** | Verified in cycle 2; residual named below |
| RF-001 (MEDIUM) | Test env scrub omitted `SKILLS_CONFIG_FILE` | 2 | **CLOSED** | See below — verified under real ambient pollution |
| CR-003 / RF-002 (LOW) | Installer is more permissive than the runtime about malformed `tracker:` input | 1, 2 | **NOT FIXED, by decision** | Correctly in `recommendations.future`; both concern input that is not valid config |
| shellcheck criterion | Unverified | 1 | **STILL UNVERIFIED — escalated** | Not installed here, not in CI. See below. |

### RF-001 — verified under real pollution, not a simulation

The decoy test asserts the scrub works. That is necessary but not sufficient: a test that sets the
variable *inside* the test can pass while the helper it guards is still reachable another way. So the
suite was re-run with the variables genuinely exported into the runner:

```bash
SKILLS_CONFIG_FILE=<decoy pointing at the opposite tracker> node --test … → 2 pass, 0 fail
AGENT_SKILLS_ACCESS_TRACKER=nonsense               node --test … → 1 pass, 0 fail
```

Both would have failed before the consolidation — the first is the exact repro from bug.3, and the
second is the hole the fix found on its own while enumerating what the resolvers read.

---

## New Findings This Cycle

**None.**

Searched: the full diff of `18670ff` for `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs`
(the only file changed since gate 2), re-read as one change rather than hunk by hunk. Specifically
checked, and clean:

- `hermeticEnv(env)`'s merge order — `{...clean, ...env}` means an explicitly-passed variable still
  wins over the scrub, so `a JIRA_URL in the environment resolves jira` continues to test what it
  says it tests. Confirmed green rather than reasoned about.
- `runInstall`'s switch to the shared helper now also scrubs `ALL_SKILLS`, `SKILLS_CONFIG_FILE` and
  the access variables. No integration test relies on passing any of these by environment —
  `--all-skills` is exercised through `args`, and the wizard's parser assigns `ALL_SKILLS` at source
  time regardless. Suite green confirms.
- The exit-status assertion's transport: `printf '%s\n%s' "$rc" "${TRACKER:-}"` then splitting on the
  first newline. `source` never makes bash itself exit non-zero, so `rc` is always captured, and
  `rest.join("\n")` is safe for a value that somehow contained a newline.
- `process.env` mutation in the decoy test — restored in a `finally`, and `node --test` runs a file's
  tests sequentially with per-file process isolation, so it cannot leak into a neighbouring case.
- Neither fix reopened the other: the cycle-1 parity cases and the cycle-2 decoy case pass together.

### Advisory (not gating, not worth a cycle)

- `shared/resources/tests/setup-consumer-skill-exclusion.test.mjs` — `hermeticEnv`'s comment says
  "It was two copies once". The fix found **three** (`callFn`, `runtimeTracker`, `runInstall`), and
  the third is the better argument for the helper existing. The comment undersells its own reason.
  Cosmetic; fold into any future edit of that file rather than spending a cycle on it.

---

## QA Artifact Hygiene — a defect in gate 2, corrected this cycle

Gate 2 carried cycle 1's closed `CR-001` and `CR-002` entries forward in `top_issues[]`, annotated
"retained so the gate carries the history". That was wrong, and it was QA's own error rather than the
implementation's.

The pipeline's **third-strike rule** reads the `file:` of every HIGH `top_issues[]` entry across the
last three gates and **deliberately ignores `status: closed`** — because a gate updated in place after
its own cycle's fixes would otherwise read as empty. That rule assumes each gate carries only its own
cycle's findings. Copying a closed HIGH forward made one real finding look like `scripts/setup-consumer.sh`
being struck twice; a third would have tripped "replace, do not patch again" on a file with nothing
wrong with it, in a loop that was in fact converging cleanly.

Gate 2 has been corrected — the carried-forward entries removed, with a comment recording why so the
next reviewer does not helpfully re-add them. The history they were meant to preserve is already in
gate 2's `bug_resolution` block, in qa.2's Re-Review Context table, and in the bug reports.

Convergence check, on the corrected gates: HIGH findings **1 → 0 → 0**. Converging, no stall, no
strike.

---

## Success Criteria Verification

| Criterion                                              | Status | Notes                                                              |
| ------------------------------------------------------ | ------ | -------------------------------------------------------------------- |
| All Functional criteria (8)                            | PASS   | Re-verified in cycle 2 end-to-end; unchanged since                  |
| All Performance criteria (2)                           | PASS   | Filter is fixed-string matching; tarball still one request           |
| `npm run ci:fast` green including the new suite        | PASS   | 2356 tests, 0 fail, 1 skipped, prettier clean                       |
| New suite runs under the existing glob                 | PASS   | 35 tests; `package.json` still unmodified                            |
| Classification-parity test fails on drift              | PASS   | Mutation-proven M3                                                   |
| Every fix mutation-proven                              | PASS   | 8 QA mutations across three cycles, plus the developer's 7           |
| All Migration criteria (4)                             | PASS   | Grandfather guarantee mutation-proven M1/M2                          |
| `shellcheck` no new warnings                           | **NOT VERIFIED** | Not installed on this host; **not run by any CI workflow** either. Escalated to Step 7 rather than looped on — no fix cycle can tick it. |

---

## NFR Assessment

### Performance — PASS

Unchanged. The test suite grew by one case (~1s); the shipped code path is unchanged since cycle 1.

### Reliability — PASS

Raised from CONCERNS. The reason it was held there was RF-001 — the guard for the HIGH fix could be
flipped by an ambient environment variable — and that is now closed and verified under real
pollution, across two variables rather than the one that was reported.

The `.env` residual remains and is the reason to state this carefully rather than just tick it: a repo
with **no `tracker:` key** whose `JIRA_URL` lives in `.env` and is never exported still resolves
differently at the two ends. It is bounded (the wizard now always writes a `tracker:` key, so no
generated config can reach it), grandfathered for existing installs, escapable via `--all-skills`,
and now documented, tested and argued rather than accidental. Its proper close — teaching
`resolve-platform.sh` to read `.env` — changes tracker resolution for every skill in the repo and is
genuinely a separate task. That is a known limitation with an owner, not a reliability failure, and
holding the gate on it would create a loop that cannot converge.

### Security — PASS

Unchanged across all three cycles. No network, credential or filesystem surface added.

### Maintainability — PASS

Improved again this cycle. One scrub list with its rationale beats three copies, and the failure this
task actually suffered — a list copied and not extended — is now structurally impossible in that
file. The `runtimeTracker` exit-status assertion means the next failure of this kind names its own
cause.

---

## Regression Testing

| Area                                       | Result | Notes                                                        |
| ------------------------------------------ | ------ | ------------------------------------------------------------- |
| Full repo suite (`npm run ci:fast`)        | PASS   | exit 0 — 2356 tests, 0 failures, 1 skipped, prettier clean    |
| Parity block under real ambient pollution  | PASS   | `SKILLS_CONFIG_FILE` decoy and `AGENT_SKILLS_ACCESS_TRACKER=nonsense` both exported |
| Cycle-1 fixes still hold                   | PASS   | Parity cases green alongside the new decoy case               |
| Integration installs (`runInstall`)        | PASS   | Unaffected by the shared-helper switch                        |
| Grandfather rule / drift guard             | PASS   | Untouched since cycle 1; M1–M3 still stand                    |

---

## Test Artifacts

### Test Commands Executed

```bash
npm run ci:fast                                            # exit 0 — 2356 tests, 0 fail
SKILLS_CONFIG_FILE=<decoy> node --test …                   # 2 pass — RF-001 closed under real pollution
AGENT_SKILLS_ACCESS_TRACKER=nonsense node --test …         # 1 pass — the second hole the fix found
git diff 60a95b8..18670ff -- …test.mjs                     # cycle 3 review scope
ls .github/workflows/ && grep -rn shellcheck .github/      # confirms no CI lane runs shellcheck
```

---

## Recommendations

### Immediate Actions (Blocking)

None.

### Short-term Actions (Non-Blocking)

1. **`shellcheck` — needs a decision at merge, not another cycle.** The criterion cannot be verified
   here or in CI. Either run it on a host that has it before merging, or add a shellcheck job to
   `.github/workflows/validate.yml` as a follow-up task — noting that a new lane would run against
   every shell script in the repo, not just this one, so it is its own piece of work.
2. File the `resolve-platform.sh` `.env` follow-up so the documented residual has an owner.
3. CR-003 + RF-002: decide whether the installer should refuse malformed `tracker:` input rather than
   defaulting to `github`, matching the runtime's halt.
4. Correct the "two copies" comment in `hermeticEnv` to say three, next time that file is edited.

---

## Final Assessment

**Gate Status**: PASS
**Rationale**: All three promoted findings across the loop are closed, each verified by re-running the
check that found it and each mutation-proven. No new findings this cycle. The one outstanding success
criterion cannot be verified in any environment available to the loop, so it is escalated to Step 7
with a named decision rather than kept open in a cycle that could not close it. The `.env` residual is
a documented, tested, bounded limitation with a named follow-up.
**Quality Score**: 95/100 — five points held back for the unverified `shellcheck` criterion, which is
a real gap even though it is not one this loop can close.

**Deployment Recommendation**: APPROVED
**Conditions**: None blocking. `shellcheck` to be run or scheduled at merge (see above).

---

**QA Report**: co-located at `task.83.qa.3.platform-aware-skill-exclusion.md`
**Gate File**: co-located at `task.83.gate.3.platform-aware-skill-exclusion.yml`
**Next Steps**: Step 5c — `/review-pr`, the loop's exit gate.
